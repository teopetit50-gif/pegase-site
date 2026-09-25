import { ViewTransition } from "react";
import Footer from "./Footer";
import Arrivee from "./Arrivee";

/* `overflow-x-clip` sur le conteneur — et surtout PAS `hidden` — pour absorber
   les sections qui sortent du cadre en 100vw (le hero de la home, 05/08) :
   `hidden` créerait un contexte de défilement qui casserait le `position:
   sticky` du header, `clip` non.

   01/09 — transitions de page. Le Header et Lenis vivent désormais dans
   app/layout.tsx : ils survivent aux navigations, rien ne remonte au-dessus
   de <main>. <main> est enveloppé d'un <ViewTransition> React :
     · exit="page-out" : l'ancienne page SORT — capturée en un groupe, fondu
       + 8 px vers le bas en 160 ms (globals.css) ;
     · enter="none" : la nouvelle page est du DOM vivant dès la première
       image, pas une capture fondue — l'entrée est la cascade d'Arrivee
       sur les [data-arrivee] du premier écran, hiérarchisée ;
     · default="none" : rien d'autre n'est capturé — sauf les objets
       partagés (components/Partage.tsx), qui voyagent par-dessus.
   L'ancien fondu global `page-arrivee` (28/08) part avec ce commit : il
   faisait apparaître la page d'un bloc puis laissait les reveals rejouer.

   25/09 — <main> n'est plus plafonné à 1440 px ni bordé de filets. Teo :
   « c'est pas pleine page », capture à l'appui (au-delà de 1440, deux
   bandes noires du bg-panel autour de « Se combine avec »), puis « il y a
   ça sur toutes les autres pages ». Chaque section porte déjà son propre
   conteneur centré : lever le plafond ne déplace aucun contenu (relevé à
   1920 sur 26 pages), seuls les fonds vont d'un bord à l'autre. Les
   rustines de gouttière (100vw + marges négatives, ombre écrêtée) restent
   valables et deviennent sans effet. Sonde : outils/sonde-bandes.mjs. */
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-panel">
      <ViewTransition exit="page-out" enter="none" default="none">
        <main>
          <Arrivee />
          {children}
          <Footer />
        </main>
      </ViewTransition>
    </div>
  );
}
