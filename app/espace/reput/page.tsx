import type { Metadata } from "next";
import EcranReput from "@/components/espace/reput/EcranReput";

/* ══════════════════════════════════════════════════════════════════════
   /espace/reput — les demandes clients et leurs réponses (06/10/2026, C3)

   La coquille et la session viennent du layout (app/espace/layout.tsx) ;
   la page ne rend que l'écran, qui lit l'exemple ou la base réelle selon
   l'interrupteur : reput_demandes, reput_reponses, reput_connaissances,
   reput_sujets sous RLS, les écritures par les portes reput_*
   (components/espace/reput/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Demandes clients",
  description: "Les demandes reçues par courriel, WhatsApp et le formulaire du site, leur réponse préparée à partir de votre base de connaissances, à valider, corriger ou refuser ; les sujets qui partent seuls.",
};

export default function PageReput() {
  return <EcranReput />;
}
