import type { ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   « CE QUE ÇA CHANGE » — le bento à cartes pointillées (11/09/2026)

   ORIGINE. `ruixen-bento-cards` de @ruixen.ui (21st.dev) — cinq cartes à
   bordure POINTILLÉE dans une grille de six colonnes, un « + » posé à
   chacun de leurs quatre coins, et le titre de section rejeté en bas à
   DROITE au lieu d'être centré en haut. Demandé par Teo le 11/09 en
   remplacement des deux colonnes symétriques qui tenaient cette section.

   POURQUOI ÇA MARCHE ICI. Les onze autres sections de la page sont toutes
   bâties pareil : pastille centrée, titre centré, chapô centré, contenu.
   Celle-ci inverse l'ordre — on lit les cartes, le titre vient après et
   d'un autre côté. C'est la seule rupture de rythme de la page, et elle
   ne coûte rien puisque la section garde exactement son rôle.

   CE QUI EST JETÉ, et il faut le savoir avant de remettre la source à jour :

   1. **Le lien sortant.** Chaque carte de l'original est entièrement
      enveloppée dans un `<Link href="https://ruixen.com/?utm_source=
      21stdev&utm_medium=button&utm_campaign=ruixen_bento_cards">`. C'est
      le lien d'attribution de l'auteur, avec ses paramètres de campagne.
      Le garder aurait posé cinq liens sortants publicitaires au milieu de
      la page d'accueil, et rendu chaque carte cliquable vers un site
      tiers. Retiré, évidemment. Les cartes ne sont plus cliquables du
      tout : elles n'ont pas de destination.
   2. `cn()` de `@/lib/utils` et le dossier `components/ui` : ce dépôt n'a
      ni l'un ni l'autre (voir l'en-tête de `PortesHover`). Les classes se
      concatènent à la main, le composant vit dans `components/accueil/`
      avec les trois autres reprises du jour.
   3. `import Image from "next/image"` : importé par la source, jamais
      utilisé.
   4. `"use client"` : plus rien n'est interactif une fois le lien parti.
      La section redevient du rendu serveur, comme le reste de la page.
   5. Toutes les variantes `dark:` (`dark:bg-zinc-950`, `dark:text-white`…)
      et les gris `zinc`/`gray` de Tailwind : cette page n'a pas de monde
      sombre, et sa palette est celle de `.offres` — `--o-line`,
      `.o-h5`, `.o-body`.
   6. Le double cadre `border` posé sur la `<section>` ET sur le
      `container` : le site n'encadre pas ses sections pleine largeur. Il
      en reste UN, calé sur `.o-wrap`.

   ÉCART ASSUMÉ. La source ne prévoit que du texte dans ses cartes. Les
   deux maquettes de la section précédente (la file de validation, le
   journal) y sont réinjectées, dans les deux seules cartes assez hautes
   pour les porter. Sans elles, cette zone de la page devenait un mur de
   texte de cinq blocs — l'inverse de ce que la refonte cherche.

   Les cinq textes ne sont pas écrits pour l'occasion : deux viennent des
   `BENEFICES` que cette section portait déjà, trois sont le résumé de
   réponses de la FAQ, plus bas sur cette même page. Rien de neuf n'est
   affirmé.
   ══════════════════════════════════════════════════════════════════════ */

export type CarteBento = {
  titre: string;
  texte: string;
  /* la colonne de gauche de l'ancienne section, quand la carte est assez
     haute pour la porter */
  maquette?: ReactNode;
  span: string;
};

function Plus({ position }: { position: string }) {
  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={22}
      height={22}
      strokeWidth="1"
      stroke="currentColor"
      className={`absolute text-[#a1a1aa] ${position}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
}

function CartePlus({ titre, texte, maquette, span }: CarteBento) {
  return (
    <div
      data-reveal
      /* 15/09/2026 — le plancher de 200 px et le rembourrage de 24 px
         viennent de la grille à six colonnes, où ils alignent les cinq
         cartes. À une colonne ils n'alignent rien : mesuré à 375 px, les
         cinq cartes faisaient 1 450 px à elles seules. */
      className={`relative flex flex-col justify-between rounded-[10px] border border-dashed border-[#c4c4c8] bg-white p-5 sm:min-h-[200px] sm:p-7 ${span}`}
    >
      {/* les quatre « + » débordent volontairement des angles : c'est le
          motif de l'original, un repère de plan plutôt qu'un cadre. */}
      <Plus position="-left-[11px] -top-[11px]" />
      <Plus position="-right-[11px] -top-[11px]" />
      <Plus position="-bottom-[11px] -left-[11px]" />
      <Plus position="-bottom-[11px] -right-[11px]" />

      <div className="relative z-10">
        <h3 className="o-h5 !text-[17px] !leading-[1.3] sm:!text-[20px] sm:!leading-[1.35]">{titre}</h3>
        <p className="o-body mt-2 !text-[14px] !leading-[22px] sm:mt-3 sm:!text-[15px] sm:!leading-[26px]">{texte}</p>
      </div>

      {maquette ? (
        <div className="relative z-10 mt-5 overflow-hidden rounded-[8px] border border-[#f4f4f5] sm:mt-7">
          {maquette}
        </div>
      ) : null}
    </div>
  );
}

export default function BentoChange({
  cartes,
  pastille,
  titre,
  chapo,
}: {
  cartes: CarteBento[];
  pastille: string;
  titre: string;
  chapo: string;
}) {
  return (
    <div className="o-wrap">
      <div className="rounded-[14px] border border-[#e4e4e7] px-4 py-7 sm:px-8 sm:py-12">
        {/* la grille de six colonnes de la source : 3+2 sur la première
            rangée (la sixième colonne reste vide, c'est là que remonte le
            titre), puis 4+2, puis 2. */}
        <div className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-6">
          {cartes.map((c) => (
            <CartePlus key={c.titre} {...c} />
          ))}
        </div>

        {/* le titre rejeté en bas à droite — la signature du composant.
            `lg:-mt-20` le fait remonter dans la colonne laissée libre par
            la dernière rangée ; sous lg il redescend simplement à la
            suite, aligné à gauche comme le reste de la page. */}
        <div className="mt-7 max-w-[560px] px-1 sm:mt-10 lg:-mt-16 lg:ml-auto lg:text-right">
          <span className="o-pill o-pill--xs">{pastille}</span>
          <h2 className="o-h2 mt-4 !text-[clamp(28px,3.4vw,40px)]">{titre}</h2>
          <p className="o-lead mt-3 md:mt-4">{chapo}</p>
        </div>
      </div>
    </div>
  );
}
