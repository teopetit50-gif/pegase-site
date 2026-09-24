/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Bande.tsx

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   bande.tsx` : la bande de points (50 px, filets haut et bas) que la
   référence pose entre les sections — le plateau statique de son composant
   « snake ». Ce qui change : jetons clairs (fond #ffffff, filets #e5e5e5 ;
   les points, gris neutre à 14 %, se lisent sur les deux fonds et ne
   bougent pas) ; et la bande court sur TOUTE la largeur de la fenêtre
   (Teo, 24/09 : « la page n'est pas pleine ») : page.tsx la pose hors de la
   marge de 30 px où la source l'enfermait, entre ses deux rails.
   ══════════════════════════════════════════════════════════════════════ */
import DotBoard from "./points";

export default function Bande() {
  return (
    <div aria-hidden="true" className="h-[50px] overflow-hidden border-y border-[#e5e5e5] bg-[#ffffff]">
      <DotBoard cellSize={5} gap={1} rounded={20} boardColor="rgba(128, 128, 128, 0.14)" />
    </div>
  );
}
