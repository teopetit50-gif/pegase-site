"use client";

/* ══════════════════════════════════════════════════════════════════════
   ChoixModules — on coche ce dont on a besoin, les modules s'activent

   ORIGINE. `plan-finder-pricing-table` de @dhxwhy (21st.dev, relevé le
   23/11/2026 sur le registre) : un tableau dont la première colonne est
   une liste de cases « j'en ai besoin » ; une colonne s'éclaire, une
   phrase dit en tête ce que la sélection donne, les coches confirmées
   battent une fois.

   CE QUI EST REPRIS TEL QUEL : la bande de tête (carré d'icône de 36 px,
   phrase annoncée aux lecteurs d'écran, bouton d'effacement), la colonne
   des besoins, les colonnes éclairées (bord, voile, filet du haut), les
   rangées de groupe en capitales, les cases de 16 px, les pastilles de
   20 px, le pied d'actions, et le clavier (flèches, Début, Fin).

   CE QUI CHANGE, et pourquoi :
   1. PLUS DE PALIERS (repris le 23/11 : la première version faisait
      choisir entre « Un poste », « Trois postes » et « Tout Omega »,
      l'ancienne grille). Omega est un logiciel de gestion : les douze
      lignes sont les douze modules de l'accueil (MODULES de
      components/accueil-v3/textes), et les quatre colonnes sont ce que
      vous recevez d'après /gestion : la gestion (6 modules), les agents
      (4), les modules métier (7) et le sur-mesure.
   2. PLUSIEURS COLONNES S'ÉCLAIRENT. La source cherche UN palier, le
      moins cher ; ici chaque besoin coché allume la colonne qui le
      porte, et la phrase de tête compose votre Omega. La colonne unique
      qui glisse n'aurait plus de sens.
   3. AUCUN MONTANT : le prix est sur devis, arrêté pendant l'audit
      offert de 30 minutes. La case du prix porte le nombre de modules.
   4. DES CORPS LISIBLES. La source écrit en 9 à 11 px ; ici 11 à 13 px.
   5. À 390 px, la colonne des besoins fait 46 % (38 % au-delà), les
      mentions sous les chiffres disparaissent et le pied devient un seul
      bouton sous le tableau.
   6. Les actions sont des LIENS, pas des boutons qui appellent une
      fonction.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Check, SlidersHorizontal } from "lucide-react";
import "./essai.css";

type Colonne = { id: string; nom: string; valeur: string; suffixe: string; bouton: string; href: string };

/* les quatre colonnes d'OFFRE (components/gestion/textes), sans l'audit */
const COLONNES: Colonne[] = [
  { id: "gestion", nom: "Gestion", valeur: "6", suffixe: "modules", bouton: "Voir le logiciel", href: "/gestion" },
  { id: "agents", nom: "Agents", valeur: "4", suffixe: "agents IA", bouton: "Voir les agents", href: "/offres" },
  { id: "metiers", nom: "Métiers", valeur: "7", suffixe: "modules métier", bouton: "Voir les métiers", href: "/secteurs" },
  { id: "mesure", nom: "Sur mesure", valeur: "+", suffixe: "sur devis", bouton: "Décrire votre cas", href: "/offres/sur-mesure" },
];

type Besoin = { id: string; libelle: string; groupe: string; colonne: string };

const ligne = (libelle: string, groupe: string, colonne: string): Besoin => ({
  id: libelle.toLowerCase().replace(/[^a-zà-ÿ]+/g, "-"),
  libelle,
  groupe,
  colonne,
});

/* les douze modules de l'accueil, dans son ordre */
const BESOINS: Besoin[] = [
  ...["Ventes", "Achats", "Stock", "Banque", "Comptabilité", "Documents"].map((nom) =>
    ligne(nom, "Votre gestion", "gestion"),
  ),
  ...["Relances", "Demandes clients", "Factures fournisseurs", "Clients inactifs"].map((nom) =>
    ligne(nom, "Le travail répétitif", "agents"),
  ),
  ligne("Un module pour votre métier", "Votre métier", "metiers"),
  ligne("Une tâche qui n'existe que chez vous", "Votre métier", "mesure"),
];

const GROUPES = Array.from(new Set(BESOINS.map((besoin) => besoin.groupe)));

/** la phrase de tête : ce que la sélection compose */
function composer(choisis: Besoin[]) {
  const compte = (colonne: string) => choisis.filter((besoin) => besoin.colonne === colonne).length;
  const gestion = compte("gestion");
  const agents = compte("agents");
  const parts = [
    gestion ? `${gestion} module${gestion > 1 ? "s" : ""} de gestion` : "",
    agents ? `${agents} agent${agents > 1 ? "s" : ""}` : "",
    compte("metiers") ? "un module métier" : "",
    compte("mesure") ? "du sur-mesure" : "",
  ].filter(Boolean);
  if (parts.length === 0) return "Cochez ce dont vous avez besoin";
  const fin = parts.length > 1 ? ` et ${parts.pop()}` : "";
  return `Votre Omega : ${parts.join(", ")}${fin}`;
}

export default function ChoixModules() {
  const [coches, setCoches] = useState<string[]>([]);
  const idTitre = useId();
  const idAide = useId();

  const choisis = BESOINS.filter((besoin) => coches.includes(besoin.id));
  const allumee = (colonne: string) => choisis.some((besoin) => besoin.colonne === colonne);

  const basculer = (id: string) =>
    setCoches((avant) => (avant.includes(id) ? avant.filter((autre) => autre !== id) : [...avant, id]));

  const auClavier = (event: KeyboardEvent<HTMLInputElement>) => {
    const sens = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!sens && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const cases = Array.from(
      event.currentTarget.closest("table")?.querySelectorAll<HTMLInputElement>("input[data-besoin]") ?? [],
    );
    const ici = cases.indexOf(event.currentTarget);
    const suivant =
      event.key === "Home" ? 0 : event.key === "End" ? cases.length - 1 : (ici + sens + cases.length) % cases.length;
    cases[suivant]?.focus();
  };

  return (
    <div className="eb mx-auto w-full max-w-[820px]">
      <div className="eb-blanc eb-trait w-full min-w-0 rounded-2xl border shadow-sm">
        {/* ── la phrase ── */}
        <div className="eb-trait flex min-h-[68px] items-center gap-3 border-b px-4 py-3">
          <span aria-hidden="true" className="eb-plein flex size-9 shrink-0 items-center justify-center rounded-xl">
            <SlidersHorizontal className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p id={idTitre} role="status" aria-live="polite" aria-atomic="true" className="m-0 text-[15px] leading-5 font-semibold">
              {composer(choisis)}
            </p>
            <p id={idAide} className="eb-doux m-0 mt-0.5 text-[13px] leading-4">
              Le prix est sur devis : il est arrêté pendant l&apos;audit offert de 30&nbsp;minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCoches([])}
            disabled={coches.length === 0}
            className="eb-efface cursor-pointer rounded-md border-0 bg-transparent px-2 py-2 text-[13px] disabled:pointer-events-none disabled:opacity-30"
          >
            Effacer
          </button>
        </div>

        {/* ── le tableau ── */}
        <div className="eb-tableau relative isolate overflow-hidden rounded-b-2xl">
          {COLONNES.map((colonne, rang) => (
            <div
              key={colonne.id}
              aria-hidden="true"
              style={{
                left: `calc(var(--eb-col) + ${rang} * (100% - var(--eb-col)) / ${COLONNES.length})`,
                width: `calc((100% - var(--eb-col)) / ${COLONNES.length})`,
                opacity: allumee(colonne.id) ? 1 : 0,
              }}
              className="eb-phare pointer-events-none absolute inset-y-0 z-0 border-x transition-opacity duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            >
              <div className="eb-phare-haut h-0.5" />
              <div className="eb-phare-voile h-28" />
            </div>
          ))}

          <table className="relative z-10 w-full table-fixed border-collapse text-[13px]" aria-labelledby={idTitre}>
            <colgroup>
              <col className="eb-col-besoin" />
              {COLONNES.map((colonne) => (
                <col key={colonne.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="px-4 pt-3 pb-3 text-left align-bottom font-normal">
                  <span className="block text-sm font-semibold">J&apos;en ai besoin</span>
                  <span className="eb-doux mt-1 block text-xs">
                    {coches.length} {coches.length > 1 ? "cochés" : "coché"}
                  </span>
                </th>
                {COLONNES.map((colonne) => (
                  <th key={colonne.id} scope="col" className="px-1 pt-3 pb-3 text-center align-bottom font-normal">
                    <span className="block text-[11px] leading-[1.2] font-semibold sm:text-sm">{colonne.nom}</span>
                    <span className="mt-1 block">
                      <span className="block text-[22px] leading-8 font-medium tracking-tighter sm:text-[28px]">
                        {colonne.valeur}
                      </span>
                      <span className="eb-doux hidden text-[11px] leading-[1.2] sm:block">{colonne.suffixe}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {GROUPES.map((groupe) => (
              <tbody key={groupe}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={COLONNES.length + 1}
                    className="eb-trait eb-voile eb-doux h-8 border-y px-4 text-left text-[11px] font-medium tracking-[0.14em] uppercase"
                  >
                    {groupe}
                  </th>
                </tr>
                {BESOINS.filter((besoin) => besoin.groupe === groupe).map((besoin) => {
                  const coche = coches.includes(besoin.id);
                  return (
                    <tr key={besoin.id} className="eb-rangee">
                      <th scope="row" className="px-2 text-left font-normal sm:px-3">
                        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-1 py-1.5">
                          <input
                            type="checkbox"
                            data-besoin={besoin.id}
                            checked={coche}
                            aria-describedby={idAide}
                            onChange={() => basculer(besoin.id)}
                            onKeyDown={auClavier}
                            className="eb-case-saisie sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`eb-case flex size-4 shrink-0 items-center justify-center rounded-[5px] border ${coche ? "eb-case-pleine" : "eb-case-vide"}`}
                          >
                            {coche && <Check className="size-3" strokeWidth={2.5} />}
                          </span>
                          <span className={`leading-[1.3] ${coche ? "eb-encre font-medium" : "eb-texte"}`}>
                            {besoin.libelle}
                          </span>
                        </label>
                      </th>
                      {COLONNES.map((colonne) => {
                        const porte = colonne.id === besoin.colonne;
                        const confirme = porte && coche;
                        return (
                          <td key={colonne.id} className="px-1 text-center">
                            {porte ? (
                              <span
                                key={`${besoin.id}-${confirme}`}
                                className={`inline-flex size-5 items-center justify-center rounded-full ${confirme ? "eb-plein eb-anim-confirme" : "eb-pale"}`}
                              >
                                <Check aria-hidden="true" className="size-3" strokeWidth={2} />
                                <span className="sr-only">{`Porté par ${colonne.nom}`}</span>
                              </span>
                            ) : (
                              <span aria-hidden="true" className="eb-point inline-block size-1 rounded-full opacity-40" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            ))}

            <tfoot className="hidden sm:table-footer-group">
              <tr className="eb-trait border-t">
                <th scope="row" className="eb-doux px-4 text-left text-xs font-normal">
                  La suite <ArrowUpRight aria-hidden="true" className="ml-1 inline size-3" />
                </th>
                {COLONNES.map((colonne) => (
                  <td key={colonne.id} className="px-1.5 py-2.5">
                    <Link
                      href={colonne.href}
                      className={`flex min-h-9 w-full items-center justify-center rounded-lg px-1 text-center text-xs leading-[1.2] font-medium ${
                        allumee(colonne.id) ? "eb-plein" : "eb-action"
                      }`}
                    >
                      {colonne.bouton}
                    </Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* l'audit : le seul endroit où le prix se dit */}
      <Link
        href="/reserver-un-audit"
        className="eb-plein mt-3 flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium sm:mx-auto sm:w-auto sm:max-w-max sm:px-6"
      >
        Réserver un audit offert
      </Link>
    </div>
  );
}
