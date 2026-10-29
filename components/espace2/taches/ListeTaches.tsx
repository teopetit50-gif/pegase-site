"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Tâches » sur la liste des tickets de Linear (28/10/2026, nuit) : la
   vue Omega › Issues, affichage « List », au 1:1 (relevé : scratchpad/
   releve-linear-issues-list.md ; briques : ../lin/linear-tickets.css, lt-).

   Les tâches restent celles de l'ancienne page (Collection « taches ») :
   la même clé du navigateur (espace2-collection-taches, lue aussi par la
   Vue d'ensemble et le compteur du menu), les mêmes champs (titre,
   échéance, pour qui, fait), et des champs en plus que la liste de Linear
   montre — statut (backlog, à faire, en cours, faite, annulée), priorité,
   étiquettes, description. « fait » reste vrai pour faite et annulée.

   Où sont passés les gestes de l'ancienne page :
     ajouter      « Nouvelle tâche » (barre du titre), « + » d'un groupe,
                  touche C : la fenêtre de Linear (titre, description,
                  statut, priorité, pour qui, étiquettes, échéance)
     cocher faite la case au survol de la ligne, le disque d'état, la carte
     pour qui     l'avatar de la ligne, la fenêtre, la carte
     échéance     la fenêtre, la carte (pilule orange une fois passée)
     rechercher   le menu Filtre (?q=), avec statut, priorité, pour qui,
                  étiquette (?filtre=), posés en place
     ouvrir       la ligne, Entrée : la carte au milieu (CarteCentrale),
                  ?id= ; ← → d'une tâche à l'autre
     supprimer    dans la carte
   Onglets (?vue=all|active|backlog), regroupement et tri (?groupe=, ?tri=)
   dans l'adresse ; propriétés affichées et groupes vides sur l'appareil.
   ══════════════════════════════════════════════════════════════════════ */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ArrowDownUp, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Columns3, Filter, LayoutList, ListChecks, Plus, SlidersHorizontal, SquarePen, Star, Tag, Trash2, User, X } from "lucide-react";
import { ecrireStockage, useStockage } from "../Collection";
import { useToast } from "../Toasts";
import { jourDe } from "../filed/calculs";
import { CarteCentrale, Feuille, type NavCarte } from "../lin/CarteCentrale";
import "../lin/lin.css";
import "../lin/linear-tickets.css";

/* ——— les données ——— */
const CLE = "espace2-collection-taches";
type Statut = "backlog" | "todo" | "en_cours" | "fait" | "annule";
type Fiche = {
  id: string;
  cree: string;
  fait?: boolean;
  titre?: string;
  echeance?: string;
  qui?: string;
  statut?: string;
  priorite?: number;
  etiquettes?: string;
  description?: string;
  num?: number;
};
type Tache = Fiche & { statutLu: Statut; prio: 0 | 1 | 2 | 3 | 4; numero: number; etiquettesLues: string[] };

const STATUTS: { cle: Statut; libelle: string; vide: string }[] = [
  { cle: "en_cours", libelle: "En cours", vide: "Aucune tâche en cours" },
  { cle: "todo", libelle: "À faire", vide: "Rien à faire pour l'instant" },
  { cle: "backlog", libelle: "Backlog", vide: "Aucune tâche mise de côté" },
  { cle: "fait", libelle: "Faites", vide: "Aucune tâche faite" },
  { cle: "annule", libelle: "Annulées", vide: "Aucune tâche annulée" },
];
const STATUT_LIBELLE: Record<Statut, string> = { backlog: "Backlog", todo: "À faire", en_cours: "En cours", fait: "Faite", annule: "Annulée" };
/* l'ordre d'un menu d'état de Linear : Backlog, Todo, In Progress, Done, Canceled */
const STATUTS_MENU: Statut[] = ["backlog", "todo", "en_cours", "fait", "annule"];
/* priorités, dans le sens de Linear : 0 aucune, 1 urgente, 2 haute, 3 moyenne, 4 basse — dessinées de 0 à 4 barres */
const PRIORITES: { cle: 0 | 1 | 2 | 3 | 4; libelle: string }[] = [
  { cle: 0, libelle: "Aucune priorité" },
  { cle: 1, libelle: "Urgente" },
  { cle: 2, libelle: "Haute" },
  { cle: 3, libelle: "Moyenne" },
  { cle: 4, libelle: "Basse" },
];
const PRIO_LIBELLE = Object.fromEntries(PRIORITES.map((p) => [p.cle, p.libelle])) as Record<number, string>;
const RANG_PRIO: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };
const VUES = ["all", "active", "backlog"] as const;
type Vue = (typeof VUES)[number];
const GROUPES = ["statut", "priorite", "qui", "aucun"] as const;
type Groupement = (typeof GROUPES)[number];
const GROUPE_LIBELLE: Record<Groupement, string> = { statut: "Statut", priorite: "Priorité", qui: "Pour qui", aucun: "Aucun" };
const TRIS = ["priorite", "cree", "echeance", "titre"] as const;
type Tri = (typeof TRIS)[number];
const TRI_LIBELLE: Record<Tri, string> = { priorite: "Priorité", cree: "Date de création", echeance: "Échéance", titre: "Titre" };
const DIMENSIONS = ["statut", "prio", "qui", "etiquette"] as const;
type Dimension = (typeof DIMENSIONS)[number];
const DIMENSION_LIBELLE: Record<Dimension, string> = { statut: "Statut", prio: "Priorité", qui: "Pour qui", etiquette: "Étiquette" };
type Filtres = Partial<Record<Dimension, string>>;
type Affichage = { id: boolean; statut: boolean; priorite: boolean; qui: boolean; echeance: boolean; etiquettes: boolean; cree: boolean; vides: boolean };
const AFFICHAGE_DEFAUT: Affichage = { id: true, statut: true, priorite: true, qui: true, echeance: true, etiquettes: true, cree: true, vides: false };
const PROPRIETES: { cle: keyof Affichage; libelle: string }[] = [
  { cle: "id", libelle: "ID" },
  { cle: "statut", libelle: "Statut" },
  { cle: "priorite", libelle: "Priorité" },
  { cle: "qui", libelle: "Pour qui" },
  { cle: "echeance", libelle: "Échéance" },
  { cle: "etiquettes", libelle: "Étiquettes" },
  { cle: "cree", libelle: "Créée" },
];
const CLE_AFFICHAGE = "lt-affichage:taches";

const statutDe = (f: Fiche): Statut => {
  if (f.fait) return f.statut === "annule" ? "annule" : "fait";
  return f.statut === "backlog" || f.statut === "en_cours" ? f.statut : "todo";
};
const prioDe = (f: Fiche): 0 | 1 | 2 | 3 | 4 => (f.priorite === 1 || f.priorite === 2 || f.priorite === 3 || f.priorite === 4 ? f.priorite : 0);
const etiquettesDe = (s: string | undefined) =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const jour = (iso: string | undefined | null) => {
  if (!iso) return "—";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
};
const jourLong = (iso: string | undefined | null) => {
  if (!iso) return "—";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};
const initiales = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0] ?? "")
    .join("");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function analyser(brut: string | null): Fiche[] | null {
  if (brut === null) return null;
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? (v as Fiche[]) : [];
  } catch {
    return [];
  }
}

function lireFiltres(s: string | null): Filtres {
  const f: Filtres = {};
  for (const p of (s ?? "").split(",")) {
    const i = p.indexOf(":");
    if (i < 1) continue;
    const k = p.slice(0, i) as Dimension;
    let v = p.slice(i + 1);
    try {
      v = decodeURIComponent(v);
    } catch {
      continue;
    }
    if (DIMENSIONS.includes(k) && v) f[k] = v;
  }
  return f;
}
const ecrireFiltres = (f: Filtres) =>
  (Object.entries(f) as [Dimension, string][])
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${encodeURIComponent(v)}`)
    .join(",") || null;

/* ——— les icônes, aux tracés relevés sur Linear (état 14, priorité 16) ——— */
export function IconeEtat({ statut, titre }: { statut: Statut; titre?: string }) {
  return (
    <svg className={`lt-etat lt-etat--${statut}`} viewBox="0 0 14 14" role={titre ? "img" : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}>
      {statut === "backlog" ? <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.4 1.74" /> : null}
      {statut === "todo" ? <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {statut === "en_cours" ? (
        <>
          <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3a4 4 0 0 1 0 8z" fill="currentColor" />
        </>
      ) : null}
      {statut === "fait" ? (
        <>
          <circle cx="7" cy="7" r="6.5" fill="currentColor" />
          <path d="M4.2 7.2 6.2 9.2 9.9 5.3" fill="none" stroke="var(--lt-coche)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {statut === "annule" ? (
        <>
          <circle cx="7" cy="7" r="6.5" fill="currentColor" />
          <path d="M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2" stroke="var(--lt-coche)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
export function IconePrio({ niveau, titre }: { niveau: 0 | 1 | 2 | 3 | 4; titre?: string }) {
  /* 1 urgente (carré orange), 2 haute (3 barres), 3 moyenne (2), 4 basse (1), 0 aucune (trois tirets) */
  const barres = niveau === 2 ? 3 : niveau === 3 ? 2 : niveau === 4 ? 1 : 0;
  return (
    <svg className={niveau === 1 ? "lt-prio lt-prio--4" : "lt-prio"} viewBox="0 0 16 16" role={titre ? "img" : undefined} aria-label={titre} aria-hidden={titre ? undefined : true}>
      {niveau === 0 ? (
        <>
          <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
          <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
          <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
        </>
      ) : niveau === 1 ? (
        <path fillRule="evenodd" d="M3 1C1.91 1 1 1.91 1 3v10c0 1.09.91 2 2 2h10c1.09 0 2-.91 2-2V3c0-1.09-.91-2-2-2H3Zm4 3h2l-.25 5h-1.5L7 4Zm2 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="currentColor" />
      ) : (
        <>
          <rect x="1.5" y="8" width="3" height="6" rx="1" fill="currentColor" opacity={barres >= 1 ? 1 : 0.4} />
          <rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor" opacity={barres >= 2 ? 1 : 0.4} />
          <rect x="11.5" y="2" width="3" height="12" rx="1" fill="currentColor" opacity={barres >= 3 ? 1 : 0.4} />
        </>
      )}
    </svg>
  );
}
function IconeNonAssigne() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.2 2.1" />
      <circle cx="9" cy="7.2" r="2.4" fill="currentColor" />
      <path d="M4.6 14.2c.6-2.3 2.3-3.5 4.4-3.5s3.8 1.2 4.4 3.5a7 7 0 0 1-8.8 0Z" fill="currentColor" />
    </svg>
  );
}
function IconeChevronGroupe() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.3 6.4h5.4c.5 0 .8.6.5 1L8.5 10.6c-.3.3-.7.3-1 0L4.8 7.4c-.3-.4 0-1 .5-1Z" fill="currentColor" />
    </svg>
  );
}
function IconePlus() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4A.75.75 0 0 1 8 3.25Z" fill="currentColor" />
    </svg>
  );
}
function IconeEquipe() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill="var(--lin-fait)" />
      <path d="M5 8.3 7 10.3l4-4.3" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ——— un menu de choix : le bouton est libre, le panneau est celui de Linear (recherche, options, chiffres) ——— */
type Choix = { cle: string; libelle: string; icone?: ReactNode; coche?: boolean; meta?: string; action: () => void };
function MenuListe({
  bouton,
  titre,
  choix,
  creer,
  cote,
  largeur,
  enfants,
  ouvertAuDebut,
}: {
  bouton: (ouvert: boolean, basculer: () => void) => ReactNode;
  titre: string;
  choix: Choix[];
  /* une saisie qui ne correspond à rien propose de la poser (« Attribuer à … ») */
  creer?: { libelle: (q: string) => string; action: (q: string) => void };
  cote?: "droite";
  largeur?: number;
  /* un contenu à la place des options (le menu Affichage) */
  enfants?: (fermer: () => void) => ReactNode;
  ouvertAuDebut?: boolean;
}) {
  const [ouvert, setOuvert] = useState(!!ouvertAuDebut);
  const [q, setQ] = useState("");
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const visibles = useMemo(() => {
    const v = choix.filter((o) => !q || `${o.libelle} ${o.meta ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    if (creer && q.trim() && !choix.some((o) => o.libelle.toLowerCase() === q.trim().toLowerCase())) v.push({ cle: "__creer", libelle: creer.libelle(q.trim()), action: () => creer.action(q.trim()) });
    return v;
  }, [choix, q, creer]);
  const fermer = useCallback(() => {
    setOuvert(false);
    setQ("");
    setActif(0);
  }, []);
  const choisir = (o: Choix | undefined) => {
    if (!o) return;
    fermer();
    o.action();
  };
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, [ouvert, fermer]);
  const touche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      fermer();
    } else if (enfants) return;
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => Math.min(visibles.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choisir(visibles[actif]);
    } else if (/^[1-9]$/.test(e.key) && !q) {
      e.preventDefault();
      choisir(visibles[Number(e.key) - 1]);
    }
  };
  return (
    <div className="lin-ancre" ref={ref} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {bouton(ouvert, () => (ouvert ? fermer() : setOuvert(true)))}
      {ouvert ? (
        <div className={enfants ? "lt-menu lt-affichage" : "lt-menu"} data-cote={cote} style={largeur ? { width: largeur } : undefined} role="dialog" aria-label={titre} onKeyDown={touche}>
          {enfants ? (
            enfants(fermer)
          ) : (
            <>
              <div className="lin-menu-tete">
                <input
                  className="lin-menu-saisie"
                  autoFocus
                  placeholder={titre}
                  aria-label={titre}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActif(0);
                  }}
                />
              </div>
              <ul className="lin-options" role="listbox" aria-label={titre}>
                {visibles.length ? (
                  visibles.map((o, i) => (
                    <li key={o.cle} role="option" aria-selected={i === actif}>
                      <button type="button" className="lin-option" data-actif={i === actif ? "" : undefined} onMouseEnter={() => setActif(i)} onClick={() => choisir(o)}>
                        {o.icone ? <span className="lin-option-icone">{o.icone}</span> : null}
                        <span className="lin-option-libelle">{o.libelle}</span>
                        {o.meta ? <span className="lin-option-meta">{o.meta}</span> : null}
                        {o.coche ? <Check className="lin-option-coche" width={14} height={14} aria-label="actuel" /> : null}
                        {i < 9 && !q ? <span className="lin-option-chiffre">{i + 1}</span> : null}
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="lin-options-vide">Aucun résultat</li>
                )}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* les choix d'état, de priorité et de « pour qui », partagés par la ligne, la fenêtre et la carte */
const choixStatut = (courant: Statut | null, poser: (s: Statut) => void): Choix[] =>
  STATUTS_MENU.map((s) => ({ cle: s, libelle: STATUT_LIBELLE[s], icone: <IconeEtat statut={s} />, coche: s === courant, action: () => poser(s) }));
const choixPrio = (courant: number | null, poser: (p: 0 | 1 | 2 | 3 | 4) => void): Choix[] =>
  PRIORITES.map((p) => ({ cle: String(p.cle), libelle: p.libelle, icone: <IconePrio niveau={p.cle} />, coche: p.cle === courant, action: () => poser(p.cle) }));
const choixQui = (noms: string[], courant: string | null, poser: (q: string) => void): Choix[] => [
  { cle: "__personne", libelle: "Personne", icone: <IconeNonAssigne />, coche: !courant, action: () => poser("") },
  ...noms.map((n) => ({ cle: n, libelle: n, icone: <span className="lt-avatar">{initiales(n)}</span>, coche: n === courant, action: () => poser(n) })),
];

/* ══════════════════════════════════════════════════════════════════════ */
export default function ListeTaches() {
  const toast = useToast();
  const routeur = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const brut = useStockage(CLE);
  const fiches = useMemo(() => analyser(brut), [brut]);
  const ecrire = useCallback((f: Fiche[]) => ecrireStockage(CLE, JSON.stringify(f)), []);

  /* ——— l'adresse : vue, filtres, recherche, regroupement, tri, carte ouverte ——— */
  const vue: Vue = VUES.find((v) => v === params.get("vue")) ?? "all";
  const filtres = useMemo(() => lireFiltres(params.get("filtre")), [params]);
  const q = params.get("q") ?? "";
  const groupement: Groupement = GROUPES.find((g) => g === params.get("groupe")) ?? "statut";
  const tri: Tri = TRIS.find((t) => t === params.get("tri")) ?? "priorite";
  const idOuvert = params.get("id");
  const aller = useCallback(
    (changes: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") p.delete(k);
        else p.set(k, v);
      }
      const s = p.toString();
      routeur.replace(s ? `${chemin}?${s}` : chemin, { scroll: false });
    },
    [params, routeur, chemin],
  );
  const poserFiltre = (d: Dimension, v: string | null) => aller({ filtre: ecrireFiltres({ ...filtres, [d]: v ?? undefined }) });

  /* ——— l'affichage (propriétés, groupes vides) : sur l'appareil ——— */
  const [affichage, setAffichage] = useState<Affichage>(AFFICHAGE_DEFAUT);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(CLE_AFFICHAGE) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage : le rendu du serveur ne connaît pas ce navigateur
      if (v && typeof v === "object") setAffichage({ ...AFFICHAGE_DEFAUT, ...v });
    } catch {
      /* stockage indisponible : l'affichage par défaut */
    }
  }, []);
  const poserAffichage = (a: Partial<Affichage>) =>
    setAffichage((avant) => {
      const apres = { ...avant, ...a };
      try {
        localStorage.setItem(CLE_AFFICHAGE, JSON.stringify(apres));
      } catch {
        /* vaut pour cette visite */
      }
      return apres;
    });
  const affichageModifie = PROPRIETES.some((p) => affichage[p.cle] !== AFFICHAGE_DEFAUT[p.cle]) || affichage.vides || groupement !== "statut" || tri !== "priorite";

  /* ——— les tâches lues ——— */
  const aujourdhui = useMemo(() => new Date().setHours(0, 0, 0, 0), []);
  const taches: Tache[] | null = useMemo(() => {
    if (!fiches) return null;
    const parCreation = [...fiches].sort((a, b) => (a.cree < b.cree ? -1 : a.cree > b.cree ? 1 : 0));
    const numeros = new Map<string, number>();
    let max = 0;
    for (const f of parCreation) if (typeof f.num === "number" && f.num > max) max = f.num;
    for (const f of parCreation) numeros.set(f.id, typeof f.num === "number" ? f.num : ++max);
    return fiches.map((f) => ({ ...f, statutLu: statutDe(f), prio: prioDe(f), numero: numeros.get(f.id) ?? 0, etiquettesLues: etiquettesDe(f.etiquettes) }));
  }, [fiches]);
  const noms = useMemo(() => [...new Set((taches ?? []).map((t) => (t.qui ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")), [taches]);
  const etiquettes = useMemo(() => [...new Set((taches ?? []).flatMap((t) => t.etiquettesLues))].sort((a, b) => a.localeCompare(b, "fr")), [taches]);
  const prochainNumero = useMemo(() => (taches ?? []).reduce((m, t) => Math.max(m, t.numero), 0) + 1, [taches]);

  const visibles = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const l = (taches ?? []).filter((t) => {
      if (vue === "active" && t.statutLu !== "todo" && t.statutLu !== "en_cours") return false;
      if (vue === "backlog" && t.statutLu !== "backlog") return false;
      if (filtres.statut && t.statutLu !== filtres.statut) return false;
      if (filtres.prio && String(t.prio) !== filtres.prio) return false;
      if (filtres.qui && (filtres.qui === "__personne" ? !!(t.qui ?? "").trim() : (t.qui ?? "").trim() !== filtres.qui)) return false;
      if (filtres.etiquette && !t.etiquettesLues.includes(filtres.etiquette)) return false;
      if (ql && !`${t.titre ?? ""} ${t.qui ?? ""} ${t.etiquettes ?? ""} ${t.description ?? ""}`.toLowerCase().includes(ql)) return false;
      return true;
    });
    const cmp = (a: Tache, b: Tache) => {
      if (tri === "priorite") return RANG_PRIO[a.prio] - RANG_PRIO[b.prio] || (a.cree < b.cree ? 1 : -1);
      if (tri === "echeance") return (a.echeance || "9999") < (b.echeance || "9999") ? -1 : (a.echeance || "9999") > (b.echeance || "9999") ? 1 : 0;
      if (tri === "titre") return (a.titre ?? "").localeCompare(b.titre ?? "", "fr");
      return a.cree < b.cree ? 1 : -1;
    };
    return l.sort(cmp);
  }, [taches, vue, filtres, q, tri]);

  /* ——— les groupes ——— */
  type Groupe = { cle: string; libelle: string; icone: ReactNode; vide: string; taches: Tache[]; statut?: Statut };
  const groupes: Groupe[] = useMemo(() => {
    if (groupement === "aucun") return [{ cle: "tout", libelle: "Toutes les tâches", icone: <ListChecks width={14} height={14} aria-hidden="true" />, vide: "Aucune tâche", taches: visibles }];
    if (groupement === "priorite")
      return [1, 2, 3, 4, 0].map((p) => ({ cle: `p${p}`, libelle: PRIO_LIBELLE[p], icone: <IconePrio niveau={p as 0 | 1 | 2 | 3 | 4} />, vide: "Aucune tâche", taches: visibles.filter((t) => t.prio === p) }));
    if (groupement === "qui")
      return [
        ...noms.map((n) => ({ cle: `q:${n}`, libelle: n, icone: <span className="lt-avatar">{initiales(n)}</span>, vide: "Aucune tâche", taches: visibles.filter((t) => (t.qui ?? "").trim() === n) })),
        {
          cle: "q:",
          libelle: "Personne",
          icone: (
            <span className="lt-avatar lt-avatar--vide">
              <IconeNonAssigne />
            </span>
          ),
          vide: "Aucune tâche sans personne",
          taches: visibles.filter((t) => !(t.qui ?? "").trim()),
        },
      ];
    return STATUTS.filter((s) => vue === "all" || (vue === "active" ? s.cle === "todo" || s.cle === "en_cours" : s.cle === "backlog")).map((s) => ({
      cle: s.cle,
      libelle: s.libelle,
      icone: <IconeEtat statut={s.cle} />,
      vide: s.vide,
      statut: s.cle,
      taches: visibles.filter((t) => t.statutLu === s.cle),
    }));
  }, [groupement, visibles, noms, vue]);
  const [fermes, setFermes] = useState<Set<string>>(() => new Set());
  const basculerGroupe = (cle: string) =>
    setFermes((avant) => {
      const apres = new Set(avant);
      if (apres.has(cle)) apres.delete(cle);
      else apres.add(cle);
      return apres;
    });
  const groupesAffiches = groupes.filter((g) => affichage.vides || g.taches.length);
  const ordre = useMemo(() => groupesAffiches.flatMap((g) => (fermes.has(g.cle) ? [] : g.taches.map((t) => t.id))), [groupesAffiches, fermes]);

  /* ——— les gestes sur une tâche ——— */
  const modifier = useCallback(
    (id: string, changes: Partial<Fiche>) => {
      ecrire((fiches ?? []).map((f) => (f.id === id ? { ...f, ...changes } : f)));
    },
    [fiches, ecrire],
  );
  const poserStatut = (id: string, s: Statut) => modifier(id, { statut: s, fait: s === "fait" || s === "annule" });
  const supprimer = (id: string) => {
    ecrire((fiches ?? []).filter((f) => f.id !== id));
    if (idOuvert === id) aller({ id: null });
    toast("Supprimé");
  };

  /* ——— la fenêtre « Nouvelle tâche » ——— */
  const [fenetre, setFenetre] = useState<{ statut: Statut; id?: string } | null>(null);
  const enregistrer = (valeurs: Omit<Fiche, "id" | "cree">, id?: string) => {
    if (id) {
      modifier(id, valeurs);
      toast("Enregistré", "vert");
      return;
    }
    const fiche: Fiche = { id: crypto.randomUUID(), cree: new Date().toISOString(), num: prochainNumero, ...valeurs };
    ecrire([fiche, ...(fiches ?? [])]);
    toast("Enregistré", "vert");
  };

  /* ——— le clavier : ↑ ↓ sur la liste, Entrée ouvre, C crée ——— */
  const [surligne, setSurligne] = useState<string | null>(null);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (fenetre || idOuvert) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setFenetre({ statut: "todo" });
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "j" || e.key === "k") {
        if (!ordre.length) return;
        e.preventDefault();
        const i = surligne ? ordre.indexOf(surligne) : -1;
        const bas = e.key === "ArrowDown" || e.key === "j";
        setSurligne(ordre[i < 0 ? (bas ? 0 : ordre.length - 1) : Math.min(ordre.length - 1, Math.max(0, i + (bas ? 1 : -1)))]);
      } else if (e.key === "Enter" && surligne) {
        e.preventDefault();
        aller({ id: surligne });
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ordre, surligne, fenetre, idOuvert, aller]);
  useEffect(() => {
    if (!surligne) return;
    document.getElementById(`lt-${surligne}`)?.scrollIntoView({ block: "nearest" });
  }, [surligne]);

  /* ——— la carte ouverte ——— */
  const ouverte = idOuvert ? ((taches ?? []).find((t) => t.id === idOuvert) ?? null) : null;
  const position = ouverte ? ordre.indexOf(ouverte.id) : -1;
  const nav: NavCarte | null =
    ouverte && position >= 0
      ? {
          position: position + 1,
          total: ordre.length,
          precedente: position > 0 ? () => aller({ id: ordre[position - 1] }) : undefined,
          suivante: position < ordre.length - 1 ? () => aller({ id: ordre[position + 1] }) : undefined,
        }
      : null;

  const nbFiltres = Object.values(filtres).filter(Boolean).length + (q ? 1 : 0);

  /* ——— la ligne ——— */
  const ligne = (t: Tache) => {
    const titre = t.titre || "Sans titre";
    const passee = !!t.echeance && !t.fait && jourDe(t.echeance) < aujourdhui;
    const qui = (t.qui ?? "").trim();
    return (
      <li key={t.id}>
        <div
          id={`lt-${t.id}`}
          className="lt-ligne"
          role="button"
          tabIndex={0}
          aria-label={`Ouvrir « ${titre} »`}
          data-actif={surligne === t.id || idOuvert === t.id ? "" : undefined}
          data-fait={t.statutLu === "fait" || t.statutLu === "annule" ? "" : undefined}
          onClick={() => aller({ id: t.id })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              aller({ id: t.id });
            }
          }}
          onMouseEnter={() => setSurligne(null)}
        >
          <input
            type="checkbox"
            className="lt-case"
            checked={t.statutLu === "fait"}
            aria-label={t.statutLu === "fait" ? `Rouvrir « ${titre} »` : `Marquer « ${titre} » comme faite`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onChange={() => poserStatut(t.id, t.statutLu === "fait" ? "todo" : "fait")}
          />
          {affichage.priorite ? (
            <MenuListe
              titre="Changer la priorité…"
              choix={choixPrio(t.prio, (p) => modifier(t.id, { priorite: p }))}
              bouton={(ouvert, basculer) => (
                <button type="button" className="lt-icone-btn" aria-label={`Priorité : ${PRIO_LIBELLE[t.prio]}`} title={PRIO_LIBELLE[t.prio]} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                  <IconePrio niveau={t.prio} />
                </button>
              )}
            />
          ) : (
            <span />
          )}
          {affichage.id ? <span className="lt-id">TA-{t.numero}</span> : <span />}
          {affichage.statut ? (
            <MenuListe
              titre="Changer le statut…"
              choix={choixStatut(t.statutLu, (s) => poserStatut(t.id, s))}
              bouton={(ouvert, basculer) => (
                <button
                  type="button"
                  className="lt-icone-btn lt-icone-btn--etat"
                  aria-label={`Statut : ${STATUT_LIBELLE[t.statutLu]}`}
                  title={STATUT_LIBELLE[t.statutLu]}
                  aria-haspopup="listbox"
                  aria-expanded={ouvert}
                  onClick={basculer}
                >
                  <IconeEtat statut={t.statutLu} />
                </button>
              )}
            />
          ) : (
            <span />
          )}
          <div className="lt-cellule-titre">
            <span className="lt-titre">{titre}</span>
            <span className="lt-pilules">
              {affichage.etiquettes
                ? t.etiquettesLues.map((e) => (
                    <span key={e} className="lt-pilule">
                      <span className="lt-pilule-point" aria-hidden="true" />
                      {e}
                    </span>
                  ))
                : null}
              {affichage.echeance && t.echeance ? (
                <span className="lt-pilule" data-passe={passee ? "" : undefined} title={passee ? "Échéance passée" : "Échéance"}>
                  <Calendar aria-hidden="true" />
                  {jour(t.echeance)}
                  {passee ? <span className="v2-sr"> (en retard)</span> : null}
                </span>
              ) : null}
            </span>
            {affichage.qui ? (
              <MenuListe
                titre="Pour qui…"
                choix={choixQui(noms, qui || null, (n) => modifier(t.id, { qui: n }))}
                creer={{ libelle: (n) => `Attribuer à « ${n} »`, action: (n) => modifier(t.id, { qui: n }) }}
                cote="droite"
                bouton={(ouvert, basculer) => (
                  <button type="button" className="lt-avatar-btn" aria-label={qui ? `Pour ${qui}` : "Pour personne"} title={qui || "Personne"} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                    {qui ? (
                      <span className="lt-avatar">{initiales(qui)}</span>
                    ) : (
                      <span className="lt-avatar lt-avatar--vide">
                        <IconeNonAssigne />
                      </span>
                    )}
                  </button>
                )}
              />
            ) : null}
          </div>
          {affichage.cree ? (
            <span className="lt-date" title={`Créée le ${jourLong(t.cree)}`}>
              {jour(t.cree)}
            </span>
          ) : (
            <span />
          )}
        </div>
      </li>
    );
  };

  /* ——— le menu Filtre : une recherche (?q=), puis statut, priorité, pour qui, étiquette ——— */
  const [cat, setCat] = useState<Dimension | null>(null);
  /* la saisie suit l'adresse quand elle change ailleurs (la pilule « Tout retirer ») : ajustée au rendu, pas dans un effet */
  const [recherche, setRecherche] = useState(q);
  const [qConnu, setQConnu] = useState(q);
  if (q !== qConnu) {
    setQConnu(q);
    setRecherche(q);
  }
  const menuFiltre = (fermer: () => void) => {
    const options: Choix[] = cat
      ? cat === "statut"
        ? STATUTS_MENU.map((s) => ({ cle: s, libelle: STATUT_LIBELLE[s], icone: <IconeEtat statut={s} />, coche: filtres.statut === s, action: () => poserFiltre("statut", filtres.statut === s ? null : s) }))
        : cat === "prio"
          ? PRIORITES.map((p) => ({
              cle: String(p.cle),
              libelle: p.libelle,
              icone: <IconePrio niveau={p.cle} />,
              coche: filtres.prio === String(p.cle),
              action: () => poserFiltre("prio", filtres.prio === String(p.cle) ? null : String(p.cle)),
            }))
          : cat === "qui"
            ? [
                { cle: "__personne", libelle: "Personne", icone: <IconeNonAssigne />, coche: filtres.qui === "__personne", action: () => poserFiltre("qui", filtres.qui === "__personne" ? null : "__personne") },
                ...noms.map((n) => ({ cle: n, libelle: n, icone: <span className="lt-avatar">{initiales(n)}</span>, coche: filtres.qui === n, action: () => poserFiltre("qui", filtres.qui === n ? null : n) })),
              ]
            : etiquettes.map((e) => ({ cle: e, libelle: e, icone: <span className="lt-option-point" />, coche: filtres.etiquette === e, action: () => poserFiltre("etiquette", filtres.etiquette === e ? null : e) }))
      : [];
    return (
      <>
        <div className="lin-menu-tete">
          <input
            className="lin-menu-saisie"
            autoFocus
            placeholder={cat ? `${DIMENSION_LIBELLE[cat]}…` : "Rechercher…"}
            aria-label={cat ? `Filtrer : ${DIMENSION_LIBELLE[cat]}` : "Rechercher dans les tâches"}
            value={cat ? "" : recherche}
            readOnly={!!cat}
            onChange={(e) => {
              setRecherche(e.target.value);
              aller({ q: e.target.value.trim() || null });
            }}
          />
          <kbd className="lin-kbd">F</kbd>
        </div>
        {cat ? (
          <>
            <button type="button" className="lt-menu-retour" onClick={() => setCat(null)}>
              <ChevronLeft width={14} height={14} aria-hidden="true" /> {DIMENSION_LIBELLE[cat]}
            </button>
            <ul className="lin-options" role="listbox" aria-label={DIMENSION_LIBELLE[cat]}>
              {options.length ? (
                options.map((o) => (
                  <li key={o.cle} role="option" aria-selected={!!o.coche}>
                    <button
                      type="button"
                      className="lin-option"
                      onClick={() => {
                        o.action();
                        setCat(null);
                        fermer();
                      }}
                    >
                      <span className="lin-option-icone">{o.icone}</span>
                      <span className="lin-option-libelle">{o.libelle}</span>
                      {o.coche ? <Check className="lin-option-coche" width={14} height={14} aria-label="posé" /> : null}
                    </button>
                  </li>
                ))
              ) : (
                <li className="lin-options-vide">Aucune étiquette pour l&apos;instant</li>
              )}
            </ul>
          </>
        ) : (
          <ul className="lin-options" aria-label="Filtrer par">
            {DIMENSIONS.map((d) => (
              <li key={d}>
                <button type="button" className="lin-option" onClick={() => setCat(d)}>
                  <span className="lin-option-icone">
                    {d === "statut" ? (
                      <IconeEtat statut="todo" />
                    ) : d === "prio" ? (
                      <IconePrio niveau={2} />
                    ) : d === "qui" ? (
                      <User width={16} height={16} aria-hidden="true" />
                    ) : (
                      <Tag width={16} height={16} aria-hidden="true" />
                    )}
                  </span>
                  <span className="lin-option-libelle">{DIMENSION_LIBELLE[d]}</span>
                  {filtres[d] ? (
                    <span className="lin-option-meta">
                      {d === "qui" && filtres.qui === "__personne" ? "Personne" : d === "statut" ? STATUT_LIBELLE[filtres.statut as Statut] : d === "prio" ? PRIO_LIBELLE[Number(filtres.prio)] : filtres[d]}
                    </span>
                  ) : null}
                  <ChevronRight className="lt-option-fleche" width={14} height={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  /* ——— le menu Affichage ——— */
  const menuAffichage = () => (
    <>
      <div className="lt-affichage-section">
        <div className="lt-segment" role="group" aria-label="Disposition">
          <button type="button" aria-pressed="true">
            <LayoutList aria-hidden="true" /> Liste
          </button>
          <button type="button" aria-pressed="false" disabled title="Le tableau en colonnes n'existe pas sur cette page">
            <Columns3 aria-hidden="true" /> Tableau
          </button>
        </div>
        <div className="lt-rangee">
          <span>Regroupement</span>
          <span className="lt-rangee-droite">
            <span className="lt-select">
              <span>{GROUPE_LIBELLE[groupement]}</span>
              <ChevronDown aria-hidden="true" />
              <select aria-label="Regroupement" value={groupement} onChange={(e) => aller({ groupe: e.target.value === "statut" ? null : e.target.value })}>
                {GROUPES.map((g) => (
                  <option key={g} value={g}>
                    {GROUPE_LIBELLE[g]}
                  </option>
                ))}
              </select>
            </span>
          </span>
        </div>
        <div className="lt-rangee">
          <span>Tri</span>
          <span className="lt-rangee-droite">
            <span className="lt-ordre" aria-hidden="true">
              <ArrowDownUp />
            </span>
            <span className="lt-select">
              <span>{TRI_LIBELLE[tri]}</span>
              <ChevronDown aria-hidden="true" />
              <select aria-label="Tri" value={tri} onChange={(e) => aller({ tri: e.target.value === "priorite" ? null : e.target.value })}>
                {TRIS.map((t) => (
                  <option key={t} value={t}>
                    {TRI_LIBELLE[t]}
                  </option>
                ))}
              </select>
            </span>
          </span>
        </div>
      </div>
      <div className="lt-affichage-section">
        <div className="lt-affichage-titre">Options de la liste</div>
        <div className="lt-rangee">
          <span id="lt-vides">Afficher les groupes vides</span>
          <button type="button" role="switch" className="lt-interrupteur" aria-checked={affichage.vides} aria-labelledby="lt-vides" onClick={() => poserAffichage({ vides: !affichage.vides })} />
        </div>
        <div className="lt-affichage-titre">Propriétés affichées</div>
        <div className="lt-proprietes">
          {PROPRIETES.map((p) => (
            <button key={p.cle} type="button" className="lt-propriete" aria-pressed={affichage[p.cle]} onClick={() => poserAffichage({ [p.cle]: !affichage[p.cle] })}>
              {p.libelle}
            </button>
          ))}
        </div>
      </div>
      <div className="lt-affichage-pied">
        <button
          type="button"
          onClick={() => {
            poserAffichage(AFFICHAGE_DEFAUT);
            aller({ groupe: null, tri: null });
          }}
        >
          Réinitialiser
        </button>
      </div>
    </>
  );

  const [epingle, setEpingle] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage
      setEpingle(localStorage.getItem("lt-epingle:taches") === "1");
    } catch {
      /* rien d'épinglé */
    }
  }, []);

  return (
    <div className="lin lt">
      <header className="lin-tete">
        <div className="lin-fil">
          <span className="lin-fil-equipe">
            <IconeEquipe />
            Équipe
          </span>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <h1 className="lin-fil-ici" style={{ margin: 0, font: "inherit" }}>
            <b>Tâches</b>
          </h1>
        </div>
        <button
          type="button"
          className="lin-btn"
          aria-label={epingle ? "Retirer des favoris" : "Ajouter aux favoris"}
          title={epingle ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={epingle}
          onClick={() => {
            const v = !epingle;
            setEpingle(v);
            try {
              localStorage.setItem("lt-epingle:taches", v ? "1" : "0");
            } catch {
              /* vaut pour cette visite */
            }
            toast(v ? "Ajouté aux favoris de cet appareil" : "Retiré des favoris");
          }}
        >
          <Star width={14} height={14} aria-hidden="true" fill={epingle ? "currentColor" : "none"} />
        </button>
        <div className="lin-tete-droite">
          <button type="button" className="lin-btn lin-btn--texte" onClick={() => setFenetre({ statut: "todo" })}>
            <SquarePen width={14} height={14} aria-hidden="true" /> Nouvelle tâche
          </button>
        </div>
      </header>

      <div className="lt-outils">
        <nav className="lin-onglets" aria-label="Vues">
          {(
            [
              ["active", "Actives"],
              ["backlog", "Backlog"],
              ["all", "Toutes les tâches"],
            ] as [Vue, string][]
          ).map(([v, l]) => (
            <button key={v} type="button" className="lin-onglet" data-actif={vue === v ? "" : undefined} aria-current={vue === v ? "page" : undefined} onClick={() => aller({ vue: v === "all" ? null : v })}>
              {l}
            </button>
          ))}
        </nav>
        <div className="lt-outils-droite">
          <MenuListe
            titre="Filtrer"
            choix={[]}
            cote="droite"
            largeur={207}
            enfants={menuFiltre}
            bouton={(ouvert, basculer) => (
              <button type="button" className={`lin-rond lt-rond--plein${nbFiltres ? " lt-rond--point" : ""}`} aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} onClick={basculer}>
                <Filter aria-hidden="true" />
              </button>
            )}
          />
          <MenuListe
            titre="Options d'affichage"
            choix={[]}
            cote="droite"
            enfants={menuAffichage}
            bouton={(ouvert, basculer) => (
              <button
                type="button"
                className={`lin-rond lt-rond--plein${affichageModifie ? " lt-rond--point" : ""}`}
                aria-label="Options d'affichage"
                title="Options d'affichage"
                aria-expanded={ouvert}
                onClick={basculer}
              >
                <SlidersHorizontal aria-hidden="true" />
              </button>
            )}
          />
        </div>
      </div>

      {nbFiltres ? (
        <div className="lt-filtres" aria-label="Filtres posés">
          {q ? (
            <span className="lt-filtre">
              <span>
                Recherche <b>{q}</b>
              </span>
              <button type="button" aria-label="Retirer la recherche" onClick={() => aller({ q: null })}>
                <X width={12} height={12} aria-hidden="true" />
              </button>
            </span>
          ) : null}
          {(Object.entries(filtres) as [Dimension, string][]).map(([d, v]) => (
            <span key={d} className="lt-filtre">
              <span>
                {DIMENSION_LIBELLE[d]} <b>{d === "statut" ? STATUT_LIBELLE[v as Statut] : d === "prio" ? PRIO_LIBELLE[Number(v)] : d === "qui" && v === "__personne" ? "Personne" : v}</b>
              </span>
              <button type="button" aria-label={`Retirer le filtre ${DIMENSION_LIBELLE[d]}`} onClick={() => poserFiltre(d, null)}>
                <X width={12} height={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" className="lt-filtres-vider" onClick={() => aller({ filtre: null, q: null })}>
            Tout retirer
          </button>
        </div>
      ) : null}

      <div className="lt-liste">
        {taches === null ? null : !taches.length ? (
          <div className="lt-vide">
            <h2>Aucune tâche pour l&apos;instant.</h2>
            <p>Ce qu&apos;il reste à faire dans l&apos;équipe, avec une échéance. Cochez une tâche quand elle est faite.</p>
            <button type="button" className="lin-btn lin-btn--plein lin-btn--texte" onClick={() => setFenetre({ statut: "todo" })}>
              <Plus width={14} height={14} aria-hidden="true" /> Nouvelle tâche
            </button>
          </div>
        ) : !groupesAffiches.length ? (
          <div className="lt-vide">
            <h2>Rien ne correspond</h2>
            <p>Aucune tâche ne correspond à cette vue ou à ces filtres.</p>
          </div>
        ) : (
          groupesAffiches.map((g) => {
            const ferme = fermes.has(g.cle);
            return (
              <section key={g.cle} className="lt-groupe" aria-label={`${g.libelle} : ${pluriel(g.taches.length, "tâche")}`}>
                <header className="lt-groupe-tete">
                  <span className="lt-groupe-chevron">
                    <button type="button" className="lt-chevron" aria-expanded={!ferme} aria-label={ferme ? `Déplier ${g.libelle}` : `Replier ${g.libelle}`} onClick={() => basculerGroupe(g.cle)}>
                      <IconeChevronGroupe />
                    </button>
                  </span>
                  <span className="lt-groupe-icone">{g.icone}</span>
                  <h3 className="lt-groupe-nom">{g.libelle}</h3>
                  <span className="lt-groupe-compte">{g.taches.length}</span>
                  <button type="button" className="lt-groupe-plus" aria-label={`Nouvelle tâche dans « ${g.libelle} »`} title="Nouvelle tâche" onClick={() => setFenetre({ statut: g.statut ?? "todo" })}>
                    <IconePlus />
                  </button>
                </header>
                {ferme ? null : <ul className="lt-lignes">{g.taches.map(ligne)}</ul>}
              </section>
            );
          })
        )}
        {taches?.length ? <p className="lt-pied">{pluriel(visibles.length, "tâche")} · gardées sur cet appareil, vos collègues ne les voient pas encore.</p> : null}
      </div>

      {fenetre ? (
        <FenetreTache
          statut={fenetre.statut}
          fiche={fenetre.id ? ((taches ?? []).find((t) => t.id === fenetre.id) ?? null) : null}
          noms={noms}
          etiquettes={etiquettes}
          fermer={() => setFenetre(null)}
          enregistrer={(v, encore) => {
            enregistrer(v, fenetre.id);
            if (!encore) setFenetre(null);
          }}
        />
      ) : null}

      {idOuvert ? (
        ouverte ? (
          <CarteTache
            t={ouverte}
            noms={noms}
            nav={nav}
            aujourdhui={aujourdhui}
            fermer={() => aller({ id: null })}
            modifier={(c) => modifier(ouverte.id, c)}
            poserStatut={(s) => poserStatut(ouverte.id, s)}
            supprimer={() => supprimer(ouverte.id)}
            editer={() => setFenetre({ statut: ouverte.statutLu, id: ouverte.id })}
          />
        ) : taches ? (
          <CarteCentrale
            ouverte
            fermer={() => aller({ id: null })}
            libelle="Tâche introuvable"
            sur="Équipe · Tâche"
            gauche={
              <div className="v2-det-document-vide">
                <ListChecks width={22} height={22} aria-hidden="true" />
                Aucune pièce.
              </div>
            }
            titre="Cette tâche n'est plus dans la liste."
            actions={
              <button type="button" className="v2-btn v2-btn--fantome" onClick={() => aller({ id: null })}>
                Fermer
              </button>
            }
          />
        ) : null
      ) : null}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   La fenêtre « Nouvelle tâche » de Linear (750 de large, rayon 21) : le
   titre en 18/600, la description, puis la rangée des propriétés — statut,
   priorité, pour qui, étiquettes, échéance — et « Créer d'autres ».
   Sert aussi à modifier une tâche (depuis la carte).
   ══════════════════════════════════════════════════════════════════════ */
function FenetreTache({
  statut: statutInitial,
  fiche,
  noms,
  etiquettes: toutesEtiquettes,
  fermer,
  enregistrer,
}: {
  statut: Statut;
  fiche: Tache | null;
  noms: string[];
  etiquettes: string[];
  fermer: () => void;
  enregistrer: (v: Omit<Fiche, "id" | "cree">, encore: boolean) => void;
}) {
  const [titre, setTitre] = useState(fiche?.titre ?? "");
  const [description, setDescription] = useState(fiche?.description ?? "");
  const [statut, setStatut] = useState<Statut>(fiche?.statutLu ?? statutInitial);
  const [prio, setPrio] = useState<0 | 1 | 2 | 3 | 4>(fiche?.prio ?? 0);
  const [qui, setQui] = useState((fiche?.qui ?? "").trim());
  const [etiquettes, setEtiquettes] = useState<string[]>(fiche?.etiquettesLues ?? []);
  const [echeance, setEcheance] = useState(fiche?.echeance ?? "");
  const [encore, setEncore] = useState(false);
  const titreRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const envoyer = (e?: FormEvent) => {
    e?.preventDefault();
    if (!titre.trim()) {
      titreRef.current?.focus();
      return;
    }
    enregistrer({ titre: titre.trim(), description: description.trim(), statut, fait: statut === "fait" || statut === "annule", priorite: prio, qui, etiquettes: etiquettes.join(", "), echeance }, encore && !fiche);
    if (encore && !fiche) {
      setTitre("");
      setDescription("");
      titreRef.current?.focus();
    }
  };
  const basculerEtiquette = (e: string) => setEtiquettes((avant) => (avant.includes(e) ? avant.filter((x) => x !== e) : [...avant, e]));
  return (
    <ModalOverlay isOpen onOpenChange={(o) => !o && fermer()} isDismissable className="v2-jetons lt-voile">
      <Modal className="lt-fenetre">
        <Dialog aria-label={fiche ? "Modifier la tâche" : "Nouvelle tâche"} style={{ outline: "none" }}>
          <form
            onSubmit={envoyer}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                envoyer();
              }
            }}
          >
            <div className="lt-fenetre-tete">
              <span className="lt-fenetre-equipe">
                <IconeEquipe />
                TA
              </span>
              <span className="lt-fenetre-sep" aria-hidden="true">
                ›
              </span>
              <span className="lt-fenetre-nom">{fiche ? `Modifier TA-${fiche.numero}` : "Nouvelle tâche"}</span>
              <div className="lt-fenetre-outils">
                <button type="button" className="lt-fenetre-rond" aria-label="Fermer" onClick={fermer}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="lt-fenetre-corps">
              <input ref={titreRef} className="lt-fenetre-titre" autoFocus placeholder="Titre de la tâche" aria-label="Titre de la tâche" value={titre} onChange={(e) => setTitre(e.target.value)} required />
              <textarea className="lt-fenetre-description" placeholder="Ajouter une description…" aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="lt-fenetre-proprietes">
              <MenuListe
                titre="Changer le statut…"
                choix={choixStatut(statut, setStatut)}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="lt-propriete-btn" data-posee="" aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                    <IconeEtat statut={statut} /> {STATUT_LIBELLE[statut]}
                  </button>
                )}
              />
              <MenuListe
                titre="Changer la priorité…"
                choix={choixPrio(prio, setPrio)}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="lt-propriete-btn" data-posee={prio ? "" : undefined} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                    <IconePrio niveau={prio} /> {prio ? PRIO_LIBELLE[prio] : "Priorité"}
                  </button>
                )}
              />
              <MenuListe
                titre="Pour qui…"
                choix={choixQui(noms, qui || null, setQui)}
                creer={{ libelle: (n) => `Attribuer à « ${n} »`, action: setQui }}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="lt-propriete-btn" data-posee={qui ? "" : undefined} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                    {qui ? (
                      <span className="lt-avatar" style={{ width: 14, height: 14, fontSize: 7, margin: 0 }}>
                        {initiales(qui)}
                      </span>
                    ) : (
                      <User aria-hidden="true" />
                    )}{" "}
                    {qui || "Pour qui"}
                  </button>
                )}
              />
              <MenuListe
                titre="Étiquettes…"
                choix={[...new Set([...toutesEtiquettes, ...etiquettes])]
                  .sort((a, b) => a.localeCompare(b, "fr"))
                  .map((e) => ({ cle: e, libelle: e, icone: <span className="lt-option-point" />, coche: etiquettes.includes(e), action: () => basculerEtiquette(e) }))}
                creer={{ libelle: (n) => `Créer l'étiquette « ${n} »`, action: (n) => basculerEtiquette(n) }}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="lt-propriete-btn" data-posee={etiquettes.length ? "" : undefined} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                    <Tag aria-hidden="true" /> {etiquettes.length ? etiquettes.join(", ") : "Étiquettes"}
                  </button>
                )}
              />
              <span className="lt-propriete-btn lt-propriete-date" data-posee={echeance ? "" : undefined}>
                <Calendar aria-hidden="true" /> {echeance ? jour(echeance) : "Échéance"}
                <input
                  ref={dateRef}
                  type="date"
                  aria-label="Échéance"
                  value={echeance}
                  onChange={(e) => setEcheance(e.target.value)}
                  onClick={() => {
                    try {
                      dateRef.current?.showPicker();
                    } catch {
                      /* le navigateur ouvre le sélecteur lui-même */
                    }
                  }}
                />
              </span>
              {echeance ? (
                <button type="button" className="lt-propriete-btn" aria-label="Retirer l'échéance" onClick={() => setEcheance("")}>
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <div className="lt-fenetre-pied">
              <span className="lt-fenetre-encore" style={{ visibility: fiche ? "hidden" : undefined }}>
                <button type="button" role="switch" className="lt-interrupteur" aria-checked={encore} aria-label="Créer d'autres tâches à la suite" onClick={() => setEncore((v) => !v)} />
                Créer d&apos;autres
              </span>
              <div className="lt-fenetre-pied-droite">
                <button type="submit" className="lt-fenetre-creer">
                  {fiche ? "Enregistrer" : "Créer la tâche"}
                </button>
              </div>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   La carte au milieu (CarteCentrale) : la feuille de la tâche à gauche ;
   à droite, le titre, l'échéance, la fiche où l'on change l'état, la
   priorité, pour qui, l'échéance, les étiquettes ; la description ; les
   gestes — marquer faite / rouvrir, modifier, supprimer.
   ══════════════════════════════════════════════════════════════════════ */
function CarteTache({
  t,
  noms,
  nav,
  aujourdhui,
  fermer,
  modifier,
  poserStatut,
  supprimer,
  editer,
}: {
  t: Tache;
  noms: string[];
  nav: NavCarte | null;
  aujourdhui: number;
  fermer: () => void;
  modifier: (c: Partial<Fiche>) => void;
  poserStatut: (s: Statut) => void;
  supprimer: () => void;
  editer: () => void;
}) {
  const titre = t.titre || "Sans titre";
  const qui = (t.qui ?? "").trim();
  const passee = !!t.echeance && !t.fait && jourDe(t.echeance) < aujourdhui;
  const aujourdhuiMeme = !!t.echeance && !t.fait && jourDe(t.echeance) === aujourdhui;
  const [nouvelleEtiquette, setNouvelleEtiquette] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  const poserEtiquettes = (l: string[]) => modifier({ etiquettes: l.join(", ") });
  return (
    <CarteCentrale
      ouverte
      fermer={fermer}
      libelle={`Tâche : ${titre}`}
      sur="Équipe · Tâche"
      statut={
        <>
          <IconeEtat statut={t.statutLu} />
          {STATUT_LIBELLE[t.statutLu]}
        </>
      }
      nav={nav}
      gauche={
        <Feuille
          titre="TÂCHE"
          sous={`TA-${t.numero} · créée le ${jourLong(t.cree)}`}
          nom={titre}
          sousNom={qui ? [`Pour ${qui}`] : ["Pour personne"]}
          texte={t.description?.trim() || null}
          lignes={[
            ["Statut", STATUT_LIBELLE[t.statutLu]],
            ["Priorité", PRIO_LIBELLE[t.prio]],
            ["Échéance", t.echeance ? jourLong(t.echeance) : "—"],
            ["Étiquettes", t.etiquettesLues.join(", ") || "—"],
          ]}
        />
      }
      piedGauche={
        <div className="v2-det-document-ligne">
          <span className="v2-det-mono">TA-{t.numero}</span>
          <span className="v2-det-sous">{t.etiquettesLues.length ? pluriel(t.etiquettesLues.length, "étiquette") : "Sans étiquette"}</span>
        </div>
      }
      titre={titre}
      echeance={t.echeance ? { texte: `Échéance ${jourLong(t.echeance)}`, urgence: passee ? "retard" : aujourdhuiMeme ? "aujourdhui" : undefined } : null}
      actions={
        <>
          {t.statutLu === "fait" ? (
            <button type="button" className="v2-btn v2-btn--primaire" onClick={() => poserStatut("todo")}>
              Rouvrir
            </button>
          ) : (
            <button type="button" className="v2-btn v2-btn--primaire" onClick={() => poserStatut("fait")}>
              <Check width={14} height={14} aria-hidden="true" /> Marquer faite
            </button>
          )}
          <button type="button" className="v2-btn v2-btn--fantome" onClick={editer}>
            <SquarePen width={14} height={14} aria-hidden="true" /> Modifier
          </button>
          {confirmer ? (
            <>
              <button type="button" className="v2-btn v2-det-btn-danger v2-det-btn-danger--plein" onClick={supprimer}>
                Oui, supprimer
              </button>
              <button type="button" className="v2-btn v2-btn--fantome" onClick={() => setConfirmer(false)}>
                Non
              </button>
            </>
          ) : (
            <button type="button" className="v2-btn v2-btn--fantome v2-det-btn-danger" onClick={() => setConfirmer(true)}>
              <Trash2 width={14} height={14} aria-hidden="true" /> Supprimer
            </button>
          )}
        </>
      }
    >
      <dl className="v2-det-fiche">
        <dt>Statut</dt>
        <dd>
          <MenuListe
            titre="Changer le statut…"
            choix={choixStatut(t.statutLu, poserStatut)}
            bouton={(ouvert, basculer) => (
              <button type="button" className="lt-carte-valeur" aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                <IconeEtat statut={t.statutLu} /> {STATUT_LIBELLE[t.statutLu]}
              </button>
            )}
          />
        </dd>
        <dt>Priorité</dt>
        <dd>
          <MenuListe
            titre="Changer la priorité…"
            choix={choixPrio(t.prio, (p) => modifier({ priorite: p }))}
            bouton={(ouvert, basculer) => (
              <button type="button" className={t.prio ? "lt-carte-valeur" : "lt-carte-valeur lt-carte-valeur--vide"} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                <IconePrio niveau={t.prio} /> {PRIO_LIBELLE[t.prio]}
              </button>
            )}
          />
        </dd>
        <dt>Pour qui</dt>
        <dd>
          <MenuListe
            titre="Pour qui…"
            choix={choixQui(noms, qui || null, (n) => modifier({ qui: n }))}
            creer={{ libelle: (n) => `Attribuer à « ${n} »`, action: (n) => modifier({ qui: n }) }}
            bouton={(ouvert, basculer) => (
              <button type="button" className={qui ? "lt-carte-valeur" : "lt-carte-valeur lt-carte-valeur--vide"} aria-haspopup="listbox" aria-expanded={ouvert} onClick={basculer}>
                {qui ? (
                  <>
                    <span className="lt-avatar" style={{ margin: 0 }}>
                      {initiales(qui)}
                    </span>{" "}
                    {qui}
                  </>
                ) : (
                  <>
                    <span className="lt-avatar lt-avatar--vide" style={{ margin: 0 }}>
                      <IconeNonAssigne />
                    </span>{" "}
                    Personne
                  </>
                )}
              </button>
            )}
          />
        </dd>
        <dt>Échéance</dt>
        <dd>
          <input type="date" className="v2-det-champ lt-carte-champ" aria-label="Échéance" value={t.echeance ?? ""} onChange={(e) => modifier({ echeance: e.target.value })} />
        </dd>
        <dt>Étiquettes</dt>
        <dd>
          <div className="lt-carte-etiquettes">
            {t.etiquettesLues.map((e) => (
              <span key={e} className="lt-pilule">
                <span className="lt-pilule-point" aria-hidden="true" />
                {e}
                <button type="button" aria-label={`Retirer l'étiquette ${e}`} onClick={() => poserEtiquettes(t.etiquettesLues.filter((x) => x !== e))}>
                  <X width={10} height={10} aria-hidden="true" />
                </button>
              </span>
            ))}
            <input
              placeholder="Ajouter…"
              aria-label="Ajouter une étiquette"
              value={nouvelleEtiquette}
              onChange={(e) => setNouvelleEtiquette(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nouvelleEtiquette.trim()) {
                  e.preventDefault();
                  if (!t.etiquettesLues.includes(nouvelleEtiquette.trim())) poserEtiquettes([...t.etiquettesLues, nouvelleEtiquette.trim()]);
                  setNouvelleEtiquette("");
                }
              }}
            />
          </div>
        </dd>
        <dt>Créée le</dt>
        <dd>{jourLong(t.cree)}</dd>
      </dl>
      {t.description?.trim() ? (
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">Description</h3>
          <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: 13, lineHeight: "20px" }}>{t.description}</p>
        </div>
      ) : null}
    </CarteCentrale>
  );
}
