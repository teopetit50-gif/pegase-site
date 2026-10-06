import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";

/* ══════════════════════════════════════════════════════════════════════
   /espace/demandes — toutes les demandes reçues (public.receptions : formulaires
   des sites vitrines, courriels, WhatsApp), par enseigne — 06/10/2026, A3
   (audit des promesses § 1). Sans le module tiroma (données de santé).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Demandes reçues",
  description: "Les demandes reçues par vos sites, vos boîtes et votre WhatsApp : devis, questions, avis, par enseigne.",
};

export default function PageDemandes() {
  return <EcranBoite portee="toutes" />;
}
