"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Chantiers — Linear, Projects en affichage Timeline, au 1:1
   (01/11/2026, règles de Teo : docs/refonte-metiers/REGLES.md). Relevés :
   docs/refonte-metiers/releves/linear-timeline.md (29/10, clair) et le
   complément Timeline de linear-projects.md (01/11, sombre et clair).
   Styles : ./dal.css (cadre) et ./dal-timeline.css (préfixe dal-tl-).

   Le planning façon Float (./Planning) et l'ancienne frise (./Frise)
   disparaissent de cette page. Ce qu'ils portaient, rangé là où Linear
   range ce genre de chose :
     · une ligne par chantier (B08), triée par famille puis par nom ; à
       gauche le nom (un clic : la fiche) et les quatre ronds de Linear —
       santé = sa famille (B03), statut = l'hexagone rempli de l'avancement,
       priorité = l'urgence de sa phrase la plus pressée (./enClair),
       responsable = le maître d'ouvrage ;
     · à droite la barre du début à la fin prévue, le nom au-dessus ; un
       clic sur la barre ouvre le volet (Open sidebar, ./ApercuFrise) ;
     · chaque passage prévu est un jalon (losange du sprite) posé sur la
       barre : un clic l'ouvre dans le volet ; le glisser le déplace, le
       glisser avec Maj l'étire (./deplacer, porte btp_deplacer_passage) ;
       ses heures se posent dans le volet ;
     · les familles et la recherche sont dans le bouton Filtre ; le zoom
       (Mois, Trimestre, Année) dans « Année ▾ » et Display options ;
       « Nouveau chantier » (F01, G01) à droite du titre.
   Adresse : ?famille=, ?zoom=mois|trimestre (Année par défaut, comme la
   référence), ?apercu=<chantier>, ?passage=<passage>.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HardHat } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { FAMILLES, STATUTS_CHANTIER, type Famille } from "@/components/espace/daliro/etats";
import { famille } from "@/components/espace/daliro/liste";
import type { Chantier, Passage, StatutChantier } from "@/components/espace/daliro/types";
import { useToast } from "../Toasts";
import { useDaliro, type NouveauChantier } from "./donnees";
import ApercuFrise from "./ApercuFrise";
import { useDeplacer } from "./deplacer";
import { jourLocal, qui, quand, resume, type TeinteClair } from "./enClair";
import { DalCarte } from "./DalCadre";
import { DalIcone } from "./DalIcone";
import "../lin/lin.css";
import "./dal-timeline.css";

const MO_TYPES = [
  { cle: "professionnel", libelle: "Professionnel (promoteur, SCI, entreprise)" },
  { cle: "particulier", libelle: "Particulier" },
  { cle: "acheteur_public", libelle: "Acheteur public (commune, bailleur, État)" },
];
const PLACES = [
  { cle: "titulaire", libelle: "Titulaire du marché" },
  { cle: "cotraitant", libelle: "Cotraitant (groupement)" },
  { cle: "sous_traitant", libelle: "Sous-traitant d'une entreprise principale" },
];
const VIDE: NouveauChantier = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" };

const ORDRE: Record<Famille, number> = { bloque: 0, a_signer: 1, a_confirmer: 2, ouvert: 3 };
const FAMILLE_CLAIRE: Record<Famille, string> = { bloque: "Bloqués", a_signer: "Avenant à faire signer", a_confirmer: "Intervenant à relancer", ouvert: "En cours" };
const estFamille = (v: string | null): v is Famille => v === "bloque" || v === "a_signer" || v === "a_confirmer" || v === "ouvert";

/* l'échelle : px par jour (Année = relevé, 77,5 px le mois) */
type Zoom = "mois" | "trimestre" | "annee";
const ZOOMS: { cle: Zoom; libelle: string; px: number; pas: number }[] = [
  { cle: "mois", libelle: "Mois", px: 24, pas: 7 },
  { cle: "trimestre", libelle: "Trimestre", px: 8, pas: 14 },
  { cle: "annee", libelle: "Année", px: 2.5, pas: 14 },
];
const MOIS = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const JOUR = 86_400_000;
const jourCourt = (j: number) => {
  const d = new Date(j * JOUR);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()].toLowerCase()}`;
};
const versJour = (iso: string) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / JOUR);
/* la colonne gauche (relevé : 320) ; la ligne d'aujourd'hui au milieu de la carte, à 1,5 px près
   (captures de Linear : 595 sur une carte de 1187, 387,7 sur 772, 386,4 sur 768, 197 sur 390) */
const GAUCHE = 320;
const AUJ_DECALAGE = 1.5;
const LIGNE = 72;

/* couleur de l'icône de projet, par statut (couleurs relevées sur les icônes de projet de Linear) */
const COULEUR_STATUT: Record<StatutChantier, string> = { preparation: "#f0bf00", ouvert: "#4cb782", suspendu: "#e78f41", receptionne: "#5e6ad2", clos: "#a2a6ac", annule: "#a2a6ac" };
/* santé : la famille du chantier (On track / At risk / Off track / No updates) */
const SANTE: Record<Famille, "off" | "risk" | "on"> = { bloque: "off", a_signer: "risk", a_confirmer: "risk", ouvert: "on" };
/* priorité : l'urgence de sa phrase la plus pressée */
const PRIORITE: Record<TeinteClair, 0 | 1 | 2 | 3 | 4> = { rouge: 1, ambre: 2, bleu: 3, gris: 4, vert: 0 };
const NOM_PRIORITE = ["Aucune urgence", "Urgent", "Haute", "Moyenne", "Basse"];

function IconeSante({ etat }: { etat: "off" | "risk" | "on" | null }) {
  if (!etat) return <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle r="7.5" cx="8" cy="8" fill="none" strokeWidth="1" strokeDasharray="2.36 2.36" strokeLinecap="round" stroke="var(--dal-sante-vide)" /></svg>;
  const c = `var(--dal-sante-${etat})`;
  const d =
    etat === "on"
      ? "M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z"
      : etat === "off"
        ? "M12.6807 10.297C12.9925 10.0242 13.0241 9.5504 12.7513 9.23866L9.71942 5.77356C9.56569 5.59786 9.33892 5.50377 9.10596 5.51903C8.873 5.53429 8.66044 5.65716 8.53094 5.8514L6.76432 8.50133L4.37742 5.77354C4.10466 5.46182 3.63083 5.43024 3.31911 5.703C3.00739 5.97577 2.97581 6.44959 3.24857 6.76132L6.28056 10.2263C6.43429 10.402 6.66106 10.4961 6.89401 10.4808C7.12696 10.4656 7.33952 10.3427 7.46902 10.1485L9.23562 7.49855L11.6224 10.2264C11.8952 10.5381 12.369 10.5697 12.6807 10.297Z"
        : "M9.62562 3.8314C9.85957 3.7977 10.0957 3.87627 10.2628 4.04341L12.5728 6.35341C12.8657 6.6463 12.8657 7.12117 12.5728 7.41407C12.28 7.70696 11.8051 7.70696 11.5122 7.41407L9.91096 5.81284L6.92594 11.2854C6.81276 11.4929 6.60838 11.6349 6.37442 11.6686C6.14047 11.7023 5.90433 11.6237 5.73719 11.4566L3.42719 9.14657C3.1343 8.85367 3.1343 8.3788 3.42719 8.08591C3.72008 7.79301 4.19496 7.79301 4.48785 8.08591L6.08908 9.68714L9.0741 4.2146C9.18728 4.00709 9.39166 3.86509 9.62562 3.8314Z";
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle r="8" cx="8" cy="8" fill={c} fillOpacity="0.25" />
      <path d={d} fill={c} />
    </svg>
  );
}

/* statut de projet : l'hexagone, rempli à proportion de l'avancement */
function IconeStatut({ statut, pct }: { statut: StatutChantier; pct: number }) {
  const fait = statut === "receptionne" || statut === "clos";
  const annule = statut === "annule";
  const c = annule ? "#8A8F98" : fait ? "lch(48 59.31 288.43)" : statut === "preparation" ? "#D7D8DB" : "lch(80 90 85)";
  const p = fait ? 100 : Math.max(0, Math.min(100, pct));
  return (
    <svg width="16" height="16" viewBox="-1 -1 16 16" aria-hidden="true">
      <path d="M2.95778 3.02069L5.70777 1.36023C6.50244 0.88041 7.49756 0.88041 8.29223 1.36024L11.0422 3.02074C11.7918 3.47336 12.25 4.2852 12.25 5.16086V8.84803C12.25 9.7251 11.7904 10.5381 11.0388 10.9902L8.29114 12.6433C7.49693 13.1211 6.50355 13.1203 5.71011 12.6412L2.95775 10.9792C2.20815 10.5266 1.75 9.7148 1.75 8.83911V5.16082C1.75 4.28516 2.20816 3.47332 2.95778 3.02069Z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="bevel" strokeDasharray={statut === "preparation" && p === 0 ? "1.4 1.74" : undefined} />
      {p > 0 ? <circle r="2" cx="7" cy="7" fill="none" stroke={c} strokeWidth="4" strokeDasharray={`${(12.566 * p) / 100} 12.566`} transform="rotate(-90 7 7)" /> : null}
    </svg>
  );
}

function IconePriorite({ n }: { n: 0 | 1 | 2 | 3 | 4 }) {
  if (n === 1)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="lch(66 80 48)">
        <path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z" />
      </svg>
    );
  if (n === 0)
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1" />
      <rect x="6.5" y="5" width="3" height="9" rx="1" fillOpacity={n >= 4 ? 0.4 : 1} />
      <rect x="11.5" y="2" width="3" height="12" rx="1" fillOpacity={n >= 3 ? 0.4 : 1} />
    </svg>
  );
}

const initialesDe = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

/* un jalon glissé : on suit le pointeur, et au lâcher on pose le nouveau jour */
type Glisse = { id: string; x0: number; dx: number; etirer: boolean; bouge: boolean };

export default function Chantiers() {
  const { source, pret, erreur, liste, quota, maitresOuvrage, creer, tableau, demanderTous, enLecture } = useDaliro();
  const toast = useToast();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const [q, setQ] = useState("");
  const aujourdhui = useMemo(() => jourLocal(), []);
  const auj = versJour(aujourdhui);

  const filtre = estFamille(params.get("famille")) ? (params.get("famille") as Famille) : null;
  const zParam = params.get("zoom");
  const zoom = ZOOMS.find((z) => z.cle === zParam) ?? ZOOMS[2];
  const apercuId = params.get("apercu");
  const passageId = params.get("passage");
  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };
  const ouvrir = (modif: Record<string, string | null>) => routeur.replace(lien(modif), { scroll: false });
  const fermer = () => ouvrir({ apercu: null, passage: null });

  /* les passages sont dans les tableaux : en base réelle, on les lit tous, une fois */
  useEffect(() => {
    if (source === "reelle" && pret) demanderTous();
  }, [source, pret, demanderTous]);
  useEffect(() => {
    if (!apercuId && !passageId) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role=dialog]")) return;
      routeur.replace(lien({ apercu: null, passage: null }), { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  const passageOuvert = useMemo(() => {
    if (!passageId) return null;
    for (const c of liste) {
      const p = tableau(c.id)?.passages.find((x) => x.id === passageId);
      if (p) return p;
    }
    return null;
  }, [passageId, liste, tableau]);
  const chantierOuvert = liste.find((c) => c.id === (passageOuvert?.chantier_id ?? apercuId)) ?? null;
  const { changer, heures } = useDeplacer(aujourdhui);

  const tries = useMemo(
    () =>
      [...liste].sort((a, b) => {
        const fa = famille(a);
        const fb = famille(b);
        return (fa ? ORDRE[fa] : 9) - (fb ? ORDRE[fb] : 9) || a.nom.localeCompare(b.nom, "fr");
      }),
    [liste],
  );
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      const f = famille(ch);
      if (f) c[f]++;
    }
    return c;
  }, [liste]);

  /* F01 : nouveau chantier (G01) */
  const [nouveau, setNouveau] = useState(params.get("nouveau") === "1");
  const [envoi, setEnvoi] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [f, setF] = useState<NouveauChantier>(VIDE);
  const ouvrirNouveau = () => {
    setErreurNouveau(null);
    setF(VIDE);
    setNouveau(true);
  };
  const complet = f.nom.trim().length > 0 && /^[0-9]{5}$/.test(f.code_postal) && f.commune.trim().length > 0;
  const lancerCreation = async () => {
    setEnvoi(true);
    setErreurNouveau(null);
    try {
      const id = await creer(f);
      toast(`C'est fait. ${f.nom.trim()} est créé, en préparation : posez ses lots, son marché, puis ouvrez-le.`, "vert");
      setNouveau(false);
      routeur.push(`${RACINE}/daliro/chantiers/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreurNouveau(e instanceof Error ? e.message : "La création a échoué.");
    } finally {
      setEnvoi(false);
    }
  };
  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu").length;

  const recherche = q.trim().toLocaleLowerCase("fr");
  const visibles = tries.filter((c) => (!filtre || famille(c) === filtre) && (!recherche || `${c.nom} ${c.commune} ${c.code_postal} ${c.reference ?? ""}`.toLocaleLowerCase("fr").includes(recherche)));

  /* ——— la frise : un an et demi autour d'aujourd'hui ——— */
  const debutFrise = auj - 300;
  const finFrise = auj + 420;
  const largeur = (finFrise - debutFrise) * zoom.px;
  const xJour = (j: number) => GAUCHE + (j - debutFrise) * zoom.px;
  const mois = useMemo(() => {
    const r: { j: number; libelle: string }[] = [];
    const d = new Date(debutFrise * JOUR);
    let a = d.getUTCFullYear();
    let m = d.getUTCMonth() + 1;
    for (;;) {
      if (m > 11) {
        m = 0;
        a++;
      }
      const j = Math.floor(Date.UTC(a, m, 1) / JOUR);
      if (j > finFrise) break;
      r.push({ j, libelle: m === 0 ? `${MOIS[m]} ${a}` : MOIS[m] });
      m++;
    }
    return r;
  }, [debutFrise, finFrise]);
  const reperes = useMemo(() => {
    const r: number[] = [];
    /* les lundis, un sur deux (Linear, zoom Année : 5, 19 oct., 2, 16 nov.) ; le 1er janvier 1970 est un jeudi */
    let j = debutFrise - ((debutFrise + 3) % 7);
    if (zoom.pas === 14 && Math.floor((j + 3) / 7) % 2 !== 0) j += 7;
    for (; j <= finFrise; j += zoom.pas) if (Math.abs(j - auj) * zoom.px > 24) r.push(j);
    return r;
  }, [debutFrise, finFrise, zoom.pas, zoom.px, auj]);

  const zone = useRef<HTMLDivElement>(null);
  const allerAujourdhui = () => {
    const z = zone.current;
    if (z) z.scrollLeft = xJour(auj) + zoom.px / 2 - (z.clientWidth / 2 + AUJ_DECALAGE);
  };
  useLayoutEffect(allerAujourdhui, [zoom.cle]); // eslint-disable-line react-hooks/exhaustive-deps

  /* le défilement de la frise : un chantier fini avant la partie visible montre « ← date »
     au bord gauche de la frise (capture 390-sombre-timeline de Linear : flèche à 19 du bord
     de la colonne gauche, date en texte quaternaire) ; un clic ramène sa barre en vue */
  const [vu, setVu] = useState(0);
  const suivreDefilement = () => {
    const z = zone.current;
    if (z && Math.abs(z.scrollLeft - vu) >= 1) setVu(z.scrollLeft);
  };
  const [glisse, setGlisse] = useState<Glisse | null>(null);
  const lacher = (p: Passage, g: Glisse) => {
    const jours = Math.round(g.dx / zoom.px);
    setGlisse(null);
    if (!g.bouge) {
      ouvrir({ passage: p.id, apercu: null });
      return;
    }
    if (jours) changer({ passage: p, chantierId: p.chantier_id, mode: g.etirer ? "etirer" : "deplacer", jours });
  };

  const [menu, setMenu] = useState<null | "filtre" | "affichage" | "zoom">(null);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".dal-tl-pop")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const ligne = (c: Chantier, i: number) => {
    const fa = famille(c);
    const t = tableau(c.id);
    const r = resume(c, t, aujourdhui);
    const pct = c.etape && c.etape.etapes ? c.etape.avancement_pct : 0;
    const prio = PRIORITE[r.teinte];
    const y = 32 + i * LIGNE;
    const d0 = c.date_debut ? versJour(c.date_debut) : null;
    const d1 = c.date_fin_prevue ? versJour(c.date_fin_prevue) : null;
    const xa = d0 !== null ? xJour(d0) : d1 !== null ? xJour(debutFrise) : 0;
    const xb = d1 !== null ? xJour(d1 + 1) : d0 !== null ? xJour(d0 + 1) : 0;
    const passages = (t?.passages ?? []).filter((x) => x.statut !== "annule");
    const choisi = c.id === chantierOuvert?.id && !passageOuvert;
    return (
      <div key={c.id} className="dal-tl-ligne" style={{ top: y }}>
        <div className="dal-tl-cellule">
          <div className="dal-tl-cellule-bloc">
            <Link href={`${RACINE}/daliro/chantiers/${encodeURIComponent(c.id)}`} className="dal-tl-nom" title={`${c.nom} — ouvrir la fiche`}>
              <span className="dal-tl-icone" style={{ color: COULEUR_STATUT[c.statut] }}>
                <DalIcone nom="Project" />
              </span>
              <span className="dal-tl-nom-texte">{c.nom}</span>
            </Link>
            <span className="dal-tl-rond" role="img" aria-label={fa ? `Santé : ${FAMILLE_CLAIRE[fa]}` : "Santé : rien à signaler"} title={fa ? FAMILLE_CLAIRE[fa] : "Rien à signaler"}>
              <IconeSante etat={fa ? SANTE[fa] : null} />
            </span>
            <span className="dal-tl-rond" role="img" aria-label={`${STATUTS_CHANTIER[c.statut].libelle}, avancement ${pct} %`} title={`${STATUTS_CHANTIER[c.statut].libelle} · ${pct} %${c.etape?.lot_libelle ? ` · ${c.etape.lot_libelle}` : ""}`}>
              <IconeStatut statut={c.statut} pct={pct} />
            </span>
            <span className="dal-tl-rond" role="img" aria-label={`Priorité : ${NOM_PRIORITE[prio]}`} title={`${NOM_PRIORITE[prio]} — ${r.texte}`}>
              <IconePriorite n={prio} />
            </span>
            <span className="dal-tl-rond" role="img" aria-label={c.maitre_ouvrage_nom ? `Maître d'ouvrage : ${c.maitre_ouvrage_nom}` : "Maître d'ouvrage à désigner"} title={c.maitre_ouvrage_nom ?? "Maître d'ouvrage à désigner"}>
              {c.maitre_ouvrage_nom ? <span className="dal-tl-avatar">{initialesDe(c.maitre_ouvrage_nom) || "?"}</span> : <DalIcone nom="UnassignedCircle" />}
            </span>
          </div>
        </div>
        {(d0 !== null || d1 !== null) && xb < vu + GAUCHE ? (
          <button
            type="button"
            className="dal-tl-avant"
            style={{ left: vu + GAUCHE + 18 }}
            title={`${c.nom} : fini avant cette partie de la frise — y aller`}
            onClick={() => zone.current?.scrollTo({ left: Math.max(0, xa - GAUCHE - 40), behavior: "smooth" })}
          >
            <span aria-hidden="true">←</span>
            <span className="dal-tl-avant-date">{jourCourt((d1 ?? d0) as number)}</span>
          </button>
        ) : null}
        {d0 !== null || d1 !== null ? (
          <>
            {/* libellé posé sur le début de la barre ; si la barre commence avant la partie
                visible, il colle à 13 du bord de la frise sans dépasser la fin de la barre
                (captures de Linear : 577 pour un bord à 564 à 1440 ; à 390, « Maison Rolland »
                finit avec sa barre, sous la colonne) */}
            <span className="dal-tl-libelle-voie" style={{ left: xa, width: Math.max(8, xb - xa), visibility: xb < vu + GAUCHE ? "hidden" : undefined }}>
              <span className="dal-tl-libelle" style={{ left: GAUCHE + 13 }}>
                {c.nom}
              </span>
            </span>
            <button
              type="button"
              className="dal-tl-barre"
              data-ouverte={d0 === null ? "" : undefined}
              data-choisie={choisi ? "" : undefined}
              style={{ left: xa, width: Math.max(8, xb - xa) }}
              title={`${c.nom}, ${c.date_debut ? `du ${dateCourte(c.date_debut)}` : "sans date de début"} ${c.date_fin_prevue ? `au ${dateCourte(c.date_fin_prevue)}` : "sans fin prévue"} — ouvrir le volet`}
              aria-label={`${c.nom} : ouvrir le volet`}
              onClick={() => ouvrir({ apercu: c.id, passage: null })}
            />
            {passages.map((p) => {
              const g = glisse?.id === p.id ? glisse : null;
              const x = xJour(versJour(p.debut)) + zoom.px / 2 + (g && !g.etirer ? g.dx : 0);
              const etat = p.statut === "fait" ? "MilestoneStatusDone" : versJour(p.debut) <= auj && versJour(p.fin) >= auj ? "MilestoneStatusStarted" : "MilestoneStatusPlanned";
              return (
                <button
                  key={p.id}
                  type="button"
                  className="dal-tl-jalon"
                  data-choisi={p.id === passageOuvert?.id ? "" : undefined}
                  data-glisse={g?.bouge ? "" : undefined}
                  style={{ left: x - 8 }}
                  title={`${quand(p.debut, aujourdhui)} · ${qui(p)}${p.tache ? ` · ${p.tache}` : ""}${g ? ` → ${g.dx >= 0 ? "+" : ""}${Math.round(g.dx / zoom.px)} j` : " — glissez pour déplacer, Maj + glisser pour étirer"}`}
                  aria-label={`Passage ${p.tache ?? ""} ${quand(p.debut, aujourdhui)}, ${qui(p)}`}
                  disabled={p.statut === "fait"}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    setGlisse({ id: p.id, x0: e.clientX, dx: 0, etirer: e.shiftKey, bouge: false });
                  }}
                  onPointerMove={(e) => {
                    if (!g) return;
                    const dx = e.clientX - g.x0;
                    setGlisse({ ...g, dx, bouge: g.bouge || Math.abs(dx) > 3 });
                  }}
                  onPointerUp={() => g && lacher(p, g)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      ouvrir({ passage: p.id, apercu: null });
                    }
                  }}
                >
                  <DalIcone nom={etat} />
                </button>
              );
            })}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <DalCarte className="dal-tl-page">
      <h1 className="v2-sr">Chantiers</h1>
      <header className="dal-tete">
        <div className="dal-ligne1">
          <h2 className="dal-tl-titre">Chantiers</h2>
          <span className="dal-pousse" />
          {quota ? (
            <span className="dal-tl-quota" title="Chantiers ouverts ou suspendus, sur le quota de la formule">
              {ouverts} / {quota} ouverts
            </span>
          ) : null}
          <button type="button" className="dal-tl-nouveau" onClick={ouvrirNouveau}>
            <DalIcone nom="Plus" taille={14} />
            <span>Nouveau chantier</span>
          </button>
        </div>
        <div className="dal-ligne2">
          <Link href={lien({ famille: null })} scroll={false} className="dal-onglet" aria-current="page">
            {filtre ? FAMILLE_CLAIRE[filtre] : "Tous les chantiers"}
          </Link>
          <Link href={`${RACINE}/daliro`} className="dal-rond" aria-label="Vue d'ensemble" title="Vue d'ensemble">
            <DalIcone nom="CustomView" />
          </Link>
          <span className="dal-pousse" />
          <div className="dal-tl-outils">
            <div className="dal-tl-pop">
              <button type="button" className="dal-rond dal-rond--plein" aria-label="Filtrer" title="Filtrer" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                <DalIcone nom="Filtre" />
                {filtre || recherche ? <span className="dal-tl-point" /> : null}
              </button>
              {menu === "filtre" ? (
                <div className="dal-menu dal-tl-menu" role="menu" aria-label="Filtrer">
                  <input className="dal-tl-champ" autoFocus placeholder="Filtrer : nom, commune, code postal…" aria-label="Rechercher un chantier" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setMenu(null)} />
                  <div className="dal-menu-sep" role="separator" />
                  <Link href={lien({ famille: null })} scroll={false} role="menuitemradio" aria-checked={!filtre} className="dal-menu-option" onClick={() => setMenu(null)}>
                    <DalIcone nom="Project" />
                    <span className="dal-pousse">Tous les chantiers</span>
                    <span className="dal-tl-compte">{liste.length}</span>
                  </Link>
                  {FAMILLES.map((fa) => (
                    <Link key={fa.cle} href={lien({ famille: filtre === fa.cle ? null : fa.cle })} scroll={false} role="menuitemradio" aria-checked={filtre === fa.cle} className="dal-menu-option" onClick={() => setMenu(null)} title={fa.sous}>
                      <IconeSante etat={SANTE[fa.cle]} />
                      <span className="dal-pousse">{FAMILLE_CLAIRE[fa.cle]}</span>
                      <span className="dal-tl-compte">{comptes[fa.cle]}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="dal-tl-pop">
              <button type="button" className="dal-rond dal-rond--plein" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                <DalIcone nom="Affichage" />
              </button>
              {menu === "affichage" ? (
                <div className="dal-menu dal-tl-menu" role="menu" aria-label="Options d'affichage">
                  <p className="dal-tl-menu-titre">Échelle de la frise</p>
                  {ZOOMS.map((z) => (
                    <button key={z.cle} type="button" role="menuitemradio" aria-checked={zoom.cle === z.cle} className="dal-menu-option" onClick={() => (setMenu(null), ouvrir({ zoom: z.cle === "annee" ? null : z.cle }))}>
                      <DalIcone nom="Calendar" />
                      <span className="dal-pousse">{z.libelle}</span>
                      {zoom.cle === z.cle ? <DalIcone nom="IssueStatusDone" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="dal-rond dal-rond--plein"
              aria-label={chantierOuvert ? "Fermer le volet" : "Ouvrir le volet"}
              title={chantierOuvert ? "Fermer le volet" : "Ouvrir le volet"}
              aria-pressed={!!chantierOuvert}
              onClick={() => (chantierOuvert ? fermer() : visibles[0] && ouvrir({ apercu: visibles[0].id, passage: null }))}
            >
              <DalIcone nom="Volet" />
            </button>
          </div>
        </div>
      </header>

      {erreur && source === "reelle" ? (
        <p className="dal-tl-note" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}

      <div className="dal-tl-cadre">
        <div className="dal-tl-principal">
        <div className="dal-tl-zone" ref={zone} onScroll={suivreDefilement}>
          {!pret ? (
            <p className="dal-tl-vide">Lecture des chantiers…</p>
          ) : visibles.length === 0 ? (
            <p className="dal-tl-vide">
              {liste.length === 0 ? (
                <>
                  Aucun chantier.{" "}
                  <button type="button" className="dal-tl-lien" onClick={ouvrirNouveau}>
                    Créez le premier
                  </button>{" "}
                  : nom, code postal et commune suffisent.
                </>
              ) : recherche ? (
                "Aucun chantier ne correspond au filtre."
              ) : (
                "Rien dans cette famille."
              )}
            </p>
          ) : (
            <div className="dal-tl-toile" style={{ width: GAUCHE + largeur, height: 32 + visibles.length * LIGNE }}>
              {mois.map((m) => (
                <span key={m.j} className="dal-tl-mois-trait" style={{ left: xJour(m.j) - 1 }} />
              ))}
              <span className="dal-tl-auj-trait" style={{ left: xJour(auj) + zoom.px / 2 }} />
              <div className="dal-tl-regle" style={{ width: GAUCHE + largeur }}>
                {mois.map((m) => (
                  <span key={m.j} className="dal-tl-mois" style={{ left: xJour(m.j) }}>
                    {m.libelle}
                  </span>
                ))}
                {reperes.map((j) => (
                  <span key={j} className="dal-tl-jour" style={{ left: xJour(j) + zoom.px / 2 }}>
                    {new Date(j * JOUR).getUTCDate()}
                  </span>
                ))}
                <span className="dal-tl-auj" style={{ left: xJour(auj) + zoom.px / 2 }}>
                  {new Date(auj * JOUR).getUTCDate()} {MOIS[new Date(auj * JOUR).getUTCMonth()].replace(".", "")}
                </span>
              </div>
              {visibles.map(ligne)}
            </div>
          )}
        </div>
        {pret && visibles.length ? (
          <div className="dal-tl-commandes">
            <button type="button" className="dal-tl-commande" onClick={allerAujourdhui}>
              Aujourd&apos;hui
            </button>
            <div className="dal-tl-pop">
              <button type="button" className="dal-tl-commande" aria-expanded={menu === "zoom"} onClick={() => setMenu(menu === "zoom" ? null : "zoom")}>
                {zoom.libelle}
                <DalIcone nom="Chevron" taille={12} style={{ transform: "rotate(90deg)" }} />
              </button>
              {menu === "zoom" ? (
                <div className="dal-menu dal-tl-menu" role="menu" aria-label="Échelle" style={{ right: 0, left: "auto", minWidth: 140 }}>
                  {ZOOMS.map((z) => (
                    <button key={z.cle} type="button" role="menuitemradio" aria-checked={zoom.cle === z.cle} className="dal-menu-option" onClick={() => (setMenu(null), ouvrir({ zoom: z.cle === "annee" ? null : z.cle }))}>
                      <span className="dal-pousse">{z.libelle}</span>
                      {zoom.cle === z.cle ? <DalIcone nom="IssueStatusDone" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        </div>
        {chantierOuvert ? (
          <div className="lin dal-tl-volet">
            <ApercuFrise
              key={passageOuvert?.id ?? chantierOuvert.id}
              chantier={chantierOuvert}
              tableau={tableau(chantierOuvert.id)}
              passage={passageOuvert}
              auj={aujourdhui}
              lecture={enLecture(chantierOuvert.id)}
              onPassage={(id) => ouvrir({ passage: id, apercu: null })}
              onChantier={() => ouvrir({ apercu: chantierOuvert.id, passage: null })}
              onFermer={fermer}
              onHeures={heures}
            />
          </div>
        ) : null}
      </div>

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <HardHat width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau chantier</DialogTitle>
            <DialogDescription>Le chantier naît en préparation. Le département, le territoire et le régime de TVA se déduisent du code postal ; une entité « site » lui est ouverte.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Résidence Les Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence interne
                  <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="TIL-2026" />
                </label>
                <label className="rv-libelle">
                  Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={f.code_postal} onChange={(e) => setF({ ...f, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="69100" />
                </label>
              </div>
              <label className="rv-libelle">
                Commune <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Villeurbanne" />
              </label>
              <label className="rv-libelle">
                Adresse
                <input className="rv-champ" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} placeholder="14 rue des Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Maître d&apos;ouvrage
                  <select className="rv-champ" value={f.maitre_ouvrage_type} onChange={(e) => setF({ ...f, maitre_ouvrage_type: e.target.value })}>
                    {MO_TYPES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Notre place
                  <select className="rv-champ" value={f.place_client} onChange={(e) => setF({ ...f, place_client: e.target.value })}>
                    {PLACES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">
                Qui signe (annuaire, rôle maître d&apos;ouvrage)
                <select className="rv-champ" value={f.maitre_ouvrage_id} onChange={(e) => setF({ ...f, maitre_ouvrage_id: e.target.value })}>
                  <option value="">À désigner plus tard (le chantier ne pourra pas s&apos;ouvrir sans lui)</option>
                  {maitresOuvrage.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </label>
              {erreurNouveau ? (
                <Avis teinte="rouge" role="alert">
                  {erreurNouveau}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!complet || envoi} onClick={lancerCreation}>
              {envoi ? <Loader variant="spin" /> : null} Créer le chantier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DalCarte>
  );
}
