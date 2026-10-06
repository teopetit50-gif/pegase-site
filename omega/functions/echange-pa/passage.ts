// Un passage de l'ouvrier ÉCHANGE-PA, sur le modèle de l'expéditeur :
//   1. prend les travaux `pa.deposer` {facture} et `pa.statut` {statut} ;
//      pa_commencer_* → refus du socle : finir_travail(travail, réponse) ;
//                     → sinon : document lu au bucket (ou CDAR fabriqué), dépôt à la PA,
//                       pa_noter_* (trois tentatives), finir_travail({flux, …}).
//      Erreur transitoire (PA non branchée, réseau, 401/403, 429, 5xx, bucket) :
//        pa_echouer_*(…, false) puis finir_travail({reporte: true}).
//      Erreur définitive (400/404/413/422, CDAR invalide, statut qu'une entreprise n'émet pas) :
//        pa_echouer_*(…, true) puis finir_travail({echec: true}).
//   2. relève la PA depuis le curseur (moins une seconde : la norme compare strictement),
//      du plus ancien au plus récent : document des flux entrants déposé au bucket
//      (`_pa/entrants/<flux>/<nom>`, upsert), CDAR reçus lus, pa_noter_flux idempotent sur
//      `pa:<flux>:<maj_le>:<accuse>` ; s'arrête au premier flux qui tombe et ne pose le
//      curseur que jusqu'au dernier flux noté : rien n'est sauté.
//      Le relevé est aussi le rapprochement : un dépôt accepté par la PA dont pa_noter_depot
//      est tombé revient comme flux sortant, avec son trackingId (= id Omega).
//   3. battre_ouvrier('echange-pa', …) en fin de passage, même à vide.

import type { Portes, Travail } from "./portes.ts";
import {
  ErreurPA,
  type PlateformeAgreee,
  type Profil,
  type Regle,
  STATUTS_EMIS_PAR_L_ENTREPRISE,
  type Syntaxe,
} from "./pa.ts";
import {
  ErreurCdar,
  fabriquerCdar,
  lireCdar,
  normaliserStatut,
} from "./cdar.ts";
import { sirenAcheteur } from "./acheteur.ts";
import { sha256Hex } from "./afnor.ts";
import { cheminEntrant, type Stockage } from "./stockage.ts";

export const MODULE = "echange-pa";
export const GENRES = ["pa.deposer", "pa.statut"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** null tant qu'aucune PA n'est configurée : les travaux sont reportés, rien n'est relevé. */
  pa: PlateformeAgreee | null;
  stockage: Stockage;
  ouvrier: string;
  journal: Journal;
  nombre?: number;
  bail?: string;
  attendu?: string;
  limiteReleve?: number;
  attente?: (ms: number) => Promise<void>;
};

export type Bilan = {
  ouvrier: string;
  pa: string | null;
  pris: number;
  deposes: number;
  statuts: number;
  non_faits: number;
  reportes: number;
  echecs: number;
  releves: number;
  nouveaux: number;
  /** Factures entrantes déposées dans FILED (pa_deposer_facture). */
  factures_recues: number;
  /** Factures entrantes sans client (SIREN de l'acheteur illisible, inconnu ou ambigu). */
  orphelins: number;
  erreur_releve: string | null;
  duree_ms: number;
};

/** Erreur qui tranche, comme ErreurRemise de l'expéditeur. */
export class ErreurEchange extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly definitive: boolean,
  ) {
    super(`${code} : ${message}`);
    this.name = "ErreurEchange";
  }
}

function classer(e: unknown): ErreurEchange {
  if (e instanceof ErreurEchange) return e;
  if (e instanceof ErreurPA) {
    return new ErreurEchange(
      e.statut ? `PA_${e.statut}` : "PA_RESEAU",
      e.message,
      e.definitive,
    );
  }
  if (e instanceof ErreurCdar) {
    return new ErreurEchange("CDAR_INVALIDE", e.message, true);
  }
  return new ErreurEchange(
    "TRANSITOIRE",
    String((e as Error)?.message ?? e),
    false,
  );
}

async function troisFois(
  f: () => Promise<void>,
  attente: (ms: number) => Promise<void>,
): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    try {
      await f();
      return true;
    } catch {
      if (i < 2) await attente(500 * (i + 1));
    }
  }
  return false;
}

const typeMimePour = (syntaxe: string, chemin: string) =>
  syntaxe === "Factur-X" || chemin.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : "application/xml";

export async function executerPassage(deps: Dependances): Promise<Bilan> {
  const debut = Date.now();
  const attente = deps.attente ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const bilan: Bilan = {
    ouvrier: deps.ouvrier,
    pa: deps.pa?.nom ?? null,
    pris: 0,
    deposes: 0,
    statuts: 0,
    non_faits: 0,
    reportes: 0,
    echecs: 0,
    releves: 0,
    nouveaux: 0,
    factures_recues: 0,
    orphelins: 0,
    erreur_releve: null,
    duree_ms: 0,
  };

  let travaux: Travail[] = [];
  try {
    travaux = await deps.portes.prendreTravaux(
      [...GENRES],
      deps.nombre ?? 10,
      deps.bail ?? "15 minutes",
      deps.ouvrier,
    );
  } catch (e) {
    deps.journal.erreur("prendre_travaux en panne", { erreur: String(e) });
  }
  bilan.pris = travaux.length;
  for (const t of travaux) await traiterTravail(t, deps, bilan, attente);

  if (deps.pa) await relever(deps.pa, deps, bilan);

  bilan.duree_ms = Date.now() - debut;
  try {
    await deps.portes.battreOuvrier(MODULE, [...GENRES], {
      pa_branchee: deps.pa !== null,
      pa: bilan.pa,
      pris: bilan.pris,
      deposes: bilan.deposes,
      statuts: bilan.statuts,
      reportes: bilan.reportes,
      echecs: bilan.echecs,
      releves: bilan.releves,
      nouveaux: bilan.nouveaux,
      factures_recues: bilan.factures_recues,
      orphelins: bilan.orphelins,
      erreur_releve: bilan.erreur_releve,
    }, deps.attendu ?? "15 minutes");
  } catch (e) {
    deps.journal.erreur("battre_ouvrier en panne", { erreur: String(e) });
  }
  return bilan;
}

async function finir(
  deps: Dependances,
  travail: number,
  resultat: Record<string, unknown>,
) {
  try {
    await deps.portes.finirTravail(travail, resultat);
  } catch (e) {
    // Le bail expirera et le travail reviendra : pa_commencer_* le reconnaîtra comme fait.
    deps.journal.erreur("finir_travail en panne", {
      travail,
      erreur: String(e),
    });
  }
}

async function traiterTravail(
  t: Travail,
  deps: Dependances,
  bilan: Bilan,
  attente: (ms: number) => Promise<void>,
) {
  const estDepot = t.genre === "pa.deposer";
  const id = String(t.charge?.[estDepot ? "facture" : "statut"] ?? "");
  if (!UUID.test(id)) {
    bilan.echecs++;
    await finir(deps, t.id, {
      echec: true,
      erreur: `charge sans ${estDepot ? "facture" : "statut"} valide`,
    });
    return;
  }

  // 1. Le socle tranche et verrouille.
  let document: {
    suivi: string;
    nom: string;
    syntaxe: Syntaxe;
    profil?: Profil | null;
    regle?: Regle | null;
    octets: Uint8Array<ArrayBuffer>;
    typeMime: string;
  };
  try {
    if (estDepot) {
      const r = await deps.portes.commencerDepot(id);
      if (!r.deposer) {
        bilan.non_faits++;
        await finir(deps, t.id, r as unknown as Record<string, unknown>);
        return;
      }
      if (!deps.pa) {
        throw new ErreurEchange(
          "PA_NON_BRANCHEE",
          "aucune plateforme agréée configurée, dépôt reporté",
          false,
        );
      }
      document = {
        suivi: r.suivi,
        nom: r.nom,
        syntaxe: r.syntaxe,
        profil: (r.profil ?? null) as Profil | null,
        regle: (r.regle ?? null) as Regle | null,
        octets: await deps.stockage.lire(r.chemin),
        typeMime: r.type_mime || typeMimePour(r.syntaxe, r.chemin),
      };
    } else {
      const r = await deps.portes.commencerStatut(id);
      if (!r.envoyer) {
        bilan.non_faits++;
        await finir(deps, t.id, r as unknown as Record<string, unknown>);
        return;
      }
      // a4_18 rend les nombres en nombres (code, montant) : remis en texte avant tout contrôle.
      const cdar = r.cdar ? normaliserStatut(r.cdar) : null;
      if (cdar && !STATUTS_EMIS_PAR_L_ENTREPRISE.has(cdar.code)) {
        throw new ErreurEchange(
          "STATUT_NON_EMIS_PAR_L_ENTREPRISE",
          `le statut ${cdar.code} est émis par une plateforme, pas par l'entreprise`,
          true,
        );
      }
      if (!deps.pa) {
        throw new ErreurEchange(
          "PA_NON_BRANCHEE",
          "aucune plateforme agréée configurée, statut reporté",
          false,
        );
      }
      let octets: Uint8Array<ArrayBuffer>;
      if (r.chemin) octets = await deps.stockage.lire(r.chemin);
      else if (cdar) {
        octets = new TextEncoder().encode(fabriquerCdar(cdar)) as Uint8Array<
          ArrayBuffer
        >;
      } else {throw new ErreurEchange(
          "STATUT_SANS_DOCUMENT",
          "ni chemin ni champs CDAR",
          true,
        );}
      document = {
        suivi: r.suivi,
        nom: `cdar-${id}.xml`,
        syntaxe: "CDAR",
        octets,
        typeMime: "application/xml",
      };
    }
  } catch (e) {
    await echouer(t, id, estDepot, classer(e), deps, bilan);
    return;
  }

  // 2. Dépôt à la PA.
  let flux: string;
  let deposeLe: string | null;
  try {
    const d = await deps.pa!.deposer(document);
    flux = d.flux;
    deposeLe = d.depose_le;
  } catch (e) {
    await echouer(t, id, estDepot, classer(e), deps, bilan);
    return;
  }

  // 3. Noté par le socle ; à défaut, le relevé rapprochera par le trackingId.
  const note = await troisFois(
    () =>
      estDepot
        ? deps.portes.noterDepot(id, flux, deposeLe)
        : deps.portes.noterStatut(id, flux, deposeLe),
    attente,
  );
  if (!note) {
    deps.journal.erreur(
      "dépôt accepté par la PA mais non noté : le relevé le rapprochera",
      { travail: t.id, id, flux },
    );
  }
  if (estDepot) bilan.deposes++;
  else bilan.statuts++;
  await finir(deps, t.id, {
    flux,
    depose_le: deposeLe,
    pa: deps.pa!.nom,
    note,
  });
}

async function echouer(
  t: Travail,
  id: string,
  estDepot: boolean,
  e: ErreurEchange,
  deps: Dependances,
  bilan: Bilan,
) {
  deps.journal.erreur(e.definitive ? "échec définitif" : "reporté", {
    travail: t.id,
    id,
    erreur: e.message,
  });
  try {
    if (estDepot) await deps.portes.echouerDepot(id, e.message, e.definitive);
    else await deps.portes.echouerStatut(id, e.message, e.definitive);
  } catch (p) {
    deps.journal.erreur("pa_echouer_* en panne", { id, erreur: String(p) });
  }
  if (e.definitive) bilan.echecs++;
  else bilan.reportes++;
  await finir(
    deps,
    t.id,
    e.definitive
      ? { echec: true, erreur: e.message }
      : { reporte: true, erreur: e.message },
  );
}

async function relever(pa: PlateformeAgreee, deps: Dependances, bilan: Bilan) {
  let curseur: string | null;
  let flux;
  try {
    curseur = await deps.portes.curseur();
    const depuis = curseur ? new Date(Date.parse(curseur) - 1000) : null;
    flux = await pa.relever(depuis, deps.limiteReleve ?? 100);
  } catch (e) {
    bilan.erreur_releve = classer(e).message;
    deps.journal.erreur("relevé impossible", { erreur: bilan.erreur_releve });
    return;
  }
  let dernier: string | null = null;
  for (const f of flux) {
    try {
      let chemin: string | null = null;
      let sha: string | null = null;
      const detail: Record<string, unknown> = {
        pa: pa.nom,
        nom: f.nom,
        profil: f.profil,
        regle: f.regle,
        depose_le: f.depose_le,
        details: f.details,
      };
      let fichier:
        | { octets: Uint8Array<ArrayBuffer>; typeMime: string }
        | null = null;
      const estStatut = f.syntaxe === "CDAR" || /LC$/.test(f.type);
      if (f.sens === "entrant") {
        fichier = await pa.telecharger(f.flux);
        chemin = cheminEntrant(f.flux, f.nom);
        await deps.stockage.deposer(chemin, fichier.octets, fichier.typeMime);
        sha = await sha256Hex(fichier.octets);
        if (estStatut) {
          detail.cdar = lireCdar(new TextDecoder().decode(fichier.octets));
        } else {
          // C'est par lui que pa_noter_flux retrouve le client ; absent → flux « orphelin ».
          detail.acheteur_siren = await sirenAcheteur(
            fichier.octets,
            f.syntaxe,
            fichier.typeMime,
          );
        }
      }
      const r = await deps.portes.noterFlux({
        flux: f.flux,
        sens: f.sens,
        type: f.type,
        syntaxe: f.syntaxe,
        suivi: f.suivi,
        accuse: f.accuse,
        maj_le: f.maj_le,
        chemin,
        sha256: sha,
        detail,
        cle: `pa:${f.flux}:${f.maj_le}:${f.accuse}`,
      });
      // Second temps d'une facture entrante rattachée (a4_18) : copie au chemin cible, puis
      // pa_deposer_facture. Rejoué tel quel si un passage précédent s'est arrêté entre les deux.
      if (
        fichier && !estStatut && r.chemin_cible &&
        (r.etat === "rattache" || r.etat === "sans_suite")
      ) {
        await deps.stockage.deposer(
          r.chemin_cible,
          fichier.octets,
          fichier.typeMime,
        );
        await deps.portes.deposerFacture(
          r.flux_id ?? r.id,
          fichier.octets.length,
        );
        bilan.factures_recues++;
      } else if (r.etat === "orphelin" || r.etat === "ambigu") {
        bilan.orphelins++;
        deps.journal.erreur(`facture reçue ${r.etat}`, {
          flux: f.flux,
          acheteur_siren: detail.acheteur_siren ?? null,
        });
      }
      bilan.releves++;
      if (r.nouveau) bilan.nouveaux++;
      dernier = f.maj_le;
    } catch (e) {
      bilan.erreur_releve = `flux ${f.flux} : ${classer(e).message}`;
      deps.journal.erreur("relevé interrompu", {
        flux: f.flux,
        erreur: bilan.erreur_releve,
      });
      break;
    }
  }
  if (dernier && (!curseur || Date.parse(dernier) > Date.parse(curseur))) {
    try {
      await deps.portes.poserCurseur(dernier);
    } catch (e) {
      // Sans curseur posé, le prochain passage relit les mêmes flux : pa_noter_flux est idempotente.
      deps.journal.erreur("pa_poser_curseur en panne", { erreur: String(e) });
    }
  }
}
