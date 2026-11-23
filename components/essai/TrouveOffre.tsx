"use client";

/* ══════════════════════════════════════════════════════════════════════
   TrouveOffre — on coche ses besoins, le palier se désigne

   ORIGINE. `plan-finder-pricing-table` de @dhxwhy (21st.dev, relevé le
   23/11/2026 sur le registre) : un tableau où la première colonne est
   une liste de cases « j'en ai besoin » ; une colonne éclairée glisse
   (380 ms) vers le plus petit palier qui couvre tout ce qui est coché,
   une phrase le dit en tête, les coches confirmées battent une fois.

   CE QUI EST REPRIS TEL QUEL : la bande de tête (carré d'icône de 36 px,
   phrase annoncée aux lecteurs d'écran, bouton d'effacement), la colonne
   des besoins à 38 %, la colonne éclairée et sa courbe, les rangées de
   groupe en capitales, les cases de 16 px, les pastilles de 20 px, le
   pied d'actions, et le clavier (flèches, Début, Fin entre les cases).

   CE QUI CHANGE, et pourquoi :
   1. AUCUN MONTANT. La source affiche un prix par palier et cherche « le
      moins cher ». Chez Omega le tarif est arrêté à l'audit : la case du
      prix porte le NOMBRE DE POSTES du palier, et le bloc cherche le
      plus petit palier qui couvre la sélection.
   2. « AU CHOIX » N'EST PAS UNE MATRICE. Un poste parmi quatre, trois
      parmi quatre : la source croise chaque besoin avec chaque palier ;
      ici un palier couvre la sélection si le NOMBRE de postes cochés
      tient dans sa capacité, et seul « Sur mesure » couvre une tâche
      hors liste. Les noms des postes viennent de lib/paliers.
   3. DES CORPS LISIBLES. La source écrit en 9 à 11 px ; ici 11 à 13 px,
      le plancher des interfaces du site.
   4. À 390 px, QUATRE COLONNES DE 48 px ne portent ni « au choix » ni un
      bouton : sous 640 px les mentions disparaissent (la coche reste) et
      le pied devient un seul bouton sous le tableau.
   5. Les actions sont des LIENS (vers l'audit, vers le sur-mesure), pas
      des boutons qui appellent une fonction.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Check, SlidersHorizontal, X } from "lucide-react";
import { POSTES } from "@/lib/paliers";
import "./essai.css";

type Palier = {
  id: string;
  nom: string;
  /** combien de postes de la liste ce palier porte */
  capacite: number;
  horsListe: boolean;
  chiffre: string;
  unite: string;
  bouton: string;
  href: string;
};

/* les noms sont ceux de /tarifs (lib/paliers) ; l'ordre va du plus petit au plus large */
const PALIERS: Palier[] = [
  { id: "un", nom: "Un poste", capacite: 1, horsListe: false, chiffre: "1", unite: "poste", bouton: "Réserver un audit", href: "/reserver-un-audit" },
  { id: "trois", nom: "Trois postes", capacite: 3, horsListe: false, chiffre: "3", unite: "postes", bouton: "Réserver un audit", href: "/reserver-un-audit" },
  { id: "complet", nom: "Tout Omega", capacite: 4, horsListe: false, chiffre: "4", unite: "postes", bouton: "Réserver un audit", href: "/reserver-un-audit" },
  { id: "mesure", nom: "Sur mesure", capacite: 4, horsListe: true, chiffre: "+", unite: "hors liste", bouton: "Décrire votre cas", href: "/offres/sur-mesure" },
];

type Besoin = { id: string; libelle: string; code?: string; groupe: string; horsListe: boolean };

const LIBELLES: Record<string, string> = {
  cashd: "Relancer devis et factures",
  frontd: "Répondre aux demandes clients",
  reload: "Recontacter les clients inactifs",
  filed: "Traiter les factures fournisseurs",
};

const BESOINS: Besoin[] = [
  ...POSTES.map((poste) => ({
    id: poste.id,
    libelle: LIBELLES[poste.id],
    code: poste.system,
    groupe: "Les quatre postes",
    horsListe: false,
  })),
  { id: "hors-liste", libelle: "Une tâche propre à votre métier", groupe: "Hors liste", horsListe: true },
];

const GROUPES = Array.from(new Set(BESOINS.map((besoin) => besoin.groupe)));

/** ce que la case dit : vrai, faux, ou une mention courte */
function mention(besoin: Besoin, palier: Palier): boolean | string {
  if (besoin.horsListe) return palier.horsListe;
  if (palier.horsListe) return "sur devis";
  if (palier.capacite >= POSTES.length) return true;
  return `${palier.capacite} au choix`;
}

function couvre(palier: Palier, choisis: Besoin[]) {
  const postes = choisis.filter((besoin) => !besoin.horsListe).length;
  const horsListe = choisis.some((besoin) => besoin.horsListe);
  return postes <= palier.capacite && (!horsListe || palier.horsListe);
}

export default function TrouveOffre() {
  const [coches, setCoches] = useState<string[]>([]);
  const idTitre = useId();
  const idAide = useId();

  const choisis = BESOINS.filter((besoin) => coches.includes(besoin.id));
  const meilleur = choisis.length ? (PALIERS.find((palier) => couvre(palier, choisis)) ?? null) : null;
  const rang = meilleur ? PALIERS.indexOf(meilleur) : 0;

  const phrase =
    choisis.length === 0
      ? "Cochez ce que vous voulez confier à Omega"
      : meilleur
        ? `« ${meilleur.nom} » couvre ${choisis.length === 1 ? "votre besoin" : `vos ${choisis.length} besoins`}`
        : "Parlons-en à l'audit";

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
              {phrase}
            </p>
            <p id={idAide} className="eb-doux m-0 mt-0.5 text-[13px] leading-4">
              Le plus petit palier qui couvre tout. Le montant, lui, est écrit à l&apos;audit.
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
        <div className="relative isolate overflow-hidden rounded-b-2xl">
          <div
            aria-hidden="true"
            style={{
              left: "38%",
              width: `${62 / PALIERS.length}%`,
              transform: `translateX(${rang * 100}%)`,
              opacity: meilleur ? 1 : 0,
            }}
            className="eb-phare pointer-events-none absolute inset-y-0 z-0 border-x transition-[transform,opacity] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          >
            <div className="eb-phare-haut h-0.5" />
            <div className="eb-phare-voile h-28" />
          </div>

          <table
            className="relative z-10 w-full table-fixed border-collapse text-[13px]"
            aria-labelledby={idTitre}
          >
            <colgroup>
              <col style={{ width: "38%" }} />
              {PALIERS.map((palier) => (
                <col key={palier.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="px-4 pt-2 pb-3 text-left align-bottom font-normal">
                  <span className="block text-sm font-semibold">J&apos;en ai besoin</span>
                  <span className="eb-doux mt-1 block text-xs">
                    {coches.length} {coches.length > 1 ? "cochés" : "coché"}
                  </span>
                </th>
                {PALIERS.map((palier) => (
                  <th key={palier.id} scope="col" className="px-1 pt-2 pb-3 text-center align-bottom font-normal">
                    <div className="mb-1 flex h-5 items-center justify-center">
                      <span
                        className={`eb-plein rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider whitespace-nowrap uppercase ${meilleur?.id === palier.id ? "visible" : "invisible"}`}
                      >
                        <span className="hidden sm:inline">Le bon </span>palier
                      </span>
                    </div>
                    <span className="block text-[11px] leading-[1.2] font-semibold sm:text-sm">{palier.nom}</span>
                    <span className="mt-1 block whitespace-nowrap">
                      <span className="text-[22px] leading-8 font-medium tracking-tighter sm:text-[28px]">
                        {palier.chiffre}
                      </span>
                      <span className="eb-doux ml-1 hidden text-[11px] sm:inline">{palier.unite}</span>
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
                    colSpan={PALIERS.length + 1}
                    className="eb-trait eb-voile eb-doux h-8 border-y px-4 text-left text-[11px] font-medium tracking-[0.14em] uppercase"
                  >
                    {groupe}
                  </th>
                </tr>
                {BESOINS.filter((besoin) => besoin.groupe === groupe).map((besoin) => {
                  const coche = coches.includes(besoin.id);
                  return (
                    <tr key={besoin.id} className="eb-rangee">
                      <th scope="row" className="px-3 text-left font-normal">
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 py-1.5">
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
                            {besoin.code && <span className="eb-pale ml-1.5 hidden text-[11px] md:inline">{besoin.code}</span>}
                          </span>
                        </label>
                      </th>
                      {PALIERS.map((palier) => {
                        const valeur = mention(besoin, palier);
                        const disponible = valeur !== false;
                        const confirme = coche && disponible && couvre(palier, choisis);
                        const manque = coche && !confirme;
                        return (
                          <td
                            key={palier.id}
                            className={`px-1 text-center transition-opacity duration-200 ${manque ? "opacity-35" : "opacity-100"}`}
                          >
                            <span className="inline-flex max-w-full flex-col items-center justify-center gap-0.5 py-1">
                              <span
                                key={`${besoin.id}-${confirme}`}
                                aria-hidden="true"
                                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                                  confirme ? "eb-plein eb-anim-confirme" : disponible ? "eb-doux" : "eb-pale"
                                }`}
                              >
                                {disponible ? <Check className="size-3" strokeWidth={2} /> : <X className="size-3" />}
                              </span>
                              {typeof valeur === "string" && (
                                <span className="eb-doux hidden text-[11px] leading-3 whitespace-nowrap sm:block">{valeur}</span>
                              )}
                              <span className="sr-only">
                                {disponible ? (typeof valeur === "string" ? `Compris, ${valeur}` : "Compris") : "Non compris"}
                              </span>
                            </span>
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
                {PALIERS.map((palier) => (
                  <td key={palier.id} className="px-1.5 py-2.5">
                    <Link
                      href={palier.href}
                      aria-label={`${palier.bouton} : ${palier.nom}`}
                      className={`flex min-h-9 w-full items-center justify-center rounded-lg px-1 text-center text-xs leading-[1.2] font-medium ${
                        meilleur?.id === palier.id ? "eb-plein" : "eb-action"
                      }`}
                    >
                      {palier.bouton}
                    </Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* sous 640 px : un seul bouton, celui du palier désigné */}
      <Link
        href={(meilleur ?? PALIERS[0]).href}
        className="eb-plein mt-3 flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-medium sm:hidden"
      >
        {(meilleur ?? PALIERS[0]).bouton}
      </Link>
    </div>
  );
}
