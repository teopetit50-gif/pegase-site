"use client";

/* Vue d'ensemble (07/10/2026) — refaite sur la maquette donnée par Teo :
   quatre chiffres en tête, la courbe des factures reçues, les tâches du
   jour, les factures à payer en priorité, l'activité récente, et un
   bandeau qui ouvre l'assistant. Tout est lu dans les mêmes données que
   « À payer » et « Activité » (exemple ou base réelle) ; aucune variation
   inventée : un chiffre sans historique n'affiche pas de flèche.

   15/10/2026 — allégée sur le dessin du pilotage /omega (validé par Teo) :
   une ligne par élément, le titre à gauche, la date à droite ; plus
   d'icônes, de sous-lignes ni d'avatars ; la flèche au survol ; les
   échéances sans colonne « État » (une date dépassée passe au rouge) ; plus
   de bandeau de l'assistant, le bouton « Assistant » est en haut.
   17/10/2026 — décision de Teo : plus de salutation ni de rangée de quatre
   chiffres, comme la vue d'ensemble du pilotage.
   21/10/2026 — l'horloge est celle du navigateur (horloge.ts) : les cartes
   se rendent après le montage, en squelette avant. Le serveur, en UTC,
   n'écrit plus une heure ni un « Hier » que le visiteur en Guadeloupe
   recalculerait autrement (erreur d'hydratation #418 vue en production). */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { relatif } from "@/components/espace3/base/format";
import { useAujourdhui } from "./horloge";
import { Squelette } from "./ui";
import { RACINE } from "./modules";
import { useDonnees } from "./donnees";
import { evenements } from "./evenements";
import { usePoste } from "./poste";
import { CAMPAGNES, CONTENUS, DECISIONS_CEO, DECISIONS_MARKETING, ECHEANCES, JOURNAL, SOCIETES, enseigne, eur, keur, quand, societe } from "./groupe";
import "./habillage.css";

/* 30/10/2026 — /espace3 : la même vue d'ensemble que /espace2 (quatre
   cartes, mêmes dessins), remplie avec le groupe. Le CEO lit les ventes du
   groupe, les sociétés à surveiller, ses décisions et l'activité ; la
   direction marketing, les ventes attribuées aux campagnes, les campagnes
   en cours, ses contenus à valider et l'activité du marketing. */

const JOUR = 86_400_000;

/* une série quotidienne stable (même dessin à chaque visite) : la base, le
   creux du dimanche, une légère pente */
function serie(periode: number, base: number, pente: number, graine: number) {
  return Array.from({ length: periode }, (_, i) => {
    const t = i - periode;
    const semaine = 1 + 0.18 * Math.sin((i + graine) * 0.9) - (((i + graine) % 7) === 6 ? 0.35 : 0);
    return Math.max(0, base * semaine * (1 + (pente * t) / 365) * (1 + 0.04 * Math.cos(i * 0.37 + graine)));
  });
}

export default function Accueil() {
  const aujourdhui = useAujourdhui();
  const poste = usePoste();
  const { donnees } = useDonnees();
  const [periode, setPeriode] = useState(30);
  const ceo = poste === "ceo";

  const courbe = useMemo(() => {
    if (aujourdhui === null) return null;
    /* une moyenne glissante sur 7 jours, calculée sur six jours de plus pour que la courbe ne parte pas d'un creux */
    const brut = serie(periode + 6, ceo ? 1_492_000 : 28_400, ceo ? 0.6 : 2.4, ceo ? 3 : 5);
    const valeurs = Array.from({ length: periode }, (_, i) => brut.slice(i, i + 7).reduce((x, y) => x + y, 0) / 7);
    return { valeurs, debut: aujourdhui - (periode - 1) * JOUR };
  }, [aujourdhui, periode, ceo]);

  /* aujourd'hui : ce qui demande une décision, puis les échéances proches */
  const actions = ceo
    ? [
        ...DECISIONS_CEO.map((d) => ({ id: d.id, titre: d.titre, quand: quand(d.echeance), retard: d.echeance < 0, lien: `${RACINE}/validations` })),
        ...ECHEANCES.filter((e) => e.jours <= 3 && e.id !== "e2").map((e) => ({ id: e.id, titre: `${e.titre} · ${societe(e.societe)?.nom ?? ""}`, quand: quand(e.jours), retard: e.jours < 0, lien: `${RACINE}/varelo` })),
      ]
    : [
        ...DECISIONS_MARKETING.map((d) => ({ id: d.id, titre: d.titre, quand: quand(d.echeance), retard: false, lien: `${RACINE}/validations` })),
        ...CONTENUS.filter((c) => c.etat === "a_valider").map((c) => ({ id: c.id, titre: `Valider : ${c.titre} · ${enseigne(c.enseigne)?.nom ?? ""}`, quand: quand(c.jours), retard: false, lien: `${RACINE}/reput` })),
      ];

  const surveiller = [...SOCIETES].sort((a, b) => a.tresorerie / a.plancher - b.tresorerie / b.plancher).slice(0, 6);
  const enCours = CAMPAGNES.filter((c) => c.etat === "en_cours" || c.etat === "a_valider").slice(0, 6);
  const activite = ceo
    ? [...JOURNAL.map((j, i) => ({ id: `j${i}`, texte: `${j.qui} ${j.quoi}`, quand: j.quand })), ...(donnees ? evenements(donnees).slice(0, 2).map((e) => ({ id: e.id, texte: `${e.quoi} : ${e.detail}`, quand: relatif(e.quand) })) : [])].slice(0, 6)
    : [
        { id: "m1", texte: "38 réponses aux avis Google validées et publiées", quand: "7 h 02" },
        { id: "m2", texte: "Campagne « Portes ouvertes SUV hybrides » : 41 nouveaux contacts hier", quand: "6 h 15" },
        { id: "m3", texte: "1 284 clients inactifs repérés chez Soléa Auto Guadeloupe", quand: "Hier 22:40" },
        { id: "m4", texte: "Newsletter de novembre préparée pour 34 800 abonnés", quand: "Hier 21:10" },
        { id: "m5", texte: "Brico Soléa Martinique : 6 avis négatifs reçus cette semaine", quand: "Hier 18:30" },
      ];

  return (
    <div className="v2-page v2-arrivee v2-va v2-vivant oc-va-simple">
      <h1 className="v2-sr">Vue d&apos;ensemble</h1>

      <div className="v2-va-grille">
        <div className="v2-va-col">
        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre" style={{ marginBottom: 16 }}>
            <h2 className="v2-h2">{ceo ? "Ventes du groupe" : "Ventes attribuées aux campagnes"}</h2>
            <span className="v2-champ v2-va-periode">
              <select value={periode} onChange={(e) => setPeriode(Number(e.target.value))} aria-label="Période">
                <option value={7}>7 derniers jours</option>
                <option value={30}>30 derniers jours</option>
                <option value={90}>90 derniers jours</option>
              </select>
            </span>
          </div>
          {courbe ? <Courbe valeurs={courbe.valeurs} debut={courbe.debut} /> : <Squelette largeur="100%" hauteur={220} />}
        </section>

        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">{ceo ? "Sociétés à surveiller" : "Campagnes en cours"}</h2>
            <Link href={ceo ? `${RACINE}/varelo` : `${RACINE}/offload/pilotage`} className="v2-va-lien">Voir tout <ArrowRight width={14} height={14} /></Link>
          </div>
          <div className="v2-tableau-cadre">
            {ceo ? (
              <table className="v2-va-table">
                <thead>
                  <tr><th>Société</th><th>Trésorerie / plancher</th><th style={{ textAlign: "right" }}>Ventes sur N-1</th></tr>
                </thead>
                <tbody>
                  {surveiller.map((s) => (
                    <tr key={s.id}>
                      <td><Link href={`${RACINE}/varelo`}>{s.nom}</Link></td>
                      <td className="v2-gris" data-retard={s.tresorerie < s.plancher ? "" : undefined}>
                        {keur(s.tresorerie)} / {keur(s.plancher)}
                        {s.tresorerie < s.plancher ? <span className="v2-sr"> (sous le plancher)</span> : null}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{s.vsN1 > 0 ? "+" : ""}{s.vsN1.toLocaleString("fr-FR")} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="v2-va-table">
                <thead>
                  <tr><th>Campagne</th><th>Enseigne</th><th style={{ textAlign: "right" }}>Ventes</th></tr>
                </thead>
                <tbody>
                  {enCours.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`${RACINE}/offload/pilotage`}>{c.nom}</Link></td>
                      <td className="v2-gris">{enseigne(c.enseigne)?.nom}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.ventes ? eur(c.ventes) : "à valider"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        </div>
        <div className="v2-va-col">
        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Aujourd&apos;hui</h2>
            <span className="v2-gris">{actions.length} à faire</span>
          </div>
          <ul className="v2-va-liste">
            {actions.slice(0, 6).map((x) => (
              <li key={x.id}>
                <span className="v2-va-texte">
                  <span>{x.titre}</span>
                </span>
                <span className="oc-meta" data-retard={x.retard ? "" : undefined}>{x.quand}{x.retard ? <span className="v2-sr"> (en retard)</span> : null}</span>
                <Link href={x.lien} aria-label={`Ouvrir : ${x.titre}`}><ChevronRight width={16} height={16} /></Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="v2-carte v2-carte-corps">
          <div className="v2-va-titre">
            <h2 className="v2-h2">Activité récente</h2>
            <Link href={`${RACINE}/activite`} className="v2-va-lien">Voir tout</Link>
          </div>
          <ul className="v2-va-liste">
            {activite.map((e) => (
              <li key={e.id}>
                <span className="v2-va-texte">
                  <span>{e.texte}</span>
                </span>
                <span className="oc-meta">{e.quand}</span>
              </li>
            ))}
          </ul>
        </section>
        </div>
      </div>

    </div>
  );
}

const kEuros = (v: number) => (v >= 1_000_000 ? `${(Math.round(v / 100_000) / 10).toLocaleString("fr-FR")} M€` : v >= 1000 ? `${Math.round(v / 1000)} k€` : `${Math.round(v)} €`);

/* la courbe en aire, dessinée en SVG (lissée, axe des montants à gauche) */
function Courbe({ valeurs, debut }: { valeurs: number[]; debut: number }) {
  const L = 600, H = 200, n = valeurs.length;
  const brut = Math.max(1, ...valeurs);
  const pas = Math.pow(10, Math.floor(Math.log10(brut)));
  const max = Math.ceil(brut / pas) * pas;
  const pts = valeurs.map((v, i) => [(i / Math.max(1, n - 1)) * L, H - (v / max) * H] as const);
  /* Catmull-Rom → Bézier : une courbe douce qui passe par chaque point */
  let ligne = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6), c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
    ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
  }
  const reperes = [0, 0.25, 0.5, 0.75, 1].map((p) => {
    const i = Math.round(p * (n - 1));
    return { x: p * 100, texte: new Date(debut + i * 86_400_000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) };
  });
  return (
    <figure className="v2-va-courbe">
      <div className="v2-va-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => <span key={p}>{kEuros(max * p)}</span>)}
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 200, display: "block", overflow: "visible" }} role="img" aria-label={`Moyenne sur 7 jours glissants, dernier point : ${kEuros(valeurs[n - 1] ?? 0)}`}>
          <defs>
            <linearGradient id="v2-va-degrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--v2-blue-700)" stopOpacity="0.4" />
              <stop offset="1" stopColor="var(--v2-blue-700)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={`${ligne} L${L},${H} L0,${H} Z`} fill="url(#v2-va-degrade)" />
          <path d={ligne} pathLength={1} className="v2-trace" fill="none" stroke="var(--v2-blue-700)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v2-va-axe">
          {reperes.map((r) => <span key={r.x} style={{ left: `${r.x}%` }}>{r.texte}</span>)}
        </div>
      </div>
    </figure>
  );
}
