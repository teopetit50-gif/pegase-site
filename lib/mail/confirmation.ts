import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle de l'accusé de réception de créneau — 16/09/2026

   Séparé de la route qui l'envoie (app/api/reservation/confirmation)
   pour deux raisons, la seconde étant la vraie :
   · le texte français se relit ici, sans les histoires de PostgREST ;
   · l'aperçu servi en développement (…/confirmation/apercu) importe CE
     fichier. Ce que les associés regardent est donc, au caractère près,
     ce qui part chez le client — pas une maquette qui dérive au premier
     changement.

   ── POURQUOI IL EST ÉCRIT COMME ÇA ───────────────────────────────────
   Demande des associés : « ajoute le logo d'Omega, rends le mail plus
   pro, c'est notre première interaction avec nos clients. » Quatre
   règles en découlent, et aucune n'est cosmétique.

   1. TABLEAUX, PAS DE `flex` NI DE `grid`. Outlook sur Windows rend le
      HTML avec le moteur de Word : une mise en page en flex s'y effondre
      en colonne de texte nu. Tout est en <table role="presentation">,
      largeur 600, styles EN LIGNE — aucune feuille de style, Gmail
      retire les <style> dans certains contextes.

   2. LE MAIL DOIT TENIR SANS SES IMAGES. La plupart des clients les
      bloquent tant que le destinataire ne les autorise pas. Le logo est
      donc doublé du mot-symbole « Omega.AI » EN TEXTE, juste à côté :
      images coupées, la marque se lit quand même.

   3. AUCUN BOUTON, AUCUN APLAT DE COULEUR. Un accusé de réception qui
      ressemble à une infolettre part dans l'onglet Promotions de Gmail —
      or celui-ci doit arriver en boîte principale. Un filet, une trame
      grise pour le bloc de détail, rien d'autre.

   4. UN DOCUMENT COMPLET, PAS UN FRAGMENT. `<!doctype html>` et
      `<meta name="color-scheme" content="light">` : sans eux, les clients
      en thème sombre inversent les couleurs à leur guise et le gris clair
      vire au gris sale.

   Et une règle de fond : CE MAIL NE PROMET PAS LE LIEN DE
   VISIOCONFÉRENCE COMME AUTOMATIQUE. Ce lien n'existe nulle part dans le
   système ; il dit qu'il parvient avant le rendez-vous, ce que les
   associés font à la main.
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

/* ——— les briques ———
   Les valeurs qui arrivent ici sont DÉJÀ échappées : ces fonctions
   assemblent, elles ne protègent pas. */

function rangeeDetail(cle: string, valeur: string, dernier = false): string {
  const bord = dernier ? "" : "border-bottom:1px solid #ededf0;";
  return (
    `<tr>` +
    `<td style="${bord}padding:11px 16px;font-family:${POLICE};font-size:12px;line-height:18px;` +
    `color:#71717a;text-transform:uppercase;letter-spacing:0.06em;white-space:nowrap;vertical-align:top">${cle}</td>` +
    `<td style="${bord}padding:11px 16px 11px 0;font-family:${POLICE};font-size:15px;line-height:22px;` +
    `color:#050505;font-weight:600;text-align:right">${valeur}</td>` +
    `</tr>`
  );
}

function enveloppe(titre: string, interieur: string): string {
  return (
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">` +
    `<title>${titre}</title></head>` +
    `<body style="margin:0;padding:0;background:#f4f4f5;-webkit-font-smoothing:antialiased">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="background:#f4f4f5"><tr><td align="center" style="padding:28px 12px 44px">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" ` +
    `style="width:600px;max-width:100%;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px">` +
    interieur +
    `</table></td></tr></table></body></html>`
  );
}

/* L'entête : la marque, et rien d'autre. Le logo et le mot-symbole sont
   deux cellules d'un même tableau — pas un `inline-block`, qu'Outlook
   place mal dès que la ligne s'allonge. */
const ENTETE =
  `<tr><td style="padding:26px 28px 0">` +
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
  `<td style="padding-right:9px;vertical-align:middle">` +
  `<img src="${LOGO}" width="26" height="26" alt="Omega.AI" ` +
  `style="display:block;width:26px;height:26px;border:0"></td>` +
  `<td style="vertical-align:middle;font-family:${POLICE};font-size:16px;line-height:26px;` +
  `font-weight:600;letter-spacing:-0.01em;color:#050505">Omega.AI</td>` +
  `</tr></table></td></tr>`;

const PIED =
  `<tr><td style="padding:26px 28px 28px">` +
  `<div style="border-top:1px solid #ededf0;padding-top:16px;font-family:${POLICE};` +
  `font-size:12px;line-height:19px;color:#8a8a92">` +
  `Omega.AI · <a href="${SITE}" style="color:#8a8a92;text-decoration:underline">omegaai.fr</a> · ` +
  `<a href="mailto:${COURRIEL}" style="color:#8a8a92;text-decoration:underline">${COURRIEL}</a><br>` +
  `Ce message confirme la réservation faite sur omegaai.fr. Vous pouvez y répondre directement.` +
  `</div></td></tr>`;

function titre(t: string): string {
  return (
    `<tr><td style="padding:22px 28px 0;font-family:${POLICE};font-size:21px;line-height:29px;` +
    `font-weight:600;letter-spacing:-0.015em;color:#050505">${t}</td></tr>`
  );
}

function paragraphe(html: string, haut = 16): string {
  return (
    `<tr><td style="padding:${haut}px 28px 0;font-family:${POLICE};font-size:15px;` +
    `line-height:24px;color:#3d3d3d">${html}</td></tr>`
  );
}

export type Confirmation = { sujet: string; html: string; texte: string };

/** Compose l'accusé de réception. Deux cas, et deux seulement : avec
    créneau (audit, réglage) ou sans (les formats sur devis, qui n'ont pas
    de calendrier). */
export function composerConfirmation(p: {
  prenom: string;
  formule: string;
  creneauISO: string | null;
  dureeMin: number | null;
}): Confirmation {
  const format = FORMATS[p.formule] ?? p.formule;
  const prenom = (p.prenom || "").trim();
  const quand = p.creneauISO;
  const duree = p.dureeMin ? `${p.dureeMin} min` : null;

  if (!quand) {
    const sujet = "Votre demande est bien reçue";
    return {
      sujet,
      html: enveloppe(
        sujet,
        ENTETE +
          titre("Votre demande est bien reçue") +
          paragraphe(
            `Bonjour ${echapper(prenom)}, votre demande ` +
              `(<strong style="color:#050505">${echapper(format)}</strong>) est enregistrée.`,
            12,
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

  const sujet = `Votre créneau est bloqué — ${dateLongue(quand)} à ${heure(quand)}`;
  const detail =
    `<tr><td style="padding:20px 28px 0">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ` +
    `style="background:#fafafa;border:1px solid #ededf0;border-radius:10px">` +
    rangeeDetail("Date", echapper(dateLongue(quand))) +
    rangeeDetail(
      "Heure",
      `${echapper(heure(quand))}<span style="font-weight:400;color:#71717a"> · heure de Guadeloupe</span>`,
    ) +
    rangeeDetail(
      "Format",
      echapper(format) +
        (duree ? ` <span style="font-weight:400;color:#71717a">· ${duree}</span>` : ""),
    ) +
    rangeeDetail("Lieu", "En visioconférence", true) +
    `</table></td></tr>`;

  return {
    sujet,
    html: enveloppe(
      sujet,
      ENTETE +
        titre("Votre créneau est bloqué") +
        paragraphe(`Bonjour ${echapper(prenom)}, votre rendez-vous est enregistré. Voici le détail.`, 12) +
        detail +
        paragraphe("Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.", 20) +
        paragraphe(
          "Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.",
        ) +
        PIED,
    ),
    texte: [
      `Bonjour ${prenom},`,
      "",
      "Votre créneau est bloqué. Voici le détail :",
      "",
      `  Date     ${dateLongue(quand)}`,
      `  Heure    ${heure(quand)} (heure de Guadeloupe)`,
      `  Format   ${format}${duree ? ` · ${duree}` : ""}`,
      "  Lieu     En visioconférence",
      "",
      "Nous revenons vers vous avec le lien de la visioconférence avant le rendez-vous.",
      "",
      "Si cette date ne vous convient plus, répondez simplement à ce message : on en trouve une autre.",
      "",
      "À bientôt,",
      "L'équipe Omega.AI",
      "",
      `Omega.AI · omegaai.fr · ${COURRIEL}`,
    ].join("\n"),
  };
}
