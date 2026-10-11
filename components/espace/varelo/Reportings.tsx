"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les reportings dus — VARELO (06/10/2026, B1)

   Ce que chaque société du groupe doit, à qui (une marque, une banque, un
   réseau), pour quand, et ce qui est en retard. Chaque obligation crée ses
   échéances période après période ; on note l'envoi (ou la dispense,
   motivée) ; une échéance en retard lève une alerte adressée à son
   responsable, et figure au point du matin.

   Portes : grp_enregistrer_reporting (toute personne de la société, sauf
   lecteur), grp_marquer_reporting (le responsable, le gérant,
   l'administrateur ou un valideur), grp_arreter_reporting (gérant, admin).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Send } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_MOI } from "../exemples/socle";
import type { Source } from "../source";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte } from "../format";
import {
  FAITS_EXEMPLE,
  LIBELLE_CANAL,
  LIBELLE_ETAT_DU,
  LIBELLE_PERIODICITE,
  OBLIGATIONS_EXEMPLE,
  arreterReporting,
  aujourdhui,
  chargerDus,
  echeances,
  enregistrerReporting,
  marquerReporting,
  type Canal,
  type Du,
  type Fait,
  type Obligation,
  type Periodicite,
} from "./reportings";
import type { Contexte, Societe } from "./types";

type Props = { source: Source; contexte: Contexte | null; client_id: string; societes: Societe[]; onFait: (m: string) => void };
type Filtre = "a_faire" | "faits" | "tous";
const nouvelId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function Reportings({ source, contexte, client_id, societes, onFait }: Props) {
  const [obligations, setObligations] = useState<Obligation[]>(OBLIGATIONS_EXEMPLE);
  const [faits, setFaits] = useState<Record<string, Fait>>(FAITS_EXEMPLE);
  const [reels, setReels] = useState<Du[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("a_faire");

  const charger = useCallback(async () => {
    try {
      setReels(await chargerDus(client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReels([]);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);

  const tous = useMemo(() => (source === "exemple" ? obligations.filter((o) => o.actif).flatMap((o) => echeances(o, faits)) : (reels ?? []).filter((d) => d.actif)), [source, obligations, faits, reels]);
  const liste = useMemo(() => {
    const l = tous.filter((d) => (filtre === "a_faire" ? d.statut === "a_faire" : filtre === "faits" ? d.statut !== "a_faire" : true));
    return [...l].sort((a, b) => (filtre === "faits" ? b.echeance.localeCompare(a.echeance) : a.echeance.localeCompare(b.echeance)) || a.societe.localeCompare(b.societe));
  }, [tous, filtre]);
  const compte = useMemo(() => ({
    retard: tous.filter((d) => d.etat === "en_retard").length,
    semaine: tous.filter((d) => d.etat === "aujourdhui" || d.etat === "semaine").length,
    obligations: new Set(tous.map((d) => d.reporting_id)).size,
    tardifs: tous.filter((d) => d.etat === "envoye_en_retard").length,
  }), [tous]);

  const role = contexte?.role;
  const moi = contexte?.user_id ?? null;
  const peutSaisir = !!contexte && role !== "lecteur";
  const peutMarquer = (d: Du) => d.responsable_id === moi || role === "gerant" || role === "admin" || role === "valideur";
  const peutArreter = role === "gerant" || role === "admin";

  const [ajout, setAjout] = useState(false);
  const [cible, setCible] = useState<Du | null>(null);

  const enregistrer = useCallback(
    async (entite_id: string, champs: Omit<Obligation, "id" | "entite_id" | "actif">) => {
      if (source === "reelle") {
        await enregistrerReporting(client_id, entite_id, champs);
        await charger();
        return;
      }
      await new Promise((x) => setTimeout(x, 300));
      setObligations((prev) => [...prev, { id: nouvelId(), entite_id, actif: true, ...champs }]);
    },
    [source, client_id, charger],
  );
  const marquer = useCallback(
    async (d: Du, statut: "envoye" | "dispense", date: string, note: string) => {
      if (source === "reelle") {
        await marquerReporting(d.id, statut, date, note.trim() || null);
        await charger();
        return;
      }
      await new Promise((x) => setTimeout(x, 300));
      setFaits((prev) => ({ ...prev, [d.id]: { statut, fait_le: date, note: note.trim() || null } }));
    },
    [source, charger],
  );
  const arreter = useCallback(
    async (d: Du) => {
      try {
        if (source === "reelle") {
          await arreterReporting(d.reporting_id, null);
          await charger();
        } else setObligations((prev) => prev.map((o) => (o.id === d.reporting_id ? { ...o, actif: false } : o)));
        onFait(`Le reporting « ${d.intitule} » pour ${d.destinataire} n'est plus suivi.`);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "L'arrêt a échoué.");
      }
    },
    [source, charger, onFait],
  );

  return (
    <section id="vrl-reportings" className="esp-carte" aria-label="Reportings dus" style={{ marginBottom: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Reportings dus</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            Ce que chaque société doit à ses marques, à ses banques, à ses réseaux : quoi, à qui, pour quand. Une échéance en retard alerte son responsable et figure au point du matin.
          </p>
        </div>
        {peutSaisir ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setAjout(true)}><CalendarPlus width={14} height={14} aria-hidden="true" /> Ajouter un reporting</button>
        ) : null}
      </div>

      {erreur ? <Avis teinte="rouge" role="alert"><strong>Les reportings n&apos;ont pas pu être lus.</strong> {erreur}</Avis> : null}

      {source === "reelle" && !reels ? (
        <Chargement texte="Lecture des reportings…" />
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>En retard</dt><dd className="esp-def-fort">{compte.retard ? <Pastille teinte="rouge">{compte.retard} reporting{compte.retard > 1 ? "s" : ""}</Pastille> : "aucun"}</dd></div>
            <div><dt>Dans les 7 jours</dt><dd className="esp-def-fort">{compte.semaine}</dd></div>
            <div><dt>Obligations suivies</dt><dd>{compte.obligations}{compte.tardifs ? <span className="vrl-paire-sous">{compte.tardifs} envoi{compte.tardifs > 1 ? "s" : ""} tardif{compte.tardifs > 1 ? "s" : ""}</span> : null}</dd></div>
          </dl>
          <div className="esp-filtres" role="group" aria-label="Quels reportings" style={{ margin: "12px 0 8px" }}>
            {([["a_faire", "À faire"], ["faits", "Envoyés ou dispensés"], ["tous", "Tous"]] as [Filtre, string][]).map(([k, l]) => (
              <button key={k} type="button" className="esp-filtre" aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l}</button>
            ))}
          </div>
          {liste.length ? (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Reportings par échéance (tableau qui défile)">
              <table className="esp-tableau">
                <thead>
                  <tr>
                    <th>Échéance</th>
                    <th>Reporting</th>
                    <th>Société</th>
                    <th>Période</th>
                    <th>État</th>
                    <th><span className="vrl-masque">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <strong>{dateCourte(d.echeance)}</strong>
                        {d.statut === "a_faire" ? <span className="vrl-paire-sous">{d.jours_restants < 0 ? `depuis ${-d.jours_restants} jour${d.jours_restants < -1 ? "s" : ""}` : d.jours_restants === 0 ? "aujourd'hui" : `dans ${d.jours_restants} jour${d.jours_restants > 1 ? "s" : ""}`}</span> : null}
                      </td>
                      <td>
                        <span className="vrl-balance-nom">{d.intitule}</span>
                        <span className="vrl-paire-sous">pour {d.destinataire} · {LIBELLE_PERIODICITE[d.periodicite]}, {d.delai_jours} j après la fin de période · {LIBELLE_CANAL[d.canal]}{d.responsable_id && d.responsable_id === moi ? " · vous en êtes responsable" : ""}</span>
                      </td>
                      <td>{d.societe}</td>
                      <td>{dateCourte(d.periode_debut)} – {dateCourte(d.periode_fin)}</td>
                      <td>
                        <Pastille teinte={LIBELLE_ETAT_DU[d.etat].teinte}>{LIBELLE_ETAT_DU[d.etat].libelle}</Pastille>
                        {d.fait_le ? <span className="vrl-paire-sous">le {dateCourte(d.fait_le)}{d.note ? ` — ${d.note}` : ""}</span> : null}
                      </td>
                      <td>
                        <span className="esp-item-haut">
                          {d.statut === "a_faire" && peutMarquer(d) ? (
                            <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => setCible(d)} aria-label={`Noter l'envoi de « ${d.intitule} » pour ${d.destinataire}, échéance du ${dateCourte(d.echeance)}`}>Envoyé…</button>
                          ) : null}
                          {peutArreter ? (
                            <button type="button" className="esp-lien-bouton" onClick={() => void arreter(d)} aria-label={`Ne plus suivre « ${d.intitule} » pour ${d.destinataire}`}>Ne plus suivre</button>
                          ) : null}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vide titre={filtre === "faits" ? "Rien d'envoyé encore" : "Aucun reporting à faire"}>{peutSaisir ? "Ajoutez ce que chaque société doit à ses marques, banques ou réseaux : les échéances se créent d'elles-mêmes, période après période." : "Les reportings du groupe s'affichent ici dès qu'ils sont enregistrés."}</Vide>
          )}
        </>
      )}

      {ajout ? <DialogueAjout societes={societes} moi={moi} onFermer={() => setAjout(false)} enregistrer={enregistrer} onFait={onFait} /> : null}
      {cible ? <DialogueMarquer d={cible} onFermer={() => setCible(null)} marquer={marquer} onFait={onFait} /> : null}
    </section>
  );
}

function DialogueAjout({ societes, moi, onFermer, enregistrer, onFait }: {
  societes: Societe[];
  moi: string | null;
  onFermer: () => void;
  enregistrer: (entite_id: string, champs: Omit<Obligation, "id" | "entite_id" | "actif">) => Promise<void>;
  onFait: (m: string) => void;
}) {
  const [entite, setEntite] = useState(societes[0]?.entite_id ?? "");
  const [destinataire, setDestinataire] = useState("");
  const [intitule, setIntitule] = useState("");
  const [periodicite, setPeriodicite] = useState<Periodicite>("mensuelle");
  const [delai, setDelai] = useState("10");
  const [debut, setDebut] = useState(aujourdhui());
  const [canal, setCanal] = useState<Canal>("courriel");
  const [responsable, setResponsable] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const nDelai = Number(delai);
  const valide = !!entite && !!destinataire.trim() && !!intitule.trim() && Number.isInteger(nDelai) && nDelai >= 0 && nDelai <= 180 && !!debut;
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await enregistrer(entite, { destinataire: destinataire.trim(), intitule: intitule.trim(), periodicite, delai_jours: nDelai, debut, canal, responsable_id: responsable ? (moi ?? EXEMPLE_MOI) : null });
      onFait(`Le reporting « ${intitule.trim()} » pour ${destinataire.trim()} est suivi : ses échéances sont créées ${LIBELLE_PERIODICITE[periodicite]}.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le reporting n'a pas été enregistré.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><CalendarPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Ajouter un reporting</DialogTitle>
          <DialogDescription>Un reporting que la société doit, à date fixe : les échéances se créent période après période (calendaire), dues tant de jours après la fin de chaque période.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={entite} onChange={(x) => setEntite(x.target.value)}>
                  {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                </select>
              </label>
              <label className="rv-libelle">À qui <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={destinataire} maxLength={200} placeholder="la marque, la banque, le réseau…" onChange={(x) => setDestinataire(x.target.value)} />
              </label>
            </div>
            <label className="rv-libelle">Quoi <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" value={intitule} maxLength={200} placeholder="Ventes et stock du mois…" onChange={(x) => setIntitule(x.target.value)} />
            </label>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Périodicité
                <select className="rv-champ" value={periodicite} onChange={(x) => setPeriodicite(x.target.value as Periodicite)}>
                  <option value="hebdomadaire">Hebdomadaire</option>
                  <option value="mensuelle">Mensuelle</option>
                  <option value="trimestrielle">Trimestrielle</option>
                  <option value="annuelle">Annuelle</option>
                </select>
              </label>
              <label className="rv-libelle">Jours après la fin de période
                <input className="rv-champ" inputMode="numeric" value={delai} onChange={(x) => setDelai(x.target.value)} />
              </label>
            </div>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Suivi à partir du
                <input type="date" className="rv-champ" value={debut} onChange={(x) => setDebut(x.target.value)} />
              </label>
              <label className="rv-libelle">Canal
                <select className="rv-champ" value={canal} onChange={(x) => setCanal(x.target.value as Canal)}>
                  <option value="portail">Portail</option>
                  <option value="courriel">Courriel</option>
                  <option value="extranet">Extranet</option>
                  <option value="courrier">Courrier</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
            </div>
            <label className="rv-libelle vrl-case">
              <input type="checkbox" checked={responsable} onChange={(x) => setResponsable(x.target.checked)} /> J&apos;en suis responsable (les alertes de retard me sont adressées)
            </label>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Enregistrer le reporting</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogueMarquer({ d, onFermer, marquer, onFait }: { d: Du; onFermer: () => void; marquer: (d: Du, s: "envoye" | "dispense", date: string, note: string) => Promise<void>; onFait: (m: string) => void }) {
  const jour = aujourdhui();
  const [statut, setStatut] = useState<"envoye" | "dispense">("envoye");
  const [date, setDate] = useState(jour);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const valide = !!date && date <= jour && (statut === "envoye" || !!note.trim());
  const envoyer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      await marquer(d, statut, date, note);
      onFait(statut === "envoye" ? `« ${d.intitule} » pour ${d.destinataire} est noté envoyé le ${dateCourte(date)}${date > d.echeance ? ", après son échéance" : ""}.` : `« ${d.intitule} » pour ${d.destinataire} est dispensé pour cette période.`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "L'envoi n'a pas été noté.");
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Send width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Noter l&apos;envoi — {d.intitule}</DialogTitle>
          <DialogDescription>Pour {d.destinataire}, période du {dateCourte(d.periode_debut)} au {dateCourte(d.periode_fin)}, dû le {dateCourte(d.echeance)}. L&apos;envoi est inscrit au journal ; une dispense dit pourquoi.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <div className="esp-form-ligne">
              <label className="rv-libelle">Ce qui s&apos;est passé
                <select className="rv-champ" value={statut} onChange={(x) => setStatut(x.target.value as "envoye" | "dispense")}>
                  <option value="envoye">Envoyé</option>
                  <option value="dispense">Dispensé pour cette période</option>
                </select>
              </label>
              <label className="rv-libelle">Le
                <input type="date" className="rv-champ" value={date} max={jour} onChange={(x) => setDate(x.target.value)} />
              </label>
            </div>
            <label className="rv-libelle">{statut === "dispense" ? <>Pourquoi <span className="esp-obligatoire">(obligatoire)</span></> : "Note"}
              <input className="rv-champ" value={note} maxLength={500} placeholder={statut === "dispense" ? "la marque n'en veut pas ce mois-ci…" : "déposé sur le portail, envoyé à…"} onChange={(x) => setNote(x.target.value)} />
            </label>
            {date > d.echeance && statut === "envoye" ? <Avis teinte="ambre">Après l&apos;échéance du {dateCourte(d.echeance)} : l&apos;envoi sera noté en retard.</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Noter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
