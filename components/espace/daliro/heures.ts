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
  /* null : aucun coût posé pour lui, même pas celui par défaut (ses heures vont dans « Heures sans coût ») */
  couts: Record<string, number | null>;
};

const idx = (n: string) => `00000000-0000-4000-8000-00000000e${n.padStart(3, "0")}`;

/* L'exemple des heures (06/11/2026, Teo : « plus de données d'exemple » dans l'onglet Argent).
   Chaque équipe qui tient un lot du chantier pointe sur ses lots commencés, depuis l'ouverture
   (huit semaines au plus : le menu « Semaine » en montre huit), autant de jours que le budget du
   lot en demande (40 % du vendu en main-d'œuvre, au prorata de l'avancement) ; une équipe sans
   lot vient en renfort trois jours sur le lot principal les quinze derniers jours ;
   le chef d'équipe fait 10 h 30 le dernier mardi (réunion de chantier) ; un samedi de rattrapage ; un
   intérimaire sans coût horaire (« Heures sans coût »). Les heures varient d'un jour à l'autre
   (7 à 9 h, le vendredi plus court, une absence de temps en temps) sans jamais passer 12 h. */
const POSE_A = "00000000-0000-4000-8000-00000000d031";
const MEMBRES: Record<string, [string, string, string]> = {
  /* Pose A : les trois compagnons d'avant, mêmes identifiants */
  [POSE_A]: ["Karim Haddad", "Lucas Morel", "Inès Carvalho"],
  "00000000-0000-4000-8000-00000000d710": ["Jordan Bellance", "Steeve Nicolas", "Maëva Lurel"],
  "00000000-0000-4000-8000-00000000d711": ["Thierry Gaspard", "Kévin Rinaldo", "Sandra Jean-Louis"],
};
const NOMS_AUTRES: [string, string, string] = ["Patrice Lacour", "Ludovic Hubert", "Mélanie Bordelais"];
const COUTS_CHEF = [44, 46, 42];

/* un tirage stable : le même jour donne toujours les mêmes heures */
function tirage(cle: string): number {
  let h = 2166136261;
  for (let i = 0; i < cle.length; i++) h = Math.imul(h ^ cle.charCodeAt(i), 16777619);
  return (h >>> 0) % 1000;
}
function heuresDuJour(qui: string, jour: string, dow: number): number {
  const t = tirage(`${qui}|${jour}`);
  if (t % 17 === 0) return 0;
  const options = dow === 4 ? [7, 7, 7.5, 6.5] : [8, 8, 8, 7.5, 8.5, 9, 7, 8.5];
  return options[t % options.length];
}

export function mondeExemple(tableau: Tableau): MondeHeures {
  const c = tableau.chantier;
  const lotsClient = [...tableau.lots].filter((l) => l.execution === "client").sort((a, b) => a.rang - b.rang);
  /* les équipes du chantier : celles de ses lots, puis une en renfort (jamais le conducteur, qui n'est pas une équipe de pose) */
  const deLots = [...new Set(lotsClient.map((l) => l.equipe_id).filter((x): x is string => !!x))];
  const connues = tableau.equipes.filter((e) => !/conducteur/i.test(e.nom));
  const renfort = connues.find((e) => !deLots.includes(e.id));
  const ids = deLots.length ? [...deLots, ...(renfort && deLots.length < 2 ? [renfort.id] : [])] : connues.slice(0, 1).map((e) => e.id);
  const equipes = ids.map((id) => tableau.equipes.find((e) => e.id === id) ?? { id, nom: lotsClient.find((l) => l.equipe_id === id)?.equipe_nom ?? "Équipe" });
  if (!equipes.length) equipes.push(tableau.equipes[0] ?? { id: idx("001"), nom: "Pose A" });

  const intervenants: IntervenantHeures[] = [];
  const couts: Record<string, number | null> = {};
  equipes.forEach((eq, k) => {
    const noms = MEMBRES[eq.id] ?? NOMS_AUTRES;
    noms.forEach((nom, r) => {
      const id = eq.id === POSE_A ? idx(String(11 + r)) : idx(String(100 + k * 10 + r));
      intervenants.push({ id, nom, role_terrain: r === 0 ? "chef_equipe" : "compagnon", actif: true, equipe_id: eq.id, equipe_nom: eq.nom });
      if (r === 0) couts[id] = COUTS_CHEF[k % COUTS_CHEF.length];
    });
  });
  const interim = idx("190");
  intervenants.push({ id: interim, nom: "Dylan Cocks (intérim)", role_terrain: "compagnon", actif: true, equipe_id: equipes[0].id, equipe_nom: equipes[0].nom });
  couts[interim] = null;

  const pointages: Pointage[] = [];
  const commence = (l: Tableau["lots"][number]) => l.statut === "en_cours" || l.statut === "termine";
  /* le lot principal : le premier lot commencé que tient l'entreprise (renfort, intérim et samedi n'y vont que s'il existe) */
  const principal = lotsClient.find((l) => l.statut === "en_cours") ?? lotsClient.find(commence) ?? null;
  if (c.statut === "ouvert" && lotsClient.length) {
    const auj = aujourdHui();
    const hier = ajouterJours(auj, -1);
    const debutMin = ajouterJours(lundiDe(auj), -49);
    const debut = c.date_debut && c.date_debut > debutMin ? c.date_debut : debutMin;
    const jours: string[] = [];
    for (let j = debut; j <= hier; j = ajouterJours(j, 1)) jours.push(j);
    const ouvres = jours.filter((j) => (versDate(j).getDay() + 6) % 7 < 5);
    const dowDe = (j: string) => (versDate(j).getDay() + 6) % 7;
    const poser = (qui: string, jour: string, lot: string | null, heures: number, source: Pointage["source"] = "equipe") => {
      if (heures <= 0) return;
      const deja = pointages.filter((p) => p.intervenant_id === qui && p.jour === jour).reduce((t, p) => t + p.heures, 0);
      const h = Math.min(heures, 12 - deja);
      if (h > 0) pointages.push({ id: `${qui}-${jour}-${lot ?? "hors"}`, intervenant_id: qui, jour, lot_id: lot, heures: h, note: null, source });
    };
    /* n jours parmi les jours ouvrés : les six dixièmes d'affilée en fin de période (l'équipe enchaîne
       sur le lot), le reste réparti sur ce qui précède */
    const choisir = (parmi: string[], nb: number, finFenetre = true) => {
      const n = Math.max(0, Math.min(parmi.length, nb));
      const suite = Math.ceil(n * 0.6);
      const bloc = finFenetre ? parmi.slice(parmi.length - suite) : parmi.slice(0, suite);
      const reste = finFenetre ? parmi.slice(0, parmi.length - suite) : parmi.slice(suite);
      const m = Math.min(reste.length, n - suite);
      const epars = m <= 0 ? [] : m === 1 ? [reste[Math.floor(reste.length / 2)]] : Array.from({ length: m }, (_, i) => reste[Math.round((i * (reste.length - 1)) / (m - 1))]);
      return [...new Set([...epars, ...bloc])];
    };
    /* les heures d'un lot suivent son budget : 40 % du vendu en main-d'œuvre, au prorata de l'avancement réel */
    const avancement = (l: Tableau["lots"][number]) =>
      l.statut === "termine" ? 100 : (l.avancement_pct ?? (c.etape?.lot_id === l.id ? c.etape.avancement_pct : null) ?? 35);
    const vendu = (id: string) => {
      const d = tableau.debourse.find((x) => x.lot_id === id);
      return d ? (d.engage_marche_ht ?? 0) + (d.engage_avenants_ht ?? 0) : 0;
    };
    /* le dernier mardi passé : la réunion de chantier allonge la journée du chef (au-delà de 10 h) */
    const mardi = [...ouvres].reverse().find((j) => dowDe(j) === 1);
    equipes.forEach((eq, k) => {
      const membres = intervenants.filter((i) => i.equipe_id === eq.id && i.id !== interim);
      const siens = lotsClient.filter((l) => l.equipe_id === eq.id);
      const commences = siens.filter(commence).sort((a, b) => (a.statut === b.statut ? a.rang - b.rang : a.statut === "termine" ? -1 : 1));
      const parJour = membres.length * 8;
      if (commences.length) {
        /* chaque lot commencé a sa part de la fenêtre, les lots finis d'abord */
        commences.forEach((l, r) => {
          const tranche = ouvres.slice(Math.floor((r * ouvres.length) / commences.length), Math.floor(((r + 1) * ouvres.length) / commences.length));
          const cible = (vendu(l.id) * 0.4 * avancement(l)) / 100 / 38;
          for (const jour of choisir(tranche, Math.max(4, Math.round(cible / parJour)), l.statut !== "termine")) for (const m of membres) poser(m.id, jour, l.id, heuresDuJour(m.id, jour, dowDe(jour)));
        });
      } else if (siens.length) {
        /* un lot à venir : deux demi-journées de préparation */
        for (const jour of choisir(ouvres.slice(-6), 2)) for (const m of membres) poser(m.id, jour, siens[0].id, 4);
      } else if (principal) {
        /* le renfort : trois jours sur le lot principal, les quinze derniers jours */
        for (const jour of choisir(ouvres.slice(-10), 3)) for (const m of membres) poser(m.id, jour, principal.id, heuresDuJour(m.id, jour, dowDe(jour)));
      }
      if (k === 0 && mardi && membres[0]) {
        const lot = commences[commences.length - 1]?.id ?? principal?.id ?? null;
        if (lot) {
          for (const m of membres) poser(m.id, mardi, lot, heuresDuJour(m.id, mardi, 1) || 8);
          const deja = pointages.filter((p) => p.intervenant_id === membres[0].id && p.jour === mardi).reduce((t, p) => t + p.heures, 0);
          poser(membres[0].id, mardi, lot, 10.5 - deja, "saisie");
        }
      }
    });
    if (principal) {
      /* l'intérimaire : les jours de l'équipe principale des trois dernières semaines */
      const recents = new Set(ouvres.slice(-15));
      for (const jour of [...new Set(pointages.filter((p) => p.lot_id === principal.id && recents.has(p.jour)).map((p) => p.jour))]) poser(interim, jour, principal.id, heuresDuJour(interim, jour, dowDe(jour)));
      /* un samedi de rattrapage, la matinée, pour deux compagnons de l'équipe principale */
      const samedi = [...jours].reverse().find((j) => versDate(j).getDay() === 6);
      if (samedi) for (const m of intervenants.filter((i) => i.equipe_id === equipes[0].id && i.role_terrain === "compagnon").slice(0, 2)) poser(m.id, samedi, principal.id, 4, "saisie");
    }
  }
  return { intervenants, equipes: tableau.equipes, pointages, cout_defaut: 38, couts };
}

export function coutDe(monde: MondeHeures, intervenant: string): number | null {
  return intervenant in monde.couts ? monde.couts[intervenant] : monde.cout_defaut;
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
