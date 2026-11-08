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

   08/11/2026 — LORANI ÉLARGIE (Teo : « reformule les deux pages avec la
   nouvelle idée »). Le produit suit désormais toute l'opération, du dépôt
   du permis à la réception, selon docs/briefs-saas/lorani-v2.md : cinq
   phases, une preuve par point, un journal des décisions opposable, et une
   entrée « Découverte » sur un dossier déjà clos. Le héros, les compteurs
   et l'appel final le disent ici ; Produit, Fonctionnement, Dossier,
   Metiers, Formules et Questions portent leurs textes en dur et sont
   modifiés en même temps. Aucun montant sur la page (règle maison).
   ══════════════════════════════════════════════════════════════════════ */
export const CONTACT = {
  audit: "/reserver-un-audit",
  demo: "/reserver-un-audit",
};
export const HERO = {
  cercle: ["Le dossier vérifié", "Agences d'architecture", "Permis · DCE · Chantier · Réception"],
  titre: "Chaque pièce de l'opération, vérifiée du permis à la réception",
  texte:
    "Lorani lit toutes les pièces de l'opération, planches, CCTP, DPGF, offres, fiches techniques, situations et PV, et les croise entre elles et avec les règles françaises. Vous recevez chaque incohérence avec la page, la valeur lue et la correction proposée, et chaque visa, chaque décision reste datée dans un journal opposable.",
  garanties: ["Sans BIM", "Vos PDF, même scannés", "Une preuve par point", "Hébergé dans l'UE"],
  audit: "Réserver un audit",
  demo: "Voir la démo",
};
export const COMPTEURS = {
  titre: "Toutes les pièces de l'opération",
  sous: "sont lues et croisées.",
  bouton: "Voir Lorani en action",
  valeurs: [
    { value: "5", label: "Phases, du dépôt du permis à la réception", filled: true, order: "" },
    { value: "1", label: "Preuve pour chaque point relevé", filled: false, order: "" },
    { value: "0", label: "Fichier modifié", filled: true, order: "md:order-4 xl:order-none" },
    { value: "FR", label: "PLU, DTU, ERP et RE2020", filled: false, order: "md:order-3 xl:order-none" },
  ],
};
export const APPEL = {
  titre: "Jugez Lorani sur un permis déjà instruit ou un DCE déjà attribué",
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
