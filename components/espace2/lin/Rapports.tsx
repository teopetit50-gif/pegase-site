"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle « rapports » (28/10/2026) : les briques de la page
   « Insights › Reporting » de Plain, au 1:1 (relevé :
   scratchpad/plain-rapports/releve-plain.md, gabarit : ./plain-rapports.css).

     · Rapport        — la page : tête (titre ; Actions · Filtres · Grouper par ·
                        Période · Granularité, chacun sur son menu) et le corps ;
                        les menus filtrent EN PLACE (?periode= ?pas= ?groupe= ?filtre=,
                        replace, même route) ;
     · SectionRapport — un titre repliable (chevron) et sa grille de cartes ;
     · CarteRapport   — titre + « i », grand chiffre + légende, point d'état en
                        haut à droite, puis le graphique (ou un tableau) ;
     · CourbeRapport  — la courbe : la méthode de la Vue d'ensemble et de la
                        carte « Encours » (GraphiqueProgres : Catmull-Rom → Bézier,
                        aire en dégradé, trait qui se dessine) dans la carte de Plain
                        (bandes verticales, traits, axe du bas, 3 étiquettes) ;
     · serieDatee     — des points datés rangés sur l'échelle (période × granularité).

   Les icônes sont celles de Plain (pleines, grille 24), redessinées ici ou
   reprises de FicheClient.tsx. Chaque SaaS remplit ces briques avec ses
   données ; rien n'est décidé ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import "./lin.css";
import "./plain-rapports.css";
import { IcFiltres, IcInfo } from "./FicheClient";

/* ——— les icônes de Plain (fill, viewBox 24) qui manquent à FicheClient ——— */
type IconeProps = { taille?: number; className?: string };
const Ic = ({ d, taille = 18, className, evenodd }: IconeProps & { d: string | string[]; evenodd?: boolean }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} fill="currentColor" d={p} fillRule={evenodd ? "evenodd" : undefined} clipRule={evenodd ? "evenodd" : undefined} />
    ))}
  </svg>
);
/* « Group by » : trois nœuds reliés */
export const IcGrouper = (p: IconeProps) => (
  <Ic
    {...p}
    evenodd
    d={[
      "M6 16q-1.65 0-2.825-1.175T2 12t1.175-2.825T6 8t2.825 1.175T10 12t-1.175 2.825T6 16m12 0q-1.65 0-2.825-1.175T14 12t1.175-2.825T18 8t2.825 1.175T22 12t-1.175 2.825T18 16M6 14q.824 0 1.412-.588Q8 12.826 8 12t-.588-1.412A1.93 1.93 0 0 0 6 10q-.824 0-1.412.588A1.93 1.93 0 0 0 4 12q0 .825.588 1.412Q5.175 14 6 14m12 0q.824 0 1.413-.588Q20 12.826 20 12t-.587-1.412A1.93 1.93 0 0 0 18 10q-.824 0-1.413.588A1.93 1.93 0 0 0 16 12q0 .825.587 1.412Q17.176 14 18 14m-6-5q-1.65 0-2.825-1.175T8 5t1.175-2.825T12 1t2.825 1.175T16 5t-1.175 2.825T12 9m0-2q.825 0 1.412-.588Q14 5.826 14 5q0-.824-.588-1.412A1.93 1.93 0 0 0 12 3q-.825 0-1.412.587A1.93 1.93 0 0 0 10 5q0 .824.588 1.412Q11.175 7 12 7",
      "M9.175 21.825Q10.35 23 12 23t2.825-1.175T16 19t-1.175-2.825T12 15t-2.825 1.175T8 19t1.175 2.825M12 21q.825 0 1.412-.587Q14 19.825 14 19q0-.824-.588-1.413A1.93 1.93 0 0 0 12 17q-.825 0-1.412.587A1.93 1.93 0 0 0 10 19q0 .824.588 1.413Q11.175 21 12 21",
    ]}
  />
);
/* le chevron « ⌄ » des boutons de la tête */
export const IcChevronBas = (p: IconeProps) => (
  <Ic
    {...p}
    d="M12 15.549q-.229 0-.442-.077a1.1 1.1 0 0 1-.402-.264l-4.012-4.013a.9.9 0 0 1-.28-.693.98.98 0 0 1 .3-.692.96.96 0 0 1 .703-.29q.413 0 .702.29L12 13.24l3.451-3.45a.9.9 0 0 1 .693-.28q.402.01.692.3t.29.703-.29.702l-3.992 3.992a1.1 1.1 0 0 1-.844.341"
  />
);
/* le chevron « › » du titre d'une section (tourné de 90° quand elle est ouverte) */
export const IcChevronDroit = (p: IconeProps) => (
  <Ic
    {...p}
    d="M15.039 11.864q0 .229-.077.442a1.1 1.1 0 0 1-.264.401l-4.013 4.013a.9.9 0 0 1-.692.28.98.98 0 0 1-.693-.3.96.96 0 0 1-.29-.703q0-.413.29-.702l3.431-3.431L9.28 8.412A.9.9 0 0 1 9 7.72a.98.98 0 0 1 .3-.692.96.96 0 0 1 .703-.29q.413 0 .702.29l3.993 3.992a1.1 1.1 0 0 1 .34.844"
  />
);
/* le point d'état en haut à droite d'une carte (l'hexagone à « ! » de Plain) */
export const IcEtat = (p: IconeProps) => (
  <Ic
    {...p}
    d="M20 9.179a3 3 0 0 0-1.512-2.606l-5-2.856a3 3 0 0 0-2.976 0l-5 2.856A3 3 0 0 0 4 9.18v5.642c0 1.077.577 2.071 1.512 2.606l5 2.856a3 3 0 0 0 2.976 0l5-2.856A3 3 0 0 0 20 14.82zm-5.333 5.82V9a1 1 0 0 1 2 0v6a1 1 0 0 1-2 0M22 14.822a5 5 0 0 1-2.52 4.342l-5 2.856a5 5 0 0 1-4.96 0l-5-2.856A5 5 0 0 1 2 14.82V9.18c0-1.795.962-3.452 2.52-4.342l5-2.857a5 5 0 0 1 4.96 0l5 2.857A5 5 0 0 1 22 9.179z"
  />
);
/* le fantôme de « No data » */
export const IcFantome = (p: IconeProps) => (
  <Ic
    {...p}
    evenodd
    d={[
      "M19 10.908v-.02C19 7.109 15.89 4 12 4s-7 3.108-7 6.889v8.865C5.334 19.294 6.302 18 8 18c1.683 0 2.643 1.132 3.032 1.592a9 9 0 0 0 .294.334c.063.067.103.104.129.125l.001.001c.446.091.642.091 1.088 0l.001-.001c.026-.021.066-.058.129-.125a9 9 0 0 0 .294-.334C13.358 19.132 14.318 18 16 18c1.698 0 2.666 1.293 3 1.754zm-16-.02C3 5.98 7.03 2 12 2s9 3.98 9 8.889V20c0 1.105-.917 1.783-2 2-.711.142-1.112-.392-1.526-.945C17.084 20.535 16.683 20 16 20c-.743 0-1.154.476-1.578.969-.38.44-.771.894-1.422 1.031-.764.16-1.236.16-2 0-.65-.137-1.042-.59-1.422-1.031C9.154 20.476 8.743 20 8 20c-.683 0-1.084.535-1.474 1.055-.414.553-.815 1.087-1.526.945-1.083-.217-2-.895-2-2z",
      "M11 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0M17 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
    ]}
  />
);
/* « Actions » : trois points, pour les gestes propres à la page */
export const IcPoints = (p: IconeProps) => (
  <Ic
    {...p}
    d="M6 14q-.824 0-1.412-.588A1.93 1.93 0 0 1 4 12q0-.825.588-1.412A1.93 1.93 0 0 1 6 10q.824 0 1.412.588Q8 11.175 8 12t-.588 1.412A1.93 1.93 0 0 1 6 14m6 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 10 12q0-.825.588-1.412A1.93 1.93 0 0 1 12 10q.825 0 1.412.588Q14 11.175 14 12t-.588 1.412A1.93 1.93 0 0 1 12 14m6 0q-.824 0-1.413-.588A1.93 1.93 0 0 1 16 12q0-.825.587-1.412A1.93 1.93 0 0 1 18 10q.824 0 1.413.588Q20 11.175 20 12t-.587 1.412A1.93 1.93 0 0 1 18 14"
  />
);

/* ——— la période et la granularité : les menus « Timeframe » et « Granularity » de Plain ——— */
export type Periode = "24h" | "semaine" | "mois" | "deux_mois" | "quatre_mois" | "six_mois" | "douze_mois";
export type Pas = "jour" | "semaine" | "mois";
export const PERIODES: { cle: Periode; libelle: string; jours: number }[] = [
  { cle: "24h", libelle: "24 dernières heures", jours: 1 },
  { cle: "semaine", libelle: "Semaine passée", jours: 7 },
  { cle: "mois", libelle: "Mois passé", jours: 30 },
  { cle: "deux_mois", libelle: "Deux derniers mois", jours: 61 },
  { cle: "quatre_mois", libelle: "Quatre derniers mois", jours: 122 },
  { cle: "six_mois", libelle: "Six derniers mois", jours: 183 },
  { cle: "douze_mois", libelle: "Douze derniers mois", jours: 365 },
];
export const PAS: { cle: Pas; libelle: string }[] = [
  { cle: "jour", libelle: "Par jour" },
  { cle: "semaine", libelle: "Par semaine" },
  { cle: "mois", libelle: "Par mois" },
];

const estPeriode = (v: string | null): v is Periode => !!v && PERIODES.some((p) => p.cle === v);
const estPas = (v: string | null): v is Pas => !!v && PAS.some((p) => p.cle === v);

/* les paramètres de la page, lus dans l'adresse ; `lien` en donne une variante (même route, replace) */
export function useParametresRapport(defauts?: { periode?: Periode; pas?: Pas }) {
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const periode: Periode = estPeriode(params.get("periode")) ? (params.get("periode") as Periode) : (defauts?.periode ?? "mois");
  const pas: Pas = estPas(params.get("pas")) ? (params.get("pas") as Pas) : (defauts?.pas ?? "jour");
  const groupe = params.get("groupe");
  const filtre = params.get("filtre");
  const lien = (changements: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changements)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const q = p.toString();
    return q ? `${chemin}?${q}` : chemin;
  };
  const aller = (changements: Record<string, string | null>) => routeur.replace(lien(changements), { scroll: false });
  return { periode, pas, groupe, filtre, lien, aller, params };
}

/* ——— le jour (Paris) et les dates ——— */
export const jourIso = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const dateDe = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const decale = (iso: string, n: number) => {
  const d = dateDe(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const etiquetteJour = (iso: string) => {
  const d = dateDe(iso);
  return `${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]}`;
};
const etiquetteMois = (iso: string) => {
  const d = dateDe(iso);
  return `${MOIS_COURTS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/* l'échelle : les cases de la période à la granularité choisie, de la plus ancienne à aujourd'hui */
export type Case = { debut: string; fin: string; etiquette: string; bande: boolean };
export function echelle(periode: Periode, pas: Pas, aujourdhui = jourIso()): Case[] {
  const jours = PERIODES.find((p) => p.cle === periode)?.jours ?? 30;
  const depuis = decale(aujourdhui, -(jours - 1));
  const cases: Case[] = [];
  if (pas === "jour") {
    for (let j = depuis; j <= aujourdhui; j = decale(j, 1)) {
      const s = dateDe(j).getUTCDay();
      cases.push({ debut: j, fin: j, etiquette: etiquetteJour(j), bande: s !== 0 && s !== 6 });
    }
  } else if (pas === "semaine") {
    let d = depuis;
    /* au lundi */
    d = decale(d, -((dateDe(d).getUTCDay() + 6) % 7));
    let i = 0;
    for (; d <= aujourdhui; d = decale(d, 7), i++) cases.push({ debut: d, fin: decale(d, 6), etiquette: etiquetteJour(d), bande: i % 2 === 0 });
  } else {
    let d = `${depuis.slice(0, 7)}-01`;
    let i = 0;
    for (; d <= aujourdhui; i++) {
      const x = dateDe(d);
      x.setUTCMonth(x.getUTCMonth() + 1);
      const suivant = x.toISOString().slice(0, 10);
      cases.push({ debut: d, fin: decale(suivant, -1), etiquette: etiquetteMois(d), bande: i % 2 === 0 });
      d = suivant;
    }
  }
  if (cases.length === 1) cases.push({ ...cases[0] });
  return cases;
}

/* des points datés (jour ISO, valeur) rangés sur l'échelle : somme par case (ou `cumul`) */
export type Serie = { etiquettes: string[]; valeurs: number[]; bandes?: boolean[]; dates?: string[] };
export function serieDatee(points: { jour: string; valeur: number }[], periode: Periode, pas: Pas, mode: "somme" | "cumul" | "compte" = "somme", aujourdhui = jourIso()): Serie {
  const cases = echelle(periode, pas, aujourdhui);
  const valeurs = cases.map((c) => points.filter((p) => p.jour.slice(0, 10) >= c.debut && p.jour.slice(0, 10) <= c.fin).reduce((s, p) => s + (mode === "compte" ? 1 : p.valeur), 0));
  if (mode === "cumul") for (let i = 1; i < valeurs.length; i++) valeurs[i] += valeurs[i - 1];
  const etiquettes = cases.map((c, i) => (i === cases.length - 1 && pas === "jour" ? "Aujourd'hui" : c.etiquette));
  return { etiquettes, valeurs, bandes: cases.map((c) => c.bande), dates: cases.map((c) => c.debut) };
}

/* ——— un menu sous son bouton (Plain : à 4 sous le bouton, rayon 10) ——— */
export type OptionRapport = {
  cle: string;
  libelle: string;
  sous?: string;
  icone?: React.ReactNode;
  coche?: boolean;
  href?: string;
  /* le lien mène à une autre page (push) ; sinon il filtre en place (replace) */
  externe?: boolean;
  action?: () => void;
  inactif?: boolean;
  /* un trait au-dessus */
  section?: boolean;
  /* un sous-menu (chevron ›) */
  suite?: boolean;
};

export function MenuRapport({
  icone,
  libelle,
  valeur,
  titre,
  options,
  largeur,
  cote = "droite",
  aChevron = true,
}: {
  icone?: React.ReactNode;
  libelle: string;
  valeur?: string;
  titre: string;
  options: OptionRapport[];
  largeur?: number;
  cote?: "droite" | "gauche";
  aChevron?: boolean;
}) {
  const routeur = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert]);
  const choisir = (o: OptionRapport) => {
    if (o.inactif) return;
    setOuvert(false);
    if (o.action) o.action();
    else if (o.href && o.externe) routeur.push(o.href);
    else if (o.href) routeur.replace(o.href, { scroll: false });
  };
  return (
    <div className="lin-ancre" ref={ref}>
      <button type="button" className="rap-btn" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((v) => !v)}>
        {icone ? <span className="rap-btn-icone">{icone}</span> : null}
        {libelle}
        {valeur ? <span className="rap-btn-valeur">{valeur}</span> : null}
        {aChevron && valeur !== undefined ? (
          <span className="rap-btn-chevron">
            <IcChevronBas />
          </span>
        ) : null}
      </button>
      {ouvert ? (
        <div className="rap-menu" role="menu" aria-label={titre} data-cote={cote} style={largeur ? { width: largeur } : undefined}>
          <ul>
            {options.length ? (
              options.map((o) => (
                <li key={o.cle} role="none" data-section={o.section ? "" : undefined}>
                  <button type="button" role="menuitem" className="rap-menu-option" aria-disabled={o.inactif || undefined} onClick={() => choisir(o)}>
                    {o.icone ? <span className="rap-option-icone">{o.icone}</span> : null}
                    <span className="rap-option-texte">
                      <span>{o.libelle}</span>
                      {o.sous ? <small>{o.sous}</small> : null}
                    </span>
                    {o.coche ? <Check className="rap-option-coche" width={18} height={18} aria-label="actuel" /> : null}
                    {o.suite ? <ChevronRight className="rap-option-suite" width={16} height={16} aria-hidden="true" /> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="rap-menu-vide">Rien à proposer.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ——— la page ——— */
export function Rapport({
  titre,
  actions,
  filtres,
  filtreLibelle,
  groupes,
  groupeLibelle,
  periodes = true,
  granularites = true,
  avis,
  children,
}: {
  titre: string;
  /* les gestes propres à la page (exports, dépôts…), dans un menu « Actions » */
  actions?: OptionRapport[];
  /* le menu « Filtres » (la valeur courante en libellé si elle est posée) */
  filtres?: OptionRapport[];
  filtreLibelle?: string;
  /* le menu « Grouper par » */
  groupes?: OptionRapport[];
  groupeLibelle?: string;
  periodes?: boolean;
  granularites?: boolean;
  /* les messages (fait, erreur) sous la tête */
  avis?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { periode, pas, lien } = useParametresRapport();
  const aujourdhui = jourIso();
  const periodeLibelle = PERIODES.find((p) => p.cle === periode)?.libelle ?? "";
  const pasLibelle = PAS.find((p) => p.cle === pas)?.libelle ?? "";
  return (
    <div className="lin rap">
      <div className="rap-page">
        <header className="rap-tete">
          <div className="rap-titre">
            <h1>{titre}</h1>
          </div>
          <div className="rap-tete-droite">
            {actions?.length ? <MenuRapport icone={<IcPoints />} libelle="Actions" titre="Actions" options={actions} /> : null}
            {filtres ? <MenuRapport icone={<IcFiltres />} libelle="Filtres" valeur={filtreLibelle} aChevron={false} titre="Filtrer" options={filtres} /> : null}
            {groupes ? <MenuRapport icone={<IcGrouper />} libelle="Grouper par" valeur={groupeLibelle} aChevron={false} titre="Grouper par" options={groupes} /> : null}
            {periodes ? (
              <MenuRapport
                libelle="Période"
                valeur={periodeLibelle}
                titre="Période"
                largeur={214}
                options={PERIODES.map((p) => ({
                  cle: p.cle,
                  libelle: p.libelle,
                  sous: p.jours === 1 ? `${etiquetteJour(decale(aujourdhui, -1))} – ${etiquetteJour(aujourdhui)}` : `${etiquetteJour(decale(aujourdhui, -(p.jours - 1)))} – ${etiquetteJour(aujourdhui)}`,
                  coche: p.cle === periode,
                  href: lien({ periode: p.cle }),
                }))}
              />
            ) : null}
            {granularites ? (
              <MenuRapport libelle="Granularité" valeur={pasLibelle} titre="Granularité" largeur={160} options={PAS.map((p) => ({ cle: p.cle, libelle: p.libelle, coche: p.cle === pas, href: lien({ pas: p.cle }) }))} />
            ) : null}
          </div>
        </header>
        <div className="rap-corps">
          {avis}
          {children}
        </div>
      </div>
    </div>
  );
}

/* un message sous la tête (fait, erreur, information) */
export function AvisRapport({ teinte, role, children }: { teinte?: "vert" | "rouge"; role?: "status" | "alert"; children: React.ReactNode }) {
  return (
    <p className="rap-avis" data-teinte={teinte} role={role}>
      {children}
    </p>
  );
}

/* ——— une section repliable ——— */
export function SectionRapport({ titre, meta, ouverte = true, children }: { titre: string; meta?: React.ReactNode; ouverte?: boolean; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(ouverte);
  const id = `rap-section-${titre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="rap-section" aria-labelledby={`${id}-titre`}>
      <div className="rap-section-tete">
        <button type="button" className="rap-section-bouton" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((v) => !v)}>
          <h2 id={`${id}-titre`}>{titre}</h2>
          <span className="rap-section-chevron">
            <IcChevronDroit taille={14} />
          </span>
        </button>
        {meta ? <span className="rap-section-meta">{meta}</span> : null}
      </div>
      {ouvert ? (
        <div className="rap-grille" id={id}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/* ——— une carte ——— */
export function CarteRapport({
  titre,
  info,
  chiffre,
  legende,
  etat = "vert",
  etatTitre,
  taille,
  droite,
  children,
}: {
  titre: string;
  /* le « i » : l'explication, en bulle */
  info?: string;
  chiffre: React.ReactNode;
  legende?: React.ReactNode;
  /* vert : en ordre ; orange : bloquant ou hors délai ; gris : rien à dire */
  etat?: "vert" | "orange" | "gris";
  etatTitre?: string;
  taille?: "large" | "pleine";
  /* à côté du point d'état */
  droite?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <article className={`rap-carte${taille ? ` rap-carte--${taille}` : ""}`} aria-label={titre}>
      <div className="rap-carte-tete">
        <div className="rap-carte-ligne">
          <div className="rap-carte-titre">
            <span>{titre}</span>
            {info ? <IcInfo taille={14} className="rap-info" /> : null}
            {info ? <span className="rap-sr">{info}</span> : null}
          </div>
          <div className="rap-carte-droite">
            {droite}
            <span className="rap-etat" data-teinte={etat} title={etatTitre} role={etatTitre ? "img" : undefined} aria-label={etatTitre}>
              <IcEtat />
            </span>
          </div>
        </div>
        <div className="rap-carte-chiffre">
          <strong>{chiffre}</strong>
          {legende ? <span>{legende}</span> : null}
        </div>
      </div>
      {children ? <div className="rap-carte-corps">{children}</div> : null}
    </article>
  );
}

/* ——— la courbe ——— */
const kEuros = (v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10} k€` : `${Math.round(v)} €`);

export function CourbeRapport({ serie, libelle, format = kEuros, vide = "Aucune donnée", taille }: { serie: Serie; libelle: string; format?: (v: number) => string; vide?: string; taille?: "large" | "pleine" }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const [largeur, setLargeur] = useState(taille ? 575 : 369);
  const [survol, setSurvol] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mesurer = () => setLargeur(Math.max(120, Math.round(el.getBoundingClientRect().width)));
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = taille ? 200 : 155;
  const AXE = 30;
  const L = largeur;
  const Lt = L - 1;
  const Ht = H - AXE;
  const n = serie.valeurs.length;
  const brut = Math.max(0, ...serie.valeurs);
  const vide_ = brut <= 0;
  const pasY = brut > 0 ? Math.pow(10, Math.floor(Math.log10(brut))) : 1;
  const max = brut > 0 ? Math.ceil(brut / pasY) * pasY : 1;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * Lt : Lt / 2);
  const y = (v: number) => Ht - (v / max) * (Ht - 10);
  /* la courbe de GraphiqueProgres (Lin.tsx) : Catmull-Rom → Bézier, passe par chaque point */
  const lisse = (valeurs: number[]) => {
    const pts = valeurs.map((v, i) => [x(i), y(v)] as const);
    let ligne = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] ?? p2;
      const c1y = Math.min(Ht, p1[1] + (p2[1] - p0[1]) / 6),
        c2y = Math.min(Ht, p2[1] - (p3[1] - p1[1]) / 6);
      ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
    }
    return ligne;
  };
  /* les bandes : une par groupe de cases contiguës « bande » (les jours ouvrés, une case sur deux) */
  const bandes: { de: number; a: number }[] = [];
  const b = serie.bandes ?? serie.valeurs.map((_, i) => i % 2 === 0);
  for (let i = 0; i < n; i++) {
    if (!b[i]) continue;
    const d = bandes[bandes.length - 1];
    if (d && d.a === i - 1) d.a = i;
    else bandes.push({ de: i, a: i });
  }
  const demi = n > 1 ? Lt / (n - 1) / 2 : Lt / 2;
  const gauche = (i: number) => Math.max(0, x(i) - demi);
  const droite = (i: number) => Math.min(Lt, x(i) + demi);
  /* 3 étiquettes sur une échelle datée (début, milieu, aujourd'hui) ; toutes sur une échelle courte */
  const indices = serie.dates && n > 6 ? [Math.round(n * 0.18), Math.round(n * 0.52), n - 1] : serie.valeurs.map((_, i) => i);
  const dessin = lisse(vide_ ? serie.valeurs.map(() => 0) : serie.valeurs);
  return (
    <div
      className="rap-courbe"
      ref={ref}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = e.clientX - r.left;
        setSurvol(n > 1 ? Math.max(0, Math.min(n - 1, Math.round((px / Lt) * (n - 1)))) : 0);
      }}
      onPointerLeave={() => setSurvol(null)}
    >
      <svg viewBox={`0 0 ${L} ${H}`} width={L} height={H} role="img" aria-label={libelle}>
        <title>{libelle}</title>
        <defs>
          {/* 29/10 — une seule couleur, de transparent à la teinte du bas : du blanc opaque vers un noir
              à 3 %, le SVG interpole couleur et opacité à part et le milieu passait par un gris à 50 % */}
          <linearGradient id={`${id}-bande`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--rap-bande-bas)" stopOpacity="0" />
            <stop offset="0.1" stopColor="var(--rap-bande-bas)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--rap-bande-bas)" />
          </linearGradient>
          <linearGradient id={`${id}-aire`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--rap-courbe)" stopOpacity="0.3" />
            <stop offset="0.53" stopColor="var(--rap-courbe)" stopOpacity="0.05" />
            <stop offset="1" stopColor="var(--rap-courbe)" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <rect x="0" y="0" width={Lt} height={Ht} />
          </clipPath>
        </defs>
        {bandes.map((bd) => (
          <rect key={bd.de} x={gauche(bd.de)} y="0" width={droite(bd.a) - gauche(bd.de)} height={Ht} fill={`url(#${id}-bande)`} />
        ))}
        {bandes
          .flatMap((bd) => [gauche(bd.de), droite(bd.a)])
          .map((px, i) => (
            <line key={`g${i}`} x1={px} x2={px} y1="0" y2={Ht} stroke="var(--lin-trait)" strokeWidth="1" />
          ))}
        <line x1="0" x2={Lt} y1={Ht} y2={Ht} stroke="var(--lin-trait)" strokeWidth="1" />
        <line x1={Lt} x2={Lt} y1="0" y2={Ht} stroke="var(--lin-trait)" strokeWidth="1" />
        {!vide_ ? (
          <g clipPath={`url(#${id}-clip)`}>
            <path d={`${dessin} L${x(n - 1)},${Ht} L0,${Ht} Z`} fill={`url(#${id}-aire)`} />
          </g>
        ) : null}
        <g clipPath={`url(#${id}-clip)`}>
          <path d={dessin} pathLength={1} className="v2-trace" fill="none" stroke="var(--rap-courbe)" strokeWidth="2" strokeLinejoin="round" />
        </g>
        {survol !== null && !vide_ ? <circle cx={x(survol)} cy={y(serie.valeurs[survol])} r="3.5" fill="var(--rap-courbe)" stroke="var(--lin-fond)" strokeWidth="1.5" /> : null}
        {indices.map((i) => {
          const px = Math.max(0, Math.min(Lt, x(i)));
          const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
          return (
            <g key={i}>
              <line x1={px} x2={px} y1={Ht} y2={Ht + 6} stroke="var(--lin-trait)" strokeWidth="1" />
              <text x={px} y={Ht + 11.5} dy="0.71em" textAnchor={anchor}>
                {serie.etiquettes[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {vide_ ? (
        <span className="rap-sans">
          <IcFantome />
          {vide}
        </span>
      ) : null}
      {survol !== null && !vide_ ? (
        <span className="rap-bulle" style={{ left: x(survol), top: y(serie.valeurs[survol]) }}>
          {format(serie.valeurs[survol])}
          <small>{serie.dates ? etiquetteJour(serie.dates[survol]) : serie.etiquettes[survol]}</small>
        </span>
      ) : null}
    </div>
  );
}

/* ——— un tableau dans une carte ——— */
export function TableauRapport({ colonnes, children, libelle }: { colonnes: { libelle: string; num?: boolean }[]; children: React.ReactNode; libelle: string }) {
  return (
    <div className="rap-table-cadre" role="region" aria-label={libelle} tabIndex={0}>
      <table className="rap-table">
        <thead>
          <tr>
            {colonnes.map((c) => (
              <th key={c.libelle} scope="col" className={c.num ? "rap-num" : undefined}>
                {c.libelle}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const pluriel = (n: number, mot: string, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
