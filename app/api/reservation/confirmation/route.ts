import { composerConfirmation, FORMATS } from "@/lib/mail/confirmation";
import { COURRIEL } from "@/lib/reservation";
import { lienVisio } from "@/lib/visio";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { limiteDepassee, lireJson, origineRefusee } from "@/lib/securite";

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

   Ce fichier ne fait que DEUX choses : lire la demande, et l'envoyer. Le
   texte et la mise en forme vivent dans lib/mail/confirmation.ts, avec
   les raisons de chaque parti pris (tableaux plutôt que flex, marque
   lisible sans les images, aucun bouton). L'aperçu de développement, en
   dessous de cette route, importe le même module.

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

   LE LIEN DE VISIOCONFÉRENCE (16/09, second passage)
   Le mail annonçait un lien « avant le rendez-vous », à fabriquer à la
   main. Il porte maintenant une salle Google Meet ouverte au moment de
   l'envoi par lib/visio.ts, qui pose aussi le rendez-vous dans l'agenda
   d'Omega. Cet appel est le SEUL du flux qu'on attend vraiment (`await`)
   avant de composer — mais il ne peut pas faire échouer l'envoi : en
   panne, sans autorisation ou sans variables, il rend `null` et le mail
   repart avec sa phrase d'attente. Un rendez-vous confirmé sans lien
   vaut mieux qu'un client qui ne reçoit rien.

   Variables d'environnement, projet Vercel du SITE (pegase-site2) :
   · RESEND_API_KEY — la clé du compte Resend ;
   · MAIL_EXPEDITEUR — facultatif, « Omega <bonjour@auth.omegaai.fr> » par
     défaut (sous-domaine déjà vérifié chez Resend) ;
   · MAIL_REPONDRE_A — facultatif, l'adresse qui reçoit les réponses du
     client ; à défaut contact@omegaai.fr ;
   · GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET /
     GOOGLE_OAUTH_REFRESH_TOKEN, et GOOGLE_CALENDAR_ID ou MEET_LIEN — la
     visioconférence ; tout est détaillé en tête de lib/visio.ts.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const API_ENVOI = "https://api.resend.com/emails";
const EXPEDITEUR_PAR_DEFAUT = "Omega <bonjour@auth.omegaai.fr>";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function POST(req: Request) {
  /* 25/09 — mêmes gardes que /api/contact (lib/securite.ts). Une
     confirmation par réservation, c'est la SQL qui le garantit ; ici on
     empêche seulement une boucle de cogner la base et le service d'envoi.
     Dix appels par heure et par adresse : un vrai visiteur en fait un. */
  if (origineRefusee(req)) {
    return Response.json({ ok: false, motif: "origine", envoye: false }, { status: 403 });
  }
  if (limiteDepassee("confirmation", req, 10, 3_600_000, 60)) {
    return Response.json({ ok: false, motif: "trop", envoye: false }, { status: 429 });
  }
  const corps = (await lireJson(req, 2_000)) as Record<string, unknown> | null | undefined;
  if (corps === undefined) {
    return Response.json({ ok: false, motif: "requete" }, { status: 400 });
  }
  const id = typeof corps?.id === "string" ? corps.id.trim() : "";
  if (!UUID.test(id)) {
    return Response.json({ ok: false, motif: "identifiant" }, { status: 400 });
  }

  /* ——— 1. la clé D'ABORD, avant de consommer la demande ———
     `demande_pour_confirmation()` marque l'envoi DANS l'instruction qui
     lit la ligne : appelée sans pouvoir envoyer derrière, elle brûlerait
     l'unique tentative de cette réservation — marquée confirmée, jamais
     partie. Tant que la clé n'est pas posée sur le projet Vercel du site,
     on ne touche donc pas à la base. Constaté le 16/09, juste après
     l'application de la migration : la clé n'y était pas encore, et la
     première vraie réservation aurait perdu sa confirmation en silence. */
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error("[confirmation] RESEND_API_KEY absente : confirmation non envoyée");
    return Response.json({ ok: false, motif: "indisponible", envoye: false }, { status: 503 });
  }

  /* ——— 2. lire la demande, et marquer l'envoi dans le même mouvement ——— */
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

  /* ——— 3. ouvrir la salle de visioconférence ———
     Seulement quand il y a un créneau : les formats sur devis n'ont pas
     de date, donc rien à poser dans un agenda. Le titre et la
     description sont ce que LE CLIENT verra dans son invitation s'il
     ouvre l'événement — d'où le nom de l'entreprise quand on l'a. */
  const format = FORMATS[ligne.formule] ?? ligne.formule;
  const nomComplet = `${ligne.prenom} ${ligne.nom}`.trim();
  const visio =
    ligne.creneau_debut && ligne.duree_min && ligne.duree_min > 0
      ? await lienVisio({
          id,
          titre: `${format} — ${ligne.entreprise?.trim() || nomComplet || "Omega.AI"}`,
          description:
            `${format} réservé sur omegaai.fr.\n` +
            `${nomComplet}${ligne.entreprise?.trim() ? ` · ${ligne.entreprise.trim()}` : ""}\n` +
            `${ligne.email}\n` +
            `Parcours : ${ligne.parcours}`,
          debutISO: ligne.creneau_debut,
          dureeMin: ligne.duree_min,
          invite: nomComplet ? { email: ligne.email, nom: nomComplet } : { email: ligne.email, nom: ligne.email },
        })
      : null;

  /* ——— 4. composer ——— */
  const { sujet, html, texte, agenda } = composerConfirmation({
    id,
    prenom: ligne.prenom,
    formule: ligne.formule,
    creneauISO: ligne.creneau_debut,
    dureeMin: ligne.duree_min,
    lienVisio: visio,
  });

  /* ——— 5. envoyer ——— */
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
        /* Le fichier d'agenda, encodé en base64 comme l'attend le
           service d'envoi. Absent quand la demande n'a pas de créneau
           (formats sur devis) : il n'y aurait rien à mettre dedans. */
        ...(agenda
          ? {
              attachments: [
                {
                  filename: agenda.nom,
                  content: Buffer.from(agenda.contenu, "utf8").toString("base64"),
                },
              ],
            }
          : {}),
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

  return Response.json({ ok: true, envoye: true, visio: Boolean(visio) });
}
