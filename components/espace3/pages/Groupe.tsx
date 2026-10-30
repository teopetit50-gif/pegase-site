"use client";

/* Le groupe sur une page : une ligne par société, rangées par pôle. */

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { useToast } from "@/components/espace2/Toasts";
import { RACINE } from "../poste";
import { POLES, SOCIETES, keur, type Societe } from "../donnees";
import { Carte, Note, Page, Pastille, Tableau, Tendance, Tete } from "../ui3";

const somme = (xs: Societe[], f: (s: Societe) => number) => xs.reduce((a, s) => a + f(s), 0);
const evol = (xs: Societe[], f: (s: Societe) => number) => {
  const v = somme(xs, (s) => s.ventes);
  const avant = somme(xs, (s) => s.ventes / (1 + f(s) / 100));
  return avant ? Math.round(((v - avant) / avant) * 1000) / 10 : 0;
};

const REPORTING = { recu: { t: "vert", x: "Reçu" }, retard: { t: "ambre", x: "En retard" }, manquant: { t: "rouge", x: "Manquant" } } as const;

export default function Groupe() {
  const [ouverts, setOuverts] = useState<string[]>(POLES.map((p) => p.cle));
  const toast = useToast();
  const basculer = (cle: string) => setOuverts((o) => (o.includes(cle) ? o.filter((x) => x !== cle) : [...o, cle]));
  const colonnes = [{ libelle: "Société" }, { libelle: "Ventes semaine", num: true }, { libelle: "Sur S-1", num: true }, { libelle: "Sur N-1", num: true }, { libelle: "Objectif cumulé", num: true }, { libelle: "Résultat cumulé", num: true }, { libelle: "Trésorerie", num: true }, { libelle: "Reporting" }];

  return (
    <Page>
      <Tete
        titre="Le groupe sur une page"
        sous="Les ventes de la semaine hors intragroupe, le résultat depuis le 1er janvier et la trésorerie de chaque société, lus ce matin dans leurs logiciels."
        actions={
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => toast("Export Excel préparé : groupe-sur-une-page.xlsx")}>
            <Download width={16} height={16} aria-hidden="true" /> Exporter
          </button>
        }
      />
      <Carte titre={`${SOCIETES.length} sociétés, ${POLES.length} pôles`} sous="Cliquez un pôle pour le replier, une société pour ouvrir sa fiche" plein>
        <Tableau colonnes={colonnes}>
          {POLES.map((p) => {
            const ss = SOCIETES.filter((s) => s.pole === p.cle);
            const ouvert = ouverts.includes(p.cle);
            return [
              <tr key={p.cle} data-pole="">
                <td>
                  <button type="button" className="e3-deplier" aria-expanded={ouvert} onClick={() => basculer(p.cle)}>
                    {ouvert ? <ChevronDown width={14} height={14} aria-hidden="true" /> : <ChevronRight width={14} height={14} aria-hidden="true" />}
                    <span className="e3-couleur" style={{ background: p.couleur }} aria-hidden="true" />
                    {p.nom} <span className="v2-gris">· {ss.length}</span>
                  </button>
                </td>
                <td className="v2-num">{keur(somme(ss, (s) => s.ventes))}</td>
                <td className="v2-num"><Tendance v={evol(ss, (s) => s.vsS1)} /></td>
                <td className="v2-num"><Tendance v={evol(ss, (s) => s.vsN1)} /></td>
                <td className="v2-num" />
                <td className="v2-num">{keur(somme(ss, (s) => s.resultat))}</td>
                <td className="v2-num">{keur(somme(ss, (s) => s.tresorerie))}</td>
                <td />
              </tr>,
              ...(ouvert
                ? ss.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <span className="e3-cellule-nom" style={{ paddingLeft: 22 }}>
                          <Link href={`${RACINE}/societe/${s.id}`}>{s.nom}</Link>
                          <small>
                            {s.activite} · {s.territoire}
                          </small>
                        </span>
                      </td>
                      <td className="v2-num">{s.ventes ? keur(s.ventes) : "—"}</td>
                      <td className="v2-num">{s.ventes ? <Tendance v={s.vsS1} /> : "—"}</td>
                      <td className="v2-num">{s.ventes ? <Tendance v={s.vsN1} /> : "—"}</td>
                      <td className="v2-num">
                        <Pastille teinte={s.objectif >= 100 ? "vert" : s.objectif >= 95 ? "ambre" : "rouge"}>{s.objectif} %</Pastille>
                      </td>
                      <td className="v2-num" style={{ color: s.resultat < 0 ? "var(--v2-red-700)" : undefined }}>{keur(s.resultat)}</td>
                      <td className="v2-num" style={{ color: s.tresorerie < s.plancher ? "var(--v2-red-700)" : undefined }}>{keur(s.tresorerie)}</td>
                      <td>
                        <Pastille teinte={REPORTING[s.reporting].t}>{REPORTING[s.reporting].x}</Pastille>
                      </td>
                    </tr>
                  ))
                : []),
            ];
          })}
          <tr data-total="">
            <td>Groupe</td>
            <td className="v2-num">{keur(somme(SOCIETES, (s) => s.ventes))}</td>
            <td className="v2-num"><Tendance v={evol(SOCIETES, (s) => s.vsS1)} /></td>
            <td className="v2-num"><Tendance v={evol(SOCIETES, (s) => s.vsN1)} /></td>
            <td />
            <td className="v2-num">{keur(somme(SOCIETES, (s) => s.resultat))}</td>
            <td className="v2-num">{keur(somme(SOCIETES, (s) => s.tresorerie))}</td>
            <td />
          </tr>
        </Tableau>
      </Carte>
      <Note>
        Indicateur de gestion, pas une consolidation comptable : les ventes entre sociétés du groupe sont retirées (l&apos;import vend 100 au magasin, qui vend 120 au client : le groupe a vendu 120). Résultats sociaux cumulés depuis le 1er janvier.
      </Note>
    </Page>
  );
}
