"use client";
/* ══════════════════════════════════════════════════════════════════════
   TrameGlyphes — la trame de petits cercles qui ondulent en haut de
   l'appel final (`C_pt` de la source) : une grille de glyphes
   « ·∘○◯◌●◉ » tous les 20 px sur un canevas 2D, dont la taille et la
   teinte (entre `couleur` et `couleurSeconde`) suivent trois sinus.

   La source redessinait à chaque image sans jamais s'arrêter, même hors de
   la fenêtre, et ignorait « réduire les animations ». Ici la boucle
   s'arrête hors de la fenêtre (IntersectionObserver, comme les deux fonds
   WebGL) et se fige sur sa première image si l'OS le demande : le dessin
   est le même.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";

const GLYPHES = "·∘○◯◌●◉";

function rvb(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 139, g: 92, b: 246 };
}

type Props = { couleur?: string; couleurSeconde?: string; opacite?: number };

export default function TrameGlyphes({ couleur = "#a0ccc3", couleurSeconde = "#3b7a6e", opacite = 0.18 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const retailler = () => {
      const densite = window.devicePixelRatio || 1;
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * densite;
      canvas.height = r.height * densite;
      ctx.scale(densite, densite);
    };
    retailler();
    window.addEventListener("resize", retailler);

    const a = rvb(couleur);
    const b = rvb(couleurSeconde);
    const fige = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let temps = 0;
    let image = 0;
    let enMarche = false;

    const dessiner = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const colonnes = Math.floor(r.width / 20);
      const rangees = Math.floor(r.height / 20);
      for (let y = 0; y < rangees; y++) {
        for (let x = 0; x < colonnes; x++) {
          const cx = (x + 0.5) * (r.width / colonnes);
          const cy = (y + 0.5) * (r.height / rangees);
          const p =
            ((Math.sin(0.2 * x + 2 * temps) * Math.cos(0.15 * y + temps) +
              Math.sin((x + y) * 0.1 + 1.5 * temps) +
              Math.cos(0.1 * x - 0.1 * y + 0.8 * temps)) /
              3 +
              1) /
            2;
          const glyphe = GLYPHES[Math.floor(p * (GLYPHES.length - 1))];
          const alpha = opacite * (0.4 + 0.8 * p);
          const rr = Math.round(a.r * (1 - p) + b.r * p);
          const vv = Math.round(a.g * (1 - p) + b.g * p);
          const bb = Math.round(a.b * (1 - p) + b.b * p);
          ctx.fillStyle = `rgba(${rr}, ${vv}, ${bb}, ${alpha})`;
          ctx.fillText(glyphe, cx, cy);
        }
      }
    };
    const boucle = () => {
      if (!enMarche) return;
      dessiner();
      temps += 0.03;
      image = requestAnimationFrame(boucle);
    };
    const demarrer = () => {
      if (enMarche) return;
      if (fige) {
        dessiner();
        return;
      }
      enMarche = true;
      boucle();
    };
    const arreter = () => {
      enMarche = false;
      cancelAnimationFrame(image);
    };
    const observateur = new IntersectionObserver((e) => (e[0]?.isIntersecting ? demarrer() : arreter()), {
      rootMargin: "200px",
    });
    observateur.observe(canvas);

    return () => {
      arreter();
      observateur.disconnect();
      window.removeEventListener("resize", retailler);
    };
  }, [couleur, couleurSeconde, opacite]);

  return <canvas ref={ref} className="h-full w-full" style={{ display: "block" }} aria-hidden="true" />;
}
