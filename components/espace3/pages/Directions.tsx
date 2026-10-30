"use client";

/* Les directions : ce qui attend chacune, ses retards, et si son point du
   matin a été lu. */

import { DIRECTIONS } from "../donnees";
import { Grille, Kpi, Kpis, Page, Pastille, Tete } from "../ui3";

export default function Directions() {
  const attente = DIRECTIONS.reduce((a, d) => a + d.enAttente, 0);
  const retard = DIRECTIONS.reduce((a, d) => a + d.enRetard, 0);
  const lus = DIRECTIONS.filter((d) => d.lu).length;
  const mois = DIRECTIONS.reduce((a, d) => a + d.decisionsMois, 0);
  return (
    <Page>
      <Tete titre="Les directions" sous="Chaque matin à 6 h 15, chaque direction reçoit son point : au plus trois décisions, avec le calcul et les pièces. Ici, qui l'a lu, et ce qui attend encore." />
      <Kpis>
        <Kpi libelle="Points du matin lus" valeur={`${lus} / ${DIRECTIONS.length}`} sous="avant 8 h" teinte={lus === DIRECTIONS.length ? "vert" : "ambre"} />
        <Kpi libelle="Décisions en attente" valeur={attente} />
        <Kpi libelle="En retard" valeur={retard} teinte={retard ? "rouge" : "vert"} sous="au-delà du délai fixé par le groupe" />
        <Kpi libelle="Décisions prises ce mois" valeur={mois} sous="toutes au journal" />
      </Kpis>
      <Grille modele="trois">
        {DIRECTIONS.map((d) => (
          <section key={d.cle} className="v2-carte v2-carte-corps e3-dir">
            <div className="e3-dir-tete">
              <div>
                <h2 className="v2-h2">{d.nom}</h2>
                <small>{d.responsable}</small>
              </div>
              {d.lu ? <Pastille teinte="vert">Lu à {d.heureLecture}</Pastille> : <Pastille teinte="ambre">Pas encore lu</Pastille>}
            </div>
            <div className="e3-chiffres">
              <div>
                <span>En attente</span>
                <strong>{d.enAttente}</strong>
              </div>
              <div>
                <span>En retard</span>
                <strong style={{ color: d.enRetard ? "var(--v2-red-700)" : undefined }}>{d.enRetard}</strong>
              </div>
              <div>
                <span>Délai moyen</span>
                <strong>{d.delaiMoyen}</strong>
              </div>
            </div>
            <ul className="e3-puces">
              {d.sujets.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ))}
      </Grille>
    </Page>
  );
}
