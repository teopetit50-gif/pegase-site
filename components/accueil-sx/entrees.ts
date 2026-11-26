/* ══════════════════════════════════════════════════════════════════════
   LES ENTRÉES DES GRAPHIQUES — le petit moteur commun aux trois graphiques
   de l'accueil (flux de trésorerie, jauge à barres, colonnes des dépenses).

   La référence anime chacun d'eux avec une chronologie anime.js : tout est
   posé à son état de départ dès le chargement, puis la chronologie joue
   UNE fois quand un quart du graphique est visible (IntersectionObserver,
   seuil 0,25). Chaque étape a sa cible, sa durée, sa courbe et son instant
   de départ, relevés dans son code (outils : /tmp/sx/releve/js).

   Ici, sans bibliothèque : l'API Web Animations pour l'opacité et les
   transformations (une image-clé de DÉPART seulement, l'arrivée est l'état
   du balisage), requestAnimationFrame pour ce qui n'est pas du CSS (texte
   des compteurs, attribut x du masque SVG, hauteurs). Mêmes courbes, écrites
   en `linear()` quand le navigateur le sait.
   ══════════════════════════════════════════════════════════════════════ */

export type Courbe = (t: number) => number;

const retour = (s: number): Courbe => (t) => {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/** Les courbes d'anime.js v4 employées par la référence. */
export const COURBES = {
  outExpo: ((t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))) as Courbe,
  outQuad: ((t) => 1 - (1 - t) * (1 - t)) as Courbe,
  inOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as Courbe,
  outBack: retour,
};

/* Équivalents approchés pour un navigateur sans `linear()`. */
const APPROCHES = new Map<Courbe, string>([
  [COURBES.outExpo, "cubic-bezier(.16,1,.3,1)"],
  [COURBES.outQuad, "cubic-bezier(.5,1,.89,1)"],
  [COURBES.inOutSine, "cubic-bezier(.37,0,.63,1)"],
]);
const memo = new Map<Courbe, string>();
let lineaireConnu: boolean | null = null;
export function css(c: Courbe): string {
  if (lineaireConnu === null) lineaireConnu = typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)");
  if (!lineaireConnu) return APPROCHES.get(c) ?? "cubic-bezier(.34,1.56,.64,1)";
  let s = memo.get(c);
  if (!s) {
    s = `linear(${Array.from({ length: 41 }, (_, i) => Math.round(c(i / 40) * 10000) / 10000).join(", ")})`;
    memo.set(c, s);
  }
  return s;
}

type Reglage = { duree: number; courbe: Courbe; a: number; decale?: number };

/** Une chronologie : on y ajoute des étapes, elle se pose à l'état de
    départ tout de suite, et `jouer()` la lance. */
export class Chrono {
  private anims: Animation[] = [];
  private suivis: Array<{ maj: (p: number) => void; duree: number; courbe: Courbe; a: number }> = [];
  private image = 0;

  /** Anime `cibles` DEPUIS l'image-clé `de` jusqu'à leur état du balisage. */
  ajouter(cibles: Element[], de: Keyframe, { duree, courbe, a, decale = 0 }: Reglage) {
    cibles.forEach((el, i) => {
      try {
        const anim = el.animate([{ ...de, offset: 0 }], {
          duration: duree,
          delay: a + i * decale,
          easing: css(courbe),
          fill: "backwards",
        });
        anim.pause();
        this.anims.push(anim);
      } catch {
        /* navigateur trop ancien : l'élément reste à son état final */
      }
    });
    return this;
  }

  /** Fait varier une valeur de 0 à 1 et la confie à `maj` (posée à 0 tout de suite). */
  suivre(maj: (p: number) => void, { duree, courbe, a }: Reglage) {
    maj(0);
    this.suivis.push({ maj, duree, courbe, a });
    return this;
  }

  jouer() {
    for (const a of this.anims) a.play();
    if (!this.suivis.length) return;
    const t0 = performance.now();
    const pas = (t: number) => {
      let reste = false;
      for (const s of this.suivis) {
        const n = Math.min(Math.max((t - t0 - s.a) / s.duree, 0), 1);
        s.maj(s.courbe(n));
        if (n < 1) reste = true;
      }
      if (reste) this.image = requestAnimationFrame(pas);
    };
    this.image = requestAnimationFrame(pas);
  }

  /** Tout à l'état final, tout de suite. */
  finir() {
    cancelAnimationFrame(this.image);
    for (const a of this.anims) a.cancel();
    for (const s of this.suivis) s.maj(1);
  }
}

/** Lance `construire` une fois, quand un quart de `bloc` est visible ;
    rend la fonction de ménage. Rien ne bouge si le visiteur a demandé
    moins d'animations. */
export function aLEntree(bloc: Element, construire: (c: Chrono) => void): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const c = new Chrono();
  construire(c);
  if (typeof IntersectionObserver === "undefined") {
    c.jouer();
    return () => c.finir();
  }
  const vue = new IntersectionObserver(
    (entrees) => {
      if (entrees.some((e) => e.isIntersecting)) {
        vue.disconnect();
        c.jouer();
      }
    },
    { threshold: 0.25 },
  );
  vue.observe(bloc);
  return () => {
    vue.disconnect();
    c.finir();
  };
}

/** Anime une transformation ponctuelle (survol), depuis `de` jusqu'à l'état courant. */
export function bouger(el: Element, de: Keyframe, duree: number, courbe: Courbe, delai = 0) {
  try {
    return el.animate([{ ...de, offset: 0 }], { duration: duree, delay: delai, easing: css(courbe), fill: "backwards" });
  } catch {
    return null;
  }
}

/* ── Les nombres écrits « à la française » : on découpe un texte en
      morceaux (texte fixe, nombre), et on le recompose à une fraction
      donnée de sa valeur. « 7,8 k€ », « −100 % », « 2 578,08 € · 37 % ». ── */

export type Morceau = string | { valeur: number; decimales: number; groupe: boolean };
const NOMBRE = /(\d(?:[\d\u202f\u00a0]*\d)?(?:,\d+)?)/;

export const decouper = (t: string): Morceau[] =>
  t.split(NOMBRE).map((m, i) =>
    i % 2
      ? {
          valeur: Number(m.replace(/[\u202f\u00a0]/g, "").replace(",", ".")),
          decimales: (m.split(",")[1] || "").length,
          groupe: /[\u202f\u00a0]/.test(m),
        }
      : m,
  );

export const composer = (cible: Morceau[], depuis: Morceau[] | null, p: number) =>
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
