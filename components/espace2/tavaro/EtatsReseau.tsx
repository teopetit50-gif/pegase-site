"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — l'état et les fenêtres de Réseau et flotte (02/11/2026)

   Le code de l'écran d'avant, ligne pour ligne, sans les cartes qui le
   portaient : AuditVue (audit des retours, indicateur du mois) et
   FlotteVue (fiche économique, mises en vente) deviennent chacun un
   crochet (useAuditEtat, useFlotteEtat) et leurs fenêtres un composant
   (FenetresAudit, FenetresFlotte). La page Réseau et flotte (copie de la
   liste des Initiatives de Linear) dessine les lignes.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Gauge, Tag } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille, type Teinte } from "@/components/espace/ui";
import { dateCourte, montant } from "@/components/espace/format";
import { chiffrerLocal } from "@/components/espace/tavaro/calcul";
import { auditerRetour, chargerAudits, cloreAudit, ouvrirAudit, type Audit, type Indicateur, type LigneAudit, type Monde } from "@/components/espace/tavaro/portes";
import type { GestesFlotte } from "@/components/espace/tavaro/FlotteVue";
import type { AvisFlotte, CanalSortie, Dossier, FicheVehicule, LigneBareme, Reglages, Retour, Role, SortieFlotte, SourceCote } from "@/components/espace/tavaro/types";

/* ——— l'audit des retours et l'indicateur du mois (AuditVue : B34, B35, F17, F18, G44-G46) ——— */
export const FAMILLES_AUDIT: Record<string, string> = { carburant: "Carburant", kilometres: "Kilomètres", retard: "Retard", dommage: "Dommages", nettoyage: "Nettoyage", frais: "Frais", autre: "Autre" };
const nombre = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);
/* 04/11 — l'exemple : un audit clos de vingt retours d'avant Tavaro (ce qui avait été facturé,
   ce que Tavaro aurait chiffré), pour que l'indicateur « avant / après » se lise (promesses TAVARO n° 12 et 42) */
const AUDIT_EXEMPLE: { audits: Audit[]; lignes: LigneAudit[] } = (() => {
  const id = "00000000-0000-4000-8000-0000000au001";
  const ilYa = (j: number) => new Date(Date.now() - j * 86_400_000).toISOString();
  /* [contrat, facturé avant, carburant, km, retard, dommages, nettoyage] — en euros TTC */
  const R: [string, number, number, number, number, number, number][] = [
    ["C-2025-0702", 0, 38.4, 0, 0, 0, 0], ["C-2025-0705", 25, 0, 0, 25, 0, 0], ["C-2025-0711", 0, 0, 0, 0, 0, 0], ["C-2025-0716", 0, 61.2, 18.6, 0, 0, 0],
    ["C-2025-0719", 120, 0, 0, 0, 180, 0], ["C-2025-0724", 0, 0, 0, 0, 0, 45], ["C-2025-0730", 0, 22.8, 0, 0, 0, 0], ["C-2025-0733", 0, 0, 0, 0, 0, 0],
    ["C-2025-0741", 30, 30.6, 0, 0, 0, 0], ["C-2025-0748", 0, 0, 42.3, 0, 0, 0], ["C-2025-0752", 0, 0, 0, 50, 0, 0], ["C-2025-0757", 0, 0, 0, 0, 0, 0],
    ["C-2025-0763", 0, 47.1, 0, 0, 0, 0], ["C-2025-0768", 0, 0, 0, 0, 95, 0], ["C-2025-0771", 0, 0, 0, 0, 0, 0], ["C-2025-0779", 45, 45.9, 0, 0, 0, 0],
    ["C-2025-0782", 0, 0, 0, 0, 0, 30], ["C-2025-0788", 0, 15.3, 0, 25, 0, 0], ["C-2025-0791", 0, 0, 0, 0, 0, 0], ["C-2025-0796", 0, 0, 27.9, 0, 0, 0],
  ];
  const FAM: [string, string][] = [["carburant", "Carburant manquant"], ["kilometres", "Kilomètres au-delà du forfait"], ["retard", "Retour en retard"], ["dommage", "Dommage relevé au retour"], ["nettoyage", "Nettoyage"]];
  return {
    audits: [{ id, libelle: "Vingt retours de l'été 2025, avant Tavaro", statut: "clos", cree_le: ilYa(40), clos_le: ilYa(33) }],
    lignes: R.map(([numero, avant, ...m], i) => {
      const lignes = m.flatMap((v, k) => (v ? [{ code: FAM[k][0], famille: FAM[k][0], libelle: FAM[k][1], montant_ttc: v, statut: "chiffre" }] : []));
      return { id: `${id}-${i + 1}`, audit_id: id, contrat_id: `hist:${numero}`, facture_historique_ttc: avant, chiffre_ttc: Math.round(lignes.reduce((s, l) => s + l.montant_ttc, 0) * 100) / 100, statut_chiffrage: "chiffre", lignes };
    }),
  };
})();

type SaisieAudit = { contrat: string; historique: string; retour: string; km: string; dep8: string; ret8: string; dommages: string[] };

export function useAuditEtat({ source, role, moi, dossiers, bareme, reglages }: { source: "exemple" | "reelle"; role: Role | null; moi: string; dossiers: Dossier[]; bareme: LigneBareme[]; reglages: Reglages | null }) {
  const [monte, setMonte] = useState(false);
  const [maintenant, setMaintenant] = useState(0);
  const [reel, setReel] = useState<{ audits: Audit[]; lignes: LigneAudit[]; indicateur: Indicateur | null } | null>(null);
  const [local, setLocal] = useState<{ audits: Audit[]; lignes: LigneAudit[] }>(AUDIT_EXEMPLE);
  const [choix, setChoix] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<SaisieAudit | null>(null);
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
  const numero = (c: string) => dossiers.find((d) => d.contrat.id === c)?.contrat.numero ?? (c.startsWith("hist:") ? c.slice(5) : "—");

  /* l'indicateur : la porte en base réelle ; le même calcul sur l'exemple */
  const indicateur = useMemo<Indicateur | null>(() => {
    if (source === "reelle") return reel?.indicateur ?? null;
    if (!maintenant) return null;
    /* 04/11 — en exemple, une fenêtre glissante de 30 jours : un mois calendaire tout juste commencé donnait 0 € (promesse TAVARO n° 42) */
    const mois = "30 derniers jours";
    const depuis = new Date(maintenant - 30 * 86_400_000).toISOString().slice(0, 10);
    const dedans = (iso: string | null | undefined) => (iso ?? "").slice(0, 10) >= depuis;
    const retours = dossiers.filter((d) => d.contrat.retour_reel_le && dedans(d.contrat.retour_reel_le)).length;
    const factures = dossiers.flatMap((d) => d.factures).filter((f) => dedans(f.date_facture)).reduce((s, f) => s + f.total_ttc, 0);
    const avoirs = dossiers.flatMap((d) => d.avoirs).filter((a) => dedans(a.date_avoir)).reduce((s, a) => s + a.montant_ttc, 0);
    const clos = local.audits.find((a) => a.statut === "clos");
    const ls = local.lignes.filter((l) => l.audit_id === clos?.id);
    return { mois, retours, factures_ttc: factures, avoirs_ttc: avoirs, pour_100_retours: retours ? Math.round(((factures - avoirs) * 100) / retours * 100) / 100 : null,
      avant_pour_100_retours: ls.length ? Math.round((ls.reduce((s, l) => s + l.facture_historique_ttc, 0) * 100) / ls.length * 100) / 100 : null, audit: clos?.libelle ?? null };
  }, [source, reel, maintenant, dossiers, local]);


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

  const retourDe = (s: SaisieAudit): Retour => ({
    retour_reel_le: s.retour ? new Date(s.retour).toISOString() : "", km_retour: nombre(s.km), carburant_depart_8: nombre(s.dep8), carburant_retour_8: nombre(s.ret8),
    charge_retour_pct: null, non_contradictoire: false, dommages: s.dommages.map((code) => ({ code, preuves: [{ note: "Audit : dossier du retour passé" }] })), postes: [], preuves: {},
  });

  async function ajouter(s: SaisieAudit) {
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

  /* G46 : « Clore l'audit » (AuditVue.tsx:179-185), confirmé par la page */
  const clore = () =>
    agir(async () => {
      if (!audit) throw new Error("Aucun audit ouvert.");
      if (source === "reelle") await cloreAudit(audit.id);
      else setLocal((o) => ({ ...o, audits: o.audits.map((x) => (x.id === audit.id ? { ...x, statut: "clos", clos_le: new Date().toISOString() } : x)) }));
      return `L'audit « ${audit.libelle} » est clos : il devient l'« avant » de l'indicateur.`;
    });
  return { source, dossiers, bareme, reglages, clore, agir, ajouter, audit, audits, choix, direction, directionStricte, dommages, donnees, envoi, erreur, fait, indicateur, lignes, local, maintenant, monte, nom, numero, parFamille, reel, relire, retourDe, saisie, setChoix, setEnvoi, setErreur, setFait, setLocal, setMaintenant, setMonte, setNom, setReel, setSaisie, sousFactures, total };
}
export type EtatAudit = ReturnType<typeof useAuditEtat>;
export function FenetresAudit({ a }: { a: EtatAudit }) {
  const { source, dossiers, agir, ajouter, dommages, envoi, erreur, nom, saisie, setChoix, setErreur, setLocal, setNom, setSaisie } = a;
  return (
    <>
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
    </>
  );
}

/* ——— la flotte : fiche économique et mises en vente (FlotteVue : B45, B46, F28-F30, G58-G63) ——— */
export const AVIS_FLOTTE: Record<AvisFlotte, { libelle: string; teinte: Teinte; rang: number }> = {
  sortir: { libelle: "À sortir", teinte: "rouge", rang: 0 },
  restituer: { libelle: "À restituer", teinte: "ambre", rang: 1 },
  surveiller: { libelle: "À surveiller", teinte: "ambre", rang: 2 },
  garder: { libelle: "À garder", teinte: "vert", rang: 3 },
};
export const CANAUX: Record<CanalSortie, string> = {
  reprise_concession: "Reprise en concession", marchand: "Marchand", encheres: "Enchères professionnelles", particulier: "Vente à un particulier", restitution_loueur: "Restitution au loueur financier",
};
const SOURCES: Record<SourceCote, string> = { argus: "Argus", la_centrale: "La Centrale", offre_reprise: "Offre de reprise", offre_marchand: "Offre d'un marchand", estimation: "Estimation" };
export const STATUTS_SORTIE: Record<SortieFlotte["statut"], { libelle: string; teinte: Teinte }> = {
  proposee: { libelle: "à valider par la direction", teinte: "ambre" }, validee: { libelle: "mise en vente validée", teinte: "bleu" },
  refusee: { libelle: "refusée", teinte: "gris" }, vendue: { libelle: "vendue", teinte: "vert" }, annulee: { libelle: "retirée", teinte: "gris" },
};
const nombreF = (s: string) => (s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);
const milliers = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Math.round(n).toLocaleString("fr-FR"));
export const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Saisie = { cote: string; source: SourceCote; le: string; comptable: string; financement: FicheVehicule["financement"]; loyer: string; fin: string };

export function useFlotteEtat({ flotte, role, moi, nommer, gestes }: { flotte: Monde["flotte"]; role: Role | null; moi: string; nommer: (id: string | null | undefined) => string; gestes: GestesFlotte }) {
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
  const fiches = useMemo(() => [...(flotte?.fiches ?? [])].sort((a, b) => AVIS_FLOTTE[a.avis].rang - AVIS_FLOTTE[b.avis].rang || a.marge - b.marge), [flotte]);
  const sorties = useMemo(() => (flotte?.sorties ?? []).filter((s) => s.statut === "proposee" || s.statut === "validee" || s.vendu_le), [flotte]);
  const ouvertes = (flotte?.sorties ?? []).filter((s) => s.statut === "proposee" || s.statut === "validee");
  const sortieDe = (vehicule: string) => ouvertes.find((s) => s.vehicule_id === vehicule) ?? null;
  const aSortir = fiches.filter((f) => f.avis === "sortir").length;
  const aRestituer = fiches.filter((f) => f.avis === "restituer").length;
  const aValider = ouvertes.filter((s) => s.statut === "proposee").length;


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
  const coteSaisie = saisie ? nombreF(saisie.cote) : null;
  const saisieValide = !!saisie && (coteSaisie === null || (Number.isFinite(coteSaisie) && coteSaisie >= 0)) && !!saisie.le && saisie.le <= aujourdhui();

  return { flotte, nommer, gestes, moi, aRestituer, aSortir, aValider, agir, coteSaisie, directionStricte, envoi, erreur, fait, fiches, ouverte, ouvertes, ouvrir, peutLire, proposition, refus, saisie, saisieValide, setEnvoi, setErreur, setFait, setOuverte, setProposition, setRefus, setSaisie, setVente, sortieDe, sorties, vente };
}
export type EtatFlotte = ReturnType<typeof useFlotteEtat>;
export function FenetresFlotte({ f }: { f: EtatFlotte }) {
  const { gestes, agir, coteSaisie, envoi, erreur, ouverte, proposition, refus, saisie, saisieValide, setOuverte, setProposition, setRefus, setSaisie, setVente, sortieDe, vente } = f;
  return (
    <>
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
                  <Pastille teinte={AVIS_FLOTTE[ouverte.avis].teinte}>{AVIS_FLOTTE[ouverte.avis].libelle}</Pastille>
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
                        if (saisie.comptable.trim()) v.valeur_comptable_eur = nombreF(saisie.comptable);
                        if (saisie.financement !== "achat") { if (saisie.loyer.trim()) v.loyer_mensuel_eur = nombreF(saisie.loyer); if (saisie.fin) v.fin_contrat_le = saisie.fin; }
                        await gestes.poserEconomie(ouverte.vehicule, v);
                        return `La fiche de ${ouverte.immatriculation} est recalculée.`;
                      })}>
                      {envoi === "eco" ? <Loader variant="spin" /> : null} Enregistrer et recalculer
                    </button>
                  </div>
                </fieldset>

                {sortieDe(ouverte.vehicule) ? (
                  <Avis teinte="bleu">Une mise en vente est déjà en cours pour ce véhicule : {STATUTS_SORTIE[sortieDe(ouverte.vehicule)!.statut].libelle}.</Avis>
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
                    await gestes.proposer(ouverte.vehicule, { motif: proposition.motif.trim(), canal: proposition.canal, prix_vise_eur: nombreF(proposition.prix) ?? undefined });
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
            <button type="button" className="r-btn r-btn--noir" disabled={envoi !== null || !vente || !Number.isFinite(nombreF(vente.prix) ?? NaN) || (nombreF(vente.prix) ?? -1) < 0}
              onClick={() => vente && agir("vente", async () => { await gestes.conclure(vente.s, nombreF(vente.prix)!, vente.le || null, vente.acheteur.trim() || null); return `${vente.s.fiche.immatriculation} est vendu et sort de la flotte.`; })}>
              {envoi === "vente" ? <Loader variant="spin" /> : null} Enregistrer la vente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
