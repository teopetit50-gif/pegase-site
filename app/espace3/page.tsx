import type { Metadata } from "next";
import Accueil from "@/components/espace3/Accueil";

/* /espace3 — la vue d'ensemble de l'organisation (nouveau design, 06/10/2026). */

export const metadata: Metadata = {
  title: "Vue d'ensemble",
};

export default function PageAccueil() {
  return <Accueil />;
}
