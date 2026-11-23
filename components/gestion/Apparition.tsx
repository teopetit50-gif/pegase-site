"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   L'entrée dans la fenêtre des blocs de /gestion.

   LA RÉFÉRENCE anime chaque bloc avec framer-motion :
     initial {opacity: 0, y: 16}, whileInView {opacity: 1, y: 0},
     viewport {once: true, margin: "-80px"},
     transition {duration: .5, ease: [.25, 1, .5, 1]}
   (12, 16 ou 20 px, parfois ±20 px en travers ; 0,4 s et un retard par
   rang pour les cases d'une grille). Les valeurs de chaque bloc sont
   recopiées de ses scripts et passées en props.

   ICI le même mouvement, sans la bibliothèque, avec les règles que le site
   a déjà payées (components/accueil/Apparition.tsx) :
   · le rendu serveur ne masque rien : sans JavaScript, ou en mouvement
     réduit, le bloc est simplement là ;
   · un bloc déjà dans la fenêtre au chargement n'est pas armé : il
     clignoterait (peint, caché, repeint). Chez eux il s'anime ; ici il
     reste en place ;
   · l'état est posé sur le DOM (`data-ge`), pas dans un état React, et
     retiré à la fin : aucun `transform` ne reste sur le bloc ;
   · on relit la position au défilement plutôt que d'attendre un
     IntersectionObserver, qui ne dit rien d'un bloc passé d'un coup de
     « sous la fenêtre » à « au-dessus » (saut à une ancre, molette lancée).
   Le dessin du mouvement est dans app/gestion/gestion.css (`ge-apparait`).
   ══════════════════════════════════════════════════════════════════════ */

type Arme = { el: HTMLElement; marge: number };

const armes = new Set<Arme>();
let planifie = false;

function jouer(el: HTMLElement) {
  const fin = (e: AnimationEvent) => {
    if (e.target !== el) return;
    el.removeEventListener("animationend", fin);
    delete el.dataset.ge;
  };
  el.addEventListener("animationend", fin);
  el.dataset.ge = "joue";
}

function balayer() {
  planifie = false;
  const hauteur = window.innerHeight;
  for (const a of [...armes]) {
    if (a.el.getBoundingClientRect().top < hauteur - a.marge) {
      armes.delete(a);
      jouer(a.el);
    }
  }
  if (!armes.size) decrocher();
}

function auDefile() {
  if (planifie) return;
  planifie = true;
  requestAnimationFrame(balayer);
}

function decrocher() {
  window.removeEventListener("scroll", auDefile);
  window.removeEventListener("resize", auDefile);
}

function inscrire(a: Arme) {
  if (!armes.size) {
    window.addEventListener("scroll", auDefile, { passive: true });
    window.addEventListener("resize", auDefile, { passive: true });
  }
  armes.add(a);
}

function retirer(a: Arme) {
  armes.delete(a);
  if (!armes.size) decrocher();
}

export default function Apparition({
  children,
  className,
  x = 0,
  y = 16,
  duree = 0.5,
  retard = 0,
  marge = 80,
  titre = false,
}: {
  children: ReactNode;
  className?: string;
  /* le décalage de départ, en px */
  x?: number;
  y?: number;
  /* en secondes, comme dans leurs scripts */
  duree?: number;
  retard?: number;
  /* leur `viewport.margin` : le bloc part quand son haut est entré de
     `marge` px dans la fenêtre */
  marge?: number;
  /* un <h2> au lieu d'un <div> */
  titre?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* déjà à l'écran : on n'y touche pas */
    if (el.getBoundingClientRect().top < window.innerHeight - marge) return;
    const a: Arme = { el, marge };
    el.dataset.ge = "arme";
    inscrire(a);
    return () => {
      retirer(a);
      delete el.dataset.ge;
    };
  }, [marge]);

  const style = {
    "--ge-x": `${x}px`,
    "--ge-y": `${y}px`,
    "--ge-duree": `${duree}s`,
    "--ge-retard": `${retard}s`,
  } as CSSProperties;

  const poser = (el: HTMLElement | null) => {
    ref.current = el;
  };

  if (titre) {
    return (
      <h2 ref={poser} className={className} style={style}>
        {children}
      </h2>
    );
  }
  return (
    <div ref={poser} className={className} style={style}>
      {children}
    </div>
  );
}
