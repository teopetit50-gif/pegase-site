import Link from "next/link";
import { COURRIEL } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <ClotureSite> — la clôture au noir de /tarifs/site (14/09/2026)

   ORIGINE. `cta13` de shadcnblocks (bloc gratuit, registre shadcn) : une
   pile verticale — titre, description, rangée de deux boutons (plein +
   contour) — dont les boutons prennent toute la largeur sous `sm` et se
   rangent côte à côte au-dessus. Le `cta4` a été regardé et écarté : ses
   deux colonnes (argument à gauche, liste à coches à droite) font un
   récapitulatif, pas une clôture ; centré sur fond noir, il n'aurait
   rien à mettre dans sa colonne de droite.

   POURQUOI ICI. La clôture précédente était déjà une pile centrée ; ce
   qui lui manquait, c'est ce que cta13 impose : une rangée de boutons
   qui tient sur téléphone (pleine largeur, empilés) au lieu d'un
   `flex-wrap` qui casse la ligne au hasard des libellés, et des paliers
   nets. Les deux notes de pied (le courriel, l'autre porte) restent, mais
   la seconde est séparée de la vente par un filet : la mention du
   diagnostic devient un pied de section, plus une phrase de plus sous
   les boutons.

   CE QUI EST JETÉ de la source, et pourquoi :
   · La carte `bg-accent` arrondie et son `container` : la section
     appelante est déjà la bande `.o-nuit` pleine largeur ; une carte
     dedans referait la clôture de /modeles (ClotureAppel), et la page a
     déjà sa carte sombre en section 5.
   · `text-muted-foreground`, `text-2xl md:text-4xl`, `tracking-tight` :
     aucun de ces jetons n'existe ici. Le titre est `.o-h2`, le chapô
     `.o-lead`, les notes `.o-small` — sous `.o-nuit`, ils prennent seuls
     le blanc et le gris zinc.
   · `<Button>` de shadcn (`@/components/ui/button`) et `cn` : absents du
     dossier et inutiles. Les boutons sont `.o-btn o-btn--primary` /
     `o-btn--ghost`, dont `.o-nuit` définit déjà la version de nuit
     (blanc plein, verre) — rien n'est redessiné.
   · Les props `heading` / `description` / `buttons` et leurs défauts
     anglais : aucune prop, les textes sont ceux de la page. Les `<a>`
     nus deviennent des `Link` (routes internes).
   · L'alignement à gauche de la source : la clôture de l'accueil, dont
     celle-ci reprend le geste, est centrée.

   ÉCARTS ASSUMÉS.
   · Le filet et la trame pointillée ne viennent pas de cta13, qui n'a que
     sa carte. Le filet sépare la vente du pied ; la trame `.o-dots` qui
     ferme la bande par le bas (`o-dots-fade-up`) fait écho à celle qui
     ouvre le hero par le haut : la page s'ouvre et se ferme sur la même
     trame, en version nuit (`--o-dot` est redéfini par `.o-nuit`).
   · Le `gap-3` de la rangée est celui de la maison (accueil, hero de
     cette page), pas le `sm:gap-4` de la source.
   · Les `data-reveal` sont gardés bloc par bloc, comme avant ; le filet
     en porte un aussi, pour entrer dans la même cascade.
   ══════════════════════════════════════════════════════════════════════ */

export default function ClotureSite() {
  return (
    <>
      {/* la trame pointillée du bas de bande — la section appelante est
          `relative`, le calque s'y accroche ; `.o-nuit` lui donne ses
          points blancs. Sous l'o-wrap dans l'ordre du DOM, donc peint
          dessous. */}
      <div
        aria-hidden
        className="o-dots o-dots-fade-up pointer-events-none absolute inset-x-0 bottom-0 top-1/2"
      />

      <div className="o-wrap relative flex flex-col items-center text-center">
        <h2 data-reveal className="o-h2 max-w-[620px]">
          Commandez en deux minutes. Nous faisons le reste.
        </h2>
        <p data-reveal className="o-lead mt-5 max-w-[600px]">
          Un modèle, votre brief, et nous écrivons tout à votre métier et à votre marque. Rien à payer en ligne aujourd&apos;hui&nbsp;: nous vous appelons pour régler, et votre éligibilité au Chèque TIC se vérifie avant tout engagement.
        </p>

        {/* la rangée de cta13 : colonne pleine largeur sous sm, côte à côte
            au-dessus. `w-full` sur la rangée ET sur chaque bouton — l'o-wrap
            est `items-center`, sans lui la rangée se rétrécirait au
            contenu. Plafond à 320 px : le survol de `.o-btn` est un cercle
            d'encre de 320 px de diamètre (globals.css) ; plus large, le
            bouton ne serait jamais recouvert jusqu'aux bouts. Pleine
            largeur jusqu'à 368 px d'écran, centrée au-dessus ; `sm:max-w-none`
            rend la largeur libre à la rangée côte à côte. */}
        <div
          data-reveal
          className="mt-9 flex w-full max-w-[320px] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center"
        >
          <Link href="/site/commande" className="o-btn o-btn--primary w-full sm:w-auto">
            Commander le site
          </Link>
          <Link href="/contact" className="o-btn o-btn--ghost w-full sm:w-auto">
            Nous joindre
          </Link>
        </div>
        <p data-reveal className="o-small mt-5 !text-[13px]">
          {COURRIEL}, nous vous répondons le jour même.
        </p>

        {/* le filet : la vente au-dessus, le pied au-dessous. Couleur
            explicite (Tailwind v4 peindrait un `border` nu en currentColor,
            ici c'est un fond, même prudence). */}
        <span aria-hidden data-reveal className="mt-10 h-px w-full max-w-[520px] bg-white/[0.12]" />

        {/* la mention discrète de l'autre porte : pour qui s'est trompé
            d'aiguillage, sans re-poser deux portes ici */}
        <p data-reveal className="o-small mt-8 max-w-[520px] !text-[13px] !leading-[20px]">
          Plusieurs enseignes, plusieurs services, une charte à respecter&nbsp;? Le site n&apos;est alors qu&apos;une surface de plus dans un ensemble qui se mesure d&apos;abord — périmètre, données, intégrations. On commence par une enseigne pilote, et le prix est établi à l&apos;issue d&apos;un diagnostic.{" "}
          <Link href="/reserver-un-audit" className="underline underline-offset-4 hover:text-white">
            Demander un diagnostic
          </Link>
        </p>
      </div>
    </>
  );
}
