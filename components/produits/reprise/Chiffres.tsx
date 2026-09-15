"use client";

import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { CHIFFRES as C } from "@/lib/produits/reprise";
import { Cadre, TitreSection } from "./Cadre";
import { cn } from "./cn";

/* Deux teintes relevées dans la config de graphique de la référence. */
const BLEU = "#2563eb";
const BLEU_CLAIR = "#60a5fa";

/* Le site source passait `var(--color-border)` / `var(--color-popover)` aux
   styles en ligne de recharts. Ces variables naissaient de son `@theme` et
   N'EXISTENT PAS ici : la grille et l'infobulle seraient rendues sans trait
   ni fond, sans la moindre erreur. Valeurs du monde clair, en clair. */
const BORD = "#d9d9d9";
const POP = "#fafafa";

/* Trame relevée telle quelle, sa jumelle `dark:` retirée (page en clair). */
const HACHURE =
  "bg-[size:10px_10px] [background-image:repeating-linear-gradient(315deg,rgba(0,0,0,0.1)_0_1px,#0000_0_50%)]";

export function Chiffres() {
  const bloc = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);
  /* Six graduations (« 0–30 j », « 1–3 mois »…) dans les ~250 px utiles d'un
     écran de 390 se chevauchent. Sous sm on n'en affiche qu'une sur deux et
     on resserre les marges — le tracé, lui, ne change pas. */
  const [etroit, setEtroit] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const suivre = () => setEtroit(mq.matches);
    suivre();
    mq.addEventListener("change", suivre);
    return () => mq.removeEventListener("change", suivre);
  }, []);
  useEffect(() => {
    const e = bloc.current;
    if (!e) return;
    const o = new IntersectionObserver(([x]) => x.isIntersecting && setVu(true), { threshold: 0.2 });
    o.observe(e);
    return () => o.disconnect();
  }, []);

  return (
    <section data-monde="clair">
      <Cadre className="relative w-full">
        <div className="border-[#d9d9d9] border-b px-6 py-12 md:px-16 md:py-16">
          <TitreSection titre={C.titre} suite={C.suite} />
        </div>
        <div className={cn("relative", HACHURE)}>
          <div className="mx-6 border-r border-l bg-[#f5f5f5] md:mx-16">
            {/* 14/09/2026 — les quatre tuiles (« 7 h 30 », « 60 / 100 »,
                « 1 seul », « Arrêt ») ne sont plus rendues : quatre faits
                de conception qui décrivaient la machine au lieu de son
                étendue. Ce qu'elles disaient est repris, développé, dans le
                catalogue de capacités et les garde-fous commerciaux
                (`components/produits/reprise/Perimetre.tsx`). `C.cellules`
                reste dans `lib/produits/reprise.ts` : rien ne le lit, et
                c'est voulu tant que Teo n'a pas tranché.
                Le graphique, lui, RESTE : c'est le seul endroit de la page
                où le coût de ne rien faire se voit. */}
            <div ref={bloc} className="">
              <div
                data-sonde="graphique"
                className={cn(
                  "relative z-10 px-4 pt-6 transition-all duration-400 ease-out md:pt-8",
                  vu ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-2 pb-2">
                  <p className="font-medium text-[#0a0a0a] text-sm">{C.graphique.intitule}</p>
                  <p className="text-[#737373] text-xs">{C.graphique.mention}</p>
                </div>
                <div className="h-80 w-full md:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={C.graphique.series} /* Marges latérales : sans elles, la première et la dernière
                         graduation sont rognées par le bord du cadre. */
                      /* La marge doit valoir au moins la moitié du libellé le plus large,
                         sinon la première et la dernière graduation sont rognées :
                         « 0–30 j » perdait son « 0 » avec 10 px. */
                      margin={{ top: 8, right: etroit ? 22 : 28, left: etroit ? 22 : 28, bottom: 8 }}>
                      <defs>
                        <linearGradient id="rp-deg-dormants" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BLEU} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={BLEU} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rp-deg-actifs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={BLEU_CLAIR} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={BLEU_CLAIR} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={BORD} strokeOpacity={0.5} />
                      <XAxis
                        dataKey="tranche"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        interval={etroit ? 1 : 0}
                        className="[&_text]:fill-[#737373]"
                        style={{ fontSize: etroit ? 10 : 12 }}
                      />
                      <Tooltip
                        cursor={{ stroke: BORD }}
                        contentStyle={{
                          background: POP,
                          border: `1px solid ${BORD}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="dormants"
                        name="Clients éteints"
                        stackId="1"
                        stroke={BLEU}
                        fill="url(#rp-deg-dormants)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="actifs"
                        name="Clients actifs"
                        stackId="1"
                        stroke={BLEU_CLAIR}
                        fill="url(#rp-deg-actifs)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Cadre>
    </section>
  );
}
