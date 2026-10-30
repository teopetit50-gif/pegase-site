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
import { ArrowRight, Building2, Check, ChevronDown, ChevronRight, Cpu, ListFilter, PanelRight, Tag } from "lucide-react";
import { useSource } from "@/components/espace3/base/source";
import { montant } from "@/components/espace3/base/format";
import { PERIODES, type Periode } from "./Suivi";
import { Note, Squelette } from "./ui";
import { useDonnees } from "./donnees";
import { useAujourdhui } from "./horloge";
import { RACINE } from "./modules";
import { usePoste } from "./poste";
import { BUDGET, COUT_HORAIRE, COUT_JOURS_GROUPE, COUT_JOURS_MARKETING, COUT_PAR_SOCIETE, USAGES, societe } from "./groupe";
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

/* 30/10/2026 — /espace3 : la même page, comptée sur l'IA du groupe — ce
   qu'elle a coûté, les jetons qu'elle a traités, le temps qu'elle a rendu */
type Mesure = "cout" | "jetons" | "heures";
type Repartition = "usages" | "modeles" | "directions" | "societes";
type Groupe = string;
const MESURES: { cle: Mesure; libelle: string }[] = [
  { cle: "cout", libelle: "Coût" },
  { cle: "jetons", libelle: "Jetons" },
  { cle: "heures", libelle: "Temps rendu" },
];
const REPARTITIONS: { cle: Repartition; libelle: string }[] = [
  { cle: "usages", libelle: "Usages" },
  { cle: "modeles", libelle: "Modèles" },
  { cle: "directions", libelle: "Directions" },
  { cle: "societes", libelle: "Sociétés" },
];
const ICI = `${RACINE}/utilisation`;

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

const icone = (I: typeof Tag) => <I width={16} height={16} strokeWidth={1.8} aria-hidden="true" />;

export default function Utilisation() {
  const { erreur } = useDonnees();
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const periode: Periode = PERIODES.find((p) => p.cle === params.get("periode")) ?? PERIODES[1];
  const mesure: Mesure = MESURES.find((x) => x.cle === params.get("mesure"))?.cle ?? "cout";
  const repartition: Repartition = REPARTITIONS.find((r) => r.cle === params.get("repartition"))?.cle ?? "usages";
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

  const poste = usePoste();
  const m = useMemo(() => {
    if (depuis === null) return null;
    const j = periode.jours;
    const marketing = poste === "marketing";
    const usages = marketing ? USAGES.filter((u) => u.direction === "Marketing") : USAGES;
    const coutJours = marketing ? COUT_JOURS_MARKETING : COUT_JOURS_GROUPE;
    const budget = marketing ? BUDGET.marketing : BUDGET.groupe;
    const total30 = usages.reduce((a, u) => a + u.cout, 0);
    const jetons30 = usages.reduce((a, u) => a + u.jetons, 0);
    const heures30 = usages.reduce((a, u) => a + u.heures, 0);
    const appels30 = usages.reduce((a, u) => a + u.requetes, 0);
    /* le coût de chaque jour de la période : les 30 derniers jours relevés, répétés en arrière */
    const parJour = Array.from({ length: j }, (_, i) => coutJours[(((i - j) % 30) + 30) % 30]);
    const cumulDe = (f: (c: number, i: number) => number) => {
      let t = 0;
      return parJour.map((c, i) => (t += f(c, i)));
    };
    const partAuto = usages.filter((u) => u.direction !== "Toutes" || u.cle === "tri").reduce((a, u) => a + u.cout, 0) / Math.max(1, total30);
    const series: Record<Mesure, Series> = {
      cout: {
        libelle: "Coût de l'IA",
        format: euros,
        scope: { libelle: "Budget", valeurs: parJour.map((_, i) => ((i + 1) * budget) / 30) },
        jaune: { libelle: "Consommé", valeurs: cumulDe((c) => c) },
        bleu: { libelle: "Traitements automatiques", valeurs: cumulDe((c) => c * partAuto) },
      },
      jetons: {
        libelle: "Jetons traités",
        format: (n) => `${nombre(Math.round(n / 100_000) / 10)} M`,
        scope: { libelle: "Jetons", valeurs: cumulDe((c) => (c / total30) * jetons30) },
        jaune: { libelle: "Lus (entrée)", valeurs: cumulDe((c) => (c / total30) * jetons30 * 0.82) },
        bleu: { libelle: "Écrits (sortie)", valeurs: cumulDe((c) => (c / total30) * jetons30 * 0.18) },
      },
      heures: {
        libelle: "Temps rendu aux équipes",
        format: (n) => `${nombre(Math.round(n))} h`,
        scope: { libelle: "Heures rendues", valeurs: cumulDe((c) => (c / total30) * heures30) },
        jaune: { libelle: "Valeur (k€)", valeurs: cumulDe((c) => ((c / total30) * heures30 * COUT_HORAIRE) / 1000) },
        bleu: { libelle: "Coût de l'IA (k€)", valeurs: cumulDe((c) => c / 1000) },
      },
    };
    const facteur = j / 30;
    const part = (cle: string, nom: string, cout: number, n: number, dessin: React.ReactNode): Part => ({ cle, nom: `${nom} · ${euros(cout * facteur)}`, icone: dessin, pct: pct(cout, total30), n: Math.round(n * facteur) });
    const initiale = (nom: string) => <span className="lcy-initiale">{nom.slice(0, 1).toUpperCase()}</span>;
    const somme = (xs: typeof usages) => xs.reduce((a, u) => a + u.cout, 0);
    const appels = (xs: typeof usages) => xs.reduce((a, u) => a + u.requetes, 0);
    const modeles = [...new Set(usages.map((u) => u.modele))];
    const directions = [...new Set(usages.map((u) => u.direction))];
    const repartitions: Record<Repartition, Part[]> = {
      usages: [...usages].sort((a, b) => b.cout - a.cout).map((u) => part(u.cle, u.libelle, u.cout, u.requetes, icone(Tag))),
      modeles: modeles.map((mo) => part(mo, mo, somme(usages.filter((u) => u.modele === mo)), appels(usages.filter((u) => u.modele === mo)), icone(Cpu))).sort((a, b) => b.pct - a.pct),
      directions: directions.map((d) => part(d, d === "Toutes" ? "Usages communs" : d, somme(usages.filter((u) => u.direction === d)), appels(usages.filter((u) => u.direction === d)), initiale(d === "Toutes" ? "Communs" : d))).sort((a, b) => b.pct - a.pct),
      societes: (marketing ? COUT_PAR_SOCIETE.slice(0, 6).map((c) => ({ ...c, cout: c.cout * (total30 / 7090) })) : COUT_PAR_SOCIETE).map((c) => {
        const nom = c.id === "autres" ? "Huit autres sociétés" : (societe(c.id)?.nom ?? c.id);
        return part(c.id, nom, c.cout, c.utilisateurs / facteur, icone(Building2));
      }),
    };
    /* la liste : un groupe par direction, une ligne par usage de l'IA */
    const aujourdhuiIso = new Date(depuis + (j - 1) * JOUR).toISOString();
    const ligneUsage = (u: (typeof usages)[number]): Ligne => ({
      id: `u-${u.cle}`,
      ref: u.modele.replace("Claude ", "").toUpperCase(),
      titre: `${u.libelle} — ${nombre(Math.round(u.requetes * facteur))} appels, ${nombre(Math.round(u.heures * facteur))} h rendues`,
      etat: "fait",
      etatLibelle: "Actif",
      montant: euros(u.cout * facteur),
      pilule: `${nombre(Math.round((u.jetons * facteur) / 100_000) / 10)} M jetons`,
      date: aujourdhuiIso,
      href: `${RACINE}/automatisations`,
    });
    const projection = Math.round((coutJours.slice(-7).reduce((a, c) => a + c, 0) / 7) * 30.4);
    const groupes: GroupeLignes[] = [
      ...directions.map<GroupeLignes>((d) => ({
        cle: d,
        anchor: d.toLowerCase(),
        titre: d === "Toutes" ? "Usages communs à tout le groupe" : `Direction ${d === "Finance" ? "financière" : d === "Marketing" ? "marketing" : d === "Opérations" ? "des opérations" : "juridique"}`,
        icone: icone(d === "Toutes" ? Building2 : Tag),
        href: `${RACINE}/automatisations`,
        hrefLibelle: "Ouvrir Automatisations",
        lignes: usages.filter((u) => u.direction === d).sort((a, b) => b.cout - a.cout).map(ligneUsage),
      })),
      {
        cle: "alertes",
        anchor: "alertes",
        titre: "Alertes de budget",
        icone: <IconeStatutProjet etat="en-cours" />,
        href: `${RACINE}/reglages`,
        hrefLibelle: "Ouvrir Réglages",
        teinte: "jaune",
        badge: projection > budget ? "À regarder" : undefined,
        lignes:
          projection > budget
            ? [{ id: "al-1", ref: "BUDGET", titre: `Projection du mois ${euros(projection)}, au-dessus du budget de ${euros(budget)} — alerte des 90 % envoyée à la DSI`, etat: "en-cours", etatLibelle: "À regarder", montant: euros(projection - budget), date: aujourdhuiIso, href: `${RACINE}/reglages`, aTraiter: true }]
            : [],
      },
    ];
    return { cout: Math.round(total30 * facteur), appels: Math.round(appels30 * facteur), heures: Math.round(heures30 * facteur), series, repartitions, groupes };
  }, [depuis, periode.jours, poste]);

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
  const libelleMesure = MESURES.find((x) => x.cle === mesure)?.libelle ?? "Coût";

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
              <p className="lcy-resume" data-vide={m && !m.cout ? "" : undefined}>
                {m
                  ? m.cout
                    ? `Sur ${periode.libelle.toLowerCase()} : l'IA ${poste === "marketing" ? "du marketing" : "du groupe"} a coûté ${euros(m.cout)} pour ${pluriel(m.appels, "appel", "appels")}, et rendu ${nombre(m.heures)} heures aux équipes (${euros(m.heures * COUT_HORAIRE)} de temps valorisé).`
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
                                poser("mesure", x.cle === "cout" ? null : x.cle);
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
                      <dt>{serie ? serie[k].libelle : ["Budget", "Consommé", "Automatique"][i]}</dt>
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
                    <button key={r.cle} type="button" role="tab" className="lcy-onglet" aria-selected={repartition === r.cle} onClick={() => poser("repartition", r.cle === "usages" ? null : r.cle)}>
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
