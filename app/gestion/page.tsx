import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { NOM_SITE } from "@/components/espace2/portail";
import { geistAccueil, geistMonoAccueil } from "../_polices/geist-accueil";
import { Bloc, Filet, GRILLE, Hachure } from "@/components/gestion/Trame";
import { Heros } from "@/components/gestion/Heros";
import { Modules } from "@/components/gestion/Modules";
import { Metiers } from "@/components/gestion/Metiers";
import { Reglages } from "@/components/gestion/Reglages";
import { Demarrage } from "@/components/gestion/Demarrage";
import { Mesure } from "@/components/gestion/Mesure";
import { Offre } from "@/components/gestion/Offre";
import { Questions } from "@/components/gestion/Questions";
import { Appel } from "@/components/gestion/Appel";
import { META, QUESTIONS } from "@/components/gestion/textes";
import "./gestion.css";

/* ══════════════════════════════════════════════════════════════════════
   /gestion — le logiciel de gestion d'Omega, l'ERP

   22/11/2026 : la page est créée (Teo : « on part sur le sujet ERP »),
   sur le gabarit NexusCloud. 23/11/2026 : Teo achète Crystal AI (« tu dois
   remplacer celui que tu as actuellement par ce thème-là ») ; le dessin
   est refait, le contenu est gardé.

   Décalque 1:1 de https://crystal-ai-v1.21st.app/ (le gabarit « Crystal
   AI » de 21st.dev), thème clair. Le relevé aux cinq largeurs, les
   polices, les couleurs, le mouvement et ce qui n'est pas repris sont en
   tête de ./gestion.css ; les textes et leur budget dans
   components/gestion/textes.ts ; les écrans dessinés dans
   components/gestion/visuels.tsx ; chaque bloc note ses écarts en tête de
   son fichier.

   Les blocs, dans l'ordre de la référence, et ce qui les sépare (un filet
   de 1 px, une bande hachurée de 40 px : la suite exacte de leur page) :
     hero                    titre, chapô, boutons, grand écran   Heros
     tabs par secteur        les modules, un écran par onglet     Modules
     trusted by + logos      un pari, sept métiers                Metiers
     everything you need     les réglages par l'IA, deux écrans   Reglages
     [crystal studio]        le démarrage, quatre cartes          Demarrage
     run anywhere            agents, métiers, sur mesure          Mesure
     pricing                 ce que vous recevez, cinq colonnes   Offre
     FAQs                    six questions                        Questions
     start building          l'appel final                        Appel
   Sa barre de navigation et son pied de page : ceux d'Omega (l'en-tête
   vit dans app/layout.tsx, le pied dans PageShell).
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  alternates: { canonical: "/gestion" },
  title: META.titre,
  description: META.description,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: NOM_SITE,
    title: META.titre,
    description: META.description,
    url: "/gestion",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: META.titre, description: META.description },
};

export default function PageGestion() {
  return (
    <PageShell>
      <div className={`p-gestion w-full ${geistAccueil.variable} ${geistMonoAccueil.variable}`} data-monde="clair">
        <div className="grid overflow-x-clip text-stone-900" style={GRILLE}>
          <Heros />
          <Filet />
          <Hachure />
          <Filet />
          <Modules />
          <Filet />
          <Hachure />
          <Metiers />
          <Filet />
          <Hachure />
          <Reglages />
          <Hachure />
          <Demarrage />
          <Filet />
          <Hachure />
          <Mesure />
          <Filet />
          <Hachure />
          <Offre />
          <Filet />
          <Hachure />
          <Bloc id="questions">
            <Questions titre={QUESTIONS.titre} liste={QUESTIONS.liste} />
          </Bloc>
          <Filet />
          <Hachure />
          <Filet />
          <Appel />
          <Filet />
        </div>
      </div>
    </PageShell>
  );
}
