"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsomorphicLayoutEffect, useReducedMotion } from "motion/react";

/* ══════════════════════════════════════════════════════════════════════
   La bande d'outils de /offres, en défilement continu — 16/09/2026

   Demande de Teo : « pour cette section-là, sur la partie nos offres, va
   récupérer le composant sur 21st.dev et fais en sorte que ce soit un
   truc qui défile ».

   Composant d'origine : « Logo Marquee » de ddoemonn (21st.dev), choisi
   sur trois critères et pas sur son allure — il respecte
   `prefers-reduced-motion`, il se met en pause au survol ET au clavier,
   et il ne tourne que lorsqu'il est à l'écran.

   CE QU'ON EN GARDE : le moteur, `useLogoMarquee`, recopié ici tel quel à
   deux détails près (voir plus bas). C'est la partie difficile — une
   boucle en `requestAnimationFrame` qui replie la position modulo la
   largeur d'un groupe, avec une rampe d'accélération et un rappel doux
   quand le focus déplace la bande.

   CE QU'ON JETTE : tout son habillage. Il rend une carte bordée, ombrée,
   avec un thème sombre et des couleurs de focus en bleu #4568FF — rien de
   tout ça n'existe dans le monde `.ofd`. Nos logotypes gardent donc leur
   propre balisage (`.ofd-outil`), déjà réglé au fil de la journée du 16/09
   avec Teo (« mets des logos qui font plus pro »). Reprendre son rendu
   aurait remis en cause ce réglage-là.

   DEUX ÉCARTS au code d'origine, tous deux nécessaires :
   1. Le `tabIndex` conditionnel et les liens de sa version : nos entrées
      ne sont pas cliquables — ce sont des marques d'outils, pas des liens
      clients. Un point d'arrêt clavier sur une bande décorative n'apporte
      rien, la légende hors écran porte déjà le sens.
   2. `MAX_COPIES` passe de 14 à 8 : nos sept entrées sont larges (logo +
      nom), et sur un écran de 1 700 px quatre copies suffisent déjà. Au-
      delà on peint des nœuds qu'on ne verra jamais.
   ══════════════════════════════════════════════════════════════════════ */

const RAMP = 0.19;
const SETTLE = 0.16;
const MAX_COPIES = 8;

function fold(x: number, loop: number) {
  const m = x % loop;
  return m > 0 ? m - loop : m;
}

function clamp(x: number, min: number, max: number) {
  return x < min ? min : x > max ? max : x;
}

function useLogoMarquee({ vitesse = 38, gouttiere = 40 }: { vitesse?: number; gouttiere?: number } = {}) {
  const cadreRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const groupeRef = useRef<HTMLUListElement>(null);

  const [copies, setCopies] = useState(4);
  const [retenu, setRetenu] = useState(false);
  /* Sans IntersectionObserver (très vieux navigateur), on considère la
     bande visible d'emblée : l'état de départ le dit, plutôt qu'un
     setState posé dans le corps d'un effet. */
  const [proche, setProche] = useState(() => typeof IntersectionObserver === "undefined");

  const reduit = useReducedMotion() === true;
  /* ÉCART nº 3 au code d'origine : il posait ces deux refs pendant le
     rendu. Le lint du projet l'interdit (« Cannot access refs during
     render ») et il a raison — un rendu doit être rejouable sans effet de
     bord. On les synchronise dans un effet : la boucle d'animation les lit
     à l'image suivante, ce qui ne se voit pas à 38 px par seconde. */
  const reduitRef = useRef(reduit);
  const avanceRef = useRef(false);
  useEffect(() => {
    reduitRef.current = reduit;
  }, [reduit]);
  useEffect(() => {
    avanceRef.current = !retenu && !reduit;
  }, [retenu, reduit]);

  const position = useRef(0);
  const rappel = useRef(0);
  const allure = useRef(0);
  const boucle = useRef(0);

  const peindre = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const x = reduitRef.current ? 0 : position.current - boucle.current;
    rail.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
  }, []);

  /* Combien de copies du groupe il faut pour couvrir le cadre sans trou,
     mesuré à chaque changement de taille plutôt que deviné. */
  useIsomorphicLayoutEffect(() => {
    const cadre = cadreRef.current;
    const groupe = groupeRef.current;
    if (!cadre || !groupe) return;

    const mesurer = () => {
      const largeur = groupe.getBoundingClientRect().width;
      const pas = largeur > 0 ? largeur + gouttiere : 0;
      const place = cadre.getBoundingClientRect().width;
      boucle.current = pas;
      position.current = pas > 0 ? clamp(position.current, -pas, pas) : 0;
      peindre();

      const suivant = reduit || pas <= 0 ? 4 : clamp(Math.ceil(place / pas) + 3, 4, MAX_COPIES);
      setCopies((prec) => (prec === suivant ? prec : suivant));
    };

    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(cadre);
    observateur.observe(groupe);
    return () => observateur.disconnect();
  }, [gouttiere, peindre, reduit]);

  /* Hors écran, on ne peint pas : une page qui fait quinze écrans de haut
     n'a pas à faire tourner une animation qu'on ne regarde pas. */
  useEffect(() => {
    const cadre = cadreRef.current;
    if (!cadre) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        const e = entrees[entrees.length - 1];
        if (e) setProche(e.isIntersecting);
      },
      { rootMargin: "96px" },
    );
    observateur.observe(cadre);
    return () => observateur.disconnect();
  }, []);

  useEffect(() => {
    if (reduit || !proche) return;

    let image = 0;
    let precedent = 0;

    const battement = (maintenant: number) => {
      image = requestAnimationFrame(battement);

      const dt = precedent ? Math.min((maintenant - precedent) / 1000, 0.05) : 0;
      precedent = maintenant;

      const pas = boucle.current;
      if (pas <= 0) return;

      allure.current += ((avanceRef.current ? 1 : 0) - allure.current) * (1 - Math.exp(-dt / RAMP));

      const tire = rappel.current * (1 - Math.exp(-dt / SETTLE));
      rappel.current -= tire;

      let x = position.current - vitesse * allure.current * dt + tire;
      if (allure.current > 0.002 && Math.abs(rappel.current) < 0.25) {
        rappel.current = 0;
        x = fold(x, pas);
      } else {
        x = clamp(x, -pas, pas);
      }

      position.current = x;
      peindre();
    };

    image = requestAnimationFrame(battement);
    return () => cancelAnimationFrame(image);
  }, [reduit, proche, vitesse, peindre]);

  /* Le doigt qui pousse la bande ne doit pas la désynchroniser du rail. */
  useEffect(() => {
    const cadre = cadreRef.current;
    if (!cadre) return;
    const epingler = () => {
      if (reduitRef.current) return;
      if (cadre.scrollLeft !== 0) cadre.scrollLeft = 0;
      if (cadre.scrollTop !== 0) cadre.scrollTop = 0;
    };
    cadre.addEventListener("scroll", epingler, { passive: true });
    return () => cadre.removeEventListener("scroll", epingler);
  }, []);

  /* Onglet quitté pendant un survol : sans ça la bande reste figée. */
  useEffect(() => {
    const relacher = () => setRetenu(false);
    window.addEventListener("blur", relacher);
    return () => window.removeEventListener("blur", relacher);
  }, []);

  const prises = {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch") setRetenu(true);
    },
    onPointerDown: () => setRetenu(true),
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") setRetenu(false);
    },
    onPointerCancel: () => setRetenu(false),
    onPointerLeave: () => setRetenu(false),
  };

  return { cadreRef, railRef, groupeRef, copies, reduit, prises };
}

export type OutilBande = { nom: string; chemin: string; titre: string };

export function BandeauOutils({ outils }: { outils: readonly OutilBande[] }) {
  const { cadreRef, railRef, groupeRef, copies, reduit, prises } = useLogoMarquee();

  /* Mouvement réduit : un seul groupe, et le cadre redevient une rangée
     qu'on fait glisser au doigt — exactement ce qu'elle était avant. */
  const groupes = reduit ? 1 : copies;
  const vivant = reduit ? 0 : 1;

  return (
    <div className="ofd-outils" {...prises}>
      <div
        ref={cadreRef}
        className="ofd-outils__cadre"
        style={{ overflowX: reduit ? "auto" : "hidden" }}
      >
        <div ref={railRef} className="ofd-outils__rail">
          {Array.from({ length: groupes }, (_, copie) => (
            <ul
              key={copie}
              ref={copie === vivant ? groupeRef : undefined}
              aria-hidden={copie === vivant ? undefined : true}
            >
              {outils.map((o) => (
                <li key={o.nom}>
                  <span className="ofd-outil">
                    <svg viewBox="0 0 24 24" role="img" aria-label={o.titre}>
                      <path d={o.chemin} />
                    </svg>
                    <span>{o.nom}</span>
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BandeauOutils;
