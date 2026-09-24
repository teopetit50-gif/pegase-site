"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ══════════════════════════════════════════════════════════════════════
   /secteurs — les mouvements de scale.com/rlenvironments (24/09/2026)

   Relevés dans le code livré par la référence (ses paquets JS), pas
   estimés à l'œil. Quatre mouvements, et rien d'autre : les en-têtes de
   section, la bande d'aperçu et la colonne gauche des piliers ne bougent
   pas chez eux, ils ne bougent pas ici.

   1. LE TEXTE QUI MONTE (leur `AnimatedText`) — titres et textes du
      hero, des cartes, des piliers et de l'appel. Découpé en lignes
      masquées et en mots : chaque ligne part de 400 % sous son masque et
      remonte en 1 s (power3.out), décalée de 80 ms sur la précédente ;
      ses mots glissent de 30 % de leur largeur et s'allument en 0,9 s,
      30 ms l'un après l'autre. La couleur passe du vert #72ce7b au lilas
      #79648c à 220 ms, puis à la couleur finale — c'est la signature de
      la référence, on la reprend telle quelle.

   2. L'ENTRÉE DES CARTES (leur `BaseCardScroll`) — liée au défilement,
      de « haut de carte en bas d'écran » à « haut de carte à mi-écran ».
      Échelle 0,96 → 1, opacité 0 → 1, et les deux cartes des bords
      arrivent de côté : −160 px (origine à droite) pour la première,
      +160 px (origine à gauche) pour la dernière. Chaque carte a sa
      fenêtre de 70 % de la course, décalée de 10 % par rang, lissée en
      power2.out. Mesuré sur la référence : c'est aussi vrai sur
      téléphone, cartes empilées.

   3. LES PILIERS — pastille en fondu, filet qui se trace de gauche à
      droite, puis le texte qui monte.

   4. L'APPEL QUI S'OUVRE (leur `ClipScrollSection`) — `clip-path` de
      5 % à 0 entre « haut de la section en bas d'écran » et « centre au
      centre ». Relevé : 5 % à l'arrêt, 3,5 % au tiers de la course.

   ── RIEN NE SE CACHE SANS JAVASCRIPT ─────────────────────────────────
   Tout est visible dans le HTML servi. Les états de départ ne sont posés
   qu'ici, au montage ; si le script tombe, la page est simplement
   immobile. `prefers-reduced-motion` : on ne pose rien du tout.

   ── POURQUOI GSAP ET PAS UN ÉCOUTEUR DE `scroll` ─────────────────────
   Le site défile avec Lenis, qui n'envoie aucun événement `scroll` aux
   écouteurs de `window` en production (components/surmesure/cadence.ts).
   ScrollTrigger, lui, est branché sur Lenis (components/LenisRoot.tsx).
   ══════════════════════════════════════════════════════════════════════ */

const VERT = "#72CE7B";
const LILAS = "#79648C";

/* Le texte qui monte : rend une timeline en pause, et la découpe à
   défaire une fois la montée finie — le texte redevient du texte, sans
   un seul <div> de ligne qui casserait au redimensionnement.
   Les décalages passent par `gsap.delayedCall`, pas par `.delay()` : une
   timeline créée en pause ignore son délai quand on la relance. */
function montee(el: HTMLElement, decoupes: SplitText[]) {
  const couleur = getComputedStyle(el).color;
  const decoupe = SplitText.create(el, {
    type: "lines,words",
    mask: "lines",
    linesClass: "sct-ligne",
    wordsClass: "sct-mot",
  });
  decoupes.push(decoupe);
  /* le masque de chaque ligne compense les jambages (0,12 em, relevé) */
  el.querySelectorAll<HTMLElement>(".sct-ligne-mask").forEach((m) => m.classList.add("sct-ligne-masque"));

  gsap.set(decoupe.lines, { yPercent: 400, opacity: 0, color: VERT });
  gsap.set(decoupe.words, { x: "30%", opacity: 0, color: VERT });

  const tl = gsap.timeline({
    paused: true,
    onComplete: () => decoupe.revert(),
  });
  decoupe.lines.forEach((ligne, i) => {
    const o = 0.08 * i;
    const mots = decoupe.words.filter((m) => ligne.contains(m));
    tl.to(ligne, { yPercent: 0, opacity: 1, duration: 1, ease: "power3.out" }, o);
    tl.to(ligne, { color: LILAS, duration: 0.3276, ease: "power1.inOut" }, o + 0.22);
    tl.to(ligne, { color: couleur, duration: 0.4524, ease: "power1.inOut" }, o + 0.5476);
    if (mots.length) {
      const t = o + 0.04;
      tl.to(mots, { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.03 }, t);
      tl.to(mots, { color: LILAS, duration: 0.29484, ease: "power1.inOut", stagger: 0.03 }, t + 0.198);
      tl.to(mots, { color: couleur, duration: 0.40716, ease: "power1.inOut", stagger: 0.03 }, t + 0.49284);
    }
  });
  return tl;
}

export default function Mouvements() {
  useEffect(() => {
    const racine = document.querySelector<HTMLElement>("[data-sct]");
    if (!racine) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | null = null;
    let demonte = false;
    const decoupes: SplitText[] = [];

    const lancer = () => {
      if (demonte) return;
      ctx = gsap.context(() => {
        const q = <T extends HTMLElement>(sel: string, dans: ParentNode = racine) =>
          Array.from(dans.querySelectorAll<T>(sel));

        /* ── 1 · hero : dès le chargement, titre puis chapô, puis le bouton */
        q("[data-sct-texte='hero']").forEach((el, i) => {
          const tl = montee(el, decoupes);
          gsap.delayedCall(0.1 + 0.15 * i, () => void tl.play());
        });
        q("[data-sct-cta]").forEach((el) => {
          gsap.from(el, { opacity: 0, y: 12, duration: 0.8, delay: 0.5, ease: "power3.out" });
        });

        /* ── 2 · cartes : entrée liée au défilement, texte à l'entrée de la grille */
        const cartes = q("[data-sct-carte]");
        const n = cartes.length;
        const pas = n > 1 ? Math.min(0.1, 0.85 / (n - 1)) : 0;
        const fenetre = 1 - (n - 1) * pas;
        const adoucir = gsap.parseEase("power2.out");
        cartes.forEach((carte, i) => {
          const bord = n > 1 && (i === 0 || i === n - 1);
          const x0 = !bord ? 0 : i === 0 ? -160 : 160;
          gsap.set(carte, {
            transformOrigin: !bord ? "center center" : i === 0 ? "right center" : "left center",
          });
          const debut = i * pas;
          const poser = (p: number) => {
            const t = adoucir(gsap.utils.clamp(0, 1, (p - debut) / fenetre));
            gsap.set(carte, { scale: 0.96 + 0.04 * t, opacity: t, x: x0 * (1 - t) });
          };
          poser(0);
          ScrollTrigger.create({
            trigger: carte,
            start: "top bottom",
            end: "top 50%",
            onUpdate: (st) => poser(st.progress),
            onRefresh: (st) => poser(st.progress),
          });
        });
        const grille = racine.querySelector<HTMLElement>("[data-sct-grille]");
        if (grille) {
          const montees = cartes.map((c) => q("[data-sct-texte='carte']", c).map((el) => montee(el, decoupes)));
          ScrollTrigger.create({
            trigger: grille,
            start: "top bottom",
            once: true,
            onEnter: () =>
              montees.forEach((tls, i) =>
                tls.forEach((tl, j) => gsap.delayedCall(0.125 + 0.08 * i + 0.1 * j, () => void tl.play()))
              ),
          });
        }

        /* ── 3 · piliers */
        q("[data-sct-pilier]").forEach((pilier) => {
          const picto = pilier.querySelector<HTMLElement>("[data-sct-picto]");
          const filet = pilier.querySelector<HTMLElement>("[data-sct-filet]");
          const textes = q("[data-sct-texte='pilier']", pilier).map((el) => montee(el, decoupes));
          if (picto) gsap.set(picto, { opacity: 0 });
          if (filet) gsap.set(filet, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: pilier,
            start: "top 90%",
            once: true,
            onEnter: () => {
              if (picto) gsap.to(picto, { opacity: 1, duration: 0.6, ease: "power2.out" });
              if (filet) gsap.to(filet, { scaleX: 1, duration: 1.2, delay: 0.2, ease: "power3.out" });
              textes.forEach((tl, j) => gsap.delayedCall(0.1 + 0.1 * j, () => void tl.play()));
            },
          });
        });

        /* ── 4 · l'appel qui s'ouvre, et son texte */
        const clip = racine.querySelector<HTMLElement>("[data-sct-clip]");
        if (clip) {
          const poser = (p: number) => {
            clip.style.clipPath = `inset(${(5 * (1 - p)).toFixed(3)}% round 24px)`;
          };
          poser(0);
          ScrollTrigger.create({
            trigger: clip,
            start: "top bottom",
            end: "center center",
            onUpdate: (st) => poser(st.progress),
            onRefresh: (st) => poser(st.progress),
          });
        }
        q("[data-sct-texte='appel']").forEach((el) => {
          const tl = montee(el, decoupes);
          ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () => tl.play() });
        });
        q("[data-sct-cta-appel]").forEach((el) => {
          gsap.set(el, { opacity: 0, y: 12 });
          ScrollTrigger.create({
            trigger: el,
            start: "top 95%",
            once: true,
            onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, delay: 0.35, ease: "power3.out" }),
          });
        });
      }, racine);
    };

    /* Découper AVANT que les polices soient là donne de fausses lignes :
       la coupure change quand General Sans remplace la police de repli. */
    if (document.fonts.status === "loaded") lancer();
    else document.fonts.ready.then(lancer);

    return () => {
      demonte = true;
      ctx?.revert();
      decoupes.forEach((d) => d.revert());
      const clip = racine.querySelector<HTMLElement>("[data-sct-clip]");
      if (clip) clip.style.clipPath = "";
    };
  }, []);

  return null;
}
