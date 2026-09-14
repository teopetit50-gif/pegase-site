import type { ReactNode } from "react";
import "./marquee.css";

/* ══════════════════════════════════════════════════════════════════════
   marquee — le défilement continu de Magic UI (14/09/2026)

   Reprise de `marquee` de @dillionverma (21st.dev) : un conteneur qui
   répète son contenu N fois et fait glisser chaque copie d'une largeur
   plus une gouttière — la boucle est invisible parce qu'au moment où la
   première copie sort, la deuxième est exactement à sa place.

   Sert ici au bandeau « Pensé pour » de /offres/sur-mesure : huit
   secteurs qui étaient huit cartes de 290 px à défilement manuel — une
   rangée de 2 600 px qu'on n'atteignait qu'en faisant glisser. En deux
   pistes de pastilles qui se croisent, les huit passent sous les yeux
   sans geste et la section coûte 120 px au lieu de 300.

   Trois écarts :
   1. `animate-marquee` est un utilitaire du greffon d'animation, absent du
      site : les règles sont dans `marquee.css` (`.mq`, `.mq-piste`).
   2. Le masque de bord vient du site (`.o-marquee` fait pareil à 9 %),
      posé directement sur `.mq` pour ne pas dépendre d'un parent.
   3. `cn()` et la variante verticale retirés : une seule direction ici.
   ══════════════════════════════════════════════════════════════════════ */

export function Marquee({
  children,
  inverse = false,
  pause = false,
  repetitions = 4,
  duree = 40,
  className = "",
}: {
  children: ReactNode;
  inverse?: boolean;
  pause?: boolean;
  repetitions?: number;
  duree?: number;
  className?: string;
}) {
  return (
    <div
      className={`mq ${pause ? "mq--pause" : ""} ${className}`}
      style={{ ["--duration" as string]: `${duree}s` }}
    >
      {Array.from({ length: repetitions }, (_, i) => (
        <div key={i} className={`mq-piste ${inverse ? "mq-piste--inverse" : ""}`} aria-hidden={i > 0}>
          {children}
        </div>
      ))}
    </div>
  );
}
