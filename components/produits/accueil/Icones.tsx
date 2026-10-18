/* Icônes dessinées ici, jamais reprises à la référence : elles sont son
   actif. Même poids visuel (20×20, trait ou aplat), mêmes emplacements. */

export function Etincelle({ className = "" }: { className?: string }) {
  return (
    <svg
      className={"shrink-0 " + className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 1.6c.55 3.4 1.9 5.4 3.5 6.4 1 .6 2.3 1.1 4.9 2-3.4.55-5.4 1.9-6.4 3.5-.6 1-1.1 2.3-2 4.9-.55-3.4-1.9-5.4-3.5-6.4-1-.6-2.3-1.1-4.9-2 3.4-.55 5.4-1.9 6.4-3.5.6-1 1.1-2.3 2-4.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Fleche({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.4 13.6 13.6 6.4M7.6 6.4h6v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Bulle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M5 11.5A5.5 5.5 0 0 1 10.5 6h7A5.5 5.5 0 0 1 23 11.5v2A5.5 5.5 0 0 1 17.5 19H12l-4.6 3.4a.5.5 0 0 1-.8-.4V18.4A5.5 5.5 0 0 1 5 13.5v-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 12.5h8M10 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Enveloppe({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4.5" y="7" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m5.5 9 7.4 5.2a2 2 0 0 0 2.2 0L22.5 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Agenda({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4.5" y="6.5" width="19" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 11.5h19M9.5 4.5v4M18.5 4.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="8.5" y="14.5" width="4" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Etoile({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="m14 5.2 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9-5.3-2.9-5.3 2.9 1.1-5.9-4.3-4.1 5.9-.8L14 5.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const ICONES = { bulle: Bulle, enveloppe: Enveloppe, agenda: Agenda, etoile: Etoile };

/* Les trois vignettes d'étape (46 px chez la référence, size-11.5). */
export function Livre({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="44" height="44" rx="12" fill="#edf4ea" />
      <path d="M14 15.5h8.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2h-9v-13.5Z" stroke="#171717" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M32 15.5h-6.5a2.5 2.5 0 0 0-2.5 2.5v13a2 2 0 0 1 2-2h7v-13.5Z" stroke="#171717" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Prise({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="44" height="44" rx="12" fill="#ebebfc" />
      <path d="M14 23h6M26 23h6" stroke="#171717" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="19.5" y="17.5" width="7" height="11" rx="3.5" stroke="#171717" strokeWidth="1.6" />
      <path d="M21.5 14v3.5M24.5 14v3.5" stroke="#171717" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Ecoute({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="44" height="44" rx="12" fill="#f7eff7" />
      <path d="M15 26v-3a8 8 0 0 1 16 0v3" stroke="#171717" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="12.5" y="25.5" width="5" height="7" rx="2.5" stroke="#171717" strokeWidth="1.6" />
      <rect x="28.5" y="25.5" width="5" height="7" rx="2.5" stroke="#171717" strokeWidth="1.6" />
    </svg>
  );
}
