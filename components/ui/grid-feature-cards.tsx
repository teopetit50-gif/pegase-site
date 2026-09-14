import type { ReactNode } from "react";
import { useId } from "react";

/* ══════════════════════════════════════════════════════════════════════
   grid-feature-cards — quatre cases à trame, icône en tête (14/09/2026)

   Reprise de `grid-feature-cards` de @efferd (21st.dev) : une carte plate
   portant une icône, un intitulé et un texte, avec une trame de grille qui
   s'efface vers le bas et quelques cases pleines posées dessus, comme une
   feuille millimétrée qu'on aurait commencé à remplir.

   Remplace « Ce que couvre le sur-mesure » de /offres/sur-mesure, qui
   était la rangée de cartes 343 px du gabarit « home » (numéro en
   filigrane, défilement horizontal). Les quatre périmètres y étaient des
   paragraphes de 130 signes sans intitulé : ici chacun a son mot d'entrée
   (« Logiciels métier », « Ponts entre outils »…) et son icône, le texte
   devient le développement. Rien n'est réécrit : la fiche portait déjà
   « Intitulé : développement », c'est le deux-points qui sépare.

   Cinq écarts avec l'original :

   1. LA TRAME N'EST PLUS TIRÉE AU SORT. `genRandomPattern()` place les
      cases pleines au hasard À CHAQUE RENDU : côté serveur puis côté
      client, deux tirages différents — React signale un décalage
      d'hydratation et repeint. Les cases sont fixées, une série par carte.
   2. NI `text-foreground` NI `text-muted-foreground` : jetons shadcn sans
      valeur ici. Encre `--o-text`, gris `--o-muted`, filets `--o-line`.
   3. LES FILETS ENTRE CASES VIENNENT D'UN `gap-px` SUR FOND `--o-line`,
      pas de `divide-x/y` : quatre cases en 1, 2 ou 4 colonnes n'ont
      jamais de filet orphelin sur un bord, quelle que soit la largeur.
   4. LE TITRE PASSE EN JAKARTA 17 PX, comme les intitulés de carte du
      site, et non `text-sm` — à 14 px sur fond noir un intitulé se
      confond avec son texte.
   5. `cn()` retiré : les classes sont composées à la main, comme dans les
      autres reprises de ce dossier.
   ══════════════════════════════════════════════════════════════════════ */

export type CaseTrame = {
  icone: ReactNode;
  titre: string;
  texte: string;
};

/* une série de cases pleines par carte — [colonne, ligne] sur la trame de
   20 px, décalée de (-12, 4) comme dans l'original */
const TRAMES: number[][][] = [
  [[7, 1], [9, 3], [8, 5], [10, 2], [7, 6]],
  [[8, 2], [10, 4], [7, 3], [9, 6], [10, 1]],
  [[9, 1], [7, 4], [10, 5], [8, 3], [9, 6]],
  [[10, 3], [8, 1], [7, 5], [9, 2], [8, 6]],
];

function Trame({ cases }: { cases: number[][] }) {
  const id = useId();
  const w = 20;
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.06] to-white/[0.01] [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
        <svg aria-hidden className="absolute inset-0 h-full w-full fill-white/[0.05] stroke-white/[0.22] mix-blend-overlay">
          <defs>
            <pattern id={id} width={w} height={w} patternUnits="userSpaceOnUse" x="-12" y="4">
              <path d={`M.5 ${w}V.5H${w}`} fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
          <svg x="-12" y="4" className="overflow-visible">
            {cases.map(([x, y]) => (
              <rect key={`${x}-${y}`} strokeWidth="0" width={w + 1} height={w + 1} x={x * w} y={y * w} />
            ))}
          </svg>
        </svg>
      </div>
    </div>
  );
}

export function GridFeatureCards({ cases }: { cases: CaseTrame[] }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--o-line)] bg-[var(--o-line)] sm:grid-cols-2 lg:grid-cols-4">
      {cases.map((c, i) => (
        <div
          key={c.titre}
          data-reveal
          className="relative overflow-hidden bg-[#0d0d10] p-7 sm:p-8"
        >
          <Trame cases={TRAMES[i % TRAMES.length]} />
          <div className="relative z-10 text-[var(--o-text)]/80 [&>svg]:h-6 [&>svg]:w-6">{c.icone}</div>
          <h3
            className="relative z-10 mt-10 text-[17px] font-semibold tracking-[-0.02em] text-[var(--o-text)]"
            style={{ fontFamily: "var(--font-jakarta)" }}
          >
            {c.titre}
          </h3>
          <p className="o-body relative z-10 mt-2 !text-[15px] !leading-[1.7]">{c.texte}</p>
        </div>
      ))}
    </div>
  );
}
