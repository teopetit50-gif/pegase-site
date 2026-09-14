import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   features-4 — grille de cases à filets (11/09/2026)

   Reprise du bloc `features-4` de tailark (shadcn blocks) : même géométrie
   — en-tête centré, puis une grille divisée par des filets, une icône en
   ligne avec l'intitulé, une phrase dessous. Ce qui change :

   1. LES COULEURS SONT POSÉES. Tailwind v4 a changé la valeur par défaut de
      `border-color` : `currentColor` et non plus une teinte grise. Le
      `border divide-x divide-y` du bloc d'origine dessinerait donc des
      filets pleins de la couleur du texte. Les teintes sont explicites.
   2. `divide-x-0 sm:divide-x` — en une seule colonne, `divide-x` colle un
      filet vertical à gauche de chaque case, ce que personne ne veut.
   3. Rayon 15 px + `overflow-hidden`, comme les `o-card` du monde `.offres` :
      un bloc à bords vifs jurerait au milieu de la page.
   4. Les cases peuvent porter un `href` : le bloc d'origine est décoratif,
      celui-ci remplace une colonne de cartes qui étaient les portes d'entrée
      des pages produit. Une case sans `href` reste un simple <div>.

   Le composant ne définit ni police ni taille de titre : il vit sous une
   classe de monde (`.offres`) et emprunte ses `o-*`. Sous un autre monde,
   passer `ton="clair"`.
   ══════════════════════════════════════════════════════════════════════ */

export type CaseFeature = {
  icone: React.ComponentType<{ className?: string }>;
  titre: string;
  texte: string;
  href?: string;
};

export function Features({
  pastille,
  titre,
  chapo,
  cases,
  ton = "sombre",
  className = "",
}: {
  pastille?: string;
  titre: string;
  chapo?: string;
  cases: CaseFeature[];
  ton?: "sombre" | "clair";
  className?: string;
}) {
  const sombre = ton === "sombre";

  /* les deux jeux de teintes, posés une fois : filet, intitulé, texte */
  const filet = sombre ? "border-white/12 divide-white/12" : "border-[var(--o-line)] divide-[var(--o-line)]";
  const survol = sombre ? "hover:bg-white/[0.035]" : "hover:bg-[var(--o-soft)]";
  const encreTitre = sombre ? "text-white" : "";
  const encreTexte = sombre ? "!text-white/60" : "";
  const encreFleche = sombre ? "text-white/35 group-hover:text-white" : "text-[var(--o-muted)] group-hover:text-[var(--o-text)]";

  return (
    <div className={`o-wrap ${className}`}>
      <div className="flex flex-col items-center text-center">
        {pastille ? (
          <div data-reveal>
            <span className={`o-pill o-pill--xs ${sombre ? "o-pill--dark" : ""}`}>{pastille}</span>
          </div>
        ) : null}
        <h2 data-reveal className={`o-h2 mt-4 max-w-[620px] ${encreTitre ? "!text-white" : ""}`}>
          {titre}
        </h2>
        {chapo ? (
          <p data-reveal className={`o-lead mt-4 max-w-[650px] ${encreTexte}`}>
            {chapo}
          </p>
        ) : null}
      </div>

      {/* la grille : filets intérieurs par `divide`, filet extérieur par
          `border`, et les coins rognés par l'overflow du conteneur */}
      <div
        data-reveal
        className={`mx-auto mt-16 grid max-w-[1000px] grid-cols-1 overflow-hidden rounded-[15px] border divide-y divide-x-0 sm:grid-cols-2 sm:divide-x lg:grid-cols-3 ${filet}`}
      >
        {cases.map((c) => {
          const contenu = (
            <>
              <div className="flex items-center gap-2.5">
                <c.icone className={`size-[18px] shrink-0 ${encreTitre}`} />
                <h3
                  className={`text-[17px] font-semibold tracking-[-0.02em] ${encreTitre}`}
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  {c.titre}
                </h3>
              </div>
              <p className={`o-small mt-3 ${encreTexte}`}>{c.texte}</p>
              {c.href ? (
                <ArrowUpRight
                  className={`absolute right-6 top-6 size-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:right-7 sm:top-7 ${encreFleche}`}
                />
              ) : null}
            </>
          );

          const classes = `group relative flex flex-col p-8 transition-colors duration-200 sm:p-10 lg:p-11 ${
            c.href ? survol : ""
          }`;

          return c.href ? (
            <Link key={c.titre} href={c.href} className={classes}>
              {contenu}
            </Link>
          ) : (
            <div key={c.titre} className={classes}>
              {contenu}
            </div>
          );
        })}
      </div>
    </div>
  );
}
