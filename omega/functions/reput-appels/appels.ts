// Les appels non décrochés, transcrits (lot 10, C3) : le numéro de l'organisation renvoie, quand personne ne décroche,
// vers un numéro Twilio. Twilio appelle ce webhook :
//   · ?evenement=entrant : on salue (sans nommer personne), puis on écoute le message en français (Gather speech, fr-FR) ;
//   · ?evenement=parole : le texte reconnu (SpeechResult) devient une RÉCEPTION REPUT (canal « appel », boîte = le numéro
//     appelé, identifiant = CallSid, de = le numéro qui appelle) — elle suit ensuite le même circuit que les autres canaux.
// Rien n'est enregistré : pas de fichier audio, seul le texte reconnu est gardé. Sans message : « Appel manqué, sans message
// laissé. » Chaque rappel est vérifié par sa signature Twilio (même règle que l'astreinte).

import { rpc, type ConfigSupabase } from "@partage/portes.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { signatureValide } from "../reput-astreinte/twilio.ts";

export const ACCUEIL =
  "Bonjour. Nous ne pouvons pas vous répondre pour le moment. Laissez votre message après le signal : il nous sera transmis par écrit, et nous revenons vers vous.";
export const SANS_MESSAGE = "Appel manqué, sans message laissé.";

export interface Boite { client_id: string; entite_id: string | null; module: string | null }

export interface PortesAppels {
  resoudreBoite(numero: string): Promise<Boite | null>;
  deposer(r: { client: string; boite: string; identifiant: string; de: string | null; corps: string; detail: Record<string, unknown> }): Promise<{ id: number; nouvelle: boolean }>;
}

export class PortesAppelsRpc implements PortesAppels {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchR: typeof fetch = fetch) {}
  async resoudreBoite(numero: string): Promise<Boite | null> {
    return await rpc<Boite | null>(this.cfg, this.fetchR, "resoudre_boite", { p_canal: "appel", p_boite: numero });
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
}

const XML = { "Content-Type": "text/xml; charset=utf-8" };
const reponse = (corps: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${corps}</Response>`, { status: 200, headers: XML });

export function twimlEntrant(base: string): string {
  const action = `${base}?evenement=parole`.replace(/&/g, "&amp;");
  return `<Gather input="speech" language="fr-FR" speechTimeout="auto" timeout="6" action="${action}" method="POST">` +
    `<Say language="fr-FR">${ACCUEIL}</Say></Gather>` +
    `<Redirect method="POST">${action}</Redirect>`;
}

/** Le texte gardé : le message reconnu, nettoyé, borné ; sinon l'appel manqué sans message. */
export function texteDuMessage(parole: string | null): string {
  const t = (parole ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);
  return t || SANS_MESSAGE;
}

export async function webhook(ctx: ContexteAppels, url: URL, corps: URLSearchParams, signature: string | null): Promise<Response> {
  if (!ctx.jeton || !ctx.base) return new Response("non branché", { status: 503 });
  const evenement = url.searchParams.get("evenement");
  if (!(await signatureValide(ctx.jeton, `${ctx.base}${url.search}`, corps, signature))) {
    journal("alerte", "rappel Twilio refusé (signature)", { evenement });
    return new Response("signature invalide", { status: 403 });
  }
  const appele = corps.get("To");
  const appelant = corps.get("From");
  const sid = corps.get("CallSid");
  if (!appele || !sid) return new Response("appel incomplet", { status: 400 });
  if (evenement === "entrant") {
    return reponse(twimlEntrant(ctx.base));
  }
  if (evenement === "parole") {
    try {
      const boite = await ctx.portes.resoudreBoite(appele);
      if (!boite) {
        journal("alerte", "numéro inconnu, appel ignoré", { appele });
        return reponse(`<Say language="fr-FR">Merci, au revoir.</Say><Hangup/>`);
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
      return reponse(`<Say language="fr-FR">Merci, au revoir.</Say><Hangup/>`);
    }
  }
  return new Response("événement inconnu", { status: 400 });
}
