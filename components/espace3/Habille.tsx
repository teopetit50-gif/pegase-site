/* ══════════════════════════════════════════════════════════════════════
   Un écran de /espace, repris tel quel dans le nouvel espace (phase 2,
   06/10/2026, session C1)

   Le composant métier est rendu sans changement (mêmes portes, même
   logique, mêmes noms d'action) dans le monde `.resa .esp` qu'il attend ;
   ./habillage.css change son habit aux mesures du nouveau design. Son h1
   reste le titre exact de l'écran (masqué : le titre visible est dans la
   barre du haut).
   ══════════════════════════════════════════════════════════════════════ */

import "@/components/espace3/base/espace.css";
import "./habillage.css";

/* `avant` : un bloc du nouvel espace posé au-dessus de l'écran repris
   (le tableau de bord CASHD), hors du monde `.resa .esp` */
/* `ancien` : l'écran garde sa disposition d'origine (liste et fiche de /espace),
   seules les finitions communes s'appliquent (22/10, demande de Teo) */
export default function Habille({ children, avant, ancien }: { children: React.ReactNode; avant?: React.ReactNode; ancien?: boolean }) {
  return (
    <div className="v2-page v2-arrivee">
      {avant}
      <div id="ecran" className={ancien ? "resa esp esp-ancien" : "resa esp"}>{children}</div>
    </div>
  );
}

/* 22/10/2026 — un écran repris dont le dessin est une page Supabase
   (gabarit="sb") : il porte lui-même ses marges, pleine largeur ; seul le
   monde `.resa .esp` reste autour, pour ses fenêtres et ses pastilles. */
export function HabilleSb({ children }: { children: React.ReactNode }) {
  return (
    <div id="ecran" className="resa esp sb-ecran">
      {children}
    </div>
  );
}
