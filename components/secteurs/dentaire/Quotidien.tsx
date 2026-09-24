/* ══════════════════════════════════════════════════════════════════════
   « Ce que vivent les cabinets » — la place des témoignages dans la
   référence. Ici, AUCUN avis : treize SITUATIONS TYPES du métier
   (annulation du week-end, devis qui dort, laboratoire, mutuelle,
   implants, orthodontie…), sans personne ni cabinet réels, chaque carte
   marquée « Situation type ». À droite du titre, les deux seuls chiffres
   de la page, sourcés (textes.ts). Le ruban défile en 60 s et s'arrête au
   survol ; il est doublé pour boucler sans couture (le double est caché
   aux lecteurs d'écran). `dark:` retirés ; bleu ciel → vert d'eau le 24/09.

   Le filet du haut (`border-t`) court sur toute la largeur de la fenêtre :
   la section est pleine largeur, son contenu seul est centré.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition from "./Apparition";
import { Surtitre } from "./Surtitre";
import { CHIFFRES_SOURCES, SITUATIONS } from "./textes";

export default function Quotidien() {
  return (
    <section data-monde="clair" className="border-t border-slate-100 py-32 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
        <div className="mb-16 flex flex-col gap-8 lg:mb-24 lg:flex-row lg:items-end lg:justify-between">
          <Apparition className="max-w-3xl">
            <Surtitre>Au quotidien</Surtitre>
            <h2 className="text-3xl text-slate-900 lg:text-5xl">Ce que vivent les cabinets</h2>
          </Apparition>
          <Apparition delay={100}>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              {CHIFFRES_SOURCES.map((c) => (
                <div
                  key={c.chiffre}
                  className="flex h-[104px] w-[104px] flex-col items-center justify-center gap-1 rounded-2xl border border-[#e3f0ed] bg-[#f3f8f7] px-2 text-center"
                >
                  <span className="text-xl font-bold leading-none text-[#30635a]">{c.chiffre}</span>
                  <span className="text-[10px] leading-tight text-slate-600">{c.texte}</span>
                  <span className="text-[9px] text-slate-400">{c.source}</span>
                </div>
              ))}
            </div>
          </Apparition>
        </div>
        <div
          className="relative -mx-6 overflow-hidden px-6 lg:-mx-12 lg:px-12"
          style={{
            WebkitMaskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            maskImage: "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
          }}
        >
          <div className="dentaire-defile-situations flex w-max gap-6 hover:[animation-play-state:paused] lg:gap-8">
            {[...SITUATIONS, ...SITUATIONS].map(({ quand, cabinet, sujet, Icone, recit }, i) => (
              <div
                key={i}
                aria-hidden={i >= SITUATIONS.length}
                className="group flex w-[85vw] shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:border-[#c7e1db] sm:w-[380px] lg:w-[340px]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e3f0ed] text-[#3b7a6e]">
                    <Icone size={13} />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-[#4f9587]">
                    {sujet}
                  </span>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-slate-700">{recit}</p>
                <div className="mt-auto">
                  <div className="font-semibold text-slate-900">{quand}</div>
                  <div className="text-sm text-slate-500">{cabinet}</div>
                  <div className="mt-1 text-xs text-slate-400">Situation type</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
