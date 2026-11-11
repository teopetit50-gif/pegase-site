/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — le compte Google de Teo (11/11/2026)

   Le même jeton de rafraîchissement que le lien Meet des audits
   (lib/visio.ts, variables GOOGLE_OAUTH_* sur Vercel), demandé une fois
   avec outils/jeton-google.mjs. Depuis le 11/11, ce script demande aussi
   la boîte Gmail (gmail.modify : lire, répondre, marquer lu) ; un jeton
   obtenu avant ne porte que l'agenda : la page Mails le dit et demande de
   relancer le script.

   Ce fichier rend un jeton d'accès, ou dit pourquoi il n'y en a pas. Il
   n'appelle ni l'agenda ni la boîte : lib/teo/agenda.ts et lib/teo/gmail.ts.
   Jamais importé par un composant client.
   ══════════════════════════════════════════════════════════════════════ */

import type { EtatGoogle } from "./types";

const JETON = "https://oauth2.googleapis.com/token";

export type Acces = { etat: "ok"; jeton: string; portees: string[] } | { etat: Exclude<EtatGoogle, "ok">; detail: string | null };

/* un jeton d'accès vaut une heure : on le garde le temps de l'instance */
let cache: { jeton: string; portees: string[]; expire: number } | null = null;

export async function accesGoogle(): Promise<Acces> {
  const client_id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const client_secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refresh_token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (!client_id || !client_secret || !refresh_token) return { etat: "absent", detail: null };
  if (cache && cache.expire > Date.now()) return { etat: "ok", jeton: cache.jeton, portees: cache.portees };
  try {
    const r = await fetch(JETON, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      const texte = (await r.text()).slice(0, 200);
      console.error("[teo/google] jeton refusé :", r.status, texte);
      return { etat: "erreur", detail: `Google a refusé le jeton (${r.status}). Relancez outils/jeton-google.mjs et reposez GOOGLE_OAUTH_REFRESH_TOKEN.` };
    }
    const j = (await r.json()) as { access_token?: string; expires_in?: number; scope?: string };
    if (!j.access_token) return { etat: "erreur", detail: "Google n'a pas rendu de jeton d'accès." };
    const portees = (j.scope ?? "").split(/\s+/).filter(Boolean);
    cache = { jeton: j.access_token, portees, expire: Date.now() + Math.max(60, (j.expires_in ?? 3600) - 120) * 1000 };
    return { etat: "ok", jeton: j.access_token, portees };
  } catch (e) {
    return { etat: "erreur", detail: e instanceof Error ? e.message : "Google n'a pas répondu." };
  }
}

/** le jeton porte-t-il la boîte Gmail ? (gmail.modify, ou une portée plus large) */
export const porteGmail = (portees: string[]) => portees.some((p) => /\/auth\/gmail\.modify$|\/auth\/gmail\.readonly$|\/auth\/gmail\.send$|^https:\/\/mail\.google\.com\/$/.test(p));
/** et l'agenda ? */
export const porteAgenda = (portees: string[]) => portees.some((p) => /\/auth\/calendar(\.events|\.readonly|\.events\.readonly)?$/.test(p));

/** un appel à une API Google, le jeton posé ; lève sur une réponse en erreur */
export async function appelGoogle<T>(jeton: string, url: string, init?: RequestInit & { delai?: number }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${jeton}`, Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(init?.delai ?? 12_000),
  });
  if (!r.ok) {
    const texte = (await r.text()).slice(0, 300);
    throw new Error(`Google ${r.status} : ${texte || r.statusText}`);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

/** le compte Google branché (l'adresse de la boîte) */
export async function adresseGoogle(jeton: string): Promise<string | null> {
  try {
    const p = await appelGoogle<{ emailAddress?: string }>(jeton, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
    return p.emailAddress ?? null;
  } catch {
    return null;
  }
}
