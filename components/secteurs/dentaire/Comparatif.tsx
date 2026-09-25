/* ══════════════════════════════════════════════════════════════════════
   « Ni un logiciel, ni une assistante de plus. » — le tableau qui compare
   Tiroma à trois CATÉGORIES d'outils (logiciel de cabinet, agenda en
   ligne, assistante seule), sans viser un éditeur. Aucun prix : la ligne
   « Coût » dit « Sur audit » pour Tiroma. Sous 720 px, le tableau défile
   dans son cadre (`overflow-x-auto` + `min-w-[720px]`), comme la source.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition from "./Apparition";
import { SurtitrePerle } from "./Surtitre";
import { COMPARATIF, COMPARATIF_COLONNES, type Case } from "./textes";

function Valeur({ v }: { v: Case }) {
  if (v === true) return <span className="inline-block h-2 w-2 rounded-full bg-[#3b7a6e]" aria-label="oui" />;
  if (v === false)
    return (
      <span className="text-slate-300" aria-label="non">
        –
      </span>
    );
  return <span className="text-xs text-slate-500">{v}</span>;
}

export default function Comparatif() {
  return (
    <section data-monde="clair" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <Apparition className="mx-auto mb-12 max-w-2xl text-center">
          <SurtitrePerle className="mb-4">Pourquoi Tiroma</SurtitrePerle>
          <h2 className="mb-4 text-3xl text-slate-900 lg:text-4xl">Un logiciel de cabinet garde l&apos;agenda sans dire qui appeler</h2>
          <p className="text-lg text-slate-600">
            Tiroma lit ce que votre logiciel de cabinet sait déjà, et en tire trois décisions par matin.
          </p>
        </Apparition>
        <Apparition delay={100}>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-4 text-left font-medium text-slate-500">
                    <span className="sr-only">Critère</span>
                  </th>
                  {COMPARATIF_COLONNES.map((col, i) =>
                    i === 0 ? (
                      <th key={col} className="bg-[#f3f8f7] px-5 py-4 text-center font-semibold text-[#30635a]">
                        {col}
                      </th>
                    ) : (
                      <th key={col} className="px-5 py-4 text-center font-medium text-slate-600">
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {COMPARATIF.map((ligne, rang) => (
                  <tr key={ligne.critere} className={rang % 2 === 0 ? "" : "bg-slate-50/60"}>
                    <td className="px-5 py-4 text-slate-700">{ligne.critere}</td>
                    {ligne.cases.map((v, i) => (
                      <td key={i} className={`px-5 py-4 text-center ${i === 0 ? "bg-[#f3f8f7]/60" : ""}`}>
                        <Valeur v={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Comparaison par catégories d&apos;outils, sans viser un éditeur en particulier. Tiroma ne remplace pas
            votre logiciel de cabinet : il le lit.
          </p>
        </Apparition>
      </div>
    </section>
  );
}
