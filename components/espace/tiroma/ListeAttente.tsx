"use client";

/* La carte « Liste d'attente » (06/10/2026, session B3) : les patients qui
   veulent venir plus tôt, ceux du logiciel et ceux inscrits ici (b3_09).
   Tiroma les propose au premier créneau libéré, après les plans acceptés.
   L'équipe inscrit un patient (recherche par nom, sous RLS) et le retire
   quand le rendez-vous est pris. */

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide } from "../ui";
import { dateCourte } from "../format";
import { FAMILLES } from "./libelles";
import type { Attente, Famille, PatientCourt, Praticien } from "./types";

export type Inscription = { patient: PatientCourt; famille: Famille | null; duree_min: number | null; praticien_id: string | null; preavis_minutes: number | null; gene: boolean };
export type Retrait = { attente: Attente; motif: NonNullable<Attente["motif_retrait"]> };

const MOTIFS: Record<NonNullable<Attente["motif_retrait"]>, string> = { rdv_obtenu: "Rendez-vous pris", date_passee: "Date passée", annule: "Le patient renonce", doublon: "Doublon", autre: "Autre" };

type Props = {
  attente: Attente[];
  praticiens: Praticien[];
  peutEcrire: boolean;
  chercher: (texte: string) => Promise<PatientCourt[]>;
  inscrire: (i: Inscription) => Promise<void>;
  retirer: (r: Retrait) => Promise<void>;
};

export default function ListeAttente({ attente, praticiens, peutEcrire, chercher, inscrire, retirer }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [trouves, setTrouves] = useState<PatientCourt[]>([]);
  const [patient, setPatient] = useState<PatientCourt | null>(null);
  const [famille, setFamille] = useState<Famille | "">("");
  const [duree, setDuree] = useState("30");
  const [praticien, setPraticien] = useState("");
  const [preavis, setPreavis] = useState("60");
  const [gene, setGene] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retrait, setRetrait] = useState<Attente | null>(null);
  const [motif, setMotif] = useState<NonNullable<Attente["motif_retrait"]>>("rdv_obtenu");
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
    }, court ? 0 : 250);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [ouvert, texte, chercher]);

  const confirmerInscription = async () => {
    if (!patient) return;
    setOccupe(true);
    setErreur(null);
    try {
      await inscrire({ patient, famille: famille || null, duree_min: duree ? Number(duree) : null, praticien_id: praticien || null, preavis_minutes: preavis ? Number(preavis) : null, gene });
      setFait(`${[patient.prenom, patient.nom].filter(Boolean).join(" ")} est en liste d'attente.`);
      setOuvert(false);
      setPatient(null);
      setTexte("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  const confirmerRetrait = async () => {
    if (!retrait) return;
    setOccupe(true);
    setErreur(null);
    try {
      await retirer({ attente: retrait, motif });
      setFait(`${retrait.patient_nom ?? "Le patient"} est retiré de la liste (${MOTIFS[motif].toLowerCase()}).`);
      setRetrait(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };

  return (
    <section id="tiroma-attente" className="esp-carte" aria-label="Liste d'attente">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Liste d&apos;attente</h2>
        <span className="esp-item-haut">
          <span className="esp-kpi-sous">{attente.length ? `${attente.length} patient${attente.length > 1 ? "s" : ""} veulent venir plus tôt` : "Personne n'attend"}</span>
          {peutEcrire ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setErreur(null); setOuvert(true); }}>Inscrire un patient</button> : null}
        </span>
      </div>
      <div className="esp-carte-corps">
        {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {!attente.length ? (
          <Vide titre="Liste d'attente vide">Les patients de la liste du logiciel arrivent avec le relevé ; l&apos;équipe peut aussi inscrire ici un patient qui veut venir plus tôt.</Vide>
        ) : (
          <ul className="esp-liste" aria-label="Patients en attente">
            {attente.map((a) => (
              <li key={a.id} className="esp-item" style={{ cursor: "default" }}>
                <span className="esp-item-haut">
                  <strong>{a.patient_nom ?? "Patient"}</strong>
                  {a.famille ? <Pastille teinte="gris" contour>{FAMILLES[a.famille]}</Pastille> : null}
                  {a.drapeau_gene ? <Pastille teinte="ambre">Patient gêné</Pastille> : null}
                  <Pastille teinte={a.source === "tiroma" ? "noir" : "gris"} contour>{a.source === "tiroma" ? "Inscrit ici" : "Logiciel"}</Pastille>
                </span>
                <span className="esp-item-bas">
                  <span>Depuis le {dateCourte(a.ajoute_le)}</span>
                  {a.duree_min ? <span>{a.duree_min} min</span> : null}
                  {a.praticien_id ? <span>{praticiens.find((p) => p.id === a.praticien_id)?.nom_affiche ?? "un praticien"}</span> : <span>tout praticien</span>}
                  {a.preavis_minutes ? <span>préavis {a.preavis_minutes} min</span> : null}
                  {peutEcrire ? <button type="button" className="esp-lien-bouton" onClick={() => { setErreur(null); setMotif("rdv_obtenu"); setRetrait(a); }}>Retirer</button> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ListChecks width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Inscrire un patient en liste d&apos;attente</DialogTitle>
            <DialogDescription>Tiroma le proposera au premier créneau libéré qui lui convient, après les plans acceptés. Un patient qui a demandé à ne pas être contacté ne s&apos;inscrit pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Patient <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={patient ? [patient.prenom, patient.nom].filter(Boolean).join(" ") : texte} onChange={(e) => { setPatient(null); setTexte(e.target.value); }} placeholder="Les premières lettres du nom" autoComplete="off" />
              </label>
              {!patient && trouves.length ? (
                <ul className="esp-liste" aria-label="Patients trouvés" style={{ maxHeight: 180, overflowY: "auto" }}>
                  {trouves.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="esp-item" disabled={p.ne_pas_contacter} onClick={() => setPatient(p)}>
                        <span className="esp-item-titre">{[p.prenom, p.nom].filter(Boolean).join(" ")}{p.ne_pas_contacter ? " — ne pas contacter" : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <label className="rv-libelle">Soin attendu
                <select className="rv-champ" value={famille} onChange={(e) => setFamille(e.target.value as Famille | "")}>
                  <option value="">Non précisé</option>
                  {(Object.keys(FAMILLES) as Famille[]).filter((f) => f !== "personnel").map((f) => <option key={f} value={f}>{FAMILLES[f]}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Durée (min)<input className="rv-champ" type="number" min={5} max={600} value={duree} onChange={(e) => setDuree(e.target.value)} /></label>
                <label className="rv-libelle">Préavis (min)<input className="rv-champ" type="number" min={0} max={20160} value={preavis} onChange={(e) => setPreavis(e.target.value)} /></label>
              </div>
              <label className="rv-libelle">Praticien
                <select className="rv-champ" value={praticien} onChange={(e) => setPraticien(e.target.value)}>
                  <option value="">Tout praticien</option>
                  {praticiens.map((p) => <option key={p.id} value={p.id}>{p.nom_affiche}</option>)}
                </select>
              </label>
              <label className="esp-coche"><input type="checkbox" checked={gene} onChange={(e) => setGene(e.target.checked)} /> Patient gêné (douleur) : à appeler en premier</label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe || !patient} onClick={confirmerInscription}>{occupe ? <Loader variant="spin" /> : null} Inscrire</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!retrait} onOpenChange={(o) => !o && setRetrait(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ListChecks width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Retirer {retrait?.patient_nom ?? "ce patient"} de la liste</DialogTitle>
            <DialogDescription>Le motif reste dans le journal du cabinet.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif
                <select className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value as NonNullable<Attente["motif_retrait"]>)}>
                  {(Object.keys(MOTIFS) as NonNullable<Attente["motif_retrait"]>[]).map((m) => <option key={m} value={m}>{MOTIFS[m]}</option>)}
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={occupe} onClick={confirmerRetrait}>{occupe ? <Loader variant="spin" /> : null} Retirer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
