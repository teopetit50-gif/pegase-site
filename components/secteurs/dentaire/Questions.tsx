/* ══════════════════════════════════════════════════════════════════════
   Questions fréquentes — dix questions en <details> natifs (clavier et
   lecteur d'écran compris), le chevron tourne d'un quart à l'ouverture.
   Fond `bg-slate-50` de la source, gris bleuté très clair. `dark:`
   retirés. Aucune question ne promet la lecture de radios ni un prix.
   ══════════════════════════════════════════════════════════════════════ */
import { ChevronRight } from "lucide-react";
import Apparition from "./Apparition";
import { Surtitre } from "./Surtitre";
import { QUESTIONS } from "./textes";

export default function Questions() {
  return (
    <section data-monde="clair" className="bg-slate-50 py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
          <Apparition>
            <Surtitre>Questions</Surtitre>
            <h2 className="font-sans text-3xl tracking-tight text-black lg:text-5xl">Questions fréquentes</h2>
          </Apparition>
          <Apparition delay={100}>
            <div className="space-y-3">
              {QUESTIONS.map(({ q, r }) => (
                <details key={q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 text-base text-slate-900">
                    {q}
                    <ChevronRight
                      size={18}
                      className="ml-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90"
                    />
                  </summary>
                  <div className="px-6 pb-5 text-sm leading-relaxed text-slate-600">{r}</div>
                </details>
              ))}
            </div>
          </Apparition>
        </div>
      </div>
    </section>
  );
}
