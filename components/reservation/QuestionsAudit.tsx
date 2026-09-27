import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, MessageCircleQuestionMark } from "lucide-react";
import Lien from "@/components/Lien";
import { FAQ, lienContact } from "@/lib/reservation";
import "./QuestionsAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <QuestionsAudit> — « Questions fréquentes », /reserver-un-audit
   (27/09/2026, remplace les <details> du 26/07)

   ORIGINE. `faq-section` de @tommyjepsen sur 21st.dev (registre ouvert,
   lu le 27/09), sur l'accordéon shadcn : deux colonnes — à gauche une
   pastille, le titre, une phrase et un bouton de contact ; à droite
   l'accordéon, une question par ligne, un chevron qui se retourne.

   CE QUI EST REPRIS : la composition à deux colonnes, la colonne de
   gauche et son bouton de contact (elle reste collante au défilement,
   comme le titre de la version d'avant), l'accordéon Radix à une seule
   réponse ouverte, le chevron.

   CE QUI CHANGE : les classes `animate-accordion-*` de shadcn n'existent
   pas dans ce projet (pas de tw-animate) — les deux @keyframes de hauteur
   sont écrites dans la feuille, sur le modèle de FaqSite.css.

   L'ancre #faq est gardée : ServiceDetail y renvoie
   (/reserver-un-audit#faq).
   ══════════════════════════════════════════════════════════════════════ */

export default function QuestionsAudit() {
  return (
    <section id="faq" data-monde="clair" className="r-blanc qa">
      <div className="r-wrap py-12 sm:py-24">
        <div className="qa-grille">
          <div className="qa-gauche">
            <span className="qa-pastille">FAQ</span>
            <h2 className="r-h3 qa-titre">Questions fréquentes</h2>
            <p className="qa-texte">
              Ce qu&apos;on nous demande le plus souvent avant de réserver. Une
              autre question&nbsp;? Nous répondons le jour même.
            </p>
            <Lien href={lienContact("avant")} className="r-btn r-btn--fil qa-contact">
              Poser une question
              <MessageCircleQuestionMark aria-hidden strokeWidth={1.6} className="qa-contact-icone" />
            </Lien>
          </div>

          <Accordion.Root type="single" collapsible className="qa-liste">
            {FAQ.map((f, i) => (
              <Accordion.Item key={f.q} value={`qa-${i}`} className="qa-item">
                {/* Accordion.Header rend un <h3> */}
                <Accordion.Header className="qa-entete">
                  <Accordion.Trigger className="qa-question">
                    <span>{f.q}</span>
                    <ChevronDown aria-hidden strokeWidth={1.6} className="qa-chevron" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="qa-contenu">
                  <div className="qa-reponse">
                    {f.r.map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </div>
    </section>
  );
}
