import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   POST /api/contact — le formulaire du service client part par e-mail
   (08/09/2026)

   Reçoit les champs de components/contact/FormulaireContact.tsx et envoie
   UN e-mail à contact@omegaai.fr (COURRIEL, lib/reservation.ts) avec
   l'adresse du client en « répondre à » : depuis leur boîte, les associés
   répondent d'un clic et le client reçoit la réponse à son adresse.

   Transport : un appel HTTP au service d'envoi déjà utilisé par le
   cockpit (POST https://api.resend.com/emails, même forme de corps que
   pegase-dashboard/lib/mail/resend.ts), sans dépendance npm.

   Variables d'environnement, à poser dans Vercel sur le projet du SITE
   (pegase-site2) — la même clé que le cockpit peut servir :
   · RESEND_API_KEY — sans elle, la route répond 503 « indisponible » et
     le formulaire propose WhatsApp et l'adresse : rien ne casse ;
   · MAIL_EXPEDITEUR — facultatif, « Omega <bonjour@auth.omegaai.fr> »
     par défaut (le sous-domaine déjà vérifié chez le service d'envoi).

   Garde-fous : tailles bornées, adresse vérifiée, pot de miel (un robot
   reçoit 200 sans envoi — on ne lui apprend rien), délai 10 s, aucune
   clé dans les journaux. Pas de stockage : le message ne vit que dans la
   boîte de l'agence.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const API_ENVOI = "https://api.resend.com/emails";
const EXPEDITEUR_PAR_DEFAUT = "Omega <bonjour@auth.omegaai.fr>";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SUJETS: Record<string, string> = {
  installation: "Mon installation ou ma réunion",
  abonnement: "Mon abonnement ou une facture",
  poste: "Un poste en service",
  application: "L'application",
  site: "Mon site",
  autre: "Autre chose",
};

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : "";
}

function echapper(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  let corps: Record<string, unknown>;
  try {
    corps = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, motif: "requete" }, { status: 400 });
  }

  /* robot pris au pot de miel : on fait comme si tout allait bien */
  if (texte(corps.x7, 10)) return Response.json({ ok: true });

  const prenom = texte(corps.prenom, 80);
  const nom = texte(corps.nom, 80);
  const entreprise = texte(corps.entreprise, 120);
  const email = texte(corps.email, 160).toLowerCase();
  const telephone = texte(corps.telephone, 40);
  const sujetCle = texte(corps.sujet, 20);
  const message = typeof corps.message === "string" ? corps.message.trim().slice(0, 4000) : "";
  const sujet = SUJETS[sujetCle] ?? "Autre chose";

  if (!prenom || !nom || !EMAIL.test(email) || !SUJETS[sujetCle] || message.length < 10) {
    return Response.json({ ok: false, motif: "champs" }, { status: 400 });
  }

  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error("[contact] RESEND_API_KEY absente : message non transmis (", sujet, ")");
    return Response.json({ ok: false, motif: "indisponible" }, { status: 503 });
  }

  const qui = `${prenom} ${nom}${entreprise ? ` (${entreprise})` : ""}`;
  const lignes = [
    `De : ${qui}`,
    `E-mail : ${email}`,
    telephone ? `Téléphone / WhatsApp : ${telephone}` : null,
    `Demande : ${sujet}`,
    "",
    message,
    "",
    "— Envoyé depuis le formulaire du service client, omegaai.fr/contact. Répondre à ce message répond au client.",
  ].filter((l): l is string => l !== null);

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Inter,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#050505">` +
    `<p><strong>De :</strong> ${echapper(qui)}<br><strong>E-mail :</strong> <a href="mailto:${echapper(email)}">${echapper(email)}</a>` +
    (telephone ? `<br><strong>Téléphone / WhatsApp :</strong> ${echapper(telephone)}` : "") +
    `<br><strong>Demande :</strong> ${echapper(sujet)}</p>` +
    `<p style="white-space:pre-wrap;border-left:3px solid #e9cd91;padding-left:12px">${echapper(message)}</p>` +
    `<p style="color:#616161;font-size:13px">Envoyé depuis le formulaire du service client, omegaai.fr/contact. Répondre à ce message répond au client.</p></div>`;

  try {
    const r = await fetch(API_ENVOI, {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_EXPEDITEUR?.trim() || EXPEDITEUR_PAR_DEFAUT,
        to: [COURRIEL],
        reply_to: email,
        subject: `Service client — ${sujet} — ${qui}`,
        text: lignes.join("\n"),
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { message?: string } | null;
      console.error("[contact] envoi refusé :", r.status, j?.message ?? "");
      return Response.json({ ok: false, motif: "envoi" }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[contact] envoi :", e instanceof Error ? e.message : "injoignable");
    return Response.json({ ok: false, motif: "envoi" }, { status: 502 });
  }
}
