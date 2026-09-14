import Link from "next/link";
import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   bento-02 — la tuile large qui ouvre, puis la rangée de tuiles (11/09/2026)

   Reprise de `bento-02` de @ln-dev7 (lndev-ui, 21st.dev) : une tuile large
   en haut qui porte le titre et l'appel, puis des tuiles égales dessous,
   toutes sur le même rayon et le même filet.

   Remplace la bande « Chacun fait un seul travail » de /offres, qui était
   un en-tête centré SUIVI d'une grille de deux cartes plus une carte large
   — trois cartes dans une grille de deux, donc un demi-rang vide qu'on
   rattrapait avec `lg:col-span-2`. La tuile d'en-tête absorbe le titre
   centré : une section au lieu de deux blocs, et les trois moteurs
   reprennent la même largeur.

   Quatre écarts avec l'original :

   1. LE LAVIS PERD SA COULEUR. L'original pose un radial indigo
      (`rgba(99,102,241,.15)`) dans la tuile large. Ici c'est de l'encre
      diluée : la charte du site est monochrome.
   2. NI `bg-card` NI `bg-muted`. Ces jetons shadcn ne valent rien sous
      `.offres` (ils y tombent sur le fond de page). Les tuiles prennent
      `--o-soft` et `--o-line`, la pastille d'icône prend le blanc.
   3. LES TUILES SONT DES LIENS. Celles de l'original sont décoratives ;
      ici chaque tuile est la porte d'une page produit, donc un `<Link>` —
      d'où le `group` et la flèche qui avance au survol.
   4. UN MÉDIA ARRIMÉ EN BAS. `mt-auto` et non une marge fixe : les trois
      tuiles d'une rangée prennent la hauteur de la plus haute, et sans lui
      le média de la plus courte flotte au milieu de sa tuile.

   Ni police ni taille de titre posées : le composant vit sous `.offres`.
   ══════════════════════════════════════════════════════════════════════ */

export type TuileBento = {
  titre: string;
  texte: string;
  href: string;
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  media: ReactNode;
};

export function Bento02({
  pastille,
  titre,
  chapo,
  lien,
  tuiles,
  className = "",
}: {
  pastille?: string;
  titre: string;
  chapo?: string;
  lien?: { label: string; href: string };
  tuiles: TuileBento[];
  className?: string;
}) {
  return (
    <div className={`o-wrap ${className}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* ——— la tuile large : l'en-tête de section ——— */}
        <div
          data-reveal
          className="relative overflow-hidden rounded-[20px] border border-[var(--o-line)] bg-[var(--o-soft)] p-6 sm:col-span-2 sm:p-10 lg:col-span-3"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 90% at 78% 40%, rgba(9,9,11,0.07), transparent)",
            }}
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[640px]">
              {pastille ? <span className="o-pill o-pill--xs">{pastille}</span> : null}
              <h2 className="o-h2 mt-4">{titre}</h2>
              {chapo ? <p className="o-lead mt-3.5">{chapo}</p> : null}
            </div>
            {lien ? (
              <Link href={lien.href} className="o-btn o-btn--ghost w-fit shrink-0">
                {lien.label}
              </Link>
            ) : null}
          </div>
        </div>

        {/* ——— les tuiles produit ——— */}
        {tuiles.map((t, i) => (
          <Link
            key={t.titre}
            href={t.href}
            data-reveal
            /* à deux colonnes (`sm`), un nombre impair de tuiles laisse la
               dernière seule avec un demi-rang vide : elle prend la largeur.
               À trois colonnes (`lg`) la rangée se remplit, le span retombe. */
            className={`group relative flex flex-col overflow-hidden rounded-[20px] border border-[var(--o-line)] bg-[var(--o-soft)] p-6 transition-colors duration-200 hover:border-[var(--o-muted)] sm:p-7 ${
              tuiles.length % 2 === 1 && i === tuiles.length - 1
                ? "sm:col-span-2 lg:col-span-1"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--o-line)] bg-white">
                <t.icone className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>
              {/* la flèche : elle avance de 3 px au survol de la tuile */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="mt-3 shrink-0 text-[var(--o-muted)] transition-all duration-200 group-hover:translate-x-[3px] group-hover:text-[var(--o-text)]"
              >
                <path d="M7 17 17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </div>

            <h3 className="o-h5 mt-4 !text-[19px]">{t.titre}</h3>
            <p className="o-body mt-2">{t.texte}</p>

            <div className="mt-auto w-full pt-6">{t.media}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
