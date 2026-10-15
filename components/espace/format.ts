/* Formats français partagés par les trois écrans client (05/10/2026).
   Tout passe par Intl, sur « fr-FR » : jamais de chaîne anglaise à l'écran. */

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function montant(v: number | null | undefined, devise = "EUR"): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  if (devise === "EUR") return euros.format(v);
  return `${nombre.format(v)} ${devise}`;
}

export function nombreFr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return nombre.format(v);
}

export function pourcent(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `${nombre.format(v)} %`;
}

export function dateCourte(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function dateLongue(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function dateHeure(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** « dans 3 jours », « il y a 2 heures », « aujourd'hui » — pour les échéances. */
export function relatif(iso: string | null | undefined, maintenant = new Date()): string {
  if (!iso) return "sans échéance";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const ms = d.getTime() - maintenant.getTime();
  const heures = Math.round(ms / 3_600_000);
  const jours = Math.round(ms / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (Math.abs(heures) < 24) return rtf.format(heures, "hour");
  if (Math.abs(jours) < 31) return rtf.format(jours, "day");
  return rtf.format(Math.round(jours / 30), "month");
}

/** Le module en clair : les clés du socle (cashd, filed…) → leurs noms. */
const MODULES: Record<string, string> = {
  cashd: "CASHD",
  filed: "FILED",
  payd: "PAYD",
  reput: "REPUT",
  offload: "OFFLOAD",
  lorani: "LORANI",
  tiroma: "TIROMA",
  tamila: "TAMILA",
  btp: "BTP",
  loc: "LOC",
  rh: "RH",
  achats: "Achats",
  tresorerie: "Trésorerie",
  socle: "Socle",
  point: "Point du matin",
  varelo: "VARELO",
  tavaro: "TAVARO",
  daliro: "Daliro",
};

export function libelleModule(cle: string | null | undefined): string {
  if (!cle) return "—";
  return MODULES[cle] ?? cle.toUpperCase();
}

/** Une clé « snake_case » devient une phrase : « virement_fournisseur » → « Virement fournisseur ». */
export function phrase(cle: string | null | undefined): string {
  if (!cle) return "—";
  const t = cle.replace(/[._]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Les quatre premiers caractères d'un identifiant, pour nommer quelqu'un qu'on ne connaît pas. */
export function courtId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

export function masquerIban(iban: string | null | undefined): string {
  if (!iban) return "—";
  const propre = iban.replace(/\s+/g, "");
  if (propre.length < 8) return propre;
  return `${propre.slice(0, 4)} •••• •••• ${propre.slice(-4)}`;
}
