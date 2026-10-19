/* ══════════════════════════════════════════════════════════════════════
   Le chiffrage d'un retour, EN MÉMOIRE, pour le mode exemple (06/10/2026)

   Décalque des règles de private.loc_chiffrer_retour (socle, 05/10) :
   carburant au huitième, kilomètres au-delà du forfait, retard au jour
   entamé après tolérance, dommages au barème plafonnés à la franchise,
   TVA selon le régime de la ligne. En base réelle, c'est la base qui
   calcule ; ceci ne sert qu'à montrer l'enchaînement sur l'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import type { Avertissement, Contrat, LigneBareme, LigneProposition, Proposition, Reglages, Retour, Vehicule } from "./types";

const arrondi = (v: number) => Math.round(v * 100) / 100;

function ligneBareme(lignes: LigneBareme[], code: string, categorie: string | null) {
  return lignes.filter((l) => l.code === code && (l.categorie_id === null || l.categorie_id === categorie)).sort((a, b) => (a.categorie_id ? -1 : 1) - (b.categorie_id ? -1 : 1))[0] ?? null;
}
function ligneBaremePar(lignes: LigneBareme[], famille: string, unite: string, categorie: string | null) {
  return lignes.filter((l) => l.famille === famille && l.unite === unite && (l.categorie_id === null || l.categorie_id === categorie)).sort((a, b) => (a.categorie_id ? -1 : 1) - (b.categorie_id ? -1 : 1) || a.rang - b.rang)[0] ?? null;
}

export function chiffrerLocal(o: { contrat: Contrat; vehicule: Vehicule | null; retour: Retour; bareme: LigneBareme[]; reglages: Reglages; version: number; par: string; ids: () => string; retourPrevu: string }): { proposition: Proposition; lignes: LigneProposition[] } {
  const { contrat: c, retour: r, bareme, reglages } = o;
  const id = o.ids();
  const taux = 20;
  const avert: Avertissement[] = [];
  const lignes: LigneProposition[] = [];
  let bloque = false;
  let hors = false;
  let rang = 0;
  const poser = (p: Omit<LigneProposition, "id" | "proposition_id" | "rang" | "montant_tva" | "montant_ttc" | "taux_tva"> & { taux_tva?: number | null }) => {
    const ht = p.statut === "chiffree" ? arrondi(p.montant_ht) : 0;
    const tva = p.regime_tva === "taxable" ? arrondi((ht * taux) / 100) : 0;
    rang += 1;
    lignes.push({ ...p, id: o.ids(), proposition_id: id, rang, montant_ht: ht, taux_tva: p.regime_tva === "taxable" ? taux : null, montant_tva: tva, montant_ttc: arrondi(ht + tva) });
  };
  const plafond = c.rachat_franchise ? (c.franchise_reduite_eur ?? 0) : c.rachat_franchise === null && c.franchise_reduite_eur !== null ? null : c.franchise_eur;
  let calcCarb: Record<string, unknown> = {};
  let calcKm: Record<string, unknown> = {};
  let calcRetard: Record<string, unknown> = {};

  if (bareme.length === 0) {
    avert.push({ poste: "bareme", code: "bareme_absent", bloquant: true });
    bloque = true;
  } else {
    /* 1. carburant */
    const dep = r.carburant_depart_8, ret = r.carburant_retour_8;
    if (c.politique_carburant === "prepaye") calcCarb = { montant_ht: 0, motif: "prepaye" };
    else if (c.politique_carburant === "seuil") {
      const lb = ligneBareme(bareme, "CHARGE_SOUS_SEUIL", c.categorie_id);
      if (r.charge_retour_pct === null || c.seuil_charge_pct === null) { calcCarb = { montant_ht: 0, motif: "niveau_inconnu" }; avert.push({ poste: "carburant", code: "niveau_inconnu", bloquant: true }); bloque = true; }
      else if (r.charge_retour_pct >= c.seuil_charge_pct) calcCarb = { montant_ht: 0, motif: "charge_suffisante" };
      else if (!lb?.prix_eur) { calcCarb = { montant_ht: 0, motif: "poste_absent_du_bareme" }; avert.push({ poste: "carburant", code: "poste_absent_du_bareme", bloquant: false }); }
      else { calcCarb = { unite: "forfait", quantite: 1, prix_unitaire: lb.prix_eur, montant_ht: lb.prix_eur }; poser({ nature: "frais", famille: "carburant", code: lb.code, libelle: lb.libelle, unite: "forfait", quantite: 1, prix_unitaire: lb.prix_eur, montant_ht: lb.prix_eur, regime_tva: lb.regime_tva, statut: "chiffree", plafonnee: false, hors_bareme: false, calcul: calcCarb, preuves: r.preuves.carburant ?? [] }); }
    } else if (dep === null || ret === null) { calcCarb = { montant_ht: 0, motif: "niveau_inconnu" }; avert.push({ poste: "carburant", code: "niveau_inconnu", bloquant: true }); bloque = true; }
    else {
      const manquant = Math.max(0, dep - ret);
      const lb8 = ligneBaremePar(bareme, "carburant", "huitieme", c.categorie_id);
      const lbL = ligneBaremePar(bareme, "carburant", "litre", c.categorie_id);
      if (manquant === 0) calcCarb = { manquant: 0, montant_ht: 0, motif: "niveau_rendu_suffisant" };
      else if (lb8?.prix_eur != null) { calcCarb = { manquant, unite: "huitieme", quantite: manquant, prix_unitaire: lb8.prix_eur, montant_ht: arrondi(manquant * lb8.prix_eur) }; poser({ nature: "frais", famille: "carburant", code: lb8.code, libelle: lb8.libelle, unite: "huitieme", quantite: manquant, prix_unitaire: lb8.prix_eur, montant_ht: manquant * lb8.prix_eur, regime_tva: lb8.regime_tva, statut: "chiffree", plafonnee: false, hors_bareme: false, calcul: calcCarb, preuves: r.preuves.carburant ?? [] }); }
      else if (lbL?.prix_eur != null && o.vehicule?.reservoir_l) { const litres = arrondi((manquant * o.vehicule.reservoir_l) / 8); calcCarb = { manquant, unite: "litre", quantite: litres, prix_unitaire: lbL.prix_eur, montant_ht: arrondi(litres * lbL.prix_eur) }; poser({ nature: "frais", famille: "carburant", code: lbL.code, libelle: lbL.libelle, unite: "litre", quantite: litres, prix_unitaire: lbL.prix_eur, montant_ht: litres * lbL.prix_eur, regime_tva: lbL.regime_tva, statut: "chiffree", plafonnee: false, hors_bareme: false, calcul: calcCarb, preuves: r.preuves.carburant ?? [] }); }
      else { calcCarb = { manquant, montant_ht: 0, motif: "poste_absent_du_bareme" }; avert.push({ poste: "carburant", code: "poste_absent_du_bareme", bloquant: false }); }
    }
    /* 2. kilomètres */
    const lbKm = ligneBaremePar(bareme, "kilometres", "km", c.categorie_id);
    const jours = Math.max(1, Math.ceil((new Date(o.retourPrevu).getTime() - new Date(c.depart_le).getTime()) / 86_400_000));
    if (c.km_illimite) calcKm = { montant_ht: 0, motif: "illimite" };
    else if (c.km_depart === null || r.km_retour === null) { calcKm = { montant_ht: 0, motif: "compteur_inconnu" }; avert.push({ poste: "kilometres", code: "compteur_inconnu", bloquant: true }); bloque = true; }
    else if (r.km_retour < c.km_depart) { calcKm = { montant_ht: 0, motif: "compteur_decroissant" }; avert.push({ poste: "kilometres", code: "compteur_decroissant", bloquant: true }); bloque = true; }
    else {
      const parcourus = r.km_retour - c.km_depart;
      const inclus = c.km_inclus ?? (c.km_inclus_jour !== null ? c.km_inclus_jour * jours : null);
      if (inclus === null) { calcKm = { parcourus, montant_ht: 0, motif: "forfait_inconnu" }; avert.push({ poste: "kilometres", code: "forfait_inconnu", bloquant: true }); bloque = true; }
      else {
        const dep = Math.max(0, parcourus - inclus);
        if (dep === 0) calcKm = { parcourus, inclus, depassement: 0, montant_ht: 0, motif: "dans_le_forfait" };
        else if (!lbKm?.prix_eur) { calcKm = { parcourus, inclus, depassement: dep, montant_ht: 0, motif: "poste_absent_du_bareme" }; avert.push({ poste: "kilometres", code: "poste_absent_du_bareme", bloquant: false }); }
        else { calcKm = { parcourus, inclus, depassement: dep, unite: "km", quantite: dep, prix_unitaire: lbKm.prix_eur, montant_ht: arrondi(dep * lbKm.prix_eur) }; poser({ nature: "frais", famille: "kilometres", code: lbKm.code, libelle: lbKm.libelle, unite: "km", quantite: dep, prix_unitaire: lbKm.prix_eur, montant_ht: dep * lbKm.prix_eur, regime_tva: lbKm.regime_tva, statut: "chiffree", plafonnee: false, hors_bareme: false, calcul: calcKm, preuves: r.preuves.km ?? [] }); }
      }
    }
    /* 3. retard */
    const lbRetard = ligneBaremePar(bareme, "retard", "jour_entame", c.categorie_id);
    const minutes = Math.round((new Date(r.retour_reel_le).getTime() - new Date(o.retourPrevu).getTime()) / 60_000);
    const prixJour = lbRetard?.prix_eur ?? c.tarif_jour_eur;
    if (minutes <= 0) calcRetard = { retard_min: minutes, montant_ht: 0, motif: "rendu_a_l_heure" };
    else if (minutes <= reglages.tolerance_retard_min) calcRetard = { retard_min: minutes, montant_ht: 0, motif: "dans_la_tolerance" };
    else if (prixJour === null) { calcRetard = { retard_min: minutes, montant_ht: 0, motif: "tarif_inconnu" }; avert.push({ poste: "retard", code: "tarif_inconnu", bloquant: true }); bloque = true; }
    else {
      const j = Math.ceil(minutes / 1440);
      calcRetard = { retard_min: minutes, jours: j, unite: "jour_entame", quantite: j, prix_unitaire: prixJour, montant_ht: arrondi(j * prixJour) };
      if (!lbRetard) avert.push({ poste: "retard", code: "poste_absent_du_bareme", bloquant: false });
      else poser({ nature: "frais", famille: "retard", code: lbRetard.code, libelle: lbRetard.libelle, unite: "jour_entame", quantite: j, prix_unitaire: prixJour, montant_ht: j * prixJour, regime_tva: lbRetard.regime_tva, statut: "chiffree", plafonnee: false, hors_bareme: false, calcul: calcRetard, preuves: r.preuves.retard ?? [] });
    }
    /* 4. dommages */
    for (const d of r.dommages) {
      const code = d.code.trim().toUpperCase();
      const lb = ligneBareme(bareme, code, c.categorie_id);
      const q = d.quantite ?? 1;
      if (!lb) {
        if (d.prix_eur != null) { hors = true; poser({ nature: "dommage", famille: "dommage", code, libelle: d.libelle ?? code, unite: "forfait", quantite: q, prix_unitaire: d.prix_eur, montant_ht: q * d.prix_eur, regime_tva: d.regime_tva ?? "hors_champ", statut: d.preuves.length ? "chiffree" : "preuve_manquante", plafonnee: false, hors_bareme: true, calcul: { hors_bareme: true, prix_agence: d.prix_eur }, preuves: d.preuves }); if (!d.preuves.length) { avert.push({ poste: code, code: "preuve_absente", bloquant: true }); bloque = true; } }
        else avert.push({ poste: code, code: "poste_absent_du_bareme", bloquant: false });
        continue;
      }
      let statut: LigneProposition["statut"] = "chiffree";
      let montant = 0;
      let calcul: Record<string, unknown> = { ligne: lb.code, unite: lb.unite };
      if (!d.preuves.length) { statut = "preuve_manquante"; avert.push({ poste: code, code: "preuve_absente", bloquant: true }); bloque = true; }
      else if (lb.unite === "devis") { if (d.devis_eur != null) { montant = d.devis_eur; calcul = { ...calcul, devis: true }; } else { statut = "a_chiffrer"; avert.push({ poste: code, code: "devis_attendu", bloquant: false }); } }
      else montant = q * (lb.prix_eur ?? 0);
      if (statut === "chiffree" && plafond === null) { statut = "a_chiffrer"; calcul = { ...calcul, motif: "franchise_inconnue", montant_bareme: montant }; montant = 0; }
      poser({ nature: "dommage", famille: lb.famille, code: lb.code, libelle: d.libelle ?? lb.libelle, unite: lb.unite, quantite: q, prix_unitaire: lb.prix_eur, montant_ht: montant, regime_tva: lb.regime_tva, statut, plafonnee: false, hors_bareme: false, calcul, preuves: d.preuves });
    }
    if (plafond === null && lignes.some((l) => l.nature === "dommage")) { avert.push({ poste: "dommages", code: "franchise_inconnue", bloquant: true }); bloque = true; }
    if (r.non_contradictoire && lignes.some((l) => l.nature === "dommage")) { hors = true; avert.push({ poste: "dommages", code: "etat_des_lieux_non_contradictoire", bloquant: false }); }
    /* 5. autres postes */
    for (const p of r.postes) {
      const code = p.code.trim().toUpperCase();
      const lb = ligneBareme(bareme, code, c.categorie_id);
      const q = p.quantite ?? 1;
      const statut: LigneProposition["statut"] = p.preuves.length ? "chiffree" : "preuve_manquante";
      if (statut === "preuve_manquante" && (lb || p.prix_eur != null)) { avert.push({ poste: code, code: "preuve_absente", bloquant: true }); bloque = true; }
      if (!lb) {
        if (p.prix_eur != null) { hors = true; poser({ nature: p.nature ?? "frais", famille: p.nature === "dommage" ? "dommage" : "autre", code, libelle: p.libelle ?? code, unite: "forfait", quantite: q, prix_unitaire: p.prix_eur, montant_ht: q * p.prix_eur, regime_tva: p.nature === "dommage" ? "hors_champ" : "taxable", statut, plafonnee: false, hors_bareme: true, calcul: { hors_bareme: true, prix_agence: p.prix_eur }, preuves: p.preuves }); }
        else avert.push({ poste: code, code: "poste_absent_du_bareme", bloquant: false });
        continue;
      }
      let montant = q * (lb.prix_eur ?? 0);
      let st: LigneProposition["statut"] = statut;
      if (lb.unite === "devis" && st === "chiffree") { if (p.devis_eur != null) montant = p.devis_eur; else { st = "a_chiffrer"; montant = 0; avert.push({ poste: code, code: "devis_attendu", bloquant: false }); } }
      poser({ nature: lb.nature, famille: lb.famille, code: lb.code, libelle: p.libelle ?? lb.libelle, unite: lb.unite, quantite: q, prix_unitaire: lb.prix_eur, montant_ht: montant, regime_tva: lb.regime_tva, statut: st, plafonnee: false, hors_bareme: false, calcul: { ligne: lb.code, unite: lb.unite }, preuves: p.preuves });
    }
    /* 6. plafond de franchise sur les dommages chiffrés */
    if (plafond !== null) {
      let cumul = 0;
      for (const l of lignes) {
        if (l.nature !== "dommage" || l.statut !== "chiffree") continue;
        const reste = Math.max(0, plafond - cumul);
        if (l.montant_ttc > reste) {
          const ttc = arrondi(reste);
          const ht = l.regime_tva === "taxable" && l.taux_tva ? arrondi(ttc / (1 + l.taux_tva / 100)) : ttc;
          l.calcul = { ...l.calcul, montant_bareme_ttc: l.montant_ttc, plafond };
          l.montant_ttc = ttc; l.montant_ht = ht; l.montant_tva = arrondi(ttc - ht); l.plafonnee = true;
        }
        cumul += l.montant_ttc;
      }
    }
  }
  const total_ht = arrondi(lignes.reduce((s, l) => s + l.montant_ht, 0));
  const total_tva = arrondi(lignes.reduce((s, l) => s + l.montant_tva, 0));
  const total_ttc = arrondi(lignes.reduce((s, l) => s + l.montant_ttc, 0));
  const statut: Proposition["statut"] = lignes.length === 0 && !bloque ? "rien_a_facturer" : bloque ? "preuve_manquante" : "calculee";
  const { dommages: _d, postes: _p, preuves: _pr, ...entrees } = r;
  void _d; void _p; void _pr;
  return {
    proposition: {
      id, contrat_id: c.id, entite_id: c.entite_id, version: o.version, statut, source: "saisie", bareme_id: bareme[0]?.bareme_id ?? null, hors_bareme: hors, non_contradictoire: r.non_contradictoire,
      entrees: entrees as Record<string, unknown>, avertissements: avert, calcul_retard: calcRetard, calcul_km: calcKm, calcul_carburant: calcCarb, plafond_eur: plafond,
      total_ht, total_tva, total_ttc,
      total_frais_ttc: arrondi(lignes.filter((l) => l.nature === "frais").reduce((s, l) => s + l.montant_ttc, 0)),
      total_dommages_ttc: arrondi(lignes.filter((l) => l.nature === "dommage").reduce((s, l) => s + l.montant_ttc, 0)),
      demande_id: null, calculee_le: new Date().toISOString(), calculee_par: o.par,
    },
    lignes,
  };
}
