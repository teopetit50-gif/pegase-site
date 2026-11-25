/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxIntegrations ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SxIntegrations() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"integrations"} data-gutter-guide={"bottom"} className={"relative isolate flex w-full flex-col overflow-hidden border-b border-[#dcdcda] bg-[#f5f5f2]"}>
        <div aria-hidden={"true"} className={"pointer-events-none absolute inset-0 z-0 hidden overflow-hidden desktop-sm:block"}>
          <div className={"absolute inset-x-0 top-[-10px] h-[260px]"} style={{ "backgroundImage": "repeating-linear-gradient(to right, rgba(0,0,0,0.035) 0px, rgba(0,0,0,0.0175) 21.4px, rgba(0,0,0,0.0044) 30px, rgba(0,0,0,0) 30px, rgba(0,0,0,0) 53.333px)", "maskImage": "linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%)", "WebkitMaskImage": "linear-gradient(to bottom, #000 0%, #000 78%, transparent 100%)" } as CSSProperties} />
          <div className={"absolute inset-y-0 left-1/2 w-[1440px] -translate-x-1/2"}>
            <div className={"absolute h-[960.5px] w-[1358px]"} style={{ "left": "66px", "top": "-33.5px" } as CSSProperties}>
              <span className={"absolute inset-[-11.66%_-8.25%]"}>
                <img src={"/accueil-sx/halo.svg"} alt={""} className={"block size-full max-w-none"} />
              </span>
            </div>
          </div>
        </div>
        <div className={"relative mx-auto w-full max-w-[402px] ipad:max-w-[744px] desktop-sm:max-w-[1440px] z-10 flex flex-col items-center gap-8 py-16 ipad:py-20 desktop-sm:flex-row desktop-sm:justify-center desktop-sm:gap-[calc(56px*var(--k))] desktop-sm:[--k:.82] laptop:[--k:1] desktop-sm:py-[96px]"}>
          <ul aria-label={"Outils du quotidien"} className={"relative h-[calc(240px*var(--k))] w-[calc(240px*var(--k))] shrink-0 [--k:.62] ipad:[--k:.78] desktop-sm:[--k:.82] laptop:[--k:1]"}>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + -72px * var(--k))", "top": "calc(50% + -72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-agenda.svg"} alt={"Google Agenda"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "-19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 72px * var(--k))", "top": "calc(50% + -72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-whatsapp.svg"} alt={"WhatsApp"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "-19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 0px * var(--k))", "top": "calc(50% + 0px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-gmail.svg"} alt={"Gmail"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "-19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + -72px * var(--k))", "top": "calc(50% + 72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-sheets.svg"} alt={"Google Sheets"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(79.88px * var(--k))", "rotate": "-19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 72px * var(--k))", "top": "calc(50% + 72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-notion.svg"} alt={"Notion"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(97.53px * var(--k))", "rotate": "-19.87deg" } as CSSProperties} />
            </li>
          </ul>
          <div className={"relative z-20"}>
            <div className={"flex items-center justify-center"}>
              <div className={"flex shrink-0 flex-col items-center gap-[24.87px] ipad:gap-[30.538px] desktop-sm:gap-[32px]"}>
                <div className={"flex flex-col items-center gap-[9.326px] text-center text-[#121212] ipad:gap-[11.452px] desktop-sm:gap-[12px]"}>
                  <h2 className={"text-[30px] ipad:text-[clamp(28px,3.2vw,40px)] font-[450] leading-[1.16] tracking-[-0.045em] whitespace-nowrap"}>
                    {"Tout est relié."}
                    <br />
                    {"Rien n'est ressaisi."}
                  </h2>
                  <p className={"w-[309.324px] font-tight text-[16px] leading-[normal] tracking-[-0.32px] opacity-60 ipad:w-[379.822px] ipad:text-[17px] ipad:leading-[21.95px] ipad:tracking-[-0.34px] desktop-sm:w-[398px] desktop-sm:text-[18px] desktop-sm:leading-[23px] desktop-sm:tracking-[-0.36px]"}>
                    {"Omega se branche sur les outils que vos équipes utilisent déjà."}
                  </p>
                </div>
                <div className={"flex items-center gap-[15.269px] desktop-sm:gap-[16px]"}>
                  <Button asChild variant={"link"}>
                    <Link href={"/integrations"}>
                      {"Intégrations"}
                      <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                    </Link>
                  </Button>
                  <Button asChild variant={"link"}>
                    <Link href={"/contact"}>
                      {"Parler à l'équipe"}
                      <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <ul aria-label={"Outils de gestion"} className={"relative h-[calc(240px*var(--k))] w-[calc(240px*var(--k))] shrink-0 [--k:.62] ipad:[--k:.78] desktop-sm:[--k:.82] laptop:[--k:1]"}>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 72px * var(--k))", "top": "calc(50% + -72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-quickbooks.svg"} alt={"QuickBooks"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + -72px * var(--k))", "top": "calc(50% + -72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-stripe.svg"} alt={"Stripe"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 0px * var(--k))", "top": "calc(50% + 0px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-sage.svg"} alt={"Sage"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(75.17px * var(--k))", "rotate": "19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + 72px * var(--k))", "top": "calc(50% + 72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-drive.svg"} alt={"Google Drive"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(91.40px * var(--k))", "rotate": "19.87deg" } as CSSProperties} />
            </li>
            <li className={"absolute -translate-x-1/2 -translate-y-1/2 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.14))_drop-shadow(0_8px_14px_rgb(0_0_0/0.06))]"} style={{ "left": "calc(50% + -72px * var(--k))", "top": "calc(50% + 72px * var(--k))" } as CSSProperties}>
              <img src={"/accueil-sx/outil-shopify.svg"} alt={"Shopify"} draggable={"false"} className={"block max-w-none select-none "} style={{ "width": "calc(92.93px * var(--k))", "rotate": "19.87deg" } as CSSProperties} />
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
