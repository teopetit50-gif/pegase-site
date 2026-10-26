"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'export à date fixe (19/10/2026, C3, lot c3_19)

   Le gérant ou un administrateur choisit chaque semaine (un jour) ou
   chaque mois (un jour de 1 à 28) : le fichier de la période échue est
   fabriqué ce jour-là, et un courriel interne prévient qu'il est prêt —
   le fichier ne part jamais par courriel, il se télécharge ici, connecté.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { dateCourte } from "../format";
import { Avis, Pastille } from "../ui";
import { telecharger } from "./export";
import { chargerExports, contenuExport, programmerExport, type ExportFait, type ProgrammeExport } from "./portes";
import type { Client } from "./types";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

const EXEMPLE: { programmes: ProgrammeExport[]; exports: ExportFait[] } = {
  programmes: [{ id: "00000000-0000-4000-8000-00000000c3f1", entite_id: null, frequence: "hebdomadaire", jour: 1, actif: true }],
  exports: [{ id: "00000000-0000-4000-8000-00000000c3f2", entite_id: null, periode_du: "2026-10-12", periode_au: "2026-10-18", lignes: 37,
              nom_fichier: "reput-demandes-2026-10-12-au-2026-10-18.csv", cree_le: "2026-10-19T05:00:00Z" }],
};

export default function ExportProgramme({ source, client, dirige }: { source: "exemple" | "reelle"; client: Client | null; dirige: boolean }) {
  const [etat, setEtat] = useState<typeof EXEMPLE | null>(source === "exemple" ? EXEMPLE : null);
  const [frequence, setFrequence] = useState<ProgrammeExport["frequence"]>("hebdomadaire");
  const [jour, setJour] = useState(1);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tour, setTour] = useState(0);

  useEffect(() => {
    if (source === "exemple" || !client || !dirige) return;
    let vivant = true;
    chargerExports(client.client_id).then((x) => { if (vivant) setEtat(x); })
      .catch((e) => { if (vivant) { setEtat({ programmes: [], exports: [] }); setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); } });
    return () => { vivant = false; };
  }, [source, client, dirige, tour]);

  if (!dirige) return null;
  if (etat === null) return <p className="esp-kpi-sous"><Loader variant="spin" /> Exports…</p>;
  const prog = etat.programmes.find((p) => p.entite_id === null);

  const agir = async (cle: string, reel: () => Promise<unknown>, local: () => void, msg: string) => {
    setEnvoi(cle);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") { await reel(); setTour((n) => n + 1); } else local();
      setFait(msg);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  const enregistrer = (actif: boolean) => void agir("programme", () => programmerExport(client!.client_id, frequence, jour, actif),
    () => setEtat((x) => ({ ...(x ?? EXEMPLE), programmes: [{ id: prog?.id ?? crypto.randomUUID(), entite_id: null, frequence, jour, actif }] })),
    actif ? `Export programmé : ${frequence === "hebdomadaire" ? `chaque ${JOURS[jour - 1]}, les sept jours précédents` : `le ${jour} de chaque mois, le mois précédent`}.`
          : "Export programmé suspendu.");

  const prendre = (x: ExportFait) => void agir(`fichier:${x.id}`, async () => telecharger(x.nom_fichier, await contenuExport(x.id)),
    () => telecharger(x.nom_fichier, "﻿Reçue le;Canal;Client\r\n(exemple : aucun fichier réel)"), `${x.nom_fichier} téléchargé.`);

  return (
    <section className="esp-carte" aria-label="Export à date fixe" data-export-programme>
      <div className="esp-carte-tete"><h2 className="esp-carte-titre">Export à date fixe</h2></div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous" style={{ marginBottom: 10 }}>
          Le tableau des demandes de la période échue est préparé le jour choisi ; un courriel vous dit qu&apos;il est prêt.
          Le fichier ne part jamais par courriel : il se télécharge ici.
        </p>
        {fait ? <div style={{ marginBottom: 8 }}><Avis teinte="vert">{fait}</Avis></div> : null}
        {erreur ? <div style={{ marginBottom: 8 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
        <p style={{ marginBottom: 8 }}>
          {prog?.actif ? (
            <Pastille teinte="vert">{prog.frequence === "hebdomadaire" ? `Chaque ${JOURS[prog.jour - 1]}` : `Le ${prog.jour} de chaque mois`}</Pastille>
          ) : <Pastille contour>Aucun export programmé</Pastille>}
        </p>
        <div className="esp-form-ligne">
          <label className="rv-libelle">Fréquence
            <select className="rv-champ" value={frequence} onChange={(e) => { setFrequence(e.target.value as ProgrammeExport["frequence"]); setJour(1); }}>
              <option value="hebdomadaire">Chaque semaine</option>
              <option value="mensuel">Chaque mois</option>
            </select>
          </label>
          <label className="rv-libelle">{frequence === "hebdomadaire" ? "Jour" : "Jour du mois"}
            <select className="rv-champ" value={jour} onChange={(e) => setJour(Number(e.target.value))}>
              {frequence === "hebdomadaire"
                ? JOURS.map((j, i) => <option key={j} value={i + 1}>{j}</option>)
                : Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        </div>
        <div className="esp-actions" style={{ flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null} onClick={() => enregistrer(true)}>
            {envoi === "programme" ? <Loader variant="spin" /> : null} Programmer l&apos;export
          </button>
          {prog?.actif ? <button type="button" className="r-btn" disabled={envoi !== null} onClick={() => enregistrer(false)}>Suspendre</button> : null}
        </div>
        {etat.exports.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 }}>
            {etat.exports.map((x) => (
              <li key={x.id} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--r-filet)", borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ overflowWrap: "anywhere", minWidth: 0 }}>
                  Du {dateCourte(x.periode_du)} au {dateCourte(x.periode_au)} <span className="esp-kpi-sous">· {x.lignes} demande{x.lignes > 1 ? "s" : ""}</span>
                </span>
                <button type="button" className="r-btn" disabled={envoi !== null} onClick={() => prendre(x)}>
                  {envoi === `fichier:${x.id}` ? <Loader variant="spin" /> : null} Télécharger
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
