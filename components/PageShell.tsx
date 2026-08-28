import Header from "./Header";
import Footer from "./Footer";

/* `overflow-x-clip` sur le conteneur — et surtout PAS `hidden` — pour absorber
   les sections qui sortent du cadre en 100vw (le hero de la home, 05/08) :
   `hidden` créerait un contexte de défilement qui casserait le `position:
   sticky` du header, `clip` non.

   28/08 — `page-arrivee` : chaque navigation remonte <main>, l'animation
   (fondu + 12 px de montée, globals.css) rejoue donc à chaque page. Le
   header, hors de <main>, reste parfaitement stable pendant l'entrée —
   c'est lui qui donne l'impression de continuité (Teo : « c'est trop
   brutal d'arriver sur les pages »). */
export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-panel">
      <Header />
      <main className="page-arrivee mx-auto max-w-[1440px] border-line-soft sm:border-x">
        {children}
        <Footer />
      </main>
    </div>
  );
}
