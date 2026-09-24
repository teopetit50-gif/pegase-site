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
  /* une ligne, 40 à 60 signes : la décision que le SaaS prend chaque matin */
  texte: string;
  /* le site déployé, affiché par /secteurs/<slug> */
  url: string;
};

export const SECTEURS: Secteur[] = [
  {
    slug: "btp",
    metier: "BTP",
    saas: "Daliro",
    texte: "Travaux supplémentaires captés, sous-traitants confirmés à J-2.",
    url: "https://chantieros-site.vercel.app",
  },
  {
    slug: "avocats",
    metier: "Cabinets d'avocats",
    saas: "Tamila",
    texte: "Le dossier de faits, les pièces du jour, les forfaits qui dérapent.",
    url: "https://cabinetos-site-two.vercel.app",
  },
  {
    slug: "architectes",
    metier: "Architectes",
    saas: "Lorani",
    texte: "Les plans contrôlés avant le permis, les offres analysées.",
    url: "https://dossieros-site.vercel.app",
  },
  {
    slug: "location-automobile",
    metier: "Loueurs automobiles",
    saas: "Tavaro",
    texte: "Quels véhicules déplacer, lesquels dorment, quel retour facturer.",
    url: "https://rentalos-site.vercel.app",
  },
];

export const secteur = (slug: string) => SECTEURS.find((s) => s.slug === slug);
