import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BookOpen, GraduationCap, Rocket } from "lucide-react";
import { blocs, riche } from "@/components/espace2/formation/Article";
import { PAGES } from "@/components/espace2/formation/pages";
import { Accueil, Lecon, PasAPas, type Parcours } from "@/components/espace2/formation/maquettes/Maquettes";
import { gestesDe } from "@/components/espace2/formation/maquettes/gestes";
import { MODULES } from "@/components/espace2/modules";

/* Maquettes du visuel de la Formation (branche claude/formation-visuel,
   jamais en ligne) : /espace2/formation/maquette/academie,
   /espace2/formation/maquette/lecon?page=cashd,
   /espace2/formation/maquette/pas-a-pas?page=cashd. */

export const metadata: Metadata = { title: "Maquette · Formation" };

type Props = { params: Promise<{ direction: string }>; searchParams: Promise<{ page?: string }> };

const I = { width: 16, height: 16, "aria-hidden": true } as const;

export default async function Page({ params, searchParams }: Props) {
  const { direction } = await params;
  const { page: cle = "cashd" } = await searchParams;

  if (direction === "academie") {
    const carte = (k: string, icone: ReactNode) => {
      const p = PAGES[k];
      const g = gestesDe(p).length + (p.video ? 1 : 0);
      return { cle: k, titre: p.titre, resume: p.intro.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"), videos: g, minutes: Math.max(1, Math.round((g * 38) / 60)), icone };
    };
    const icone = (k: string) => {
      const M = MODULES.find((m) => m.cle === k)?.icone ?? BookOpen;
      return <M {...I} />;
    };
    const parcours: Parcours[] = [
      { titre: "Bien démarrer", sousTitre: "Pour tout le monde, dans cet ordre", cartes: [carte("guide", <Rocket {...I} />), carte("principes", <BookOpen {...I} />), carte("premiere-semaine", <GraduationCap {...I} />)] },
      { titre: "Vos systèmes", sousTitre: "Ceux que votre entreprise utilise", cartes: ["filed", "cashd", "reput", "offload"].map((k) => carte(k, icone(k))) },
      { titre: "Votre métier", sousTitre: "Le logiciel de votre profession", cartes: [carte("daliro", icone("daliro"))] },
    ];
    const toutes = parcours.flatMap((p) => p.cartes);
    const videos = toutes.reduce((t, c) => t + c.videos, 0);
    return <Accueil parcours={parcours} total={{ videos, minutes: Math.round((videos * 38) / 60) }} />;
  }

  const page = PAGES[cle];
  if (!page || (direction !== "lecon" && direction !== "pas-a-pas")) notFound();
  const corps = Object.fromEntries(gestesDe(page).map((s) => [s.id, <>{blocs(s.blocs)}</>]));
  if (direction === "lecon") return <Lecon page={page} corps={corps} />;
  return <PasAPas page={page} corps={corps} intro={riche(page.intro)} />;
}
