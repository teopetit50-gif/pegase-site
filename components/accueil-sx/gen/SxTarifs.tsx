/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxTarifs ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SxTarifs() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"pricing"} className={"platform-section pr-section"}>
        <header className={"platform-intro pr-intro"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"Tarifs"}
            </span>
            <h2>
              {"Une tarification transparente."}
              <br />
              <span>
                {"Le logiciel par personne, les agents selon leur travail."}
              </span>
            </h2>
            <p className={"platform-lede"}>
              {"Le logiciel coûte 34,90 € HT par mois pour chaque personne qui l'utilise, dès la première. Chaque agent a son propre prix, à partir de 199 € HT par mois, selon le nombre de dossiers qu'il traite. Une automatisation se paie une seule fois, à l'installation, dès 49 € HT."}
            </p>
          </div>
          <div className={"pr-controls"}>
            <div className={"pr-billing"} role={"group"} aria-label={"Type de prix"}>
              <button type={"button"} aria-pressed={"true"}>
                {"Chaque mois"}
              </button>
              <button type={"button"} aria-pressed={"false"}>
                {"Installation "}
                <em>
                  {"Une seule fois"}
                </em>
              </button>
            </div>
            <label className={"pr-team"}>
              <span className={"pr-team-row"}>
                <span>
                  {"Nombre de personnes"}
                </span>
                <b>
                  {"10 personnes"}
                </b>
              </span>
              <input type={"range"} className={"pr-range"} min={"1"} max={"50"} step={"1"} aria-valuetext={"10 personnes"} style={{ "--fill": "18.3673%" } as CSSProperties} defaultValue={"10"} />
            </label>
          </div>
        </header>
        <div className={"pr-grid"}>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Audit"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"Nous voyons ce qu'Omega peut faire chez vous, et à quel prix."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"0 €"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"0 €"}
                    </span>
                    <span className={"sr-only"}>
                      {"0 €"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"offert"}
                  <br />
                  {"30 minutes"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"Offert"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"Offert"}
                    </span>
                    <span className={"sr-only"}>
                      {"Offert"}
                    </span>
                  </span>
                </b>
                {" et sans engagement"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <Button asChild variant={"link"}>
                <Link href={"/reserver-un-audit"}>
                  {"Réserver l'audit"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"Ce qui est compris"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2d9ktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2d9ktavb_)"} />
                  </svg>
                  <span>
                    {"Votre activité, passée en revue"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Les modules et agents utiles"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Une proposition écrite, prix compris"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Le calendrier de démarrage"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Votre tarif, écrit à la fin"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Aucun engagement"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier is-featured"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Gestion"}
              </h3>
              <span className={"pr-tag"}>
                {"Dès la première personne"}
              </span>
            </div>
            <p className={"pr-desc"}>
              {"Toute votre gestion dans un seul logiciel, configuré pour votre activité."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"34,90 €"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"34,90 €"}
                    </span>
                    <span className={"sr-only"}>
                      {"34,90 €"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"HT par personne"}
                  <br />
                  {"par mois"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"349,00 €"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"349,00 €"}
                    </span>
                    <span className={"sr-only"}>
                      {"349,00 €"}
                    </span>
                  </span>
                </b>
                {" HT par mois pour 10 personnes"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <Button asChild variant={"link"}>
                <Link href={"/contact"}>
                  {"Parler à l'équipe"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"Ce qui est compris"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2daktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2daktavb_)"} />
                  </svg>
                  <span>
                    {"Les six modules de gestion"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Sans minimum de personnes"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Vos données actuelles reprises"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Vérifié par votre expert-comptable"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"50 Go de documents compris"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Un interlocuteur dans notre équipe"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Agents IA"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"Des agents qui prennent en charge vos tâches répétitives."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"dès 199 €"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"dès 199 €"}
                    </span>
                    <span className={"sr-only"}>
                      {"dès 199 €"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"HT par agent"}
                  <br />
                  {"par mois"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"Prix fixé"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"Prix fixé"}
                    </span>
                    <span className={"sr-only"}>
                      {"Prix fixé"}
                    </span>
                  </span>
                </b>
                {" à l'audit, selon les dossiers suivis"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <Button asChild variant={"link"}>
                <Link href={"/tarifs"}>
                  {"Voir les tarifs"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"Pour chaque agent"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2dbktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2dbktavb_)"} />
                  </svg>
                  <span>
                    {"Jamais un pourcentage de vos encaissements"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Remise de 10 % dès 3 agents, de 15 % dès 5"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Aucun débit avant la fin de l'installation"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Mensuel, sans engagement"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Remboursé pendant 30 jours"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Export complet de vos données"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Sur mesure"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"Nous construisons le module ou l'agent qui n'existe que chez vous."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  {"Sur devis"}
                </strong>
              </p>
              <p className={"pr-total"}>
                {"Une automatisation ou un agent, "}
                <b>
                  {"chiffré après diagnostic"}
                </b>
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <Button asChild variant={"link"}>
                <Link href={"/offres/sur-mesure"}>
                  {"Découvrir le sur-mesure"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"Construit pour vous"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2dcktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2dcktavb_)"} />
                  </svg>
                  <span>
                    {"Votre organisation, étudiée avec vous"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Un module ajouté à votre logiciel"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Vos outils actuels raccordés"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Données d'un autre logiciel reprises"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Ce qu'il fait, écrit avant de commencer"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Les six modules comme base"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
