/* ══════════════════════════════════════════════════════════════════════
   TIROMA — les chiffres des tuiles des captures du site (04/11/2026)

   04/11 — promesses TIROMA n° 5 (capture point-du-matin.png : occupation
   prévue, heures libres aujourd'hui, annulations < 48 h, plans planifiés
   hier, liste d'attente) et n° 15 (capture plans.png : plans signés sans
   rendez-vous, devis signés en attente, en attente de la mutuelle,
   planifiés cette semaine). Un seul calcul, lu par Aujourd'hui et par
   Plans et devis, sur le même dossier que le Pilotage : un même chiffre
   partout. Rien ici n'appelle une porte ; tout se lit dans le dossier.
   ══════════════════════════════════════════════════════════════════════ */

import type { Dossier } from "@/components/espace/tiroma/types";

const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jourDe = (iso: string) => jourISO(new Date(iso));

/** Le seuil d'une annulation tardive : moins de 48 heures avant l'heure du rendez-vous. */
export const ANNULATION_TARDIVE_H = 48;

export type TuilesMatin = {
  /* charge du jour (titulaire seul, comme la charge des fauteuils) */
  occupation: number | null;
  libresMin: number | null;
  /* rendez-vous annulés moins de 48 h avant l'heure, sur trente jours ; null si la lecture n'a rien rendu */
  annulationsTardives: { n: number; aVenir: number } | null;
  /* appels « plan » notés hier : rendez-vous pris sur appelés */
  plansHier: { planifies: number; appeles: number } | null;
  attente: number;
};

export function tuilesMatin(d: Dossier): TuilesMatin {
  const titulaire = d.profil === "titulaire";
  const charge = titulaire ? d.charge : null;
  const maintenant = Date.now();
  const tardives = (d.annulations ?? []).filter((a) => a.annule_le && new Date(a.debut).getTime() - new Date(a.annule_le).getTime() < ANNULATION_TARDIVE_H * 3600e3);
  const hier = jourISO(new Date(maintenant - 864e5));
  const appelsHier = d.appels ? Object.values(d.appels.derniers).filter((a) => a.motif === "plan" && jourDe(a.appele_le) === hier) : null;
  return {
    occupation: charge?.total.taux ?? null,
    libresMin: charge ? Math.max(0, charge.total.ouvert_min - charge.total.prevu_min) : null,
    annulationsTardives: d.annulations ? { n: tardives.length, aVenir: tardives.filter((a) => new Date(a.debut).getTime() >= maintenant).length } : null,
    plansHier: appelsHier ? { planifies: appelsHier.filter((a) => a.issue === "rdv_pris").length, appeles: appelsHier.length } : null,
    attente: d.attente.length,
  };
}

export type TuilesPlans = {
  sansRdv: { nombre: number; montant: number };
  mutuelle: number;
  planifiesSemaine: number | null;
};

export function tuilesPlans(d: Dossier): TuilesPlans {
  /* les mêmes chiffres que la carte « Signé sans rendez-vous » du Pilotage ; sans pilotage (profil sans droit), les plans du dossier */
  const sansRdv = d.pilotage?.plans_sans_rdv ?? { nombre: d.plans.length, montant: d.plans.reduce((s, p) => s + (p.montant ?? 0), 0) };
  /* la colonne « Mutuelle à obtenir » du tableau : accord à demander ou demandé */
  const mutuelle = d.plans.filter((p) => p.mutuelle_statut === "a_demander" || p.mutuelle_statut === "demandee").length;
  /* appels « plan » conclus par un rendez-vous depuis lundi */
  const lundi = new Date();
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const planifiesSemaine = d.appels ? Object.values(d.appels.derniers).filter((a) => a.motif === "plan" && a.issue === "rdv_pris" && new Date(a.appele_le).getTime() >= lundi.getTime()).length : null;
  return { sansRdv: { nombre: sansRdv.nombre, montant: sansRdv.montant }, mutuelle, planifiesSemaine };
}

export const heuresMinutes = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
};
