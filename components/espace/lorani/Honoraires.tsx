"use client";

/* Les honoraires du projet, phase par phase (b5_12) : le temps passé rapporté aux honoraires de chaque élément de
   mission, de l'esquisse à la réception. Une phase qui consomme plus que prévu remonte avant la fin de la mission.
   Base réelle : lorani_honoraires et lorani_temps sous la RLS (chacun saisit ses temps, qui écrit sur le projet
   pose et achève les éléments) ; les alertes 80 % / 100 % et l'appel d'honoraires viennent du socle. Exemple : les
   saisies s'appliquent en mémoire. */

import { useMemo, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { changerHonoraire, poserHonoraire, saisirTemps } from "./portes";
import type { Dossier, ElementMission, Honoraire, Projet } from "./types";

export const ELEMENTS: { cle: ElementMission; libelle: string; court: string }[] = [
  { cle: "diag", libelle: "Diagnostic", court: "DIAG" },
  { cle: "esq", libelle: "Esquisse", court: "ESQ" },
  { cle: "aps", libelle: "Avant-projet sommaire", court: "APS" },
  { cle: "apd", libelle: "Avant-projet définitif", court: "APD" },
  { cle: "pc", libelle: "Dossier de permis", court: "PC" },
  { cle: "pro", libelle: "Projet", court: "PRO" },
  { cle: "dce", libelle: "Dossier de consultation", court: "DCE" },
  { cle: "act", libelle: "Assistance aux contrats de travaux", court: "ACT" },
  { cle: "visa", libelle: "Visa", court: "VISA" },
  { cle: "exe", libelle: "Études d’exécution", court: "EXE" },
  { cle: "det", libelle: "Direction de l’exécution des travaux", court: "DET" },
  { cle: "opc", libelle: "Ordonnancement, pilotage, coordination", court: "OPC" },
  { cle: "aor", libelle: "Assistance aux opérations de réception", court: "AOR" },
  { cle: "autre", libelle: "Autre élément", court: "AUTRE" },
];
const RANG = Object.fromEntries(ELEMENTS.map((e, i) => [e.cle, i])) as Record<ElementMission, number>;
const libelle = (h: Honoraire) => h.intitule ?? ELEMENTS[RANG[h.element]]?.libelle ?? h.element;
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const heures = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

type Ligne = Honoraire & { passees: number; conso: number | null; etat: "ok" | "a_surveiller" | "depasse"; taux: number | null };

export default function Honoraires({ projet, dossier, nommer, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  nommer: (id: string | null | undefined) => string;
  peutEcrire: boolean;
  /* la saisie : en base réelle la porte puis la relecture, en exemple la mise à jour en mémoire ; lève l'erreur de la base */
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lignes = useMemo<Ligne[]>(() => dossier.honoraires
    .filter((h) => h.projet_id === projet.id)
    .map((h) => {
      const passees = dossier.temps.filter((t) => t.honoraire_id === h.id).reduce((s, t) => s + t.heures, 0);
      const conso = h.heures_prevues > 0 ? Math.round((100 * passees) / h.heures_prevues) : null;
      const etat: Ligne["etat"] = h.heures_prevues > 0 && passees >= h.heures_prevues ? "depasse" : h.heures_prevues > 0 && passees >= 0.8 * h.heures_prevues ? "a_surveiller" : "ok";
      return { ...h, passees, conso, etat, taux: passees > 0 && h.montant_ht > 0 ? h.montant_ht / passees : null };
    })
    .sort((a, b) => RANG[a.element] - RANG[b.element] || (a.intitule ?? "").localeCompare(b.intitule ?? "")), [dossier.honoraires, dossier.temps, projet.id]);
  const temps = useMemo(() => dossier.temps.filter((t) => t.projet_id === projet.id).sort((a, b) => b.jour.localeCompare(a.jour)), [dossier.temps, projet.id]);
  const total = lignes.reduce((s, l) => s + l.montant_ht, 0);
  const prevues = lignes.reduce((s, l) => s + l.heures_prevues, 0);
  const passees = lignes.reduce((s, l) => s + l.passees, 0);
  const facture = lignes.filter((l) => l.statut === "facturee").reduce((s, l) => s + l.montant_ht, 0);
  const aAppeler = lignes.filter((l) => l.statut === "achevee");
  const alerte = lignes.filter((l) => l.etat !== "ok" && (l.statut === "en_cours" || l.statut === "a_venir"));

  const [form, setForm] = useState<"element" | "temps" | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ne, setNe] = useState({ element: "esq" as ElementMission, intitule: "", montant: "", heures: "" });
  const [nt, setNt] = useState({ honoraire_id: "", jour: aujourdhui(), heures: "", note: "" });
  const clientId = dossier.moi?.client_id ?? "";
  const moi = dossier.moi?.user_id ?? null;

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

  const ouvrirTemps = () => {
    const enCours = lignes.find((l) => l.statut === "en_cours") ?? lignes.find((l) => l.statut === "a_venir") ?? lignes[0];
    setNt({ honoraire_id: enCours?.id ?? "", jour: aujourdhui(), heures: "", note: "" });
    setErreur(null);
    setForm("temps");
  };
  const elementOk = (ne.element !== "autre" || ne.intitule.trim().length > 0) && nombre(ne.montant || "0") >= 0 && !Number.isNaN(nombre(ne.montant || "0")) && !Number.isNaN(nombre(ne.heures || "0")) && nombre(ne.heures || "0") >= 0
    && !lignes.some((l) => l.element === ne.element && (ne.element !== "autre" || (l.intitule ?? "") === ne.intitule.trim()));
  const h = nombre(nt.heures);
  const tempsOk = !!nt.honoraire_id && /^\d{4}-\d{2}-\d{2}$/.test(nt.jour) && nt.jour <= aujourdhui() && h > 0 && h <= 24;

  const soumettreElement = () => {
    const v = { client_id: clientId, projet_id: projet.id, element: ne.element, intitule: ne.element === "autre" ? ne.intitule.trim() : null, montant_ht: nombre(ne.montant || "0"), heures_prevues: nombre(ne.heures || "0") };
    return lancer(
      () => poserHonoraire(v),
      () => ({ ...dossier, honoraires: [...dossier.honoraires, { id: `local-${Date.now()}`, projet_id: projet.id, element: v.element, intitule: v.intitule, montant_ht: v.montant_ht, heures_prevues: v.heures_prevues, statut: "a_venir", achevee_le: null, facturee_le: null }] }),
    );
  };
  const soumettreTemps = () => {
    const v = { client_id: clientId, projet_id: projet.id, honoraire_id: nt.honoraire_id, jour: nt.jour, heures: h, note: nt.note.trim() || null };
    return lancer(
      () => saisirTemps(v),
      () => ({
        ...dossier,
        temps: [{ id: `local-${Date.now()}`, projet_id: projet.id, honoraire_id: v.honoraire_id, membre: moi ?? "", jour: v.jour, heures: v.heures, note: v.note }, ...dossier.temps],
        honoraires: dossier.honoraires.map((x) => (x.id === v.honoraire_id && x.statut === "a_venir" ? { ...x, statut: "en_cours" as const } : x)),
      }),
    );
  };
  const changerStatut = (l: Ligne, statut: Honoraire["statut"]) => lancer(
    () => changerHonoraire(l.id, { statut }),
    () => ({ ...dossier, honoraires: dossier.honoraires.map((x) => (x.id === l.id ? { ...x, statut, achevee_le: x.achevee_le ?? aujourdhui(), facturee_le: statut === "facturee" ? aujourdhui() : x.facturee_le } : x)) }),
  );

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Honoraires et temps passés</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!lignes.length || !moi || envoi} onClick={ouvrirTemps}>Saisir du temps</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNe({ element: ELEMENTS.find((e) => !lignes.some((l) => l.element === e.cle))?.cle ?? "autre", intitule: "", montant: "", heures: "" }); setErreur(null); setForm("element"); }}>Ajouter un élément</button>
        </span>
      </div>
      {lignes.length ? (
        <>
          <p className="lor-sous lor-honoraires-total">
            {euros(total)} HT d&apos;honoraires · {heures(passees)} passées sur {heures(prevues)} prévues · {euros(facture)} facturés
            {aAppeler.length ? ` · ${aAppeler.length} appel${aAppeler.length > 1 ? "s" : ""} d’honoraires à émettre (${euros(aAppeler.reduce((s, l) => s + l.montant_ht, 0))} HT)` : ""}
          </p>
          {alerte.map((l) => (
            <Avis key={l.id} teinte={l.etat === "depasse" ? "rouge" : "ambre"}>
              <strong>{libelle(l)}</strong> : {heures(l.passees)} pour {heures(l.heures_prevues)} prévues ({l.conso} %){l.etat === "depasse" ? ", les honoraires de la phase sont dépassés" : ", avant la fin de la phase"}
              {l.taux ? ` ; taux réalisé ${euros(Math.round(l.taux))} HT de l’heure` : ""}.
            </Avis>
          ))}
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Honoraires par élément de mission">
            <table className="esp-tableau lor-honoraires">
              <thead>
                <tr><th scope="col">Élément</th><th scope="col">Honoraires HT</th><th scope="col">Temps passé</th><th scope="col">Taux réalisé</th><th scope="col">État</th><th scope="col"><span className="sr-only">Action</span></th></tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{ELEMENTS[RANG[l.element]]?.court}</strong> {libelle(l)}</td>
                    <td>{euros(l.montant_ht)}</td>
                    <td>
                      <span className="lor-jauge" data-etat={l.etat === "a_surveiller" && (l.statut === "achevee" || l.statut === "facturee") ? "ok" : l.etat} role="img" aria-label={l.conso === null ? "sans heures prévues" : `${l.conso} % des heures prévues`}>
                        <span style={{ width: `${Math.min(100, l.conso ?? 0)}%` }} />
                      </span>
                      <span className="esp-kpi-sous">{heures(l.passees)} / {heures(l.heures_prevues)}{l.conso !== null ? ` · ${l.conso} %` : ""}</span>
                    </td>
                    <td>{l.taux ? `${euros(Math.round(l.taux))} / h` : "—"}</td>
                    <td>
                      {l.statut === "facturee" ? <Pastille teinte="vert">Facturé{l.facturee_le ? ` le ${dateCourte(`${l.facturee_le}T12:00:00`)}` : ""}</Pastille>
                        : l.statut === "achevee" ? <Pastille teinte="ambre">Achevé, appel à émettre</Pastille>
                        : l.etat === "depasse" ? <Pastille teinte="rouge">Dépassé</Pastille>
                        : l.etat === "a_surveiller" ? <Pastille teinte="ambre">À surveiller</Pastille>
                        : l.statut === "en_cours" ? <Pastille teinte="bleu">En cours</Pastille>
                        : <Pastille teinte="gris">À venir</Pastille>}
                    </td>
                    <td>
                      {l.statut === "en_cours" || l.statut === "a_venir" ? (
                        <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => changerStatut(l, "achevee")}>Achevé</button>
                      ) : l.statut === "achevee" ? (
                        <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => changerStatut(l, "facturee")}>Facturé</button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {temps.length ? (
            <details className="lor-temps-recents">
              <summary>Derniers temps saisis ({temps.length})</summary>
              <ul className="esp-fil">
                {temps.slice(0, 12).map((t) => {
                  const e = lignes.find((l) => l.id === t.honoraire_id);
                  return (
                    <li key={t.id}>
                      <span className="esp-fil-point" data-teinte="gris" />
                      <div>
                        <div className="esp-fil-texte">{heures(t.heures)} · {e ? libelle(e) : "élément"} · {nommer(t.membre)}</div>
                        <div className="esp-fil-meta">{dateCourte(`${t.jour}T12:00:00`)}{t.note ? ` · ${t.note}` : ""}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <div className="lor-tableau-vide">Aucun élément de mission : posez les honoraires de chaque phase (esquisse, APS, APD…) pour suivre le temps passé.</div>
      )}

      <Dialog open={form === "element"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un élément de mission</DialogTitle>
            <DialogDescription>Les honoraires HT de la phase et le temps que vous comptez y passer. Lorani prévient le chef de projet à 80 % et à 100 % des heures prévues.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Élément
                  <select className="rv-champ" value={ne.element} onChange={(e) => setNe((s) => ({ ...s, element: e.target.value as ElementMission }))}>
                    {ELEMENTS.map((e) => <option key={e.cle} value={e.cle}>{e.court} · {e.libelle}</option>)}
                  </select>
                </label>
                {ne.element === "autre" ? (
                  <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                    <input className="rv-champ" value={ne.intitule} maxLength={120} onChange={(e) => setNe((s) => ({ ...s, intitule: e.target.value }))} placeholder="Mission complémentaire" />
                  </label>
                ) : null}
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Honoraires HT (€)
                  <input className="rv-champ" inputMode="decimal" value={ne.montant} onChange={(e) => setNe((s) => ({ ...s, montant: e.target.value }))} placeholder="4 200" />
                </label>
                <label className="rv-libelle">Heures prévues
                  <input className="rv-champ" inputMode="decimal" value={ne.heures} onChange={(e) => setNe((s) => ({ ...s, heures: e.target.value }))} placeholder="52" />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!elementOk || envoi} onClick={soumettreElement}>{envoi ? <Loader variant="spin" /> : null} Ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form === "temps"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Clock width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Saisir du temps</DialogTitle>
            <DialogDescription>Le temps passé sur un élément de mission de « {projet.nom} », à votre nom. Une saisie se corrige, elle ne s&apos;efface pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Élément
                <select className="rv-champ" value={nt.honoraire_id} onChange={(e) => setNt((s) => ({ ...s, honoraire_id: e.target.value }))}>
                  {lignes.filter((l) => l.statut !== "facturee").map((l) => <option key={l.id} value={l.id}>{ELEMENTS[RANG[l.element]]?.court} · {libelle(l)}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Jour
                  <input className="rv-champ" type="date" max={aujourdhui()} value={nt.jour} onChange={(e) => setNt((s) => ({ ...s, jour: e.target.value }))} />
                </label>
                <label className="rv-libelle">Heures
                  <input className="rv-champ" inputMode="decimal" value={nt.heures} onChange={(e) => setNt((s) => ({ ...s, heures: e.target.value }))} placeholder="3,5" />
                </label>
              </div>
              <label className="rv-libelle">Note
                <input className="rv-champ" value={nt.note} maxLength={300} onChange={(e) => setNt((s) => ({ ...s, note: e.target.value }))} placeholder="Plans au 1/50" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!tempsOk || envoi} onClick={soumettreTemps}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
