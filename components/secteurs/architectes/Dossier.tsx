/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Dossier.tsx, « 03 — Le dossier »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/07-channels.tsx` (GÉNÉRÉ côté source par l'assembleur ; ici une
   copie du résultat, corrigée à la main). L'écran produit : pièces, points
   relevés, détail d'un point avec la réponse de Lorani ; puis quatre faits
   en ligne. Ce qui change :

   · JETONS : `dark:` retirés (16), thème clair de la référence (#0a0a0a,
     #737373, #f5f5f5, #e5e5e5, anneau #a1a1a1).
   · L'ÉCRAN, SOMBRE EN DUR, passe au clair en entier :
       cadre de l'appareil          bg-[#303030] (plus clair que le fond
                                    noir) → #e5e5e5 (plus foncé que le
                                    fond blanc), sous le voile blanc à 70 %
                                    de l'application
       panneau des points            bg-[#0f0f0f] → #ffffff, et son fondu
                                    bas `from-[#0f0f0f]` → `from-[#ffffff]`
       bulle de la réponse           bg-[#1a1a1a] → #f5f5f5
       « Ouvrir la planche »         filet #5e5e5e → #d4d4d4, survol
                                    `bg-white/5` → encre à 5 %
   · L'avatar de la réponse était public/marque.svg (alt « Parlo », le nom
     du gabarit) : c'est le signe officiel, dans sa tuile (`TuileSigne`).
   · L'écran est une MAQUETTE : ses dix boutons ne font rien. Il porte
     `inert` : ni tabulation dans des contrôles morts, ni lecture de faux
     boutons (dont un « Send reply » en anglais, traduit au passage).
   · Rayons : `rounded-lg` / `rounded-xl` / `rounded-md` → 10 / 14 / 8 px.
   · Posée dans la marge de 30 px de la page (page.tsx) : le bloc à
     `-mx-6 md:-mx-8` y déborde comme dans la source.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- icônes d'application SVG de 20 px dans une maquette décorative : pas d'optimiseur. */
import React from "react";
import { TuileSigne } from "./marque";

export default function Dossier() {
  return (
    <>
      <div id="channels" className="scroll-mt-24">
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-7xl space-y-12 px-6">
            <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
              03 — Le dossier
            </span>
            <h2 className="text-[#737373] relative z-10 max-w-4xl text-balance text-4xl font-medium tracking-tight">
              <span className="text-[#0a0a0a]">Chaque point arrive avec sa preuve :</span> <br /> la planche,
              l&apos;extrait, l&apos;article et la correction proposée.
            </h2>
            <div inert className="relative -mx-6 overflow-hidden px-3 pt-3 md:-mx-8">
              <div className="min-w-2xl aspect-88/36 mask-b-from-92% mask-b-to-100% relative overflow-hidden rounded-t-2xl bg-[#e5e5e5] p-3">
                <div className="flex size-full overflow-hidden rounded-[14px] bg-[#ffffff]/70 pb-0 pl-3 pr-0 pt-0">
                  <aside className="ml-3 mr-3 mt-3 flex w-[24%] shrink-0 flex-col p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-base font-medium">Pièces</p>
                      <span
                        data-slot="badge"
                        data-variant="secondary"
                        className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 text-[11px]"
                      >
                        41
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <button
                        type="button"
                        tabIndex={0}
                        data-slot="button"
                        className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-10 w-full justify-start rounded-[6px] px-2 text-sm bg-[#0a0a0a]/8 hover:bg-[#0a0a0a]/10"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 rounded-[5px] object-contain"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/plans.svg"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">Plans</span>
                        <span
                          data-slot="badge"
                          data-variant="secondary"
                          className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 px-1 text-[11px]"
                        >
                          12
                        </span>
                      </button>
                      <button
                        type="button"
                        tabIndex={0}
                        data-slot="button"
                        className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-[#0a0a0a]/6.5 hover:text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-10 w-full justify-start rounded-[6px] px-2 text-sm"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 rounded-[5px] object-contain"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/offres.svg"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">Offres</span>
                        <span
                          data-slot="badge"
                          data-variant="secondary"
                          className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 px-1 text-[11px]"
                        >
                          9
                        </span>
                      </button>
                      <button
                        type="button"
                        tabIndex={0}
                        data-slot="button"
                        className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-[#0a0a0a]/6.5 hover:text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-10 w-full justify-start rounded-[6px] px-2 text-sm"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 rounded-[5px] object-contain"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/situations.svg"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">Situations</span>
                        <span
                          data-slot="badge"
                          data-variant="secondary"
                          className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 px-1 text-[11px]"
                        >
                          7
                        </span>
                      </button>
                      <button
                        type="button"
                        tabIndex={0}
                        data-slot="button"
                        className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-[#0a0a0a]/6.5 hover:text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-10 w-full justify-start rounded-[6px] px-2 text-sm"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 rounded-[5px] object-contain"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/visa.svg"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">Fiches techniques</span>
                        <span
                          data-slot="badge"
                          data-variant="secondary"
                          className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 px-1 text-[11px]"
                        >
                          8
                        </span>
                      </button>
                      <button
                        type="button"
                        tabIndex={0}
                        data-slot="button"
                        className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-[#0a0a0a]/6.5 hover:text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-10 w-full justify-start rounded-[6px] px-2 text-sm"
                      >
                        <img
                          alt=""
                          loading="lazy"
                          width="20"
                          height="20"
                          decoding="async"
                          data-nimg="1"
                          className="size-5 rounded-[5px] object-contain"
                          style={{ color: "transparent" }}
                          src="/secteurs-architectes/icones/permis.svg"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">Permis</span>
                        <span
                          data-slot="badge"
                          data-variant="secondary"
                          className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 px-1 text-[11px]"
                        >
                          5
                        </span>
                      </button>
                    </div>
                  </aside>
                  <div className="flex min-w-0 flex-1 overflow-hidden rounded-[14px] bg-[#ffffff]">
                    <div className="flex w-[44%] shrink-0 flex-col border-r border-[#e5e5e5]/70">
                      <div className="border-b border-[#e5e5e5]/70 p-3">
                        <p className="text-base font-medium">Points relevés</p>
                        <div className="text-[#737373] mt-2 flex items-center gap-2 rounded-[8px] border border-[#e5e5e5]/70 px-2 py-2 text-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-search size-3.5"
                            aria-hidden="true"
                          >
                            <path d="m21 21-4.34-4.34"></path>
                            <circle cx="11" cy="11" r="8"></circle>
                          </svg>
                          Rechercher un point
                        </div>
                      </div>
                      <div className="relative min-h-0 flex-1 overflow-hidden divide-y divide-[#e5e5e5]/70">
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors bg-[#0a0a0a]/7"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            PM
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Plan de masse</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a] text-[#ffffff]"
                                >
                                  Bloquant
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">p. 02</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              La cote de recul (4,80 m) diffère de la coupe AA (5,20 m).
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            CA
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Coupe AA</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-transparent text-[#0a0a0a] ring-1 ring-inset ring-[#0a0a0a]/45"
                                >
                                  À vérifier
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">p. 07</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              Le niveau du RDC ne correspond pas à la façade sud.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            NM
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Nomenclature</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a]/10 text-[#0a0a0a]/60"
                                >
                                  Mineur
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">p. 31</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              La porte P12 figure au tableau des menuiseries, mais pas au plan du R+1.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            DP
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">DPGF lot 03</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-transparent text-[#0a0a0a] ring-1 ring-inset ring-[#0a0a0a]/45"
                                >
                                  À vérifier
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">l. 44</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              Le poste 3.4 n&apos;est chiffré que par une entreprise sur trois.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            S4
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Situation n° 4</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a]/10 text-[#0a0a0a]/60"
                                >
                                  Mineur
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">lot 08</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              La retenue de garantie n&apos;est pas déduite du cumul.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            PC
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Pièces du permis</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-transparent text-[#0a0a0a] ring-1 ring-inset ring-[#0a0a0a]/45"
                                >
                                  À vérifier
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">PC2</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              La notice PC4 annonce deux places PMR ; le plan de masse en montre une.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            FT
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Fiche technique</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a]/10 text-[#0a0a0a]/60"
                                >
                                  Mineur
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">lot 10</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              Le PV fourni classe la porte EI 30 ; le CCTP demande EI 60.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            CC
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">CCTP lot 05</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a] text-[#ffffff]"
                                >
                                  Bloquant
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">art. 5.2</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              L&apos;article cite une version du DTU qui n&apos;est plus en vigueur.
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex w-full min-w-0 items-center gap-2 px-3 py-3.5 text-left transition-colors hover:bg-[#0a0a0a]/4"
                        >
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            FB
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-medium">Fonds de plan BET</span>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-[#171717]/80 h-4 border-0 px-1.5 text-[9px] bg-[#0a0a0a] text-[#ffffff]"
                                >
                                  Bloquant
                                </span>
                              </span>
                              <span className="text-[#737373] shrink-0 text-[11px]">ind. D</span>
                            </span>
                            <span className="text-[#737373] mt-0.5 block truncate text-xs">
                              L&apos;indice D déplace la trémie de 60 cm sans avis.
                            </span>
                          </span>
                        </button>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-[#ffffff] via-[#ffffff]/90 to-transparent"
                        ></div>
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex items-start justify-between border-b border-[#e5e5e5]/70 pb-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="bg-[#0a0a0a]/8 flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            PM
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">Plan de masse</p>
                            <p className="text-[#737373] text-xs">Indice C · p. 02</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            tabIndex={0}
                            data-slot="button"
                            className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 text-[#171717] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5 h-8 rounded-[6px] border border-[#d4d4d4] bg-transparent px-3 text-xs hover:bg-[#0a0a0a]/5"
                          >
                            Ouvrir la planche
                          </button>
                        </div>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col py-4">
                        <p className="text-sm">Point relevé</p>
                        <p className="mt-4 text-sm leading-6">
                          La cote de recul lue sur le plan de masse (4,80 m) diffère de celle de la coupe AA (5,20 m).
                          Le PLU impose 5,00 m au minimum en limite séparative, donc l&apos;une des deux pièces met le
                          permis en défaut.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span
                            data-slot="badge"
                            data-variant="outline"
                            className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center overflow-hidden rounded-4xl border px-2 py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! border-[#e5e5e5] text-[#0a0a0a] [a]:hover:bg-[#f5f5f5] [a]:hover:text-[#737373] gap-1 text-[11px]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-paperclip size-3"
                              aria-hidden="true"
                            >
                              <path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"></path>
                            </svg>
                            Plan de masse · indice C.pdf
                          </span>
                        </div>
                        <p className="mt-5 whitespace-pre-line text-sm">Pièces concernées : PC2, coupe AA</p>
                        <div className="mt-4 ml-auto flex max-w-[92%] items-start gap-2">
                          <TuileSigne className="mt-0.5 size-5" />
                          <div>
                            <div className="rounded-[14px] bg-[#f5f5f5] p-3">
                              <p className="text-[#737373] text-xs leading-5">
                                Proposition : retenir 5,20 m sur le plan de masse et le plan RDC, puis vérifier la
                                surface de plancher qui en découle. Aucun fichier n&apos;a été modifié.
                              </p>
                            </div>
                            <p className="text-[#737373] mt-1 px-1 text-[11px]">Pièces lues : 42 planches</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded-[10px] border border-[#e5e5e5]/70 p-2">
                        <span className="text-[#737373] flex-1 px-1 text-xs">Transformer en question au BET</span>
                        <button
                          type="button"
                          tabIndex={0}
                          data-slot="button"
                          aria-label="Envoyer"
                          className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 bg-[#f5f5f5] text-[#171717] hover:bg-[#f5f5f5]/80 size-6 [&_svg:not([class*='size-'])]:size-3"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-send"
                            aria-hidden="true"
                          >
                            <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"></path>
                            <path d="m21.854 2.147-10.94 10.939"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-sm:*:not-last:border-b max-sm:*:not-last:pb-3 mt-12 grid gap-3 *:max-w-xs sm:grid-cols-2 md:mt-16 md:gap-y-6 lg:mt-24 lg:grid-cols-4 lg:gap-6">
              <p className="text-[#737373] text-balance">
                <span className="text-[#0a0a0a] font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-arrow-left-right inline size-4 -translate-y-0.5"
                    aria-hidden="true"
                  >
                    <path d="M8 3 4 7l4 4"></path>
                    <path d="M4 7h16"></path>
                    <path d="m16 21 4-4-4-4"></path>
                    <path d="M20 17H4"></path>
                  </svg>{" "}
                  Une preuve par point.
                </span>{" "}
                Chaque point cite la pièce, la page et la valeur lue, si bien que l&apos;équipe corrige sans chercher.
              </p>
              <p className="text-[#737373] text-balance">
                <span className="text-[#0a0a0a] font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-bell inline size-4 -translate-y-0.5"
                    aria-hidden="true"
                  >
                    <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
                  </svg>{" "}
                  Bloquant d&apos;abord.
                </span>{" "}
                Les points sont classés en bloquant, à vérifier ou mineur, et ce qui met le permis ou le marché en
                défaut passe en tête.
              </p>
              <p className="text-[#737373] text-balance">
                <span className="text-[#0a0a0a] font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-users inline size-4 -translate-y-0.5"
                    aria-hidden="true"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>{" "}
                  Indices suivis.
                </span>{" "}
                Quand un indice change, seuls les écarts nouveaux remontent.
              </p>
              <p className="text-[#737373] text-balance">
                <span className="text-[#0a0a0a] font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chart-line inline size-4 -translate-y-0.5"
                    aria-hidden="true"
                  >
                    <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                    <path d="m19 9-5 5-4-4-3 3"></path>
                  </svg>{" "}
                  Vos règles internes.
                </span>{" "}
                Les listes de contrôle et la charte graphique de l&apos;agence s&apos;ajoutent aux contrôles
                réglementaires.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
