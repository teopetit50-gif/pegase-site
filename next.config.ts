import type { NextConfig } from "next";


/* ══════════════════════════════════════════════════════════════════════════
   10/09/2026 — en-têtes de sécurité. Audit : le site était à 0/6 ; Vercel ne
   pose que HSTS. Le manque qui comptait est `X-Frame-Options` — sans lui,
   n'importe quel site pouvait encadrer omegaai.fr dans une iframe et
   l'habiller à sa façon.

   25/09/2026 — phase de sécurisation : la politique de contenu passe du MODE
   RAPPORT au mode APPLIQUÉ. En rapport, elle ne protégeait de rien : aucune
   adresse de rapport n'était déclarée, les violations mouraient dans la
   console de chaque visiteur. Relevé fait avant de l'écrire (accueil, offres,
   tarifs, réservation, contact, modèles, blog) : tout vient de notre origine,
   sauf trois choses, nommées une par une ci-dessous —
     · l'armoire Supabase, appelée DEPUIS le navigateur par le calendrier
       (agenda_public) et la réservation (reserver_audit). Oubliée dans la
       politique en rapport : appliquée telle quelle, elle aurait coupé la
       prise de rendez-vous sans une ligne dans les journaux
       (mémoire csp-connect-src-avale-lappel). L'URL est écrite en dur :
       next.config est évalué au build, où les variables Vercel ne sont pas
       toujours là ;
     · le pixel Meta (script + envois), chargé seulement après consentement ;
     · les images et médias en https, gardés larges : c'est le seul endroit
       où un visuel hébergé ailleurs pourrait apparaître sans qu'on le sache.
   'unsafe-inline' reste nécessaire aux scripts d'amorçage de Next sur des
   pages statiques (un nonce rendrait chaque page dynamique). 'unsafe-eval'
   ne sert qu'au serveur de développement : il sort de la production.
   ═══════════════════════════════════════════════════════════════════════ */
const DEV = process.env.NODE_ENV !== "production";
const ARMOIRE = "https://noepmkkplxshjbmqqxft.supabase.co";
const ARMOIRE_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

const POLITIQUE = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""} https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${ARMOIRE}${ARMOIRE_ENV && ARMOIRE_ENV !== ARMOIRE ? ` ${ARMOIRE_ENV}` : ""} https://www.facebook.com https://connect.facebook.net${DEV ? " ws: https://va.vercel-scripts.com" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(DEV ? [] : ["upgrade-insecure-requests"]),
  /* 25/09/2026 — les rapports partent vers /api/csp (app/api/csp/route.ts),
     qui les écrit dans les journaux Vercel ; report-to pour Chrome et Edge,
     report-uri pour Firefox et Safari. Posés d'abord pour une semaine de
     relevés en mode rapport ; la politique est appliquée le même soir (0
     violation sur huit pages en recette) et les rapports restent : en mode
     appliqué, chaque ligne « [csp] violation » est une ressource BLOQUÉE —
     c'est là qu'on voit si un visuel ou un script manque à la liste. */
  "report-uri /api/csp",
  "report-to csp",
].join("; ");

const EN_TETES_SECURITE = [
  /* HSTS : Vercel pose max-age seul. includeSubDomains couvre app.omegaai.fr
     (déjà en HTTPS) et interdit qu'un sous-domaine soit un jour servi en
     clair ; preload rend l'inscription possible sur hstspreload.org — elle
     reste un geste à faire, à part, et difficile à défaire. */
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: POLITIQUE },
  { key: "Reporting-Endpoints", value: 'csp="/api/csp"' },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /* Coupe le lien entre un onglet ouvert depuis ailleurs et le nôtre
     (window.opener) : ni redirection de l'onglet d'origine, ni fuite par
     fenêtre croisée. Aucune fenêtre surgissante ne parle au site. */
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), display-capture=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  /* 25/09 — ne pas annoncer le cadriciel dans chaque réponse. */
  poweredByHeader: false,
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
      /* 14/09 : `www.omegaai.fr` renvoie vers l'apex. Le sous-domaine a servi
         le banc d'essai (projet omega-site-v3, robots fermé) pendant que la
         vitrine vivait sur l'apex ; depuis le portage du 14/09 ce dédoublement
         n'a plus de raison d'être. La règle ne vise que l'hôte www : l'apex
         et les URL *.vercel.app ne sont pas touchés. Elle prend effet le jour
         où www est rattaché au projet qui sert cet arbre (pegase-site2), ou
         au prochain déploiement du banc si www y reste. */
      {
        source: "/:chemin*",
        has: [{ type: "host", value: "www.omegaai.fr" }],
        destination: "https://omegaai.fr/:chemin*",
        permanent: true,
      },
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
      // 25/09 — Namolu (groupes de distribution) devient Varelo (grands groupes).
      { source: "/secteurs/distribution", destination: "/secteurs/groupes", permanent: true },
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
