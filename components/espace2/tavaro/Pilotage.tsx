"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Pilotage (02/11/2026, pages manquantes)

   La page Insights › Reporting de Plain, au 1:1 : relevé
   docs/refonte-metiers/releves/plain-insights.md (branche refs-plain-attio-cal),
   styles ./tav-insights.css (socle Plain et Insights, préfixe tav-pi).
   Graphiques en SVG au gabarit relevé (bandes verticales, axe à droite,
   barres de 15 r 2, ligne de moyenne pointillée et son étiquette,
   répartitions de 8 px).

   Promesse du site (secteurs/location) : « Quatre indicateurs suivis : la
   part facturée des retours, le délai de remise en location, celui de la
   dépanneuse et les véhicules à sortir ». Rien de nouveau en base :
     · part facturée : les contrats rendus sur 30 jours dont le retour est
       facturé ou n'a rien à facturer (contrats, propositions, factures déjà
       lus par le layout) ; « pour 100 retours » : rpc loc_indicateur_mois
       (chargerAudits, direction et valideurs), même calcul sur l'exemple ;
     · délai de remise : médiane prete_le − retour_le des remises finies
       (le calcul de ParcAtelier.tsx) ;
     · dépanneuse : aucune rpc ; calculé ici depuis loc_incidents déjà lus
       (action « dépanneuse ») : arrivée estimée − appel reçu, comparé au
       délai cible de la grille d'assistance. L'heure d'arrivée réelle n'est
       pas enregistrée : c'est le délai annoncé ;
     · véhicules à sortir : rpc loc_fiches_flotte (avis « sortir »).
   Le filtre d'agence est celui de toutes les sous-pages (useTavaro) ; la
   flotte et l'indicateur du mois ne sont pas ventilés par agence en base.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { chargerAudits, type Indicateur } from "@/components/espace/tavaro/portes";
import { propositionVivante } from "@/components/espace/tavaro/etats";
import { TYPES_INCIDENT } from "@/components/espace/tavaro/operations";
import type { AvisFlotte, Dossier, FicheVehicule } from "@/components/espace/tavaro/types";
import { ecrireStockage, useStockage } from "../Collection";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { TavPlainIcone } from "./TavPlainIcone";
import { BASE } from "./VueEnsemble";
import "./tav-insights.css";

const JOUR = 86_400_000;
const PERIODE = 30;
const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)} %`);
const euros = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`);
const duree = (min: number | null | undefined) => (min === null || min === undefined ? "—" : min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}` : `${Math.round(min)} min`);
const COULEURS = ["#5c67f4", "#1bd379", "#ab4aba", "#ffcb14", "#e33d3d", "#636370"];
const AVIS: Record<AvisFlotte, { libelle: string; couleur: string }> = {
  sortir: { libelle: "À sortir", couleur: "#e33d3d" },
  restituer: { libelle: "À restituer", couleur: "#ffcb14" },
  surveiller: { libelle: "À surveiller", couleur: "#ab4aba" },
  garder: { libelle: "À garder", couleur: "#1bd379" },
};
const CANAUX: Record<string, string> = { reprise_concession: "Reprise en concession", marchand: "Marchand", encheres: "Enchères", particulier: "Particulier", restitution: "Restitution" };

function mediane(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

/* ——— presse-papier, CSV, épingles (navigateur) ——— */
async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
function exporterCSV(nom: string, entetes: string[], lignes: (string | number | null | undefined)[][]) {
  const cellule = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texte = "﻿" + [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([texte], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
type Epingle = { titre: string; detail: string; href: string };
const CLE_EPINGLES = "espace2:epingles:tavaro-pilotage";
function useEpingles(): [Record<string, Epingle>, (cle: string, e: Epingle | null) => void] {
  const brut = useStockage(CLE_EPINGLES);
  const table = useMemo<Record<string, Epingle>>(() => {
    try {
      return brut ? (JSON.parse(brut) as Record<string, Epingle>) : {};
    } catch {
      return {};
    }
  }, [brut]);
  const poser = useCallback((cle: string, e: Epingle | null) => {
    const t = { ...table };
    if (e) t[cle] = e;
    else delete t[cle];
    ecrireStockage(CLE_EPINGLES, JSON.stringify(t));
  }, [table]);
  return [table, poser];
}

function Info() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17a1 1 0 0 0 1-1v-4a1 1 0 1 0-2 0v4a1 1 0 0 0 1 1m0-8a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 13C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10m0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16" /></svg>
  );
}
function Chevron({ tourne }: { tourne?: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: tourne ? "rotate(-90deg)" : undefined }}><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>;
}
function Bouclier({ taille = 16 }: { taille?: number }) {
  return <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="#00ab5f" strokeWidth="2" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7z" /></svg>;
}
/* « No data » : l'icône fantôme 14 de Plain + libellé 12/400/16 */
function Fantome() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 21V10a7 7 0 0 1 14 0v11l-2.3-1.6L14.3 21 12 19.4 9.7 21l-2.4-1.6z" /><circle cx="9.5" cy="10.5" r="1" fill="currentColor" /><circle cx="14.5" cy="10.5" r="1" fill="currentColor" /></svg>;
}

/* ——— graphiques ——— */
function Bandes({ l, h, n }: { l: number; h: number; n: number }) {
  const pas = l / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          {i % 2 ? <rect x={i * pas} y={0} width={pas} height={h} fill="url(#tav-pi-raye)" /> : null}
          <line x1={i * pas + 0.5} x2={i * pas + 0.5} y1={0} y2={h} stroke="var(--in-grille)" strokeWidth={1} />
        </g>
      ))}
    </g>
  );
}
function Defs() {
  return (
    <defs>
      <linearGradient id="tav-pi-raye" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--in-raye-1)" />
        <stop offset="1" stopColor="var(--in-raye-2)" />
      </linearGradient>
      <linearGradient id="tav-pi-aire" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5c67f4" stopOpacity="0.3" />
        <stop offset="1" stopColor="#5c67f4" stopOpacity="0.05" />
      </linearGradient>
    </defs>
  );
}
/* courbe (Queue size) : SVG 316×155, axe Y à droite, X en bas ; vide = « Aucune donnée » centré */
function Courbe({ valeurs, etiquettes, max, format }: { valeurs: (number | null)[]; etiquettes: string[]; max: number; format: (v: number) => string }) {
  const L = 288, H = 125;
  const pts = valeurs.map((v, i) => (v === null ? null : [((i + 0.5) * L) / valeurs.length, H - (v / max) * (H - 8)] as const));
  const ok = pts.filter(Boolean) as (readonly [number, number])[];
  const d = ok.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  return (
    <svg className="in-graphe" width="316" height="155" viewBox="0 0 316 155" role="img" aria-label="Évolution">
      <Defs />
      <Bandes l={L} h={H} n={Math.min(valeurs.length, 10)} />
      {ok.length > 1 ? <path d={`${d}L${ok[ok.length - 1][0]},${H}L${ok[0][0]},${H}Z`} fill="url(#tav-pi-aire)" opacity="0.6" /> : null}
      {ok.length > 1 ? <path d={d} fill="none" stroke="#5c67f4" strokeWidth="1.5" /> : null}
      {ok.length === 1 ? <circle cx={ok[0][0]} cy={ok[0][1]} r={3} fill="#5c67f4" /> : null}
      {!ok.length ? (
        <foreignObject x={0} y={12} width={L} height={20}>
          <span className="in-sans-donnee"><Fantome />Aucune donnée</span>
        </foreignObject>
      ) : null}
      <line x1={0} x2={L} y1={H + 0.5} y2={H + 0.5} stroke="var(--in-grille)" />
      {ok.length ? (
        <>
          <text x={L + 8} y={14} className="in-axe-y">{format(max)}</text>
          <text x={L + 8} y={H / 2 + 4} className="in-axe-y">{format(max / 2)}</text>
          <text x={L + 8} y={H + 4} className="in-axe-y">{format(0)}</text>
        </>
      ) : null}
      {etiquettes.map((e, i) => (e ? <text key={i} x={((i + 0.5) * L) / etiquettes.length} y={H + 20} textAnchor="middle" className="in-axe-x">{e}</text> : null))}
    </svg>
  );
}
/* barres (New threads created per day) : barres de 15 r 2, couleur selon la valeur, moyenne pointillée + étiquette */
function Barres({ valeurs, etiquettes, ligne, libelleLigne, max, largeur = 470, format }: { valeurs: number[]; etiquettes: string[]; ligne: number | null; libelleLigne: string; max: number; largeur?: number; format: (v: number) => string }) {
  const L = largeur - 36, H = 170;
  const pas = L / valeurs.length;
  const haut = Math.max(0, ...valeurs);
  const y = (v: number) => H - (v / max) * (H - 10);
  const l = Math.min(15, Math.max(4, pas - 2));
  return (
    <svg className="in-graphe" width={largeur} height={H + 26} viewBox={`0 0 ${largeur} ${H + 26}`} role="img" aria-label="Par période">
      <Defs />
      <Bandes l={L} h={H} n={Math.min(valeurs.length, 10)} />
      {valeurs.map((v, i) => (v <= 0 ? null : (
        <rect key={i} x={i * pas + pas / 2 - l / 2} y={y(v)} width={l} height={H - y(v)} rx={2} fill={v === haut ? "#4252e1" : v < haut * 0.25 ? "#d2d6f8" : "#8a94ed"}>
          <title>{`${etiquettes[i] || ""} ${format(v)}`.trim()}</title>
        </rect>
      )))}
      {ligne !== null ? (
        <g>
          <line x1={0} x2={L} y1={y(ligne)} y2={y(ligne)} stroke="var(--in-moyenne)" strokeDasharray="3" />
          <foreignObject x={2} y={y(ligne) - 9} width={160} height={18}>
            <span className="in-moy"><span>{libelleLigne}</span> <strong>{format(ligne)}</strong></span>
          </foreignObject>
        </g>
      ) : null}
      <line x1={0} x2={L} y1={H + 0.5} y2={H + 0.5} stroke="var(--in-grille)" />
      <text x={L + 10} y={14} className="in-axe-y">{format(max)}</text>
      <text x={L + 10} y={H / 2 + 4} className="in-axe-y">{format(max / 2)}</text>
      <text x={L + 10} y={H + 4} className="in-axe-y">{format(0)}</text>
      {etiquettes.map((e, i) => (e ? <text key={i} x={i * pas + pas / 2} y={H + 20} textAnchor="middle" className="in-axe-x">{e}</text> : null))}
    </svg>
  );
}
type LigneRep = { nom: string; valeur: number; texte: string; couleur: string; evolution?: number | null; href?: string };
function Repartition({ lignes, vide = "Rien sur ces 30 jours." }: { lignes: LigneRep[]; vide?: string }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  if (!lignes.length) return <div className="in-vide-boite"><strong>Aucune donnée</strong><span>{vide}</span></div>;
  return (
    <div className="in-repartition">
      {lignes.slice(0, 5).map((l) => (
        <div key={l.nom} className="in-rep-ligne">
          <div className="in-rep-haut">
            <TavPlainIcone nom="Tier" taille={18} style={{ color: l.couleur }} />
            {l.href ? <Link href={l.href} className="in-rep-nom">{l.nom}</Link> : <span className="in-rep-nom">{l.nom}</span>}
          </div>
          <div className="in-rep-barre"><span style={{ width: `${(l.valeur / max) * 100}%`, background: l.couleur }} /></div>
          <span className="in-rep-val">
            {l.texte}
            {l.evolution !== undefined && l.evolution !== null ? <span className={`in-badge ${l.evolution > 0 ? "in-badge--haut" : l.evolution < 0 ? "in-badge--bas" : ""}`}>{l.evolution > 0 ? "↗" : l.evolution < 0 ? "↘" : "●"} {Math.abs(Math.round(l.evolution))}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* « Ask Agent » (icône verte, libellé au survol) : copie le chiffre et sa série pour l'assistant */
function Agent({ resume }: { resume: string }) {
  const [fait, setFait] = useState<string | null>(null);
  return (
    <button type="button" className="in-agent" aria-label="Copier pour l'assistant"
      onClick={() => void copier(resume).then((ok) => { setFait(ok ? "Copié" : "Refusé"); window.setTimeout(() => setFait(null), 2500); })}>
      <Bouclier />
      <span className="in-agent-lib">{fait ?? "Copier pour l'assistant"}</span>
    </button>
  );
}
function Carte({ titre, aide, valeur, suffixe, children, large, resume, alerte, epingle }: {
  titre: string; aide: string; valeur?: string; suffixe?: string; children?: React.ReactNode; large?: boolean; resume?: string;
  alerte?: { libelle: string; href: string }; epingle?: { actif: boolean; basculer: () => void };
}) {
  return (
    <article className={`in-carte${large ? " in-carte--large" : ""}`}>
      <div className="in-carte-tete">
        <span>{titre}</span>
        <span title={aide} aria-label={aide} role="img" className="in-aide"><Info /></span>
        <span className="pl-pousse" />
        {alerte ? <Link href={alerte.href} className="in-pique"><Bouclier taille={14} />{alerte.libelle}</Link> : null}
        {epingle ? (
          <button type="button" className={`in-epingle${epingle.actif ? " in-epingle--actif" : ""}`} aria-pressed={epingle.actif} aria-label={epingle.actif ? "Retirer des épinglés" : "Épingler en haut de la page"} title={epingle.actif ? "Retirer des épinglés" : "Épingler en haut de la page"} onClick={epingle.basculer}>
            <TavPlainIcone nom="Etoile" taille={16} />
          </button>
        ) : null}
        <Agent resume={`${titre} : ${valeur ?? ""} ${suffixe ?? ""}`.trim() + (resume ? `\n${resume}` : "")} />
      </div>
      {valeur !== undefined ? (
        <div className="in-valeur"><span className="in-valeur-chiffre">{valeur}</span>{suffixe ? <span className="in-valeur-suffixe">{suffixe}</span> : null}</div>
      ) : null}
      {children}
    </article>
  );
}
function OutilsTableau({ recherche, setRecherche, telecharger, invite }: { recherche: string; setRecherche: (v: string) => void; telecharger: () => void; invite: string }) {
  return (
    <div className="in-outils">
      <label className="in-recherche">
        <TavPlainIcone nom="Loupe" taille={18} />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={invite} aria-label={invite} />
      </label>
      <button type="button" className="pl-icone-bouton in-telecharger" aria-label="Télécharger en CSV" title="Télécharger en CSV" onClick={telecharger}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="m7 10 5 5 5-5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /></svg>
      </button>
    </div>
  );
}
function Section({ titre, id, colonnes = 3, children, tableau }: { titre: string; id: string; colonnes?: 2 | 3; children: React.ReactNode; tableau?: boolean }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="in-section" id={id}>
      <div className="in-section-titre">
        <button type="button" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}>
          <h2>{titre}</h2>
          <Chevron tourne={!ouverte} />
        </button>
      </div>
      {ouverte ? (tableau ? children : <div className={`in-grille in-grille--${colonnes}`}>{children}</div>) : null}
    </section>
  );
}

type Menu = null | "filtre" | "grouper" | "periode" | "pas";
type Pas = "jour" | "semaine";
type Groupe = "agence" | "categorie";

export default function Pilotage() {
  const t = useTavaro();
  const { source, monde, role, tous, agence, agences, setAgence, nomAgenceDe, operations: o, pret } = t;
  const toast = useToast();
  const [maintenant, setMaintenant] = useState(0);
  const [menu, setMenu] = useState<Menu>(null);
  const [pas, setPas] = useState<Pas>("jour");
  const [groupe, setGroupe] = useState<Groupe>("agence");
  const [chercheAg, setChercheAg] = useState("");
  const [chercheVh, setChercheVh] = useState("");
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [sidekick, setSidekick] = useState(true);
  const [avisSk, setAvisSk] = useState<string | null>(null);
  const [indicReel, setIndicReel] = useState<Indicateur | null | undefined>(undefined);
  const [epingles, poserEpingle] = useEpingles();

  const directionLarge = role === "gerant" || role === "admin" || role === "valideur";

  useEffect(() => {
    const t0 = window.setTimeout(() => setMaintenant(Date.now()), 0);
    const t1 = window.setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => { window.clearTimeout(t0); window.clearInterval(t1); };
  }, []);
  /* l'indicateur du mois : la porte en base réelle (direction et valideurs) */
  useEffect(() => {
    if (source !== "reelle" || !directionLarge) return;
    let vivant = true;
    chargerAudits().then((r) => { if (vivant) setIndicReel(r?.indicateur ?? null); }).catch(() => { if (vivant) setIndicReel(null); });
    return () => { vivant = false; };
  }, [source, directionLarge]);
  /* B : « Ask Sidekick Agent » ; Échap referme les menus */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenu(null); return; }
      if ((e.target as HTMLElement).closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "b" || e.key === "B") (document.querySelector(".in-sidekick-question") as HTMLButtonElement | null)?.click();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".pl-ancre")) setMenu(null); };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, [menu]);

  const de = useCallback((e: string | null | undefined) => !agence || e === agence, [agence]);
  const depuis = maintenant - PERIODE * JOUR;
  const dansPeriode = useCallback((iso: string | null | undefined) => {
    if (!iso || !maintenant) return false;
    const x = enDate(iso).getTime();
    return x >= maintenant - PERIODE * JOUR && x <= maintenant;
  }, [maintenant]);

  /* ——— les seaux de temps : 30 jours ou 5 semaines, le dernier finit maintenant ——— */
  const n = pas === "jour" ? PERIODE : 5;
  const taille = pas === "jour" ? JOUR : 7 * JOUR;
  const seau = useCallback((iso: string) => {
    const i = n - 1 - Math.floor((maintenant - enDate(iso).getTime()) / taille);
    return i >= 0 && i < n ? i : -1;
  }, [n, taille, maintenant]);
  const etiquettes = Array.from({ length: n }, (_, i) => {
    if (!maintenant) return "";
    if (i === n - 1) return pas === "jour" ? "Aujourd'hui" : "Cette sem.";
    if (pas === "jour") return i % 10 === 2 ? jourCourt(maintenant - (n - 1 - i) * JOUR) : "";
    return jourCourt(maintenant - (n - 1 - i) * 7 * JOUR - 6 * JOUR);
  });

  const nomGroupe = useCallback((d: Dossier | null, entite: string | null | undefined) => {
    if (groupe === "categorie") return d?.categorie?.libelle ?? "Sans catégorie";
    return entite ? (nomAgenceDe(entite).split(" — ").pop() ?? nomAgenceDe(entite)) : "Sans agence";
  }, [groupe, nomAgenceDe]);
  const nomAgence = useCallback((e: string) => nomAgenceDe(e).split(" — ").pop() ?? nomAgenceDe(e), [nomAgenceDe]);

  /* ——— 1. la part facturée des retours ——— */
  const retours = useMemo(() => tous.filter((d) => de(d.contrat.entite_id) && d.contrat.statut !== "annule" && dansPeriode(d.contrat.retour_reel_le)), [tous, de, dansPeriode]);
  const traite = (d: Dossier) => d.factures.length > 0 || propositionVivante(d.propositions)?.statut === "rien_a_facturer";
  const factures = retours.filter((d) => d.factures.length > 0).length;
  const sansFrais = retours.filter((d) => !d.factures.length && propositionVivante(d.propositions)?.statut === "rien_a_facturer").length;
  const traites = retours.filter(traite).length;
  const part = retours.length ? traites / retours.length : null;
  const partParSeau = Array.from({ length: n }, (_, i) => {
    const xs = retours.filter((d) => seau(d.contrat.retour_reel_le!) <= i);
    return xs.length ? xs.filter(traite).length / xs.length : null;
  });
  const retoursParSeau = Array.from({ length: n }, (_, i) => retours.filter((d) => seau(d.contrat.retour_reel_le!) === i).length);
  const enAttente = retours.filter((d) => !traite(d));

  /* l'indicateur unique (b2_19) : € TTC facturés, avoirs déduits, pour 100 retours du mois */
  const indicateur = useMemo<Indicateur | null>(() => {
    if (source === "reelle") return indicReel ?? null;
    if (!maintenant) return null;
    const mois = new Date(maintenant).toISOString().slice(0, 7);
    const ds = tous.filter((d) => de(d.contrat.entite_id));
    const nb = ds.filter((d) => (d.contrat.retour_reel_le ?? "").slice(0, 7) === mois).length;
    const fac = ds.flatMap((d) => d.factures).filter((f) => (f.date_facture ?? "").slice(0, 7) === mois).reduce((s, f) => s + f.total_ttc, 0);
    const av = ds.flatMap((d) => d.avoirs).filter((a) => (a.date_avoir ?? "").slice(0, 7) === mois).reduce((s, a) => s + a.montant_ttc, 0);
    return { mois, retours: nb, factures_ttc: fac, avoirs_ttc: av, pour_100_retours: nb ? Math.round(((fac - av) * 100) / nb * 100) / 100 : null, avant_pour_100_retours: null, audit: null };
  }, [source, indicReel, maintenant, tous, de]);

  /* ——— 2. le délai de remise en location ——— */
  const parc = monde?.parc;
  const remises = useMemo(() => (parc?.remises ?? []).filter((r) => de(r.entite_id) && r.statut === "prete" && r.prete_le && dansPeriode(r.prete_le)), [parc, de, dansPeriode]);
  const minRemise = (r: { prete_le: string | null; retour_le: string }) => Math.max(0, (Date.parse(r.prete_le!) - Date.parse(r.retour_le)) / 60_000);
  const medRemise = mediane(remises.map(minRemise));
  const remiseParSeau = Array.from({ length: n }, (_, i) => mediane(remises.filter((r) => seau(r.prete_le!) === i).map(minRemise)));
  const aTemps = remises.filter((r) => !r.limite_le || r.prete_le! <= r.limite_le).length;
  const remisesEnRetard = (parc?.remises ?? []).filter((r) => de(r.entite_id) && (r.statut === "a_faire" || r.statut === "en_cours") && r.limite_le && Date.parse(r.limite_le) < maintenant).length;
  const categorieVehicule = useCallback((vehicule_id: string) => {
    const v = parc?.vehicules.find((x) => x.id === vehicule_id);
    return monde?.categories.find((c) => c.id === v?.categorie_id)?.libelle ?? "Sans catégorie";
  }, [parc, monde]);

  /* ——— 3. le délai de la dépanneuse (aucune rpc : calculé ici) ——— */
  const depannages = useMemo(() => o.ops.incidents.filter((i) => de(i.entite_id) && i.action === "depanneuse" && i.arrivee_estimee_le && dansPeriode(i.recu_le)), [o.ops.incidents, de, dansPeriode]);
  const minDep = (i: { arrivee_estimee_le: string | null; recu_le: string }) => Math.max(0, (Date.parse(i.arrivee_estimee_le!) - Date.parse(i.recu_le)) / 60_000);
  const medDep = mediane(depannages.map(minDep));
  const depParSeau = Array.from({ length: n }, (_, i) => mediane(depannages.filter((x) => seau(x.recu_le) === i).map(minDep)));
  const cibleDe = (type: string) => o.ops.grille.find((g) => g.type_incident === type && g.action === "depanneuse")?.delai_cible_min ?? null;
  const horsCible = depannages.filter((i) => { const c = cibleDe(i.type_incident); return c !== null && minDep(i) > c; }).length;
  const cibleMed = mediane(o.ops.grille.filter((g) => g.action === "depanneuse" && g.delai_cible_min).map((g) => g.delai_cible_min!));

  /* ——— 4. les véhicules à sortir (loc_fiches_flotte ; pas d'agence dans la fiche) ——— */
  const fiches: FicheVehicule[] = useMemo(() => (directionLarge ? monde?.flotte?.fiches ?? [] : []), [directionLarge, monde]);
  const aSortir = fiches.filter((f) => f.avis === "sortir");
  const sortiesOuvertes = (monde?.flotte?.sorties ?? []).filter((s) => s.statut === "proposee" || s.statut === "validee");

  /* ——— répartitions ——— */
  const parGroupe = <T,>(xs: T[], cle: (x: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(cle(x), [...(m.get(cle(x)) ?? []), x]);
    return [...m.entries()];
  };
  const repPart: LigneRep[] = parGroupe(retours, (d) => nomGroupe(d, d.contrat.entite_id))
    .map(([nom, xs], i) => ({ nom, valeur: xs.filter(traite).length / xs.length, texte: `${pct(xs.filter(traite).length / xs.length)} · ${xs.length}`, couleur: COULEURS[i % COULEURS.length] }))
    .sort((a, b) => a.valeur - b.valeur);
  const repRemise: LigneRep[] = parGroupe(remises, (r) => (groupe === "categorie" ? categorieVehicule(r.vehicule_id) : nomAgence(r.entite_id)))
    .map(([nom, xs], i) => { const m = mediane(xs.map(minRemise)) ?? 0; return { nom, valeur: m, texte: `${duree(m)} · ${xs.length}`, couleur: COULEURS[(i + 1) % COULEURS.length] }; })
    .sort((a, b) => b.valeur - a.valeur);
  const repDep: LigneRep[] = parGroupe(depannages, (i) => i.prestataire ?? "Prestataire non nommé")
    .map(([nom, xs], i) => { const m = mediane(xs.map(minDep)) ?? 0; const c = mediane(xs.map((x) => cibleDe(x.type_incident)).filter((v): v is number => v !== null)); return { nom, valeur: m, texte: `${duree(m)} · ${xs.length}`, couleur: COULEURS[(i + 2) % COULEURS.length], evolution: c !== null ? m - c : null }; });
  const repTypes: LigneRep[] = parGroupe(depannages, (i) => TYPES_INCIDENT[i.type_incident] ?? i.type_incident)
    .map(([nom, xs], i) => ({ nom, valeur: xs.length, texte: String(xs.length), couleur: COULEURS[(i + 3) % COULEURS.length] }));
  const repAvis: LigneRep[] = (Object.keys(AVIS) as AvisFlotte[]).map((a) => ({ nom: AVIS[a].libelle, valeur: fiches.filter((f) => f.avis === a).length, texte: String(fiches.filter((f) => f.avis === a).length), couleur: AVIS[a].couleur, href: `${BASE}/reseau?onglet=flotte` })).filter((l) => l.valeur > 0);
  const repEtapes: LigneRep[] = (() => {
    const fin = remises.length;
    return fin ? [
      { nom: "Prêtes avant le départ suivant", valeur: aTemps, texte: `${aTemps} · ${pct(aTemps / fin)}`, couleur: "#1bd379" },
      { nom: "Prêtes en retard", valeur: fin - aTemps, texte: `${fin - aTemps} · ${pct((fin - aTemps) / fin)}`, couleur: "#e33d3d" },
      { nom: "En cours, échéance passée", valeur: remisesEnRetard, texte: String(remisesEnRetard), couleur: "#ffcb14", href: `${BASE}/parc?vue=remises` },
    ] : [];
  })();
  const repSuite: LigneRep[] = [
    { nom: "Facturés", valeur: factures, texte: String(factures), couleur: "#5c67f4", href: `${BASE}/retours` },
    { nom: "Rien à facturer", valeur: sansFrais, texte: String(sansFrais), couleur: "#1bd379" },
    { nom: "À chiffrer ou à valider", valeur: enAttente.length, texte: String(enAttente.length), couleur: "#ffcb14", href: `${BASE}/retours?famille=a_chiffrer` },
  ].filter((l) => l.valeur > 0);

  /* ——— le tableau des agences (rapport « Accounts ») ——— */
  const lignesAgences = agences.filter((a) => !agence || a.entite_id === agence).map((a) => {
    const rs = tous.filter((d) => d.contrat.entite_id === a.entite_id && d.contrat.statut !== "annule" && dansPeriode(d.contrat.retour_reel_le));
    const rm = (parc?.remises ?? []).filter((r) => r.entite_id === a.entite_id && r.statut === "prete" && r.prete_le && dansPeriode(r.prete_le));
    const dp = o.ops.incidents.filter((i) => i.entite_id === a.entite_id && i.action === "depanneuse" && i.arrivee_estimee_le && dansPeriode(i.recu_le));
    const montant = tous.filter((d) => d.contrat.entite_id === a.entite_id).flatMap((d) => d.factures).filter((f) => dansPeriode(f.date_facture)).reduce((s, f) => s + f.total_ttc, 0);
    return { id: a.entite_id, nom: nomAgence(a.entite_id), retours: rs.length, part: rs.length ? rs.filter(traite).length / rs.length : null, montant, remise: mediane(rm.map(minRemise)), remises: rm.length, depanneuse: mediane(dp.map(minDep)), depannages: dp.length };
  }).filter((l) => l.nom.toLowerCase().includes(chercheAg.toLowerCase()));
  const montantTotal = lignesAgences.reduce((s, l) => s + l.montant, 0);

  /* ——— le tableau des véhicules à sortir (rapport, sélection et actions groupées) ——— */
  const lignesVh = aSortir.filter((f) => `${f.immatriculation} ${f.modele ?? ""}`.toLowerCase().includes(chercheVh.toLowerCase()));
  const choisiesVh = lignesVh.filter((f) => choisis.has(f.vehicule));
  const ligneVhCSV = (f: FicheVehicule) => [f.immatriculation, f.modele, f.marge, f.utilisation_pct, f.jours_immobilises, f.km, f.cote?.eur ?? null, CANAUX[f.canal] ?? f.canal, f.moment ?? "", f.raisons.join(" ; ")];
  const ENTETES_VH = ["Immatriculation", "Modèle", "Marge 12 mois (€)", "Utilisation (%)", "Jours immobilisés", "Km", "Cote (€)", "Canal", "Quand", "Raisons"];
  const resumeVh = (fs: FicheVehicule[]) => fs.map((f) => `${f.immatriculation} ${f.modele ?? ""} : marge ${euros(f.marge)}, utilisation ${f.utilisation_pct} %, ${f.km ?? "?"} km, ${CANAUX[f.canal] ?? f.canal}${f.moment ? `, ${f.moment}` : ""} — ${f.raisons.join(" ; ")}`).join("\n");
  const epinglerVh = (fs: FicheVehicule[]) => {
    for (const f of fs) poserEpingle(`vh:${f.vehicule}`, { titre: `${f.immatriculation} ${f.modele ?? ""}`.trim(), detail: `à sortir · ${CANAUX[f.canal] ?? f.canal}`, href: `${BASE}/reseau?onglet=flotte` });
    toast(fs.length > 1 ? `${fs.length} véhicules épinglés en haut du pilotage.` : "Véhicule épinglé en haut du pilotage.", "vert");
  };
  const copierAvis = (texte: string, quoi: string) => void copier(texte).then((ok) => toast(ok ? `${quoi} copié : collez-le dans l'assistant de l'espace.` : "Le presse-papier a refusé la copie.", ok ? "vert" : "rouge"));
  const basculerCarte = (cle: string, titre: string, detail: string) => ({ actif: !!epingles[cle], basculer: () => poserEpingle(cle, epingles[cle] ? null : { titre, detail, href: `${BASE}/pilotage#${cle}` }) });

  /* ——— état de lecture ——— */
  let etat: React.ReactNode = null;
  if (t.erreur) etat = t.erreur;
  else if (!pret || !maintenant) etat = "Lecture de vos agences…";
  else if (source === "reelle" && !t.moi) etat = "Cette session n'est rattachée à aucune organisation.";
  const vu = !etat;

  const nomAgenceChoisie = agence ? nomAgence(agence) : null;
  const libellePeriode = maintenant ? `${jourCourt(depuis)} – ${jourCourt(maintenant)}` : "";

  const boutons = (
    <div className="in-boutons">
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "filtre"} onClick={() => setMenu((m) => (m === "filtre" ? null : "filtre"))}>
          <TavPlainIcone nom="Filtres" taille={14} /><span className="in-bouton-lib">Filtre</span>{nomAgenceChoisie ? <span className="in-bouton-val">{nomAgenceChoisie}</span> : null}
        </button>
        {menu === "filtre" ? (
          <div className="pl-menu in-menu" role="menu" style={{ right: 0, top: 34, width: 235 }}>
            <div className="pl-menu-titre">Agence</div>
            {agences.map((a) => (
              <button key={a.entite_id} type="button" role="menuitemcheckbox" aria-checked={agence === a.entite_id} className="pl-menu-item" onClick={() => { setAgence(agence === a.entite_id ? null : a.entite_id); setMenu(null); }}>{nomAgence(a.entite_id)}</button>
            ))}
            {agence ? <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setAgence(null); setMenu(null); }}>Toutes les agences</button> : null}
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "grouper"} onClick={() => setMenu((m) => (m === "grouper" ? null : "grouper"))}>
          <TavPlainIcone nom="Tier" taille={14} /><span className="in-bouton-lib">Grouper par</span><span className="in-bouton-val">{groupe === "agence" ? "Agence" : "Catégorie"}</span>
        </button>
        {menu === "grouper" ? (
          <div className="pl-menu in-menu" role="menu" style={{ right: 0, top: 34, width: 235 }}>
            {(["agence", "categorie"] as const).map((g) => (
              <button key={g} type="button" role="menuitemradio" aria-checked={groupe === g} className="pl-menu-item" onClick={() => { setGroupe(g); setMenu(null); }}>{g === "agence" ? "Agence" : "Catégorie de véhicule"}</button>
            ))}
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "periode"} onClick={() => setMenu((m) => (m === "periode" ? null : "periode"))}>
          <span className="in-bouton-lib">Période</span><span className="in-bouton-val">30 derniers jours</span><Chevron />
        </button>
        {menu === "periode" ? (
          <div className="pl-menu in-menu in-menu--36" role="menu" style={{ right: 0, top: 34, width: 240 }}>
            <button type="button" role="menuitemradio" aria-checked="true" className="pl-menu-item in-menu-deux" onClick={() => setMenu(null)}><span>30 derniers jours</span><span>{libellePeriode} · indicateurs, tableaux</span></button>
            <a href="#facturation" role="menuitem" className="pl-menu-item in-menu-deux" onClick={() => setMenu(null)}><span>Mois en cours</span><span>{indicateur ? `${indicateur.mois} · pour 100 retours` : "pour 100 retours"}</span></a>
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "pas"} onClick={() => setMenu((m) => (m === "pas" ? null : "pas"))}>
          <span className="in-bouton-lib">Pas</span><span className="in-bouton-val">{pas === "jour" ? "Quotidien" : "Hebdomadaire"}</span><Chevron />
        </button>
        {menu === "pas" ? (
          <div className="pl-menu in-menu in-menu--36" role="menu" style={{ right: 0, top: 34, width: 160 }}>
            <button type="button" role="menuitemradio" aria-checked={pas === "jour"} className="pl-menu-item" onClick={() => { setPas("jour"); setMenu(null); }}>Quotidien</button>
            <button type="button" role="menuitemradio" aria-checked={pas === "semaine"} className="pl-menu-item" onClick={() => { setPas("semaine"); setMenu(null); }}>Hebdomadaire</button>
            <div className="pl-menu-item in-indispo" aria-disabled="true">Mensuel</div>
          </div>
        ) : null}
      </span>
    </div>
  );

  const resumeTout = () => [
    `Pilotage de la location${nomAgenceChoisie ? ` (${nomAgenceChoisie})` : ""}, 30 derniers jours au ${new Date(maintenant).toLocaleDateString("fr-FR", { dateStyle: "long" })}.`,
    `Part facturée des retours : ${pct(part)} (${traites} sur ${retours.length} ; ${factures} facturés, ${sansFrais} sans frais, ${enAttente.length} en attente).`,
    `Délai de remise en location (médiane) : ${duree(medRemise)} sur ${remises.length} remises ; ${aTemps} prêtes à temps.`,
    `Délai de la dépanneuse (annoncé, médiane) : ${duree(medDep)} sur ${depannages.length} interventions ; ${horsCible} au-delà du délai de la grille.`,
    ...(directionLarge ? [`Véhicules à sortir : ${aSortir.length} (${aSortir.map((f) => f.immatriculation).join(", ") || "aucun"}).`] : []),
    ...(indicateur?.pour_100_retours !== null && indicateur ? [`Ce mois-ci : ${euros(indicateur.pour_100_retours)} facturés pour 100 retours${indicateur.avant_pour_100_retours !== null ? ` (avant : ${euros(indicateur.avant_pour_100_retours)})` : ""}.`] : []),
    "Question : qu'est-ce qui progresse, qu'est-ce qui recule, et par quoi commencer ?",
  ].join("\n");

  const maxRemise = Math.max(60, ...remiseParSeau.map((v) => v ?? 0));
  const maxDep = Math.max(30, ...depParSeau.map((v) => v ?? 0));
  const maxRetours = Math.max(2, ...retoursParSeau);
  const moyRetours = retoursParSeau.reduce((s, v) => s + v, 0) / n;
  const listeEpingles = Object.entries(epingles);

  return (
    <div className="tav-pi">
      <div className="pl-carte">
        <header className="in-tete">
          <h1 className="in-h1">Pilotage</h1>
          {boutons}
        </header>
        <div className="in-defile">
          {etat ? <div className="pfl-vide">{etat}</div> : null}

          {vu && listeEpingles.length ? (
            <section className="in-section" id="epingles">
              <div className="in-section-titre"><button type="button"><h2>Épinglés</h2></button></div>
              <div className="in-epingles">
                {listeEpingles.map(([cle, e]) => (
                  <div key={cle} className="in-epingles-ligne">
                    <TavPlainIcone nom="Etoile" taille={14} />
                    <Link href={e.href} className="in-tab-objet">{e.titre}</Link>
                    <span className="in-epingles-detail">{e.detail}</span>
                    <button type="button" className="pl-icone-bouton" aria-label={`Retirer ${e.titre} des épinglés`} title="Retirer des épinglés" onClick={() => poserEpingle(cle, null)}><TavPlainIcone nom="Croix" taille={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {vu ? (
            <Section titre="Vue d'ensemble" id="vue">
              <div id="part">
                <Carte titre="Part facturée" aide="Retours des 30 derniers jours facturés ou sans frais, sur les retours rendus." valeur={pct(part)} suffixe={`${traites} sur ${retours.length} retours`}
                  resume={`${factures} facturés, ${sansFrais} sans frais, ${enAttente.length} en attente.`} epingle={basculerCarte("part", "Part facturée", `${pct(part)} des retours`)}
                  alerte={enAttente.length ? { libelle: `${enAttente.length} à facturer`, href: `${BASE}/retours?famille=a_chiffrer` } : undefined}>
                  <Courbe valeurs={partParSeau} etiquettes={etiquettes} max={1} format={(v) => pct(v)} />
                </Carte>
              </div>
              <div id="remise">
                <Carte titre="Délai de remise en location" aide="Médiane entre le retour du véhicule et « prête » (inspection, nettoyage, carburant ou recharge)." valeur={duree(medRemise)} suffixe={`médiane, ${remises.length} remise${remises.length > 1 ? "s" : ""}`}
                  resume={remiseParSeau.map((v, i) => (v === null ? null : `${etiquettes[i] || i} : ${duree(v)}`)).filter(Boolean).join(" · ")} epingle={basculerCarte("remise", "Délai de remise en location", `médiane ${duree(medRemise)}`)}
                  alerte={remisesEnRetard ? { libelle: `${remisesEnRetard} en retard`, href: `${BASE}/parc?vue=remises` } : undefined}>
                  <Courbe valeurs={remiseParSeau} etiquettes={etiquettes} max={maxRemise} format={(v) => (v >= 60 ? `${Math.round(v / 60)} h` : `${Math.round(v)} min`)} />
                </Carte>
              </div>
              <div id="depanneuse">
                <Carte titre="Dépanneuse" aide="Médiane entre l'appel reçu et l'arrivée annoncée par le prestataire ; l'heure d'arrivée réelle n'est pas enregistrée." valeur={duree(medDep)} suffixe={`délai annoncé, ${depannages.length} intervention${depannages.length > 1 ? "s" : ""}`}
                  resume={`Délai cible de la grille : ${duree(cibleMed)} ; ${horsCible} au-delà.`} epingle={basculerCarte("depanneuse", "Délai de la dépanneuse", `médiane ${duree(medDep)}`)}
                  alerte={horsCible ? { libelle: `${horsCible} hors délai`, href: `${BASE}/incidents?onglet=assistance` } : undefined}>
                  <Courbe valeurs={depParSeau} etiquettes={etiquettes} max={maxDep} format={(v) => `${Math.round(v)} min`} />
                </Carte>
              </div>
            </Section>
          ) : null}

          {vu ? (
            <Section titre="Retours et facturation" id="facturation" colonnes={2}>
              <Carte titre={pas === "jour" ? "Retours par jour" : "Retours par semaine"} aide="Contrats rendus, par date de retour réel." valeur={String(retours.length)} suffixe="au total" large
                resume={retoursParSeau.map((v, i) => `${etiquettes[i] || i} : ${v}`).join(" · ")}>
                <Barres valeurs={retoursParSeau} etiquettes={etiquettes} ligne={moyRetours} libelleLigne="Moyenne" max={maxRetours} format={(v) => (Number.isInteger(v) ? String(v) : v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }))} />
              </Carte>
              <Carte titre="Facturé pour 100 retours" aide="L'indicateur du mois : euros TTC facturés, avoirs déduits, pour cent retours rendus dans le mois (toutes agences en base réelle)." large
                valeur={indicateur ? euros(indicateur.pour_100_retours) : "—"} suffixe={indicateur ? `${indicateur.mois}, ${indicateur.retours} retours${source === "reelle" && agence ? ", toutes agences" : ""}` : source === "reelle" && !directionLarge ? "lu par la direction et les valideurs" : "lecture…"}
                resume={indicateur ? `Facturé ${euros(indicateur.factures_ttc)}, avoirs ${euros(indicateur.avoirs_ttc)}.` : undefined}>
                {indicateur ? (
                  <Repartition lignes={[
                    { nom: "Facturé TTC", valeur: indicateur.factures_ttc, texte: euros(indicateur.factures_ttc), couleur: "#5c67f4" },
                    { nom: "Avoirs TTC", valeur: indicateur.avoirs_ttc, texte: euros(indicateur.avoirs_ttc), couleur: "#e33d3d" },
                    ...(indicateur.avant_pour_100_retours !== null ? [{ nom: `Avant Tavaro${indicateur.audit ? ` (${indicateur.audit})` : ""}`, valeur: indicateur.avant_pour_100_retours, texte: euros(indicateur.avant_pour_100_retours), couleur: "#636370",
                      evolution: indicateur.pour_100_retours !== null ? indicateur.pour_100_retours - indicateur.avant_pour_100_retours : null, href: `${BASE}/reseau?onglet=audit` }] : [{ nom: "Avant Tavaro : aucun audit clos", valeur: 0, texte: "—", couleur: "#636370", href: `${BASE}/reseau?onglet=audit` }]),
                  ]} />
                ) : <div className="in-vide-boite"><strong>Aucune donnée</strong><span>L&apos;indicateur se lit par la direction ou un valideur.</span></div>}
              </Carte>
            </Section>
          ) : null}

          {vu ? (
            <Section titre="Répartitions" id="repartitions">
              <Carte titre={`Part facturée par ${groupe === "agence" ? "agence" : "catégorie"}`} aide="Part des retours facturés ou sans frais, et nombre de retours." resume={repPart.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repPart} />
              </Carte>
              <Carte titre="Suite donnée aux retours" aide="Ce que sont devenus les retours des 30 derniers jours." resume={repSuite.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repSuite} />
              </Carte>
              <Carte titre={`Remise par ${groupe === "agence" ? "agence" : "catégorie"}`} aide="Médiane du délai de remise et nombre de remises finies." resume={repRemise.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repRemise} />
              </Carte>
              <Carte titre="Remises prêtes à temps" aide="Prêtes avant le départ suivant prévu, ou en retard ; remises en cours dont l'échéance est passée." valeur={remises.length ? pct(aTemps / remises.length) : "—"} suffixe={`${aTemps} sur ${remises.length}`} resume={repEtapes.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repEtapes} />
              </Carte>
              <Carte titre="Dépanneuse par prestataire" aide="Délai annoncé (médiane) et nombre d'interventions ; le badge compare au délai cible de la grille d'assistance, en minutes." resume={repDep.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repDep} vide="Aucune dépanneuse envoyée sur ces 30 jours." />
                <Link href={`${BASE}/reglages?vue=regles`} className="in-lien">Grille d&apos;assistance</Link>
              </Carte>
              <Carte titre="Dépanneuse par incident" aide="Nombre d'interventions de dépanneuse, par type d'incident." resume={repTypes.map((l) => `${l.nom} : ${l.texte}`).join("\n")}>
                <Repartition lignes={repTypes} vide="Aucune dépanneuse envoyée sur ces 30 jours." />
              </Carte>
            </Section>
          ) : null}

          {vu && directionLarge ? (
            <Section titre="Flotte" id="flotte" colonnes={2}>
              <div id="sortir">
                <Carte titre="Véhicules à sortir" aide="Avis de la fiche économique du véhicule (marge, utilisation, kilométrage, cote) : toute la flotte, sans ventilation par agence." valeur={String(aSortir.length)} suffixe="à sortir maintenant" large
                  resume={resumeVh(aSortir)} epingle={basculerCarte("sortir", "Véhicules à sortir", `${aSortir.length} à sortir`)}
                  alerte={sortiesOuvertes.length ? { libelle: `${sortiesOuvertes.length} mise${sortiesOuvertes.length > 1 ? "s" : ""} en vente ouverte${sortiesOuvertes.length > 1 ? "s" : ""}`, href: `${BASE}/reseau?onglet=flotte` } : undefined}>
                  <Repartition lignes={repAvis} vide="Aucune fiche économique : la flotte se lit par la direction." />
                </Carte>
              </div>
              <Carte titre="Marge sur 12 mois des véhicules à sortir" aide="Revenu de location et frais, moins atelier, financement et perte de valeur." large
                valeur={euros(aSortir.reduce((s, f) => s + f.marge, 0))} suffixe={`${aSortir.length} véhicule${aSortir.length > 1 ? "s" : ""}`} resume={resumeVh(aSortir)}>
                <Repartition lignes={aSortir.map((f, i) => ({ nom: `${f.immatriculation} ${f.modele ?? ""}`.trim(), valeur: Math.abs(f.marge), texte: `${euros(f.marge)} · ${f.utilisation_pct} %`, couleur: f.marge < 0 ? "#e33d3d" : COULEURS[i % COULEURS.length] }))} vide="Aucun véhicule à sortir." />
              </Carte>
            </Section>
          ) : null}

          {vu ? (
            <Section titre="Agences" id="agences" tableau>
              <OutilsTableau invite="Chercher une agence" recherche={chercheAg} setRecherche={setChercheAg}
                telecharger={() => exporterCSV("tavaro-pilotage-agences", ["Agence", "Retours", "Part facturée", "Facturé TTC (€)", "Délai de remise (min)", "Remises", "Délai dépanneuse (min)", "Dépanneuses"], lignesAgences.map((l) => [l.nom, l.retours, l.part === null ? "" : Math.round(l.part * 100), Math.round(l.montant), l.remise === null ? "" : Math.round(l.remise), l.remises, l.depanneuse === null ? "" : Math.round(l.depanneuse), l.depannages]))} />
              <div className="in-tableau" role="table" aria-label="Agences" style={{ ["--in-cols" as string]: "200px repeat(5, minmax(0, 1fr)) 40px" }}>
                <div className="in-tab-ligne in-tab-tete" role="row">
                  <span role="columnheader">Agence</span><span role="columnheader">Retours</span><span role="columnheader">Part facturée</span><span role="columnheader">Facturé</span><span role="columnheader">Remise</span><span role="columnheader">Dépanneuse</span><span role="columnheader" />
                </div>
                {lignesAgences.map((l) => (
                  <div key={l.id} className="in-tab-ligne" role="row">
                    <button type="button" className="in-tab-objet" role="cell" title={agence === l.id ? "Retirer le filtre" : "Filtrer la page sur cette agence"} onClick={() => setAgence(agence === l.id ? null : l.id)}><TavPlainIcone nom="Batiment" taille={14} />{l.nom}</button>
                    <span role="cell">{l.retours}</span>
                    <span role="cell" className={l.part !== null && l.part < 0.8 ? "in-sous" : undefined}>{pct(l.part)}</span>
                    <span role="cell">{euros(l.montant)}</span>
                    <span role="cell">{duree(l.remise)}{l.remises ? ` · ${l.remises}` : ""}</span>
                    <span role="cell">{duree(l.depanneuse)}{l.depannages ? ` · ${l.depannages}` : ""}</span>
                    <span role="cell">
                      <button type="button" className={`in-epingle${epingles[`ag:${l.id}`] ? " in-epingle--actif" : ""}`} aria-pressed={!!epingles[`ag:${l.id}`]} aria-label={`Épingler ${l.nom}`} title={epingles[`ag:${l.id}`] ? "Retirer des épinglés" : "Épingler"}
                        onClick={() => poserEpingle(`ag:${l.id}`, epingles[`ag:${l.id}`] ? null : { titre: l.nom, detail: `${pct(l.part)} facturé · remise ${duree(l.remise)}`, href: `${BASE}/pilotage#agences` })}>
                        <TavPlainIcone nom="Etoile" taille={14} />
                      </button>
                    </span>
                  </div>
                ))}
                <div className="in-tab-ligne in-tab-total" role="row">
                  <span role="cell">TOTAL</span><span role="cell">{retours.length}</span><span role="cell">{pct(part)}</span><span role="cell">{euros(montantTotal)}</span><span role="cell">{duree(medRemise)}</span><span role="cell">{duree(medDep)}</span><span role="cell" />
                </div>
              </div>
            </Section>
          ) : null}

          {vu && directionLarge && aSortir.length ? (
            <Section titre="Véhicules à sortir" id="vehicules" tableau>
              <OutilsTableau invite="Chercher un véhicule" recherche={chercheVh} setRecherche={setChercheVh} telecharger={() => exporterCSV("tavaro-vehicules-a-sortir", ENTETES_VH, lignesVh.map(ligneVhCSV))} />
              {choisiesVh.length ? (
                <div className="in-selection" role="toolbar" aria-label="Actions sur la sélection">
                  <span className="in-selection-compte">{choisiesVh.length} choisi{choisiesVh.length > 1 ? "s" : ""}</span>
                  <button type="button" className="in-bouton" onClick={() => epinglerVh(choisiesVh)}><TavPlainIcone nom="Etoile" taille={14} /><span className="in-bouton-lib">Épingler</span></button>
                  <button type="button" className="in-bouton" onClick={() => copierAvis(`Véhicules à sortir, ${choisiesVh.length} choisis :\n${resumeVh(choisiesVh)}\nQuestion : dans quel ordre les mettre en vente, et par quel canal ?`, "Résumé")}><Bouclier taille={14} /><span className="in-bouton-lib">Copier pour l&apos;assistant</span></button>
                  <button type="button" className="in-bouton" onClick={() => exporterCSV("tavaro-vehicules-choisis", ENTETES_VH, choisiesVh.map(ligneVhCSV))}><span className="in-bouton-lib">Exporter en CSV</span></button>
                  <button type="button" className="in-bouton" onClick={() => setChoisis(new Set())}><TavPlainIcone nom="Croix" taille={14} /><span className="in-bouton-lib">Vider</span></button>
                </div>
              ) : null}
              <div className="in-tableau" role="table" aria-label="Véhicules à sortir" style={{ ["--in-cols" as string]: "28px 200px repeat(4, minmax(0, 1fr)) 150px" }}>
                <div className="in-tab-ligne in-tab-tete" role="row">
                  <span role="columnheader"><input type="checkbox" className="in-case" aria-label="Tout choisir" checked={!!lignesVh.length && choisiesVh.length === lignesVh.length} onChange={(e) => setChoisis(e.target.checked ? new Set(lignesVh.map((f) => f.vehicule)) : new Set())} /></span>
                  <span role="columnheader">Véhicule</span><span role="columnheader">Marge 12 mois</span><span role="columnheader">Utilisation</span><span role="columnheader">Km</span><span role="columnheader">Canal</span><span role="columnheader" />
                </div>
                {lignesVh.map((f) => (
                  <div key={f.vehicule} className="in-tab-ligne" role="row" data-choisi={choisis.has(f.vehicule) ? "" : undefined}>
                    <span role="cell"><input type="checkbox" className="in-case" aria-label={`Choisir ${f.immatriculation}`} checked={choisis.has(f.vehicule)} onChange={(e) => setChoisis((s) => { const x = new Set(s); if (e.target.checked) x.add(f.vehicule); else x.delete(f.vehicule); return x; })} /></span>
                    <Link href={`${BASE}/reseau?onglet=flotte`} className="in-tab-objet" role="cell" title={f.raisons.join(" ; ")}>{f.immatriculation} · {f.modele ?? "—"}</Link>
                    <span role="cell" className={f.marge < 0 ? "in-sous" : undefined}>{euros(f.marge)}</span>
                    <span role="cell">{f.utilisation_pct} %</span>
                    <span role="cell">{f.km !== null ? f.km.toLocaleString("fr-FR") : "—"}</span>
                    <span role="cell">{CANAUX[f.canal] ?? f.canal}{f.moment ? ` · ${f.moment}` : ""}</span>
                    <span role="cell" className="in-tab-gestes">
                      <button type="button" className="in-lien" onClick={() => (epingles[`vh:${f.vehicule}`] ? poserEpingle(`vh:${f.vehicule}`, null) : epinglerVh([f]))}>{epingles[`vh:${f.vehicule}`] ? "Désépingler" : "Épingler"}</button>
                      <button type="button" className="in-lien" onClick={() => copierAvis(`${resumeVh([f])}\nQuestion : faut-il le mettre en vente maintenant ?`, "Résumé")}>Copier</button>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {vu ? (
            <footer className="in-pied">
              <span className="in-pied-sur">Depuis le début</span>
              <h3 className="in-pied-titre">Retours facturés</h3>
              {(() => {
                const total = tous.filter((d) => de(d.contrat.entite_id) && d.factures.length > 0).length;
                return (
                  <span className="in-volets" aria-label={`${total} retours facturés`}>
                    {String(total).padStart(3, "0").split("").map((c, i) => <span key={i} className="in-volet">{c}</span>)}
                  </span>
                );
              })()}
            </footer>
          ) : null}
        </div>
        {vu && sidekick ? (
          <div className="in-sidekick" role="toolbar" aria-label="Assistant">
            <button type="button" className="in-sidekick-question"
              onClick={() => void copier(resumeTout()).then((ok) => { setAvisSk(ok ? "Copié : collez-le dans l'assistant de l'espace." : "Le presse-papier a refusé la copie."); window.setTimeout(() => setAvisSk(null), 3500); })}>
              <Bouclier />
              <strong>Copier pour l&apos;assistant</strong>
              <span>{avisSk ?? "qu'est-ce qui progresse, qu'est-ce qui recule ?"}</span>
              <kbd className="pl-kbd">B</kbd>
            </button>
            <button type="button" className="pl-icone-bouton" aria-label="Relire les chiffres" title={source === "reelle" ? "Relire les chiffres" : "Données d'exemple : rien à relire"}
              onClick={() => { if (source === "reelle") { void t.relire().then(() => toast("Chiffres relus.", "vert")); } else { setAvisSk("Données d'exemple : rien à relire."); window.setTimeout(() => setAvisSk(null), 3000); } }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
            </button>
            <button type="button" className="pl-icone-bouton" aria-label="Replier" title="Replier" onClick={() => setSidekick(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
