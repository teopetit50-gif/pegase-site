/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Avenants et situations — l'exemple rempli comme la référence
   (02/11/2026, règle 3 de Teo : « un contenu de même longueur que la
   référence »). Le Board de Linear relevé montre quatre colonnes de quatre
   à cinq cartes visibles ; l'exemple des chantiers n'avait que deux
   avenants et une situation. Voici de quoi remplir chaque colonne, sur les
   six chantiers d'exemple.

   Posé une fois dans les tableaux d'exemple par la page (onLocal), donc vu
   aussi par la fiche du chantier. Identifiants en 0000…ea… : rien ici ne
   ressemble à une ligne de la base, rien n'y est jamais écrit.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import { recalculer } from "@/components/espace/daliro/situations";
import type { Avenant, LigneAvenant, LigneSituation, Situation, StatutAvenant } from "@/components/espace/daliro/types";

const id = (n: number) => `00000000-0000-4000-8000-000000ea${String(n).padStart(4, "0")}`;
const chantier = (n: string) => `00000000-0000-4000-8000-00000000d${n}`;

const TIL = chantier("001");
const ROL = chantier("002");
const SCL = chantier("720");
const MAM = chantier("730");
const DUR = chantier("740");
const VEN = chantier("750");

type Ligne = [designation: string, unite: string, quantite: number, pu: number];
type Def = {
  n: number;
  chantier: string;
  numero: number;
  objet: string;
  canal: string;
  auteur: string;
  statut: StatutAvenant;
  demande?: "en_attente" | "approuvee" | "rejetee" | "executee";
  /* jours écoulés depuis l'ouverture, la soumission, la signature */
  ouvert: number;
  soumis?: number;
  signe?: number;
  signataire?: string;
  motif?: string;
  lignes: Ligne[];
};

const DEFS: Def[] = [
  /* à chiffrer */
  { n: 1, chantier: ROL, numero: 1, objet: "Trémie pour l'escalier du garage, reprise du plancher bois", canal: "photo", auteur: "Chef d'équipe Pose A", statut: "brouillon", ouvert: 3, lignes: [] },
  { n: 2, chantier: SCL, numero: 1, objet: "Cloison vitrée supplémentaire dans la salle d'attente", canal: "vocal", auteur: "Conducteur de travaux", statut: "brouillon", ouvert: 2, lignes: [["Cloison vitrée toute hauteur, cadre alu", "ml", 4.2, 610]] },
  { n: 3, chantier: MAM, numero: 1, objet: "Habillage inox du comptoir de vente, demandé en réunion", canal: "visite", auteur: "Claire Morel", statut: "brouillon", ouvert: 5, lignes: [] },
  { n: 4, chantier: DUR, numero: 1, objet: "Marches d'accès à la terrasse côté jardin (trois marches)", canal: "courriel", auteur: "M. Duret", statut: "brouillon", ouvert: 1, lignes: [["Marche béton désactivé, nez arrondi", "u", 3, 185]] },
  { n: 5, chantier: VEN, numero: 1, objet: "Reprise des descentes d'eaux pluviales du préau B", canal: "photo", auteur: "Chef d'équipe Pose B", statut: "brouillon", ouvert: 16, lignes: [] },
  /* soumis, dans « À valider » */
  { n: 6, chantier: SCL, numero: 2, objet: "Six prises supplémentaires en salle de soins", canal: "message", auteur: "Dr Saint-Clair", statut: "soumis", demande: "en_attente", ouvert: 6, soumis: 4, lignes: [["Prise 16 A encastrée, câblage depuis le tableau", "u", 6, 68]] },
  { n: 7, chantier: MAM, numero: 2, objet: "Faux plafond acoustique dans le fournil", canal: "vocal", auteur: "Chef d'équipe Pose A", statut: "soumis", demande: "en_attente", ouvert: 9, soumis: 8, lignes: [["Plafond acoustique en dalles 600 × 600", "m2", 38, 46]] },
  { n: 8, chantier: VEN, numero: 2, objet: "Bardage bois sur le pignon est du préau A", canal: "visite", auteur: "Ville de Vénissieux", statut: "soumis", demande: "en_attente", ouvert: 21, soumis: 16, lignes: [["Bardage mélèze à claire-voie", "m2", 26, 92], ["Ossature et pare-pluie", "m2", 26, 31]] },
  { n: 9, chantier: DUR, numero: 2, objet: "Garde-corps vitré sur la terrasse, neuf mètres linéaires", canal: "visite", auteur: "M. Duret", statut: "soumis", demande: "rejetee", ouvert: 12, soumis: 10, lignes: [["Garde-corps verre feuilleté, pinces inox", "ml", 9, 420]] },
  /* soumis, validés : à signer */
  { n: 10, chantier: ROL, numero: 2, objet: "Fenêtre de toit supplémentaire dans les combles aménagés", canal: "photo", auteur: "Conducteur de travaux", statut: "soumis", demande: "approuvee", ouvert: 7, soumis: 5, lignes: [["Fenêtre de toit 78 × 118, raccord tuile", "u", 1, 1240]] },
  { n: 11, chantier: SCL, numero: 3, objet: "Porte coulissante à galandage pour le cabinet 2", canal: "courriel", auteur: "SCM Saint-Clair", statut: "soumis", demande: "approuvee", ouvert: 8, soumis: 6, lignes: [["Châssis à galandage et porte postformée", "u", 1, 890]] },
  { n: 12, chantier: MAM, numero: 3, objet: "Évier double bac et mitigeur pour le laboratoire", canal: "message", auteur: "Boulangerie Ma Mie", statut: "soumis", demande: "approuvee", ouvert: 11, soumis: 9, lignes: [["Évier inox double bac sur piétement", "u", 1, 760], ["Mitigeur à douchette", "u", 1, 210]] },
  { n: 13, chantier: VEN, numero: 3, objet: "Éclairage LED sous les préaux, quatorze luminaires", canal: "vocal", auteur: "Chef d'équipe Pose B", statut: "soumis", demande: "approuvee", ouvert: 18, soumis: 15, lignes: [["Luminaire LED étanche IP65", "u", 14, 165]] },
  /* signés */
  { n: 14, chantier: TIL, numero: 3, objet: "Porte palière renforcée au logement 3, serrure trois points", canal: "reception", auteur: "SCI Lefèvre Patrimoine", statut: "signe", demande: "executee", ouvert: 20, soumis: 18, signe: 15, signataire: "Signé sur place : Mme Lefèvre", lignes: [["Porte d'entrée palière, bloc-porte acier", "u", 1, 2350]] },
  { n: 15, chantier: TIL, numero: 4, objet: "Peinture des allèges du R+1 après la dépose des fenêtres", canal: "photo", auteur: "Chef d'équipe Pose A", statut: "signe", demande: "executee", ouvert: 25, soumis: 22, signe: 19, signataire: "Claire Morel", lignes: [["Peinture des menuiseries, deux couches", "m2", 32, 18.5]] },
  { n: 16, chantier: SCL, numero: 4, objet: "Doublage isolant du mur mitoyen côté pharmacie", canal: "visite", auteur: "Conducteur de travaux", statut: "signe", demande: "executee", ouvert: 14, soumis: 12, signe: 9, signataire: "SCM Saint-Clair", lignes: [["Doublage PSE 100 mm + BA13", "m2", 24, 52]] },
  { n: 17, chantier: MAM, numero: 4, objet: "Prise triphasée pour le four, tirage depuis le tableau", canal: "message", auteur: "Boulangerie Ma Mie", statut: "signe", demande: "executee", ouvert: 17, soumis: 15, signe: 12, signataire: "Boulangerie Ma Mie SARL", lignes: [["Ligne triphasée 32 A et prise", "u", 1, 640]] },
  { n: 18, chantier: DUR, numero: 3, objet: "Dalle béton pour l'abri de jardin, douze mètres carrés", canal: "vocal", auteur: "M. Duret", statut: "signe", demande: "executee", ouvert: 30, soumis: 27, signe: 24, signataire: "Signé sur place : M. Duret", lignes: [["Dalle béton armé 12 cm", "m2", 12, 78]] },
  { n: 19, chantier: VEN, numero: 4, objet: "Signalétique des sorties de secours sous les préaux", canal: "courriel", auteur: "Ville de Vénissieux", statut: "signe", demande: "executee", ouvert: 33, soumis: 29, signe: 26, signataire: "Ville de Vénissieux", lignes: [["Bloc autonome d'éclairage de sécurité", "u", 6, 96]] },
  /* refusé, abandonné */
  { n: 20, chantier: ROL, numero: 3, objet: "Volet roulant motorisé sur la baie du séjour", canal: "visite", auteur: "M. et Mme Rolland", statut: "refuse", demande: "rejetee", ouvert: 22, soumis: 20, motif: "Hors budget pour cette année", lignes: [["Volet roulant motorisé 240 × 215", "u", 1, 1380]] },
  { n: 21, chantier: DUR, numero: 4, objet: "Pergola bioclimatique au-dessus de la terrasse", canal: "courriel", auteur: "M. Duret", statut: "abandonne", ouvert: 28, motif: "Le client passe par un autre fournisseur", lignes: [] },
];

function avenant(d: Def): Avenant {
  const aid = id(d.n);
  const lignes: LigneAvenant[] = d.lignes.map(([designation, unite, quantite, pu], i) => ({
    id: id(100 + d.n * 4 + i), avenant_id: aid, lot_id: null, prix_id: null, ordre: i + 1, designation, unite, quantite, sens: 1, nature: "ouvrage", origine_prix: "saisie",
    prix_unitaire_ht: pu, montant_ht: Math.round(quantite * pu * 100) / 100,
  }));
  return {
    id: aid, chantier_id: d.chantier, marche_id: null, numero: d.numero, objet: d.objet,
    origine: { canal: d.canal, auteur: d.auteur, date: aujourdHui(-d.ouvert) },
    statut: d.statut, demande_id: d.demande ? id(500 + d.n) : null, demande_statut: d.demande ?? null, piece_id: null,
    soumis_le: d.soumis !== undefined ? ilYa(d.soumis, 10) : null, signe_le: d.signe !== undefined ? aujourdHui(-d.signe) : null, signe_par: null,
    signe_libelle: d.signataire ?? null, motif: d.motif ?? null, cree_le: ilYa(d.ouvert, 15), nb_lignes: lignes.length,
    montant_ht: Math.round(lignes.reduce((s, l) => s + (l.montant_ht ?? 0), 0) * 100) / 100, lignes,
  };
}

type DefSit = {
  n: number;
  chantier: string;
  numero: number;
  statut: Situation["statut"];
  demande?: string;
  fin: number;
  echeance?: number;
  /* paiements : [jours écoulés, part du net] */
  payes?: [number, number][];
  lignes: [designation: string, base: number, avant: number, apres: number][];
};

const SITS: DefSit[] = [
  { n: 1, chantier: SCL, numero: 1, statut: "validee", demande: "executee", fin: 36, echeance: -6, payes: [[8, 1]], lignes: [["Cloisons et doublages", 18600, 0, 40], ["Électricité, première phase", 9400, 0, 25]] },
  { n: 2, chantier: SCL, numero: 2, statut: "brouillon", fin: -2, lignes: [["Cloisons et doublages", 18600, 40, 70], ["Électricité, première phase", 9400, 25, 45]] },
  { n: 3, chantier: MAM, numero: 1, statut: "validee", demande: "executee", fin: 42, echeance: -12, payes: [[15, 0.4]], lignes: [["Agencement du magasin", 26800, 0, 35], ["Plomberie du laboratoire", 7200, 0, 50]] },
  { n: 4, chantier: DUR, numero: 1, statut: "soumise", demande: "en_attente", fin: 5, lignes: [["Terrasse bois, structure", 14200, 0, 60], ["Garde-corps", 5600, 0, 0]] },
  { n: 5, chantier: VEN, numero: 1, statut: "validee", demande: "executee", fin: 64, echeance: -34, payes: [[30, 1]], lignes: [["Charpente des préaux", 48200, 0, 30], ["Couverture bac acier", 22600, 0, 10]] },
  { n: 6, chantier: VEN, numero: 2, statut: "validee", demande: "executee", fin: 33, echeance: -3, lignes: [["Charpente des préaux", 48200, 30, 65], ["Couverture bac acier", 22600, 10, 40]] },
  { n: 7, chantier: VEN, numero: 3, statut: "soumise", demande: "approuvee", fin: 3, lignes: [["Charpente des préaux", 48200, 65, 90], ["Couverture bac acier", 22600, 40, 70]] },
  { n: 8, chantier: ROL, numero: 1, statut: "annulee", fin: 12, lignes: [["Gros œuvre de l'extension", 31400, 0, 20]] },
];

function situation(d: DefSit): Situation {
  const sid = id(700 + d.n);
  const lignes: LigneSituation[] = d.lignes.map(([designation, base, avant, apres], i) => ({
    id: id(800 + d.n * 4 + i), situation_id: sid, origine: "marche", ligne_marche_id: null, ligne_avenant_id: null, avenant_numero: null, lot_id: null, ordre: i + 1,
    designation, base_ht: base, avancement: apres, precedent_avancement: avant, cumule_ht: 0, precedent_ht: 0,
  }));
  const s = recalculer({
    id: sid, chantier_id: d.chantier, marche_id: id(900 + d.n), numero: d.numero, periode_fin: aujourdHui(-d.fin), statut: d.statut,
    regime_tva: "normal", taux_tva: 0.2, autoliquidation: false, retenue_taux: 0.05, retenue_base: "ttc", retenue_caution: false,
    cumul_ht: 0, precedent_ht: 0, periode_ht: 0, tva: 0, retenue: 0, net_a_payer: 0, mentions: [],
    demande_id: d.demande ? id(600 + d.n) : null, demande_statut: d.demande ?? null,
    soumise_le: d.statut === "brouillon" ? null : ilYa(Math.max(d.fin - 2, 1), 11), validee_le: d.statut === "validee" ? ilYa(Math.max(d.fin - 5, 1), 16) : null,
    validee_libelle: d.statut === "validee" ? "Claire Morel" : null, motif: d.statut === "annulee" ? "Période trop courte, reportée au mois suivant" : null, lignes,
    echeance: d.echeance !== undefined ? aujourdHui(d.echeance) : null, penalites_taux: null, paiements: [],
  });
  return { ...s, paiements: (d.payes ?? []).map(([il, part], i) => ({ id: id(950 + d.n * 4 + i), situation_id: sid, recu_le: aujourdHui(-il), montant: Math.round(s.net_a_payer * part * 100) / 100, reference: `VIR-${2600 + d.n}` })) };
}

export const AVENANTS_PLUS: Avenant[] = DEFS.map(avenant);
export const SITUATIONS_PLUS: Situation[] = SITS.map(situation);
