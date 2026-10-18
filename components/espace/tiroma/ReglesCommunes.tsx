"use client";

/* La section « Règles communes » (06/10/2026, session B3, b3_22) : pour le
   titulaire de plusieurs centres, les règles de priorité qui diffèrent d'un
   centre à l'autre, et un bouton pour aligner les autres centres sur celui
   qu'on regarde. Restent propres à chaque centre : la réserve d'urgences,
   les garde-fous d'import, l'objectif de production. */

import { useState } from "react";
import { Scale } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import type { ReglesCommunes as ReglesCommunesT } from "./types";

const LIBELLES: Record<string, string> = {
  ordre_priorite: "Ordre pour un créneau libéré",
  tenir_duree: "Durée du soin tenue",
  tenir_preferences: "Préférences du patient tenues",
  creneau_min_minutes: "Créneau minimal",
  delai_min_appel_minutes: "Délai minimal d'appel",
  horizon_creneaux_jours: "Horizon des créneaux",
  nb_propositions: "Patients proposés",
  seuil_controle_mois: "Contrôle dû après",
  patient_actif_mois: "Patient actif depuis",
  actes_controle: "Actes de contrôle",
  quota_controles_demi_journee: "Contrôles par demi-journée",
  delai_interruption_jours: "Traitement interrompu après",
  delai_devis_presente_jours: "Devis sans réponse après",
  delai_reponse_mutuelle_jours: "Mutuelle sans réponse après",
  alerte_devis_expire_jours: "Alerte avant échéance du devis",
  validite_devis_jours: "Validité du devis",
  labo_verif_jours: "Vérification du laboratoire",
  renouvellement_accord_odf: "Renouvellement de l'accord ODF",
  seuil_demi_journee_vide: "Seuil de demi-journée vide",
};

const ORIGINES: Record<string, string> = { plan: "plan", attente: "attente", controle: "contrôle" };

function valeur(cle: string, v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (cle === "ordre_priorite" && Array.isArray(v)) return v.map((o) => ORIGINES[String(o)] ?? String(o)).join(" → ");
  if (cle === "seuil_demi_journee_vide" && typeof v === "number") return `${Math.round(v * 100)} %`;
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export default function ReglesCommunes({ regles, entiteCourante, aligner }: { regles: ReglesCommunesT | null; entiteCourante: string; aligner: () => Promise<number> }) {
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  if (!regles || regles.centres.length < 2) return null;
  const courant = regles.centres.find((c) => c.entite_id === entiteCourante);
  const confirmer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      const n = await aligner();
      setFait(`${n} centre${n > 1 ? "s" : ""} aligné${n > 1 ? "s" : ""} sur ${courant?.nom ?? "ce centre"}.`);
      setOuvert(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <section id="tiroma-regles-communes" className="esp-carte" aria-label="Règles communes">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Règles communes</h2>
        <span className="esp-item-haut">
          {regles.ecarts.length ? <Pastille teinte="ambre">{regles.ecarts.length} écart{regles.ecarts.length > 1 ? "s" : ""}</Pastille> : <Pastille teinte="vert">Mêmes règles partout</Pastille>}
          {courant && regles.ecarts.length ? <button type="button" className="esp-lien-bouton" onClick={() => { setErreur(null); setOuvert(true); }}>Aligner sur ce centre</button> : null}
        </span>
      </div>
      <div className="esp-carte-corps" style={{ display: "grid", gap: 14 }}>
        {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
        {!regles.ecarts.length ? (
          <p className="esp-fil-meta">Vos {regles.centres.length} centres appliquent les mêmes règles de priorité.</p>
        ) : (
          <div className="esp-tableau-cadre" style={{ position: "relative" }} tabIndex={0} role="region" aria-label="Règles qui diffèrent d'un centre à l'autre (tableau qui défile)">
            <table className="esp-tableau">
              <thead>
                <tr><th>Règle</th>{regles.centres.map((c) => <th key={c.entite_id}>{c.nom}</th>)}</tr>
              </thead>
              <tbody>
                {regles.ecarts.map((cle) => (
                  <tr key={cle}>
                    <td>{LIBELLES[cle] ?? cle}</td>
                    {regles.centres.map((c) => <td key={c.entite_id}>{valeur(cle, c.regles[cle])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="esp-fil-meta">Restent propres à chaque centre : la réserve d&apos;urgences, les garde-fous d&apos;import et l&apos;objectif de production.</p>
      </div>
      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Aligner sur {courant?.nom}</DialogTitle>
            <DialogDescription>Les règles de priorité de ce centre remplacent celles de vos {regles.centres.length - 1} autre{regles.centres.length > 2 ? "s" : ""} centre{regles.centres.length > 2 ? "s" : ""}. Le changement est journalisé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="esp-liste" aria-label="Règles qui changeront">
              {regles.ecarts.map((cle) => (
                <li key={cle} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-titre">{LIBELLES[cle] ?? cle}</span>
                  <span className="esp-item-bas"><span>partout : {valeur(cle, courant?.regles[cle])}</span></span>
                </li>
              ))}
            </ul>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={confirmer}>{occupe ? <Loader variant="spin" /> : null} Aligner</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
