"use client";

/* La fiche d'une société : ses chiffres, ses systèmes Omega, ses échéances. */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RACINE } from "../poste";
import { COUT_PAR_SOCIETE, ECHEANCES, SYSTEMES, keur, pole, quand, type Societe } from "../donnees";
import { Carte, Grille, Kpi, Kpis, Ligne, Liste, Page, Pastille, Tendance, Tete } from "../ui3";

const DEPLOIEMENT = { actif: "Actif", pilote: "En pilote", non: "Pas encore" } as const;

export default function FicheSociete({ s }: { s: Societe }) {
  const p = pole(s.pole);
  const echeances = ECHEANCES.filter((e) => e.societe === s.id);
  const ia = COUT_PAR_SOCIETE.find((c) => c.id === s.id);
  return (
    <Page>
      <Link href={`${RACINE}/groupe`} className="e3-lien">
        <ArrowLeft width={14} height={14} aria-hidden="true" /> Le groupe sur une page
      </Link>
      <Tete titre={s.nom} sous={`${s.activite} · ${s.territoire} · ${p?.nom} · ${s.effectif} salariés`} />
      <Kpis>
        <Kpi libelle="Ventes de la semaine" valeur={s.ventes ? keur(s.ventes) : "—"} sous={s.ventes ? <><Tendance v={s.vsS1} /> sur S-1 · <Tendance v={s.vsN1} /> sur N-1</> : "société sans ventes externes"} />
        <Kpi libelle="Objectif cumulé" valeur={`${s.objectif} %`} teinte={s.objectif >= 100 ? "vert" : s.objectif >= 95 ? "ambre" : "rouge"} sous={`Résultat cumulé : ${keur(s.resultat)}`} />
        <Kpi libelle="Trésorerie" valeur={keur(s.tresorerie)} teinte={s.tresorerie < s.plancher ? "rouge" : "vert"} sous={`Plancher ${keur(s.plancher)} · ${keur(s.echeances30)} à 30 jours`} />
        <Kpi libelle="Encours clients" valeur={keur(s.encours)} sous={`${keur(s.echu90)} échus à plus de 90 jours`} />
      </Kpis>
      <Grille>
        <Carte titre="Omega dans cette société">
          <Liste>
            {SYSTEMES.map((x) => (
              <Ligne key={x.cle} teinte={s.systemes[x.cle] === "actif" ? "vert" : s.systemes[x.cle] === "pilote" ? "bleu" : undefined} titre={x.nom} sous={x.role} fin={<span className="e3-case" data-etat={s.systemes[x.cle]}>{DEPLOIEMENT[s.systemes[x.cle]]}</span>} />
            ))}
          </Liste>
        </Carte>
        <Carte titre="Données et IA">
          <Liste>
            <Ligne teinte="vert" titre={`${s.sources} sources branchées au coffre`} sous={`Dernière lecture : ${s.fraicheur}`} href={`${RACINE}/coffre`} />
            <Ligne titre={`${ia?.utilisateurs ?? 8} personnes utilisent l'IA du groupe`} sous={`Coût du mois : ${ia ? `${ia.cout.toLocaleString("fr-FR")} €` : "inclus dans « autres sociétés »"}`} href={`${RACINE}/consommation`} />
            <Ligne titre={s.reporting === "recu" ? "Reporting de la semaine reçu" : s.reporting === "retard" ? "Reporting de la semaine en retard" : "Reporting de la semaine manquant"} teinte={s.reporting === "recu" ? "vert" : s.reporting === "retard" ? "ambre" : "rouge"} />
          </Liste>
        </Carte>
      </Grille>
      <Carte titre="Échéances de la société">
        {echeances.length ? (
          <Liste>
            {echeances.map((e) => (
              <Ligne key={e.id} teinte={e.jours < 0 ? "rouge" : e.jours <= 3 ? "ambre" : undefined} titre={e.titre} sous={`${e.type} · ${e.direction}`} fin={<>{e.enjeu ? keur(e.enjeu) : null} <Pastille teinte={e.jours < 0 ? "rouge" : "gris"}>{quand(e.jours)}</Pastille></>} />
            ))}
          </Liste>
        ) : (
          <p className="v2-gris" style={{ margin: 0 }}>Aucune échéance dans les 90 prochains jours.</p>
        )}
      </Carte>
    </Page>
  );
}
