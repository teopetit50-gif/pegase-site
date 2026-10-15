"use client";

/* La réception, les réserves et la garantie de parfait achèvement (b5_19). Chaque réserve est numérotée, rattachée à
   un lot, et sa date de levée est une échéance du registre (rappels J-7, J) ; la levée la tient. La réception datée
   ouvre la garantie de parfait achèvement d'un an (C. civ., art. 1792-6) : son terme est au registre (J-60, J-30,
   J-7, J) et son rappel compte les réserves non levées — la retenue de garantie se conserve alors par opposition
   motivée (loi n° 71-584 du 16 juillet 1971, art. 2). Base réelle : lorani_reserves, lorani_projets.reception_le
   sous la RLS ; le socle numérote, date, rappelle. */

import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { changerReserve, constaterReserve, poserReception } from "./portes";
import type { Dossier, Projet, Reserve } from "./types";

const ORIGINES: Record<Reserve["origine"], string> = { reception: "réception", opr: "opérations préalables", gpa: "parfait achèvement" };
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plusJours = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const unAnApres = (d: string) => {
  const x = new Date(`${d}T12:00:00`);
  x.setFullYear(x.getFullYear() + 1);
  return x.toISOString().slice(0, 10);
};

type Form = { type: "reception" } | { type: "reserve" } | { type: "lever"; reserve: Reserve; statut: "levee" | "contestee" } | null;

export default function Reserves({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const reserves = useMemo(() => dossier.reserves.filter((r) => r.projet_id === projet.id).sort((a, b) => (a.statut === "ouverte" ? 0 : 1) - (b.statut === "ouverte" ? 0 : 1) || a.numero - b.numero), [dossier.reserves, projet.id]);
  const ouvertes = reserves.filter((r) => r.statut === "ouverte");
  const auj = aujourdhui();
  const finGpa = projet.reception_le ? unAnApres(projet.reception_le) : null;
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nrec, setNrec] = useState("");
  const [nr, setNr] = useState({ lot_id: "", intitule: "", localisation: "", origine: "reception" as Reserve["origine"], constatee_le: auj, lever_avant: "" });
  const [nl, setNl] = useState({ date: auj, motif: "" });
  const clientId = dossier.moi?.client_id ?? "";

  const lancer = async (reel: () => Promise<void>, local: () => Dossier) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const ouvrir = (f: Form) => { setErreur(null); setForm(f); };

  const soumettreReception = () => {
    const d = nrec || null;
    return lancer(() => poserReception(projet.id, d), () => ({ ...dossier, projets: dossier.projets.map((x) => (x.id === projet.id ? { ...x, reception_le: d } : x)) }));
  };
  const soumettreReserve = () => {
    const v = { client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, lot_id: nr.lot_id || null, intitule: nr.intitule.trim().replace(/\s+/g, " "), localisation: nr.localisation.trim() || null,
      origine: nr.origine, constatee_le: nr.constatee_le, lever_avant: nr.lever_avant || null };
    const numero = Math.max(0, ...dossier.reserves.filter((r) => r.projet_id === projet.id).map((r) => r.numero)) + 1;
    return lancer(() => constaterReserve(v), () => ({ ...dossier, reserves: [...dossier.reserves, { id: `local-reserve-${Date.now()}`, ...v, marche_id: null, numero, statut: "ouverte", levee_le: null, motif: null }] }));
  };
  const soumettreLevee = () => {
    if (form?.type !== "lever") return;
    const v = form.statut === "levee" ? { statut: "levee" as const, levee_le: nl.date, motif: nl.motif.trim() || null } : { statut: "contestee" as const, motif: nl.motif.trim() };
    return lancer(() => changerReserve(form.reserve.id, v), () => ({ ...dossier, reserves: dossier.reserves.map((r) => (r.id === form.reserve.id ? { ...r, levee_le: null, ...v } : r)) }));
  };
  const rouvrir = (r: Reserve) => lancer(() => changerReserve(r.id, { statut: "ouverte", motif: null }), () => ({ ...dossier, reserves: dossier.reserves.map((x) => (x.id === r.id ? { ...x, statut: "ouverte", levee_le: null, motif: null } : x)) }));

  const reserveOk = nr.intitule.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(nr.constatee_le) && (!nr.lever_avant || nr.lever_avant >= nr.constatee_le);
  const leveeOk = form?.type === "lever" && (form.statut === "levee" ? /^\d{4}-\d{2}-\d{2}$/.test(nl.date) : nl.motif.trim().length >= 3);

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Réception et réserves</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNrec(projet.reception_le ?? ""); ouvrir({ type: "reception" }); }}>{projet.reception_le ? "Date de réception" : "Prononcer la réception"}</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNr({ lot_id: lots[0]?.id ?? "", intitule: "", localisation: "", origine: projet.reception_le ? (finGpa && auj <= finGpa && projet.reception_le < auj ? "gpa" : "reception") : "opr", constatee_le: auj, lever_avant: "" }); ouvrir({ type: "reserve" }); }}>Nouvelle réserve</button>
        </span>
      </div>
      <p className="lor-sous" role="status">
        {projet.reception_le && finGpa
          ? `Réception le ${jour(projet.reception_le)} · garantie de parfait achèvement jusqu’au ${jour(finGpa)}${finGpa < auj ? " (terminée)" : ""}. `
          : "Réception non prononcée. "}
        {reserves.length ? `${ouvertes.length} réserve${ouvertes.length > 1 ? "s" : ""} non levée${ouvertes.length > 1 ? "s" : ""} sur ${reserves.length}.` : "Aucune réserve."}
      </p>
      {finGpa && ouvertes.length && finGpa >= auj && finGpa <= plusJours(auj, 60) ? (
        <Avis teinte="ambre">La garantie de parfait achèvement prend fin le {jour(finGpa)} avec {ouvertes.length} réserve{ouvertes.length > 1 ? "s" : ""} non levée{ouvertes.length > 1 ? "s" : ""} : mettez l’entreprise en demeure, et conservez la retenue de garantie par opposition motivée.</Avis>
      ) : null}

      {reserves.map((r) => {
        const lot = lots.find((l) => l.id === r.lot_id);
        const retard = r.statut === "ouverte" && !!r.lever_avant && r.lever_avant < auj;
        return (
          <div key={r.id} className="lor-reserve" data-statut={r.statut} data-retard={retard || undefined}>
            <div className="lor-situation-tete">
              <strong>Réserve n° {r.numero}{lot ? ` · lot ${lot.numero}` : ""}</strong>
              <Pastille teinte={r.statut === "levee" ? "vert" : r.statut === "contestee" ? "gris" : retard ? "rouge" : "ambre"}>
                {r.statut === "levee" ? `Levée le ${jour(r.levee_le)}` : r.statut === "contestee" ? "Contestée" : retard ? `À lever depuis le ${jour(r.lever_avant)}` : r.lever_avant ? `À lever avant le ${jour(r.lever_avant)}` : "Ouverte"}
              </Pastille>
            </div>
            <div>{r.intitule}</div>
            <div className="lor-sous">{[r.localisation, `constatée le ${jour(r.constatee_le)} (${ORIGINES[r.origine]})`, r.motif ? `motif : ${r.motif}` : null].filter(Boolean).join(" · ")}</div>
            <div className="esp-actions">
              {r.statut === "ouverte" ? (
                <>
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setNl({ date: auj, motif: "" }); ouvrir({ type: "lever", reserve: r, statut: "levee" }); }}>Constater la levée</button>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setNl({ date: auj, motif: "" }); ouvrir({ type: "lever", reserve: r, statut: "contestee" }); }}>Contestée</button>
                </>
              ) : (
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => void rouvrir(r)}>Rouvrir</button>
              )}
            </div>
          </div>
        );
      })}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— la réception ——— */}
      <Dialog open={form?.type === "reception"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Réception des travaux</DialogTitle>
            <DialogDescription>La date du procès-verbal de réception. La garantie de parfait achèvement court un an (C. civ., art. 1792-6) ; Lorani en rappelle le terme avec les réserves restantes.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Réception le
                <input className="rv-champ" type="date" max={auj} value={nrec} onChange={(e) => setNrec(e.target.value)} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || (!!nrec && nrec > auj)} onClick={soumettreReception}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— nouvelle réserve ——— */}
      <Dialog open={form?.type === "reserve"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouvelle réserve</DialogTitle>
            <DialogDescription>Ce qui reste à reprendre, où, et la date à laquelle l’entreprise doit l’avoir levée : Lorani la rappelle.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={nr.lot_id} onChange={(e) => setNr((s) => ({ ...s, lot_id: e.target.value }))}>
                    <option value="">Sans lot</option>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Constatée
                  <select className="rv-champ" value={nr.origine} onChange={(e) => setNr((s) => ({ ...s, origine: e.target.value as Reserve["origine"] }))}>
                    <option value="opr">aux opérations préalables</option>
                    <option value="reception">à la réception</option>
                    <option value="gpa">pendant le parfait achèvement</option>
                  </select>
                </label>
              </div>
              <label className="rv-libelle">Réserve <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nr.intitule} maxLength={300} onChange={(e) => setNr((s) => ({ ...s, intitule: e.target.value }))} placeholder="Fissure en sous-face de dalle" />
              </label>
              <label className="rv-libelle">Localisation
                <input className="rv-champ" value={nr.localisation} maxLength={200} onChange={(e) => setNr((s) => ({ ...s, localisation: e.target.value }))} placeholder="R+1, salle 3" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Constatée le
                  <input className="rv-champ" type="date" max={auj} value={nr.constatee_le} onChange={(e) => setNr((s) => ({ ...s, constatee_le: e.target.value }))} />
                </label>
                <label className="rv-libelle">À lever avant le
                  <input className="rv-champ" type="date" min={nr.constatee_le} value={nr.lever_avant} onChange={(e) => setNr((s) => ({ ...s, lever_avant: e.target.value }))} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!reserveOk || envoi} onClick={soumettreReserve}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— levée ou contestation ——— */}
      <Dialog open={form?.type === "lever"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "lever" ? (form.statut === "levee" ? `Constater la levée de la réserve n° ${form.reserve.numero}` : `Réserve n° ${form.reserve.numero} contestée`) : ""}</DialogTitle>
            <DialogDescription>{form?.type === "lever" ? form.reserve.intitule : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "lever" && form.statut === "levee" ? (
                <label className="rv-libelle">Levée le
                  <input className="rv-champ" type="date" max={auj} value={nl.date} onChange={(e) => setNl((s) => ({ ...s, date: e.target.value }))} />
                </label>
              ) : null}
              <label className="rv-libelle">{form?.type === "lever" && form.statut === "contestee" ? <>Motif <span className="esp-obligatoire">(obligatoire)</span></> : "Observation"}
                <textarea className="rv-champ" rows={3} maxLength={500} value={nl.motif} onChange={(e) => setNl((s) => ({ ...s, motif: e.target.value }))} placeholder={form?.type === "lever" && form.statut === "contestee" ? "Désordre dû à l’usage, hors parfait achèvement" : "Reprise vérifiée sur place"} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!leveeOk || envoi} onClick={soumettreLevee}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
