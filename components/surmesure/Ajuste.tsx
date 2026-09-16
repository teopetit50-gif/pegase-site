"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Le bloc qui RÉTRÉCIT au lieu de se réorganiser (16/09/2026)

   Teo : « sur leur version mobile rien ne bouge, le composant rétrécit
   mais reste le même ; chez nous ça change de forme. Je veux que rien ne
   change et que ça fasse pareil qu'eux, juste rétrécir. »

   Il a raison sur le constat, et la raison est simple : leur schéma est
   une IMAGE. Une image ne se réorganise pas, elle se met à l'échelle. Le
   nôtre est du balisage, et il se repliait en colonne sous 1024.

   Ce composant rend son contenu à sa largeur NATURELLE — celle pour
   laquelle le dessin a été pensé — puis le met à l'échelle pour qu'il
   tienne dans la place disponible. Le dessin est donc rigoureusement le
   même à toutes les largeurs, il est seulement plus petit.

   La hauteur du cadre est recalculée à chaque mesure : sans elle, un
   contenu mis à l'échelle garde sa hauteur de mise en page (une
   transformation ne change pas le flux) et laisserait un trou sous lui.

   SANS JAVASCRIPT le facteur vaut 1 : le bloc est rendu à sa taille
   naturelle et rogné à droite. C'est une dégradation, pas une casse —
   et elle ne concerne que les schémas, jamais du texte courant.
   ══════════════════════════════════════════════════════════════════════ */

export default function Ajuste({
  largeur,
  children,
}: {
  /** Largeur naturelle du dessin, en pixels. */
  largeur: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cadre = ref.current;
    if (!cadre) return;
    const dedans = cadre.firstElementChild as HTMLElement | null;
    if (!dedans) return;

    const mesurer = () => {
      const dispo = cadre.clientWidth;
      if (!dispo) return;
      /* Jamais au-dessus de 1 : au large, le dessin garde sa taille
         naturelle plutôt que de se mettre à grossir. */
      const k = Math.min(1, dispo / largeur);
      cadre.style.setProperty("--aj-k", String(k));
      cadre.style.height = `${Math.round(dedans.offsetHeight * k)}px`;
    };

    const ro = new ResizeObserver(mesurer);
    ro.observe(cadre);
    ro.observe(dedans);
    mesurer();
    return () => ro.disconnect();
  }, [largeur]);

  return (
    <div ref={ref} className="smd-ajuste" style={{ "--aj-l": `${largeur}px` } as React.CSSProperties}>
      <div className="smd-ajuste__in">{children}</div>
    </div>
  );
}
