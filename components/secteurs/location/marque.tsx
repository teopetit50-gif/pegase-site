/* ══════════════════════════════════════════════════════════════════════
   Tavaro (loueurs automobiles) — marque.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   marque.tsx`. Ce qui change :

   · LA SIGNATURE « Powered by Omega » PART avec l'entête de la source, la
     seule à la poser (`signature`) ; `LogoOmega` et le masque
     `/logos/omega-mark.png` partent avec elle. L'entête d'Omega sert.
     Le mode `sombre` (le lockup en blanc) ne servait qu'au pied noir de
     la source, qui ne vient pas : retiré aussi.

   · LE LOGO OFFICIEL (public/logos/tavaro-lockup.png, 1200 × 274, et
     tavaro-mark.png, 512 × 512, fournis par Teo le 24/09) est lu À SA
     PLACE, `/logos/…`, pas recopié dans public/secteurs-location. Ce sont
     des MASQUES ALPHA (RVB noir uniforme) : fond `currentColor` découpé
     par `mask-image`, préfixe `-webkit-` compris, comme `SystemLogo`
     (components/logos.tsx) et `SigneDaliro` (secteurs/btp/marque.tsx).

   · `SigneTuile` REMPLACE `/marque.svg`. La source posait ce fichier —
     une tuile marine à coins de 16/64 et le signe en blanc, embarqué en
     PNG base64 — comme icône d'application : pastilles de la grille des
     modules (GrilleModules.tsx), favicon, espace de travail et avatars
     des modules dans la maquette du héros (apercus/MaquetteHeros.tsx).
     Même dessin, refait sur le masque officiel : fond #1E3A8A, rayon 25 %,
     signe blanc large de 62 % de la tuile (39,68 / 64 dans le SVG) — le
     signe occupe 93,75 % de la largeur de tavaro-mark.png (boîte alpha
     16 → 496 sur 512), d'où un masque à 66 % centré.
   ══════════════════════════════════════════════════════════════════════ */
import type { CSSProperties } from "react";

const masque = (url: string, taille = "contain"): CSSProperties => ({
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: taille,
  maskSize: taille,
});

/* Le lockup (signe + mot-marque), dans une phrase : 1,2 em de haut. */
export function Marque({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span
        role="img"
        aria-label="Tavaro"
        className="inline-block h-[1.2em] bg-current text-[color:var(--text)]"
        style={{ aspectRatio: "1200 / 274", ...masque("/logos/tavaro-lockup.png") }}
      />
    </span>
  );
}

/* L'icône d'application : tuile marine, signe blanc. Sans `className`, elle
   remplit son parent (les `<img>` qu'elle remplace étaient à 100 % × 100 %
   de leur pastille par la feuille de la maquette). */
export function SigneTuile({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: "relative",
        display: "block",
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: "25%",
        backgroundColor: "#1E3A8A",
        ...(className ? null : { width: "100%", height: "100%" }),
      }}
    >
      <span style={{ position: "absolute", inset: 0, backgroundColor: "#ffffff", ...masque("/logos/tavaro-mark.png", "66%") }} />
    </span>
  );
}
