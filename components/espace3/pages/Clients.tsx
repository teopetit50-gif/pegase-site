"use client";

/* Les clients du groupe : une base unifiée (un client = une fiche, dans
   toutes les enseignes), les segments, les inactifs à relancer. */

import { ENSEIGNES, REFERENTIEL, SEGMENTS, nb } from "../donnees";
import { Barres, Carte, Grille, Kpi, Kpis, Note, Page, Tableau, Tendance, Tete } from "../ui3";

export default function Clients() {
  const actifs = ENSEIGNES.reduce((a, e) => a + e.clientsActifs, 0);
  const inactifs = ENSEIGNES.reduce((a, e) => a + e.inactifs, 0);
  return (
    <Page>
      <Tete titre="Clients du groupe" sous="Une seule base pour toutes les enseignes : le client qui fait ses courses à Jarry, achète sa peinture chez Brico et fait réviser sa voiture chez Soléa Auto n'a plus qu'une fiche." />
      <Kpis>
        <Kpi libelle="Fiches clients uniques" valeur={nb(REFERENTIEL.clients.fiches)} sous={`${nb(REFERENTIEL.clients.doublons)} doublons fusionnés`} />
        <Kpi libelle="Clients actifs" valeur={nb(actifs)} sous={<><Tendance v={2.8} /> sur 12 mois</>} />
        <Kpi libelle="Présents dans 2 enseignes ou plus" valeur="48 200" sous="2,6 × plus de dépenses par an" teinte="vert" />
        <Kpi libelle="Inactifs à relancer" valeur={nb(inactifs)} teinte="ambre" sous="sans achat depuis leur rythme habituel" />
      </Kpis>
      <Carte titre="Segments" sous="Calculés chaque nuit sur 12 mois de tickets, de factures et de passages atelier" plein>
        <Tableau colonnes={[{ libelle: "Segment" }, { libelle: "Clients", num: true }, { libelle: "Part", num: true }, { libelle: "Valeur", num: true }, { libelle: "Sur 3 mois", num: true }]}>
          {SEGMENTS.map((s) => (
            <tr key={s.nom}>
              <td>{s.nom}</td>
              <td className="v2-num">{nb(s.clients)}</td>
              <td className="v2-num">{s.part} %</td>
              <td className="v2-num">{s.valeur}</td>
              <td className="v2-num">
                <Tendance v={s.tendance} inverse={s.nom.includes("inactifs")} />
              </td>
            </tr>
          ))}
        </Tableau>
      </Carte>
      <Grille>
        <Carte titre="Clients inactifs par enseigne" sous="Repérés par OFFLOAD, prêts à être relancés après votre accord">
          <Barres lignes={[...ENSEIGNES].sort((a, b) => b.inactifs - a.inactifs).slice(0, 7).map((e) => ({ libelle: e.nom, valeur: e.inactifs, texte: nb(e.inactifs), teinte: "ambre" }))} />
        </Carte>
        <Carte titre="Clients actifs par enseigne">
          <Barres lignes={[...ENSEIGNES].sort((a, b) => b.clientsActifs - a.clientsActifs).slice(0, 7).map((e) => ({ libelle: e.nom, valeur: e.clientsActifs, texte: nb(e.clientsActifs), sous: <Tendance v={e.vsN1} /> }))} />
        </Carte>
      </Grille>
      <Note>Les opposés au démarchage et les clients sans consentement sont exclus de toute relance. La direction marketing ne voit ni le résultat ni la trésorerie des sociétés.</Note>
    </Page>
  );
}
