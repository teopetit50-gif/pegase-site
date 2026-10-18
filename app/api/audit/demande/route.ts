import { createHash } from "node:crypto";
import { COURRIEL } from "@/lib/reservation";
import { controlerDemande } from "@/lib/demande-audit";
import { composerAvisOmega, composerConfirmation } from "@/lib/mail/demande-audit";
import { adresseIp, appelPorte, lireJson, origineRefusee } from "@/lib/securite";

/* ═══════════════════════════════════════════════════════════
   POST /api/audit/demande — la demande d'audit de /reserver-un-audit (18/10/2026)

   Reçoit le formulaire de la page, le contrôle (lib/demande-audit.ts), puis
   envoie DEUX mails par le service d'envoi déjà utilisé par /api/contact :
   · à Omega : la fiche complète, l'adresse du visiteur en « répondre à » ;
   · au visiteur : la confirmation, avec le lien vers le choix du créneau.

   Le visiteur n'est confirmé à l'écran que si SON mail est parti. Si le mail à
   Omega passe mais pas celui du visiteur, on répond 502 : le formulaire affiche
   alors l'adresse de contact, et Omega a déjà la demande.

   Variables d'environnement, sur le projet Vercel du SITE (pegase-site2) :
   · RESEND_API_KEY — sans elle, la route répond 503 et rien ne part ;
   · MAIL_EXPEDITEUR — facultatif, « Omega <bonjour@auth.omegaai.fr> » par défaut.

   Garde-fous : origine vérifiée, corps borné à 16 Ko, pot de miel (champ
   `site_web` rempli = robot : on répond « ok » sans rien envoyer), champs fermés
   sur les listes du formulaire, limite d'envois comptée par la porte
   routes-site (même compteur que le formulaire de contact).
   ═══════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const API_ENVOI = "https://api.resend.com/emails";
const EXPEDITEUR_PAR_DEFAUT = "Omega <bonjour@auth.omegaai.fr>";

/* La limite est une protection contre les robots, pas une règle commerciale :
   si la porte est injoignable, on envoie (comme /api/contact). */
async function envoiAutorise(req: Request): Promise<boolean> {
  const empreinte = createHash("sha256").update(adresseIp(req)).digest("hex").slice(0, 32);
  try {
    const porte = await appelPorte(req, "limiter_contact", { ip: empreinte });
    if (porte?.ok) return (await porte.json()) !== false;
    return true;
  } catch {
    return true;
  }
}

async function envoyer(
  cle: string,
  expediteur: string,
  mail: { destinataire: string; sujet: string; texte: string; html: string; reponseA: string },
): Promise<boolean> {
  try {
    const r = await fetch(API_ENVOI, {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: expediteur,
        to: [mail.destinataire],
        reply_to: mail.reponseA,
        subject: mail.sujet,
        text: mail.texte,
        html: mail.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { message?: string } | null;
      console.error("[audit] envoi refusé :", r.status, j?.message ?? "");
      return false;
    }
    return true;
  } catch (e) {
    console.error("[audit] envoi :", e instanceof Error ? e.message : "injoignable");
    return false;
  }
}

export async function POST(req: Request) {
  if (origineRefusee(req)) {
    return Response.json({ ok: false, motif: "origine" }, { status: 403 });
  }
  const corps = (await lireJson(req, 16_000)) as Record<string, unknown> | undefined;
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) {
    return Response.json({ ok: false, motif: "requete" }, { status: 400 });
  }

  /* robot pris au pot de miel : on fait comme si tout allait bien */
  if (typeof corps.site_web === "string" && corps.site_web.trim()) {
    return Response.json({ ok: true });
  }

  const controle = controlerDemande(corps);
  if (!controle.ok) {
    return Response.json({ ok: false, motif: "champs", champs: controle.champs }, { status: 400 });
  }
  const demande = controle.demande;

  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error("[audit] RESEND_API_KEY absente : demande non transmise");
    return Response.json({ ok: false, motif: "indisponible" }, { status: 503 });
  }

  if (!(await envoiAutorise(req))) {
    console.warn("[audit] limite d'envoi atteinte : demande refusée");
    return Response.json({ ok: false, motif: "limite" }, { status: 429 });
  }

  const expediteur = process.env.MAIL_EXPEDITEUR?.trim() || EXPEDITEUR_PAR_DEFAUT;
  const avis = composerAvisOmega(demande);
  const confirmation = composerConfirmation(demande);

  /* Omega d'abord : la demande est captée même si le mail au visiteur échoue */
  const omega = await envoyer(cle, expediteur, { destinataire: COURRIEL, ...avis });
  if (!omega) console.error("[audit] mail à Omega non parti : demande à reprendre à la main");

  const visiteur = await envoyer(cle, expediteur, {
    destinataire: demande.email,
    ...confirmation,
  });
  if (!visiteur) {
    return Response.json({ ok: false, motif: "envoi" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
