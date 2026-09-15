import * as React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";
import "./hero-section-dark.css";

/* ══════════════════════════════════════════════════════════════════════
   hero-section-dark — repris de 21st.dev, collé par Teo le 15/09/2026
   pour /tarifs : « explique qu'on chiffre à l'audit et pourquoi on peut
   pas mettre de prix directement ».

   CE QU'ON GARDE — la composition, qui est la raison de le prendre :
   une pastille d'annonce, un grand titre en DEUX TONS, une phrase, un
   seul bouton, le tout centré sur une nappe quadrillée en fuite. C'est
   plus court et plus frappant que le chapô de six lignes qu'il remplace.

   CE QU'ON NE GARDE PAS, et pourquoi — même arbitrage que le hero de
   l'accueil (`hero-section.tsx`, 14/09 : « on ne lui prend que
   l'animation ») :

   1. LE FOND NOIR ET LES DÉGRADÉS VIOLET/ROSE. La charte du site est
      claire et quasi monochrome, et Teo a déjà fait retirer les bandes
      noires de l'accueil. Le second ton du titre est un gris du
      nuancier, pas un dégradé de couleur.
   2. TOUTES LES VARIANTES `dark:`. En Tailwind v4, `dark:` suit l'OS et
      non une classe : sur une machine en thème sombre, la moitié des
      règles d'origine se serait appliquée par-dessus le fond clair de la
      page. Il n'en reste aucune.
   3. `font-geist`, absente du projet (les titres sont en Jakarta).
   4. LE BOUTON À BORDURE CONIQUE TOURNANTE. Une bordure qui tourne en
      boucle à côté d'une nappe qui défile fait deux mouvements
      permanents pour un seul écran. Le bouton est celui du site.
   5. `bottomImage`. La capture de tableau de bord de l'original n'a rien
      à montrer ici : la page a déjà son calculateur juste en dessous.
   6. `@/lib/utils` → `@/lib/cn`, le helper de ce dépôt.

   La trame et son animation vivent dans `hero-section-dark.css` : la
   classe `animate-grid` de l'original n'est déclarée nulle part dans ce
   dépôt et serait restée sans effet, sans erreur (voir l'en-tête du CSS).
   ══════════════════════════════════════════════════════════════════════ */

type ReglagesTrame = {
  /** l'inclinaison de la nappe, en degrés */
  angle?: number;
  /** le côté d'une cellule, en px */
  cellule?: number;
  opacite?: number;
  ligne?: string;
};

export interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** la pastille d'annonce, au-dessus du titre */
  annonce?: string;
  /** le titre, en deux tons : la seconde moitié passe en gris */
  titre: { debut: string; accent: string };
  description: string;
  ctaTexte: string;
  ctaHref: string;
  /** la ligne discrète sous le bouton */
  souscta?: string;
  trame?: ReglagesTrame;
}

const Trame = ({ angle = 65, cellule = 60, opacite = 0.45, ligne = "#d8d8d8" }: ReglagesTrame) => (
  <div
    aria-hidden
    className="hsd-trame"
    style={
      {
        "--hsd-angle": `${angle}deg`,
        "--hsd-cellule": `${cellule}px`,
        "--hsd-opacite": opacite,
        "--hsd-ligne": ligne,
      } as React.CSSProperties
    }
  >
    <div className="hsd-trame-plan">
      <div className="hsd-trame-lignes absolute" />
    </div>
    <div className="hsd-fondu" />
  </div>
);

const HeroSection = React.forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ className, annonce, titre, description, ctaTexte, ctaHref, souscta, trame, ...props }, ref) => (
    <div className={cn("hsd", className)} ref={ref} {...props}>
      <Trame {...trame} />

      <div className="hsd-dedans r-wrap py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {annonce ? (
            <p className="mx-auto mb-6 w-fit rounded-full border border-[#e3e3e3] bg-white/70 px-4 py-1.5 text-[13px] font-medium text-[#616161] backdrop-blur-sm">
              {annonce}
              <ChevronRight aria-hidden className="ml-1.5 inline size-3.5 text-[#8a8a8a]" />
            </p>
          ) : null}

          {/* le titre en deux tons : l'original vire au violet, ici la
              seconde moitié passe simplement en gris — c'est le même
              effet de relief, dans le nuancier de la maison */}
          <h1 className="text-balance font-[family-name:var(--font-jakarta)] text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#050505] min-[480px]:text-[40px] sm:text-5xl">
            {titre.debut} <span className="text-[#9a9a9a]">{titre.accent}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-[27px] text-[#616161]">
            {description}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href={ctaHref}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#050505] px-8 text-[15px] font-medium text-white transition-colors hover:bg-[#242424]"
            >
              {ctaTexte}
            </a>
            {souscta ? <p className="text-xs text-[#767676]">{souscta}</p> : null}
          </div>
        </div>
      </div>
    </div>
  ),
);
HeroSection.displayName = "HeroSection";

export { HeroSection };
