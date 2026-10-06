"use client";

/* Les assurances décennales des entreprises (b5_18) : chaque attestation, lue ou saisie, contrôlée contre le lot —
   activités requises couvertes, date d'ouverture du chantier dans la période de validité (C. assur., art. L241-1),
   plafond au moins égal au marché, assuré = entreprise. La fin de validité est une échéance du registre (rappels
   J-30, J-7, J). Base réelle : lorani_attestations sous la RLS, le trigger du socle fait le contrôle et la date en
   reste au journal ; ici on saisit, on corrige, on règle les activités des lots et la date d'ouverture. Exemple : les
   saisies s'appliquent en mémoire, avec le même contrôle refait dans le navigateur. */

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { ACTIVITES, libelleActivite } from "./etats";
import { changerActivitesLot, corrigerAttestation, poserOuvertureChantier, saisirAttestation, type SaisieAttestation } from "./portes";
import type { Attestation, ConstatAttestation, Dossier, Lot, Projet } from "./types";

const STATUTS: Record<Attestation["statut"], { libelle: string; teinte: "vert" | "rouge" | "ambre" | "gris" }> = {
  conforme: { libelle: "Conforme", teinte: "vert" },
  non_conforme: { libelle: "Non conforme", teinte: "rouge" },
  expiree: { libelle: "Échue", teinte: "rouge" },
  a_verifier: { libelle: "À vérifier", teinte: "gris" },
};
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nomComparable = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(sas|sasu|sarl|eurl|sa|sci|snc|scop|ets|etablissements|entreprise|societe)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

/* le contrôle du socle (private.lorani_attestation_verifier), refait pour l'exemple */
function controler(a: Omit<Attestation, "statut" | "constats" | "verifie_le">, projet: Projet, dossier: Dossier): Pick<Attestation, "statut" | "constats" | "verifie_le" | "lot_id"> {
  const ent = dossier.intervenants.find((i) => i.id === a.intervenant_id);
  const lotId = a.lot_id ?? ent?.lot_id ?? null;
  const lot = dossier.lots.find((l) => l.id === lotId);
  const c: ConstatAttestation[] = [];
  if (lot && lot.activites_requises.length) {
    const manque = lot.activites_requises.filter((x) => !a.activites.includes(x));
    if (manque.length) c.push({ code: "activite", gravite: "bloquant", texte: `Activité${manque.length > 1 ? "s" : ""} du lot ${lot.numero} non couverte${manque.length > 1 ? "s" : ""} : ${manque.map(libelleActivite).join(", ")}.`, activites: manque });
  } else if (lot) c.push({ code: "activites_lot", gravite: "mineur", texte: `Les activités requises du lot ${lot.numero} ne sont pas renseignées : la couverture ne peut pas être vérifiée.` });
  const date = projet.ouverture_chantier ?? aujourdhui();
  if (!a.debut || !a.fin) c.push({ code: "periode", gravite: "majeur", texte: "La période de validité n’est pas lisible sur l’attestation." });
  else if (date < a.debut || date > a.fin) c.push({ code: "periode", gravite: "bloquant", texte: `${projet.ouverture_chantier ? "Ouverture du chantier" : "Date du contrôle"} (${jour(date)}) hors de la période de validité de l’attestation (du ${jour(a.debut)} au ${jour(a.fin)}).` });
  if (a.plafond_eur && lotId) {
    const m = dossier.marches.filter((x) => x.lot_id === lotId && x.actif);
    const marche = Math.max(0, ...m.filter((x) => m.length === 1 || !ent || nomComparable(x.titulaire) === nomComparable(ent.organisme)).map((x) => x.montant_ht + x.avenants_ht));
    if (marche && a.plafond_eur < marche) c.push({ code: "plafond", gravite: "majeur", texte: `Plafond de garantie (${euros(a.plafond_eur)}) inférieur au marché du lot (${euros(marche)} HT).` });
  }
  if (!ent) c.push({ code: "entreprise", gravite: "majeur", texte: "Entreprise non reconnue parmi les intervenants du projet : rattachez l’attestation." });
  const statut: Attestation["statut"] = a.fin && a.fin < aujourdhui() ? "expiree" : c.some((x) => x.gravite !== "mineur") ? "non_conforme" : "conforme";
  return { statut, constats: c, verifie_le: new Date().toISOString(), lot_id: lotId };
}

type Form =
  | { type: "attestation"; attestation: Attestation | null }
  | { type: "activites"; lot: Lot }
  | { type: "ouverture" }
  | null;

export default function Assurances({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero)), [dossier.lots, projet.id]);
  const entreprises = useMemo(() => dossier.intervenants.filter((i) => i.projet_id === projet.id && i.actif && i.nature === "entreprise"), [dossier.intervenants, projet.id]);
  const attestations = useMemo(() => dossier.attestations.filter((a) => a.projet_id === projet.id)
    .sort((a, b) => (lots.find((l) => l.id === a.lot_id)?.numero ?? "zz").localeCompare(lots.find((l) => l.id === b.lot_id)?.numero ?? "zz") || (b.fin ?? "").localeCompare(a.fin ?? "")), [dossier.attestations, projet.id, lots]);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [na, setNa] = useState({ intervenant_id: "", assureur: "", numero_police: "", debut: "", fin: "", plafond: "", activites: [] as string[] });
  const [nl, setNl] = useState<string[]>([]);
  const [no, setNo] = useState("");
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
  /* l'exemple : chaque attestation du projet est recontrôlée après un changement (lot, ouverture, marché) */
  const recontroler = (d: Dossier, p: Projet = projet): Dossier => ({ ...d, attestations: d.attestations.map((a) => (a.projet_id === p.id ? { ...a, ...controler(a, p, d) } : a)) });

  const ouvrirAttestation = (a: Attestation | null) => {
    setNa(a
      ? { intervenant_id: a.intervenant_id ?? "", assureur: a.assureur ?? "", numero_police: a.numero_police ?? "", debut: a.debut ?? "", fin: a.fin ?? "", plafond: a.plafond_eur ? String(a.plafond_eur) : "", activites: a.activites }
      : { intervenant_id: entreprises[0]?.id ?? "", assureur: "", numero_police: "", debut: "", fin: "", plafond: "", activites: [] });
    ouvrir({ type: "attestation", attestation: a });
  };
  const soumettreAttestation = () => {
    if (form?.type !== "attestation") return;
    const v: SaisieAttestation = {
      intervenant_id: na.intervenant_id || null, assureur: na.assureur.trim() || null, numero_police: na.numero_police.trim() || null, activites: na.activites,
      debut: na.debut || null, fin: na.fin || null, plafond_eur: na.plafond.trim() ? Number(na.plafond.replace(/\s/g, "").replace(",", ".")) : null,
    };
    const prec = form.attestation;
    return lancer(
      () => (prec ? corrigerAttestation(prec.id, v) : saisirAttestation({ ...v, client_id: clientId, projet_id: projet.id, entite_id: projet.entite_id })),
      () => {
        const base = { id: prec?.id ?? `local-attestation-${Date.now()}`, projet_id: projet.id, lot_id: prec?.lot_id ?? null, piece_id: prec?.piece_id ?? null, assure: prec?.assure ?? null, siren: prec?.siren ?? null, ...v };
        const nouvelle: Attestation = { ...base, ...controler({ ...base, lot_id: null }, projet, dossier) };
        return { ...dossier, attestations: prec ? dossier.attestations.map((x) => (x.id === prec.id ? nouvelle : x)) : [nouvelle, ...dossier.attestations] };
      },
    );
  };
  const soumettreActivites = () => {
    if (form?.type !== "activites") return;
    const lot = form.lot;
    return lancer(() => changerActivitesLot(lot.id, nl), () => recontroler({ ...dossier, lots: dossier.lots.map((l) => (l.id === lot.id ? { ...l, activites_requises: [...nl].sort() } : l)) }));
  };
  const soumettreOuverture = () => {
    const date = no || null;
    const p = { ...projet, ouverture_chantier: date };
    return lancer(() => poserOuvertureChantier(projet.id, date), () => recontroler({ ...dossier, projets: dossier.projets.map((x) => (x.id === projet.id ? p : x)) }, p));
  };

  const plafondOk = !na.plafond.trim() || Number(na.plafond.replace(/\s/g, "").replace(",", ".")) > 0;
  const attestationOk = form?.type === "attestation" && na.assureur.trim().length > 0 && (!na.debut || !na.fin || na.fin >= na.debut) && plafondOk;
  const sansAttestation = lots.filter((l) => !attestations.some((a) => a.lot_id === l.id));

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Assurances décennales des entreprises</span>
        <span className="esp-item-haut">
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNo(projet.ouverture_chantier ?? ""); ouvrir({ type: "ouverture" }); }}>Ouverture du chantier</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || !entreprises.length} onClick={() => ouvrirAttestation(null)}>Saisir une attestation</button>
        </span>
      </div>
      <p className="lor-sous">
        {projet.ouverture_chantier
          ? `Chantier ouvert le ${jour(projet.ouverture_chantier)} : chaque attestation doit couvrir cette date.`
          : "Date d’ouverture du chantier non renseignée : les attestations sont contrôlées à la date du jour."}
        {" "}Déposez une attestation comme « Attestation décennale d’une entreprise » : Lorani la lit et la contrôle seul.
      </p>

      {!entreprises.length && !attestations.length ? (
        <div className="lor-tableau-vide">Aucune entreprise parmi les intervenants : ajoutez les entreprises retenues (avec leur lot et leur SIREN), puis leurs attestations.</div>
      ) : null}

      {attestations.map((a) => {
        const ent = dossier.intervenants.find((i) => i.id === a.intervenant_id);
        const lot = lots.find((l) => l.id === a.lot_id);
        return (
          <div key={a.id} className="lor-constat" data-gravite={a.statut === "conforme" ? undefined : "bloquant"}>
            <div className="lor-situation-tete">
              <Pastille teinte={STATUTS[a.statut].teinte}>{STATUTS[a.statut].libelle}</Pastille>
              <strong>{lot ? `Lot ${lot.numero} · ` : ""}{ent?.organisme ?? a.assure ?? "Entreprise à rattacher"}</strong>
            </div>
            <div className="lor-sous">
              {[a.assureur, a.numero_police ? `contrat ${a.numero_police}` : null, a.debut || a.fin ? `du ${jour(a.debut)} au ${jour(a.fin)}` : null, a.plafond_eur ? `plafond ${euros(a.plafond_eur)}` : null].filter(Boolean).join(" · ")}
            </div>
            <div className="lor-sous">Activités garanties : {a.activites.length ? a.activites.map(libelleActivite).join(", ") : "aucune lue"}.</div>
            {a.constats.length ? (
              <ul className="lor-citations" aria-label="Ce que le contrôle relève">
                {a.constats.map((c, i) => <li key={i}><strong>{c.gravite === "bloquant" ? "Bloquant" : c.gravite === "majeur" ? "Majeur" : "À noter"} :</strong> {c.texte}</li>)}
              </ul>
            ) : null}
            {a.statut === "expiree" ? <Avis teinte="rouge">Échue le {jour(a.fin)} : demandez à l’entreprise l’attestation de la période en cours.</Avis> : null}
            <div className="esp-actions">
              <span className="esp-kpi-sous">{a.verifie_le ? `Contrôlée le ${jour(a.verifie_le)}` : ""}{a.piece_id ? " · lue sur la pièce déposée" : " · saisie à la main"}</span>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || envoi} onClick={() => ouvrirAttestation(a)}>Corriger</button>
            </div>
          </div>
        );
      })}

      {lots.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Activités requises par lot">
          <table className="esp-tableau lor-chantier">
            <thead>
              <tr><th scope="col">Lot</th><th scope="col">Activités requises</th><th scope="col">Attestation</th></tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.numero}</strong> {l.intitule}</td>
                  <td>
                    {l.activites_requises.length ? l.activites_requises.map(libelleActivite).join(", ") : <span className="esp-kpi-sous">non renseignées</span>}{" "}
                    <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNl(l.activites_requises); ouvrir({ type: "activites", lot: l }); }} aria-label={`Modifier les activités du lot ${l.numero}`}>Modifier</button>
                  </td>
                  <td>{sansAttestation.includes(l) ? <span className="esp-kpi-sous">aucune</span> : STATUTS[attestations.find((a) => a.lot_id === l.id)!.statut].libelle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— saisir ou corriger une attestation ——— */}
      <Dialog open={form?.type === "attestation"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "attestation" && form.attestation ? "Corriger l’attestation" : "Saisir une attestation décennale"}</DialogTitle>
            <DialogDescription>Ce qui est écrit sur l’attestation de l’entreprise. Lorani la contrôle contre le lot : activités, période, plafond.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Entreprise
                <select className="rv-champ" value={na.intervenant_id} onChange={(e) => setNa((s) => ({ ...s, intervenant_id: e.target.value }))}>
                  <option value="">À rattacher</option>
                  {entreprises.map((i) => <option key={i.id} value={i.id}>{i.organisme}{i.lot_id ? ` · lot ${lots.find((l) => l.id === i.lot_id)?.numero ?? "?"}` : ""}</option>)}
                </select>
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Assureur <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={na.assureur} maxLength={160} onChange={(e) => setNa((s) => ({ ...s, assureur: e.target.value }))} placeholder="SMABTP" />
                </label>
                <label className="rv-libelle">N° de contrat
                  <input className="rv-champ" value={na.numero_police} maxLength={80} onChange={(e) => setNa((s) => ({ ...s, numero_police: e.target.value }))} />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Valable du
                  <input className="rv-champ" type="date" value={na.debut} onChange={(e) => setNa((s) => ({ ...s, debut: e.target.value }))} />
                </label>
                <label className="rv-libelle">au
                  <input className="rv-champ" type="date" min={na.debut || undefined} value={na.fin} onChange={(e) => setNa((s) => ({ ...s, fin: e.target.value }))} />
                </label>
                <label className="rv-libelle">Plafond (€)
                  <input className="rv-champ" inputMode="decimal" value={na.plafond} onChange={(e) => setNa((s) => ({ ...s, plafond: e.target.value }))} placeholder="1 500 000" />
                </label>
              </div>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Activités garanties</legend>
                <div className="lor-activites">
                  {Object.entries(ACTIVITES).map(([cle, libelle]) => (
                    <label key={cle} className="lor-choix-case">
                      <input type="checkbox" checked={na.activites.includes(cle)} onChange={(e) => setNa((s) => ({ ...s, activites: e.target.checked ? [...s.activites, cle] : s.activites.filter((x) => x !== cle) }))} /> <span>{libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!attestationOk || envoi} onClick={soumettreAttestation}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "attestation" && form.attestation ? "Corriger" : "Enregistrer"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— les activités requises d'un lot ——— */}
      <Dialog open={form?.type === "activites"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Activités du lot {form?.type === "activites" ? form.lot.numero : ""}</DialogTitle>
            <DialogDescription>Les activités que la décennale de l’entreprise de ce lot doit garantir. Les attestations du lot sont recontrôlées.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <fieldset className="lor-choix-pieces">
              <legend className="rv-libelle">Activités requises</legend>
              <div className="lor-activites">
                {Object.entries(ACTIVITES).map(([cle, libelle]) => (
                  <label key={cle} className="lor-choix-case">
                    <input type="checkbox" checked={nl.includes(cle)} onChange={(e) => setNl((l) => (e.target.checked ? [...l, cle] : l.filter((x) => x !== cle)))} /> <span>{libelle}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettreActivites}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— la date d'ouverture du chantier ——— */}
      <Dialog open={form?.type === "ouverture"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouverture du chantier</DialogTitle>
            <DialogDescription>La date de la déclaration d’ouverture du chantier. L’assurance décennale de chaque entreprise doit être en cours à cette date (C. assur., art. L241-1).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Date d’ouverture
                <input className="rv-champ" type="date" value={no} onChange={(e) => setNo(e.target.value)} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettreOuverture}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
