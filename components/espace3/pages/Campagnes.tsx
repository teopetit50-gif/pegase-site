"use client";

/* Les campagnes de toutes les enseignes du groupe, avec ce qu'elles ont
   coûté et rapporté. */

import { useState } from "react";
import { CAMPAGNES, enseigne, eur, nb, quand, type Campagne } from "../donnees";
import { Barres, Carte, Grille, Kpi, Kpis, Note, Page, Pastille, Tableau, Tete } from "../ui3";

const ETAT = { en_cours: { t: "bleu", x: "En cours" }, a_valider: { t: "ambre", x: "À valider" }, terminee: { t: "gris", x: "Terminée" }, programmee: { t: "gris", x: "Programmée" } } as const;
const FILTRES: { cle: Campagne["etat"] | "toutes"; x: string }[] = [
  { cle: "toutes", x: "Toutes" },
  { cle: "en_cours", x: "En cours" },
  { cle: "a_valider", x: "À valider" },
  { cle: "programmee", x: "Programmées" },
  { cle: "terminee", x: "Terminées" },
];

export default function Campagnes() {
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["cle"]>("toutes");
  const liste = CAMPAGNES.filter((c) => filtre === "toutes" || c.etat === filtre);
  const depense = CAMPAGNES.reduce((a, c) => a + c.depense, 0);
  const budget = CAMPAGNES.reduce((a, c) => a + c.budget, 0);
  const ventes = CAMPAGNES.reduce((a, c) => a + c.ventes, 0);
  const leads = CAMPAGNES.reduce((a, c) => a + c.leads, 0);
  const canaux = ["Facebook & Instagram", "Google", "E-mail", "SMS", "Radio", "Affichage"].map((k) => {
    const cs = CAMPAGNES.filter((c) => c.canal === k && c.depense > 0);
    const d = cs.reduce((a, c) => a + c.depense, 0);
    const v = cs.reduce((a, c) => a + c.ventes, 0);
    return { k, d, v, r: d ? v / d : 0 };
  }).filter((x) => x.d > 0);

  return (
    <Page>
      <Tete titre="Campagnes" sous="Toutes les campagnes de toutes les enseignes, au même endroit. Les ventes sont attribuées à partir des caisses et des ventes de chaque société : ce que la campagne a vraiment fait entrer." />
      <Kpis>
        <Kpi libelle="Budget engagé" valeur={eur(budget)} sous={`${eur(depense)} dépensés`} />
        <Kpi libelle="Ventes attribuées" valeur={eur(ventes)} teinte="vert" sous={`${Math.round(ventes / depense)} € pour 1 € dépensé`} />
        <Kpi libelle="Contacts générés" valeur={nb(leads)} sous={`${eur(depense / leads)} le contact`} />
        <Kpi libelle="À valider" valeur={CAMPAGNES.filter((c) => c.etat === "a_valider").length} teinte="ambre" sous="préparées, rien n'est parti" />
      </Kpis>
      <Grille modele="large">
        <Carte
          titre="Les campagnes"
          plein
          actions={
            <div className="e3-onglets" role="group" aria-label="Filtrer les campagnes">
              {FILTRES.map((f) => (
                <button key={f.cle} type="button" aria-pressed={f.cle === filtre} onClick={() => setFiltre(f.cle)}>
                  {f.x}
                </button>
              ))}
            </div>
          }
        >
          <Tableau colonnes={[{ libelle: "Campagne" }, { libelle: "Canal" }, { libelle: "État" }, { libelle: "Dépensé", num: true }, { libelle: "Contacts", num: true }, { libelle: "Ventes", num: true }]}>
            {liste.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="e3-cellule-nom">
                    {c.nom}
                    <small>
                      {enseigne(c.enseigne)?.nom} · {c.jours >= 0 ? `démarre ${quand(c.jours)}` : `depuis ${-c.jours} j`}
                    </small>
                  </span>
                </td>
                <td>{c.canal}</td>
                <td>
                  <Pastille teinte={ETAT[c.etat].t}>{ETAT[c.etat].x}</Pastille>
                </td>
                <td className="v2-num">
                  {eur(c.depense)} <span className="v2-gris">/ {eur(c.budget)}</span>
                </td>
                <td className="v2-num">{c.leads ? nb(c.leads) : "—"}</td>
                <td className="v2-num">{c.ventes ? eur(c.ventes) : "—"}</td>
              </tr>
            ))}
          </Tableau>
        </Carte>
        <Carte titre="Rendement par canal" sous="Ventes attribuées pour 1 € dépensé">
          <Barres lignes={canaux.sort((a, b) => b.r - a.r).map((x) => ({ libelle: x.k, valeur: x.r, texte: `${Math.round(x.r)} €`, sous: `${eur(x.d)} dépensés · ${eur(x.v)} de ventes` }))} />
        </Carte>
      </Grille>
      <Note>Les textes et visuels sont préparés par l&apos;IA à partir de la charte de chaque enseigne ; aucune campagne ne part sans la validation de la direction marketing.</Note>
    </Page>
  );
}
