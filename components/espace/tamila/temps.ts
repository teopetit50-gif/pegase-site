/* ══════════════════════════════════════════════════════════════════════
   Le temps proposé à la saisie, et le forfait consommé (06/10/2026,
   session B4, b4_12)

   Le dossier sait ce qui s'est passé : une audience tenue, un acte
   déposé, un avis RPVA reçu. Chacun devient une PROPOSITION de temps
   pour la personne qui regarde (durée et nature pré-remplies, à
   corriger) ; saisie, elle porte son origine et n'est plus proposée ;
   ignorée, non plus. Les durées sont des usages de cabinet, pas des
   règles : l'avocat corrige avant d'enregistrer.
   ══════════════════════════════════════════════════════════════════════ */

import { dateCourte } from "../format";
import { ACTES, NATURES_AUDIENCE, TYPES_AVIS } from "./regles";
import type { Audience, Avis, Convention, Delai, Honoraires, NatureTemps } from "./types";

export type Proposition = { origine: string; jour: string; minutes: number; nature: NatureTemps; libelle: string };

const JOUR = 86_400_000;
/** La date du jour à Paris (AAAA-MM-JJ) d'un instant. */
const jourParis = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

const MINUTES_AUDIENCE: Record<Audience["nature"], number> = { plaidoiries: 120, mise_en_etat: 30, orientation: 30, reglement_amiable: 90, audience: 60 };
const ACTE_TEMPS: Record<Delai["acte"], { minutes: number; nature: NatureTemps }> = {
  conclure: { minutes: 240, nature: "redaction" },
  signifier_declaration: { minutes: 30, nature: "correspondance" },
  signifier_conclusions: { minutes: 30, nature: "correspondance" },
  autre: { minutes: 60, nature: "redaction" },
};

/**
 * Les propositions de temps pour `moi` : audiences tenues (ou passées sans suite), actes déposés et avis reçus dans
 * les soixante derniers jours, que `moi` n'a ni saisis (temps non annulé portant cette origine) ni ignorés.
 */
export function proposerTemps(
  ev: { audiences: Audience[]; delais: Delai[]; avis: Avis[] },
  h: Pick<Honoraires, "temps"> & { ecartes?: string[] },
  moi: string | null | undefined,
  maintenant = Date.now(),
): Proposition[] {
  if (!moi) return [];
  const deja = new Set([...h.temps.filter((t) => t.user_id === moi && t.statut !== "annule" && t.origine).map((t) => t.origine as string), ...(h.ecartes ?? [])]);
  const recent = (iso: string | null) => !!iso && Date.parse(iso) <= maintenant && Date.parse(iso) >= maintenant - 60 * JOUR;
  const out: Proposition[] = [];
  for (const a of ev.audiences) {
    if (a.statut === "annulee" || a.statut === "renvoyee" || !recent(a.date_heure)) continue;
    if (a.avocat_id && a.avocat_id !== moi) continue;
    out.push({ origine: `audience:${a.id}`, jour: jourParis(a.date_heure), minutes: MINUTES_AUDIENCE[a.nature] ?? 60, nature: "audience", libelle: `${NATURES_AUDIENCE[a.nature] ?? "Audience"} du ${dateCourte(a.date_heure)}` });
  }
  for (const t of ev.delais) {
    if (!t.acte_depose_le || !recent(`${t.acte_depose_le.slice(0, 10)}T12:00:00Z`)) continue;
    if (t.responsable_id && t.responsable_id !== moi) continue;
    const x = ACTE_TEMPS[t.acte] ?? ACTE_TEMPS.autre;
    out.push({ origine: `acte:${t.id}`, jour: t.acte_depose_le.slice(0, 10), minutes: x.minutes, nature: x.nature, libelle: `${ACTES[t.acte] ?? "Acte"} : déposé le ${dateCourte(t.acte_depose_le)}` });
  }
  for (const v of ev.avis) {
    if (v.type_avis === "rpva_accuse_depot" || !recent(`${v.date_avis.slice(0, 10)}T12:00:00Z`)) continue;
    const lecture = v.type_avis === "rpva_conclusions" || v.type_avis === "rpva_appel_incident";
    out.push({ origine: `avis:${v.id}`, jour: v.date_avis.slice(0, 10), minutes: lecture ? 60 : 15, nature: lecture ? "recherche" : "correspondance", libelle: `${lecture ? "Lecture" : "Traitement"} : ${TYPES_AVIS[v.type_avis] ?? "avis RPVA"} du ${dateCourte(v.date_avis)}` });
  }
  return out.filter((p) => !deja.has(p.origine)).sort((a, b) => (a.jour < b.jour ? 1 : a.jour > b.jour ? -1 : 0));
}

/** Le forfait consommé : tout le temps non annulé du dossier contre le temps prévu ; le taux horaire effectif. */
export function consommationForfait(c: Convention | null, h: Pick<Honoraires, "temps">) {
  if (!c || c.mode === "temps_passe" || !c.forfait_cents) return null;
  const minutes = h.temps.filter((t) => t.statut !== "annule").reduce((s, t) => s + t.minutes, 0);
  const prevues = c.minutes_prevues ?? null;
  const pct = prevues ? Math.round((minutes / prevues) * 100) : null;
  return {
    minutes,
    prevues,
    pct,
    /* le forfait divisé par les heures passées : ce que rapporte réellement l'heure */
    tauxEffectifCents: minutes ? Math.round((c.forfait_cents * 60) / minutes) : null,
    teinte: pct === null ? ("gris" as const) : pct >= 100 ? ("rouge" as const) : pct >= 80 ? ("ambre" as const) : ("vert" as const),
  };
}
