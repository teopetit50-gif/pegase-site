import type { NextConfig } from "next";


/* ══════════════════════════════════════════════════════════════════════════
   10/09/2026 — en-têtes de sécurité. Audit : le site était à 0/6 ; Vercel ne
   pose que HSTS. Le manque qui comptait est `X-Frame-Options` — sans lui,
   n'importe quel site pouvait encadrer omegaai.fr dans une iframe et
   l'habiller à sa façon.

   Même parti que sur l'espace client : les quatre en-têtes sont APPLIQUÉS
   (aucun ne dépend des ressources de la page), la politique de contenu part
   en MODE RAPPORT. Le site a quatre routes API et des formulaires ; une CSP
   appliquée d'emblée peut couper un envoi sans que rien ne le signale. On la
   durcit au second passage, une fois les violations relevées dans la console.
   ═══════════════════════════════════════════════════════════════════════ */
const POLITIQUE_RAPPORT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const EN_TETES_SECURITE = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: POLITIQUE_RAPPORT },
];

const nextConfig: NextConfig = {
  /* 01/09 — transitions de page : <ViewTransition> React dans PageShell.
     10/09 — le drapeau `experimental.viewTransition` a DISPARU de Next 16.3 :
     il n'existe plus dans le paquet, et `tsc` refuse la clé. On l'enlève ; le
     composant continue d'être résolu par l'alias React de Next. Si un jour
     `<ViewTransition>` devient introuvable à l'exécution, c'est ici qu'il
     faut regarder — et non dans PageShell. */
  async headers() {
    return [{ source: "/:chemin*", headers: EN_TETES_SECURITE }];
  },
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
      /* 08/09 : /contact redevient une vraie page (le service client, WhatsApp +
         contact@omegaai.fr) — la redirection vers /reserver-un-audit est
         retirée. Les navigateurs qui ont mémorisé le 308 le gardent un
         temps ; une visite en navigation privée le confirme. */
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
