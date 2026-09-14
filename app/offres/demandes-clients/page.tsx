import type { Metadata } from "next";
import { Figtree, Space_Mono } from "next/font/google";
import PageShell from "@/components/PageShell";
import { Apport } from "@/components/produits/accueil/Apport";
import { Bandeau } from "@/components/produits/accueil/Bandeau";
import { Canaux } from "@/components/produits/accueil/Canaux";
import { Capacites } from "@/components/produits/accueil/Capacites";
import { Cloture } from "@/components/produits/accueil/Cloture";
import { Etapes } from "@/components/produits/accueil/Etapes";
import { Francais } from "@/components/produits/accueil/Francais";
import { Heros } from "@/components/produits/accueil/Heros";
import { Journee } from "@/components/produits/accueil/Journee";
import { Metiers } from "@/components/produits/accueil/Metiers";
import { Questions } from "@/components/produits/accueil/Questions";
import "./accueil.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres/demandes-clients — FRONTD.

   RAPATRIEMENT 11/09/2026 (RAPATRIEMENT.md). Cette page EST la page
   d'accueil du site autonome OMEGA/frontd-site — décalque du gabarit Synth
   AI (synthai.demos.tailgrids.com), relevé au style calculé le 09/09. Le
   site disparaît, la page reste, et elle remplace l'ancienne page produit
   (gabarit ocoya) qui vivait sous ce même slug.

   Aucune redirection à poser : une route statique prime sur
   `app/offres/[system]/`, donc tous les liens existants du site —
   l'accueil, /offres, /integrations, /audit/[slug], /tarifs — tombent
   seuls ici.

   Les six règles d'intégration, appliquées :

   1. `PageShell` fournit l'entête et le pied. Conséquence : `<main>` est
      plafonné à 1440 px, alors que le relevé d'origine montait jusqu'à
      1700. Sans effet sur la colonne (max-w-7xl la fige à 1280 dès 1440) ;
      le seul palier réellement perdu est le `2xl:` des tuiles de Canaux.

   2. Les jetons du relevé vivent sous `.p-accueil`, jamais sur `:root`.

   3. Les utilitaires nés du `@theme` du site source n'existent pas ici et
      ne peindraient rien en silence : les cinq sont converties à la main
      (voir l'entête d'accueil.css).

   4. Pas de bascule clair/sombre — ce décalque n'en a jamais eu, il est
      d'un seul monde. Les sections claires portent `data-monde="clair"`.

   5. Les deux polices sont chargées ICI (next/font/google marche dans
      n'importe quel module serveur) et non dans app/layout.tsx, qui sert
      les 23 autres pages. Leurs variables sont posées sur le conteneur de
      la page, et `.p-accueil` écrit `font-family` explicitement.

   6. Les appels à l'action sont réaiguillés vers les routes de ce site :
      · « Créer un compte » ×4      → /connexion?mode=creation
      · « Se connecter »            → /connexion
      · « Mentions légales »        → /mentions-legales
      L'entête du site source (sa nav d'ancres, son bouton « Mon espace »)
      et son pied de page sont supprimés — doublons de ceux du site,
      signature Ω comprise. Sa page /connexion et son authentification
      Supabase disparaissent avec lui : le compte se prend sur /connexion,
      qui est ici.
   ══════════════════════════════════════════════════════════════════════ */

/* Les deux polices de la référence sont libres (SIL OFL) : on les charge
   telles quelles, servies depuis notre domaine par next/font. */
const texte = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--police-texte",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--police-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FRONTD · demandes entrantes & avis | Omega.AI",
  /* 11/09 — la description reprenait le titre principal, qui est une
     accroche : il travaille au-dessus du pli, le contexte déjà posé par
     la page. Une description de référencement travaille sans contexte,
     dans une liste de résultats — elle doit donc nommer l'objet. Même
     règle que `fiche.meta` pour les pages de paquet, et même signature
     de fin que les trois autres pages produit. */
  description:
    "Les demandes reçues par mail et WhatsApp obtiennent une réponse à toute heure, tirée de ce que votre entreprise sait vraiment, jamais inventée. Un système Omega.",
};

export default function Page() {
  return (
    <PageShell>
      <div
        className={`p-accueil ${texte.variable} ${mono.variable} bg-neutral-100 antialiased overflow-clip`}
      >
        <div className="p-3 mx-auto">
          {/* Gouttière : 12 px, valeur relevée sur la référence — passée à
              16 px sous `sm`, où deux cartes blanches sur fond gris clair se
              lisaient comme un seul bloc. */}
          <div className="space-y-3 max-sm:space-y-4">
            <Heros />
            <Bandeau />
            <Journee />
            <Apport />
            <Capacites />
            <Etapes />
            <Canaux />
            <Metiers />
            <Francais />
            <Questions />
          </div>
          <Cloture />
        </div>
      </div>
    </PageShell>
  );
}
