"use client";

/* La section « Plans sans rendez-vous » (05/10/2026, session B3) : les devis
   signés dont une séance reste à faire et qu'aucun rendez-vous à venir ne
   sert, du plus ancien au plus récent. L'accord de la mutuelle reçu sans
   rendez-vous, le devis qui expire et la famille à planifier dans la foulée
   sont dits sur la ligne. */

import { Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { FAMILLES, MUTUELLES } from "./libelles";
import type { PlanSansRdv } from "./types";

export default function Plans({ plans }: { plans: PlanSansRdv[] }) {
  return (
    <section id="tiroma-plans" className="esp-carte" aria-label="Plans sans rendez-vous">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Plans sans rendez-vous</h2>
        <span className="esp-kpi-sous">{plans.length ? `${plans.length} plan${plans.length > 1 ? "s" : ""} signé${plans.length > 1 ? "s" : ""}, du plus ancien au plus récent` : "Tous les plans signés ont leur rendez-vous"}</span>
      </div>
      <div className="esp-carte-corps">
        {!plans.length ? (
          <Vide titre="Aucun plan en attente">Un devis signé dont la séance suivante n&apos;a pas de rendez-vous remonte ici chaque matin.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Plans signés sans rendez-vous">
            {plans.map((p) => (
              <li key={p.plan_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={p.jours_depuis >= 42 ? "rouge" : p.jours_depuis >= 21 ? "ambre" : "bleu"}>{p.jours_depuis} jour{p.jours_depuis > 1 ? "s" : ""}</Pastille>
                  {p.mutuelle_accord_sans_rdv ? <Pastille teinte="vert">Accord de mutuelle reçu</Pastille> : p.mutuelle_statut && p.mutuelle_statut !== "non_requise" ? <Pastille teinte="gris" contour>{MUTUELLES[p.mutuelle_statut]}</Pastille> : null}
                  {p.jours_avant_expiration !== null && p.jours_avant_expiration <= 30 ? <Pastille teinte="ambre">Expire dans {p.jours_avant_expiration} j</Pastille> : null}
                  {p.a_verifier ? <Pastille teinte="ambre" contour title="Plusieurs plans pourraient servir le même rendez-vous : à vérifier">À vérifier</Pastille> : null}
                  {p.ne_pas_contacter ? <Pastille teinte="rouge" contour>Ne pas contacter</Pastille> : null}
                </span>
                <span className="esp-item-montant">{montant(p.montant)}{p.reste_a_charge !== null ? <span className="esp-kpi-sous" style={{ display: "block", fontWeight: 400 }}>reste {montant(p.reste_a_charge)}</span> : null}</span>
                <span className="esp-item-titre">
                  {p.patient_nom} — {p.prochaine?.libelle ?? (p.prochaine?.famille ? FAMILLES[p.prochaine.famille] : "séance à poser")}
                  {p.prochaine?.seance ? ` (séance ${p.prochaine.seance})` : ""}
                </span>
                <span className="esp-item-bas">
                  <span>Devis {p.devis_numero ?? "—"} signé le {dateCourte(p.signe_le ?? p.depuis)}</span>
                  {p.praticien_nom ? <span>{p.praticien_nom}</span> : null}
                  <span>{p.lignes_faites} faite{p.lignes_faites > 1 ? "s" : ""} · {p.lignes_a_faire} à faire{p.prochaine?.duree_min ? ` · ${p.prochaine.duree_min} min` : ""}</span>
                  {p.proches_a_planifier ? <span>Famille : {p.proches_a_planifier} proche{p.proches_a_planifier > 1 ? "s" : ""} à planifier dans la foulée</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
