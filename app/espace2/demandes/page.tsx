import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";
import Habille from "@/components/espace2/Habille";

/* /espace2/demandes — l'écran de /espace/demandes (la boîte, tous canaux), repris tel quel dans le nouvel espace. */

export const metadata: Metadata = {
  title: "Demandes reçues",
  description: "Les demandes reçues par vos sites, vos boîtes et votre WhatsApp : devis, questions, avis, par enseigne.",
};

export default function PageDemandes() {
  return (
    <Habille>
      <EcranBoite portee="toutes" />
    </Habille>
  );
}
