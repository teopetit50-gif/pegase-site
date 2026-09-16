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

/* ─────────────────────────────────────────────────────────────────────
   0 · LES SIGNES D'OUTIL — le bandeau du haut

   La référence pose trois logos de clients aplatis en noir. Nous n'avons
   pas de logo client à afficher et nous ne reprenons pas les logos de
   tiers : ces trois silhouettes au trait DISENT l'outil sans prétendre
   être sa marque. Même poids visuel que leurs trois signes, et lisibles
   en noir — ce qu'un logo polychrome aplati n'est pas.
   ───────────────────────────────────────────────────────────────────── */

const SIGNE = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SigneMail() {
  return (
    <svg {...SIGNE}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 8.5 12 14.5l9.5-6" />
    </svg>
  );
}

export function SigneBoite() {
  return (
    <svg {...SIGNE}>
      <rect x="2.5" y="5.5" width="11" height="13" rx="2" />
      <ellipse cx="8" cy="12" rx="2.6" ry="3.2" />
      <path d="M13.5 8.5h8v8.5a1.5 1.5 0 0 1-1.5 1.5h-6.5" />
      <path d="M13.5 12h8" />
    </svg>
  );
}

export function SigneDrive() {
  return (
    <svg {...SIGNE}>
      <path d="M9 3h6l6 10.5h-6z" />
      <path d="M9 3 3 13.5 6 19l6-10.5z" />
      <path d="M6 19h12l3-5.5H9z" />
    </svg>
  );
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
