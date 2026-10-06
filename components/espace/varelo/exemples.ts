/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE du référentiel du groupe (05/10/2026, session B1)

   Le même monde fictif que les trois écrans d'A3 — « Atelier Bertin »
   devenu petit groupe : trois sociétés (le siège à Lyon, l'agence de
   Grenoble, la menuiserie d'Annecy) dans deux pôles. Les identifiants
   commencent par 0000… : rien ici ne peut être confondu avec une ligne de
   la base, et rien d'ici n'est jamais écrit en base.

   Ce que l'exemple raconte, dans l'ordre du scénario (NOTES-B1.md) :
   un fournisseur sous trois codes, deux confirmés et un proposé par le
   SIREN (lot « rattacher des codes ») ; une quincaillerie aux coordonnées
   bancaires différentes (lot de la direction financière, deux
   approbations) ; deux vernisseurs aux noms proches (lot « probablement
   identiques ») ; la menuiserie du groupe reconnue intragroupe ; un nom
   proposé par une collaboratrice qui attend le référent.
   ══════════════════════════════════════════════════════════════════════ */

import { AGENCE, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, SIEGE, SOFIA, ilYa } from "../exemples/socle";
import type { CodeRef, Contexte, DemandeRef, Installation, Nature, Objet, Pole, Proposition, Societe } from "./types";

const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;

export const ANNECY = U("00e3");

export const INSTALLATION_EXEMPLE: Installation = {
  client_id: EXEMPLE_CLIENT_ID,
  equipe_referent: "referent_donnees",
  seuil_sur: 0.97,
  seuil_probable: 0.8,
  taille_lot: 50,
  bloc_max: 300,
  iban_partage_max: 3,
  installe_le: ilYa(40),
  maj_le: ilYa(40),
};

export const POLES_EXEMPLE: Pole[] = [
  { id: U("0p1"), client_id: EXEMPLE_CLIENT_ID, cle: "agencement", nom: "Agencement", ordre: 1, cree_le: ilYa(40) },
  { id: U("0p2"), client_id: EXEMPLE_CLIENT_ID, cle: "menuiserie", nom: "Menuiserie", ordre: 2, cree_le: ilYa(40) },
];

export const SOCIETES_EXEMPLE: Societe[] = [
  { entite_id: SIEGE, client_id: EXEMPLE_CLIENT_ID, nom: "Atelier Bertin — Siège (Lyon)", siren: "849300124", parent_id: null, principale: true, pole_id: U("0p1"), pole: "Agencement", territoire_iso: "FR", territoire: "metropole", territoire_libelle: "Métropole", fuseau: "Europe/Paris", logiciel: "Sage 100", nomenclature: "Plan fournisseurs 2019", statut_branchement: "active" },
  { entite_id: AGENCE, client_id: EXEMPLE_CLIENT_ID, nom: "Atelier Bertin — Agence de Grenoble", siren: "849300132", parent_id: SIEGE, principale: false, pole_id: U("0p1"), pole: "Agencement", territoire_iso: "FR", territoire: "metropole", territoire_libelle: "Métropole", fuseau: "Europe/Paris", logiciel: "EBP Gestion", nomenclature: "Codes à trois lettres", statut_branchement: "observation" },
  { entite_id: ANNECY, client_id: EXEMPLE_CLIENT_ID, nom: "Bertin Menuiserie (Annecy)", siren: "849300140", parent_id: SIEGE, principale: false, pole_id: U("0p2"), pole: "Menuiserie", territoire_iso: "FR", territoire: "metropole", territoire_libelle: "Métropole", fuseau: "Europe/Paris", logiciel: "Tableur", nomenclature: null, statut_branchement: "a_brancher" },
];

const O = (fin: string, nature: Nature, numero: number, nom: string, extra: Partial<Objet> = {}): Objet => ({
  id: U(fin),
  client_id: EXEMPLE_CLIENT_ID,
  nature,
  numero,
  code_groupe: `${nature === "client" ? "C" : nature === "fournisseur" ? "F" : nature === "article" ? "A" : "S"}-${String(numero).padStart(5, "0")}`,
  nom_groupe: nom,
  nom_origine: "auto",
  intragroupe: false,
  intragroupe_entite_id: null,
  entite_id: null,
  statut: "actif",
  fusionne_dans: null,
  cree_le: ilYa(30),
  maj_le: ilYa(1),
  ...extra,
});

export const OBJETS_EXEMPLE: Objet[] = [
  O("0f01", "fournisseur", 1, "Scieries du Jura"),
  O("0f02", "fournisseur", 2, "Quincaillerie Rhône-Alpes"),
  O("0f03", "fournisseur", 3, "Bertin Menuiserie", { intragroupe: true, intragroupe_entite_id: ANNECY }),
  O("0f04", "fournisseur", 4, "Vernis Lacroix"),
  O("0f05", "fournisseur", 5, "Lacroix Vernis et Peintures"),
  O("0f06", "fournisseur", 6, "Transports Deschamps"),
  O("0f07", "fournisseur", 7, "Papeterie du Rhône", { nom_origine: "humain" }),
  O("0c01", "client", 1, "Hôtel des Alpes"),
  O("0c02", "client", 2, "Mairie de Vienne"),
  O("0c03", "client", 3, "Groupe Hôtelier Savoie"),
  O("0a01", "article", 1, "Panneau MDF 19 mm 2800 × 2070"),
  O("0a02", "article", 2, "Vis bois 4 × 40 inox"),
];

type CodeBrut = {
  id: string;
  nature: Nature;
  entite: string;
  code: string;
  nom: string;
  objet: string | null;
  etat: CodeRef["etat"];
  methode: CodeRef["methode"];
  score?: number | null;
  anomalies?: Record<string, string>;
  rattache?: string | null;
};

const SOC = (id: string) => SOCIETES_EXEMPLE.find((s) => s.entite_id === id)!;

const BRUTS: CodeBrut[] = [
  /* F-00001 Scieries du Jura : deux codes confirmés, un troisième proposé par le SIREN */
  { id: U("0k01"), nature: "fournisseur", entite: SIEGE, code: "F0012", nom: "SCIERIES DU JURA SAS", objet: U("0f01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k02"), nature: "fournisseur", entite: AGENCE, code: "SCJ", nom: "Scieries du Jura", objet: U("0f01"), etat: "confirme", methode: "siren", score: 1, rattache: ilYa(27) },
  { id: U("0k03"), nature: "fournisseur", entite: ANNECY, code: "4471", nom: "SCIERIE JURA", objet: U("0f01"), etat: "propose", methode: "siren", score: 1, rattache: ilYa(0, 6) },
  /* F-00002 Quincaillerie Rhône-Alpes : le code de Grenoble a un autre IBAN */
  { id: U("0k04"), nature: "fournisseur", entite: SIEGE, code: "F0030", nom: "QUINCAILLERIE RHONE-ALPES", objet: U("0f02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k05"), nature: "fournisseur", entite: AGENCE, code: "QRA", nom: "Quincaillerie Rhône Alpes SARL", objet: U("0f02"), etat: "propose", methode: "siren", score: 1, rattache: ilYa(0, 6) },
  /* F-00003 la menuiserie du groupe, fournisseur du siège : intragroupe */
  { id: U("0k06"), nature: "fournisseur", entite: SIEGE, code: "F0099", nom: "BERTIN MENUISERIE", objet: U("0f03"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  /* F-00004 / F-00005 : deux vernisseurs aux noms proches, sans identifiant commun */
  { id: U("0k07"), nature: "fournisseur", entite: SIEGE, code: "F0045", nom: "VERNIS LACROIX", objet: U("0f04"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k08"), nature: "fournisseur", entite: AGENCE, code: "LVP", nom: "Lacroix Vernis & Peintures", objet: U("0f05"), etat: "nouveau", methode: "nouveau", rattache: ilYa(12) },
  /* F-00006 un transporteur seul, avec un SIREN à clé fausse */
  { id: U("0k09"), nature: "fournisseur", entite: ANNECY, code: "TD01", nom: "Transports Deschamps", objet: U("0f06"), etat: "nouveau", methode: "nouveau", anomalies: { siren: "clé ou format invalide" }, rattache: ilYa(0, 6) },
  /* F-00007 renommé par une personne */
  { id: U("0k10"), nature: "fournisseur", entite: SIEGE, code: "F0051", nom: "PAPETERIE DU RHONE", objet: U("0f07"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  /* clients */
  { id: U("0k11"), nature: "client", entite: SIEGE, code: "C0211", nom: "HOTEL DES ALPES", objet: U("0c01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k12"), nature: "client", entite: ANNECY, code: "HDA", nom: "Hôtel des Alpes — Annecy", objet: U("0c01"), etat: "confirme", methode: "nom_cp", score: 1, rattache: ilYa(20) },
  { id: U("0k13"), nature: "client", entite: SIEGE, code: "C0304", nom: "MAIRIE DE VIENNE", objet: U("0c02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k14"), nature: "client", entite: AGENCE, code: "GHS", nom: "Groupe Hôtelier Savoie", objet: U("0c03"), etat: "nouveau", methode: "nouveau", rattache: ilYa(12) },
  /* articles */
  { id: U("0k15"), nature: "article", entite: SIEGE, code: "MDF19-2800", nom: "Panneau MDF 19 mm 2800x2070", objet: U("0a01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k16"), nature: "article", entite: ANNECY, code: "PAN-MDF-19", nom: "PANNEAU MDF 19MM 2800 X 2070", objet: U("0a01"), etat: "confirme", methode: "gtin", score: 1, rattache: ilYa(20) },
  { id: U("0k17"), nature: "article", entite: SIEGE, code: "VIS4X40", nom: "Vis bois 4x40 inox", objet: U("0a02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
];

export const CODES_EXEMPLE: CodeRef[] = BRUTS.map((b) => {
  const o = OBJETS_EXEMPLE.find((x) => x.id === b.objet) ?? null;
  return {
    code_id: b.id,
    client_id: EXEMPLE_CLIENT_ID,
    nature: b.nature,
    entite_id: b.entite,
    societe: SOC(b.entite).nom,
    code_local: b.code,
    nom_local: b.nom,
    objet_id: o?.id ?? null,
    code_groupe: o?.code_groupe ?? null,
    nom_groupe: o?.nom_groupe ?? null,
    intragroupe: o?.intragroupe ?? null,
    etat: b.etat,
    methode: b.methode,
    score: b.score ?? null,
    actif: true,
    anomalies: b.anomalies ?? {},
    rattache_le: b.rattache ?? null,
  };
});

/* ——— les lots et les demandes ——— */
export const DEMANDES_EXEMPLE: DemandeRef[] = [
  { id: U("0d01"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_codes", objet_type: "grp_referentiel", objet_id: U("0l01"), resume: "Référentiel : rattacher 1 codes fournisseurs, un identifiant commun le prouve.", payload: { lot: U("0l01"), nature: "fournisseur", propositions: [U("0q01")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(0, 6), decide_le: null },
  { id: U("0d02"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_iban_different", objet_type: "grp_referentiel", objet_id: U("0l02"), resume: "Référentiel : 1 fournisseurs aux coordonnées bancaires différentes, à vérifier.", payload: { lot: U("0l02"), nature: "fournisseur", propositions: [U("0q02")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 2, equipe_id: U("0e02"), cree_le: ilYa(0, 6), decide_le: null },
  { id: U("0d03"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rapprocher_codes", objet_type: "grp_referentiel", objet_id: U("0l03"), resume: "Référentiel : 1 codes fournisseurs probablement identiques, à vérifier un à un.", payload: { lot: U("0l03"), nature: "fournisseur", propositions: [U("0q03")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(1, 6), decide_le: null },
  { id: U("0d04"), client_id: EXEMPLE_CLIENT_ID, entite_id: SIEGE, module: "varelo", type_action: "renommer_objet", objet_type: "grp_referentiel", objet_id: U("0q04"), resume: "Référentiel : renommer F-00007.", payload: { proposition: U("0q04"), genre: "renommer", raison: "C'est le nom qu'on emploie dans les devis.", saisi_par: SOFIA }, demandeur_type: "utilisateur", demandeur_id: SOFIA, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(2, 15), decide_le: null },
  { id: U("0d05"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_codes", objet_type: "grp_referentiel", objet_id: U("0l05"), resume: "Référentiel : rattacher 3 codes fournisseurs, un identifiant commun le prouve.", payload: { lot: U("0l05"), nature: "fournisseur", propositions: [U("0q05")] }, demandeur_type: "systeme", demandeur_id: null, statut: "executee", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(27, 6), decide_le: ilYa(27, 10) },
];

export const PROPOSITIONS_EXEMPLE: Proposition[] = [
  { id: U("0q01"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_codes", code_id: U("0k03"), codes: null, objet_source: null, objet_cible: U("0f01"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "849300124" }], preuves: [U("0k01"), U("0k02")], cle_paire: "c:0k03>0f01", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d01"), motif: null, decide_par: null, cree_le: ilYa(0, 6), traite_le: null },
  { id: U("0q02"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_iban_different", code_id: U("0k05"), codes: null, objet_source: null, objet_cible: U("0f02"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "849300132" }, { critere: "iban", egal: false }], preuves: [U("0k04")], cle_paire: "c:0k05>0f02", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d02"), motif: null, decide_par: null, cree_le: ilYa(0, 6), traite_le: null },
  { id: U("0q03"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "fusionner", preuve: "probable", type_action: "rapprocher_codes", code_id: null, codes: null, objet_source: U("0f05"), objet_cible: U("0f04"), nom: null, regle: "similarite", score: 0.86, raisons: [{ critere: "similarite", score: 0.86, jetons_communs: ["LACROIX", "VERNIS"] }], preuves: [U("0k07"), U("0k08")], cle_paire: "o:0f04|0f05", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d03"), motif: null, decide_par: null, cree_le: ilYa(1, 6), traite_le: null },
  { id: U("0q04"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "renommer", preuve: "humaine", type_action: "renommer_objet", code_id: null, codes: null, objet_source: null, objet_cible: U("0f07"), nom: "Papeterie du Rhône (Lyon)", regle: "humain", score: null, raisons: [{ critere: "humain", raison: "C'est le nom qu'on emploie dans les devis." }], preuves: [], cle_paire: "n:0f07", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d04"), motif: null, decide_par: null, cree_le: ilYa(2, 15), traite_le: null },
  { id: U("0q05"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_codes", code_id: U("0k02"), codes: null, objet_source: null, objet_cible: U("0f01"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "849300124" }], preuves: [U("0k01")], cle_paire: "c:0k02>0f01", empreinte: "0".repeat(64), statut: "executee", demande_id: U("0d05"), motif: null, decide_par: null, cree_le: ilYa(27, 6), traite_le: ilYa(27, 10) },
];

/* la personne de l'exemple : « Vous », valideur, membre de l'équipe du référent données */
export const CONTEXTE_EXEMPLE: Contexte = {
  user_id: EXEMPLE_MOI,
  client_id: EXEMPLE_CLIENT_ID,
  role: "gerant",
  perimetre_total: true,
  equipes: ["referent_donnees", "dsi"],
  noms_equipes: {
    [U("0e01")]: { cle: "referent_donnees", nom: "Référent données" },
    [U("0e02")]: { cle: "direction_financiere", nom: "Direction financière" },
  },
  entites: SOCIETES_EXEMPLE.map((s) => ({ id: s.entite_id, nom: s.nom, principale: s.principale })),
};
