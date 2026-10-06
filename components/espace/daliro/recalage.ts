/* ══════════════════════════════════════════════════════════════════════
   Le recalage du planning — calcul côté navigateur (06/10/2026, session B6, b6_19)

   En base réelle, tout vient de btp_proposer_recalage. En exemple, ce
   fichier rejoue la même règle : chaque passage prévu en aval qui
   commencerait trop tôt part au premier jour permis (fin de l'amont + délai
   minimal + 1, en jours ouvrés de métropole, fériés compris), en gardant sa
   durée en jours ouvrés. Rien ne recule.
   ══════════════════════════════════════════════════════════════════════ */

import type { DeplacementPassage, Recalage, Tableau } from "./types";

function versDate(iso: string): Date {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}
function versIso(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}
function plus(iso: string, n: number): string {
  const d = versDate(iso);
  d.setDate(d.getDate() + n);
  return versIso(d);
}

/* Les fériés de métropole d'une année (Pâques par l'algorithme de Meeus). */
function feries(annee: number): Set<string> {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = versIso(new Date(annee, mois - 1, jour));
  return new Set([
    `${annee}-01-01`, `${annee}-05-01`, `${annee}-05-08`, `${annee}-07-14`, `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`,
    plus(paques, 1), plus(paques, 39), plus(paques, 50),
  ]);
}

export function jourOuvre(iso: string): boolean {
  const j = versDate(iso).getDay();
  return j !== 0 && j !== 6 && !feries(Number(iso.slice(0, 4))).has(iso);
}

export function ajouterOuvres(iso: string, n: number): string {
  let v = iso;
  let reste = n;
  while (reste > 0) {
    v = plus(v, 1);
    if (jourOuvre(v)) reste--;
  }
  return v;
}

function dureeOuvree(debut: string, fin: string): number {
  let n = 0;
  for (let v = debut; v <= fin; v = plus(v, 1)) if (jourOuvre(v)) n++;
  return Math.max(n, 1);
}

export function recalageLocal(tableau: Tableau, passageId: string, nouvelleFin: string): Recalage {
  const p = tableau.passages.find((x) => x.id === passageId);
  if (!p) throw new Error("Passage introuvable.");
  if (p.statut !== "prevu") throw new Error("Seul un passage prévu se recale.");
  if (!nouvelleFin || nouvelleFin < p.debut) throw new Error(`La nouvelle fin est au plus tôt le jour du début du passage (${p.debut.split("-").reverse().join("/")}).`);
  const deps = tableau.dependances;
  const aval = new Set<string>();
  const pile = [p.id];
  while (pile.length) {
    const x = pile.pop()!;
    for (const d of deps) if (d.amont_id === x && !aval.has(d.aval_id)) { aval.add(d.aval_id); pile.push(d.aval_id); }
  }
  for (const id of [...aval]) if (tableau.passages.find((q) => q.id === id)?.statut !== "prevu") aval.delete(id);
  const plan = new Map<string, { debut: string; fin: string }>([[p.id, { debut: p.debut, fin: nouvelleFin }]]);
  for (let tour = 0; tour < aval.size + 2; tour++) {
    let change = false;
    for (const d of deps) {
      if (!aval.has(d.aval_id)) continue;
      const a = tableau.passages.find((q) => q.id === d.amont_id);
      const b = tableau.passages.find((q) => q.id === d.aval_id);
      if (!a || !b || a.statut === "annule") continue;
      const permis = ajouterOuvres(plan.get(a.id)?.fin ?? a.fin, d.delai_min_jours + 1);
      const debut = plan.get(b.id)?.debut ?? b.debut;
      if (debut < permis) {
        plan.set(b.id, { debut: permis, fin: ajouterOuvres(permis, dureeOuvree(b.debut, b.fin) - 1) });
        change = true;
      }
    }
    if (!change) break;
  }
  const deplaces: DeplacementPassage[] = tableau.passages
    .filter((q) => { const n = plan.get(q.id); return n && (n.debut !== q.debut || n.fin !== q.fin); })
    .map((q) => ({
      passage_id: q.id, tache: q.tache, lot_id: q.lot_id, intervenant: q.intervenant_nom ?? q.intervenant_lu,
      ancien_debut: q.debut, ancien_fin: q.fin, nouveau_debut: plan.get(q.id)!.debut, nouveau_fin: plan.get(q.id)!.fin,
      reconfirmer: q.confirmation === "demandee" || q.confirmation === "confirmee", exterieur: q.exterieur,
    }))
    .sort((x, y) => x.nouveau_debut.localeCompare(y.nouveau_debut));
  const fins = tableau.passages.filter((q) => q.statut === "prevu").map((q) => plan.get(q.id)?.fin ?? q.fin);
  return {
    passage_id: p.id, chantier_id: p.chantier_id, nouvelle_fin: nouvelleFin, deplaces, nombre: deplaces.length,
    fin_planning: fins.length ? fins.sort().at(-1)! : null, fin_prevue_chantier: tableau.chantier.date_fin_prevue ?? null,
  };
}

/* Le tableau après le recalage (exemple) : nouvelles dates, confirmation à redemander. */
export function appliquerLocal(tableau: Tableau, r: Recalage): Tableau {
  const m = new Map(r.deplaces.map((d) => [d.passage_id, d]));
  return {
    ...tableau,
    passages: tableau.passages.map((q) => {
      const d = m.get(q.id);
      if (!d) return q;
      const bouge = d.nouveau_debut !== q.debut || d.nouveau_fin !== q.fin;
      return { ...q, debut: d.nouveau_debut, fin: d.nouveau_fin, version: q.version + 1,
               confirmation: bouge && q.confirmation !== "non_demandee" ? "non_demandee" : q.confirmation,
               confirmation_le: bouge && q.confirmation !== "non_demandee" ? null : q.confirmation_le };
    }),
  };
}
