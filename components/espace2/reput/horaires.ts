/* ══════════════════════════════════════════════════════════════════════
   REPUT — hors horaires et sites, calculés à l'écran (04/11/2026)

   REPUT n° 3 de docs/verification/PROMESSES-ECRANS.md : « Étiquette Hors
   horaires sur chaque demande ». Aucune colonne ne le dit : l'écran compare
   l'arrivée de la demande (recu_le) aux heures d'envoi (reglages_envois.plages,
   les heures du verrou HORS_HEURES), dans le fuseau de l'entité de la demande.
   REPUT n° 41 : « lecture par site » — la demande porte son entite_id ; le
   filtre par site de l'aperçu et de l'export s'en sert (la RLS ne donne déjà
   à un responsable de site que ses demandes).
   ══════════════════════════════════════════════════════════════════════ */

import type { Demande, HorairesReput, Monde, Plage } from "@/components/espace/reput/types";

const JOURS_ISO: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const NOMS_JOURS = ["", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/* le jour ISO (1 = lundi) et l'heure « hh:mm » d'un instant, dans un fuseau */
export function jourEtHeure(iso: string, fuseau: string): { jour: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: fuseau, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { jour: JOURS_ISO[v("weekday")] ?? 1, hhmm: `${v("hour")}:${v("minute")}` };
}

export const dansPlages = (plages: Plage[], jour: number, hhmm: string) => plages.some((p) => p.jours.includes(jour) && p.debut <= hhmm && hhmm < p.fin);

export const fuseauDe = (h: HorairesReput, d: Demande) => h.sites.find((s) => s.id === d.entite_id)?.fuseau ?? h.fuseau;

export function horsHoraires(m: Monde, d: Demande): boolean {
  const h = m.horaires;
  if (!h) return false;
  const { jour, hhmm } = jourEtHeure(d.recu_le, fuseauDe(h, d));
  return !dansPlages(h.plages, jour, hhmm);
}

/* « lun.-ven. 08:00-19:00 · sam. 09:00-12:00 » */
export function libellePlages(plages: Plage[]): string {
  return plages
    .map((p) => {
      const j = [...p.jours].sort((a, b) => a - b);
      const suite = j.length > 2 && j.every((x, i) => i === 0 || x === j[i - 1] + 1);
      return `${suite ? `${NOMS_JOURS[j[0]]}-${NOMS_JOURS[j[j.length - 1]]}` : j.map((x) => NOMS_JOURS[x]).join(", ")} ${p.debut}-${p.fin}`;
    })
    .join(" · ");
}

/* « samedi 21 h 47, heure de Paris » */
export function arriveeLocale(iso: string, fuseau: string): string {
  const t = new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, weekday: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", " h ");
  const ville = fuseau.split("/").pop()?.replace(/_/g, " ") ?? fuseau;
  return `${t}, heure de ${ville}`;
}

export const nomSite = (m: Monde, id: string | null) => (id ? (m.horaires?.sites.find((s) => s.id === id)?.nom ?? "Site inconnu") : "Sans site");

/* ——— l'exemple : les deux sites de Réglages › Par site, les heures d'envoi d'un artisan (semaine et samedi matin) ——— */
export const SHOWROOM = "00000000-0000-4000-8000-00000000c3a1";
export const ATELIER = "00000000-0000-4000-8000-00000000c3a2";
export const HORAIRES_EXEMPLE: HorairesReput = {
  plages: [
    { jours: [1, 2, 3, 4, 5], debut: "08:00", fin: "19:00" },
    { jours: [6], debut: "09:00", fin: "12:00" },
  ],
  origine: "reput",
  fuseau: "Europe/Paris",
  sites: [
    { id: SHOWROOM, nom: "Showroom de Lyon", fuseau: "Europe/Paris", principale: false },
    { id: ATELIER, nom: "Atelier de Villeurbanne", fuseau: "Europe/Paris", principale: false },
  ],
};
/* les demandes d'exemple réparties sur les deux sites (les réglages par site de l'exemple ont les mêmes) */
const PAR_SITE: Record<string, string> = {
  "00000000-0000-4000-8000-0000000c3d01": SHOWROOM,
  "00000000-0000-4000-8000-0000000c3d02": SHOWROOM,
  "00000000-0000-4000-8000-0000000c3d03": ATELIER,
  "00000000-0000-4000-8000-0000000c3d04": ATELIER,
  "00000000-0000-4000-8000-0000000c3d05": ATELIER,
  "00000000-0000-4000-8000-0000000c3d06": ATELIER,
  "00000000-0000-4000-8000-0000000c3d07": SHOWROOM,
  "00000000-0000-4000-8000-0000000c3d08": SHOWROOM,
  "00000000-0000-4000-8000-0000000c3d09": ATELIER,
  "00000000-0000-4000-8000-0000000c3d10": SHOWROOM,
};
export function avecSitesExemple(m: Monde): Monde {
  return { ...m, horaires: HORAIRES_EXEMPLE, demandes: m.demandes.map((d) => (d.entite_id ? d : { ...d, entite_id: PAR_SITE[d.id] ?? SHOWROOM })) };
}

/* « mer. 02 h 00 » : la forme courte, pour une puce */
export function arriveeCourte(iso: string, fuseau: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(":", " h ");
}
