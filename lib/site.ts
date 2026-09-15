/* ══════════════════════════════════════════════════════════════════════
   L'URL canonique du site (30/07/2026)

   Un seul endroit, parce que trois fichiers en dépendent : le sitemap, le
   robots.txt et le `metadataBase` du layout — c'est lui qui transforme les
   chemins relatifs des images Open Graph en URL absolues, sans quoi les
   aperçus de partage ne s'affichent pas.

   15/09/2026 — le repli n'est plus l'ancienne adresse Vercel mais le vrai
   domaine, qui existe et sert le site. L'ancien repli ne se voyait qu'en
   l'absence de NEXT_PUBLIC_SITE_URL : posée en production, absente en
   local — d'où des liens de partage d'articles qui pointaient vers une
   adresse que plus personne ne visite. La variable reste prioritaire, pour
   que le banc d'essai puisse déclarer la sienne.
   ══════════════════════════════════════════════════════════════════════ */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://omegaai.fr";

export const SITE_NOM = "Omega.AI";
export const SITE_BASELINE =
  "Systèmes métiers, automatisation et intégration";
