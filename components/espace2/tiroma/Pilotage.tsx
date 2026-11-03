"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Pilotage (02/11/2026, refonte des pages métiers)

   La page Insights › Reporting de Plain, au 1:1 : relevé
   docs/refonte-metiers/releves/plain-insights.md (branche refs-plain-attio-cal),
   styles ./tir-plain.css et ./tir-insights.css. Graphiques dessinés en SVG
   au gabarit relevé (bandes verticales, axe à droite, barres de 15 r 2,
   ligne de moyenne pointillée et son étiquette, répartitions de 8 px).

   Ce qu'elle reprend de l'écran d'avant (inventaire docs/refonte-metiers/tiroma.md) :
     · B15 Pilotage (titulaire, direction) : Vue d'ensemble (devis acceptés,
       signé sans rendez-vous, rendez-vous manqués), répartitions par panier
       et par praticien, « Devis à relancer » (Noter l'appel, motif devis) ;
     · B13 Synthèse de la semaine (titulaire, direction) : tableau par centre
       au gabarit des rapports de Plain ;
     · B14 Réinscription : taux, par praticien, « Vus sans prochain
       rendez-vous » (Noter l'appel, motif contrôle ; pas pour la direction) ;
     · B18 Objectifs par fauteuil (titulaire) : barres par semaine et ligne
       d'objectif, F4/G6 « Fixer » / « Changer » dans le tableau ;
     · B12 bilan des appels : « Patients rappelés » au compteur à volets du
       pied de page (« Customers helped »).
   Les boutons du haut gardent leur place : Période (Timeframe) et Pas
   (Granularity) disent les horizons fixes des portes (30 jours, semaine
   passée, quatre semaines) ; Filtre (praticien) et Grouper par (fauteuil,
   praticien) agissent sur les répartitions.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ISSUES_APPEL, PANIERS } from "@/components/espace/tiroma/libelles";
import type { CibleAppel, IssueAppel, ObjectifFauteuil } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma } from "./donnees";
import { PlainIcone } from "./PlainIcone";
import { copier, exporterCSV } from "./navigateur";
import "./tir-plain.css";
import "./tir-fils.css";
import "./tir-insights.css";

const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "N/A" : `${Math.round(x * 100)} %`);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const COULEURS = ["#5c67f4", "#1bd379", "#ab4aba", "#ffcb14", "#e33d3d", "#636370"];

function Info() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17a1 1 0 0 0 1-1v-4a1 1 0 1 0-2 0v4a1 1 0 0 0 1 1m0-8a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 13C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10m0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16" /></svg>
  );
}

/* ——— graphiques ——— */
function Bandes({ l, h, n }: { l: number; h: number; n: number }) {
  const pas = l / n;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          {i % 2 ? <rect x={i * pas} y={0} width={pas} height={h} fill="url(#tir-in-raye)" /> : null}
          <line x1={i * pas + 0.5} x2={i * pas + 0.5} y1={0} y2={h} stroke="var(--in-grille)" strokeWidth={1} />
        </g>
      ))}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <linearGradient id="tir-in-raye" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--in-raye-1)" />
        <stop offset="1" stopColor="var(--in-raye-2)" />
      </linearGradient>
      <linearGradient id="tir-in-aire" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5c67f4" stopOpacity="0.3" />
        <stop offset="1" stopColor="#5c67f4" stopOpacity="0.05" />
      </linearGradient>
    </defs>
  );
}

/* courbe (Queue size) : SVG 316×155, axe Y à droite, X en bas */
function Courbe({ valeurs, etiquettes, max = 1, format = pct }: { valeurs: (number | null)[]; etiquettes: string[]; max?: number; format?: (v: number) => string }) {
  const L = 288, H = 125;
  const pts = valeurs.map((v, i) => (v === null ? null : [((i + 0.5) * L) / valeurs.length, H - (v / max) * (H - 8)] as const));
  const ok = pts.filter(Boolean) as (readonly [number, number])[];
  const d = ok.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  return (
    <svg className="in-graphe" width="316" height="155" viewBox="0 0 316 155" role="img" aria-label="Évolution">
      <Defs />
      <Bandes l={L} h={H} n={valeurs.length} />
      {ok.length > 1 ? <path d={`${d}L${ok[ok.length - 1][0]},${H}L${ok[0][0]},${H}Z`} fill="url(#tir-in-aire)" opacity="0.6" /> : null}
      {ok.length > 1 ? <path d={d} fill="none" stroke="#5c67f4" strokeWidth="1.5" /> : null}
      <line x1={0} x2={L} y1={H + 0.5} y2={H + 0.5} stroke="var(--in-grille)" />
      <text x={L + 8} y={14} className="in-axe-y">{format(max)}</text>
      <text x={L + 8} y={H / 2 + 4} className="in-axe-y">{format(max / 2)}</text>
      <text x={L + 8} y={H + 4} className="in-axe-y">{format(0)}</text>
      {etiquettes.map((e, i) => (e ? <text key={i} x={((i + 0.5) * L) / etiquettes.length} y={H + 20} textAnchor="middle" className="in-axe-x">{e}</text> : null))}
    </svg>
  );
}

/* barres (New threads created per day) : barres de 15 r 2, couleur selon la valeur, moyenne pointillée + étiquette */
function Barres({ valeurs, etiquettes, ligne, libelleLigne, max = 1, largeur = 470, format = pct }: { valeurs: (number | null)[]; etiquettes: string[]; ligne: number | null; libelleLigne: string; max?: number; largeur?: number; format?: (v: number) => string }) {
  const L = largeur - 36, H = 170;
  const pas = L / valeurs.length;
  const haut = Math.max(...valeurs.map((v) => v ?? 0));
  const y = (v: number) => H - (v / max) * (H - 10);
  return (
    <svg className="in-graphe" width={largeur} height={H + 26} viewBox={`0 0 ${largeur} ${H + 26}`} role="img" aria-label="Par semaine">
      <Defs />
      <Bandes l={L} h={H} n={valeurs.length} />
      {valeurs.map((v, i) => (v === null ? null : (
        <rect key={i} x={i * pas + pas / 2 - 7.5} y={y(v)} width={15} height={H - y(v)} rx={2} fill={v === haut ? "#4252e1" : v < haut * 0.25 ? "#d2d6f8" : "#8a94ed"}>
          <title>{format(v)}</title>
        </rect>
      )))}
      {ligne !== null ? (
        <g>
          <line x1={0} x2={L} y1={y(ligne)} y2={y(ligne)} stroke="var(--in-moyenne)" strokeDasharray="3" />
          <foreignObject x={2} y={y(ligne) - 9} width={140} height={18}>
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

function Repartition({ lignes }: { lignes: { nom: string; valeur: number; texte: string; couleur: string; evolution?: number | null }[] }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  if (!lignes.length) return <div className="in-vide-boite"><strong>Aucune donnée</strong><span>Rien sur cette période.</span></div>;
  return (
    <div className="in-repartition">
      {lignes.slice(0, 5).map((l) => (
        <div key={l.nom} className="in-rep-ligne">
          <div className="in-rep-haut">
            <PlainIcone nom="Tier" taille={18} style={{ color: l.couleur }} />
            <span className="in-rep-nom">{l.nom}</span>
          </div>
          <div className="in-rep-barre"><span style={{ width: `${(l.valeur / max) * 100}%`, background: l.couleur }} /></div>
          <span className="in-rep-val">
            {l.texte}
            {l.evolution !== undefined && l.evolution !== null ? <span className={`in-badge ${l.evolution > 0 ? "in-badge--haut" : l.evolution < 0 ? "in-badge--bas" : ""}`}>{l.evolution > 0 ? "↗" : l.evolution < 0 ? "↘" : "●"} {Math.abs(Math.round(l.evolution * 100))}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/* « Ask Agent » (icône verte, libellé au survol) : copie le résumé de la carte pour l'assistant */
function Agent({ resume, libelle = "Copier pour l'assistant" }: { resume: string; libelle?: string }) {
  const [fait, setFait] = useState<string | null>(null);
  return (
    <button
      type="button"
      className="in-agent"
      aria-label={libelle}
      onClick={() => void copier(resume).then((ok) => { setFait(ok ? "Copié" : "Refusé"); window.setTimeout(() => setFait(null), 2500); })}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ab5f" strokeWidth="2" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7z" /></svg>
      <span className="in-agent-lib">{fait ?? libelle}</span>
    </button>
  );
}

function Carte({ titre, valeur, suffixe, children, large, resume, alerte }: { titre: string; valeur?: string; suffixe?: string; children?: React.ReactNode; large?: boolean; resume?: string; alerte?: { libelle: string; href: string } }) {
  return (
    <article className={`in-carte${large ? " in-carte--large" : ""}`}>
      <div className="in-carte-tete">
        <span>{titre}</span>
        <Info />
        <span className="pl-pousse" />
        {alerte ? <Link href={alerte.href} className="in-pique"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7z" /></svg>{alerte.libelle}</Link> : null}
        <Agent resume={`${titre} : ${valeur ?? ""} ${suffixe ?? ""}${resume ? `\n${resume}` : ""}`.trim()} />
      </div>
      {valeur !== undefined ? (
        <div className="in-valeur"><span className="in-valeur-chiffre">{valeur}</span>{suffixe ? <span className="in-valeur-suffixe">{suffixe}</span> : null}</div>
      ) : null}
      {children}
    </article>
  );
}

/* carte de chaleur (« New thread volume by time and day ») : cases de 18, r 2, gap 1,5 ; 5 paliers de #5c67f4 ; légende « Plus bas ▢▢▢▢▢ Plus haut » */
function Chaleur({ lignes, colonnes }: { lignes: { nom: string; valeurs: (number | null)[] }[]; colonnes: string[] }) {
  const palier = (v: number | null) => (v === null ? -1 : Math.min(4, Math.floor(v * 5)));
  return (
    <div className="in-chaleur">
      <div className="in-chaleur-grille" style={{ gridTemplateColumns: `90px repeat(${colonnes.length}, minmax(0, 1fr))` }}>
        {lignes.map((l) => (
          <div key={l.nom} className="in-chaleur-ligne" role="row">
            <span className="in-chaleur-nom">{l.nom}</span>
            {l.valeurs.map((v, i) => <span key={i} className="in-chaleur-case" data-palier={palier(v)} title={`${l.nom}, ${colonnes[i]} : ${pct(v)}`} />)}
          </div>
        ))}
        <div className="in-chaleur-ligne">
          <span />
          {colonnes.map((c, i) => <span key={i} className="in-chaleur-x">{i % 2 === 0 ? c : ""}</span>)}
        </div>
      </div>
      <div className="in-chaleur-legende"><span>Plus bas</span>{[0, 1, 2, 3, 4].map((k) => <span key={k} className="in-chaleur-case in-chaleur-case--10" data-palier={k} />)}<span>Plus haut</span></div>
    </div>
  );
}

/* au-dessus d'un tableau de rapport : champ « Search … » (filtre les lignes) et téléchargement CSV */
function OutilsTableau({ recherche, setRecherche, telecharger, invite }: { recherche: string; setRecherche: (v: string) => void; telecharger: () => void; invite: string }) {
  return (
    <div className="in-outils">
      <label className="in-recherche">
        <PlainIcone nom="Loupe" taille={18} />
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={invite} aria-label={invite} />
      </label>
      <button type="button" className="pl-icone-bouton in-telecharger" aria-label="Télécharger en CSV" title="Télécharger en CSV" onClick={telecharger}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="m7 10 5 5 5-5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /></svg>
      </button>
    </div>
  );
}

function Section({ titre, colonnes = 3, children }: { titre: string; colonnes?: 2 | 3; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="in-section">
      <div className="in-section-titre">
        <button type="button" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}>
          <h2>{titre}</h2>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: ouverte ? undefined : "rotate(-90deg)" }}><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>
        </button>
      </div>
      {ouverte ? <div className={`in-grille in-grille--${colonnes}`}>{children}</div> : null}
    </section>
  );
}

/* 03/11/2026 — quatre sections (objectifs, semaine, devis à relancer, vus
   sans suite) avaient un titre en bouton qui ne faisait rien : elles se
   replient comme les autres, sans la grille de Section. */
function SectionPliable({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="in-section">
      <div className="in-section-titre">
        <button type="button" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}>
          <h2>{titre}</h2>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: ouverte ? undefined : "rotate(-90deg)" }}><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>
        </button>
      </div>
      {ouverte ? children : null}
    </section>
  );
}

/* « Noter l'appel » au menu de Plain (items 36), « À rappeler » au choix d'un délai, « Ne plus contacter » confirmé */
function MenuAppel({ cible }: { cible: CibleAppel }) {
  const t = useTiroma();
  const [ouvert, setOuvert] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const jour = t.dossier?.appels?.jour ?? new Date().toISOString().slice(0, 10);
  const dans = (n: number) => {
    const d = new Date(`${jour}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const noter = async (issue: IssueAppel, rappeler_le: string | null = null) => {
    if (issue === "ne_plus_contacter" && !confirme) {
      setConfirme(true);
      return;
    }
    setOuvert(false);
    setConfirme(false);
    try {
      await t.noterAppel({ cible, issue, rappeler_le });
      setAvis(ISSUES_APPEL[issue].libelle);
    } catch (e) {
      setAvis(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  };
  return (
    <span className="pl-ancre">
      <button type="button" className="in-lien" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>{avis ?? "Noter l'appel"}</button>
      {ouvert ? (
        <div className="pl-menu in-menu" role="menu" style={{ right: 0, top: 26 }}>
          {(["rdv_pris", "message", "pas_de_reponse", "refus"] as IssueAppel[]).map((k) => (
            <button key={k} type="button" role="menuitem" className="pl-menu-item" onClick={() => void noter(k)}>{ISSUES_APPEL[k].libelle}</button>
          ))}
          <div className="pl-menu-sep" />
          {[1, 7, 30].map((n) => (
            <button key={n} type="button" role="menuitem" className="pl-menu-item" onClick={() => void noter("rappeler", dans(n))}>À rappeler {n === 1 ? "demain" : `dans ${n} jours`}</button>
          ))}
          <div className="pl-menu-sep" />
          <button type="button" role="menuitem" className="pl-menu-item" data-danger="" onClick={() => void noter("ne_plus_contacter")}>{confirme ? "Confirmer : ne plus contacter" : "Ne plus contacter"}</button>
        </div>
      ) : null}
    </span>
  );
}

function LigneObjectif({ f, semaines }: { f: ObjectifFauteuil; semaines: { lundi: string; nature: string; en_cours: boolean }[] }) {
  const t = useTiroma();
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(f.objectif ? String(Math.round(f.objectif * 100)) : "");
  const [avis, setAvis] = useState<string | null>(null);
  const enregistrer = async () => {
    const n = valeur.trim() ? Number(valeur) : null;
    if (n !== null && (!Number.isFinite(n) || n < 1 || n > 100)) {
      setAvis("Entre 1 et 100.");
      return;
    }
    try {
      await t.fixerObjectif(f, n === null ? null : n / 100);
      setEdition(false);
      setAvis(null);
    } catch (e) {
      setAvis(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  };
  return (
    <div className="in-tab-ligne in-tab-ligne--obj" role="row">
      <span className="in-tab-objet" role="cell"><PlainIcone nom="Tier" taille={14} style={{ color: "#5c67f4" }} />{f.nom}</span>
      <span role="cell">
        {edition ? (
          <span className="in-edition">
            <input className="pl-champ" type="number" min={1} max={100} value={valeur} aria-label="Objectif d'occupation (%)" onChange={(e) => setValeur(e.target.value)} />
            <button type="button" className="in-lien" onClick={() => void enregistrer()}>Enregistrer</button>
          </span>
        ) : (
          <>
            {f.objectif ? pct(f.objectif) : "–"} <button type="button" className="in-lien" onClick={() => setEdition(true)}>{f.objectif ? "Changer" : "Fixer"}</button>
          </>
        )}
        {avis ? <span className="in-erreur"> {avis}</span> : null}
      </span>
      {f.semaines.map((s, i) => (
        <span key={s.lundi} role="cell" className={semaines[i]?.nature === "prevue" ? "in-prevu" : s.atteint === false ? "in-sous" : undefined}>{pct(s.taux)}</span>
      ))}
      <span role="cell">{f.objectif ? `${f.atteintes}/${f.comptees}` : "–"}</span>
    </div>
  );
}

export default function Pilotage() {
  const t = useTiroma();
  const d = t.dossier;
  const [menu, setMenu] = useState<null | "filtre" | "grouper" | "periode" | "pas">(null);
  const [praticien, setPraticien] = useState<string | null>(null);
  const [grouper, setGrouper] = useState<"fauteuil" | "praticien">("fauteuil");
  const [chercheSyn, setChercheSyn] = useState("");
  const [chercheDevis, setChercheDevis] = useState("");
  const [chercheSuite, setChercheSuite] = useState("");
  const [sidekick, setSidekick] = useState(true);
  const [avisSk, setAvisSk] = useState<string | null>(null);
  /* 03/11/2026 — les menus de la barre (Filtre, Grouper, Période, Pas) ne se
     fermaient ni par Échap ni par un clic dehors. */
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".pl-ancre")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);
  /* B : « Ask Sidekick Agent » */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "b" || e.key === "B") (document.querySelector(".in-sidekick-question") as HTMLButtonElement | null)?.click();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${RACINE}/tiroma/reglages`}>Installer le cabinet</Link></>;
  else if (!d) etat = "Lecture du cabinet…";

  const voit = !!d && (d.profil === "titulaire" || d.profil === "direction");
  const p = voit ? d?.pilotage ?? null : null;
  const syn = voit ? d?.synthese ?? null : null;
  const rei = d?.reinscription ?? null;
  const obj = d?.profil === "titulaire" ? d?.objectifs ?? null : null;
  const registre = !!d?.appels;
  const semainesObj = obj?.semaines ?? [];
  const etiquettesSem = semainesObj.map((s) => (s.en_cours ? "Cette semaine" : jourCourt(s.lundi)));
  const moyenneSem = semainesObj.map((_, i) => {
    const xs = (obj?.fauteuils ?? []).map((f) => f.semaines[i]?.taux).filter((x): x is number => x !== null && x !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  });
  const fauteuilsObj = obj?.fauteuils ?? [];
  const praticiens = (p?.rendez_vous.par_praticien ?? []).map((x) => x.nom ?? "Praticien");

  const boutons = (
    <div className="in-boutons">
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "filtre"} onClick={() => setMenu((m) => (m === "filtre" ? null : "filtre"))}>
          <PlainIcone nom="Filtres" taille={14} /><span className="in-bouton-lib">Filtre</span>{praticien ? <span className="in-bouton-val">{praticien}</span> : null}
        </button>
        {menu === "filtre" ? (
          <div className="pl-menu in-menu" role="menu" style={{ right: 0, top: 34, width: 235 }}>
            <div className="pl-menu-titre">Praticien</div>
            {praticiens.map((n) => (
              <button key={n} type="button" role="menuitemcheckbox" aria-checked={praticien === n} className="pl-menu-item" onClick={() => { setPraticien((x) => (x === n ? null : n)); setMenu(null); }}>{n}</button>
            ))}
            {praticien ? <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setPraticien(null); setMenu(null); }}>Retirer le filtre</button> : null}
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "grouper"} onClick={() => setMenu((m) => (m === "grouper" ? null : "grouper"))}>
          <PlainIcone nom="Tier" taille={14} /><span className="in-bouton-lib">Grouper par</span><span className="in-bouton-val">{grouper === "fauteuil" ? "Fauteuil" : "Praticien"}</span>
        </button>
        {menu === "grouper" ? (
          <div className="pl-menu in-menu" role="menu" style={{ right: 0, top: 34, width: 235 }}>
            {(["fauteuil", "praticien"] as const).map((g) => (
              <button key={g} type="button" role="menuitemradio" aria-checked={grouper === g} className="pl-menu-item" onClick={() => { setGrouper(g); setMenu(null); }}>{g === "fauteuil" ? "Fauteuil" : "Praticien"}</button>
            ))}
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "periode"} onClick={() => setMenu((m) => (m === "periode" ? null : "periode"))}>
          <span className="in-bouton-lib">Période</span><span className="in-bouton-val">30 derniers jours</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>
        </button>
        {menu === "periode" ? (
          <div className="pl-menu in-menu in-menu--36" role="menu" style={{ right: 0, top: 34, width: 240 }}>
            <div className="pl-menu-item in-menu-deux"><span>30 derniers jours</span><span>{p ? `${jourCourt(p.periode.du)} – ${jourCourt(p.periode.au)}` : "pilotage, réinscription, appels"}</span></div>
            <div className="pl-menu-item in-menu-deux"><span>Semaine dernière</span><span>{syn ? `${jourCourt(syn.semaine.du)} – ${jourCourt(syn.semaine.au)}` : "synthèse de la semaine"}</span></div>
            <div className="pl-menu-item in-menu-deux"><span>Six semaines</span><span>objectifs : quatre passées, deux prévues</span></div>
          </div>
        ) : null}
      </span>
      <span className="pl-ancre">
        <button type="button" className="in-bouton" aria-expanded={menu === "pas"} onClick={() => setMenu((m) => (m === "pas" ? null : "pas"))}>
          <span className="in-bouton-lib">Pas</span><span className="in-bouton-val">Hebdomadaire</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>
        </button>
        {menu === "pas" ? (
          <div className="pl-menu in-menu in-menu--36" role="menu" style={{ right: 0, top: 34, width: 160 }}>
            <div className="pl-menu-item in-indispo">Quotidien</div>
            <div className="pl-menu-item">Hebdomadaire</div>
            <div className="pl-menu-item in-indispo">Mensuel</div>
          </div>
        ) : null}
      </span>
    </div>
  );

  return (
    <div className="tir-pl tir-in">
      <div className="pl-carte">
        <header className="in-tete">
          <h1 className="in-h1">Pilotage</h1>
          {boutons}
        </header>
        <div className="in-defile">
          {etat ? <div className="pfl-vide">{etat}</div> : null}
          {d && !p && !rei && !obj && !syn ? <div className="pfl-vide">Le pilotage est réservé au titulaire et à la direction ; la réinscription aux profils du cabinet.</div> : null}

          {p ? (
            <Section titre="Vue d'ensemble">
              <Carte titre="Devis acceptés" valeur={pct(p.devis.taux)} suffixe={`${p.devis.signes} sur ${p.devis.presentes}, ${p.periode.jours} jours`}>
                {semainesObj.length ? <Courbe valeurs={moyenneSem} etiquettes={etiquettesSem.map((e, i) => (i === semainesObj.length - 2 ? "Cette semaine" : i === 0 ? e : ""))} /> : null}
                <p className="in-note">{p.devis.precedent.taux !== null ? `${pct(p.devis.precedent.taux)} la période d'avant · ` : ""}{euros(p.devis.montant_signe)} signés sur {euros(p.devis.montant_presente)} présentés</p>
              </Carte>
              <Carte titre="Signé sans rendez-vous" valeur={euros(p.plans_sans_rdv.montant)} suffixe={`${p.plans_sans_rdv.nombre} plans`}>
                <Repartition lignes={[
                  { nom: "Reste à charge", valeur: p.plans_sans_rdv.reste_a_charge, texte: euros(p.plans_sans_rdv.reste_a_charge), couleur: "#ab4aba" },
                  { nom: "Devis sans réponse", valeur: p.en_attente.montant, texte: `${p.en_attente.devis} · ${euros(p.en_attente.montant)}`, couleur: "#5c67f4" },
                  { nom: "À relancer", valeur: p.en_attente.a_relancer, texte: String(p.en_attente.a_relancer), couleur: "#ffcb14" },
                  { nom: "Expirent sous 30 jours", valeur: p.en_attente.expirent_30j, texte: String(p.en_attente.expirent_30j), couleur: "#e33d3d" },
                ]} />
                <Link href={`${RACINE}/tiroma/plans`} className="in-lien">Plans et devis</Link>
              </Carte>
              <Carte titre="Rendez-vous manqués" valeur={pct(p.rendez_vous.taux_manques)} suffixe={`${p.rendez_vous.manques} sur ${p.rendez_vous.passes}`}>
                <Repartition lignes={p.rendez_vous.par_praticien.filter((x) => !praticien || x.nom === praticien).map((x, i) => ({ nom: x.nom ?? "Praticien", valeur: x.taux ?? 0, texte: `${pct(x.taux)} · ${x.manques}`, couleur: COULEURS[i % COULEURS.length], evolution: null }))} />
                <p className="in-note">{p.rendez_vous.precedent.taux_manques !== null ? `${pct(p.rendez_vous.precedent.taux_manques)} la période d'avant` : ""}</p>
              </Carte>
            </Section>
          ) : null}

          {obj && obj.fauteuils.length ? (
            <Section titre="Occupation des fauteuils" colonnes={2}>
              {fauteuilsObj.map((f) => (
                <Carte key={f.fauteuil_id} titre={`${f.nom} · taux par semaine`} valeur={pct(f.moyenne)} suffixe={f.objectif ? `objectif ${pct(f.objectif)} · tenu ${f.atteintes} semaine${f.atteintes > 1 ? "s" : ""} sur ${f.comptees}` : "sans objectif"} large
                  resume={f.semaines.map((x, i) => `${etiquettesSem[i]} : ${pct(x.taux)}`).join(" · ")}
                  alerte={f.objectif && f.semaines.some((x, i) => semainesObj[i]?.nature === "prevue" && x.taux !== null && x.taux < (f.objectif ?? 0) - 0.1) ? { libelle: "Voir les demi-journées vides", href: `${RACINE}/tiroma/fauteuils?vue=vides` } : undefined}>
                  <Barres valeurs={f.semaines.map((s) => s.taux)} etiquettes={etiquettesSem.map((e, i) => (i % 2 === 0 || semainesObj[i]?.en_cours ? e : ""))} ligne={f.objectif} libelleLigne="Objectif" />
                </Carte>
              ))}
              <Carte titre="Occupation par fauteuil et par semaine" large resume={fauteuilsObj.map((f) => `${f.nom} : ${f.semaines.map((x) => pct(x.taux)).join(", ")}`).join("\n")}>
                <Chaleur lignes={[...fauteuilsObj.map((f) => ({ nom: f.nom, valeurs: f.semaines.map((x) => x.taux) })), { nom: "Tous", valeurs: moyenneSem }]} colonnes={etiquettesSem} />
              </Carte>
            </Section>
          ) : null}

          {p || rei ? (
            <Section titre="Répartitions">
              {p ? (
                <Carte titre="Devis par panier">
                  <Repartition lignes={p.devis.par_panier.map((x, i) => ({ nom: PANIERS[x.panier] ?? x.panier, valeur: x.montant_signe, texte: `${x.signes}/${x.presentes} · ${euros(x.montant_signe)}`, couleur: COULEURS[i % COULEURS.length] }))} />
                </Carte>
              ) : null}
              {rei ? (
                <Carte titre="Réinscription par praticien" valeur={pct(rei.taux)} suffixe={`${rei.reinscrits} sur ${rei.visites} visites`}>
                  <Repartition lignes={rei.par_praticien.filter((x) => !praticien || x.nom === praticien).map((x, i) => ({ nom: x.nom ?? "Praticien", valeur: x.taux ?? 0, texte: pct(x.taux), couleur: COULEURS[(i + 1) % COULEURS.length], evolution: null }))} />
                  {rei.precedent.taux !== null ? <p className="in-note">{pct(rei.precedent.taux)} la période d&apos;avant</p> : null}
                </Carte>
              ) : null}
              {d?.appels ? (
                <Carte titre="Appels notés" valeur={String(d.appels.bilan.appels)} suffixe={`sur ${d.appels.bilan.jours} jours`}>
                  <Repartition lignes={[
                    { nom: "Rendez-vous repris", valeur: d.appels.bilan.rdv_pris, texte: `${d.appels.bilan.rdv_pris} (${d.appels.bilan.confirmes} confirmés)`, couleur: "#1bd379" },
                    { nom: "Ne souhaitent pas", valeur: d.appels.bilan.refus, texte: String(d.appels.bilan.refus), couleur: "#636370" },
                    { nom: "Ne plus contacter", valeur: d.appels.bilan.ne_plus_contacter, texte: String(d.appels.bilan.ne_plus_contacter), couleur: "#e33d3d" },
                    { nom: "Fauteuil repris", valeur: d.appels.bilan.minutes_creneaux, texte: `${Math.round(d.appels.bilan.minutes_creneaux / 60)} h`, couleur: "#5c67f4" },
                  ]} />
                </Carte>
              ) : null}
            </Section>
          ) : null}

          {obj && obj.fauteuils.length ? (
            <SectionPliable titre="Objectifs par fauteuil">
              <p className="in-texte">{obj.fauteuils.filter((f) => f.objectif && f.comptees && f.atteintes * 2 >= f.comptees).length} fauteuil(s) sur {obj.fauteuils.length} à l&apos;objectif au moins une semaine sur deux. Vous seul voyez ce tableau.</p>
              <div className="in-tableau" role="table" style={{ ["--in-cols" as string]: `160px 170px repeat(${semainesObj.length}, minmax(0, 1fr)) 80px` }}>
                <div className="in-tab-ligne in-tab-tete" role="row">
                  <span role="columnheader">Fauteuil</span>
                  <span role="columnheader">Objectif</span>
                  {semainesObj.map((s) => <span key={s.lundi} role="columnheader">{s.en_cours ? "Cette sem." : s.nature === "prevue" ? `${jourCourt(s.lundi)} (prévu)` : jourCourt(s.lundi)}</span>)}
                  <span role="columnheader">Tenu</span>
                </div>
                {obj.fauteuils.map((f) => <LigneObjectif key={f.fauteuil_id} f={f} semaines={semainesObj} />)}
              </div>
            </SectionPliable>
          ) : null}

          {syn ? (
            <SectionPliable titre={`Semaine du ${jourCourt(syn.semaine.du)} au ${jourCourt(syn.semaine.au)}`}>
              <p className="in-texte">Le lundi matin, la même synthèse arrive au point du matin du titulaire et de la direction.</p>
              <OutilsTableau invite="Chercher un centre" recherche={chercheSyn} setRecherche={setChercheSyn} telecharger={() => exporterCSV("tiroma-synthese-semaine", ["Centre", "Rendez-vous", "Manqués", "Taux de manqués", "Réinscription", "Créneaux libérés", "Devis signés", "Devis présentés", "Montant signé", "Plans sans rendez-vous", "Montant sans rendez-vous", "Appels", "Rendez-vous repris"], syn.cabinets.filter((c) => c.nom.toLowerCase().includes(chercheSyn.toLowerCase())).map((c) => [c.nom, c.rdv.passes, c.rdv.manques, pct(c.rdv.taux_manques), pct(c.reinscription?.taux), c.creneaux.liberes, c.devis.signes, c.devis.presentes, c.devis.montant_signe, c.plans_sans_rdv.nombre, c.plans_sans_rdv.montant, c.appels.appels, c.appels.rdv_pris]))} />
              <div className="in-tableau" role="table" style={{ ["--in-cols" as string]: "200px repeat(7, minmax(0, 1fr))" }}>
                <div className="in-tab-ligne in-tab-tete" role="row">
                  <span role="columnheader">Centre</span><span role="columnheader">Rendez-vous</span><span role="columnheader">Manqués</span><span role="columnheader">Réinscription</span><span role="columnheader">Créneaux libérés</span><span role="columnheader">Devis signés</span><span role="columnheader">Sans rendez-vous</span><span role="columnheader">Appels</span>
                </div>
                {syn.cabinets.filter((c) => c.nom.toLowerCase().includes(chercheSyn.toLowerCase())).map((c) => (
                  <div key={c.entite_id} className="in-tab-ligne" role="row">
                    <span className="in-tab-objet" role="cell"><PlainIcone nom="Batiment" taille={14} />{c.nom}</span>
                    <span role="cell">{c.rdv.passes}</span>
                    <span role="cell" className={(c.rdv.taux_manques ?? 0) >= 0.05 ? "in-sous" : undefined}>{c.rdv.manques} ({pct(c.rdv.taux_manques)})</span>
                    <span role="cell">{pct(c.reinscription?.taux)}</span>
                    <span role="cell">{c.creneaux.liberes}</span>
                    <span role="cell">{c.devis.signes}/{c.devis.presentes} · {euros(c.devis.montant_signe)}</span>
                    <span role="cell">{c.plans_sans_rdv.nombre} · {euros(c.plans_sans_rdv.montant)}</span>
                    <span role="cell">{c.appels.appels} · {c.appels.rdv_pris} repris</span>
                  </div>
                ))}
                <div className="in-tab-ligne in-tab-total" role="row">
                  <span role="cell">TOTAL</span><span role="cell">{syn.total.passes}</span><span role="cell">{syn.total.manques} ({pct(syn.total.taux_manques)})</span><span role="cell">{pct(syn.total.reinscription_taux)}</span><span role="cell">{syn.total.creneaux_liberes}</span><span role="cell">{syn.total.devis_signes}/{syn.total.devis_presentes} · {euros(syn.total.montant_signe)}</span><span role="cell">{syn.total.plans_sans_rdv} · {euros(syn.total.montant_plans_sans_rdv)}</span><span role="cell">{syn.total.appels}</span>
                </div>
              </div>
            </SectionPliable>
          ) : null}

          {p && p.en_attente.a_relancer_liste.length ? (
            <SectionPliable titre="Devis à relancer">
              <OutilsTableau invite="Chercher un patient ou un devis" recherche={chercheDevis} setRecherche={setChercheDevis} telecharger={() => exporterCSV("tiroma-devis-a-relancer", ["Patient", "Devis", "Présenté le", "Expire le", "Panier", "Montant", "Reste à charge"], p.en_attente.a_relancer_liste.filter((dv) => `${dv.patient_nom} ${dv.devis_numero ?? ""}`.toLowerCase().includes(chercheDevis.toLowerCase())).map((dv) => [dv.patient_nom, dv.devis_numero, dv.presente_le, dv.valide_jusqu_au, PANIERS[dv.panier ?? "non_precise"], dv.montant, dv.reste_a_charge]))} />
              <div className="in-tableau" role="table" style={{ ["--in-cols" as string]: "200px 150px 150px 150px minmax(0, 1fr) 130px" }}>
                <div className="in-tab-ligne in-tab-tete" role="row"><span role="columnheader">Patient</span><span role="columnheader">Devis</span><span role="columnheader">Présenté le</span><span role="columnheader">Expire le</span><span role="columnheader">Panier · montant</span><span role="columnheader" /></div>
                {p.en_attente.a_relancer_liste.filter((dv) => `${dv.patient_nom} ${dv.devis_numero ?? ""}`.toLowerCase().includes(chercheDevis.toLowerCase())).map((dv) => (
                  <div key={dv.plan_id} className="in-tab-ligne" role="row">
                    <Link href={`${RACINE}/tiroma/plans?plan=${encodeURIComponent(dv.plan_id)}`} className="in-tab-objet" role="cell">{dv.patient_nom}</Link>
                    <span role="cell">{dv.devis_numero ?? "—"}</span>
                    <span role="cell">{dv.presente_le ? jourCourt(dv.presente_le) : "—"}</span>
                    <span role="cell">{dv.valide_jusqu_au ? jourCourt(dv.valide_jusqu_au) : "—"}</span>
                    <span role="cell">{PANIERS[dv.panier ?? "non_precise"] ?? "—"} · {euros(dv.montant ?? 0)}</span>
                    <span role="cell">{registre ? <MenuAppel cible={{ patient_id: dv.patient_id, patient_nom: dv.patient_nom, motif: "devis", plan_id: dv.plan_id, evenement_id: null }} /> : null}</span>
                  </div>
                ))}
              </div>
            </SectionPliable>
          ) : null}

          {rei && rei.sans_suite.length ? (
            <SectionPliable titre="Vus sans prochain rendez-vous">
              <OutilsTableau invite="Chercher un patient ou un praticien" recherche={chercheSuite} setRecherche={setChercheSuite} telecharger={() => exporterCSV("tiroma-vus-sans-suite", ["Patient", "Vu le", "Praticien"], rei.sans_suite.filter((x) => `${x.patient_nom} ${x.praticien ?? ""}`.toLowerCase().includes(chercheSuite.toLowerCase())).map((x) => [d?.profil === "direction" ? "Patient du cabinet" : x.patient_nom, x.derniere_visite, x.praticien]))} />
              <div className="in-tableau" role="table" style={{ ["--in-cols" as string]: "240px 180px minmax(0, 1fr) 130px" }}>
                <div className="in-tab-ligne in-tab-tete" role="row"><span role="columnheader">Patient</span><span role="columnheader">Vu le</span><span role="columnheader">Praticien</span><span role="columnheader" /></div>
                {rei.sans_suite.filter((x) => `${x.patient_nom} ${x.praticien ?? ""}`.toLowerCase().includes(chercheSuite.toLowerCase())).map((s) => (
                  <div key={s.patient_id} className="in-tab-ligne" role="row">
                    <span className="in-tab-objet" role="cell">{d?.profil === "direction" ? "Patient du cabinet" : s.patient_nom}</span>
                    <span role="cell">{jourCourt(s.derniere_visite)}</span>
                    <span role="cell">{s.praticien ?? "—"}</span>
                    <span role="cell">{registre && d?.profil !== "direction" ? <MenuAppel cible={{ patient_id: s.patient_id, patient_nom: s.patient_nom, motif: "controle", plan_id: null, evenement_id: null }} /> : null}</span>
                  </div>
                ))}
              </div>
            </SectionPliable>
          ) : null}

          {d?.appels ? (
            <footer className="in-pied">
              <span className="in-pied-sur">30 derniers jours</span>
              <h3 className="in-pied-titre">Patients rappelés</h3>
              <span className="in-volets" aria-label={`${d.appels.bilan.patients} patients`}>
                {String(d.appels.bilan.patients).split("").map((c, i) => (
                  <span key={i} className="in-volet">{c}</span>
                ))}
              </span>
            </footer>
          ) : null}
        </div>
        {d && sidekick ? (
          <div className="in-sidekick" role="toolbar" aria-label="Assistant">
            <button
              type="button"
              className="in-sidekick-question"
              onClick={() => {
                const lignesR = [
                  `Pilotage du ${d.cabinet.entite_nom ?? "cabinet"}, ${new Date().toLocaleDateString("fr-FR", { dateStyle: "long" })}.`,
                  ...(p ? [`Devis acceptés : ${pct(p.devis.taux)} (${p.devis.signes} sur ${p.devis.presentes}) ; signé sans rendez-vous : ${euros(p.plans_sans_rdv.montant)} (${p.plans_sans_rdv.nombre} plans) ; manqués : ${pct(p.rendez_vous.taux_manques)}.`] : []),
                  ...(rei ? [`Réinscription : ${pct(rei.taux)} (${rei.reinscrits} sur ${rei.visites}).`] : []),
                  ...(obj ? obj.fauteuils.map((f) => `${f.nom} : moyenne ${pct(f.moyenne)}, objectif ${pct(f.objectif)}, tenu ${f.atteintes}/${f.comptees}.`) : []),
                  ...(d.appels ? [`Appels sur ${d.appels.bilan.jours} jours : ${d.appels.bilan.appels}, ${d.appels.bilan.rdv_pris} rendez-vous repris.`] : []),
                  "Question : qu'est-ce qui progresse et qu'est-ce qui recule ?",
                ];
                void copier(lignesR.join("\n")).then((ok) => { setAvisSk(ok ? "Copié : collez-le dans l'assistant de l'espace." : "Le presse-papier a refusé la copie."); window.setTimeout(() => setAvisSk(null), 3500); });
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ab5f" strokeWidth="2" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7z" /></svg>
              <strong>Copier pour l&apos;assistant</strong>
              <span>{avisSk ?? "qu'est-ce qui progresse, qu'est-ce qui recule ?"}</span>
              <kbd className="pl-kbd">B</kbd>
            </button>
            <button type="button" className="pl-icone-bouton" aria-label="Relire les chiffres" title={t.source === "reelle" ? "Relire les chiffres" : "Données d'exemple : rien à relire"} onClick={() => { if (t.source === "reelle") void t.relire(); else { setAvisSk("Données d'exemple : rien à relire."); window.setTimeout(() => setAvisSk(null), 3000); } }}>
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
