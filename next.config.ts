import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 01/09 — transitions de page : <ViewTransition> React dans PageShell.
     Le flag est celui que documente cette version (guides/view-transitions) ;
     le React canary embarqué par Next exporte déjà le composant. */
  experimental: { viewTransition: true },
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
      /* 01/08 : /offres/moteurs n'a jamais existé mais circulait — 404 sèche. */
      { source: "/offres/moteurs", destination: "/offres", permanent: true },
      { source: "/articles", destination: "/blog", permanent: true },
      { source: "/articles/:slug", destination: "/blog/:slug", permanent: true },
      /* 05/08 : les douze fiches moteur deviennent six pages de paquet, et
         l'URL passe du nom de code au slug descriptif. Les six moteurs réels
         pointent vers le paquet qui les contient ; les six qui n'ont jamais
         existé — POSTD, REACH, HIRED, BILLD, STAYD, COLLECT — retombent sur
         la liste des offres plutôt que sur un 404 : ils étaient servis en
         statique depuis fin juillet, donc potentiellement indexés.
         Les vieilles URL /moteurs/payd et /solutions/payd restent servies :
         elles tombent d'abord sur /offres/payd, qui rebondit ici. Deux sauts,
         mais aucune adresse morte depuis juillet. */
      { source: "/offres/payd", destination: "/offres/relances-impayes", permanent: true },
      { source: "/offres/answr", destination: "/offres/demandes-clients", permanent: true },
      { source: "/offres/offload", destination: "/offres/factures-fournisseurs", permanent: true },
      { source: "/offres/brief", destination: "/offres/point-du-matin", permanent: true },
      { source: "/offres/revive", destination: "/offres/nouvelles-affaires", permanent: true },
      { source: "/offres/publiq", destination: "/offres/nouvelles-affaires", permanent: true },
      { source: "/offres/postd", destination: "/offres", permanent: true },
      { source: "/offres/reach", destination: "/offres", permanent: true },
      { source: "/offres/hired", destination: "/offres", permanent: true },
      { source: "/offres/billd", destination: "/offres", permanent: true },
      { source: "/offres/stayd", destination: "/offres", permanent: true },
      { source: "/offres/collect", destination: "/offres", permanent: true },
    ];
  },
};

export default nextConfig;
