/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxSecurite ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* 26/11/2026 — ÉDITÉ À LA MAIN : les pastilles et les barres des deux
   premières cartes sont remplacées par <SecuriteEngagements /> et
   <SecuriteJournal /> (Teo). Régénérer ce bloc les ferait revenir. */
import type { CSSProperties } from "react";
import SecuriteEngagements from "../SecuriteEngagements";
import SecuriteJournal from "../SecuriteJournal";
import Link from "next/link";

export default function SxSecurite() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"security"} className={"platform-section sec-section"}>
        <header className={"platform-intro platform-intro-split sec-intro"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"Sécurité et conformité"}
            </span>
            <h2>
              {"Une sécurité à la hauteur de vos comptes."}
              <br />
              <span>
                {"Conformité et contrôle intégrés."}
              </span>
            </h2>
          </div>
          <p className={"platform-lede"}>
            {"Chaque donnée chiffrée, chaque modification enregistrée, et chaque action d'agent validée par une personne. Vos données sont hébergées dans l'Union européenne, à Francfort."}
          </p>
        </header>
        <div className={"sec-grid"}>
          <article className={"sec-card"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"} aria-hidden={"true"}>
              <SecuriteEngagements />
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Quatre engagements écrits"}
              </h3>
              <p>
                {"Hébergées à Francfort, sans réplication hors de l'Union européenne. Jamais utilisées pour entraîner un modèle d'IA."}
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
              <SecuriteJournal />
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Chaque action est tracée"}
              </h3>
              <p>
                {"Sauvegardes automatiques et supervision comprises. Le journal indique qui a validé quoi, et quand."}
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
                {"Des accès contrôlés à chaque niveau"}
              </h3>
              <p>
                {"Un compte par utilisateur, des droits par rôle, et une personne nommée pour valider chaque action d'agent."}
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
