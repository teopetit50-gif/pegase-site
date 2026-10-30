"use client";

/* La consommation d'IA et son coût : de quoi chiffrer, pour tout le groupe
   (CEO) ou pour la seule direction marketing. Un simulateur projette le
   coût quand d'autres sociétés ou d'autres personnes s'y mettent. */

import { useState } from "react";
import { usePoste } from "../Coquille3";
import { BUDGET, COUT_HORAIRE, COUT_JOURS_GROUPE, COUT_JOURS_MARKETING, COUT_PAR_SOCIETE, USAGES, eur, jetons, nb, societe } from "../donnees";
import { Barres, Carte, Courbe, Grille, Kpi, Kpis, Note, Page, Pastille, Tableau, Tete } from "../ui3";

const somme = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
const MODELES = [
  { nom: "Claude Opus", role: "Analyse, questions au coffre, points du matin", couleur: "#a46ede" },
  { nom: "Claude Sonnet", role: "Lecture de documents, rédaction", couleur: "#3f82cf" },
  { nom: "Claude Haiku", role: "Tri, classement, réponses courtes", couleur: "#3ecf8e" },
];

export default function Consommation() {
  const poste = usePoste();
  const marketing = poste === "marketing";
  const usages = marketing ? USAGES.filter((u) => u.direction === "Marketing") : USAGES;
  const jours = marketing ? COUT_JOURS_MARKETING : COUT_JOURS_GROUPE;
  const budget = marketing ? BUDGET.marketing : BUDGET.groupe;
  const cout = somme(jours, (j) => j);
  const tokens = somme(usages, (u) => u.jetons);
  const requetes = somme(usages, (u) => u.requetes);
  const heures = somme(usages, (u) => u.heures);
  const utilisateurs = marketing ? 34 : somme(COUT_PAR_SOCIETE, (c) => c.utilisateurs);
  const derniers7 = somme(jours.slice(-7), (j) => j);
  const projection = Math.round((derniers7 / 7) * 30.4);
  const valeur = heures * COUT_HORAIRE;

  const parModele = MODELES.map((m) => ({ ...m, cout: somme(usages.filter((u) => u.modele === m.nom), (u) => u.cout), jetons: somme(usages.filter((u) => u.modele === m.nom), (u) => u.jetons) })).filter((m) => m.cout > 0);
  const directions = ["Toutes", "Finance", "Juridique", "Opérations", "Marketing"].map((d) => ({ d, cout: somme(USAGES.filter((u) => u.direction === d), (u) => u.cout) }));

  return (
    <Page>
      <Tete
        titre={marketing ? "Consommation de l'IA du marketing" : "Consommation et coûts de l'IA"}
        sous={
          marketing
            ? "Ce que l'IA a fait pour la direction marketing sur les 30 derniers jours, ce que cela a coûté, et ce que cela a rendu à l'équipe."
            : "Tout ce que l'IA du groupe a lu, écrit et calculé sur les 30 derniers jours : par usage, par modèle, par direction et par société. De quoi chiffrer, et décider où l'étendre."
        }
      />
      <Kpis>
        <Kpi libelle="Coût sur 30 jours" valeur={eur(cout)} sous={<>{Math.round((cout / budget) * 100)} % du budget de {eur(budget)}</>} teinte={cout > budget * 0.9 ? "ambre" : "vert"} />
        <Kpi libelle="Projection du mois" valeur={eur(projection)} sous="au rythme des 7 derniers jours" />
        <Kpi libelle="Jetons traités" valeur={jetons(tokens)} sous={`${nb(requetes)} appels à l'IA`} />
        <Kpi libelle="Coût par personne" valeur={eur(cout / utilisateurs)} sous={`${nb(utilisateurs)} personnes actives ce mois`} />
        <Kpi libelle="Temps rendu aux équipes" valeur={`${nb(heures)} h`} sous={`soit ${Math.round(heures / 151)} équivalents temps plein`} />
        <Kpi libelle="Valeur de ce temps" valeur={eur(valeur)} sous={`à ${COUT_HORAIRE} € l'heure chargée`} />
        <Kpi libelle="Rapport valeur / coût" valeur={`× ${Math.round(valeur / cout)}`} teinte="vert" sous="temps valorisé pour 1 € d'IA" />
        <Kpi libelle="Coût moyen d'un appel" valeur={`${(cout / requetes).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} €`} sous="tous usages confondus" />
      </Kpis>

      <Grille modele="large">
        <Carte titre="Coût par jour" sous="30 derniers jours, en euros — les creux sont les week-ends">
          <Courbe valeurs={jours} barres format={(n) => eur(Math.round(n))} debut="Il y a 30 jours" fin="Hier" />
        </Carte>
        <Carte titre="Par modèle" sous="Le bon modèle à chaque tâche : le plus capable pour analyser, le plus rapide pour trier">
          <Barres lignes={parModele.map((m) => ({ libelle: m.nom, valeur: m.cout, texte: eur(m.cout), couleur: m.couleur, sous: `${jetons(m.jetons)} jetons · ${m.role}` }))} />
        </Carte>
      </Grille>

      <Carte titre="Par usage" sous="Ce que l'IA fait, combien de fois, pour quel coût et quel temps rendu" plein>
        <Tableau colonnes={[{ libelle: "Usage" }, { libelle: "Direction" }, { libelle: "Modèle" }, { libelle: "Appels", num: true }, { libelle: "Jetons", num: true }, { libelle: "Coût", num: true }, { libelle: "Heures rendues", num: true }, { libelle: "Coût de l'heure rendue", num: true }]}>
          {[...usages].sort((a, b) => b.cout - a.cout).map((u) => (
            <tr key={u.cle}>
              <td>{u.libelle}</td>
              <td>{u.direction}</td>
              <td>
                <Pastille>{u.modele.replace("Claude ", "")}</Pastille>
              </td>
              <td className="v2-num">{nb(u.requetes)}</td>
              <td className="v2-num">{jetons(u.jetons)}</td>
              <td className="v2-num">{eur(u.cout)}</td>
              <td className="v2-num">{nb(u.heures)} h</td>
              <td className="v2-num">{(u.cout / u.heures).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
            </tr>
          ))}
          <tr data-total="">
            <td>Total</td>
            <td />
            <td />
            <td className="v2-num">{nb(requetes)}</td>
            <td className="v2-num">{jetons(tokens)}</td>
            <td className="v2-num">{eur(somme(usages, (u) => u.cout))}</td>
            <td className="v2-num">{nb(heures)} h</td>
            <td className="v2-num">{(somme(usages, (u) => u.cout) / heures).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
          </tr>
        </Tableau>
      </Carte>

      {!marketing ? (
        <Grille>
          <Carte titre="Par direction" sous="Les usages communs (points du matin, questions, tri) sont partagés">
            <Barres lignes={directions.map((x) => ({ libelle: x.d === "Toutes" ? "Usages communs" : x.d, valeur: x.cout, texte: eur(x.cout) }))} />
          </Carte>
          <Carte titre="Par société" sous="Coût et personnes actives sur 30 jours" plein>
            <Tableau colonnes={[{ libelle: "Société" }, { libelle: "Personnes", num: true }, { libelle: "Coût", num: true }, { libelle: "Par personne", num: true }]}>
              {COUT_PAR_SOCIETE.map((c) => (
                <tr key={c.id}>
                  <td>{c.id === "autres" ? "Huit autres sociétés" : societe(c.id)?.nom}</td>
                  <td className="v2-num">{c.utilisateurs}</td>
                  <td className="v2-num">{eur(c.cout)}</td>
                  <td className="v2-num">{eur(c.cout / c.utilisateurs)}</td>
                </tr>
              ))}
            </Tableau>
          </Carte>
        </Grille>
      ) : null}

      <Simulateur marketing={marketing} coutActuel={cout} utilisateurs={utilisateurs} />
      <Note>Les montants sont ceux facturés par le fournisseur du modèle, au jeton près, sans marge. Les données restent dans l&apos;Union européenne et ne servent jamais à entraîner un modèle.</Note>
    </Page>
  );
}

/* « Et si… » : le coût projeté quand on ajoute des personnes ou des sociétés */
function Simulateur({ marketing, coutActuel, utilisateurs }: { marketing: boolean; coutActuel: number; utilisateurs: number }) {
  const [personnes, setPersonnes] = useState(marketing ? 60 : 600);
  const [societes, setSocietes] = useState(18);
  const [questions, setQuestions] = useState(2);
  const parQuestion = 1980 / 4870;
  const fixeParSociete = marketing ? 0 : (7090 - 1980) / 18;
  const mensuel = Math.round(personnes * questions * 21 * parQuestion * (marketing ? 0.6 : 1) + societes * fixeParSociete);
  return (
    <Carte titre="Chiffrer l'étape suivante" sous={`Aujourd'hui : ${eur(coutActuel)} par mois pour ${nb(utilisateurs)} personnes. Faites varier le périmètre.`}>
      <div className="e3-grille e3-grille--trois" style={{ alignItems: "end" }}>
        <label className="e3-curseur">
          <span>
            Personnes qui utilisent l&apos;IA <strong>{nb(personnes)}</strong>
          </span>
          <input type="range" min={marketing ? 10 : 100} max={marketing ? 200 : 2140} step={10} value={personnes} onChange={(e) => setPersonnes(Number(e.target.value))} />
        </label>
        {!marketing ? (
          <label className="e3-curseur">
            <span>
              Sociétés branchées <strong>{societes}</strong>
            </span>
            <input type="range" min={1} max={18} value={societes} onChange={(e) => setSocietes(Number(e.target.value))} />
          </label>
        ) : null}
        <label className="e3-curseur">
          <span>
            Questions par personne et par jour <strong>{questions}</strong>
          </span>
          <input type="range" min={1} max={30} value={questions} onChange={(e) => setQuestions(Number(e.target.value))} />
        </label>
      </div>
      <div className="e3-simulation">
        <div>
          <span>Coût mensuel estimé</span>
          <strong>{eur(mensuel)}</strong>
        </div>
        <div>
          <span>Sur un an</span>
          <strong>{eur(mensuel * 12)}</strong>
        </div>
        <div>
          <span>Par personne et par mois</span>
          <strong>{eur(mensuel / personnes)}</strong>
        </div>
      </div>
    </Carte>
  );
}
