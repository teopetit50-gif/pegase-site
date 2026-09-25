/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Produit.tsx, section « 01 — Le produit »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/03-product.tsx`. Côté source ce fichier est GÉNÉRÉ par
   `outils/assembler.py` ; ici il ne l'est plus : c'est une copie du
   résultat, corrigée à la main. Ce qui change :

   · COULEURS (monde blanc) — la source tournait en SOMBRE (classe `dark`
     sur <html>). Ses `dark:` (6) sont retirés : ce qui reste est le thème
     CLAIR de la référence Parlo, écrit par son auteur. Jetons convertis par
     outils/rapatrier-secteur.py sur ce thème clair : bg-background,
     bg-card → #ffffff · text-foreground (et ses /20…/80) → #0a0a0a ·
     text-muted-foreground → #737373 · from/via/to-background → #ffffff.
   · Les canevas de pixels des quatre cellules s'allumaient en BLANC au
     survol (#ffffff, #FFFFFFCC, #FFFFFF99, #A3A3A3) : sur le blanc, rien.
     Ils prennent la palette CLAIRE que la référence donne à ceux du héros
     (#404040, #525252CC, #73737399, #A3A3A3) : le survol se voit, en encre.
   · Le bouton « Réserver un audit » était une copie FIGÉE du bouton étoilé
     (un <button> sans destination, rendu serveur de la référence) : il
     devient `BoutonEtoile` vers /reserver-un-audit. La copie portait aussi
     un `clipPath id="clip0_408_119"` en dur, répété dans Formules.tsx :
     deux fois le même identifiant dans la page (voir marque.tsx).
   · `rounded-lg` / `rounded-xl` → 10 / 14 px : la source dérivait ses
     rayons de `--radius: .625rem`, ce site garde ceux de Tailwind.
   · PAGE PLEINE (Teo, 24/09) : le cadre de la source (`mx-[30px] border-x`)
     disparaît, ses 30 px de marge restent, section par section, autour du
     contenu. Les deux filets horizontaux des quatre cellules courent sur
     toute la largeur de la fenêtre ; les cellules restent dans la marge.
   · REPORT du 24/09, 17 h 00 (seconde copie de la source) : une autre
     session a ajouté des fonctions au site source entre 16 h 00 et 16 h 32
     (Teo : « ajoute tout sur les sites »). Ici : trois pièces de plus dans
     le second bandeau qui défile derrière le menu (attestations
     d'assurance, ordres de service, réserves de réception), dans ses deux
     copies. Mêmes conversions que le reste.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- icônes d'application SVG de 20 px du menu décoratif : pas d'optimiseur. */
import React from "react";
import PixelCanvas from "./pixels";
import StarButton from "./bouton-etoile";
import { CONTACT } from "./textes";

/* Palette claire des pixels (voir l'en-tête). */
const PIXELS_CLAIRS = ["#404040", "#525252CC", "#73737399", "#A3A3A3"];

export default function Produit() {
  return (
    <>
      <div id="product" className="scroll-mt-24">
        <section className="pt-20 pb-0 bg-[#ffffff] font-sans">
          <div className="mx-[30px]">
            <div className="mx-auto w-full max-w-7xl px-6">
              <div className="grid items-center gap-6 pb-14 md:grid-cols-2">
                <div
                  className="relative flex items-center justify-center overflow-hidden py-6"
                  data-reveal="1"
                  style={{ "--reveal-y": "16px" } as React.CSSProperties}
                >
                  <div className="absolute inset-0 flex flex-col justify-center gap-2.5">
                    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
                      <div className="flex shrink-0 animate-[architectes-trusted-marquee_38s_linear_infinite] motion-reduce:animate-none">
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Plan de masse</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Coupes et façades</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Nomenclatures</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">CCTP</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">DPGF</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Pièces du permis</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Plan de masse</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Coupes et façades</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Nomenclatures</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">CCTP</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">DPGF</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Pièces du permis</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
                      <div className="flex shrink-0 animate-[architectes-trusted-marquee_44s_linear_infinite] [animation-direction:reverse] motion-reduce:animate-none">
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Fonds de plan BET</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Situations de travaux</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Fiches techniques</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">
                            Devis d&apos;entreprises
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Comptes rendus</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">
                            Attestations d&apos;assurance
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Ordres de service</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Réserves de réception</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Avenants</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Fonds de plan BET</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Situations de travaux</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Fiches techniques</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">
                            Devis d&apos;entreprises
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Comptes rendus</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">
                            Attestations d&apos;assurance
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Ordres de service</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Réserves de réception</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 px-4 py-0.5">
                          <span className="whitespace-nowrap text-[11px] text-[#0a0a0a]/20">Avenants</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="relative z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]">
                    <div className="w-60 overflow-hidden rounded-[14px] bg-[#ffffff] p-1.5 shadow-lg shadow-black/[0.04] ring-1 ring-[#0a0a0a]/[0.06]">
                      <div className="flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-1 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 shrink-0 rounded-[5px]"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/plans.svg"
                        />
                        <span className="text-[13px] text-[#0a0a0a]/80">Contrôle des plans</span>
                      </div>
                      <div className="flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-1 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 shrink-0 rounded-[5px]"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/offres.svg"
                        />
                        <span className="text-[13px] text-[#0a0a0a]/80">Analyse des offres</span>
                      </div>
                      <div className="flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-1 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 shrink-0 rounded-[5px]"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/situations.svg"
                        />
                        <span className="text-[13px] text-[#0a0a0a]/80">Situations de travaux</span>
                      </div>
                      <div className="flex cursor-default items-center gap-2.5 rounded-[10px] px-2.5 py-1 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 shrink-0 rounded-[5px]"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/visa.svg"
                        />
                        <span className="text-[13px] text-[#0a0a0a]/80">Visa des documents</span>
                      </div>
                      <div className="mx-2.5 my-1 h-px bg-[#0a0a0a]/[0.06]"></div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-plus size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14"></path>
                          <path d="M12 5v14"></path>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Ajouter un projet</span>
                      </div>
                      <div className="mx-2.5 my-1 h-px bg-[#0a0a0a]/[0.06]"></div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-settings2 lucide-settings-2 size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="M14 17H5"></path>
                          <path d="M19 7h-9"></path>
                          <circle cx="17" cy="17" r="3"></circle>
                          <circle cx="7" cy="7" r="3"></circle>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Déposer un dossier</span>
                      </div>
                      <div className="mx-2.5 my-1 h-px bg-[#0a0a0a]/[0.06]"></div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-circle-question-mark size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                          <path d="M12 17h.01"></path>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Régler les contrôles</span>
                      </div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-message-circle size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Choisir qui décide</span>
                      </div>
                      <div className="mx-2.5 my-1 h-px bg-[#0a0a0a]/[0.06]"></div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-user size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Inviter l&apos;équipe</span>
                      </div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-settings size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Réglages du projet</span>
                      </div>
                      <div className="mx-2.5 my-1 h-px bg-[#0a0a0a]/[0.06]"></div>
                      <div className="flex h-7 cursor-default items-center gap-2.5 rounded-[10px] px-2.5 transition-colors duration-150 hover:bg-[#0a0a0a]/[0.03]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-log-out size-3.5 text-[#0a0a0a]/25"
                          aria-hidden="true"
                        >
                          <path d="m16 17 5-5-5-5"></path>
                          <path d="M21 12H9"></path>
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        </svg>
                        <span className="text-[13px] text-[#0a0a0a]/55">Suspendre un contrôle</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div data-reveal="1" style={{ "--reveal-y": "20px" } as React.CSSProperties}>
                  <div className="w-full">
                    <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
                      01 — Le produit
                    </span>
                    <h2 className="text-balance text-4xl font-semibold text-[#0a0a0a]">
                      <span className="block">Une incohérence entre deux pièces</span>
                      <span className="block text-[#737373]">ne se voit qu&apos;en les lisant ensemble.</span>
                    </h2>
                    <p className="mt-6 text-balance text-lg text-[#737373]">
                      Lorani lit toutes les planches, les unes contre les autres et contre les pièces écrites. Vous arbitrez sur un dossier vérifié avant l&apos;envoi.
                    </p>
                    <div className="mt-8">
                      <StarButton href={CONTACT.audit}>Réserver un audit</StarButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Les filets courent sur toute la largeur ; les cellules restent dans la marge de 30 px. */}
          <div className="border-y border-[#0a0a0a]/[0.06]">
            <div className="mx-[30px] grid grid-cols-2 lg:grid-cols-4">
              <div
                className="relative overflow-hidden px-6 py-8 lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">01</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Chaque planche est croisée avec les autres</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Lorani relit ensemble les plans, les coupes, les façades, les nomenclatures et les renvois. Une cote modifiée à un endroit est retrouvée partout où elle apparaît.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-l border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">02</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Les règles opposables sont citées</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Chaque point cite l&apos;article qu&apos;il met en défaut : règlement du plan local d&apos;urbanisme (PLU), accessibilité, sécurité incendie des établissements recevant du public (ERP) ou RE2020.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-t border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">03</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">Une preuve pour chaque point</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Chaque point cite la planche, l&apos;extrait et les deux valeurs lues, puis explique l&apos;écart et
                    propose une correction.
                  </p>
                </div>
              </div>
              <div
                className="relative overflow-hidden px-6 py-8 border-l border-t border-[#0a0a0a]/[0.06] lg:border-l lg:border-[#0a0a0a]/[0.06] lg:border-t-0"
                data-reveal="1"
                style={{ "--reveal-y": "8px" } as React.CSSProperties}
              >
                <PixelCanvas
                  colors={PIXELS_CLAIRS}
                  trigger="hover"
                  position="middle"
                  gap={8}
                  pixelSize={3}
                  speed={70}
                  backgroundColor="transparent"
                  padding={0}
                  borderWidth={0}
                  radius={0}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-[#ffffff]/95 via-[#ffffff]/75 to-[#ffffff]/90"
                ></div>
                <div className="relative z-10">
                  <span className="text-[14px] tabular-nums text-[#0a0a0a]/25">04</span>
                  <h3 className="mt-2 text-[18px] font-medium tracking-tight text-[#0a0a0a]">
                    L&apos;architecte décide
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#0a0a0a]/45">
                    Lorani ne modifie aucun fichier : il remet une liste de points à arbitrer, chacun avec la pièce et
                    la page concernées.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
