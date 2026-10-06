"use client";

/* Les comptes rendus de chantier (b5_20) : la visite, les présents, l'avancement, et les points — questions aux
   entreprises, actions, décisions. Les notes de visite se changent en points (cr.ts, lireNotes) ; un point ouvert
   revient de compte rendu en compte rendu, avec son âge, jusqu'à sa réponse ; une question à une entreprise joignable
   est confiée aux relances du socle. Diffusé, le CR est figé par le socle (opposable) et se télécharge en PDF. Base
   réelle : lorani_comptes_rendus, lorani_points sous la RLS. Exemple : les saisies s'appliquent en mémoire. */

import { useMemo, useState } from "react";
import { FileDown, NotebookPen } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { contenuCr, lireNotes, pdfCompteRendu, type PointLu } from "./cr";
import { ajouterPoints, creerCompteRendu, majCompteRendu, majPoint } from "./portes";
import { telecharger } from "./rapport";
import type { CompteRendu, Dossier, LigneCr, Point, Present, Projet } from "./types";

const NATURES: Record<Point["nature"], string> = { question: "Question", action: "Action", decision: "Décision", observation: "Observation" };
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Form =
  | { type: "cr"; cr: CompteRendu | null }
  | { type: "notes"; cr: CompteRendu; lus: PointLu[] }
  | { type: "point"; cr: CompteRendu }
  | { type: "reponse"; ligne: LigneCr }
  | null;

export default function ComptesRendus({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const crs = useMemo(() => dossier.comptesRendus.filter((c) => c.projet_id === projet.id).sort((a, b) => b.numero - a.numero), [dossier.comptesRendus, projet.id]);
  const intervenants = useMemo(() => dossier.intervenants.filter((i) => i.projet_id === projet.id && i.actif), [dossier.intervenants, projet.id]);
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const cr = crs.find((c) => c.id === choisi) ?? crs[0] ?? null;
  const contenu = cr ? contenuCr(cr, projet, dossier) : null;
  const auj = aujourdhui();
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nc, setNc] = useState({ visite_le: auj, presents: [] as Present[], notes: "", avancement: "", prochaine_visite: "" });
  const [np, setNp] = useState({ nature: "question" as Point["nature"], texte: "", intervenant_id: "", lot_id: "", echeance: "" });
  const [nr, setNr] = useState("");
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

  /* ——— le CR ——— */
  const ouvrirCr = (c: CompteRendu | null) => {
    const presents: Present[] = c?.presents ?? intervenants.map((i) => ({ nom: i.contact ?? i.organisme, organisme: i.contact ? i.organisme : null, intervenant: i.id, present: i.nature === "entreprise" }));
    setNc({ visite_le: c?.visite_le ?? auj, presents, notes: c?.notes ?? "", avancement: c?.avancement ?? "", prochaine_visite: c?.prochaine_visite ?? "" });
    ouvrir({ type: "cr", cr: c });
  };
  const soumettreCr = () => {
    if (form?.type !== "cr") return;
    const v = { visite_le: nc.visite_le, presents: nc.presents, notes: nc.notes.trim() || null, avancement: nc.avancement.trim() || null, prochaine_visite: nc.prochaine_visite || null };
    const prec = form.cr;
    if (prec) return lancer(() => majCompteRendu(prec.id, v), () => ({ ...dossier, comptesRendus: dossier.comptesRendus.map((c) => (c.id === prec.id ? { ...c, ...v } : c)) }));
    const numero = Math.max(0, ...crs.map((c) => c.numero)) + 1;
    return lancer(
      () => creerCompteRendu({ ...v, client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id }).then((id) => setChoisi(id)),
      () => {
        const id = `local-cr-${Date.now()}`;
        setChoisi(id);
        return { ...dossier, comptesRendus: [...dossier.comptesRendus, { id, projet_id: projet.id, numero, ...v, statut: "brouillon", diffuse_le: null, contenu: null }] };
      },
    );
  };
  const diffuser = (c: CompteRendu) => lancer(() => majCompteRendu(c.id, { statut: "diffuse" }), () => {
    const d2 = { ...dossier, comptesRendus: dossier.comptesRendus.map((x) => (x.id === c.id ? { ...x, statut: "diffuse" as const, diffuse_le: new Date().toISOString() } : x)) };
    const fige = contenuCr({ ...c, statut: "brouillon" }, projet, d2);
    return {
      ...d2,
      comptesRendus: d2.comptesRendus.map((x) => (x.id === c.id ? { ...x, contenu: { ...fige, cr: { ...fige.cr, statut: "diffuse" } } } : x)),
      points: d2.points.map((p) => (fige.soldes.some((s) => s.id === p.id) && !p.clos_au_cr ? { ...p, clos_au_cr: c.id } : p)),
    };
  });

  /* ——— les points ——— */
  const nouveauxPoints = (c: CompteRendu, lus: PointLu[]) => {
    const lignes = lus.map((l) => ({ client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, lot_id: l.lot_id ?? (intervenants.find((i) => i.id === l.intervenant_id)?.lot_id ?? null), intervenant_id: l.intervenant_id, nature: l.nature, texte: l.texte, echeance: l.echeance, ouvert_au_cr: c.id }));
    return lancer(() => ajouterPoints(lignes), () => ({
      ...dossier,
      points: [...dossier.points, ...lignes.map((l, k) => ({ id: `local-point-${Date.now()}-${k}`, projet_id: l.projet_id, lot_id: l.lot_id, intervenant_id: l.intervenant_id, nature: l.nature, texte: l.texte, echeance: l.echeance,
        statut: (l.nature === "decision" || l.nature === "observation" ? "clos" : "ouvert") as Point["statut"], reponse: null, repondu_le: null, ouvert_au_cr: c.id, clos_au_cr: null, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() }))],
    }));
  };
  const soumettrePoint = () => {
    if (form?.type !== "point") return;
    return nouveauxPoints(form.cr, [{ nature: np.nature, texte: np.texte.trim().replace(/\s+/g, " "), intervenant_id: np.intervenant_id || null, lot_id: np.lot_id || null, echeance: np.echeance || null }]);
  };
  const soumettreReponse = () => {
    if (form?.type !== "reponse") return;
    const id = form.ligne.id;
    return lancer(() => majPoint(id, { reponse: nr.trim() }), () => ({ ...dossier, points: dossier.points.map((p) => (p.id === id ? { ...p, reponse: nr.trim(), statut: "repondu", repondu_le: auj, maj_le: new Date().toISOString() } : p)) }));
  };
  const solder = (l: LigneCr) => lancer(() => majPoint(l.id, { statut: "clos" }), () => ({ ...dossier, points: dossier.points.map((p) => (p.id === l.id ? { ...p, statut: "clos", maj_le: new Date().toISOString() } : p)) }));
  const telechargerPdf = () => {
    if (!contenu) return;
    const r = pdfCompteRendu(contenu);
    telecharger(r.nom, r.octets, "application/pdf");
  };

  const crOk = /^\d{4}-\d{2}-\d{2}$/.test(nc.visite_le) && (!nc.prochaine_visite || nc.prochaine_visite >= nc.visite_le) && (form?.type !== "cr" || !form.cr || form.cr.statut === "brouillon");
  const pointOk = np.texte.trim().length > 0;
  const brouillon = cr?.statut === "brouillon";
  const enRetard = (l: LigneCr) => l.statut === "ouvert" && !!l.echeance && l.echeance < auj;

  const ligne = (l: LigneCr, suspens: boolean) => (
    <li key={l.id}>
      <span className="esp-kpi-sous">{NATURES[l.nature]}{l.lot ? ` · lot ${l.lot}` : ""}{l.entreprise ? ` · ${l.entreprise}` : ""}{l.echeance && l.statut === "ouvert" ? ` · pour le ${jour(l.echeance)}` : ""}{suspens && l.age_jours ? ` · en suspens depuis ${l.age_jours} j (CR n° ${l.ne_au_cr})` : ""}</span>
      {enRetard(l) ? <> <Pastille teinte="rouge">En retard</Pastille></> : null}
      <div>{l.texte}</div>
      {l.reponse ? <div className="lor-sous">Réponse{l.repondu_le ? ` du ${jour(l.repondu_le)}` : ""} : {l.reponse}</div> : null}
      {l.statut === "ouvert" && (l.nature === "question" || l.nature === "action") && !(cr?.statut === "diffuse" && cr.contenu) ? (
        <span className="lor-point-actions">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNr(""); ouvrir({ type: "reponse", ligne: l }); }}>{l.nature === "question" ? "Réponse reçue" : "Faite"}</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => void solder(l)}>Solder</button>
        </span>
      ) : null}
    </li>
  );

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Comptes rendus de chantier</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => ouvrirCr(null)}>Nouveau compte rendu</button>
        </span>
      </div>
      {!cr || !contenu ? (
        <div className="lor-tableau-vide">Aucun compte rendu. Après la visite, notez ce que vous avez vu et demandé : chaque ligne devient un point, suivi de compte rendu en compte rendu jusqu’à sa réponse.</div>
      ) : (
        <>
          {crs.length > 1 ? (
            <div className="esp-filtres lor-controles" role="group" aria-label="Comptes rendus du projet">
              {crs.map((c) => <button key={c.id} type="button" className="esp-filtre" aria-pressed={c.id === cr.id} onClick={() => setChoisi(c.id)}>n° {c.numero} · {jour(c.visite_le)}</button>)}
            </div>
          ) : null}
          <div className="lor-controle-tete">
            <strong>Compte rendu n° {cr.numero} · visite du {jour(cr.visite_le)}</strong>
            <Pastille teinte={brouillon ? "gris" : "vert"}>{brouillon ? "Brouillon" : `Diffusé le ${jour(cr.diffuse_le)}`}</Pastille>
            {cr.prochaine_visite ? <span className="esp-kpi-sous">prochaine visite le {jour(cr.prochaine_visite)}</span> : null}
          </div>
          <div className="esp-actions lor-rapport">
            {brouillon ? (
              <>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi || !cr.notes} onClick={() => ouvrir({ type: "notes", cr, lus: lireNotes(cr.notes ?? "", intervenants, lots, Number(cr.visite_le.slice(0, 4))) })}>Rédiger depuis les notes</button>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setNp({ nature: "question", texte: "", intervenant_id: "", lot_id: "", echeance: "" }); ouvrir({ type: "point", cr }); }}>Ajouter un point</button>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirCr(cr)}>Modifier</button>
                <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => void diffuser(cr)}>Diffuser</button>
              </>
            ) : null}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={telechargerPdf}><FileDown width={15} height={15} aria-hidden="true" /> PDF</button>
          </div>
          {contenu.cr.presents.length ? (
            <p className="lor-sous">Présents : {contenu.cr.presents.filter((p) => p.present).map((p) => `${p.nom}${p.organisme ? ` (${p.organisme})` : ""}`).join(", ") || "—"}{contenu.cr.presents.some((p) => !p.present) ? ` · excusés : ${contenu.cr.presents.filter((p) => !p.present).map((p) => p.nom).join(", ")}` : ""}</p>
          ) : null}
          {contenu.cr.avancement ? <p className="lor-sous">Avancement : {contenu.cr.avancement}</p> : null}
          {brouillon && cr.notes ? <p className="lor-sous">Notes de visite : {cr.notes.split("\n").filter(Boolean).length} ligne{cr.notes.split("\n").filter(Boolean).length > 1 ? "s" : ""}, à rédiger en points.</p> : null}
          {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

          <div className="lor-cr-bloc">
            <div className="lor-cr-titre">Points de cette visite ({contenu.nouveaux.length})</div>
            {contenu.nouveaux.length ? <ul className="lor-liste">{contenu.nouveaux.map((l) => ligne(l, false))}</ul> : <div className="lor-tableau-vide">Aucun point nouveau.</div>}
          </div>
          <div className="lor-cr-bloc">
            <div className="lor-cr-titre">En suspens ({contenu.en_suspens.length})</div>
            {contenu.en_suspens.length ? <ul className="lor-liste">{contenu.en_suspens.map((l) => ligne(l, true))}</ul> : <div className="lor-tableau-vide">Rien en suspens.</div>}
          </div>
          {contenu.soldes.length ? (
            <details className="lor-temps-recents">
              <summary>Soldés depuis {contenu.precedent ? `le CR n° ${contenu.precedent.numero}` : "le début"} ({contenu.soldes.length})</summary>
              <ul className="lor-liste">{contenu.soldes.map((l) => ligne(l, false))}</ul>
            </details>
          ) : null}
        </>
      )}

      {/* ——— nouveau CR, ou le modifier ——— */}
      <Dialog open={form?.type === "cr"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><NotebookPen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "cr" && form.cr ? `Compte rendu n° ${form.cr.numero}` : "Nouveau compte rendu"}</DialogTitle>
            <DialogDescription>Notez la visite comme elle vient, une idée par ligne : « ? » pour une question, « ! » pour une action, « = » pour une décision, « @entreprise », « lot 02 », « avant le 12/10 ». Lorani en fera les points.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Visite du
                  <input className="rv-champ" type="date" value={nc.visite_le} onChange={(e) => setNc((s) => ({ ...s, visite_le: e.target.value }))} />
                </label>
                <label className="rv-libelle">Prochaine visite
                  <input className="rv-champ" type="date" min={nc.visite_le} value={nc.prochaine_visite} onChange={(e) => setNc((s) => ({ ...s, prochaine_visite: e.target.value }))} />
                </label>
              </div>
              {nc.presents.length ? (
                <fieldset className="lor-choix-pieces">
                  <legend className="rv-libelle">Présents</legend>
                  <div className="lor-activites">
                    {nc.presents.map((p, k) => (
                      <label key={`${p.intervenant ?? p.nom}-${k}`} className="lor-choix-case">
                        <input type="checkbox" checked={p.present} onChange={(e) => setNc((s) => ({ ...s, presents: s.presents.map((x, j) => (j === k ? { ...x, present: e.target.checked } : x)) }))} /> <span>{p.nom}{p.organisme ? ` (${p.organisme})` : ""}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <label className="rv-libelle">Notes de visite
                <textarea className="rv-champ" rows={7} maxLength={20000} value={nc.notes} onChange={(e) => setNc((s) => ({ ...s, notes: e.target.value }))} placeholder={"? @Bâti Ouest note de calcul des linteaux du R+1 avant le 12/10\n! transmettre le calepinage révisé\n= enduit teinte pierre retenu\nlot 02 coffrage des voiles du R+2 en cours"} />
              </label>
              <label className="rv-libelle">Avancement
                <textarea className="rv-champ" rows={2} maxLength={5000} value={nc.avancement} onChange={(e) => setNc((s) => ({ ...s, avancement: e.target.value }))} placeholder="Gros œuvre : planchers du R+2 coulés." />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!crOk || envoi} onClick={soumettreCr}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— les notes changées en points ——— */}
      <Dialog open={form?.type === "notes"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><NotebookPen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Rédiger depuis les notes</DialogTitle>
            <DialogDescription>Chaque ligne de vos notes devient un point de ce compte rendu. Vérifiez la nature, l’entreprise et l’échéance lues.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form?.type === "notes" ? (
              <ul className="lor-liste">
                {form.lus.map((l, k) => (
                  <li key={k}>
                    <span className="esp-kpi-sous">{NATURES[l.nature]}{l.intervenant_id ? ` · ${intervenants.find((i) => i.id === l.intervenant_id)?.organisme}` : ""}{l.lot_id ? ` · lot ${lots.find((x) => x.id === l.lot_id)?.numero}` : ""}{l.echeance ? ` · pour le ${jour(l.echeance)}` : ""}</span>
                    <div>{l.texte}</div>
                  </li>
                ))}
              </ul>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || form?.type !== "notes" || !form.lus.length} onClick={() => form?.type === "notes" && void nouveauxPoints(form.cr, form.lus)}>{envoi ? <Loader variant="spin" /> : null} Ajouter {form?.type === "notes" ? form.lus.length : 0} point{form?.type === "notes" && form.lus.length > 1 ? "s" : ""}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— ajouter un point ——— */}
      <Dialog open={form?.type === "point"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><NotebookPen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un point</DialogTitle>
            <DialogDescription>Une question à une entreprise joignable par courriel est relancée jusqu’à sa réponse.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Nature
                  <select className="rv-champ" value={np.nature} onChange={(e) => setNp((s) => ({ ...s, nature: e.target.value as Point["nature"] }))}>
                    {(Object.keys(NATURES) as Point["nature"][]).map((n) => <option key={n} value={n}>{NATURES[n]}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Pour le
                  <input className="rv-champ" type="date" value={np.echeance} onChange={(e) => setNp((s) => ({ ...s, echeance: e.target.value }))} />
                </label>
              </div>
              <label className="rv-libelle">Point <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={3} maxLength={1000} value={np.texte} onChange={(e) => setNp((s) => ({ ...s, texte: e.target.value }))} placeholder="Fournir la note de calcul des linteaux du R+1" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Entreprise ou intervenant
                  <select className="rv-champ" value={np.intervenant_id} onChange={(e) => setNp((s) => ({ ...s, intervenant_id: e.target.value }))}>
                    <option value="">L’équipe</option>
                    {intervenants.map((i) => <option key={i.id} value={i.id}>{i.organisme}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={np.lot_id} onChange={(e) => setNp((s) => ({ ...s, lot_id: e.target.value }))}>
                    <option value="">—</option>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!pointOk || envoi} onClick={soumettrePoint}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— la réponse ——— */}
      <Dialog open={form?.type === "reponse"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><NotebookPen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "reponse" && form.ligne.nature === "action" ? "Action faite" : "Réponse reçue"}</DialogTitle>
            <DialogDescription>{form?.type === "reponse" ? form.ligne.texte : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Réponse <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={3} maxLength={2000} value={nr} onChange={(e) => setNr(e.target.value)} placeholder="Note transmise par courriel le 02/10" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nr.trim() || envoi} onClick={soumettreReponse}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
