import type { Metadata } from "next";
import Accueil from "@/components/espace2/Accueil";

/* /espace2 — la vue d'ensemble de l'organisation (nouveau design, 06/10/2026). */

export const metadata: Metadata = {
  title: "Vue d'ensemble",
};

export default function PageAccueil() {
  return <Accueil />;
}
