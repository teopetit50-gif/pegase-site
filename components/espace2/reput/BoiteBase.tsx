"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT — la base de connaissances, sur la boîte de réception de Linear
   (28/10/2026)

   La seconde page de REPUT (/espace2/reput/base), au modèle « Inbox » de
   Linear : à gauche la liste des fiches, une par ligne — l'avatar à la
   couleur de son sujet et à l'icône de son genre, la référence et la
   question, l'état et les premiers mots de la réponse, l'hexagone d'état
   (en vigueur, brouillon, à revoir) et la date de la dernière modification ;
   un point bleu sur ce qui attend quelqu'un (brouillon à valider, période
   échue). À droite la page de la fiche choisie (?fiche=<id>) : la réponse
   entière, son sujet, sa source, sa période, les demandes qui l'ont citée,
   son histoire, et tous les gestes de l'ancien écran — écrire une fiche,
   la corriger (une nouvelle version), la valider, la retirer (avec son
   motif). ↑/↓ changent de fiche, Échap referme, comme sur Linear ; rien
   n'est choisi d'avance.

   Les filtres vivent dans l'adresse (?filtre=etat:brouillon, sujet, genre,
   usage), retirés par leur pastille ; aucun menu ne mène ailleurs.

   Mêmes données et mêmes portes que l'ancien écran
   (components/espace/reput/BaseConnaissances, rendu par EcranReput) :
   l'exemple (mondeExemple, modifié en mémoire) ou la base réelle
   (chargerMonde sous RLS, en temps réel ; reput_ecrire_connaissance,
   reput_valider_connaissance, reput_retirer_connaissance).
   Gabarit : ../lin/lin.css ; en plus : ./reput.css et ./boite-base.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Euro,
  FileText,
  Info,
  ListFilter,
  MessageCircleQuestion,
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateHeure } from "@/components/espace/format";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { csvDemandes, telecharger } from "@/components/espace/reput/export";
import { chargerMonde, ecrireFiche, monClient, retirerFiche, validerFiche } from "@/components/espace/reput/portes";
import type { Client, Demande, Fiche, GenreFiche, Monde, Reponse, StatutDemande, StatutReponse } from "@/components/espace/reput/types";
import { CarteDroite, Choix, Menu, MenuActions, MenuOptions, type Option, type Serie } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import "./reput.css";
import "./boite-base.css";

type Teinte = "vert" | "jaune" | "rouge" | "gris" | "bleu";
type Etat = "brouillon" | "a_revoir" | "a_venir" | "en_vigueur";
type Dimension = "etat" | "sujet" | "genre" | "usage";
type Filtres = Partial<Record<Dimension, string>>;
type Tri = "recente" | "etat" | "sujet" | "usage" | "titre";
type Usage = "citee" | "jamais";

const BASE = `${RACINE}/reput/base`;
const JOUR = 86_400_000;
const JOURS = 7;

/* l'état d'une fiche : ce qui attend une personne d'abord (brouillon, période échue) */
const ETATS: Record<Etat, { libelle: string; court: string; teinte: Teinte; hexa: EtatProjet }> = {
  brouillon: { libelle: "Brouillon à valider", court: "Brouillon à valider", teinte: "jaune", hexa: "en-cours" },
  a_revoir: { libelle: "À revoir : période échue", court: "À revoir", teinte: "rouge", hexa: "annule" },
  a_venir: { libelle: "Validée, en vigueur plus tard", court: "En vigueur plus tard", teinte: "gris", hexa: "planifie" },
  en_vigueur: { libelle: "En vigueur", court: "En vigueur", teinte: "vert", hexa: "fait" },
};
const ORDRE_ETATS: Etat[] = ["brouillon", "a_revoir", "a_venir", "en_vigueur"];
/* les genres de l'ancien écran (BaseConnaissances) */
const GENRES: Record<GenreFiche, string> = { question: "Question-réponse", horaires: "Horaires", tarif: "Tarif", document: "Document", information: "Information" };
const GENRES_COURTS: Record<GenreFiche, string> = { question: "QR", horaires: "HOR", tarif: "TAR", document: "DOC", information: "INF" };
const USAGES: Record<Usage, string> = { citee: "Citée dans une réponse", jamais: "Jamais citée" };
const DIMENSIONS: Dimension[] = ["etat", "sujet", "genre", "usage"];
const STATUTS_DEMANDE: Record<StatutDemande, string> = {
  a_preparer: "En préparation",
  a_valider: "Réponse à valider",
  a_traiter: "À traiter vous-même",
  validee: "Validée, en partance",
  envoyee: "Répondue",
  refusee: "Réponse refusée",
  bloquee: "Envoi bloqué",
  ignoree: "Écartée",
};
const ETATS_REPONSE: Record<StatutReponse, string> = {
  a_valider: "à valider",
  approuvee: "approuvée",
  envoyee: "envoyée",
  refusee: "refusée",
  bloquee: "bloquée à l'envoi",
  remplacee: "remplacée",
  sans_envoi: "sans envoi",
};
/* les couleurs d'icône de projet de Linear, une par sujet */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

type Brouillon = { id: string | null; sujet: string; genre: GenreFiche; titre: string; contenu: string; source: string; valide_du: string; valide_au: string };
type Retour = { texte: string; teinte: "vert" | "rouge" };

/* ——— petites aides ——— */
const deux = (n: number) => String(n).padStart(2, "0");
/* le jour du visiteur, AAAA-MM-JJ, pour comparer aux périodes de validité */
const jourDe = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
};
const minuit = (t: number) => {
  const x = new Date(t);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
/* une date calendaire (AAAA-MM-JJ) se lit telle quelle, sans glisser à la veille à l'ouest de Greenwich */
const dateCal = (j: string | null | undefined) => (j ? new Date(`${j.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dateJour = (j: string | null | undefined) => (j ? new Date(`${j.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—");
const dateCourte = (iso: string | number | null | undefined) => (iso === null || iso === undefined ? "—" : new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
/* l'heure de la boîte de Linear : l'heure aujourd'hui, le jour cette année, la date sinon */
const heureDe = (iso: string, maintenant: number) => {
  const d = new Date(iso);
  const n = new Date(maintenant);
  if (minuit(d.getTime()) === minuit(maintenant)) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (d.getFullYear() === n.getFullYear()) return dateCourte(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};
const pluriel = (n: number, mot: string, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
const extrait = (t: string | null | undefined, n = 90) => {
  const x = (t ?? "").replace(/\s+/g, " ").trim();
  return x.length > n ? `${x.slice(0, n - 1)}…` : x;
};
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => somme(v.slice(0, i + 1)));
const couleurDe = (cle: string) => COULEURS[[...cle].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];

const etatDe = (f: Fiche, jour: string): Etat => {
  if (f.statut === "brouillon") return "brouillon";
  if (f.valide_au && f.valide_au.slice(0, 10) < jour) return "a_revoir";
  if (f.valide_du && f.valide_du.slice(0, 10) > jour) return "a_venir";
  return "en_vigueur";
};
const nonLue = (e: Etat) => e === "brouillon" || e === "a_revoir";
/* la référence courte d'une fiche : son genre et la fin de son identifiant d'origine (stable d'une version à l'autre) */
const refDe = (f: Fiche) => `${GENRES_COURTS[f.genre] ?? "FI"}-${f.origine_id.replace(/-/g, "").slice(-4).toUpperCase()}`;
const derniereDe = (f: Fiche) => [f.cree_le, f.valide_le].filter((x): x is string => !!x).sort((a, b) => b.localeCompare(a))[0] ?? f.cree_le;
const periodeDe = (f: { valide_du: string; valide_au: string | null }) => `du ${dateCal(f.valide_du)}${f.valide_au ? ` au ${dateCal(f.valide_au)}` : ", sans fin"}`;
const sujetDe = (m: Monde, code: string) => m.sujets.find((s) => s.code === code)?.libelle ?? code;
/* les réponses qui citent cette version de la fiche (reput_reponses.sources), et leurs demandes */
const citationsDe = (m: Monde, f: Fiche): Reponse[] => m.reponses.filter((r) => r.sources.includes(f.id));
const demandesDe = (m: Monde, reps: Reponse[]): Demande[] => [...new Set(reps.map((r) => r.demande_id))].map((id) => m.demandes.find((d) => d.id === id)).filter((d): d is Demande => !!d);
const nomDe = (d: Demande) => d.de_nom || d.adresse_reponse || "Client";
const usageDe = (m: Monde, f: Fiche): Usage => (citationsDe(m, f).length ? "citee" : "jamais");

/* ——— les filtres, dans l'adresse : ?filtre=etat:brouillon&filtre=sujet:horaires&fiche=<id> ——— */
const valeurValide = (dim: Dimension, v: string) => (dim === "etat" ? v in ETATS : dim === "genre" ? v in GENRES : dim === "usage" ? v in USAGES : v.length > 0);
function lireFiltres(params: { getAll: (k: string) => string[] }): Filtres {
  const f: Filtres = {};
  for (const brut of params.getAll("filtre")) {
    const i = brut.indexOf(":");
    const dim = brut.slice(0, i) as Dimension;
    const v = brut.slice(i + 1);
    if (i > 0 && DIMENSIONS.includes(dim) && valeurValide(dim, v)) f[dim] = v;
  }
  return f;
}
const sans = (f: Filtres, dim: Dimension): Filtres => {
  const x = { ...f };
  delete x[dim];
  return x;
};
/* choisir de nouveau la valeur active retire le filtre */
const bascule = (f: Filtres, dim: Dimension, v: string): Filtres => (f[dim] === v ? sans(f, dim) : { ...f, [dim]: v });
const lien = (f: Filtres, fiche: string | null) => {
  const q = [...DIMENSIONS.filter((dim) => f[dim]).map((dim) => `filtre=${dim}:${encodeURIComponent(f[dim] ?? "")}`), fiche ? `fiche=${encodeURIComponent(fiche)}` : null].filter(Boolean);
  return q.length ? `${BASE}?${q.join("&")}` : BASE;
};
function correspond(m: Monde, f: Fiche, filtres: Filtres, jour: string, q: string): boolean {
  if (filtres.etat && etatDe(f, jour) !== filtres.etat) return false;
  if (filtres.sujet && f.sujet !== filtres.sujet) return false;
  if (filtres.genre && f.genre !== filtres.genre) return false;
  if (filtres.usage && usageDe(m, f) !== filtres.usage) return false;
  if (q) {
    const texte = `${refDe(f)} ${f.titre} ${f.contenu} ${f.source} ${sujetDe(m, f.sujet)}`.toLowerCase();
    if (!texte.includes(q.toLowerCase())) return false;
  }
  return true;
}

/* ——— les icônes ——— */
function IconeGenre({ genre, taille = 16, couleur }: { genre: GenreFiche; taille?: number; couleur?: string }) {
  const p = { width: taille, height: taille, strokeWidth: taille > 16 ? 1.6 : 1.8, style: couleur ? { color: couleur } : undefined, "aria-hidden": true as const };
  if (genre === "horaires") return <Clock {...p} />;
  if (genre === "tarif") return <Euro {...p} />;
  if (genre === "document") return <FileText {...p} />;
  if (genre === "information") return <Info {...p} />;
  return <MessageCircleQuestion {...p} />;
}
function IconeEtat({ etat }: { etat: Etat }) {
  return <IconeStatutProjet etat={ETATS[etat].hexa} titre={ETATS[etat].libelle} />;
}
/* le losange d'un jalon : contour seul, jaune à 40 % une fois l'étape atteinte (comme la première page) */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

/* la courbe de la carte « Usage » : celle de la première page (GraphiqueDemandes), l'axe en nombres entiers */
function GraphiqueCitations({ etiquettes, series, libelle, hauteur = 140 }: { etiquettes: string[]; series: Serie[]; libelle: string; hauteur?: number }) {
  const degrade = `lin-base-degrade-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const L = 600;
  const H = hauteur;
  const n = etiquettes.length;
  const max = Math.ceil(Math.max(1, ...series.flatMap((s) => s.valeurs)) / 4) * 4;
  const lisse = (valeurs: number[]) => {
    const pts = valeurs.map((v, i) => [(i / Math.max(1, n - 1)) * L, H - (v / max) * H] as const);
    let ligne = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] ?? p2;
      const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6),
        c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
      ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
    }
    return ligne;
  };
  const couleur = { gris: "var(--lin-graph-gris)", jaune: "var(--lin-graph-jaune)", bleu: "var(--lin-graph-bleu)" };
  return (
    <figure className="v2-va-courbe lin-courbe">
      <div className="v2-va-axe-y" aria-hidden="true" style={{ height: H }}>
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{max * p}</span>
        ))}
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible" }} role="img" aria-label={libelle}>
          <defs>
            <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--lin-graph-bleu)" stopOpacity="0.4" />
              <stop offset="1" stopColor="var(--lin-graph-bleu)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {series
            .filter((s) => s.aire)
            .map((s) => (
              <path key={`${s.cle}-aire`} d={`${lisse(s.valeurs)} L${L},${H} L0,${H} Z`} fill={`url(#${degrade})`} />
            ))}
          {series.map((s) => (
            <path key={s.cle} d={lisse(s.valeurs)} pathLength={1} className="v2-trace" fill="none" stroke={couleur[s.teinte]} strokeWidth={s.aire ? 2 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="v2-va-axe">
          {etiquettes.map((e, i) => (
            <span key={i} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* ce qui s'est passé pour une fiche, du plus récent au plus ancien : écrite, validée, citée */
type Evenement = { cle: string; le: string; quoi: string; fait: boolean };
function evenementsDe(m: Monde, f: Fiche): Evenement[] {
  const e: Evenement[] = [{ cle: "ecrite", le: f.cree_le, quoi: f.version > 1 ? `version ${f.version} écrite` : "fiche écrite", fait: false }];
  if (f.valide_le) e.push({ cle: "validee", le: f.valide_le, quoi: "validée et mise en vigueur", fait: true });
  for (const r of citationsDe(m, f)) {
    const d = m.demandes.find((x) => x.id === r.demande_id);
    e.push({ cle: r.id, le: r.cree_le, quoi: `citée dans la réponse à ${d ? nomDe(d) : "une demande"} (${ETATS_REPONSE[r.statut]})`, fait: r.statut === "envoyee" });
  }
  return e.sort((a, b) => b.le.localeCompare(a.le));
}

/* ══════════════════════════════════════════════════════════════════════ */

export default function BoiteBase() {
  const { source } = useSource();
  const maintenant = useMaintenant();
  const [local, setLocal] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<{ monde: Monde; client: Client } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const client = await monClient();
      if (!client) throw new Error("Aucun compte rattaché à cette session.");
      setReel({ monde: await chargerMonde(client), client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["reput_demandes", "reput_reponses", "reput_connaissances"], source === "reelle", () => void charger());

  const vide = (texte: string) => (
    <div className="lin">
      <h1 className="v2-sr">Base de connaissances</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Base de connaissances</span>
      </header>
      <p className="lin-vide">{texte}</p>
    </div>
  );
  if (erreur) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  /* 27/10 — le monde d'exemple est daté à l'heure du visiteur : rien avant le montage (voir ../horloge.ts) */
  const monde = source === "exemple" ? local : (reel?.monde ?? null);
  if (!monde || maintenant === null) return vide("Lecture de la base…");
  const client = source === "reelle" ? (reel?.client ?? null) : null;
  const role = source === "exemple" ? "valideur" : (client?.role ?? "lecteur");
  return <Boite m={monde} source={source} client={client} role={role} maint={maintenant} relire={charger} setLocal={setLocal} />;
}

function Boite({
  m,
  source,
  client,
  role,
  maint,
  relire,
  setLocal,
}: {
  m: Monde;
  source: "exemple" | "reelle";
  client: Client | null;
  role: string;
  maint: number;
  relire: () => Promise<void>;
  setLocal: React.Dispatch<React.SetStateAction<Monde>>;
}) {
  const routeur = useRouter();
  const params = useSearchParams();
  const [tri, setTri] = useState<Tri>("recente");
  const [q, setQ] = useState("");
  const [onglet, setOnglet] = useState<"apercu" | "historique">("apercu");
  const [edition, setEdition] = useState<Brouillon | null>(null);
  const [retrait, setRetrait] = useState<{ id: string; motif: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);

  /* les droits de l'ancien écran : un lecteur lit ; un collaborateur écrit un brouillon ; un gérant, un administrateur ou un valideur décide */
  const ecrit = role !== "lecteur";
  const decide = role === "gerant" || role === "admin" || role === "valideur";
  const jour = jourDe(maint);
  const cleParams = params.toString();
  const filtres = useMemo(() => lireFiltres(new URLSearchParams(cleParams)), [cleParams]);
  const actifs = DIMENSIONS.filter((dim) => filtres[dim]);
  const idChoisi = params.get("fiche");
  const choisie = idChoisi ? (m.fiches.find((f) => f.id === idChoisi) ?? null) : null;

  const visibles = useMemo(() => {
    const ordreSujet = (code: string) => m.sujets.find((s) => s.code === code)?.ordre ?? 9999;
    return m.fiches
      .filter((f) => correspond(m, f, filtres, jour, q))
      .sort((a, b) => {
        if (tri === "etat") return ORDRE_ETATS.indexOf(etatDe(a, jour)) - ORDRE_ETATS.indexOf(etatDe(b, jour)) || derniereDe(b).localeCompare(derniereDe(a));
        if (tri === "sujet") return ordreSujet(a.sujet) - ordreSujet(b.sujet) || a.titre.localeCompare(b.titre, "fr");
        if (tri === "usage") return citationsDe(m, b).length - citationsDe(m, a).length || derniereDe(b).localeCompare(derniereDe(a));
        if (tri === "titre") return a.titre.localeCompare(b.titre, "fr");
        return derniereDe(b).localeCompare(derniereDe(a));
      });
  }, [m, filtres, jour, q, tri]);
  const ids = visibles.map((f) => f.id);
  const cleIds = ids.join(",");

  const choisir = useCallback(
    (id: string | null, remplacer = true) => {
      setEdition(null);
      setRetrait(null);
      setOnglet("apercu");
      /* le mot d'un geste reste sur la page vide (une fiche retirée), pas sur la fiche suivante */
      if (id) setRetour(null);
      const href = lien(filtres, id);
      if (remplacer) routeur.replace(href, { scroll: false });
      else routeur.push(href, { scroll: false });
    },
    [filtres, routeur],
  );

  /* ↑/↓ changent de fiche, Échap referme l'édition puis la fiche — hors d'un champ et d'un menu ouvert */
  useEffect(() => {
    const liste = cleIds ? cleIds.split(",") : [];
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (document.querySelector(".lin-boite .lin-menu")) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!liste.length) return;
        e.preventDefault();
        const i = idChoisi ? liste.indexOf(idChoisi) : -1;
        const pas = e.key === "ArrowDown" ? 1 : -1;
        const j = i < 0 ? (pas > 0 ? 0 : liste.length - 1) : Math.min(liste.length - 1, Math.max(0, i + pas));
        if (liste[j] !== idChoisi) choisir(liste[j]);
      } else if (e.key === "Escape") {
        if (edition || retrait) {
          setEdition(null);
          setRetrait(null);
        } else if (idChoisi) choisir(null);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cleIds, idChoisi, edition, retrait, choisir]);

  /* la ligne choisie reste visible quand les flèches la déplacent */
  useEffect(() => {
    if (!idChoisi) return;
    const ligne = document.querySelector<HTMLElement>(".lin-boite-ligne[data-actif]");
    ligne?.scrollIntoView({ block: "nearest" });
    /* le focus suit la sélection quand il était déjà sur une ligne (sinon l'anneau resterait sur l'ancienne) */
    if (ligne && document.activeElement?.classList.contains("lin-boite-ligne")) ligne.focus({ preventScroll: true });
  }, [idChoisi]);

  /* ——— les gestes : les portes de l'ancien écran, ou l'exemple en mémoire ——— */
  const agir = async (porte: () => Promise<unknown>, enMemoire: (x: Monde) => Monde, message: string, apres?: string | null) => {
    setEnvoi(true);
    setRetour(null);
    try {
      if (source === "reelle") {
        await porte();
        await relire();
      } else setLocal(enMemoire);
      setRetour({ texte: message, teinte: "vert" });
      setRetrait(null);
      if (apres !== undefined) choisir(apres);
    } catch (e) {
      setRetour({ texte: e instanceof Error ? e.message : "La base n'a pas répondu.", teinte: "rouge" });
    } finally {
      setEnvoi(false);
    }
  };
  const valider = (f: Fiche) =>
    void agir(
      () => validerFiche(f.id),
      (x) => ({ ...x, fiches: x.fiches.map((y) => (y.id === f.id ? { ...y, statut: "validee", valide_le: new Date().toISOString() } : y)) }),
      "La fiche est validée et en vigueur.",
    );
  const retirer = (f: Fiche, motif: string) =>
    void agir(
      () => retirerFiche(f.id, motif),
      (x) => ({ ...x, fiches: x.fiches.filter((y) => y.id !== f.id) }),
      "La fiche est retirée : les réponses ne la citent plus.",
      null,
    );
  const ouvrirEdition = (f: Fiche) => {
    setRetour(null);
    setRetrait(null);
    setOnglet("apercu");
    setEdition({ id: f.id, sujet: f.sujet, genre: f.genre, titre: f.titre, contenu: f.contenu, source: f.source, valide_du: f.valide_du, valide_au: f.valide_au ?? "" });
  };
  const nouvelle = () => {
    const actifsSujets = m.sujets.filter((s) => s.actif);
    setRetour(null);
    setRetrait(null);
    if (idChoisi) routeur.replace(lien(filtres, null), { scroll: false });
    setEdition({
      id: null,
      sujet: actifsSujets.some((s) => s.code === "information") ? "information" : (actifsSujets[0]?.code ?? "information"),
      genre: "question",
      titre: "",
      contenu: "",
      source: "",
      valide_du: "",
      valide_au: "",
    });
  };
  const pret = (b: Brouillon) => !!(b.titre.trim() && b.contenu.trim() && b.source.trim() && (!b.valide_au || !b.valide_du || b.valide_au >= b.valide_du));
  /* écrire ou corriger : reput_ecrire_connaissance crée une nouvelle version, en vigueur si l'on décide, en brouillon sinon */
  const enregistrer = async (b: Brouillon) => {
    const fiche = {
      sujet: b.sujet,
      genre: b.genre,
      titre: b.titre.trim(),
      contenu: b.contenu.trim(),
      source: b.source.trim(),
      ...(b.valide_du ? { valide_du: b.valide_du } : {}),
      valide_au: b.valide_au || null,
    };
    setEnvoi(true);
    setRetour(null);
    try {
      let nouvelId: string | null = null;
      if (source === "reelle") {
        const r = (await ecrireFiche(b.id, client!.client_id, fiche as Partial<Fiche>)) as unknown;
        nouvelId = typeof r === "string" ? r : r && typeof r === "object" && "id" in r ? String((r as { id: unknown }).id) : null;
        await relire();
      } else {
        const id = crypto.randomUUID();
        nouvelId = id;
        setLocal((x) => {
          const avant = b.id ? x.fiches.find((y) => y.id === b.id) : undefined;
          const quand = new Date().toISOString();
          const nouvelleFiche: Fiche = {
            id,
            entite_id: null,
            origine_id: avant?.origine_id ?? id,
            version: (avant?.version ?? 0) + 1,
            sujet: b.sujet,
            genre: b.genre,
            titre: fiche.titre,
            contenu: fiche.contenu,
            langue: "fr",
            source: fiche.source,
            valide_du: b.valide_du || quand.slice(0, 10),
            valide_au: b.valide_au || null,
            statut: decide ? "validee" : "brouillon",
            cree_le: quand,
            valide_le: decide ? quand : null,
          };
          return { ...x, fiches: [nouvelleFiche, ...x.fiches.filter((y) => !(decide && avant && y.origine_id === avant.origine_id))] };
        });
      }
      setRetour({ texte: decide ? "La fiche est en vigueur : la prochaine réponse la cite." : "Brouillon enregistré : un valideur le met en vigueur.", teinte: "vert" });
      setEdition(null);
      setOnglet("apercu");
      routeur.replace(lien(filtres, nouvelId), { scroll: false });
    } catch (e) {
      setRetour({ texte: e instanceof Error ? e.message : "La base n'a pas répondu.", teinte: "rouge" });
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— la liste ——— */
  const aTraiter = m.fiches.filter((f) => nonLue(etatDe(f, jour))).length;
  /* les chiffres d'un menu comptent sans le filtre de sa propre dimension, comme les facettes de Linear */
  const compte = (dim: Dimension, v: string) => m.fiches.filter((f) => correspond(m, f, { ...sans(filtres, dim), [dim]: v }, jour, q)).length;
  const groupesFiltre: { dim: Dimension; titre: string; valeurs: { v: string; libelle: string; icone: React.ReactNode }[] }[] = [
    { dim: "etat", titre: "État", valeurs: ORDRE_ETATS.map((e) => ({ v: e, libelle: ETATS[e].libelle, icone: <IconeEtat etat={e} /> })) },
    {
      dim: "sujet",
      titre: "Sujet",
      valeurs: [...new Set(m.fiches.map((f) => f.sujet))]
        .sort((a, b) => (m.sujets.find((s) => s.code === a)?.ordre ?? 9999) - (m.sujets.find((s) => s.code === b)?.ordre ?? 9999))
        .map((s) => ({ v: s, libelle: sujetDe(m, s), icone: <IconeDiese /> })),
    },
    { dim: "genre", titre: "Genre", valeurs: (Object.keys(GENRES) as GenreFiche[]).filter((g) => m.fiches.some((f) => f.genre === g)).map((g) => ({ v: g, libelle: GENRES[g], icone: <IconeGenre genre={g} /> })) },
    { dim: "usage", titre: "Usage", valeurs: (Object.keys(USAGES) as Usage[]).map((u) => ({ v: u, libelle: USAGES[u], icone: u === "citee" ? <MessageSquare width={16} height={16} /> : <IconeDocument /> })) },
  ];
  const libelleFiltre = (dim: Dimension, v: string) => groupesFiltre.find((g) => g.dim === dim)?.valeurs.find((x) => x.v === v) ?? { libelle: v, icone: <IconeDiese /> };
  const exporter = () => telecharger(`demandes-clients-${new Date(maint).toISOString().slice(0, 10)}.csv`, csvDemandes(m));

  const liste = (
    <section className="lin-boite-liste" aria-label="Fiches de la base">
      <header className="lin-tete">
        <span className="lin-boite-titre">Base de connaissances</span>
        <div className="lin-tete-droite">
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Exporter les demandes vers un tableur" title="Exporter les demandes vers un tableur" onClick={exporter}>
            <Download width={14} height={14} aria-hidden="true" />
          </button>
          {ecrit ? (
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Nouvelle fiche" title="Nouvelle fiche" aria-pressed={!!edition && edition.id === null} onClick={nouvelle}>
              <Plus width={14} height={14} aria-hidden="true" />
            </button>
          ) : null}
          <Menu
            largeur={300}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} aria-pressed={actifs.length > 0 || !!q} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <>
                <input
                  className="lin-menu-champ"
                  autoFocus
                  placeholder="Chercher une question, une réponse, une source…"
                  aria-label="Chercher dans les fiches"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fermer()}
                />
                {groupesFiltre.map((g) =>
                  g.valeurs.length ? (
                    <div key={g.dim}>
                      <div className="lin-menu-section" style={{ paddingBottom: 0 }}>
                        <span className="lin-reglage">{g.titre}</span>
                      </div>
                      {g.valeurs.map((x) => (
                        <Link key={x.v} href={lien(bascule(filtres, g.dim, x.v), idChoisi)} className="lin-menu-option" scroll={false} replace onClick={fermer}>
                          {x.icone}
                          <span>{x.libelle}</span>
                          <span className="lin-meta">{compte(g.dim, x.v)}</span>
                          {filtres[g.dim] === x.v ? <Check width={14} height={14} aria-label="filtre posé" /> : null}
                        </Link>
                      ))}
                    </div>
                  ) : null,
                )}
              </>
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
                      { cle: "recente", libelle: "Dernière modification" },
                      { cle: "etat", libelle: "À traiter d'abord" },
                      { cle: "sujet", libelle: "Sujet" },
                      { cle: "usage", libelle: "Les plus citées" },
                      { cle: "titre", libelle: "Question" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
        </div>
      </header>
      {actifs.length || q ? (
        <div className="lin-base-filtres">
          {actifs.map((dim) => {
            const { libelle, icone } = libelleFiltre(dim, filtres[dim] ?? "");
            return (
              <Link key={dim} href={lien(sans(filtres, dim), idChoisi)} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false} replace>
                {icone}
                {libelle} ✕
              </Link>
            );
          })}
          {q ? (
            <button type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer la recherche" onClick={() => setQ("")}>
              « {q} » ✕
            </button>
          ) : null}
        </div>
      ) : null}
      {visibles.length === 0 ? (
        <p className="lin-vide">{m.fiches.length ? "Aucune fiche ne correspond." : "La base est vide : sans fiche, chaque demande est transmise à votre équipe avec un accusé de réception."}</p>
      ) : (
        <ul className="lin-boite-lignes">
          {visibles.map((f) => {
            const e = etatDe(f, jour);
            return (
              <li key={f.id}>
                <Link
                  href={lien(filtres, f.id)}
                  className="lin-boite-ligne"
                  data-actif={f.id === idChoisi ? "" : undefined}
                  data-non-lu={nonLue(e) ? "" : undefined}
                  aria-current={f.id === idChoisi ? "true" : undefined}
                  scroll={false}
                  onClick={() => {
                    setEdition(null);
                    setRetrait(null);
                    setRetour(null);
                    setOnglet("apercu");
                    if (window.innerWidth < 1024) window.setTimeout(() => document.getElementById("lin-base-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                >
                  <span className="lin-boite-avatar" style={{ "--lin-avatar-teinte": couleurDe(f.sujet) } as React.CSSProperties} title={sujetDe(m, f.sujet)}>
                    <IconeGenre genre={f.genre} taille={20} />
                  </span>
                  <span className="lin-boite-texte">
                    <span className="lin-boite-l1">
                      {nonLue(e) ? <span className="lin-boite-point" aria-hidden="true" /> : null}
                      <b>{refDe(f)}</b>
                      <span>{f.titre}</span>
                    </span>
                    <span className="lin-boite-l2">
                      {ETATS[e].court}
                      {f.version > 1 ? ` · v${f.version}` : ""} · {extrait(f.contenu, 120)}
                    </span>
                  </span>
                  <span className="lin-boite-droite">
                    <IconeEtat etat={e} />
                    <span className="lin-boite-heure">{heureDe(derniereDe(f), maint)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  /* ——— le côté droit : une fiche, une fiche à écrire, ou rien ——— */
  let detail: React.ReactNode;
  if (edition && edition.id === null && !choisie) {
    detail = (
      <section className="lin-boite-detail" id="lin-base-fiche" aria-label="Nouvelle fiche">
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <span className="lin-fil-equipe">Base de connaissances</span>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici" aria-current="page">
              Nouvelle fiche
            </span>
          </nav>
        </header>
        <div className="lin-projet">
          <article className="lin-projet-texte">
            <Editeur m={m} b={edition} setB={setEdition} decide={decide} envoi={envoi} pret={pret(edition)} enregistrer={() => void enregistrer(edition)} annuler={() => setEdition(null)} retour={retour} />
          </article>
        </div>
      </section>
    );
  } else if (choisie) {
    detail = (
      <PageFiche
        key={choisie.id}
        m={m}
        f={choisie}
        jour={jour}
        maint={maint}
        filtres={filtres}
        position={ids.indexOf(choisie.id)}
        total={ids.length}
        precedente={ids[ids.indexOf(choisie.id) - 1] ?? null}
        suivante={ids[ids.indexOf(choisie.id) + 1] ?? null}
        choisir={choisir}
        ecrit={ecrit}
        decide={decide}
        envoi={envoi}
        retour={retour}
        onglet={onglet}
        setOnglet={setOnglet}
        edition={edition && edition.id === choisie.id ? edition : null}
        setEdition={setEdition}
        ouvrirEdition={() => ouvrirEdition(choisie)}
        enregistrer={(b) => void enregistrer(b)}
        pret={pret}
        retrait={retrait && retrait.id === choisie.id ? retrait : null}
        setRetrait={setRetrait}
        valider={() => valider(choisie)}
        retirer={(motif) => retirer(choisie, motif)}
      />
    );
  } else {
    detail = (
      <section className="lin-boite-vide" aria-label="Aucune fiche choisie">
        <BookOpen aria-hidden="true" strokeWidth={1.2} />
        <span>{aTraiter ? `${pluriel(aTraiter, "fiche")} à traiter` : "Aucune fiche à traiter"}</span>
        {retour ? (
          <p className="lin-reput-retour lin-base-vide-retour" data-teinte={retour.teinte} role={retour.teinte === "rouge" ? "alert" : "status"}>
            {retour.texte}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="lin">
      <h1 className="v2-sr">Base de connaissances</h1>
      <div className="lin-boite">
        {liste}
        {detail}
      </div>
    </div>
  );
}

/* ——— le formulaire d'une fiche, sur place : les champs de l'ancienne fenêtre « Nouvelle fiche » / « Corriger la fiche » ——— */
function Editeur({
  m,
  b,
  setB,
  decide,
  envoi,
  pret,
  enregistrer,
  annuler,
  retour,
}: {
  m: Monde;
  b: Brouillon;
  setB: (b: Brouillon) => void;
  decide: boolean;
  envoi: boolean;
  pret: boolean;
  enregistrer: () => void;
  annuler: () => void;
  retour: Retour | null;
}) {
  const sujets = m.sujets.filter((s) => s.actif || s.code === b.sujet).map((s) => ({ cle: s.code, libelle: s.libelle }));
  return (
    <>
      <span className="lin-tuile" style={{ background: `color-mix(in srgb, ${couleurDe(b.sujet)} 18%, transparent)`, color: couleurDe(b.sujet) }}>
        <IconeGenre genre={b.genre} taille={24} />
      </span>
      <input className="lin-base-titre" autoFocus aria-label="Question ou titre (obligatoire)" placeholder="Êtes-vous ouverts le samedi ?" value={b.titre} onChange={(e) => setB({ ...b, titre: e.target.value })} />
      <p className="lin-projet-resume">{b.id ? "Corriger la fiche : la correction crée une nouvelle version, la précédente reste au journal." : "Nouvelle fiche"}</p>
      <div className="lin-projet-ligne">
        <span className="lin-projet-etiquette">Propriétés</span>
        <span className="lin-puce">
          <IconeDiese />
          <Choix libelle="Sujet" valeur={b.sujet} options={sujets} onChange={(v) => setB({ ...b, sujet: v })} />
        </span>
        <span className="lin-puce">
          <IconeGenre genre={b.genre} />
          <Choix<GenreFiche> libelle="Genre" valeur={b.genre} options={(Object.keys(GENRES) as GenreFiche[]).map((g) => ({ cle: g, libelle: GENRES[g] }))} onChange={(v) => setB({ ...b, genre: v })} />
        </span>
      </div>
      <p className="lin-base-aide">Écrivez ce que vous répondriez vous-même, avec ses chiffres exacts. La réponse ne dira rien de plus.</p>
      <label className="lin-base-champ">
        <span>Réponse ou contenu (obligatoire)</span>
        <textarea className="lin-reput-champ" rows={7} value={b.contenu} placeholder="Le samedi de 9 h à 12 h." onChange={(e) => setB({ ...b, contenu: e.target.value })} />
      </label>
      <label className="lin-base-champ">
        <span>Source (obligatoire)</span>
        <input className="lin-reput-champ" value={b.source} placeholder="Grille tarifaire 2026, page 2" onChange={(e) => setB({ ...b, source: e.target.value })} />
      </label>
      <div className="lin-base-deux">
        <label className="lin-base-champ">
          <span>En vigueur à partir du</span>
          <input className="lin-reput-champ" type="date" value={b.valide_du} onChange={(e) => setB({ ...b, valide_du: e.target.value })} />
        </label>
        <label className="lin-base-champ">
          <span>Jusqu&apos;au (facultatif)</span>
          <input className="lin-reput-champ" type="date" value={b.valide_au} onChange={(e) => setB({ ...b, valide_au: e.target.value })} />
        </label>
      </div>
      {b.valide_au && b.valide_du && b.valide_au < b.valide_du ? <p className="lin-base-aide">La fin de validité vient avant son début.</p> : null}
      <div className="lin-reput-actions">
        <button type="button" className="v2-btn v2-btn--petit" data-actif="" disabled={!pret || envoi} onClick={enregistrer}>
          {decide ? "Mettre en vigueur" : "Enregistrer le brouillon"}
        </button>
        <button type="button" className="v2-btn v2-btn--petit" onClick={annuler}>
          Annuler
        </button>
      </div>
      {retour && retour.teinte === "rouge" ? (
        <p className="lin-reput-retour" data-teinte="rouge" role="alert">
          {retour.texte}
        </p>
      ) : null}
    </>
  );
}

/* ——— la page d'une fiche : la page d'un projet de Linear ——— */
function PageFiche({
  m,
  f,
  jour,
  maint,
  filtres,
  position,
  total,
  precedente,
  suivante,
  choisir,
  ecrit,
  decide,
  envoi,
  retour,
  onglet,
  setOnglet,
  edition,
  setEdition,
  ouvrirEdition,
  enregistrer,
  pret,
  retrait,
  setRetrait,
  valider,
  retirer,
}: {
  m: Monde;
  f: Fiche;
  jour: string;
  maint: number;
  filtres: Filtres;
  position: number;
  total: number;
  precedente: string | null;
  suivante: string | null;
  choisir: (id: string | null, remplacer?: boolean) => void;
  ecrit: boolean;
  decide: boolean;
  envoi: boolean;
  retour: Retour | null;
  onglet: "apercu" | "historique";
  setOnglet: (o: "apercu" | "historique") => void;
  edition: Brouillon | null;
  setEdition: (b: Brouillon | null) => void;
  ouvrirEdition: () => void;
  enregistrer: (b: Brouillon) => void;
  pret: (b: Brouillon) => boolean;
  retrait: { id: string; motif: string } | null;
  setRetrait: (r: { id: string; motif: string } | null) => void;
  valider: () => void;
  retirer: (motif: string) => void;
}) {
  const e = etatDe(f, jour);
  const couleur = couleurDe(f.sujet);
  const sujet = sujetDe(m, f.sujet);
  const citations = citationsDe(m, f).sort((a, b) => b.cree_le.localeCompare(a.cree_le));
  const demandes = demandesDe(m, citations);
  const envoyees = citations.filter((r) => r.statut === "envoyee").length;
  const versions = m.fiches.filter((x) => x.origine_id === f.origine_id).sort((a, b) => b.version - a.version);
  const autres = versions.filter((x) => x.id !== f.id);
  const evenements = evenementsDe(m, f);
  const horsBaseSujet = m.reponses.filter((r) => r.sujet === f.sujet && !r.couverte).length;
  const enVigueurAtteinte = f.statut === "validee" && f.valide_du.slice(0, 10) <= jour;
  const finAtteinte = !!f.valide_au && f.valide_au.slice(0, 10) < jour;
  const lienFiltre = (dim: Dimension, v: string) => lien(bascule(filtres, dim, v), f.id);
  const copier = (t: string) => void navigator.clipboard?.writeText(t);

  /* les gestes de l'ancien écran (Corriger, Valider, Retirer), puis la copie et l'historique */
  const gestes: Option[] = [
    ...(decide && f.statut === "brouillon" ? [{ cle: "valider", libelle: "Valider et mettre en vigueur", icone: <CheckCheck width={16} height={16} />, action: valider }] : []),
    ...(ecrit ? [{ cle: "corriger", libelle: "Corriger la fiche…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
    ...(decide ? [{ cle: "retirer", libelle: "Retirer la fiche…", icone: <Archive width={16} height={16} />, action: () => setRetrait({ id: f.id, motif: "" }) }] : []),
  ];
  const optionsEtat: Option[] = [
    ...gestes,
    ...ORDRE_ETATS.map((x) => ({
      cle: `etat-${x}`,
      libelle: `Fiches « ${ETATS[x].court} »`,
      meta: String(m.fiches.filter((y) => etatDe(y, jour) === x).length),
      icone: <IconeEtat etat={x} />,
      coche: filtres.etat === x,
      href: lienFiltre("etat", x),
    })),
  ];
  const optionsSujet: Option[] = [
    { cle: "meme", libelle: `Fiches « ${sujet} »`, meta: String(m.fiches.filter((y) => y.sujet === f.sujet).length), icone: <IconeDiese />, coche: filtres.sujet === f.sujet, href: lienFiltre("sujet", f.sujet) },
    ...(ecrit ? [{ cle: "corriger", libelle: "Changer de sujet…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
  ];
  const optionsGenre: Option[] = [
    {
      cle: "meme",
      libelle: `Fiches « ${GENRES[f.genre]} »`,
      meta: String(m.fiches.filter((y) => y.genre === f.genre).length),
      icone: <IconeGenre genre={f.genre} />,
      coche: filtres.genre === f.genre,
      href: lienFiltre("genre", f.genre),
    },
    ...(ecrit ? [{ cle: "corriger", libelle: "Changer de genre…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
  ];
  const optionsPeriode: Option[] = [
    ...(ecrit ? [{ cle: "corriger", libelle: "Corriger la période…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
    {
      cle: "revoir",
      libelle: "Fiches à revoir (période échue)",
      meta: String(m.fiches.filter((y) => etatDe(y, jour) === "a_revoir").length),
      icone: <IconeCalendrier passe />,
      coche: filtres.etat === "a_revoir",
      href: lienFiltre("etat", "a_revoir"),
    },
    {
      cle: "venir",
      libelle: "Fiches en vigueur plus tard",
      meta: String(m.fiches.filter((y) => etatDe(y, jour) === "a_venir").length),
      icone: <IconeCalendrier />,
      coche: filtres.etat === "a_venir",
      href: lienFiltre("etat", "a_venir"),
    },
  ];
  const optionsUsage: Option[] = [
    ...(Object.keys(USAGES) as Usage[]).map((u) => ({
      cle: u,
      libelle: USAGES[u],
      meta: String(m.fiches.filter((y) => usageDe(m, y) === u).length),
      icone: u === "citee" ? <MessageSquare width={16} height={16} /> : <IconeDocument />,
      coche: filtres.usage === u,
      href: lienFiltre("usage", u),
    })),
    { cle: "historique", libelle: "Voir les réponses qui la citent", icone: <MessageSquare width={16} height={16} />, action: () => setOnglet("historique") },
  ];
  const optionsSource: Option[] = [
    { cle: "copier", libelle: "Copier la source", icone: <Copy width={16} height={16} />, action: () => copier(f.source) },
    ...(ecrit ? [{ cle: "corriger", libelle: "Corriger la source…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
  ];
  const optionsVersion: Option[] = [
    ...versions.map((x) => ({
      cle: x.id,
      libelle: `Version ${x.version} · ${ETATS[etatDe(x, jour)].court}`,
      meta: dateCourte(derniereDe(x)),
      icone: <IconeEtat etat={etatDe(x, jour)} />,
      coche: x.id === f.id,
      href: lien(filtres, x.id),
    })),
    { cle: "historique", libelle: "Voir l'historique", icone: <MessageSquare width={16} height={16} />, action: () => setOnglet("historique") },
  ];
  const optionsJalon: Option[] = [
    { cle: "historique", libelle: "Voir l'historique", icone: <MessageSquare width={16} height={16} />, action: () => setOnglet("historique") },
    ...(ecrit ? [{ cle: "corriger", libelle: "Corriger la période…", icone: <PenLine width={16} height={16} />, action: ouvrirEdition }] : []),
  ];
  const jalons: { cle: string; libelle: string; atteint: boolean; le: string }[] = [
    { cle: "ecrite", libelle: f.version > 1 ? `Version ${f.version} écrite` : "Écrite", atteint: true, le: dateCourte(f.cree_le) },
    { cle: "validee", libelle: "Validée", atteint: !!f.valide_le, le: f.valide_le ? dateCourte(f.valide_le) : "—" },
    { cle: "vigueur", libelle: "En vigueur", atteint: enVigueurAtteinte, le: dateCal(f.valide_du) },
    { cle: "fin", libelle: "Fin de validité", atteint: finAtteinte, le: f.valide_au ? dateCal(f.valide_au) : "sans fin" },
  ];

  /* la carte « Usage » : les réponses qui citent la fiche sur les sept derniers jours (tout ce qui est plus ancien compte dans le premier point) */
  const aujourdhui = minuit(maint);
  const indexDe = (iso: string) => Math.min(JOURS - 1, Math.max(0, JOURS - 1 - Math.round((aujourdhui - minuit(Date.parse(iso))) / JOUR)));
  const parJour = (filtre: (r: Reponse) => boolean) => {
    const v = Array<number>(JOURS).fill(0);
    for (const r of citations.filter(filtre)) v[indexDe(r.cree_le)]++;
    return v;
  };
  const preparees = parJour(() => true);
  const parties = parJour((r) => r.statut === "envoyee");
  const etiquettes = Array.from({ length: JOURS }, (_, i) => (i === JOURS - 1 ? "Auj." : i === 0 ? dateCourte(aujourdhui - (JOURS - 1) * JOUR) : String(new Date(aujourdhui - (JOURS - 1 - i) * JOUR).getDate())));
  const parStatut = [...new Set(demandes.map((d) => d.statut))].map((s) => ({ s, n: demandes.filter((d) => d.statut === s).length }));

  const chipEtat = (
    <>
      <IconeEtat etat={e} />
      {ETATS[e].libelle}
    </>
  );

  return (
    <section className="lin-boite-detail" id="lin-base-fiche" aria-label={`La fiche ${refDe(f)}`}>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={lien(filtres, null)} className="lin-fil-equipe" scroll={false} replace onClick={() => setEdition(null)}>
            Base de connaissances
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici lin-fil-projet" aria-current="page">
            <IconeGenre genre={f.genre} couleur={couleur} />
            <b>{refDe(f)}</b>
            {f.titre}
          </span>
        </nav>
        <div className="lin-tete-droite">
          {position >= 0 ? (
            <span className="lin-position">
              {position + 1} / {total}
            </span>
          ) : null}
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Fiche précédente (↑)" title="Fiche précédente (↑)" disabled={!precedente} onClick={() => precedente && choisir(precedente)}>
            <ChevronUp width={14} height={14} aria-hidden="true" />
          </button>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Fiche suivante (↓)" title="Fiche suivante (↓)" disabled={!suivante} onClick={() => suivante && choisir(suivante)}>
            <ChevronDown width={14} height={14} aria-hidden="true" />
          </button>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier la réponse" title="Copier la réponse" onClick={() => copier(f.contenu)}>
            <Copy width={14} height={14} aria-hidden="true" />
          </button>
          <Menu
            largeur={260}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Actions sur la fiche" title="Actions sur la fiche" aria-expanded={ouvert} onClick={basculer}>
                <MoreHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <>
                {[
                  ...gestes,
                  { cle: "copier", libelle: "Copier la réponse", icone: <Copy width={16} height={16} />, action: () => copier(f.contenu) },
                  { cle: "copier-source", libelle: "Copier la source", icone: <Copy width={16} height={16} />, action: () => copier(f.source) },
                  { cle: "historique", libelle: "Voir l'historique", icone: <MessageSquare width={16} height={16} />, action: () => setOnglet("historique") },
                ].map((o) => (
                  <button
                    key={o.cle}
                    type="button"
                    className="lin-menu-option"
                    disabled={envoi}
                    onClick={() => {
                      fermer();
                      o.action?.();
                    }}
                  >
                    {o.icone}
                    <span>{o.libelle}</span>
                  </button>
                ))}
              </>
            )}
          </Menu>
        </div>
      </header>
      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Vues de la fiche">
          <button type="button" className="v2-btn v2-btn--petit" data-actif={onglet === "apercu" ? "" : undefined} aria-pressed={onglet === "apercu"} onClick={() => setOnglet("apercu")}>
            Aperçu
          </button>
          <button type="button" className="v2-btn v2-btn--petit" data-actif={onglet === "historique" ? "" : undefined} aria-pressed={onglet === "historique"} onClick={() => setOnglet("historique")}>
            Historique
          </button>
        </nav>
      </div>

      <div className="lin-projet">
        <article className="lin-projet-texte">
          {edition ? (
            <Editeur m={m} b={edition} setB={setEdition} decide={decide} envoi={envoi} pret={pret(edition)} enregistrer={() => enregistrer(edition)} annuler={() => setEdition(null)} retour={retour} />
          ) : onglet === "apercu" ? (
            <>
              <span className="lin-tuile" style={{ background: `color-mix(in srgb, ${couleur} 18%, transparent)`, color: couleur }}>
                <IconeGenre genre={f.genre} taille={24} />
              </span>
              <h1 className="lin-projet-h1">{f.titre}</h1>
              <p className="lin-projet-resume">
                {GENRES[f.genre]} · {sujet} · en vigueur {periodeDe(f)}
              </p>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Propriétés</span>
                <MenuOptions raccourci="s" titre="État…" teinte={ETATS[e].teinte} declencheur={chipEtat} options={optionsEtat} largeur={300} />
                <MenuOptions
                  raccourci="t"
                  titre="Sujet…"
                  declencheur={
                    <>
                      <IconeDiese />
                      {sujet}
                    </>
                  }
                  options={optionsSujet}
                />
                <MenuOptions
                  raccourci="g"
                  titre="Genre…"
                  declencheur={
                    <>
                      <IconeGenre genre={f.genre} />
                      {GENRES[f.genre]}
                    </>
                  }
                  options={optionsGenre}
                />
                <MenuOptions
                  titre="Période…"
                  declencheur={
                    <>
                      <IconeCalendrier passe={e === "a_revoir"} />
                      {f.valide_au ? `${dateJour(f.valide_du)} → ${dateJour(f.valide_au)}` : `Depuis le ${dateJour(f.valide_du)}`}
                    </>
                  }
                  options={optionsPeriode}
                  largeur={300}
                />
                <MenuOptions
                  raccourci="u"
                  titre="Usage…"
                  declencheur={
                    <>
                      <IconeJauge />
                      {citations.length ? `Citée ${pluriel(citations.length, "fois", "fois")}` : "Jamais citée"}
                    </>
                  }
                  options={optionsUsage}
                  largeur={300}
                />
              </div>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Source</span>
                <MenuOptions
                  titre="Source…"
                  declencheur={
                    <>
                      <IconeDocument />
                      {extrait(f.source, 60)}
                    </>
                  }
                  options={optionsSource}
                />
              </div>

              <details className="lin-maj" open aria-label="La réponse de la fiche">
                <summary className="lin-maj-tete">
                  <span className="lin-maj-titre">
                    {`La réponse${f.version > 1 ? ` · version ${f.version}` : ""}`}
                    <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                    </svg>
                  </span>
                  <button
                    type="button"
                    className="lin-maj-lien"
                    onClick={(ev) => {
                      ev.preventDefault();
                      copier(f.contenu);
                    }}
                  >
                    <Copy width={14} height={14} aria-hidden="true" /> Copier
                  </button>
                </summary>
                <p className="lin-maj-auteur">
                  <IconeEtat etat={e} />
                  <span data-teinte={ETATS[e].teinte}>{ETATS[e].libelle}</span>
                  <span className="lin-avatar-auteur" aria-hidden="true">
                    <BookOpen width={11} height={11} />
                  </span>
                  <span className="lin-maj-gris">{f.statut === "brouillon" ? "En attente d'un valideur" : "Base de connaissances"}</span>
                  <span className="lin-maj-gris">{dateCourte(derniereDe(f))}</span>
                </p>
                <p className="lin-maj-texte lin-reput-corps">{f.contenu}</p>
                <dl className="lin-maj-citation">
                  <div>
                    <dt>Source</dt>
                    <dd>{f.source}</dd>
                  </div>
                  <div>
                    <dt>En vigueur</dt>
                    <dd>{periodeDe(f)}</dd>
                  </div>
                  <div>
                    <dt>Sujet</dt>
                    <dd>{sujet}</dd>
                  </div>
                  <div>
                    <dt>Citée</dt>
                    <dd>{citations.length ? `${pluriel(citations.length, "réponse")}, ${pluriel(demandes.length, "demande")}` : "Dans aucune réponse pour l'instant"}</dd>
                  </div>
                  {f.langue && f.langue !== "fr" ? (
                    <div>
                      <dt>Langue</dt>
                      <dd>{f.langue}</dd>
                    </div>
                  ) : null}
                </dl>
                {retrait ? (
                  <input
                    className="lin-reput-champ lin-base-motif"
                    autoFocus
                    aria-label="Pourquoi retirer cette fiche ? (obligatoire)"
                    placeholder="Pourquoi retirer cette fiche ? Par exemple : tarif remplacé par la grille 2027"
                    value={retrait.motif}
                    onChange={(ev) => setRetrait({ id: f.id, motif: ev.target.value })}
                  />
                ) : null}
                {retrait ? (
                  <div className="lin-reput-actions">
                    <button type="button" className="v2-btn v2-btn--petit" data-actif="" disabled={envoi || !retrait.motif.trim()} onClick={() => retirer(retrait.motif.trim())}>
                      Retirer la fiche
                    </button>
                    <button type="button" className="v2-btn v2-btn--petit" onClick={() => setRetrait(null)}>
                      Annuler
                    </button>
                  </div>
                ) : null}
                {retour ? (
                  <p className="lin-reput-retour" data-teinte={retour.teinte} role={retour.teinte === "rouge" ? "alert" : "status"}>
                    {retour.texte}
                  </p>
                ) : null}
                <footer className="lin-maj-pied">
                  {ecrit ? (
                    <button type="button" className="lin-maj-pied-btn" aria-label="Corriger la fiche" title="Corriger la fiche" disabled={envoi} onClick={ouvrirEdition}>
                      <PenLine width={16} height={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" className="lin-maj-pied-btn" aria-label="Voir l'historique" title="Voir l'historique" onClick={() => setOnglet("historique")}>
                      <MessageSquare width={16} height={16} aria-hidden="true" />
                    </button>
                  )}
                  {decide && f.statut === "brouillon" ? (
                    <button type="button" className="lin-maj-pied-rond" aria-label="Valider et mettre en vigueur" title="Valider et mettre en vigueur" disabled={envoi} onClick={valider}>
                      <CheckCheck width={16} height={16} aria-hidden="true" />
                    </button>
                  ) : null}
                  {decide ? (
                    <button type="button" className="lin-maj-pied-rond" aria-label="Retirer la fiche" title="Retirer la fiche" disabled={envoi} onClick={() => setRetrait({ id: f.id, motif: "" })}>
                      <Archive width={16} height={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </footer>
              </details>

              <h2 className="lin-projet-h2">Les demandes qui l&apos;ont citée</h2>
              {citations.length ? (
                <ul className="lin-projet-liste">
                  {citations.map((r) => {
                    const d = m.demandes.find((x) => x.id === r.demande_id);
                    return (
                      <li key={r.id}>
                        {d ? (
                          <Link href={`${RACINE}/reput?demande=${encodeURIComponent(d.id)}`} className="lin-projet-lien">
                            <Losange atteint={r.statut === "envoyee"} />
                            <span>
                              {nomDe(d)} · {STATUTS_DEMANDE[d.statut]}
                            </span>
                            <span className="lin-meta">
                              réponse {ETATS_REPONSE[r.statut]} · {dateCourte(r.cree_le)}
                            </span>
                          </Link>
                        ) : (
                          <>
                            <Losange atteint={r.statut === "envoyee"} />
                            <span>Une demande hors de la liste chargée</span>
                            <span className="lin-meta">
                              réponse {ETATS_REPONSE[r.statut]} · {dateCourte(r.cree_le)}
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="lin-meta">Aucune réponse ne l&apos;a encore citée.</p>
              )}

              {autres.length ? (
                <>
                  <h2 className="lin-projet-h2">Autres versions en cours</h2>
                  <ul className="lin-projet-liste">
                    {autres.map((x) => (
                      <li key={x.id}>
                        <Link href={lien(filtres, x.id)} className="lin-projet-lien" scroll={false} replace>
                          <IconeEtat etat={etatDe(x, jour)} />
                          <span>
                            Version {x.version} · {ETATS[etatDe(x, jour)].court}
                          </span>
                          <span className="lin-meta">{dateCourte(derniereDe(x))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <>
              <h1 className="lin-projet-h1" style={{ marginTop: 0 }}>
                Historique
              </h1>
              <h2 className="lin-projet-h2">Versions</h2>
              <ul className="lin-projet-liste">
                {versions.map((x) => (
                  <li key={x.id}>
                    <IconeEtat etat={etatDe(x, jour)} />
                    <span>
                      Version {x.version}
                      {x.id === f.id ? " · celle-ci" : ""}
                    </span>
                    <span className="lin-meta">
                      {ETATS[etatDe(x, jour)].court} · {dateCourte(derniereDe(x))}
                    </span>
                  </li>
                ))}
              </ul>
              {f.version > 1 ? <p className="lin-meta">Les versions précédentes, remplacées, restent au journal de la base.</p> : null}
              <h2 className="lin-projet-h2">Événements</h2>
              <ul className="lin-projet-liste">
                {evenements.map((x) => (
                  <li key={x.cle}>
                    <Losange atteint={x.fait} />
                    <span>{x.quoi.charAt(0).toUpperCase() + x.quoi.slice(1)}</span>
                    <span className="lin-meta">{dateHeure(x.le)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>

        <aside className="lin-cartes-droite" aria-label="Propriétés de la fiche">
          <CarteDroite titre="Propriétés">
            <dl className="lin-props">
              <div>
                <dt>État</dt>
                <dd data-teinte={ETATS[e].teinte}>
                  <MenuOptions plat titre="État…" declencheur={chipEtat} options={optionsEtat} largeur={300} />
                </dd>
              </div>
              <div>
                <dt>Sujet</dt>
                <dd>
                  <MenuOptions
                    plat
                    titre="Sujet…"
                    declencheur={
                      <>
                        <IconeDiese />
                        {sujet}
                      </>
                    }
                    options={optionsSujet}
                  />
                </dd>
              </div>
              <div>
                <dt>Genre</dt>
                <dd>
                  <MenuOptions
                    plat
                    titre="Genre…"
                    declencheur={
                      <>
                        <IconeGenre genre={f.genre} />
                        {GENRES[f.genre]}
                      </>
                    }
                    options={optionsGenre}
                  />
                </dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>
                  <MenuOptions
                    plat
                    titre="Versions…"
                    declencheur={
                      <>
                        <MessageSquare width={16} height={16} aria-hidden="true" />
                        Version {f.version}
                        {autres.length ? ` · ${pluriel(autres.length, "autre")}` : ""}
                      </>
                    }
                    options={optionsVersion}
                    largeur={300}
                  />
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  <MenuOptions
                    plat
                    titre="Source…"
                    declencheur={
                      <>
                        <IconeDocument />
                        {extrait(f.source, 34)}
                      </>
                    }
                    options={optionsSource}
                  />
                </dd>
              </div>
              <div>
                <dt>En vigueur</dt>
                <dd>
                  <MenuOptions
                    plat
                    titre="Période…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={e === "a_revoir"} />
                        {f.valide_au ? `${dateCal(f.valide_du)} → ${dateCal(f.valide_au)}` : `Depuis le ${dateCal(f.valide_du)}`}
                      </>
                    }
                    options={optionsPeriode}
                    largeur={300}
                  />
                </dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd className={citations.length ? undefined : "lin-props-vide"}>
                  <MenuOptions
                    plat
                    titre="Usage…"
                    declencheur={
                      <>
                        <IconeJauge />
                        {citations.length ? `${pluriel(citations.length, "réponse")} · ${pluriel(demandes.length, "demande")}` : "Jamais citée"}
                      </>
                    }
                    options={optionsUsage}
                    largeur={300}
                  />
                </dd>
              </div>
            </dl>
          </CarteDroite>

          <CarteDroite titre="Cycle de vie">
            <ul className="lin-jalons">
              {jalons.map((j) => (
                <li key={j.cle}>
                  <Losange atteint={j.atteint} />
                  <span className="lin-jalon-nom">{j.libelle}</span>
                  <span className="lin-meta">{j.le}</span>
                  <MenuActions titre={`${j.libelle}…`} options={optionsJalon} />
                </li>
              ))}
            </ul>
          </CarteDroite>

          <CarteDroite titre="Usage">
            <dl className="lin-kpis lin-kpis--trois">
              <div data-teinte="gris">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
                  Réponses
                </dt>
                <dd>{citations.length}</dd>
              </div>
              <div data-teinte="jaune">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
                  Demandes
                </dt>
                <dd>{demandes.length}</dd>
              </div>
              <div data-teinte="bleu">
                <dt>
                  <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
                  Envoyées
                </dt>
                <dd>{envoyees}</dd>
              </div>
            </dl>
            <GraphiqueCitations
              libelle={`Réponses citant la fiche, cumulées sur sept jours : ${pluriel(somme(preparees), "réponse")}, dont ${somme(parties)} envoyée${somme(parties) > 1 ? "s" : ""}`}
              etiquettes={etiquettes}
              series={[
                { cle: "preparees", teinte: "gris", valeurs: cumul(preparees) },
                { cle: "envoyees", teinte: "bleu", valeurs: cumul(parties), aire: true },
              ]}
            />
            <ul className="lin-repartition">
              {parStatut.map((l) => (
                <li key={l.s}>
                  <span>{STATUTS_DEMANDE[l.s]}</span>
                  <span>{l.n}</span>
                </li>
              ))}
              <li>
                <span>Réponses hors base sur ce sujet</span>
                <span>{horsBaseSujet}</span>
              </li>
            </ul>
          </CarteDroite>

          <CarteDroite
            titre="Activité"
            action={
              <button type="button" className="lin-carte-lien" onClick={() => setOnglet("historique")}>
                Tout voir
              </button>
            }
          >
            <ul className="lin-activite">
              {evenements.slice(0, 3).map((x) => (
                <li key={x.cle}>
                  <Losange atteint={x.fait} />
                  <span>
                    {x.quoi} · {dateCourte(x.le)}
                  </span>
                </li>
              ))}
            </ul>
          </CarteDroite>
        </aside>
      </div>
    </section>
  );
}
