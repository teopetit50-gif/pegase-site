/* ══════════════════════════════════════════════════════════════════════
   Le drapeau français (12/09/2026)

   COULEURS : bleu #000091 et rouge #E1000F — les teintes officielles de la
   République depuis 2020. Le #0055A4 est la version de 1976 : Teo l'a
   repérée à l'œil en une phrase sur filed-site. Ce sont les mêmes valeurs
   que sur les quatre vitrines produits ; garder la famille cohérente.

   PROPORTIONS : 2:3, trois bandes d'égale largeur. La correction optique de
   Louis-Philippe (30/33/37) ne vaut que pour un drapeau qui flotte, pas
   pour un rectangle posé à plat.

   LE FILET EXTÉRIEUR N'EST PAS DÉCORATIF. Le sourcil de section
   (`.o-pill`) a un fond blanc : sans lui, la bande blanche du milieu se
   confond avec le fond et le drapeau n'a plus que deux bandes. Il est en
   `vector-effect="non-scaling-stroke"` pour valoir 1 pixel d'écran quelle
   que soit la taille de rendu — à 15 px de large, une épaisseur exprimée
   dans le viewBox de 90 unités vaudrait un sixième de pixel.

   Une carte de France avait été dessinée pour filed-site en 46 repères
   côtiers ; Teo l'a écartée en une phrase (« juste le drapeau suffisait »).
   Ne pas la remettre.

   ⚠️  Un jumeau existe dans components/produits/factures/ui/drapeau.tsx,
   posé avec la peau de la page Factures. Les deux ne sont pas fusionnés à
   dessein : ce fichier-ci sert l'accueil, celui-là une peau de produit qui
   peut diverger. Les couleurs, elles, doivent rester identiques.
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
