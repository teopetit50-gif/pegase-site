/* ══════════════════════════════════════════════════════════════════════
   LES ÉCRANS DESSINÉS DE /gestion (22/11/2026, replacés le 23/11)

   La référence (crystal-ai-v1.21st.app) montre une capture de tableau de
   bord, une capture par onglet, deux animations de carte et trois dessins
   d'accordéon. Ici, aucune capture et aucune image générée : chaque visuel
   est un composant, monté avec les briques de
   components/vignettes/briques.tsx.

   Les deux règles de Teo (22/11) :
     1. UN VISUEL PAR EMPLACEMENT, aucun répété sur la page, et aucun ne
        reprend ceux de l'accueil (components/accueil-v3/vignettes.tsx) ni
        ceux de la page Relances (components/produits/relances/
        Apercus.tsx). Crystal AI a dix emplacements d'image :
          héros ............ le tableau de bord, avec son menu
          onglet ventes .... un devis en cours de rédaction
          onglet achats .... un bon de commande fournisseur
          onglet stock ..... une fiche article et ses mouvements
          onglet banque .... le rapprochement d'un relevé
          carte réglages 1 . l'IA pose ses questions
          carte réglages 2 . le plan comptable et la TVA
          volet agents ..... la nuit des quatre agents, heure par heure
          volet métiers .... les modules actifs et ceux à ajouter
          volet sur mesure . le planning des équipes
        Deux écrans du premier montage (douze emplacements sur NexusCloud)
        restent dans ce fichier sans emplacement : le modèle de facture
        (EcranModele) et la reprise des données (EcranReprise).
     2. UN GRAND CADRE EST REMPLI comme un écran de logiciel : colonnes,
        lignes, chiffres, graphique en barres, boutons.

   Couleurs écrites en clair (#0a0a0a, #fff, noir en transparence), aucun
   JavaScript côté navigateur. Les écrans prennent la police de la page
   (Geist, comme les vignettes de l'accueil).

   LES DONNÉES SONT DES EXEMPLES et se tiennent entre elles, ainsi qu'avec
   l'accueil et la page Relances : un négoce de matériel électrique, deux
   dépôts, les clients Atelier Bertin, Menuiserie Roux et Garage Lemaire,
   le fournisseur Sté Électra. Le devis D-0314 fait 1 384,32 € partout, la
   commande BC-0119 2 496,00 € partout, elle arrive le jeudi 26 novembre
   dans la fiche article comme dans le planning ; le disjoncteur 16 A est
   à 12 en stock, comme sur l'accueil ; l'encours de 39 293,12 € et ses
   14 factures sont ceux de la page Relances.

   Chaque écran porte role="img" et une phrase (ECRANS, dans textes.ts) :
   un lecteur d'écran lit la phrase, pas quarante cellules d'exemple.
   ══════════════════════════════════════════════════════════════════════ */
import {
  ArrowUp,
  Bot,
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
  LayoutDashboard,
  Link2,
  MessageSquare,
  Package,
  Plus,
  ReceiptText,
  Scale,
  Search,
  Send,
  Settings2,
  ShoppingCart,
  Smile,
  Sparkles,
  Truck,
  UserRoundCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bulle,
  CARTE,
  Chiffre,
  ENCRE,
  FILET,
  Fait,
  Jauge,
  Ligne,
  Pastille,
  SOURD,
} from "@/components/vignettes/briques";
import { SECTEURS } from "@/lib/secteurs";
import { ECRANS } from "./textes";

/* ── les pièces communes ── */

function Points() {
  return (
    <span className="flex shrink-0 gap-1" aria-hidden="true">
      <span className="h-2 w-2 rounded-full bg-black/25" />
      <span className="h-2 w-2 rounded-full bg-black/15" />
      <span className="h-2 w-2 rounded-full bg-black/10" />
    </span>
  );
}

/* la fenêtre des onglets : une barre de titre, un corps blanc */
function Fenetre({ titre, alt, children }: { titre: string; alt: string; children: React.ReactNode }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="ge-ecran w-full overflow-hidden rounded-lg border border-black/10 bg-[#fff] text-left shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
    >
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f5f5f5] px-3 py-2">
        <Points />
        <span className={`truncate text-[11px] ${SOURD}`}>{titre}</span>
      </div>
      <div className="flex flex-col gap-2 p-3">{children}</div>
    </div>
  );
}

/* l'en-tête d'un écran : un titre, une ligne dessous, un état à droite */
function Tete({ titre, sous, droite }: { titre: string; sous: string; droite?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 flex-col">
        <span className={`truncate text-xs font-medium ${ENCRE}`}>{titre}</span>
        <span className={`truncate text-[11px] ${SOURD}`}>{sous}</span>
      </span>
      {droite}
    </div>
  );
}

function Bouton({ children, plein = false }: { children: React.ReactNode; plein?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium ${
        plein ? "bg-[#0a0a0a] text-[#fff]" : `border border-black/10 ${ENCRE}`
      }`}
    >
      {children}
    </span>
  );
}

const ENTETE = `px-2 py-1.5 text-[10px] font-medium ${SOURD}`;
const RANGEE = "items-center px-2 py-1.5 text-[11px] leading-tight";
const NOMBRE = "whitespace-nowrap text-right tabular-nums";

/* ══════════ le grand cadre : le tableau de bord ══════════ */

const RAIL_GESTION: [LucideIcon, string][] = [
  [LayoutDashboard, "Tableau de bord"],
  [ReceiptText, "Ventes"],
  [ShoppingCart, "Achats"],
  [Package, "Stock"],
  [Landmark, "Banque"],
  [Calculator, "Comptabilité"],
  [FolderOpen, "Documents"],
];
const RAIL_AGENTS: [LucideIcon, string, string][] = [
  [Send, "Relances", "6"],
  [MessageSquare, "Demandes clients", "3"],
  [FileText, "Factures fournisseurs", "12"],
  [UserRoundCheck, "Clients inactifs", "8"],
];
/* ventes puis achats, en pourcentage de 150 000 € */
const MOIS: [string, number, number][] = [
  ["Juin", 64, 39],
  ["Juil.", 69, 42],
  ["Août", 47, 27],
  ["Sept.", 75, 46],
  ["Oct.", 81, 49],
  ["Nov.", 86, 51],
];
const A_FAIRE: [string, string, boolean][] = [
  ["3 devis à envoyer", "Ventes", false],
  ["2 commandes à recevoir", "Achats", false],
  ["1 article à commander", "Stock", false],
  ["3 lignes à rapprocher", "Banque", false],
  ["TVA de novembre", "Comptabilité", false],
  ["29 éléments des agents", "À valider", true],
];
const PIECES: [string, string, string, string, string, boolean][] = [
  ["D-0314 · Devis", "Atelier Bertin", "Ventes", "1 384,32 €", "Brouillon", false],
  ["F-2053 · Facture", "Menuiserie Roux", "Ventes", "1 920,00 €", "Envoyée", false],
  ["BC-0119 · Commande", "Sté Électra", "Achats", "2 496,00 €", "Envoyée", false],
  ["BL-0871 · Livraison", "Garage Lemaire", "Stock", "38 articles", "Livrée", false],
  ["8841 · Facture reçue", "Sté Électra", "Achats", "1 032,48 €", "Payée", false],
];
/* des largeurs fixes, jamais `auto` : chaque rangée est sa propre grille,
   et une colonne `auto` ne s'alignerait pas d'une rangée à l'autre */
const COLS_PIECES = "grid grid-cols-[1.3fr_1fr_0.6fr_5.25rem_4.75rem] gap-2";

export function TableauDeBord() {
  return (
    <div role="img" aria-label={ECRANS.tableau} className="ge-ecran flex w-full flex-col bg-[#fafafa] text-left">
      <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f5f5f5] px-3 py-2 md:px-4">
        <Points />
        <span className={`truncate text-[11px] ${SOURD}`}>Omega · Gestion</span>
        <span
          className={`ml-auto hidden w-60 items-center gap-1.5 rounded-md border border-black/[0.07] bg-[#fff] px-2 py-1 text-[11px] md:flex ${SOURD}`}
        >
          <Search className="h-3 w-3 shrink-0" strokeWidth={1.8} />
          <span className="truncate">Rechercher un client, une pièce…</span>
        </span>
      </div>
      <div className="flex min-w-0">
        {/* le menu : les six modules, puis les quatre agents */}
        <div className="hidden w-48 shrink-0 flex-col gap-3 border-r border-black/[0.06] bg-[#fff] p-3 xl:flex">
          <div className="flex flex-col gap-0.5">
            <span className={`px-2 pb-1 text-[10px] font-medium ${SOURD}`}>Gestion</span>
            {RAIL_GESTION.map(([I, nom], k) => (
              <span
                key={nom}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                  k === 0 ? "bg-[#0a0a0a] font-medium text-[#fff]" : ENCRE
                }`}
              >
                <I className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                <span className="truncate">{nom}</span>
              </span>
            ))}
          </div>
          <div className={`flex flex-col gap-0.5 pt-3 ${FILET}`}>
            <span className={`px-2 pb-1 text-[10px] font-medium ${SOURD}`}>Agents</span>
            {RAIL_AGENTS.map(([I, nom, n]) => (
              <span key={nom} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${ENCRE}`}>
                <I className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                <span className="min-w-0 flex-1 truncate">{nom}</span>
                <span className={`shrink-0 text-[10px] tabular-nums ${SOURD}`}>{n}</span>
              </span>
            ))}
          </div>
          <div className={`mt-auto pt-3 ${FILET}`}>
            <span className={`flex items-center gap-2 px-2 py-1.5 text-[11px] ${ENCRE}`}>
              <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
              <span className="truncate">Réglages par l&apos;IA</span>
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 md:gap-3 md:p-4 xl:p-5">
          <Tete
            titre="Tableau de bord"
            sous="Novembre 2026 · 2 dépôts"
            droite={
              <Bouton plein>
                <Plus className="h-3 w-3" strokeWidth={2.2} />
                Nouveau devis
              </Bouton>
            }
          />

          <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
            <Chiffre libelle="Ventes du mois" valeur="128 400 €" sous="42 factures" />
            <Chiffre libelle="À encaisser" valeur="39 293,12 €" sous="14 factures" />
            <Chiffre libelle="À payer" valeur="14 870,40 €" sous="9 factures reçues" />
            <Chiffre libelle="En banque" valeur="54 210,36 €" sous="aujourd'hui" />
          </div>

          <div className="grid gap-2 md:gap-3 lg:grid-cols-3">
            <div className={`${CARTE} flex min-w-0 flex-col gap-2 p-3 lg:col-span-2`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-xs font-medium ${ENCRE}`}>Ventes et achats</span>
                <span className={`flex shrink-0 items-center gap-3 text-[10px] ${SOURD}`}>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-[#0a0a0a]" />
                    Ventes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-black/15" />
                    Achats
                  </span>
                  <span className="hidden md:inline">6 derniers mois</span>
                </span>
              </div>
              {/* 209 px dès xl : l'écran entier fait alors 737 px de haut, comme la capture de la
                  référence dans le même cadre (1 180 × 736 à 1440) */}
              <div className="relative my-2 h-28 md:h-36 xl:h-[13.0625rem]">
                {[150, 100, 50, 0].map((v, k) => (
                  <div key={v} className="absolute inset-x-0 flex h-0 items-center gap-2" style={{ top: `${(k * 100) / 3}%` }}>
                    <span className={`w-9 shrink-0 text-right text-[9px] tabular-nums ${SOURD}`}>{v ? `${v} k€` : "0"}</span>
                    <span className="h-px flex-1 bg-black/[0.06]" />
                  </div>
                ))}
                <div className="absolute inset-y-0 left-11 right-0 flex items-end gap-2 md:gap-4">
                  {MOIS.map(([mois, ventes, achats], k) => (
                    <div key={mois} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
                      <span
                        className={`w-full max-w-6 rounded-t-sm ${k === MOIS.length - 1 ? "bg-[#0a0a0a]" : "bg-black/55"}`}
                        style={{ height: `${ventes}%` }}
                      />
                      <span className="w-full max-w-6 rounded-t-sm bg-black/15" style={{ height: `${achats}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className={`flex gap-2 pl-11 text-[10px] md:gap-4 ${SOURD}`}>
                {MOIS.map(([mois]) => (
                  <span key={mois} className="min-w-0 flex-1 truncate text-center">
                    {mois}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${CARTE} hidden min-w-0 flex-col gap-2 p-3 lg:flex`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-xs font-medium ${ENCRE}`}>À faire aujourd&apos;hui</span>
                <Pastille>6</Pastille>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2">
                {A_FAIRE.map(([quoi, rubrique, pleine]) => (
                  <div key={quoi} className={`pt-2 ${FILET}`}>
                    <Ligne g={quoi} etat={rubrique} pleine={pleine} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="hidden gap-3 lg:grid lg:grid-cols-3">
            <div className={`${CARTE} flex min-w-0 flex-col p-1 lg:col-span-2`}>
              <div className={`${COLS_PIECES} ${ENTETE}`}>
                <span>Dernières pièces</span>
                <span>Tiers</span>
                <span>Module</span>
                <span className="text-right">Montant</span>
                <span className="text-right">État</span>
              </div>
              {PIECES.map(([piece, tiers, rubrique, montant, etat, pleine]) => (
                <div key={piece} className={`${COLS_PIECES} ${RANGEE} ${FILET}`}>
                  <span className={`truncate font-medium ${ENCRE}`}>{piece}</span>
                  <span className={`truncate ${ENCRE}`}>{tiers}</span>
                  <span className={`truncate ${SOURD}`}>{rubrique}</span>
                  <span className={`${NOMBRE} ${ENCRE}`}>{montant}</span>
                  <span className="flex justify-end">
                    <Pastille pleine={pleine}>{etat}</Pastille>
                  </span>
                </div>
              ))}
            </div>

            <div className={`${CARTE} flex min-w-0 flex-col gap-2 p-3`}>
              <Tete titre="Une saisie, à jour partout" sous="Devis D-0312 · Garage Lemaire" />
              <ul className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
                <Fait>Devis accepté</Fait>
                <Fait>Bon de livraison créé</Fait>
                <Fait>Stock mis à jour</Fait>
                <Fait>Facture F-2054 prête</Fait>
                <Fait>Écriture passée en comptabilité</Fait>
                <Fait ok={false}>Règlement attendu le 22 décembre</Fait>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════ 01 · ventes : un devis en cours de rédaction ══════════ */

const COLS_DEVIS = "grid grid-cols-[minmax(0,1fr)_1.75rem_2.75rem_3.5rem] gap-2";
const LIGNES_DEVIS: [string, string, string, string][] = [
  ["Câble 2,5 mm², couronne 100 m", "6", "62,00", "372,00"],
  ["Disjoncteur 16 A", "24", "8,90", "213,60"],
  ["Prise 2P+T", "120", "3,45", "414,00"],
  ["Gaine ICTA 20, couronne 100 m", "4", "38,50", "154,00"],
];

function Totaux({ ht, tva, ttc }: { ht: string; tva: string; ttc: string }) {
  return (
    <div className="ml-auto flex w-44 max-w-full flex-col gap-1">
      <Ligne g="Total HT" d={ht} />
      <Ligne g="TVA 20 %" d={tva} />
      <div className={`flex items-center justify-between gap-2 pt-1 text-xs font-medium ${FILET} ${ENCRE}`}>
        <span>Total TTC</span>
        <span className="whitespace-nowrap tabular-nums">{ttc}</span>
      </div>
    </div>
  );
}

export function EcranDevis() {
  return (
    <Fenetre titre="Ventes · Devis D-0314" alt={ECRANS.devis}>
      <Tete
        titre="Devis D-0314 · Atelier Bertin"
        sous="20 novembre 2026 · valable 30 jours"
        droite={<Pastille>Brouillon</Pastille>}
      />
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`${COLS_DEVIS} ${ENTETE}`}>
          <span>Désignation</span>
          <span className="text-right">Qté</span>
          <span className="text-right">PU HT</span>
          <span className="text-right">Total HT</span>
        </div>
        {LIGNES_DEVIS.map(([quoi, qte, pu, total]) => (
          <div key={quoi} className={`${COLS_DEVIS} ${RANGEE} ${FILET}`}>
            <span className={`truncate ${ENCRE}`}>{quoi}</span>
            <span className={`${NOMBRE} ${SOURD}`}>{qte}</span>
            <span className={`${NOMBRE} ${SOURD}`}>{pu}</span>
            <span className={`${NOMBRE} ${ENCRE}`}>{total}</span>
          </div>
        ))}
        {/* la ligne en cours de saisie */}
        <div className={`${COLS_DEVIS} ${RANGEE} ${FILET}`}>
          <span className={`flex min-w-0 items-center ${ENCRE}`}>
            <span className="truncate">Interrupteur va-et-vient</span>
            <span className="ge-curseur ml-px h-3 w-px shrink-0 bg-[#0a0a0a]" />
          </span>
          <span className={`${NOMBRE} ${SOURD}`}>—</span>
          <span className={`${NOMBRE} ${SOURD}`}>—</span>
          <span className={`${NOMBRE} ${SOURD}`}>—</span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5">
        <Package className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
        <span className={`min-w-0 flex-1 text-[11px] leading-snug ${ENCRE}`}>Disjoncteur 16 A : 12 en stock, 24 demandés</span>
        <Pastille pleine>À commander</Pastille>
      </div>
      <Totaux ht="1 153,60 €" tva="230,72 €" ttc="1 384,32 €" />
      <div className="flex items-center justify-end gap-2">
        <Bouton>Enregistrer</Bouton>
        <Bouton plein>Envoyer au client</Bouton>
      </div>
    </Fenetre>
  );
}

/* ══════════ 01 · achats : un bon de commande fournisseur ══════════ */

const SUIVI: [string, boolean][] = [
  ["Commandée", true],
  ["Confirmée", true],
  ["Reçue", false],
  ["Facturée", false],
];
const LIGNES_COMMANDE: [string, string, string, string][] = [
  ["Disjoncteur 16 A", "200", "6,20", "1 240,00"],
  ["Câble 2,5 mm², couronne 100 m", "10", "48,00", "480,00"],
  ["Prise 2P+T", "150", "2,40", "360,00"],
];

export function EcranCommande() {
  return (
    <Fenetre titre="Achats · Commande BC-0119" alt={ECRANS.commande}>
      <Tete titre="Bon de commande BC-0119" sous="Sté Électra · pour le dépôt nord" droite={<Pastille>Envoyée</Pastille>} />
      <ol className={`${CARTE} flex items-start px-1 py-2.5`}>
        {SUIVI.map(([etape, fait], k) => (
          <li key={etape} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="flex w-full items-center">
              <span className={`h-px flex-1 ${k === 0 ? "" : fait ? "bg-[#0a0a0a]" : "bg-black/15"}`} />
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  fait ? "bg-[#0a0a0a] text-[#fff]" : "border border-black/20 bg-[#fff]"
                }`}
              >
                {fait ? <Check className="h-2.5 w-2.5" strokeWidth={3.2} /> : null}
              </span>
              <span
                className={`h-px flex-1 ${k === SUIVI.length - 1 ? "" : SUIVI[k + 1][1] ? "bg-[#0a0a0a]" : "bg-black/15"}`}
              />
            </span>
            <span className={`max-w-full truncate text-[10px] ${fait ? ENCRE : SOURD}`}>{etape}</span>
          </li>
        ))}
      </ol>
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`${COLS_DEVIS} ${ENTETE}`}>
          <span>Article</span>
          <span className="text-right">Qté</span>
          <span className="text-right">PU HT</span>
          <span className="text-right">Total HT</span>
        </div>
        {LIGNES_COMMANDE.map(([quoi, qte, pu, total]) => (
          <div key={quoi} className={`${COLS_DEVIS} ${RANGEE} ${FILET}`}>
            <span className={`truncate ${ENCRE}`}>{quoi}</span>
            <span className={`${NOMBRE} ${SOURD}`}>{qte}</span>
            <span className={`${NOMBRE} ${SOURD}`}>{pu}</span>
            <span className={`${NOMBRE} ${ENCRE}`}>{total}</span>
          </div>
        ))}
      </div>
      <Totaux ht="2 080,00 €" tva="416,00 €" ttc="2 496,00 €" />
      <div className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5">
        <Truck className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
        <span className={`min-w-0 flex-1 text-[11px] leading-snug ${ENCRE}`}>Livraison attendue jeudi 26 novembre</span>
        <Bouton plein>Réceptionner</Bouton>
      </div>
    </Fenetre>
  );
}

/* ══════════ 01 · stock : une fiche article et ses mouvements ══════════ */

const COLS_MOUVEMENTS = "grid grid-cols-[2.75rem_minmax(0,1fr)_2rem_1.5rem_2.5rem] gap-2";
/* date, mouvement, quantité, stock après, niveau sur 66 */
const MOUVEMENTS: [string, string, string, string, number][] = [
  ["20 nov.", "Vente · F-2053", "− 24", "12", 18],
  ["18 nov.", "Vente · F-2048", "− 30", "36", 55],
  ["13 nov.", "Réception · BC-0116", "+ 60", "66", 100],
  ["9 nov.", "Vente · F-2039", "− 18", "6", 9],
  ["2 nov.", "Inventaire", "—", "24", 36],
];

export function EcranArticle() {
  return (
    <Fenetre titre="Stock · Disjoncteur 16 A" alt={ECRANS.article}>
      <Tete titre="Disjoncteur 16 A" sous="Réf. DJ-16A · 2 dépôts" droite={<Pastille pleine>À commander</Pastille>} />
      <div className="grid grid-cols-3 gap-2">
        <Chiffre libelle="En stock" valeur="12" />
        <Chiffre libelle="Seuil" valeur="40" />
        <Chiffre libelle="Commandé" valeur="200" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Ligne g="Dépôt nord" d="8" />
          <Jauge niveau={20} />
        </div>
        <div className="flex flex-col gap-1">
          <Ligne g="Dépôt sud" d="4" />
          <Jauge niveau={10} />
        </div>
      </div>
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`${COLS_MOUVEMENTS} ${ENTETE}`}>
          <span>Date</span>
          <span>Mouvement</span>
          <span className="text-right">Qté</span>
          <span className="text-right">Stock</span>
          <span />
        </div>
        {MOUVEMENTS.map(([date, quoi, qte, apres, niveau]) => (
          <div key={date} className={`${COLS_MOUVEMENTS} ${RANGEE} ${FILET}`}>
            <span className={`whitespace-nowrap tabular-nums ${SOURD}`}>{date}</span>
            <span className={`truncate ${ENCRE}`}>{quoi}</span>
            <span className={`${NOMBRE} ${SOURD}`}>{qte}</span>
            <span className={`${NOMBRE} font-medium ${ENCRE}`}>{apres}</span>
            <Jauge niveau={niveau} />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5">
        <Truck className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
        <span className={`min-w-0 flex-1 truncate text-[11px] ${ENCRE}`}>BC-0119 · 200 attendus jeudi 26 novembre</span>
      </div>
    </Fenetre>
  );
}

/* ══════════ 01 · banque : le rapprochement d'un relevé ══════════ */

const RELEVE: [string, string, string, string, boolean][] = [
  ["VIR ATELIER BERTIN", "+ 1 240,00", "F-2048", "Rapprochée", false],
  ["VIR MENUISERIE ROUX", "+ 3 860,40", "F-2049", "Rapprochée", false],
  ["PRLV STE ELECTRA", "− 1 032,48", "Facture 8841", "Rapprochée", false],
  ["VIR GARAGE LEMAIRE", "+ 684,00", "F-2044", "Proposée", true],
  ["CB CARBURANT", "− 86,40", "Note de frais", "Proposée", true],
  ["PRLV LOYER DEPOT", "− 2 300,00", "Aucune pièce", "À justifier", false],
];

export function EcranRapprochement() {
  return (
    <Fenetre titre="Banque · Rapprochement" alt={ECRANS.rapprochement}>
      <Tete titre="Relevé de novembre" sous="Compte courant · 54 210,36 €" droite={<Pastille>9 lignes sur 12</Pastille>} />
      <Jauge niveau={75} />
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_4.25rem] gap-2 ${ENTETE}`}>
          <span>Ligne du relevé</span>
          <span>Pièce trouvée</span>
          <span className="text-right">État</span>
        </div>
        {RELEVE.map(([ligne, montant, piece, etat, pleine]) => (
          <div key={ligne} className={`grid grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)_4.25rem] gap-2 ${RANGEE} ${FILET}`}>
            <span className="flex min-w-0 flex-col">
              <span className={`truncate text-[10px] ${ENCRE}`}>{ligne}</span>
              <span className={`whitespace-nowrap text-[10px] tabular-nums ${SOURD}`}>{montant} €</span>
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <Link2 className={`hidden h-3 w-3 shrink-0 sm:block ${SOURD}`} strokeWidth={1.8} />
              <span className={`truncate ${piece === "Aucune pièce" ? SOURD : ENCRE}`}>{piece}</span>
            </span>
            <span className="flex justify-end">
              <Pastille pleine={pleine}>{etat}</Pastille>
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-[11px] ${SOURD}`}>3 lignes à traiter</span>
        <Bouton plein>Valider les 2 propositions</Bouton>
      </div>
    </Fenetre>
  );
}

/* ══════════ 02 · conversation : l'IA pose ses questions ══════════ */

export function EcranConversation() {
  return (
    <Fenetre titre="Réglages · Conversation avec l'IA" alt={ECRANS.conversation}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-xs font-medium ${ENCRE}`}>Le réglage de votre logiciel</span>
          <span className={`truncate text-[11px] ${SOURD}`}>Question 4 sur 7</span>
        </span>
        <span className="w-16 shrink-0">
          <Jauge niveau={57} />
        </span>
      </div>
      <div className={`flex flex-col gap-1.5 pt-2 ${FILET}`}>
        <Bulle>Tenez-vous un stock dans vos deux dépôts&nbsp;?</Bulle>
        <Bulle moi>Oui, dans les deux.</Bulle>
        <Bulle>J&apos;active le module Stock, avec un stock par dépôt. Vos devis portent-ils votre logo&nbsp;?</Bulle>
        <Bulle moi>Oui, avec nos conditions de vente.</Bulle>
        <span className="flex items-center gap-1 self-start rounded-lg bg-black/[0.05] px-2.5 py-2" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a0a0a]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a0a0a] [animation-delay:200ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a0a0a] [animation-delay:400ms]" />
        </span>
      </div>
      <div className={`flex flex-wrap items-center gap-1 pt-2 ${FILET}`}>
        <span className={`mr-1 text-[10px] ${SOURD}`}>Déjà réglé</span>
        <Pastille>Module Stock</Pastille>
        <Pastille>2 dépôts</Pastille>
        <Pastille>Modèle de devis</Pastille>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-black/10 py-1 pl-2.5 pr-1">
        <span className={`min-w-0 flex-1 truncate text-[11px] ${SOURD}`}>Écrivez votre réponse…</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0a0a0a] text-[#fff]">
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
      </div>
    </Fenetre>
  );
}

/* ══════════ 02 · réglages : le plan comptable et la TVA ══════════ */

const COLS_COMPTES = "grid grid-cols-[3.25rem_minmax(0,1fr)_3.5rem] gap-2";
const COMPTES: [string, string, string][] = [
  ["401000", "Fournisseurs", "Achats"],
  ["411000", "Clients", "Ventes"],
  ["607000", "Achats de marchandises", "Achats"],
  ["707000", "Ventes de marchandises", "Ventes"],
  ["445660", "TVA déductible", "TVA"],
  ["445710", "TVA collectée", "TVA"],
];

export function EcranComptes() {
  return (
    <Fenetre titre="Réglages · Comptabilité" alt={ECRANS.comptes}>
      <Tete titre="Plan comptable" sous="Préparé par l'IA pour un négoce" droite={<Pastille>42 comptes</Pastille>} />
      <div className={`${CARTE} flex flex-col p-1`}>
        <div className={`${COLS_COMPTES} ${ENTETE}`}>
          <span>Compte</span>
          <span>Intitulé</span>
          <span className="text-right">Sert à</span>
        </div>
        {COMPTES.map(([numero, nom, rubrique]) => (
          <div key={numero} className={`${COLS_COMPTES} ${RANGEE} ${FILET}`}>
            <span className={`tabular-nums ${SOURD}`}>{numero}</span>
            <span className={`truncate ${ENCRE}`}>{nom}</span>
            <span className="flex justify-end">
              <Pastille>{rubrique}</Pastille>
            </span>
          </div>
        ))}
      </div>
      <div className={`${CARTE} grid gap-x-3 gap-y-1 px-2.5 py-2 sm:grid-cols-2`}>
        <Ligne g="Taux de TVA" d="20 % et 10 %" />
        <Ligne g="Déclaration" d="chaque mois" />
      </div>
      <div className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5">
        <Clock className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
        <span className={`min-w-0 flex-1 text-[11px] leading-snug ${ENCRE}`}>À vérifier par votre expert-comptable</span>
        <Bouton plein>Lui envoyer</Bouton>
      </div>
    </Fenetre>
  );
}

/* ══════════ 02 · documents : un modèle de facture à l'en-tête ══════════ */

const TRAIT = "h-1 rounded-full bg-black/10";
const LIGNES_FACTURE: [string, string, string][] = [
  ["Prise 2P+T", "40", "138,00"],
  ["Câble 2,5 mm², couronne 100 m", "2", "124,00"],
  ["Disjoncteur 16 A", "10", "89,00"],
];

export function EcranModele() {
  return (
    <Fenetre titre="Documents · Vos modèles" alt={ECRANS.modele}>
      <div className="flex items-center gap-1">
        <Pastille>Devis</Pastille>
        <Pastille pleine>Facture</Pastille>
        <Pastille>Bon de livraison</Pastille>
        <Pastille>Avoir</Pastille>
        <span className={`ml-auto hidden min-w-0 truncate text-[10px] sm:block ${SOURD}`}>Votre en-tête partout</span>
      </div>
      {/* la feuille */}
      <div className="rounded-md bg-black/[0.04] p-2.5">
        <div className="mx-auto flex w-full max-w-[330px] flex-col gap-2 rounded-sm border border-black/[0.07] bg-[#fff] p-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span
                className={`flex h-8 w-16 items-center justify-center rounded border border-dashed border-black/25 text-[9px] ${SOURD}`}
              >
                Votre logo
              </span>
              <span className={`${TRAIT} w-24`} />
              <span className={`${TRAIT} w-16`} />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className={`text-[10px] font-medium tracking-[0.14em] ${ENCRE}`}>FACTURE</span>
              <span className={`text-[10px] tabular-nums ${SOURD}`}>F-2055</span>
              <span className={`text-[10px] ${SOURD}`}>20 novembre 2026</span>
            </div>
          </div>
          <div className="ml-auto flex w-1/2 flex-col gap-1.5">
            <span className={`truncate text-[10px] font-medium ${ENCRE}`}>Garage Lemaire</span>
            <span className={`${TRAIT} w-full`} />
            <span className={`${TRAIT} w-2/3`} />
          </div>
          <div className="flex flex-col">
            <div className={`grid grid-cols-[minmax(0,1fr)_1.5rem_3rem] gap-2 pb-1 text-[9px] font-medium ${SOURD}`}>
              <span>Désignation</span>
              <span className="text-right">Qté</span>
              <span className="text-right">Total HT</span>
            </div>
            {LIGNES_FACTURE.map(([quoi, qte, total]) => (
              <div key={quoi} className={`grid grid-cols-[minmax(0,1fr)_1.5rem_3rem] gap-2 py-1 text-[10px] ${FILET}`}>
                <span className={`truncate ${ENCRE}`}>{quoi}</span>
                <span className={`${NOMBRE} ${SOURD}`}>{qte}</span>
                <span className={`${NOMBRE} ${ENCRE}`}>{total}</span>
              </div>
            ))}
          </div>
          <div className={`ml-auto flex w-1/2 flex-col gap-0.5 pt-1.5 text-[10px] ${FILET}`}>
            <span className={`flex justify-between gap-2 ${SOURD}`}>
              <span>Total HT</span>
              <span className="tabular-nums">351,00 €</span>
            </span>
            <span className={`flex justify-between gap-2 ${SOURD}`}>
              <span>TVA 20 %</span>
              <span className="tabular-nums">70,20 €</span>
            </span>
            <span className={`flex justify-between gap-2 font-medium ${ENCRE}`}>
              <span>Total TTC</span>
              <span className="tabular-nums">421,20 €</span>
            </span>
          </div>
          <div className={`flex items-center gap-2 pt-2 ${FILET}`}>
            <span className={`shrink-0 text-[9px] ${SOURD}`}>Règlement à 30 jours</span>
            <span className={`${TRAIT} min-w-0 flex-1`} />
          </div>
        </div>
      </div>
    </Fenetre>
  );
}

/* ══════════ 02 · démarrage : la reprise des données ══════════ */

const REPRISE: [LucideIcon, string, string, string, boolean][] = [
  [Users, "Clients", "412 fiches", "Repris", true],
  [Truck, "Fournisseurs", "86 fiches", "Repris", true],
  [Package, "Articles", "1 860 références", "Repris", true],
  [ReceiptText, "Factures en cours", "14 factures · 39 293,12 €", "Reprises", true],
  [Calculator, "Soldes comptables", "au 31 octobre", "À vérifier", false],
];

export function EcranReprise() {
  return (
    <Fenetre titre="Démarrage · Reprise de vos données" alt={ECRANS.reprise}>
      <Tete titre="Depuis votre logiciel actuel" sous="4 reprises terminées sur 5" droite={<Pastille>80 %</Pastille>} />
      <Jauge niveau={80} />
      <div className={`${CARTE} flex flex-col p-1`}>
        {REPRISE.map(([I, quoi, combien, etat, fait], k) => (
          <div key={quoi} className={`flex items-center gap-2 px-2 py-2 ${k ? FILET : ""}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/[0.05] ${ENCRE}`}>
              <I className="h-3.5 w-3.5" strokeWidth={1.7} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`truncate text-[11px] font-medium leading-tight ${ENCRE}`}>{quoi}</span>
              <span className={`truncate text-[10px] leading-tight ${SOURD}`}>{combien}</span>
            </span>
            <span className="hidden w-12 shrink-0 lg:block">
              <Jauge niveau={fait ? 100 : 60} />
            </span>
            <Pastille pleine={!fait}>{etat}</Pastille>
          </div>
        ))}
      </div>
      <div className={`${CARTE} flex items-center gap-2 p-2.5`}>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/15 text-[10px] font-medium ${ENCRE}`}
        >
          EC
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-[11px] font-medium leading-tight ${ENCRE}`}>Votre expert-comptable vérifie</span>
          <span className={`truncate text-[10px] leading-tight ${SOURD}`}>Avant le démarrage</span>
        </span>
        <Clock className={`h-3.5 w-3.5 shrink-0 ${SOURD}`} strokeWidth={1.7} />
      </div>
    </Fenetre>
  );
}

/* ══════════ 03 · agents : la nuit, heure par heure ══════════ */

/* l'agent, ce qu'il a préparé, ses plages de travail en % de la nuit
   (22 h → 6 h, soit 12,5 % par heure) */
const NUIT: [LucideIcon, string, string, [number, number][]][] = [
  [MessageSquare, "Demandes clients", "3 réponses rédigées", [[0, 5], [61, 5]]],
  [Send, "Relances", "6 relances écrites", [[37.5, 12.5]]],
  [FileText, "Factures fournisseurs", "12 factures lues", [[56, 19]]],
  [UserRoundCheck, "Clients inactifs", "8 messages rédigés", [[78, 13]]],
];
const HEURES = ["22 h", "0 h", "2 h", "4 h", "6 h"];

export function EcranNuit() {
  return (
    <Fenetre titre="Agents · Cette nuit" alt={ECRANS.nuit}>
      <Tete titre="Le travail de la nuit" sous="De 22 h à 6 h" droite={<Pastille pleine>29 à valider</Pastille>} />
      <div className={`${CARTE} flex flex-col gap-2.5 p-2.5`}>
        <div className={`flex justify-between text-[9px] tabular-nums ${SOURD}`}>
          {HEURES.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {NUIT.map(([I, agent, produit, plages]) => (
          <div key={agent} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <I className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
              <span className={`min-w-0 flex-1 truncate text-[11px] font-medium leading-tight ${ENCRE}`}>{agent}</span>
              <span className={`shrink-0 whitespace-nowrap text-[10px] ${SOURD}`}>{produit}</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded bg-black/[0.05]">
              {[25, 50, 75].map((x) => (
                <span key={x} className="absolute inset-y-0 w-px bg-black/[0.08]" style={{ left: `${x}%` }} />
              ))}
              {plages.map(([debut, duree]) => (
                <span
                  key={debut}
                  className="absolute inset-y-0 rounded bg-[#0a0a0a]"
                  style={{ left: `${debut}%`, width: `${duree}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`${CARTE} flex items-center gap-2 p-2.5`}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
          <Bot className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          {/* sans `truncate` : à 306 px de large (téléphone) ces deux lignes passent sur deux rangs au lieu
              d'être coupées ; c'est la phrase que l'écran est là pour dire */}
          <span className={`text-[11px] font-medium leading-tight ${ENCRE}`}>Ce matin, rien n&apos;est parti</span>
          <span className={`text-[10px] leading-tight ${SOURD}`}>Tout attend votre validation</span>
        </span>
        <Bouton plein>Voir et valider</Bouton>
      </div>
    </Fenetre>
  );
}

/* ══════════ 03 · métiers : les modules actifs, ceux à ajouter ══════════ */

const SIX = ["Ventes", "Achats", "Stock", "Banque", "Comptabilité", "Documents"];
const ICONES_METIERS: Record<string, LucideIcon> = {
  btp: HardHat,
  avocats: Scale,
  architectes: DraftingCompass,
  "location-automobile": CarFront,
  dentaire: Smile,
  hotellerie: Hotel,
  groupes: Building2,
};

export function EcranModules() {
  return (
    <Fenetre titre="Réglages · Vos modules" alt={ECRANS.modules}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-medium ${ENCRE}`}>Gestion</span>
        <Pastille>6 actifs</Pastille>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {SIX.map((nom) => (
          <span key={nom} className="flex min-w-0 items-center gap-1.5 rounded-md border border-black/[0.07] px-2 py-1.5">
            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-[#fff]">
              <Check className="h-2 w-2" strokeWidth={3.5} />
            </span>
            <span className={`truncate text-[11px] ${ENCRE}`}>{nom}</span>
          </span>
        ))}
      </div>
      <div className={`flex items-center justify-between gap-2 pt-2 ${FILET}`}>
        <span className={`text-xs font-medium ${ENCRE}`}>Modules métier</span>
        <span className={`text-[11px] ${SOURD}`}>7 à ajouter</span>
      </div>
      <div className={`${CARTE} flex flex-col p-1`}>
        {SECTEURS.map((s, k) => {
          const I = ICONES_METIERS[s.slug] ?? Building2;
          return (
            <div key={s.slug} className={`flex items-center gap-2 px-2 py-1 ${k ? FILET : ""}`}>
              <I className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
              <span className={`shrink-0 whitespace-nowrap text-[11px] font-medium ${ENCRE}`}>{s.metier}</span>
              <span className={`min-w-0 flex-1 truncate text-[10px] ${SOURD}`}>{s.ligne}</span>
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-black/15 ${ENCRE}`}>
                <Plus className="h-2.5 w-2.5" strokeWidth={2.4} />
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-dashed border-black/20 px-2 py-1.5">
        <Plus className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.8} />
        <span className={`shrink-0 text-[11px] font-medium ${ENCRE}`}>Votre métier</span>
        <span className={`min-w-0 flex-1 truncate text-[10px] ${SOURD}`}>Construit sur mesure</span>
      </div>
    </Fenetre>
  );
}

/* ══════════ 03 · sur mesure : le planning des équipes ══════════ */

const JOURS = ["Lun. 23", "Mar. 24", "Mer. 25", "Jeu. 26", "Ven. 27"];
/* « p » : le poste habituel ; « t » : une tâche de la semaine ; « a » : une absence */
const EQUIPE: [string, string, [string, "p" | "t" | "a"][]][] = [
  ["Julie M.", "Dépôt nord", [["Dépôt", "p"], ["Dépôt", "p"], ["Inventaire", "t"], ["Réception", "t"], ["Dépôt", "p"]]],
  ["Karim B.", "Livraisons", [["Tournée", "p"], ["Tournée", "p"], ["Tournée", "p"], ["Réception", "t"], ["Tournée", "p"]]],
  ["Sonia L.", "Comptoir", [["Comptoir", "p"], ["Comptoir", "p"], ["Congé", "a"], ["Comptoir", "p"], ["Comptoir", "p"]]],
  ["Marc D.", "Dépôt sud", [["Dépôt", "p"], ["Inventaire", "t"], ["Dépôt", "p"], ["Dépôt", "p"], ["Congé", "a"]]],
];
/* quatre jours sur téléphone, cinq dès sm : à cinq, une case de 36 px coupait « Tournée » */
const COLS_PLANNING = "grid grid-cols-[3.5rem_repeat(4,minmax(0,1fr))] gap-1 sm:grid-cols-[4.25rem_repeat(5,minmax(0,1fr))]";
const TON = {
  p: `bg-black/[0.06] ${ENCRE}`,
  t: "bg-[#0a0a0a] text-[#fff]",
  a: `border border-dashed border-black/25 ${SOURD}`,
};

export function EcranPlanning() {
  return (
    <Fenetre titre="Sur mesure · Planning des équipes" alt={ECRANS.planning}>
      <Tete titre="Planning des équipes" sous="Semaine du 23 novembre" droite={<Pastille>Sur mesure</Pastille>} />
      <div className={`${CARTE} flex flex-col gap-1 p-2`}>
        <div className={`${COLS_PLANNING} text-[9px] font-medium ${SOURD}`}>
          <span />
          {JOURS.map((j, k) => (
            <span key={j} className={`truncate text-center ${k === 4 ? "hidden sm:block" : ""}`}>
              {j}
            </span>
          ))}
        </div>
        {EQUIPE.map(([qui, ou, semaine]) => (
          <div key={qui} className={`${COLS_PLANNING} items-center pt-1 ${FILET}`}>
            <span className="flex min-w-0 flex-col">
              <span className={`truncate text-[11px] font-medium leading-tight ${ENCRE}`}>{qui}</span>
              <span className={`truncate text-[9px] leading-tight ${SOURD}`}>{ou}</span>
            </span>
            {semaine.map(([poste, ton], k) => (
              <span
                key={k}
                className={`truncate rounded px-0.5 py-1.5 text-center text-[9px] font-medium ${TON[ton]} ${k === 4 ? "hidden sm:block" : ""}`}
              >
                {poste}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] ${SOURD}`}>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-black/15" />
          Poste habituel
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[#0a0a0a]" />
          Tâche de la semaine
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm border border-dashed border-black/40" />
          Absence
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5">
        <Settings2 className={`h-3.5 w-3.5 shrink-0 ${ENCRE}`} strokeWidth={1.7} />
        <span className={`min-w-0 flex-1 text-[11px] leading-snug ${ENCRE}`}>Jeudi : 2 personnes pour recevoir BC-0119</span>
        <Bouton plein>Publier</Bouton>
      </div>
    </Fenetre>
  );
}

/* l'onglet → son écran */
export function EcranOnglet({ id }: { id: string }) {
  if (id === "ventes") return <EcranDevis />;
  if (id === "achats") return <EcranCommande />;
  if (id === "stock") return <EcranArticle />;
  if (id === "banque") return <EcranRapprochement />;
  if (id === "conversation") return <EcranConversation />;
  if (id === "comptes") return <EcranComptes />;
  if (id === "documents") return <EcranModele />;
  if (id === "demarrage") return <EcranReprise />;
  if (id === "quatre-agents") return <EcranNuit />;
  if (id === "metiers") return <EcranModules />;
  return <EcranPlanning />;
}
