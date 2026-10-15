"use client";

/* La section « Absences probables » (06/10/2026, session B3, b3_17) : les
   rendez-vous des trois prochains jours où le patient risque de ne pas venir,
   chacun avec ses raisons (manqués passés, nouveau patient, créneau à risque,
   rendez-vous pris de longue date). Un appel de confirmation la veille suffit
   souvent. Un patient qui a répondu NON au rappel vient en tête : son créneau
   est à libérer dans le logiciel. */

import { Pastille, Vide } from "../ui";
import { jourEtHeure } from "./libelles";
import type { AbsenceProbable, CibleAppel } from "./types";

const NIVEAUX: Record<AbsenceProbable["niveau"], { libelle: string; teinte: "rouge" | "ambre" | "noir" }> = {
  annonce: { libelle: "A annoncé son absence", teinte: "noir" },
  fort: { libelle: "Absence probable", teinte: "rouge" },
  moyen: { libelle: "Risque d'absence", teinte: "ambre" },
};

export default function Absences({ absences, appeler }: { absences: AbsenceProbable[] | null; appeler?: (c: CibleAppel) => void }) {
  if (!absences) return null;
  return (
    <section id="tiroma-absences" className="esp-carte" aria-label="Absences probables">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Absences probables</h2>
        <span className="esp-kpi-sous">{absences.length ? `${absences.length} rendez-vous à confirmer dans les trois jours` : "Rien à signaler dans les trois jours"}</span>
      </div>
      <div className="esp-carte-corps">
        {!absences.length ? (
          <Vide titre="Aucune absence probable">Un rendez-vous remonte ici quand le patient a déjà manqué, vient pour la première fois, ou tombe sur un créneau où les absences sont fréquentes.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Rendez-vous à risque d'absence">
            {absences.map((x) => (
              <li key={x.rendez_vous_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={NIVEAUX[x.niveau].teinte}>{NIVEAUX[x.niveau].libelle}</Pastille>
                </span>
                <span className="esp-item-titre">{x.patient_nom} — {jourEtHeure(x.debut)}</span>
                <span className="esp-item-bas">
                  <span>{x.raisons.join(" · ")}</span>
                  {x.praticien_nom ? <span>{x.praticien_nom}</span> : null}
                  {x.fauteuil_nom ? <span>{x.fauteuil_nom}</span> : null}
                  {appeler && !x.annonce ? (
                    <button type="button" className="esp-lien-bouton" onClick={() => appeler({ patient_id: x.patient_id, patient_nom: x.patient_nom, motif: "autre", plan_id: null, evenement_id: null })}>
                      Noter l&apos;appel
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
