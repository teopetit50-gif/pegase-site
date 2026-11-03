"use client";

/* Les menus et petites fenêtres restent dans l'écran (03/11/2026).

   Beaucoup de menus des sous-pages métiers sont posés en absolu sous leur
   bouton (`left: 0` ou `right: 0`) : à 390 px, une quinzaine sortaient du
   bord — « Agence » des Incidents de Tavaro à −119 px (agence impossible à
   choisir), « Filtres » des Contrats de Varelo à −126, « … » du Parc de
   Tavaro jusqu'à 510 px — et la page se mettait à défiler de côté. Linear,
   Plain et Cal.com ne laissent jamais un menu sortir de la fenêtre.

   Plutôt que de reprendre chaque menu un par un, la coquille surveille
   l'apparition des menus (`role="menu"`, `role="listbox"`) et des fenêtres
   ancrées non modales (`role="dialog"` en position absolue) : si l'un d'eux
   dépasse un bord, il est décalé (propriété `translate`, qui ne touche ni
   `transform` ni la position posée par le composant) pour tenir à 8 px du
   bord, et sa largeur est bornée à l'écran. Un menu qui tient déjà n'est
   pas touché. */

import { useEffect } from "react";

const MARGE = 8;
const CIBLES = '[role="menu"], [role="listbox"], [role="dialog"]';

function recaler(cible: HTMLElement) {
  let e = cible;
  let style = getComputedStyle(e);
  /* un menu posé dans sa boîte flottante (`.lin-menu` en absolu autour d'un
     `role="menu"` statique) : c'est la boîte qu'on recale */
  if (style.position !== "absolute" && style.position !== "fixed" && e.parentElement) {
    const p = e.parentElement;
    const sp = getComputedStyle(p);
    if (sp.position === "absolute") {
      e = p;
      style = sp;
    }
  }
  /* un dialogue modal (fixe, centré) a sa propre mise en page */
  if (e.getAttribute("role") === "dialog" && style.position !== "absolute") return;
  /* une liste posée dans la page (pas un menu flottant) ne se déplace pas */
  if (style.position !== "absolute" && style.position !== "fixed") return;
  if (style.display === "none" || style.visibility === "hidden") return;
  const vw = document.documentElement.clientWidth;
  /* repartir de la position posée par le composant */
  const avant = e.dataset.v2Recale;
  if (avant) {
    e.style.translate = "";
    e.style.maxWidth = e.dataset.v2LargeurAvant ?? "";
  }
  /* un menu qui porte un champ en autofocus a pu faire défiler toute la page
     de côté avant ce recalage : on mesure dans la page, pas dans la vue, et on
     ramène la page à gauche ensuite */
  const sx = window.scrollX;
  const b = e.getBoundingClientRect();
  if (b.width === 0) return;
  const r = { left: b.left + sx, right: b.right + sx, width: b.width };
  let dx = 0;
  if (r.width > vw - 2 * MARGE) {
    if (!avant) e.dataset.v2LargeurAvant = e.style.maxWidth;
    e.style.maxWidth = `${vw - 2 * MARGE}px`;
    dx = MARGE - r.left;
  } else if (r.right > vw - MARGE) dx = vw - MARGE - r.right;
  else if (r.left < MARGE) dx = MARGE - r.left;
  if (sx !== 0 && dx !== 0) requestAnimationFrame(() => window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" }));
  if (dx === 0 && e.style.maxWidth === (e.dataset.v2LargeurAvant ?? "")) {
    delete e.dataset.v2Recale;
    delete e.dataset.v2LargeurAvant;
    return;
  }
  e.style.translate = dx ? `${Math.round(dx)}px 0` : "";
  e.dataset.v2Recale = "1";
}

export function useRecalerMenus() {
  useEffect(() => {
    let attente = 0;
    const tout = () => {
      attente = 0;
      document.querySelectorAll<HTMLElement>(CIBLES).forEach(recaler);
    };
    const plus_tard = () => {
      if (!attente) attente = requestAnimationFrame(tout);
    };
    const obs = new MutationObserver((liste) => {
      for (const m of liste) {
        for (const n of m.addedNodes) {
          if (n instanceof HTMLElement && (n.matches(CIBLES) || n.querySelector(CIBLES))) return plus_tard();
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", plus_tard);
    plus_tard();
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", plus_tard);
      if (attente) cancelAnimationFrame(attente);
    };
  }, []);
}
