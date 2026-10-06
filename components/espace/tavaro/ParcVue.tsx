"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le parc — remise en location et entretien
   (06/10/2026, session B2, modules 02 et 03, migration b2_10)

   Dès qu'un véhicule rentre, la remise en location (inspection,
   nettoyage, carburant ou recharge) est créée avec l'heure du prochain
   départ ; le responsable est alerté si elle risque de le manquer ;
   chaque anomalie de retour va à une personne nommée. Un véhicule chez le
   carrossier garde sa date de retour, et ses réservations sont à
   réaffecter. L'entretien se place dans les creux du planning, jamais sur
   une réservation, et l'atelier est prévenu.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, TriangleAlert, Wrench } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import type { AnomalieRetour, Creneau, Dossier, EtapeRemise, Entretien, Immobilisation, MotifImmobilisation, NatureEntretien, Parc, Remise, Role, TypeAnomalie } from "./types";

export type GestesParc = {
  etape: (r: Remise, etape: EtapeRemise, fait: boolean) => Promise<void>;
  assigner: (r: Remise, responsable: string | null) => Promise<void>;
  signaler: (r: Remise, type: TypeAnomalie, description: string, responsable: string) => Promise<void>;
  traiter: (a: AnomalieRetour, note: string | null) => Promise<void>;
  immobiliser: (vehicule_id: string, valeurs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  lever: (i: Immobilisation, cout: number | null, notes: string | null) => Promise<void>;
  prevoir: (vehicule_id: string, valeurs: Record<string, unknown>) => Promise<void>;
  creneaux: (e: Entretien) => Promise<Creneau[]>;
  planifier: (e: Entretien, debut: string, atelierNom: string | null, atelierAdresse: string | null) => Promise<Record<string, unknown>>;
  fait: (e: Entretien, km: number | null, cout: number | null) => Promise<void>;
};

const MOTIFS: Record<MotifImmobilisation, string> = {
  preparation: "Préparation", entretien: "Entretien", carrosserie: "Carrosserie", controle_technique: "Contrôle technique", sinistre: "Sinistre",
  attente_pieces: "Attente de pièces", rappel_constructeur: "Rappel du constructeur", autre: "Autre",
};
const ANOMALIES: Record<TypeAnomalie, string> = {
  voyant: "Voyant allumé", dommage: "Dommage", proprete: "Propreté", objet_oublie: "Objet oublié", pneu: "Pneu", cle_papiers: "Clé ou papiers", equipement: "Équipement manquant", autre: "Autre",
};
const NATURES: Record<NatureEntretien, string> = {
  revision: "Révision", vidange: "Vidange", controle_technique: "Contrôle technique", pneus: "Pneus", freins: "Freins", climatisation: "Climatisation", autre: "Autre",
};
const ETAPES: EtapeRemise[] = ["inspection", "nettoyage", "energie"];

const duree = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")}` : `${Math.round(min)} min`);
const minutesAvant = (iso: string | null) => (iso ? Math.round((Date.parse(iso) - Date.now()) / 60_000) : null);
const libelleEnergie = (energie: string | null | undefined) =>
  energie === "electrique" ? "Recharge" : energie === "hybride_rechargeable" ? "Plein et recharge" : "Plein";
const nombre = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);

function Delai({ r, dureeMin }: { r: Remise; dureeMin: number }) {
  if (r.statut === "prete") return <Pastille teinte="vert">prête</Pastille>;
  if (r.statut === "annulee") return <Pastille teinte="gris">annulée</Pastille>;
  const m = minutesAvant(r.limite_le);
  if (m === null) return <Pastille teinte="gris">pas de départ prévu</Pastille>;
  const reste = (dureeMin * ETAPES.filter((e) => !r[`${e}_le`]).length) / 3;
  if (m < 0) return <Pastille teinte="rouge">heure limite passée</Pastille>;
  if (m < reste) return <Pastille teinte="rouge">risque de manquer le départ</Pastille>;
  return <Pastille teinte={m < reste + 60 ? "ambre" : "gris"}>{duree(m)} avant l&apos;heure limite</Pastille>;
}

export default function ParcVue({ parc, dossiers, role, moi, nommer, nomAgence, dureeMin, gestes }: {
  parc: Parc;
  dossiers: Dossier[];
  role: Role | null;
  moi: string;
  nommer: (id: string | null | undefined) => string;
  nomAgence: (entite_id: string) => string;
  dureeMin: number;
  gestes: GestesParc;
}) {
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [anomalie, setAnomalie] = useState<{ r: Remise; type: TypeAnomalie; description: string; responsable: string } | null>(null);
  const [immo, setImmo] = useState<{ vehicule: string; motif: MotifImmobilisation; fin: string; prestataire: string; notes: string } | null>(null);
  const [retour, setRetour] = useState<{ i: Immobilisation; cout: string } | null>(null);
  const [prevision, setPrevision] = useState<{ vehicule: string; nature: NatureEntretien; libelle: string; echeance_le: string; echeance_km: string; duree_h: string } | null>(null);
  const [plan, setPlan] = useState<{ e: Entretien; creneaux: Creneau[] | null; choix: string; atelier: string; adresse: string } | null>(null);
  const [cloture, setCloture] = useState<{ e: Entretien; km: string; cout: string } | null>(null);

  /* les délais dépendent de l'heure : la carte s'affiche une fois montée (le rendu serveur ne connaît pas l'heure du
     visiteur), puis se rafraîchit chaque minute */
  const [monte, setMonte] = useState(0);
  useEffect(() => {
    const t0 = window.setTimeout(() => setMonte((n) => n + 1), 0);
    const t = window.setInterval(() => setMonte((n) => n + 1), 60_000);
    return () => { window.clearTimeout(t0); window.clearInterval(t); };
  }, []);

  const direction = role === "gerant" || role === "admin" || role === "valideur";
  const agence = direction || role === "collaborateur";
  const vehicule = (id: string) => parc.vehicules.find((v) => v.id === id) ?? dossiers.find((d) => d.vehicule?.id === id)?.vehicule ?? null;
  const contrat = (id: string | null) => (id ? dossiers.find((d) => d.contrat.id === id)?.contrat ?? null : null);

  const enCours = useMemo(() => parc.remises.filter((r) => r.statut === "a_faire" || r.statut === "en_cours")
    .sort((x, y) => (x.limite_le ?? "9999").localeCompare(y.limite_le ?? "9999")), [parc.remises]);
  const finies = useMemo(() => parc.remises.filter((r) => r.statut === "prete" && r.prete_le), [parc.remises]);
  const mediane = useMemo(() => {
    const d = finies.map((r) => (Date.parse(r.prete_le!) - Date.parse(r.retour_le)) / 60_000).sort((a, b) => a - b);
    return d.length ? d[Math.floor((d.length - 1) / 2)] : null;
  }, [finies]);
  const aTemps = finies.filter((r) => !r.limite_le || r.prete_le! <= r.limite_le).length;
  const risques = enCours.filter((r) => { const m = minutesAvant(r.limite_le); return m !== null && m < (dureeMin * ETAPES.filter((e) => !r[`${e}_le`]).length) / 3; }).length;
  const immobilises = parc.immobilisations.filter((i) => !i.fin_le && i.motif !== "preparation");
  const entretiens = parc.entretiens.filter((e) => e.statut === "a_planifier" || e.statut === "planifie")
    .sort((x, y) => (x.statut === y.statut ? (x.debut_le ?? x.echeance_le ?? "9").localeCompare(y.debut_le ?? y.echeance_le ?? "9") : x.statut === "a_planifier" ? -1 : 1));
  const anomaliesDe = (r: Remise) => parc.anomalies.filter((a) => a.remise_id === r.id);
  const louables = parc.vehicules.filter((v) => v.statut !== "sorti");

  async function agir(cle: string, action: () => Promise<string | null>) {
    setEnvoi(cle);
    setErreur(null);
    try {
      const m = await action();
      if (m) setFait(m);
      setAnomalie(null);
      setImmo(null);
      setRetour(null);
      setPrevision(null);
      setPlan(null);
      setCloture(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(null);
    }
  }
  const ouvrirPlan = async (e: Entretien) => {
    setErreur(null);
    setFait(null);
    setPlan({ e, creneaux: null, choix: "", atelier: e.atelier_nom ?? "", adresse: e.atelier_adresse ?? "" });
    try {
      const c = await gestes.creneaux(e);
      setPlan((p) => (p && p.e.id === e.id ? { ...p, creneaux: c, choix: c[0]?.debut ?? "" } : p));
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Les créneaux n'ont pas pu être lus.");
      setPlan((p) => (p ? { ...p, creneaux: [] } : p));
    }
  };
  const adresseOk = (a: string) => !a.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.trim());

  return (
    <section className="esp-carte" aria-label="Parc : remise en location et entretien">
      <div className="esp-carte-tete">
        <div className="tav-bareme-tete" style={{ width: "100%" }}>
          <div className="esp-item-haut">
            <h2 className="esp-carte-titre">Parc : remise en location et entretien</h2>
            {!monte ? null : enCours.length ? <Pastille teinte={risques ? "rouge" : "ambre"}>{enCours.length} à remettre en location{risques ? ` · ${risques} en risque` : ""}</Pastille> : <Pastille teinte="vert">tout est prêt</Pastille>}
          </div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setImmo({ vehicule: "", motif: "carrosserie", fin: "", prestataire: "", notes: "" }); }}>
              <TriangleAlert width={14} height={14} aria-hidden="true" /> Immobiliser un véhicule
            </button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setPrevision({ vehicule: "", nature: "revision", libelle: "", echeance_le: "", echeance_km: "", duree_h: "4" }); }}>
              <Plus width={14} height={14} aria-hidden="true" /> Prévoir un entretien
            </button>
          </div>
        </div>
      </div>
      {!monte ? <div className="esp-carte-corps"><Chargement texte="Lecture du parc…" /></div> : (
      <div className="esp-carte-corps">
        <div className="tav-parc-chiffres" role="list" aria-label="Le parc en chiffres">
          <div role="listitem"><span className="esp-kpi-etiquette">Remise en location</span><strong>{mediane !== null ? duree(mediane) : "—"}</strong><span className="esp-kpi-sous">médiane sur 30 jours ({finies.length} retour{finies.length > 1 ? "s" : ""})</span></div>
          <div role="listitem"><span className="esp-kpi-etiquette">Prêtes à temps</span><strong>{finies.length ? `${aTemps} / ${finies.length}` : "—"}</strong><span className="esp-kpi-sous">avant l&apos;heure limite</span></div>
          <div role="listitem"><span className="esp-kpi-etiquette">Immobilisés</span><strong>{immobilises.length}</strong><span className="esp-kpi-sous">hors préparation</span></div>
          <div role="listitem"><span className="esp-kpi-etiquette">Entretiens</span><strong>{entretiens.length}</strong><span className="esp-kpi-sous">{entretiens.filter((e) => e.statut === "a_planifier").length} à planifier</span></div>
        </div>
        {fait ? <div style={{ margin: "10px 0" }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {erreur && !anomalie && !immo && !retour && !prevision && !plan && !cloture ? <div style={{ margin: "10px 0" }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}

        <h3 className="tav-parc-titre">Remises en location</h3>
        {enCours.length === 0 ? (
          <Vide titre="Aucune remise en cours">Dès qu&apos;un véhicule rentre, sa remise en location apparaît ici, avec l&apos;heure du prochain départ.</Vide>
        ) : (
          <ul className="tav-avis-liste" aria-label="Remises en location, par heure limite">
            {enCours.map((r) => {
              const v = vehicule(r.vehicule_id);
              const c = contrat(r.contrat_id);
              return (
                <li key={r.id} className="tav-avis" data-alerte={r.alerte ?? undefined}>
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{v?.immatriculation ?? "—"}</span>
                    {v?.modele ? <span className="esp-kpi-sous">{v.modele}</span> : null}
                    <Delai r={r} dureeMin={dureeMin} />
                  </div>
                  <p className="esp-kpi-sous">
                    Rendu le {dateHeure(r.retour_le)}{c ? <> · contrat <span className="esp-mono">{c.numero}</span></> : null} · {nomAgence(r.entite_id)}
                  </p>
                  <p className="tav-avis-titre">
                    {r.prochain_depart_le
                      ? <>Prochain départ le {dateHeure(r.prochain_depart_le)}{r.prochain_depart_ref ? <> (<span className="esp-mono">{r.prochain_depart_ref}</span>{r.prochain_depart_source === "categorie" ? ", même catégorie" : ""})</> : null} : prête avant {dateHeure(r.limite_le)}</>
                      : "Aucun départ prévu pour ce véhicule"}
                  </p>
                  <div className="tav-etapes" role="group" aria-label={`Étapes de la remise de ${v?.immatriculation ?? "ce véhicule"}`}>
                    {ETAPES.map((e) => {
                      const le = r[`${e}_le`];
                      const libelle = e === "inspection" ? "Inspection" : e === "nettoyage" ? "Nettoyage" : libelleEnergie(v?.energie);
                      return (
                        <button key={e} type="button" className="tav-etape" aria-pressed={!!le} disabled={!agence || envoi !== null}
                          onClick={() => agir(`${r.id}:${e}`, async () => { await gestes.etape(r, e, !le); return null; })}>
                          <span aria-hidden="true">{le ? "✓" : "○"}</span> {libelle}
                          {le ? <span className="esp-kpi-sous"> {nommer(r[`${e}_par`])}, {dateHeure(le).split(" à ")[1] ?? ""}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="esp-actions">
                    <label className="rv-libelle tav-confier">Confiée à
                      <select className="rv-champ" value={r.responsable ?? ""} disabled={!agence || envoi !== null}
                        onChange={(ev) => agir(`${r.id}:resp`, async () => { await gestes.assigner(r, ev.target.value || null); return `La remise de ${v?.immatriculation ?? ""} est confiée à ${ev.target.value ? nommer(ev.target.value) : "personne en particulier"}.`; })}>
                        <option value="">Personne en particulier</option>
                        {parc.membres.map((m) => <option key={m.user_id} value={m.user_id}>{nommer(m.user_id)}</option>)}
                      </select>
                    </label>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setAnomalie({ r, type: "voyant", description: "", responsable: "" }); }}>
                      <TriangleAlert width={14} height={14} aria-hidden="true" /> Signaler une anomalie
                    </button>
                  </div>
                  {anomaliesDe(r).length ? (
                    <ul className="tav-anomalies" aria-label="Anomalies de ce retour">
                      {anomaliesDe(r).map((a) => (
                        <li key={a.id}>
                          <Pastille teinte={a.statut === "ouverte" ? "ambre" : "vert"}>{a.statut === "ouverte" ? ANOMALIES[a.type] : "traitée"}</Pastille>
                          <span>{a.description} — confiée à <strong>{nommer(a.responsable)}</strong>{a.traitee_le ? `, traitée le ${dateCourte(a.traitee_le)}${a.note ? ` : ${a.note}` : ""}` : ""}</span>
                          {a.statut === "ouverte" ? (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi !== null || !(a.responsable === moi || direction)}
                              title={a.responsable === moi || direction ? undefined : "La personne nommée, ou la direction, clôt l'anomalie"}
                              onClick={() => agir(`${a.id}`, async () => { await gestes.traiter(a, null); return `L'anomalie « ${a.description} » est traitée.`; })}>Traitée</button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="tav-parc-titre">Immobilisations</h3>
        {immobilises.length === 0 ? (
          <Vide titre="Aucun véhicule immobilisé">Un véhicule chez le carrossier, au garage ou sous rappel du constructeur s&apos;inscrit ici avec sa date de retour.</Vide>
        ) : (
          <ul className="tav-avis-liste" aria-label="Véhicules immobilisés">
            {immobilises.map((i) => {
              const depasse = (minutesAvant(i.fin_prevue_le) ?? 1) < 0;
              return (
                <li key={i.id} className="tav-avis">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{vehicule(i.vehicule_id)?.immatriculation ?? "—"}</span>
                    <Pastille teinte={i.motif === "rappel_constructeur" || i.motif === "sinistre" ? "rouge" : "ambre"}>{MOTIFS[i.motif]}</Pastille>
                    {i.fin_prevue_le ? <Pastille teinte={depasse ? "rouge" : "gris"}>{depasse ? "retour dépassé" : `retour le ${dateCourte(i.fin_prevue_le)}`}</Pastille> : null}
                    {i.cout_eur ? <span className="esp-item-montant">{montant(i.cout_eur)}</span> : null}
                  </div>
                  <p className="esp-kpi-sous">{vehicule(i.vehicule_id)?.modele ? `${vehicule(i.vehicule_id)?.modele} · ` : ""}depuis le {dateHeure(i.debut_le)}{i.prestataire ? ` · ${i.prestataire}` : ""}{i.notes ? ` · ${i.notes}` : ""}</p>
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setRetour({ i, cout: i.cout_eur !== null ? String(i.cout_eur) : "" }); }}>Le véhicule est revenu</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="tav-parc-titre">Entretien</h3>
        {entretiens.length === 0 ? (
          <Vide titre="Aucun entretien à venir">Révisions, contrôles techniques et pneus s&apos;inscrivent ici avec leur échéance ; Tavaro propose les creux du planning.</Vide>
        ) : (
          <ul className="tav-avis-liste" aria-label="Entretiens à planifier et planifiés">
            {entretiens.map((e) => {
              const v = vehicule(e.vehicule_id);
              const echeance = [e.echeance_le ? dateCourte(e.echeance_le) : null, e.echeance_km !== null ? `${e.echeance_km.toLocaleString("fr-FR")} km` : null].filter(Boolean).join(" ou ");
              const kmProche = e.echeance_km !== null && v?.km_dernier !== null && v?.km_dernier !== undefined && v.km_dernier >= e.echeance_km - 1000;
              return (
                <li key={e.id} className="tav-avis">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{v?.immatriculation ?? "—"}</span>
                    <Pastille teinte={e.statut === "planifie" ? "bleu" : kmProche ? "rouge" : "ambre"}>{e.statut === "planifie" ? "planifié" : "à planifier"}</Pastille>
                  </div>
                  <p className="tav-avis-titre">{e.libelle ?? NATURES[e.nature]}</p>
                  <p className="esp-kpi-sous">
                    Échéance {echeance}{v?.km_dernier ? ` · ${v.km_dernier.toLocaleString("fr-FR")} km au dernier relevé` : ""} · {e.duree_h} h d&apos;atelier
                  </p>
                  {e.statut === "planifie" && e.debut_le ? (
                    <p className="esp-kpi-sous">Dépôt le {dateHeure(e.debut_le)}, reprise le {dateHeure(e.fin_le)}{e.atelier_nom ? ` chez ${e.atelier_nom}` : ""}{e.envoi_id ? " · atelier prévenu" : ""}</p>
                  ) : null}
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!agence} onClick={() => void ouvrirPlan(e)}>
                      <CalendarClock width={14} height={14} aria-hidden="true" /> {e.statut === "planifie" ? "Déplacer" : "Trouver un créneau"}
                    </button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence} onClick={() => { setErreur(null); setFait(null); setCloture({ e, km: v?.km_dernier ? String(v.km_dernier) : "", cout: "" }); }}>
                      <Wrench width={14} height={14} aria-hidden="true" /> Fait
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}

      <Dialog open={!!anomalie} onOpenChange={(o) => !o && setAnomalie(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><TriangleAlert width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Anomalie au retour de {anomalie ? vehicule(anomalie.r.vehicule_id)?.immatriculation : ""}</DialogTitle>
            <DialogDescription>Chaque anomalie va à une personne nommée, qui est prévenue et la clôt une fois traitée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {anomalie ? (
              <div className="esp-form">
                <label className="rv-libelle">Type
                  <select className="rv-champ" value={anomalie.type} onChange={(e) => setAnomalie({ ...anomalie, type: e.target.value as TypeAnomalie })}>
                    {Object.entries(ANOMALIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Ce qui a été constaté <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={anomalie.description} onChange={(e) => setAnomalie({ ...anomalie, description: e.target.value })} /></label>
                <label className="rv-libelle">Confiée à <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={anomalie.responsable} onChange={(e) => setAnomalie({ ...anomalie, responsable: e.target.value })}>
                    <option value="">Choisir une personne…</option>
                    {parc.membres.map((m) => <option key={m.user_id} value={m.user_id}>{nommer(m.user_id)}</option>)}
                  </select>
                </label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !anomalie || anomalie.description.trim().length < 3 || !anomalie.responsable}
              onClick={() => anomalie && agir("anomalie", async () => { await gestes.signaler(anomalie.r, anomalie.type, anomalie.description.trim(), anomalie.responsable); return `L'anomalie est confiée à ${nommer(anomalie.responsable)}, qui est prévenue.`; })}>
              {envoi === "anomalie" ? <Loader variant="spin" /> : null} Signaler
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!immo} onOpenChange={(o) => !o && setImmo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><TriangleAlert width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Immobiliser un véhicule</DialogTitle>
            <DialogDescription>Le véhicule garde sa date de retour ; ses réservations sur la période sont à réaffecter, Tavaro les liste.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {immo ? (
              <div className="esp-form">
                <label className="rv-libelle">Véhicule <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={immo.vehicule} onChange={(e) => setImmo({ ...immo, vehicule: e.target.value })}>
                    <option value="">Choisir…</option>
                    {louables.map((v) => <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` · ${v.modele}` : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Motif
                    <select className="rv-champ" value={immo.motif} onChange={(e) => setImmo({ ...immo, motif: e.target.value as MotifImmobilisation })}>
                      {(Object.keys(MOTIFS) as MotifImmobilisation[]).filter((m) => m !== "preparation").map((m) => <option key={m} value={m}>{MOTIFS[m]}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Retour prévu{immo.motif !== "sinistre" && immo.motif !== "autre" ? <span className="esp-obligatoire"> (obligatoire)</span> : null}<input type="datetime-local" className="rv-champ" value={immo.fin} onChange={(e) => setImmo({ ...immo, fin: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Prestataire<input className="rv-champ" value={immo.prestataire} onChange={(e) => setImmo({ ...immo, prestataire: e.target.value })} placeholder="Carrosserie du Parc" /></label>
                <label className="rv-libelle">Note<input className="rv-champ" value={immo.notes} onChange={(e) => setImmo({ ...immo, notes: e.target.value })} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !immo?.vehicule || (!immo.fin && immo.motif !== "sinistre" && immo.motif !== "autre")}
              onClick={() => immo && agir("immo", async () => {
                const r = await gestes.immobiliser(immo.vehicule, { motif: immo.motif, fin_prevue_le: immo.fin ? new Date(immo.fin).toISOString() : undefined, prestataire: immo.prestataire.trim() || undefined, notes: immo.notes.trim() || undefined });
                const a = Array.isArray(r.a_reaffecter) ? (r.a_reaffecter as { ref: string }[]) : [];
                return `${vehicule(immo.vehicule)?.immatriculation ?? "Le véhicule"} est immobilisé (${MOTIFS[immo.motif].toLowerCase()}).${a.length ? ` À réaffecter sur un autre véhicule : ${a.map((x) => x.ref).join(", ")}.` : " Aucune réservation à réaffecter."}`;
              })}>
              {envoi === "immo" ? <Loader variant="spin" /> : null} Immobiliser
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!retour} onOpenChange={(o) => !o && setRetour(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{retour ? vehicule(retour.i.vehicule_id)?.immatriculation : ""} est revenu</DialogTitle>
            <DialogDescription>Le véhicule redevient louable. Le coût réel nourrit sa fiche économique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {retour ? (
              <div className="esp-form">
                <label className="rv-libelle">Coût (€)<input className="rv-champ" inputMode="decimal" value={retour.cout} onChange={(e) => setRetour({ ...retour, cout: e.target.value })} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || (!!retour?.cout.trim() && !Number.isFinite(nombre(retour.cout)))}
              onClick={() => retour && agir("retour", async () => { await gestes.lever(retour.i, nombre(retour.cout), null); return `${vehicule(retour.i.vehicule_id)?.immatriculation ?? "Le véhicule"} est de nouveau louable.`; })}>
              {envoi === "retour" ? <Loader variant="spin" /> : null} Confirmer le retour
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!prevision} onOpenChange={(o) => !o && setPrevision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Prévoir un entretien</DialogTitle>
            <DialogDescription>Une échéance en date, en kilomètres, ou les deux : Tavaro prévient avant, et propose les creux du planning.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {prevision ? (
              <div className="esp-form">
                <label className="rv-libelle">Véhicule <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={prevision.vehicule} onChange={(e) => setPrevision({ ...prevision, vehicule: e.target.value })}>
                    <option value="">Choisir…</option>
                    {louables.map((v) => <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` · ${v.modele}` : ""}{v.km_dernier ? ` · ${v.km_dernier.toLocaleString("fr-FR")} km` : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Nature
                    <select className="rv-champ" value={prevision.nature} onChange={(e) => setPrevision({ ...prevision, nature: e.target.value as NatureEntretien })}>
                      {Object.entries(NATURES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label className="rv-libelle">Durée d&apos;atelier (h)<input className="rv-champ" inputMode="numeric" value={prevision.duree_h} onChange={(e) => setPrevision({ ...prevision, duree_h: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Libellé<input className="rv-champ" value={prevision.libelle} onChange={(e) => setPrevision({ ...prevision, libelle: e.target.value })} placeholder="Révision 60 000 km" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Échéance (date)<input type="date" className="rv-champ" value={prevision.echeance_le} onChange={(e) => setPrevision({ ...prevision, echeance_le: e.target.value })} /></label>
                  <label className="rv-libelle">Échéance (km)<input className="rv-champ" inputMode="numeric" value={prevision.echeance_km} onChange={(e) => setPrevision({ ...prevision, echeance_km: e.target.value })} /></label>
                </div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !prevision?.vehicule || (!prevision.echeance_le && !prevision.echeance_km.trim())}
              onClick={() => prevision && agir("prevision", async () => {
                await gestes.prevoir(prevision.vehicule, { nature: prevision.nature, libelle: prevision.libelle.trim() || undefined, echeance_le: prevision.echeance_le || undefined,
                  echeance_km: nombre(prevision.echeance_km) ?? undefined, duree_h: nombre(prevision.duree_h) ?? 4 });
                return `${prevision.libelle.trim() || NATURES[prevision.nature]} prévu pour ${vehicule(prevision.vehicule)?.immatriculation ?? "le véhicule"}.`;
              })}>
              {envoi === "prevision" ? <Loader variant="spin" /> : null} Prévoir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><CalendarClock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{plan ? `${plan.e.libelle ?? NATURES[plan.e.nature]} — ${vehicule(plan.e.vehicule_id)?.immatriculation ?? ""}` : ""}</DialogTitle>
            <DialogDescription>Les creux du planning : aucun ne touche un contrat, une réservation de ce véhicule ou une autre immobilisation.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {plan ? (
              <div className="esp-form">
                {plan.creneaux === null ? <Loader variant="spin" /> : plan.creneaux.length === 0 ? (
                  <Avis teinte="ambre">Aucun creux de {plan.e.duree_h} h dans les soixante prochains jours : le véhicule est loué ou réservé tout le temps.</Avis>
                ) : (
                  <fieldset className="tav-creneaux">
                    <legend className="rv-libelle">Créneau</legend>
                    {plan.creneaux.map((c) => (
                      <label key={c.debut} className="tav-creneau">
                        <input type="radio" name="creneau" value={c.debut} checked={plan.choix === c.debut} onChange={() => setPlan({ ...plan, choix: c.debut })} />
                        <span>{dateHeure(c.debut)} → {dateHeure(c.fin).split(" à ")[1] ?? dateHeure(c.fin)}{c.avant_echeance ? "" : " · après l'échéance"}</span>
                      </label>
                    ))}
                  </fieldset>
                )}
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Atelier<input className="rv-champ" value={plan.atelier} onChange={(e) => setPlan({ ...plan, atelier: e.target.value })} placeholder="Garage Lumière" /></label>
                  <label className="rv-libelle">Courriel de l&apos;atelier<input type="email" className="rv-champ" value={plan.adresse} onChange={(e) => setPlan({ ...plan, adresse: e.target.value })} placeholder="atelier@garage.fr" autoComplete="off" /></label>
                </div>
                {!adresseOk(plan.adresse) ? <Avis teinte="ambre">Le courriel de l&apos;atelier n&apos;est pas une adresse valide.</Avis> : null}
                {plan.adresse.trim() && adresseOk(plan.adresse) ? <p className="esp-kpi-sous">L&apos;atelier reçoit le créneau par courriel, après validation de vos envois.</p> : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !plan?.choix || !adresseOk(plan.adresse)}
              onClick={() => plan && agir("plan", async () => {
                const r = await gestes.planifier(plan.e, plan.choix, plan.atelier.trim() || null, plan.adresse.trim() || null);
                return `${plan.e.libelle ?? NATURES[plan.e.nature]} planifié le ${dateHeure(plan.choix)}${r.atelier_prevenu ? " ; l'atelier est prévenu" : ""}.`;
              })}>
              {envoi === "plan" ? <Loader variant="spin" /> : null} Planifier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cloture} onOpenChange={(o) => !o && setCloture(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Wrench width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{cloture ? `${cloture.e.libelle ?? NATURES[cloture.e.nature]} fait` : ""}</DialogTitle>
            <DialogDescription>Le kilométrage et le coût restent dans l&apos;historique du véhicule.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {cloture ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Kilométrage<input className="rv-champ" inputMode="numeric" value={cloture.km} onChange={(e) => setCloture({ ...cloture, km: e.target.value })} /></label>
                  <label className="rv-libelle">Coût (€)<input className="rv-champ" inputMode="decimal" value={cloture.cout} onChange={(e) => setCloture({ ...cloture, cout: e.target.value })} /></label>
                </div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null}
              onClick={() => cloture && agir("cloture", async () => { await gestes.fait(cloture.e, nombre(cloture.km), nombre(cloture.cout)); return `${cloture.e.libelle ?? NATURES[cloture.e.nature]} est fait.`; })}>
              {envoi === "cloture" ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
