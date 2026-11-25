import type { Metadata } from "next";
import { googleSansAccueil } from "./_polices/google-sans-accueil";
import "@/components/accueil-sx/sx.css";
import SxNav from "@/components/accueil-sx/gen/SxNav";
import SxFilets from "@/components/accueil-sx/gen/SxFilets";
import SxHero from "@/components/accueil-sx/gen/SxHero";
import SxPlateforme from "@/components/accueil-sx/gen/SxPlateforme";
import SxFiche from "@/components/accueil-sx/gen/SxFiche";
import SxAgents from "@/components/accueil-sx/gen/SxAgents";
import SxIntegrations from "@/components/accueil-sx/gen/SxIntegrations";
import SxMarque from "@/components/accueil-sx/gen/SxMarque";
import SxSecurite from "@/components/accueil-sx/gen/SxSecurite";
import SxClients from "@/components/accueil-sx/gen/SxClients";
import SxTarifs from "@/components/accueil-sx/gen/SxTarifs";
import SxBande from "@/components/accueil-sx/gen/SxBande";
import SxFaq from "@/components/accueil-sx/gen/SxFaq";
import SxAppel from "@/components/accueil-sx/gen/SxAppel";
import SxPied from "@/components/accueil-sx/gen/SxPied";
import SxMenuMobile from "@/components/accueil-sx/SxMenuMobile";
import SxComportements from "@/components/accueil-sx/SxComportements";

/* ══════════════════════════════════════════════════════════════════════
   / — la page d'accueil (25/11/2026)

   Teo : « refaire celle-là en 1:1, sans faute […] l'arc de la première
   section en bleu, c'est le seul changement ». Référence :
   un gabarit de page « logiciel IA » publié sur 21st.dev (adresse dans outils/sx/LISEZ-MOI.md).

   Méthode (skill methode-site), dans l'ordre :
     1. le HTML rendu de la référence est porté MÉCANIQUEMENT en TSX par
        outils/sx/convertir.py — un fichier par bloc dans
        components/accueil-sx/gen, classes intactes ;
     2. ses règles maison sont recopiées, scopées sous `.sx`, dans
        components/accueil-sx/sx.css ; ses utilitaires sont régénérés par
        le Tailwind du site ;
     3. outils/sx/compare.mjs marche les deux DOM côte à côte et compare
        les styles calculés élément par élément, aux cinq largeurs.

   L'ancien accueil (décalque d'agent-ai-v1.21st.app, components/accueil-v3)
   reste dans l'historique git : commit e984ba60, app/page.tsx.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  /* 22/11 (Teo, « on part sur le sujet ERP ») — titre et description
     inchangés par la refonte du 25/11. */
  title: "Omega.AI | L'ERP qui se configure avec l'IA",
  description:
    "Omega, le logiciel de gestion (ERP) où l'IA travaille pour vous : ventes, achats, stock, banque et comptabilité au même endroit. L'IA l'adapte à votre activité et fait le travail répétitif. Audit de 30 minutes offert.",
};

export default function Home() {
  return (
    /* `.sx` : la racine qui porte tout le CSS de la page (sx.css) et la
       police Google Sans. `flex flex-col min-h-full` reprend le <body> de
       la référence, dont l'enveloppe et le pied sont les deux enfants. */
    <div className={`sx flex min-h-full flex-col ${googleSansAccueil.variable}`}>
      <div className="relative isolate bg-[#f5f5f2]">
        <SxNav />
        <SxFilets />
        <SxHero />
        <SxPlateforme />
        {/* 25/11 (Teo) : les tarifs montent juste au-dessus de « Prêt dès
            le jour J » — déplacés, pas échangés : le reste garde son ordre. */}
        <SxTarifs />
        <SxFiche />
        <SxAgents />
        <SxIntegrations />
        <SxMarque />
        <SxSecurite />
        <SxClients />
        <SxBande />
        <SxFaq />
        <SxAppel />
      </div>
      <SxPied />
      {/* le panneau du bouton « menu » : absent de la référence, voir le composant */}
      <SxMenuMobile />
      <SxComportements />
    </div>
  );
}
