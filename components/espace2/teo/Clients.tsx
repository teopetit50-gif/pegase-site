"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — Clients (11/11/2026)

   La copie 1:1 de l'Annuaire de DALIRO (../daliro/Annuaire : la liste
   People d'Attio et la fiche d'un contact, relevé attio-people.md, styles
   ../daliro/dal-attio.css, préfixe dat-, icônes d'Attio ../daliro/DatIcone).
   Seul le contenu change, ce sont les clients et prospects de Teo
   (omega_contacts et leur journal omega_echanges) :
     « Toutes les personnes ⌄ »  une vue par type (?type= : prospects,
                                 clients, partenaires…)
     « Réglages de la vue »      colonnes (?cols=), regroupement par
                                 type (?groupe=type)
     « Exporter »                la liste affichée en CSV
     « + Nouveau client »        la fenêtre de création (omega_contacts)
     « Trié par … »              tri (?tri=, ?sens=)
     « Filtrer »                 nom, entreprise ou commune (?q=),
                                 « À relancer » (?relancer=1)
     cases à cocher              sélection : exporter, copier les
                                 courriels, écrire à tous, épingler
     en-tête : épingle, éclair   colonne figée (?epingle=), tri (?tri=)
     « + Add column »            ajoute une colonne (?cols=)
     pied « + Add calculation »  un calcul sur les lignes (?calc=)
     fiche (?client=)            coordonnées, étape (modifiable), prochaine
                                 action, le journal des échanges (noter un
                                 appel, une visite, un WhatsApp…), notes
                                 et tâches gardées dans ce navigateur ;
                                 onglets ?onglet=
   Les données : ./donnees (exemple, ou la base lue par
   app/espace2/teo/clients/page.tsx) ; les gestes :
   app/espace2/teo/actions.ts.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import type { ClientTeo } from "@/lib/teo/types";
import { CANAUX_ECHANGE, ETAPES_CLIENT, TYPES_CLIENT } from "@/lib/teo/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DatIcone, type NomDatIcone } from "../daliro/DatIcone";
import { copier, exporterCsv } from "../daliro/navigateur";
import { changerClientTeo, creerClientTeo, noterEchangeTeo } from "@/app/espace2/teo/actions";
import { useTeo } from "./donnees";
import { CLIENTS_EXEMPLE } from "./exemples";
import { aujourdhuiIso, jourLocal, telephoneLisible, useFavorisTeo } from "./navigateur";
import "../daliro/dal-attio.css";

const BASE = `${RACINE}/teo`;

export type ReelClients = { clients: ClientTeo[]; detail: string | null };

/* les vues : une par type de contact présent */
type Groupe = { cle: string; libelle: string; types: string[] };
const GROUPES: Groupe[] = [
  { cle: "prospects", libelle: "Prospects", types: ["Prospect"] },
  { cle: "clients", libelle: "Clients", types: ["Client"] },
  { cle: "partenaires", libelle: "Partenaires", types: ["Partenaire", "Réseau"] },
  { cle: "autres", libelle: "Autres", types: ["Prestataire", "Candidat", "Autre"] },
];
const rangement = (c: ClientTeo) => GROUPES.find((g) => g.types.includes(c.type)) ?? GROUPES[3];

/* la pastille « Connection strength » d'Attio, ses couleurs par niveau : ici, l'étape */
const NIVEAUX: Record<string, { couleur: string; rang: number }> = {
  "À contacter": { couleur: "#77797C", rang: 0 },
  Contacté: { couleur: "#F97514", rang: 1 },
  "En conversation": { couleur: "#F97514", rang: 2 },
  "Audit réservé": { couleur: "#266DF0", rang: 3 },
  "Audit tenu": { couleur: "#266DF0", rang: 4 },
  "Récap envoyé": { couleur: "#266DF0", rang: 5 },
  Signé: { couleur: "#00D17E", rang: 6 },
  Installé: { couleur: "#00D17E", rang: 7 },
  "En réel": { couleur: "#00D17E", rang: 8 },
  "Partenaire actif": { couleur: "#00D17E", rang: 9 },
  "En pause": { couleur: "#77797C", rang: 10 },
  Perdu: { couleur: "#FF5454", rang: 11 },
};

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / 86_400_000);
};
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
/* les dates relatives d'Attio */
function relatif(jour: string, auj: string): string {
  const n = num(jour) - num(auj);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  const a = Math.abs(n);
  const quoi = a < 30 ? pluriel(a, "jour") : a < 60 ? "environ 1 mois" : a < 365 ? `environ ${Math.round(a / 30)} mois` : a < 730 ? "plus d'un an" : `plus de ${Math.floor(a / 365)} ans`;
  return n > 0 ? `dans ${quoi}` : `il y a ${quoi}`;
}
const dernierEchange = (c: ClientTeo) => (c.echanges.length ? [...c.echanges].sort((a, b) => b.quand.localeCompare(a.quand))[0] : null);
const aRelancer = (c: ClientTeo, auj: string) => !!c.prochaine_date && c.prochaine_date <= auj && !["Perdu", "En pause"].includes(c.etape);

/* ——— ce que ce navigateur retient ——— */
const CLE_REPLIE = "espace2:teo:clients:replie";
const CLE_FICHE = (id: string) => `espace2:teo:clients:fiche:${id}`;
type NoteLocale = { id: string; titre: string; texte: string; le: string };
type Tache = { id: string; texte: string; fait: boolean; echeance: string | null };
type FicheLocale = { description?: string; notes?: NoteLocale[]; taches?: Tache[] };
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

/* ——— les colonnes de la grille ——— */
type Colonne = { cle: string; libelle: string; icone: NomDatIcone; largeur: number; calcule?: boolean; date?: boolean; valeur: (c: ClientTeo, auj: string) => string | null; tri: (c: ClientTeo) => string | number };
const COLONNES: Colonne[] = [
  { cle: "etape", libelle: "Étape", icone: "Handshake", largeur: 215, calcule: true, valeur: (c) => c.etape, tri: (c) => NIVEAUX[c.etape]?.rang ?? 99 },
  { cle: "action", libelle: "Prochaine action", icone: "CalendarArrowRight", largeur: 310, calcule: true, date: true, valeur: (c, auj) => (c.prochaine_date ? `${majuscule(relatif(c.prochaine_date, auj))}${c.prochaine_action ? ` · ${c.prochaine_action}` : ""}` : c.prochaine_action), tri: (c) => (c.prochaine_date ? num(c.prochaine_date) : 99999) },
  { cle: "der", libelle: "Dernier échange", icone: "EmailArrowRight", largeur: 288, calcule: true, date: true, valeur: (c, auj) => (dernierEchange(c) ? `${majuscule(relatif(jourLocal(dernierEchange(c)!.quand), auj))} · ${dernierEchange(c)!.canal}` : null), tri: (c) => (dernierEchange(c) ? -num(dernierEchange(c)!.quand) : 99999) },
  { cle: "entreprise", libelle: "Entreprise", icone: "Briefcase", largeur: 250, valeur: (c) => c.entreprise, tri: (c) => c.entreprise ?? "~" },
  { cle: "type", libelle: "Type", icone: "Tag", largeur: 180, valeur: (c) => c.type, tri: (c) => c.type },
  { cle: "secteur", libelle: "Secteur", icone: "Tag", largeur: 180, valeur: (c) => c.secteur, tri: (c) => c.secteur ?? "~" },
  { cle: "commune", libelle: "Commune", icone: "Location", largeur: 180, valeur: (c) => c.commune, tri: (c) => c.commune ?? "~" },
  { cle: "tel", libelle: "Téléphone", icone: "Phone", largeur: 180, valeur: (c) => (c.telephone ? telephoneLisible(c.telephone) : null), tri: (c) => c.telephone ?? "~" },
  { cle: "mail", libelle: "Courriel", icone: "At", largeur: 250, valeur: (c) => c.courriel, tri: (c) => c.courriel ?? "~" },
  { cle: "source", libelle: "Source", icone: "DataText", largeur: 180, valeur: (c) => c.source, tri: (c) => c.source ?? "~" },
];
const PAR_DEFAUT = ["etape", "action", "der", "entreprise"];
const VIDES: Record<string, string> = { etape: "Sans étape", action: "Aucune action prévue", der: "Aucun échange", entreprise: "Aucune entreprise", type: "Aucun type", secteur: "Aucun secteur", commune: "Aucune commune", tel: "Aucun téléphone", mail: "Aucun courriel", source: "Aucune source" };

type Calcul = { cle: string; libelle: string; f: (vals: (string | null)[], col: Colonne, lignes: ClientTeo[]) => string };
const CALCULS: Calcul[] = [
  { cle: "renseignes", libelle: "Compter les renseignés", f: (v) => `${v.filter(Boolean).length} renseignés` },
  { cle: "vides", libelle: "Compter les vides", f: (v) => `${v.filter((x) => !x).length} vides` },
  { cle: "pct", libelle: "Pourcentage renseigné", f: (v) => `${v.length ? Math.round((v.filter(Boolean).length / v.length) * 100) : 0} % renseignés` },
  { cle: "uniques", libelle: "Compter les valeurs différentes", f: (v) => `${new Set(v.filter(Boolean)).size} différentes` },
  {
    cle: "proche",
    libelle: "Le plus proche",
    f: (_v, col, l) => {
      const n = l.map((c) => col.tri(c)).filter((x): x is number => typeof x === "number" && x < 99999);
      if (!n.length) return "Aucun";
      const auj = num(aujourdhuiIso());
      const m = col.cle === "der" ? -Math.min(...n) : Math.min(...n);
      return `Le plus proche : ${relatif(new Date(m * 86_400_000).toISOString().slice(0, 10), new Date(auj * 86_400_000).toISOString().slice(0, 10))}`;
    },
  },
];
const calculsDe = (col: Colonne) => CALCULS.filter((c) => c.cle !== "proche" || col.date);

function Force({ etape }: { etape: string }) {
  const n = NIVEAUX[etape];
  return (
    <span className="dat-force">
      <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
        <rect x={4} y={4} width={8} height={8} rx={3} fill={n?.couleur ?? "#77797C"} />
      </svg>
      <span className="dat-td-texte">{etape || "Sans étape"}</span>
    </span>
  );
}
function Avatar({ taille = 16 }: { taille?: number }) {
  return (
    <span className="dat-avatar-ph" aria-hidden="true">
      <DatIcone nom="UserPlaceholderLight" taille={taille} className="dat-clair" />
      <DatIcone nom="UserPlaceholderDark" taille={taille} className="dat-sombre" />
    </span>
  );
}
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

type Nouveau = { nom: string; entreprise: string; type: string; etape: string; telephone: string; courriel: string; commune: string; secteur: string };
const NOUVEAU_VIDE: Nouveau = { nom: "", entreprise: "", type: "Prospect", etape: "À contacter", telephone: "", courriel: "", commune: "", secteur: "" };

export default function Clients({ reel }: { reel: ReelClients | null }) {
  const { reel: enReel } = useTeo();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const auj = useMemo(() => aujourdhuiIso(), []);
  const [replie, replier] = useReplie();

  /* la liste : l'exemple ou la base, et ce que cette visite y change */
  const source = useMemo(() => (enReel && reel ? reel.clients : CLIENTS_EXEMPLE), [enReel, reel]);
  const [retouches, setRetouches] = useState<Record<string, ClientTeo>>({});
  const [ajoutes, setAjoutes] = useState<ClientTeo[]>([]);
  const clients = useMemo(() => [...ajoutes, ...source].map((c) => retouches[c.id] ?? c), [source, ajoutes, retouches]);
  const retoucher = (c: ClientTeo) => setRetouches((r) => ({ ...r, [c.id]: c }));

  const clientId = params.get("client");
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

  const groupes = GROUPES.filter((g) => clients.some((c) => rangement(c).cle === g.cle));
  const groupe = groupes.find((g) => g.cle === params.get("type")) ?? null;
  const q = params.get("q") ?? "";
  const relancer = params.get("relancer") === "1";
  const colTri = COLONNES.find((c) => c.cle === params.get("tri")) ?? null;
  const desc = params.get("sens") === "desc";
  const parType = params.get("groupe") === "type";
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
    const l = clients.filter((c) => (!groupe || rangement(c).cle === groupe.cle) && (!relancer || aRelancer(c, auj)) && (!m || [c.nom, c.entreprise ?? "", c.commune ?? ""].some((x) => sansAccent(x).includes(m))));
    const parNom = (a: ClientTeo, b: ClientTeo) => a.nom.localeCompare(b.nom, "fr");
    const sens = desc ? -1 : 1;
    const cmp = colTri
      ? (a: ClientTeo, b: ClientTeo) => {
          const x = colTri.tri(a);
          const y = colTri.tri(b);
          return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * sens || parNom(a, b);
        }
      : (a: ClientTeo, b: ClientTeo) => parNom(a, b) * sens;
    const triees = l.sort(cmp);
    return parType ? GROUPES.flatMap((g) => triees.filter((c) => rangement(c).cle === g.cle)) : triees;
  })();

  const [saisie, setSaisie] = useState(q);
  const chercher = (v: string) => {
    setSaisie(v);
    aller({ q: v.trim() || null });
  };

  /* ——— sélection et sa barre d'actions ——— */
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const choisis = visibles.filter((c) => selection.has(c.id));
  const basculerSel = (id: string) =>
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const tousCoches = visibles.length > 0 && choisis.length === visibles.length;
  const { estEpingle, basculer: epingler } = useFavorisTeo();
  const exporter = (lignes: ClientTeo[], nom: string) => {
    exporterCsv(nom, ["Nom", "Entreprise", "Type", ...colonnes.map((c) => c.libelle), "Courriel", "Téléphone"], lignes.map((c) => [c.nom, c.entreprise ?? "", c.type, ...colonnes.map((col) => col.valeur(c, auj) ?? ""), c.courriel ?? "", c.telephone ?? ""]));
    toast(`${pluriel(lignes.length, "contact")} exporté${lignes.length > 1 ? "s" : ""} en CSV.`, "vert");
  };
  const courrielsChoisis = choisis.map((c) => c.courriel).filter((x): x is string => !!x);

  /* ——— « + Nouveau client » ——— */
  const [nouveau, setNouveau] = useState<Nouveau | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const creer = async () => {
    if (!nouveau?.nom.trim()) return;
    const courriel = nouveau.courriel.trim();
    if (courriel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel)) return setErreur(`« ${courriel} » n'est pas une adresse de courriel.`);
    setErreur(null);
    if (!enReel) {
      const c: ClientTeo = { id: `local-${nid()}`, nom: nouveau.nom.trim(), entreprise: nouveau.entreprise.trim() || null, role: null, type: nouveau.type, etape: nouveau.etape, telephone: nouveau.telephone.trim() || null, courriel: courriel || null, commune: nouveau.commune.trim() || null, secteur: nouveau.secteur.trim() || null, source: null, prochaine_action: null, prochaine_date: null, note: null, maj: new Date().toISOString(), echanges: [] };
      setAjoutes((l) => [c, ...l]);
      setNouveau(null);
      toast(`${c.nom} est ajouté à l'exemple (rien n'est écrit en base).`);
      return;
    }
    setEnvoi(true);
    const r = await creerClientTeo(nouveau);
    setEnvoi(false);
    if (!r.client) return setErreur(r.detail ?? "La base n'a pas répondu.");
    setAjoutes((l) => [r.client!, ...l]);
    setNouveau(null);
    toast(`C'est fait. ${r.client.nom} est dans vos clients.`, "vert");
    aller({ client: r.client.id });
  };

  const fiche = clientId ? (clients.find((c) => c.id === clientId) ?? null) : null;
  const colsGrille = `250px ${colonnes.map((c) => `${c.largeur}px`).join(" ")} 250px`;
  const nbRelancer = clients.filter((c) => aRelancer(c, auj)).length;

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
          {clientId ? (
            <>
              <Link href={adresse({ client: null, onglet: null })}>Clients</Link>
              <span className="dat-fil-sep">/</span>
              <span className="dat-fil-nom">{fiche?.nom ?? "Contact"}</span>
            </>
          ) : (
            <span>Clients</span>
          )}
        </nav>
      </header>
      <h1 className="v2-sr">{fiche ? fiche.nom : "Clients"}</h1>

      {clientId ? (
        fiche ? (
          <Fiche
            c={fiche}
            auj={auj}
            onglet={params.get("onglet")}
            adresse={adresse}
            enReel={enReel}
            epingle={estEpingle("client", fiche.id)}
            onEpingler={() => epingler({ type: "client", id: fiche.id, titre: fiche.entreprise ? `${fiche.nom} · ${fiche.entreprise}` : fiche.nom, href: `${BASE}/clients?client=${encodeURIComponent(fiche.id)}` })}
            onChanger={retoucher}
          />
        ) : (
          <p className="dat-vide">{reel?.detail && enReel ? `La base réelle n'a pas répondu. ${reel.detail}` : "Ce contact n'est pas dans vos clients."}</p>
        )
      ) : (
        <>
          <div className="dat-barre">
            <Menu
              libelle="Vues"
              declencheur={
                <>
                  <DatIcone nom="TableViewColor" />
                  {groupe ? groupe.libelle : "Tous les contacts"}
                  <DatIcone nom="ChevronDown" className="dat-chevron" />
                </>
              }
            >
              {(fermer) => (
                <>
                  <div className="dat-menu-titre">Vues</div>
                  {[null, ...groupes].map((g) => (
                    <Link key={g?.cle ?? "tous"} href={adresse({ type: g?.cle ?? null })} role="menuitemradio" aria-checked={(groupe?.cle ?? null) === (g?.cle ?? null)} className="dat-menu-option" scroll={false} onClick={fermer}>
                      {g ? g.libelle : "Tous les contacts"}
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
                  <button type="button" role="menuitemradio" aria-checked={!parType} className="dat-menu-option" onClick={() => aller({ groupe: null })}>
                    Sans regroupement
                  </button>
                  <button type="button" role="menuitemradio" aria-checked={parType} className="dat-menu-option" onClick={() => aller({ groupe: "type" })}>
                    Par type
                  </button>
                  {colsParam !== null || parType || epingle || calcParam ? (
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
                      exporter(visibles, "clients");
                    }}
                  >
                    <DatIcone nom="Download" />
                    Exporter la liste en CSV ({visibles.length})
                  </button>
                  <div className="dat-menu-titre">Pas d&apos;import : les contacts se notent un par un, ou depuis le pilotage.</div>
                </>
              )}
            </Menu>
            <button type="button" className="dat-bouton dat-bouton-bleu" onClick={() => setNouveau(NOUVEAU_VIDE)}>
              <DatIcone nom="Plus" />
              Nouveau client
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
              className={`dat-bouton dat-bouton--filtre${relancer || q ? " dat-actif" : ""}`}
              declencheur={
                <>
                  <DatIcone nom="Filter" />
                  {relancer || q ? `Filtré${relancer && q ? " (2)" : ""}` : "Filtrer"}
                </>
              }
            >
              {() => (
                <>
                  <input className="dat-menu-champ" type="search" placeholder="Nom, entreprise ou commune" aria-label="Rechercher un contact par nom, entreprise ou commune" value={saisie} onChange={(e) => chercher(e.target.value)} autoFocus />
                  <Link href={adresse({ relancer: relancer ? null : "1" })} role="menuitemcheckbox" aria-checked={relancer} className="dat-menu-option" scroll={false}>
                    <DatIcone nom="Calendar" />À relancer ({nbRelancer})
                  </Link>
                </>
              )}
            </Menu>
          </div>

          {reel?.detail && enReel ? (
            <p className="dat-vide" role="alert">
              La base réelle n&apos;a pas répondu. {reel.detail}
            </p>
          ) : !clients.length ? (
            <p className="dat-vide">Aucun contact suivi. « Nouveau client » ajoute le premier : un nom suffit.</p>
          ) : (
            <div className="dat-grille-boite">
              <div className="dat-grille" role="grid" aria-label="Clients" aria-rowcount={visibles.length + 1} style={{ gridTemplateColumns: colsGrille, gridTemplateRows: `40px repeat(${(visibles.length || 1) + (parType ? new Set(visibles.map((c) => rangement(c).cle)).size : 0)}, 36px) 1fr 37px` }}>
                <div className="dat-rangee" role="row">
                  <div className="dat-th dat-fige" role="columnheader">
                    <input type="checkbox" className="dat-case" aria-label="Tout sélectionner" checked={tousCoches} onChange={() => setSelection(tousCoches ? new Set() : new Set(visibles.map((c) => c.id)))} />
                    <span className="dat-th-texte">Contact</span>
                    <button type="button" className="dat-th-bouton dat-th-plus" aria-label="Nouveau client" title="Nouveau client" onClick={() => setNouveau(NOUVEAU_VIDE)}>
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
                      <button type="button" className="dat-th-bouton" data-actif={colTri?.cle === c.cle ? "" : undefined} aria-label={`Trier sur ${c.libelle}`} title={colTri?.cle === c.cle ? (desc ? "Trier dans l'ordre" : "Trier dans l'ordre inverse") : "Trier sur cette colonne"} onClick={() => aller({ tri: c.cle, sens: colTri?.cle === c.cle && !desc ? "desc" : null })}>
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
                {visibles.map((c, i) => {
                  const nouveauGroupe = parType && (i === 0 || rangement(visibles[i - 1]).cle !== rangement(c).cle);
                  return [
                    nouveauGroupe ? (
                      <div key={`g-${rangement(c).cle}`} className="dat-rangee" role="row">
                        <div className="dat-td dat-groupe" role="rowheader" style={{ gridColumn: "1 / -1" }}>
                          <span className="dat-groupe-texte">
                            {rangement(c).libelle}
                            <span className="dat-compteur">{visibles.filter((x) => rangement(x).cle === rangement(c).cle).length}</span>
                          </span>
                        </div>
                      </div>
                    ) : null,
                    <div key={c.id} className="dat-rangee" role="row" aria-selected={selection.has(c.id)}>
                      <div className="dat-td dat-fige" role="gridcell">
                        <input type="checkbox" className="dat-case" aria-label={`Sélectionner ${c.nom}`} checked={selection.has(c.id)} onChange={() => basculerSel(c.id)} />
                        <Link href={adresse({ client: c.id })} className="dat-personne">
                          <Avatar />
                          <span>{c.nom}</span>
                        </Link>
                      </div>
                      {colonnes.map((col) => {
                        const v = col.valeur(c, auj);
                        return (
                          <div key={col.cle} className={`dat-td${col.cle === epingle ? " dat-fige dat-fige-2" : ""}`} role="gridcell" data-calcule={col.calcule ? "" : undefined} data-vide={v || col.cle === "etape" ? undefined : ""}>
                            {col.cle === "etape" ? (
                              <Force etape={c.etape} />
                            ) : col.cle === "mail" && v ? (
                              <a className="dat-lien dat-td-texte" href={`mailto:${v}`}>
                                {v}
                              </a>
                            ) : col.cle === "tel" && v && c.telephone ? (
                              <a className="dat-lien dat-td-texte" href={`tel:${c.telephone.replace(/\s/g, "")}`}>
                                {v}
                              </a>
                            ) : (
                              <span className="dat-td-texte" title={col.cle === "der" && dernierEchange(c) ? dernierEchange(c)!.resume : col.cle === "action" ? (c.prochaine_action ?? undefined) : undefined}>
                                {v ?? VIDES[col.cle]}
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
                      Aucun contact ne correspond.
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
                    <strong>{visibles.length}</strong>&nbsp;<span className="dat-pied-vide">{visibles.length > 1 ? "contacts" : "contact"}</span>
                  </div>
                  {colonnes.map((c) => {
                    const choix = CALCULS.find((x) => x.cle === calculs[c.cle]);
                    return (
                      <div key={c.cle} role="gridcell" className={c.cle === epingle ? "dat-fige dat-fige-2" : undefined}>
                        <Menu
                          libelle={`Calcul sur ${c.libelle}`}
                          droite
                          className="dat-ajout"
                          declencheur={
                            choix ? (
                              <span className="dat-calcul">{choix.f(visibles.map((x) => c.valeur(x, auj)), c, visibles)}</span>
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
              <span className="dat-selection-nb">{pluriel(choisis.length, "sélectionné")}</span>
              <button type="button" className="dat-bouton" onClick={() => exporter(choisis, "clients-selection")}>
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
                  for (const c of choisis) if (!estEpingle("client", c.id)) epingler({ type: "client", id: c.id, titre: c.entreprise ? `${c.nom} · ${c.entreprise}` : c.nom, href: `${BASE}/clients?client=${encodeURIComponent(c.id)}` });
                  toast(`${pluriel(choisis.length, "contact")} épinglé${choisis.length > 1 ? "s" : ""} dans la vue d'ensemble.`, "vert");
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

      <Dialog open={!!nouveau} onOpenChange={(o) => !o && setNouveau(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <DatIcone nom="Company" taille={18} />
            </DialogIcone>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Une personne et son entreprise, l&apos;étape où elle en est. La fiche s&apos;écrit dans vos contacts (le pilotage la voit aussi).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {nouveau ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Nom
                    <input className="rv-champ" required maxLength={120} value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} autoFocus />
                  </label>
                  <label className="rv-libelle">
                    Entreprise
                    <input className="rv-champ" maxLength={120} value={nouveau.entreprise} onChange={(e) => setNouveau({ ...nouveau, entreprise: e.target.value })} />
                  </label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Type
                    <select className="rv-champ" value={nouveau.type} onChange={(e) => setNouveau({ ...nouveau, type: e.target.value })}>
                      {TYPES_CLIENT.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rv-libelle">
                    Étape
                    <select className="rv-champ" value={nouveau.etape} onChange={(e) => setNouveau({ ...nouveau, etape: e.target.value })}>
                      {ETAPES_CLIENT.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Téléphone
                    <input className="rv-champ" type="tel" maxLength={30} value={nouveau.telephone} onChange={(e) => setNouveau({ ...nouveau, telephone: e.target.value })} />
                  </label>
                  <label className="rv-libelle">
                    Courriel
                    <input className="rv-champ" type="email" maxLength={120} value={nouveau.courriel} onChange={(e) => setNouveau({ ...nouveau, courriel: e.target.value })} />
                  </label>
                </div>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Commune
                    <input className="rv-champ" maxLength={80} value={nouveau.commune} onChange={(e) => setNouveau({ ...nouveau, commune: e.target.value })} />
                  </label>
                  <label className="rv-libelle">
                    Secteur
                    <input className="rv-champ" maxLength={80} value={nouveau.secteur} onChange={(e) => setNouveau({ ...nouveau, secteur: e.target.value })} placeholder="BTP, dentaire, avocats…" />
                  </label>
                </div>
                {erreur ? (
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouveau?.nom.trim() || envoi} onClick={() => void creer()}>
              {envoi ? <Loader variant="spin" /> : null} Ajouter le client
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ══════ la fiche d'un contact : la fiche d'un contact d'Attio ══════ */

type Onglet = "ensemble" | "echanges" | "courriels" | "appels" | "notes" | "taches";
const ONGLETS: Onglet[] = ["ensemble", "echanges", "courriels", "appels", "notes", "taches"];

function Fiche({ c, auj, onglet: ongletParam, adresse, enReel, epingle, onEpingler, onChanger }: { c: ClientTeo; auj: string; onglet: string | null; adresse: (x: Record<string, string | null>) => string; enReel: boolean; epingle: boolean; onEpingler: () => void; onChanger: (c: ClientTeo) => void }) {
  const toast = useToast();
  const [tout, setTout] = useState(false);
  const onglet: Onglet = ONGLETS.includes(ongletParam as Onglet) ? (ongletParam as Onglet) : "ensemble";
  const local = useLocal<FicheLocale>(CLE_FICHE(c.id), FICHE_VIDE);
  const ecrire = (f: FicheLocale) => ecrireLocal(CLE_FICHE(c.id), f);
  const notes = local.notes ?? [];
  const taches = local.taches ?? [];
  const [description, setDescription] = useState<string | null>(null);
  const [redaction, setRedaction] = useState<{ titre: string; texte: string } | null>(null);
  const [nouvelleTache, setNouvelleTache] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const [echange, setEchange] = useState<{ canal: string; resume: string } | null>(null);
  const [action, setAction] = useState<{ texte: string; date: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const echanges = useMemo(() => [...c.echanges].sort((a, b) => b.quand.localeCompare(a.quand)), [c.echanges]);
  const courriels = echanges.filter((e) => e.canal === "E-mail");
  const appels = echanges.filter((e) => e.canal === "Appel" || e.canal === "Rendez-vous");
  const lien = (o: Onglet) => adresse({ onglet: o === "ensemble" ? null : o });
  const detail = (icone: NomDatIcone, libelle: string, valeur: React.ReactNode, vide?: boolean) => (
    <div className="dat-detail" key={libelle}>
      <dt>
        <DatIcone nom={icone} />
        <span className="dat-dt-texte">{libelle}</span>
      </dt>
      <dd data-vide={vide ? "" : undefined}>{valeur}</dd>
    </div>
  );

  /* ——— les gestes en base : l'étape, la prochaine action, un échange ——— */
  const changer = async (champs: Partial<ClientTeo>, mot: string) => {
    onChanger({ ...c, ...champs, maj: new Date().toISOString() });
    if (enReel) {
      const e = await changerClientTeo(c.id, champs);
      if (e) return toast(`La base a refusé : ${e}`, "rouge");
    }
    toast(enReel ? mot : `${mot} (exemple : rien n'est écrit en base).`, enReel ? "vert" : "neutre");
  };
  const noter = async () => {
    if (!echange?.resume.trim()) return;
    setEnvoi(true);
    let nouvel = { id: `local-${nid()}`, quand: new Date().toISOString(), canal: echange.canal, resume: echange.resume.trim() };
    if (enReel) {
      const r = await noterEchangeTeo(c.id, echange.canal, echange.resume);
      setEnvoi(false);
      if (!r.echange) return toast(r.detail ?? "La base n'a pas répondu.", "rouge");
      nouvel = r.echange;
    } else setEnvoi(false);
    onChanger({ ...c, echanges: [nouvel, ...c.echanges], maj: nouvel.quand });
    setEchange(null);
    toast(enReel ? "Échange noté." : "Échange noté (exemple : rien n'est écrit en base).", enReel ? "vert" : "neutre");
  };

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

  const ICONE_CANAL: Record<string, NomDatIcone> = { Appel: "Phone", Visite: "Location", WhatsApp: "Activity", "E-mail": "Email", "Rendez-vous": "Calendar", "Message LinkedIn": "Text" };
  const ligneEchange = (e: ClientTeo["echanges"][number]) => (
    <li key={e.id} className="dat-ligne">
      <span className="dat-avatar" aria-hidden="true">
        <DatIcone nom={ICONE_CANAL[e.canal] ?? "Note"} taille={12} />
      </span>
      <span className="dat-ligne-titre">{e.canal}</span>
      <span className="dat-ligne-gris">{e.resume}</span>
      <span className="dat-ligne-fin">{majuscule(relatif(jourLocal(e.quand), auj))}</span>
    </li>
  );
  const ligneNote = (n: NoteLocale) => (
    <li key={n.id} className="dat-ligne">
      <span className="dat-avatar" aria-hidden="true">
        N
      </span>
      <span className="dat-ligne-titre">{n.titre}</span>
      <span className="dat-ligne-gris">{n.texte}</span>
      <span className="dat-ligne-fin">
        {majuscule(relatif(jourLocal(n.le), auj))}
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
        @{c.nom} {x.texte}
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
  const saisieEchange = echange ? (
    <div className="dat-redaction">
      <select className="dat-menu-champ" aria-label="Canal" value={echange.canal} onChange={(e) => setEchange({ ...echange, canal: e.target.value })}>
        {CANAUX_ECHANGE.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <textarea className="dat-menu-champ dat-zone" placeholder="Ce qui s'est dit, ce qui en sort" aria-label="Résumé de l'échange" value={echange.resume} autoFocus onChange={(e) => setEchange({ ...echange, resume: e.target.value })} />
      <div className="dat-redaction-pied">
        <button type="button" className="dat-bouton" onClick={() => setEchange(null)}>
          Annuler
        </button>
        <button type="button" className="dat-bouton dat-bouton-bleu" disabled={envoi || !echange.resume.trim()} onClick={() => void noter()}>
          Noter l&apos;échange
        </button>
      </div>
    </div>
  ) : null;
  const saisieTache =
    nouvelleTache !== null ? (
      <div className="dat-redaction">
        <input
          className="dat-menu-champ"
          placeholder="Relancer sur le récap"
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
  const saisieAction = action ? (
    <div className="dat-redaction">
      <input className="dat-menu-champ" placeholder="La prochaine action" aria-label="Prochaine action" value={action.texte} autoFocus onChange={(e) => setAction({ ...action, texte: e.target.value })} />
      <input className="dat-menu-champ" type="date" aria-label="Date" value={action.date} onChange={(e) => setAction({ ...action, date: e.target.value })} />
      <div className="dat-redaction-pied">
        <button type="button" className="dat-bouton" onClick={() => setAction(null)}>
          Annuler
        </button>
        <button
          type="button"
          className="dat-bouton dat-bouton-bleu"
          onClick={() => {
            void changer({ prochaine_action: action.texte.trim() || null, prochaine_date: action.date || null }, "Prochaine action notée.");
            setAction(null);
          }}
        >
          Garder
        </button>
      </div>
    </div>
  ) : null;
  const plus = (libelle: string, f: () => void) => (
    <button type="button" className="dat-icone-bouton" aria-label={libelle} title={libelle} onClick={f}>
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
  const mailto = c.courriel ? `mailto:${c.courriel}` : undefined;
  const tel = c.telephone ? `tel:${c.telephone.replace(/\s/g, "")}` : undefined;
  const wa = c.telephone ? `${BASE}/whatsapp?numero=${encodeURIComponent(c.telephone.replace(/[^\d]/g, ""))}` : undefined;

  return (
    <div className="dat-fiche">
      <aside className="dat-gauche" aria-label="Détails du contact">
        <div className="dat-ident">
          <Avatar taille={32} />
          <p className="dat-ident-nom">{c.nom}</p>
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
          {wa ? (
            <Link className="dat-bouton" href={wa} aria-label="WhatsApp">
              <DatIcone nom="Activity" />
              <span className="dat-bouton-texte">WhatsApp</span>
            </Link>
          ) : null}
          <Link className="dat-bouton" href={lien("echanges")} scroll={false} onClick={() => setEchange({ canal: "Appel", resume: "" })} aria-label="Noter un échange">
            <DatIcone nom="NotePlus" />
            <span className="dat-bouton-texte">Noter un échange</span>
          </Link>
        </div>
        <section className="dat-bloc" aria-label="Détails">
          <div className="dat-bloc-tete">
            <span>Détails de la fiche</span>
          </div>
          <dl className="dat-details">
            {detail("DataText", "Nom", c.nom)}
            {detail(
              "Handshake",
              "Étape",
              <select className="dat-champ-ligne" aria-label="Étape" value={c.etape} onChange={(e) => void changer({ etape: e.target.value }, `Étape : ${e.target.value}.`)}>
                {ETAPES_CLIENT.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>,
            )}
            {detail("At", "Courriel", c.courriel ? <a className="dat-lien" href={`mailto:${c.courriel}`}>{c.courriel}</a> : "Aucun courriel", !c.courriel)}
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
                  {local.description ?? c.note ?? "Ajouter une description"}
                </button>
              ),
              !local.description && !c.note && description === null,
            )}
            {detail("Phone", "Téléphone", tel ? <a className="dat-lien" href={tel}>{telephoneLisible(c.telephone!)}</a> : "Aucun téléphone", !tel)}
            {detail("Briefcase", "Entreprise", c.entreprise ?? "Aucune entreprise", !c.entreprise)}
            {detail("Tag", "Type", c.type)}
            {tout ? (
              <>
                {detail("Location", "Commune", c.commune ?? "Aucune commune", !c.commune)}
                {detail("Tag", "Secteur", c.secteur ?? "Aucun secteur", !c.secteur)}
                {detail("DataText", "Source", c.source ?? "Aucune source", !c.source)}
                {detail("Briefcase", "Rôle", c.role ?? "Aucun rôle", !c.role)}
                {detail("Calendar", "Dernière mise à jour", majuscule(relatif(jourLocal(c.maj), auj)))}
              </>
            ) : null}
          </dl>
          <button type="button" className="dat-voir" onClick={() => setTout((v) => !v)} aria-expanded={tout}>
            {tout ? "Voir moins de valeurs" : "Voir toutes les valeurs"}
          </button>
        </section>
        <section className="dat-bloc" aria-label="Prochaine action">
          <div className="dat-bloc-tete">
            <span>Prochaine action</span>
            <button type="button" className="dat-lien" onClick={() => setAction({ texte: c.prochaine_action ?? "", date: c.prochaine_date ?? auj })}>
              Modifier
            </button>
          </div>
          {saisieAction}
          {c.prochaine_action || c.prochaine_date ? (
            <div className="dat-pastilles">
              <span className={aRelancer(c, auj) ? "dat-echeance" : undefined}>{c.prochaine_date ? majuscule(relatif(c.prochaine_date, auj)) : "Sans date"}</span>
              {c.prochaine_action ? <span>{c.prochaine_action}</span> : null}
            </div>
          ) : (
            <p className="dat-vide-texte">Aucune action prévue</p>
          )}
        </section>
      </aside>

      <div className="dat-droite">
        <nav className="dat-onglets" aria-label="Onglets de la fiche">
          {ongletLien("ensemble", "Dashboard", "Vue d'ensemble")}
          <span className="dat-onglet-sep" aria-hidden="true" />
          {ongletLien("echanges", "Activity", "Échanges", echanges.length)}
          {ongletLien("courriels", "Email", "Courriels", courriels.length)}
          {ongletLien("appels", "VideoCamera", "Appels", appels.length)}
          {ongletLien("notes", "Note", "Notes", notes.length)}
          {ongletLien("taches", "CheckSquare", "Tâches", taches.length)}
        </nav>

        <div className="dat-corps">
          {onglet === "ensemble" ? (
            <>
              <h2 className="dat-titre">En bref</h2>
              <div className="dat-cartes">
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Étape
                    <DatIcone nom="Handshake" />
                  </div>
                  <div className="dat-carte-valeur">
                    <Force etape={c.etape} />
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Prochaine action
                    <DatIcone nom="CalendarArrowRight" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={c.prochaine_action || c.prochaine_date ? undefined : ""}>
                    {c.prochaine_date ? `${majuscule(relatif(c.prochaine_date, auj))}${c.prochaine_action ? ` · ${c.prochaine_action}` : ""}` : (c.prochaine_action ?? "Aucune action prévue")}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Entreprise
                    <DatIcone nom="Company" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={c.entreprise ? undefined : ""}>
                    {c.entreprise ?? "Aucune entreprise"}
                    {c.secteur ? <span className="dat-carte-sous">{c.secteur}</span> : null}
                  </div>
                </div>
                <div className="dat-carte">
                  <div className="dat-carte-tete">
                    Courriel
                    <DatIcone nom="At" />
                  </div>
                  <div className="dat-carte-valeur" data-vide={c.courriel ? undefined : ""}>
                    {c.courriel ? (
                      <a className="dat-lien" href={mailto}>
                        {c.courriel}
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
                        {telephoneLisible(c.telephone!)}
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
                  <div className="dat-carte-valeur" data-vide={c.commune ? undefined : ""}>
                    {c.commune ?? "Aucune commune"}
                  </div>
                </div>
              </div>

              <h2 className="dat-titre">
                Échanges <span className="dat-compteur">{echanges.length}</span>
                <span className="dat-titre-droite">
                  <Link href={lien("echanges")} scroll={false}>
                    Tout voir
                  </Link>
                  {plus("Noter un échange", () => setEchange({ canal: "Appel", resume: "" }))}
                </span>
              </h2>
              {saisieEchange}
              {echanges.length ? <ul className="dat-boite">{echanges.slice(0, 3).map(ligneEchange)}</ul> : vide("Aucun échange noté.")}

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
              {courriels.length ? <ul className="dat-boite">{courriels.slice(0, 3).map(ligneEchange)}</ul> : <div className="dat-espace" />}

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
          ) : onglet === "echanges" ? (
            <>
              <h2 className="dat-titre">
                Échanges <span className="dat-compteur">{echanges.length}</span>
                <span className="dat-titre-droite">{plus("Noter un échange", () => setEchange({ canal: "Appel", resume: "" }))}</span>
              </h2>
              {saisieEchange}
              {echanges.length ? <ul className="dat-boite">{echanges.map(ligneEchange)}</ul> : vide("Aucun échange noté : un appel, une visite, un WhatsApp, un mail.")}
            </>
          ) : onglet === "courriels" || onglet === "appels" ? (
            <>
              <h2 className="dat-titre">
                {onglet === "courriels" ? "Courriels" : "Appels"} <span className="dat-compteur">{(onglet === "courriels" ? courriels : appels).length}</span>
                <span className="dat-titre-droite">
                  {onglet === "courriels" && mailto ? (
                    <a href={mailto} className="dat-lien">
                      Écrire à {c.courriel}
                    </a>
                  ) : null}
                  {onglet === "appels" && tel ? (
                    <a href={tel} className="dat-lien">
                      Appeler le {telephoneLisible(c.telephone!)}
                    </a>
                  ) : null}
                  {onglet === "courriels" && c.courriel ? (
                    <button
                      type="button"
                      className="dat-lien-gris"
                      onClick={async () => {
                        const ok = await copier(c.courriel!);
                        toast(ok ? "Courriel copié." : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
                      }}
                    >
                      Copier
                    </button>
                  ) : null}
                </span>
              </h2>
              <p className="dat-note">{onglet === "courriels" ? (c.courriel ? "Les échanges notés par courriel. La boîte elle-même est dans Mails." : "Aucun courriel enregistré pour ce contact.") : c.telephone ? "Les appels et rendez-vous notés." : "Aucun téléphone enregistré pour ce contact."}</p>
              {(onglet === "courriels" ? courriels : appels).length ? <ul className="dat-boite">{(onglet === "courriels" ? courriels : appels).map(ligneEchange)}</ul> : null}
              {onglet === "courriels" ? (
                <p className="dat-note">
                  <Link className="dat-lien" href={`${BASE}/mails`}>
                    Ouvrir la boîte mail
                  </Link>
                </p>
              ) : wa ? (
                <p className="dat-note">
                  <Link className="dat-lien" href={wa}>
                    Ouvrir la conversation WhatsApp
                  </Link>
                </p>
              ) : null}
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
