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
    texte: "Travaux supplémentaires chiffrés et signés avant exécution.",
    detail:
      "Daliro relève dans les photos et les vocaux de vos équipes les travaux absents du marché, puis les chiffre sur vos prix unitaires. Vous obtenez l'accord écrit du client avant que l'ouvrage soit refermé.",
    apercu:
      "Chaque matin à 7 h, le conducteur de travaux reçoit trois listes par chantier : les travaux à facturer, les sous-traitants à confirmer à J-2 et les livraisons à caler sur le planning.",
    url: "https://chantieros-site.vercel.app",
    integre: true,
  },
  {
    slug: "avocats",
    metier: "Cabinets d'avocats",
    saas: "Tamila",
    texte: "Chaque fait rattaché à la pièce et à la page qui le fondent.",
    detail:
      "Tamila lit chaque pièce du dossier, y compris scannée ou manuscrite, et rattache chaque fait à la page qui le fonde. L'avocat reçoit une chronologie sourcée, les contradictions entre pièces et un bordereau rapproché des conclusions.",
    apercu:
      "Chaque matin à 7 h, l'associé reçoit les pièces communiquées la veille, les honoraires forfaitaires dépassés et les dossiers sans diligence depuis trente jours.",
    url: "https://cabinetos-site-two.vercel.app",
    integre: true,
  },
  {
    slug: "architectes",
    metier: "Architectes",
    saas: "Lorani",
    texte: "Plans, CCTP et DPGF croisés avant le permis et le DCE.",
    detail:
      "Lorani croise chaque planche avec les autres, le CCTP et la DPGF, puis relève chaque incohérence avec la planche et l'article concernés. L'architecte arbitre avant le dépôt du permis ou la consultation des entreprises.",
    apercu:
      "Quatre contrôles suivent la mission de maîtrise d'œuvre, du permis à la réception : le permis et le DCE, l'analyse des offres, le visa des documents d'exécution et les situations de travaux.",
    url: "https://dossieros-site.vercel.app",
    integre: true,
  },
  {
    slug: "location-automobile",
    metier: "Loueurs automobiles",
    saas: "Tavaro",
    texte: "Restitutions chiffrées sur votre barème, preuves jointes.",
    detail:
      "Tavaro rapproche les photos de restitution de l'état des lieux de départ, puis chiffre carburant, retard et dommages selon votre barème de remise en état. Chaque facture part avec ses preuves datées, après validation de l'agence.",
    apercu:
      "Chaque matin à 7 h, chaque agence reçoit sa page : les restitutions à facturer, les véhicules à remettre en location avant le prochain départ et l'entretien placé hors des réservations.",
    url: "https://rentalos-site.vercel.app",
  },
];

export const secteur = (slug: string) => SECTEURS.find((s) => s.slug === slug);
