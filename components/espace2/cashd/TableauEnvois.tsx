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
   l'autre, Entrée ouvre la carte AU MILIEU de l'écran (CarteCentrale, la
   même que la carte de décision d'« À valider », demande de Teo du 28/10) ;
   dedans, ← → passent d'une carte à l'autre, Échap la ferme. Glisser une carte « À envoyer » sur
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
import { Building2, CheckCheck, ClipboardList, Copy, Download, FileText, HandCoins, ListFilter, Mail, MessageSquare, PenLine, Plus, Send, SlidersHorizontal, Star, X } from "lucide-react";
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
import { Choix, Menu, MenuActions, useEpingles, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille, type NavCarte } from "../lin/CarteCentrale";
import { Note } from "../ui";
import { IconeEnveloppe, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
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

  /* ——— le clavier : ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre (le lien) ; la carte ouverte a le sien ——— */
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
      /* la carte ouverte au milieu a son propre clavier (← → , Échap) : le tableau se tait */
      if (choixRef.current) return;
      const grille = grilleRef.current;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const surCarte = cible?.closest?.<HTMLElement>(".lin-carte-tableau[data-carte]")?.dataset.carte ?? null;
      const depart = surCarte;
      if (!depart && !grille.some((c) => c.length)) return;
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

  /* ——— la carte ouverte, au milieu de l'écran (CarteCentrale, comme celle d'« À valider ») ——— */
  /* fermer retire ?id= (remplacement, même route) et rend le focus à la carte du tableau */
  const fermer = () => {
    const id = choix;
    aller({ id: null }, true);
    if (id) window.setTimeout(() => document.querySelector<HTMLElement>(`.lin-carte-tableau[data-carte="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }), 80);
  };
  /* l'ordre du tableau, colonne par colonne, de haut en bas */
  const ordre = grille.flat();
  const rangOuverte = ouverte ? ordre.indexOf(ouverte.cle) : -1;
  const nav =
    rangOuverte < 0
      ? null
      : {
          position: rangOuverte + 1,
          total: ordre.length,
          precedente: rangOuverte > 0 ? () => aller({ id: ordre[rangOuverte - 1] }, true) : undefined,
          suivante: rangOuverte < ordre.length - 1 ? () => aller({ id: ordre[rangOuverte + 1] }, true) : undefined,
        };
  const carteOuverte = ouverte ? (
    <CarteEnvoi
      key={`${source}:${ouverte.cle}`}
      k={ouverte}
      b={tous.find((x) => x.compte_id === ouverte.compte_id) ?? null}
      autres={relances.filter((x) => x.compte_id === ouverte.compte_id && x.id !== ouverte.cle).sort((x, y) => (y.envoye_le ?? y.jour).localeCompare(x.envoye_le ?? x.jour))}
      suivant={prochainPalier(ficheDe(ouverte.compte_id)?.suivi ?? [])}
      nav={nav}
      epingle={epingles.has(ouverte.cle)}
      epingler={() => epingler(ouverte.cle)}
      noter={noterEnvoi}
      trancher={(x, accepter) => trancher(x, ouverte.compte_id, accepter)}
      aller={aller}
      fermer={fermer}
      filtrer={(d, v) => aller({ filtre: ecrireFiltres({ ...filtres, [d]: v }), id: null }, true)}
    />
  ) : (
    <CarteCentrale
      ouverte={!!choix && !chargement}
      fermer={fermer}
      libelle="Relance introuvable"
      sur="CASHD · Envoi"
      gauche={
        <div className="v2-det-document-vide">
          <FileText width={22} height={22} aria-hidden="true" />
          Aucune pièce.
        </div>
      }
      titre="Cette relance n'est plus dans le tableau."
      actions={
        <button type="button" className="v2-btn v2-btn--fantome" onClick={fermer}>
          Fermer
        </button>
      }
    />
  );

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
      </div>
      {carteOuverte}
      {fenetreEnvoi}
    </div>
  );
}

/* le prochain palier prévu par le suivi des factures */
const prochainPalier = (suivi: Suivi[]) => suivi.filter((s) => s.palier_suivant && s.palier_suivant_le).sort((a, b) => (a.palier_suivant_le ?? "").localeCompare(b.palier_suivant_le ?? ""))[0] ?? null;

/* ══════════════════════════════════════════════════════════════════════
   La carte d'une relance, au milieu de l'écran : la même enveloppe que la
   carte de décision d'« À valider » (CarteCentrale).
     gauche  la lettre telle qu'elle part (ou les factures relancées, si le
             texte n'est plus conservé), puis sa référence et « Ouvrir le
             débiteur » ;
     droite  l'objet, le montant, la date de l'étape ; la fiche (ce
             qu'étaient les pilules), les factures, l'activité, ses autres
             relances ; la règle qui conditionne le geste contre les boutons ;
             les gestes, le principal en bleu, le reste dans « Plus
             d'actions ».
   « Noter l'envoi à la main » se règle dans la carte (le canal), comme
   les gestes de la carte d'« À valider » : une fenêtre par-dessus serait
   prise pour un clic hors de la carte, qui la refermerait.
   ══════════════════════════════════════════════════════════════════════ */
function CarteEnvoi({
  k,
  b,
  autres,
  suivant,
  nav,
  epingle,
  epingler,
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
  nav: NavCarte | null;
  epingle: boolean;
  epingler: () => void;
  noter: (r: Relance, canal: string) => Promise<void>;
  trancher: (x: ReponseLue, accepter: boolean) => Promise<void>;
  aller: Aller;
  fermer: () => void;
  filtrer: (d: string, v: string) => void;
}) {
  const toast = useToast();
  const [envoiOuvert, setEnvoiOuvert] = useState(false);
  const [canal, setCanal] = useState("email");
  const [enCours, setEnCours] = useState(false);
  const r = k.r;
  const cmd = k.c;
  const reponse = k.reponse ?? null;
  const sujet = r?.sujet ?? cmd?.sujet ?? (r ? libellePalier(r.palier) : NATURES.commande);
  const corps = r?.corps ?? cmd?.corps ?? null;
  const adresseDest = r?.destinataire_adresse ?? cmd?.destinataire_adresse ?? null;
  const nomDest = r?.destinataire_nom ?? cmd?.destinataire_nom ?? null;
  const motif = r?.motif ?? cmd?.motif ?? null;
  const libelleEtat = etatTexte(k);
  const factures = r?.pieces ?? [];
  const copierTexte = () => {
    copier(`${sujet}\n\n${corps ?? ""}`);
    toast("Texte copié : sujet et corps de la relance.", "vert");
  };
  const executer = async (f: () => Promise<void>) => {
    setEnCours(true);
    try {
      await f();
    } finally {
      setEnCours(false);
    }
  };
  const etape: { libelle: string; passe?: boolean; vide?: boolean } = suivant
    ? { libelle: `${libellePalier(suivant.palier_suivant)} le ${jour(suivant.palier_suivant_le)}`, passe: !!suivant.palier_suivant_le && suivant.palier_suivant_le < jourParis() }
    : b && b.statut !== "actif"
      ? { libelle: `Aucune relance : ${STATUTS_COMPTE[b.statut].libelle.toLowerCase()}`, vide: true }
      : { libelle: "Aucune étape prévue", vide: true };
  /* la date qui compte : celle de l'étape où en est la relance */
  const echeance =
    k.groupe === "partie" && r?.envoye_le
      ? { texte: `Partie le ${dateHeure(r.envoye_le)}` }
      : k.groupe === "repondue" && reponse
        ? { texte: `Réponse reçue le ${dateHeure(reponse.cree_le)}` }
        : { texte: `Écrite le ${jour(r?.jour ?? k.jour)}` };

  /* le fil : écrite, validée, partie ou arrêtée, et la réponse reçue */
  type Pas = { cle: string; icone: React.ReactNode; qui: string; quoi: string; le?: string | null; commentaire?: string | null; attente?: boolean };
  const fil: Pas[] = [];
  if (r) {
    const g = groupeDe(r, false);
    fil.push({ cle: "ecrite", icone: <PenLine width={12} height={12} />, qui: "CASHD", quoi: "a écrit la relance", le: r.jour });
    if (g === "a_valider") fil.push({ cle: "valider", icone: <CheckCheck width={12} height={12} />, qui: "À valider", quoi: "dans la file de validation", attente: true });
    else if (g === "a_envoyer" || r.etat === "envoyee")
      fil.push({ cle: "validee", icone: <CheckCheck width={12} height={12} />, qui: "Validée", quoi: g === "a_envoyer" ? "dans la file : à envoyer, puis noter l'envoi" : "dans la file", attente: g === "a_envoyer" });
    if (r.envoye_le)
      fil.push(
        r.envoi_main
          ? { cle: "partie", icone: <Send width={12} height={12} />, qui: "Envoyée à la main", quoi: `(${CANAUX_MAIN[r.envoi_main.canal] ?? r.envoi_main.canal})`, le: r.envoye_le, commentaire: r.envoi_main.note }
          : { cle: "partie", icone: <Send width={12} height={12} />, qui: "CASHD", quoi: `l'a envoyée (${canalDe(r)})`, le: r.envoye_le },
      );
    else if (g === "arretee") fil.push({ cle: "arret", icone: <X width={12} height={12} />, qui: libelleEtat, quoi: motif ?? "" });
  } else if (cmd) {
    fil.push({ cle: "ecrite", icone: <PenLine width={12} height={12} />, qui: "CASHD", quoi: "a écrit la relance du bon de commande, pour le service qui l'émet (pas la comptabilité)", le: cmd.jour });
    fil.push({ cle: "etat", icone: <ClipboardList width={12} height={12} />, qui: libelleEtat, quoi: motif ?? "" });
  }
  if (reponse)
    fil.push({
      cle: reponse.id,
      icone: <MessageSquare width={12} height={12} />,
      qui: "Réponse reçue",
      quoi: reponse.lecture !== "autre" ? LECTURES[reponse.lecture].toLowerCase() : "",
      le: reponse.cree_le,
      commentaire: reponse.indice ? `« ${reponse.indice} »` : null,
      attente: true,
    });

  /* « Plus d'actions » : les gestes qui n'ont pas de place dans le pied */
  const plus: Option[] = [
    { cle: "epingle", libelle: epingle ? "Désépingler" : "Épingler en haut de sa colonne", icone: <Star width={16} height={16} fill={epingle ? "currentColor" : "none"} aria-hidden="true" />, action: epingler },
    ...(corps && k.groupe === "repondue" ? [{ cle: "copier", libelle: "Copier le texte", icone: <Copy width={16} height={16} aria-hidden="true" />, action: copierTexte }] : []),
    { cle: "debiteur", libelle: "Ouvrir le débiteur", meta: b ? STATUTS_COMPTE[b.statut].libelle : undefined, icone: <Building2 width={16} height={16} aria-hidden="true" />, href: lienCompte(k.compte_id) },
    { cle: "toutes", libelle: "Toutes ses relances", icone: <MessageSquare width={16} height={16} aria-hidden="true" />, action: () => filtrer("debiteur", k.compte_id) },
    ...(r ? [{ cle: "palier", libelle: `Relances au palier « ${libellePalier(r.palier)} »`, icone: <Losange atteint />, action: () => filtrer("palier", r.palier) }] : []),
    ...(k.canal ? [{ cle: "canal", libelle: `Relances par « ${k.canal} »`, icone: <Send width={16} height={16} aria-hidden="true" />, action: () => filtrer("canal", k.canal as string) }] : []),
    ...(adresseDest
      ? [
          { cle: "ecrire", libelle: "Écrire un e-mail au destinataire", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${adresseDest}`) },
          { cle: "adresse", libelle: "Copier l'adresse", meta: adresseDest, icone: <Copy width={16} height={16} aria-hidden="true" />, action: () => copier(adresseDest) },
        ]
      : []),
  ];
  const menuPlus = (
    <span className="v2 c2e-plus">
      <span className="lin c2e-plus">
        <MenuActions rond titre="Plus d'actions" options={plus} />
      </span>
    </span>
  );

  /* les boutons du pied : le geste principal en bleu */
  let actions: React.ReactNode;
  if (envoiOuvert && r) {
    actions = (
      <>
        <button type="button" className="v2-btn v2-btn--primaire" disabled={enCours} onClick={() => void executer(() => noter(r, canal)).then(() => setEnvoiOuvert(false))}>
          {enCours ? <Loader variant="spin" /> : <Send width={16} height={16} aria-hidden="true" />} Confirmer l&apos;envoi
        </button>
        <button type="button" className="v2-btn v2-btn--fantome" disabled={enCours} onClick={() => setEnvoiOuvert(false)}>
          Retour
        </button>
      </>
    );
  } else if (k.groupe === "a_envoyer" && r) {
    actions = (
      <>
        <button type="button" className="v2-btn v2-btn--primaire" onClick={() => setEnvoiOuvert(true)}>
          <Send width={16} height={16} aria-hidden="true" /> Noter l&apos;envoi à la main
        </button>
        {corps ? (
          <button type="button" className="v2-btn v2-btn--fantome" onClick={copierTexte}>
            <Copy width={15} height={15} aria-hidden="true" /> Copier le texte
          </button>
        ) : null}
        {menuPlus}
      </>
    );
  } else if (k.groupe === "repondue" && reponse) {
    actions = (
      <>
        {reponse.proposition !== "aucune" ? (
          <button type="button" className="v2-btn v2-btn--primaire" disabled={enCours} onClick={() => void executer(() => trancher(reponse, true))}>
            {enCours ? <Loader variant="spin" /> : <CheckCheck width={16} height={16} aria-hidden="true" />} Accepter
          </button>
        ) : null}
        <button type="button" className={reponse.proposition === "aucune" ? "v2-btn v2-btn--primaire" : "v2-btn v2-det-btn-danger"} disabled={enCours} onClick={() => void executer(() => trancher(reponse, false))}>
          {reponse.proposition === "aucune" ? <CheckCheck width={16} height={16} aria-hidden="true" /> : <X width={16} height={16} aria-hidden="true" />}
          {reponse.proposition === "aucune" ? " Lue" : " Écarter"}
        </button>
        {menuPlus}
      </>
    );
  } else if (k.groupe === "a_valider") {
    actions = (
      <>
        <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--primaire">
          <CheckCheck width={16} height={16} aria-hidden="true" /> Ouvrir la file de validation
        </Link>
        {corps ? (
          <button type="button" className="v2-btn v2-btn--fantome" onClick={copierTexte}>
            <Copy width={15} height={15} aria-hidden="true" /> Copier le texte
          </button>
        ) : null}
        {menuPlus}
      </>
    );
  } else {
    actions = (
      <>
        {corps ? (
          <button type="button" className="v2-btn v2-btn--fantome" onClick={copierTexte}>
            <Copy width={15} height={15} aria-hidden="true" /> Copier le texte
          </button>
        ) : null}
        <button type="button" className="v2-btn v2-btn--fantome" onClick={() => filtrer("debiteur", k.compte_id)}>
          <MessageSquare width={15} height={15} aria-hidden="true" /> Toutes ses relances
        </button>
        {menuPlus}
      </>
    );
  }

  /* contre les boutons : la règle qui conditionne le geste */
  const notes = envoiOuvert ? (
    <Note teinte="bleu">
      <label className="v2-libelle c2e-canal">
        Envoyée par
        <select className="v2-det-champ" value={canal} onChange={(e) => setCanal(e.target.value)} autoFocus>
          {Object.entries(CANAUX_MAIN).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      La relance comptera comme partie, à cette date.
    </Note>
  ) : k.groupe === "a_valider" ? (
    <Note teinte="bleu">Une relance ne part qu&apos;une fois validée dans la file de validation : rien n&apos;est parti.</Note>
  ) : k.groupe === "a_envoyer" ? (
    <Note teinte="bleu">Validée, mais l&apos;envoi du module est coupé : envoyez-la vous-même, puis notez l&apos;envoi. Elle comptera comme partie, à cette date.</Note>
  ) : k.groupe === "repondue" && reponse ? (
    <Note teinte="ambre">
      <strong>{LECTURES[reponse.lecture]}.</strong> Proposé : {PROPOSITIONS[reponse.proposition]}.
    </Note>
  ) : !adresseDest ? (
    <Note teinte="ambre">La relance ne peut pas partir sans adresse.</Note>
  ) : null;

  return (
    <CarteCentrale
      ouverte
      fermer={fermer}
      libelle={`Relance : ${sujet}`}
      sur={`CASHD · ${NATURES[k.nature]}`}
      statut={
        <>
          <IconeColonne g={k.groupe} />
          {LIBELLE[k.groupe]}
          {r?.etat === "non_reglee" || (cmd && k.groupe !== "arretee") || k.groupe === "arretee" ? <span className="v2-det-sous"> · {libelleEtat.toLowerCase()}</span> : null}
        </>
      }
      nav={nav}
      gauche={
        <Feuille
          titre={r ? libellePalier(r.palier).toUpperCase() : "BON DE COMMANDE"}
          sous={`Écrite le ${jour(r?.jour ?? k.jour)}`}
          nom={nomDest ?? k.compte}
          sousNom={[adresseDest ?? "Aucune adresse", ...(nomDest && nomDest !== k.compte ? [k.compte] : [])]}
          texte={corps ? `Objet : ${sujet}\n\n${corps}` : null}
          lignes={corps ? undefined : factures.map((p): [string, string] => [`${p.numero}${p.retard_jours > 0 ? ` · ${p.retard_jours} j de retard` : ""}`, montant(p.reste_du)])}
          total={!corps && r ? ["Total relancé", montant(r.montant)] : null}
        />
      }
      piedGauche={
        <>
          <div className="v2-det-document-ligne">
            {factures.length ? <span className="v2-det-mono">{factures.map((p) => p.numero).join(", ")}</span> : null}
            <span className="v2-det-sous">{[libelleEtat, k.canal].filter(Boolean).join(" · ")}</span>
          </div>
          <div className="v2-det-document-ligne">
            <span className="v2-det-sous">
              {k.compte}
              {b ? ` · ${STATUTS_COMPTE[b.statut].libelle.toLowerCase()}` : ""}
            </span>
            <Link href={lienCompte(k.compte_id)} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
              <Building2 width={14} height={14} aria-hidden="true" /> Ouvrir le débiteur
            </Link>
          </div>
        </>
      }
      titre={sujet}
      chiffre={r ? montant(r.montant) : null}
      echeance={echeance}
      notes={notes}
      actions={actions}
    >
      <dl className="v2-det-fiche">
        <dt>Débiteur</dt>
        <dd>
          {k.compte}
          {b ? <span className="v2-det-sous"> · {STATUTS_COMPTE[b.statut].libelle}</span> : null}
        </dd>
        <dt>{r ? "Palier" : "Nature"}</dt>
        <dd>{r ? libellePalier(r.palier) : NATURES[k.nature]}</dd>
        <dt>Destinataire</dt>
        <dd>
          {adresseDest ? (
            <>
              {nomDest ?? adresseDest}
              {nomDest ? <span className="v2-det-sous"> · {adresseDest}</span> : null}
            </>
          ) : (
            <span className="v2-det-sous">Aucune adresse</span>
          )}
        </dd>
        {k.canal ? (
          <>
            <dt>Canal</dt>
            <dd>{k.canal}</dd>
          </>
        ) : null}
        <dt>État</dt>
        <dd>
          {libelleEtat}
          {motif ? <span className="v2-det-sous"> · {motif}</span> : null}
        </dd>
        <dt>Prochaine étape</dt>
        <dd className={etape.passe ? "c2e-passe" : etape.vide ? "v2-det-sous" : undefined}>{etape.libelle}</dd>
      </dl>

      {factures.length && corps ? (
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">
            {r?.nature === "devis" ? "Devis relancé" : "Factures relancées"}
            <small>{factures.length}</small>
          </h3>
          <dl className="v2-det-fiche">
            {factures.map((p) => (
              <div key={p.facture_id} style={{ display: "contents" }}>
                <dt className="v2-det-mono">{p.numero}</dt>
                <dd>
                  {montant(p.reste_du)}
                  <span className="v2-det-sous"> · {p.retard_jours > 0 ? `${p.retard_jours} j de retard` : "à échoir"}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="v2-det-bloc">
        <h3 className="v2-det-section-titre">Activité</h3>
        <ol className="v2-det-fil">
          {fil.map((x) => (
            <li key={x.cle} data-attente={x.attente ? "" : undefined}>
              <span className="v2-det-fil-avatar" aria-hidden="true">
                {x.icone}
              </span>
              <div>
                <div className="v2-det-fil-texte">
                  <strong>{x.qui}</strong>
                  <span>
                    {x.quoi}
                    {x.le ? ` · ${jour(x.le)}` : ""}
                  </span>
                </div>
                {x.commentaire ? <p className="v2-det-fil-commentaire">{x.commentaire}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {autres.length ? (
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">
            Ses autres relances
            <small>{autres.length}</small>
          </h3>
          <ul className="c2e-autres">
            {autres.map((x) => (
              <li key={x.id}>
                <button type="button" className="c2e-autre" onClick={() => aller({ id: x.id }, true)}>
                  <span>{libellePalier(x.palier)}</span>
                  <span className="v2-det-sous">
                    {(ETATS_RELANCE[x.etat] ?? ETATS_RELANCE.preparee).libelle.toLowerCase()} · {jour(x.envoye_le ?? x.jour)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </CarteCentrale>
  );
}
