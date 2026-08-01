/* ══════════════════════════════════════════════════════════════════════
   L'URL canonique du site (30/07/2026)

   Un seul endroit, parce que trois fichiers en dépendent : le sitemap, le
   robots.txt et le `metadataBase` du layout — c'est lui qui transforme les
   chemins relatifs des images Open Graph en URL absolues, sans quoi les
   aperçus de partage ne s'affichent pas.

   ⚠️  À CHANGER LE JOUR OÙ pegase.gp EXISTE. Le domaine n'est aujourd'hui
   ni enregistré ni délégué (aucun NS, aucun MX), donc l'URL canonique est
   celle de Vercel. Poser `pegase.gp` maintenant serait pire que le statu
   quo : Google indexerait des URL qui ne résolvent pas.

   La variable d'environnement permet de basculer sans toucher au code :
   il suffira de définir NEXT_PUBLIC_SITE_URL sur Vercel.
   ══════════════════════════════════════════════════════════════════════ */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pegase-site-beige.vercel.app";

export const SITE_NOM = "Omega";
export const SITE_BASELINE =
  "Automatisation pour les TPE des Antilles";
