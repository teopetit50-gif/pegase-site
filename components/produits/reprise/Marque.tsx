/* ══════════════════════════════════════════════════════════════════════
   La marque du produit — le VRAI logo, celui du parc Omega.

   Teo, 10/09/2026 : « CASHD a son logo, RELOAD a aussi son logo, ceux
   présents sur Omega ; tu as fait des logos différents de ceux de base ».
   Le signe dessiné à la main pour la vitrine est donc retiré au profit du
   fichier livré, `public/logos/reload-mark.png`.

   Ce fichier est un MASQUE ALPHA : sa couleur RGB est uniforme, seule la
   couche alpha porte le dessin. Un <img> afficherait un carré invisible —
   on le pose donc en `mask-image` sur un fond `currentColor`, exactement
   comme SystemLogo dans components/logos.tsx et LogoModule dans le
   cockpit. Bénéfice au passage : la marque suit la couleur du texte.

   11/09 — RAPATRIEMENT : le fichier existe DÉJÀ ici, sous le même chemin
   public (`/logos/reload-mark.png`). Rien n'a été recopié, et public/logos/
   est un dossier partagé auquel on ne touche pas.

   ⚠ CE COMPOSANT N'EST MONTÉ NULLE PART aujourd'hui. Ses deux seuls appelants
   sur le site source étaient l'entête et le pied, que la règle 6 supprime (le
   site a les siens). Il est conservé tel quel pour une seule raison : si la
   marque du produit doit réapparaître un jour sur cette page, elle doit
   passer par ICI. Un `<img src="/logos/reload-mark.png">` n'affiche RIEN —
   c'est un masque, pas une image.

   Safari exige encore les préfixes -webkit-mask-* en 2026.
   ══════════════════════════════════════════════════════════════════════ */

const MASQUE = "/logos/reload-mark.png";

export function Symbole({ className }: { className?: string }) {
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
