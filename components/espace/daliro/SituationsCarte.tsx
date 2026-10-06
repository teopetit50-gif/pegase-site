"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les situations de travaux d'un chantier (06/10/2026, session B6, b6_12)

   Chaque mois : l'avancement cumulé de chaque ligne du marché vérifié et
   des avenants signés ; l'acompte de la période = cumul − cumul précédent,
   moins la retenue de garantie (au plus 5 %, loi 71-584), TVA selon le
   chantier (autoliquidée en sous-traitance, CGI 283-2 nonies). Soumise à
   la validation du socle (deux personnes), puis validée : montants et
   mentions figés. Réservé à qui voit les prix.
   b6_25 : sur une situation en préparation, l'avancement lu dans les
   photos du chantier depuis la situation précédente est proposé ligne à
   ligne ; rien ne s'applique sans « Reprendre ».
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { Camera, FileSpreadsheet, Plus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { dateCourte, dateHeure, montant, pourcent } from "../format";
import { Avis, Pastille, type Teinte } from "../ui";
import { urlSigneeMedia } from "@/app/espace/daliro/actions";
import { annulerSituation, avancementPhotos, avancerSituation, noterPaiement, ouvrirSituation, soumettreSituation, validerSituation } from "./portes";
import { avancementPhotosExemple, encaissement, ouvrirLocale, recalculer, tauxZone } from "./situations";
import type { AvancementPhotos, Situation, StatutSituation, Tableau } from "./types";

const STATUTS: Record<StatutSituation, { libelle: string; teinte: Teinte }> = {
  brouillon: { libelle: "En préparation", teinte: "gris" },
  soumise: { libelle: "À valider", teinte: "bleu" },
  refusee: { libelle: "Refusée", teinte: "rouge" },
  validee: { libelle: "Validée", teinte: "vert" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};
const TAUX = [
  { v: 0.2, libelle: "20 % (taux normal)" },
  { v: 0.1, libelle: "10 % (rénovation de logement)" },
  { v: 0.055, libelle: "5,5 % (rénovation énergétique)" },
  { v: 0.085, libelle: "8,5 % (Guadeloupe, Martinique, La Réunion)" },
  { v: 0.021, libelle: "2,1 % (DOM, taux particulier)" },
];
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Props = { tableau: Tableau; source: Source; onLocal: (t: Tableau) => void; relire: () => Promise<void> };

export default function SituationsCarte({ tableau, source, onLocal, relire }: Props) {
  const { chantier: c, voit_prix, lots } = tableau;
  const situations = tableau.situations ?? [];
  const [ouvrirForm, setOuvrirForm] = useState(false);
  const [annuler, setAnnuler] = useState<Situation | null>(null);
  const [payer, setPayer] = useState<Situation | null>(null);
  const [montantPaye, setMontantPaye] = useState("");
  const [datePaiement, setDatePaiement] = useState(aujourdhui());
  const [reference, setReference] = useState("");
  const [fin, setFin] = useState(aujourdhui());
  const [taux, setTaux] = useState<string>("");
  const [motif, setMotif] = useState("");
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [photosReelles, setPhotosReelles] = useState<{ cle: string; lu: AvancementPhotos } | null>(null);

  const enPreparation = voit_prix ? situations.find((s) => s.statut === "brouillon" || s.statut === "refusee") ?? null : null;
  const clePhotos = enPreparation ? `${enPreparation.id}:${enPreparation.lignes.map((l) => l.avancement).join(",")}` : null;
  useEffect(() => {
    if (source !== "reelle" || !enPreparation || !clePhotos) return;
    let vivant = true;
    avancementPhotos(enPreparation.id)
      .then((lu) => { if (vivant) setPhotosReelles({ cle: clePhotos, lu }); })
      .catch(() => { if (vivant) setPhotosReelles({ cle: clePhotos, lu: { propositions: [], non_rattaches: [] } }); });
    return () => { vivant = false; };
  }, [source, clePhotos]); // eslint-disable-line react-hooks/exhaustive-deps -- clePhotos porte la situation et ses avancements

  if (!voit_prix) {
    return (
      <section className="esp-carte" aria-label="Situations de travaux">
        <div className="esp-section-titre">Situations de travaux</div>
        <p className="esp-kpi-sous">Les situations sont réservées à qui a le droit de voir les prix.</p>
      </section>
    );
  }

  const marcheVerifie = tableau.marches.some((m) => m.statut === "verifie");
  const enCours = situations.find((s) => s.statut === "brouillon" || s.statut === "soumise" || s.statut === "refusee") ?? null;
  const validees = situations.filter((s) => s.statut === "validee").sort((a, b) => b.numero - a.numero);
  const netCumule = validees.reduce((t, s) => t + s.net_a_payer, 0);
  const lotCode = (id: string | null) => (id ? lots.find((l) => l.id === id)?.code ?? "?" : "—");
  const regime = (c.regime_tva || "normal") as Situation["regime_tva"];
  const tauxDefaut = tauxZone(c.zone_tva);

  const avecSituation = (s: Situation): Tableau => ({ ...tableau, situations: [s, ...situations.filter((x) => x.id !== s.id)] });

  const agir = async (reelle: () => Promise<unknown>, locale: () => Tableau, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reelle();
        await relire();
      } else {
        onLocal(locale());
      }
      setFait(message);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
      return false;
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrir = async () => {
    const t = taux ? Number(taux) : null;
    const ok = await agir(
      () => ouvrirSituation(c.id, fin, t),
      () => avecSituation(ouvrirLocale(tableau, fin, t, nid)),
      `La situation est ouverte : saisissez l'avancement cumulé de chaque ligne.`,
    );
    if (ok) setOuvrirForm(false);
  };

  const avancer = async (s: Situation, ligneId: string) => {
    const brut = saisies[ligneId];
    if (brut === undefined) return;
    const v = Number(brut.replace(",", "."));
    const ligne = s.lignes.find((l) => l.id === ligneId);
    if (!ligne || Number.isNaN(v) || v === ligne.avancement) {
      setSaisies((p) => { const n = { ...p }; delete n[ligneId]; return n; });
      return;
    }
    await agir(
      () => avancerSituation(ligneId, v),
      () => {
        if (v < 0 || v > 100) throw new Error("Un avancement cumulé va de 0 à 100 %.");
        if (v < ligne.precedent_avancement) throw new Error(`L'avancement cumulé ne recule pas : ${pourcent(ligne.precedent_avancement)} à la situation précédente.`);
        return avecSituation(recalculer({ ...s, lignes: s.lignes.map((l) => (l.id === ligneId ? { ...l, avancement: Math.round(v * 100) / 100 } : l)) }));
      },
      `« ${ligne.designation} » : ${pourcent(v)} cumulés.`,
    );
    setSaisies((p) => { const n = { ...p }; delete n[ligneId]; return n; });
  };

  const soumettre = (s: Situation) => agir(
    () => soumettreSituation(s.id),
    () => {
      if (s.periode_ht <= 0) throw new Error("Rien à facturer sur cette période : l'avancement n'a pas bougé depuis la situation précédente.");
      return avecSituation({ ...s, statut: "soumise", demande_id: nid(), demande_statut: "en_attente", soumise_le: new Date().toISOString() });
    },
    `Situation n° ${s.numero} soumise : elle attend sa validation dans « À valider » (pas par vous).`,
  );

  const valider = (s: Situation) => agir(
    () => validerSituation(s.id),
    () => {
      if (s.demande_statut !== "approuvee" && s.demande_statut !== "executee") throw new Error(`La situation attend sa validation (${s.demande_statut ?? "aucune demande"}) : elle ne se valide pas avant.`);
      return avecSituation({ ...s, statut: "validee", validee_le: new Date().toISOString(), validee_libelle: "Vous", demande_statut: "executee" });
    },
    `Situation n° ${s.numero} validée : ${montant(s.net_a_payer)} à facturer.`,
  );

  const confirmerAnnulation = async () => {
    if (!annuler) return;
    const s = annuler;
    const ok = await agir(
      () => annulerSituation(s.id, motif.trim() || null),
      () => ({ ...tableau, situations: situations.filter((x) => x.id !== s.id) }),
      `Situation n° ${s.numero} annulée.`,
    );
    if (ok) { setAnnuler(null); setMotif(""); }
  };

  const ouvrirPaiement = (x: Situation) => {
    const e = encaissement(x, aujourdhui());
    setMontantPaye(String(e.reste).replace(".", ","));
    setDatePaiement(aujourdhui());
    setReference("");
    setErreur(null);
    setPayer(x);
  };
  const confirmerPaiement = async () => {
    if (!payer) return;
    const x = payer;
    const m = Number(montantPaye.replace(/\s/g, "").replace(",", "."));
    const ok = await agir(
      () => noterPaiement(x.id, m, datePaiement, reference.trim() || null),
      () => {
        const e = encaissement(x, aujourdhui());
        if (!(m > 0)) throw new Error("Le montant reçu est positif.");
        if (datePaiement > aujourdhui()) throw new Error("La date du paiement est entre la validation de la situation et aujourd'hui.");
        if (Math.round((e.encaisse + m) * 100) > Math.round(x.net_a_payer * 100)) throw new Error(`Ce paiement dépasse le reste dû (${montant(e.reste)}).`);
        return avecSituation({ ...x, paiements: [...(x.paiements ?? []), { id: nid(), situation_id: x.id, recu_le: datePaiement, montant: Math.round(m * 100) / 100, reference: reference.trim() || null }] });
      },
      `Paiement de ${montant(m)} noté sur la situation n° ${x.numero}.`,
    );
    if (ok) setPayer(null);
  };

  const reprendre = (s: Situation, ligneId: string, v: number, auteur: string | null) => {
    const ligne = s.lignes.find((l) => l.id === ligneId);
    if (!ligne) return;
    void agir(
      () => avancerSituation(ligneId, v),
      () => avecSituation(recalculer({ ...s, lignes: s.lignes.map((l) => (l.id === ligneId ? { ...l, avancement: v } : l)) })),
      `« ${ligne.designation} » : ${pourcent(v)} cumulés, repris de la photo${auteur ? ` de ${auteur}` : ""}.`,
    );
  };

  const modifiable = enCours && (enCours.statut === "brouillon" || enCours.statut === "refusee");
  const photos = !modifiable || !enCours ? null
    : source === "reelle" ? (photosReelles?.cle === clePhotos ? photosReelles.lu : null)
    : avancementPhotosExemple(enCours, lotCode);
  const approuvee = enCours?.demande_statut === "approuvee" || enCours?.demande_statut === "executee";

  return (
    <section className="esp-carte" aria-label="Situations de travaux">
      <div className="esp-carte-tete">
        <div className="esp-section-titre" style={{ margin: 0 }}>
          Situations de travaux — {validees.length ? `${validees.length} validée${validees.length > 1 ? "s" : ""}, ${montant(netCumule)} nets` : "aucune validée"}
        </div>
        <div className="esp-actions" style={{ marginTop: 0 }}>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setFin(aujourdhui()); setTaux(""); setErreur(null); setOuvrirForm(true); }}
                  disabled={envoi || !!enCours || !marcheVerifie || (c.statut !== "ouvert" && c.statut !== "suspendu" && c.statut !== "receptionne")}
                  title={!marcheVerifie ? "Une situation se calcule sur un marché vérifié" : enCours ? `La situation n° ${enCours.numero} est en cours` : undefined}>
            <Plus width={14} height={14} aria-hidden="true" /> Nouvelle situation
          </button>
        </div>
      </div>
      {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      {erreur && !ouvrirForm && !annuler && !payer ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}

      {enCours ? (
        <div style={{ marginBottom: 14 }}>
          <div className="esp-item-haut" style={{ marginBottom: 6 }}>
            <strong>Situation n° {enCours.numero} au {dateCourte(enCours.periode_fin)}</strong>
            <Pastille teinte={STATUTS[enCours.statut].teinte}>{STATUTS[enCours.statut].libelle}</Pastille>
            {enCours.statut === "soumise" ? <Pastille teinte={approuvee ? "vert" : enCours.demande_statut === "rejetee" ? "rouge" : "bleu"} contour>{approuvee ? "Approuvée : à valider" : enCours.demande_statut === "rejetee" ? "Rejetée à la validation" : "Dans « À valider »"}</Pastille> : null}
          </div>
          {enCours.motif ? <div className="esp-kpi-sous" style={{ marginBottom: 6 }}>Motif du refus : « {enCours.motif} »</div> : null}
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`Lignes de la situation n° ${enCours.numero} (tableau qui défile)`}>
            <table className="esp-tableau">
              <thead><tr><th>Désignation</th><th>Lot</th><th className="esp-num">Montant HT</th><th className="esp-num">Précédent</th><th className="esp-num">Cumul</th><th className="esp-num">Période HT</th></tr></thead>
              <tbody>
                {enCours.lignes.map((l) => (
                  <tr key={l.id}>
                    <td>{l.designation}{l.origine === "avenant" ? <span className="esp-kpi-sous"> · avenant n° {l.avenant_numero}</span> : null}</td>
                    <td><span className="esp-mono">{lotCode(l.lot_id)}</span></td>
                    <td className="esp-num">{montant(l.base_ht)}</td>
                    <td className="esp-num">{pourcent(l.precedent_avancement)}</td>
                    <td className="esp-num">
                      {modifiable ? (
                        <input className="rv-champ" style={{ width: 84, textAlign: "right" }} inputMode="decimal"
                               aria-label={`Avancement cumulé de « ${l.designation} » (en %)`}
                               value={saisies[l.id] ?? String(l.avancement).replace(".", ",")}
                               onChange={(e) => setSaisies((p) => ({ ...p, [l.id]: e.target.value }))}
                               onBlur={() => void avancer(enCours, l.id)}
                               onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                               disabled={envoi} />
                      ) : pourcent(l.avancement)}
                    </td>
                    <td className="esp-num">{montant(l.cumule_ht - l.precedent_ht)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {photos && (photos.propositions.length || photos.non_rattaches.length) ? (
            <div style={{ marginTop: 10 }} aria-label="Avancement lu dans les photos">
              <div className="esp-kpi-sous" style={{ fontWeight: 600 }}>
                <Camera width={13} height={13} aria-hidden="true" style={{ verticalAlign: "-2px" }} /> Lu dans les photos du chantier{photos.depuis ? ` depuis le ${dateCourte(photos.depuis)}` : ""}{source !== "reelle" ? " (exemple fictif)" : ""} — une estimation à contrôler, rien n&apos;est appliqué sans vous
              </div>
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {photos.propositions.map((p) => (
                  <li key={`${p.message}-${p.ligne}`} className="esp-kpi-sous">
                    « {p.designation} » : {pourcent(p.propose ?? p.pourcentage)} lu{p.de_nom ? ` sur la photo de ${p.de_nom}` : ""} du {dateHeure(p.le)} (aujourd&apos;hui {pourcent(p.actuel ?? 0)}){p.extrait ? ` — « ${p.extrait} »` : ""}
                    {p.photo ? <> <PhotoLien chemin={p.photo} /></> : null}{" "}
                    <button type="button" className="esp-lien-bouton" disabled={envoi || !p.ligne} onClick={() => p.ligne && reprendre(enCours, p.ligne, p.propose ?? p.pourcentage, p.de_nom)}>Reprendre</button>
                  </li>
                ))}
                {photos.non_rattaches.map((p, k) => (
                  <li key={`n-${p.message}-${k}`} className="esp-kpi-sous">
                    « {p.ouvrage ?? "ouvrage non nommé"} »{p.lot_code ? ` (lot ${p.lot_code})` : ""} : {pourcent(p.pourcentage)} lu le {dateHeure(p.le)}, sans ligne de la situation qui lui corresponde : à reporter à la main.
                    {p.photo ? <> <PhotoLien chemin={p.photo} /></> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <dl className="esp-situation-totaux" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 16px", margin: "10px 0 0" }}>
            <dt>Cumul des travaux HT</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(enCours.cumul_ht)}</dd>
            <dt>Situations précédentes HT</dt><dd className="esp-num" style={{ margin: 0 }}>− {montant(enCours.precedent_ht)}</dd>
            <dt><strong>Travaux de la période HT</strong></dt><dd className="esp-num" style={{ margin: 0 }}><strong>{montant(enCours.periode_ht)}</strong></dd>
            <dt>{enCours.autoliquidation ? "TVA autoliquidée par le preneur" : enCours.taux_tva ? `TVA ${pourcent(Math.round(enCours.taux_tva * 1000) / 10)}` : "TVA"}</dt><dd className="esp-num" style={{ margin: 0 }}>{montant(enCours.tva)}</dd>
            <dt>{enCours.retenue_caution ? "Retenue de garantie (caution)" : `Retenue de garantie ${pourcent(Math.round(enCours.retenue_taux * 1000) / 10)} ${enCours.retenue_base === "ht" ? "HT" : "TTC"}`}</dt><dd className="esp-num" style={{ margin: 0 }}>− {montant(enCours.retenue)}</dd>
            <dt><strong>Net à payer</strong></dt><dd className="esp-num" style={{ margin: 0 }}><strong>{montant(enCours.net_a_payer)}</strong></dd>
          </dl>
          {enCours.mentions.length ? <ul className="esp-kpi-sous" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{enCours.mentions.map((m) => <li key={m}>{m}</li>)}</ul> : null}
          <div className="esp-actions">
            {modifiable ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => void soumettre(enCours)} disabled={envoi || Object.keys(saisies).length > 0}>{envoi ? <Loader variant="spin" /> : null} Soumettre à la validation</button> : null}
            {enCours.statut === "soumise" ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => void valider(enCours)} disabled={envoi || !approuvee} title={!approuvee ? "Elle attend sa validation dans « À valider »" : undefined}>Valider la situation</button> : null}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setMotif(""); setErreur(null); setAnnuler(enCours); }} disabled={envoi}>Annuler</button>
          </div>
        </div>
      ) : !marcheVerifie ? (
        <p className="esp-kpi-sous">Une situation se calcule sur le marché vérifié ligne à ligne : vérifiez d&apos;abord le marché.</p>
      ) : null}

      {validees.length ? (
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Situations validées (tableau qui défile)">
          <table className="esp-tableau">
            <thead><tr><th>N°</th><th>Période au</th><th className="esp-num">Période HT</th><th className="esp-num">TVA</th><th className="esp-num">Retenue</th><th className="esp-num">Net</th><th>Validée</th><th>Échéance</th><th className="esp-num">Encaissé</th><th>Paiement</th></tr></thead>
            <tbody>
              {validees.map((s) => (
                <tr key={s.id}>
                  <td>{s.numero}</td>
                  <td>{dateCourte(s.periode_fin)}</td>
                  <td className="esp-num">{montant(s.periode_ht)}</td>
                  <td className="esp-num">{s.autoliquidation ? "autoliquidée" : montant(s.tva)}</td>
                  <td className="esp-num">{montant(s.retenue)}</td>
                  <td className="esp-num"><strong>{montant(s.net_a_payer)}</strong></td>
                  <td>{dateCourte(s.validee_le)}{s.validee_libelle ? ` · ${s.validee_libelle}` : ""}</td>
                  <td>{dateCourte(s.echeance)}</td>
                  {(() => {
                    const e = encaissement(s, aujourdhui());
                    return <>
                      <td className="esp-num">{montant(e.encaisse)}</td>
                      <td>
                        {e.etat === "payee" ? <Pastille teinte="vert">Payée{e.retard ? ` (${e.retard} j de retard)` : ""}</Pastille>
                          : e.etat === "en_retard" ? <Pastille teinte="rouge">En retard de {e.retard} j</Pastille>
                          : e.etat === "partielle" ? <Pastille teinte="ambre">Reste {montant(e.reste)}</Pastille>
                          : <Pastille teinte="gris">À échoir</Pastille>}
                        {e.etat === "en_retard" ? <div className="esp-kpi-sous">Indemnité de 40 € due{e.penalites ? `, pénalités ${montant(e.penalites)}` : ""}</div> : null}
                        {e.etat !== "payee" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrirPaiement(s)} disabled={envoi}>Noter un paiement</button></div> : null}
                      </td>
                    </>;
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Dialog open={ouvrirForm} onOpenChange={(o) => !o && setOuvrirForm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSpreadsheet width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouvelle situation de travaux</DialogTitle>
            <DialogDescription>
              Les lignes du marché vérifié et des avenants signés, l&apos;avancement repris de la situation précédente. {regime === "autoliquidation" ? "Vous êtes sous-traitant sur ce chantier : la TVA est autoliquidée par l'entreprise principale (CGI art. 283-2 nonies)." : regime === "non_applicable" || regime === "hors_champ" ? "Pas de TVA sur ce chantier." : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Fin de la période <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
              </label>
              {regime === "normal" ? (
                <label className="rv-libelle">Taux de TVA
                  <select className="rv-champ" value={taux} onChange={(e) => setTaux(e.target.value)}>
                    <option value="">Taux de la zone ({pourcent(Math.round(tauxDefaut * 1000) / 10)})</option>
                    {TAUX.map((t) => <option key={t.v} value={String(t.v)}>{t.libelle}</option>)}
                  </select>
                </label>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => void ouvrir()} disabled={envoi || !fin}>{envoi ? <Loader variant="spin" /> : null} Ouvrir la situation</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payer} onOpenChange={(o) => !o && setPayer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSpreadsheet width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Paiement reçu — situation n° {payer?.numero}</DialogTitle>
            <DialogDescription>Net à payer {montant(payer?.net_a_payer)} ; déjà encaissé {montant(payer ? encaissement(payer, aujourdhui()).encaisse : 0)}. Un paiement partiel est admis.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Montant reçu (€) <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={montantPaye} onChange={(e) => setMontantPaye(e.target.value)} />
                </label>
                <label className="rv-libelle">Reçu le
                  <input className="rv-champ" type="date" max={aujourdhui()} value={datePaiement} onChange={(e) => setDatePaiement(e.target.value)} />
                </label>
              </div>
              <label className="rv-libelle">Référence (virement, chèque)
                <input className="rv-champ" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="VIR SCI LEFEVRE 0123" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => void confirmerPaiement()} disabled={envoi || !montantPaye.trim()}>{envoi ? <Loader variant="spin" /> : null} Noter le paiement</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!annuler} onOpenChange={(o) => !o && setAnnuler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileSpreadsheet width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Annuler la situation n° {annuler?.numero}</DialogTitle>
            <DialogDescription>Elle n&apos;est pas encore validée : elle disparaît, la suivante repartira de la dernière situation validée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif (gardé au journal)
                <input className="rv-champ" value={motif} maxLength={500} onChange={(e) => setMotif(e.target.value)} placeholder="Erreur d'avancement sur le lot 02" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => void confirmerAnnulation()} disabled={envoi}>{envoi ? <Loader variant="spin" /> : null} Annuler la situation</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* Le lien vers la photo citée : une adresse signée pour quelques minutes, demandée au clic. */
function PhotoLien({ chemin }: { chemin: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (erreur) return <span>({erreur})</span>;
  if (url) return <a href={url} target="_blank" rel="noreferrer">Ouvrir la photo</a>;
  return (
    <button type="button" className="esp-lien-bouton" disabled={attente} onClick={() => {
      setAttente(true);
      void urlSigneeMedia(chemin).then((r) => { setAttente(false); if ("url" in r) setUrl(r.url); else setErreur(r.erreur); });
    }}>{attente ? "Photo…" : "Voir la photo"}</button>
  );
}
