import { cn } from "./cn";

/* ══════════════════════════════════════════════════════════════════════════
   La marque « France » de la section #france.

   Le tracé n'est pas repris d'un fichier tiers : il est CONSTRUIT à partir de
   coordonnées géographiques réelles, projetées dans la boîte 24×24.
   Bornes retenues : longitude −5 (pointe de Bretagne) à +9,6 (cap Corse),
   latitude 51,1 (Dunkerque) à 41,3 (Bonifacio) ; d'où
       x = 2 + (lon + 5) × 1,37     y = 2 + (51,1 − lat) × 2,04
   Chaque sommet correspond à un point de côte ou de frontière — Gris-Nez,
   Le Havre, Cherbourg, Brest, La Rochelle, Biarritz, Perpignan, Marseille,
   Nice, les Alpes, Strasbourg. Simplifié à 18 sommets : au-delà, à 20 px, le
   contour se referme sur lui-même et devient une tache.

   Dessiné en APLAT, et non au trait comme les icônes lucide voisines : à
   20 px un contour de 18 sommets se referme sur lui-même et rend une tache
   illisible. L'aplat garde la silhouette lisible à cette taille — c'est la
   marque de la section, elle a le droit de se distinguer de la rangée.
   ═══════════════════════════════════════════════════════════════════════ */
/* Props en `SVGProps` et non `{ className }` : la table d'icônes de
   components/produits/reprise/Francais.tsx mélange ce tracé et des icônes
   lucide, et leur passe un `strokeWidth`. Un composant plus étroit ferait
   échouer le typage au build de l'orchestrateur — `strokeWidth` est ignoré
   ici, l'aplat n'a pas de contour. */
export function LogoFrance({ className, ...reste }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...reste}
    >
      {/* Métropole */}
      <path d="M12.1 2.2 10.9 4 9 5.3 6.7 4.9 6.1 7.1 2.5 7.5 5 9.6 7.2 12
               7.2 15.1 6.7 17.7 10.5 19.4 13.2 17.5 15.3 17.9 18 17.1
               17.3 12.8 18.7 7.1 16.2 5.1 13.1 3 Z" />
      {/* Corse */}
      <path d="M21.5 18.4 21.8 20 21.1 21.5 20.6 20.4 20.8 19.1 Z" />
    </svg>
  );
}

/* Le drapeau, en vrai. Un accent de 6 px était trop discret : Teo veut qu'on
   voie tout de suite que le produit est français.

   Proportions officielles 2:3 (hauteur:largeur). Les trois bandes sont
   d'égale largeur — la correction optique de Louis-Philippe (30/33/37) ne
   vaut que pour un drapeau qui flotte, pas pour un rectangle posé à plat.
   Couleurs de la charte de l'État : #000091 et #E1000F.

   Le filet extérieur n'est pas décoratif : sans lui, la bande blanche se
   confond avec le fond #f5f5f5 de la page et le drapeau n'a plus que deux
   bandes. (`dark:ring-white/15` retiré : la page est figée en clair.) */
export function DrapeauFrance({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Drapeau français"
      /* cn() et non une concaténation : sans fusion, un `h-6` passé par
         l'appelant coexiste avec le `h-8` de base et c'est l'ordre de la
         feuille qui tranche — le drapeau garde alors sa taille par défaut,
         sans le moindre message d'erreur. */
      className={cn(
        "inline-flex h-8 w-12 shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10",
        className,
      )}
    >
      <span className="flex-1 bg-[#000091]" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-[#E1000F]" />
    </span>
  );
}
