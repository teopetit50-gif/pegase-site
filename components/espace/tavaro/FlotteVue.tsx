"use client";

/* ══════════════════════════════════════════════════════════════════════
   La flotte — garder, vendre ou renouveler, véhicule par véhicule
   (06/10/2026, session B2, module 05, migration b2_11)

   Une fiche économique par véhicule sur douze mois : le revenu, l'atelier,
   les loyers, la perte de valeur lue sur la cote de revente réelle (pas
   la valeur comptable), les jours d'immobilisation. Tavaro désigne ceux qui
   coûtent plus qu'ils ne rapportent, dit quand et par quel canal les
   vendre ; la direction valide chaque mise en vente — une autre personne
   que celle qui la propose — et le journal en garde la trace. Lisible par
   la direction et les valideurs seulement.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Gauge, Tag } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, Vide, type Teinte } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import type { AvisFlotte, CanalSortie, FicheVehicule, Flotte, Role, SortieFlotte, SourceCote } from "./types";

export type GestesFlotte = {
  poserEconomie: (vehicule: string, valeurs: Record<string, unknown>) => Promise<void>;
  proposer: (vehicule: string, valeurs: Record<string, unknown>) => Promise<void>;
  decider: (s: SortieFlotte, valider: boolean, motif: string | null) => Promise<void>;
  conclure: (s: SortieFlotte, prix: number, le: string | null, acheteur: string | null) => Promise<void>;
  annuler: (s: SortieFlotte, motif: string) => Promise<void>;
};

const AVIS: Record<AvisFlotte, { libelle: string; teinte: Teinte; rang: number }> = {
  sortir: { libelle: "À sortir", teinte: "rouge", rang: 0 },
  restituer: { libelle: "À restituer", teinte: "ambre", rang: 1 },
  surveiller: { libelle: "À surveiller", teinte: "ambre", rang: 2 },
  garder: { libelle: "À garder", teinte: "vert", rang: 3 },
};
const CANAUX: Record<CanalSortie, string> = {
  reprise_concession: "Reprise en concession", marchand: "Marchand", encheres: "Enchères professionnelles", particulier: "Vente à un particulier", restitution_loueur: "Restitution au loueur financier",
};
const SOURCES: Record<SourceCote, string> = { argus: "Argus", la_centrale: "La Centrale", offre_reprise: "Offre de reprise", offre_marchand: "Offre d'un marchand", estimation: "Estimation" };
const STATUTS: Record<SortieFlotte["statut"], { libelle: string; teinte: Teinte }> = {
  proposee: { libelle: "à valider par la direction", teinte: "ambre" }, validee: { libelle: "mise en vente validée", teinte: "bleu" },
  refusee: { libelle: "refusée", teinte: "gris" }, vendue: { libelle: "vendue", teinte: "vert" }, annulee: { libelle: "retirée", teinte: "gris" },
};
const nombre = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);
const milliers = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Math.round(n).toLocaleString("fr-FR"));
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Saisie = { cote: string; source: SourceCote; le: string; comptable: string; financement: FicheVehicule["financement"]; loyer: string; fin: string };

export default function FlotteVue({ flotte, role, moi, nommer, gestes }: {
  flotte: Flotte | null;
  role: Role | null;
  moi: string;
  nommer: (id: string | null | undefined) => string;
  gestes: GestesFlotte;
}) {
  const [ouverte, setOuverte] = useState<FicheVehicule | null>(null);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [proposition, setProposition] = useState<{ motif: string; canal: CanalSortie; prix: string } | null>(null);
  const [refus, setRefus] = useState<{ s: SortieFlotte; motif: string } | null>(null);
  const [vente, setVente] = useState<{ s: SortieFlotte; prix: string; le: string; acheteur: string } | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const directionStricte = role === "gerant" || role === "admin";
  const peutLire = directionStricte || role === "valideur";
  const fiches = useMemo(() => [...(flotte?.fiches ?? [])].sort((a, b) => AVIS[a.avis].rang - AVIS[b.avis].rang || a.marge - b.marge), [flotte]);
  const sorties = useMemo(() => (flotte?.sorties ?? []).filter((s) => s.statut === "proposee" || s.statut === "validee" || s.vendu_le), [flotte]);
  const ouvertes = (flotte?.sorties ?? []).filter((s) => s.statut === "proposee" || s.statut === "validee");
  const sortieDe = (vehicule: string) => ouvertes.find((s) => s.vehicule_id === vehicule) ?? null;
  const aSortir = fiches.filter((f) => f.avis === "sortir").length;
  const aRestituer = fiches.filter((f) => f.avis === "restituer").length;
  const aValider = ouvertes.filter((s) => s.statut === "proposee").length;

  if (!peutLire || !flotte) return null;

  async function agir(cle: string, action: () => Promise<string>) {
    setEnvoi(cle);
    setErreur(null);
    try {
      const m = await action();
      setFait(m);
      setOuverte(null);
      setSaisie(null);
      setProposition(null);
      setRefus(null);
      setVente(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(null);
    }
  }
  const ouvrir = (f: FicheVehicule) => {
    setErreur(null);
    setFait(null);
    setProposition(null);
    setSaisie({
      cote: f.cote ? String(f.cote.eur) : "", source: f.cote?.source ?? "argus", le: f.cote?.le ?? aujourdhui(), comptable: f.valeur_comptable !== null ? String(f.valeur_comptable) : "",
      financement: f.financement, loyer: "", fin: f.fin_contrat_le ?? "",
    });
    setOuverte(f);
  };
  const coteSaisie = saisie ? nombre(saisie.cote) : null;
  const saisieValide = !!saisie && (coteSaisie === null || (Number.isFinite(coteSaisie) && coteSaisie >= 0)) && !!saisie.le && saisie.le <= aujourdhui();

  return (
    <section className="esp-carte" aria-label="Flotte : garder, vendre ou renouveler">
      <div className="esp-carte-tete">
        <div className="esp-item-haut">
          <h2 className="esp-carte-titre">Flotte : garder, vendre ou renouveler</h2>
          {aSortir ? <Pastille teinte="rouge">{aSortir} à sortir</Pastille> : null}
          {aRestituer ? <Pastille teinte="ambre">{aRestituer} à restituer</Pastille> : null}
          {aValider ? <Pastille teinte="bleu">{aValider} mise{aValider > 1 ? "s" : ""} en vente à valider</Pastille> : null}
        </div>
      </div>
      <div className="esp-carte-corps">
        <p className="esp-kpi-sous" style={{ marginBottom: 10 }}>
          Douze mois par véhicule : le revenu des contrats, l&apos;atelier, les loyers et la perte de valeur lue sur la cote de revente réelle — pas la valeur comptable.
          Les véhicules qui coûtent plus qu&apos;ils ne rapportent viennent en premier, avec le moment et le canal de revente. La direction valide chaque mise en vente.
        </p>
        {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {erreur && !ouverte && !refus && !vente ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
        {fiches.length === 0 ? (
          <Vide titre="Aucun véhicule en service">Les véhicules arrivent par l&apos;export de votre logiciel ; leur fiche économique se remplit avec les contrats.</Vide>
        ) : (
          <div className="esp-tableau-cadre tav-flotte-cadre" tabIndex={0} role="region" aria-label="Fiches économiques de la flotte">
            <table className="esp-tableau tav-flotte">
              <thead>
                <tr>
                  <th scope="col">Véhicule</th>
                  <th scope="col">Avis</th>
                  <th scope="col" className="esp-num">Marge 12 mois</th>
                  <th scope="col" className="esp-num">Loué</th>
                  <th scope="col" className="esp-num">Immobilisé</th>
                  <th scope="col" className="esp-num">Km</th>
                  <th scope="col" className="esp-num">Cote réelle</th>
                  <th scope="col">Quand, comment</th>
                  <th scope="col"><span className="sr-only">Fiche</span></th>
                </tr>
              </thead>
              <tbody>
                {fiches.map((f) => {
                  const s = sortieDe(f.vehicule);
                  return (
                    <tr key={f.vehicule}>
                      <th scope="row"><span className="esp-mono">{f.immatriculation}</span><br /><span className="esp-kpi-sous">{f.modele ?? ""}{f.financement !== "achat" ? ` · ${f.financement.toUpperCase()}` : ""}</span></th>
                      <td><Pastille teinte={AVIS[f.avis].teinte}>{AVIS[f.avis].libelle}</Pastille>{s ? <><br /><span className="esp-kpi-sous">{STATUTS[s.statut].libelle}</span></> : null}</td>
                      <td className="esp-num" data-negatif={f.marge < 0 ? "oui" : undefined}>{montant(f.marge)}</td>
                      <td className="esp-num">{f.utilisation_pct.toLocaleString("fr-FR")} %</td>
                      <td className="esp-num">{f.jours_immobilises ? `${Math.round(f.jours_immobilises)} j` : "—"}</td>
                      <td className="esp-num">{milliers(f.km)}</td>
                      <td className="esp-num">{f.cote ? montant(f.cote.eur) : f.financement === "lld" || f.financement === "loa" ? "—" : <span className="esp-kpi-sous">à saisir</span>}</td>
                      <td><span>{f.moment ?? "—"}</span><br /><span className="esp-kpi-sous">{CANAUX[f.canal]}</span></td>
                      <td><button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir(f)} aria-label={`Fiche de ${f.immatriculation}`}><Gauge width={14} height={14} aria-hidden="true" /> Fiche</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sorties.length ? (
          <>
            <h3 className="tav-parc-titre">Mises en vente</h3>
            <ul className="tav-avis-liste" aria-label="Mises en vente">
              {sorties.map((s) => (
                <li key={s.id} className="tav-avis">
                  <div className="esp-item-haut">
                    <span className="esp-mono" style={{ fontWeight: 600 }}>{s.fiche.immatriculation}</span>
                    <Pastille teinte={STATUTS[s.statut].teinte}>{STATUTS[s.statut].libelle}</Pastille>
                    <span className="esp-kpi-sous">{CANAUX[s.canal]}</span>
                    {s.prix_vente_eur !== null ? <span className="esp-item-montant">{montant(s.prix_vente_eur)}</span> : s.prix_vise_eur !== null ? <span className="esp-item-montant">visé {montant(s.prix_vise_eur)}</span> : null}
                  </div>
                  <p className="tav-avis-titre">{s.motif}</p>
                  <p className="esp-kpi-sous">
                    Proposée le {dateHeure(s.propose_le)} par {nommer(s.propose_par)}
                    {s.decide_le ? ` · validée le ${dateCourte(s.decide_le)} par ${nommer(s.decide_par)}` : ""}
                    {s.vendu_le ? ` · vendue le ${dateCourte(s.vendu_le)}${s.acheteur ? ` à ${s.acheteur}` : ""}` : ""}
                  </p>
                  {s.statut === "proposee" || s.statut === "validee" ? (
                    <div className="esp-actions">
                      {s.statut === "proposee" ? (
                        <>
                          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!directionStricte || s.propose_par === moi || envoi !== null}
                            title={!directionStricte ? "La direction seule valide une mise en vente" : s.propose_par === moi ? "Une autre personne de la direction valide ce que vous avez proposé" : undefined}
                            onClick={() => agir(`v:${s.id}`, async () => { await gestes.decider(s, true, null); return `La mise en vente de ${s.fiche.immatriculation} est validée.`; })}>
                            {envoi === `v:${s.id}` ? <Loader variant="spin" /> : null} Valider la mise en vente
                          </button>
                          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!directionStricte || s.propose_par === moi}
                            onClick={() => { setErreur(null); setFait(null); setRefus({ s, motif: "" }); }}>Refuser</button>
                        </>
                      ) : (
                        <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => { setErreur(null); setFait(null); setVente({ s, prix: s.prix_vise_eur !== null ? String(s.prix_vise_eur) : "", le: aujourdhui(), acheteur: "" }); }}>
                          <Tag width={14} height={14} aria-hidden="true" /> Vente conclue
                        </button>
                      )}
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi !== null || !(s.propose_par === moi || directionStricte)}
                        onClick={() => agir(`a:${s.id}`, async () => { await gestes.annuler(s, "Retirée depuis l'écran de la flotte"); return `La mise en vente de ${s.fiche.immatriculation} est retirée.`; })}>Retirer</button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <Dialog open={!!ouverte} onOpenChange={(o) => !o && setOuverte(null)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><Gauge width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{ouverte ? `${ouverte.immatriculation}${ouverte.modele ? ` — ${ouverte.modele}` : ""}` : ""}</DialogTitle>
            <DialogDescription>Du {ouverte ? dateCourte(ouverte.periode.du) : ""} au {ouverte ? dateCourte(ouverte.periode.au) : ""}. La perte de valeur se lit sur la cote réelle ; le revenu sur le tarif journalier des contrats.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {ouverte && saisie ? (
              <div className="esp-form">
                <div className="esp-item-haut">
                  <Pastille teinte={AVIS[ouverte.avis].teinte}>{AVIS[ouverte.avis].libelle}</Pastille>
                  <strong>{montant(ouverte.marge)}</strong><span className="esp-kpi-sous">de marge sur douze mois</span>
                </div>
                {ouverte.raisons.length ? <ul className="tav-avert">{ouverte.raisons.map((r) => <li key={r}><span>{r}</span></li>)}</ul> : null}
                <dl className="tav-fiche">
                  <dt>Revenu</dt><dd>{montant(ouverte.revenu.total)} — {ouverte.revenu.jours_loues} jours loués ({ouverte.utilisation_pct.toLocaleString("fr-FR")} %){ouverte.revenu.frais ? `, dont ${montant(ouverte.revenu.frais)} de frais refacturés` : ""}{ouverte.revenu.contrats_sans_tarif ? ` · ${ouverte.revenu.contrats_sans_tarif} contrat${ouverte.revenu.contrats_sans_tarif > 1 ? "s" : ""} sans tarif, non compté${ouverte.revenu.contrats_sans_tarif > 1 ? "s" : ""}` : ""}</dd>
                  <dt>Atelier et carrosserie</dt><dd>{montant(ouverte.couts.atelier)}{ouverte.jours_immobilises ? ` · ${Math.round(ouverte.jours_immobilises)} jours immobilisé` : ""}</dd>
                  {ouverte.couts.financement ? <><dt>Loyers</dt><dd>{montant(ouverte.couts.financement)}{ouverte.fin_contrat_le ? ` · contrat jusqu'au ${dateCourte(ouverte.fin_contrat_le)}` : ""}</dd></> : null}
                  <dt>Perte de valeur</dt><dd>{ouverte.couts.perte_valeur !== null ? montant(ouverte.couts.perte_valeur) : "inconnue : saisissez la cote réelle"}</dd>
                  <dt>Cote réelle</dt><dd>{ouverte.cote ? `${montant(ouverte.cote.eur)} (${SOURCES[ouverte.cote.source]}, ${dateCourte(ouverte.cote.le)})` : "—"}{ouverte.ecart_cote_comptable !== null ? ` · ${ouverte.ecart_cote_comptable >= 0 ? "+" : ""}${montant(ouverte.ecart_cote_comptable)} par rapport à la valeur comptable` : ""}</dd>
                  <dt>Kilométrage</dt><dd>{milliers(ouverte.km)} km{ouverte.km_an ? ` · ${milliers(ouverte.km_an)} km par an` : ""}{ouverte.age_mois !== null ? ` · ${ouverte.age_mois} mois` : ""}</dd>
                  <dt>Quand</dt><dd>{ouverte.moment ?? "—"}</dd>
                  <dt>Comment</dt><dd>{CANAUX[ouverte.canal]} — {ouverte.canal_raison}</dd>
                </dl>

                <fieldset className="tav-saisie-cote">
                  <legend className="rv-libelle">Cote et financement</legend>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Cote réelle (€)<input className="rv-champ" inputMode="decimal" value={saisie.cote} onChange={(e) => setSaisie({ ...saisie, cote: e.target.value })} /></label>
                    <label className="rv-libelle">Source
                      <select className="rv-champ" value={saisie.source} onChange={(e) => setSaisie({ ...saisie, source: e.target.value as SourceCote })}>
                        {Object.entries(SOURCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </label>
                    <label className="rv-libelle">Lue le<input type="date" className="rv-champ" value={saisie.le} max={aujourdhui()} onChange={(e) => setSaisie({ ...saisie, le: e.target.value })} /></label>
                  </div>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">Valeur comptable (€)<input className="rv-champ" inputMode="decimal" value={saisie.comptable} onChange={(e) => setSaisie({ ...saisie, comptable: e.target.value })} /></label>
                    <label className="rv-libelle">Financement
                      <select className="rv-champ" value={saisie.financement} onChange={(e) => setSaisie({ ...saisie, financement: e.target.value as Saisie["financement"] })}>
                        <option value="achat">Achat</option><option value="credit">Crédit</option><option value="lld">LLD</option><option value="loa">LOA</option>
                      </select>
                    </label>
                  </div>
                  {saisie.financement !== "achat" ? (
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">Loyer mensuel (€)<input className="rv-champ" inputMode="decimal" value={saisie.loyer} onChange={(e) => setSaisie({ ...saisie, loyer: e.target.value })} /></label>
                      <label className="rv-libelle">Fin du contrat<input type="date" className="rv-champ" value={saisie.fin} onChange={(e) => setSaisie({ ...saisie, fin: e.target.value })} /></label>
                    </div>
                  ) : null}
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi !== null || !saisieValide}
                      onClick={() => agir("eco", async () => {
                        const v: Record<string, unknown> = { financement: saisie.financement, cote_eur: saisie.cote.trim() ? coteSaisie : "", cote_source: saisie.source, cote_le: saisie.le };
                        if (saisie.comptable.trim()) v.valeur_comptable_eur = nombre(saisie.comptable);
                        if (saisie.financement !== "achat") { if (saisie.loyer.trim()) v.loyer_mensuel_eur = nombre(saisie.loyer); if (saisie.fin) v.fin_contrat_le = saisie.fin; }
                        await gestes.poserEconomie(ouverte.vehicule, v);
                        return `La fiche de ${ouverte.immatriculation} est recalculée.`;
                      })}>
                      {envoi === "eco" ? <Loader variant="spin" /> : null} Enregistrer et recalculer
                    </button>
                  </div>
                </fieldset>

                {sortieDe(ouverte.vehicule) ? (
                  <Avis teinte="bleu">Une mise en vente est déjà en cours pour ce véhicule : {STATUTS[sortieDe(ouverte.vehicule)!.statut].libelle}.</Avis>
                ) : proposition ? (
                  <fieldset className="tav-saisie-cote">
                    <legend className="rv-libelle">Proposer la mise en vente</legend>
                    <label className="rv-libelle">Pourquoi, chiffres à l&apos;appui <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={proposition.motif} onChange={(e) => setProposition({ ...proposition, motif: e.target.value })} /></label>
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">Canal
                        <select className="rv-champ" value={proposition.canal} onChange={(e) => setProposition({ ...proposition, canal: e.target.value as CanalSortie })}>
                          {Object.entries(CANAUX).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </label>
                      <label className="rv-libelle">Prix visé (€)<input className="rv-champ" inputMode="decimal" value={proposition.prix} onChange={(e) => setProposition({ ...proposition, prix: e.target.value })} /></label>
                    </div>
                    <p className="esp-kpi-sous">La direction valide — une autre personne que vous. La fiche d&apos;aujourd&apos;hui est jointe à la proposition.</p>
                  </fieldset>
                ) : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {ouverte && !sortieDe(ouverte.vehicule) ? (
              proposition ? (
                <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || proposition.motif.trim().length < 5}
                  onClick={() => agir("prop", async () => {
                    await gestes.proposer(ouverte.vehicule, { motif: proposition.motif.trim(), canal: proposition.canal, prix_vise_eur: nombre(proposition.prix) ?? undefined });
                    return `La mise en vente de ${ouverte.immatriculation} est proposée : la direction la valide.`;
                  })}>
                  {envoi === "prop" ? <Loader variant="spin" /> : null} Proposer à la direction
                </button>
              ) : (
                <button type="button" className="r-btn r-btn--noir" onClick={() => setProposition({ motif: ouverte.raisons.length ? `${ouverte.raisons.join(" ; ")}.` : "", canal: ouverte.canal, prix: ouverte.cote ? String(ouverte.cote.eur) : "" })}>
                  <Tag width={14} height={14} aria-hidden="true" /> Proposer la mise en vente
                </button>
              )
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!refus} onOpenChange={(o) => !o && setRefus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Tag width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Refuser la mise en vente de {refus?.s.fiche.immatriculation}</DialogTitle>
            <DialogDescription>Le véhicule reste dans la flotte. Le motif reste au journal.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(cinq caractères au moins)</span><textarea className="rv-champ" rows={3} value={refus?.motif ?? ""} onChange={(e) => refus && setRefus({ ...refus, motif: e.target.value })} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={envoi !== null || (refus?.motif.trim().length ?? 0) < 5}
              onClick={() => refus && agir("refus", async () => { await gestes.decider(refus.s, false, refus.motif.trim()); return `La mise en vente de ${refus.s.fiche.immatriculation} est refusée.`; })}>
              {envoi === "refus" ? <Loader variant="spin" /> : null} Refuser
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vente} onOpenChange={(o) => !o && setVente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Tag width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Vente conclue — {vente?.s.fiche.immatriculation}</DialogTitle>
            <DialogDescription>Le véhicule sort de la flotte. Le prix obtenu, face à la cote et au prix visé, reste au journal.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {vente ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">Prix de vente (€) <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={vente.prix} onChange={(e) => setVente({ ...vente, prix: e.target.value })} /></label>
                  <label className="rv-libelle">Le<input type="date" className="rv-champ" value={vente.le} max={aujourdhui()} onChange={(e) => setVente({ ...vente, le: e.target.value })} /></label>
                </div>
                <label className="rv-libelle">Acheteur<input className="rv-champ" value={vente.acheteur} onChange={(e) => setVente({ ...vente, acheteur: e.target.value })} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !vente || !Number.isFinite(nombre(vente.prix) ?? NaN) || (nombre(vente.prix) ?? -1) < 0}
              onClick={() => vente && agir("vente", async () => { await gestes.conclure(vente.s, nombre(vente.prix)!, vente.le || null, vente.acheteur.trim() || null); return `${vente.s.fiche.immatriculation} est vendu et sort de la flotte.`; })}>
              {envoi === "vente" ? <Loader variant="spin" /> : null} Enregistrer la vente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
