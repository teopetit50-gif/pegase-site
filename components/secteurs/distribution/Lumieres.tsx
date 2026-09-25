/* ══ les lumières des deux bandes sombres ═════════════════════════════
   Chez concurrence.com, une vidéo (desktop-orange-main.mp4 et sa jumelle
   bleue), décomposée image par image le 24/09 (16 images, 0,25 s) :
   SIX PANNEAUX, trois colonnes sur deux rangées ; dans chaque panneau
   QUATRE BARRES côte à côte, accrochées au bord haut ou au bord bas du
   panneau, pleines près du bord et fondues à leur bout libre. Les quatre
   barres d'un panneau forment un ESCALIER (chacune un cran plus haute que
   la voisine) ; elles poussent vite depuis leur bord, tiennent un instant
   puis se RÉTRACTENT vers ce même bord — c'est le « spawn / despawn »
   dont parle Teo.
   Ici en CSS (distribution.css, .nm-barre) : chaque panneau a son bord,
   sa hauteur, son sens d'escalier, son rythme (2,4 à 3,4 s) et son
   décalage. Leur lavande devient le gris clair d'Omega. Les dégradés de
   bord haut et bas de la zone sont les leurs, à l'identique.
   25/09 — Teo : les traits étiquetés sont retirés, et les barres « un peu
   trop rapides, pas assez fluides » : cycles de 5,8 à 7,8 s (2,4 à 3,4
   avant), courbe sinusoïdale sans palier, vague de 0,22 s entre barres. */

type Panneau = { bord: "haut" | "bas"; m: number; pas: number; d: number; r: number };

/* [rangée haute ×3, rangée basse ×3] — relevé sur leurs images : en haut
   à gauche petites barres posées en bas, au milieu grandes barres
   pendues, à droite escalier montant ; en bas l'inverse */
const PANNEAUX: Panneau[] = [
  { bord: "bas", m: 0.32, pas: -0.06, d: 6.2, r: 0 },
  { bord: "haut", m: 0.8, pas: 0.05, d: 7.4, r: -2.6 },
  { bord: "bas", m: 0.55, pas: 0.12, d: 6.8, r: -1.1 },
  { bord: "bas", m: 0.62, pas: -0.08, d: 7.0, r: -4.2 },
  { bord: "haut", m: 0.3, pas: 0.06, d: 5.8, r: -1.9 },
  { bord: "bas", m: 0.9, pas: -0.07, d: 7.8, r: -5.1 },
];


/* la teinte des barres, en triplet RVB : bleu glacier sur le bleu nuit,
   gris clair sur la nuit (leur lavande sur l'orange) */
const TEINTES = { bleu: "205 218 250", gris: "224 224 228" };

export default function Lumieres({
  fond,
  fondBas = fond,
  teinte = "bleu",
}: {
  fond: string;
  /* la couleur vers laquelle fond le bas de la zone (le noir du pied
     d'Omega sous la dernière bande) */
  fondBas?: string;
  teinte?: keyof typeof TEINTES;
}) {
  return (
    <div
      className="relative w-full overflow-hidden pointer-events-none h-full"
      style={{ "--nm-lum": TEINTES[teinte] } as React.CSSProperties}
      aria-hidden
    >
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
                    animationDelay: `${p.r + k * 0.22}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>
      <div
        className="absolute top-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to top, transparent, ${fond})` }}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[50%] lg:h-[30%] pointer-events-none z-[1]"
        style={{ background: `linear-gradient(to bottom, transparent, ${fondBas})` }}
      />
    </div>
  );
}
