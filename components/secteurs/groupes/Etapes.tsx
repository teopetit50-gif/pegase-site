"use client";

import Apparait, { Filet } from "./Apparait";
import Lumieres from "./Lumieres";
import CarteBlanche from "./CarteBlanche";
import { num, useOnglets } from "./Onglets";
import { AUDIT, ETAPES } from "./textes";

/* ══ 5 · LA CARTE BLANCHE 2 : les quatre étapes, puis les faits ═══════
   Leur « AI built for your care model » : titre display centré et sa
   suite en gris ; quatre onglets mono (01 Define… 04 Optimize) à gauche,
   barre noire de 5 × 24 sur l'actif ; un volume 3D en rendu client au
   centre, derrière (top 200, 70 % de large) ; puis « Rigorously validated.
   Safely scalable. » et trois faits en cellules filetées. Sous la carte,
   la bande de lumière bleue, 240 / 350 / 495 px, remontée de 120.
   Leur volume 3D (WebGL, rendu côté client) est redessiné en CSS : une
   pile de quatre plaques en perspective, celle de l'étape active levée. */
function Pile({ actif }: { actif: number }) {
  return (
    <div className="nm-pile relative mx-auto h-[420px] w-[420px]" aria-hidden>
      <div className="absolute inset-[60px]">
        {ETAPES.liste.map((e, i) => (
          <div
            key={e.nom}
            className={`nm-pile__plaque${i === actif ? " is-actif" : ""}`}
            style={{
              transform: `translateZ(${i * 34 + (i === actif ? 26 : 0)}px)`,
              opacity: i <= actif ? 1 : 0.55,
            }}
          >
            <span className="absolute left-5 top-4 font-[family-name:var(--nm-mono)] text-[10px] uppercase tracking-[0.08em] text-[#575754]">
              {num(i)} {e.nom}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Etapes() {
  const { actif, choisir, ref } = useOnglets(ETAPES.liste.length);
  const e = ETAPES.liste[actif];
  return (
    <div data-header-theme="blue" className="pt-8 lg:pt-16 bg-[var(--nm-bande-2)]">
      <div>
        <CarteBlanche className="overflow-clip rounded-t-[24px] rounded-b-[24px]">
          <section className="nm-section-py relative nm-px-edge lg:overflow-hidden !pb-[clamp(2.5rem,calc(2.5rem+1.5*(100vw-23.4375rem)/66.5625),4rem)]">
            <div ref={ref} className="relative nm-px-edge max-w-[1392px] mx-auto">
              <Filet cote="gauche" couleur="var(--nm-g2)" />
              <div className="absolute top-[200px] left-0 right-0 mx-auto hidden lg:block z-[1] w-[70%] pointer-events-none">
                <Pile actif={actif} />
              </div>
              <Apparait className="text-center mb-[112px] lg:mb-[80px]">
                <h2 className="nm-type-display text-[var(--nm-noir)] [text-wrap:balance]">{ETAPES.titre}</h2>
                <p className="nm-type-display text-[var(--nm-g4)] [text-wrap:balance]">
                  {ETAPES.sousTitre[0]}
                  <br />
                  {ETAPES.sousTitre[1]}
                </p>
              </Apparait>

              {/* téléphone */}
              <div className="lg:hidden pb-8">
                <div className="sticky top-[72px] z-20 relative border-l border-[var(--nm-g2)]">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <span className="block w-[5px] h-[24px] bg-[var(--nm-noir)]" />
                  </div>
                  <div className="overflow-x-auto bg-white [scrollbar-width:none]">
                    <div className="flex items-center whitespace-nowrap gap-8">
                      {ETAPES.liste.map((t, i) => (
                        <button
                          key={t.nom}
                          type="button"
                          onClick={() => choisir(i)}
                          className={`nm-type-mono text-left transition-opacity duration-200 relative flex items-center shrink-0 py-2 pl-[17px] ${i === actif ? "text-[var(--nm-noir)]" : "text-black/60"}`}
                        >
                          {num(i)}&nbsp;&nbsp;{t.nom}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 -mx-4 relative overflow-hidden">
                  <div className="scale-[0.8] origin-top">
                    <Pile actif={actif} />
                  </div>
                </div>
                <div key={actif} className="mt-4 flex flex-col gap-12 nm-fondu-entree">
                  <h3 className="nm-type-h3 text-[var(--nm-noir)]">{e.titre}</h3>
                  <p className="nm-type-body text-[var(--nm-g6)] [text-wrap:pretty]">{e.texte}</p>
                </div>
                <a href={AUDIT} className="nm-btn nm-btn--verre nm-btn--sm nm-type-btn-sm w-fit mt-8">
                  {ETAPES.bouton}
                </a>
              </div>

              {/* ordinateur */}
              <div className="hidden lg:block mb-16 lg:mb-24 relative z-[2]">
                <div className="max-w-[400px]">
                  <Apparait effet="fondu" className="flex flex-col gap-2 mb-[80px]">
                    {ETAPES.liste.map((t, i) => (
                      <button
                        key={t.nom}
                        type="button"
                        onClick={() => choisir(i)}
                        className={`nm-type-mono text-left transition-colors relative h-[24px] flex items-center ${i === actif ? "text-[var(--nm-noir)]" : "text-black/60 hover:text-[var(--nm-g6)]"}`}
                      >
                        {i === actif && <span className="absolute w-[5px] h-[24px] bg-[var(--nm-noir)] -left-6 top-0" />}
                        {num(i)}&nbsp;&nbsp;{t.nom}
                      </button>
                    ))}
                  </Apparait>
                  <div key={actif} className="flex flex-col gap-[40px] items-start nm-fondu-entree">
                    <h3 className="nm-type-h4 text-[var(--nm-noir)]">{e.titre}</h3>
                    <p className="nm-type-body text-[var(--nm-g6)] w-[243px]">{e.texte}</p>
                  </div>
                  <a href={AUDIT} className="nm-btn nm-btn--verre nm-btn--sm nm-type-btn-sm mt-10">
                    {ETAPES.bouton}
                  </a>
                </div>
              </div>

              <div>
                <p className="hidden lg:block nm-type-mono text-[var(--nm-noir)] mb-10 px-6">{ETAPES.devise}</p>
                <div className="flex flex-col lg:hidden border-r border-l border-[var(--nm-g2)]">
                  {ETAPES.faits.map((f) => (
                    <div key={f.libelle} className="flex flex-col gap-2 items-center justify-center text-center h-[180px] border-b border-[var(--nm-g2)]">
                      <span className="nm-serif nm-text-h2 text-[var(--nm-noir)]">{f.valeur}</span>
                      <span className="nm-type-body text-[var(--nm-g6)] max-w-[240px]">{f.libelle}</span>
                    </div>
                  ))}
                </div>
                <div className="hidden lg:flex border-b border-r border-l border-[var(--nm-g2)]">
                  {ETAPES.faits.map((f, i) => (
                    <div
                      key={f.libelle}
                      className={`flex flex-1 flex-col xl:flex-row xl:items-center gap-2 xl:gap-8 py-6 xl:py-10 px-5 xl:px-[62px] ${i < ETAPES.faits.length - 1 ? "border-r border-[var(--nm-g2)]" : ""}`}
                    >
                      <span className="nm-serif nm-text-h2 text-[var(--nm-noir)] shrink-0">{f.valeur}</span>
                      <span className="nm-type-body text-[var(--nm-g6)]">{f.libelle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </CarteBlanche>
        <div className="relative -mt-[120px] pointer-events-none h-[240px] lg:h-[350px] xl:h-[495px] overflow-hidden">
          <div data-header-theme="blue" className="relative w-full overflow-hidden pointer-events-none h-[480px] lg:h-[700px] xl:h-[990px] bg-[var(--nm-bande-2)]" aria-hidden>
            <Lumieres fond="var(--nm-bande-2)" teinte="gris" />
          </div>
        </div>
      </div>
    </div>
  );
}
