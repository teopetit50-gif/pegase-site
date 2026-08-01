import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Historique des routes : /moteurs (jusqu'au 20/07) → /solutions
    // (jusqu'au 25/07) → /offres. La liste comme les fiches vivent désormais
    // sous /offres ; les deux anciennes familles d'URL y sont redirigées en
    // 308 pour ne casser ni les liens externes ni les favoris.
    return [
      { source: "/moteurs", destination: "/offres", permanent: true },
      { source: "/solutions", destination: "/offres", permanent: true },
      { source: "/moteurs/:system", destination: "/offres/:system", permanent: true },
      { source: "/solutions/:system", destination: "/offres/:system", permanent: true },
      /* 30/07 : la page À propos (/contact) est supprimée à la demande de Teo.
         L'URL était dans le header, le pied de page et plusieurs fiches — on
         la redirige vers la page d'audit plutôt que de servir un 404. */
      /* 30/07 : c'est /audit qui disparaît — l'ancienne page, en charte v2.
         La page travaillée (monde .r-*, formules, simulateur, comparatif,
         FAQ) est /reserver-un-audit : les deux autres URL y convergent. */
      { source: "/contact", destination: "/reserver-un-audit", permanent: true },
      { source: "/audit", destination: "/reserver-un-audit", permanent: true },
      /* 30/07 : /articles devient /blog (reproduction de la référence
         blog.ocoya.com, liste + articles). Slugs inchangés. */
      { source: "/articles", destination: "/blog", permanent: true },
      { source: "/articles/:slug", destination: "/blog/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
