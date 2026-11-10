/* ══════════════════════════════════════════════════════════════════════
   « Tout le cabinet, chaque matin » — la grille de cinq cartes de la
   référence (deux puis trois, trame de points, scènes d'interface :
   automatisation, suggestions, anneaux, conversation, fil d'activité),
   recopiée classe par classe. Les cinq cartes sont les cinq écrans de
   Tiroma (textes.ts, ECRANS) ; les scènes portent les cartes d'interface
   et le relevé de la page du 24/09 (Photos.tsx, Matinee.tsx, Demo.tsx).
   ══════════════════════════════════════════════════════════════════════ */
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";

export default function ToutLeCabinet() {
  return (
    <section data-monde="clair" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <GroupeApparition retard={700} className="grid items-end gap-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-balance font-bold text-4xl text-tir-foreground tracking-tight md:text-5xl">
            <MotsApparition texte="Tout le cabinet, chaque matin" depart={80} />
          </h2>
          <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
            {"Les créneaux, les plans et les fauteuils qui comptent ce matin sont réunis au même endroit."}
          </Apparition>
        </GroupeApparition>
        <Apparition delai={150}>
        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background lg:col-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <h3 className="font-semibold text-tir-foreground text-lg leading-tight">
                {"Point du matin"}
              </h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                {"Les trois décisions du jour sont prêtes avant le premier patient."}
              </p>
            </div>
            <div className="relative flex-1">
              <div className="pointer-events-none relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-tir-background">
                <svg className="absolute inset-0 h-full w-full text-tir-foreground/[0.06] dark:text-tir-foreground/[0.08]" aria-hidden="true">
                  <title>
                    {"workflow grid"}
                  </title>
                  <defs>
                    <pattern id="workflow-dot-pattern" width={10} height={10} patternUnits="userSpaceOnUse">
                      <rect x="5.5" y="5.5" width={1} height={1} fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#workflow-dot-pattern)" />
                </svg>
                <div className="relative h-[216px] w-[480px] max-w-full shrink-0 overflow-hidden xl:h-[324px] xl:w-[720px]" style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 24%, black 100%)", maskImage: "linear-gradient(to right, transparent 0%, black 24%, black 100%)" }}>
                  <div className="origin-top-left scale-[0.6] xl:scale-[0.9]" style={{ width: "800px", height: "360px" }}>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 360" fill="none" aria-hidden="true">
                      <title>
                        {"workflow connectors"}
                      </title>
                      <path d="M 360 180 H 400 C 410 180 420 170 420 160 V 80 C 420 70 430 60 440 60 H 480" className="stroke-tir-border" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                      <path d="M 40 180 H 120" className="stroke-emerald-500/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 116 176 L 120 180 L 116 184" className="stroke-emerald-500/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 360 180 H 400 C 410 180 420 190 420 200 V 260 C 420 270 430 280 440 280 H 480" className="stroke-emerald-500/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 476 276 L 480 280 L 476 284" className="stroke-emerald-500/60" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="725" y1="280" x2="750" y2="280" className="stroke-tir-border" strokeWidth="1.2" strokeDasharray="2 3" strokeLinecap="round" />
                    </svg>
                    <div className="absolute" style={{ top: "140px", left: "120px", width: "240px", height: "80px" }}>
                      <div className="flex h-5 items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 -top-6 absolute right-0">
                        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <title>
                            {"completed"}
                          </title>
                          <path d="M3 5.727 3.742 6.9c.442.699.663 1.048.947 1.17a1 1 0 0 0 .778.007c.286-.118.512-.464.965-1.156L9 3" className="stroke-emerald-600 dark:stroke-emerald-400" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium text-[11px] text-emerald-700 dark:text-emerald-400">
                          {"Chaque matin"}
                        </span>
                      </div>
                      <div className="relative h-full w-full overflow-hidden rounded-xl bg-tir-card shadow-black/5 shadow-sm border border-emerald-500/40 ring-1 ring-emerald-500/10">
                        <div className="relative flex h-full flex-col px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-x-1.5">
                              <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <title>
                                  {"slack"}
                                </title>
                                <rect x="0.5" y="0.5" width={19} height={19} rx="5.5" className="fill-tir-card stroke-tir-border" />
                                <rect x="3.5" y="3.5" width={6} height={3} rx="1.5" fill="#36C5F0" />
                                <rect x="13.5" y="3.5" width={3} height={6} rx="1.5" fill="#ECB22E" />
                                <rect x="10.5" y="13.5" width={6} height={3} rx="1.5" fill="#2EB67D" />
                                <rect x="3.5" y="10.5" width={3} height={6} rx="1.5" fill="#E01E5A" />
                              </svg>
                              <p className="truncate font-semibold text-[15px] text-tir-foreground tracking-tight">
                                {"Créneau de 10 h 30 repris"}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-md border border-tir-border bg-tir-muted/50 px-1.5 py-px font-normal text-[11px] text-tir-muted-foreground">
                              {"Agenda"}
                            </span>
                          </div>
                          <hr className="mt-2 mb-auto border-tir-border" />
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-tir-muted-foreground">
                            {"Mme R. a confirmé → agenda à jour"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute flex h-5 items-center justify-center rounded-md border border-emerald-500/40 bg-tir-background px-1.5" style={{ top: "230px", left: "420px" }}>
                      <span className="whitespace-nowrap font-medium text-[11px] text-emerald-700 dark:text-emerald-400">
                        {"Annulation reçue"}
                      </span>
                    </div>
                    <div className="-translate-x-1/2 -translate-y-1/2 absolute flex h-5 items-center justify-center rounded-md border border-tir-border bg-tir-background px-1.5 opacity-60" style={{ top: "130px", left: "420px" }}>
                      <span className="whitespace-nowrap font-medium text-[11px] text-tir-muted-foreground">
                        {"Lecture seule"}
                      </span>
                    </div>
                    <div className="absolute" style={{ top: "240px", left: "480px", width: "240px", height: "80px" }}>
                      <div className="flex h-5 items-center gap-1 rounded-md border border-blue-500/40 bg-blue-500/10 px-1.5 -top-6 absolute right-0">
                        <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <title>
                            {"in progress"}
                          </title>
                          <circle cx="6" cy="6" r="4" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[11px] text-blue-700 dark:text-blue-400">
                          {"En direct"}
                        </span>
                      </div>
                      <div className="relative h-full w-full overflow-hidden rounded-xl bg-tir-card shadow-black/5 shadow-sm border border-emerald-500/40 ring-1 ring-emerald-500/10">
                        <div className="relative flex h-full flex-col px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-x-1.5">
                              <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <title>
                                  {"mixmax"}
                                </title>
                                <rect x="0.5" y="0.5" width={19} height={19} rx="5.5" className="fill-violet-500/15 stroke-violet-500/30" />
                                <path d="M5 14 L7 6 L10 11 L13 6 L15 14" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p className="truncate font-semibold text-[15px] text-tir-foreground tracking-tight">
                                {"Proposition à l'assistante"}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-md border border-tir-border bg-tir-muted/50 px-1.5 py-px font-normal text-[11px] text-tir-muted-foreground">
                              {"Fauteuils"}
                            </span>
                          </div>
                          <hr className="mt-2 mb-auto border-tir-border" />
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-tir-muted-foreground">
                            {"le patient le mieux placé"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute opacity-60" style={{ top: "20px", left: "480px", width: "240px", height: "80px" }}>
                      <div className="relative h-full w-full overflow-hidden rounded-xl bg-tir-card shadow-black/5 shadow-sm border border-tir-border">
                        <div className="relative flex h-full flex-col px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-x-1.5">
                              <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                <title>
                                  {"mixmax"}
                                </title>
                                <rect x="0.5" y="0.5" width={19} height={19} rx="5.5" className="fill-violet-500/15 stroke-violet-500/30" />
                                <path d="M5 14 L7 6 L10 11 L13 6 L15 14" className="stroke-violet-600 dark:stroke-violet-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <p className="truncate font-semibold text-[15px] text-tir-foreground tracking-tight">
                                {"Appel du patient"}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center rounded-md border border-tir-border bg-tir-muted/50 px-1.5 py-px font-normal text-[11px] text-tir-muted-foreground">
                              {"Présences"}
                            </span>
                          </div>
                          <hr className="mt-2 mb-auto border-tir-border" />
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-tir-muted-foreground">
                            {"par l'assistante"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 800 360" fill="none" aria-hidden="true">
                      <title>
                        {"connector dots"}
                      </title>
                      <circle cx="40" cy="180" r="5" className="fill-tir-card stroke-emerald-500/60" strokeWidth="1.5" />
                      <circle cx="360" cy="180" r="5" className="fill-tir-card stroke-emerald-500/60" strokeWidth="1.5" />
                      <circle cx="720" cy="280" r="5" className="fill-tir-card stroke-emerald-500/60" strokeWidth="1.5" />
                      <circle cx="720" cy="60" r="5" className="fill-tir-card stroke-tir-border" strokeWidth="1.5" opacity="0.6" />
                    </svg>
                    <div className="absolute flex items-center justify-center" style={{ top: "250px", left: "720px", width: "60px", height: "60px" }}>
                      <div className="absolute inset-0 rounded-full bg-blue-500/10" />
                      <div className="absolute inset-2 rounded-full bg-blue-500/20" />
                      <div className="relative flex size-7 items-center justify-center rounded-full bg-blue-500/70 text-white shadow-sm">
                        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <title>
                            {"add step"}
                          </title>
                          <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <h3 className="font-semibold text-tir-foreground text-lg leading-tight">
                {"Créneaux à sauver"}
              </h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                {"Chaque annulation arrive avec les patients qui peuvent la reprendre."}
              </p>
            </div>
            <div className="relative flex-1">
              <div className="pointer-events-none relative h-full w-full select-none overflow-hidden rounded-xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[251px] overflow-visible">
                    <svg width={1} height={400} className="-translate-y-1/2 absolute top-1/2 left-0 h-[400px] text-tir-border" aria-hidden="true">
                      <title>
                        {"left rail"}
                      </title>
                      <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="currentColor" strokeDasharray="4 6" strokeLinecap="round" />
                    </svg>
                    <svg width={1} height={400} className="-translate-y-1/2 absolute top-1/2 right-0 h-[400px] text-tir-border" aria-hidden="true">
                      <title>
                        {"right rail"}
                      </title>
                      <line x1="0.5" y1="0" x2="0.5" y2="100%" stroke="currentColor" strokeDasharray="4 6" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0", transform: "translate(-50%, -414%) scale(0.6)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#F4F5F6", borderColor: "#E6E7EA" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#75777C" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#75777C" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#75777C" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#75777C" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"Créneau libéré · 10 h 30"}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.25", transform: "translate(-50%, -354.5%) scale(0.7)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#FFEBEB", borderColor: "#FFDCDB" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#772322" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#772322" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#772322" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#772322" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"Fauteuil 2 · annulé hier à 19 h 04"}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.5", transform: "translate(-50%, -268%) scale(0.8)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#FFF3CC", borderColor: "#FFEBAD" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#705500" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#705500" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#705500" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#705500" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"Mme R."}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.75", transform: "translate(-50%, -163.5%) scale(0.9)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#DAF4FC", borderColor: "#C3EDF9" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#0A5A70" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#0A5A70" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#0A5A70" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#0A5A70" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"M. P."}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "1", transform: "translate(-50%, -50%) scale(1)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#DDF9E4", borderColor: "#C7F4D3" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#075A39" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#075A39" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#075A39" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#075A39" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"Mme A."}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.75", transform: "translate(-50%, 63.5%) scale(0.9)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#F5F0FF", borderColor: "#E8DDFE" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#4711BB" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#4711BB" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#4711BB" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#4711BB" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"plan accepté"}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.5", transform: "translate(-50%, 168%) scale(0.8)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#FEECF1", borderColor: "#FDDDE7" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#6F065D" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#6F065D" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#6F065D" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#6F065D" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"liste d'attente"}
                  </span>
                </div>
                <div className="absolute top-1/2 left-1/2 flex w-[251px] items-center gap-2 rounded-[12px] border bg-tir-card p-2" style={{ borderColor: "rgba(46,50,56,0.07)", boxShadow: "0 10.85px 21.7px -4.34px rgba(28,40,64,0.08), 0 6.51px 6.51px -6.51px rgba(28,40,64,0.08), 0 4.34px 4.34px -4.34px rgba(28,40,64,0.12)", opacity: "0.25", transform: "translate(-50%, 254.5%) scale(0.7)" }}>
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] border" style={{ backgroundColor: "#DDF9E4", borderColor: "#C7F4D3" }}>
                    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <title>
                        {"workflow"}
                      </title>
                      <rect x="1.25" y="1.25" width={4} height={4} rx="1.5" stroke="#075A39" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="6.75" y="6.75" width={4} height={4} rx="2" stroke="#075A39" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 7.25V8.00084C2 9.10541 2.89543 10.0008 4 10.0008H4.75" stroke="#075A39" strokeLinecap="round" />
                      <path d="M10 4.75L10 3.99916C10 2.89459 9.10457 1.99916 8 1.99916L7.25 1.99916" stroke="#075A39" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap font-normal text-[14px] text-tir-foreground tracking-[-0.02em]">
                    {"contrôle dû"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <h3 className="font-semibold text-tir-foreground text-lg leading-tight">
                {"Charge des fauteuils"}
              </h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                {"Tiroma montre quel fauteuil tourne à vide aujourd'hui et quels soins déplacer."}
              </p>
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-28">
                <div className="relative z-10 flex size-16 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-tir-border/60">
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="size-8" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.53 2.13 0 7.75h5.53zm.398 0v5.62h7.608v3.65l5.47-4.45c-.014-1.22.031-2.25-.025-3.46-.148-1.09-1.287-1.47-2.236-1.36zM23.1 4.32c-.802.295-1.358.995-2.047 1.49-2.506 2.05-4.982 4.12-7.468 6.19 3.025 2.59 6.04 5.18 9.065 7.76 1.218.671 1.428-.814 1.328-1.64v-13a.828.828 0 0 0-.877-.825zM.038 8.15v7.7h5.53v-7.7zm13.577 8.1H6.008v5.62c3.864-.006 7.737.011 11.58-.009 1.02-.07 1.618-1.12 1.468-2.07v-2.51l-5.47-4.68v3.65zm-13.577 0c.02 1.44-.041 2.88.033 4.31.162.948 1.158 1.43 2.047 1.31h3.464v-5.62z" />
                  </svg>
                </div>
                <div className="relative z-10 h-12 w-px bg-tir-foreground/20" />
                <div className="relative flex items-center justify-center">
                  <div className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 size-32 rounded-full border border-tir-foreground/20 border-dashed" />
                  <div className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 size-44 rounded-full border border-tir-foreground/15 border-dashed" />
                  <div className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute top-1/2 left-1/2 size-56 rounded-full border border-tir-foreground/10 border-dashed" />
                  <div className="relative flex size-16 items-center justify-center rounded-2xl bg-zinc-900 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap size-7 text-emerald-400">
                      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
                    </svg>
                    <div className="-right-1 -bottom-1 absolute size-6 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 shadow ring-2 ring-tir-background" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <h3 className="font-semibold text-tir-foreground text-lg leading-tight">
                {"Plans sans rendez-vous"}
              </h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                {"Les devis signés sans rendez-vous remontent, du plus ancien au plus récent."}
              </p>
            </div>
            <div className="relative flex-1">
              <div className="pointer-events-none relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-tir-background p-8" style={{ WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 95%)", maskImage: "linear-gradient(to bottom, black 55%, transparent 95%)" }}>
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-tir-border opacity-60 dark:opacity-30">
                  <defs>
                    <pattern id="web-search-chat-dots" x="0" y="0" width={12} height={12} patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.8" fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#web-search-chat-dots)" />
                </svg>
                <div className="relative w-full max-w-xs space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-l-xl rounded-tr-xl rounded-br-sm bg-tir-muted px-3.5 py-2.5 text-tir-foreground text-sm leading-5 shadow-sm ring-1 ring-tir-border/50">
                      {"Plan de traitement · M. C."}
                    </div>
                  </div>
                  <div className="flex w-fit items-center gap-2 rounded-xl border border-tir-border/50 bg-tir-card px-2.5 py-1.5 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe size-3.5 shrink-0 text-tir-muted-foreground">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                      <path d="M2 12h20" />
                    </svg>
                    <div className="text-xs leading-none">
                      <span className="text-tir-muted-foreground">
                        {"Devis"}
                      </span>
                      {" "}
                      <span className="font-semibold text-tir-foreground">
                        {"Reste à charge"}
                      </span>
                    </div>
                    <div className="-space-x-1 flex items-center">
                      <div className="flex size-4 items-center justify-center rounded-sm bg-zinc-900 ring-2 ring-tir-card">
                        <span className="font-bold text-[7px] text-white">
                          {"46"}
                        </span>
                      </div>
                      <div className="flex size-4 items-center justify-center rounded-sm bg-sky-500 ring-2 ring-tir-card">
                        <span className="font-bold text-[7px] text-white">
                          {"36"}
                        </span>
                      </div>
                      <div className="flex size-4 items-center justify-center rounded-sm bg-orange-500 ring-2 ring-tir-card">
                        <span className="font-bold text-[7px] text-white">
                          {"24"}
                        </span>
                      </div>
                      <div className="flex size-4 items-center justify-center rounded-sm bg-tir-muted text-tir-muted-foreground ring-2 ring-tir-card">
                        <span className="font-bold text-[8px]">
                          {"+2"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-medium text-tir-foreground text-sm leading-5">
                    {"Acte"}
                  </p>
                  <div className="space-y-3 text-tir-foreground text-xs leading-relaxed">
                    <p>
                      {"Couronne céramique 46"}
                    </p>
                    <p>
                      {"Inlay-onlay 36"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-tir-border bg-tir-background">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-tir-foreground/[0.06] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:14px_14px]" />
            <div className="relative p-8">
              <h3 className="font-semibold text-tir-foreground text-lg leading-tight">
                {"Avant les rendez-vous"}
              </h3>
              <p className="mt-2 text-base text-tir-foreground/75 leading-relaxed">
                {"Deux jours avant, Tiroma vérifie le retour du laboratoire, l'implant en stock et l'accord de la mutuelle."}
              </p>
            </div>
            <div className="relative flex-1">
              <div className="pointer-events-none relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-tir-background p-4">
                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full text-tir-border opacity-60 dark:opacity-30">
                  <defs>
                    <pattern id="workflow-timeline-dots" x="0" y="0" width={10} height={10} patternUnits="userSpaceOnUse">
                      <rect x="4.5" y="4.5" width={1} height={1} fill="currentColor" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#workflow-timeline-dots)" />
                </svg>
                <div className="relative w-full max-w-[340px]">
                  <div className="relative pl-12">
                    <div className="absolute top-0 bottom-0 left-6 border-tir-foreground/15 border-l border-dashed" />
                    <div className="relative">
                      <div className="-left-9 absolute top-0 z-10 flex size-6 items-center justify-center rounded-md bg-blue-100 ring-1 ring-blue-200/60 dark:bg-blue-950/40 dark:ring-blue-900/40">
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar size-3 text-blue-600 dark:text-blue-400">
                          <path d="M8 2v4" />
                          <path d="M16 2v4" />
                          <rect width={18} height={18} x="3" y="4" rx="2" />
                          <path d="M3 10h18" />
                        </svg>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 pl-1 text-[11px]">
                          <span aria-hidden="true" className="size-4 shrink-0 rounded-full  inline-block bg-gradient-to-br from-neutral-300 to-neutral-500" />
                          <span className="min-w-0 truncate text-tir-muted-foreground">
                            <span className="font-semibold text-tir-foreground">
                              {"Couronne 46 de M. L., rendez-vous à 14 h"}
                            </span>
                            {" "}
                          </span>
                          <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-tir-muted-foreground/70">
                            {"À J-2"}
                          </span>
                        </div>
                        <div className="ml-1 rounded-md border border-tir-border bg-tir-card p-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-px font-medium text-[10px] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-badge-check size-2.5">
                                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                                <path d="m9 12 2 2 4-4" />
                              </svg>
                              {"Travaux de laboratoire"}
                            </span>
                            <div className="-space-x-1 flex">
                              <span className="flex size-4 items-center justify-center rounded-full bg-blue-500 font-bold text-[8px] text-white ring-2 ring-tir-card">
                                {"M"}
                              </span>
                              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 font-bold text-[8px] text-white ring-2 ring-tir-card">
                                {"L"}
                              </span>
                            </div>
                          </div>
                          <p className="mt-1.5 font-semibold text-[11px] text-tir-foreground leading-snug">
                            {"La pièce n'est pas encore revenue du laboratoire."}
                          </p>
                          <p className="mt-0.5 text-[10px] text-tir-muted-foreground">
                            {"Appeler le labo avant 9 h"}
                          </p>
                        </div>
                        <div className="relative pt-1">
                          <div className="-left-6 absolute top-0 h-1/2 w-6 rounded-bl-full border-tir-foreground/15 border-b border-l border-dashed" />
                          <div className="flex items-center gap-1 text-[10px] text-tir-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevrons-up-down size-2.5 shrink-0">
                              <path d="m7 15 5 5 5-5" />
                              <path d="m7 9 5-5 5 5" />
                            </svg>
                            {"Accord de mutuelle reçu pour Mme B."}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-3" />
                    <div className="relative">
                      <div className="-left-9 absolute top-0 z-10 flex size-6 items-center justify-center rounded-md bg-blue-100 ring-1 ring-blue-200/60 dark:bg-blue-950/40 dark:ring-blue-900/40">
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy size-3 text-blue-600 dark:text-blue-400">
                          <rect width={14} height={14} x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 pl-1 text-[11px]">
                          <span aria-hidden="true" className="size-4 shrink-0 rounded-full  inline-block bg-gradient-to-br from-neutral-300 to-neutral-500" />
                          <span className="inline-flex min-w-0 items-center gap-1 truncate text-tir-muted-foreground">
                            <span className="shrink-0 font-semibold text-tir-foreground">
                              {"Mme B."}
                            </span>
                            <span className="shrink-0">
                              {"Planifier les deux séances"}
                            </span>
                            <span className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-sm bg-violet-600 font-bold text-[8px] text-white">
                              {"B"}
                            </span>
                            <span className="shrink-0 font-semibold text-tir-foreground">
                              {"Bridge 45-47"}
                            </span>
                            <span className="shrink-0">
                              {"accord reçu"}
                            </span>
                          </span>
                          <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] text-tir-muted-foreground/70">
                            {"À J-2"}
                          </span>
                        </div>
                        <div className="relative pt-1">
                          <div className="-left-6 absolute top-0 h-1/2 w-6 rounded-bl-full border-tir-foreground/15 border-b border-l border-dashed" />
                          <div className="flex items-center gap-1 text-[10px] text-tir-muted-foreground">
                            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevrons-up-down size-2.5 shrink-0">
                              <path d="m7 15 5 5 5-5" />
                              <path d="m7 9 5-5 5 5" />
                            </svg>
                            {"Questionnaire médical de plus d'un an."}
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
        </Apparition>
      </div>
    </section>
  );
}
