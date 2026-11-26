/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxSecurite ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";

export default function SxSecurite() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"security"} className={"platform-section sec-section"}>
        <header className={"platform-intro platform-intro-split sec-intro"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"Vos données"}
            </span>
            <h2>
              {"L'IA, sans perdre le contrôle de vos données."}
              <br />
              <span>
                {"Chaque action d'un agent est enregistrée."}
              </span>
            </h2>
          </div>
          <p className={"platform-lede"}>
            {"Vos données sont stockées dans un espace réservé à votre entreprise, chiffré et hébergé dans l'Union européenne. Les agents attendent votre accord pour agir, et chaque action reste consultable dans un journal."}
          </p>
        </header>
        <div className={"sec-grid"}>
          <article className={"sec-card"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"} aria-hidden={"true"}>
              <div className={"sec-seals"}>
                <svg viewBox={"0 0 1500 1500"} className={"sec-logo"} role={"img"} aria-label={"Données chiffrées en transit et au repos"}>
                  <rect x={"71.5"} y={"71.5"} width={"1357"} height={"1357"} rx={"320"} fill={"#efeff1"} stroke={"#fff"} strokeWidth={"91"} />
                  <g fill={"#202322"} fontFamily={"var(--font-google-sans), Arial, sans-serif"} textAnchor={"middle"}>
                    <text x={"760"} y={"688"} fontSize={"300"} fontWeight={"400"} letterSpacing={"4"}>
                      {"TLS"}
                    </text>
                    <rect x={"330"} y={"760"} width={"866"} height={"5"} />
                    <text x={"760"} y={"1028"} fontSize={"300"} fontWeight={"400"} letterSpacing={"6"}>
                      {"CHIFFRÉ"}
                    </text>
                  </g>
                </svg>
                <svg viewBox={"0 0 1500 1500"} className={"sec-logo"} role={"img"} aria-label={"Rétention fournisseur : 30 jours"}>
                  <rect x={"71.5"} y={"71.5"} width={"1357"} height={"1357"} rx={"320"} fill={"#efeff1"} stroke={"#fff"} strokeWidth={"91"} />
                  <g fill={"#202322"} fontFamily={"var(--font-google-sans), Arial, sans-serif"} textAnchor={"middle"}>
                    <text x={"750"} y={"800"} fontSize={"400"} fontWeight={"700"} letterSpacing={"6"}>
                      {"30 J"}
                    </text>
                    <rect x={"390"} y={"862"} width={"720"} height={"5"} />
                    <text x={"750"} y={"1030"} fontSize={"165"} fontWeight={"500"} letterSpacing={"4"}>
                      {"MAXI"}
                    </text>
                  </g>
                </svg>
                <span className={"sec-logo sec-gdpr "} role={"img"} aria-label={"Hébergement dans l'Union européenne"}>
                  <svg viewBox={"0 0 1500 1500"} className={"sec-gdpr-discs"} aria-hidden={"true"}>
                    <rect x={"71.5"} y={"71.5"} width={"1357"} height={"1357"} rx={"320"} fill={"#efeff1"} stroke={"#fff"} strokeWidth={"91"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(0deg) translateY(-21.5px) rotate(0deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(30deg) translateY(-21.5px) rotate(-30deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(60deg) translateY(-21.5px) rotate(-60deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(90deg) translateY(-21.5px) rotate(-90deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(120deg) translateY(-21.5px) rotate(-120deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(150deg) translateY(-21.5px) rotate(-150deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(180deg) translateY(-21.5px) rotate(-180deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(210deg) translateY(-21.5px) rotate(-210deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(240deg) translateY(-21.5px) rotate(-240deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(270deg) translateY(-21.5px) rotate(-270deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(300deg) translateY(-21.5px) rotate(-300deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-star-bold sec-gdpr-star"} style={{ "transform": "rotate(330deg) translateY(-21.5px) rotate(-330deg)", "fontSize": "var(--solar-size, 24px)" } as CSSProperties} aria-hidden={"true"} width={"1em"} height={"1em"} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M9.15316 5.40838C10.4198 3.13613 11.0531 2 12 2C12.9469 2 13.5802 3.13612 14.8468 5.40837L15.1745 5.99623C15.5345 6.64193 15.7144 6.96479 15.9951 7.17781C16.2757 7.39083 16.6251 7.4699 17.3241 7.62805L17.9605 7.77203C20.4201 8.32856 21.65 8.60682 21.9426 9.54773C22.2352 10.4886 21.3968 11.4691 19.7199 13.4299L19.2861 13.9372C18.8096 14.4944 18.5713 14.773 18.4641 15.1177C18.357 15.4624 18.393 15.8341 18.465 16.5776L18.5306 17.2544C18.7841 19.8706 18.9109 21.1787 18.1449 21.7602C17.3788 22.3417 16.2273 21.8115 13.9243 20.7512L13.3285 20.4768C12.6741 20.1755 12.3469 20.0248 12 20.0248C11.6531 20.0248 11.3259 20.1755 10.6715 20.4768L10.0757 20.7512C7.77268 21.8115 6.62118 22.3417 5.85515 21.7602C5.08912 21.1787 5.21588 19.8706 5.4694 17.2544L5.53498 16.5776C5.60703 15.8341 5.64305 15.4624 5.53586 15.1177C5.42868 14.773 5.19043 14.4944 4.71392 13.9372L4.2801 13.4299C2.60325 11.4691 1.76482 10.4886 2.05742 9.54773C2.35002 8.60682 3.57986 8.32856 6.03954 7.77203L6.67589 7.62805C7.37485 7.4699 7.72433 7.39083 8.00494 7.17781C8.28555 6.96479 8.46553 6.64194 8.82547 5.99623L9.15316 5.40838Z"} fill={"currentColor"} />
                  </svg>
                  <span className={"sec-gdpr-core"} aria-hidden={"true"}>
                    <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-lock-keyhole-bold"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                      <path d={"M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM14 16C14 17.1046 13.1046 18 12 18C10.8954 18 10 17.1046 10 16C10 14.8954 10.8954 14 12 14C13.1046 14 14 14.8954 14 16Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                    </svg>
                    <b>
                      {"UE"}
                    </b>
                  </span>
                </span>
                <svg viewBox={"0 0 1500 1500"} className={"sec-logo"} role={"img"} aria-label={"Journal des actions"}>
                  <rect x={"71.5"} y={"71.5"} width={"1357"} height={"1357"} rx={"320"} fill={"#efeff1"} stroke={"#fff"} strokeWidth={"91"} />
                  <path d={"M750 345L1101 547.5V952.5L750 1155L399 952.5V547.5Z"} fill={"#202322"} />
                  <path d={"M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z"} transform={"translate(544 599) scale(18)"} fill={"#efeff1"} />
                  <path d={"M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM14 16C14 17.1046 13.1046 18 12 18C10.8954 18 10 17.1046 10 16C10 14.8954 10.8954 14 12 14C13.1046 14 14 14.8954 14 16Z"} transform={"translate(670 720) scale(7.5)"} fill={"#202322"} fillRule={"evenodd"} clipRule={"evenodd"} />
                </svg>
              </div>
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Quatre engagements écrits"}
              </h3>
              <p>
                {"Vos données sont stockées à Francfort et ne sortent pas de l'Union européenne. Elles ne servent jamais à entraîner un modèle d'IA."}
              </p>
            </div>
            <div className={"ft-actions"}>
              <Link href={"/vos-donnees"} className={"ft-link sec-link"} aria-label={"Où vont vos données"}>
                <span aria-hidden={"true"}>
                  {"Où vont vos données"}
                </span>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-arrow-right-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                  <path d={"M13.4697 5.46967C13.7626 5.17678 14.2374 5.17678 14.5303 5.46967L20.5303 11.4697C20.8232 11.7626 20.8232 12.2374 20.5303 12.5303L14.5303 18.5303C14.2374 18.8232 13.7626 18.8232 13.4697 18.5303C13.1768 18.2374 13.1768 17.7626 13.4697 17.4697L18.1893 12.75H4C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H18.1893L13.4697 6.53033C13.1768 6.23744 13.1768 5.76256 13.4697 5.46967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </Link>
            </div>
          </article>
          <article className={"sec-card"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"} aria-hidden={"true"}>
              <div className={"sec-uptime"}>
                <div className={"sec-uptime-row"}>
                  <p>
                    <strong>
                      {"Relances"}
                    </strong>
                    <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                        {"100 % validées"}
                      </span>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                        {"100 % validées"}
                      </span>
                      <span className={"sr-only"}>
                        {"100 % validées"}
                      </span>
                    </span>
                  </p>
                  <div className={"sec-bars"} style={{ "color": "#2d00f7" } as CSSProperties}>
                    <i style={{ "--i": "0" } as CSSProperties} />
                    <i style={{ "--i": "1" } as CSSProperties} />
                    <i style={{ "--i": "2" } as CSSProperties} />
                    <i style={{ "--i": "3" } as CSSProperties} />
                    <i style={{ "--i": "4" } as CSSProperties} />
                    <i style={{ "--i": "5" } as CSSProperties} />
                    <i style={{ "--i": "6" } as CSSProperties} />
                    <i style={{ "--i": "7" } as CSSProperties} />
                    <i style={{ "--i": "8" } as CSSProperties} />
                    <i style={{ "--i": "9" } as CSSProperties} />
                    <i style={{ "--i": "10" } as CSSProperties} />
                    <i style={{ "--i": "11" } as CSSProperties} />
                    <i style={{ "--i": "12" } as CSSProperties} />
                    <i style={{ "--i": "13" } as CSSProperties} />
                    <i style={{ "--i": "14" } as CSSProperties} />
                    <i style={{ "--i": "15" } as CSSProperties} />
                    <i style={{ "--i": "16" } as CSSProperties} />
                    <i style={{ "--i": "17" } as CSSProperties} />
                    <i style={{ "--i": "18" } as CSSProperties} />
                    <i style={{ "--i": "19" } as CSSProperties} />
                    <i style={{ "--i": "20" } as CSSProperties} />
                    <i style={{ "--i": "21" } as CSSProperties} />
                    <i style={{ "--i": "22" } as CSSProperties} />
                    <i style={{ "--i": "23" } as CSSProperties} />
                    <i style={{ "--i": "24" } as CSSProperties} />
                    <i style={{ "--i": "25" } as CSSProperties} />
                    <i style={{ "--i": "26" } as CSSProperties} />
                    <i style={{ "--i": "27" } as CSSProperties} />
                    <i style={{ "--i": "28" } as CSSProperties} />
                    <i style={{ "--i": "29" } as CSSProperties} />
                    <i style={{ "--i": "30" } as CSSProperties} />
                    <i style={{ "--i": "31" } as CSSProperties} />
                    <i style={{ "--i": "32" } as CSSProperties} />
                    <i style={{ "--i": "33" } as CSSProperties} />
                  </div>
                </div>
                <div className={"sec-uptime-row"}>
                  <p>
                    <strong>
                      {"Factures fournisseurs"}
                    </strong>
                    <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                        {"100 % contrôlées"}
                      </span>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                        {"100 % contrôlées"}
                      </span>
                      <span className={"sr-only"}>
                        {"100 % contrôlées"}
                      </span>
                    </span>
                  </p>
                  <div className={"sec-bars"} style={{ "color": "#f06a00" } as CSSProperties}>
                    <i style={{ "--i": "0" } as CSSProperties} />
                    <i style={{ "--i": "1" } as CSSProperties} />
                    <i style={{ "--i": "2" } as CSSProperties} />
                    <i style={{ "--i": "3" } as CSSProperties} />
                    <i style={{ "--i": "4" } as CSSProperties} />
                    <i style={{ "--i": "5" } as CSSProperties} />
                    <i style={{ "--i": "6" } as CSSProperties} />
                    <i style={{ "--i": "7" } as CSSProperties} />
                    <i style={{ "--i": "8" } as CSSProperties} />
                    <i style={{ "--i": "9" } as CSSProperties} />
                    <i style={{ "--i": "10" } as CSSProperties} />
                    <i style={{ "--i": "11" } as CSSProperties} />
                    <i style={{ "--i": "12" } as CSSProperties} />
                    <i style={{ "--i": "13" } as CSSProperties} />
                    <i style={{ "--i": "14" } as CSSProperties} />
                    <i style={{ "--i": "15" } as CSSProperties} />
                    <i style={{ "--i": "16" } as CSSProperties} />
                    <i style={{ "--i": "17" } as CSSProperties} />
                    <i style={{ "--i": "18" } as CSSProperties} />
                    <i style={{ "--i": "19" } as CSSProperties} />
                    <i style={{ "--i": "20" } as CSSProperties} />
                    <i className={"is-dip"} style={{ "--i": "21" } as CSSProperties} />
                    <i style={{ "--i": "22" } as CSSProperties} />
                    <i style={{ "--i": "23" } as CSSProperties} />
                    <i style={{ "--i": "24" } as CSSProperties} />
                    <i style={{ "--i": "25" } as CSSProperties} />
                    <i style={{ "--i": "26" } as CSSProperties} />
                    <i style={{ "--i": "27" } as CSSProperties} />
                    <i style={{ "--i": "28" } as CSSProperties} />
                    <i style={{ "--i": "29" } as CSSProperties} />
                    <i style={{ "--i": "30" } as CSSProperties} />
                    <i style={{ "--i": "31" } as CSSProperties} />
                    <i style={{ "--i": "32" } as CSSProperties} />
                    <i style={{ "--i": "33" } as CSSProperties} />
                  </div>
                </div>
                <div className={"sec-uptime-row"}>
                  <p>
                    <strong>
                      {"Demandes clients"}
                    </strong>
                    <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                        {"100 % validées"}
                      </span>
                      <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                        {"100 % validées"}
                      </span>
                      <span className={"sr-only"}>
                        {"100 % validées"}
                      </span>
                    </span>
                  </p>
                  <div className={"sec-bars"} style={{ "color": "#16a34a" } as CSSProperties}>
                    <i style={{ "--i": "0" } as CSSProperties} />
                    <i style={{ "--i": "1" } as CSSProperties} />
                    <i style={{ "--i": "2" } as CSSProperties} />
                    <i style={{ "--i": "3" } as CSSProperties} />
                    <i style={{ "--i": "4" } as CSSProperties} />
                    <i style={{ "--i": "5" } as CSSProperties} />
                    <i style={{ "--i": "6" } as CSSProperties} />
                    <i style={{ "--i": "7" } as CSSProperties} />
                    <i style={{ "--i": "8" } as CSSProperties} />
                    <i style={{ "--i": "9" } as CSSProperties} />
                    <i style={{ "--i": "10" } as CSSProperties} />
                    <i style={{ "--i": "11" } as CSSProperties} />
                    <i style={{ "--i": "12" } as CSSProperties} />
                    <i style={{ "--i": "13" } as CSSProperties} />
                    <i style={{ "--i": "14" } as CSSProperties} />
                    <i style={{ "--i": "15" } as CSSProperties} />
                    <i style={{ "--i": "16" } as CSSProperties} />
                    <i style={{ "--i": "17" } as CSSProperties} />
                    <i style={{ "--i": "18" } as CSSProperties} />
                    <i style={{ "--i": "19" } as CSSProperties} />
                    <i style={{ "--i": "20" } as CSSProperties} />
                    <i style={{ "--i": "21" } as CSSProperties} />
                    <i style={{ "--i": "22" } as CSSProperties} />
                    <i style={{ "--i": "23" } as CSSProperties} />
                    <i style={{ "--i": "24" } as CSSProperties} />
                    <i style={{ "--i": "25" } as CSSProperties} />
                    <i style={{ "--i": "26" } as CSSProperties} />
                    <i style={{ "--i": "27" } as CSSProperties} />
                    <i style={{ "--i": "28" } as CSSProperties} />
                    <i style={{ "--i": "29" } as CSSProperties} />
                    <i style={{ "--i": "30" } as CSSProperties} />
                    <i style={{ "--i": "31" } as CSSProperties} />
                    <i style={{ "--i": "32" } as CSSProperties} />
                    <i style={{ "--i": "33" } as CSSProperties} />
                  </div>
                </div>
                <p className={"sec-uptime-foot"}>
                  <span>
                    <i />
                    {"Un historique complet"}
                  </span>
                  <span>
                    {"90 derniers jours"}
                  </span>
                </p>
              </div>
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Chaque action est tracée"}
              </h3>
              <p>
                {"Le journal indique qui a validé quoi, et quand. L'hébergement, les sauvegardes et la surveillance sont compris dans le prix."}
              </p>
            </div>
            <div className={"ft-actions"}>
              <Link href={"/espace2"} className={"ft-link sec-link"} aria-label={"Voir l'espace client"}>
                <span aria-hidden={"true"}>
                  {"Voir l'espace client"}
                </span>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-arrow-right-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                  <path d={"M13.4697 5.46967C13.7626 5.17678 14.2374 5.17678 14.5303 5.46967L20.5303 11.4697C20.8232 11.7626 20.8232 12.2374 20.5303 12.5303L14.5303 18.5303C14.2374 18.8232 13.7626 18.8232 13.4697 18.5303C13.1768 18.2374 13.1768 17.7626 13.4697 17.4697L18.1893 12.75H4C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H18.1893L13.4697 6.53033C13.1768 6.23744 13.1768 5.76256 13.4697 5.46967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </Link>
            </div>
          </article>
          <article className={"sec-card"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"} aria-hidden={"true"}>
              <div className={"sec-access"}>
                <svg viewBox={"0 0 240 240"} className={"sec-shield"}>
                  <defs>
                    <linearGradient id={"sec-shield-outer"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                      <stop offset={"0"} stopColor={"#4a4a4a"} />
                      <stop offset={".44"} stopColor={"#292929"} />
                    </linearGradient>
                    <linearGradient id={"sec-shield-inner"} x1={"0"} y1={"0"} x2={"0"} y2={"1"}>
                      <stop offset={"0"} stopColor={"#1c1c1c"} />
                      <stop offset={"1"} stopColor={"#333"} />
                    </linearGradient>
                  </defs>
                  <path d={"M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z"} transform={"scale(10)"} fill={"url(#sec-shield-outer)"} />
                  <path d={"M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z"} transform={"translate(24 25) scale(8)"} fill={"url(#sec-shield-inner)"} stroke={"rgb(255 255 255 / 0.18)"} strokeWidth={".16"} />
                  <path d={"M5.25 10.0546V8C5.25 4.27208 8.27208 1.25 12 1.25C15.7279 1.25 18.75 4.27208 18.75 8V10.0546C19.8648 10.1379 20.5907 10.348 21.1213 10.8787C22 11.7574 22 13.1716 22 16C22 18.8284 22 20.2426 21.1213 21.1213C20.2426 22 18.8284 22 16 22H8C5.17157 22 3.75736 22 2.87868 21.1213C2 20.2426 2 18.8284 2 16C2 13.1716 2 11.7574 2.87868 10.8787C3.40931 10.348 4.13525 10.1379 5.25 10.0546ZM6.75 8C6.75 5.10051 9.10051 2.75 12 2.75C14.8995 2.75 17.25 5.10051 17.25 8V10.0036C16.867 10 16.4515 10 16 10H8C7.54849 10 7.13301 10 6.75 10.0036V8ZM14 16C14 17.1046 13.1046 18 12 18C10.8954 18 10 17.1046 10 16C10 14.8954 10.8954 14 12 14C13.1046 14 14 14.8954 14 16Z"} transform={"translate(87 84) scale(2.75)"} fill={"#fff"} fillRule={"evenodd"} clipRule={"evenodd"} />
                </svg>
                <ul className={"sec-chips"}>
                  <li>
                    {"Validation humaine"}
                  </li>
                  <li>
                    {"Brouillons"}
                  </li>
                  <li>
                    {"Journal"}
                  </li>
                  <li>
                    {"Un compte par personne"}
                  </li>
                  <li>
                    {"Export complet"}
                  </li>
                </ul>
              </div>
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Vous décidez de ce qui part"}
              </h3>
              <p>
                {"Au départ, tout ce qui sort passe par votre validation. Vous pouvez ensuite autoriser un agent à envoyer seul certains messages."}
              </p>
            </div>
            <div className={"ft-actions"}>
              <Link href={"/offres"} className={"ft-link sec-link"} aria-label={"Voir les agents"}>
                <span aria-hidden={"true"}>
                  {"Voir les agents"}
                </span>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-arrow-right-outline"} style={{ "width": "14px", "height": "14px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                  <path d={"M13.4697 5.46967C13.7626 5.17678 14.2374 5.17678 14.5303 5.46967L20.5303 11.4697C20.8232 11.7626 20.8232 12.2374 20.5303 12.5303L14.5303 18.5303C14.2374 18.8232 13.7626 18.8232 13.4697 18.5303C13.1768 18.2374 13.1768 17.7626 13.4697 17.4697L18.1893 12.75H4C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H18.1893L13.4697 6.53033C13.1768 6.23744 13.1768 5.76256 13.4697 5.46967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
