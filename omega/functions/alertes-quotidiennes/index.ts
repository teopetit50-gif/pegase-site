// Fonction Edge alertes-quotidiennes (lot socle 19ap) : chaque matin, le résumé des alertes part par courriel vers
// l'opérateur. Appelée par un cron avec la clé de service (verify_jwt = true ; tout autre jeton est refusé).
// Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (fournies) ; BREVO_API_KEY ; ALERTES_ENVIRONNEMENT
// (« recette » par défaut). Destinataire et expéditeur : réglages private.reglages « alertes_destinataire » et
// « alertes_expediteur » (lus par la porte lire_parametre), ou variables ALERTES_DESTINATAIRE / ALERTES_EXPEDITEUR.
// Rien n'est envoyé s'il n'y a rien à signaler. Les alertes envoyées sont marquées (envoyee_le) et ne reviennent plus.

import { corps, type Resume, sujet } from "./resume.ts";

const URL_BASE = Deno.env.get("SUPABASE_URL") ?? "";
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ENVIRONNEMENT = Deno.env.get("ALERTES_ENVIRONNEMENT") ?? "recette";

async function rpc<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const rep = await fetch(`${URL_BASE}/rest/v1/rpc/${nom}`, {
    method: "POST",
    headers: { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const texte = await rep.text();
  if (!rep.ok) throw new Error(`${nom} : HTTP ${rep.status} ${texte.slice(0, 200)}`);
  return (texte ? JSON.parse(texte) : null) as T;
}

async function reglage(cle: string, variable: string): Promise<string | null> {
  const env = Deno.env.get(variable);
  if (env) return env;
  return await rpc<string | null>("lire_parametre", { p_cle: cle }).catch(() => null);
}

const repondre = (statut: number, corpsJson: unknown) =>
  new Response(JSON.stringify(corpsJson), { status: statut, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return repondre(405, { erreur: "POST seulement" });
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!CLE_SERVICE || jeton !== CLE_SERVICE) return repondre(403, { erreur: "réservé au service" });
  try {
    const r = await rpc<Resume>("resume_alertes_du_jour", {});
    if (!r.a_signaler) return repondre(200, { envoye: false, raison: "rien à signaler" });
    const destinataire = await reglage("alertes_destinataire", "ALERTES_DESTINATAIRE");
    const expediteur = await reglage("alertes_expediteur", "ALERTES_EXPEDITEUR");
    const cle = Deno.env.get("BREVO_API_KEY");
    if (!destinataire || !expediteur || !cle) {
      return repondre(503, { envoye: false, erreur: "destinataire, expéditeur ou clé Brevo manquant" });
    }
    const rep = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: expediteur, name: "Omega — alertes" },
        to: [{ email: destinataire }],
        subject: sujet(r, ENVIRONNEMENT),
        textContent: corps(r, ENVIRONNEMENT),
      }),
    });
    if (!rep.ok) throw new Error(`Brevo : HTTP ${rep.status} ${(await rep.text()).slice(0, 200)}`);
    await rep.body?.cancel();
    const marquees = await rpc<number>("marquer_alertes_envoyees", { p_ids: r.alertes.map((a) => String(a.id)) });
    console.log(JSON.stringify({ niveau: "info", envoye: true, alertes: r.alertes_total, marquees }));
    return repondre(200, { envoye: true, alertes: r.alertes_total, marquees });
  } catch (e) {
    console.error(JSON.stringify({ niveau: "erreur", message: (e as Error).message }));
    return repondre(502, { envoye: false, erreur: (e as Error).message });
  }
});
