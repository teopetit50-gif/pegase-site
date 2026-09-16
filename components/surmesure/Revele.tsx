"use client";

import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Révélation au défilement (16/09/2026)

   Teo : « leur texte s'affiche quand on fait défiler la page, le nôtre
   est déjà présent ». Sur la référence, la citation et le nom portent la
   classe `AnimatedText isnt-visible` : le texte est masqué par son
   parent en `overflow: hidden` et monte à sa place quand le bloc entre
   dans l'écran. C'est la même mécanique ici.

   ── LA RÈGLE QUI COMPTE : RIEN NE SE CACHE SANS JAVASCRIPT ───────────
   L'état masqué n'est appliqué que sous `[data-anime]`, posé au montage.
   Avant l'hydratation, ou si le JS ne s'exécute jamais, le texte est
   simplement VISIBLE. L'inverse — masquer d'abord, révéler ensuite —
   laisse un bloc vide pour toujours le jour où le script tombe. Même
   parti que les apparitions de /vos-donnees.

   `prefers-reduced-motion` : on marque `vu` immédiatement, sans
   observateur. Le texte est là, il n'a jamais bougé.
   ══════════════════════════════════════════════════════════════════════ */

export default function Revele({
  children,
  delai = 0,
  className,
}: {
  children: React.ReactNode;
  /** Décalage en millisecondes, pour faire monter le nom après la citation. */
  delai?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* AUCUN ÉTAT REACT : les deux drapeaux sont posés directement sur le
     nœud. Un `setState` appelé dans le corps d'un effet déclenche un
     rendu en cascade — le lint du dépôt le refuse, et il a raison : ici
     l'état n'a aucune raison de remonter dans React, il ne sert qu'à
     basculer une classe. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.setAttribute("data-vu", "");
      return;
    }
    el.setAttribute("data-anime", "");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.setAttribute("data-vu", "");
          io.disconnect();
        }
      },
      /* 0,25 : le bloc doit être franchement entré, sinon la montée se
         joue pendant qu'il est encore sous le pli et on ne la voit pas. */
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className ? `smd-masque ${className}` : "smd-masque"}
      style={{ "--smd-delai": `${delai}ms` } as React.CSSProperties}
    >
      <span className="smd-masque__in">{children}</span>
    </div>
  );
}
