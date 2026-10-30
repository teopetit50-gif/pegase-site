"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — la valeur en jeu par segment, la restitution en tableur
   (c4_36, 25/10/2026, session C4)

   Deux lectures réservées au gérant et à l'administrateur, montrées dans
   le pilotage : public.offload_valeur_par_segment(p_client) (par secteur
   du compte : comptes suivis, à risque, valeur annuelle en jeu, reprises
   en cours) et public.offload_restitution_tableur(p_client) (toutes les
   données OFFLOAD, un fichier CSV par famille, la restitution notée au
   journal). Les fichiers viennent de la base ; le navigateur ne fait que
   les enregistrer. L'exemple vit ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { montant, nombreFr } from "../format";
import type { Source } from "../source";
import { restituerTableur } from "./portes";
import { exporterSegments, telechargerFichier } from "./tableur";
import type { RestitutionTableur, Segment } from "./types";

export function segmentsExemple(): Segment[] {
  return [
    { segment: "Artisans et BTP", comptes: 1860, a_risque: 214, valeur_en_jeu: 1126400, reprises_en_cours: 46 },
    { segment: "Hôtellerie et restauration", comptes: 412, a_risque: 38, valeur_en_jeu: 684200, reprises_en_cours: 11 },
    { segment: "Particuliers — atelier automobile", comptes: 6420, a_risque: 1284, valeur_en_jeu: 487900, reprises_en_cours: 212 },
    { segment: "Flottes d'entreprise", comptes: 148, a_risque: 17, valeur_en_jeu: 392600, reprises_en_cours: 6 },
    { segment: "Garages indépendants", comptes: 264, a_risque: 31, valeur_en_jeu: 218700, reprises_en_cours: 4 },
    { segment: "Événementiel et associations", comptes: 96, a_risque: 7, valeur_en_jeu: 158300, reprises_en_cours: 2 },
    { segment: "Sans segment", comptes: 230, a_risque: 21, valeur_en_jeu: 46500, reprises_en_cours: 0 },
  ];
}

export function restitutionExemple(): RestitutionTableur {
  return {
    format: "csv ; séparateur « ; » ; UTF-8",
    fichiers: {
      "offload-comptes.csv": "ref;nom;secteur;statut\nIMP-01184;Hôtel Les Flamboyants;Hôtellerie et restauration;suivi\nAGP-00612;Transports Lubin;Flottes d'entreprise;suivi\nBMQ-00427;Karib'Clim Services;Artisans et BTP;suivi",
      "offload-achats.csv": "compte;date_achat;montant_ht;reference\nIMP-01184;2026-08-27;3800;F4900\nAGP-00612;2026-10-24;900;F4600\nBMQ-00427;2026-04-03;1850;F4800",
      "offload-reprises.csv": "compte;statut;ouverte_le\nIMP-01184;a_valider;2026-10-30\nBMQ-00427;envoyee;2026-10-25",
    },
  };
}

function lignes(csv: string) {
  return Math.max(0, csv.split("\n").filter((l) => l.trim() !== "").length - 1);
}

export function ValeurParSegment({ segments, erreur }: { segments: Segment[] | null; erreur: string | null }) {
  if (erreur) return <p className="esp-kpi-sous">{erreur}</p>;
  if (!segments) return <p className="esp-kpi-sous">Lecture des segments…</p>;
  if (segments.length === 0) return <p className="esp-kpi-sous">Aucun compte suivi pour l&apos;instant.</p>;
  const total = segments.reduce((t, s) => t + Number(s.valeur_en_jeu || 0), 0);
  const jour = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Valeur en jeu par segment (tableau qui défile)">
        <table className="esp-tableau">
          <thead>
            <tr><th>Segment</th><th className="esp-num">Valeur en jeu HT</th><th className="esp-num">À risque</th><th className="esp-num">Comptes suivis</th><th className="esp-num">Reprises en cours</th></tr>
          </thead>
          <tbody>
            {segments.map((s) => {
              const part = total > 0 ? Math.round((Number(s.valeur_en_jeu) / total) * 100) : 0;
              return (
                <tr key={s.segment}>
                  <td>{s.segment}</td>
                  <td className="esp-num">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end", width: "100%" }}>
                      <span aria-hidden="true" style={{ width: 64, height: 6, borderRadius: 3, background: "var(--r-filet)", overflow: "hidden", flex: "none" }}>
                        <span style={{ display: "block", width: `${part}%`, height: "100%", background: "var(--r-texte)", opacity: 0.8 }} />
                      </span>
                      <span style={{ minWidth: 88, textAlign: "right" }}>{montant(s.valeur_en_jeu)}</span>
                    </span>
                  </td>
                  <td className="esp-num">{nombreFr(s.a_risque)}</td>
                  <td className="esp-num">{nombreFr(s.comptes)}</td>
                  <td className="esp-num">{nombreFr(s.reprises_en_cours)}</td>
                </tr>
              );
            })}
            <tr style={{ fontWeight: 600 }}>
              <td>Total</td>
              <td className="esp-num">{montant(total)}</td>
              <td className="esp-num">{nombreFr(segments.reduce((t, s) => t + Number(s.a_risque || 0), 0))}</td>
              <td className="esp-num">{nombreFr(segments.reduce((t, s) => t + Number(s.comptes || 0), 0))}</td>
              <td className="esp-num">{nombreFr(segments.reduce((t, s) => t + Number(s.reprises_en_cours || 0), 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <span className="esp-kpi-sous">Le segment est le secteur du compte. En jeu : la valeur annuelle des comptes qui décrochent, ralentissent, ont manqué leur saison ou se sont éteints.</span>
      <div><button type="button" className="esp-lien-bouton" onClick={() => exporterSegments(segments, jour)}>Exporter vers un tableur</button></div>
    </div>
  );
}

export function RestitutionEnTableur({ source, client }: { source: Source; client: string | null }) {
  const [fichiers, setFichiers] = useState<Record<string, string> | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function preparer() {
    setErreur(null);
    if (source === "exemple") {
      setFichiers(restitutionExemple().fichiers);
      return;
    }
    if (!client) return;
    setEnCours(true);
    try {
      setFichiers((await restituerTableur(client)).fichiers);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnCours(false);
    }
  }

  const entrees = fichiers ? Object.entries(fichiers).sort(([a], [b]) => a.localeCompare(b)) : [];
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span className="esp-kpi-sous">
        Toutes vos données OFFLOAD — comptes, achats, reprises, affaires, échéances, règles — en fichiers CSV, un par famille, au séparateur « ; » :
        ils s&apos;ouvrent tels quels dans Excel ou LibreOffice. Réservé au gérant et à l&apos;administrateur ; chaque restitution est notée au journal.
      </span>
      <div>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={preparer} disabled={enCours || (source === "reelle" && !client)}>
          {enCours ? "Préparation…" : fichiers ? "Préparer à nouveau" : "Préparer la restitution en tableur"}
        </button>
      </div>
      {erreur ? <p className="esp-kpi-sous" role="alert">{erreur}</p> : null}
      {fichiers && entrees.length === 0 ? <p className="esp-kpi-sous">Aucune donnée à restituer.</p> : null}
      {entrees.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {entrees.map(([nom, csv]) => (
            <li key={nom} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid var(--r-filet)", borderRadius: 8, padding: "8px 12px" }}>
              <span style={{ overflowWrap: "anywhere" }}><strong>{nom}</strong> <span className="esp-kpi-sous">— {nombreFr(lignes(csv))} ligne(s)</span></span>
              <button type="button" className="esp-lien-bouton" onClick={() => telechargerFichier(nom, csv)}>Télécharger</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
