/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxNav ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SxNav() {
  return (
    <div className={"sx-navbar-sticky"} data-compact={"false"}>
      <nav data-gutter-guide={"bottom"} aria-label={"Navigation principale"} className={"sx-navbar relative z-30 flex h-[64px] w-full shrink-0 items-center justify-between border-b border-solid border-[#dcdcda] bg-[#f5f5f2] px-[32px] ipad:px-[48px] desktop-sm:px-[74.5px]"}>
        <Link href={"/"} aria-label={"Accueil Omega"} className={"flex cursor-pointer items-center gap-[8px] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70"}>
          <img src={"/logo-pegase.png"} alt={""} aria-hidden={"true"} className={"block size-[17px] max-w-none"} />
          <span className={"font-sans text-[20px] leading-[25.5px] font-semibold tracking-[-0.4px] whitespace-nowrap text-[#121212]"}>
            {"Omega"}
          </span>
        </Link>
        <div className={"sx-navbar-desktop hidden items-center gap-[52px] desktop-sm:flex"}>
          <ul className={"flex items-center gap-[24px]"}>
            <li>
              <Link href={"/offres"} className={"inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"}>
                {"Logiciel"}
              </Link>
            </li>
            <li>
              <Link href={"/offres#catalogue"} className={"inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"}>
                {"Agents"}
              </Link>
            </li>
            <li>
              <Link href={"/integrations"} className={"inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"}>
                {"Intégrations"}
              </Link>
            </li>
            <li>
              <Link href={"/tarifs"} className={"inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"}>
                {"Tarifs"}
              </Link>
            </li>
          </ul>
          <div className={"flex items-center gap-3"}>
            <Button asChild variant={"link"}>
              <Link href={"/contact"}>
                {"Parler à l'équipe"}
                <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
              </Link>
            </Button>
            <Button asChild variant={"link"}>
              <Link href={"/reserver-un-audit"}>
                {"Commencer"}
                <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
              </Link>
            </Button>
          </div>
        </div>
        <button type={"button"} aria-label={"Ouvrir le menu"} className={"-mr-[10px] inline-flex min-h-11 min-w-11 cursor-pointer touch-manipulation items-center justify-center transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 desktop-sm:hidden [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70"}>
          <img src={"/accueil-sx/menu.svg"} alt={""} aria-hidden={"true"} className={"block size-[24px] max-w-none"} />
        </button>
      </nav>
    </div>
  );
}
