"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Demandes reçues » du pilotage (09/10/2026)

   DUPLIQUÉ de components/espace2/TableauDemandes.tsx : même titre et
   mêmes raccourcis, trois cartes à jauge en pastilles, deux cartes à vues
   (la carte de chaleur, la courbe, les colonnes ; les listes), puis la
   liste dessous. Le contenu est la prospection : les prospects suivis
   (omega_lignes « clients ») et l'activité d'appel sur la liste des
   entreprises (omega_prospects).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import Choix from "./Choix";
import { useMemo, useState } from "react";
import { Building2, CheckCheck, ChevronLeft, ChevronRight, ClipboardCheck, Inbox, Info, Bell, Users } from "lucide-react";
import { Chiffre } from "@/components/espace2/vivant";
import type { Ligne } from "./Tableaux";
import type { Secteur } from "@/lib/omega/donnees";

const JOUR = 86_400_000;
const R = "/omega";
const PERIODES = [
  { cle: 30, libelle: "30 derniers jours" },
  { cle: 91, libelle: "3 derniers mois" },
  { cle: 365, libelle: "12 derniers mois" },
] as const;
const ETAPES: [string, string][] = [["À contacter", "À cont."], ["Audit réservé", "Rés."], ["Audit tenu", "Tenu"], ["Récap envoyé", "Récap"], ["Signé", "Signé"], ["Installé", "Inst."], ["En réel", "Réel"], ["Perdu", "Perdu"]];
const SIGNES = ["Signé", "Installé", "En rodage", "En réel", "Bilan J30 fait", "SaaS métier en route", "2e offre proposée", "Engagement annuel"];
const SOURCES = ["Réseau", "Recommandation", "Appel à froid", "Visite", "Partenaire"];

const minuit = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const jourCourt = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function DemandesOmega({ lignes, secteurs, contacts }: { lignes: Ligne[]; secteurs: Secteur[]; contacts: string[] }) {
  const [periode, setPeriode] = useState<number>(91);
  const [aujourdhui] = useState(() => minuit(Date.now()));

  const c = useMemo(() => {
    const debut = aujourdhui - (periode - 1) * JOUR;
    const clients = lignes.filter((l) => l.tableau === "clients" && l.donnees["Client"]);
    const enCours = clients.filter((l) => !SIGNES.includes(l.donnees["Étape"]) && l.donnees["Étape"] !== "Perdu");
    const signes = clients.filter((l) => SIGNES.includes(l.donnees["Étape"]));
    const perdus = clients.filter((l) => l.donnees["Étape"] === "Perdu");
    const sources = SOURCES.filter((s) => clients.some((l) => (l.donnees["Source"] ?? "").toLowerCase().includes(s.toLowerCase())));
    /* l'activité : chaque prospect de la liste dont le statut a bougé, et chaque fiche suivie modifiée */
    const dates = [...contacts, ...clients.map((l) => l.maj).filter((x): x is string => !!x)].map((x) => new Date(x).getTime()).filter((t) => t >= debut);
    const parJour = new Map<number, number>();
    for (const t of dates) parJour.set(minuit(t), (parJour.get(minuit(t)) ?? 0) + 1);
    let pic: { t: number; n: number } | null = null;
    for (const [t, n] of parJour) if (!pic || n > pic.n) pic = { t, n };
    const semaines = Math.ceil(periode / 7);
    const seaux: { libelle: string; n: number }[] = [];
    for (let i = semaines - 1; i >= 0; i--) {
      const b = aujourdhui + JOUR - i * 7 * JOUR;
      const a = b - 7 * JOUR;
      seaux.push({ libelle: jourCourt(a), n: dates.filter((t) => t >= a && t < b).length });
    }
    const barres = ETAPES.map(([cle, court]) => ({ cle, court, n: clients.filter((l) => (l.donnees["Étape"] ?? "À contacter") === cle).length }));
    const prochaines = enCours.slice().sort((a, b) => (a.donnees["Date"] ?? "99").localeCompare(b.donnees["Date"] ?? "99"));
    return { clients, enCours, signes, perdus, sources, parJour, pic, seaux, barres, prochaines, debut, total: dates.length };
  }, [lignes, contacts, periode, aujourdhui]);

  const total = c.clients.length;
  const barreMax = c.barres.reduce((m, x) => (x.n > m.n ? x : m), c.barres[0]);
  const aProspecter = secteurs.reduce((s, x) => s + x.total, 0);

  return (
    <div className="v2-dr v2-vivant">
      <div className="v2-dr-titre">
        <h2>Vue d&apos;ensemble</h2>
        <span className="v2-dr-titre-actions">
          <Link href={`${R}/audit`} className="v2-val-bouton">
            <ClipboardCheck width={16} height={16} aria-hidden="true" /> Lancer un audit
          </Link>
          <Link href={`${R}/point`} className="v2-val-bouton">
            <Bell width={16} height={16} aria-hidden="true" /> Relances du jour
          </Link>
          <Choix forme="bouton" etiquette="Période" valeur={String(periode)} onChange={(v) => setPeriode(Number(v))} options={PERIODES.map((p) => ({ cle: String(p.cle), libelle: p.libelle }))} />
          <a href="#ecran" className="v2-dr-principal">
            <Inbox width={16} height={16} aria-hidden="true" /> Ouvrir les prospects{c.enCours.length ? ` (${c.enCours.length})` : ""}
          </a>
        </span>
      </div>

      <div className="v2-dr-trois">
        <Jauge icone={Inbox} titre="En cours" lien="#ecran" fort={String(c.enCours.length)} faible={` / ${total} prospect${total > 1 ? "s" : ""} suivi${total > 1 ? "s" : ""}`} part={total ? c.enCours.length / total : 0} pied={c.prochaines[0] ? `Prochain : ${c.prochaines[0].donnees["Client"]}${c.prochaines[0].donnees["Date"] ? ` (${c.prochaines[0].donnees["Date"]})` : ""}` : "Aucun prospect en cours"} />
        <Jauge icone={Users} titre="Sources" lien="#ecran" fort={String(c.sources.length)} faible={` / ${SOURCES.length} utilisées`} part={c.sources.length / SOURCES.length} pied={c.sources.join(" · ") || "Réseau, recommandation, appel, visite, partenaire"} />
        <Jauge icone={CheckCheck} titre="Signés" lien="#ecran" fort={String(c.signes.length)} faible={` / ${total} (${total ? Math.round((c.signes.length / total) * 100) : 0} %)`} part={total ? c.signes.length / total : 0} pied={`${c.perdus.length} perdu${c.perdus.length > 1 ? "s" : ""} · objectif 20 clients`} />
      </div>

      <div className="v2-dr-principale">
        <Carrousel
          vues={[
            {
              titre: "Activité",
              contenu: (
                <>
                  <p className="v2-dr-pic">
                    <span>Pic :</span> {c.pic ? `${c.pic.n} contact${c.pic.n > 1 ? "s" : ""} (${jourCourt(c.pic.t)})` : "aucun contact sur la période"}{" "}
                    <Info width={14} height={14} aria-label="Le jour avec le plus de prospects contactés ou mis à jour" />
                  </p>
                  <Chaleur debut={c.debut} fin={aujourdhui} parJour={c.parJour} />
                </>
              ),
            },
            {
              titre: "Contacts par semaine",
              contenu: (
                <>
                  <p className="v2-dr-sous">
                    Moy. {(c.seaux.reduce((s, x) => s + x.n, 0) / Math.max(1, c.seaux.length)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} <strong>/ semaine</strong>
                  </p>
                  <Courbe seaux={c.seaux} />
                </>
              ),
            },
            {
              titre: "Par étape",
              contenu: (
                <>
                  <p className="v2-dr-sous">
                    {total} <strong>prospects suivis</strong>
                  </p>
                  <Colonnes barres={c.barres} max={barreMax.cle} />
                  <p className="v2-dr-note">
                    <Inbox width={16} height={16} aria-hidden="true" />
                    <strong>{barreMax.cle}</strong> : {barreMax.n} prospect{barreMax.n > 1 ? "s" : ""} <span>({total ? Math.round((barreMax.n / total) * 100) : 0} % du suivi)</span>
                  </p>
                </>
              ),
            },
          ]}
        />
        <Carrousel
          liste
          vues={[
            {
              titre: "Prochaines actions",
              contenu: (
                <ul className="v2-dr-liste">
                  {c.prochaines.length ? (
                    c.prochaines.slice(0, 6).map((l, i) => (
                      <li key={l.id} data-premier={i === 0 ? "" : undefined}>
                        <Users width={18} height={18} aria-hidden="true" />
                        <span>
                          <span>{l.donnees["Client"]}</span>
                          <small>{[l.donnees["Étape"], l.donnees["Prochaine action"], l.donnees["Date"]].filter(Boolean).join(" · ")}</small>
                        </span>
                        <a href="#ecran" aria-label={`Voir ${l.donnees["Client"]}`}>
                          <ChevronRight width={16} height={16} aria-hidden="true" />
                        </a>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span>
                        <small>Aucun prospect en cours : ajoute-en un depuis la liste des entreprises.</small>
                      </span>
                    </li>
                  )}
                </ul>
              ),
            },
            {
              titre: `Entreprises à prospecter (${aProspecter.toLocaleString("fr-FR")})`,
              contenu: (
                <ul className="v2-dr-liste">
                  {secteurs.slice(0, 7).map((s) => (
                    <li key={s.secteur}>
                      <Building2 width={18} height={18} aria-hidden="true" />
                      <span>
                        <span>{s.secteur}</span>
                        <small>
                          {s.total.toLocaleString("fr-FR")} · {s.avec_tel} avec tél. · {s.moteurs.join(", ")}
                        </small>
                      </span>
                      <Link href={`${R}/entreprises?secteur=${encodeURIComponent(s.secteur)}`} aria-label={`Prospecter : ${s.secteur}`}>
                        <ChevronRight width={16} height={16} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/* ——— une carte à plusieurs vues : le titre de la vue, des points, et
   deux flèches au bord droit pour passer de l'une à l'autre ——— */
function Carrousel({ vues, liste }: { vues: { titre: string; contenu: React.ReactNode }[]; liste?: boolean }) {
  const [i, setI] = useState(0);
  const aller = (d: number) => setI((x) => (x + d + vues.length) % vues.length);
  const v = vues[i];
  return (
    <section className={`v2-dr-carte v2-dr-carrousel${liste ? " v2-dr-carrousel--liste" : ""}`} aria-label={v.titre} aria-roledescription="carrousel">
      <div className="v2-dr-carrousel-tete">
        <h3>{v.titre}</h3>
        <span className="v2-dr-points" aria-hidden="true">
          {vues.map((x, k) => (
            <i key={x.titre} data-actif={k === i ? "" : undefined} />
          ))}
        </span>
        <span className="v2-dr-fleches">
          <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Vue précédente" onClick={() => aller(-1)}>
            <ChevronLeft width={16} height={16} />
          </button>
          <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Vue suivante" onClick={() => aller(1)}>
            <ChevronRight width={16} height={16} />
          </button>
        </span>
      </div>
      <div className="v2-dr-carrousel-corps" aria-live="polite">
        {v.contenu}
      </div>
    </section>
  );
}

/* ——— une carte à jauge en pastilles ——— */
function Jauge({ icone: Icone, titre, lien, fort, faible, part, pied }: { icone: typeof Inbox; titre: string; lien: string; fort: string; faible: string; part: number; pied: string }) {
  const N = 40;
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * N);
  return (
    <a href={lien} className="v2-dr-carte v2-dr-jauge">
      <span className="v2-dr-jauge-tete">
        <Icone width={18} height={18} aria-hidden="true" /> {titre}
        <ChevronRight width={16} height={16} aria-hidden="true" />
      </span>
      <span className="v2-dr-jauge-valeur">
        <strong><Chiffre valeur={fort} /></strong>
        {faible}
      </span>
      <span className="v2-dr-jauge-barre" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <i key={i} data-plein={i < pleins ? "" : undefined} />
        ))}
      </span>
      <small>{pied}</small>
    </a>
  );
}

/* ——— la carte de chaleur : une colonne par semaine, une case par jour ——— */
function Chaleur({ debut, fin, parJour }: { debut: number; fin: number; parJour: Map<number, number> }) {
  /* on part du lundi de la première semaine */
  const d0 = new Date(debut);
  const lundi = minuit(debut - ((d0.getDay() + 6) % 7) * JOUR);
  const semaines: number[][] = [];
  for (let t = lundi; t <= fin; t += 7 * JOUR) semaines.push(Array.from({ length: 7 }, (_, k) => t + k * JOUR));
  const max = Math.max(1, ...parJour.values());
  const niveau = (t: number) => {
    if (t < debut || t > fin) return -1;
    const n = parJour.get(minuit(t)) ?? 0;
    return n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
  };
  /* le nom du mois au-dessus de la première semaine qui le contient */
  const mois = semaines.map((s, i) => {
    const m = new Date(s[0]).getMonth();
    const avant = i > 0 ? new Date(semaines[i - 1][0]).getMonth() : -1;
    return m !== avant ? new Date(s[0]).toLocaleDateString("fr-FR", { month: "short" }) : "";
  });
  return (
    <div className="v2-dr-chaleur">
      <div className="v2-dr-chaleur-grille" style={{ gridTemplateColumns: `40px repeat(${semaines.length}, minmax(0, 1fr))` }}>
        <span />
        {mois.map((m, i) => (
          <small key={i} className="v2-dr-chaleur-mois">
            {m}
          </small>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <div key={k} className="v2-dr-chaleur-ligne" style={{ display: "contents" }}>
            <small className="v2-dr-chaleur-jour">{k === 0 ? "Lun" : k === 2 ? "Mer" : k === 4 ? "Ven" : ""}</small>
            {semaines.map((s) => {
              const t = s[k];
              const n = niveau(t);
              return <i key={t} data-n={n} title={n >= 0 ? `${jourCourt(t)} : ${parJour.get(minuit(t)) ?? 0} contact(s)` : undefined} />;
            })}
          </div>
        ))}
      </div>
      <p className="v2-dr-echelle">
        <Info width={14} height={14} aria-hidden="true" /> Moins {[0, 1, 2, 3, 4].map((n) => <i key={n} data-n={n} />)} Plus
      </p>
    </div>
  );
}

/* ——— la courbe lissée ——— */
function Courbe({ seaux }: { seaux: { libelle: string; n: number }[] }) {
  const L = 560, H = 220, n = seaux.length;
  const brut = Math.max(1, ...seaux.map((s) => s.n));
  const max = Math.max(4, Math.ceil(brut / 4) * 4);
  const pts = seaux.map((s, i) => [(i / Math.max(1, n - 1)) * L, H - (s.n / max) * H] as const);
  let d = `M${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? H}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${Math.min(H, p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${Math.min(H, p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  const pas = Math.max(1, Math.ceil(n / 6));
  return (
    <div className="v2-dr-courbe">
      <div className="v2-dr-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{Math.round(max * p)}</span>
        ))}
      </div>
      <div>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" role="img" aria-label="Évolution du nombre de contacts">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-400)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={d} pathLength={1} className="v2-trace" fill="none" stroke="var(--v2-gray-900)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v2-dr-axe-x" aria-hidden="true">
          {seaux.map((s, i) => (
            <span key={i} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
              {i % pas === 0 ? s.libelle : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ——— les étapes en colonnes, le libellé dessous, la plus forte en clair ——— */
function Colonnes({ barres, max }: { barres: { cle: string; court: string; n: number }[]; max: string }) {
  const haut = Math.max(4, ...barres.map((x) => x.n));
  const plafond = Math.ceil(haut / 4) * 4;
  return (
    <div className="v2-dr-colonnes">
      <div className="v2-dr-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{Math.round(plafond * p)}</span>
        ))}
      </div>
      <div className="v2-dr-colonnes-zone">
        {barres.map((x) => (
          <div key={x.cle} className="v2-dr-col" data-max={x.cle === max && x.n > 0 ? "" : undefined} aria-label={`${x.cle} : ${x.n}`}>
            <small className="om-col-libelle">{x.court}</small>
            <span style={{ height: `${Math.max(2, (x.n / plafond) * 100)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
