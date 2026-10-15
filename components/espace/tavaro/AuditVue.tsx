"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'audit des retours et l'indicateur du mois (15/10/2026, session B2,
   migration b2_19)

   L'indicateur unique : les euros facturés (avoirs déduits) pour cent
   retours rendus dans le mois, face à l'« avant » mesuré par l'audit.
   L'audit : vingt retours passés, chacun rechiffré sur le barème par
   simulation (aucune proposition, aucune facture) et posé face à ce qui
   avait été facturé à l'époque. Direction et valideurs seulement ; la
   direction clôt l'audit, qui devient l'« avant ».
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { chiffrerLocal } from "./calcul";
import { auditerRetour, chargerAudits, cloreAudit, ouvrirAudit, type Audit, type Indicateur, type LigneAudit } from "./portes";
import type { Dossier, LigneBareme, Reglages, Retour, Role } from "./types";

const FAMILLES: Record<string, string> = { carburant: "Carburant", kilometres: "Kilomètres", retard: "Retard", dommage: "Dommages", nettoyage: "Nettoyage", frais: "Frais", autre: "Autre" };
const nombre = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);
type Saisie = { contrat: string; historique: string; retour: string; km: string; dep8: string; ret8: string; dommages: string[] };

export default function AuditVue({ source, role, moi, dossiers, bareme, reglages }: {
  source: "exemple" | "reelle";
  role: Role | null;
  moi: string;
  dossiers: Dossier[];
  bareme: LigneBareme[];
  reglages: Reglages | null;
}) {
  const [monte, setMonte] = useState(false);
  const [maintenant, setMaintenant] = useState(0);
  const [reel, setReel] = useState<{ audits: Audit[]; lignes: LigneAudit[]; indicateur: Indicateur | null } | null>(null);
  const [local, setLocal] = useState<{ audits: Audit[]; lignes: LigneAudit[] }>({ audits: [], lignes: [] });
  const [choix, setChoix] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const direction = role === "gerant" || role === "admin" || role === "valideur";
  const directionStricte = role === "gerant" || role === "admin";
  const relire = useCallback(async () => { try { setReel(await chargerAudits()); } catch { setReel(null); } }, []);
  useEffect(() => {
    const t = window.setTimeout(() => { setMonte(true); setMaintenant(Date.now()); if (source === "reelle" && direction) void relire(); }, 0);
    return () => window.clearTimeout(t);
  }, [source, direction, relire]);

  const donnees = source === "exemple" ? local : reel;
  const audits = donnees?.audits ?? [];
  const audit = audits.find((a) => a.id === choix) ?? audits[0] ?? null;
  const lignes = (donnees?.lignes ?? []).filter((l) => l.audit_id === audit?.id);
  const numero = (c: string) => dossiers.find((d) => d.contrat.id === c)?.contrat.numero ?? "—";

  /* l'indicateur : la porte en base réelle ; le même calcul sur l'exemple */
  const indicateur = useMemo<Indicateur | null>(() => {
    if (source === "reelle") return reel?.indicateur ?? null;
    if (!maintenant) return null;
    const mois = new Date(maintenant).toISOString().slice(0, 7);
    const retours = dossiers.filter((d) => (d.contrat.retour_reel_le ?? "").slice(0, 7) === mois).length;
    const factures = dossiers.flatMap((d) => d.factures).filter((f) => (f.date_facture ?? "").slice(0, 7) === mois).reduce((s, f) => s + f.total_ttc, 0);
    const avoirs = dossiers.flatMap((d) => d.avoirs).filter((a) => (a.date_avoir ?? "").slice(0, 7) === mois).reduce((s, a) => s + a.montant_ttc, 0);
    const clos = local.audits.find((a) => a.statut === "clos");
    const ls = local.lignes.filter((l) => l.audit_id === clos?.id);
    return { mois, retours, factures_ttc: factures, avoirs_ttc: avoirs, pour_100_retours: retours ? Math.round(((factures - avoirs) * 100) / retours * 100) / 100 : null,
      avant_pour_100_retours: ls.length ? Math.round((ls.reduce((s, l) => s + l.facture_historique_ttc, 0) * 100) / ls.length * 100) / 100 : null, audit: clos?.libelle ?? null };
  }, [source, reel, maintenant, dossiers, local]);

  if (!direction) return null;
  if (!monte) return <section className="esp-carte" aria-label="Audit des retours"><div className="esp-carte-corps"><Chargement texte="Lecture de l'audit…" /></div></section>;

  async function agir(action: () => Promise<string>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await action();
      if (source === "reelle") await relire();
      setFait(m);
      setSaisie(null);
      setNom(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }

  const retourDe = (s: Saisie): Retour => ({
    retour_reel_le: s.retour ? new Date(s.retour).toISOString() : "", km_retour: nombre(s.km), carburant_depart_8: nombre(s.dep8), carburant_retour_8: nombre(s.ret8),
    charge_retour_pct: null, non_contradictoire: false, dommages: s.dommages.map((code) => ({ code, preuves: [{ note: "Audit : dossier du retour passé" }] })), postes: [], preuves: {},
  });

  async function ajouter(s: Saisie) {
    if (!audit) throw new Error("Ouvrez d'abord un audit.");
    const historique = nombre(s.historique);
    if (!s.contrat) throw new Error("Choisissez le contrat du retour.");
    if (historique === null || historique < 0) throw new Error("Le montant facturé à l'époque est obligatoire (0 si rien n'a été facturé).");
    if (!s.retour) throw new Error("L'heure du retour est obligatoire.");
    const retour = retourDe(s);
    if (source === "reelle") {
      const r = await auditerRetour(audit.id, s.contrat, retour, historique);
      return `Contrat ${numero(s.contrat)} : ${montant(r.chiffre_ttc)} sur le barème, contre ${montant(historique)} facturés à l'époque.`;
    }
    const d = dossiers.find((x) => x.contrat.id === s.contrat);
    if (!d || !reglages) throw new Error("Contrat introuvable.");
    const calc = chiffrerLocal({ contrat: d.contrat, vehicule: d.vehicule, retour, bareme, reglages, version: 1, par: moi, ids: () => crypto.randomUUID(), retourPrevu: d.contrat.retour_prevu_le });
    const ligne: LigneAudit = { id: crypto.randomUUID(), audit_id: audit.id, contrat_id: s.contrat, facture_historique_ttc: historique, chiffre_ttc: calc.proposition.total_ttc,
      statut_chiffrage: calc.proposition.statut, lignes: calc.lignes.map((l) => ({ code: l.code ?? "", famille: l.famille, libelle: l.libelle, montant_ttc: l.montant_ttc, statut: l.statut })) };
    setLocal((o) => ({ ...o, lignes: [...o.lignes.filter((x) => !(x.audit_id === audit.id && x.contrat_id === s.contrat)), ligne] }));
    return `Contrat ${d.contrat.numero} : ${montant(ligne.chiffre_ttc)} sur le barème, contre ${montant(historique)} facturés à l'époque.`;
  }

  const total = (f: (l: LigneAudit) => number) => lignes.reduce((s, l) => s + f(l), 0);
  const parFamille = lignes.flatMap((l) => l.lignes).reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.famille]: (acc[x.famille] ?? 0) + x.montant_ttc }), {});
  const sousFactures = lignes.filter((l) => l.chiffre_ttc > l.facture_historique_ttc + 0.005).length;
  const dommages = bareme.filter((b) => b.famille === "dommage" && b.unite !== "devis");

  return (
    <section className="esp-carte" aria-label="Audit des retours">
      <div className="esp-carte-tete">
        <div className="tav-bareme-tete" style={{ width: "100%" }}>
          <h2 className="esp-carte-titre">Audit des retours et indicateur du mois</h2>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setErreur(null); setFait(null); setNom(""); }}>Ouvrir un audit</button>
          </div>
        </div>
      </div>
      <div className="esp-carte-corps">
        <div className="tav-parc-chiffres" role="list" aria-label="L'indicateur du mois">
          <div role="listitem"><span className="esp-kpi-etiquette">Ce mois-ci</span><strong>{indicateur?.pour_100_retours !== null && indicateur?.pour_100_retours !== undefined ? montant(indicateur.pour_100_retours) : "—"}</strong><span className="esp-kpi-sous">facturés pour 100 retours ({indicateur?.retours ?? 0} rendus)</span></div>
          <div role="listitem"><span className="esp-kpi-etiquette">Avant Tavaro</span><strong>{indicateur?.avant_pour_100_retours !== null && indicateur?.avant_pour_100_retours !== undefined ? montant(indicateur.avant_pour_100_retours) : "—"}</strong><span className="esp-kpi-sous">{indicateur?.audit ? `mesuré par « ${indicateur.audit} »` : "à mesurer par un audit clos"}</span></div>
          <div role="listitem"><span className="esp-kpi-etiquette">Avoirs du mois</span><strong>{montant(indicateur?.avoirs_ttc ?? 0)}</strong><span className="esp-kpi-sous">déduits de l&apos;indicateur</span></div>
        </div>
        {fait ? <div style={{ margin: "10px 0" }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {erreur && !saisie && nom === null ? <div style={{ margin: "10px 0" }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}

        {audits.length > 1 ? (
          <div className="esp-filtres" role="group" aria-label="Audits">
            {audits.map((a) => <button key={a.id} type="button" className="esp-filtre" aria-pressed={audit?.id === a.id} onClick={() => setChoix(a.id)}>{a.libelle}</button>)}
          </div>
        ) : null}
        {!audit ? <Vide titre="Aucun audit">Un audit reprend vingt retours passés, les rechiffre sur votre barème et les compare à ce qui avait été facturé. Rien n&apos;est facturé pendant l&apos;audit.</Vide> : (
          <>
            <div className="esp-item-haut" style={{ marginTop: 12 }}>
              <h3 className="tav-parc-titre" style={{ margin: 0 }}>{audit.libelle}</h3>
              <Pastille teinte={audit.statut === "clos" ? "gris" : "bleu"}>{audit.statut === "clos" ? `clos le ${dateCourte(audit.clos_le)}` : "ouvert"}</Pastille>
            </div>
            <div className="tav-parc-chiffres" role="list" aria-label="Le résultat de l'audit">
              <div role="listitem"><span className="esp-kpi-etiquette">Retours</span><strong>{lignes.length}</strong><span className="esp-kpi-sous">{sousFactures} sous-facturé{sousFactures > 1 ? "s" : ""}</span></div>
              <div role="listitem"><span className="esp-kpi-etiquette">Facturé à l&apos;époque</span><strong>{montant(total((l) => l.facture_historique_ttc))}</strong><span className="esp-kpi-sous">TTC</span></div>
              <div role="listitem"><span className="esp-kpi-etiquette">Sur le barème</span><strong>{montant(total((l) => l.chiffre_ttc))}</strong><span className="esp-kpi-sous">TTC, simulation</span></div>
              <div role="listitem"><span className="esp-kpi-etiquette">Écart</span><strong>{montant(total((l) => l.chiffre_ttc - l.facture_historique_ttc))}</strong><span className="esp-kpi-sous">{Object.entries(parFamille).filter(([, v]) => v > 0).map(([f, v]) => `${FAMILLES[f] ?? f} ${montant(v)}`).join(" · ") || "—"}</span></div>
            </div>
            {lignes.length ? (
              <ul className="tav-avis-liste" aria-label="Retours de l'audit">
                {lignes.map((l) => (
                  <li key={l.id} className="tav-avis">
                    <div className="esp-item-haut">
                      <span className="esp-mono" style={{ fontWeight: 600 }}>{numero(l.contrat_id)}</span>
                      {l.statut_chiffrage === "preuve_manquante" ? <Pastille teinte="ambre">preuve manquante</Pastille> : null}
                      <span className="esp-item-montant">{montant(l.chiffre_ttc - l.facture_historique_ttc)}</span>
                    </div>
                    <p className="esp-kpi-sous">Facturé à l&apos;époque {montant(l.facture_historique_ttc)} · sur le barème {montant(l.chiffre_ttc)}{l.lignes.length ? ` : ${l.lignes.map((x) => `${x.libelle} ${montant(x.montant_ttc)}`).join(", ")}` : ""}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {audit.statut === "ouvert" ? (
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={lignes.length >= 100}
                  onClick={() => { setErreur(null); setFait(null); setSaisie({ contrat: "", historique: "", retour: "", km: "", dep8: "", ret8: "", dommages: [] }); }}>Ajouter un retour</button>
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!directionStricte || envoi || lignes.length === 0} title={directionStricte ? undefined : "La direction clôt l'audit"}
                  onClick={() => void agir(async () => {
                    if (source === "reelle") await cloreAudit(audit.id);
                    else setLocal((o) => ({ ...o, audits: o.audits.map((a) => (a.id === audit.id ? { ...a, statut: "clos", clos_le: new Date().toISOString() } : a)) }));
                    return `L'audit « ${audit.libelle} » est clos : il devient l'« avant » de l'indicateur.`;
                  })}>Clore l&apos;audit</button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Dialog open={nom !== null} onOpenChange={(o) => { if (!o) { setNom(null); setErreur(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardList width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir un audit</DialogTitle>
            <DialogDescription>Vingt retours passés suffisent à mesurer ce qui n&apos;a pas été facturé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Nom de l&apos;audit <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={nom ?? ""} onChange={(e) => setNom(e.target.value)} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setNom(null)}>Annuler</button>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || (nom ?? "").trim().length < 3}
              onClick={() => void agir(async () => {
                const libelle = (nom ?? "").trim();
                if (source === "reelle") { const r = await ouvrirAudit(libelle); setChoix(r.audit); }
                else { const id = crypto.randomUUID(); setLocal((o) => ({ ...o, audits: [{ id, libelle, statut: "ouvert", cree_le: new Date().toISOString(), clos_le: null }, ...o.audits] })); setChoix(id); }
                return `L'audit « ${libelle} » est ouvert : ajoutez les retours un par un.`;
              })}>{envoi ? <Loader variant="spin" /> : null} Ouvrir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!saisie} onOpenChange={(o) => { if (!o) { setSaisie(null); setErreur(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ClipboardList width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ajouter un retour à l&apos;audit</DialogTitle>
            <DialogDescription>Le retour est chiffré sur votre barème par simulation : aucune facture n&apos;est préparée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {saisie ? (
              <div className="esp-form">
                <label className="rv-libelle">Contrat <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={saisie.contrat} onChange={(e) => setSaisie({ ...saisie, contrat: e.target.value })}>
                    <option value="">Choisir…</option>
                    {dossiers.map((d) => <option key={d.contrat.id} value={d.contrat.id}>{d.contrat.numero}{d.vehicule ? ` — ${d.vehicule.immatriculation}` : ""}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Facturé à l&apos;époque, TTC (€) <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={saisie.historique} onChange={(e) => setSaisie({ ...saisie, historique: e.target.value })} /></label>
                <label className="rv-libelle">Rendu le <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="datetime-local" value={saisie.retour} onChange={(e) => setSaisie({ ...saisie, retour: e.target.value })} /></label>
                <label className="rv-libelle">Kilométrage au retour<input className="rv-champ" inputMode="numeric" value={saisie.km} onChange={(e) => setSaisie({ ...saisie, km: e.target.value })} /></label>
                <label className="rv-libelle">Carburant au départ (huitièmes)<input className="rv-champ" inputMode="numeric" value={saisie.dep8} onChange={(e) => setSaisie({ ...saisie, dep8: e.target.value })} /></label>
                <label className="rv-libelle">Carburant au retour (huitièmes)<input className="rv-champ" inputMode="numeric" value={saisie.ret8} onChange={(e) => setSaisie({ ...saisie, ret8: e.target.value })} /></label>
                {dommages.length ? (
                  <fieldset className="tav-choix-vehicules">
                    <legend className="rv-libelle">Dommages constatés au retour</legend>
                    {dommages.map((b) => (
                      <label key={b.id} className="tav-coche"><input type="checkbox" checked={saisie.dommages.includes(b.code)}
                        onChange={(e) => setSaisie({ ...saisie, dommages: e.target.checked ? [...saisie.dommages, b.code] : saisie.dommages.filter((x) => x !== b.code) })} /><span>{b.libelle}</span></label>
                    ))}
                  </fieldset>
                ) : null}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setSaisie(null)}>Annuler</button>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => saisie && void agir(() => ajouter(saisie))}>{envoi ? <Loader variant="spin" /> : null} Chiffrer et ajouter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
