"use client";

/* ══════════════════════════════════════════════════════════════════════
   La fiche d'un compte OFFLOAD (06/10/2026, session C4)

   Pourquoi il est signalé (chaque raison en phrase, avec ses points : le
   score n'en est que la somme), son rythme, sa courbe sur 24 mois, ses
   reprises (et l'état de leurs messages), ses tâches, ses pièces. Trois
   gestes : préparer une reprise (le message part en validation), noter un
   appel, ajouter une pièce oubliée par l'export. Les gestes passent par
   l'écran (onAgir), qui sait s'il écrit dans l'exemple ou en base.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { PhoneCall, Plus, Send } from "lucide-react";
import { Loader } from "@/components/ui/loader";
import { dateCourte, montant, nombreFr } from "../format";
import { Avis, Def, Pastille, Vide } from "../ui";
import Courbe from "./Courbe";
import AffairesCompte from "./AffairesCompte";
import ParcCompte from "./ParcCompte";
import type { Source } from "../source";
import { ISSUES, NIVEAUX, STATUTS_COMPTE, STATUTS_REPRISE } from "./etats";
import type { Fiche, Tache } from "./types";

const BLOC: React.CSSProperties = { border: "1px solid var(--r-filet)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 };

export type Geste =
  | { type: "reprise"; compte: string }
  | { type: "tache"; tache: string; statut: "faite" | "abandonnee"; compteRendu: string | null }
  | { type: "achat"; compte: string; date: string; montant: number; reference: string | null; libelle: string | null; nature: string }
  | { type: "statut"; compte: string; statut: "suivi" | "exclu"; motif: string }
  | { type: "contact"; compte: string; le: string; canal: string; par: string | null; note: string | null };

export default function FicheCompte({ fiche, onAgir, source = "exemple" }: { fiche: Fiche; onAgir: (g: Geste) => Promise<string>; source?: Source }) {
  const { compte, signal } = fiche;
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tacheOuverte, setTacheOuverte] = useState<string | null>(null);
  const [compteRendu, setCompteRendu] = useState("");
  const [ajout, setAjout] = useState(false);
  const [a, setA] = useState({ date: "", montant: "", reference: "", libelle: "", nature: "facture" });
  const [suivi, setSuivi] = useState<null | "statut" | "contact">(null);
  const [motif, setMotif] = useState("");
  const [k, setK] = useState({ le: "", canal: "appel", par: "", note: "" });

  const agir = async (g: Geste) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      setFait(await onAgir(g));
      setTacheOuverte(null);
      setCompteRendu("");
      setAjout(false);
      setSuivi(null);
      setMotif("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  const enCours = fiche.reprises.find((r) => ["a_valider", "appel", "envoyee", "relance_a_valider", "relancee"].includes(r.statut));
  const n = signal ? NIVEAUX[signal.niveau] : null;
  const montantSaisi = Number(a.montant.replace(/\s/g, "").replace(",", "."));
  const ajoutPret = /^\d{4}-\d{2}-\d{2}$/.test(a.date) && a.montant.trim() !== "" && Number.isFinite(montantSaisi);

  return (
    <div className="esp-carte esp-dossier">
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">{compte.nom}</h2>
          <span className="esp-kpi-sous">
            <span className="esp-mono">{compte.ref}</span>
            {compte.ville ? ` · ${compte.ville}` : ""}
            {compte.commercial ? ` · suivi par ${compte.commercial}` : ""}
          </span>
        </div>
        <span className="esp-item-haut">
          {n ? <Pastille teinte={n.teinte}>{n.libelle}</Pastille> : null}
          {compte.statut !== "suivi" ? <Pastille teinte="gris" contour>{STATUTS_COMPTE[compte.statut]}</Pastille> : null}
          {signal?.avant_cloture ? <Pastille teinte="rouge" contour>Avant la clôture</Pastille> : null}
        </span>
      </div>

      <div className="esp-carte-corps">
      {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
      {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {signal && signal.raisons.length ? (
        <>
          <div className="esp-section-titre">
            Pourquoi il est signalé — score {signal.score} sur 100, la somme des points ci-dessous
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px", display: "grid", gap: 8 }}>
            {signal.raisons.map((r) => (
              <li key={r.code} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span className="esp-mono" style={{ minWidth: 44, textAlign: "right" }}>{r.points ? `+${r.points}` : "—"}</span>
                <span>{r.phrase}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <dl className="esp-def esp-def--trois">
        <Def etiquette="Rythme habituel">{signal?.rythme_jours ? `un achat tous les ${nombreFr(Math.round(signal.rythme_jours))} jours` : "pas assez d'achats"}</Def>
        <Def etiquette="Dernier achat">{signal?.dernier_achat ? `${dateCourte(signal.dernier_achat)} (il y a ${signal.jours_silence} j)` : "—"}</Def>
        <Def etiquette="Achat attendu">{signal?.attendu_le ? dateCourte(signal.attendu_le) : "—"}</Def>
        <Def etiquette="Panier moyen">{montant(signal?.panier_moyen)}</Def>
        <Def etiquette="Douze derniers mois">{montant(signal?.ca_12m)}{signal?.ca_12m_precedent ? <span className="esp-kpi-sous"> (avant : {montant(signal.ca_12m_precedent)})</span> : null}</Def>
        <Def etiquette="Priorité" fort>{signal?.priorite ? montant(signal.priorite) : "—"}</Def>
      </dl>

      <div style={{ margin: "16px 0" }}>
        <Courbe mois={fiche.mois} />
      </div>

      <div className="esp-section-titre">Reprise de contact</div>
      {enCours ? (
        <p>
          <Pastille teinte={STATUTS_REPRISE[enCours.statut].teinte}>{STATUTS_REPRISE[enCours.statut].libelle}</Pastille>{" "}
          {enCours.motif ? <span className="esp-kpi-sous">{enCours.motif}</span> : null}
          {enCours.statut === "a_valider" || enCours.statut === "relance_a_valider" ? (
            <> <Link className="esp-lien-bouton" href="/espace/validations">Lire et valider le message</Link></>
          ) : null}
        </p>
      ) : compte.statut === "suivi" ? (
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi} onClick={() => agir({ type: "reprise", compte: compte.id })}>
            {envoi ? <Loader variant="spin" /> : <Send width={14} height={14} aria-hidden="true" />} Préparer une reprise
          </button>
          <span className="esp-kpi-sous">Le message part en validation ; une tâche d&apos;appel est posée pour {compte.commercial ?? "le commercial"}.</span>
        </div>
      ) : (
        <p className="esp-kpi-sous">{compte.statut_motif ?? STATUTS_COMPTE[compte.statut]} : aucune reprise.</p>
      )}
      {fiche.reprises.filter((r) => r !== enCours).length ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 4 }}>
          {fiche.reprises.filter((r) => r !== enCours).map((r) => (
            <li key={r.id} className="esp-kpi-sous">
              {dateCourte(r.cree_le)} — {STATUTS_REPRISE[r.statut].libelle}{r.issue ? ` : ${ISSUES[r.issue] ?? r.issue}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="esp-actions" style={{ flexWrap: "wrap" }}>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setSuivi(suivi === "statut" ? null : "statut"); setMotif(""); }}>
          {compte.statut === "suivi" ? "Reprendre la main (suivi en direct)" : "Remettre dans le cycle"}
        </button>
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setSuivi(suivi === "contact" ? null : "contact")}>Noter un contact</button>
        {compte.dernier_contact ? <span className="esp-kpi-sous">Dernier contact noté : {dateCourte(compte.dernier_contact)}</span> : null}
      </div>
      {suivi === "statut" ? (
        <div className="esp-form" style={{ margin: "8px 0 12px" }}>
          <label className="rv-libelle">Pourquoi <span className="esp-obligatoire">(obligatoire)</span>
            <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)}
              placeholder={compte.statut === "suivi" ? "Sophie le suit en direct : rendez-vous prévu." : "Le client a redemandé nos offres par écrit."} />
          </label>
          {compte.statut === "arrete" ? <span className="esp-kpi-sous">Ce client a demandé l&apos;arrêt : seul un gérant ou un administrateur le remet dans le circuit.</span> : null}
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !motif.trim()}
              onClick={() => agir({ type: "statut", compte: compte.id, statut: compte.statut === "suivi" ? "exclu" : "suivi", motif: motif.trim() })}>
              {compte.statut === "suivi" ? "Reprendre la main" : "Remettre dans le cycle"}
            </button>
          </div>
        </div>
      ) : null}
      {suivi === "contact" ? (
        <div className="esp-form" style={{ margin: "8px 0 12px" }}>
          <div className="esp-form-ligne">
            <label className="rv-libelle">Le <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" type="date" value={k.le} onChange={(e) => setK({ ...k, le: e.target.value })} />
            </label>
            <label className="rv-libelle">Comment
              <select className="rv-champ" value={k.canal} onChange={(e) => setK({ ...k, canal: e.target.value })}>
                <option value="appel">Appel</option><option value="visite">Visite</option><option value="courriel">Courriel</option>
                <option value="salon">Salon</option><option value="autre">Autre</option>
              </select>
            </label>
          </div>
          <label className="rv-libelle">Par
            <input className="rv-champ" value={k.par} onChange={(e) => setK({ ...k, par: e.target.value })} placeholder="Sophie" />
          </label>
          <label className="rv-libelle">Note
            <input className="rv-champ" value={k.note} onChange={(e) => setK({ ...k, note: e.target.value })} placeholder="Passée en clientèle, devis en cours." />
          </label>
          <span className="esp-kpi-sous">Un compte contacté par un commercial est écarté de la vague en cours.</span>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !/^\d{4}-\d{2}-\d{2}$/.test(k.le)}
              onClick={() => agir({ type: "contact", compte: compte.id, le: k.le, canal: k.canal, par: k.par.trim() || null, note: k.note.trim() || null })}>
              Noter le contact
            </button>
          </div>
        </div>
      ) : null}

      <div className="esp-section-titre">En attente de retrait</div>
      <AffairesCompte key={`affaires-${compte.id}`} compte={compte.id} source={source} />

      {source === "reelle" ? (
        <>
          <div className="esp-section-titre">Parc installé et contrats</div>
          <ParcCompte key={compte.id} compte={compte.id} source={source} />
        </>
      ) : null}

      <div className="esp-section-titre">Tâches</div>
      {fiche.taches.length === 0 ? <p className="esp-kpi-sous">Aucune tâche sur ce compte.</p> : null}
      {fiche.taches.map((t: Tache) => (
        <div key={t.id} style={BLOC}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px" }}>
            <PhoneCall width={14} height={14} aria-hidden="true" />
            <strong>{t.titre}</strong>
            <span className="esp-kpi-sous">{t.statut === "a_faire" ? `avant le ${dateCourte(t.echeance)}` : `${t.statut === "faite" ? "faite" : "abandonnée"} le ${dateCourte(t.faite_le)}`}{t.commercial ? ` · ${t.commercial}` : ""}</span>
          </div>
          {t.detail ? <div style={{ whiteSpace: "pre-line", marginTop: 6, fontSize: 14 }}>{t.detail}</div> : null}
          {t.compte_rendu ? <div className="esp-kpi-sous">Compte rendu : {t.compte_rendu}</div> : null}
          {t.statut === "a_faire" ? (
            tacheOuverte === t.id ? (
              <div className="esp-form" style={{ marginTop: 8 }}>
                <label className="rv-libelle">Compte rendu
                  <textarea className="rv-champ" rows={3} value={compteRendu} onChange={(e) => setCompteRendu(e.target.value)} placeholder="Joint : rappelle la semaine prochaine pour une commande." />
                </label>
                <div className="esp-actions">
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi} onClick={() => agir({ type: "tache", tache: t.id, statut: "faite", compteRendu: compteRendu.trim() || null })}>
                    {t.type === "appel" ? "Appel passé" : "Réponse faite"}
                  </button>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi || !compteRendu.trim()} onClick={() => agir({ type: "tache", tache: t.id, statut: "abandonnee", compteRendu: compteRendu.trim() })}>
                    Abandonner (dites pourquoi)
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <button type="button" className="esp-lien-bouton" onClick={() => { setTacheOuverte(t.id); setCompteRendu(""); }}>Noter le résultat</button>
              </div>
            )
          ) : null}
        </div>
      ))}

      <div className="esp-section-titre" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span>Pièces — {fiche.nb_achats} au total</span>
        <button type="button" className="esp-lien-bouton" style={{ display: "inline-flex", alignItems: "center", gap: 4 }} onClick={() => setAjout(!ajout)}><Plus width={13} height={13} aria-hidden="true" /> Ajouter une pièce</button>
      </div>
      {ajout ? (
        <div className="esp-form" style={{ marginBottom: 12 }}>
          <div className="esp-form-ligne">
            <label className="rv-libelle">Date <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
            </label>
            <label className="rv-libelle">Montant HT <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" inputMode="decimal" value={a.montant} onChange={(e) => setA({ ...a, montant: e.target.value })} placeholder="1 234,50" />
            </label>
          </div>
          <div className="esp-form-ligne">
            <label className="rv-libelle">N° de pièce
              <input className="rv-champ" value={a.reference} onChange={(e) => setA({ ...a, reference: e.target.value })} placeholder="F-2026-0412" />
            </label>
            <label className="rv-libelle">Nature
              <select className="rv-champ" value={a.nature} onChange={(e) => setA({ ...a, nature: e.target.value })}>
                <option value="facture">Facture</option>
                <option value="commande">Commande</option>
                <option value="avoir">Avoir (rangé en négatif)</option>
              </select>
            </label>
          </div>
          <label className="rv-libelle">Libellé
            <input className="rv-champ" value={a.libelle} onChange={(e) => setA({ ...a, libelle: e.target.value })} placeholder="Entretien annuel" />
          </label>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!ajoutPret || envoi}
              onClick={() => agir({ type: "achat", compte: compte.id, date: a.date, montant: montantSaisi, reference: a.reference.trim() || null, libelle: a.libelle.trim() || null, nature: a.nature })}>
              Ajouter la pièce
            </button>
          </div>
        </div>
      ) : null}
      {fiche.achats.length === 0 ? (
        <Vide titre="Aucune pièce">Importez l&apos;export de votre logiciel de ventes, ou ajoutez une pièce à la main.</Vide>
      ) : (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Pièces du compte (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>Date</th><th>Pièce</th><th>Libellé</th><th className="esp-num">Montant HT</th></tr></thead>
            <tbody>
              {fiche.achats.map((x) => (
                <tr key={x.id} style={x.annule_le ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
                  <td>{dateCourte(x.date_achat)}</td>
                  <td className="esp-mono">{x.reference ?? "—"}{x.nature !== "facture" ? <span className="esp-kpi-sous"> · {x.nature}</span> : null}</td>
                  <td>{x.libelle ?? "—"}{x.source === "saisie" ? <span className="esp-kpi-sous"> · saisie</span> : null}</td>
                  <td className="esp-num">{montant(x.montant_ht)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
