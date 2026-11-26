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
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 1. La barre se resserre dès 32 px de défilement (Navbar de la
          référence : `data-compact = scrollY > 32`). */
    const barre = racine.querySelector<HTMLElement>(".sx-navbar-sticky");
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

    /* 7. La section plateforme : l'entrée active du menu de gauche suit le
          défilement — le dernier panneau dont le haut a passé 30 % de la
          fenêtre (scroll-spy de la référence). Un clic y défile en douceur. */
    const liensPlateforme = [...racine.querySelectorAll<HTMLAnchorElement>(".platform-nav a")];
    const panneaux = [...racine.querySelectorAll<HTMLElement>("[data-platform-panel]")];
    if (liensPlateforme.length && panneaux.length) {
      const activer = (n: number) =>
        liensPlateforme.forEach((a, i) => {
          a.classList.toggle("is-active", i === n);
          if (i === n) a.setAttribute("aria-current", "step");
          else a.removeAttribute("aria-current");
        });
      const suivre = () => {
        const seuil = 0.3 * window.innerHeight;
        let n = 0;
        panneaux.forEach((p, i) => {
          if (p.getBoundingClientRect().top <= seuil) n = i;
        });
        activer(n);
      };
      window.addEventListener("scroll", suivre, { passive: true });
      window.addEventListener("resize", suivre);
      suivre();
      menage.push(() => {
        window.removeEventListener("scroll", suivre);
        window.removeEventListener("resize", suivre);
      });
      liensPlateforme.forEach((a, i) => {
        const clic = (e: MouseEvent) => {
          e.preventDefault();
          activer(i);
          const id = (a.getAttribute("href") || "").slice(1);
          document.getElementById(id)?.scrollIntoView({ behavior: calme ? "instant" : "smooth", block: "start" });
        };
        a.addEventListener("click", clic);
        menage.push(() => a.removeEventListener("click", clic));
      });
    }

    /* 8. Les compteurs (« CountUp » de la référence). Chaque nombre animé est
          écrit trois fois dans le balisage : une copie invisible qui tient
          la largeur, la copie visible, et une copie pour les lecteurs
          d'écran. Hors écran, la copie visible est à zéro ; à l'entrée
          (15 % avant le bord bas, une seule fois) elle monte en 1,4 s. */
    type Morceau = string | { valeur: number; decimales: number; groupe: boolean };
    const NOMBRE = /(\d(?:[\d  ]*\d)?(?:,\d+)?)/;
    const decouper = (t: string): Morceau[] =>
      t.split(NOMBRE).map((m, i) =>
        i % 2
          ? {
              valeur: Number(m.replace(/[  ]/g, "").replace(",", ".")),
              decimales: (m.split(",")[1] || "").length,
              groupe: /[  ]/.test(m),
            }
          : m,
      );
    const composer = (cible: Morceau[], depuis: Morceau[] | null, p: number) =>
      cible
        .map((m, i) => {
          if (typeof m === "string") return m;
          const d = depuis?.[i];
          const v0 = d && typeof d !== "string" ? d.valeur : 0;
          return (v0 + (m.valeur - v0) * p).toLocaleString("fr-FR", {
            minimumFractionDigits: m.decimales,
            maximumFractionDigits: m.decimales,
            useGrouping: m.groupe,
          });
        })
        .join("");
    type Compte = { gabarit: HTMLElement; visible: HTMLElement; lu: HTMLElement; cible: string; dernier: Morceau[] | null; image: number; vu: boolean };
    const comptes = new Map<HTMLElement, Compte>();
    const jouer = (c: Compte) => {
      cancelAnimationFrame(c.image);
      const cible = decouper(c.cible);
      if (calme) {
        c.visible.textContent = c.cible;
        c.dernier = cible;
        return;
      }
      if (!c.vu) {
        c.visible.textContent = composer(cible, null, 0);
        return;
      }
      const depuis = c.dernier;
      const duree = depuis ? 500 : 1400;
      const t0 = performance.now();
      const pas = (t: number) => {
        const n = Math.min((t - t0) / duree, 1);
        c.visible.textContent = composer(cible, depuis, 1 - Math.pow(1 - n, 4));
        if (n < 1) c.image = requestAnimationFrame(pas);
        else c.dernier = cible;
      };
      c.image = requestAnimationFrame(pas);
    };
    const fixer = (racineCompte: HTMLElement | null | undefined, texte: string) => {
      const c = racineCompte && comptes.get(racineCompte);
      if (!c || c.cible === texte) return;
      c.cible = texte;
      c.gabarit.textContent = texte;
      c.lu.textContent = texte;
      jouer(c);
    };
    racine.querySelectorAll<HTMLElement>('span[style*="inline-grid"]').forEach((el) => {
      const [gabarit, visible, lu] = [...el.children] as HTMLElement[];
      if (!gabarit || !visible || !lu || !lu.classList.contains("sr-only")) return;
      const c: Compte = { gabarit, visible, lu, cible: lu.textContent || "", dernier: null, image: 0, vu: false };
      comptes.set(el, c);
      const vue = new IntersectionObserver(
        ([e]) => {
          c.vu = e.isIntersecting;
          jouer(c);
          if (e.isIntersecting) vue.disconnect();
        },
        { rootMargin: "0px 0px -15% 0px" },
      );
      vue.observe(el);
      menage.push(() => {
        vue.disconnect();
        cancelAnimationFrame(c.image);
      });
    });

    /* 9. La grille de tarifs. La référence bascule « mensuel / annuel » ;
          Omega n'a pas de prix à l'année (components/tarifs/TroisPrix.tsx).
          La bascule oppose donc ce qui se paie CHAQUE MOIS à ce qui se paie
          UNE SEULE FOIS, l'installation. Le curseur compte les personnes et
          recalcule le total du logiciel. Les montants sont ceux de
          TroisPrix.tsx : les changer là-bas, ici ET dans outils/sx/textes.py. */
    const PRIX = {
      logiciel: 34.9,
      mois: {
        logiciel: { montant: "34,90 €", unite: ["HT par personne", "par mois"] },
        agents: { montant: "dès 199 €", unite: ["HT par agent", "par mois"], gras: "Prix fixé", suite: " à l'audit, selon les dossiers suivis" },
      },
      installation: {
        logiciel: { montant: "dès 1 200 €", unite: ["HT, pour le logiciel", "une seule fois"], gras: "Payée une fois", suite: ", à la mise en service du logiciel" },
        agents: { montant: "dès 590 €", unite: ["HT par agent", "une seule fois"], gras: "Aucun débit", suite: " avant la fin de l'installation" },
      },
    };
    const grille = racine.querySelector<HTMLElement>(".pr-grid");
    const bascule = [...racine.querySelectorAll<HTMLButtonElement>(".pr-billing button")];
    const curseur = racine.querySelector<HTMLInputElement>(".pr-range");
    if (grille && bascule.length === 2 && curseur) {
      const paliers = [...grille.querySelectorAll<HTMLElement>(".pr-tier")];
      const pieces = (palier: HTMLElement | undefined) => ({
        montant: palier?.querySelector<HTMLElement>(".pr-amount strong > span"),
        unite: palier?.querySelector<HTMLElement>(".pr-amount > span"),
        gras: palier?.querySelector<HTMLElement>(".pr-total b > span"),
        total: palier?.querySelector<HTMLElement>(".pr-total"),
      });
      const logiciel = pieces(paliers[1]);
      const agents = pieces(paliers[2]);
      const libelle = racine.querySelector<HTMLElement>(".pr-team-row b");
      let installation = false;
      const ecrireUnite = (el: HTMLElement | null | undefined, [a, b]: string[]) => {
        const textes = el ? [...el.childNodes].filter((n) => n.nodeType === 3) : [];
        if (textes[0]) textes[0].nodeValue = a;
        if (textes[1]) textes[1].nodeValue = b;
      };
      const ecrireSuite = (el: HTMLElement | null | undefined, t: string) => {
        const dernier = el?.lastChild;
        if (dernier && dernier.nodeType === 3) dernier.nodeValue = t;
      };
      const euros = (v: number) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
      const peindre = () => {
        const n = Number(curseur.value) || 1;
        const personnes = n + (n > 1 ? " personnes" : " personne");
        if (libelle) libelle.textContent = personnes;
        curseur.setAttribute("aria-valuetext", personnes);
        const min = Number(curseur.min) || 1;
        const max = Number(curseur.max) || 50;
        curseur.style.setProperty("--fill", ((n - min) / (max - min)) * 100 + "%");
        bascule[0].setAttribute("aria-pressed", String(!installation));
        bascule[1].setAttribute("aria-pressed", String(installation));
        const mode = installation ? PRIX.installation : PRIX.mois;
        fixer(logiciel.montant, mode.logiciel.montant);
        ecrireUnite(logiciel.unite, mode.logiciel.unite);
        if (installation) {
          fixer(logiciel.gras, PRIX.installation.logiciel.gras);
          ecrireSuite(logiciel.total, PRIX.installation.logiciel.suite);
        } else {
          fixer(logiciel.gras, euros(n * PRIX.logiciel));
          ecrireSuite(logiciel.total, " HT par mois pour " + personnes);
        }
        fixer(agents.montant, mode.agents.montant);
        ecrireUnite(agents.unite, mode.agents.unite);
        fixer(agents.gras, mode.agents.gras);
        ecrireSuite(agents.total, mode.agents.suite);
      };
      const versMois = () => {
        installation = false;
        peindre();
      };
      const versInstallation = () => {
        installation = true;
        peindre();
      };
      bascule[0].addEventListener("click", versMois);
      bascule[1].addEventListener("click", versInstallation);
      curseur.addEventListener("input", peindre);
      menage.push(() => {
        bascule[0].removeEventListener("click", versMois);
        bascule[1].removeEventListener("click", versInstallation);
        curseur.removeEventListener("input", peindre);
      });
    }

    /* 10. Le menu mobile : le bouton « menu » de la barre (inerte chez la
           référence) ouvre le panneau de SxMenuMobile, calé sous la barre
           même quand elle est resserrée. Échap, un lien ou le passage en
           grand écran le referment. */
    const burger = racine.querySelector<HTMLButtonElement>(".sx-navbar > button");
    const menu = racine.querySelector<HTMLElement>("#sx-menu");
    const rail = racine.querySelector<HTMLElement>(".sx-navbar");
    if (burger && menu && rail) {
      burger.setAttribute("aria-controls", "sx-menu");
      burger.setAttribute("aria-expanded", "false");
      const caler = () => {
        const bas = Math.round(rail.getBoundingClientRect().bottom);
        menu.style.top = bas + "px";
        menu.style.maxHeight = `calc(100dvh - ${bas}px)`;
      };
      const fermer = () => {
        menu.hidden = true;
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Ouvrir le menu");
      };
      const basculer = () => {
        if (!menu.hidden) return fermer();
        caler();
        menu.hidden = false;
        burger.setAttribute("aria-expanded", "true");
        burger.setAttribute("aria-label", "Fermer le menu");
      };
      const touche = (e: KeyboardEvent) => {
        if (e.key === "Escape") fermer();
      };
      const surLien = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest("a")) fermer();
      };
      const suivreBarre = () => {
        if (!menu.hidden) caler();
      };
      const large = window.matchMedia("(min-width: 1280px)");
      const surLarge = () => {
        if (large.matches) fermer();
      };
      burger.addEventListener("click", basculer);
      menu.addEventListener("click", surLien);
      document.addEventListener("keydown", touche);
      window.addEventListener("scroll", suivreBarre, { passive: true });
      rail.addEventListener("transitionend", suivreBarre);
      large.addEventListener("change", surLarge);
      menage.push(() => {
        burger.removeEventListener("click", basculer);
        menu.removeEventListener("click", surLien);
        document.removeEventListener("keydown", touche);
        window.removeEventListener("scroll", suivreBarre);
        rail.removeEventListener("transitionend", suivreBarre);
        large.removeEventListener("change", surLarge);
      });
    }

    return () => menage.forEach((f) => f());
  }, []);

  return null;
}
