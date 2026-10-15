/* Les analyses du parc du loueur d'exemple « Autoloc Bertin » (06/10/2026,
   session B3) : mêmes formes que les portes b3t_01 à b3t_03, chiffres
   fictifs. Les dates suivent le jour où l'écran est ouvert. */

import { GRENOBLE, LYON } from "./exemples";
import type { Analyses } from "./analyses";

function dans(heures: number): string {
  return new Date(Date.now() + heures * 3600_000).toISOString();
}

function ilYa(jours: number): string {
  return new Date(Date.now() - jours * 86400_000).toISOString();
}

const u = (p: string, n: number) => `00000000-0000-4000-8000-${p}${String(n).padStart(12 - p.length, "0")}`;

export const ANALYSES_EXEMPLE: Analyses = {
  inactifs: {
    a_risque: 3,
    vehicules: [
      { vehicule_id: u("b3a", 1), immatriculation: "FK-218-LM", modele: "Peugeot 308", categorie: "C", categorie_libelle: "Compacte", entite_id: LYON, agence: "LYON", au_parking_depuis: ilYa(4), jours_parking: 4, probabilite: 1, niveau: "fort",
        raison: "2 véhicule(s) C au parc, 0 retour(s) et 0 départ(s) prévus sur 72 h : 2 de trop",
        action: { type: "transfert", vers: "GRENOBLE", libelle: "Transférer vers GRENOBLE : 2 départ(s) de cette catégorie sans véhicule sur 72 h" } },
      { vehicule_id: u("b3a", 2), immatriculation: "GB-904-QR", modele: "Renault Mégane", categorie: "C", categorie_libelle: "Compacte", entite_id: LYON, agence: "LYON", au_parking_depuis: ilYa(1), jours_parking: 1, probabilite: 1, niveau: "fort",
        raison: "2 véhicule(s) C au parc, 0 retour(s) et 0 départ(s) prévus sur 72 h : 2 de trop",
        action: { type: "transfert", vers: "GRENOBLE", libelle: "Transférer vers GRENOBLE : 2 départ(s) de cette catégorie sans véhicule sur 72 h" } },
      { vehicule_id: u("b3a", 3), immatriculation: "EZ-551-TP", modele: "Citroën C5 Aircross", categorie: "D", categorie_libelle: "SUV", entite_id: GRENOBLE, agence: "GRENOBLE", au_parking_depuis: ilYa(6), jours_parking: 6, probabilite: 0.5, niveau: "moyen",
        raison: "2 véhicule(s) D au parc, 1 retour(s) et 2 départ(s) prévus sur 72 h : 1 de trop",
        action: { type: "montee_en_gamme", libelle: "Le proposer en montée en gamme aux départs de la catégorie C, qui manque de 2 véhicule(s)" } },
    ],
  },
  reservations: {
    reservations: [
      { reservation_id: u("b3r", 1), ref: "RES-88412", depart_prevu_le: dans(19), entite_id: GRENOBLE, agence: "GRENOBLE", categorie: "C", client: "Yohan Mercier", canal: "comparateur", vol: null, score: 6, niveau: "fort",
        raisons: ["option non confirmée", "ni prépayée ni acompte", "nouveau client", "canal « comparateur » souvent sans présentation"], action: "Confirmer la réservation (elle n'est qu'en option)" },
      { reservation_id: u("b3r", 2), ref: "RES-88390", depart_prevu_le: dans(27), entite_id: LYON, agence: "LYON", categorie: "B", client: "Inès Faure", canal: "site", vol: "AF7412", score: 5, niveau: "fort",
        raisons: ["a déjà fait faux bond", "ni prépayée ni acompte", "arrive par le vol AF7412 : suivre l'arrivée"], action: "Demander un acompte et une confirmation écrite" },
      { reservation_id: u("b3r", 3), ref: "RES-88177", depart_prevu_le: dans(50), entite_id: LYON, agence: "LYON", categorie: "D", client: "Marc Delorme", canal: "téléphone", vol: null, score: 2, niveau: "moyen",
        raisons: ["ni prépayée ni acompte"], action: "Demander un acompte" },
    ],
  },
  contrats: {
    a_risque: 1,
    contrats: [
      { contrat_id: u("b3c", 1), numero: "LY-2026-1043", depart_le: ilYa(0.1), retour_prevu_le: dans(70), entite_id: LYON, agence: "LYON", client: "Kevin Arnaud", vehicule: "GH-120-AB", score: 6, niveau: "fort",
        raisons: ["pièces pas encore contrôlées", "a déjà rendu un véhicule en retard", "2 factures de dommages par le passé"], controle: null, action: "Contrôler la pièce d'identité et le permis" },
      { contrat_id: u("b3c", 2), numero: "GR-2026-0388", depart_le: ilYa(0.3), retour_prevu_le: dans(46), entite_id: GRENOBLE, agence: "GRENOBLE", client: "Léa Robin", vehicule: "FT-332-KD", score: 3, niveau: "moyen",
        raisons: ["permis de moins de trois ans", "nouveau client"], controle: { identite: "conforme", permis: "conforme", permis_recent: true, le: ilYa(0.3) },
        action: "Faire l'état des lieux de départ avec le client, photos à l'appui" },
    ],
  },
  montee: {
    offres: [
      { reservation_id: u("b3m", 1), ref: "RES-88402", depart_prevu_le: dans(16), entite_id: LYON, agence: "LYON", client: "Transports Vidal SARL", categorie: "B",
        offre: { categorie_id: u("b3k", 3), categorie: "C", libelle: "Compacte", libres: 2 }, score: 3, raisons: ["client professionnel", "5 jours de location", "client fidèle"] },
      { reservation_id: u("b3m", 2), ref: "RES-88415", depart_prevu_le: dans(31), entite_id: LYON, agence: "LYON", client: "Sophie Lambert", categorie: "B",
        offre: { categorie_id: u("b3k", 3), categorie: "C", libelle: "Compacte", libres: 2 }, score: 2, raisons: ["a déjà loué une catégorie supérieure"] },
    ],
  },
  plan: {
    annee: new Date().getFullYear() + 1,
    periode: { du: ilYa(365).slice(0, 10), au: ilYa(0).slice(0, 10), mois: 12 },
    cible_utilisation: 0.8,
    agences: [
      { entite_id: GRENOBLE, agence: "GRENOBLE", nom: "Autoloc Bertin — Grenoble", categories: [
        { categorie_id: u("b3k", 2), categorie: "B", libelle: "Citadine", flotte: 9, jours_loues: 2840, utilisation: 0.863, pic: 11, cible: 11, acheter: 0, vendre: 0, deplacer: [], recevoir: 2, a_vendre: [], renouveler: 1,
          raison: "9 véhicule(s), utilisés à 86 % ; 11,0 en cours au plus fort (95e centile) ; il en faut 11" },
        { categorie_id: u("b3k", 3), categorie: "C", libelle: "Compacte", flotte: 6, jours_loues: 2010, utilisation: 0.918, pic: 8.4, cible: 9, acheter: 3, vendre: 0, deplacer: [], recevoir: 0, a_vendre: [], renouveler: 0,
          raison: "6 véhicule(s), utilisés à 92 % ; 8,4 en cours au plus fort (95e centile) ; il en faut 9" },
      ] },
      { entite_id: LYON, agence: "LYON", nom: "Autoloc Bertin — Lyon Part-Dieu", categories: [
        { categorie_id: u("b3k", 2), categorie: "B", libelle: "Citadine", flotte: 14, jours_loues: 2950, utilisation: 0.577, pic: 10.2, cible: 11, acheter: 0, vendre: 1, deplacer: [{ vers: "GRENOBLE", n: 2 }], recevoir: 0, a_vendre: ["DM-447-AC"], renouveler: 3,
          raison: "14 véhicule(s), utilisés à 58 % ; 10,2 en cours au plus fort (95e centile) ; il en faut 11" },
        { categorie_id: u("b3k", 4), categorie: "D", libelle: "SUV", flotte: 5, jours_loues: 1500, utilisation: 0.822, pic: 5, cible: 6, acheter: 1, vendre: 0, deplacer: [], recevoir: 0, a_vendre: [], renouveler: 2,
          raison: "5 véhicule(s), utilisés à 82 % ; 5,0 en cours au plus fort (95e centile) ; il en faut 6" },
      ] },
    ],
    totaux: { acheter: 4, vendre: 1, deplacer: 2, renouveler: 6 },
  },
};
