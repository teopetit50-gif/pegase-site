"use client";

/* Avis et demandes : la note Google et les demandes clients de chaque
   enseigne, et le temps qu'il faut pour y répondre. */

import { ENSEIGNES, nb } from "../donnees";
import { Carte, Kpi, Kpis, Note, Page, Pastille, Tableau, Tete } from "../ui3";

export default function Avis() {
  const avis = ENSEIGNES.reduce((a, e) => a + e.avisMois, 0);
  const note = ENSEIGNES.reduce((a, e) => a + e.noteGoogle * e.avisMois, 0) / avis;
  const demandes = ENSEIGNES.reduce((a, e) => a + e.demandes, 0);
  const sans = ENSEIGNES.reduce((a, e) => a + e.sansReponse, 0);
  return (
    <Page>
      <Tete titre="Avis et demandes" sous="Chaque avis Google reçoit une réponse signée par le magasin, chaque demande (téléphone, formulaire, WhatsApp, e-mail) une réponse à toute heure. L'IA prépare, l'équipe valide ce qui sort de l'ordinaire." />
      <Kpis>
        <Kpi libelle="Note Google moyenne" valeur={`${note.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ★`} sous={`${nb(avis)} avis ce mois`} />
        <Kpi libelle="Avis avec réponse" valeur="100 %" teinte="vert" sous="délai médian : 6 min" />
        <Kpi libelle="Demandes reçues" valeur={nb(demandes)} sous="tous canaux, ce mois" />
        <Kpi libelle="Sans réponse" valeur={sans} teinte={sans ? "ambre" : "vert"} sous="hors de la base de connaissances" />
      </Kpis>
      <Carte titre="Par enseigne" plein>
        <Tableau colonnes={[{ libelle: "Enseigne" }, { libelle: "Note", num: true }, { libelle: "Avis du mois", num: true }, { libelle: "Demandes", num: true }, { libelle: "Première réponse", num: true }, { libelle: "Sans réponse", num: true }]}>
          {[...ENSEIGNES].sort((a, b) => a.noteGoogle - b.noteGoogle).map((e) => (
            <tr key={e.id}>
              <td>{e.nom}</td>
              <td className="v2-num">
                <Pastille teinte={e.noteGoogle < 4 ? "rouge" : e.noteGoogle < 4.3 ? "ambre" : "vert"}>{e.noteGoogle.toLocaleString("fr-FR")} ★</Pastille>
              </td>
              <td className="v2-num">{e.avisMois}</td>
              <td className="v2-num">{nb(e.demandes)}</td>
              <td className="v2-num">{e.reponseMediane}</td>
              <td className="v2-num">{e.sansReponse || "—"}</td>
            </tr>
          ))}
        </Tableau>
      </Carte>
      <Note>Les demandes sont traitées par REPUT, sur les sujets autorisés par chaque enseigne : prix, rendez-vous, disponibilités, horaires. Une réclamation, un litige ou un sujet sensible passe toujours par une personne.</Note>
    </Page>
  );
}
