/* ══════════════════════════════════════════════════════════════════════
   Un écran de /espace, repris tel quel dans le nouvel espace (phase 2,
   06/10/2026, session C1)

   Le composant métier est rendu sans changement (mêmes portes, même
   logique, mêmes noms d'action) dans le monde `.resa .esp` qu'il attend ;
   ./habillage.css change son habit aux mesures du nouveau design. Son h1
   reste le titre exact de l'écran (masqué : le titre visible est dans la
   barre du haut).
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace/espace.css";
import "./habillage.css";

export default function Habille({ children }: { children: React.ReactNode }) {
  return (
    <div className="v2-page v2-arrivee">
      <div className="resa esp">{children}</div>
    </div>
  );
}
