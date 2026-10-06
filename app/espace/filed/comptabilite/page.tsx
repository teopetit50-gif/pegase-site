import type { Metadata } from "next";
import EcranComptabilite from "@/components/espace/filed/EcranComptabilite";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed/comptabilite — l'export FEC des achats et les comptes de
   FILED (06/10/2026, session A3, fiche d'A4 §§ 7 et 8). Sous /espace/filed :
   l'onglet FILED de la barre reste allumé (la barre n'est pas touchée).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Comptabilité",
  description: "Le fichier des écritures comptables (FEC) des achats tenus par FILED, et les comptes utilisés pour les écrire.",
};

export default function PageComptabilite() {
  return <EcranComptabilite />;
}
