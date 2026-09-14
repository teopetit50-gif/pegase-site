"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* Apparition au défilement.

   POURQUOI C'EST ÉCRIT COMME ÇA — quatre décisions, chacune payée d'un
   défaut constaté :

   1. Le CSS laisse le bloc VISIBLE par défaut. Masquer en CSS et révéler
      en JS donne une page entièrement blanche si le JavaScript ne passe
      pas. C'est le composant qui pose `data-anim="on"` pour l'effacer.
   2. Il le pose dans un effet de MISE EN PAGE, avant que le navigateur
      peigne : pas de clignotement visible → masqué → visible.
   3. AUCUN minuteur de secours. J'en avais mis un à 3 s : il révélait les
      35 blocs trois secondes après le chargement, si bien qu'en
      descendant on trouvait tout déjà apparu. Ne pas le réintroduire.
   4. DEUX déclencheurs, pas un. `IntersectionObserver` seul laissait 15
      blocs sur 35 masqués après un défilement complet : un bloc de
      hauteur nulle (il enveloppe un enfant en position absolue) ou passé
      trop vite entre deux images peut ne jamais être signalé. Un second
      déclencheur, géométrique, tranche : si le haut du bloc est passé
      sous la ligne de flottaison, il est vu. Un seul écouteur de
      défilement pour toute la page, cadencé à l'image. */

const useEffetDeMiseEnPage =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* Registre partagé : un écouteur pour toute la page, pas un par bloc. */
type Abonne = { el: HTMLElement; montrer: () => void };
const abonnes = new Set<Abonne>();
let brancheEcouteur = false;
let raf = 0;

function balayer() {
  raf = 0;
  const limite = window.innerHeight * 0.88;
  for (const a of abonnes) {
    if (a.el.getBoundingClientRect().top < limite) {
      a.montrer();
      abonnes.delete(a);
    }
  }
}

function demanderBalayage() {
  if (raf) return;
  raf = requestAnimationFrame(balayer);
}

function abonner(a: Abonne) {
  abonnes.add(a);
  if (!brancheEcouteur) {
    brancheEcouteur = true;
    window.addEventListener("scroll", demanderBalayage, { passive: true });
    window.addEventListener("resize", demanderBalayage, { passive: true });
  }
  demanderBalayage();
}

export default function Apparition({
  children,
  delai = 0,
  className = "",
}: {
  children: React.ReactNode;
  delai?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [vu, setVu] = useState(false);
  const [anime, setAnime] = useState(false);

  useEffetDeMiseEnPage(() => {
    const el = ref.current;
    if (!el) return;

    /* Volet replié ou onglet en arrière-plan : ni l'observateur ni le
       défilement ne rapportent quoi que ce soit. On montre d'emblée. */
    if (document.hidden || typeof IntersectionObserver === "undefined") {
      setVu(true);
      return;
    }

    setAnime(true);

    let vivant = true;
    const montrer = () => {
      if (!vivant) return;
      vivant = false;
      setVu(true);
      io.disconnect();
      /* Se retirer du registre AUSSI quand c'est l'observateur qui a
         tranché : sinon le bloc reste abonné jusqu'à son démontage et
         chaque événement de défilement lui coûte une lecture de mise en
         page, pour rien, pendant toute la visite. */
      abonnes.delete(abonne);
    };
    const abonne = { el, montrer };

    const io = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) if (e.isIntersecting) montrer();
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(el);

    abonner(abonne);

    const visibilite = () => {
      if (document.hidden) montrer();
    };
    document.addEventListener("visibilitychange", visibilite);

    return () => {
      vivant = false;
      io.disconnect();
      abonnes.delete(abonne);
      document.removeEventListener("visibilitychange", visibilite);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      data-anim={anime ? "on" : undefined}
      data-shown={vu ? "true" : "false"}
      style={{ transitionDelay: `${delai}ms` }}
    >
      {children}
    </div>
  );
}
