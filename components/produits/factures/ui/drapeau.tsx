/* Le drapeau français.

   COULEURS : bleu #000091 et rouge #E1000F — les teintes officielles de
   la République depuis 2020. Le #0055A4 posé au premier essai est la
   version de 1976 : Teo l'a repérée tout de suite. Ce sont les mêmes
   valeurs que sur cashd-site et reload-site ; garder la famille
   cohérente.

   PROPORTIONS : 2:3, trois bandes d'égale largeur. La correction optique
   de Louis-Philippe (30/33/37) ne vaut que pour un drapeau qui flotte,
   pas pour un rectangle posé à plat.

   Le filet extérieur n'est pas décoratif : sans lui, la bande blanche se
   confond avec le fond et le drapeau n'a plus que deux bandes.

   Une carte de France avait été dessinée ici — Teo l'a écartée. Ne pas
   la remettre. */

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
    </svg>
  );
}

/* Version minuscule pour les badges et les signatures : trois filets,
   pas un drapeau. */
export function Tricolore({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex overflow-hidden rounded-[1px] ${className}`}>
      <span className="w-1/3 bg-[#000091]" />
      <span className="w-1/3 bg-white" />
      <span className="w-1/3 bg-[#E1000F]" />
    </span>
  );
}
