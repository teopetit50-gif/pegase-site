"use client";

/* Le chantier du projet (b5_13) : chaque situation reçue comparée au marché et à la précédente, l'écart chiffré ; la
   date butoir de chaque visa calée sur la commande de l'ouvrage. Base réelle : lorani_marches, lorani_situations,
   lorani_visas sous la RLS ; les alertes (reçue, dépassement, baisse, visa urgent) viennent du socle. Exemple : les
   saisies s'appliquent en mémoire. Délais : 7 jours pour une situation en marché public (CCAG-Travaux 2021,
   art. 12.2.2), 15 jours en marché privé par défaut ; 15 jours pour un visa (art. 29) ; retenue de garantie ≤ 5 %. */

import { useMemo, useState } from "react";
import { FileCheck2, HardHat, Plus, Receipt } from "lucide-react";
import { Bouton, Detail, Gestes, Groupe, Ligne, Liste, Partie, Pilule, Point, Rangee, Rangees, Texte, Vide, jourCourt, teinte, useVolet } from "@/components/espace2/lin/Volet";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { poserMarche, recevoirDocument, recevoirSituation, rendreVisa, viserSituation } from "./portes";
import { ECART_AVANCEMENT, avancementSituation, pct } from "./avancement";
import { montantsSituation, euros as eurosMt } from "./montants";
import type { Dossier, Marche, Projet, Situation, Visa } from "./types";

const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
const jour = (d: string | null) => (d ? dateCourte(`${d}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
/* la veille ouvrée d'une date (samedi et dimanche sautés), comme private.lorani_veille_ouvree */
const veilleOuvree = (d: string) => {
  let x = plus(d, -1);
  while ([0, 6].includes(new Date(`${x}T12:00:00`).getDay())) x = plus(x, -1);
  return x;
};
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const AVIS: Record<Visa["avis"], { libelle: string; teinte: "gris" | "vert" | "ambre" | "rouge" }> = {
  a_viser: { libelle: "À viser", teinte: "gris" },
  vso: { libelle: "Visé sans observation", teinte: "vert" },
  vao: { libelle: "Visé avec observations", teinte: "ambre" },
  ref: { libelle: "Refusé", teinte: "rouge" },
};

type Form =
  | { type: "marche" }
  | { type: "situation" }
  | { type: "viser"; situation: Situation; rectifier: boolean }
  | { type: "document" }
  | { type: "avis"; visa: Visa }
  | null;

export default function Chantier({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const volet = useVolet();
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const marches = useMemo(() => dossier.marches.filter((m) => m.projet_id === projet.id && m.actif)
    .sort((a, b) => (lots.find((l) => l.id === a.lot_id)?.numero ?? "").localeCompare(lots.find((l) => l.id === b.lot_id)?.numero ?? "")), [dossier.marches, projet.id, lots]);
  const situations = useMemo(() => dossier.situations.filter((s) => s.projet_id === projet.id), [dossier.situations, projet.id]);
  const visas = useMemo(() => dossier.visas.filter((v) => v.projet_id === projet.id).sort((a, b) => (a.avis === "a_viser" ? 0 : 1) - (b.avis === "a_viser" ? 0 : 1) || (a.a_viser_avant ?? "").localeCompare(b.a_viser_avant ?? "")), [dossier.visas, projet.id]);
  const lotDe = (id: string | null) => lots.find((l) => l.id === id);
  const marcheDe = (id: string) => marches.find((m) => m.id === id) ?? dossier.marches.find((m) => m.id === id);
  const retenu = (s: Situation) => s.cumul_admis_ht ?? s.cumul_ht;
  const precedente = (s: Situation) => situations.filter((x) => x.marche_id === s.marche_id && x.numero < s.numero).sort((a, b) => b.numero - a.numero)[0];
  const derniere = (m: Marche) => situations.filter((x) => x.marche_id === m.id).sort((a, b) => b.numero - a.numero)[0];
  const aViser = situations.filter((s) => s.statut === "a_viser").sort((a, b) => (a.a_viser_avant ?? "").localeCompare(b.a_viser_avant ?? ""));
  const auj = aujourdhui();

  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nm, setNm] = useState({ lot_id: "", titulaire: "", montant: "", avenants: "", retenue: "5", avance: "0", penalite: "" });
  const [ns, setNs] = useState({ marche_id: "", numero: "", mois: auj.slice(0, 7), cumul: "", recue_le: auj, retenue: "", avance: "", penalites: "" });
  const [nv, setNv] = useState({ cumul: "", observation: "" });
  const [nd, setNd] = useState({ lot_id: "", document: "", indice: "A", recu_le: auj, commande_le: "" });
  const [na, setNa] = useState({ avis: "vso" as "vso" | "vao" | "ref", observation: "" });
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

  /* ——— les soumissions ——— */
  const soumettreMarche = () => {
    const v = { client_id: clientId, projet_id: projet.id, lot_id: nm.lot_id, titulaire: nm.titulaire.trim().replace(/\s+/g, " "), montant_ht: nombre(nm.montant), avenants_ht: nombre(nm.avenants || "0"), retenue_pct: nombre(nm.retenue || "5"), avance_pct: nombre(nm.avance || "0"), penalite_jour_ht: nm.penalite.trim() ? nombre(nm.penalite) : null };
    return lancer(() => poserMarche(v), () => ({ ...dossier, marches: [...dossier.marches, { id: `local-${Date.now()}`, ...v, delai_verification_jours: projet.marche_public ? 7 : 15, actif: true }] }));
  };
  const soumettreSituation = () => {
    const m = marcheDe(ns.marche_id);
    const optionnel = (t: string) => (t.trim() ? nombre(t) : null);
    const v = { client_id: clientId, projet_id: projet.id, marche_id: ns.marche_id, numero: Number(ns.numero), mois: `${ns.mois}-01`, cumul_ht: nombre(ns.cumul), recue_le: ns.recue_le,
      retenue_deduite_ht: optionnel(ns.retenue), avance_remboursee_ht: optionnel(ns.avance), penalites_ht: optionnel(ns.penalites) };
    return lancer(() => recevoirSituation(v), () => ({ ...dossier, situations: [...dossier.situations, { id: `local-${Date.now()}`, projet_id: projet.id, marche_id: v.marche_id, numero: v.numero, mois: v.mois, cumul_ht: v.cumul_ht, recue_le: v.recue_le, retenue_deduite_ht: v.retenue_deduite_ht, avance_remboursee_ht: v.avance_remboursee_ht, penalites_ht: v.penalites_ht, a_viser_avant: plus(v.recue_le, m?.delai_verification_jours ?? 15), statut: "a_viser", cumul_admis_ht: null, observation: null, visee_le: null }] }));
  };
  const soumettreVisa = () => {
    if (form?.type !== "viser") return;
    const s = form.situation;
    const v = form.rectifier
      ? { statut: "rectifiee" as const, cumul_admis_ht: nombre(nv.cumul), observation: nv.observation.trim() }
      : { statut: "visee" as const, cumul_admis_ht: null, observation: nv.observation.trim() || null };
    return lancer(() => viserSituation(s.id, v), () => ({ ...dossier, situations: dossier.situations.map((x) => (x.id === s.id ? { ...x, statut: v.statut, cumul_admis_ht: v.cumul_admis_ht ?? x.cumul_ht, observation: v.observation, visee_le: auj } : x)) }));
  };
  const soumettreDocument = () => {
    const v = { client_id: clientId, projet_id: projet.id, lot_id: nd.lot_id || null, document: nd.document.trim().replace(/\s+/g, " "), indice: nd.indice.trim().toUpperCase(), recu_le: nd.recu_le, commande_le: nd.commande_le || null };
    const butoir = v.commande_le ? [plus(v.recu_le, 15), veilleOuvree(v.commande_le)].sort()[0] : plus(v.recu_le, 15);
    return lancer(() => recevoirDocument(v), () => ({ ...dossier, visas: [{ id: `local-${Date.now()}`, ...v, delai_visa_jours: 15, a_viser_avant: butoir < v.recu_le ? v.recu_le : butoir, avis: "a_viser", observation: null, vise_le: null }, ...dossier.visas] }));
  };
  const soumettreAvis = () => {
    if (form?.type !== "avis") return;
    const v = { avis: na.avis, observation: na.observation.trim() || null };
    return lancer(() => rendreVisa(form.visa.id, v), () => ({ ...dossier, visas: dossier.visas.map((x) => (x.id === form.visa.id ? { ...x, ...v, vise_le: auj } : x)) }));
  };

  const marcheOk = !!nm.lot_id && nm.titulaire.trim().length > 0 && nombre(nm.montant) > 0 && !Number.isNaN(nombre(nm.avenants || "0")) && nombre(nm.montant) + nombre(nm.avenants || "0") > 0 && nombre(nm.retenue || "5") >= 0 && nombre(nm.retenue || "5") <= 5
    && nombre(nm.avance || "0") >= 0 && nombre(nm.avance || "0") <= 30 && (!nm.penalite.trim() || nombre(nm.penalite) >= 0);
  const situationOk = !!ns.marche_id && Number(ns.numero) >= 1 && !situations.some((x) => x.marche_id === ns.marche_id && x.numero === Number(ns.numero)) && /^\d{4}-\d{2}$/.test(ns.mois) && nombre(ns.cumul) >= 0 && ns.cumul.trim() !== "" && /^\d{4}-\d{2}-\d{2}$/.test(ns.recue_le)
    && [ns.retenue, ns.avance, ns.penalites].every((t) => !t.trim() || nombre(t) >= 0);
  const viserOk = form?.type === "viser" && (!form.rectifier || (nv.cumul.trim() !== "" && nombre(nv.cumul) >= 0 && nv.observation.trim().length >= 3));
  const documentOk = nd.document.trim().length > 0 && /^[0-9A-Za-z.-]{1,6}$/.test(nd.indice.trim()) && /^\d{4}-\d{2}-\d{2}$/.test(nd.recu_le) && (!nd.commande_le || nd.commande_le >= nd.recu_le);
  const avisOk = na.avis === "vso" || na.observation.trim().length >= 3;

  const fenetres = (
    <>
      {/* ——— nouveau marché ——— */}
      <Dialog open={form?.type === "marche"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><HardHat width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouveau marché de travaux</DialogTitle>
            <DialogDescription>Le marché d’un lot : chaque situation de l’entreprise y sera comparée. {projet.marche_public ? "Marché public : 7 jours pour accepter ou rectifier une situation (CCAG-Travaux, art. 12.2.2)." : "Marché privé : 15 jours pour vérifier une situation, sauf clause contraire."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={nm.lot_id} onChange={(e) => setNm((s) => ({ ...s, lot_id: e.target.value }))}>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Titulaire <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nm.titulaire} maxLength={160} onChange={(e) => setNm((s) => ({ ...s, titulaire: e.target.value }))} placeholder="Bâti Ouest SAS" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Montant HT (€) <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={nm.montant} onChange={(e) => setNm((s) => ({ ...s, montant: e.target.value }))} placeholder="120 000" />
                </label>
                <label className="rv-libelle">Avenants HT (€)
                  <input className="rv-champ" inputMode="decimal" value={nm.avenants} onChange={(e) => setNm((s) => ({ ...s, avenants: e.target.value }))} placeholder="0" />
                </label>
                <label className="rv-libelle">Retenue de garantie (%)
                  <input className="rv-champ" inputMode="decimal" value={nm.retenue} onChange={(e) => setNm((s) => ({ ...s, retenue: e.target.value }))} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Avance (% du montant)
                  <input className="rv-champ" inputMode="decimal" value={nm.avance} onChange={(e) => setNm((s) => ({ ...s, avance: e.target.value }))} placeholder="0" />
                </label>
                <label className="rv-libelle">Pénalité de retard par jour HT (€)
                  <input className="rv-champ" inputMode="decimal" value={nm.penalite} onChange={(e) => setNm((s) => ({ ...s, penalite: e.target.value }))} placeholder={projet.marche_public ? "1/3000 du marché" : "selon le marché"} />
                </label>
              </div>
              <p className="lor-sous">La retenue de garantie ne dépasse pas 5 % (loi n° 71-584 du 16 juillet 1971). L’avance se rembourse de 65 % à 80 % d’exécution ; sans pénalité saisie, un marché public applique 1/3000 du montant par jour de retard (CCAG-Travaux 2021).</p>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!marcheOk || envoi} onClick={soumettreMarche}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— situation reçue ——— */}
      <Dialog open={form?.type === "situation"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Situation reçue</DialogTitle>
            <DialogDescription>Le cumul des travaux exécutés, tel que l’entreprise le demande. Lorani le compare au marché et à la situation précédente, et date le visa.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Marché
                <select className="rv-champ" value={ns.marche_id} onChange={(e) => {
                  const id = e.target.value;
                  setNs((s) => ({ ...s, marche_id: id, numero: String(Math.max(0, ...situations.filter((x) => x.marche_id === id).map((x) => x.numero)) + 1) }));
                }}>
                  {marches.map((m) => <option key={m.id} value={m.id}>Lot {lotDe(m.lot_id)?.numero} · {m.titulaire}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Numéro
                  <input className="rv-champ" inputMode="numeric" value={ns.numero} onChange={(e) => setNs((s) => ({ ...s, numero: e.target.value }))} />
                </label>
                <label className="rv-libelle">Mois des travaux
                  <input className="rv-champ" type="month" value={ns.mois} onChange={(e) => setNs((s) => ({ ...s, mois: e.target.value }))} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Cumul HT demandé (€) <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={ns.cumul} onChange={(e) => setNs((s) => ({ ...s, cumul: e.target.value }))} placeholder="72 500" />
                </label>
                <label className="rv-libelle">Reçue le
                  <input className="rv-champ" type="date" max={auj} value={ns.recue_le} onChange={(e) => setNs((s) => ({ ...s, recue_le: e.target.value }))} />
                </label>
              </div>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Ce que la situation déduit, en cumul HT (€) — facultatif</legend>
                <div className="lor-tolerances">
                  <label className="rv-libelle">Retenue de garantie
                    <input className="rv-champ" inputMode="decimal" value={ns.retenue} onChange={(e) => setNs((s) => ({ ...s, retenue: e.target.value }))} placeholder="3 625" />
                  </label>
                  <label className="rv-libelle">Avance remboursée
                    <input className="rv-champ" inputMode="decimal" value={ns.avance} onChange={(e) => setNs((s) => ({ ...s, avance: e.target.value }))} placeholder="0" />
                  </label>
                  <label className="rv-libelle">Pénalités
                    <input className="rv-champ" inputMode="decimal" value={ns.penalites} onChange={(e) => setNs((s) => ({ ...s, penalites: e.target.value }))} placeholder="0" />
                  </label>
                </div>
              </fieldset>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!situationOk || envoi} onClick={soumettreSituation}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— viser ou rectifier ——— */}
      <Dialog open={form?.type === "viser"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileCheck2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "viser" && form.rectifier ? `Rectifier la situation n° ${form.situation.numero}` : `Viser la situation n° ${form?.type === "viser" ? form.situation.numero : ""}`}</DialogTitle>
            <DialogDescription>{form?.type === "viser" && form.rectifier ? "Le cumul que vous admettez, et pourquoi : il sert de base à la situation suivante." : "Le cumul demandé est admis tel quel."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "viser" && form.rectifier ? (
                <label className="rv-libelle">Cumul HT admis (€) <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={nv.cumul} onChange={(e) => setNv((s) => ({ ...s, cumul: e.target.value }))} />
                </label>
              ) : null}
              <label className="rv-libelle">Observation {form?.type === "viser" && form.rectifier ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} maxLength={1000} value={nv.observation} onChange={(e) => setNv((s) => ({ ...s, observation: e.target.value }))} placeholder="Joints non réalisés sur la travée 3" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!viserOk || envoi} onClick={soumettreVisa}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "viser" && form.rectifier ? "Rectifier" : "Viser"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— document à viser ——— */}
      <Dialog open={form?.type === "document"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Document d’exécution à viser</DialogTitle>
            <DialogDescription>Plan, note de calcul ou fiche technique d’une entreprise. 15 jours pour le viser (CCAG-Travaux, art. 29), et au plus tard la veille ouvrée de la commande de l’ouvrage si vous la connaissez.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Lot
                  <select className="rv-champ" value={nd.lot_id} onChange={(e) => setNd((s) => ({ ...s, lot_id: e.target.value }))}>
                    <option value="">Tout le projet</option>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.numero} · {l.intitule}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Indice
                  <input className="rv-champ" value={nd.indice} maxLength={6} onChange={(e) => setNd((s) => ({ ...s, indice: e.target.value }))} />
                </label>
              </div>
              <label className="rv-libelle">Document <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nd.document} maxLength={200} onChange={(e) => setNd((s) => ({ ...s, document: e.target.value }))} placeholder="Plans de ferraillage des fondations" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Reçu le
                  <input className="rv-champ" type="date" max={auj} value={nd.recu_le} onChange={(e) => setNd((s) => ({ ...s, recu_le: e.target.value }))} />
                </label>
                <label className="rv-libelle">Commande de l’ouvrage le
                  <input className="rv-champ" type="date" min={nd.recu_le} value={nd.commande_le} onChange={(e) => setNd((s) => ({ ...s, commande_le: e.target.value }))} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!documentOk || envoi} onClick={soumettreDocument}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— rendre l'avis ——— */}
      <Dialog open={form?.type === "avis"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileCheck2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Rendre l’avis</DialogTitle>
            <DialogDescription>{form?.type === "avis" ? `${form.visa.document}, indice ${form.visa.indice}.` : ""} Une observation est obligatoire pour un visa avec observations ou un refus.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Avis
                <select className="rv-champ" value={na.avis} onChange={(e) => setNa((s) => ({ ...s, avis: e.target.value as "vso" | "vao" | "ref" }))}>
                  <option value="vso">Visé sans observation</option>
                  <option value="vao">Visé avec observations</option>
                  <option value="ref">Refusé</option>
                </select>
              </label>
              <label className="rv-libelle">Observation {na.avis !== "vso" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} maxLength={1000} value={na.observation} onChange={(e) => setNa((s) => ({ ...s, observation: e.target.value }))} placeholder="Enrobage à reprendre en rive" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!avisOk || envoi} onClick={soumettreAvis}>{envoi ? <Loader variant="spin" /> : null} Rendre l’avis</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  /* 30/10/2026 — dans la fiche de l'espace 2 : les situations à viser, les documents à viser, les marchés puis les
     documents visés, un par ligne ; écarts, recalcul, avancement et gestes (viser, rectifier, rendre l'avis) dans le
     volet (../../espace2/lin/Volet.tsx) */
  if (volet) {
    const visasAViser = visas.filter((v) => v.avis === "a_viser");
    const visasRendus = visas.filter((v) => v.avis !== "a_viser");
    const situationsVues = aViser.filter((s) => !!marcheDe(s.marche_id));
    const enRetardVisa = (v: Visa) => v.avis === "a_viser" && !!v.a_viser_avant && v.a_viser_avant < auj;
    const urgentVisa = (v: Visa) => v.avis === "a_viser" && !enRetardVisa(v) && !!v.a_viser_avant && v.a_viser_avant < plus(auj, 5);
    const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
    const compte = [situationsVues.length ? `${pluriel(situationsVues.length, "situation")} à viser` : null, visasAViser.length ? `${pluriel(visasAViser.length, "document")} à viser` : null, marches.length ? pluriel(marches.length, "marché") : null].filter(Boolean).join(" · ");
    const derniereLibelle = (d: Situation | undefined) => (d ? `n° ${d.numero} · ${d.statut === "a_viser" ? "à viser" : d.statut === "visee" ? `visée le ${jour(d.visee_le)}` : `rectifiée (${euros(d.cumul_admis_ht ?? 0)} admis)`}` : "Aucune");
    const ligneVisa = (v: Visa) => {
      const retard = enRetardVisa(v);
      const urgent = urgentVisa(v);
      const lot = lotDe(v.lot_id);
      return (
        <Ligne
          key={v.id}
          cle={`chantier-visa:${v.id}`}
          libelle={`${v.document}, indice ${v.indice}, ${v.avis === "a_viser" ? `à viser avant le ${jour(v.a_viser_avant)}` : AVIS[v.avis].libelle}`}
          icone={<FileCheck2 />}
          id={`ind. ${v.indice}`}
          titre={v.document}
          second={lot ? `lot ${lot.numero}` : null}
          droite={
            v.avis === "a_viser" ? (
              retard ? <Pilule teinte="rouge" icone={<Point teinte="rouge" />}>En retard</Pilule> : urgent ? <Pilule teinte="jaune" icone={<Point teinte="jaune" />}>Urgent</Pilule> : <Pilule teinte="gris" icone={<Point teinte="gris" />}>À viser</Pilule>
            ) : (
              <Pilule teinte={teinte(AVIS[v.avis].teinte)} icone={<Point teinte={teinte(AVIS[v.avis].teinte)} />}>{AVIS[v.avis].libelle}</Pilule>
            )
          }
          date={v.avis === "a_viser" ? jourCourt(v.a_viser_avant) : jourCourt(v.vise_le)}
          dateTitre={v.avis === "a_viser" ? "À viser avant" : "Visé le"}
        />
      );
    };
    return (
      <Partie
        titre="Chantier : situations et visas"
        compte={compte || null}
        gestes={
          <>
            <Bouton icone={<Plus aria-hidden="true" />} disabled={!peutEcrire || envoi || !marches.length} onClick={() => {
              const m = marches[0];
              const n = m ? Math.max(0, ...situations.filter((x) => x.marche_id === m.id).map((x) => x.numero)) + 1 : 1;
              setNs({ marche_id: m?.id ?? "", numero: String(n), mois: auj.slice(0, 7), cumul: "", recue_le: auj, retenue: "", avance: "", penalites: "" });
              ouvrir({ type: "situation" });
            }}>Situation reçue</Bouton>
            <Bouton icone={<Plus aria-hidden="true" />} disabled={!peutEcrire || envoi} onClick={() => { setNd({ lot_id: lots[0]?.id ?? "", document: "", indice: "A", recu_le: auj, commande_le: "" }); ouvrir({ type: "document" }); }}>Document à viser</Bouton>
            <Bouton icone={<Plus aria-hidden="true" />} disabled={!peutEcrire || envoi || !lots.length} onClick={() => { setNm({ lot_id: lots[0]?.id ?? "", titulaire: "", montant: "", avenants: "", retenue: "5", avance: "0", penalite: "" }); ouvrir({ type: "marche" }); }}>Nouveau marché</Bouton>
          </>
        }
      >
        {!marches.length && !visas.length ? (
          <Vide>{lots.length ? "Aucun marché de travaux : posez le marché de chaque lot pour contrôler les situations des entreprises." : "Ajoutez d’abord les lots du projet, puis le marché de chaque lot."}</Vide>
        ) : null}
        {situationsVues.length || marches.length || visas.length ? (
          <Liste>
            {situationsVues.length ? (
              <Groupe nom="Situations à viser" compte={situationsVues.length}>
                {situationsVues.map((s) => {
                  const m = marcheDe(s.marche_id) as Marche;
                  const p = precedente(s);
                  const total = m.montant_ht + m.avenants_ht;
                  const mois = s.cumul_ht - (p ? retenu(p) : 0);
                  const retard = !!s.a_viser_avant && s.a_viser_avant < auj;
                  return (
                    <Ligne
                      key={s.id}
                      cle={`chantier-situation:${s.id}`}
                      libelle={`Situation n° ${s.numero} de ${m.titulaire}, ${retard ? `à viser depuis le ${jour(s.a_viser_avant)}` : `à viser avant le ${jour(s.a_viser_avant)}`}`}
                      icone={<Receipt />}
                      id={`n° ${s.numero}`}
                      titre={m.titulaire}
                      second={`lot ${lotDe(m.lot_id)?.numero ?? "—"} · ${euros(mois)} ce mois`}
                      droite={
                        <>
                          {s.cumul_ht > total ? <Pilule teinte="rouge" icone={<Point teinte="rouge" />}>Dépasse le marché</Pilule> : null}
                          <Pilule teinte={retard ? "rouge" : "jaune"} icone={<Point teinte={retard ? "rouge" : "jaune"} />}>{retard ? "En retard" : "À viser"}</Pilule>
                        </>
                      }
                      date={jourCourt(s.a_viser_avant)}
                      dateTitre={retard ? "À viser depuis le" : "À viser avant le"}
                    />
                  );
                })}
              </Groupe>
            ) : null}
            {visasAViser.length ? (
              <Groupe nom="Documents à viser" compte={visasAViser.length}>
                {visasAViser.map(ligneVisa)}
              </Groupe>
            ) : null}
            {marches.length ? (
              <Groupe nom="Marchés de travaux" compte={marches.length}>
                {marches.map((m) => {
                  const d = derniere(m);
                  const total = m.montant_ht + m.avenants_ht;
                  const cumul = d ? retenu(d) : 0;
                  const avance = Math.round((100 * cumul) / total);
                  const lot = lotDe(m.lot_id);
                  return (
                    <Ligne
                      key={m.id}
                      cle={`chantier-marche:${m.id}`}
                      libelle={`Lot ${lot?.numero ?? "—"}, ${m.titulaire}, ${avance} % du marché`}
                      icone={<HardHat />}
                      id={`lot ${lot?.numero ?? "—"}`}
                      titre={m.titulaire}
                      second={lot ? `${lot.intitule} · ${avance} %` : `${avance} %`}
                      droite={d ? <Pilule teinte={d.statut === "a_viser" ? "jaune" : d.statut === "visee" ? "vert" : "gris"} icone={<Point teinte={d.statut === "a_viser" ? "jaune" : d.statut === "visee" ? "vert" : "gris"} />}>{`n° ${d.numero} ${d.statut === "a_viser" ? "à viser" : d.statut === "visee" ? "visée" : "rectifiée"}`}</Pilule> : null}
                      date={euros(total)}
                      dateTitre="Marché + avenants HT"
                    />
                  );
                })}
              </Groupe>
            ) : null}
            {visasRendus.length ? (
              <Groupe nom="Documents visés" compte={visasRendus.length}>
                {visasRendus.map(ligneVisa)}
              </Groupe>
            ) : null}
          </Liste>
        ) : null}

        {situationsVues.map((s) => {
          const m = marcheDe(s.marche_id) as Marche;
          const p = precedente(s);
          const total = m.montant_ht + m.avenants_ht;
          const mois = s.cumul_ht - (p ? retenu(p) : 0);
          const retard = !!s.a_viser_avant && s.a_viser_avant < auj;
          /* b5_32 : l'avancement facturé contre le dernier constaté au compte rendu */
          const a = avancementSituation(s, m, dossier);
          /* b5_33 : retenue, avance et pénalités recalculées */
          const mt = montantsSituation(s, m, projet);
          const ecartAvancement = a.constate !== null && !!a.cr && a.declare - a.constate > ECART_AVANCEMENT;
          return (
            <Detail key={s.id} cle={`chantier-situation:${s.id}`} titre={`Situation n° ${s.numero} · ${m.titulaire}`} sous={`Lot ${lotDe(m.lot_id)?.numero ?? "—"} · reçue le ${jour(s.recue_le)}`}>
              <Rangees>
                <Rangee libelle="Visa" teinte={retard ? "rouge" : "jaune"}>{retard ? `À viser depuis le ${jour(s.a_viser_avant)}` : `À viser avant le ${jour(s.a_viser_avant)}`}</Rangee>
                <Rangee libelle="Cumul HT" teinte={s.cumul_ht > total ? "rouge" : undefined}>{euros(s.cumul_ht)} sur {euros(total)} ({Math.round((100 * s.cumul_ht) / total)} %)</Rangee>
                <Rangee libelle="Ce mois">{euros(mois)}</Rangee>
                <Rangee libelle="Retenue">{euros(Math.round(mois * m.retenue_pct) / 100)}</Rangee>
                <Rangee libelle="Avancement" teinte={ecartAvancement ? "jaune" : undefined}>
                  {a.constate === null || !a.cr
                    ? "Aucun compte rendu diffusé ne le donne pour ce lot avant la réception."
                    : ecartAvancement
                      ? `La situation facture ${pct(a.declare)} d’avancement, le chantier en est à ${pct(a.constate)} au compte rendu n° ${a.cr.numero} du ${jour(a.cr.visite_le)} : à rectifier, ou à justifier par l’entreprise.`
                      : `${pct(a.constate)} au compte rendu n° ${a.cr.numero} du ${jour(a.cr.visite_le)} (facturé ${pct(a.declare)}).`}
                </Rangee>
                <Rangee libelle="Recalcul">
                  Retenue {eurosMt(mt.retenue_attendue)}{mt.avance ? ` · avance à rembourser ${eurosMt(mt.avance_a_rembourser)} sur ${eurosMt(mt.avance)}` : ""}{mt.penalites_applicables ? ` · pénalités ${eurosMt(mt.penalites_applicables)} (${mt.jours_retard} j)` : ""} · net attendu {eurosMt(mt.net_attendu)} HT
                </Rangee>
              </Rangees>
              {s.cumul_ht > total ? <Texte>Le cumul dépasse le marché et ses avenants de {euros(s.cumul_ht - total)} : un avenant manque, ou la situation est à rectifier.</Texte> : null}
              {mt.ecarts.map((e) => <Texte key={e.nature}>{e.texte.charAt(0).toUpperCase() + e.texte.slice(1)}.</Texte>)}
              {p && s.cumul_ht < retenu(p) ? <Texte>Le cumul recule par rapport à la situation n° {p.numero} ({euros(retenu(p))}) : à vérifier avec l’entreprise.</Texte> : null}
              <Gestes>
                <Bouton fort disabled={!peutEcrire || envoi} onClick={() => { setNv({ cumul: "", observation: "" }); ouvrir({ type: "viser", situation: s, rectifier: false }); }}>Viser</Bouton>
                <Bouton disabled={!peutEcrire || envoi} onClick={() => { setNv({ cumul: String(Math.min(s.cumul_ht, total)), observation: "" }); ouvrir({ type: "viser", situation: s, rectifier: true }); }}>Rectifier</Bouton>
              </Gestes>
            </Detail>
          );
        })}
        {marches.map((m) => {
          const d = derniere(m);
          const total = m.montant_ht + m.avenants_ht;
          const cumul = d ? retenu(d) : 0;
          const avance = Math.round((100 * cumul) / total);
          const lot = lotDe(m.lot_id);
          return (
            <Detail key={m.id} cle={`chantier-marche:${m.id}`} titre={`Lot ${lot?.numero ?? "—"} · ${m.titulaire}`} sous={lot?.intitule}>
              <Rangees>
                <Rangee libelle="Marché HT">{euros(total)}{m.avenants_ht ? ` dont ${euros(m.avenants_ht)} d’avenants` : ""}</Rangee>
                <Rangee libelle="Avancement" teinte={cumul > total ? "rouge" : undefined}>{euros(cumul)} · {avance} %</Rangee>
                <Rangee libelle="Retenue">{m.retenue_pct.toLocaleString("fr-FR")} %</Rangee>
                <Rangee libelle="Pour viser">{m.delai_verification_jours ?? 15} j</Rangee>
                <Rangee libelle="Dernière">{derniereLibelle(d)}</Rangee>
              </Rangees>
            </Detail>
          );
        })}
        {visas.map((v) => {
          const retard = enRetardVisa(v);
          const lot = lotDe(v.lot_id);
          return (
            <Detail key={v.id} cle={`chantier-visa:${v.id}`} titre={v.document} sous={`Indice ${v.indice}${lot ? ` · lot ${lot.numero} ${lot.intitule}` : ""}`}>
              <Rangees>
                <Rangee libelle="Reçu le">{jour(v.recu_le)}</Rangee>
                <Rangee libelle="À viser avant" teinte={retard ? "rouge" : urgentVisa(v) ? "jaune" : undefined}>{jour(v.a_viser_avant)}{retard ? " · en retard" : urgentVisa(v) ? " · urgent" : ""}</Rangee>
                {v.commande_le ? <Rangee libelle="Commande">{jour(v.commande_le)}</Rangee> : null}
                <Rangee libelle="Avis" teinte={v.avis === "a_viser" ? undefined : teinte(AVIS[v.avis].teinte)}>{AVIS[v.avis].libelle}{v.vise_le ? ` le ${jour(v.vise_le)}` : ""}</Rangee>
              </Rangees>
              {v.observation ? <Texte citation>« {v.observation} »</Texte> : null}
              {v.avis === "a_viser" ? (
                <Gestes>
                  <Bouton fort disabled={!peutEcrire || envoi} onClick={() => { setNa({ avis: "vso", observation: "" }); ouvrir({ type: "avis", visa: v }); }}>
                    {retard ? "En retard : rendre l’avis" : "Rendre l’avis"}
                  </Bouton>
                </Gestes>
              ) : null}
            </Detail>
          );
        })}
        {fenetres}
      </Partie>
    );
  }

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Chantier : situations et visas</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || !marches.length} onClick={() => {
            const m = marches[0];
            const n = m ? Math.max(0, ...situations.filter((x) => x.marche_id === m.id).map((x) => x.numero)) + 1 : 1;
            setNs({ marche_id: m?.id ?? "", numero: String(n), mois: auj.slice(0, 7), cumul: "", recue_le: auj, retenue: "", avance: "", penalites: "" });
            ouvrir({ type: "situation" });
          }}>Situation reçue</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNd({ lot_id: lots[0]?.id ?? "", document: "", indice: "A", recu_le: auj, commande_le: "" }); ouvrir({ type: "document" }); }}>Document à viser</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || !lots.length} onClick={() => { setNm({ lot_id: lots[0]?.id ?? "", titulaire: "", montant: "", avenants: "", retenue: "5", avance: "0", penalite: "" }); ouvrir({ type: "marche" }); }}>Nouveau marché</button>
        </span>
      </div>

      {!marches.length && !visas.length ? (
        <div className="lor-tableau-vide">{lots.length ? "Aucun marché de travaux : posez le marché de chaque lot pour contrôler les situations des entreprises." : "Ajoutez d’abord les lots du projet, puis le marché de chaque lot."}</div>
      ) : null}

      {aViser.map((s) => {
        const m = marcheDe(s.marche_id);
        if (!m) return null;
        const p = precedente(s);
        const total = m.montant_ht + m.avenants_ht;
        const mois = s.cumul_ht - (p ? retenu(p) : 0);
        const retard = !!s.a_viser_avant && s.a_viser_avant < auj;
        return (
          <div key={s.id} className="lor-situation" data-retard={retard || undefined}>
            <div className="lor-situation-tete">
              <strong>Situation n° {s.numero} · {m.titulaire}</strong> <span className="esp-kpi-sous">lot {lotDe(m.lot_id)?.numero ?? "—"} · reçue le {jour(s.recue_le)}</span>
              <Pastille teinte={retard ? "rouge" : "ambre"}>{retard ? `À viser depuis le ${jour(s.a_viser_avant)}` : `À viser avant le ${jour(s.a_viser_avant)}`}</Pastille>
            </div>
            <div className="lor-sous">{euros(s.cumul_ht)} HT cumulés sur {euros(total)} ({Math.round((100 * s.cumul_ht) / total)} %) · {euros(mois)} ce mois · retenue de garantie {euros(Math.round(mois * m.retenue_pct) / 100)}</div>
            {s.cumul_ht > total ? <Avis teinte="rouge">Le cumul dépasse le marché et ses avenants de <strong>{euros(s.cumul_ht - total)}</strong> : un avenant manque, ou la situation est à rectifier.</Avis> : null}
            {(() => {
              /* b5_32 : l'avancement facturé contre le dernier constaté au compte rendu */
              const a = avancementSituation(s, m, dossier);
              if (a.constate === null || !a.cr) return <div className="lor-sous lor-avancement">Avancement constaté : aucun compte rendu diffusé ne le donne pour ce lot avant la réception.</div>;
              return a.declare - a.constate > ECART_AVANCEMENT
                ? <Avis teinte="ambre">La situation facture <strong>{pct(a.declare)}</strong> d’avancement, le chantier en est à <strong>{pct(a.constate)}</strong> au compte rendu n° {a.cr.numero} du {jour(a.cr.visite_le)} : à rectifier, ou à justifier par l’entreprise.</Avis>
                : <div className="lor-sous lor-avancement">Avancement constaté : {pct(a.constate)} au compte rendu n° {a.cr.numero} du {jour(a.cr.visite_le)} (facturé {pct(a.declare)}).</div>;
            })()}
            {(() => {
              /* b5_33 : retenue, avance et pénalités recalculées */
              const mt = montantsSituation(s, m, projet);
              return (
                <>
                  {mt.ecarts.map((e) => <Avis key={e.nature} teinte="ambre">{e.texte.charAt(0).toUpperCase() + e.texte.slice(1)}.</Avis>)}
                  <div className="lor-sous lor-montants">Recalcul : retenue {eurosMt(mt.retenue_attendue)}{mt.avance ? ` · avance à rembourser ${eurosMt(mt.avance_a_rembourser)} sur ${eurosMt(mt.avance)}` : ""}{mt.penalites_applicables ? ` · pénalités ${eurosMt(mt.penalites_applicables)} (${mt.jours_retard} j)` : ""} · net attendu {eurosMt(mt.net_attendu)} HT</div>
                </>
              );
            })()}
            {p && s.cumul_ht < retenu(p) ? <Avis teinte="ambre">Le cumul recule par rapport à la situation n° {p.numero} ({euros(retenu(p))}) : à vérifier avec l’entreprise.</Avis> : null}
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setNv({ cumul: "", observation: "" }); ouvrir({ type: "viser", situation: s, rectifier: false }); }}>Viser</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => { setNv({ cumul: String(Math.min(s.cumul_ht, total)), observation: "" }); ouvrir({ type: "viser", situation: s, rectifier: true }); }}>Rectifier</button>
            </div>
          </div>
        );
      })}

      {marches.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Marchés de travaux du projet">
          <table className="esp-tableau lor-chantier">
            <thead>
              <tr><th scope="col">Lot</th><th scope="col">Titulaire</th><th scope="col">Marché + avenants HT</th><th scope="col">Avancement</th><th scope="col">Dernière situation</th></tr>
            </thead>
            <tbody>
              {marches.map((m) => {
                const d = derniere(m);
                const total = m.montant_ht + m.avenants_ht;
                const cumul = d ? retenu(d) : 0;
                const pct = Math.round((100 * cumul) / total);
                return (
                  <tr key={m.id}>
                    <td><strong>{lotDe(m.lot_id)?.numero}</strong> {lotDe(m.lot_id)?.intitule}</td>
                    <td>{m.titulaire}<span className="esp-kpi-sous"> · retenue {m.retenue_pct.toLocaleString("fr-FR")} % · {m.delai_verification_jours ?? 15} j pour viser</span></td>
                    <td>{euros(total)}{m.avenants_ht ? <span className="esp-kpi-sous"> dont {euros(m.avenants_ht)} d’avenants</span> : null}</td>
                    <td>
                      <span className="lor-jauge" data-etat={cumul > total ? "depasse" : "ok"} role="img" aria-label={`${pct} % du marché`}><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
                      <span className="esp-kpi-sous">{euros(cumul)} · {pct} %</span>
                    </td>
                    <td>{d ? <>n° {d.numero} · {d.statut === "a_viser" ? "à viser" : d.statut === "visee" ? `visée le ${jour(d.visee_le)}` : `rectifiée (${euros(d.cumul_admis_ht ?? 0)} admis)`}</> : "Aucune"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {visas.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Documents d’exécution à viser">
          <table className="esp-tableau lor-chantier">
            <thead>
              <tr><th scope="col">Document</th><th scope="col">Lot</th><th scope="col">Reçu le</th><th scope="col">À viser avant</th><th scope="col">Avis</th></tr>
            </thead>
            <tbody>
              {visas.map((v) => {
                const retard = v.avis === "a_viser" && !!v.a_viser_avant && v.a_viser_avant < auj;
                return (
                  <tr key={v.id}>
                    <td>{v.document} <span className="esp-kpi-sous">indice {v.indice}</span></td>
                    <td>{lotDe(v.lot_id)?.numero ?? "—"}</td>
                    <td>{jour(v.recu_le)}</td>
                    <td>
                      {jour(v.a_viser_avant)}{v.commande_le ? <span className="esp-kpi-sous"> · commande le {jour(v.commande_le)}</span> : null}
                      {v.avis === "a_viser" && !retard && !!v.a_viser_avant && v.a_viser_avant < plus(auj, 5) ? <> <Pastille teinte="ambre">Urgent</Pastille></> : null}
                    </td>
                    <td>
                      {v.avis === "a_viser" ? (
                        <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNa({ avis: "vso", observation: "" }); ouvrir({ type: "avis", visa: v }); }}>
                          {retard ? "En retard : rendre l’avis" : "Rendre l’avis"}
                        </button>
                      ) : (
                        <Pastille teinte={AVIS[v.avis].teinte}>{AVIS[v.avis].libelle}{v.vise_le ? ` le ${jour(v.vise_le)}` : ""}</Pastille>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {fenetres}
    </div>
  );
}
