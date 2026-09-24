/* ══════════════════════════════════════════════════════════════════════════
   Les secteurs — un SaaS vertical par métier (24/09/2026).

   Teo : « chaque page indépendante, BTP, cabinet d'avocats…, tu prends
   exactement le design du SaaS en question sur son lien Vercel ». La page
   /secteurs/<slug> AFFICHE donc le site déployé du SaaS, plein écran
   (app/secteurs/[metier]/page.tsx), au lieu d'en recopier le code.

   Pourquoi pas une copie du code, ni une réécriture « multi-zones » :
   les quatre sites (OMEGA/<nom>-site) sont construits par d'autres sessions,
   et trois d'entre eux changeaient encore à la minute ce jour-là. Une copie
   aurait divergé dès le lendemain ; une réécriture sous /secteurs/<slug>
   exigeait un `basePath` et le préfixe de chaque chemin d'image dans leurs
   sources (plus de 180 occurrences, dont des fichiers générés). Affiché
   tel quel, chaque SaaS est à jour dès que sa session le redéploie.

   Ajouter un secteur = une ligne ici. Le menu, la page d'ensemble, le plan
   du site et la politique de contenu (next.config.ts, `frame-src`) lisent
   cette table ou doivent recevoir l'hôte du nouveau site.

   Noms choisis par Teo le 24/09 : Daliro (ex-ChantierOS), Tamila
   (ex-CabinetOS), Lorani (ex-DossierOS), Tavaro (ex-RentalOS). Les dossiers
   OMEGA/<ancien>-site et les projets Vercel gardent l'ancien nom, d'où les
   URL ci-dessous.
   Aucun prix, aucun chiffre de traction : le prix s'estime, l'audit le fixe.
   ══════════════════════════════════════════════════════════════════════ */

export type Secteur = {
  slug: string;
  /* le métier, tel qu'il s'affiche dans le menu et sur la page d'ensemble */
  metier: string;
  saas: string;
  /* une ligne, 40 à 60 signes : la décision que le SaaS prend chaque matin
     (menu « Secteurs », description des pages à cadre) */
  texte: string;
  /* /secteurs, carte du métier : deux phrases, ce qu'il lit → ce qu'il
     prépare → ce qui reste au client. Tout est repris du site du SaaS. */
  detail: string;
  /* /secteurs, carte d'aperçu : ce que le client reçoit, et quand */
  apercu: string;
  /* le site déployé, affiché par /secteurs/<slug> tant que `integre` est faux */
  url: string;
  /* 24/09 (soir) — Teo : « je veux le même système que CASHD ». La page est
     RAPATRIÉE dans ce site (app/secteurs/<slug>/, entête et pied d'Omega,
     monde blanc) ; la route à cadre [metier] ne la sert plus. Méthode :
     app/secteurs/RAPATRIEMENT.md. */
  integre?: boolean;
};

export const SECTEURS: Secteur[] = [
  {
    slug: "btp",
    metier: "BTP",
    saas: "Daliro",
    texte: "Travaux supplémentaires captés, sous-traitants confirmés à J-2.",
    detail:
      "Daliro lit les photos et les vocaux de vos équipes, repère les travaux hors devis et les chiffre sur vos prix. Vous signez l'avenant avant que le mur soit refermé.",
    apercu:
      "Chaque matin, trois listes par chantier : ce qu'il faut facturer, les sous-traitants qui doivent confirmer leur passage à J-2 et les livraisons à caler sur le planning.",
    url: "https://chantieros-site.vercel.app",
    integre: true,
  },
  {
    slug: "avocats",
    metier: "Cabinets d'avocats",
    saas: "Tamila",
    texte: "Le dossier de faits, les pièces du jour, les forfaits qui dérapent.",
    detail:
      "Tamila lit toutes les pièces du dossier, même scannées ou manuscrites, et renvoie chaque fait à la page qui le prouve. Vous recevez la chronologie, les contradictions et le bordereau contrôlé.",
    apercu:
      "Chaque matin à 7 h, un courriel signale les pièces reçues la veille, les forfaits dépassés et les dossiers restés sans diligence depuis trente jours.",
    url: "https://cabinetos-site-two.vercel.app",
  },
  {
    slug: "architectes",
    metier: "Architectes",
    saas: "Lorani",
    texte: "Les plans contrôlés avant le permis, les offres analysées.",
    detail:
      "Lorani relit chaque planche contre les autres, le CCTP et la DPGF, puis liste les contradictions avec la page et l'article en face. L'architecte tranche sur un dossier vérifié.",
    apercu:
      "Quatre contrôles couvrent la mission, du permis à la réception : le dossier de permis et le DCE, l'analyse des offres, les situations de travaux et le visa des documents.",
    url: "https://dossieros-site.vercel.app",
  },
  {
    slug: "location-automobile",
    metier: "Loueurs automobiles",
    saas: "Tavaro",
    texte: "Quels véhicules déplacer, lesquels dorment, quel retour facturer.",
    detail:
      "Tavaro compare les photos de retour à celles du départ, puis chiffre le carburant, le retard et les dommages selon votre barème. Vos agences décident de ce qui est facturé.",
    apercu:
      "Chaque matin à 7 h, une page par agence indique les retours à facturer, les véhicules à préparer et l'entretien placé dans les creux du planning.",
    url: "https://rentalos-site.vercel.app",
  },
];

export const secteur = (slug: string) => SECTEURS.find((s) => s.slug === slug);
