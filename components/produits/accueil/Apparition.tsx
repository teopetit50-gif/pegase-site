"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ecouterDefilement } from "./defilement";

/* Apparition au défilement — ADDITIVE, deux déclencheurs, zéro minuteur.
 *
 * 1. Additive : le bloc est visible dans le HTML. C'est le script qui pose
 *    data-anim="on" au montage pour l'effacer, puis le révèle. Si le
 *    JavaScript ne passe pas, la page reste entièrement lisible.
 * 2. Deux déclencheurs : l'IntersectionObserver seul laisse des blocs
 *    masqués (hauteur nulle enveloppant un enfant absolu, ou palier franchi
 *    trop vite). Un écouteur de défilement unique rattrape tout bloc dont le
 *    haut est passé sous la ligne de flottaison — cadencé au minuteur et non
 *    à l'image, parce qu'un `requestAnimationFrame` ne tire pas toujours
 *    (voir `defilement.ts`).
 * 3. Jamais de minuteur de secours : un filet à 3 s révèle toute la page
 *    avant même qu'on descende, et l'effet est mort.
 *
 * Se désabonner en révélant : un bloc laissé dans le registre coûte une
 * lecture de mise en page à chaque événement de défilement, pour rien.
 */

const registre = new Set<HTMLElement>();
let observateur: IntersectionObserver | null = null;
let ecouteur: (() => void) | null = null;

function montrer(el: HTMLElement) {
  if (el.dataset.vu === "oui") return;
  el.dataset.vu = "oui";
  registre.delete(el);
  observateur?.unobserve(el);
}

function balayer() {
  const ligne = window.innerHeight * 0.92;
  for (const el of [...registre]) {
    if (el.getBoundingClientRect().top < ligne) montrer(el);
  }
}

function inscrire(el: HTMLElement) {
  if (!observateur) {
    observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) if (e.isIntersecting) montrer(e.target as HTMLElement);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );
  }
  if (!ecouteur) ecouteur = ecouterDefilement(balayer);
  registre.add(el);
  observateur.observe(el);
  balayer();
}

export function Apparition({
  children,
  delai = 0,
  className = "",
}: {
  children: ReactNode;
  delai?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset.anim = "on";
    el.dataset.vu = "non";
    inscrire(el);
    return () => {
      registre.delete(el);
      observateur?.unobserve(el);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={delai ? { transitionDelay: `${delai}ms` } : undefined}>
      {children}
    </div>
  );
}
