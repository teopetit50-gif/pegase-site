/* ══════════════════════════════════════════════════════════════════════
   Tamila (cabinets d'avocats) — drapeau.tsx

   COPIÉ le 24/09/2026 à 13 h 37 de `OMEGA/cabinetos-site/src/components/ui/
   drapeau.tsx` (lui-même repris de filed-site). Teintes officielles
   inchangées : bleu #000091, rouge #E1000F, proportions 2:3.

   Ce qui change — MONDE BLANC. La source commentait déjà le piège : « sans
   le filet extérieur, la bande blanche se confond avec le fond ». Sur son
   fond noir, la bande blanche tranchait seule ; sur le nôtre elle disparaît
   et le drapeau n'a plus que deux bandes.
   · `Drapeau` : le filet d'un pixel du drapeau du site
     (components/ui/drapeau.tsx : encre #09090b à 22 %, `non-scaling-
     stroke`) est ajouté ici, dans le dessin, à l'identique.
   · `Tricolore` (trois filets de 2 px sous le badge, et la pastille de la
     mention) : même remède, un contour intérieur d'encre à 20 % posé en
     `outline` — il est peint PAR-DESSUS les trois bandes, là où une ombre
     intérieure serait recouverte par elles.
   ══════════════════════════════════════════════════════════════════════ */

export function Drapeau({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 90 60"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Drapeau français"
      className={className}
    >
      <rect x="0" y="0" width="30" height="60" fill="#000091" />
      <rect x="30" y="0" width="30" height="60" fill="#ffffff" />
      <rect x="60" y="0" width="30" height="60" fill="#E1000F" />
      <rect
        x="0"
        y="0"
        width="90"
        height="60"
        fill="none"
        stroke="rgba(9, 9, 11, 0.22)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* Version minuscule pour les badges et les signatures : trois filets, pas un drapeau. */
export function Tricolore({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex overflow-hidden rounded-[1px] outline outline-1 -outline-offset-1 outline-[#09090b]/20 ${className}`}
    >
      <span className="w-1/3 bg-[#000091]" />
      <span className="w-1/3 bg-white" />
      <span className="w-1/3 bg-[#E1000F]" />
    </span>
  );
}
