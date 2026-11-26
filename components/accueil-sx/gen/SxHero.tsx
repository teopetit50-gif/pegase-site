/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxHero ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import RubanFibre from "../RubanFibre";

export default function SxHero() {
  return (
    <main className={"relative isolate flex min-h-dvh w-full flex-col overflow-hidden bg-transparent"}>
      <div className={"mx-auto flex w-full max-w-[1920px] flex-1 flex-col"}>
        <p className={"relative z-10 flex min-h-[48px] w-full shrink-0 items-center justify-center px-[40px] text-center font-tight text-[12px] leading-[1.5] font-medium tracking-[-0.12px] text-[#121212] opacity-60 ipad:min-h-[55px] ipad:text-[14px] ipad:tracking-[-0.14px] desktop-sm:min-h-[50px]"}>
          <Link href={"/reserver-un-audit"} className={"inline-flex items-center gap-[6px] underline-offset-[3px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212]"}>
            {"Audit de 30 minutes offert, sans engagement."}
            <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-double-alt-arrow-right-outline block size-[14px] shrink-0"} style={{ "fontSize": "var(--solar-size, 24px)" } as CSSProperties} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
              <path d={"M6.51171 4.43045C6.8262 4.16088 7.29968 4.1973 7.56924 4.5118L13.5692 11.5118C13.81 11.7927 13.81 12.2071 13.5692 12.488L7.56924 19.488C7.29968 19.8025 6.8262 19.8389 6.51171 19.5693C6.19721 19.2998 6.16079 18.8263 6.43036 18.5118L12.012 11.9999L6.43036 5.48799C6.16079 5.17349 6.19721 4.70002 6.51171 4.43045ZM10.5119 4.43055C10.8264 4.16099 11.2999 4.19741 11.5694 4.5119L17.5694 11.5119C17.8102 11.7928 17.8102 12.2072 17.5694 12.4881L11.5694 19.4881C11.2999 19.8026 10.8264 19.839 10.5119 19.5694C10.1974 19.2999 10.161 18.8264 10.4306 18.5119L16.0122 12L10.4306 5.48809C10.161 5.17359 10.1974 4.70012 10.5119 4.43055Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
            </svg>
          </Link>
        </p>
        <span aria-hidden={"true"} data-gutter-guide={"top"} className={"relative z-0 block h-px shrink-0 bg-[#dcdcda] desktop-sm:mx-[72px]"} />
        <div aria-hidden={"true"} className={"relative shrink-0 pointer-events-none z-0 [--cell:25%] [--row:46px] ipad:[--cell:16.6667%] ipad:[--row:56px] desktop-sm:[--cell:8.3333%] mx-[32px] h-[92px] ipad:mx-[52px] ipad:h-[112px] desktop-sm:mx-[72px]"}>
          <span data-gutter-guide={"top"} className={"absolute inset-x-0 h-px"} style={{ "top": "calc(var(--row) * 1 - 1px)" } as CSSProperties} />
          <span data-gutter-guide={"top"} className={"absolute inset-x-0 h-px"} style={{ "top": "calc(var(--row) * 2 - 1px)" } as CSSProperties} />
          <span className={"absolute inset-x-0 top-0 block [clip-path:inset(0_1px_0_0)]"} style={{ "height": "100%", "backgroundImage": "repeating-linear-gradient(to right, transparent 0, transparent calc(var(--cell) - 1px), #dcdcda calc(var(--cell) - 1px), #dcdcda var(--cell))", "maskImage": "repeating-linear-gradient(to bottom, #000 0, #000 4px, transparent 4px, transparent 7px)", "WebkitMaskImage": "repeating-linear-gradient(to bottom, #000 0, #000 4px, transparent 4px, transparent 7px)" } as CSSProperties} />
          <span className={"absolute inset-x-0 top-0 block"} style={{ "height": "100%", "backgroundImage": "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--row) - 1px), #dcdcda calc(var(--row) - 1px), #dcdcda var(--row))", "maskImage": "repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px)", "WebkitMaskImage": "repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px)" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] block"} style={{ "left": "calc(var(--cell) * 1.5)", "top": "calc(var(--row) * 1.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] block"} style={{ "left": "calc(var(--cell) * 3.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden ipad:block"} style={{ "left": "calc(var(--cell) * 5.5)", "top": "calc(var(--row) * 1.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden desktop-sm:block"} style={{ "left": "calc(var(--cell) * 7.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden desktop-sm:block"} style={{ "left": "calc(var(--cell) * 9.5)", "top": "calc(var(--row) * 1.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden desktop-sm:block"} style={{ "left": "calc(var(--cell) * 11.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
        </div>
        <div className={"relative z-10 flex min-h-[583px] flex-1 justify-center ipad:min-h-[781px] desktop-sm:max-h-[774px] desktop-sm:min-h-[410px]"}>
          <div aria-hidden={"true"} className={"pointer-events-none absolute top-0 bottom-[-92px] [--fibre-extension:92] left-[32px] right-[32px] overflow-hidden ipad:left-[52px] ipad:right-[52px] ipad:bottom-[-112px] ipad:[--fibre-extension:112] desktop-sm:left-[72px] desktop-sm:right-[72px] desktop-sm:bottom-[-113px] desktop-sm:[--fibre-extension:113]"}>
            <RubanFibre variante="arc" centreX={52} encre="#F5F5F2" lueur={0} />
          </div>
          <div className={"flex w-full max-w-[402px] ipad:max-w-[744px] desktop-sm:max-w-none"}>
            <div className={"relative flex w-full flex-col items-center justify-between px-[30px] pt-[29px] pb-[36px] ipad:px-[52px] ipad:pt-[38px] ipad:pb-[53px] desktop-sm:flex-row desktop-sm:items-center desktop-sm:px-0 desktop-sm:pt-0 desktop-sm:pb-0 desktop-sm:pl-[6.333%] desktop-sm:pr-[13.792%]"}>
              <div className={"relative z-20 flex w-full flex-col items-center gap-[16px] text-center desktop-sm:w-[387px] desktop-sm:shrink-0 desktop-sm:items-start desktop-sm:text-left"}>
                <div className={"flex w-full flex-col items-center gap-[12px] desktop-sm:items-start"}>
                  <span className={"ft-eyebrow mb-0!"}>
                    <b>
                      {"ERX"}
                    </b>
                    <span>
                      {"Enterprise Resource Execution"}
                    </span>
                  </span>
                  <h1 className={"w-full desktop-sm:w-[550px] font-instrument-serif text-[42px] leading-[1.1] tracking-[-0.42px] text-black ipad:text-[62px] ipad:tracking-[-0.62px]"}>
                    {"Omega est un ERX : l'ERP qui fait le travail à votre place"}
                  </h1>
                </div>
                <p className={"font-tight text-[14px] leading-[25.5px] tracking-[-0.28px] text-[#121212] opacity-80 ipad:text-[17px] ipad:tracking-[-0.34px]"}>
                  {"Un ERX, c'est un ERP tout-en-un (ventes, achats, stock, banque, comptabilité) dans lequel des agents IA font le travail : relances, saisie des factures, réponses aux clients. Et c'est notre IA qui l'installe chez vous, bien plus vite et pour bien moins cher qu'un déploiement classique."}
                </p>
                <p className={"font-tight -mt-[6px] text-[13px] leading-[20px] tracking-[-0.2px] text-[#121212] ipad:text-[15px] ipad:leading-[22px] ipad:tracking-[-0.3px]"}>
                  {"À partir de "}
                  <strong className={"font-bold"}>{"34,90 € HT"}</strong>
                  {" par personne et par mois."}
                </p>
                <div className={"flex flex-wrap items-center justify-center gap-[16px] desktop-sm:flex-nowrap desktop-sm:justify-start"}>
                  <Button asChild variant={"link"}>
                    <Link href={"/reserver-un-audit"}>
                      {"Réserver un audit"}
                      <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                    </Link>
                  </Button>
                  <Button asChild variant={"link"}>
                    <Link href={"/offres"}>
                      {"Voir le logiciel"}
                      <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={"relative shrink-0 z-20 [--cell:25%] [--row:46px] ipad:[--cell:16.6667%] ipad:[--row:56px] desktop-sm:[--cell:8.3333%] mx-[32px] h-[92px] ipad:mx-[52px] ipad:h-[112px] desktop-sm:mx-[72px] desktop-sm:mt-auto desktop-sm:h-[113px]"}>
          <span data-gutter-guide={"top"} className={"absolute inset-x-0 h-px"} style={{ "top": "calc(var(--row) * 0)" } as CSSProperties} />
          <span data-gutter-guide={"top"} className={"absolute inset-x-0 h-px"} style={{ "top": "calc(var(--row) * 1)" } as CSSProperties} />
          <span className={"absolute inset-x-0 top-0 block [clip-path:inset(0_1px_0_0)]"} style={{ "height": "var(--row)", "backgroundImage": "repeating-linear-gradient(to right, transparent 0, transparent calc(var(--cell) - 1px), #dcdcda calc(var(--cell) - 1px), #dcdcda var(--cell))", "maskImage": "repeating-linear-gradient(to bottom, #000 0, #000 4px, transparent 4px, transparent 7px)", "WebkitMaskImage": "repeating-linear-gradient(to bottom, #000 0, #000 4px, transparent 4px, transparent 7px)" } as CSSProperties} />
          <span className={"absolute inset-x-0 top-0 block"} style={{ "height": "var(--row)", "backgroundImage": "repeating-linear-gradient(to bottom, #dcdcda 0, #dcdcda 1px, transparent 1px, transparent var(--row))", "maskImage": "repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px)", "WebkitMaskImage": "repeating-linear-gradient(to right, #000 0, #000 4px, transparent 4px, transparent 7px)" } as CSSProperties} />
          <div className={"absolute inset-x-0 bottom-0 top-[var(--row)] border-t border-solid border-[#dcdcda] bg-[#f5f5f2] text-[#121212]"}>
            <div className={"logo-marquee flex h-full w-full items-center overflow-hidden "} data-pause={"true"} style={{ "--duration": "50s" } as CSSProperties} aria-label={"Les modules d'Omega"}>
              <div className={"logo-marquee-track flex w-max min-w-full shrink-0 items-center"} style={{ "animationDirection": "normal" } as CSSProperties}>
                <div className={"flex min-w-[var(--marquee-width)] shrink-0 items-center justify-around"}>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Ventes"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Achats"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Stock"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Banque"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Comptabilité"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Documents"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Relances"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Demandes clients"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Factures fournisseurs"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Clients inactifs"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Sur mesure"}</span>
                  </div>
                </div>
                <div className={"flex min-w-[var(--marquee-width)] shrink-0 items-center justify-around"} aria-hidden={"true"}>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Ventes"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Achats"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Stock"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Banque"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Comptabilité"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Documents"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Relances"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Demandes clients"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Factures fournisseurs"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Clients inactifs"}</span>
                  </div>
                  <div className={"mx-8 flex shrink-0 items-center ipad:mx-12"}>
                    <span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{"Sur mesure"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] block"} style={{ "left": "calc(var(--cell) * 0.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden ipad:block"} style={{ "left": "calc(var(--cell) * 4.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
          <span className={"absolute -translate-x-1/2 -translate-y-1/2 bg-black h-[24px] w-[64px] ipad:h-[30px] ipad:w-[91px] desktop-sm:h-[39px] desktop-sm:w-[98px] hidden desktop-sm:block"} style={{ "left": "calc(var(--cell) * 8.5)", "top": "calc(var(--row) * 0.5)", "filter": "blur(10px)", "maskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "WebkitMaskImage": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24.8' height='24.8'%3E%3Cpath d='M24.8 0H12.4V12.4H0V24.8' fill='none' stroke='%23000' stroke-opacity='.149'/%3E%3C/svg%3E\")", "maskSize": "24.8px 24.8px", "WebkitMaskSize": "24.8px 24.8px" } as CSSProperties} />
        </div>
      </div>
      <span aria-hidden={"true"} data-gutter-guide={"top"} className={"pointer-events-none absolute bottom-0 left-1/2 z-30 h-px w-[calc(100%-64px)] max-w-[1776px] -translate-x-1/2 bg-[#dcdcda] ipad:w-[calc(100%-104px)] desktop-sm:w-[calc(100%-144px)]"} />
    </main>
  );
}
