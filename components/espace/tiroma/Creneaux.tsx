"use client";

/* La section « Créneaux à sauver » (05/10/2026, session B3) : chaque créneau
   libéré (annulation, report, déplacement lus dans le logiciel) avec les
   patients qui peuvent le reprendre, dans l'ordre des règles du cabinet :
   plan accepté, puis liste d'attente, puis contrôle dû. L'assistante
   appelle ; Tiroma ne contacte jamais un patient. */

import { Phone } from "lucide-react";
import { Pastille, Vide } from "../ui";
import { DernierAppelLigne } from "./Appels";
import { FAMILLES, ORIGINES, TYPES_CRENEAU, heureCourte, jourEtHeure, minutesEnClair } from "./libelles";
import type { CibleAppel, Creneau, DernierAppel } from "./types";

export default function Creneaux({ creneaux, horizon, derniers, appeler }: { creneaux: Creneau[]; horizon: number; derniers?: Record<string, DernierAppel>; appeler?: (c: CibleAppel) => void }) {
  return (
    <section id="tiroma-creneaux" className="esp-carte" aria-label="Créneaux à sauver">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Créneaux à sauver</h2>
        <span className="esp-kpi-sous">{creneaux.length ? `${creneaux.length} créneau${creneaux.length > 1 ? "x" : ""} libéré${creneaux.length > 1 ? "s" : ""} dans les ${horizon} prochains jours` : `Rien de libéré dans les ${horizon} prochains jours`}</span>
      </div>
      <div className="esp-carte-corps">
        {!creneaux.length ? (
          <Vide titre="Aucun créneau à sauver">Quand un patient annule, reporte ou déplace un rendez-vous à venir, le créneau arrive ici avec les patients qui peuvent le reprendre.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Créneaux libérés">
            {creneaux.map((c) => (
              <li key={String(c.evenement_id)} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={c.libre ? "ambre" : "gris"}>{TYPES_CRENEAU[c.type]}</Pastille>
                  {c.famille ? <Pastille teinte="noir" contour>{FAMILLES[c.famille]}</Pastille> : null}
                  {!c.libre ? <Pastille teinte="vert">Déjà repris</Pastille> : null}
                </span>
                <span className="esp-item-titre">
                  {jourEtHeure(c.debut)} → {heureCourte(c.fin)} · {minutesEnClair(c.minutes)}
                  {c.fauteuil_nom ? ` · ${c.fauteuil_nom}` : ""}
                  {c.praticien_nom ? ` · ${c.praticien_nom}` : ""}
                </span>
                <span className="esp-item-bas">
                  <span>Libéré le {jourEtHeure(c.detecte_le)}</span>
                </span>
                {c.libre ? (
                  c.candidats.length ? (
                    <ol className="esp-fil" aria-label="Patients à appeler, dans l'ordre" style={{ marginTop: 10, gridColumn: "1 / -1" }}>
                      {c.candidats.map((k) => (
                        <li key={`${c.evenement_id}-${k.rang}`}>
                          <span className="esp-fil-point" data-teinte={ORIGINES[k.origine].teinte} />
                          <div className="esp-fil-texte">
                            <span className="esp-item-haut">
                              <strong>{k.rang}. {k.patient_nom}</strong>
                              <Pastille teinte={ORIGINES[k.origine].teinte}>{ORIGINES[k.origine].libelle}</Pastille>
                              {!k.preferences_ok ? <Pastille teinte="gris" contour title="Ses disponibilités connues ne couvrent pas ce créneau">hors préférences</Pastille> : null}
                            </span>
                            <div className="esp-fil-meta">{k.motif} · {minutesEnClair(k.duree_min)}</div>
                            <DernierAppelLigne d={derniers?.[k.patient_id]} />
                            {appeler && !k.ne_pas_contacter ? (
                              <button type="button" className="esp-lien-bouton" style={{ justifySelf: "start" }}
                                onClick={() => appeler({ patient_id: k.patient_id, patient_nom: k.patient_nom, motif: "creneau", plan_id: k.plan_id, evenement_id: c.evenement_id })}>
                                Noter l&apos;appel
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="esp-fil-meta" style={{ marginTop: 8, gridColumn: "1 / -1" }}>Aucun patient ne convient avec les règles du cabinet (durée, préférences, préavis, quota de contrôles).</div>
                  )
                ) : null}
                {c.libre && c.candidats.length ? (
                  <div className="esp-fil-meta" style={{ marginTop: 8, gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6 }}>
                    <Phone width={14} height={14} aria-hidden="true" /> L&apos;assistante appelle dans cet ordre ; le rendez-vous se pose dans le logiciel du cabinet.
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
