"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les contestations bancaires — le dossier qui tient devant la banque
   (06/10/2026, session B2, module 17, migration b2_09)

   Le client conteste auprès de sa banque le débit d'une facture ; la
   banque du loueur le notifie avec une référence, un motif et quelques
   jours pour répondre. L'agence ouvre la contestation sur la facture :
   Tavaro dit tout de suite ce qui rendra le dossier fort ou faible,
   compose le dossier (contrat, états des lieux signés, photos datées,
   barème appliqué, facture, validation, envoi), et l'envoie en un clic à
   la banque, par le chemin de tout envoi. La direction consigne l'issue.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Download, Landmark, Plus, RefreshCw, Send } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide, type Teinte } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import { nomLocataire } from "./etats";
import { forcesLocales, jourLocal, joursAvant, plusJours } from "./contestations";
import type { Contestation, Dossier, Facture, Reglages, Role, StatutContestation } from "./types";

export type GestesContestations = {
  ouvrir: (facture: Facture, valeurs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  produire: (k: Contestation) => Promise<void>;
  envoyer: (k: Contestation, adresse: string | null) => Promise<Record<string, unknown>>;
  issue: (k: Contestation, issue: "gagnee" | "perdue" | "abandonnee", note: string | null) => Promise<void>;
  /* le lien du dossier PDF (null : pas de fichier, en exemple) */
  lien: (k: Contestation) => Promise<string | null>;
};

const STATUTS: Record<StatutContestation, { libelle: string; teinte: Teinte }> = {
  ouverte: { libelle: "Dossier en préparation", teinte: "ambre" },
  dossier_pret: { libelle: "Dossier prêt", teinte: "bleu" },
  envoyee: { libelle: "Envoyé à la banque", teinte: "bleu" },
  gagnee: { libelle: "Gagnée", teinte: "vert" },
  perdue: { libelle: "Perdue", teinte: "rouge" },
  abandonnee: { libelle: "Abandonnée", teinte: "gris" },
};
const ISSUES = { gagnee: "gagnée", perdue: "perdue", abandonnee: "abandonnée" } as const;
const ouverte = (k: Contestation) => k.statut === "ouverte" || k.statut === "dossier_pret" || k.statut === "envoyee";
const adresseValide = (a: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.trim());

function Delai({ k }: { k: Contestation }) {
  if (k.statut === "envoyee" || !ouverte(k)) return null;
  const n = joursAvant(k.repondre_avant);
  if (n < 0) return <Pastille teinte="rouge">délai dépassé de {-n} j</Pastille>;
  return <Pastille teinte={n <= 2 ? "rouge" : "ambre"}>{n === 0 ? "dernier jour" : `${n} j pour répondre`}</Pastille>;
}

type Champs = { facture: string; reference_banque: string; motif_banque: string; montant_eur: string; recue_le: string; repondre_avant: string; adresse_banque: string; notes: string };

export default function ContestationsVue({ contestations, dossiers, reglages, role, nommer, nomAgence, gestes }: {
  contestations: Contestation[];
  dossiers: Dossier[];
  reglages: Reglages | null;
  role: Role | null;
  nommer: (id: string | null | undefined) => string;
  nomAgence: (entite_id: string) => string;
  gestes: GestesContestations;
}) {
  const [vue, setVue] = useState<"en_cours" | "closes">("en_cours");
  const [saisie, setSaisie] = useState<Champs | null>(null);
  const [aEnvoyer, setAEnvoyer] = useState<Contestation | null>(null);
  const [adresse, setAdresse] = useState("");
  const [issue, setIssue] = useState<{ k: Contestation; issue: "gagnee" | "perdue" | "abandonnee" } | null>(null);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const direction = role === "gerant" || role === "admin" || role === "valideur";
  const agence = direction || role === "collaborateur";
  const delai = reglages?.contestation_delai_jours ?? 7;

  /* d'abord ce qui reste à envoyer, par date limite ; puis ce qui attend la décision de la banque */
  const enCours = useMemo(() => contestations.filter(ouverte).sort((x, y) => Number(x.statut === "envoyee") - Number(y.statut === "envoyee") || x.repondre_avant.localeCompare(y.repondre_avant)), [contestations]);
  const closes = useMemo(() => contestations.filter((k) => !ouverte(k)).sort((x, y) => (y.issue_le ?? "").localeCompare(x.issue_le ?? "")), [contestations]);
  const urgentes = enCours.filter((k) => k.statut !== "envoyee" && joursAvant(k.repondre_avant) <= 2).length;
  const montrees = vue === "en_cours" ? enCours : closes;
  const factureDe = (k: Contestation) => {
    const d = dossiers.find((x) => x.contrat.id === k.contrat_id);
    return { d, f: d?.factures.find((f) => f.id === k.facture_id) ?? null };
  };
  /* les factures qu'on peut défendre : émises, envoyées, réglées ou en litige — pas celles annulées par un avoir */
  const facturesOuvrables = useMemo(() => dossiers.flatMap((d) => d.factures.filter((f) => f.statut !== "avoir").map((f) => ({ d, f })))
    .sort((x, y) => y.f.date_facture.localeCompare(x.f.date_facture)), [dossiers]);
  const choisie = saisie ? facturesOuvrables.find((x) => x.f.id === saisie.facture) ?? null : null;
  const apercu = choisie ? forcesLocales(choisie.d, choisie.f) : null;

  async function agir(action: () => Promise<string>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await action();
      setFait(m);
      setSaisie(null);
      setAEnvoyer(null);
      setIssue(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const ouvrirSaisie = () => {
    setErreur(null);
    setFait(null);
    const auj = jourLocal();
    setSaisie({ facture: "", reference_banque: "", motif_banque: "", montant_eur: "", recue_le: auj, repondre_avant: plusJours(auj, delai), adresse_banque: reglages?.contestation_adresse ?? "", notes: "" });
  };
  const montantSaisi = saisie?.montant_eur.trim() ? Number(saisie.montant_eur.replace(",", ".")) : null;
  const montantFaux = !!choisie && montantSaisi !== null && (!(montantSaisi > 0) || montantSaisi > choisie.f.total_ttc);
  const saisieComplete = !!saisie && !!choisie && !!saisie.reference_banque.trim() && !!saisie.motif_banque.trim() && !montantFaux
    && (!saisie.adresse_banque.trim() || adresseValide(saisie.adresse_banque)) && !!saisie.recue_le && !!saisie.repondre_avant && saisie.repondre_avant >= saisie.recue_le;
  const ouvrir = () => saisie && choisie && agir(async () => {
    const valeurs: Record<string, unknown> = {
      reference_banque: saisie.reference_banque.trim(), motif_banque: saisie.motif_banque.trim(), recue_le: saisie.recue_le, repondre_avant: saisie.repondre_avant,
      montant_eur: montantSaisi ?? undefined, adresse_banque: saisie.adresse_banque.trim() || undefined, notes: saisie.notes.trim() || undefined,
    };
    const r = await gestes.ouvrir(choisie.f, valeurs);
    setVue("en_cours");
    if (r.deja) return `Cette contestation était déjà ouverte (référence ${saisie.reference_banque.trim()}) : rien n'a changé.`;
    return `Contestation ${saisie.reference_banque.trim()} ouverte sur la facture ${choisie.f.reference}. Le dossier se compose (une minute environ) ; envoyez-le avant le ${dateCourte(saisie.repondre_avant)}.`;
  });

  const ouvrirEnvoi = (k: Contestation) => {
    setErreur(null);
    setFait(null);
    setAdresse(k.adresse_banque ?? reglages?.contestation_adresse ?? "");
    setAEnvoyer(k);
  };
  const telecharger = (k: Contestation) => agir(async () => {
    const url = await gestes.lien(k);
    if (!url) return "Dans l'exemple, le dossier n'existe pas en fichier : en base réelle, il se télécharge ici.";
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.click();
    return `Le dossier de la contestation ${k.reference_banque} se télécharge.`;
  });

  return (
    <section className="esp-carte" aria-label="Contestations bancaires">
      <div className="esp-carte-tete">
        <div className="tav-bareme-tete" style={{ width: "100%" }}>
          <div className="esp-item-haut">
            <h2 className="esp-carte-titre">Contestations bancaires</h2>
            {enCours.length ? <Pastille teinte={urgentes ? "rouge" : "ambre"}>{enCours.length} en cours{urgentes ? ` · ${urgentes} urgente${urgentes > 1 ? "s" : ""}` : ""}</Pastille> : <Pastille teinte="vert">aucune en cours</Pastille>}
          </div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <div className="esp-filtres" role="group" aria-label="Contestations en cours ou closes">
              <button type="button" className="esp-filtre" aria-pressed={vue === "en_cours"} onClick={() => setVue("en_cours")}>En cours ({enCours.length})</button>
              <button type="button" className="esp-filtre" aria-pressed={vue === "closes"} onClick={() => setVue("closes")}>Closes ({closes.length})</button>
            </div>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!agence} title={agence ? undefined : "Votre rôle ne permet pas d'ouvrir une contestation"} onClick={ouvrirSaisie}>
              <Plus width={14} height={14} aria-hidden="true" /> Ouvrir une contestation
            </button>
          </div>
        </div>
      </div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous" style={{ marginBottom: 10 }}>
          Quand un client conteste auprès de sa banque le débit d&apos;une facture, la banque vous laisse quelques jours pour répondre ; sans réponse, le débit est perdu.
          Tavaro rassemble le contrat, les états des lieux signés, les photos datées, le barème appliqué et la facture en un dossier, et l&apos;envoie à la banque.
        </p>
        {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {erreur && !saisie && !aEnvoyer && !issue ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
        {montrees.length === 0 ? (
          <Vide titre={vue === "en_cours" ? "Aucune contestation en cours" : "Aucune contestation close"}>
            {vue === "en_cours" ? "Dès que votre banque vous notifie une contestation, ouvrez-la ici sur la facture concernée : le délai court depuis sa réception." : "Les contestations gagnées, perdues ou abandonnées restent ici, avec le dossier envoyé."}
          </Vide>
        ) : (
          <ul className="tav-avis-liste" aria-label={vue === "en_cours" ? "Contestations en cours, par date limite" : "Contestations closes"}>
            {montrees.map((k) => {
              const { d, f } = factureDe(k);
              const fortes = k.forces.filter((x) => x.ok).length;
              return (
                <li key={k.id} className="tav-avis">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{k.reference_banque}</span>
                    <Pastille teinte={STATUTS[k.statut].teinte}>{STATUTS[k.statut].libelle}</Pastille>
                    <Delai k={k} />
                    <span className="esp-item-montant">{montant(k.montant_eur)}</span>
                  </div>
                  <p className="tav-avis-titre">{k.motif_banque}</p>
                  <p className="esp-kpi-sous">
                    {f ? <>Facture <span className="esp-mono">{f.reference}</span> du {dateCourte(f.date_facture)} ({montant(f.total_ttc)})</> : "Facture hors de votre périmètre"}
                    {d ? <> · contrat <span className="esp-mono">{d.contrat.numero}</span> · {nomLocataire(d.locataire)}</> : null}
                    {" "}· reçue le {dateCourte(k.recue_le)} · à répondre avant le {dateCourte(k.repondre_avant)} · {nomAgence(k.entite_id)}
                  </p>
                  {k.notes ? <p className="esp-kpi-sous">{k.notes}</p> : null}
                  {k.forces.length ? (
                    <details className="tav-forces">
                      <summary>
                        <span>Le dossier : {fortes} point{fortes > 1 ? "s" : ""} fort{fortes > 1 ? "s" : ""} sur {k.forces.length}</span>
                        {fortes < k.forces.length ? <Pastille teinte="ambre">{k.forces.length - fortes} à renforcer</Pastille> : null}
                      </summary>
                      <ul className="tav-preparation">
                        {k.forces.map((x) => <li key={x.code} data-ok={x.ok ? "oui" : "non"}><span aria-hidden="true">{x.ok ? "✓" : "!"}</span> {x.libelle}</li>)}
                      </ul>
                    </details>
                  ) : null}
                  {k.dossier_le ? <p className="esp-kpi-sous">Dossier composé le {dateHeure(k.dossier_le)}{k.dossier_pages ? `, ${k.dossier_pages} pages` : ""}{k.dossier_sha256 ? <> · empreinte <span className="esp-mono">{k.dossier_sha256.slice(0, 12)}…</span></> : null}</p> : null}
                  {k.envoyee_le ? <p className="esp-kpi-sous">Envoyé le {dateHeure(k.envoyee_le)} par {nommer(k.envoyee_par)} à {k.adresse_banque} — le courriel part après validation, comme tout envoi.</p> : null}
                  {k.issue_le ? <p className="esp-kpi-sous">{STATUTS[k.statut].libelle} le {dateCourte(k.issue_le)} — consignée par {nommer(k.issue_par)}{k.issue_note ? ` : ${k.issue_note}` : ""}</p> : null}
                  {k.statut === "ouverte" ? <div className="esp-kpi-sous tav-en-cours"><Loader variant="spin" /> Le dossier se compose : contrat, états des lieux, photos, barème, facture.</div> : null}
                  {ouverte(k) ? (
                    <div className="esp-actions">
                      {k.statut === "dossier_pret" ? (
                        <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!agence || envoi} onClick={() => ouvrirEnvoi(k)}><Send width={14} height={14} aria-hidden="true" /> Envoyer le dossier à la banque</button>
                      ) : null}
                      {k.dossier_chemin ? (
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => telecharger(k)}><Download width={14} height={14} aria-hidden="true" /> Télécharger le dossier</button>
                      ) : null}
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!agence || envoi || k.statut === "ouverte"} title="Après un état des lieux signé ou un contrat scanné ajouté"
                        onClick={() => agir(async () => { await gestes.produire(k); return `Le dossier de la contestation ${k.reference_banque} se recompose avec ce que Tavaro sait aujourd'hui.`; })}>
                        <RefreshCw width={14} height={14} aria-hidden="true" /> Refaire le dossier
                      </button>
                      {k.statut === "envoyee" ? (
                        <>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!direction} title={direction ? undefined : "La direction ou un valideur consigne l'issue"} onClick={() => { setErreur(null); setFait(null); setNote(""); setIssue({ k, issue: "gagnee" }); }}>Gagnée</button>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!direction} title={direction ? undefined : "La direction ou un valideur consigne l'issue"} onClick={() => { setErreur(null); setFait(null); setNote(""); setIssue({ k, issue: "perdue" }); }}>Perdue</button>
                        </>
                      ) : (
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!direction} title={direction ? undefined : "La direction ou un valideur consigne l'issue"} onClick={() => { setErreur(null); setFait(null); setNote(""); setIssue({ k, issue: "abandonnee" }); }}>Abandonner</button>
                      )}
                    </div>
                  ) : k.dossier_chemin ? (
                    <div className="esp-actions">
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => telecharger(k)}><Download width={14} height={14} aria-hidden="true" /> Télécharger le dossier</button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!saisie} onOpenChange={(o) => !o && setSaisie(null)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir une contestation bancaire</DialogTitle>
            <DialogDescription>Recopiez la notification de votre banque ou de votre prestataire de paiement : sa référence, son motif, la date limite qu&apos;elle donne.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {saisie ? (
              <div className="esp-form">
                <label className="rv-libelle">Facture contestée <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={saisie.facture} onChange={(e) => setSaisie({ ...saisie, facture: e.target.value })}>
                    <option value="">Choisir…</option>
                    {facturesOuvrables.map(({ d, f }) => <option key={f.id} value={f.id}>{f.reference} · {montant(f.total_ttc)} · {nomLocataire(d.locataire)} · contrat {d.contrat.numero}{f.regle_le ? " · réglée" : ""}</option>)}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Référence de la banque <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ esp-mono" value={saisie.reference_banque} onChange={(e) => setSaisie({ ...saisie, reference_banque: e.target.value })} placeholder="CB-2026-88412" autoComplete="off" /></label>
                  <label className="rv-libelle">Montant contesté (€)<input className="rv-champ" inputMode="decimal" value={saisie.montant_eur} onChange={(e) => setSaisie({ ...saisie, montant_eur: e.target.value })} placeholder={choisie ? String(choisie.f.total_ttc).replace(".", ",") : "toute la facture"} /></label>
                </div>
                <label className="rv-libelle">Motif donné par la banque <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={saisie.motif_banque} onChange={(e) => setSaisie({ ...saisie, motif_banque: e.target.value })} placeholder="13.1 — Prestation non conforme" /></label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Reçue le<input type="date" className="rv-champ" value={saisie.recue_le} max={jourLocal()} onChange={(e) => setSaisie({ ...saisie, recue_le: e.target.value, repondre_avant: plusJours(e.target.value || jourLocal(), delai) })} /></label>
                  <label className="rv-libelle">À répondre avant le<input type="date" className="rv-champ" value={saisie.repondre_avant} min={saisie.recue_le} onChange={(e) => setSaisie({ ...saisie, repondre_avant: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Adresse du service des contestations<input className="rv-champ" type="email" value={saisie.adresse_banque} onChange={(e) => setSaisie({ ...saisie, adresse_banque: e.target.value })} placeholder="contestations@votre-banque.fr" autoComplete="off" /></label>
                <label className="rv-libelle">Note pour l&apos;agence<textarea className="rv-champ" rows={2} value={saisie.notes} onChange={(e) => setSaisie({ ...saisie, notes: e.target.value })} /></label>
                {montantFaux ? <Avis teinte="ambre">Le montant contesté est positif et ne dépasse pas la facture ({montant(choisie!.f.total_ttc)}).</Avis> : null}
                {saisie.adresse_banque.trim() && !adresseValide(saisie.adresse_banque) ? <Avis teinte="ambre">L&apos;adresse de la banque n&apos;est pas une adresse de courriel.</Avis> : null}
                {apercu ? (
                  <div>
                    <p className="esp-kpi-sous" style={{ marginBottom: 4 }}>Ce que le dossier contiendra :</p>
                    <ul className="tav-preparation">
                      {apercu.map((x) => <li key={x.code} data-ok={x.ok ? "oui" : "non"}><span aria-hidden="true">{x.ok ? "✓" : "!"}</span> {x.libelle}</li>)}
                    </ul>
                  </div>
                ) : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !saisieComplete} onClick={ouvrir}>{envoi ? <Loader variant="spin" /> : null} Ouvrir et composer le dossier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aEnvoyer} onOpenChange={(o) => !o && setAEnvoyer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Send width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Envoyer le dossier {aEnvoyer?.reference_banque}</DialogTitle>
            <DialogDescription>Le courriel part à la banque avec le dossier, le PDF de la facture et le contrat signé s&apos;il est numérisé. Il passe par la validation de vos envois, comme tout courriel.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Adresse du service des contestations <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} autoComplete="off" /></label>
              {aEnvoyer && joursAvant(aEnvoyer.repondre_avant) < 0 ? <Avis teinte="rouge">La date limite était le {dateCourte(aEnvoyer.repondre_avant)} : envoyez quand même, et appelez la banque.</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !adresseValide(adresse)}
              onClick={() => aEnvoyer && agir(async () => { const r = await gestes.envoyer(aEnvoyer, adresse.trim()); return r.deja ? "Ce dossier était déjà remis à l'envoi : rien ne part deux fois." : `Le dossier ${aEnvoyer.reference_banque} part à ${adresse.trim()} (${Number(r.pieces_jointes ?? 1)} pièce${Number(r.pieces_jointes ?? 1) > 1 ? "s" : ""} jointe${Number(r.pieces_jointes ?? 1) > 1 ? "s" : ""}), après validation.`; })}>
              {envoi ? <Loader variant="spin" /> : null} Envoyer à la banque
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issue} onOpenChange={(o) => !o && setIssue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Landmark width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Contestation {issue?.k.reference_banque} {issue ? ISSUES[issue.issue] : ""}</DialogTitle>
            <DialogDescription>
              {issue?.issue === "abandonnee" ? "Vous ne défendez pas ce débit : la banque le rendra au client. Dites pourquoi, pour le journal."
                : issue?.issue === "perdue" ? "La banque a donné raison au client : le débit est repris. La facture reste due ; un recouvrement reste possible."
                : "La banque a confirmé le débit. Notez la date ou la référence de sa décision."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Note<textarea className="rv-champ" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className={issue?.issue === "gagnee" ? "r-btn r-btn--noir" : "r-btn r-btn--rouge"} disabled={envoi}
              onClick={() => issue && agir(async () => { await gestes.issue(issue.k, issue.issue, note.trim() || null); return `La contestation ${issue.k.reference_banque} est close : ${ISSUES[issue.issue]}.`; })}>
              {envoi ? <Loader variant="spin" /> : null} Consigner
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
