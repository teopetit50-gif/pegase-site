"use client";

/* La section « Synthèse de la semaine » (06/10/2026, session B3, b3_15) :
   pour le titulaire et la direction, la dernière semaine complète de chaque
   centre et leur total. Rendez-vous et manqués (et l'écart avec la semaine
   d'avant), réinscription (b3_16), créneaux libérés, devis signés, plans signés sans rendez-vous,
   appels et rendez-vous repris. Des chiffres, jamais un nom. Le lundi, la
   même ligne part au point du matin. */

import { dateCourte } from "../format";
import type { Synthese, SyntheseCabinet } from "./types";

function taux(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function euros(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function ecart(c: SyntheseCabinet): string | null {
  const a = c.precedent?.taux_manques;
  const b = c.rdv.taux_manques;
  if (a === null || a === undefined || b === null) return null;
  const pts = Math.round((b - a) * 1000) / 10;
  if (pts === 0) return "=";
  return `${pts > 0 ? "+" : "−"}${Math.abs(pts).toLocaleString("fr-FR")} pt`;
}

export default function SyntheseSemaine({ synthese }: { synthese: Synthese | null }) {
  if (!synthese || !synthese.cabinets.length) return null;
  const t = synthese.total;
  const plusieurs = synthese.cabinets.length > 1;
  return (
    <section id="tiroma-synthese" className="esp-carte" aria-label="Synthèse de la semaine">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Synthèse de la semaine</h2>
        <span className="esp-kpi-sous">Du {dateCourte(synthese.semaine.du)} au {dateCourte(synthese.semaine.au)}{plusieurs ? ` · ${synthese.cabinets.length} centres` : ""}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <div className="esp-kpis" style={{ marginBottom: 0 }}>
          <div className="esp-kpi" data-teinte={t.taux_manques !== null && t.taux_manques >= 0.05 ? "rouge" : undefined}>
            <span className="esp-kpi-etiquette">Rendez-vous manqués</span>
            <span className="esp-kpi-valeur">{taux(t.taux_manques)}</span>
            <span className="esp-kpi-sous">{t.manques} sur {t.passes} rendez-vous</span>
          </div>
          <div className="esp-kpi">
            <span className="esp-kpi-etiquette">Devis signés</span>
            <span className="esp-kpi-valeur">{euros(t.montant_signe)}</span>
            <span className="esp-kpi-sous">{t.devis_signes} sur {t.devis_presentes} présentés</span>
          </div>
          <div className="esp-kpi" data-teinte={t.plans_sans_rdv ? "bleu" : undefined}>
            <span className="esp-kpi-etiquette">Signé, sans rendez-vous</span>
            <span className="esp-kpi-valeur">{euros(t.montant_plans_sans_rdv)}</span>
            <span className="esp-kpi-sous">{t.plans_sans_rdv} plan{t.plans_sans_rdv > 1 ? "s" : ""} aujourd&apos;hui</span>
          </div>
          <div className="esp-kpi">
            <span className="esp-kpi-etiquette">Créneaux libérés</span>
            <span className="esp-kpi-valeur">{t.creneaux_liberes}</span>
            <span className="esp-kpi-sous">{t.appels} appel{t.appels > 1 ? "s" : ""}, {t.rdv_confirmes} rendez-vous repris</span>
          </div>
        </div>
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Synthèse par centre (tableau qui défile)">
          <table className="esp-tableau">
            <thead>
              <tr><th>Centre</th><th>Rendez-vous</th><th>Manqués</th><th>Écart</th><th>Réinscription</th><th>Créneaux libérés</th><th>Devis signés</th><th>Sans rendez-vous</th><th>Appels</th></tr>
            </thead>
            <tbody>
              {synthese.cabinets.map((c) => (
                <tr key={c.entite_id}>
                  <td>{c.nom}</td>
                  <td>{c.rdv.passes}</td>
                  <td>{c.rdv.manques} ({taux(c.rdv.taux_manques)})</td>
                  <td>{ecart(c) ?? "—"}</td>
                  <td>{taux(c.reinscription?.taux)}</td>
                  <td>{c.creneaux.liberes}</td>
                  <td>{c.devis.signes}/{c.devis.presentes} · {euros(c.devis.montant_signe)}</td>
                  <td>{c.plans_sans_rdv.nombre} · {euros(c.plans_sans_rdv.montant)}</td>
                  <td>{c.appels.appels} · {c.appels.confirmes} repris</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="esp-fil-meta">Le lundi matin, la même synthèse arrive au point du matin du titulaire et de la direction, en chiffres seulement.</p>
      </div>
    </section>
  );
}
