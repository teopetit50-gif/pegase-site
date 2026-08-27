import { COMPLEMENTS } from "@/lib/reservation";

/* ══════════════════════════════════════════════════════════════════════
   <Complements> — « Compléter votre audit », bande sombre.

   Refait le 04/08 (Teo : « trop amateur », avec demande de chercher des
   exemples sur 21st.dev). Ce qui n'allait pas dans la version d'avant :
   deux boîtes rectangulaires contenant un titre, un paragraphe et une
   ligne de conditions collée en bas sans séparation. Aucun repère visuel,
   aucune hiérarchie, et le prix — l'information qu'on cherche sur un
   complément — se confondait avec le corps du texte.

   Ce que le catalogue 21st.dev donne comme leçon sur les blocs « features »
   (Feature Modern de brijr, Features 8 de Méschac Irung) : un pictogramme
   en tête qui donne un point d'accroche à l'œil, et une SÉPARATION nette
   entre la description et la condition commerciale. Les patterns ne sont
   pas collés — ils sont dark-shadcn et n'iraient pas — mais la structure
   est reprise.

   Deux écarts assumés par rapport à ces patterns —

   · RANGÉES, pas cartes. Ce sont deux options d'un catalogue, pas deux
     produits concurrents. En rangées pleine largeur, le texte respire au
     lieu d'être comprimé dans une colonne étroite, et les deux blocs
     cessent de se disputer l'attention comme le faisaient les cartes.

   · La condition est SORTIE du corps de texte et posée sur une pastille,
     à droite sur grand écran. C'est ce qu'on vient chercher : combien, et
     est-ce déjà compris.
   ══════════════════════════════════════════════════════════════════════ */

const TRAIT = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* Un pictogramme par complément, dans l'ordre de COMPLEMENTS : l'atelier
   (des personnes autour d'une table) et la cartographie (un relevé de
   nœuds reliés). Traits fins, même grille de 24 que le reste du site. */
const ICONES = [
  <svg key="atelier" viewBox="0 0 24 24" {...TRAIT} aria-hidden>
    <circle cx="9" cy="8" r="2.6" />
    <circle cx="16.5" cy="9.5" r="2" />
    <path d="M3.5 18.5c0-2.8 2.5-4.6 5.5-4.6s5.5 1.8 5.5 4.6" />
    <path d="M16 14.2c2.4.2 4.5 1.8 4.5 4.3" />
  </svg>,
  <svg key="carto" viewBox="0 0 24 24" {...TRAIT} aria-hidden>
    <rect x="3.5" y="3.5" width="6" height="5" rx="1.4" />
    <rect x="14.5" y="3.5" width="6" height="5" rx="1.4" />
    <rect x="9" y="15.5" width="6" height="5" rx="1.4" />
    <path d="M6.5 8.5v3.2h11V8.5" />
    <path d="M12 11.7v3.8" />
  </svg>,
];

export default function Complements() {
  return (
    <div className="mt-10 grid gap-4">
      {COMPLEMENTS.map((c, i) => (
        <div
          key={c.titre}
          data-reveal
          className="rounded-2xl border border-[#27272a] bg-[#141417] p-7 transition-colors hover:border-[#3f3f46] sm:p-9"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex min-w-0 flex-1 gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#2f2f35] text-[#a1a1aa] [&>svg]:h-[22px] [&>svg]:w-[22px]">
                {ICONES[i]}
              </span>
              <div className="min-w-0">
                <h3 className="r-h4">{c.titre}</h3>
                <p className="mt-3 text-[15px] leading-[24px] text-[#d4d4d8]">{c.texte}</p>
              </div>
            </div>

            {/* La condition, sortie du texte : c'est l'information qu'on
                vient chercher sur un complément. Filet au-dessus sur petit
                écran (elle passe dessous), filet à gauche sur grand. */}
            <div className="shrink-0 border-t border-[#27272a] pt-5 lg:w-56 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#71717a]">
                Conditions
              </p>
              <p className="mt-2.5 text-[14px] leading-[22px] text-[#d4d4d8]">{c.conditions}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
