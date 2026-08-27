/* ══════════════════════════════════════════════════════════════════════
   /vos-donnees — jeu de signes (08/08/2026, réécrit avec la page)

   Tous les tracés sont dessinés ici plutôt qu'importés : la référence
   (scale.com/global-public-sector) n'utilise que des traits de 1,5 px sur
   une grille de 24, et une bibliothèque d'icônes aurait apporté ses propres
   proportions. `currentColor` partout — la couleur vient de la pastille ou
   du texte qui les contient, jamais de l'icône.
   ══════════════════════════════════════════════════════════════════════ */

type P = { className?: string };

/* ——— petits signes ——— */

export function FlecheCoin({ className }: P) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden className={className}>
      <path
        d="M3 9L9 3M9 3H4M9 3v5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlecheDroite({ className }: P) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path
        d="M2.5 7h9M8 3.5L11.5 7 8 10.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Chevron({ className }: P) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden className={className}>
      <path
        d="M5.5 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Coche({ className }: P) {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden className={className}>
      <path
        d="M2.5 6.2l2.3 2.3L9.5 3.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* le guillemet ouvrant de la carte citation */
export function Guillemet({ className }: P) {
  return (
    <svg viewBox="0 0 28 20" fill="none" aria-hidden className={className}>
      <path
        d="M11.4 0v9.4c0 6-3.4 9.6-9.4 10.6L1.4 17c3.4-.8 5.2-2.6 5.4-5.6H2.6V0h8.8zm15.2 0v9.4c0 6-3.4 9.6-9.4 10.6L16.6 17c3.4-.8 5.2-2.6 5.4-5.6h-4.2V0h8.8z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ——— pastilles des six garanties ——— */

/* bouclier barré : ce qui n'entre pas dans l'entraînement */
export function IconeBarriere({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 3.2l6.6 2.4v5.1c0 4-2.8 7.6-6.6 8.8-3.8-1.2-6.6-4.8-6.6-8.8V5.6L12 3.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8.6 15.4l6.8-6.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* repère de lieu : la souveraineté, un point sur une carte */
export function IconeLieu({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 21.2s7-6 7-11.2a7 7 0 10-14 0c0 5.2 7 11.2 7 11.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* cadenas : le chiffrement */
export function IconeCadenas({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="4.5" y="10.2" width="15" height="10" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.2 10.2V7.6a3.8 3.8 0 017.6 0v2.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M12 14v2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* corbeille : la suppression sur demande */
export function IconeEffacer({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4.5 6.8h15M9.4 6.8V4.9c0-.6.5-1.1 1.1-1.1h3c.6 0 1.1.5 1.1 1.1v1.9M6.6 6.8l.8 12c0 .8.7 1.4 1.5 1.4h6.2c.8 0 1.5-.6 1.5-1.4l.8-12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* boîte + flèche sortante : la réversibilité */
export function IconeEmporter({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M20 13.5v5.2c0 .9-.7 1.6-1.6 1.6H5.6c-.9 0-1.6-.7-1.6-1.6v-5.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 15V3.6M12 3.6L8.3 7.3M12 3.6l3.7 3.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* liste horodatée : le journal d'exécution */
export function IconeJournal({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="4.2" y="3.8" width="15.6" height="16.4" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 9h8M8 12.6h8M8 16.2h4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* œil : la relecture humaine avant envoi */
export function IconeOeil({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M2.6 12S6.4 5.8 12 5.8 21.4 12 21.4 12 17.6 18.2 12 18.2 2.6 12 2.6 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* ——— icônes des trois chiffres ——— */

export function IconeServeur({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="3.8" y="4.6" width="16.4" height="6" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <rect x="3.8" y="13.4" width="16.4" height="6" rx="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.2 7.6h.01M7.2 16.4h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconeSablier({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M7 3.8h10M7 20.2h10M7.8 3.8v3.1c0 2.3 4.2 3.6 4.2 5.1s-4.2 2.8-4.2 5.1v3.1M16.2 3.8v3.1c0 2.3-4.2 3.6-4.2 5.1s4.2 2.8 4.2 5.1v3.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeZero({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.6 17.4L17.4 6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
