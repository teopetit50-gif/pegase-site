// Un passage de l'ouvrier expéditeur : prend les travaux envois.brevo, envois.brevo_sms,
// envois.meta_whatsapp et envois.ar24, commence chaque envoi par la porte commencer_envoi, le
// remet au fournisseur (Brevo, WhatsApp Cloud API de Meta, AR24), le confirme (confirmer_envoi) ou le fait échouer (echouer_envoi), finit
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
import {
  type ClientWhatsApp,
  ErreurMeta,
  type MessageWhatsApp,
} from "./meta.ts";
import {
  type AccesAr24,
  type ClientAr24,
  ErreurAr24,
  type MailAr24,
} from "./ar24.ts";

export const MODULE = "expediteur";
/** Genre interne : confirmation différée d'un envoi accepté par Brevo (voir rapprochement). */
export const GENRE_CONFIRMATION = "envois.confirmer";
export const GENRES = [
  "envois.brevo",
  "envois.brevo_sms",
  "envois.meta_whatsapp",
  "envois.ar24",
  GENRE_CONFIRMATION,
] as const;
export const CANAUX_PRIS_EN_CHARGE = new Set([
  "email",
  "sms",
  "whatsapp",
  "lre",
]);
/** Fournisseurs que cet ouvrier remet réellement. */
export const FOURNISSEURS_REMIS = new Set([
  "brevo",
  "brevo_sms",
  "meta_whatsapp",
  "ar24",
]);
/** WhatsApp et LRE n'ont qu'un fournisseur chacun : un autre est une incohérence du socle. */
const FOURNISSEUR_DU_CANAL: Record<string, string> = {
  whatsapp: "meta_whatsapp",
  lre: "ar24",
};

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
  /** WhatsApp : fabrique un client pour un jeton et un phone_number_id. Absent → non branché. */
  whatsappPour?: (jeton: string, phoneNumberId: string) => ClientWhatsApp;
  /** META_ACCESS_TOKEN de l'environnement (jeton d'utilisateur système), null tant qu'il n'est pas posé. */
  jetonMeta?: string | null;
  /** AR24 : fabrique un client pour un accès. Absent → non branché. */
  ar24Pour?: (acces: AccesAr24) => ClientAr24;
  /** AR24_TOKEN + AR24_CLE_PRIVEE de l'environnement, null tant qu'ils ne sont pas posés. */
  accesAr24?: AccesAr24 | null;
  /** AR24_WEBHOOK_URL : URL de webhooks/ar24 (avec son jeton), passée à chaque LRE. */
  webhookAr24?: string | null;
};

export type Issue =
  | {
    sortie: "remis";
    travail: number;
    envoi: string;
    fournisseur_id: string;
    confirme: boolean;
    /** Id du travail envois.confirmer déposé quand confirme = false, null si impossible. */
    rapprochement?: number | null;
  }
  | {
    sortie: "confirme";
    travail: number;
    envoi: string;
    fournisseur_id: string;
  }
  | { sortie: "non_envoye"; travail: number; envoi: string; statut: string }
  | { sortie: "reporte"; travail: number; envoi: string; erreur: string }
  | { sortie: "echec"; travail: number; envoi?: string; erreur: string };

export type Bilan = {
  ouvrier: string;
  pris: number;
  remis: number;
  confirmes: number;
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
    confirmes: 0,
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
    else if (issue.sortie === "confirme") bilan.confirmes++;
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
        confirmes: bilan.confirmes,
        non_envoyes: bilan.non_envoyes,
        reportes: bilan.reportes,
        echecs: bilan.echecs,
        duree_ms: bilan.duree_ms,
        cle_environnement: deps.cleEnvironnement !== null,
        whatsapp_branche: !!(deps.whatsappPour && deps.jetonMeta),
        ar24_branche: !!(deps.ar24Pour && deps.accesAr24),
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

  // 1 bis. Travail de rapprochement : seulement confirmer_envoi, jamais de ré-émission.
  if (travail.genre === GENRE_CONFIRMATION) {
    return traiterConfirmation(travail, envoiId, deps);
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
    const rapprochement = confirme
      ? undefined
      : await deposerRapprochement(travail, envoi.envoi, fournisseurId, deps);
    const remisA = (deps.maintenant?.() ?? new Date()).toISOString();
    await sansLever(
      () =>
        portes.finirTravail(travail.id, {
          fournisseur_id: fournisseurId,
          remis_a: remisA,
          ...(confirme ? {} : { confirme: false, rapprochement }),
        }),
      journal,
      "finir_travail",
      travail.id,
    );
    journal.info("envoi remis au fournisseur", {
      travail: travail.id,
      envoi: envoi.envoi,
      canal: envoi.canal,
      fournisseur: envoi.fournisseur,
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
      ...(confirme ? {} : { rapprochement }),
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
      `canal ${envoi.canal} : cet ouvrier ne remet que email, sms, whatsapp et lre`,
      true,
    );
  }
  const attendu = FOURNISSEUR_DU_CANAL[envoi.canal];
  if (attendu && envoi.fournisseur !== attendu) {
    throw new ErreurRemise(
      "CANAL_NON_PRIS_EN_CHARGE",
      `canal ${envoi.canal} par ${envoi.fournisseur} : seul ${attendu} est remis`,
      true,
    );
  }
  if (!envoi.expediteur?.identite) {
    throw new ErreurRemise("EXPEDITEUR_ABSENT", envoi.envoi, true);
  }
  // Ceinture et bretelles santé : la règle vit dans le socle (verrou SANTE_FOURNISSEUR
  // avant confier_envoi) ; si un envoi de santé arrive quand même vers un fournisseur
  // non HDS, on refuse définitivement, jamais de repli. No-op tant que commencer_envoi
  // n'expose pas donnees_sante. fournisseur_hds est jugé sur envoi.fournisseur : s'il
  // nomme un autre fournisseur que Brevo (verrou et envoi divergents), son agrément ne
  // couvre pas ce que l'ouvrier ferait réellement, on refuse aussi.
  // Seule exception (lot 19ah, Tiroma) : un essai sur données de santé FICTIVES, qui part à
  // l'adresse d'essai. Il exige mode = 'essai' ET donnees_fictives = true, tous deux rendus
  // par commencer_envoi ; il n'exempte que l'agrément HDS, jamais la cohérence du fournisseur.
  // En réel, refus toujours.
  const essaiFictif = envoi.mode === "essai" && envoi.donnees_fictives === true;
  if (
    envoi.donnees_sante === true &&
    (!FOURNISSEURS_REMIS.has(envoi.fournisseur) ||
      (envoi.fournisseur_hds !== true && !essaiFictif))
  ) {
    throw new ErreurRemise(
      "SANTE_FOURNISSEUR_NON_HDS",
      `envoi de santé vers ${envoi.fournisseur} (hds = ${
        String(envoi.fournisseur_hds ?? null)
      })`,
      true,
    );
  }

  if (envoi.canal === "whatsapp") return await remettreWhatsApp(envoi, deps);
  if (envoi.canal === "lre") return await remettreLre(envoi, deps);
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
  const secret = await secretCoffre(envoi, deps, "BREVO_API_KEY");
  if (secret) return secret;
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

/** Secret du coffre quand l'expéditeur en a un ; null (et un journal) s'il n'y en a pas. */
async function secretCoffre(
  envoi: EnvoiAEnvoyer,
  deps: Dependances,
  repli: string,
): Promise<string | null> {
  if (!envoi.expediteur.secret) return null;
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
    `secret_expediteur n'a rien rendu, repli sur ${repli}`,
    { envoi: envoi.envoi },
  );
  return null;
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
    "ENVOI ACCEPTÉ PAR BREVO MAIS NON CONFIRMÉ : rapprochement déposé",
    { envoi, reference },
  );
  return false;
}

/**
 * Rapprochement : Brevo a accepté mais confirmer_envoi est tombée trois fois. On ne
 * ré-émet jamais ; on dépose un travail envois.confirmer {envoi, reference}, clé
 * confirmer:<envoi>, que ce même ouvrier reprend au passage suivant (bien avant la fin
 * du bail de l'envoi) pour rejouer confirmer_envoi. Rend l'id du travail, ou null si
 * le dépôt est impossible (client inconnu, porte en panne) : il reste alors le journal.
 */
async function deposerRapprochement(
  travail: Travail,
  envoi: string,
  reference: string,
  deps: Dependances,
): Promise<number | null> {
  const client = typeof travail.client_id === "string"
    ? travail.client_id
    : null;
  if (!client) {
    deps.journal.erreur(
      "RAPPROCHEMENT IMPOSSIBLE : le travail ne porte pas de client_id, confirmer_envoi à rejouer à la main",
      { travail: travail.id, envoi, reference },
    );
    return null;
  }
  try {
    const id = await deps.portes.deposerTravail(
      client,
      MODULE,
      GENRE_CONFIRMATION,
      { envoi, reference },
      `confirmer:${envoi}`,
      1,
    );
    deps.journal.info("travail de rapprochement déposé", {
      travail: id,
      envoi,
      reference,
    });
    return id;
  } catch (e) {
    deps.journal.erreur(
      "RAPPROCHEMENT IMPOSSIBLE : deposer_travail a échoué, confirmer_envoi à rejouer à la main",
      {
        travail: travail.id,
        envoi,
        reference,
        erreur: String(e).slice(0, 300),
      },
    );
    return null;
  }
}

/** Travail envois.confirmer : rejoue confirmer_envoi(envoi, reference). Repris tant que la porte tombe. */
async function traiterConfirmation(
  travail: Travail,
  envoi: string,
  deps: Dependances,
): Promise<Issue> {
  const { portes, journal } = deps;
  const reference = typeof travail.charge?.reference === "string"
    ? travail.charge.reference.trim()
    : "";
  if (!reference) {
    const erreur = `CHARGE_INVALIDE : rapprochement sans reference : ${
      JSON.stringify(travail.charge)
    }`;
    journal.erreur("rapprochement en échec définitif", {
      travail: travail.id,
      envoi,
      erreur,
    });
    await sansLever(
      () => portes.echouerTravail(travail.id, erreur, false),
      journal,
      "echouer_travail",
      travail.id,
    );
    return { sortie: "echec", travail: travail.id, envoi, erreur };
  }
  try {
    await portes.confirmerEnvoi(envoi, reference);
  } catch (e) {
    const erreur = `CONFIRMATION_EN_ATTENTE : ${String(e).slice(0, 300)}`;
    journal.erreur("rapprochement reporté, confirmer_envoi tombe encore", {
      travail: travail.id,
      envoi,
      reference,
      erreur,
    });
    await sansLever(
      () => portes.echouerTravail(travail.id, erreur, true),
      journal,
      "echouer_travail",
      travail.id,
    );
    return { sortie: "reporte", travail: travail.id, envoi, erreur };
  }
  await sansLever(
    () =>
      portes.finirTravail(travail.id, {
        confirme: true,
        fournisseur_id: reference,
      }),
    journal,
    "finir_travail",
    travail.id,
  );
  journal.info("rapprochement : envoi confirmé", {
    travail: travail.id,
    envoi,
    reference,
  });
  return {
    sortie: "confirme",
    travail: travail.id,
    envoi,
    fournisseur_id: reference,
  };
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
  if (e instanceof ErreurMeta) {
    return {
      message: `META_${e.statut}${e.code !== null ? `_${e.code}` : ""} : ${
        e.corps.slice(0, 500)
      }`,
      definitive: e.definitif,
    };
  }
  if (e instanceof ErreurAr24) {
    return {
      message: `AR24_${e.statut} : ${e.corps.slice(0, 500)}`,
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

/** Jeton Meta : coffre (secret de l'expéditeur) sinon META_ACCESS_TOKEN. */
async function remettreWhatsApp(
  envoi: EnvoiAEnvoyer,
  deps: Dependances,
): Promise<string> {
  const phoneNumberId = texteParametre(
    envoi.expediteur.parametres,
    "phone_number_id",
  );
  if (!phoneNumberId) {
    throw new ErreurRemise("PHONE_NUMBER_ID_ABSENT", envoi.envoi, true);
  }
  const jeton = (await secretCoffre(envoi, deps, "META_ACCESS_TOKEN")) ??
    deps.jetonMeta ?? null;
  if (!jeton || !deps.whatsappPour) {
    deps.journal.erreur(
      "META_ACCESS_TOKEN absent : WhatsApp non branché, envoi reporté",
      { envoi: envoi.envoi, mode: envoi.mode },
    );
    throw new ErreurRemise(
      "FOURNISSEUR_NON_BRANCHE",
      "aucun jeton Meta : ni coffre, ni META_ACCESS_TOKEN",
      false,
    );
  }
  if (envoi.pieces.length > 1) {
    throw new ErreurRemise(
      "PIECES_WHATSAPP",
      `${envoi.pieces.length} pièces : WhatsApp n'en porte qu'une par message`,
      true,
    );
  }
  const client = deps.whatsappPour(jeton, phoneNumberId);
  let piece: { id: string; nom: string } | null = null;
  for (const p of envoi.pieces) {
    piece = {
      id: await client.televerser(
        await lirePiece(deps.stockage, p),
        p.mime,
        p.nom,
      ),
      nom: p.nom,
    };
  }
  const message = composerWhatsApp(envoi, piece);
  if (!/^\d{8,15}$/.test(message.to)) {
    throw new ErreurRemise("NUMERO_INVALIDE", envoi.destinataire.adresse, true);
  }
  return await client.envoyer(message);
}

/**
 * Un modèle (modele_externe = nom du modèle approuvé par Meta) quand l'envoi en porte un : c'est la
 * seule forme qui part hors de la fenêtre de 24 h. parametres_modele.components est passé tel quel ;
 * à défaut, parametres_modele.corps (liste de textes) remplit {{1}}, {{2}}… du corps. Sans modèle : un
 * texte libre, ou la pièce avec le texte en légende.
 */
/**
 * modele_externe d'un gabarit : « nom » ou « nom@langue Meta » (hello_world@en_US). La langue d'un gabarit
 * du socle n'a que deux lettres ; Meta distingue en, en_US, pt_BR… : le suffixe la donne exactement.
 */
export function lireModeleExterne(
  modele: string,
): { nom: string; langue: string | null } {
  const m = modele.trim().match(/^([a-z0-9_]+)@([a-z]{2,3}(?:_[A-Z]{2})?)$/);
  return m ? { nom: m[1], langue: m[2] } : { nom: modele.trim(), langue: null };
}

export function composerWhatsApp(
  envoi: EnvoiAEnvoyer,
  piece: { id: string; nom: string } | null,
): MessageWhatsApp {
  const to = normaliserNumeroSms(envoi.destinataire.adresse);
  if (envoi.modele_externe) {
    const { nom, langue } = lireModeleExterne(envoi.modele_externe);
    const brut: unknown = envoi.parametres_modele ?? {};
    // rendre_gabarit rend une liste de valeurs ({{1}}, {{2}}…) ; à défaut, un objet corps / components.
    const p = (Array.isArray(brut) ? { corps: brut } : brut) as Record<
      string,
      unknown
    >;
    let components: Record<string, unknown>[] = [];
    if (Array.isArray(p.components)) {
      components = p.components as Record<string, unknown>[];
    } else if (Array.isArray(p.corps) && p.corps.length) {
      components = [{
        type: "body",
        parameters: p.corps.map((t) => ({ type: "text", text: String(t) })),
      }];
    }
    if (piece && !components.some((c) => c.type === "header")) {
      components = [{
        type: "header",
        parameters: [{
          type: "document",
          document: { id: piece.id, filename: piece.nom },
        }],
      }, ...components];
    }
    return {
      to,
      type: "template",
      template: {
        name: nom,
        language: {
          code: langue ?? envoi.langue ?? envoi.destinataire.langue ?? "fr",
        },
        ...(components.length ? { components } : {}),
      },
    };
  }
  if (piece) {
    if (envoi.corps.length > 1024) {
      throw new ErreurRemise(
        "TEXTE_TROP_LONG",
        `légende de ${envoi.corps.length} caractères (WhatsApp : 1024 au plus avec une pièce)`,
        true,
      );
    }
    return {
      to,
      type: "document",
      document: {
        id: piece.id,
        filename: piece.nom,
        ...(envoi.corps ? { caption: envoi.corps } : {}),
      },
    };
  }
  if (!envoi.corps || envoi.corps.length > 4096) {
    throw new ErreurRemise(
      "TEXTE_TROP_LONG",
      `texte de ${envoi.corps.length} caractères (WhatsApp : 1 à 4096)`,
      true,
    );
  }
  return { to, type: "text", text: { body: envoi.corps, preview_url: false } };
}

/**
 * Accès AR24 : coffre (JSON {"token", "cle_privee"}) sinon AR24_TOKEN + AR24_CLE_PRIVEE.
 * L'identifiant de l'expéditeur chez AR24 est expediteur.parametres.id_utilisateur (exigé par
 * preparer_expediteur). La référence de l'envoi est l'id de la LRE chez AR24.
 */
async function remettreLre(
  envoi: EnvoiAEnvoyer,
  deps: Dependances,
): Promise<string> {
  const idUser = texteParametre(envoi.expediteur.parametres, "id_utilisateur");
  if (!idUser) {
    throw new ErreurRemise("ID_UTILISATEUR_ABSENT", envoi.envoi, true);
  }
  let acces = deps.accesAr24 ?? null;
  const secret = await secretCoffre(envoi, deps, "AR24_TOKEN");
  if (secret) {
    try {
      const o = JSON.parse(secret);
      if (typeof o.token === "string" && typeof o.cle_privee === "string") {
        acces = { token: o.token, clePrivee: o.cle_privee };
      } else throw new Error("token ou cle_privee manquant");
    } catch (e) {
      throw new ErreurRemise(
        "SECRET_ILLISIBLE",
        `secret AR24 attendu en JSON {"token","cle_privee"} : ${
          String(e).slice(0, 100)
        }`,
        false,
      );
    }
  }
  if (!acces || !deps.ar24Pour) {
    deps.journal.erreur(
      "AR24_TOKEN / AR24_CLE_PRIVEE absents : AR24 non branché, envoi reporté",
      { envoi: envoi.envoi, mode: envoi.mode },
    );
    throw new ErreurRemise(
      "FOURNISSEUR_NON_BRANCHE",
      "aucun accès AR24 : ni coffre, ni AR24_TOKEN + AR24_CLE_PRIVEE",
      false,
    );
  }
  const client = deps.ar24Pour(acces);
  const pieces: string[] = [];
  for (const p of envoi.pieces) {
    pieces.push(
      await client.televerser(
        idUser,
        p.nom,
        await lirePiece(deps.stockage, p),
        p.mime,
      ),
    );
  }
  const remise = await client.envoyer(
    composerLre(envoi, idUser, pieces, deps.webhookAr24 ?? null),
  );
  return remise.id;
}

/**
 * Destinataire professionnel → to_company = son nom ; particulier → prénom = premier mot du nom,
 * nom = le reste (ou le nom entier s'il n'a qu'un mot). eIDAS si expediteur.parametres.eidas.
 */
export function composerLre(
  envoi: EnvoiAEnvoyer,
  idUser: string,
  pieces: string[],
  webhook: string | null = null,
): MailAr24 {
  const d = envoi.destinataire;
  const nom = (d.nom ?? "").trim();
  if (!nom) {
    throw new ErreurRemise(
      "DESTINATAIRE_SANS_NOM",
      "une LRE exige le nom du destinataire",
      true,
    );
  }
  const eidas = envoi.expediteur.parametres.eidas;
  const mail: MailAr24 = {
    id_user: idUser,
    to_email: d.adresse,
    dest_statut: d.professionnel ? "professionnel" : "particulier",
    content: envoi.corps,
    eidas: eidas === true || eidas === 1 || eidas === "1" ? "1" : "0",
    ref_client: envoi.cle,
    pieces,
  };
  if (d.professionnel) mail.to_company = nom;
  else {
    const i = nom.indexOf(" ");
    if (i > 0) {
      mail.to_firstname = nom.slice(0, i);
      mail.to_lastname = nom.slice(i + 1).trim();
    } else mail.to_lastname = nom;
  }
  if (envoi.objet?.id) mail.ref_dossier = envoi.objet.id.slice(0, 100);
  if (webhook) mail.webhook = webhook;
  return mail;
}

function texteParametre(
  parametres: Record<string, unknown> | null | undefined,
  cle: string,
): string | null {
  const v = parametres?.[cle];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

async function lirePiece(
  stockage: Stockage,
  piece: EnvoiAEnvoyer["pieces"][number],
): Promise<Uint8Array> {
  try {
    return await stockage.lirePiece(piece);
  } catch (e) {
    throw new ErreurRemise("PIECE_ILLISIBLE", String(e).slice(0, 300), false);
  }
}
