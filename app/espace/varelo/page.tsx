import type { Metadata } from "next";
import EcranVarelo from "@/components/espace/varelo/EcranVarelo";

/* ══════════════════════════════════════════════════════════════════════
   /espace/varelo — le référentiel du groupe (05/10/2026, session B1)

   La coquille et la session viennent du layout (app/espace/layout.tsx,
   A3) ; la page ne rend que l'écran. Sociétés et pôles, dépôt des exports
   de chaque société, le référentiel du groupe par objet avec ses codes
   locaux, les lots à valider et les corrections proposées : tout passe
   par les portes grp_* (components/espace/varelo/portes.ts). Le scénario
   qu'il sert est dans omega/NOTES-B1.md.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Référentiel du groupe",
  description: "Les sociétés du groupe, leurs codes locaux rangés sous un seul nom, les rapprochements à valider et les corrections proposées.",
};

export default function PageVarelo() {
  return <EcranVarelo />;
}
