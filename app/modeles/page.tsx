import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import PageMotion from "@/components/PageMotion";
import Mosaique from "@/components/modeles/Mosaique";
import Ruban from "@/components/modeles/Ruban";
import Boucle from "@/components/modeles/Boucle";
import Cloture from "@/components/modeles/Cloture";
import Categorie from "@/components/modeles/Categorie";
import CarteModele from "@/components/modeles/CarteModele";
import { CATEGORIES, parCategorie } from "@/components/modeles/donnees";
import { lienContact } from "@/lib/reservation";

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
   ══════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "Modèles de sites | Omega.AI",
  description:
    "Vingt et un modèles de sites en ligne, à visiter tout de suite, branchés sur vos moteurs : la demande de devis arrive sur votre tableau de bord et se relance toute seule jusqu'au paiement.",
};

/* ——— les quatre faits sous le hero ———
   À la place des logos clients de la référence : on n'a pas de clients à
   afficher, et on n'en invente pas. Ces quatre-là se vérifient. */
const FAITS = [
  ["21 modèles", "tous en ligne, tous visitables"],
  ["Contenu réécrit", "en français, à votre métier"],
  ["Branché aux moteurs", "devis, relance, avis"],
  ["Chèque TIC", "vérifié pendant l'audit"],
];

export default function ModelesPage() {
  return (
    <PageShell>
      <PageMotion />

      <div className="modeles">
        {/* ═══════════ 1 · hero — le collage, comme la référence ═══════════ */}
        <section data-monde="clair" className="m-wrap pt-6 sm:pt-8">
          <div
            className="relative isolate overflow-hidden rounded-[16px] bg-[#0b0b0c]"
            style={{ height: "clamp(30rem, 64vh, 42rem)" }}
          >
            <Mosaique />

            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-12">
              {/* 15ch : le titre tombe en deux lignes équilibrées
                  (« Un site qui vous / ramène des clients ») au lieu de
                  laisser « clients » orphelin sur la seconde. */}
              <h1 className="m-h1 max-w-[15ch] text-white">
                Un site qui vous ramène des clients
              </h1>
              <p className="mt-5 max-w-xl text-[clamp(0.95rem,1.3vw,1.1rem)] leading-relaxed text-white/75">
                Vingt et un modèles en ligne, que vous pouvez visiter tout de suite
                branchés sur vos moteurs.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/tarifs"
                  className="m-btn-clair inline-flex items-center gap-2.5 py-3 pl-6 pr-2.5 text-[15px]"
                >
                  Commencer
                  <span className="m-chevron flex h-7 w-7 items-center justify-center rounded-full">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
                        stroke="#fff"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
                <a
                  href="#modeles"
                  className="rounded-[var(--radius-btn)] border border-white/25 px-6 py-3 text-[15px] font-medium text-white/90 transition-colors hover:border-white/45 hover:text-white"
                >
                  Voir les 21 modèles
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ 2 · bandeau de faits ═══════════ */}
        <section data-monde="clair" className="m-wrap py-[clamp(3.5rem,7vw,5.5rem)]">
          <p className="text-center text-[15px] text-[color:var(--m-doux)]">
            Chaque modèle est déjà en ligne et se visite.{" "}
            <a href="#modeles" className="text-[color:var(--m-encre)] underline underline-offset-4">
              Voir les démonstrations →
            </a>
          </p>

          <div className="mt-11 grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
            {FAITS.map(([fort, doux]) => (
              <div key={fort} data-reveal className="text-center">
                <p className="text-[clamp(1.05rem,1.5vw,1.3rem)]">{fort}</p>
                <p className="mt-1.5 text-[13.5px] text-[color:var(--m-faible)]">{doux}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 2 bis · le défilé ═══════════
            Hors de .m-wrap : le ruban traverse toute la largeur de l'écran,
            c'est ce qui lui donne son effet de flux continu. Dans la colonne
            de 1200 px il aurait l'air d'un carrousel coincé dans une boîte. */}
        <section data-monde="clair" className="pb-[clamp(3.5rem,7vw,5.5rem)]">
          <Ruban />
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
              Chaque modèle est un parti pris visuel, pas un métier imposé : vous
              choisissez l&apos;allure, on réécrit tout le contenu au vôtre. Le design
              change, la mécanique derrière ne change pas.
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
          <div className="m-panneau mt-12 p-5 sm:p-8 lg:p-10">
            {CATEGORIES.map((c) => (
              <Categorie key={c.cle} titre={c.titre} pour={c.pour}>
                {parCategorie(c.cle).map((m) => (
                  <CarteModele key={m.slug} m={m} />
                ))}
              </Categorie>
            ))}
          </div>

          {/* Sortie du catalogue — hors du panneau, pleine largeur : ce
              n'est pas un modèle de plus, c'est ce qu'on répond quand aucun
              ne convient. */}
          <a
            data-reveal
            href={lienContact(
              "Un autre style de site",
              "Bonjour, aucun des modèles affichés ne correspond à ce que j'ai en tête pour mon entreprise. Voici plutôt ce que j'imagine : "
            )}
            className="group mt-6 flex flex-col items-center rounded-[14px] border border-dashed border-black/15 p-8 text-center transition-colors hover:border-black/30"
          >
            <p className="text-[17px]">Aucun ne vous parle ?</p>
            <p className="mx-auto mt-3 max-w-[46ch] text-[13.5px] leading-relaxed text-[color:var(--m-doux)]">
              Le catalogue s&apos;étend. Dites-nous l&apos;allure que vous avez en tête,
              on cherche le modèle qui s&apos;en approche.
            </p>
            <span className="mt-5 inline-flex items-center justify-center gap-1.5 text-[13.5px] font-medium underline-offset-4 group-hover:underline">
              Décrire ce que je veux
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
          </a>

          <p className="mx-auto mt-7 max-w-3xl text-center text-[12.5px] leading-relaxed text-[color:var(--m-faible)]">
            Démonstrations. Les textes et les marques qui s&apos;y affichent sont ceux
            livrés avec le modèle : votre site porte votre nom, vos photos et vos textes.
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
              Du premier clic jusqu&apos;au paiement
            </h2>
            <p className="m-chapo mx-auto mt-5 max-w-2xl">
              N&apos;importe qui peut vous vendre un site. Ce qui suit le clic, c&apos;est
              autre chose, et c&apos;est là que se joue la différence entre une vitrine
              qui dort et une vitrine qui vous ramène du chiffre.
            </p>
          </div>

          <Boucle />
        </section>

        {/* ═══════════ 5 · clôture ═══════════ */}
        <section data-monde="clair" className="m-wrap pb-[clamp(4.5rem,9vw,7.5rem)]">
          <Cloture />
        </section>
      </div>
    </PageShell>
  );
}
