"use client";

/* Gouvernance : qui a demandé quoi à l'IA, qui a accès à quoi, les règles
   du groupe, et l'usage des IA non autorisées repéré dans les filiales. */

import { Carte, Grille, Kpi, Kpis, Ligne, Liste, Page, Pastille, Tableau, Tete } from "../ui3";

const QUESTIONS = [
  { qui: "Le Président", quoi: "Quelles sociétés passent sous leur plancher de trésorerie d'ici fin novembre ?", quand: "07:12", donnees: "Banques, comptabilité" },
  { qui: "M. Laurent (Finance)", quoi: "Liste des clients communs à 3 sociétés ou plus avec un échu > 60 jours", quand: "07:48", donnees: "Comptabilité, ERP" },
  { qui: "Mme Rosan (Marketing)", quoi: "Quels magasins ont perdu le plus de clients fidèles depuis juin ?", quand: "08:05", donnees: "Caisses, CRM" },
  { qui: "Mme Bellay (Juridique)", quoi: "Tous les baux avec une révision triennale avant mars 2027", quand: "08:31", donnees: "Contrats et baux" },
  { qui: "Gérant Soléa Auto MQ", quoi: "Mes 20 meilleurs clients atelier qui ne sont pas venus depuis un an", quand: "08:44", donnees: "ERP (sa société seulement)" },
  { qui: "M. Céleste (Opérations)", quoi: "Ruptures fruits et légumes au Lamentin sur 4 semaines, par fournisseur", quand: "09:02", donnees: "Caisses, ERP" },
];

const REGLES = [
  { regle: "Une décision de plus de 150 k€ remonte à la présidence", portee: "Tout le groupe" },
  { regle: "Aucun message ne part vers un client ou un fournisseur sans validation humaine", portee: "Tout le groupe" },
  { regle: "Un gérant ne voit que les données de sa société", portee: "Gérants" },
  { regle: "La direction marketing ne voit aucun résultat ni trésorerie par société", portee: "Marketing" },
  { regle: "Les salaires et les dossiers du personnel ne sont pas dans le coffre", portee: "Tout le groupe" },
  { regle: "Plafond d'encours client : 400 k€ tous sociétés confondues", portee: "Finance" },
];

export default function Gouvernance() {
  return (
    <Page>
      <Tete titre="Gouvernance et journal" sous="Une seule IA pour tout le groupe, avec les mêmes règles partout : chacun ne voit que son périmètre, rien ne part sans validation, et tout est au journal." />
      <Kpis>
        <Kpi libelle="Questions posées aujourd'hui" valeur="214" sous="par 61 personnes" />
        <Kpi libelle="Réponses refusées" valeur="3" sous="hors du périmètre de la personne" teinte="ambre" />
        <Kpi libelle="IA non autorisées repérées" valeur="2" sous="sur les postes de 2 filiales" teinte="rouge" />
        <Kpi libelle="Lectures au journal" valeur="1,2 M" sous="ce mois, exportables" />
      </Kpis>
      <Carte titre="Dernières questions posées au coffre" sous="Qui, quoi, sur quelles données" plein>
        <Tableau colonnes={[{ libelle: "Heure" }, { libelle: "Qui" }, { libelle: "Question" }, { libelle: "Données lues" }]}>
          {QUESTIONS.map((q) => (
            <tr key={q.quand}>
              <td>{q.quand}</td>
              <td>{q.qui}</td>
              <td style={{ whiteSpace: "normal", minWidth: 280 }}>{q.quoi}</td>
              <td>{q.donnees}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
      <Grille>
        <Carte titre="Les règles du groupe" sous="Écrites une fois, appliquées dans chaque société">
          <Liste>
            {REGLES.map((r) => (
              <Ligne key={r.regle} teinte="vert" titre={r.regle} fin={<Pastille>{r.portee}</Pastille>} />
            ))}
          </Liste>
        </Carte>
        <Carte titre="IA hors du cadre du groupe" sous="Outils d'IA grand public repérés sur le réseau des filiales">
          <Liste>
            <Ligne teinte="rouge" titre="Assistant grand public — 14 postes" sous="Brico Soléa Martinique · données clients copiées" fin="depuis 3 sem." />
            <Ligne teinte="rouge" titre="Générateur de visuels — 6 postes" sous="Soléa Auto Guadeloupe · compte personnel" fin="depuis 5 j" />
            <Ligne teinte="vert" titre="Ces équipes ont reçu un accès à l'IA du groupe" sous="Proposition envoyée à la DSI ce matin" />
          </Liste>
        </Carte>
      </Grille>
    </Page>
  );
}
