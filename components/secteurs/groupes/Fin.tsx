import CarteBlanche from "./CarteBlanche";
import Apparait, { Filet } from "./Apparait";
import { InfiniteSlider } from "./Defilant";
import Lumieres from "./Lumieres";
import { APPEL, AUDIT, MODULES, PILOTE, TERRITOIRES } from "./textes";

/* ══ 6 · LA DERNIÈRE CARTE BLANCHE : pilote, territoires, modules, appel
   Balisage relevé de leurs trois sections finales, dans la même carte :
   « A partnership focused on time-to-value. » (et sa vidéo de frise à
   droite), « Backed by » (deux grandes cellules puis cinq), « Get the
   latest insights. » (trois articles à image 3:4, filets entre eux), puis
   « Reliable AI infrastructure for healthcare. » et son bouton gris.
   Leur pied de page orange remonte de 50 px sous la carte avec sa
   lumière ; ici la bande sombre fait de même, avant le pied d'Omega.
   • la vidéo du partenariat (une photo et une frise « Week 01…08 ») →
     une photo d'équipe (Unsplash) et la frise du premier pôle au groupe
     entier (audit, pilote, bilan, pôles suivants), qui avance ;
   • les financeurs → les territoires servis, en mots ;
   • les articles → les trois modules, photos Unsplash. */

function PiloteVisuel() {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 5" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/secteurs-groupes/pilote-equipe.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-x-[6%] bottom-[8%] rounded-[14px] border border-white/25 bg-white/15 p-4 text-white backdrop-blur-md">
        <p className="nm-type-mono text-white/80">{PILOTE.etiquette}</p>
        <div className="mt-3 grid grid-cols-6 gap-1">
          {PILOTE.frise.map((m, i) => (
            <div key={m} className="flex flex-col gap-2">
              <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/25">
                <span className="nm-frise absolute inset-y-0 left-0 bg-white" style={{ animationDelay: `${i * 1.2}s` }} />
              </span>
              <span className="nm-type-mono text-white/85">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mot({ children, grand = false }: { children: string; grand?: boolean }) {
  return <span className={`nm-mot text-[var(--nm-g4)] ${grand ? "text-[26px] xl:text-[30px]" : "text-[18px] xl:text-[21px]"}`}>{children}</span>;
}

export default function Fin() {
  return (
    <>
      <div
        data-header-theme="blue"
        className="pt-8 lg:pt-12 pb-6"
        style={{ background: "linear-gradient(to bottom, var(--nm-bande-2) 0%, var(--nm-bande-2) 40%, var(--nm-bande) 70%)" }}
      >
        <div>
          <CarteBlanche className="rounded-t-[24px] rounded-b-[24px] overflow-visible lg:overflow-hidden">
            {/* ── le pilote et les territoires ── */}
            <section className="nm-section-py bg-white nm-px-edge -mt-px">
              <div>
                <div className="relative nm-px-edge max-w-[1392px] mx-auto">
                  <Filet cote="gauche" couleur="var(--nm-g2)" />
                  <Filet cote="droite" couleur="var(--nm-g2)" className="hidden lg:block" />
                  <div className="flex flex-col gap-16 md:grid md:grid-cols-2 md:gap-12">
                    <div className="flex flex-col gap-8 lg:gap-10">
                      <div className="flex flex-col gap-12 lg:gap-20 lg:max-w-[646px]">
                        <Apparait>
                          <h2 className="nm-type-display text-[var(--nm-noir)] leading-[1.02] lg:leading-[1.08] [text-wrap:balance]">{PILOTE.titre}</h2>
                        </Apparait>
                        <Apparait className="md:max-w-[310px]">
                          <p className="nm-type-body text-[var(--nm-g5)] nm-text-body-sm [text-wrap:pretty]">{PILOTE.texte}</p>
                        </Apparait>
                      </div>
                      <Apparait>
                        <a href={AUDIT} className="nm-btn nm-btn--verre nm-btn--md nm-type-btn">
                          {PILOTE.bouton}
                        </a>
                      </Apparait>
                    </div>
                    <Apparait effet="zoom" className="relative -mx-4 lg:mx-0 lg:flex lg:items-end">
                      <div className="hidden lg:block border-l border-[var(--nm-g2)] h-[670px] xl:h-[870px] self-end" />
                      <div className="lg:flex-1 overflow-hidden">
                        <PiloteVisuel />
                      </div>
                    </Apparait>
                  </div>
                  <Apparait effet="fondu" className="mt-16 lg:mt-10">
                    <div className="mb-6 lg:mb-10">
                      <span className="leading-[1.45] nm-type-mono text-[var(--nm-noir)]">{TERRITOIRES.titre}</span>
                    </div>
                    <div className="lg:hidden -mx-8 border-t border-b border-[var(--nm-g2)]">
                      <InfiniteSlider gap={0} duration={30}>
                        {[...TERRITOIRES.grands, ...TERRITOIRES.petits].map((t) => (
                          <div key={t} className="flex items-center justify-center shrink-0 overflow-hidden px-6 h-[72px]">
                            <span className="nm-mot text-[15px] text-[var(--nm-g4)]">{t}</span>
                          </div>
                        ))}
                      </InfiniteSlider>
                    </div>
                    <div className="hidden lg:block -mx-6">
                      <div className="grid grid-cols-2 border-b border-[var(--nm-g2)]">
                        {TERRITOIRES.grands.map((t, i) => (
                          <div key={t} className={`flex items-center justify-center h-[100px] xl:h-[120px] ${i ? "border-l border-[var(--nm-g2)]" : ""}`}>
                            <Mot grand>{t}</Mot>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-5">
                        {TERRITOIRES.petits.map((t, i) => (
                          <div key={t} className={`flex items-center justify-center h-[80px] xl:h-[100px] ${i ? "border-l border-[var(--nm-g2)]" : ""}`}>
                            <Mot>{t}</Mot>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Apparait>
                </div>
              </div>
            </section>

            {/* ── les trois modules (leurs articles) ── */}
            <section className="nm-section-py bg-white nm-px-edge overflow-hidden">
              <div className="relative nm-px-edge max-w-[1392px] mx-auto">
                <Filet cote="gauche" couleur="var(--nm-g2)" />
                <Filet cote="droite" couleur="var(--nm-g2)" />
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-10 mb-[57px] lg:mb-16">
                  <Apparait>
                    <h2 className="nm-type-display text-[var(--nm-noir)] lg:whitespace-nowrap">{MODULES.titre}</h2>
                  </Apparait>
                  <Apparait>
                    <a href={AUDIT} className="nm-btn nm-btn--verre nm-btn--md nm-type-btn">
                      {MODULES.bouton}
                    </a>
                  </Apparait>
                </div>
                <div className="flex flex-row overflow-x-auto snap-x snap-proximity gap-[14px] md:grid md:grid-cols-2 md:gap-6 md:overflow-visible lg:grid-cols-3 lg:gap-0 pt-1 pb-4 md:pt-0 md:pb-0 -mx-4 md:mx-0 scroll-pl-4 md:scroll-pl-0 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] overscroll-x-contain">
                  {MODULES.cartes.map((c, i) => (
                    <Apparait
                      key={c.titre}
                      delai={i * 80}
                      className={`w-[75vw] flex-shrink-0 snap-start md:w-auto md:min-w-0 md:flex-shrink lg:px-4 xl:px-6 ${i === 0 ? "ml-4 md:ml-0" : "lg:border-l lg:border-[var(--nm-g2)]"}`}
                    >
                      <article>
                        <a className="group flex flex-col h-full" href={AUDIT}>
                          <div className="flex flex-col gap-8 lg:gap-[36px] h-full">
                            <div className="relative aspect-square lg:aspect-[3/4] w-full overflow-hidden rounded-[16px] lg:rounded-[24px] bg-[var(--nm-g1)] shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                src={c.image}
                              />
                            </div>
                            <div className="flex flex-col flex-1 gap-6">
                              <h3 className="nm-serif nm-text-subtitle lg:text-[24px] xl:text-[28px] xl:leading-[1.02] text-[var(--nm-noir)] group-hover:text-[var(--nm-g5)] transition-colors line-clamp-2 lg:min-h-[49px] xl:min-h-[58px]">
                                {c.titre}
                              </h3>
                              <p className="nm-sans nm-text-caption lg:nm-text-body-sm text-[var(--nm-noir)] line-clamp-2 lg:min-h-[44px]">{c.texte}</p>
                            </div>
                          </div>
                        </a>
                      </article>
                    </Apparait>
                  ))}
                  <div className="w-4 shrink-0 md:hidden" />
                </div>
              </div>
            </section>

            {/* ── l'appel ── */}
            <section className="nm-section-py nm-px-edge relative z-10">
              <div className="flex flex-col items-center text-center gap-[60px] max-w-[1392px] mx-auto">
                <Apparait>
                  <h2 className="nm-serif nm-text-h1-mobile md:text-[42px] lg:text-[48px] font-normal text-[var(--nm-noir)] w-full lg:max-w-[640px] xl:max-w-[808px] [text-wrap:balance]">
                    {APPEL.titre}
                  </h2>
                </Apparait>
                <Apparait>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <a href={AUDIT} className="nm-btn nm-btn--gris nm-btn--md nm-type-btn">
                      {APPEL.bouton}
                    </a>
                  </div>
                </Apparait>
              </div>
            </section>
          </CarteBlanche>
        </div>
      </div>
      {/* le haut de leur pied de page : la lumière sous la dernière carte */}
      {/* elle fond vers le noir du pied d'Omega, qui la suit */}
      <div
        data-header-theme="orange"
        className="relative -mt-[50px] h-[260px] lg:h-[360px] overflow-hidden bg-[var(--nm-bande)]"
        style={{ backgroundImage: "linear-gradient(to bottom, var(--nm-bande) 35%, #000000)" }}
      >
        <Lumieres fond="var(--nm-bande)" fondBas="#000000" />
      </div>
    </>
  );
}
