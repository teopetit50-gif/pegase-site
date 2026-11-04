/* ══════════════════════════════════════════════════════════════════════
   TIROMA — l'agenda d'exemple, fauteuil par fauteuil (04/11/2026)

   TIROMA n° 47 de docs/verification/PROMESSES-ECRANS.md : « Agenda des
   rendez-vous par fauteuil ». En base, tiroma_rendez_vous se lit sous RLS
   (components/espace/tiroma/portes.ts, chargerAgenda) ; ici, les rendez-vous
   du cabinet fictif. Aujourd'hui tombe juste avec « Charge du jour »
   (components/espace/tiroma/exemple.ts) : Fauteuil 1, 14 rendez-vous, 3 h 30
   le matin et 4 h l'après-midi ; Fauteuil 2, 6 rendez-vous dont un seul
   l'après-midi ; Fauteuil 3, matinée vide et 5 rendez-vous l'après-midi.
   Les autres jours suivent un gabarit ; les créneaux libérés du dossier
   (créneaux à sauver) s'y posent par-dessus, à l'écran. Patients inventés.
   ══════════════════════════════════════════════════════════════════════ */

import type { RdvAgenda } from "@/components/espace/tiroma/portes";

const F1 = "00000000-0000-4000-8000-0000000000f1";
const F2 = "00000000-0000-4000-8000-0000000000f2";
const F3 = "00000000-0000-4000-8000-0000000000f3";
const P1 = "00000000-0000-4000-8000-0000000000d1";
const P2 = "00000000-0000-4000-8000-0000000000d2";

/* fauteuil, praticien, début « hh:mm », durée (min), acte, patient, statut (prévu par défaut) */
type Def = [string, string, string, number, string, string, RdvAgenda["statut"]?];

const AUJOURDHUI: Def[] = [
  /* Fauteuil 1 — Dr Ambre Lacour, avec Élodie */
  [F1, P1, "08:00", 30, "Contrôle", "Rosalie Nestor", "honore"],
  [F1, P1, "08:30", 45, "Détartrage", "Kévin Bazile", "honore"],
  [F1, P1, "09:15", 30, "Contrôle", "Sylvie Rigoulet", "honore"],
  [F1, P1, "09:45", 45, "Soin composite 16", "Henri Calvaire"],
  [F1, P1, "10:30", 30, "Contrôle", "Jean-Luc Nabajoth"],
  [F1, P1, "11:00", 30, "Scellement de sillons 36 et 46", "Lucas Mondésir"],
  [F1, P1, "14:00", 30, "Contrôle", "Aurélie Cornélie"],
  [F1, P1, "14:30", 45, "Détartrage", "Odile Flavien"],
  [F1, P1, "15:15", 30, "Soin composite 24", "Yves Ramassamy"],
  [F1, P1, "16:15", 30, "Contrôle", "Murielle Sainte-Rose"],
  [F1, P1, "16:45", 30, "Contrôle", "Thierry Joubert"],
  [F1, P1, "17:15", 30, "Soin composite 47", "Fabrice Lancastre"],
  [F1, P1, "17:45", 15, "Urgence — douleur", "Corinne Ducat"],
  [F1, P1, "18:00", 30, "Contrôle", "Ludovic Mathurin"],
  /* Fauteuil 2 — Dr Mathis Rousseau, sans assistante habituelle */
  [F2, P2, "08:00", 90, "Implant 36 — chirurgie", "Michel Blanc", "honore"],
  [F2, P2, "09:30", 30, "Contrôle post-opératoire", "Christiane Laurent", "honore"],
  [F2, P2, "10:00", 30, "Descellement de couronne 14", "Paulette Darius"],
  [F2, P2, "11:00", 15, "Urgence — fracture 21", "Serge Lafleur"],
  [F2, P2, "11:15", 30, "Contrôle", "Gaëlle Moutoussamy"],
  [F2, P2, "14:00", 45, "Couronne — pose 16", "Georges Pétro"],
  /* Fauteuil 3 — orthodontie, matinée vide */
  [F3, P2, "14:00", 30, "Aligneurs — contrôle", "Léa Marival"],
  [F3, P2, "14:30", 30, "Aligneurs — contrôle", "Noah Gervais"],
  [F3, P2, "15:00", 60, "Bilan orthodontique", "Inès Bertrand"],
  [F3, P2, "16:00", 30, "Contrôle orthodontique", "Maëlys Hugues"],
  [F3, P2, "16:30", 30, "Contrôle orthodontique", "Enzo Pélage"],
];

/* les autres jours ouvrés : un gabarit qui tourne sur les patients */
const GABARIT: [string, string, string, number, string][] = [
  [F1, P1, "08:00", 30, "Contrôle"],
  [F1, P1, "08:30", 45, "Détartrage"],
  [F1, P1, "09:45", 45, "Soin composite"],
  [F1, P1, "10:30", 30, "Contrôle"],
  [F1, P1, "11:15", 45, "Détartrage"],
  [F1, P1, "14:00", 60, "Traitement de racine"],
  [F1, P1, "15:00", 30, "Contrôle"],
  [F1, P1, "16:30", 45, "Soin composite"],
  [F1, P1, "17:30", 30, "Contrôle"],
  [F2, P1, "08:30", 60, "Couronne — préparation"],
  [F2, P1, "09:30", 45, "Couronne — préparation"],
  [F2, P1, "10:15", 60, "Bridge — empreinte"],
  [F2, P2, "14:00", 90, "Implant — chirurgie"],
  [F2, P2, "16:00", 45, "Couronne — pose"],
  [F3, P2, "08:30", 30, "Aligneurs — contrôle"],
  [F3, P2, "09:00", 30, "Contrôle orthodontique"],
  [F3, P2, "14:30", 60, "Pose d'appareil"],
  [F3, P2, "16:00", 30, "Aligneurs — contrôle"],
];
const PATIENTS = [
  "Arlette Bonheur", "Didier Nagau", "Josiane Rinaldo", "Kelly Barthélémy", "Max Lubin", "Nathalie Coco", "Olivier Edouard",
  "Pascale Ferly", "Quentin Hoarau", "Régine Fontaine", "Sébastien Gaydu", "Tania Marcelin", "Ulrich Noël", "Véronique Ponthieux",
  "William Rosine", "Yolande Sabine", "Alain Tanasi", "Bénédicte Urie",
];

const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function instant(jour: string, hhmm: string, plus = 0): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(`${jour}T00:00:00`);
  d.setHours(h, m + plus, 0, 0);
  return d.toISOString();
}
const rdv = (jour: string, i: number, [fauteuil_id, praticien_id, debut, duree, libelle, patient_nom, statut]: Def): RdvAgenda => ({
  id: `rdv-ag-${jour}-${i}`,
  debut: instant(jour, debut),
  fin: instant(jour, debut, duree),
  statut: statut ?? "prevu",
  fauteuil_id,
  praticien_id,
  type_rdv_id: null,
  plan_id: null,
  seance_rang: null,
  patient_nom,
  libelle,
});

/** Les rendez-vous d'exemple d'un jour (AAAA-MM-JJ) ; un créneau libéré du dossier ne porte aucun autre rendez-vous. */
export function agendaExemple(jour: string, libres: { fauteuil_id: string | null; debut: string; fin: string; libre: boolean }[] = []): RdvAgenda[] {
  const auj = jourISO(new Date());
  const pris = (r: RdvAgenda) => libres.some((c) => c.libre && c.fauteuil_id === r.fauteuil_id && new Date(c.debut) < new Date(r.fin) && new Date(r.debut) < new Date(c.fin));
  return du(jour, auj).filter((r) => !pris(r));
}
function du(jour: string, auj: string): RdvAgenda[] {
  if (jour === auj) return AUJOURDHUI.map((d, i) => rdv(jour, i, d));
  const date = new Date(`${jour}T12:00:00`);
  const js = date.getDay();
  if (js === 0) return [];
  const graine = Math.round(date.getTime() / 864e5);
  return GABARIT.filter(([, , debut], i) => (js === 6 ? debut < "12:00" : (i + graine) % 5 !== 0))
    .map(([f, p, debut, duree, libelle], i) => rdv(jour, i, [f, p, debut, duree, libelle, PATIENTS[(i + graine) % PATIENTS.length], jour < auj ? "honore" : "prevu"]));
}
