"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import "./apparition.css";

/* ══════════════════════════════════════════════════════════════════════
   Les sections de l'accueil apparaissent (16/09/2026)

   Demande de Teo : « fais en sorte que chaque section apparaisse, comme
   le texte de notre première section. » Le dessin du mouvement et son
   origine (blur-reveal, 21st.dev) sont documentés dans `apparition.css` ;
   ce fichier ne porte que le déclencheur.

   QUATRE RÈGLES, chacune payée ailleurs sur ce site.

   1. RIEN AU-DESSUS DE LA LIGNE DE FLOTTAISON. Un élément dont la
      position DANS LE DOCUMENT est à moins d'une hauteur de fenêtre du
      haut appartient à la cascade du hero : on ne l'arme pas. Sans ça les
      deux animations se superposent sur le premier écran, et surtout un
      bloc déjà visible au montage clignoterait (peint → caché → repeint).
      Même filtre que `sousLaLigne` dans PageMotion.

   2. LE CONTENU N'EST JAMAIS MASQUÉ PAR DÉFAUT. Le rendu serveur ne pose
      aucun attribut : sans JavaScript, en mouvement réduit, ou si
      l'observateur ne part pas, la section est simplement là. C'est la
      règle déjà écrite dans PageMotion, et elle vaut ici encore plus —
      ces blocs-là portent le texte de vente de la page.

   3. L'ÉTAT EST POSÉ SUR LE DOM, PAS DANS UN `useState`. Un état React
      ferait re-rendre douze sections pour changer un attribut, et la
      règle `react-hooks/set-state-in-effect` le refuse (elle a cassé la
      première version de ce fichier). L'élément est un système externe :
      `el.dataset.app` passe de `arme` à `joue`, et le CSS fait le reste.

   4. AUCUNE RÈGLE NE SURVIT À L'ANIMATION. `data-app` est retiré une fois
      la cascade finie : un `filter: blur(0)` laissé en place crée un
      contexte d'empilement permanent, ce qui casserait un enfant collant
      ou un menu en surcouche. Le minuteur de nettoyage est calé sur le
      retard du DERNIER élément — d'où le `retard` que le groupe reçoit de
      son appelant plutôt que de le deviner (`getAnimations` ne sait pas
      le dire : les tuiles du catalogue portent des animations en boucle,
      qui ne se terminent jamais).

   Le GROUPE sert à faire partir tout un chapeau d'un seul mouvement : le
   sourcil, puis le titre mot à mot, puis le chapô, sur UN observateur.
   Trois observateurs indépendants les auraient déclenchés à trois
   instants différents selon le sens et la vitesse du défilement.
   ══════════════════════════════════════════════════════════════════════ */

const DUREE = 800;

/* true = un groupe observe déjà pour nous, l'élément ne s'arme pas seul */
const CtxGroupe = createContext(false);

/* ——————————————————————————————————————————————————————————————
   Le registre des blocs armés
   —————————————————————————————————————————————————————————————— */

/* POURQUOI PAS UN `IntersectionObserver`, qui était la première version et
   ce que fait le composant d'origine (21st.dev) : un observateur ne
   notifie que les FRANCHISSEMENTS de seuil. Un bloc qui passe de « sous la
   fenêtre » à « au-dessus de la fenêtre » entre deux images — molette
   lancée, barre de défilement tirée, saut à une ancre, et cette page fait
   13 200 px de haut — ne franchit rien : le ratio vaut zéro avant comme
   après. Aucun appel, le bloc reste armé, donc INVISIBLE pour le reste de
   la visite. Relevé à la recette du 16/09 : trois à six blocs perdus par
   passage à partir de 768 px, jamais les mêmes, et zéro à 390 — d'où
   l'apparence d'un défaut intermittent.

   Le remède est celui de ScrollTrigger : on ne guette pas un événement, on
   RELIT la position. Un seul écouteur de défilement pour toute la page,
   cadencé à l'image, qui balaie les blocs encore armés et se retire de
   lui-même une fois la file vide — le coût retombe donc à zéro quand la
   page est entièrement peinte. Le test « le haut du bloc a passé les 88 %
   de la fenêtre » rattrape au passage tout ce qui est déjà remonté
   au-dessus (`top` négatif), ce que l'observateur ne savait pas voir. */

type Arme = { el: HTMLElement; jouer: () => void };

const armes = new Set<Arme>();
let planifie = false;

function balayer() {
  planifie = false;
  /* 88 % de la fenêtre : le seuil des reveals GSAP de PageMotion, pour que
     les deux moitiés de la page partent au même endroit de l'écran. */
  const seuil = window.innerHeight * 0.88;
  for (const a of [...armes]) {
    if (a.el.getBoundingClientRect().top < seuil) {
      armes.delete(a);
      a.jouer();
    }
  }
  if (!armes.size) decrocher();
}

function auDefile() {
  if (planifie) return;
  planifie = true;
  requestAnimationFrame(balayer);
}

function decrocher() {
  window.removeEventListener("scroll", auDefile);
  window.removeEventListener("resize", auDefile);
}

function inscrire(a: Arme) {
  if (!armes.size) {
    window.addEventListener("scroll", auDefile, { passive: true });
    /* le redimensionnement compte autant que le défilement : une fenêtre
       qu'on agrandit fait entrer des blocs sans qu'on ait bougé d'un pixel */
    window.addEventListener("resize", auDefile, { passive: true });
  }
  armes.add(a);
  /* UNE PASSE TOUT DE SUITE. Sans elle, un visiteur qui arrive sur une
     ancre (`/#approche`, un lien du menu, un retour de navigation) voit la
     moitié de son écran vide jusqu'à ce qu'il défile : les blocs sont armés
     — ils sont bien à plus d'une hauteur de fenêtre du haut du DOCUMENT —
     mais le balayage, lui, n'a encore jamais tourné. Mesuré le 16/09 :
     36 blocs restaient cachés à l'arrivée sur `/#approche`. */
  auDefile();
}

function retirer(a: Arme) {
  armes.delete(a);
  if (!armes.size) decrocher();
}

/* La référence est créée ICI et rendue à l'appelant, au lieu de lui être
   passée : `react-hooks/immutability` refuse qu'un hook touche au `.current`
   d'une ref reçue en argument. Le nœud manipulé est donc local au hook. */
function useEntree(actif: boolean, retard: number) {
  const cible = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!actif) return;
    const el = cible.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* règle 1 — position dans le document, pas position à l'écran : Next
       remet le défilement à zéro dans le même cycle, un simple
       `getBoundingClientRect().top` mentirait sur une arrivée à l'ancre. */
    const haut = el.getBoundingClientRect().top + window.scrollY;
    if (haut < window.innerHeight) return;

    el.dataset.app = "arme";
    let minuteur = 0;

    const arme: Arme = {
      el,
      jouer: () => {
        el.dataset.app = "joue";
        minuteur = window.setTimeout(() => {
          delete el.dataset.app;
        }, retard + DUREE + 60);
      },
    };
    inscrire(arme);

    return () => {
      retirer(arme);
      window.clearTimeout(minuteur);
      delete el.dataset.app;
    };
  }, [actif, retard]);

  return cible;
}

/* ——————————————————————————————————————————————————————————————
   Le groupe : un observateur pour tout un chapeau
   —————————————————————————————————————————————————————————————— */

export function GroupeApparition({
  children,
  className,
  retard = 0,
}: {
  children: ReactNode;
  className?: string;
  /** retard du dernier enfant animé, en ms — sert au nettoyage */
  retard?: number;
}) {
  const cadre = useEntree(true, retard);

  return (
    <div ref={cadre as React.Ref<HTMLDivElement>} className={className}>
      <CtxGroupe.Provider value={true}>{children}</CtxGroupe.Provider>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————————
   Un texte qui se peint mot à mot
   —————————————————————————————————————————————————————————————— */

/* Découpe en gardant les séparateurs comme nœuds de texte entre les
   spans — reprise telle quelle du hero, pour les mêmes raisons
   (insécables préservés). */
const decouper = (texte: string) => texte.split(/(\s+)/);

export function MotsApparition({
  texte,
  depart = 0,
  pas = 55,
}: {
  texte: string;
  /** délai du premier mot, en ms */
  depart?: number;
  /** écart entre deux mots, en ms */
  pas?: number;
}) {
  const dansGroupe = useContext(CtxGroupe);
  const morceaux = decouper(texte);
  const rangs = morceaux.filter((m) => m.trim()).length;
  const cadre = useEntree(!dansGroupe, depart + pas * Math.max(rangs - 1, 0));

  let rang = 0;
  return (
    /* `aria-label` : le nom accessible reste la phrase entière, jamais la
       suite de mots découpés — même précaution que dans `TexteRevele`. */
    <span ref={cadre as React.Ref<HTMLSpanElement>} aria-label={texte}>
      {morceaux.map((morceau, i) => {
        if (!morceau.trim()) return <span key={i}>{morceau}</span>;
        const delai = depart + pas * rang++;
        return (
          <span
            key={i}
            className="o-app-mot"
            style={{ "--o-app-d": `${delai}ms` } as CSSProperties}
          >
            {morceau}
          </span>
        );
      })}
    </span>
  );
}

/* ——————————————————————————————————————————————————————————————
   Un bloc entier, sur la même courbe
   —————————————————————————————————————————————————————————————— */

export default function Apparition({
  children,
  className,
  delai = 0,
  as: Balise = "div",
}: {
  children: ReactNode;
  className?: string;
  /** retard sur l'entrée du groupe, en ms */
  delai?: number;
  as?: "div" | "p" | "span" | "li";
}) {
  const dansGroupe = useContext(CtxGroupe);
  const cadre = useEntree(!dansGroupe, delai);

  return (
    <Balise
      ref={cadre as React.Ref<never>}
      className={className ? `o-app-bloc ${className}` : "o-app-bloc"}
      /* toujours posée, même à zéro : les propriétés personnalisées
         HÉRITENT, et un bloc sans valeur propre prendrait celle d'un
         ancêtre animé. */
      style={{ "--o-app-d": `${delai}ms` } as CSSProperties}
    >
      {children}
    </Balise>
  );
}
