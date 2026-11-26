/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxFaq ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SxFaq() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"faqs"} className={"platform-section faq-section"} data-gutter-guide={"bottom"}>
        <header className={"platform-intro faq-intro"}>
          <div className={"faq-intro-copy"}>
            <span className={"platform-eyebrow"}>
              {"FAQ"}
            </span>
            <h2>
              {"Vos questions, nos réponses."}
              <br />
              <span>
                {"Ce qu'on nous demande avant de passer à Omega."}
              </span>
            </h2>
            <div className={"faq-aside"}>
              <p>
                {"Une question que nous n'avons pas abordée ? L'équipe qui construit Omega se fera un plaisir de vous répondre."}
              </p>
              <Button asChild variant={"link"}>
                <Link href={"/contact"}>
                  {"Écrire à l'équipe"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
          </div>
          <span className={"faq-intro-guide"} data-gutter-guide={"bottom"} aria-hidden={"true"} />
        </header>
        <ul className={"faq-list"}>
          <li className={"faq-item is-open"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q7"} aria-expanded={"true"} aria-controls={"_R_ltavb_-a7"}>
              <span>
                {"En quoi Omega est-il différent d'un ERP classique ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a7"} role={"region"} aria-labelledby={"_R_ltavb_-q7"}>
              <div>
                <p>
                  {"Sur trois points. Il remplace votre logiciel de gestion et les outils autour par un seul système. Des agents IA y font le travail : relances, saisie des factures, contrôle des paiements, réponses aux clients, sous votre validation. Et il est déployé par nos modèles d'IA, bien plus vite et pour bien moins cher qu'avec un intégrateur."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q0"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a0"}>
              <span>
                {"Combien coûte Omega ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a0"} role={"region"} aria-labelledby={"_R_ltavb_-q0"} inert={true}>
              <div>
                <p>
                  {"34,90 € HT par utilisateur et par mois pour l'ERP. Chaque agent coûte à partir de 199 € HT par mois ; son prix est fixé lors de l'audit, selon le volume traité. L'installation se paie une fois, au prix écrit dans votre devis."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q1"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a1"}>
              <span>
                {"Peut-on changer d'offre plus tard ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a1"} role={"region"} aria-labelledby={"_R_ltavb_-q1"} inert={true}>
              <div>
                <p>
                  {"Oui. Vous ajoutez ou retirez un agent à tout moment : les agents sont au mois, sans engagement. Pendant 30 jours après la mise en service, ils vous sont remboursés intégralement."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q2"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a2"}>
              <span>
                {"Combien de temps faut-il pour passer sur Omega ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a2"} role={"region"} aria-labelledby={"_R_ltavb_-q2"} inert={true}>
              <div>
                <p>
                  {"Comptez deux semaines à un mois. Nos modèles d'IA paramètrent l'ERP et reprennent vos clients, vos articles, vos factures en cours et vos soldes, puis votre expert-comptable vérifie le paramétrage avant le démarrage."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q3"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a3"}>
              <span>
                {"Les agents font-ils quelque chose sans demander ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a3"} role={"region"} aria-labelledby={"_R_ltavb_-q3"} inert={true}>
              <div>
                <p>
                  {"Non. Les agents préparent les relances, les réponses et les écritures, mais tout ce qui part attend la validation d'une personne nommée. Chaque action est enregistrée, avec qui l'a validée et quand."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q4"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a4"}>
              <span>
                {"Où sont stockées nos données ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a4"} role={"region"} aria-labelledby={"_R_ltavb_-q4"} inert={true}>
              <div>
                <p>
                  {"Chiffrées au repos et en transit, dans un espace réservé à votre entreprise et hébergé à Francfort. Si votre politique interne l'exige, elles peuvent rester dans vos locaux."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q5"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a5"}>
              <span>
                {"Omega fonctionne-t-il avec nos outils ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a5"} role={"region"} aria-labelledby={"_R_ltavb_-q5"} inert={true}>
              <div>
                <p>
                  {"Oui. Omega se branche sur Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot et d'autres. Vous pouvez aussi garder votre logiciel actuel et commencer par les agents."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q6"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a6"}>
              <span>
                {"Pouvez-vous construire un module rien que pour nous ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a6"} role={"region"} aria-labelledby={"_R_ltavb_-q6"} inert={true}>
              <div>
                <p>
                  {"Oui. Pendant l'audit, nous regardons comment vous travaillez. Vous repartez avec une proposition écrite, prix compris, et le module s'ajoute à votre ERP."}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
