/* ══════════════════════════════════════════════════════════════════════
   L'écosystème Omega, promesse par promesse (18/10/2026)

   Les données de la page interne /espace2/ecosysteme : pour chaque moteur
   (CASHD, REPUT, OFFLOAD, FILED) puis le socle, chaque phrase que le site
   promet, le mécanisme qui la tient (tables, portes, cron, fonction Edge,
   test pgTAP), son niveau de preuve, et ce qui manque sinon.

   Un fichier statique, écrit à la main depuis ces sources, jamais depuis
   la base (pas de table, pas de migration) :
     · ARCHITECTURE-MOTEURS.md (racine de pegase-site) : flux, tables, crons ;
     · omega/CHIFFRAGE/{cashd,reput,offload,filed}.md (pegase-omega-interne,
       06/10/2026, relevé sur main c0494b4) : les tableaux « Promesse | Où |
       État | Preuve | Ce qui manque » — les numéros de ligne « Où » datent
       de ce relevé ;
     · lib/produits/capacites/*.ts : le drapeau `atteste` des catalogues ;
     · omega/CONTRAT-OUVRIER.md et omega/CHIFFRAGE/production.md : le socle ;
     · les lots posés depuis le 06/10, lus dans omega/NOTES-C2/C3/C4/A4.md
       des branches worker-c2, worker-c3, worker-c4 et worker-a4 (jusqu'au
       19/10) : c2_04 → c2_15, c3_09 → c3_14, c4_10 → c4_19, a4_33 → a4_51.

   Les niveaux :
     0  pas encore tenue : partielle, pas construite, ou bloquée par un
        compte tiers ou une décision ;
     1  testée sur la recette (migration posée sur omega-recette, test
        pgTAP vert, écran recetté) ;
     2  prouvée en vrai (une vraie pièce, un vrai envoi, un vrai client) ;
     3  livrable en production (posée sur le projet de production).
   Au 19/10, rien n'est en production et rien n'est prouvé chez un vrai
   client : les niveaux 2 (quelques lignes FILED) viennent d'une vraie
   facture passée sur la recette.
   ══════════════════════════════════════════════════════════════════════ */

export type Niveau = 0 | 1 | 2 | 3;

export const NIVEAUX: Record<Niveau, { court: string; libelle: string; teinte: "ambre" | "bleu" | "vert" | "noir" }> = {
  0: { court: "À tenir", libelle: "Pas encore tenue : partielle, à construire, ou bloquée par un tiers ou une décision", teinte: "ambre" },
  1: { court: "Recette", libelle: "Testée sur la recette : migration posée, test pgTAP vert, écran recetté", teinte: "bleu" },
  2: { court: "En vrai", libelle: "Prouvée en vrai : une vraie pièce, un vrai envoi ou un vrai client", teinte: "vert" },
  3: { court: "Production", libelle: "Livrable en production : posée sur le projet de production", teinte: "noir" },
};

export type GenreManque = "lot" | "tiers" | "decision" | "preuve" | "production";

export const GENRES: Record<GenreManque, { court: string; libelle: string }> = {
  lot: { court: "Lot", libelle: "Un lot à construire ou à poser" },
  tiers: { court: "Tiers", libelle: "Un compte, un achat ou un accès à obtenir par Teo" },
  decision: { court: "Décision", libelle: "Une décision de Teo : trancher un texte ou un choix" },
  preuve: { court: "Preuve", libelle: "La preuve en vrai, chez un premier client" },
  production: { court: "Prod", libelle: "La mise en production du socle et des moteurs" },
};

export type Manque = { genre: GenreManque; texte: string };

export type Promesse = {
  /** le numéro de la ligne dans le chiffrage (P4, C13, #30, K11, 0.2…) */
  id: string;
  /** le texte exact de la page */
  texte: string;
  /** où la phrase est écrite (fichier:ligne du relevé du 06/10) */
  ou: string;
  niveau: Niveau;
  /** ce qui la tient : tables, portes, cron, fonction Edge, test */
  mecanisme: string;
  /** ce qui manque, en plus de ce que le niveau implique */
  manque?: Manque[];
  /** le drapeau `atteste` du catalogue, quand la ligne en vient */
  atteste?: boolean;
  /** une contradiction, une réserve, une précision */
  note?: string;
};

export type Famille = { nom: string; description?: string; promesses: Promesse[] };

export type Etape = { nom: string; detail: string };

export type Moteur = {
  cle: string;
  nom: string;
  libelle: string;
  /** à quoi il sert, en une phrase */
  but: string;
  /** réception → traitement → validation → envoi → journal */
  flux: Etape[];
  crons: string[];
  /** migrations, tests, fonctions Edge, écrans */
  ou: string[];
  /** ce qui sépare la recette du vrai, pour ce moteur */
  versLeVrai: string;
  familles: Famille[];
};

/* ——— petites fabriques, pour que les tableaux restent lisibles ——— */

const lot = (texte: string): Manque => ({ genre: "lot", texte });
const tiers = (texte: string): Manque => ({ genre: "tiers", texte });
const decision = (texte: string): Manque => ({ genre: "decision", texte });
const preuve = (texte: string): Manque => ({ genre: "preuve", texte });

const p = (
  id: string,
  niveau: Niveau,
  texte: string,
  ou: string,
  mecanisme: string,
  manque?: Manque[],
  extra?: Pick<Promesse, "note" | "atteste">,
): Promesse => ({ id, niveau, texte, ou, mecanisme, ...(manque && manque.length ? { manque } : {}), ...extra });

/** Ce qui sépare tout le monde de la production (omega/CHIFFRAGE/production.md). */
export const PRODUCTION_COMMUNE =
  "Mise en production du socle et des moteurs : offre Supabase Pro (l'organisation est en Free, vérifié le 17/10), pose par paliers, sauvegarde réussie, Bedrock UE, Brevo de production, clé de service dans le Vault, DPA : ≈ 9 j d'équipe, ≈ 1 j de Teo, ≈ 45 $ par mois. Détail dans le socle.";

/** Les manques d'une promesse, ceux de la ligne plus ceux que son niveau implique. */
export function manquesDe(promesse: Promesse, moteur: Moteur): Manque[] {
  const explicites = promesse.manque ?? [];
  if (promesse.niveau === 1) return [...explicites, preuve(moteur.versLeVrai), { genre: "production", texte: PRODUCTION_COMMUNE }];
  if (promesse.niveau === 2) return [...explicites, { genre: "production", texte: PRODUCTION_COMMUNE }];
  return explicites;
}

export const promessesDe = (m: Moteur): Promesse[] => m.familles.flatMap((f) => f.promesses);

export function compter(m: Moteur): Record<Niveau, number> {
  const c: Record<Niveau, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const x of promessesDe(m)) c[x.niveau] += 1;
  return c;
}

export const RELEVE = {
  chiffrage: "06/10/2026",
  lots: "19/10/2026",
  phrase: "Chiffrage du 06/10/2026 sur la vitrine c0494b4 ; lots posés jusqu'au 19/10/2026 (c2_15, c3_14, c4_19, a4_51). Rien n'est en production.",
};

/* ══════════════════════════════════════════════════════════════════════
   CASHD — relances des impayés (module C2)
   Source : omega/CHIFFRAGE/cashd.md (117 promesses, 06/10) ; NOTES-C2 de
   worker-c2 jusqu'au 18/10 (c2_04 → c2_15). Lacunes G1 → G22 du chiffrage.
   ══════════════════════════════════════════════════════════════════════ */

const G1 = lot("G1 — arrivée automatique et quotidienne du facturier : connecteur du lecteur d'A1 (tableur en ligne, dossier partagé ou logiciel), 3 j. Aujourd'hui CASHD relit le dernier export déposé.");
const G1T = tiers("Selon la source : vérification d'application Google / Microsoft (gratuite, plusieurs semaines).");
const G4 = lot("G4 — envoi depuis la boîte de l'entreprise (Gmail / Microsoft 365 en OAuth) : branchement d'A2, 4,5 j ; CASHD n'a qu'à choisir l'expéditeur.");
const G4T = tiers("Vérification d'application Google (portée gmail.send) et Microsoft (éditeur vérifié) ; secrets Google et Microsoft à poser (A-FAIRE-TEO § 2 et 3).");
const G13 = lot("G13 — canal WhatsApp pour les relances (modèles approuvés par Meta, opt-in du destinataire), 4 j A2 + 1 j C2.");
const G13T = tiers("WhatsApp Business : compte Meta vérifié (A-FAIRE-TEO § 1), ≈ 0,05–0,10 € par conversation.");
const G22T = tiers("À confirmer par Teo (G22) : région du projet Supabase, contrat, CGV, DPA. Rien à construire dans CASHD.");

const CASHD: Moteur = {
  cle: "cashd",
  nom: "CASHD",
  libelle: "Relances des impayés",
  but: "Relancer les clients qui doivent de l'argent, dans l'ordre, avec validation humaine avant tout envoi.",
  flux: [
    {
      nom: "Réception",
      detail: "Export du facturier déposé (CSV, Excel ; cashd_importer, cashd_deposer_export) → relevé du socle → événement releve.pret.cashd → travail cashd.appliquer_releve. Pas de connecteur : le dépôt est manuel (G1).",
    },
    {
      nom: "Traitement",
      detail: "cashd_factures, cashd_reglements, lettrage (cashd_lettrer, relettrage à chaque intégration). Cron cashd-matin à 7 h Paris : cashd_passage calcule le palier de chaque facture (J 0, J+7, J+21, J+30 ; devis J+3 puis J+7, c2_10), écrit le texte (private.cashd_ecrire_texte, gabarits de l'organisation c2_04), coupe ce qu'un règlement, un litige ou une pause a rendu inutile.",
    },
    {
      nom: "Validation",
      detail: "Une demande de validation par relance (cashd.relance, .mise_en_demeure, .devis) dans demandes_validation ; trois paliers par montant (c2_06) ; la mise en demeure exige un commentaire. Modèle 2 (c2_12) : les rappels des paliers 1 et 2 peuvent partir sous accord permanent du socle ; relance ferme, devis et mise en demeure restent toujours relus. Aucun accord créé : Omega reste en « coupe ».",
    },
    {
      nom: "Envoi",
      detail: "preparer_envoi adossé à la demande ; douze verrous du socle ; réglage coupe / essai / réel (essai à l'installation : rien ne part) ; expéditeur Brevo du socle ; envoi à la main (c2_11). LRE (AR24) et lien de paiement sont préparés, pas branchés.",
    },
    {
      nom: "Journal",
      detail: "journal_opposable : préparation, coupure, décision, envoi ; dossier par compte (pièces, envois, accusés, c2_05) ; point du matin, section « Impayés » ; vues cashd_suivi, cashd_relances_etat, cashd_balance_agee ; arrêtés mensuels.",
    },
  ],
  crons: ["cashd-releves (chaque minute)", "cashd-matin (toutes les 10 min, passage à 7 h Paris)", "cashd-taux-bce (15 h 35 UTC, c2_15 à poser)"],
  ou: [
    "Migrations omega/modules/cashd/migrations/c2_01 → c2_15 (c2_15 écrit, à poser)",
    "Tests omega/tests/cashd/ : ^test_c2_ 256 ok sur la recette le 17/10 ; 296/296 en local avec c2_15",
    "Écrans /espace2/cashd (tableau de bord) et /espace2/cashd/suivi (Débiteurs, Relances, Envois, Trésorerie, Vos textes)",
    "Banc omega/banc/cashd_omega.sql : Omega client de CASHD sur la recette, en essai, envoi coupé",
  ],
  versLeVrai:
    "Un premier client réel : son export lu (1,5 j), formule, signature, seuils et cadences réglés (½ j), envois en réel et suivi des remises (1 j), un cycle complet J+7 → J+30 (2,5 j), cas rares provoqués avec lui (7 j) : 13 j de travail sur 30 à 45 jours de calendrier. Prérequis : expéditeur réel (A2) et Brevo de production.",
  familles: [
    {
      nom: "Page produit (lib/produits/relances.ts)",
      promesses: [
        p("P1", 1, "Vos factures attendent d'être payées", "lib/produits/relances.ts:78", "Constat, pas une capacité."),
        p("P2", 0, "Des devis attendent une réponse et des factures ont dépassé leur échéance. Chaque matin, une relance est déjà rédigée pour chaque compte, et vos équipes décident si elle part.", "lib/produits/relances.ts:85-86", "Cron cashd-matin, cashd_preparer_relances, file de validation (test_c2_03_moteur). « Chaque matin » suppose un facturier frais : CASHD relit le dernier export déposé.", [G1, G1T]),
        p("P3", 0, "Vous ne changez aucun de vos outils — Google Sheets, Excel, Gmail, Outlook, WhatsApp", "lib/produits/relances.ts:110-111", "Excel et CSV : import et dépôt d'export (test_c2_01, c2_02). Google Sheets par export seulement. Gmail / Outlook non branchés. WhatsApp absent.", [G1, G4, G13, G1T, G4T, G13T]),
        p("P4", 1, "À 7 h, vos relances sont déjà écrites.", "lib/produits/relances.ts:137", "Réglage heure_relances, passage toutes les 10 min (test_c2_03_moteur)."),
        p("P5", 0, "CASHD relit votre facturier chaque matin, avant d'écrire quoi que ce soit.", "lib/produits/relances.ts:144", "Relit le dernier relevé intégré avant d'écrire (c2_02, c2_03).", [G1, G1T]),
        p("P6", 1, "Chaque devis porte ses jours sans réponse", "lib/produits/relances.ts:153", "jours_ecoules (test_c2_01_donnees) ; écran Débiteurs."),
        p("P7", 1, "Chaque facture porte son retard et son montant", "lib/produits/relances.ts:154", "Vue cashd_factures_etat (test_c2_01_donnees)."),
        p("P8", 0, "Un règlement encaissé la veille sort de la liste", "lib/produits/relances.ts:155", "Vrai si le règlement est dans l'export ou saisi (c2_02, c2_03).", [G1, G1T]),
        p("P9", 1, "Le message est déjà rédigé quand vous ouvrez votre espace, et il ne reste qu'à le relire.", "lib/produits/relances.ts:161", "Relances a_valider avec leur texte (test_c2_03_moteur) ; écran Relances."),
        p("P10", 1, "Le ton suit le montant et l'ancienneté du retard", "lib/produits/relances.ts:169", "c2_04 : ton au-delà d'un montant réglé, en plus du palier (test_c2_05_textes). Avant le 11/10, seul le palier changeait le ton (G3)."),
        p("P11", 1, "L'historique de paiement du client pèse aussi", "lib/produits/relances.ts:170", "cashd_payeur_en_retard retire la formule « simple oubli » (test_c2_03_moteur)."),
        p("P12", 1, "Un client ne reçoit jamais deux fois le même texte", "lib/produits/relances.ts:171", "c2_04 : variantes tournantes par palier (test_c2_05_textes, G3)."),
        p("P13", 1, "Tout ce qui doit partir passe par une file de validation, qui reste la seule porte de sortie du système.", "lib/produits/relances.ts:178", "preparer_envoi adossé à demandes_validation (test_c2_03_moteur) ; gardes du socle."),
        p("P14", 1, "Aucun message ne part sans votre accord", "lib/produits/relances.ts:186", "File de validation (c2_02). Modèle 2 (c2_12) : un rappel des paliers 1 et 2 peut partir sous un accord permanent, décidé par une personne ; aucun accord n'existe aujourd'hui."),
        p("P15", 1, "La mise en demeure exige une validation explicite", "lib/produits/relances.ts:187", "Commentaire exigé, jamais de politique couvrante : actions_sans_accord (c2_02, c2_12)."),
        p("P16", 1, "Une suspension coupe même ce qui est déjà prêt", "lib/produits/relances.ts:188", "cashd_couper sur pause (test_c2_03_moteur)."),
        p("P17", 0, "J 0 · Facture émise · le suivi s'ouvre automatiquement", "lib/produits/relances.ts:210", "À l'intégration de l'export (c2_02).", [G1, G1T]),
        p("P18", 1, "J+7 · Rappel courtois · le ton se cale sur l'historique de paiement", "lib/produits/relances.ts:211", "test_c2_03_moteur (voir P11) ; cadence c2_10."),
        p("P19", 1, "J+21 · Relance ferme · elle récapitule les sommes dues et fixe une échéance", "lib/produits/relances.ts:213-215", "Texte « Total restant dû … au plus tard le » (test_c2_03_moteur)."),
        p("P20", 1, "J+30 · Mise en demeure préparée · elle attend votre signature et ne part jamais seule", "lib/produits/relances.ts:218-220", "test_c2_03_moteur ; jamais d'accord permanent (c2_12)."),
        p("P21", 1, "Les devis suivent une cadence plus resserrée, J+3 puis J+7", "lib/produits/relances.ts:223", "c2_10 (17/10) : cadence du site par défaut, devis J+3 puis J+7, réglable par cashd_regler_relances. Avant : 3 / 10."),
        p("P22", 1, "Chaque ligne porte le client, le montant dû et les jours de retard, et elle se met à jour à chaque relecture.", "lib/produits/relances.ts:261", "test_c2_01_donnees, test_c2_02_export."),
        p("P23", 0, "Le facturier est relu avant chaque envoi, donc un règlement encaissé la veille coupe la séquence avant qu'elle reparte. Un client qui a payé n'est jamais relancé.", "lib/produits/relances.ts:267", "Coupure au règlement intégré (test_c2_03_moteur) ; « jamais » dépend de la fraîcheur de l'export.", [G1, G1T]),
        p("P24", 1, "Chaque message est écrit à partir du montant, de l'ancienneté du retard et du palier atteint.", "lib/produits/relances.ts:273", "Montant et retard dans le texte, palier → ton (test_c2_03_moteur)."),
        p("P25", 1, "Le système date et archive chaque message, si bien que le jour où un client affirme n'avoir rien reçu, la preuve est disponible.", "lib/produits/relances.ts:278", "envois + journal_opposable + dossier (test_c2_04_capacites).", undefined, { note: "La preuve de remise réelle n'existe qu'après un vrai envoi." }),
        p("P26", 0, "Votre espace tient en quatre écrans — Débiteurs, Relances, Envois, Trésorerie ; les captures ci-dessous sont celles de l'espace, montrées telles quelles.", "lib/produits/relances.ts:295-325", "Les quatre vues existent sur /espace2/cashd/suivi (?vue=debiteurs|relances|envois|tresorerie, 11/10, G14) ; captures refaites le 17/10 dans omega/captures/cashd.", [decision("Les captures de la page viennent encore de l'ancienne maquette : les remplacer est une modification de la vitrine, donc l'accord écrit de Teo.")]),
        p("P27", 0, "Aucun outil à remplacer · Rien ne part sans vous · Vos données restent chez vous", "lib/produits/relances.ts:328", "1 : voir P3. 2 : tenu (c2_02). 3 : les données sont dans la base Omega, isolées par organisation (RLS), pas « chez vous » au sens strict.", [G1, decision("« Vos données restent chez vous » : formulation à trancher (G22).")]),
        p("P28", 0, "Conçu et développé en France ; rien n'est sous-traité ailleurs.", "lib/produits/relances.ts:373-375", "Déclaration d'entreprise, hors code.", [G22T]),
        p("P29", 0, "Vos données sont hébergées dans l'Union européenne. Espace chiffré et distinct. Le système n'en extrait que le nécessaire, jamais votre facturier entier.", "lib/produits/relances.ts:378-380", "RLS par organisation (test_c2_01) ; CASHD n'envoie aucune donnée à un modèle (textes déterministes). Région d'hébergement à confirmer.", [G22T]),
        p("P30", 0, "L'assistance se fait en français, par les personnes qui ont installé le système chez vous.", "lib/produits/relances.ts:383-385", "Organisation d'Omega, hors code.", [G22T]),
        p("P31", 0, "Facturation en euros, droit français", "lib/produits/relances.ts:388-390", "CGV et contrat, hors code.", [G22T]),
        p("P32", 1, "Et si un client paie entre deux relances ? … Un règlement enregistré interrompt la séquence sur-le-champ.", "lib/produits/relances.ts:412-413", "Coupure à l'intégration (test_c2_03_moteur)."),
        p("P33", 1, "Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le système à chaque situation. Le ton reste le vôtre.", "lib/produits/relances.ts:416-417", "c2_04 : gabarits propres à l'organisation, modifiables dans « Vos textes » (G2) ; formule, signature, interdits (c2_02)."),
        p("P34", 1, "Le ton reste le vôtre, le vouvoiement est constant, et vous lisez chaque message avant qu'il parte.", "lib/produits/relances.ts:421", "Textes au vouvoiement ; validation (test_c2_03_moteur)."),
        p("P35", 1, "Une liste blanche est établie à l'installation et modifiable à tout moment … et seul vous pouvez les y remettre.", "lib/produits/relances.ts:430-431", "cashd_statut_compte hors_perimetre, retour par décision motivée (test_c2_03_moteur)."),
        p("P36", 0, "Le système lit le tableur ou l'outil où vit déjà votre facturation, avec vos colonnes et vos habitudes. Aucun compte à ouvrir ni aucune donnée à migrer.", "lib/produits/relances.ts:434-435", "Modèle cashd/tableur à synonymes d'en-têtes (test_c2_02_export) ; « l'outil » : pas de connecteur logiciel.", [G1, G1T]),
        p("P37", 1, "Le système ne remplace personne. Il prépare les relances, puis cette personne les relit et décide de ce qui part.", "lib/produits/relances.ts:438-439", "test_c2_03_moteur ; écran Relances."),
        p("P38", 1, "Pour rédiger un message, le système transmet à un modèle le strict nécessaire … jamais votre facturier entier.", "lib/produits/relances.ts:448-449", "Plus strict que promis : aucun modèle n'est appelé, rien ne sort.", undefined, { note: "La phrase décrit un mécanisme qui n'existe pas ; à reformuler si G5 reste sans modèle." }),
        p("P39", 1, "Un message peut-il partir sans moi ? Non. … vous approuvez, vous corrigez ou vous suspendez.", "lib/produits/relances.ts:452-453", "File de validation ; texte modifiable avant envoi, cashd_regler_relances (test_c2_03_moteur)."),
        p("P40", 0, "Le tarif dépend de votre encours et du nombre de comptes à suivre … nous chiffrons votre cas sur vos volumes réels.", "lib/produits/relances.ts:456-457", "Commercial, hors code.", [decision("La grille de prix de Teo.")]),
        p("P41", 0, "Vous connectez le tableur que vous tenez déjà, puis vos équipes relisent chaque relance avant qu'elle parte : le système ne demande rien d'autre.", "lib/produits/relances.ts:473-475", "Dépôt d'export (test_c2_02_export) ; « connecter » suppose un lien permanent.", [G1, G1T]),
      ],
    },
    {
      nom: "Catalogue de capacités (lib/produits/capacites/relances.ts, 50 lignes)",
      promesses: [
        p("C1", 0, "Le système relit votre facturier chaque matin, avant d'écrire la moindre relance.", "lib/produits/capacites/relances.ts:33", "Relit le dernier relevé (c2_02, c2_03).", [G1, G1T], { atteste: true }),
        p("C2", 1, "Chaque devis porte le nombre de jours écoulés depuis son envoi.", "lib/produits/capacites/relances.ts:34", "test_c2_01_donnees ; écran.", undefined, { atteste: true }),
        p("C3", 1, "Chaque facture porte son montant dû, son retard et le compte concerné.", "lib/produits/capacites/relances.ts:35", "test_c2_01_donnees.", undefined, { atteste: true }),
        p("C4", 0, "Un règlement encaissé la veille sort de la liste du jour.", "lib/produits/capacites/relances.ts:36", "test_c2_02_export (dépend de l'export).", [G1, G1T], { atteste: true }),
        p("C5", 1, "La balance âgée range l'encours par tranche d'ancienneté, compte par compte.", "lib/produits/capacites/relances.ts:37", "Vue cashd_balance_agee (test_c2_01, test_c2_04) ; écran.", undefined, { atteste: false }),
        p("C6", 1, "Chaque ligne indique l'état de la relance et le palier suivant.", "lib/produits/capacites/relances.ts:38", "Vue cashd_suivi (test_c2_03_moteur) ; écran.", undefined, { atteste: true }),
        p("C7", 1, "Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes.", "lib/produits/capacites/relances.ts:39", "cashd_poser_echeancier (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C8", 1, "Les devis sans réponse sont suivis au même titre que les factures échues.", "lib/produits/capacites/relances.ts:40", "test_c2_03_moteur.", undefined, { atteste: true }),
        p("C9", 1, "Une facture échue suit trois paliers : deux relances, puis la mise en demeure.", "lib/produits/capacites/relances.ts:47", "test_c2_03_moteur ; cadence c2_10.", undefined, { atteste: true }),
        p("C10", 1, "Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel.", "lib/produits/capacites/relances.ts:48", "test_c2_03_moteur ; c2_10 : J+3 puis J+7 par défaut.", undefined, { atteste: true }),
        p("C11", 1, "La fermeté du message suit le palier atteint, du rappel à la mise en demeure.", "lib/produits/capacites/relances.ts:49", "Trois textes par palier (test_c2_03_moteur), gabarits c2_04.", undefined, { atteste: true }),
        p("C12", 1, "Chaque message reprend le secteur du compte, sa référence, son montant et son retard.", "lib/produits/capacites/relances.ts:50", "test_c2_03_moteur.", undefined, { atteste: true }),
        p("C13", 0, "Les relances partent par courriel, depuis la boîte de votre entreprise.", "lib/produits/capacites/relances.ts:51", "Courriel par l'expéditeur Brevo du socle, pas depuis la boîte de l'entreprise.", [G4, G4T], { atteste: true }),
        p("C14", 1, "Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi.", "lib/produits/capacites/relances.ts:52", "seuil_direction → regles_validation (test_c2_03_moteur) ; trois paliers depuis c2_06.", undefined, { atteste: true }),
        p("C15", 1, "Chaque facture suit sa propre séquence, avec son palier et son échéance.", "lib/produits/capacites/relances.ts:53", "cashd_relances_pieces (test_c2_03_moteur).", undefined, { atteste: true }),
        p("C16", 1, "Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires.", "lib/produits/capacites/relances.ts:54", "Calendrier du socle (test_c2_04 « un samedi ») ; fenêtres : reglages_envois.", undefined, { atteste: false }),
        p("C17", 0, "Les comptes export reçoivent leur relance dans leur langue de facturation.", "lib/produits/capacites/relances.ts:55", "Français et anglais (test_c2_03_moteur).", [lot("G6 — langues au-delà du français et de l'anglais : textes des 6 paliers par langue, relus par un natif (1 j)."), tiers("Traduction relue ≈ 150–300 € par langue.")], { atteste: false }),
        p("C18", 1, "Une contestation écrite bascule la facture en litige et la sort du cycle.", "lib/produits/capacites/relances.ts:62", "c2_05 (11/10, G5) : réponses reçues lues → propositions tranchées par une personne (test_c2_06_reponses) ; avant, bascule par geste humain seul.", undefined, { atteste: false }),
        p("C19", 1, "Le commercial en charge du compte est notifié dès l'ouverture du litige.", "lib/produits/capacites/relances.ts:63", "cashd_alerter_commercial (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C20", 1, "Une facture contestée sur une seule ligne laisse le reste en relance.", "lib/produits/capacites/relances.ts:64", "cashd_litige_partiel (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C21", 1, "La reprise des relances demande une décision, jamais un simple délai écoulé.", "lib/produits/capacites/relances.ts:65", "Motif obligatoire (test_c2_03_moteur).", undefined, { atteste: false }),
        p("C22", 1, "Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes.", "lib/produits/capacites/relances.ts:66", "test_c2_04_capacites.", undefined, { atteste: false }),
        p("C23", 1, "Un compte se met en pause ou sort du périmètre à tout moment.", "lib/produits/capacites/relances.ts:67", "test_c2_03_moteur ; écran.", undefined, { atteste: true }),
        p("C24", 1, "La mise en demeure est préparée, puis elle attend une validation explicite.", "lib/produits/capacites/relances.ts:68", "test_c2_03_moteur.", undefined, { atteste: true }),
        p("C25", 1, "Le dossier de litige réunit les pièces, les envois et les accusés de réception.", "lib/produits/capacites/relances.ts:69", "cashd_dossier (test_c2_04_capacites) ; pièces déposées dans omega-clients (c2_05).", undefined, { atteste: false, note: "Les accusés réels viennent après le branchement d'AR24 (G16)." }),
        p("C26", 0, "Le courrier recommandé électronique est préparé quand la créance l'exige.", "lib/produits/capacites/relances.ts:70", "Préparé en canal lre au-delà de seuil_lre (test_c2_04_capacites) ; ne part pas sans AR24.", [lot("G16 — branchement AR24 par A2 (2 j) ; fonctions webhooks-ar24 et expediteur écrites par A2, à déployer."), tiers("Contrat AR24 et accès API (A-FAIRE-TEO § 4), prix par envoi sur devis.")], { atteste: false }),
        p("C27", 1, "Un règlement enregistré interrompt la séquence avant le prochain envoi.", "lib/produits/capacites/relances.ts:77", "test_c2_03_moteur ; écran.", undefined, { atteste: true }),
        p("C28", 1, "Les règlements partiels sont imputés, et le solde dû continue d'être suivi.", "lib/produits/capacites/relances.ts:78", "test_c2_01_donnees.", undefined, { atteste: false }),
        p("C29", 1, "Le lettrage rapproche chaque encaissement de la facture qu'il solde.", "lib/produits/capacites/relances.ts:79", "cashd_lettrer, relettrage (test_c2_01, test_c2_02).", undefined, { atteste: false }),
        p("C30", 0, "Les écritures bancaires sont rapprochées de l'encours, jour après jour.", "lib/produits/capacites/relances.ts:80", "Par export du relevé (test_c2_02_export) ; « jour après jour » suppose un dépôt quotidien.", [G1, G1T], { atteste: false }),
        p("C31", 1, "Un virement sans référence est proposé au rapprochement avec les factures probables.", "lib/produits/capacites/relances.ts:81", "cashd_propositions (test_c2_01_donnees).", undefined, { atteste: false }),
        p("C32", 1, "Les avoirs et les acomptes sont déduits avant tout calcul du solde dû.", "lib/produits/capacites/relances.ts:82", "test_c2_01, test_c2_03.", undefined, { atteste: false }),
        p("C33", 1, "Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées.", "lib/produits/capacites/relances.ts:83", "cashd_penalites, 40 € par facture (test_c2_03_moteur).", undefined, { atteste: false }),
        p("C34", 0, "Un lien de paiement accompagne la relance et s'éteint dès le règlement.", "lib/produits/capacites/relances.ts:84", "Contrat d'interface posé (test_c2_04_capacites) ; aucun prestataire branché.", [lot("G15 — ouvrier qui crée le lien chez le prestataire de l'organisation et reçoit son webhook (2,5 j, serveur)."), tiers("Compte du prestataire de chaque client (Stripe ≈ 1,5 % + 0,25 € par carte UE ; SEPA ≈ 0,35 €).")], { atteste: false }),
        p("C35", 1, "Les factures en devise étrangère sont suivies dans leur devise et en euros.", "lib/produits/capacites/relances.ts:85", "cashd_taux_change, taux saisis à la main (test_c2_04_capacites).", [lot("G17 — c2_15_taux_bce écrit le 18/10 (taux BCE chaque jour ouvré par pg_net, source « bce », 296/296 en local) : à poser sur la recette.")], { atteste: false }),
        p("C36", 1, "Un plafond d'encours se fixe par compte, à partir de son historique.", "lib/produits/capacites/relances.ts:92", "cashd_proposer_plafond (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C37", 1, "Le dépassement du plafond déclenche une alerte avant toute nouvelle commande.", "lib/produits/capacites/relances.ts:93", "cashd_alerter_plafonds (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C38", 0, "Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable.", "lib/produits/capacites/relances.ts:94", "Porte cashd_verifier_commande (test_c2_04_capacites) ; aucun logiciel de commandes ne l'appelle.", [lot("G19 — raccord du logiciel de commandes du client à cashd_verifier_commande (1,5 j) : attend un premier client."), tiers("Selon le logiciel de commandes du client.")], { atteste: false }),
        p("C39", 1, "Vos règles de communication et vos interdits sont repris dans chaque message.", "lib/produits/capacites/relances.ts:95", "Interdits réglés (test_c2_03_moteur) ; gabarits c2_04.", undefined, { atteste: true }),
        p("C40", 1, "Un compte qui se dégrade est signalé avant que le retard s'installe.", "lib/produits/capacites/relances.ts:96", "Vue cashd_delais_reglement.se_degrade, alerte au commercial et point du matin (test_c2_04, 30 j de retard contre 5 d'habitude).", undefined, { atteste: false }),
        p("C41", 1, "Un compte se met en pause, et il n'y revient que sur votre décision.", "lib/produits/capacites/relances.ts:97", "test_c2_03_moteur.", undefined, { atteste: true }),
        p("C42", 1, "Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées.", "lib/produits/capacites/relances.ts:98", "c2_05 (G20) : pièces du dossier déposées dans omega-clients/<client>/cashd, bouton Assurance-crédit (test_c2_06_reponses).", undefined, { atteste: false }),
        p("C43", 1, "Le dossier de recouvrement judiciaire est remis complet à qui vous désignez.", "lib/produits/capacites/relances.ts:99", "cashd_remettre_dossier (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C44", 1, "Le délai moyen de règlement se mesure compte par compte.", "lib/produits/capacites/relances.ts:106", "test_c2_04_capacites.", undefined, { atteste: false }),
        p("C45", 1, "La prévision d'encaissement est établie à trente et à soixante jours.", "lib/produits/capacites/relances.ts:107", "test_c2_04_capacites.", undefined, { atteste: false }),
        p("C46", 1, "Chaque relance partie est datée et consignée, avec son objet et son destinataire.", "lib/produits/capacites/relances.ts:108", "envois + journal ; écran Envois.", undefined, { atteste: true }),
        p("C47", 1, "Le taux de réponse aux relances se suit palier par palier.", "lib/produits/capacites/relances.ts:109", "Vue cashd_reponses ; écran.", undefined, { atteste: false, note: "Aucune réponse réelle encore." }),
        p("C48", 1, "Les créances en litige, en pause et en recouvrement sont comptées en continu.", "lib/produits/capacites/relances.ts:110", "test_c2_04_capacites.", undefined, { atteste: false }),
        p("C49", 1, "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", "lib/produits/capacites/relances.ts:111", "Boutons Tableur ; arrêté mensuel (test_c2_04_capacites).", undefined, { atteste: false }),
        p("C50", 1, "Les seuils et les cadences se modifient, et chaque changement reste daté.", "lib/produits/capacites/relances.ts:112", "cashd_historique_reglages (test_c2_04_capacites).", undefined, { atteste: false }),
      ],
    },
    {
      nom: "Les douze cas tordus",
      promesses: [
        p("L1", 0, "Le client a payé hier soir, et la relance était prête.", "lib/produits/capacites/relances.ts:125", "Coupure au règlement intégré (test_c2_03_moteur).", [G1, G1T]),
        p("L2", 1, "Le client conteste une seule ligne de la facture.", "lib/produits/capacites/relances.ts:129", "cashd_litige_partiel (test_c2_04_capacites)."),
        p("L3", 1, "Le client demande à régler en plusieurs fois.", "lib/produits/capacites/relances.ts:133", "Échéancier ; une échéance manquée relance l'échéance (test_c2_04_capacites)."),
        p("L4", 1, "Votre interlocuteur a quitté l'entreprise du client. Le rejet du message ou la réponse d'absence définitive signale l'adresse.", "lib/produits/capacites/relances.ts:137", "Rebond → attente_contact (cashd_suivre_envoi) ; c2_05 : l'absence définitive est lue dans la réponse et proposée à une personne (test_c2_06_reponses).", undefined, { note: "L'assertion sur le rebond a une branche de repli tant qu'aucun envoi réel n'existe." }),
        p("L5", 1, "Deux filiales du même groupe client doivent être relancées séparément.", "lib/produits/capacites/relances.ts:141", "Un compte par entité, tableau par entité et consolidé (test_c2_01_donnees)."),
        p("L6", 1, "Un virement arrive sans aucune référence … Tant que l'imputation n'est pas tranchée, la séquence du compte est suspendue.", "lib/produits/capacites/relances.ts:145", "cashd_propositions ; règlement non lettré suspend (test_c2_01, test_c2_03)."),
        p("L7", 1, "Le montant restant dû est de quelques euros. Un seuil de relance se fixe par entité …", "lib/produits/capacites/relances.ts:149", "c2_04 (G9) : seuil de relance par entité, geste « abandonner / réclamer » le solde (test_c2_05_textes)."),
        p("L8", 1, "Le client est aussi l'un de vos fournisseurs. Le compte est signalé comme réciproque et sort du cycle automatique.", "lib/produits/capacites/relances.ts:153", "cashd_comptes.reciproque exclu de la préparation."),
        p("L9", 1, "Le dossier est passé entre les mains d'un avocat … toute relance commerciale cesse, y compris celle qui était déjà rédigée.", "lib/produits/capacites/relances.ts:157", "Statut recouvrement, cashd_remettre_dossier (test_c2_04_capacites)."),
        p("L10", 1, "Le client demande expressément l'arrêt des relances … le journal garde la trace des deux décisions.", "lib/produits/capacites/relances.ts:161", "hors_perimetre + journal (test_c2_03_moteur)."),
        p("L11", 1, "Le devis a été accepté de vive voix … Vous consignez l'accord oral, ce qui arrête la relance et ouvre le suivi de la facturation à venir.", "lib/produits/capacites/relances.ts:165", "c2_04 (G8) : geste « accord consigné » qui arrête la cadence et ouvre le suivi de la facture à venir (test_c2_05_textes)."),
        p("L12", 1, "La facture attend un bon de commande chez le client … la relance vise le service qui doit émettre ce bon.", "lib/produits/capacites/relances.ts:169", "c2_04 (G7) : motif de blocage consigné, relance adressée au service émetteur du bon, décompte qui continue (test_c2_05_textes)."),
      ],
    },
    {
      nom: "À l'échelle d'un groupe",
      promesses: [
        p("E1", 1, "Chaque société, filiale ou site a son encours … un chargé de recouvrement ne voit que son portefeuille.", "lib/produits/capacites/relances.ts:185", "Périmètre par entité (RLS, test_c2_01) ; c2_08 (G10) : portefeuille par chargé, politiques restrictives sur 7 tables, cashd_regler_portefeuille (test_c2_08_portefeuille)."),
        p("E2", 1, "Suivi, validation des relances, gestion des litiges et administration sont quatre rôles distincts. Une délégation se pose pour une absence et s'éteint à la date prévue.", "lib/produits/capacites/relances.ts:191", "Rôles et délégations du socle ; CASHD exige gestion / validation (test_c2_01, test_c2_03)."),
        p("E3", 1, "Le montant et le palier décident de qui valide : le chargé de compte, le responsable crédit, la direction financière.", "lib/produits/capacites/relances.ts:197", "c2_06 (G11) : trois paliers de validation par montant → regles_validation du socle (test_c2_07_validation) ; écran « Qui valide »."),
        p("E4", 0, "… un journal qui ne se modifie pas, y compris par nous.", "lib/produits/capacites/relances.ts:203", "journal_opposable du socle : protégé contre l'écriture, mais un administrateur de la base pourrait le modifier.", [lot("G18 — chaînage par empreintes + export horodaté dans le socle (1 j) ; FILED l'a fait pour ses propres tables (a4_46)."), decision("Ou reformuler « y compris par nous ».")]),
        p("E5", 0, "Le système lit votre facturation et vos encaissements là où ils vivent déjà, tableur compris. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation.", "lib/produits/capacites/relances.ts:209", "Dépôt de fichiers (test_c2_02_export) ; les portes cashd_* existent mais ne sont pas offertes à un tiers.", [G1, lot("G12 — interface de programmation documentée pour un client : clés, documentation des portes cashd_*, quotas (2 j, socle)."), G1T]),
        p("E6", 1, "Encours, balance âgée, délai moyen de règlement et prévision d'encaissement se lisent par société et en consolidé, avec un export daté.", "lib/produits/capacites/relances.ts:215", "cashd_tableau(p_client, p_entite), arrêtés (test_c2_04_capacites)."),
      ],
    },
    {
      nom: "Accueil, /offres, articles (app/page.tsx, lib/content.ts)",
      promesses: [
        p("M1", 0, "À 7 h, vos relances sont déjà écrites. — Relit le facturier chaque matin. Vous décidez ce qui part.", "app/page.tsx:687-689", "Voir P4, P5.", [G1, G1T]),
        p("M2", 0, "Les relances partent au bon moment et s'arrêtent au règlement.", "app/page.tsx:288", "Voir P23.", [G1, G1T]),
        p("M3", 0, "Relances, demandes entrantes, réactivation, factures fournisseurs : automatisés … sur vos outils actuels.", "app/page.tsx:192", "Voir P3.", [G1, G4, G1T, G4T]),
        p("M4", 1, "CASHD — Relance des devis · Relance des factures échues · Gradation par montant · Validation avant envoi", "app/offres/page.tsx:381-384", "Devis, factures, validation (c2_02) ; gradation par montant : c2_04, ton au-delà d'un montant (G3)."),
        p("M5", 1, "relance graduée, rédigée au cas par cas selon le montant en jeu, l'ancienneté du retard et l'historique du compte. — Relance à J+3, J+7, J+21, aucun envoi sans votre validation.", "lib/content.ts:112-113", "c2_04 (montant, variantes, historique) et c2_10 (cadence du site) ; voir P10–P12, P21."),
        p("M6", 1, "CASHD relance aux bonnes dates avec des messages que le dirigeant valide, en proposant le règlement au comptoir, par virement ou en plusieurs fois. Chaque matin, le point du jour …", "lib/content.ts:260", "Dates, validation, point du matin (c2_02) ; c2_04 (G21) : moyens de règlement et échéancier proposés dans le texte."),
        p("M7", 1, "… un message de suivi part, formulation cordiale, jamais le mot « relance », en proposant de passer voir le chantier ou de caler une date … vocabulaire du métier … le dirigeant valide le ton une fois pour toutes.", "lib/content.ts:287", "Devis : deux messages cordiaux sans « relance » (test_c2_03) ; c2_04 (G2, G3) : gabarits de l'organisation et vocabulaire du bâtiment."),
        p("M8", 1, "rappel à l'échéance, relances progressives, proposition d'échelonnement pour les gros montants, et mise en demeure uniquement sur validation expresse du dirigeant.", "lib/content.ts:291", "c2_10 et c2_14 : rappel le jour de l'échéance (J 0) ; c2_04 (G21) : échelonnement proposé ; mise en demeure toujours validée."),
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   REPUT — réponses aux demandes clients (module C3)
   Source : omega/CHIFFRAGE/reput.md (96 promesses, 06/10) ; NOTES-C3 de
   worker-c3 jusqu'au 19/10 (c3_09 → c3_14). A = lib/produits/accueil.ts,
   K = lib/produits/capacites/accueil.ts.
   ══════════════════════════════════════════════════════════════════════ */

const AGENDA = lot("Bloc rendez-vous : lecture des disponibilités, pose du rendez-vous adossée à validation, durées par type, ressources indisponibles, rappel J-1, replanifier / annuler (≈ 10 j). Teo (19/10) : « rendez-vous côté base, sans agenda », dans les 8 lots REPUT.");
const AGENDAT = tiers("Application OAuth Google (vérification, scope sensible) et Microsoft Entra, pour écrire dans un agenda.");
const ASTREINTE = lot("Tour de garde + appel sortant + accusé d'appel (3 j) ; hors du chantier du 19/10.");
const ASTREINTET = tiers("Compte de téléphonie (Twilio / OVH, ≈ 1–5 €/mois + ≈ 0,05 €/appel ; A-FAIRE-TEO « Téléphonie d'astreinte »).");
const WHATSAPP = lot("WhatsApp de bout en bout (fenêtre de 24 h, modèles), 4 j A2.");
const META = tiers("Compte Meta Business vérifié, numéro, modèles (A-FAIRE-TEO § 1) ; ≈ 0,03–0,08 € par conversation.");
const HUIT_LOTS = "Dans les 8 lots REPUT ordonnés par Teo le 19/10 (recette seulement, sans envoi réel, sans page publique).";

const REPUT: Moteur = {
  cle: "reput",
  nom: "REPUT",
  libelle: "Réponses aux demandes clients",
  but: "Répondre à chaque demande reçue (mail, formulaire, WhatsApp) à partir de la base du client seulement ; la réponse est préparée, puis validée, sauf sujet autorisé d'avance.",
  flux: [
    {
      nom: "Réception",
      detail: "A2 : courriel Brevo sur recu.omegaai.fr, formulaire signé, WhatsApp (compte Meta requis) → public.receptions (deposer_reception, idempotente) → événement reception.nouvelle → travail reput.preparer. Omega client REPUT sur la recette : 16 fiches tirées du site (omega/banc/reput_omega.sql) et 62 fiches métiers, en brouillon.",
    },
    {
      nom: "Traitement",
      detail: "Fonction Edge reput-reponse (cron omega-reput, chaque minute) : reput_commencer rend la réception (8 000 caractères au plus), le canal et la base en vigueur ; Claude, outil rediger_reponse : sujet parmi ceux du client, langue, urgence, sources (fiches), corps ; contrôles (chiffre non sourcé → hors base → transfert, service nommé c3_09) ; photo seule → demande de précision sans modèle. Plafond IA du jour (c3_04).",
    },
    {
      nom: "Validation",
      detail: "Dépôt en envoi a_valider dans la file du socle, sur le canal de la demande ; Valider / Corriger / Refuser dans « À valider » et /espace2/reput (c3_10) ; courriel « réponses à valider » aux décideurs, au plus un par heure (c3_11, tâche reput-prevenir). Modèle 2 (c3_13) : envoi_auto vrai par défaut, un geste du gérant propose les accords de tous les sujets autorisables ; retenues : urgence, hors base, sujets protégés (réclamation, humain, litige CASHD).",
    },
    {
      nom: "Envoi",
      detail: "Envoi adossé à la demande, seul sous accord permanent (politique reput.repondre.<sujet>, quota 1 000 par mois, un an) ; accusé de réception (reput.accuser) ; demande d'avis J+3 après cashd.facture_reglee, deux relances, six mois ; mode essai sur la recette ; expéditeur Brevo du socle (DNS du client pour écrire sous son adresse).",
    },
    {
      nom: "Journal",
      detail: "journal_opposable (private.journaliser_module) ; reput_demandes (canal, sujet, reçu le), reput_historique, dossiers sur deux canaux (c3_07) ; indicateurs par site et service (c3_12) ; point du matin : reçues, en attente, répondues, sujets récurrents ; fiches proposées à la base (c3_08).",
    },
  ],
  crons: ["omega-reput (chaque minute)", "reput-prevenir (chaque minute, c3_11)", "tache_envois du socle (toutes les 5 min)"],
  ou: [
    "Migrations omega/modules/reput/migrations/c3_01 → c3_14 (c3_14 écrit le 19/10, à poser)",
    "Tests omega/tests/reput/ : souche locale 319/319 le 19/10 ; recette verte jusqu'à c3_13",
    "Fonction Edge omega/functions/reput-reponse (index, passage, rediger, portes_reput ; Deno 15/15) : v2 déployée, 15a01a67 + c3_09 à redéployer",
    "Écran /espace2/reput (components/espace/reput) : demandes, réponses à valider, base de connaissances, sujets autorisés, envoi automatique, pièces jointes",
    "Kit de preuve en vrai : omega/recette-c3/PREUVE-VRAIE.md, preuve_vraie.sql",
  ],
  versLeVrai:
    "Le circuit mail + formulaire chez un premier client : clé IA (de préférence Bedrock UE), redirection de sa boîte vers recu.omegaai.fr, domaine d'envoi (SPF / DKIM), une heure d'entretien et la saisie de sa base, une semaine de rodage : ≈ 4 j plus les accès du client. Première marche : deux vrais courriels de Teo vers banc@recu.omegaai.fr (PREUVE-VRAIE.md), attendus depuis le 11/10.",
  familles: [
    {
      nom: "Page REPUT (lib/produits/accueil.ts)",
      promesses: [
        p("1", 1, "« Une demande reçue à 21 h obtient sa réponse à 21 h »", "lib/produits/accueil.ts:85 ; app/page.tsx:697", "Préparation dans la minute (cron omega-reput, Edge reput-reponse, c3_02) ; c3_13 (18/10) : envoi automatique par défaut sur tous les sujets autorisables, après le geste du gérant.", undefined, { note: "Retenue : urgence, doute hors base, sujet protégé. Sur la recette, l'envoi reste en essai." }),
        p("2", 1, "« …votre client reçoit sa réponse, et elle ne dit rien que vous n'ayez validé. »", "lib/produits/accueil.ts:94", "c3_02, c3_03 : une demande de validation par réponse, envoi adossé, garde politiques_reput_garde (62 + 47 tests)."),
        p("3", 1, "« < 1 min — C'est ce que votre client attend, le dimanche comme le 15 août. »", "lib/produits/accueil.ts:138", "Préparation < 1 min (cron 1 min) ; envoi < 1 min sous accord (c3_13 par défaut)."),
        p("4", 0, "« 0 — Réponse inventée : quand il ne sait pas, il transfère à vos équipes. »", "lib/produits/accueil.ts:143-145", "rediger.ts:126-188 : sources ⊂ base, chiffre non sourcé → hors base → transfert ; hors base toujours relu (c3_02).", [lot("Contrôle de citation (1 j) : un fait non chiffré inventé n'est attrapé que par le modèle et la relecture."), preuve("« 0 » ne se garantit pas, il se mesure : relevé sur 100 cas réels (2 j).")]),
        p("5", 1, "« REPUT lit le message dès qu'il arrive, puis répond dans la minute à partir de la base… »", "lib/produits/accueil.ts:177", "Voir 1."),
        p("6", 0, "« Vos équipes relisent l'échange le lendemain. »", "lib/produits/accueil.ts:177", "Relecture AVANT envoi construite (c3_02) ; « le lendemain » contredit A:94 et A:430.", [decision("Choix de texte : relecture avant envoi, ou après coup.")]),
        p("7", 1, "« Chaque demande est d'abord qualifiée, puis elle suit le circuit que vous avez défini pour son type. »", "lib/produits/accueil.ts:185", "Sujet (c3_02) ; reput_type_file, reput_router_sujet vers une équipe (c3_07)."),
        p("8", 0, "« Quand elle est urgente, le téléphone de l'astreinte sonne. »", "lib/produits/accueil.ts:185", "Urgence détectée → alerte module + transfert (c3_02) ; aucun appel.", [ASTREINTE, ASTREINTET]),
        p("9", 1, "« La demande d'avis part dans les trois jours qui suivent le règlement, puis … relancée deux fois au maximum. La même personne n'est plus sollicitée avant six mois. »", "lib/produits/accueil.ts:193, 434", "c3_05 (J+3, deux relances, 183 j) ; abonnement cashd.facture_reglee (c3_06, 31 + 27 tests).", undefined, { note: "Client sans CASHD : programmation à la main (reput_programmer_avis)." }),
        p("10", 0, "« L'installation demande une heure d'entretien, puis le branchement de vos canaux, et une semaine de rodage… »", "lib/produits/accueil.ts:215", "Mail et formulaire : redirection vers recu.omegaai.fr (A2) ; WhatsApp et agenda : non.", [lot("Procédure d'installation écrite (½ j) + canaux (voir 12)."), tiers("Accès DNS ou boîte du client.")]),
        p("11", 1, "« Nous construisons ensemble la base de votre entreprise : tarifs, horaires, durées d'intervention, règles internes. Rien d'autre ne sera dit à un client. »", "lib/produits/accueil.ts:222", "c3_01 : fiches versionnées, sources obligatoires ; écran Base de connaissances (66 tests)."),
        p("12", 0, "« Nous connectons WhatsApp Business, votre messagerie et votre agenda, si bien que vos clients continuent d'écrire au même numéro qu'hier. »", "lib/produits/accueil.ts:228", "Messagerie : A2. WhatsApp : réception A2 seulement avec un compte Meta, envoi soumis au consentement. Agenda : rien.", [WHATSAPP, AGENDA, META, AGENDAT]),
        p("13", 0, "« Vos équipes reçoivent copie de chaque réponse la première semaine, et nous corrigeons sur des cas réels. »", "lib/produits/accueil.ts:234", "Mieux qu'une copie : validation avant envoi tant qu'aucun accord n'est donné ; reput_corriger (version + 1) ; fiche proposée (c3_08).", [decision("Copie par courriel optionnelle (½ j) si Teo tient au mot.")]),
        p("14", 1, "« REPUT prend ensuite son rythme sur les postes que vous ouvrez. »", "lib/produits/accueil.ts:234", "c3_03 : accords par sujet (un an, révocables) ; écran Sujets autorisés ; c3_13 : « tout autoriser d'un coup »."),
        p("15", 0, "« Vous n'avez aucun logiciel de plus à ouvrir »", "lib/produits/accueil.ts:263", "c3_10 : lien direct vers la demande ; c3_11 : courriel « réponses à valider » aux décideurs. On valide dans l'espace Omega.", [lot("Valider depuis le courriel de notification : le socle refuse toute décision sans personne connectée, pas de décision par jeton seul."), decision("Ou assumer : « vous validez dans votre espace ».")]),
        p("16", 0, "« REPUT se place derrière les canaux que vous utilisez déjà, puis répond à partir de votre base. »", "lib/produits/accueil.ts:265", "Mail et formulaire : oui. WhatsApp : tiers.", [WHATSAPP, META]),
        p("17", 0, "Tuiles « WhatsApp Business », « Fiche Google Business », « Google Agenda », « Gmail / Outlook »", "lib/produits/accueil.ts:272-275", "Gmail / Outlook : redirection (A2). Fiche Google : lien d'avis (c3_05). WhatsApp : tiers. Agenda : rien.", [WHATSAPP, AGENDA, META, AGENDAT]),
        p("18", 0, "« Créneau réservé, rappel la veille »", "lib/produits/accueil.ts:317, 393", "Rien ne réserve ni ne rappelle.", [AGENDA, AGENDAT]),
        p("19", 1, "« Demande qualifiée, transmise au commercial »", "lib/produits/accueil.ts:326", "c3_07 : routage par sujet vers une équipe."),
        p("20", 1, "« Répondu depuis la base construite avec vous »", "lib/produits/accueil.ts:335", "c3_02 + rediger.ts."),
        p("21", 1, "« Transféré : la réponse n'est pas dans sa base »", "lib/produits/accueil.ts:344", "c3_02 : hors base → reput.transferer."),
        p("22", 1, "« Répondu à 6 h 31 »", "lib/produits/accueil.ts:369", "Voir 1 (c3_13)."),
        p("23", 0, "« Rendez-vous posé samedi 9 h 30 »", "lib/produits/accueil.ts:377", "Rien ne pose un rendez-vous.", [AGENDA, AGENDAT]),
        p("24", 0, "« Transféré : l'astreinte est appelée »", "lib/produits/accueil.ts:385", "Transfert (c3_02) ; appel : rien.", [ASTREINTE, ASTREINTET]),
        p("25", 1, "« La mention figure dans la première réponse, dans les termes que vous choisissez à l'installation. »", "lib/produits/accueil.ts:418", "c3_01 reglages.mention_automatisee, assemblée dans c3_02:171."),
        p("26", 1, "« REPUT ne peut répondre qu'à partir de la base … il ne formule pas d'hypothèse : il transfère … avec la fiche de son escalade. »", "lib/produits/accueil.ts:422 ; K:21, 56, 88", "rediger.ts, consignes 1 et 2 + contrôles ; demande reput.transferer avec sa raison (jamais d'envoi seul).", undefined, { note: "Voir 4 pour la limite." }),
        p("27", 0, "« La réservation s'écrit directement dans votre agenda, en temps réel. Le second créneau n'apparaît plus comme disponible, et le client se voit proposer les suivants. »", "lib/produits/accueil.ts:426", "Rien.", [AGENDA, AGENDAT], { note: "Contredit K:122 (« transmises au service qui tient le planning. C'est lui qui tranche »)." }),
        p("28", 1, "« C'est vous qui fixez la frontière. Les premières semaines, tout vous est soumis avant envoi. Ensuite, vous décidez poste par poste… Chaque échange … reste archivé et consultable. »", "lib/produits/accueil.ts:430", "c3_03 accords, journal_opposable, écran REPUT."),
        p("29", 1, "« Les messages sont écrits d'avance et identiques pour tout le monde : aucun tri des mécontents. »", "lib/produits/accueil.ts:434", "c3_05 : texte_avis unique par entité ; aucune condition sur la satisfaction (le litige n'exclut que les réponses automatisées, pas l'avis)."),
        p("30", 0, "« Oui, l'atelier reçoit samedi de 8 h à 13 h… Je peux vous réserver samedi 9 h 30 ? » / « C'est réservé… Vous recevrez un rappel vendredi soir. » / « Rendez-vous créé dans l'agenda du service · client confirmé »", "lib/produits/accueil.ts:529-539", "Horaires depuis la base (c3_01) ; proposition de créneau, réservation, rappel : rien.", [AGENDA, AGENDAT]),
        p("31", 0, "Circuit « Devis — chiffré »", "lib/produits/accueil.ts:455", "Chiffré seulement si les prix sont en base, sinon transféré.", [decision("Rien à construire si on accepte « chiffré depuis votre grille ».")]),
        p("32", 1, "Circuits « Urgence — transféré », « Réclamation — transféré », « Renseignement — répondu »", "lib/produits/accueil.ts:454-458", "Sujets protégés (c3_01), transfert (c3_02)."),
        p("33", 0, "« Hébergées dans l'Union européenne » / « rien n'y est jamais revendu »", "lib/produits/accueil.ts:500-502", "Base Supabase : région à confirmer ; le texte des messages part à l'API Anthropic directe, hors UE.", [tiers("Bedrock en région UE (compte AWS, A-FAIRE-TEO « AWS Bedrock Francfort ») ; le client _partage le gère (½ j).")]),
        p("34", 0, "« Les réponses emploient le vocabulaire de votre métier, et le suivi se fait au téléphone. »", "lib/produits/accueil.ts:508", "Vocabulaire : depuis la base. Suivi téléphonique : Teo.", [tiers("Engagement humain de Teo.")]),
        p("35", 0, "« Réponse à toute heure », « Prise de rendez-vous »", "app/offres/page.tsx:397", "Réponse : voir 1. Rendez-vous : rien.", [AGENDA, AGENDAT]),
        p("36", 0, "« Les demandes reçues par mail et WhatsApp obtiennent une réponse à toute heure, tirée de ce que votre entreprise sait vraiment, jamais inventée. »", "app/offres/demandes-clients/page.tsx:72", "Mail : c3_02 + c3_13. WhatsApp : tiers.", [WHATSAPP, META]),
        p("94", 0, "« Une entreprise française … relève du droit français. »", "lib/produits/accueil.ts:496", "Hors code (statut de Teo).", [tiers("Statut et contrat d'Omega.")]),
        p("95", 1, "« Lit le message dès son arrivée et répond dans la minute. »", "app/page.tsx:699", "Voir 1 (c3_13)."),
        p("96", 0, "Schéma « Qualification » / entrées « WhatsApp », « Mail »", "lib/produits/accueil.ts:447-450", "Mail : oui. WhatsApp : tiers.", [WHATSAPP, META]),
      ],
    },
    {
      nom: "Catalogue de capacités (lib/produits/capacites/accueil.ts)",
      promesses: [
        p("37", 1, "« Les messages arrivent par votre messagerie et par le formulaire de votre site. »", "K:27", "A2 receptions (mail, formulaire) + abonnement reception.nouvelle → reput.preparer.", [tiers("DNS ou redirection de la boîte du client.")], { atteste: true, note: "La preuve en vrai attend deux vrais courriels de Teo (PREUVE-VRAIE.md)." }),
        p("38", 1, "« Le formulaire de votre site entre dans le même circuit que les autres canaux. »", "K:28", "Formulaire signé (A2) → receptions → reput.preparer.", undefined, { atteste: true, note: "Snippet de formulaire à installer chez le client." }),
        p("39", 0, "« La messagerie instantanée du site est tenue aux mêmes règles que le reste. »", "K:29", "Canal absent du circuit REPUT.", [lot("Widget de chat + canal A2, réponse dans la fenêtre ouverte (3 j). A2 a déployé un widget v1 (19ap) ; son raccord à REPUT n'est pas vérifié par C3.")], { atteste: false }),
        p("40", 0, "« Les messages reçus sur les réseaux sociaux rejoignent la même file. »", "K:30", "Canal absent.", [lot("Meta Graph (Messenger, Instagram) côté A2 (3 j) ; hors du chantier du 19/10."), tiers("Application Meta en revue (semaines).")], { atteste: false }),
        p("41", 0, "« Un appel non décroché est transcrit, puis traité comme une demande écrite. »", "K:31", "Canal absent.", [lot("Renvoi d'appel + messagerie vocale + transcription → réception A2 (2 j)."), tiers("Opérateur (≈ 1–5 €/mois) + transcription (Mistral, A-FAIRE-TEO § 7).")], { atteste: false }),
        p("42", 1, "« Un accusé de réception part dans la minute, sous votre signature. »", "K:32", "c3_05 reput.accuser, signature des réglages ; part seul sous l'accord « accusés ».", undefined, { atteste: true }),
        p("43", 0, "« Les pièces jointes sont conservées et rattachées à la demande. »", "K:33", "A2 compte les pièces (receptions.pieces) ; c3_14 (19/10) : reput_pieces, reput_ouvrir_piece (lien signé 5 min, journal sans chemin), écran PiecesJointes (pgTAP 20/20, souche 319/319).", [lot("c3_14_pieces_jointes à poser sur la recette. " + HUIT_LOTS)], { atteste: false }),
        p("44", 1, "« Vos horaires d'ouverture sont cités dans les réponses, tels que vous les avez écrits. »", "K:34", "Fiches horaires, contrôle des chiffres (8 h 30 → 8, 30).", undefined, { atteste: true }),
        p("45", 1, "« Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse. »", "K:41", "c3_06 : de_empreinte, reput_historique (27 tests).", undefined, { atteste: false }),
        p("46", 0, "« Son contrat, son historique et ses interventions passées sont lus en même temps. »", "K:42", "Historique des échanges (c3_06) ; contrat et interventions : aucun logiciel métier lu.", [lot("Connecteur par logiciel métier, lecture seule (5 j par logiciel)."), tiers("API ou export du logiciel du client.")], { atteste: false }),
        p("47", 1, "« Chaque demande est classée par type avant d'entrer dans un circuit. »", "K:43", "Sujet obligatoire, inconnu → autre (rediger.ts:131-135).", undefined, { atteste: true }),
        p("48", 1, "« Chaque demande est aiguillée selon sa catégorie, d'après les règles posées à l'installation. »", "K:44, 179", "c3_07 reput_router_sujet + regles_validation (20 tests).", undefined, { atteste: true }),
        p("49", 0, "« Une demande qui relève de deux services est orientée vers le premier concerné. »", "K:45", "Un seul sujet par demande, donc un seul service.", [lot("Sujet secondaire + mention au second service (1 j). " + HUIT_LOTS)], { atteste: false }),
        p("50", 1, "« L'urgence est détectée sur le fond du message, pas sur la présence d'un mot. »", "K:46", "Consigne et schéma (rediger.ts:44) ; testé avec des doublures.", [preuve("Jeu d'évaluation sur des messages réels (1 j).")], { atteste: true }),
        p("51", 0, "« Une même demande reçue sur deux canaux est reconnue comme un seul dossier. »", "K:47", "c3_07 cles_contact + regroupement : vrai quand mail et téléphone du contact sont connus ensemble.", [lot("Rapprochement d'un inconnu par signature ou nom (1 j). " + HUIT_LOTS)], { atteste: false }),
        p("52", 1, "« La langue du client est identifiée dès le premier message. »", "K:48", "Langue ISO rendue et contrôlée (rediger.ts:136-140).", undefined, { atteste: false }),
        p("53", 1, "« La réponse est tirée de la base de connaissances construite avec vos équipes. »", "K:55", "c3_01 + c3_02.", undefined, { atteste: true }),
        p("54", 1, "« La base est versionnée : chaque règle porte sa date et son auteur. »", "K:57", "c3_01 reput_connaissances : versions, auteur, validité.", undefined, { atteste: false }),
        p("55", 1, "« Une modification de tarif ou d'horaire s'applique à la réponse suivante. »", "K:58", "Base relue à chaque préparation (reput_commencer).", undefined, { atteste: false }),
        p("56", 0, "« Le ton, la signature et les formules se règlent entité par entité. »", "K:59", "Par organisation cliente (reput_reglages) ; pas par site ni par service.", [lot("Réglages par entité et par site (voir 88). " + HUIT_LOTS)], { atteste: false }),
        p("57", 1, "« Les réponses se font en plusieurs langues, avec le même périmètre de contenu. »", "K:60", "reglages.langues ; langue non couverte → transfert (c3_07:314).", undefined, { atteste: false }),
        p("58", 1, "« La mention d'une réponse automatisée figure dans les termes que vous choisissez. »", "K:61", "Voir 25.", undefined, { atteste: false }),
        p("59", 1, "« Chaque échange reste archivé, transféré ou non, et reste consultable. »", "K:62", "journal_opposable, reput_historique, écran.", undefined, { atteste: true }),
        p("60", 1, "« Les demandes de rendez-vous sont qualifiées, puis transmises au service concerné. »", "K:69", "Sujet rendez_vous (c3_01:194) + routage (c3_07).", undefined, { atteste: true }),
        p("61", 1, "« Chaque demande est enregistrée avec son canal, son type et l'heure de son arrivée. »", "K:70", "reput_demandes (canal, sujet, recu_le).", undefined, { atteste: true }),
        p("62", 0, "« Un rappel part avant la date, sur le canal par lequel le client a écrit. »", "K:71", "Rien.", [AGENDA], { atteste: false }),
        p("63", 0, "« Le client replanifie ou annule par le même canal, sans appeler personne. »", "K:72", "Rien.", [AGENDA], { atteste: false }),
        p("64", 0, "« La durée proposée dépend du type d'intervention demandé. »", "K:73", "La base peut citer une durée ; rien ne la pose dans un agenda.", [AGENDA], { atteste: false }),
        p("65", 0, "« Les ressources et les personnes indisponibles sont exclues des créneaux proposés. »", "K:74", "Rien.", [AGENDA, AGENDAT], { atteste: false }),
        p("66", 1, "« Un rendez-vous demandé hors périmètre est transmis à la personne qui peut le poser. »", "K:75", "Transfert + routage.", undefined, { atteste: true }),
        p("67", 1, "« Chaque type de demande porte un délai de traitement que vous fixez. »", "K:82, 185", "c3_06 delai_heures, reput_fixer_delai, écran.", undefined, { atteste: false }),
        p("68", 1, "« Le délai dépassé fait remonter la demande au responsable du service. »", "K:83", "c3_06 reput_escalader.", undefined, { atteste: false, note: "La preuve en vrai suppose qu'un délai expire chez un client." }),
        p("69", 0, "« Une urgence déclenche l'appel de l'astreinte, selon le tour de garde en cours. »", "K:84", "Voir 8.", [ASTREINTE, ASTREINTET], { atteste: false }),
        p("70", 1, "« Une réclamation est identifiée comme telle et sort du traitement courant. »", "K:85, 133", "Sujet protégé, jamais autorisable, alerte.", undefined, { atteste: false }),
        p("71", 1, "« Un client en litige ouvert ne reçoit aucune réponse automatisée. »", "K:86, 125", "c3_06 private.reput_en_litige → cashd_contact_en_litige (C2).", undefined, { atteste: false, note: "Ne connaît que les litiges tenus dans CASHD." }),
        p("72", 1, "« La demande de parler à une personne est honorée sans discussion. »", "K:87, 157", "Sujet protégé « humain » ; c3_09 (15/10) : le transfert nomme le service qui reprend la demande (souche 268/268, Deno 15/15).", [lot("Fonction Edge reput-reponse à redéployer (15a01a67 + c3_09).")], { atteste: false }),
        p("73", 1, "« Le volume de demandes se lit par canal, par service et par heure de la journée. »", "K:95", "Vues reput_indicateurs, reput_volumes_heure ; c3_12 par site et service.", undefined, { atteste: false }),
        p("74", 1, "« Le délai de première réponse est mesuré, demande par demande. »", "K:96", "reput_indicateurs.", undefined, { atteste: false }),
        p("75", 1, "« La part des demandes traitées sans intervention humaine est suivie dans le temps. »", "K:97", "reput_indicateurs (envoyées seules par mois).", undefined, { atteste: false }),
        p("76", 1, "« Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. »", "K:98", "c3_06 sujets récurrents au point du matin ; c3_08 fiche proposée (11 tests).", undefined, { atteste: false }),
        p("77", 0, "« Les avis obtenus après intervention sont comptés par service et par site. »", "K:99", "reput_avis_indicateurs ; c3_12 compte par site et service. Les avis obtenus sur Google ne sont pas relus (seulement demandés et cliqués).", [lot("Lecture des avis Google (3 j)."), tiers("Accès à l'API Google Business Profile (demande d'accès).")], { atteste: false }),
        p("78", 0, "« Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. »", "K:100", "À la demande : export.ts (CSV). À date fixe : non.", [lot("Envoi programmé (1 j). " + HUIT_LOTS)], { atteste: false }),
        p("79", 1, "« …la réponse part dans la même langue… Si la langue n'est pas couverte, l'échange est transféré. »", "K:114", "c3_07:314."),
        p("80", 0, "« Les deux messages sont reconnus comme un seul dossier. Le client reçoit une réponse, pas deux, sur le canal qu'il a utilisé en dernier. »", "K:118", "Regroupement (c3_07) ; WhatsApp : tiers.", [WHATSAPP, META, lot("Rapprochement d'un inconnu (voir 51).")]),
        p("81", 0, "« Les deux demandes sont enregistrées… transmises au service qui tient le planning. C'est lui qui tranche, et le second client reçoit une proposition de remplacement. »", "K:122", "Enregistrement + transmission (c3_07) ; la proposition de remplacement, c'est la personne qui l'écrit.", [decision("Contredit A:426 (réservation en temps réel) : trancher laquelle des deux phrases vaut.")]),
        p("82", 1, "« Le système ne l'invente pas. Il dit que le point sera vérifié, puis transfère… »", "K:130", "Contrôle chiffre_non_source (rediger.ts:156-171), Deno 12/12."),
        p("83", 1, "« Le client reçoit un accusé, et le responsable du service est prévenu. » (réclamation) / « …la demande remonte immédiatement. » (menace de partir)", "K:134, 138", "Réclamation = sujet protégé, alerte lever_alerte_module ; consigne règle 5."),
        p("84", 0, "« La pièce est conservée et rattachée au dossier. Le système demande la précision qui manque… » (photo seule)", "K:142", "11/10 : message sans texte → demande de précision préparée sans modèle (rediger.ts sansTexte, Deno 14/14) ; pièces : c3_14.", [lot("Fonction Edge reput-reponse à redéployer (15a01a67) ; c3_14 à poser. " + HUIT_LOTS)]),
        p("85", 1, "« Le fil est repris là où il s'était arrêté, avec son historique. »", "K:146", "c3_07 dossier_id, reput_precedents, en_reponse_a."),
        p("86", 0, "« …routée vers le service compétent … et le client en est informé. »", "K:150", "Routage (c3_07) ; information du client non écrite.", [lot("Phrase de transfert dans l'accusé (½ j). " + HUIT_LOTS)]),
        p("87", 1, "« La demande est traitée comme celle d'un prospect, sur le périmètre public de votre base. Aucune donnée de compte n'est communiquée. »", "K:154", "La base ne contient que des fiches publiques ; aucune donnée de compte n'est donnée au modèle."),
        p("88", 0, "« Chaque société, site ou service a sa base de connaissances, ses horaires et sa signature. Une direction lit le consolidé, un responsable de site ne voit que le sien. »", "K:173", "Par organisation cliente ; équipes = services pour la validation ; c3_12 : indicateurs par site et service. Pas de base ni de vue par site.", [lot("Entité « site » : base, réglages, périmètre de lecture, consolidé (4 j). " + HUIT_LOTS)]),
        p("89", 1, "« …une demande ne reste jamais sans destinataire. »", "K:179", "Sujet sans équipe → tous les décideurs (c3_07) ; courriel aux décideurs (c3_11)."),
        p("90", 1, "« Le dépassement fait remonter le dossier, et le manquement se mesure… »", "K:185", "c3_06 escalade + indicateurs."),
        p("91", 1, "« Chaque message reçu, chaque réponse envoyée et chaque transfert s'inscrivent dans un journal qui ne se modifie pas. »", "K:191", "private.journaliser_module → journal_opposable (socle)."),
        p("92", 0, "« Le système se place derrière vos canaux actuels et écrit dans vos agendas. »", "K:197", "Canaux mail : oui. Agendas : rien.", [AGENDA, AGENDAT]),
        p("93", 1, "« Volume par canal, délai de première réponse, demandes transférées et sujets récurrents se lisent par site et en consolidé, avec un export daté. »", "K:203", "c3_12 (18/10) : vue reput_indicateurs_services par jour, site et service (souche 288/288) ; export daté à la demande (export.ts)."),
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — reprise des clients inactifs et des affaires en plan (C4)
   Source : omega/CHIFFRAGE/offload.md (06/10) ; NOTES-C4 de worker-c4
   jusqu'au 19/10 (c4_10 → c4_19). R = lib/produits/reprise.ts,
   K = lib/produits/capacites/reprise.ts, P = app/offres/nouvelles-affaires.
   Quatre lignes du chiffrage sont des constats ou des tuiles non rendues
   (3, 27, 44, 54) : hors décompte.
   ══════════════════════════════════════════════════════════════════════ */

const A2EXP = tiers("Expéditeur réel à l'adresse du client : OAuth Gmail / Microsoft 365, SPF / DKIM du domaine (A2 ; A-FAIRE-TEO § 2 et 3). Aujourd'hui le courriel est préparé et validé, en essai.");
const A2REC = tiers("Réception des réponses depuis la messagerie du client (A2, 1 j).");
const CONNECTEUR = lot("Connecteur direct CRM / ERP / tableur : 5 j par connecteur, plus l'accès du client. Aujourd'hui, tout passe par le dépôt d'un export.");
const MODELE = decision("Teo doit trancher : les règles en français doivent-elles être appliquées par un modèle de langue ? Aujourd'hui c4_10 les lit par familles de phrases, sans modèle, et dit « non comprise » sinon.");

const OFFLOAD: Moteur = {
  cle: "offload",
  nom: "OFFLOAD",
  libelle: "Reprise des clients inactifs",
  but: "Repérer les clients qui n'achètent plus, proposer une reprise, suivre les échéances et les affaires restées en plan, piloter la valeur en jeu. Essai à l'installation : rien ne part.",
  flux: [
    {
      nom: "Réception",
      detail: "Export du CRM, de l'ERP ou du tableur déposé (modèles ventes, clients, contacts, parc, interventions, contrats, affaires, chantiers, missions ; c4_01, c4_06, c4_13, c4_14) → relevés du socle → offload_appliquer_releve. Les réponses arrivent par receptions (A2). Pas de connecteur direct : lecture de l'export déposé.",
    },
    {
      nom: "Traitement",
      detail: "Détection chaque nuit (cron offload-detection, 04 h 41 UTC) : offload_signaux par compte et par jour (niveau, score, valeur en jeu, rythme médian, jours de silence, raisons) ; échéances (c4_07) ; affaires en plan (c4_08). Message par gabarit ancré sur la dernière facture et l'échéance (c4_03, c4_15) ; règles en français lues sans modèle (c4_10) ; impayé ou litige CASHD → hors vague (c4_11) ; vague de la semaine (c4_12).",
    },
    {
      nom: "Validation",
      detail: "Chaque message passe par demandes_validation (socle) ; un seul canal : courriel, sinon tâche d'appel (c4_12) ; un message par compte et par trimestre (c4_16, décision de Teo du 17/10) ; quarantaine de 90 jours. Modèle 2 (c4_18, à poser) : envoi automatique par défaut sous accord permanent du socle, retenue (offload.message_retenu) en cas de doute : envoi éteint, sujet non autorisé, compte à vérifier, adresse générique, moins de trois achats.",
    },
    {
      nom: "Envoi",
      detail: "preparer_envoi adossé à la demande ; essai à l'installation (rien ne part) ; opposition du socle au retrait ; suivi des remises (offload_suivre_envoi) ; coupe-circuit (c4_10) : plus de 20 % de non-remis sur 7 jours, deux messages à la même adresse en 24 h, volume du jour au-delà de trois fois le plafond → arrêt du module, alerte critique, reprise par le gérant.",
    },
    {
      nom: "Journal",
      detail: "journal_opposable (offload.cycle, offload.message_retenu, offload.reglages, offload.restitution) ; offload_tableau et offload_fiche (SECURITY INVOKER) ; pilotage sur 12 mois, valeur en jeu figée à l'ouverture (c4_09) ; restitution JSON de l'organisation (c4_17) ; effacement d'une personne sans DELETE (c4_19, à poser).",
    },
  ],
  crons: ["offload-detection (04 h 41 UTC, chaque nuit)", "tache_envois du socle (toutes les 5 min)"],
  ou: [
    "Migrations omega/modules/offload/migrations/c4_01 → c4_19 (c4_18 remis au coordinateur, c4_19 écrit : à poser)",
    "Tests omega/tests/offload/c4_00 → c4_19 : recette 421 ok le 17/10 ; banc local 44 tests, 422 ok",
    "Méthode : socle factice sur un Postgres 16 local, chaque migration posée deux fois, chaque test dans une transaction annulée",
    "Écran /espace2/offload (components/espace/offload) : liste, échéances, affaires, garde-fous et règles, groupes clients, pilotage",
  ],
  versLeVrai:
    "≈ 5 j de travail plus 2 à 3 semaines d'observation : expéditeur réel à l'adresse du client (A2 : OAuth Gmail / Microsoft 365, SPF / DKIM, 2 j), réception des réponses depuis sa messagerie (1 j), calage des modèles d'export sur ses vrais fichiers (2 j), première vague réelle nom par nom, annexe des prestataires au contrat.",
  familles: [
    {
      nom: "Page, héros, bandeau, fonctionnalités (lib/produits/reprise.ts)",
      promesses: [
        p("1", 1, "« Votre fichier client relu chaque matin : les comptes qui n'ont plus commandé, les entretiens redevenus dus et les affaires restées en plan. »", "P:57", "test_c4_02_detection, test_c4_07_echeances, test_c4_08_cycle ; cron offload-detection."),
        p("2", 1, "« La relance est rédigée, vos équipes la valident. »", "P:57", "test_c4_03_message (gabarit), demandes_validation ; règles en français appliquées au message (c4_10).", undefined, { note: "« Rédigée » = gabarit sous règles, pas une rédaction par un modèle de langue." }),
        p("4", 1, "« Un compte qui commandait deux fois par an cesse de commander, et le service s'en aperçoit à la clôture »", "R:105", "Rythme et alerte avant clôture : test_c4_02_detection."),
        p("5", 1, "« La pièce commandée pour lui dort encore au magasin. »", "R:105", "test_c4_08_inactif_et_reponse (affaire d'un compte inactif rattachée à sa fiche)."),
        p("6", 1, "« OFFLOAD relit votre base clients chaque matin et vous dit à qui écrire. »", "R:105", "Cron de nuit + point du matin (test_c4_03_point_matin).", undefined, { note: "« Relit » = relit le dernier export déposé, pas la base en direct." }),
        p("7", 0, "« Votre historique de ventes vit dans un CRM, un ERP ou un tableur, et vos clients écrivent à votre messagerie. OFFLOAD lit les deux, donc vous ne déployez rien. »", "R:129", "Lecture : dépôt d'export (test_c4_01_import) ; réponses : receptions du socle (test_c4_03_reponse).", [CONNECTEUR, A2EXP, decision("Ou corriger : « OFFLOAD lit leurs exports et les réponses ».")]),
        p("8", 0, "Bandeau d'outils « Gmail, Outlook, Sheets, Excel, CSV »", "R:132", "CSV et Excel exportés : lecteur d'exports. Sheets : par export seulement.", [A2EXP, A2REC]),
        p("9", 1, "« OFFLOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan. »", "R:157", "c4_02, c4_07, c4_08."),
        p("10", 1, "« À 7 h 30, votre liste de relances est prête. »", "R:164", "Détection à 04 h 41 UTC (6 h 41 à Paris l'été) ; écran."),
        p("11", 1, "« OFFLOAD lit votre CRM et votre historique de facturation pendant la nuit, puis il ne garde que les comptes dont le silence dépasse votre délai. »", "R:166", "delai_silence_jours (test_c4_02_detection).", undefined, { note: "Lecture de l'export déposé, pas du CRM en direct." }),
        p("12", 1, "Épingles « Entretien sauté deux fois », « Pièce arrivée, jamais posée », « 4 200 € puis plus rien »", "R:172-174", "Échéance dépassée (c4_07), affaire (c4_08), silence et baisse (c4_02)."),
        p("13", 1, "« Vous fixez le délai de silence et le montant qui mérite un message, puis tout ce qui sort de ces bornes est écarté avant de vous parvenir. »", "R:183", "offload_regler (delai_silence_jours, montant_min) ; test_c4_02_reglages_et_droits."),
        p("14", 1, "« Sans commande depuis douze mois »", "R:189", "Délai réglable (90 j par défaut)."),
        p("15", 1, "« Au moins 300 € d'achats cumulés »", "R:190", "montant_min (test_c4_02_reglages_et_droits)."),
        p("16", 1, "« Entretien annuel redevenu dû » / « Pièce arrivée, jamais reprise »", "R:191-192", "test_c4_07_echeances ; test_c4_08_cycle."),
        p("17", 1, "« Un message par trimestre au plus »", "R:193", "c4_16 (17/10, décision de Teo) : une reprise envoie un seul message écrit, par un seul canal ; quarantaine de 90 j (test_c4_16_un_message, test_c4_05_exclusions)."),
        p("18", 0, "« Par courriel, depuis votre adresse »", "R:194", "Courriel préparé et validé (essai).", [A2EXP]),
        p("19", 1, "« Jamais un compte en litige »", "R:195", "c4_11 (15/10) : private.offload_impaye lit CASHD (litige, recouvrement, facture en litige ou échue) → hors vague (test_c4_11_impayes)."),
        p("20", 1, "« Jamais deux fois le même compte »", "R:196", "Une seule reprise ouverte par compte (index unique), quarantaine."),
        p("21", 1, "« Vos règles de ton, vos interdits et vos tournures sont écrits avant la première vague. Le système n'en sort pas, et il s'arrête au premier doute. »", "R:208", "c4_10 : offload_regles écrites en français et appliquées à chaque message (un message qui enfreint une règle est retenu) ; coupe-circuit offload_surveiller.", [MODELE]),
        p("22", 1, "« Vous dictez les règles en français. » / « Vous n'avez aucune case à cocher : une phrase suffit, et le système l'applique ensuite à chaque relance. »", "R:215-217", "c4_10 : offload_ecrire_regle, private.offload_interpreter_regle (mot ou sujet interdit, montant, tutoiement, longueur, formule, signature, exclusion d'un secteur, d'un commercial, d'un groupe, litige) ; test_c4_10_lecture_des_regles, test_c4_10_regles_appliquees.", [MODELE]),
        p("23", 1, "Échange « Ne relance jamais un compte en litige. » → « Compris — ces fiches sont écartées. » / « Ne propose aucune remise aux anciens clients. » → « Aucune remise dans les relances. »", "R:221-224", "c4_10 (règles) + c4_11 (règle « litige » applicable).", [MODELE]),
        p("24", 1, "« Chaque client reçoit son propre message. » / « Le système y reprend la date, la référence et le montant de sa dernière ligne de facturation »", "R:235-237", "test_c4_03_message."),
        p("25", 1, "Exemple « l'entretien annuel qui va avec est à refaire. Je vous garde un créneau ? »", "R:238-241", "c4_15 (15/10) : le message de reprise reprend l'échéance qui revient, au futur ou au passé ; aucun créneau fixé à la place du client (test_c4_15)."),
        p("26", 1, "« La courbe ci-dessous se lit sur n'importe quel historique de ventes. »", "R:247", "Courbe sur 24 mois dans la fiche (c4_04) ; graphique de la page marqué « Exemple »."),
      ],
    },
    {
      nom: "Métiers",
      promesses: [
        p("28", 1, "Après-vente : « OFFLOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises. »", "R:308", "c4_07, c4_02, c4_08."),
        p("29", 0, "« Votre planning d'atelier et votre stock de pièces restent dans votre DMS, parce qu'OFFLOAD ne s'y substitue pas : il le lit, puis il écrit ailleurs. »", "R:310", "Lit l'export du DMS (jeux equipements, interventions, affaires).", [CONNECTEUR, preuve("Modèles d'en-têtes à confirmer sur un vrai export de DMS (1 j).")]),
        p("30", 1, "Négoce : « OFFLOAD mesure la fréquence de commande habituelle de chaque compte dans votre ERP, puis il signale ceux qui décrochent avant que le trimestre le montre. »", "R:320", "test_c4_02_detection (rythme, ralenti, retard)."),
        p("31", 1, "« Vos conditions tarifaires, vos encours et l'attribution de vos comptes restent dans votre ERP, parce qu'OFFLOAD y lit sans jamais y écrire. »", "R:322", "Aucune écriture vers l'extérieur ; lecture par export."),
        p("32", 1, "Climatisation : « OFFLOAD tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû, puis il écrit au client la semaine d'avant. »", "R:332", "test_c4_07_echeances (J-5 → message ; J → rien)."),
        p("33", 1, "« L'entretien annuel saute une année, puis il saute la suivante, et le contrat s'éteint »", "R:330", "Contrats qui s'éteignent (test_c4_07_contrats_et_parc)."),
        p("34", 1, "Bâtiment : « OFFLOAD reprend vos chantiers réceptionnés, puis il propose un mot aux clients dont le dernier passage remonte à plus longtemps que le délai que vous fixez. »", "R:343", "c4_14 (15/10) : modèle d'export « chantiers » (réception datée), passage du compte, message « je retrouve votre chantier … » (test_c4_14).", [preuve("Export réel d'un logiciel de bâtiment.")]),
        p("35", 1, "Conseil : « OFFLOAD repère les missions closes depuis assez longtemps pour qu'une prise de contact se justifie, sans insistance. »", "R:355", "c4_14 : modèle d'export « missions » (clôture datée) (test_c4_14)."),
        p("36", 1, "« Vous gardez… le prix », « Vous fixez vos prix… », « Vous choisissez… à quel prix »", "R:333, 345, 356", "Aucun prix proposé dans un message (test_c4_03_message, capacité 35)."),
      ],
    },
    {
      nom: "Questions",
      promesses: [
        p("37", 1, "« OFFLOAD lit votre base clients tous les matins, et il en sort trois listes »", "R:377", "Écran : liste, échéances, affaires."),
        p("38", 0, "« Pour chacun, il rédige un message ancré sur son dernier passage, et ce message part de votre adresse. »", "R:377", "Message ancré (test_c4_03_message, c4_15) ; « part de votre adresse » : voir 18.", [A2EXP]),
        p("39", 0, "« Vous ne changez pas d'outil, puisque tout vous arrive dans votre messagerie. »", "R:377", "Les validations se font dans « À valider » ; le point du matin est dans l'espace.", [lot("Point du matin et validations aussi par courriel (socle, 1 j)."), decision("Ou corriger : « dans votre espace ».")]),
        p("40", 1, "« un message par compte et par trimestre »", "R:381", "Voir 17 (c4_16)."),
        p("41", 1, "« un seul canal à la fois, jamais les deux »", "R:381", "c4_12 (15/10) : une reprise passe par un message ou par un appel ; la tâche d'appel n'est posée que si le message ne part pas (test_c4_12_canal_unique)."),
        p("42", 1, "« Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation revient à votre commercial. »", "R:381", "test_c4_03_reponse ; c4_10 : l'absence ne compte plus comme une réponse, le départ met le compte à réattribuer.", [A2REC]),
        p("43", 1, "« Un compte qui ne répond jamais sort du cycle au lieu d'y tourner en boucle »", "R:381", "test_c4_03_cycle ; c4_16 : sans relance écrite, un message sans réponse clôt la reprise."),
        p("45", 1, "« Un export CSV de votre CRM ou de votre ERP suffit pour commencer, et un tableur fait aussi l'affaire. Ce qu'il faut sur chaque ligne, c'est un identifiant de compte, une date et un montant »", "R:389", "Modèles « ventes » et « clients » (test_c4_01_import).", [preuve("En-têtes à confirmer sur de vrais exports (1 j).")]),
        p("46", 1, "« Vous posez les règles en français, comme le ton, les sujets interdits, les remises ou la longueur, et elles s'appliquent à chaque message »", "R:393", "c4_10 (voir 22).", [MODELE]),
        p("47", 1, "« jamais un prix ni un délai inventé, jamais de tutoiement »", "R:393", "Gabarits (test_c4_03_message) ; règles c4_10 (tutoiement, montant interdit)."),
        p("48", 0, "« Vos équipes relisent la première vague nom par nom, puis vous décidez ce qui part seul et ce qui attend votre accord. »", "R:393", "Tout passe en validation (socle). c4_18 (18/10, modèle 2) : envoi_auto et sujets_auto par organisation, accord permanent du socle, retenue en cas de doute (19 assertions en local).", [lot("c4_18_envoi_automatique remis au coordinateur, à poser ; côté socle : offload / envoi.email dans activation_seul_autorisee, offload.message_retenu dans actions_sans_accord.")]),
        p("49", 1, "« Le système s'arrête de lui-même. » / « au premier doute la coupure est automatique »", "R:397", "Import douteux non appliqué (test_c4_01_garde_fou), essai contre réel (test_c4_03_issues) ; c4_10 : coupe-circuit offload_surveiller (test_c4_10_coupe_circuit)."),
        p("50", 1, "« Un compte ne reçoit jamais deux relances, un nom que vous avez retiré ne revient dans aucune vague, chaque envoi est horodaté dans un journal »", "R:397", "test_c4_03_cycle, test_c4_05_exclusions, journal (capacité 39)."),
        p("51", 1, "« Nous préférons un mardi sans vague à un mardi où le même client reçoit deux messages. »", "R:397", "c4_12 : vague_jour réglable (1 à 7) ; test_c4_12_vague_de_la_semaine."),
        p("52", 1, "Cadence « vague hebdomadaire (mardi 9 h) »", "R:35, 256, 397", "c4_12 : les nouvelles reprises ne s'ouvrent que le jour de vague, préparées la nuit, prêtes à valider au matin. Le socle n'a pas d'envoi à heure fixe : le message part à la validation, dans les plages horaires du socle."),
      ],
    },
    {
      nom: "Français, appel final",
      promesses: [
        p("53", 0, "« Omega.AI en est l'éditeur et en assure la maintenance. Le contrat précise où vont vos données et ce que nous en faisons. »", "R:418", "Hors code.", [tiers("Contrat et annexe (juridique).")]),
        p("55", 1, "« Les relances sont rédigées en français, dans le vocabulaire de votre secteur, et vos équipes les relisent avant qu'elles partent. »", "R:430", "Français et relecture (validation) ; vocabulaire : gabarits, chantiers et missions (c4_14), règles (c4_10).", [MODELE]),
        p("56", 0, "« Vos données sont hébergées dans l'Union européenne et ne sont jamais revendues. »", "R:441", "Hors code.", [tiers("Vérifier les régions Supabase et Vercel (fonctions) ; engagement contractuel.")]),
        p("57", 0, "« La liste des prestataires est annexée au contrat »", "R:441", "Hors code.", [tiers("Annexe : Supabase, Vercel, futur modèle de langue, expéditeur.")]),
        p("58", 1, "« si vous arrêtez, tout vous est restitué puis effacé »", "R:441", "c4_17 (18/10) : offload_restitution rend toutes les lignes OFFLOAD de l'organisation en un JSON (seize tables + journal), au journal ; effacement de l'organisation par le socle (private.effacer_client) ; c4_19 : effacement d'une personne, sans DELETE (écrit, 10 assertions).", [lot("c4_19_effacement à poser sur la recette.")]),
        p("59", 1, "« OFFLOAD relit votre base chaque matin, repère les comptes restés silencieux et rédige pour chacun un message ancré sur son dernier passage. Vous validez ce qui part, et vos équipes gardent la main sur chaque échange. »", "R:451", "c4_02, c4_03, validation, reprise en main (test_c4_05_reprise_en_main)."),
      ],
    },
    {
      nom: "Périmètre : mention, cas tordus, échelle groupe (lib/produits/capacites/reprise.ts)",
      promesses: [
        p("60", 1, "« Trois relances, un seul système… Voici ce qu'il lit, ce qu'il écarte et ce qu'il vous laisse décider. »", "K:33", "c4_01 à c4_08."),
        p("61", 1, "« Le système lit votre CRM, votre historique de facturation et vos fiches d'intervention, et rien d'autre. Il n'écrit dans aucun de ces outils, ne crée aucun rendez-vous et n'engage aucun prix à votre place. »", "K:35", "Lecture par export ; aucune écriture vers l'extérieur.", undefined, { note: "Contredit par 79 (« y réécrit l'état de chaque compte »)." }),
        p("62", 1, "« Le dernier contact connu est lu avant toute sollicitation. Si un échange récent figure dans vos outils, le compte sort de la vague en cours. »", "K:132", "c4_13 (15/10) : modèle d'export « contacts » → offload_contacts, dernier_contact ; quarantaine (test_c4_13_contacts_importes)."),
        p("63", 1, "« Le message revient en échec et le compte passe en vérification. Il ne repart dans aucune vague tant que son état n'est pas tranché. »", "K:136", "c4_10 : message non remis → offload_comptes.verification, écarté des vagues, levé par offload_lever_verification."),
        p("64", 1, "« Le système s'arrête de lui-même au premier doute, et vous le signale. » (capacité 38)", "K:105", "c4_10 : coupe-circuit (test_c4_10_coupe_circuit), alerte critique, reprise par offload_reprendre avec motif."),
        p("65", 1, "« La réponse d'absence est reconnue et le compte est signalé comme à réattribuer. Le système ne devine pas le successeur. »", "K:140", "c4_10 : private.offload_reponse_auto sépare l'absence (la séquence continue) du départ (compte à réattribuer, tâche « Trouver le nouvel interlocuteur ») (test_c4_10_reponses_automatiques)."),
        p("66", 1, "« Les trois fiches sont rapprochées sous une entité mère. Le plafond de sollicitation s'applique au groupe, pas à chaque ligne. »", "K:144", "Plafond au groupe (test_c4_05, test_c4_07_import_et_groupe) ; c4_10 : vue offload_groupes, rattachement proposé par domaine de courriel, offload_rattacher_groupe (test_c4_10_groupes)."),
        p("67", 1, "« L'échéance est close dès que la date figure dans vos fiches. Tant qu'aucune trace n'existe, le compte reste en attente et n'est pas relancé une seconde fois. »", "K:148", "test_c4_07_echeances."),
        p("68", 1, "« Le compte reçoit une relance de retrait, puis une seule autre après le délai que vous fixez. Ensuite il passe en décision manuelle, avec le montant immobilisé en regard. »", "K:152", "test_c4_08_cycle."),
        p("69", 1, "« Il sort de la vague de relance commerciale, parce qu'une relance d'impayé et une relance commerciale ne se croisent jamais. Le recouvrement relève de CASHD, pas d'ici. »", "K:156", "c4_11 (voir 19) ; le rappel de retrait d'une affaire part quand même."),
        p("70", 1, "« Chaque entité garde ses échéances, parce qu'elles portent sur des équipements distincts. Le plafond de sollicitation, lui, s'applique au groupe. »", "K:160", "test_c4_07_import_et_groupe."),
        p("71", 1, "« Les dates sont reconstituées à partir de l'historique de facturation. Si rien ne permet de dater un compte, il est présenté à part. »", "K:164", "test_c4_01_import, test_c4_02_detection (sans_achat)."),
        p("72", 1, "« Le rapprochement est proposé avec les éléments qui le fondent. La fusion n'a lieu qu'après votre accord. »", "K:168", "test_c4_05_doublons."),
        p("73", 1, "« Le retrait est immédiat et vaut sur tous les canaux. Seule une personne de votre équipe peut le remettre dans le circuit. »", "K:172", "Opposition du socle (test_c4_03_reponse) ; c4_13 : la remise en « suivi » lève l'opposition dans le même geste, réservé au gérant ou à l'admin avec motif (test_c4_13_remise_dans_le_circuit)."),
        p("74", 1, "« Le compte sort du cycle sur-le-champ, y compris si un message était préparé. L'historique de la vague reste attaché à la fiche. »", "K:176", "test_c4_05_reprise_en_main."),
        p("75", 1, "« Une direction commerciale lit le consolidé, un responsable d'agence ne voit que le sien. »", "K:192", "RLS par entité (voit_entite) ; pilotage consolidé réservé à la direction (test_c4_09_pilotage)."),
        p("76", 1, "« Chaque compte porte son commercial. Les comptes stratégiques restent suivis en direct et sortent du cycle automatique, sans exception à demander. »", "K:198", "test_c4_05_reprise_en_main, exclusions par commercial."),
        p("77", 1, "« Le plafond par compte, la durée de quarantaine et les secteurs exclus sont des réglages, pas des habitudes. Chaque changement reste daté et attribué. »", "K:204", "offload_regler, exclusions par secteur, journal offload.reglages."),
        p("78", 1, "« Chaque message parti, chaque compte écarté et chaque retrait s'inscrivent dans un journal qui ne se modifie pas. »", "K:210", "Journal opposable du socle (capacité 39)."),
        p("79", 0, "« Le système lit votre CRM ou votre ERP, et y réécrit l'état de chaque compte. Là où un connecteur manque, l'échange passe par export et dépôt de fichiers. »", "K:216", "Dépôt de fichiers : oui. Réécriture dans le CRM : aucun connecteur, et contraire à 61.", [decision("Teo (17/10) : la réécriture attend un connecteur, ne pas la faire. Retirer « et y réécrit l'état de chaque compte » (vitrine)."), tiers("Accès API du CRM (10 j et plus par CRM).")]),
        p("80", 1, "« Comptes réactivés, chiffre remis en jeu, échéances honorées et commandes reprises se lisent par entité et en consolidé, avec un export daté. »", "K:222", "c4_09 posé : test_c4_09_pilotage, test_c4_09_arretes."),
      ],
    },
    {
      nom: "Catalogue de capacités (45 lignes)",
      promesses: [
        p("K1", 1, "Le système croise votre historique de facturation et le référentiel clients de votre CRM.", "K:42", "test_c4_01_import.", [preuve("Export réel.")], { atteste: true }),
        p("K2", 1, "Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez.", "K:43", "test_c4_02_detection, test_c4_05_exclusions.", undefined, { atteste: true }),
        p("K3", 1, "La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté.", "K:44", "test_c4_02_detection.", undefined, { atteste: false }),
        p("K4", 1, "Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique.", "K:45", "test_c4_02_detection, test_c4_04_lectures.", undefined, { atteste: false }),
        p("K5", 1, "Les doublons de fiches sont rapprochés quand deux lignes désignent le même client.", "K:46", "test_c4_05_doublons.", undefined, { atteste: false }),
        p("K6", 1, "Les entités d'un même groupe client sont regroupées sous une raison sociale mère.", "K:47", "c4_10 : vue offload_groupes, offload_rattacher_groupe (test_c4_10_groupes).", undefined, { atteste: false }),
        p("K7", 1, "Un tableur sans colonne de date est exploité à partir des dates de facture.", "K:48", "test_c4_01_import.", undefined, { atteste: false }),
        p("K8", 1, "Les contrats et les équipements installés sont suivis jusqu'à leur échéance.", "K:49", "test_c4_07_echeances, test_c4_07_contrats_et_parc.", undefined, { atteste: false }),
        p("K9", 1, "Chaque message reprend la dernière prestation du compte et le temps écoulé depuis.", "K:56", "test_c4_03_message.", undefined, { atteste: true }),
        p("K10", 1, "Un compte sans réponse reçoit un second message, puis il sort du cycle.", "K:57", "test_c4_03_cycle.", undefined, { atteste: true, note: "Depuis c4_16, la relance écrite est éteinte par défaut (un message par trimestre, décision de Teo) ; offload_regler la rallume." }),
        p("K11", 1, "Les règles de ton et de contenu s'écrivent en français, sans case à cocher.", "K:58", "c4_10 (voir 22).", [MODELE], { atteste: true, note: "Le chiffrage du 06/10 jugeait ce « atteste: true » à tort ; c4_10 le rend vrai le 11/10." }),
        p("K12", 1, "Un compte reçoit deux messages en tout, espacés d'au moins trois jours.", "K:59", "test_c4_03_cycle.", [decision("Depuis c4_16 (un message par trimestre, décision du 17/10), ce n'est plus le comportement par défaut : libellé à revoir sur la page.")], { atteste: true }),
        p("K13", 1, "Une réponse, même négative, arrête la séquence et vous rend la conversation.", "K:60", "test_c4_03_reponse.", [A2REC], { atteste: true }),
        p("K14", 1, "Les comptes déjà contactés par un commercial sont écartés de la vague en cours.", "K:61", "test_c4_05_exclusions ; c4_13 contacts importés.", undefined, { atteste: false }),
        p("K15", 0, "Les messages partent par courriel, depuis la boîte de votre entreprise.", "K:62", "Courriel préparé, en essai, par l'expéditeur du socle.", [A2EXP], { atteste: true, note: "« atteste: true » à tort tant que la messagerie du client n'est pas branchée (A2)." }),
        p("K16", 1, "Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan.", "K:63", "test_c4_03_cycle, bilan offload.cycle ; c4_12 : vague de la semaine réglable.", undefined, { atteste: true }),
        p("K17", 1, "Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance.", "K:71", "test_c4_07_echeances.", undefined, { atteste: false }),
        p("K18", 1, "Chaque échéance est datée à partir de la dernière intervention enregistrée.", "K:72", "test_c4_07_echeances.", undefined, { atteste: false }),
        p("K19", 1, "Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe.", "K:73", "test_c4_07_echeances.", undefined, { atteste: false }),
        p("K20", 1, "Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue.", "K:74", "test_c4_07_echeances.", undefined, { atteste: false }),
        p("K21", 1, "Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés.", "K:75", "test_c4_07_contrats_et_parc.", undefined, { atteste: false }),
        p("K22", 1, "Les équipements installés sont rattachés au compte qui les exploite.", "K:76", "test_c4_07_import_et_groupe.", undefined, { atteste: false }),
        p("K23", 1, "Un parc réparti sur plusieurs sites se lit site par site et en consolidé.", "K:77", "test_c4_07_contrats_et_parc (offload_parc).", undefined, { atteste: false }),
        p("K24", 1, "Les échéances réglementaires sont distinguées des échéances commerciales.", "K:78", "test_c4_07_echeances.", undefined, { atteste: false }),
        p("K25", 1, "Les commandes arrivées qu'aucun client n'est venu reprendre sont listées.", "K:86", "test_c4_08_cycle, test_c4_08_import.", undefined, { atteste: false }),
        p("K26", 1, "Les interventions terminées et non retirées sont relancées après le délai que vous fixez.", "K:87", "test_c4_08_inactif_et_reponse.", undefined, { atteste: false }),
        p("K27", 1, "Le stock immobilisé par une commande non reprise est chiffré.", "K:88", "test_c4_08_cycle.", undefined, { atteste: false }),
        p("K28", 1, "Une pièce commandée pour un compte inactif est rattachée à sa fiche.", "K:89", "test_c4_08_inactif_et_reponse.", undefined, { atteste: false }),
        p("K29", 1, "Les affaires closes sans suite sont distinguées de celles qui attendent encore.", "K:90", "test_c4_08_cycle, test_c4_08_import.", undefined, { atteste: false }),
        p("K30", 1, "Un compte relancé deux fois sans réponse passe en décision manuelle.", "K:91", "test_c4_08_cycle.", undefined, { atteste: false }),
        p("K31", 1, "La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD.", "K:92", "test_c4_08_cycle.", undefined, { atteste: false }),
        p("K32", 1, "Le magasin voit en une liste ce qui dort et depuis combien de temps.", "K:93", "test_c4_08_cycle ; écran « Affaires restées en plan ».", undefined, { atteste: false }),
        p("K33", 1, "Un compte suivi en direct par un commercial est exclu du cycle automatique.", "K:100", "test_c4_05_reprise_en_main.", undefined, { atteste: false }),
        p("K34", 1, "Le commercial en charge reprend la main sur un compte d'un seul geste.", "K:101", "test_c4_05_reprise_en_main.", undefined, { atteste: false }),
        p("K35", 1, "Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit.", "K:102", "test_c4_03_message.", undefined, { atteste: true }),
        p("K36", 1, "Une demande d'arrêt vaut retrait immédiat et définitif du cycle.", "K:103", "test_c4_03_reponse.", [A2REC], { atteste: true }),
        p("K37", 1, "Les listes d'exclusion se tiennent par compte, par secteur et par commercial.", "K:104", "test_c4_05_exclusions.", undefined, { atteste: false }),
        p("K38", 1, "Le système s'arrête de lui-même au premier doute, et vous le signale.", "K:105", "c4_10 : coupe-circuit (voir 64).", undefined, { atteste: true, note: "Jugé « atteste: true » à tort le 06/10 ; vrai depuis c4_10." }),
        p("K39", 1, "Chaque message parti reste au journal, daté et consultable.", "K:106", "test_c4_03_cycle.", undefined, { atteste: true }),
        p("K40", 1, "Le chiffre d'affaires remis en jeu se lit vague par vague.", "K:113", "test_c4_09_pilotage.", undefined, { atteste: false }),
        p("K41", 1, "Les comptes réactivés sont suivis jusqu'à leur première commande.", "K:114", "test_c4_03_issues.", undefined, { atteste: false }),
        p("K42", 1, "Le taux de réponse se compare par segment, par canal et par message.", "K:115", "test_c4_09_pilotage.", undefined, { atteste: false, note: "Les messages d'échéance n'ont pas de réponse rattachée." }),
        p("K43", 1, "Les échéances honorées et les commandes reprises alimentent un tableau de suivi.", "K:116", "test_c4_09_pilotage.", undefined, { atteste: false }),
        p("K44", 1, "Les résultats se lisent par entité, par site et en consolidé.", "K:117", "test_c4_09_pilotage.", undefined, { atteste: false }),
        p("K45", 1, "Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.", "K:118", "test_c4_09_arretes ; boutons « Exporter vers un tableur ».", undefined, { atteste: false }),
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   FILED — factures fournisseurs (module A4)
   Source : omega/CHIFFRAGE/filed.md (06/10) ; NOTES-A4 de worker-a4
   jusqu'au 19/10 (a4_33 → a4_51). fac = lib/produits/factures.ts,
   cap = lib/produits/capacites/factures.ts, page = app/offres/factures-
   fournisseurs/page.tsx, bento = components/produits/factures/Bento.tsx,
   fr = Francais.tsx, accueil = app/page.tsx, content = lib/content.ts.
   La ligne 121 (maquettes, noms fictifs) est hors décompte.
   ══════════════════════════════════════════════════════════════════════ */

const MAIL = lot("Connecteur OAuth Gmail / Outlook en lecture, avec relevé périodique (6 j). Aujourd'hui le client transfère vers l'adresse dédiée factures@recu.omegaai.fr ; a4_51 (écrit, à poser) permet plusieurs boîtes.");
const MAILT = tiers("Google : vérification de l'application + audit CASA (scope restreint, ≈ 500–4 500 $ par an) ; Microsoft : vérification d'éditeur (gratuite).");
const COMPTA = lot("Déployer l'ouvrier compta (Pennylane, QuickBooks, Cegid Loop ; 25 tests Deno) et valider chaque format sur un vrai dossier (1 j + 3 j).");
const COMPTAT = tiers("Comptes développeur ou partenaire des éditeurs : Intuit, Pennylane, référent Cegid (A-FAIRE-TEO § 9).");
const VOIE1 = decision("Voie 1 (Omega opérateur de dématérialisation, plateforme agréée en marque blanche) choisie le 06/10, a4_16 et a4_18 construits : le texte de la page dit le contraire, à trancher.");
const PHOTO = decision("Photo « lue quand même » (fac:71, 268) contre « part en anomalie » (cap:124) : trancher le texte ; le lecteur lit les images.");
const FACTURE_VRAIE = "Une vraie facture (F-2026-0413) passée de bout en bout sur la recette, le 05/10.";

const FILED: Moteur = {
  cle: "filed",
  nom: "FILED",
  libelle: "Factures fournisseurs",
  but: "Lire chaque facture fournisseur, la contrôler, la faire valider, la comptabiliser, l'archiver et l'envoyer à la comptabilité. Le cycle est entièrement tracé.",
  flux: [
    {
      nom: "Réception",
      detail: "Pièce reçue par dépôt, par courriel (adresse dédiée → filed.reception, a4_20) ou par la plateforme agréée (facture électronique structurée, a4_18) → public.pieces (bucket omega-clients) → trigger pieces_demander_lecture → travail lecteur.lire.",
    },
    {
      nom: "Traitement",
      detail: "Lecteur A1 (fonction Edge, IA ; XML Factur-X lu sans IA) écrit ses valeurs au format du socle → filed_controler_facture / filed_apres_controle (a4_08, a4_11) : identité du fournisseur (SIREN, TVA intracommunautaire par clé de Luhn, IBAN ; a4_04, a4_10, a4_14, a4_43), mentions et contre-valeur (a4_27), devise, TVA multi-taux, autoliquidation (a4_22), doublons (a4_32, a4_43), rapprochement commande / réception / facture (a4_16, a4_23), changement d'IBAN (a4_30), catégories d'achat de l'organisation (a4_47).",
    },
    {
      nom: "Validation",
      detail: "Circuit de validation (a4_07) : filed_circuits → regles_validation ; deux approbations au-delà d'un seuil ; délégation datée ; saisie et approbation par deux personnes distinctes (a4_13) ; comptabilisation réservée et séparation des tâches (a4_48, désactivées par défaut) ; réponses au fournisseur toujours validées (a4_38).",
    },
    {
      nom: "Envoi",
      detail: "Comptabilisation → écritures (a4_17 : 401, 44566, 44562, 512, 530 ; FEC ; lettrage) → archive probante (a4_05, SHA-256) et registre figé (a4_31) → export comptable à la demande ou à date fixe (a4_25, a4_33 : CSV Pennylane, Sage, Cegid, QuickBooks, FEC) ; API comptable (a4_28, ouvrier compta) ; échange avec la plateforme agréée (a4_18, statuts 200 à 213) ; dossier de sortie ZIP (a4_33, ouvrier sortie).",
    },
    {
      nom: "Journal",
      detail: "journal_opposable, filed_historique chaîné par empreintes (a4_46), filed_journal_continuite (a4_31), conservation légale 10 ans hors effacement (a4_40, a4_41) ; pilotage (a4_06) : engagé du mois, échéancier, délai de traitement, pièces en cours, indicateurs filed.* ; compteur de pièces par mois (a4_50, à poser).",
    },
  ],
  crons: ["filed_produire_exports (exports programmés, a4_06 / a4_33)", "sortie (chaque minute, fonction Edge A4 619a04b : à déployer)", "tache_envois du socle (toutes les 5 min)"],
  ou: [
    "Migrations omega/migrations/a4_01 → a4_51 (a4_01 → a4_48 posés et verts ; a4_49, a4_50, a4_51 écrits, à poser ; a4_26b et a4_41 à poser à la main)",
    "Tests omega/tests/filed/ : ^test_a4_ et test_44 : 91/91 sur la recette le 18/10 ; 93/93 en local avec a4_51",
    "Fonctions Edge omega/functions/compta (26 tests Deno) et omega/functions/sortie (7 tests Deno) : à déployer",
    "Écran /espace2/filed (Documents reçus, Boîte de réception, À payer, Fournisseurs, Comptabilité)",
    "Banc du 18/10 : 36 exemples de la norme Factur-X / FeRD lus (méthode xml, 0 € d'IA), écarts vérifiés contre le XML",
  ],
  versLeVrai:
    "Pose en production des 32 lots et des migrations du socle F1–F3, tests verts en production (3 j) ; pilote sur 200 à 500 pièces réelles d'un client, formats variés, FEC relu par un expert-comptable (10 j, honoraires ½ j) ; écarts révélés par le pilote (5 j). " + FACTURE_VRAIE,
  familles: [
    {
      nom: "Héros, bandeau, principe (lib/produits/factures.ts)",
      promesses: [
        p("1", 1, "« Vos équipes ne ressaisiront plus une seule facture. »", "fac:49-50", "Lecture et intégration (socle F2, A1), contrôles (a4_11).", undefined, { note: "Vrai pour les pièces lues ; la ressaisie reste pour ce qui part en anomalie (champs manquants, valeurs non sûres)." }),
        p("2", 0, "« Vous connectez une messagerie. C'est la seule chose à faire. »", "fac:51", "Réception par adresse dédiée (socle 18a) + a4_20. Il faut aussi installer FILED (filed_installer, exercice, plan) : ce n'est pas « la seule chose ».", [MAIL, MAILT]),
        p("3", 1, "« FILED lit chaque pièce qui arrive, recoupe ses montants et la classe jusqu'au dossier de votre comptabilité. »", "fac:52", "Lecteur (A1) + filed_controler_facture (a4_11) + écritures (a4_17) + export (a4_25)."),
        p("4", 2, "Bandeau : « PDF »", "fac:69", FACTURE_VRAIE + " PDF natif lu en vrai."),
        p("5", 1, "« Scan »", "fac:70", "Lecteur (A1).", [preuve("Un vrai scan.")]),
        p("6", 0, "« Photo prise sur le parking »", "fac:71", "Le lecteur (A1) lit les images.", [PHOTO]),
        p("7", 1, "« Pièce jointe »", "fac:72", "a4_20 (courriel → document)."),
        p("8", 0, "« Montant écrit dans le corps du mail »", "fac:73", "a4_20 : un courriel sans pièce lisible lève une alerte « à lire » ; le corps du mail n'est pas lu comme une facture.", [decision("Contredit la FAQ fac:268 ; cohérent avec cap:119-120 (anomalie). Trancher le texte.")]),
        p("9", 1, "« Facture-X »", "fac:74", "a4_16 (la valeur XML fait foi), lecteur ; 36 exemples de la norme lus au banc du 18/10.", [preuve("Une vraie Factur-X d'un fournisseur.")]),
        p("10", 0, "« Ticket de caisse froissé »", "fac:75", "Lecteur A1 (cap:32, atteste: false).", [lot("Rattachement d'un ticket à une dépense sans fournisseur identifié (2 j).")]),
        p("11", 1, "« Avoir »", "fac:76", "nature = avoir (socle), écritures inversées (a4_17), rapprochement d'avoir (a4_08)."),
        p("12", 1, "« Relevé »", "fac:77", "a4_34 (11/10) : filed_importer_releve (CAMT.053, CSV), rapprochement de chaque débit avec la facture validée (points : numéro, IBAN, nom, échéance), filed_regler_par_releve (^test_a4_34_)."),
        p("13", 1, "« Note de frais »", "fac:78", "a4_35, a4_36, a4_37 (11/10, 15/10) : filed_declarer_note_frais, compte du personnel 421, remboursement, devise, envois Cegid et QuickBooks (^test_a4_35_, 36, 37)."),
        p("14", 0, "« Facture écrite à la main »", "fac:79", "Lecteur A1 (cap:32, atteste: false).", [preuve("Des manuscrits réels (A1).")]),
        p("15", 1, "« Plusieurs pièces dans un même fichier »", "fac:80", "a4_21 + lecteur v24 (découpage).", [preuve("Une vraie pièce multi-factures sur le banc.")]),
        p("16", 0, "« Vous connectez une messagerie une fois, puis tout ce qui y arrive en ressort classé au bon fournisseur. »", "fac:100", "Identité fournisseur (a4_10), a4_20 ; un fournisseur nouveau attend une confirmation.", [MAIL, MAILT]),
        p("17", 2, "« FILED recoupe donc le HT, la TVA et le TTC de chaque facture, et ne la classe que si les trois montants tombent juste. »", "fac:114", "Contrôle des totaux (a4_11), tolérance 0,05. " + FACTURE_VRAIE),
        p("18", 1, "« Chaque pièce lue s'ajoute au total engagé du mois, fournisseur par fournisseur, et ce qui attend encore votre validation reste visible à part. »", "fac:121", "filed_engage_mois, filed_pieces_en_cours (a4_06), écran."),
        p("19", 1, "« Vous n'avez donc aucun tableur à tenir à côté. »", "fac:121", "a4_06."),
      ],
    },
    {
      nom: "Paliers et prix",
      promesses: [
        p("20", 0, "Prix des paliers (« à définir »)", "fac:135, 149, 165", "Hors code.", [decision("Le prix des paliers.")]),
        p("21", 0, "« Vous payez les pièces, pas les utilisateurs. » / « Le prix suit le nombre de pièces qui passent » / « Vous changez de palier d'un mois sur l'autre. »", "page:424-426", "a4_50 (19/10, écrit) : paliers sans prix, abonnement, compteur par mois par déclencheur sur filed_documents (filed_compteurs_pieces), alerte à 80 % et au dépassement (92/92 en local).", [lot("a4_50 à poser ; facturation du client (A5, 5 j)."), tiers("Prestataire de paiement (Stripe ≈ 1,5 % + 0,25 € par paiement).")]),
        p("22", 0, "« 20 / 100 / 500 factures par mois »", "fac:140, 155, 171", "a4_50 (écrit) : quota par palier, alerte à 80 %, décision au dépassement.", [lot("a4_50 à poser sur la recette.")]),
        p("23", 0, "« Une boîte mail connectée » / « Deux boîtes » / « Boîtes mail illimitées »", "fac:141, 156, 172", "a4_51 (19/10, écrit) : filed_boites sur les expéditeurs du socle, société par boîte, limite du palier (93/93 en local).", [lot("a4_51 à poser sur la recette.")]),
        p("24", 1, "« Classement par fournisseur »", "fac:142", "a4_10, socle F2."),
        p("25", 1, "« Export mensuel pour la comptabilité »", "fac:143", "a4_33 (11/10) : filed_programmer_envoi (fec, pennylane, sage, cegid, quickbooks ; cadence et jour), private.filed_produire_envois (^test_a4_33_)."),
        p("26", 0, "« Historique de trois mois » / « de douze mois » / « Historique complet »", "fac:144, 159, 175", "Aucune durée de consultation par palier ; l'archivage probant (a4_05), le registre figé (a4_31) et la conservation légale (a4_40) gardent tout dix ans.", [decision("Teo (17/10) : « historique complet pour tous ». Le texte des paliers reste à changer (vitrine) ; le chantier (7) « durées par palier » le contredit, à confirmer.")]),
        p("27", 2, "« Recoupement HT / TVA / TTC »", "fac:157", "Voir 17. " + FACTURE_VRAIE),
        p("28", 0, "« Transmission directe à la comptabilité »", "fac:158", "Fichiers d'import (a4_25) ; envoi par API Pennylane, QuickBooks, Cegid Loop (a4_28, ouvrier compta sur doubles).", [COMPTA, COMPTAT]),
        p("29", 0, "« Assistance par mail » / « Assistance prioritaire » / « Interlocuteur dédié »", "fac:160, 177, 192", "Hors code.", [tiers("Organisation du support (temps humain, adresse de support).")]),
        p("30", 1, "« File de validation partagée »", "fac:173", "Demandes de validation (socle), circuit (a4_07), écran « À valider »."),
        p("31", 1, "« Catégories d'achat sur mesure »", "fac:174", "a4_47 (18/10) : liste de catégories propre à l'organisation ; private.filed_categories_lecteur pour A1."),
        p("32", 1, "« Journal de tout ce qui a été lu »", "fac:176, 239", "journal_opposable, filed_historique immuable, filed_journal_continuite (a4_31), chaînage a4_46."),
        p("33", 0, "Cabinet : « Un espace par dossier client »", "fac:188", "Une organisation = un client (socle).", [lot("Chantier (5) de Teo : un cabinet qui voit plusieurs organisations, bascule, droits (5 j, socle et A3).")]),
        p("34", 0, "« Vue d'ensemble sur tous les dossiers »", "fac:189", "Rien.", [lot("Tableau consolidé multi-organisations (3 j), après 33.")]),
        p("35", 0, "« Marque du cabinet »", "fac:190", "Rien.", [lot("Marque blanche : logo, adresse d'envoi, domaine (3 j)."), tiers("Domaine du cabinet.")]),
        p("36", 0, "« Reversement sur les abonnements »", "fac:191", "Rien.", [lot("Commissionnement (2 j), dépend de 21.")]),
      ],
    },
    {
      nom: "Garde-fous, conformité, FAQ, clôture",
      promesses: [
        p("37", 0, "« FILED lit vos comptes sans y toucher. »", "fac:217-218", "FILED écrit les écritures d'achat (a4_17), pose des comptes du FEC repris (a4_24), crée un compte fournisseur chez Pennylane et un Vendor chez QuickBooks (a4_28).", [decision("Reformuler : « rien n'entre dans vos comptes sans validation ».")]),
        p("38", 1, "« Il n'écrit à personne. » / « FILED n'envoie aucun message en votre nom, ni à vos clients, ni à vos fournisseurs, ni à votre banque. »", "fac:223-225", "Aucun envoi sans validation : a4_38 (17/10) prépare une réponse au fournisseur (pièce manquante, contestation, confirmation) qui ne part qu'approuvée par une personne, jamais sous accord permanent.", [VOIE1], { note: "Avec la voie 1, les statuts de cycle de vie (a4_18) sont des messages au fournisseur en votre nom ; et a4_38 écrit, sur décision." }),
        p("39", 1, "« Ses accès s'arrêtent à la lecture, donc il ne peut pas payer à votre place. »", "fac:225, 229, 279", "Aucun moyen de paiement ; le paiement est seulement noté (a4_15, a4_34).", undefined, { note: "« Accès en lecture » est faux pour la comptabilité (voir 37) ; « ne peut pas payer » est vrai." }),
        p("40", 1, "« Zéro message envoyé en votre nom »", "fac:228", "Voir 38.", [VOIE1]),
        p("41", 1, "« Aucune pièce n'est effacée. » / « Un doublon est mis de côté au lieu d'être effacé »", "fac:233-236", "Doublon → état « doublon », consultable (socle) ; registre figé, effacement refusé (a4_31)."),
        p("42", 1, "« un montant douteux attend votre validation avant d'être classé »", "fac:235", "Contrôles bloquants → bloquee (a4_11)."),
        p("43", 1, "« Vos fichiers d'origine restent tels que vous les avez reçus, donc vous pouvez tout récupérer quand vous voulez. » / « Chaque pièce gardée dans son format d'origine »", "fac:235, 238", "Fichier d'origine dans Storage, empreinte (a4_05) ; a4_33 : dossier de sortie ZIP par période (index, FEC, empreintes, LISEZMOI), ouvrier sortie ; a4_49 (écrit) : sortie complète de toutes les tables en JSON Lines.", [lot("Déployer l'ouvrier sortie (A4 619a04b) ; poser a4_49.")]),
        p("44", 2, "« Depuis le 1ᵉʳ septembre 2026, toute entreprise établie en France doit pouvoir recevoir des factures électroniques. »", "fac:250", "Fait vérifié sur impots.gouv.fr (NOTES-A4)."),
        p("45", 0, "« FILED ne vend pas cette mise en conformité : le raccordement relève de votre outil de facturation. »", "fac:250, 291 ; accueil:604", "a4_16 et a4_18 construits pour la voie 1.", [VOIE1, tiers("Plateforme agréée en marque blanche : contrat et coût par flux à négocier (A-FAIRE-TEO § 9).")]),
        p("46", 0, "FAQ « Que faut-il installer ? Rien. … Aucun logiciel de facturation à connecter, aucun fichier client à importer, aucune extension »", "fac:263-264", "Vrai côté client ; l'installation FILED (exercice, plan comptable, circuit, comptes système) se fait chez nous.", [decision("Dire « faite par nous ».")]),
        p("47", 0, "FAQ « photo prise de travers … Elle est lue quand même. … le format ne vous concerne plus. »", "fac:267-268", "Lecteur A1.", [PHOTO]),
        p("48", 1, "FAQ « Elle reçoit un dossier classé dans le format qu'elle utilise déjà, à la date convenue pendant l'installation. »", "fac:275", "Formats Pennylane, Sage, Cegid, QuickBooks (a4_25), FEC (a4_17) ; date convenue : a4_33.", undefined, { note: "EBP, ACD, Inqom, Tiime… : FEC générique seulement." }),
        p("49", 1, "FAQ « Jamais. Il lit, recoupe, classe et transmet à votre comptabilité. »", "fac:279", "Voir 38.", [VOIE1]),
        p("50", 2, "FAQ « HT, TVA et TTC sont recoupés entre eux ; si les trois ne tombent pas juste, la pièce est mise de côté et vous est signalée. Rien n'entre en silence dans votre comptabilité. »", "fac:283", "Voir 17. " + FACTURE_VRAIE),
        p("51", 0, "FAQ « Sur des serveurs situés dans l'Union européenne. »", "fac:287", "Base à Francfort (fr:20) ; la lecture passe par un service d'IA hors UE (fr:23-25) : la phrase ne vaut que pour le stockage.", [tiers("Lecteur en région UE : Bedrock eu-central-1, compte AWS (A-FAIRE-TEO « AWS Bedrock Francfort »).")]),
        p("52", 0, "FAQ « vous pouvez les récupérer ou tout effacer à tout moment »", "fac:287", "Récupérer : a4_33. Effacer : a4_40 (17/10, décision de Teo) : tout sauf ce que la loi garde dix ans (filed_conservation, chaînée), purge au terme (a4_41).", [decision("« Tout effacer » se heurte à la conservation légale : reformuler (effacement à la résiliation, après export, hors dépôt légal).")]),
        p("53", 1, "FAQ « Puis-je arrêter à tout moment ? Oui, sans préavis. Vous repartez avec vos pièces. »", "fac:294-295", "Sortie (a4_33), effacement de l'organisation par le socle avec dépôt légal (a4_40), bilan filed_bilan_effacement.", undefined, { note: "« Sans préavis » relève du contrat." }),
        p("54", 0, "Clôture « une messagerie connectée suffit à remettre l'ensemble en ordre »", "fac:312", "Voir 2.", [MAIL, MAILT]),
      ],
    },
    {
      nom: "Le périmètre, catalogue (lib/produits/capacites/factures.ts)",
      promesses: [
        p("55", 1, "« Une facture fournisseur traverse six étapes avant d'entrer en comptabilité. »", "cap:20", "Les six familles ci-dessous."),
        p("56", 1, "« Le périmètre se règle à l'installation … et les contrôles restent actifs quel que soit le réglage. »", "cap:22", "filed_reglages (a4_02, a4_08) ; les contrôles ne se désactivent pas."),
        p("57", 1, "« Une adresse dédiée reçoit les pièces, et l'expéditeur est repris sur la ligne d'achat. »", "cap:28", "a4_20.", undefined, { atteste: true }),
        p("58", 1, "« Les factures en PDF sont lues de la même façon, qu'elles soient natives ou scannées. »", "cap:29", "Natif : " + FACTURE_VRAIE + " Scanné : lecteur.", [preuve("Un scan en vrai.")], { atteste: true }),
        p("59", 1, "« Un message sans pièce jointe lisible part en anomalie, il n'est jamais classé au jugé. »", "cap:30", "a4_20 (alerte « à lire »).", undefined, { atteste: true }),
        p("60", 1, "« Un fichier qui contient plusieurs factures est découpé pièce par pièce. »", "cap:31", "a4_21 + lecteur v24.", [preuve("Une vraie pièce multi-factures sur le banc.")], { atteste: false }),
        p("61", 0, "« Les factures manuscrites et les tickets de caisse sont lus et rattachés. »", "cap:32", "Lecteur A1.", [lot("Tickets sans fournisseur (2 j) ; voir 10 et 14."), preuve("Manuscrits réels.")], { atteste: false }),
        p("62", 1, "« Les formats structurés Factur-X, UBL et CII sont reçus et lus tels quels. »", "cap:33", "a4_16 (XML fait foi) + lecteur ; 36 exemples de la norme lus au banc du 18/10.", [tiers("UBL et CII seuls (sans PDF) par la plateforme agréée : voie 1.")], { atteste: false }),
        p("63", 0, "« Un dépôt par lot arrive depuis un dossier partagé ou un transfert de fichiers. »", "cap:34", "Rien.", [lot("A2 : dossier partagé (Drive, SharePoint) ou SFTP (4 j)."), tiers("Serveur SFTP (≈ 10 €/mois).")], { atteste: false }),
        p("64", 1, "« Un historique de plusieurs exercices se reprend en une fois à l'installation. »", "cap:35", "a4_24 (FEC) + a4_32 (pièces).", [lot("Écran d'installation (A3) qui envoie les FEC (1 j).")], { atteste: false }),
        p("65", 2, "« L'en-tête : fournisseur, numéro de pièce, date d'émission et date d'échéance. »", "cap:42", FACTURE_VRAIE, undefined, { atteste: true }),
        p("66", 1, "« Les lignes de détail : désignation, quantité, prix unitaire et remise. »", "cap:43", "Champ lignes du lecteur (A1), filed_factures_lignes, rapprochement (a4_08).", undefined, { atteste: false, note: "montant.lignes attend un champ « remise au pied » du lecteur (CHAMPS-LECTURE)." }),
        p("67", 1, "« La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits. »", "cap:44", "a4_11, a4_22, a4_27 ; libellé « TVA étrangère » (a4_44), taux lisibles (a4_45).", undefined, { atteste: false }),
        p("68", 1, "« La devise, le taux de change et la contre-valeur en euros au jour d'émission. »", "cap:45", "a4_22, a4_27.", [lot("Ouvrier des cours BCE (B7, ½ j ; premier bilan taux-bce attendu).")], { atteste: false }),
        p("69", 1, "« Les références de commande, de bon de livraison et de contrat citées sur la pièce. »", "cap:46", "refs lues (A1), rattachement de la commande (socle F3, a4_23).", undefined, { atteste: false }),
        p("70", 1, "« La catégorie d'achat et un résumé de la pièce, produits à la lecture. »", "cap:47", "Lecteur ; catégories de l'organisation (a4_47).", undefined, { atteste: true }),
        p("71", 1, "« Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire. »", "cap:48", "a4_27.", undefined, { atteste: false }),
        p("72", 2, "« Le total hors taxes, la TVA et le total toutes taxes sont recoupés au pied de la facture. »", "cap:55", "Voir 17. " + FACTURE_VRAIE, undefined, { atteste: true }),
        p("73", 1, "« Les doublons sont détectés, y compris quand le fichier a été renommé ou rescanné. »", "cap:56", "Empreinte du fichier (renommé) ; fournisseur + numéro (rescanné) ; a4_43 : le doublon préfère la pièce de même date et même montant.", [preuve("Le rescan en vrai.")], { atteste: true }),
        p("74", 1, "« Un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte. »", "cap:57", "a4_30.", undefined, { atteste: false }),
        p("75", 0, "« Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. »", "cap:58", "Forme et clé (a4_04, a4_14) ; SIREN exigé seulement en France (a4_43) ; registres Sirene et VIES (B7) ; Royaume-Uni sans HMRC, identité attestée par une personne (a4_39).", [tiers("Clé Sirene (A-FAIRE-TEO § 6, gratuite) ; ouvrier B7 en production.")], { atteste: false }),
        p("76", 1, "« La commande, la réception et la facture sont rapprochées avant toute validation. »", "cap:59", "a4_08, a4_23.", undefined, { atteste: false, note: "Bloquant seulement si reception_exigee ou commande_exigee est réglé." }),
        p("77", 1, "« Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé. »", "cap:60", "a4_08.", undefined, { atteste: false }),
        p("78", 1, "« Une pièce aux champs manquants ou au total nul est mise en attente, jamais classée. »", "cap:61", "a4_11.", undefined, { atteste: true }),
        p("79", 1, "« Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention. »", "cap:62", "a4_02.", undefined, { atteste: false, note: "Contredit cap:155-156 (voir 109)." }),
        p("80", 1, "« L'approbation suit le montant, le centre de coût et la société concernée. »", "cap:69", "a4_07.", undefined, { atteste: false }),
        p("81", 1, "« Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées. »", "cap:70", "a4_07 + socle.", undefined, { atteste: false }),
        p("82", 1, "« Une délégation d'approbation se pose pour une absence, avec sa date de fin. »", "cap:71", "Socle + a4_31 + écran Équipe.", undefined, { atteste: false }),
        p("83", 1, "« L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau. »", "cap:72", "a4_07, a4_31.", undefined, { atteste: false }),
        p("84", 1, "« Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture. »", "cap:73", "filed_factures_annexes (a4_07), écran.", undefined, { atteste: false }),
        p("85", 1, "« Celui qui saisit et celui qui approuve ne peuvent pas être la même personne. »", "cap:74", "Socle 19c + filed_saisisseurs (a4_13) ; séparation des tâches a4_48.", undefined, { atteste: false }),
        p("86", 1, "« L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur. »", "cap:81", "a4_02 + a4_24 (FEC).", undefined, { atteste: false, note: "Le centre de coût ne s'apprend pas depuis les FEC (ils n'en portent pas)." }),
        p("87", 1, "« Chaque pièce est affectée au plan comptable et au centre de coût qui la portent. »", "cap:82", "a4_01, a4_02.", undefined, { atteste: false }),
        p("88", 1, "« Chaque pièce lue est écrite dans votre espace, avec son fournisseur et sa catégorie. »", "cap:83", "Socle F2. " + FACTURE_VRAIE, undefined, { atteste: true }),
        p("89", 1, "« Les pièces classées s'ajoutent à une table que rien ne modifie après coup. »", "cap:84", "Registre figé (a4_31), écritures non réécrites (a4_17).", undefined, { atteste: true }),
        p("90", 1, "« Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie. »", "cap:85", "a4_03, a4_09.", undefined, { atteste: false }),
        p("91", 1, "« L'archivage est à valeur probante, et la piste d'audit reste reconstituable. »", "cap:86", "a4_05 (empreintes, journal), a4_46 (historique chaîné).", [preuve("« Probant » au sens fiscal (BOI-CF-COM-10-80) : piste d'audit fiable écrite et validée par l'expert-comptable du pilote (1 j).")], { atteste: false }),
        p("92", 1, "« Le journal des pièces reçues est numéroté en continu et ne se modifie pas. »", "cap:87", "a4_31.", undefined, { atteste: false }),
        p("93", 1, "« L'engagé du mois se lit par fournisseur, par société et par centre de coût. »", "cap:94", "a4_06.", undefined, { atteste: false }),
        p("94", 1, "« L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours. »", "cap:95", "a4_06, a4_15.", undefined, { atteste: false }),
        p("95", 1, "« Le délai moyen de traitement se mesure de la réception au classement. »", "cap:96", "a4_06.", undefined, { atteste: false }),
        p("96", 1, "« Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu. »", "cap:97", "a4_06.", undefined, { atteste: false }),
        p("97", 1, "« Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. »", "cap:98", "a4_06.", undefined, { atteste: false }),
      ],
    },
    {
      nom: "Les cas tordus",
      promesses: [
        p("98", 1, "« l'adresse d'envoi est reprise telle quelle sur la ligne d'achat. C'est le contenu de la facture qui décide du fournisseur, pas l'expéditeur. »", "cap:112", "a4_20, a4_10."),
        p("99", 1, "« La pièce part en anomalie pour champ manquant. » (sans numéro)", "cap:116", "a4_11."),
        p("100", 1, "« Le message part en anomalie avec sa mention » (montant dans le corps)", "cap:120", "a4_20."),
        p("101", 0, "« La pièce part en anomalie plutôt que d'être devinée. » (photo)", "cap:124", "Le lecteur lit les photos.", [PHOTO]),
        p("102", 1, "« Le classement s'arrête dès que l'écart … dépasse cinq centimes. »", "cap:128", "tolerance_totaux 0,05 (a4_02, a4_11)."),
        p("103", 0, "« Les montants sont lus tels qu'ils figurent sur la pièce, sans conversion. La contre-valeur en euros reste à la charge de votre comptabilité. »", "cap:132", "Faux : a4_22 et a4_27 convertissent.", [decision("Texte à remplacer (C5 l'a en main).")]),
        p("104", 0, "« Un taux exotique passe s'il tombe juste, et s'arrête sinon. »", "cap:136", "a4_11 : un taux qui n'existe pas en France est bloquant même s'il tombe juste ; a4_44 : « TVA étrangère facturée par un fournisseur établi hors de France ».", [decision("Trancher : le texte, ou le contrôle.")]),
        p("105", 1, "« Le doublon est reconnu même après un renommage ou un nouveau scan. La seconde copie est écartée et reste consultable. »", "cap:140", "Voir 73 (a4_43)."),
        p("106", 0, "« Le découpage automatique n'existe pas encore, et l'annoncer coûterait plus cher que de le dire. »", "cap:144", "Faux : a4_21 + lecteur v24 découpent (contredit cap:31).", [decision("Texte à remplacer.")]),
        p("107", 1, "« La pièce est mise en attente. » (total à zéro)", "cap:148", "a4_11."),
        p("108", 0, "« c'est votre comptabilité qui crée la fiche. Le système n'écrit rien dans votre plan comptable. »", "cap:152", "Fournisseur créé « à confirmer » par une personne (a4_10) ; mais la reprise FEC pose des comptes (a4_24) et l'envoi API crée des comptes fournisseurs (a4_28).", [decision("Reformuler.")]),
        p("109", 0, "« Elle est classée avec ses deux dates … c'est à votre comptabilité de décider de l'exercice. »", "cap:156", "Les deux dates sont gardées ; l'orientation vers l'exercice suivant est automatique (a4_02), ce qui contredit cap:62.", [decision("Trancher le texte.")]),
      ],
    },
    {
      nom: "À l'échelle d'un groupe",
      promesses: [
        p("110", 1, "« Chaque société, site ou filiale a son espace, ses fournisseurs et son plan comptable. Une direction financière lit le consolidé, un comptable de site ne voit que le sien. »", "cap:171", "Périmètres par société (socle), plan par société (a4_01).", undefined, { note: "Les fournisseurs sont par organisation, pas par société (réserve mineure)." }),
        p("111", 1, "« Saisie, approbation, comptabilisation et administration sont quatre rôles distincts. »", "cap:177", "Rôles du socle (gérant, admin, valideur, collaborateur) ; a4_48 (18/10) : comptabilisation réservée et séparation des tâches, FILED seul, désactivées par défaut."),
        p("112", 1, "« Une délégation se pose pour une absence et s'éteint à la date prévue. »", "cap:177", "Voir 82."),
        p("113", 1, "« Le montant décide du circuit : validation simple, double validation, accord de la direction. Le seuil est un réglage, et son historique reste lisible. »", "cap:183", "a4_07 (niveaux, direction) ; changements tracés.", [lot("Lecture de l'historique d'un circuit à l'écran (A3, ½ j).")]),
        p("114", 1, "« Chaque lecture, chaque décision et chaque export s'inscrivent dans un journal qui ne se modifie pas, y compris par nous. C'est ce qu'un commissaire aux comptes demande. »", "cap:189", "journal_opposable, empreintes (a4_05) ; a4_46 (18/10) : historique chaîné par SHA-256.", [decision("Envoi périodique du sceau d'historique au client, pour que « y compris par nous » se vérifie hors de notre base (horodatage qualifié eIDAS ≈ 0,05–0,20 € par jeton).")]),
        p("115", 0, "« Le système lit et écrit dans vos outils de comptabilité et de gestion. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation. »", "cap:195", "Fichiers (a4_25), API comptable (a4_28). « Outils de gestion » (ERP) : rien.", [COMPTA, COMPTAT]),
        p("116", 1, "« Engagé, délai de traitement, pièces bloquées et prévision de décaissement se lisent par société et en consolidé, avec un export daté. »", "cap:201", "a4_06."),
      ],
    },
    {
      nom: "Bento, maquettes, page (components/produits/factures)",
      promesses: [
        p("117", 1, "« Reçue → Lue → Recoupée → Classée → Transmise » ; « 5 étapes · 0 perdue »", "bento:141-145, 162", "Socle F1-F2, a4_11, a4_25.", undefined, { note: "« Transmise » : voir 28." }),
        p("118", 0, "« 3 canaux d'arrivée » ; « 0 pièce ressaisie »", "bento:297-298", "Courriel, dépôt (socle) ; plateforme agréée (a4_18, voie 1).", [VOIE1], { note: "« 0 ressaisie » : voir 1." }),
        p("119", 1, "« Pièce déjà reçue → Écartée » ; « Montants qui ne tombent pas juste → Mise de côté » ; « Fournisseur inconnu → Validation » ; « Doublon de numéro → Écartée » ; « Devise inattendue → Validation » ; « 12 contrôles »", "bento:308-320", "Socle, a4_10, a4_11, a4_27."),
        p("120", 1, "« Une seule file, courte, avec uniquement ce qui a besoin de vous. Le reste est déjà rangé. »", "bento:436", "Écran À valider + statuts."),
        p("122", 0, "Fait « Conception : France » ; « Hébergement : Union européenne » ; « Droit applicable : Français » ; « Facturation : Euros, TVA française »", "fr:29-32", "Base à Francfort.", [tiers("Lecture IA hors UE (voir 51) ; CGV de droit français ; facturation Omega (voir 21).")]),
        p("123", 0, "Méta : « Chaque facture fournisseur est lue quel qu'en soit le format, ses montants recoupés, la pièce classée et transmise à votre comptabilité. »", "page:97", "Voir 3, 6, 8.", [decision("« Quel qu'en soit le format » : voir 8 et 101.")]),
      ],
    },
    {
      nom: "Accueil, /offres, contenus",
      promesses: [
        p("124", 0, "« Vos équipes ne ressaisiront plus un seul document. »", "accueil:702", "Factures et natures classées (socle) ; contrats, courriers, bons sont classés par nature, pas lus en détail.", [lot("Extraction et contrôles pour les autres natures (2 j par nature, A1 + A4).")]),
        p("125", 1, "« Lit chaque document, le classe, rédige ce qui repart. »", "accueil:704", "a4_38 (17/10, décision de Teo, en minimal) : filed_preparer_reponse (pièce manquante, contestation, confirmation), brouillon dans filed_reponses, courriel adossé à une demande filed.repondre, jamais d'accord permanent (^test_a4_38_)."),
        p("126", 0, "« Chaque document reçu est lu, quels qu'en soient le type et le format — facture, bon de livraison, contrat, courrier —, ses informations extraites puis contrôlées, la pièce classée au bon dossier et la réponse qu'elle appelle rédigée. »", "content:145", "Nature lue et classée (socle) ; contrôles : factures et avoirs seulement ; réponse : a4_38.", [lot("Extraction et contrôles pour les contrats et courriers (2 j par nature).")]),
        p("127", 0, "« Tout document reçu, lu et contrôlé, classé au bon dossier, la réponse rédigée. »", "content:146", "Voir 126.", [lot("Voir 126.")]),
        p("128", 1, "« Le système FILED lit les factures fournisseurs reçues par mail et les range au journal d'achats, prêtes pour le cabinet »", "content:295", "a4_17, a4_20, a4_25."),
        p("129", 1, "/offres : « FILED — Lecture et classement »", "offres:401-404", "Lecteur + socle."),
        p("130", 0, "Accueil FAQ « Les modèles d'intelligence artificielle utilisés reçoivent le strict nécessaire à chaque tâche, jamais l'intégralité d'un fichier »", "accueil:600", "Faux pour FILED : le lecteur envoie la pièce entière au modèle (A1).", [decision("Reformuler, ou découper avant envoi (hors de portée pour une facture).")]),
        p("131", 0, "Accueil FAQ « Nous ne vendons pas de mise en conformité »", "accueil:604", "Voir 45.", [VOIE1]),
      ],
    },
  ],
};

/* ══════════════════════════════════════════════════════════════════════
   Le socle — ce que tous les moteurs partagent
   Source : ARCHITECTURE-MOTEURS.md § 1 et 7, omega/CONTRAT-OUVRIER.md,
   omega/CHIFFRAGE/production.md, A-FAIRE-TEO.md. Les « promesses » ici
   sont les garanties que le socle donne à chaque moteur, puis ce qui
   bloque la mise en production.
   ══════════════════════════════════════════════════════════════════════ */

const SOCLE: Moteur = {
  cle: "socle",
  nom: "Socle",
  libelle: "Base commune, file, envois, ouvriers",
  but: "La base Postgres commune (Supabase) : chaque moteur est un module posé dessus, qui ne voit les tables que par des portes et n'échange avec les autres que par des événements.",
  flux: [
    {
      nom: "Réception",
      detail: "Relevés (releves, instantanes, instantanes_lignes : un fichier déposé devient un relevé, releve.pret.<module> quand il est prêt) ; pièces (pieces, bucket omega-clients ; l'arrivée déclenche une lecture) ; réceptions (A2 : courriel Brevo sur recu.omegaai.fr, formulaire signé, WhatsApp → public.receptions → reception.nouvelle).",
    },
    {
      nom: "Traitement",
      detail: "File des travaux (travaux) et ouvriers Edge Deno appelés par cron : prendre_travaux (bail 10 min) → finir_travail ou echouer_travail (reprise 1, 2, 4… min, plafond 6 h) → battre_ouvrier ; deposer_travail idempotent ; publier_evenement dépose chez chaque module abonné (private.abonnements). Lecteur A1 : lecteur.lire, format du socle, plafond IA 5 € par jour et par client.",
    },
    {
      nom: "Validation",
      detail: "demandes_validation, regles_validation : tout ce qui part ou se décide y passe ; un seuil (montant, rôle) décide qui valide ; un demandeur n'approuve pas sa propre demande. Politiques (politiques) : accords permanents par sujet, quota et durée, activés par une personne habilitée, jamais par un module seul.",
    },
    {
      nom: "Envoi",
      detail: "envois, preparer_envoi, creer_envoi, confier_envoi : un envoi est toujours adossé à une demande validée ; douze verrous juste avant l'envoi ; réglages coupe / essai / reel ; arrêt général (envois_arret_general). Expéditeur A2 : envois.<fournisseur> (Brevo), remises par webhook (noter_remise, idempotente) ; un fournisseur n'est « branché » qu'après un envoi réel réussi.",
    },
    {
      nom: "Journal",
      detail: "journal_opposable : chaque décision et chaque envoi ; alertes (sauvegarde manquante, battement absent, échec définitif d'un travail) ; RLS par client_id sur toutes les tables ; comptes, entités, équipes, rôles et délégations.",
    },
  ],
  crons: ["tache_envois (toutes les 5 min)", "omega-messagerie (A2, non déployé : attend les secrets Google et Microsoft)", "alertes-quotidiennes (06 h 17, A5 : à déployer)", "les crons de chaque moteur (voir leur onglet)"],
  ou: [
    "Projets Supabase : recette ygwbgpowzlbdaajlsqkn (les ouvriers s'y déploient), production noepmkkplxshjbmqqxft (le coordinateur seul y pousse)",
    "Portes et contrat : omega/CONTRAT-OUVRIER.md ; extraits omega/SOCLE-EXTRAITS-*.sql ; tests du socle 44, 46, 51, 55",
    "Fonctions Edge déployées sur la recette : lecteur v34, reception v12, widget v1, export-complet v2, reput-reponse v2 ; à déployer : sortie, alertes-quotidiennes, expediteur, webhooks-ar24, messagerie",
    "Mise en production : omega/CHIFFRAGE/production.md, omega/MISE-EN-PRODUCTION.md, A-FAIRE-TEO.md § « Avant le premier client »",
  ],
  versLeVrai:
    "Un premier envoi réel par l'expéditeur du socle (Brevo de production, domaine vérifié), un premier fournisseur « branché », et les comptes de Teo : Google, Microsoft, Meta, AR24 (A-FAIRE-TEO).",
  familles: [
    {
      nom: "Ce que le socle garantit à chaque moteur",
      promesses: [
        p("S1", 1, "Rien ne part sans une demande validée par une personne ; un demandeur ne peut pas approuver sa propre demande.", "ARCHITECTURE-MOTEURS.md § 1", "demandes_validation, regles_validation, preparer_demande (lot 19 : exige_commentaire, exige_piece, exige_motif) ; socle 19c ; tests 44, 46, 51."),
        p("S2", 1, "Un envoi est toujours adossé à une demande ; douze verrous sont vérifiés juste avant l'envoi ; un arrêt général coupe tout.", "ARCHITECTURE-MOTEURS.md § 1", "envois, preparer_envoi, creer_envoi, confier_envoi, garder_envoi ; réglages coupe / essai / reel ; envois_arret_general ; verrous 19ab et D6 (données de santé jamais hors canal agréé)."),
        p("S3", 1, "Un module ne décide jamais seul d'envoyer : un accord permanent est activé par une personne habilitée, avec quota et durée.", "ARCHITECTURE-MOTEURS.md § 1", "politiques, activation_seul_autorisee, actions_sans_accord ; politiques_reput_garde (c3_03), c2_12, c4_18."),
        p("S4", 1, "Chaque décision et chaque envoi sont inscrits dans un journal opposable.", "ARCHITECTURE-MOTEURS.md § 1", "journal_opposable, private.journaliser_module.", [lot("G18 — protégé contre l'écriture, mais un administrateur de la base pourrait le modifier : chaînage par empreintes + export horodaté (1 j) ; FILED l'a fait pour ses tables (a4_46).")]),
        p("S5", 1, "Un ouvrier ne lit ni n'écrit jamais une table directement : il passe par une porte ; les modules ne lisent pas les tables les uns des autres, ils s'échangent des événements.", "omega/CONTRAT-OUVRIER.md", "Portes service_role (prendre_travaux, finir_travail, echouer_travail, deposer_travail, publier_evenement, battre_ouvrier) ; private.abonnements ; cashd.facture_reglee → REPUT, reception.nouvelle → REPUT et FILED, releve.pret.<module>."),
        p("S6", 1, "Un travail en échec est repris à délai croissant ; un échec définitif lève une alerte critique ; un ouvrier qui ne bat plus est signalé.", "omega/CONTRAT-OUVRIER.md § 1", "echouer_travail (1, 2, 4… min, plafond 6 h, essais_max) ; battre_ouvrier à chaque passage ; alerte « battement absent ».", [lot("Destination des alertes : un courriel vers Teo (via Brevo) + contrôle de disponibilité externe (1 j). Fonction alertes-quotidiennes (A5) à déployer.")]),
        p("S7", 1, "Une pièce déposée est lue par le lecteur, au format du socle, sous un plafond de dépense d'IA par client et par jour.", "omega/CONTRAT-OUVRIER.md § 2", "Trigger pieces_demander_lecture → lecteur.lire ; commencer_lecture, piece_a_lire, enregistrer_lecture (publie piece_lue.<module>) ; plafond_ia_jour_client 5 €, consommation_ia_jour ; lecteur v34 déployé.", [tiers("IA en région UE : Bedrock eu-central-1, compte AWS, utilisateur IAM, secrets de la fonction lecteur (A-FAIRE-TEO) ; sinon Anthropic en direct, hors UE.")]),
        p("S8", 1, "Un courriel, un formulaire ou un message WhatsApp reçu devient une réception, rattachée à l'envoi d'origine, qui déclenche les modules abonnés.", "omega/CONTRAT-OUVRIER.md § 4", "resoudre_boite, deposer_reception (idempotente sur client, canal, identifiant externe) ; fonction reception v12 ; recu.omegaai.fr (Brevo).", [tiers("WhatsApp : compte Meta Business (A-FAIRE-TEO § 1) ; messagerie du client (Gmail / Microsoft 365) : secrets Google et Microsoft, puis déployer messagerie + messagerie-oauth + cron omega-messagerie (A2).")]),
        p("S9", 1, "Un envoi est remis par un fournisseur branché, et sa remise (remis, rebond, plainte) revient par webhook, sans doublon.", "omega/CONTRAT-OUVRIER.md § 3", "private.tache_envois (5 min) → envois.brevo ; noter_remise idempotente ; branche = true seulement par migration du coordinateur après un envoi réel.", [tiers("Brevo de production : domaine d'envoi vérifié (SPF, DKIM, DMARC chez OVH), expéditeur, webhook transactionnel ; AR24 et meta_whatsapp restent branche = false.")]),
        p("S10", 1, "Chaque organisation ne voit que ses données ; les rôles, les périmètres et les délégations sont tenus par le socle.", "ARCHITECTURE-MOTEURS.md § 1", "RLS par client_id sur toutes les tables ; clients, entites, comptes_entites, equipes, equipes_membres ; rôles gerant / admin / valideur / collaborateur / lecteur ; délégations datées."),
      ],
    },
    {
      nom: "Ce qui bloque la mise en production (omega/CHIFFRAGE/production.md)",
      description: "≈ 9 jours d'équipe, ≈ 1 jour de Teo, ≈ 45 $ par mois avant le premier client. Rien ne tourne en production au 19/10.",
      promesses: [
        p("X1", 0, "Offre Supabase Pro pour la production : sauvegardes, jamais de mise en pause, 8 Go.", "production.md", "Rien à construire.", [tiers("Teo, 5 min : l'organisation est en Free (vérifié le 17/10). En Free : aucune sauvegarde, 500 Mo, pause après une semaine sans activité.")]),
        p("X2", 0, "La pose en production : gel, séquence de la recette, répétition en CI, paliers P1–P6, fonctions Edge et crons sur les versions figées, empreinte finale.", "production.md", "Les migrations et les tests existent sur la recette ; a4_26b et a4_41 se posent à la main.", [lot("4 j d'équipe ; Teo 2 min pour le relevé du schéma de la production.")]),
        p("X3", 0, "Une sauvegarde réussie avant la première étape : dump chiffré sur GitHub chaque nuit, restauration d'essai, preuve en base ; puis Scaleway Paris au premier client.", "production.md", "Tâche GitHub écrite (omega-sauvegarde.yml, A5, non approuvée).", [tiers("Secrets SUPABASE_DB_URL et SAUVEGARDE_PHRASE (Teo, 10 min), un premier run réussi ; coffre Scaleway Key Manager (A-FAIRE-TEO § 5)."), lot("Bascule vers Scaleway le jour du premier client (½ j).")]),
        p("X4", 0, "Le lecteur en région UE (Bedrock Francfort), sinon les pièces déposées ne sont pas lues en production.", "production.md", "Le client _partage sait parler à Bedrock ; plafond par client et par jour prévu.", [tiers("Compte AWS, utilisateur IAM limité à Bedrock, eu-central-1, accès au modèle, secrets de la fonction lecteur (Teo, 30 min) + essai de bout en bout.")]),
        p("X5", 0, "Brevo de production : aucun courriel ne part de la production sans domaine vérifié.", "production.md", "Webhook webhooks-brevo et expéditeur écrits.", [tiers("DNS chez OVH (SPF, DKIM, DMARC), expéditeur, webhook transactionnel, suivi d'ouverture coupé (Teo, 30 min ; A-FAIRE-TEO § 8).")]),
        p("X6", 0, "Vercel Pro pour omegaai.fr : l'offre Hobby est réservée à l'usage non commercial.", "production.md", "Rien à construire.", [tiers("20 $ par membre et par mois, le jour du premier client (Teo, 5 min).")]),
        p("X7", 0, "Sécurité : clé de service dans le Vault de production, rotation des clés partagées avec la recette, double authentification partout, garde-fous verts à chaque palier.", "production.md", "garde_fous.sql existe ; sans clé de service, les tâches planifiées n'appellent pas les fonctions.", [tiers("Teo : Vault (cle_service), MFA sur Supabase, Vercel, AWS, GitHub, Brevo."), lot("1 j : garde-fous, revue des conseils de sécurité Supabase après la pose.")]),
        p("X8", 0, "RGPD et contrats : DPA chez Supabase, AWS, Vercel, Brevo et Meta ; registre des traitements ; contrat client (article 28) ; politique de confidentialité alignée sur la réalité.", "production.md", "Rien n'est signé.", [tiers("Signatures de Teo (en ligne) ; HDS Scaleway au premier client santé."), lot("1,5 j : registre, rédaction et relecture des pages.")]),
        p("X9", 0, "Supervision : les alertes existent en base, il manque leur destination (courriel vers Teo) et un contrôle de disponibilité externe.", "production.md", "alertes, verifier_sauvegardes, battements, crons en échec.", [lot("1 j ; Teo choisit l'adresse.")]),
        p("X10", 0, "Support : une adresse, une procédure d'incident d'une page (qui regarde quoi, restaurer, couper les envois), des délais annoncés au contrat.", "production.md", "La procédure de sauvegarde existe ; envois_arret_general coupe tout.", [decision("Adresse et engagement de Teo ; ½ j pour la procédure.")]),
      ],
    },
  ],
};

/* ——— l'ordre des onglets ——— */
export const ECOSYSTEME: Moteur[] = [CASHD, REPUT, OFFLOAD, FILED, SOCLE];
