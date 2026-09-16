import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle de la confirmation de rendez-vous — 16/09/2026

   Séparé de la route qui l'envoie (app/api/reservation/confirmation)
   pour deux raisons, la seconde étant la vraie :
   · le texte français se relit ici, sans les histoires de PostgREST ;
   · l'aperçu servi en développement (…/confirmation/apercu) importe CE
     fichier. Ce que les associés regardent est donc, au caractère près,
     ce qui part chez le client — pas une maquette qui dérive au premier
     changement.

   ── LE VOCABULAIRE ───────────────────────────────────────────────────
   « Votre créneau est BLOQUÉ » a tenu une heure, le 16/09. Un associé :
   « le mot bloqué peut faire penser à une annulation ». Il a raison — en
   français courant, ce qui est bloqué est empêché, et c'est le premier
   mot que le client lit, dans l'objet, avant même d'ouvrir. Le site dit
   « Créneau réservé », la base marque `statut = 'confirme'` : l'e-mail
   était le seul endroit à parler autrement. Il dit maintenant CONFIRMÉ,
   partout.

   Ce n'est pas contradictoire avec le fait que le lien de
   visioconférence arrive plus tard : le rendez-vous, lui, est bien pris.

   ── LA MISE EN PAGE ──────────────────────────────────────────────────
   Demande des associés : « rends ça plus pro, améliore la mise en page ».
   Ce qui a changé, et pourquoi :

   · L'HEURE EST LE SUJET DU MESSAGE. Elle était une ligne de tableau
     parmi quatre, du même poids que « Lieu ». Elle est maintenant en
     vedette à 30 px, la date au-dessus, le fuseau en dessous — on la lit
     sans lire le reste, ce qui est exactement l'usage qu'on fait de cet
     e-mail trois semaines plus tard.
   · UN FICHIER D'AGENDA EN PIÈCE JOINTE (.ics). C'est ce qui manquait
     vraiment : un clic et le rendez-vous est dans l'agenda du client.
     Aucune décoration ne réduit autant les rendez-vous manqués.
   · UNE LIGNE D'AVANT-PREMIÈRE (le « preheader »). C'est le texte que la
     boîte affiche à côté de l'objet, avant ouverture. Sans elle, Gmail y
     met les premiers mots du corps (« Bonjour Marc, nous avons… ») ; avec
     elle, il y met la date et l'heure. Elle est masquée dans le message.
   · UN FILET SOUS L'ENTÊTE et des marges de 32 : la carte a une tête, un
     corps et un pied, au lieu d'un empilement.

   ── LES RÈGLES QUI NE BOUGENT PAS ────────────────────────────────────
   1. TABLEAUX, PAS DE `flex` NI DE `grid`. Outlook sur Windows rend le
      HTML avec le moteur de Word : une mise en page en flex s'y effondre
      en colonne de texte nu. Tout est en <table role="presentation">,
      largeur 600, styles EN LIGNE — aucune feuille de style, Gmail
      retire les <style> dans certains contextes.
   2. LE MAIL DOIT TENIR SANS SES IMAGES. La plupart des clients les
      bloquent tant que le destinataire ne les autorise pas. Le logo est
      doublé du mot-symbole « Omega.AI » EN TEXTE, juste à côté.
   3. AUCUN BOUTON, AUCUN APLAT DE COULEUR. Un accusé de réception qui
      ressemble à une infolettre part dans l'onglet Promotions de Gmail —
      or celui-ci doit arriver en boîte principale.
   4. UN DOCUMENT COMPLET, PAS UN FRAGMENT. `<!doctype html>` et
      `color-scheme: light` : sans eux, les clients en thème sombre
      inversent les couleurs et le gris clair vire au gris sale.
   5. LE LIEN DE VISIOCONFÉRENCE N'EST PAS PROMIS COMME AUTOMATIQUE. Il
      n'existe nulle part dans le système ; le texte dit qu'il parvient
      avant le rendez-vous, ce que les associés font à la main.
   ══════════════════════════════════════════════════════════════════════ */

/* Le site, en absolu : dans un e-mail il n'y a pas d'origine relative. */
const SITE = "https://omegaai.fr";
/* Le mot-symbole servi par le site lui-même (public/logo-pegase.png,
   512 × 512, marque noire sur fond transparent — la version
   `logo-pegase-blanc.png` serait invisible sur le fond blanc du mail). */
const LOGO = `${SITE}/logo-pegase.png`;

const POLICE =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

/* Les identifiants de format tels qu'ils partent de PriseDeCreneau
   (lib/reservation.ts, PROFILS[].formules[].id). Le repli rend le code tel
   quel plutôt qu'une chaîne vide : mieux vaut « process » dans un e-mail
   qu'un trou, et ça se voit tout de suite en relecture. */
export const FORMATS: Record<string, string> = {
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

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dateLongue(iso: string): string {
  const d = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: FUSEAU,
  }).format(new Date(iso));
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/* « 9 h » et « 10 h 30 », jamais « 09 h 00 » : l'heure ronde ne s'écrit
   pas avec ses minutes en français, et le zéro initial est une notation
   d'horloge numérique, pas de phrase. */
export function heure(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: FUSEAU,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return m === "00" ? `${h} h` : `${h} h ${m}`;
}

/* ─────────────────────────────────────────────────────────────────────
   LE FICHIER D'AGENDA

   Un .ics minimal, en UTC (le `Z` final) : pas de VTIMEZONE à embarquer,
   et aucun risque qu'un agenda règlé sur Paris place le rendez-vous à la
   mauvaise heure. C'est le client de messagerie qui le repose dans le
   fuseau du destinataire.

   METHOD:PUBLISH et non REQUEST : REQUEST ferait une invitation avec
   demande de réponse (accepter / refuser), qui attend un ATTENDEE et
   renverrait des réponses que personne ne traite. PUBLISH donne ce qu'on
   veut — « ajouter à mon agenda », sans RSVP.

   Le pliage à 75 octets et l'échappement des virgules ne sont pas du
   zèle : la RFC 5545 les impose, et Outlook refuse un fichier qui ne les
   respecte pas.
   ───────────────────────────────────────────────────────────────────── */

function echapperIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function horodatageIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Plie les lignes à 75 octets, la suite préfixée d'une espace (RFC 5545). */
function plier(ligne: string): string {
  const octets = Buffer.from(ligne, "utf8");
  if (octets.length <= 75) return ligne;
  const morceaux: string[] = [];
  let debut = 0;
  while (debut < octets.length) {
    let fin = Math.min(debut + (debut === 0 ? 75 : 74), octets.length);
    /* ne pas couper au milieu d'un caractère multi-octet */
    while (fin > debut && fin < octets.length && (octets[fin] & 0xc0) === 0x80) fin--;
    morceaux.push((debut === 0 ? "" : " ") + octets.subarray(debut, fin).toString("utf8"));
    debut = fin;
  }
  return morceaux.join("\r\n");
}

function fichierAgenda(p: {
  id: string;
  format: string;
  debutISO: string;
  dureeMin: number;
  maintenant: Date;
}): string {
  const debut = new Date(p.debutISO);
  const fin = new Date(debut.getTime() + p.dureeMin * 60_000);
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omega.AI//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.id}@omegaai.fr`,
    `DTSTAMP:${horodatageIcs(p.maintenant)}`,
    `DTSTART:${horodatageIcs(debut)}`,
    `DTEND:${horodatageIcs(fin)}`,
    `SUMMARY:${echapperIcs(`${p.format} — Omega.AI`)}`,
    `DESCRIPTION:${echapperIcs(
      "Rendez-vous en visioconférence. Le lien vous parvient avant le rendez-vous. " +
        `Une question : ${COURRIEL}`,
    )}`,
    "LOCATION:Visioconférence",
    `ORGANIZER;CN=Omega.AI:mailto:${COURRIEL}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lignes.map(plier).join("\r\n") + "\r\n";
}

/* ─────────────────────────────────────────────────────────────────────
   LES BRIQUES DE LA CARTE
   Les valeurs qui arrivent ici sont DÉJÀ échappées : ces fonctions
   assemblent, elles ne protègent pas.
   ───────────────────────────────────────────────────────────────────── */

/** Le texte que la boîte affiche à côté de l'objet, avant ouverture.
    Masqué dans le message : hauteur nulle, opacité nulle, hors écran —
    les trois, parce qu'aucune seule ne suffit sur tous les clients. Les
    caractères invisibles qui suivent repoussent le vrai corps hors de
    l'aperçu, sinon Gmail colle la suite du texte derrière. */
function avantPremiere(texte: string): string {
  return (
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;` +
    `mso-hide:all;font-size:1px;line-height:1px;color:#ffffff">${texte}` +
    "&#847;&zwnj;&nbsp;".repeat(60) +
    `</div>`
  );
}

function enveloppe(titre: string, preheader: string, interieur: string): string {
  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${titre}</title></head>` +
    `<body style="margin:0;padding:0;background:#f4f4f5;-webkit-font-smoothing:antialiased">` +
    avantPremiere(preheader) +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="background:#f4f4f5"><tr><td align="center" style="padding:32px 12px 48px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" ` +
    `style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px">` +
    interieur +
    `</table></td></tr></table></body></html>`
  );
}

/* L'entête : la marque, et un filet. Le logo et le mot-symbole sont deux
   cellules d'un même tableau — pas un `inline-block`, qu'Outlook place
   mal dès que la ligne s'allonge. */
const ENTETE =
  `<tr><td style="padding:24px 32px 20px;border-bottom:1px solid #f0f0f2">` +
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
  `<td style="padding-right:9px;vertical-align:middle">` +
  `<img src="${LOGO}" width="24" height="24" alt="Omega.AI" ` +
  `style="display:block;width:24px;height:24px;border:0"></td>` +
  `<td style="vertical-align:middle;font-family:${POLICE};font-size:15px;line-height:24px;` +
  `font-weight:600;letter-spacing:-0.01em;color:#050505">Omega.AI</td>` +
  `</tr></table></td></tr>`;

const PIED =
  `<tr><td style="padding:28px 32px 30px">` +
  `<div style="border-top:1px solid #f0f0f2;padding-top:18px;font-family:${POLICE};` +
  `font-size:12px;line-height:19px;color:#8a8a92">` +
  `Omega.AI · <a href="${SITE}" style="color:#8a8a92;text-decoration:underline">omegaai.fr</a> · ` +
  `<a href="mailto:${COURRIEL}" style="color:#8a8a92;text-decoration:underline">${COURRIEL}</a><br>` +
  `Ce message confirme la réservation faite sur omegaai.fr. Vous pouvez y répondre directement.` +
  `</div></td></tr>`;

function titre(t: string): string {
  return (
    `<tr><td style="padding:26px 32px 0;font-family:${POLICE};font-size:22px;line-height:30px;` +
    `font-weight:600;letter-spacing:-0.015em;color:#050505">${t}</td></tr>`
  );
}

function paragraphe(html: string, haut = 16): string {
  return (
    `<tr><td style="padding:${haut}px 32px 0;font-family:${POLICE};font-size:15px;` +
    `line-height:24px;color:#3d3d3d">${html}</td></tr>`
  );
}

export type Confirmation = {
  sujet: string;
  html: string;
  texte: string;
  /** Le fichier d'agenda, quand il y a un créneau à mettre dedans. */
  agenda?: { nom: string; contenu: string };
};

/** Compose la confirmation. Deux cas, et deux seulement : avec créneau
    (audit, réglage) ou sans (les formats sur devis, qui n'ont pas de
    calendrier). `maintenant` n'est un paramètre que pour l'aperçu, qui a
    besoin d'un horodatage stable — l'envoi réel prend l'heure courante. */
export function composerConfirmation(p: {
  id: string;
  prenom: string;
  formule: string;
  creneauISO: string | null;
  dureeMin: number | null;
  maintenant?: Date;
}): Confirmation {
  const format = FORMATS[p.formule] ?? p.formule;
  const prenom = (p.prenom || "").trim();
  const quand = p.creneauISO;
  const duree = p.dureeMin && p.dureeMin > 0 ? p.dureeMin : null;

  if (!quand) {
    const sujet = "Votre demande est bien reçue";
    return {
      sujet,
      html: enveloppe(
        sujet,
        `Nous vous répondons le jour même, avec un devis ou les questions qui le précèdent.`,
        ENTETE +
          titre("Votre demande est bien reçue") +
          paragraphe(
            `Bonjour ${echapper(prenom)}, votre demande ` +
              `(<strong style="color:#050505">${echapper(format)}</strong>) est enregistrée.`,
            14,
          ) +
          paragraphe("Nous vous répondons le jour même, avec un devis ou les questions qui le précèdent.") +
          paragraphe("Vous pouvez répondre à ce message pour ajouter quoi que ce soit.") +
          PIED,
      ),
      texte: [
        `Bonjour ${prenom},`,
        "",
        `Votre demande (${format}) est enregistrée.`,
        "",
        "Nous vous répondons le jour même, avec un devis ou les questions qui le précèdent.",
        "",
        "Vous pouvez répondre à ce message pour ajouter quoi que ce soit.",
        "",
        "À bientôt,",
        "L'équipe Omega.AI",
        "",
        `Omega.AI · omegaai.fr · ${COURRIEL}`,
      ].join("\n"),
    };
  }

  const jour = dateLongue(quand);
  const h = heure(quand);
  const sujet = `Rendez-vous confirmé — ${jour.toLowerCase()} à ${h}`;
  const agenda = duree
    ? {
        nom: "rendez-vous-omega.ics",
        contenu: fichierAgenda({
          id: p.id,
          format,
          debutISO: quand,
          dureeMin: duree,
          maintenant: p.maintenant ?? new Date(),
        }),
      }
    : undefined;

  /* Le bloc de tête : la date, puis l'heure en vedette, puis le fuseau.
     Un seul tableau d'une colonne — les trois lignes doivent rester
     collées quelle que soit la largeur, y compris sur téléphone. */
  const vedette =
    `<tr><td style="padding:22px 32px 0">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="background:#fafafa;border:1px solid #ededf0;border-radius:12px">` +
    `<tr><td style="padding:20px 22px 18px;font-family:${POLICE}">` +
    `<div style="font-size:15px;line-height:22px;font-weight:600;color:#050505">${echapper(jour)}</div>` +
    `<div style="font-size:30px;line-height:38px;font-weight:600;letter-spacing:-0.02em;color:#050505">${echapper(h)}</div>` +
    `<div style="font-size:13px;line-height:19px;color:#71717a">heure de Guadeloupe</div>` +
    `</td></tr>` +
    `<tr><td style="padding:0 22px"><div style="border-top:1px solid #ededf0"></div></td></tr>` +
    `<tr><td style="padding:14px 22px 16px;font-family:${POLICE};font-size:14px;line-height:21px;color:#52525b">` +
    `<strong style="color:#050505;font-weight:600">${echapper(format)}</strong>` +
    (duree ? ` · ${duree} min` : "") +
    ` · en visioconférence</td></tr>` +
    `</table></td></tr>`;

  return {
    sujet,
    html: enveloppe(
      sujet,
      `${jour} à ${h}, heure de Guadeloupe · ${format}${duree ? `, ${duree} min` : ""}, en visioconférence.`,
      ENTETE +
        titre("Votre rendez-vous est confirmé") +
        paragraphe(`Bonjour ${echapper(prenom)}, nous vous attendons à cette date.`, 14) +
        vedette +
        paragraphe("Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.", 22) +
        (agenda
          ? paragraphe(
              "Le rendez-vous est en pièce jointe : ouvrez-la pour l'ajouter à votre agenda.",
            )
          : "") +
        paragraphe(
          "Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.",
        ) +
        PIED,
    ),
    texte: [
      `Bonjour ${prenom},`,
      "",
      "Votre rendez-vous est confirmé. Nous vous attendons à cette date :",
      "",
      `  ${jour} à ${h} (heure de Guadeloupe)`,
      `  ${format}${duree ? ` · ${duree} min` : ""} · en visioconférence`,
      "",
      "Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.",
      ...(agenda ? ["", "Le rendez-vous est en pièce jointe : ouvrez-la pour l'ajouter à votre agenda."] : []),
      "",
      "Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.",
      "",
      "À bientôt,",
      "L'équipe Omega.AI",
      "",
      `Omega.AI · omegaai.fr · ${COURRIEL}`,
    ].join("\n"),
    agenda,
  };
}
