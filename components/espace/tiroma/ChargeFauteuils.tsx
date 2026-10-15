"use client";

/* La section « Charge des fauteuils » (05/10/2026, session B3), réservée au
   titulaire : par fauteuil et par demi-journée, jamais par personne. Une
   demi-journée ouverte sous le seuil des règles est dite « vide ». */

import { Pastille, Vide } from "../ui";
import { dateLongue } from "../format";
import { CAPACITES, minutesEnClair } from "./libelles";
import type { Charge, DemiJournee } from "./types";

function Jauge({ d, etiquette }: { d: DemiJournee; etiquette: string }) {
  const taux = d.taux ?? 0;
  return (
    <div>
      <div className="esp-item-haut" style={{ justifyContent: "space-between" }}>
        <span className="esp-kpi-sous">{etiquette}</span>
        <span className="esp-kpi-sous">{d.ouvert_min ? `${Math.round(taux * 100)} % · ${minutesEnClair(d.prevu_min)} sur ${minutesEnClair(d.ouvert_min)}` : "fermé"}</span>
      </div>
      <div aria-hidden="true" style={{ height: 6, borderRadius: 9999, background: "#e3e3e3", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round(taux * 100))}%`, background: d.vide ? "#d99a1e" : "#1e6b3a" }} />
      </div>
    </div>
  );
}

export default function ChargeFauteuils({ charge, titulaire }: { charge: Charge | null; titulaire: boolean }) {
  return (
    <section id="tiroma-charge" className="esp-carte" aria-label="Charge des fauteuils">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Charge des fauteuils</h2>
        <span className="esp-kpi-sous">{charge ? `${dateLongue(`${charge.jour}T12:00:00`)} · ${charge.total.taux !== null ? `${Math.round(charge.total.taux * 100)} % prévu` : "pas d'horaires"}` : "Réservé au titulaire"}</span>
      </div>
      <div className="esp-carte-corps">
        {!titulaire ? (
          <Vide titre="Vue réservée au titulaire">La charge se lit par fauteuil et par demi-journée, jamais par personne, et seul le titulaire la voit.</Vide>
        ) : !charge || !charge.fauteuils.length ? (
          <Vide titre="Aucun fauteuil ou aucun horaire">Posez les fauteuils et les horaires du cabinet dans la carte « Le cabinet » pour lire la charge.</Vide>
        ) : (
          <>
            {charge.demi_journees_vides ? (
              <p className="esp-fil-meta" style={{ marginBottom: 10 }}>
                {charge.demi_journees_vides} demi-journée{charge.demi_journees_vides > 1 ? "s" : ""} sous {Math.round(charge.seuil_demi_journee_vide * 100)} % : des soins à déplacer, ou un créneau à proposer.
              </p>
            ) : null}
            <div className="esp-grille">
              {charge.fauteuils.map((f) => (
                <div key={f.fauteuil_id} className="esp-item" style={{ cursor: "default", gridTemplateColumns: "1fr", gap: 8 }}>
                  <span className="esp-item-haut">
                    <strong>{f.nom}</strong>
                    {f.capacites.map((c) => <Pastille key={c} teinte="gris" contour>{CAPACITES[c]}</Pastille>)}
                    {f.matin.vide || f.apres_midi.vide ? <Pastille teinte="ambre">{f.matin.vide && f.apres_midi.vide ? "Journée vide" : f.matin.vide ? "Matin vide" : "Après-midi vide"}</Pastille> : null}
                  </span>
                  <Jauge d={f.matin} etiquette="Matin" />
                  <Jauge d={f.apres_midi} etiquette="Après-midi" />
                  <span className="esp-item-bas">
                    <span>{f.rendez_vous} rendez-vous</span>
                    <span>{f.assistante_habituelle ? `Assistante : ${f.assistante_habituelle}` : "Sans assistante habituelle"}</span>
                    {f.sans_assistante_exigee ? <span style={{ color: "#b45309" }}>{f.sans_assistante_exigee} soin{f.sans_assistante_exigee > 1 ? "s" : ""} exige{f.sans_assistante_exigee > 1 ? "nt" : ""} une assistante : à basculer</span> : null}
                    {f.objectif_occupation !== null ? <span>Objectif {Math.round(f.objectif_occupation * 100)} %</span> : null}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
