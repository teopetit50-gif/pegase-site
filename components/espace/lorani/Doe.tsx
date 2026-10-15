"use client";

/* Le dossier des ouvrages exécutés (b5_21) : les pièces attendues par lot (plans conformes à l'exécution, notices,
   fiches techniques, procès-verbaux d'essais, garanties) et le DIUO du projet (C. trav., art. R4532-95). Une pièce
   rattachée est reçue ; « sans objet » demande un motif. À la réception, le socle signale ce qui manque, lot par lot
   (CCAG-Travaux 2021, art. 40). « Demander les pièces manquantes » pose une question à chaque entreprise, suivie
   jusqu'à la réponse comme les points des comptes rendus. Base réelle : lorani_doe sous la RLS. */

import { useMemo, useState } from "react";
import { FolderCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { ajouterPoints, majDoe, preparerDoe } from "./portes";
import type { Dossier, PieceDoe, Projet } from "./types";

const LISTE_TYPE: [PieceDoe["nature"], string][] = [
  ["plans", "Plans conformes à l’exécution"],
  ["notices", "Notices de fonctionnement et d’entretien"],
  ["fiches", "Fiches techniques des matériaux et équipements"],
  ["pv_essais", "Procès-verbaux d’essais et d’autocontrôle"],
  ["garanties", "Garanties des fabricants"],
];
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};

type Form = { type: "recu"; item: PieceDoe } | { type: "sans_objet"; item: PieceDoe } | null;

export default function Doe({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const items = useMemo(() => dossier.doe.filter((d) => d.projet_id === projet.id), [dossier.doe, projet.id]);
  const pieces = useMemo(() => dossier.pieces.filter((p) => p.objet_id === projet.id), [dossier.pieces, projet.id]);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nr, setNr] = useState({ piece_id: "", motif: "" });
  const [demande, setDemande] = useState<string | null>(null);
  const clientId = dossier.moi?.client_id ?? "";
  const auj = aujourdhui();
  const attendus = items.filter((d) => d.statut === "attendu");
  const comptes = items.filter((d) => d.statut !== "sans_objet");
  const recus = items.filter((d) => d.statut === "recu");
  const entrepriseDu = (lotId: string | null) => dossier.intervenants.find((i) => i.projet_id === projet.id && i.lot_id === lotId && i.nature === "entreprise" && i.actif);

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

  const preparer = () => lancer(() => preparerDoe(projet.id).then(() => undefined), () => {
    const nouveaux: PieceDoe[] = [];
    for (const l of lots) for (const [nature, intitule] of LISTE_TYPE) if (!items.some((d) => d.lot_id === l.id && d.nature === nature)) nouveaux.push({ id: `local-doe-${l.id}-${nature}`, projet_id: projet.id, lot_id: l.id, nature, intitule, statut: "attendu", piece_id: null, recu_le: null, motif: null });
    if (!items.some((d) => d.nature === "diuo")) nouveaux.push({ id: `local-doe-diuo-${projet.id}`, projet_id: projet.id, lot_id: null, nature: "diuo", intitule: "Dossier d’intervention ultérieure sur l’ouvrage (DIUO)", statut: "attendu", piece_id: null, recu_le: null, motif: null });
    return { ...dossier, doe: [...dossier.doe, ...nouveaux] };
  });
  const soumettre = () => {
    if (!form) return;
    const v = form.type === "recu" ? { statut: "recu" as const, piece_id: nr.piece_id || null, recu_le: auj, motif: null } : { statut: "sans_objet" as const, motif: nr.motif.trim(), piece_id: null, recu_le: null };
    return lancer(() => majDoe(form.item.id, v), () => ({ ...dossier, doe: dossier.doe.map((d) => (d.id === form.item.id ? { ...d, ...v } : d)) }));
  };
  const remettre = (d: PieceDoe) => lancer(() => majDoe(d.id, { statut: "attendu", piece_id: null, motif: null }), () => ({ ...dossier, doe: dossier.doe.map((x) => (x.id === d.id ? { ...x, statut: "attendu", piece_id: null, recu_le: null, motif: null } : x)) }));
  /* une question par entreprise, avec la liste de ce qui manque à son lot */
  const demander = () => {
    const parLot = new Map<string | null, PieceDoe[]>();
    for (const d of attendus) parLot.set(d.lot_id, [...(parLot.get(d.lot_id) ?? []), d]);
    const brouillon = dossier.comptesRendus.filter((c) => c.projet_id === projet.id && c.statut === "brouillon").sort((a, b) => b.numero - a.numero)[0];
    const lignes = [...parLot.entries()].map(([lotId, ds]) => {
      const ent = entrepriseDu(lotId);
      return { client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, lot_id: lotId, intervenant_id: ent?.id ?? null, nature: "question" as const,
        texte: `Remettre pour le DOE : ${ds.map((d) => d.intitule.charAt(0).toLowerCase() + d.intitule.slice(1)).join(", ")}.`, echeance: plus(auj, 15), ouvert_au_cr: brouillon?.id ?? null };
    });
    return lancer(() => ajouterPoints(lignes).then(() => setDemande(`${lignes.length} demande${lignes.length > 1 ? "s" : ""} posée${lignes.length > 1 ? "s" : ""}, suivie${lignes.length > 1 ? "s" : ""} jusqu’à la réponse.`)), () => {
      setDemande(`${lignes.length} demande${lignes.length > 1 ? "s" : ""} posée${lignes.length > 1 ? "s" : ""}, suivie${lignes.length > 1 ? "s" : ""} jusqu’à la réponse.`);
      return { ...dossier, points: [...dossier.points, ...lignes.map((l, k) => ({ id: `local-doe-point-${Date.now()}-${k}`, projet_id: l.projet_id, lot_id: l.lot_id, intervenant_id: l.intervenant_id, nature: l.nature, texte: l.texte, echeance: l.echeance, statut: "ouvert" as const, reponse: null, repondu_le: null, ouvert_au_cr: l.ouvert_au_cr, clos_au_cr: null, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() }))] };
    });
  };

  const groupes: { cle: string; titre: string; items: PieceDoe[] }[] = [
    ...lots.map((l) => ({ cle: l.id, titre: `Lot ${l.numero} · ${l.intitule}${entrepriseDu(l.id) ? ` · ${entrepriseDu(l.id)!.organisme}` : ""}`, items: items.filter((d) => d.lot_id === l.id) })),
    { cle: "projet", titre: "Projet", items: items.filter((d) => d.lot_id === null) },
  ].filter((g) => g.items.length);
  const pct = comptes.length ? Math.round((100 * recus.length) / comptes.length) : 0;
  const okForm = form?.type === "recu" || nr.motif.trim().length >= 3;

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>DOE : dossier des ouvrages exécutés</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || !lots.length} onClick={() => void preparer()}>{items.length ? "Compléter la liste" : "Préparer la liste"}</button>
          {attendus.length ? <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => void demander()}>Demander les pièces manquantes</button> : null}
        </span>
      </div>
      {!items.length ? (
        <div className="lor-tableau-vide">{lots.length ? "Lorani prépare la liste type : plans conformes, notices, fiches techniques, procès-verbaux d’essais et garanties pour chaque lot, et le DIUO du projet." : "Ajoutez d’abord les lots du projet."}</div>
      ) : (
        <>
          <p className="lor-sous" role="status">
            {recus.length} pièce{recus.length > 1 ? "s" : ""} reçue{recus.length > 1 ? "s" : ""} sur {comptes.length} ({pct} %) · {attendus.length} attendue{attendus.length > 1 ? "s" : ""}{items.length - comptes.length ? ` · ${items.length - comptes.length} sans objet` : ""}.
            {demande ? ` ${demande}` : ""}
          </p>
          <span className="lor-jauge" data-etat={pct === 100 ? "ok" : "a_surveiller"} role="img" aria-label={`DOE complet à ${pct} %`}><span style={{ width: `${pct}%` }} /></span>
          {projet.reception_le && attendus.length ? <Avis teinte="ambre">Réception prononcée le {jour(projet.reception_le)} : le DOE est incomplet ({attendus.length} pièce{attendus.length > 1 ? "s" : ""} attendue{attendus.length > 1 ? "s" : ""}).</Avis> : null}
          {groupes.map((g) => (
            <div key={g.cle} className="lor-cr-bloc">
              <div className="lor-cr-titre">{g.titre}</div>
              <ul className="lor-liste">
                {g.items.map((d) => {
                  const p = pieces.find((x) => x.id === d.piece_id);
                  return (
                    <li key={d.id} className="lor-doe-ligne">
                      <Pastille teinte={d.statut === "recu" ? "vert" : d.statut === "sans_objet" ? "gris" : "ambre"}>{d.statut === "recu" ? `Reçu le ${jour(d.recu_le)}` : d.statut === "sans_objet" ? "Sans objet" : "Attendu"}</Pastille>{" "}
                      <span>{d.intitule}</span>
                      {p ? <span className="esp-kpi-sous"> · {p.nom_fichier}</span> : null}
                      {d.motif ? <span className="esp-kpi-sous"> · {d.motif}</span> : null}
                      <span className="lor-point-actions">
                        {d.statut === "attendu" ? (
                          <>
                            <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNr({ piece_id: "", motif: "" }); setErreur(null); setForm({ type: "recu", item: d }); }}>Reçu</button>
                            <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNr({ piece_id: "", motif: "" }); setErreur(null); setForm({ type: "sans_objet", item: d }); }}>Sans objet</button>
                          </>
                        ) : (
                          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => void remettre(d)}>Remettre en attente</button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </>
      )}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FolderCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "recu" ? "Pièce reçue" : "Sans objet"}</DialogTitle>
            <DialogDescription>{form?.item.intitule}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "recu" ? (
                <label className="rv-libelle">Pièce déposée
                  <select className="rv-champ" value={nr.piece_id} onChange={(e) => setNr((s) => ({ ...s, piece_id: e.target.value }))}>
                    <option value="">Reçue hors Lorani (papier, plateforme)</option>
                    {pieces.map((p) => <option key={p.id} value={p.id}>{p.nom_fichier}</option>)}
                  </select>
                </label>
              ) : (
                <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nr.motif} maxLength={300} onChange={(e) => setNr((s) => ({ ...s, motif: e.target.value }))} placeholder="Aucun équipement sous garantie dans ce lot" />
                </label>
              )}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!okForm || envoi} onClick={soumettre}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
