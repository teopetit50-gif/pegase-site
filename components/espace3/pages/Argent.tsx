"use client";

/* L'argent du groupe : trésorerie par société, échéances à 30 jours,
   encours clients consolidés, comptes entre sociétés. */

import Link from "next/link";
import { RACINE } from "../poste";
import { SOCIETES, keur, meur } from "../donnees";
import { Barres, Carte, Grille, Kpi, Kpis, Note, Page, Pastille, Tableau, Tete } from "../ui3";

const CLIENTS_GROUPE = [
  { nom: "Batimat Caraïbes", societes: 3, encours: 486, echu: 118, plafond: 400 },
  { nom: "Collectivité — marchés publics", societes: 4, encours: 742, echu: 211, plafond: 900 },
  { nom: "Hôtel Les Alizés", societes: 2, encours: 164, echu: 12, plafond: 250 },
  { nom: "Transports Lubin", societes: 3, encours: 138, echu: 41, plafond: 150 },
  { nom: "Clinique du Lamentin", societes: 2, encours: 96, echu: 0, plafond: 200 },
];

const RECIPROQUES = [
  { a: "Soléa Import", b: "Soléa Market Jarry", creance: 1_284, dette: 1_284 },
  { a: "Soléa Import", b: "Soléa Market Lamentin", creance: 964, dette: 921 },
  { a: "Soléa Froid", b: "Soléa Import", creance: 212, dette: 212 },
  { a: "Soléa Immobilier", b: "Proxi Soléa", creance: 148, dette: 136 },
  { a: "Soléa Holding", b: "Maison Soléa", creance: 420, dette: 420 },
];

export default function Argent() {
  const treso = SOCIETES.reduce((a, s) => a + s.tresorerie, 0);
  const ech = SOCIETES.reduce((a, s) => a + s.echeances30, 0);
  const encours = SOCIETES.reduce((a, s) => a + s.encours, 0);
  const echu = SOCIETES.reduce((a, s) => a + s.echu90, 0);
  const aPayer = SOCIETES.reduce((a, s) => a + s.aPayer, 0);
  const tri = [...SOCIETES].sort((a, b) => a.tresorerie / a.plancher - b.tresorerie / b.plancher);

  return (
    <Page>
      <Tete titre="Trésorerie et encours" sous="La trésorerie de chaque société lue ce matin dans ses banques, ce qui sort dans les 30 jours, et ce que les clients doivent au groupe." />
      <Kpis>
        <Kpi libelle="Trésorerie disponible" valeur={meur(treso)} sous="41 comptes, 5 banques" />
        <Kpi libelle="Échéances à 30 jours" valeur={meur(ech)} sous="fournisseurs, salaires, impôts, loyers" />
        <Kpi libelle="Factures fournisseurs à payer" valeur={meur(aPayer)} sous="lues et contrôlées par FILED" />
        <Kpi libelle="Encours clients" valeur={meur(encours)} sous={<>dont {keur(echu)} échus à plus de 90 jours</>} teinte="ambre" />
      </Kpis>

      <Grille modele="large">
        <Carte titre="Trésorerie par société" sous="Rapportée au plancher fixé par le groupe — les plus tendues en premier">
          <Barres
            lignes={tri.slice(0, 10).map((s) => ({
              libelle: <Link href={`${RACINE}/societe/${s.id}`}>{s.nom}</Link>,
              valeur: s.tresorerie,
              texte: `${keur(s.tresorerie)} · plancher ${keur(s.plancher)}`,
              teinte: s.tresorerie < s.plancher ? "rouge" : s.tresorerie < s.plancher * 1.25 ? "ambre" : "vert",
            }))}
          />
        </Carte>
        <Carte titre="Échéances à 30 jours" sous="Par semaine, tout le groupe">
          <Barres
            lignes={[
              { libelle: "Cette semaine", valeur: 6_420, texte: "6 420 k€", sous: "dont salaires du 31 : 3 960 k€" },
              { libelle: "Semaine prochaine", valeur: 4_180, texte: "4 180 k€", sous: "dont TVA d'octobre : 1 240 k€" },
              { libelle: "Dans 2 semaines", valeur: 3_920, texte: "3 920 k€" },
              { libelle: "Dans 3 semaines", valeur: 4_470, texte: "4 470 k€", sous: "dont échéance d'emprunt entrepôt : 610 k€" },
            ]}
          />
        </Carte>
      </Grille>

      <Grille>
        <Carte titre="Clients communs à plusieurs sociétés" sous="Un seul encours par client, quel que soit le nombre de sociétés qui lui vendent" plein>
          <Tableau colonnes={[{ libelle: "Client" }, { libelle: "Sociétés", num: true }, { libelle: "Encours", num: true }, { libelle: "Échu > 60 j", num: true }, { libelle: "Plafond" }]}>
            {CLIENTS_GROUPE.map((c) => (
              <tr key={c.nom}>
                <td>{c.nom}</td>
                <td className="v2-num">{c.societes}</td>
                <td className="v2-num">{keur(c.encours)}</td>
                <td className="v2-num">{c.echu ? keur(c.echu) : "—"}</td>
                <td>{c.encours > c.plafond ? <Pastille teinte="rouge">Dépassé de {keur(c.encours - c.plafond)}</Pastille> : <Pastille teinte="vert">{Math.round((c.encours / c.plafond) * 100)} %</Pastille>}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre="Comptes entre sociétés du groupe" sous="Ce que chaque société dit devoir à l'autre — un écart se règle avant la clôture" plein>
          <Tableau colonnes={[{ libelle: "Créancier → débiteur" }, { libelle: "Créance", num: true }, { libelle: "Dette reconnue", num: true }, { libelle: "Écart" }]}>
            {RECIPROQUES.map((r) => (
              <tr key={r.a + r.b}>
                <td>
                  <span className="e3-cellule-nom">
                    {r.a}
                    <small>→ {r.b}</small>
                  </span>
                </td>
                <td className="v2-num">{keur(r.creance)}</td>
                <td className="v2-num">{keur(r.dette)}</td>
                <td>{r.creance === r.dette ? <Pastille teinte="vert">Rapproché</Pastille> : <Pastille teinte="ambre">{keur(r.creance - r.dette)}</Pastille>}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
      </Grille>
      <Note>Encours suivis et relancés par CASHD selon les règles du groupe : un plafond par client, une relance qui ne part qu&apos;après accord de la direction financière.</Note>
    </Page>
  );
}
