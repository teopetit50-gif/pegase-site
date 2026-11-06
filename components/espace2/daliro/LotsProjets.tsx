"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : l'onglet Lots, copie de l'onglet
   « Projects » d'une Initiative de Linear (05/11/2026, relevé sur
   l'initiative « Résidence Les Tilleuls », sombre, au getComputedStyle).

   Linear montre là un tableau, pas une frise : une ligne de titres de 32,
   puis une ligne de 48 par projet, sans groupes. Colonnes :
     [indent] 8 · Name 1fr · Health 50 · Priority 68 · Lead 48 ·
     Target date 100 · Issues 49 · Status 120 · [end] 8, écart 6.
   Titres 12/450 tertiaires ; nom 13/500, icône 16 ; santé 14 ; priorité
   16 ; avatar 16 ; date 12/450 secondaire ; compte 12/450 ; statut :
   icône 16, « 42% » 12/450, courbe 32×16 (l'avancement en violet
   lch(48 59.31 288.43), trait 1.25, sur la diagonale attendue en gris).

   Ici : un lot = un projet. Santé = le déboursé, priorité = les points à
   régler du lot, responsable = l'exécutant, échéance = la fin du dernier
   passage, « Passages » = les passages du lot (le compte « Issues »),
   statut = l'avancement de la dernière situation. La frise de Chantiers
   reste dans « Options d'affichage » (?vue=frise), comme la Timeline de
   Linear.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lot, Tableau } from "@/components/espace/daliro/types";
import { EXECUTIONS } from "@/components/espace/daliro/etats";
import { dateCourte } from "@/components/espace/format";
import { DalIcone } from "./DalIcone";
import { COULEUR_LOT, STATUT_LOT, dateLinear, initiales, lignesLots, type LigneLot } from "./ApercuChantier";
import { IconePriorite, IconeSante, IconeStatut, NOM_PRIORITE } from "./IconesProjet";
import "./dal-ini.css";

type Tri = "nom" | "sante" | "priorite" | "fin" | "passages" | "statut";

function Courbe({ pct }: { pct: number }) {
  const y = 16 - (16 * Math.max(0, Math.min(100, pct))) / 100;
  return (
    <svg className="dal-lp-courbe" width="32" height="16" viewBox="0 0 32 16" fill="none" aria-hidden="true">
      <path d="M0,16L32,0" className="dal-lp-courbe-attendu" strokeWidth="1.25" />
      <path d={`M0,16L32,${y.toFixed(3)}`} className="dal-lp-courbe-fait" strokeWidth="1.25" />
    </svg>
  );
}

function Fleche() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.5361 10.2745C11.8024 10.0029 11.8249 9.56807 11.5762 9.26961C11.3275 8.97139 10.8961 8.91526 10.5811 9.12801L10.5195 9.17391L8.00001 11.2735L5.48048 9.17391L5.41895 9.12801C5.10388 8.91526 4.67252 8.97139 4.42384 9.26961C4.17512 9.56807 4.19758 10.0029 4.46387 10.2745L4.51954 10.3263L7.51954 12.8263C7.79767 13.058 8.20234 13.058 8.48048 12.8263L11.4805 10.3263L11.5361 10.2745Z" />
      <path d="M8.75 12.25C8.75 12.6642 8.41421 13 8 13C7.58579 13 7.25 12.6642 7.25 12.25L7.25 3.75C7.25 3.33579 7.58579 3 8 3C8.41421 3 8.75 3.33579 8.75 3.75V12.25Z" />
    </svg>
  );
}

export function LotsProjets({ t, ici, filtre }: { t: Tableau; ici: string; filtre: Lot["statut"] | null }) {
  const [tri, setTri] = useState<Tri | null>(null);
  const lignes = useMemo(() => lignesLots(t), [t]);
  const passages = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of t.passages) if (p.lot_id && p.statut !== "annule") m.set(p.lot_id, (m.get(p.lot_id) ?? 0) + 1);
    return m;
  }, [t.passages]);
  const rang = (x: LigneLot): number | string =>
    tri === "nom"
      ? `${x.lot.code} ${x.lot.libelle}`
      : tri === "sante"
        ? ({ off: 0, risk: 1, on: 2 } as const)[x.sante ?? "on"] + (x.sante ? 0 : 3)
        : tri === "priorite"
          ? x.prio === 0
            ? 9
            : x.prio
          : tri === "fin"
            ? (x.fin ?? "9999")
            : tri === "passages"
              ? -(passages.get(x.lot.id) ?? 0)
              : tri === "statut"
                ? -(x.pct ?? -1)
                : x.lot.rang;
  const vues = lignes
    .filter((x) => !filtre || x.lot.statut === filtre)
    .sort((a, b) => {
      const ra = rang(a), rb = rang(b);
      return ra < rb ? -1 : ra > rb ? 1 : a.lot.rang - b.lot.rang;
    });
  const lien = `${ici}?onglet=argent&partie=lots`;
  const titre = (cle: Tri, libelle: string, cellule?: string) => (
    <button type="button" className="dal-lp-titre" data-col={cellule} aria-pressed={tri === cle} onClick={() => setTri(tri === cle ? null : cle)} title={`Trier par ${libelle.toLowerCase()}`}>
      {libelle}
      {tri === cle ? <Fleche /> : null}
    </button>
  );

  if (!t.lots.length) return <p className="dal-lp-vide">Aucun lot : le planning et les lignes du marché ne peuvent pas s&apos;y rattacher.</p>;

  return (
    <div className="dal-lp" role="table" aria-label="Lots du chantier">
      <div className="dal-lp-rang dal-lp-entete" role="row">
        <span />
        {titre("nom", "Nom")}
        {titre("sante", "Santé")}
        {titre("priorite", "Priorité")}
        <span className="dal-lp-titre dal-lp-titre--simple" data-col="lead">
          Équipe
        </span>
        {titre("fin", "Échéance", "date")}
        {titre("passages", "Passages", "compte")}
        {titre("statut", "Statut")}
        <span />
      </div>
      {vues.length ? null : <p className="dal-lp-vide">Aucun lot dans cet état.</p>}
      {vues.map((x) => {
        const n = passages.get(x.lot.id) ?? 0;
        return (
          <Link key={x.lot.id} href={lien} className="dal-lp-rang dal-lp-ligne" role="row" title="Lots et déboursé, dans Argent">
            <span />
            <span className="dal-lp-nom" role="cell">
              <span className="dal-lp-nom-icone" style={{ color: COULEUR_LOT[x.lot.statut] }}>
                <DalIcone nom="Project" />
              </span>
              <span className="dal-lp-nom-texte">
                {x.lot.code} {x.lot.libelle}
              </span>
            </span>
            <span className="dal-lp-cellule" role="cell" aria-label={x.santeTexte} title={x.santeTexte}>
              <IconeSante etat={x.sante} />
            </span>
            <span className="dal-lp-cellule" role="cell" aria-label={`Priorité : ${NOM_PRIORITE[x.prio]}`} title={x.prioTexte}>
              <IconePriorite n={x.prio} />
            </span>
            <span className="dal-lp-cellule" data-col="lead" role="cell" title={`${EXECUTIONS[x.lot.execution]}${x.qui ? ` : ${x.qui}` : ", à désigner"}`}>
              {x.qui ? <span className="dal-ini-avatar dal-ini-avatar--16">{initiales(x.qui) || "?"}</span> : <DalIcone nom="UnassignedCircle" />}
            </span>
            <span className="dal-lp-cellule dal-lp-texte" data-col="date" role="cell" title={x.fin ? `Dernier passage jusqu'au ${dateCourte(x.fin)}` : "Aucun passage planifié"}>
              {x.fin ? dateLinear(x.fin) : ""}
            </span>
            <span className="dal-lp-cellule dal-lp-compte" data-col="compte" role="cell" title={`${n} passage${n > 1 ? "s" : ""} au planning`}>
              {n}
            </span>
            <span className="dal-lp-cellule dal-lp-statut" role="cell" title={x.pct === null ? "Avancement non mesuré (aucune situation)" : `Avancement ${x.pct} %`}>
              <IconeStatut statut={STATUT_LOT[x.lot.statut]} pct={x.pct ?? 0} />
              <span className="dal-lp-texte">{x.pct === null ? "—" : `${x.pct}%`}</span>
              {x.pct !== null && x.lot.statut !== "a_venir" ? <Courbe pct={x.pct} /> : null}
            </span>
            <span />
          </Link>
        );
      })}
    </div>
  );
}
