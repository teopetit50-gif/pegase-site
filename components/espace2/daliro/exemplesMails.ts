/* ══════════════════════════════════════════════════════════════════════
   DALIRO, les mails d'exemple (06/11/2026, demande de Teo : « plein de
   faux mails pour tout ce qui est boîte mail », en rapport avec le BTP)

   La boîte d'une entreprise du bâtiment en Guadeloupe : clients, maîtres
   d'ouvrage, maîtres d'œuvre, fournisseurs, sous-traitants, bureau de
   contrôle, mairie, assurance. Personnes, sociétés, adresses et chantiers
   fictifs (les chantiers d'exemple de ./exemplesEtoffes, mêmes identifiants
   que ./exemplesAppels) ; dates relatives au jour de la visite. Rien ici
   n'est écrit en base : la page (./Mails) garde les modifications dans ce
   navigateur.
   ══════════════════════════════════════════════════════════════════════ */

const d = (n: string) => `00000000-0000-4000-8000-00000000d${n}`;

export type StatutMail = "nouveau" | "lu" | "traite" | "archive";
export type CategorieMail = "client" | "moa" | "moe" | "fournisseur" | "soustraitant" | "controle" | "administration" | "assurance" | "equipe";
export type PrioriteMail = 0 | 1 | 2 | 3 | 4;

export type PieceMail = { nom: string; taille: number };
export type ReponseMail = { quand: string; texte: string };

export type Mail = {
  id: string;
  de_nom: string;
  de_adresse: string;
  a: string;
  cc: string;
  objet: string;
  corps: string;
  recu_le: string;
  statut: StatutMail;
  categorie: CategorieMail;
  chantier_id: string | null;
  priorite: PrioriteMail;
  pieces: PieceMail[];
  reponses: ReponseMail[];
};

export const BOITE = "contact@entreprise-exemple.fr";

export const CATEGORIES: Record<CategorieMail, string> = {
  client: "Client",
  moa: "Maître d'ouvrage",
  moe: "Maître d'œuvre",
  fournisseur: "Fournisseur",
  soustraitant: "Sous-traitant",
  controle: "Bureau de contrôle",
  administration: "Administration",
  assurance: "Assurance",
  equipe: "Équipe",
};

export const CHANTIERS_MAIL: { id: string; nom: string }[] = [
  { id: d("002"), nom: "Maison Rolland — extension" },
  { id: d("740"), nom: "Villa Duret — terrasse" },
  { id: d("720"), nom: "Cabinet médical Saint-Clair" },
  { id: d("730"), nom: "Boulangerie Ma Mie — agencement" },
  { id: d("750"), nom: "École Jean-Moulin — préaux" },
  { id: d("760"), nom: "Maison Garnier — extension" },
];
export const nomChantier = (id: string | null) => CHANTIERS_MAIL.find((c) => c.id === id)?.nom ?? null;

const ROL = d("002");
const DUR = d("740");
const SCL = d("720");
const MAM = d("730");
const VEN = d("750");
const GAR = d("760");

/* « il y a j jours, à h:m » */
function a(j: number, h: number, m = 0): string {
  const x = new Date();
  x.setDate(x.getDate() - j);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}

const ko = (n: number) => Math.round(n * 1024);

type Brut = Omit<Mail, "a" | "cc" | "reponses"> & { cc?: string; reponses?: ReponseMail[] };
const mail = (x: Brut): Mail => ({ a: BOITE, cc: "", reponses: [], ...x });

/** les mails d'exemple, datés à l'heure de la visite */
export function mailsExemple(): Mail[] {
  return [
    mail({
      id: "ml-01",
      de_nom: "Christine Rolland",
      de_adresse: "c.rolland@example.com",
      objet: "Extension : fissure sur le mur du séjour",
      corps:
        "Bonjour,\n\nCe matin en ouvrant les volets, j'ai remarqué une fissure d'environ 40 cm au-dessus de la porte entre le séjour et l'extension, côté ancien mur. Elle n'y était pas samedi.\n\nEst-ce que c'est lié aux travaux de reprise du linteau ? Pouvez-vous envoyer quelqu'un regarder avant que vos équipes referment le placo ?\n\nJe vous joins deux photos.\n\nMerci,\nChristine Rolland",
      recu_le: a(0, 7, 42),
      statut: "nouveau",
      categorie: "client",
      chantier_id: ROL,
      priorite: 4,
      pieces: [
        { nom: "fissure-sejour-1.jpg", taille: ko(2140) },
        { nom: "fissure-sejour-2.jpg", taille: ko(1985) },
      ],
    }),
    mail({
      id: "ml-02",
      de_nom: "Négoce Matériaux Jarry — Commandes",
      de_adresse: "commandes@negoce-jarry.example.com",
      objet: "Confirmation de livraison — BL 26-11482 — jeudi 7 h 30",
      corps:
        "Bonjour,\n\nNous vous confirmons la livraison de votre commande n° CMD-26-0918 :\n\n- 4,5 m³ de béton C25/30 XC2, pompe 28 m\n- 12 panneaux de treillis soudé ST25C\n- 40 sacs de mortier colle C2TE\n\nChantier : Villa Duret, Le Gosier. Créneau : jeudi entre 7 h 30 et 8 h 00.\n\nMerci de prévoir un accès dégagé pour la toupie et la pompe (largeur 3,5 m minimum) et une personne sur place pour signer le bon.\n\nService commandes\nNégoce Matériaux Jarry",
      recu_le: a(0, 9, 5),
      statut: "nouveau",
      categorie: "fournisseur",
      chantier_id: DUR,
      priorite: 3,
      pieces: [{ nom: "BL-26-11482.pdf", taille: ko(186) }],
    }),
    mail({
      id: "ml-03",
      de_nom: "Caraïbe Contrôle — J. Marie-Luce",
      de_adresse: "j.marieluce@caraibe-controle.example.com",
      objet: "Cabinet Saint-Clair — avis sur les plans de ferraillage (indice B)",
      corps:
        "Bonjour,\n\nVeuillez trouver ci-joint notre avis sur les plans de ferraillage indice B du cabinet médical Saint-Clair.\n\nAvis favorable avec deux observations :\n1. Poutre P4 : l'enrobage indiqué (2,5 cm) est insuffisant en ambiance marine, prévoir 4 cm minimum.\n2. Chaînage vertical de l'angle nord-est : préciser les attentes en tête de poteau.\n\nMerci de nous transmettre l'indice C avant coulage.\n\nCordialement,\nJ. Marie-Luce\nIngénieur structure — Caraïbe Contrôle",
      recu_le: a(0, 10, 18),
      statut: "nouveau",
      categorie: "controle",
      chantier_id: SCL,
      priorite: 3,
      pieces: [{ nom: "Avis-CT-SCL-ferraillage-indB.pdf", taille: ko(842) }],
    }),
    mail({
      id: "ml-04",
      de_nom: "Mairie des Abymes — Services techniques",
      de_adresse: "services.techniques@mairie-abymes.example.com",
      objet: "École Jean-Moulin : réunion de chantier déplacée à mardi 14 h",
      corps:
        "Bonjour,\n\nLa réunion de chantier hebdomadaire des préaux de l'école Jean-Moulin est exceptionnellement déplacée à mardi 14 h, en raison du conseil d'école prévu le lundi.\n\nOrdre du jour :\n- avancement de la charpente métallique ;\n- sécurisation de la cour pendant les récréations ;\n- planning des travaux pendant les vacances de Noël.\n\nMerci de confirmer votre présence.\n\nM. Céleste\nDirection des services techniques",
      recu_le: a(0, 11, 2),
      statut: "lu",
      categorie: "moa",
      chantier_id: VEN,
      priorite: 2,
      pieces: [],
    }),
    mail({
      id: "ml-05",
      de_nom: "Plâtrerie Morel",
      de_adresse: "facturation@platrerie-morel.example.com",
      objet: "Facture n° F-2026-214 — situation n° 2 — Maison Rolland",
      corps:
        "Bonjour,\n\nVeuillez trouver ci-jointe notre facture de situation n° 2 pour le lot cloisons et doublages de la Maison Rolland :\n\n- Montant HT : 6 480,00 €\n- TVA 8,5 % : 550,80 €\n- Montant TTC : 7 030,80 €\n\nAvancement déclaré : 65 %. Règlement à 30 jours fin de mois.\n\nBien cordialement,\nAline Morel\nPlâtrerie Morel",
      recu_le: a(0, 13, 37),
      statut: "nouveau",
      categorie: "soustraitant",
      chantier_id: ROL,
      priorite: 2,
      pieces: [
        { nom: "F-2026-214.pdf", taille: ko(212) },
        { nom: "Etat-avancement-sit2.xlsx", taille: ko(48) },
      ],
    }),
    mail({
      id: "ml-06",
      de_nom: "Jean-Marc Lacroix",
      de_adresse: "boulangerie.mamie@example.com",
      objet: "Re: Agencement — on peut avancer l'ouverture ?",
      corps:
        "Bonjour,\n\nSuite à notre échange de la semaine dernière, est-ce qu'il serait possible de finir l'agencement du comptoir et de la vitrine réfrigérée pour le 28 ? On aimerait ouvrir avant le premier week-end de décembre.\n\nSi ça demande des heures en plus, dites-moi combien, on en parle.\n\nMerci d'avance,\nJean-Marc Lacroix\nBoulangerie Ma Mie",
      recu_le: a(1, 18, 20),
      statut: "nouveau",
      categorie: "client",
      chantier_id: MAM,
      priorite: 3,
      pieces: [],
    }),
    mail({
      id: "ml-07",
      de_nom: "Atelier d'architecture Lauréat",
      de_adresse: "agence@atelier-laureat.example.com",
      objet: "Maison Garnier — compte rendu de chantier n° 6",
      corps:
        "Bonjour à tous,\n\nVous trouverez en pièce jointe le compte rendu de la réunion n° 6 du chantier Maison Garnier.\n\nPoints à retenir pour votre entreprise :\n- Gros œuvre : réservations des évacuations à reprendre dans la dalle de l'extension (délai : vendredi) ;\n- Menuiseries : validation de l'échantillon de teinte RAL 7016 par la cliente ;\n- Prochaine réunion : mercredi 9 h sur site.\n\nSans remarque sous huit jours, le compte rendu est réputé accepté.\n\nL'équipe de l'atelier",
      recu_le: a(1, 16, 4),
      statut: "lu",
      categorie: "moe",
      chantier_id: GAR,
      priorite: 2,
      cc: "m.garnier@example.com",
      pieces: [{ nom: "CR-06-Maison-Garnier.pdf", taille: ko(1210) }],
    }),
    mail({
      id: "ml-08",
      de_nom: "Bertrand Assurances — Pôle construction",
      de_adresse: "construction@bertrand-assurances.example.com",
      objet: "Votre attestation décennale 2027 est disponible",
      corps:
        "Madame, Monsieur,\n\nVotre attestation d'assurance de responsabilité civile décennale pour l'année 2027 est disponible.\n\nActivités garanties : maçonnerie et béton armé, charpente et structure métallique, cloisons et isolation, revêtements de sols.\n\nPensez à la transmettre à vos maîtres d'ouvrage et à la joindre à vos prochains devis.\n\nVotre conseiller,\nPôle construction",
      recu_le: a(1, 9, 30),
      statut: "lu",
      categorie: "assurance",
      chantier_id: null,
      priorite: 1,
      pieces: [{ nom: "Attestation-decennale-2027.pdf", taille: ko(364) }],
    }),
    mail({
      id: "ml-09",
      de_nom: "Électricité Ferrand",
      de_adresse: "ferrand.elec@example.com",
      objet: "Cabinet Saint-Clair — passage gaines avant coulage dalle",
      corps:
        "Salut,\n\nJe passe demain à 7 h pour poser les gaines et les boîtes d'encastrement dans la dalle du cabinet avant votre coulage de jeudi. J'en ai pour la matinée.\n\nTu peux demander à Karim de laisser les attentes du tableau côté couloir comme sur le plan ? Je t'envoie le plan annoté.\n\nPhilippe Ferrand",
      recu_le: a(1, 20, 12),
      statut: "nouveau",
      categorie: "soustraitant",
      chantier_id: SCL,
      priorite: 3,
      pieces: [{ nom: "Plan-elec-RDC-annote.pdf", taille: ko(1720) }],
    }),
    mail({
      id: "ml-10",
      de_nom: "Marc Bernard",
      de_adresse: "marc.bernard@example.com",
      objet: "Demande de devis : dalle et carport, Sainte-Anne",
      corps:
        "Bonjour,\n\nJe souhaite faire réaliser une dalle béton d'environ 35 m² devant la maison et un carport en bois pour deux voitures, à Sainte-Anne (section Belle-Plaine).\n\nLe terrain est en légère pente. Je peux vous envoyer des photos. Idéalement les travaux se feraient en janvier.\n\nPouvez-vous passer faire un métré et m'envoyer un devis ?\n\nMarc Bernard\n0690 21 47 85",
      recu_le: a(2, 8, 47),
      statut: "nouveau",
      categorie: "client",
      chantier_id: null,
      priorite: 3,
      pieces: [],
    }),
    mail({
      id: "ml-11",
      de_nom: "Location Engins Antilles",
      de_adresse: "agence.baie-mahault@location-engins.example.com",
      objet: "Contrat de location mini-pelle 5 t — à signer",
      corps:
        "Bonjour,\n\nComme convenu par téléphone, ci-joint le contrat de location :\n\n- Mini-pelle 5 t avec godet de curage et brise-roche\n- Du lundi au vendredi, livraison et reprise sur le chantier École Jean-Moulin\n- Tarif : 210 € HT / jour, transport aller-retour 180 € HT\n\nMerci de nous retourner le contrat signé et l'attestation d'assurance avant vendredi midi.\n\nL'agence de Baie-Mahault",
      recu_le: a(2, 14, 15),
      statut: "lu",
      categorie: "fournisseur",
      chantier_id: VEN,
      priorite: 2,
      pieces: [{ nom: "Contrat-location-ME5T-2611.pdf", taille: ko(298) }],
    }),
    mail({
      id: "ml-12",
      de_nom: "Sylvie Duret",
      de_adresse: "sylvie.duret@example.com",
      objet: "Terrasse : choix du carrelage",
      corps:
        "Bonjour,\n\nNous sommes passés au showroom samedi. Finalement nous partons sur le grès cérame 60 × 60 aspect pierre, coloris « Sable », antidérapant R11, et pas sur le 30 × 60 du devis.\n\nEst-ce que ça change quelque chose au prix ou au délai ? Il faudrait aussi prévoir les nez de marche assortis pour les trois marches.\n\nBonne journée,\nSylvie Duret",
      recu_le: a(2, 19, 3),
      statut: "lu",
      categorie: "client",
      chantier_id: DUR,
      priorite: 2,
      pieces: [{ nom: "reference-carrelage-sable.jpg", taille: ko(640) }],
    }),
    mail({
      id: "ml-13",
      de_nom: "DEAL Guadeloupe — Unité risques",
      de_adresse: "risques@deal-exemple.example.com",
      objet: "Vigilance cyclonique : consignes pour les chantiers",
      corps:
        "Madame, Monsieur,\n\nÀ la suite du passage en vigilance jaune cyclonique, nous rappelons les consignes à appliquer sur les chantiers :\n\n- arrimer ou descendre les éléments légers (tôles, panneaux, bâches) ;\n- démonter les filets et bâches des échafaudages ;\n- mettre les grues en girouette ;\n- dégager les évacuations d'eaux pluviales.\n\nLes consignes complètes sont jointes.\n\nL'unité risques",
      recu_le: a(3, 10, 0),
      statut: "traite",
      categorie: "administration",
      chantier_id: null,
      priorite: 4,
      pieces: [{ nom: "Consignes-chantiers-vigilance-cyclonique.pdf", taille: ko(530) }],
      reponses: [{ quand: a(3, 11, 15), texte: "Bien reçu. Consignes transmises aux chefs d'équipe ; les chantiers ont été sécurisés ce matin." }],
    }),
    mail({
      id: "ml-14",
      de_nom: "Karim B. — chef d'équipe Pose A",
      de_adresse: "karim.pose-a@example.com",
      objet: "Photos fin de journée — Maison Rolland",
      corps:
        "Voilà les photos de ce soir.\n\nLe linteau est repris, le placo de la chambre 2 est fini. Il manque 6 plaques hydro pour la salle d'eau, j'ai mis la commande dans le groupe.\n\nDemain on attaque les bandes.\n\nKarim",
      recu_le: a(3, 17, 48),
      statut: "traite",
      categorie: "equipe",
      chantier_id: ROL,
      priorite: 1,
      pieces: [
        { nom: "IMG_4021.jpg", taille: ko(3120) },
        { nom: "IMG_4022.jpg", taille: ko(2980) },
        { nom: "IMG_4025.jpg", taille: ko(3304) },
      ],
    }),
    mail({
      id: "ml-15",
      de_nom: "Négoce Matériaux Jarry — Comptabilité",
      de_adresse: "compta@negoce-jarry.example.com",
      objet: "Relevé de compte octobre — 2 factures échues",
      corps:
        "Bonjour,\n\nSauf erreur de notre part, les factures suivantes restent impayées à ce jour :\n\n- FA-26-08812 du 12/09 : 3 214,60 € TTC\n- FA-26-09140 du 26/09 : 1 087,25 € TTC\n\nMerci de procéder au règlement ou de nous indiquer la date prévue. Si le paiement a été fait entre-temps, ne tenez pas compte de ce message.\n\nService comptabilité",
      recu_le: a(4, 9, 12),
      statut: "lu",
      categorie: "fournisseur",
      chantier_id: null,
      priorite: 3,
      pieces: [{ nom: "Releve-compte-octobre-2026.pdf", taille: ko(156) }],
    }),
    mail({
      id: "ml-16",
      de_nom: "Maître Garnier",
      de_adresse: "m.garnier@example.com",
      objet: "Avenant n° 2 signé — terrasse couverte",
      corps:
        "Bonjour,\n\nCi-joint l'avenant n° 2 signé pour la terrasse couverte (2 840 € HT). Vous pouvez lancer la commande de la charpente.\n\nPar contre, merci de me confirmer que ça ne décale pas la réception prévue fin janvier.\n\nCordialement,\nMathieu Garnier",
      recu_le: a(4, 15, 26),
      statut: "traite",
      categorie: "client",
      chantier_id: GAR,
      priorite: 2,
      pieces: [{ nom: "Avenant-02-signe.pdf", taille: ko(402) }],
      reponses: [{ quand: a(4, 17, 2), texte: "Merci, bien reçu. La commande part demain ; la réception reste prévue fin janvier." }],
    }),
    mail({
      id: "ml-17",
      de_nom: "Coordination SPS — Cabinet Alizés",
      de_adresse: "sps@cabinet-alizes.example.com",
      objet: "Visite d'inspection commune — École Jean-Moulin",
      corps:
        "Bonjour,\n\nJe vous propose une visite d'inspection commune avant l'intervention de votre équipe sur la toiture des préaux.\n\nMerci de m'envoyer votre PPSPS mis à jour (travaux en hauteur, levage) et de prévoir 45 minutes sur site lundi ou mardi matin.\n\nPoints d'attention : séparation des flux avec les élèves, garde-corps provisoires, zone de stockage.\n\nLe coordonnateur SPS",
      recu_le: a(5, 8, 30),
      statut: "lu",
      categorie: "controle",
      chantier_id: VEN,
      priorite: 3,
      pieces: [],
    }),
    mail({
      id: "ml-18",
      de_nom: "Menuiseries Alu Caraïbes",
      de_adresse: "adv@menuiseries-alu.example.com",
      objet: "Retard fabrication — baies coulissantes Villa Duret",
      corps:
        "Bonjour,\n\nNous sommes au regret de vous informer d'un retard sur la fabrication des deux baies coulissantes 3 vantaux (réf. BC-240x215) : le profilé anthracite n'est arrivé qu'hier au port.\n\nNouvelle date de livraison : semaine 49 au lieu de la semaine 47.\n\nNous restons à votre disposition pour en parler.\n\nAdministration des ventes",
      recu_le: a(5, 14, 52),
      statut: "nouveau",
      categorie: "fournisseur",
      chantier_id: DUR,
      priorite: 3,
      pieces: [],
    }),
    mail({
      id: "ml-19",
      de_nom: "Cabinet médical Saint-Clair — Dr Ancelin",
      de_adresse: "dr.ancelin@example.com",
      objet: "Question sur l'emplacement des prises en salle de soins",
      corps:
        "Bonjour,\n\nEn relisant les plans, je me rends compte qu'il manque deux prises au-dessus du plan de travail de la salle de soins (pour l'autoclave et le réfrigérateur à vaccins).\n\nEst-ce qu'il est encore temps de les ajouter ? Si c'est un supplément, envoyez-moi le montant.\n\nMerci,\nDr Ancelin",
      recu_le: a(6, 12, 10),
      statut: "lu",
      categorie: "client",
      chantier_id: SCL,
      priorite: 2,
      pieces: [],
    }),
    mail({
      id: "ml-20",
      de_nom: "Plateforme des marchés publics",
      de_adresse: "ne-pas-repondre@marches-exemple.example.com",
      objet: "Nouvel avis : réhabilitation de la salle polyvalente de Petit-Bourg",
      corps:
        "Un nouvel avis correspond à vos critères (gros œuvre, Guadeloupe, moins de 500 000 € HT) :\n\nRéhabilitation et mise aux normes paracycloniques de la salle polyvalente.\nAcheteur : commune de Petit-Bourg.\nDate limite de remise des offres : dans 24 jours.\nVisite obligatoire.\n\nConsultez le dossier de consultation sur la plateforme.",
      recu_le: a(6, 6, 0),
      statut: "lu",
      categorie: "administration",
      chantier_id: null,
      priorite: 1,
      pieces: [],
    }),
    mail({
      id: "ml-21",
      de_nom: "Christine Rolland",
      de_adresse: "c.rolland@example.com",
      objet: "Virement de l'acompte n° 2 effectué",
      corps: "Bonjour,\n\nJe vous confirme que le virement de l'acompte n° 2 (8 500 €) a été fait ce matin. Vous devriez le recevoir sous 48 h.\n\nBonne journée,\nChristine Rolland",
      recu_le: a(7, 10, 44),
      statut: "archive",
      categorie: "client",
      chantier_id: ROL,
      priorite: 0,
      pieces: [{ nom: "avis-de-virement.pdf", taille: ko(88) }],
    }),
    mail({
      id: "ml-22",
      de_nom: "Bureau d'études Fluides Soleil",
      de_adresse: "be@fluides-soleil.example.com",
      objet: "Boulangerie Ma Mie — note de calcul de l'extraction",
      corps:
        "Bonjour,\n\nCi-jointe la note de calcul de l'extraction du fournil : hotte 2,4 m, débit 3 200 m³/h, gaine Ø 400 jusqu'en toiture.\n\nAttention : la trémie en toiture doit faire 50 × 50 cm, à réserver avant la pose des tôles.\n\nCordialement,\nLe bureau d'études",
      recu_le: a(8, 16, 0),
      statut: "traite",
      categorie: "moe",
      chantier_id: MAM,
      priorite: 2,
      pieces: [{ nom: "NDC-extraction-fournil.pdf", taille: ko(744) }],
    }),
    mail({
      id: "ml-23",
      de_nom: "Service des eaux — Interventions",
      de_adresse: "interventions@eaux-exemple.example.com",
      objet: "Branchement provisoire de chantier accordé",
      corps:
        "Bonjour,\n\nVotre demande de branchement provisoire d'eau pour le chantier Maison Garnier est acceptée.\n\nIntervention prévue : mardi entre 8 h et 12 h. Merci de prévoir la tranchée jusqu'à la limite de propriété et le regard compteur.\n\nLe service interventions",
      recu_le: a(9, 11, 20),
      statut: "archive",
      categorie: "administration",
      chantier_id: GAR,
      priorite: 1,
      pieces: [],
    }),
    mail({
      id: "ml-24",
      de_nom: "Échafaudages du Nord Grande-Terre",
      de_adresse: "contact@echafaudages-ngt.example.com",
      objet: "Procès-verbal de réception de l'échafaudage — à signer",
      corps:
        "Bonjour,\n\nL'échafaudage de façade de l'École Jean-Moulin (bâtiment B) est monté. Ci-joint le procès-verbal de réception à signer par votre chef de chantier avant toute utilisation.\n\nVérification journalière à faire par vos équipes ; prochaine vérification trimestrielle dans trois mois.\n\nL'équipe montage",
      recu_le: a(10, 15, 35),
      statut: "lu",
      categorie: "fournisseur",
      chantier_id: VEN,
      priorite: 3,
      pieces: [{ nom: "PV-reception-echafaudage-batB.pdf", taille: ko(260) }],
    }),
  ];
}

export function mailVide(id: string): Mail {
  return {
    id,
    de_nom: "",
    de_adresse: "",
    a: BOITE,
    cc: "",
    objet: "",
    corps: "",
    recu_le: new Date().toISOString(),
    statut: "nouveau",
    categorie: "client",
    chantier_id: null,
    priorite: 2,
    pieces: [],
    reponses: [],
  };
}
