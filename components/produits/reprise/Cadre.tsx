import { Plus } from "lucide-react";
import { cn } from "./cn";

/* ══════════════════════════════════════════════════════════════════════════
   TABLE DE CONVERSION DES JETONS (règle 3 du RAPATRIEMENT.md)

   Le site source déclarait ses couleurs dans un `@theme` de son globals.css,
   ce qui lui fabriquait des utilitaires (`bg-background`, `text-foreground`…).
   Ce `@theme` ne peut pas être rapatrié : il ne vaut que dans globals.css, et
   globals.css est un fichier partagé. Ces utilitaires N'EXISTENT DONC PAS ici,
   et Tailwind ne dit rien — elles ne peignent simplement rien.

   Toutes converties en valeur arbitraire, dans TOUS les fichiers de
   components/produits/reprise/ :

     bg-background          → bg-[#f5f5f5]        (+ /90 /95)
     bg-muted               → bg-[#f5f5f5]        (+ /30 /70)   ⚠ voir plus bas
     bg-card                → bg-[#f1f1f1]
     bg-popover             → bg-[#fafafa]
     bg-primary             → bg-[#171717]        (+ /90)
     bg-accent              → bg-[#e6e6e6]        (+ /60)
     bg-foreground          → bg-[#0a0a0a]        (+ /10 /30)
     text-foreground        → text-[#0a0a0a]      (+ /70 /90)
     text-muted-foreground  → text-[#737373]      (+ /70 /80)
     text-card-foreground   → text-[#0a0a0a]
     text-popover-foreground→ text-[#272727]
     text-primary           → text-[#171717]      (+ /70)
     text-primary-foreground→ text-[#fafafa]
     text-accent-foreground → text-[#171717]
     text-border            → text-[#d9d9d9]      (+ /70)
     border-border          → border-[#d9d9d9]
     divide-border          → divide-[#d9d9d9]
     border-ring            → border-[#a3a3a3]
     ring-ring/50           → ring-[#a3a3a3]/50
     fill-muted-foreground  → fill-[#737373]
     var(--color-border)    → #d9d9d9   (styles en ligne de recharts)
     var(--color-popover)   → #fafafa

   ⚠ DEUX PIÈGES, à ne jamais réintroduire :

   1. `bg-muted` EXISTE sur ce site — et vaut #9b9ba3, le gris de TEXTE de la
      charte. Chez la référence, `muted` valait EXACTEMENT le fond (#f5f5f5).
      Laisser un `bg-muted` ici peindrait des pavés gris au milieu de la page,
      sans la moindre erreur.
   2. Les bordures NUES (`border`, `border-b`, `border-x`, `divide-y`…)
      n'emportent aucune couleur : le site source posait
      `* { border-color: var(--color-border) }` dans son globals.css. Son
      équivalent borné à la page est dans reprise.css — sans lui ces filets
      retombent sur `currentColor`, donc noirs.
   ═══════════════════════════════════════════════════════════════════════ */

/** Croix d'angle : deux traits couleur fond qui masquent le filet pointillé,
 *  puis un « + ». Relevé tel quel sur la référence (h-6, décalage -3). */
function Croix({ cote }: { cote: "gauche" | "droite" }) {
  return (
    <div
      className={cn(
        "-bottom-3 absolute z-10 hidden h-6 sm:block",
        cote === "gauche" ? "-left-3" : "-right-3 -translate-x-px",
      )}
    >
      <div className="relative h-6 w-6">
        <div className="absolute left-3 h-6 w-px bg-[#f5f5f5]" />
        <div className="absolute top-3 h-px w-6 bg-[#f5f5f5]" />
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2">
          {/* `dark:text-border` retiré : la page est figée en clair. */}
          <Plus size={20} className="text-[#d9d9d9]/70" />
        </div>
      </div>
    </div>
  );
}

/** Colonne centrale : conteneur, filets pointillés latéraux, croix d'angle. */
export function Cadre({
  children,
  className,
  sansCroix,
}: {
  children: React.ReactNode;
  className?: string;
  sansCroix?: boolean;
}) {
  return (
    /* `container` du site source → `.rp-colonne` (reprise.css) : une
       `@utility` ne vit que dans globals.css, et la `container` de ce site
       n'a ni le même plafond ni le même padding. */
    <div className="rp-colonne relative mx-auto overflow-x-clip 2xl:overflow-x-visible">
      <div className={cn("border-[#d9d9d9] border-dashed sm:border-x", className)}>
        {children}
      </div>
      {!sansCroix && (
        <>
          <Croix cote="gauche" />
          <Croix cote="droite" />
        </>
      )}
    </div>
  );
}

/** Bande hachurée de 2 rem qui sépare deux sections. */
export function Separateur() {
  return (
    <section data-monde="clair">
      <Cadre>
        <div className="h-8 rp-dashed" />
      </Cadre>
    </section>
  );
}

/** Titre de section : phrase noire puis suite atténuée, sur une même ligne. */
export function TitreSection({
  titre,
  suite,
  enfant,
  className,
}: {
  titre: string;
  suite?: string;
  enfant?: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "max-w-4xl font-medium text-[#0a0a0a] text-xl sm:text-2xl md:text-3xl lg:text-4xl",
        className,
      )}
    >
      {titre}{" "}
      {/* Écart assumé, mobile uniquement. La référence coule le titre et sa
          suite dans UNE seule taille (20 px à 390). Son anglais tient en cinq
          lignes ; notre français en fait sept — 196 px de titre, et plus
          aucune hiérarchie avec le texte des cartes, lui aussi à 18 px. Sous
          640 la suite repasse donc en taille de texte courant (15 px), ce qui
          rend un « titre + paragraphe » au lieu d'un mur. Au-delà de sm, rien
          ne change : la géométrie relevée reste intacte. */}
      <span className="text-[#737373] max-sm:text-[15px] max-sm:leading-[1.5]">
        {suite}
        {enfant}
      </span>
    </h2>
  );
}
