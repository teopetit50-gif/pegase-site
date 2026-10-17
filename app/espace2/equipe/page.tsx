import type { Metadata } from "next";
import EcranEquipe from "@/components/espace/equipe/EcranEquipe";
import Habille from "@/components/espace2/Habille";

/* /espace2/equipe — l'écran de /espace/equipe (A3, 15/10/2026), repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Équipe",
  description: "Qui a accès à votre organisation, avec quel rôle, sur quelles sociétés.",
};

export default function PageEquipe() {
  return (
    <Habille>
      <EcranEquipe />
    </Habille>
  );
}
