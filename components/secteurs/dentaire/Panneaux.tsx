/* ══════════════════════════════════════════════════════════════════════
   Les quatre fenêtres empilées de « Votre cabinet tient sur une seule
   page » — le balisage des quatre onglets de la référence, recopié classe
   par classe (icônes, ombres, grilles, graphiques), et rempli des textes
   de la page du 24/09 :
     1. le point du matin que préparait la démo (Demo.tsx d'alors) ;
     2. le calculateur des créneaux perdus (Calculateur.tsx d'alors) ;
     3. le parcours d'un créneau annulé (Schema.tsx d'alors) et le relevé
        de 6 h 45 (Matinee.tsx) ;
     4. la comparaison par catégories d'outils (Comparatif.tsx), dans le
        tableau de la fenêtre.
   ══════════════════════════════════════════════════════════════════════ */
import BarreLaterale from "./BarreLaterale";
import { MarqueTiroma } from "./marque";
import TableauFenetre, { TABLEAU_COMPARATIF } from "./TableauFenetre";

export function PanneauPointDuMatin() {
  return (
    <div className="overflow-hidden rounded-lg border border-tir-border bg-tir-card shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl dark:shadow-[0px_2px_6px_0px_rgba(0,0,0,0.4),0px_6px_20px_-2px_rgba(0,0,0,0.5)]">
      <div className="relative grid h-[340px] w-full grid-rows-[auto_1fr] sm:h-[420px] md:h-[500px] lg:h-[600px] lg:grid-cols-[272px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="hidden items-center gap-3 border-tir-border border-r border-b bg-tir-card pr-4 pl-3 lg:flex lg:h-12">
          <MarqueTiroma className="size-6 shrink-0 text-tir-foreground" />
          <div className="flex h-full flex-1 items-center gap-1">
            <span className="font-semibold text-tir-foreground text-sm leading-5 tracking-[-0.16px]">
              {"Tiroma"}
            </span>
            <svg aria-hidden="true" role="presentation" className="size-3.5 shrink-0 text-tir-muted-foreground" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25L7 9.25L11 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <svg aria-hidden="true" role="presentation" className="size-[18px] shrink-0 text-tir-foreground opacity-55" viewBox="0 0 18 18" fill="none">
            <path d="M12.1797 2.5C12.9275 2.5 13.5188 2.49925 13.9941 2.53809C14.4753 2.5774 14.8819 2.6596 15.2529 2.84863C15.8549 3.15542 16.3446 3.64505 16.6514 4.24707C16.8403 4.618 16.9226 5.02485 16.9619 5.50586C17.0007 5.98111 17 6.57268 17 7.32031V10.6797C17 11.4273 17.0007 12.0189 16.9619 12.4941C16.9226 12.9751 16.8404 13.382 16.6514 13.7529C16.3446 14.3549 15.8549 14.8446 15.2529 15.1514C14.882 15.3404 14.4752 15.4226 13.9941 15.4619C13.5188 15.5007 12.9275 15.5 12.1797 15.5L5.82031 15.5C5.07251 15.5 4.48117 15.5007 4.00586 15.4619C3.52479 15.4226 3.11804 15.3404 2.74707 15.1514C2.1451 14.8446 1.65543 14.3549 1.34863 13.7529C1.15964 13.382 1.07741 12.9751 1.03809 12.4941C0.999258 12.0189 1 11.4273 1 10.6797L1 7.32031C1 6.57268 0.999281 5.98111 1.03809 5.50586C1.07739 5.02485 1.1597 4.618 1.34863 4.24707C1.65539 3.64505 2.14507 3.15542 2.74707 2.84863C3.11807 2.6596 3.52474 2.5774 4.00586 2.53809C4.48117 2.49925 5.07249 2.5 5.82031 2.5L12.1797 2.5ZM5.82031 3.5C5.05599 3.5 4.51206 3.50042 4.08691 3.53516C3.66788 3.56943 3.40764 3.63503 3.20117 3.74023C2.78746 3.95113 2.4511 4.28744 2.24023 4.70117C2.13512 4.9076 2.06941 5.16806 2.03516 5.58691C2.00045 6.01201 2 6.55621 2 7.32031L2 10.6797C2 11.4438 2.00043 11.988 2.03516 12.4131C2.06943 12.8319 2.13506 13.0924 2.24023 13.2988C2.45113 13.7125 2.78749 14.0489 3.20117 14.2598C3.40762 14.3649 3.66797 14.4306 4.08691 14.4648C4.51206 14.4996 5.05601 14.5 5.82031 14.5L7 14.5L7 3.5H5.82031ZM8 14.5H12.1797C12.944 14.5 13.4879 14.4996 13.9131 14.4648C14.332 14.4306 14.5924 14.3649 14.7988 14.2598C15.2125 14.0489 15.5489 13.7125 15.7598 13.2988C15.8649 13.0924 15.9306 12.8319 15.9648 12.4131C15.9996 11.988 16 11.4438 16 10.6797L16 7.32031C16 6.55621 15.9995 6.01201 15.9648 5.58691C15.9306 5.16806 15.8649 4.9076 15.7598 4.70117C15.5489 4.28744 15.2125 3.95113 14.7988 3.74023C14.5924 3.63503 14.3321 3.56943 13.9131 3.53516C13.4879 3.50042 12.944 3.5 12.1797 3.5L8 3.5L8 14.5ZM5.3252 7.5C5.60111 7.50026 5.82519 7.72402 5.8252 8C5.8252 8.27598 5.60111 8.49974 5.3252 8.5H3.97559C3.69944 8.5 3.47559 8.27614 3.47559 8C3.47559 7.72386 3.69944 7.5 3.97559 7.5H5.3252ZM5.34961 5.5C5.62575 5.5 5.84961 5.72386 5.84961 6C5.84961 6.27614 5.62575 6.5 5.34961 6.5H4C3.72386 6.5 3.5 6.27614 3.5 6C3.5 5.72386 3.72386 5.5 4 5.5L5.34961 5.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex w-full items-center border-tir-border border-b">
          <div className="flex h-full w-full items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2 lg:gap-8 lg:px-4 lg:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <span className="truncate font-medium text-[11px] text-tir-foreground leading-4 tracking-[-0.1px] sm:text-sm sm:leading-5 sm:tracking-[-0.14px]">
                {"Tiroma · créneaux à sauver"}
              </span>
              <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 shrink-0 text-tir-muted-foreground sm:size-3.5">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.00002 1.16675C7.18517 1.16675 7.35407 1.27555 7.43078 1.44519L8.88191 4.65489L12.3898 5.09671C12.5733 5.11983 12.7273 5.24732 12.7851 5.42331C12.8428 5.5993 12.7942 5.79287 12.6597 5.92019L10.0542 8.38523L10.7097 11.8616C10.7439 12.0432 10.6706 12.2281 10.5216 12.3369C10.3727 12.4457 10.1739 12.4598 10.0109 12.3734L7.00002 10.7763L3.98916 12.3734C3.82615 12.4598 3.62739 12.4457 3.47841 12.3369C3.32944 12.2281 3.25618 12.0432 3.29035 11.8616L3.94583 8.38523L1.34034 5.92019C1.20584 5.79287 1.15725 5.5993 1.21499 5.42331C1.27274 5.24732 1.42674 5.11983 1.61022 5.09671L5.11813 4.65489L6.56926 1.44519C6.64597 1.27555 6.81487 1.16675 7.00002 1.16675Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex shrink-0 items-center gap-px">
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path d="M7 2C7.27612 2 7.49996 2.22389 7.5 2.5V6.5H11.5C11.7761 6.5 12 6.72386 12 7C12 7.27614 11.7761 7.5 11.5 7.5H7.5V11.5C7.5 11.7761 7.27614 12 7 12C6.72386 12 6.5 11.7761 6.5 11.5V7.5H2.5C2.22386 7.5 2 7.27614 2 7C2 6.72386 2.22386 6.5 2.5 6.5H6.5V2.5C6.50004 2.22389 6.72388 2 7 2Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.33325 2.33325C1.96506 2.33325 1.66659 2.63173 1.66659 2.99992V10.9999C1.66659 11.3681 1.96506 11.6666 2.33325 11.6666H11.6666C12.0348 11.6666 12.3333 11.3681 12.3333 10.9999V2.99992C12.3333 2.63173 12.0348 2.33325 11.6666 2.33325H2.33325ZM0.666587 2.99992C0.666587 2.07945 1.41278 1.33325 2.33325 1.33325H11.6666C12.5871 1.33325 13.3333 2.07945 13.3333 2.99992V10.9999C13.3333 11.9204 12.5871 12.6666 11.6666 12.6666H2.33325C1.41278 12.6666 0.666587 11.9204 0.666587 10.9999V2.99992ZM9.33325 2.33325V11.6666H8.33325V2.33325H9.33325Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" className="size-3 text-tir-muted-foreground sm:size-3.5" width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M7.438 3.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 7a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 10.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0Z" fill="currentColor" stroke="currentColor" strokeWidth=".7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <BarreLaterale />
        <div className="relative h-full w-full overflow-hidden bg-tir-card">
          <div className="mx-auto flex h-full w-full max-w-[360px] flex-col px-3 lg:max-w-[720px] lg:px-6">
            <div className="scrollbar-none flex shrink-0 grow-0 basis-48 flex-col gap-2 overflow-y-auto px-px lg:basis-96 lg:gap-4" style={{ maskImage: "linear-gradient(to bottom, transparent, black 24px, black 100%)" }}>
              <div className="flex flex-col gap-2 lg:gap-4">
                <div className="mt-3 flex justify-end lg:mt-6">
                  <div className="flex rounded-sm bg-tir-muted px-1 py-0.5 lg:rounded-lg lg:px-2 lg:py-1">
                    <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                      {"Demain 10 h 30, fauteuil 2, 45 min"}
                    </span>
                  </div>
                </div>
                <div className="flex max-w-[85%] flex-col gap-1.5 lg:gap-3">
                  <div className="flex flex-col gap-1.5 lg:gap-3">
                    <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                      {"Point du matin préparé par Tiroma, jeudi 25 septembre, 7 h 00"}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                        {"Essayez sur votre matinée"}
                      </span>
                      <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                        {"Créneau libéré"}
                      </span>
                    </div>
                    <div className="flex max-w-46 overflow-hidden rounded-[5px] border-[0.33px] border-tir-border bg-tir-card shadow-[0px_0.4px_0.4px_0px_rgba(127,135,144,0.1),0px_0.8px_0.8px_0px_rgba(127,135,144,0.09),0px_2px_1.2px_0px_rgba(127,135,144,0.05),0px_0px_0px_0.5px_rgba(0,0,0,0.04)] lg:max-w-92 lg:rounded-[10px] lg:border-[0.66px] lg:shadow-[0px_0.8px_0.8px_0px_rgba(127,135,144,0.1),0px_1.6px_1.6px_0px_rgba(127,135,144,0.09),0px_4.1px_2.5px_0px_rgba(127,135,144,0.05),0px_0px_0px_1px_rgba(0,0,0,0.04)]">
                      <div className="relative w-[6.5px] shrink-0 lg:w-[13px]">
                        <div className="absolute top-[5px] bottom-[5px] left-1/2 ml-0.5 w-[1.5px] -translate-x-1/2 rounded-full bg-[#00D17E] lg:top-[10px] lg:bottom-[10px] lg:ml-1 lg:w-[3px]" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start">
                          <div className="flex shrink-0 items-center justify-center py-[6px] pl-[4px] lg:py-[12px] lg:pl-[8px]">
                            <div className="relative h-[16px] w-[22px] overflow-hidden rounded-[2.5px] bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 lg:h-[32px] lg:w-[44px] lg:rounded-[5px]">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col pt-[5px] pr-[6px] pb-[4px] pl-[4px] lg:pt-[10px] lg:pr-[12px] lg:pb-[8px] lg:pl-[8px]">
                            <span className="truncate font-medium text-[#242629] text-[7px] leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px] dark:text-tir-foreground">
                              {"Cabinet des Tilleuls"}
                            </span>
                            <span className="truncate font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-[-0.06px] lg:text-[12px] lg:leading-4 lg:tracking-[-0.12px]">
                              {"Lecture seule de l'agenda, des plans et des devis · Données d'exemple, aucun vrai patient"}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-start pt-[6px] pr-[8px] pl-[6px] lg:pt-[12px] lg:pr-[16px] lg:pl-[12px]">
                            <div className="flex">
                              <div className="rounded-full border border-tir-card">
                                <div className="flex size-2 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-black/5 lg:size-4 from-sky-500 to-blue-700">
                                  <span className="font-semibold text-[3px] text-white leading-none lg:text-[6px]">
                                    {"MR"}
                                  </span>
                                </div>
                              </div>
                              <div className="rounded-full border border-tir-card -ml-[2px] lg:-ml-[4px]">
                                <div className="flex size-2 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-black/5 lg:size-4 from-rose-400 to-pink-600">
                                  <span className="font-semibold text-[3px] text-white leading-none lg:text-[6px]">
                                    {"PL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center pr-[5px] pb-[5px] pl-[4px] lg:pr-[10px] lg:pb-[10px] lg:pl-[8px]">
                          <div className="flex flex-1 items-center gap-[3px] lg:gap-1.5">
                            <div className="flex h-[10px] min-w-[10px] items-center gap-[2px] rounded-[3px] bg-tir-muted px-[2px] ring-1 ring-tir-border lg:h-5 lg:min-w-5 lg:gap-1 lg:rounded-[6px] lg:px-1">
                              <svg className="size-1.5 shrink-0 text-[#505154] lg:size-3 dark:text-tir-muted-foreground" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path d="M6.5 1.5h-3a1 1 0 0 0-1 1V7l1 1h3l1-1V2.5a1 1 0 0 0-1-1Z" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M4 3.8h2M4 5h2M4 6.2h1.2" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
                              </svg>
                              <span className="font-medium text-[#505154] text-[6px] leading-[8px] tracking-[-0.06px] lg:text-[12px] lg:leading-4 lg:tracking-[-0.12px] dark:text-tir-muted-foreground">
                                {"34"}
                              </span>
                            </div>
                            <div className="flex h-[10px] min-w-[10px] items-center gap-[2px] rounded-[3px] bg-tir-muted px-[2px] ring-1 ring-tir-border lg:h-5 lg:min-w-5 lg:gap-1 lg:rounded-[6px] lg:px-1">
                              <svg className="size-1.5 shrink-0 text-[#505154] lg:size-3 dark:text-tir-muted-foreground" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path d="M5 1.2a1.3 1.3 0 0 0-1.3 1.3v2.6a1.3 1.3 0 0 0 2.6 0V2.5A1.3 1.3 0 0 0 5 1.2Z" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2.8 5v.4a2.2 2.2 0 0 0 4.4 0V5M5 7.6V8.8" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
                              </svg>
                              <span className="font-medium text-[#505154] text-[6px] leading-[8px] tracking-[-0.06px] lg:text-[12px] lg:leading-4 lg:tracking-[-0.12px] dark:text-tir-muted-foreground">
                                {"2"}
                              </span>
                            </div>
                            <div className="h-1.5 w-px shrink-0 bg-tir-border lg:h-3" />
                            <div className="flex h-[10px] min-w-[10px] items-center gap-[2px] rounded-[3px] bg-tir-muted px-[2px] ring-1 ring-tir-border lg:h-5 lg:min-w-5 lg:gap-1 lg:rounded-[6px] lg:px-1">
                              <svg className="size-1.5 shrink-0 text-[#505154] lg:size-3 dark:text-tir-muted-foreground" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path d="M5.5 1.5H3.6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h3.4a1 1 0 0 0 1-1V4l-2.5-2.5Z" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M5.5 1.5V4H8" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="font-medium text-[#505154] text-[6px] leading-[8px] tracking-[-0.06px] lg:text-[12px] lg:leading-4 lg:tracking-[-0.12px] dark:text-tir-muted-foreground">
                                {"2"}
                              </span>
                            </div>
                            <div className="h-1.5 w-px shrink-0 bg-tir-border lg:h-3" />
                            <div className="flex h-[10px] min-w-[10px] items-center gap-[2px] rounded-[3px] bg-tir-muted px-[2px] ring-1 ring-tir-border lg:h-5 lg:min-w-5 lg:gap-1 lg:rounded-[6px] lg:px-1">
                              <svg className="size-1.5 shrink-0 lg:size-3" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path d="M5 2c.94 0 1.7.76 1.7 1.7v1.8a1.7 1.7 0 0 1-3.4 0V3.7C3.3 2.76 4.06 2 5 2Z" fill="url(#mic-grad)" />
                                <path d="M2.7 5v.3a2.3 2.3 0 0 0 4.6 0V5" stroke="url(#mic-grad)" strokeWidth=".8" strokeLinecap="round" />
                                <defs>
                                  <linearGradient id="mic-grad" x1="0" y1="0" x2="10" y2="10" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#85AFF2" />
                                    <stop offset="1" stopColor="#E2A3B5" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <span className="font-medium text-[#505154] text-[6px] leading-[8px] tracking-[-0.06px] lg:text-[12px] lg:leading-4 lg:tracking-[-0.12px] dark:text-tir-muted-foreground">
                                {"Exemple"}
                                <span className="text-tir-muted-foreground/70">
                                  {" 3 points"}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 lg:gap-1">
                    <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                      {"Tiroma classe d'abord les plans acceptés, puis la liste d'attente, puis les contrôles dus, et ne retient que les soins qui tiennent dans le créneau."}
                    </span>
                    <ol className="flex flex-col">
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"1"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"Mme R."}
                          </span>
                          {" · Couronne 26, plan signé il y a 41 jours"}
                        </span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"2"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"M. D."}
                          </span>
                          {" · Couronne céramo-métallique 14, accord de mutuelle reçu hier"}
                        </span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"3"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"M. P."}
                          </span>
                          {" · Détartrage et contrôle, en liste d'attente depuis 9 jours"}
                        </span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"4"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"Mme A."}
                          </span>
                          {" · Contrôle annuel dû depuis 14 mois"}
                        </span>
                      </li>
                    </ol>
                  </div>
                  <div className="flex flex-col gap-0.5 lg:gap-1">
                    <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                      {"À faire ce matin, dans l'ordre"}
                    </span>
                    <ol className="flex flex-col">
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"1"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"8 h 05"}
                          </span>
                          {" · Appeler Mme R. pour le créneau libéré (rang 1)"}
                        </span>
                        <ol className="mt-0.5 flex flex-col lg:mt-1">
                          <li>
                            <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                              {"a"}
                              {". "}
                              {"Préfère le matin"}
                            </span>
                          </li>
                          <li>
                            <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                              {"b"}
                              {". "}
                              {"Reste à charge 0 €"}
                            </span>
                          </li>
                          <li>
                            <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                              {"c"}
                              {". "}
                              {"Disponible sous 1 h"}
                            </span>
                          </li>
                        </ol>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"2"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"8 h 15"}
                          </span>
                          {" · Appeler le laboratoire pour la couronne 46"}
                        </span>
                      </li>
                      <li className="flex flex-col">
                        <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                          {"3"}
                          {"."}
                          {" "}
                          <span className="font-semibold">
                            {"8 h 25"}
                          </span>
                          {" · Relancer la mutuelle de M. L. (implant 24)"}
                        </span>
                      </li>
                    </ol>
                  </div>
                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">
                    {"18 rappels de contrôle sont rédigés et attendent votre validation. Aucun message ne part sans votre accord."}
                  </span>
                            <div className="flex flex-col gap-0.5 lg:gap-1">
                              <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"À vérifier avant les rendez-vous"}</span>
                              <ol className="flex flex-col">
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"1"}{"."}<span className="font-semibold">{"Couronne 46 de M. L., rendez-vous à 14 h"}</span>{" · La pièce n'est pas encore revenue du laboratoire. Appeler le labo avant 9 h"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"2"}{"."}<span className="font-semibold">{"Accord de mutuelle reçu pour Mme B."}</span>{" · Bridge 45-47 : le plan peut entrer à l'agenda. Planifier les deux séances"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"3"}{"."}<span className="font-semibold">{"2 patients de l'après-midi"}</span>{" · Questionnaire médical de plus d'un an. À faire remplir à l'accueil"}</span>
                                </li>
                              </ol>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1">
                              <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"Plans signés sans rendez-vous"}</span>
                              <ol className="flex flex-col">
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"1"}{"."}<span className="font-semibold">{"Mme R."}</span>{" · Couronne 26 · Signé il y a 41 jours · Devis 540 € · Reste à charge 120 € · 1 séance · Mutuelle : non requise · Proposée pour le créneau libéré"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"2"}{"."}<span className="font-semibold">{"M. L."}</span>{" · Implant 24 et couronne · Signé il y a 34 jours · Devis 1 850 € · Reste à charge 1 120 € · 3 séances · Mutuelle : en attente, 12 jours · Relancer la mutuelle"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"3"}{"."}<span className="font-semibold">{"Mme B."}</span>{" · Bridge 45-47 · Signé il y a 31 jours · Devis 1 280 € · Reste à charge 410 € · 2 séances · Mutuelle : accord reçu · Planifier 2 × 60 min, fauteuil 1"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"4"}{"."}<span className="font-semibold">{"M. D."}</span>{" · Couronne céramo-métallique 14 · Signé il y a 19 jours · Devis 500 € · Reste à charge 0 €, panier 100 % Santé · 1 séance · Mutuelle : accord reçu hier · Proposée en rang 2"}</span>
                                </li>
                              </ol>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1">
                              <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"Pour l'assistante"}</span>
                              <ol className="flex flex-col">
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"1"}{"."}<span className="font-semibold">{"8 h 35"}</span>{" · Planifier le bridge de Mme B., accord reçu"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"2"}{"."}<span className="font-semibold">{"8 h 45"}</span>{" · Relire et valider les 18 rappels de contrôle"}</span>
                                </li>
                              </ol>
                            </div>
                            <div className="flex flex-col gap-0.5 lg:gap-1">
                              <span className="font-semibold text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"Tiroma prépare votre point du matin…"}</span>
                              <ol className="flex flex-col">
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"1"}{"."}<span className="font-semibold">{"Lecture de l'agenda des trois fauteuils…"}</span>{" · Rendez-vous du jour, 3 fauteuils"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"2"}{"."}<span className="font-semibold">{"Rapprochement des plans signés et des devis…"}</span>{" · 12 plans signés sans rendez-vous, 9 patients en liste d'attente"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"3"}{"."}<span className="font-semibold">{"Point sur les accords de mutuelle…"}</span>{" · Accords des mutuelles"}</span>
                                </li>
                                <li className="flex flex-col">
                                  <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"4"}{"."}<span className="font-semibold">{"Classement des patients et des appels…"}</span>{" · Liste d'attente"}</span>
                                </li>
                              </ol>
                            </div>
                            <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"34 rendez-vous aujourd'hui · sur 3 fauteuils · 2 créneaux libérés · 1 h 15 à reprendre · 12 plans signés sans rendez-vous · dont 3 depuis plus de 30 jours · 41 contrôles dus · 18 rappels prêts"}</span>
                            <span className="font-medium text-[#232529] text-[7px] leading-[10px] lg:text-[14px] lg:leading-5 dark:text-tir-foreground">{"Annulation reçue · la veille, 19 h 04 · 10 h 30, fauteuil 2 : trois patients peuvent venir · Mme R. rappelée par l'assistante à 8 h 12"}</span>
                  <div className="flex items-center gap-1.5 px-0.5 lg:gap-3 lg:px-1">
                    <button type="button" className="text-tir-muted-foreground/70 transition-colors hover:text-tir-muted-foreground">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-1.5 lg:size-3" aria-hidden="true">
                        <path d="M9 3.5C9.69 3.5 10.24 3.5 10.68 3.54a1.55 1.55 0 0 1 1.18.28c.56.29 1 .73 1.31 1.3.18.35.25.73.29 1.18.04.44.04.99.04 1.68v1.66c0 .75 0 1.22-.1 1.61a2.34 2.34 0 0 1-1.72 1.72c-.4.11-.87.1-1.61.1H8c-.69 0-1.24 0-1.68-.04a2.55 2.55 0 0 1-2.05-1.46c-.18-.35-.25-.73-.29-1.18-.04-.44-.04-.99-.04-1.68V7.53c0-.92-.01-1.5.15-1.98a2.5 2.5 0 0 1 1.55-1.55c.48-.16 1.06-.15 1.98-.15H9Zm-4.18 6c0 .42 0 .79.03 1.09.03.3.08.5.16.66.18.32.45.6.78.78.16.08.36.13.66.16.3.03.67.03 1.09.03h1.66c.4 0 .65 0 .84-.05.69-.18 1.23-.72 1.41-1.41.05-.19.05-.43.05-.84V7.53c0-.42 0-.79-.03-1.09a2 2 0 0 0-.16-.66 1.85 1.85 0 0 0-.78-.78 2 2 0 0 0-.66-.16c-.3-.03-.67-.03-1.09-.03H7.53c-.45 0-.71 0-.93.06a1.5 1.5 0 0 0-.95.95c-.06.22-.06.48-.06.93V9.5ZM7 .5c.45 0 .73 0 .97.04.49.08.94.28 1.33.56.23.17.43.37.6.6.16.22.12.53-.1.7s-.53.12-.7-.1c-.11-.15-.25-.29-.4-.4-.25-.19-.55-.32-.88-.37C7.67 1.5 7.48 1.5 7 1.5H4.53c-1 0-1.37.01-1.66.1A1.5 1.5 0 0 0 1.6 2.87c-.09.29-.1.66-.1 1.66V7c0 .48 0 .67.04.81.05.33.18.63.37.88.11.15.25.29.4.4.22.17.27.48.1.7s-.48.27-.7.1a3.55 3.55 0 0 1-.6-.6 3.5 3.5 0 0 1-.56-1.33C.5 7.73.5 7.45.5 7V4.53c0-.92-.01-1.5.16-1.98a2.5 2.5 0 0 1 1.55-1.55C2.7.5 3.28.5 4.2.5H7Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button type="button" className="text-tir-muted-foreground/70 transition-colors hover:text-tir-muted-foreground">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-1.5 lg:size-3" aria-hidden="true">
                        <path d="M6.64 0.77a1.55 1.55 0 0 1 1.76-.27 2.13 2.13 0 0 1 .92 2.12L9.08 4.08l2.75.42.02.01a1.75 1.75 0 0 1 0 3.5c.36.29.62.73.62 1.35-.01.71-.36 1.19-.8 1.46.2.3.3.65.3 1.04 0 .74-.55 1.75-1.75 1.75H2c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5h1.26L6.64.77ZM7.84 1.33c-.13-.09-.32-.06-.42.07L4 5.67V12h7.25c.5 0 .75-.4.75-.75 0-.25-.07-.42-.16-.53a.85.85 0 0 0-.43-.23c-.25-.05-.43-.28-.41-.54a.5.5 0 0 1 .5-.45h.25c.36 0 .75-.25.75-.75 0-.44-.3-.69-.62-.74L11.75 8l-.1-.01a.5.5 0 0 1 0-.99l.07-.01c.18-.05.43-.28.43-.74 0-.42-.3-.7-.59-.76L8.42 4.99a.5.5 0 0 1-.41-.58l.33-1.96c.07-.44-.12-.88-.49-1.13ZM1.9 6.01a.5.5 0 0 0-.4.49v5c0 .28.23.5.5.5h1V6h-1l-.1.01Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button type="button" className="text-tir-muted-foreground/70 transition-colors hover:text-tir-muted-foreground">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-1.5 lg:size-3" aria-hidden="true">
                        <path d="M11.25 1c1.2 0 1.75 1 1.75 1.75 0 .39-.09.75-.29 1.04.44.27.79.75.8 1.46-.01.61-.27 1.06-.62 1.35a1.75 1.75 0 0 1 0 3.5l-.02.01-2.75.42.24 1.45c.14.83-.22 1.66-.92 2.13a1.55 1.55 0 0 1-1.76-.27L4.26 9H3c-.83 0-1.5-.67-1.5-1.5v-5C1.5 1.67 2.17 1 3 1h8.25ZM4 2v6.33l3.42 4.28a.55.55 0 0 0 .42.07c.37-.25.56-.69.49-1.13l-.33-1.96a.5.5 0 0 1 .41-.58l3.24-.5c.29-.06.59-.34.59-.76 0-.46-.25-.69-.43-.74L11.75 7a.5.5 0 0 1 0-1l.1-.01c.18-.05.43-.28.43-.74-.01-.5-.4-.75-.75-.75h-.25a.5.5 0 0 1-.5-.45.5.5 0 0 1 .41-.55c.21-.04.34-.12.43-.23.09-.11.16-.28.16-.53C12 2.4 11.75 2 11.25 2H4ZM2 2c-.28 0-.5.22-.5.5v5c0 .28.22.5.5.5h1V2H2Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button type="button" className="text-tir-muted-foreground/70 transition-colors hover:text-tir-muted-foreground">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-1.5 lg:size-3" aria-hidden="true">
                        <path d="M2 6.5a.5.5 0 0 1 .5.5v.4A3.1 3.1 0 0 0 5.6 10.5h3.2L7.65 9.35a.5.5 0 0 1 .7-.7l2 2c.2.2.2.5 0 .7l-2 2a.5.5 0 0 1-.7-.7l1.14-1.15H5.6A4.1 4.1 0 0 1 1.5 7.4V7a.5.5 0 0 1 .5-.5ZM5.65.65a.5.5 0 0 1 .7.7L5.21 2.5H8.4a4.1 4.1 0 0 1 4.1 4.1v.4a.5.5 0 0 1-1 0v-.4A3.1 3.1 0 0 0 8.4 3.5H5.21l1.14 1.15a.5.5 0 0 1-.7.7l-2-2a.5.5 0 0 1 0-.7l2-2Z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="mt-6 mb-3 flex items-center px-1 opacity-0 lg:mt-12 lg:mb-6 lg:px-2">
              <span className="font-semibold text-[#242629] text-[10px] leading-[12px] tracking-[-0.1px] lg:text-[20px] lg:leading-6 lg:tracking-[-0.2px] dark:text-tir-foreground">
                {"Tiroma prépare votre point du matin…"}
              </span>
            </div>
            <div className="flex w-full -translate-y-7 flex-col items-center gap-[5px] lg:-translate-y-14 lg:gap-2.5">
              <div className="flex h-[58px] w-full flex-col rounded-[7px] border-[0.5px] border-tir-border bg-tir-card shadow-[0px_6px_15px_0px_rgba(0,0,0,0.04)] lg:h-[116px] lg:rounded-[14px] lg:border lg:shadow-[0px_12px_30px_0px_rgba(0,0,0,0.04)] dark:shadow-[0px_6px_15px_0px_rgba(0,0,0,0.3)]">
                <div className="flex h-9 flex-1 items-start rounded-[5px] px-1.5 py-[4.5px] lg:h-[72px] lg:rounded-[10px] lg:px-3 lg:py-[9px]">
                  <div className="flex h-[11px] flex-1 items-center overflow-clip lg:h-[22px]">
                    <span className="overflow-hidden text-ellipsis font-medium text-[7px] text-tir-muted-foreground/70 leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px]">
                      {"Ce que vous savez (ex. 12 plans signés, 9 en liste d’attente)"}
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-1.5 p-1 lg:gap-3 lg:p-2">
                  <div className="flex flex-1 items-center justify-end gap-px">
                    <div className="flex h-[14px] min-w-[14px] items-center justify-center gap-[2px] rounded-[4px] px-[3.5px] lg:h-7 lg:min-w-7 lg:gap-1 lg:rounded-lg lg:px-[7px]">
                      <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px]">
                        {"Démo en direct"}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-[2px] lg:gap-1">
                      <div className="flex size-[14px] min-w-[14px] shrink-0 items-center justify-center overflow-clip rounded-[4px] lg:size-7 lg:min-w-7 lg:rounded-lg">
                        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-[7px] text-tir-muted-foreground lg:size-3.5" aria-hidden="true">
                          <path d="M8.5 1H5.5C4.81 1 4.26 1 3.82 1.04c-.45.04-.83.12-1.18.3-.56.29-1.02.75-1.3 1.31-.18.35-.26.73-.3 1.18C1 4.26 1 4.81 1 5.5v3c0 .69 0 1.24.04 1.68.04.45.12.83.3 1.18.28.57.74 1.03 1.3 1.31.35.18.73.26 1.18.29.44.04.99.04 1.68.04h3c.69 0 1.24 0 1.68-.04.45-.03.83-.11 1.18-.29a3 3 0 0 0 1.3-1.31c.18-.35.26-.73.3-1.18.04-.44.04-.99.04-1.68v-3c0-.69 0-1.24-.04-1.68a2.55 2.55 0 0 0-.29-1.18 3 3 0 0 0-1.31-1.31 2.55 2.55 0 0 0-1.18-.29C9.74 1 9.19 1 8.5 1ZM7.53 3.84a.5.5 0 0 1 .63.32.5.5 0 0 1-.32.63l-2 6a.5.5 0 0 1-.95-.32l2-6Z" fill="currentColor" />
                        </svg>
                      </div>
                      <div className="flex size-[14px] min-w-[14px] shrink-0 items-center justify-center overflow-clip rounded-[4px] border-[0.5px] border-black/10 bg-[#266DF0] text-white shadow-[0px_1px_2px_-1px_rgba(15,107,233,0.12),0px_1.5px_3px_-1px_rgba(15,107,233,0.08)] lg:size-7 lg:min-w-7 lg:rounded-lg lg:border lg:shadow-[0px_2px_4px_-2px_rgba(15,107,233,0.12),0px_3px_6px_-2px_rgba(15,107,233,0.08)]">
                        <svg width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-[7px] lg:size-3.5" aria-hidden="true">
                          <path d="M6.72 2.08c.2-.13.46-.1.63.06l3.5 3.5a.5.5 0 0 1-.7.7L7.5 3.7v7.8a.5.5 0 1 1-1 0V3.7L3.85 6.35a.5.5 0 0 1-.7-.7l3.5-3.5.07-.07Z" fill="white" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className="invisible flex items-center justify-center gap-1 lg:gap-2">
                <div className="flex h-[14px] min-w-[14px] shrink-0 items-center justify-center gap-[2px] rounded-[4px] border-[0.5px] border-black/5 pr-[3.5px] pl-[3px] lg:h-7 lg:min-w-7 lg:gap-1 lg:rounded-lg lg:border lg:pr-[7px] lg:pl-1.5">
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className="size-2 shrink-0 lg:size-4" aria-hidden="true">
                    <rect x=".5" y=".5" width={15} height={15} rx="4.3" fill="#E5EEFF" stroke="#D6E5FF" />
                    <path d="M10 3.5a.5.5 0 0 1 .5.5v.5c.3.02.51.1.69.2.28.14.5.37.65.65.15.32.16.74.16 1.58V9.63c0 .85 0 1.27-.17 1.6a1.75 1.75 0 0 1-.92.78c-.16.08-.34.12-.59.14-.25.02-.57.02-1 .02H6.39c-.84 0-1.26 0-1.58-.16a1.75 1.75 0 0 1-.65-.65c-.16-.32-.16-.74-.16-1.58V6.91c0-.84 0-1.26.17-1.58a1.75 1.75 0 0 1 .65-.65c.18-.09.39-.15.68-.18V4a.5.5 0 0 1 1 0v.5h3V4a.5.5 0 0 1 .5-.5ZM6 6a.5.5 0 1 0 0 1h4a.5.5 0 0 0 0-1H6Z" fill="#215BC4" />
                  </svg>
                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px]">
                    {"Cabinet (ex. Cabinet des Tilleuls)"}
                  </span>
                </div>
                <div className="flex h-[14px] min-w-[14px] shrink-0 items-center justify-center gap-[2px] rounded-[4px] border-[0.5px] border-black/5 pr-[3.5px] pl-[3px] lg:h-7 lg:min-w-7 lg:gap-1 lg:rounded-lg lg:border lg:pr-[7px] lg:pl-1.5">
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" className="size-2 shrink-0 lg:size-4" aria-hidden="true">
                    <rect x=".5" y=".5" width={15} height={15} rx="4.3" fill="#FEECF3" stroke="#FDDDEA" />
                    <path d="M11.5 6.34a.66.66 0 0 1 .66.66v.5c0 1.96-1.35 3.6-3.17 4.04.01.05.01.1.01.16v.6c0 .39-.31.7-.7.7H7.7a.7.7 0 0 1-.7-.7v-.6c0-.06 0-.11.02-.16C5.2 11.1 3.84 9.46 3.84 7.5V7c0-.36.3-.66.66-.66.36 0 .65.3.65.66v.5c0 1.57 1.27 2.84 2.84 2.84s2.85-1.27 2.85-2.84V7c0-.36.3-.66.66-.66ZM8 3c1.1 0 2 .9 2 2v2.5c0 1.1-.9 2-2 2s-2-.9-2-2V5c0-1.1.9-2 2-2Z" fill="#B81C5D" />
                  </svg>
                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px]">
                    {"Annulation (ex. demain 10 h 30, fauteuil 2)"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 flex w-full flex-col lg:mt-4">
              <div className="mb-1.5 flex items-center justify-between lg:mb-3">
                <span className="ml-1 font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.07px] lg:ml-2 lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px]">
                  {"Fauteuils aujourd'hui"}
                </span>
                <div className="flex items-center gap-[2px] lg:gap-1">
                  <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] lg:text-[12px] lg:leading-4">
                    {"Taux d'occupation"}
                  </span>
                  <div className="flex items-center">
                    <div className="flex h-[10px] min-w-[10px] shrink-0 items-center justify-center rounded-[3px] px-[2px] lg:h-5 lg:min-w-5 lg:rounded-[6px] lg:px-1">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-[7px] text-tir-muted-foreground/70 lg:size-3.5">
                        <path d="M8.14648 3.14673C8.34175 2.95147 8.65825 2.95147 8.85352 3.14673C9.04863 3.342 9.04873 3.65855 8.85352 3.85376L5.70703 7.00024L8.85352 10.1467C9.04863 10.342 9.04873 10.6585 8.85352 10.8538C8.6583 11.049 8.34176 11.0489 8.14648 10.8538L4.64648 7.35376C4.45122 7.1585 4.45122 6.84199 4.64648 6.64673L8.14648 3.14673Z" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="flex h-[10px] min-w-[10px] shrink-0 items-center justify-center rounded-[3px] px-[2px] lg:h-5 lg:min-w-5 lg:rounded-[6px] lg:px-1">
                      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className="size-[7px] text-tir-muted-foreground/70 lg:size-3.5">
                        <path d="M5.14648 3.14673C5.34175 2.95147 5.65825 2.95147 5.85352 3.14673L9.35352 6.64673C9.54863 6.842 9.54873 7.15855 9.35352 7.35376L5.85352 10.8538C5.6583 11.049 5.34176 11.0489 5.14648 10.8538C4.95122 10.6585 4.95122 10.342 5.14648 10.1467L8.29297 7.00024L5.14648 3.85376C4.95122 3.6585 4.95122 3.34199 5.14648 3.14673Z" fill="currentColor" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="rounded-[5px] p-px lg:rounded-[10px] lg:p-0.5">
                  <div className="flex items-center justify-between gap-1.5 rounded-[5px] py-[3px] pr-[5px] pl-[3px] lg:gap-3 lg:rounded-[10px] lg:py-1.5 lg:pr-2.5 lg:pl-1.5">
                    <div className="flex items-center gap-[2px] lg:gap-1">
                      <div className="flex size-[10px] min-w-[10px] shrink-0 items-center justify-center rounded-[3px] lg:size-5 lg:min-w-5 lg:rounded-[6px]">
                        <div className="size-1 rounded-full lg:size-2" style={{ backgroundColor: "#F5A300" }} />
                      </div>
                      <span className="font-medium text-[#242629] text-[7px] leading-[10px] tracking-[-0.07px] line-through opacity-30 lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px] dark:text-tir-foreground">
                        {"Complet jusqu'à 18 h"}
                      </span>
                    </div>
                    <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                      {"Fauteuil 1"}
                    </span>
                  </div>
                </div>
                <div className="rounded-[5px] p-px lg:rounded-[10px] lg:p-0.5">
                  <div className="flex items-center justify-between gap-1.5 rounded-[5px] py-[3px] pr-[5px] pl-[3px] lg:gap-3 lg:rounded-[10px] lg:py-1.5 lg:pr-2.5 lg:pl-1.5">
                    <div className="flex items-center gap-[2px] lg:gap-1">
                      <div className="flex size-[10px] min-w-[10px] shrink-0 items-center justify-center rounded-[3px] lg:size-5 lg:min-w-5 lg:rounded-[6px]">
                        <div className="size-1 rounded-full lg:size-2" style={{ backgroundColor: "#CDCED2" }} />
                      </div>
                      <span className="font-medium text-[#242629] text-[7px] leading-[10px] tracking-[-0.07px] line-through opacity-30 lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px] dark:text-tir-foreground">
                        {"Creux de 11 h 30 à 12 h 15"}
                      </span>
                    </div>
                    <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                      {"Fauteuil 2"}
                    </span>
                  </div>
                </div>
                <div className="rounded-[7px] bg-tir-card p-px shadow-[0px_1px_2px_0px_rgba(0,0,0,0.06),0px_1px_3px_0px_rgba(0,0,0,0.1)] lg:rounded-[14px] lg:p-0.5 dark:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.4),0px_1px_3px_0px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center justify-between gap-1.5 rounded-[5px] py-[3px] pr-[5px] pl-[3px] lg:gap-3 lg:rounded-[10px] lg:py-1.5 lg:pr-2.5 lg:pl-1.5">
                    <div className="flex items-center gap-[2px] lg:gap-1">
                      <div className="flex size-[10px] min-w-[10px] shrink-0 items-center justify-center rounded-[3px] lg:size-5 lg:min-w-5 lg:rounded-[6px]">
                        <div className="size-1 rounded-full bg-[#00D17E] lg:size-2" />
                      </div>
                      <span className="font-medium text-[#242629] text-[7px] leading-[10px] tracking-[-0.07px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.14px] dark:text-tir-foreground">
                        {"Après-midi sans assistante : 2 h 30 vides"}
                      </span>
                    </div>
                    <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                      {"Fauteuil 3"}
                    </span>
                  </div>
                  <div className="px-[5px] pb-[3px] lg:px-2.5 lg:pb-1.5">
                    <div className="flex flex-col gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                        {"Objectif"}
                      </span>
                      <div className="flex items-start gap-1 text-tir-muted-foreground lg:gap-2">
                        <svg viewBox="0 0 14 14" fill="none" className="mt-px size-1.5 shrink-0 lg:mt-0.5 lg:size-3" aria-hidden="true">
                          <path d="M9 1.5C9.69 1.5 10.24 1.5 10.68 1.54c.45.04.83.12 1.18.3.56.28 1.02.74 1.3 1.31.18.35.26.73.29 1.18.04.44.04.99.04 1.68v2c0 .69 0 1.24-.04 1.68a2.55 2.55 0 0 1-.29 1.18 3 3 0 0 1-1.31 1.31 2.55 2.55 0 0 1-1.18.29c-.44.04-.99.04-1.68.04H5c-.69 0-1.24 0-1.68-.04a2.55 2.55 0 0 1-1.18-.29 3 3 0 0 1-1.3-1.31 2.55 2.55 0 0 1-.3-1.18C.5 9.24.5 8.69.5 8V6c0-.69 0-1.24.04-1.68.04-.45.12-.83.3-1.18a3 3 0 0 1 1.3-1.31c.35-.18.73-.26 1.18-.29C3.76 1.5 4.31 1.5 5 1.5h4ZM5 2.5c-.71 0-1.21 0-1.6.03-.39.03-.62.1-.81.19a2 2 0 0 0-.87.87c-.1.19-.16.42-.19.81C1.5 4.8 1.5 5.3 1.5 6v2c0 .71 0 1.21.03 1.6.03.39.1.62.19.81.18.38.49.69.87.87.19.1.42.16.81.19.39.03.89.03 1.6.03h4c.71 0 1.21 0 1.6-.03.39-.03.62-.1.81-.19.38-.18.69-.49.87-.87.1-.19.16-.42.19-.81.03-.39.03-.89.03-1.6V6c0-.71 0-1.21-.03-1.6-.03-.39-.1-.62-.19-.81a2 2 0 0 0-.87-.87 2 2 0 0 0-.81-.19c-.39-.03-.89-.03-1.6-.03H5Zm6 5a.5.5 0 1 1 0 1H8.5a.5.5 0 0 1 0-1H11Zm0-2a.5.5 0 1 1 0 1H8.5a.5.5 0 0 1 0-1H11Z" fill="currentColor" />
                        </svg>
                        <p className="font-medium text-[6.5px] leading-2 lg:text-[13px] lg:leading-4">
                          {"Deux soins à basculer sur le fauteuil 1"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-tir-muted-foreground lg:gap-2">
                        <svg viewBox="0 0 14 14" fill="none" className="size-1.5 shrink-0 lg:size-3" aria-hidden="true">
                          <path d="M3.38 5.91A2.74 2.74 0 0 1 7.6 6.18l.18.19a.5.5 0 0 1-.74.66L6.86 6.7a1.78 1.78 0 0 0-2.52 0L3.1 7.94a1.79 1.79 0 0 0 0 2.52c.7.69 1.83.69 2.52 0l1-1a.5.5 0 0 1 .7.7l-1 1a2.79 2.79 0 0 1-3.95-3.94l1.01-1.31ZM7.15 2.15a2.79 2.79 0 0 1 3.94 3.94L9.85 7.33a2.74 2.74 0 0 1-4.22-.28L5.55 6.86a.5.5 0 0 1 .74-.66l.13.13c.7.7 1.84.7 2.52 0l1.24-1.24a1.79 1.79 0 0 0-2.52-2.52l-1 1a.5.5 0 0 1-.7-.7l1-1Z" fill="currentColor" />
                        </svg>
                        <p className="font-medium text-[6.5px] leading-2 underline lg:text-[13px] lg:leading-4">
                          {"Exemple préparé dans votre navigateur"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 lg:mt-4 lg:gap-2">
                      <div className="flex items-center gap-1 lg:gap-2">
                        <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                          {"Présences"}
                        </span>
                        <span className="rounded-[2.5px] border-[0.5px] border-black/5 bg-tir-muted px-[1.5px] font-medium text-[5.5px] text-tir-muted-foreground leading-[8px] lg:rounded-[5px] lg:border lg:px-[3px] lg:text-[11px] lg:leading-4">
                          {"3"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 lg:gap-2">
                        <div className="flex size-2 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-black/5 lg:size-4 from-sky-500 to-blue-700">
                          <span className="font-semibold text-[3px] text-white leading-none lg:text-[6px]">
                            {"MR"}
                          </span>
                        </div>
                        <span className="font-medium text-[6.5px] text-tir-muted-foreground leading-2 lg:text-[13px] lg:leading-4 dark:text-tir-foreground">
                          {"Dr Martin"}
                        </span>
                        <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                          {"Fauteuil 1"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 lg:gap-2">
                        <div className="flex size-2 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-1 ring-black/5 lg:size-4 from-rose-400 to-pink-600">
                          <span className="font-semibold text-[3px] text-white leading-none lg:text-[6px]">
                            {"PL"}
                          </span>
                        </div>
                        <span className="font-medium text-[6.5px] text-tir-muted-foreground leading-2 lg:text-[13px] lg:leading-4 dark:text-tir-foreground">
                          {"Dr Lebrun"}
                        </span>
                        <span className="font-medium text-[6px] text-tir-muted-foreground/70 leading-[8px] lg:text-[12px] lg:leading-4">
                          {"Collaborateur"}
                        </span>
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
  );
}

export function PanneauCalculateur() {
  return (
    <div className="overflow-hidden rounded-lg border border-tir-border bg-tir-card shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl dark:shadow-[0px_2px_6px_0px_rgba(0,0,0,0.4),0px_6px_20px_-2px_rgba(0,0,0,0.5)]">
      <div className="relative grid h-[340px] w-full grid-rows-[auto_1fr] sm:h-[420px] md:h-[500px] lg:h-[600px] lg:grid-cols-[272px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="hidden items-center gap-3 border-tir-border border-r border-b bg-tir-card pr-4 pl-3 lg:flex lg:h-12">
          <MarqueTiroma className="size-6 shrink-0 text-tir-foreground" />
          <div className="flex h-full flex-1 items-center gap-1">
            <span className="font-semibold text-tir-foreground text-sm leading-5 tracking-[-0.16px]">
              {"Tiroma"}
            </span>
            <svg aria-hidden="true" role="presentation" className="size-3.5 shrink-0 text-tir-muted-foreground" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25L7 9.25L11 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <svg aria-hidden="true" role="presentation" className="size-[18px] shrink-0 text-tir-foreground opacity-55" viewBox="0 0 18 18" fill="none">
            <path d="M12.1797 2.5C12.9275 2.5 13.5188 2.49925 13.9941 2.53809C14.4753 2.5774 14.8819 2.6596 15.2529 2.84863C15.8549 3.15542 16.3446 3.64505 16.6514 4.24707C16.8403 4.618 16.9226 5.02485 16.9619 5.50586C17.0007 5.98111 17 6.57268 17 7.32031V10.6797C17 11.4273 17.0007 12.0189 16.9619 12.4941C16.9226 12.9751 16.8404 13.382 16.6514 13.7529C16.3446 14.3549 15.8549 14.8446 15.2529 15.1514C14.882 15.3404 14.4752 15.4226 13.9941 15.4619C13.5188 15.5007 12.9275 15.5 12.1797 15.5L5.82031 15.5C5.07251 15.5 4.48117 15.5007 4.00586 15.4619C3.52479 15.4226 3.11804 15.3404 2.74707 15.1514C2.1451 14.8446 1.65543 14.3549 1.34863 13.7529C1.15964 13.382 1.07741 12.9751 1.03809 12.4941C0.999258 12.0189 1 11.4273 1 10.6797L1 7.32031C1 6.57268 0.999281 5.98111 1.03809 5.50586C1.07739 5.02485 1.1597 4.618 1.34863 4.24707C1.65539 3.64505 2.14507 3.15542 2.74707 2.84863C3.11807 2.6596 3.52474 2.5774 4.00586 2.53809C4.48117 2.49925 5.07249 2.5 5.82031 2.5L12.1797 2.5ZM5.82031 3.5C5.05599 3.5 4.51206 3.50042 4.08691 3.53516C3.66788 3.56943 3.40764 3.63503 3.20117 3.74023C2.78746 3.95113 2.4511 4.28744 2.24023 4.70117C2.13512 4.9076 2.06941 5.16806 2.03516 5.58691C2.00045 6.01201 2 6.55621 2 7.32031L2 10.6797C2 11.4438 2.00043 11.988 2.03516 12.4131C2.06943 12.8319 2.13506 13.0924 2.24023 13.2988C2.45113 13.7125 2.78749 14.0489 3.20117 14.2598C3.40762 14.3649 3.66797 14.4306 4.08691 14.4648C4.51206 14.4996 5.05601 14.5 5.82031 14.5L7 14.5L7 3.5H5.82031ZM8 14.5H12.1797C12.944 14.5 13.4879 14.4996 13.9131 14.4648C14.332 14.4306 14.5924 14.3649 14.7988 14.2598C15.2125 14.0489 15.5489 13.7125 15.7598 13.2988C15.8649 13.0924 15.9306 12.8319 15.9648 12.4131C15.9996 11.988 16 11.4438 16 10.6797L16 7.32031C16 6.55621 15.9995 6.01201 15.9648 5.58691C15.9306 5.16806 15.8649 4.9076 15.7598 4.70117C15.5489 4.28744 15.2125 3.95113 14.7988 3.74023C14.5924 3.63503 14.3321 3.56943 13.9131 3.53516C13.4879 3.50042 12.944 3.5 12.1797 3.5L8 3.5L8 14.5ZM5.3252 7.5C5.60111 7.50026 5.82519 7.72402 5.8252 8C5.8252 8.27598 5.60111 8.49974 5.3252 8.5H3.97559C3.69944 8.5 3.47559 8.27614 3.47559 8C3.47559 7.72386 3.69944 7.5 3.97559 7.5H5.3252ZM5.34961 5.5C5.62575 5.5 5.84961 5.72386 5.84961 6C5.84961 6.27614 5.62575 6.5 5.34961 6.5H4C3.72386 6.5 3.5 6.27614 3.5 6C3.5 5.72386 3.72386 5.5 4 5.5L5.34961 5.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex w-full items-center border-tir-border border-b">
          <div className="flex h-full w-full items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2 lg:gap-8 lg:px-4 lg:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <span className="truncate font-medium text-[11px] text-tir-foreground leading-4 tracking-[-0.1px] sm:text-sm sm:leading-5 sm:tracking-[-0.14px]">
                {"Tiroma · charge des fauteuils"}
              </span>
              <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 shrink-0 text-tir-muted-foreground sm:size-3.5">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.00002 1.16675C7.18517 1.16675 7.35407 1.27555 7.43078 1.44519L8.88191 4.65489L12.3898 5.09671C12.5733 5.11983 12.7273 5.24732 12.7851 5.42331C12.8428 5.5993 12.7942 5.79287 12.6597 5.92019L10.0542 8.38523L10.7097 11.8616C10.7439 12.0432 10.6706 12.2281 10.5216 12.3369C10.3727 12.4457 10.1739 12.4598 10.0109 12.3734L7.00002 10.7763L3.98916 12.3734C3.82615 12.4598 3.62739 12.4457 3.47841 12.3369C3.32944 12.2281 3.25618 12.0432 3.29035 11.8616L3.94583 8.38523L1.34034 5.92019C1.20584 5.79287 1.15725 5.5993 1.21499 5.42331C1.27274 5.24732 1.42674 5.11983 1.61022 5.09671L5.11813 4.65489L6.56926 1.44519C6.64597 1.27555 6.81487 1.16675 7.00002 1.16675Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex shrink-0 items-center gap-px">
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path d="M7 2C7.27612 2 7.49996 2.22389 7.5 2.5V6.5H11.5C11.7761 6.5 12 6.72386 12 7C12 7.27614 11.7761 7.5 11.5 7.5H7.5V11.5C7.5 11.7761 7.27614 12 7 12C6.72386 12 6.5 11.7761 6.5 11.5V7.5H2.5C2.22386 7.5 2 7.27614 2 7C2 6.72386 2.22386 6.5 2.5 6.5H6.5V2.5C6.50004 2.22389 6.72388 2 7 2Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.33325 2.33325C1.96506 2.33325 1.66659 2.63173 1.66659 2.99992V10.9999C1.66659 11.3681 1.96506 11.6666 2.33325 11.6666H11.6666C12.0348 11.6666 12.3333 11.3681 12.3333 10.9999V2.99992C12.3333 2.63173 12.0348 2.33325 11.6666 2.33325H2.33325ZM0.666587 2.99992C0.666587 2.07945 1.41278 1.33325 2.33325 1.33325H11.6666C12.5871 1.33325 13.3333 2.07945 13.3333 2.99992V10.9999C13.3333 11.9204 12.5871 12.6666 11.6666 12.6666H2.33325C1.41278 12.6666 0.666587 11.9204 0.666587 10.9999V2.99992ZM9.33325 2.33325V11.6666H8.33325V2.33325H9.33325Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" className="size-3 text-tir-muted-foreground sm:size-3.5" width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M7.438 3.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 7a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 10.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0Z" fill="currentColor" stroke="currentColor" strokeWidth=".7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <BarreLaterale />
        <div className="h-full w-full overflow-hidden bg-tir-card">
          <div className="relative z-10 border-tir-border border-b-[0.5px] bg-tir-card lg:border-b">
            <div className="flex items-center justify-end px-1.5 pt-[5px] pb-[4.5px] lg:px-3 lg:pt-2.5 lg:pb-[9px]">
              <div className="flex items-center gap-x-1 lg:gap-x-2">
                <button type="button" className="flex items-center gap-[3px] rounded-sm bg-tir-card py-0.5 pr-[4.5px] pl-[3px] shadow-[0px_0px_2px_0px_#E0E0E0,0px_2px_4px_-2px_rgba(24,39,75,0.02),0px_4px_4px_-2px_rgba(24,39,75,0.06)] lg:gap-1.5 lg:rounded-lg lg:py-1 lg:pr-[9px] lg:pl-1.5 lg:shadow-[0px_0px_1px_0px_#E0E0E0,0px_1px_2px_-1px_rgba(24,39,75,0.02),0px_2px_2px_-1px_rgba(24,39,75,0.06)]">
                  <svg aria-hidden="true" role="presentation" className="size-[7px] lg:size-[14px]" width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M11.525 4.699c.122 0 .225-.1.225-.228V1.749a.55.55 0 0 1 1.1 0V4.47c0 .731-.592 1.328-1.325 1.328H8.813a.55.55 0 0 1 0-1.1h2.712Z" fill="currentColor" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.93 2.3C4.349 2.3 2.25 4.401 2.25 7c0 2.597 2.098 4.7 4.68 4.7a4.676 4.676 0 0 0 4.097-2.426.55.55 0 0 1 .963.531A5.776 5.776 0 0 1 6.93 12.8c-3.194 0-5.78-2.598-5.78-5.8 0-3.201 2.586-5.8 5.78-5.8 2.18 0 4.076 1.21 5.06 2.994a.55.55 0 0 1-.963.532 4.676 4.676 0 0 0-4.096-2.426Z" fill="currentColor" />
                  </svg>
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Voir le détail"}
                  </span>
                </button>
                <button type="button" className="flex items-center rounded-sm border-[#2666DC] border-[0.5px] bg-[#266DF0] py-[1.5px] pr-[3.5px] pl-[2.5px] shadow-[0px_1px_2px_-1px_rgba(15,107,233,0.12),0px_1.5px_3px_-1px_rgba(15,107,233,0.08)] lg:rounded-lg lg:border lg:py-[3px] lg:pr-[7px] lg:pl-[5px] lg:shadow-[0px_2px_4px_-2px_rgba(15,107,233,0.12),0px_3px_6px_-2px_rgba(15,107,233,0.08)]">
                  <svg aria-hidden="true" role="presentation" className="size-[7px] lg:size-[14px]" width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <path d="M7 12.5H5.5c-1.4 0-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092C1.5 10.6 1.5 9.9 1.5 8.5v-3c0-1.4 0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093C3.4 1.5 4.1 1.5 5.5 1.5h3c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C12.5 3.4 12.5 4.1 12.5 5.5V7M4.46 5.309v4.23M7 4.46v5.078M9.54 7v1M12.5 10.75H9M10.75 9v3.5" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="ml-1.5 font-medium text-[7px] text-white leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Voir ce que Tiroma reprendrait"}
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="px-2.5 pt-[6px] pb-1.5 sm:pt-[8px] sm:pb-2 md:pt-[11px] md:pb-2.5 lg:px-5 lg:pt-[22px] lg:pb-5">
            <div className="flex flex-col gap-[3px] lg:gap-1.5">
              <span className="font-semibold text-[10px] text-tir-foreground leading-[12px] tracking-[-0.2px] lg:text-[20px] lg:leading-6 lg:tracking-[-0.4px]">
                {"Ce que coûtent vos créneaux perdus"}
              </span>
              <span className="hidden font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] sm:block lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                {"Estimation à partir de vos chiffres et de la part des annulations tardives qui ne sont pas remplacées (51 %, Doctolib 2024)."}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5 lg:mt-4 lg:gap-3">
              <div className="rounded-md border-[0.5px] border-tir-border bg-tir-card lg:rounded-xl lg:border">
                <div className="flex items-center gap-x-[4px] px-[5.5px] pt-[4.5px] lg:gap-x-[8px] lg:px-[11px] lg:pt-[9px]">
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Heures de fauteuil perdues par mois"}
                  </span>
                  <span className="flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border px-[2.5px] py-[0.5px] pl-[1.5px] font-medium text-[6px] text-tir-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pl-[3px] lg:text-[12px] lg:leading-4">
                    <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 4.8c0-1.68 0-2.52.327-3.162A3 3 0 0 1 1.638.327C2.28 0 3.12 0 4.8 0h2.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C12 2.28 12 3.12 12 4.8v2.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C9.72 12 8.88 12 7.2 12H4.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C0 9.72 0 8.88 0 7.2V4.8Zm2.494-1.371c0-.517.418-.935.935-.935h1.135c.516 0 .935.418.935.935v1.87a.935.935 0 0 1-.935.935H3.429a.935.935 0 0 1-.935-.935v-1.87Zm4.942 2.337a.935.935 0 0 0-.935.935v1.87c0 .517.419.935.935.935h1.135a.935.935 0 0 0 .936-.935v-1.87a.935.935 0 0 0-.936-.935H7.436ZM6.501 3.43c0-.517.419-.935.935-.935h1.135c.517 0 .936.418.936.935v.402a.935.935 0 0 1-.936.935H7.436a.935.935 0 0 1-.935-.935v-.402ZM3.429 7.234a.935.935 0 0 0-.935.935v.402c0 .517.418.936.935.936h1.135a.935.935 0 0 0 .935-.936V8.17a.935.935 0 0 0-.935-.935H3.429Z" fill="#9162F9" />
                    </svg>
                    <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                      {"Annuel"}
                    </span>
                  </span>
                </div>
                <div className="mt-[9px] flex w-full lg:mt-[18px]">
                  <div className="flex w-full flex-col pb-[20px] lg:pb-[46px]">
                    <div className="flex items-center gap-x-2 self-center pt-1 lg:gap-x-4 lg:pt-2">
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#F4F5F6" stroke="#D1D3D6" strokeDasharray="1.1 2.2" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Annulations tardives par semaine"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#D1D3D6" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Durée moyenne d'un créneau"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#FFD03D" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Valeur d'une heure de fauteuil"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#FB84A7" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Mensuel"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#A27AFA" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Objectif"}
                        </span>
                      </div>
                    </div>
                    <div className="relative grid w-full grid-cols-[auto_1fr] gap-x-[7.5px] gap-y-[9.5px] pt-[14px] pr-[9px] pl-[6.5px] lg:gap-x-[15px] lg:gap-y-[19px] lg:pt-[28px] lg:pr-[18px] lg:pl-[13px]">
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"41"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"34"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"30"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"18"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"12"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"9"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="contents">
                        <div className="flex justify-end py-0.5 lg:py-1">
                          <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                            {"2"}
                          </span>
                        </div>
                        <svg aria-hidden="true" role="presentation" className="relative top-[-0.25px] h-[0.5px] w-full self-center overflow-visible lg:top-0 lg:h-px">
                          <line className="text-tir-border [stroke-dasharray:2_2.5] [stroke-dashoffset:-0.5] [stroke-width:0.5px] lg:[stroke-dasharray:4_5] lg:[stroke-dashoffset:-1] lg:[stroke-width:1px]" x1="0" y1="0.5" x2="100%" y2="0.5" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div />
                      <div className="h-[0.75px] w-full bg-tir-border lg:h-[1.5px]" />
                      <div className="absolute inset-0 col-start-2 row-start-1 row-end-[8] pt-[6px] pr-[5px] pb-[0.5px] pl-[5px] lg:pt-[12px] lg:pr-[10px] lg:pb-[1px] lg:pl-[10px]">
                        <div className="relative grid h-full w-full grid-cols-3 gap-x-1.5 sm:gap-x-2.5 lg:gap-x-6">
                          <div className="relative h-full w-full">
                            <div className="relative flex h-full w-full items-end justify-between overflow-hidden">
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "14.2%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFEBAD" stroke="#FFD03D" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "24.6%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFD03D" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "41.9%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FDC4D5" stroke="#FB84A7" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "68.1%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FB84A7" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "18.7%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#D6C4FD" stroke="#A27AFA" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "35.3%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#A27AFA" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                            <span className="-translate-x-1/2 absolute bottom-[-14.5px] left-1/2 font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:bottom-[-29px] lg:text-[12px] lg:leading-4">
                              {"LUN"}
                            </span>
                          </div>
                          <div className="relative h-full w-full">
                            <div className="relative flex h-full w-full items-end justify-between overflow-hidden">
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "15.2%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFEBAD" stroke="#FFD03D" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "37.4%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFD03D" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "51.2%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FDC4D5" stroke="#FB84A7" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "88.9%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FB84A7" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "27.7%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#D6C4FD" stroke="#A27AFA" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "48.4%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#A27AFA" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                            <span className="-translate-x-1/2 absolute bottom-[-14.5px] left-1/2 font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:bottom-[-29px] lg:text-[12px] lg:leading-4">
                              {"MAR"}
                            </span>
                          </div>
                          <div className="relative h-full w-full">
                            <div className="relative flex h-full w-full items-end justify-between overflow-hidden">
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "20.8%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFEBAD" stroke="#FFD03D" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "43.9%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FFD03D" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "59.9%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FDC4D5" stroke="#FB84A7" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "100%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#FB84A7" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "36%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#D6C4FD" stroke="#A27AFA" strokeDasharray="4 4" strokeDashoffset="3" strokeLinecap="round" strokeWidth="1" />
                                </svg>
                              </div>
                              <div className="w-[7px] lg:w-[14.7px]" style={{ height: "66%" }}>
                                <svg aria-hidden="true" role="presentation" className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 14 100">
                                  <path d="M 0.5 100 L 0.5 6.5 A 6 6 0 0 1 6.5 0.5 L 7.5 0.5 A 6 6 0 0 1 13.5 6.5 L 13.5 100 Z" fill="#A27AFA" strokeLinecap="round" />
                                </svg>
                              </div>
                            </div>
                            <span className="-translate-x-1/2 absolute bottom-[-14.5px] left-1/2 font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:bottom-[-29px] lg:text-[12px] lg:leading-4">
                              {"MER"}
                            </span>
                          </div>
                          <div className="absolute top-4 left-[58%] z-10 flex min-w-[140px] origin-top-left flex-col gap-y-1 rounded-md border border-tir-border bg-tir-card p-1 shadow-lg lg:top-8 lg:min-w-[280px] lg:gap-y-2 lg:rounded-xl lg:p-2">
                            <div className="flex items-center gap-1 lg:gap-2">
                              <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                {"Valeur perdue par mois"}
                              </span>
                              <span className="inline-flex items-center text-nowrap rounded-sm border-[#C7F4D3] border-[0.5px] bg-[#DDF9E4] px-[2.5px] py-[0.5px] pl-[3px]! font-medium text-[#075A39] text-[6px] leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300">
                                <svg aria-hidden="true" role="presentation" width={12} height={12} viewBox="0 0 12 12" fill="none" className="mr-px size-1.5 lg:mr-0.5 lg:size-3">
                                  <path d="M3.1715 8.82896L8.82835 3.1721M8.82835 3.1721L8.92937 7.31373M8.82835 3.1721L4.68673 3.07109" stroke="#075A39" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {"41 %"}
                              </span>
                            </div>
                            <div className="flex w-full items-center gap-x-1 lg:gap-x-2">
                              <div className="flex-[0_0_1.5px] self-stretch rounded-full bg-[#FB84A7] lg:flex-[0_0_3px]" />
                              <div className="flex flex-col gap-y-[3px] py-0.5 pr-0.5 lg:gap-y-1.5 lg:py-1 lg:pr-1">
                                <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                  {"JEU"}
                                </span>
                                <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                    {"Durée moyenne d'un créneau"}
                                  </span>
                                  <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                                    {"Annuel"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-[3px] lg:gap-x-1.5">
                                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                    {"Heures de fauteuil perdues par mois"}
                                  </span>
                                  <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                                    {"45 min prévues"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <svg aria-hidden="true" role="presentation" width="100%" height={1}>
                              <line x1="0" y1="0.5" x2="100%" y2="0.5" className="text-tir-border" stroke="currentColor" strokeDasharray="3 5" strokeLinecap="round" />
                            </svg>
                            <div className="flex w-full items-center gap-x-1 lg:gap-x-2">
                              <div className="flex-[0_0_1.5px] self-stretch rounded-full bg-[#FB84A7] lg:flex-[0_0_3px]" />
                              <div className="flex flex-col gap-y-[3px] py-0.5 pr-0.5 lg:gap-y-1.5 lg:py-1 lg:pr-1">
                                <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                  {"MER"}
                                </span>
                                <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                    {"Durée moyenne d'un créneau"}
                                  </span>
                                  <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                                    {"Annuel"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-[3px] lg:gap-x-1.5">
                                  <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                                    {"Valeur perdue par mois"}
                                  </span>
                                  <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                                    {"40 min demandées"}
                                  </span>
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
              <div className="rounded-md border-[0.5px] border-tir-border bg-tir-card lg:rounded-xl lg:border">
                <div className="flex items-center gap-x-[4px] px-[5.5px] pt-[4.5px] lg:gap-x-[8px] lg:px-[11px] lg:pt-[9px]">
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Le point du matin arrive là où vous êtes"}
                  </span>
                  <span className="flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border px-[2.5px] py-[0.5px] pl-[1.5px] font-medium text-[6px] text-tir-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pl-[3px] lg:text-[12px] lg:leading-4">
                    <svg aria-hidden="true" role="presentation" className="h-1.5 w-[6.5px] lg:h-3 lg:w-[13px]" width={13} height={12} viewBox="0 0 13 12" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M.827 1.638C.5 2.28.5 3.12.5 4.8v2.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C2.78 12 3.62 12 5.3 12h2.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C12.5 9.72 12.5 8.88 12.5 7.2V4.8c0-1.68 0-2.52-.327-3.162A3 3 0 0 0 10.862.327C10.22 0 9.38 0 7.7 0H5.3C3.62 0 2.78 0 2.138.327A3 3 0 0 0 .827 1.638Zm2.442 5.1V5.262c0-1.034 0-1.551.201-1.946.177-.348.46-.63.807-.807.395-.201.912-.201 1.946-.201h.554c1.034 0 1.55 0 1.946.2.347.178.63.46.807.808.2.395.2.912.2 1.946v1.476c0 1.034 0 1.551-.2 1.946-.177.348-.46.63-.807.807-.395.201-.912.201-1.946.201h-.554c-1.034 0-1.55 0-1.946-.2a1.846 1.846 0 0 1-.807-.808c-.2-.395-.2-.912-.2-1.946Zm3.693-3.23a.462.462 0 0 0-.923 0v.067a1.17 1.17 0 0 0-.762.319 1.105 1.105 0 0 0-.346.8c0 .305.127.593.346.8.218.208.509.321.808.321h.83c.069 0 .13.026.172.066.04.04.06.087.06.132a.182.182 0 0 1-.06.132.249.249 0 0 1-.172.066h-1.32a.462.462 0 1 0 0 .923h.443V7.2a.462.462 0 1 0 .923 0v-.067a1.17 1.17 0 0 0 .762-.32c.219-.208.346-.495.346-.8 0-.305-.127-.592-.346-.8a1.172 1.172 0 0 0-.808-.32h-.83a.249.249 0 0 1-.172-.067.183.183 0 0 1-.06-.132c0-.045.02-.092.06-.132a.249.249 0 0 1 .172-.065h1.301a.462.462 0 0 0 0-.923h-.424v-.066ZM4.192 8.4c0-.255.207-.462.462-.462h3.692a.462.462 0 0 1 0 .923H4.654a.462.462 0 0 1-.462-.461Z" fill="#FD9038" />
                    </svg>
                    <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                      {"Inclus dans chaque formule"}
                    </span>
                  </span>
                </div>
                <div className="mt-[9px] flex w-full lg:mt-[18px]">
                  <div className="relative flex w-full flex-col items-center">
                    <div className="flex items-center gap-x-2 pt-[3px] lg:gap-x-4 lg:pt-1.5">
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#F65385" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"WhatsApp"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#266DF0" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"E-mail"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#14AED6" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"WhatsApp"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-[5px] overflow-visible lg:size-2.5" viewBox="0 0 10 10">
                          <rect x="0" y="0" width="100%" height="100%" rx="4" fill="#DE98E6" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Tableau"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-[0.5px] lg:gap-x-px">
                        <svg aria-hidden="true" role="presentation" className="h-2.5 w-[10.5px] lg:h-5 lg:w-[21px]" width={21} height={20} viewBox="0 0 21 20" fill="none">
                          <rect x="3.25" y="3" width={6} height={6} rx="2" fill="#A27AFA" />
                          <rect x="3.25" y="11" width={6} height={6} rx="2" fill="#266DF0" />
                          <rect x="11.25" y="3" width={6} height={6} rx="2" fill="#14AED6" />
                          <rect x="11.25" y="11" width={6} height={6} rx="2" fill="#D1D3D6" />
                        </svg>
                        <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                          {"Présences"}
                        </span>
                      </div>
                    </div>
                    <svg aria-hidden="true" role="presentation" className="mt-2 size-[120px] overflow-visible sm:mt-3 sm:size-[140px] md:mt-5 md:size-[180px] lg:mt-8 lg:size-[280px]" viewBox="0 0 280 280">
                      <path d="M 141.18 5.0 A 4 4 0 0 1 145.21 1.10 A 139 139 0 0 1 227.76 247.80 A 4 4 0 0 1 222.18 247.10 L 196.61 213.78 A 4 4 0 0 1 197.30 208.10 A 89 89 0 0 0 144.77 51.13 A 4 4 0 0 1 140.81 47.00 Z" fill="#F65385" />
                      <path d="M 220.30 248.52 A 4 4 0 0 1 219.43 254.07 A 139 139 0 0 1 48.17 244.34 A 4 4 0 0 1 47.93 238.73 L 76.57 208.02 A 4 4 0 0 1 82.29 207.75 A 89 89 0 0 0 189.67 213.85 A 4 4 0 0 1 195.32 214.76 Z" fill="#266DF0" />
                      <path d="M 46.22 237.11 A 4 4 0 0 1 40.61 237.17 A 139 139 0 0 1 13.67 197.97 A 4 4 0 0 1 15.73 192.75 L 54.39 176.34 A 4 4 0 0 1 59.72 178.42 A 89 89 0 0 0 75.36 201.18 A 4 4 0 0 1 75.40 206.90 Z" fill="#FFD03D" />
                      <path d="M 14.83 190.57 A 4 4 0 0 1 9.68 188.34 A 139 139 0 0 1 2.24 158.50 A 4 4 0 0 1 5.74 154.11 L 47.51 149.72 A 4 4 0 0 1 51.99 153.27 A 89 89 0 0 0 56.07 169.60 A 4 4 0 0 1 53.77 174.84 Z" fill="#FD9038" />
                      <path d="M 5.51 151.77 A 4 4 0 0 1 1.24 148.13 A 139 139 0 0 1 16.54 76.14 A 4 4 0 0 1 21.93 74.55 L 58.66 94.91 A 4 4 0 0 1 60.30 100.39 A 89 89 0 0 0 51.08 143.77 A 4 4 0 0 1 47.35 148.11 Z" fill="#DE98E6" />
                      <path d="M 23.09 72.50 A 4 4 0 0 1 21.67 67.07 A 139 139 0 0 1 47.63 36.13 A 4 4 0 0 1 53.22 36.58 L 80.22 68.76 A 4 4 0 0 1 79.79 74.46 A 89 89 0 0 0 65.00 92.08 A 4 4 0 0 1 59.46 93.50 Z" fill="#A27AFA" />
                      <path d="M 55.04 35.09 A 4 4 0 0 1 55.67 29.50 A 139 139 0 0 1 134.79 1.10 A 4 4 0 0 1 138.82 5.01 L 139.19 47.00 A 4 4 0 0 1 135.23 51.13 A 89 89 0 0 0 87.15 68.39 A 4 4 0 0 1 81.47 67.73 Z" fill="#14AED6" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="rounded-md border-[0.5px] border-tir-border bg-tir-card lg:rounded-xl lg:border">
                <div className="flex items-center gap-x-[4px] px-[5.5px] pt-[4.5px] lg:gap-x-[8px] lg:px-[11px] lg:pt-[9px]">
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Fauteuils aujourd'hui"}
                  </span>
                  <span className="flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border px-[2.5px] py-[0.5px] pl-[1.5px] font-medium text-[6px] text-tir-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pl-[3px] lg:text-[12px] lg:leading-4">
                    <svg aria-hidden="true" role="presentation" className="h-1.5 w-[6.5px] lg:h-3 lg:w-[13px]" width={13} height={12} viewBox="0 0 13 12" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M.827 1.638C.5 2.28.5 3.12.5 4.8v2.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C2.78 12 3.62 12 5.3 12h2.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C12.5 9.72 12.5 8.88 12.5 7.2V4.8c0-1.68 0-2.52-.327-3.162A3 3 0 0 0 10.862.327C10.22 0 9.38 0 7.7 0H5.3C3.62 0 2.78 0 2.138.327A3 3 0 0 0 .827 1.638Zm2.442 5.1V5.262c0-1.034 0-1.551.201-1.946.177-.348.46-.63.807-.807.395-.201.912-.201 1.946-.201h.554c1.034 0 1.55 0 1.946.2.347.178.63.46.807.808.2.395.2.912.2 1.946v1.476c0 1.034 0 1.551-.2 1.946-.177.348-.46.63-.807.807-.395.201-.912.201-1.946.201h-.554c-1.034 0-1.55 0-1.946-.2a1.846 1.846 0 0 1-.807-.808c-.2-.395-.2-.912-.2-1.946Zm3.693-3.23a.462.462 0 0 0-.923 0v.067a1.17 1.17 0 0 0-.762.319 1.105 1.105 0 0 0-.346.8c0 .305.127.593.346.8.218.208.509.321.808.321h.83c.069 0 .13.026.172.066.04.04.06.087.06.132a.182.182 0 0 1-.06.132.249.249 0 0 1-.172.066h-1.32a.462.462 0 1 0 0 .923h.443V7.2a.462.462 0 1 0 .923 0v-.067a1.17 1.17 0 0 0 .762-.32c.219-.208.346-.495.346-.8 0-.305-.127-.592-.346-.8a1.172 1.172 0 0 0-.808-.32h-.83a.249.249 0 0 1-.172-.067.183.183 0 0 1-.06-.132c0-.045.02-.092.06-.132a.249.249 0 0 1 .172-.065h1.301a.462.462 0 0 0 0-.923h-.424v-.066ZM4.192 8.4c0-.255.207-.462.462-.462h3.692a.462.462 0 0 1 0 .923H4.654a.462.462 0 0 1-.462-.461Z" fill="#FD9038" />
                    </svg>
                    <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                      {"Taux d'occupation"}
                    </span>
                  </span>
                </div>
                <div className="mt-[9px] flex w-full lg:mt-[18px]">
                  <div className="flex h-[50px] w-full justify-between pt-1 pr-5 pl-4 sm:h-[70px] md:h-[100px] lg:h-[200px] lg:pt-2 lg:pr-10 lg:pl-8">
                    <div className="flex flex-col items-center gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                        {"Fauteuil 1"}
                      </span>
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                        {"92 %"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                        {"Fauteuil 2"}
                      </span>
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                        {"74 %"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                        {"Fauteuil 3"}
                      </span>
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                        {"51 %"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                        {"Objectif"}
                      </span>
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                        {"41 %"}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1 lg:gap-2">
                      <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                        {"Agenda"}
                      </span>
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4">
                        {"34"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-md border-[0.5px] border-tir-border bg-tir-card lg:rounded-xl lg:border">
                <div className="flex items-center gap-x-[4px] px-[5.5px] pt-[4.5px] lg:gap-x-[8px] lg:px-[11px] lg:pt-[9px]">
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Valeur perdue par mois"}
                  </span>
                  <span className="flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border px-[2.5px] py-[0.5px] pl-[1.5px] font-medium text-[6px] text-tir-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pl-[3px] lg:text-[12px] lg:leading-4">
                    <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" width={12} height={12} viewBox="0 0 12 12" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M0 4.8c0-1.68 0-2.52.327-3.162A3 3 0 0 1 1.638.327C2.28 0 3.12 0 4.8 0h2.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C12 2.28 12 3.12 12 4.8v2.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C9.72 12 8.88 12 7.2 12H4.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C0 9.72 0 8.88 0 7.2V4.8Zm2.494-1.371c0-.517.418-.935.935-.935h1.135c.516 0 .935.418.935.935v1.87a.935.935 0 0 1-.935.935H3.429a.935.935 0 0 1-.935-.935v-1.87Zm4.942 2.337a.935.935 0 0 0-.935.935v1.87c0 .517.419.935.935.935h1.135a.935.935 0 0 0 .936-.935v-1.87a.935.935 0 0 0-.936-.935H7.436ZM6.501 3.43c0-.517.419-.935.935-.935h1.135c.517 0 .936.418.936.935v.402a.935.935 0 0 1-.936.935H7.436a.935.935 0 0 1-.935-.935v-.402ZM3.429 7.234a.935.935 0 0 0-.935.935v.402c0 .517.418.936.935.936h1.135a.935.935 0 0 0 .935-.936V8.17a.935.935 0 0 0-.935-.935H3.429Z" fill="#9162F9" />
                    </svg>
                    <span className="font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:text-[12px] lg:leading-4">
                      {"Mensuel"}
                    </span>
                  </span>
                </div>
                <div className="mt-[9px] flex w-full lg:mt-[18px]">
                  <div className="flex h-[50px] w-full items-start justify-center pt-1 sm:h-[70px] md:h-[100px] lg:h-[200px] lg:pt-2">
                    <div className="flex items-center gap-x-2.5 lg:gap-x-5">
                      <div className="flex items-center gap-x-0.5 lg:gap-x-1">
                        <svg aria-hidden="true" role="presentation" className="h-px w-[7px] lg:h-0.5 lg:w-[15px]" width={15} height={2} viewBox="0 0 15 2" fill="none">
                          <path d="M1.75 1h12" stroke="#94B9FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
                        </svg>
                        <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                          {"Facturé au mois, prix fixé à l'audit"}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-0.5 lg:gap-x-1">
                        <svg aria-hidden="true" role="presentation" className="h-px w-[7px] lg:h-0.5 lg:w-[15px]" width={15} height={2} viewBox="0 0 15 2" fill="none">
                          <path d="M1.75 1h12" stroke="#266DF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-medium text-[7px] text-tir-muted-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                          {"Facturé à l'année, prix fixé à l'audit"}
                        </span>
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
  );
}

export function PanneauParcours() {
  return (
    <div className="overflow-hidden rounded-lg border border-tir-border bg-tir-card shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl dark:shadow-[0px_2px_6px_0px_rgba(0,0,0,0.4),0px_6px_20px_-2px_rgba(0,0,0,0.5)]">
      <div className="relative grid h-[340px] w-full grid-rows-[auto_1fr] sm:h-[420px] md:h-[500px] lg:h-[600px] lg:grid-cols-[272px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="hidden items-center gap-3 border-tir-border border-r border-b bg-tir-card pr-4 pl-3 lg:flex lg:h-12">
          <MarqueTiroma className="size-6 shrink-0 text-tir-foreground" />
          <div className="flex h-full flex-1 items-center gap-1">
            <span className="font-semibold text-tir-foreground text-sm leading-5 tracking-[-0.16px]">
              {"Tiroma"}
            </span>
            <svg aria-hidden="true" role="presentation" className="size-3.5 shrink-0 text-tir-muted-foreground" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25L7 9.25L11 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <svg aria-hidden="true" role="presentation" className="size-[18px] shrink-0 text-tir-foreground opacity-55" viewBox="0 0 18 18" fill="none">
            <path d="M12.1797 2.5C12.9275 2.5 13.5188 2.49925 13.9941 2.53809C14.4753 2.5774 14.8819 2.6596 15.2529 2.84863C15.8549 3.15542 16.3446 3.64505 16.6514 4.24707C16.8403 4.618 16.9226 5.02485 16.9619 5.50586C17.0007 5.98111 17 6.57268 17 7.32031V10.6797C17 11.4273 17.0007 12.0189 16.9619 12.4941C16.9226 12.9751 16.8404 13.382 16.6514 13.7529C16.3446 14.3549 15.8549 14.8446 15.2529 15.1514C14.882 15.3404 14.4752 15.4226 13.9941 15.4619C13.5188 15.5007 12.9275 15.5 12.1797 15.5L5.82031 15.5C5.07251 15.5 4.48117 15.5007 4.00586 15.4619C3.52479 15.4226 3.11804 15.3404 2.74707 15.1514C2.1451 14.8446 1.65543 14.3549 1.34863 13.7529C1.15964 13.382 1.07741 12.9751 1.03809 12.4941C0.999258 12.0189 1 11.4273 1 10.6797L1 7.32031C1 6.57268 0.999281 5.98111 1.03809 5.50586C1.07739 5.02485 1.1597 4.618 1.34863 4.24707C1.65539 3.64505 2.14507 3.15542 2.74707 2.84863C3.11807 2.6596 3.52474 2.5774 4.00586 2.53809C4.48117 2.49925 5.07249 2.5 5.82031 2.5L12.1797 2.5ZM5.82031 3.5C5.05599 3.5 4.51206 3.50042 4.08691 3.53516C3.66788 3.56943 3.40764 3.63503 3.20117 3.74023C2.78746 3.95113 2.4511 4.28744 2.24023 4.70117C2.13512 4.9076 2.06941 5.16806 2.03516 5.58691C2.00045 6.01201 2 6.55621 2 7.32031L2 10.6797C2 11.4438 2.00043 11.988 2.03516 12.4131C2.06943 12.8319 2.13506 13.0924 2.24023 13.2988C2.45113 13.7125 2.78749 14.0489 3.20117 14.2598C3.40762 14.3649 3.66797 14.4306 4.08691 14.4648C4.51206 14.4996 5.05601 14.5 5.82031 14.5L7 14.5L7 3.5H5.82031ZM8 14.5H12.1797C12.944 14.5 13.4879 14.4996 13.9131 14.4648C14.332 14.4306 14.5924 14.3649 14.7988 14.2598C15.2125 14.0489 15.5489 13.7125 15.7598 13.2988C15.8649 13.0924 15.9306 12.8319 15.9648 12.4131C15.9996 11.988 16 11.4438 16 10.6797L16 7.32031C16 6.55621 15.9995 6.01201 15.9648 5.58691C15.9306 5.16806 15.8649 4.9076 15.7598 4.70117C15.5489 4.28744 15.2125 3.95113 14.7988 3.74023C14.5924 3.63503 14.3321 3.56943 13.9131 3.53516C13.4879 3.50042 12.944 3.5 12.1797 3.5L8 3.5L8 14.5ZM5.3252 7.5C5.60111 7.50026 5.82519 7.72402 5.8252 8C5.8252 8.27598 5.60111 8.49974 5.3252 8.5H3.97559C3.69944 8.5 3.47559 8.27614 3.47559 8C3.47559 7.72386 3.69944 7.5 3.97559 7.5H5.3252ZM5.34961 5.5C5.62575 5.5 5.84961 5.72386 5.84961 6C5.84961 6.27614 5.62575 6.5 5.34961 6.5H4C3.72386 6.5 3.5 6.27614 3.5 6C3.5 5.72386 3.72386 5.5 4 5.5L5.34961 5.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex w-full items-center border-tir-border border-b">
          <div className="flex h-full w-full items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2 lg:gap-8 lg:px-4 lg:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <span className="truncate font-medium text-[11px] text-tir-foreground leading-4 tracking-[-0.1px] sm:text-sm sm:leading-5 sm:tracking-[-0.14px]">
                {"Tiroma · plans sans rendez-vous"}
              </span>
              <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 shrink-0 text-tir-muted-foreground sm:size-3.5">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.00002 1.16675C7.18517 1.16675 7.35407 1.27555 7.43078 1.44519L8.88191 4.65489L12.3898 5.09671C12.5733 5.11983 12.7273 5.24732 12.7851 5.42331C12.8428 5.5993 12.7942 5.79287 12.6597 5.92019L10.0542 8.38523L10.7097 11.8616C10.7439 12.0432 10.6706 12.2281 10.5216 12.3369C10.3727 12.4457 10.1739 12.4598 10.0109 12.3734L7.00002 10.7763L3.98916 12.3734C3.82615 12.4598 3.62739 12.4457 3.47841 12.3369C3.32944 12.2281 3.25618 12.0432 3.29035 11.8616L3.94583 8.38523L1.34034 5.92019C1.20584 5.79287 1.15725 5.5993 1.21499 5.42331C1.27274 5.24732 1.42674 5.11983 1.61022 5.09671L5.11813 4.65489L6.56926 1.44519C6.64597 1.27555 6.81487 1.16675 7.00002 1.16675Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex shrink-0 items-center gap-px">
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path d="M7 2C7.27612 2 7.49996 2.22389 7.5 2.5V6.5H11.5C11.7761 6.5 12 6.72386 12 7C12 7.27614 11.7761 7.5 11.5 7.5H7.5V11.5C7.5 11.7761 7.27614 12 7 12C6.72386 12 6.5 11.7761 6.5 11.5V7.5H2.5C2.22386 7.5 2 7.27614 2 7C2 6.72386 2.22386 6.5 2.5 6.5H6.5V2.5C6.50004 2.22389 6.72388 2 7 2Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.33325 2.33325C1.96506 2.33325 1.66659 2.63173 1.66659 2.99992V10.9999C1.66659 11.3681 1.96506 11.6666 2.33325 11.6666H11.6666C12.0348 11.6666 12.3333 11.3681 12.3333 10.9999V2.99992C12.3333 2.63173 12.0348 2.33325 11.6666 2.33325H2.33325ZM0.666587 2.99992C0.666587 2.07945 1.41278 1.33325 2.33325 1.33325H11.6666C12.5871 1.33325 13.3333 2.07945 13.3333 2.99992V10.9999C13.3333 11.9204 12.5871 12.6666 11.6666 12.6666H2.33325C1.41278 12.6666 0.666587 11.9204 0.666587 10.9999V2.99992ZM9.33325 2.33325V11.6666H8.33325V2.33325H9.33325Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" className="size-3 text-tir-muted-foreground sm:size-3.5" width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M7.438 3.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 7a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 10.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0Z" fill="currentColor" stroke="currentColor" strokeWidth=".7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <BarreLaterale />
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#FBFBFB] dark:bg-tir-card">
          <div className="relative z-10 border-tir-border border-b-[0.5px] bg-tir-card lg:border-b">
            <div className="flex items-center justify-between px-1.5 pt-[5px] pb-[4.5px] lg:px-3 lg:pt-2.5 lg:pb-[9px]">
              <div className="flex items-center gap-x-[2.5px] lg:gap-x-[5px]">
                <div className="flex items-center gap-x-[3px] py-[1.5px] pr-[3px] pl-[2.5px] text-tir-muted-foreground lg:gap-x-1.5 lg:py-[3px] lg:pr-1.5 lg:pl-[5px]">
                  <svg aria-hidden="true" role="presentation" className="size-[7px] lg:size-[14px]" width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2.5 8v2.5a1 1 0 0 0 1 1M8 2.5h2.5a1 1 0 0 1 1 1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <path d="M10.705 5.808a1.052 1.052 0 0 1 1.487 1.487l-3.77 3.77c-.349.35-.524.524-.722.666a3.001 3.001 0 0 1-.563.32c-.224.096-.464.156-.944.276L5.5 12.5l.173-.693c.12-.48.18-.72.277-.944a3 3 0 0 1 .319-.563c.142-.198.317-.373.667-.723l3.769-3.769Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Votre matinée"}
                  </span>
                </div>
                <div className="flex items-center gap-x-[3px] rounded-sm border-[0.5px] border-tir-border bg-tir-card py-[1.5px] pr-[2px] pl-[2.5px] lg:gap-x-1.5 lg:rounded-lg lg:border lg:py-[3px] lg:pr-[4px] lg:pl-[5px]">
                  <svg aria-hidden="true" role="presentation" className="size-[7px] text-tir-foreground lg:size-[14px]" width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="4.5" width={10} height={5} rx="2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 12.5v-1M7 2.5v-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                  <span className="font-medium text-tir-foreground text-[7px] leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                    {"Décisions pour ce matin"}
                  </span>
                  <span className="mt-px inline-flex h-[7px] min-w-2 items-center justify-center rounded-xs border-[0.5px] border-tir-border bg-tir-muted px-[1.5px] text-center font-medium text-[5px] text-tir-muted-foreground leading-[7px] lg:mt-px lg:h-[14px] lg:min-w-4 lg:rounded-sm lg:border lg:px-[3px] lg:text-[10px] lg:leading-[14px]">
                    {"3"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-x-1 lg:gap-x-2">
                <div className="flex items-center gap-x-[3px] rounded-sm border-[0.5px] border-[#C7F4D3] bg-[#DDF9E4] py-[0.5px] pr-[3px] pl-[2.5px] lg:gap-x-1.5 lg:rounded-lg lg:border lg:py-[1px] lg:pr-1.5 lg:pl-[5px] dark:border-emerald-500/30 dark:bg-emerald-500/15">
                  <span className="size-1 rounded-full bg-[#0FC27B] lg:size-2" />
                  <span className="font-medium text-[#075A39] text-[6px] leading-[8px] lg:text-[12px] lg:leading-4 dark:text-emerald-300">
                    {"prêt"}
                  </span>
                </div>
                <div className="rounded-full bg-[#0F6BE9] p-px pl-1.5 lg:p-0.5 lg:pl-3">
                  <div className="size-2 rounded-full bg-white lg:size-4" />
                </div>
              </div>
            </div>
          </div>
          <div className="relative isolate grid w-full flex-1 lg:grid-cols-[1fr_341px]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[#FBFBFB] dark:bg-tir-card" style={{ backgroundImage: "radial-gradient(circle, rgba(186, 187, 188, 0.4) 0.5px, transparent 0.5px)", backgroundSize: "10px 10px", backgroundPosition: "5px 5px" }} />
            <div className="relative overflow-hidden p-2 lg:p-4">
              <span className="inline-flex items-center rounded-sm border-[0.5px] border-[#E0DCFE] bg-[#F1ECFE] px-[2.5px] py-[0.5px] font-medium text-[#6B47D8] text-[6px] leading-[8px] lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300">
                {"Relevé de 6 h 45 · exemple"}
              </span>
              <div className="mx-auto mt-2 flex max-w-[460px] flex-col items-stretch lg:mt-3">
                <div className="relative mx-auto w-[260px] lg:w-[302px]">
                  <div className="absolute bottom-full left-0 z-10 -mb-px flex items-center gap-x-0.5 rounded-t-[5px] border border-tir-border border-b-0 bg-tir-card pt-[1.5px] pr-1 pb-0.5 pl-[3.5px] lg:gap-x-1 lg:rounded-t-[10px] lg:pt-[3px] lg:pr-2 lg:pb-1 lg:pl-[7px]">
                    <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r=".75" fill="#75777C" />
                      <circle cx="6" cy="6" r="5" stroke="#75777C" strokeWidth="1.1" />
                      <circle cx="6" cy="6" r="2.5" stroke="#75777C" strokeWidth="1.1" />
                    </svg>
                    <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                      {"Agenda"}
                    </span>
                  </div>
                  <div className="absolute right-0 bottom-[calc(100%+4px)] z-10 lg:bottom-[calc(100%+8px)]">
                    <span className="inline-flex items-center gap-x-[2.5px] text-nowrap rounded-[3px] border-[0.5px] border-[#C7F4D3] bg-[#DDF9E4] px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] leading-[8px] tracking-normal lg:gap-x-[5px] lg:rounded-md lg:border lg:px-[5px] lg:py-px lg:pr-1.5 lg:text-[12px] lg:leading-4 dark:border-emerald-500/30 dark:bg-emerald-500/15">
                      <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 5.727 3.742 6.9c.442.699.663 1.048.947 1.17a1 1 0 0 0 .778.007c.286-.118.512-.464.965-1.156L9 3" stroke="#0FC27B" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-[#0FC27B] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-emerald-300">
                        {"la veille · 19 h 04"}
                      </span>
                    </span>
                  </div>
                  <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-[#54D490] dark:border-emerald-400/40 rounded-tl-none lg:rounded-tl-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                          <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="#E5EEFF" stroke="#D6E5FF" />
                          <g stroke="#407FF2" strokeLinecap="round">
                            <rect x="5.5" y="5.5" width={9} height={9} rx="1.5" strokeLinejoin="round" />
                            <path d="M5.5 8.5h9M5.5 11.5h9M9 5.5v9M11 5.5v9" />
                          </g>
                        </svg>
                        <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                          {"Annulation reçue"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4">
                        <span>
                          {"votre logiciel"}
                        </span>
                      </span>
                    </div>
                    <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                    <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                      {"Tiroma lit l'agenda et les plans"}
                    </span>
                  </div>
                </div>
                <div className="relative mx-auto h-[18px] w-1.5 lg:h-[36px] lg:w-3">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 12 36" fill="none" aria-hidden="true">
                    <path d="M6 2 L6 30" stroke="#54D490" strokeLinecap="round" />
                    <path d="M6 30 L1 25 M6 30 L11 25" stroke="#54D490" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="relative mx-auto w-[260px] lg:w-[302px]">
                  <div className="absolute right-0 bottom-[calc(100%+4px)] z-10 lg:bottom-[calc(100%+8px)]">
                    <span className="inline-flex items-center gap-x-[2.5px] text-nowrap rounded-[3px] border-[0.5px] border-[#C7F4D3] bg-[#DDF9E4] px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] leading-[8px] tracking-normal lg:gap-x-[5px] lg:rounded-md lg:border lg:px-[5px] lg:py-px lg:pr-1.5 lg:text-[12px] lg:leading-4 dark:border-emerald-500/30 dark:bg-emerald-500/15">
                      <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 5.727 3.742 6.9c.442.699.663 1.048.947 1.17a1 1 0 0 0 .778.007c.286-.118.512-.464.965-1.156L9 3" stroke="#0FC27B" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-[#0FC27B] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-emerald-300">
                        {"prêt"}
                      </span>
                    </span>
                  </div>
                  <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-[#54D490] dark:border-emerald-400/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                          <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="url(#agent-grad)" stroke="#E0DCFE" />
                          <path d="M10 4l1.2 3.3 3.3 1.2-3.3 1.2L10 13l-1.2-3.3-3.3-1.2 3.3-1.2L10 4Z" fill="#9162F9" />
                          <circle cx="14.5" cy="5.5" r="1" fill="#9162F9" />
                          <circle cx="5.5" cy="14.5" r="1" fill="#9162F9" />
                          <defs>
                            <linearGradient id="agent-grad" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FBDDE2" />
                              <stop offset="1" stopColor="#D1E8F1" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                          {"Créneau libéré"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-[#E0DCFE] bg-[#F1ECFE] px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[#6B47D8] text-[6px] leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300">
                        <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" viewBox="0 0 12 12" fill="none">
                          <path d="M10.235 10.456a1.766 1.766 0 1 0-.002-3.53 1.766 1.766 0 0 0 .002 3.53ZM1.765 5.497a1.766 1.766 0 1 0-.001-3.531 1.766 1.766 0 0 0 .001 3.531ZM5.911 2.613a1.306 1.306 0 1 0 0-2.612 1.306 1.306 0 0 0 0 2.612ZM1.765 10.003a1.306 1.306 0 1 0-.001-2.612 1.306 1.306 0 0 0 0 2.612ZM5.948 7.39a1.175 1.175 0 1 0-.001-2.35 1.175 1.175 0 0 0 0 2.35ZM5.912 12a.925.925 0 1 0-.001-1.85.925.925 0 0 0 0 1.85ZM10.077 4.677a.925.925 0 1 0-.001-1.85.925.925 0 0 0 0 1.85Z" fill="currentColor" />
                        </svg>
                        <span>
                          {"Tiroma"}
                        </span>
                      </span>
                    </div>
                    <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                    <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                      {"10 h 30 · fauteuil 2"}
                    </span>
                  </div>
                </div>
                <div className="relative mx-auto h-[18px] w-1.5 lg:h-[36px] lg:w-3">
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 12 36" fill="none" aria-hidden="true">
                    <path d="M6 2 L6 30" stroke="#54D490" strokeLinecap="round" />
                    <path d="M6 30 L1 25 M6 30 L11 25" stroke="#54D490" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="relative mx-auto w-[260px] lg:w-[302px]">
                  <div className="absolute right-0 bottom-[calc(100%+4px)] z-10 lg:bottom-[calc(100%+8px)]">
                    <span className="inline-flex items-center gap-x-[2.5px] text-nowrap rounded-[3px] border-[0.5px] border-[#C7F4D3] bg-[#DDF9E4] px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] leading-[8px] tracking-normal lg:gap-x-[5px] lg:rounded-md lg:border lg:px-[5px] lg:py-px lg:pr-1.5 lg:text-[12px] lg:leading-4 dark:border-emerald-500/30 dark:bg-emerald-500/15">
                      <svg aria-hidden="true" role="presentation" className="size-1.5 lg:size-3" viewBox="0 0 12 12" fill="none">
                        <path d="M3 5.727 3.742 6.9c.442.699.663 1.048.947 1.17a1 1 0 0 0 .778.007c.286-.118.512-.464.965-1.156L9 3" stroke="#0FC27B" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-[#0FC27B] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-emerald-300">
                        {"prêt"}
                      </span>
                    </span>
                  </div>
                  <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-[#54D490] dark:border-emerald-400/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                        <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                          <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="#FFEBEB" stroke="#FFDCDB" />
                          <g stroke="#FF6D6B" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13.428 13v-2.571c0-.947-.767-1.715-1.714-1.715A1.714 1.714 0 0 1 10 7V5.286M13.428 13l-1.286-1.286M13.428 13l1.286-1.286M6.572 13v-2.571c0-.947.767-1.715 1.714-1.715C9.233 8.714 10 7.947 10 7V5.286M6.572 13l1.286-1.286M6.572 13l-1.286-1.286M10 14.714V5.286m0 9.428 1.285-1.285M10 14.714 8.714 13.43" />
                          </g>
                        </svg>
                        <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                          {"Proposition à l'assistante"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4">
                        <span>
                          {"lecture seule"}
                        </span>
                      </span>
                    </div>
                    <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                    <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                      {"le patient le mieux placé"}
                    </span>
                  </div>
                </div>
                <div className="relative mt-3 lg:mt-4">
                  <svg className="absolute inset-x-0 top-0 h-[36px] w-full lg:h-[60px]" viewBox="0 0 300 60" preserveAspectRatio="none" fill="none" aria-hidden="true">
                    <path d="M150 0 L150 18 L40 18 A 10 10 0 0 0 30 28 L 30 56 M150 18 L 150 56 M150 18 L260 18 A 10 10 0 0 1 270 28 L 270 56" stroke="#D1D3D6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M30 56 L25 51 M30 56 L35 51" stroke="#D1D3D6" strokeLinecap="round" />
                    <path d="M150 56 L145 51 M150 56 L155 51" stroke="#D1D3D6" strokeLinecap="round" />
                    <path d="M270 56 L265 51 M270 56 L275 51" stroke="#D1D3D6" strokeLinecap="round" />
                    <path d="M150 0 L150 18 L40 18 A 10 10 0 0 0 30 28 L 30 56" stroke="#54D490" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M30 56 L25 51 M30 56 L35 51" stroke="#54D490" strokeLinecap="round" />
                  </svg>
                  <div className="relative grid grid-cols-3 gap-1.5 pt-[20px] lg:gap-3 lg:pt-[32px]">
                    <div className="flex justify-center">
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] px-[2.5px] py-[0.5px] font-medium text-[6px] leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4 border-[#C7F4D3] bg-[#DDF9E4] text-[#095A39] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {"Plan accepté"}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] px-[2.5px] py-[0.5px] font-medium text-[6px] leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4 border-tir-border bg-tir-muted text-tir-muted-foreground">
                        {"Liste d'attente"}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center text-nowrap rounded-sm border-[0.5px] px-[2.5px] py-[0.5px] font-medium text-[6px] leading-[8px] tracking-normal lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:text-[12px] lg:leading-4 border-tir-border bg-tir-muted text-tir-muted-foreground">
                        {"Contrôle dû"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 lg:mt-2 lg:gap-3">
                  <div className="relative">
                    <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-[#54D490] dark:border-emerald-400/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                          <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                            <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="#E5F4FE" stroke="#D5ECFD" />
                            <path d="M8 5h-.5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2H12.5a2 2 0 0 0 2-2v-2" stroke="#1B82CC" strokeWidth="1.1" strokeLinecap="round" />
                            <path d="M14.5 5 9.5 10l-1.5-1.5" stroke="#1B82CC" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                            {"Appel du patient"}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4">
                          <span>
                            {"Tableau"}
                          </span>
                        </span>
                      </div>
                      <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                      <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                        {"par l'assistante"}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-tir-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                          <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                            <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="#F1ECFE" stroke="#E0DCFE" />
                            <g stroke="#6B47D8" strokeWidth="1.1" strokeLinecap="round">
                              <rect x="5.5" y="5.5" width={4} height={5} rx="1" strokeLinejoin="round" />
                              <rect x="5.5" y="11.5" width={4} height={3} rx="1" strokeLinejoin="round" />
                              <rect x="10.5" y="5.5" width={4} height={3} rx="1" strokeLinejoin="round" />
                              <rect x="10.5" y="9.5" width={4} height={5} rx="1" strokeLinejoin="round" />
                            </g>
                          </svg>
                          <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                            {"Rendez-vous confirmé"}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4">
                          <span>
                            {"Plans et devis"}
                          </span>
                        </span>
                      </div>
                      <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                      <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                        {"agenda à jour"}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="relative flex flex-col rounded-md border bg-tir-card p-1.5 lg:rounded-xl lg:p-3 border-tir-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-x-[3px] lg:gap-x-1.5">
                          <svg aria-hidden="true" role="presentation" className="size-2.5 lg:size-5" viewBox="0 0 20 20" fill="none">
                            <rect x=".5" y=".5" width={19} height={19} rx="5.5" fill="#E5EEFF" stroke="#D6E5FF" />
                            <g stroke="#407FF2" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="5" y="6.5" width={10} height={7} rx="1.5" />
                              <path d="m5.5 7.5 4.5 3.5 4.5-3.5" />
                            </g>
                          </svg>
                          <span className="font-medium text-[7px] text-tir-foreground leading-[10px] tracking-[-0.14px] lg:text-[14px] lg:leading-5 lg:tracking-[-0.28px]">
                            {"Point du soir"}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-x-0.5 text-nowrap rounded-sm border-[0.5px] border-tir-border bg-tir-muted px-[2.5px] py-[0.5px] pr-[3px] font-medium text-[6px] text-tir-muted-foreground leading-[8px] tracking-normal lg:gap-x-1 lg:rounded-lg lg:border lg:px-[5px] lg:py-px lg:pr-[6px] lg:text-[12px] lg:leading-4">
                          <span>
                            {"E-mail"}
                          </span>
                        </span>
                      </div>
                      <hr className="mt-[5.5px] mb-[4px] border-tir-border lg:mt-[11px] lg:mb-[8px]" />
                      <span className="font-medium text-[#75777C] text-[6px] leading-[8px] tracking-normal lg:text-[12px] lg:leading-4 dark:text-tir-muted-foreground">
                        {"ce qui a été repris aujourd'hui"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative hidden h-full overflow-hidden border-tir-border border-l bg-tir-card lg:block">
              <div className="flex h-full flex-col">
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px] bg-tir-muted/40">
                      <svg width={18} height={18} fill="none" aria-hidden="true" className="animate-[spin_2s_linear_infinite]">
                        <circle cx="9" cy="9" r="7.5" stroke="#E5E7EB" strokeWidth="1.5" />
                        <path d="M9 1.5A7.5 7.5 0 0 1 16.5 9" stroke="#9162F9" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"3"}
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Fauteuil occupé"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"JEU"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Couronne"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Créneau de 10 h 30 repris"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"LUN"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Implant"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Mme R. a confirmé → agenda à jour"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"MAR"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Bridge"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Rendez-vous du jour, 3 fauteuils"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"MER"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Racine"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Plans signés sans rendez-vous"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"JEU"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Aligneurs"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Annulations depuis hier soir"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"LUN"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Couronne"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Décisions pour ce matin"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"MAR"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Bridge"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Contrôles dus"}
                      </span>
                    </div>
                  </div>
                  <div className="border-tir-border border-b p-0.5">
                    <div className="flex items-center gap-x-2 rounded-md px-3.5 pt-2.5 pb-[9px]">
                      <svg width={18} height={18} fill="none" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16Zm3.152-9.636a.6.6 0 1 0-1.004-.657L9.181 9.71c-.252.384-.418.636-.558.813-.14.176-.2.205-.212.21a.48.48 0 0 1-.374-.003c-.012-.005-.072-.035-.209-.213a12.33 12.33 0 0 1-.544-.822l-.377-.595a.6.6 0 1 0-1.014.642l.377.595.015.024c.226.357.417.66.592.887.178.232.39.457.685.584.416.18.888.183 1.307.01.296-.122.512-.344.694-.573.178-.225.374-.524.606-.878l.015-.023 1.968-3.005Z" fill="#0FC27B" />
                      </svg>
                      <span className="w-[58px] font-medium text-tir-foreground text-[14px] leading-5 tracking-[-0.28px]">
                        {"MER"}
                      </span>
                      <span className="flex items-center gap-x-1 text-nowrap rounded-lg border border-tir-border bg-tir-muted px-[5px] py-px pl-[3px] font-medium text-[#232529] text-[12px] leading-4 tracking-normal dark:text-tir-foreground">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <path d="M4.875 1.15a2.25 2.25 0 0 1 2.25 0L9.638 2.6a2.25 2.25 0 0 1 1.125 1.949v2.902A2.25 2.25 0 0 1 9.638 9.4l-2.513 1.45a2.25 2.25 0 0 1-2.25 0L2.362 9.4A2.25 2.25 0 0 1 1.237 7.45V4.549A2.25 2.25 0 0 1 2.362 2.6l2.513-1.45Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M6.006 3v.86M6.006 8.155v.86M4.49 8.157h2.212c.308 0 .603-.114.82-.315.218-.201.34-.475.34-.76 0-.284-.122-.558-.34-.759a1.209 1.209 0 0 0-.82-.315H5.31c-.308 0-.603-.113-.82-.314a1.035 1.035 0 0 1-.34-.76c0-.284.122-.558.34-.76.217-.2.512-.314.82-.314h2.18" stroke="currentColor" strokeLinecap="round" />
                        </svg>
                        <span className="font-medium text-[#5C5E63] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                          {"Aligneurs"}
                        </span>
                      </span>
                      <span className="flex-1 text-right font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                        {"Point du matin à 7 h"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-tir-border border-t px-3 pt-[5px] pb-3">
                  <span className="ml-1 font-medium text-[#75777C] text-[12px] leading-4 tracking-normal dark:text-tir-muted-foreground">
                    {"Décisions pour ce matin"}
                  </span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div className="relative flex flex-col rounded-xl border bg-tir-card px-[11px] py-[9px] border-[#E7F6EF] bg-[linear-gradient(263deg,rgba(15,194,123,0.08)_6.86%,rgba(15,194,123,0.02)_96.69%)] dark:border-emerald-500/20">
                      <div className="absolute top-[9px] right-[11px]">
                        <svg width={14} height={14} fill="none" aria-hidden="true">
                          <g opacity=".6" stroke="#075A39" strokeWidth="1.1">
                            <path d="m4.75 7.295.277.439c.425.67.637 1.006.91 1.124a.96.96 0 0 0 .746.006c.275-.113.492-.446.927-1.11L9.25 5.25" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="7" cy="7" r="5.5" />
                          </g>
                        </svg>
                      </div>
                      <div className="flex items-end gap-x-[5px]">
                        <span className="font-semibold text-[18px] leading-6 tracking-[-0.36px] text-[#095A39] dark:text-emerald-300">
                          {"34"}
                        </span>
                      </div>
                      <span className="font-medium text-[#75777C] text-[11px] leading-4 tracking-[-0.22px] dark:text-tir-muted-foreground">
                        {"rendez-vous aujourd'hui"}
                      </span>
                    </div>
                    <div className="relative flex flex-col rounded-xl border bg-tir-card px-[11px] py-[9px] border-[#FEE7E7] bg-[linear-gradient(263deg,rgba(255,109,107,0.08)_6.86%,rgba(255,109,107,0.02)_96.69%)] dark:border-red-500/20">
                      <div className="absolute top-[9px] right-[11px]">
                        <svg width={14} height={14} fill="none" aria-hidden="true">
                          <g opacity=".6" stroke="#772322" strokeWidth="1.1">
                            <circle cx="7" cy="7" r="5.5" />
                            <path d="M9 5 5 9M9 9 5 5" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        </svg>
                      </div>
                      <div className="flex items-end gap-x-[5px]">
                        <span className="font-semibold text-[18px] leading-6 tracking-[-0.36px] text-[#772322] dark:text-red-300">
                          {"2"}
                        </span>
                      </div>
                      <span className="font-medium text-[#75777C] text-[11px] leading-4 tracking-[-0.22px] dark:text-tir-muted-foreground">
                        {"créneaux libérés"}
                      </span>
                    </div>
                    <div className="relative flex flex-col rounded-xl border bg-tir-card px-[11px] py-[9px] border-tir-border">
                      <div className="absolute top-[9px] right-[11px]">
                        <svg width={14} height={14} fill="none" aria-hidden="true">
                          <path d="M1.5 7A5.5 5.5 0 1 0 7 1.5" stroke="#9FA1A7" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex items-end gap-x-[5px]">
                        <span className="font-semibold text-[18px] leading-6 tracking-[-0.36px] text-[#232529] dark:text-tir-foreground">
                          {"12"}
                        </span>
                      </div>
                      <span className="font-medium text-[#75777C] text-[11px] leading-4 tracking-[-0.22px] dark:text-tir-muted-foreground">
                        {"plans signés sans rendez-vous"}
                      </span>
                    </div>
                    <div className="relative flex flex-col rounded-xl border bg-tir-card px-[11px] py-[9px] border-tir-border">
                      <div className="absolute top-[9px] right-[11px]">
                        <svg width={14} height={14} fill="none" aria-hidden="true">
                          <circle cx="7" cy="7" r="5.75" stroke="#9FA1A7" strokeWidth="1.1" strokeLinejoin="round" />
                          <path d="M7.066 3.904v2.115a.885.885 0 0 1-.884.885H4.566" stroke="#9FA1A7" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div className="flex items-end gap-x-[5px]">
                        <span className="font-semibold text-[18px] leading-6 tracking-[-0.36px] text-[#232529] dark:text-tir-foreground">
                          {"41"}
                        </span>
                        <span className="mb-[1px] inline-block font-medium text-[#9FA1A7] text-[11px] leading-4 tracking-[-0.22px]">
                          {"contrôles dus"}
                        </span>
                        <div className="mb-[3px] ml-[6px]">
                          <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <rect x="1" y="1" width={12} height={12} rx="4" fill="#DDF9E4" stroke="#C7F4D3" />
                            <path d="M7 4.333v5.333M7 9.666 9 7.761M7 9.666 5 7.761" stroke="#0B935D" strokeWidth=".8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                      <span className="font-medium text-[#75777C] text-[11px] leading-4 tracking-[-0.22px] dark:text-tir-muted-foreground">
                        {"18 rappels prêts"}
                      </span>
                    </div>
                    <div className="relative col-span-2 m-[0.5px] flex flex-col rounded-[14px] border border-tir-border p-[11px]">
                      <div className="absolute top-[11px] right-[11px] rounded-md p-1 shadow-[0px_0px_2px_0px_#E0E0E0,0px_2px_4px_-2px_rgba(24,39,75,0.02),0px_4px_4px_-2px_rgba(24,39,75,0.06)]">
                        <svg width={12} height={12} fill="none" aria-hidden="true">
                          <g stroke="#5C5E63" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m1.16 8.248.836.13a1.216 1.216 0 0 1 1.011 1.298l-.061.862a.616.616 0 0 0 .337.597l.618.304a.59.59 0 0 0 .667-.102l.62-.587a1.176 1.176 0 0 1 1.623 0l.62.587a.589.589 0 0 0 .667.102l.62-.305a.613.613 0 0 0 .336-.595l-.062-.863a1.216 1.216 0 0 1 1.011-1.298l.835-.13a.605.605 0 0 0 .495-.47l.152-.683a.619.619 0 0 0-.246-.643l-.697-.488a1.24 1.24 0 0 1-.36-1.617l.42-.75a.625.625 0 0 0-.05-.688l-.428-.548a.592.592 0 0 0-.644-.204l-.808.253a1.189 1.189 0 0 1-1.462-.72L6.9.888A.6.6 0 0 0 6.341.5l-.684.002a.6.6 0 0 0-.558.39l-.301.794a1.188 1.188 0 0 1-1.465.725l-.841-.264a.592.592 0 0 0-.647.205l-.424.549a.625.625 0 0 0-.047.69l.43.751A1.24 1.24 0 0 1 1.45 5.97l-.688.483a.62.62 0 0 0-.246.642l.152.683c.055.246.25.433.494.47Z" />
                            <path d="M7.198 4.803a1.693 1.693 0 1 1-2.394 2.394 1.693 1.693 0 0 1 2.394-2.394Z" />
                          </g>
                        </svg>
                      </div>
                      <div className="flex items-end gap-x-[5px]">
                        <span className="font-semibold text-[#232529] text-[18px] leading-6 tracking-[-0.36px] dark:text-tir-foreground">
                          {"41 %"}
                        </span>
                        <span className="mb-[1.5px] inline-block font-medium text-[#9FA1A7] text-[11px] leading-4 tracking-[-0.22px]">
                          {"sans assistante à 14 h"}
                        </span>
                      </div>
                      <span className="font-medium text-[#75777C] text-[11px] leading-4 tracking-[-0.22px] dark:text-tir-muted-foreground">
                        {"Fauteuil 3 · cet après-midi"}
                      </span>
                      <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-tir-muted">
                        <div className="h-full rounded-full bg-[#0EB472]" style={{ width: "41%" }} />
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
  );
}

export function PanneauComparatif() {
  return (
    <div className="overflow-hidden rounded-lg border border-tir-border bg-tir-card shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl dark:shadow-[0px_2px_6px_0px_rgba(0,0,0,0.4),0px_6px_20px_-2px_rgba(0,0,0,0.5)]">
      <div className="relative grid h-[340px] w-full grid-rows-[auto_1fr] sm:h-[420px] md:h-[500px] lg:h-[600px] lg:grid-cols-[272px_1fr] lg:grid-rows-[auto_1fr]">
        <div className="hidden items-center gap-3 border-tir-border border-r border-b bg-tir-card pr-4 pl-3 lg:flex lg:h-12">
          <MarqueTiroma className="size-6 shrink-0 text-tir-foreground" />
          <div className="flex h-full flex-1 items-center gap-1">
            <span className="font-semibold text-tir-foreground text-sm leading-5 tracking-[-0.16px]">
              {"Tiroma"}
            </span>
            <svg aria-hidden="true" role="presentation" className="size-3.5 shrink-0 text-tir-muted-foreground" viewBox="0 0 14 14" fill="none">
              <path d="M3 5.25L7 9.25L11 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <svg aria-hidden="true" role="presentation" className="size-[18px] shrink-0 text-tir-foreground opacity-55" viewBox="0 0 18 18" fill="none">
            <path d="M12.1797 2.5C12.9275 2.5 13.5188 2.49925 13.9941 2.53809C14.4753 2.5774 14.8819 2.6596 15.2529 2.84863C15.8549 3.15542 16.3446 3.64505 16.6514 4.24707C16.8403 4.618 16.9226 5.02485 16.9619 5.50586C17.0007 5.98111 17 6.57268 17 7.32031V10.6797C17 11.4273 17.0007 12.0189 16.9619 12.4941C16.9226 12.9751 16.8404 13.382 16.6514 13.7529C16.3446 14.3549 15.8549 14.8446 15.2529 15.1514C14.882 15.3404 14.4752 15.4226 13.9941 15.4619C13.5188 15.5007 12.9275 15.5 12.1797 15.5L5.82031 15.5C5.07251 15.5 4.48117 15.5007 4.00586 15.4619C3.52479 15.4226 3.11804 15.3404 2.74707 15.1514C2.1451 14.8446 1.65543 14.3549 1.34863 13.7529C1.15964 13.382 1.07741 12.9751 1.03809 12.4941C0.999258 12.0189 1 11.4273 1 10.6797L1 7.32031C1 6.57268 0.999281 5.98111 1.03809 5.50586C1.07739 5.02485 1.1597 4.618 1.34863 4.24707C1.65539 3.64505 2.14507 3.15542 2.74707 2.84863C3.11807 2.6596 3.52474 2.5774 4.00586 2.53809C4.48117 2.49925 5.07249 2.5 5.82031 2.5L12.1797 2.5ZM5.82031 3.5C5.05599 3.5 4.51206 3.50042 4.08691 3.53516C3.66788 3.56943 3.40764 3.63503 3.20117 3.74023C2.78746 3.95113 2.4511 4.28744 2.24023 4.70117C2.13512 4.9076 2.06941 5.16806 2.03516 5.58691C2.00045 6.01201 2 6.55621 2 7.32031L2 10.6797C2 11.4438 2.00043 11.988 2.03516 12.4131C2.06943 12.8319 2.13506 13.0924 2.24023 13.2988C2.45113 13.7125 2.78749 14.0489 3.20117 14.2598C3.40762 14.3649 3.66797 14.4306 4.08691 14.4648C4.51206 14.4996 5.05601 14.5 5.82031 14.5L7 14.5L7 3.5H5.82031ZM8 14.5H12.1797C12.944 14.5 13.4879 14.4996 13.9131 14.4648C14.332 14.4306 14.5924 14.3649 14.7988 14.2598C15.2125 14.0489 15.5489 13.7125 15.7598 13.2988C15.8649 13.0924 15.9306 12.8319 15.9648 12.4131C15.9996 11.988 16 11.4438 16 10.6797L16 7.32031C16 6.55621 15.9995 6.01201 15.9648 5.58691C15.9306 5.16806 15.8649 4.9076 15.7598 4.70117C15.5489 4.28744 15.2125 3.95113 14.7988 3.74023C14.5924 3.63503 14.3321 3.56943 13.9131 3.53516C13.4879 3.50042 12.944 3.5 12.1797 3.5L8 3.5L8 14.5ZM5.3252 7.5C5.60111 7.50026 5.82519 7.72402 5.8252 8C5.8252 8.27598 5.60111 8.49974 5.3252 8.5H3.97559C3.69944 8.5 3.47559 8.27614 3.47559 8C3.47559 7.72386 3.69944 7.5 3.97559 7.5H5.3252ZM5.34961 5.5C5.62575 5.5 5.84961 5.72386 5.84961 6C5.84961 6.27614 5.62575 6.5 5.34961 6.5H4C3.72386 6.5 3.5 6.27614 3.5 6C3.5 5.72386 3.72386 5.5 4 5.5L5.34961 5.5Z" fill="currentColor" />
          </svg>
        </div>
        <div className="flex w-full items-center border-tir-border border-b">
          <div className="flex h-full w-full items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2 lg:gap-8 lg:px-4 lg:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-1.5">
              <span className="truncate font-medium text-[11px] text-tir-foreground leading-4 tracking-[-0.1px] sm:text-sm sm:leading-5 sm:tracking-[-0.14px]">
                {"Relevé de 6 h 45 · exemple"}
              </span>
              <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 shrink-0 text-tir-muted-foreground sm:size-3.5">
                <path fillRule="evenodd" clipRule="evenodd" d="M7.00002 1.16675C7.18517 1.16675 7.35407 1.27555 7.43078 1.44519L8.88191 4.65489L12.3898 5.09671C12.5733 5.11983 12.7273 5.24732 12.7851 5.42331C12.8428 5.5993 12.7942 5.79287 12.6597 5.92019L10.0542 8.38523L10.7097 11.8616C10.7439 12.0432 10.6706 12.2281 10.5216 12.3369C10.3727 12.4457 10.1739 12.4598 10.0109 12.3734L7.00002 10.7763L3.98916 12.3734C3.82615 12.4598 3.62739 12.4457 3.47841 12.3369C3.32944 12.2281 3.25618 12.0432 3.29035 11.8616L3.94583 8.38523L1.34034 5.92019C1.20584 5.79287 1.15725 5.5993 1.21499 5.42331C1.27274 5.24732 1.42674 5.11983 1.61022 5.09671L5.11813 4.65489L6.56926 1.44519C6.64597 1.27555 6.81487 1.16675 7.00002 1.16675Z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex shrink-0 items-center gap-px">
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path d="M7 2C7.27612 2 7.49996 2.22389 7.5 2.5V6.5H11.5C11.7761 6.5 12 6.72386 12 7C12 7.27614 11.7761 7.5 11.5 7.5H7.5V11.5C7.5 11.7761 7.27614 12 7 12C6.72386 12 6.5 11.7761 6.5 11.5V7.5H2.5C2.22386 7.5 2 7.27614 2 7C2 6.72386 2.22386 6.5 2.5 6.5H6.5V2.5C6.50004 2.22389 6.72388 2 7 2Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" width={14} height={14} viewBox="0 0 14 14" fill="none" className="size-3 text-tir-muted-foreground sm:size-3.5">
                  <path fillRule="evenodd" clipRule="evenodd" d="M2.33325 2.33325C1.96506 2.33325 1.66659 2.63173 1.66659 2.99992V10.9999C1.66659 11.3681 1.96506 11.6666 2.33325 11.6666H11.6666C12.0348 11.6666 12.3333 11.3681 12.3333 10.9999V2.99992C12.3333 2.63173 12.0348 2.33325 11.6666 2.33325H2.33325ZM0.666587 2.99992C0.666587 2.07945 1.41278 1.33325 2.33325 1.33325H11.6666C12.5871 1.33325 13.3333 2.07945 13.3333 2.99992V10.9999C13.3333 11.9204 12.5871 12.6666 11.6666 12.6666H2.33325C1.41278 12.6666 0.666587 11.9204 0.666587 10.9999V2.99992ZM9.33325 2.33325V11.6666H8.33325V2.33325H9.33325Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex size-5 shrink-0 items-center justify-center overflow-clip rounded-lg sm:size-7">
                <svg aria-hidden="true" role="presentation" className="size-3 text-tir-muted-foreground sm:size-3.5" width={14} height={14} viewBox="0 0 14 14" fill="none">
                  <path d="M7.438 3.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 7a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0ZM7.438 10.5a.438.438 0 1 1-.876 0 .438.438 0 0 1 .875 0Z" fill="currentColor" stroke="currentColor" strokeWidth=".7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <BarreLaterale />
        <TableauFenetre {...TABLEAU_COMPARATIF} />
      </div>
    </div>
  );
}
