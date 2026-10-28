/* ══════════════════════════════════════════════════════════════════════
   Les icônes du gabarit (28/10/2026) : pleines, 16 px, dans le style de
   celles de Linear (Teo : « les logos ne sont pas les mêmes »). Elles sont
   dessinées ici, pas reprises de Linear : mêmes formes de base (hexagone
   de statut, calendrier plein, losange de jalon), mêmes tailles, même
   poids. Les icônes de lucide, à trait fin, restent pour les menus.
   ══════════════════════════════════════════════════════════════════════ */

type P = { className?: string; titre?: string };
const svg = (titre: string | undefined, className: string | undefined, enfants: React.ReactNode) => (
  <svg className={className ? `lin-ic ${className}` : "lin-ic"} viewBox="0 0 16 16" width="16" height="16" role={titre ? "img" : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}>
    {enfants}
  </svg>
);

/* l'hexagone de statut d'un projet : planifié (contour), en cours (moitié pleine), fait (plein, coche), annulé (plein, croix) */
const HEX = "M8 1.6 13.55 4.8v6.4L8 14.4 2.45 11.2V4.8z";
export type EtatProjet = "planifie" | "en-cours" | "fait" | "annule";
export function IconeStatutProjet({ etat, titre }: { etat: EtatProjet; titre?: string }) {
  return svg(
    titre,
    `lin-ic-statut lin-ic-statut--${etat}`,
    <>
      {etat === "planifie" || etat === "en-cours" ? (
        <path d={HEX} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      ) : (
        <path d={HEX} fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      )}
      {etat === "en-cours" ? <path d="M8 4.7 10.9 6.4v3.2L8 11.3z" fill="currentColor" /> : null}
      {etat === "fait" ? <path d="M5.6 8.2 7.3 9.8l3.1-3.4" fill="none" stroke="var(--lin-fond)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {etat === "annule" ? <path d="M6.1 6.1l3.8 3.8M9.9 6.1 6.1 9.9" stroke="var(--lin-fond)" strokeWidth="1.6" strokeLinecap="round" /> : null}
    </>,
  );
}

/* le calendrier plein : gris, orange une fois la date passée (comme la date cible de Linear) */
export function IconeCalendrier({ passe, titre }: { passe?: boolean; titre?: string }) {
  return svg(
    titre,
    passe ? "lin-ic-calendrier lin-ic-calendrier--passe" : "lin-ic-calendrier",
    <>
      <rect x="2" y="2.5" width="12" height="11.5" rx="3" fill="currentColor" />
      <rect x="3.6" y="6.2" width="8.8" height="6.2" rx="1.4" fill="var(--lin-fond)" />
    </>,
  );
}

export function IconeDiese({ titre, className }: P) {
  return svg(titre, className, <path d="M6.3 2.5 5.2 13.5M10.8 2.5 9.7 13.5M2.8 5.8h10.8M2.4 10.2h10.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />);
}

export function IconeGroupe({ titre, className }: P) {
  return svg(
    titre,
    className,
    <>
      <circle cx="6" cy="5.4" r="2.6" fill="currentColor" />
      <path d="M1.6 13.2c.3-2.6 2.1-4 4.4-4s4.1 1.4 4.4 4z" fill="currentColor" />
      <circle cx="11.4" cy="5.9" r="2.1" fill="currentColor" opacity="0.6" />
      <path d="M11.7 9.4c1.6.2 2.6 1.4 2.8 3.4h-2.7c-.1-1.4-.6-2.5-1.4-3.2.4-.1.8-.2 1.3-.2z" fill="currentColor" opacity="0.6" />
    </>,
  );
}

export function IconeJauge({ titre, className }: P) {
  return svg(
    titre,
    className,
    <>
      <path d="M2.2 11.8a5.8 5.8 0 1 1 11.6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 11.8 10.6 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.8" r="1.4" fill="currentColor" />
    </>,
  );
}

export function IconeDocument({ titre, className }: P) {
  return svg(
    titre,
    className,
    <>
      <path d="M4 1.8h5.2L13 5.6v7.6a1.8 1.8 0 0 1-1.8 1.8H4a1.8 1.8 0 0 1-1.8-1.8V3.6A1.8 1.8 0 0 1 4 1.8z" fill="currentColor" />
      <path d="M5 8.6h6M5 11.2h4" stroke="var(--lin-fond)" strokeWidth="1.3" strokeLinecap="round" />
    </>,
  );
}

export function IconeEnveloppe({ titre, className }: P) {
  return svg(
    titre,
    className,
    <>
      <rect x="1.6" y="3.2" width="12.8" height="9.6" rx="2.4" fill="currentColor" />
      <path d="M3.6 5.6 8 8.7l4.4-3.1" fill="none" stroke="var(--lin-fond)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  );
}

export function IconeImport({ titre, className }: P) {
  return svg(
    titre,
    className,
    <>
      <path d="M8 2.2v7.2M5 6.6 8 9.6l3-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.2 10.4v1.4a2 2 0 0 0 2 2h7.6a2 2 0 0 0 2-2v-1.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>,
  );
}

/* la santé d'un projet (« On track », « At risk », « Off track ») : un rond de sa couleur à 25 %,
   la courbe pleine par-dessus. « At risk » est le tracé relevé sur Linear le 28/10/2026 (16 px) ;
   « Off track » est le même retourné, « On track » une coche du même poids. Teo : « les logos à
   gauche et les couleurs sont nuls, fais-les plus pros, comme sur le screen ». */
export type Sante = "bien" | "risque" | "hors" | "neutre";
const RISQUE =
  "M9.62562 3.8314C9.85957 3.7977 10.0957 3.87627 10.2628 4.04341L12.5728 6.35341C12.8657 6.6463 12.8657 7.12117 12.5728 7.41407C12.28 7.70696 11.8051 7.70696 11.5122 7.41407L9.91096 5.81284L6.92594 11.2854C6.81276 11.4929 6.60838 11.6349 6.37442 11.6686C6.14047 11.7023 5.90433 11.6237 5.73719 11.4566L3.42719 9.14657C3.1343 8.85367 3.1343 8.3788 3.42719 8.08591C3.72008 7.79301 4.19496 7.79301 4.48785 8.08591L6.08908 9.68714L9.0741 4.2146C9.18728 4.00709 9.39166 3.86509 9.62562 3.8314Z";
export function IconeSante({ etat, titre }: { etat: Sante; titre?: string }) {
  return svg(
    titre,
    `lin-ic-sante lin-ic-sante--${etat}`,
    etat === "neutre" ? (
      <circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.7 1.9" />
    ) : (
      <>
        <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.25" />
        {etat === "risque" ? <path d={RISQUE} fill="currentColor" /> : null}
        {etat === "hors" ? <path d={RISQUE} fill="currentColor" transform="matrix(1 0 0 -1 0 16)" /> : null}
        {etat === "bien" ? <path d="M4.6 8.4 6.9 10.7 11.4 5.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </>
    ),
  );
}
