/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE du référentiel du groupe (05/10/2026, session B1 ;
   30/10/2026 : /espace3 passe au « Groupe Soléa »)

   Le même monde fictif que les autres écrans de /espace3 : Groupe Soléa,
   dix-huit sociétés en six pôles, en Guadeloupe, en Martinique, en Guyane
   et au Havre. Les sociétés reprennent les identifiants d'ENTITES
   (exemples/socle.ts). Les autres identifiants commencent par 0000… :
   rien ici ne peut être confondu avec une ligne de la base, et rien d'ici
   n'est jamais écrit en base.

   Ce que l'exemple raconte, dans l'ordre du scénario (NOTES-B1.md) :
   un fournisseur d'emballages sous trois codes, deux confirmés et un
   proposé par le SIREN (lot « rattacher des codes ») ; un logisticien aux
   coordonnées bancaires différentes (lot de la direction financière, deux
   approbations) ; deux frigoristes aux noms proches (lot « probablement
   identiques ») ; Soléa Import reconnue intragroupe chez les hypermarchés ;
   un nom proposé par la direction marketing qui attend le référent.
   ══════════════════════════════════════════════════════════════════════ */

import { AGENCE, AUTO_GP, BRICO_MQ, ENTITES, EXEMPLE_CLIENT_ID, EXEMPLE_MOI, IMPORT, LAMENTIN, SIEGE, SOFIA, ilYa } from "../exemples/socle";
import type { CodeRef, Contexte, DemandeRef, Installation, Nature, Objet, Pole, Proposition, Societe } from "./types";

const U = (fin: string) => `00000000-0000-4000-8000-0000000${fin}`;

/* les sociétés du groupe, sous un nom lisible (ids d'ENTITES) */
const E = (fin: string) => ENTITES.find((e) => e.id.endsWith(fin))!.id;
export const DESTRELAND = E("e7");
export const CAYENNE = E("e8");
export const PROXI = E("e9");
export const AUTO_MQ = E("ea");
export const LOCATION = E("eb");
export const PIECES = E("ec");
export const BRICO_GP = E("ed");
export const MAISON = E("ee");
export const FROID = E("ef");
export const TRANSIT = E("f0");
export const IMMOBILIER = E("f1");
export const GESTION = E("f2");
/* l'ancien nom de la petite société « au tableur » de l'exemple : c'est
   aujourd'hui Soléa Transit, au Havre (gardé pour les imports existants) */
export const ANNECY = TRANSIT;

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

const P_DISTRIBUTION = U("0p1");
const P_AUTO = U("0p2");
const P_MAISON = U("0p3");
const P_IMPORT = U("0p4");
const P_IMMO = U("0p5");
const P_SERVICES = U("0p6");

export const POLES_EXEMPLE: Pole[] = [
  { id: P_DISTRIBUTION, client_id: EXEMPLE_CLIENT_ID, cle: "distribution", nom: "Distribution", ordre: 1, cree_le: ilYa(40) },
  { id: P_AUTO, client_id: EXEMPLE_CLIENT_ID, cle: "automobile", nom: "Automobile", ordre: 2, cree_le: ilYa(40) },
  { id: P_MAISON, client_id: EXEMPLE_CLIENT_ID, cle: "maison_bricolage", nom: "Maison & bricolage", ordre: 3, cree_le: ilYa(40) },
  { id: P_IMPORT, client_id: EXEMPLE_CLIENT_ID, cle: "import_logistique", nom: "Import & logistique", ordre: 4, cree_le: ilYa(40) },
  { id: P_IMMO, client_id: EXEMPLE_CLIENT_ID, cle: "immobilier_commercial", nom: "Immobilier commercial", ordre: 5, cree_le: ilYa(40) },
  { id: P_SERVICES, client_id: EXEMPLE_CLIENT_ID, cle: "services_siege", nom: "Services & siège", ordre: 6, cree_le: ilYa(40) },
];

const NOM_POLE: Record<string, string> = Object.fromEntries(POLES_EXEMPLE.map((p) => [p.id, p.nom]));
const TERRITOIRE = {
  GP: { territoire_iso: "GP", territoire: "guadeloupe", territoire_libelle: "Guadeloupe", fuseau: "America/Guadeloupe" },
  MQ: { territoire_iso: "MQ", territoire: "martinique", territoire_libelle: "Martinique", fuseau: "America/Martinique" },
  GF: { territoire_iso: "GF", territoire: "guyane", territoire_libelle: "Guyane", fuseau: "America/Cayenne" },
  FR: { territoire_iso: "FR", territoire: "metropole", territoire_libelle: "Métropole", fuseau: "Europe/Paris" },
} as const;
const S = (entite_id: string, siren: string, pole_id: string, t: keyof typeof TERRITOIRE, logiciel: string, nomenclature: string | null, statut_branchement: Societe["statut_branchement"]): Societe => ({
  entite_id,
  client_id: EXEMPLE_CLIENT_ID,
  nom: ENTITES.find((e) => e.id === entite_id)!.nom,
  siren,
  parent_id: entite_id === SIEGE ? null : SIEGE,
  principale: entite_id === SIEGE,
  pole_id,
  pole: NOM_POLE[pole_id],
  ...TERRITOIRE[t],
  logiciel,
  nomenclature,
  statut_branchement,
});

export const SOCIETES_EXEMPLE: Societe[] = [
  S(SIEGE, "812140517", P_SERVICES, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
  S(AGENCE, "812140525", P_DISTRIBUTION, "GP", "Cegid", "Codes fournisseurs à six chiffres", "active"),
  S(LAMENTIN, "812140533", P_DISTRIBUTION, "MQ", "Cegid", "Codes fournisseurs à six chiffres", "active"),
  S(AUTO_GP, "812140541", P_AUTO, "GP", "Logiciel de concession", "Codes à trois lettres", "observation"),
  S(IMPORT, "812140558", P_IMPORT, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
  S(BRICO_MQ, "812140566", P_MAISON, "MQ", "EBP", "Codes à trois lettres", "observation"),
  S(DESTRELAND, "812140574", P_DISTRIBUTION, "GP", "Cegid", "Codes fournisseurs à six chiffres", "active"),
  S(CAYENNE, "812140582", P_DISTRIBUTION, "GF", "Cegid", "Codes fournisseurs à six chiffres", "observation"),
  S(PROXI, "812140590", P_DISTRIBUTION, "GP", "Cegid", "Codes fournisseurs à six chiffres", "active"),
  S(AUTO_MQ, "812140608", P_AUTO, "MQ", "Logiciel de concession", "Codes à trois lettres", "observation"),
  S(LOCATION, "812140616", P_AUTO, "GP", "Quadra", null, "a_brancher"),
  S(PIECES, "812140624", P_AUTO, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
  S(BRICO_GP, "812140632", P_MAISON, "GP", "EBP", "Codes à trois lettres", "active"),
  S(MAISON, "812140640", P_MAISON, "GP", "EBP", null, "observation"),
  S(FROID, "812140657", P_IMPORT, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
  S(TRANSIT, "812140665", P_IMPORT, "FR", "Tableur", null, "a_brancher"),
  S(IMMOBILIER, "812140673", P_IMMO, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
  S(GESTION, "812140681", P_SERVICES, "GP", "Sage 100", "Plan fournisseurs du groupe", "active"),
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
  O("0f01", "fournisseur", 1, "Antilles Emballages"),
  O("0f02", "fournisseur", 2, "Karukera Logistique"),
  O("0f03", "fournisseur", 3, "Soléa Import", { intragroupe: true, intragroupe_entite_id: IMPORT }),
  O("0f04", "fournisseur", 4, "Caraïbes Froid Services"),
  O("0f05", "fournisseur", 5, "Caraibes Froid Services SARL"),
  O("0f06", "fournisseur", 6, "Transports Lubin"),
  O("0f07", "fournisseur", 7, "Caraïbes Impression", { nom_origine: "humain" }),
  O("0c01", "client", 1, "Batimat Caraïbes"),
  O("0c02", "client", 2, "Mairie de Baie-Mahault"),
  O("0c03", "client", 3, "Hôtel Les Alizés"),
  O("0a01", "article", 1, "Ciment gris CEM II 32,5 R, sac de 35 kg"),
  O("0a02", "article", 2, "Riz long grain 1 kg, carton de 12"),
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
  /* F-00001 Antilles Emballages : deux codes confirmés, un troisième proposé par le SIREN */
  { id: U("0k01"), nature: "fournisseur", entite: IMPORT, code: "F0012", nom: "ANTILLES EMBALLAGES SAS", objet: U("0f01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k02"), nature: "fournisseur", entite: AGENCE, code: "401118", nom: "Antilles Emballages", objet: U("0f01"), etat: "confirme", methode: "siren", score: 1, rattache: ilYa(27) },
  { id: U("0k03"), nature: "fournisseur", entite: LAMENTIN, code: "401732", nom: "ANTILLES EMBALL.", objet: U("0f01"), etat: "propose", methode: "siren", score: 1, rattache: ilYa(0, 6) },
  /* F-00002 Karukera Logistique : le code de Brico Soléa Guadeloupe a un autre IBAN */
  { id: U("0k04"), nature: "fournisseur", entite: IMPORT, code: "F0030", nom: "KARUKERA LOGISTIQUE", objet: U("0f02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k05"), nature: "fournisseur", entite: BRICO_GP, code: "KLO", nom: "Karukera Logistique SARL", objet: U("0f02"), etat: "propose", methode: "siren", score: 1, rattache: ilYa(0, 6) },
  /* F-00003 Soléa Import, fournisseur des hypermarchés : intragroupe */
  { id: U("0k06"), nature: "fournisseur", entite: AGENCE, code: "400001", nom: "SOLEA IMPORT", objet: U("0f03"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  /* F-00004 / F-00005 : deux frigoristes aux noms proches, sans identifiant commun */
  { id: U("0k07"), nature: "fournisseur", entite: LAMENTIN, code: "401845", nom: "CARAIBES FROID SERVICES", objet: U("0f04"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k08"), nature: "fournisseur", entite: FROID, code: "F0210", nom: "Caraïbes Froid Services SARL", objet: U("0f05"), etat: "nouveau", methode: "nouveau", rattache: ilYa(12) },
  /* F-00006 un transporteur seul, avec un SIREN à clé fausse */
  { id: U("0k09"), nature: "fournisseur", entite: TRANSIT, code: "TL01", nom: "Transports Lubin", objet: U("0f06"), etat: "nouveau", methode: "nouveau", anomalies: { siren: "clé ou format invalide" }, rattache: ilYa(0, 6) },
  /* F-00007 renommé par une personne */
  { id: U("0k10"), nature: "fournisseur", entite: SIEGE, code: "F0051", nom: "CARAIBES IMPRESSION", objet: U("0f07"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  /* clients : Batimat Caraïbes, client de trois sociétés */
  { id: U("0k11"), nature: "client", entite: IMPORT, code: "C0211", nom: "BATIMAT CARAIBES", objet: U("0c01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k12"), nature: "client", entite: PIECES, code: "BTC", nom: "Batimat Caraïbes — Jarry", objet: U("0c01"), etat: "confirme", methode: "nom_cp", score: 1, rattache: ilYa(20) },
  { id: U("0k18"), nature: "client", entite: BRICO_GP, code: "BATI", nom: "BATIMAT CARAIBES SAS", objet: U("0c01"), etat: "confirme", methode: "siren", score: 1, rattache: ilYa(20) },
  { id: U("0k13"), nature: "client", entite: BRICO_GP, code: "MBM", nom: "MAIRIE DE BAIE-MAHAULT", objet: U("0c02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k14"), nature: "client", entite: FROID, code: "C0304", nom: "Hôtel Les Alizés", objet: U("0c03"), etat: "nouveau", methode: "nouveau", rattache: ilYa(12) },
  /* articles */
  { id: U("0k15"), nature: "article", entite: BRICO_GP, code: "CIM-CEM2-35", nom: "Ciment CEM II 32,5R 35kg", objet: U("0a01"), etat: "confirme", methode: "nouveau", rattache: ilYa(28) },
  { id: U("0k16"), nature: "article", entite: BRICO_MQ, code: "CIMENT35", nom: "CIMENT GRIS CEM II 32.5 R SAC 35 KG", objet: U("0a01"), etat: "confirme", methode: "gtin", score: 1, rattache: ilYa(20) },
  { id: U("0k17"), nature: "article", entite: IMPORT, code: "RIZ-LG-1X12", nom: "Riz long grain 1kg x12", objet: U("0a02"), etat: "nouveau", methode: "nouveau", rattache: ilYa(28) },
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
  { id: U("0d01"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_codes", objet_type: "grp_referentiel", objet_id: U("0l01"), resume: "Référentiel : rattacher 1 code fournisseur, un identifiant commun le prouve.", payload: { lot: U("0l01"), nature: "fournisseur", propositions: [U("0q01")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(0, 6), decide_le: null },
  { id: U("0d02"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_iban_different", objet_type: "grp_referentiel", objet_id: U("0l02"), resume: "Référentiel : 1 fournisseur aux coordonnées bancaires différentes, à vérifier.", payload: { lot: U("0l02"), nature: "fournisseur", propositions: [U("0q02")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 2, equipe_id: U("0e02"), cree_le: ilYa(0, 6), decide_le: null },
  { id: U("0d03"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rapprocher_codes", objet_type: "grp_referentiel", objet_id: U("0l03"), resume: "Référentiel : 2 codes fournisseurs probablement identiques, à vérifier un à un.", payload: { lot: U("0l03"), nature: "fournisseur", propositions: [U("0q03")] }, demandeur_type: "systeme", demandeur_id: null, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(1, 6), decide_le: null },
  { id: U("0d04"), client_id: EXEMPLE_CLIENT_ID, entite_id: SIEGE, module: "varelo", type_action: "renommer_objet", objet_type: "grp_referentiel", objet_id: U("0q04"), resume: "Référentiel : renommer F-00007.", payload: { proposition: U("0q04"), genre: "renommer", raison: "C'est le nom employé dans les bons de commande du marketing.", saisi_par: SOFIA }, demandeur_type: "utilisateur", demandeur_id: SOFIA, statut: "en_attente", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(2, 15), decide_le: null },
  { id: U("0d05"), client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: "rattacher_codes", objet_type: "grp_referentiel", objet_id: U("0l05"), resume: "Référentiel : rattacher 3 codes fournisseurs, un identifiant commun le prouve.", payload: { lot: U("0l05"), nature: "fournisseur", propositions: [U("0q05")] }, demandeur_type: "systeme", demandeur_id: null, statut: "executee", approbations_requises: 1, equipe_id: U("0e01"), cree_le: ilYa(27, 6), decide_le: ilYa(27, 10) },
];

export const PROPOSITIONS_EXEMPLE: Proposition[] = [
  { id: U("0q01"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_codes", code_id: U("0k03"), codes: null, objet_source: null, objet_cible: U("0f01"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "538216497" }], preuves: [U("0k01"), U("0k02")], cle_paire: "c:0k03>0f01", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d01"), motif: null, decide_par: null, cree_le: ilYa(0, 6), traite_le: null },
  { id: U("0q02"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_iban_different", code_id: U("0k05"), codes: null, objet_source: null, objet_cible: U("0f02"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "441902375" }, { critere: "iban", egal: false }], preuves: [U("0k04")], cle_paire: "c:0k05>0f02", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d02"), motif: null, decide_par: null, cree_le: ilYa(0, 6), traite_le: null },
  { id: U("0q03"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "fusionner", preuve: "probable", type_action: "rapprocher_codes", code_id: null, codes: null, objet_source: U("0f05"), objet_cible: U("0f04"), nom: null, regle: "similarite", score: 0.86, raisons: [{ critere: "similarite", score: 0.86, jetons_communs: ["CARAIBES", "FROID", "SERVICES"] }], preuves: [U("0k07"), U("0k08")], cle_paire: "o:0f04|0f05", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d03"), motif: null, decide_par: null, cree_le: ilYa(1, 6), traite_le: null },
  { id: U("0q04"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "renommer", preuve: "humaine", type_action: "renommer_objet", code_id: null, codes: null, objet_source: null, objet_cible: U("0f07"), nom: "Caraïbes Impression (prospectus du groupe)", regle: "humain", score: null, raisons: [{ critere: "humain", raison: "C'est le nom employé dans les bons de commande du marketing." }], preuves: [], cle_paire: "n:0f07", empreinte: "0".repeat(64), statut: "a_valider", demande_id: U("0d04"), motif: null, decide_par: null, cree_le: ilYa(2, 15), traite_le: null },
  { id: U("0q05"), client_id: EXEMPLE_CLIENT_ID, nature: "fournisseur", genre: "placer", preuve: "sure", type_action: "rattacher_codes", code_id: U("0k02"), codes: null, objet_source: null, objet_cible: U("0f01"), nom: null, regle: "siren", score: 1, raisons: [{ critere: "siren", valeur: "538216497" }], preuves: [U("0k01")], cle_paire: "c:0k02>0f01", empreinte: "0".repeat(64), statut: "executee", demande_id: U("0d05"), motif: null, decide_par: null, cree_le: ilYa(27, 6), traite_le: ilYa(27, 10) },
];

/* la personne de l'exemple : « Vous », le CEO du groupe, membre de l'équipe du référent données */
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
