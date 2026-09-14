"use client";

/* Les deux pièces vivantes des maquettes de `#suivi`.

   `CheminAnime` et `FileVivante` vivaient ici aussi ; la grille
   `#fonctionnement` a été refaite sur l'implémentation de la référence et
   les porte désormais elle-même (`components/Bento.tsx`). Les laisser en
   double garantissait qu'on corrige un jour le mauvais fichier. Rien ici n'est décoratif au hasard — chaque animation dit
   quelque chose de vrai sur ce que fait le système.

   Tout s'arrête si le visiteur a demandé moins de mouvement : les deux
   animations sont purement CSS et le bloc `prefers-reduced-motion` de
   factures.css les coupe. Il n'y a donc plus ni état, ni effet, ni garde
   `mouvementReduit()` ici — ils étaient partis avec les deux composants
   déplacés dans Bento.tsx et ne laissaient qu'un avertissement de lint.

   11/09 — passage en clair : la pastille et la barre passent du blanc à
   l'encre. La LUEUR de la jauge, elle, reste claire — voir la note
   posée sur `meter-scan` plus bas, c'est le seul endroit de la page où
   un blanc reste un blanc. */

export function PointVivant({ libelle = "en direct" }: { libelle?: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5f5f5f]">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#171717]/45 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#171717]/75" />
      </span>
      {libelle}
    </span>
  );
}


export function JaugeScan({
  valeur,
  className = "",
}: {
  valeur: number;
  className?: string;
}) {
  return (
    <div className={`relative h-1.5 w-full overflow-hidden rounded-full bg-[#171717]/[0.07] ${className}`}>
      <div className="h-full rounded-full bg-[#171717]/85" style={{ width: `${valeur}%` }} />
      <span
        aria-hidden="true"
        /* 11/09 — LA LUEUR RESTE CLAIRE, contre l'instinct. Elle balaie
           toute la piste, mais elle ne se voit que sur la part REMPLIE,
           qui est de l'encre : c'est une brillance qui court sur un objet
           sombre, exactement ce que faisait l'original. Une lueur sombre
           aurait disparu là où ça compte et sali la piste vide. */
        className="meter-scan pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/85 to-transparent"
      />
    </div>
  );
}

