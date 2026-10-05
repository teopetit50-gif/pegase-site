// Un passage de l'ouvrier expéditeur : prend les travaux envois.brevo et
// envois.brevo_sms, commence chaque envoi par la porte commencer_envoi, le remet
// à Brevo, le confirme (confirmer_envoi) ou le fait échouer (echouer_envoi), finit
// le travail, puis bat (battre_ouvrier) même à vide.
//
// Flux posé par le coordinateur (05/10/2026) :
//   commencer_envoi(envoi) → envoyer=false : finir_travail(travail, réponse)
//                          → envoyer=true  : clé = secret_expediteur(envoi) si expediteur.secret,
//                                            sinon BREVO_API_KEY ; remise Brevo ;
//                                            confirmer_envoi(envoi, messageId) ;
//                                            finir_travail(travail, {fournisseur_id, remis_a}).
//   Erreur transitoire : echouer_envoi(envoi, err, false) puis finir_travail(travail, {reporte: true}).
//   Erreur définitive  : echouer_envoi(envoi, err, true)  puis finir_travail(travail, {echec: true}).

import type { EnvoiAEnvoyer, Portes, Travail } from "./portes.ts";
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
export const CANAUX_PRIS_EN_CHARGE = new Set(["email", "sms"]);

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** Fabrique un client Brevo pour une clé API donnée (coffre ou environnement). */
  brevoPour: (cleApi: string) => ClientBrevo;
  /** BREVO_API_KEY de l'environnement, null tant qu'elle n'est pas posée. */
  cleEnvironnement: string | null;
  stockage: Stockage;
  ouvrier: string;
  journal: Journal;
  nombre?: number;
  bail?: string;
  attendu?: string;
  /** Pour les tests : pas d'attente entre les tentatives de confirmer_envoi. */
  attente?: (ms: number) => Promise<void>;
  maintenant?: () => Date;
};

export type Issue =
  | {
    sortie: "remis";
    travail: number;
    envoi: string;
    fournisseur_id: string;
    confirme: boolean;
  }
  | { sortie: "non_envoye"; travail: number; envoi: string; statut: string }
  | { sortie: "reporte"; travail: number; envoi: string; erreur: string }
  | { sortie: "echec"; travail: number; envoi?: string; erreur: string };

export type Bilan = {
  ouvrier: string;
  pris: number;
  remis: number;
  non_envoyes: number;
  reportes: number;
  echecs: number;
  issues: Issue[];
  duree_ms: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Erreur qui tranche : définitive (echouer_envoi definitif=true) ou reportée. */
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
    non_envoyes: 0,
    reportes: 0,
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
    else if (issue.sortie === "non_envoye") bilan.non_envoyes++;
    else if (issue.sortie === "reporte") bilan.reportes++;
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
        non_envoyes: bilan.non_envoyes,
        reportes: bilan.reportes,
        echecs: bilan.echecs,
        duree_ms: bilan.duree_ms,
        cle_environnement: deps.cleEnvironnement !== null,
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

  // 1. La charge doit porter l'uuid de l'envoi : sinon le travail lui-même est en échec.
  if (!UUID.test(envoiId)) {
    const erreur = `CHARGE_INVALIDE : charge sans uuid d'envoi : ${
      JSON.stringify(travail.charge)
    }`;
    journal.erreur("travail en échec définitif", {
      travail: travail.id,
      erreur,
    });
    await sansLever(
      () => portes.echouerTravail(travail.id, erreur, false),
      journal,
      "echouer_travail",
      travail.id,
    );
    return { sortie: "echec", travail: travail.id, erreur };
  }

  // 2. commencer_envoi : lecture et transition. Si la porte tombe, le travail est repris (rien n'a bougé).
  let commence;
  try {
    commence = await portes.commencerEnvoi(envoiId);
  } catch (e) {
    const erreur = `PORTE_INDISPONIBLE : commencer_envoi : ${
      String(e).slice(0, 300)
    }`;
    journal.erreur("commencer_envoi a échoué, travail repris", {
      travail: travail.id,
      envoi: envoiId,
      erreur,
    });
    await sansLever(
      () => portes.echouerTravail(travail.id, erreur, true),
      journal,
      "echouer_travail",
      travail.id,
    );
    return { sortie: "reporte", travail: travail.id, envoi: envoiId, erreur };
  }

  if (!commence.envoyer) {
    journal.info("envoi non envoyé par décision du socle", {
      travail: travail.id,
      envoi: envoiId,
      statut: commence.statut,
      motif: commence.motif ?? null,
    });
    await sansLever(
      () => portes.finirTravail(travail.id, { ...commence }),
      journal,
      "finir_travail",
      travail.id,
    );
    return {
      sortie: "non_envoye",
      travail: travail.id,
      envoi: envoiId,
      statut: commence.statut,
    };
  }

  // 3. L'envoi est 'en_cours' : à partir d'ici, toute erreur passe par echouer_envoi puis finir_travail.
  const envoi = commence;
  try {
    const fournisseurId = await remettre(envoi, deps);
    const confirme = await confirmerAvecReprises(
      envoi.envoi,
      fournisseurId,
      deps,
    );
    const remisA = (deps.maintenant?.() ?? new Date()).toISOString();
    await sansLever(
      () =>
        portes.finirTravail(travail.id, {
          fournisseur_id: fournisseurId,
          remis_a: remisA,
          ...(confirme ? {} : { confirme: false }),
        }),
      journal,
      "finir_travail",
      travail.id,
    );
    journal.info("envoi remis à Brevo", {
      travail: travail.id,
      envoi: envoi.envoi,
      canal: envoi.canal,
      mode: envoi.mode,
      fournisseur_id: fournisseurId,
      confirme,
    });
    return {
      sortie: "remis",
      travail: travail.id,
      envoi: envoi.envoi,
      fournisseur_id: fournisseurId,
      confirme,
    };
  } catch (e) {
    const { message, definitive } = qualifier(e);
    journal.erreur(definitive ? "envoi en échec définitif" : "envoi reporté", {
      travail: travail.id,
      envoi: envoi.envoi,
      erreur: message,
    });
    await sansLever(
      () => portes.echouerEnvoi(envoi.envoi, message, definitive),
      journal,
      "echouer_envoi",
      travail.id,
    );
    await sansLever(
      () =>
        portes.finirTravail(
          travail.id,
          definitive
            ? { echec: true, erreur: message }
            : { reporte: true, erreur: message },
        ),
      journal,
      "finir_travail",
      travail.id,
    );
    return definitive
      ? {
        sortie: "echec",
        travail: travail.id,
        envoi: envoi.envoi,
        erreur: message,
      }
      : {
        sortie: "reporte",
        travail: travail.id,
        envoi: envoi.envoi,
        erreur: message,
      };
  }
}

async function remettre(
  envoi: EnvoiAEnvoyer,
  deps: Dependances,
): Promise<string> {
  if (!CANAUX_PRIS_EN_CHARGE.has(envoi.canal)) {
    throw new ErreurRemise(
      "CANAL_NON_PRIS_EN_CHARGE",
      `canal ${envoi.canal} : cet ouvrier ne remet que email et sms`,
      true,
    );
  }
  if (!envoi.expediteur?.identite) {
    throw new ErreurRemise("EXPEDITEUR_ABSENT", envoi.envoi, true);
  }

  const cleApi = await cleFournisseur(envoi, deps);
  const brevo = deps.brevoPour(cleApi);
  return envoi.canal === "sms"
    ? await remettreSms(envoi, brevo)
    : await remettreEmail(envoi, brevo, deps.stockage);
}

/** Clé du coffre quand l'expéditeur en a une, sinon BREVO_API_KEY de l'environnement. */
async function cleFournisseur(
  envoi: EnvoiAEnvoyer,
  deps: Dependances,
): Promise<string> {
  if (envoi.expediteur.secret) {
    let secret: string | null = null;
    try {
      secret = await deps.portes.secretExpediteur(envoi.envoi);
    } catch (e) {
      throw new ErreurRemise(
        "SECRET_ILLISIBLE",
        `secret_expediteur : ${String(e).slice(0, 200)}`,
        false,
      );
    }
    if (secret) return secret;
    deps.journal.erreur(
      "secret_expediteur n'a rien rendu, repli sur BREVO_API_KEY",
      { envoi: envoi.envoi },
    );
  }
  if (deps.cleEnvironnement) return deps.cleEnvironnement;
  deps.journal.erreur(
    "BREVO_API_KEY absente de l'environnement : fournisseur non branché, envoi reporté",
    { envoi: envoi.envoi, mode: envoi.mode },
  );
  throw new ErreurRemise(
    "FOURNISSEUR_NON_BRANCHE",
    "aucune clé Brevo : ni coffre, ni BREVO_API_KEY",
    false,
  );
}

/** confirmer_envoi est rejouable : trois tentatives, puis on finit quand même le travail (Brevo a accepté). */
async function confirmerAvecReprises(
  envoi: string,
  reference: string,
  deps: Dependances,
): Promise<boolean> {
  const attente = deps.attente ??
    ((ms) => new Promise((r) => setTimeout(r, ms)));
  for (let tentative = 1; tentative <= 3; tentative++) {
    try {
      await deps.portes.confirmerEnvoi(envoi, reference);
      return true;
    } catch (e) {
      deps.journal.erreur("confirmer_envoi a échoué", {
        envoi,
        reference,
        tentative,
        erreur: String(e).slice(0, 300),
      });
      if (tentative < 3) await attente(500 * tentative);
    }
  }
  deps.journal.erreur(
    "ENVOI ACCEPTÉ PAR BREVO MAIS NON CONFIRMÉ : à rapprocher à la main",
    { envoi, reference },
  );
  return false;
}

async function sansLever(
  action: () => Promise<unknown>,
  journal: Journal,
  porte: string,
  travail: number,
): Promise<void> {
  try {
    await action();
  } catch (e) {
    journal.erreur(`${porte} a échoué`, {
      travail,
      erreur: String(e).slice(0, 300),
    });
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
  envoi: EnvoiAEnvoyer,
  pieces: { name: string; content: string }[],
): EmailBrevo {
  const exp = envoi.expediteur;
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
      "X-Omega-Envoi": envoi.cle,
      "X-Mailin-custom": `envoi:${envoi.cle}`,
    },
    tags: [
      `envoi:${envoi.cle}`,
      `module:${envoi.module}`,
      `mode:${envoi.mode}`,
    ],
  };
  if (repondreA) message.replyTo = { email: repondreA };
  if (corpsEstHtml(envoi.corps)) message.htmlContent = envoi.corps;
  else message.textContent = envoi.corps;
  if (pieces.length) message.attachment = pieces;
  return message;
}

export function composerSms(envoi: EnvoiAEnvoyer): SmsBrevo {
  const exp = envoi.expediteur;
  return {
    sender: emetteurSms(exp.nom_affiche, exp.identite),
    recipient: normaliserNumeroSms(envoi.destinataire.adresse),
    content: envoi.corps,
    type: envoi.transactionnel ? "transactional" : "marketing",
    tag: `envoi:${envoi.cle}`,
    unicodeEnabled: necessiteUnicode(envoi.corps),
  };
}

async function remettreEmail(
  envoi: EnvoiAEnvoyer,
  brevo: ClientBrevo,
  stockage: Stockage,
): Promise<string> {
  if (!envoi.sujet) throw new ErreurRemise("SUJET_ABSENT", envoi.envoi, true);
  const pieces: { name: string; content: string }[] = [];
  for (const piece of envoi.pieces ?? []) {
    let octets: Uint8Array;
    try {
      octets = await stockage.lirePiece(piece);
    } catch (e) {
      throw new ErreurRemise("PIECE_ILLISIBLE", String(e).slice(0, 300), false);
    }
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
  envoi: EnvoiAEnvoyer,
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
