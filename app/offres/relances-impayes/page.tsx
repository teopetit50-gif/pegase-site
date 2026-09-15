import type { Metadata } from "next";
import { Geist, Geist_Mono, Gelasio } from "next/font/google";
import PageShell from "@/components/PageShell";
import { Heros } from "@/components/produits/relances/Heros";
import { Bandeau } from "@/components/produits/relances/Bandeau";
import Perimetre from "@/components/produits/relances/Perimetre";
import { Principe } from "@/components/produits/relances/Principe";
import { France } from "@/components/produits/relances/France";
import { Bento } from "@/components/produits/relances/Bento";
import { Ecrans } from "@/components/produits/relances/Ecrans";
import { Questions } from "@/components/produits/relances/Questions";
import { Cloture } from "@/components/produits/relances/Cloture";
import "./relances.css";

/* ══════════════════════════════════════════════════════════════════════
   /offres/relances-impayes — CASHD (11/09/2026)

   C'EST LA PAGE D'ACCUEIL DU SITE SaaS `OMEGA/cashd-site`, RAPATRIÉE.
   Elle remplace la fiche produit servie jusqu'ici par `app/offres/
   [system]/` (gabarit « home », décalqué d'ocoya, monde sombre, héros
   « Le facturier qui se défend tout seul »). Voir RAPATRIEMENT.md : un
   segment statique prime sur `[system]`, donc tous les liens existants
   du site tombent seuls ici, sans une redirection à poser.

   Le site source décalquait le gabarit payant **Folio** (Ruixen UI),
   relevé au style calculé le 09/09/2026 à six largeurs. Le relevé complet
   — couleurs, typographie, paliers de conteneur — est recopié en tête de
   `relances.css`, avec la liste de ce que le rapatriement change.

   LES SIX RÈGLES, ET CE QU'ELLES DONNENT ICI
   1. Enveloppée dans `PageShell` : entête, pied et transitions du site.
      `<main>` est plafonné à 1440 — la peau en SORT et prend la largeur
      de la fenêtre (cf. relances.css), sinon la page se lit comme un bloc
      posé entre deux bandes. Seul le fond s'élargit : le contenu reste
      centré par les conteneurs internes des sections.
   2. Les jetons vivent sous `.p-relances`, jamais sur `:root`.
   3. Aucun `@theme` ici : les utilitaires de couleur du site source
      (`bg-card`, `text-muted-foreground`, `border-border`…) n'existent pas
      sur ce site et ne peignent rien, en silence. Toutes converties en
      valeur arbitraire dans les composants, chacune notée en tête du
      fichier concerné.
   4. La bascule clair/sombre NE VIENT PAS — ni le bouton
      (`components/BasculeTheme.tsx`), ni l'amorce `localStorage` sur la
      clé `cashd-theme`, ni le bloc `.dark`. La page est figée dans son
      monde clair, et chaque section porte `data-monde="clair"` pour que
      l'entête du site passe en verre clair au-dessus d'elle.
   5. Les polices s'importent ICI et pas dans le layout, et `.p-relances`
      réécrit `font-family` explicitement : la règle de police du site est
      posée plus haut, sur `html`, avec Inter.
   6. Appels à l'action réaiguillés : `/creer-un-compte` →
      `/reserver-un-audit` (héros et clôture), `https://omegaai.fr` → `/`,
      `mailto:bonjour@` → `mailto:contact@`. `/espace` et `/connexion`
      partaient avec l'entête et le pied du site source.

   Ce qui ne vient pas non plus : `<PageMotion />`. Il anime les
   `[data-reveal]`, `[data-intertitre]` et `[data-claire]` du site ; cette
   page n'en pose aucun (elle a ses propres animations, CSS et
   framer-motion). L'inclure aurait chargé GSAP et ScrollTrigger pour rien.
   ══════════════════════════════════════════════════════════════════════ */

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/* Substitut libre et métriquement compatible de la Georgia sur laquelle
   retombe la référence (voir l'en-tête de relances.css). */
const gelasio = Gelasio({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-gelasio",
  display: "swap",
});

const TITRE = "CASHD · vos échéances suivies chaque matin";
const DESCRIPTION =
  "CASHD relit chaque matin le facturier que vous tenez déjà et relance devis et factures en votre nom. Aucun message ne part sans votre accord. Un système Omega.";

export const metadata: Metadata = {
  title: `${TITRE} | Omega.AI`,
  description: DESCRIPTION,
  alternates: { canonical: "/offres/relances-impayes" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Omega.AI",
    title: TITRE,
    description: DESCRIPTION,
    url: "/offres/relances-impayes",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function RelancesImpayesPage() {
  return (
    <PageShell>
      <div
        data-monde="clair"
        className={`p-relances flex flex-col ${geist.variable} ${geistMono.variable} ${gelasio.variable}`}
      >
        <div className="relative z-10 overflow-hidden border-[#e6e6e6] border-b">
          <Heros />
        </div>
        <Bandeau />
        <Principe />
        <Bento />
        <Ecrans />
        {/* 14/09 — le périmètre, les cas tordus et l'échelle groupe
            remplacent la bande `Chiffres` (« 1 tableur », « 3 canaux »,
            « 4 paliers », « 0 envoi sans vous ») qui tenait la troisième
            place de la page. Quatre faits de conception, justes, mais qui
            décrivaient la machine au lieu de son étendue. Posés ici, après
            les écrans : le lecteur a vu ce que le système fait, il peut
            lire ce qu'il couvre. `Chiffres.tsx` reste au dépôt, plus
            appelé. ⚠ La colonne `atteste` de
            `lib/produits/capacites/relances.ts` distingue ce qui existe de
            ce qui est écrit sans être construit. */}
        <Perimetre />
        {/* RESYNCHRONISATION 11/09 — « Un produit français » était ici entre
            le Principe et le Bento, où elle coupait la démonstration en deux.
            La source l'a déplacée le même jour (cashd-site/app/page.tsx, et
            son LISEZ-MOI § « avant la FAQ ») : c'est une section de
            réassurance, et la catégorie « Cadre » de la FAQ la prolonge.
            Même enveloppe que ses voisines (`py-20 md:py-28`, même fond,
            même `data-monde`) : le déplacement ne touche qu'à l'ordre de
            lecture. */}
        <France />
        <Questions />
        <Cloture />
      </div>
    </PageShell>
  );
}
