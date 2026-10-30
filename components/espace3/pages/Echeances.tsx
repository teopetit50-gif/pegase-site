"use client";

/* Échéances et risques : contrats, baux, reportings, réserves, sinistres. */

import { useState } from "react";
import Link from "next/link";
import { RACINE } from "../poste";
import { ECHEANCES, keur, quand, societe, type Echeance } from "../donnees";
import { Carte, Kpi, Kpis, Page, Pastille, Tableau, Tete } from "../ui3";

const TYPES: (Echeance["type"] | "Tout")[] = ["Tout", "Contrat", "Bail", "Reporting", "Réserve", "Assurance", "Litige"];
const ETAT = { a_faire: { t: "ambre", x: "À faire" }, en_cours: { t: "bleu", x: "En cours" }, fait: { t: "vert", x: "Fait" } } as const;

export default function Echeances() {
  const [type, setType] = useState<(typeof TYPES)[number]>("Tout");
  const liste = [...ECHEANCES].filter((e) => type === "Tout" || e.type === type).sort((a, b) => a.jours - b.jours);
  const retard = ECHEANCES.filter((e) => e.jours < 0).length;
  const semaine = ECHEANCES.filter((e) => e.jours >= 0 && e.jours <= 7).length;
  const enjeu = ECHEANCES.reduce((a, e) => a + (e.enjeu ?? 0), 0);

  return (
    <Page>
      <Tete titre="Échéances et risques" sous="Chaque date qui engage une société du groupe, lue dans ses contrats, ses baux et ses courriers : préavis, révisions, reportings dus, réserves à émettre, sinistres." />
      <Kpis>
        <Kpi libelle="En retard" teinte="rouge" valeur={retard} sous="reportings dus aux marques" />
        <Kpi libelle="Dans les 7 jours" teinte="ambre" valeur={semaine} sous="dont un préavis dans 2 jours" />
        <Kpi libelle="Montant engagé" valeur={keur(enjeu)} sous="contrats, baux et sinistres suivis" />
        <Kpi libelle="Documents lus" valeur="6 830" sous="contrats, baux, polices d'assurance" />
      </Kpis>
      <Carte
        titre="Toutes les échéances"
        sous="Triées par date"
        plein
        actions={
          <div className="e3-onglets" role="group" aria-label="Type d'échéance">
            {TYPES.map((t) => (
              <button key={t} type="button" aria-pressed={t === type} onClick={() => setType(t)}>
                {t}
              </button>
            ))}
          </div>
        }
      >
        <Tableau colonnes={[{ libelle: "Échéance" }, { libelle: "Type" }, { libelle: "Société" }, { libelle: "Quand" }, { libelle: "Enjeu", num: true }, { libelle: "Qui" }, { libelle: "État" }]}>
          {liste.map((e) => {
            const s = societe(e.societe);
            return (
              <tr key={e.id}>
                <td style={{ whiteSpace: "normal", minWidth: 240 }}>{e.titre}</td>
                <td>{e.type}</td>
                <td>{s ? <Link href={`${RACINE}/societe/${s.id}`}>{s.nom}</Link> : "—"}</td>
                <td>
                  <Pastille teinte={e.jours < 0 ? "rouge" : e.jours <= 3 ? "ambre" : "gris"}>{quand(e.jours)}</Pastille>
                </td>
                <td className="v2-num">{e.enjeu ? keur(e.enjeu) : "—"}</td>
                <td>{e.direction}</td>
                <td>
                  <Pastille teinte={ETAT[e.etat].t}>{ETAT[e.etat].x}</Pastille>
                </td>
              </tr>
            );
          })}
        </Tableau>
      </Carte>
    </Page>
  );
}
