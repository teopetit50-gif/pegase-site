/* ══════════════════════════════════════════════════════════════════════
   La marque du produit — le VRAI logo, celui du parc Omega.

   Teo, 10/09/2026 : « CASHD a son logo, RELOAD a aussi son logo, ceux
   présents sur Omega ; tu as fait des logos différents de ceux de base ».
   Le signe dessiné à la main pour la vitrine est donc retiré au profit du
   fichier livré, `public/logos/filed-mark.png`, repris tel quel de
   PEGASE/pegase-site/public/logos.

   Ce fichier est un MASQUE ALPHA : sa couleur RGB est uniforme, seule la
   couche alpha porte le dessin. Un <img> afficherait un carré invisible —
   on le pose donc en `mask-image` sur un fond `currentColor`, exactement
   comme SystemLogo dans pegase-site/components/logos.tsx et LogoModule
   dans le cockpit. Bénéfice au passage : la marque suit la couleur du
   texte, donc le thème, sans deuxième fichier ni `invert`.

   Safari exige encore les préfixes -webkit-mask-* en 2026.
   ══════════════════════════════════════════════════════════════════════ */

const MASQUE = "/logos/filed-mark.png";

export function Marque({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "block",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${MASQUE})`,
        maskImage: `url(${MASQUE})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}
