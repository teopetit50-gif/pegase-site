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
   faisait apparaître la page d'un bloc puis laissait les reveals rejouer. */
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-panel">
      <ViewTransition exit="page-out" enter="none" default="none">
        <main className="mx-auto max-w-[1440px] border-line-soft sm:border-x">
          <Arrivee />
          {children}
          <Footer />
        </main>
      </ViewTransition>
    </div>
  );
}
