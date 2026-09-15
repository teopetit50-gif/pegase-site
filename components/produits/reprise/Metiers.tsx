"use client";

import { useRef, useState } from "react";
import { HardHat, PackageCheck, Wrench, Snowflake, Briefcase } from "lucide-react";
import { METIERS as M } from "@/lib/produits/reprise";
import { Cadre, TitreSection } from "./Cadre";
import { cn } from "./cn";

/** Sélecteur de métier : une piste d'onglets, un panneau à trois blocs.
 *
 *  ÉCART ASSUMÉ, décidé par Teo le 10/09/2026. La référence met ici un
 *  carrousel de quatre témoignages, et la version précédente de ce fichier en
 *  gardait la géométrie avec des cartes de métier. On abandonne cette
 *  géométrie au profit d'onglets, pour une raison de fond : un carrousel fait
 *  défiler des cas devant un visiteur, des onglets lui laissent choisir le
 *  sien. La section ne sert plus à illustrer, elle sert à ce que chacun se
 *  reconnaisse — et elle peut porter trois blocs par métier là où une carte de
 *  carrousel n'en portait qu'un.
 *
 *  Le troisième bloc — « ce qui reste chez vous » — est celui qui rend les
 *  deux autres croyables. Ne pas le retirer en croyant alléger : une section
 *  qui ne coche que des cases se lit comme un argumentaire.
 *
 *  Onglets natifs plutôt qu'une dépendance : rôles ARIA, sélection au clic,
 *  navigation aux flèches, et un seul onglet dans l'ordre de tabulation.
 *
 *  DEUX PIÈGES DE PALETTE, corrigés le 10/09/2026 après « le bouton pour
 *  sélectionner est trop peu visible ». Ne pas les réintroduire :
 *
 *  1. La carte (#f1f1f1) sur un fond #f5f5f5 ne se voit pas, et `muted` vaut
 *     EXACTEMENT le fond. Un état sélectionné peint avec l'un ou l'autre est
 *     invisible en clair. Le jeton prévu pour marquer une sélection dans cette
 *     palette est l'accent (#e6e6e6) — plus la barre pleine en couleur de
 *     texte (#0a0a0a), qui reprend la langue de l'ancien carrousel où la
 *     pastille active était déjà pleine.
 *  2. Tailwind v4 met `cursor: default` sur les `<button>`. Sans
 *     `cursor-pointer` explicite, une piste d'onglets ne se signale pas au
 *     survol et se lit comme du texte décoratif.
 */
/* Recentrage du 15/09/2026 : les deux secteurs « marchés publics » ont sauté
 *  avec la moitié PUBLIQ. Building2 (le Bâtiment vu comme répondant à un
 *  appel d'offres) laisse la place à PackageCheck, qui porte le Négoce — le
 *  compte qui espace ses commandes puis s'arrête. Le Bâtiment reste, sous son
 *  casque, mais il y parle de chantiers réceptionnés.
 *  À 16 px et strokeWidth 1.75, Smartphone n'aurait été qu'un rectangle
 *  arrondi : dans une piste de cinq onglets il ne se distingue pas. */
const ICONES = {
  atelier: Wrench,
  negoce: PackageCheck,
  froid: Snowflake,
  chantier: HardHat,
  bureau: Briefcase,
} as const;

export function Metiers() {
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);

  /* Flèches, Origine et Fin : le motif attendu d'une piste d'onglets. Le
     focus suit la sélection, ce qui est le comportement correct quand le
     panneau s'affiche immédiatement. */
  const auClavier = (e: React.KeyboardEvent) => {
    const n = M.secteurs.length;
    const cible =
      e.key === "ArrowRight" ? (actif + 1) % n
      : e.key === "ArrowLeft" ? (actif - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (cible === null) return;
    e.preventDefault();
    setActif(cible);
    onglets.current[cible]?.focus();
  };

  const s = M.secteurs[actif];
  const Icone = ICONES[s.icone];

  return (
    <section id="metiers" data-monde="clair" className="scroll-mt-20">
      <Cadre className="relative w-full">
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 border-[#d9d9d9] border-b px-6 py-12 md:px-16 md:py-16">
            <TitreSection titre={M.titre} suite={M.suite} />
          </div>

          <div className="mx-6 border-[#d9d9d9] border-r border-l md:mx-16">
            {/* La piste défile horizontalement sous sm : cinq intitulés ne
                tiennent pas à 390, et les faire passer à la ligne casse les
                filets verticaux qui séparent les onglets. */}
            <div
              role="tablist"
              aria-label="Métiers concernés"
              onKeyDown={auClavier}
              className="flex divide-x divide-dashed divide-[#d9d9d9] overflow-x-auto border-[#d9d9d9] border-t border-b border-dashed"
            >
              {M.secteurs.map((m, i) => {
                const IconeOnglet = ICONES[m.icone];
                return (
                  <button
                    key={m.cle}
                    ref={(el) => { onglets.current[i] = el; }}
                    type="button"
                    role="tab"
                    id={`onglet-${m.cle}`}
                    aria-selected={i === actif}
                    aria-controls={`panneau-${m.cle}`}
                    tabIndex={i === actif ? 0 : -1}
                    onClick={() => setActif(i)}
                    className={cn(
                      "relative flex shrink-0 cursor-pointer items-center gap-2 px-5 py-4 text-sm transition-colors",
                      i === actif
                        ? "bg-[#e6e6e6] font-medium text-[#0a0a0a]"
                        : "text-[#737373] hover:bg-[#e6e6e6]/60 hover:text-[#0a0a0a]",
                    )}
                  >
                    <IconeOnglet
                      className="size-4 shrink-0 opacity-70"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    {m.nom}
                    {i === actif && (
                      <span
                        aria-hidden="true"
                        className="-bottom-px absolute inset-x-0 h-0.5 bg-[#0a0a0a]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              role="tabpanel"
              id={`panneau-${s.cle}`}
              aria-labelledby={`onglet-${s.cle}`}
              tabIndex={0}
            >
              <div className="flex items-center gap-3 border-[#d9d9d9] border-b border-dashed px-6 py-5">
                {/* ex-`bg-muted` : chez la référence, EXACTEMENT le fond. */}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
                  <Icone
                    className="size-4.5 text-[#0a0a0a]/70"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </span>
                <span className="font-medium text-sm">{s.secteur}</span>
              </div>

              {/* Trois colonnes à partir de lg, empilées en dessous : les
                  filets pointillés changent d'axe, comme partout ailleurs sur
                  le site. */}
              <div className="flex flex-col divide-y divide-dashed divide-[#d9d9d9] lg:flex-row lg:divide-x lg:divide-y-0">
                {[
                  { titre: M.blocs.echappe, texte: s.echappe },
                  { titre: M.blocs.cherche, texte: s.cherche },
                  { titre: M.blocs.reste, texte: s.reste },
                ].map((b) => (
                  <div key={b.titre} className="flex flex-col gap-2 p-6 lg:flex-1">
                    <span className="text-[#737373] text-xs uppercase tracking-wide">
                      {b.titre}
                    </span>
                    <p className="text-base text-[#0a0a0a]/90 max-sm:text-[15px] max-sm:leading-[1.5]">
                      {b.texte}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Respiration en pied de cadre, à la place des puces du carrousel. */}
          <div className="h-6" />
        </div>
      </Cadre>
    </section>
  );
}
