import { Check } from "lucide-react";
import { FRANCE } from "@/lib/produits/relances";

/* « Un produit français ».

   Le drapeau, pas un symbole abstrait : c'est ce qui se lit en un dixième
   de seconde sur un téléphone. Bleu #000091 et rouge #E1000F — les teintes
   officielles de la République depuis 2020. Un filet fin autour, sinon la
   bande blanche disparaît sur fond clair.

   RAPATRIEMENT 11/09 — `border-border` → `border-[#e6e6e6]`,
   `bg-background` → `bg-[#ffffff]`, `bg-card` → `bg-[#ffffff]`,
   `bg-border` → `bg-[#e6e6e6]`, `text-foreground` → `text-[#171717]`,
   `text-muted-foreground` → `text-[#737373]`, `text-foreground/[0.06]` →
   `text-[#171717]/[0.06]`, `bg-foreground text-background` →
   `bg-[#171717] text-[#ffffff]`, `ring-border` → `ring-[#e6e6e6]`. */
function Drapeau({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden>
      <rect x="0" y="0" width="30" height="60" fill="#000091" />
      <rect x="30" y="0" width="30" height="60" fill="#ffffff" />
      <rect x="60" y="0" width="30" height="60" fill="#E1000F" />
      <rect
        x="0.5"
        y="0.5"
        width="89"
        height="59"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
      />
    </svg>
  );
}

export function France() {
  return (
    <section id="france" data-monde="clair" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[#e6e6e6] bg-[#ffffff]">
          <div className="pointer-events-none absolute inset-0 text-[#171717]/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />

          <div className="relative grid gap-10 p-8 md:grid-cols-2 md:items-center md:gap-12 md:p-12">
            <div>
              {/* Un seul drapeau dans la section : celui, en grand, sous le
                  texte. Le doubler d'une vignette à côté du sourcil faisait
                  redondance et brouillait la ligne. */}
              <p className="font-mono text-[11px] text-[#737373] uppercase tracking-[0.2em]">
                {FRANCE.sourcil}
              </p>
              <h2 className="mt-6 text-balance font-bold text-4xl text-[#171717] tracking-tight md:text-5xl">
                {FRANCE.titre}
              </h2>
              <p className="mt-5 max-w-md text-base text-[#737373] leading-relaxed">
                {FRANCE.chapo}
              </p>

              <div className="mt-8 flex justify-center md:mt-10 md:justify-start">
                <Drapeau className="h-16 w-auto rounded-md text-[#171717] shadow-md ring-1 ring-[#e6e6e6] md:h-20" />
              </div>
            </div>

            <div className="grid gap-px overflow-hidden rounded-xl bg-[#e6e6e6]">
              {FRANCE.points.map((p) => (
                <div key={p.titre} className="flex gap-3 bg-[#ffffff] p-5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[#ffffff]">
                    <Check className="size-3" />
                  </span>
                  <div>
                    <p className="font-semibold text-[#171717] text-sm">{p.titre}</p>
                    <p className="mt-1 text-[#737373] text-sm leading-relaxed">{p.texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filigrane d'angle : le même drapeau, très effacé, pour occuper
              le coin sans faire de bruit. Retiré le 14/09 à 11:39 par une
              session qui l'a attribué à Teo — il n'avait rien demandé (sa
              capture montrait la case du menu) ; rétabli le 14/09 à 14:20. */}
          <div className="-right-10 -bottom-12 pointer-events-none absolute hidden opacity-[0.06] md:block">
            <Drapeau className="h-56 w-auto text-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
