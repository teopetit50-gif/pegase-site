"use client";

/* Marché, avenants et révision BT (b5_34, b5_50) : par marché, le montant initial, chaque avenant (signé : « Avenant
   n° 1 signé · Plus-value intégrée au marché · Marché mis à jour »), le marché à jour ; puis la formule de révision
   des prix, C = a + (1 − a) × In / I0, avec ses coefficients et le montant révisé de chaque situation. Base réelle :
   lorani_avenants sous la RLS (à la signature, la base ajoute le montant à lorani_marches.avenants_ht, une seule
   fois, et un avenant signé ne se modifie plus) ; la formule est sur lorani_marches, la révision de chaque situation
   est calculée par la base (lorani_situations.revision) à partir des index relevés chaque jour à l'INSEE. Rien n'est
   versé d'office : la révision est un montant à vérifier sur la situation. Exemple : les gestes s'appliquent en
   mémoire, la révision est refaite par revision.ts, comme la base la fait. */

import { useMemo, useState } from "react";
import { FilePen, TrendingUp } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { changerAvenant, poserRevision, preparerAvenant } from "./portes";
import { moisLong, revisionSituation } from "./revision";
import type { Avenant, Dossier, Marche, Projet } from "./types";

/* des euros ronds sans décimales, sinon deux : « 953,40 € » */
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })} €`;
const signe = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${euros(Math.abs(n))}`;
const decimal = (n: number | null | undefined, d = 4) => (n === null || n === undefined ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d }));
const jour = (d: string | null | undefined) => (d ? dateCourte(`${d.slice(0, 10)}T12:00:00`) : "—");
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace("−", "-").replace(",", "."));

/* ce que l'avenant signé fait au marché, dans l'ordre des numéros : le marché avant, le marché après */
export function marcheAJour(m: Marche, avenants: Avenant[]) {
  const signes = avenants.filter((a) => a.marche_id === m.id && a.statut === "signe").sort((a, b) => a.numero - b.numero);
  const somme = signes.reduce((n, a) => n + a.montant_ht, 0);
  /* un total saisi avant le détail des avenants (b5_50 le garde) */
  const anterieurs = Math.round((m.avenants_ht - somme) * 100) / 100;
  let courant = m.montant_ht + anterieurs;
  const apres: Record<string, number> = {};
  for (const a of signes) {
    courant += a.montant_ht;
    apres[a.id] = courant;
  }
  return { anterieurs, apres, total: m.montant_ht + m.avenants_ht };
}

type Form =
  | { type: "avenant"; marche: Marche }
  | { type: "signer"; avenant: Avenant }
  | { type: "abandon"; avenant: Avenant }
  | { type: "revision"; marche: Marche }
  | null;

export default function MarcheRevision({ projet, dossier, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const lots = useMemo(() => dossier.lots.filter((l) => l.projet_id === projet.id), [dossier.lots, projet.id]);
  const marches = useMemo(() => dossier.marches.filter((m) => m.projet_id === projet.id && m.actif)
    .sort((a, b) => (lots.find((l) => l.id === a.lot_id)?.numero ?? "").localeCompare(lots.find((l) => l.id === b.lot_id)?.numero ?? "")), [dossier.marches, projet.id, lots]);
  const avenants = useMemo(() => (dossier.avenants ?? []).filter((a) => a.projet_id === projet.id), [dossier.avenants, projet.id]);
  const series = dossier.indexSeries ?? [];
  const valeurs = dossier.indexValeurs ?? [];
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const auj = aujourdhui();
  const [na, setNa] = useState({ objet: "", montant: "", signe: false, signe_le: auj });
  const [ns, setNs] = useState(auj);
  const [nm, setNm] = useState("");
  const [nr, setNr] = useState({ idbank: "", mois_zero: "", partie_fixe: "0,15" });
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
  /* en mémoire : la révision des situations d'un marché refaite comme la base la refait */
  const reviser = (d: Dossier, marcheId: string): Dossier => {
    const m = d.marches.find((x) => x.id === marcheId);
    if (!m) return d;
    const code = (d.indexSeries ?? []).find((x) => x.idbank === m.revision_idbank)?.code;
    return { ...d, situations: d.situations.map((s) => (s.marche_id === marcheId && s.statut === "a_viser" ? { ...s, revision: revisionSituation(s, m, d.situations, d.indexValeurs ?? [], code) } : s)) };
  };

  const soumettreAvenant = () => {
    if (form?.type !== "avenant") return;
    const m = form.marche;
    const v = { client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, marche_id: m.id, objet: na.objet.trim().replace(/\s+/g, " "), montant_ht: nombre(na.montant),
      statut: na.signe ? ("signe" as const) : ("a_signer" as const), signe_le: na.signe ? na.signe_le : null };
    const numero = Math.max(0, ...avenants.filter((a) => a.marche_id === m.id).map((a) => a.numero)) + 1;
    return lancer(() => preparerAvenant(v), () => ({
      ...dossier,
      avenants: [...(dossier.avenants ?? []), { id: `local-av-${Date.now()}`, projet_id: projet.id, marche_id: m.id, numero, objet: v.objet, montant_ht: v.montant_ht, statut: v.statut, signe_le: v.signe_le, integre_le: na.signe ? new Date().toISOString() : null, piece_id: null, motif: null }],
      marches: na.signe ? dossier.marches.map((x) => (x.id === m.id ? { ...x, avenants_ht: x.avenants_ht + v.montant_ht } : x)) : dossier.marches,
    }));
  };
  const soumettreSignature = () => {
    if (form?.type !== "signer") return;
    const a = form.avenant;
    return lancer(() => changerAvenant(a.id, { statut: "signe", signe_le: ns }), () => ({
      ...dossier,
      avenants: (dossier.avenants ?? []).map((x) => (x.id === a.id ? { ...x, statut: "signe", signe_le: ns, integre_le: new Date().toISOString() } : x)),
      marches: dossier.marches.map((x) => (x.id === a.marche_id ? { ...x, avenants_ht: x.avenants_ht + a.montant_ht } : x)),
    }));
  };
  const soumettreAbandon = () => {
    if (form?.type !== "abandon") return;
    const a = form.avenant;
    const motif = nm.trim();
    return lancer(() => changerAvenant(a.id, { statut: "abandonne", motif }), () => ({ ...dossier, avenants: (dossier.avenants ?? []).map((x) => (x.id === a.id ? { ...x, statut: "abandonne", motif } : x)) }));
  };
  const soumettreRevision = () => {
    if (form?.type !== "revision") return;
    const m = form.marche;
    const v = nr.idbank
      ? { revision_idbank: nr.idbank, revision_mois_zero: `${nr.mois_zero}-01`, revision_partie_fixe: nombre(nr.partie_fixe) }
      : { revision_idbank: null, revision_mois_zero: null, revision_partie_fixe: m.revision_partie_fixe ?? 0.15 };
    return lancer(() => poserRevision(m.id, v), () => reviser({ ...dossier, marches: dossier.marches.map((x) => (x.id === m.id ? { ...x, ...v } : x)) }, m.id));
  };

  const montantSaisi = nombre(na.montant);
  const marcheDuForm = form?.type === "avenant" ? form.marche : null;
  const avenantOk = form?.type === "avenant" && na.objet.trim().length > 0 && na.montant.trim() !== "" && !Number.isNaN(montantSaisi)
    && (!na.signe || (/^\d{4}-\d{2}-\d{2}$/.test(na.signe_le) && na.signe_le <= auj && !!marcheDuForm && marcheDuForm.montant_ht + marcheDuForm.avenants_ht + montantSaisi >= 0));
  const signerOk = /^\d{4}-\d{2}-\d{2}$/.test(ns) && ns <= auj && (form?.type !== "signer" || (() => {
    const m = dossier.marches.find((x) => x.id === form.avenant.marche_id);
    return !!m && m.montant_ht + m.avenants_ht + form.avenant.montant_ht >= 0;
  })());
  const abandonOk = nm.trim().length >= 3;
  const partieFixe = nombre(nr.partie_fixe);
  const revisionOk = !nr.idbank || (/^\d{4}-\d{2}$/.test(nr.mois_zero) && !Number.isNaN(partieFixe) && partieFixe >= 0 && partieFixe < 1);

  if (!marches.length) return null;
  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre"><span>Marché, avenants et révision BT</span></div>
      {marches.map((m) => {
        const lot = lots.find((l) => l.id === m.lot_id);
        const liste = avenants.filter((a) => a.marche_id === m.id).sort((a, b) => a.numero - b.numero);
        const aj = marcheAJour(m, liste);
        const serie = series.find((x) => x.idbank === m.revision_idbank);
        const i0 = m.revision_idbank && m.revision_mois_zero ? valeurs.find((v) => v.idbank === m.revision_idbank && v.mois.slice(0, 7) === m.revision_mois_zero!.slice(0, 7))?.valeur ?? null : null;
        const a = m.revision_partie_fixe ?? 0.15;
        const sits = dossier.situations.filter((s) => s.marche_id === m.id).sort((x, y) => x.numero - y.numero);
        const revisees = sits.filter((s) => s.revision && typeof s.revision.revision_ht === "number");
        const totalRevision = revisees.reduce((n, s) => n + (s.revision!.revision_ht ?? 0), 0);
        return (
          <div key={m.id} className="lor-os lor-marche">
            <div className="lor-situation-tete">
              <strong>Lot {lot?.numero ?? "—"} · {m.titulaire}</strong>
              <span className="esp-item-haut">
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => {
                  setNr({ idbank: m.revision_idbank ?? "", mois_zero: (m.revision_mois_zero ?? "").slice(0, 7), partie_fixe: decimal(m.revision_partie_fixe ?? 0.15, 3) });
                  ouvrir({ type: "revision", marche: m });
                }}>Révision des prix</button>
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNa({ objet: "", montant: "", signe: false, signe_le: auj }); ouvrir({ type: "avenant", marche: m }); }}>Nouvel avenant</button>
              </span>
            </div>

            {/* ——— le marché et ses avenants ——— */}
            <dl className="lor-marche-montants">
              <div><dt>Marché initial</dt><dd>{euros(m.montant_ht)} HT</dd></div>
              <div><dt>Avenants signés</dt><dd>{signe(m.avenants_ht)} HT</dd></div>
              <div><dt>Marché à jour</dt><dd><strong>{euros(aj.total)} HT</strong></dd></div>
            </dl>
            {liste.length || aj.anterieurs ? (
              <ul className="lor-liste">
                {aj.anterieurs ? <li><span className="esp-kpi-sous">Avenants saisis avant le détail : {signe(aj.anterieurs)} HT, compris dans le marché.</span></li> : null}
                {liste.map((x) => (
                  <li key={x.id}>
                    {x.statut === "signe" ? (
                      <span>
                        <Pastille teinte="vert">Avenant n° {x.numero} signé</Pastille>{" "}
                        <span>· {x.montant_ht > 0 ? "Plus-value intégrée au marché" : x.montant_ht < 0 ? "Moins-value intégrée au marché" : "Sans incidence financière"} · Marché mis à jour</span>
                        <span className="esp-kpi-sous"> — {x.objet} · {signe(x.montant_ht)} HT · signé le {jour(x.signe_le)} · marché porté à {euros(aj.apres[x.id] ?? aj.total)} HT{x.piece_id ? " · lu sur la pièce" : ""}</span>
                      </span>
                    ) : x.statut === "a_signer" ? (
                      <span>
                        <Pastille teinte="ambre">Avenant n° {x.numero} à signer</Pastille>{" "}
                        <span>{x.objet} · {signe(x.montant_ht)} HT</span>
                        <span className="esp-kpi-sous"> — n’entre au marché qu’à la signature</span>{" "}
                        <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNs(auj); ouvrir({ type: "signer", avenant: x }); }}>Signé</button>{" "}
                        <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => { setNm(""); ouvrir({ type: "abandon", avenant: x }); }}>Abandonner</button>
                      </span>
                    ) : (
                      <span className="esp-kpi-sous"><Pastille teinte="gris">Avenant n° {x.numero} abandonné</Pastille> {x.objet} · {x.motif}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : <div className="lor-tableau-vide">Aucun avenant : le marché est à son montant initial.</div>}

            {/* ——— la révision BT ——— */}
            {m.revision_idbank ? (
              <div className="lor-formule" role="group" aria-label={`Révision des prix du lot ${lot?.numero ?? ""}`}>
                <div className="lor-formule-tete">
                  <strong>Révision {serie?.code ?? "de l’index"}</strong>
                  <span className="esp-kpi-sous">{serie?.libelle ?? `série INSEE ${m.revision_idbank}`}{serie?.releve_le ? ` · relevé à l’INSEE le ${jour(serie.releve_le)}` : ""}</span>
                </div>
                <p className="lor-formule-calcul">
                  <span>C = a + (1 − a) × I<sub>n</sub> / I<sub>0</sub></span>
                  <span>= {decimal(a, 3)} + {decimal(1 - a, 3)} × I<sub>n</sub> / {i0 === null ? "I0" : decimal(i0, 2)}</span>
                </p>
                <p className="lor-sous">
                  a = {decimal(a, 3)} (partie fixe) · I<sub>0</sub> = {i0 === null ? "pas encore relevé" : decimal(i0, 2)} ({serie?.code ?? "index"}, mois zéro : {moisLong(m.revision_mois_zero)}) · I<sub>n</sub> = l’index du mois des travaux de la situation
                </p>
                {serie?.erreur ? <Avis teinte="ambre">Dernier relevé de l’INSEE en échec ({serie.erreur}) : la révision attend le prochain.</Avis> : null}
                {sits.length ? (
                  <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Révision de chaque situation">
                    <table className="esp-tableau lor-chantier lor-revision">
                      <thead>
                        <tr><th scope="col">Situation</th><th scope="col">Mois des travaux</th><th scope="col">I<sub>n</sub></th><th scope="col">Coefficient C</th><th scope="col">Travaux de la période HT</th><th scope="col">Révision HT</th></tr>
                      </thead>
                      <tbody>
                        {sits.map((s) => {
                          const r = s.revision ?? {};
                          return (
                            <tr key={s.id}>
                              <td>n° {s.numero}<span className="esp-kpi-sous"> · {s.statut === "a_viser" ? "à viser" : s.statut === "visee" ? "visée" : "rectifiée"}</span></td>
                              <td>{moisLong(s.mois)}</td>
                              {typeof r.coefficient === "number" ? (
                                <>
                                  <td>{decimal(r.in, 2)}<span className="esp-kpi-sous"> · {moisLong(r.mois_index)}</span>{r.provisoire ? <> <Pastille teinte="ambre" title="L’index du mois n’est pas encore publié en définitif : le dernier publié est pris.">Provisoire</Pastille></> : null}</td>
                                  <td>{decimal(r.coefficient, 4)}</td>
                                  <td>{euros(r.montant_periode ?? 0)}</td>
                                  <td><strong>{signe(r.revision_ht ?? 0)}</strong></td>
                                </>
                              ) : (
                                <td colSpan={4}><span className="esp-kpi-sous">{r.manque ? `En attente : ${r.manque}.` : s.statut === "a_viser" ? "Calcul en attente." : "Visée avant la formule de révision : non révisée."}{typeof r.montant_periode === "number" ? ` Travaux de la période : ${euros(r.montant_periode)} HT.` : ""}</span></td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {revisees.length ? (
                        <tfoot>
                          <tr><th scope="row" colSpan={5}>Révision cumulée à vérifier sur les situations</th><td><strong>{signe(Math.round(totalRevision * 100) / 100)}</strong></td></tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                ) : <div className="lor-tableau-vide">Aucune situation reçue : la révision se calculera à chacune.</div>}
                <p className="lor-sous">Révision HT = travaux de la période × (C − 1). Rien n’est versé d’office : la révision est un montant à vérifier sur la situation.</p>
              </div>
            ) : (
              <div className="lor-sous">Prix fermes : aucune formule de révision au marché.{peutEcrire ? " « Révision des prix » pour poser l’index et le mois zéro." : ""}</div>
            )}
          </div>
        );
      })}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— nouvel avenant ——— */}
      <Dialog open={form?.type === "avenant"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FilePen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Nouvel avenant</DialogTitle>
            <DialogDescription>{form?.type === "avenant" ? `${form.marche.titulaire}, marché à jour de ${euros(form.marche.montant_ht + form.marche.avenants_ht)} HT. ` : ""}Signé, son montant est intégré au marché ; il ne se modifie plus ensuite.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Objet <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={na.objet} maxLength={300} onChange={(e) => setNa((s) => ({ ...s, objet: e.target.value }))} placeholder="Appuis de fenêtre en pierre au lieu du béton" />
              </label>
              <label className="rv-libelle">Montant HT (€) <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" inputMode="decimal" value={na.montant} onChange={(e) => setNa((s) => ({ ...s, montant: e.target.value }))} placeholder="5 200 (plus-value) ou −1 500 (moins-value)" />
              </label>
              <label className="lor-choix-case">
                <input type="checkbox" checked={na.signe} onChange={(e) => setNa((s) => ({ ...s, signe: e.target.checked }))} /> <span>Déjà signé</span>
              </label>
              {na.signe ? (
                <label className="rv-libelle">Signé le
                  <input className="rv-champ" type="date" max={auj} value={na.signe_le} onChange={(e) => setNa((s) => ({ ...s, signe_le: e.target.value }))} />
                </label>
              ) : null}
              {marcheDuForm && na.montant.trim() && !Number.isNaN(montantSaisi) ? (
                <p className="lor-sous">Marché à jour après signature : {euros(marcheDuForm.montant_ht + marcheDuForm.avenants_ht + montantSaisi)} HT{marcheDuForm.montant_ht + marcheDuForm.avenants_ht + montantSaisi < 0 ? " : la moins-value dépasse le marché" : ""}.</p>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!avenantOk || envoi} onClick={soumettreAvenant}>{envoi ? <Loader variant="spin" /> : null} {na.signe ? "Intégrer au marché" : "Préparer"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— signer ——— */}
      <Dialog open={form?.type === "signer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FilePen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Avenant n° {form?.type === "signer" ? form.avenant.numero : ""} signé</DialogTitle>
            <DialogDescription>{form?.type === "signer" ? `${form.avenant.objet} · ${signe(form.avenant.montant_ht)} HT. ` : ""}Son montant est intégré au marché, qui est mis à jour ; l’avenant ne se modifie plus ensuite.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Signé le
                <input className="rv-champ" type="date" max={auj} value={ns} onChange={(e) => setNs(e.target.value)} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!signerOk || envoi} onClick={soumettreSignature}>{envoi ? <Loader variant="spin" /> : null} Intégrer au marché</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— abandonner ——— */}
      <Dialog open={form?.type === "abandon"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FilePen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Abandonner l’avenant n° {form?.type === "abandon" ? form.avenant.numero : ""}</DialogTitle>
            <DialogDescription>Il reste dans la liste, avec votre motif ; le marché ne change pas.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={2} maxLength={500} value={nm} onChange={(e) => setNm(e.target.value)} placeholder="Le maître d’ouvrage renonce" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!abandonOk || envoi} onClick={soumettreAbandon}>{envoi ? <Loader variant="spin" /> : null} Abandonner</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— la formule de révision ——— */}
      <Dialog open={form?.type === "revision"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><TrendingUp width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Révision des prix</DialogTitle>
            <DialogDescription>{form?.type === "revision" ? `${form.marche.titulaire}. ` : ""}C = a + (1 − a) × I<sub>n</sub> / I<sub>0</sub> : l’index du marché, son mois zéro (le mois de l’offre, en général) et la partie fixe a. Les index sont relevés chaque jour à l’INSEE ; chaque situation à viser est recalculée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Index
                <select className="rv-champ" value={nr.idbank} onChange={(e) => setNr((s) => ({ ...s, idbank: e.target.value }))}>
                  <option value="">Prix fermes (aucune révision)</option>
                  {series.map((x) => <option key={x.idbank} value={x.idbank}>{x.code}{x.libelle ? ` · ${x.libelle.replace(/^Index (du bâtiment|Travaux Publics) - [A-Z0-9]+ - /, "")}` : ""}</option>)}
                </select>
              </label>
              {nr.idbank ? (
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Mois zéro
                    <input className="rv-champ" type="month" value={nr.mois_zero} onChange={(e) => setNr((s) => ({ ...s, mois_zero: e.target.value }))} />
                  </label>
                  <label className="rv-libelle">Partie fixe a
                    <input className="rv-champ" inputMode="decimal" value={nr.partie_fixe} onChange={(e) => setNr((s) => ({ ...s, partie_fixe: e.target.value }))} placeholder="0,15" />
                  </label>
                </div>
              ) : null}
              {nr.idbank && /^\d{4}-\d{2}$/.test(nr.mois_zero) ? (
                <p className="lor-sous">
                  I<sub>0</sub> = {(() => { const v = valeurs.find((x) => x.idbank === nr.idbank && x.mois.slice(0, 7) === nr.mois_zero); return v ? decimal(v.valeur, 2) : "pas encore relevé : la révision attendra le relevé"; })()}
                </p>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!revisionOk || envoi} onClick={soumettreRevision}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
