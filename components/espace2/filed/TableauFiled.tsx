"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED — la première page, sur la page « Projects » de Linear (28/10/2026)

   Même modèle que CASHD (../cashd/Debiteurs.tsx), demande de Teo : la
   première page de chaque SaaS refaite sur Linear, au 1:1. Un document
   reçu est un projet.

     · le tableau de bord (/espace2/filed) : la page d'un projet, FILED
       étant le projet — ce qui est à payer et ce qui est en retard, ce qui
       attend une action aujourd'hui, le dû par échéance, les plus grosses
       factures, et à droite les cartes Propriétés, Parcours, À payer et
       Activité ;
     · la liste (?vue=documents) : le tableau des projets — un document par
       ligne, sa famille (bloquée, en litige, en attente, traitée) en santé,
       l'urgence de l'échéance en priorité, le montant, l'échéance, les
       points de contrôle, la part payée en anneau ;
     · un document (?objet=document:<id>, et les liens ?objet=facture: ou
       ?objet=fournisseur: des autres écrans) : la page d'un projet, et
       l'onglet « Dossier », l'écran du dossier de toujours (DossierVue),
       où se font les corrections, par les portes FILED.

   Les chiffres passent par les mêmes portes que l'ancien écran
   (components/espace/filed/EcranFiled.tsx) : l'exemple (DOSSIERS_EXEMPLE,
   modifié en mémoire par les corrections et les dépôts), ou la base
   réelle (chargerListe, puis le dossier à l'ouverture) ; le reste à payer
   par filed_etat_paiement, comme « À payer » (./calculs.ts).
   Gabarit : ../lin/lin.css.
   ══════════════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  CheckCheck,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  FolderInput,
  Landmark,
  Link2,
  ListFilter,
  MessageSquare,
  PanelRight,
  Pencil,
  RefreshCw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
  Upload,
  UserCheck,
} from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { Avis } from "@/components/espace/ui";
import { masquerIban, montant } from "@/components/espace/format";
import { COMMANDES_EXEMPLE, DOSSIERS_EXEMPLE, FOURNISSEURS_EXEMPLE, LIGNES_COMMANDE_EXEMPLE, MOTIFS_EXEMPLE } from "@/components/espace/exemples/filed";
import { ENTITES, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE } from "@/components/espace/exemples/socle";
import type { Commande, DossierFiled, Fournisseur, LigneCommande, MotifRefus } from "@/components/espace/types";
import { CHAMPS_PAR_NOTION, FAMILLES, FAMILLES_CONTROLE, NATURES, SOURCES, etatDocument, famille, grouperControles, statutFacture, type Famille } from "@/components/espace/filed/etats";
import type { DemandeDossier, EtatDossier } from "@/components/espace/filed/DossierVue";
import { chargerCommandes, chargerDossier, chargerFournisseurs, chargerListe, deposerDocument, etatPaiement, monClient, type Apercu, type EtatPaiement, type FactureDuFournisseur } from "@/components/espace/filed/portes";
import { lireCible, trouverCible } from "@/components/espace/filed/lien";
/* les habits de l'ancien espace, que portent encore les fenêtres du dossier et la pièce (chargés avant par HabilleSb) */
import "@/components/espace/espace.css";
import "../habillage.css";
import { useToast } from "../Toasts";
import { useAujourdhui, useMonte } from "../horloge";
import { A_PAYER, GROUPES, aPayer, du, etatsExemple, groupeDe, minuit, totaux, type Etats, type Groupe } from "./calculs";
import { CarteDroite, Choix, GraphiqueProgres, IconePriorite, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeEnveloppe, IconeGroupe, IconeImport, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { RACINE } from "../modules";
import "./tableau-filed.css";

/* l'écran du dossier (pièce en regard, lecteur PDF) ne se charge qu'à l'ouverture de l'onglet « Dossier » */
/* le dossier de toujours ne rend plus son écran ici : l'Aperçu lui emprunte ses fenêtres de correction (28/10/2026) */
const DossierVue = dynamic(() => import("@/components/espace/filed/DossierVue"), { ssr: false });
const VisionneusePiece = dynamic(() => import("@/components/espace/filed/VisionneusePiece"), { ssr: false, loading: () => <p className="lin-vide">Ouverture de la pièce…</p> });

type Reel = {
  apercus: Apercu[];
  motifs: MotifRefus[];
  fournisseurs: Fournisseur[];
  commandes: Commande[];
  lignesCommande: LigneCommande[];
  dossiers: Record<string, DossierFiled>;
  moi: string | null;
  etats: Etats;
};
type Tri = "rang" | "echeance" | "montant" | "recu";

/* un document, sous la forme que lisent les trois vues */
type Ligne = {
  a: Apercu;
  id: string;
  sante: Famille;
  /* la facture, sous la forme de « À payer » (calculs.ts) */
  f: FactureDuFournisseur | null;
  nom: string;
  groupe: Groupe | null;
  /* validée ou comptabilisée, pas encore payée : dans « À payer » */
  payable: boolean;
  payee: boolean;
  /* un dû encore à tenir : ni avoir, ni payée, ni refusée, ni écartée */
  enJeu: boolean;
  /* le reste à payer (filed_etat_paiement), sinon le dû */
  reste: number;
  points: number;
};

/* la santé d'un document : sa famille (etats.ts → famille()), dans l'ordre des onglets — ce qui bloque d'abord */
const ORDRE_SANTES: Famille[] = ["bloquee", "litige", "attente", "reste"];
const SANTES: Record<Famille, { libelle: string; teinte: "vert" | "jaune" | "rouge" | "gris" }> = {
  bloquee: { libelle: "Bloquée", teinte: "rouge" },
  litige: { libelle: "En litige", teinte: "jaune" },
  attente: { libelle: "En attente", teinte: "gris" },
  reste: { libelle: "Traitée", teinte: "vert" },
};
const familleDe = (f: Famille) => FAMILLES.find((x) => x.cle === f)!;
const ORDRE_GROUPES: Groupe[] = ["retard", "semaine", "mois", "plus_tard", "sans"];
const groupeLibelle = (g: Groupe) => GROUPES.find((x) => x.cle === g)!.libelle;
const NIVEAUX: Record<Groupe, 0 | 1 | 2 | 3 | 4> = { retard: 4, semaine: 3, mois: 2, plus_tard: 1, sans: 0 };
/* les étapes d'une facture, de la lecture à la comptabilité : les jalons du tableau de bord,
   et les valeurs du filtre « etape » (le statut de la facture) */
const ETAPES: { cle: string; libelle: string; test: (l: Ligne) => boolean }[] = [
  { cle: "lecture", libelle: "En lecture ou à classer", test: (l) => l.a.document.etat === "en_lecture" || l.a.document.etat === "a_classer" },
  { cle: "a_completer", libelle: "À compléter", test: (l) => l.f?.statut === "a_completer" },
  { cle: "bloquee", libelle: "Bloquées", test: (l) => l.f?.statut === "bloquee" },
  { cle: "a_valider", libelle: "À valider", test: (l) => l.f?.statut === "a_valider" },
  { cle: "validee", libelle: "Validées", test: (l) => l.f?.statut === "validee" },
  { cle: "comptabilisee", libelle: "Comptabilisées", test: (l) => l.f?.statut === "comptabilisee" },
  { cle: "refusee", libelle: "Refusées", test: (l) => l.f?.statut === "refusee" },
];
/* les couleurs d'icône de projet de Linear, une par fournisseur */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

const LISTE = `${RACINE}/filed?vue=documents`;
const ficheDe = (id: string) => `${RACINE}/filed?objet=document:${encodeURIComponent(id)}`;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/* une date calendaire (AAAA-MM-JJ) se lit en UTC, un instant à l'heure du visiteur (rendu après le montage, horloge.ts) */
const dateCourte = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: iso.length === 10 ? "UTC" : undefined,
      })
    : "—";
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => Math.max(0, somme(v.slice(0, i + 1))));
const arrondi = (v: number) => Math.round(v * 100) / 100;
/* une phrase finie par un point, sans en doubler un (« 26 nov. ») */
const phrase = (t: string) => (t.endsWith(".") ? t : `${t}.`);
const nomDe = (a: Apercu) => a.fournisseur?.nom ?? a.document.expediteur ?? a.document.nom_fichier;
const copier = (texte: string) => navigator.clipboard?.writeText(texte);

/* ——— les filtres du tableau de bord (règle de Teo, 28/10 : « quand on clique sur
   Comptabilité ça renvoie vers une autre sous-page alors que c'est juste censé
   modifier ce que le dashboard affiche ») ———
   Une option de menu du tableau de bord ne quitte plus la page : elle pose un
   filtre, gardé dans l'adresse (?filtre=etape:comptabilisee&filtre=fournisseur:<id>),
   une valeur par dimension, et tout le tableau de bord se recalcule sur les
   documents retenus (la « portée »). Choisir de nouveau l'option cochée retire
   le filtre ; chaque filtre posé est une pastille ✕ après les onglets. */
type Dimension = "sante" | "etape" | "echeance" | "fournisseur" | "paiement" | "controle";
type Filtre = { dim: Dimension; val: string };
const DIMENSIONS: Dimension[] = ["sante", "etape", "echeance", "fournisseur", "paiement", "controle"];
/* « À payer » : validée ou comptabilisée, pas encore payée ; « points » : un point de contrôle encore ouvert */
const PAIEMENTS = [{ cle: "a_payer", libelle: "À payer" }];
const CONTROLES = [{ cle: "points", libelle: "Avec points de contrôle" }];
const cleFournisseur = (l: Ligne) => l.a.fournisseur?.id ?? l.f?.fournisseur_id ?? null;
const VALABLES: Record<Dimension, (val: string) => boolean> = {
  sante: (v) => ORDRE_SANTES.includes(v as Famille),
  etape: (v) => ETAPES.some((x) => x.cle === v),
  echeance: (v) => ORDRE_GROUPES.includes(v as Groupe),
  fournisseur: (v) => !!v,
  paiement: (v) => PAIEMENTS.some((x) => x.cle === v),
  controle: (v) => CONTROLES.some((x) => x.cle === v),
};
const GARDES: Record<Dimension, (l: Ligne, val: string) => boolean> = {
  sante: (l, v) => l.sante === v,
  etape: (l, v) => !!ETAPES.find((x) => x.cle === v)?.test(l),
  /* un dû encore à tenir dans ce groupe d'échéance (calculs.ts) */
  echeance: (l, v) => l.enJeu && l.groupe === v,
  fournisseur: (l, v) => cleFournisseur(l) === v,
  paiement: (l) => l.payable,
  controle: (l) => l.points > 0 && l.sante !== "reste",
};
function lireFiltres(params: { getAll: (cle: string) => string[] }): Filtre[] {
  const vus = new Map<Dimension, string>();
  for (const brut of params.getAll("filtre")) {
    const i = brut.indexOf(":");
    const dim = brut.slice(0, i) as Dimension;
    const val = brut.slice(i + 1);
    if (i > 0 && DIMENSIONS.includes(dim) && !vus.has(dim) && VALABLES[dim](val)) vus.set(dim, val);
  }
  return DIMENSIONS.filter((d) => vus.has(d)).map((d) => ({ dim: d, val: vus.get(d)! }));
}
/* l'adresse du tableau de bord sous ces filtres, dans l'ordre des dimensions */
const lienFiltres = (fs: Filtre[]) =>
  fs.length
    ? `${RACINE}/filed?${DIMENSIONS.flatMap((d) => fs.filter((f) => f.dim === d))
        .map((f) => `filtre=${f.dim}:${encodeURIComponent(f.val)}`)
        .join("&")}`
    : `${RACINE}/filed`;

/* la facture d'un aperçu, sous la forme de « À payer » (comme vueExemple, EcranFournisseurs) */
const versFacture = (a: Apercu): FactureDuFournisseur | null =>
  a.facture
    ? {
        id: a.facture.id,
        numero: a.facture.numero,
        statut: a.facture.statut,
        nature: a.facture.nature,
        montant_ttc: a.facture.montant_ttc,
        net_a_payer: a.facture.net_a_payer,
        devise: a.facture.devise,
        date_emission: a.facture.date_emission,
        echeance_lue: a.facture.echeance_lue,
        iban: a.facture.iban,
        fournisseur_id: a.facture.fournisseur_id,
        reference: a.document.reference,
      }
    : null;

/* l'état de paiement de chaque facture validée (filed_etat_paiement), comme « À payer » */
async function lireEtats(apercus: Apercu[]): Promise<Etats> {
  const aLire = apercus.map((a) => a.facture).filter((f): f is NonNullable<Apercu["facture"]> => !!f && A_PAYER.has(f.statut) && f.nature !== "avoir");
  const lus = await Promise.all(
    aLire.map((f) =>
      etatPaiement(f.id)
        .then((e) => [f.id, e] as const)
        .catch(() => [f.id, null] as const),
    ),
  );
  return Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1]));
}

/* la santé d'un projet : un disque à 25 % et son signe, 16 px (repris de CASHD) */
function IconeSante({ sante }: { sante: Famille }) {
  const t = SANTES[sante].teinte;
  if (t === "gris")
    return (
      <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.6" />
      </svg>
    );
  return (
    <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.25" />
      {t === "vert" ? <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "jaune" ? <path d="M5 10.8 7.4 8.3l1.6 1.4L11.2 6M9 6h2.2v2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "rouge" ? <path d="M5 5.6 7.4 8l1.6-1.4 2.2 3.6M9 10.2h2.2V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

/* la famille d'un document, en hexagone de projet (pastilles, cartes, menus) ; le cercle de
   santé reste là où Linear met la santé : la ligne d'auteur et la colonne Santé */
const ETAT_PROJET: Record<Famille, EtatProjet> = { bloquee: "annule", litige: "en-cours", attente: "planifie", reste: "fait" };
function IconeStatut({ sante }: { sante: Famille }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}

/* l'anneau d'avancement d'un projet, 16 px : ici la part payée */
function Anneau({ part, sante }: { part: number; sante: Famille }) {
  const c = 2 * Math.PI * 5;
  return (
    <svg className="lin-anneau" data-teinte={SANTES[sante].teinte} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${(part / 100) * c} ${c}`} transform="rotate(-90 8 8)" />
    </svg>
  );
}

/* le losange d'un jalon : contour seul, jaune une fois l'étape atteinte */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

function IconeDocumentRecu({ l, grand }: { l: Ligne; grand?: boolean }) {
  const couleur = couleurDe(l.a.fournisseur?.id ?? l.nom);
  if (grand)
    return (
      <span
        className="lin-tuile"
        style={{
          background: `color-mix(in srgb, ${couleur} 18%, transparent)`,
          color: couleur,
        }}
      >
        <FileText width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
    );
  return <FileText className="lin-icone-projet" width={16} height={16} strokeWidth={1.8} style={{ color: couleur }} aria-hidden="true" />;
}

const urgenceDe = (l: Ligne): 0 | 1 | 2 | 3 | 4 => (l.enJeu && l.groupe ? NIVEAUX[l.groupe] : 0);
const urgenceTitre = (l: Ligne) => (l.enJeu && l.groupe ? groupeLibelle(l.groupe) : l.payee ? "Payée" : "Pas d'échéance à tenir");
const partPayee = (l: Ligne, etats: Etats) => {
  const e = l.f ? etats[l.f.id] : undefined;
  return e && e.du > 0 ? Math.min(100, Math.round((e.regle / e.du) * 100)) : null;
};

/* la carte « Échéances » : la carte « Progress » de Linear. Trois chiffres, le graphique
   par échéance (cumulé de « échu » à « sans date »), puis la répartition. Le dû
   se partage entre les factures validées (le reste à payer) et celles qui
   attendent encore leur validation : une décision prise dans « À valider »
   fait passer le montant de la courbe jaune à la courbe bleue. */
function CarteAPayer({ lignes, titre, fournisseurs }: { lignes: Ligne[]; titre: string; fournisseurs?: boolean }) {
  const [onglet, setOnglet] = useState<"echeances" | "fournisseurs">("echeances");
  const valide = (l: Ligne) => l.payable;
  const enValidation = (l: Ligne) => l.f?.statut === "a_valider";
  const parGroupe = (test: (l: Ligne) => boolean) => ORDRE_GROUPES.map((g) => arrondi(somme(lignes.filter((l) => l.groupe === g && test(l)).map((l) => l.reste))));
  const valides = parGroupe(valide);
  const aValider = parGroupe(enValidation);
  const total = valides.map((v, i) => arrondi(v + aValider[i]));
  const dans = lignes.filter((l) => valide(l) || enValidation(l));
  const repartition =
    onglet === "echeances"
      ? GROUPES.filter((g, i) => g.cle !== "sans" || total[i]).map((g) => ({
          cle: g.cle,
          libelle: g.libelle,
          valeur: montant(total[ORDRE_GROUPES.indexOf(g.cle)]),
        }))
      : [...new Set(dans.map((l) => l.nom))]
          .map((nom) => ({ cle: nom, libelle: nom, n: somme(dans.filter((l) => l.nom === nom).map((l) => l.reste)) }))
          .sort((a, b) => b.n - a.n)
          .map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: montant(arrondi(x.n)) }));
  return (
    <CarteDroite titre={titre}>
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Dû
          </dt>
          <dd>{montant(arrondi(somme(total)))}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />À valider
          </dt>
          <dd>{montant(arrondi(somme(aValider)))}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            Validé
          </dt>
          <dd>{montant(arrondi(somme(valides)))}</dd>
        </div>
      </dl>
      {!dans.length ? (
        <p className="lin-activite-vide" style={{ marginTop: 12 }}>
          Rien à payer ni à valider.
        </p>
      ) : null}
      {dans.length ? (
        <GraphiqueProgres
          libelle={`Dû cumulé par échéance : ${montant(arrondi(somme(total)))}, dont ${montant(arrondi(somme(valides)))} validés et ${montant(arrondi(somme(aValider)))} à valider`}
          etiquettes={["Échu", "7 j", "30 j", "+30 j", "Sans date"]}
          series={[
            { cle: "du", teinte: "gris", valeurs: cumul(total) },
            { cle: "a-valider", teinte: "jaune", valeurs: cumul(aValider) },
            { cle: "valide", teinte: "bleu", valeurs: cumul(valides), aire: true },
          ]}
        />
      ) : null}
      {fournisseurs ? (
        <div className="lin-segment-carte" role="tablist">
          {(
            [
              ["echeances", "Échéances"],
              ["fournisseurs", "Fournisseurs"],
            ] as const
          ).map(([cle, lib]) => (
            <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
              {lib}
            </button>
          ))}
        </div>
      ) : null}
      {dans.length && repartition.length ? (
        <ul className="lin-repartition">
          {repartition.map((l) => (
            <li key={l.cle}>
              <span>{l.libelle}</span>
              <span>{l.valeur}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </CarteDroite>
  );
}

export default function TableauFiled() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const monte = useMonte();
  /* 21/10 — l'horloge du navigateur (horloge.ts) : null au rendu serveur, la page attend le montage */
  const aujourdhui = useAujourdhui();
  const [local, setLocal] = useState<DossierFiled[]>(DOSSIERS_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurDossier, setErreurDossier] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>("rang");
  const [details, setDetails] = useState(false);
  const [ongletDetails, setOngletDetails] = useState<"familles" | "echeances" | "fournisseurs">("familles");
  const [filtre, setFiltre] = useState("");
  /* les gestes du dossier, ouverts depuis l'Aperçu : une demande par clic (n), l'état que le dossier renvoie, la pièce en grand */
  const [demande, setDemande] = useState<{ quoi: DemandeDossier; n: number } | null>(null);
  const [etatDossier, setEtatDossier] = useState<EtatDossier | null>(null);
  const [pieceOuverte, setPieceOuverte] = useState<string | null>(null);
  const [toutLeFil, setToutLeFil] = useState(false);
  const agir = (quoi: DemandeDossier) => setDemande((d) => ({ quoi, n: (d?.n ?? 0) + 1 }));

  /* ——— la base réelle : les mêmes portes que l'ancien écran ——— */
  const lire = useCallback(async (): Promise<Reel> => {
    const [liste, fournisseurs, cmd, compte] = await Promise.all([
      chargerListe(),
      chargerFournisseurs().catch(() => [] as Fournisseur[]),
      chargerCommandes().catch(() => ({ commandes: [] as Commande[], lignes: [] as LigneCommande[] })),
      monClient().catch(() => null),
    ]);
    const etats = await lireEtats(liste.apercus);
    return { ...liste, fournisseurs, commandes: cmd.commandes, lignesCommande: cmd.lignes, dossiers: {}, moi: compte?.user_id ?? null, etats };
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const r = await lire();
        if (actif) setReel(r);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, lire]);

  /* un document reçu, une facture qui change d'état, un contrôle rejoué :
     la liste se relit, et le dossier ouvert avec elle (son cache est vidé) */
  const relire = useCallback(async () => {
    try {
      const liste = await chargerListe();
      const etats = await lireEtats(liste.apercus);
      setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, etats, dossiers: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["filed_documents", "filed_factures", "filed_controles", "filed_historique", "filed_fournisseurs"], source === "reelle", relire);

  /* ——— l'exemple : daté à l'heure du visiteur, rien avant le montage (horloge.ts) ——— */
  const etatsEx = useMemo(
    () =>
      etatsExemple(
        local.map((d) => versFacture(d)).filter((f): f is FactureDuFournisseur => !!f),
        minuit(),
      ),
    [local],
  );
  const apercus: Apercu[] = useMemo(() => {
    if (source === "exemple") return monte ? local.map((d) => ({ document: d.document, facture: d.facture, fournisseur: d.fournisseur })) : [];
    return reel?.apercus ?? [];
  }, [source, local, reel, monte]);
  const etats = useMemo<Etats>(() => (source === "exemple" ? etatsEx : (reel?.etats ?? {})), [source, etatsEx, reel]);
  const pret = aujourdhui !== null && (source === "exemple" ? monte : !!reel);

  const lignes: Ligne[] = useMemo(() => {
    if (aujourdhui === null) return [];
    return apercus.map((a) => {
      const f = versFacture(a);
      const payee = !!f && etats[f.id]?.etat === "payee";
      return {
        a,
        id: a.document.id,
        sante: famille(a.document, a.facture),
        f,
        nom: nomDe(a),
        groupe: f ? groupeDe(f, aujourdhui) : null,
        payable: !!f && A_PAYER.has(f.statut) && !payee,
        payee,
        enJeu: !!f && f.nature !== "avoir" && !payee && f.statut !== "refusee" && f.statut !== "ecartee",
        reste: f ? aPayer(f, etats) : 0,
        points: (a.facture?.nb_bloquants ?? 0) + (a.facture?.nb_attention ?? 0),
      };
    });
  }, [apercus, etats, aujourdhui]);

  /* le document ouvert : ?objet=document:<id> (ou facture:, fournisseur:, comme les liens des autres écrans) */
  const cible = useMemo(() => lireCible(params.toString()), [params]);
  const apercuOuvert = useMemo(() => (cible ? trouverCible(apercus, cible) : null), [cible, apercus]);
  const vue = params.get("vue");
  const onglet = (params.get("sante") as Famille | null) ?? "tous";
  const echeanceFiltre = params.get("echeance") as Groupe | null;
  const etapeFiltre = params.get("etape");
  /* les filtres du tableau de bord (?filtre=dimension:valeur) */
  const filtresActifs = lireFiltres(params);

  /* le dossier complet du document ouvert : en mémoire sur l'exemple, lu à l'ouverture sur la base réelle */
  const dossier: DossierFiled | null = !apercuOuvert ? null : source === "exemple" ? (local.find((x) => x.document.id === apercuOuvert.document.id) ?? null) : (reel?.dossiers[apercuOuvert.document.id] ?? null);
  useEffect(() => {
    if (source !== "reelle" || !reel || !apercuOuvert || reel.dossiers[apercuOuvert.document.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreurDossier(null);
      try {
        const d = await chargerDossier(apercuOuvert);
        if (actif) setReel((prev) => (prev ? { ...prev, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
      } catch (e) {
        if (actif) setErreurDossier(e instanceof Error ? e.message : "Le dossier n'a pas pu être lu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, reel, apercuOuvert]);

  /* en mode exemple, une correction remplace le dossier en mémoire ; en base réelle, on relit la liste et le dossier après la porte */
  const remplacerLocal = useCallback((d: DossierFiled) => setLocal((prev) => prev.map((x) => (x.document.id === d.document.id ? d : x))), []);
  const relireReel = useCallback(async (a: Apercu) => {
    const liste = await chargerListe();
    const frais = liste.apercus.find((x) => x.document.id === a.document.id) ?? a;
    const [d, etatsFrais] = await Promise.all([chargerDossier(frais), lireEtats(liste.apercus)]);
    setReel((prev) => (prev ? { ...prev, apercus: liste.apercus, motifs: liste.motifs, etats: etatsFrais, dossiers: { ...prev.dossiers, [d.document.id]: d } } : prev));
  }, []);

  /* Échap referme un document ouvert (pas quand une fenêtre ou un menu l'a déjà pris) */
  useEffect(() => {
    if (!cible) return;
    const touche = (e: KeyboardEvent) => {
      const c = e.target as HTMLElement | null;
      if (e.key !== "Escape" || e.defaultPrevented || (c && /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName)) || document.querySelector(".dlg-panneau")) return;
      routeur.push(LISTE, { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cible, routeur]);

  /* ——— déposer un document (le même dépôt que l'ancien écran : filed_deposer_piece) ——— */
  const [depot, setDepot] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [entiteDepot, setEntiteDepot] = useState<string>("");
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const [entitesReelles, setEntitesReelles] = useState<{ id: string; nom: string }[]>([]);
  const ouvrirDepot = async () => {
    setErreurDepot(null);
    setFichier(null);
    setEntiteDepot(source === "exemple" ? SIEGE : "");
    setDepot(true);
    if (source === "reelle" && !entitesReelles.length) {
      const c = await monClient().catch(() => null);
      if (c) {
        setEntitesReelles(c.entites);
        setEntiteDepot(c.entites[0]?.id ?? "");
      }
    }
  };
  const soumettreDepot = async () => {
    if (!fichier) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      let message = `${fichier.name} est déposé : il reçoit son numéro et part en lecture.`;
      let ouvert: string;
      if (source === "reelle") {
        const c = await monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const depose = await deposerDocument({ client_id: c.client_id, entite_id: entiteDepot || null, fichier, expediteur: c.email });
        if (depose.doublon_de) message = `${fichier.name} était déjà reçu : il est marqué doublon${depose.reference ? ` (${depose.reference})` : ""}.`;
        else if (depose.reference) message = `${fichier.name} est déposé sous le numéro ${depose.reference} et part en lecture.`;
        setReel(await lire());
        ouvert = depose.document_id;
      } else {
        await new Promise((r) => setTimeout(r, 400));
        const id = crypto.randomUUID();
        const quand = new Date().toISOString();
        const numero = Math.max(0, ...local.map((d) => Number(d.document.reference.slice(-6)) || 0)) + 1;
        setLocal((prev) => [
          {
            document: {
              id,
              client_id: EXEMPLE_CLIENT_ID,
              entite_id: entiteDepot || null,
              reference: `R${new Date().getFullYear()}-${String(numero).padStart(6, "0")}`,
              piece_id: `${id}-p`,
              source: "depot",
              expediteur: null,
              nom_fichier: fichier.name,
              recu_le: quand,
              etat: "en_lecture",
              nature: null,
              nature_source: null,
              doublon_de: null,
              motif: null,
              lu_le: null,
              traite_le: null,
            },
            facture: null,
            lignes: [],
            tva: [],
            controles: [],
            levees: [],
            fournisseur: null,
            ibans: [],
            appariements: [],
            rapprochement: null,
            piece: {
              id: `${id}-p`,
              nom_fichier: fichier.name,
              mime: fichier.type || "application/octet-stream",
              chemin: `${EXEMPLE_CLIENT_ID}/filed_document/${id}/${fichier.name}`,
              nb_pages: null,
              statut: "recue",
              type_piece: null,
              methode: null,
            },
            pages: [],
            valeurs: [],
            historique: [
              { id: `depot-${quand}`, etape: "reception", message: "Déposé depuis l'espace par vous.", detail: {}, acteur_type: "utilisateur", acteur_libelle: "Vous", survenu_le: quand },
              { id: `lecture-${quand}`, etape: "lecture", message: "Lecture en cours…", detail: {}, acteur_type: "systeme", acteur_libelle: null, survenu_le: quand },
            ],
          },
          ...prev,
        ]);
        ouvert = id;
      }
      setDepot(false);
      toast(`C'est fait. ${message}`, "vert");
      routeur.push(ficheDe(ouvert), { scroll: false });
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a échoué.");
    } finally {
      setEnvoiDepot(false);
    }
  };
  const entitesDepot = source === "exemple" ? ENTITES : entitesReelles;
  const fenetreDepot = (
    <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <Upload width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>Déposer un document</DialogTitle>
          <DialogDescription>Le fichier reçoit un numéro, est lu par le lecteur, puis contrôlé comme tout document reçu.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div>
              <span className="rv-libelle">
                Fichier <span className="esp-obligatoire">(obligatoire)</span>
              </span>
              <div className="esp-fichier">
                <input id="filed-depot-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.xml,.csv,.xlsx" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                <label htmlFor="filed-depot-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>
                  {fichier ? "Changer de fichier" : "Choisir un fichier"}
                </label>
                <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF, image, Factur-X (XML), CSV ou tableur."}</span>
              </div>
            </div>
            {entitesDepot.length > 1 ? (
              <label className="rv-libelle">
                Entité
                <select className="rv-champ" value={entiteDepot} onChange={(e) => setEntiteDepot(e.target.value)}>
                  {entitesDepot.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.nom}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {erreurDepot ? (
              <Avis teinte="rouge" role="alert">
                {erreurDepot}
              </Avis>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!fichier || envoiDepot} onClick={soumettreDepot}>
            {envoiDepot ? <Loader variant="spin" /> : null} Déposer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const boutonDepot = (
    <button type="button" className="v2-btn v2-btn--petit" onClick={ouvrirDepot}>
      <Upload width={14} height={14} aria-hidden="true" />
      <span>Déposer un document</span>
    </button>
  );

  const vide = (texte: string, retour?: boolean) => (
    <div className="lin">
      <h1 className="v2-sr">Documents reçus</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Documents reçus</span>
      </header>
      <div className="lin-vide filed-vide">
        <p style={{ margin: 0 }}>{texte}</p>
        {retour ? (
          <Link href={LISTE} className="filed-lien-retour">
            Voir tous les documents
          </Link>
        ) : null}
      </div>
    </div>
  );
  if (source === "reelle" && erreur && !reel) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  if (!pret) return vide("Lecture des documents…");

  const motifs = source === "exemple" ? MOTIFS_EXEMPLE : (reel?.motifs ?? []);
  const fournisseursListe = source === "exemple" ? FOURNISSEURS_EXEMPLE : (reel?.fournisseurs ?? []);
  const commandes = source === "exemple" ? COMMANDES_EXEMPLE : (reel?.commandes ?? []);
  const lignesCommande = source === "exemple" ? LIGNES_COMMANDE_EXEMPLE : (reel?.lignesCommande ?? []);
  const rang: Record<Famille, number> = { bloquee: 0, litige: 1, attente: 2, reste: 3 };
  const valeurTri = (x: Ligne, y: Ligne) =>
    tri === "echeance"
      ? (x.f?.echeance_lue ?? "9999").localeCompare(y.f?.echeance_lue ?? "9999")
      : tri === "montant"
        ? (y.f ? du(y.f) : 0) - (x.f ? du(x.f) : 0)
        : tri === "recu"
          ? y.a.document.recu_le.localeCompare(x.a.document.recu_le)
          : rang[x.sante] - rang[y.sante] || y.a.document.recu_le.localeCompare(x.a.document.recu_le);
  const ordonnes = lignes.slice().sort((x, y) => valeurTri(x, y) || x.nom.localeCompare(y.nom, "fr"));
  const aPayerL = lignes.filter((l) => l.payable).sort((x, y) => (x.f?.echeance_lue ?? "9999").localeCompare(y.f?.echeance_lue ?? "9999"));
  const totalGroupe = (g: Groupe) => arrondi(somme(aPayerL.filter((l) => l.groupe === g).map((l) => l.reste)));
  const optionsGroupes = (coche?: Groupe | null): Option[] =>
    GROUPES.map((g) => ({
      cle: g.cle,
      libelle: g.libelle,
      meta: montant(totalGroupe(g.cle)),
      icone: <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />,
      coche: coche === g.cle,
      href: `${LISTE}&echeance=${g.cle}`,
    }));

  /* ——— un document ouvert : la page d'un projet ——— */
  if (cible) {
    const l = apercuOuvert ? lignes.find((x) => x.id === apercuOuvert.document.id) : undefined;
    if (!l) return vide(`Document introuvable : le document que désigne ce lien n'est pas dans cette liste${source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.`, true);
    const s = l.sante;
    const doc = l.a.document;
    const fac = l.a.facture;
    const e = l.f ? etats[l.f.id] : undefined;
    const statut = fac ? statutFacture(fac.statut) : etatDocument(doc.etat);
    const historique = (dossier?.historique ?? [])
      .slice()
      .reverse()
      .sort((x, y) => y.survenu_le.localeCompare(x.survenu_le));
    const dernier = historique[0];
    const controles = dossier ? grouperControles(dossier.controles) : null;
    const memeFournisseur = lignes.filter((x) => (l.a.fournisseur ? x.a.fournisseur?.id === l.a.fournisseur.id || (!!x.f && x.f.fournisseur_id === l.a.fournisseur.id) : x.id === l.id));
    const nature = doc.nature ? NATURES[doc.nature] : "Document";
    const resume = fac
      ? `${phrase(`${nature}${fac.numero ? ` n° ${fac.numero}` : ""}${fac.date_emission ? ` du ${dateCourte(fac.date_emission)}` : ""} : ${montant(fac.montant_ttc, fac.devise)} TTC${fac.echeance_lue ? `, échéance le ${dateCourte(fac.echeance_lue)}` : ""}`)}${l.payee ? " Elle est payée." : l.payable ? ` Il reste ${montant(arrondi(l.reste), fac.devise)} à payer.` : ""}`
      : `${nature} reçu le ${dateCourte(doc.recu_le)} : ${etatDocument(doc.etat).libelle.toLowerCase()}.${doc.motif ? ` ${doc.motif}` : ""}`;
    const pointsTexte = fac
      ? fac.nb_bloquants || fac.nb_attention
        ? [fac.nb_bloquants ? pluriel(fac.nb_bloquants, "bloquant") : null, fac.nb_attention ? `${fac.nb_attention} à vérifier` : null].filter(Boolean).join(" · ")
        : "aucun point"
      : "—";
    /* l'onglet « Dossier » n'existe plus (Teo, 28/10) : la pièce s'ouvre en grand, chaque correction
       ouvre la fenêtre du dossier de toujours, et rien ne quitte FILED */
    const voirPiece = (valeurId?: string) => setPieceOuverte(valeurId ?? "");
    const fou = dossier?.fournisseur ?? null;
    const valeurDe = (notion: string) => {
      for (const nom of CHAMPS_PAR_NOTION[notion] ?? [notion]) {
        const v = dossier?.valeurs.find((x) => x.champ === nom);
        if (v) return v;
      }
      return null;
    };
    const lues: { notion: string; libelle: string; valeur: string | null; champ?: string }[] = [
      { notion: "fournisseur", libelle: "Fournisseur", valeur: l.a.fournisseur?.nom ?? null },
      { notion: "numero", libelle: "N° de facture", valeur: fac?.numero ?? null, champ: "numero" },
      { notion: "date_emission", libelle: "Date d'émission", valeur: fac?.date_emission ? dateCourte(fac.date_emission) : null, champ: "date_emission" },
      { notion: "echeance_lue", libelle: "Échéance", valeur: fac?.echeance_lue ? dateCourte(fac.echeance_lue) : null, champ: "echeance_lue" },
      { notion: "montant_ht", libelle: "Total HT", valeur: fac ? montant(fac.montant_ht, fac.devise) : null, champ: "montant_ht" },
      { notion: "montant_tva", libelle: "TVA", valeur: fac ? montant(fac.montant_tva, fac.devise) : null, champ: "montant_tva" },
      { notion: "montant_ttc", libelle: "Total TTC", valeur: fac ? montant(fac.montant_ttc, fac.devise) : null, champ: "montant_ttc" },
      { notion: "iban", libelle: "IBAN", valeur: null, champ: "iban" },
      { notion: "siren", libelle: "SIREN", valeur: null },
    ];
    const optionsFournisseurGestes: Option[] = [
      ...(fou?.statut === "a_confirmer"
        ? [
            {
              cle: "confirmer-fournisseur",
              libelle: etatDossier?.deposantOrigine ? "Confirmer ce fournisseur (une autre personne)" : "Confirmer ce fournisseur…",
              icone: <UserCheck width={16} height={16} />,
              action: () => agir({ type: "confirmer_fournisseur" }),
            },
          ]
        : []),
      ...(etatDossier?.peutReverifier ? [{ cle: "reverifier", libelle: "Revérifier l'identité au registre", icone: <RefreshCw width={16} height={16} />, action: () => agir({ type: "reverifier" }) }] : []),
      ...(fou ? [{ cle: "attester", libelle: "Attester l'identité…", icone: <ShieldCheck width={16} height={16} />, action: () => agir({ type: "attester" }) }] : []),
      { cle: "identifiants", libelle: "Saisir les vrais identifiants…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "identifiants" }) },
      { cle: "rattacher", libelle: "Rattacher à un fournisseur…", icone: <Link2 width={16} height={16} />, action: () => agir({ type: "rattacher" }) },
      ...(fou ? [{ cle: "iban", libelle: "Proposer un IBAN…", icone: <Landmark width={16} height={16} />, action: () => agir({ type: "iban" }) }] : []),
      ...(fou
        ? [
            {
              cle: "bloquer",
              libelle: fou.statut === "bloque" ? "Débloquer le fournisseur…" : "Bloquer le fournisseur…",
              icone: <Ban width={16} height={16} />,
              action: () => agir({ type: "bloquer", bloquer: fou.statut !== "bloque" }),
            },
          ]
        : []),
    ];
    const optionsGestes: Option[] = dossier
      ? [
          ...(fac
            ? [
                { cle: "corriger", libelle: "Corriger une valeur…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger" }) },
                ...(etatDossier?.nonVerifiees
                  ? [
                      {
                        cle: "confirmer",
                        libelle: `Confirmer ${etatDossier.nonVerifiees > 1 ? `les ${etatDossier.nonVerifiees} valeurs non vérifiées` : "la valeur non vérifiée"}…`,
                        icone: <ShieldCheck width={16} height={16} />,
                        action: () => agir({ type: "confirmer" }),
                      },
                    ]
                  : []),
                etatDossier?.litigeOuvert
                  ? { cle: "clore", libelle: "Clore le litige…", icone: <Scale width={16} height={16} />, action: () => agir({ type: "clore_litige", litige: etatDossier.litigeOuvert ?? "" }) }
                  : { cle: "litige", libelle: "Ouvrir un litige…", icone: <Scale width={16} height={16} />, action: () => agir({ type: "litige" }) },
                ...(commandes.length
                  ? [{ cle: "commande", libelle: fac.commande_id ? "Changer la commande…" : "Désigner une commande…", icone: <ClipboardList width={16} height={16} />, action: () => agir({ type: "commande" }) }]
                  : []),
                ...(fac.commande_id
                  ? dossier.lignes.map((x): Option => ({
                      cle: `apparier-${x.id}`,
                      libelle: `Apparier la ligne ${x.rang}…`,
                      meta: x.designation ?? undefined,
                      icone: <Link2 width={16} height={16} />,
                      action: () => agir({ type: "apparier", ligne: x }),
                    }))
                  : []),
                ...(fac.statut === "validee" ? [{ cle: "compta", libelle: "Transmettre à la comptabilité…", icone: <CheckCheck width={16} height={16} />, action: () => agir({ type: "comptabiliser" }) }] : []),
              ]
            : []),
          ...(doc.etat === "a_classer" || doc.etat === "illisible" ? [{ cle: "classer", libelle: "Classer ce document…", icone: <FolderInput width={16} height={16} />, action: () => agir({ type: "classer" }) }] : []),
          ...optionsFournisseurGestes,
          { cle: "piece", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() },
        ]
      : [{ cle: "piece", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() }];
    /* les menus d'un document ne quittent pas FILED (règle du 28/10) */
    const etapeDuDocument = ETAPES.find((x) => x.test(l)) ?? null;
    const cleF = cleFournisseur(l);
    const optionsSante: Option[] = [
      { cle: "corriger", libelle: "Corriger une valeur…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger" }) },
      { cle: "famille", libelle: `Documents : ${familleDe(s).libelle.toLowerCase()}`, icone: <IconeStatut sante={s} />, href: `${LISTE}&sante=${s}` },
    ];
    const optionsStatut: Option[] = [
      { cle: "piece", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() },
      ...(etapeDuDocument ? [{ cle: "etape", libelle: `Documents : ${etapeDuDocument.libelle.toLowerCase()}`, icone: <Losange atteint />, href: `${LISTE}&etape=${etapeDuDocument.cle}` }] : []),
    ];
    const optionsEcheance: Option[] = [
      ...(l.groupe ? [{ cle: "groupe", libelle: `Factures : ${groupeLibelle(l.groupe).toLowerCase()}`, icone: <IconeCalendrier />, href: `${LISTE}&echeance=${l.groupe}` }] : []),
      { cle: "corriger", libelle: "Corriger l'échéance…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger", champ: "echeance_lue" }) },
    ];
    const optionsFournisseur: Option[] = [
      ...memeFournisseur.map((x): Option => ({
        cle: x.id,
        libelle: x.a.document.reference,
        meta: x.f ? montant(x.f.montant_ttc, x.f.devise) : etatDocument(x.a.document.etat).libelle,
        icone: <IconeDocumentRecu l={x} />,
        coche: x.id === l.id,
        href: ficheDe(x.id),
      })),
      ...(cleF ? [{ cle: "tableau", libelle: "Tableau de bord de ce fournisseur", icone: <IconeGroupe />, href: lienFiltres([{ dim: "fournisseur", val: cleF }]) }] : []),
      ...optionsFournisseurGestes,
    ];
    const jalons: { cle: string; libelle: string; atteint: boolean; meta: string }[] = [
      { cle: "recu", libelle: "Reçu", atteint: true, meta: dateCourte(doc.recu_le) },
      { cle: "lu", libelle: "Lu", atteint: !!doc.lu_le, meta: doc.lu_le ? dateCourte(doc.lu_le) : "pas encore" },
      { cle: "controle", libelle: "Contrôlé", atteint: !!fac?.controle_le, meta: fac?.controle_le ? dateCourte(fac.controle_le) : "pas encore" },
      {
        cle: "valide",
        libelle: "Validé",
        atteint: fac?.statut === "validee" || fac?.statut === "comptabilisee",
        meta: fac?.statut === "validee" || fac?.statut === "comptabilisee" ? "fait" : fac?.statut === "refusee" ? "refusé" : fac?.statut === "ecartee" ? "écarté" : "pas encore",
      },
      { cle: "comptabilise", libelle: "Comptabilisé", atteint: fac?.statut === "comptabilisee", meta: fac?.statut === "comptabilisee" ? "fait" : "pas encore" },
      { cle: "paye", libelle: "Payé", atteint: l.payee, meta: e?.etat === "payee" ? dateCourte(e.dernier_le) : e?.etat === "partielle" ? `en partie · ${montant(e.regle, fac?.devise)}` : "pas encore" },
    ];
    const acteur = (h: DossierFiled["historique"][number]) => h.acteur_libelle ?? (h.acteur_type === "systeme" ? "FILED" : "Une personne");
    return (
      <div className="lin">
        <h1 className="v2-sr">Documents reçus</h1>
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={LISTE} className="lin-fil-equipe">
              Documents
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici lin-fil-projet" aria-current="page">
              <IconeDocumentRecu l={l} />
              {doc.reference}
            </span>
          </nav>
          <div className="lin-tete-droite">
            <MenuActions titre="Agir sur ce document" options={optionsGestes} />
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier la référence" title="Copier la référence" onClick={() => copier(doc.reference)}>
              <Copy width={14} height={14} aria-hidden="true" />
            </button>
            {boutonDepot}
          </div>
        </header>
        <div className="lin-projet">
          <article className="lin-projet-texte">
            <IconeDocumentRecu l={l} grand />
            <h2 className="lin-projet-h1">{l.nom}</h2>
            <p className="lin-projet-resume">{resume}</p>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Propriétés</span>
              <MenuOptions
                raccourci="s"
                titre="Agir sur ce document…"
                teinte={SANTES[s].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={s} />
                    {SANTES[s].libelle}
                  </>
                }
                options={optionsSante}
                largeur={300}
              />
              {fac ? (
                <MenuOptions
                  raccourci="r"
                  titre="À payer par échéance…"
                  declencheur={
                    <>
                      <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                      {urgenceTitre(l)}
                    </>
                  }
                  options={optionsGroupes(l.groupe)}
                />
              ) : null}
              {fac ? (
                <MenuOptions
                  raccourci="e"
                  titre="Échéance…"
                  declencheur={
                    <>
                      <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                      {fac.echeance_lue ? dateCourte(fac.echeance_lue) : "Sans échéance"}
                    </>
                  }
                  options={optionsEcheance}
                />
              ) : null}
              <MenuOptions
                titre="Documents du fournisseur…"
                declencheur={
                  <>
                    <IconeGroupe />
                    {l.a.fournisseur?.nom ?? "Fournisseur inconnu"}
                    {fou?.statut === "a_confirmer" ? <span className="lin-maj-gris">à confirmer</span> : null}
                  </>
                }
                options={optionsFournisseur}
                largeur={320}
              />
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Pièce</span>
              <MenuOptions
                raccourci="d"
                titre="Pièce…"
                declencheur={
                  <>
                    <IconeDocument />
                    {doc.nom_fichier}
                  </>
                }
                options={[
                  { cle: "voir", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() },
                  { cle: "copier", libelle: "Copier le nom du fichier", icone: <Copy width={16} height={16} />, action: () => copier(doc.nom_fichier) },
                ]}
              />
              {doc.expediteur ? (
                <MenuOptions
                  titre="Expéditeur…"
                  declencheur={
                    <>
                      <IconeEnveloppe />
                      {doc.expediteur}
                    </>
                  }
                  options={[
                    { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${doc.expediteur}`) },
                    { cle: "copier", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => copier(doc.expediteur ?? "") },
                  ]}
                />
              ) : null}
            </div>

            <details className="lin-maj" open aria-label="Dernier événement">
              <summary className="lin-maj-tete">
                <span className="lin-maj-titre">
                  Dernier événement
                  <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                  </svg>
                </span>
                <button type="button" className="lin-maj-lien" onClick={() => voirPiece()}>
                  <ExternalLink width={14} height={14} aria-hidden="true" /> Pièce
                </button>
              </summary>
              {dernier ? (
                <>
                  <p className="lin-maj-auteur">
                    <IconeSante sante={s} />
                    <span data-teinte={SANTES[s].teinte}>{SANTES[s].libelle}</span>
                    <span className="lin-avatar-auteur" aria-hidden="true">
                      <FileText width={11} height={11} />
                    </span>
                    <span className="lin-maj-gris">{acteur(dernier)}</span>
                    <span className="lin-maj-gris">{dateCourte(dernier.survenu_le)}</span>
                  </p>
                  <p className="lin-maj-texte">{dernier.message}</p>
                </>
              ) : (
                <p className="lin-maj-texte lin-maj-gris">{dossier ? "Aucun événement noté pour ce document." : erreurDossier ? `Le dossier n'a pas pu être lu : ${erreurDossier}` : "Lecture du dossier…"}</p>
              )}
              <dl className="lin-maj-citation">
                <div>
                  <dt>Statut</dt>
                  <dd>{statut.libelle}</dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd>{fac ? montant(fac.montant_ttc, fac.devise) : "—"}</dd>
                </div>
                <div>
                  <dt>Contrôles</dt>
                  <dd>{pointsTexte}</dd>
                </div>
              </dl>
              <footer className="lin-maj-pied">
                <button type="button" className="lin-maj-pied-btn" aria-label="Voir la pièce" title="Voir la pièce" onClick={() => voirPiece()}>
                  <MessageSquare width={16} height={16} aria-hidden="true" />
                </button>
                <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Décider" title="Décider">
                  <CheckCheck width={16} height={16} aria-hidden="true" />
                </Link>
              </footer>
            </details>

            {fac ? (
              <>
                <h3 className="lin-projet-h2">Valeurs lues</h3>
                <ul className="lin-projet-liste filed-lignes-actions">
                  {lues.map((x) => {
                    const v = valeurDe(x.notion);
                    const brut = x.valeur ?? v?.texte ?? null;
                    /* l'IBAN masqué comme partout ; le SIREN sans son étiquette, que la pièce répète parfois */
                    const texte = brut && x.notion === "iban" ? masquerIban(brut) : brut && x.notion === "siren" ? brut.replace(/^siren\s*:?\s*/i, "") : brut;
                    return (
                      <li key={x.notion}>
                        <span>{x.libelle}</span>
                        <span className={texte ? "lin-meta" : "lin-meta lin-props-vide"}>
                          {v?.verifiee ? <Check className="filed-lue-ok" width={12} height={12} aria-label="vérifiée" /> : null}
                          {texte ?? "non lu"}
                        </span>
                        <MenuActions
                          titre={`${x.libelle}…`}
                          options={[
                            ...(v ? [{ cle: "citer", libelle: "Voir sur la pièce", meta: `p. ${v.page ?? 1}`, icone: <IconeDocument />, action: () => voirPiece(v.id) }] : []),
                            ...(x.champ ? [{ cle: "corriger", libelle: "Corriger cette valeur…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger", champ: x.champ }) }] : []),
                            ...(x.valeur || v?.texte
                              ? [{ cle: "copier", libelle: "Copier", icone: <Copy width={16} height={16} />, action: () => copier((x.valeur ?? v?.texte ?? "").replace(/^siren\s*:?\s*/i, "")) }]
                              : []),
                          ]}
                        />
                      </li>
                    );
                  })}
                  {e
                    ? (
                        [
                          ["Réglé", e.regle],
                          ["Reste à payer", e.reste],
                        ] as [string, number][]
                      ).map(([lib, m]) => (
                        <li key={lib}>
                          <span>{lib}</span>
                          <span className="lin-meta">{montant(m, fac.devise)}</span>
                        </li>
                      ))
                    : null}
                </ul>
              </>
            ) : null}

            <h3 className="lin-projet-h2">Contrôles</h3>
            {!fac ? (
              <p className="lin-maj-texte lin-maj-gris">Pas encore de facture lue sur ce document : les contrôles passent après la lecture.</p>
            ) : !controles ? (
              <p className="lin-maj-texte lin-maj-gris">{erreurDossier ? `Le dossier n'a pas pu être lu : ${erreurDossier}` : "Lecture du dossier…"}</p>
            ) : (
              <ul className="lin-projet-liste filed-lignes-actions">
                {controles.echoues.map((c) => (
                  <li key={c.id}>
                    <Losange atteint={false} />
                    <span>{c.message}</span>
                    <span className="lin-meta">{c.gravite === "bloquant" ? "bloquant" : c.gravite === "attention" ? "à vérifier" : "information"}</span>
                    <MenuActions
                      titre="Ce contrôle…"
                      options={
                        c.code === "fournisseur.a_confirmer"
                          ? optionsFournisseurGestes
                          : [
                              { cle: "lever", libelle: "Lever avec un motif…", icone: <Unlock width={16} height={16} />, action: () => agir({ type: "lever", controle: c }) },
                              ...(c.code === "fournisseur.iban_connu" && fou ? [{ cle: "iban", libelle: "Proposer cet IBAN…", icone: <Landmark width={16} height={16} />, action: () => agir({ type: "iban" }) }] : []),
                            ]
                      }
                    />
                  </li>
                ))}
                {controles.leves.map((c) => (
                  <li key={c.id}>
                    <Losange atteint />
                    <span>{c.message}</span>
                    <span className="lin-meta">levé</span>
                  </li>
                ))}
                <li>
                  <Losange atteint />
                  <span>{controles.passes.length ? `${pluriel(controles.passes.length, "contrôle")} sans anomalie` : "Aucun contrôle passé sans anomalie"}</span>
                  <span className="lin-meta">{[...new Set(controles.passes.map((c) => FAMILLES_CONTROLE[c.famille] ?? c.famille))].slice(0, 3).join(", ")}</span>
                </li>
              </ul>
            )}
          </article>

          <aside className="lin-cartes-droite" aria-label="Propriétés du document">
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Santé</dt>
                  <dd data-teinte={SANTES[s].teinte}>
                    <MenuOptions
                      plat
                      titre="Agir sur ce document…"
                      declencheur={
                        <>
                          <IconeStatut sante={s} />
                          {SANTES[s].libelle}
                        </>
                      }
                      options={optionsSante}
                      largeur={300}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Statut…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {statut.libelle}
                        </>
                      }
                      options={optionsStatut}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Échéance</dt>
                  <dd className={fac?.echeance_lue ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Échéance…"
                      declencheur={
                        <>
                          <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                          {fac?.echeance_lue ? dateCourte(fac.echeance_lue) : "Sans échéance"}
                        </>
                      }
                      options={optionsEcheance}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Urgence</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="À payer par échéance…"
                      declencheur={
                        <>
                          <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                          {urgenceTitre(l)}
                        </>
                      }
                      options={optionsGroupes(l.groupe)}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Référence</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Référence…"
                      declencheur={
                        <>
                          <IconeDiese />
                          {doc.reference}
                        </>
                      }
                      options={[{ cle: "copier", libelle: "Copier la référence", icone: <Copy width={16} height={16} />, action: () => copier(doc.reference) }]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>N° de facture</dt>
                  <dd className={fac?.numero ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Numéro…"
                      declencheur={
                        <>
                          <IconeDiese />
                          {fac?.numero ?? "Non lu"}
                        </>
                      }
                      options={
                        fac?.numero
                          ? [{ cle: "copier", libelle: "Copier le numéro", icone: <Copy width={16} height={16} />, action: () => copier(fac.numero ?? "") }]
                          : [{ cle: "corriger", libelle: "Corriger le numéro…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger", champ: "numero" }) }]
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Fournisseur</dt>
                  <dd className={l.a.fournisseur ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Documents du fournisseur…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {l.a.fournisseur?.nom ?? "Inconnu"}
                          {fou?.statut === "a_confirmer" ? <span className="lin-maj-gris">à confirmer</span> : null}
                        </>
                      }
                      options={optionsFournisseur}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd className={fac ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Montant…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {fac ? montant(fac.montant_ttc, fac.devise) : "Non lu"}
                        </>
                      }
                      options={[{ cle: "corriger", libelle: "Corriger le montant…", icone: <Pencil width={16} height={16} />, action: () => agir({ type: "corriger", champ: "montant_ttc" }) }]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Reçu</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Réception…"
                      declencheur={
                        <>
                          <IconeImport />
                          {dateCourte(doc.recu_le)} · {SOURCES[doc.source] ?? doc.source}
                        </>
                      }
                      options={[
                        { cle: "piece", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() },
                        { cle: "fil", libelle: "Voir toute l'activité", icone: <FileText width={16} height={16} />, action: () => setToutLeFil(true) },
                      ]}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Parcours">
              <ul className="lin-jalons">
                {jalons.map((j) => (
                  <li key={j.cle}>
                    <Losange atteint={j.atteint} />
                    <span className="lin-jalon-nom">{j.libelle}</span>
                    <span className="lin-meta">{j.meta}</span>
                    <MenuActions titre={`${j.libelle}…`} options={[{ cle: "piece", libelle: "Voir la pièce", icone: <IconeDocument />, action: () => voirPiece() }]} />
                  </li>
                ))}
              </ul>
            </CarteDroite>

            <CarteAPayer lignes={memeFournisseur} titre={l.a.fournisseur ? "Dû à ce fournisseur" : "Dû"} />

            <CarteDroite
              titre="Activité"
              action={
                <button type="button" className="lin-carte-lien" onClick={() => setToutLeFil((x) => !x)}>
                  {toutLeFil ? "Réduire" : "Tout voir"}
                </button>
              }
            >
              {historique.length ? (
                <ul className="lin-activite">
                  {historique.slice(0, toutLeFil ? undefined : 3).map((h) => (
                    <li key={h.id}>
                      <Losange atteint={h.acteur_type !== "systeme"} />
                      <span>
                        <b>{acteur(h)}</b> · {h.message} · {dateCourte(h.survenu_le)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">{dossier ? "Aucun événement pour l'instant." : "Lecture du dossier…"}</p>
              )}
            </CarteDroite>
          </aside>
        </div>
        {dossier ? (
          <DossierVue
            key={dossier.document.id}
            dialoguesSeuls
            demande={demande}
            onFait={(m) => toast(`C'est fait. ${m}`, "vert")}
            onEtat={setEtatDossier}
            dossier={dossier}
            source={source}
            motifs={motifs}
            fournisseurs={fournisseursListe}
            commandes={commandes}
            lignesCommande={lignesCommande}
            onLocal={remplacerLocal}
            relire={() => relireReel(l.a)}
            moi={source === "exemple" ? EXEMPLE_MOI : (reel?.moi ?? null)}
          />
        ) : null}
        <Dialog open={pieceOuverte !== null} onOpenChange={(o) => !o && setPieceOuverte(null)}>
          <DialogContent className="filed-piece-fenetre">
            <DialogHeader>
              <DialogTitle>{doc.nom_fichier}</DialogTitle>
              <DialogDescription>Cliquez une valeur lue pour la voir surlignée dans la pièce.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div id="ecran" className="resa esp sb-ecran filed-piece-cadre">
                {dossier ? <VisionneusePiece dossier={dossier} source={source} actif={pieceOuverte || null} onChoisir={(id) => setPieceOuverte(id ?? "")} /> : <p className="lin-vide">Lecture du dossier…</p>}
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
        {fenetreDepot}
      </div>
    );
  }

  /* ——— le tableau de bord : la page d'un projet, FILED étant le projet ———
     Les briques relevées sur la page d'un projet de Linear (titre,
     propriétés, « Latest update », jalons, cartes de droite, carte Progress
     avec ses chiffres et ses répartitions), comme CASHD. */
  if (vue !== "documents") {
    /* la portée : les documents que retiennent les filtres posés (?filtre=) ; tout ce qui suit en est tiré */
    const portee = lignes.filter((l) => filtresActifs.every((f) => GARDES[f.dim](l, f.val)));
    /* la même sans le filtre d'une dimension : les chiffres des options de son menu */
    const porteeSauf = (dim: Dimension) => lignes.filter((l) => filtresActifs.every((f) => f.dim === dim || GARDES[f.dim](l, f.val)));
    const nombre = (dim: Dimension, test: (l: Ligne) => boolean) => porteeSauf(dim).filter(test).length;
    const filtreDe = (dim: Dimension) => filtresActifs.find((f) => f.dim === dim)?.val ?? null;
    const estActif = (dim: Dimension, val: string) => filtreDe(dim) === val;
    /* choisir une valeur pose le filtre (et remplace celui de la même dimension) ; rechoisir l'option cochée le retire */
    const basculer = (dim: Dimension, val: string) => lienFiltres([...filtresActifs.filter((f) => f.dim !== dim), ...(estActif(dim, val) ? [] : [{ dim, val }])]);
    const optionFiltre = (dim: Dimension, val: string, libelle: string, icone: React.ReactNode, meta?: string): Option => ({
      cle: `${dim}:${val}`,
      libelle,
      icone,
      meta,
      coche: estActif(dim, val),
      href: basculer(dim, val),
    });
    const nomFournisseur = (id: string) => lignes.find((l) => cleFournisseur(l) === id && l.a.fournisseur)?.a.fournisseur?.nom ?? fournisseursListe.find((f) => f.id === id)?.nom ?? "Fournisseur";
    /* la pastille d'un filtre posé, après les onglets */
    const puce = (f: Filtre): { icone: React.ReactNode; libelle: string } => {
      if (f.dim === "sante") return { icone: <IconeStatut sante={f.val as Famille} />, libelle: familleDe(f.val as Famille).libelle };
      if (f.dim === "etape") return { icone: <Losange atteint />, libelle: ETAPES.find((x) => x.cle === f.val)!.libelle };
      if (f.dim === "echeance") return { icone: <IconePriorite niveau={NIVEAUX[f.val as Groupe]} titre={groupeLibelle(f.val as Groupe)} />, libelle: `Échéance : ${groupeLibelle(f.val as Groupe).toLowerCase()}` };
      if (f.dim === "fournisseur") return { icone: <IconeGroupe />, libelle: nomFournisseur(f.val) };
      if (f.dim === "paiement") return { icone: <IconeJauge />, libelle: PAIEMENTS.find((x) => x.cle === f.val)!.libelle };
      return { icone: <IconeStatut sante="bloquee" />, libelle: CONTROLES.find((x) => x.cle === f.val)!.libelle };
    };

    /* les options qui filtrent, par dimension */
    const optionsFamillesBord = ORDRE_SANTES.map((x) =>
      optionFiltre(
        "sante",
        x,
        familleDe(x).libelle,
        <IconeStatut sante={x} />,
        pluriel(
          nombre("sante", (l) => l.sante === x),
          "document",
        ),
      ),
    );
    const optionEtape = (cle: string) => {
      const x = ETAPES.find((e) => e.cle === cle)!;
      return optionFiltre("etape", cle, x.libelle, <Losange atteint />, pluriel(nombre("etape", x.test), "document"));
    };
    const payablesSauf = porteeSauf("paiement").filter((l) => l.payable);
    const optionAPayer = optionFiltre(
      "paiement",
      "a_payer",
      "À payer",
      <IconeJauge />,
      payablesSauf.length
        ? totaux(
            payablesSauf.map((l) => l.f!),
            etats,
          )
        : undefined,
    );
    const optionsEcheancesBord = GROUPES.map((g) =>
      optionFiltre(
        "echeance",
        g.cle,
        g.libelle,
        <IconePriorite niveau={NIVEAUX[g.cle]} titre={g.libelle} />,
        montant(
          arrondi(
            somme(
              porteeSauf("echeance")
                .filter((l) => GARDES.echeance(l, g.cle))
                .map((l) => l.reste),
            ),
          ),
        ),
      ),
    );
    const optionControles = optionFiltre(
      "controle",
      "points",
      CONTROLES[0].libelle,
      <IconeStatut sante="bloquee" />,
      pluriel(
        nombre("controle", (l) => GARDES.controle(l, "points")),
        "document",
      ),
    );
    const fournisseurF = filtreDe("fournisseur");
    const optionsFournisseursBord = [
      ...new Set([
        ...(fournisseurF ? [fournisseurF] : []),
        ...porteeSauf("fournisseur")
          .map(cleFournisseur)
          .filter((x): x is string => !!x),
      ]),
    ]
      .map((id) => ({ id, nom: nomFournisseur(id), n: nombre("fournisseur", (l) => cleFournisseur(l) === id) }))
      .sort((x, y) => y.n - x.n || x.nom.localeCompare(y.nom, "fr"))
      .map((x) => optionFiltre("fournisseur", x.id, x.nom, <IconeGroupe />, pluriel(x.n, "document")));

    const aPayerP = portee.filter((l) => l.payable).sort((x, y) => (x.f?.echeance_lue ?? "9999").localeCompare(y.f?.echeance_lue ?? "9999"));
    const totalP = (g: Groupe) => arrondi(somme(aPayerP.filter((l) => l.groupe === g).map((l) => l.reste)));
    const parSante = (x: Famille) => portee.filter((l) => l.sante === x);
    const filtreSante = filtreDe("sante") as Famille | null;
    const sante: Famille = filtreSante ?? ORDRE_SANTES.find((x) => x !== "reste" && parSante(x).length) ?? "reste";
    const aValider = portee.filter((l) => l.f?.statut === "a_valider");
    const enRetard = aPayerP.filter((l) => l.groupe === "retard");
    const plusAncienne =
      enRetard
        .map((l) => l.f?.echeance_lue)
        .filter((x): x is string => !!x)
        .sort()[0] ?? null;
    const dernierRecu =
      portee
        .map((l) => l.a.document.recu_le)
        .sort()
        .reverse()[0] ?? null;
    const aAgir = portee.filter((l) => l.sante !== "reste").length;
    const aFaire = [...parSante("bloquee").map((l) => ({ l, quoi: "Bloquée" })), ...aValider.map((l) => ({ l, quoi: "À valider" })), ...enRetard.map((l) => ({ l, quoi: "À payer, en retard" }))];
    const maxGroupe = Math.max(1, ...ORDRE_GROUPES.map(totalP));
    const plusGrosses = aPayerP.slice().sort((x, y) => y.reste - x.reste);
    const fournisseursVus = new Map<string, Fournisseur>();
    for (const l of portee) if (l.a.fournisseur) fournisseursVus.set(l.a.fournisseur.id, l.a.fournisseur);
    const aConfirmer = [...fournisseursVus.values()].filter((f) => f.statut === "a_confirmer").length;
    const avecPoints = portee.filter((l) => GARDES.controle(l, "points"));
    const refusees = portee.filter((l) => l.f?.statut === "refusee");
    const recents = portee
      .slice()
      .sort((x, y) => y.a.document.recu_le.localeCompare(x.a.document.recu_le))
      .slice(0, 3);
    const resume = aPayerP.length
      ? `${totaux(
          aPayerP.map((l) => l.f!),
          etats,
        )} à payer sur ${pluriel(aPayerP.length, "facture")}${enRetard.length ? `, dont ${montant(totalP("retard"))} en retard` : ""}.`
      : "Aucune facture validée n'attend de paiement.";
    return (
      <div className="lin">
        <h1 className="v2-sr">Documents reçus</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Tableau de bord</span>
          <div className="lin-tete-droite">{boutonDepot}</div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues de FILED">
            <span className="v2-btn v2-btn--petit" data-actif="" aria-current="page">
              Aperçu
            </span>
            <Link href={LISTE} className="v2-btn v2-btn--petit">
              Documents
            </Link>
            <Link href={`${RACINE}/filed?filtre=paiement:a_payer`} className="v2-btn v2-btn--petit" scroll={false}>
              À payer
            </Link>
            <Link href={`${RACINE}/filed?filtre=etape:a_valider`} className="v2-btn v2-btn--petit" scroll={false}>
              À valider
            </Link>
            {filtresActifs.map((f) => {
              const p = puce(f);
              return (
                <Link key={f.dim} href={lienFiltres(filtresActifs.filter((x) => x !== f))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
                  {p.icone}
                  {p.libelle} ✕
                </Link>
              );
            })}
          </nav>
        </div>

        {filtresActifs.length && !portee.length ? (
          <p className="lin-vide">Aucun document ne correspond {filtresActifs.length > 1 ? "à ces filtres" : "à ce filtre"}.</p>
        ) : (
          <div className="lin-projet">
            <article className="lin-projet-texte">
              <span
                className="lin-tuile"
                style={{
                  background: "color-mix(in srgb, #26b5ce 18%, transparent)",
                  color: "#26b5ce",
                }}
              >
                <FileText width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
              </span>
              <h2 className="lin-projet-h1">Documents reçus</h2>
              <p className="lin-projet-resume">
                {resume} {aAgir ? `${pluriel(aAgir, "document")} ${aAgir > 1 ? "demandent" : "demande"} une action.` : "Aucun document n'attend d'action."}
              </p>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Propriétés</span>
                <MenuOptions
                  raccourci="s"
                  titre="Filtrer par famille…"
                  teinte={SANTES[sante].teinte}
                  declencheur={
                    <>
                      <IconeStatut sante={sante} />
                      {sante === "reste" && !filtreSante ? "Tout est traité" : `${pluriel(parSante(sante).length, "document")} : ${familleDe(sante).libelle.toLowerCase()}`}
                    </>
                  }
                  options={optionsFamillesBord}
                  largeur={280}
                />
                <MenuOptions
                  raccourci="v"
                  titre="Factures à valider…"
                  declencheur={
                    <>
                      <Losange atteint={aValider.length > 0} />
                      {aValider.length} à valider
                    </>
                  }
                  options={[
                    ...aValider.map((l): Option => ({
                      cle: l.id,
                      libelle: l.nom,
                      meta: `${l.a.document.reference} · ${montant(l.f?.montant_ttc, l.f?.devise)}`,
                      icone: <IconeDocumentRecu l={l} />,
                      href: ficheDe(l.id),
                    })),
                    { ...optionEtape("a_valider"), libelle: "Seulement les factures à valider" },
                  ]}
                  largeur={360}
                />
                <MenuOptions
                  raccourci="e"
                  titre="Échéances, ou filtrer par échéance…"
                  declencheur={
                    <>
                      <IconeCalendrier passe={!!plusAncienne} />
                      {plusAncienne ? `En retard depuis le ${dateCourte(plusAncienne)}` : "Aucune échéance passée"}
                    </>
                  }
                  options={[
                    ...enRetard.map((l): Option => ({
                      cle: l.id,
                      libelle: l.nom,
                      meta: `${dateCourte(l.f?.echeance_lue)} · ${montant(arrondi(l.reste), l.f?.devise)}`,
                      icone: <IconeDocumentRecu l={l} />,
                      href: ficheDe(l.id),
                    })),
                    ...optionsEcheancesBord,
                  ]}
                  largeur={340}
                />
              </div>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Réception</span>
                <MenuOptions
                  raccourci="d"
                  titre="Déposer, ou filtrer…"
                  declencheur={
                    <>
                      <IconeImport />
                      {dernierRecu ? `Dernier reçu le ${dateCourte(dernierRecu)}` : "Aucun document reçu"}
                    </>
                  }
                  options={[{ cle: "deposer", libelle: "Déposer un document", icone: <Upload width={16} height={16} />, action: () => void ouvrirDepot() }, optionEtape("lecture"), optionEtape("comptabilisee")]}
                />
              </div>

              <details className="lin-maj" open aria-label="À faire aujourd'hui">
                <summary className="lin-maj-tete">
                  <span className="lin-maj-titre">
                    À faire aujourd&apos;hui
                    <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                    </svg>
                  </span>
                  <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                    <ExternalLink width={14} height={14} aria-hidden="true" /> Valider
                  </Link>
                </summary>
                <p className="lin-maj-auteur">
                  <IconeSante sante={aFaire.length ? (parSante("bloquee").length ? "bloquee" : "litige") : "reste"} />
                  <span data-teinte={aFaire.length ? (parSante("bloquee").length ? "rouge" : "jaune") : "vert"}>{aFaire.length ? `${pluriel(aFaire.length, "facture")} à reprendre` : "Rien à reprendre"}</span>
                  <span className="lin-avatar-auteur" aria-hidden="true">
                    <FileText width={11} height={11} />
                  </span>
                  <span className="lin-maj-gris">FILED</span>
                  <span className="lin-maj-gris">aujourd&apos;hui</span>
                </p>
                <p className="lin-maj-texte">Chaque document reçu est lu puis contrôlé : ce qui bloque, ce qui attend votre validation et ce qui est payable en retard est ici.</p>
                {aFaire.length ? (
                  <dl className="lin-maj-citation">
                    {aFaire.slice(0, 5).map(({ l, quoi }) => (
                      <div key={`${quoi}-${l.id}`}>
                        <dt>{l.nom}</dt>
                        <dd>
                          {quoi} · {l.f ? montant(quoi === "À payer, en retard" ? arrondi(l.reste) : l.f.montant_ttc, l.f.devise) : l.a.document.reference}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <footer className="lin-maj-pied">
                  <Link href={`${LISTE}&sante=bloquee`} className="lin-maj-pied-btn" aria-label="Voir les documents bloqués" title="Voir les documents bloqués">
                    <MessageSquare width={16} height={16} aria-hidden="true" />
                  </Link>
                  <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                    <CheckCheck width={16} height={16} aria-hidden="true" />
                  </Link>
                </footer>
              </details>

              <h3 className="lin-projet-h2">À payer par échéance</h3>
              <ul className="lin-projet-liste">
                {GROUPES.filter((g) => g.cle !== "sans" || totalP("sans")).map((g) => (
                  <li key={g.cle}>
                    <span className="lin-tranche-nom">{g.libelle}</span>
                    <span className="lin-tranche-barre" aria-hidden="true">
                      <span style={{ width: `${(Math.max(0, totalP(g.cle)) / maxGroupe) * 100}%` }} />
                    </span>
                    <span className="lin-meta">{montant(totalP(g.cle))}</span>
                  </li>
                ))}
              </ul>

              <h3 className="lin-projet-h2">Plus grosses factures à payer</h3>
              {plusGrosses.length ? (
                <ul className="lin-projet-liste">
                  {plusGrosses.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      <Link href={ficheDe(l.id)} className="lin-projet-lien">
                        <IconeDocumentRecu l={l} />
                        <span>{l.nom}</span>
                        <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                        <span className="lin-meta">{montant(arrondi(l.reste), l.f?.devise)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-maj-texte lin-maj-gris">Aucune facture à payer.</p>
              )}
              <Link href={LISTE} className="lin-voir-tout">
                Voir tous les documents <ArrowRight width={14} height={14} aria-hidden="true" />
              </Link>
            </article>

            <aside className="lin-cartes-droite" aria-label="Les chiffres">
              {/* l'ordre des cartes de Linear : Properties, Milestones, Progress, Activity */}
              <CarteDroite titre="Propriétés">
                <dl className="lin-props">
                  <div>
                    <dt>Documents</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par famille…"
                        declencheur={
                          <>
                            <IconeDocument />
                            {portee.length}
                          </>
                        }
                        options={optionsFamillesBord}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>À payer</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer : à payer ou comptabilisées…"
                        declencheur={
                          <>
                            <IconeJauge />
                            {aPayerP.length}
                          </>
                        }
                        options={[optionAPayer, { ...optionEtape("comptabilisee"), libelle: "Comptabilité" }]}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>À valider</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par décision…"
                        declencheur={
                          <>
                            <CheckCheck width={16} height={16} aria-hidden="true" className="lin-ic" />
                            {aValider.length}
                          </>
                        }
                        options={[{ ...optionEtape("a_valider"), icone: <CheckCheck width={16} height={16} /> }, optionEtape("validee"), optionEtape("refusee")]}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Points de contrôle</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Points de contrôle…"
                        declencheur={
                          <>
                            <IconeStatut sante={avecPoints.length ? "bloquee" : "reste"} />
                            {avecPoints.length}
                          </>
                        }
                        options={[
                          ...avecPoints.map((l): Option => ({
                            cle: l.id,
                            libelle: l.nom,
                            meta: `${l.a.document.reference} · ${pluriel(l.points, "point")}`,
                            icone: <IconeDocumentRecu l={l} />,
                            href: ficheDe(l.id),
                          })),
                          { ...optionControles, libelle: "Seulement les documents avec points" },
                        ]}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Refusées</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer…"
                        declencheur={
                          <>
                            <IconeStatut sante="bloquee" />
                            {refusees.length}
                          </>
                        }
                        options={[optionEtape("refusee")]}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Fournisseurs</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par fournisseur…"
                        declencheur={
                          <>
                            <IconeGroupe />
                            {fournisseursVus.size}
                            {aConfirmer ? ` · ${aConfirmer} à confirmer` : ""}
                          </>
                        }
                        options={optionsFournisseursBord}
                        largeur={300}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Dernier reçu</dt>
                    <dd className={dernierRecu ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Déposer, ou filtrer…"
                        declencheur={
                          <>
                            <IconeImport />
                            {dernierRecu ? dateCourte(dernierRecu) : "Aucun"}
                          </>
                        }
                        options={[{ cle: "deposer", libelle: "Déposer un document", icone: <Upload width={16} height={16} />, action: () => void ouvrirDepot() }, optionEtape("lecture")]}
                      />
                    </dd>
                  </div>
                </dl>
              </CarteDroite>

              <CarteDroite titre="Parcours des factures">
                <ul className="lin-jalons">
                  {ETAPES.map((x) => {
                    const n = portee.filter(x.test).length;
                    return (
                      <li key={x.cle}>
                        <Losange atteint={n > 0} />
                        <span className="lin-jalon-nom">{x.libelle}</span>
                        <span className="lin-meta">{pluriel(n, "document")}</span>
                        <MenuActions
                          titre={`${x.libelle}…`}
                          options={[
                            { ...optionEtape(x.cle), libelle: "Filtrer sur cette étape" },
                            { cle: "documents", libelle: "Voir ces documents dans la liste", icone: <ListFilter width={16} height={16} />, href: `${LISTE}&etape=${x.cle}` },
                          ]}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CarteDroite>

              <CarteAPayer lignes={portee} titre="Échéances" fournisseurs />

              <CarteDroite
                titre="Activité"
                action={
                  <Link href={`${RACINE}/filed/boite`} className="lin-carte-lien">
                    Tout voir
                  </Link>
                }
              >
                {recents.length ? (
                  <ul className="lin-activite">
                    {recents.map((l) => (
                      <li key={l.id}>
                        <Losange atteint={l.sante === "reste"} />
                        <span>
                          <b>{l.nom}</b> · {l.a.document.reference} · {dateCourte(l.a.document.recu_le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-activite-vide">Aucun document reçu pour l&apos;instant.</p>
                )}
              </CarteDroite>
            </aside>
          </div>
        )}
        {fenetreDepot}
      </div>
    );
  }

  /* ——— la liste : le tableau des projets (« Voir tous les documents ») ——— */
  const q = filtre.trim().toLowerCase();
  const etape = ETAPES.find((x) => x.cle === etapeFiltre) ?? null;
  const filtres = ordonnes.filter(
    (l) =>
      (onglet === "tous" || l.sante === onglet) &&
      (!echeanceFiltre || (l.payable && l.groupe === echeanceFiltre)) &&
      (!etape || etape.test(l)) &&
      (!q || `${l.nom} ${l.a.document.reference} ${l.f?.numero ?? ""} ${l.a.document.nom_fichier}`.toLowerCase().includes(q)),
  );
  const presentes = ORDRE_SANTES.filter((x) => lignes.some((l) => l.sante === x));
  const suiteFiltres = `${echeanceFiltre ? `&echeance=${echeanceFiltre}` : ""}${etape ? `&etape=${etape.cle}` : ""}`;
  const ongletLien = (x: Famille | "tous") => `${LISTE}${x === "tous" ? "" : `&sante=${x}`}${suiteFiltres}`;
  const sansFiltre = (retire: "echeance" | "etape") =>
    `${LISTE}${onglet === "tous" ? "" : `&sante=${onglet}`}${retire !== "echeance" && echeanceFiltre ? `&echeance=${echeanceFiltre}` : ""}${retire !== "etape" && etape ? `&etape=${etape.cle}` : ""}`;
  const dansAPayer = lignes.filter((l) => l.payable);
  const lignesDetails =
    ongletDetails === "familles"
      ? FAMILLES.map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: String(lignes.filter((l) => l.sante === x.cle).length) }))
      : ongletDetails === "echeances"
        ? GROUPES.map((g) => ({ cle: g.cle, libelle: g.libelle, valeur: montant(totalGroupe(g.cle)) }))
        : [...new Set(dansAPayer.map((l) => l.nom))]
            .map((nom) => ({ cle: nom, libelle: nom, n: somme(dansAPayer.filter((l) => l.nom === nom).map((l) => l.reste)) }))
            .sort((x, y) => y.n - x.n)
            .map((x) => ({ cle: x.cle, libelle: x.libelle, valeur: montant(arrondi(x.n)) }));

  return (
    <div className="lin">
      <h1 className="v2-sr">Documents reçus</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={`${RACINE}/filed`} className="lin-fil-equipe">
            Tableau de bord
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici" aria-current="page">
            Documents
          </span>
        </nav>
        <div className="lin-tete-droite">{boutonDepot}</div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Santé">
          <Link href={ongletLien("tous")} className="v2-btn v2-btn--petit" data-actif={onglet === "tous" ? "" : undefined} aria-current={onglet === "tous" ? "page" : undefined} scroll={false}>
            Tous les documents
          </Link>
          {presentes.map((x) => (
            <Link key={x} href={ongletLien(x)} className="v2-btn v2-btn--petit" data-actif={onglet === x ? "" : undefined} aria-current={onglet === x ? "page" : undefined} scroll={false}>
              {familleDe(x).libelle}
            </Link>
          ))}
          {echeanceFiltre && GROUPES.some((g) => g.cle === echeanceFiltre) ? (
            <Link href={sansFiltre("echeance")} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              <IconePriorite niveau={NIVEAUX[echeanceFiltre]} titre={groupeLibelle(echeanceFiltre)} />À payer : {groupeLibelle(echeanceFiltre).toLowerCase()} ✕
            </Link>
          ) : null}
          {etape ? (
            <Link href={sansFiltre("etape")} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              <Losange atteint />
              {etape.libelle} ✕
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          <Menu
            largeur={260}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} aria-pressed={!!filtre} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Filtrer par fournisseur, référence ou numéro…"
                aria-label="Filtrer les documents"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermer()}
              />
            )}
          </Menu>
          <Menu
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
                <SlidersHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri
                  <Choix<Tri>
                    libelle="Tri"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "rang", libelle: "Ce qui bloque d'abord" },
                      { cle: "echeance", libelle: "Échéance" },
                      { cle: "montant", libelle: "Montant" },
                      { cle: "recu", libelle: "Reçu le" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          <div className="lin-table" role="table" aria-label="Documents reçus">
            <div className="lin-table-tete" role="row">
              <span role="columnheader" aria-hidden="true" />
              <span role="columnheader">Fournisseur</span>
              <span role="columnheader">Santé</span>
              <span role="columnheader">Urgence</span>
              <span role="columnheader" className="lin-num">
                Montant
              </span>
              <span role="columnheader">Échéance</span>
              <span role="columnheader" className="lin-num">
                Points
              </span>
              <span role="columnheader">Payé</span>
            </div>
            {filtres.length === 0 ? (
              <p className="lin-vide">{lignes.length ? "Aucun document ne correspond." : "Aucun document reçu pour l'instant."}</p>
            ) : (
              filtres.map((l) => {
                const part = partPayee(l, etats);
                const statut = l.a.facture ? statutFacture(l.a.facture.statut) : etatDocument(l.a.document.etat);
                return (
                  <Link key={l.id} href={ficheDe(l.id)} className="lin-table-ligne" role="row" scroll={false}>
                    <span className="lin-case" aria-hidden="true" />
                    <span className="lin-table-nom" role="cell">
                      <IconeDocumentRecu l={l} />
                      <span className="lin-table-titre">{l.nom}</span>
                      <span className="lin-jalon-puce">
                        <Losange atteint={l.sante === "reste"} />
                        {l.a.document.reference} · {statut.libelle}
                      </span>
                    </span>
                    <span className="lin-table-sante" role="cell" data-teinte={SANTES[l.sante].teinte}>
                      <IconeSante sante={l.sante} />
                      <span>{SANTES[l.sante].libelle}</span>
                    </span>
                    <span role="cell">
                      <IconePriorite niveau={urgenceDe(l)} titre={urgenceTitre(l)} />
                    </span>
                    <span role="cell" className="lin-num lin-table-valeur">
                      {l.f?.montant_ttc !== null && l.f?.montant_ttc !== undefined ? montant(l.f.montant_ttc, l.f.devise) : "—"}
                    </span>
                    <span role="cell" className="lin-table-date">
                      <IconeCalendrier passe={l.enJeu && l.groupe === "retard"} />
                      {dateCourte(l.f?.echeance_lue)}
                    </span>
                    <span role="cell" className="lin-num lin-table-chiffre">
                      {l.f ? l.points : "—"}
                    </span>
                    <span role="cell" className="lin-table-statut">
                      {part !== null ? (
                        <>
                          <Anneau part={part} sante={l.sante} />
                          {part}%
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {details ? (
          <aside className="lin-details" aria-label="Détails">
            <div className="lin-details-onglets" role="tablist">
              {(
                [
                  ["familles", "Familles"],
                  ["echeances", "À payer"],
                  ["fournisseurs", "Fournisseurs"],
                ] as const
              ).map(([cle, lib]) => (
                <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={ongletDetails === cle} onClick={() => setOngletDetails(cle)}>
                  {lib}
                </button>
              ))}
            </div>
            <ul className="lin-details-lignes">
              {lignesDetails.length ? (
                lignesDetails.map((x) => (
                  <li key={x.cle}>
                    <span>{x.libelle}</span>
                    <span className="lin-details-valeur">{x.valeur}</span>
                  </li>
                ))
              ) : (
                <li>
                  <span>Aucune facture à payer.</span>
                </li>
              )}
            </ul>
          </aside>
        ) : null}
      </div>
      {fenetreDepot}
    </div>
  );
}
