"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ImageIcon, Lock } from "lucide-react";
import MiniSite from "@/components/modeles/MiniSite";
import { CATEGORIES, MODELES, parCategorie } from "@/components/modeles/donnees";
import { cn } from "@/lib/cn";
import "./EtapesDefilantes.css";

/* ══════════════════════════════════════════════════════════════════════
   <EtapesDefilantes> — le déroulé de /tarifs/site, à volet collant
   (14/09/2026)

   ORIGINE. « Sticky Scroll Reveal » d'Aceternity UI
   (aceternity/sticky-scroll-reveal, ui.aceternity.com) : les paragraphes
   défilent à gauche, celui qui passe au centre s'allume pendant que les
   autres retombent à 30 % d'opacité, et un bloc COLLANT à droite change
   de contenu au même instant. Son idée réelle, et la seule qu'on garde :
   un texte qui progresse et une illustration qui répond, sans que le
   lecteur ait quoi que ce soit à cliquer.

   POURQUOI ICI. Les quatre étapes tenaient en quatre colonnes de texte
   sous un filet : à 1440 elles se lisent d'un coup, donc comme quatre
   options simultanées, alors que le déroulé est une SUITE — on n'écrit
   pas avant d'avoir le brief. Surtout, aucune des quatre ne MONTRAIT quoi
   que ce soit : « Le modèle », « Le brief », « L'écriture » restaient des
   mots. Le volet donne à chacune sa maquette, et la page cesse de
   promettre pour se contenter de montrer.

   CE QUI EST JETÉ.
   1. `h-[30rem] overflow-y-auto` : la source enferme tout dans un
      ascenseur DANS la page — deux barres de défilement imbriquées, le
      piège d'ergonomie de ce composant. Ici c'est la fenêtre qui défile ;
      l'étape courante se lit d'un IntersectionObserver dont la racine est
      réduite aux 20 % du milieu de l'écran (rootMargin -40 % / -40 %).
   2. Les fonds cyan → emerald, pink → indigo, orange → yellow, et le
      `backgroundColor` animé slate-900 / noir / neutral-900 : le monde de
      la page est blanc, quasi monochrome, sans un dégradé.
   3. `useScroll` + `useMotionValueEvent` : un rapport de progression
      global découpé en tranches égales ne sait pas où commence une étape.
      L'observateur, lui, raisonne sur la position réelle de chaque bloc,
      quelle que soit la hauteur de son texte.
   4. `content[activeCard].content` remplacé en place : le contenu sautait
      d'un coup et la hauteur avec. Ici les quatre maquettes sont des
      calques superposés dans une carte de hauteur fixe — fondu croisé de
      400 ms, aucun saut.
   5. `text-slate-100` / `text-2xl font-bold` : la charte a .o-h4, .o-small
      et ses jetons.

   ÉCARTS ASSUMÉS.
   · Sous 64 rem les maquettes ne sont pas affichées : à 390 px, une
     mosaïque de quatre vitrines ou deux colonnes de fausses lignes ne se
     lisent plus. Les étapes deviennent des cartes numérotées, toutes en
     encre pleine — elles sont décoratives (aria-hidden), rien ne se perd.
   · Trois modes, un seul balisage (data-mode) : « repos » au premier
     rendu ET si JavaScript ne s'exécute pas — aucune étape n'est éteinte
     tant que le composant ne pilote pas vraiment l'étape courante ;
     « defile » une fois monté ; « pose » sous prefers-reduced-motion,
     où les étapes s'empilent chacune avec sa maquette et où plus rien ne
     bouge. matchMedia n'est lu qu'en effet, jamais au rendu.
   · Les quatre vitrines de la maquette 01 sont les VRAIES captures du
     catalogue (le premier modèle de chaque famille de CATEGORIES), pas
     des rectangles gris : c'est ce que le visiteur verra sur /modeles.
   · Les trois autres maquettes sont en HTML/CSS, sans une image et sans
     un chiffre : un formulaire rempli, deux colonnes de texte, une barre
     d'adresse à « votre-nom.fr » — l'adresse fictive est la seule donnée
     inventée de la section.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— le déroulé, tel que /site/commande l'annonce lui-même ——— */
const ETAPES = [
  {
    n: "01",
    titre: "Le modèle",
    sousTitre: "Choisir l'allure du site",
    texte:
      `Les ${MODELES.length} modèles sont en ligne : vous les consultez et retenez celui qui vous ressemble. Le design change d'un modèle à l'autre ; ce qu'il y a derrière, jamais.`,
  },
  {
    n: "02",
    titre: "Le brief",
    sousTitre: "Votre activité, votre marque, vos visuels",
    texte:
      "Depuis votre compte, sans quitter la page : ce que vous faites, pour qui, vos adresses et vos visuels. Rien à payer en ligne aujourd'hui ; nous vous appelons pour régler et lancer la production.",
  },
  {
    n: "03",
    titre: "L'écriture",
    sousTitre: "Tout le contenu, réécrit en français",
    texte:
      "Chaque page est réécrite à votre métier et à votre marque, vos coordonnées et vos visuels en place. Rien de ce que montre le modèle ne reste tel quel.",
  },
  {
    n: "04",
    titre: "La mise en ligne",
    sousTitre: "Sous votre nom, domaine compris",
    texte:
      "Le site vous appartient dès le premier jour, domaine compris. Le formulaire est branché : dès qu'un poste est en service chez vous, chaque demande reçue entre dans le circuit, et ce que le site enregistre vous revient en clair.",
  },
];

/* ——— les quatre vitrines de la maquette 01 : le premier modèle de chaque
   famille du catalogue, dans l'ordre de CATEGORIES ——— */
const VITRINES = CATEGORIES.map((c) => parCategorie(c.cle)[0]);

/* ——— les fausses lignes de la maquette 03 : trois paragraphes de quatre
   lignes, largeurs en pour-cent, différentes d'une colonne à l'autre —
   deux colonnes aux mêmes longueurs se liraient comme une copie ——— */
const LIGNES_MODELE = [
  [100, 94, 88, 62],
  [100, 90, 96, 46],
  [96, 100, 84, 70],
];
const LIGNES_VOTRE = [
  [100, 88, 95, 54],
  [92, 100, 86, 68],
  [100, 93, 78, 58],
];

const TROIS = ["a", "b", "c"];

/* ══ 01 · LE MODÈLE — quatre vitrines du catalogue, l'une cerclée d'encre ══ */
function MaqModele() {
  return (
    <div className="ed-maq ed-maq--modele">
      <div className="ed-mosaique">
        {VITRINES.map((m, i) => (
          <div key={m.slug} className="ed-vignette" data-retenu={i === 0 ? "oui" : "non"}>
            <MiniSite m={m} ton="clair" sizes="175px" />
            {i === 0 && (
              <span className="ed-retenu">
                <Check size={10} strokeWidth={2.5} />
                Retenu
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ 02 · LE BRIEF — le formulaire du compte, trois champs remplis ══ */
function MaqBrief() {
  return (
    <div className="ed-maq ed-maq--brief">
      <p className="ed-maq-tete">Votre brief</p>
      <div className="ed-champ">
        <span className="ed-etiquette">Activité</span>
        <span className="ed-valeur">Négoce de matériaux</span>
      </div>
      <div className="ed-champ">
        <span className="ed-etiquette">Adresses</span>
        <span className="ed-valeur">Trois points de vente, horaires par site</span>
      </div>
      <div className="ed-champ">
        <span className="ed-etiquette">Visuels</span>
        <span className="ed-photos">
          {TROIS.map((k) => (
            <span key={k} className="ed-photo">
              <ImageIcon size={14} strokeWidth={1.5} />
            </span>
          ))}
        </span>
      </div>
      <span className="ed-envoi">Envoyer le brief</span>
    </div>
  );
}

/* ══ 03 · L'ÉCRITURE — le texte du modèle à gauche, le vôtre à droite ══ */
function MaqEcriture() {
  return (
    <div className="ed-maq ed-maq--ecriture">
      <div className="ed-colonnes">
        <div className="ed-colonne">
          <p className="ed-maq-tete">Texte du modèle</p>
          {LIGNES_MODELE.map((para, p) => (
            <div key={p} className="ed-para">
              {para.map((l, k) => (
                <span key={k} className="ed-ligne" style={{ width: `${l}%` }} />
              ))}
            </div>
          ))}
        </div>
        <span className="ed-fleche">
          <ArrowRight size={14} strokeWidth={1.8} />
        </span>
        <div className="ed-colonne">
          <p className="ed-maq-tete">
            Votre texte
            <span className="ed-badge">réécrit</span>
          </p>
          {LIGNES_VOTRE.map((para, p) => (
            <div key={p} className="ed-para">
              {para.map((l, k) => (
                <span key={k} className="ed-ligne ed-ligne--encre" style={{ width: `${l}%` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ 04 · LA MISE EN LIGNE — le site sous votre nom ══ */
function MaqEnLigne() {
  return (
    <div className="ed-maq ed-maq--ligne">
      <div className="ed-barre">
        <span className="ed-pastilles">
          {TROIS.map((k) => (
            <i key={k} />
          ))}
        </span>
        <span className="ed-url">
          <Lock size={10} strokeWidth={2.2} />
          votre-nom.fr
        </span>
      </div>
      <div className="ed-page">
        <div className="ed-page-tete">
          <span className="ed-logo" />
          <span className="ed-nav">
            {TROIS.map((k) => (
              <i key={k} />
            ))}
          </span>
        </div>
        <span className="ed-faux-titre" />
        <span className="ed-ligne" style={{ width: "92%" }} />
        <span className="ed-ligne" style={{ width: "74%" }} />
        <span className="ed-faux-cta" />
      </div>
      <div className="ed-pied">
        <span className="ed-etat">
          <i className="ed-point" />
          En ligne
        </span>
        <span className="ed-note">domaine à votre nom</span>
      </div>
    </div>
  );
}

const MAQUETTES = [MaqModele, MaqBrief, MaqEcriture, MaqEnLigne];

/* un calque de la carte : les quatre coexistent, superposés, seul celui de
   l'étape courante est peint — la hauteur ne bouge donc jamais. */
function Calque({ rang, vif }: { rang: number; vif: boolean }) {
  const Maquette = MAQUETTES[rang];
  return (
    <div className="ed-calque" data-vif={vif ? "oui" : "non"}>
      <Maquette />
    </div>
  );
}

type Mode = "repos" | "defile" | "pose";

export default function EtapesDefilantes({ className }: { className?: string }) {
  /* « repos » au rendu serveur comme au premier rendu client : aucune
     étape éteinte, aucune mesure lue. Le mode définitif est décidé en
     effet — c'est là, et seulement là, qu'on a le droit de lire
     matchMedia. */
  const [mode, setMode] = useState<Mode>("repos");
  const [actif, setActif] = useState(0);
  const cellules = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => setMode(mq.matches ? "pose" : "defile");
    lire();
    mq.addEventListener("change", lire);
    return () => mq.removeEventListener("change", lire);
  }, []);

  /* L'étape courante est celle qui croise la bande des 20 % du milieu de
     la fenêtre (rootMargin -40 % / -40 %). Quand deux étapes s'y trouvent
     — le temps d'une transition — c'est la plus HAUTE qui l'emporte : la
     lecture descend et remonte alors de la même façon. Quand aucune n'y
     est (avant la section, après elle), on garde la dernière connue. */
  useEffect(() => {
    if (mode !== "defile") return;
    if (typeof IntersectionObserver === "undefined") return;

    const noeuds = cellules.current.filter((n): n is HTMLLIElement => n !== null);
    if (noeuds.length === 0) return;

    const bande = new Set<number>();
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          const rang = Number((e.target as HTMLElement).dataset.rang);
          if (e.isIntersecting) bande.add(rang);
          else bande.delete(rang);
        }
        if (bande.size === 0) return;
        setActif(Math.min(...Array.from(bande)));
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );

    noeuds.forEach((n) => observateur.observe(n));
    return () => observateur.disconnect();
  }, [mode]);

  const pose = mode === "pose";

  return (
    <div className={cn("ed", className)} data-mode={mode}>
      <ol className="ed-liste">
        {ETAPES.map((e, i) => {
          const vif = mode !== "defile" || i === actif;
          return (
            <li
              key={e.n}
              ref={(el) => {
                cellules.current[i] = el;
              }}
              data-rang={i}
              data-vif={vif ? "oui" : "non"}
              aria-current={mode === "defile" && i === actif ? "step" : undefined}
              className="ed-etape"
            >
              <span className="num ed-num">{e.n}</span>
              <h3 className="o-h4 ed-titre">{e.titre}</h3>
              <p className="ed-sous">{e.sousTitre}</p>
              <p className="o-small ed-corps">{e.texte}</p>
              {pose && (
                <div className="ed-maquette-posee" aria-hidden="true">
                  <div className="o-card-soft ed-carte">
                    <Calque rang={i} vif />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!pose && (
        <div className="ed-volet" aria-hidden="true">
          <div className="ed-collant">
            <div className="o-card-soft ed-carte">
              {ETAPES.map((e, i) => (
                <Calque key={e.n} rang={i} vif={i === actif} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
