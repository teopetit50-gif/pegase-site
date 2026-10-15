"use client";

/* La section « Plans sans rendez-vous » (05/10/2026, session B3) : les devis
   signés dont une séance reste à faire et qu'aucun rendez-vous à venir ne
   sert, du plus ancien au plus récent. L'accord de la mutuelle reçu sans
   rendez-vous, le devis qui expire et la famille à planifier dans la foulée
   sont dits sur la ligne. */

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { DernierAppelLigne } from "./Appels";
import { FAMILLES, MUTUELLES } from "./libelles";
import type { CibleAppel, DernierAppel, PlanSansRdv } from "./types";

export type Mutuelle = { plan: PlanSansRdv; statut: NonNullable<PlanSansRdv["mutuelle_statut"]>; le: string | null; motif: string | null };

export default function Plans({ plans, noterMutuelle, derniers, appeler }: { plans: PlanSansRdv[]; noterMutuelle?: (m: Mutuelle) => Promise<void>; derniers?: Record<string, DernierAppel>; appeler?: (c: CibleAppel) => void }) {
  const [choix, setChoix] = useState<PlanSansRdv | null>(null);
  const [statut, setStatut] = useState<Mutuelle["statut"]>("accord");
  const [le, setLe] = useState("");
  const [motif, setMotif] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ouvrir = (p: PlanSansRdv) => {
    setChoix(p);
    setStatut(p.mutuelle_statut === "demandee" ? "accord" : p.mutuelle_statut ?? "demandee");
    setLe(new Date().toISOString().slice(0, 10));
    setMotif("");
    setErreur(null);
  };
  const confirmer = async () => {
    if (!choix || !noterMutuelle) return;
    setOccupe(true);
    setErreur(null);
    try {
      await noterMutuelle({ plan: choix, statut, le: le || null, motif: motif.trim() || null });
      setChoix(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <section id="tiroma-plans" className="esp-carte" aria-label="Plans sans rendez-vous">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Plans sans rendez-vous</h2>
        <span className="esp-kpi-sous">{plans.length ? `${plans.length} plan${plans.length > 1 ? "s" : ""} signé${plans.length > 1 ? "s" : ""}, du plus ancien au plus récent` : "Tous les plans signés ont leur rendez-vous"}</span>
      </div>
      <div className="esp-carte-corps">
        {!plans.length ? (
          <Vide titre="Aucun plan en attente">Un devis signé dont la séance suivante n&apos;a pas de rendez-vous remonte ici chaque matin.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Plans signés sans rendez-vous">
            {plans.map((p) => (
              <li key={p.plan_id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={p.jours_depuis >= 42 ? "rouge" : p.jours_depuis >= 21 ? "ambre" : "bleu"}>{p.jours_depuis} jour{p.jours_depuis > 1 ? "s" : ""}</Pastille>
                  {p.mutuelle_accord_sans_rdv ? <Pastille teinte="vert">Accord de mutuelle reçu</Pastille> : p.mutuelle_statut && p.mutuelle_statut !== "non_requise" ? <Pastille teinte="gris" contour>{MUTUELLES[p.mutuelle_statut]}</Pastille> : null}
                  {p.jours_avant_expiration !== null && p.jours_avant_expiration <= 30 ? <Pastille teinte="ambre">Expire dans {p.jours_avant_expiration} j</Pastille> : null}
                  {p.a_verifier ? <Pastille teinte="ambre" contour title="Plusieurs plans pourraient servir le même rendez-vous : à vérifier">À vérifier</Pastille> : null}
                  {p.ne_pas_contacter ? <Pastille teinte="rouge" contour>Ne pas contacter</Pastille> : null}
                </span>
                <span className="esp-item-montant">{montant(p.montant)}{p.reste_a_charge !== null ? <span className="esp-kpi-sous" style={{ display: "block", fontWeight: 400 }}>reste {montant(p.reste_a_charge)}</span> : null}</span>
                <span className="esp-item-titre">
                  {p.patient_nom} — {p.prochaine?.libelle ?? (p.prochaine?.famille ? FAMILLES[p.prochaine.famille] : "séance à poser")}
                  {p.prochaine?.seance ? ` (séance ${p.prochaine.seance})` : ""}
                </span>
                <span className="esp-item-bas">
                  <span>Devis {p.devis_numero ?? "—"} signé le {dateCourte(p.signe_le ?? p.depuis)}</span>
                  {p.praticien_nom ? <span>{p.praticien_nom}</span> : null}
                  <span>{p.lignes_faites} faite{p.lignes_faites > 1 ? "s" : ""} · {p.lignes_a_faire} à faire{p.prochaine?.duree_min ? ` · ${p.prochaine.duree_min} min` : ""}</span>
                  {p.proches_a_planifier ? <span>Famille : {p.proches_a_planifier} proche{p.proches_a_planifier > 1 ? "s" : ""} à planifier dans la foulée</span> : null}
                  {noterMutuelle ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir(p)}>Noter la mutuelle</button> : null}
                  {appeler && !p.ne_pas_contacter ? <button type="button" className="esp-lien-bouton" onClick={() => appeler({ patient_id: p.patient_id, patient_nom: p.patient_nom, motif: "plan", plan_id: p.plan_id, evenement_id: null })}>Noter l&apos;appel</button> : null}
                </span>
                {derniers?.[p.patient_id] ? <span style={{ gridColumn: "1 / -1" }}><DernierAppelLigne d={derniers[p.patient_id]} /></span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Dialog open={!!choix} onOpenChange={(o) => !o && setChoix(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>La mutuelle, devis {choix?.devis_numero ?? "—"}</DialogTitle>
            <DialogDescription>Le logiciel du cabinet n&apos;exporte pas la mutuelle : notez ici la demande et la réponse. Un accord reçu sans rendez-vous remonte chaque matin.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Où en est la mutuelle
                <select className="rv-champ" value={statut} onChange={(e) => setStatut(e.target.value as Mutuelle["statut"])}>
                  {(Object.keys(MUTUELLES) as Mutuelle["statut"][]).map((k) => <option key={k} value={k}>{MUTUELLES[k]}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Date
                <input className="rv-champ" type="date" value={le} onChange={(e) => setLe(e.target.value)} />
              </label>
              <label className="rv-libelle">Note (facultatif)
                <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={200} placeholder="Accord reçu par courrier." />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Noter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
