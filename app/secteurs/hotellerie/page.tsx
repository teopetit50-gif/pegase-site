import type { Metadata } from "next";
import type React from "react";
import PageShell from "@/components/PageShell";
import { Hero } from "@/components/secteurs/hotellerie/Heros";
import { Logos } from "@/components/secteurs/hotellerie/Lu";
import { Features } from "@/components/secteurs/hotellerie/Fonctions";
import { Stats } from "@/components/secteurs/hotellerie/Chiffres";
import { Testimonials } from "@/components/secteurs/hotellerie/Metiers";
import { Pricing } from "@/components/secteurs/hotellerie/Formules";
import { Faq } from "@/components/secteurs/hotellerie/Questions";
import { Cta } from "@/components/secteurs/hotellerie/Appel";
import { Bande } from "@/components/secteurs/hotellerie/Bande";
/* La peau est CELLE DE LA PAGE BTP, importée telle quelle : même jetons,
   mêmes animations, même échelle mobile. La page porte donc la classe
   `.p-btp` ; un réglage fait sur la page BTP vaut aussi ici. */
import "../btp/btp.css";
import "../btp/mobile.css";

/* ══════════════════════════════════════════════════════════════════════
   /secteurs/hotellerie — OSTELO (04/11/2026)

   Teo, le 04/11, après un appel avec un hôtelier qui veut voir le site :
   « je veux une page spécialisée hôtel », copiée de la page BTP (elle-même
   copie de Vertex, vertex-one-lovat.vercel.app) : mêmes composants, même
   UX. Puis : « tu dois pas vendre un regroupement de systèmes mais un
   logiciel lui-même nouveau, comme Daliro ou Tavaro : trouve un nom », et
   « mets des features de ouf pour les hôteliers ».

   Ostelo est donc le logiciel métier des hôtels, NOM DE TRAVAIL et signe
   provisoire (détail en tête de components/secteurs/hotellerie/textes.ts).
   La page BTP est reprise section par section (components/secteurs/
   hotellerie/ = components/secteurs/btp/ réécrit) ; seuls changent les
   textes, les maquettes et les icônes (public/secteurs-hotellerie/).

   PAS ENCORE DANS LE MENU NI SUR /secteurs : la page n'a pas de ligne dans
   lib/secteurs.ts (il y faudrait aussi une capture d'aperçu). Elle
   s'atteint par son lien. Le bloc « Se combine avec » (SeCombine), qui lit
   cette table, n'est donc pas posé.
   ══════════════════════════════════════════════════════════════════════ */

const TITRE = "Ostelo · chaque demande reçoit sa réponse, chaque chambre annulée est revendue";
const DESCRIPTION =
  "Ostelo répond à vos clients à toute heure et dans leur langue, repropose chaque chambre annulée à la liste d'attente, propose surclassement et petit-déjeuner avant l'arrivée et vérifie chaque extra sur la note. Conçu par Omega pour les hôtels.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/secteurs/hotellerie" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/secteurs/hotellerie",
    images: ["/opengraph-image"],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-monde="clair" className={className}>
      <div className="btp-conteneur">{children}</div>
    </div>
  );
}

export default function PageOstelo() {
  return (
    <PageShell>
      <div data-monde="clair" className="p-btp p-hotellerie flex flex-col">
        <Section className="relative z-20 w-full bg-[#ffffff] pt-24 md:pt-32">
          <Hero />
        </Section>
        <Bande />
        <Section>
          <Logos />
        </Section>
        <Bande />
        <Section>
          <Features />
        </Section>
        <Bande />
        <Section>
          <Stats />
        </Section>
        <Bande />
        <Section>
          <Testimonials />
        </Section>
        <Bande />
        <section id="pricing" data-monde="clair" className="scroll-mt-20">
          <div className="btp-conteneur">
            <Pricing />
          </div>
        </section>
        <Bande />
        <section id="faq" data-monde="clair" className="scroll-mt-20">
          <div className="btp-conteneur">
            <Faq />
          </div>
        </section>
        <Bande />
        <Section>
          <Cta />
        </Section>
      </div>
    </PageShell>
  );
}
