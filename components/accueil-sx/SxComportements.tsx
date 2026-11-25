"use client";

/* ══════════════════════════════════════════════════════════════════════
   LES COMPORTEMENTS DE L'ACCUEIL « SX »

   Le balisage de components/accueil-sx/gen est généré et statique (rendu
   serveur). Sur la référence, quelques ATTRIBUTS d'état sont pilotés par
   son JavaScript ; ce composant les pilote de la même façon, sans jamais
   créer ni déplacer de nœud : il ne pose que des attributs et des classes
   que le CSS de sx.css attend. Chaque règle ci-dessous cite ce qu'elle
   reproduit.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";

export default function SxComportements() {
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>(".sx");
    if (!racine) return;
    const menage: Array<() => void> = [];

    /* 1. La barre se resserre dès 32 px de défilement (Navbar de la
          référence : `data-compact = scrollY > 32`). */
    const barre = racine.querySelector<HTMLElement>(".synnax-navbar-sticky");
    if (barre) {
      const maj = () => barre.setAttribute("data-compact", String(window.scrollY > 32));
      maj();
      window.addEventListener("scroll", maj, { passive: true });
      menage.push(() => window.removeEventListener("scroll", maj));
    }

    /* 2. Les blocs « InView » : `data-in-view` passe à "true" quand le bloc
          entre dans la fenêtre, 15 % avant son bord bas, une seule fois.
          Ce sont l'écran « congés » du téléphone (marque blanche) et la
          carte de disponibilité (sécurité). */
    racine.querySelectorAll<HTMLElement>(".wl-app-leave, .sec-uptime").forEach((bloc) => {
      bloc.setAttribute("data-in-view", "false");
      const vue = new IntersectionObserver(
        ([e]) => {
          bloc.setAttribute("data-in-view", String(e.isIntersecting));
          if (e.isIntersecting) vue.disconnect();
        },
        { rootMargin: "0px 0px -15% 0px" },
      );
      vue.observe(bloc);
      menage.push(() => vue.disconnect());
    });

    /* 3. Le pied : `data-in` passe à "true" dès que 10 % en sont visibles,
          et y reste (les lettres du mot-symbole montent). */
    const pied = racine.querySelector<HTMLElement>("footer.sgf");
    if (pied) {
      const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (calme) pied.setAttribute("data-in", "true");
      const vue = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            pied.setAttribute("data-in", "true");
            vue.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      vue.observe(pied);
      menage.push(() => vue.disconnect());
    }

    /* 4. La FAQ : une seule réponse ouverte à la fois, re-cliquer referme
          (FaqList : `is-open` sur l'item, `aria-expanded` sur la question,
          `inert` sur le panneau fermé). */
    const items = [...racine.querySelectorAll<HTMLElement>(".faq-item")];
    const ouvrir = (cible: HTMLElement | null) => {
      for (const it of items) {
        const actif = it === cible;
        it.classList.toggle("is-open", actif);
        it.querySelector(".faq-q")?.setAttribute("aria-expanded", String(actif));
        const panneau = it.querySelector<HTMLElement>(".faq-panel");
        if (panneau) panneau.inert = !actif;
      }
    };
    for (const it of items) {
      const q = it.querySelector<HTMLElement>(".faq-q");
      if (!q) continue;
      const clic = () => ouvrir(it.classList.contains("is-open") ? null : it);
      q.addEventListener("click", clic);
      menage.push(() => q.removeEventListener("click", clic));
    }

    /* 5. Le graphique en flux (« budget ») de la section plateforme. Sur la
          référence, sa largeur est MESURÉE (436 px par défaut au rendu
          serveur) et sept cotes en découlent : le tracé des cinq bandes,
          les dégradés, l'ombre, le masque d'entrée et la place de
          l'info-bulle. Mêmes formules, appliquées aux mêmes attributs. */
    const m3 = (v: number) => Math.round(v * 1000) / 1000;
    racine.querySelectorAll<HTMLElement>('[data-slot="budget-flow-chart-plot"]').forEach((cadre) => {
      const bandes = [...cadre.querySelectorAll<SVGPathElement>("path[data-flow]")].map((p) => {
        /* « M 0 a C m a m b L b L L c C m c m d 0 d Z » : on garde les quatre ordonnées */
        const n = (p.getAttribute("d") || "").match(/-?[\d.]+/g)?.map(Number) || [];
        return { p, a: n[1], b: n[5], c: n[9], d: n[13] };
      });
      const jumeau = cadre.querySelector<HTMLElement>(":scope > span.invisible");
      const bulle = cadre.querySelector<HTMLElement>('[data-slot="budget-flow-chart-tooltip"]');
      const poser = (l: number) => {
        if (!(l > 0)) return;
        const m = m3(l / 2);
        const L = m3(l);
        for (const { p, a, b, c, d } of bandes) {
          p.setAttribute("d", `M 0 ${a} C ${m} ${a} ${m} ${b} ${L} ${b} L ${L} ${c} C ${m} ${c} ${m} ${d} 0 ${d} Z`);
        }
        cadre.querySelectorAll('linearGradient[gradientUnits="userSpaceOnUse"]').forEach((g) => g.setAttribute("x2", String(L)));
        cadre.querySelector("filter")?.setAttribute("width", String(m3(l + 40)));
        cadre.querySelector('linearGradient:not([gradientUnits]) stop')?.setAttribute("offset", String(m3(l / (l + 120))));
        const masque = cadre.querySelector("mask");
        if (masque) {
          masque.setAttribute("x", String(m3(-(l + 120))));
          masque.setAttribute("width", String(m3(2 * (l + 120))));
          masque.querySelector("rect")?.setAttribute("width", String(m3(l + 120)));
        }
        if (bulle) {
          const large = (jumeau?.getBoundingClientRect().width || 165) + 24;
          bulle.style.left = `${Math.round(Math.min(Math.max(l / 2 - large / 2, 0), Math.max(0, l - large)))}px`;
        }
      };
      const obs = new ResizeObserver(([e]) => poser(e.contentRect.width));
      obs.observe(cadre);
      menage.push(() => obs.disconnect());
    });

    /* 6. Le graphique à colonnes de la fiche : chaque colonne fait les trois
          quarts de sa case, sans dépasser 48 px ni descendre sous 2 px
          (la référence mesure le cadre : 424 px par défaut, 6 cases
          séparées de 8 px). */
    racine.querySelectorAll<HTMLElement>('[data-slot="spend-column-chart-plot"]').forEach((cadre) => {
      const colonnes = [...cadre.querySelectorAll<SVGElement>('[data-slot="spend-column-chart-bar"]')];
      const poser = (l: number) => {
        const n = colonnes.length;
        if (!(l > 0) || !n) return;
        const q = m3(Math.max(2, Math.min(48, 0.75 * ((l - 8 * (n - 1)) / n))));
        for (const c of colonnes) {
          c.style.left = `calc(50% - ${q / 2}px)`;
          c.style.width = `${q}px`;
        }
      };
      const obs = new ResizeObserver(([e]) => poser(e.contentRect.width));
      obs.observe(cadre);
      menage.push(() => obs.disconnect());
    });

    return () => menage.forEach((f) => f());
  }, []);

  return null;
}
