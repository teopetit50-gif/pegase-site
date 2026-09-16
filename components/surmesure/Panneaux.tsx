/* ══════════════════════════════════════════════════════════════════════
   /offres/sur-mesure — les pièces dessinées (16/09/2026)

   La référence (scale.com/generative-ai-data-engine) remplit trois
   emplacements par des captures de son produit. On ne recopie pas l'actif
   d'autrui, et nos écrans montrent les systèmes DU CATALOGUE, pas un
   système sur mesure : deux emplacements sont donc composés ici, le
   troisième porte notre vraie capture de l'espace client.

   ── POURQUOI DU BALISAGE ET PAS UN SVG À VIEWBOX ─────────────────────
   Une image — bitmap ou SVG à viewBox — se met à l'échelle d'un bloc. Le
   panneau de la référence fait 1392 de large sur ordinateur et 342 sur
   téléphone : un texte posé à 14 px dedans y tombe à 3,4 px. Ces deux
   pièces sont donc du balisage qui se recompose (quatre colonnes ≥ 768,
   empilé en dessous) — même emprise, même poids visuel, et lisible aux
   cinq largeurs. C'est l'écart nº 5 du bloc `.smd`.

   Aucun état, aucun effet : ces composants sont rendus sur le serveur.
   ══════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { siHubspot, siNotion, siStripe } from "simple-icons";

/* ─────────────────────────────────────────────────────────────────────
   0 · LES SIGNES D'OUTIL — le bandeau du haut

   16/09, Teo : « change ça avec des sociétés qui font plus pro, genre du
   monde de la tech ». Gmail, Outlook et Drive sont des outils grand
   public ; Stripe, HubSpot et Notion parlent à une direction.

   LES TROIS SONT DE VRAIES INTÉGRATIONS, pas un décor : ils figurent dans
   `OUTIL_INFOS` (lib/integrations.ts) avec la description de ce que le
   système y fait, comme les vingt-cinq autres. On ne met pas dans ce
   bandeau un outil sur lequel on ne se branche pas.

   ⚠ CE NE SONT PAS DES CLIENTS. La référence titre son bandeau « Trusted
   by the world's most ambitious AI teams » et aligne ses clients. Nous
   n'en avons pas à afficher et nous n'en inventons pas : la phrase
   au-dessus dit « se branche sur VOS outils », et elle doit le dire —
   c'est elle qui empêche de lire ces trois marques comme des références.
   Ne pas la raccourcir en « Stripe, HubSpot, Notion » tout court.

   LE SIGNE VIENT DE `simple-icons`, comme partout ailleurs sur le site
   (/integrations, l'accueil), et il est peint en `currentColor` donc en
   NOIR — le traitement exact de la référence, qui passe ses logos en
   `brightness-0`. Ça marche ici et pas avec les précédents pour une
   raison simple : ces trois marques sont monochromes par construction,
   un seul tracé. Un logo polychrome aplati, lui, donne un aplat illisible
   (constaté sur Outlook, qui devenait un rectangle plein).
   ───────────────────────────────────────────────────────────────────── */

function Signe({ path, titre }: { path: string; titre: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={titre}
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  );
}

export function SigneStripe() {
  return <Signe path={siStripe.path} titre="Stripe" />;
}
export function SigneHubspot() {
  return <Signe path={siHubspot.path} titre="HubSpot" />;
}
export function SigneNotion() {
  return <Signe path={siNotion.path} titre="Notion" />;
}

/* ─────────────────────────────────────────────────────────────────────
   1 · DU BESOIN AU SYSTÈME — la grande pièce, sous l'aperçu

   16/09, Teo, capture contre capture : « cette section n'a rien à voir
   en design ». Elle est refaite sur la COMPOSITION de la référence, pas
   sur son contenu.

   Ce que la référence pose là est une IMAGE (1216 × 638, un de leurs
   actifs) : panneau gris à coins arrondis ; à gauche quatre cartes
   blanches en 2 × 2, chacune un titre centré, un pictogramme cerclé et
   une légende grise ; à droite deux grands chiffres surmontant leurs
   étiquettes monospace, puis un grand graphique de couverture avec sa
   légende. Proportions relevées sur l'image : colonne gauche 37 %,
   colonne droite 63 %, gouttière 4 %.

   On ne recopie pas l'actif d'autrui — et on ne pouvait pas : leur
   graphique est un planisphère en points qui leur appartient, et leurs
   deux chiffres (« 20+ domaines », « 80+ langues ») sont de la traction
   commerciale, que nous n'inventons pas.

   CE QU'ON MET À LA PLACE, à la même géométrie :
   • les quatre cartes portent les quatre ÉTAPES de `FICHE.etapes` ;
   • les deux chiffres sont des faits de CONCEPTION vérifiables sur cette
     page même — quatre étapes avant la mise en service, zéro ligne
     écrite avant que le périmètre le soit ;
   • le planisphère devient la COUVERTURE, qui dit la même chose que lui
     (« on est partout ») avec nos huit familles de métiers, reprises de
     `FICHE.cible`. Elles avaient quitté la page à la refonte du 16/09 :
     elles y reviennent ici, à leur place.

   TOUT EST DU BALISAGE QUI SE RECOMPOSE, jamais une image : le panneau
   fait 1392 px de large sur ordinateur et 342 sur téléphone ; un texte
   posé à 14 px dans une image y tomberait à 3,4 px. Deux colonnes dès
   1024, empilées en dessous.
   ───────────────────────────────────────────────────────────────────── */

type Etape = { rang: string; titre: string; texte: string; Icone: LucideIcon };

const CHIFFRES = [
  { valeur: "4", label: "étapes avant\nla mise en service" },
  { valeur: "0", label: "ligne écrite avant\nle périmètre" },
];

export function PanneauMethode({
  etapes,
  secteurs,
}: {
  etapes: Etape[];
  secteurs: string[];
}) {
  return (
    <div className="p-6 md:p-10">
      <div className="grid gap-8 lg:grid-cols-[37fr_63fr] lg:gap-[4%]">
        {/* ——— à gauche : les quatre étapes, en 2 × 2 ——— */}
        <ul className="grid grid-cols-2 gap-3 md:gap-5">
          {etapes.map((e) => (
            <li
              key={e.rang}
              className="flex flex-col items-center rounded-xl bg-white px-3 py-6 text-center md:px-5 md:py-8"
            >
              <span
                className="block"
                style={{
                  fontFamily: "var(--font-dm-mono), ui-monospace, monospace",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  color: "var(--smd-etiquette)",
                }}
              >
                {e.rang}
              </span>
              <h5 className="smd-h4 mt-2 !text-[0.9375rem] !leading-[1.3] md:!text-[1.0625rem]">
                {e.titre}
              </h5>
              <span
                aria-hidden
                className="mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-black/15 text-black md:mt-6 md:h-14 md:w-14"
              >
                <e.Icone strokeWidth={1.25} className="h-5 w-5 md:h-6 md:w-6" />
              </span>
              <p className="smd-body mt-5 !text-[0.75rem] !leading-[1.45] md:mt-6 md:!text-[0.8125rem]">
                {e.texte}
              </p>
            </li>
          ))}
        </ul>

        {/* ——— à droite : les deux chiffres, puis la couverture ——— */}
        <div className="flex flex-col">
          <div className="flex justify-center gap-10 md:gap-20">
            {CHIFFRES.map((c) => (
              <div key={c.valeur} className="text-center">
                <p className="smd-chiffre">{c.valeur}</p>
                <p className="smd-chiffre-label">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-1 flex-col justify-center md:mt-12">
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {secteurs.map((nom) => (
                <li
                  key={nom}
                  className="flex items-center gap-3 border-b border-black/10 py-3 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
                >
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-black/45" />
                  <span className="smd-body !text-[0.8125rem] !text-black md:!text-[0.9375rem]">
                    {nom}
                  </span>
                </li>
              ))}
            </ul>
            <p className="smd-chiffre-label mt-6 !text-left md:mt-8">
              Aucun secteur n&apos;est exclu · le critère est le processus, pas le métier
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   2 · RÈGLE PAR RÈGLE — la pièce de droite du bloc à deux colonnes

   Trois niveaux d'autonomie, dans l'ordre où une direction les décide.
   Les trois phrases sortent de `FICHE.controle`, sans réécriture.
   ───────────────────────────────────────────────────────────────────── */

const NIVEAUX: { point: string; titre: string; texte: string }[] = [
  {
    point: "#16a34a",
    titre: "S'exécute seul",
    texte: "La règle est écrite, le résultat est vérifiable\u00A0: le système la joue sans vous prévenir.",
  },
  {
    point: "#d97706",
    titre: "Attend une validation",
    texte: "Le système prépare, vos équipes approuvent, corrigent ou suspendent avant que ça parte.",
  },
  {
    point: "#525252",
    titre: "Ne part jamais sans un accord",
    texte: "Rien ne quitte votre organisation sans un accord explicite, quel que soit le volume.",
  },
];

export function PanneauReglages() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 p-6 md:p-8">
      <p className="smd-etiquette !mb-0">Niveau d&apos;autonomie</p>
      {NIVEAUX.map((n) => (
        <div key={n.titre} className="rounded-xl border border-black/10 bg-white p-4 md:p-5">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: n.point }}
            />
            <span className="smd-h4 !text-[1rem] !leading-[1.4]">{n.titre}</span>
          </div>
          <p className="smd-body mt-2 !text-[0.875rem] !leading-[1.5]">{n.texte}</p>
        </div>
      ))}
      <p className="smd-body !text-[0.8125rem] !leading-[1.5]">
        Rien n&apos;est figé&nbsp;: un réglage se modifie en cours d&apos;exploitation.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   3 · CROQUIS DES EXEMPLES — les trois vignettes 16/9

   La référence pose là trois vignettes de vidéo de démonstration. Nous
   n'en avons pas, et un lecteur vide serait un mensonge d'interface : ce
   sont trois croquis au trait, un par nature de besoin, dans le même
   cadre et le même rapport. Pas de bouton « lecture », rien à cliquer.
   ───────────────────────────────────────────────────────────────────── */

const TRAIT = { fill: "none", stroke: "currentColor", strokeWidth: 1.25 } as const;

function Cadre({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full text-black/45" aria-hidden>
      {children}
    </svg>
  );
}

export function CroquisPont() {
  return (
    <Cadre>
      <rect x="28" y="60" width="86" height="60" rx="8" {...TRAIT} />
      <rect x="206" y="60" width="86" height="60" rx="8" {...TRAIT} />
      <path d="M118 80h84m0 0-10-7m10 7-10 7" {...TRAIT} />
      <path d="M202 100h-84m0 0 10-7m-10 7 10 7" {...TRAIT} />
      <path d="M42 76h40M42 88h58M42 100h34" {...TRAIT} opacity="0.55" />
      <path d="M220 76h40M220 88h58M220 100h34" {...TRAIT} opacity="0.55" />
    </Cadre>
  );
}

export function CroquisDocument() {
  return (
    <Cadre>
      <path d="M112 34h62l34 34v78a8 8 0 0 1-8 8h-88a8 8 0 0 1-8-8V42a8 8 0 0 1 8-8Z" {...TRAIT} />
      <path d="M174 34v34h34" {...TRAIT} />
      <path d="M128 86h64M128 100h64M128 114h40" {...TRAIT} opacity="0.55" />
      <circle cx="196" cy="126" r="18" {...TRAIT} />
      <path d="m188 126 6 6 11-12" {...TRAIT} />
    </Cadre>
  );
}

export function CroquisSuivi() {
  return (
    <Cadre>
      <rect x="52" y="38" width="216" height="104" rx="8" {...TRAIT} />
      <path d="M52 62h216" {...TRAIT} />
      <path d="M70 84h60M70 104h60M70 124h60" {...TRAIT} opacity="0.55" />
      <path d="M160 84h74M160 104h48M160 124h62" {...TRAIT} opacity="0.35" />
      <circle cx="248" cy="84" r="5" {...TRAIT} />
      <path d="M248 50v1" {...TRAIT} />
    </Cadre>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   4 · LES SIX PICTOGRAMMES DE PÉRIMÈTRE

   16/09, Teo : « les logos ne sont pas aussi bien faits que sur la
   version de base ». C'est juste : la référence dessine SES icônes —
   un cadran, un graphe de nœuds, une courbe, un éclair, un microscope,
   une poignée de main. Chacune dit son sujet. Les nôtres venaient d'une
   bibliothèque générique : une fenêtre, deux flèches, un fichier, un
   calendrier — interchangeables et sans rapport précis avec le texte.

   Ces six-là sont dessinées pour leur carte, au même trait (1,2) et dans
   la même boîte de 24, comme celles de la référence. Chacune montre la
   CHOSE, pas sa catégorie : une application avec son rail et ses droits,
   un pont entre deux outils, une pièce lue et validée, un cadran avec
   son seuil, un état qui monte, un assistant qui répond depuis une base.
   ───────────────────────────────────────────────────────────────────── */

const PICTO = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/* Logiciel métier : une fenêtre avec son rail de navigation et ses
   droits (le cadenas d'angle). */
export function PictoApplication() {
  return (
    <svg {...PICTO}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M8.5 4v16" />
      <path d="M4.8 8h1.4M4.8 11h1.4M4.8 14h1.4" />
      <path d="M11.5 9h7M11.5 12h4.5" />
      <rect x="15.5" y="14.5" width="4" height="3.2" rx="1" />
      <path d="M16.6 14.5v-1a.9.9 0 0 1 1.8 0v1" />
    </svg>
  );
}

/* Pont entre outils : deux blocs et un tablier qui les relie. */
export function PictoPont() {
  return (
    <svg {...PICTO}>
      <rect x="1.8" y="13" width="5.4" height="7" rx="1.2" />
      <rect x="16.8" y="13" width="5.4" height="7" rx="1.2" />
      <path d="M4.5 13V9M19.5 13V9" />
      <path d="M2.5 9.5C6 5 18 5 21.5 9.5" />
      <path d="M8 11.4v2.1M12 10.6v2.9M16 11.4v2.1" />
    </svg>
  );
}

/* Traitement de documents : une pièce lue, et son contrôle. */
export function PictoPiece() {
  return (
    <svg {...PICTO}>
      <path d="M5 3.2h8l5 5v6.4" />
      <path d="M13 3.2V8h5" />
      <path d="M5 3.2v17.6h5.4" />
      <path d="M8 9h3M8 12h5M8 15h3.5" />
      <circle cx="16.6" cy="17.4" r="3.6" />
      <path d="m14.9 17.5 1.2 1.2 2.3-2.5" />
    </svg>
  );
}

/* Contrôles répétitifs : un cadran, son aiguille et son seuil. */
export function PictoCadran() {
  return (
    <svg {...PICTO}>
      <path d="M3 17.5a9 9 0 1 1 18 0" />
      <path d="M12 17.5 16.2 11" />
      <circle cx="12" cy="17.5" r="1.1" />
      <path d="M4.6 12.2 5.8 13M19.4 12.2 18.2 13M12 5.2v1.5" />
      <path d="M2.2 20.6h19.6" />
    </svg>
  );
}

/* Tableau de bord : un cadre, une courbe qui monte, un repère. */
export function PictoBord() {
  return (
    <svg {...PICTO}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M2.5 8h19" />
      <path d="M6 16.2l3.4-3.6 2.6 2.1 4.4-4.6" />
      <circle cx="16.4" cy="10.1" r="1.2" />
      <path d="M5 6h1.2M8 6h1.2" />
    </svg>
  );
}

/* Assistant interne : une réponse, et la base de procédures d'où elle
   sort — c'est ce qui le distingue d'un assistant générique. */
export function PictoAssistant() {
  return (
    <svg {...PICTO}>
      <path d="M3 5.6A2.1 2.1 0 0 1 5.1 3.5h9.3a2.1 2.1 0 0 1 2.1 2.1v5.2a2.1 2.1 0 0 1-2.1 2.1H8l-3.7 2.7v-2.7H5.1A2.1 2.1 0 0 1 3 10.8z" />
      <path d="M6.4 6.9h6.7M6.4 9.4h4.2" />
      <ellipse cx="17.4" cy="16.3" rx="3.9" ry="1.6" />
      <path d="M13.5 16.3v3.4c0 .9 1.7 1.6 3.9 1.6s3.9-.7 3.9-1.6v-3.4" />
    </svg>
  );
}
