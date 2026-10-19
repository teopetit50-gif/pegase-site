// Les appels non décrochés, transcrits (lots 10 et c3_24, C3) : le numéro de l'organisation renvoie, quand personne ne
// décroche, vers un numéro Twilio. Twilio appelle ce webhook :
//   · ?evenement=entrant (ou sans événement) : on salue (sans nommer personne), puis selon la VOIE réglée par
//     l'organisation (c3_24, porte reput_voie_transcription) :
//       - « twilio » : on écoute le message (Gather speech, fr-FR) → ?evenement=parole porte le texte reconnu ; aucun audio ;
//       - « ue » : enregistrement COURT (90 s) → ?evenement=enregistrement : l'audio est lu une fois, transcrit chez le
//         fournisseur UE (interface Transcripteur ; fournisseur non choisi, doublure en test), puis EFFACÉ chez Twilio,
//         même si la transcription échoue ;
//   · le texte (ou « Appel manqué, sans message laissé. ») devient une RÉCEPTION REPUT (canal « appel », boîte = le numéro
//     appelé, identifiant = CallSid, de = le numéro qui appelle).
// Chaque rappel est vérifié par sa signature Twilio (même règle que l'astreinte).

import { rpc, type ConfigSupabase } from "@partage/portes.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { signatureValide } from "../reput-astreinte/twilio.ts";

export const ACCUEIL =
  "Bonjour. Nous ne pouvons pas vous répondre pour le moment. Laissez votre message après le signal : il nous sera transmis par écrit, et nous revenons vers vous.";
export const SANS_MESSAGE = "Appel manqué, sans message laissé.";
export const SANS_TRANSCRIPTION = "Message vocal reçu ; la transcription n'a pas pu être faite. Rappelez ce numéro.";
export const DUREE_MAX_SECONDES = 90;

export type Voie = "twilio" | "ue";

export interface Boite { client_id: string; entite_id: string | null; module: string | null }

/** Le fournisseur de transcription établi dans l'UE (non choisi : seule une doublure existe, en test). */
export interface Transcripteur {
  nom: string;
  transcrire(audio: Uint8Array, mime: string, langue: string): Promise<{ texte: string; confiance?: number | null }>;
}

/** Le fournisseur UE branché par l'environnement — aucun n'est choisi : null, l'ouvrier dit « transcription indisponible ». */
export function transcripteurDepuisEnv(_env: { get(n: string): string | undefined }): Transcripteur | null {
  return null;
}

export interface PortesAppels {
  resoudreBoite(numero: string): Promise<Boite | null>;
  voie(client: string): Promise<Voie>;
  deposer(r: { client: string; boite: string; identifiant: string; de: string | null; corps: string; detail: Record<string, unknown> }): Promise<{ id: number; nouvelle: boolean }>;
}

export class PortesAppelsRpc implements PortesAppels {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchR: typeof fetch = fetch) {}
  async resoudreBoite(numero: string): Promise<Boite | null> {
    return await rpc<Boite | null>(this.cfg, this.fetchR, "resoudre_boite", { p_canal: "appel", p_boite: numero });
  }
  async voie(client: string): Promise<Voie> {
    return (await rpc<string>(this.cfg, this.fetchR, "reput_voie_transcription", { p_client: client })) === "ue" ? "ue" : "twilio";
  }
  async deposer(r: { client: string; boite: string; identifiant: string; de: string | null; corps: string; detail: Record<string, unknown> }) {
    return await rpc<{ id: number; nouvelle: boolean }>(this.cfg, this.fetchR, "deposer_reception", {
      p_client: r.client, p_canal: "appel", p_boite: r.boite, p_identifiant: r.identifiant, p_de: r.de,
      p_corps: r.corps, p_detail: r.detail,
    });
  }
}

export interface ContexteAppels {
  portes: PortesAppels;
  jeton: string | null;
  /** L'URL publique de cette fonction (celle que Twilio signe). */
  base: string | null;
  /** Pour lire puis effacer l'enregistrement (voie « ue ») : le compte Twilio. */
  compte?: string | null;
  transcripteur?: Transcripteur | null;
  fetchTwilio?: typeof fetch;
}

const XML = { "Content-Type": "text/xml; charset=utf-8" };
const reponse = (corps: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${corps}</Response>`, { status: 200, headers: XML });
const xmlAttr = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function twimlEntrant(base: string): string {
  const action = xmlAttr(`${base}?evenement=parole`);
  return `<Gather input="speech" language="fr-FR" speechTimeout="auto" timeout="6" action="${action}" method="POST">` +
    `<Say language="fr-FR">${ACCUEIL}</Say></Gather>` +
    `<Redirect method="POST">${action}</Redirect>`;
}

/** Voie « ue » : un enregistrement court ; le numéro appelant et l'appelé voyagent dans l'URL signée du rappel. */
export function twimlEnregistrement(base: string, de: string | null, a: string): string {
  const q = new URLSearchParams({ evenement: "enregistrement", a, ...(de ? { de } : {}) });
  return `<Say language="fr-FR">${ACCUEIL}</Say>` +
    `<Record maxLength="${DUREE_MAX_SECONDES}" timeout="5" playBeep="true" trim="trim-silence" method="POST" ` +
    `action="${xmlAttr(`${base}?evenement=fin`)}" recordingStatusCallback="${xmlAttr(`${base}?${q}`)}" ` +
    `recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"/>`;
}

/** Le texte gardé : le message reconnu, nettoyé, borné ; sinon l'appel manqué sans message. */
export function texteDuMessage(parole: string | null): string {
  const t = (parole ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);
  return t || SANS_MESSAGE;
}

function auRevoir(): Response {
  return reponse(`<Say language="fr-FR">Merci, au revoir.</Say><Hangup/>`);
}

/** Voie « ue » : lit l'audio une fois, le transcrit, l'efface chez Twilio dans tous les cas. */
async function transcrireEnUe(ctx: ContexteAppels, url: string, sid: string, lire: boolean): Promise<{ texte: string | null; confiance: number | null; efface: boolean }> {
  const f = ctx.fetchTwilio ?? fetch;
  const auth = { Authorization: `Basic ${btoa(`${ctx.compte}:${ctx.jeton}`)}` };
  let texte: string | null = null;
  let confiance: number | null = null;
  try {
    if (lire && ctx.transcripteur) {
      const rep = await f(`${url}.wav`, { headers: auth });
      if (!rep.ok) throw new Error(`enregistrement illisible : HTTP ${rep.status}`);
      const t = await ctx.transcripteur.transcrire(new Uint8Array(await rep.arrayBuffer()), "audio/wav", "fr");
      texte = t.texte;
      confiance = t.confiance ?? null;
    }
  } catch (e) {
    journal("erreur", "transcription UE impossible", { erreur: messageDe(e, 200) });
  }
  let efface = false;
  try {
    const d = await f(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(ctx.compte ?? "")}/Recordings/${encodeURIComponent(sid)}.json`,
                      { method: "DELETE", headers: auth });
    efface = d.ok || d.status === 404;
    if (!efface) journal("alerte", "enregistrement non effacé chez Twilio", { recording: sid, statut: d.status });
  } catch (e) {
    journal("alerte", "enregistrement non effacé chez Twilio", { recording: sid, erreur: messageDe(e, 200) });
  }
  return { texte, confiance, efface };
}

export async function webhook(ctx: ContexteAppels, url: URL, corps: URLSearchParams, signature: string | null): Promise<Response> {
  if (!ctx.jeton || !ctx.base) return new Response("non branché", { status: 503 });
  const evenement = url.searchParams.get("evenement") ?? "entrant";
  if (!(await signatureValide(ctx.jeton, `${ctx.base}${url.search}`, corps, signature))) {
    journal("alerte", "rappel Twilio refusé (signature)", { evenement });
    return new Response("signature invalide", { status: 403 });
  }
  const sid = corps.get("CallSid");
  if (evenement === "fin") return auRevoir();
  if (evenement === "enregistrement") {
    // Le rappel d'enregistrement ne porte ni From ni To : l'URL signée les a.
    const appele = url.searchParams.get("a");
    const rs = corps.get("RecordingSid");
    const ru = corps.get("RecordingUrl");
    if (!appele || !sid || !rs || !ru || !/^https:\/\/api\.twilio\.com\//.test(ru)) return new Response("enregistrement incomplet", { status: 400 });
    if (corps.get("RecordingStatus") && corps.get("RecordingStatus") !== "completed") return new Response(null, { status: 204 });
    try {
      const boite = await ctx.portes.resoudreBoite(appele);
      const t = await transcrireEnUe(ctx, ru, rs, boite !== null);
      if (!boite) {
        journal("alerte", "numéro inconnu, enregistrement effacé sans dépôt", { appele });
        return new Response(null, { status: 204 });
      }
      const texte = t.texte === null ? SANS_TRANSCRIPTION : texteDuMessage(t.texte);
      const depot = await ctx.portes.deposer({
        client: boite.client_id, boite: appele, identifiant: sid, de: url.searchParams.get("de"), corps: texte,
        detail: { source: "twilio_voix", transcription: t.texte === null ? null : `ue:${ctx.transcripteur?.nom ?? "?"}`,
                  confiance: t.confiance, sans_message: t.texte !== null && !t.texte.trim(), audio_efface: t.efface,
                  duree: Number(corps.get("RecordingDuration") ?? "") || null },
      });
      journal("info", depot.nouvelle ? "appel transcrit (UE) déposé" : "appel déjà connu", { id: depot.id, audio_efface: t.efface });
    } catch (e) {
      journal("erreur", "appel non déposé", { erreur: messageDe(e, 200) });
    }
    return new Response(null, { status: 204 });
  }
  const appele = corps.get("To");
  const appelant = corps.get("From");
  if (!appele || !sid) return new Response("appel incomplet", { status: 400 });
  if (evenement === "entrant") {
    try {
      const boite = await ctx.portes.resoudreBoite(appele);
      if (!boite) {
        journal("alerte", "numéro inconnu, appel ignoré", { appele });
        return auRevoir();
      }
      const voie = await ctx.portes.voie(boite.client_id);
      return reponse(voie === "ue" ? twimlEnregistrement(ctx.base, appelant, appele) : twimlEntrant(ctx.base));
    } catch (e) {
      journal("erreur", "appel entrant : voie inconnue, écoute Twilio", { erreur: messageDe(e, 200) });
      return reponse(twimlEntrant(ctx.base));
    }
  }
  if (evenement === "parole") {
    try {
      const boite = await ctx.portes.resoudreBoite(appele);
      if (!boite) {
        journal("alerte", "numéro inconnu, appel ignoré", { appele });
        return auRevoir();
      }
      const parole = corps.get("SpeechResult");
      const confiance = Number(corps.get("Confidence") ?? "");
      const depot = await ctx.portes.deposer({
        client: boite.client_id, boite: appele, identifiant: sid, de: appelant, corps: texteDuMessage(parole),
        detail: { source: "twilio_voix", transcription: parole ? "gather_speech_fr" : null,
                  confiance: Number.isFinite(confiance) ? confiance : null, sans_message: !parole?.trim() },
      });
      journal("info", depot.nouvelle ? "appel transcrit déposé" : "appel déjà connu", { id: depot.id });
      return reponse(`<Say language="fr-FR">Merci, votre message est bien transmis. Au revoir.</Say><Hangup/>`);
    } catch (e) {
      journal("erreur", "appel non déposé", { erreur: messageDe(e, 200) });
      return auRevoir();
    }
  }
  return new Response("événement inconnu", { status: 400 });
}
