import type { Metadata } from "next";
import EcranEquipe from "@/components/espace/equipe/EcranEquipe";

/* /espace/equipe — l'équipe de l'organisation : rôles, sociétés visibles,
   ajouter et retirer (15/10/2026, A3 ; CHIFFRAGE/espace.md §§ 1.4 à 1.6). */

export const metadata: Metadata = {
  title: "Équipe",
  description: "Qui a accès à votre organisation, avec quel rôle, sur quelles sociétés.",
};

export default function PageEquipe() {
  return <EcranEquipe />;
}
