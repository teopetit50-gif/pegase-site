/* ══════════════════════════════════════════════════════════════════════
   Lorani sur le gabarit Nivara — Questions.tsx (09/11/2026)
   Les questions fréquentes de la page actuelle, dans les briques de la
   référence : la grille de douze de « Every stage, in house » (h2
   `font-display text-h3` sur 4, chapô `font-statement text-h4` sur 7 à
   partir de la 6e) puis ses deux colonnes d'accordéons (`mt-14 gap-12
   m:gap-8 l:gap-16`), neuf questions par colonne. Le panneau garde le
   `pb-6` et le `text-graphite` du panneau de la référence, sans image ;
   sa largeur est portée de 34 à 52 caractères pour des réponses de
   plusieurs lignes.
   ══════════════════════════════════════════════════════════════════════ */
import { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";
import Accordeon, { type Rang } from "./Accordeon";
import { QUESTIONS } from "./textes";

const rang = (q: { q: string; r: string }): Rang => ({
  titre: q.q,
  contenu: <p className="max-w-[52ch] pb-6 text-graphite">{q.r}</p>,
});

export default function Questions() {
  const moitie = Math.ceil(QUESTIONS.liste.length / 2);
  return (
    <section
      data-monde="clair"
      aria-labelledby="questions-title"
      className="mx-auto w-full max-w-[1600px] px-4 pt-28 min-[810px]:px-8 min-[810px]:pt-40"
    >
      <GroupeApparition retard={700} className="grid gap-6 min-[810px]:grid-cols-12">
        <h2 id="questions-title" className="font-display text-h3 min-[810px]:col-span-4">
          <MotsApparition texte={QUESTIONS.titre} />
        </h2>
        <p className="max-w-[40ch] font-statement text-h4 min-[810px]:col-span-7 min-[810px]:col-start-6">
          <MotsApparition texte={QUESTIONS.sous} depart={200} />
        </p>
      </GroupeApparition>
      <div className="mt-14 grid gap-12 min-[810px]:grid-cols-2 min-[810px]:gap-8 min-[1200px]:gap-16">
        <Accordeon intertitre="01 — 09" rangs={QUESTIONS.liste.slice(0, moitie).map(rang)} />
        <Accordeon intertitre="10 — 18" rangs={QUESTIONS.liste.slice(moitie).map(rang)} />
      </div>
    </section>
  );
}
