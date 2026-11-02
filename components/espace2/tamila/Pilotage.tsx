"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — Pilotage du cabinet (02/11/2026) : copie 1:1 d'Insights ›
   Reporting de Plain (releves/plain-insights.md). Seul le contenu change.

   Les cinq vues de B13 (une fenêtre dans l'écran d'avant), calculées dans
   le navigateur sur ce que la RLS laisse voir (pilotage.ts, inchangé) :
     Vue d'ensemble   dossiers vivants (courbe), marge du cabinet, sans
                      diligence ;
     Charge           temps saisi par jour, échéances par jour ; charge par
                      personne, échéances par personne, dossiers par …
                      (Grouper par) ;
     Marge            marge, taux réalisé et temps passé par dossier ;
     Séries, Sans diligence, Pièces attendues : répartitions.
   Boutons Filter · Group by · Timeframe · Granularity → Filtre (un
   responsable) · Grouper par · Période (7 à 90 jours : fenêtre des
   graphiques et seuil « sans diligence ») · Coût horaire (L8, gardé dans
   ce navigateur). Une ligne de répartition qui nomme un dossier mène à sa
   page (L5). Pied « Customers helped » → « Dossiers suivis ».
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { charges, marges, piecesAttendues, sansDiligence, series, type DonneesPilotage } from "@/components/espace/tamila/pilotage";
import { libelleMatiere } from "@/components/espace/tamila/regles";
import { RACINE } from "@/components/espace2/modules";
import { PlainCarte, useOuvert } from "./TamCadre";
import { PlainIcone, TamIcone, type NomTamIcone } from "./TamIcone";
import { useTamila } from "./donnees";
import { dateCourte } from "./echeances";
import { copier } from "./navigateur";
import "./tamp-pilotage.css";

const JOUR = 86_400_000;
const CLE_COUT = "omega.tamila.cout_horaire";
const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const heures = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const PERIODES = [7, 30, 60, 90];
type Groupe = "responsable" | "matiere" | "juridiction";

/* la largeur rendue d'un graphique (les textes restent à leur taille, comme Recharts) */
function useLargeur() {
  const ref = useRef<HTMLDivElement>(null);
  const [l, setL] = useState(316);
  useEffect(() => {
    const e = ref.current;
    if (!e) return;
    const o = new ResizeObserver(([x]) => setL(Math.max(120, Math.round(x.contentRect.width))));
    o.observe(e);
    return () => o.disconnect();
  }, []);
  return { ref, l };
}

const graduer = (max: number) => {
  const pas = max <= 3 ? 1 : max <= 6 ? 2 : Math.ceil(max / 3 / 5) * 5 || 1;
  return [0, pas, pas * 2, pas * 3];
};

function Barres({ valeurs, etiquettes, moyenne, couleurs }: { valeurs: number[]; etiquettes: [string, string]; moyenne?: string; couleurs?: (string | null)[] }) {
  const { ref, l } = useLargeur();
  const H = 155;
  const axe = 30;
  const w = l - axe;
  const haut = 140;
  const max = Math.max(1, ...valeurs.map(Math.abs));
  const ticks = graduer(max);
  const top = ticks[3];
  const n = valeurs.length || 1;
  const pas = w / n;
  const larg = Math.min(15, Math.max(3, pas - 2));
  const moy = valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : 0;
  const y = (v: number) => haut - (Math.max(0, v) / top) * (haut - 8);
  const vide = !valeurs.some((v) => v !== 0);
  return (
    <div ref={ref}>
      <svg className="tamp-graphe" width={l} height={H + 18} viewBox={`0 0 ${l} ${H + 18}`} role="img" aria-label={`${etiquettes[0]} → ${etiquettes[1]}`}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="tamp-grille-trait" x1={(w / 8) * i + 0.5} x2={(w / 8) * i + 0.5} y1={0} y2={haut} />
        ))}
        <line className="tamp-grille-trait" x1={0} x2={w} y1={haut + 0.5} y2={haut + 0.5} />
        {vide ? (
          <text x={w / 2} y={haut / 2} fontSize={12} textAnchor="middle" className="tamp-vide-graphe">
            Aucune donnée
          </text>
        ) : (
          valeurs.map((v, i) => {
            const c = couleurs?.[i] ?? (v === max ? "var(--p-barre-pic)" : v < max / 6 ? "var(--p-barre-faible)" : "var(--p-barre)");
            const h = Math.max(v ? 2 : 0, haut - y(Math.abs(v)));
            return <rect key={i} x={i * pas + (pas - larg) / 2} y={haut - h} width={larg} height={h} rx={2} fill={c} />;
          })
        )}
        {moyenne && !vide ? (
          <g>
            <line className="tamp-moyenne" x1={0} x2={w} y1={y(moy)} y2={y(moy)} />
            <g className="tamp-moyenne-etiquette" transform={`translate(2 ${Math.max(0, y(moy) - 14)})`}>
              <rect width={moyenne.length * 5.6 + 40} height={14} rx={4} />
              <text x={4} y={10.5} fontSize={10}>
                Moyenne <tspan style={{ fill: "var(--p-texte-1)" }}>{moyenne}</tspan>
              </text>
            </g>
          </g>
        ) : null}
        {ticks.slice(0, 4).map((t, i) => (
          <text key={t} x={w + 10} y={haut - (i / 3) * (haut - 8) + 4} fontSize={14}>
            {t}
          </text>
        ))}
        <text x={w * 0.3} y={H + 14} fontSize={12} textAnchor="middle">
          {etiquettes[0]}
        </text>
        <text x={w * 0.9} y={H + 14} fontSize={12} textAnchor="middle">
          {etiquettes[1]}
        </text>
      </svg>
    </div>
  );
}

function Courbe({ valeurs, etiquettes }: { valeurs: number[]; etiquettes: [string, string] }) {
  const { ref, l } = useLargeur();
  const H = 155;
  const axe = 30;
  const w = l - axe;
  const haut = 125;
  const max = Math.max(1, ...valeurs);
  const ticks = graduer(max).filter((_, i) => i % 1 === 0);
  const top = ticks[3];
  const pts = valeurs.map((v, i) => [(i / Math.max(1, valeurs.length - 1)) * w, haut - (v / top) * (haut - 8)] as const);
  const ligne = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${yy.toFixed(1)}`).join(" ");
  return (
    <div ref={ref}>
      <svg className="tamp-graphe" width={l} height={H} viewBox={`0 0 ${l} ${H}`} role="img" aria-label="Évolution">
        <defs>
          <linearGradient id="tamp-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5c67f4" stopOpacity={0.3} />
            <stop offset="1" stopColor="#5c67f4" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} className="tamp-grille-trait" x1={(w / 8) * i + 0.5} x2={(w / 8) * i + 0.5} y1={0} y2={haut} />
        ))}
        {pts.length ? <path d={`${ligne} L${w} ${haut} L0 ${haut} Z`} fill="url(#tamp-aire)" opacity={0.6} /> : null}
        {pts.length ? <path d={ligne} fill="none" stroke="#5c67f4" strokeWidth={1.5} /> : null}
        {[0, 1, 3].map((i) => (
          <text key={i} x={w + 10} y={haut - (i / 3) * (haut - 8) + 4} fontSize={14}>
            {ticks[i]}
          </text>
        ))}
        <text x={w * 0.68} y={haut + 20} fontSize={12} textAnchor="middle">
          {etiquettes[1]}
        </text>
      </svg>
    </div>
  );
}

type LigneRep = { cle: string; nom: string; valeur: number; libelle: string; href?: string; icone?: NomTamIcone; couleur?: string; badge?: { texte: string; ton: "rouge" | "ambre" } };
function Repartition({ lignes, vide }: { lignes: LigneRep[]; vide: [string, string] }) {
  if (!lignes.length)
    return (
      <div className="tamp-encadre">
        <b>{vide[0]}</b>
        {vide[1]}
      </div>
    );
  const max = Math.max(1, ...lignes.map((l) => Math.abs(l.valeur)));
  return (
    <div className="tamp-repartition">
      {lignes.map((l) => {
        const corps = (
          <>
            <span className="tamp-rep-nom">
              <TamIcone nom={l.icone ?? "Project"} taille={18} />
              <span>{l.nom}</span>
            </span>
            <span className="tamp-rep-barre">
              <span style={{ width: `${(Math.abs(l.valeur) / max) * 100}%`, background: l.couleur ?? "var(--p-icone-2)" }} />
            </span>
            <span className="tamp-rep-valeur">
              {l.libelle}
              {l.badge ? (
                <span className="tamp-badge" data-ton={l.badge.ton}>
                  {l.badge.texte}
                </span>
              ) : null}
            </span>
          </>
        );
        return l.href ? (
          <Link key={l.cle} className="tamp-rep-ligne" href={l.href}>
            {corps}
          </Link>
        ) : (
          <div key={l.cle} className="tamp-rep-ligne">
            {corps}
          </div>
        );
      })}
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  return (
    <section className="tamp-rsection" aria-label={titre}>
      <div className="tamp-rsection-titre">
        <button type="button" aria-expanded={ouverte} onClick={() => setOuverte((o) => !o)}>
          <h2 style={{ font: "inherit" }}>{titre}</h2>
          <TamIcone nom="Chevron" taille={14} style={{ transform: ouverte ? "rotate(90deg)" : undefined }} />
        </button>
      </div>
      {ouverte ? children : null}
    </section>
  );
}

function Carte({ titre, aide, valeur, suffixe, signal, children }: { titre: string; aide: string; valeur: string; suffixe: string; signal?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="tamp-rcarte">
      <div className="tamp-rcarte-tete">
        {titre}
        <span title={aide} aria-label={aide} style={{ display: "flex" }}>
          {/* l'icône d'information de Plain (cercle et « i », 14) */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20m0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16m0 6a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-5a1 1 0 0 1 1-1m0-3.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5" />
          </svg>
        </span>
        {signal}
        {/* « Ask Agent » de Plain : copier la carte pour l'assistant */}
        <button
          type="button"
          className="tamp-icone tamp-agent"
          style={{ marginLeft: signal ? 0 : "auto", width: 26, height: 26, padding: 5 }}
          aria-label={`Copier « ${titre} » pour l'assistant`}
          title="Copier pour l'assistant : la valeur de la carte et ce qu'elle mesure"
          onClick={(e) => {
            const carte = (e.currentTarget.closest(".tamp-rcarte") as HTMLElement | null)?.innerText ?? "";
            void copier(`${titre} : ${valeur} ${suffixe}\n${aide}\n${carte.split("\n").slice(2).join("\n")}`);
          }}
        >
          <TamIcone nom="Comment" taille={14} />
        </button>
      </div>
      <div className="tamp-rvaleur">
        {valeur} <span>{suffixe}</span>
      </div>
      {children}
    </div>
  );
}

export default function Pilotage() {
  const t = useTamila();
  const [periode, setPeriode] = useState(30);
  const [groupe, setGroupe] = useState<Groupe>("responsable");
  const [responsable, setResponsable] = useState<string | null>(null);
  const [cout, setCout] = useState(9000);
  const [maintenant] = useState(() => Date.now());
  const { ouvert: fOuvert, setOuvert: ouvrirF, boite: boiteF } = useOuvert<HTMLDivElement>();
  const { ouvert: gOuvert, setOuvert: ouvrirG, boite: boiteG } = useOuvert<HTMLDivElement>();
  const { ouvert: pOuvert, setOuvert: ouvrirP, boite: boiteP } = useOuvert<HTMLDivElement>();
  const { ouvert: cOuvert, setOuvert: ouvrirC, boite: boiteC } = useOuvert<HTMLDivElement>();
  const { lireAnnexes } = t;
  useEffect(() => lireAnnexes(), [lireAnnexes]);
  useEffect(() => {
    const h = window.setTimeout(() => {
      try {
        const v = parseInt(window.localStorage.getItem(CLE_COUT) ?? "", 10);
        if (Number.isFinite(v) && v >= 1000 && v <= 100000) setCout(v);
      } catch {
        /* le coût par défaut */
      }
    }, 0);
    return () => window.clearTimeout(h);
  }, []);
  const poserCout = (texte: string) => {
    const v = Math.round(parseFloat(texte.replace(",", ".")) * 100);
    if (!Number.isFinite(v) || v < 1000 || v > 100000) return;
    setCout(v);
    try {
      window.localStorage.setItem(CLE_COUT, String(v));
    } catch {
      /* le réglage vaut pour la séance */
    }
  };

  const lignes = useMemo(() => t.lignes.filter((l) => !responsable || l.dossier.responsable_id === responsable), [t.lignes, responsable]);
  const ids = useMemo(() => new Set(lignes.map((l) => l.dossier.id)), [lignes]);
  const donnees: DonneesPilotage | null = useMemo(
    () =>
      t.annexes
        ? {
            ...t.annexes,
            dossiers: lignes.map((l) => ({ dossier: l.dossier, clair: l.clair })),
            delais: t.delaisCabinet.filter((x) => ids.has(x.dossier_id)),
            audiences: t.audiencesCabinet.filter((x) => ids.has(x.dossier_id)),
            personnes: t.personnes,
          }
        : null,
    [t.annexes, lignes, ids, t.delaisCabinet, t.audiencesCabinet, t.personnes],
  );
  const m = useMemo(() => (donnees ? marges(donnees, cout, maintenant) : []), [donnees, cout, maintenant]);
  const c = useMemo(() => (donnees ? charges(donnees, maintenant) : []), [donnees, maintenant]);
  const s = useMemo(() => (donnees ? series(donnees) : []), [donnees]);
  const sd = useMemo(() => (donnees ? sansDiligence(donnees, maintenant, periode) : []), [donnees, maintenant, periode]);
  const pa = useMemo(() => (donnees ? piecesAttendues(donnees, maintenant) : []), [donnees, maintenant]);

  const jours = Array.from({ length: periode }, (_, i) => new Date(maintenant - (periode - 1 - i) * JOUR).toISOString().slice(0, 10));
  const avenir = Array.from({ length: periode }, (_, i) => new Date(maintenant + i * JOUR).toISOString().slice(0, 10));
  const vivantsLe = jours.map((j) => lignes.filter((l) => ["attente", "ouvert", "audit", "clos"].includes(l.dossier.statut) && (l.dossier.ouvert_le ?? l.dossier.cree_le).slice(0, 10) <= j && (!l.dossier.clos_le || l.dossier.clos_le.slice(0, 10) > j)).length);
  const vivants = lignes.filter((l) => ["attente", "ouvert", "audit"].includes(l.dossier.statut)).length;
  const tempsJour = jours.map((j) => Object.entries(donnees?.honoraires ?? {}).filter(([d]) => ids.has(d)).flatMap(([, h]) => h.temps).filter((x) => x.statut !== "annule" && x.jour === j).reduce((a, x) => a + x.minutes, 0));
  const tempsTotal = tempsJour.reduce((a, v) => a + v, 0);
  const echeancesJour = avenir.map((j) => (donnees?.delais.filter((x) => ["a_confirmer", "confirme"].includes(x.statut) && x.echeance_retenue === j).length ?? 0) + (donnees?.audiences.filter((a) => a.statut === "prevue" && a.date_heure.slice(0, 10) === j).length ?? 0));
  const echeancesTotal = echeancesJour.reduce((a, v) => a + v, 0);
  const margeTotale = m.reduce((a, x) => a + x.margeCents, 0);
  const lien = (id: string) => `${RACINE}/tamila/dossiers/${id}`;
  const nomDossier = (clair: { reference: string; intitule: string } | null) => (clair ? `${clair.reference} · ${clair.intitule}` : "Dossier chiffré");

  const parGroupe = (() => {
    const map = new Map<string, number>();
    for (const l of lignes.filter((x) => ["attente", "ouvert", "audit"].includes(x.dossier.statut))) {
      const k = groupe === "responsable" ? t.nomDe(l.dossier.responsable_id) : groupe === "matiere" ? libelleMatiere(l.dossier.matiere) : (l.dossier.juridiction ?? "—");
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();
  const COULEURS = ["#5c67f4", "#1bd379", "#ab4aba", "#ffcb14", "#e33d3d", "#636370"];
  const LIBELLES_GROUPE: Record<Groupe, string> = { responsable: "responsable", matiere: "matière", juridiction: "juridiction" };

  return (
    <PlainCarte>
      <div className="tamp-rapport">
        <header className="tamp-rtete">
          <h1 className="tamp-titre">Pilotage du cabinet</h1>
          <div className="tamp-rboutons">
            <div ref={boiteF} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="menu" aria-expanded={fOuvert} onClick={() => ouvrirF((o) => !o)}>
                <PlainIcone nom="Filtres" taille={14} />
                {responsable ? t.nomDe(responsable) : "Filtre"}
              </button>
              {fOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 235 }}>
                  <button type="button" role="menuitemradio" aria-checked={!responsable} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (setResponsable(null), ouvrirF(false))}>
                    Tout le cabinet {!responsable ? "✓" : ""}
                  </button>
                  {t.personnes.map((p) => (
                    <button key={p.user_id} type="button" role="menuitemradio" aria-checked={responsable === p.user_id} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (setResponsable(p.user_id), ouvrirF(false))}>
                      {p.nom} {responsable === p.user_id ? "✓" : ""}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={boiteG} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="menu" aria-expanded={gOuvert} onClick={() => ouvrirG((o) => !o)}>
                <TamIcone nom="Users" taille={14} />
                Grouper par
              </button>
              {gOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 235 }}>
                  {(Object.keys(LIBELLES_GROUPE) as Groupe[]).map((g) => (
                    <button key={g} type="button" role="menuitemradio" aria-checked={groupe === g} className="tamp-menu-option tamp-menu-option--grand" onClick={() => (setGroupe(g), ouvrirG(false))}>
                      <span style={{ flex: 1 }}>{LIBELLES_GROUPE[g].charAt(0).toUpperCase() + LIBELLES_GROUPE[g].slice(1)}</span>
                      {groupe === g ? "✓" : ""}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={boiteP} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="menu" aria-expanded={pOuvert} onClick={() => ouvrirP((o) => !o)}>
                Période <span>{periode} derniers jours</span>
                <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
              </button>
              {pOuvert ? (
                <div className="tamp-menu" role="menu" style={{ top: 34, right: 0, width: 199 }}>
                  {PERIODES.map((p) => (
                    <button key={p} type="button" role="menuitemradio" aria-checked={periode === p} className="tamp-menu-option tamp-menu-option--grand" style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }} onClick={() => (setPeriode(p), ouvrirP(false))}>
                      <span>
                        {p} derniers jours {periode === p ? "✓" : ""}
                      </span>
                      <small style={{ color: "var(--p-texte-2)" }}>
                        {dateCourte(new Date(maintenant - (p - 1) * JOUR).toISOString())} – {dateCourte(new Date(maintenant).toISOString())}
                      </small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={boiteC} style={{ position: "relative" }}>
              <button type="button" className="tamp-borde" aria-haspopup="dialog" aria-expanded={cOuvert} onClick={() => ouvrirC((o) => !o)}>
                Coût horaire <span>{euros(cout)}</span>
                <TamIcone nom="Chevron" taille={14} style={{ transform: "rotate(90deg)" }} />
              </button>
              {cOuvert ? (
                <div className="tamp-menu" role="dialog" aria-label="Coût de revient d'une heure" style={{ top: 34, right: 0, width: 220, padding: 12 }}>
                  <label className="tamp-borde" style={{ border: 0, padding: 0, height: "auto", flexDirection: "column", alignItems: "flex-start", gap: 6, background: "transparent" }}>
                    Coût de revient d&apos;une heure (€)
                    <input inputMode="decimal" defaultValue={String(cout / 100)} key={cout} onBlur={(e) => poserCout(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (poserCout((e.target as HTMLInputElement).value), ouvrirC(false))} style={{ width: "100%" }} />
                    <span>Reste dans ce navigateur.</span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="tamp-rzone">
          {!donnees ? <p className="tamp-rpied">Lecture du cabinet…</p> : null}
          {donnees ? (
            <>
              <Section titre="Vue d'ensemble">
                <div className="tamp-rgrille">
                  <Carte titre="Dossiers vivants" aide="Ouverts, en audit ou en attente d'ouverture, sur les dossiers que vous voyez." valeur={String(vivants)} suffixe="ouverts aujourd'hui">
                    <Courbe valeurs={vivantsLe} etiquettes={[dateCourte(jours[0]), "Aujourd'hui"]} />
                  </Carte>
                  <Carte titre="Marge du cabinet" aide="Facturé et à facturer HT, moins le temps passé au coût de revient d'une heure." valeur={euros(margeTotale)} suffixe={`au coût de ${euros(cout)} / h`}>
                    <Barres valeurs={m.slice(0, 30).map((x) => Math.round(x.margeCents / 100))} couleurs={m.slice(0, 30).map((x) => (x.margeCents < 0 ? "#e33d3d" : null))} etiquettes={["Par dossier", ""]} />
                  </Carte>
                  <Carte titre="Sans diligence" aide={`Dossiers vivants sans temps, acte, audience, avis ni pièce depuis ${periode} jours.`} valeur={String(sd.length)} suffixe={`depuis ${periode} jours`}>
                    <Barres valeurs={sd.map((x) => x.jours)} etiquettes={["Par dossier", ""]} />
                  </Carte>
                </div>
              </Section>

              <Section titre="Charge">
                <div className="tamp-rgrille tamp-rgrille--2">
                  <Carte
                    titre="Temps saisi par jour"
                    aide="Le temps passé saisi au cabinet, jour par jour."
                    valeur={heures(tempsTotal)}
                    suffixe="au total"
                    signal={
                      tempsJour.some((v) => v > 0) && Math.max(...tempsJour) > 3 * (tempsTotal / periode) ? (
                        <span className="tamp-signal">
                          <TamIcone nom="Alert" taille={14} />
                          Un jour chargé à regarder
                        </span>
                      ) : undefined
                    }
                  >
                    <Barres valeurs={tempsJour.map((v) => Math.round(v / 6) / 10)} etiquettes={[dateCourte(jours[Math.floor(periode / 2)]), "Aujourd'hui"]} moyenne={`${Math.round((tempsTotal / periode / 60) * 10) / 10} h`} />
                  </Carte>
                  <Carte titre="Échéances par jour" aide="Délais courants et audiences prévues, jour par jour, à partir d'aujourd'hui." valeur={String(echeancesTotal)} suffixe="à venir">
                    <Barres valeurs={echeancesJour} etiquettes={["Aujourd'hui", dateCourte(avenir[avenir.length - 1])]} moyenne={String(Math.round((echeancesTotal / periode) * 10) / 10)} />
                  </Carte>
                </div>
                <div className="tamp-rgrille">
                  <Carte titre="Temps saisi par personne" aide="Les trente derniers jours." valeur={heures(c.reduce((a, x) => a + x.minutes30, 0))} suffixe="30 derniers jours">
                    <Repartition
                      lignes={c.filter((x) => x.minutes30 || x.dossiers).slice(0, 6).map((x, i) => ({ cle: x.personne.user_id, nom: x.personne.nom, valeur: x.minutes30, libelle: heures(x.minutes30), icone: "Users", couleur: COULEURS[i % COULEURS.length] }))}
                      vide={["Aucune donnée", "Aucun temps saisi sur la période"]}
                    />
                  </Carte>
                  <Carte titre="Échéances par personne" aide="Délais et audiences des trente prochains jours, par personne." valeur={String(c.reduce((a, x) => a + x.delais30 + x.audiences30, 0))} suffixe="30 prochains jours">
                    <Repartition
                      lignes={c.filter((x) => x.delais30 + x.audiences30).slice(0, 6).map((x, i) => ({ cle: x.personne.user_id, nom: x.personne.nom, valeur: x.delais30 + x.audiences30, libelle: `${x.delais30} délai${x.delais30 > 1 ? "s" : ""} · ${x.audiences30} aud.`, icone: "Calendar", couleur: COULEURS[i % COULEURS.length] }))}
                      vide={["Aucune donnée", "Aucune échéance à trente jours"]}
                    />
                  </Carte>
                  <Carte titre={`Dossiers par ${LIBELLES_GROUPE[groupe]}`} aide="Les dossiers vivants, selon « Grouper par »." valeur={String(vivants)} suffixe="dossiers vivants">
                    <Repartition lignes={parGroupe.map(([k, v], i) => ({ cle: k, nom: k, valeur: v, libelle: String(v), icone: groupe === "responsable" ? "Users" : groupe === "matiere" ? "Label" : "Judge", couleur: COULEURS[i % COULEURS.length] }))} vide={["Aucune donnée", "Aucun dossier vivant"]} />
                  </Carte>
                </div>
              </Section>

              <Section titre="Marge par dossier">
                <div className="tamp-rgrille">
                  <Carte titre="Marge" aide="Facturé et à facturer HT, moins le coût du temps passé." valeur={String(m.filter((x) => x.margeCents < 0).length)} suffixe="dossier(s) à marge négative">
                    <Repartition
                      lignes={[...m].sort((a, b) => a.margeCents - b.margeCents).slice(0, 6).map((x) => ({ cle: x.dossier.id, nom: nomDossier(x.clair), valeur: x.margeCents, libelle: euros(x.margeCents), href: lien(x.dossier.id), couleur: x.margeCents < 0 ? "#e33d3d" : "#5c67f4", badge: x.margeCents < 0 ? { texte: "négative", ton: "rouge" as const } : undefined }))}
                      vide={["Aucune donnée", "Aucun temps ni honoraire saisi"]}
                    />
                  </Carte>
                  <Carte titre="Taux réalisé" aide="Ce qu'a rapporté une heure passée : facturé et à facturer HT, divisé par le temps." valeur={m.length ? euros(Math.round(m.reduce((a, x) => a + x.factureHt + x.aFacturerHt, 0) / Math.max(1, m.reduce((a, x) => a + x.minutes, 0) / 60))) : "—"} suffixe="par heure, en moyenne">
                    <Repartition
                      lignes={m.filter((x) => x.tauxRealiseCents).sort((a, b) => (b.tauxRealiseCents ?? 0) - (a.tauxRealiseCents ?? 0)).slice(0, 6).map((x) => ({ cle: x.dossier.id, nom: nomDossier(x.clair), valeur: x.tauxRealiseCents ?? 0, libelle: `${euros(x.tauxRealiseCents ?? 0)} / h`, href: lien(x.dossier.id), couleur: "#1bd379" }))}
                      vide={["Aucune donnée", "Aucune heure saisie"]}
                    />
                  </Carte>
                  <Carte titre="Temps passé" aide="Tout le temps saisi du dossier." valeur={heures(m.reduce((a, x) => a + x.minutes, 0))} suffixe="au total">
                    <Repartition
                      lignes={[...m].sort((a, b) => b.minutes - a.minutes).slice(0, 6).map((x) => ({ cle: x.dossier.id, nom: nomDossier(x.clair), valeur: x.minutes, libelle: heures(x.minutes), href: lien(x.dossier.id), couleur: "#ab4aba" }))}
                      vide={["Aucune donnée", "Aucun temps saisi"]}
                    />
                  </Carte>
                </div>
              </Section>

              <Section titre="Séries, diligence et pièces attendues">
                <div className="tamp-rgrille">
                  <Carte titre="Séries" aide="Deux dossiers contre la même partie, ou trois dans la même matière devant la même juridiction." valeur={String(s.length)} suffixe="série(s)">
                    <Repartition
                      lignes={s.slice(0, 6).map((x) => ({ cle: x.cle, nom: x.nature === "partie" ? x.libelle : `${libelleMatiere(x.dossiers[0].dossier.matiere ?? "")} · ${x.libelle}`, valeur: x.dossiers.length, libelle: `${x.dossiers.length} dossiers`, href: lien(x.dossiers[0].dossier.id), icone: x.nature === "partie" ? "Users" : "Label", couleur: "#5c67f4" }))}
                      vide={["Aucune série", "Pas deux dossiers contre la même partie, ni trois dans la même matière devant la même juridiction."]}
                    />
                  </Carte>
                  <Carte titre="Sans diligence" aide="Dernier mouvement : temps, acte, audience, avis ou pièce." valeur={String(sd.length)} suffixe={`depuis ${periode} jours`}>
                    <Repartition
                      lignes={sd.slice(0, 6).map((x) => ({ cle: x.dossier.id, nom: nomDossier(x.clair), valeur: x.jours, libelle: `${x.jours} j`, href: lien(x.dossier.id), couleur: x.jours >= 90 ? "#e33d3d" : "#ffcb14", badge: { texte: `depuis le ${dateCourte(x.derniere)}`, ton: x.jours >= 90 ? ("rouge" as const) : ("ambre" as const) } }))}
                      vide={["Rien à signaler", `Chaque dossier vivant a bougé dans les ${periode} derniers jours.`]}
                    />
                  </Carte>
                  <Carte titre="Pièces attendues" aide="Convention signée sans exemplaire, accusé RPVA, pièce d'identité, expertise, pièces demandées, dossier sans pièce." valeur={String(pa.length)} suffixe="à obtenir">
                    <Repartition
                      lignes={pa.slice(0, 6).map((x, i) => ({ cle: `${x.dossier.id}-${i}`, nom: `${x.clair?.reference ?? "Chiffré"} · ${x.quoi}`, valeur: x.gravite === "rouge" ? 2 : 1, libelle: x.gravite === "rouge" ? "urgent" : "à suivre", href: lien(x.dossier.id), icone: "Attachment", couleur: x.gravite === "rouge" ? "#e33d3d" : "#ffcb14" }))}
                      vide={["Aucune pièce attendue", "Tout ce que le cabinet attend est arrivé."]}
                    />
                  </Carte>
                </div>
              </Section>

              <div className="tamp-rpied">
                <span>Depuis l&apos;ouverture de Tamila</span>
                <h3>Dossiers suivis</h3>
                <span className="tamp-volets" aria-label={`${t.lignes.length} dossiers`}>
                  {String(t.lignes.length)
                    .padStart(3, "0")
                    .split("")
                    .map((ch, i) => (
                      <span key={i}>{ch}</span>
                    ))}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </PlainCarte>
  );
}
