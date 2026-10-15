import type { Metadata } from "next";
import EcranBoite from "@/components/espace/filed/EcranBoite";
import Habille from "@/components/espace2/Habille";
import TableauDemandes from "@/components/espace2/TableauDemandes";

/* /espace2/demandes — en haut, la vue d'ensemble (maquette de Teo, 07/10/2026) ;
   dessous, la boîte de /espace/demandes (tous canaux), inchangée. */

export const metadata: Metadata = {
  title: "Demandes reçues",
  description: "Les demandes reçues par vos sites, vos boîtes et votre WhatsApp : devis, questions, avis, par enseigne.",
};

export default function PageDemandes() {
  return (
    <Habille avant={<TableauDemandes />}>
      <EcranBoite portee="toutes" />
    </Habille>
  );
}
