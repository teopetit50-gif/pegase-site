import FormulesGrille from "./FormulesGrille";
import ComparerFormats from "./ComparerFormats";
import Lien from "@/components/Lien";
import { lienContact } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   /reserver-un-audit — bloc haut : les trois formats, le bandeau
   d'orientation, le comparatif. (26/07/2026, refait le 15/09/2026)

   15/09 — Teo a apporté deux composants de 21st.dev, un par section :
     · `pricing-module`  → <FormulesGrille>, la rangée de formats
     · `features-card`   → <ComparerFormats>, le bento à sélecteur
   Chacun vit dans SON fichier avec SA feuille (règles scopées sous
   `.resa`), comme le reste de la page. Ce qui reste ici est ce qui
   n'appartient à aucun des deux : le bandeau d'orientation, entre les
   deux.

   Ce fichier n'a plus d'état : le sélecteur Indépendant/Équipes est parti
   le 28/08 (cette page ne parle plus qu'aux organisations), et le
   sélecteur de format du comparatif vit dans <ComparerFormats>. La
   directive "use client" a donc disparu : seul le bento est un composant
   client, le reste est rendu sur le serveur.

   Ce qui a disparu avec le tableau du comparatif : <Ligne>, ses deux
   en-têtes collants (bureau et mobile) et le repli « Voir tous les
   points ». Le détail de l'arbitrage est en tête de ComparerFormats.tsx.
   ══════════════════════════════════════════════════════════════════════ */

export default function Formules() {
  return (
    <>
      {/* ═══ 1. titre, trois formats, financement ═══ */}
      <FormulesGrille />

      {/* ═══ 2. bandeau d'orientation ═══ */}
      <section data-monde="clair" className="r-wrap pb-14 sm:pb-16">
        <div className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8">
          <p className="max-w-[62ch] text-[15px] leading-[23px] text-[#3d3d3d]">
            <span className="font-semibold text-[#050505]">
              Vous ne savez pas quel format choisir ?
            </span>{" "}
            Décrivez votre situation en deux lignes&nbsp;: votre activité, votre commune, ce qui vous coûte le plus cher. Nous vous répondons le jour même avec le format adapté, et l&apos;agenda en ligne fait le reste.
          </p>
          <Lien href={lienContact("avant")} className="r-btn r-btn--fil shrink-0">
            Décrire ma situation
          </Lien>
        </div>
      </section>

      {/* ═══ 3. comparatif ═══ */}
      <ComparerFormats />
    </>
  );
}
