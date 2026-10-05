// (a) E-mail entrant Brevo (inbound parsing). Brevo poste {"items": [...]} avec un
// jeton bearer (champ `auth` du webhook, pas de HMAC chez Brevo). Chaque item devient
// une réception ; les pièces sont téléchargées chez Brevo par leur DownloadToken et
// déposées dans le bucket omega-clients avant l'appel à deposer_reception.

import type { Portes, Reception } from "./portes.ts";
import {
  type Issue,
  type Journal,
  memeSecret,
  normaliserAdresse,
  type PieceADeposer,
  recevoir,
  reponseJson,
  type Stockage,
} from "./commun.ts";

/** Téléchargement des pièces entrantes chez Brevo (GET /v3/inbound/attachments/{token}). */
export interface PiecesBrevo {
  telecharger(token: string): Promise<Uint8Array<ArrayBuffer>>;
}

export function piecesBrevo(
  cleApi: string,
  fetchImpl: typeof fetch = fetch,
  base = "https://api.brevo.com/v3",
): PiecesBrevo {
  return {
    async telecharger(token) {
      const r = await fetchImpl(
        `${base}/inbound/attachments/${encodeURIComponent(token)}`,
        {
          headers: { "api-key": cleApi, Accept: "*/*" },
        },
      );
      if (!r.ok) {
        throw new Error(
          `pièce Brevo illisible : HTTP ${r.status} ${
            (await r.text()).slice(0, 200)
          }`,
        );
      }
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}

export type Dependances = {
  portes: Portes;
  stockage: Stockage;
  journal: Journal;
  /** BREVO_WEBHOOK_JETON ; null → 503. */
  jeton: string | null;
  /** null tant que BREVO_API_KEY n'est pas posée : les pièces sont alors ignorées, le message est quand même reçu. */
  pieces: PiecesBrevo | null;
  maintenant?: () => Date;
};

type Objet = Record<string, unknown>;
type Adresse = { Name?: string; Address?: string };

function adresses(v: unknown): { nom: string | null; adresse: string }[] {
  const liste = Array.isArray(v) ? v : v ? [v] : [];
  const out: { nom: string | null; adresse: string }[] = [];
  for (const a of liste as Adresse[]) {
    if (a && typeof a.Address === "string" && a.Address.includes("@")) {
      out.push({
        nom: typeof a.Name === "string" && a.Name.trim() ? a.Name.trim() : null,
        adresse: normaliserAdresse(a.Address),
      });
    }
  }
  return out;
}

function texte(o: Objet, cle: string): string | null {
  const v = o[cle];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

export type MessageEntrant = {
  identifiant: string;
  messageId: string | null;
  inReplyTo: string | null;
  de: { nom: string | null; adresse: string } | null;
  a: { nom: string | null; adresse: string }[];
  cc: { nom: string | null; adresse: string }[];
  sujet: string | null;
  corps: string;
  corpsHtml: string | null;
  recuLe: string;
  spam: number | null;
  pieces: {
    nom: string;
    typeMime: string;
    taille: number | null;
    token: string;
  }[];
  references: string[];
};

/** Lit un item Brevo. null si l'item est vide. */
export function lireItem(o: Objet, maintenant: Date): MessageEntrant | null {
  const messageId = texte(o, "MessageId");
  const uuid = Array.isArray(o.Uuid) && typeof o.Uuid[0] === "string"
    ? o.Uuid[0]
    : null;
  const identifiant = messageId ?? uuid;
  if (!identifiant) return null;
  const de = adresses(o.From)[0] ?? null;
  const date = texte(o, "SentAtDate");
  const d = date ? new Date(date) : null;
  const recuLe = d && !Number.isNaN(d.getTime())
    ? d.toISOString()
    : maintenant.toISOString();
  const pieces = (Array.isArray(o.Attachments) ? o.Attachments : []) as Objet[];
  const entetes =
    (o.Headers && typeof o.Headers === "object" ? o.Headers : {}) as Objet;
  const refs = texte(entetes, "References") ?? texte(o, "References");
  return {
    identifiant,
    messageId,
    inReplyTo: texte(o, "InReplyTo") ?? texte(entetes, "In-Reply-To"),
    de,
    a: adresses(o.To),
    cc: adresses(o.Cc),
    sujet: texte(o, "Subject"),
    corps: texte(o, "ExtractedMarkdownMessage") ?? texte(o, "RawTextBody") ??
      "",
    corpsHtml: texte(o, "RawHtmlBody"),
    recuLe,
    spam: typeof o.SpamScore === "number" ? o.SpamScore : null,
    pieces: pieces
      .filter((p) => typeof p.DownloadToken === "string")
      .map((p) => ({
        nom: texte(p, "Name") ?? "piece",
        typeMime: texte(p, "ContentType") ?? "application/octet-stream",
        taille: typeof p.ContentLength === "number" ? p.ContentLength : null,
        token: p.DownloadToken as string,
      })),
    references: refs ? refs.split(/\s+/).filter(Boolean) : [],
  };
}

export async function traiterBrevoEntrant(
  req: Request,
  deps: Dependances,
): Promise<Response> {
  if (req.method !== "POST") {
    return reponseJson(405, { erreur: "méthode non autorisée" });
  }
  if (!deps.jeton) {
    deps.journal.erreur(
      "BREVO_WEBHOOK_JETON absent : e-mail entrant refusé tant qu'il n'est pas posé",
    );
    return reponseJson(503, { erreur: "webhook non configuré" });
  }
  const auth = req.headers.get("authorization") ?? "";
  const recu = /^bearer\s+/i.test(auth)
    ? auth.replace(/^bearer\s+/i, "").trim()
    : (req.headers.get("x-omega-jeton") ?? "").trim();
  if (!recu || !memeSecret(recu, deps.jeton)) {
    return reponseJson(401, { erreur: "jeton invalide" });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return reponseJson(400, { erreur: "corps JSON illisible" });
  }
  const items =
    (corps && typeof corps === "object" && Array.isArray((corps as Objet).items)
      ? (corps as Objet).items
      : Array.isArray(corps)
      ? corps
      : [corps]) as Objet[];
  const maintenant = deps.maintenant?.() ?? new Date();
  const issues: Issue[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const m = lireItem(item, maintenant);
    if (!m) continue;
    issues.push(await recevoirMessage(m, deps));
  }
  const erreurs = issues.filter((i) => i.sortie === "erreur").length;
  // 500 si une porte ou le bucket est tombé : Brevo rejouera, la porte est idempotente.
  return reponseJson(erreurs > 0 ? 500 : 200, {
    recus: issues.length,
    erreurs,
    issues,
  });
}

export async function recevoirMessage(
  m: MessageEntrant,
  deps: Dependances,
): Promise<Issue> {
  const boites = [...m.a, ...m.cc].map((x) => x.adresse);
  // Pièces : téléchargées chez Brevo si la clé est là ; sinon le message passe sans elles, et on le dit.
  const pieces: PieceADeposer[] = [];
  const piecesManquantes: string[] = [];
  for (const p of m.pieces) {
    if (!deps.pieces) {
      piecesManquantes.push(p.nom);
      continue;
    }
    try {
      pieces.push({
        nom: p.nom,
        typeMime: p.typeMime,
        octets: await deps.pieces.telecharger(p.token),
      });
    } catch (e) {
      deps.journal.erreur("pièce Brevo non téléchargée", {
        identifiant: m.identifiant,
        nom: p.nom,
        erreur: String(e).slice(0, 200),
      });
      return {
        identifiant: m.identifiant,
        sortie: "erreur",
        erreur: `PIECE_ILLISIBLE : ${p.nom}`,
      };
    }
  }
  if (piecesManquantes.length) {
    deps.journal.erreur("BREVO_API_KEY absente : pièces entrantes ignorées", {
      identifiant: m.identifiant,
      pieces: piecesManquantes,
    });
  }
  return recevoir(
    deps,
    "email",
    boites,
    m.identifiant,
    pieces,
    (client, boite, deposees): Reception => ({
      client,
      canal: "email",
      boite,
      identifiant: m.identifiant,
      de: m.de?.adresse ?? null,
      deNom: m.de?.nom ?? null,
      sujet: m.sujet,
      corps: m.corps,
      corpsHtml: m.corpsHtml,
      pieces: deposees,
      detail: {
        source: "brevo_entrant",
        message_id: m.messageId,
        in_reply_to: m.inReplyTo,
        references: m.references,
        a: m.a,
        cc: m.cc,
        spam: m.spam,
        pieces_ignorees: piecesManquantes,
      },
      recuLe: m.recuLe,
    }),
  );
}
