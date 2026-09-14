"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { HEROS, MARQUE } from "@/lib/produits/reprise";
import { Cadre } from "./Cadre";
import { Bouton } from "./Bouton";
import { Manifeste } from "./Manifeste";
import { DrapeauFrance } from "./France";
import { cn } from "./cn";

/* Lueur bleue relevée sur la référence : ellipse rgba(37,99,235,…) masquée
   par un dégradé vers le haut, posée aux deux coins bas du héros. */
const LUEUR = {
  background:
    "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.5) 0%, rgba(37, 99, 235, 0.15) 45%, transparent 75%)",
  maskImage: "linear-gradient(to top, white 0%, white 50%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(to top, white 0%, white 50%, transparent 100%)",
};
const TAILLE_LUEUR =
  "h-[500px] w-[550px] sm:h-[650px] sm:w-[720px] md:h-[750px] md:w-[850px] lg:h-[850px] lg:w-[950px]";

function Os({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-[#e6e6e6]", className)} />;
}

/** Maquette d'interface en ossature — la référence n'y met aucun texte,
 *  seulement des blocs pulsés. On garde ce parti : pas de fausse capture. */
function CarteMaquette() {
  return (
    <div className="flex h-[400px] w-[280px] flex-col gap-6 rounded-xl border border-[#d9d9d9] bg-[#f5f5f5]/90 py-6 text-[#0a0a0a] shadow-2xl backdrop-blur-sm sm:h-[500px] sm:w-[400px] md:h-[600px] md:w-[520px] lg:w-[680px]">
      <div className="space-y-4 p-4 sm:space-y-5 sm:p-6 md:space-y-6 md:p-8">
        <div className="flex items-center gap-3">
          <Os className="h-10 w-10 rounded-full sm:h-11 sm:w-11 md:h-12 md:w-12" />
          <div className="flex-1 space-y-1.5">
            <Os className="h-4 w-3/5 sm:h-5" />
            <Os className="h-3 w-2/5 sm:h-4" />
          </div>
          <Os className="h-8 w-8 sm:h-9 sm:w-9" />
        </div>
        <Os className="h-28 w-full rounded-lg sm:h-36 md:h-44 lg:h-52" />
        <div className="flex gap-2 sm:gap-3 md:gap-4">
          <div className="flex-1 space-y-1.5 rounded-lg bg-[#f5f5f5]/30 p-2 sm:p-3 md:p-4">
            <Os className="h-5 w-12 sm:h-6 sm:w-14 md:h-7 md:w-16" />
            <Os className="h-2 w-full sm:h-2.5 md:h-3" />
          </div>
          <div className="flex-1 space-y-1.5 rounded-lg bg-[#f5f5f5]/30 p-2 sm:p-3 md:p-4">
            <Os className="h-5 w-10 sm:h-6 sm:w-12 md:h-7 md:w-14" />
            <Os className="h-2 w-full sm:h-2.5 md:h-3" />
          </div>
          <div className="hidden flex-1 space-y-1.5 rounded-lg bg-[#f5f5f5]/30 p-2 sm:p-3 md:block md:p-4">
            <Os className="h-5 w-12 sm:h-6 md:h-7 md:w-16" />
            <Os className="h-2 w-full sm:h-2.5 md:h-3" />
          </div>
        </div>
        <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
          <Os className="h-3 w-full sm:h-3.5 md:h-4" />
          <Os className="h-3 w-11/12 sm:h-3.5 md:h-4" />
          <Os className="h-3 w-4/5 sm:h-3.5 md:h-4" />
        </div>
        <div className="flex gap-2">
          <Os className="h-5 w-14 rounded-full sm:h-6 sm:w-16 md:w-20" />
          <Os className="h-5 w-16 rounded-full sm:h-6 sm:w-20 md:w-24" />
        </div>
      </div>
    </div>
  );
}

export function Heros() {
  /* Les trois cartes tournent : positions -1 / 0 / 1 décalées toutes les 3 s. */
  const [tour, setTour] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTour((n) => n + 1), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    /* Le bloc citation est le FRÈRE du héros dans ce conteneur : il remonte de
       -65vh sous le héros, que son z-20 + fond opaque recouvrent. C'est ce qui
       fait glisser la phrase depuis le dessous. */
    <div data-monde="clair" className="relative w-full">
      <div className="relative z-20 w-full border-b-2 bg-[#f5f5f5]">
        <section>
          <Cadre className="relative z-0 w-full overflow-hidden rp-dashed px-4 pt-12 pb-0 sm:px-8 sm:pt-16 md:px-16 md:pt-24 lg:pt-32">
            <div className="-z-20 absolute inset-0 bg-[#f5f5f5]" />
            <div className="pointer-events-none absolute inset-0 z-0 h-full w-full rp-fondu">
              <div
                className={cn("pointer-events-none absolute right-0 bottom-0 translate-x-1/3 translate-y-1/3 select-none", TAILLE_LUEUR)}
                style={LUEUR}
              />
              <div
                className={cn("-translate-x-1/3 pointer-events-none absolute bottom-0 left-0 translate-y-1/3 select-none", TAILLE_LUEUR)}
                style={LUEUR}
              />
            </div>

            <div className="mx-auto flex flex-col items-center justify-center gap-6 sm:gap-8">
              <div className="flex flex-col gap-3 sm:gap-4">
                <h1 className="max-w-xs rp-fondu-haut text-center font-normal text-3xl tracking-tighter sm:max-w-lg sm:text-4xl md:max-w-2xl md:text-5xl lg:text-6xl">
                  {HEROS.titre[0]}
                  <br />
                  {HEROS.titre[1]}
                </h1>
                <p className="max-w-xs rp-fondu-haut px-4 text-center text-[#737373] text-sm leading-relaxed tracking-tight rp-delai-200 sm:max-w-md sm:px-0 sm:text-base md:max-w-2xl md:text-lg lg:text-xl">
                  {HEROS.chapo}
                </p>
              </div>

              <div className="flex rp-fondu-haut flex-col gap-3 rp-delai-400 sm:flex-row">
                <Bouton href={HEROS.secondaire.lien} variante="secondaire">
                  {HEROS.secondaire.texte}
                  <Mail className="size-4 transition-transform group-hover:-rotate-12" />
                </Bouton>
                <Bouton href={HEROS.principal.lien}>
                  {HEROS.principal.texte}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-rotate-12" />
                </Bouton>
              </div>

              {/* Le drapeau est repris ici, en petit : la section #france est
                  au quart de la page, donc sous la ligne de flottaison. Un
                  visiteur doit voir que le produit est français sans avoir à
                  défiler.
                  Le lien « Omega » sortait du site (https://omegaai.fr) : on y
                  est — chemin relatif, <Link>, et plus de nouvel onglet. */}
              <p className="flex rp-fondu-haut items-center gap-2 text-[#737373] text-xs rp-delai-400">
                <DrapeauFrance className="h-3 w-4.5 rounded-[2px]" />
                Édité en France par{" "}
                <Link
                  href={MARQUE.bailleurLien}
                  className="underline underline-offset-4 transition-colors hover:text-[#0a0a0a]"
                >
                  Omega
                </Link>
              </p>

              <div aria-hidden="true" className="mt-4 w-full sm:mt-6 md:mt-8">
                <div className="relative z-10 h-[220px] w-full overflow-hidden sm:h-[280px] md:h-[340px] lg:h-[380px]">
                  <div className="relative flex h-[400px] w-full items-start justify-center sm:h-[500px] md:h-[600px]">
                    {[0, 1, 2].map((i) => {
                      const position = ((i - tour) % 3 + 3) % 3 - 1;
                      return (
                        <div
                          key={i}
                          className="rp-carte-carrousel absolute left-1/2"
                          style={
                            {
                              "--card-position": position,
                              zIndex: 2 - Math.abs(position),
                            } as React.CSSProperties
                          }
                        >
                          <CarteMaquette />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Cadre>
        </section>
      </div>
      <Manifeste />
    </div>
  );
}
