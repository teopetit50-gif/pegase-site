/* ══════════════════════════════════════════════════════════════════════
   LES VIGNETTES DE L'ACCUEIL (22/11/2026)

   Teo : « génère des images plutôt que de mettre le dashboard client »,
   puis, devant les images générées : « j'aime pas du tout, juste récupère
   des components pour remplacer les images ». Les captures de l'espace
   client laissent donc la place à des composants dessinés en code : une
   grille de modules façon Odoo en haut de page, puis une vignette par
   onglet, par étape et par métier. Chacune dit UNE chose, en gros, avec
   les mots de la page.

   Le cadre est celui des captures (même liseré, mêmes rayons). Les
   couleurs sont écrites en clair (#0a0a0a, #fff, noir en transparence) :
   les classes text-white / bg-white sont repeintes par `.aa-clair` et ne
   doivent pas servir ici. Aucun JavaScript côté navigateur.

   Les montants et les noms affichés sont des exemples, comme l'étaient
   ceux des captures (« Atelier Bertin »).
   ══════════════════════════════════════════════════════════════════════ */
import {
  Briefcase,
  Building2,
  Calculator,
  CarFront,
  Check,
  Clock,
  DraftingCompass,
  FileText,
  FolderOpen,
  HardHat,
  Hotel,
  Landmark,
  MessageSquare,
  Package,
  Plus,
  Puzzle,
  ReceiptText,
  Scale,
  Send,
  ShoppingCart,
  Smile,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";

const ENCRE = "text-[#0a0a0a]";
const SOURD = "text-black/55";
const CARTE = "rounded-xl border border-black/[0.07] bg-[#fff]";

/* le cadre des captures, avec un composant dedans ; sur téléphone la
   hauteur suit le contenu au lieu du rapport 1240/724, trop bas pour lire */
export function CadreVignette({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl">
      <div className="relative w-full md:aspect-[1240/724]">
        <div className="relative md:absolute md:inset-0 rounded-[20px] p-1 md:p-1.5 bg-neutral-800/40 backdrop-blur-md overflow-hidden">
          <div className="aa-cadre-lisere pointer-events-none absolute inset-0 z-50 rounded-[20px]" />
          <div className="aa-vig relative flex h-full w-full overflow-hidden rounded-[10px] md:rounded-[12px] bg-[#fafafa]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tuile({ I, nom, pointille = false }: { I: LucideIcon; nom: string; pointille?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 md:gap-3 rounded-xl border px-2 py-4 md:py-2 text-center ${
        pointille ? "border-dashed border-black/20" : "border-black/[0.07] bg-[#fff]"
      }`}
    >
      <span className={`flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-lg md:rounded-xl bg-black/[0.04] ${ENCRE}`}>
        <I className="h-4 w-4 md:h-[22px] md:w-[22px]" strokeWidth={1.6} />
      </span>
      <span className={`text-[11px] md:text-[15px] font-medium leading-tight ${ENCRE}`}>{nom}</span>
    </div>
  );
}

function Pastille({ children }: { children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md bg-black/[0.05] px-2 py-0.5 text-[10px] md:text-xs font-medium ${ENCRE}`}>
      {children}
    </span>
  );
}

function Entete({ titre, droite }: { titre: string; droite?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs md:text-sm font-medium ${ENCRE}`}>{titre}</span>
      {droite ? <span className={`text-[11px] md:text-xs ${SOURD}`}>{droite}</span> : null}
    </div>
  );
}

/* ── haut de page : les douze modules, comme la grille d'applications d'Odoo ── */
const MODULES: [LucideIcon, string][] = [
  [ReceiptText, "Ventes"],
  [ShoppingCart, "Achats"],
  [Package, "Stock"],
  [Landmark, "Banque"],
  [Calculator, "Comptabilité"],
  [FolderOpen, "Documents"],
  [Send, "Relances"],
  [MessageSquare, "Demandes clients"],
  [FileText, "Factures fournisseurs"],
  [UserRoundCheck, "Clients inactifs"],
  [Briefcase, "Modules métier"],
  [Puzzle, "Sur mesure"],
];

export function VignetteModules() {
  return (
    <div className="grid w-full grid-cols-3 gap-2 p-3 md:h-full md:grid-cols-4 md:grid-rows-3 md:gap-3 md:p-6">
      {MODULES.map(([I, nom]) => (
        <Tuile key={nom} I={I} nom={nom} />
      ))}
    </div>
  );
}

/* ── gestion et étape 02 : vous décrivez, l'IA fait les réglages ── */
const REGLAGES = ["Modules activés", "TVA", "Plan comptable", "Modèles de documents"];

export function VignetteReglages({ compacte = false }: { compacte?: boolean }) {
  return (
    <div className={`grid w-full gap-2 p-3 md:gap-3 ${compacte ? "content-center md:p-4" : "md:h-full md:grid-cols-2 md:p-6"}`}>
      <div className={`${CARTE} flex-col justify-center gap-2 p-3 md:gap-3 ${compacte ? "hidden" : "flex md:p-6"}`}>
        <Entete titre="Vous décrivez votre activité" />
        <p className={`rounded-lg bg-black/[0.04] p-3 text-xs leading-relaxed ${compacte ? "" : "md:text-base"} ${ENCRE}`}>
          « Nous vendons du matériel électrique aux artisans, depuis deux dépôts. »
        </p>
      </div>
      <div className={`${CARTE} flex flex-col justify-center gap-2 p-3 ${compacte ? "" : "md:gap-3 md:p-6"}`}>
        <Entete titre="L'IA fait les réglages" />
        <ul className="flex flex-col gap-1.5 md:gap-2">
          {REGLAGES.map((r) => (
            <li key={r} className={`flex items-center gap-2 text-xs ${compacte ? "" : "md:text-base"} ${ENCRE}`}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {r}
            </li>
          ))}
          <li className={`flex items-center gap-2 text-xs ${compacte ? "" : "md:text-base"} ${SOURD}`}>
            <Clock className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            Vérifié par votre expert-comptable
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ── agents : quatre lignes prêtes à valider ── */
const AGENTS: [LucideIcon, string, string][] = [
  [Send, "Relances", "6 relances écrites"],
  [MessageSquare, "Demandes clients", "3 réponses rédigées"],
  [FileText, "Factures fournisseurs", "12 factures lues"],
  [UserRoundCheck, "Clients inactifs", "8 clients à recontacter"],
];

export function VignetteAgents() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3 md:gap-3 md:p-6">
      <Entete titre="Préparé cette nuit par vos agents" droite="4 agents" />
      {AGENTS.map(([I, nom, fait]) => (
        <div key={nom} className={`${CARTE} flex items-center gap-3 p-3 md:p-4`}>
          <span className={`flex h-9 w-9 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] ${ENCRE}`}>
            <I className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.6} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-xs md:text-base font-medium ${ENCRE}`}>{nom}</span>
            <span className={`truncate text-[11px] md:text-sm ${SOURD}`}>{fait}</span>
          </span>
          <Pastille>À valider</Pastille>
        </div>
      ))}
    </div>
  );
}

/* ── métiers : sept modules, et le vôtre ── */
const METIERS: [LucideIcon, string][] = [
  [HardHat, "BTP"],
  [Scale, "Avocats"],
  [DraftingCompass, "Architectes"],
  [CarFront, "Loueurs automobiles"],
  [Smile, "Cabinets dentaires"],
  [Hotel, "Hôtels"],
  [Building2, "Grands groupes"],
];

export function VignetteMetiers() {
  return (
    <div className="grid w-full grid-cols-2 gap-2 p-3 md:h-full md:grid-cols-4 md:grid-rows-2 md:gap-3 md:p-6">
      {METIERS.map(([I, nom]) => (
        <Tuile key={nom} I={I} nom={nom} />
      ))}
      <Tuile I={Plus} nom="Votre métier, sur mesure" pointille />
    </div>
  );
}

/* ── sur mesure : le module qui manque s'ajoute aux autres ── */
const ETAPES_SUR_MESURE = ["Nous regardons comment vous travaillez", "Nous construisons le module", "Il s'ajoute à votre logiciel"];

export function VignetteSurMesure() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3 md:gap-4 md:p-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Tuile I={ReceiptText} nom="Ventes" />
        <Tuile I={Package} nom="Stock" />
        <Tuile I={Calculator} nom="Comptabilité" />
        <Tuile I={Plus} nom="Votre module" pointille />
      </div>
      <ol className="grid gap-2 md:grid-cols-3 md:gap-3">
        {ETAPES_SUR_MESURE.map((e, k) => (
          <li key={e} className={`${CARTE} flex items-center gap-3 p-3 md:p-4`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[11px] font-medium text-[#fff]">
              {k + 1}
            </span>
            <span className={`text-xs md:text-sm leading-snug ${ENCRE}`}>{e}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── validation et étape 03 : rien ne part sans vous ── */
const A_VALIDER: [string, string, string][] = [
  ["Relance", "Facture F-2041, Atelier Bertin", "1 240,00 €"],
  ["Réponse", "Demande de devis reçue hier soir", ""],
  ["Facture fournisseur", "Pièce lue et contrôlée", "860,40 €"],
];

export function VignetteValidation({ compacte = false }: { compacte?: boolean }) {
  return (
    <div className={`flex w-full flex-col justify-center gap-2 p-3 ${compacte ? "md:p-4" : "md:gap-3 md:p-6"}`}>
      <Entete titre="À valider ce matin" droite="3 éléments" />
      {A_VALIDER.map(([type, objet, montant], k) => (
        <div key={type} className={`${CARTE} flex items-center gap-3 p-3 ${compacte ? "" : "md:p-4"}`}>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-xs font-medium ${compacte ? "" : "md:text-base"} ${ENCRE}`}>
              {type}
              {montant ? <span className={`font-normal ${SOURD}`}> · {montant}</span> : null}
            </span>
            <span className={`truncate text-[11px] ${compacte ? "" : "md:text-sm"} ${SOURD}`}>{objet}</span>
          </span>
          {k === 0 ? (
            <>
              {compacte ? null : <span className={`hidden md:inline-flex rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium ${ENCRE}`}>Corriger</span>}
              <span className="inline-flex shrink-0 rounded-md bg-[#0a0a0a] px-3 py-1.5 text-[11px] md:text-xs font-medium text-[#fff]">Valider</span>
            </>
          ) : (
            <Pastille>À valider</Pastille>
          )}
        </div>
      ))}
      {compacte ? null : <p className={`pt-1 text-center text-[11px] md:text-xs ${SOURD}`}>Rien ne part sans votre accord.</p>}
    </div>
  );
}

/* ── étape 01 : ce avec quoi vous repartez de l'audit ── */
const AUDIT_POINTS = ["Votre activité, passée en revue", "Les modules et les agents utiles", "Une proposition écrite, prix compris"];

export function VignetteAudit() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3 md:p-4">
      <div className={`${CARTE} flex items-center justify-between gap-3 p-3`}>
        <span className="flex flex-col">
          <span className={`text-xs font-medium ${ENCRE}`}>Audit</span>
          <span className={`text-[11px] ${SOURD}`}>30 minutes, sans engagement</span>
        </span>
        <Pastille>Offert</Pastille>
      </div>
      <ul className={`${CARTE} flex flex-col gap-2 p-3`}>
        {AUDIT_POINTS.map((p) => (
          <li key={p} className={`flex items-center gap-2 text-xs ${ENCRE}`}>
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── cartes métier : l'icône du métier et ce que son module suit ── */
const PAR_METIER: Record<string, { I: LucideIcon; suit: string[] }> = {
  Daliro: { I: HardHat, suit: ["Devis", "Avenants", "Situations"] },
  Tamila: { I: Scale, suit: ["Faits", "Pièces", "Pages"] },
  Lorani: { I: DraftingCompass, suit: ["Plans", "CCTP", "DPGF"] },
  Varelo: { I: Building2, suit: ["Sociétés", "Clients", "Fournisseurs", "Contrats"] },
};

export function VignetteMetier({ nom }: { nom: string }) {
  const m = PAR_METIER[nom] ?? { I: Briefcase, suit: [] };
  return (
    <div className="aa-vig flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fafafa] p-4">
      <span className={`flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl border border-black/[0.07] bg-[#fff] ${ENCRE}`}>
        <m.I className="h-6 w-6 md:h-7 md:w-7" strokeWidth={1.5} />
      </span>
      <span className="flex flex-wrap items-center justify-center gap-1.5">
        {m.suit.map((s) => (
          <Pastille key={s}>{s}</Pastille>
        ))}
      </span>
    </div>
  );
}

/* l'onglet → sa vignette */
export function VignetteOnglet({ id }: { id: string }) {
  if (id === "gestion") return <VignetteReglages />;
  if (id === "agents") return <VignetteAgents />;
  if (id === "metiers") return <VignetteMetiers />;
  if (id === "sur-mesure") return <VignetteSurMesure />;
  return <VignetteValidation />;
}

/* l'étape → sa vignette, en version compacte (cadre 4/3) */
export function VignetteEtape({ n }: { n: string }) {
  if (n === "01") return <VignetteAudit />;
  if (n === "02") return <VignetteReglages compacte />;
  return <VignetteValidation compacte />;
}
