"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { User } from "lucide-react";
import { cn } from "@/lib/cn";
import "./chat-messages.css";

/* ══════════════════════════════════════════════════════════════════════
   chat-messages — la fenêtre de validation animée (16/09/2026)

   Décalque de la fenêtre « AI Text Generator » de scale.com/data-engine
   (section #build-ai). Le relevé de géométrie et les quatre écarts de
   FORME sont en tête de chat-messages.css ; ici, la MÉCANIQUE et les
   écarts de contenu.

   ── LA MÉCANIQUE, relevée sur la référence ───────────────────────────
   Échantillonnée toutes les 700 ms sur un cycle complet, le 16/09 :

     1  une question se tape caractère par caractère dans une bulle
        claire, à gauche, précédée d'une vignette                (~2,0 s)
     2  une pastille noire cerclée d'un dégradé iridescent apparaît à
        droite et bat « . » « .. » « ... »                       (~2,6 s)
     3  un panneau monte du bas du cadre : un libellé mauve centré et
        TROIS propositions empilées, en pastilles                (~4,2 s)
        — la pastille d'attente RESTE pendant cette étape : relevé dans
        le DOM de la référence, elle ne disparaît qu'à l'étape 4
     4  le panneau disparaît, et la proposition retenue part en message,
        à droite, dans une bulle identique à celle d'entrée      (~2,1 s)
     puis le cycle recommence.

   La référence marque la proposition retenue par une classe de
   transition posée sur elle seule (`transition-[transform,
   background-color,border-color,color]`) sans jamais la jouer dans la
   capture : le geste est ici rendu visible pendant les dernières 900 ms
   de l'étape 3. C'est ce qui fait lire « le système propose, vous
   tranchez » — l'énoncé de la section que cette fenêtre illustre.

   ── LES ÉCARTS DE CONTENU ────────────────────────────────────────────
   · La référence met en scène son propre produit (un modèle de langage
     dont trois réponses sont classées par des annotateurs). Nous mettons
     en scène le nôtre : une demande entrante, trois messages rédigés, et
     VOUS qui tranchez avant l'envoi. Même géométrie, même cadence.
   · Aucun client, aucune donnée réelle : le chrome porte « Exemple ».
   · La vignette du message entrant est une icône, pas la photo d'un
     visage — voir l'écart 2 de la feuille.

   ── ANIMATION ────────────────────────────────────────────────────────
   `motion/react` (convention du dépôt ; `framer-motion` n'est employé
   que par quatre composants plus anciens). Les entrées reprennent les
   durées de la référence — 200 ms pour la pastille, 300 ms pour le
   panneau, `ease-out` dans les deux cas.

   Sous `prefers-reduced-motion`, aucun cycle : la fenêtre s'affiche
   directement à son état final, question posée et message parti. Rien à
   voir bouger, rien à manquer non plus.
   ══════════════════════════════════════════════════════════════════════ */

export interface ChatMessagesProps {
  /** le titre centré du chrome */
  titre: string;
  /** la mention monospace à droite du chrome */
  mention?: string;
  /** le message entrant, tapé caractère par caractère */
  question: string;
  /** le libellé mauve au-dessus des propositions */
  libelleValidation: string;
  /** les trois messages rédigés ; `retenue` sur celui qui part */
  propositions: { texte: string; retenue?: boolean }[];
  /** le message tel qu'il part, une fois validé */
  envoi: string;
  className?: string;
}

type Etape = "frappe" | "reflexion" | "validation" | "envoi";

/* Les durées du cycle, en millisecondes. `FRAPPE` est le pas par
   caractère : 30 ms sur 58 signes donnent les ~1,8 s de la référence. */
const FRAPPE = 30;
const APRES_FRAPPE = 500;
const REFLEXION = 2600;
const VALIDATION = 4200;
const MARQUAGE = 900; // la fin de VALIDATION, pendant laquelle on tranche
const ENVOI = 2200;
const REPRISE = 500;

export function ChatMessages({
  titre,
  mention = "Exemple",
  question,
  libelleValidation,
  propositions,
  envoi,
  className,
}: ChatMessagesProps) {
  const [sobre, setSobre] = useState(false);
  const [vu, setVu] = useState(false);
  const [t, setT] = useState(0);
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => setSobre(mq.matches);
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  /* La scène ne tourne que quand elle est à l'écran. Sans ça, une page
     ouverte sur le hero fait battre trois points pendant dix minutes en
     bas de document — et ce composant rend 33 fois par seconde. */
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => setVu(e[0]?.isIntersecting ?? false), {
      rootMargin: "120px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fin = question.length * FRAPPE;
  const debutReflexion = fin + APRES_FRAPPE;
  const debutValidation = debutReflexion + REFLEXION;
  const debutTranche = debutValidation + VALIDATION - MARQUAGE;
  const debutEnvoi = debutValidation + VALIDATION;
  const CYCLE = debutEnvoi + ENVOI + REPRISE;

  /* UNE horloge, et l'étape se DÉDUIT du temps écoulé.
     La première version enchaînait un minuteur par étape ; en mode strict
     de React, où chaque effet est monté deux fois, deux chaînes partaient
     décalées et la fenêtre jouait deux moments à la fois — la question se
     retapait pendant que le panneau de classement était encore ouvert.
     Un compteur unique ne peut pas se désynchroniser d'avec lui-même. */
  useEffect(() => {
    if (sobre || !vu) return;
    let debut = performance.now();
    const h = setInterval(() => {
      const e = performance.now() - debut;
      if (e >= CYCLE) debut = performance.now();
      setT(e >= CYCLE ? 0 : e);
    }, FRAPPE);
    return () => clearInterval(h);
  }, [sobre, vu, CYCLE]);

  const etape: Etape = sobre
    ? "envoi"
    : t < debutReflexion
      ? "frappe"
      : t < debutValidation
        ? "reflexion"
        : t < debutEnvoi
          ? "validation"
          : "envoi";
  const frappes = sobre ? question.length : Math.min(question.length, Math.floor(t / FRAPPE));
  const tranche = sobre || (t >= debutTranche && t < debutEnvoi);

  const tape = question.slice(0, frappes);
  const enFrappe = !sobre && etape === "frappe" && frappes < question.length;

  return (
    <div ref={cadre} className={cn("cmsg", className)}>
      <div className="cmsg__chrome">
        <span aria-hidden className="cmsg__points">
          <i style={{ background: "#ff5f57" }} />
          <i style={{ background: "#febc2e" }} />
          <i style={{ background: "#28c840" }} />
        </span>
        <span className="cmsg__titre">{titre}</span>
        <span className="cmsg__mention">{mention}</span>
      </div>

      {/* La fenêtre RACONTE ; elle n'annonce rien à qui ne la voit pas.
          `aria-hidden` évite qu'un lecteur d'écran récite trois brouillons
          dont deux sont écartés — l'énoncé de la section, à côté, dit déjà
          ce que la scène montre. */}
      <div aria-hidden className="cmsg__corps">
        <div className="cmsg__bulle cmsg__bulle--entrante">
          <span className="cmsg__vignette">
            <User strokeWidth={2} />
          </span>
          <span className="cmsg__texte">
            {tape}
            {enFrappe ? <i className="cmsg__curseur" /> : null}
          </span>
        </div>

        <div className="cmsg__attente">
          <AnimatePresence>
            {etape === "reflexion" || etape === "validation" ? (
              <motion.div
                key="attente"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="cmsg__anneau"
              >
                <span className="cmsg__souffle">
                  <PointsQuiBattent />
                  <span className="cmsg__disque" />
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {etape === "envoi" ? (
            <motion.div
              key="envoi"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="cmsg__sortie"
            >
              <span className="cmsg__bulle cmsg__bulle--sortante">
                <span className="cmsg__texte">{envoi}</span>
                <span className="cmsg__disque cmsg__disque--grand" />
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {etape === "validation" ? (
            <motion.div
              key="validation"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="cmsg__hote"
            >
              <div className="cmsg__panneau">
                <p className="cmsg__libelle">{libelleValidation}</p>
                <div className="cmsg__propositions">
                  {propositions.map((p) => (
                    <span
                      key={p.texte}
                      className="cmsg__proposition"
                      data-etat={tranche ? (p.retenue ? "retenue" : "ecartee") : undefined}
                    >
                      {p.texte}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* Les trois points de la référence ne sont pas trois pastilles animées
   mais UN texte qui s'allonge : « . », « .. », « ... ». La largeur du bloc
   est fixée dans la feuille pour que la pastille ne respire pas. */
function PointsQuiBattent() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const h = setInterval(() => setN((v) => (v % 3) + 1), 400);
    return () => clearInterval(h);
  }, []);
  return <span className="cmsg__points-attente">{".".repeat(n)}</span>;
}

export default ChatMessages;
