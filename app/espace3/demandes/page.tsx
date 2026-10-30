import type { Metadata } from "next";
import EcranBoite from "@/components/espace3/base/filed/EcranBoite";
import Habille from "@/components/espace3/Habille";
import TableauDemandes from "@/components/espace3/TableauDemandes";

/* /espace3/demandes — en haut, la vue d'ensemble (maquette de Teo, 07/10/2026) ;
   dessous, la boîte de /espace/demandes (tous canaux), inchangée. */

export const metadata: Metadata = {
  title: "Demandes reçues",
  description: "Les demandes reçues par vos sites, vos boîtes et votre WhatsApp : devis, questions, avis, par enseigne.",
};

export default function PageDemandes() {
  return (
    <Habille avant={<TableauDemandes />} ancien>
      <EcranBoite portee="toutes" />
    </Habille>
  );
}
