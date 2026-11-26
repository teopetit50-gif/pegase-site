/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxPlateforme ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import RubanFibre from "../RubanFibre";

export default function SxPlateforme() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] py-[85px] ipad:px-[52px] desktop-sm:px-[72px] pb-0"}>
      <div id={"platform"} className={"platform-section"}>
        <header className={"platform-intro platform-intro-split"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"ERP"}
            </span>
            <h2>
              {"Votre gestion, prise en charge."}
              <br />
              <span>
                {"Les agents font le travail. Vous gardez la main."}
              </span>
            </h2>
          </div>
          <p className={"platform-lede"}>
            {"Un seul espace pour les ventes, les achats, le stock, la banque et la comptabilité. Les agents préparent les relances, traitent les factures et signalent ce qui demande votre attention, et rien ne part sans votre accord."}
          </p>
        </header>
        <div className={"platform-layout"}>
          <nav className={"platform-nav"} aria-label={"Ce que fait l'ERP"} data-gutter-guide={"bottom"}>
            <a href={"#platform-payroll"} className={"is-active"} aria-current={"step"}>
              {"Relancer les impayés"}
            </a>
            <a href={"#platform-onboarding"} className={""}>
              {"Traiter les factures"}
            </a>
            <a href={"#platform-time-off"} className={""}>
              {"Répondre aux demandes"}
            </a>
            <a href={"#platform-compliance"} className={""}>
              {"Contrôler les paiements"}
            </a>
            <a href={"#platform-insights"} className={""}>
              {"Suivre la trésorerie"}
            </a>
          </nav>
          <div className={"platform-stack"}>
            <span id={"platform-payroll"} className={"platform-scroll-anchor"} />
            <article data-platform-panel={"true"} data-gutter-guide={"bottom"} className={"platform-panel"} style={{ "zIndex": "1" } as CSSProperties}>
              <div className={"platform-panel-copy"}>
                <p>
                  {"Les agents repèrent les devis sans réponse et les factures en retard, rédigent les relances et signalent ce qui sort de l'ordinaire. Vous relisez une courte liste et validez en un clic."}
                </p>
              </div>
              <div className={"platform-illustration"} data-gutter-guide={"top"}>
                <div className={"platform-glass"}>
                  <div className={"platform-app platform-payroll"}>
                    <div className={"platform-panel-header"}>
                      <div className={"flex items-center gap-2"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-calculator-bold shrink-0 text-[#f06a00]"} style={{ "width": "20px", "height": "20px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M12 22C7.75736 22 5.63604 22 4.31802 20.5355C3 19.0711 3 16.714 3 12C3 7.28595 3 4.92893 4.31802 3.46447C5.63604 2 7.75736 2 12 2C16.2426 2 18.364 2 19.682 3.46447C21 4.92893 21 7.28595 21 12C21 16.714 21 19.0711 19.682 20.5355C18.364 22 16.2426 22 12 22ZM15 6H9C8.53501 6 8.30252 6 8.11177 6.05111C7.59413 6.18981 7.18981 6.59413 7.05111 7.11177C7 7.30252 7 7.53501 7 8C7 8.46499 7 8.69748 7.05111 8.88823C7.18981 9.40587 7.59413 9.81019 8.11177 9.94889C8.30252 10 8.53501 10 9 10H15C15.465 10 15.6975 10 15.8882 9.94889C16.4059 9.81019 16.8102 9.40587 16.9489 8.88823C17 8.69748 17 8.46499 17 8C17 7.53501 17 7.30252 16.9489 7.11177C16.8102 6.59413 16.4059 6.18981 15.8882 6.05111C15.6975 6 15.465 6 15 6ZM9 13C9 13.5523 8.55228 14 8 14C7.44772 14 7 13.5523 7 13C7 12.4477 7.44772 12 8 12C8.55228 12 9 12.4477 9 13ZM12 14C12.5523 14 13 13.5523 13 13C13 12.4477 12.5523 12 12 12C11.4477 12 11 12.4477 11 13C11 13.5523 11.4477 14 12 14ZM17 13C17 13.5523 16.5523 14 16 14C15.4477 14 15 13.5523 15 13C15 12.4477 15.4477 12 16 12C16.5523 12 17 12.4477 17 13ZM16 18C16.5523 18 17 17.5523 17 17C17 16.4477 16.5523 16 16 16C15.4477 16 15 16.4477 15 17C15 17.5523 15.4477 18 16 18ZM13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17ZM8 18C8.55228 18 9 17.5523 9 17C9 16.4477 8.55228 16 8 16C7.44772 16 7 16.4477 7 17C7 17.5523 7.44772 18 8 18Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        <strong>
                          {"Relances de novembre"}
                        </strong>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-info-circle-outline shrink-0 text-[#b8b8b8]"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z"} fill={"currentColor"} />
                          <path d={"M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z"} fill={"currentColor"} />
                          <path d={"M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                      </div>
                      <div className={"platform-payroll-tools"}>
                        <div role={"group"} data-slot={"avatar-group"} data-size={"xs"} className={"platform-header-avatars"} aria-label={"4 collaborateurs"}>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-ab.svg"} alt={"Adam Benali"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-am.svg"} alt={"Alice Morel"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-ar.svg"} alt={"Anne-Marie Roux"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar-group-count"}>
                            {"+1"}
                            <span className={"sr-only"}>
                              {" collaborateur de plus"}
                            </span>
                          </span>
                        </div>
                        <button type={"button"} aria-label={"Partager"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-square-share-line-outline"} style={{ "width": "17px", "height": "17px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M10.7521 1.99364C10.7556 2.40784 10.4226 2.74646 10.0084 2.74997C8.29884 2.76447 7.03889 2.82006 6.06281 3.01125C5.10767 3.19835 4.47982 3.50532 3.99518 3.98996C3.42533 4.55981 3.09834 5.33078 2.92642 6.60954C2.75159 7.90987 2.75 9.61855 2.75 11.9974C2.75 14.3762 2.75159 16.0849 2.92642 17.3852C3.09834 18.664 3.42533 19.435 3.99518 20.0048C4.56503 20.5747 5.336 20.9017 6.61476 21.0736C7.91509 21.2484 9.62377 21.25 12.0026 21.25C14.3814 21.25 16.0901 21.2484 17.3905 21.0736C18.6692 20.9017 19.4402 20.5747 20.01 20.0048C20.4947 19.5202 20.8017 18.8923 20.9887 17.9372C21.1799 16.9611 21.2355 15.7012 21.25 13.9916C21.2535 13.5774 21.5922 13.2444 22.0064 13.2479C22.4206 13.2515 22.7535 13.5901 22.75 14.0043C22.7355 15.7087 22.6819 17.0968 22.4608 18.2255C22.2356 19.3752 21.8272 20.309 21.0707 21.0655C20.1757 21.9605 19.0354 22.3659 17.5903 22.5602C16.1785 22.75 14.369 22.75 12.06 22.75H11.9452C9.63623 22.75 7.82673 22.75 6.41488 22.5602C4.96979 22.3659 3.82952 21.9605 2.93452 21.0655C2.03952 20.1705 1.63408 19.0302 1.43979 17.5851C1.24998 16.1733 1.24999 14.3638 1.25 12.0548V11.94C1.24999 9.63101 1.24998 7.82151 1.43979 6.40967C1.63408 4.96458 2.03952 3.8243 2.93452 2.9293C3.69102 2.1728 4.62478 1.76443 5.77447 1.53923C6.90322 1.31813 8.29131 1.26448 9.99573 1.25003C10.4099 1.24652 10.7485 1.57944 10.7521 1.99364ZM16.4697 1.46967C16.7626 1.17678 17.2374 1.17678 17.5303 1.46967L22.5303 6.46967C22.8232 6.76256 22.8232 7.23744 22.5303 7.53033L17.5303 12.5303C17.2374 12.8232 16.7626 12.8232 16.4697 12.5303C16.1768 12.2374 16.1768 11.7626 16.4697 11.4697L20.1893 7.75H14C12.4485 7.75 11.5328 8.50701 11.212 8.82933L11.0199 9.02244L10.8293 9.21204C10.507 9.53279 9.75 10.4485 9.75 12V15C9.75 15.4142 9.41421 15.75 9 15.75C8.58579 15.75 8.25 15.4142 8.25 15V12C8.25 9.91622 9.27703 8.64063 9.77125 8.14881C9.77125 8.14881 9.77125 8.14881 9.77125 8.14881L9.96178 7.9592L10.1488 7.77125C10.6406 7.27703 11.9162 6.25 14 6.25H20.1893L16.4697 2.53033C16.1768 2.23744 16.1768 1.76256 16.4697 1.46967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                          {"Partager"}
                        </button>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <button type={"button"} aria-label={"Discussion"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-dialog-2-outline"} style={{ "width": "18px", "height": "18px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M13.3365 1.25H15.6634C16.8583 1.24999 17.8086 1.24999 18.5706 1.32244C19.352 1.39674 20.0127 1.55247 20.6012 1.91312C21.2067 2.28418 21.7158 2.79326 22.0868 3.39876C22.4475 3.9873 22.6032 4.64796 22.6775 5.42935C22.75 6.19141 22.75 7.14162 22.7499 8.33653V9.15226C22.75 10.0028 22.75 10.6794 22.7125 11.2279C22.6742 11.7891 22.5943 12.2709 22.4074 12.7221C21.9507 13.8247 21.0746 14.7008 19.972 15.1575C19.5929 15.3146 19.1887 15.397 18.7308 15.4419C18.7255 15.5812 18.7188 15.7137 18.7102 15.8397C18.6695 16.4357 18.5848 16.9436 18.3884 17.4178C17.9063 18.5817 16.9816 19.5064 15.8177 19.9885C15.2209 20.2357 14.5625 20.3081 13.7346 20.3346C13.2892 20.3489 13.0044 20.3587 12.7881 20.385C12.5837 20.41 12.5069 20.4433 12.4654 20.4679C12.4193 20.4951 12.3557 20.5451 12.2447 20.6979C12.1249 20.863 11.9891 21.0907 11.7742 21.4539L11.5147 21.8922C10.8378 23.0359 9.16217 23.0359 8.48523 21.8922L8.2258 21.4539C8.01082 21.0907 7.87511 20.863 7.75524 20.6979C7.64427 20.5451 7.58064 20.4951 7.53453 20.4679C7.49305 20.4433 7.41631 20.41 7.21182 20.3851C6.99552 20.3587 6.71078 20.3489 6.26533 20.3346C5.43745 20.3081 4.77912 20.2357 4.18225 19.9885C3.01837 19.5064 2.09367 18.5817 1.61157 17.4178C1.41517 16.9436 1.33047 16.4357 1.2898 15.8397C1.24999 15.2563 1.25 14.5361 1.25 13.6274V12.7613C1.24999 11.4848 1.24999 10.4732 1.32705 9.6627C1.40595 8.83288 1.57089 8.13673 1.94996 7.51814C2.34162 6.879 2.87899 6.34163 3.51813 5.94996C4.13672 5.57089 4.83287 5.40595 5.66269 5.32705C5.87363 5.30699 6.0982 5.29216 6.33751 5.28118C6.41754 4.56134 6.57708 3.94704 6.91307 3.39877C7.28412 2.79326 7.7932 2.28418 8.3987 1.91312C8.98723 1.55247 9.64789 1.39674 10.4293 1.32244C11.1913 1.24999 12.1416 1.24999 13.3365 1.25ZM7.85331 5.2512C8.1401 5.25 8.44243 5.25 8.7613 5.25H11.2387C12.5153 5.24999 13.5268 5.24999 14.3373 5.32705C15.1671 5.40595 15.8633 5.57089 16.4819 5.94996C17.121 6.34163 17.6584 6.879 18.05 7.51814C18.4291 8.13673 18.5941 8.83288 18.673 9.6627C18.75 10.4732 18.75 11.4847 18.75 12.7613V13.6274C18.75 13.7307 18.75 13.8316 18.7499 13.9301C19.0253 13.8944 19.2262 13.8428 19.398 13.7717C20.1331 13.4672 20.7171 12.8832 21.0216 12.1481C21.1201 11.9101 21.1829 11.6106 21.216 11.1258C21.2495 10.6343 21.2499 10.0089 21.2499 9.12503V8.37503C21.2499 7.13296 21.2492 6.25408 21.1842 5.57133C21.1204 4.89973 20.9998 4.49574 20.8079 4.18251C20.5605 3.77884 20.2211 3.43945 19.8174 3.19208C19.5042 3.00013 19.1002 2.87956 18.4286 2.81571C17.7459 2.75079 16.867 2.75 15.6249 2.75H13.3749C12.1329 2.75 11.254 2.75079 10.5713 2.81571C9.89967 2.87956 9.49568 3.00013 9.18245 3.19208C8.77879 3.43945 8.4394 3.77884 8.19203 4.18251C8.03147 4.44453 7.92229 4.76687 7.85331 5.2512ZM5.80467 6.82031C5.08465 6.88877 4.64517 7.01855 4.30188 7.22892C3.86458 7.4969 3.4969 7.86458 3.22892 8.30189C3.01855 8.64518 2.88877 9.08466 2.82031 9.80468C2.75079 10.5359 2.75 11.4761 2.75 12.8V13.6C2.75 14.5422 2.75041 15.2112 2.78632 15.7376C2.82178 16.2573 2.88931 16.5828 2.99739 16.8438C3.32725 17.6401 3.95994 18.2728 4.75628 18.6027C5.09046 18.7411 5.52102 18.81 6.31328 18.8354L6.34438 18.8364C6.74979 18.8493 7.1024 18.8606 7.39344 18.8961C7.70371 18.9339 8.00853 19.0055 8.29822 19.1768C8.58327 19.3454 8.78917 19.569 8.96888 19.8164C9.13514 20.0453 9.30644 20.3347 9.50062 20.6629L9.77606 21.1282C9.82147 21.2049 9.90074 21.25 9.99998 21.25C10.0992 21.25 10.1785 21.2049 10.2239 21.1282L10.4994 20.6628C10.6935 20.3347 10.8648 20.0453 11.0311 19.8164C11.2108 19.569 11.4167 19.3454 11.7018 19.1768C11.9914 19.0055 12.2963 18.9339 12.6065 18.8961C12.8976 18.8606 13.2502 18.8493 13.6556 18.8364L13.6867 18.8354C14.479 18.81 14.9095 18.7411 15.2437 18.6027C16.0401 18.2728 16.6728 17.6401 17.0026 16.8438C17.1107 16.5828 17.1782 16.2573 17.2137 15.7376C17.2496 15.2112 17.25 14.5422 17.25 13.6V12.8C17.25 11.4761 17.2492 10.5359 17.1797 9.80468C17.1112 9.08466 16.9814 8.64518 16.7711 8.30189C16.5031 7.86458 16.1354 7.4969 15.6981 7.22892C15.3548 7.01855 14.9154 6.88877 14.1953 6.82031C13.4641 6.75079 12.5239 6.75 11.2 6.75H8.8C7.47611 6.75 6.53585 6.75079 5.80467 6.82031Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                            <path d={"M7.5 13C7.5 13.5523 7.05229 14 6.5 14C5.94772 14 5.5 13.5523 5.5 13C5.5 12.4477 5.94772 12 6.5 12C7.05229 12 7.5 12.4477 7.5 13Z"} fill={"currentColor"} />
                            <path d={"M11 13C11 13.5523 10.5523 14 10 14C9.44772 14 9 13.5523 9 13C9 12.4477 9.44772 12 10 12C10.5523 12 11 12.4477 11 13Z"} fill={"currentColor"} />
                            <path d={"M14.5 13C14.5 13.5523 14.0523 14 13.5 14C12.9477 14 12.5 13.5523 12.5 13C12.5 12.4477 12.9477 12 13.5 12C14.0523 12 14.5 12.4477 14.5 13Z"} fill={"currentColor"} />
                          </svg>
                        </button>
                        <button type={"button"} aria-label={"Aide"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-question-circle-outline"} style={{ "width": "18px", "height": "18px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M12 15C12.5523 15 13 15.4477 13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15Z"} fill={"currentColor"} />
                            <path d={"M12 6.25C13.4497 6.25 14.625 7.42525 14.625 8.875C14.625 9.83834 14.1054 10.68 13.335 11.1357C13.1384 11.2521 12.9759 11.3793 12.8701 11.5039C12.7676 11.6248 12.75 11.7036 12.75 11.75V13C12.75 13.4142 12.4142 13.75 12 13.75C11.5858 13.75 11.25 13.4142 11.25 13V11.75C11.25 11.2442 11.4715 10.8338 11.7266 10.5332C11.9785 10.2363 12.2928 10.0095 12.5713 9.84473C12.9043 9.64773 13.125 9.28655 13.125 8.875C13.125 8.25368 12.6213 7.75 12 7.75C11.3787 7.75 10.875 8.25368 10.875 8.875C10.875 9.28921 10.5392 9.625 10.125 9.625C9.71079 9.625 9.375 9.28921 9.375 8.875C9.375 7.42525 10.5503 6.25 12 6.25Z"} fill={"currentColor"} />
                            <path d={"M12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                        </button>
                        <button type={"button"} aria-label={"Plus d'options"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={""}>
                            <path d={"M12 12V11.5M12 5V4.5M12 19V18.5M13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12ZM13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6C12.5523 6 13 5.55228 13 5ZM13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                          </svg>
                        </button>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <button type={"button"} className={"platform-ask-ai"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} width={"17"} height={"17"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={""}>
                            <path d={"M12 21.5C17.2467 21.5 21.5 17.2467 21.5 12C21.5 6.75329 17.2467 2.5 12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 13.3377 2.66372 14.5604 3.1189 15.6954C3.81756 17.4374 3.68195 18.9241 2.5 20.5C3.86146 21.1644 6 21 7 20.0725C8.45323 20.9748 10.1636 21.5 12 21.5Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                            <path d={"M12 10.125V12M12 12V13.875M12 12H10.5M12 12H13.5M15 12L13.6987 11.5662C13.1015 11.3672 12.6328 10.8985 12.4338 10.3013L12 9L11.5662 10.3013C11.3672 10.8985 10.8985 11.3672 10.3013 11.5662L9 12L10.3013 12.4338C10.8985 12.6328 11.3672 13.1015 11.5662 13.6987L12 15L12.4338 13.6987C12.6328 13.1015 13.1015 12.6328 13.6987 12.4338L15 12Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                          </svg>
                          {"Demander à l'IA"}
                        </button>
                      </div>
                    </div>
                    <div className={"platform-payroll-filters"}>
                      <span className={"platform-payroll-filter"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-widget-2-bold text-[#3b82f6]"} aria-hidden={"true"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M2 6.63415C2 4.07478 4.07478 2 6.63415 2C9.19351 2 11.2683 4.07478 11.2683 6.63415C11.2683 9.19351 9.19351 11.2683 6.63415 11.2683C4.07478 11.2683 2 9.19351 2 6.63415Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M12.7317 17.3659C12.7317 14.8065 14.8065 12.7317 17.3659 12.7317C19.9252 12.7317 22 14.8065 22 17.3659C22 19.9252 19.9252 22 17.3659 22C14.8065 22 12.7317 19.9252 12.7317 17.3659Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M2 17.5C2 15.3787 2 14.318 2.65901 13.659C3.31802 13 4.37868 13 6.5 13C8.62132 13 9.68198 13 10.341 13.659C11 14.318 11 15.3787 11 17.5C11 19.6213 11 20.682 10.341 21.341C9.68198 22 8.62132 22 6.5 22C4.37868 22 3.31802 22 2.65901 21.341C2 20.682 2 19.6213 2 17.5Z"} fill={"currentColor"} />
                          <path d={"M13 6.5C13 4.37868 13 3.31802 13.659 2.65901C14.318 2 15.3787 2 17.5 2C19.6213 2 20.682 2 21.341 2.65901C22 3.31802 22 4.37868 22 6.5C22 8.62132 22 9.68198 21.341 10.341C20.682 11 19.6213 11 17.5 11C15.3787 11 14.318 11 13.659 10.341C13 9.68198 13 8.62132 13 6.5Z"} fill={"currentColor"} />
                        </svg>
                        {"Tous les clients"}
                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-down"} aria-hidden={"true"}>
                          <path d={"m6 9 6 6 6-6"} />
                        </svg>
                      </span>
                      <span className={"platform-payroll-filter"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-tuning-2-bold text-[#8c8c8c]"} aria-hidden={"true"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M9.25 14C10.9069 14 12.25 15.3431 12.25 17C12.25 18.6569 10.9069 20 9.25 20C7.59315 20 6.25 18.6569 6.25 17C6.25 15.3431 7.59315 14 9.25 14Z"} fill={"currentColor"} />
                          <path d={"M14.25 4C12.5931 4 11.25 5.34315 11.25 7C11.25 8.65685 12.5931 10 14.25 10C15.9069 10 17.25 8.65685 17.25 7C17.25 5.34315 15.9069 4 14.25 4Z"} fill={"currentColor"} />
                          <path d={"M8.75 6.20852C9.16421 6.20852 9.5 6.54431 9.5 6.95852C9.5 7.37273 9.16421 7.70852 8.75 7.70852L1.75 7.70852C1.33579 7.70852 1 7.37273 1 6.95852C1 6.54431 1.33579 6.20852 1.75 6.20852H8.75Z"} fill={"currentColor"} />
                          <path d={"M14.75 16.2085C14.3358 16.2085 14 16.5443 14 16.9585C14 17.3727 14.3358 17.7085 14.75 17.7085H21.75C22.1642 17.7085 22.5 17.3727 22.5 16.9585C22.5 16.5443 22.1642 16.2085 21.75 16.2085H14.75Z"} fill={"currentColor"} />
                          <path d={"M1 16.9585C1 16.5443 1.33579 16.2085 1.75 16.2085H3.75C4.16421 16.2085 4.5 16.5443 4.5 16.9585C4.5 17.3727 4.16421 17.7085 3.75 17.7085H1.75C1.33579 17.7085 1 17.3727 1 16.9585Z"} fill={"currentColor"} />
                          <path d={"M21.75 6.20852C22.1642 6.20852 22.5 6.54431 22.5 6.95852C22.5 7.37273 22.1642 7.70852 21.75 7.70852L19.75 7.70852C19.3358 7.70852 19 7.37273 19 6.95852C19 6.54431 19.3358 6.20852 19.75 6.20852H21.75Z"} fill={"currentColor"} />
                        </svg>
                        {"Affichage"}
                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-down"} aria-hidden={"true"}>
                          <path d={"m6 9 6 6 6-6"} />
                        </svg>
                      </span>
                    </div>
                    <div className={"w-full overflow-hidden border-border bg-background text-sm platform-payroll-table border-0"}>
                      <div className={"overflow-auto"} style={{ "height": "325px" } as CSSProperties}>
                        <table className={"border-collapse"} style={{ "tableLayout": "fixed", "minWidth": "max(100%, 708px)" } as CSSProperties}>
                          <colgroup>
                            <col style={{ "width": "48px" } as CSSProperties} />
                            <col style={{ "width": "calc(26.67% - 12.8016px)" } as CSSProperties} />
                            <col style={{ "width": "calc(21.82% - 10.4736px)" } as CSSProperties} />
                            <col style={{ "width": "calc(16.97% - 8.1456px)" } as CSSProperties} />
                            <col style={{ "width": "calc(15.76% - 7.5648px)" } as CSSProperties} />
                            <col style={{ "width": "calc(18.78% - 9.0144px)" } as CSSProperties} />
                            <col />
                          </colgroup>
                          <thead>
                            <tr style={{ "height": "36px" } as CSSProperties}>
                              <th className={"sticky top-0 z-10 border-border border-b bg-muted"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_R_d5q6hdavb_"} className={"inline-flex gap-3 items-center cursor-pointer size-6"}>
                                    <button id={"_R_d5q6hdavb_"} type={"button"} role={"checkbox"} aria-checked={"mixed"} aria-label={"Tout sélectionner"} data-state={"indeterminate"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-primary bg-primary text-primary-foreground"} tabIndex={0}>
                                      <svg width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"3"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} style={{ "opacity": "1", "transform": "none" } as CSSProperties}>
                                        <title>
                                          {"Sélection partielle"}
                                        </title>
                                        <path d={"M6 12h12"} pathLength={"1"} strokeDashoffset={"0"} strokeDasharray={"1 1"} />
                                      </svg>
                                    </button>
                                  </label>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "36px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <button type={"button"} className={"flex h-full min-w-0 flex-1 select-none items-center gap-1 px-4 transition-colors hover:text-foreground justify-start"}>
                                    <span className={"truncate"}>
                                      <span className={"platform-employee-heading inline-flex w-full items-center gap-1.5"}>
                                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"14"} height={"14"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={"shrink-0"} aria-hidden={"true"}>
                                          <path d={"M11.995 13.5663L11 13.5C10.6446 13.5097 10.3134 13.5226 10.0008 13.5379C6.3 13.7193 3.28417 16.8058 3 20.5002"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <circle cx={"11"} cy={"6.5"} r={"4"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M17.8979 15.0055L18.5578 16.2475C18.6478 16.4204 18.8878 16.5862 19.0902 16.618L20.2863 16.805C21.0513 16.925 21.2312 17.4472 20.6801 17.9624L19.7502 18.8374C19.5927 18.9856 19.5064 19.2715 19.5552 19.4761L19.8214 20.5594C20.0314 21.4168 19.5477 21.7485 18.7415 21.3004L17.6204 20.6758C17.4179 20.5629 17.0842 20.5629 16.878 20.6758L15.7569 21.3004C14.9544 21.7485 14.467 21.4133 14.677 20.5594L14.9432 19.4761C14.9919 19.2715 14.9057 18.9856 14.7482 18.8374L13.8183 17.9624C13.2709 17.4472 13.4471 16.925 14.212 16.805L15.4081 16.618C15.6069 16.5862 15.8468 16.4204 15.9368 16.2475L16.5968 15.0055C16.9567 14.3315 17.5417 14.3315 17.8979 15.0055Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                        </svg>
                                        {"Client"}
                                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"16"} height={"16"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={"ml-auto shrink-0"} aria-hidden={"true"}>
                                          <path d={"M18.5618 19.5496C17.4511 20.5162 16.1087 21.2512 14.5904 21.6576C13.7249 21.8893 12.8554 22 12 22M2.3439 14.5847C2.06477 13.5441 1.96053 12.4978 2.01316 11.4771M3.08975 7.46053C3.301 7.04586 3.5409 6.64615 3.80765 6.26456M7.53022 3.05251C8.12024 2.7588 8.74825 2.51942 9.40963 2.34238C14.7425 0.914877 20.2255 4.08152 21.6561 9.41528C22.2166 11.5051 22.0719 13.6176 21.3677 15.5M7.46257 20.906C6.30344 20.3145 5.26113 19.4992 4.40468 18.5"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M11.9991 8V11.995M11.9991 11.995V16M11.9991 11.995L7.99414 11.995M11.9991 11.995H15.9941"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                        </svg>
                                      </span>
                                    </span>
                                    <span aria-hidden={"true"} className={"inline-flex shrink-0"} style={{ "opacity": "0.35", "transform": "none" } as CSSProperties}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-up h-3.5 w-3.5"} aria-hidden={"true"}>
                                        <path d={"m18 15-6-6-6 6"} />
                                      </svg>
                                    </span>
                                  </button>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "36px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <button type={"button"} className={"flex h-full min-w-0 flex-1 select-none items-center gap-1 px-4 transition-colors hover:text-foreground justify-start"}>
                                    <span className={"truncate"}>
                                      <span className={"inline-flex items-center gap-1.5"}>
                                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"14"} height={"14"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={"shrink-0"} aria-hidden={"true"}>
                                          <path d={"M8.5 18C10.3135 16.0463 13.667 15.9543 15.5 18M13.9406 12C13.9406 13.1046 13.0688 14 11.9934 14C10.918 14 10.0462 13.1046 10.0462 12C10.0462 10.8954 10.918 10 11.9934 10C13.0688 10 13.9406 10.8954 13.9406 12Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeWidth={"1.5"} />
                                          <path d={"M9.5 4.00195C6.85561 4.01181 5.44101 4.10427 4.52513 4.97195C3.5 5.94312 3.5 7.5062 3.5 10.6324V15.3692C3.5 18.4954 3.5 20.0584 4.52513 21.0296C5.55025 22.0008 7.20017 22.0008 10.5 22.0008H13.5C16.7998 22.0008 18.4497 22.0008 19.4749 21.0296C20.5 20.0584 20.5 18.4954 20.5 15.3692V10.6324C20.5 7.5062 20.5 5.94312 19.4749 4.97195C18.559 4.10427 17.1444 4.01181 14.5 4.00195"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M9.77216 3.63163C9.8681 3.21682 9.91608 3.00942 10.0082 2.84004C10.2229 2.44546 10.6188 2.15548 11.0914 2.0467C11.2943 2 11.5296 2 12 2C12.4704 2 12.7057 2 12.9086 2.0467C13.3812 2.15548 13.7771 2.44545 13.9918 2.84004C14.0839 3.00942 14.1319 3.21682 14.2278 3.63163L14.3111 3.99176C14.4813 4.72744 14.5664 5.09528 14.438 5.37824C14.3549 5.5615 14.2132 5.71842 14.031 5.82911C13.7496 6 13.3324 6 12.4981 6H11.5019C10.6676 6 10.2504 6 9.96901 5.82911C9.78677 5.71842 9.6451 5.5615 9.56197 5.37824C9.43361 5.09528 9.51869 4.72744 9.68886 3.99176L9.77216 3.63163Z"} stroke={"currentColor"} strokeWidth={"1.5"} />
                                        </svg>
                                        {"Pièce"}
                                      </span>
                                    </span>
                                    <span aria-hidden={"true"} className={"inline-flex shrink-0"} style={{ "opacity": "0.35", "transform": "none" } as CSSProperties}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-up h-3.5 w-3.5"} aria-hidden={"true"}>
                                        <path d={"m18 15-6-6-6 6"} />
                                      </svg>
                                    </span>
                                  </button>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "36px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <button type={"button"} className={"flex h-full min-w-0 flex-1 select-none items-center gap-1 px-4 transition-colors hover:text-foreground justify-start"}>
                                    <span className={"truncate"}>
                                      <span className={"inline-flex items-center gap-1.5"}>
                                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"14"} height={"14"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={"shrink-0"} aria-hidden={"true"}>
                                          <path d={"M2.01709 17C4.21666 17 5.99977 18.7831 5.99977 20.9827"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M18 20.9827V20.8908C18 18.742 19.742 17 21.8908 17"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M2.01738 10.981C4.21681 10.9808 6 9.19947 6 6.99999C4.44655 7.04679 3.51998 7.22004 2.87868 7.86135C2.23761 8.50242 2.06425 9.42854 2.01738 10.981ZM2.01738 10.981C2.01728 10.981 2.01719 10.981 2.01709 10.981M2.01738 10.981C2 11.5564 2 12.2178 2 12.9827V15C2 17.8284 2 19.2426 2.87868 20.1213C3.75736 21 5.17157 21 8 21H16C18.8284 21 20.2426 21 21.1213 20.1213C22 19.2426 22 17.8284 22 15V12.9827C22 10.1542 22 8.74003 21.1213 7.86135C20.48 7.22004 19.5534 7.04509 18 6.99829C18 9.17861 19.769 10.9497 21.9423 10.9806"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M12 7V3"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M15 7V5"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M9 7V5"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M15 14C15 15.6569 13.6569 17 12 17C10.3431 17 9 15.6569 9 14C9 12.3431 10.3431 11 12 11C13.6569 11 15 12.3431 15 14Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                        </svg>
                                        {"Montant"}
                                      </span>
                                    </span>
                                    <span aria-hidden={"true"} className={"inline-flex shrink-0"} style={{ "opacity": "0.35", "transform": "none" } as CSSProperties}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-up h-3.5 w-3.5"} aria-hidden={"true"}>
                                        <path d={"m18 15-6-6-6 6"} />
                                      </svg>
                                    </span>
                                  </button>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "36px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <button type={"button"} className={"flex h-full min-w-0 flex-1 select-none items-center gap-1 px-4 transition-colors hover:text-foreground justify-start"}>
                                    <span className={"truncate"}>
                                      <span className={"inline-flex items-center gap-1.5"}>
                                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"14"} height={"14"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={"shrink-0"} aria-hidden={"true"}>
                                          <path d={"M14.4998 13.501C14.4998 14.8817 13.3805 16.001 11.9998 16.001C10.619 16.001 9.49976 14.8817 9.49976 13.501C9.49976 12.1203 10.619 11.001 11.9998 11.001C13.3805 11.001 14.4998 12.1203 14.4998 13.501Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M17.5 6.5498C19.1831 6.66255 20.3941 6.94811 21.1329 7.17709C21.6756 7.34528 22 7.85966 22 8.42782V18.1831C22 19.2982 20.7719 20.1372 19.6762 19.9303C18.7361 19.7528 17.5107 19.6101 16 19.6101C11.2491 19.6101 10.1096 21.4158 3.1448 19.88C2.47265 19.7318 2 19.1273 2 18.439V8.42193C2 7.44607 2.92079 6.73443 3.87798 6.92437C4.86572 7.12037 5.72897 7.24475 6.5 7.3151"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M2.00049 15.9971C4.20963 15.9971 6.00049 17.7879 6.00049 19.9971M22 10.97C20.2655 10.97 18.5005 9.04062 18.5005 7.00098M5.92901 7.25514C5.70483 8.90605 3.95133 10.501 2 10.501M18.102 19.5993C18.2601 17.8112 20.1009 16.501 22 16.501"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                          <path d={"M12 7.50098V3.50098M15 7.50098V5.50098M9 7.50098V5.50098"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                                        </svg>
                                        {"Reste dû"}
                                      </span>
                                    </span>
                                    <span aria-hidden={"true"} className={"inline-flex shrink-0"} style={{ "opacity": "0.35", "transform": "none" } as CSSProperties}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-up h-3.5 w-3.5"} aria-hidden={"true"}>
                                        <path d={"m18 15-6-6-6 6"} />
                                      </svg>
                                    </span>
                                  </button>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "36px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <span className={"min-w-0 flex-1 truncate px-4 text-left"}>
                                    <span className={"inline-flex items-center gap-1.5"}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-circle-dashed-outline shrink-0"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                        <path d={"M19.6019 4.39914C20.1041 4.90138 20.5465 5.44177 20.9291 6.01085C21.1601 6.35456 21.069 6.82039 20.7254 7.05148C20.3818 7.28249 19.9159 7.19121 19.6848 6.84777C19.3559 6.35864 18.9746 5.8932 18.5412 5.4598C18.1078 5.0264 17.6424 4.64515 17.1533 4.31628C16.8095 4.08518 16.7178 3.61871 16.9489 3.27495C17.1799 2.93139 17.6458 2.84041 17.9895 3.07124C18.5587 3.45389 19.0996 3.89683 19.6019 4.39914Z"} fill={"currentColor"} />
                                        <path d={"M22.75 12.0005C22.75 12.7107 22.6807 13.4057 22.5488 14.0786C22.4691 14.485 22.0753 14.75 21.6689 14.6704C21.2626 14.5908 20.9978 14.1968 21.0771 13.7905C21.1905 13.2121 21.25 12.6134 21.25 12.0005C21.25 11.3876 21.1905 10.7889 21.0771 10.2104C20.9975 9.80397 21.2625 9.40925 21.6689 9.32959C22.0753 9.25004 22.469 9.51514 22.5488 9.92139C22.6807 10.5944 22.75 11.2901 22.75 12.0005Z"} fill={"currentColor"} />
                                        <path d={"M19.6009 19.6019C19.0986 20.1041 18.5582 20.5465 17.9892 20.9291C17.6454 21.1601 17.1796 21.069 16.9485 20.7254C16.7175 20.3818 16.8088 19.9159 17.1522 19.6848C17.6414 19.3559 18.1068 18.9746 18.5402 18.5412C18.9736 18.1078 19.3549 17.6424 19.6837 17.1533C19.9148 16.8095 20.3813 16.7178 20.725 16.9489C21.0686 17.1799 21.1596 17.6458 20.9288 17.9895C20.5461 18.5587 20.1032 19.0996 19.6009 19.6019Z"} fill={"currentColor"} />
                                        <path d={"M11.9995 22.75C11.2893 22.75 10.5943 22.6807 9.92139 22.5488C9.51502 22.4691 9.25001 22.0753 9.32959 21.6689C9.40922 21.2626 9.80315 20.9978 10.2095 21.0771C10.7879 21.1905 11.3866 21.25 11.9995 21.25C12.6124 21.25 13.2111 21.1905 13.7896 21.0771C14.196 20.9975 14.5908 21.2625 14.6704 21.6689C14.75 22.0753 14.4849 22.469 14.0786 22.5488C13.4056 22.6807 12.7099 22.75 11.9995 22.75Z"} fill={"currentColor"} />
                                        <path d={"M4.39811 19.6009C3.89591 19.0986 3.45348 18.5582 3.0709 17.9892C2.83993 17.6454 2.93097 17.1796 3.27461 16.9485C3.61823 16.7175 4.08406 16.8088 4.31524 17.1522C4.64408 17.6414 5.02541 18.1068 5.45877 18.5402C5.89217 18.9736 6.35759 19.3549 6.84674 19.6837C7.1905 19.9148 7.28224 20.3813 7.05114 20.725C6.82008 21.0686 6.35419 21.1596 6.01051 20.9288C5.44133 20.5461 4.90042 20.1032 4.39811 19.6009Z"} fill={"currentColor"} />
                                        <path d={"M1.25 11.9995C1.25003 11.2893 1.3193 10.5943 1.45117 9.92139C1.53089 9.51503 1.92466 9.25001 2.33105 9.32959C2.73738 9.40922 3.00222 9.80315 2.92285 10.2095C2.8095 10.7879 2.75003 11.3866 2.75 11.9995C2.75 12.6124 2.80951 13.2111 2.92285 13.7896C3.00251 14.196 2.73754 14.5908 2.33105 14.6704C1.92474 14.75 1.53097 14.4849 1.45117 14.0786C1.31927 13.4056 1.25 12.7099 1.25 11.9995Z"} fill={"currentColor"} />
                                        <path d={"M4.39914 4.39811C4.90138 3.89591 5.44177 3.45348 6.01085 3.0709C6.35456 2.83993 6.82039 2.93097 7.05148 3.27461C7.28249 3.61823 7.19121 4.08406 6.84777 4.31525C6.35864 4.64408 5.8932 5.02541 5.4598 5.45877C5.0264 5.89217 4.64515 6.35759 4.31628 6.84674C4.08518 7.1905 3.61871 7.28224 3.27495 7.05114C2.93139 6.82008 2.84041 6.35419 3.07124 6.01051C3.45389 5.44133 3.89683 4.90042 4.39914 4.39811Z"} fill={"currentColor"} />
                                        <path d={"M12.0005 1.25C12.7107 1.25003 13.4057 1.3193 14.0786 1.45117C14.485 1.53089 14.75 1.92466 14.6704 2.33105C14.5908 2.73738 14.1968 3.00222 13.7905 2.92285C13.2121 2.8095 12.6134 2.75003 12.0005 2.75C11.3876 2.75 10.7889 2.80951 10.2104 2.92285C9.80397 3.00251 9.40925 2.73754 9.32959 2.33105C9.25004 1.92474 9.51514 1.53097 9.92139 1.45117C10.5944 1.31927 11.2901 1.25 12.0005 1.25Z"} fill={"currentColor"} />
                                      </svg>
                                      {"Statut"}
                                    </span>
                                  </span>
                                </div>
                              </th>
                              <th aria-hidden={"true"} className={"sticky top-0 z-10 border-border border-b bg-muted"} />
                            </tr>
                          </thead>
                          <tbody>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_0_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_0_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 1"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-ab.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Adam Benali"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Facture · J+7"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"6 200 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 580 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_1_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_1_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 2"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-am.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Alice Morel"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Devis · J+3"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"7 900 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"6 310 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"true"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_2_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_2_"} type={"button"} role={"checkbox"} aria-checked={"true"} aria-label={"Sélectionner la ligne 3"} data-state={"checked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-primary bg-primary text-primary-foreground"} tabIndex={0}>
                                      <svg width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"3"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} style={{ "opacity": "1", "transform": "none" } as CSSProperties}>
                                        <title>
                                          {"Sélectionnée"}
                                        </title>
                                        <path d={"M5 13l4 4L19 7"} pathLength={"1"} strokeDashoffset={"0"} strokeDasharray={"1 1"} />
                                      </svg>
                                    </button>
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-ar.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Anne-Marie Roux"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Facture · J+21"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"5 450 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 070 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status is-warning "}>
                                  <i />
                                  {"Payée en partie"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"true"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_5_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_5_"} type={"button"} role={"checkbox"} aria-checked={"true"} aria-label={"Sélectionner la ligne 4"} data-state={"checked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-primary bg-primary text-primary-foreground"} tabIndex={0}>
                                      <svg width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"3"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} style={{ "opacity": "1", "transform": "none" } as CSSProperties}>
                                        <title>
                                          {"Sélectionnée"}
                                        </title>
                                        <path d={"M5 13l4 4L19 7"} pathLength={"1"} strokeDashoffset={"0"} strokeDasharray={"1 1"} />
                                      </svg>
                                    </button>
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-fe.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Fanny Estève"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Facture · J+3"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 800 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"3 620 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status is-warning "}>
                                  <i />
                                  {"Litige ouvert"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_8_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_8_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 5"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-gm.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Gabriel Meyer"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Devis · J+7"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"5 100 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"3 860 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_9_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_9_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 6"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-mm.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Maya Martin"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Devis · J+3"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"6 600 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 860 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_a_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_a_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 7"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-pg.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Paul Girard"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Facture · J+7"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"6 200 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 580 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "36px" } as CSSProperties}>
                              <td className={"text-center"}>
                                <div className={"flex items-center justify-center"}>
                                  <label htmlFor={"_r_b_"} className={"inline-flex gap-3 items-center cursor-pointer"}>
                                    <button id={"_r_b_"} type={"button"} role={"checkbox"} aria-checked={"false"} aria-label={"Sélectionner la ligne 8"} data-state={"unchecked"} className={"inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 border-muted-foreground/50 bg-background hover:border-muted-foreground"} tabIndex={0} />
                                  </label>
                                </div>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-rl.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Rémi Lambert"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Facture · J+3"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"5 800 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"tabular-nums"}>
                                  {"4 350 €"}
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className={"platform-agent platform-payroll-review"}>
                      <div className={"pointer-events-none absolute inset-0"} aria-hidden={"true"}>
                        <RubanFibre variante="droit" />
                      </div>
                      <div className={"platform-review-copy"}>
                        <div className={"platform-agent-label"}>
                          <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                            <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"currentColor"} />
                          </svg>
                          {" Résumé de l'IA"}
                        </div>
                        <p>
                          {"2 relances demandent un regard. Anne-Marie a réglé une partie de sa facture, et Fanny a ouvert un litige il y a 2 jours."}
                        </p>
                      </div>
                      <div className={"platform-actions"}>
                        <button type={"button"} aria-expanded={"false"}>
                          {"Voir les 2 cas"}
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-arrow-right-up-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                            <path d={"M9 6.75C8.58579 6.75 8.25 6.41421 8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H18C18.4142 5.25 18.75 5.58579 18.75 6V15C18.75 15.4142 18.4142 15.75 18 15.75C17.5858 15.75 17.25 15.4142 17.25 15V7.81066L6.53033 18.5303C6.23744 18.8232 5.76256 18.8232 5.46967 18.5303C5.17678 18.2374 5.17678 17.7626 5.46967 17.4697L16.1893 6.75H9Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                        </button>
                        <button type={"button"} className={"is-primary platform-approve"} disabled={true}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                            <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                          {"Valider les relances"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <span id={"platform-onboarding"} className={"platform-scroll-anchor"} />
            <article data-platform-panel={"true"} data-gutter-guide={"bottom"} className={"platform-panel"} style={{ "zIndex": "2" } as CSSProperties}>
              <div className={"platform-panel-copy"} data-gutter-guide={"top"}>
                <p>
                  {"Les factures fournisseurs entrent en comptabilité sans rien recopier. Les agents les lisent, les rapprochent de la commande et préparent l'écriture."}
                </p>
              </div>
              <div className={"platform-illustration"} data-gutter-guide={"top"}>
                <div className={"platform-glass"}>
                  <div className={"platform-onboarding"}>
                    <div className={"platform-app"}>
                      <div className={"sx-onboarding-checklist w-full"}>
                        <div className={"w-full"}>
                          <div className={"w-full rounded-lg bg-white p-4 text-[#202020]"}>
                            <div className={"mr-2 mb-4 flex flex-col justify-between sm:flex-row sm:items-center"}>
                              <h3 className={"ml-2 flex items-center gap-2 text-balance font-semibold text-foreground"}>
                                <span className={"relative inline-flex size-[22px] shrink-0 items-center justify-center text-[#3b82f6]"} aria-hidden={"true"}>
                                  <svg className={"absolute inset-0 size-[22px]"} viewBox={"0 0 22 22"} fill={"none"}>
                                    <circle cx={"11"} cy={"11"} r={"10.25"} stroke={"currentColor"} strokeWidth={"1.5"} strokeDasharray={"4.8 2.36"} />
                                  </svg>
                                  <span className={"inline-flex size-[15px] items-center justify-center rounded-full bg-[#3b82f6] text-white"}>
                                    <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-user-bold"} style={{ "width": "12px", "height": "12px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                                      <path d={"M12 13C16.4183 13 20 15.0147 20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13Z"} fill={"currentColor"} />
                                      <path d={"M12 2C14.2091 2 16 3.79086 16 6C16 8.20914 14.2091 10 12 10C9.79086 10 8 8.20914 8 6C8 3.79086 9.79086 2 12 2Z"} fill={"currentColor"} />
                                    </svg>
                                  </span>
                                </span>
                                {"Facture Papeteries Dumas"}
                              </h3>
                              <div className={"mt-2 flex items-center justify-end sm:mt-0"}>
                                <svg className={"-rotate-90"} height={"14"} viewBox={"0 0 14 14"} width={"14"}>
                                  <circle className={"stroke-muted"} cx={"7"} cy={"7"} fill={"none"} pathLength={"100"} r={"6"} strokeWidth={"2"} />
                                  <circle className={"stroke-primary"} cx={"7"} cy={"7"} fill={"none"} pathLength={"100"} r={"6"} strokeDasharray={"100"} strokeLinecap={"round"} strokeWidth={"2"} style={{ "strokeDashoffset": "66.66666666666667" } as CSSProperties} />
                                </svg>
                                <div className={"mr-3 ml-1.5 text-muted-foreground text-sm"}>
                                  <span className={"font-medium text-foreground"}>
                                    {"2"}
                                  </span>
                                  {" / "}
                                  <span className={"font-medium text-foreground"}>
                                    {"6"}
                                  </span>
                                  {" étapes faites"}
                                </div>
                                <button className={"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground size-6"} type={"button"} id={"radix-_R_3iqahdavb_"} aria-haspopup={"menu"} aria-expanded={"false"} data-state={"closed"}>
                                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"tabler-icon tabler-icon-dots size-4 shrink-0"} aria-hidden={"true"}>
                                    <path d={"M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"} />
                                    <path d={"M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"} />
                                    <path d={"M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"} />
                                  </svg>
                                  <span className={"sr-only"}>
                                    {"Options"}
                                  </span>
                                </button>
                              </div>
                            </div>
                            <div className={"flex flex-col rounded-lg border border-[#e5e5e5]"}>
                              <div className={"group"}>
                                <div className={"block w-full text-left"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors"}>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-[#262626] bg-[#262626] text-white"}>
                                            <svg width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"3"} strokeLinecap={"round"} strokeLinejoin={"round"}>
                                              <path d={"m5 12 4 4L19 6"} />
                                            </svg>
                                          </span>
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-primary"}>
                                            {"Lire la facture reçue"}
                                          </h4>
                                          <div data-state={"closed"}>
                                            <div data-state={"closed"} id={"radix-_R_2kcqahdavb_"} hidden />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={"group border-border border-t"}>
                                <div className={"block w-full text-left"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors"}>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-[#262626] bg-[#262626] text-white"}>
                                            <svg width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"3"} strokeLinecap={"round"} strokeLinejoin={"round"}>
                                              <path d={"m5 12 4 4L19 6"} />
                                            </svg>
                                          </span>
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-primary"}>
                                            {"Rapprocher la commande"}
                                          </h4>
                                          <div data-state={"closed"}>
                                            <div data-state={"closed"} id={"radix-_R_2kkqahdavb_"} hidden />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={"group rounded-lg"}>
                                <div className={"block w-full text-left rounded-lg"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors onboarding-verification-panel mx-4 border border-transparent"}>
                                    <div className={"pointer-events-none absolute inset-0"} aria-hidden={"true"}>
                                      <RubanFibre variante="droit" />
                                    </div>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-[#737373]/50 bg-white"} />
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-foreground"}>
                                            {"Contrôler le fournisseur"}
                                          </h4>
                                          <div data-state={"open"}>
                                            <div data-state={"open"} id={"radix-_R_2ksqahdavb_"}>
                                              <p className={"mt-2 text-pretty text-muted-foreground text-sm sm:max-w-64 md:max-w-xs"}>
                                                {"L'agent a rapproché la facture de sa commande. Relisez les champs extraits, puis confirmez le contrôle."}
                                              </p>
                                              <button className={"inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-3 mt-3 gap-2"}>
                                                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                                  <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                                                </svg>
                                                {"Confirmer le contrôle"}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={"group"}>
                                <div className={"block w-full text-left"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors"}>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-[#737373]/50 bg-white"} />
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-foreground"}>
                                            {"Préparer l'écriture"}
                                          </h4>
                                          <div data-state={"closed"}>
                                            <div data-state={"closed"} id={"radix-_R_2l4qahdavb_"} hidden />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={"group border-border border-t"}>
                                <div className={"block w-full text-left"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors"}>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-[#737373]/50 bg-white"} />
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-foreground"}>
                                            {"Classer la pièce"}
                                          </h4>
                                          <div data-state={"closed"}>
                                            <div data-state={"closed"} id={"radix-_R_2lcqahdavb_"} hidden />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={"group border-border border-t"}>
                                <div className={"block w-full text-left"}>
                                  <div className={"relative overflow-hidden rounded-lg transition-colors"}>
                                    <div className={"relative flex items-center justify-between gap-3 py-3 pr-2 pl-4"}>
                                      <div className={"flex w-full gap-3"}>
                                        <div className={"shrink-0"}>
                                          <span aria-hidden={"true"} className={"mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-[#737373]/50 bg-white"} />
                                        </div>
                                        <div className={"mt-0.5 grow"}>
                                          <h4 className={"font-semibold text-foreground"}>
                                            {"Planifier le paiement"}
                                          </h4>
                                          <div data-state={"closed"}>
                                            <div data-state={"closed"} id={"radix-_R_2lkqahdavb_"} hidden />
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
                    <div className={"platform-agent platform-passport"}>
                      <div className={"platform-passport-content"}>
                        <div className={"platform-passport-details"}>
                          <div className={"platform-agent-label"}>
                            <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                              <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"currentColor"} />
                            </svg>
                            {" Extrait de la facture"}
                          </div>
                          <p>
                            {"Contrôlé avec la commande. Les montants correspondent."}
                          </p>
                          <dl>
                            <div>
                              <dt>
                                {"Fournisseur"}
                              </dt>
                              <dd>
                                {"Anne-Marie Roux"}
                              </dd>
                            </div>
                            <div>
                              <dt>
                                {"Date de facture"}
                              </dt>
                              <dd>
                                {"12 nov. 2026"}
                              </dd>
                            </div>
                            <div>
                              <dt>
                                {"Commande"}
                              </dt>
                              <dd>
                                {"BC-0418"}
                              </dd>
                            </div>
                            <div>
                              <dt>
                                {"Échéance"}
                              </dt>
                              <dd>
                                {"12 déc. 2026"}
                              </dd>
                            </div>
                            <div>
                              <dt>
                                {"Confiance"}
                              </dt>
                              <dd>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Élevée"}
                                </span>
                              </dd>
                            </div>
                          </dl>
                        </div>
                        <button className={"platform-text-button"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                            <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                          {"Confirmer le contrôle"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <span id={"platform-time-off"} className={"platform-scroll-anchor"} />
            <article data-platform-panel={"true"} data-gutter-guide={"bottom"} className={"platform-panel"} style={{ "zIndex": "3" } as CSSProperties}>
              <div className={"platform-panel-copy"} data-gutter-guide={"top"}>
                <p>
                  {"Les demandes arrivent par mail ou par WhatsApp et sont rapprochées de l'historique du client et de l'agenda de l'équipe. Vous validez la réponse avec tout le contexte sous les yeux."}
                </p>
              </div>
              <div className={"platform-illustration"} data-gutter-guide={"top"}>
                <div className={"platform-glass"}>
                  <div className={"platform-app"}>
                    <div className={"platform-panel-header"}>
                      <div className={"flex items-center gap-2"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-widget-2-bold shrink-0 text-[#f06a00]"} style={{ "width": "20px", "height": "20px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M2 6.63415C2 4.07478 4.07478 2 6.63415 2C9.19351 2 11.2683 4.07478 11.2683 6.63415C11.2683 9.19351 9.19351 11.2683 6.63415 11.2683C4.07478 11.2683 2 9.19351 2 6.63415Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M12.7317 17.3659C12.7317 14.8065 14.8065 12.7317 17.3659 12.7317C19.9252 12.7317 22 14.8065 22 17.3659C22 19.9252 19.9252 22 17.3659 22C14.8065 22 12.7317 19.9252 12.7317 17.3659Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M2 17.5C2 15.3787 2 14.318 2.65901 13.659C3.31802 13 4.37868 13 6.5 13C8.62132 13 9.68198 13 10.341 13.659C11 14.318 11 15.3787 11 17.5C11 19.6213 11 20.682 10.341 21.341C9.68198 22 8.62132 22 6.5 22C4.37868 22 3.31802 22 2.65901 21.341C2 20.682 2 19.6213 2 17.5Z"} fill={"currentColor"} />
                          <path d={"M13 6.5C13 4.37868 13 3.31802 13.659 2.65901C14.318 2 15.3787 2 17.5 2C19.6213 2 20.682 2 21.341 2.65901C22 3.31802 22 4.37868 22 6.5C22 8.62132 22 9.68198 21.341 10.341C20.682 11 19.6213 11 17.5 11C15.3787 11 14.318 11 13.659 10.341C13 9.68198 13 8.62132 13 6.5Z"} fill={"currentColor"} />
                        </svg>
                        <div>
                          <strong>
                            {"Demande client"}
                          </strong>
                        </div>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-info-circle-outline shrink-0 text-[#b8b8b8]"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z"} fill={"currentColor"} />
                          <path d={"M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z"} fill={"currentColor"} />
                          <path d={"M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <span className={"platform-requester"}>
                          <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-mm.svg"} alt={""} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"MM"}
                            </span>
                          </span>
                          <span>
                            {"Maya Martin"}
                          </span>
                        </span>
                      </div>
                      <div className={"platform-payroll-tools"}>
                        <button type={"button"} className={"platform-ask-ai"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} width={"17"} height={"17"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={""}>
                            <path d={"M12 21.5C17.2467 21.5 21.5 17.2467 21.5 12C21.5 6.75329 17.2467 2.5 12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 13.3377 2.66372 14.5604 3.1189 15.6954C3.81756 17.4374 3.68195 18.9241 2.5 20.5C3.86146 21.1644 6 21 7 20.0725C8.45323 20.9748 10.1636 21.5 12 21.5Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                            <path d={"M12 10.125V12M12 12V13.875M12 12H10.5M12 12H13.5M15 12L13.6987 11.5662C13.1015 11.3672 12.6328 10.8985 12.4338 10.3013L12 9L11.5662 10.3013C11.3672 10.8985 10.8985 11.3672 10.3013 11.5662L9 12L10.3013 12.4338C10.8985 12.6328 11.3672 13.1015 11.5662 13.6987L12 15L12.4338 13.6987C12.6328 13.1015 13.1015 12.6328 13.6987 12.4338L15 12Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                          </svg>
                          {"Demander à l'IA"}
                        </button>
                      </div>
                    </div>
                    <div className={"platform-agent platform-payroll-review platform-shared-review platform-leave-summary"}>
                      <div className={"pointer-events-none absolute inset-0"} aria-hidden={"true"}>
                        <RubanFibre variante="droit" />
                      </div>
                      <div className={"platform-shared-review-content"}>
                        <div className={"platform-agent-label"}>
                          <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                            <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"currentColor"} />
                          </svg>
                          {" Résumé de l'IA"}
                        </div>
                        <div className={"platform-leave-note"}>
                          <p>
                            {"Rendez-vous de mardi à jeudi : l'agenda de Maya est libre, et 3 personnes sur 4 restent disponibles."}
                          </p>
                          <div className={"platform-tags"}>
                            <span className={"platform-status  "}>
                              <i />
                              {"Réponse rédigée"}
                            </span>
                            <span className={"platform-status  "}>
                              <i />
                              {"Agenda vérifié"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={"platform-calendar"}>
                      <div />
                      <div>
                        {"Lun"}
                      </div>
                      <div>
                        {"Mar"}
                      </div>
                      <div>
                        {"Mer"}
                      </div>
                      <div>
                        {"Jeu"}
                      </div>
                      <div>
                        {"Ven"}
                      </div>
                      <div className={"platform-calendar-row"}>
                        <strong className={"platform-calendar-person"}>
                          <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-ab.svg"} alt={""} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          {"Adam"}
                        </strong>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                      </div>
                      <div className={"platform-calendar-row"}>
                        <strong className={"platform-calendar-person"}>
                          <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-am.svg"} alt={""} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          {"Alice"}
                        </strong>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                      </div>
                      <div className={"platform-calendar-row"}>
                        <strong className={"platform-calendar-person"}>
                          <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-mm.svg"} alt={""} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"M"}
                            </span>
                          </span>
                          {"Maya"}
                        </strong>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span className={"platform-leave-span"} style={{ "gridColumn": "span 3" } as CSSProperties}>
                          <span className={"platform-leave-bar"}>
                            {"Rendez-vous · 3 jours"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                      </div>
                      <div className={"platform-calendar-row"}>
                        <strong className={"platform-calendar-person"}>
                          <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-pg.svg"} alt={""} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"P"}
                            </span>
                          </span>
                          {"Paul"}
                        </strong>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                        <span>
                          <span className={"platform-available"}>
                            <i aria-hidden={"true"} />
                            {"Libre"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className={"platform-actions platform-decision"} aria-live={"polite"}>
                      <button className={"platform-suggest"}>
                        <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                          <defs>
                            <linearGradient id={"_R_maehdavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                              <stop offset={"0"} stopColor={"#2D00F7"} />
                              <stop offset={"0.2"} stopColor={"#F4001D"} />
                              <stop offset={"0.4"} stopColor={"#F21A00"} />
                              <stop offset={"0.6"} stopColor={"#DD3700"} />
                              <stop offset={"0.8"} stopColor={"#F06A00"} />
                              <stop offset={"1"} stopColor={"#F28900"} />
                            </linearGradient>
                          </defs>
                          <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_maehdavb_)"} />
                        </svg>
                        {"Proposer d'autres dates"}
                      </button>
                      <button className={"is-primary platform-approve"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        {"Valider la réponse"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <span id={"platform-compliance"} className={"platform-scroll-anchor"} />
            <article data-platform-panel={"true"} data-gutter-guide={"bottom"} className={"platform-panel"} style={{ "zIndex": "4" } as CSSProperties}>
              <div className={"platform-panel-copy"} data-gutter-guide={"top"}>
                <p>
                  {"Chaque paiement est comparé à la fiche du fournisseur et aux paiements passés avant de partir. Un RIB modifié ou une facture en double attend votre accord."}
                </p>
              </div>
              <div className={"platform-illustration"} data-gutter-guide={"top"}>
                <div className={"platform-glass"}>
                  <div className={"platform-app"}>
                    <div className={"platform-panel-header"}>
                      <div className={"flex items-center gap-2"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-shield-check-bold shrink-0 text-[#f06a00]"} style={{ "width": "20px", "height": "20px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M3.37752 5.08241C3 5.62028 3 7.21907 3 10.4167V11.9914C3 17.6294 7.23896 20.3655 9.89856 21.5273C10.62 21.8424 10.9807 22 12 22C13.0193 22 13.38 21.8424 14.1014 21.5273C16.761 20.3655 21 17.6294 21 11.9914V10.4167C21 7.21907 21 5.62028 20.6225 5.08241C20.245 4.54454 18.7417 4.02996 15.7351 3.00079L15.1623 2.80472C13.595 2.26824 12.8114 2 12 2C11.1886 2 10.405 2.26824 8.83772 2.80472L8.26491 3.00079C5.25832 4.02996 3.75503 4.54454 3.37752 5.08241ZM15.0595 10.4995C15.3353 10.1905 15.3085 9.71642 14.9995 9.44055C14.6905 9.16467 14.2164 9.19151 13.9405 9.50049L10.9286 12.8739L10.0595 11.9005C9.78358 11.5915 9.30947 11.5647 9.00049 11.8405C8.69151 12.1164 8.66467 12.5905 8.94055 12.8995L10.3691 14.4995C10.5114 14.6589 10.7149 14.75 10.9286 14.75C11.1422 14.75 11.3457 14.6589 11.488 14.4995L15.0595 10.4995Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        <div>
                          <strong>
                            {"Paiements à venir"}
                          </strong>
                        </div>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-info-circle-outline shrink-0 text-[#b8b8b8]"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75Z"} fill={"currentColor"} />
                          <path d={"M12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z"} fill={"currentColor"} />
                          <path d={"M1.25 12C1.25 6.06294 6.06294 1.25 12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <span className={"platform-header-pill"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-history-outline"} style={{ "width": "13px", "height": "13px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                            <path d={"M5.07868 5.06897C8.87402 1.27899 15.0437 1.31929 18.8622 5.13784C22.6824 8.95803 22.7211 15.1313 18.9262 18.9263C15.1312 22.7212 8.95793 22.6825 5.13774 18.8623C2.87389 16.5984 1.93904 13.51 2.34047 10.5813C2.39672 10.1709 2.775 9.88383 3.18537 9.94008C3.59575 9.99633 3.88282 10.3746 3.82658 10.785C3.4866 13.2653 4.27782 15.8811 6.1984 17.8016C9.44288 21.0461 14.6664 21.0647 17.8655 17.8656C21.0646 14.6665 21.046 9.44298 17.8015 6.1985C14.5587 2.95568 9.33889 2.93545 6.13935 6.12963L6.88705 6.13339C7.30126 6.13547 7.63535 6.47294 7.63327 6.88715C7.63119 7.30136 7.29372 7.63545 6.87951 7.63337L4.33396 7.62058C3.92269 7.61851 3.58981 7.28562 3.58774 6.87436L3.57495 4.3288C3.57286 3.9146 3.90696 3.57713 4.32117 3.57505C4.73538 3.57296 5.07285 3.90706 5.07493 4.32127L5.07868 5.06897ZM11.9999 7.24998C12.4141 7.24998 12.7499 7.58577 12.7499 7.99998V11.6893L15.0302 13.9697C15.3231 14.2625 15.3231 14.7374 15.0302 15.0303C14.7373 15.3232 14.2624 15.3232 13.9696 15.0303L11.2499 12.3106V7.99998C11.2499 7.58577 11.5857 7.24998 11.9999 7.24998Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                          {"Contrôles actifs"}
                        </span>
                      </div>
                      <div className={"platform-payroll-tools"}>
                        <div role={"group"} data-slot={"avatar-group"} data-size={"xs"} className={"platform-header-avatars"} aria-label={"4 collaborateurs"}>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-ab.svg"} alt={"Adam Benali"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-am.svg"} alt={"Alice Morel"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar"}>
                            <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-ar.svg"} alt={"Anne-Marie Roux"} />
                            <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                              {"A"}
                            </span>
                          </span>
                          <span data-slot={"avatar-group-count"}>
                            {"+1"}
                            <span className={"sr-only"}>
                              {" collaborateur de plus"}
                            </span>
                          </span>
                        </div>
                        <button type={"button"} aria-label={"Partager"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-square-share-line-outline"} style={{ "width": "17px", "height": "17px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M10.7521 1.99364C10.7556 2.40784 10.4226 2.74646 10.0084 2.74997C8.29884 2.76447 7.03889 2.82006 6.06281 3.01125C5.10767 3.19835 4.47982 3.50532 3.99518 3.98996C3.42533 4.55981 3.09834 5.33078 2.92642 6.60954C2.75159 7.90987 2.75 9.61855 2.75 11.9974C2.75 14.3762 2.75159 16.0849 2.92642 17.3852C3.09834 18.664 3.42533 19.435 3.99518 20.0048C4.56503 20.5747 5.336 20.9017 6.61476 21.0736C7.91509 21.2484 9.62377 21.25 12.0026 21.25C14.3814 21.25 16.0901 21.2484 17.3905 21.0736C18.6692 20.9017 19.4402 20.5747 20.01 20.0048C20.4947 19.5202 20.8017 18.8923 20.9887 17.9372C21.1799 16.9611 21.2355 15.7012 21.25 13.9916C21.2535 13.5774 21.5922 13.2444 22.0064 13.2479C22.4206 13.2515 22.7535 13.5901 22.75 14.0043C22.7355 15.7087 22.6819 17.0968 22.4608 18.2255C22.2356 19.3752 21.8272 20.309 21.0707 21.0655C20.1757 21.9605 19.0354 22.3659 17.5903 22.5602C16.1785 22.75 14.369 22.75 12.06 22.75H11.9452C9.63623 22.75 7.82673 22.75 6.41488 22.5602C4.96979 22.3659 3.82952 21.9605 2.93452 21.0655C2.03952 20.1705 1.63408 19.0302 1.43979 17.5851C1.24998 16.1733 1.24999 14.3638 1.25 12.0548V11.94C1.24999 9.63101 1.24998 7.82151 1.43979 6.40967C1.63408 4.96458 2.03952 3.8243 2.93452 2.9293C3.69102 2.1728 4.62478 1.76443 5.77447 1.53923C6.90322 1.31813 8.29131 1.26448 9.99573 1.25003C10.4099 1.24652 10.7485 1.57944 10.7521 1.99364ZM16.4697 1.46967C16.7626 1.17678 17.2374 1.17678 17.5303 1.46967L22.5303 6.46967C22.8232 6.76256 22.8232 7.23744 22.5303 7.53033L17.5303 12.5303C17.2374 12.8232 16.7626 12.8232 16.4697 12.5303C16.1768 12.2374 16.1768 11.7626 16.4697 11.4697L20.1893 7.75H14C12.4485 7.75 11.5328 8.50701 11.212 8.82933L11.0199 9.02244L10.8293 9.21204C10.507 9.53279 9.75 10.4485 9.75 12V15C9.75 15.4142 9.41421 15.75 9 15.75C8.58579 15.75 8.25 15.4142 8.25 15V12C8.25 9.91622 9.27703 8.64063 9.77125 8.14881C9.77125 8.14881 9.77125 8.14881 9.77125 8.14881L9.96178 7.9592L10.1488 7.77125C10.6406 7.27703 11.9162 6.25 14 6.25H20.1893L16.4697 2.53033C16.1768 2.23744 16.1768 1.76256 16.4697 1.46967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                          {"Partager"}
                        </button>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <button type={"button"} aria-label={"Discussion"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-dialog-2-outline"} style={{ "width": "18px", "height": "18px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M13.3365 1.25H15.6634C16.8583 1.24999 17.8086 1.24999 18.5706 1.32244C19.352 1.39674 20.0127 1.55247 20.6012 1.91312C21.2067 2.28418 21.7158 2.79326 22.0868 3.39876C22.4475 3.9873 22.6032 4.64796 22.6775 5.42935C22.75 6.19141 22.75 7.14162 22.7499 8.33653V9.15226C22.75 10.0028 22.75 10.6794 22.7125 11.2279C22.6742 11.7891 22.5943 12.2709 22.4074 12.7221C21.9507 13.8247 21.0746 14.7008 19.972 15.1575C19.5929 15.3146 19.1887 15.397 18.7308 15.4419C18.7255 15.5812 18.7188 15.7137 18.7102 15.8397C18.6695 16.4357 18.5848 16.9436 18.3884 17.4178C17.9063 18.5817 16.9816 19.5064 15.8177 19.9885C15.2209 20.2357 14.5625 20.3081 13.7346 20.3346C13.2892 20.3489 13.0044 20.3587 12.7881 20.385C12.5837 20.41 12.5069 20.4433 12.4654 20.4679C12.4193 20.4951 12.3557 20.5451 12.2447 20.6979C12.1249 20.863 11.9891 21.0907 11.7742 21.4539L11.5147 21.8922C10.8378 23.0359 9.16217 23.0359 8.48523 21.8922L8.2258 21.4539C8.01082 21.0907 7.87511 20.863 7.75524 20.6979C7.64427 20.5451 7.58064 20.4951 7.53453 20.4679C7.49305 20.4433 7.41631 20.41 7.21182 20.3851C6.99552 20.3587 6.71078 20.3489 6.26533 20.3346C5.43745 20.3081 4.77912 20.2357 4.18225 19.9885C3.01837 19.5064 2.09367 18.5817 1.61157 17.4178C1.41517 16.9436 1.33047 16.4357 1.2898 15.8397C1.24999 15.2563 1.25 14.5361 1.25 13.6274V12.7613C1.24999 11.4848 1.24999 10.4732 1.32705 9.6627C1.40595 8.83288 1.57089 8.13673 1.94996 7.51814C2.34162 6.879 2.87899 6.34163 3.51813 5.94996C4.13672 5.57089 4.83287 5.40595 5.66269 5.32705C5.87363 5.30699 6.0982 5.29216 6.33751 5.28118C6.41754 4.56134 6.57708 3.94704 6.91307 3.39877C7.28412 2.79326 7.7932 2.28418 8.3987 1.91312C8.98723 1.55247 9.64789 1.39674 10.4293 1.32244C11.1913 1.24999 12.1416 1.24999 13.3365 1.25ZM7.85331 5.2512C8.1401 5.25 8.44243 5.25 8.7613 5.25H11.2387C12.5153 5.24999 13.5268 5.24999 14.3373 5.32705C15.1671 5.40595 15.8633 5.57089 16.4819 5.94996C17.121 6.34163 17.6584 6.879 18.05 7.51814C18.4291 8.13673 18.5941 8.83288 18.673 9.6627C18.75 10.4732 18.75 11.4847 18.75 12.7613V13.6274C18.75 13.7307 18.75 13.8316 18.7499 13.9301C19.0253 13.8944 19.2262 13.8428 19.398 13.7717C20.1331 13.4672 20.7171 12.8832 21.0216 12.1481C21.1201 11.9101 21.1829 11.6106 21.216 11.1258C21.2495 10.6343 21.2499 10.0089 21.2499 9.12503V8.37503C21.2499 7.13296 21.2492 6.25408 21.1842 5.57133C21.1204 4.89973 20.9998 4.49574 20.8079 4.18251C20.5605 3.77884 20.2211 3.43945 19.8174 3.19208C19.5042 3.00013 19.1002 2.87956 18.4286 2.81571C17.7459 2.75079 16.867 2.75 15.6249 2.75H13.3749C12.1329 2.75 11.254 2.75079 10.5713 2.81571C9.89967 2.87956 9.49568 3.00013 9.18245 3.19208C8.77879 3.43945 8.4394 3.77884 8.19203 4.18251C8.03147 4.44453 7.92229 4.76687 7.85331 5.2512ZM5.80467 6.82031C5.08465 6.88877 4.64517 7.01855 4.30188 7.22892C3.86458 7.4969 3.4969 7.86458 3.22892 8.30189C3.01855 8.64518 2.88877 9.08466 2.82031 9.80468C2.75079 10.5359 2.75 11.4761 2.75 12.8V13.6C2.75 14.5422 2.75041 15.2112 2.78632 15.7376C2.82178 16.2573 2.88931 16.5828 2.99739 16.8438C3.32725 17.6401 3.95994 18.2728 4.75628 18.6027C5.09046 18.7411 5.52102 18.81 6.31328 18.8354L6.34438 18.8364C6.74979 18.8493 7.1024 18.8606 7.39344 18.8961C7.70371 18.9339 8.00853 19.0055 8.29822 19.1768C8.58327 19.3454 8.78917 19.569 8.96888 19.8164C9.13514 20.0453 9.30644 20.3347 9.50062 20.6629L9.77606 21.1282C9.82147 21.2049 9.90074 21.25 9.99998 21.25C10.0992 21.25 10.1785 21.2049 10.2239 21.1282L10.4994 20.6628C10.6935 20.3347 10.8648 20.0453 11.0311 19.8164C11.2108 19.569 11.4167 19.3454 11.7018 19.1768C11.9914 19.0055 12.2963 18.9339 12.6065 18.8961C12.8976 18.8606 13.2502 18.8493 13.6556 18.8364L13.6867 18.8354C14.479 18.81 14.9095 18.7411 15.2437 18.6027C16.0401 18.2728 16.6728 17.6401 17.0026 16.8438C17.1107 16.5828 17.1782 16.2573 17.2137 15.7376C17.2496 15.2112 17.25 14.5422 17.25 13.6V12.8C17.25 11.4761 17.2492 10.5359 17.1797 9.80468C17.1112 9.08466 16.9814 8.64518 16.7711 8.30189C16.5031 7.86458 16.1354 7.4969 15.6981 7.22892C15.3548 7.01855 14.9154 6.88877 14.1953 6.82031C13.4641 6.75079 12.5239 6.75 11.2 6.75H8.8C7.47611 6.75 6.53585 6.75079 5.80467 6.82031Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                            <path d={"M7.5 13C7.5 13.5523 7.05229 14 6.5 14C5.94772 14 5.5 13.5523 5.5 13C5.5 12.4477 5.94772 12 6.5 12C7.05229 12 7.5 12.4477 7.5 13Z"} fill={"currentColor"} />
                            <path d={"M11 13C11 13.5523 10.5523 14 10 14C9.44772 14 9 13.5523 9 13C9 12.4477 9.44772 12 10 12C10.5523 12 11 12.4477 11 13Z"} fill={"currentColor"} />
                            <path d={"M14.5 13C14.5 13.5523 14.0523 14 13.5 14C12.9477 14 12.5 13.5523 12.5 13C12.5 12.4477 12.9477 12 13.5 12C14.0523 12 14.5 12.4477 14.5 13Z"} fill={"currentColor"} />
                          </svg>
                        </button>
                        <button type={"button"} aria-label={"Aide"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-question-circle-outline"} style={{ "width": "18px", "height": "18px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                            <path d={"M12 15C12.5523 15 13 15.4477 13 16C13 16.5523 12.5523 17 12 17C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15Z"} fill={"currentColor"} />
                            <path d={"M12 6.25C13.4497 6.25 14.625 7.42525 14.625 8.875C14.625 9.83834 14.1054 10.68 13.335 11.1357C13.1384 11.2521 12.9759 11.3793 12.8701 11.5039C12.7676 11.6248 12.75 11.7036 12.75 11.75V13C12.75 13.4142 12.4142 13.75 12 13.75C11.5858 13.75 11.25 13.4142 11.25 13V11.75C11.25 11.2442 11.4715 10.8338 11.7266 10.5332C11.9785 10.2363 12.2928 10.0095 12.5713 9.84473C12.9043 9.64773 13.125 9.28655 13.125 8.875C13.125 8.25368 12.6213 7.75 12 7.75C11.3787 7.75 10.875 8.25368 10.875 8.875C10.875 9.28921 10.5392 9.625 10.125 9.625C9.71079 9.625 9.375 9.28921 9.375 8.875C9.375 7.42525 10.5503 6.25 12 6.25Z"} fill={"currentColor"} />
                            <path d={"M12 1.25C17.9371 1.25 22.75 6.06294 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25ZM12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1086 2.75 12 2.75Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          </svg>
                        </button>
                        <button type={"button"} aria-label={"Plus d'options"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} width={"18"} height={"18"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={""}>
                            <path d={"M12 12V11.5M12 5V4.5M12 19V18.5M13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13C12.5523 13 13 12.5523 13 12ZM13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6C12.5523 6 13 5.55228 13 5ZM13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20C12.5523 20 13 19.5523 13 19Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                          </svg>
                        </button>
                        <span className={"platform-tool-divider"} aria-hidden={"true"} />
                        <button type={"button"} className={"platform-ask-ai"}>
                          <svg xmlns={"http://www.w3.org/2000/svg"} width={"17"} height={"17"} viewBox={"0 0 24 24"} fill={"none"} color={"currentColor"} className={""}>
                            <path d={"M12 21.5C17.2467 21.5 21.5 17.2467 21.5 12C21.5 6.75329 17.2467 2.5 12 2.5C6.75329 2.5 2.5 6.75329 2.5 12C2.5 13.3377 2.66372 14.5604 3.1189 15.6954C3.81756 17.4374 3.68195 18.9241 2.5 20.5C3.86146 21.1644 6 21 7 20.0725C8.45323 20.9748 10.1636 21.5 12 21.5Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                            <path d={"M12 10.125V12M12 12V13.875M12 12H10.5M12 12H13.5M15 12L13.6987 11.5662C13.1015 11.3672 12.6328 10.8985 12.4338 10.3013L12 9L11.5662 10.3013C11.3672 10.8985 10.8985 11.3672 10.3013 11.5662L9 12L10.3013 12.4338C10.8985 12.6328 11.3672 13.1015 11.5662 13.6987L12 15L12.4338 13.6987C12.6328 13.1015 13.1015 12.6328 13.6987 12.4338L15 12Z"} stroke={"currentColor"} strokeLinecap={"round"} strokeLinejoin={"round"} strokeWidth={"1.5"} />
                          </svg>
                          {"Demander à l'IA"}
                        </button>
                      </div>
                    </div>
                    <div className={"platform-payroll-filters"}>
                      <span className={"platform-payroll-filter"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-widget-2-bold text-[#3b82f6]"} aria-hidden={"true"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M2 6.63415C2 4.07478 4.07478 2 6.63415 2C9.19351 2 11.2683 4.07478 11.2683 6.63415C11.2683 9.19351 9.19351 11.2683 6.63415 11.2683C4.07478 11.2683 2 9.19351 2 6.63415Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M12.7317 17.3659C12.7317 14.8065 14.8065 12.7317 17.3659 12.7317C19.9252 12.7317 22 14.8065 22 17.3659C22 19.9252 19.9252 22 17.3659 22C14.8065 22 12.7317 19.9252 12.7317 17.3659Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                          <path d={"M2 17.5C2 15.3787 2 14.318 2.65901 13.659C3.31802 13 4.37868 13 6.5 13C8.62132 13 9.68198 13 10.341 13.659C11 14.318 11 15.3787 11 17.5C11 19.6213 11 20.682 10.341 21.341C9.68198 22 8.62132 22 6.5 22C4.37868 22 3.31802 22 2.65901 21.341C2 20.682 2 19.6213 2 17.5Z"} fill={"currentColor"} />
                          <path d={"M13 6.5C13 4.37868 13 3.31802 13.659 2.65901C14.318 2 15.3787 2 17.5 2C19.6213 2 20.682 2 21.341 2.65901C22 3.31802 22 4.37868 22 6.5C22 8.62132 22 9.68198 21.341 10.341C20.682 11 19.6213 11 17.5 11C15.3787 11 14.318 11 13.659 10.341C13 9.68198 13 8.62132 13 6.5Z"} fill={"currentColor"} />
                        </svg>
                        {"Toutes les sociétés"}
                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-down"} aria-hidden={"true"}>
                          <path d={"m6 9 6 6 6-6"} />
                        </svg>
                      </span>
                      <span className={"platform-payroll-filter"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-calendar-outline text-[#8c8c8c]"} aria-hidden={"true"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M17 14C17.5523 14 18 13.5523 18 13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13C16 13.5523 16.4477 14 17 14Z"} fill={"currentColor"} />
                          <path d={"M17 18C17.5523 18 18 17.5523 18 17C18 16.4477 17.5523 16 17 16C16.4477 16 16 16.4477 16 17C16 17.5523 16.4477 18 17 18Z"} fill={"currentColor"} />
                          <path d={"M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11.4477 12 12 12C12.5523 12 13 12.4477 13 13Z"} fill={"currentColor"} />
                          <path d={"M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17Z"} fill={"currentColor"} />
                          <path d={"M7 14C7.55229 14 8 13.5523 8 13C8 12.4477 7.55229 12 7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14Z"} fill={"currentColor"} />
                          <path d={"M7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z"} fill={"currentColor"} />
                          <path d={"M7 1.75C7.41421 1.75 7.75 2.08579 7.75 2.5V3.26272C8.412 3.24999 9.14133 3.24999 9.94346 3.25H14.0564C14.8586 3.24999 15.588 3.24999 16.25 3.26272V2.5C16.25 2.08579 16.5858 1.75 17 1.75C17.4142 1.75 17.75 2.08579 17.75 2.5V3.32709C18.0099 3.34691 18.2561 3.37182 18.489 3.40313C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33855 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V14.0564C22.75 15.8941 22.75 17.3498 22.5969 18.489C22.4392 19.6614 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6614 22.4392 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0565 22.75H9.94359C8.10585 22.75 6.65018 22.75 5.51098 22.5969C4.33856 22.4392 3.38961 22.1071 2.64124 21.3588C1.89288 20.6104 1.56076 19.6614 1.40314 18.489C1.24997 17.3498 1.24998 15.8942 1.25 14.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33855 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40313C5.7439 3.37182 5.99006 3.34691 6.25 3.32709V2.5C6.25 2.08579 6.58579 1.75 7 1.75ZM5.71085 4.88976C4.70476 5.02502 4.12511 5.27869 3.7019 5.7019C3.27869 6.12511 3.02502 6.70476 2.88976 7.71085C2.86685 7.88123 2.8477 8.06061 2.83168 8.25H21.1683C21.1523 8.06061 21.1331 7.88124 21.1102 7.71085C20.975 6.70476 20.7213 6.12511 20.2981 5.7019C19.8749 5.27869 19.2952 5.02502 18.2892 4.88976C17.2615 4.75159 15.9068 4.75 14 4.75H10C8.09318 4.75 6.73851 4.75159 5.71085 4.88976ZM2.75 12C2.75 11.146 2.75032 10.4027 2.76309 9.75H21.2369C21.2497 10.4027 21.25 11.146 21.25 12V14C21.25 15.9068 21.2484 17.2615 21.1102 18.2892C20.975 19.2952 20.7213 19.8749 20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25H10C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14V12Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                        </svg>
                        {"30 prochains jours"}
                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-down"} aria-hidden={"true"}>
                          <path d={"m6 9 6 6 6-6"} />
                        </svg>
                      </span>
                      <span className={"platform-payroll-filter"}>
                        <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-tuning-2-bold text-[#8c8c8c]"} aria-hidden={"true"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                          <path d={"M9.25 14C10.9069 14 12.25 15.3431 12.25 17C12.25 18.6569 10.9069 20 9.25 20C7.59315 20 6.25 18.6569 6.25 17C6.25 15.3431 7.59315 14 9.25 14Z"} fill={"currentColor"} />
                          <path d={"M14.25 4C12.5931 4 11.25 5.34315 11.25 7C11.25 8.65685 12.5931 10 14.25 10C15.9069 10 17.25 8.65685 17.25 7C17.25 5.34315 15.9069 4 14.25 4Z"} fill={"currentColor"} />
                          <path d={"M8.75 6.20852C9.16421 6.20852 9.5 6.54431 9.5 6.95852C9.5 7.37273 9.16421 7.70852 8.75 7.70852L1.75 7.70852C1.33579 7.70852 1 7.37273 1 6.95852C1 6.54431 1.33579 6.20852 1.75 6.20852H8.75Z"} fill={"currentColor"} />
                          <path d={"M14.75 16.2085C14.3358 16.2085 14 16.5443 14 16.9585C14 17.3727 14.3358 17.7085 14.75 17.7085H21.75C22.1642 17.7085 22.5 17.3727 22.5 16.9585C22.5 16.5443 22.1642 16.2085 21.75 16.2085H14.75Z"} fill={"currentColor"} />
                          <path d={"M1 16.9585C1 16.5443 1.33579 16.2085 1.75 16.2085H3.75C4.16421 16.2085 4.5 16.5443 4.5 16.9585C4.5 17.3727 4.16421 17.7085 3.75 17.7085H1.75C1.33579 17.7085 1 17.3727 1 16.9585Z"} fill={"currentColor"} />
                          <path d={"M21.75 6.20852C22.1642 6.20852 22.5 6.54431 22.5 6.95852C22.5 7.37273 22.1642 7.70852 21.75 7.70852L19.75 7.70852C19.3358 7.70852 19 7.37273 19 6.95852C19 6.54431 19.3358 6.20852 19.75 6.20852H21.75Z"} fill={"currentColor"} />
                        </svg>
                        {"Affichage"}
                        <svg xmlns={"http://www.w3.org/2000/svg"} width={"12"} height={"12"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-chevron-down"} aria-hidden={"true"}>
                          <path d={"m6 9 6 6 6-6"} />
                        </svg>
                      </span>
                    </div>
                    <div className={"w-full overflow-hidden border-border bg-background text-sm platform-data-table border-0"}>
                      <div className={"overflow-auto"} style={{ "height": "265px" } as CSSProperties}>
                        <table className={"border-collapse"} style={{ "tableLayout": "fixed", "minWidth": "max(100%, 256px)" } as CSSProperties}>
                          <colgroup>
                            <col style={{ "width": "40%" } as CSSProperties} />
                            <col style={{ "width": "22%" } as CSSProperties} />
                            <col style={{ "width": "17%" } as CSSProperties} />
                            <col />
                            <col />
                          </colgroup>
                          <thead>
                            <tr style={{ "height": "44px" } as CSSProperties}>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "44px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <span className={"min-w-0 flex-1 truncate px-4 text-left"}>
                                    <span className={"inline-flex items-center gap-1.5"}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-document-text-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                        <path d={"M10.9436 1.25H13.0564C14.8942 1.24998 16.3498 1.24997 17.489 1.40314C18.6614 1.56076 19.6104 1.89288 20.3588 2.64124C21.1071 3.38961 21.4392 4.33856 21.5969 5.51098C21.75 6.65019 21.75 8.10583 21.75 9.94359V14.0564C21.75 15.8942 21.75 17.3498 21.5969 18.489C21.4392 19.6614 21.1071 20.6104 20.3588 21.3588C19.6104 22.1071 18.6614 22.4392 17.489 22.5969C16.3498 22.75 14.8942 22.75 13.0564 22.75H10.9436C9.10583 22.75 7.65019 22.75 6.51098 22.5969C5.33856 22.4392 4.38961 22.1071 3.64124 21.3588C2.89288 20.6104 2.56076 19.6614 2.40314 18.489C2.24997 17.3498 2.24998 15.8942 2.25 14.0564V9.94358C2.24998 8.10582 2.24997 6.65019 2.40314 5.51098C2.56076 4.33856 2.89288 3.38961 3.64124 2.64124C4.38961 1.89288 5.33856 1.56076 6.51098 1.40314C7.65019 1.24997 9.10582 1.24998 10.9436 1.25ZM6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V14C3.75 15.9068 3.75159 17.2615 3.88976 18.2892C4.02502 19.2952 4.27869 19.8749 4.7019 20.2981C5.12511 20.7213 5.70476 20.975 6.71085 21.1102C7.73851 21.2484 9.09318 21.25 11 21.25H13C14.9068 21.25 16.2615 21.2484 17.2892 21.1102C18.2952 20.975 18.8749 20.7213 19.2981 20.2981C19.7213 19.8749 19.975 19.2952 20.1102 18.2892C20.2484 17.2615 20.25 15.9068 20.25 14V10C20.25 8.09318 20.2484 6.73851 20.1102 5.71085C19.975 4.70476 19.7213 4.12511 19.2981 3.7019C18.8749 3.27869 18.2952 3.02502 17.2892 2.88976C16.2615 2.75159 14.9068 2.75 13 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976ZM7.25 8C7.25 7.58579 7.58579 7.25 8 7.25H16C16.4142 7.25 16.75 7.58579 16.75 8C16.75 8.41421 16.4142 8.75 16 8.75H8C7.58579 8.75 7.25 8.41421 7.25 8ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4142 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4142 7.25 12ZM7.25 16C7.25 15.5858 7.58579 15.25 8 15.25H13C13.4142 15.25 13.75 15.5858 13.75 16C13.75 16.4142 13.4142 16.75 13 16.75H8C7.58579 16.75 7.25 16.4142 7.25 16Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                                      </svg>
                                      {"Facture"}
                                    </span>
                                  </span>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "44px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <span className={"min-w-0 flex-1 truncate px-4 text-left"}>
                                    <span className={"inline-flex items-center gap-1.5"}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-buildings-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                        <path d={"M14.948 1.25H17.052C17.9505 1.24997 18.6997 1.24995 19.2945 1.32991C19.9223 1.41432 20.4891 1.59999 20.9445 2.05546C21.4 2.51093 21.5857 3.07773 21.6701 3.70552C21.7501 4.30031 21.75 5.04953 21.75 5.94801V21.25H22C22.4142 21.25 22.75 21.5858 22.75 22C22.75 22.4142 22.4142 22.75 22 22.75H2C1.58579 22.75 1.25 22.4142 1.25 22C1.25 21.5858 1.58579 21.25 2 21.25H2.25L2.25 8.948C2.24997 8.04952 2.24994 7.3003 2.32991 6.70552C2.41432 6.07773 2.59999 5.51093 3.05546 5.05546C3.51093 4.59999 4.07773 4.41432 4.70552 4.32991C5.3003 4.24995 6.04952 4.24997 6.948 4.25L10.278 4.25C10.3294 3.37583 10.4906 2.62032 11.0555 2.05546C11.5109 1.59999 12.0777 1.41432 12.7055 1.32991C13.3003 1.24995 14.0495 1.24997 14.948 1.25ZM11.0068 5.75C11.0055 5.75 11.0043 5.75 11.003 5.75C11.002 5.75 11.001 5.75 11 5.75H7C6.03599 5.75 5.38843 5.7516 4.90539 5.81654C4.44393 5.87858 4.24643 5.9858 4.11612 6.11612C3.9858 6.24644 3.87858 6.44393 3.81654 6.90539C3.75159 7.38843 3.75 8.03599 3.75 9V21.25H8.25V19C8.25 18.5858 8.58579 18.25 9 18.25C9.41421 18.25 9.75 18.5858 9.75 19V21.25H14.25V9C14.25 8.03599 14.2484 7.38843 14.1835 6.90539C14.1214 6.44393 14.0142 6.24644 13.8839 6.11612C13.7536 5.9858 13.5561 5.87858 13.0946 5.81654C12.6127 5.75175 11.9671 5.75001 11.0068 5.75ZM15.75 21.25L15.75 8.94801C15.75 8.04953 15.7501 7.30031 15.6701 6.70552C15.5857 6.07773 15.4 5.51093 14.9445 5.05546C14.4891 4.59999 13.9223 4.41432 13.2945 4.32991C12.8691 4.27273 12.3648 4.25645 11.7834 4.25183C11.8335 3.55219 11.9436 3.28863 12.1161 3.11612C12.2464 2.9858 12.4439 2.87858 12.9054 2.81654C13.3884 2.7516 14.036 2.75 15 2.75H17C17.964 2.75 18.6116 2.7516 19.0946 2.81654C19.5561 2.87858 19.7536 2.9858 19.8839 3.11612C20.0142 3.24644 20.1214 3.44393 20.1835 3.90539C20.2484 4.38843 20.25 5.03599 20.25 6V21.25H15.75ZM5.25 8C5.25 7.58579 5.58579 7.25 6 7.25H12C12.4142 7.25 12.75 7.58579 12.75 8C12.75 8.41422 12.4142 8.75 12 8.75H6C5.58579 8.75 5.25 8.41422 5.25 8ZM5.25 11C5.25 10.5858 5.58579 10.25 6 10.25H12C12.4142 10.25 12.75 10.5858 12.75 11C12.75 11.4142 12.4142 11.75 12 11.75H6C5.58579 11.75 5.25 11.4142 5.25 11ZM5.25 14C5.25 13.5858 5.58579 13.25 6 13.25H12C12.4142 13.25 12.75 13.5858 12.75 14C12.75 14.4142 12.4142 14.75 12 14.75H6C5.58579 14.75 5.25 14.4142 5.25 14Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                                      </svg>
                                      {"Nature"}
                                    </span>
                                  </span>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "44px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <span className={"min-w-0 flex-1 truncate px-4 text-left"}>
                                    <span className={"inline-flex items-center gap-1.5"}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-user-rounded-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                        <path d={"M12 1.25C9.37665 1.25 7.25 3.37665 7.25 6C7.25 8.62335 9.37665 10.75 12 10.75C14.6234 10.75 16.75 8.62335 16.75 6C16.75 3.37665 14.6234 1.25 12 1.25ZM8.75 6C8.75 4.20507 10.2051 2.75 12 2.75C13.7949 2.75 15.25 4.20507 15.25 6C15.25 7.79493 13.7949 9.25 12 9.25C10.2051 9.25 8.75 7.79493 8.75 6Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                                        <path d={"M12 12.25C9.96067 12.25 8.07752 12.7208 6.67815 13.5204C5.3 14.3079 4.25 15.5101 4.25 17C4.25 18.4899 5.3 19.6921 6.67815 20.4796C8.07752 21.2792 9.96067 21.75 12 21.75C14.0393 21.75 15.9225 21.2792 17.3219 20.4796C18.7 19.6921 19.75 18.4899 19.75 17C19.75 15.5101 18.7 14.3079 17.3219 13.5204C15.9225 12.7208 14.0393 12.25 12 12.25ZM5.75 17C5.75 16.2807 6.26701 15.483 7.42236 14.8228C8.55649 14.1747 10.1733 13.75 12 13.75C13.8267 13.75 15.4435 14.1747 16.5776 14.8228C17.733 15.483 18.25 16.2807 18.25 17C18.25 17.7193 17.733 18.517 16.5776 19.1772C15.4435 19.8253 13.8267 20.25 12 20.25C10.1733 20.25 8.55649 19.8253 7.42236 19.1772C6.26701 18.517 5.75 17.7193 5.75 17Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                                      </svg>
                                      {"Valideur"}
                                    </span>
                                  </span>
                                </div>
                              </th>
                              <th className={"group sticky top-0 z-10 border-border border-b bg-muted p-0 font-medium text-muted-foreground data-[drop=true]:before:absolute data-[drop=true]:before:inset-y-0 data-[drop=true]:before:left-0 data-[drop=true]:before:w-0.5 data-[drop=true]:before:bg-primary data-[dropend=true]:after:absolute data-[dropend=true]:after:inset-y-0 data-[dropend=true]:after:right-0 data-[dropend=true]:after:w-0.5 data-[dropend=true]:after:bg-primary"}>
                                <div className={"flex h-full items-center justify-start"} style={{ "height": "44px", "opacity": "1", "transform": "none" } as CSSProperties}>
                                  <span className={"min-w-0 flex-1 truncate px-4 text-left"}>
                                    <span className={"inline-flex items-center gap-1.5"}>
                                      <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-circle-dashed-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                                        <path d={"M19.6019 4.39914C20.1041 4.90138 20.5465 5.44177 20.9291 6.01085C21.1601 6.35456 21.069 6.82039 20.7254 7.05148C20.3818 7.28249 19.9159 7.19121 19.6848 6.84777C19.3559 6.35864 18.9746 5.8932 18.5412 5.4598C18.1078 5.0264 17.6424 4.64515 17.1533 4.31628C16.8095 4.08518 16.7178 3.61871 16.9489 3.27495C17.1799 2.93139 17.6458 2.84041 17.9895 3.07124C18.5587 3.45389 19.0996 3.89683 19.6019 4.39914Z"} fill={"currentColor"} />
                                        <path d={"M22.75 12.0005C22.75 12.7107 22.6807 13.4057 22.5488 14.0786C22.4691 14.485 22.0753 14.75 21.6689 14.6704C21.2626 14.5908 20.9978 14.1968 21.0771 13.7905C21.1905 13.2121 21.25 12.6134 21.25 12.0005C21.25 11.3876 21.1905 10.7889 21.0771 10.2104C20.9975 9.80397 21.2625 9.40925 21.6689 9.32959C22.0753 9.25004 22.469 9.51514 22.5488 9.92139C22.6807 10.5944 22.75 11.2901 22.75 12.0005Z"} fill={"currentColor"} />
                                        <path d={"M19.6009 19.6019C19.0986 20.1041 18.5582 20.5465 17.9892 20.9291C17.6454 21.1601 17.1796 21.069 16.9485 20.7254C16.7175 20.3818 16.8088 19.9159 17.1522 19.6848C17.6414 19.3559 18.1068 18.9746 18.5402 18.5412C18.9736 18.1078 19.3549 17.6424 19.6837 17.1533C19.9148 16.8095 20.3813 16.7178 20.725 16.9489C21.0686 17.1799 21.1596 17.6458 20.9288 17.9895C20.5461 18.5587 20.1032 19.0996 19.6009 19.6019Z"} fill={"currentColor"} />
                                        <path d={"M11.9995 22.75C11.2893 22.75 10.5943 22.6807 9.92139 22.5488C9.51502 22.4691 9.25001 22.0753 9.32959 21.6689C9.40922 21.2626 9.80315 20.9978 10.2095 21.0771C10.7879 21.1905 11.3866 21.25 11.9995 21.25C12.6124 21.25 13.2111 21.1905 13.7896 21.0771C14.196 20.9975 14.5908 21.2625 14.6704 21.6689C14.75 22.0753 14.4849 22.469 14.0786 22.5488C13.4056 22.6807 12.7099 22.75 11.9995 22.75Z"} fill={"currentColor"} />
                                        <path d={"M4.39811 19.6009C3.89591 19.0986 3.45348 18.5582 3.0709 17.9892C2.83993 17.6454 2.93097 17.1796 3.27461 16.9485C3.61823 16.7175 4.08406 16.8088 4.31524 17.1522C4.64408 17.6414 5.02541 18.1068 5.45877 18.5402C5.89217 18.9736 6.35759 19.3549 6.84674 19.6837C7.1905 19.9148 7.28224 20.3813 7.05114 20.725C6.82008 21.0686 6.35419 21.1596 6.01051 20.9288C5.44133 20.5461 4.90042 20.1032 4.39811 19.6009Z"} fill={"currentColor"} />
                                        <path d={"M1.25 11.9995C1.25003 11.2893 1.3193 10.5943 1.45117 9.92139C1.53089 9.51503 1.92466 9.25001 2.33105 9.32959C2.73738 9.40922 3.00222 9.80315 2.92285 10.2095C2.8095 10.7879 2.75003 11.3866 2.75 11.9995C2.75 12.6124 2.80951 13.2111 2.92285 13.7896C3.00251 14.196 2.73754 14.5908 2.33105 14.6704C1.92474 14.75 1.53097 14.4849 1.45117 14.0786C1.31927 13.4056 1.25 12.7099 1.25 11.9995Z"} fill={"currentColor"} />
                                        <path d={"M4.39914 4.39811C4.90138 3.89591 5.44177 3.45348 6.01085 3.0709C6.35456 2.83993 6.82039 2.93097 7.05148 3.27461C7.28249 3.61823 7.19121 4.08406 6.84777 4.31525C6.35864 4.64408 5.8932 5.02541 5.4598 5.45877C5.0264 5.89217 4.64515 6.35759 4.31628 6.84674C4.08518 7.1905 3.61871 7.28224 3.27495 7.05114C2.93139 6.82008 2.84041 6.35419 3.07124 6.01051C3.45389 5.44133 3.89683 4.90042 4.39914 4.39811Z"} fill={"currentColor"} />
                                        <path d={"M12.0005 1.25C12.7107 1.25003 13.4057 1.3193 14.0786 1.45117C14.485 1.53089 14.75 1.92466 14.6704 2.33105C14.5908 2.73738 14.1968 3.00222 13.7905 2.92285C13.2121 2.8095 12.6134 2.75003 12.0005 2.75C11.3876 2.75 10.7889 2.80951 10.2104 2.92285C9.80397 3.00251 9.40925 2.73754 9.32959 2.33105C9.25004 1.92474 9.51514 1.53097 9.92139 1.45117C10.5944 1.31927 11.2901 1.25 12.0005 1.25Z"} fill={"currentColor"} />
                                      </svg>
                                      {"Statut"}
                                    </span>
                                  </span>
                                </div>
                              </th>
                              <th aria-hidden={"true"} className={"sticky top-0 z-10 border-border border-b bg-muted"} />
                            </tr>
                          </thead>
                          <tbody>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "44px" } as CSSProperties}>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2.5"}>
                                  <span className={"platform-date"}>
                                    <small>
                                      {"DÉC"}
                                    </small>
                                    {"07"}
                                  </span>
                                  <span className={"truncate"}>
                                    {"Loyer · SCI des Quais"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Charge fixe"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-am.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Alice"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête à payer"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "44px" } as CSSProperties}>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2.5"}>
                                  <span className={"platform-date"}>
                                    <small>
                                      {"DÉC"}
                                    </small>
                                    {"07"}
                                  </span>
                                  <span className={"truncate"}>
                                    {"Fournitures · Papeteries Dumas"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Achats"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-ab.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Adam"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  "}>
                                  <i />
                                  {"Prête à payer"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "44px" } as CSSProperties}>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2.5"}>
                                  <span className={"platform-date"}>
                                    <small>
                                      {"DÉC"}
                                    </small>
                                    {"15"}
                                  </span>
                                  <span className={"truncate"}>
                                    {"Véhicules · Loca Pro"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Location"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-pg.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Paul"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  is-muted"}>
                                  <i />
                                  {"À valider"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "44px" } as CSSProperties}>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2.5"}>
                                  <span className={"platform-date"}>
                                    <small>
                                      {"DÉC"}
                                    </small>
                                    {"20"}
                                  </span>
                                  <span className={"truncate"}>
                                    {"Assurance · Axelia"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Charge fixe"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-rl.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Rémi"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status  is-muted"}>
                                  <i />
                                  {"À valider"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                            <tr data-selected={"false"} className={"border-border/60 border-b transition-colors data-[selected=true]:bg-muted/60 hover:bg-muted/50"} style={{ "height": "44px" } as CSSProperties}>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2.5"}>
                                  <span className={"platform-date"}>
                                    <small>
                                      {"DÉC"}
                                    </small>
                                    {"31"}
                                  </span>
                                  <span className={"truncate"}>
                                    {"Entretien · Net Service"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                {"Charge fixe"}
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"flex items-center gap-2"}>
                                  <img alt={""} loading={"lazy"} width={"24"} height={"24"} decoding={"async"} data-nimg={"1"} className={"platform-avatar object-cover object-top"} src={"/accueil-sx/avatar-mm.svg"} style={{ "color": "transparent" } as CSSProperties} />
                                  <span className={"truncate"}>
                                    {"Maya"}
                                  </span>
                                </span>
                              </td>
                              <td className={"truncate px-4 text-foreground text-left"}>
                                <span className={"platform-status is-warning "}>
                                  <i />
                                  {"2 pièces manquantes"}
                                </span>
                              </td>
                              <td aria-hidden={"true"} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className={"platform-agent platform-payroll-review platform-shared-review "}>
                      <div className={"pointer-events-none absolute inset-0"} aria-hidden={"true"}>
                        <RubanFibre variante="droit" />
                      </div>
                      <div className={"platform-shared-review-content"}>
                        <div className={"platform-agent-label"}>
                          <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                            <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"currentColor"} />
                          </svg>
                          {" RIB modifié détecté"}
                        </div>
                        <div className={"platform-agent-note"}>
                          <p>
                            {"Le RIB de la facture Loca Pro diffère de celui de la fiche. En 12 mois, aucun paiement vers ce compte : "}
                            <strong>
                              {"2 140 € suspendus."}
                            </strong>
                          </p>
                          <div className={"platform-tags"}>
                            <span className={"platform-status  "}>
                              <i />
                              {"Contrôles actifs"}
                            </span>
                            <span className={"platform-status  "}>
                              <i />
                              {"12 mois comparés"}
                            </span>
                          </div>
                        </div>
                        <div className={"platform-actions"}>
                          <button type={"button"} aria-expanded={"false"}>
                            {"Voir le détail"}
                            <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-arrow-right-up-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                              <path d={"M9 6.75C8.58579 6.75 8.25 6.41421 8.25 6C8.25 5.58579 8.58579 5.25 9 5.25H18C18.4142 5.25 18.75 5.58579 18.75 6V15C18.75 15.4142 18.4142 15.75 18 15.75C17.5858 15.75 17.25 15.4142 17.25 15V7.81066L6.53033 18.5303C6.23744 18.8232 5.76256 18.8232 5.46967 18.5303C5.17678 18.2374 5.17678 17.7626 5.46967 17.4697L16.1893 6.75H9Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                            </svg>
                          </button>
                          <button type={"button"} className={"is-primary platform-approve"}>
                            <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                              <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                            </svg>
                            {"Vérifier le RIB"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
            <span id={"platform-insights"} className={"platform-scroll-anchor"} />
            <article data-platform-panel={"true"} data-gutter-guide={"bottom"} className={"platform-panel"} style={{ "zIndex": "5" } as CSSProperties}>
              <div className={"platform-panel-copy"} data-gutter-guide={"top"}>
                <p>
                  {"Posez vos questions sur la trésorerie, les ventes ou les marges en langage courant. Chaque réponse montre les chiffres et le calcul sur lesquels elle repose."}
                </p>
              </div>
              <div className={"platform-illustration"} data-gutter-guide={"top"}>
                <div className={"platform-insights"}>
                  <div className={"platform-question"}>
                    <div className={"platform-question-body"}>
                      <span className={"platform-question-meta"}>
                        <strong>
                          {"Alice"}
                        </strong>
                        {" a demandé à "}
                        <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                          <defs>
                            <linearGradient id={"_R_3aqmhdavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                              <stop offset={"0"} stopColor={"#2D00F7"} />
                              <stop offset={"0.2"} stopColor={"#F4001D"} />
                              <stop offset={"0.4"} stopColor={"#F21A00"} />
                              <stop offset={"0.6"} stopColor={"#DD3700"} />
                              <stop offset={"0.8"} stopColor={"#F06A00"} />
                              <stop offset={"1"} stopColor={"#F28900"} />
                            </linearGradient>
                          </defs>
                          <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_3aqmhdavb_)"} />
                        </svg>
                        {" Omega"}
                        <span aria-hidden={"true"}>
                          {"·"}
                        </span>
                        <time>
                          {"À l'instant"}
                        </time>
                      </span>
                      <p>
                        {"Peut-on payer les charges de novembre sans toucher à la réserve de 532,4 k€ ?"}
                      </p>
                    </div>
                    <span data-slot={"avatar"} className={"platform-requester-avatar"}>
                      <img data-slot={"avatar-image"} src={"/accueil-sx/avatar-am.svg"} alt={""} />
                      <span data-slot={"avatar-fallback"} aria-hidden={"true"}>
                        {"A"}
                      </span>
                    </span>
                  </div>
                  <div className={"platform-answer"}>
                    <span className={"platform-answer-avatar"} aria-hidden={"true"}>
                      <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                        <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"currentColor"} />
                      </svg>
                    </span>
                    <div className={"platform-answer-body"}>
                      <span className={"platform-question-meta"}>
                        <strong>
                          {"Omega"}
                        </strong>
                        {" a répondu à "}
                        <strong>
                          {"Alice"}
                        </strong>
                        <span aria-hidden={"true"}>
                          {"·"}
                        </span>
                        <time>
                          {"À l'instant"}
                        </time>
                      </span>
                      <p className={"platform-answer-text"}>
                        {"Oui. Les acomptes reçus, les factures encaissées et les abonnements du mois couvrent les "}
                        <strong>
                          {"68,4 k€ à payer"}
                        </strong>
                        {", et la réserve de 532,4 k€ reste intacte."}
                      </p>
                      <div data-slot={"chart-card"} data-charts={""} className={"relative flex flex-col overflow-hidden font-rounded text-fg-loud antialiased w-full gap-0 rounded-2xl bg-surface-disable p-0.5 shadow-[0_1px_2px_rgb(40_40_40/0.08),0_0_0_1px_var(--border-soft)] platform-allocation-chart"} role={"group"} aria-label={"Trésorerie de novembre"}>
                        <div className={"flex items-center justify-between gap-20 p-3"}>
                          <div className={"flex min-w-0 flex-1 items-center gap-3"}>
                            <span data-slot={"chart-icon-tile"} className={"relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[13.2px] bg-primary-blue-500 text-fg-white [&_svg]:size-6 shadow-[0_8.8px_7.92px_-6.6px_rgb(0_0_0/0.16),0_4.4px_7.92px_rgb(1_1_1/0.08)]"}>
                              <span aria-hidden={"true"} className={"absolute inset-x-0 -top-[19.8px] h-[37.4px] bg-linear-to-b/srgb from-white/60 to-white/0"} />
                              <span className={"relative flex"}>
                                <svg width={"16"} height={"16"} viewBox={"0 0 16 16"} fill={"currentColor"} aria-hidden={"true"} data-slot={"icon"}>
                                  <path d={"M7.33366 1.86379C7.33366 1.46904 7.33366 1.27167 7.2367 1.11213C7.15933 0.984813 7.00432 0.86435 6.86184 0.820805C6.6833 0.766241 6.51692 0.808634 6.18415 0.89342C3.01253 1.70152 0.666992 4.5769 0.666992 8.00012C0.666992 12.0502 3.95024 15.3334 8.00033 15.3334C8.95689 15.3334 9.87067 15.1503 10.7085 14.8172C11.0274 14.6904 11.1868 14.627 11.2993 14.4779C11.389 14.3589 11.4436 14.1703 11.4314 14.0218C11.4161 13.8357 11.3001 13.676 11.0681 13.3567L7.46549 8.39817C7.38268 8.28708 7.33366 8.14932 7.33366 8.00012V1.86379Z"} />
                                  <path d={"M14.1367 8.66678C14.5314 8.66678 14.7288 8.66678 14.8883 8.76373C15.0156 8.84111 15.1361 8.9961 15.1796 9.13859C15.2342 9.31712 15.1918 9.48343 15.1071 9.81605C14.8352 10.8835 14.3291 11.8573 13.6467 12.6797C13.427 12.9446 13.3171 13.077 13.1406 13.1379C12.9996 13.1865 12.8035 13.1802 12.666 13.1226C12.4937 13.0505 12.3775 12.8906 12.1452 12.5709L9.92399 9.5136C9.72545 9.24034 9.62619 9.10371 9.62977 8.98965C9.63289 8.89035 9.68014 8.79762 9.75864 8.73673C9.84881 8.66678 10.0177 8.66678 10.3555 8.66678H14.1367Z"} />
                                  <path d={"M8.66699 1.86379C8.66699 1.46904 8.66699 1.27167 8.76395 1.11213C8.84132 0.984815 8.99633 0.864352 9.13881 0.820807C9.31735 0.766242 9.48372 0.808633 9.81648 0.893414C12.4073 1.55352 14.4469 3.59313 15.107 6.18397C15.1918 6.51672 15.2342 6.6831 15.1796 6.86164C15.1361 7.00412 15.0156 7.15912 14.8883 7.2365C14.7288 7.33345 14.5314 7.33345 14.1367 7.33345L9.20033 7.33345C9.01364 7.33345 8.9203 7.33345 8.849 7.29712C8.78627 7.26516 8.73528 7.21417 8.70332 7.15145C8.66699 7.08014 8.66699 6.9868 8.66699 6.80012V1.86379Z"} />
                                </svg>
                              </span>
                              <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_-4.4px_5.94px_rgb(0_0_0/0.08)]"} />
                              <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent bg-linear-to-b/srgb from-primary-blue-400 to-primary-blue-600 bg-origin-border [mask:linear-gradient(#000_0_0)_padding-box_exclude,linear-gradient(#000_0_0)]"} />
                            </span>
                            <div data-slot={"budget-flow-chart-heading"} className={"flex min-w-0 flex-1 flex-col items-start gap-1.5"}>
                              <p className={"typo-heading-01-semibold -my-0.5 w-full truncate py-0.5 text-fg-loud"}>
                                {"Trésorerie de novembre / "}
                                <span className={"text-fg-soft"}>
                                  {"k€"}
                                </span>
                              </p>
                              <p className={"typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-soft"}>
                                {"Les encaissements du mois, affectés aux paiements à venir"}
                              </p>
                            </div>
                          </div>
                          <button type={"button"} data-slot={"chart-button"} data-variant={"secondary"} className={"relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 typo-label-03-medium whitespace-nowrap outline-none select-none transition-colors duration-200 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 bg-surface-white text-fg-loud [&_svg]:text-icon-soft shadow-[0_1px_2px_rgb(40_40_40/0.08),0_0_0_1px_#ececec] hover:bg-[color-mix(in_srgb,var(--surface-white),#000_12%)] data-[state=open]:bg-[color-mix(in_srgb,var(--surface-white),#000_12%)] rounded-full size-9 p-0 focus-visible:ring-primary-blue-500/40"} aria-label={"Plus d'options"}>
                            <svg width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} data-slot={"icon"}>
                              <path d={"M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM20 12C20 12.5523 19.5523 13 19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12ZM6 12C6 12.5523 5.55228 13 5 13C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12Z"} />
                            </svg>
                          </button>
                        </div>
                        <div className={"flex flex-wrap items-end gap-6 overflow-hidden rounded-[14px] bg-surface-white p-6 shadow-[0_1px_2px_rgb(40_40_40/0.08),0_0_0_1px_var(--border-soft)]"}>
                          <div className={"flex w-56 shrink-0 flex-col gap-[60px]"}>
                            <div className={"flex flex-col items-start gap-6"}>
                              <div data-slot={"budget-flow-chart-stat"} className={"flex max-w-full flex-col items-start gap-2.5"}>
                                <p className={"typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-normal"}>
                                  {"Affecté"}
                                </p>
                                <span data-count={"68400"} data-kind={"money"} className={"typo-heading-04-semibold hug-w whitespace-nowrap text-fg-loud"}>
                                  {"68,40 k€"}
                                </span>
                              </div>
                              <div data-slot={"budget-flow-chart-stat"} className={"flex max-w-full flex-col items-start gap-2.5"}>
                                <p className={"typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-normal"}>
                                  {"Réserve conservée"}
                                </p>
                                <span data-count={"532400"} data-kind={"money"} className={"typo-heading-04-semibold hug-w whitespace-nowrap text-fg-loud"}>
                                  {"532,40 k€"}
                                </span>
                              </div>
                            </div>
                            <div className={"flex flex-col items-start gap-4 py-1"}>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-200 [--dot-ring:var(--primary-blue-200)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_16dtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_16dtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Acomptes reçus"}
                                </span>
                              </button>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-orange-200 [--dot-ring:var(--primary-orange-300)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_1adtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_1adtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Factures encaissées"}
                                </span>
                              </button>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-purple-500 [--dot-ring:var(--primary-purple-500)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_1edtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_1edtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Abonnements"}
                                </span>
                              </button>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-yellow-500 [--dot-ring:var(--primary-yellow-500)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_1idtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_1idtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Loyers"}
                                </span>
                              </button>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-orange-500 [--dot-ring:var(--primary-orange-600)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_1mdtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_1mdtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Fournisseurs"}
                                </span>
                              </button>
                              <button type={"button"} aria-pressed={"true"} data-slot={"budget-flow-chart-legend-item"} className={"group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"}>
                                <span aria-hidden={"true"} data-slot={"chart-legend-dot"} className={"relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-500 [--dot-ring:var(--primary-blue-500)]"}>
                                  <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                    <defs>
                                      <linearGradient id={"chart-legend-dot-_R_1qdtamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                        <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                        <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                      </linearGradient>
                                    </defs>
                                    <circle cx={"7"} cy={"7"} r={"6.5"} fill={"none"} stroke={"url(#chart-legend-dot-_R_1qdtamhdavb_)"} strokeWidth={"1"} />
                                  </svg>
                                </span>
                                <span className={"typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200 text-fg-normal group-hover/legend:text-fg-loud"}>
                                  {"Salaires"}
                                </span>
                              </button>
                            </div>
                          </div>
                          <div className={"flex min-w-0 flex-1 basis-[420px]"} style={{ "height": "352px" } as CSSProperties}>
                            <div aria-hidden={"true"} data-side={"from"} className={"relative w-[72px] shrink-0"}>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"0"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-2.5 pointer-events-auto bg-primary-blue-200 [--bar-ring:var(--primary-blue-200)]"} style={{ "top": "0", "height": "157.193px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.47"} data-kind={"share"}>
                                      {"47 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
                                </div>
                              </div>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"1"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-2.5 pointer-events-auto bg-primary-orange-200 [--bar-ring:var(--primary-orange-300)]"} style={{ "top": "161.193px", "height": "123.86px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.36"} data-kind={"share"}>
                                      {"36 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
                                </div>
                              </div>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"2"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-2.5 pointer-events-auto bg-primary-purple-500 [--bar-ring:var(--primary-purple-500)]"} style={{ "top": "289.053px", "height": "62.947px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.17"} data-kind={"share"}>
                                      {"17 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
                                </div>
                              </div>
                            </div>
                            <div data-slot={"budget-flow-chart-plot"} className={"relative min-w-0 flex-1"}>
                              <svg aria-hidden={"true"} className={"absolute inset-0 size-full overflow-visible"}>
                                <defs>
                                  <linearGradient id={"_R_tamhdavb_-band-0"} gradientUnits={"userSpaceOnUse"} x1={"0"} y1={"0"} x2={"436"} y2={"0"}>
                                    <stop offset={"0"} style={{ "stopColor": "var(--primary-purple-50)" } as CSSProperties} />
                                    <stop offset={"1"} style={{ "stopColor": "var(--primary-yellow-300)" } as CSSProperties} />
                                  </linearGradient>
                                  <linearGradient id={"_R_tamhdavb_-band-1"} gradientUnits={"userSpaceOnUse"} x1={"0"} y1={"0"} x2={"436"} y2={"0"}>
                                    <stop offset={"0"} style={{ "stopColor": "var(--primary-orange-50)" } as CSSProperties} />
                                    <stop offset={"1"} style={{ "stopColor": "var(--primary-orange-300)" } as CSSProperties} />
                                  </linearGradient>
                                  <linearGradient id={"_R_tamhdavb_-band-2"} gradientUnits={"userSpaceOnUse"} x1={"0"} y1={"0"} x2={"436"} y2={"0"}>
                                    <stop offset={"0"} style={{ "stopColor": "var(--primary-purple-50)" } as CSSProperties} />
                                    <stop offset={"1"} style={{ "stopColor": "var(--primary-orange-300)" } as CSSProperties} />
                                  </linearGradient>
                                  <linearGradient id={"_R_tamhdavb_-band-3"} gradientUnits={"userSpaceOnUse"} x1={"0"} y1={"0"} x2={"436"} y2={"0"}>
                                    <stop offset={"0"} style={{ "stopColor": "var(--primary-blue-50)" } as CSSProperties} />
                                    <stop offset={"1"} style={{ "stopColor": "var(--primary-blue-300)" } as CSSProperties} />
                                  </linearGradient>
                                  <linearGradient id={"_R_tamhdavb_-band-4"} gradientUnits={"userSpaceOnUse"} x1={"0"} y1={"0"} x2={"436"} y2={"0"}>
                                    <stop offset={"0"} style={{ "stopColor": "var(--primary-orange-50)" } as CSSProperties} />
                                    <stop offset={"1"} style={{ "stopColor": "var(--primary-blue-300)" } as CSSProperties} />
                                  </linearGradient>
                                  <filter id={"_R_tamhdavb_-shadow"} filterUnits={"userSpaceOnUse"} x={"-20"} y={"-20"} width={"476"} height={"392"} colorInterpolationFilters={"sRGB"}>
                                    <feDropShadow dx={"0"} dy={"2"} stdDeviation={"1.8"} floodColor={"#000"} floodOpacity={"0.16"} />
                                  </filter>
                                  <linearGradient id={"_R_tamhdavb_-feather"} x1={"0"} y1={"0"} x2={"1"} y2={"0"}>
                                    <stop offset={"0.784"} stopColor={"#fff"} />
                                    <stop offset={"1"} stopColor={"#000"} />
                                  </linearGradient>
                                  <mask id={"_R_tamhdavb_-flow"} maskUnits={"userSpaceOnUse"} x={"-556"} y={"-20"} width={"1112"} height={"392"}>
                                    <rect x={"0"} y={"-20"} width={"556"} height={"392"} fill={"url(#_R_tamhdavb_-feather)"} />
                                  </mask>
                                </defs>
                                <g mask={"url(#_R_tamhdavb_-flow)"}>
                                  <g className={"transition-opacity duration-300 opacity-100"}>
                                    <path data-slot={"budget-flow-chart-band"} data-flow={"1"} d={"M 0 161.193 C 218 161.193 218 42.316 436 42.316 L 436 83.579 C 218 83.579 218 202.456 0 202.456 Z"} fill={"url(#_R_tamhdavb_-band-1)"} className={"cursor-pointer"} style={{ "opacity": "1" } as CSSProperties} />
                                  </g>
                                  <g className={"transition-opacity duration-300 opacity-100"}>
                                    <path data-slot={"budget-flow-chart-band"} data-flow={"4"} d={"M 0 206.456 C 218 206.456 218 273.404 436 273.404 L 436 352 C 218 352 218 285.053 0 285.053 Z"} fill={"url(#_R_tamhdavb_-band-4)"} className={"cursor-pointer"} style={{ "opacity": "1" } as CSSProperties} />
                                  </g>
                                  <g className={"transition-opacity duration-300 opacity-100"}>
                                    <path data-slot={"budget-flow-chart-band"} data-flow={"0"} d={"M 0 289.053 C 218 289.053 218 0 436 0 L 436 38.316 C 218 38.316 218 327.368 0 327.368 Z"} fill={"url(#_R_tamhdavb_-band-0)"} filter={"url(#_R_tamhdavb_-shadow)"} className={"cursor-pointer"} style={{ "opacity": "1" } as CSSProperties} />
                                  </g>
                                  <g className={"transition-opacity duration-300 opacity-100"}>
                                    <path data-slot={"budget-flow-chart-band"} data-flow={"2"} d={"M 0 331.368 C 218 331.368 218 87.579 436 87.579 L 436 108.211 C 218 108.211 218 352 0 352 Z"} fill={"url(#_R_tamhdavb_-band-2)"} filter={"url(#_R_tamhdavb_-shadow)"} className={"cursor-pointer"} style={{ "opacity": "1" } as CSSProperties} />
                                  </g>
                                  <g className={"transition-opacity duration-300 opacity-100"}>
                                    <path data-slot={"budget-flow-chart-band"} data-flow={"3"} d={"M 0 0 C 218 0 218 112.211 436 112.211 L 436 269.404 C 218 269.404 218 157.193 0 157.193 Z"} fill={"url(#_R_tamhdavb_-band-3)"} filter={"url(#_R_tamhdavb_-shadow)"} className={"cursor-pointer"} style={{ "opacity": "1" } as CSSProperties} />
                                  </g>
                                </g>
                              </svg>
                              <div role={"group"} aria-label={"Trésorerie de novembre : flux"}>
                                <button type={"button"} data-slot={"budget-flow-chart-from-label"} data-flow-from={"0"} aria-label={"Abonnements vers Loyers : 7,8 k€, 65 % des abonnements, 100 % des loyers"} aria-pressed={"false"} tabIndex={-1} className={"absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40 opacity-100"} style={{ "top": "299.053px" } as CSSProperties}>
                                  <span data-count={"7800"} data-kind={"amount"} className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-normal"}>
                                    {"7,8 k€"}
                                  </span>
                                </button>
                                <button type={"button"} data-slot={"budget-flow-chart-from-label"} data-flow-from={"1"} aria-label={"Factures encaissées vers Fournisseurs : 8,4 k€, 34 % des factures encaissées, 67 % des fournisseurs"} aria-pressed={"false"} tabIndex={-1} className={"absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40 opacity-100"} style={{ "top": "171.193px" } as CSSProperties}>
                                  <span data-count={"8400"} data-kind={"amount"} className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-normal"}>
                                    {"8,4 k€"}
                                  </span>
                                </button>
                                <button type={"button"} data-slot={"budget-flow-chart-from-label"} data-flow-from={"2"} aria-label={"Abonnements vers Fournisseurs : 4,2 k€, 35 % des abonnements, 33 % des fournisseurs"} aria-pressed={"false"} tabIndex={-1} className={"absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40 opacity-100"} style={{ "top": "333.684px" } as CSSProperties}>
                                  <span data-count={"4200"} data-kind={"amount"} className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-normal"}>
                                    {"4,2 k€"}
                                  </span>
                                </button>
                                <button type={"button"} data-slot={"budget-flow-chart-from-label"} data-flow-from={"3"} aria-label={"Acomptes reçus vers Salaires : 32,0 k€, 100 % des acomptes, 67 % des salaires"} aria-pressed={"true"} tabIndex={0} className={"absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40 opacity-100"} style={{ "top": "10px" } as CSSProperties}>
                                  <span data-count={"32000"} data-kind={"amount"} className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-normal"}>
                                    {"32,0 k€"}
                                  </span>
                                </button>
                                <button type={"button"} data-slot={"budget-flow-chart-from-label"} data-flow-from={"4"} aria-label={"Factures encaissées vers Salaires : 16,0 k€, 66 % des factures encaissées, 33 % des salaires"} aria-pressed={"false"} tabIndex={-1} className={"absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2 focus-visible:ring-primary-blue-500/40 opacity-100"} style={{ "top": "216.456px" } as CSSProperties}>
                                  <span data-count={"16000"} data-kind={"amount"} className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-normal"}>
                                    {"16,0 k€"}
                                  </span>
                                </button>
                              </div>
                              <span aria-hidden={"true"} data-slot={"budget-flow-chart-to-label"} data-flow-to={"0"} className={"pointer-events-none absolute right-2.5 transition-opacity duration-300 opacity-100"} style={{ "top": "10px" } as CSSProperties}>
                                <span data-count={"1"} data-kind={"share"} className={"typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal"}>
                                  {"100 %"}
                                </span>
                              </span>
                              <span aria-hidden={"true"} data-slot={"budget-flow-chart-to-label"} data-flow-to={"1"} className={"pointer-events-none absolute right-2.5 transition-opacity duration-300 opacity-100"} style={{ "top": "52.316px" } as CSSProperties}>
                                <span data-count={"0.67"} data-kind={"share"} className={"typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal"}>
                                  {"67 %"}
                                </span>
                              </span>
                              <span aria-hidden={"true"} data-slot={"budget-flow-chart-to-label"} data-flow-to={"2"} className={"pointer-events-none absolute right-2.5 transition-opacity duration-300 opacity-100"} style={{ "top": "89.895px" } as CSSProperties}>
                                <span data-count={"0.33"} data-kind={"share"} className={"typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal"}>
                                  {"33 %"}
                                </span>
                              </span>
                              <span aria-hidden={"true"} data-slot={"budget-flow-chart-to-label"} data-flow-to={"3"} className={"pointer-events-none absolute right-2.5 transition-opacity duration-300 opacity-100"} style={{ "top": "122.211px" } as CSSProperties}>
                                <span data-count={"0.67"} data-kind={"share"} className={"typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal"}>
                                  {"67 %"}
                                </span>
                              </span>
                              <span aria-hidden={"true"} data-slot={"budget-flow-chart-to-label"} data-flow-to={"4"} className={"pointer-events-none absolute right-2.5 transition-opacity duration-300 opacity-100"} style={{ "top": "283.404px" } as CSSProperties}>
                                <span data-count={"0.33"} data-kind={"share"} className={"typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal"}>
                                  {"33 %"}
                                </span>
                              </span>
                              <div aria-hidden={"true"} data-slot={"budget-flow-chart-tooltip"} className={"pointer-events-none absolute flex flex-col items-start gap-2 overflow-hidden rounded-2xl bg-surface-loud p-3 whitespace-nowrap transition-opacity duration-200 shadow-[0_4px_3.6px_rgb(0_0_0/0.25),0_0_0_1px_#121212,0_2px_3.6px_rgb(0_0_0/0.06),0_4px_14.4px_rgb(0_0_0/0.08)] opacity-100"} style={{ "left": "124px", "top": "19px" } as CSSProperties}>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <span aria-hidden={"true"} className={"relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-200 [--dot-ring:var(--primary-blue-200)]"}>
                                    <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                      <defs>
                                        <linearGradient id={"asset-allocation-tip-dot-_R_liltamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                          <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                        </linearGradient>
                                      </defs>
                                      <circle cx={"5"} cy={"5"} r={"4.5"} fill={"none"} stroke={"url(#asset-allocation-tip-dot-_R_liltamhdavb_)"} strokeWidth={"1"} />
                                    </svg>
                                  </span>
                                  <span className={"typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft"}>
                                    {"De la source"}
                                  </span>
                                  <span className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-white"}>
                                    <span data-count={"1"} data-kind={"reductions"} className={"hug-w"}>
                                      {"−100 %"}
                                    </span>
                                  </span>
                                </span>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <svg width={"16"} height={"16"} viewBox={"0 0 16 16"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.33333"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} data-slot={"icon"} className={"size-3.5 shrink-0 text-icon-soft"}>
                                    <path d={"M4 6L8 10L12 6"} />
                                  </svg>
                                  <span className={"typo-label-02-regular min-w-[120px] whitespace-nowrap text-fg-soft"}>
                                    <span data-count={"32000"} data-kind={"amount"} className={"hug-w"}>
                                      {"32,0 k€"}
                                    </span>
                                  </span>
                                </span>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <span aria-hidden={"true"} className={"relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-500 [--dot-ring:var(--primary-blue-500)]"}>
                                    <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                      <defs>
                                        <linearGradient id={"asset-allocation-tip-dot-_R_tiltamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                          <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                        </linearGradient>
                                      </defs>
                                      <circle cx={"5"} cy={"5"} r={"4.5"} fill={"none"} stroke={"url(#asset-allocation-tip-dot-_R_tiltamhdavb_)"} strokeWidth={"1"} />
                                    </svg>
                                  </span>
                                  <span className={"typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft"}>
                                    {"Du poste"}
                                  </span>
                                  <span className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-white"}>
                                    <span data-count={"0.67"} data-kind={"additions"} className={"hug-w"}>
                                      {"+67 %"}
                                    </span>
                                  </span>
                                </span>
                                <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] border border-[#242323]"} />
                              </div>
                              <span aria-hidden={"true"} className={"pointer-events-none invisible absolute top-0 left-0 flex flex-col items-start gap-2 whitespace-nowrap"}>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <span aria-hidden={"true"} className={"relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-200 [--dot-ring:var(--primary-blue-200)]"}>
                                    <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                      <defs>
                                        <linearGradient id={"asset-allocation-tip-dot-_R_5mltamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                          <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                        </linearGradient>
                                      </defs>
                                      <circle cx={"5"} cy={"5"} r={"4.5"} fill={"none"} stroke={"url(#asset-allocation-tip-dot-_R_5mltamhdavb_)"} strokeWidth={"1"} />
                                    </svg>
                                  </span>
                                  <span className={"typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft"}>
                                    {"De la source"}
                                  </span>
                                  <span className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-white"}>
                                    {"−100 %"}
                                  </span>
                                </span>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <svg width={"16"} height={"16"} viewBox={"0 0 16 16"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.33333"} strokeLinecap={"round"} strokeLinejoin={"round"} aria-hidden={"true"} data-slot={"icon"} className={"size-3.5 shrink-0 text-icon-soft"}>
                                    <path d={"M4 6L8 10L12 6"} />
                                  </svg>
                                  <span className={"typo-label-02-regular min-w-[120px] whitespace-nowrap text-fg-soft"}>
                                    {"32,0 k€"}
                                  </span>
                                </span>
                                <span className={"flex items-center gap-1.5 py-0.5"}>
                                  <span aria-hidden={"true"} className={"relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full transition-[background-color,box-shadow] duration-200 shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)] bg-primary-blue-500 [--dot-ring:var(--primary-blue-500)]"}>
                                    <svg className={"pointer-events-none absolute inset-0 size-full overflow-visible"}>
                                      <defs>
                                        <linearGradient id={"asset-allocation-tip-dot-_R_7mltamhdavb_"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                                          <stop offset={"0"} stopColor={"#fff"} stopOpacity={"0.24"} />
                                          <stop offset={"1"} stopColor={"#fff"} stopOpacity={"0"} />
                                        </linearGradient>
                                      </defs>
                                      <circle cx={"5"} cy={"5"} r={"4.5"} fill={"none"} stroke={"url(#asset-allocation-tip-dot-_R_7mltamhdavb_)"} strokeWidth={"1"} />
                                    </svg>
                                  </span>
                                  <span className={"typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft"}>
                                    {"Du poste"}
                                  </span>
                                  <span className={"typo-label-03-medium hug-w whitespace-nowrap text-fg-white"}>
                                    {"+67 %"}
                                  </span>
                                </span>
                              </span>
                            </div>
                            <div aria-hidden={"true"} data-side={"to"} className={"relative w-[72px] shrink-0"}>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"3"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-0.5 pointer-events-auto bg-primary-yellow-500 [--bar-ring:var(--primary-yellow-500)]"} style={{ "top": "0", "height": "38.316px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.11"} data-kind={"share"}>
                                      {"11 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
                                </div>
                              </div>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"4"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-0.5 pointer-events-auto bg-primary-orange-500 [--bar-ring:var(--primary-orange-500)]"} style={{ "top": "42.316px", "height": "65.895px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.19"} data-kind={"share"}>
                                      {"19 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
                                </div>
                              </div>
                              <div className={"pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-100"}>
                                <div data-slot={"budget-flow-chart-bar"} data-bar={"5"} className={"absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)] left-0.5 pointer-events-auto bg-primary-blue-500 [--bar-ring:var(--primary-blue-500)]"} style={{ "top": "112.211px", "height": "239.789px", "opacity": "1" } as CSSProperties}>
                                  <span data-slot={"budget-flow-chart-badge"} className={"typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200 opacity-100"}>
                                    <span data-count={"0.7"} data-kind={"share"}>
                                      {"70 %"}
                                    </span>
                                  </span>
                                  <span aria-hidden={"true"} className={"pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]"} />
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
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
