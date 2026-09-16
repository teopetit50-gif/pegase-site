import { COURRIEL } from "@/lib/reservation";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   POST /api/reservation/confirmation — l'accusé de réception du créneau
   (16/09/2026)

   Demande de l'associé : « existe-t-il un envoi d'un e-mail de
   confirmation du rendez-vous pris par le client pour un audit ? Si ça
   existe pas encore fait le. » Il n'existait pas : réserver écrivait la
   ligne dans `demandes_audit` et n'envoyait rien. Le client fermait
   l'onglet et n'avait plus aucune trace de la date qu'il venait de
   bloquer — alors que l'écran de fin lui promet, depuis le 28/08, « une
   confirmation le jour même ».

   CE QUE CET E-MAIL EST, ET N'EST PAS
   C'est un accusé de réception parti dans la seconde : il redit le
   créneau, le format et la durée, et il dit ce qui suit. Ce n'est PAS la
   confirmation de l'agence, celle qui porte le lien de visioconférence :
   ce lien n'existe nulle part dans le système, personne ne peut le
   fabriquer ici, et l'annoncer serait mentir. Le texte dit donc que le
   lien parvient avant le rendez-vous — ce que les associés font
   aujourd'hui à la main.

   D'OÙ VIENNENT LES DONNÉES
   Pas du navigateur : de la base. Le corps de la requête ne porte que
   l'identifiant rendu par `reserver_audit`, et c'est
   `demande_pour_confirmation()` (migration 2026-09-16) qui rend le nom,
   l'adresse et le créneau. Conséquence voulue : cette route ne peut pas
   servir à écrire à une adresse choisie par l'appelant — l'adresse vient
   de la ligne, le texte est fixe. Sans cela, une route publique qui
   envoie un e-mail à l'adresse qu'on lui passe est un relais à spam
   signé Omega.AI.

   La fonction SQL ne rend la ligne qu'UNE fois, et seulement dans les 30
   minutes : rejouer l'appel n'envoie pas deux fois, et un identifiant qui
   fuiterait plus tard ne rend rien.

   CE QUI SE PASSE SI RIEN N'EST CONFIGURÉ
   Rien ne casse, jamais — la réservation est déjà enregistrée quand cette
   route est appelée, et le navigateur ne regarde même pas la réponse :
   · migration pas encore appliquée → PostgREST répond PGRST202, on le lit
     comme « pas encore disponible », on journalise, on n'envoie rien ;
   · RESEND_API_KEY absente du projet Vercel du SITE → on journalise et on
     n'envoie rien. C'est l'état par défaut : au 16/09 le site déployé n'a
     aucune variable d'environnement (voir lib/supabase/config.ts), donc
     cette route reste muette tant que la clé n'y est pas posée. La même
     clé sert déjà à /api/contact.

   Variables d'environnement, projet Vercel du SITE (pegase-site2) :
   · RESEND_API_KEY — la clé du compte Resend ;
   · MAIL_EXPEDITEUR — facultatif, « Omega <bonjour@auth.omegaai.fr> » par
     défaut (sous-domaine déjà vérifié chez Resend) ;
   · MAIL_REPONDRE_A — facultatif, l'adresse qui reçoit les réponses du
     client ; à défaut contact@omegaai.fr.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const API_ENVOI = "https://api.resend.com/emails";
const EXPEDITEUR_PAR_DEFAUT = "Omega <bonjour@auth.omegaai.fr>";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Les identifiants de format tels qu'ils partent de PriseDeCreneau
   (lib/reservation.ts, PROFILS[].formules[].id). Le repli rend le code tel
   quel plutôt qu'une chaîne vide : mieux vaut « process » dans un e-mail
   qu'un trou, et ça se voit tout de suite en relecture. */
const FORMATS: Record<string, string> = {
  diagnostic: "Diagnostic",
  complet: "Audit complet",
  site: "Rendez-vous site",
  cadrage: "Cadrage",
  process: "Audit de processus",
  atelier: "Atelier sur place",
};

/* Le fuseau de l'agence. Le client a choisi son créneau en heure de
   Guadeloupe sur le site — c'est écrit sur l'écran de réservation :
   l'e-mail dit la même heure avec la même mention, sinon un client
   métropolitain lit une heure et en note une autre. */
const FUSEAU = "America/Guadeloupe";

type Ligne = {
  prenom: string;
  nom: string;
  email: string;
  entreprise: string | null;
  parcours: string;
  formule: string;
  creneau_debut: string | null;
  duree_min: number | null;
};

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateLongue(iso: string): string {
  const d = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: FUSEAU,
  }).format(new Date(iso));
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function heure(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSEAU,
  })
    .format(new Date(iso))
    .replace(":", " h ");
}

export async function POST(req: Request) {
  let corps: Record<string, unknown>;
  try {
    corps = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, motif: "requete" }, { status: 400 });
  }
  const id = typeof corps?.id === "string" ? corps.id.trim() : "";
  if (!UUID.test(id)) {
    return Response.json({ ok: false, motif: "identifiant" }, { status: 400 });
  }

  /* ——— 1. lire la demande, et marquer l'envoi dans le même mouvement ——— */
  let ligne: Ligne | null = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/demande_pour_confirmation`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_id: id }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { code?: string; message?: string } | null;
      if (j?.code === "PGRST202") {
        console.error("[confirmation] migration 2026-09-16 pas encore appliquée : rien envoyé");
        return Response.json({ ok: false, motif: "sql_absente", envoye: false });
      }
      console.error("[confirmation] lecture refusée :", r.status, j?.message ?? "");
      return Response.json({ ok: false, motif: "lecture", envoye: false });
    }
    const lignes = (await r.json()) as Ligne[];
    ligne = lignes?.[0] ?? null;
  } catch {
    return Response.json({ ok: false, motif: "reseau", envoye: false });
  }

  /* Déjà confirmée, trop ancienne, ou identifiant inconnu : les trois cas
     rendent zéro ligne et se répondent pareil. On ne dit pas lequel — la
     route est publique, et distinguer « inconnu » de « déjà envoyé »
     apprendrait à un curieux quels identifiants existent. */
  if (!ligne) return Response.json({ ok: true, envoye: false });

  /* ——— 2. le texte ——— */
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error("[confirmation] RESEND_API_KEY absente : confirmation non envoyée");
    return Response.json({ ok: false, motif: "indisponible", envoye: false }, { status: 503 });
  }

  const format = FORMATS[ligne.formule] ?? ligne.formule;
  const prenom = (ligne.prenom || "").trim();
  const quand = ligne.creneau_debut;
  const duree = ligne.duree_min ? `${ligne.duree_min} min` : null;

  const sujet = quand
    ? `Votre créneau est bloqué — ${dateLongue(quand)} à ${heure(quand)}`
    : "Votre demande est bien reçue";

  /* Deux cas, et deux seulement : avec créneau (audit, réglage) ou sans
     (les formats sur devis, qui n'ont pas de calendrier). */
  const texte = quand
    ? [
        `Bonjour ${prenom},`,
        "",
        `Votre créneau est bloqué : ${dateLongue(quand)} à ${heure(quand)}, heure de Guadeloupe — ${format}${
          duree ? `, ${duree}` : ""
        }, en visioconférence.`,
        "",
        "Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.",
        "",
        "Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.",
        "",
        "À bientôt,",
        "L'équipe Omega.AI",
        COURRIEL,
      ].join("\n")
    : [
        `Bonjour ${prenom},`,
        "",
        `Votre demande (${format}) est enregistrée. Nous vous répondons le jour même, avec un devis ou les questions qui le précèdent.`,
        "",
        "Vous pouvez répondre à ce message pour ajouter quoi que ce soit.",
        "",
        "À bientôt,",
        "L'équipe Omega.AI",
        COURRIEL,
      ].join("\n");

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Inter,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#050505">` +
    `<p>Bonjour ${echapper(prenom)},</p>` +
    (quand
      ? `<p>Votre créneau est bloqué :</p>` +
        `<p style="font-size:17px;font-weight:600;border-left:3px solid #e9cd91;padding-left:12px;margin:18px 0">` +
        `${echapper(dateLongue(quand))} à ${echapper(heure(quand))}` +
        `<span style="font-weight:400;color:#616161"> (heure de Guadeloupe)</span><br>` +
        `<span style="font-size:14px;font-weight:400;color:#3d3d3d">${echapper(format)}${
          duree ? ` · ${duree}` : ""
        } · en visioconférence</span></p>` +
        `<p>Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.</p>` +
        `<p>Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.</p>`
      : `<p>Votre demande (${echapper(format)}) est enregistrée. Nous vous répondons le jour même, avec un devis ou les questions qui le précèdent.</p>` +
        `<p>Vous pouvez répondre à ce message pour ajouter quoi que ce soit.</p>`) +
    `<p style="color:#616161;font-size:13px;margin-top:22px">L'équipe Omega.AI · ` +
    `<a href="mailto:${COURRIEL}" style="color:#616161">${COURRIEL}</a></p></div>`;

  /* ——— 3. l'envoi ——— */
  try {
    const r = await fetch(API_ENVOI, {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_EXPEDITEUR?.trim() || EXPEDITEUR_PAR_DEFAUT,
        to: [ligne.email],
        reply_to: process.env.MAIL_REPONDRE_A?.trim() || COURRIEL,
        subject: sujet,
        text: texte,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => null)) as { message?: string } | null;
      console.error("[confirmation] envoi refusé :", r.status, j?.message ?? "");
      return Response.json({ ok: false, motif: "envoi", envoye: false }, { status: 502 });
    }
  } catch {
    return Response.json({ ok: false, motif: "reseau", envoye: false }, { status: 502 });
  }

  return Response.json({ ok: true, envoye: true });
}
