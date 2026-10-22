import type { Metadata } from "next";
import EcranEquipe from "@/components/espace/equipe/EcranEquipe";
import "@/components/espace/espace.css";
import "@/components/espace2/habillage.css";

/* /espace2/equipe — l'écran de /espace/equipe (A3, 15/10/2026), au gabarit Team de Supabase
   depuis le 22/10 ; le monde .resa .esp reste autour pour ses fenêtres. */

export const metadata: Metadata = {
  title: "Équipe",
  description: "Qui a accès à votre organisation, avec quel rôle, sur quelles sociétés.",
};

export default function PageEquipe() {
  return (
    <div className="resa esp">
      <EcranEquipe gabarit="sb" />
    </div>
  );
}
