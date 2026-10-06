/* ══════════════════════════════════════════════════════════════════════
   Le point du matin Varelo, version exemple (06/10/2026, B1) — les mêmes
   phrases que private.grp_lignes_matin / grp_lignes_groupe /
   grp_lignes_reportings / grp_lignes_reserves, tirées des données
   d'exemple. Sans « use client » : la barre de l'espace (C1) peut appeler
   compterCeMatinExemple() pour son compteur en mode exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { montant } from "../format";
import { aujourdhui, contratsExemple, echeancier } from "./contrats";
import { calculerGroupe, exempleEncours, PLAFONDS_EXEMPLE } from "./encours";
import { RECIPROQUES_EXEMPLE } from "./reciproques";
import { BASES_EXEMPLE, ligneDePage } from "./groupe";
import { FAITS_EXEMPLE, OBLIGATIONS_EXEMPLE, echeances } from "./reportings";
import { RESERVES_EXEMPLE } from "./reserves";
import { CODES_EXEMPLE, OBJETS_EXEMPLE } from "./exemples";
import type { CodeRef, Objet } from "./types";

export type Ligne = { texte: string; gravite: "info" | "attention" | "critique"; lien: string };
export type Matin = { groupe: Ligne[]; reserves: Ligne[]; reportings: Ligne[]; contrats: Ligne[]; encours: Ligne[]; reciproques: Ligne[] };

const euros = (v: number | null) => (v === null ? "—" : montant(v).replace(/,00\s€$/, " €"));
const jj = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

/* l'exemple, avec les mêmes phrases que private.grp_lignes_matin */
export function matinExemple(codes: CodeRef[], objets: Objet[]): Matin {
  const bruts = contratsExemple(objets);
  const contrats = bruts
    .map((k) => echeancier(k, bruts))
    .filter((c) => c.statut === "actif" && c.reconduction === "tacite" && c.date_limite >= aujourdhui() && c.jours_restants <= 30)
    .sort((a, b) => a.date_limite.localeCompare(b.date_limite))
    .map((c) => ({
      texte: `Avant le ${jj(c.date_limite)} : dénoncer « ${c.intitule} » (${c.tiers}, ${c.societe})${c.montant_annuel !== null ? ` — ${euros(c.montant_annuel)} par an` : ""}${c.contrats_du_tiers > 1 ? ` ; ${c.contrats_du_tiers} contrats chez ce tiers dans le groupe` : ""}`,
      gravite: (c.jours_restants <= 7 ? "critique" : "attention") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const d = exempleEncours(codes, objets, PLAFONDS_EXEMPLE);
  const encours: Ligne[] = [
    ...calculerGroupe(d.lignes, d.plafonds)
      .filter((g) => g.nature === "client" && g.depasse && !g.intragroupe)
      .map((g) => ({ texte: `${g.nom_groupe} : ${euros(g.total)} d'encours pour le groupe, plafond ${euros(g.plafond)} (dont ${euros(g.echu)} échus, ${g.societes} société${g.societes > 1 ? "s" : ""})`, gravite: "attention" as const, lien: "/espace/varelo" })),
    ...d.courants
      .filter((c) => c.age_jours > 7)
      .map((c) => ({ texte: `La balance ${c.nature === "client" ? "clients" : "fournisseurs"} de ${c.societe} date du ${jj(c.arrete_le)} (${c.age_jours} jours) : à redéposer`, gravite: "info" as const, lien: "/espace/varelo" })),
  ];
  const reciproques = RECIPROQUES_EXEMPLE.filter((r) => r.etat === "ecart" || r.etat === "manque_debiteur" || r.etat === "dates_differentes")
    .sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
    .map((r) => ({
      texte:
        r.etat === "ecart" ? `${r.creancier} → ${r.debiteur} : écart de ${euros(r.ecart)} à expliquer`
        : r.etat === "manque_debiteur" ? `${r.creancier} dit que ${r.debiteur} lui doit ${euros(r.creance)} ; ${r.debiteur} ne reconnaît rien`
        : `${r.creancier} → ${r.debiteur} : balances arrêtées à des dates différentes (${jj(r.arrete_creancier ?? "")} et ${jj(r.arrete_debiteur ?? "")})`,
      gravite: (r.etat === "ecart" ? "attention" : "info") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const groupe: Ligne[] = [];
  for (const p of BASES_EXEMPLE().map(ligneDePage).sort((a, b) => a.societe.localeCompare(b.societe))) {
    if (p.sous_plancher) groupe.push({ texte: `${p.societe} : trésorerie de ${euros(p.tresorerie)}, sous son plancher de ${euros(p.tresorerie_plancher)} (balance au ${jj(p.arrete_le)})`, gravite: "attention", lien: "/espace/varelo" });
    if (p.objectif_a_date !== null && p.objectif_a_date > 0 && p.ecart_objectif !== null && p.ecart_objectif < -0.1 * p.objectif_a_date)
      groupe.push({ texte: `${p.societe} : ventes de ${euros(p.ventes)} au ${jj(p.arrete_le)}, ${euros(Math.round(-p.ecart_objectif * 100) / 100)} sous l'objectif à date`, gravite: "attention", lien: "/espace/varelo" });
    if (p.age_jours > 35) groupe.push({ texte: `La balance générale de ${p.societe} date du ${jj(p.arrete_le)} (${p.age_jours} jours) : à redéposer`, gravite: "info", lien: "/espace/varelo" });
  }
  const faits = FAITS_EXEMPLE();
  const reportings: Ligne[] = OBLIGATIONS_EXEMPLE()
    .flatMap((o) => echeances(o, faits))
    .filter((d) => d.etat === "en_retard" || d.etat === "aujourdhui" || d.etat === "semaine")
    .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.societe.localeCompare(b.societe))
    .map((d) => ({
      texte: d.etat === "en_retard" ? `En retard depuis le ${jj(d.echeance)} : ${d.intitule} pour ${d.destinataire} (${d.societe}, période du ${jj(d.periode_debut)} au ${jj(d.periode_fin)})`
        : d.etat === "aujourdhui" ? `Aujourd'hui : ${d.intitule} pour ${d.destinataire} (${d.societe})`
        : `Avant le ${jj(d.echeance)} : ${d.intitule} pour ${d.destinataire} (${d.societe})`,
      gravite: (d.etat === "en_retard" ? "critique" : d.etat === "aujourdhui" ? "attention" : "info") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  const reserves: Ligne[] = RESERVES_EXEMPLE()
    .filter((r) => r.statut === "a_examiner")
    .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.societe.localeCompare(b.societe))
    .map((r) => ({
      texte: r.etat === "depasse" ? `Délai passé depuis le ${jj(r.echeance)} : ${r.transporteur} (${r.societe}, livraison du ${jj(r.date_reception)}) — la protestation est désormais tardive`
        : `Avant le ${jj(r.echeance)} : protestation à ${r.transporteur} (${r.societe}, livraison du ${jj(r.date_reception)}${r.expediteur ? `, ${r.expediteur}` : ""})`,
      gravite: (r.etat === "aujourdhui" || r.etat === "demain" || r.etat === "depasse" ? "critique" : "attention") as Ligne["gravite"],
      lien: "/espace/varelo",
    }));
  return { groupe, reserves, reportings, contrats, encours, reciproques };
}

/* le compteur de l'onglet VARELO en mode exemple : les lignes attention ou critique */
export function compterCeMatinExemple(): number {
  const m = matinExemple(CODES_EXEMPLE, OBJETS_EXEMPLE);
  return Object.values(m).flat().filter((l) => l.gravite === "attention" || l.gravite === "critique").length;
}
