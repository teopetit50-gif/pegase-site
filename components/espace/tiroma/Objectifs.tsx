"use client";

/* La section « Objectifs par fauteuil » (06/10/2026, session B3, b3_20) :
   pour le titulaire seul, l'occupation de chaque fauteuil semaine par semaine
   face à son objectif. Les quatre semaines passées sont en réalisé (honorés,
   un manqué n'occupe pas le fauteuil) ; la semaine en cours et la suivante
   sont en prévu. Le titulaire fixe ou retire l'objectif d'un fauteuil ici.
   Rien par personne : la charge se lit par fauteuil. */

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import type { ObjectifFauteuil, Objectifs as ObjectifsT } from "./types";

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 100)} %`;
}

function semaineCourte(lundi: string): string {
  const d = new Date(`${lundi}T12:00:00`);
  if (Number.isNaN(d.getTime())) return lundi;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d);
}

function DialogueObjectif({ fauteuil, fermer, fixer }: { fauteuil: ObjectifFauteuil | null; fermer: () => void; fixer: (f: ObjectifFauteuil, objectif: number | null) => Promise<void> }) {
  const [valeur, setValeur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!fauteuil) return;
    const t = window.setTimeout(() => { setValeur(fauteuil.objectif === null ? "" : String(Math.round(fauteuil.objectif * 100))); setErreur(null); }, 0);
    return () => window.clearTimeout(t);
  }, [fauteuil]);
  const n = valeur.trim() === "" ? null : Number(valeur);
  const valide = n === null || (Number.isFinite(n) && n >= 1 && n <= 100);
  const confirmer = async () => {
    if (!fauteuil || !valide) return;
    setOccupe(true);
    setErreur(null);
    try {
      await fixer(fauteuil, n === null ? null : Math.round(n) / 100);
      fermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <Dialog open={!!fauteuil} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Target width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Objectif — {fauteuil?.nom}</DialogTitle>
          <DialogDescription>La part des heures ouvertes du fauteuil occupée par des rendez-vous. Laissez vide pour ne pas fixer d&apos;objectif.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Objectif d&apos;occupation (%)
              <input className="rv-champ" type="number" inputMode="numeric" min={1} max={100} value={valeur} onChange={(e) => setValeur(e.target.value)} placeholder="80" />
            </label>
            {!valide ? <p className="esp-fil-meta">Un pourcentage de 1 à 100.</p> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" disabled={occupe || !valide} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Enregistrer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Objectifs({ objectifs, fixer }: { objectifs: ObjectifsT | null; fixer: (f: ObjectifFauteuil, objectif: number | null) => Promise<void> }) {
  const [cible, setCible] = useState<ObjectifFauteuil | null>(null);
  if (!objectifs || !objectifs.fauteuils.length) return null;
  const avec = objectifs.fauteuils.filter((f) => f.objectif !== null && f.comptees > 0);
  const tenus = avec.filter((f) => f.atteintes * 2 >= f.comptees).length;
  return (
    <section id="tiroma-objectifs" className="esp-carte" aria-label="Objectifs par fauteuil">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Objectifs par fauteuil</h2>
        <span className="esp-kpi-sous">{avec.length ? `${tenus} fauteuil${tenus > 1 ? "s" : ""} sur ${avec.length} à l'objectif au moins une semaine sur deux` : "Aucun objectif fixé"}</span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        <div className="esp-tableau-cadre" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Occupation par fauteuil et par semaine (tableau qui défile)">
          <table className="esp-tableau">
            <thead>
              <tr>
                <th>Fauteuil</th>
                <th>Objectif</th>
                {objectifs.semaines.map((s) => (
                  <th key={s.lundi}>{s.en_cours ? "Cette semaine" : s.nature === "prevue" ? "Semaine prochaine" : `Sem. du ${semaineCourte(s.lundi)}`}{s.nature === "prevue" ? " (prévu)" : ""}</th>
                ))}
                <th>Tenu</th>
                <th><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {objectifs.fauteuils.map((f) => (
                <tr key={f.fauteuil_id}>
                  <td>{f.nom}</td>
                  <td>{pct(f.objectif)}</td>
                  {f.semaines.map((s, i) => {
                    /* une semaine à venir sous l'objectif n'est pas en retard : son agenda se remplit encore */
                    const avenir = objectifs.semaines[i]?.nature === "prevue";
                    return (
                      <td key={s.lundi}>
                        {s.atteint === null || (avenir && !s.atteint) ? pct(s.taux) : <Pastille teinte={s.atteint ? "vert" : "ambre"}>{pct(s.taux)}</Pastille>}
                      </td>
                    );
                  })}
                  <td>{f.objectif !== null && f.comptees ? `${f.atteintes}/${f.comptees}` : "—"}</td>
                  <td><button type="button" className="esp-lien-bouton" onClick={() => setCible(f)}>{f.objectif === null ? "Fixer" : "Changer"}<span className="sr-only"> l&apos;objectif du {f.nom}</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="esp-fil-meta">Semaines passées : rendez-vous honorés, un manqué n&apos;occupe pas le fauteuil. Cette semaine et la suivante : l&apos;agenda prévu. Vous seul voyez cette carte.</p>
      </div>
      <DialogueObjectif fauteuil={cible} fermer={() => setCible(null)} fixer={fixer} />
    </section>
  );
}
