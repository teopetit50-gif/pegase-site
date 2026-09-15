"use client";

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import "./GestesAppareil.css";

/* ══════════════════════════════════════════════════════════════════════
   <GestesAppareil> — « Selon votre appareil » de /application (15/09/2026)

   ORIGINE. `features-section-demo-2` d'Aceternity. Les deux autres pistes
   du brief ont été lues et écartées : `features-section-demo-3` est un
   bento de quatre cellules INÉGALES qui n'existent que pour leur vignette
   (globe `cobe`, Unsplash, YouTube, `@tabler/icons-react`) — aucune n'est
   une marche, et rien n'y tient sans deux paquets de plus ; `reactbits/
   Stepper` est un ASSISTANT (une étape à la fois, Précédent / Continuer)
   qui CACHE les marches derrière une navigation, quand un mode d'emploi se
   lit d'un coup — et il ne peut pas laisser les trois suites dans le HTML.
   demo-2 aligne des éléments JUMEAUX « filet à gauche + titre + texte » :
   la forme même d'une marche. Son filet, qui MARQUE un élément chez la
   source, devient ici celui qui RELIE les pastilles.

   POURQUOI ICI. La section alignait les trois appareils bout à bout : neuf
   marches à faire défiler sur téléphone, dont six pour un autre appareil.

   CE QUI EST JETÉ. Tout le dessin de demo-2 : `dark:`, le dégradé au
   survol, l'accent `bg-blue-500`, la translation du titre au survol (une
   marche ne se survole pas), `@tabler/icons-react`, `cn`, les bordures
   posées par calcul d'index. Du Stepper : boutons, état de complétion,
   `motion`. Les textes, eux, sont ceux de la page au mot près : GESTES est
   repris tel quel d'app/application/page.tsx, fragments compris.

   ÉCARTS ASSUMÉS.
   • LES TROIS SUITES SONT DANS LE HTML : les panneaux non choisis portent
     `hidden`, jamais un rendu conditionnel — Google lit les neuf marches et
     les trois <h3>. Sans JavaScript, le <noscript> de fin déplie les trois
     panneaux et retire la rangée : on retombe sur la page d'avant.
   • AUCUNE DÉTECTION DE L'APPAREIL, ni au rendu (hydratation) ni dans un
     effet : `react-hooks/set-state-in-effect` est en ERREUR ici, et
     pré-sélectionner un onglet, c'est poser un état depuis un effet.
   • La pastille glisse SANS mesure : trois colonnes égales, `--gst-i` en
     style en ligne, `translateX(i × 100 %)` ; repli CSS 0, donc elle est
     sous « Android » même sans JavaScript.
   • Un panneau EST la carte d'avant : `.ap-carte`, `.ap-sous`, `.ap-etapes`,
     `.ap-etape`, `.ap-num`, `.r-h4` viennent de globals.css. Une seule
     apparition : le `[data-reveal]` de la page, sur le bloc.
   ══════════════════════════════════════════════════════════════════════ */

type Geste = {
  id: string;
  titre: string;
  sousTitre: string;
  etapes: ReactNode[];
};

/* les trois gestes, dans l'ordre où on nous les demande : le téléphone
   d'abord (Android, puis iPhone), l'ordinateur ensuite (08/09, seconde
   passe). Chacun commence sur app.omegaai.fr/installer — la page
   d'installation du cockpit, publique, qui montre le bouton quand le
   navigateur le permet. */
const GESTES: Geste[] = [
  {
    id: "android",
    titre: "Android",
    sousTitre: "Chrome, Samsung Internet ou Edge",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Chrome.</>,
      <>
        Touchez <strong>«&nbsp;Installer Omega&nbsp;»</strong>. S&apos;il n&apos;y a pas de
        bouton&nbsp;: menu <strong>⋮</strong>{" "}en haut à droite, puis{" "}
        <strong>«&nbsp;Ajouter à l&apos;écran d&apos;accueil&nbsp;»</strong>{" "}
        (ou <strong>«&nbsp;Installer l&apos;application&nbsp;»</strong>).
      </>,
      <>Confirmez. L&apos;icône Omega est sur votre écran d&apos;accueil.</>,
    ],
  },
  {
    id: "iphone",
    titre: "iPhone / iPad",
    sousTitre: "Safari",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Safari.</>,
      <>
        Touchez le bouton <strong>Partager</strong>{" "}
        (le carré avec une flèche&nbsp;: en bas au milieu sur iPhone, en haut à droite sur iPad),
        puis <strong>«&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;»</strong>.
      </>,
      <>
        Touchez <strong>«&nbsp;Ajouter&nbsp;»</strong>, en haut à droite. Omega apparaît parmi vos
        applications.
      </>,
    ],
  },
  {
    id: "ordinateur",
    titre: "Ordinateur",
    sousTitre: "Windows et Mac, Chrome ou Edge",
    etapes: [
      <>Ouvrez app.omegaai.fr/installer dans Chrome ou Edge.</>,
      <>
        Cliquez <strong>«&nbsp;Installer Omega&nbsp;»</strong>{" "}
        (ou la petite icône d&apos;installation à droite de la barre d&apos;adresse).
      </>,
      <>
        Confirmez. Omega s&apos;ouvre dans sa fenêtre, avec son icône dans le menu Démarrer et la
        barre des tâches — le Dock sur Mac.
      </>,
    ],
  },
];

/* Sans JavaScript, les onglets ne servent à rien et deux suites sur trois
   resteraient invisibles : la feuille du <noscript> retire la rangée et
   déplie les trois panneaux. Elle est posée dans le corps du document,
   donc APRÈS la feuille du composant (qui part dans <head>) : à
   spécificité égale, c'est elle qui l'emporte, sans !important.
   `dangerouslySetInnerHTML` et non des enfants JSX : quand le script est
   actif, le navigateur parse le contenu de <noscript> comme du TEXTE, et
   React attendrait un élément <style> — l'hydratation divergerait. */
const SANS_JS =
  ".resa .gst-onglets{display:none}.resa .gst-panneau[hidden]{display:block}";

export default function GestesAppareil() {
  /* ids stables entre le serveur et le client, et sans collision si le
     bloc venait à être posé deux fois sur la même page */
  const uid = useId();
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);

  const choisir = (i: number) => {
    setActif(i);
    onglets.current[i]?.focus();
  };

  /* clavier attendu d'un role="tablist" : flèches, Début, Fin. Activation
     automatique — le panneau suit le focus, il n'y a rien à charger. */
  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = GESTES.length;
    let cible: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        cible = (i + 1) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        cible = (i - 1 + n) % n;
        break;
      case "Home":
        cible = 0;
        break;
      case "End":
        cible = n - 1;
        break;
    }
    if (cible === null) return;
    e.preventDefault();
    choisir(cible);
  };

  return (
    <div data-reveal className="gst-bloc">
      <div
        className="gst-onglets"
        role="tablist"
        aria-label="Votre appareil"
        style={{ "--gst-i": String(actif) } as CSSProperties}
      >
        <span aria-hidden="true" className="gst-pastille" />
        {GESTES.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => {
              onglets.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-onglet-${g.id}`}
            aria-selected={i === actif}
            aria-controls={`${uid}-panneau-${g.id}`}
            tabIndex={i === actif ? 0 : -1}
            onClick={() => setActif(i)}
            onKeyDown={(e) => clavier(e, i)}
            className="gst-onglet"
          >
            {g.titre}
          </button>
        ))}
      </div>

      {/* les TROIS panneaux sont rendus : `hidden` fait le choix, jamais un
          rendu conditionnel — voir l'en-tête. tabIndex 0 parce qu'un
          panneau ne contient aucun élément focalisable (règle APG). */}
      {GESTES.map((g, i) => (
        <div
          key={g.id}
          id={`${uid}-panneau-${g.id}`}
          role="tabpanel"
          aria-labelledby={`${uid}-onglet-${g.id}`}
          hidden={i !== actif}
          tabIndex={0}
          className="ap-carte gst-panneau"
        >
          <h3 className="r-h4">{g.titre}</h3>
          <p className="ap-sous">{g.sousTitre}</p>
          <ol className="ap-etapes">
            {g.etapes.map((e, j) => (
              <li key={j} className="ap-etape gst-etape">
                <span className="ap-num" aria-hidden="true">
                  {j + 1}
                </span>
                <span>{e}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}

      <noscript dangerouslySetInnerHTML={{ __html: `<style>${SANS_JS}</style>` }} />
    </div>
  );
}
