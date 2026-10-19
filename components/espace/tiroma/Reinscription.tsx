"use client";

/* La section « Réinscription » (06/10/2026, session B3, b3_16) : parmi les
   patients vus ces trente derniers jours, la part qui a déjà son prochain
   rendez-vous, et la période d'avant. Pour le titulaire et la direction, le
   détail par praticien. Pour l'équipe, les patients repartis sans prochain
   rendez-vous ni plan en cours : la liste des appels à refaire (la direction
   n'y voit pas de nom). */

import { Pastille, Vide } from "../ui";
import { dateCourte } from "../format";
import type { CibleAppel, Reinscription as ReinscriptionT } from "./types";

function taux(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export default function Reinscription({ reinscription, appeler }: { reinscription: ReinscriptionT | null; appeler?: (c: CibleAppel) => void }) {
  if (!reinscription) return null;
  const r = reinscription;
  const ecart = r.taux !== null && r.precedent.taux !== null ? Math.round((r.taux - r.precedent.taux) * 1000) / 10 : null;
  return (
    <section id="tiroma-reinscription" className="esp-carte" aria-label="Réinscription">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Réinscription</h2>
        <span className="esp-kpi-sous">Patients vus du {dateCourte(r.periode.du)} au {dateCourte(r.periode.au)}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <div className="esp-kpis" style={{ marginBottom: 0 }}>
          <div className="esp-kpi" data-teinte={r.taux !== null && r.taux < 0.6 ? "ambre" : undefined}>
            <span className="esp-kpi-etiquette">Taux de réinscription</span>
            <span className="esp-kpi-valeur">{taux(r.taux)}</span>
            <span className="esp-kpi-sous">
              {r.reinscrits} sur {r.visites} patients vus ont leur prochain rendez-vous
              {ecart !== null ? ` · ${ecart === 0 ? "comme" : `${ecart > 0 ? "+" : "−"}${Math.abs(ecart).toLocaleString("fr-FR")} pt sur`} la période d'avant` : ""}
            </span>
          </div>
          <div className="esp-kpi" data-teinte={r.sans_suite.length ? "bleu" : undefined}>
            <span className="esp-kpi-etiquette">Repartis sans suite</span>
            <span className="esp-kpi-valeur">{r.sans_suite.length}</span>
            <span className="esp-kpi-sous">ni prochain rendez-vous, ni plan en cours</span>
          </div>
        </div>

        {r.par_praticien.length ? (
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Réinscription par praticien (tableau qui défile)">
            <table className="esp-tableau">
              <thead><tr><th>Praticien</th><th>Patients vus</th><th>Réinscrits</th><th>Taux</th></tr></thead>
              <tbody>
                {r.par_praticien.map((p) => (
                  <tr key={p.praticien_id ?? "sans"}><td>{p.nom ?? "Sans praticien"}</td><td>{p.visites}</td><td>{p.reinscrits}</td><td>{taux(p.taux)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div>
          <h3 className="esp-groupe-titre">Vus sans prochain rendez-vous</h3>
          {!r.sans_suite.length ? (
            <Vide titre="Personne à rappeler">Chaque patient vu ces trente derniers jours a son prochain rendez-vous, un plan en cours, ou un appel noté récemment.</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Patients vus sans prochain rendez-vous">
              {r.sans_suite.map((s) => (
                <li key={s.patient_id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut"><Pastille teinte="bleu" contour>Vu le {dateCourte(s.derniere_visite)}</Pastille></span>
                  <span className="esp-item-titre">{s.patient_nom}</span>
                  <span className="esp-item-bas">
                    {s.praticien ? <span>{s.praticien}</span> : null}
                    {appeler && s.patient_nom !== "Patient du cabinet" ? (
                      <button type="button" className="esp-lien-bouton" onClick={() => appeler({ patient_id: s.patient_id, patient_nom: s.patient_nom, motif: "controle", plan_id: null, evenement_id: null })}>
                        Noter l&apos;appel
                      </button>
                    ) : null}
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
