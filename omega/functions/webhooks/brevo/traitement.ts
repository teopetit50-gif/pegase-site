// Webhook Brevo : reçoit les événements de remise (e-mail transactionnel et SMS),
// vérifie le jeton, traduit chaque événement dans le vocabulaire du socle et le
// note par la porte noter_remise, idempotente sur la clé "brevo:<canal>:<id>:<event>:<horodatage>".
//
// Aucun suivi d'ouverture ni de clic : les événements opened, unique_opened, click,
// loaded_by_proxy sont ignorés avant même d'atteindre la porte (interdit par le socle).
//
// Brevo n'a pas de signature HMAC : l'authentification repose sur le jeton bearer que
// Brevo envoie (champ `auth` à la création du webhook, ou en-tête personnalisé
// X-Omega-Jeton). Le jeton attendu est BREVO_WEBHOOK_JETON.

import type { DetailRemise, EvenementRemise, Portes } from "./portes.ts";

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** BREVO_WEBHOOK_JETON ; null → 503, rien n'est accepté. */
  jeton: string | null;
  journal: Journal;
};

/** Événement Brevo (e-mail ou SMS) lu dans le corps du webhook. */
export type EvenementBrevo = {
  canal: "email" | "sms";
  fournisseur: "brevo" | "brevo_sms";
  /** Nom brut de l'événement chez Brevo (event ou msg_status). */
  brut: string;
  /** Références candidates pour retrouver l'envoi, dans l'ordre d'essai. */
  references: string[];
  evenement: EvenementRemise | null;
  detail: DetailRemise;
  survenuLe: string | null;
  cle: string;
  /** Tag envoi:<uuid> posé par l'expéditeur, pour le journal. */
  envoi: string | null;
};

const IGNORES = new Set([
  "opened",
  "unique_opened",
  "uniqueopened",
  "click",
  "clicks",
  "loaded_by_proxy",
  "loadedbyproxy",
  "proxy_open",
  "request",
  "sent",
  "accepted",
  "reply",
  "contact_updated",
  "contact_deleted",
  "list_addition",
  "inbound_email_processed",
]);

const TRADUCTION: Record<string, EvenementRemise> = {
  delivered: "remis",
  hard_bounce: "rebond",
  hardbounce: "rebond",
  soft_bounce: "rebond_temporaire",
  softbounce: "rebond_temporaire",
  deferred: "rebond_temporaire",
  blocked: "refuse",
  invalid_email: "refuse",
  invalid: "refuse",
  error: "refuse",
  spam: "plainte",
  complaint: "plainte",
  unsubscribed: "plainte",
  unsubscribe: "plainte",
};

export function traduire(brut: string): EvenementRemise | null {
  const n = brut.trim().toLowerCase();
  if (IGNORES.has(n)) return null;
  return TRADUCTION[n] ?? null;
}

type Objet = Record<string, unknown>;

function texte(o: Objet, ...cles: string[]): string | null {
  for (const c of cles) {
    const v = o[c];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function tagEnvoi(o: Objet): string | null {
  const candidats: string[] = [];
  if (Array.isArray(o.tags)) {
    for (const t of o.tags) if (typeof t === "string") candidats.push(t);
  }
  const tag = texte(o, "tag", "X-Mailin-custom", "x-mailin-custom");
  if (tag) candidats.push(tag);
  for (const c of candidats) {
    const m = /^envoi:([0-9a-f-]{36})$/i.exec(c);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/** Horodatage ISO depuis ts_event (s), ts_epoch (ms) ou date « AAAA-MM-JJ HH:MM:SS ». */
export function horodatage(o: Objet): string | null {
  const tsEvent = o.ts_event ?? o.ts;
  if (typeof tsEvent === "number" && tsEvent > 1e9) {
    return new Date(tsEvent * 1000).toISOString();
  }
  const tsEpoch = o.ts_epoch;
  if (typeof tsEpoch === "number" && tsEpoch > 1e12) {
    return new Date(tsEpoch).toISOString();
  }
  const date = texte(o, "date");
  if (date) {
    const d = new Date(
      date.includes("T") ? date : date.replace(" ", "T") +
        (/[zZ]|[+-]\d\d:?\d\d$/.test(date) ? "" : "Z"),
    );
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/** Lit un objet du corps : e-mail (champ event) ou SMS (champ msg_status). */
export function lireEvenement(o: Objet): EvenementBrevo | null {
  const statutSms = texte(o, "msg_status");
  const evenementEmail = texte(o, "event");
  const brut = statutSms ?? evenementEmail;
  if (!brut) return null;
  const canal: "email" | "sms" = statutSms ? "sms" : "email";
  const survenuLe = horodatage(o);

  const references: string[] = [];
  if (canal === "email") {
    const mid = texte(o, "message-id", "messageId", "message_id");
    if (mid) references.push(mid);
  } else {
    const mid = texte(o, "messageId", "message_id", "message-id");
    const ref = texte(o, "reference");
    if (mid) references.push(mid);
    if (ref && ref !== mid) references.push(ref);
  }
  const envoi = tagEnvoi(o);
  const identifiant = references[0] ?? texte(o, "id") ?? "sans-id";
  const raison = texte(o, "reason", "description", "bounce_type", "error") ??
    "";
  return {
    canal,
    fournisseur: canal === "sms" ? "brevo_sms" : "brevo",
    brut,
    references,
    evenement: traduire(brut),
    detail: { code: brut.slice(0, 100), raison: raison.slice(0, 300) },
    survenuLe,
    cle: `brevo:${canal}:${identifiant}:${brut.toLowerCase()}:${
      survenuLe ?? "sans-date"
    }`,
    envoi,
  };
}

export function lireCorps(corps: unknown): EvenementBrevo[] {
  const objets: unknown[] = Array.isArray(corps)
    ? corps
    : corps && typeof corps === "object" &&
        Array.isArray((corps as Objet).events)
    ? (corps as Objet).events as unknown[]
    : [corps];
  const lus: EvenementBrevo[] = [];
  for (const o of objets) {
    if (!o || typeof o !== "object") continue;
    const e = lireEvenement(o as Objet);
    if (e) lus.push(e);
  }
  return lus;
}

/** Comparaison en temps constant de deux chaînes. */
export function memeSecret(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

export function jetonRecu(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth && /^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, "").trim();
  }
  const perso = req.headers.get("x-omega-jeton");
  if (perso) return perso.trim();
  return null;
}

export type Bilan = {
  recus: number;
  notes: number;
  ignores: number;
  inconnus: number;
  erreurs: number;
};

export async function traiterRequete(
  req: Request,
  deps: Dependances,
): Promise<Response> {
  if (req.method !== "POST") {
    return reponse(405, { erreur: "méthode non autorisée" });
  }
  if (!deps.jeton) {
    deps.journal.erreur(
      "BREVO_WEBHOOK_JETON absent : webhook refusé tant qu'il n'est pas posé",
    );
    return reponse(503, { erreur: "webhook non configuré" });
  }
  const recu = jetonRecu(req);
  if (!recu || !memeSecret(recu, deps.jeton)) {
    deps.journal.erreur("jeton de webhook invalide ou absent");
    return reponse(401, { erreur: "jeton invalide" });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return reponse(400, { erreur: "corps JSON illisible" });
  }
  const evenements = lireCorps(corps);
  const bilan = await noterTout(evenements, deps);
  // 500 si une porte est tombée : Brevo rejouera, et la clé rend le rejeu inoffensif.
  return reponse(bilan.erreurs > 0 ? 500 : 200, bilan);
}

export async function noterTout(
  evenements: EvenementBrevo[],
  deps: Dependances,
): Promise<Bilan> {
  const bilan: Bilan = {
    recus: evenements.length,
    notes: 0,
    ignores: 0,
    inconnus: 0,
    erreurs: 0,
  };
  for (const e of evenements) {
    if (!e.evenement) {
      bilan.ignores++;
      continue;
    }
    if (e.references.length === 0) {
      deps.journal.erreur("événement Brevo sans référence de message", {
        brut: e.brut,
        canal: e.canal,
        envoi: e.envoi,
      });
      bilan.inconnus++;
      continue;
    }
    try {
      let trouve = false;
      for (const reference of e.references) {
        trouve = await deps.portes.noterRemise(
          e.fournisseur,
          reference,
          e.evenement,
          e.detail,
          e.survenuLe,
          e.cle,
        );
        if (trouve) break;
      }
      if (trouve) {
        bilan.notes++;
        deps.journal.info("remise notée", {
          canal: e.canal,
          evenement: e.evenement,
          brut: e.brut,
          reference: e.references[0],
          envoi: e.envoi,
        });
      } else {
        bilan.inconnus++;
        deps.journal.info("aucun envoi pour cette référence (ou déjà noté)", {
          canal: e.canal,
          brut: e.brut,
          references: e.references,
          envoi: e.envoi,
        });
      }
    } catch (err) {
      bilan.erreurs++;
      deps.journal.erreur("noter_remise a échoué", {
        cle: e.cle,
        erreur: String(err).slice(0, 300),
      });
    }
  }
  return bilan;
}

function reponse(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}
