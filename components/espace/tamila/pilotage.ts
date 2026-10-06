/* ══════════════════════════════════════════════════════════════════════
   Le pilotage du cabinet (06/10/2026, session B4, carnet n° 5)

   Calculé dans le navigateur, sur ce que la RLS laisse voir : marge par
   dossier (honoraires facturés et à facturer contre le temps passé au
   coût de revient), charge par personne, séries (dossiers contre la même
   partie, ou même matière devant la même juridiction), dossiers sans
   diligence, pièces attendues. Les noms des séries viennent des
   intitulés déchiffrés ici ; rien n'est renvoyé au serveur.
   ══════════════════════════════════════════════════════════════════════ */

import { resumer } from "./HonorairesTamila";
import { normaliserNom } from "./index";
import type { Audience, Avis, Clair, Delai, Dossier, Honoraires, Personne, Piece, Vigilance } from "./types";

export type DonneesPilotage = {
  dossiers: { dossier: Dossier; clair: Clair | null }[];
  delais: Delai[];
  audiences: Audience[];
  avis: Pick<Avis, "dossier_id" | "date_avis">[];
  pieces: Pick<Piece, "objet_id" | "recue_le" | "type_piece">[];
  vigilances: Pick<Vigilance, "dossier_id" | "assujetti" | "identification_piece">[];
  honoraires: Record<string, Honoraires>;
  personnes: Personne[];
};

const JOUR = 86_400_000;
const VIVANTS = ["attente", "ouvert", "audit"];
const vide: Honoraires = { convention: null, conventions: [], temps: [], provisions: [], factures: [] };

export type MargeDossier = { dossier: Dossier; clair: Clair | null; minutes: number; factureHt: number; aFacturerHt: number; coutCents: number; margeCents: number; tauxRealiseCents: number | null };

/** Marge : (facturé HT + à facturer HT) − temps passé × coût de revient horaire. */
export function marges(x: DonneesPilotage, coutHoraireCents: number, maintenant: number): MargeDossier[] {
  return x.dossiers
    .filter((d) => VIVANTS.includes(d.dossier.statut) || d.dossier.statut === "clos")
    .map(({ dossier, clair }) => {
      const h = x.honoraires[dossier.id] ?? vide;
      const r = resumer(h, dossier, maintenant);
      const minutes = h.temps.filter((t) => t.statut !== "annule").reduce((s, t) => s + t.minutes, 0);
      const factureHt = h.factures.filter((f) => f.statut !== "annulee").reduce((s, f) => s + f.total_ht_cents, 0);
      const produit = factureHt + r.aFacturerHt;
      const coutCents = Math.round((minutes * coutHoraireCents) / 60);
      return { dossier, clair, minutes, factureHt, aFacturerHt: r.aFacturerHt, coutCents, margeCents: produit - coutCents, tauxRealiseCents: minutes ? Math.round((produit * 60) / minutes) : null };
    })
    .filter((m) => m.minutes > 0 || m.factureHt > 0 || m.aFacturerHt > 0)
    .sort((a, b) => a.margeCents - b.margeCents);
}

export type ChargePersonne = { personne: Personne; minutes30: number; dossiers: number; delais30: number; audiences30: number };

/** La charge de chacun : temps saisi sur trente jours, dossiers dont il est responsable, délais et audiences des trente jours. */
export function charges(x: DonneesPilotage, maintenant: number): ChargePersonne[] {
  const jour = (iso: string) => Date.parse(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  const vivants = new Set(x.dossiers.filter((d) => VIVANTS.includes(d.dossier.statut)).map((d) => d.dossier.id));
  const respDe = new Map(x.dossiers.map((d) => [d.dossier.id, d.dossier.responsable_id]));
  const temps = Object.values(x.honoraires).flatMap((h) => h.temps).filter((t) => t.statut !== "annule" && jour(t.jour) >= maintenant - 30 * JOUR);
  return x.personnes
    .filter((p) => p.role !== "lecteur")
    .map((p) => ({
      personne: p,
      minutes30: temps.filter((t) => t.user_id === p.user_id).reduce((s, t) => s + t.minutes, 0),
      dossiers: x.dossiers.filter((d) => vivants.has(d.dossier.id) && d.dossier.responsable_id === p.user_id).length,
      delais30: x.delais.filter((t) => ["a_confirmer", "confirme"].includes(t.statut) && !t.acte_depose_le && vivants.has(t.dossier_id)
        && (t.responsable_id ?? respDe.get(t.dossier_id)) === p.user_id && jour(t.echeance_retenue) <= maintenant + 30 * JOUR).length,
      audiences30: x.audiences.filter((a) => a.statut === "prevue" && a.avocat_id === p.user_id && jour(a.date_heure) >= maintenant && jour(a.date_heure) <= maintenant + 30 * JOUR).length,
    }))
    .sort((a, b) => b.minutes30 - a.minutes30 || b.delais30 - a.delais30);
}

export type Serie = { cle: string; libelle: string; nature: "partie" | "matiere"; dossiers: { dossier: Dossier; clair: Clair | null }[] };

/** Les séries : plusieurs dossiers vivants contre la même partie (d'après l'intitulé « A c/ B » déchiffré), ou trois au moins dans la même matière devant la même juridiction. */
export function series(x: DonneesPilotage): Serie[] {
  const vivants = x.dossiers.filter((d) => VIVANTS.includes(d.dossier.statut));
  const parPartie = new Map<string, Serie>();
  for (const d of vivants) {
    const intitule = d.clair?.intitule;
    if (!intitule || !/\sc\/\s/i.test(intitule)) continue;
    const [gauche, droite] = intitule.split(/\sc\/\s/i).map((s) => s.trim());
    for (const nom of [gauche, droite]) {
      const cle = normaliserNom(nom);
      if (!cle) continue;
      const s = parPartie.get(cle) ?? { cle: `partie:${cle}`, libelle: nom, nature: "partie" as const, dossiers: [] };
      if (!s.dossiers.some((y) => y.dossier.id === d.dossier.id)) s.dossiers.push(d);
      parPartie.set(cle, s);
    }
  }
  const parMatiere = new Map<string, Serie>();
  for (const d of vivants) {
    if (!d.dossier.matiere || !d.dossier.juridiction) continue;
    const cle = `${d.dossier.matiere}|${d.dossier.juridiction}`;
    const s = parMatiere.get(cle) ?? { cle: `matiere:${cle}`, libelle: d.dossier.juridiction, nature: "matiere" as const, dossiers: [] };
    s.dossiers.push(d);
    parMatiere.set(cle, s);
  }
  return [...[...parPartie.values()].filter((s) => s.dossiers.length >= 2), ...[...parMatiere.values()].filter((s) => s.dossiers.length >= 3)]
    .sort((a, b) => b.dossiers.length - a.dossiers.length);
}

export type SansDiligence = { dossier: Dossier; clair: Clair | null; derniere: string; jours: number };

/** Les dossiers vivants où rien ne s'est passé depuis `seuil` jours : ni temps, ni acte, ni audience, ni avis, ni pièce. */
export function sansDiligence(x: DonneesPilotage, maintenant: number, seuil = 45): SansDiligence[] {
  const out: SansDiligence[] = [];
  for (const { dossier, clair } of x.dossiers) {
    if (!VIVANTS.includes(dossier.statut)) continue;
    const dates: string[] = [dossier.ouvert_le ?? dossier.cree_le];
    for (const t of x.honoraires[dossier.id]?.temps ?? []) if (t.statut !== "annule") dates.push(t.jour);
    for (const t of x.delais) if (t.dossier_id === dossier.id) dates.push(t.acte_depose_le ?? t.cree_le);
    for (const a of x.audiences) if (a.dossier_id === dossier.id && Date.parse(a.date_heure) <= maintenant) dates.push(a.date_heure);
    for (const v of x.avis) if (v.dossier_id === dossier.id) dates.push(v.date_avis);
    for (const p of x.pieces) if (p.objet_id === dossier.id) dates.push(p.recue_le);
    const derniere = dates.map((s) => s.slice(0, 10)).sort().at(-1) as string;
    const jours = Math.floor((maintenant - Date.parse(`${derniere}T12:00:00Z`)) / JOUR);
    if (jours >= seuil) out.push({ dossier, clair, derniere, jours });
  }
  return out.sort((a, b) => b.jours - a.jours);
}

export type PieceAttendue = { dossier: Dossier; clair: Clair | null; quoi: string; gravite: "rouge" | "ambre" };

/** Ce qui manque au dossier : exemplaire signé de la convention, accusé de dépôt d'un acte déclaré, pièce d'identité (LCB-FT), toute pièce. */
export function piecesAttendues(x: DonneesPilotage, maintenant: number): PieceAttendue[] {
  const out: PieceAttendue[] = [];
  for (const { dossier, clair } of x.dossiers) {
    if (!VIVANTS.includes(dossier.statut)) continue;
    const c = x.honoraires[dossier.id]?.convention;
    if (c?.statut === "signee" && !c.piece_id) out.push({ dossier, clair, quoi: "L'exemplaire signé de la convention d'honoraires", gravite: "ambre" });
    for (const t of x.delais) {
      if (t.dossier_id === dossier.id && t.acte_depose_le && t.motif_cloture === "declaration" && !t.preuve_piece_id) out.push({ dossier, clair, quoi: "L'accusé de dépôt RPVA d'un acte déclaré déposé", gravite: "ambre" });
    }
    const v = x.vigilances.find((y) => y.dossier_id === dossier.id);
    if (v?.assujetti && !v.identification_piece) out.push({ dossier, clair, quoi: "La pièce d'identité du client (vigilance LCB-FT)", gravite: "rouge" });
    const ouvert = Date.parse(dossier.ouvert_le ?? dossier.cree_le);
    if (maintenant - ouvert > 7 * JOUR && !x.pieces.some((p) => p.objet_id === dossier.id)) out.push({ dossier, clair, quoi: "Aucune pièce au dossier depuis son ouverture", gravite: "ambre" });
  }
  return out;
}
