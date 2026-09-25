/* ══ les lumières des deux bandes sombres ═════════════════════════════
   Chez concurrence.com, deux vidéos (desktop-orange-main.mp4, et sa
   jumelle bleue) : des fenêtres de lumière verticales qui s'allument et
   s'éteignent dans la couleur de la bande, fondues en haut et en bas par
   deux dégradés vers la couleur du fond. Redessinées ici en CSS
   (distribution.css, .nm-lumieres) : onze colonnes, chacune sa largeur,
   son flou, son intensité et son rythme. Les dégradés de bord sont les
   leurs, à l'identique (50 % sous 1024, 30 % au-delà). */
const COLONNES: [x: string, l: string, a: number, f: number, d: number, r: number][] = [
  ["4%", "6%", 0.1, 10, 9, 0],
  ["13%", "2%", 0.2, 4, 6, -2],
  ["19%", "9%", 0.08, 16, 11, -5],
  ["31%", "3%", 0.16, 6, 7, -1],
  ["37%", "12%", 0.07, 22, 12, -7],
  ["52%", "2.5%", 0.22, 3, 5, -3],
  ["58%", "7%", 0.1, 12, 10, -6],
  ["68%", "4%", 0.14, 8, 8, -4],
  ["76%", "10%", 0.07, 18, 13, -9],
  ["88%", "3%", 0.18, 5, 6, -2],
  ["93%", "5%", 0.09, 12, 9, -8],
];

export default function Lumieres({ fond }: { fond: string }) {
  return (
    <div className="relative w-full overflow-hidden pointer-events-none h-full" aria-hidden>
      <div className="nm-lumieres">
        {COLONNES.map(([x, l, a, f, d, r], i) => (
          <i
            key={i}
            style={
              {
                "--x": x,
                "--l": l,
                "--a": a,
                "--f": `${f}px`,
                "--d": `${d}s`,
                "--r": `${r}s`,
                "--y": `${i % 2 ? 3 : -3}%`,
              } as React.CSSProperties
            }
          />
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
