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

/* `avant` : un bloc du nouvel espace posé au-dessus de l'écran repris
   (le tableau de bord CASHD), hors du monde `.resa .esp` */
export default function Habille({ children, avant }: { children: React.ReactNode; avant?: React.ReactNode }) {
  return (
    <div className="v2-page v2-arrivee">
      {avant}
      <div id="ecran" className="resa esp">{children}</div>
    </div>
  );
}
