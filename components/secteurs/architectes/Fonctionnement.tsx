/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — Fonctionnement.tsx, « 02 — Fonctionnement »

   COPIÉ le 24/09/2026 à 14 h 57 de `OMEGA/dossieros-site/src/components/
   sections/05-how-it-works.tsx` (GÉNÉRÉ côté source par
   `outils/assembler.py` ; ici une copie du résultat, corrigée à la main).
   Quatre onglets (plans, offres, situations, visa) et une barre latérale
   collante que `onglets.tsx` tient à jour. Ce qui change :

   · JETONS (outil) — les `dark:` (19) sont retirés ; ce qui reste est le
     thème clair de la référence : foreground → #0a0a0a, muted-foreground
     → #737373, muted/secondary/accent → #f5f5f5, primary et
     secondary-foreground → #171717, secondary et primary-foreground →
     #f5f5f5 / #fafafa, border → #e5e5e5, ring → #a1a1a1, destructive →
     #e40014. Le badge « Nouveau » (bg-secondary-foreground) devient donc
     une pastille d'encre, comme dans le thème clair de la référence.

   · CE QUI ÉTAIT ÉCRIT EN SOMBRE EN DUR, repris un par un (le sens de
     chaque effet est gardé, pas sa valeur) :
       liseré de la carte « Plan RDC »    #a1a1aa → #f4f4f5 (cœur blanc)
                                        → #a1a1aa → #3f3f46 (cœur d'encre)
       ligne de balayage des offres      cœur rgba(250,250,250,.95), halo
                                          rgba(212,212,216,.7)
                                        → cœur rgba(63,63,70,.9), halo
                                          rgba(113,113,122,.3)
       cartes des offres, filet au survol hover:border-white/20
                                        → hover:border-[#0a0a0a]/20
       cadre de la carte « Lot 03 »       bg-[#161616] (anneau de 2 px où
                                          court le liseré), lueur
                                          rgba(244,244,245,.18)
                                        → bg-[#e5e5e5], ombre
                                          rgba(10,10,10,.08)
       son liseré                         zinc-500 → #fafafa, halo blanc
                                          à 38 % → zinc-500 → #27272a,
                                          ombre d'encre à 15 %
       texte argenté (« 55 % », lien)     zinc-300 → blanc → zinc-400
                                        → zinc-600 → #0a0a0a → zinc-500
       panneau « Points relevés »         bg-[#0f0f0f] → #ffffff fileté
       `mask-b-from-background`           (jeton absent ici) →
                                          mask-b-from-[#ffffff]
     Les pastilles métalliques (zinc-700 → 300 → 700, texte noir) restent :
     un métal se lit sur les deux fonds.

   · Planche d'architecte en fond de l'en-tête : la source posait des
     traits BLANCS sur transparence ; ceux de public/secteurs-architectes/
     plans/ sont les mêmes traits passés à l'encre (#171717, même canal
     alpha), à la même opacité.

   · Barre latérale collante `top-24` (96 px sous l'entête fixe de 60 px de
     la source, soit 36 px d'air) → `top-[108px]` : les mêmes 36 px sous
     l'entête d'Omega (72 px ; la barre n'existe que dès `lg`).

   · Rayons : `rounded-lg` / `rounded-xl` → 10 / 14 px (la source les
     dérivait de `--radius: .625rem`).

   · PAGE PLEINE : section posée dans la marge de 30 px du cadre de la
     source (page.tsx), sans ses filets verticaux.
   · REPORT du 24/09, 17 h 00 (seconde copie de la source) : une autre
     session a ajouté des fonctions au site source entre 16 h 00 et 16 h 32
     (Teo : « ajoute tout sur les sites »). Ici : une puce de plus sous
     chacun des quatre onglets (purge des recours, métré, décennales,
     ordres de service, date butoir des visas) et trois points relevés de
     plus dans le panneau du visa (VI, QB, MT). Report par fusion à trois
     voies (ancienne copie convertie → nouvelle copie convertie, appliquée à
     ce fichier) : les conversions ci-dessus s'appliquent au contenu ajouté,
     vérifié ligne à ligne.
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- icônes SVG de 16 à 20 px et planche décorative, dans des maquettes : pas d'optimiseur. */
import React from "react";
import BorderBeam from "./lisere";

export default function Fonctionnement() {
  return (
    <>
      <div id="how-it-works" className="scroll-mt-24">
        <section className="relative isolate py-16 md:py-20">
          <div
            aria-hidden="true"
            data-reveal="1"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden h-[400px] md:h-[330px] [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
          >
            <img
              alt=""
              loading="lazy"
              decoding="async"
              width="1600"
              height="920"
              src="/secteurs-architectes/plans/cafe-restaurant.webp"
              className="absolute -top-[90px] right-[-2%] w-[min(66%,940px)] max-w-none select-none opacity-[0.22] [mask-image:radial-gradient(ellipse_62%_62%_at_58%_46%,black_32%,transparent_80%)] max-md:top-0 max-md:right-[-42%] max-md:w-[118%] max-md:opacity-[0.13]"
            />
          </div>
          <div className="mx-auto max-w-7xl px-6">
            <span className="mb-5 block font-mono text-[11px] uppercase tracking-[0.22em] text-[#0a0a0a]/40">
              02 — Fonctionnement
            </span>
            <h2 className="text-[#737373] max-w-4xl text-balance text-4xl font-medium tracking-tight">
              <span className="text-[#0a0a0a]">Quatre contrôles suivent la mission,</span> <br /> du permis à la
              réception.
            </h2>
            <div className="mt-16 grid gap-6 md:mt-32 lg:grid-cols-[auto_1fr]">
              <div className="sticky top-[108px] h-fit w-56 max-lg:hidden">
                <div className="text-[#737373] text-sm">Lorani</div>
                <div className="-ml-4 mt-4 flex flex-col *:justify-start">
                  <button
                    type="button"
                    tabIndex={0}
                    data-slot="button"
                    data-state="active"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:text-[#171717] h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 not-data-[state=active]:text-[#737373] hover:bg-transparent"
                  >
                    Permis et DCE
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    data-slot="button"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:text-[#171717] h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 not-data-[state=active]:text-[#737373] hover:bg-transparent"
                  >
                    Analyse des offres
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    data-slot="button"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:text-[#171717] h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 not-data-[state=active]:text-[#737373] hover:bg-transparent"
                  >
                    Situations de travaux
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    data-slot="button"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a1a1a1] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none active:scale-98 duration-200 [&_svg]:size-4 [&_svg]:shrink-0 hover:text-[#171717] h-9 px-4 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 not-data-[state=active]:text-[#737373] hover:bg-transparent"
                  >
                    Visa des documents
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-16 md:gap-32">
                <div
                  id="workflow-agents"
                  className="grid scroll-mt-32 gap-6 sm:grid-cols-2 md:grid-cols-5 lg:gap-12 *:min-w-0"
                >
                  <div className="flex flex-col justify-between pb-4 md:col-span-2">
                    <div className="md:pr-6 lg:pr-0">
                      <h3 className="text-[#737373] mb-6 text-sm font-medium">Permis et DCE</h3>
                      <p className="text-[#737373] text-balance text-lg font-medium">
                        <span className="text-[#0a0a0a]">Aucune planche n&apos;est lue seule.</span> Lorani compare chaque planche aux autres et au CCTP, puis signale chaque incohérence avec la page concernée.
                      </p>
                    </div>
                    <ul className="text-[#737373] mt-8 divide-y *:flex *:items-center *:gap-3 *:py-3">
                      <li>
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
                          className="lucide lucide-arrow-right-left size-4"
                          aria-hidden="true"
                        >
                          <path d="m16 3 4 4-4 4"></path>
                          <path d="M20 7H4"></path>
                          <path d="m8 21-4-4 4-4"></path>
                          <path d="M4 17h16"></path>
                        </svg>
                        Pièces PC1 à PC8 et surfaces
                      </li>
                      <li>
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
                          className="lucide lucide-list-checks size-4"
                          aria-hidden="true"
                        >
                          <path d="M13 5h8"></path>
                          <path d="M13 12h8"></path>
                          <path d="M13 19h8"></path>
                          <path d="m3 17 2 2 4-4"></path>
                          <path d="m3 7 2 2 4-4"></path>
                        </svg>
                        Plans contre CCTP et DPGF
                      </li>
                      <li>
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
                          className="lucide lucide-zap size-4"
                          aria-hidden="true"
                        >
                          <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>
                        </svg>
                        Règles du PLU citées par article
                      </li>
                      <li>
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
                          className="lucide lucide-zap size-4"
                          aria-hidden="true"
                        >
                          <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>
                        </svg>
                        Délai d&apos;instruction suivi jusqu&apos;à la purge
                      </li>
                    </ul>
                  </div>
                  <div className="border-[#e5e5e5]/50 bg-[#0a0a0a]/2 relative flex aspect-square items-end rounded-3xl border px-3 pt-3 md:col-span-3">
                    <div className="border-[#e5e5e5]/50 relative m-auto w-full max-w-sm rounded-[2.5rem] border p-3">
                      <div className="bg-[#0a0a0a]/2 ring-[#0a0a0a]/10 rounded-[2rem] p-3 ring">
                        <div className="bg-transparent relative overflow-hidden rounded-[1.5rem] p-4">
                          <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-[#171717]/10 text-[#171717] flex size-8 items-center justify-center rounded-full">
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
                                  className="lucide lucide-arrow-right-left size-4"
                                  aria-hidden="true"
                                >
                                  <path d="m16 3 4 4-4 4"></path>
                                  <path d="M20 7H4"></path>
                                  <path d="m8 21-4-4 4-4"></path>
                                  <path d="M4 17h16"></path>
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium">Dossier reçu</p>
                                <p className="text-[#737373] text-xs">Indice C · 42 planches</p>
                              </div>
                            </div>
                            <span
                              data-slot="badge"
                              data-variant="inverted"
                              className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#171717] text-[#f5f5f5]"
                            >
                              Nouveau
                            </span>
                          </div>
                          <div className="relative mt-4 overflow-hidden rounded-[14px]">
                            <BorderBeam lightColor="#a1a1aa" lightColorEnd="#3f3f46" lightWidth={120} duration={3.6} />
                            <div className="bg-[#f5f5f5] relative rounded-[14px] p-3">
                              <p className="text-[#737373] text-xs">Plan RDC</p>
                              <p className="mt-1 text-sm">
                                La cote de recul diffère entre le plan de masse et la coupe AA.
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-col gap-2">
                            <div className="border-[#e5e5e5]/70 flex items-center gap-3 rounded-[14px] border px-3 py-2.5">
                              <div className="bg-[#0a0a0a]/5 text-[#737373] flex size-8 shrink-0 items-center justify-center rounded-[10px]">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  color="currentColor"
                                  className=""
                                  strokeWidth="1.8"
                                  stroke="currentColor"
                                >
                                  <path
                                    d="M21.9165 10.5001C21.9351 10.6557 21.9495 10.8127 21.9598 10.9708C22.0134 11.801 22.0134 12.6608 21.9598 13.491C21.6856 17.7333 18.3536 21.1126 14.1706 21.3906C12.7435 21.4855 11.2536 21.4853 9.8294 21.3906C9.33896 21.358 8.8044 21.241 8.34401 21.0514C7.83177 20.8404 7.5756 20.7349 7.44544 20.7509C7.31527 20.7669 7.1264 20.9062 6.74868 21.1847C6.08268 21.6758 5.24367 22.0286 3.99943 21.9983C3.37026 21.983 3.05568 21.9753 2.91484 21.7352C2.77401 21.4951 2.94941 21.1627 3.30021 20.4979C3.78674 19.5759 4.09501 18.5204 3.62791 17.6747C2.82343 16.4667 2.1401 15.0361 2.04024 13.491C1.98659 12.6608 1.98659 11.801 2.04024 10.9708C2.31441 6.7285 5.64639 3.34925 9.8294 3.07119C11.0318 2.99126 12.2812 2.97868 13.5 3.0338"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M8.5 15.0001H15.5M8.5 10.0001H11"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M20.8684 2.43946L21.5607 3.13183C22.1465 3.71761 22.1465 4.66736 21.5607 5.25315L17.9333 8.94881C17.648 9.23416 17.283 9.42652 16.8863 9.50061L14.6381 9.98865C14.2832 10.0657 13.9671 9.75054 14.0431 9.39537L14.5217 7.16005C14.5958 6.76336 14.7881 6.39836 15.0735 6.11301L18.747 2.43946C19.3328 1.85368 20.2826 1.85368 20.8684 2.43946Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">Contradiction relevée</p>
                                <p className="text-[#737373] truncate text-xs">Plan de masse · coupe AA</p>
                              </div>
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
                                className="lucide lucide-zap text-[#171717] size-4 shrink-0"
                                aria-hidden="true"
                              >
                                <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>
                              </svg>
                            </div>
                            <div className="border-[#e5e5e5]/70 flex items-center gap-3 rounded-[14px] border px-3 py-2.5">
                              <div className="bg-[#0a0a0a]/5 text-[#737373] flex size-8 shrink-0 items-center justify-center rounded-[10px]">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  color="currentColor"
                                  className=""
                                  strokeWidth="1.8"
                                  stroke="currentColor"
                                >
                                  <path
                                    d="M16 2V6M8 2V6"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M21 13V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M3 10H21"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M17.5 18.5C16.3954 18.5 15.5 17.6046 15.5 16.5C15.5 15.3954 16.3954 14.5 17.5 14.5C18.6046 14.5 19.5 15.3954 19.5 16.5C19.5 17.6046 18.6046 18.5 17.5 18.5ZM17.5 18.5C19.433 18.5 21 20.067 21 22M17.5 18.5C15.567 18.5 14 20.067 14 22"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">Page pointée</p>
                                <p className="text-[#737373] truncate text-xs">Planche 07, détail 3</p>
                              </div>
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
                                className="lucide lucide-zap text-[#171717] size-4 shrink-0"
                                aria-hidden="true"
                              >
                                <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>
                              </svg>
                            </div>
                            <div className="border-[#e5e5e5]/70 flex items-center gap-3 rounded-[14px] border px-3 py-2.5">
                              <div className="bg-[#0a0a0a]/5 text-[#737373] flex size-8 shrink-0 items-center justify-center rounded-[10px]">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  color="currentColor"
                                  className=""
                                  strokeWidth="1.8"
                                  stroke="currentColor"
                                >
                                  <path
                                    d="M15 8C15 5.23858 12.7614 3 10 3C7.23858 3 5 5.23858 5 8C5 10.7614 7.23858 13 10 13C12.7614 13 15 10.7614 15 8Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M3 20C3 16.134 6.13401 13 10 13C11.275 13 12.4704 13.3409 13.5 13.9365"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                  <path
                                    d="M18.1047 14.5055L18.7206 15.7475C18.8046 15.9204 19.0286 16.0862 19.2175 16.118L20.3339 16.305C21.0478 16.425 21.2158 16.9472 20.7014 17.4624L19.8335 18.3374C19.6865 18.4856 19.606 18.7715 19.6515 18.9761L19.9 20.0594C20.096 20.9168 19.6445 21.2485 18.8921 20.8004L17.8457 20.1758C17.6567 20.0629 17.3453 20.0629 17.1528 20.1758L16.1064 20.8004C15.3575 21.2485 14.9025 20.9133 15.0985 20.0594L15.347 18.9761C15.3925 18.7715 15.312 18.4856 15.165 18.3374L14.2971 17.4624C13.7861 16.9472 13.9506 16.425 14.6646 16.305L15.7809 16.118C15.9664 16.0862 16.1904 15.9204 16.2744 15.7475L16.8903 14.5055C17.2263 13.8315 17.7722 13.8315 18.1047 14.5055Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                  ></path>
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">À trancher par l&apos;architecte</p>
                                <p className="text-[#737373] truncate text-xs">Pièces jointes</p>
                              </div>
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
                                className="lucide lucide-zap text-[#171717] size-4 shrink-0"
                                aria-hidden="true"
                              >
                                <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"></path>
                              </svg>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t pt-3">
                            <span className="text-[#737373] text-xs">Lorani ne modifie rien</span>
                            <span
                              data-slot="badge"
                              data-variant="success"
                              className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#0a0a0a]/10 text-[#0a0a0a]/60"
                            >
                              Prêt
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div id="alerts" className="grid scroll-mt-32 gap-6 sm:grid-cols-2 md:grid-cols-5 lg:gap-12 *:min-w-0">
                  <div className="flex flex-col justify-between pb-4 md:col-span-2">
                    <div className="md:pr-6 lg:pr-0">
                      <h3 className="text-[#737373] mb-6 text-sm font-medium">Analyse des offres</h3>
                      <p className="text-[#737373] text-balance text-lg font-medium">
                        <span className="text-[#0a0a0a]">Chaque offre est alignée sur la DPGF.</span> Lorani compare les offres reçues ligne par ligne, si bien que les postes non chiffrés ressortent avant l&apos;attribution.
                      </p>
                    </div>
                    <ul className="text-[#737373] mt-8 divide-y *:flex *:items-center *:gap-3 *:py-3">
                      <li>
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
                          className="lucide lucide-bell size-4"
                          aria-hidden="true"
                        >
                          <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                          <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
                        </svg>
                        Postes non chiffrés et réserves
                      </li>
                      <li>
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
                          className="lucide lucide-clock size-4"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 6v6l4 2"></path>
                        </svg>
                        Écarts à l&apos;estimation par ligne
                      </li>
                      <li>
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
                          className="lucide lucide-activity size-4"
                          aria-hidden="true"
                        >
                          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                        </svg>
                        Rapport d&apos;analyse prêt à signer
                      </li>
                      <li>
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
                          className="lucide lucide-activity size-4"
                          aria-hidden="true"
                        >
                          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                        </svg>
                        Métré des plans contre les quantités
                      </li>
                      <li>
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
                          className="lucide lucide-activity size-4"
                          aria-hidden="true"
                        >
                          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                        </svg>
                        Décennales contrôlées contre le lot
                      </li>
                    </ul>
                  </div>
                  <div className="border-[#e5e5e5]/50 bg-[#0a0a0a]/2 relative flex aspect-square overflow-hidden rounded-3xl border p-3 md:col-span-3">
                    <div className="relative size-full">
                      <div className="flex min-h-[400px] w-full items-center justify-center py-20">
                        <div className="w-full max-w-3xl -translate-x-16 -translate-y-10 max-md:translate-x-0">
                          <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 duration-700">
                            <div className="relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-[14px] border-2 bg-[#f5f5f5]/70 px-4 py-3 backdrop-blur-sm transition-all duration-700 after:pointer-events-none after:absolute after:top-[-5%] after:-right-1 after:z-20 after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-[#ffffff] after:via-[#ffffff]/90 after:to-transparent after:blur-sm after:content-[''] hover:border-[#0a0a0a]/20 hover:bg-[#f5f5f5] [&>*]:flex [&>*]:items-center [&>*]:gap-2 [grid-area:stack] hover:-translate-y-10 before:absolute before:top-0 before:left-0 before:h-[100%] before:w-[100%] before:rounded-[14px] before:bg-[#ffffff]/50 before:bg-blend-overlay before:outline-1 before:outline-[#e5e5e5] before:content-[''] before:grayscale-[100%] before:transition-opacity before:duration-700 hover:grayscale-0 hover:before:opacity-0">
                              <div>
                                <span className="relative inline-block rounded-full bg-transparent p-0">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="16"
                                    height="16"
                                    decoding="async"
                                    data-nimg="1"
                                    className="rounded-[5px]"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/offres.svg"
                                  />
                                </span>
                                <p className="text-lg font-medium text-[#0a0a0a]">Lot 03 · Gros œuvre</p>
                              </div>
                              <p className="whitespace-nowrap text-lg">Offre reçue, 128 lignes</p>
                              <div className="relative z-30 flex w-full items-center justify-between gap-2">
                                <p className="text-[#737373]">À l&apos;instant</p>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#171717] [a]:hover:bg-[#171717]/80 bg-linear-to-r from-zinc-700 via-zinc-300 to-zinc-700 text-black"
                                >
                                  Complet
                                </span>
                              </div>
                            </div>
                            <div className="relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-[14px] border-2 bg-[#f5f5f5]/70 px-4 py-3 backdrop-blur-sm transition-all duration-700 after:pointer-events-none after:absolute after:top-[-5%] after:-right-1 after:z-20 after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-[#ffffff] after:via-[#ffffff]/90 after:to-transparent after:blur-sm after:content-[''] hover:border-[#0a0a0a]/20 hover:bg-[#f5f5f5] [&>*]:flex [&>*]:items-center [&>*]:gap-2 [grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:top-0 before:left-0 before:h-[100%] before:w-[100%] before:rounded-[14px] before:bg-[#ffffff]/50 before:bg-blend-overlay before:outline-1 before:outline-[#e5e5e5] before:content-[''] before:grayscale-[100%] before:transition-opacity before:duration-700 hover:grayscale-0 hover:before:opacity-0">
                              <div>
                                <span className="relative inline-block rounded-full bg-transparent p-0">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="16"
                                    height="16"
                                    decoding="async"
                                    data-nimg="1"
                                    className="rounded-[5px]"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/plans.svg"
                                  />
                                </span>
                                <p className="text-lg font-medium text-[#0a0a0a]">Lot 08 · Menuiseries</p>
                              </div>
                              <p className="whitespace-nowrap text-lg">2 postes non chiffrés</p>
                              <div className="relative z-30 flex w-full items-center justify-between gap-2">
                                <p className="text-[#737373]">À l&apos;instant</p>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#171717] [a]:hover:bg-[#171717]/80 bg-linear-to-r from-zinc-700 via-zinc-300 to-zinc-700 text-black"
                                >
                                  À vérifier
                                </span>
                              </div>
                            </div>
                            <div className="relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-[14px] border-2 bg-[#f5f5f5]/70 px-4 py-3 backdrop-blur-sm transition-all duration-700 after:pointer-events-none after:absolute after:top-[-5%] after:-right-1 after:z-20 after:h-[110%] after:w-[20rem] after:bg-gradient-to-l after:from-[#ffffff] after:via-[#ffffff]/90 after:to-transparent after:blur-sm after:content-[''] hover:border-[#0a0a0a]/20 hover:bg-[#f5f5f5] [&>*]:flex [&>*]:items-center [&>*]:gap-2 [grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10">
                              <div>
                                <span className="relative inline-block rounded-full bg-transparent p-0">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="16"
                                    height="16"
                                    decoding="async"
                                    data-nimg="1"
                                    className="rounded-[5px]"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/situations.svg"
                                  />
                                </span>
                                <p className="text-lg font-medium text-[#0a0a0a]">Lot 12 · Peinture</p>
                              </div>
                              <p className="whitespace-nowrap text-lg">Écart de 31 % sur le poste 4</p>
                              <div className="relative z-30 flex w-full items-center justify-between gap-2">
                                <p className="text-[#737373]">À l&apos;instant</p>
                                <span
                                  data-slot="badge"
                                  data-variant="default"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#171717] [a]:hover:bg-[#171717]/80 bg-linear-to-r from-zinc-700 via-zinc-300 to-zinc-700 text-black"
                                >
                                  Écart
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-x-3 bottom-3 z-20 sm:inset-x-5 sm:bottom-5">
                        <div
                          aria-label="Lorani lit chaque pièce dès sa réception"
                          className="relative flex h-30 w-full items-center justify-center overflow-hidden px-5 sm:h-34"
                        >
                          <div
                            aria-hidden="true"
                            className="animate-[architectes-scan-canaux_3.3s_linear_infinite] motion-reduce:animate-none absolute top-0 bottom-0 z-10 w-[2px] bg-[linear-gradient(to_bottom,transparent_0%,rgba(161,161,170,0.55)_18%,rgba(63,63,70,0.9)_50%,rgba(161,161,170,0.55)_82%,transparent_100%)] shadow-[0_0_18px_rgba(113,113,122,0.3)]"
                          ></div>
                          <div className="relative z-20 flex w-full max-w-sm items-center justify-between gap-2 sm:max-w-md sm:gap-3">
                            <div
                              className="flex shrink-0 items-center justify-center rounded-full bg-[#0a0a0a]/10 text-[#737373] shadow-lg shadow-black/15 backdrop-blur-xl size-9 sm:size-10 animate-[architectes-pouls-canal_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                              style={{ animationDelay: "0.00s" }}
                            >
                              <img
                                alt=""
                                loading="lazy"
                                width="20"
                                height="20"
                                decoding="async"
                                data-nimg="1"
                                className="object-contain size-5"
                                style={{ color: "transparent" }}
                                src="/secteurs-architectes/icones/offres.svg"
                              />
                              <span className="sr-only">Plans d&apos;exécution</span>
                            </div>
                            <div
                              className="flex shrink-0 items-center justify-center rounded-full bg-[#0a0a0a]/10 text-[#737373] shadow-lg shadow-black/15 backdrop-blur-xl size-13 sm:size-14 animate-[architectes-pouls-canal_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                              style={{ animationDelay: "0.14s" }}
                            >
                              <img
                                alt=""
                                loading="lazy"
                                width="20"
                                height="20"
                                decoding="async"
                                data-nimg="1"
                                className="object-contain size-5"
                                style={{ color: "transparent" }}
                                src="/secteurs-architectes/icones/plans.svg"
                              />
                              <span className="sr-only">Fiches techniques</span>
                            </div>
                            <div
                              className="flex shrink-0 items-center justify-center rounded-full bg-[#0a0a0a]/10 backdrop-blur-xl size-18 sm:size-20 text-[#0a0a0a] shadow-xl shadow-black/25 animate-[architectes-pouls-canal_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                              style={{ animationDelay: "0.28s" }}
                            >
                              <img
                                alt=""
                                loading="lazy"
                                width="32"
                                height="32"
                                decoding="async"
                                data-nimg="1"
                                className="object-contain size-8"
                                style={{ color: "transparent" }}
                                src="/secteurs-architectes/icones/situations.svg"
                              />
                              <span className="sr-only">Notes de calcul</span>
                            </div>
                            <div
                              className="flex shrink-0 items-center justify-center rounded-full bg-[#0a0a0a]/10 text-[#737373] shadow-lg shadow-black/15 backdrop-blur-xl size-13 sm:size-14 animate-[architectes-pouls-canal_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                              style={{ animationDelay: "0.42s" }}
                            >
                              <img
                                alt=""
                                loading="lazy"
                                width="20"
                                height="20"
                                decoding="async"
                                data-nimg="1"
                                className="object-contain size-5"
                                style={{ color: "transparent" }}
                                src="/secteurs-architectes/icones/visa.svg"
                              />
                              <span className="sr-only">Échantillons</span>
                            </div>
                            <div
                              className="flex shrink-0 items-center justify-center rounded-full bg-[#0a0a0a]/10 text-[#737373] shadow-lg shadow-black/15 backdrop-blur-xl size-9 sm:size-10 animate-[architectes-pouls-canal_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
                              style={{ animationDelay: "0.56s" }}
                            >
                              <img
                                alt=""
                                loading="lazy"
                                width="20"
                                height="20"
                                decoding="async"
                                data-nimg="1"
                                className="object-contain size-5"
                                style={{ color: "transparent" }}
                                src="/secteurs-architectes/icones/permis.svg"
                              />
                              <span className="sr-only">PV d&apos;essais</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  id="timeline"
                  className="grid scroll-mt-32 gap-6 sm:grid-cols-2 md:grid-cols-5 lg:gap-12 *:min-w-0"
                >
                  <div className="flex flex-col justify-between pb-4 md:col-span-2">
                    <div className="md:pr-6 lg:pr-0">
                      <h3 className="text-[#737373] mb-6 text-sm font-medium">Situations de travaux</h3>
                      <p className="text-[#737373] text-balance text-lg font-medium">
                        <span className="text-[#0a0a0a]">Chaque situation est contrôlée.</span> Lorani compare la situation reçue au marché, à la précédente et au compte rendu de chantier, puis chiffre l&apos;écart.
                      </p>
                    </div>
                    <ul className="text-[#737373] mt-8 divide-y *:flex *:items-center *:gap-3 *:py-3">
                      <li>
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
                          className="lucide lucide-rotate-ccw-clock size-4"
                          aria-hidden="true"
                        >
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                          <path d="M3 3v5h5"></path>
                          <path d="M12 7v5l4 2"></path>
                        </svg>
                        Marché, avenants et révision BT
                      </li>
                      <li>
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
                          className="lucide lucide-users size-4"
                          aria-hidden="true"
                        >
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                        </svg>
                        Avancement déclaré contre constaté
                      </li>
                      <li>
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
                          className="lucide lucide-mail size-4"
                          aria-hidden="true"
                        >
                          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        </svg>
                        Retenue, avance et pénalités recalculées
                      </li>
                      <li>
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
                          className="lucide lucide-mail size-4"
                          aria-hidden="true"
                        >
                          <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                          <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        </svg>
                        Ordres de service : montant et délai
                      </li>
                    </ul>
                  </div>
                  <div className="border-[#e5e5e5]/50 bg-[#0a0a0a]/2 relative flex aspect-square items-end rounded-3xl border px-3 pt-3 md:col-span-3">
                    <div
                      aria-hidden="true"
                      className="z-1 mask-b-from-[#ffffff] border-[#e5e5e5]/50 absolute inset-x-4 bottom-0 mx-auto mt-auto h-[74%] w-auto origin-bottom rounded-t-[4rem] border px-4 pt-4"
                    >
                      <div className="bg-[#0a0a0a]/2 ring-[#0a0a0a]/10 h-full overflow-hidden rounded-t-[3rem] p-3 shadow-lg shadow-black/15 ring">
                        <div className="relative">
                          <div className="relative rounded-[2.25rem] bg-[#e5e5e5] p-[2px] shadow-[0_0_20px_rgba(10,10,10,0.08)]">
                            <BorderBeam
                              borderWidth={2}
                              className="drop-shadow-[0_0_5px_rgba(10,10,10,0.15)]"
                              duration={3}
                              lightColor="#71717a"
                              lightColorEnd="#27272a"
                              lightWidth={110}
                            />
                            <div className="bg-[#ffffff] relative z-10 rounded-[calc(2.25rem-2px)] p-2">
                              <div className="flex gap-2">
                                <div className="size-18 relative overflow-hidden rounded-[1.75rem] shadow-md before:absolute before:inset-0 before:rounded-[1.75rem] before:border before:border-black/20">
                                  <img
                                    alt="Amanda Myburg"
                                    loading="lazy"
                                    width="136"
                                    height="136"
                                    decoding="async"
                                    data-nimg="1"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/situations.svg"
                                  />
                                </div>
                                <div className="py-1 pr-4">
                                  <div className="text-sm font-medium">Lot 03 · Situation n° 4</div>
                                  <div className="mt-1.5 flex items-center gap-3">
                                    <div>
                                      <div className="text-[#0a0a0a]/50 text-xs">Facturé</div>
                                      <div className="mt-0.5 text-sm font-semibold">62 %</div>
                                    </div>
                                    <div className="bg-[#e5e5e5] h-7 w-px"></div>
                                    <div>
                                      <div className="text-[#0a0a0a]/50 text-xs">Constaté</div>
                                      <div className="mt-0.5 text-sm font-semibold">55 %</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="relative mt-5 px-1">
                          <p className="text-[#737373] text-sm font-medium">Historique du lot</p>
                          <div className="relative mt-3 flex flex-col gap-5">
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                              <div className="relative">
                                <div className="bg-[#ffffff] border-[#e5e5e5]/70 relative z-10 flex size-8 items-center justify-center rounded-full border">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="14"
                                    height="14"
                                    decoding="async"
                                    data-nimg="1"
                                    className="hidden size-3.5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/glyphes/permis.svg"
                                  />
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="14"
                                    height="14"
                                    decoding="async"
                                    data-nimg="1"
                                    className="size-3.5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/glyphes/permis.svg"
                                  />
                                </div>
                                <div
                                  aria-hidden="true"
                                  className="bg-[#e5e5e5] absolute top-8 bottom-[-1.25rem] left-1/2 w-px -translate-x-1/2"
                                ></div>
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p className="text-sm font-medium">Situation n° 3 visée</p>
                                <div className="text-[#737373] mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs">
                                  <span>Avancement retenu</span>
                                  <img
                                    alt="Amanda Myburg"
                                    loading="lazy"
                                    width="20"
                                    height="20"
                                    decoding="async"
                                    data-nimg="1"
                                    className="size-5 rounded-full object-cover ring-1 ring-[#0a0a0a]/20"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/situations.svg"
                                  />
                                  <span className="bg-linear-to-r from-zinc-600 via-[#0a0a0a] to-zinc-500 bg-clip-text font-medium text-transparent">
                                    48 %
                                  </span>
                                </div>
                                <div className="bg-[#f5f5f5]/60 border-[#e5e5e5]/70 mt-2 flex items-center justify-between rounded-[10px] border px-2 py-1.5">
                                  <div>
                                    <p className="text-xs font-medium">Situation n° 3</p>
                                    <p className="text-[#737373] text-[10px]">Document · PDF</p>
                                  </div>
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="24"
                                    height="24"
                                    decoding="async"
                                    data-nimg="1"
                                    className="hidden size-6 -rotate-6 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/pdf-gris.svg"
                                  />
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="24"
                                    height="24"
                                    decoding="async"
                                    data-nimg="1"
                                    className="size-6 -rotate-6 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/pdf-gris.svg"
                                  />
                                </div>
                                <p className="mt-2 text-xs font-medium">Il y a 30 jours</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                              <div className="relative">
                                <div className="bg-[#ffffff] border-[#e5e5e5]/70 relative z-10 flex size-8 items-center justify-center rounded-full border">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="14"
                                    height="14"
                                    decoding="async"
                                    data-nimg="1"
                                    className="hidden size-3.5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/glyphes/permis.svg"
                                  />
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="14"
                                    height="14"
                                    decoding="async"
                                    data-nimg="1"
                                    className="size-3.5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/glyphes/permis.svg"
                                  />
                                </div>
                                <div
                                  aria-hidden="true"
                                  className="bg-[#e5e5e5] absolute top-8 bottom-[-8rem] left-1/2 w-px -translate-x-1/2"
                                ></div>
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p className="text-sm font-medium">Avenant n° 1 signé</p>
                                <p className="text-[#737373] mt-0.5 whitespace-nowrap text-xs">
                                  Plus-value intégrée au marché <span className="text-[#0a0a0a]">12 400 €</span>
                                </p>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="20"
                                    height="20"
                                    decoding="async"
                                    data-nimg="1"
                                    className="hidden size-5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/pdf-gris.svg"
                                  />
                                  <img
                                    alt=""
                                    loading="lazy"
                                    width="20"
                                    height="20"
                                    decoding="async"
                                    data-nimg="1"
                                    className="size-5 object-contain"
                                    style={{ color: "transparent" }}
                                    src="/secteurs-architectes/icones/pdf-gris.svg"
                                  />
                                  <p className="text-xs">
                                    Marché mis à jour{" "}
                                    <span className="bg-linear-to-r from-zinc-600 via-[#0a0a0a] to-zinc-500 bg-clip-text font-medium text-transparent underline underline-offset-2">
                                      n° 03-A1
                                    </span>{" "}
                                    enregistré
                                  </p>
                                </div>
                                <p className="mt-2 text-xs font-medium">Il y a 45 jours</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  id="integrations"
                  className="grid scroll-mt-32 gap-6 sm:grid-cols-2 md:grid-cols-5 lg:gap-12 *:min-w-0"
                >
                  <div className="flex flex-col justify-between pb-4 md:col-span-2">
                    <div className="md:pr-6 lg:pr-0">
                      <h3 className="text-[#737373] mb-6 text-sm font-medium">Visa des documents</h3>
                      <p className="text-[#737373] text-balance text-lg font-medium">
                        <span className="text-[#0a0a0a]">Chaque fiche technique est confrontée au CCTP.</span> Lorani vérifie le classement au feu, l&apos;Avis Technique et les PV d&apos;essai de chaque document d&apos;exécution, puis prépare le bordereau de visa avec les observations en regard : visa sans observation (VSO), visa avec observations (VAO) ou refus.
                      </p>
                    </div>
                    <ul className="text-[#737373] mt-8 divide-y *:flex *:items-center *:gap-3 *:py-3">
                      <li>
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
                          className="lucide lucide-plug size-4"
                          aria-hidden="true"
                        >
                          <path d="M12 22v-5"></path>
                          <path d="M15 8V2"></path>
                          <path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z"></path>
                          <path d="M9 8V2"></path>
                        </svg>
                        Classement au feu et Avis Technique
                      </li>
                      <li>
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
                          className="lucide lucide-calendar size-4"
                          aria-hidden="true"
                        >
                          <path d="M8 2v3"></path>
                          <path d="M16 2v3"></path>
                          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                          <path d="M3 9h18"></path>
                        </svg>
                        Bordereau VSO · VAO · refus
                      </li>
                      <li>
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
                          className="lucide lucide-link2 lucide-link-2 size-4"
                          aria-hidden="true"
                        >
                          <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                          <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
                          <line x1="8" x2="16" y1="12" y2="12"></line>
                        </svg>
                        Notes de calcul et PV d&apos;essais
                      </li>
                      <li>
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
                          className="lucide lucide-link2 lucide-link-2 size-4"
                          aria-hidden="true"
                        >
                          <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                          <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
                          <line x1="8" x2="16" y1="12" y2="12"></line>
                        </svg>
                        Date butoir calée sur la commande
                      </li>
                    </ul>
                  </div>
                  <div className="border-[#e5e5e5]/50 bg-[#0a0a0a]/2 relative flex aspect-square items-end rounded-3xl border p-3 pb-0 md:col-span-3">
                    <div className="mask-b-from-[#ffffff] border-[#e5e5e5]/50 relative mx-auto flex h-[84%] w-full max-w-[500px] self-end rounded-t-[3rem] border-x border-t px-3 pt-3">
                      <div className="bg-[#0a0a0a]/2 ring-[#0a0a0a]/10 h-full w-full overflow-hidden rounded-t-[2.25rem] p-3 pb-0 ring">
                        <div className="bg-transparent relative flex h-full overflow-hidden rounded-t-[1.5rem]">
                          <aside className="flex w-[36%] shrink-0 flex-col p-3">
                            <p className="text-sm font-medium">Documents</p>
                            <div className="mt-3 flex flex-col gap-1">
                              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 bg-[#0a0a0a]/8">
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
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">Fiches techniques</span>
                                <span
                                  data-slot="badge"
                                  data-variant="secondary"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 justify-center px-1 text-[10px]"
                                >
                                  12
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 ">
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
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                                  Plans d&apos;exécution
                                </span>
                                <span
                                  data-slot="badge"
                                  data-variant="secondary"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 justify-center px-1 text-[10px]"
                                >
                                  9
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 ">
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
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">Notes de calcul</span>
                                <span
                                  data-slot="badge"
                                  data-variant="secondary"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 justify-center px-1 text-[10px]"
                                >
                                  7
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 ">
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
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">Échantillons</span>
                                <span
                                  data-slot="badge"
                                  data-variant="secondary"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 justify-center px-1 text-[10px]"
                                >
                                  8
                                </span>
                              </div>
                              <div className="flex items-center gap-2 rounded-[10px] px-2 py-2 ">
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
                                <span className="min-w-0 flex-1 truncate text-xs font-medium">PV d&apos;essais</span>
                                <span
                                  data-slot="badge"
                                  data-variant="secondary"
                                  className="group/badge inline-flex h-5 w-fit shrink-0 items-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 min-w-5 justify-center px-1 text-[10px]"
                                >
                                  5
                                </span>
                              </div>
                            </div>
                          </aside>
                          <div className="flex min-w-0 flex-1 flex-col rounded-t-[14px] border-x border-t border-[#e5e5e5]/70 bg-[#ffffff] p-3">
                            <div className="border-[#e5e5e5]/70 flex items-center justify-between border-b pb-2">
                              <p className="text-sm font-medium">Points relevés</p>
                              <span
                                data-slot="badge"
                                data-variant="secondary"
                                className="group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent py-0.5 font-medium whitespace-nowrap transition-all focus-visible:border-[#a1a1a1] focus-visible:ring-[3px] focus-visible:ring-[#a1a1a1]/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[#e40014] aria-invalid:ring-[#e40014]/20 [&>svg]:pointer-events-none [&>svg]:size-3! bg-[#f5f5f5] text-[#171717] [a]:hover:bg-[#f5f5f5]/80 px-2 text-[10px]"
                              >
                                41 points
                              </span>
                            </div>
                            <div className="flex min-h-0 flex-1 flex-col divide-y divide-[#e5e5e5]/70">
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  PM
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Plan de masse</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">p. 02</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La cote de recul (4,80 m) diffère de la coupe AA (5,20 m).
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  CA
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Coupe AA</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">p. 07</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    Le niveau du RDC ne correspond pas à la façade sud.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  VI
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Visa lot 08</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">J-10</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La fiche des menuiseries doit être visée avant le 12 pour tenir la commande.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  QB
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">BET structure</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">9 j</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La question sur la trémie du R+1 attend une réponse depuis neuf jours.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  MT
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Métré lot 05</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">l. 12</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    Le plan donne 412 m² de cloisons, la DPGF en prévoit 360.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  NM
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">48 %</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">p. 31</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La porte P12 figure au tableau des menuiseries, mais pas au plan du R+1.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  DP
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">DPGF lot 03</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">l. 44</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    Le poste 3.4 n&apos;est chiffré que par une entreprise sur trois.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  S4
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Situation n° 4</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">lot 08</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La retenue de garantie n&apos;est pas déduite du cumul.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  PC
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Pièces du permis</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">PC2</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    La notice PC4 annonce deux places PMR ; le plan de masse en montre une.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  FT
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">Fiche technique</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">lot 10</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    Le PV fourni classe la porte EI 30 ; le CCTP demande EI 60.
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 items-center gap-2 py-2.5">
                                <div className="bg-[#0a0a0a]/8 text-[#0a0a0a] flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                                  CC
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-medium">CCTP lot 05</p>
                                    <span className="text-[#737373] shrink-0 text-[10px]">art. 5.2</span>
                                  </div>
                                  <p className="text-[#737373] mt-0.5 truncate text-[11px] leading-4">
                                    L&apos;article cite une version du DTU qui n&apos;est plus en vigueur.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
