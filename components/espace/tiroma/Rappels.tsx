"use client";

/* La section « Rappels aux patients » (06/10/2026, session B3, b3_14) : le
   moyen de joindre chaque patient et son accord (courriel ou SMS ; rappels de
   rendez-vous, relances de plan et de devis), les derniers rappels préparés
   et leur état, et les réponses OUI / NON reçues. Un rappel porte une donnée
   de santé : tant qu'aucun prestataire agréé HDS n'est branché, le socle le
   retient (verrou santé) ; en essai, il ne part qu'à l'adresse d'essai. */

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte, relatif } from "../format";
import { REPONSES_RAPPEL, STATUTS_ENVOI, TYPES_RAPPEL, VERROUS_ENVOI, jourEtHeure } from "./libelles";
import type { CanalPatient, ContactPatient, PatientCourt, Rappels as RappelsT } from "./types";

export type NouveauContact = { patient: PatientCourt; canal: CanalPatient; adresse: string; rappels: boolean; relances: boolean; source: ContactPatient["source"]; preuve: string | null };

const CANAUX: Record<CanalPatient, string> = { email: "Courriel", sms: "SMS" };
const SOURCES: Record<ContactPatient["source"], string> = { oral: "Accord oral, au cabinet", ecrit: "Accord écrit (fiche signée)", formulaire: "Formulaire" };

type Props = {
  rappels: RappelsT | null;
  peutEcrire: boolean;
  chercher: (texte: string) => Promise<PatientCourt[]>;
  noter: (c: NouveauContact) => Promise<void>;
  retirer: (c: ContactPatient) => Promise<void>;
};

export default function Rappels({ rappels, peutEcrire, chercher, noter, retirer }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [trouves, setTrouves] = useState<PatientCourt[]>([]);
  const [patient, setPatient] = useState<PatientCourt | null>(null);
  const [canal, setCanal] = useState<CanalPatient>("sms");
  const [adresse, setAdresse] = useState("");
  const [lesRappels, setLesRappels] = useState(true);
  const [relances, setRelances] = useState(false);
  const [source, setSource] = useState<ContactPatient["source"]>("oral");
  const [preuve, setPreuve] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    const court = !ouvert || texte.trim().length < 2;
    const t = window.setTimeout(async () => {
      if (court) {
        if (actif) setTrouves([]);
        return;
      }
      try {
        const r = await chercher(texte);
        if (actif) setTrouves(r);
      } catch {
        if (actif) setTrouves([]);
      }
    }, 250);
    return () => { actif = false; window.clearTimeout(t); };
  }, [ouvert, texte, chercher]);

  if (!rappels) return null;

  const ouvrir = () => {
    setOuvert(true); setTexte(""); setPatient(null); setCanal("sms"); setAdresse(""); setLesRappels(true); setRelances(false);
    setSource("oral"); setPreuve(""); setErreur(null);
  };
  const confirmer = async () => {
    if (!patient) return;
    setOccupe(true);
    setErreur(null);
    try {
      await noter({ patient, canal, adresse: adresse.trim(), rappels: lesRappels, relances, source, preuve: preuve.trim() || null });
      setOuvert(false);
      setFait(`${[patient.prenom, patient.nom].filter(Boolean).join(" ")} : ${CANAUX[canal].toLowerCase()} noté, avec son accord.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  const mode = rappels.reglage?.mode ?? null;

  return (
    <section id="tiroma-rappels" className="esp-carte" aria-label="Rappels aux patients">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Rappels aux patients</h2>
        <span className="esp-item-haut">
          {mode === "essai" ? <Pastille teinte="ambre">Essai</Pastille> : mode === "reel" ? <Pastille teinte="vert">En service</Pastille> : <Pastille teinte="gris">{mode === "coupe" ? "Coupés" : "Non réglés"}</Pastille>}
          {peutEcrire ? <button type="button" className="esp-lien-bouton" onClick={ouvrir}>Ajouter un moyen de contact</button> : null}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
        <p className="esp-fil-meta">
          Deux jours avant chaque rendez-vous, Tiroma rappelle le patient qui l&apos;accepte. Il relance aussi un plan signé resté sans rendez-vous et un devis sans réponse. Un rappel dit qu&apos;on a rendez-vous chez le dentiste : c&apos;est une donnée de santé. Il ne part que par un prestataire agréé HDS ; d&apos;ici là, il est préparé puis retenu.
          {mode === "essai" ? " En essai, il ne part qu'à l'adresse d'essai, jamais au patient." : ""}
        </p>

        <div className="esp-grille">
          <div>
            <h3 className="esp-groupe-titre">Moyens de contact</h3>
            {!rappels.contacts.length ? (
              <Vide titre="Aucun moyen de contact">Notez le courriel ou le portable d&apos;un patient, avec son accord, pour qu&apos;il reçoive ses rappels.</Vide>
            ) : (
              <ul className="esp-liste" aria-label="Moyens de contact">
                {rappels.contacts.map((c) => (
                  <li key={c.id} className="esp-item" style={{ cursor: "default" }}>
                    <span className="esp-item-haut">
                      <Pastille teinte="noir">{CANAUX[c.canal]}</Pastille>
                      {c.rappels ? <Pastille teinte="bleu" contour>Rappels</Pastille> : null}
                      {c.relances ? <Pastille teinte="bleu" contour>Relances</Pastille> : null}
                    </span>
                    <span className="esp-item-titre">{c.patient_nom}</span>
                    <span className="esp-item-bas">
                      <span style={{ overflowWrap: "anywhere" }}>{c.adresse}</span>
                      <span>{SOURCES[c.source]}, le {dateCourte(c.cree_le)}</span>
                      {peutEcrire ? <button type="button" className="esp-lien-bouton" onClick={() => void retirer(c)}>Retirer</button> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <div>
              <h3 className="esp-groupe-titre">Réponses reçues</h3>
              {!rappels.reponses.length ? <p className="esp-fil-meta">Aucune réponse ces quinze derniers jours.</p> : (
                <ul className="esp-liste" aria-label="Réponses aux rappels">
                  {rappels.reponses.map((r) => (
                    <li key={r.id} className="esp-item" style={{ cursor: "default" }}>
                      <span className="esp-item-haut"><Pastille teinte={REPONSES_RAPPEL[r.reponse].teinte}>{REPONSES_RAPPEL[r.reponse].libelle}</Pastille></span>
                      <span className="esp-item-titre">{r.patient_nom}{r.debut ? ` — rendez-vous ${jourEtHeure(r.debut)}` : ""}</span>
                      <span className="esp-item-bas">
                        <span>Reçue {relatif(r.recue_le)}</span>
                        {r.reponse === "annule" ? <span>Libérez le créneau dans le logiciel du cabinet.</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="esp-groupe-titre">Derniers rappels</h3>
              {!rappels.envois.length ? <p className="esp-fil-meta">Aucun rappel préparé pour l&apos;instant.</p> : (
                <ul className="esp-liste" aria-label="Derniers rappels">
                  {rappels.envois.slice(0, 8).map((e) => (
                    <li key={e.id} className="esp-item" style={{ cursor: "default" }}>
                      <span className="esp-item-haut">
                        <Pastille teinte="gris" contour>{TYPES_RAPPEL[e.type] ?? e.type}</Pastille>
                        <Pastille teinte={e.statut === "envoye" ? "vert" : e.statut === "bloque" || e.statut === "refuse" || e.statut === "echec" ? "rouge" : "ambre"}>
                          {STATUTS_ENVOI[e.statut] ?? e.statut}
                        </Pastille>
                      </span>
                      <span className="esp-item-titre">{e.patient_nom} · {CANAUX[e.canal] ?? e.canal}</span>
                      <span className="esp-item-bas">
                        <span>Préparé {relatif(e.cree_le)}{e.mode === "essai" ? " (essai)" : ""}</span>
                        {e.verrou ? <span>{VERROUS_ENVOI[e.verrou] ?? e.verrou}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><BellRing width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un moyen de contact</DialogTitle>
            <DialogDescription>Le patient choisit comment il veut être prévenu. Son accord est noté au registre des consentements ; il peut le retirer à tout moment.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Patient <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={patient ? [patient.prenom, patient.nom].filter(Boolean).join(" ") : texte} onChange={(e) => { setPatient(null); setTexte(e.target.value); }} placeholder="Les premières lettres du nom" autoComplete="off" />
              </label>
              {!patient && trouves.length ? (
                <ul className="esp-liste" aria-label="Patients trouvés pour le contact" style={{ maxHeight: 180, overflowY: "auto" }}>
                  {trouves.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="esp-item" disabled={p.ne_pas_contacter} onClick={() => setPatient(p)}>
                        <span className="esp-item-titre">{[p.prenom, p.nom].filter(Boolean).join(" ")}{p.ne_pas_contacter ? " — ne pas contacter" : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="esp-form-ligne">
                <label className="rv-libelle">Canal
                  <select className="rv-champ" value={canal} onChange={(e) => setCanal(e.target.value as CanalPatient)}>
                    <option value="sms">SMS</option>
                    <option value="email">Courriel</option>
                  </select>
                </label>
                <label className="rv-libelle">{canal === "sms" ? "Portable" : "Courriel"}
                  <input className="rv-champ" value={adresse} onChange={(e) => setAdresse(e.target.value)} inputMode={canal === "sms" ? "tel" : "email"} placeholder={canal === "sms" ? "+590 690 12 34 56" : "prenom.nom@exemple.fr"} autoComplete="off" />
                </label>
              </div>
              <label className="esp-item-haut" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={lesRappels} onChange={(e) => setLesRappels(e.target.checked)} />
                <span>Rappel deux jours avant chaque rendez-vous</span>
              </label>
              <label className="esp-item-haut" style={{ gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={relances} onChange={(e) => setRelances(e.target.checked)} />
                <span>Relance d&apos;un plan ou d&apos;un devis en attente</span>
              </label>
              <label className="rv-libelle">Son accord
                <select className="rv-champ" value={source} onChange={(e) => setSource(e.target.value as ContactPatient["source"])}>
                  {(Object.keys(SOURCES) as ContactPatient["source"][]).map((k) => <option key={k} value={k}>{SOURCES[k]}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Preuve (facultatif)
                <input className="rv-champ" value={preuve} onChange={(e) => setPreuve(e.target.value)} maxLength={300} placeholder="Accord donné à l'accueil le 06/10." />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !patient || adresse.trim().length < 3 || (!lesRappels && !relances)} onClick={confirmer}>
              {occupe ? <Loader variant="spin" /> : null} Noter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
