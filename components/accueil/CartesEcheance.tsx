"use client";

import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   L'ÉCHÉANCE — les trois cartes penchées qui se dépilent (11/09/2026)

   ORIGINE. `display-cards` de @serafimcloud (21st.dev) — trois cartes
   penchées de 8°, empilées en escalier par `[grid-area:stack]` et des
   `translate`, qui se dépilent au survol. Demandé par Teo le 11/09 à la
   place du pavé de texte qui occupait la colonne droite de la section.

   À SAVOIR. Ce composant existe DÉJÀ dans `filed-site`
   (`components/ui/display-cards.tsx`, intégré le 09/09) — mais il y est
   marqué « EN RÉSERVE » et n'est importé nulle part : aucune des quatre
   vitrines ne l'affiche. La consigne « pas les mêmes composants que les
   SaaS » tient donc à l'écran, qui est ce qui compte ; elle ne tient pas
   au fichier. Si filed-site finit par s'en servir, c'est ici qu'il faudra
   trancher, et les deux versions n'ont de toute façon ni le même fond
   (clair là-bas, noir ici) ni le même contenu.

   CE QUI EST JETÉ.
   1. `cn()` de `@/lib/utils` et le dossier `components/ui` : ce dépôt n'a
      ni l'un ni l'autre (voir l'en-tête de `PortesHover`).
   2. Tous les jetons shadcn — `bg-muted/70`, `after:from-background`,
      `before:bg-background/50`, `outline-border`. Ils n'existent pas dans
      cette feuille : la carte prend les variables du monde sombre
      (`.o-nuit`), et le dégradé de droite fond vers le #09090b de la
      section, ce qui est exactement ce que la source cherchait à faire.
   3. Les accents bleus (`bg-blue-800`, `text-blue-300`, `text-blue-500`) :
      la page est monochrome.
   4. `grayscale-[100%]` sur les cartes du dessous. Sur un fond noir et une
      palette déjà sans couleur, désaturer ne produit rien du tout. Le même
      effet — « celle-ci est au-dessus, les autres attendent » — est obtenu
      par l'opacité du texte et la clarté du filet.
   5. **`whitespace-nowrap` sur la description.** C'est un piège : la carte
      a une largeur FIXE (`w-[22rem]`), donc une description un peu longue
      sort du cadre et pousse la page à défiler de côté. On vient d'en
      corriger un ce matin sur le tableau des trois entrées ; celui-ci
      serait arrivé par la même porte. Le texte passe à la ligne.

   ÉCART ASSUMÉ, et c'est le seul qui compte : la largeur des cartes et
   l'amplitude de l'escalier sont RESPONSIVES (17rem / 20rem, décalages de
   2 et 4rem sous `sm`). La source fige 22rem et décale jusqu'à 8rem, soit
   480 px d'empreinte — dans une colonne de 342 px à 390, la page partait
   de côté. Le cadre extérieur coupe en plus ce qui dépasserait du penché.

   Le troisième emplacement de la source s'appelle `date`. Ici il porte
   une date sur deux cartes et « Votre fichier client » sur la troisième —
   d'où le nom `bas` plutôt que `date`.
   ══════════════════════════════════════════════════════════════════════ */

export type CarteEcheance = {
  icone: ReactNode;
  titre: string;
  texte: string;
  bas: string;
  /* placement dans l'escalier — posé par l'appelant, comme chez la source */
  place: string;
};

function Carte({ icone, titre, texte, bas, place }: CarteEcheance) {
  return (
    <div
      className={
        "group relative flex h-36 w-[17rem] -skew-y-[8deg] select-none flex-col justify-between rounded-[12px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-4 py-3 backdrop-blur-sm transition-all duration-700 motion-reduce:transition-none " +
        "after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[13rem] after:bg-gradient-to-l after:from-[#09090b] after:to-transparent after:content-[''] " +
        "hover:border-[rgba(255,255,255,0.34)] hover:bg-[rgba(255,255,255,0.09)] hover:after:opacity-0 " +
        "sm:w-[20rem] sm:after:w-[16rem] " +
        place
      }
    >
      <div className="relative z-10 flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.12)] p-1.5 text-white">
          {icone}
        </span>
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-white">
          {titre}
        </p>
      </div>
      <p className="relative z-10 text-[15px] leading-[22px] text-[#d4d4d8]">
        {texte}
      </p>
      <p className="relative z-10 text-[13px] text-[#a1a1aa]">{bas}</p>
    </div>
  );
}

export default function CartesEcheance({ cartes }: { cartes: CarteEcheance[] }) {
  return (
    /* `overflow-hidden` coupe ce que le penché de 8° jette hors du cadre ;
       le padding vertical lui redonne la place de ne PAS être coupé en
       haut et en bas. Sans ce cadre, l'escalier fait déborder la page. */
    <div className="overflow-hidden py-10">
      <div className="grid place-items-center [grid-template-areas:'stack']">
        {cartes.map((c) => (
          <Carte key={c.titre} {...c} />
        ))}
      </div>
    </div>
  );
}
