"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — le parc d'un compte dans sa fiche (c4_07, 06/10/2026, session C4)

   Les équipements installés chez le compte, site par site, avec leur
   prochaine échéance (datée depuis la dernière intervention) et leur
   nature ; ses contrats et ceux qui s'éteignent. Un geste : noter une
   intervention, y compris « faite ailleurs » — l'échéance sort alors du
   cycle. Lecture : public.offload_parc_compte(p_compte) ; écriture :
   public.offload_noter_intervention (en base réelle seulement).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { dateCourte } from "../format";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { STATUTS_ECHEANCE } from "./Echeances";
import { chargerParcCompte, noterIntervention } from "./portes";
import type { ParcCompte as Parc } from "./types";

const VIDE: Parc = { equipements: [], contrats: [] };

export default function ParcCompte({ compte, source }: { compte: string; source: Source }) {
  const [parc, setParc] = useState<Parc | null>(source === "exemple" ? VIDE : null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [f, setF] = useState({ le: "", nature: "entretien", ailleurs: false, reference: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const p = await chargerParcCompte(compte);
        if (actif) setParc(p);
      } catch (e) {
        if (actif) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); setParc(VIDE); }
      }
    }, 0);
    return () => { actif = false; window.clearTimeout(t); };
  }, [compte, source]);

  const noter = async (equipement: string) => {
    setErreur(null);
    try {
      await noterIntervention(equipement, f.le, f.nature, f.ailleurs, f.reference.trim() || null);
      setParc(await chargerParcCompte(compte));
      setFait(f.ailleurs ? "Intervention faite ailleurs notée : l'échéance sort du cycle, la suivante est datée depuis cette date." : "Intervention notée : l'échéance suivante est datée depuis cette date.");
      setOuvert(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    }
  };

  if (!parc || (parc.equipements.length === 0 && parc.contrats.length === 0)) {
    return source === "reelle" && parc ? <p className="esp-kpi-sous">Aucun équipement ni contrat suivi pour ce compte.</p> : null;
  }

  return (
    <div style={{ margin: "8px 0 14px" }}>
      {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
      {parc.equipements.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Parc installé (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>Équipement</th><th>Site</th><th>Prochaine échéance</th><th>Dernière intervention</th><th /></tr></thead>
            <tbody>
              {parc.equipements.map((q) => (
                <tr key={q.id}>
                  <td>{q.designation} <span className="esp-mono">{q.ref}</span>{q.nature === "reglementaire" ? <> <Pastille teinte="noir" contour>Réglementaire</Pastille></> : null}</td>
                  <td>{q.site ?? "—"}</td>
                  <td>{q.echeance ? <>{dateCourte(q.echeance.due_le)} <Pastille teinte={STATUTS_ECHEANCE[q.echeance.statut].teinte}>{STATUTS_ECHEANCE[q.echeance.statut].libelle}</Pastille></> : "non datée"}</td>
                  <td>{q.interventions[0] ? `${dateCourte(q.interventions[0].le)}${q.interventions[0].ailleurs ? " (ailleurs)" : ""}` : q.derniere_intervention ? dateCourte(q.derniere_intervention) : "—"}</td>
                  <td>{source === "reelle" ? <button type="button" className="esp-lien-bouton" onClick={() => { setOuvert(ouvert === q.id ? null : q.id); setF({ le: "", nature: "entretien", ailleurs: false, reference: "" }); }}>Noter une intervention</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {ouvert ? (
        <div className="esp-form" style={{ marginTop: 8 }}>
          <div className="esp-form-ligne">
            <label className="rv-libelle">Le <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" type="date" value={f.le} onChange={(e) => setF({ ...f, le: e.target.value })} />
            </label>
            <label className="rv-libelle">Nature
              <select className="rv-champ" value={f.nature} onChange={(e) => setF({ ...f, nature: e.target.value })}>
                <option value="entretien">Entretien</option><option value="controle">Contrôle</option>
                <option value="reparation">Réparation</option><option value="installation">Installation</option>
              </select>
            </label>
          </div>
          <label className="rv-libelle" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={f.ailleurs} onChange={(e) => setF({ ...f, ailleurs: e.target.checked })} /> Faite ailleurs (par un autre prestataire)
          </label>
          <label className="rv-libelle">N° de bon
            <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
          </label>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(f.le)} onClick={() => void noter(ouvert)}>Noter l&apos;intervention</button>
          </div>
        </div>
      ) : null}
      {parc.contrats.length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 4 }}>
          {parc.contrats.map((k) => (
            <li key={k.id} className="esp-kpi-sous">
              Contrat <span className="esp-mono">{k.numero}</span>{k.libelle ? ` — ${k.libelle}` : ""} : fin le {dateCourte(k.fin)}, reconduction {k.reconduction}
              {k.s_eteint ? <> <Pastille teinte="rouge" contour>S&apos;éteint</Pastille></> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
