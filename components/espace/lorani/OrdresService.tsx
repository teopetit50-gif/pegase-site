"use client";

/* Les ordres de service et leur incidence (b5_19) : par marché, le montant à date (marché + avenants + OS), la part
   du marché initial, le délai contractuel, les jours d'OS et d'arrêt, la fin contractuelle. Un OS de démarrage date
   le marché ; un arrêt suivi d'une reprise allonge le délai des jours d'arrêt ; l'entreprise a quinze jours après
   notification pour émettre ses réserves (CCAG-Travaux 2021, art. 3.8.2). Marché public : au-delà de 15 % du montant
   initial, la modification est à examiner (CCP, art. R2194-8). Base réelle : lorani_ordres_service sous la RLS, le
   socle numérote, date et alerte ; le calcul affiché ici est celui de la vue lorani_os_incidence, refait sur les
   lignes chargées. */

import { useMemo, useState } from "react";
import { FileSignature } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { changerOs, emettreOs, poserDelaiMarche } from "./portes";
import type { Dossier, Marche, NatureOs, OrdreService, Projet } from "./types";

const NATURES: Record<NatureOs, string> = {
  demarrage: "Démarrage",
  travaux_modificatifs: "Travaux modificatifs",
  travaux_supplementaires: "Travaux supplémentaires",
  arret: "Arrêt de chantier",
  reprise: "Reprise",
  autre: "Autre",
};
const STATUTS: Record<OrdreService["statut"], { libelle: string; teinte: "gris" | "vert" | "ambre" | "rouge" }> = {
  emis: { libelle: "Émis", teinte: "gris" },
  signe: { libelle: "Signé", teinte: "vert" },
  signe_reserves: { libelle: "Signé avec réserves", teinte: "ambre" },
  refuse: { libelle: "Refusé", teinte: "rouge" },
};
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
};
const ecart = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86400000);
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

/* l'incidence, comme la vue lorani_os_incidence et private.lorani_fin_contractuelle */
export function incidence(m: Marche, os: OrdreService[]) {
  const valides = os.filter((o) => o.marche_id === m.id && o.statut !== "refuse");
  const osMontant = valides.reduce((n, o) => n + o.montant_ht, 0);
  const osJours = valides.filter((o) => o.nature !== "arret" && o.nature !== "reprise").reduce((n, o) => n + o.delai_jours, 0);
  const date = (o: OrdreService) => o.notifie_le ?? o.emis_le;
  const arrets = valides.filter((o) => o.nature === "arret").sort((a, b) => date(a).localeCompare(date(b)));
  const reprises = valides.filter((o) => o.nature === "reprise").map(date).sort();
  const arretJours = arrets.reduce((n, a) => n + Math.max(0, ecart(date(a), reprises.find((r) => r >= date(a)) ?? aujourdhui())), 0);
  const enArret = arrets.some((a) => !reprises.some((r) => r >= date(a)));
  const part = Math.round((1000 * (m.avenants_ht + osMontant)) / m.montant_ht) / 10;
  const fin = m.demarrage_le && m.delai_execution_jours ? plus(m.demarrage_le, m.delai_execution_jours + osJours + arretJours) : null;
  return { osMontant, osJours, arretJours, enArret, part, montant: m.montant_ht + m.avenants_ht + osMontant, fin };
}

type Form = { type: "os"; marche: Marche } | { type: "statut"; os: OrdreService } | { type: "delai"; marche: Marche } | null;

export default function OrdresService({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id), [dossier.lots, projet.id]);
  const marches = useMemo(() => dossier.marches.filter((m) => m.projet_id === projet.id && m.actif)
    .sort((a, b) => (lots.find((l) => l.id === a.lot_id)?.numero ?? "").localeCompare(lots.find((l) => l.id === b.lot_id)?.numero ?? "")), [dossier.marches, projet.id, lots]);
  const os = useMemo(() => dossier.ordresService.filter((o) => o.projet_id === projet.id), [dossier.ordresService, projet.id]);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const auj = aujourdhui();
  const [no, setNo] = useState({ nature: "travaux_modificatifs" as NatureOs, objet: "", emis_le: auj, notifie_le: "", montant: "", jours: "" });
  const [ns, setNs] = useState({ statut: "signe" as OrdreService["statut"], reserves: "" });
  const [nd, setNd] = useState("");
  const clientId = dossier.moi?.client_id ?? "";
  const seuil = projet.marche_public ? 15 : 10;

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

  const soumettreOs = () => {
    if (form?.type !== "os") return;
    const m = form.marche;
    const neutre = no.nature === "demarrage" || no.nature === "arret" || no.nature === "reprise";
    const v = { client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, marche_id: m.id, nature: no.nature, objet: no.objet.trim().replace(/\s+/g, " "), emis_le: no.emis_le, notifie_le: no.notifie_le || null,
      montant_ht: neutre ? 0 : nombre(no.montant || "0"), delai_jours: neutre ? 0 : Math.round(nombre(no.jours || "0")) };
    const numero = Math.max(0, ...os.filter((o) => o.marche_id === m.id).map((o) => o.numero)) + 1;
    return lancer(() => emettreOs(v), () => ({
      ...dossier,
      ordresService: [...dossier.ordresService, { id: `local-os-${Date.now()}`, ...v, numero, statut: "emis", reserves_entreprise: null, reserves_jusquau: v.notifie_le ? plus(v.notifie_le, 15) : null }],
      marches: v.nature === "demarrage" ? dossier.marches.map((x) => (x.id === m.id ? { ...x, demarrage_le: v.notifie_le ?? v.emis_le } : x)) : dossier.marches,
    }));
  };
  const soumettreStatut = () => {
    if (form?.type !== "statut") return;
    const v = { statut: ns.statut, reserves_entreprise: ns.statut === "signe_reserves" ? ns.reserves.trim() : null };
    return lancer(() => changerOs(form.os.id, v), () => ({ ...dossier, ordresService: dossier.ordresService.map((o) => (o.id === form.os.id ? { ...o, ...v } : o)) }));
  };
  const soumettreDelai = () => {
    if (form?.type !== "delai") return;
    const j = nd.trim() ? Math.round(nombre(nd)) : null;
    return lancer(() => poserDelaiMarche(form.marche.id, j), () => ({ ...dossier, marches: dossier.marches.map((x) => (x.id === form.marche.id ? { ...x, delai_execution_jours: j } : x)) }));
  };

  const neutre = no.nature === "demarrage" || no.nature === "arret" || no.nature === "reprise";
  const osOk = form?.type === "os" && no.objet.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(no.emis_le) && (!no.notifie_le || no.notifie_le >= no.emis_le)
    && (neutre || (!Number.isNaN(nombre(no.montant || "0")) && !Number.isNaN(nombre(no.jours || "0"))));
  const statutOk = ns.statut !== "signe_reserves" || ns.reserves.trim().length >= 3;
  const delaiOk = !nd.trim() || (Number.isInteger(nombre(nd)) && nombre(nd) >= 1 && nombre(nd) <= 3650);

  if (!marches.length) return null;
  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre"><span>Ordres de service</span></div>
      {marches.map((m) => {
        const inc = incidence(m, os);
        const liste = os.filter((o) => o.marche_id === m.id).sort((a, b) => a.numero - b.numero);
        const lot = lots.find((l) => l.id === m.lot_id);
        return (
          <div key={m.id} className="lor-os">
            <div className="lor-situation-tete">
              <strong>Lot {lot?.numero ?? "—"} · {m.titulaire}</strong>
              {inc.enArret ? <Pastille teinte="ambre">Chantier à l’arrêt</Pastille> : null}
              <span className="esp-item-haut">
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNd(m.delai_execution_jours ? String(m.delai_execution_jours) : ""); ouvrir({ type: "delai", marche: m }); }}>Délai du marché</button>
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNo({ nature: liste.some((o) => o.nature === "demarrage") ? "travaux_modificatifs" : "demarrage", objet: "", emis_le: auj, notifie_le: "", montant: "", jours: "" }); ouvrir({ type: "os", marche: m }); }}>Émettre un OS</button>
              </span>
            </div>
            <div className="lor-sous">
              {euros(inc.montant)} HT à date ({inc.part > 0 ? "+" : ""}{inc.part.toLocaleString("fr-FR")} % du marché initial de {euros(m.montant_ht)}{m.avenants_ht ? `, avenants compris` : ""})
              {" · "}{m.delai_execution_jours ? `délai ${m.delai_execution_jours} j` : "délai du marché non renseigné"}
              {inc.osJours ? ` ${inc.osJours > 0 ? "+" : ""}${inc.osJours} j d’OS` : ""}{inc.arretJours ? ` + ${inc.arretJours} j d’arrêt` : ""}
              {" · "}{m.demarrage_le ? `démarré le ${jour(m.demarrage_le)}` : "pas d’OS de démarrage"}
              {inc.fin ? ` · fin contractuelle le ${jour(inc.fin)}` : ""}
            </div>
            {Math.abs(inc.part) > seuil ? (
              <Avis teinte="ambre">
                OS cumulés : {inc.part > 0 ? "+" : ""}{inc.part.toLocaleString("fr-FR")} % du marché initial.{" "}
                {projet.marche_public ? "Au-delà de 15 %, la modification d’un marché public de travaux est à examiner (CCP, art. R2194-8)." : "Un avenant est à envisager."}
              </Avis>
            ) : null}
            {liste.length ? (
              <ul className="lor-liste">
                {liste.map((o) => (
                  <li key={o.id}>
                    <span><strong>OS n° {o.numero}</strong> · {NATURES[o.nature]} · {o.objet}</span>
                    <span className="esp-kpi-sous">
                      {" "}émis le {jour(o.emis_le)}{o.notifie_le ? `, notifié le ${jour(o.notifie_le)}` : ""}
                      {o.montant_ht ? ` · ${o.montant_ht > 0 ? "+" : ""}${euros(o.montant_ht)} HT` : ""}{o.delai_jours ? ` · ${o.delai_jours > 0 ? "+" : ""}${o.delai_jours} j` : ""}
                      {o.statut === "emis" && o.reserves_jusquau ? ` · réserves de l’entreprise possibles jusqu’au ${jour(o.reserves_jusquau)}` : ""}
                      {o.reserves_entreprise ? ` · réserves : ${o.reserves_entreprise}` : ""}
                    </span>{" "}
                    <Pastille teinte={STATUTS[o.statut].teinte}>{STATUTS[o.statut].libelle}</Pastille>{" "}
                    {o.statut === "emis" ? <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNs({ statut: "signe", reserves: "" }); ouvrir({ type: "statut", os: o }); }}>Retour de l’entreprise</button> : null}
                  </li>
                ))}
              </ul>
            ) : <div className="lor-tableau-vide">Aucun ordre de service.</div>}
          </div>
        );
      })}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— émettre un OS ——— */}
      <Dialog open={form?.type === "os"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Émettre un ordre de service</DialogTitle>
            <DialogDescription>{form?.type === "os" ? `${form.marche.titulaire}. ` : ""}Son incidence sur le montant et sur le délai est ajoutée au marché ; l’entreprise a quinze jours après la notification pour émettre ses réserves.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nature
                <select className="rv-champ" value={no.nature} onChange={(e) => setNo((s) => ({ ...s, nature: e.target.value as NatureOs }))}>
                  {(Object.keys(NATURES) as NatureOs[]).map((n) => <option key={n} value={n}>{NATURES[n]}</option>)}
                </select>
              </label>
              <label className="rv-libelle">Objet <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={no.objet} maxLength={300} onChange={(e) => setNo((s) => ({ ...s, objet: e.target.value }))} placeholder="Reprise en sous-œuvre du mur mitoyen" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Émis le
                  <input className="rv-champ" type="date" value={no.emis_le} onChange={(e) => setNo((s) => ({ ...s, emis_le: e.target.value }))} />
                </label>
                <label className="rv-libelle">Notifié le
                  <input className="rv-champ" type="date" min={no.emis_le} value={no.notifie_le} onChange={(e) => setNo((s) => ({ ...s, notifie_le: e.target.value }))} />
                </label>
              </div>
              {!neutre ? (
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Incidence HT (€)
                    <input className="rv-champ" inputMode="decimal" value={no.montant} onChange={(e) => setNo((s) => ({ ...s, montant: e.target.value }))} placeholder="38 000 (ou −2 500)" />
                  </label>
                  <label className="rv-libelle">Incidence sur le délai (jours)
                    <input className="rv-champ" inputMode="numeric" value={no.jours} onChange={(e) => setNo((s) => ({ ...s, jours: e.target.value }))} placeholder="15" />
                  </label>
                </div>
              ) : <p className="lor-sous">{no.nature === "demarrage" ? "La date de notification (ou d’émission) devient la date de démarrage du marché." : "Un arrêt suivi d’une reprise allonge le délai des jours d’arrêt."}</p>}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!osOk || envoi} onClick={soumettreOs}>{envoi ? <Loader variant="spin" /> : null} Émettre</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— retour de l'entreprise ——— */}
      <Dialog open={form?.type === "statut"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Retour de l’entreprise sur l’OS n° {form?.type === "statut" ? form.os.numero : ""}</DialogTitle>
            <DialogDescription>Signé, signé avec réserves (le texte des réserves est obligatoire) ou refusé. Un OS refusé ne compte plus dans l’incidence.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Retour
                <select className="rv-champ" value={ns.statut} onChange={(e) => setNs((s) => ({ ...s, statut: e.target.value as OrdreService["statut"] }))}>
                  <option value="signe">Signé</option>
                  <option value="signe_reserves">Signé avec réserves</option>
                  <option value="refuse">Refusé</option>
                </select>
              </label>
              {ns.statut === "signe_reserves" ? (
                <label className="rv-libelle">Réserves de l’entreprise <span className="esp-obligatoire">(obligatoire)</span>
                  <textarea className="rv-champ" rows={3} maxLength={1000} value={ns.reserves} onChange={(e) => setNs((s) => ({ ...s, reserves: e.target.value }))} placeholder="Prix unitaire contesté" />
                </label>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!statutOk || envoi} onClick={soumettreStatut}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— le délai du marché ——— */}
      <Dialog open={form?.type === "delai"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Délai d’exécution du marché</DialogTitle>
            <DialogDescription>{form?.type === "delai" ? `${form.marche.titulaire}. ` : ""}En jours calendaires, à compter de l’OS de démarrage.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Délai (jours)
                <input className="rv-champ" inputMode="numeric" value={nd} onChange={(e) => setNd(e.target.value)} placeholder="240" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!delaiOk || envoi} onClick={soumettreDelai}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
