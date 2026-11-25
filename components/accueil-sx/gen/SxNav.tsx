/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxNav ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import Link from "next/link";

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
              <Link href={"/secteurs"} className={"inline-flex min-h-11 cursor-pointer items-center font-tight text-[17px] leading-[25.5px] tracking-[-0.34px] whitespace-nowrap text-black transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-60"}>
                {"Métiers"}
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
            <Link href={"/contact"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[10px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] bg-white pt-0 pr-[12px] pb-0 pl-[20px] text-[14px] text-[#121212]  text-center"}>
              {"Parler à l'équipe"}
              <svg width={"22"} height={"22"} viewBox={"0 0 22 22"} fill={"none"} aria-hidden={"true"} focusable={"false"} className={"block shrink-0"}>
                <path d={"M8.16385 16.4621C7.75528 16.0535 7.75528 15.3903 8.16385 14.9802L11.6147 11.5309L8.16385 8.08005C7.76785 7.66991 7.77256 7.01619 8.17799 6.61234C8.58185 6.20691 9.23556 6.20219 9.64571 6.59819L13.8367 10.7892C14.2453 11.1993 14.2453 11.8625 13.8367 12.2711L9.64571 16.4621C9.23714 16.8706 8.57399 16.8706 8.16385 16.4621Z"} fill={"currentColor"} />
              </svg>
            </Link>
            <Link href={"/reserver-un-audit"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[8px] rounded-[12px] border border-solid border-transparent border-t-[rgba(255,255,255,0.15)] pt-0 pr-[24px] pb-0 pl-[24px] text-[16px] text-white [text-shadow:0px_1px_1px_rgba(0,0,0,0.15),0px_3px_3px_rgba(0,0,0,0.05)]  text-center"} style={{ "backgroundImage": "linear-gradient(180deg, rgba(255,255,255,0.2) 4.0988%, rgba(255,255,255,0) 43.902%), linear-gradient(90deg, #292929 0%, #292929 100%)", "boxShadow": "inset 0px 1px 1px 0px rgba(255,255,255,0.3), 0px 63px 18px 0px rgba(16,16,16,0), 0px 40px 16px 0px rgba(11,11,11,0.01), 0px 23px 14px 0px rgba(8,8,8,0.05), 0px 10px 10px 0px rgba(5,5,5,0.09), 0px 3px 6px 0px rgba(0,0,0,0.1)" } as CSSProperties}>
              {"Commencer"}
            </Link>
          </div>
        </div>
        <button type={"button"} aria-label={"Ouvrir le menu"} className={"-mr-[10px] inline-flex min-h-11 min-w-11 cursor-pointer touch-manipulation items-center justify-center transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 desktop-sm:hidden [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70"}>
          <img src={"/accueil-sx/menu.svg"} alt={""} aria-hidden={"true"} className={"block size-[24px] max-w-none"} />
        </button>
      </nav>
    </div>
  );
}
