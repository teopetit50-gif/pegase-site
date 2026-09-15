"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { CHIFFRES as C } from "@/lib/produits/reprise";
import { Cadre, TitreSection } from "./Cadre";
import { cn } from "./cn";

/* 14/09/2026 — le tracé recharts vit dans ./Graphique.tsx et n'est demandé
   qu'à l'entrée dans la fenêtre : 380 ko qui ne retardent plus l'affichage
   de la page. Les teintes et les valeurs de bord sont parties avec lui. Le
   cadre de hauteur (h-80 / md:h-96) reste ICI, donc la place est réservée
   avant que le morceau n'arrive — rien ne saute. */
const Graphique = dynamic(() => import("./Graphique"), { ssr: false });

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
                  {/* `vu` sert déjà de sonde d'entrée à l'écran pour la
                      montée du bloc ; il commande maintenant AUSSI le
                      chargement du morceau recharts. Tant qu'il est faux
                      la case reste vide — mais à sa hauteur définitive. */}
                  {vu ? <Graphique etroit={etroit} /> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Cadre>
    </section>
  );
}
