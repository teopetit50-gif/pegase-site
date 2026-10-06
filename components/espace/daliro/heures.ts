/* ══════════════════════════════════════════════════════════════════════
   Les heures pointées et la rentabilité — calculs côté navigateur
   (06/10/2026, session B6, b6_17)

   En base réelle, tout vient de public.btp_heures_chantier et les règles
   sont tenues par btp_pointer. En exemple, ce fichier rejoue les mêmes
   règles sur un petit monde en mémoire : 12 h au plus par jour (Code du
   travail, L3121-18 et L3121-19), alerte au-delà de 10 h par jour ou de
   48 h par semaine (L3121-20), pas de jour à venir, quart d'heure.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui } from "../exemples/socle";
import type { HeuresChantier, IntervenantHeures, Pointage, Rentabilite, RentabiliteLot, RetourPointage, Tableau } from "./types";

export const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function versDate(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}
function versIso(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}
export function ajouterJours(iso: string, n: number): string {
  const d = versDate(iso);
  d.setDate(d.getDate() + n);
  return versIso(d);
}
export function lundiDe(iso: string): string {
  const d = versDate(iso);
  return ajouterJours(iso, -((d.getDay() + 6) % 7));
}
export function joursDe(lundi: string): string[] {
  return Array.from({ length: 7 }, (_, k) => ajouterJours(lundi, k));
}
export function heuresFr(h: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(h)} h`;
}

const arrondi = (v: number) => Math.round(v * 100) / 100;

/* ——— le monde d'exemple ——— */
export type MondeHeures = {
  intervenants: IntervenantHeures[];
  equipes: { id: string; nom: string }[];
  pointages: Pointage[];
  cout_defaut: number | null;
  couts: Record<string, number>;
};

const idx = (n: string) => `00000000-0000-4000-8000-00000000e${n.padStart(3, "0")}`;

/* Les Tilleuls : l'équipe Pose A (trois compagnons) pointe 8 h par jour ouvré sur le lot 01 depuis deux semaines. */
export function mondeExemple(tableau: Tableau): MondeHeures {
  const equipe = tableau.equipes[0] ?? { id: idx("001"), nom: "Pose A" };
  const intervenants: IntervenantHeures[] = [
    { id: idx("011"), nom: "Karim Haddad", role_terrain: "chef_equipe", actif: true, equipe_id: equipe.id, equipe_nom: equipe.nom },
    { id: idx("012"), nom: "Lucas Morel", role_terrain: "compagnon", actif: true, equipe_id: equipe.id, equipe_nom: equipe.nom },
    { id: idx("013"), nom: "Inès Carvalho", role_terrain: "compagnon", actif: true, equipe_id: equipe.id, equipe_nom: equipe.nom },
  ];
  const lot = tableau.lots.find((l) => l.execution === "client")?.id ?? null;
  const pointages: Pointage[] = [];
  if (tableau.chantier.statut === "ouvert") {
    const auj = aujourdHui();
    for (let j = ajouterJours(lundiDe(auj), -7); j < auj; j = ajouterJours(j, 1)) {
      const dow = (versDate(j).getDay() + 6) % 7;
      if (dow > 4) continue;
      for (const i of intervenants) pointages.push({ id: `${i.id}-${j}`, intervenant_id: i.id, jour: j, lot_id: lot, heures: 8, note: null, source: "equipe" });
    }
  }
  return { intervenants, equipes: tableau.equipes, pointages, cout_defaut: 38, couts: { [idx("011")]: 44 } };
}

export function coutDe(monde: MondeHeures, intervenant: string): number | null {
  return monde.couts[intervenant] ?? monde.cout_defaut;
}

/* Le pointage local : les mêmes refus et les mêmes alertes que btp_pointer. */
export function pointerLocal(monde: MondeHeures, intervenant: string, jour: string, heures: number, lot: string | null): { monde: MondeHeures; retour: RetourPointage } {
  const i = monde.intervenants.find((x) => x.id === intervenant);
  if (!i) throw new Error("Intervenant introuvable.");
  if (jour > aujourdHui()) throw new Error("On ne pointe pas un jour à venir.");
  if (jour < ajouterJours(aujourdHui(), -62)) throw new Error("Un pointage se corrige sur 62 jours au plus.");
  if (Number.isNaN(heures) || heures < 0 || heures > 12 || heures * 4 !== Math.trunc(heures * 4)) throw new Error("Les heures vont de 0 à 12, au quart d'heure.");
  const autres = monde.pointages.filter((p) => !(p.intervenant_id === intervenant && p.jour === jour && p.lot_id === lot));
  const jourTotal = autres.filter((p) => p.intervenant_id === intervenant && p.jour === jour).reduce((t, p) => t + p.heures, 0) + heures;
  if (jourTotal > 12) throw new Error(`${i.nom} : ${heuresFr(jourTotal)} ce jour-là, tous chantiers confondus ; 12 h au plus (Code du travail, L3121-18 et L3121-19).`);
  const pointages = heures > 0 ? [...autres, { id: `${intervenant}-${jour}-${lot ?? "hors"}`, intervenant_id: intervenant, jour, lot_id: lot, heures, note: null, source: "saisie" as const }] : autres;
  const lundi = lundiDe(jour);
  const semaineTotal = pointages.filter((p) => p.intervenant_id === intervenant && p.jour >= lundi && p.jour <= ajouterJours(lundi, 6)).reduce((t, p) => t + p.heures, 0);
  const alertes: string[] = [];
  const jj = jour.slice(8, 10) + "/" + jour.slice(5, 7);
  if (jourTotal > 10) alertes.push(`${i.nom} : ${heuresFr(jourTotal)} le ${jj}, au-delà de 10 h (L3121-18) : il faut un accord ou une dérogation.`);
  if (semaineTotal > 48) alertes.push(`${i.nom} : ${heuresFr(semaineTotal)} dans la semaine du ${lundi.slice(8, 10)}/${lundi.slice(5, 7)}, au-delà de 48 h (L3121-20).`);
  return { monde: { ...monde, pointages }, retour: { jour_total: jourTotal, semaine_total: semaineTotal, alertes } };
}

/* La rentabilité locale : facturé (dernière situation validée) − main-d'œuvre − achats, lot par lot. */
export function rentabiliteLocale(tableau: Tableau, monde: MondeHeures): Rentabilite {
  const derniere = (tableau.situations ?? []).filter((s) => s.statut === "validee").sort((a, b) => b.numero - a.numero)[0];
  const cles: (string | null)[] = [...[...tableau.lots].sort((a, b) => a.rang - b.rang || a.code.localeCompare(b.code)).map((l) => l.id), null];
  const lots: RentabiliteLot[] = cles.map((cle) => {
    const lot = cle ? tableau.lots.find((l) => l.id === cle) : null;
    const d = cle ? tableau.debourse.find((x) => x.lot_id === cle) : null;
    const vendu = d ? (d.engage_marche_ht ?? 0) + (d.engage_avenants_ht ?? 0) : 0;
    const facture = derniere ? derniere.lignes.filter((l) => l.lot_id === cle).reduce((t, l) => t + l.cumule_ht, 0) : 0;
    const pts = monde.pointages.filter((p) => p.lot_id === cle);
    const heures = pts.reduce((t, p) => t + p.heures, 0);
    const mo = pts.reduce((t, p) => t + p.heures * (coutDe(monde, p.intervenant_id) ?? 0), 0);
    const sansCout = pts.filter((p) => coutDe(monde, p.intervenant_id) === null).reduce((t, p) => t + p.heures, 0);
    const achats = tableau.factures.filter((f) => f.statut === "rattachee" && f.facture_statut !== "ecartee" && f.lot_id === cle).reduce((t, f) => t + (f.montant_ht ?? 0), 0);
    return {
      lot_id: cle, code: lot?.code ?? null, libelle: lot?.libelle ?? "Hors lot",
      vendu_ht: arrondi(vendu), facture_ht: arrondi(facture), heures, main_oeuvre_ht: arrondi(mo), heures_sans_cout: sansCout,
      achats_ht: arrondi(achats), debourse_ht: arrondi(mo + achats), marge_ht: arrondi(facture - mo - achats),
    };
  }).filter((l) => l.lot_id !== null || l.vendu_ht + l.facture_ht + l.heures + l.achats_ht !== 0);
  const somme = (k: keyof RentabiliteLot) => arrondi(lots.reduce((t, l) => t + (l[k] as number), 0));
  const facture = somme("facture_ht");
  const marge = arrondi(facture - somme("main_oeuvre_ht") - somme("achats_ht"));
  return {
    vendu_ht: somme("vendu_ht"), facture_ht: facture, heures: somme("heures"), heures_sans_cout: somme("heures_sans_cout"),
    main_oeuvre_ht: somme("main_oeuvre_ht"), achats_ht: somme("achats_ht"), debourse_ht: somme("debourse_ht"),
    marge_ht: marge, marge_taux: facture > 0 ? Math.round((marge / facture) * 10000) / 10000 : null, lots,
  };
}

/* La vue d'une semaine, comme la renvoie btp_heures_chantier. */
export function semaineLocale(tableau: Tableau, monde: MondeHeures, lundi: string): HeuresChantier {
  const jours = joursDe(lundi);
  const pointages = monde.pointages.filter((p) => p.jour >= jours[0] && p.jour <= jours[6] && p.heures > 0);
  return {
    chantier_id: tableau.chantier.id, lundi, jours,
    intervenants: monde.intervenants, equipes: monde.equipes, pointages,
    semaine_heures: pointages.reduce((t, p) => t + p.heures, 0),
    total_heures: monde.pointages.reduce((t, p) => t + p.heures, 0),
    voit_prix: tableau.voit_prix, cout_defaut: tableau.voit_prix ? monde.cout_defaut : null,
    rentabilite: tableau.voit_prix ? rentabiliteLocale(tableau, monde) : null,
  };
}
