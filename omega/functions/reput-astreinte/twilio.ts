// Twilio pour l'astreinte REPUT : un appel sortant (API REST, TwiML en ligne) et la vérification de la signature des
// rappels (X-Twilio-Signature : HMAC-SHA1, en base64, de l'URL complète suivie des paramètres POST triés, clé = jeton).
// Sur la recette : un compte Twilio de TEST seulement (aucun appel réel).

export interface ConfigTwilio {
  compte: string;
  jeton: string;
  numero: string;
  /** L'URL publique de cette fonction : Twilio y rappelle (touche, statut). */
  base: string;
}

export function configTwilioDepuisEnv(env: { get(n: string): string | undefined }): ConfigTwilio | null {
  const compte = env.get("TWILIO_ACCOUNT_SID");
  const jeton = env.get("TWILIO_AUTH_TOKEN");
  const numero = env.get("TWILIO_NUMERO");
  const base = env.get("REPUT_ASTREINTE_URL");
  if (!compte || !jeton || !numero || !base) return null;
  return { compte, jeton, numero, base: base.replace(/\/+$/, "") };
}

export function echapperXml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Ce que dit l'appel : l'organisation seulement — ni le client, ni sa question. Touche 1 = prendre l'urgence. */
export function twimlAppel(cfg: ConfigTwilio, appel: string, organisation: string): string {
  const action = echapperXml(`${cfg.base}?evenement=touche&appel=${encodeURIComponent(appel)}`);
  const org = echapperXml(organisation.slice(0, 120));
  return `<?xml version="1.0" encoding="UTF-8"?><Response>` +
    `<Gather numDigits="1" action="${action}" method="POST" timeout="10">` +
    `<Say language="fr-FR">Omega. Une demande urgente attend chez ${org}. Appuyez sur 1 pour la prendre.</Say></Gather>` +
    `<Say language="fr-FR">Sans réponse, la personne suivante sera appelée.</Say></Response>`;
}

export function twimlMerci(pris: boolean): string {
  const t = pris ? "Merci. L'urgence est à vous : ouvrez votre espace Omega." : "Touche non reconnue. La personne suivante sera appelée.";
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="fr-FR">${t}</Say></Response>`;
}

/** Lance l'appel ; rend le SID de l'appel. */
export async function appeler(cfg: ConfigTwilio, fetchFn: typeof fetch, telephone: string, appel: string, organisation: string): Promise<string> {
  const corps = new URLSearchParams({
    To: telephone,
    From: cfg.numero,
    Twiml: twimlAppel(cfg, appel, organisation),
    StatusCallback: `${cfg.base}?evenement=statut&appel=${encodeURIComponent(appel)}`,
    StatusCallbackMethod: "POST",
    Timeout: "25",
  });
  const rep = await fetchFn(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.compte)}/Calls.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${cfg.compte}:${cfg.jeton}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: corps,
  });
  const texte = await rep.text();
  if (!rep.ok) throw new Error(`Twilio : HTTP ${rep.status} ${texte.slice(0, 200)}`);
  const sid = (JSON.parse(texte) as { sid?: string }).sid;
  if (!sid) throw new Error("Twilio : réponse sans sid");
  return sid;
}

/** La signature d'un rappel Twilio (comparaison à temps constant). */
export async function signatureValide(jeton: string, url: string, params: URLSearchParams, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const cles = [...new Set([...params.keys()])].sort();
  let texte = url;
  for (const k of cles) for (const v of params.getAll(k)) texte += k + v;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(jeton), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(texte)));
  const attendu = btoa(String.fromCharCode(...mac));
  if (attendu.length !== signature.length) return false;
  let ecart = 0;
  for (let i = 0; i < attendu.length; i++) ecart |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
  return ecart === 0;
}

/** L'issue d'un statut d'appel Twilio, pour reput_appel_issue (null : rien à noter). */
export function issueDuStatut(statut: string | null): "sonne" | "sans_reponse" | "echec" | null {
  switch (statut) {
    case "in-progress":
    case "answered":
      return "sonne";
    case "no-answer":
    case "busy":
    case "canceled":
    case "completed":
      return "sans_reponse";
    case "failed":
      return "echec";
    default:
      return null;
  }
}
