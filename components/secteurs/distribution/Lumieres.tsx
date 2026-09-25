/* ══ les lumières des deux bandes sombres ═════════════════════════════
   Chez concurrence.com, une vidéo (desktop-orange-main.mp4 et sa jumelle
   bleue), décomposée image par image le 24/09 (16 images, 0,25 s) :
   SIX PANNEAUX, trois colonnes sur deux rangées ; dans chaque panneau
   QUATRE BARRES côte à côte, accrochées au bord haut ou au bord bas du
   panneau, pleines près du bord et fondues à leur bout libre. Les quatre
   barres d'un panneau forment un ESCALIER (chacune un cran plus haute que
   la voisine) ; elles poussent vite depuis leur bord, tiennent un instant
   puis se RÉTRACTENT vers ce même bord — c'est le « spawn / despawn »
   dont parle Teo. Des traits verticaux d'un pixel, étiquetés en mono,
   passent sur la grille.
   Ici en CSS (distribution.css, .nm-barre) : chaque panneau a son bord,
   sa hauteur, son sens d'escalier, son rythme (2,4 à 3,4 s) et son
   décalage. Leur lavande devient le gris clair d'Omega. Les dégradés de
   bord haut et bas de la zone sont les leurs, à l'identique. */

type Panneau = { bord: "haut" | "bas"; m: number; pas: number; d: number; r: number };

/* [rangée haute ×3, rangée basse ×3] — relevé sur leurs images : en haut
   à gauche petites barres posées en bas, au milieu grandes barres
   pendues, à droite escalier montant ; en bas l'inverse */
const PANNEAUX: Panneau[] = [
  { bord: "bas", m: 0.32, pas: -0.06, d: 2.6, r: 0 },
  { bord: "haut", m: 0.8, pas: 0.05, d: 3.2, r: -1.1 },
  { bord: "bas", m: 0.55, pas: 0.12, d: 2.8, r: -0.4 },
  { bord: "bas", m: 0.62, pas: -0.08, d: 3.0, r: -1.8 },
  { bord: "haut", m: 0.3, pas: 0.06, d: 2.4, r: -0.7 },
  { bord: "bas", m: 0.9, pas: -0.07, d: 3.4, r: -2.2 },
];

const TRAITS = [
  { x: "8%", rangee: 0, etiquette: "Stock · île 1", r: -0.5 },
  { x: "36.5%", rangee: 0, etiquette: "Départ J-6", r: -2.1 },
  { x: "28%", rangee: 1, etiquette: "Commande", r: -1.3 },
  { x: "70%", rangee: 1, etiquette: "Transfert", r: -3.0 },
];

export default function Lumieres({ fond }: { fond: string }) {
  return (
    <div className="relative w-full overflow-hidden pointer-events-none h-full" aria-hidden>
      <div className="nm-barres">
        {PANNEAUX.map((p, i) => (
          <div key={i} className="nm-panneau">
            {[0, 1, 2, 3].map((k) => (
              <i
                key={k}
                className={`nm-barre nm-barre--${p.bord}`}
                style={
                  {
                    "--m": Math.min(1, Math.max(0.04, p.m + k * p.pas)),
                    animationDuration: `${p.d}s`,
                    animationDelay: `${p.r + k * 0.09}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ))}
        {TRAITS.map((t) => (
          <span
            key={t.etiquette}
            className="nm-trait-lum"
            style={{ left: t.x, top: t.rangee ? "50%" : "0", animationDelay: `${t.r}s` }}
          >
            <b>{t.etiquette}</b>
          </span>
        ))}
      </div>
      <div
        className="absolute top-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to top, transparent, ${fond})` }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to bottom, transparent, ${fond})` }}
      />
    </div>
  );
}
