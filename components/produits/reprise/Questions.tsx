"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { QUESTIONS as Q } from "@/lib/produits/reprise";
import { Cadre } from "./Cadre";
import { cn } from "./cn";

/** Accordéon natif : <button aria-expanded> + région repliable.
 *  Écart assumé : la référence passe par Radix ; le comportement au clavier
 *  et pour un lecteur d'écran est identique en HTML natif, sans dépendance. */
export function Questions() {
  const [ouvert, setOuvert] = useState<number | null>(null);

  return (
    <section id="questions" data-monde="clair" className="scroll-mt-20">
      <section>
        <Cadre className="flex flex-col">
          <div className="flex flex-col gap-2 border-[#d9d9d9] border-b px-6 py-12 md:px-16 md:py-16">
            <h2 className="max-w-4xl font-medium text-[#0a0a0a] text-xl sm:text-2xl md:text-3xl lg:text-4xl">
              {Q.titre}{" "}
              <span className="text-[#737373]">
                {Q.suite}{" "}
                <Link href={Q.lien} className="text-[#171717] no-underline duration-300 hover:text-[#171717]/70">
                  {Q.lienTexte}
                </Link>
              </span>
            </h2>
          </div>

          <div className="mx-6 border-[#d9d9d9] border-r border-l md:mx-16">
            <div className="w-full divide-y divide-dashed divide-[#d9d9d9] border-[#d9d9d9] border-t border-dashed">
              {Q.items.map((item, i) => {
                const actif = ouvert === i;
                return (
                  <div key={item.q}>
                    <h3 className="flex">
                      <button
                        type="button"
                        onClick={() => setOuvert(actif ? null : i)}
                        aria-expanded={actif}
                        aria-controls={`repli-${i}`}
                        id={`declencheur-${i}`}
                        className={cn(
                          "flex flex-1 items-start justify-between gap-4 rounded-none px-6 py-4 text-left font-medium text-sm outline-none transition-all",
                          "focus-visible:border-[#a3a3a3] focus-visible:ring-[3px] focus-visible:ring-[#a3a3a3]/50",
                          "hover:bg-[#f1f1f1] hover:no-underline",
                          actif && "bg-[#f1f1f1]",
                        )}
                      >
                        {item.q}
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 translate-y-0.5 text-[#737373] transition-transform duration-200",
                            actif && "rotate-180",
                          )}
                        />
                      </button>
                    </h3>
                    <div
                      id={`repli-${i}`}
                      role="region"
                      aria-labelledby={`declencheur-${i}`}
                      hidden={!actif}
                      className="overflow-hidden text-sm"
                    >
                      <p className="px-6 pt-0 pb-5 text-[#737373] leading-relaxed">{item.r}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Cadre>
      </section>
    </section>
  );
}
