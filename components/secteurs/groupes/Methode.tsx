"use client";

import Apparait, { Filet } from "./Apparait";
import { InfiniteSlider } from "./Defilant";
import { VisuelVerre } from "./MethodeVisuel";
import { num, useOnglets } from "./Onglets";
import { AUDIT, METHODE, SOURCES } from "./textes";

/* ══ 4 · LA BANDE SOMBRE 2 : la méthode, puis les sources ═════════════
   Leur « The Concurrence Digital Residency » : bande bleue (#083241) →
   la nuit de /tarifs (#17171a). Balisage relevé : titre display blanc et
   sa suite en gris clair ; trois onglets mono à gauche (barre blanche de
   5 × 24 sur l'actif, les autres à 70 %) ; le texte de l'onglet (type-h1,
   puis 16 px gris) et un carré de 340 / 415 px ; sur téléphone, les
   onglets deviennent une rangée collée sous l'entête. Puis le bloc
   « Enterprise-grade security meets seamless integration » et son
   bandeau d'intégrations, cellules de 120 × 90 : ici les sources lues. */
function Visuel({ actif }: { actif: number }) {
  return (
    <div key={actif} className="absolute inset-0 nm-fondu-entree">
      <VisuelVerre jeu={actif} />
    </div>
  );
}

function Bouton({ className = "" }: { className?: string }) {
  return (
    <a href={AUDIT} className={`nm-btn nm-btn--verre-sombre nm-btn--sm nm-type-btn-sm w-fit ${className}`}>
      {METHODE.bouton}
    </a>
  );
}

export default function Methode() {
  const { actif, choisir, ref } = useOnglets(METHODE.onglets.length);
  const o = METHODE.onglets[actif];
  return (
    <section data-header-theme="blue" className="pt-16 lg:pt-32 pb-8 lg:pb-12 relative bg-[var(--nm-bande-2)] nm-px-edge -mb-px">
      <div ref={ref} className="relative mb-20 lg:mb-32 max-w-[1392px] lg:mx-auto">
        <Filet cote="gauche" couleur="var(--nm-trait-2)" />
        <Apparait className="mb-[112px] lg:mb-[160px] w-full lg:w-[65%] max-w-[903px] nm-pl-edge flex flex-col gap-10 lg:gap-20 items-start">
          <div className="w-full lg:w-[96%] max-w-[864px]">
            <h2 className="nm-type-display text-white [text-wrap:balance]">{METHODE.titre}</h2>
            <p className="nm-type-display text-[var(--nm-g3)] [text-wrap:balance]">{METHODE.sousTitre}</p>
          </div>
          <a href={AUDIT} className="nm-btn nm-btn--verre-sombre nm-btn--md nm-type-btn">
            {METHODE.bouton}
          </a>
        </Apparait>

        {/* téléphone : la rangée d'onglets, collée sous l'entête */}
        <div className="lg:hidden sticky top-[72px] z-10 relative border-l border-[var(--nm-trait-2)]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <span className="block w-[5px] h-[24px] bg-white" />
          </div>
          <div className="overflow-x-auto bg-[var(--nm-bande-2)] [scrollbar-width:none]">
            <div className="flex items-center whitespace-nowrap gap-8" style={{ paddingLeft: "var(--space-edge)" }}>
              {METHODE.onglets.map((t, i) => (
                <button
                  key={t.nom}
                  type="button"
                  onClick={() => choisir(i)}
                  className={`nm-type-mono text-left transition-opacity duration-200 relative flex items-center shrink-0 py-2 pl-[17px] ${i === actif ? "text-white" : "text-white/70"}`}
                >
                  {num(i)}&nbsp;&nbsp;{t.nom}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* ordinateur : la liste verticale */}
        <Apparait effet="fondu" className="hidden lg:flex flex-col gap-3 max-w-[400px] mb-[80px]">
          {METHODE.onglets.map((t, i) => (
            <button
              key={t.nom}
              type="button"
              onClick={() => choisir(i)}
              className={`nm-type-mono text-left transition-opacity duration-200 relative nm-pl-edge py-2 flex items-center ${i === actif ? "text-white" : "text-white/70"}`}
            >
              {i === actif && <span className="absolute w-[5px] h-[24px] bg-white left-0" />}
              {num(i)}&nbsp;&nbsp;{t.nom}
            </button>
          ))}
        </Apparait>

        {/* téléphone : le carré puis le texte */}
        <div className="lg:hidden flex flex-col gap-8 mt-8 px-4">
          <div className="relative w-full aspect-[4/3] bg-[var(--nm-bande-2)] rounded-[20px] overflow-hidden">
            <Visuel actif={actif} />
          </div>
          <div className="flex flex-col gap-8">
            <h3 className="nm-type-h3 text-white">{o.titre}</h3>
            <p className="nm-type-body text-[var(--nm-g2)]">{o.texte}</p>
            <Bouton />
          </div>
        </div>
        {/* ordinateur : le texte puis le carré */}
        <div className="hidden lg:flex pl-[60px] xl:pl-[140px] gap-[60px] xl:gap-[240px] items-start">
          <div className="flex flex-col gap-[40px]">
            <div key={actif} className="nm-fondu-entree">
              <h3 className="nm-type-h1 text-white mb-6">{o.titre}</h3>
              <p className="nm-type-body text-[var(--nm-g2)] max-w-[350px]">{o.texte}</p>
            </div>
            <Bouton />
          </div>
          <Apparait className="relative w-[340px] xl:w-[415px] aspect-square overflow-hidden rounded-[20px] bg-[var(--nm-bande-2)] shrink-0">
            <Visuel actif={actif} />
          </Apparait>
        </div>
      </div>

      <Apparait className="lg:border-b border-l lg:border-r border-[var(--nm-trait-2)]">
        <div className="flex flex-col gap-8 lg:gap-10 items-start px-4 lg:px-[24px] py-8 lg:py-10 pb-16 lg:pb-[52px]">
          <h3 className="nm-type-h2 text-white w-full lg:w-[58%] xl:w-[44%] max-w-[606px]">{METHODE.integration.titre}</h3>
          <p className="nm-sans nm-text-body-sm lg:nm-text-body text-[var(--nm-g2)] w-full lg:w-[40%] xl:w-[28%] max-w-[396px]">
            {METHODE.integration.texte}
          </p>
        </div>
        <div className="-mx-4 border-t border-[var(--nm-trait-2)] relative">
          <div className="mx-4 overflow-hidden">
            <InfiniteSlider gap={0} duration={46}>
              {SOURCES.map((s) => (
                <div key={s} className="flex items-center justify-center shrink-0 overflow-hidden px-8 py-2 h-[90px]">
                  <span className="nm-mot text-[17px] text-white/85">{s}</span>
                </div>
              ))}
            </InfiniteSlider>
          </div>
        </div>
      </Apparait>
    </section>
  );
}
