"use client";

/* ══════════════════════════════════════════════════════════════════════
   La météo des 7 jours du chantier (06/10/2026, session B6, b6_21)

   La prévision rangée par le serveur deux fois par jour (Météo-France,
   par le service réglé dans private.reglages : MET Norway, b6_21b) et les passages extérieurs
   qu'elle met en risque : pluie, rafales, gel, chaleur — seuils du passage,
   sinon 5 mm, 60 km/h, 0 °C. En exemple, une prévision fictive.
   b6_35 : pour un passage extérieur menacé de l'équipe, l'échange proposé
   avec un passage intérieur de la même équipe, un jour sec ; le
   conducteur valide (« Échanger ») ou laisse.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CloudRain } from "lucide-react";
import { Bouton, Detail, Gestes, Groupe, Ligne, Liste, Partie, Pilule, Point, Texte, Vide, jourCourt, useVolet } from "@/components/espace2/lin/Volet";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateHeure } from "../format";
import { Avis } from "../ui";
import { chargerMeteo, echangerPassages, ordreMeteo, type EchangeMeteo } from "./portes";
import type { JourMeteo, MeteoChantier, RisqueMeteo, Tableau } from "./types";

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const JOURS_LONGS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const nf = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(v);
const jourDe = (iso: string) => { const [a, m, j] = iso.split("-").map(Number); return new Date(a, m - 1, j); };
const plus = (iso: string, n: number) => { const d = jourDe(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`; };

/* L'échange en exemple, même règle que public.btp_ordre_meteo : même équipe, intérieur, même durée, jours secs. */
function echangesExemple(tableau: Tableau, m: MeteoChantier): EchangeMeteo[] {
  const sec = (du: string, au: string) => {
    const jours = m.prevision.filter((d) => d.jour >= du && d.jour <= au);
    return jours.length > 0 && jours.every((d) => (d.pluie_mm ?? 0) < 5 && (d.vent_kmh ?? 0) < 40 && (d.tmin ?? 99) >= 0);
  };
  const duree = (a: string, b: string) => Math.round((jourDe(b).getTime() - jourDe(a).getTime()) / 86400000);
  const sortie: EchangeMeteo[] = [];
  for (const r of m.risques) {
    const x = tableau.passages.find((p) => p.id === r.passage_id);
    if (!x || !x.equipe_id) continue;
    const i = tableau.passages
      .filter((p) => p.statut === "prevu" && !p.exterieur && p.equipe_id === x.equipe_id && p.id !== x.id && p.debut > aujourdHui()
                     && p.debut <= plus(aujourdHui(), 6) && duree(p.debut, p.fin) === duree(x.debut, x.fin) && sec(p.debut, p.fin))
      .sort((a, b) => Math.abs(duree(a.debut, x.debut)) - Math.abs(duree(b.debut, x.debut)))[0];
    if (!i) continue;
    sortie.push({ exterieur: x.id, exterieur_tache: x.tache, exterieur_chantier: tableau.chantier.nom, exterieur_debut: x.debut,
                  interieur: i.id, interieur_tache: i.tache, interieur_chantier: tableau.chantier.nom, interieur_debut: i.debut, risque: r.texte,
                  texte: `Échanger « ${x.tache ?? "passage"} » (extérieur, ${x.debut.slice(8, 10)}/${x.debut.slice(5, 7)}) avec « ${i.tache ?? "passage"} » (intérieur, ${i.debut.slice(8, 10)}/${i.debut.slice(5, 7)}) : l'extérieur passe au sec, l'intérieur prend le jour de pluie.` });
  }
  return sortie;
}

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

export default function MeteoCarte({ tableau, source, onLocal, relire }: { tableau: Tableau; source: Source; onLocal?: (t: Tableau) => void; relire?: () => Promise<void> }) {
  const c = tableau.chantier;
  const volet = useVolet();
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
  const [echangesReels, setEchangesReels] = useState<EchangeMeteo[] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !reel?.risques.length) return;
    let vivant = true;
    void ordreMeteo(c.client_id).then((r) => { if (vivant) setEchangesReels(r.propositions.filter((e) => reel.risques.some((x) => x.passage_id === e.exterieur))); })
      .catch(() => { if (vivant) setEchangesReels([]); });
    return () => { vivant = false; };
  }, [source, reel, c.client_id]);
  const echanges = source === "reelle" ? echangesReels ?? [] : m ? echangesExemple(tableau, m) : [];
  const echanger = async (e: EchangeMeteo) => {
    setEnvoi(true); setErreur(null);
    try {
      if (source === "reelle") { await echangerPassages(e.exterieur, e.interieur, "Pluie annoncée"); await relire?.(); await lire(); }
      else onLocal?.({ ...tableau, passages: tableau.passages.map((p) => {
        const x = tableau.passages.find((q) => q.id === e.exterieur)!; const i = tableau.passages.find((q) => q.id === e.interieur)!;
        return p.id === x.id ? { ...p, debut: i.debut, fin: i.fin } : p.id === i.id ? { ...p, debut: x.debut, fin: x.fin } : p;
      }) });
      setFait(`« ${e.exterieur_tache ?? "Le passage extérieur"} » passe au ${e.interieur_debut.slice(8, 10)}/${e.interieur_debut.slice(5, 7)}, « ${e.interieur_tache ?? "le passage intérieur"} » au ${e.exterieur_debut.slice(8, 10)}/${e.exterieur_debut.slice(5, 7)}.`);
    } catch (x) { setErreur(x instanceof Error ? x.message : "La base a refusé l'échange."); }
    finally { setEnvoi(false); }
  };
  if (c.statut !== "ouvert" && c.statut !== "suspendu")
    return volet ? (
      <Partie titre="Météo des 7 jours">
        <Vide>La météo surveille les passages extérieurs d&apos;un chantier ouvert ou suspendu.</Vide>
      </Partie>
    ) : null;

  /* 30/10/2026 — dans la fiche de l'espace 2 : les sept jours en cartes de la grille du volet, puis
     les passages menacés et les échanges proposés, une ligne chacun ; le détail dans le volet */
  if (volet) {
    const fort = (d: JourMeteo) => (d.pluie_mm !== null && d.pluie_mm >= 5) || (d.rafales_kmh != null && d.rafales_kmh >= 60) || (d.vent_kmh != null && d.vent_kmh >= 40);
    const vent = (d: JourMeteo) => (d.rafales_kmh != null ? `rafales ${Math.round(d.rafales_kmh)} km/h` : d.vent_kmh != null ? `vent ${Math.round(d.vent_kmh)} km/h` : null);
    return (
      <Partie titre="Météo des 7 jours" compte="passages extérieurs" avis={fait || erreur ? <>{fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</> : null}>
        {chargement ? (
          <Loader variant="spin" />
        ) : !m ? null : !m.localise ? (
          <Vide>Adresse du chantier non localisée : pas de prévision. Posez ses coordonnées pour que les passages extérieurs soient surveillés.</Vide>
        ) : !m.ouverte ? (
          <Vide>La surveillance météo est comprise dans les formules Chantiers et Entreprise.</Vide>
        ) : !m.prevision.length ? (
          <Vide>{m.erreur ? `Pas de prévision : ${m.erreur}.` : "La prévision arrive avec le prochain passage du serveur (deux fois par jour), s'il y a un passage extérieur dans les 7 jours."}</Vide>
        ) : (
          <>
            <div className="lit-essentiel-chiffres lvp-chiffres lvp-chiffres--jours">
              {m.prevision.map((d) => (
                <div key={d.jour} className="lit-essentiel-chiffre" data-fort={fort(d) ? "" : undefined} title={JOURS_LONGS[jourDe(d.jour).getDay()]}>
                  <span>{JOURS[jourDe(d.jour).getDay()]} {Number(d.jour.slice(8, 10))}</span>
                  <strong>{d.pluie_mm === null ? "—" : `${nf(d.pluie_mm)} mm`}</strong>
                  <span>{d.tmin === null || d.tmax === null ? "—" : `${nf(d.tmin)} / ${nf(d.tmax)} °C`}</span>
                  {vent(d) ? <span>{vent(d)}</span> : null}
                </div>
              ))}
            </div>
            <Liste>
              <Groupe nom="Passages menacés" compte={m.risques.length} precision={m.risques.length ? null : "aucun dans les 7 jours"}>
                {m.risques.map((r) => (
                  <Ligne key={r.passage_id} cle={`risque:${r.passage_id}`} libelle={r.texte} icone={<CloudRain />} titre={r.tache ?? "Passage extérieur"} second={r.motifs.join(", ")} droite={<Pilule teinte="jaune" icone={<Point teinte="jaune" />}>À décaler ou protéger</Pilule>} date={jourCourt(r.jour)} />
                ))}
              </Groupe>
              {echanges.length ? (
                <Groupe nom="Nouvel ordre proposé" compte={echanges.length} precision="rien ne bouge sans vous">
                  {echanges.map((e) => (
                    <Ligne key={`${e.exterieur}-${e.interieur}`} cle={`echange:${e.exterieur}-${e.interieur}`} libelle={e.texte} icone={<ArrowLeftRight />} titre={`${e.exterieur_tache ?? "Passage extérieur"} ⇄ ${e.interieur_tache ?? "passage intérieur"}`} second={e.texte} />
                  ))}
                </Groupe>
              ) : null}
            </Liste>
            {m.risques.map((r) => (
              <Detail key={r.passage_id} cle={`risque:${r.passage_id}`} titre={r.tache ?? "Passage extérieur"} sous={`${JOURS_LONGS[jourDe(r.jour).getDay()]} ${jourCourt(r.jour)}`}>
                <Texte>{r.texte}</Texte>
              </Detail>
            ))}
            {echanges.map((e) => (
              <Detail key={`${e.exterieur}-${e.interieur}`} cle={`echange:${e.exterieur}-${e.interieur}`} titre="Échanger deux passages" sous="Proposé à cause de la pluie annoncée">
                <Texte>{e.texte}</Texte>
                <Gestes>
                  <Bouton fort icone={<ArrowLeftRight aria-hidden="true" />} disabled={envoi} onClick={() => void echanger(e)}>Échanger</Bouton>
                </Gestes>
              </Detail>
            ))}
            <p className="lvp-vide">
              {m.fournisseur === "met_norway" ? (
                <>
                  Données météo : <a href="https://api.met.no/" target="_blank" rel="noreferrer">MET Norway</a>, licence <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY 4.0</a>
                </>
              ) : (
                "Prévision Météo-France"
              )}
              {m.recue_le ? `, reçue le ${dateHeure(m.recue_le)}` : ""}
              {source !== "reelle" ? " (exemple fictif)" : ""}. Seuils du passage, sinon pluie 5 mm, rafales 60 km/h (vent moyen 40 km/h quand les rafales ne sont pas données), gel.
            </p>
          </>
        )}
      </Partie>
    );
  }

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
            {fait ? <div style={{ marginTop: 8 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
            {echanges.length ? (
              <div style={{ marginTop: 8 }} aria-label="Nouvel ordre proposé">
                <div className="esp-kpi-sous" style={{ fontWeight: 600 }}>Nouvel ordre proposé pour la semaine — rien ne bouge sans vous</div>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {echanges.map((e) => (
                    <li key={`${e.exterieur}-${e.interieur}`} className="esp-kpi-sous">
                      {e.texte}{" "}
                      <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => void echanger(e)}>Échanger</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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
