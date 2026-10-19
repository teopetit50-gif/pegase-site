// Le passage de l'ouvrier d'astreinte : les appels à passer (portes c3_22), un appel Twilio chacun ; et les rappels de
// Twilio (touche, statut), signés, qui notent l'issue. « completed » après un « pris » ne change rien (la base l'ignore).

import { rpc, type ConfigSupabase } from "@partage/portes.ts";
import { journal, messageDe } from "@partage/journal.ts";
import { appeler, type ConfigTwilio, issueDuStatut, signatureValide, twimlMerci } from "./twilio.ts";

export interface AppelAPasser {
  appel: string;
  telephone: string;
  rang: number;
  organisation: string;
}

export interface PortesAstreinte {
  appelsAPasser(nombre: number): Promise<AppelAPasser[]>;
  issue(appel: string, issue: "sonne" | "pris" | "sans_reponse" | "echec", reference?: string | null): Promise<void>;
}

export class PortesAstreinteRpc implements PortesAstreinte {
  constructor(private readonly cfg: ConfigSupabase, private readonly fetchR: typeof fetch = fetch) {}
  async appelsAPasser(nombre: number): Promise<AppelAPasser[]> {
    return (await rpc<AppelAPasser[] | null>(this.cfg, this.fetchR, "reput_appels_a_passer", { p_nombre: nombre })) ?? [];
  }
  async issue(appel: string, issue: "sonne" | "pris" | "sans_reponse" | "echec", reference: string | null = null): Promise<void> {
    await rpc<unknown>(this.cfg, this.fetchR, "reput_appel_issue", { p_appel: appel, p_issue: issue, p_reference: reference });
  }
}

export interface ContexteAstreinte {
  portes: PortesAstreinte;
  twilio: ConfigTwilio | null;
  fetchTwilio: typeof fetch;
}

/** Un passage : sans Twilio, rien n'est pris (les appels attendent ; la base escalade au délai). */
export async function passer(ctx: ContexteAstreinte, nombre = 10): Promise<{ appeles: number; echecs: number; branche: boolean }> {
  if (!ctx.twilio) {
    journal("alerte", "Twilio non branché : les appels d'astreinte attendent (TWILIO_NON_BRANCHE).");
    return { appeles: 0, echecs: 0, branche: false };
  }
  let appeles = 0;
  let echecs = 0;
  for (const a of await ctx.portes.appelsAPasser(nombre)) {
    try {
      const sid = await appeler(ctx.twilio, ctx.fetchTwilio, a.telephone, a.appel, a.organisation);
      await ctx.portes.issue(a.appel, "sonne", sid);
      appeles++;
    } catch (e) {
      echecs++;
      journal("erreur", "appel d'astreinte impossible", { appel: a.appel, rang: a.rang, erreur: messageDe(e, 200) });
      await ctx.portes.issue(a.appel, "echec", null);
    }
  }
  journal("info", "astreinte : passage", { appeles, echecs });
  return { appeles, echecs, branche: true };
}

/** Un rappel de Twilio. Rend la réponse HTTP (TwiML pour la touche). Une signature fausse : 403, rien n'est noté. */
export async function rappel(ctx: ContexteAstreinte, url: URL, corps: URLSearchParams, signature: string | null): Promise<Response> {
  const xml = { "Content-Type": "text/xml; charset=utf-8" };
  if (!ctx.twilio) return new Response("non branché", { status: 503 });
  const evenement = url.searchParams.get("evenement");
  const appel = url.searchParams.get("appel");
  const urlSignee = `${ctx.twilio.base}${url.search}`;
  if (!appel || !(await signatureValide(ctx.twilio.jeton, urlSignee, corps, signature))) {
    journal("alerte", "rappel Twilio refusé (signature)", { evenement });
    return new Response("signature invalide", { status: 403 });
  }
  if (evenement === "touche") {
    const pris = corps.get("Digits") === "1";
    if (pris) await ctx.portes.issue(appel, "pris", corps.get("CallSid"));
    return new Response(twimlMerci(pris), { status: 200, headers: xml });
  }
  if (evenement === "statut") {
    const issue = issueDuStatut(corps.get("CallStatus"));
    if (issue && issue !== "sonne") await ctx.portes.issue(appel, issue, corps.get("CallSid"));
    return new Response(null, { status: 204 });
  }
  return new Response("événement inconnu", { status: 400 });
}
