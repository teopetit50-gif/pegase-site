import { BookOpen, GraduationCap, LayoutDashboard, Network, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { blocs, riche } from "./Article";
import { MODULES, MODULES_PRINCIPAUX } from "../modules";
import { PAGES, type PageFormation } from "./pages";
import { Accueil, PageModule, type Carte, type Ligne, type Parcours } from "./vues/Vues";

/* Le visuel « B + C » de la Formation (03/11/2026, choix de Teo) : ce
   fichier, côté serveur, tire de pages.ts l'accueil en cartes et chaque
   page de module en lignes (components/espace2/formation/vues/). */

/* en minutes, arrondi, au moins 1 (aussi dans vues/Vues.tsx : une fonction du client ne s'appelle pas d'ici) */
const minutes = (secondes: number) => Math.max(1, Math.round(secondes / 60));
const METIERS = ["daliro", "lorani", "tavaro", "tiroma", "tamila", "varelo"];
const I = { width: 16, height: 16, "aria-hidden": true } as const;

const videosDe = (p: PageFormation) => [...(p.video ? [p.video] : []), ...p.sections.flatMap((s) => (s.video ? [s.video] : []))];
const sansLiens = (t: string) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function carte(cle: string, icone: ReactNode): Carte {
  const p = PAGES[cle];
  const v = videosDe(p);
  return { cle, titre: p.titre, resume: sansLiens(p.intro), videos: v.length, minutes: minutes(v.reduce((t, x) => t + x.duree, 0)), icone };
}

function iconeModule(cle: string) {
  const M = MODULES.find((m) => m.cle === cle)?.icone ?? BookOpen;
  return <M {...I} />;
}

export function AccueilFormation() {
  const parcours: Parcours[] = [
    {
      titre: "Bien démarrer",
      sousTitre: "Pour tout le monde, dans cet ordre",
      cartes: [carte("guide", <Rocket {...I} />), carte("principes", <BookOpen {...I} />), carte("premiere-semaine", <GraduationCap {...I} />)],
    },
    { titre: "Vos systèmes", sousTitre: "Ceux que votre entreprise utilise", cartes: MODULES_PRINCIPAUX.map((k) => carte(k, iconeModule(k))) },
    { titre: "Les logiciels métier", sousTitre: "Celui de votre profession", cartes: METIERS.map((k) => carte(k, iconeModule(k))) },
    { titre: "Aller plus loin", sousTitre: "Le reste de votre espace, et le Réseau", cartes: [carte("espace", <LayoutDashboard {...I} />), carte("reseau", <Network {...I} />)] },
  ];
  const toutes = parcours.flatMap((p) => p.cartes);
  const duree = Object.values(PAGES).flatMap(videosDe).reduce((t, x) => t + x.duree, 0);
  return <Accueil parcours={parcours} total={{ videos: toutes.reduce((t, c) => t + c.videos, 0), minutes: minutes(duree) }} />;
}

export function PageFormationVue({ page }: { page: PageFormation }) {
  let rang = 0;
  const lignes: Ligne[] = page.sections.map((s) => ({
    id: s.id,
    titre: s.titre,
    niveau: s.niveau,
    video: s.video,
    rang: s.video ? ++rang : undefined,
    corps: <>{blocs(s.blocs)}</>,
  }));
  return <PageModule titre={page.titre} intro={riche(page.intro)} video={page.video} lignes={lignes} suivant={page.suivant} />;
}
