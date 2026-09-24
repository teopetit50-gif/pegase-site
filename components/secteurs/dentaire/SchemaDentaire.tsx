/* ══════════════════════════════════════════════════════════════════════
   SchemaDentaire — le schéma dentaire en numérotation FDI (`C_SchemaDentaire`
   de la source, ajouté le 24/09 au rhabillage « cabinet dentaire ») :
   18 → 11 | 21 → 28 en haut, 48 → 41 | 31 → 38 en bas, chaque dent en
   silhouette (couronne côté plan d'occlusion, racine qui s'effile).

   `dents` marque les dents concernées :
     plan     acte signé à planifier (vert d'eau)
     attente  accord de la mutuelle attendu (ambre)
     absente  dent manquante, implant prévu (pointillés)
     fait     soin déjà réalisé (gris)
   Même dessin que les écrans produit de la source (ecrans/ecrans.html).
   Un SCHÉMA, jamais une radiographie : Tiroma ne lit pas les images.
   ══════════════════════════════════════════════════════════════════════ */

export type EtatDent = "plan" | "attente" | "absente" | "fait";

const LARGEURS = [13, 11, 12, 12, 12, 16, 15, 14];
const HAUTEURS = [26, 25, 28, 24, 24, 22, 22, 21];
const ECART = 3;
const MILIEU = 10;
/* fond, trait, numéro */
const TEINTES: Record<EtatDent, [string, string, string]> = {
  plan: ["#c7e1db", "#3b7a6e", "#30635a"],
  attente: ["#fef3c7", "#d97706", "#b45309"],
  absente: ["#ffffff", "#3b7a6e", "#30635a"],
  fait: ["#e2e8f0", "#cbd5e1", "#94a3b8"],
};
const NEUTRE: [string, string, string] = ["#ffffff", "#cbd5e1", "#94a3b8"];

function silhouette(x: number, y: number, l: number, h: number, haut: boolean) {
  const rw = l * 0.6;
  const r = 3.5;
  const a = x + (l - rw) / 2;
  const b = x + (l + rw) / 2;
  if (haut) {
    const yc = y + h * 0.42;
    const yb = y + h;
    return `M${a},${yc} L${a + 0.6},${y + 4} Q${x + l / 2},${y - 1.5} ${b - 0.6},${y + 4} L${b},${yc} Q${x + l},${yc} ${x + l},${yc + 3} L${x + l},${yb - r} Q${x + l},${yb} ${x + l - r},${yb} L${x + r},${yb} Q${x},${yb} ${x},${yb - r} L${x},${yc + 3} Q${x},${yc} ${a},${yc} Z`;
  }
  const yc = y + h * 0.58;
  return `M${x + r},${y} L${x + l - r},${y} Q${x + l},${y} ${x + l},${y + r} L${x + l},${yc - 3} Q${x + l},${yc} ${b},${yc} L${b - 0.6},${y + h - 4} Q${x + l / 2},${y + h + 1.5} ${a + 0.6},${y + h - 4} L${a},${yc} Q${x},${yc} ${x},${yc - 3} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`;
}

export default function SchemaDentaire({
  dents = {},
  className = "",
}: {
  dents?: Record<number, EtatDent>;
  className?: string;
}) {
  const quadrant = LARGEURS.reduce((a, b) => a + b, 0) + 7 * ECART;
  const largeur = 2 * quadrant + MILIEU;
  const formes = [];
  /* [quadrant gauche, quadrant droit, ligne de base, arcade du haut] */
  for (const [qg, qd, base, haut] of [
    [1, 2, 40, true],
    [4, 3, 54, false],
  ] as const) {
    for (const [q, sens] of [
      [qg, -1],
      [qd, 1],
    ] as const) {
      let x = sens < 0 ? quadrant : quadrant + MILIEU;
      for (let i = 0; i < 8; i++) {
        const l = LARGEURS[i];
        const h = HAUTEURS[i];
        const num = q * 10 + i + 1;
        const etat = dents[num];
        const x0 = sens < 0 ? x - l : x;
        x += sens * (l + ECART);
        const [fond, trait, texte] = etat ? TEINTES[etat] : NEUTRE;
        formes.push(
          <g key={num}>
            <path
              d={silhouette(x0, haut ? base - h : base, l, h, haut)}
              fill={fond}
              stroke={trait}
              strokeWidth={etat ? 1.4 : 1}
              strokeLinejoin="round"
              strokeDasharray={etat === "absente" ? "3 2" : undefined}
            />
            <text
              x={x0 + l / 2}
              y={haut ? 8 : 98}
              textAnchor="middle"
              fontSize="7"
              fontWeight={etat && etat !== "fait" ? 700 : 500}
              fill={texte}
            >
              {num}
            </text>
          </g>,
        );
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${largeur} 100`}
      className={`font-mono ${className}`}
      role="img"
      aria-label="Schéma dentaire en numérotation FDI"
    >
      {formes}
      <line x1={quadrant + MILIEU / 2} y1="4" x2={quadrant + MILIEU / 2} y2="96" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="4" y1="47" x2={largeur - 4} y2="47" stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  );
}
