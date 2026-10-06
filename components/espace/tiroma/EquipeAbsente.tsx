"use client";

/* La section « Équipe absente » (06/10/2026, session B3, b3_18) : pour le
   titulaire et l'assistante, les absences notées de l'équipe sur les sept
   prochains jours et, pour chacune, les soins prévus sur le fauteuil du
   membre absent qui demandent une assistante, avec les fauteuils vers
   lesquels les basculer : équipés pour ce soin, libres sur ce créneau, avec
   leur assistante présente. Le basculement se fait dans le logiciel du
   cabinet ; Tiroma le voit au relevé suivant. Le motif est un code (congé,
   maladie, formation, autre) : aucune raison médicale ne s'écrit ici. */

import { useEffect, useState } from "react";
import { CalendarX } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte } from "../format";
import { jourEtHeure } from "./libelles";
import type { AbsenceEquipe, Membre, MotifAbsenceMembre } from "./types";

export const MOTIFS_ABSENCE: Record<MotifAbsenceMembre, string> = {
  conge: "Congé",
  maladie: "Arrêt",
  formation: "Formation",
  autre: "Autre",
};

export type NouvelleAbsence = { membre_id: string; debut: string; fin: string; motif: MotifAbsenceMembre };

function enJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** La veille de la fin : une absence « jusqu'au 9 » finit le 10 à 0 h. */
function dernierJour(fin: string): string {
  return new Date(new Date(fin).getTime() - 1).toISOString();
}

function DialogueAbsence({ ouvert, membres, jour, fermer, noter }: { ouvert: boolean; membres: Membre[]; jour: string; fermer: () => void; noter: (a: NouvelleAbsence) => Promise<void> }) {
  const [membre, setMembre] = useState("");
  const [du, setDu] = useState(jour);
  const [au, setAu] = useState(jour);
  const [motif, setMotif] = useState<MotifAbsenceMembre>("conge");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!ouvert) return;
    const t = window.setTimeout(() => { setMembre(membres[0]?.id ?? ""); setDu(jour); setAu(jour); setMotif("conge"); setErreur(null); }, 0);
    return () => window.clearTimeout(t);
  }, [ouvert, jour, membres]);
  const confirmer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      await noter({ membre_id: membre, debut: new Date(`${du}T00:00:00`).toISOString(), fin: new Date(`${enJours(au, 1)}T00:00:00`).toISOString(), motif });
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  const valide = !!membre && !!du && !!au && au >= du;
  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><CalendarX width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Noter une absence</DialogTitle>
          <DialogDescription>Tiroma liste alors les soins prévus sur son fauteuil qui demandent une assistante, et où les basculer.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Qui
              <select className="rv-champ" value={membre} onChange={(e) => setMembre(e.target.value)}>
                {membres.map((m) => <option key={m.id} value={m.id}>{m.prenom}</option>)}
              </select>
            </label>
            <label className="rv-libelle">Du
              <input className="rv-champ" type="date" value={du} min={enJours(jour, -7)} max={enJours(jour, 365)} onChange={(e) => setDu(e.target.value)} />
            </label>
            <label className="rv-libelle">Au (inclus)
              <input className="rv-champ" type="date" value={au} min={du} max={enJours(du || jour, 365)} onChange={(e) => setAu(e.target.value)} />
            </label>
            <fieldset className="esp-form" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="rv-libelle" style={{ marginBottom: 6 }}>Motif</legend>
              {(Object.keys(MOTIFS_ABSENCE) as MotifAbsenceMembre[]).map((k) => (
                <label key={k} className="esp-item-haut" style={{ gap: 8, cursor: "pointer" }}>
                  <input type="radio" name="motif-absence" value={k} checked={motif === k} onChange={() => setMotif(k)} />
                  <span>{MOTIFS_ABSENCE[k]}</span>
                </label>
              ))}
            </fieldset>
            <p className="esp-fil-meta">Aucune raison médicale n&apos;est demandée.</p>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={occupe || !valide} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Noter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EquipeAbsente({ equipe, membres, jour, noter, clore }: {
  equipe: AbsenceEquipe[] | null;
  membres: Membre[];
  jour: string;
  noter: (a: NouvelleAbsence) => Promise<void>;
  clore: (a: AbsenceEquipe) => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!equipe) return null;
  const actifs = membres.filter((m) => m.actif);
  const aBasculer = equipe.reduce((n, a) => n + a.soins.length, 0);
  const fermer = async (a: AbsenceEquipe) => {
    setEnCours(a.absence_id);
    setErreur(null);
    try {
      await clore(a);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnCours(null);
    }
  };
  return (
    <section id="tiroma-equipe" className="esp-carte" aria-label="Équipe absente">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Équipe absente</h2>
        <span className="esp-item-haut">
          <span className="esp-kpi-sous">{equipe.length ? `${aBasculer} soin${aBasculer > 1 ? "s" : ""} à basculer sur sept jours` : "Personne d'absent sur sept jours"}</span>
          {actifs.length ? <button type="button" className="esp-lien-bouton" onClick={() => setOuvert(true)}>Noter une absence</button> : null}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        {!equipe.length ? (
          <Vide titre="Aucune absence notée">Notez l&apos;absence d&apos;une assistante : Tiroma liste les soins de son fauteuil qui demandent une assistante, et les fauteuils libres où les basculer.</Vide>
        ) : equipe.map((a) => (
          <div key={a.absence_id} style={{ display: "grid", gap: 8 }}>
            <div className="esp-item-haut" style={{ flexWrap: "wrap", gap: 8 }}>
              <Pastille teinte="ambre">{MOTIFS_ABSENCE[a.motif]}</Pastille>
              <strong>{a.membre}{a.fauteuil_nom ? ` — ${a.fauteuil_nom}` : ""}</strong>
              <span className="esp-kpi-sous">du {dateCourte(a.debut)} au {dateCourte(dernierJour(a.fin))}</span>
              <button type="button" className="esp-lien-bouton" disabled={enCours === a.absence_id} onClick={() => fermer(a)}>
                {enCours === a.absence_id ? <Loader variant="spin" /> : null} Clore l&apos;absence
              </button>
            </div>
            {!a.soins.length ? (
              <p className="esp-fil-meta">Aucun soin avec assistante prévu sur {a.fauteuil_nom ?? "son fauteuil"} pendant l&apos;absence.</p>
            ) : (
              <ul className="esp-liste" aria-label={`Soins à basculer — ${a.membre}`}>
                {a.soins.map((s) => (
                  <li key={s.rendez_vous_id} className="esp-item" style={{ cursor: "default" }}>
                    <span className="esp-item-titre">{s.patient_nom} — {jourEtHeure(s.debut)}</span>
                    <span className="esp-item-bas">
                      {s.soin ? <span>{s.soin}</span> : null}
                      {s.vers.length ? (
                        <span>Vers {s.vers.map((v) => `${v.fauteuil_nom} (avec ${v.assistante})`).join(" ou ")}</span>
                      ) : (
                        <span><Pastille teinte="rouge">Aucun fauteuil libre</Pastille> à reporter, ou à assister autrement</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        <p className="esp-fil-meta">Le basculement se fait dans le logiciel du cabinet ; Tiroma le voit au relevé suivant.</p>
      </div>
      <DialogueAbsence ouvert={ouvert} membres={actifs} jour={jour} fermer={() => setOuvert(false)} noter={noter} />
    </section>
  );
}
