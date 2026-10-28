"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — « Débiteurs et relances », sur la boîte de réception de Linear
   (28/10/2026)

   Demande de Teo : la seconde page de chaque SaaS refaite sur la page
   « Inbox » de Linear — la liste à gauche, la page de l'élément choisi à
   droite —, dans la langue des premières pages (../lin/lin.css).

     · ?vue=debiteurs (par défaut) : un débiteur avec de l'encours par ligne
       (ce qui est échu, le palier atteint, la prochaine chose à faire) ; à
       droite la page du débiteur, sur la page d'un projet : propriétés en
       pastilles, les réponses à trancher et la dernière relance en « Latest
       update », ses factures et leurs gestes, ses règlements, ses pièces,
       et les cartes Propriétés, Paliers, Encours et Activité.
     · ?vue=relances : une relance par ligne (à valider, validée à envoyer,
       partie, répondue, arrêtée), et les relances de bon de commande ; à
       droite son texte, son débiteur, la réponse reçue, et l'envoi noté à
       la main. « Vos textes » s'ouvre à droite (?textes=1).
     · ?vue=envois et ?vue=tresorerie restent l'écran d'avant (EcranCashd),
       rendu tel quel par la page.

   L'élément ouvert est dans l'adresse (?compte=, comme les liens des autres
   écrans ; ?relance=), les filtres aussi (?filtre=dimension:valeur,…) ;
   ↑/↓ changent d'élément, Échap le referme. Rien n'est choisi d'office.

   Mêmes portes que l'écran d'avant (EcranCashd) : l'exemple joué en
   mémoire, ou la base réelle (cashd_tableau, cashd_relances_du_jour,
   cashd_fiche_compte, sous RLS) ; chaque geste passe par la même porte.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Bell,
  Building2,
  CalendarRange,
  CheckCheck,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileDown,
  FileText,
  FileUp,
  Gauge,
  HandCoins,
  Handshake,
  Inbox,
  ListFilter,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  PauseCircle,
  PenLine,
  PlayCircle,
  Scale,
  Scissors,
  Send,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { Avis } from "@/components/espace/ui";
import { dateHeure, montant } from "@/components/espace/format";
import { balanceDe, etatPiece, jourParis, tableauDe } from "@/components/espace/cashd/calcul";
import { exporterBalance, exporterJson, exporterRelances } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import { ETATS_RELANCE, STATUTS_COMPTE, libellePalier, libelleSequence } from "@/components/espace/cashd/etats";
import { JEUX, LIBELLES_CHAMPS, lireDepot, type Jeu } from "@/components/espace/cashd/depot";
import * as portes from "@/components/espace/cashd/portes";
import type { Actions } from "@/components/espace/cashd/FicheCompte";
import Textes from "@/components/espace/cashd/Textes";
import type { Balance, Fiche, NaturePiece, Piece, ReglementEtat, Relance, RelanceCommande, ReponseLue, StatutCompte, Suivi, Tableau } from "@/components/espace/cashd/types";
import { HabilleSb } from "../Habille";
import { useToast } from "../Toasts";
import { Choix, IconePriorite, Menu, MenuActions, MenuOptions, Surlignage, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeCalendrier, IconeDocument, IconeEnveloppe, IconeGroupe, IconeNonLus, IconeSante as IconeSanteLin, IconeStatutProjet, type EtatProjet, type Sante as SanteLin } from "../lin/icones";
import { RACINE } from "../modules";
/* les fenêtres de geste et « Vos textes » portent les classes de l'écran d'avant (c2-sous, c2-coche…) */
import "@/components/espace/cashd/cashd.css";
import "./boite-debiteurs.css";

export type VueBoite = "debiteurs" | "relances";
type Reel = { client: portes.MonClient | null; tableau: Tableau | null; relances: Relance[]; fiches: Record<string, Fiche> };
type Sante = "a_jour" | "retard" | "pause" | "litige";
type GroupeRelance = "repondue" | "a_envoyer" | "a_valider" | "partie" | "arretee";
type NatureLigne = "facture" | "devis" | "commande";
type Ligne = { cle: string; nature: NatureLigne; groupe: GroupeRelance; jour: string; compte_id: string; compte: string; montant: number | null; r?: Relance; c?: RelanceCommande };
type Filtres = Record<string, string>;
type Aller = (changes: Record<string, string | null>, remplacer?: boolean) => void;

/* ——— la santé d'un débiteur (les mêmes quatre que la première page) ——— */
const SANTES: Record<Sante, { libelle: string; teinte: "vert" | "jaune" | "rouge" | "gris" }> = {
  retard: { libelle: "En retard", teinte: "jaune" },
  litige: { libelle: "En litige", teinte: "rouge" },
  pause: { libelle: "En pause", teinte: "gris" },
  a_jour: { libelle: "À jour", teinte: "vert" },
};
const ETAT_PROJET: Record<Sante, EtatProjet> = { retard: "en-cours", pause: "planifie", litige: "annule", a_jour: "fait" };
const santeDe = (b: Balance): Sante => (b.statut === "litige" || b.en_litige > 0 ? "litige" : b.statut === "pause" ? "pause" : b.echu > 0 ? "retard" : "a_jour");
/* les statuts d'un compte (portes.changerStatut) ; chacun demande un motif, comme sur la fiche d'avant */
const STATUTS: { cle: StatutCompte; aide: string }[] = [
  { cle: "actif", aide: "suit la séquence" },
  { cle: "pause", aide: "plus de relance" },
  { cle: "litige", aide: "relances arrêtées" },
  { cle: "recouvrement", aide: "confié" },
  { cle: "attente_contact", aide: "pas d'adresse" },
  { cle: "hors_perimetre", aide: "jamais relancé" },
];
const santeStatut = (statut: StatutCompte, b: Balance): Sante => (statut === "actif" ? (b.echu > 0 ? "retard" : "a_jour") : statut === "litige" || statut === "recouvrement" ? "litige" : "pause");
const ORDRE_PALIERS = ["echeance", "rappel", "relance", "mise_en_demeure"] as const;
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const niveauDe = (j: number): 0 | 1 | 2 | 3 | 4 => (j > 90 ? 4 : j > 60 ? 3 : j > 30 ? 2 : j > 0 ? 1 : 0);
const retardDe = (j: number) => (j > 0 ? `${j} jour${j > 1 ? "s" : ""} de retard` : "Aucun retard");
const jour = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* ——— les filtres de la liste : une valeur par dimension, dans ?filtre= ——— */
const SITUATIONS: Record<string, string> = { a_traiter: "À traiter", echu: "Comptes en retard", plus_90: "Retards de plus de 90 jours", pause: "Comptes hors cycle" };
const GROUPES_RELANCE: Record<GroupeRelance, { libelle: string; etat: EtatProjet }> = {
  repondue: { libelle: "Réponse à trancher", etat: "en-cours" },
  a_envoyer: { libelle: "Validée, à envoyer", etat: "en-cours" },
  a_valider: { libelle: "À valider", etat: "planifie" },
  partie: { libelle: "Partie", etat: "fait" },
  arretee: { libelle: "Arrêtée", etat: "annule" },
};
const NATURES_LIGNE: Record<NatureLigne, string> = { facture: "Relance de facture", devis: "Relance de devis", commande: "Bon de commande attendu" };
const DIMENSIONS: Record<VueBoite, string[]> = { debiteurs: ["situation", "palier", "groupe"], relances: ["etat", "palier", "nature", "debiteur"] };
const valeurAdmise = (k: string, v: string) => (k === "situation" ? v in SITUATIONS : k === "etat" ? v in GROUPES_RELANCE : k === "nature" ? v in NATURES_LIGNE : v !== "");
function lireFiltres(s: string | null, vue: VueBoite): Filtres {
  const f: Filtres = {};
  for (const p of (s ?? "").split(",")) {
    const i = p.indexOf(":");
    if (i < 1) continue;
    const k = p.slice(0, i);
    let v = p.slice(i + 1);
    try {
      v = decodeURIComponent(v);
    } catch {
      continue;
    }
    if (DIMENSIONS[vue].includes(k) && valeurAdmise(k, v)) f[k] = v;
  }
  return f;
}
const ecrireFiltres = (f: Filtres) =>
  Object.entries(f)
    .map(([k, v]) => `${k}:${encodeURIComponent(v)}`)
    .join(",") || null;

/* ——— l'état d'une relance, en cinq groupes ——— */
const aEnvoyer = (r: Relance) => r.etat === "validee" || (r.etat === "non_reglee" && r.demande_statut === "approuvee");
const groupeDe = (r: Relance, repondue: boolean): GroupeRelance =>
  repondue ? "repondue" : aEnvoyer(r) ? "a_envoyer" : r.etat === "a_valider" || r.etat === "non_reglee" ? "a_valider" : r.etat === "envoyee" || r.envoye_le ? "partie" : "arretee";
const groupeCommande = (c: RelanceCommande): GroupeRelance => (c.statut === "a_valider" || c.statut === "non_reglee" || c.statut === "preparee" ? "a_valider" : "arretee");
const ETATS_COMMANDE: Record<RelanceCommande["statut"], string> = { preparee: "En préparation", a_valider: "À valider", non_reglee: "Écrite — envoi à régler", bloquee: "Bloquée", coupee: "Coupée", echec: "Échec" };
const CANAUX_MAIN: Record<string, string> = { email: "Courriel", courrier: "Courrier", telephone: "Téléphone", autre: "Autre" };
const canalDe = (r: Relance) => (r.envoi_main ? `${CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal}, à la main` : r.canal === "lre" ? "Recommandé électronique" : r.canal === "whatsapp" ? "WhatsApp" : "Courriel");

/* ——— les petites icônes ——— */
function IconeStatut({ sante }: { sante: Sante }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}
function IconeSante({ sante }: { sante: Sante }) {
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
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}
function IconeDebiteur({ id }: { id: string }) {
  return <Building2 className="lin-icone-projet" width={16} height={16} strokeWidth={1.8} style={{ color: couleurDe(id) }} aria-hidden="true" />;
}
function IconeLigne({ nature, taille = 20 }: { nature: NatureLigne; taille?: number }) {
  const Icone = nature === "commande" ? ClipboardList : nature === "devis" ? FileText : Mail;
  return <Icone width={taille} height={taille} strokeWidth={1.6} aria-hidden="true" />;
}
/* l'icône de gauche des listes : la santé de Linear (en retard = à risque, en litige = hors délai) */
const SANTE_LIGNE: Record<"retard" | "litige" | "pause" | "a_jour", SanteLin> = { retard: "risque", litige: "hors", pause: "neutre", a_jour: "bien" };
const SANTE_RELANCE: Record<GroupeRelance, SanteLin> = { repondue: "risque", a_valider: "risque", a_envoyer: "risque", partie: "bien", arretee: "neutre" };
function IconeGroupeRelance({ g }: { g: GroupeRelance }) {
  return <IconeStatutProjet etat={GROUPES_RELANCE[g].etat} titre={GROUPES_RELANCE[g].libelle} />;
}

/* les paliers atteints par un débiteur : le suivi de ses factures (quand sa fiche est lue) et ses relances écrites */
function paliersDe(fiche: Fiche | null, relances: Relance[]) {
  const vus = new Map<string, string | null>();
  for (const s of fiche?.suivi ?? [])
    if (s.palier_atteint && (!vus.has(s.palier_atteint) || (s.palier_atteint_le && (vus.get(s.palier_atteint) ?? "") < s.palier_atteint_le))) vus.set(s.palier_atteint, s.palier_atteint_le);
  for (const r of relances) if (r.etat !== "a_valider" && !vus.has(r.palier)) vus.set(r.palier, r.jour);
  return vus;
}
const dernierPalier = (vus: Map<string, string | null>) => [...ORDRE_PALIERS].reverse().find((p) => vus.has(p)) ?? null;
/* le prochain palier prévu par le suivi des factures */
const prochainPalier = (suivi: Suivi[]) => suivi.filter((s) => s.palier_suivant && s.palier_suivant_le).sort((a, b) => (a.palier_suivant_le ?? "").localeCompare(b.palier_suivant_le ?? ""))[0] ?? null;

/* le pied « Noter l'envoi à la main » d'une relance validée (c2_11) : copier le texte, choisir le canal, noter */
function EnvoiMain({ relance, noter }: { relance: Relance; noter: (r: Relance, canal: string) => Promise<void> }) {
  const [canal, setCanal] = useState("email");
  const [envoi, setEnvoi] = useState(false);
  return (
    <span className="c2b-pied-droite">
      <Choix<string> libelle="Envoyée par" valeur={canal} onChange={setCanal} options={Object.entries(CANAUX_MAIN).map(([cle, libelle]) => ({ cle, libelle }))} />
      <button
        type="button"
        className="v2-btn v2-btn--petit"
        disabled={envoi}
        onClick={() => {
          setEnvoi(true);
          void noter(relance, canal).finally(() => setEnvoi(false));
        }}
      >
        {envoi ? <Loader variant="spin" /> : <Send width={14} height={14} aria-hidden="true" />}
        <span>Noter l&apos;envoi à la main</span>
      </button>
    </span>
  );
}

const copier = (texte: string) => void navigator.clipboard?.writeText(texte);

/* ——— la tête d'un élément ouvert : celle de l'Inbox de Linear (28/10/2026) ———
   la référence en gris, le titre, l'étoile (épingler en tête de liste), le « ··· » de tous les gestes ;
   à droite les trois ronds de Linear avec notre sens : la cloche mène à l'activité, l'horloge aux dates,
   le bac à croix referme (comme Échap). Plus de fil d'Ariane, de « i / n », de flèches ni de bouton cerclé. */
type Tete = { epingle: boolean; epingler: () => void; voisins: Option[] };
function TeteDetail({
  reference,
  nom,
  tete,
  actions = [],
  dates,
  activite,
  fermer,
}: {
  reference: string;
  nom: string;
  tete?: Tete;
  actions?: Option[];
  dates?: { titre: string; options: Option[] };
  activite?: boolean;
  fermer: () => void;
}) {
  const options = [...(tete?.voisins ?? []), ...actions];
  return (
    <header className="lin-tete">
      <span className="lin-tete-ref">{reference}</span>
      <span className="lin-tete-nom" title={nom}>
        {nom}
      </span>
      {tete ? (
        <button
          type="button"
          className="lin-rond"
          aria-pressed={tete.epingle}
          data-actif={tete.epingle ? "" : undefined}
          aria-label={tete.epingle ? "Désépingler" : "Épingler en haut de la liste"}
          title={tete.epingle ? "Désépingler" : "Épingler en haut de la liste"}
          onClick={tete.epingler}
        >
          <Star aria-hidden="true" fill={tete.epingle ? "currentColor" : "none"} />
        </button>
      ) : null}
      {options.length ? <MenuActions rond aGauche titre="Actions" options={options} /> : null}
      <div className="lin-tete-ronds">
        {activite ? (
          <button type="button" className="lin-rond" aria-label="Voir l'activité" title="Voir l'activité" onClick={() => document.getElementById("c2b-activite")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <Bell aria-hidden="true" />
          </button>
        ) : null}
        {/* MenuOptions ne pose pas de bulle sur son bouton : l'enveloppe la donne (display: contents) */}
        {dates?.options.length ? (
          <span className="c2b-bulle" title="Dates">
            <MenuOptions rond aDroite libelle="Dates" titre={dates.titre} declencheur={<Clock aria-hidden="true" />} options={dates.options} largeur={280} />
          </span>
        ) : null}
        <button type="button" className="lin-rond" aria-label="Fermer" title="Fermer (Échap)" onClick={fermer}>
          <IconeBoiteX />
        </button>
      </div>
    </header>
  );
}

export default function BoiteDebiteurs({ vue }: { vue: VueBoite }) {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  /* ——— les données : la mémoire en exemple, les portes en base réelle (comme EcranCashd) ——— */
  const [fiches, setFiches] = useState<Fiche[]>(FICHES_EXEMPLE);
  const [sansCompte] = useState<ReglementEtat[]>(SANS_COMPTE_EXEMPLE);
  const [relancesLocales, setRelancesLocales] = useState<Relance[]>(RELANCES_EXEMPLE);
  const [commandesLocales, setCommandesLocales] = useState<RelanceCommande[]>([]);
  const [commandesReelles, setCommandesReelles] = useState<RelanceCommande[]>([]);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [echecsFiche, setEchecsFiche] = useState<Record<string, string>>({});
  const tentees = useRef(new Set<string>());

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    tentees.current.clear();
    try {
      const client = await portes.monClient();
      if (!client) {
        setReel({ client: null, tableau: null, relances: [], fiches: {} });
        return;
      }
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      setReel({ client, tableau, relances, fiches: {} });
      setCommandesReelles(await portes.chargerRelancesCommande(client.client_id).catch(() => []));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: null, tableau: null, relances: [], fiches: {} });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    const client = reel?.client;
    if (!client) return;
    try {
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      tentees.current.clear();
      setEchecsFiche({});
      setReel((prev) => (prev ? { ...prev, tableau, relances, fiches: {} } : prev));
      setCommandesReelles(await portes.chargerRelancesCommande(client.client_id).catch(() => []));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [reel?.client]);
  useTempsReel(["cashd_factures", "cashd_reglements", "cashd_relances", "cashd_comptes", "cashd_relances_commande"], source === "reelle", relire);

  const tableau: Tableau | null = useMemo(() => {
    if (source === "exemple") return tableauDe(fiches, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, sansCompte);
    return reel?.tableau ?? null;
  }, [source, fiches, sansCompte, reel]);
  const relances = useMemo(() => (source === "exemple" ? relancesLocales : (reel?.relances ?? [])), [source, relancesLocales, reel]);
  const commandes = source === "exemple" ? commandesLocales : commandesReelles;
  const ficheDe = useCallback(
    (id: string | null): Fiche | null => {
      if (!id) return null;
      if (source === "exemple") {
        const f = fiches.find((x) => x.compte.id === id);
        return f ? { ...f, balance: balanceDe(f) } : null;
      }
      return reel?.fiches[id] ?? null;
    },
    [source, fiches, reel],
  );

  /* ——— l'adresse : la vue, l'élément ouvert, les filtres, le tri ——— */
  const cleChoix = vue === "debiteurs" ? "compte" : "relance";
  const choix = params.get(cleChoix);
  const textes = vue === "relances" && params.get("textes") === "1";
  const filtres = lireFiltres(params.get("filtre"), vue);
  const tri = params.get("tri") ?? (vue === "debiteurs" ? "echu" : "recent");
  const adresse = (changes: Record<string, string | null>, vueCible: VueBoite = vue) => {
    const q = new URLSearchParams(vueCible === vue ? params.toString() : "");
    q.set("vue", vueCible);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    return `${RACINE}/cashd/suivi?${q.toString()}`;
  };
  /* dans la même vue, l'adresse change sans relire la page (l'historique de Next suit) */
  const aller: Aller = (changes, remplacer = false) => {
    const u = adresse(changes);
    if (remplacer) window.history.replaceState(null, "", u);
    else window.history.pushState(null, "", u);
  };
  /* l'autre vue (débiteurs ↔ relances) : la page la lit côté serveur */
  const changerVue = (vueCible: VueBoite, changes: Record<string, string | null> = {}) => routeur.push(adresse(changes, vueCible), { scroll: false });
  const basculerFiltre = (k: string, v: string) => {
    const f = { ...filtres };
    if (f[k] === v) delete f[k];
    else f[k] = v;
    aller({ filtre: ecrireFiltres(f) });
  };
  /* « Seulement ce qui est à traiter » (le bac à point de la tête) : chez les débiteurs, c'est le filtre
     « À traiter » qui existait déjà ; chez les relances, traiter=1. Posé en remplacement, sur la même route. */
  const traiterSeul = vue === "debiteurs" ? filtres.situation === "a_traiter" : params.get("traiter") === "1";
  const basculerTraiter = () => {
    if (vue === "relances") return aller({ traiter: traiterSeul ? null : "1" }, true);
    const f = { ...filtres };
    if (traiterSeul) delete f.situation;
    else f.situation = "a_traiter";
    aller({ filtre: ecrireFiltres(f) }, true);
  };
  /* les épingles (l'étoile de la tête du détail) : propres à ce navigateur, une liste par vue */
  const [epinglesDebiteurs, epinglerDebiteur] = useEpingles("cashd-debiteurs");
  const [epinglesRelances, epinglerRelance] = useEpingles("cashd-relances");
  const suivreLien = (e: React.MouseEvent, changes: Record<string, string | null>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    aller(changes);
  };

  /* ——— base réelle : la fiche du débiteur ouvert, et celles des débiteurs relancés (leurs réponses) ——— */
  const aLire = useMemo(() => {
    if (source !== "reelle" || !reel?.client) return [];
    const ids = new Set<string>();
    if (vue === "debiteurs" && choix) ids.add(choix);
    for (const r of reel.relances) ids.add(r.compte_id);
    return [...ids].filter((id) => !reel.fiches[id]).slice(0, 40);
  }, [source, reel, vue, choix]);
  useEffect(() => {
    if (!aLire.length) return;
    const t = window.setTimeout(() => {
      for (const id of aLire) {
        if (tentees.current.has(id)) continue;
        tentees.current.add(id);
        portes
          .chargerFiche(id)
          .then((f) => {
            if (f) setReel((prev) => (prev ? { ...prev, fiches: { ...prev.fiches, [id]: f } } : prev));
            else setEchecsFiche((x) => ({ ...x, [id]: "Ce compte n'a pas pu être lu." }));
          })
          .catch((e) => setEchecsFiche((x) => ({ ...x, [id]: e instanceof Error ? e.message : "La fiche n'a pas pu être lue." })));
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [aLire]);

  /* ——— les gestes : la porte en base réelle, la mémoire en exemple (repris d'EcranCashd) ——— */
  const majFiche = (id: string, change: (f: Fiche) => Fiche) => setFiches((prev) => prev.map((f) => (f.compte.id === id ? change(f) : f)));
  const actionsPour = (fiche: Fiche): Actions => ({
    noterReglement: async (o) => {
      if (source === "reelle") {
        if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
        const r = await portes.noterReglement({ client: reel.client.client_id, compte: fiche.compte.id, ...o });
        await relire();
        if (r.deja_note) return "Ce règlement était déjà noté : rien n'a été ajouté.";
        return r.a_imputer > 0 ? `Règlement noté ; ${montant(r.a_imputer)} restent à rapprocher.` : "Règlement noté et lettré. La relance prête de la facture est coupée.";
      }
      const cible = o.facture ?? fiche.pieces.find((p) => p.nature !== "devis" && p.nature !== "avoir" && p.statut === "ouverte" && Math.abs(p.montant_ttc - p.regle - p.avoirs_imputes - o.montant) < 0.005)?.id ?? null;
      majFiche(fiche.compte.id, (f) => ({
        ...f,
        pieces: f.pieces.map((p) => {
          if (p.id !== cible) return p;
          const regle = p.regle + o.montant;
          return { ...p, regle, statut: p.montant_ttc - regle - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut };
        }),
        reglements: [
          ...f.reglements,
          {
            id: crypto.randomUUID(),
            compte_id: f.compte.id,
            recu_le: o.date,
            montant: o.montant,
            mode: o.mode,
            reference: o.reference,
            libelle: null,
            statut: "actif",
            impute: cible ? o.montant : 0,
            a_imputer: cible ? 0 : o.montant,
          },
        ],
      }));
      if (cible) setRelancesLocales((prev) => prev.map((r) => (r.etat === "a_valider" && r.pieces.some((p) => p.facture_id === cible) ? { ...r, etat: "coupee", statut: "coupee", motif: "facture réglée" } : r)));
      return cible ? "Règlement noté et lettré (exemple) : la relance prête de la facture est coupée." : "Règlement noté (exemple) : il reste à rapprocher.";
    },
    changerStatut: async (statut, motif) => {
      if (source === "reelle") {
        const r = await portes.changerStatut(fiche.compte.id, statut, motif);
        await relire();
        return statut === "actif" ? "Le compte est repris : les relances reprennent au prochain matin." : `Compte mis en pause ; ${r.relances_coupees} relance(s) prête(s) coupée(s).`;
      }
      majFiche(fiche.compte.id, (f) => ({ ...f, compte: { ...f.compte, statut, statut_motif: motif, statut_le: new Date().toISOString() } }));
      if (statut !== "actif")
        setRelancesLocales((prev) => prev.map((r) => (r.compte_id === fiche.compte.id && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: `compte en pause : ${motif}` } : r)));
      return statut === "actif" ? "Le compte est repris (exemple)." : "Compte mis en pause (exemple) : ses relances prêtes sont coupées.";
    },
    echeancier: async (facture, echeances, motif) => {
      if (source === "reelle") {
        const r = await portes.poserEcheancier(facture, echeances, motif);
        await relire();
        return `Échéancier posé : ${r.echeances} échéance${r.echeances > 1 ? "s" : ""}, la prochaine le ${jour(r.echeance_suivie)}. Seule une échéance manquée relancera le cycle.`;
      }
      majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, echeance_origine: p.echeance_origine ?? p.echeance, echeance: echeances[0].echeance } : p)) }));
      setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `échéancier négocié : ${motif}` } : x)));
      return `Échéancier posé (exemple) : ${echeances.length} échéances, la prochaine le ${jour(echeances[0].echeance)}.`;
    },
    contester: async (facture, montantConteste, motif) => {
      if (source === "reelle") {
        const r = await portes.litigePartiel(facture, montantConteste, motif);
        await relire();
        return `${montant(r.montant_conteste)} contestés sortent du cycle ; ${montant(r.reste_relancable)} restent relancés. Le commercial du compte est prévenu.`;
      }
      majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, montant_conteste: montantConteste } : p)) }));
      setRelancesLocales((prev) =>
        prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `contestation partielle : ${motif}` } : x)),
      );
      return `${montant(montantConteste)} contestés sortent du cycle (exemple) ; le reste continue d'être relancé.`;
    },
    dossier: async (motif = "litige") => {
      const nom = `dossier-${motif === "assurance_credit" ? "assurance-credit-" : ""}${fiche.compte.reference}-${jourParis()}.json`;
      if (source === "reelle") {
        exporterJson(nom, await portes.dossier(fiche.compte.id, motif));
        return;
      }
      const jointes = fiche.pieces_jointes ?? [];
      exporterJson(nom, {
        motif,
        constitue_le: new Date().toISOString(),
        debiteur: fiche.compte,
        balance: balanceDe(fiche),
        pieces_jointes: jointes,
        pdf_manquants: fiche.pieces
          .filter((p) => (p.nature === "facture" || p.nature === "acompte") && p.statut !== "soldee" && !jointes.some((x) => x.facture_id === p.id && x.nature === "facture_pdf"))
          .map((p) => p.numero),
        pieces: fiche.pieces.map((p) => etatPiece(p)),
        reglements: fiche.reglements,
        relances: relancesLocales.filter((x) => x.compte_id === fiche.compte.id),
      });
    },
    proposerPlafond: async () => {
      if (source === "reelle") {
        const p = await portes.proposerPlafond(fiche.compte.id);
        return {
          propose: p?.propose ?? null,
          base:
            p && p.factures_douze_mois > 0
              ? `Proposé depuis l'historique : ${montant(p.facture_mensuel_moyen)} facturés par mois en moyenne sur douze mois, payés en ${Math.round(p.delai_retenu_jours)} jours, plus une demi-marge.`
              : "Pas d'historique de facturation sur douze mois : fixez le plafond vous-même.",
        };
      }
      const total = fiche.pieces.filter((p) => p.nature === "facture" || p.nature === "acompte").reduce((t, p) => t + p.montant_ttc, 0);
      const mensuel = total / 12;
      return {
        propose: mensuel > 0 ? Math.ceil((mensuel * 1.5) / 100) * 100 : null,
        base: `Proposé depuis l'historique (exemple) : ${montant(mensuel)} facturés par mois en moyenne, payés à 30 jours, plus une demi-marge.`,
      };
    },
    fixerPlafond: async (plafond, motif) => {
      if (source === "reelle") {
        await portes.fixerPlafond(fiche.compte.id, plafond, motif);
        await relire();
        return plafond === null ? "Le compte n'a plus de plafond." : `Plafond fixé à ${montant(plafond)} ; le changement est daté au journal.`;
      }
      majFiche(fiche.compte.id, (f) => ({ ...f, compte: { ...f.compte, plafond_encours: plafond } }));
      return plafond === null ? "Le compte n'a plus de plafond (exemple)." : `Plafond fixé à ${montant(plafond)} (exemple).`;
    },
    litige: async (facture, ouvrir, motif) => {
      if (source === "reelle") {
        const r = await portes.litige(facture, ouvrir, motif);
        await relire();
        return ouvrir ? `Facture en litige ; ${r.relances_coupees} relance(s) coupée(s).` : "Litige clos : la facture reprend son cycle.";
      }
      majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, statut: ouvrir ? "litige" : "ouverte", statut_motif: motif } : p)) }));
      return ouvrir ? "Facture en litige (exemple) : elle sort du cycle." : "Litige clos (exemple).";
    },
    attendreCommande: async (facture, email, nom, motif) => {
      if (source === "reelle") {
        const r = await portes.attendreCommande(facture, email, nom, motif);
        await relire();
        return email
          ? `La facture attend son bon de commande : ${nom ?? email} recevra sa relance, par la file de validation. ${r.relances_coupees ? "La relance adressée à la comptabilité est coupée." : ""}`
          : "Bon de commande reçu : la facture reprend son cycle.";
      }
      const piece = fiche.pieces.find((p) => p.id === facture);
      majFiche(fiche.compte.id, (y) => ({
        ...y,
        pieces: y.pieces.map((p) => (p.id === facture ? { ...p, attente_commande_le: email ? jourParis() : null, attente_commande_email: email, attente_commande_nom: nom, attente_commande_motif: motif } : p)),
      }));
      if (email && piece) {
        setRelancesLocales((prev) =>
          prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: "en attente d'un bon de commande" } : x)),
        );
        setCommandesLocales((prev) => [
          {
            id: crypto.randomUUID(),
            facture_id: facture,
            compte_id: fiche.compte.id,
            jour: jourParis(),
            destinataire_adresse: email,
            destinataire_nom: nom,
            sujet: `Atelier Bertin — bon de commande attendu pour la facture ${piece.numero}`,
            corps: null,
            statut: "a_valider",
            motif: null,
          },
          ...prev,
        ]);
      } else {
        setCommandesLocales((prev) => prev.map((x) => (x.facture_id === facture && x.statut === "a_valider" ? { ...x, statut: "coupee", motif: "bon de commande reçu" } : x)));
      }
      return email ? `La facture attend son bon de commande (exemple) : ${nom ?? email} reçoit sa relance.` : "Bon de commande reçu (exemple) : la facture reprend son cycle.";
    },
    deciderSolde: async (facture, decision, motif) => {
      if (source === "reelle") {
        const r = await portes.deciderSolde(facture, decision, motif);
        await relire();
        return decision === "abandonne"
          ? `Solde abandonné : il sort de toute relance${r.relances_coupees ? ", la relance prête est coupée" : ""}.`
          : decision === "reclame"
            ? "Solde réclamé : il sera relancé malgré le seuil."
            : "La règle du seuil reprend.";
      }
      majFiche(fiche.compte.id, (y) => ({ ...y, pieces: y.pieces.map((p) => (p.id === facture ? { ...p, solde_decision: decision, solde_decision_motif: motif } : p)) }));
      if (decision === "abandonne")
        setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `solde abandonné : ${motif}` } : x)));
      return decision === "abandonne" ? "Solde abandonné (exemple)." : decision === "reclame" ? "Solde réclamé (exemple)." : "La règle du seuil reprend (exemple).";
    },
    trancherReponse: async (x, accepter) => {
      if (source === "reelle") {
        const r = await portes.trancherReponse(x.id, accepter, null);
        await relire();
        return !accepter
          ? "Proposition écartée : rien ne change ; la décision reste au journal."
          : x.proposition === "litige"
            ? `${r.effets} facture${r.effets > 1 ? "s" : ""} en litige ; leurs relances prêtes sont coupées.`
            : x.proposition === "attente_contact"
              ? "Le compte attend un nouveau contact : désignez-le avant toute reprise."
              : "Le compte est en pause le temps du règlement annoncé ; il reprend sur votre décision.";
      }
      majFiche(fiche.compte.id, (y) => {
        const reponses_lues = (y.reponses_lues ?? []).filter((z) => z.id !== x.id);
        if (!accepter) return { ...y, reponses_lues };
        if (x.proposition === "litige") {
          const ids = relancesLocales.find((r) => r.id === x.relance_id)?.pieces.map((p) => p.facture_id) ?? [];
          return { ...y, reponses_lues, pieces: y.pieces.map((p) => (ids.includes(p.id) ? { ...p, statut: "litige", statut_motif: "contestation écrite du client" } : p)) };
        }
        const statut = x.proposition === "attente_contact" ? "attente_contact" : "pause";
        return {
          ...y,
          reponses_lues,
          compte: { ...y.compte, statut, statut_motif: x.proposition === "pause" ? "le client annonce son règlement" : "l'interlocuteur a quitté l'entreprise", statut_le: new Date().toISOString() },
        };
      });
      if (accepter && x.proposition !== "aucune")
        setRelancesLocales((prev) => prev.map((r) => (r.compte_id === fiche.compte.id && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: "réponse du client tranchée" } : r)));
      return accepter ? "Proposition acceptée (exemple)." : "Proposition écartée (exemple) : rien ne change.";
    },
    joindrePiece: async (facture, nature, fichier) => {
      if (source === "reelle") {
        if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
        await portes.joindrePiece(reel.client.client_id, facture, nature, fichier);
        /* la fiche est relue : la pièce jointe y paraît */
        const relue = await portes.chargerFiche(fiche.compte.id).catch(() => null);
        if (relue) setReel((prev) => (prev ? { ...prev, fiches: { ...prev.fiches, [fiche.compte.id]: relue } } : prev));
        return `${fichier.name} est joint à la facture ; il rejoint ses dossiers.`;
      }
      majFiche(fiche.compte.id, (y) => ({
        ...y,
        pieces_jointes: [...(y.pieces_jointes ?? []), { id: crypto.randomUUID(), facture_id: facture, nature, chemin: `exemple/${fichier.name}`, nom: fichier.name, cree_le: new Date().toISOString() }],
      }));
      return `${fichier.name} est joint à la facture (exemple, rien n'est envoyé).`;
    },
    consignerAccord: async (devis, note, le) => {
      if (source === "reelle") {
        await portes.consignerAccord(devis, note, le);
        await relire();
        return "Accord consigné : le devis est accepté, sa cadence s'arrête. Le point du matin suivra la facture à venir.";
      }
      majFiche(fiche.compte.id, (y) => ({ ...y, pieces: y.pieces.map((p) => (p.id === devis ? { ...p, statut: "accepte", accord_oral_le: le, accord_note: note } : p)) }));
      setRelancesLocales((prev) =>
        prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === devis) ? { ...x, etat: "coupee", statut: "coupee", motif: `devis accepté de vive voix le ${jour(le)}` } : x)),
      );
      return "Accord consigné (exemple) : le devis est accepté, sa cadence s'arrête.";
    },
  });

  /* c2_11 : une relance validée, envoyée par la personne elle-même, se note ; elle passe alors dans les envois */
  const noterEnvoi = async (r: Relance, canal: string) => {
    try {
      if (source === "reelle") {
        await portes.noterEnvoiMain(r.id, canal, null);
        await relire();
      } else {
        const le = new Date().toISOString();
        setRelancesLocales((prev) => prev.map((x) => (x.id === r.id ? { ...x, etat: "envoyee", envoye_le: le, envoi_main: { canal, envoye_le: le, note: null } } : x)));
      }
      toast(`C'est fait. L'envoi à la main est noté (${CANAUX_MAIN[canal] ?? canal}) : la relance compte comme partie.`, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "L'envoi n'a pas pu être noté.", "rouge");
    }
  };

  /* ——— écrire les relances du jour (base réelle) ——— */
  const [prepare, setPrepare] = useState(false);
  const preparer = async () => {
    if (!reel?.client) return;
    setPrepare(true);
    try {
      const r = await portes.preparerMaintenant(reel.client.client_id);
      await relire();
      toast(
        `C'est fait. ${pluriel(r.preparees, "relance")} écrite${r.preparees > 1 ? "s" : ""}${r.bloquees ? `, ${r.bloquees} arrêtée${r.bloquees > 1 ? "s" : ""} (voir leur motif)` : ""}. Elles attendent votre validation.`,
        "vert",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "La préparation a échoué.", "rouge");
    } finally {
      setPrepare(false);
    }
  };

  /* ——— déposer un export du facturier (repris d'EcranCashd) ——— */
  const [depot, setDepot] = useState(false);
  const [jeu, setJeu] = useState<Jeu>("factures");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState("");
  const [complet, setComplet] = useState(true);
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const lecture = useMemo(() => (texte.trim() ? lireDepot(texte, jeu) : null), [texte, jeu]);
  const ouvrirDepot = () => {
    setTexte("");
    setNomFichier("");
    setErreurDepot(null);
    setJeu("factures");
    setComplet(true);
    setDepot(true);
  };
  const lireFichier = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreurDepot(null);
    if (/\.xlsx?$/i.test(fichier.name)) {
      setErreurDepot("Un classeur Excel se dépose par la boîte de relevés de votre facturier (lecture côté serveur). Ici, enregistrez-le d'abord en CSV.");
      return;
    }
    setNomFichier(fichier.name);
    setTexte(await fichier.text());
  };
  const deposer = async () => {
    if (!lecture) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      if (source !== "reelle") {
        toast(`Exemple : ${pluriel(lecture.lignes.length, "ligne")} lue${lecture.lignes.length > 1 ? "s" : ""}, rien n'est envoyé. En base réelle, elles entrent par la porte cashd_importer.`, "vert");
        setDepot(false);
        return;
      }
      if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
      const r = await portes.importer({ client: reel.client.client_id, jeu, lignes: lecture.lignes, complet: JEUX.find((x) => x.cle === jeu)?.complet ? complet : false, fichier: nomFichier || "collé dans l'espace" });
      await relire();
      toast(
        `C'est fait. ${pluriel(r.lignes, "ligne")} lue${r.lignes > 1 ? "s" : ""} : ${r.creees} créée${r.creees > 1 ? "s" : ""}, ${r.modifiees} mise${r.modifiees > 1 ? "s" : ""} à jour` +
          (r.soldees_par_absence ? `, ${r.soldees_par_absence} soldée${r.soldees_par_absence > 1 ? "s" : ""} (absentes de l'export)` : "") +
          (r.lettrees ? `, ${pluriel(r.lettrees, "règlement")} lettré${r.lettrees > 1 ? "s" : ""}` : "") +
          (r.ecartees.length
            ? `. ${r.ecartees.length} écartée${r.ecartees.length > 1 ? "s" : ""} : ${r.ecartees
                .slice(0, 3)
                .map((x) => `ligne ${x.ligne + 1} (${x.motif})`)
                .join(", ")}${r.ecartees.length > 3 ? "…" : ""}`
            : "") +
          (r.avoirs_non_imputes?.length
            ? `. ${r.avoirs_non_imputes.length} avoir${r.avoirs_non_imputes.length > 1 ? "s" : ""} non imputé${r.avoirs_non_imputes.length > 1 ? "s" : ""}, facture visée inconnue : ${r.avoirs_non_imputes
                .slice(0, 3)
                .map((x) => `${x.numero} sur ${x.vise}`)
                .join(", ")}${r.avoirs_non_imputes.length > 3 ? "…" : ""}`
            : "") +
          (r.incoherentes?.length
            ? `. ${r.incoherentes.length} facture${r.incoherentes.length > 1 ? "s" : ""} au total incohérent, relance suspendue : ${r.incoherentes
                .slice(0, 3)
                .map((x) => `${x.numero} (${x.motif})`)
                .join(", ")}${r.incoherentes.length > 3 ? "…" : ""}`
            : "") +
          ".",
        "vert",
      );
      setDepot(false);
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a été refusé.");
    } finally {
      setEnvoiDepot(false);
    }
  };

  /* ——— ce que la liste montre ——— */
  const chargement = source === "reelle" && !reel;
  const essai = source === "exemple" || (!!reel?.tableau?.reglages && reel.tableau.reglages.mode !== "reel");
  const tous = tableau?.comptes ?? [];
  const relancesDe = (id: string) => relances.filter((r) => r.compte_id === id).sort((x, y) => (y.envoye_le ?? y.jour).localeCompare(x.envoye_le ?? x.jour));
  const reponsesDe = (id: string): ReponseLue[] => (ficheDe(id)?.reponses_lues ?? []).filter((x) => x.statut === "proposee");
  const reponseDeRelance = new Map<string, ReponseLue>();
  /* une réponse désigne sa relance par son identifiant (la base) ; l'exemple la rattache par sa demande de validation */
  for (const id of new Set(relances.map((r) => r.compte_id)))
    for (const x of reponsesDe(id)) {
      const r = relances.find((y) => y.id === x.relance_id) ?? relances.find((y) => y.demande_id === x.relance_id);
      if (r) reponseDeRelance.set(r.id, x);
    }

  /* un débiteur par ligne : ce qu'il doit, le palier atteint, la prochaine chose à faire */
  const infoDe = (b: Balance) => {
    const rs = relancesDe(b.compte_id);
    const fiche = ficheDe(b.compte_id);
    const reponses = reponsesDe(b.compte_id);
    const aValider = rs.filter((r) => groupeDe(r, false) === "a_valider");
    const envoyer = rs.filter(aEnvoyer);
    const vus = paliersDe(fiche, rs);
    const palier = dernierPalier(vus);
    const suivant = prochainPalier(fiche?.suivi ?? []);
    const prochaine = reponses.length
      ? `${pluriel(reponses.length, "réponse")} à trancher`
      : aValider.length
        ? `${libellePalier(aValider[0].palier).toLowerCase()} à valider`
        : envoyer.length
          ? "relance validée, à envoyer"
          : b.statut !== "actif"
            ? STATUTS_COMPTE[b.statut].libelle.toLowerCase()
            : suivant
              ? `prochain : ${libellePalier(suivant.palier_suivant).toLowerCase()} le ${jour(suivant.palier_suivant_le)}`
              : "";
    const derniere = rs.find((r) => r.etat !== "a_valider") ?? rs[0] ?? null;
    return {
      rs,
      vus,
      palier,
      nonLu: reponses.length > 0 || aValider.length > 0 || envoyer.length > 0,
      l2: [b.echu > 0 ? `${montant(b.echu, b.devise)} échus` : `${montant(b.encours, b.devise)} à échoir`, palier ? libellePalier(palier) : "pas encore relancé", prochaine].filter(Boolean).join(" · "),
      date: derniere ? (derniere.envoye_le ?? derniere.jour) : b.plus_ancienne_echeance,
      dateTitre: derniere ? `Dernière relance : ${jour(derniere.envoye_le ?? derniere.jour)}` : `Plus ancienne échéance : ${jour(b.plus_ancienne_echeance)}`,
    };
  };
  const debiteurs = tous.filter((b) => b.encours > 0 || b.en_litige > 0).map((b) => ({ b, i: infoDe(b) }));
  type LigneDebiteur = (typeof debiteurs)[number];
  const correspondDebiteur = (x: LigneDebiteur, k: string, v: string) =>
    k === "situation" ? (v === "a_traiter" ? x.i.nonLu : v === "echu" ? x.b.echu > 0 : v === "plus_90" ? x.b.echu_plus_90 > 0 : x.b.statut !== "actif") : k === "palier" ? x.i.palier === v : (x.b.groupe ?? "") === v;
  const dansDebiteurs = (x: LigneDebiteur, sauf?: string) => Object.entries(filtres).every(([k, v]) => k === sauf || correspondDebiteur(x, k, v));
  const valeurTri = (x: LigneDebiteur) => (tri === "retard" ? -x.b.retard_max_jours : tri === "encours" ? -x.b.encours : tri === "recent" ? -Date.parse(x.i.date ?? "1970-01-01") : tri === "nom" ? 0 : -x.b.echu);
  /* les épinglés passent en tête, chacun gardant l'ordre courant */
  const debiteursVus = debiteurs
    .filter((x) => dansDebiteurs(x))
    .sort((a, b) => Number(epinglesDebiteurs.has(b.b.compte_id)) - Number(epinglesDebiteurs.has(a.b.compte_id)) || valeurTri(a) - valeurTri(b) || a.b.nom.localeCompare(b.b.nom, "fr"));

  /* une relance par ligne, et les relances de bon de commande */
  const nomCompte = (id: string) => tous.find((b) => b.compte_id === id)?.nom ?? ficheDe(id)?.compte.nom ?? "Débiteur";
  const lignes: Ligne[] = [
    ...relances.map((r): Ligne => ({
      cle: r.id,
      nature: r.nature === "devis" ? "devis" : "facture",
      groupe: groupeDe(r, reponseDeRelance.has(r.id)),
      jour: r.envoye_le ?? r.jour,
      compte_id: r.compte_id,
      compte: r.compte,
      montant: r.montant,
      r,
    })),
    ...commandes.map((c): Ligne => ({ cle: c.id, nature: "commande", groupe: groupeCommande(c), jour: c.jour, compte_id: c.compte_id, compte: nomCompte(c.compte_id), montant: null, c })),
  ];
  const palierLigne = (l: Ligne) => l.r?.palier ?? "";
  const correspondLigne = (l: Ligne, k: string, v: string) => (k === "etat" ? l.groupe === v : k === "palier" ? palierLigne(l) === v : k === "nature" ? l.nature === v : l.compte_id === v);
  const dansLignes = (l: Ligne, sauf?: string) => Object.entries(filtres).every(([k, v]) => k === sauf || correspondLigne(l, k, v));
  const nonLue = (l: Ligne) => l.groupe === "repondue" || l.groupe === "a_valider" || l.groupe === "a_envoyer";
  const lignesVues = lignes
    .filter((l) => dansLignes(l) && (!traiterSeul || nonLue(l)))
    .sort(
      (a, b) =>
        Number(epinglesRelances.has(b.cle)) - Number(epinglesRelances.has(a.cle)) ||
        (tri === "montant" ? (b.montant ?? 0) - (a.montant ?? 0) : tri === "debiteur" ? a.compte.localeCompare(b.compte, "fr") : 0) ||
        b.jour.localeCompare(a.jour),
    );

  const ids = vue === "debiteurs" ? debiteursVus.map((x) => x.b.compte_id) : lignesVues.map((l) => l.cle);
  const aTraiter = vue === "debiteurs" ? debiteursVus.filter((x) => x.i.nonLu).length : lignesVues.filter(nonLue).length;

  /* ↑/↓ changent d'élément, Échap le referme (hors d'un champ, d'un menu ou d'une fenêtre) */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      if (document.querySelector(".lin-menu, .dlg-panneau")) return;
      if (e.key === "Escape") {
        if (!choix && !textes) return;
        e.preventDefault();
        const u = new URLSearchParams(window.location.search);
        u.delete(cleChoix);
        u.delete("textes");
        window.history.pushState(null, "", `${window.location.pathname}?${u.toString()}`);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!ids.length) return;
        e.preventDefault();
        const i = choix ? ids.indexOf(choix) : -1;
        const j = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(ids.length - 1, i + 1)) : i < 0 ? ids.length - 1 : Math.max(0, i - 1);
        const u = new URLSearchParams(window.location.search);
        u.set(cleChoix, ids[j]);
        u.delete("textes");
        window.history.replaceState(null, "", `${window.location.pathname}?${u.toString()}`);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ids, choix, textes, cleChoix]);
  useEffect(() => {
    if (!choix) return;
    document.querySelector(".lin-boite-ligne[data-actif]")?.scrollIntoView({ block: "nearest" });
  }, [choix]);

  /* ——— la tête de la liste : filtre, affichage, et les gestes de l'écran d'avant ——— */
  const optionFiltre = (k: string, v: string, libelle: string, icone: React.ReactNode, n: number, fermer: () => void) => (
    <button
      key={`${k}:${v}`}
      type="button"
      role="menuitemcheckbox"
      aria-checked={filtres[k] === v}
      className="lin-menu-option"
      onClick={() => {
        fermer();
        basculerFiltre(k, v);
      }}
    >
      {icone}
      <span>{libelle}</span>
      <span className="lin-meta">{n}</span>
      {filtres[k] === v ? <CheckCheck width={14} height={14} aria-label="actif" /> : null}
    </button>
  );
  const paliersPresents = vue === "debiteurs" ? ORDRE_PALIERS.filter((p) => debiteurs.some((x) => x.i.palier === p)) : [...new Set(lignes.map(palierLigne).filter(Boolean))];
  const groupes = [...new Set(debiteurs.map((x) => x.b.groupe).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, "fr"));
  const comptesRelances = [...new Map(lignes.map((l) => [l.compte_id, l.compte])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const menuFiltre = (
    <Menu
      largeur={300}
      bouton={(ouvert, basculer) => (
        <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={Object.keys(filtres).length ? "" : undefined} onClick={basculer}>
          <ListFilter aria-hidden="true" />
        </button>
      )}
    >
      {(fermer) =>
        vue === "debiteurs" ? (
          <>
            <p className="c2b-menu-titre">Situation</p>
            {Object.entries(SITUATIONS).map(([v, l]) =>
              optionFiltre(
                "situation",
                v,
                l,
                v === "a_traiter" ? <Inbox width={16} height={16} aria-hidden="true" /> : <IconeStatut sante={v === "pause" ? "pause" : "retard"} />,
                debiteurs.filter((x) => correspondDebiteur(x, "situation", v) && dansDebiteurs(x, "situation")).length,
                fermer,
              ),
            )}
            {paliersPresents.length ? <p className="c2b-menu-titre">Palier atteint</p> : null}
            {paliersPresents.map((p) => optionFiltre("palier", p, libellePalier(p), <Losange atteint />, debiteurs.filter((x) => x.i.palier === p && dansDebiteurs(x, "palier")).length, fermer))}
            {groupes.length ? <p className="c2b-menu-titre">Groupe</p> : null}
            {groupes.map((g) => optionFiltre("groupe", g, g, <IconeGroupe />, debiteurs.filter((x) => x.b.groupe === g && dansDebiteurs(x, "groupe")).length, fermer))}
          </>
        ) : (
          <>
            <p className="c2b-menu-titre">État</p>
            {(Object.keys(GROUPES_RELANCE) as GroupeRelance[]).map((g) =>
              optionFiltre("etat", g, GROUPES_RELANCE[g].libelle, <IconeGroupeRelance g={g} />, lignes.filter((l) => l.groupe === g && dansLignes(l, "etat")).length, fermer),
            )}
            <p className="c2b-menu-titre">Nature</p>
            {(Object.keys(NATURES_LIGNE) as NatureLigne[]).map((n) =>
              optionFiltre("nature", n, NATURES_LIGNE[n], <IconeLigne nature={n} taille={16} />, lignes.filter((l) => l.nature === n && dansLignes(l, "nature")).length, fermer),
            )}
            {paliersPresents.length ? <p className="c2b-menu-titre">Palier</p> : null}
            {paliersPresents.map((p) => optionFiltre("palier", p, libellePalier(p), <Losange atteint />, lignes.filter((l) => palierLigne(l) === p && dansLignes(l, "palier")).length, fermer))}
            {comptesRelances.length ? <p className="c2b-menu-titre">Débiteur</p> : null}
            {comptesRelances.map(([id, nom]) => optionFiltre("debiteur", id, nom, <IconeDebiteur id={id} />, lignes.filter((l) => l.compte_id === id && dansLignes(l, "debiteur")).length, fermer))}
          </>
        )
      }
    </Menu>
  );
  const optionsTri: { cle: string; libelle: string }[] =
    vue === "debiteurs"
      ? [
          { cle: "echu", libelle: "Échu" },
          { cle: "retard", libelle: "Retard" },
          { cle: "encours", libelle: "Encours" },
          { cle: "recent", libelle: "Dernière relance" },
          { cle: "nom", libelle: "Nom" },
        ]
      : [
          { cle: "recent", libelle: "Date" },
          { cle: "montant", libelle: "Montant" },
          { cle: "debiteur", libelle: "Débiteur" },
        ];
  const menuAffichage = (
    <Menu
      bouton={(ouvert, basculer) => (
        <button type="button" className="lin-rond" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
          <SlidersHorizontal aria-hidden="true" />
        </button>
      )}
    >
      {() => (
        <div className="lin-menu-section">
          <label className="lin-reglage">
            Tri
            <Choix<string> libelle="Tri" valeur={optionsTri.some((o) => o.cle === tri) ? tri : optionsTri[0].cle} onChange={(v) => aller({ tri: v === optionsTri[0].cle ? null : v }, true)} options={optionsTri} />
          </label>
        </div>
      )}
    </Menu>
  );
  /* le « ··· » à côté du titre : tous les gestes qui étaient en boutons cerclés dans cette tête */
  const optionPreparer: Option[] =
    source === "reelle" && reel?.client
      ? [
          {
            cle: "preparer",
            libelle: "Écrire les relances du jour",
            meta: prepare ? "en cours…" : undefined,
            icone: prepare ? <Loader variant="spin" /> : <PenLine width={16} height={16} aria-hidden="true" />,
            action: () => {
              if (!prepare) void preparer();
            },
          },
        ]
      : [];
  const optionDepot: Option = { cle: "depot", libelle: "Déposer un export du facturier", icone: <FileUp width={16} height={16} aria-hidden="true" />, action: ouvrirDepot };
  const optionsListe: Option[] =
    vue === "debiteurs"
      ? [
          {
            cle: "export",
            libelle: "Exporter la balance âgée (tableur)",
            meta: pluriel(debiteursVus.length, "ligne"),
            icone: <Download width={16} height={16} aria-hidden="true" />,
            action: () =>
              exporterBalance(
                debiteursVus.map((x) => x.b),
                jourParis(),
              ),
          },
          ...optionPreparer,
          optionDepot,
        ]
      : [
          {
            cle: "export",
            libelle: "Exporter les relances (tableur)",
            icone: <Download width={16} height={16} aria-hidden="true" />,
            action: () =>
              exporterRelances(
                lignesVues.map((l) => l.r).filter((r): r is Relance => !!r),
                jourParis(),
              ),
          },
          { cle: "validations", libelle: "Ouvrir la file de validation", icone: <CheckCheck width={16} height={16} aria-hidden="true" />, href: `${RACINE}/validations` },
          { cle: "textes", libelle: "Vos textes de relance", icone: <FileText width={16} height={16} aria-hidden="true" />, coche: textes, action: () => aller({ textes: textes ? null : "1", relance: null }) },
          ...optionPreparer,
          optionDepot,
          { cle: "balance", libelle: "Exporter la balance âgée", icone: <Download width={16} height={16} aria-hidden="true" />, action: () => exporterBalance(tous, jourParis()) },
        ];

  const libelleFiltre = (k: string, v: string) =>
    k === "situation"
      ? SITUATIONS[v]
      : k === "etat"
        ? GROUPES_RELANCE[v as GroupeRelance].libelle
        : k === "nature"
          ? NATURES_LIGNE[v as NatureLigne]
          : k === "palier"
            ? libellePalier(v)
            : k === "debiteur"
              ? nomCompte(v)
              : v;
  const iconeFiltre = (k: string, v: string) =>
    k === "situation" ? (
      <IconeStatut sante={v === "pause" ? "pause" : "retard"} />
    ) : k === "etat" ? (
      <IconeGroupeRelance g={v as GroupeRelance} />
    ) : k === "nature" ? (
      <IconeLigne nature={v as NatureLigne} taille={14} />
    ) : k === "palier" ? (
      <Losange atteint />
    ) : k === "debiteur" ? (
      <IconeDebiteur id={v} />
    ) : (
      <IconeGroupe />
    );
  const puces = Object.entries(filtres).map(([k, v]) => (
    <button key={k} type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" onClick={() => basculerFiltre(k, v)}>
      {iconeFiltre(k, v)}
      {libelleFiltre(k, v)} ✕
    </button>
  ));

  /* ——— la liste ——— */
  const liste =
    vue === "debiteurs" ? (
      <ul className="lin-boite-lignes" aria-label="Débiteurs">
        {debiteursVus.map(({ b, i }) => (
          <li key={b.compte_id}>
            <Link
              href={adresse({ compte: b.compte_id })}
              className="lin-boite-ligne"
              data-actif={choix === b.compte_id ? "" : undefined}
              data-non-lu={i.nonLu ? "" : undefined}
              aria-current={choix === b.compte_id ? "true" : undefined}
              scroll={false}
              onClick={(e) => suivreLien(e, { compte: b.compte_id })}
            >
              <span className="lin-boite-sante">
                <IconeSanteLin etat={SANTE_LIGNE[santeDe(b)]} />
              </span>
              <span className="lin-boite-texte">
                <span className="lin-boite-l1">
                  {i.nonLu ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
                  <b>{b.reference}</b>
                  <span>{b.nom}</span>
                </span>
                <span className="lin-boite-l2" title={i.l2}>
                  {i.l2}
                </span>
              </span>
              <span className="lin-boite-droite">
                <IconeStatut sante={santeDe(b)} />
                <span className="lin-boite-heure" title={i.dateTitre}>
                  {jour(i.date)}
                </span>
              </span>
            </Link>
          </li>
        ))}
        <Surlignage />
      </ul>
    ) : (
      <ul className="lin-boite-lignes" aria-label="Relances">
        {lignesVues.map((l) => {
          const l2 = l.r
            ? [montant(l.r.montant), (ETATS_RELANCE[l.r.etat] ?? ETATS_RELANCE.preparee).libelle.toLowerCase(), l.groupe === "repondue" ? "réponse à trancher" : l.r.motif, l.r.destinataire_adresse]
                .filter(Boolean)
                .join(" · ")
            : [l.c ? ETATS_COMMANDE[l.c.statut].toLowerCase() : null, l.c?.destinataire_nom ?? l.c?.destinataire_adresse, l.c?.motif].filter(Boolean).join(" · ");
          return (
            <li key={l.cle}>
              <Link
                href={adresse({ relance: l.cle, textes: null })}
                className="lin-boite-ligne"
                data-actif={choix === l.cle ? "" : undefined}
                data-non-lu={nonLue(l) ? "" : undefined}
                aria-current={choix === l.cle ? "true" : undefined}
                scroll={false}
                onClick={(e) => suivreLien(e, { relance: l.cle, textes: null })}
              >
                <span className="lin-boite-sante">
                  <IconeSanteLin etat={SANTE_RELANCE[l.groupe]} />
                </span>
                <span className="lin-boite-texte">
                  <span className="lin-boite-l1">
                    {nonLue(l) ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
                    <b>{l.compte}</b>
                    <span>{l.r ? libellePalier(l.r.palier) : NATURES_LIGNE.commande}</span>
                  </span>
                  <span className="lin-boite-l2" title={l2}>
                    {l2}
                  </span>
                </span>
                <span className="lin-boite-droite">
                  <IconeGroupeRelance g={l.groupe} />
                  <span className="lin-boite-heure" title={l.r?.envoye_le ? `Partie le ${dateHeure(l.r.envoye_le)}` : `Écrite le ${jour(l.jour)}`}>
                    {jour(l.jour)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        <Surlignage />
      </ul>
    );
  const nVus = vue === "debiteurs" ? debiteursVus.length : lignesVues.length;
  const messageListe = erreur
    ? `La base réelle a répondu autrement : ${erreur}`
    : chargement
      ? "Lecture de l'encours…"
      : source === "reelle" && reel && !reel.tableau?.reglages
        ? "CASHD n'est pas encore installé pour votre organisation : Omega l'installe en mode essai, puis vous déposez le premier export de votre facturier."
        : !nVus
          ? Object.keys(filtres).length || traiterSeul
            ? "Rien dans ce filtre."
            : vue === "debiteurs"
              ? "Personne ne vous doit rien ici. Déposez l'export des factures non soldées de votre facturier pour commencer."
              : "Aucune relance. Elles s'écrivent chaque matin à 7 h pour les comptes qui ont atteint un palier."
          : null;
  const total = tableau?.totaux;

  /* ——— le détail ——— */
  const fermer = () => aller({ [cleChoix]: null, textes: null });
  /* l'étoile et « Précédent / Suivant » (les flèches ↑ ↓ du clavier, rangées dans le « ··· ») de l'élément ouvert */
  const rang = choix ? ids.indexOf(choix) : -1;
  const allerA = (id: string) => aller({ [cleChoix]: id, textes: null }, true);
  const voisins: Option[] =
    rang < 0
      ? []
      : [
          ...(rang > 0 ? [{ cle: "precedent", libelle: "Précédent", meta: "↑", icone: <ArrowUp width={16} height={16} aria-hidden="true" />, action: () => allerA(ids[rang - 1]) }] : []),
          ...(rang < ids.length - 1 ? [{ cle: "suivant", libelle: "Suivant", meta: "↓", icone: <ArrowDown width={16} height={16} aria-hidden="true" />, action: () => allerA(ids[rang + 1]) }] : []),
        ];
  const teteDe = (id: string): Tete =>
    vue === "debiteurs" ? { epingle: epinglesDebiteurs.has(id), epingler: () => epinglerDebiteur(id), voisins } : { epingle: epinglesRelances.has(id), epingler: () => epinglerRelance(id), voisins };
  /* rien d'ouvert : la tête reste, vide, pour que sa ligne traverse toute la largeur comme chez Linear */
  const detailVide = (
    <section className="lin-boite-detail" aria-label="Aucun élément ouvert">
      <header className="lin-tete" />
      <div className="lin-boite-vide">
        <Inbox aria-hidden="true" />
        <span>{chargement ? "Lecture de l'encours…" : aTraiter ? `${pluriel(aTraiter, "élément")} à traiter` : "Rien à traiter"}</span>
        {vue === "debiteurs" && total ? (
          <span className="c2b-vide-sous">
            {pluriel(nVus, "débiteur")} · {montant(total.echu)} échus sur {montant(total.encours)}
          </span>
        ) : vue === "relances" ? (
          <span className="c2b-vide-sous">{pluriel(nVus, "relance")} dans la liste</span>
        ) : null}
      </div>
    </section>
  );

  let detail: React.ReactNode = detailVide;
  if (vue === "debiteurs" && choix) {
    const fiche = ficheDe(choix);
    const b = tous.find((x) => x.compte_id === choix) ?? fiche?.balance ?? null;
    if (fiche && b) {
      const rs = relancesDe(choix);
      detail = (
        <FicheDebiteur
          key={`${source}:${choix}`}
          b={b}
          fiche={fiche}
          relances={rs}
          reponses={reponsesDe(choix)}
          vus={paliersDe(fiche, rs)}
          freres={b.groupe ? debiteurs.filter((x) => x.b.groupe === b.groupe).map((x) => x.b) : []}
          actions={actionsPour(fiche)}
          tete={teteDe(choix)}
          noter={noterEnvoi}
          aller={aller}
          fermer={fermer}
          voirRelances={(changes) => changerVue("relances", changes)}
          filtrer={(k, v) => aller({ filtre: ecrireFiltres({ ...filtres, [k]: v }) })}
        />
      );
    } else {
      const nom = b?.nom ?? fiche?.compte.nom ?? "Débiteur";
      detail = (
        <section className="lin-boite-detail" aria-label="Débiteur">
          <TeteDetail reference={b?.reference ?? "Débiteur"} nom={nom} tete={teteDe(choix)} fermer={fermer} />
          <p className="lin-vide">{echecsFiche[choix] ? `La fiche n'a pas pu être lue : ${echecsFiche[choix]}` : chargement || source === "reelle" ? "Lecture du compte…" : "Ce débiteur n'est plus dans l'encours."}</p>
        </section>
      );
    }
  } else if (vue === "relances" && textes) {
    detail = (
      <section className="lin-boite-detail" aria-label="Vos textes">
        <TeteDetail reference="Relances" nom="Vos textes" fermer={fermer} />
        <div className="c2b-textes">
          <HabilleSb>
            <Textes key={`${source}:${reel?.client?.client_id ?? ""}`} source={source} client={reel?.client?.client_id ?? null} reglages={tableau?.reglages ?? null} apresReglage={relire} gabarit="sb" />
          </HabilleSb>
        </div>
      </section>
    );
  } else if (vue === "relances" && choix) {
    const l = lignes.find((x) => x.cle === choix);
    if (!l) {
      detail = (
        <section className="lin-boite-detail" aria-label="Relance">
          <TeteDetail reference="Relances" nom="Relance" fermer={fermer} />
          <p className="lin-vide">{chargement ? "Lecture des relances…" : "Cette relance n'est plus dans la liste."}</p>
        </section>
      );
    } else {
      const fiche = ficheDe(l.compte_id);
      const b = tous.find((x) => x.compte_id === l.compte_id) ?? fiche?.balance ?? null;
      detail = (
        <FicheRelance
          key={`${source}:${l.cle}`}
          l={l}
          b={b}
          reponse={l.r ? (reponseDeRelance.get(l.r.id) ?? null) : null}
          actions={fiche ? actionsPour(fiche) : null}
          autres={relancesDe(l.compte_id).filter((r) => r.id !== l.cle)}
          suivant={prochainPalier(fiche?.suivi ?? [])}
          tete={teteDe(l.cle)}
          noter={noterEnvoi}
          aller={aller}
          fermer={fermer}
          voirDebiteur={() => changerVue("debiteurs", { compte: l.compte_id })}
          filtrer={(k, v) => aller({ filtre: ecrireFiltres({ ...filtres, [k]: v }) })}
        />
      );
    }
  }

  const fenetreDepot = (
    <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <FileUp width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>Déposer un export du facturier</DialogTitle>
          <DialogDescription>Un fichier CSV tel que votre logiciel l&apos;exporte : les colonnes sont reconnues par leur en-tête. Rien n&apos;est envoyé avant que vous ayez vu le compte des lignes.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">
              Ce que contient le fichier
              <select className="rv-champ" value={jeu} onChange={(e) => setJeu(e.target.value as Jeu)}>
                {JEUX.map((x) => (
                  <option key={x.cle} value={x.cle}>
                    {x.libelle}
                  </option>
                ))}
              </select>
            </label>
            <p className="c2-sous">{JEUX.find((x) => x.cle === jeu)?.aide}</p>
            <label className="rv-libelle">
              Fichier CSV
              <input className="rv-champ" type="file" accept=".csv,.txt,.tsv,text/csv" onChange={(e) => void lireFichier(e.target.files?.[0])} />
            </label>
            <label className="rv-libelle">
              Ou collez les lignes (en-têtes compris)
              <textarea
                className="rv-champ"
                rows={4}
                value={texte}
                onChange={(e) => {
                  setTexte(e.target.value);
                  setNomFichier("");
                }}
                placeholder="N° facture;Client;Date de facture;Échéance;Montant TTC;Reste dû"
              />
            </label>
            {JEUX.find((x) => x.cle === jeu)?.complet ? (
              <label className="c2-coche">
                <input type="checkbox" checked={complet} onChange={(e) => setComplet(e.target.checked)} />
                <span>Ce fichier liste toutes les pièces encore ouvertes : celles qui n&apos;y sont plus sont soldées.</span>
              </label>
            ) : null}
            {lecture ? (
              lecture.manque.length || lecture.sansClient ? (
                <Avis teinte="ambre">
                  Colonnes introuvables : {[...lecture.manque.map((k) => LIBELLES_CHAMPS[k] ?? k), ...(lecture.sansClient ? ["client (code ou nom)"] : [])].join(", ")}. Vérifiez la première ligne du fichier.
                </Avis>
              ) : (
                <Avis teinte="vert" role="status">
                  {pluriel(lecture.lignes.length, "ligne")} lue{lecture.lignes.length > 1 ? "s" : ""} ; colonnes reconnues : {lecture.reconnues.map((x) => x.entete).join(", ")}.
                  {lecture.ignorees.length ? ` Ignorées : ${lecture.ignorees.join(", ")}.` : ""}
                </Avis>
              )
            ) : null}
            {erreurDepot ? (
              <Avis teinte="rouge" role="alert">
                {erreurDepot}
              </Avis>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!lecture || !!lecture.manque.length || lecture.sansClient || !lecture.lignes.length || envoiDepot} onClick={deposer}>
            {envoiDepot ? <Loader variant="spin" /> : null} Déposer {lecture?.lignes.length ? pluriel(lecture.lignes.length, "ligne") : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">{vue === "debiteurs" ? "Débiteurs" : "Relances"}</h1>
      <div className="lin-boite">
        <section className="lin-boite-liste" aria-label={vue === "debiteurs" ? "Débiteurs" : "Relances"}>
          <header className="lin-tete">
            <span className="lin-tete-titre">{vue === "debiteurs" ? "Débiteurs" : "Relances"}</span>
            <MenuActions rond aGauche titre="Actions de la liste" options={optionsListe} />
            <div className="lin-tete-ronds">
              <button type="button" className="lin-rond" aria-pressed={traiterSeul} aria-label="Seulement ce qui est à traiter" title="Seulement ce qui est à traiter" onClick={basculerTraiter}>
                <IconeNonLus />
              </button>
              {menuFiltre}
              {menuAffichage}
            </div>
          </header>
          {/* les deux vues de la page, en onglets : le menu de gauche n'a plus qu'une entrée « Débiteurs et
              relances », pour que la troisième entrée de CASHD soit le tableau des envois comme ailleurs (28/10) */}
          <div className="lin-outils">
            <nav className="lin-onglets" aria-label="Vues et filtres">
              {(
                [
                  ["debiteurs", "Débiteurs"],
                  ["relances", "Relances"],
                ] as const
              ).map(([cle, lib]) => (
                <button key={cle} type="button" className="v2-btn v2-btn--petit" data-actif={vue === cle ? "" : undefined} aria-pressed={vue === cle} onClick={() => vue !== cle && changerVue(cle)}>
                  {lib}
                </button>
              ))}
              {puces}
            </nav>
            {essai ? (
              <div className="lin-outils-droite">
                <span className="lin-meta" title="Les relances validées partent vers l'adresse d'essai d'Omega, jamais chez vos clients, tant que le gérant n'a pas basculé en réel.">
                  Mode essai
                </span>
              </div>
            ) : null}
          </div>
          {messageListe ? <p className="c2b-message">{messageListe}</p> : null}
          {liste}
        </section>
        {detail}
      </div>
      {fenetreDepot}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   La page d'un débiteur, à droite : la page d'un projet de Linear, et les
   gestes de la fiche d'avant (FicheCompte), chacun dans sa fenêtre.
   ══════════════════════════════════════════════════════════════════════ */

type Geste =
  | { type: "reglement"; facture: Piece | null }
  | { type: "statut"; vers: StatutCompte }
  | { type: "litige"; facture: Piece; ouvrir: boolean }
  | { type: "echeancier"; facture: Piece }
  | { type: "conteste"; facture: Piece }
  | { type: "plafond"; propose: number | null; base: string }
  | { type: "commande"; facture: Piece }
  | { type: "bon_recu"; facture: Piece }
  | { type: "solde"; facture: Piece }
  | { type: "accord"; devis: Piece }
  | { type: "piece" };

const LECTURES: Record<ReponseLue["lecture"], string> = { contestation: "Contestation", absence: "Contact parti", promesse: "Règlement annoncé", autre: "Réponse" };
const PROPOSITIONS: Record<ReponseLue["proposition"], string> = {
  litige: "mettre les factures de la relance en litige",
  attente_contact: "mettre le compte en attente d'un nouveau contact",
  pause: "mettre le compte en pause le temps du règlement",
  aucune: "rien : lisez-la",
};
const NATURES: { cle: NaturePiece; libelle: string }[] = [
  { cle: "facture_pdf", libelle: "PDF de la facture" },
  { cle: "bon_livraison", libelle: "Bon de livraison" },
  { cle: "bon_commande", libelle: "Bon de commande" },
  { cle: "contrat", libelle: "Contrat" },
  { cle: "autre", libelle: "Autre pièce" },
];
const MODES = [
  { cle: "virement", libelle: "Virement" },
  { cle: "cheque", libelle: "Chèque" },
  { cle: "prelevement", libelle: "Prélèvement" },
  { cle: "carte", libelle: "Carte" },
  { cle: "especes", libelle: "Espèces" },
  { cle: "autre", libelle: "Autre" },
];
const ADRESSE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const nombre = (t: string) => Number(t.replace(/[\s  €]/g, "").replace(",", "."));
/* un échéancier proposé : le reste dû en n mensualités, la première dans 7 jours */
function echeancesProposees(reste: number, n: number): { echeance: string; montant: string }[] {
  const base = Math.floor((reste / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${jourParis()}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    d.setUTCMonth(d.getUTCMonth() + i);
    const m = i === n - 1 ? Math.round((reste - base * (n - 1)) * 100) / 100 : base;
    return { echeance: d.toISOString().slice(0, 10), montant: m.toFixed(2).replace(".", ",") };
  });
}
/* l'état de relance d'une pièce, en une ligne (la colonne « Relance » de la fiche d'avant) */
function etatPieceTexte(p: Piece, s: Suivi | undefined) {
  const morceaux: string[] = [];
  if (p.nature === "devis") morceaux.push(`devis · ${p.jours_ecoules} j sans réponse`);
  else if (p.nature === "avoir") morceaux.push(`avoir${p.facture_visee ? ` sur ${p.facture_visee}` : ""}`);
  if (p.retard_jours > 0) morceaux.push(`${p.retard_jours} j de retard`);
  if (p.echeance_origine) morceaux.push(`échéancier (au lieu du ${jour(p.echeance_origine)})`);
  if (p.montant_conteste) morceaux.push(`dont ${montant(p.montant_conteste)} contestés`);
  if (p.relance_suspendue) morceaux.push(`relance suspendue : ${p.relance_suspendue}`);
  else if (p.attente_commande_le) morceaux.push(`attend un bon de commande depuis le ${jour(p.attente_commande_le)} (relance à ${p.attente_commande_nom ?? p.attente_commande_email})`);
  else if (p.solde_decision) morceaux.push(p.solde_decision === "abandonne" ? "solde abandonné" : "solde réclamé");
  else if (p.accord_oral_le) morceaux.push(`accepté de vive voix le ${jour(p.accord_oral_le)}`);
  else if (p.statut === "litige") morceaux.push("en litige");
  else if (s) morceaux.push(`${libelleSequence(s)}${s.palier_suivant ? ` ; suivant : ${libellePalier(s.palier_suivant).toLowerCase()} le ${jour(s.palier_suivant_le)}` : ""}`);
  return morceaux.join(" · ");
}

/* ——— la page d'un élément, sur la page d'un ticket de Linear : le fil d'activité ———
   Une entrée : son icône (14), une phrase en 12 gris, sa date ; une décision en attente
   (réponse à trancher, relance à valider ou à envoyer) porte son texte et ses boutons. */
type Entree = { cle: string; le: string | null; icone: React.ReactNode; contenu: React.ReactNode; texte?: React.ReactNode; actions?: React.ReactNode; attente?: boolean };
const LIMITE_FIL = 8;
function Fil({ entrees, vide }: { entrees: Entree[]; vide: string }) {
  const [tout, setTout] = useState(false);
  const debut = tout ? 0 : Math.max(0, entrees.length - LIMITE_FIL);
  const vues = entrees.filter((e, i) => i >= debut || e.attente);
  const cachees = entrees.length - vues.length;
  return (
    <ul className="lin-ticket-fil">
      {cachees > 0 ? (
        <li>
          <MoreHorizontal width={14} height={14} aria-hidden="true" />
          <span>
            <FilLien onClick={() => setTout(true)}>
              Voir {pluriel(cachees, "entrée")} plus ancienne{cachees > 1 ? "s" : ""}
            </FilLien>
          </span>
        </li>
      ) : null}
      {vues.length ? (
        vues.map((e) => (
          <li key={e.cle} data-attente={e.attente ? "" : undefined}>
            {e.icone}
            <div className="c2b-fil-corps">
              <span>
                {e.contenu}
                {e.le ? ` · ${jour(e.le)}` : ""}
              </span>
              {e.texte ? <span className="lin-ticket-fil-texte">{e.texte}</span> : null}
              {e.actions ? <div className="lin-ticket-fil-actions">{e.actions}</div> : null}
            </div>
          </li>
        ))
      ) : (
        <li>
          <Inbox width={14} height={14} aria-hidden="true" />
          <span>{vide}</span>
        </li>
      )}
    </ul>
  );
}
function FilLien({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="c2b-fil-lien" onClick={onClick}>
      {children}
    </button>
  );
}
const court = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

function FicheDebiteur({
  b,
  fiche,
  relances,
  reponses,
  vus,
  freres,
  actions,
  tete,
  noter,
  aller,
  fermer,
  voirRelances,
  filtrer,
}: {
  b: Balance;
  fiche: Fiche;
  relances: Relance[];
  reponses: ReponseLue[];
  vus: Map<string, string | null>;
  freres: Balance[];
  actions: Actions;
  tete: Tete;
  noter: (r: Relance, canal: string) => Promise<void>;
  aller: Aller;
  fermer: () => void;
  voirRelances: (changes: Record<string, string | null>) => void;
  filtrer: (k: string, v: string) => void;
}) {
  const toast = useToast();
  const c = fiche.compte;
  const s = santeDe({ ...b, statut: c.statut });
  const pieces = fiche.pieces.map((p) => etatPiece(p)).sort((x, y) => Number(y.reste_du > 0) - Number(x.reste_du > 0) || (x.echeance ?? "").localeCompare(y.echeance ?? ""));
  const suiviDe = (id: string) => fiche.suivi.find((x) => x.facture_id === id);
  const derniere = relances[0] ?? null;
  const contact = c.contact_facturation_email;
  const facturesJoignables = fiche.pieces.filter((p) => p.nature === "facture" || p.nature === "acompte");
  const numero = (id: string) => fiche.pieces.find((p) => p.id === id)?.numero ?? "—";
  const plusAncienne = pieces.find((p) => (p.nature === "facture" || p.nature === "acompte") && p.statut === "ouverte" && p.reste_du > 0 && p.retard_jours > 0) ?? null;

  /* ——— les gestes (repris de FicheCompte) ——— */
  const [geste, setGeste] = useState<Geste | null>(null);
  const [motif, setMotif] = useState("");
  const [f, setF] = useState({ montant: "", date: jourParis(), reference: "", mode: "virement" });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lignesEch, setLignesEch] = useState<{ echeance: string; montant: string }[]>([]);
  const [plafond, setPlafond] = useState("");
  const [telecharge, setTelecharge] = useState(false);
  const [service, setService] = useState({ email: "", nom: "" });
  const [decision, setDecision] = useState<"abandonne" | "reclame" | "">("abandonne");
  const [accordLe, setAccordLe] = useState(jourParis());
  const [jointe, setJointe] = useState<{ facture: string; nature: NaturePiece; fichier: File | null }>({ facture: "", nature: "facture_pdf", fichier: null });
  const [tranche, setTranche] = useState<string | null>(null);
  const trancher = async (x: ReponseLue, accepter: boolean) => {
    setTranche(x.id);
    try {
      toast(`C'est fait. ${await actions.trancherReponse(x, accepter)}`, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé.", "rouge");
    } finally {
      setTranche(null);
    }
  };
  const ouvrir = (g: Geste) => {
    setErreur(null);
    setMotif("");
    setF({ montant: g.type === "reglement" && g.facture ? String(g.facture.reste_du) : "", date: jourParis(), reference: "", mode: "virement" });
    if (g.type === "echeancier") setLignesEch(echeancesProposees(g.facture.reste_du, 3));
    if (g.type === "plafond") setPlafond(g.propose !== null ? String(g.propose) : c.plafond_encours !== null ? String(c.plafond_encours) : "");
    if (g.type === "commande") setService({ email: g.facture.attente_commande_email ?? "", nom: g.facture.attente_commande_nom ?? "" });
    if (g.type === "solde") setDecision(g.facture.solde_decision === "abandonne" ? "reclame" : "abandonne");
    if (g.type === "accord") setAccordLe(jourParis());
    if (g.type === "piece") setJointe({ facture: facturesJoignables[0]?.id ?? "", nature: "facture_pdf", fichier: null });
    setGeste(g);
  };
  const ouvrirPlafond = async () => {
    try {
      const p = await actions.proposerPlafond();
      ouvrir({ type: "plafond", propose: p.propose, base: p.base });
    } catch (e) {
      toast(e instanceof Error ? e.message : "La proposition n'a pas pu être lue.", "rouge");
    }
  };
  const telecharger = async (m: "litige" | "assurance_credit" = "litige") => {
    setTelecharge(true);
    try {
      await actions.dossier(m);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Le dossier n'a pas pu être constitué.", "rouge");
    } finally {
      setTelecharge(false);
    }
  };
  const totalEch = Math.round(lignesEch.reduce((t, l) => t + (nombre(l.montant) || 0), 0) * 100) / 100;
  const valeurMontant = Number(f.montant.replace(/\s/g, "").replace(",", "."));
  const pret =
    geste?.type === "reglement"
      ? Number.isFinite(valeurMontant) && valeurMontant > 0 && f.date <= jourParis()
      : geste?.type === "echeancier"
        ? motif.trim().length > 2 && lignesEch.length > 0 && Math.abs(totalEch - geste.facture.reste_du) < 0.005 && lignesEch.every((l, i) => l.echeance && (i === 0 || l.echeance > lignesEch[i - 1].echeance))
        : geste?.type === "conteste"
          ? motif.trim().length > 2 && valeurMontant > 0 && valeurMontant < geste.facture.reste_du
          : geste?.type === "plafond"
            ? motif.trim().length > 2 && (plafond.trim() === "" || nombre(plafond) >= 0)
            : geste?.type === "commande"
              ? ADRESSE.test(service.email.trim()) && motif.trim().length > 2
              : geste?.type === "bon_recu"
                ? true
                : geste?.type === "piece"
                  ? !!jointe.facture && !!jointe.fichier
                  : geste?.type === "accord"
                    ? motif.trim().length > 2 && accordLe >= geste.devis.date_emission && accordLe <= jourParis()
                    : motif.trim().length > 2;
  const valider = async () => {
    if (!geste) return;
    setEnvoi(true);
    setErreur(null);
    try {
      let msg = "";
      if (geste.type === "reglement") msg = await actions.noterReglement({ montant: valeurMontant, date: f.date, reference: f.reference.trim() || null, mode: f.mode, facture: geste.facture?.id ?? null });
      else if (geste.type === "statut") msg = await actions.changerStatut(geste.vers, motif.trim());
      else if (geste.type === "echeancier")
        msg = await actions.echeancier(
          geste.facture.id,
          lignesEch.map((l) => ({ echeance: l.echeance, montant: nombre(l.montant) })),
          motif.trim(),
        );
      else if (geste.type === "conteste") msg = await actions.contester(geste.facture.id, valeurMontant, motif.trim());
      else if (geste.type === "plafond") msg = await actions.fixerPlafond(plafond.trim() === "" ? null : nombre(plafond), motif.trim());
      else if (geste.type === "commande") msg = await actions.attendreCommande(geste.facture.id, service.email.trim(), service.nom.trim() || null, motif.trim());
      else if (geste.type === "bon_recu") msg = await actions.attendreCommande(geste.facture.id, null, null, null);
      else if (geste.type === "solde") msg = await actions.deciderSolde(geste.facture.id, decision || null, motif.trim());
      else if (geste.type === "piece") {
        if (!jointe.fichier) return;
        msg = await actions.joindrePiece(jointe.facture, jointe.nature, jointe.fichier);
      } else if (geste.type === "accord") msg = await actions.consignerAccord(geste.devis.id, motif.trim(), accordLe);
      else msg = await actions.litige(geste.facture.id, geste.ouvrir, motif.trim());
      toast(`C'est fait. ${msg}`, "vert");
      setGeste(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— les options des pastilles ——— */
  const optionsStatut: Option[] = STATUTS.map((x) => ({
    cle: x.cle,
    libelle: STATUTS_COMPTE[x.cle].libelle,
    meta: x.aide,
    icone: <IconeStatut sante={santeStatut(x.cle, b)} />,
    coche: c.statut === x.cle,
    action: () => {
      if (x.cle !== c.statut) ouvrir({ type: "statut", vers: x.cle });
    },
  }));
  const optionsRetard: Option[] = [
    { cle: "echu", libelle: "Comptes en retard", icone: <IconeStatut sante="retard" />, action: () => filtrer("situation", "echu") },
    { cle: "plus_90", libelle: "Retards de plus de 90 jours", icone: <IconePriorite niveau={4} titre="Plus de 90 jours" />, action: () => filtrer("situation", "plus_90") },
  ];
  const optionsEcheance: Option[] = [
    { cle: "reglement", libelle: "Noter un règlement", icone: <Banknote width={16} height={16} />, action: () => ouvrir({ type: "reglement", facture: null }) },
    ...(plusAncienne
      ? [{ cle: "echeancier", libelle: `Échéancier sur ${plusAncienne.numero}`, icone: <CalendarRange width={16} height={16} />, action: () => ouvrir({ type: "echeancier", facture: plusAncienne }) }]
      : []),
    { cle: "factures", libelle: "Voir les factures", icone: <IconeDocument />, action: () => document.getElementById("c2b-factures")?.scrollIntoView({ behavior: "smooth", block: "start" }) },
  ];
  const optionsGroupe: Option[] = b.groupe
    ? [
        ...freres.map((x) => ({
          cle: x.compte_id,
          libelle: x.nom,
          meta: montant(x.encours, x.devise),
          icone: <IconeDebiteur id={x.compte_id} />,
          coche: x.compte_id === b.compte_id,
          action: () => aller({ compte: x.compte_id }),
        })),
        { cle: "-groupe", libelle: "Tous les débiteurs du groupe", icone: <IconeGroupe />, action: () => filtrer("groupe", b.groupe as string) },
      ]
    : [];
  const optionsContact: Option[] = contact
    ? [
        { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${contact}`) },
        { cle: "copier", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => copier(contact) },
      ]
    : [];
  const gestesPiece = (p: Piece): Option[] => {
    const facture = p.nature === "facture" || p.nature === "acompte";
    if (facture && p.statut === "ouverte" && p.reste_du > 0)
      return [
        { cle: "reglement", libelle: "Noter un règlement", icone: <Banknote width={16} height={16} />, action: () => ouvrir({ type: "reglement", facture: p }) },
        { cle: "echeancier", libelle: "Échéancier", icone: <CalendarRange width={16} height={16} />, action: () => ouvrir({ type: "echeancier", facture: p }) },
        { cle: "conteste", libelle: "Contestation partielle", icone: <Scale width={16} height={16} />, action: () => ouvrir({ type: "conteste", facture: p }) },
        { cle: "litige", libelle: "Mettre en litige", icone: <Scale width={16} height={16} />, action: () => ouvrir({ type: "litige", facture: p, ouvrir: true }) },
        p.attente_commande_le
          ? { cle: "bon_recu", libelle: "Bon de commande reçu", icone: <ClipboardList width={16} height={16} />, action: () => ouvrir({ type: "bon_recu", facture: p }) }
          : { cle: "commande", libelle: "Attend un bon de commande", icone: <ClipboardList width={16} height={16} />, action: () => ouvrir({ type: "commande", facture: p }) },
        { cle: "solde", libelle: "Décider du solde", icone: <Scissors width={16} height={16} />, action: () => ouvrir({ type: "solde", facture: p }) },
        { cle: "piece", libelle: "Joindre une pièce", icone: <Paperclip width={16} height={16} />, action: () => ouvrir({ type: "piece" }) },
      ];
    if (p.nature === "devis" && p.statut === "en_attente") return [{ cle: "accord", libelle: "Accord de vive voix", icone: <Handshake width={16} height={16} />, action: () => ouvrir({ type: "accord", devis: p }) }];
    if (facture && p.statut === "litige") return [{ cle: "clore", libelle: "Clore le litige", icone: <Scale width={16} height={16} />, action: () => ouvrir({ type: "litige", facture: p, ouvrir: false }) }];
    return [];
  };
  const relanceDe = (id: string) => relances.find((r) => r.id === id) ?? relances.find((r) => r.demande_id === id) ?? null;
  const palier = dernierPalier(vus);
  /* la pilule du palier : les gestes de l'ancienne carte « Paliers », pour chacun des quatre */
  const optionsPaliers: Option[] = [
    ...ORDRE_PALIERS.map((p) => ({
      cle: `r-${p}`,
      libelle: `Ses relances : ${libellePalier(p).toLowerCase()}`,
      meta: vus.has(p) ? jour(vus.get(p) ?? null) : "pas atteint",
      icone: <Losange atteint={vus.has(p)} />,
      coche: p === palier,
      action: () => voirRelances({ filtre: `debiteur:${encodeURIComponent(c.id)},palier:${p}` }),
    })),
    ...ORDRE_PALIERS.map((p) => ({ cle: `d-${p}`, libelle: `Débiteurs au palier ${libellePalier(p).toLowerCase()}`, icone: <Losange atteint />, action: () => filtrer("palier", p) })),
  ];
  /* la prochaine chose à faire pour ce débiteur : la sous-pilule de « Relances » */
  const aValider = relances.find((r) => groupeDe(r, false) === "a_valider") ?? null;
  const aPartir = relances.find(aEnvoyer) ?? null;
  const suivant = prochainPalier(fiche.suivi);
  const etape: { libelle: string; relance?: string; vide?: boolean } = reponses.length
    ? { libelle: `${pluriel(reponses.length, "réponse")} à trancher`, relance: relanceDe(reponses[0].relance_id)?.id ?? reponses[0].relance_id }
    : aValider
      ? { libelle: `${libellePalier(aValider.palier)} à valider`, relance: aValider.id }
      : aPartir
        ? { libelle: `${libellePalier(aPartir.palier)} à envoyer`, relance: aPartir.id }
        : c.statut !== "actif"
          ? { libelle: `Aucune relance : ${STATUTS_COMPTE[c.statut].libelle.toLowerCase()}`, vide: true }
          : suivant
            ? { libelle: `${libellePalier(suivant.palier_suivant)} le ${jour(suivant.palier_suivant_le)}` }
            : { libelle: "Aucune étape prévue", vide: true };
  /* deux phrases au plus : ce qu'il doit, et pourquoi il est hors cycle s'il l'est */
  const depasse = b.depasse_plafond || (c.plafond_encours !== null && b.encours > c.plafond_encours);
  const description = [
    b.echu <= 0
      ? `Doit ${montant(b.encours, b.devise)}, rien n'est encore échu.`
      : b.echu >= b.encours - 0.005
        ? `Doit ${montant(b.encours, b.devise)}, tout est échu.`
        : `Doit ${montant(b.encours, b.devise)}, dont ${montant(b.echu, b.devise)} échus.`,
    c.statut !== "actif"
      ? `${STATUTS_COMPTE[c.statut].libelle}${c.statut_motif ? ` : ${court(c.statut_motif, 70)}` : ""}.`
      : b.en_litige > 0
        ? `${montant(b.en_litige, b.devise)} en litige.`
        : depasse
          ? "L'encours dépasse le plafond accordé."
          : "",
  ]
    .filter(Boolean)
    .join(" ");
  /* les factures : cinq, puis « Voir les N » ; un reste dû égal à l'encours ou à l'échu est déjà dans la description */
  const [toutesFactures, setToutesFactures] = useState(false);
  const dejaDit = (v: number) => Math.abs(v - b.encours) < 0.005 || (b.echu > 0 && Math.abs(v - b.echu) < 0.005);
  const facturesVues = toutesFactures ? pieces : pieces.slice(0, 5);
  /* le fil : les relances, les réponses à trancher, les règlements, les pièces jointes, le statut */
  const lienRelance = (r: Relance) => <FilLien onClick={() => voirRelances({ relance: r.id })}>{libellePalier(r.palier)}</FilLien>;
  const entrees: Entree[] = [
    ...relances.map((r): Entree => {
      if (r.envoye_le)
        return {
          cle: r.id,
          le: r.envoye_le,
          icone: <Send width={14} height={14} aria-hidden="true" />,
          contenu: r.envoi_main ? (
            <>
              <b>Envoyée à la main</b> : {lienRelance(r)} ({CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal})
            </>
          ) : (
            <>
              <b>CASHD</b> a envoyé {lienRelance(r)} ({canalDe(r)})
            </>
          ),
        };
      if (groupeDe(r, false) === "a_valider")
        return {
          cle: r.id,
          le: r.jour,
          attente: true,
          icone: <PenLine width={14} height={14} aria-hidden="true" />,
          contenu: (
            <>
              <b>CASHD</b> a écrit {lienRelance(r)}, à valider
            </>
          ),
          actions: (
            <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--petit">
              <CheckCheck width={14} height={14} aria-hidden="true" />
              <span>Ouvrir la file de validation</span>
            </Link>
          ),
        };
      if (aEnvoyer(r))
        return {
          cle: r.id,
          le: r.jour,
          attente: true,
          icone: <CheckCheck width={14} height={14} aria-hidden="true" />,
          contenu: (
            <>
              <b>Validée</b> : {lienRelance(r)}, à envoyer
            </>
          ),
          actions: <EnvoiMain relance={r} noter={noter} />,
        };
      return {
        cle: r.id,
        le: r.jour,
        icone: <X width={14} height={14} aria-hidden="true" />,
        contenu: (
          <>
            <b>{(ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee).libelle}</b> : {lienRelance(r)}
            {r.motif ? `, ${r.motif}` : ""}
          </>
        ),
      };
    }),
    ...reponses.map((x): Entree => {
      const r = relanceDe(x.relance_id);
      return {
        cle: x.id,
        le: x.cree_le,
        attente: true,
        icone: <IconeSante sante={x.lecture === "contestation" ? "litige" : x.lecture === "promesse" ? "a_jour" : "retard"} />,
        contenu: (
          <>
            <b>Réponse reçue</b> à <FilLien onClick={() => voirRelances({ relance: r?.id ?? x.relance_id })}>{r ? libellePalier(r.palier) : "la relance"}</FilLien>
            {x.lecture !== "autre" ? ` : ${LECTURES[x.lecture].toLowerCase()}` : ""}
          </>
        ),
        texte: (
          <>
            {x.indice ? `« ${x.indice} » — ` : ""}Proposé : {PROPOSITIONS[x.proposition]}.
          </>
        ),
        actions: (
          <>
            {x.proposition !== "aucune" ? (
              <button type="button" className="v2-btn v2-btn--petit" disabled={tranche === x.id} onClick={() => void trancher(x, true)}>
                {tranche === x.id ? <Loader variant="spin" /> : <CheckCheck width={14} height={14} aria-hidden="true" />}
                <span>Accepter</span>
              </button>
            ) : null}
            <button type="button" className="v2-btn v2-btn--petit" disabled={tranche === x.id} onClick={() => void trancher(x, false)}>
              <span>{x.proposition === "aucune" ? "Lue" : "Écarter"}</span>
            </button>
          </>
        ),
      };
    }),
    ...fiche.reglements.map((r): Entree => ({
      cle: r.id,
      le: r.recu_le,
      icone: <Banknote width={14} height={14} aria-hidden="true" />,
      contenu: (
        <>
          <b>Règlement</b> de {montant(r.montant)} ({r.reference ?? r.libelle ?? MODES.find((m) => m.cle === r.mode)?.libelle ?? "sans référence"}),{" "}
          {r.statut === "annule" ? "annulé" : r.a_imputer > 0 ? `${montant(r.a_imputer)} à rapprocher` : "lettré"}
        </>
      ),
    })),
    ...(fiche.pieces_jointes ?? []).map((x): Entree => ({
      cle: x.id,
      le: x.cree_le,
      icone: <Paperclip width={14} height={14} aria-hidden="true" />,
      contenu: (
        <>
          <b>Pièce jointe</b> à {numero(x.facture_id)} : {NATURES.find((n) => n.cle === x.nature)?.libelle} ({x.nom})
        </>
      ),
    })),
    ...(c.statut_le
      ? [
          {
            cle: "statut",
            le: c.statut_le,
            icone: <IconeStatut sante={s} />,
            contenu: (
              <>
                Compte passé à <b>« {STATUTS_COMPTE[c.statut].libelle} »</b>
              </>
            ),
          },
        ]
      : []),
  ].sort((x, y) => (x.le ?? "").localeCompare(y.le ?? ""));

  /* le « ··· » de la tête : les boutons cerclés d'avant (règlement, copier la référence) et les gestes du compte */
  const optionsTete: Option[] = [
    { cle: "reglement", libelle: "Noter un règlement", icone: <Banknote width={16} height={16} aria-hidden="true" />, action: () => ouvrir({ type: "reglement", facture: null }) },
    {
      cle: "copier",
      libelle: "Copier la référence",
      meta: c.reference,
      icone: <Copy width={16} height={16} aria-hidden="true" />,
      action: () => {
        copier(c.reference);
        toast(`Référence copiée : ${c.reference}.`, "vert");
      },
    },
    {
      cle: "plafond",
      libelle: c.plafond_encours !== null ? `Plafond d'encours : ${montant(c.plafond_encours, b.devise)}…` : "Fixer un plafond d'encours…",
      icone: <Gauge width={16} height={16} aria-hidden="true" />,
      action: () => void ouvrirPlafond(),
    },
    c.statut === "actif"
      ? { cle: "pause", libelle: "Mettre en pause", icone: <PauseCircle width={16} height={16} aria-hidden="true" />, action: () => ouvrir({ type: "statut", vers: "pause" }) }
      : { cle: "reprendre", libelle: "Reprendre les relances", icone: <PlayCircle width={16} height={16} aria-hidden="true" />, action: () => ouvrir({ type: "statut", vers: "actif" }) },
    ...(facturesJoignables.length ? [{ cle: "piece", libelle: "Joindre une pièce", icone: <Paperclip width={16} height={16} aria-hidden="true" />, action: () => ouvrir({ type: "piece" }) }] : []),
    {
      cle: "dossier",
      libelle: "Télécharger le dossier",
      meta: telecharge ? "en cours…" : undefined,
      icone: <FileDown width={16} height={16} aria-hidden="true" />,
      action: () => {
        if (!telecharge) void telecharger();
      },
    },
    {
      cle: "assurance",
      libelle: "Dossier d'assurance-crédit",
      meta: telecharge ? "en cours…" : undefined,
      icone: <FileDown width={16} height={16} aria-hidden="true" />,
      action: () => {
        if (!telecharge) void telecharger("assurance_credit");
      },
    },
    { cle: "relances", libelle: "Voir ses relances", icone: <MessageSquare width={16} height={16} aria-hidden="true" />, action: () => voirRelances({ filtre: `debiteur:${encodeURIComponent(c.id)}` }) },
    ...(derniere?.corps
      ? [{ cle: "copier-relance", libelle: "Copier la dernière relance", icone: <Copy width={16} height={16} aria-hidden="true" />, action: () => copier(`${derniere.sujet ?? ""}\n\n${derniere.corps ?? ""}`) }]
      : []),
  ];

  return (
    <section className="lin-boite-detail" aria-label={`Débiteur ${c.nom}`}>
      <TeteDetail reference={c.reference} nom={c.nom} tete={tete} actions={optionsTete} dates={{ titre: "Échéance…", options: optionsEcheance }} activite fermer={fermer} />

      <div className="lin-ticket">
        <article className="lin-ticket-corps">
          <h2 className="lin-ticket-titre">{c.nom}</h2>
          <p className="lin-ticket-desc">{description}</p>
          <div className="lin-ticket-icones">
            <button type="button" className="lin-ticket-icone" aria-label="Noter un règlement" title="Noter un règlement" onClick={() => ouvrir({ type: "reglement", facture: null })}>
              <Banknote aria-hidden="true" />
            </button>
            {facturesJoignables.length ? (
              <button type="button" className="lin-ticket-icone" aria-label="Joindre une pièce" title="Joindre une pièce" onClick={() => ouvrir({ type: "piece" })}>
                <Paperclip aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="lin-ticket-icone"
              aria-label="Copier la référence"
              title={`Copier la référence (${c.reference})`}
              onClick={() => {
                copier(c.reference);
                toast(`Référence copiée : ${c.reference}.`, "vert");
              }}
            >
              <Copy aria-hidden="true" />
            </button>
          </div>

          {pieces.length ? (
            <ul className="lin-ticket-sous" id="c2b-factures" aria-label="Factures">
              {facturesVues.map((p) => {
                const texte = etatPieceTexte(p, suiviDe(p.id));
                const gestes = gestesPiece(p);
                const soldee = p.reste_du <= 0 && p.nature !== "devis";
                const du =
                  p.nature === "devis"
                    ? montant(p.montant_ttc)
                    : soldee
                      ? "Soldée"
                      : !dejaDit(p.reste_du)
                        ? `${montant(p.reste_du, p.devise ?? "EUR")}${p.devise && p.devise !== "EUR" && p.reste_du_eur !== null && p.reste_du_eur !== undefined ? ` (${montant(p.reste_du_eur)})` : ""}`
                        : null;
                return (
                  <li key={p.id}>
                    <div className="lin-ticket-sous-ligne" data-solde={soldee ? "" : undefined} title={`${p.numero}${texte ? ` · ${texte}` : ""}`}>
                      <IconeDocument />
                      <span className="lin-ticket-sous-ref">{p.numero}</span>
                      <span className="lin-ticket-sous-nom">{texte}</span>
                      <span className="lin-ticket-sous-meta">{[du, jour(p.echeance ?? p.date_emission)].filter(Boolean).join(" · ")}</span>
                      {gestes.length ? <MenuActions titre={`${p.numero}…`} options={gestes} /> : null}
                    </div>
                  </li>
                );
              })}
              {pieces.length > 5 ? (
                <li>
                  <button type="button" className="lin-ticket-sous-appel" aria-expanded={toutesFactures} onClick={() => setToutesFactures((v) => !v)}>
                    {toutesFactures ? "Voir moins" : `Voir les ${pieces.length} pièces`}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="c2b-sous-vide">Aucune pièce : les factures du compte arrivent avec l&apos;export du facturier.</p>
          )}

          <hr className="lin-ticket-trait" />
          <div className="lin-ticket-activite-tete" id="c2b-activite">
            <h3>Activité</h3>
            <button type="button" className="lin-ticket-lien" onClick={() => voirRelances({ filtre: `debiteur:${encodeURIComponent(c.id)}` })}>
              Ses relances
            </button>
          </div>
          <Fil entrees={entrees} vide="Aucune relance ni aucun règlement pour l'instant. Les relances s'écrivent chaque matin et ne partent qu'avec votre accord." />
        </article>

        <aside className="lin-ticket-cote" aria-label="Propriétés du débiteur">
          <section className="lin-ticket-section">
            <h3>Propriétés</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                raccourci="s"
                titre="Changer le statut…"
                teinte={SANTES[s].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={s} />
                    {STATUTS_COMPTE[c.statut].libelle}
                  </>
                }
                options={optionsStatut}
                largeur={300}
              />
              <MenuOptions
                raccourci="r"
                titre="Débiteurs en retard…"
                declencheur={
                  <>
                    <IconePriorite niveau={niveauDe(b.retard_max_jours)} titre={retardDe(b.retard_max_jours)} />
                    {retardDe(b.retard_max_jours)}
                  </>
                }
                options={optionsRetard}
                largeur={280}
              />
              <MenuOptions
                raccourci="e"
                titre="Échéance…"
                declencheur={
                  <>
                    <IconeCalendrier passe={b.echu > 0} />
                    {b.plus_ancienne_echeance ? `Échéance du ${jour(b.plus_ancienne_echeance)}` : "Rien d'échu"}
                  </>
                }
                options={optionsEcheance}
                largeur={280}
              />
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Étiquettes</h3>
            <div className="lin-ticket-pilules">
              {b.groupe ? (
                <MenuOptions
                  titre="Débiteurs du groupe…"
                  declencheur={
                    <>
                      <IconeGroupe />
                      {b.groupe}
                    </>
                  }
                  options={optionsGroupe}
                />
              ) : (
                <span className="lin-ticket-pilule" data-vide="">
                  <IconeGroupe />
                  Aucun groupe
                </span>
              )}
              {contact ? (
                <MenuOptions
                  titre="Contact…"
                  declencheur={
                    <>
                      <IconeEnveloppe />
                      {c.contact_facturation_nom ?? contact}
                    </>
                  }
                  options={optionsContact}
                />
              ) : (
                <span className="lin-ticket-pilule" data-vide="" title="La relance ne peut pas partir sans adresse">
                  <IconeEnveloppe />
                  Aucune adresse
                </span>
              )}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Relances</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                titre="Paliers…"
                declencheur={
                  <>
                    <Losange atteint={!!palier} />
                    {palier ? libellePalier(palier) : <span className="c2b-gris">Pas encore relancé</span>}
                  </>
                }
                options={optionsPaliers}
                largeur={320}
              />
              {etape.relance ? (
                <button type="button" className="lin-ticket-pilule lin-ticket-sous-pilule" title="Ouvrir la relance" onClick={() => voirRelances({ relance: etape.relance ?? null })}>
                  {etape.libelle}
                </button>
              ) : (
                <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-vide={etape.vide ? "" : undefined}>
                  {etape.libelle}
                </span>
              )}
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={!!geste} onOpenChange={(o) => !o && setGeste(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              {geste?.type === "piece" ? (
                <Paperclip width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "commande" || geste?.type === "bon_recu" ? (
                <ClipboardList width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "solde" ? (
                <Scissors width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "accord" ? (
                <Handshake width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "reglement" ? (
                <Banknote width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "litige" || geste?.type === "conteste" ? (
                <Scale width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "echeancier" ? (
                <CalendarRange width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "plafond" ? (
                <Gauge width={18} height={18} aria-hidden="true" />
              ) : geste?.type === "statut" && geste.vers === "actif" ? (
                <PlayCircle width={18} height={18} aria-hidden="true" />
              ) : (
                <PauseCircle width={18} height={18} aria-hidden="true" />
              )}
            </DialogIcone>
            <DialogTitle>
              {geste?.type === "piece"
                ? "Joindre une pièce"
                : geste?.type === "commande"
                  ? `${geste.facture.numero} attend un bon de commande`
                  : geste?.type === "bon_recu"
                    ? `Le bon de commande de ${geste.facture.numero} est arrivé`
                    : geste?.type === "solde"
                      ? `Le solde de ${geste.facture.numero}`
                      : geste?.type === "accord"
                        ? `Accord de vive voix sur ${geste.devis.numero}`
                        : geste?.type === "reglement"
                          ? "Noter un règlement"
                          : geste?.type === "statut"
                            ? geste.vers === "actif"
                              ? "Reprendre les relances"
                              : geste.vers === "pause"
                                ? "Mettre le compte en pause"
                                : `Passer le compte à « ${STATUTS_COMPTE[geste.vers].libelle} »`
                            : geste?.type === "echeancier"
                              ? `Échéancier de ${geste.facture.numero}`
                              : geste?.type === "conteste"
                                ? `Contestation partielle de ${geste.facture.numero}`
                                : geste?.type === "plafond"
                                  ? "Plafond d'encours"
                                  : geste?.type === "litige" && geste.ouvrir
                                    ? `Mettre ${geste.facture.numero} en litige`
                                    : "Clore le litige"}
            </DialogTitle>
            <DialogDescription>
              {geste?.type === "piece"
                ? "Le fichier est déposé dans l'espace de stockage de votre organisation et rattaché à la facture ; il rejoint le dossier de litige, d'assurance-crédit ou de recouvrement."
                : geste?.type === "commande"
                  ? "La facture sort de la relance adressée à la comptabilité ; le service qui doit émettre le bon reçoit sa propre relance, par la file de validation, tous les sept jours. Le retard continue de courir."
                  : geste?.type === "bon_recu"
                    ? "La relance du service tombe, et la facture reprend son cycle au palier où elle en était."
                    : geste?.type === "solde"
                      ? `Reste dû : ${montant(geste.facture.reste_du)}. Abandonné, il sort de toute relance et reste lisible dans l'encours ; réclamé, il est relancé même sous le seuil. La décision reste au journal.`
                      : geste?.type === "accord"
                        ? "Le devis passe en accepté et sa cadence s'arrête, y compris la relance déjà écrite. Le point du matin vous signalera l'accord s'il n'a donné aucune facture au bout de quinze jours."
                        : geste?.type === "reglement"
                          ? geste.facture
                            ? `Le règlement est imputé sur ${geste.facture.numero}. La relance prête de cette facture est coupée avant l'envoi.`
                            : "Sans facture désignée, CASHD le lettre seul s'il cite un numéro de facture, ou s'il a exactement le montant d'une facture ouverte ; sinon il reste à rapprocher."
                          : geste?.type === "echeancier"
                            ? `L'échéancier remplace l'échéance d'origine : seule une échéance manquée relance le cycle. Les échéances doivent totaliser le reste dû (${montant(geste.facture.reste_du)}).`
                            : geste?.type === "conteste"
                              ? "La part contestée sort du cycle et le commercial du compte est prévenu ; le reste continue d'être relancé."
                              : geste?.type === "plafond"
                                ? geste.base
                                : geste?.type === "statut"
                                  ? geste.vers === "actif"
                                    ? "La reprise est une décision : dites pourquoi. Les relances reprennent au palier où elles en étaient."
                                    : "Toute relance en attente de ce compte est coupée, y compris celle qui est déjà écrite. Le compte n'y revient que sur votre décision."
                                  : "La facture sort du cycle de relance ; le motif reste au journal."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {geste?.type === "reglement" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Montant reçu (€) <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" inputMode="decimal" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="1 250,00" />
                    </label>
                    <label className="rv-libelle">
                      Reçu le
                      <input className="rv-champ" type="date" max={jourParis()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
                    </label>
                  </div>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Référence
                      <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="VIR SEPA … ou n° de chèque" />
                    </label>
                    <label className="rv-libelle">
                      Moyen
                      <select className="rv-champ" value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>
                        {MODES.map((m) => (
                          <option key={m.cle} value={m.cle}>
                            {m.libelle}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              ) : geste?.type === "echeancier" ? (
                <>
                  {lignesEch.map((l, i) => (
                    <div className="esp-form-ligne" key={i}>
                      <label className="rv-libelle">
                        Échéance {i + 1}
                        <input className="rv-champ" type="date" value={l.echeance} onChange={(e) => setLignesEch(lignesEch.map((x, k) => (k === i ? { ...x, echeance: e.target.value } : x)))} />
                      </label>
                      <label className="rv-libelle">
                        Montant (€)
                        <input className="rv-champ" inputMode="decimal" value={l.montant} onChange={(e) => setLignesEch(lignesEch.map((x, k) => (k === i ? { ...x, montant: e.target.value } : x)))} />
                      </label>
                    </div>
                  ))}
                  <div className="esp-actions">
                    {[2, 3, 4, 6].map((n) => (
                      <button key={n} type="button" className="esp-lien-bouton" onClick={() => setLignesEch(echeancesProposees(geste.facture.reste_du, n))}>
                        {n} mensualités
                      </button>
                    ))}
                  </div>
                  <p className="c2-sous">
                    Total : {montant(totalEch)}
                    {Math.abs(totalEch - geste.facture.reste_du) >= 0.005 ? ` — il doit faire ${montant(geste.facture.reste_du)}` : ""}
                  </p>
                  <label className="rv-libelle">
                    Motif (l&apos;accord du client) <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Accord par téléphone avec la comptable, confirmé par courriel" />
                  </label>
                </>
              ) : geste?.type === "commande" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Adresse du service <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" type="email" value={service.email} onChange={(e) => setService({ ...service, email: e.target.value })} placeholder="achats@client.fr" />
                    </label>
                    <label className="rv-libelle">
                      Nom du service ou de la personne
                      <input className="rv-champ" value={service.nom} onChange={(e) => setService({ ...service, nom: e.target.value })} placeholder="Service des achats" />
                    </label>
                  </div>
                  <label className="rv-libelle">
                    Motif du blocage <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Bon de commande attendu du service des achats avant mise en paiement" />
                  </label>
                </>
              ) : geste?.type === "piece" ? (
                <>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Facture
                      <select className="rv-champ" value={jointe.facture} onChange={(e) => setJointe({ ...jointe, facture: e.target.value })}>
                        {facturesJoignables.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.numero}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="rv-libelle">
                      Nature
                      <select className="rv-champ" value={jointe.nature} onChange={(e) => setJointe({ ...jointe, nature: e.target.value as NaturePiece })}>
                        {NATURES.map((n) => (
                          <option key={n.cle} value={n.cle}>
                            {n.libelle}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="rv-libelle">
                    Fichier (PDF ou image)
                    <input className="rv-champ" type="file" accept=".pdf,image/*" onChange={(e) => setJointe({ ...jointe, fichier: e.target.files?.[0] ?? null })} />
                  </label>
                </>
              ) : geste?.type === "bon_recu" ? null : geste?.type === "solde" ? (
                <>
                  <label className="rv-libelle">
                    Décision
                    <select className="rv-champ" value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)}>
                      <option value="abandonne">Abandonner le solde</option>
                      <option value="reclame">Le réclamer malgré le seuil</option>
                      <option value="">Revenir à la règle du seuil</option>
                    </select>
                  </label>
                  <label className="rv-libelle">
                    Motif <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Écart de règlement de quelques euros, accepté" />
                  </label>
                </>
              ) : geste?.type === "accord" ? (
                <>
                  <label className="rv-libelle">
                    Accepté le
                    <input className="rv-champ" type="date" min={geste.devis.date_emission} max={jourParis()} value={accordLe} onChange={(e) => setAccordLe(e.target.value)} />
                  </label>
                  <label className="rv-libelle">
                    Qui, comment <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Accord de M. Lefèvre au téléphone, chantier en novembre" />
                  </label>
                </>
              ) : geste?.type === "conteste" || geste?.type === "plafond" ? (
                <>
                  <label className="rv-libelle">
                    {geste.type === "conteste" ? "Montant contesté (€)" : "Plafond (€, vide : aucun)"}
                    {geste.type === "conteste" ? (
                      <input className="rv-champ" inputMode="decimal" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} placeholder="1 000,00" />
                    ) : (
                      <input className="rv-champ" inputMode="decimal" value={plafond} onChange={(e) => setPlafond(e.target.value)} placeholder="20 000" />
                    )}
                  </label>
                  <label className="rv-libelle">
                    Motif <span className="esp-obligatoire">(obligatoire)</span>
                    <textarea
                      className="rv-champ"
                      rows={2}
                      value={motif}
                      onChange={(e) => setMotif(e.target.value)}
                      placeholder={geste.type === "conteste" ? "Le client conteste la ligne « pose » (courriel du …)" : "Proposé par CASHD depuis l'historique"}
                    />
                  </label>
                </>
              ) : (
                <label className="rv-libelle">
                  Motif <span className="esp-obligatoire">(obligatoire)</span>
                  <textarea
                    className="rv-champ"
                    rows={3}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    placeholder={geste?.type === "litige" ? "Le client conteste la quantité livrée (courriel du …)" : "Paiement promis pour vendredi par le gérant"}
                  />
                </label>
              )}
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={valider}>
              {envoi ? <Loader variant="spin" /> : null} Valider
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   La page d'une relance, à droite : son texte, son débiteur, la réponse
   reçue à trancher, et l'envoi à la main d'une relance validée.
   ══════════════════════════════════════════════════════════════════════ */

function FicheRelance({
  l,
  b,
  reponse,
  actions,
  autres,
  suivant,
  tete,
  noter,
  aller,
  fermer,
  voirDebiteur,
  filtrer,
}: {
  l: Ligne;
  b: Balance | null;
  reponse: ReponseLue | null;
  actions: Actions | null;
  autres: Relance[];
  suivant: Suivi | null;
  tete: Tete;
  noter: (r: Relance, canal: string) => Promise<void>;
  aller: Aller;
  fermer: () => void;
  voirDebiteur: () => void;
  filtrer: (k: string, v: string) => void;
}) {
  const toast = useToast();
  const [tranche, setTranche] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [toutesFactures, setToutesFactures] = useState(false);
  const r = l.r;
  const cmd = l.c;
  const sujet = r?.sujet ?? cmd?.sujet ?? (r ? libellePalier(r.palier) : NATURES_LIGNE.commande);
  const corps = r?.corps ?? cmd?.corps ?? null;
  const adresseDest = r?.destinataire_adresse ?? cmd?.destinataire_adresse ?? null;
  const nomDest = r?.destinataire_nom ?? cmd?.destinataire_nom ?? null;
  const motif = r?.motif ?? cmd?.motif ?? null;
  const libelleEtat = r ? (ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee).libelle : cmd ? ETATS_COMMANDE[cmd.statut] : "—";
  const texteComplet = `${sujet}\n\n${corps ?? ""}`;
  const trancher = async (accepter: boolean) => {
    if (!reponse || !actions) return;
    setTranche(true);
    try {
      toast(`C'est fait. ${await actions.trancherReponse(reponse, accepter)}`, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé.", "rouge");
    } finally {
      setTranche(false);
    }
  };
  const optionsEtat: Option[] = (Object.keys(GROUPES_RELANCE) as GroupeRelance[]).map((g) => ({
    cle: g,
    libelle: GROUPES_RELANCE[g].libelle,
    icone: <IconeGroupeRelance g={g} />,
    coche: l.groupe === g,
    action: () => filtrer("etat", g),
  }));
  /* le parent : le débiteur, ses relances et chacune des autres (l'ancienne carte « Activité ») */
  const optionsDebiteur: Option[] = [
    { cle: "ouvrir", libelle: "Ouvrir le débiteur", meta: b ? STATUTS_COMPTE[b.statut].libelle : undefined, icone: <Building2 width={16} height={16} />, action: voirDebiteur },
    { cle: "filtrer", libelle: "Toutes ses relances", icone: <MessageSquare width={16} height={16} />, action: () => filtrer("debiteur", l.compte_id) },
    ...autres.map((x) => ({
      cle: x.id,
      libelle: libellePalier(x.palier),
      meta: `${(ETATS_RELANCE[x.etat] ?? ETATS_RELANCE.preparee).libelle.toLowerCase()} · ${jour(x.envoye_le ?? x.jour)}`,
      icone: <Losange atteint={x.etat !== "a_valider"} />,
      action: () => aller({ relance: x.id }),
    })),
  ];
  const optionsDest: Option[] = adresseDest
    ? [
        { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${adresseDest}`) },
        { cle: "copier", libelle: "Copier l'adresse", meta: nomDest ? adresseDest : undefined, icone: <Copy width={16} height={16} />, action: () => copier(adresseDest) },
      ]
    : [];
  /* le « ··· » de la tête : les boutons cerclés d'avant */
  const optionsTete: Option[] = [
    ...(corps
      ? [
          {
            cle: "copier",
            libelle: "Copier le texte",
            icone: <Copy width={16} height={16} aria-hidden="true" />,
            action: () => {
              copier(texteComplet);
              toast("Texte copié : sujet et corps de la relance.", "vert");
            },
          },
        ]
      : []),
    { cle: "debiteur", libelle: "Ouvrir le débiteur", meta: b ? STATUTS_COMPTE[b.statut].libelle : undefined, icone: <Building2 width={16} height={16} aria-hidden="true" />, action: voirDebiteur },
  ];
  /* l'horloge : aucune pilule de la relance ne porte de date, donc « Ses autres relances », chacune à sa date */
  const optionsDates: Option[] = [
    ...autres.map((x) => ({
      cle: x.id,
      libelle: libellePalier(x.palier),
      meta: `${(ETATS_RELANCE[x.etat] ?? ETATS_RELANCE.preparee).libelle.toLowerCase()} · ${jour(x.envoye_le ?? x.jour)}`,
      icone: <Losange atteint={x.etat !== "a_valider"} />,
      action: () => aller({ relance: x.id }),
    })),
    { cle: "toutes", libelle: "Toutes ses relances", icone: <MessageSquare width={16} height={16} aria-hidden="true" />, action: () => filtrer("debiteur", l.compte_id) },
  ];
  /* la prochaine étape du débiteur : la sous-pilule du parent */
  const etape: { libelle: string; vide?: boolean } = suivant
    ? { libelle: `${libellePalier(suivant.palier_suivant)} le ${jour(suivant.palier_suivant_le)}` }
    : b && b.statut !== "actif"
      ? { libelle: `Aucune relance : ${STATUTS_COMPTE[b.statut].libelle.toLowerCase()}`, vide: true }
      : { libelle: "Aucune étape prévue", vide: true };
  /* les factures relancées : leur montant seulement quand il y en a plusieurs (sinon c'est celui de la relance) */
  const factures = r?.pieces ?? [];
  const facturesVues = toutesFactures ? factures : factures.slice(0, 5);
  /* le fil de la relance : écrite, validée, partie ou arrêtée, et la réponse reçue */
  const entrees: Entree[] = [];
  if (r) {
    entrees.push({
      cle: "ecrite",
      le: r.jour,
      icone: <PenLine width={14} height={14} aria-hidden="true" />,
      contenu: (
        <>
          <b>CASHD</b> a écrit la relance
        </>
      ),
    });
    if (groupeDe(r, false) === "a_valider")
      entrees.push({
        cle: "valider",
        le: null,
        icone: <CheckCheck width={14} height={14} aria-hidden="true" />,
        contenu: (
          <>
            <b>À valider</b> dans la file de validation
          </>
        ),
      });
    else if (aEnvoyer(r) || r.etat === "envoyee")
      entrees.push({
        cle: "validee",
        le: null,
        icone: <CheckCheck width={14} height={14} aria-hidden="true" />,
        contenu: (
          <>
            <b>Validée</b> dans la file{aEnvoyer(r) ? " : à envoyer, puis noter l'envoi" : ""}
          </>
        ),
      });
    if (r.envoye_le)
      entrees.push({
        cle: "partie",
        le: r.envoye_le,
        icone: <Send width={14} height={14} aria-hidden="true" />,
        contenu: r.envoi_main ? (
          <>
            <b>Envoyée à la main</b> ({CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal})
          </>
        ) : (
          <>
            <b>CASHD</b> l&apos;a envoyée ({canalDe(r)})
          </>
        ),
      });
    else if (groupeDe(r, false) === "arretee")
      entrees.push({
        cle: "arret",
        le: null,
        icone: <X width={14} height={14} aria-hidden="true" />,
        contenu: (
          <>
            <b>{libelleEtat}</b>
            {motif ? ` : ${motif}` : ""}
          </>
        ),
      });
  } else if (cmd) {
    entrees.push({
      cle: "ecrite",
      le: cmd.jour,
      icone: <PenLine width={14} height={14} aria-hidden="true" />,
      contenu: (
        <>
          <b>CASHD</b> a écrit la relance du bon de commande, pour le service qui l&apos;émet (pas la comptabilité)
        </>
      ),
    });
    entrees.push({
      cle: "etat",
      le: null,
      icone: <ClipboardList width={14} height={14} aria-hidden="true" />,
      contenu: (
        <>
          <b>{libelleEtat}</b>
          {motif ? ` : ${motif}` : ""}
        </>
      ),
    });
  }
  if (reponse)
    entrees.push({
      cle: reponse.id,
      le: reponse.cree_le,
      attente: true,
      icone: <IconeSante sante={reponse.lecture === "contestation" ? "litige" : reponse.lecture === "promesse" ? "a_jour" : "retard"} />,
      contenu: (
        <>
          <b>Réponse reçue</b>
          {reponse.lecture !== "autre" ? ` : ${LECTURES[reponse.lecture].toLowerCase()}` : ""}
        </>
      ),
      texte: (
        <>
          {reponse.indice ? `« ${reponse.indice} » — ` : ""}Proposé : {PROPOSITIONS[reponse.proposition]}.
        </>
      ),
      actions: (
        <>
          {reponse.proposition !== "aucune" ? (
            <button type="button" className="v2-btn v2-btn--petit" disabled={tranche || !actions} onClick={() => void trancher(true)}>
              {tranche ? <Loader variant="spin" /> : <CheckCheck width={14} height={14} aria-hidden="true" />}
              <span>Accepter</span>
            </button>
          ) : null}
          <button type="button" className="v2-btn v2-btn--petit" disabled={tranche || !actions} onClick={() => void trancher(false)}>
            <span>{reponse.proposition === "aucune" ? "Lue" : "Écarter"}</span>
          </button>
        </>
      ),
    });

  return (
    <section className="lin-boite-detail" aria-label={`Relance : ${sujet}`}>
      <TeteDetail
        reference={l.compte}
        nom={r ? libellePalier(r.palier) : NATURES_LIGNE.commande}
        tete={tete}
        actions={optionsTete}
        dates={{ titre: "Ses autres relances…", options: optionsDates }}
        activite
        fermer={fermer}
      />

      <div className="lin-ticket">
        <article className="lin-ticket-corps">
          <h2 className="lin-ticket-titre">{sujet}</h2>
          {/* le corps de la relance est un texte : il prend la place de la description, en entier */}
          {corps ? (
            <p className="lin-ticket-desc c2b-corps">{corps}</p>
          ) : (
            <p className="lin-ticket-desc" data-vide="">
              Le texte est dans la file de validation.
            </p>
          )}
          <div className="lin-ticket-icones">
            {corps ? (
              <button
                type="button"
                className="lin-ticket-icone"
                aria-label="Copier le texte"
                title="Copier le texte"
                onClick={() => {
                  copier(texteComplet);
                  toast("Texte copié : sujet et corps de la relance.", "vert");
                }}
              >
                <Copy aria-hidden="true" />
              </button>
            ) : null}
            {r && aEnvoyer(r) ? (
              <span className="c2b-icone-menu">
                <Menu
                  largeur={220}
                  bouton={(ouvert, basculer) => (
                    <button type="button" className="lin-ticket-icone" aria-label="Noter l'envoi à la main" title="Noter l'envoi à la main" aria-expanded={ouvert} disabled={envoi} onClick={basculer}>
                      {envoi ? <Loader variant="spin" /> : <Send aria-hidden="true" />}
                    </button>
                  )}
                >
                  {(fermerMenu) => (
                    <>
                      <p className="c2b-menu-titre">Envoyée par</p>
                      {Object.entries(CANAUX_MAIN).map(([cle, libelle]) => (
                        <button
                          key={cle}
                          type="button"
                          className="lin-menu-option"
                          onClick={() => {
                            fermerMenu();
                            setEnvoi(true);
                            void noter(r, cle).finally(() => setEnvoi(false));
                          }}
                        >
                          <Send width={16} height={16} aria-hidden="true" />
                          <span>{libelle}</span>
                        </button>
                      ))}
                    </>
                  )}
                </Menu>
              </span>
            ) : null}
            {r && groupeDe(r, false) === "a_valider" ? (
              <Link href={`${RACINE}/validations`} className="lin-ticket-icone" aria-label="Ouvrir la file de validation" title="Ouvrir la file de validation">
                <CheckCheck aria-hidden="true" />
              </Link>
            ) : null}
            <button type="button" className="lin-ticket-icone" aria-label="Ouvrir le débiteur" title="Ouvrir le débiteur" onClick={voirDebiteur}>
              <Building2 aria-hidden="true" />
            </button>
          </div>

          {factures.length ? (
            <ul className="lin-ticket-sous" aria-label={r?.nature === "devis" ? "Devis relancé" : "Factures relancées"}>
              {facturesVues.map((p) => (
                <li key={p.facture_id}>
                  <button type="button" className="lin-ticket-sous-ligne" title={`${p.numero} : ouvrir le débiteur`} onClick={voirDebiteur}>
                    <IconeDocument />
                    <span className="lin-ticket-sous-ref">{p.numero}</span>
                    <span className="lin-ticket-sous-nom">{p.retard_jours > 0 ? `${p.retard_jours} j de retard` : "à échoir"}</span>
                    {factures.length > 1 ? <span className="lin-ticket-sous-meta">{montant(p.reste_du)}</span> : null}
                  </button>
                </li>
              ))}
              {factures.length > 5 ? (
                <li>
                  <button type="button" className="lin-ticket-sous-appel" aria-expanded={toutesFactures} onClick={() => setToutesFactures((v) => !v)}>
                    {toutesFactures ? "Voir moins" : `Voir les ${factures.length} factures`}
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}

          <hr className="lin-ticket-trait" />
          <div className="lin-ticket-activite-tete" id="c2b-activite">
            <h3>Activité</h3>
            <button type="button" className="lin-ticket-lien" onClick={() => filtrer("debiteur", l.compte_id)}>
              Ses autres relances
            </button>
          </div>
          <Fil entrees={entrees} vide="Rien n'est encore arrivé à cette relance." />
        </article>

        <aside className="lin-ticket-cote" aria-label="Propriétés de la relance">
          <section className="lin-ticket-section">
            <h3>Propriétés</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                raccourci="s"
                titre="Relances dans cet état…"
                declencheur={
                  <>
                    <IconeGroupeRelance g={l.groupe} />
                    {libelleEtat}
                  </>
                }
                options={optionsEtat}
                largeur={280}
              />
              {r ? (
                <MenuOptions
                  raccourci="p"
                  titre="Relances à ce palier…"
                  declencheur={
                    <>
                      <Losange atteint={r.etat !== "a_valider"} />
                      {libellePalier(r.palier)}
                    </>
                  }
                  options={[{ cle: "palier", libelle: `Relances au palier « ${libellePalier(r.palier)} »`, icone: <Losange atteint />, action: () => filtrer("palier", r.palier) }]}
                  largeur={300}
                />
              ) : (
                <span className="lin-ticket-pilule">
                  <IconeLigne nature={l.nature} taille={16} />
                  {NATURES_LIGNE[l.nature]}
                </span>
              )}
              {r && !sujet.replace(/\s/g, "").includes(montant(r.montant).replace(/\s/g, "")) ? (
                <span className="lin-ticket-pilule" title="Montant relancé">
                  <HandCoins aria-hidden="true" />
                  {montant(r.montant)}
                </span>
              ) : null}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Étiquettes</h3>
            <div className="lin-ticket-pilules">
              {adresseDest ? (
                <MenuOptions
                  titre="Destinataire…"
                  declencheur={
                    <>
                      <IconeEnveloppe />
                      {nomDest ?? adresseDest}
                    </>
                  }
                  options={optionsDest}
                />
              ) : (
                <span className="lin-ticket-pilule" data-vide="" title="La relance ne peut pas partir sans adresse">
                  <IconeEnveloppe />
                  Aucune adresse
                </span>
              )}
              {r ? (
                <span className="lin-ticket-pilule" title="Canal d'envoi">
                  <Mail aria-hidden="true" />
                  {canalDe(r)}
                </span>
              ) : null}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Débiteur</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                titre="Débiteur…"
                declencheur={
                  <>
                    <IconeDebiteur id={l.compte_id} />
                    {l.compte}
                  </>
                }
                options={optionsDebiteur}
                largeur={320}
              />
              <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-vide={etape.vide ? "" : undefined}>
                {etape.vide ? null : <Losange atteint={false} />}
                {etape.libelle}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
