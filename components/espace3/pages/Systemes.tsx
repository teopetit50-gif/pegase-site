"use client";

/* Omega dans le groupe : quel système tourne dans quelle société, et ce
   que chacun a rendu ce mois-ci. */

import Link from "next/link";
import { RACINE } from "../poste";
import { POLES, SOCIETES, SYSTEMES, nb } from "../donnees";
import { Carte, Grille, Kpi, Kpis, Note, Page, Tableau, Tete } from "../ui3";

const RENDU: Record<string, { chiffre: string; libelle: string; detail: string }> = {
  varelo: { chiffre: "18", libelle: "sociétés sur une page", detail: "6 points du matin par jour, 214 décisions préparées ce mois" },
  filed: { chiffre: "31 400", libelle: "factures lues ce mois", detail: "412 écarts bloqués avant paiement, dont 3 doublons à 40 k€" },
  cashd: { chiffre: "2,1 M€", libelle: "encaissés après relance", detail: "6 920 relances validées, délai moyen de paiement −9 jours" },
  offload: { chiffre: "684 k€", libelle: "de ventes reprises", detail: "1 912 clients inactifs revenus en 3 mois" },
  reput: { chiffre: "12 300", libelle: "demandes traitées", detail: "première réponse en 5 min médiane, 12 sans réponse" },
};

const LIBELLE = { actif: "Actif", pilote: "Pilote", non: "—" } as const;

export default function Systemes() {
  const actifs = SOCIETES.reduce((a, s) => a + Object.values(s.systemes).filter((x) => x === "actif").length, 0);
  const pilotes = SOCIETES.reduce((a, s) => a + Object.values(s.systemes).filter((x) => x === "pilote").length, 0);
  const possibles = SOCIETES.length * SYSTEMES.length;
  return (
    <Page>
      <Tete titre="Omega dans le groupe" sous="Quel système tourne dans quelle société. Un pôle d'abord, puis le groupe : chaque nouvelle société se branche sur le même coffre et les mêmes règles." />
      <Kpis>
        <Kpi libelle="Systèmes actifs" valeur={actifs} teinte="vert" sous={`sur ${possibles} possibles`} />
        <Kpi libelle="En pilote" valeur={pilotes} teinte="bleu" sous="jugés sur un trimestre" />
        <Kpi libelle="À ouvrir" valeur={possibles - actifs - pilotes} sous="là où le besoin est repéré" />
        <Kpi libelle="Personnes qui s'en servent" valeur={nb(322)} sous="dans 18 sociétés" />
      </Kpis>
      <Grille modele="trois">
        {SYSTEMES.map((x) => (
          <section key={x.cle} className="v2-carte v2-carte-corps e3-dir">
            <div className="e3-dir-tete">
              <div>
                <h2 className="v2-h2">{x.nom}</h2>
                <small>{x.role}</small>
              </div>
            </div>
            <div>
              <strong style={{ fontSize: 24, fontFamily: "var(--font-v2-manrope)" }}>{RENDU[x.cle].chiffre}</strong> <span className="v2-gris">{RENDU[x.cle].libelle}</span>
            </div>
            <p className="e3-note">{RENDU[x.cle].detail}</p>
          </section>
        ))}
      </Grille>
      <Carte titre="Sociétés × systèmes" plein>
        <Tableau colonnes={[{ libelle: "Société" }, ...SYSTEMES.map((x) => ({ libelle: x.nom }))]}>
          {POLES.map((p) => [
            <tr key={p.cle} data-pole="">
              <td colSpan={SYSTEMES.length + 1}>
                <span className="e3-couleur" style={{ background: p.couleur, marginRight: 8 }} aria-hidden="true" />
                {p.nom}
              </td>
            </tr>,
            ...SOCIETES.filter((s) => s.pole === p.cle).map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`${RACINE}/societe/${s.id}`}>{s.nom}</Link>
                </td>
                {SYSTEMES.map((x) => (
                  <td key={x.cle}>
                    <span className="e3-case" data-etat={s.systemes[x.cle]}>
                      {LIBELLE[s.systemes[x.cle]]}
                    </span>
                  </td>
                ))}
              </tr>
            )),
          ])}
        </Tableau>
      </Carte>
      <Note>Chaque système se pilote depuis la société concernée ; la présidence en lit le résultat ici.</Note>
    </Page>
  );
}
