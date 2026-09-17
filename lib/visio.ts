/* ══════════════════════════════════════════════════════════════════════
   LE LIEN DE VISIOCONFÉRENCE — 16/09/2026

   Demande de l'associé : « quand on envoie le mail de confirmation de
   rendez-vous, il faut un lien Google Meet dedans directement ». Jusqu'ici
   le mail promettait un lien « avant le rendez-vous », que quelqu'un
   devait fabriquer et envoyer à la main — un geste oublié un jour sur
   deux, et un client qui ré-écrit la veille pour le réclamer.

   Ce module rend UNE chose : l'URL de la visio, ou `null`. Il ne compose
   rien et n'envoie rien ; le mail et le fichier d'agenda se contentent
   de la recevoir.

   ── TROIS ÉTAGES, DU MEILLEUR AU DERNIER ─────────────────────────────
   1. UN VRAI LIEN PAR RENDEZ-VOUS, créé dans l'agenda Google d'Omega
      (Calendar API, `conferenceData.createRequest`). C'est le bon cas :
      une salle propre par client, et le rendez-vous se pose du même coup
      dans l'agenda — plus besoin de le recopier. Demande les variables
      GOOGLE_OAUTH_* décrites plus bas.
   2. UNE SALLE FIXE (MEET_LIEN), si l'agenda n'est pas branché : la même
      adresse pour tous les rendez-vous. Ça tient parce qu'on ne reçoit
      qu'un client à la fois, mais deux rendez-vous qui se chevauchent se
      retrouveraient dans la même pièce — c'est un dépannage, pas la
      cible.
   3. RIEN. Le mail reprend alors sa phrase d'avant (« nous revenons vers
      vous avec le lien »). Aucune réservation ne casse parce que Google
      a répondu de travers : toute erreur ici rend `null`, et le mail part
      quand même.

   ── POURQUOI UN JETON DE RAFRAÎCHISSEMENT, ET PAS LE COMPTE DE SERVICE
   Le compte de service qui lit déjà le Sheet (pegase-dashboard,
   lib/admin/google.ts) ne peut PAS créer de Meet : Google réserve la
   création de salle aux comptes humains (ou à un compte de service qui
   emprunte l'identité d'un utilisateur Workspace, ce que nous n'avons
   pas). Le lien doit donc naître dans l'agenda d'un vrai compte Google —
   celui d'Omega —, autorisé une fois pour toutes par un jeton de
   rafraîchissement.

   ── LES VARIABLES, PROJET VERCEL DU SITE ─────────────────────────────
   · GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET — l'identifiant
     OAuth « application de bureau » créé dans la console Google Cloud,
     API Google Calendar activée ;
   · GOOGLE_OAUTH_REFRESH_TOKEN — obtenu une fois, en autorisant le
     compte Google d'Omega sur la portée
     https://www.googleapis.com/auth/calendar.events ;
   · GOOGLE_CALENDAR_ID — facultatif, « primary » par défaut ;
   · MEET_LIEN — facultatif, la salle fixe de l'étage 2.

   Tant que rien n'est posé, on est à l'étage 3 et le site se comporte
   exactement comme avant ce fichier.
   ══════════════════════════════════════════════════════════════════════ */

const JETON = "https://oauth2.googleapis.com/token";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars";
/* Le même fuseau que partout ailleurs : le créneau arrive en ISO UTC,
   mais l'événement se lit mieux dans l'agenda avec son fuseau d'origine. */
const FUSEAU = "America/Guadeloupe";

type Invite = { email: string; nom: string };

/* L'identifiant d'événement, dérivé de l'identifiant de la demande.
   Google n'accepte que du base32hex minuscule (0-9, a-v) : les chiffres
   hexadécimaux d'un UUID en font partie, seuls les tirets gênent. En
   dériver plutôt que d'en tirer un au hasard rend l'appel REJOUABLE — un
   second essai tombe sur 409 « duplicate », on relit l'événement et on
   reprend son lien au lieu d'ouvrir une deuxième salle. */
function idEvenement(id: string): string {
  return `rdv${id.replace(/-/g, "").toLowerCase()}`;
}

function lienDeLEvenement(e: unknown): string | null {
  const ev = e as {
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  } | null;
  if (ev?.hangoutLink) return ev.hangoutLink;
  const video = ev?.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video");
  return video?.uri ?? null;
}

async function jetonAcces(): Promise<string | null> {
  const client_id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const client_secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refresh_token = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (!client_id || !client_secret || !refresh_token) return null;

  const r = await fetch(JETON, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id, client_secret, refresh_token, grant_type: "refresh_token" }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!r.ok) {
    /* Le cas qui arrivera vraiment : un jeton révoqué (mot de passe
       Google changé, autorisation retirée, projet en mode test dont le
       jeton expire au bout de 7 jours). On le dit clairement dans les
       traces, parce que le symptôme côté client est muet — un mail sans
       lien. */
    console.error("[visio] jeton Google refusé :", r.status, (await r.text()).slice(0, 200));
    return null;
  }
  const j = (await r.json()) as { access_token?: string };
  return j.access_token ?? null;
}

/** Crée l'événement dans l'agenda d'Omega et rend son lien Meet. */
async function lienGoogle(p: {
  id: string;
  titre: string;
  description: string;
  debutISO: string;
  dureeMin: number;
  invite?: Invite;
}): Promise<string | null> {
  const acces = await jetonAcces();
  if (!acces) return null;

  const agenda = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID?.trim() || "primary");
  const eventId = idEvenement(p.id);
  const debut = new Date(p.debutISO);
  const fin = new Date(debut.getTime() + p.dureeMin * 60_000);

  const corps = {
    id: eventId,
    summary: p.titre,
    description: p.description,
    start: { dateTime: debut.toISOString(), timeZone: FUSEAU },
    end: { dateTime: fin.toISOString(), timeZone: FUSEAU },
    /* Le client est invité pour qu'il apparaisse sur la fiche de
       l'événement — mais `sendUpdates=none` : c'est NOTRE mail qui
       annonce le rendez-vous, une invitation Google par-dessus ferait
       deux messages pour une seule date. */
    ...(p.invite ? { attendees: [{ email: p.invite.email, displayName: p.invite.nom }] } : {}),
    conferenceData: {
      createRequest: {
        requestId: eventId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const r = await fetch(
    `${CALENDAR}/${agenda}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${acces}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );

  /* 409 : l'événement existe déjà (un second appel pour la même
     réservation). On relit le lien au lieu d'en créer un autre. */
  if (r.status === 409) {
    const relu = await fetch(`${CALENDAR}/${agenda}/events/${eventId}`, {
      headers: { Authorization: `Bearer ${acces}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!relu.ok) return null;
    return lienDeLEvenement(await relu.json());
  }

  if (!r.ok) {
    console.error("[visio] agenda refusé :", r.status, (await r.text()).slice(0, 300));
    return null;
  }

  const lien = lienDeLEvenement(await r.json());
  if (!lien) {
    /* L'événement est créé mais sans salle : Google le fait quand le
       compte n'a pas le droit d'ouvrir un Meet. L'événement reste dans
       l'agenda, le mail repart sans lien plutôt qu'avec une adresse
       morte. */
    console.error("[visio] événement créé sans salle Meet :", eventId);
  }
  return lien;
}

/** Le lien de visio pour une demande, ou `null` si rien n'est branché.
    Ne lève jamais : un rendez-vous vaut mieux sans lien que pas du tout. */
export async function lienVisio(p: {
  id: string;
  titre: string;
  description: string;
  debutISO: string;
  dureeMin: number;
  invite?: Invite;
}): Promise<string | null> {
  try {
    const google = await lienGoogle(p);
    if (google) return google;
  } catch (e) {
    console.error("[visio] échec de la création :", e instanceof Error ? e.message : e);
  }
  const fixe = process.env.MEET_LIEN?.trim();
  return fixe && /^https?:\/\//i.test(fixe) ? fixe : null;
}
