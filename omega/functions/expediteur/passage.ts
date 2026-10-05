// Un passage de l'ouvrier expéditeur : prend les travaux envois.brevo et
// envois.brevo_sms, remet chaque envoi à Brevo, finit ou fait échouer le travail,
// puis bat (battre_ouvrier) même à vide.

import type { EnvoiARemettre, Portes, Travail } from "./portes.ts";
import {
  type ClientBrevo,
  corpsEstHtml,
  type EmailBrevo,
  emetteurSms,
  ErreurBrevo,
  necessiteUnicode,
  normaliserNumeroSms,
  type SmsBrevo,
} from "./brevo.ts";
import { type Stockage, versBase64 } from "./stockage.ts";

export const MODULE = "expediteur";
export const GENRES = ["envois.brevo", "envois.brevo_sms"] as const;
export const CANAL_PAR_GENRE: Record<string, string> = {
  "envois.brevo": "email",
  "envois.brevo_sms": "sms",
};
export const STATUTS_REMETTABLES = new Set(["pret", "en_cours"]);

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** null tant que BREVO_API_KEY n'est pas posée : les travaux sont repris, pas perdus. */
  brevo: ClientBrevo | null;
  stockage: Stockage;
  ouvrier: string;
  journal: Journal;
  nombre?: number;
  bail?: string;
  attendu?: string;
};

export type Issue =
  | { sortie: "remis"; travail: number; envoi: string; fournisseur_id: string }
  | { sortie: "deja_remis"; travail: number; envoi: string }
  | { sortie: "repris"; travail: number; envoi?: string; erreur: string }
  | { sortie: "echec"; travail: number; envoi?: string; erreur: string };

export type Bilan = {
  ouvrier: string;
  pris: number;
  remis: number;
  deja_remis: number;
  repris: number;
  echecs: number;
  issues: Issue[];
  duree_ms: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Erreur qui tranche : définitive (echouer_travail reprendre=false) ou reprise. */
export class ErreurRemise extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly definitive: boolean,
  ) {
    super(`${code} : ${message}`);
    this.name = "ErreurRemise";
  }
}

export async function executerPassage(deps: Dependances): Promise<Bilan> {
  const debut = Date.now();
  const bilan: Bilan = {
    ouvrier: deps.ouvrier,
    pris: 0,
    remis: 0,
    deja_remis: 0,
    repris: 0,
    echecs: 0,
    issues: [],
    duree_ms: 0,
  };
  let travaux: Travail[] = [];
  try {
    travaux = await deps.portes.prendreTravaux(
      [...GENRES],
      deps.nombre ?? 5,
      deps.bail ?? "10 minutes",
      deps.ouvrier,
    );
  } catch (e) {
    deps.journal.erreur("prendre_travaux a échoué", { erreur: String(e) });
  }
  bilan.pris = travaux.length;

  for (const travail of travaux) {
    const issue = await traiterTravail(travail, deps);
    bilan.issues.push(issue);
    if (issue.sortie === "remis") bilan.remis++;
    else if (issue.sortie === "deja_remis") bilan.deja_remis++;
    else if (issue.sortie === "repris") bilan.repris++;
    else bilan.echecs++;
  }

  bilan.duree_ms = Date.now() - debut;
  try {
    await deps.portes.battreOuvrier(
      MODULE,
      [...GENRES],
      {
        ouvrier: deps.ouvrier,
        pris: bilan.pris,
        remis: bilan.remis,
        deja_remis: bilan.deja_remis,
        repris: bilan.repris,
        echecs: bilan.echecs,
        duree_ms: bilan.duree_ms,
        fournisseur_branche: deps.brevo !== null,
      },
      deps.attendu ?? "15 minutes",
    );
  } catch (e) {
    deps.journal.erreur("battre_ouvrier a échoué", { erreur: String(e) });
  }
  return bilan;
}

export async function traiterTravail(
  travail: Travail,
  deps: Dependances,
): Promise<Issue> {
  const { portes, journal } = deps;
  const envoiId = typeof travail.charge?.envoi === "string"
    ? travail.charge.envoi
    : "";
  try {
    if (!UUID.test(envoiId)) {
      throw new ErreurRemise(
        "CHARGE_INVALIDE",
        `charge sans uuid d'envoi : ${JSON.stringify(travail.charge)}`,
        true,
      );
    }
    const envoi = await portes.envoiARemettre(envoiId);
    if (!envoi) throw new ErreurRemise("ENVOI_INTROUVABLE", envoiId, true);

    if (envoi.reference_externe) {
      // Le travail a été livré deux fois : l'envoi est déjà parti, on clôt sans ré-émettre.
      journal.info("envoi déjà remis, travail clos sans ré-émission", {
        travail: travail.id,
        envoi: envoi.id,
      });
      await portes.finirTravail(travail.id, {
        fournisseur_id: envoi.reference_externe,
        remis_a: envoi.destinataire.adresse,
      });
      return { sortie: "deja_remis", travail: travail.id, envoi: envoi.id };
    }
    if (!STATUTS_REMETTABLES.has(envoi.statut)) {
      throw new ErreurRemise("ENVOI_NON_PRET", `statut ${envoi.statut}`, true);
    }
    const canalAttendu = CANAL_PAR_GENRE[travail.genre];
    if (canalAttendu && envoi.canal !== canalAttendu) {
      throw new ErreurRemise(
        "CANAL_INCOHERENT",
        `genre ${travail.genre} pour un envoi ${envoi.canal}`,
        true,
      );
    }
    if (!envoi.expediteur) {
      throw new ErreurRemise("EXPEDITEUR_ABSENT", envoi.id, true);
    }

    if (!deps.brevo) {
      journal.erreur(
        "BREVO_API_KEY absente : fournisseur non branché, travail repris",
        {
          travail: travail.id,
          envoi: envoi.id,
        },
      );
      throw new ErreurRemise(
        "FOURNISSEUR_NON_BRANCHE",
        "BREVO_API_KEY absente de l'environnement de la fonction",
        false,
      );
    }

    const fournisseurId = envoi.canal === "sms"
      ? await remettreSms(envoi, deps.brevo)
      : await remettreEmail(envoi, deps.brevo, deps.stockage);

    await portes.finirTravail(travail.id, {
      fournisseur_id: fournisseurId,
      remis_a: envoi.destinataire.adresse,
    });
    journal.info("envoi remis à Brevo", {
      travail: travail.id,
      envoi: envoi.id,
      canal: envoi.canal,
      fournisseur_id: fournisseurId,
    });
    return {
      sortie: "remis",
      travail: travail.id,
      envoi: envoi.id,
      fournisseur_id: fournisseurId,
    };
  } catch (e) {
    const { message, definitive } = qualifier(e);
    journal.erreur(definitive ? "envoi en échec définitif" : "envoi repris", {
      travail: travail.id,
      envoi: envoiId || undefined,
      erreur: message,
    });
    let sortie: "repris" | "echec" = definitive ? "echec" : "repris";
    try {
      sortie = await portes.echouerTravail(travail.id, message, !definitive);
    } catch (e2) {
      journal.erreur("echouer_travail a échoué, le bail expirera", {
        travail: travail.id,
        erreur: String(e2),
      });
    }
    return {
      sortie,
      travail: travail.id,
      envoi: envoiId || undefined,
      erreur: message,
    };
  }
}

function qualifier(e: unknown): { message: string; definitive: boolean } {
  if (e instanceof ErreurRemise) {
    return { message: e.message, definitive: e.definitive };
  }
  if (e instanceof ErreurBrevo) {
    return {
      message: `BREVO_${e.statut} : ${e.corps.slice(0, 500)}`,
      definitive: e.definitif,
    };
  }
  return {
    message: `ERREUR_INATTENDUE : ${String(e).slice(0, 500)}`,
    definitive: false,
  };
}

export function composerEmail(
  envoi: EnvoiARemettre,
  pieces: { name: string; content: string }[],
): EmailBrevo {
  const exp = envoi.expediteur!;
  const repondreA = envoi.repondre_a ?? exp.repondre_a;
  const message: EmailBrevo = {
    sender: {
      email: exp.identite,
      ...(exp.nom_affiche ? { name: exp.nom_affiche } : {}),
    },
    to: [{
      email: envoi.destinataire.adresse,
      ...(envoi.destinataire.nom ? { name: envoi.destinataire.nom } : {}),
    }],
    subject: envoi.sujet ?? "",
    headers: {
      "X-Omega-Envoi": envoi.id,
      "X-Mailin-custom": `envoi:${envoi.id}`,
    },
    tags: [`envoi:${envoi.id}`, `module:${envoi.module}`],
  };
  if (repondreA) message.replyTo = { email: repondreA };
  if (corpsEstHtml(envoi.corps)) message.htmlContent = envoi.corps;
  else message.textContent = envoi.corps;
  if (pieces.length) message.attachment = pieces;
  return message;
}

export function composerSms(envoi: EnvoiARemettre): SmsBrevo {
  const exp = envoi.expediteur!;
  return {
    sender: emetteurSms(exp.nom_affiche, exp.identite),
    recipient: normaliserNumeroSms(envoi.destinataire.adresse),
    content: envoi.corps,
    type: envoi.transactionnel ? "transactional" : "marketing",
    tag: `envoi:${envoi.id}`,
    unicodeEnabled: necessiteUnicode(envoi.corps),
  };
}

async function remettreEmail(
  envoi: EnvoiARemettre,
  brevo: ClientBrevo,
  stockage: Stockage,
): Promise<string> {
  if (!envoi.sujet) throw new ErreurRemise("SUJET_ABSENT", envoi.id, true);
  const pieces: { name: string; content: string }[] = [];
  for (const piece of envoi.pieces ?? []) {
    const octets = await stockage.lirePiece(piece);
    pieces.push({ name: piece.nom, content: versBase64(octets) });
  }
  const remise = await brevo.envoyerEmail(composerEmail(envoi, pieces));
  if (!remise?.messageId) {
    throw new ErreurRemise(
      "REPONSE_BREVO_INCOMPLETE",
      JSON.stringify(remise),
      false,
    );
  }
  return remise.messageId;
}

async function remettreSms(
  envoi: EnvoiARemettre,
  brevo: ClientBrevo,
): Promise<string> {
  const message = composerSms(envoi);
  if (!/^\d{8,15}$/.test(message.recipient)) {
    throw new ErreurRemise("NUMERO_INVALIDE", envoi.destinataire.adresse, true);
  }
  const remise = await brevo.envoyerSms(message);
  const id = remise?.messageId ?? remise?.reference;
  if (id === undefined || id === null) {
    throw new ErreurRemise(
      "REPONSE_BREVO_INCOMPLETE",
      JSON.stringify(remise),
      false,
    );
  }
  return String(id);
}
