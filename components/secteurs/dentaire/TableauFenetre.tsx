/* ══════════════════════════════════════════════════════════════════════
   Le tableau de la fenêtre Tiroma — le volet principal de la fenêtre du
   héros de la référence (titre, deux boutons, filtres, grille de six
   colonnes à lignes de 24 → 36 px, pied), recopié classe par classe et
   rendu à partir de données. Deux jeux :
   • TABLEAU_PATIENTS : le point du matin (patients, actes, mutuelles,
     devis, fauteuils) avec les textes de la démo, des cartes posées sur
     les photos et du relevé de la page du 24/09 ;
   • TABLEAU_COMPARATIF : « Ni un logiciel, ni une assistante de plus »,
     la comparaison par catégories d'outils (textes.ts, COMPARATIF), dans
     le quatrième onglet. Un point vert = « oui » (comme avant), « – » = non.
   Les couleurs des pastilles suivent, ligne par ligne, celles de la
   référence. Les pastilles des deux colonnes de teinte ne se replient
   pas (`whitespace-nowrap`, un seul mot dans la référence) : un libellé
   trop long est rogné par la cellule, comme la dernière colonne.
   ══════════════════════════════════════════════════════════════════════ */
import { CHIFFRES_SOURCES, COMPARATIF, COMPARATIF_COLONNES, type Case } from "./textes";

type Teinte = "vert" | "bleu" | "orange" | "violet" | "teal" | "ambre";
type Ligne = {
  lettre: string;
  fond: string;
  nom: string;
  secteur: string;
  etiquettes: string[];
  avis: { texte: string; teinte: Teinte };
  montant: { texte: string; teinte: Teinte };
  signal: { texte: string; forme: "eclair" | "vert" | "bleu" | "orange" };
};
export type Tableau = {
  titre: string;
  boutons: [string, string];
  filtres: [string, string];
  colonnes: [string, string, string, string, string, string];
  badge: string;
  lignes: Ligne[];
  pied: [string, string, string, string, string, string];
};

const PASTILLE: Record<Teinte, string> = {
  vert: "border-[#D4F4DC] bg-[#EDFAF0] text-[#1A7A4C] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  bleu: "border-[#DEEAFF] bg-[#EEF3FF] text-[#2D5BB2] dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300",
  orange: "border-[#FFE8D4] bg-[#FFF4EB] text-[#9A5A1A] dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300",
  violet: "border-[#EDE5FE] bg-[#F8F5FF] text-[#6B3FA0] dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-300",
  teal: "border-[#D1F0F9] bg-[#E8F7FC] text-[#1A7A8A] dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300",
  ambre: "border-[#FFEEBD] bg-[#FFF8E0] text-[#8A6A00] dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
};
const POINT = { vert: "bg-emerald-500", bleu: "bg-blue-500", orange: "bg-orange-400" } as const;

/* Les suites de couleurs de la référence, ligne par ligne. */
const FONDS = ["bg-black", "bg-blue-600", "bg-red-500", "bg-orange-500", "bg-emerald-600", "bg-red-600", "bg-blue-500", "bg-blue-800", "bg-indigo-600", "bg-red-700", "bg-blue-700", "bg-blue-400", "bg-sky-500"];
const AVIS: Teinte[] = ["vert", "vert", "bleu", "vert", "vert", "orange", "bleu", "vert", "vert", "bleu", "vert", "orange", "vert"];
const MONTANTS: Teinte[] = ["violet", "violet", "vert", "vert", "vert", "teal", "vert", "teal", "teal", "ambre", "ambre", "orange", "ambre"];
const SIGNAUX: Ligne["signal"]["forme"][] = ["eclair", "vert", "bleu", "vert", "eclair", "orange", "bleu", "vert", "vert", "bleu", "vert", "orange", "vert"];

function ligne(i: number, nom: string, secteur: string, etiquettes: string[], avis: string, montant: string, signal: string): Ligne {
  return {
    lettre: nom.replace(/^(Mme|M\.)\s/, "").charAt(0).toUpperCase(),
    fond: FONDS[i], nom, secteur, etiquettes,
    avis: { texte: avis, teinte: AVIS[i] }, montant: { texte: montant, teinte: MONTANTS[i] }, signal: { texte: signal, forme: SIGNAUX[i] },
  };
}

export const TABLEAU_PATIENTS: Tableau = {
  titre: "Point du matin",
  boutons: ["Lecture seule", "Exemple"],
  filtres: ["Relevé de 6 h 45 · exemple", "Rendez-vous du jour, 3 fauteuils"],
  colonnes: ["Patients", "Acte", "Plans de traitement", "Mutuelle", "Devis", "Agenda"],
  badge: "Tiroma",
  lignes: [
    ligne(0, "Mme R.", "Couronne 26", ["Plan accepté", "Préfère le matin"], "non requise", "540 €", "Proposée pour le créneau libéré"),
    ligne(1, "M. L.", "Implant 24 et couronne", ["Relancer la mutuelle", "en attente, 12 jours"], "Présences", "1 850 €", "3 séances"),
    ligne(2, "Mme B.", "Bridge 45-47", ["Planifier 2 × 60 min, fauteuil 1"], "accord reçu", "1 280 €", "2 séances"),
    ligne(3, "M. D.", "Couronne céramo-métallique 14", ["Proposée en rang 2", "Reste à charge 0 €", "accord reçu hier"], "accord reçu", "500 €", "0 €, panier 100 % Santé"),
    ligne(4, "M. P.", "Détartrage et contrôle", ["Liste d'attente", "Disponible sous 1 h", "40 min demandées"], "Objectif", "120 €", "Liste d'attente"),
    ligne(5, "Mme A.", "Contrôle annuel dû depuis 14 mois", ["Contrôle dû", "Habite à 5 min"], "30 min", "410 €", "Contrôle dû"),
    ligne(6, "M. C.", "Couronne céramique 46", ["sans rendez-vous", "Devis signé il y a 23 jours · accord de la mutuelle reçu"], "accord reçu", "220 €", "Plan de traitement · M. C."),
    ligne(7, "M. C.", "Inlay-onlay 36", ["Acte", "Reste à charge"], "accord reçu", "245 €", "sans rendez-vous"),
    ligne(8, "M. C.", "Implant 24", ["1 séance"], "accord reçu", "1 380 €", "1 120 €"),
    ligne(9, "Fauteuil 1", "Dr Martin", ["Complet jusqu'à 18 h"], "Agenda", "92 %", "prêt"),
    ligne(10, "Fauteuil 2", "Dr Lebrun", ["Creux de 11 h 30 à 12 h 15"], "Présences", "74 %", "Créneau de 10 h 30 repris"),
    ligne(11, "Fauteuil 3", "Collaborateur", ["Après-midi sans assistante : 2 h 30 vides", "Deux soins à basculer sur le fauteuil 1", "sans assistante à 14 h"], "Objectif", "51 %", "Fauteuil 3 · cet après-midi"),
    ligne(12, "M. T.", "Contrôle dû", ["Second créneau libéré : aujourd'hui 16 h, fauteuil 3, 30 min. Premier proposé : M. T., contrôle dû."], "Lecture seule", "30 min", "Liste d'attente"),
  ],
  pied: ["4 sur 12, du plus ancien", "Exemple", "Lecture seule", "Point du matin à 7 h", "Taux d'occupation", "3 points"],
};

const cas = (v: Case) => (v === true ? "oui" : v === false ? "–" : v);
export const TABLEAU_COMPARATIF: Tableau = {
  titre: "Un logiciel de cabinet garde l'agenda sans dire qui appeler",
  boutons: ["Pourquoi Tiroma", "Avant / après"],
  filtres: ["Comparaison par catégories d'outils, sans viser un éditeur en particulier.", "Tiroma ne remplace pas votre logiciel de cabinet : il le lit."],
  colonnes: ["Critère", COMPARATIF_COLONNES[0], COMPARATIF_COLONNES[1], COMPARATIF_COLONNES[2], COMPARATIF_COLONNES[3], "Pourquoi Tiroma"],
  badge: "Tiroma",
  lignes: [
    ...COMPARATIF.map((c, i) => ligne(i, c.critere, cas(c.cases[0]), [cas(c.cases[1])], cas(c.cases[2]), cas(c.cases[3]), cas(c.cases[0]))),
    ...CHIFFRES_SOURCES.map((c, k) => ligne(11 + k, c.chiffre, c.texte, [c.source], "oui", c.chiffre, c.source)),
  ],
  pied: ["Sur audit", "Inclus", "Variable", "Un salaire", "Formation", "Abonnement"],
};

const CELLULE = "flex min-w-0 items-center overflow-hidden px-2 text-[11px] text-tir-foreground lg:px-3 lg:text-sm border-tir-border";
const ENTETE = "flex items-center gap-1 px-2 font-medium text-[11px] text-tir-muted-foreground lg:px-3 lg:text-xs border-tir-border";

function Badge({ texte }: { texte: string }) {
  return (
    <span className="ml-1 inline-flex items-center rounded-[4px] border border-tir-border bg-tir-muted px-1 py-px font-medium text-[10px] text-tir-muted-foreground leading-none lg:text-[10px]">
      {texte}
    </span>
  );
}

export default function TableauFenetre({ titre, boutons, filtres, colonnes, badge, lignes, pied }: Tableau) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-tir-card">
      <div className="flex shrink-0 items-center justify-between border-tir-border border-b px-2 py-1 sm:px-3 sm:py-2 lg:px-4">
        <button type="button" className="flex items-center gap-1 font-semibold text-[11px] text-tir-foreground leading-4 sm:text-sm sm:leading-5">
          {titre}
          <svg aria-hidden="true" role="presentation" className="size-3.5 text-tir-muted-foreground" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {boutons.map((b) => (
            <button key={b} type="button" className="flex items-center gap-1 rounded-md border border-tir-border px-2 py-1 font-medium text-[11px] text-tir-foreground lg:text-xs">
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 border-tir-border border-b px-3 py-1.5 sm:flex lg:px-4">
        <span className="flex items-center gap-1 rounded-md border border-tir-border bg-tir-muted px-2 py-0.5 font-medium text-[11px] text-tir-foreground lg:text-xs">
          <svg aria-hidden="true" role="presentation" className="size-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4-3 4 3M3 9l4 3 4-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {filtres[0]}
        </span>
        <span className="flex items-center gap-1 rounded-md border border-tir-border bg-tir-muted px-2 py-0.5 font-medium text-[11px] text-tir-foreground lg:text-xs">
          {filtres[1]}
          <button type="button" className="text-tir-muted-foreground hover:text-tir-foreground">
            <svg aria-hidden="true" role="presentation" className="size-4" viewBox="0 0 16 16" fill="none">
              <circle cx="4" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
              <circle cx="12" cy="8" r="1.2" fill="currentColor" />
            </svg>
          </button>
        </span>
        <button type="button" className="flex items-center gap-1 rounded-md border border-tir-border border-dashed px-2 py-0.5 font-medium text-[11px] text-tir-muted-foreground lg:text-xs">
          <svg aria-hidden="true" role="presentation" className="size-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="scrollbar-none flex-1 overflow-x-auto overflow-y-auto">
        <div className="grid min-w-[640px] auto-rows-[24px] grid-cols-[120px_minmax(80px,1fr)_minmax(120px,1.5fr)_minmax(80px,1fr)_120px_120px] sm:auto-rows-[28px] md:auto-rows-[32px] lg:min-w-0 lg:auto-rows-[36px] lg:grid-cols-[204px_minmax(136px,1fr)_minmax(204px,1.5fr)_minmax(136px,1fr)_204px_204px]">
          <div className={`${ENTETE} border-r border-b`}>
            <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-md border border-tir-border bg-tir-card" />
            <span className="ml-1">{colonnes[0]}</span>
          </div>
          <div className={`${ENTETE} border-r border-b`}>{colonnes[1]}</div>
          <div className={`${ENTETE} border-r border-b`}>{colonnes[2]}</div>
          <div className={`${ENTETE} border-r border-b`}>
            {colonnes[3]}
            <Badge texte={badge} />
          </div>
          <div className={`${ENTETE} border-r border-b`}>
            {colonnes[4]}
            <Badge texte={badge} />
          </div>
          <div className={`${ENTETE} border-b`}>{colonnes[5]}</div>
          {lignes.map((l, i) => (
            <Ligne key={i} {...l} />
          ))}
          <div className={`${CELLULE} border-r border-b`}>
            <span className="font-medium text-[11px] text-tir-muted-foreground lg:text-xs">{pied[0]}</span>
          </div>
          {pied.slice(1).map((p, i) => (
            <div key={i} className={`${CELLULE} ${i === 4 ? "border-b" : "border-r border-b"}`}>
              <span className="text-[11px] text-tir-muted-foreground lg:text-xs">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ligne({ lettre, fond, nom, secteur, etiquettes, avis, montant, signal }: Ligne) {
  return (
    <>
      <div className={`${CELLULE} border-r border-b`}>
        <span className="flex items-center gap-1.5 truncate">
          <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-md border border-tir-border bg-tir-card" />
          <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] font-bold text-[8px] text-white ${fond}`}>{lettre}</span>
          <span className="truncate font-medium text-[11px] text-tir-foreground underline decoration-tir-border underline-offset-2 lg:text-sm">{nom}</span>
        </span>
      </div>
      <div className={`${CELLULE} border-r border-b`}>
        <span className="inline-flex min-w-0 max-w-full items-center overflow-hidden rounded-lg border border-[#B8D0FF] bg-tir-card px-2 py-0.5 font-medium text-[#407FF2] text-[11px] leading-none lg:text-xs dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300">
          <span className="truncate">{secteur}</span>
        </span>
      </div>
      <div className={`${CELLULE} border-r border-b`}>
        <span className="flex items-center gap-1 overflow-hidden">
          {etiquettes.map((e) => (
            <span key={e} className="shrink-0 truncate rounded-lg border border-tir-border bg-tir-muted px-2 py-0.5 font-medium text-[11px] text-tir-foreground lg:text-xs">
              {e}
            </span>
          ))}
        </span>
      </div>
      <div className={`${CELLULE} border-r border-b bg-tir-muted/40`}>
        <span className={`inline-flex items-center whitespace-nowrap rounded-lg border px-2 py-0.5 font-medium text-[11px] leading-none lg:text-xs ${PASTILLE[avis.teinte]}`}>{avis.texte}</span>
      </div>
      <div className={`${CELLULE} border-r border-b bg-tir-muted/40`}>
        <span className={`inline-flex items-center whitespace-nowrap rounded-lg border px-2 py-0.5 font-medium text-[11px] leading-none lg:text-xs ${PASTILLE[montant.teinte]}`}>{montant.texte}</span>
      </div>
      <div className={`${CELLULE} border-b`}>
        <span className="inline-flex items-center gap-1 text-[11px] text-tir-foreground lg:text-xs">
          {signal.forme === "eclair" ? (
            <span className="text-emerald-500">
              <svg aria-hidden="true" role="presentation" className="size-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M7.5 1L3 8h4l-1 5 5-7H7l.5-5z" fill="currentColor" />
              </svg>
            </span>
          ) : (
            <span className={`inline-block size-2 rounded-full ${POINT[signal.forme]}`} />
          )}
          {signal.texte}
        </span>
      </div>
    </>
  );
}
