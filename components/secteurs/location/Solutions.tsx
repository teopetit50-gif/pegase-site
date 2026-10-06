"use client";
/* ══════════════════════════════════════════════════════════════════════
   Tavaro — Solutions.tsx

   COPIÉ le 24/09/2026 à 14 h 58 de `OMEGA/rentalos-site/src/components/
   solutions.tsx`. Ce qui change : les imports (relatifs), et c'est tout —
   le composant n'écrit aucun utilitaire Tailwind de thème, sa mise en
   page est dans styles/AgentSolutions.css, scopée sous `.p-location`.

   L'ENTÊTE D'OMEGA. La barre latérale est collante à
   `clamp(5.5rem, 14vh, 8.5rem)` (88 à 136 px), donc déjà sous les 72 px de
   l'entête. Sous 720 px elle devient une bande d'onglets collée à `4rem` :
   64 px, la hauteur de notre entête sur téléphone ; de 640 à 720 px notre
   entête passe à 72 px, location.css la décale d'autant.
   Les liens « Voir le module ↗ » sont des ancres de la page (#moteurs,
   #top) : ils ne déclenchent rien, ils font défiler.
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useScrollSpy } from "./espion-defilement";
import { Miniature } from "./Miniature";
import { SOLUTIONS } from "./textes";
import { ApercuCerveau } from "./apercus/ApercuCerveau";
import { ApercuInactivite } from "./apercus/ApercuFacturation";
import { ApercuRetours } from "./apercus/ApercuRemise";
import { ApercuIncidents } from "./apercus/ApercuAssistance";
import { ApercuRevenus } from "./apercus/ApercuSortie";

/* Les composants gardent le nom de leur écran d'origine (généré) ; l'argumentaire
   du 23/09 les affecte au parking : facturation des retours, remise en location,
   incidents, sortie de flotte. */
const APERCUS: Record<string, () => React.JSX.Element> = {
  brief: ApercuCerveau,
  facturation: ApercuInactivite,
  retours: ApercuRetours,
  incidents: ApercuIncidents,
  flotte: ApercuRevenus,
};

/* Courbe et valeurs relevées dans le bundle de la référence :
   copy  { opacity 0, y 36 } → { 1, 0 } ; scène { opacity 0, y 52, scale .94 } → { 1, 0, 1 }, .95 s. */
const COURBE = [0.22, 1, 0.36, 1] as const;

export function Solutions() {
  const sections = SOLUTIONS.panneaux.map((p) => ({ id: `solution-${p.id}`, label: p.lien }));
  const { activeId, getLinkProps, announce } = useScrollSpy({ sections, offset: 160 });
  const nav = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  /* Sous 720 px la barre latérale devient une bande d'onglets qui défile en largeur :
     quand la section active change, on fait glisser la bande pour centrer l'onglet
     (horizontalement seulement — un scrollIntoView pourrait aussi déplacer la page).
     C'est ce que fait le composant ScrollSpy de 21st.dev avec ses puces. */
  useEffect(() => {
    const n = nav.current;
    if (!n || n.scrollWidth <= n.clientWidth + 1) return;
    const a = n.querySelector<HTMLElement>(`a[href="#${activeId}"]`);
    if (!a) return;
    const gauche = a.offsetLeft - (n.clientWidth - a.offsetWidth) / 2;
    n.scrollTo({ left: Math.max(0, gauche), behavior: reduced ? "auto" : "smooth" });
  }, [activeId, reduced]);

  return (
    <section id="solutions" className="AgentSolutions_section" aria-labelledby="solutions-title">
      <div className="page-container wide">
        <motion.header
          className="AgentSolutions_sectionIntro"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, ease: COURBE }}
        >
          <h2 id="solutions-title" className="section-label">{SOLUTIONS.etiquette}</h2>
        </motion.header>
        <div className="AgentSolutions_showcase">
          <aside className="AgentSolutions_sidebar">
            <div className="AgentSolutions_sidebarInner">
              <motion.p
                className="f-onest AgentSolutions_sidebarKicker"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: COURBE }}
              >
                {SOLUTIONS.kicker}
              </motion.p>
              <nav aria-label="Solutions" ref={nav}>
                {sections.map((s, i) => (
                  <motion.a
                    key={s.id}
                    {...getLinkProps(s.id)}
                    className="f-onest AgentSolutions_sidebarLink"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: activeId === s.id ? 4 : 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.06 * i, ease: COURBE }}
                  >
                    {s.label}
                  </motion.a>
                ))}
              </nav>
              <p aria-live="polite" className="sr-only">{announce}</p>
            </div>
          </aside>
          <div className="AgentSolutions_panels">
            {SOLUTIONS.panneaux.map((p) => {
              const Apercu = APERCUS[p.id];
              const actif = activeId === `solution-${p.id}`;
              return (
                <article key={p.id} id={`solution-${p.id}`} className="AgentSolutions_panel" data-agent-panel="true" data-in-view={actif}>
                  <motion.header
                    className="AgentSolutions_panelCopy"
                    initial={{ opacity: 0, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8, ease: COURBE }}
                  >
                    {p.kicker ? <p className="f-onest AgentSolutions_panelKicker">{p.kicker}</p> : null}
                    <div className="AgentSolutions_panelMeta">
                      <h3 className="f-onest AgentSolutions_panelHeadline">{p.titre}</h3>
                      <a className="f-onest AgentSolutions_panelLink" href={p.lienHref}>
                        {p.lienTexte} <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                    <p className="f-onest AgentSolutions_panelSummary">{p.resume}</p>
                    <ul className="f-onest AgentSolutions_overviewPoints" aria-label={p.titre}>
                      {p.points.map((pt) => <li key={pt}>{pt}</li>)}
                    </ul>
                  </motion.header>
                  <motion.div
                    className="AgentSolutions_visualStage"
                    initial={{ opacity: 0, y: 52, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.95, delay: 0.12, ease: COURBE }}
                  >
                    <Miniature naturel={1040}>
                      <Apercu />
                    </Miniature>
                  </motion.div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
