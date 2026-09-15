"use client";

import * as React from "react";

/* ══════════════════════════════════════════════════════════════════════
   CARTE DE VERRE — la coque des cartes du catalogue (15/09/2026)

   ORIGINE. `glass-card` (21st.dev) : une carte encre profonde à coins
   très arrondis, doublée d'un panneau de verre en retrait, qui BASCULE en
   3D au survol pendant que quatre disques concentriques se détachent du
   fond en cascade. C'est le composant que Teo a désigné, capture à
   l'appui : « change le design de ces cartes avec ce composant, je veux
   la même chose ».

   Ce fichier ne porte QUE la coque et ses mécaniques 3D. Le contenu est
   fourni par l'appelant (`components/accueil/TuilesCatalogue.tsx`), parce
   que la démo d'origine range dans sa carte un titre en dur, trois
   boutons de réseaux sociaux et un « View more » qui ne correspondent à
   rien ici.

   ——— écarts au composant d'origine ————————————————————————————————————

   1. PAS DE BOUTONS DE RÉSEAUX. La source pose Instagram / Twitter /
      GitHub en bas à gauche — trois comptes que nous n'avons pas. Un lien
      social inventé sur une vitrine commerciale est un lien mort le jour
      où quelqu'un clique. Le geste qui les faisait sortir de la carte
      (`translate3d(0,0,50px)` en cascade) n'est pas perdu pour autant :
      il est repris par le disque blanc qui porte le signe du produit.

   2. LA CARTE EST UNE PORTE, DONC LA COQUE N'EST PAS LE CADRE. La source
      est un `div` autonome qui porte lui-même `group` et la perspective.
      Ici chaque carte mène à sa page produit : c'est le `<Link>` qui doit
      être l'élément survolé. L'appelant pose donc `CADRE_VERRE` sur son
      lien, et `GlassCard` s'installe dedans. Sans cet ancêtre `group`,
      TOUS les `group-hover:` de ce fichier sont muets — et muets en
      silence, sans erreur ni avertissement.

   3. L'ANGLE EST UN RÉGLAGE, ET SA VALEUR PAR DÉFAUT EST PLUS SAGE. La
      source bascule de 30° sur une carte de 290 px de large. Nos cartes
      font ~490 px en 2 × 2 : à 30°, le coin haut-droit d'une carte passe
      devant sa voisine (la grille ne laisse que 16 px de gouttière) et le
      texte devient illisible en biais. 12° donne le même geste sans le
      chevauchement.

   4. LES DIMENSIONS NE SONT PAS FIGÉES. La source vit en `h-[300px]
      w-[290px]`. Une carte de catalogue doit s'aligner sur ses voisines
      et encaisser un intitulé d'une ligne de plus : la hauteur vient de
      la grille, la largeur de la colonne.
   ══════════════════════════════════════════════════════════════════════ */

/* À poser sur l'élément qui ENVELOPPE la carte (voir écart nº 2). */
export const CADRE_VERRE = "group block [perspective:1000px]";

/* Les quatre disques du fond, du plus large au plus étroit. `bord` est
   leur distance au coin haut-droit, `z` leur profondeur au repos, `delai`
   leur rang dans la cascade. Valeurs de la source, inchangées. */
const DISQUES = [
  { taille: 170, bord: 8, z: 20, delai: "0s" },
  { taille: 140, bord: 10, z: 40, delai: "0.4s" },
  { taille: 110, bord: 17, z: 60, delai: "0.8s" },
  { taille: 80, bord: 23, z: 80, delai: "1.2s" },
];

export type GlassCardProps = {
  /* ce qui occupe le disque blanc, en haut à droite */
  marque?: React.ReactNode;
  /* basculement au survol, en degrés — voir l'écart nº 3 */
  angle?: number;
  className?: string;
  children: React.ReactNode;
};

export function GlassCard({
  marque,
  angle = 12,
  className = "",
  children,
}: GlassCardProps) {
  return (
    <div
      className={`relative h-full rounded-[50px] bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-2xl transition-all duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[box-shadow:rgba(0,0,0,0.3)_30px_50px_25px_-40px,rgba(0,0,0,0.1)_0px_25px_30px_0px] group-hover:[transform:rotate3d(1,1,0,var(--bascule))] ${className}`}
      style={{ "--bascule": `${angle}deg` } as React.CSSProperties}
    >
      {/* le panneau de verre, en retrait de 8 px : c'est lui qui donne
          l'épaisseur — deux arcs concentriques plutôt qu'un seul bord. */}
      <div
        aria-hidden
        className="absolute inset-2 rounded-[46px] border-b border-l border-white/20 bg-gradient-to-b from-white/[0.22] to-white/[0.06] backdrop-blur-sm [transform-style:preserve-3d] [transform:translate3d(0,0,25px)]"
      />

      {/* les disques, et le signe du produit posé dessus */}
      <div
        aria-hidden={!marque}
        className="pointer-events-none absolute top-0 right-0 [transform-style:preserve-3d]"
      >
        {DISQUES.map((d) => (
          <div
            key={d.taille}
            aria-hidden
            className="absolute aspect-square rounded-full bg-white/10 shadow-[rgba(100,100,111,0.2)_-10px_10px_20px_0px] transition-all duration-500 ease-in-out"
            style={{
              width: d.taille,
              top: d.bord,
              right: d.bord,
              transform: `translate3d(0, 0, ${d.z}px)`,
              transitionDelay: d.delai,
            }}
          />
        ))}
        {marque ? (
          <div
            className="absolute grid aspect-square w-[50px] place-content-center rounded-full bg-white shadow-[rgba(100,100,111,0.2)_-10px_10px_20px_0px] transition-all duration-500 ease-in-out [transform:translate3d(0,0,100px)] [transition-delay:1.6s] group-hover:[transform:translate3d(0,0,120px)]"
            style={{ top: 30, right: 30 }}
          >
            {marque}
          </div>
        ) : null}
      </div>

      {/* le contenu, un cran devant le panneau de verre */}
      <div className="relative flex h-full flex-col [transform-style:preserve-3d] [transform:translate3d(0,0,26px)]">
        {children}
      </div>
    </div>
  );
}

export default GlassCard;
