/* ══════════════════════════════════════════════════════════════════════
   Le monde d'EXEMPLE de l'écran Tamila (05/10/2026, session B4)

   Un cabinet fictif, « Delorme & Associés » (Paris, 5 personnes), six
   dossiers d'appel à des états différents. Les identifiants commencent
   par 0000… : rien ici ne peut être confondu avec une ligne de la base,
   et rien d'ici n'est jamais écrit en base. Les dates sont relatives au
   jour de la visite (dans / ilYa) pour que l'urgence reste lisible.

   Les chiffrés d'exemple sont des bytea factices au format du socle
   (01 ‖ 28 octets) : le clair est donné à côté, comme le ferait le
   déballage de la clé dans le navigateur.
   ══════════════════════════════════════════════════════════════════════ */

import { dans, ilYa } from "../exemples/socle";
import type { Audience, CalculDelai, Conformite, Delai, Dossier, DossierComplet, Export, Honoraires, Membre, Partie, Personne, Piece, RegleProcedure, Reglages } from "./types";

export const EXEMPLE_CLIENT = "00000000-0000-4000-8000-00000000000b";
export const EXEMPLE_ENTITE = "00000000-0000-4000-8000-0000000000e1";

export const MOI = "00000000-0000-4000-8000-0000000000b1";
export const HADDAD = "00000000-0000-4000-8000-0000000000b2";
export const ROUSSEAU = "00000000-0000-4000-8000-0000000000b3";
export const BENALI = "00000000-0000-4000-8000-0000000000b4";
export const MARCHAND = "00000000-0000-4000-8000-0000000000b5";

export const PERSONNES_EXEMPLE: Personne[] = [
  { user_id: MOI, role: "gerant", nom: "Me Claire Delorme (vous)" },
  { user_id: HADDAD, role: "admin", nom: "Me Karim Haddad" },
  { user_id: ROUSSEAU, role: "valideur", nom: "Me Julie Rousseau" },
  { user_id: BENALI, role: "collaborateur", nom: "Nadia Benali" },
  { user_id: MARCHAND, role: "lecteur", nom: "Théo Marchand" },
];

export const REGLAGES_EXEMPLE: Reglages = { id: "00000000-0000-4000-8000-0000000000r1", client_id: EXEMPLE_CLIENT, delai_cloture_jours: 7, conservation_audit_jours: 30, conservation_exports_jours: 7, maj_le: ilYa(40) };

/* Les règles de procédure telles que le socle les porte (tamila_regles_procedure) — l'exemple en montre quatre du régime cpc. */
export const REGLES_EXEMPLE: RegleProcedure[] = [
  { code: "tamila.cpc.908", regime: "cpc", evenement: "declaration_appel", procedures: ["a_orienter", "mise_en_etat"], partie: "appelant", acte: "conclure", augmentable: true, interruptible: true, sanction: "caducite", article: "908", libelle_court: "Conclusions de l'appelant" },
  { code: "tamila.cpc.902", regime: "cpc", evenement: "avis_signifier_declaration", procedures: ["a_orienter", "mise_en_etat"], partie: "appelant", acte: "signifier_declaration", augmentable: true, interruptible: false, sanction: "caducite", article: "902", libelle_court: "Signification de la déclaration d'appel" },
  { code: "tamila.cpc.909", regime: "cpc", evenement: "notification_conclusions_appelant", procedures: ["a_orienter", "mise_en_etat"], partie: "intime", acte: "conclure", augmentable: true, interruptible: true, sanction: "irrecevabilite", article: "909", libelle_court: "Conclusions de l'intimé" },
  { code: "tamila.cpc.906-2.appelant", regime: "cpc", evenement: "avis_fixation_bref_delai", procedures: ["bref_delai"], partie: "appelant", acte: "conclure", augmentable: true, interruptible: false, sanction: "caducite", article: "906-2", libelle_court: "Conclusions de l'appelant à bref délai" },
];

const C = EXEMPLE_CLIENT;
const u = (p: string, n: number) => `00000000-0000-4000-8000-00000000${p}${n.toString(16).padStart(2, "0")}`;
const CHIFFRE = "\\x01" + "00".repeat(28);
const jour = (iso: string) => iso.slice(0, 10);

function dossier(n: number, x: Partial<Dossier> & Pick<Dossier, "statut">): Dossier {
  return {
    id: u("d", n), client_id: C, entite_id: EXEMPLE_ENTITE, reference_chiffree: CHIFFRE, intitule_chiffre: CHIFFRE, numero_rg_chiffre: CHIFFRE,
    matiere: null, juridiction: "Cour d'appel de Paris", territoire: "metropole", mode: "contentieux", perso: false, proprietaire_perso: null,
    responsable_id: MOI, cree_le: ilYa(30), cree_par: MOI, demande_ouverture_id: null, ouvert_le: ilYa(30), ouvert_par: MOI, audit_fin_le: null,
    clos_le: null, demande_cloture_id: null, statut_avant_cloture: null, effacement_prevu_le: null, efface_le: null, motif_effacement: null, ...x,
  };
}

function membre(d: string, n: number, user_id: string, role_dossier: Membre["role_dossier"], jusqu_au: string | null = null): Membre {
  return { id: `${d}-m${n}`, client_id: C, dossier_id: d, user_id, role_dossier, jusqu_au, ajoute_par: MOI, ajoute_le: ilYa(30) };
}

function partie(d: string, n: number, qualite: Partie["qualite"], residence: Partie["residence"], role_procedure: Partie["role_procedure"] = null): Partie {
  return { id: `${d}-p${n}`, client_id: C, dossier_id: d, nom_chiffre: CHIFFRE, qualite, role_procedure, residence, courriels_chiffres: null, cree_le: ilYa(30), cree_par: MOI };
}

/* Le calcul rendu par tamila_calculer_delai pour le délai de l'art. 908 du premier dossier. */
function calcul908(depart: string, brute: string, echeance: string, mois: 0 | 1): CalculDelai {
  return {
    echeance, brute, base: brute, regle: "tamila.cpc.908", version: 1, regime: "cpc", article: "908", acte: "conclure", sanction: "caducite",
    libelle: "Conclusions de l'appelant (CPC, art. 908)", source: "Code de procédure civile, art. 908", source_url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048597183",
    territoire: "metropole", residence: mois ? "guadeloupe" : "metropole", depart, augmentation_mois: mois,
    motif_augmentation: mois ? "outre_mer_devant_metropole" : "aucune",
    source_augmentation: mois ? "Augmentation d'un mois (art. 915-4 : partie demeurant outre-mer devant une juridiction de métropole)." : null,
    raisons: [], alternatives: [],
    detail: mois
      ? `3 mois à compter du ${depart} (CPC, art. 908), augmentés d'un mois (partie demeurant outre-mer devant une juridiction de métropole, art. 915-4) : ${brute}${brute !== echeance ? `, prorogé au ${echeance} (art. 642)` : ""}.`
      : `3 mois à compter du ${depart} (CPC, art. 908) : ${brute}${brute !== echeance ? `, prorogé au ${echeance} (art. 642)` : ""}.`,
  };
}

function delai(d: string, n: number, x: Partial<Delai> & Pick<Delai, "acte" | "echeance_retenue" | "statut">): Delai {
  return {
    id: `${d}-t${n}`, client_id: C, dossier_id: d, appel_id: `${d}-a`, avis_id: null, delai_id: `${d}-b5-${n}`, nature: "regle", regle_code: "tamila.cpc.908", regle_version: 1,
    depart: null, territoire: "metropole", residence: "metropole", augmentation_mois: 0, motif_augmentation: "aucune", echeance_calculee: x.echeance_retenue, raisons: [], calcul: null,
    source_date: null, demande_id: null, confirme_par: null, confirme_le: null, confirmation: null, motif_correction: null, responsable_id: MOI, interrompu_le: null,
    motif_interruption: null, acte_depose_le: null, motif_cloture: null, preuve_piece_id: null, clos_par: null, clos_le: null, motif_annulation: null, annule_par: null,
    annule_le: null, depasse_le: null, relance_48h_le: null, relance_j8_le: null, cree_le: ilYa(20), maj_le: ilYa(20), ...x,
  };
}

function audience(d: string, n: number, x: Partial<Audience> & Pick<Audience, "date_heure" | "nature">): Audience {
  return { id: `${d}-au${n}`, client_id: C, dossier_id: d, avis_id: null, heure_connue: true, juridiction: "Cour d'appel de Paris", chambre: "Pôle 4 – chambre 5", avocat_id: ROUSSEAU, statut: "prevue", renvoyee_a: null, source: "saisie", cree_le: ilYa(15), ...x };
}

function exportDe(d: string, n: number, x: Partial<Export> & Pick<Export, "statut">): Export {
  return { id: `${d}-x${n}`, client_id: C, dossier_id: d, demande_par: MOI, chemin: null, octets: null, empreinte_manifeste: null, motif_echec: null, cree_le: ilYa(2), pret_le: null, expire_le: null, telecharge_le: null, telechargements: 0, purge_le: null, ...x };
}

function piece(d: string, n: number, nom: string, type_piece: string | null, statut: Piece["statut"], recue: string): Piece {
  return { id: `${d}-pc${n}`, client_id: C, objet_id: d, nom_fichier: nom, mime: "application/pdf", octets: 180_000 + n * 1000, sha256: n.toString(16).padStart(64, "0"), chemin: `${C}/tamila_dossier/${d}/${nom}.chiffre`, statut, type_piece, nb_pages: null, chiffrement: "dossier:v1", depose_par: ROUSSEAU, recue_le: recue, motif: statut === "echec" ? "CHIFFREMENT_NON_PRIS_EN_CHARGE" : null };
}

/* ——— les six dossiers ——— */

const D1 = u("d", 1);
const D2 = u("d", 2);
const D3 = u("d", 3);
const D4 = u("d", 4);
const D5 = u("d", 5);
const D6 = u("d", 6);

const depart1 = jour(ilYa(20));
const brute1 = jour(dans(102)); /* trois mois + un mois après le départ, environ */
const echeance1 = jour(dans(102));

export const DOSSIERS_EXEMPLE: DossierComplet[] = [
  {
    dossier: dossier(1, { statut: "ouvert", matiere: "construction", cree_le: ilYa(24), ouvert_le: ilYa(24) }),
    clair: { reference: "2026-0412", intitule: "SCI du Moulin c/ Bâti-Sud", numero_rg: "26/01234" },
    cle: { id: `${D1}-k`, client_id: C, dossier_id: D1, fournisseur: "local", reference: `cabinet:${C}:${D1}`, enveloppe: "\\x01" + "00".repeat(76), algorithme: "aes-256-gcm", statut: "active", creee_le: ilYa(24), desactivee_le: null, destruction_prevue_le: null, detruite_le: null },
    parties: [partie(D1, 1, "client", "guadeloupe", "appelant"), partie(D1, 2, "adverse", "metropole", "intime"), partie(D1, 3, "confrere_adverse", "metropole")],
    partiesClair: { [`${D1}-p1`]: { nom: "SCI du Moulin", courriels: "gerance@scidumoulin.example" }, [`${D1}-p2`]: { nom: "Bâti-Sud SAS", courriels: null }, [`${D1}-p3`]: { nom: "Me Lenoir (Paris)", courriels: null } },
    appel: { id: `${D1}-a`, client_id: C, dossier_id: D1, introduit_le: depart1, regime: "cpc", procedure: "mise_en_etat", role_client: "appelant", territoire: "metropole", cloture_previsible_le: jour(dans(140)), cree_le: ilYa(20), maj_le: ilYa(3) },
    delais: [
      delai(D1, 1, { acte: "conclure", depart: depart1, residence: "guadeloupe", augmentation_mois: 1, motif_augmentation: "outre_mer_devant_metropole", echeance_calculee: echeance1, echeance_retenue: echeance1, statut: "a_confirmer", demande_id: `${D1}-dem1`, calcul: calcul908(depart1, brute1, echeance1, 1), cree_le: ilYa(20) }),
      delai(D1, 2, { acte: "signifier_declaration", regle_code: "tamila.cpc.902", depart: jour(ilYa(12)), residence: "guadeloupe", augmentation_mois: 1, motif_augmentation: "outre_mer_devant_metropole", echeance_retenue: jour(dans(49)), statut: "confirme", confirme_par: ROUSSEAU, confirme_le: ilYa(10), confirmation: "approbation", cree_le: ilYa(12) }),
      delai(D1, 3, { nature: "date_fixee", regle_code: null, regle_version: null, acte: "autre", echeance_calculee: null, echeance_retenue: jour(dans(70)), statut: "confirme", source_date: "ordonnance", confirme_par: MOI, confirme_le: ilYa(3), confirmation: "saisie", avis_id: `${D1}-av1`, cree_le: ilYa(3) }),
    ],
    audiences: [
      audience(D1, 1, { date_heure: dans(38, 14), nature: "mise_en_etat", statut: "renvoyee", renvoyee_a: `${D1}-au2` }),
      audience(D1, 2, { date_heure: dans(73, 14), nature: "mise_en_etat" }),
    ],
    avis: [
      { id: `${D1}-av1`, client_id: C, dossier_id: D1, piece_id: `${D1}-pc1`, type_avis: "rpva_ordonnance_mee", date_avis: jour(ilYa(3)), date_audience: null, heure_audience_connue: null, date_cloture_previsible: jour(dans(140)), date_limite: jour(dans(70)), partie_visee: null, rang: null, depose_le: null, confiance: "saisie", rg_concorde: true, statut: "applique", effet: "delais_poses", cree_le: ilYa(3) },
    ],
    membres: [membre(D1, 1, MOI, "responsable"), membre(D1, 2, ROUSSEAU, "intervenant"), membre(D1, 3, MARCHAND, "lecteur", dans(25))],
    murailles: [],
    exports: [exportDe(D1, 1, { statut: "pret", chemin: `${C}/tamila_dossier/${D1}/exports/${D1}-x1.zip`, octets: 18_432_112, empreinte_manifeste: "f".repeat(64), pret_le: ilYa(2), expire_le: dans(5), telechargements: 1, telecharge_le: ilYa(1) })],
    pieces: [piece(D1, 1, "ordonnance-cme.pdf", "rpva_ordonnance_mee", "recue", ilYa(3)), piece(D1, 2, "conclusions-adverses.pdf", "conclusions", "recue", ilYa(6)), piece(D1, 3, "declaration-appel.pdf", "rpva_declaration_appel", "recue", ilYa(20))],
    lectures: [{ user_id: ROUSSEAU, lu_le: ilYa(1, 17), contexte: "dossier" }, { user_id: MOI, lu_le: ilYa(2, 9), contexte: "export" }, { user_id: MARCHAND, lu_le: ilYa(4, 11), contexte: "dossier" }],
    demandes: [{ id: `${D1}-dem1`, type_action: "confirmer_delai", objet_id: D1, resume: `Confirmer un délai de procédure : CPC, art. 908, échéance le ${echeance1.split("-").reverse().join("/")}`, payload: { delai_id: `${D1}-t1`, echeance: echeance1, regle: "tamila.cpc.908" }, statut: "en_attente", cree_le: ilYa(20), roles_autorises: ["gerant", "admin", "valideur"] }],
    consulteJusqu: dans(0, 23),
  },
  {
    dossier: dossier(2, { statut: "ouvert", matiere: "corporel", mode: "dommage_corporel", juridiction: "Cour d'appel de Rennes", responsable_id: ROUSSEAU, cree_le: ilYa(60), ouvert_le: ilYa(60) }),
    clair: { reference: "2026-0398", intitule: "Lefèvre c/ Mutuelle Atlantique", numero_rg: "26/00871" },
    cle: null,
    parties: [partie(D2, 1, "client", "metropole", "intime"), partie(D2, 2, "adverse", "metropole", "appelant"), partie(D2, 3, "expert", "metropole")],
    partiesClair: { [`${D2}-p1`]: { nom: "M. Paul Lefèvre", courriels: null }, [`${D2}-p2`]: { nom: "Mutuelle Atlantique", courriels: null }, [`${D2}-p3`]: { nom: "Dr Anne Collet, expert", courriels: null } },
    appel: { id: `${D2}-a`, client_id: C, dossier_id: D2, introduit_le: jour(ilYa(55)), regime: "cpc", procedure: "mise_en_etat", role_client: "intime", territoire: "metropole", cloture_previsible_le: null, cree_le: ilYa(55), maj_le: ilYa(30) },
    delais: [
      delai(D2, 1, { acte: "conclure", regle_code: "tamila.cpc.909", depart: jour(ilYa(50)), echeance_retenue: jour(dans(14)), statut: "confirme", confirme_par: ROUSSEAU, confirme_le: ilYa(48), confirmation: "approbation", responsable_id: ROUSSEAU }),
    ],
    audiences: [audience(D2, 1, { date_heure: dans(122, 9), nature: "plaidoiries", juridiction: "Cour d'appel de Rennes", chambre: "1re chambre", source: "avis" })],
    avis: [],
    membres: [membre(D2, 1, ROUSSEAU, "responsable"), membre(D2, 2, BENALI, "intervenant")],
    murailles: [],
    exports: [],
    pieces: [],
    lectures: [{ user_id: ROUSSEAU, lu_le: ilYa(0, 8), contexte: "dossier" }],
    demandes: [],
    consulteJusqu: null,
  },
  {
    dossier: dossier(3, { statut: "ouvert", matiere: "copropriete", juridiction: "Cour d'appel de Versailles", cree_le: ilYa(90), ouvert_le: ilYa(90) }),
    clair: { reference: "2026-0377", intitule: "Syndicat des copropriétaires Les Tilleuls c/ Vinceo", numero_rg: "26/00412" },
    cle: null,
    parties: [partie(D3, 1, "client", "metropole", "appelant"), partie(D3, 2, "adverse", "etranger", "intime")],
    partiesClair: { [`${D3}-p1`]: { nom: "SDC Les Tilleuls", courriels: null }, [`${D3}-p2`]: { nom: "Vinceo GmbH", courriels: null } },
    appel: { id: `${D3}-a`, client_id: C, dossier_id: D3, introduit_le: jour(ilYa(85)), regime: "cpc", procedure: "a_orienter", role_client: "appelant", territoire: "metropole", cloture_previsible_le: null, cree_le: ilYa(85), maj_le: ilYa(85) },
    delais: [
      delai(D3, 1, { acte: "conclure", depart: jour(ilYa(85)), echeance_retenue: jour(dans(6)), statut: "a_confirmer", demande_id: `${D3}-dem1`, raisons: ["rang_a_verifier"], relance_48h_le: ilYa(80), relance_j8_le: ilYa(1), cree_le: ilYa(85) }),
      delai(D3, 2, { nature: "date_fixee", regle_code: null, regle_version: null, acte: "signifier_conclusions", echeance_calculee: null, echeance_retenue: jour(ilYa(4)), statut: "clos", source_date: "saisie", confirme_par: MOI, confirme_le: ilYa(30), confirmation: "saisie", acte_depose_le: jour(ilYa(5)), motif_cloture: "accuse_rpva", preuve_piece_id: `${D3}-pc2`, clos_par: MOI, clos_le: ilYa(5), cree_le: ilYa(30) }),
    ],
    audiences: [],
    avis: [{ id: `${D3}-av1`, client_id: C, dossier_id: D3, piece_id: `${D3}-pc2`, type_avis: "rpva_accuse_depot", date_avis: jour(ilYa(5)), date_audience: null, heure_audience_connue: null, date_cloture_previsible: null, date_limite: null, partie_visee: null, rang: null, depose_le: ilYa(5, 16), confiance: "gabarit", rg_concorde: true, statut: "applique", effet: "delai_clos", cree_le: ilYa(5) }],
    membres: [membre(D3, 1, MOI, "responsable"), membre(D3, 2, BENALI, "intervenant")],
    murailles: [{ id: `${D3}-mu1`, client_id: C, dossier_id: D3, user_id: HADDAD, motif_chiffre: CHIFFRE, pose_par: MOI, pose_le: ilYa(88), leve_le: null, leve_par: null, demande_levee_id: null }],
    exports: [],
    pieces: [piece(D3, 1, "accuse-depot-conclusions.pdf", "rpva_accuse_depot", "recue", ilYa(5))],
    lectures: [{ user_id: MOI, lu_le: ilYa(1, 18), contexte: "dossier" }],
    demandes: [{ id: `${D3}-dem1`, type_action: "confirmer_delai", objet_id: D3, resume: "Confirmer un délai de procédure : CPC, art. 908", payload: { delai_id: `${D3}-t1` }, statut: "en_attente", cree_le: ilYa(85), roles_autorises: ["gerant", "admin", "valideur"] }],
    consulteJusqu: null,
  },
  {
    dossier: dossier(4, { statut: "clos", matiere: "successions", juridiction: "Cour d'appel de Paris", cree_le: ilYa(400), ouvert_le: ilYa(400), clos_le: ilYa(2), demande_cloture_id: `${D4}-dem1`, statut_avant_cloture: "ouvert", effacement_prevu_le: dans(5, 3) }),
    clair: { reference: "2025-0291", intitule: "Succession Morvan", numero_rg: "25/03310" },
    cle: null,
    parties: [partie(D4, 1, "client", "metropole", "intime")],
    partiesClair: { [`${D4}-p1`]: { nom: "Consorts Morvan", courriels: null } },
    appel: null, delais: [], audiences: [], avis: [],
    membres: [membre(D4, 1, MOI, "responsable")],
    murailles: [],
    exports: [exportDe(D4, 1, { statut: "pret", chemin: `${C}/tamila_dossier/${D4}/exports/${D4}-x1.zip`, octets: 61_204_990, empreinte_manifeste: "a".repeat(64), pret_le: ilYa(2), expire_le: dans(5), telechargements: 2, telecharge_le: ilYa(1) })],
    pieces: [],
    lectures: [{ user_id: MOI, lu_le: ilYa(2, 10), contexte: "export" }],
    demandes: [],
    consulteJusqu: null,
  },
  {
    dossier: dossier(5, { statut: "attente", matiere: "baux", juridiction: "Cour d'appel de Lyon", responsable_id: ROUSSEAU, cree_le: ilYa(1), cree_par: BENALI, ouvert_le: null, ouvert_par: null, demande_ouverture_id: `${D5}-dem1` }),
    clair: { reference: "2026-0430", intitule: "Garnier c/ SCI du Moulin", numero_rg: null },
    cle: null,
    /* le cas d'école du contrôle des conflits : l'adversaire est client du cabinet dans 2026-0412 */
    parties: [partie(D5, 1, "client", "metropole"), partie(D5, 2, "adverse", "metropole")],
    partiesClair: { [`${D5}-p1`]: { nom: "M. Jean Garnier", courriels: null }, [`${D5}-p2`]: { nom: "Moulin (SCI du)", courriels: null } },
    appel: null, delais: [], audiences: [], avis: [],
    membres: [membre(D5, 1, ROUSSEAU, "responsable"), membre(D5, 2, BENALI, "intervenant")],
    murailles: [], exports: [], pieces: [piece(D5, 1, "bail-commercial.pdf", null, "a_rattacher", ilYa(1))], lectures: [],
    demandes: [{ id: `${D5}-dem1`, type_action: "ouvrir_dossier", objet_id: D5, resume: "Ouverture d'un dossier à la lecture", payload: { initiateur: BENALI, responsable: ROUSSEAU }, statut: "en_attente", cree_le: ilYa(1), roles_autorises: ["gerant", "admin", "valideur"] }],
    consulteJusqu: null,
  },
  {
    dossier: dossier(6, { statut: "audit", matiere: "corporel", mode: "dommage_corporel", juridiction: "Cour d'appel de Basse-Terre", territoire: "guadeloupe", cree_le: ilYa(10), ouvert_le: ilYa(10), audit_fin_le: dans(20), effacement_prevu_le: dans(50, 3) }),
    clair: { reference: "AUDIT-2026-03", intitule: "Dossier d'audit (dommage corporel, plaidé)", numero_rg: null },
    cle: null,
    parties: [partie(D6, 1, "client", "guadeloupe", "appelant"), partie(D6, 2, "adverse", "metropole", "intime")],
    partiesClair: { [`${D6}-p1`]: { nom: "Mme R. (anonymisée)", courriels: null }, [`${D6}-p2`]: { nom: "Assureur (anonymisé)", courriels: null } },
    appel: { id: `${D6}-a`, client_id: C, dossier_id: D6, introduit_le: jour(ilYa(200)), regime: "cpc2017", procedure: "mise_en_etat", role_client: "appelant", territoire: "guadeloupe", cloture_previsible_le: null, cree_le: ilYa(10), maj_le: ilYa(10) },
    delais: [delai(D6, 1, { acte: "conclure", regle_code: "tamila.cpc2017.908", depart: jour(ilYa(200)), territoire: "guadeloupe", residence: "guadeloupe", echeance_retenue: jour(ilYa(108)), statut: "clos", confirme_par: MOI, confirme_le: ilYa(9), confirmation: "approbation", acte_depose_le: jour(ilYa(110)), motif_cloture: "declaration", clos_par: MOI, clos_le: ilYa(9), cree_le: ilYa(10) })],
    audiences: [],
    avis: [],
    membres: [membre(D6, 1, MOI, "responsable"), membre(D6, 2, HADDAD, "intervenant")],
    murailles: [], exports: [], pieces: [], lectures: [{ user_id: HADDAD, lu_le: ilYa(0, 9), contexte: "dossier" }],
    demandes: [],
    consulteJusqu: null,
  },
];

/* ——— les honoraires d'exemple (b4_06) : le premier dossier a sa convention signée, du temps, une
   provision reçue et une facture ; le deuxième, ouvert depuis deux mois, n'a pas de convention ——— */
export const DESCRIPTIONS_TEMPS_EXEMPLE: Record<string, string> = {
  [`${D1}-h1`]: "Rédaction des conclusions d'appelant (art. 908)",
  [`${D1}-h2`]: "Rendez-vous client : pièces du chantier et devis",
  [`${D1}-h3`]: "Recherche : jurisprudence garantie décennale",
  [`${D1}-h4`]: "Courriel au confrère adverse",
};

export function honorairesExemple(dossier: string): Honoraires {
  if (dossier !== D1) return { convention: null, conventions: [], temps: [], provisions: [], factures: [] };
  const convention = {
    id: `${D1}-hc`, client_id: C, dossier_id: D1, mode: "temps_passe" as const, taux_horaire_cents: 25000, forfait_cents: null, complement_resultat_pct: 10, taux_tva: 20,
    urgence: false, statut: "signee" as const, signee_le: jour(ilYa(23)), piece_id: null, cree_par: MOI, cree_le: ilYa(24), resiliee_le: null,
  };
  const facture = {
    id: `${D1}-hf1`, client_id: C, dossier_id: D1, numero: "H-2026-000041", nature: "facture" as const, emise_le: jour(ilYa(8)), jusqu_au: jour(ilYa(8)), minutes: 210,
    honoraires_temps_cents: 87500, forfait_cents: 0, debours_cents: 3500, total_ht_cents: 87500, taux_tva: 20, tva_cents: 17500, total_ttc_cents: 108500,
    provisions_imputees_cents: 60000, reste_du_cents: 48500, statut: "emise" as const, payee_le: null, mode_reglement: null, motif_annulation: null, emise_par: MOI, cree_le: ilYa(8),
  };
  const temps = (n: number, user_id: string, il: number, minutes: number, nature: Honoraires["temps"][number]["nature"], statut: "saisi" | "facture", facturable = true) => ({
    id: `${D1}-h${n}`, client_id: C, dossier_id: D1, user_id, jour: jour(ilYa(il)), minutes, nature, description_chiffree: CHIFFRE, facturable, statut,
    facture_id: statut === "facture" ? facture.id : null, cree_le: ilYa(il),
  });
  return {
    convention,
    conventions: [convention],
    temps: [temps(4, ROUSSEAU, 1, 15, "correspondance", "saisi", false), temps(3, ROUSSEAU, 2, 75, "recherche", "saisi"), temps(1, MOI, 9, 150, "redaction", "facture"), temps(2, MOI, 12, 60, "rendez_vous", "facture")],
    provisions: [{ id: `${D1}-hp1`, client_id: C, dossier_id: D1, montant_ttc_cents: 60000, demandee_le: jour(ilYa(22)), recue_le: jour(ilYa(18)), mode_reglement: "virement", statut: "recue", facture_id: facture.id, cree_par: MOI, cree_le: ilYa(22) }],
    factures: [facture],
  };
}

/* ——— la conformité d'exemple (b4_07) : l'index est en place ; le premier dossier a sa vigilance (non assujetti) ——— */
export function conformiteExemple(dossier: string): Conformite {
  const c = DOSSIERS_EXEMPLE.find((x) => x.dossier.id === dossier);
  const parties = (c?.parties ?? []).filter((p) => p.qualite === "client" || p.qualite === "adverse").length;
  return {
    dossier, index: true, parties, parties_indexees: parties, controles: 0, conflits_sans_decision: 0, dernier_controle: null,
    vigilance: dossier === D1 ? { dossier_id: D1, client_id: C, assujetti: false, activite: null, identification_le: null, identification_piece: null, beneficiaire_effectif_le: null, risque: null, revue_le: jour(ilYa(20)), par: MOI, maj_le: ilYa(20) } : null,
    vigilance_a_faire: dossier !== D1 && !!c && ["attente", "ouvert", "audit"].includes(c.dossier.statut),
  };
}
