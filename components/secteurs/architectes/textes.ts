/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — textes.ts

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/contenu/
   textes.ts` (textes des composants écrits à la main : héros, compteurs,
   appel). Les textes sont ceux de la source, réécrits le 24/09 en registre
   professionnel ; rien n'est retouché ici. Ce qui change :

   · CONTACT (règle maison : tout bouton d'action mène à l'audit) :
       audit  https://omegaai.fr/reserver                → /reserver-un-audit
       demo   mailto:contact@omegaai.fr?subject=…        → /reserver-un-audit
     La démonstration se fait pendant l'audit, comme chez Daliro.
   · MARQUE et LIENS (les sept ancres de l'entête de la source) partent avec
     cette entête : c'est celle d'Omega qui sert.
   · Chemins des icônes : /icones/… → /secteurs-architectes/icones/….
   · Paliers maison des compteurs : `ipad:` → `md:` (768 px),
     `desktop-sm:` → `xl:` (1280 px), mêmes largeurs.
   ══════════════════════════════════════════════════════════════════════ */
export const CONTACT = {
  audit: "/reserver-un-audit",
  demo: "/reserver-un-audit",
};
export const HERO = {
  cercle: ["Contrôleur de dossier", "Agences d'architecture", "Permis · DCE · Visa · Chantier"],
  titre: "Les incohérences du dossier relevées avant le chantier",
  texte:
    "Lorani croise chaque planche avec le CCTP, la DPGF et les pièces du permis, puis vous remet en quelques heures la liste des incohérences, chacune avec la page, l'article et la correction proposée.",
  garanties: ["Sans BIM", "Vos PDF, même scannés", "Lecture seule", "Données hébergées dans l'UE"],
  audit: "Réserver un audit",
  demo: "Voir la démo",
};
export const COMPTEURS = {
  titre: "Toutes les pièces du dossier",
  sous: "sont lues et croisées.",
  bouton: "Voir Lorani en action",
  valeurs: [
    { value: "8", label: "Pièces du permis contrôlées", filled: true, order: "" },
    { value: "4", label: "Phases, du permis à la réception", filled: false, order: "" },
    { value: "0", label: "Fichier modifié", filled: true, order: "md:order-4 xl:order-none" },
    { value: "FR", label: "PLU, PMR, ERP et RE2020", filled: false, order: "md:order-3 xl:order-none" },
  ],
};
export const APPEL = {
  titre: "Essayez sur un permis déjà instruit",
  audit: "Réserver un audit",
  formules: "Voir les formules",
  glyphes: [
    { src: "/secteurs-architectes/icones/plans.svg", name: "Plans" },
    { src: "/secteurs-architectes/icones/offres.svg", name: "Offres" },
    { src: "/secteurs-architectes/icones/situations.svg", name: "Situations" },
    { src: "/secteurs-architectes/icones/visa.svg", name: "Fiches techniques" },
    { src: "/secteurs-architectes/icones/permis.svg", name: "Pièces du permis" },
    { src: "/secteurs-architectes/icones/pdf.svg", name: "PDF" },
    { src: "/secteurs-architectes/icones/cctp.svg", name: "Lecteurs" },
    { src: "/secteurs-architectes/icones/plans.svg", name: "Coupes" },
    { src: "/secteurs-architectes/icones/offres.svg", name: "DPGF" },
  ],
};
