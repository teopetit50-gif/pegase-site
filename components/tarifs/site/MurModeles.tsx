"use client";

import { useEffect, useRef, type PointerEvent as PointerEvt } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { CATEGORIES, capture, parCategorie, type Modele } from "@/components/modeles/donnees";
import "./MurModeles.css";

/* ══════════════════════════════════════════════════════════════════════
   <MurModeles> — le mur des quatre modèles du hero de /tarifs/site (14/09/2026)

   ORIGINE. « 3D Card » d'Aceternity UI (aceternity/3d-card) : un conteneur
   à perspective 1000 px, une carte qui s'incline en rotateX/rotateY sous le
   pointeur (mousemove, écart/25 en degrés) et revient à plat en 200 ms, des
   CardItem qui se détachent en translateZ tant que le pointeur est dessus.
   Et « Safari » de Magic UI (magicui/safari) : un SVG 1203 × 753 qui dessine
   la fenêtre — trois feux, champ d'adresse à cadenas, barre d'outils en mode
   « default » — et perce un masque pour laisser voir l'image posée dessous.

   POURQUOI ICI. Une page qui vend un site doit montrer des sites. Le cadre
   Safari dit « ceci est un autre site » plus nettement que la barre à trois
   pastilles de <MiniSite>, et l'inclinaison donne à chaque tuile la matière
   d'un objet qu'on peut tourner, pas d'une image collée. Le texte du hero et
   la ligne « Et dix-sept autres… » restent dans page.tsx : ici, le mur seul.

   CE QUI EST JETÉ. Le SVG mis à l'échelle : à 285 px de large (quatre
   colonnes dans 1200) sa barre ferait 12 px et l'adresse 3 px — illisible.
   Le chrome est refait en HTML à hauteur fixe, seul le cadenas reste un
   tracé de la source ; plus de masque ni d'id à dédoublonner entre quatre
   exemplaires. La barre d'outils « default » (chevrons, bouclier, onglets)
   n'a pas la place : mode « simple ». `<img>` nu → next/image `fill` dans un
   écran 4:3 (le 12:7 de la source couperait le bas des captures, qui sont
   4:3). Le contexte React + useEffect des CardItem → une règle :hover CSS,
   qui marche sans JavaScript. `py-20`, `h-96 w-96`, l'ombre emerald et les
   `dark:` → largeur de colonne, filet --o-line, ombre courte des .o-card.

   ÉCARTS ASSUMÉS. Inclinaison bornée à ±7° (normalisée sur la demi-largeur,
   la source donnait 5,7° à 285 px et 3° à 163 px) et cohérente : le bord
   sous le pointeur vient vers l'œil (la source mêlait les deux sens). Elle
   n'existe que sous (hover: hover) hors prefers-reduced-motion — lus dans un
   useEffect — et ignore le tactile : téléphone et mouvement réduit voient
   une carte plate. Retour au repos en 300 ms, suivi à 120 ms. La levée de
   4 px est sur la carte intérieure, pas sur le lien : la zone de clic ne
   fuit jamais le pointeur. Le `title` du lien devient un aria-label ; le
   style reste masqué sous 640 px, comme avant. Le conteneur (grille 2 → 4,
   data-arrivee="collage", mt-12 sm:mt-14) est rendu ICI.
   ══════════════════════════════════════════════════════════════════════ */

/* ——— les quatre modèles : le premier de chaque famille du catalogue, pour
   montrer quatre partis pris et non quatre variantes — la règle de la
   constante VITRINE de la page, reprise telle quelle ——— */
const VITRINE: Modele[] = CATEGORIES.map((c) => parCategorie(c.cle)[0]);

/* inclinaison maximale, en degrés, quand le pointeur touche un bord */
const AMPLITUDE = 7;

/* la seule condition sous laquelle la carte s'incline : un pointeur fin ET
   le mouvement autorisé. Lue dans un useEffect, jamais au rendu. */
const REQUETE_INCLINAISON = "(hover: hover) and (prefers-reduced-motion: no-preference)";

const borner = (v: number) => Math.min(AMPLITUDE, Math.max(-AMPLITUDE, v));

/* remet la carte à plat : le :hover CSS reprend la main (levée sans
   inclinaison), et la transition de repos, 300 ms, s'applique */
function reposer(el: HTMLDivElement | null) {
  if (!el) return;
  el.removeAttribute("data-suivi");
  el.style.transform = "";
}

export default function MurModeles({
  modeles = VITRINE,
  className,
}: {
  /* par défaut, le premier modèle de chaque famille du catalogue */
  modeles?: Modele[];
  /* classes ajoutées au conteneur (fusionnées : un `mt-*` remplace le nôtre) */
  className?: string;
}) {
  return (
    <ul
      data-arrivee="collage"
      className={cn("mm-mur mt-12 grid grid-cols-2 gap-4 sm:mt-14 lg:grid-cols-4 lg:gap-5", className)}
    >
      {modeles.map((m, i) => (
        <li key={m.slug}>
          {/* les deux premières captures sont au-dessus de la ligne de
              flottaison sur tous les écrans : préchargées, comme avant */}
          <Tuile m={m} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

function Tuile({ m, priority }: { m: Modele; priority: boolean }) {
  const carte = useRef<HTMLDivElement>(null);
  /* vaut false jusqu'à l'effet : avant hydratation, aucun geste */
  const actif = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(REQUETE_INCLINAISON);
    const maj = () => {
      actif.current = mq.matches;
      if (!mq.matches) reposer(carte.current);
    };
    maj();
    mq.addEventListener("change", maj);
    return () => mq.removeEventListener("change", maj);
  }, []);

  const entrer = (e: PointerEvt<HTMLAnchorElement>) => {
    if (!actif.current || e.pointerType === "touch" || !carte.current) return;
    /* pendant le suivi, la transition tombe à 120 ms (MurModeles.css) */
    carte.current.setAttribute("data-suivi", "1");
  };

  const suivre = (e: PointerEvt<HTMLAnchorElement>) => {
    const el = carte.current;
    if (!actif.current || e.pointerType === "touch" || !el) return;
    /* le lien ne bouge jamais (la levée est sur la carte) : sa boîte est
       une référence stable, même quand la carte est déjà inclinée */
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    /* pointeur en bas → rotateX positif → le bord bas vient vers l'œil ;
       pointeur à droite → rotateY négatif → le bord droit vient vers l'œil */
    const rx = borner(py * 2 * AMPLITUDE);
    const ry = borner(-px * 2 * AMPLITUDE);
    el.style.transform = `translateY(-4px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };

  const sortir = () => reposer(carte.current);

  /* le fond ne se voit que le temps du chargement de la capture — les
     mêmes deux teintes que <MiniSite> */
  const fond = m.theme === "sombre" ? "#0e1116" : "#faf8f5";

  return (
    <a
      href={m.demo}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Ouvrir la démonstration du modèle ${m.nom} dans un nouvel onglet`}
      className="mm-tuile"
      onPointerEnter={entrer}
      onPointerMove={suivre}
      onPointerLeave={sortir}
    >
      {/* la carte : c'est elle qui s'incline, et dont les deux enfants
          (cadre, légende) se détachent en translateZ au survol */}
      <div ref={carte} className="mm-carte">
        {/* ——— le cadre Safari, mode simple : feux, adresse à cadenas ——— */}
        <div className="mm-cadre">
          <div className="mm-barre" aria-hidden>
            <span className="mm-feux">
              <i />
              <i />
              <i />
            </span>
            <span className="mm-adresse">
              {/* le cadenas de la source, seul tracé SVG conservé */}
              <svg width="8" height="11" viewBox="564.6 19.2 9.5 13.2" fill="none" aria-hidden>
                <path
                  d="M566.269 32.0852H572.426C573.277 32.0852 573.696 31.6663 573.696 30.7395V25.9851C573.696 25.1472 573.353 24.7219 572.642 24.6521V23.0842C572.642 20.6721 571.036 19.5105 569.348 19.5105C567.659 19.5105 566.053 20.6721 566.053 23.0842V24.6711C565.393 24.7727 565 25.1917 565 25.9851V30.7395C565 31.6663 565.418 32.0852 566.269 32.0852ZM567.272 22.97C567.272 21.491 568.211 20.6785 569.348 20.6785C570.478 20.6785 571.423 21.491 571.423 22.97V24.6394L567.272 24.6458V22.97Z"
                  fill="#a1a1aa"
                />
              </svg>
              <span className="mm-url">{m.slug}.fr</span>
            </span>
            {/* miroir des feux, invisible : il centre l'adresse dans la
                barre, comme dans Safari. Masqué sous 640 px, où la place
                manque. */}
            <span className="mm-feux mm-feux--miroir">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="mm-ecran" style={{ background: fond }}>
            <Image
              src={capture(m)}
              alt={`Aperçu du modèle ${m.nom} : ${m.style}`}
              fill
              sizes="(max-width: 1023px) 46vw, (max-width: 1247px) 22vw, 285px"
              priority={priority}
              className="object-cover object-top"
            />
          </div>
        </div>

        {/* ——— la légende : nom à gauche, style à droite (dès 640 px) ——— */}
        <div className="mm-legende">
          <span className="mm-nom">{m.nom}</span>
          <span className="o-small mm-style">{m.style}</span>
        </div>
      </div>
    </a>
  );
}
