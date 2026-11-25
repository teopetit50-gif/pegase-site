/* ══════════════════════════════════════════════════════════════════════
   LE MOT-SYMBOLE GÉANT DU PIED — décalque du pied « à lettres fendues »
   de la référence.

   Le mot n'est pas composé dans une police : chaque capitale est DESSINÉE
   à partir de cinq primitives (barre, biais, arc, anneau, panse) dans une
   case de 100 de haut, puis posée à 12 d'écart de la précédente. Chaque
   lettre est rendue deux fois, rognée en moitié haute et en moitié basse
   (`sgf-up` / `sgf-dn`) : c'est ce qui permet au CSS de les faire glisser
   l'une sur l'autre, et de faire monter le mot à l'entrée dans l'écran
   (`.sgf[data-in]`, sx.css).

   La table ci-dessous est celle de la référence, lettre pour lettre ; le
   mot, lui, est le nôtre. La référence remplace une de ses lettres par une
   « marque » à quatre triangles qui suit le pointeur (son X) : `marque`
   garde cette possibilité, immobile, pour pouvoir redessiner son pied à
   l'identique et vérifier le port — OMEGA n'en emploie pas.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, type CSSProperties } from "react";

const n = (v: number) => String(Math.round(100 * v) / 100);
/** barre */
const barre = (x: number, y: number, l: number, h: number) =>
  "M" + n(x) + " " + n(y) + "H" + n(x + l) + "V" + n(y + h) + "H" + n(x) + "Z";
/** biais : parallélogramme de largeur `e` entre deux points */
const biais = (x1: number, y1: number, x2: number, y2: number, e: number) =>
  "M" + n(x1) + " " + n(y1) + "H" + n(x1 + e) + "L" + n(x2 + e) + " " + n(y2) + "H" + n(x2) + "Z";
const point = (cx: number, cy: number, rx: number, ry: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return n(cx + rx * Math.cos(a)) + " " + n(cy + ry * Math.sin(a));
};
/** arc : portion d'anneau elliptique, d'un angle à l'autre */
const arc = (cx: number, cy: number, rx: number, ry: number, ex: number, ey: number, de: number, a: number) => {
  const grand = Math.abs(a - de) > 180 ? 1 : 0;
  const sens = a > de ? 1 : 0;
  const ix = rx - ex;
  const iy = ry - ey;
  return (
    "M" + point(cx, cy, rx, ry, de) + "A" + n(rx) + " " + n(ry) + " 0 " + grand + " " + sens + " " + point(cx, cy, rx, ry, a) +
    "L" + point(cx, cy, ix, iy, a) + "A" + n(ix) + " " + n(iy) + " 0 " + grand + " " + (1 - sens) + " " + point(cx, cy, ix, iy, de) + "Z"
  );
};
/** anneau elliptique complet */
const anneau = (cx: number, cy: number, rx: number, ry: number, ex: number, ey: number) => {
  const tour = (a: number, b: number) =>
    "M" + n(cx - a) + " " + n(cy) + "A" + n(a) + " " + n(b) + " 0 1 1 " + n(cx + a) + " " + n(cy) +
    "A" + n(a) + " " + n(b) + " 0 1 1 " + n(cx - a) + " " + n(cy) + "Z";
  return tour(rx, ry) + tour(rx - ex, ry - ey);
};
/** panse : la boucle d'un B, D, P, R */
const panse = (x: number, y: number, l: number, h: number, ex: number, ey: number) => {
  const d = h / 2;
  const r = Math.min(l - ex, 0.95 * d);
  const b = x + l - r;
  return (
    "M" + n(x) + " " + n(y) + "H" + n(b) + "A" + n(r) + " " + n(d) + " 0 0 1 " + n(b) + " " + n(y + h) + "H" + n(x) +
    "ZM" + n(x + ex) + " " + n(y + ey) + "H" + n(b) + "A" + n(r - ex) + " " + n(d - ey) + " 0 0 1 " + n(b) + " " + n(y + h - ey) + "H" + n(x + ex) + "Z"
  );
};

type Lettre = { w: number; d: string[] };
const VIDE: Lettre = { w: 42, d: [] };
const LETTRES: Record<string, Lettre> = {
  A: { w: 96, d: [biais(37, 0, 0, 100, 23), biais(37, 0, 73, 100, 23), barre(18, 60, 60, 16)] },
  B: { w: 84, d: [barre(0, 0, 19, 100), panse(0, 0, 78, 52, 19, 17), panse(0, 35, 84, 65, 19, 17)] },
  C: { w: 90, d: [arc(45, 50, 45, 50, 21, 17, -40, -320)] },
  D: { w: 90, d: [barre(0, 0, 20, 100), panse(0, 0, 90, 100, 21, 17)] },
  E: { w: 72, d: [barre(0, 0, 19, 100), barre(0, 0, 72, 17), barre(0, 41.5, 64, 17), barre(0, 83, 72, 17)] },
  F: { w: 70, d: [barre(0, 0, 19, 100), barre(0, 0, 70, 17), barre(0, 43, 62, 17)] },
  G: { w: 94, d: [arc(47, 50, 47, 50, 21, 17, -38, -360), barre(48, 46, 46, 17)] },
  H: { w: 86, d: [barre(0, 0, 19, 100), barre(67, 0, 19, 100), barre(0, 42, 86, 17)] },
  I: { w: 21, d: [barre(0, 0, 21, 100)] },
  J: { w: 72, d: [barre(53, 0, 19, 64), arc(36, 62, 36, 38, 19, 17, 0, 180)] },
  K: { w: 86, d: [barre(0, 0, 19, 100), biais(62, 0, 10, 62, 24), biais(30, 42, 62, 100, 24)] },
  L: { w: 68, d: [barre(0, 0, 19, 100), barre(0, 83, 68, 17)] },
  M: { w: 112, d: [barre(0, 0, 22, 100), biais(0, 0, 46, 100, 9), biais(68, 0, 40, 100, 22), barre(90, 0, 22, 100)] },
  N: { w: 88, d: [barre(0, 0, 19, 100), barre(69, 0, 19, 100), biais(0, 0, 63, 100, 25)] },
  O: { w: 100, d: [anneau(50, 50, 50, 50, 21, 17)] },
  P: { w: 80, d: [barre(0, 0, 19, 100), panse(0, 0, 80, 60, 19, 17)] },
  Q: { w: 100, d: [anneau(50, 50, 50, 50, 21, 17), biais(50, 62, 78, 100, 22)] },
  R: { w: 84, d: [barre(0, 0, 19, 100), panse(0, 0, 82, 58, 19, 17), biais(34, 50, 62, 100, 22)] },
  S: { w: 80, d: [arc(40, 29.25, 40, 29.25, 19, 17, -22, -273), arc(40, 70.75, 40, 29.25, 19, 17, -93, 158)] },
  T: { w: 82, d: [barre(0, 0, 82, 17), barre(30.5, 0, 21, 100)] },
  U: { w: 86, d: [barre(0, 0, 19, 60), barre(67, 0, 19, 60), arc(43, 58, 43, 42, 19, 17, 0, 180)] },
  V: { w: 94, d: [biais(0, 0, 36, 100, 22), biais(72, 0, 36, 100, 22)] },
  W: { w: 132, d: [biais(0, 0, 26, 100, 20), biais(56, 0, 26, 100, 20), biais(56, 0, 86, 100, 20), biais(112, 0, 86, 100, 20)] },
  X: { w: 92, d: [biais(0, 0, 68, 100, 24), biais(68, 0, 0, 100, 24)] },
  Y: { w: 92, d: [biais(0, 0, 35, 56, 22), biais(70, 0, 35, 56, 22), barre(35, 50, 22, 50)] },
  Z: { w: 80, d: [barre(0, 0, 80, 17), barre(0, 83, 80, 17), biais(56, 16, 0, 84, 24)] },
};

/** Les quatre triangles de la « marque », centre au milieu de la case. */
const MARQUE = ["0 0 20 0 50 50 0 20", "80 0 100 0 100 20 50 50", "50 50 100 80 100 100 80 100", "0 80 50 50 20 100 0 100"];
const ECART = 12;

type Props = {
  texte: string;
  /** rang de la lettre remplacée par la marque à quatre triangles ; −1 = aucune */
  marque?: number;
  /** arrêts du dégradé qui traverse tout le mot */
  degrade?: string[];
  /** largeur totale visée : l'écart entre lettres s'y ajuste (12 par défaut).
      OMEGA a cinq lettres là où la référence en a six ; à 604 de large, le
      mot garde exactement la hauteur du sien dans la page. */
  largeur?: number;
};

export default function SxMotSymbole({ texte, marque = -1, degrade = ["#1c1c1c"], largeur: visee }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const haut = "sgf-up-" + id;
  const bas = "sgf-dn-" + id;
  const grad = "sgf-grad-" + id;

  const lettres = Array.from(texte.toUpperCase());
  const chasses = lettres.map((ch, i) => (i === marque && ch.trim() !== "" ? 100 : (LETTRES[ch] ?? VIDE).w));
  const somme = chasses.reduce((t, w) => t + w, 0);
  const ecart = visee && lettres.length > 1 ? Math.max(0, (visee - somme) / (lettres.length - 1)) : ECART;
  const cases: { ch: string; x: number; w: number; marque: boolean }[] = [];
  let x = 0;
  lettres.forEach((ch, i) => {
    cases.push({ ch, x, w: chasses[i], marque: i === marque && ch.trim() !== "" });
    x += chasses[i] + ecart;
  });
  const largeur = Math.max(1, x - (cases.length ? ecart : 0));

  return (
    <svg
      className="sgf-svg"
      viewBox={"0 0 " + n(largeur) + " 100"}
      style={{ aspectRatio: largeur + " / 100" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={haut} clipPathUnits="userSpaceOnUse">
          <rect x={-40} y={-200} width={400} height={252.6} />
        </clipPath>
        <clipPath id={bas} clipPathUnits="userSpaceOnUse">
          <rect x={-40} y={51.4} width={400} height={250} />
        </clipPath>
        {cases.map((c, i) => (
          <linearGradient key={i} id={grad + "-" + i} gradientUnits="userSpaceOnUse" x1={n(-c.x)} y1={0} x2={n(largeur - c.x)} y2={0}>
            {degrade.map((couleur, k) => (
              <stop key={k} offset={degrade.length > 1 ? k / (degrade.length - 1) : 0} stopColor={couleur} />
            ))}
          </linearGradient>
        ))}
      </defs>
      {cases.map((c, i) => {
        if (c.ch.trim() === "") return null;
        const retard = { "--sgf-d": 200 + 90 * i + "ms" } as CSSProperties;
        if (c.marque) {
          return (
            <g key={i} transform={"translate(" + n(c.x) + " 0)"} fill={"url(#" + grad + "-" + i + ")"}>
              <g className="sgf-rise" style={retard}>
                <g className="sgf-g sgf-sh">
                  <rect width={100} height={100} fill="transparent" />
                  {MARQUE.map((p, k) => (
                    <polygon key={k} points={p} />
                  ))}
                </g>
              </g>
            </g>
          );
        }
        const lettre = LETTRES[c.ch] ?? VIDE;
        const traits = lettre.d.map((d, k) => <path key={k} d={d} fillRule="evenodd" />);
        return (
          <g key={i} transform={"translate(" + n(c.x) + " 0)"} fill={"url(#" + grad + "-" + i + ")"}>
            <g className="sgf-rise" style={retard}>
              <g className="sgf-g">
                <rect width={lettre.w} height={100} fill="transparent" />
                <g clipPath={"url(#" + haut + ")"}>
                  <g className="sgf-half sgf-up">{traits}</g>
                </g>
                <g clipPath={"url(#" + bas + ")"}>
                  <g className="sgf-half sgf-dn">{traits}</g>
                </g>
              </g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
