// Un passage de l'ouvrier MESSAGERIE (Gmail d'abord) :
//   1. travaux `envois.gmail` {envoi} : commencer_envoi → jetons de la connexion de l'expéditeur
//      (expediteur.parametres.connexion) → brouillon fabriqué (mime.ts) → drafts.create →
//      confirmer_envoi(envoi, "gmail:brouillon:<id>"). Le message RESTE un brouillon dans la
//      messagerie du client : rien n'est envoyé par Omega.
//      travaux `messagerie.revoquer` {connexion} : messagerie_oublier (efface le Vault, rend le
//      jeton) → révocation chez Google.
//   2. relevé de chaque connexion active : jeton d'accès renouvelé s'il expire dans la minute,
//      messages arrivés depuis le curseur (étiquette INBOX par défaut) → pièces au bucket →
//      deposer_reception (canal email, boîte = adresse connectée), curseur posé message par
//      message : un passage interrompu reprend au suivant, et deposer_reception est idempotente.
//      Jeton refusé → messagerie_a_reconnecter ; historique expiré → repart du curseur courant.
//   3. battre_ouvrier('messagerie', …).

import { ErreurMessagerie, type Messagerie } from "./fournisseur.ts";
import { composerBrouillon, lireMessage } from "./mime.ts";
import type {
  ConnexionActive,
  EnvoiAEnvoyer,
  Portes,
  Travail,
} from "./portes.ts";
import {
  deposerPieces,
  type Stockage as StockageReception,
} from "../reception/commun.ts";
import type { Stockage as StockagePieces } from "../expediteur/stockage.ts";
import { corpsEstHtml } from "../expediteur/brevo.ts";

export const MODULE = "messagerie";
export const GENRES = ["envois.gmail", "messagerie.revoquer"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** null tant que l'application Google n'est pas configurée : travaux reportés, rien relevé. */
  gmail: Messagerie | null;
  /** Dépôt des pièces reçues (bucket, upsert). */
  stockage: StockageReception;
  /** Lecture des pièces jointes des envois. */
  pieces: StockagePieces;
  ouvrier: string;
  journal: Journal;
  maintenant?: () => Date;
  nombre?: number;
  /** Messages lus au plus par connexion et par passage. */
  parConnexion?: number;
};

export type Bilan = {
  ouvrier: string;
  gmail_branche: boolean;
  pris: number;
  brouillons: number;
  revoques: number;
  reportes: number;
  echecs: number;
  connexions: number;
  recus: number;
  nouveaux: number;
  a_reconnecter: number;
  erreurs: string[];
  duree_ms: number;
};

class ErreurTravail extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly definitive: boolean,
  ) {
    super(`${code} : ${message}`);
  }
}

function classer(e: unknown): ErreurTravail {
  if (e instanceof ErreurTravail) return e;
  if (e instanceof ErreurMessagerie) {
    return new ErreurTravail(
      e.code,
      e.message,
      e.code === "DEFINITIVE" || e.code === "JETON_REVOQUE",
    );
  }
  return new ErreurTravail(
    "TRANSITOIRE",
    String((e as Error)?.message ?? e),
    false,
  );
}

export async function executerPassage(deps: Dependances): Promise<Bilan> {
  const debut = Date.now();
  const bilan: Bilan = {
    ouvrier: deps.ouvrier,
    gmail_branche: deps.gmail !== null,
    pris: 0,
    brouillons: 0,
    revoques: 0,
    reportes: 0,
    echecs: 0,
    connexions: 0,
    recus: 0,
    nouveaux: 0,
    a_reconnecter: 0,
    erreurs: [],
    duree_ms: 0,
  };
  let travaux: Travail[] = [];
  try {
    travaux = await deps.portes.prendreTravaux(
      [...GENRES],
      deps.nombre ?? 10,
      "15 minutes",
      deps.ouvrier,
    );
  } catch (e) {
    deps.journal.erreur("prendre_travaux en panne", { erreur: String(e) });
  }
  bilan.pris = travaux.length;
  for (const t of travaux) {
    if (t.genre === "envois.gmail") await brouillon(t, deps, bilan);
    else if (t.genre === "messagerie.revoquer") await revoquer(t, deps, bilan);
  }

  if (deps.gmail) {
    let connexions: ConnexionActive[] = [];
    try {
      connexions = await deps.portes.connexions("gmail");
    } catch (e) {
      bilan.erreurs.push(`messagerie_connexions : ${String(e).slice(0, 200)}`);
    }
    for (const c of connexions) {
      bilan.connexions++;
      await relever(c, deps.gmail, deps, bilan);
    }
  }

  bilan.duree_ms = Date.now() - debut;
  try {
    await deps.portes.battreOuvrier(MODULE, [...GENRES], {
      gmail_branche: bilan.gmail_branche,
      connexions: bilan.connexions,
      brouillons: bilan.brouillons,
      recus: bilan.recus,
      nouveaux: bilan.nouveaux,
      a_reconnecter: bilan.a_reconnecter,
      reportes: bilan.reportes,
      echecs: bilan.echecs,
      erreurs: bilan.erreurs.slice(0, 5),
    }, "15 minutes");
  } catch (e) {
    deps.journal.erreur("battre_ouvrier en panne", { erreur: String(e) });
  }
  return bilan;
}

async function finir(
  deps: Dependances,
  id: number,
  resultat: Record<string, unknown>,
) {
  try {
    await deps.portes.finirTravail(id, resultat);
  } catch (e) {
    deps.journal.erreur("finir_travail en panne", {
      travail: id,
      erreur: String(e),
    });
  }
}

/** Jeton d'accès valable au moins une minute, renouvelé et reposé au besoin. */
async function accesValable(
  connexion: string,
  m: Messagerie,
  deps: Dependances,
): Promise<string> {
  const j = await deps.portes.jetons(connexion);
  const maintenant = (deps.maintenant?.() ?? new Date()).getTime();
  if (
    j.acces && j.acces_expire_le &&
    Date.parse(j.acces_expire_le) > maintenant + 60_000
  ) return j.acces;
  if (!j.renouvellement) {
    throw new ErreurMessagerie(
      "JETON_REVOQUE",
      "aucun jeton de renouvellement au Vault",
    );
  }
  const a = await m.renouveler(j.renouvellement);
  await deps.portes.poserAcces(connexion, a.jeton, a.expire_le);
  return a.jeton;
}

async function brouillon(t: Travail, deps: Dependances, bilan: Bilan) {
  const envoi = String(t.charge?.envoi ?? "");
  if (!UUID.test(envoi)) {
    bilan.echecs++;
    await finir(deps, t.id, {
      echec: true,
      erreur: "charge sans envoi valide",
    });
    return;
  }
  let r;
  try {
    r = await deps.portes.commencerEnvoi(envoi);
  } catch (e) {
    bilan.reportes++;
    await finir(deps, t.id, { reporte: true, erreur: String(e).slice(0, 300) });
    return;
  }
  if (!r.envoyer) {
    await finir(deps, t.id, r as unknown as Record<string, unknown>);
    return;
  }
  const e = r as EnvoiAEnvoyer;
  try {
    if (!deps.gmail) {
      throw new ErreurTravail(
        "GMAIL_NON_BRANCHE",
        "application Google non configurée, brouillon reporté",
        false,
      );
    }
    if (e.canal !== "email") {
      throw new ErreurTravail(
        "CANAL_NON_PRIS_EN_CHARGE",
        `canal ${e.canal}`,
        true,
      );
    }
    if (e.fournisseur !== "gmail") {
      throw new ErreurTravail(
        "FOURNISSEUR_INATTENDU",
        `fournisseur ${e.fournisseur}`,
        true,
      );
    }
    // Même garde santé que l'expéditeur : la messagerie du client n'est pas un hébergeur agréé.
    const essaiFictif = e.mode === "essai" && e.donnees_fictives === true;
    if (
      e.donnees_sante === true && e.fournisseur_hds !== true && !essaiFictif
    ) {
      throw new ErreurTravail(
        "SANTE_FOURNISSEUR_NON_HDS",
        `envoi de santé vers ${e.fournisseur}`,
        true,
      );
    }
    const connexion = String(
      (e.expediteur?.parametres as Record<string, unknown> | undefined)
        ?.connexion ?? "",
    );
    if (!UUID.test(connexion)) {
      throw new ErreurTravail(
        "CONNEXION_ABSENTE",
        "expéditeur sans connexion de messagerie",
        true,
      );
    }
    if (!e.sujet) throw new ErreurTravail("SUJET_ABSENT", e.envoi, true);
    const acces = await accesValable(connexion, deps.gmail, deps);
    const pieces = [];
    for (const p of e.pieces ?? []) {
      pieces.push({
        nom: p.nom,
        typeMime: p.mime,
        octets: await deps.pieces.lirePiece(p),
      });
    }
    const html = corpsEstHtml(e.corps);
    const brut = composerBrouillon({
      de: e.expediteur.identite,
      deNom: e.expediteur.nom_affiche,
      a: e.destinataire.adresse,
      aNom: e.destinataire.nom,
      repondreA: e.repondre_a ?? e.expediteur.repondre_a,
      sujet: e.sujet,
      texte: html ? e.corps.replace(/<[^>]+>/g, "").trim() : e.corps,
      html: html ? e.corps : null,
      pieces,
      entetes: { "X-Omega-Envoi": e.envoi },
    });
    const d = await deps.gmail.creerBrouillon(
      acces,
      new TextEncoder().encode(brut),
    );
    const reference = `gmail:brouillon:${d.brouillon}`;
    await deps.portes.confirmerEnvoi(e.envoi, reference);
    bilan.brouillons++;
    await finir(deps, t.id, {
      fournisseur_id: reference,
      message: d.message,
      brouillon: true,
    });
  } catch (x) {
    const err = classer(x);
    if (x instanceof ErreurMessagerie && x.code === "JETON_REVOQUE") {
      const connexion = String(
        (e.expediteur?.parametres as Record<string, unknown> | undefined)
          ?.connexion ?? "",
      );
      await deps.portes.aReconnecter(connexion, x.message).catch(() => {});
    }
    try {
      await deps.portes.echouerEnvoi(e.envoi, err.message, err.definitive);
    } catch (p) {
      deps.journal.erreur("echouer_envoi en panne", {
        envoi: e.envoi,
        erreur: String(p),
      });
    }
    if (err.definitive) bilan.echecs++;
    else bilan.reportes++;
    await finir(
      deps,
      t.id,
      err.definitive
        ? { echec: true, erreur: err.message }
        : { reporte: true, erreur: err.message },
    );
  }
}

async function revoquer(t: Travail, deps: Dependances, bilan: Bilan) {
  const connexion = String(t.charge?.connexion ?? "");
  if (!UUID.test(connexion)) {
    bilan.echecs++;
    await finir(deps, t.id, {
      echec: true,
      erreur: "charge sans connexion valide",
    });
    return;
  }
  try {
    const { renouvellement } = await deps.portes.oublier(connexion);
    if (renouvellement && deps.gmail) await deps.gmail.revoquer(renouvellement);
    bilan.revoques++;
    await finir(deps, t.id, {
      revoquee: true,
      chez_google: renouvellement !== null && deps.gmail !== null,
    });
  } catch (e) {
    // Le Vault est déjà vidé si oublier a répondu : seule la révocation chez Google a échoué.
    bilan.reportes++;
    await finir(deps, t.id, {
      reporte: true,
      erreur: String((e as Error)?.message ?? e).slice(0, 300),
    });
  }
}

async function relever(
  c: ConnexionActive,
  m: Messagerie,
  deps: Dependances,
  bilan: Bilan,
) {
  try {
    const acces = await accesValable(c.connexion, m, deps);
    if (!c.curseur) {
      // Première relève sans curseur : on part de maintenant, on n'importe pas l'historique.
      const p = await m.profil(acces);
      await deps.portes.poserCurseur(c.connexion, p.curseur);
      return;
    }
    let n;
    try {
      n = await m.nouveautes(acces, c.curseur, c.etiquette || "INBOX");
    } catch (e) {
      if (e instanceof ErreurMessagerie && e.code === "CURSEUR_PERIME") {
        const p = await m.profil(acces);
        await deps.portes.poserCurseur(c.connexion, p.curseur);
        bilan.erreurs.push(
          `${c.adresse} : historique expiré, relève reprise au curseur courant`,
        );
        deps.journal.erreur(
          "historique expiré : des messages ont pu être manqués",
          { connexion: c.connexion },
        );
        return;
      }
      throw e;
    }
    const limite = deps.parConnexion ?? 50;
    const lot = n.messages.slice(0, limite);
    for (const message of lot) {
      let brut: Uint8Array<ArrayBuffer> | null = null;
      try {
        brut = await m.lireBrut(acces, message.id);
      } catch (e) {
        // Message supprimé entre-temps : on passe, sans bloquer la relève.
        if (!(e instanceof ErreurMessagerie && e.code === "DEFINITIVE")) {
          throw e;
        }
      }
      if (brut) {
        const lu = lireMessage(brut);
        const identifiant = lu.messageId ?? `gmail:${message.id}`;
        const pieces = await deposerPieces(
          deps.stockage,
          c.client_id,
          identifiant,
          lu.pieces.map((p) => ({
            nom: p.nom,
            typeMime: p.typeMime,
            octets: p.octets,
          })),
        );
        const d = await deps.portes.deposerReception({
          client: c.client_id,
          canal: "email",
          boite: c.adresse,
          identifiant,
          de: lu.de,
          deNom: lu.deNom,
          sujet: lu.sujet,
          corps: lu.texte,
          corpsHtml: lu.html,
          pieces,
          detail: {
            source: "gmail",
            connexion: c.connexion,
            gmail_id: message.id,
            message_id: lu.messageId,
            en_reponse_a: lu.enReponseA,
            fil: lu.references[0] ?? lu.messageId,
            references: lu.references.slice(0, 20),
            a: lu.a,
            cc: lu.cc,
          },
          recuLe: lu.date ?? (deps.maintenant?.() ?? new Date()).toISOString(),
        });
        bilan.recus++;
        if (d.nouvelle) bilan.nouveaux++;
      }
      await deps.portes.poserCurseur(c.connexion, message.curseur);
    }
    if (lot.length === n.messages.length) {
      await deps.portes.poserCurseur(c.connexion, n.curseur);
    }
  } catch (e) {
    if (e instanceof ErreurMessagerie && e.code === "JETON_REVOQUE") {
      bilan.a_reconnecter++;
      await deps.portes.aReconnecter(c.connexion, e.message).catch((p) =>
        deps.journal.erreur("messagerie_a_reconnecter en panne", {
          erreur: String(p),
        })
      );
      return;
    }
    bilan.erreurs.push(
      `${c.adresse} : ${String((e as Error)?.message ?? e).slice(0, 200)}`,
    );
    deps.journal.erreur("relève interrompue", {
      connexion: c.connexion,
      erreur: String(e),
    });
  }
}
