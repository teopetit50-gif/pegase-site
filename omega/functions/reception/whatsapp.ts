// (b) Messages WhatsApp Cloud API (Meta).
//   GET  : vérification du webhook (hub.mode, hub.verify_token, hub.challenge).
//   POST : signature X-Hub-Signature-256 = sha256=HMAC(META_APP_SECRET, corps brut), vérifiée
//          en temps constant ; accusé 200 IMMÉDIAT, traitement après la réponse (waitUntil).
// Les statuts de remise (value.statuses) concernent nos envois sortants : ignorés ici,
// l'envoi WhatsApp n'est pas dans le périmètre de cet ouvrier.

import type { Portes, Reception } from "./portes.ts";
import {
  hmacSha256Hex,
  type Issue,
  type Journal,
  memeSecret,
  type PieceADeposer,
  recevoir,
  reponseJson,
  type Stockage,
} from "./commun.ts";

/** Accès aux médias par l'API Graph : GET /{media_id} → url, puis GET url. */
export interface Graph {
  media(
    id: string,
  ): Promise<
    { url: string; mime_type: string | null; file_size: number | null } | null
  >;
  telecharger(url: string): Promise<Uint8Array<ArrayBuffer>>;
}

export function graphMeta(
  jeton: string,
  fetchImpl: typeof fetch = fetch,
  version = "v21.0",
): Graph {
  const auth = { Authorization: `Bearer ${jeton}` };
  return {
    async media(id) {
      const r = await fetchImpl(
        `https://graph.facebook.com/${version}/${encodeURIComponent(id)}`,
        { headers: auth },
      );
      if (!r.ok) {
        throw new Error(
          `média ${id} : HTTP ${r.status} ${(await r.text()).slice(0, 200)}`,
        );
      }
      const o = await r.json() as Record<string, unknown>;
      if (typeof o.url !== "string") return null;
      return {
        url: o.url,
        mime_type: typeof o.mime_type === "string" ? o.mime_type : null,
        file_size: typeof o.file_size === "number" ? o.file_size : null,
      };
    },
    async telecharger(url) {
      const r = await fetchImpl(url, { headers: auth });
      if (!r.ok) throw new Error(`téléchargement média : HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}

export type Dependances = {
  portes: Portes;
  stockage: Stockage;
  journal: Journal;
  /** META_VERIFY_TOKEN : jeton de vérification choisi par nous, saisi dans l'app Meta. */
  jetonVerification: string | null;
  /** META_APP_SECRET : secret de l'app, pour X-Hub-Signature-256. */
  secretApp: string | null;
  /** null tant que META_ACCESS_TOKEN n'est pas posé : les médias sont ignorés, le message est reçu. */
  graph: Graph | null;
  maintenant?: () => Date;
};

type Objet = Record<string, unknown>;

export type MessageWhatsApp = {
  phoneNumberId: string;
  numeroAffiche: string | null;
  wamid: string;
  de: string;
  deNom: string | null;
  type: string;
  corps: string;
  recuLe: string;
  media: {
    id: string;
    typeMime: string | null;
    nom: string | null;
    sha256: string | null;
  } | null;
  contexte: { wamid: string | null; de: string | null } | null;
};

function texte(o: unknown, cle: string): string | null {
  if (!o || typeof o !== "object") return null;
  const v = (o as Objet)[cle];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/** Extrait les messages (pas les statuts) d'une notification Meta. */
export function lireNotification(
  corps: unknown,
  maintenant: Date,
): MessageWhatsApp[] {
  const messages: MessageWhatsApp[] = [];
  if (!corps || typeof corps !== "object") return messages;
  const entries = Array.isArray((corps as Objet).entry)
    ? (corps as Objet).entry as Objet[]
    : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes)
      ? entry.changes as Objet[]
      : [];
    for (const change of changes) {
      const value = (change.value ?? {}) as Objet;
      const phoneNumberId = texte(value.metadata, "phone_number_id");
      if (!phoneNumberId) continue;
      const numeroAffiche = texte(value.metadata, "display_phone_number");
      const contacts = Array.isArray(value.contacts)
        ? value.contacts as Objet[]
        : [];
      const noms = new Map<string, string>();
      for (const c of contacts) {
        const waId = texte(c, "wa_id");
        const nom = texte(c.profile, "name");
        if (waId && nom) noms.set(waId, nom);
      }
      const liste = Array.isArray(value.messages)
        ? value.messages as Objet[]
        : [];
      for (const m of liste) {
        const wamid = texte(m, "id");
        const de = texte(m, "from");
        if (!wamid || !de) continue;
        const type = texte(m, "type") ?? "inconnu";
        const ts = Number(m.timestamp);
        const recuLe = Number.isFinite(ts) && ts > 1e9
          ? new Date(ts * 1000).toISOString()
          : maintenant.toISOString();
        const { corps, media } = lireContenu(type, m);
        const ctx = m.context && typeof m.context === "object"
          ? m.context as Objet
          : null;
        messages.push({
          phoneNumberId,
          numeroAffiche,
          wamid,
          de,
          deNom: noms.get(de) ?? null,
          type,
          corps,
          recuLe,
          media,
          contexte: ctx
            ? { wamid: texte(ctx, "id"), de: texte(ctx, "from") }
            : null,
        });
      }
    }
  }
  return messages;
}

function lireContenu(
  type: string,
  m: Objet,
): { corps: string; media: MessageWhatsApp["media"] } {
  const charge = (m[type] ?? {}) as Objet;
  const legende = texte(charge, "caption");
  switch (type) {
    case "text":
      return { corps: texte(charge, "body") ?? "", media: null };
    case "image":
    case "document":
    case "audio":
    case "video":
    case "sticker": {
      const id = texte(charge, "id");
      return {
        corps: legende ?? "",
        media: id
          ? {
            id,
            typeMime: texte(charge, "mime_type"),
            nom: texte(charge, "filename"),
            sha256: texte(charge, "sha256"),
          }
          : null,
      };
    }
    case "location": {
      const lat = charge.latitude, lon = charge.longitude;
      const nom = [texte(charge, "name"), texte(charge, "address")].filter(
        Boolean,
      ).join(", ");
      return {
        corps: `Position : ${lat}, ${lon}${nom ? ` (${nom})` : ""}`,
        media: null,
      };
    }
    case "button":
      return { corps: texte(charge, "text") ?? "", media: null };
    case "interactive": {
      const rep = (charge.button_reply ?? charge.list_reply ?? {}) as Objet;
      return {
        corps: texte(rep, "title") ?? texte(rep, "id") ?? "",
        media: null,
      };
    }
    case "reaction":
      return { corps: texte(charge, "emoji") ?? "", media: null };
    case "contacts":
      return { corps: "[contact partagé]", media: null };
    default:
      return { corps: `[${type}]`, media: null };
  }
}

export async function verifierSignature(
  req: Request,
  corpsBrut: Uint8Array<ArrayBuffer>,
  secretApp: string,
): Promise<boolean> {
  const entete = req.headers.get("x-hub-signature-256") ?? "";
  if (!entete.startsWith("sha256=")) return false;
  const attendu = await hmacSha256Hex(secretApp, corpsBrut);
  return memeSecret(entete.slice("sha256=".length).toLowerCase(), attendu);
}

/**
 * Traite une requête Meta. Rend la réponse à renvoyer tout de suite et, pour un POST
 * valide, la promesse du traitement à confier à EdgeRuntime.waitUntil.
 */
export async function traiterWhatsApp(
  req: Request,
  deps: Dependances,
): Promise<{ reponse: Response; traitement: Promise<Issue[]> | null }> {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const jeton = url.searchParams.get("hub.verify_token") ?? "";
    const challenge = url.searchParams.get("hub.challenge") ?? "";
    if (
      mode === "subscribe" && deps.jetonVerification &&
      memeSecret(jeton, deps.jetonVerification) && challenge
    ) {
      return {
        reponse: new Response(challenge, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }),
        traitement: null,
      };
    }
    return {
      reponse: reponseJson(403, { erreur: "vérification refusée" }),
      traitement: null,
    };
  }
  if (req.method !== "POST") {
    return {
      reponse: reponseJson(405, { erreur: "méthode non autorisée" }),
      traitement: null,
    };
  }
  if (!deps.secretApp) {
    deps.journal.erreur(
      "META_APP_SECRET absent : notification refusée tant qu'il n'est pas posé",
    );
    return {
      reponse: reponseJson(503, { erreur: "webhook non configuré" }),
      traitement: null,
    };
  }
  const brut = new Uint8Array(await req.arrayBuffer());
  if (!(await verifierSignature(req, brut, deps.secretApp))) {
    deps.journal.erreur("signature X-Hub-Signature-256 invalide");
    return {
      reponse: reponseJson(401, { erreur: "signature invalide" }),
      traitement: null,
    };
  }
  let corps: unknown;
  try {
    corps = JSON.parse(new TextDecoder().decode(brut));
  } catch {
    return {
      reponse: reponseJson(400, { erreur: "corps JSON illisible" }),
      traitement: null,
    };
  }
  const messages = lireNotification(corps, deps.maintenant?.() ?? new Date());
  // Accusé immédiat : Meta coupe à 20 s et rejoue sinon. Le traitement suit la réponse.
  const traitement = (async () => {
    const issues: Issue[] = [];
    for (const m of messages) issues.push(await recevoirMessage(m, deps));
    return issues;
  })();
  return { reponse: reponseJson(200, { recus: messages.length }), traitement };
}

export async function recevoirMessage(
  m: MessageWhatsApp,
  deps: Dependances,
): Promise<Issue> {
  const pieces: PieceADeposer[] = [];
  let mediaIgnore: string | null = null;
  if (m.media) {
    if (!deps.graph) {
      mediaIgnore = m.media.id;
      deps.journal.erreur("META_ACCESS_TOKEN absent : média ignoré", {
        wamid: m.wamid,
        media: m.media.id,
      });
    } else {
      try {
        const info = await deps.graph.media(m.media.id);
        if (info) {
          const octets = await deps.graph.telecharger(info.url);
          const typeMime = info.mime_type ?? m.media.typeMime ??
            "application/octet-stream";
          pieces.push({
            nom: m.media.nom ?? nomParDefaut(m.type, typeMime),
            typeMime,
            octets,
          });
        }
      } catch (e) {
        deps.journal.erreur("média WhatsApp non téléchargé", {
          wamid: m.wamid,
          media: m.media.id,
          erreur: String(e).slice(0, 200),
        });
        return {
          identifiant: m.wamid,
          sortie: "erreur",
          erreur: `MEDIA_ILLISIBLE : ${m.media.id}`,
        };
      }
    }
  }
  return recevoir(
    deps,
    "whatsapp",
    [m.phoneNumberId],
    m.wamid,
    pieces,
    (client, boite, deposees): Reception => ({
      client,
      canal: "whatsapp",
      boite,
      identifiant: m.wamid,
      de: m.de,
      deNom: m.deNom,
      sujet: null,
      corps: m.corps,
      corpsHtml: null,
      pieces: deposees,
      detail: {
        source: "meta_whatsapp",
        type: m.type,
        numero_affiche: m.numeroAffiche,
        contexte: m.contexte,
        media: m.media
          ? {
            id: m.media.id,
            sha256: m.media.sha256,
            ignore: mediaIgnore !== null,
          }
          : null,
        en_reponse_a: m.contexte?.wamid ?? null,
        fil: m.de,
      },
      recuLe: m.recuLe,
    }),
  );
}

function nomParDefaut(type: string, typeMime: string): string {
  const ext = typeMime.split("/")[1]?.split(";")[0] ?? "bin";
  return `${type}.${ext === "jpeg" ? "jpg" : ext}`;
}
