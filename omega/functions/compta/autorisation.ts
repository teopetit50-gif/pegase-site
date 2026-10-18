// L'autorisation OAuth d'une connexion (QuickBooks, Pennylane). L'écran obtient du gérant un nonce à usage unique
// (public.filed_preparer_autorisation), puis envoie le navigateur vers cette fonction (?autoriser=<nonce>&editeur=…),
// qui le renvoie chez l'éditeur avec state=<nonce>. L'éditeur revient ici (?code=…&state=…[&realmId=…]) : le nonce est
// consommé (compta_consommer_autorisation), le code échangé contre les jetons, rangés au coffre
// (compta_activer_connexion). Variables : QBO_CLIENT_ID, QBO_CLIENT_SECRET, PENNYLANE_CLIENT_ID, PENNYLANE_CLIENT_SECRET,
// PENNYLANE_SCOPES, COMPTA_URL_RETOUR (l'adresse de cette fonction, déclarée chez l'éditeur).

import { type ConfigSupabase, rpc } from "@partage/portes.ts";
import { appeler, ErreurEditeur } from "./editeurs/commun.ts";
import { type Env, URL_JETON } from "./jetons.ts";

export const URL_AUTORISER = {
  quickbooks: "https://appcenter.intuit.com/connect/oauth2",
  pennylane: "https://app.pennylane.com/oauth/authorize",
};
const PORTEE_QBO = "com.intuit.quickbooks.accounting";

function prefixe(editeur: "quickbooks" | "pennylane") {
  return editeur === "quickbooks" ? "QBO" : "PENNYLANE";
}

/** L'adresse de l'éditeur où le gérant donne son accord. */
export function urlAutorisation(editeur: "quickbooks" | "pennylane", nonce: string, env: Env): string {
  const id = env.get(`${prefixe(editeur)}_CLIENT_ID`);
  const retour = env.get("COMPTA_URL_RETOUR");
  if (!id || !retour) throw new ErreurEditeur("configuration", `${prefixe(editeur)}_CLIENT_ID ou COMPTA_URL_RETOUR absente.`);
  const p = new URLSearchParams({
    client_id: id,
    response_type: "code",
    redirect_uri: retour,
    state: nonce,
    scope: editeur === "quickbooks" ? PORTEE_QBO : (env.get("PENNYLANE_SCOPES") || "ledger_entries:all"),
  });
  return `${URL_AUTORISER[editeur]}?${p.toString()}`;
}

/** Le code rendu par l'éditeur, échangé contre les jetons ; rend le secret JSON à ranger au coffre. */
export async function echangerCode(editeur: "quickbooks" | "pennylane", code: string, env: Env, fetchFn: typeof fetch, maintenant = new Date()) {
  const id = env.get(`${prefixe(editeur)}_CLIENT_ID`);
  const cle = env.get(`${prefixe(editeur)}_CLIENT_SECRET`);
  const retour = env.get("COMPTA_URL_RETOUR");
  if (!id || !cle || !retour) throw new ErreurEditeur("configuration", `${prefixe(editeur)}_CLIENT_ID, _CLIENT_SECRET ou COMPTA_URL_RETOUR absente.`);
  const r = await appeler<{ access_token: string; refresh_token?: string; expires_in?: number }>(fetchFn, URL_JETON[editeur], {
    methode: "POST",
    entetes: editeur === "quickbooks" ? { Authorization: `Basic ${btoa(`${id}:${cle}`)}` } : {},
    formulaire: editeur === "quickbooks"
      ? { grant_type: "authorization_code", code, redirect_uri: retour }
      : { grant_type: "authorization_code", code, redirect_uri: retour, client_id: id, client_secret: cle },
  }, `${editeur} (autorisation)`);
  if (!r?.access_token) throw new ErreurEditeur("definitif", `${editeur} : pas de jeton dans la réponse.`);
  return JSON.stringify({
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: new Date(maintenant.getTime() + (r.expires_in ?? 3600) * 1000).toISOString(),
  });
}

export interface RetourAutorisation {
  ok: boolean;
  message: string;
  connexion?: string;
}

/** Le retour de l'éditeur : nonce consommé, code échangé, connexion activée. */
export async function traiterRetour(
  url: URL,
  cfg: ConfigSupabase,
  env: Env,
  fetchFn: typeof fetch,
): Promise<RetourAutorisation> {
  const code = url.searchParams.get("code");
  const nonce = url.searchParams.get("state") ?? "";
  if (!code) return { ok: false, message: url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "Autorisation refusée." };
  const c = await rpc<{ connexion: string; editeur: string } | null>(cfg, fetchFn, "compta_consommer_autorisation", { p_nonce: nonce });
  if (!c) return { ok: false, message: "Lien d'autorisation inconnu ou échu : recommencez depuis Omega." };
  if (c.editeur !== "quickbooks" && c.editeur !== "pennylane") return { ok: false, message: "Éditeur sans autorisation en ligne." };
  const secret = await echangerCode(c.editeur, code, env, fetchFn);
  const realm = url.searchParams.get("realmId");
  await rpc<null>(cfg, fetchFn, "compta_activer_connexion", {
    p_connexion: c.connexion,
    p_secret: secret,
    p_parametres: c.editeur === "quickbooks" && realm ? { realm_id: realm } : null,
  });
  return { ok: true, message: "Connexion établie : les écritures partiront au prochain passage.", connexion: c.connexion };
}
