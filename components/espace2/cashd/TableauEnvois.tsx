"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — « Envois », sur la vue « Board » de Linear (28/10/2026)

   Demande de Teo : la troisième page de chaque SaaS refaite sur le tableau
   en colonnes de Linear, au 1:1 (../lin/lin.css, bloc « le tableau en
   colonnes »). Une carte par relance, rangée dans la colonne de son état
   d'envoi — les cinq états que les relances ont réellement (les mêmes
   groupes que la boîte des relances, BoiteDebiteurs) :
     · À valider     écrite le matin, elle attend la file de validation ;
     · À envoyer     validée, l'envoi du module est coupé : on l'envoie
                     soi-même puis on note l'envoi à la main ;
     · Parties       envoyée par CASHD ou notée envoyée (l'ancienne table
                     « Envois », son canal et son tableur) ;
     · Réponse reçue le client a répondu, une proposition est à trancher ;
     · Arrêtées      coupée, refusée, bloquée, sans adresse ou en échec.
   Les relances de bon de commande (base réelle) entrent dans « À valider »
   ou « Arrêtées », comme dans la boîte.

   La carte ouverte est dans l'adresse (?id=), comme les filtres (?filtre=
   canal:…,palier:…,nature:…,debiteur:…), « à traiter » (?traiter=1) et le
   tri (?tri=), posés en place. ↑/↓ dans une colonne, ←/→ d'une colonne à
   l'autre, Entrée ouvre, Échap ferme. Glisser une carte « À envoyer » sur
   « Parties » ouvre le geste qui existe déjà : noter l'envoi à la main
   (le canal est demandé) ; aucun autre passage n'a de geste, donc rien
   d'autre ne se glisse.

   Mêmes portes que l'écran d'avant (EcranCashd) : l'exemple joué en
   mémoire, ou la base réelle (cashd_relances_du_jour, cashd_fiche_compte
   pour les réponses lues, cashd_noter_envoi_main, cashd_trancher_reponse).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Building2,
  CheckCheck,
  ClipboardList,
  Clock,
  Copy,
  Download,
  FileText,
  HandCoins,
  Inbox,
  ListFilter,
  Mail,
  MessageSquare,
  PenLine,
  Plus,
  Send,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateHeure, montant } from "@/components/espace/format";
import { jourParis, tableauDe } from "@/components/espace/cashd/calcul";
import { exporterRelances } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import { ETATS_RELANCE, STATUTS_COMPTE, libellePalier } from "@/components/espace/cashd/etats";
import * as portes from "@/components/espace/cashd/portes";
import type { Balance, Fiche, Relance, RelanceCommande, ReponseLue, Suivi, Tableau } from "@/components/espace/cashd/types";
import { useToast } from "../Toasts";
import { Choix, Menu, MenuActions, MenuOptions, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeDocument, IconeEnveloppe, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { RACINE } from "../modules";
import { lienCompte } from "./donnees";
/* la fenêtre du dépôt reprend les champs de l'écran d'avant (rv-libelle, rv-champ) */
import "@/components/espace/cashd/cashd.css";
import "./tableau-envois.css";

type Reel = { client: portes.MonClient | null; tableau: Tableau | null; relances: Relance[]; fiches: Record<string, Fiche> };
type Groupe = "a_valider" | "a_envoyer" | "partie" | "repondue" | "arretee";
type Nature = "facture" | "devis" | "commande";
type Carte = { cle: string; nature: Nature; groupe: Groupe; jour: string; compte_id: string; compte: string; montant: number | null; canal: string | null; r?: Relance; c?: RelanceCommande; reponse?: ReponseLue };
type Filtres = Record<string, string>;
type Aller = (changes: Record<string, string | null>, remplacer?: boolean) => void;

/* ——— les colonnes : les états réels d'une relance, dans l'ordre de son trajet ——— */
const COLONNES: { cle: Groupe; libelle: string; etat?: EtatProjet; vide: string }[] = [
  { cle: "a_valider", libelle: "À valider", etat: "planifie", vide: "Rien n'attend la file de validation" },
  { cle: "a_envoyer", libelle: "À envoyer", etat: "en-cours", vide: "Aucune relance validée à envoyer soi-même" },
  { cle: "partie", libelle: "Parties", etat: "fait", vide: "Rien n'est encore parti" },
  { cle: "repondue", libelle: "Réponse reçue", vide: "Aucune réponse à trancher" },
  { cle: "arretee", libelle: "Arrêtées", etat: "annule", vide: "Aucune relance arrêtée" },
];
const LIBELLE: Record<Groupe, string> = Object.fromEntries(COLONNES.map((c) => [c.cle, c.libelle])) as Record<Groupe, string>;
const A_TRAITER: Groupe[] = ["a_valider", "a_envoyer", "repondue"];
const NATURES: Record<Nature, string> = { facture: "Relance de facture", devis: "Relance de devis", commande: "Bon de commande attendu" };
const DIMENSIONS = ["canal", "palier", "nature", "debiteur"];
const CANAUX_MAIN: Record<string, string> = { email: "Courriel", courrier: "Courrier", telephone: "Téléphone", autre: "Autre" };
const ETATS_COMMANDE: Record<RelanceCommande["statut"], string> = { preparee: "En préparation", a_valider: "À valider", non_reglee: "Écrite — envoi à régler", bloquee: "Bloquée", coupee: "Coupée", echec: "Échec" };
const LECTURES: Record<ReponseLue["lecture"], string> = { contestation: "Contestation", absence: "Contact parti", promesse: "Règlement annoncé", autre: "Réponse" };
const PROPOSITIONS: Record<ReponseLue["proposition"], string> = {
  litige: "mettre les factures de la relance en litige",
  attente_contact: "mettre le compte en attente d'un nouveau contact",
  pause: "mettre le compte en pause le temps du règlement",
  aucune: "rien : lisez-la",
};
const TRIS = [
  { cle: "recent", libelle: "Date" },
  { cle: "montant", libelle: "Montant" },
  { cle: "debiteur", libelle: "Débiteur" },
];

/* les mêmes règles que la boîte des relances (BoiteDebiteurs) */
const aEnvoyer = (r: Relance) => r.etat === "validee" || (r.etat === "non_reglee" && r.demande_statut === "approuvee");
const groupeDe = (r: Relance, repondue: boolean): Groupe =>
  repondue ? "repondue" : aEnvoyer(r) ? "a_envoyer" : r.etat === "a_valider" || r.etat === "non_reglee" ? "a_valider" : r.etat === "envoyee" || r.envoye_le ? "partie" : "arretee";
const groupeCommande = (c: RelanceCommande): Groupe => (c.statut === "a_valider" || c.statut === "non_reglee" || c.statut === "preparee" ? "a_valider" : "arretee");
const canalDe = (r: Relance) => (r.envoi_main ? `${CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal}, à la main` : r.canal === "lre" ? "Recommandé électronique" : r.canal === "whatsapp" ? "WhatsApp" : "Courriel");
/* « bloquant » : la relance ne partira pas sans qu'on intervienne (la seule teinte orange de la page) */
const bloquante = (k: Carte) => (k.r ? k.r.etat === "echec" || k.r.etat === "bloquee" || k.r.etat === "sans_adresse" : k.c ? k.c.statut === "echec" || k.c.statut === "bloquee" : false);
const etatTexte = (k: Carte) => (k.r ? (ETATS_RELANCE[k.r.etat] ?? ETATS_RELANCE.preparee).libelle : k.c ? ETATS_COMMANDE[k.c.statut] : "—");
const jour = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const copier = (texte: string) => void navigator.clipboard?.writeText(texte);

function lireFiltres(s: string | null): Filtres {
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
    if (DIMENSIONS.includes(k) && v && (k !== "nature" || v in NATURES)) f[k] = v;
  }
  return f;
}
const ecrireFiltres = (f: Filtres) =>
  Object.entries(f)
    .map(([k, v]) => `${k}:${encodeURIComponent(v)}`)
    .join(",") || null;

/* ——— les petites icônes ——— */
function IconeColonne({ g, titre }: { g: Groupe; titre?: string }) {
  const c = COLONNES.find((x) => x.cle === g);
  if (c?.etat) return <IconeStatutProjet etat={c.etat} titre={titre} />;
  return <MessageSquare className="lin-ic lin-ic-statut" width={16} height={16} strokeWidth={2} aria-label={titre} aria-hidden={titre ? undefined : true} />;
}
function IconeNature({ nature, taille = 16 }: { nature: Nature; taille?: number }) {
  const Icone = nature === "commande" ? ClipboardList : nature === "devis" ? FileText : Mail;
  return <Icone width={taille} height={taille} strokeWidth={1.6} aria-hidden="true" />;
}
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

export default function TableauEnvois() {
  const { source } = useSource();
  const params = useSearchParams();
  const toast = useToast();

  /* ——— les données : la mémoire en exemple, les portes en base réelle (comme EcranCashd et la boîte) ——— */
  const [fiches, setFiches] = useState<Fiche[]>(FICHES_EXEMPLE);
  const [relancesLocales, setRelancesLocales] = useState<Relance[]>(RELANCES_EXEMPLE);
  const [commandesReelles, setCommandesReelles] = useState<RelanceCommande[]>([]);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
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
      setReel((prev) => (prev ? { ...prev, tableau, relances, fiches: {} } : prev));
      setCommandesReelles(await portes.chargerRelancesCommande(client.client_id).catch(() => []));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [reel?.client]);
  useTempsReel(["cashd_factures", "cashd_reglements", "cashd_relances", "cashd_comptes", "cashd_relances_commande"], source === "reelle", relire);

  const tableau: Tableau | null = useMemo(() => {
    if (source === "exemple") return tableauDe(fiches, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, SANS_COMPTE_EXEMPLE);
    return reel?.tableau ?? null;
  }, [source, fiches, reel]);
  const relances = useMemo(() => (source === "exemple" ? relancesLocales : (reel?.relances ?? [])), [source, relancesLocales, reel]);
  const commandes = source === "exemple" ? [] : commandesReelles;
  const ficheDe = useCallback((id: string): Fiche | null => (source === "exemple" ? (fiches.find((x) => x.compte.id === id) ?? null) : (reel?.fiches[id] ?? null)), [source, fiches, reel]);

  /* base réelle : la fiche des débiteurs relancés, pour leurs réponses lues (comme la boîte) */
  const aLire = useMemo(() => {
    if (source !== "reelle" || !reel?.client) return [];
    return [...new Set(reel.relances.map((r) => r.compte_id))].filter((id) => !reel.fiches[id]).slice(0, 40);
  }, [source, reel]);
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
          })
          .catch(() => {
            /* sans sa fiche, la relance reste dans sa colonne ; sa réponse paraîtra à la prochaine lecture */
          });
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [aLire]);

  /* ——— l'adresse : la carte ouverte, les filtres, à traiter, le tri ——— */
  const choix = params.get("id");
  const filtres = lireFiltres(params.get("filtre"));
  const traiterSeul = params.get("traiter") === "1";
  const tri = TRIS.some((t) => t.cle === params.get("tri")) ? (params.get("tri") as string) : "recent";
  const adresse = (changes: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    q.set("vue", "envois");
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    return `${RACINE}/cashd/suivi?${q.toString()}`;
  };
  const aller: Aller = (changes, remplacer = false) => {
    const u = adresse(changes);
    if (remplacer) window.history.replaceState(null, "", u);
    else window.history.pushState(null, "", u);
  };
  /* les menus filtrent en place : remplacement, sur la même route */
  const basculerFiltre = (k: string, v: string) => {
    const f = { ...filtres };
    if (f[k] === v) delete f[k];
    else f[k] = v;
    aller({ filtre: ecrireFiltres(f) }, true);
  };
  const filtrer = (k: string, v: string) => aller({ filtre: ecrireFiltres({ ...filtres, [k]: v }) }, true);
  const [epingles, epingler] = useEpingles("cashd-envois");

  /* ——— les gestes : la porte en base réelle, la mémoire en exemple ——— */
  /* c2_11 : une relance validée, envoyée par la personne elle-même, se note ; elle passe alors dans « Parties » */
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
  /* trancher la réponse reçue : la même porte que la boîte (cashd_trancher_reponse) */
  const trancher = async (x: ReponseLue, compteId: string, accepter: boolean) => {
    try {
      if (source === "reelle") {
        const r = await portes.trancherReponse(x.id, accepter, null);
        await relire();
        toast(
          `C'est fait. ${
            !accepter
              ? "Proposition écartée : rien ne change ; la décision reste au journal."
              : x.proposition === "litige"
                ? `${r.effets} facture${r.effets > 1 ? "s" : ""} en litige ; leurs relances prêtes sont coupées.`
                : x.proposition === "attente_contact"
                  ? "Le compte attend un nouveau contact : désignez-le avant toute reprise."
                  : "Le compte est en pause le temps du règlement annoncé ; il reprend sur votre décision."
          }`,
          "vert",
        );
        return;
      }
      setFiches((prev) =>
        prev.map((y) => {
          if (y.compte.id !== compteId) return y;
          const reponses_lues = (y.reponses_lues ?? []).filter((z) => z.id !== x.id);
          if (!accepter) return { ...y, reponses_lues };
          if (x.proposition === "litige") {
            const ids = relancesLocales.find((r) => r.id === x.relance_id || r.demande_id === x.relance_id)?.pieces.map((p) => p.facture_id) ?? [];
            return { ...y, reponses_lues, pieces: y.pieces.map((p) => (ids.includes(p.id) ? { ...p, statut: "litige", statut_motif: "contestation écrite du client" } : p)) };
          }
          if (x.proposition === "aucune") return { ...y, reponses_lues };
          const statut = x.proposition === "attente_contact" ? "attente_contact" : "pause";
          return {
            ...y,
            reponses_lues,
            compte: { ...y.compte, statut, statut_motif: x.proposition === "pause" ? "le client annonce son règlement" : "l'interlocuteur a quitté l'entreprise", statut_le: new Date().toISOString() },
          };
        }),
      );
      if (accepter && x.proposition !== "aucune")
        setRelancesLocales((prev) => prev.map((r) => (r.compte_id === compteId && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: "réponse du client tranchée" } : r)));
      toast(`C'est fait. ${accepter ? "Proposition acceptée (exemple)." : "Proposition écartée (exemple) : rien ne change."}`, "vert");
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé.", "rouge");
    }
  };
  /* écrire les relances du jour (base réelle) : le « + » de « À valider » */
  const [prepare, setPrepare] = useState(false);
  const preparer = async () => {
    if (!reel?.client || prepare) return;
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

  /* ——— les cartes ——— */
  const chargement = source === "reelle" && !reel;
  const essai = source === "exemple" || (!!reel?.tableau?.reglages && reel.tableau.reglages.mode !== "reel");
  const tous = tableau?.comptes ?? [];
  const nomCompte = (id: string) => tous.find((b) => b.compte_id === id)?.nom ?? ficheDe(id)?.compte.nom ?? "Débiteur";
  /* une réponse désigne sa relance par son identifiant (la base) ; l'exemple la rattache par sa demande de validation */
  const reponseDe = new Map<string, ReponseLue>();
  for (const id of new Set(relances.map((r) => r.compte_id)))
    for (const x of (ficheDe(id)?.reponses_lues ?? []).filter((z) => z.statut === "proposee")) {
      const r = relances.find((y) => y.id === x.relance_id) ?? relances.find((y) => y.demande_id === x.relance_id);
      if (r) reponseDe.set(r.id, x);
    }
  const cartes: Carte[] = [
    ...relances.map((r): Carte => ({
      cle: r.id,
      nature: r.nature === "devis" ? "devis" : "facture",
      groupe: groupeDe(r, reponseDe.has(r.id)),
      jour: r.envoye_le ?? r.jour,
      compte_id: r.compte_id,
      compte: r.compte,
      montant: r.montant,
      canal: canalDe(r),
      r,
      reponse: reponseDe.get(r.id),
    })),
    ...commandes.map((c): Carte => ({ cle: c.id, nature: "commande", groupe: groupeCommande(c), jour: c.jour, compte_id: c.compte_id, compte: nomCompte(c.compte_id), montant: null, canal: null, c })),
  ];
  const correspond = (k: Carte, d: string, v: string) => (d === "canal" ? k.canal === v : d === "palier" ? (k.r?.palier ?? "") === v : d === "nature" ? k.nature === v : k.compte_id === v);
  const dans = (k: Carte, sauf?: string) => Object.entries(filtres).every(([d, v]) => d === sauf || correspond(k, d, v));
  const vues = cartes
    .filter((k) => dans(k) && (!traiterSeul || A_TRAITER.includes(k.groupe)))
    .sort(
      (a, b) =>
        Number(epingles.has(b.cle)) - Number(epingles.has(a.cle)) ||
        (tri === "montant" ? (b.montant ?? 0) - (a.montant ?? 0) : tri === "debiteur" ? a.compte.localeCompare(b.compte, "fr") : 0) ||
        b.jour.localeCompare(a.jour),
    );
  const parColonne = Object.fromEntries(COLONNES.map((c) => [c.cle, vues.filter((k) => k.groupe === c.cle)])) as Record<Groupe, Carte[]>;
  const grille = COLONNES.map((c) => parColonne[c.cle].map((k) => k.cle));
  const ouverte = choix ? (cartes.find((k) => k.cle === choix) ?? null) : null;

  /* ——— le clavier : ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre (le lien), Échap ferme ——— */
  const choixRef = useRef(choix);
  const grilleRef = useRef(grille);
  useEffect(() => {
    choixRef.current = choix;
    grilleRef.current = grille;
  });
  useEffect(() => {
    const carteDom = (id: string) => document.querySelector<HTMLElement>(`.lin-carte-tableau[data-carte="${CSS.escape(id)}"]`);
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      if (document.querySelector(".lin-menu, .dlg-panneau")) return;
      const ouvert = choixRef.current;
      const grille = grilleRef.current;
      if (e.key === "Escape") {
        if (!ouvert) return;
        e.preventDefault();
        const u = new URLSearchParams(window.location.search);
        u.delete("id");
        window.history.pushState(null, "", `${window.location.pathname}?${u.toString()}`);
        window.setTimeout(() => carteDom(ouvert)?.focus(), 0);
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      /* hors du tableau (dans la fiche ouverte), les flèches restent aux boutons et au défilement, sauf si une carte est ouverte */
      const surCarte = cible?.closest?.<HTMLElement>(".lin-carte-tableau[data-carte]")?.dataset.carte ?? null;
      const depart = surCarte ?? ouvert;
      if (!depart && !grille.some((c) => c.length)) return;
      if (!surCarte && cible?.closest?.(".lin-boite-detail") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      e.preventDefault();
      let col = depart ? grille.findIndex((c) => c.includes(depart)) : -1;
      let rang = col >= 0 && depart ? grille[col].indexOf(depart) : -1;
      if (col < 0) {
        col = grille.findIndex((c) => c.length);
        rang = 0;
      } else if (e.key === "ArrowDown") rang = Math.min(grille[col].length - 1, rang + 1);
      else if (e.key === "ArrowUp") rang = Math.max(0, rang - 1);
      else {
        const pas = e.key === "ArrowRight" ? 1 : -1;
        let j = col + pas;
        while (j >= 0 && j < grille.length && !grille[j].length) j += pas;
        if (j < 0 || j >= grille.length) return;
        rang = Math.min(rang, grille[j].length - 1);
        col = j;
      }
      const id = grille[col]?.[rang];
      if (!id) return;
      const el = carteDom(id);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
      /* une carte ouverte suit le curseur, comme dans la boîte */
      if (ouvert && id !== ouvert) {
        const u = new URLSearchParams(window.location.search);
        u.set("id", id);
        window.history.replaceState(null, "", `${window.location.pathname}?${u.toString()}`);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  /* ——— glisser « À envoyer » → « Parties » : le geste « Noter l'envoi à la main », avec son canal ——— */
  const [glisse, setGlisse] = useState<string | null>(null);
  const [depot, setDepot] = useState<Groupe | null>(null);
  const [envoi, setEnvoi] = useState<{ r: Relance; canal: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const carteGlissee = glisse ? cartes.find((k) => k.cle === glisse) : null;
  const accepte = (g: Groupe) => g === "partie" && carteGlissee?.groupe === "a_envoyer" && !!carteGlissee.r;
  const ouvrirEnvoi = (r: Relance) => setEnvoi({ r, canal: "email" });

  /* ——— la tête de la page : le « ··· », puis à traiter, filtre, affichage ——— */
  const parties = vues
    .filter((k) => k.groupe === "partie")
    .map((k) => k.r)
    .filter((r): r is Relance => !!r);
  const relancesDe = (ks: Carte[]) => ks.map((k) => k.r).filter((r): r is Relance => !!r);
  const optionsPage: Option[] = [
    {
      cle: "envois",
      libelle: "Exporter les envois (tableur)",
      meta: pluriel(parties.length, "ligne"),
      icone: <Download width={16} height={16} aria-hidden="true" />,
      action: () => exporterRelances(parties, jourParis()),
    },
    {
      cle: "tout",
      libelle: "Exporter tout le tableau (tableur)",
      meta: pluriel(relancesDe(vues).length, "ligne"),
      icone: <Download width={16} height={16} aria-hidden="true" />,
      action: () => exporterRelances(relancesDe(vues), jourParis()),
    },
  ];
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
  const canaux = [...new Set(cartes.map((k) => k.canal).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "fr"));
  const paliers = [...new Set(cartes.map((k) => k.r?.palier).filter((p): p is string => !!p))];
  const debiteurs = [...new Map(cartes.map((k) => [k.compte_id, k.compte])).entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  const naturesPresentes = (Object.keys(NATURES) as Nature[]).filter((n) => cartes.some((k) => k.nature === n));
  const compte = (d: string, v: string) => cartes.filter((k) => correspond(k, d, v) && dans(k, d) && (!traiterSeul || A_TRAITER.includes(k.groupe))).length;
  const menuFiltre = (
    <Menu
      largeur={300}
      bouton={(ouvert, basculer) => (
        <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={Object.keys(filtres).length ? "" : undefined} onClick={basculer}>
          <ListFilter aria-hidden="true" />
        </button>
      )}
    >
      {(fermer) => (
        <>
          {canaux.length ? <p className="c2e-menu-titre">Canal</p> : null}
          {canaux.map((c) => optionFiltre("canal", c, c, <Send width={16} height={16} aria-hidden="true" />, compte("canal", c), fermer))}
          {paliers.length ? <p className="c2e-menu-titre">Palier</p> : null}
          {paliers.map((p) => optionFiltre("palier", p, libellePalier(p), <Losange atteint />, compte("palier", p), fermer))}
          {naturesPresentes.length > 1 ? <p className="c2e-menu-titre">Nature</p> : null}
          {naturesPresentes.length > 1 ? naturesPresentes.map((n) => optionFiltre("nature", n, NATURES[n], <IconeNature nature={n} />, compte("nature", n), fermer)) : null}
          {debiteurs.length ? <p className="c2e-menu-titre">Débiteur</p> : null}
          {debiteurs.map(([id, nom]) => optionFiltre("debiteur", id, nom, <Building2 width={16} height={16} strokeWidth={1.8} aria-hidden="true" />, compte("debiteur", id), fermer))}
        </>
      )}
    </Menu>
  );
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
            <Choix<string> libelle="Tri" valeur={tri} onChange={(v) => aller({ tri: v === "recent" ? null : v }, true)} options={TRIS} />
          </label>
        </div>
      )}
    </Menu>
  );
  const libelleFiltre = (k: string, v: string) => (k === "palier" ? libellePalier(v) : k === "nature" ? NATURES[v as Nature] : k === "debiteur" ? nomCompte(v) : v);
  const iconeFiltre = (k: string, v: string) =>
    k === "canal" ? (
      <Send width={14} height={14} aria-hidden="true" />
    ) : k === "palier" ? (
      <Losange atteint />
    ) : k === "nature" ? (
      <IconeNature nature={v as Nature} taille={14} />
    ) : (
      <Building2 width={14} height={14} strokeWidth={1.8} aria-hidden="true" />
    );
  const puces = Object.entries(filtres).map(([k, v]) => (
    <button key={k} type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" onClick={() => basculerFiltre(k, v)}>
      {iconeFiltre(k, v)}
      {libelleFiltre(k, v)} ✕
    </button>
  ));
  const message = erreur
    ? `La base réelle a répondu autrement : ${erreur}`
    : chargement
      ? "Lecture des envois…"
      : source === "reelle" && reel && !reel.tableau?.reglages
        ? "CASHD n'est pas encore installé pour votre organisation : Omega l'installe en mode essai, puis vous déposez le premier export de votre facturier."
        : !vues.length && (Object.keys(filtres).length || traiterSeul)
          ? "Rien dans ce filtre."
          : !cartes.length
            ? "Aucune relance. Elles s'écrivent chaque matin à 7 h pour les comptes qui ont atteint un palier ; une fois validée, elle part et s'inscrit dans « Parties » avec son heure, son destinataire et son canal."
            : null;

  /* ——— une colonne ——— */
  const optionsColonne = (g: Groupe, ks: Carte[]): Option[] => [
    ...(g === "a_valider" ? [{ cle: "validations", libelle: "Ouvrir la file de validation", icone: <CheckCheck width={16} height={16} aria-hidden="true" />, href: `${RACINE}/validations` }] : []),
    {
      cle: "export",
      libelle: g === "partie" ? "Exporter les envois (tableur)" : `Exporter « ${LIBELLE[g]} » (tableur)`,
      meta: pluriel(relancesDe(ks).length, "ligne"),
      icone: <Download width={16} height={16} aria-hidden="true" />,
      action: () => exporterRelances(relancesDe(ks), jourParis()),
    },
  ];
  const carte = (k: Carte) => {
    const r = k.r;
    const titre = r?.sujet ?? k.c?.sujet ?? (r ? libellePalier(r.palier) : NATURES.commande);
    const glissable = k.groupe === "a_envoyer" && !!r;
    /* le pied : la date de l'étape ; pour une relance partie, son canal (l'ancienne colonne « Canal ») */
    const pied =
      k.groupe === "partie" && r?.envoye_le ? `Partie le ${jour(r.envoye_le)} · ${k.canal}` : k.groupe === "repondue" && k.reponse ? `Réponse reçue le ${jour(k.reponse.cree_le)}` : `Écrite le ${jour(r?.jour ?? k.jour)}`;
    return (
      <Link
        key={k.cle}
        href={adresse({ id: k.cle })}
        className="lin-carte-tableau"
        data-carte={k.cle}
        data-actif={choix === k.cle ? "" : undefined}
        data-glisse={glisse === k.cle ? "" : undefined}
        data-bloquant={bloquante(k) ? "" : undefined}
        aria-current={choix === k.cle ? "true" : undefined}
        scroll={false}
        draggable={glissable}
        title={glissable ? "Glisser sur « Parties » pour noter l'envoi à la main" : undefined}
        onDragStart={(e) => {
          if (!glissable) return e.preventDefault();
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", k.cle);
          setGlisse(k.cle);
        }}
        onDragEnd={() => {
          setGlisse(null);
          setDepot(null);
        }}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          if (choix !== k.cle) aller({ id: k.cle });
        }}
      >
        <span className="lin-carte-ref">
          <span className="c2e-ref">
            {A_TRAITER.includes(k.groupe) ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
            <span className="c2e-ref-nom">{k.compte}</span>
            {epingles.has(k.cle) ? <Star className="c2e-epingle" fill="currentColor" aria-label="épinglée" /> : null}
          </span>
          <IconeNature nature={k.nature} />
        </span>
        <span className="lin-carte-titre">
          <IconeColonne g={k.groupe} />
          <span>{titre}</span>
        </span>
        <span className="lin-carte-pastilles">
          {r ? (
            <span className="lin-carte-pastille" title="Montant relancé">
              <HandCoins aria-hidden="true" />
              {montant(r.montant)}
            </span>
          ) : null}
          {/* une relance arrêtée montre son état à la place du palier (trois pastilles ne tiennent pas sur une ligne) */}
          {r && k.groupe === "arretee" ? null : r ? (
            <span className="lin-carte-pastille" title="Palier">
              <Losange atteint={r.etat !== "a_valider"} />
              {libellePalier(r.palier)}
            </span>
          ) : (
            <span className="lin-carte-pastille">
              <ClipboardList aria-hidden="true" />
              {NATURES.commande}
            </span>
          )}
          {k.groupe === "arretee" ? (
            <span className="lin-carte-pastille c2e-pastille-etat" title={(r?.motif ?? k.c?.motif) || undefined}>
              <X aria-hidden="true" />
              {etatTexte(k)}
            </span>
          ) : null}
        </span>
        <span className="lin-carte-pied">{pied}</span>
      </Link>
    );
  };
  const colonnes = COLONNES.map((c) => {
    const ks = parColonne[c.cle];
    return (
      <section key={c.cle} className="lin-colonne" aria-label={`${c.libelle} : ${pluriel(ks.length, "relance")}`}>
        <header className="lin-colonne-tete">
          <span className="lin-colonne-nom">
            <IconeColonne g={c.cle} />
            <h3>{c.libelle}</h3>
            <span className="lin-colonne-compte">{ks.length}</span>
          </span>
          <div className="lin-tete-ronds">
            <MenuActions rond titre={`Actions : ${c.libelle}`} options={optionsColonne(c.cle, ks)} />
            {c.cle === "a_valider" && source === "reelle" && reel?.client ? (
              <button type="button" className="lin-rond" aria-label="Écrire les relances du jour" title="Écrire les relances du jour" disabled={prepare} onClick={() => void preparer()}>
                {prepare ? <Loader variant="spin" /> : <Plus aria-hidden="true" />}
              </button>
            ) : null}
          </div>
        </header>
        <div
          className="lin-colonne-corps"
          data-depot={depot === c.cle ? "" : undefined}
          onDragOver={(e) => {
            if (!accepte(c.cle)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (depot !== c.cle) setDepot(c.cle);
          }}
          onDragLeave={(e) => {
            if (depot === c.cle && !e.currentTarget.contains(e.relatedTarget as Node | null)) setDepot(null);
          }}
          onDrop={(e) => {
            if (!accepte(c.cle)) return;
            e.preventDefault();
            const r = carteGlissee?.r;
            setDepot(null);
            setGlisse(null);
            if (r) ouvrirEnvoi(r);
          }}
        >
          {ks.length ? ks.map(carte) : <div className="lin-colonne-vide">{chargement ? "Lecture…" : depot === c.cle ? "Déposer pour noter l'envoi" : c.vide}</div>}
        </div>
      </section>
    );
  });

  /* ——— la fiche de la carte ouverte ——— */
  const fermer = () => aller({ id: null });
  let detail: React.ReactNode = null;
  if (choix) {
    if (!ouverte) {
      detail = (
        <section className="lin-boite-detail c2e-detail" aria-label="Relance">
          <TeteDetail reference="Envois" nom="Relance" fermer={fermer} />
          <p className="lin-vide">{chargement ? "Lecture des relances…" : "Cette relance n'est plus dans le tableau."}</p>
        </section>
      );
    } else {
      const colonne = parColonne[ouverte.groupe];
      const rang = colonne.findIndex((k) => k.cle === ouverte.cle);
      const voisins: Option[] =
        rang < 0
          ? []
          : [
              ...(rang > 0 ? [{ cle: "precedent", libelle: "Précédente", meta: "↑", icone: <ArrowUp width={16} height={16} aria-hidden="true" />, action: () => aller({ id: colonne[rang - 1].cle }, true) }] : []),
              ...(rang < colonne.length - 1
                ? [{ cle: "suivant", libelle: "Suivante", meta: "↓", icone: <ArrowDown width={16} height={16} aria-hidden="true" />, action: () => aller({ id: colonne[rang + 1].cle }, true) }]
                : []),
            ];
      const fiche = ficheDe(ouverte.compte_id);
      const b = tous.find((x) => x.compte_id === ouverte.compte_id) ?? null;
      detail = (
        <FicheEnvoi
          key={`${source}:${ouverte.cle}`}
          k={ouverte}
          b={b}
          autres={relances.filter((x) => x.compte_id === ouverte.compte_id && x.id !== ouverte.cle).sort((x, y) => (y.envoye_le ?? y.jour).localeCompare(x.envoye_le ?? x.jour))}
          suivant={prochainPalier(fiche?.suivi ?? [])}
          epingle={epingles.has(ouverte.cle)}
          epingler={() => epingler(ouverte.cle)}
          voisins={voisins}
          noter={ouvrirEnvoi}
          trancher={(x, accepter) => trancher(x, ouverte.compte_id, accepter)}
          aller={aller}
          fermer={fermer}
          filtrer={filtrer}
        />
      );
    }
  }

  const fenetreEnvoi = (
    <Dialog open={!!envoi} onOpenChange={(o) => !o && !envoiEnCours && setEnvoi(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone>
            <Send width={18} height={18} aria-hidden="true" />
          </DialogIcone>
          <DialogTitle>Noter l&apos;envoi à la main</DialogTitle>
          <DialogDescription>
            {envoi ? `${envoi.r.compte} · ${libellePalier(envoi.r.palier)}. ` : ""}Validée : si vous l&apos;avez envoyée vous-même, notez-le ici. La relance comptera comme partie, à cette date.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">
              Envoyée par
              <select className="rv-champ" value={envoi?.canal ?? "email"} onChange={(e) => setEnvoi((x) => (x ? { ...x, canal: e.target.value } : x))}>
                {Object.entries(CANAUX_MAIN).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </DialogBody>
        <DialogFooter>
          {envoi?.r.corps ? (
            <button
              type="button"
              className="r-btn"
              onClick={() => {
                if (!envoi) return;
                copier(`${envoi.r.sujet ?? ""}\n\n${envoi.r.corps ?? ""}`);
                toast("Texte copié : sujet et corps de la relance.", "vert");
              }}
            >
              <Copy width={14} height={14} aria-hidden="true" /> Copier le texte
            </button>
          ) : null}
          <button
            type="button"
            className="r-btn r-btn--noir"
            disabled={!envoi || envoiEnCours}
            onClick={() => {
              if (!envoi) return;
              setEnvoiEnCours(true);
              void noterEnvoi(envoi.r, envoi.canal).finally(() => {
                setEnvoiEnCours(false);
                setEnvoi(null);
              });
            }}
          >
            {envoiEnCours ? <Loader variant="spin" /> : null} Noter l&apos;envoi
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">Envois</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Envois</span>
        <MenuActions rond aGauche titre="Actions de la page" options={optionsPage} />
        <div className="lin-tete-ronds">
          <button
            type="button"
            className="lin-rond"
            aria-pressed={traiterSeul}
            aria-label="Seulement ce qui est à traiter"
            title="Seulement ce qui est à traiter"
            onClick={() => aller({ traiter: traiterSeul ? null : "1" }, true)}
          >
            <IconeNonLus />
          </button>
          {menuFiltre}
          {menuAffichage}
        </div>
      </header>
      {puces.length || essai ? (
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Filtres posés">
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
      ) : null}
      {message ? <p className="c2e-message">{message}</p> : null}
      <div className="lin-tableau-page c2e-page">
        <div className="lin-tableau">{colonnes}</div>
        {detail}
      </div>
      {fenetreEnvoi}
    </div>
  );
}

/* le prochain palier prévu par le suivi des factures */
const prochainPalier = (suivi: Suivi[]) => suivi.filter((s) => s.palier_suivant && s.palier_suivant_le).sort((a, b) => (a.palier_suivant_le ?? "").localeCompare(b.palier_suivant_le ?? ""))[0] ?? null;

/* ——— la tête de la carte ouverte : celle du détail de l'Inbox (référence, nom, étoile, ···, cloche, horloge, bac-croix) ——— */
function TeteDetail({
  reference,
  nom,
  epingle,
  epingler,
  actions = [],
  dates,
  activite,
  fermer,
}: {
  reference: string;
  nom: string;
  epingle?: boolean;
  epingler?: () => void;
  actions?: Option[];
  dates?: { titre: string; options: Option[] };
  activite?: boolean;
  fermer: () => void;
}) {
  return (
    <header className="lin-tete">
      <span className="lin-tete-ref">{reference}</span>
      <span className="lin-tete-nom" title={nom}>
        {nom}
      </span>
      {epingler ? (
        <button
          type="button"
          className="lin-rond"
          aria-pressed={!!epingle}
          data-actif={epingle ? "" : undefined}
          aria-label={epingle ? "Désépingler" : "Épingler en haut de sa colonne"}
          title={epingle ? "Désépingler" : "Épingler en haut de sa colonne"}
          onClick={epingler}
        >
          <Star aria-hidden="true" fill={epingle ? "currentColor" : "none"} />
        </button>
      ) : null}
      {actions.length ? <MenuActions rond aGauche titre="Actions" options={actions} /> : null}
      <div className="lin-tete-ronds">
        {activite ? (
          <button type="button" className="lin-rond" aria-label="Voir l'activité" title="Voir l'activité" onClick={() => document.getElementById("c2e-activite")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            <Bell aria-hidden="true" />
          </button>
        ) : null}
        {dates?.options.length ? (
          <span className="c2e-bulle" title="Dates">
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

/* ——— le fil d'activité de la relance (le modèle « page d'un ticket ») ——— */
type Entree = { cle: string; le: string | null; icone: React.ReactNode; contenu: React.ReactNode; texte?: React.ReactNode; actions?: React.ReactNode; attente?: boolean };
function Fil({ entrees, vide }: { entrees: Entree[]; vide: string }) {
  return (
    <ul className="lin-ticket-fil">
      {entrees.length ? (
        entrees.map((e) => (
          <li key={e.cle} data-attente={e.attente ? "" : undefined}>
            {e.icone}
            <div className="c2e-fil-corps">
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

/* ══════════════════════════════════════════════════════════════════════
   La fiche d'une carte, à droite : la page d'une relance (comme dans la
   boîte) — son texte, ses factures, son fil, ses propriétés ; l'envoi à
   la main d'une relance à envoyer, la réponse reçue à trancher.
   ══════════════════════════════════════════════════════════════════════ */
function FicheEnvoi({
  k,
  b,
  autres,
  suivant,
  epingle,
  epingler,
  voisins,
  noter,
  trancher,
  aller,
  fermer,
  filtrer,
}: {
  k: Carte;
  b: Balance | null;
  autres: Relance[];
  suivant: Suivi | null;
  epingle: boolean;
  epingler: () => void;
  voisins: Option[];
  noter: (r: Relance) => void;
  trancher: (x: ReponseLue, accepter: boolean) => Promise<void>;
  aller: Aller;
  fermer: () => void;
  filtrer: (k: string, v: string) => void;
}) {
  const toast = useToast();
  const [tranche, setTranche] = useState(false);
  const [toutesFactures, setToutesFactures] = useState(false);
  const r = k.r;
  const cmd = k.c;
  const reponse = k.reponse ?? null;
  const sujet = r?.sujet ?? cmd?.sujet ?? (r ? libellePalier(r.palier) : NATURES.commande);
  const corps = r?.corps ?? cmd?.corps ?? null;
  const adresseDest = r?.destinataire_adresse ?? cmd?.destinataire_adresse ?? null;
  const nomDest = r?.destinataire_nom ?? cmd?.destinataire_nom ?? null;
  const motif = r?.motif ?? cmd?.motif ?? null;
  const libelleEtat = etatTexte(k);
  const texteComplet = `${sujet}\n\n${corps ?? ""}`;
  const copierTexte = () => {
    copier(texteComplet);
    toast("Texte copié : sujet et corps de la relance.", "vert");
  };
  const decider = async (accepter: boolean) => {
    if (!reponse) return;
    setTranche(true);
    await trancher(reponse, accepter).finally(() => setTranche(false));
  };
  const autresOptions: Option[] = autres.map((x) => ({
    cle: x.id,
    libelle: libellePalier(x.palier),
    meta: `${(ETATS_RELANCE[x.etat] ?? ETATS_RELANCE.preparee).libelle.toLowerCase()} · ${jour(x.envoye_le ?? x.jour)}`,
    icone: <Losange atteint={x.etat !== "a_valider"} />,
    action: () => aller({ id: x.id }),
  }));
  /* le « ··· » de la tête : précédente / suivante dans la colonne, puis les gestes de la relance */
  const optionsTete: Option[] = [
    ...voisins,
    ...(r && k.groupe === "a_envoyer" ? [{ cle: "noter", libelle: "Noter l'envoi à la main", icone: <Send width={16} height={16} aria-hidden="true" />, action: () => noter(r) }] : []),
    ...(corps ? [{ cle: "copier", libelle: "Copier le texte", icone: <Copy width={16} height={16} aria-hidden="true" />, action: copierTexte }] : []),
    ...(k.groupe === "a_valider" ? [{ cle: "validations", libelle: "Ouvrir la file de validation", icone: <CheckCheck width={16} height={16} aria-hidden="true" />, href: `${RACINE}/validations` }] : []),
    { cle: "debiteur", libelle: "Ouvrir le débiteur", meta: b ? STATUTS_COMPTE[b.statut].libelle : undefined, icone: <Building2 width={16} height={16} aria-hidden="true" />, href: lienCompte(k.compte_id) },
  ];
  const optionsDebiteur: Option[] = [
    { cle: "ouvrir", libelle: "Ouvrir le débiteur", meta: b ? STATUTS_COMPTE[b.statut].libelle : undefined, icone: <Building2 width={16} height={16} />, href: lienCompte(k.compte_id) },
    { cle: "filtrer", libelle: "Toutes ses relances", icone: <MessageSquare width={16} height={16} />, action: () => filtrer("debiteur", k.compte_id) },
    ...autresOptions,
  ];
  const optionsDest: Option[] = adresseDest
    ? [
        { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${adresseDest}`) },
        { cle: "copier", libelle: "Copier l'adresse", meta: nomDest ? adresseDest : undefined, icone: <Copy width={16} height={16} />, action: () => copier(adresseDest) },
      ]
    : [];
  /* l'horloge : la relance ne porte pas d'autre date que la sienne, donc « Ses autres relances », chacune à sa date */
  const optionsDates: Option[] = [...autresOptions, { cle: "toutes", libelle: "Toutes ses relances", icone: <MessageSquare width={16} height={16} aria-hidden="true" />, action: () => filtrer("debiteur", k.compte_id) }];
  const etape: { libelle: string; vide?: boolean } = suivant
    ? { libelle: `${libellePalier(suivant.palier_suivant)} le ${jour(suivant.palier_suivant_le)}` }
    : b && b.statut !== "actif"
      ? { libelle: `Aucune relance : ${STATUTS_COMPTE[b.statut].libelle.toLowerCase()}`, vide: true }
      : { libelle: "Aucune étape prévue", vide: true };
  const factures = r?.pieces ?? [];
  const facturesVues = toutesFactures ? factures : factures.slice(0, 5);

  /* le fil : écrite, validée, partie ou arrêtée, et la réponse reçue */
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
    const g = groupeDe(r, false);
    if (g === "a_valider")
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
    else if (g === "a_envoyer" || r.etat === "envoyee")
      entrees.push({
        cle: "validee",
        le: null,
        icone: <CheckCheck width={14} height={14} aria-hidden="true" />,
        contenu: (
          <>
            <b>Validée</b> dans la file{g === "a_envoyer" ? " : à envoyer, puis noter l'envoi" : ""}
          </>
        ),
        attente: g === "a_envoyer",
        actions:
          g === "a_envoyer" ? (
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => noter(r)}>
              <Send width={14} height={14} aria-hidden="true" />
              <span>Noter l&apos;envoi à la main</span>
            </button>
          ) : undefined,
      });
    if (r.envoye_le)
      entrees.push({
        cle: "partie",
        le: r.envoye_le,
        icone: <Send width={14} height={14} aria-hidden="true" />,
        contenu: r.envoi_main ? (
          <>
            <b>Envoyée à la main</b> ({CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal}), le {dateHeure(r.envoye_le)}
          </>
        ) : (
          <>
            <b>CASHD</b> l&apos;a envoyée ({canalDe(r)}), le {dateHeure(r.envoye_le)}
          </>
        ),
      });
    else if (g === "arretee")
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
      icone: <MessageSquare width={14} height={14} aria-hidden="true" />,
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
            <button type="button" className="v2-btn v2-btn--petit" disabled={tranche} onClick={() => void decider(true)}>
              {tranche ? <Loader variant="spin" /> : <CheckCheck width={14} height={14} aria-hidden="true" />}
              <span>Accepter</span>
            </button>
          ) : null}
          <button type="button" className="v2-btn v2-btn--petit" disabled={tranche} onClick={() => void decider(false)}>
            <span>{reponse.proposition === "aucune" ? "Lue" : "Écarter"}</span>
          </button>
        </>
      ),
    });

  return (
    <section className="lin-boite-detail c2e-detail" aria-label={`Relance : ${sujet}`}>
      <TeteDetail
        reference={k.compte}
        nom={r ? libellePalier(r.palier) : NATURES.commande}
        epingle={epingle}
        epingler={epingler}
        actions={optionsTete}
        dates={{ titre: "Ses autres relances…", options: optionsDates }}
        activite
        fermer={fermer}
      />
      <div className="lin-ticket">
        <article className="lin-ticket-corps">
          <h2 className="lin-ticket-titre">{sujet}</h2>
          {corps ? (
            <p className="lin-ticket-desc c2e-corps">{corps}</p>
          ) : (
            <p className="lin-ticket-desc" data-vide="">
              {k.groupe === "a_valider" ? "Le texte est dans la file de validation." : "Le texte n'est plus conservé ici."}
            </p>
          )}
          <div className="lin-ticket-icones">
            {corps ? (
              <button type="button" className="lin-ticket-icone" aria-label="Copier le texte" title="Copier le texte" onClick={copierTexte}>
                <Copy aria-hidden="true" />
              </button>
            ) : null}
            {r && k.groupe === "a_envoyer" ? (
              <button type="button" className="lin-ticket-icone" aria-label="Noter l'envoi à la main" title="Noter l'envoi à la main" onClick={() => noter(r)}>
                <Send aria-hidden="true" />
              </button>
            ) : null}
            {k.groupe === "a_valider" ? (
              <Link href={`${RACINE}/validations`} className="lin-ticket-icone" aria-label="Ouvrir la file de validation" title="Ouvrir la file de validation">
                <CheckCheck aria-hidden="true" />
              </Link>
            ) : null}
            <Link href={lienCompte(k.compte_id)} className="lin-ticket-icone" aria-label="Ouvrir le débiteur" title="Ouvrir le débiteur">
              <Building2 aria-hidden="true" />
            </Link>
          </div>

          {factures.length ? (
            <ul className="lin-ticket-sous" aria-label={r?.nature === "devis" ? "Devis relancé" : "Factures relancées"}>
              {facturesVues.map((p) => (
                <li key={p.facture_id}>
                  <Link href={lienCompte(k.compte_id)} className="lin-ticket-sous-ligne" title={`${p.numero} : ouvrir le débiteur`}>
                    <IconeDocument />
                    <span className="lin-ticket-sous-ref">{p.numero}</span>
                    <span className="lin-ticket-sous-nom">{p.retard_jours > 0 ? `${p.retard_jours} j de retard` : "à échoir"}</span>
                    {factures.length > 1 ? <span className="lin-ticket-sous-meta">{montant(p.reste_du)}</span> : null}
                  </Link>
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
          <div className="lin-ticket-activite-tete" id="c2e-activite">
            <h3>Activité</h3>
            <button type="button" className="lin-ticket-lien" onClick={() => filtrer("debiteur", k.compte_id)}>
              Ses autres relances
            </button>
          </div>
          <Fil entrees={entrees} vide="Rien n'est encore arrivé à cette relance." />
        </article>

        <aside className="lin-ticket-cote" aria-label="Propriétés de la relance">
          <section className="lin-ticket-section">
            <h3>Propriétés</h3>
            <div className="lin-ticket-pilules">
              <span className="lin-ticket-pilule" title={`Colonne « ${LIBELLE[k.groupe]} »`}>
                <IconeColonne g={k.groupe} />
                {LIBELLE[k.groupe]}
                {/* l'état précis seulement quand il dit autre chose que la colonne (« écrite — envoi à régler », un bon de commande) */}
                {r?.etat === "non_reglee" || (cmd && k.groupe !== "arretee") ? <span className="c2e-gris">{libelleEtat.toLowerCase()}</span> : null}
              </span>
              {k.groupe === "arretee" ? (
                <span className="lin-ticket-pilule" data-bloquant={bloquante(k) ? "" : undefined} title={motif ?? undefined}>
                  <X aria-hidden="true" />
                  {libelleEtat}
                </span>
              ) : null}
              {r ? (
                <MenuOptions
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
                  <IconeNature nature={k.nature} />
                  {NATURES[k.nature]}
                </span>
              )}
              {r ? (
                <span className="lin-ticket-pilule" title="Montant relancé">
                  <HandCoins aria-hidden="true" />
                  {montant(r.montant)}
                </span>
              ) : null}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Envoi</h3>
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
              {k.canal ? (
                <MenuOptions
                  titre="Canal…"
                  declencheur={
                    <>
                      <Send aria-hidden="true" />
                      {k.canal}
                    </>
                  }
                  options={[{ cle: "canal", libelle: `Relances par « ${k.canal} »`, icone: <Send width={16} height={16} aria-hidden="true" />, action: () => filtrer("canal", k.canal as string) }]}
                  largeur={280}
                />
              ) : null}
              {r?.envoye_le ? (
                <span className="lin-ticket-pilule" title={`Partie le ${dateHeure(r.envoye_le)}`}>
                  <Clock aria-hidden="true" />
                  Partie le {jour(r.envoye_le)}
                </span>
              ) : (
                <span className="lin-ticket-pilule" data-vide="" title={`Écrite le ${jour(r?.jour ?? k.jour)}`}>
                  <Clock aria-hidden="true" />
                  Écrite le {jour(r?.jour ?? k.jour)}
                </span>
              )}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Débiteur</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                titre="Débiteur…"
                declencheur={
                  <>
                    <Building2 aria-hidden="true" />
                    {k.compte}
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
