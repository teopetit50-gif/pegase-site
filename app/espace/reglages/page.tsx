import type { Metadata } from "next";
import EcranReglages from "@/components/espace/reglages/EcranReglages";

/* ══════════════════════════════════════════════════════════════════════
   /espace/reglages — vos données : le journal en CSV, l'export complet, la
   préparation de l'effacement (06/10/2026, A3 ; audit des promesses § 0).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Réglages",
  description: "Exporter votre journal, exporter toutes vos données, préparer l'effacement à la sortie.",
};

export default function PageReglages() {
  return <EcranReglages />;
}
