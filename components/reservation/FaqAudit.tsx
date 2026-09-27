"use client";

import { useId, useMemo, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ArrowRight, ArrowUpRight, MessageCircleQuestionMark, Plus, Search, X } from "lucide-react";
import Lien from "@/components/Lien";
import type { QuestionFaq, ThemeFaq } from "@/lib/reservation";
import "./FaqAudit.css";

/* ══════════════════════════════════════════════════════════════════════
   <FaqAudit> — « Questions fréquentes », /reserver-un-audit
   (27/09/2026, remplace <QuestionsAudit> du matin)

   Teo, sur capture de la FAQ à deux colonnes : « pareil pour le
   questionnaire, trouves-en un plus détaillé et pro ».

   ORIGINE. `faq-block` de @preetsuthar17 sur 21st.dev (registre ouvert,
   lu le 27/09) : un panneau avec un champ de recherche qui filtre les
   questions en direct, l'accordéon, un état « aucun résultat », et des
   suggestions en pied. S'y ajoutent deux gestes vus sur le même
   registre : les NUMÉROS de @jatin-yadav05 (`interactive-accordion` :
   « 01 » dans une pastille qui passe au noir quand la réponse s'ouvre, un
   « + » qui tourne en « × ») et la BARRE DE CONTACT de @ln-dev7
   (`faqs-01` : « Still have a question? », pastille sombre, bouton).

   CE QUI EST JETÉ, et pourquoi —
   · les pouces « Was this helpful? » et leur zone de commentaire : rien ne
     les recueille ; un bouton qui ne mène nulle part est une panne ;
   · l'« assistant IA » de l'état vide (une réponse simulée par un
     minuteur) : à la place, l'offre de poser la question, à laquelle nous
     répondons vraiment le jour même ;
   · les suggestions tirées au hasard : ce sont ici les questions du même
     thème, et des liens vers les pages qui en disent plus.

   CE QUI S'AJOUTE : les THÈMES (lib/reservation.ts, champ `theme`), en
   filtre avec leur compte, et les liens « pour aller plus loin » de chaque
   réponse (champ `liens`). La recherche ignore les accents et la casse, et
   surligne le mot trouvé dans les questions.

   Les questions arrivent en PROPS depuis la page (serveur) : importer
   lib/reservation ici ferait entrer le catalogue des modèles, qu'une
   réponse cite, dans le paquet du navigateur.
   ══════════════════════════════════════════════════════════════════════ */

const THEMES: ThemeFaq[] = ["Conditions", "Déroulé", "Confidentialité", "Financement", "Périmètre"];

/* minuscules sans accents, caractère par caractère : la chaîne garde la
   même longueur, ce qui permet de surligner dans le texte d'origine */
const plat = (t: string) =>
  [...t].map((c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().slice(0, 1) || c).join("");

function Surligne({ texte, cherche }: { texte: string; cherche: string }) {
  const q = plat(cherche.trim());
  if (q.length < 2) return <>{texte}</>;
  const t = plat(texte);
  const morceaux: React.ReactNode[] = [];
  let depuis = 0;
  let i = t.indexOf(q);
  while (i !== -1) {
    if (i > depuis) morceaux.push(texte.slice(depuis, i));
    morceaux.push(
      <mark key={i} className="qf-marque">
        {texte.slice(i, i + q.length)}
      </mark>,
    );
    depuis = i + q.length;
    i = t.indexOf(q, depuis);
  }
  morceaux.push(texte.slice(depuis));
  return <>{morceaux}</>;
}

export default function FaqAudit({
  questions,
  contact,
}: {
  questions: QuestionFaq[];
  contact: string;
}) {
  const [theme, setTheme] = useState<ThemeFaq | null>(null);
  const [cherche, setCherche] = useState("");
  const [ouverte, setOuverte] = useState("");
  const idRecherche = useId();

  /* le numéro d'une question ne change pas quand on filtre : « 06 » reste
     la sixième, comme dans un sommaire */
  const numerotees = useMemo(
    () => questions.map((q, i) => ({ ...q, n: String(i + 1).padStart(2, "0") })),
    [questions],
  );
  const q = plat(cherche.trim());
  const visibles = numerotees.filter(
    (f) =>
      (!theme || f.theme === theme) &&
      (!q || plat(`${f.q} ${f.r.join(" ")} ${f.theme}`).includes(q)),
  );
  const compte = (t: ThemeFaq) => questions.filter((f) => f.theme === t).length;

  const resume =
    q.length > 0
      ? `${visibles.length} résultat${visibles.length > 1 ? "s" : ""} pour « ${cherche.trim()} »`
      : `${visibles.length} question${visibles.length > 1 ? "s" : ""}${theme ? ` · ${theme}` : ""}`;

  /* les autres questions du thème de celle qui est ouverte */
  const ouverteQ = numerotees.find((f) => f.n === ouverte);
  const memeTheme = ouverteQ
    ? numerotees.filter((f) => f.theme === ouverteQ.theme && f.n !== ouverteQ.n)
    : [];

  return (
    <section id="faq" data-monde="clair" className="r-blanc qf">
      <div className="r-wrap py-12 sm:py-24">
        <div className="qf-grille">
          {/* ═══ colonne de gauche : titre, thèmes, contact ═══ */}
          <div className="qf-gauche">
            <span className="qf-pastille">FAQ</span>
            <h2 className="r-h3 qf-titre">Questions fréquentes</h2>
            <p className="qf-intro">
              Ce qu&apos;on nous demande avant de réserver, rangé par thème.
              Cherchez un mot, ou choisissez un thème.
            </p>

            <div className="qf-themes" role="group" aria-label="Filtrer par thème">
              <button
                type="button"
                className="qf-theme"
                aria-pressed={theme === null}
                onClick={() => setTheme(null)}
              >
                <span>Toutes</span>
                <span className="num qf-theme-compte">{questions.length}</span>
              </button>
              {THEMES.filter((t) => compte(t) > 0).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="qf-theme"
                  aria-pressed={theme === t}
                  onClick={() => setTheme(theme === t ? null : t)}
                >
                  <span>{t}</span>
                  <span className="num qf-theme-compte">{compte(t)}</span>
                </button>
              ))}
            </div>

            <div className="qf-contact qf-contact--gauche">
              <Contact contact={contact} />
            </div>
          </div>

          {/* ═══ colonne de droite : recherche, questions ═══ */}
          <div className="qf-droite">
            <div className="qf-recherche">
              <Search aria-hidden strokeWidth={1.8} className="qf-recherche-icone" />
              <label htmlFor={idRecherche} className="sr-only">
                Rechercher une question
              </label>
              <input
                id={idRecherche}
                type="search"
                value={cherche}
                onChange={(e) => setCherche(e.target.value)}
                placeholder="Rechercher : gratuit, Chèque TIC…"
                className="qf-champ"
                autoComplete="off"
              />
              {cherche ? (
                <button
                  type="button"
                  className="qf-effacer"
                  aria-label="Effacer la recherche"
                  onClick={() => setCherche("")}
                >
                  <X aria-hidden strokeWidth={1.8} />
                </button>
              ) : null}
            </div>
            <p className="qf-resume" aria-live="polite">
              {resume}
            </p>

            {visibles.length === 0 ? (
              <div className="qf-vide">
                <p className="qf-vide-titre">Aucune question ne correspond.</p>
                <p className="qf-vide-texte">
                  Posez-la nous directement&nbsp;: nous répondons le jour même, y
                  compris pour dire non.
                </p>
                <Lien href={contact} className="r-btn r-btn--noir qf-vide-btn">
                  Poser ma question
                </Lien>
              </div>
            ) : (
              <Accordion.Root
                type="single"
                collapsible
                value={ouverte}
                onValueChange={setOuverte}
                className="qf-liste"
              >
                {visibles.map((f) => (
                  <Accordion.Item key={f.n} value={f.n} className="qf-item">
                    <Accordion.Header className="qf-entete">
                      <Accordion.Trigger className="qf-question">
                        <span aria-hidden className="num qf-numero">
                          {f.n}
                        </span>
                        <span className="qf-question-texte">
                          <Surligne texte={f.q} cherche={cherche} />
                        </span>
                        <span className="qf-tag">{f.theme}</span>
                        <Plus aria-hidden strokeWidth={1.6} className="qf-signe" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="qf-contenu">
                      <div className="qf-reponse">
                        {f.r.map((p, j) => (
                          <p key={j}>{p}</p>
                        ))}
                        {f.liens && f.liens.length > 0 ? (
                          <div className="qf-liens">
                            <span className="qf-liens-titre">Pour aller plus loin</span>
                            {f.liens.map((l) => (
                              <Lien key={l.href} href={l.href} className="qf-lien">
                                {l.label}
                                <ArrowUpRight aria-hidden strokeWidth={1.8} />
                              </Lien>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            )}

            {/* les autres questions du thème de la réponse ouverte */}
            {memeTheme.length > 0 ? (
              <div className="qf-suggestions">
                <p className="qf-suggestions-titre">Dans le même thème</p>
                <ul>
                  {memeTheme.map((f) => (
                    <li key={f.n}>
                      <button
                        type="button"
                        className="qf-suggestion"
                        onClick={() => {
                          setTheme(null);
                          setCherche("");
                          setOuverte(f.n);
                        }}
                      >
                        <span className="num qf-suggestion-numero">{f.n}</span>
                        {f.q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="qf-contact qf-contact--bas">
              <Contact contact={contact} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* la barre de contact de `faqs-01` : pastille sombre, deux lignes, bouton */
function Contact({ contact }: { contact: string }) {
  return (
    <div className="qf-contact-corps">
      <span aria-hidden className="qf-contact-icone">
        <MessageCircleQuestionMark strokeWidth={1.8} />
      </span>
      <span className="qf-contact-texte">
        <span className="qf-contact-titre">Une autre question&nbsp;?</span>
        <span className="qf-contact-sous">Nous répondons le jour même.</span>
      </span>
      <Lien href={contact} className="r-btn r-btn--noir qf-contact-btn">
        Poser une question
        <ArrowRight aria-hidden strokeWidth={1.8} />
      </Lien>
    </div>
  );
}
