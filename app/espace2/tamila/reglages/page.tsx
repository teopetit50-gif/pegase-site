import type { Metadata } from "next";
import { Suspense } from "react";
import Reglages from "@/components/espace2/tamila/Reglages";

/* /espace2/tamila/reglages — chiffrement, installation, clé d'index et en-tête des factures, sur Settings › Team de Linear (30/10/2026, refonte des pages métiers) */

export const metadata: Metadata = {
  title: "Réglages du cabinet",
  description: "La phrase et le coffre à clés du cabinet, l'installation, la clé d'index des conflits et l'en-tête des factures.",
};

export default function PageReglages() {
  return (
    <Suspense>
      <Reglages />
    </Suspense>
  );
}
