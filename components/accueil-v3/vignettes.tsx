/* ══════════════════════════════════════════════════════════════════════
   LES VIGNETTES DE L'ACCUEIL (22/11/2026)

   Teo : « génère des images plutôt que de mettre le dashboard client »,
   puis, devant les images générées : « j'aime pas du tout, juste récupère
   des components pour remplacer les images ». Les captures de l'espace
   client laissent donc la place à des composants dessinés en code.

   2ᵉ passe, le même jour (Teo : « c'est top, c'est facile à comprendre,
   mais essaye de ne pas faire les mêmes images, et quand c'est des grosses
   images, pas que quelques petits trucs : vraiment beaucoup de détails »).
   Deux règles en sortent, à tenir pour toute vignette ajoutée ici :
     1. UN VISUEL PAR EMPLACEMENT. Treize emplacements, treize dessins
        différents : aucune vignette n'est réutilisée ni déclinée.
     2. UN GRAND CADRE EST REMPLI. Le haut de page et les cinq onglets
        montrent des chiffres, des lignes, un graphique, un courrier, un
        journal, comme un écran de logiciel, pas trois icônes dans du vide.

   Le cadre est celui des captures (même liseré, mêmes rayons). Les
   couleurs sont écrites en clair (#0a0a0a, #fff, noir en transparence) :
   les classes text-white / bg-white sont repeintes par `.aa-clair` et ne
   doivent pas servir ici. Aucun JavaScript côté navigateur.

   Les noms, les montants et les pièces affichés sont des exemples, comme
   l'étaient ceux des captures (« Atelier Bertin »).
   ══════════════════════════════════════════════════════════════════════ */
import {
  Bot,
  Building2,
  Calculator,
  CarFront,
  DraftingCompass,
  FileText,
  FolderOpen,
  HardHat,
  Hotel,
  Landmark,
  MessageSquare,
  Package,
  Plus,
  ReceiptText,
  Scale,
  Send,
  ShoppingCart,
  Smile,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { Bloc, Bulle, CARTE, ENCRE, FILET, Fait, Ligne, Pastille, SOURD } from "@/components/vignettes/briques";

/* le cadre des captures, avec un composant dedans. Le rapport est un
   minimum, pas une cage : une cale invisible le porte et partage la même
   case de grille que le contenu, si bien que la case prend la plus grande
   des deux hauteurs (un cadre au rapport fixe rognait le bas à 768 et
   1024 px). Sur téléphone il n'y a pas de cale : la hauteur suit le contenu. */
export function CadreVignette({ children, large = false }: { children: React.ReactNode; large?: boolean }) {
  return (
    <div className="relative w-full rounded-2xl">
      <div className="relative grid w-full rounded-[20px] p-1 md:p-1.5 bg-neutral-800/40 backdrop-blur-md overflow-hidden">
        <div className="aa-cadre-lisere pointer-events-none absolute inset-0 z-50 rounded-[20px]" />
        <div
          aria-hidden="true"
          className={`hidden md:block [grid-area:1/1] self-start w-full ${large ? "aspect-[5/2]" : "aspect-[1240/724]"}`}
        />
        <div className="aa-vig relative flex w-full [grid-area:1/1] overflow-hidden rounded-[10px] md:rounded-[12px] bg-[#fafafa]">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══ 1 · haut de page : le logiciel d'un coup d'œil ═══ */
const BARRES = [38, 52, 45, 64, 58, 72, 66, 84, 78, 100];
const STOCK: [string, string, number][] = [
  ["Câble 2,5 mm²", "340 m", 80],
  ["Disjoncteur 16 A", "12", 18],
  ["Gaine ICTA 20", "150 m", 55],
  ["Prise 2P+T", "410", 92],
];

export function VignetteLogiciel() {
  return (
    <div className="grid w-full grid-cols-2 content-center gap-2 p-3 md:grid-cols-4 md:gap-3 md:p-5">
      <Bloc I={ReceiptText} titre="Ventes" droite="ce mois" className="col-span-2 flex">
        <div className="flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className={`text-xl font-medium tracking-tight tabular-nums xl:text-3xl ${ENCRE}`}>128 400 €</span>
            <span className={`truncate text-[11px] ${SOURD}`}>42 factures, 9 devis en attente</span>
          </span>
          <div className="flex h-12 shrink-0 items-end gap-1 xl:h-20 xl:gap-1.5" aria-hidden="true">
            {BARRES.map((h, k) => (
              <span
                key={k}
                style={{ height: `${h}%` }}
                className={`w-2 rounded-sm xl:w-3.5 ${k === BARRES.length - 1 ? "bg-[#0a0a0a]" : "bg-black/15"}`}
              />
            ))}
          </div>
        </div>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <Ligne g="F-2048 · Atelier Bertin" d="1 240,00 €" etat="Payée" />
          <Ligne g="F-2049 · Menuiserie Roux" d="3 860,40 €" etat="Envoyée" />
          <Ligne g="D-0312 · Garage Lemaire" d="2 150,00 €" etat="Devis" />
        </div>
      </Bloc>
      <Bloc I={Landmark} titre="Banque" droite="aujourd'hui">
        <span className={`text-lg font-medium tracking-tight tabular-nums xl:text-2xl ${ENCRE}`}>54 210,36 €</span>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <Ligne g="Virement Atelier Bertin" d="+ 1 240,00" />
          <Ligne g="Loyer du dépôt" d="− 2 300,00" />
          <Ligne g="Carte · carburant" d="− 86,40" />
          <Ligne g="Virement Menuiserie Roux" d="+ 3 860,40" />
        </div>
      </Bloc>
      <Bloc I={Package} titre="Stock" droite="2 dépôts">
        {STOCK.map(([nom, qte, niveau]) => (
          <div key={nom} className="flex flex-col gap-1">
            <Ligne g={nom} d={qte} etat={niveau < 25 ? "À commander" : undefined} />
            <span className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
              <span className="block h-full rounded-full bg-[#0a0a0a]" style={{ width: `${niveau}%` }} />
            </span>
          </div>
        ))}
      </Bloc>
      <Bloc I={ShoppingCart} titre="Achats" droite="4 commandes" className="hidden md:flex">
        <Ligne g="N° 118 · Sté Électra" d="1 860,00 €" etat="En cours" />
        <Ligne g="N° 117 · Durand Fournitures" d="642,30 €" etat="Reçue" />
        <Ligne g="N° 116 · Sté Électra" d="2 104,00 €" etat="Reçue" />
        <Ligne g="N° 115 · Outillage Morel" d="318,90 €" etat="Facturée" />
      </Bloc>
      <Bloc I={Calculator} titre="Comptabilité" droite="novembre">
        <Ligne g="TVA collectée" d="21 400,00 €" />
        <Ligne g="TVA déductible" d="9 870,00 €" />
        <div className={`pt-2 ${FILET}`}>
          <Ligne g="TVA à déclarer" d="11 530,00 €" etat="Prête" />
        </div>
        <Ligne g="Écritures du mois" d="312" />
      </Bloc>
      <Bloc I={FolderOpen} titre="Documents" droite="vos modèles" className="hidden md:flex">
        <div className="flex flex-wrap gap-1">
          {["Devis", "Facture", "Bon de livraison", "Avoir"].map((d) => (
            <Pastille key={d}>{d}</Pastille>
          ))}
        </div>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <Ligne g="Contrat de maintenance.pdf" d="hier" />
          <Ligne g="Attestation URSSAF.pdf" d="lundi" />
        </div>
      </Bloc>
      <Bloc I={Bot} titre="Agents IA" droite="cette nuit">
        <span className={`text-lg font-medium tracking-tight tabular-nums xl:text-2xl ${ENCRE}`}>
          29 <span className={`text-[11px] font-normal ${SOURD}`}>éléments prêts</span>
        </span>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <Ligne g="Relances écrites" d="6" />
          <Ligne g="Réponses rédigées" d="3" />
          <Ligne g="Factures lues" d="12" />
          <Ligne g="Clients à recontacter" d="8" etat="À valider" pleine />
        </div>
      </Bloc>
    </div>
  );
}

/* ═══ 2 · gestion : vous décrivez, l'IA règle ═══ */
function VignetteReglages() {
  return (
    <div className="grid w-full content-center gap-2 p-3 md:grid-cols-2 md:gap-3 md:p-4">
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <span className={`text-xs font-medium ${ENCRE}`}>Vous décrivez votre activité</span>
        <Bulle moi>Nous vendons du matériel électrique aux artisans, depuis deux dépôts.</Bulle>
        <Bulle>Vendez-vous aussi aux particuliers ?</Bulle>
        <Bulle moi>Oui, au comptoir.</Bulle>
        <Bulle>C&apos;est noté. Je règle la TVA et vos modèles de documents.</Bulle>
      </div>
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium ${ENCRE}`}>L&apos;IA fait les réglages</span>
          <span className={`text-[11px] ${SOURD}`}>4 sur 5</span>
        </div>
        <span className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
          <span className="block h-full w-4/5 rounded-full bg-[#0a0a0a]" />
        </span>
        <ul className="flex flex-col gap-2 pt-1">
          <Fait>
            Modules activés <span className={SOURD}>· Ventes, Achats, Stock, Banque</span>
          </Fait>
          <Fait>
            TVA <span className={SOURD}>· 20 % et 10 %</span>
          </Fait>
          <Fait>
            Plan comptable <span className={SOURD}>· adapté au négoce</span>
          </Fait>
          <Fait>
            Modèles de documents <span className={SOURD}>· devis, facture, bon de livraison</span>
          </Fait>
          <Fait ok={false}>Votre expert-comptable vérifie avant le démarrage</Fait>
        </ul>
      </div>
    </div>
  );
}

/* ═══ 3 · agents : ce que chacun a préparé ═══ */
function VignetteAgents() {
  return (
    <div className="grid w-full content-center gap-2 p-3 md:grid-cols-2 md:gap-3 md:p-4">
      <Bloc I={Send} titre="Relances" droite={<Pastille>6 à valider</Pastille>}>
        <Ligne g="F-2031 · Garage Lemaire" d="2 150,00 €" etat="32 j" />
        <Ligne g="F-2027 · Plomberie Garnier" d="940,00 €" etat="18 j" />
        <p className={`rounded-md bg-black/[0.04] px-2 py-1.5 text-[11px] italic leading-snug ${SOURD}`}>
          « Bonjour, sauf erreur de notre part, la facture F-2031 reste à régler… »
        </p>
      </Bloc>
      <Bloc I={MessageSquare} titre="Demandes clients" droite={<Pastille>3 à valider</Pastille>}>
        <p className={`rounded-md bg-black/[0.04] px-2 py-1.5 text-[11px] leading-snug ${ENCRE}`}>
          « Pouvez-vous me faire un devis pour 40 prises ? »
        </p>
        <Ligne g="Reçue hier à 21 h 04" etat="Réponse rédigée" />
        <Ligne g="2 autres demandes" etat="Réponses rédigées" />
      </Bloc>
      <Bloc I={FileText} titre="Factures fournisseurs" droite={<Pastille>12 à valider</Pastille>}>
        <Ligne g="Sté Électra · facture 8841" etat="Contrôlée" />
        <Ligne g="Hors taxes" d="860,40 €" />
        <Ligne g="TVA 20 %" d="172,08 €" />
        <Ligne g="Toutes taxes" d="1 032,48 €" />
      </Bloc>
      <Bloc I={UserRoundCheck} titre="Clients inactifs" droite={<Pastille>8 à valider</Pastille>}>
        <Ligne g="Menuiserie Roux" d="dernière commande : 7 mois" />
        <Ligne g="Plomberie Garnier" d="9 mois" />
        <Ligne g="Garage Lemaire" d="11 mois" />
        <Ligne g="Message de reprise" etat="Rédigé" />
      </Bloc>
    </div>
  );
}

/* ═══ 4 · métiers : sept modules et ce que chacun suit ═══ */
const METIERS: [LucideIcon, string, string[]][] = [
  [HardHat, "BTP", ["Devis", "Avenants", "Situations"]],
  [Scale, "Avocats", ["Faits", "Pièces"]],
  [DraftingCompass, "Architectes", ["Plans", "CCTP", "DPGF"]],
  [CarFront, "Loueurs automobiles", ["États des lieux"]],
  [Smile, "Cabinets dentaires", ["Plannings"]],
  [Hotel, "Hôtels", ["Réservations"]],
  [Building2, "Grands groupes", ["Tableaux de bord"]],
];

function VignetteMetiers() {
  return (
    <div className="grid w-full grid-cols-2 content-center gap-2 p-3 md:grid-cols-4 md:gap-3 md:p-4">
      {METIERS.map(([I, nom, suit]) => (
        <div key={nom} className={`${CARTE} flex min-w-0 flex-col gap-2 p-3`}>
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.05] ${ENCRE}`}>
            <I className="h-4 w-4" strokeWidth={1.6} />
          </span>
          <span className={`text-xs font-medium leading-tight ${ENCRE}`}>{nom}</span>
          <span className="flex flex-wrap gap-1">
            {suit.map((s) => (
              <Pastille key={s}>{s}</Pastille>
            ))}
          </span>
        </div>
      ))}
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-dashed border-black/20 p-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-black/20 ${ENCRE}`}>
          <Plus className="h-4 w-4" strokeWidth={1.6} />
        </span>
        <span className={`text-xs font-medium leading-tight ${ENCRE}`}>Votre métier</span>
        <span className={`text-[11px] leading-snug ${SOURD}`}>Construit sur mesure</span>
      </div>
    </div>
  );
}

/* ═══ 5 · sur mesure : de votre façon de travailler au module ═══ */
const PARCOURS = ["Demande d'achat", "Accord du responsable", "Commande au fournisseur", "Réception"];

function VignetteSurMesure() {
  return (
    <div className="grid w-full content-center gap-2 p-3 md:grid-cols-[0.9fr_1.1fr] md:gap-3 md:p-4">
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <span className={`text-xs font-medium ${ENCRE}`}>Comment vous travaillez</span>
        <ol className="flex flex-col">
          {PARCOURS.map((e, k) => (
            <li key={e} className="flex items-stretch gap-2">
              <span className="flex flex-col items-center">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[10px] font-medium text-[#fff]">
                  {k + 1}
                </span>
                {k < PARCOURS.length - 1 ? <span className="w-px flex-1 bg-black/15" /> : null}
              </span>
              <span className={`pb-3 text-[11px] leading-5 ${ENCRE}`}>{e}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium ${ENCRE}`}>Votre module : validation des achats</span>
          <Pastille>Sur mesure</Pastille>
        </div>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <Ligne g="Demandeur" d="Julie M., dépôt nord" />
          <Ligne g="Fournisseur" d="Sté Électra" />
          <Ligne g="Montant" d="1 860,00 €" />
          <Ligne g="Règle" d="accord au-delà de 500 €" />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <span className={`rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-medium ${ENCRE}`}>Refuser</span>
          <span className="rounded-md bg-[#0a0a0a] px-2.5 py-1 text-[11px] font-medium text-[#fff]">Accorder</span>
        </div>
        <p className={`pt-2 text-[11px] leading-snug ${FILET} ${SOURD}`}>
          Ce que fait le module et son prix sont écrits avant de commencer.
        </p>
      </div>
    </div>
  );
}

/* ═══ 6 · validation : la file, le courrier prêt, le journal ═══ */
const FILE_DU_MATIN: [string, string, string][] = [
  ["Relance", "F-2031 · Garage Lemaire", "2 150,00 €"],
  ["Réponse", "Demande de devis, 40 prises", ""],
  ["Facture fournisseur", "Sté Électra · 8841", "1 032,48 €"],
  ["Client inactif", "Menuiserie Roux", ""],
];

function VignetteValidation() {
  return (
    <div className="grid w-full content-center gap-2 p-3 md:grid-cols-[0.95fr_1.05fr] md:gap-3 md:p-4">
      <div className={`${CARTE} flex flex-col gap-1.5 p-3`}>
        <div className="flex items-center justify-between gap-2 pb-1">
          <span className={`text-xs font-medium ${ENCRE}`}>À valider ce matin</span>
          <Pastille>4</Pastille>
        </div>
        {FILE_DU_MATIN.map(([type, objet, montant], k) => (
          <div key={type} className={`flex flex-col rounded-lg px-2 py-1.5 ${k === 0 ? "bg-black/[0.05]" : ""}`}>
            <Ligne g={type} d={montant || undefined} />
            <span className={`truncate text-[11px] leading-tight ${SOURD}`}>{objet}</span>
          </div>
        ))}
      </div>
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <span className={`text-xs font-medium ${ENCRE}`}>Relance · facture F-2031</span>
        <p className={`rounded-md bg-black/[0.04] px-2 py-1.5 text-[11px] leading-snug ${ENCRE}`}>
          Bonjour, sauf erreur de notre part, la facture F-2031 de 2 150,00 € reste à régler depuis 32 jours. Pouvez-vous
          nous dire où en est son règlement ?
        </p>
        <div className="flex items-center justify-end gap-2">
          <span className={`rounded-md border border-black/10 px-2.5 py-1 text-[11px] font-medium ${ENCRE}`}>Corriger</span>
          <span className="rounded-md bg-[#0a0a0a] px-2.5 py-1 text-[11px] font-medium text-[#fff]">Valider</span>
        </div>
        <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
          <span className={`text-[11px] font-medium ${ENCRE}`}>Journal</span>
          <Ligne g="Relance F-2027 validée par vous" d="08 h 02" />
          <Ligne g="Facture Sté Électra comptabilisée" d="08 h 01" />
        </div>
      </div>
    </div>
  );
}

/* ═══ 7 · étape 01 : le déroulé des trente minutes ═══ */
const DEROULE: [string, string][] = [
  ["0 min", "Votre activité"],
  ["10 min", "Ce qui vous prend du temps"],
  ["20 min", "Les modules et les agents utiles"],
  ["30 min", "Votre proposition écrite, prix compris"],
];

function VignetteAudit() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Votre audit</span>
        <Pastille pleine>Offert</Pastille>
      </div>
      <ol className={`${CARTE} flex flex-col gap-2 p-3`}>
        {DEROULE.map(([t, quoi]) => (
          <li key={t} className="flex items-baseline gap-2 text-[11px] leading-tight">
            <span className={`w-11 shrink-0 tabular-nums ${SOURD}`}>{t}</span>
            <span className={`min-w-0 ${ENCRE}`}>{quoi}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ═══ 8 · étape 02 : l'avancement de l'installation ═══ */
function VignetteInstallation() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Installation</span>
        <span className={`text-[11px] tabular-nums ${SOURD}`}>75 %</span>
      </div>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
        <span className="block h-full w-3/4 rounded-full bg-[#0a0a0a]" />
      </span>
      <ul className={`${CARTE} flex flex-col gap-2 p-3`}>
        <Fait>Questions de l&apos;IA</Fait>
        <Fait>Modules, TVA et plan comptable</Fait>
        <Fait>Reprise de vos données</Fait>
        <Fait ok={false}>Vérification de l&apos;expert-comptable</Fait>
      </ul>
    </div>
  );
}

/* ═══ 9 · étape 03 : un élément, un clic ═══ */
function VignetteUnClic() {
  return (
    <div className="flex w-full flex-col justify-center gap-2 p-3">
      <span className={`text-xs font-medium ${ENCRE}`}>Ce matin, 3 éléments prêts</span>
      <div className={`${CARTE} flex flex-col gap-2 p-3`}>
        <Ligne g="Réponse à une demande de devis" etat="1 sur 3" />
        <p className={`text-[11px] leading-snug ${SOURD}`}>« Bonjour, voici notre proposition pour vos 40 prises… »</p>
        <div className="flex items-center gap-2">
          <span className={`flex-1 rounded-md border border-black/10 py-1.5 text-center text-[11px] font-medium ${ENCRE}`}>
            Corriger
          </span>
          <span className="flex-1 rounded-md bg-[#0a0a0a] py-1.5 text-center text-[11px] font-medium text-[#fff]">
            Valider
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══ 10 à 13 · cartes métier : une scène par module ═══ */
function Scene({ I, titre, children }: { I: LucideIcon; titre: string; children: React.ReactNode }) {
  return (
    <div className="aa-vig flex h-full w-full items-center justify-center bg-[#fafafa] p-3 md:p-5">
      <div className={`${CARTE} flex w-full max-w-[380px] flex-col gap-1.5 p-3`}>
        <div className="flex items-center gap-2 pb-0.5">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.05] ${ENCRE}`}>
            <I className="h-3.5 w-3.5" strokeWidth={1.7} />
          </span>
          <span className={`truncate text-xs font-medium ${ENCRE}`}>{titre}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function VignetteMetier({ nom }: { nom: string }) {
  if (nom === "Daliro")
    return (
      <Scene I={HardHat} titre="Chantier Villa Morel">
        <Ligne g="Devis" d="48 200,00 €" etat="Signé" />
        <Ligne g="Avenant n° 2" d="3 150,00 €" etat="À signer" pleine />
        <Ligne g="Situation n° 3" d="12 050,00 €" etat="Préparée" />
      </Scene>
    );
  if (nom === "Tamila")
    return (
      <Scene I={Scale} titre="Dossier Martin c/ Sté Alpha">
        <Ligne g="Fait 12 · livraison du 4 mars" etat="Pièce 7, p. 3" />
        <Ligne g="Fait 13 · mise en demeure" etat="Pièce 9, p. 1" />
        <Ligne g="Fait 14 · paiement partiel" etat="Pièce 11, p. 2" />
      </Scene>
    );
  if (nom === "Lorani")
    return (
      <Scene I={DraftingCompass} titre="Permis · Maison Leroy">
        <Ligne g="Plans" d="14 feuilles" etat="Lus" />
        <Ligne g="CCTP" d="62 pages" etat="Lu" />
        <Ligne g="DPGF" d="2 écarts avec les plans" etat="À lever" pleine />
      </Scene>
    );
  return (
    <Scene I={Building2} titre="Groupe · 3 sociétés">
      <div className="flex flex-wrap gap-1">
        {["Négoce", "Transport", "Immobilier"].map((s) => (
          <Pastille key={s}>{s}</Pastille>
        ))}
      </div>
      <Ligne g="Clients, fournisseurs, contrats" d="1 284 fiches" />
      <Ligne g="Contrat à renouveler dans 30 jours" etat="Action proposée" pleine />
    </Scene>
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

/* l'étape → sa vignette (cadre 4/3) */
export function VignetteEtape({ n }: { n: string }) {
  if (n === "01") return <VignetteAudit />;
  if (n === "02") return <VignetteInstallation />;
  return <VignetteUnClic />;
}
