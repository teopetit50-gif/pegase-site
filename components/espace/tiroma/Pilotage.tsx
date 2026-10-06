"use client";

/* La section « Pilotage » (06/10/2026, session B3, b3_13) : pour le
   titulaire et la direction, les trente derniers jours en euros. Taux
   d'acceptation des devis (et la période d'avant), chiffre signé qui attend
   un rendez-vous, devis présentés restés sans réponse, rendez-vous manqués
   par praticien. Les devis à relancer s'appellent depuis la liste ; l'appel
   se note dans le registre (b3_12). */

import { Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { PANIERS } from "./libelles";
import type { CibleAppel, Pilotage as PilotageT } from "./types";

function taux(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

/** Les montants des tuiles, à l'euro : « 18 460 € » tient dans une tuile à 390 px. */
function euros(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

/** « +7 pts » / « −1 pt » : l'écart avec la période d'avant, en points. */
function ecart(v: number | null, avant: number | null): string | null {
  if (v === null || avant === null) return null;
  const pts = Math.round((v - avant) * 1000) / 10;
  if (pts === 0) return "comme la période d'avant";
  return `${pts > 0 ? "+" : "−"}${Math.abs(pts).toLocaleString("fr-FR")} pt${Math.abs(pts) >= 2 ? "s" : ""} sur la période d'avant`;
}

export default function Pilotage({ pilotage, appeler }: { pilotage: PilotageT | null; appeler?: (c: CibleAppel) => void }) {
  if (!pilotage) return null;
  const d = pilotage.devis;
  const r = pilotage.rendez_vous;
  const a = pilotage.en_attente;
  /* « expire bientôt » : sous trente jours, comptés depuis le jour du cabinet (fin de période) */
  const fin = new Date(`${pilotage.periode.au}T12:00:00`);
  fin.setDate(fin.getDate() + 30);
  const limite = fin.toISOString().slice(0, 10);
  return (
    <section id="tiroma-pilotage" className="esp-carte" aria-label="Pilotage">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Pilotage</h2>
        <span className="esp-kpi-sous">Du {dateCourte(pilotage.periode.du)} au {dateCourte(pilotage.periode.au)} · réservé au titulaire</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <div className="esp-kpis" style={{ marginBottom: 0 }}>
          <div className="esp-kpi">
            <span className="esp-kpi-etiquette">Devis acceptés</span>
            <span className="esp-kpi-valeur">{taux(d.taux)}</span>
            <span className="esp-kpi-sous">{d.signes} sur {d.presentes} · {euros(d.montant_signe)} signés{ecart(d.taux, d.precedent.taux) ? ` · ${ecart(d.taux, d.precedent.taux)}` : ""}</span>
          </div>
          <div className="esp-kpi" data-teinte={pilotage.plans_sans_rdv.nombre ? "bleu" : undefined}>
            <span className="esp-kpi-etiquette">Signé, sans rendez-vous</span>
            <span className="esp-kpi-valeur">{euros(pilotage.plans_sans_rdv.montant)}</span>
            <span className="esp-kpi-sous">{pilotage.plans_sans_rdv.nombre} plan{pilotage.plans_sans_rdv.nombre > 1 ? "s" : ""} à replanifier</span>
          </div>
          <div className="esp-kpi" data-teinte={a.a_relancer ? "ambre" : undefined}>
            <span className="esp-kpi-etiquette">Devis sans réponse</span>
            <span className="esp-kpi-valeur">{euros(a.montant)}</span>
            <span className="esp-kpi-sous">{a.devis} devis · {a.a_relancer} à relancer{a.expirent_30j ? ` · ${a.expirent_30j} expire${a.expirent_30j > 1 ? "nt" : ""} sous 30 j` : ""}</span>
          </div>
          <div className="esp-kpi" data-teinte={r.taux_manques !== null && r.taux_manques >= 0.05 ? "rouge" : undefined}>
            <span className="esp-kpi-etiquette">Rendez-vous manqués</span>
            <span className="esp-kpi-valeur">{taux(r.taux_manques)}</span>
            <span className="esp-kpi-sous">{r.manques} sur {r.passes}{ecart(r.taux_manques, r.precedent.taux_manques) ? ` · ${ecart(r.taux_manques, r.precedent.taux_manques)}` : ""}</span>
          </div>
        </div>

        <div className="esp-grille">
          <div>
            <h3 className="esp-groupe-titre">Par panier</h3>
            {!d.par_panier.length ? <p className="esp-fil-meta">Aucun devis présenté sur la période.</p> : (
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Devis par panier (tableau qui défile)">
                <table className="esp-tableau">
                  <thead><tr><th>Panier</th><th>Présentés</th><th>Acceptés</th><th>Signé</th></tr></thead>
                  <tbody>
                    {d.par_panier.map((x) => (
                      <tr key={x.panier}>
                        <td>{PANIERS[x.panier] ?? x.panier}</td>
                        <td>{x.presentes}</td>
                        <td>{taux(x.presentes ? x.signes / x.presentes : null)}</td>
                        <td>{montant(x.montant_signe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h3 className="esp-groupe-titre">Manqués par praticien</h3>
            {!r.par_praticien.length ? <p className="esp-fil-meta">Aucun rendez-vous passé sur la période.</p> : (
              <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Manqués par praticien (tableau qui défile)">
                <table className="esp-tableau">
                  <thead><tr><th>Praticien</th><th>Passés</th><th>Manqués</th><th>Taux</th></tr></thead>
                  <tbody>
                    {r.par_praticien.map((x) => (
                      <tr key={x.praticien_id ?? "sans"}>
                        <td>{x.nom ?? "Sans praticien"}</td>
                        <td>{x.passes}</td>
                        <td>{x.manques}</td>
                        <td>{taux(x.taux)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="esp-groupe-titre">Devis à relancer</h3>
          {!a.a_relancer_liste.length ? (
            <Vide titre="Aucun devis à relancer">Un devis présenté depuis une semaine, sans réponse ni appel noté depuis quinze jours, remonte ici.</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Devis à relancer">
              {a.a_relancer_liste.map((x) => (
                <li key={x.plan_id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut">
                    {x.panier ? <Pastille teinte="gris" contour>{PANIERS[x.panier] ?? x.panier}</Pastille> : null}
                    {x.valide_jusqu_au && x.valide_jusqu_au <= limite ? <Pastille teinte="ambre">Expire le {dateCourte(x.valide_jusqu_au)}</Pastille> : null}
                  </span>
                  <span className="esp-item-montant">{montant(x.montant)}{x.reste_a_charge !== null ? <span className="esp-kpi-sous" style={{ display: "block", fontWeight: 400 }}>reste {montant(x.reste_a_charge)}</span> : null}</span>
                  <span className="esp-item-titre">{x.patient_nom} — devis {x.devis_numero ?? "—"}</span>
                  <span className="esp-item-bas">
                    <span>Présenté le {dateCourte(x.presente_le)}</span>
                    {appeler ? <button type="button" className="esp-lien-bouton" onClick={() => appeler({ patient_id: x.patient_id, patient_nom: x.patient_nom, motif: "devis", plan_id: x.plan_id, evenement_id: null })}>Noter l&apos;appel</button> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
