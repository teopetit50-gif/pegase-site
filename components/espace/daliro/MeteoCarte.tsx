"use client";

/* ══════════════════════════════════════════════════════════════════════
   La météo des 7 jours du chantier (06/10/2026, session B6, b6_21)

   La prévision rangée par le serveur deux fois par jour (Météo-France,
   par le service réglé dans private.reglages : MET Norway, b6_21b) et les passages extérieurs
   qu'elle met en risque : pluie, rafales, gel, chaleur — seuils du passage,
   sinon 5 mm, 60 km/h, 0 °C. En exemple, une prévision fictive.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloudRain } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateHeure } from "../format";
import { Avis } from "../ui";
import { chargerMeteo } from "./portes";
import type { JourMeteo, MeteoChantier, RisqueMeteo, Tableau } from "./types";

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const nf = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v);
const jourDe = (iso: string) => { const [a, m, j] = iso.split("-").map(Number); return new Date(a, m - 1, j); };
const plus = (iso: string, n: number) => { const d = jourDe(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`; };

/* L'exemple : une averse après-demain, des rafales le jour suivant. */
function meteoExemple(tableau: Tableau): MeteoChantier {
  const auj = aujourdHui();
  const prevision: JourMeteo[] = [0, 1, 2, 3, 4, 5, 6].map((k) => ({
    jour: plus(auj, k), pluie_mm: [0, 0.4, 14.2, 3.1, 0, 0, 1.2][k], rafales_kmh: null, vent_kmh: [14, 20, 27, 45, 23, 12, 17][k],
    tmin: [9, 8, 7, 6, 4, 3, 5][k], tmax: [17, 16, 13, 12, 14, 15, 16][k],
  }));
  const risques: RisqueMeteo[] = [];
  for (const p of tableau.passages) {
    if (p.statut !== "prevu" || !p.exterieur) continue;
    for (const d of prevision) {
      if (d.jour < p.debut || d.jour > p.fin) continue;
      const motifs = [
        d.pluie_mm !== null && d.pluie_mm >= 5 ? `pluie ${nf(d.pluie_mm)} mm (seuil 5)` : null,
        d.rafales_kmh != null && d.rafales_kmh >= 60 ? `rafales ${Math.round(d.rafales_kmh)} km/h (seuil 60)`
          : d.rafales_kmh == null && d.vent_kmh != null && d.vent_kmh >= 40 ? `vent moyen ${Math.round(d.vent_kmh)} km/h, rafales probables au-delà de 60` : null,
        d.tmin !== null && d.tmin < 0 ? `gel, ${nf(d.tmin)} °C` : null,
      ].filter((m): m is string => !!m);
      if (motifs.length) {
        risques.push({ passage_id: p.id, tache: p.tache, chantier_id: p.chantier_id, jour: d.jour, motifs,
                       texte: `${tableau.chantier.nom}, ${JOURS_LONGS[jourDe(d.jour).getDay()]} ${d.jour.slice(8, 10)}/${d.jour.slice(5, 7)} : ${motifs.join(", ")} sur « ${p.tache ?? "passage"} » (extérieur) — décalez ou protégez` });
        break;
      }
    }
  }
  return { localise: true, ouverte: true, prevision, recue_le: new Date().toISOString(), erreur: null, risques, fournisseur: "met_norway" };
}

export default function MeteoCarte({ tableau, source }: { tableau: Tableau; source: Source }) {
  const c = tableau.chantier;
  const [reel, setReel] = useState<MeteoChantier | null>(null);
  const [chargement, setChargement] = useState(source === "reelle");
  const [erreur, setErreur] = useState<string | null>(null);

  const lire = useCallback(async () => {
    try {
      setReel(await chargerMeteo(c.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setChargement(false);
    }
  }, [c.id]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, lire]);

  const m = useMemo(() => (source === "reelle" ? reel : meteoExemple(tableau)), [source, reel, tableau]);
  if (c.statut !== "ouvert" && c.statut !== "suspendu") return null;

  return (
    <section className="esp-carte" aria-label="Météo du chantier">
      <div className="esp-section-titre"><CloudRain width={14} height={14} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Météo des 7 jours — passages extérieurs</div>
      {chargement ? <Loader variant="spin" />
        : erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis>
        : !m ? null
        : !m.localise ? <p className="esp-kpi-sous">Adresse du chantier non localisée : pas de prévision. Posez ses coordonnées pour que les passages extérieurs soient surveillés.</p>
        : !m.ouverte ? <p className="esp-kpi-sous">La surveillance météo est comprise dans les formules Chantiers et Entreprise.</p>
        : !m.prevision.length ? <p className="esp-kpi-sous">{m.erreur ? `Pas de prévision : ${m.erreur}.` : "La prévision arrive avec le prochain passage du serveur (deux fois par jour), s'il y a un passage extérieur dans les 7 jours."}</p>
        : (
          <>
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Prévision des 7 jours (tableau qui défile)">
              <table className="esp-tableau">
                <thead>
                  <tr><th>Jour</th>{m.prevision.map((d) => <th key={d.jour} className="esp-num">{JOURS[jourDe(d.jour).getDay()]} {d.jour.slice(8, 10)}/{d.jour.slice(5, 7)}</th>)}</tr>
                </thead>
                <tbody>
                  <tr><td>Pluie</td>{m.prevision.map((d) => <td key={d.jour} className="esp-num" style={d.pluie_mm !== null && d.pluie_mm >= 5 ? { fontWeight: 600 } : undefined}>{d.pluie_mm === null ? "—" : `${nf(d.pluie_mm)} mm`}</td>)}</tr>
                  {m.prevision.some((d) => d.rafales_kmh != null)
                    ? <tr><td>Rafales</td>{m.prevision.map((d) => <td key={d.jour} className="esp-num" style={d.rafales_kmh != null && d.rafales_kmh >= 60 ? { fontWeight: 600 } : undefined}>{d.rafales_kmh == null ? "—" : `${Math.round(d.rafales_kmh)} km/h`}</td>)}</tr>
                    : <tr><td>Vent moyen</td>{m.prevision.map((d) => <td key={d.jour} className="esp-num" style={d.vent_kmh != null && d.vent_kmh >= 40 ? { fontWeight: 600 } : undefined}>{d.vent_kmh == null ? "—" : `${Math.round(d.vent_kmh)} km/h`}</td>)}</tr>}
                  <tr><td>Températures</td>{m.prevision.map((d) => <td key={d.jour} className="esp-num" style={{ whiteSpace: "nowrap" }}>{d.tmin === null || d.tmax === null ? "—" : `${nf(d.tmin)} / ${nf(d.tmax)} °C`}</td>)}</tr>
                </tbody>
              </table>
            </div>
            {m.risques.length ? m.risques.map((r) => <div key={r.passage_id} style={{ marginTop: 8 }}><Avis teinte="ambre">{r.texte}</Avis></div>)
              : <div style={{ marginTop: 8 }}><Avis teinte="vert">Aucun passage extérieur menacé dans les 7 jours.</Avis></div>}
            <p className="esp-kpi-sous" style={{ marginTop: 6 }}>
              {m.fournisseur === "met_norway"
                ? <>Données météo : <a href="https://api.met.no/" target="_blank" rel="noreferrer">MET Norway</a>, licence <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY 4.0</a></>
                : "Prévision Météo-France"}{m.recue_le ? `, reçue le ${dateHeure(m.recue_le)}` : ""}{source !== "reelle" ? " (exemple fictif)" : ""}. Seuils du passage, sinon pluie 5 mm, rafales 60 km/h (vent moyen 40 km/h quand les rafales ne sont pas données), gel.
            </p>
          </>
        )}
    </section>
  );
}
