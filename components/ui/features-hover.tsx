import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   features-hover — la rangée d'arguments à survol (11/09/2026)

   Reprise de `feature-section-with-hover-effects` d'Aceternity
   (@manuarora700 sur 21st.dev, MIT) : des cases séparées par des filets,
   chacune avec un lavis qui monte au survol, un ergot à gauche qui
   s'allonge, et l'intitulé qui glisse de 8 px.

   Remplace les quatre colonnes de texte CENTRÉ de la bande noire de
   /offres. Le défaut qu'elle corrige n'est pas la longueur des textes mais
   leur inégalité : à 240 px de colonne, « Financement éligible » faisait
   neuf lignes quand les trois autres en faisaient cinq, et trois colonnes
   se terminaient dans le vide. Des cases à filets prennent toutes la
   hauteur de la plus haute : la rangée redevient régulière SANS toucher aux
   textes, que Teo avait fournis tels quels le 07/08.

   Cinq écarts avec l'original :

   1. QUATRE CASES, PAS HUIT. L'original câble ses filets pour deux rangées
      de quatre (`index < 4` = première rangée). Ici : une rangée sur `lg`,
      deux sur `sm`, une colonne en dessous — les filets sont recalculés
      pour les trois grilles, sinon un filet vertical se colle à gauche
      d'une case seule.
   2. LES COULEURS SONT POSÉES. Tailwind v4 peint `border` en
      `currentColor` : le `border-r` nu de l'original dessinerait des
      filets blancs. Tout passe par `--o-line` (#27272a sous `.o-nuit`,
      #e4e4e7 en clair) — le composant sert donc les deux mondes sans
      variante.
   3. L'ERGOT DEVIENT BLANC, PAS BLEU (`bg-blue-500` dans l'original) : la
      charte du site est monochrome.
   4. `@tabler/icons-react` n'est pas installé : les icônes arrivent en
      `ReactNode` et restent celles de `components/offres/Media.tsx`.
   5. Pas de `cn()`, comme dans `features-4` : classes concaténées à la
      main.

   Le composant ne pose ni police ni taille de titre : il vit sous
   `.offres` et emprunte ses `o-*`.
   ══════════════════════════════════════════════════════════════════════ */

export type ArgumentSurvol = {
  icone: ReactNode;
  titre: string;
  texte: string;
};

/* Les filets, pour les trois grilles. Écrits à part parce que c'est le seul
   endroit où l'on peut se tromper sans que rien ne le signale : un filet de
   trop ne casse aucun build, il se voit. */
function filets(i: number, n: number) {
  const derniereRangeeSm = i >= n - (n % 2 === 0 ? 2 : 1);
  return [
    /* une colonne : un filet sous chaque case sauf la dernière */
    i < n - 1 ? "border-b" : "",
    /* deux colonnes : filet à droite des cases de gauche, pas de filet
       sous la dernière rangée */
    i % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
    derniereRangeeSm ? "sm:border-b-0" : "sm:border-b",
    /* une rangée : filet à droite partout, plus le filet de gauche sur la
       première case pour fermer la boîte */
    "lg:border-b-0 lg:border-r",
    i === 0 ? "lg:border-l" : "",
  ].join(" ");
}

export function FeaturesHover({
  cases,
  className = "",
}: {
  cases: ArgumentSurvol[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {cases.map((c, i) => (
        <div
          key={c.titre}
          data-reveal
          className={`group/arg relative flex flex-col border-[var(--o-line)] py-9 sm:py-10 ${filets(i, cases.length)}`}
        >
          {/* le lavis : il monte du bas, s'éteint en haut, et ne prend
              jamais le pointeur */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--o-soft)] to-transparent opacity-0 transition duration-200 group-hover/arg:opacity-100"
          />

          <div className="relative z-10 px-6 sm:px-7" style={{ color: "var(--o-muted-strong)" }}>
            {c.icone}
          </div>

          <h3
            className="relative z-10 mt-4 px-6 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] sm:px-7"
            style={{ fontFamily: "var(--font-jakarta)", color: "var(--o-text)" }}
          >
            {/* l'ergot : posé sur le bord gauche de la case, pas du texte —
                d'où le `left-0` sur un parent qui porte déjà le padding */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 my-auto h-6 w-[3px] origin-center rounded-r-full bg-[var(--o-line)] transition-all duration-200 group-hover/arg:h-9 group-hover/arg:bg-[var(--o-text)]"
            />
            <span className="inline-block transition duration-200 group-hover/arg:translate-x-2">
              {c.titre}
            </span>
          </h3>

          <p className="o-body relative z-10 mt-2.5 px-6 sm:px-7">{c.texte}</p>
        </div>
      ))}
    </div>
  );
}
