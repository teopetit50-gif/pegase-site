import Link from "next/link";
import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   how-it-works-01 — le déroulé numéroté, puis les garanties (11/09/2026)

   Reprise de `how-it-works-01` de @ln-dev7 (lndev-ui, 21st.dev) :
   en-tête centré, puis une rangée de cartes qui portent chacune une
   pastille d'icône à gauche et son rang en chiffres à droite.

   Remplace le bloc « Rien ne démarre sans vous » de /offres — quatre
   cartes de hauteurs inégales réparties en deux colonnes décalées. C'était
   la section la plus lourde de la page (1 371 px et 62 lignes de texte à
   1440, 2 439 px à 390), et son décalage laissait une demi-colonne vide à
   chaque changement de largeur.

   Ce que la reprise change au fond, et pourquoi ce n'est PAS une réécriture
   de contenu : les trois étapes numérotées ne sont pas inventées, elles
   étaient déjà sur la page, à l'intérieur de la carte « Trois étapes, pas
   trois mois » — c'est `MediaEtapes` qui les listait (Audit 30 min /
   Raccordement / Cycle supervisé). Elles montent d'un cran et deviennent la
   section ; la carte qui les contenait disparaît, et rien ne se dit deux
   fois. `MediaEtapes` reste exporté, plus personne ne l'appelle ici.

   Quatre écarts avec l'original :

   1. DEUX RANGÉES, PAS UNE. L'original ne sert que des étapes. Ici une
      seconde grille, même coquille de carte mais sans rang, porte les trois
      garanties et leurs médias — sinon on perdait « Sur vos outils »,
      « Rien ne part sans vous » et « Vos données restent les vôtres ».
   2. NI `bg-card` NI `text-muted-foreground`. Jetons shadcn sans valeur
      sous `.offres` : carte blanche, filet `--o-line`, textes `o-body`.
   3. LE BOUTON DE FIN DISPARAÎT. L'original ferme par un « Get started » ;
      la page a déjà son appel douze pixels plus bas, et deux boutons à la
      suite se neutralisent.
   4. `border` est toujours coloré à la main : en Tailwind v4, `border` seul
      peint en `currentColor`.
   ══════════════════════════════════════════════════════════════════════ */

export type Etape = {
  rang: string;
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titre: string;
  texte: string;
};

export type CarteGarantie = {
  icone: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  titre: string;
  texte: string;
  media?: ReactNode;
  lien?: { label: string; href: string };
};

/* la coquille commune : c'est elle qui fait que les deux rangées se lisent
   comme une seule section et non comme deux blocs collés */
const COQUILLE =
  "relative flex flex-col rounded-[20px] border border-[var(--o-line)] bg-white p-5 sm:p-7";
const PASTILLE =
  "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4f4f5] text-[var(--o-text)]";

export function HowItWorks01({
  pastille,
  titre,
  chapo,
  etapes,
  cartes,
  className = "",
}: {
  pastille?: string;
  titre: string;
  chapo?: string;
  etapes: Etape[];
  cartes?: CarteGarantie[];
  className?: string;
}) {
  return (
    <div className={`o-wrap ${className}`}>
      <div className="flex flex-col items-center text-center">
        {pastille ? (
          <div data-reveal>
            <span className="o-pill o-pill--xs">{pastille}</span>
          </div>
        ) : null}
        <h2 data-reveal className="o-h2 mt-4 max-w-[620px]">
          {titre}
        </h2>
        {chapo ? (
          <p data-reveal className="o-lead mt-4 max-w-[650px]">
            {chapo}
          </p>
        ) : null}
      </div>

      {/* ——— les étapes, numérotées ——— */}
      <ol className="mt-12 grid grid-cols-1 gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
        {etapes.map((e) => (
          <li key={e.rang} data-reveal className={COQUILLE}>
            {/* Sous `sm` : une rangée — pastille à gauche, texte à droite,
                et c'est le RANG qui occupe la pastille. C'est la forme que
                `MediaEtapes` donnait déjà à ces trois étapes, et la seule qui
                tienne à 390 : en carte empilée, les trois coûtaient 500 px
                pour trois phrases d'une ligne. À partir de `sm`, la carte
                reprend sa forme d'origine et l'icône remplace le rang, qui
                remonte en haut à droite. */}
            <div className="flex gap-4 sm:block">
              <span className={PASTILLE}>
                <e.icone className="hidden h-[18px] w-[18px] sm:block" strokeWidth={1.7} />
                <span className="font-mono text-[11px] font-semibold tracking-[0.06em] sm:hidden">
                  {e.rang}
                </span>
              </span>
              <div className="min-w-0 flex-1 sm:mt-4">
                <h3 className="o-h5 !text-[19px]">{e.titre}</h3>
                <p className="o-body mt-1.5 sm:mt-2">{e.texte}</p>
              </div>
            </div>
            <span className="absolute right-7 top-7 hidden font-mono text-[12px] font-medium tracking-[0.18em] text-[var(--o-muted)] sm:block">
              {e.rang}
            </span>
          </li>
        ))}
      </ol>

      {/* ——— les garanties, même coquille, sans rang ——— */}
      {cartes?.length ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {cartes.map((c, i) => (
            <div
              key={c.titre}
              data-reveal
              /* à deux colonnes (`sm`), un nombre impair de cartes laisse la
                 dernière seule avec un demi-rang vide à côté : elle prend la
                 largeur. À trois colonnes (`lg`) la rangée se remplit, le
                 span retombe. */
              className={`${COQUILLE} ${
                cartes.length % 2 === 1 && i === cartes.length - 1
                  ? "sm:col-span-2 lg:col-span-1"
                  : ""
              }`}
            >
              <span className={PASTILLE}>
                <c.icone className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <h3 className="o-h5 mt-5 !text-[19px]">{c.titre}</h3>
              <p className="o-body mt-2">{c.texte}</p>
              {c.media ? <div className="mt-auto pt-6">{c.media}</div> : null}
              {c.lien ? (
                <Link href={c.lien.href} className="o-link mt-5">
                  {c.lien.label}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
