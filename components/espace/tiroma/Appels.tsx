"use client";

/* La section « Appels » (06/10/2026, session B3, b3_12) : ce que l'équipe a
   fait des propositions de Tiroma. Les patients à reprendre aujourd'hui
   (message laissé, pas de réponse, rappel du jour), puis le bilan des trente
   derniers jours : un rendez-vous noté « pris » n'est compté « confirmé » que
   lorsque le relevé suivant le trouve dans l'agenda du logiciel. L'issue d'un
   appel est un code, jamais un texte : rien de médical ne s'écrit ici. */

import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte, montant, relatif } from "../format";
import { ISSUES_APPEL, MOTIFS_APPEL } from "./libelles";
import type { CibleAppel, DernierAppel, IssueAppel, RegistreAppels } from "./types";

export type NoteAppel = { cible: CibleAppel; issue: IssueAppel; rappeler_le: string | null };

/** « Message laissé hier par Élodie » : la ligne qu'on pose sous un patient déjà appelé. */
export function DernierAppelLigne({ d }: { d: DernierAppel | undefined }) {
  if (!d) return null;
  const i = ISSUES_APPEL[d.issue];
  return (
    <span className="esp-item-haut" style={{ gap: 6 }}>
      <Pastille teinte={i.teinte} contour>{i.libelle}</Pastille>
      <span className="esp-kpi-sous">
        {relatif(d.appele_le)}{d.par ? ` par ${d.par}` : ""}{d.issue === "rappeler" && d.rappeler_le ? ` · rappeler le ${dateCourte(d.rappeler_le)}` : ""}
      </span>
    </span>
  );
}

function enJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** Le dialogue « Noter l'appel », un pour tout l'écran. */
export function DialogueAppel({ cible, jour, fermer, noter }: { cible: CibleAppel | null; jour: string; fermer: () => void; noter: (n: NoteAppel) => Promise<void> }) {
  const [issue, setIssue] = useState<IssueAppel>("rdv_pris");
  const [rappel, setRappel] = useState(enJours(jour, 2));
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!cible) return;
    const t = window.setTimeout(() => { setIssue("rdv_pris"); setRappel(enJours(jour, 2)); setErreur(null); }, 0);
    return () => window.clearTimeout(t);
  }, [cible, jour]);
  const confirmer = async () => {
    if (!cible) return;
    setOccupe(true);
    setErreur(null);
    try {
      await noter({ cible, issue, rappeler_le: issue === "rappeler" ? rappel : null });
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <Dialog open={!!cible} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><PhoneCall width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Noter l&apos;appel — {cible?.patient_nom}</DialogTitle>
          <DialogDescription>
            {cible ? `Pour le ${MOTIFS_APPEL[cible.motif]}. ` : ""}Le rendez-vous se pose dans le logiciel du cabinet ; Tiroma le confirmera au prochain relevé.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <fieldset className="esp-form" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="rv-libelle" style={{ marginBottom: 6 }}>Ce qui s&apos;est passé</legend>
              {(Object.keys(ISSUES_APPEL) as IssueAppel[]).map((k) => (
                <label key={k} className="esp-item-haut" style={{ gap: 8, cursor: "pointer" }}>
                  <input type="radio" name="issue-appel" value={k} checked={issue === k} onChange={() => setIssue(k)} />
                  <span>{ISSUES_APPEL[k].libelle}</span>
                </label>
              ))}
            </fieldset>
            {issue === "rappeler" ? (
              <label className="rv-libelle">Rappeler le
                <input className="rv-champ" type="date" value={rappel} min={jour} max={enJours(jour, 180)} onChange={(e) => setRappel(e.target.value)} />
              </label>
            ) : null}
            {issue === "ne_plus_contacter" ? (
              <p className="esp-fil-meta">Notez-le aussi dans le logiciel du cabinet : c&apos;est lui qui fait foi, et Tiroma reprend sa liste à chaque relevé.</p>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={occupe || (issue === "rappeler" && !rappel)} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Noter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Appels({ registre, titulaire, appeler }: { registre: RegistreAppels | null; titulaire: boolean; appeler?: (c: CibleAppel) => void }) {
  if (!registre) return null;
  const b = registre.bilan;
  const dus = registre.a_reprendre.filter((s) => s.du);
  const plusTard = registre.a_reprendre.filter((s) => !s.du);
  return (
    <section id="tiroma-appels" className="esp-carte" aria-label="Appels">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Appels</h2>
        <span className="esp-kpi-sous">{dus.length ? `${dus.length} patient${dus.length > 1 ? "s" : ""} à reprendre aujourd'hui` : "Rien à reprendre aujourd'hui"}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <div className="esp-kpis" style={{ marginBottom: 0 }}>
          <div className="esp-kpi">
            <span className="esp-kpi-etiquette">Appels</span>
            <span className="esp-kpi-valeur">{b.appels}</span>
            <span className="esp-kpi-sous">{b.patients} patient{b.patients > 1 ? "s" : ""}, {b.jours} derniers jours</span>
          </div>
          <div className="esp-kpi" data-teinte={b.confirmes ? "vert" : undefined}>
            <span className="esp-kpi-etiquette">Rendez-vous repris</span>
            <span className="esp-kpi-valeur">{b.confirmes}</span>
            <span className="esp-kpi-sous">confirmés par le logiciel, sur {b.rdv_pris} noté{b.rdv_pris > 1 ? "s" : ""}</span>
          </div>
          <div className="esp-kpi" data-teinte={b.valeur_plans ? "vert" : undefined}>
            <span className="esp-kpi-etiquette">Plans remis à l&apos;agenda</span>
            <span className="esp-kpi-valeur">{titulaire ? montant(b.valeur_plans) : "—"}</span>
            <span className="esp-kpi-sous">{titulaire ? "montant des devis relancés" : "réservé au titulaire"}</span>
          </div>
          <div className="esp-kpi">
            <span className="esp-kpi-etiquette">Fauteuil repris</span>
            <span className="esp-kpi-valeur">{Math.round(b.minutes_creneaux / 6) / 10} h</span>
            <span className="esp-kpi-sous">sur les créneaux libérés</span>
          </div>
        </div>
        {b.a_reporter_logiciel ? (
          <Avis teinte="ambre"><strong>{b.a_reporter_logiciel} patient{b.a_reporter_logiciel > 1 ? "s ont" : " a"} demandé à ne plus être contacté{b.a_reporter_logiciel > 1 ? "s" : ""}.</strong> Reportez-le dans le logiciel du cabinet : c&apos;est lui qui fait foi.</Avis>
        ) : null}
        {!registre.a_reprendre.length ? (
          <Vide titre="Aucun appel en suspens">Notez chaque appel depuis un créneau à sauver ou un plan sans rendez-vous : un message laissé ou un « à rappeler » revient ici le jour dit.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Appels à reprendre">
            {[...dus, ...plusTard].map((s) => (
              <li key={`${s.patient_id}-${s.motif}-${s.plan_id ?? ""}`} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <Pastille teinte={ISSUES_APPEL[s.issue].teinte}>{ISSUES_APPEL[s.issue].libelle}</Pastille>
                  {s.du ? <Pastille teinte="noir">Aujourd&apos;hui</Pastille> : s.rappeler_le ? <Pastille teinte="gris" contour>le {dateCourte(s.rappeler_le)}</Pastille> : null}
                  {s.tentatives > 1 ? <Pastille teinte="gris" contour>{s.tentatives} appels</Pastille> : null}
                </span>
                <span className="esp-item-titre">{s.patient_nom} — {MOTIFS_APPEL[s.motif]}</span>
                <span className="esp-item-bas">
                  <span>Dernier appel {relatif(s.appele_le)}{s.par ? ` par ${s.par}` : ""}</span>
                  {appeler ? <button type="button" className="esp-lien-bouton" onClick={() => appeler({ patient_id: s.patient_id, patient_nom: s.patient_nom, motif: s.motif, plan_id: s.plan_id, evenement_id: null })}>Noter l&apos;appel</button> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
