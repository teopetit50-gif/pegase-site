/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxSecurite ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* 26/11/2026 — ÉDITÉ À LA MAIN : les pastilles et les barres des deux
   premières cartes sont remplacées par <SecuriteEngagements /> et
   <SecuriteJournal />, le bouclier de la troisième par <SecuriteAcces /> (Teo). Régénérer ce bloc les ferait revenir. */
import type { CSSProperties } from "react";
import SecuriteEngagements from "../SecuriteEngagements";
import SecuriteJournal from "../SecuriteJournal";
import SecuriteAcces from "../SecuriteAcces";
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
          </article>
          <article className={"sec-card"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"} aria-hidden={"true"}>
              <SecuriteAcces />
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
