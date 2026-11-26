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
              {"Questions fréquentes."}
              <br />
              <span>
                {"Ce qu'il faut savoir avant de commencer."}
              </span>
            </h2>
            <div className={"faq-aside"}>
              <p>
                {"Vous ne trouvez pas votre réponse ? Notre équipe vous répond dans la journée."}
              </p>
              <Button asChild variant={"link"}>
                <Link href={"/contact"}>
                  {"Contacter l'équipe"}
                  <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
                </Link>
              </Button>
            </div>
          </div>
          <span className={"faq-intro-guide"} data-gutter-guide={"bottom"} aria-hidden={"true"} />
        </header>
        <ul className={"faq-list"}>
          <li className={"faq-item is-open"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q0"} aria-expanded={"true"} aria-controls={"_R_ltavb_-a0"}>
              <span>
                {"Combien coûte Omega ?"}
              </span>
              <span className={"faq-icon"} aria-hidden={"true"}>
                <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} className={"solar solar-alt-arrow-down-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"} aria-hidden={"true"}>
                  <path d={"M4.43057 8.5119C4.70014 8.19741 5.17361 8.16099 5.48811 8.43056L12 14.0122L18.5119 8.43056C18.8264 8.16099 19.2999 8.19741 19.5695 8.51191C19.839 8.8264 19.8026 9.29987 19.4881 9.56944L12.4881 15.5694C12.2072 15.8102 11.7928 15.8102 11.5119 15.5694L4.51192 9.56944C4.19743 9.29987 4.161 8.8264 4.43057 8.5119Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                </svg>
              </span>
            </button>
            <div className={"faq-panel"} id={"_R_ltavb_-a0"} role={"region"} aria-labelledby={"_R_ltavb_-q0"}>
              <div>
                <p>
                  {"Le logiciel coûte 34,90 € HT par personne et par mois. Chaque agent coûte à partir de 199 € HT par mois. L'installation se paie une seule fois. Une automatisation s'installe dès 49 € HT, une fois ; quand l'IA y travaille, chaque tâche se paie ensuite à la pièce, de 0,15 à 0,10 € HT selon la recharge."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q1"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a1"}>
              <span>
                {"Que se passe-t-il si l'offre ne convient pas ?"}
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
                  {"Pour les agents, le remboursement est intégral pendant 30 jours à compter de la mise en service, sans justification à fournir. Au-delà, leur formule mensuelle reste résiliable à tout moment, et l'export complet de vos données vous est remis. Pour le logiciel de gestion, les conditions de sortie sont écrites dans votre devis, avant tout engagement."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q2"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a2"}>
              <span>
                {"Qui s'occupe de l'installation ?"}
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
                  {"Notre équipe vous accompagne du début à la fin. L'IA paramètre le logiciel à partir de la description de votre activité, nous reprenons vos données, et votre expert-comptable vérifie les réglages comptables avant le démarrage. Pour les agents, rien n'est facturé avant la fin de leur installation."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q3"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a3"}>
              <span>
                {"Un agent peut-il envoyer un message sans mon accord ?"}
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
                  {"Non, sauf si vous l'avez autorisé. Par défaut, chaque envoi (relance, réponse, e-mail) est soumis à votre validation. Vous pouvez ensuite autoriser un agent à envoyer seul certains messages, et revenir sur ce choix à tout moment."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q4"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a4"}>
              <span>
                {"Où sont mes données ?"}
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
                  {"Dans un espace dédié à votre entreprise, chiffré, hébergé dans l'Union européenne et jamais mélangé à celui d'un autre client. L'IA ne reçoit que le strict nécessaire à chaque tâche, et rien n'est réutilisé à d'autres fins."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q5"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a5"}>
              <span>
                {"Faut-il remplacer nos outils actuels ?"}
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
                  {"Pas nécessairement. Omega peut remplacer votre logiciel de gestion actuel, avec la reprise de vos données, ou démarrer par des agents connectés à vos outils : Gmail, WhatsApp, Google Sheets, Google Drive, Sage, QuickBooks, HubSpot, entre autres."}
                </p>
              </div>
            </div>
          </li>
          <li className={"faq-item"} data-gutter-guide={"bottom"}>
            <button type={"button"} className={"faq-q"} id={"_R_ltavb_-q6"} aria-expanded={"false"} aria-controls={"_R_ltavb_-a6"}>
              <span>
                {"Pouvez-vous développer un module spécifique ?"}
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
                  {"Oui, c'est l'offre sur mesure. Pendant l'audit, nous étudions votre organisation : qui fait quoi, sur quels logiciels, et qui valide. Vous recevez ensuite une proposition écrite et chiffrée, avant tout engagement."}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
