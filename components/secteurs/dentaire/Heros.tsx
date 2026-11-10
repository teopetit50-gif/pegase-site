/* ══════════════════════════════════════════════════════════════════════
   Héros — la section d'ouverture de la référence (folio-topaz-delta.
   vercel.app, relevé du 09/11/2026), recopiée classe par classe : pastille
   au liseré tournant, titre en serif, chapô, deux boutons, la ligne de
   réassurance, puis la fenêtre Tiroma sur une photo du cabinet. Les textes
   sont ceux de la page du 24/09 (textes.ts, Heros.tsx d'alors).

   Écarts voulus :
   • la référence porte une barre de navigation FIXE par-dessus le héros ;
     ici c'est l'entête du site, collante, au-dessus : le haut du héros perd
     sa hauteur (64 / 72 px) pour que la pastille tombe au même point de la
     fenêtre (pt-24/32/40 → pt-8/14/22) ;
   • la photo de fond (dashboard-bg.jpg, droits inconnus) est remplacée par
     la salle de soins (Unsplash, créditée dans
     public/secteurs-dentaire/photos/CREDITS.txt) ;
   • la ligne du titre change toutes les 3 s (TitreTournant), comme avant.
   ══════════════════════════════════════════════════════════════════════ */
import Image from "next/image";
import Link from "next/link";
import BarreLaterale from "./BarreLaterale";
import LienAncre from "./LienAncre";
import { MarqueTiroma } from "./marque";
import { PHOTO_FOND, RESERVER } from "./outils";
import TableauFenetre, { TABLEAU_PATIENTS } from "./TableauFenetre";
import TitreTournant from "./TitreTournant";

export default function Heros() {
  return (
    <section data-monde="clair" className="relative bg-tir-background">
      <div className="container relative mx-auto">
        <div className="border-tir-border border-dashed bg-tir-background sm:border-x">
          <div className="pt-8 pb-20 md:pt-14 lg:pt-22">
            <div className="relative z-10 mx-auto grid max-w-5xl items-center gap-4 px-6 text-center">
              <div className="relative inline-flex justify-self-center">
                <div className="-inset-[1px] absolute overflow-hidden rounded-full">
                  <div className="absolute inset-0 animate-spin-slow" style={{ background: "conic-gradient(from 0deg, transparent 0%, transparent 70%, #3b82f6 85%, #10b981 95%, transparent 100%)" }} />
                </div>
                <div className="relative rounded-full border border-tir-border/50 bg-tir-background">
                  <LienAncre cible="demo" className="block">
                    <span className="relative z-10 flex items-center gap-1 px-4 py-1.5 font-medium text-tir-foreground text-sm">
                      {"Cabinets dentaires · Lecture seule"}
                      <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right size-4">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </span>
                  </LienAncre>
                </div>
              </div>
              <h1 className="text-balance font-semibold text-4xl sm:text-5xl lg:text-6xl">
                <TitreTournant />
              </h1>
              <div className="mx-auto max-w-2xl">
                <p className="mb-6 text-balance text-lg text-tir-muted-foreground lg:text-xl">
                  {"Tiroma lit votre agenda, vos plans de traitement et vos devis signés. Avant le premier patient, votre secrétariat sait quel créneau proposer et à qui, quel plan planifier et quel fauteuil tourne à vide."}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href={RESERVER} className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-tir-ring focus-visible:ring-[3px] focus-visible:ring-tir-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-tir-destructive aria-invalid:ring-tir-destructive/20 dark:aria-invalid:ring-tir-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-tir-primary text-tir-primary-foreground hover:bg-tir-primary/90 h-9 px-4 py-2 has-[>svg]:px-3 shadow-md">
                    {"Réserver un audit"}
                  </Link>
                  <LienAncre cible="demo" className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-tir-ring focus-visible:ring-[3px] focus-visible:ring-tir-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-tir-destructive aria-invalid:ring-tir-destructive/20 dark:aria-invalid:ring-tir-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 border bg-tir-background hover:bg-tir-accent hover:text-tir-accent-foreground dark:border-tir-border dark:bg-tir-input/30 dark:hover:bg-tir-input/50 h-9 px-4 py-2 has-[>svg]:px-3 shadow-sm">
                    {"Voir la démo"}
                  </LienAncre>
                </div>
                <p className="mt-4 text-tir-muted-foreground text-xs">
                  {"Se branche sur votre logiciel · Aucune double saisie ·"}
                  {" "}
                  <Link href={RESERVER} className="underline underline-offset-4 transition-colors hover:text-tir-foreground">
                    {"Sans engagement"}
                  </Link>
                </p>
              </div>
            </div>
            <div className="relative pt-12 lg:pt-20">
              <div className="relative mx-auto max-w-7xl px-1 md:px-0 lg:px-6">
                <div className="-inset-20 sm:-inset-28 lg:-inset-40 pointer-events-none absolute opacity-60" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 30%, black 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 30%, black 100%)", maskComposite: "intersect", WebkitMaskComposite: "source-in" }}>
                  <Image src={PHOTO_FOND} alt="" aria-hidden="true" priority width={2000} height={1333} sizes="(max-width: 768px) 100vw, (max-width: 1280px) 1280px, 1600px" className="size-full object-cover" />
                </div>
                <div className="relative z-10" style={{ maskImage: "linear-gradient(to bottom, black 0%, black 92%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 92%, transparent 100%)" }}>
                  <div className="overflow-hidden rounded-lg border border-tir-border bg-tir-card shadow-[0px_2px_6px_0px_rgba(28,40,64,0.06),0px_6px_20px_-2px_rgba(28,40,64,0.08)] sm:rounded-xl dark:shadow-[0px_2px_6px_0px_rgba(0,0,0,0.4),0px_6px_20px_-2px_rgba(0,0,0,0.5)]">
                    <div className="relative grid h-[280px] w-full grid-rows-[auto_1fr] sm:h-[360px] md:h-[440px] lg:h-[640px] lg:grid-cols-[272px_1fr] lg:grid-rows-[auto_1fr]">
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
                              {"Tiroma · point du matin"}
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
                      <TableauFenetre {...TABLEAU_PATIENTS} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
