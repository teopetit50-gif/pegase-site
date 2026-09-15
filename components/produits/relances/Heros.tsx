import { ArrowRight } from "lucide-react";
import { HEROS, MARQUE, ECRANS } from "@/lib/produits/relances";
import { Panneau } from "./Panneau";
import Lien from "@/components/Lien";

/* RAPATRIEMENT 11/09 — couleurs converties : `bg-background` →
   `bg-[#ffffff]`, `border-border` → `border-[#e6e6e6]`, `border-border/50`
   → `border-[#e6e6e6]/50`, `text-foreground` → `text-[#171717]`,
   `text-muted-foreground` → `text-[#737373]`, `bg-primary
   text-primary-foreground hover:bg-primary/90` → `bg-[#171717]
   text-[#ffffff] hover:bg-[#171717]/90`, `hover:bg-accent
   hover:text-accent-foreground` → `hover:bg-[#f5f5f5]
   hover:text-[#171717]`, `text-foreground/[0.07]` → `text-[#171717]/[0.07]`.
   Le `color-mix(… var(--foreground) …)` du halo, écrit en style inline,
   passe sur le jeton de portée `var(--rel-fg)`.
   Les deux `dark:bg-input/30 dark:hover:bg-input/50` du bouton secondaire
   sont RETIRÉS : ils ne pouvaient de toute façon rien peindre ici
   (`--color-input` n'existe pas), et le monde sombre ne vient pas. */

const MASQUE_FOND =
  "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 30%, black 100%)";

export function Heros() {
  return (
    <section data-monde="clair" className="relative bg-[#ffffff]">
      <div className="rel-conteneur relative mx-auto">
        <div className="border-[#e6e6e6] border-dashed bg-[#ffffff] sm:border-x">
          <div className="pt-24 pb-20 md:pt-32 lg:pt-40">
            <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-4 px-6 text-center">
              {/* Pastille cerclée d'un dégradé conique qui tourne — relevé tel quel. */}
              <div className="relative inline-flex justify-self-center">
                <div className="-inset-[1px] absolute overflow-hidden rounded-full">
                  <div
                    className="absolute inset-0 rel-animate-tour-lent"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0%, transparent 70%, #3b82f6 85%, #10b981 95%, transparent 100%)",
                    }}
                  />
                </div>
                <div className="relative rounded-full border border-[#e6e6e6]/50 bg-[#ffffff]">
                  <a href="#principe" className="block">
                    <span className="relative z-10 flex items-center gap-1 px-4 py-1.5 font-medium text-[#171717] text-sm">
                      {HEROS.pastille}
                      <ArrowRight className="size-3.5 text-[#737373]" />
                    </span>
                  </a>
                </div>
              </div>

              <h1 className="text-balance font-semibold text-4xl sm:text-5xl lg:text-6xl">
                {HEROS.titre}
              </h1>

              <div className="mx-auto max-w-2xl">
                <p className="mb-6 text-balance text-lg text-[#737373] lg:text-xl">
                  {HEROS.chapo}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Lien
                    href={HEROS.boutonPrincipal.href}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#171717] px-4 py-2 font-medium text-[#ffffff] text-sm shadow-md transition-all hover:bg-[#171717]/90"
                  >
                    {HEROS.boutonPrincipal.texte}
                  </Lien>
                  <Lien
                    href={HEROS.boutonSecondaire.href}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#e6e6e6] bg-[#ffffff] px-4 py-2 font-medium text-sm shadow-sm transition-all hover:bg-[#f5f5f5] hover:text-[#171717]"
                  >
                    {HEROS.boutonSecondaire.texte}
                  </Lien>
                </div>
                <p className="mt-4 text-[#737373] text-xs">
                  {HEROS.mention}{" "}
                  <Lien
                    href={MARQUE.site}
                    className="underline underline-offset-4 transition-colors hover:text-[#171717]"
                  >
                    Omega
                  </Lien>
                </p>
              </div>
            </div>

            <div className="relative pt-12 lg:pt-20">
              <div className="relative mx-auto max-w-7xl px-1 md:px-0 lg:px-6">
                {/* La photo déborde le panneau et se dissout sur les quatre
                    bords : deux masques dégradés composés en `intersect`. */}
                {/* ── Le halo derrière le panneau ──────────────────────
                    La référence pose ici une photographie de son gabarit.
                    Aucun des sites frères n'embarque de photo, et celle-ci
                    ne nous appartient pas : on la remplace par un halo
                    dessiné — deux dégradés radiaux et la trame de points
                    déjà employée par le bento. Même profondeur, aucun
                    fichier, et 377 Ko de moins à charger. */}
                <div
                  aria-hidden
                  className="-inset-6 sm:-inset-20 lg:-inset-32 pointer-events-none absolute"
                  style={{
                    backgroundImage:
                      "radial-gradient(60% 55% at 50% 35%, color-mix(in oklab, var(--rel-fg) 7%, transparent), transparent 70%), radial-gradient(45% 40% at 78% 78%, color-mix(in oklab, var(--rel-fg) 5%, transparent), transparent 70%)",
                  }}
                />
                <div
                  aria-hidden
                  className="-inset-6 sm:-inset-20 lg:-inset-32 pointer-events-none absolute text-[#171717]/[0.07] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px]"
                  style={{
                    maskImage: MASQUE_FOND,
                    WebkitMaskImage: MASQUE_FOND,
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                  }}
                />
                {/* Le fondu du bas vaut 8 % de la hauteur : 48 px sous un
                    panneau de 602 px — il tombe dans le vide sous la dernière
                    ligne. Sous un panneau de 342 px il n'en vaut que 27 et
                    ronge les données, la photo transparaissant à travers le
                    tableau. On ne l'applique donc qu'à partir de `sm`. */}
                <div
                  className="relative z-10 [--fondu:100%] sm:[--fondu:92%]"
                  style={{
                    maskImage:
                      "linear-gradient(to bottom, black 0%, black var(--fondu), transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom, black 0%, black var(--fondu), transparent 100%)",
                  }}
                >
                  <Panneau
                    apercu={ECRANS.onglets[0].apercu}
                    alt={ECRANS.onglets[0].alt}
                    priorite
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
