import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import HeroDefile from "@/components/modeles/HeroDefile";
import BandeauFaits from "@/components/modeles/BandeauFaits";
import Galerie from "@/components/modeles/Galerie";
import BoucleFaisceaux from "@/components/modeles/BoucleFaisceaux";
import ClotureAppel from "@/components/modeles/ClotureAppel";

/* ══════════════════════════════════════════════════════════════════════
   /modeles — la galerie de modèles de sites (03/08/2026)

   PAGE DE RÉFÉRENCE : scale.com/generative-ai-data-engine, demandée par
   Teo. Mêmes sections dans le même ordre, mêmes proportions, même
   typographie — relevé au computed style sur viewport 1440, tokens dans le
   bloc `.modeles` de globals.css.

   L'ordre de la référence, repris tel quel :
     1. hero — collage plein cadre dans un bloc arrondi, titre blanc dessus
     2. bandeau de confiance sous le hero
     3. sur-titre monospace + titre centré + chapô + panneau gris à cartes
     4. deuxième section de même facture (« Improve Your Models… »)
     5. clôture pleine largeur, sombre, titre blanc

   Ce qui change : le CONTENU. Là où la référence aligne des logos clients
   et des chiffres de preuve sociale, on met ce qu'on peut tenir — les
   modèles réels et visitables, et quatre faits vérifiables. Reprendre la
   copie et les logos d'un tiers n'aurait ni sens commercial ni base
   légale, et le site s'est déjà donné cette règle sur /offres et
   /reserver-un-audit.

   06/08 — le catalogue passe de 22 à 21 : AssetX est retiré, sa provenance
   et donc sa licence n'ayant pas pu être établies (motif complet dans
   components/modeles/donnees.ts, à l'emplacement de l'entrée supprimée).
   Tous les compteurs de la page suivent — métadonnée, bandeau de faits,
   hero, bouton d'ancre et intertitre.

   03/08 (vague 2) — le catalogue passe de 7 à 22 modèles, et chaque carte
   montre désormais les PAGES INTÉRIEURES du site sous sa capture
   d'accueil : un patron de petite entreprise se demande toujours à quoi ressemblent les
   autres pages, autant y répondre avant qu'il pose la question.

   Ce que cette page ne fait pas : vendre. Aucun prix, aucun bouton
   « commander ». Le parcours est « audit d'abord » depuis le 31/07 ;
   les CTA mènent tous à /tarifs (28/08 : entrée neutre « Commencer », les deux portes).
   02/09 — l'achat existe (/tarifs/site → /site/commande) ; les deux
   « Commencer » de la page (hero, clôture) mènent DIRECTEMENT à /tarifs/site
   (Teo : « pas vers les 3 cartes ») ; la galerie
   reste un lieu de découverte, avec sous chaque carte un petit lien
   « Commander avec ce modèle » qui pré-sélectionne le modèle dans le
   tunnel — discret : ce n'est pas une page de vente.

   14/09/2026 — REFONTE par composants repris (Teo : « fais comme tu le
   sens, je veux des beaux trucs bien développés et pro »). Même ordre de
   sections, mêmes textes, mêmes liens ; ce qui change est la matière :
     1. hero      → <HeroDefile>      (Aceternity « Hero Parallax » : trois
                                       rangées de captures qui glissent)
     2. faits     → <BandeauFaits>    (Tailark « stats » : carte à filets)
     2 bis ruban  → SUPPRIMÉ : le hero montre déjà les modèles en
                    mouvement ; deux défilés à la suite se cannibalisaient.
                    <Ruban> reste au dépôt, plus appelé.
     3. modèles   → <Galerie>         (puces de filtre par usage + grille
                                       animée + effet « focus » d'Aceternity)
     4. boucle    → <BoucleFaisceaux> (Magic UI « Animated Beam » : la
                                       lueur parcourt les cinq jalons et
                                       revient au premier)
     5. clôture   → <ClotureAppel>    (shadcnblocks cta10 : carte sombre)
   Chaque composant porte son en-tête ORIGINE / POURQUOI ICI / CE QUI EST
   JETÉ / ÉCARTS ASSUMÉS et sa propre feuille CSS scopée sous `.modeles`.
   Mosaique, Ruban, Categorie, CarteModele, Boucle et Cloture ne sont plus
   importés ici (orphelins, gardés le temps de la recette).
   « Je veux ce modèle » mène à /reserver-un-audit?modele=<slug> (14/09,
   Teo) et non plus à WhatsApp.
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Modèles de sites | Omega.AI",
  description:
    "Vingt et un modèles de sites en ligne, consultables immédiatement, branchés sur vos systèmes : chaque demande entre dans votre espace, se relance jusqu'au règlement sous votre validation, et le site vous dit ce que vos visiteurs cherchent. Un site, ou le même socle sur plusieurs enseignes.",
};

/* ——— les quatre faits sous le hero ———
   À la place des logos clients de la référence : on n'a pas de clients à
   afficher, et on n'en invente pas. Ces quatre-là se vérifient. */
const FAITS: [string, string][] = [
  ["21 modèles", "tous en ligne, tous visitables"],
  ["Contenu réécrit", "à votre métier, à votre marque"],
  ["Branché sur vos systèmes", "demandes, relances, avis"],
  ["Plusieurs enseignes", "un socle commun, une vue unique"],
];

export default function ModelesPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="modeles">
        {/* ═══════════ 1 · hero — trois rangées de captures qui glissent ═══════════ */}
        <HeroDefile ancreCatalogue="#modeles" />

        {/* ═══════════ 2 · bandeau de faits ═══════════ */}
        <section data-monde="clair" className="m-wrap py-[clamp(3.5rem,7vw,5.5rem)]">
          <p className="text-center text-[15px] text-[color:var(--m-doux)]">
            Chaque modèle est déjà en ligne et se consulte.{" "}
            <a href="#modeles" className="text-[color:var(--m-encre)] underline underline-offset-4">
              Voir les démonstrations →
            </a>
          </p>

          <BandeauFaits faits={FAITS} className="mt-11" />
        </section>

        {/* ═══════════ 3 · les modèles ═══════════ */}
        <section
          id="modeles"
          data-monde="clair"
          className="m-wrap scroll-mt-24 pb-[clamp(4.5rem,9vw,7.5rem)]"
        >
          <div className="mx-auto max-w-3xl text-center">
            <span className="m-sur">Les modèles</span>
            <h2 data-intertitre className="m-h2 mt-5">
              Vingt et un modèles, un même socle
            </h2>
            <p className="m-chapo mx-auto mt-5 max-w-2xl">
              Chaque modèle est un parti pris visuel, pas un métier imposé&nbsp;: vous choisissez l&apos;allure, nous réécrivons tout le contenu pour le vôtre. Le design change&nbsp;; la mécanique derrière — ce que le site reçoit, ce qu&apos;il enregistre, ce qu&apos;il déclenche — ne change pas.
            </p>
          </div>

          {/* LE panneau — la figure qui porte le style de la référence :
              le contenu n'est jamais posé nu sur le blanc.

              03/08 (Teo) — il ne contient plus une grille unique de
              vingt-deux cartes, mais QUATRE familles rangées par usage,
              trois modèles visibles chacune et un bouton qui déplie le
              reste. Vingt-deux cartes d'affilée, on les faisait défiler
              sans jamais choisir ; par usage, on ne déplie que la famille
              qui nous concerne. */}
          <Galerie />

          {/* Sortie du catalogue — hors du panneau, pleine largeur : ce
              n'est pas un modèle de plus, c'est ce qu'on répond quand aucun
              ne convient. */}
          <Link
            data-reveal
            href="/contact"
            className="group mt-6 flex flex-col items-center rounded-[14px] border border-dashed border-black/15 p-8 text-center transition-colors hover:border-black/30"
          >
            <p className="text-[17px]">Plusieurs enseignes, ou rien qui vous convienne&nbsp;?</p>
            <p className="mx-auto mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-[color:var(--m-doux)]">
              Le catalogue s&apos;étend, et il ne couvre pas tout&nbsp;: un site dessiné pour vous, le même socle posé sur plusieurs enseignes, un espace client à part. Décrivez ce que vous avez en tête&nbsp;; le périmètre se chiffre après un diagnostic.
            </p>
            <span className="mt-5 inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium underline-offset-4 group-hover:underline">
              Décrire votre besoin
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>

          <p className="mx-auto mt-7 max-w-3xl text-center text-[12.5px] leading-relaxed text-[color:var(--m-faible)]">
            Démonstrations. Les textes et les marques qui s&apos;y affichent sont ceux
            livrés avec le modèle&nbsp;: votre site porte votre nom, votre marque, vos visuels et vos textes.
          </p>
        </section>

        {/* ═══════════ 4 · la boucle ═══════════ */}
        <section data-monde="clair" className="m-wrap pb-[clamp(4.5rem,9vw,7.5rem)]">
          {/* 03/08 (Teo) — sur-titre « Ce qu'un site seul ne fait pas »
              retiré. Le titre attaque directement, et le `mt-5` qui le
              décollait du sur-titre part avec lui : sans ça il restait un
              blanc en haut de section qui ne compensait plus rien. */}
          <div className="mx-auto max-w-3xl text-center">
            <h2 data-intertitre className="m-h2">
              Ce qui se passe après le clic
            </h2>
            <p className="m-chapo mx-auto mt-5 max-w-2xl">
              N&apos;importe qui peut vous vendre un site. Ce qui suit le clic est une autre affaire&nbsp;: c&apos;est là que se joue l&apos;écart entre une vitrine qui décore et une surface qui produit du chiffre et de la donnée exploitable.
            </p>
          </div>

          <BoucleFaisceaux />
        </section>

        {/* ═══════════ 5 · clôture ═══════════ */}
        <section data-monde="clair" className="m-wrap pb-[clamp(4.5rem,9vw,7.5rem)]">
          <ClotureAppel />
        </section>
      </div>
    </PageShell>
  );
}
