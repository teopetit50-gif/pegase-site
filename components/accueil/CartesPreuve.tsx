import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   « CARTES DE PREUVE » — la rangée de faits courts (11/09/2026)

   ORIGINE. `achievement-cards` / `AwardCard` (21st.dev) — une carte plate
   à trois fentes : une icône à gauche, un intitulé gris au-dessus, un
   libellé gras en dessous, le tout aligné sur une seule ligne de base.
   Demandé par Teo, « il y a un peu trop de texte sur la page d'accueil,
   remplace certaines sections par ces composants ».

   POURQUOI ICI. La section hébergement était le bloc de texte le plus
   DENSE de la page : 31 lignes vues dans 922 px (mesuré à 1440 px par
   `outils/lignes-sections.mjs`), soit trois paragraphes de 4 à 5 lignes,
   une colonne d'introduction de 4 lignes, et une réserve de 5 lignes en
   pied. Or aucun de ces blocs ne raconte quoi que ce soit : ce sont six
   FAITS, et un fait tient en quatre mots. La forme de l'original — un
   intitulé, une valeur — est exactement celle d'un fait. La section passe
   de 31 lignes à 10 sans qu'une seule affirmation disparaisse.

   CE QUI EST JETÉ de la source :

   1. `cn()` de `@/lib/utils` et le dossier `components/ui` : ce dépôt n'a
      ni l'un ni l'autre (voir l'en-tête de `BentoChange`). Les classes se
      concatènent à la main et le composant vit dans `components/accueil/`.
   2. `framer-motion` et ses `containerVariants` / `itemVariants` : le site
      anime déjà `[data-reveal]` au scroll, en stagger GSAP, depuis
      `PageMotion`. Importer une seconde mécanique d'apparition pour le
      même effet aurait fait tourner deux animateurs sur un bloc.
   3. Les logos servis par `cdn.21st.dev` (Clerk, Microsoft, Product Hunt…)
      et leurs variantes `dark:invert` : ce sont des marques tierces sur un
      CDN tiers. Les icônes sont des traits `lucide-react`, déjà installé.
   4. Le rail `overflow-x-auto` de la démo sur mobile : un défilement
      horizontal à l'intérieur de `.o-wrap` sort de la colonne et fait
      déborder la page. Grille à 1 / 2 / 3 colonnes à toutes les largeurs.
   5. `hover:shadow-md` : l'ombre du site est celle de `.o-card`, en
      couches. Au survol la carte se lève de 2 px et son trait fonce, rien
      d'autre — la palette reste `--o-text` / `--o-line` / `--o-soft`.

   ÉCART ASSUMÉ, et c'est le point à ne pas défaire. La réserve sur les
   modèles d'intelligence artificielle — ils sont interrogés HORS d'Europe
   — était un paragraphe de cinq lignes en petit, centré sous la carte,
   c'est-à-dire l'endroit où l'on met ce qu'on espère ne pas voir lu. Elle
   devient ici une carte de plein droit, la sixième, au même poids visuel
   que les cinq autres. Une section qui affirme « vos données restent en
   Europe » ne survit à la question suivante (« et l'IA, elle tourne où ? »)
   qu'en y répondant à la même hauteur de caractères.
   ══════════════════════════════════════════════════════════════════════ */

export type CartePreuve = {
  icone: ReactNode;
  /** l'intitulé gris — ce dont on parle */
  intitule: string;
  /** le fait, en gras : quatre mots, une ligne, jamais deux */
  fait: string;
};

export default function CartesPreuve({ cartes }: { cartes: CartePreuve[] }) {
  return (
    <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {cartes.map((c) => (
        <li
          key={c.fait}
          data-reveal
          className="flex items-center gap-4 rounded-[12px] border border-[#e4e4e7] bg-white p-4 transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#c4c4c8]"
        >
          {/* la pastille d'icône reprend le fond `--o-soft` des cartes
              douces du site : c'est le seul gris de la page. */}
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-[9px] border border-[#f4f4f5] bg-[#fafafa] text-[#18181b]"
          >
            {c.icone}
          </span>
          <span className="flex min-w-0 flex-col text-left">
            <span className="o-small !text-[13px] !leading-[18px]">
              {c.intitule}
            </span>
            <span className="mt-0.5 text-[15px] font-semibold leading-[21px] text-[#09090b]">
              {c.fait}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
