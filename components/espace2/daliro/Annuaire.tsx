"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Annuaire — copie 1:1 de la liste People d'Attio et de la fiche
   d'un contact (02/11/2026, règles de Teo : docs/refonte-metiers/REGLES.md ;
   relevé : docs/refonte-metiers/releves/attio-people.md ; styles :
   ./dal-attio.css, préfixe dat- ; icônes : celles d'Attio, ./DatIcone).

   Ce qu'Attio montre, et ce que c'est ici (chaque bouton sert) :
     replier la barre latérale  replie le volet des pages de la coquille
                                (ce navigateur)
     « Recently Contacted People ⌄ »   une vue par famille de rôles (?role=)
     « View settings »          colonnes affichées (?cols=) et regroupement
                                par rôle (?groupe=role)
     « Import / Export »        la liste affichée en CSV (filtres compris) ;
                                pas d'import : l'annuaire se remplit avec
                                les chantiers
     « + New Person »           « + Nouvelle entreprise » : la fenêtre de
                                création des Entreprises de l'espace (fiche
                                gardée dans ce navigateur), reprise ici
     « Sorted by … »            tri (?tri=, ?sens=)
     « Filter »                 nom ou commune (?q=), « À surveiller » (?veille=1)
     cases à cocher             sélection, puis barre d'actions : exporter,
                                copier les courriels, écrire à tous (votre
                                messagerie, rien ne part d'ici), épingler
     en-tête : épingle          la colonne se fige à gauche (?epingle=)
     en-tête : éclair           trie sur la colonne (?tri=)
     « + Add column »           ajoute une colonne (commune, téléphone,
                                courriel, SIREN, corps d'état ; ?cols=)
     pied « + Add calculation » un calcul sur les lignes affichées
                                (renseignés, vides, %, plus proche… ; ?calc=)
     fiche : crayon             la description de l'entreprise (ce navigateur)
     fiche : étoile             épingler (Vue d'ensemble, « Épinglés »)
     fiche : boutons d'action   écrire (mailto), appeler (tel), nouvelle note,
                                disponibilités (Équipes)
     fiche : onglets            Vue d'ensemble · Activité (passages) ·
                                Courriels · Appels (coordonnées, demandes et
                                réponses J-2 par ce canal) · Chantiers ·
                                Notes · Tâches (gardées dans ce navigateur) ·
                                Factures (rattachées à ses lots)

   Lecture seule côté base, comme l'annuaire de l'écran d'avant (inventaire
   B26 : aucune porte n'écrit un tiers). En base réelle, l'annuaire se lit
   dans les tableaux des chantiers (demander, demanderTous).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { CONFIRMATIONS, ROLES_TIERS, STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import type { Chantier, FactureChantier, Lot, Passage, Tiers, Vigilance } from "@/components/espace/daliro/types";
import { ecrireStockage, useStockage } from "../Collection";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DatIcone, type NomDatIcone } from "./DatIcone";
import { useDaliro } from "./donnees";
import { copier, exporterCsv, useFavoris } from "./navigateur";
import "./dal-attio.css";

const BASE = `${RACINE}/daliro`;

/* les familles de rôles : une vue chacune, si l'annuaire en compte */
type Groupe = { cle: string; libelle: string; roles: string[] };
const GROUPES: Groupe[] = [
  { cle: "sous-traitants", libelle: "Sous-traitants", roles: ["sous_traitant"] },
  { cle: "maitres-ouvrage", libelle: "Maîtres d'ouvrage", roles: ["maitre_ouvrage"] },
  { cle: "maitrise-oeuvre", libelle: "Maîtrise d'œuvre", roles: ["maitre_oeuvre"] },
  { cle: "fournisseurs", libelle: "Fournisseurs", roles: ["fournisseur", "loueur"] },
];
const CONNUS = GROUPES.flatMap((g) => g.roles);
const AUTRES: Groupe = { cle: "autres", libelle: "Autres", roles: [] };
const dans = (t: Tiers, g: Groupe) => (g.cle === "autres" ? !t.roles.length || t.roles.some((r) => !CONNUS.includes(r)) : t.roles.some((r) => g.roles.includes(r)));
const rangement = (t: Tiers) => GROUPES.find((g) => dans(t, g)) ?? AUTRES;

/* la pastille « Connection strength » d'Attio (sprite : rect x4 y4 w8 h8 rx3), ses quatre couleurs
   par niveau, et le gris « No communication » : ici, la vigilance */
const NIVEAUX: Record<Vigilance, { libelle: string; couleur: string; rang: number }> = {
  a_jour: { libelle: "À jour", couleur: "#00D17E", rang: 5 },
  a_renouveler: { libelle: "À renouveler", couleur: "#266DF0", rang: 3 },
  a_verifier: { libelle: "À vérifier", couleur: "#F97514", rang: 2 },
  echue: { libelle: "Plus de six mois", couleur: "#FF5454", rang: 1 },
  absente: { libelle: "Attestation absente", couleur: "#FF5454", rang: 0 },
  sans_objet: { libelle: "Sans objet", couleur: "#77797C", rang: 4 },
};
const A_SURVEILLER: Vigilance[] = ["absente", "echue", "a_renouveler", "a_verifier"];
const STATUTS_LOT: Record<Lot["statut"], string> = { a_venir: "à venir", en_cours: "en cours", termine: "terminé" };
const CANAUX: Record<string, string> = { email: "courriel", sms: "SMS", whatsapp: "WhatsApp" };

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const jj = (s: string) => s.slice(0, 10);
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const libelleRoles = (t: Tiers) => (t.id.startsWith("loc:") ? (t.corps_etat[0] ?? "") : t.roles.map((r) => ROLES_TIERS[r] ?? r).join(", "));
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / 86_400_000);
};
const dateFr = (iso: string) => new Date(`${jj(iso)}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" });
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const euros = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n));

/* les dates relatives d'Attio (« 1 day ago », « about 1 month ago », « over 1 year ago ») */
function relatif(jour: string, auj: string): string {
  const n = num(jour) - num(auj);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  const a = Math.abs(n);
  const quoi = a < 30 ? pluriel(a, "jour") : a < 60 ? "environ 1 mois" : a < 365 ? `environ ${Math.round(a / 30)} mois` : a < 730 ? "plus d'un an" : `plus de ${Math.floor(a / 365)} ans`;
  return n > 0 ? `dans ${quoi}` : `il y a ${quoi}`;
}
/* « +33612345601 » → « 06 12 34 56 01 » ; le reste tel quel */
function telephone(v: string): string {
  const n = v.replace(/\s/g, "");
  const m = /^(?:\+33|0)(\d{9})$/.exec(n);
  return m ? `0${m[1]}`.replace(/(\d{2})(?=\d)/g, "$1 ") : v;
}

/* ——— ce que ce navigateur retient (rien n'est envoyé au serveur) ——— */
const CLE_REPLIE = "espace2:daliro:annuaire:replie";
const CLE_FICHE = (id: string) => `espace2:daliro:annuaire:fiche:${id}`;
const CLE_ENTREPRISES = "espace2-collection-entreprises";
type Note = { id: string; titre: string; texte: string; le: string };
type Tache = { id: string; texte: string; fait: boolean; echeance: string | null };
type FicheLocale = { description?: string; notes?: Note[]; taches?: Tache[] };
const lireLocal = (cle: string) => {
  try {
    return localStorage.getItem(cle) ?? "";
  } catch {
    return "";
  }
};
const ecrireLocal = (cle: string, valeur: unknown) => {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : le geste vaut pour cette visite */
  }
  window.dispatchEvent(new Event(cle));
};
const analyses = new Map<string, unknown>();
function useLocal<T>(cle: string, defaut: T): T {
  const brut = useSyncExternalStore(
    (cb) => {
      window.addEventListener(cle, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(cle, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => lireLocal(cle),
    () => "",
  );
  if (!brut) return defaut;
  const k = `${cle}|${brut}`;
  if (!analyses.has(k)) {
    try {
      analyses.set(k, JSON.parse(brut) as T);
    } catch {
      analyses.set(k, defaut);
    }
  }
  return analyses.get(k) as T;
}
const FICHE_VIDE: FicheLocale = {};

/* les entreprises notées à la main dans l'espace (/espace2/entreprises, ../Collection) : même stockage */
type EntrepriseLocale = { id: string; cree: string; nom?: string; type?: string; ville?: string; telephone?: string; email?: string };
function versTiers(e: EntrepriseLocale): Tiers {
  return {
    id: `loc:${e.id}`,
    roles: [],
    nom: e.nom || "Sans nom",
    siren: null,
    telephone: e.telephone || null,
    email: e.email || null,
    canal: null,
    commune: e.ville || null,
    corps_etat: e.type ? [e.type] : [],
    departements: [],
    confirmer_passages: false,
    vigilance_attestation_le: null,
    vigilance_verifiee_le: null,
    actif: true,
  };
}

/* ——— les colonnes de la grille ——— */
type Passages = { prochain: { p: Passage; c: Chantier } | null; dernier: { p: Passage; c: Chantier } | null; tous: { p: Passage; c: Chantier }[] };
type Colonne = { cle: string; libelle: string; icone: NomDatIcone; largeur: number; calcule?: boolean; date?: boolean; valeur: (t: Tiers, ps: Passages | undefined, auj: string) => string | null; tri: (t: Tiers, ps: Passages | undefined) => string | number };
const COLONNES: Colonne[] = [
  { cle: "vig", libelle: "Vigilance", icone: "Handshake", largeur: 215, calcule: true, valeur: (t) => (t.vigilance ? NIVEAUX[t.vigilance].libelle : null), tri: (t) => (t.vigilance ? NIVEAUX[t.vigilance].rang : 9) },
  { cle: "der", libelle: "Dernier passage", icone: "EmailArrowRight", largeur: 288, calcule: true, date: true, valeur: (_t, ps, auj) => (ps?.dernier ? majuscule(relatif(jj(ps.dernier.p.debut), auj)) : null), tri: (_t, ps) => (ps?.dernier ? -num(ps.dernier.p.debut) : 99999) },
  { cle: "pro", libelle: "Prochain passage", icone: "CalendarArrowRight", largeur: 310, calcule: true, date: true, valeur: (_t, ps, auj) => (ps?.prochain ? majuscule(relatif(jj(ps.prochain.p.debut) < auj ? auj : jj(ps.prochain.p.debut), auj)) : null), tri: (_t, ps) => (ps?.prochain ? num(ps.prochain.p.debut) : 99999) },
  { cle: "roles", libelle: "Rôles", icone: "Briefcase", largeur: 250, valeur: (t) => libelleRoles(t) || null, tri: (t) => libelleRoles(t) || "~" },
  { cle: "commune", libelle: "Commune", icone: "Location", largeur: 180, valeur: (t) => t.commune, tri: (t) => t.commune ?? "~" },
  { cle: "tel", libelle: "Téléphone", icone: "Phone", largeur: 180, valeur: (t) => (t.telephone ? telephone(t.telephone) : null), tri: (t) => t.telephone ?? "~" },
  { cle: "mail", libelle: "Courriel", icone: "At", largeur: 250, valeur: (t) => t.email, tri: (t) => t.email ?? "~" },
  { cle: "siren", libelle: "SIREN", icone: "Hashtag", largeur: 180, valeur: (t) => t.siren, tri: (t) => t.siren ?? "~" },
  { cle: "corps", libelle: "Corps d'état", icone: "Tag", largeur: 215, valeur: (t) => (t.corps_etat.length ? t.corps_etat.map(majuscule).join(", ") : null), tri: (t) => t.corps_etat[0] ?? "~" },
];
const PAR_DEFAUT = ["vig", "der", "pro", "roles"];
const VIDES: Record<string, string> = { vig: "Non renseignée", der: "Aucun passage", pro: "Aucun passage", roles: "Aucun rôle", commune: "Aucune commune", tel: "Aucun téléphone", mail: "Aucun courriel", siren: "Aucun SIREN", corps: "Aucun" };

/* « Add calculation » : les calculs d'une colonne sur les lignes affichées */
type Calcul = { cle: string; libelle: string; f: (vals: (string | null)[], col: Colonne, lignes: { t: Tiers; ps: Passages | undefined }[]) => string };
const CALCULS: Calcul[] = [
  { cle: "renseignes", libelle: "Compter les renseignés", f: (v) => `${v.filter(Boolean).length} renseignés` },
  { cle: "vides", libelle: "Compter les vides", f: (v) => `${v.filter((x) => !x).length} vides` },
  { cle: "pct", libelle: "Pourcentage renseigné", f: (v) => `${v.length ? Math.round((v.filter(Boolean).length / v.length) * 100) : 0} % renseignés` },
  { cle: "uniques", libelle: "Compter les valeurs différentes", f: (v) => `${new Set(v.filter(Boolean)).size} différentes` },
  {
    cle: "proche",
    libelle: "Le plus proche",
    f: (_v, col, l) => {
      const n = l.map(({ t, ps }) => col.tri(t, ps)).filter((x): x is number => typeof x === "number" && x < 99999);
      if (!n.length) return "Aucun";
      const auj = num(aujourdhui());
      const m = col.cle === "der" ? -Math.min(...n) : Math.min(...n);
      return `Le plus proche : ${relatif(new Date(m * 86_400_000).toISOString().slice(0, 10), new Date(auj * 86_400_000).toISOString().slice(0, 10))}`;
    },
  },
];
const calculsDe = (col: Colonne) => CALCULS.filter((c) => c.cle !== "proche" || col.date);

function Force({ v }: { v: Vigilance | null | undefined }) {
  const n = v ? NIVEAUX[v] : null;
  return (
    <span className="dat-force">
      <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
        <rect x={4} y={4} width={8} height={8} rx={3} fill={n?.couleur ?? "#77797C"} />
      </svg>
      <span className="dat-td-texte">{n?.libelle ?? "Non renseignée"}</span>
    </span>
  );
}

/* l'avatar sans photo d'Attio (UserPlaceholder, clair et sombre) */
function Avatar({ taille = 16 }: { taille?: number }) {
  return (
    <span className="dat-avatar-ph" aria-hidden="true">
      <DatIcone nom="UserPlaceholderLight" taille={taille} className="dat-clair" />
      <DatIcone nom="UserPlaceholderDark" taille={taille} className="dat-sombre" />
    </span>
  );
}

/* un menu sous son bouton (Échap ou un clic dehors le ferme) */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, boite] as const;
}

function Menu({ declencheur, libelle, children, droite, className, titre }: { declencheur: React.ReactNode; libelle: string; children: (fermer: () => void) => React.ReactNode; droite?: boolean; className?: string; titre?: string }) {
  const [ouvert, setOuvert, boite] = useMenu();
  return (
    <div className="dat-menu-boite" ref={boite}>
      <button type="button" className={className ?? "dat-bouton"} aria-haspopup="menu" aria-expanded={ouvert} aria-label={titre} title={titre} onClick={() => setOuvert((o) => !o)}>
        {declencheur}
      </button>
      {ouvert ? (
        <div className="dat-menu" role="menu" aria-label={libelle} style={droite ? { left: "auto", right: 0 } : undefined}>
          {children(() => setOuvert(false))}
        </div>
      ) : null}
    </div>
  );
}

/* « Collapse sidebar » d'Attio : le volet des pages de la coquille se replie (ce navigateur) */
function useReplie(): [boolean, () => void] {
  const replie = useLocal<boolean>(CLE_REPLIE, false);
  useEffect(() => {
    const html = document.documentElement;
    if (replie) html.dataset.datReplie = "";
    else delete html.dataset.datReplie;
    return () => {
      delete html.dataset.datReplie;
    };
  }, [replie]);
  return [replie, () => ecrireLocal(CLE_REPLIE, replie ? null : true)];
}

export default function Annuaire() {
  const { source, pret, erreur: erreurBase, liste, tableau, premier, demander, demanderTous } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const auj = useMemo(() => aujourdhui(), []);
  const [replie, replier] = useReplie();

  const entrepriseId = params.get("entreprise");

  /* en base réelle, l'annuaire se lit dans un tableau de chantier ; les passages, dans tous */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);
  useEffect(() => {
    if (source === "reelle" && pret) demanderTous();
  }, [source, pret, demanderTous]);

  const adresse = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString();
    return s ? `${chemin}?${s}` : chemin;
  };
  const aller = (changes: Record<string, string | null>) => routeur.replace(adresse(changes), { scroll: false });

  /* les entreprises notées à la main dans l'espace (même fenêtre de création, même stockage) */
  const brutLocales = useStockage(CLE_ENTREPRISES);
  const locales = useMemo<EntrepriseLocale[]>(() => {
    try {
      const v = JSON.parse(brutLocales ?? "[]") as unknown;
      return Array.isArray(v) ? (v as EntrepriseLocale[]) : [];
    } catch {
      return [];
    }
  }, [brutLocales]);

  /* l'annuaire vaut pour toute l'entreprise : celui du premier tableau lu, complété des tiers des
     autres (l'exemple en compte dans chaque chantier), puis les fiches notées à la main */
  const tiers = (() => {
    const m = new Map<string, Tiers>();
    for (const t of premier?.tiers ?? []) m.set(t.id, t);
    for (const c of liste) for (const t of tableau(c.id)?.tiers ?? []) if (!m.has(t.id)) m.set(t.id, t);
    for (const e of locales) m.set(`loc:${e.id}`, versTiers(e));
    return [...m.values()];
  })();
  /* les passages de chaque entreprise, tous chantiers lus */
  const passages = (() => {
    const m = new Map<string, Passages>();
    for (const c of liste) {
      const tb = tableau(c.id);
      if (!tb) continue;
      for (const p of tb.passages) {
        if (!p.tiers_id || p.statut === "annule") continue;
        const e = m.get(p.tiers_id) ?? { prochain: null, dernier: null, tous: [] };
        e.tous.push({ p, c });
        if (p.statut === "prevu" && jj(p.fin) >= auj && (!e.prochain || p.debut < e.prochain.p.debut)) e.prochain = { p, c };
        if (jj(p.debut) <= auj && (!e.dernier || p.debut > e.dernier.p.debut)) e.dernier = { p, c };
        m.set(p.tiers_id, e);
      }
    }
    return m;
  })();

  const groupes = (() => {
    const l = GROUPES.filter((g) => tiers.some((t) => dans(t, g)));
    return tiers.some((t) => dans(t, AUTRES)) ? [...l, AUTRES] : l;
  })();
  const groupe = groupes.find((g) => g.cle === params.get("role")) ?? null;
  const q = params.get("q") ?? "";
  const veille = params.get("veille") === "1";
  const triParam = params.get("tri");
  const colTri = COLONNES.find((c) => c.cle === triParam) ?? null;
  const desc = params.get("sens") === "desc";
  const parRole = params.get("groupe") === "role";
  /* les colonnes affichées (« View settings », « Add column ») et la colonne figée (l'épingle) */
  const colsParam = params.get("cols");
  const cles = colsParam !== null ? colsParam.split(",").filter((c) => COLONNES.some((x) => x.cle === c)) : PAR_DEFAUT;
  const epingle = params.get("epingle");
  const colonnes = (() => {
    const l = cles.map((c) => COLONNES.find((x) => x.cle === c)!).filter(Boolean);
    const e = l.find((c) => c.cle === epingle);
    return e ? [e, ...l.filter((c) => c !== e)] : l;
  })();
  const cachees = COLONNES.filter((c) => !cles.includes(c.cle));
  const ecrireCols = (l: string[]) => aller({ cols: l.join(",") === PAR_DEFAUT.join(",") ? null : l.join(",") || "aucune" });
  const calcParam = params.get("calc") ?? "";
  const calculs = Object.fromEntries(calcParam.split(",").filter(Boolean).map((x) => x.split(":") as [string, string]));
  const poserCalcul = (col: string, f: string | null) => {
    const m = { ...calculs };
    if (f) m[col] = f;
    else delete m[col];
    aller({ calc: Object.entries(m).map(([k, v]) => `${k}:${v}`).join(",") || null });
  };

  const visibles = (() => {
    const m = sansAccent(q.trim());
    const l = tiers.filter((t) => (!groupe || dans(t, groupe)) && (!veille || (t.vigilance && A_SURVEILLER.includes(t.vigilance))) && (!m || sansAccent(t.nom).includes(m) || sansAccent(t.commune ?? "").includes(m)));
    const parNom = (a: Tiers, b: Tiers) => a.nom.localeCompare(b.nom, "fr");
    const sens = desc ? -1 : 1;
    const cmp = colTri
      ? (a: Tiers, b: Tiers) => {
          const x = colTri.tri(a, passages.get(a.id));
          const y = colTri.tri(b, passages.get(b.id));
          return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * sens || parNom(a, b);
        }
      : (a: Tiers, b: Tiers) => parNom(a, b) * sens;
    const triees = l.sort(cmp);
    return parRole ? [...groupes.flatMap((g) => triees.filter((t) => rangement(t).cle === g.cle))] : triees;
  })();

  const enLecture = source === "reelle" && (!pret || (!premier && liste.length > 0));
  const sansChantier = source === "reelle" && pret && liste.length === 0 && !locales.length;

  const [saisie, setSaisie] = useState(q);
  const chercher = (v: string) => {
    setSaisie(v);
    aller({ q: v.trim() || null });
  };

  /* ——— sélection (les cases d'Attio) et sa barre d'actions ——— */
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const choisis = visibles.filter((t) => selection.has(t.id));
  const basculerSel = (id: string) =>
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const tousCoches = visibles.length > 0 && choisis.length === visibles.length;
  const { estEpingle, basculer: epingler } = useFavoris();

  /* « Import / Export » : la liste affichée en CSV, colonnes et filtres compris */
  const exporter = (lignes: Tiers[], nom: string) => {
    exporterCsv(
      nom,
      ["Entreprise", ...colonnes.map((c) => c.libelle), "Courriel", "Téléphone"],
      lignes.map((t) => [t.nom, ...colonnes.map((c) => c.valeur(t, passages.get(t.id), auj) ?? ""), t.email ?? "", t.telephone ?? ""]),
    );
    toast(`${pluriel(lignes.length, "entreprise")} exportée${lignes.length > 1 ? "s" : ""} en CSV.`, "vert");
  };
  const courrielsChoisis = choisis.map((t) => t.email).filter((x): x is string => !!x);

  /* ——— « + New Person » : la fenêtre de création des Entreprises de l'espace ——— */
  const [nouvelle, setNouvelle] = useState<{ nom: string; type: string; ville: string; telephone: string; email: string } | null>(null);
  const creer = () => {
    if (!nouvelle?.nom.trim()) return;
    /* 03/11/2026 — le bouton n'est pas dans un formulaire : le contrôle du
       navigateur (type="email") ne jouait jamais, « abc » passait */
    const courriel = nouvelle.email.trim();
    if (courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) {
      toast(`« ${courriel} » n'est pas une adresse de courriel.`, "rouge");
      return;
    }
    const tel = nouvelle.telephone.trim();
    if (tel && !/^[+\d][\d\s.()-]{5,}$/.test(tel)) {
      toast(`« ${tel} » n'est pas un numéro de téléphone.`, "rouge");
      return;
    }
    const fiche: EntrepriseLocale = { id: nid(), cree: new Date().toISOString(), nom: nouvelle.nom.trim(), type: nouvelle.type.trim(), ville: nouvelle.ville.trim(), telephone: nouvelle.telephone.trim(), email: nouvelle.email.trim() };
    ecrireStockage(CLE_ENTREPRISES, JSON.stringify([fiche, ...locales]));
    setNouvelle(null);
    toast(`${fiche.nom} est ajoutée à l'annuaire (fiche gardée dans ce navigateur, comme les Entreprises de l'espace).`, "vert");
  };

  const fiche = entrepriseId ? (tiers.find((x) => x.id === entrepriseId) ?? null) : null;
  const colsGrille = `250px ${colonnes.map((c) => `${c.largeur}px`).join(" ")} 250px`;

  return (
    <div className="dat">
      <header className="dat-entete">
        <button type="button" className="dat-icone-bouton" aria-label={replie ? "Déplier le volet des pages" : "Replier le volet des pages"} title={replie ? "Déplier le volet des pages" : "Replier le volet des pages"} aria-pressed={replie} onClick={replier}>
          <DatIcone nom={replie ? "PanelArrowRight" : "PanelArrowLeft"} />
        </button>
        <span className="dat-objet" aria-hidden="true">
          <svg width={10} height={10} viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="5" r="3" />
            <path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5z" />
          </svg>
        </span>
        <nav className="dat-fil" aria-label="Fil d'Ariane">
          {entrepriseId ? (
            <>
              <Link href={adresse({ entreprise: null, onglet: null })}>Annuaire</Link>
              <span className="dat-fil-sep">/</span>
              <span className="dat-fil-nom">{fiche?.nom ?? "Entreprise"}</span>
            </>
          ) : (
            <span>Annuaire</span>
          )}
        </nav>
      </header>
      <h1 className="v2-sr">{fiche ? fiche.nom : "Annuaire"}</h1>

      {entrepriseId ? (
        fiche ? (
          <Fiche t={fiche} liste={liste} tableau={tableau} passages={passages.get(fiche.id) ?? null} auj={auj} onglet={params.get("onglet")} adresse={adresse} epingle={estEpingle("btp_tiers", fiche.id)} onEpingler={() => epingler({ type: "btp_tiers", id: fiche.id, titre: fiche.nom, href: `${BASE}/annuaire?entreprise=${encodeURIComponent(fiche.id)}` })} />
        ) : (
          <p className="dat-vide">{erreurBase ? `La base réelle n'a pas répondu. ${erreurBase}` : enLecture ? "Lecture de l'annuaire…" : "Cette entreprise n'est pas dans l'annuaire."}</p>
        )
      ) : (
        <>
          <div className="dat-barre">
            <Menu
              libelle="Vues"
              declencheur={
                <>
                  <DatIcone nom="TableViewColor" />
                  {groupe ? groupe.libelle : "Toutes les entreprises"}
                  <DatIcone nom="ChevronDown" className="dat-chevron" />
                </>
              }
            >
              {(fermer) => (
                <>
                  <div className="dat-menu-titre">Vues</div>
                  {[null, ...groupes].map((g) => (
                    <Link key={g?.cle ?? "tous"} href={adresse({ role: g?.cle ?? null })} role="menuitemradio" aria-checked={(groupe?.cle ?? null) === (g?.cle ?? null)} className="dat-menu-option" scroll={false} onClick={fermer}>
                      {g ? g.libelle : "Toutes les entreprises"}
                    </Link>
                  ))}
                </>
              )}
            </Menu>
            <Menu
              libelle="Réglages de la vue"
              declencheur={
                <>
                  <DatIcone nom="Controls" />
                  Réglages de la vue
                  <DatIcone nom="ChevronDown" className="dat-chevron" />
                </>
              }
            >
              {() => (
                <>
                  <div className="dat-menu-titre">Colonnes affichées</div>
                  {COLONNES.map((c) => (
                    <button key={c.cle} type="button" role="menuitemcheckbox" aria-checked={cles.includes(c.cle)} className="dat-menu-option" onClick={() => ecrireCols(cles.includes(c.cle) ? cles.filter((x) => x !== c.cle) : [...cles, c.cle])}>
                      <DatIcone nom={c.icone} />
                      {c.libelle}
                    </button>
                  ))}
                  <div className="dat-menu-sep" />
                  <div className="dat-menu-titre">Regrouper</div>
                  <button type="button" role="menuitemradio" aria-checked={!parRole} className="dat-menu-option" onClick={() => aller({ groupe: null })}>
                    Sans regroupement
                  </button>
                  <button type="button" role="menuitemradio" aria-checked={parRole} className="dat-menu-option" onClick={() => aller({ groupe: "role" })}>
                    Par rôle
                  </button>
                  {colsParam !== null || parRole || epingle || calcParam ? (
                    <>
                      <div className="dat-menu-sep" />
                      <button type="button" className="dat-menu-option" onClick={() => aller({ cols: null, groupe: null, epingle: null, calc: null })}>
                        Revenir à la vue d&apos;origine
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </Menu>
            <span className="dat-pousse" />
            <Menu
              libelle="Exporter"
              droite
              declencheur={
                <>
                  <DatIcone nom="ImportExport" />
                  Exporter
                  <DatIcone nom="ChevronDown" className="dat-chevron" />
                </>
              }
            >
              {(fermer) => (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="dat-menu-option"
                    disabled={!visibles.length}
                    onClick={() => {
                      fermer();
                      exporter(visibles, "annuaire");
                    }}
                  >
                    <DatIcone nom="Download" />
                    Exporter la liste en CSV ({visibles.length})
                  </button>
                  <div className="dat-menu-titre">Pas d&apos;import : l&apos;annuaire se remplit avec vos chantiers.</div>
                </>
              )}
            </Menu>
            <button type="button" className="dat-bouton dat-bouton-bleu" onClick={() => setNouvelle({ nom: "", type: "", ville: "", telephone: "", email: "" })}>
              <DatIcone nom="Plus" />
              Nouvelle entreprise
            </button>
          </div>

          <div className="dat-barre">
            <Menu
              libelle="Trier par"
              className="dat-bouton dat-bouton--tri"
              declencheur={
                <>
                  <DatIcone nom="SortDescending" style={{ opacity: 0.63 }} />
                  <span className="dat-bouton-faible">Trié par</span> {colTri ? colTri.libelle : "Nom"}
                </>
              }
            >
              {(fermer) => (
                <>
                  {[{ cle: null as string | null, libelle: "Nom" }, ...COLONNES.map((c) => ({ cle: c.cle as string | null, libelle: c.libelle }))].map((o) => (
                    <button
                      key={o.cle ?? "nom"}
                      type="button"
                      role="menuitemradio"
                      aria-checked={(colTri?.cle ?? null) === o.cle}
                      className="dat-menu-option"
                      onClick={() => {
                        fermer();
                        aller({ tri: o.cle, sens: null });
                      }}
                    >
                      {o.libelle}
                    </button>
                  ))}
                  <div className="dat-menu-sep" />
                  <button type="button" role="menuitemcheckbox" aria-checked={desc} className="dat-menu-option" onClick={() => aller({ sens: desc ? null : "desc" })}>
                    Ordre inverse
                  </button>
                </>
              )}
            </Menu>
            <span className="dat-sep-v" aria-hidden="true" />
            <Menu
              libelle="Filtrer"
              className={`dat-bouton dat-bouton--filtre${veille || q ? " dat-actif" : ""}`}
              declencheur={
                <>
                  <DatIcone nom="Filter" />
                  {veille || q ? `Filtré${veille && q ? " (2)" : ""}` : "Filtrer"}
                </>
              }
            >
              {() => (
                <>
                  <input className="dat-menu-champ" type="search" placeholder="Nom ou commune" aria-label="Rechercher une entreprise par nom ou commune" value={saisie} onChange={(e) => chercher(e.target.value)} autoFocus />
                  <Link href={adresse({ veille: veille ? null : "1" })} role="menuitemcheckbox" aria-checked={veille} className="dat-menu-option" scroll={false}>
                    <DatIcone nom="Handshake" />À surveiller (vigilance)
                  </Link>
                </>
              )}
            </Menu>
          </div>

          {erreurBase ? (
            <p className="dat-vide" role="alert">
              La base réelle n&apos;a pas répondu. {erreurBase}
            </p>
          ) : enLecture ? (
            <p className="dat-vide">Lecture de l&apos;annuaire…</p>
          ) : sansChantier ? (
            <p className="dat-vide">L&apos;annuaire se lit avec vos chantiers : créez d&apos;abord un chantier.</p>
          ) : !tiers.length ? (
            <p className="dat-vide">L&apos;annuaire se remplit avec vos chantiers : maîtres d&apos;ouvrage, sous-traitants et fournisseurs.</p>
          ) : (
            <div className="dat-grille-boite">
              <div className="dat-grille" role="grid" aria-label="Entreprises" aria-rowcount={visibles.length + 1} style={{ gridTemplateColumns: colsGrille, gridTemplateRows: `40px repeat(${(visibles.length || 1) + (parRole ? new Set(visibles.map((t) => rangement(t).cle)).size : 0)}, 36px) 1fr 37px` }}>
                <div className="dat-rangee" role="row">
                  <div className="dat-th dat-fige" role="columnheader">
                    <input type="checkbox" className="dat-case" aria-label="Tout sélectionner" checked={tousCoches} onChange={() => setSelection(tousCoches ? new Set() : new Set(visibles.map((t) => t.id)))} />
                    <span className="dat-th-texte">Entreprise</span>
                    <button type="button" className="dat-th-bouton dat-th-plus" aria-label="Nouvelle entreprise" title="Nouvelle entreprise" onClick={() => setNouvelle({ nom: "", type: "", ville: "", telephone: "", email: "" })}>
                      <DatIcone nom="Plus" />
                    </button>
                  </div>
                  {colonnes.map((c) => (
                    <div key={c.cle} className={`dat-th${c.cle === epingle ? " dat-fige dat-fige-2" : ""}`} role="columnheader" aria-sort={colTri?.cle === c.cle ? (desc ? "descending" : "ascending") : undefined}>
                      <DatIcone nom={c.icone} />
                      <span className="dat-th-texte">{c.libelle}</span>
                      <button type="button" className="dat-th-bouton" data-actif={c.cle === epingle ? "" : undefined} aria-pressed={c.cle === epingle} aria-label={c.cle === epingle ? `Défiger la colonne ${c.libelle}` : `Figer la colonne ${c.libelle}`} title={c.cle === epingle ? "Défiger la colonne" : "Figer la colonne à gauche"} onClick={() => aller({ epingle: c.cle === epingle ? null : c.cle })}>
                        <DatIcone nom="Pin" />
                      </button>
                      <button
                        type="button"
                        className="dat-th-bouton"
                        data-actif={colTri?.cle === c.cle ? "" : undefined}
                        aria-label={`Trier sur ${c.libelle}`}
                        title={colTri?.cle === c.cle ? (desc ? "Trier dans l'ordre" : "Trier dans l'ordre inverse") : "Trier sur cette colonne"}
                        onClick={() => aller({ tri: c.cle, sens: colTri?.cle === c.cle && !desc ? "desc" : null })}
                      >
                        <DatIcone nom="Bolt" />
                      </button>
                    </div>
                  ))}
                  <div className="dat-th dat-th-ajout" role="columnheader">
                    <Menu
                      libelle="Ajouter une colonne"
                      className="dat-ajout"
                      declencheur={
                        <>
                          <DatIcone nom="Plus" />
                          Ajouter une colonne
                        </>
                      }
                    >
                      {(fermer) =>
                        cachees.length ? (
                          cachees.map((c) => (
                            <button
                              key={c.cle}
                              type="button"
                              role="menuitem"
                              className="dat-menu-option"
                              onClick={() => {
                                fermer();
                                ecrireCols([...cles, c.cle]);
                              }}
                            >
                              <DatIcone nom={c.icone} />
                              {c.libelle}
                            </button>
                          ))
                        ) : (
                          <div className="dat-menu-titre">Toutes les colonnes sont affichées.</div>
                        )
                      }
                    </Menu>
                  </div>
                </div>
                {visibles.map((t, i) => {
                  const ps = passages.get(t.id);
                  const nouveauGroupe = parRole && (i === 0 || rangement(visibles[i - 1]).cle !== rangement(t).cle);
                  return [
                    nouveauGroupe ? (
                      <div key={`g-${rangement(t).cle}`} className="dat-rangee" role="row">
                        <div className="dat-td dat-groupe" role="rowheader" style={{ gridColumn: "1 / -1" }}>
                          <span className="dat-groupe-texte">
                            {rangement(t).libelle}
                            <span className="dat-compteur">{visibles.filter((x) => rangement(x).cle === rangement(t).cle).length}</span>
                          </span>
                        </div>
                      </div>
                    ) : null,
                    <div key={t.id} className="dat-rangee" role="row" aria-selected={selection.has(t.id)}>
                      <div className="dat-td dat-fige" role="gridcell">
                        <input type="checkbox" className="dat-case" aria-label={`Sélectionner ${t.nom}`} checked={selection.has(t.id)} onChange={() => basculerSel(t.id)} />
                        <Link href={adresse({ entreprise: t.id })} className="dat-personne">
                          <Avatar />
                          <span>{t.nom}</span>
                        </Link>
                      </div>
                      {colonnes.map((c) => {
                        const v = c.valeur(t, ps, auj);
                        return (
                          <div key={c.cle} className={`dat-td${c.cle === epingle ? " dat-fige dat-fige-2" : ""}`} role="gridcell" data-calcule={c.calcule ? "" : undefined} data-vide={v || c.cle === "vig" ? undefined : ""}>
                            {c.cle === "vig" ? (
                              <Force v={t.vigilance} />
                            ) : c.cle === "mail" && v ? (
                              <a className="dat-lien dat-td-texte" href={`mailto:${v}`}>
                                {v}
                              </a>
                            ) : c.cle === "tel" && v && t.telephone ? (
                              <a className="dat-lien dat-td-texte" href={`tel:${t.telephone.replace(/\s/g, "")}`}>
                                {v}
                              </a>
                            ) : (
                              <span className="dat-td-texte" title={c.cle === "der" && ps?.dernier ? `${ps.dernier.p.tache ?? "Passage"}, ${ps.dernier.c.nom}` : c.cle === "pro" && ps?.prochain ? `${ps.prochain.p.tache ?? "Passage"}, ${ps.prochain.c.nom}` : undefined}>
                                {v ?? VIDES[c.cle]}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      <div className="dat-td dat-td-reste" role="gridcell" />
                    </div>,
                  ];
                })}
                {!visibles.length ? (
                  <div className="dat-rangee" role="row">
                    <div className="dat-td" role="gridcell" data-vide="" style={{ gridColumn: "1 / -1" }}>
                      Aucune entreprise ne correspond.
                    </div>
                  </div>
                ) : null}
                <div className="dat-rangee dat-reste" aria-hidden="true">
                  <div className="dat-fige" />
                  {colonnes.map((c) => (
                    <div key={c.cle} className={c.cle === epingle ? "dat-fige dat-fige-2" : undefined} />
                  ))}
                  <div />
                </div>
                <div className="dat-pied" role="row">
                  <div role="gridcell" className="dat-fige">
                    <strong>{visibles.length}</strong>&nbsp;<span className="dat-pied-vide">{visibles.length > 1 ? "entreprises" : "entreprise"}</span>
                  </div>
                  {colonnes.map((c) => {
                    const choix = CALCULS.find((x) => x.cle === calculs[c.cle]);
                    const lignes = visibles.map((t) => ({ t, ps: passages.get(t.id) }));
                    return (
                      <div key={c.cle} role="gridcell" className={c.cle === epingle ? "dat-fige dat-fige-2" : undefined}>
                        <Menu
                          libelle={`Calcul sur ${c.libelle}`}
                          droite
                          className="dat-ajout"
                          declencheur={
                            choix ? (
                              <span className="dat-calcul">{choix.f(lignes.map(({ t, ps }) => c.valeur(t, ps, auj)), c, lignes)}</span>
                            ) : (
                              <>
                                <DatIcone nom="Plus" />
                                Ajouter un calcul
                              </>
                            )
                          }
                        >
                          {(fermer) => (
                            <>
                              {calculsDe(c).map((x) => (
                                <button
                                  key={x.cle}
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={choix?.cle === x.cle}
                                  className="dat-menu-option"
                                  onClick={() => {
                                    fermer();
                                    poserCalcul(c.cle, x.cle);
                                  }}
                                >
                                  {x.libelle}
                                </button>
                              ))}
                              {choix ? (
                                <button
                                  type="button"
                                  className="dat-menu-option"
                                  onClick={() => {
                                    fermer();
                                    poserCalcul(c.cle, null);
                                  }}
                                >
                                  Retirer le calcul
                                </button>
                              ) : null}
                            </>
                          )}
                        </Menu>
                      </div>
                    );
                  })}
                  <div role="gridcell" />
                </div>
              </div>
            </div>
          )}

          {choisis.length ? (
            <div className="dat-selection" role="toolbar" aria-label="Actions sur la sélection">
              <span className="dat-selection-nb">{pluriel(choisis.length, "sélectionnée")}</span>
              <button type="button" className="dat-bouton" onClick={() => exporter(choisis, "annuaire-selection")}>
                <DatIcone nom="Download" />
                Exporter
              </button>
              <button
                type="button"
                className="dat-bouton"
                disabled={!courrielsChoisis.length}
                onClick={async () => {
                  const ok = await copier(courrielsChoisis.join(", "));
                  toast(ok ? `${pluriel(courrielsChoisis.length, "courriel")} copié${courrielsChoisis.length > 1 ? "s" : ""}.` : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
                }}
              >
                <DatIcone nom="Copy" />
                Copier les courriels
              </button>
              <a className="dat-bouton" href={courrielsChoisis.length ? `mailto:?bcc=${encodeURIComponent(courrielsChoisis.join(","))}` : undefined} aria-disabled={courrielsChoisis.length ? undefined : "true"} title="Ouvre votre messagerie, les destinataires en copie cachée : rien ne part d'ici">
                <DatIcone nom="Email" />
                Écrire à tous
              </a>
              <button
                type="button"
                className="dat-bouton"
                onClick={() => {
                  for (const t of choisis) if (!estEpingle("btp_tiers", t.id)) epingler({ type: "btp_tiers", id: t.id, titre: t.nom, href: `${BASE}/annuaire?entreprise=${encodeURIComponent(t.id)}` });
                  toast(`${pluriel(choisis.length, "entreprise")} épinglée${choisis.length > 1 ? "s" : ""} dans la vue d'ensemble.`, "vert");
                }}
              >
                <DatIcone nom="Star" />
                Épingler
              </button>
              <button type="button" className="dat-icone-bouton" aria-label="Vider la sélection" title="Vider la sélection" onClick={() => setSelection(new Set())}>
                <DatIcone nom="Cross" />
              </button>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={!!nouvelle} onOpenChange={(o) => !o && setNouvelle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <DatIcone nom="Company" taille={18} />
            </DialogIcone>
            <DialogTitle>Nouvelle entreprise</DialogTitle>
            <DialogDescription>La fiche est gardée dans ce navigateur, avec les Entreprises de l&apos;espace : l&apos;annuaire des chantiers, lui, se remplit avec vos marchés et vos devis.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {nouvelle ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Nom
                  <input className="rv-champ" required maxLength={120} value={nouvelle.nom} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} autoFocus />
                </label>
                <label className="rv-libelle">
                  Client, fournisseur, partenaire…
                  <input className="rv-champ" maxLength={80} value={nouvelle.type} onChange={(e) => setNouvelle({ ...nouvelle, type: e.target.value })} />
                </label>
                <label className="rv-libelle">
                  Commune
                  <input className="rv-champ" maxLength={80} value={nouvelle.ville} onChange={(e) => setNouvelle({ ...nouvelle, ville: e.target.value })} />
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Téléphone
                    <input className="rv-champ" type="tel" maxLength={30} value={nouvelle.telephone} onChange={(e) => setNouvelle({ ...nouvelle, telephone: e.target.value })} />
                  </label>
                  <label className="rv-libelle">
                    Courriel
                    <input className="rv-champ" type="email" maxLength={120} value={nouvelle.email} onChange={(e) => setNouvelle({ ...nouvelle, email: e.target.value })} />
                  </label>
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouvelle?.nom.trim()} onClick={creer}>
              Ajouter l&apos;entreprise
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════ la fiche d'une entreprise : la fiche d'un contact d'Attio ══════ */

type LigneChantier = { c: Chantier; mentions: string[] };
type Onglet = "ensemble" | "activite" | "courriels" | "appels" | "chantiers" | "notes" | "taches" | "factures";
const ONGLETS: Onglet[] = ["ensemble", "activite", "courriels", "appels", "chantiers", "notes", "taches", "factures"];
type EvenementCanal = { id: string; le: string; quoi: string; chantier: Chantier; passage: Passage };

function Fiche({
  t,
  liste,
  tableau,
  passages,
  auj,
  onglet: ongletParam,
  adresse,
  epingle,
  onEpingler,
}: {
  t: Tiers;
  liste: Chantier[];
  tableau: ReturnType<typeof useDaliro>["tableau"];
  passages: Passages | null;
  auj: string;
  onglet: string | null;
  adresse: (c: Record<string, string | null>) => string;
  epingle: boolean;
  onEpingler: () => void;
}) {
  const toast = useToast();
  const [tout, setTout] = useState(false);
  const onglet: Onglet = ONGLETS.includes(ongletParam as Onglet) ? (ongletParam as Onglet) : "ensemble";
  const local = useLocal<FicheLocale>(CLE_FICHE(t.id), FICHE_VIDE);
  const ecrire = (f: FicheLocale) => ecrireLocal(CLE_FICHE(t.id), f);
  const notes = local.notes ?? [];
  const taches = local.taches ?? [];
  const [description, setDescription] = useState<string | null>(null);
  const [redaction, setRedaction] = useState<{ titre: string; texte: string } | null>(null);
  const [nouvelleTache, setNouvelleTache] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);

  /* les chantiers où elle intervient : ses rôles au chantier, ses lots, ses passages */
  const chantiers = useMemo<LigneChantier[]>(() => {
    const l: LigneChantier[] = [];
    for (const c of liste) {
      const m: string[] = [];
      if (c.maitre_ouvrage_id === t.id) m.push("Maître d'ouvrage");
      if (c.maitre_oeuvre_id === t.id) m.push("Maître d'œuvre");
      if (c.donneur_ordre_id === t.id) m.push("Donneur d'ordre");
      const tb = tableau(c.id);
      if (tb) {
        for (const lot of tb.lots.filter((x) => x.tiers_id === t.id)) m.push(`lot ${lot.code} — ${lot.libelle} (${STATUTS_LOT[lot.statut]})`);
        const n = tb.passages.filter((p) => p.tiers_id === t.id && p.statut !== "annule").length;
        if (n) m.push(`${pluriel(n, "passage")} au planning`);
      }
      if (m.length) l.push({ c, mentions: m });
    }
    return l;
  }, [liste, tableau, t.id]);
  /* les passages : les prochains d'abord, puis les passés (du plus récent) */
  const tous = useMemo(() => {
    const l = [...(passages?.tous ?? [])];
    const avenir = l.filter(({ p }) => jj(p.fin) >= auj).sort((a, b) => a.p.debut.localeCompare(b.p.debut));
    const passes = l.filter(({ p }) => jj(p.fin) < auj).sort((a, b) => b.p.debut.localeCompare(a.p.debut));
    return [...avenir, ...passes];
  }, [passages, auj]);
  /* les demandes et réponses J-2 de ses passages, par canal (« Emails », « Calls ») */
  const evenements = useMemo(() => {
    const l: (EvenementCanal & { canal: string })[] = [];
    for (const { p, c } of passages?.tous ?? [])
      for (const e of p.confirmations ?? [])
        l.push({ id: e.id, le: e.survenu_le, canal: e.canal ?? "", chantier: c, passage: p, quoi: e.evenement === "demandee" ? "Confirmation demandée" : e.evenement === "confirmee" ? "Passage confirmé" : e.evenement === "declinee" ? "Passage décliné" : "Sans réponse" });
    return l.sort((a, b) => b.le.localeCompare(a.le));
  }, [passages]);
  const courriels = evenements.filter((e) => e.canal === "email");
  const appels = evenements.filter((e) => e.canal === "telephone" || e.canal === "téléphone" || e.canal === "appel");
  /* ses factures rattachées (« Files ») */
  const factures = useMemo(() => {
    const l: { f: FactureChantier; c: Chantier }[] = [];
    for (const c of liste) for (const f of tableau(c.id)?.factures ?? []) if (f.statut === "rattachee" && (f.fournisseur_id === t.id || (!!t.siren && f.fournisseur_siren === t.siren))) l.push({ f, c });
    return l.sort((a, b) => (b.f.date_emission ?? "").localeCompare(a.f.date_emission ?? ""));
  }, [liste, tableau, t.id, t.siren]);

  const vigilance = t.vigilance ?? null;
  const prochain = passages?.prochain ?? null;
  const lien = (o: Onglet) => adresse({ onglet: o === "ensemble" ? null : o });
  const intervenant = t.roles.includes("sous_traitant") || t.roles.includes("autre_titulaire") || tous.length > 0;
  const detail = (icone: NomDatIcone, libelle: string, valeur: React.ReactNode, vide?: boolean) => (
    <div className="dat-detail" key={libelle}>
      <dt>
        <DatIcone nom={icone} />
        <span className="dat-dt-texte">{libelle}</span>
      </dt>
      <dd data-vide={vide ? "" : undefined}>{valeur}</dd>
    </div>
  );

  const garderDescription = () => {
    if (description === null) return;
    ecrire({ ...local, description: description.trim() || undefined });
    setDescription(null);
  };
  const ajouterNote = () => {
    if (!redaction || !(redaction.titre.trim() || redaction.texte.trim())) return;
    ecrire({ ...local, notes: [{ id: nid(), titre: redaction.titre.trim() || "Sans titre", texte: redaction.texte.trim(), le: new Date().toISOString() }, ...notes] });
    setRedaction(null);
    toast("Note ajoutée (gardée dans ce navigateur).", "vert");
  };
  const ajouterTache = () => {
    if (!nouvelleTache?.trim()) return;
    ecrire({ ...local, taches: [...taches, { id: nid(), texte: nouvelleTache.trim(), fait: false, echeance: auj }] });
    setNouvelleTache(null);
  };
  const nouvelleNote = () => setRedaction({ titre: "", texte: "" });

  const lignePassage = ({ p, c }: { p: Passage; c: Chantier }) => {
    const conf = CONFIRMATIONS[p.confirmation];
    return (
      <li key={p.id}>
        <Link href={`${BASE}/chantiers?passage=${encodeURIComponent(p.id)}`} className="dat-ligne">
          <span className="dat-avatar" aria-hidden="true">
            {c.nom.charAt(0).toUpperCase()}
          </span>
          <span className="dat-ligne-titre">{c.nom}</span>
          <span className="dat-ligne-faible">{p.statut === "fait" ? "a noté fait" : "attend"}</span>
          <span className="dat-ligne-gris">{[p.tache, p.lot_code ? `lot ${p.lot_code}` : null, conf?.libelle].filter(Boolean).join(" · ")}</span>
          <span className="dat-ligne-fin">{majuscule(relatif(jj(p.debut) < auj && jj(p.fin) >= auj ? auj : jj(p.debut), auj))}</span>
        </Link>
      </li>
    );
  };
  const ligneEvenement = (e: EvenementCanal) => (
    <li key={e.id}>
      <Link href={`${BASE}/chantiers?passage=${encodeURIComponent(e.passage.id)}`} className="dat-ligne">
        <span className="dat-avatar" aria-hidden="true">
          {e.chantier.nom.charAt(0).toUpperCase()}
        </span>
        <span className="dat-ligne-titre">{e.quoi}</span>
        <span className="dat-ligne-gris">{[e.passage.tache, e.chantier.nom].filter(Boolean).join(" · ")}</span>
        <span className="dat-ligne-fin">{majuscule(relatif(jj(e.le), auj))}</span>
      </Link>
    </li>
  );
  const ligneChantier = ({ c, mentions }: LigneChantier) => (
    <li key={c.id}>
      <Link href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`} className="dat-ligne">
        <span className="dat-avatar" aria-hidden="true">
          {c.nom.charAt(0).toUpperCase()}
        </span>
        <span className="dat-ligne-titre">{c.nom}</span>
        <span className="dat-ligne-gris">{mentions.join(" · ")}</span>
        <span className="dat-ligne-fin">{STATUTS_CHANTIER[c.statut]?.libelle ?? c.statut}</span>
      </Link>
    </li>
  );
  const ligneNote = (n: Note) => (
    <li key={n.id} className="dat-ligne">
      <span className="dat-avatar" aria-hidden="true">
        N
      </span>
      <span className="dat-ligne-titre">{n.titre}</span>
      <span className="dat-ligne-gris">{n.texte}</span>
      <span className="dat-ligne-fin">
        {majuscule(relatif(jj(n.le), auj))}
        {aSupprimer === n.id ? (
          <button
            type="button"
            className="dat-lien-rouge"
            onClick={() => {
              ecrire({ ...local, notes: notes.filter((x) => x.id !== n.id) });
              setASupprimer(null);
            }}
          >
            Confirmer la suppression
          </button>
        ) : (
          <button type="button" className="dat-icone-bouton" aria-label={`Supprimer la note ${n.titre}`} title="Supprimer la note" onClick={() => setASupprimer(n.id)}>
            <DatIcone nom="Cross" />
          </button>
        )}
      </span>
    </li>
  );
  const ligneTache = (x: Tache) => (
    <li key={x.id} className="dat-ligne">
      <input type="checkbox" className="dat-rond" aria-label={`Fait : ${x.texte}`} checked={x.fait} onChange={() => ecrire({ ...local, taches: taches.map((y) => (y.id === x.id ? { ...y, fait: !y.fait } : y)) })} />
      <span className="dat-ligne-titre" style={x.fait ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
        @{t.nom} {x.texte}
      </span>
      <span className="dat-ligne-fin">
        {x.echeance ? (
          <span className={x.echeance <= auj && !x.fait ? "dat-echeance" : undefined}>
            <DatIcone nom="Calendar" taille={12} />
            {majuscule(relatif(x.echeance, auj))}
          </span>
        ) : null}
        <button type="button" className="dat-icone-bouton" aria-label={`Retirer la tâche ${x.texte}`} title="Retirer la tâche" onClick={() => ecrire({ ...local, taches: taches.filter((y) => y.id !== x.id) })}>
          <DatIcone nom="Cross" />
        </button>
      </span>
    </li>
  );
  const ligneFacture = ({ f, c }: { f: FactureChantier; c: Chantier }) => (
    <li key={f.id}>
      <Link href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`} className="dat-ligne">
        <DatIcone nom="Folder" />
        <span className="dat-ligne-titre">{f.facture_nature === "avoir" ? "Avoir" : "Facture"} {f.facture_numero ?? f.document_reference ?? ""}</span>
        <span className="dat-ligne-gris">{[c.nom, f.lot_code ? `lot ${f.lot_code}` : null, f.montant_ht !== null ? `${euros(f.montant_ht)} HT` : null].filter(Boolean).join(" · ")}</span>
        <span className="dat-ligne-fin">{f.date_emission ? dateFr(f.date_emission) : ""}</span>
      </Link>
    </li>
  );

  const redacteur = redaction ? (
    <div className="dat-redaction">
      <input className="dat-menu-champ" placeholder="Titre de la note" aria-label="Titre de la note" value={redaction.titre} onChange={(e) => setRedaction({ ...redaction, titre: e.target.value })} autoFocus />
      <textarea className="dat-menu-champ dat-zone" placeholder="Commencez à écrire votre note" aria-label="Texte de la note" value={redaction.texte} onChange={(e) => setRedaction({ ...redaction, texte: e.target.value })} />
      <div className="dat-redaction-pied">
        <button type="button" className="dat-bouton" onClick={() => setRedaction(null)}>
          Annuler
        </button>
        <button type="button" className="dat-bouton dat-bouton-bleu" onClick={ajouterNote}>
          Garder la note
        </button>
      </div>
    </div>
  ) : null;
  const saisieTache =
    nouvelleTache !== null ? (
      <div className="dat-redaction">
        <input
          className="dat-menu-champ"
          placeholder="Relancer pour l'attestation de vigilance"
          aria-label="Nouvelle tâche"
          value={nouvelleTache}
          autoFocus
          onChange={(e) => setNouvelleTache(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ajouterTache();
            if (e.key === "Escape") setNouvelleTache(null);
          }}
        />
        <div className="dat-redaction-pied">
          <button type="button" className="dat-bouton" onClick={() => setNouvelleTache(null)}>
            Annuler
          </button>
          <button type="button" className="dat-bouton dat-bouton-bleu" onClick={ajouterTache}>
            Ajouter, pour aujourd&apos;hui
          </button>
        </div>
      </div>
    ) : null;
  const plus = (libelle: string, action: () => void) => (
    <button type="button" className="dat-icone-bouton" aria-label={libelle} title={libelle} onClick={action}>
      <DatIcone nom="Plus" />
    </button>
  );
  const ongletLien = (o: Onglet, icone: NomDatIcone, libelle: string, n?: number) => (
    <Link href={lien(o)} scroll={false} className="dat-onglet" aria-current={onglet === o ? "page" : undefined}>
      <DatIcone nom={icone} />
      {libelle}
      {n !== undefined ? <span className="dat-compteur">{n}</span> : null}
    </Link>
  );
  const vide = (texte: string) => <p className="dat-note">{texte}</p>;
  const mailto = t.email ? `mailto:${t.email}` : undefined;
  const tel = t.telephone ? `tel:${t.telephone.replace(/\s/g, "")}` : undefined;

  return (
    <div className="dat-fiche">
      <aside className="dat-gauche" aria-label="Détails de l'entreprise">
        <div className="dat-ident">
          <Avatar taille={32} />
          <p className="dat-ident-nom">{t.nom}</p>
          <button type="button" className="dat-icone-bouton" aria-label="Modifier la description" title="Modifier la description (gardée dans ce navigateur)" onClick={() => setDescription(local.description ?? "")}>
            <DatIcone nom="Edit" />
          </button>
          <button type="button" className="dat-icone-bouton" data-actif={epingle ? "" : undefined} aria-pressed={epingle} aria-label={epingle ? "Ne plus épingler" : "Épingler"} title={epingle ? "Ne plus épingler" : "Épingler dans la vue d'ensemble"} onClick={onEpingler}>
            <DatIcone nom="Star" />
          </button>
        </div>
        <div className="dat-actions">
          <a className="dat-bouton" href={mailto} aria-disabled={mailto ? undefined : "true"}>
            <DatIcone nom="Email" />
            Écrire un courriel
          </a>
          <a className="dat-bouton" href={tel} aria-disabled={tel ? undefined : "true"} aria-label="Appeler">
            <DatIcone nom="Phone" />
            <span className="dat-bouton-texte">Appeler</span>
          </a>
          <Link className="dat-bouton" href={lien("notes")} scroll={false} onClick={nouvelleNote} aria-label="Nouvelle note">
            <DatIcone nom="NotePlus" />
            <span className="dat-bouton-texte">Nouvelle note</span>
          </Link>
          {intervenant && !t.id.startsWith("loc:") ? (
            <Link className="dat-bouton" href={`${BASE}/equipes?intervenant=${encodeURIComponent(`t:${t.id}`)}`} aria-label="Disponibilités">
              <DatIcone nom="WorkflowRun" />
              <span className="dat-bouton-texte">Disponibilités</span>
            </Link>
          ) : null}
        </div>
        <section className="dat-bloc" aria-label="Détails">
          <div className="dat-bloc-tete">
            <span>Détails de la fiche</span>
          </div>
          <dl className="dat-details">
            {detail("DataText", "Nom", t.nom)}
            {detail("At", "Courriel", t.email ? <a className="dat-lien" href={`mailto:${t.email}`}>{t.email}</a> : "Aucun courriel", !t.email)}
            {detail(
              "Text",
              "Description",
              description !== null ? (
                <input
                  className="dat-champ-ligne"
                  aria-label="Description"
                  value={description}
                  maxLength={200}
                  autoFocus
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={garderDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") garderDescription();
                    if (e.key === "Escape") setDescription(null);
                  }}
                />
              ) : (
                <button type="button" className="dat-valeur-bouton" onClick={() => setDescription(local.description ?? "")}>
                  {local.description ?? "Ajouter une description"}
                </button>
              ),
              !local.description && description === null,
            )}
            {detail("Phone", "Téléphone", tel ? <a className="dat-lien" href={tel}>{telephone(t.telephone!)}</a> : "Aucun téléphone", !tel)}
            {detail("Briefcase", "Rôles", libelleRoles(t) || "Aucun rôle", !libelleRoles(t))}
            {detail("Location", "Commune", t.commune ?? "Aucune commune", !t.commune)}
            {tout ? (
              <>
                {detail("Hashtag", "SIREN", t.siren ?? "Aucun SIREN", !t.siren)}
                {detail("Tag", "Corps d'état", t.corps_etat.length ? t.corps_etat.map(majuscule).join(", ") : "Aucun", !t.corps_etat.length)}
                {detail("Location", "Départements", t.departements.length ? t.departements.join(", ") : "Aucun", !t.departements.length)}
                {detail("Calendar", "Confirmation J-2", t.confirmer_passages ? `Demandée${t.canal ? ` par ${CANAUX[t.canal] ?? t.canal}` : ""}` : "Non demandée")}
                {detail("Handshake", "Attestation", t.vigilance_attestation_le ? `Du ${dateFr(t.vigilance_attestation_le)}` : "Aucune", !t.vigilance_attestation_le)}
              </>
            ) : null}
          </dl>
          <button type="button" className="dat-voir" onClick={() => setTout((v) => !v)} aria-expanded={tout}>
            {tout ? "Voir moins de valeurs" : "Voir toutes les valeurs"}
          </button>
        </section>
        <section className="dat-bloc" aria-label="Chantiers">
          <div className="dat-bloc-tete">
            <span>Chantiers</span>
            <Link href={lien("chantiers")} scroll={false}>
              Tout voir
            </Link>
          </div>
          {chantiers.length ? (
            <div className="dat-pastilles">
              {chantiers.map(({ c }) => (
                <Link key={c.id} href={`${BASE}/chantiers/${encodeURIComponent(c.id)}`}>
                  {c.nom}
                </Link>
              ))}
            </div>
          ) : (
            <p className="dat-vide-texte">Cette entreprise n&apos;intervient sur aucun chantier</p>
          )}
        </section>
      </aside>

      <div className="dat-droite">
        <nav className="dat-onglets" aria-label="Onglets de la fiche">
          {ongletLien("ensemble", "Dashboard", "Vue d'ensemble")}
          <span className="dat-onglet-sep" aria-hidden="true" />
          {ongletLien("activite", "Activity", "Activité")}
          {ongletLien("courriels", "Email", "Courriels", courriels.length)}
          {ongletLien("appels", "VideoCamera", "Appels", appels.length)}
          {ongletLien("chantiers", "Company", "Chantiers", chantiers.length)}
          {ongletLien("notes", "Note", "Notes", notes.length)}
          {ongletLien("taches", "CheckSquare", "Tâches", taches.length)}
          {ongletLien("factures", "Folder", "Factures", factures.length)}
        </nav>

        <div className="dat-corps">
          {onglet === "ensemble" ? (
            <>
              <h2 className="dat-titre">En bref</h2>
              <div className="dat-cartes">
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Vigilance
                    <DatIcone nom="Handshake" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={vigilance ? undefined : ""}>
                    {vigilance ? <Force v={vigilance} /> : "Non renseignée"}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Prochain passage
                    <DatIcone nom="CalendarArrowRight" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={prochain ? undefined : ""}>
                    {prochain ? `${majuscule(relatif(jj(prochain.p.debut) < auj ? auj : jj(prochain.p.debut), auj))} · ${prochain.c.nom}` : "Aucun passage"}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Rôles
                    <DatIcone nom="Company" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={libelleRoles(t) ? undefined : ""}>
                    {libelleRoles(t) || "Aucun rôle"}
                    {t.corps_etat.length && !t.id.startsWith("loc:") ? <span className="dat-carte-sous">{t.corps_etat.map(majuscule).join(", ")}</span> : null}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Courriel
                    <DatIcone nom="At" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.email ? undefined : ""}>
                    {t.email ? (
                      <a className="dat-lien" href={mailto}>
                        {t.email}
                      </a>
                    ) : (
                      "Aucun courriel"
                    )}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Téléphone
                    <DatIcone nom="Phone" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={tel ? undefined : ""}>
                    {tel ? (
                      <a className="dat-lien" href={tel}>
                        {telephone(t.telephone!)}
                      </a>
                    ) : (
                      "Aucun téléphone"
                    )}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Commune
                    <DatIcone nom="Location" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={t.commune ? undefined : ""}>
                    {t.commune ?? "Aucune commune"}
                  </div>
                </div>
              </div>

              <h2 className="dat-titre">
                Activité
                <span className="dat-titre-droite">
                  <Link href={lien("activite")} scroll={false}>
                    Tout voir
                  </Link>
                </span>
              </h2>
              {tous.length ? <ul className="dat-boite">{tous.slice(0, 3).map(lignePassage)}</ul> : vide("Aucun passage au planning.")}

              <h2 className="dat-titre">
                Courriels <span className="dat-compteur">{courriels.length}</span>
                <span className="dat-titre-droite">
                  {mailto ? (
                    <a href={mailto} className="dat-icone-bouton" aria-label="Écrire un courriel" title="Écrire un courriel">
                      <DatIcone nom="Plus" />
                    </a>
                  ) : null}
                </span>
              </h2>
              {courriels.length ? <ul className="dat-boite">{courriels.slice(0, 3).map(ligneEvenement)}</ul> : <div className="dat-espace" />}

              <h2 className="dat-titre">
                Notes <span className="dat-compteur">{notes.length}</span>
                <span className="dat-titre-droite">
                  <Link href={lien("notes")} scroll={false}>
                    Tout voir
                  </Link>
                  {plus("Nouvelle note", nouvelleNote)}
                </span>
              </h2>
              {redacteur}
              {notes.length ? (
                <ul className="dat-boite" data-haute="">
                  {notes.slice(0, 3).map(ligneNote)}
                </ul>
              ) : (
                <div className="dat-espace" />
              )}

              <h2 className="dat-titre">
                Tâches <span className="dat-compteur">{taches.length}</span>
                <span className="dat-titre-droite">
                  <Link href={lien("taches")} scroll={false}>
                    Tout voir
                  </Link>
                  {plus("Nouvelle tâche", () => setNouvelleTache(""))}
                </span>
              </h2>
              {saisieTache}
              {taches.length ? (
                <ul className="dat-boite" data-haute="">
                  {taches.slice(0, 3).map(ligneTache)}
                </ul>
              ) : (
                <div className="dat-espace" />
              )}
            </>
          ) : onglet === "activite" ? (
            <>
              <h2 className="dat-titre">
                Activité <span className="dat-compteur">{tous.length}</span>
              </h2>
              {tous.length ? <ul className="dat-boite">{tous.map(lignePassage)}</ul> : vide("Aucun passage au planning.")}
            </>
          ) : onglet === "courriels" || onglet === "appels" ? (
            <>
              <h2 className="dat-titre">
                {onglet === "courriels" ? "Courriels" : "Appels"} <span className="dat-compteur">{(onglet === "courriels" ? courriels : appels).length}</span>
                <span className="dat-titre-droite">
                  {onglet === "courriels" && mailto ? (
                    <a href={mailto} className="dat-lien">
                      Écrire à {t.email}
                    </a>
                  ) : null}
                  {onglet === "appels" && tel ? (
                    <a href={tel} className="dat-lien">
                      Appeler le {telephone(t.telephone!)}
                    </a>
                  ) : null}
                  {onglet === "courriels" && t.email ? (
                    <button
                      type="button"
                      className="dat-lien-gris"
                      onClick={async () => {
                        const ok = await copier(t.email!);
                        toast(ok ? "Courriel copié." : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
                      }}
                    >
                      Copier
                    </button>
                  ) : null}
                </span>
              </h2>
              <p className="dat-note">
                {onglet === "courriels"
                  ? t.email
                    ? `Les demandes de confirmation J-2 et les réponses passées par courriel${t.confirmer_passages && t.canal === "email" ? " (canal choisi pour ses passages)" : ""}.`
                    : "Aucun courriel enregistré pour cette entreprise."
                  : t.telephone
                    ? "Les réponses notées au téléphone sur ses passages."
                    : "Aucun téléphone enregistré pour cette entreprise."}
              </p>
              {(onglet === "courriels" ? courriels : appels).length ? <ul className="dat-boite">{(onglet === "courriels" ? courriels : appels).map(ligneEvenement)}</ul> : null}
            </>
          ) : onglet === "chantiers" ? (
            <>
              <h2 className="dat-titre">
                Chantiers <span className="dat-compteur">{chantiers.length}</span>
              </h2>
              {chantiers.length ? (
                <ul className="dat-boite" data-haute="">
                  {chantiers.map(ligneChantier)}
                </ul>
              ) : (
                vide("Elle n'intervient sur aucun chantier.")
              )}
            </>
          ) : onglet === "notes" ? (
            <>
              <h2 className="dat-titre">
                Notes <span className="dat-compteur">{notes.length}</span>
                <span className="dat-titre-droite">{plus("Nouvelle note", nouvelleNote)}</span>
              </h2>
              {redacteur}
              {notes.length ? (
                <ul className="dat-boite" data-haute="">
                  {notes.map(ligneNote)}
                </ul>
              ) : (
                vide("Aucune note. Les notes restent dans ce navigateur.")
              )}
            </>
          ) : onglet === "taches" ? (
            <>
              <h2 className="dat-titre">
                Tâches <span className="dat-compteur">{taches.length}</span>
                <span className="dat-titre-droite">{plus("Nouvelle tâche", () => setNouvelleTache(""))}</span>
              </h2>
              {saisieTache}
              {taches.length ? (
                <ul className="dat-boite" data-haute="">
                  {taches.map(ligneTache)}
                </ul>
              ) : (
                vide("Aucune tâche. Les tâches restent dans ce navigateur.")
              )}
            </>
          ) : (
            <>
              <h2 className="dat-titre">
                Factures <span className="dat-compteur">{factures.length}</span>
              </h2>
              {factures.length ? <ul className="dat-boite">{factures.map(ligneFacture)}</ul> : vide("Aucune facture de cette entreprise rattachée à un chantier.")}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
