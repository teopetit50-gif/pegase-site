import Link from "next/link";
import { Check } from "lucide-react";
import { Fragment, type ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════
   comparator-1 — le comparatif de plans en carte (14/09/2026)

   Reprise du bloc « Comparator one » de Tailark (Méschac Irung, publié
   sur 21st.dev ; source publique : github.com/tailark/blocks,
   registry/bases/radix/veil/blocks/comparator/one.tsx). Une carte cernée
   aux coins arrondis, quatre colonnes — le libellé, puis un plan par
   colonne — une tête avec le nom et le prix, la colonne phare teintée
   sur toute la hauteur, des coches pour ce qui est compris, et un pied
   qui porte un bouton par plan.

   Quatre écarts assumés :
   1. UN VRAI <table>, pas la grille de <div> de l'original : un lecteur
      d'écran y trouve les en-têtes de colonne et de ligne (scope), et le
      rendu est le même au pixel — colgroup 40 / 20 / 20 / 20 comme
      `grid-cols-4` avec le libellé en première colonne.
   2. Des RANGS DE FAMILLE (colSpan) qui regroupent les lignes : le
      comparatif d'Omega en a trois, l'original n'en groupe aucune.
   3. Sous le libellé, la ligne d'aide de Teo (masquée sous 768 px) :
      l'original n'a que le libellé.
   4. Les boutons sont ceux du site (`r-btn`) ; `font-serif` devient la
      Jakarta des titres, `bg-primary/5` un voile d'encre à 4 %.
   Sous 768 px, l'original fait DÉFILER la carte (table à largeur
   minimale dans un `overflow-auto`). Pas ici, et ce n'est pas un goût :
   sur un téléphone — et dans l'émulation mobile de Chrome — la largeur
   minimale d'un tableau remonte jusqu'au document malgré `overflow:
   auto`, et la fenêtre de mise en page s'élargit à sa mesure (529 px
   mesurés pour 390 de large : tout le site défilait latéralement, l'entête
   fixe débordait). Ni `contain: inline-size`, ni `width: 0; min-width:
   100%` sur le conteneur, ni un tableau à disposition fixe n'y changent
   rien — seule la largeur minimale du CONTENU compte. D'où une SECONDE
   table, à trois colonnes, servie sous `md` : le libellé passe en rang
   plein largeur, l'aide s'efface, les trois valeurs suivent — c'est la
   règle que le comparatif de la page audit posait déjà le 05/09. La
   première table est `hidden` sous `md` : masquée, elle ne pèse plus
   dans la largeur minimale du document.
   ══════════════════════════════════════════════════════════════════════ */

export type PlanComparatif = {
  id: string;
  nom: string;
  /* le grand chiffre et sa suite (« par mois ») — déjà mis en forme */
  prix: ReactNode;
  periode: string;
  href: string;
  cta: string;
  /* filet ou noir — la classe r-btn du site */
  bouton: "r-btn--noir" | "r-btn--fil";
  phare?: boolean;
};

export type FamilleComparatif = {
  titre: string;
  lignes: { libelle: string; aide?: string; valeurs: string[] }[];
};

/* la valeur qui vaut coche : « Compris » (et ses accords) */
const estCoche = (v: string) => /^compris(e|es)?$/i.test(v.trim());

export function Comparator({
  plans,
  familles,
  className = "",
}: {
  plans: PlanComparatif[];
  familles: FamilleComparatif[];
  className?: string;
}) {
  const voile = (p: PlanComparatif) => (p.phare ? "bg-neutral-900/[0.04]" : "");
  return (
    <>
      {/* ——— dès 768 px : la carte à quatre colonnes de l'original ——— */}
      <div
        className={`hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block ${className}`}
      >
        <table className="w-full border-collapse text-left">
          <colgroup>
            <col className="w-[40%]" />
            {plans.map((p) => (
              <col key={p.id} className="w-[20%]" />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-200">
              <td className="p-4" />
              {plans.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={`border-l border-neutral-200 p-4 text-center font-normal ${voile(p)}`}
                >
                  <p className="font-medium text-neutral-900">{p.nom}</p>
                  <p className="mt-1">
                    <span className="font-[family-name:var(--font-jakarta)] text-2xl font-medium tabular-nums text-neutral-900">
                      {p.prix}
                    </span>
                    <span className="text-sm text-neutral-500"> {p.periode}</span>
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {familles.map((f) => (
              <FamilleRangs key={f.titre} famille={f} plans={plans} voile={voile} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200">
              <td className="p-4" />
              {plans.map((p) => (
                <td key={p.id} className={`border-l border-neutral-200 p-4 ${voile(p)}`}>
                  <Link href={p.href} className={`r-btn w-full !py-2 !text-[14px] ${p.bouton}`}>
                    {p.cta}
                  </Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ——— sous 768 px : trois colonnes, le libellé en rang plein ——— */}
      <div
        className={`overflow-hidden rounded-xl border border-neutral-200 bg-white md:hidden ${className}`}
      >
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-neutral-200">
              {plans.map((p, i) => (
                <th
                  key={p.id}
                  scope="col"
                  className={`p-3 text-center font-normal ${i > 0 ? "border-l border-neutral-200" : ""} ${voile(p)}`}
                >
                  <p className="text-[13px] font-medium leading-[18px] text-neutral-900">{p.nom}</p>
                  <p className="mt-0.5 text-[12px] leading-[16px] text-neutral-500">
                    <span className="font-medium tabular-nums text-neutral-900">{p.prix}</span> {p.periode}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {familles.map((f) => (
              <FamilleRangsMobile key={f.titre} famille={f} plans={plans} voile={voile} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200">
              {plans.map((p, i) => (
                <td
                  key={p.id}
                  className={`p-2 ${i > 0 ? "border-l border-neutral-200" : ""} ${voile(p)}`}
                >
                  <Link
                    href={p.href}
                    className={`r-btn w-full !px-2 !py-2 !text-[12px] !leading-[16px] ${p.bouton}`}
                  >
                    {p.cta}
                  </Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

/* une cellule de valeur : la coche pour « Compris », le texte sinon */
function Valeur({ v }: { v: string }) {
  return estCoche(v) ? (
    <>
      <Check aria-hidden className="mx-auto size-4" />
      <span className="sr-only">{v}</span>
    </>
  ) : (
    <>{v}</>
  );
}

function FamilleRangs({
  famille,
  plans,
  voile,
}: {
  famille: FamilleComparatif;
  plans: PlanComparatif[];
  voile: (p: PlanComparatif) => string;
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={plans.length + 1}
          className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[13px] font-semibold text-neutral-900"
        >
          {famille.titre}
        </th>
      </tr>
      {famille.lignes.map((l) => (
        <tr key={l.libelle} className="border-b border-neutral-200 last:border-b-0">
          <th scope="row" className="p-4 text-left align-top text-sm font-normal">
            <span className="block font-medium text-neutral-900">{l.libelle}</span>
            {l.aide ? (
              <span className="mt-0.5 block max-w-[42ch] text-[13px] leading-[19px] text-neutral-500">
                {l.aide}
              </span>
            ) : null}
          </th>
          {l.valeurs.map((v, i) => (
            <td
              key={plans[i]?.id ?? i}
              className={`border-l border-neutral-200 p-4 text-center text-sm text-neutral-900 ${voile(plans[i])}`}
            >
              <Valeur v={v} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function FamilleRangsMobile({
  famille,
  plans,
  voile,
}: {
  famille: FamilleComparatif;
  plans: PlanComparatif[];
  voile: (p: PlanComparatif) => string;
}) {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={plans.length}
          className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-[12px] font-semibold text-neutral-900"
        >
          {famille.titre}
        </th>
      </tr>
      {famille.lignes.map((l) => (
        <Fragment key={l.libelle}>
          <tr>
            <th
              scope="rowgroup"
              colSpan={plans.length}
              className="px-3 pb-1 pt-3 text-left text-[13px] font-medium leading-[18px] text-neutral-900"
            >
              {l.libelle}
            </th>
          </tr>
          <tr className="border-b border-neutral-200">
            {l.valeurs.map((v, i) => (
              <td
                key={plans[i]?.id ?? i}
                className={`px-2 pb-3 pt-1 text-center align-top text-[12px] leading-[17px] text-neutral-900 ${i > 0 ? "border-l border-neutral-200" : ""} ${voile(plans[i])}`}
              >
                <Valeur v={v} />
              </td>
            ))}
          </tr>
        </Fragment>
      ))}
    </>
  );
}
