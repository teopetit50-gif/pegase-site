"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — apparitions.tsx
   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   ui/apparitions.tsx`. Ce qui change : les racines. La source animait les enfants de `main > *` et son propre pied (`body footer`) ; ici le <main> est celui d'Omega, qui contient aussi le pied COMMUN à tout le site : on part des racines des sections de la page (`.p-architectes [data-racine] > *`, posé par page.tsx : les mêmes éléments que les `main > *` de la source), et le pied d'Omega ne bouge pas.
   Ce qu'en disait la source :
   ══════════════════════════════════════════════════════════════════════ */
/* Apparitions au défilement — l'effet de l'accueil d'Omega, repris le 24/09 à la demande de Teo (« que toutes les
   sections apparaissent une à une, l'effet de la page d'accueil d'Omega »). Source : PEGASE/pegase-site,
   components/PageMotion.tsx : chaque bloc sous la ligne de flottaison part à opacité 0 et 26 px plus bas, puis arrive
   en 0,75 s sur la courbe charte (0.16, 1, 0.3, 1 ≈ power4.out de GSAP) quand son haut passe à 88 % de la fenêtre ;
   les blocs qui entrent ensemble s'enchaînent à 70 ms.
   Ici sans GSAP : un balayage à chaque défilement, sans requestAnimationFrame ni IntersectionObserver (l'un ne tire
   pas toujours, l'autre rate les sauts d'ancre), et les
   blocs sont trouvés dans le DOM — pour chaque section, les enfants de son conteneur, en descendant dans ceux qui
   dépassent la hauteur d'écran. Le premier écran n'est jamais masqué (il a sa propre chorégraphie).
   prefers-reduced-motion : rien n'est masqué. Les styles posés sont rendus à l'arrivée (sticky, survols et autres
   apparitions retrouvent leur état). Filet : au bout de 8 s, tout bloc déjà passé sous la ligne est affiché. */
import { useEffect } from "react";

const COURBE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DUREE = 750,
  PAS = 70,
  DECALAGE = 26,
  LIGNE = 0.88,
  PAS_MAX = 8;

type Avant = { opacite: string; transform: string; transition: string; willChange: string };

function blocsDe(racine: Element, vh: number, profondeur = 0): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const enfant of Array.from(racine.children) as HTMLElement[]) {
    const cs = getComputedStyle(enfant);
    if (cs.position === "absolute" || cs.position === "fixed" || cs.display === "none") continue;
    const h = enfant.getBoundingClientRect().height;
    if (h < 8) continue;
    if (h > vh * 1.1 && profondeur < 4 && enfant.children.length > 1) out.push(...blocsDe(enfant, vh, profondeur + 1));
    else out.push(enfant);
  }
  return out;
}

export default function Apparitions() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const vh = window.innerHeight;
    const racines = Array.from(document.querySelectorAll(".p-architectes [data-racine] > *"));
    const blocs = racines
      .flatMap((r) => blocsDe(r, vh))
      .filter((el) => el.getBoundingClientRect().top + window.scrollY >= vh);
    const avant = new Map<HTMLElement, Avant>();
    for (const el of blocs) {
      avant.set(el, {
        opacite: el.style.opacity,
        transform: el.style.transform,
        transition: el.style.transition,
        willChange: el.style.willChange,
      });
      el.style.opacity = "0";
      el.style.transform = `translate3d(0, ${DECALAGE}px, 0)`;
      el.style.willChange = "opacity, transform";
    }
    let enAttente = [...blocs];
    const minuteries: number[] = [];
    const rendre = (el: HTMLElement, avecTransition: boolean, retard: number) => {
      const a = avant.get(el)!;
      if (!avecTransition) {
        el.style.opacity = a.opacite;
        el.style.transform = a.transform;
        el.style.willChange = a.willChange;
        return;
      }
      el.style.transition = `opacity ${DUREE}ms ${COURBE} ${retard}ms, transform ${DUREE}ms ${COURBE} ${retard}ms`;
      // recalcul forcé plutôt qu'un requestAnimationFrame : un onglet qui ne produit pas d'images laisserait le bloc
      // masqué pour toujours (piège « Un rAF ne tire pas toujours »)
      void el.getBoundingClientRect();
      el.style.opacity = a.opacite;
      el.style.transform = a.transform;
      minuteries.push(
        window.setTimeout(
          () => {
            el.style.transition = a.transition;
            el.style.willChange = a.willChange;
          },
          DUREE + retard + 60,
        ),
      );
    };
    let dernier = 0,
      differe = 0;
    const balayer = () => {
      dernier = Date.now();
      if (!enAttente.length) return;
      // au fond de la page, les derniers blocs n'atteindront jamais la ligne des 88 % : on prend toute la fenêtre
      const auFond = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      const ligne = window.innerHeight * (auFond ? 1 : LIGNE);
      const entrants: HTMLElement[] = [];
      enAttente = enAttente.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < ligne) {
          entrants.push(el);
          return false;
        }
        return true;
      });
      let rang = 0;
      for (const el of entrants) {
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0)
          rendre(el, false, 0); // déjà dépassé (saut d'ancre) : sans animation
        else rendre(el, true, Math.min(rang++, PAS_MAX) * PAS);
      }
    };
    // balayage direct au défilement, au plus toutes les 60 ms, plus un dernier passage à l'arrêt
    const surDefilement = () => {
      window.clearTimeout(differe);
      if (Date.now() - dernier >= 60) balayer();
      differe = window.setTimeout(balayer, 90);
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    balayer();
    const filet = window.setTimeout(balayer, 8000);
    return () => {
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
      window.clearTimeout(differe);
      window.clearTimeout(filet);
      minuteries.forEach((m) => window.clearTimeout(m));
      avant.forEach((a, el) => {
        el.style.opacity = a.opacite;
        el.style.transform = a.transform;
        el.style.transition = a.transition;
        el.style.willChange = a.willChange;
      });
    };
  }, []);
  return null;
}
