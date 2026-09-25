import Apparait from "./Apparait";
import Lumieres from "./Lumieres";
import Temoins from "./Temoins";
import { CHIFFRES } from "./textes";

/* ══ 2 · LA BANDE SOMBRE : chiffres, lumières, problèmes ══════════════
   Leur bande orange (#aa412a) → le fond du site (#08090c). Balisage
   relevé : trois cartes à filet gauche et bas (leur `stat-card`, 4 rem au-
   dessus sur téléphone, 0 dès 768), chiffre serif léger 100 / 120 px
   (xl), interlettre −3 / −3,6 px ; puis la zone des lumières, 1 200 px de
   haut à 550 px du haut du bloc, sous la carte des problèmes ; puis un
   blanc de 175 / 355 px avant la carte blanche suivante. */
export default function Chiffres() {
  return (
    <>
      <section data-header-theme="orange" className="bg-[var(--nm-bande)] pt-[112px] lg:pt-[140px] xl:pt-[200px] nm-px-edge">
        <div className="flex flex-col md:flex-row w-full max-w-[1392px] mx-auto">
          {CHIFFRES.map((c, i) => (
            <Apparait
              key={c.libelle}
              className={`flex w-full md:flex-1 justify-center items-start gap-[36px] relative pt-16 md:pt-0 pb-16 border-b border-l border-[var(--nm-trait)] ${i ? "-mt-px md:mt-0" : ""}`}
            >
              <div className="flex flex-col gap-16 md:gap-[36px] items-center justify-center text-center">
                <span className="nm-serif text-[100px] xl:text-[120px] font-light leading-[1.08] tracking-[-3px] xl:tracking-[-3.6px] text-white text-center">
                  {c.valeur}
                </span>
                <span className="nm-type-body text-white">{c.libelle}</span>
              </div>
            </Apparait>
          ))}
        </div>
      </section>
      <div data-header-theme="orange" className="relative bg-[var(--nm-bande)] overflow-hidden">
        <div className="absolute left-0 right-0 top-[550px] h-[1200px] z-0 overflow-hidden pointer-events-none">
          <Lumieres fond="var(--nm-bande)" />
        </div>
        <div className="relative z-10">
          <section className="pt-[80px] nm-px-edge">
            <div className="max-w-[1392px] mx-auto">
              <Temoins />
            </div>
          </section>
          <div className="h-[175px] lg:h-[355px]" />
        </div>
      </div>
    </>
  );
}
