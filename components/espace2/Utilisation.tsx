"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Utilisation » — la page d'un cycle de Linear, au 1:1 (28/10/2026)

   06/10 : première page de suivi, sur le modèle « Usage » de Vercel.
   22/10 : la page Usage de l'organisation Supabase (gabarit ./sb).
   28/10 : demande de Teo, recopier la page d'un cycle de Linear (équipe
   Omega › Cycles › Cycle 1, relevée dans son espace après y avoir activé
   les cycles et rempli le cycle courant : scratchpad/releve-linear-cycle.md).
   La barre du titre porte le fil « Utilisation › Période › 30 derniers
   jours ▾ » (le sélecteur de cycle de Linear = notre choix de période) et
   le « ··· » des liens de l'ancienne page ; la barre d'outils compte les
   lignes, filtre par groupe et replie le panneau ; la liste à gauche est
   groupée comme les tickets d'un cycle (documents reçus, factures émises,
   règlements, demandes reçues, décisions prises, en attente de décision :
   les chiffres de l'ancienne page, ligne par ligne) ; le panneau de
   droite est la carte du cycle : pastilles (source, bornes), titre,
   résumé, section « Progress » (trois chiffres, courbes cumulées de la
   période, axe), onglets de répartition et leurs lignes.

   Ce qui est compté vient des mêmes données que la vue d'ensemble
   (./donnees.ts : exemple ou base réelle) : documents reçus, montants
   facturés et payés (FILED), demandes et décisions (validations). Les
   menus agissent en place (?periode=, ?mesure=, ?repartition=, ?groupe=,
   ?panneau=0). Gabarit : ../lin/lin.css (barre du titre, barre d'outils,
   menus) ; le reste : ../lin/linear-cycle.css (préfixe lcy-).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Banknote, Building2, Check, ChevronDown, ChevronRight, FileText, Inbox, ListFilter, PanelRight, Receipt, Tag } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { montant } from "@/components/espace/format";
import { ETATS } from "@/components/espace/filed/etats";
import { STATUTS } from "@/components/espace/validations/regles";
import type { Demande } from "@/components/espace/types";
import { PERIODES, type Periode } from "./Suivi";
import { Note, Squelette } from "./ui";
import { useDonnees, type Doc } from "./donnees";
import { A_PAYER, du } from "./filed/calculs";
import { useAujourdhui } from "./horloge";
import { RACINE } from "./modules";
import { Menu, MenuActions, MenuOptions, type Option } from "./lin/Lin";
import { IconeJauge, IconeStatutProjet, type EtatProjet } from "./lin/icones";
import "./lin/linear-cycle.css";

const JOUR = 86_400_000;
const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const euros = (n: number) => montant(Math.round(n * 100) / 100);
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const pctTexte = (p: number) => (p > 0 && p < 1 ? "<1 %" : `${Math.round(p)} %`);
const pluriel = (n: number, un: string, des: string) => `${nombre(n)} ${n > 1 ? des : un}`;
/* « 28 oct. » : la date courte de Linear, sans l'année si c'est la nôtre */
const jourCourt = (t: number, annee?: boolean) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: annee ? "numeric" : undefined });
const jourDeIso = (iso: string) => jourCourt(new Date(iso).getTime(), new Date(iso).getFullYear() !== new Date().getFullYear());

type Mesure = "documents" | "demandes" | "montants";
type Repartition = "fournisseurs" | "etats" | "types" | "decisions";
type Groupe = "docs" | "factures" | "reglements" | "demandes" | "decisions" | "attente";
const MESURES: { cle: Mesure; libelle: string }[] = [
  { cle: "documents", libelle: "Documents" },
  { cle: "demandes", libelle: "Demandes" },
  { cle: "montants", libelle: "Montants" },
];
const REPARTITIONS: { cle: Repartition; libelle: string }[] = [
  { cle: "fournisseurs", libelle: "Fournisseurs" },
  { cle: "etats", libelle: "États" },
  { cle: "types", libelle: "Types" },
  { cle: "decisions", libelle: "Décisions" },
];
const ICI = `${RACINE}/utilisation`;

/* l'état d'un document ou d'une demande, dans l'hexagone de statut de Linear */
const ETAT_DOC: Record<string, EtatProjet> = { en_lecture: "planifie", a_classer: "planifie", a_traiter: "en-cours", classe: "fait", integre: "fait", illisible: "annule", doublon: "annule" };
const ETAT_DEMANDE: Record<Demande["statut"], EtatProjet> = { en_attente: "en-cours", approuvee: "fait", executee: "fait", rejetee: "annule", annulee: "annule", expiree: "annule", echec_execution: "annule" };
const CLASSE = new Set(["classe", "integre"]);
const A_TRAITER_DOC = new Set(["a_traiter", "a_classer", "en_lecture"]);
const TYPES_ACTION: Record<string, string> = { virement: "Virement", paiement_facture: "Facture à payer", iban: "IBAN à confirmer", anomalie: "Anomalie", relance: "Relance", autre: "Autre" };
const libelleType = (t: string) => TYPES_ACTION[t] ?? t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const libelleEtatDoc = (e: string) => (e in ETATS ? ETATS[e as keyof typeof ETATS].libelle : e);

/* une courbe cumulée, un point par jour de la période (du plus ancien à aujourd'hui) */
function cumul<T>(items: T[], date: (t: T) => string | null | undefined, valeur: (t: T) => number, depuis: number, jours: number): number[] {
  const parJour = new Array<number>(jours).fill(0);
  for (const t of items) {
    const iso = date(t);
    if (!iso) continue;
    const i = Math.floor((new Date(iso).getTime() - depuis) / JOUR);
    if (i >= 0 && i < jours) parJour[i] += valeur(t);
  }
  let total = 0;
  return parJour.map((v) => (total += v));
}

type Ligne = { id: string; ref: string; titre: string; etat: EtatProjet; etatLibelle: string; montant?: string; pilule?: string; date: string | null; href: string; aTraiter?: boolean; passe?: boolean };
type GroupeLignes = { cle: Groupe; anchor: string; titre: string; icone: React.ReactNode; href: string; hrefLibelle: string; teinte?: "jaune"; badge?: string; lignes: Ligne[] };
type Part = { cle: string; nom: string; icone: React.ReactNode; pct: number; n: number; second?: boolean };
type Serie = { libelle: string; valeurs: number[] };
type Series = { libelle: string; format: (n: number) => string; scope: Serie; jaune: Serie; bleu: Serie };

/* la largeur réelle du graphique, pour dessiner en pixels (points ronds, traits de 1.5 non étirés) */
function useLargeur<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [l, setL] = useState(403);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lire = () => setL(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    lire();
    const ro = new ResizeObserver(lire);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, l];
}

/* ——— le graphique du cycle : scope (gris, aire), commencé (jaune), terminé (bleu), week-ends hachurés, repère du jour ——— */
function GraphiqueCycle({ series, depuis, jours }: { series: Series; depuis: number; jours: number }) {
  const [ref, L] = useLargeur<HTMLDivElement>();
  const H = 169;
  const n = jours;
  const { scope, jaune, bleu, libelle, format } = series;
  const max = Math.max(1, ...scope.valeurs, ...jaune.valeurs, ...bleu.valeurs);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * L : L);
  const y = (v: number) => H - 0.5 - (v / max) * (H - 1);
  const trace = (s: number[]) => s.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const aire = (s: number[]) => `${trace(s)} L${L},${H} L0,${H} Z`;
  /* les bandes de week-end : du samedi au dimanche, un demi-jour de chaque côté */
  const dx = n > 1 ? L / (n - 1) : L;
  const bandes: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const j = new Date(depuis + i * JOUR).getDay();
    if (j === 6) bandes.push([Math.max(0, x(i) - dx / 2), Math.min(L, x(Math.min(n - 1, i + 1)) + dx / 2)]);
    else if (j === 0 && i === 0) bandes.push([0, Math.min(L, x(i) + dx / 2)]);
  }
  const dernier = n - 1;
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <figure className="lcy-graphique" ref={ref}>
      <svg
        viewBox={`0 0 ${L} ${H}`}
        width={L}
        height={H}
        role="img"
        aria-label={`${libelle} : ${scope.libelle} ${format(scope.valeurs[dernier] ?? 0)}, ${jaune.libelle} ${format(jaune.valeurs[dernier] ?? 0)}, ${bleu.libelle} ${format(bleu.valeurs[dernier] ?? 0)} sur la période`}
      >
        <defs>
          <pattern id={`lcy-h${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--lin-trait)" strokeWidth="2" />
          </pattern>
        </defs>
        {jours <= 120 ? bandes.map(([a, b], i) => <rect key={i} x={a} y={0} width={Math.max(0, b - a)} height={H} fill={`url(#lcy-h${id})`} />) : null}
        <path d={aire(scope.valeurs)} fill="var(--lin-survol)" />
        <path d={trace(scope.valeurs)} fill="none" stroke="var(--lin-graph-gris)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={aire(bleu.valeurs)} fill="var(--lin-graph-bleu)" fillOpacity="0.12" />
        <path d={trace(jaune.valeurs)} fill="none" stroke="var(--lin-graph-jaune)" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={trace(bleu.valeurs)} fill="none" stroke="var(--lin-graph-bleu)" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1={x(dernier)} x2={x(dernier)} y1={0} y2={H} stroke="var(--lin-graph-gris)" strokeWidth="1" strokeOpacity="0.5" />
        <line x1={0} x2={L} y1={H - 0.5} y2={H - 0.5} stroke="var(--lin-trait)" strokeWidth="1" />
        <circle cx={x(dernier)} cy={y(jaune.valeurs[dernier] ?? 0)} r="4" fill="var(--lin-graph-jaune)" />
        <circle cx={x(dernier)} cy={y(bleu.valeurs[dernier] ?? 0)} r="4" fill="var(--lin-graph-bleu)" />
      </svg>
    </figure>
  );
}

/* l'axe : la première date, la dernière, et les lundis (≤ 30 jours) ou les premiers du mois entre les deux */
function AxeCycle({ depuis, jours }: { depuis: number; jours: number }) {
  const marques: { i: number; texte: string }[] = [];
  for (let i = 1; i < jours - 1; i++) {
    const d = new Date(depuis + i * JOUR);
    const ok = jours <= 30 ? d.getDay() === 1 : jours <= 120 ? d.getDate() === 1 : d.getDate() === 1 && d.getMonth() % 3 === 0;
    if (ok && i / (jours - 1) > 0.08 && i / (jours - 1) < 0.92) marques.push({ i, texte: jourCourt(d.getTime()) });
  }
  const fin = depuis + (jours - 1) * JOUR;
  return (
    <div className="lcy-axe" aria-hidden="true">
      <span data-pos="debut">{jourCourt(depuis, jours > 120)}</span>
      {marques.map((m) => (
        <span key={m.i} data-pos="milieu" style={{ left: `${(m.i / (jours - 1)) * 100}%` }}>
          {m.texte}
        </span>
      ))}
      <span data-pos="fin">{jourCourt(fin)}</span>
    </div>
  );
}

/* l'anneau de part d'une ligne de répartition (16 px, comme sur Linear) */
function Anneau({ part }: { part: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={r} fill="none" stroke="var(--lin-trait)" strokeWidth="1.6" />
      {part > 0 ? (
        <circle cx="8" cy="8" r={r} fill="none" stroke="var(--lin-graph-bleu)" strokeWidth="1.6" strokeDasharray={`${(Math.min(100, part) / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 8 8)" />
      ) : null}
    </svg>
  );
}

/* l'icône de cycle de Linear : un cercle, le triangle « lecture » dedans */
function IconeCycle() {
  return (
    <svg className="lcy-ic-cycle" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.6 5.6v4.8L10.4 8z" fill="currentColor" />
    </svg>
  );
}

const icone = (I: typeof FileText) => <I width={16} height={16} strokeWidth={1.8} aria-hidden="true" />;

export default function Utilisation() {
  const { donnees, erreur } = useDonnees();
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const periode: Periode = PERIODES.find((p) => p.cle === params.get("periode")) ?? PERIODES[1];
  const mesure: Mesure = MESURES.find((x) => x.cle === params.get("mesure"))?.cle ?? "documents";
  const repartition: Repartition = REPARTITIONS.find((r) => r.cle === params.get("repartition"))?.cle ?? "fournisseurs";
  const groupeFiltre = params.get("groupe") as Groupe | null;
  const sansPanneau = params.get("panneau") === "0";
  const [replies, setReplies] = useState<Set<Groupe>>(() => new Set());

  /* les menus agissent en place : le paramètre change, la route reste */
  const poser = (cle: string, valeur: string | null) => {
    const q = new URLSearchParams(params.toString());
    if (valeur === null) q.delete(cle);
    else q.set(cle, valeur);
    const s = q.toString();
    routeur.replace(s ? `${ICI}?${s}` : ICI, { scroll: false });
  };

  /* 21/10 — l'horloge du navigateur (horloge.ts) : null au rendu serveur, les squelettes en attendant */
  const aujourdhui = useAujourdhui();
  const depuis = aujourdhui === null ? null : aujourdhui - periode.jours * JOUR + JOUR;

  const m = useMemo(() => {
    if (!donnees || depuis === null) return null;
    const dans = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() >= depuis;
    const j = periode.jours;
    const nomFournisseur = (id: string | null) => (id ? (donnees.vue.fournisseurs.find((f) => f.id === id)?.nom ?? null) : null);
    const docs = donnees.docs.filter((d) => dans(d.recu_le));
    const emises = donnees.vue.factures.filter((f) => f.nature !== "avoir" && dans(f.date_emission));
    const aPayer = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
    const reglees = aPayer.filter((f) => dans(donnees.etats[f.id]?.dernier_le));
    const demandes = donnees.demandes.filter((d) => dans(d.cree_le));
    const decisions = donnees.demandes.filter((d) => dans(d.decide_le));
    const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");
    const resteEmises = emises.filter((f) => A_PAYER.has(f.statut) && donnees.etats[f.id]?.etat !== "payee");

    /* les trois mesures du graphique : scope (gris) · commencé (jaune) · terminé (bleu), cumulés jour par jour */
    const series: Record<Mesure, Series> = {
      documents: {
        libelle: "Documents reçus",
        format: nombre,
        scope: {
          libelle: "Reçus",
          valeurs: cumul(
            docs,
            (d) => d.recu_le,
            () => 1,
            depuis,
            j,
          ),
        },
        jaune: {
          libelle: "À traiter",
          valeurs: cumul(
            docs.filter((d) => A_TRAITER_DOC.has(d.etat)),
            (d) => d.recu_le,
            () => 1,
            depuis,
            j,
          ),
        },
        bleu: {
          libelle: "Classés",
          valeurs: cumul(
            docs.filter((d) => CLASSE.has(d.etat)),
            (d) => d.recu_le,
            () => 1,
            depuis,
            j,
          ),
        },
      },
      demandes: {
        libelle: "Demandes de validation",
        format: nombre,
        scope: {
          libelle: "Reçues",
          valeurs: cumul(
            demandes,
            (d) => d.cree_le,
            () => 1,
            depuis,
            j,
          ),
        },
        jaune: {
          libelle: "En attente",
          valeurs: cumul(
            demandes.filter((d) => d.statut === "en_attente"),
            (d) => d.cree_le,
            () => 1,
            depuis,
            j,
          ),
        },
        bleu: {
          libelle: "Décidées",
          valeurs: cumul(
            decisions,
            (d) => d.decide_le,
            () => 1,
            depuis,
            j,
          ),
        },
      },
      montants: {
        libelle: "Montants facturés",
        format: euros,
        scope: {
          libelle: "Facturé",
          valeurs: cumul(
            emises,
            (f) => f.date_emission,
            (f) => f.montant_ttc ?? 0,
            depuis,
            j,
          ),
        },
        jaune: {
          libelle: "À payer",
          valeurs: cumul(
            resteEmises,
            (f) => f.date_emission,
            (f) => donnees.etats[f.id]?.reste ?? du(f),
            depuis,
            j,
          ),
        },
        bleu: {
          libelle: "Payé",
          valeurs: cumul(
            reglees,
            (f) => donnees.etats[f.id]?.dernier_le,
            (f) => donnees.etats[f.id]?.regle ?? 0,
            depuis,
            j,
          ),
        },
      },
    };

    /* les répartitions du panneau : part (anneau) et compte, comme « 35 % of 13 » sur Linear */
    const compter = <T,>(items: T[], cle: (t: T) => string, nom: (t: T) => string, fait: (t: T) => boolean, dessin: (cle: string, nom: string) => React.ReactNode, second?: (cle: string) => boolean): Part[] => {
      const parts = new Map<string, { nom: string; n: number; faits: number }>();
      for (const t of items) {
        const k = cle(t);
        const p = parts.get(k) ?? { nom: nom(t), n: 0, faits: 0 };
        p.n += 1;
        if (fait(t)) p.faits += 1;
        parts.set(k, p);
      }
      return [...parts.entries()]
        .sort((a, b) => b[1].n - a[1].n || a[1].nom.localeCompare(b[1].nom, "fr"))
        .map(([k, p]) => ({ cle: k, nom: p.nom, icone: dessin(k, p.nom), pct: pct(p.faits, p.n), n: p.n, second: second?.(k) }));
    };
    const initiale = (nom: string) => (
      <span className="lcy-initiale">
        {nom
          .replace(/^[^A-Za-zÀ-ÿ0-9]+/, "")
          .slice(0, 1)
          .toUpperCase() || "?"}
      </span>
    );
    const repartitions: Record<Repartition, Part[]> = {
      fournisseurs: compter(
        docs,
        (d) => d.fournisseur ?? "",
        (d) => d.fournisseur ?? "Sans fournisseur",
        (d) => CLASSE.has(d.etat),
        (k, nom) => (k ? initiale(nom) : icone(Building2)),
        (k) => !k,
      ),
      etats: compter(
        docs,
        (d) => d.etat,
        (d) => libelleEtatDoc(d.etat),
        () => true,
        (k) => <IconeStatutProjet etat={ETAT_DOC[k] ?? "planifie"} />,
      ).map((p) => ({ ...p, pct: pct(p.n, docs.length) })),
      types: compter(
        demandes,
        (d) => d.type_action,
        (d) => libelleType(d.type_action),
        (d) => d.statut !== "en_attente",
        () => icone(Tag),
      ),
      decisions: compter(
        decisions,
        (d) => d.statut,
        (d) => STATUTS[d.statut]?.libelle ?? d.statut,
        () => true,
        (k) => <IconeStatutProjet etat={ETAT_DEMANDE[k as Demande["statut"]] ?? "fait"} />,
      ).map((p) => ({ ...p, pct: pct(p.n, decisions.length) })),
    };

    /* la liste : un groupe par chiffre de l'ancienne page, une ligne par pièce ou demande */
    const ligneDoc = (d: Doc): Ligne => ({
      id: `doc-${d.id}`,
      ref: d.reference,
      titre: d.fournisseur ?? "Sans fournisseur",
      etat: ETAT_DOC[d.etat] ?? "planifie",
      etatLibelle: libelleEtatDoc(d.etat),
      montant: d.montant !== null ? montant(d.montant, d.devise) : undefined,
      date: d.recu_le,
      href: `${RACINE}/filed?objet=${encodeURIComponent(d.id)}`,
    });
    const ligneDemande = (d: Demande, date: string | null): Ligne => ({
      id: `dem-${d.id}-${date ?? ""}`,
      ref: d.module ? d.module.toUpperCase() : "—",
      titre: d.resume,
      etat: ETAT_DEMANDE[d.statut] ?? "planifie",
      etatLibelle: STATUTS[d.statut]?.libelle ?? d.statut,
      montant: d.montant !== null ? montant(d.montant, d.devise) : undefined,
      pilule: libelleType(d.type_action),
      date,
      href: `${RACINE}/validations`,
      aTraiter: d.statut === "en_attente",
      passe: d.statut === "en_attente" && !!d.echeance && new Date(d.echeance).getTime() < depuis + (j - 1) * JOUR,
    });
    const parDateDesc = (a: Ligne, b: Ligne) => (b.date ?? "").localeCompare(a.date ?? "");
    const groupes: GroupeLignes[] = [
      { cle: "docs", anchor: "documents", titre: "Documents reçus", icone: icone(FileText), href: `${RACINE}/filed`, hrefLibelle: "Ouvrir Documents reçus", lignes: docs.map(ligneDoc).sort(parDateDesc) },
      {
        cle: "factures",
        anchor: "facture",
        titre: "Factures émises",
        icone: icone(Receipt),
        href: `${RACINE}/filed/a-payer`,
        hrefLibelle: "Ouvrir À payer",
        lignes: emises
          .map<Ligne>((f) => {
            const payee = donnees.etats[f.id]?.etat === "payee";
            return {
              id: `fac-${f.id}`,
              ref: f.numero ?? f.reference ?? "—",
              titre: nomFournisseur(f.fournisseur_id) ?? "Sans fournisseur",
              etat: payee ? "fait" : A_PAYER.has(f.statut) ? "en-cours" : "planifie",
              etatLibelle: payee ? "Payée" : A_PAYER.has(f.statut) ? "À payer" : f.statut,
              montant: montant(f.montant_ttc, f.devise),
              date: f.date_emission,
              href: `${RACINE}/filed/a-payer`,
            };
          })
          .sort(parDateDesc),
      },
      {
        cle: "reglements",
        anchor: "paye",
        titre: "Règlements notés",
        icone: icone(Banknote),
        href: `${RACINE}/filed/a-payer`,
        hrefLibelle: "Ouvrir À payer",
        lignes: reglees
          .map<Ligne>((f) => {
            const e = donnees.etats[f.id];
            return {
              id: `reg-${f.id}`,
              ref: f.numero ?? f.reference ?? "—",
              titre: nomFournisseur(f.fournisseur_id) ?? "Sans fournisseur",
              etat: e?.etat === "payee" ? "fait" : "en-cours",
              etatLibelle: e?.etat === "payee" ? "Payée" : "Réglée en partie",
              montant: montant(e?.regle ?? 0, f.devise),
              pilule: e && e.nb_reglements > 1 ? `${e.nb_reglements} règlements` : undefined,
              date: e?.dernier_le ?? null,
              href: `${RACINE}/filed/a-payer`,
            };
          })
          .sort(parDateDesc),
      },
      {
        cle: "demandes",
        anchor: "demandes",
        titre: "Demandes reçues",
        icone: icone(Inbox),
        href: `${RACINE}/validations`,
        hrefLibelle: "Ouvrir À valider",
        lignes: demandes.map((d) => ligneDemande(d, d.cree_le)).sort(parDateDesc),
      },
      {
        cle: "decisions",
        anchor: "decisions",
        titre: "Décisions prises",
        icone: <Check width={16} height={16} strokeWidth={2} aria-hidden="true" />,
        href: `${RACINE}/validations`,
        hrefLibelle: "Ouvrir À valider",
        lignes: decisions.map((d) => ligneDemande(d, d.decide_le)).sort(parDateDesc),
      },
      {
        cle: "attente",
        anchor: "attente",
        titre: "En attente de décision",
        icone: <IconeStatutProjet etat="en-cours" />,
        href: `${RACINE}/validations`,
        hrefLibelle: "Ouvrir À valider",
        teinte: "jaune",
        badge: enAttente.length ? "À traiter" : undefined,
        lignes: enAttente.map((d) => ligneDemande(d, d.cree_le)).sort(parDateDesc),
      },
    ];

    return { docs: docs.length, demandes: demandes.length, series, repartitions, groupes };
  }, [donnees, depuis, periode.jours]);

  const attente = <Squelette largeur={96} hauteur={14} />;
  const bornes = depuis !== null && aujourdhui !== null ? { de: jourCourt(depuis, periode.jours > 120), a: jourCourt(aujourdhui) } : null;
  const serie = m ? m.series[mesure] : null;
  const dernier = periode.jours - 1;
  const valeur = (s: Serie) => s.valeurs[dernier] ?? 0;
  const groupesVisibles = m ? m.groupes.filter((g) => !groupeFiltre || g.cle === groupeFiltre) : [];
  const nbLignes = groupesVisibles.reduce((s, g) => s + g.lignes.length, 0);
  const parts = m ? m.repartitions[repartition] : [];

  /* les liens de l'ancienne page, dans le « ··· » (en tête et dans la carte) */
  const liens: Option[] = [
    { cle: "donnees", libelle: "Vos données", href: "/vos-donnees" },
    { cle: "reglages", libelle: "Réglages de l'espace", href: `${RACINE}/reglages` },
    { cle: "filed", libelle: "Documents reçus", href: `${RACINE}/filed` },
    { cle: "a-payer", libelle: "À payer", href: `${RACINE}/filed/a-payer` },
    { cle: "validations", libelle: "À valider", href: `${RACINE}/validations` },
  ];
  const optionsGroupes: Option[] = [
    { cle: "tous", libelle: "Tous les groupes", coche: !groupeFiltre, action: () => poser("groupe", null) },
    ...(m?.groupes ?? []).map<Option>((g) => ({ cle: g.cle, libelle: g.titre, meta: String(g.lignes.length), coche: groupeFiltre === g.cle, action: () => poser("groupe", g.cle) })),
  ];
  const basculer = (g: Groupe) =>
    setReplies((prev) => {
      const s = new Set(prev);
      if (s.has(g)) s.delete(g);
      else s.add(g);
      return s;
    });
  const libelleMesure = MESURES.find((x) => x.cle === mesure)?.libelle ?? "Documents";

  return (
    <div className="lin">
      <h1 className="v2-sr">Utilisation</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={ICI} className="lin-fil-equipe">
            <IconeJauge />
            Utilisation
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-lien lcy-fil-lien">Période</span>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lcy-menu-gauche">
            <Menu
              largeur={240}
              bouton={(ouvert, basculerMenu) => (
                <button type="button" className="lcy-fil-periode" aria-haspopup="listbox" aria-expanded={ouvert} aria-label={`Période : ${periode.libelle}`} onClick={basculerMenu}>
                  <IconeCycle />
                  <span className="lcy-fil-texte">{periode.libelle}</span>
                  <ChevronDown className="lcy-chevron" aria-hidden="true" />
                </button>
              )}
            >
              {(fermer) => (
                <ul className="lin-options" role="listbox" aria-label="Période">
                  {PERIODES.map((p) => (
                    <li key={p.cle} role="option" aria-selected={p.cle === periode.cle}>
                      <button
                        type="button"
                        className="lin-option"
                        data-actif={p.cle === periode.cle ? "" : undefined}
                        onClick={() => {
                          fermer();
                          poser("periode", p.cle === PERIODES[1].cle ? null : p.cle);
                        }}
                      >
                        <span className="lin-option-icone">
                          <IconeCycle />
                        </span>
                        <span className="lin-option-libelle">{p.libelle}</span>
                        {p.cle === periode.cle ? <Check className="lin-option-coche" width={14} height={14} aria-hidden="true" /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Menu>
          </span>
        </nav>
        <div className="lcy-tete-ronds">
          <MenuActions titre="Liens de la page" options={liens} rond />
        </div>
      </header>

      <div className="lin-outils">
        <span className="lcy-outils-compte">{m ? pluriel(nbLignes, "ligne", "lignes") : attente}</span>
        <div className="lcy-outils-droite">
          <MenuOptions rond titre="Filtrer par groupe" libelle="Filtrer par groupe" declencheur={<ListFilter width={14} height={14} aria-hidden="true" />} options={optionsGroupes} aDroite />
          <button
            type="button"
            className="lcy-rond"
            aria-pressed={!sansPanneau}
            aria-label={sansPanneau ? "Afficher le panneau" : "Masquer le panneau"}
            title={sansPanneau ? "Afficher le panneau" : "Masquer le panneau"}
            onClick={() => poser("panneau", sansPanneau ? null : "0")}
          >
            <PanelRight aria-hidden="true" />
          </button>
        </div>
      </div>

      {erreur ? (
        <div className="lcy-note">
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}

      <div className="lcy-corps" data-sans-panneau={sansPanneau ? "" : undefined}>
        <div className="lcy-liste">
          {m ? (
            groupesVisibles.map((g) => (
              <section key={g.cle} id={g.anchor} className="lcy-groupe" data-replie={replies.has(g.cle) ? "" : undefined} data-teinte={g.teinte}>
                <div className="lcy-groupe-tete">
                  <button type="button" className="lcy-groupe-chevron" aria-expanded={!replies.has(g.cle)} aria-label={replies.has(g.cle) ? `Déplier ${g.titre}` : `Replier ${g.titre}`} onClick={() => basculer(g.cle)}>
                    <ChevronDown aria-hidden="true" />
                  </button>
                  <span className="lcy-groupe-icone" aria-hidden="true">
                    {g.icone}
                  </span>
                  <div className="lcy-groupe-titre">
                    <h3>{g.titre}</h3>
                    <span className="lcy-groupe-compte">{g.lignes.length}</span>
                    {g.badge ? <span className="lcy-groupe-badge">{g.badge}</span> : null}
                  </div>
                  <Link href={g.href} className="lcy-groupe-ouvrir" aria-label={g.hrefLibelle} title={g.hrefLibelle}>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                </div>
                {replies.has(g.cle) ? null : g.lignes.length ? (
                  <ul className="lcy-lignes">
                    {g.lignes.map((l) => (
                      <li key={l.id}>
                        <Link href={l.href} className="lcy-ligne">
                          {l.aTraiter ? <span className="lcy-ligne-point" role="img" aria-label="À traiter" /> : <span />}
                          <span className="lcy-ligne-type" aria-hidden="true">
                            {g.icone}
                          </span>
                          <span className="lcy-ligne-ref">{l.ref}</span>
                          <span className="lcy-ligne-etat">
                            <IconeStatutProjet etat={l.etat} titre={l.etatLibelle} />
                          </span>
                          <span className="lcy-ligne-titre">
                            <span>{l.titre}</span>
                            {l.pilule ? <span className="lcy-pilule">{l.pilule}</span> : null}
                          </span>
                          <span className="lcy-ligne-montant">{l.montant ?? ""}</span>
                          <span className="lcy-ligne-date" data-passe={l.passe ? "" : undefined} title={l.passe ? "Échéance dépassée" : undefined}>
                            {l.date ? jourDeIso(l.date) : "—"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lcy-groupe-vide">Rien sur la période.</p>
                )}
              </section>
            ))
          ) : (
            <div className="lcy-groupe-vide">{attente}</div>
          )}
        </div>

        <aside className="lcy-panneau" aria-label="Résumé de la période">
          <div className="lcy-carte">
            <div className="lcy-carte-haut">
              <div className="lcy-pastilles">
                <span className="lcy-pastille">{source === "exemple" ? "Données d'exemple" : "Base réelle"}</span>
                <span className="lcy-pastille lcy-pastille--dates">
                  <span>
                    {bornes ? bornes.de : attente}
                    <ArrowRight aria-hidden="true" />
                    {bornes ? bornes.a : attente}
                  </span>
                </span>
              </div>
              <div className="lcy-carte-titre">
                <div>
                  <IconeCycle />
                  <h2>{periode.libelle}</h2>
                </div>
                <div className="lcy-carte-ronds">
                  <MenuActions titre="Liens de la page" options={liens} rond />
                </div>
              </div>
              <p className="lcy-resume" data-vide={m && !m.docs && !m.demandes ? "" : undefined}>
                {m
                  ? m.docs || m.demandes
                    ? `Sur ${periode.libelle.toLowerCase()} : ${pluriel(m.docs, "document reçu", "documents reçus")} et ${pluriel(m.demandes, "demande de validation", "demandes de validation")}.`
                    : `Rien sur ${periode.libelle.toLowerCase()} : ni document reçu, ni demande de validation.`
                  : attente}
              </p>
            </div>

            <section className="lcy-progres" aria-label="Progression sur la période">
              <div className="lcy-progres-tete">
                <span className="lcy-menu-gauche">
                  <Menu
                    largeur={220}
                    bouton={(ouvert, basculerMenu) => (
                      <button type="button" className="lcy-progres-choix" aria-haspopup="listbox" aria-expanded={ouvert} aria-label={`Mesure : ${libelleMesure}`} onClick={basculerMenu}>
                        {libelleMesure}
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                        </svg>
                      </button>
                    )}
                  >
                    {(fermer) => (
                      <ul className="lin-options" role="listbox" aria-label="Mesure">
                        {MESURES.map((x) => (
                          <li key={x.cle} role="option" aria-selected={x.cle === mesure}>
                            <button
                              type="button"
                              className="lin-option"
                              data-actif={x.cle === mesure ? "" : undefined}
                              onClick={() => {
                                fermer();
                                poser("mesure", x.cle === "documents" ? null : x.cle);
                              }}
                            >
                              <span className="lin-option-libelle">{x.libelle}</span>
                              {x.cle === mesure ? <Check className="lin-option-coche" width={14} height={14} aria-hidden="true" /> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Menu>
                </span>
              </div>
              <div className="lcy-progres-corps">
                <dl className="lcy-chiffres">
                  {(["scope", "jaune", "bleu"] as const).map((k, i) => (
                    <div key={k} data-teinte={i === 0 ? "gris" : i === 1 ? "jaune" : "bleu"}>
                      <span className="lcy-carre" aria-hidden="true" />
                      <dt>{serie ? serie[k].libelle : ["Reçus", "À traiter", "Classés"][i]}</dt>
                      <dd>
                        {serie ? (
                          <>
                            {serie.format(valeur(serie[k]))}
                            {i > 0 ? (
                              <>
                                <span className="lcy-point" aria-hidden="true">
                                  •
                                </span>
                                <span className="lcy-pct">{pctTexte(pct(valeur(serie[k]), valeur(serie.scope)))}</span>
                              </>
                            ) : null}
                          </>
                        ) : (
                          <Squelette largeur={40} hauteur={12} />
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {serie && depuis !== null ? (
                  <>
                    <GraphiqueCycle series={serie} depuis={depuis} jours={periode.jours} />
                    <AxeCycle depuis={depuis} jours={periode.jours} />
                  </>
                ) : (
                  <div style={{ height: 196, marginTop: 2 }}>
                    <Squelette largeur="100%" hauteur={169} />
                  </div>
                )}
                <div className="lcy-onglets" role="tablist" aria-label="Répartition">
                  {REPARTITIONS.map((r) => (
                    <button key={r.cle} type="button" role="tab" className="lcy-onglet" aria-selected={repartition === r.cle} onClick={() => poser("repartition", r.cle === "fournisseurs" ? null : r.cle)}>
                      {r.libelle}
                    </button>
                  ))}
                </div>
                {m ? (
                  parts.length ? (
                    <ul className="lcy-repartition">
                      {parts.map((p) => (
                        <li key={p.cle}>
                          <span className="lcy-repartition-nom" data-second={p.second ? "" : undefined}>
                            <span className="lcy-repartition-icone">{p.icone}</span>
                            <span>{p.nom}</span>
                          </span>
                          <span className="lcy-repartition-part">
                            <Anneau part={p.pct} />
                            {pctTexte(p.pct)} de {nombre(p.n)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="lcy-repartition-vide">Rien à répartir sur la période.</p>
                  )
                ) : (
                  <p className="lcy-repartition-vide">{attente}</p>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
