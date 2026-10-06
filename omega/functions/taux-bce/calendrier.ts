// Les jours ouvrés TARGET (ceux où la BCE publie) et l'heure de Francfort.
// Fermetures TARGET : 1er janvier, Vendredi saint, lundi de Pâques, 1er mai, 25 et 26 décembre, et les week-ends.

/** Le dimanche de Pâques (calendrier grégorien, algorithme anonyme), en AAAA-MM-JJ. */
export function paques(annee: number): string {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

function decaler(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Vrai si la BCE publie ce jour-là (AAAA-MM-JJ). */
export function jourOuvreTarget(jour: string): boolean {
  const semaine = new Date(`${jour}T12:00:00Z`).getUTCDay();
  if (semaine === 0 || semaine === 6) return false;
  const mmjj = jour.slice(5);
  if (["01-01", "05-01", "12-25", "12-26"].includes(mmjj)) return false;
  const p = paques(Number(jour.slice(0, 4)));
  return jour !== decaler(p, -2) && jour !== decaler(p, 1);
}

/** La date (AAAA-MM-JJ) et l'heure (HH:MM) à Francfort pour un instant. */
export function francfort(instant: Date): { jour: string; heure: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { jour: `${v("year")}-${v("month")}-${v("day")}`, heure: `${v("hour")}:${v("minute")}` };
}

/** Nombre de jours entre deux dates AAAA-MM-JJ (b − a). */
export function ecartJours(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}
