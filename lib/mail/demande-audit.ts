/* ══════════════════════════════════════════════════════════════════════
   Les deux mails de la demande d'audit (18/10/2026).

   · À OMEGA : tout ce que le visiteur a répondu, et l'adresse du visiteur en
     « répondre à » — un clic suffit pour lui écrire.
   · AU VISITEUR : une confirmation sobre, avec le lien vers le choix du
     créneau. Rien d'autre : ni chiffre, ni promesse, ni nom d'outil.

   Le texte est fixe ; seuls les champs du formulaire, échappés, s'y glissent.
   ══════════════════════════════════════════════════════════════════════ */

import { COURRIEL, lienReservation } from "@/lib/reservation";
import { libelleFormat, libelleSecteur, type Demande } from "@/lib/demande-audit";

const SITE = "https://omegaai.fr";

function echapper(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function lienChoixCreneau(d: Demande): string {
  return `${SITE}${lienReservation(d.format)}`;
}

/* Le mail à Omega : la fiche, dans l'ordre du formulaire. */
export function composerAvisOmega(d: Demande) {
  const qui = `${d.prenom} ${d.nom}`;
  const lignes = [
    `De : ${qui}`,
    `Fonction : ${d.fonction}`,
    `Entreprise : ${d.entreprise}`,
    `E-mail : ${d.email}`,
    `Pays : ${d.pays}`,
    `Secteur : ${libelleSecteur(d.secteur)}`,
    `Connu d'Omega par : ${d.origine}`,
    `Format demandé : ${libelleFormat(d.format)}`,
    "",
    `Répondre à ce message écrit directement au visiteur (${d.email}).`,
  ];

  const ligne = (libelle: string, valeur: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#616161;white-space:nowrap">${echapper(libelle)}</td>` +
    `<td style="padding:6px 0">${echapper(valeur)}</td></tr>`;

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Inter,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#050505">` +
    `<p style="margin:0 0 12px"><strong>Nouvelle demande d'audit</strong></p>` +
    `<table style="border-collapse:collapse">` +
    ligne("De", qui) +
    ligne("Fonction", d.fonction) +
    ligne("Entreprise", d.entreprise) +
    ligne("E-mail", d.email) +
    ligne("Pays", d.pays) +
    ligne("Secteur", libelleSecteur(d.secteur)) +
    ligne("Connu d'Omega par", d.origine) +
    ligne("Format demandé", libelleFormat(d.format)) +
    `</table>` +
    `<p style="color:#616161;font-size:13px;margin-top:16px">Répondre à ce message écrit directement au visiteur.</p></div>`;

  return {
    sujet: `Demande d'audit — ${libelleFormat(d.format)} — ${qui} (${d.entreprise})`,
    texte: lignes.join("\n"),
    html,
    reponseA: d.email,
  };
}

/* La confirmation au visiteur : ce qu'on a reçu, et où choisir son créneau. */
export function composerConfirmation(d: Demande) {
  const lien = lienChoixCreneau(d);
  const texte = [
    `Bonjour ${d.prenom},`,
    "",
    "Nous avons bien reçu votre demande d'audit.",
    "",
    `Format demandé : ${libelleFormat(d.format)}`,
    `Entreprise : ${d.entreprise}`,
    "",
    "Pour choisir votre créneau, ouvrez ce lien :",
    lien,
    "",
    "Vous pouvez répondre directement à ce message.",
    "",
    "Omega.AI",
    SITE,
  ];

  const html =
    `<div style="font-family:-apple-system,Segoe UI,Inter,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#050505">` +
    `<p>Bonjour ${echapper(d.prenom)},</p>` +
    `<p>Nous avons bien reçu votre demande d'audit.</p>` +
    `<p style="margin:0 0 4px"><strong>Format demandé :</strong> ${echapper(libelleFormat(d.format))}</p>` +
    `<p style="margin:0 0 16px"><strong>Entreprise :</strong> ${echapper(d.entreprise)}</p>` +
    `<p><a href="${echapper(lien)}" style="color:#050505;text-decoration:underline">Choisir mon créneau</a></p>` +
    `<p style="color:#616161;font-size:13px">Vous pouvez répondre directement à ce message.</p>` +
    `<p style="color:#616161;font-size:13px">Omega.AI — <a href="${SITE}" style="color:#616161">omegaai.fr</a></p></div>`;

  return {
    sujet: "Votre demande d'audit Omega",
    texte: texte.join("\n"),
    html,
    reponseA: COURRIEL,
  };
}
