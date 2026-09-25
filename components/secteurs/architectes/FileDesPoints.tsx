"use client";
/* ══════════════════════════════════════════════════════════════════════
   Lorani (agences d'architecture) — FileDesPoints.tsx

   Posé le 25/09/2026 à la place de GrilleFonctions.tsx (« Features 8 » de
   Tailark : un « 100 % » cerné d'une orbite, une empreinte digitale, une
   courbe de bourse). Teo : « ce component n'a pas l'air adapté à ce
   domaine-là, trouve un autre component sur 21st.dev ». Sur téléphone, ses
   cinq cartes empilées faisaient 1 943 px.

   PORT de « Feature 11 » de Hirael (@hirael/feature-11 sur 21st.dev,
   « Keep the queue moving », MIT · Mohammad Shehadeh,
   https://github.com/MohammadShehadeh/hirael). Une file de travail, pas
   une vitrine de gadgets : à gauche les fonctions en onglets verticaux
   (trait d'encre sur l'onglet actif), à droite, pour chacune, ce que
   l'agence voit — les planches à leur indice, la lecture propre à chaque
   type de pièce, les situations et leur écart, les pièces reçues du jour,
   les questions qui attendent l'entreprise, le BET ou le bureau de
   contrôle. C'est le métier de Lorani tel qu'il se lit dans un dossier.

   ÉCARTS À LA SOURCE
   · Onglets : la source passe par `radix-ui` (Tabs), absent ici. Ils sont
     tenus par un état local, avec les rôles ARIA de Radix (tablist
     vertical, tab, tabpanel), la navigation aux flèches haut / bas,
     Début et Fin, et le même rendu « line » : texte à 60 % d'encre,
     l'actif à 100 % avec un trait de 2 px à gauche.
   · Trois fonctions dans la source, cinq ici (les cinq cartes d'avant,
     mêmes textes) ; cinq panneaux.
   · Avatars à initiales → tuiles de logiciels de la page
     (public/secteurs-architectes/icones), comme l'ancienne carte des
     interlocuteurs : aucun visage inventé.
   · Jetons : foreground #0a0a0a, muted-foreground #737373, border #e5e5e5,
     `bg-card/40` → #fafafa à 60 %, `rounded-md` → 10 px (rayons de la page).
   · Chaque panneau porte « Exemple » : ce sont des données d'illustration,
     reprises des maquettes de la page (indice C · 42 planches, lot 03 à
     62 % facturés pour 55 % constatés, EI 30 contre EI 60, huit jours).
   ══════════════════════════════════════════════════════════════════════ */
/* eslint-disable @next/next/no-img-element -- tuiles d'application SVG de 28 px, décoratives : l'optimiseur d'images n'apporte rien. */
import * as React from "react";
import { Bell, FileSearch, Layers, MessageSquareText, ReceiptText } from "lucide-react";
import { cn } from "@/lib/cn";

const NB = " ";

const FONCTIONS = [
  {
    valeur: "planches",
    icone: Layers,
    titre: "Toutes les planches relues",
    resume: "Chaque planche est croisée avec les autres et avec les pièces écrites : aucune n'est lue seule.",
  },
  {
    valeur: "lecteur",
    icone: FileSearch,
    titre: "Un lecteur par pièce",
    resume:
      "Chaque type de pièce a sa propre lecture : un plan, une DPGF et une fiche technique ne se contrôlent pas de la même façon.",
  },
  {
    valeur: "situations",
    icone: ReceiptText,
    titre: "Situations suivies",
    resume: "La situation reçue est comparée au marché et à la précédente, puis l'écart est chiffré.",
  },
  {
    valeur: "alertes",
    icone: Bell,
    titre: "Alertes à réception",
    resume:
      "Chaque situation, indice ou offre est lu dès sa réception, et l'écart est signalé le jour même. La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage.",
  },
  {
    valeur: "questions",
    icone: MessageSquareText,
    titre: "Une question suivie jusqu'à la réponse",
    resume:
      "Chaque point part en question à l'entreprise ou au BET, avec l'extrait joint. Lorani suit ensuite la réponse, et la question qui attend depuis huit jours remonte le matin.",
  },
] as const;

type Valeur = (typeof FONCTIONS)[number]["valeur"];

function Tuile({ src }: { src: string }) {
  return (
    <span className="size-7 shrink-0 overflow-hidden rounded-[8px]">
      <img className="size-full" src={`/secteurs-architectes/icones/${src}.svg`} alt="" />
    </span>
  );
}

function Etat({ children, fort }: { children: React.ReactNode; fort?: boolean }) {
  return (
    <span className={cn("shrink-0 text-xs tabular-nums", fort ? "font-medium text-[#0a0a0a]" : "text-[#737373]")}>
      {children}
    </span>
  );
}

function Legende({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-[#737373]">{children}</p>;
}

const Liste = ({ children }: { children: React.ReactNode }) => (
  <ul className="flex flex-col divide-y divide-[#e5e5e5]">{children}</ul>
);
const Ligne = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">{children}</li>
);
const Texte = ({ titre, sous }: { titre: string; sous: string }) => (
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium text-[#0a0a0a]">{titre}</p>
    <p className="truncate text-xs text-[#737373]">{sous}</p>
  </div>
);

const PLANCHES = [
  { titre: "PC 2 · Plan de masse", sous: `Indice C · recul et emprise`, etat: `2${NB}points`, fort: true },
  { titre: "PC 3 · Plan du rez-de-chaussée", sous: "Indice C · cotes contre la coupe AA", etat: `1${NB}point`, fort: true },
  { titre: "PC 5 · Façades", sous: "Indice C · matériaux contre la notice", etat: "Conforme", fort: false },
  { titre: "DCE · Coupe AA", sous: "Indice B · hauteurs sous plafond", etat: `1${NB}point`, fort: true },
];

function PanneauPlanches() {
  return (
    <div className="flex flex-col gap-4">
      <Liste>
        {PLANCHES.map((p) => (
          <Ligne key={p.titre}>
            <Tuile src="plans" />
            <Texte titre={p.titre} sous={p.sous} />
            <Etat fort={p.fort}>{p.etat}</Etat>
          </Ligne>
        ))}
      </Liste>
      <Legende>{`Indice C reçu ce matin : 42${NB}planches, toutes relues avant l'envoi au client.`}</Legende>
    </div>
  );
}

const LECTURES = [
  {
    code: "PLAN",
    titre: "Plan de masse",
    texte: "Cotes, surfaces et reculs, contre les autres planches et le règlement du PLU.",
  },
  {
    code: "DPGF",
    titre: "Offre du lot 03",
    texte: "Chaque poste contre le CCTP ; les postes non chiffrés ressortent avant l'attribution.",
  },
  {
    code: "FT",
    titre: "Fiche technique d'une porte",
    texte: `Le classement au feu annoncé contre celui du CCTP : EI${NB}30 reçu, EI${NB}60 exigé.`,
  },
];

function PanneauLecteur() {
  return (
    <Liste>
      {LECTURES.map((l) => (
        <li key={l.code} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline gap-2">
            <code className="font-mono text-xs text-[#737373]">{l.code}</code>
            <span className="text-sm font-medium text-[#0a0a0a]">{l.titre}</span>
          </div>
          <p className="text-xs leading-relaxed text-[#737373]">{l.texte}</p>
        </li>
      ))}
    </Liste>
  );
}

const SITUATIONS = [
  { lot: "Lot 03 · Gros œuvre", n: `Situation n°${NB}4`, etat: `Écart de 7${NB}%`, choisi: true },
  { lot: "Lot 08 · Menuiseries", n: `Situation n°${NB}2`, etat: "Conforme", choisi: false },
  { lot: "Lot 12 · Peinture", n: `Situation n°${NB}1`, etat: "Conforme", choisi: false },
];

function PanneauSituations() {
  return (
    <div className="flex flex-col gap-4">
      <Liste>
        {SITUATIONS.map((s) => (
          <li key={s.lot} className="flex items-center gap-3 py-3 first:pt-0">
            <span
              aria-hidden
              className={cn("size-2.5 shrink-0 rounded-full", s.choisi ? "bg-[#0a0a0a]" : "border border-[#e5e5e5]")}
            />
            <span className={cn("min-w-0 flex-1 truncate text-sm", s.choisi ? "font-medium text-[#0a0a0a]" : "text-[#737373]")}>
              {s.lot}
            </span>
            <span className="hidden shrink-0 text-xs text-[#737373] sm:inline">{s.n}</span>
            <Etat fort={s.choisi}>{s.etat}</Etat>
          </li>
        ))}
      </Liste>
      <Legende>
        {`Lot 03 : 62${NB}% facturés, 55${NB}% constatés sur le chantier. L'écart est chiffré poste par poste avant le visa de la situation.`}
      </Legende>
    </div>
  );
}

const RECUS = [
  { heure: `9${NB}h${NB}12`, titre: "Plan du rez-de-chaussée, indice D", sous: "La cote de recul change encore", etat: "Signalé", fort: true },
  { heure: `10${NB}h${NB}40`, titre: "Offre du lot 05", sous: "Deux postes non chiffrés", etat: "Signalé", fort: true },
  {
    heure: `14${NB}h${NB}05`,
    titre: "Fiche technique, porte coupe-feu",
    sous: "Visa daté sur le délai de commande",
    etat: `Avant le 3${NB}oct.`,
    fort: false,
  },
];

function PanneauAlertes() {
  return (
    <Liste>
      {RECUS.map((r) => (
        <Ligne key={r.titre}>
          <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-[#737373]">{r.heure}</span>
          <Texte titre={r.titre} sous={r.sous} />
          <Etat fort={r.fort}>{r.etat}</Etat>
        </Ligne>
      ))}
    </Liste>
  );
}

const QUESTIONS = [
  { tuile: "offres", qui: "Entreprise · lot 03", objet: "Cote de recul, planche 07", etat: `8${NB}j sans réponse`, fort: true },
  { tuile: "plans", qui: "BET structure", objet: "Réservation de la trémie au R+1", etat: "Répondu", fort: false },
  { tuile: "visa", qui: "Bureau de contrôle", objet: "Isolement du local technique", etat: `2${NB}j`, fort: false },
];

function PanneauQuestions() {
  return (
    <div className="flex flex-col gap-4">
      <Liste>
        {QUESTIONS.map((q) => (
          <Ligne key={q.qui}>
            <Tuile src={q.tuile} />
            <Texte titre={q.qui} sous={q.objet} />
            <Etat fort={q.fort}>{q.etat}</Etat>
          </Ligne>
        ))}
      </Liste>
      <Legende>La question sans réponse depuis huit jours remonte en tête du point du matin, avec son extrait.</Legende>
    </div>
  );
}

const PANNEAUX: Record<Valeur, React.ComponentType> = {
  planches: PanneauPlanches,
  lecteur: PanneauLecteur,
  situations: PanneauSituations,
  alertes: PanneauAlertes,
  questions: PanneauQuestions,
};

function CadrePanneau({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#e5e5e5] bg-[#fafafa]/60 p-5 sm:p-6 lg:min-h-60">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0a0a0a]/40">Exemple · un dossier de permis</p>
      {children}
    </div>
  );
}

export default function FileDesPoints() {
  const [actif, setActif] = React.useState<Valeur>(FONCTIONS[0].valeur);
  const onglets = React.useRef<(HTMLButtonElement | null)[]>([]);
  const id = React.useId();

  /* Navigation au clavier d'un tablist vertical, comme Radix : flèches,
     Début, Fin ; le focus suit, l'onglet s'active. */
  const clavier = (e: React.KeyboardEvent, i: number) => {
    const n = FONCTIONS.length;
    const cible =
      e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowUp" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (cible < 0) return;
    e.preventDefault();
    setActif(FONCTIONS[cible].valeur);
    onglets.current[cible]?.focus();
  };

  const Panneau = PANNEAUX[actif];
  return (
    <div className="relative mt-8 md:mt-16 lg:grid lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-12">
      <div role="tablist" aria-orientation="vertical" aria-label="Fonctions de Lorani" className="flex w-full flex-col gap-1">
        {FONCTIONS.map((f, i) => {
          const choisi = f.valeur === actif;
          return (
            <React.Fragment key={f.valeur}>
            <button
              ref={(el) => {
                onglets.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-onglet-${f.valeur}`}
              aria-selected={choisi}
              aria-controls={`${id}-panneau ${id}-panneau-m`}
              tabIndex={choisi ? 0 : -1}
              onClick={() => setActif(f.valeur)}
              onKeyDown={(e) => clavier(e, i)}
              className={cn(
                "relative flex w-full flex-col items-start gap-1.5 rounded-[8px] px-4 py-3 text-start transition-colors",
                "after:absolute after:inset-y-0 after:-start-1 after:w-0.5 after:bg-[#0a0a0a] after:transition-opacity",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]/30",
                choisi ? "text-[#0a0a0a] after:opacity-100" : "text-[#0a0a0a]/60 after:opacity-0 hover:text-[#0a0a0a]",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <f.icone aria-hidden className="size-4 shrink-0" />
                {f.titre}
              </span>
              <span className={cn("text-xs leading-relaxed text-[#737373]", !choisi && "max-lg:hidden")}>{f.resume}</span>
            </button>
            {/* Téléphone : l'exemple s'ouvre SOUS l'onglet touché, en accordéon — posé sous la liste, il
                tombait sous cinq onglets et le toucher ne montrait rien. Au bureau, le panneau de droite. */}
            {choisi && (
              <div role="tabpanel" id={`${id}-panneau-m`} aria-labelledby={`${id}-onglet-${f.valeur}`} className="mb-3 lg:hidden">
                <CadrePanneau>
                  <Panneau />
                </CadrePanneau>
              </div>
            )}
            </React.Fragment>
          );
        })}
      </div>

      <div role="tabpanel" id={`${id}-panneau`} aria-labelledby={`${id}-onglet-${actif}`} className="hidden lg:block lg:self-start">
        <CadrePanneau>
          <Panneau />
        </CadrePanneau>
      </div>
    </div>
  );
}
