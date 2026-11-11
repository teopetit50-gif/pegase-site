/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — la boîte Gmail de Teo (11/11/2026)

   Lue avec le jeton de lib/teo/google.ts (portée gmail.modify) :
     · lireBoite : les fils de la boîte de réception, les plus récents
       d'abord (en-têtes, aperçu, non lu, pièces jointes), sans les corps ;
     · lireFil : un fil entier, chaque message avec son texte (text/plain
       de préférence, sinon le HTML dépouillé) ;
     · repondre : une réponse dans le fil (messages.send, en-têtes
       In-Reply-To et References posés, l'objet en « Re: ») ;
     · marquerLu : le fil lu ou non lu (étiquette UNREAD).
   Rien d'autre : pas de suppression, pas d'archivage automatique.
   ══════════════════════════════════════════════════════════════════════ */

import { accesGoogle, adresseGoogle, appelGoogle, porteGmail } from "./google";
import type { EtatGoogle, FilMail, MessageMailTeo, PieceMailTeo } from "./types";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const ENTETES = ["From", "To", "Cc", "Subject", "Date", "Message-ID", "References"];

type Partie = { mimeType?: string; filename?: string; headers?: { name: string; value: string }[]; body?: { size?: number; data?: string; attachmentId?: string }; parts?: Partie[] };
type MessageGoogle = { id: string; threadId: string; labelIds?: string[]; snippet?: string; internalDate?: string; payload?: Partie };
type FilGoogle = { id: string; messages?: MessageGoogle[] };

const entete = (m: MessageGoogle, nom: string) => m.payload?.headers?.find((h) => h.name.toLowerCase() === nom.toLowerCase())?.value ?? "";
/* « Nom <adresse> » → { nom, adresse } */
export function lireExpediteur(v: string): { nom: string; adresse: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(v);
  if (m) return { nom: m[1].trim(), adresse: m[2].trim().toLowerCase() };
  return { nom: "", adresse: v.trim().toLowerCase() };
}
/* les en-têtes encodés (=?UTF-8?B?…?=) arrivent déjà décodés par l'API Gmail */
function pieces(p: Partie | undefined, acc: PieceMailTeo[] = []): PieceMailTeo[] {
  if (!p) return acc;
  if (p.filename && p.body?.attachmentId) acc.push({ nom: p.filename, taille: p.body.size ?? 0 });
  for (const x of p.parts ?? []) pieces(x, acc);
  return acc;
}
const decoder = (data: string) => Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
function texteDe(p: Partie | undefined): string {
  if (!p) return "";
  const plats: string[] = [];
  const htmls: string[] = [];
  const marcher = (x: Partie) => {
    if (x.body?.data && !x.filename) {
      if (x.mimeType === "text/plain") plats.push(decoder(x.body.data));
      else if (x.mimeType === "text/html") htmls.push(decoder(x.body.data));
    }
    for (const y of x.parts ?? []) marcher(y);
  };
  marcher(p);
  if (plats.length) return plats.join("\n").trim();
  return htmls
    .join("\n")
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>|<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function versMessage(m: MessageGoogle, moi: string | null): MessageMailTeo {
  const de = lireExpediteur(entete(m, "From"));
  return {
    id: m.id,
    de_nom: de.nom,
    de_adresse: de.adresse,
    a: entete(m, "To"),
    cc: entete(m, "Cc"),
    quand: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : new Date(entete(m, "Date")).toISOString(),
    texte: texteDe(m.payload),
    pieces: pieces(m.payload),
    moi: (!!moi && de.adresse === moi) || (m.labelIds ?? []).includes("SENT"),
  };
}
function versFil(f: FilGoogle, moi: string | null): FilMail | null {
  const ms = f.messages ?? [];
  if (!ms.length) return null;
  const premier = ms[0];
  const dernier = ms[ms.length - 1];
  /* l'expéditeur : le dernier message qui n'est pas de moi, sinon le premier */
  const de = lireExpediteur(entete([...ms].reverse().find((m) => !(m.labelIds ?? []).includes("SENT") && lireExpediteur(entete(m, "From")).adresse !== moi) ?? premier, "From"));
  return {
    id: f.id,
    objet: entete(premier, "Subject") || "(sans objet)",
    de_nom: de.nom,
    de_adresse: de.adresse,
    apercu: (dernier.snippet ?? "").trim(),
    recu_le: dernier.internalDate ? new Date(Number(dernier.internalDate)).toISOString() : new Date().toISOString(),
    non_lu: ms.some((m) => (m.labelIds ?? []).includes("UNREAD")),
    important: ms.some((m) => (m.labelIds ?? []).includes("IMPORTANT")),
    nb_messages: ms.length,
    pieces: ms.flatMap((m) => pieces(m.payload)),
    repondu: (dernier.labelIds ?? []).includes("SENT") || (!!moi && lireExpediteur(entete(dernier, "From")).adresse === moi),
    messages: null,
  };
}

export type LectureBoite = { etat: EtatGoogle; detail: string | null; adresse: string | null; fils: FilMail[] };

async function jetonGmail(): Promise<{ jeton: string } | { etat: Exclude<EtatGoogle, "ok">; detail: string | null }> {
  const acces = await accesGoogle();
  if (acces.etat !== "ok") return { etat: acces.etat, detail: acces.detail };
  if (!porteGmail(acces.portees)) return { etat: "portee", detail: "Le jeton Google ne porte que l'agenda : relancez outils/jeton-google.mjs (il demande maintenant la boîte Gmail) et reposez GOOGLE_OAUTH_REFRESH_TOKEN." };
  return { jeton: acces.jeton };
}

/** les fils de la boîte de réception, les plus récents d'abord (30 au plus) */
export async function lireBoite(): Promise<LectureBoite> {
  const t = await jetonGmail();
  if (!("jeton" in t)) return { etat: t.etat, detail: t.detail, adresse: null, fils: [] };
  try {
    const [adresse, liste] = await Promise.all([adresseGoogle(t.jeton), appelGoogle<{ threads?: { id: string }[] }>(t.jeton, `${GMAIL}/threads?labelIds=INBOX&maxResults=30`)]);
    const ids = (liste.threads ?? []).map((x) => x.id);
    const fils: FilMail[] = [];
    /* par paquets de dix : sous la limite de débit de Gmail */
    for (let i = 0; i < ids.length; i += 10) {
      const paquet = await Promise.all(
        ids.slice(i, i + 10).map((id) => appelGoogle<FilGoogle>(t.jeton, `${GMAIL}/threads/${id}?format=metadata&${ENTETES.map((h) => `metadataHeaders=${h}`).join("&")}`)),
      );
      for (const f of paquet) {
        const fil = versFil(f, adresse);
        if (fil) fils.push(fil);
      }
    }
    fils.sort((a, b) => b.recu_le.localeCompare(a.recu_le));
    return { etat: "ok", detail: null, adresse, fils };
  } catch (e) {
    console.error("[teo/gmail] boîte :", e instanceof Error ? e.message : e);
    return { etat: "erreur", detail: e instanceof Error ? e.message : "Gmail n'a pas répondu.", adresse: null, fils: [] };
  }
}

/** un fil entier, avec le texte de chaque message */
export async function lireFil(id: string): Promise<{ fil: FilMail | null; detail: string | null }> {
  const t = await jetonGmail();
  if (!("jeton" in t)) return { fil: null, detail: t.detail };
  try {
    const [adresse, f] = await Promise.all([adresseGoogle(t.jeton), appelGoogle<FilGoogle>(t.jeton, `${GMAIL}/threads/${encodeURIComponent(id)}?format=full`)]);
    const fil = versFil(f, adresse);
    if (!fil) return { fil: null, detail: "Ce fil est vide." };
    fil.messages = (f.messages ?? []).map((m) => versMessage(m, adresse));
    return { fil, detail: null };
  } catch (e) {
    return { fil: null, detail: e instanceof Error ? e.message : "Gmail n'a pas répondu." };
  }
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enteteUtf8 = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`);

/** répondre dans un fil : au dernier expéditeur qui n'est pas moi, l'objet en « Re: » */
export async function repondre(id: string, texte: string, objet?: string): Promise<{ ok: true; a: string } | { ok: false; detail: string }> {
  const t = await jetonGmail();
  if (!("jeton" in t)) return { ok: false, detail: t.detail ?? "Gmail n'est pas branché." };
  try {
    const [adresse, f] = await Promise.all([adresseGoogle(t.jeton), appelGoogle<FilGoogle>(t.jeton, `${GMAIL}/threads/${encodeURIComponent(id)}?format=metadata&${ENTETES.map((h) => `metadataHeaders=${h}`).join("&")}`)]);
    const ms = f.messages ?? [];
    if (!ms.length) return { ok: false, detail: "Ce fil est vide." };
    const dernier = ms[ms.length - 1];
    const cible = [...ms].reverse().find((m) => lireExpediteur(entete(m, "From")).adresse !== adresse) ?? dernier;
    const a = entete(cible, "From");
    const sujet = objet?.trim() || (/^re\s*:/i.test(entete(ms[0], "Subject")) ? entete(ms[0], "Subject") : `Re: ${entete(ms[0], "Subject")}`);
    const idMessage = entete(dernier, "Message-ID");
    const references = [entete(dernier, "References"), idMessage].filter(Boolean).join(" ");
    const brut = [
      `To: ${a}`,
      `Subject: ${enteteUtf8(sujet)}`,
      ...(idMessage ? [`In-Reply-To: ${idMessage}`] : []),
      ...(references ? [`References: ${references}`] : []),
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(texte, "utf8").toString("base64"),
    ].join("\r\n");
    await appelGoogle(t.jeton, `${GMAIL}/messages/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw: b64url(brut), threadId: id }) });
    return { ok: true, a: lireExpediteur(a).adresse };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Gmail a refusé l'envoi." };
  }
}

/** le fil lu (ou non lu) */
export async function marquerLu(id: string, lu: boolean): Promise<{ ok: boolean; detail: string | null }> {
  const t = await jetonGmail();
  if (!("jeton" in t)) return { ok: false, detail: t.detail };
  try {
    await appelGoogle(t.jeton, `${GMAIL}/threads/${encodeURIComponent(id)}/modify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lu ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] }),
    });
    return { ok: true, detail: null };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Gmail n'a pas répondu." };
  }
}
