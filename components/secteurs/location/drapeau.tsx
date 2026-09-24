/* Tavaro — drapeau.tsx. COPIÉ tel quel le 24/09/2026 à 14 h 58 de
   `OMEGA/rentalos-site/src/components/ui/drapeau.tsx` (lui-même repris de
   components/ui/drapeau.tsx de ce site). Recopié ici plutôt qu'importé :
   la page ne lit rien dans components/ui/. */
/** Le drapeau français, repris de PEGASE/pegase-site/components/ui/drapeau.tsx (12/09/2026).
 *  Couleurs officielles depuis 2020 : #000091 et #E1000F (le #0055A4 est la version
 *  de 1976). Proportions 2:3, trois bandes égales. Le filet extérieur n'est pas
 *  décoratif : sur un fond clair, sans lui, la bande blanche disparaît et le drapeau
 *  n'a plus que deux bandes ; `non-scaling-stroke` le garde à 1 px d'écran. */
export function Drapeau({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Drapeau français" className={className}>
      <rect x="0" y="0" width="30" height="60" fill="#000091" />
      <rect x="30" y="0" width="30" height="60" fill="#ffffff" />
      <rect x="60" y="0" width="30" height="60" fill="#E1000F" />
      <rect x="0" y="0" width="90" height="60" fill="none" stroke="rgba(9, 9, 11, 0.22)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
