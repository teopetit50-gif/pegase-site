"use client";

import { useId, useState, type ReactNode } from "react";
import Pastille from "./Pastille";

/* La FAQ de l'accueil : l'intro à gauche (collante), les questions à
   droite ; une seule réponse ouverte à la fois, re-cliquer referme. */
export type QuestionFaq = { q: string; r: ReactNode };

export default function Faq({
  pastille = "FAQ",
  titre,
  suite,
  aparte,
  action,
  questions,
  id = "faq",
}: {
  pastille?: ReactNode;
  titre: ReactNode;
  suite?: ReactNode;
  aparte?: ReactNode;
  action?: ReactNode;
  questions: QuestionFaq[];
  id?: string;
}) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [ouverte, setOuverte] = useState<number | null>(0);
  return (
    <section className="ch-section" id={id}>
      <div className="ch-faq" data-gutter-guide="bottom">
        <header className="ch-intro">
          <div className="ch-faq-intro">
            <Pastille>{pastille}</Pastille>
            <h2 className="ch-titre">
              {titre}
              {suite && (
                <>
                  <br />
                  <span>{suite}</span>
                </>
              )}
            </h2>
            {(aparte || action) && (
              <div className="ch-faq-aside">
                {aparte && <p>{aparte}</p>}
                {action}
              </div>
            )}
          </div>
        </header>
        <ul>
          {questions.map((item, i) => {
            const open = ouverte === i;
            return (
              <li key={item.q} className={`ch-faq-item${open ? " is-open" : ""}`} data-gutter-guide="bottom">
                <button
                  type="button"
                  className="ch-faq-q"
                  id={`${base}-q${i}`}
                  aria-expanded={open}
                  aria-controls={`${base}-r${i}`}
                  onClick={() => setOuverte(open ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="ch-faq-icone" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
                <div className="ch-faq-panneau" id={`${base}-r${i}`} role="region" aria-labelledby={`${base}-q${i}`} inert={!open}>
                  <div>
                    <p>{item.r}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
