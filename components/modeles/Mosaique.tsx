import MiniSite from "./MiniSite";
import { MUR, parSlug } from "./donnees";

/* ══════════════════════════════════════════════════════════════════════
   <Mosaique> — le collage du hero de /modeles.

   Réécrite le 03/08 (soir) sur la BONNE référence. La première version
   copiait la grille de ui.shadcn.com — cartes alignées, fondu vers le bas
   d'une page noire. Teo voulait scale.com/generative-ai-data-engine, qui
   est une figure différente : un collage PLEIN CADRE, dans un bloc arrondi
   posé sur une page blanche, où les documents se chevauchent, dépassent de
   tous les côtés, et sur lequel le titre est écrit en blanc.

   Trois choses distinguent ce collage d'une grille —

   · Il vit dans un CADRE arrondi qui a ses propres bords, au lieu de
     s'étaler sur le fond de la page. Sur une page blanche, un mur sans
     cadre n'aurait aucune assise.

   · Les vignettes se CHEVAUCHENT. Chez Scale les papiers passent les uns
     sur les autres ; une grille à gouttières régulières se lit comme un
     catalogue, pas comme un collage. D'où l'espacement négatif et les
     rotations légères.

   · Le voile est en BAS uniquement, franc, pour porter le titre — pas un
     fondu doux sur toute la hauteur. Le haut du collage reste net et
     lisible, c'est lui qui donne envie.
   ══════════════════════════════════════════════════════════════════════ */

const COLONNES = MUR.map((colonne) => colonne.map(parSlug));

/* décalage vertical et rotation par colonne — irréguliers à dessein, une
   alternance régulière se voit et retombe dans l'effet tableau */
const POSE = [
  { y: "-8%", r: "-1.1deg" },
  { y: "4%", r: "0.7deg" },
  { y: "-13%", r: "-0.5deg" },
  { y: "2%", r: "1.2deg" },
  { y: "-6%", r: "-0.9deg" },
  { y: "7%", r: "0.4deg" },
];

export default function Mosaique() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="grid h-full grid-cols-3 items-start sm:grid-cols-4 lg:grid-cols-6"
        style={{
          width: "124%",
          marginLeft: "-12%",
          marginTop: "-4%",
          /* espacement NÉGATIF : c'est ce qui fait le chevauchement */
          gap: "0",
        }}
      >
        {COLONNES.map((colonne, i) => (
          <div
            key={i}
            style={{
              transform: `translateY(${POSE[i].y}) rotate(${POSE[i].r})`,
              padding: "0 7px",
            }}
          >
            {/* Couche de dérive, distincte de la couche de pose : la colonne
                porte déjà un translateY et une rotation, une animation posée
                dessus les écraserait. Les colonnes paires montent, les
                impaires descendent, avec des durées premières entre elles
                pour que le mur ne se resynchronise jamais. */}
            <div
              className={`m-derive grid ${i % 2 ? "m-derive-b" : ""}`}
              style={{ gap: "14px", animationDelay: `${i * -1.7}s` }}
            >
            {colonne.map((m, j) => (
              <MiniSite
                /* index dans la clé : cinq modèles reviennent une seconde
                   fois dans le collage, le slug seul ne les distingue pas */
                key={`${m.slug}-${i}-${j}`}
                m={m}
                cadre={false}
                priority={i < 3}
                sizes="(max-width: 640px) 44vw, (max-width: 1024px) 32vw, 23vw"
                className="shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.06]"
              />
            ))}
            </div>
          </div>
        ))}
      </div>

      {/* Voile bas. Monté à 80 % et rendu quasi opaque au pied après le
          premier rendu : à 62 % le titre blanc traversait les vignettes
          claires (Kinto, Sonic, Flux sont sur fond crème) et devenait
          illisible. Le haut du collage reste net — c'est lui qui donne
          envie —, le bas est franchement éteint pour porter le texte. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[80%]"
        style={{
          background:
            "linear-gradient(to top, rgba(6,7,9,0.97) 30%, rgba(6,7,9,0.88) 48%, rgba(6,7,9,0.55) 68%, rgba(6,7,9,0.16) 86%, rgba(6,7,9,0) 100%)",
        }}
      />
    </div>
  );
}
