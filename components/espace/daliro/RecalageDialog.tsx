"use client";

/* ══════════════════════════════════════════════════════════════════════
   Recaler la suite d'un passage en retard, ou le noter fait
   (06/10/2026, session B6, b6_19)

   « Recaler » : la nouvelle fin du passage, puis ce qui bouge en aval
   (aperçu sans rien écrire), puis l'application ; chaque passage déplacé
   repart en confirmation J-2. « Noter fait » : la fin réelle ; plus tard
   que prévu, la suite est recalée d'abord.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { DialogBody, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { aujourdHui } from "../exemples/socle";
import type { Source } from "../source";
import { dateCourte } from "../format";
import { Avis, Pastille } from "../ui";
import { proposerRecalage, recaler, terminerPassage } from "./portes";
import { ajouterOuvres, appliquerLocal, recalageLocal } from "./recalage";
import type { Passage, Recalage, Tableau } from "./types";

type Props = {
  mode: "recaler" | "terminer";
  passage: Passage;
  tableau: Tableau;
  source: Source;
  onLocal: (t: Tableau) => void;
  relire: () => Promise<void>;
  fermer: (message: string | null) => void;
};

const dates = (debut: string, fin: string) => (debut === fin ? dateCourte(debut) : `${dateCourte(debut)} → ${dateCourte(fin)}`);
const jm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const datesCourtes = (debut: string, fin: string) => (debut === fin ? jm(debut) : `${jm(debut)} → ${jm(fin)}`);

export default function RecalageDialog({ mode, passage: p, tableau, source, onLocal, relire, fermer }: Props) {
  const auj = aujourdHui();
  const [fin, setFin] = useState(() => (mode === "terminer" ? (p.fin < auj ? auj : p.fin) : ajouterOuvres(p.fin, 1)));
  const [motif, setMotif] = useState("");
  const [apercu, setApercu] = useState<Recalage | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const finTerminer = mode === "terminer" && fin > auj ? auj : fin;

  const voir = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      setApercu(source === "reelle" ? await proposerRecalage(p.id, fin) : recalageLocal(tableau, p.id, fin));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setApercu(null);
    } finally {
      setEnvoi(false);
    }
  };

  const confirmer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (mode === "recaler") {
        if (source === "reelle") {
          await recaler(p.id, fin, motif.trim() || null);
          await relire();
        } else {
          onLocal(appliquerLocal(tableau, recalageLocal(tableau, p.id, fin)));
        }
        const n = apercu?.nombre ?? 0;
        fermer(n > 1 ? `Planning recalé : ${n} passages déplacés ; ceux qui étaient confirmés repartent en confirmation J-2.` : "Le passage est recalé.");
      } else {
        if (source === "reelle") {
          await terminerPassage(p.id, finTerminer);
          await relire();
        } else {
          if (finTerminer > auj) throw new Error("Un passage se note fait au plus tard aujourd'hui.");
          if (finTerminer < p.debut) throw new Error(`La fin réelle est au plus tôt le jour du début (${dateCourte(p.debut)}).`);
          const t = finTerminer > p.fin ? appliquerLocal(tableau, recalageLocal(tableau, p.id, finTerminer)) : tableau;
          onLocal({ ...t, passages: t.passages.map((q) => (q.id === p.id ? { ...q, fin: finTerminer, statut: "fait" } : q)) });
        }
        fermer(finTerminer > p.fin ? `« ${p.tache ?? "Passage"} » noté fait le ${dateCourte(finTerminer)}, plus tard que prévu : la suite est recalée.` : `« ${p.tache ?? "Passage"} » noté fait.`);
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  if (mode === "terminer") {
    return (
      <>
        <DialogHeader>
          <DialogIcone><CheckCircle2 width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Noter « {p.tache ?? "le passage"} » fait</DialogTitle>
          <DialogDescription>Prévu {dates(p.debut, p.fin)}. Fini plus tard que prévu : les passages qui en dépendent sont recalés d&apos;abord.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <label className="rv-libelle">Fini le
              <input className="rv-champ" type="date" min={p.debut} max={auj} value={finTerminer} onChange={(e) => setFin(e.target.value)} />
            </label>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--noir" onClick={() => void confirmer()} disabled={envoi || !finTerminer}>{envoi ? <Loader variant="spin" /> : null} Noter fait</button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogIcone><CalendarClock width={18} height={18} aria-hidden="true" /></DialogIcone>
        <DialogTitle>Recaler « {p.tache ?? "le passage"} »</DialogTitle>
        <DialogDescription>Prévu {dates(p.debut, p.fin)}. Donnez sa nouvelle fin : la suite glisse en jours ouvrés, chaque passage garde sa durée, rien ne recule.</DialogDescription>
      </DialogHeader>
      <DialogBody>
        <div className="esp-form" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
          <div className="esp-form-ligne">
            <label className="rv-libelle">Nouvelle fin <span className="esp-obligatoire">(obligatoire)</span>
              <input className="rv-champ" type="date" min={p.debut} value={fin} onChange={(e) => { setFin(e.target.value); setApercu(null); }} />
            </label>
            <label className="rv-libelle">Motif (gardé au journal)
              <input className="rv-champ" maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Livraison des châssis en retard" />
            </label>
          </div>
          {apercu ? (
            apercu.nombre ? (
              <>
                <div className="esp-tableau-cadre" style={{ minWidth: 0, maxWidth: "100%" }} tabIndex={0} role="region" aria-label="Passages déplacés (tableau qui défile)">
                  <table className="esp-tableau">
                    <thead><tr><th>Tâche</th><th>Après</th><th>Avant</th><th>Qui</th></tr></thead>
                    <tbody>
                      {apercu.deplaces.map((d) => (
                        <tr key={d.passage_id}>
                          <td>{d.tache ?? "—"}{d.exterieur ? <span className="esp-kpi-sous"> · extérieur</span> : null}</td>
                          <td style={{ whiteSpace: "nowrap" }}><strong>{datesCourtes(d.nouveau_debut, d.nouveau_fin)}</strong></td>
                          <td style={{ whiteSpace: "nowrap" }}>{datesCourtes(d.ancien_debut, d.ancien_fin)}</td>
                          <td>{d.intervenant ?? "—"}{d.reconfirmer ? <div><Pastille teinte="ambre" contour>À reconfirmer</Pastille></div> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {apercu.fin_planning ? (
                  <Avis teinte={apercu.fin_prevue_chantier && apercu.fin_planning > apercu.fin_prevue_chantier ? "ambre" : "bleu"}>
                    Dernier passage le {dateCourte(apercu.fin_planning)}
                    {apercu.fin_prevue_chantier ? (apercu.fin_planning > apercu.fin_prevue_chantier ? `, après la fin prévue du chantier (${dateCourte(apercu.fin_prevue_chantier)}) : prévenez le maître d'ouvrage.` : `, avant la fin prévue du chantier (${dateCourte(apercu.fin_prevue_chantier)}).`) : "."}
                  </Avis>
                ) : null}
              </>
            ) : <Avis teinte="vert">Rien ne bouge : la suite commence déjà assez tard.</Avis>
          ) : null}
          {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
        </div>
      </DialogBody>
      <DialogFooter>
        {apercu ? (
          <button type="button" className="r-btn r-btn--noir" onClick={() => void confirmer()} disabled={envoi || !fin}>{envoi ? <Loader variant="spin" /> : null} {apercu.nombre > 1 ? `Recaler ${apercu.nombre} passages` : "Recaler"}</button>
        ) : (
          <button type="button" className="r-btn r-btn--noir" onClick={() => void voir()} disabled={envoi || !fin}>{envoi ? <Loader variant="spin" /> : null} Voir ce qui bouge</button>
        )}
      </DialogFooter>
    </>
  );
}
