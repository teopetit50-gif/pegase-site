// Données fictives du banc : fournisseurs inventés, clients inventés, catalogues par métier, composition d'une facture.
import { sirenFictif, siretDepuisSiren, tvaIntracomDepuisSiren, ibanFictif, bicFictif } from './identifiants.mjs';

const VILLES = [
  ['69007', 'Lyon'], ['31000', 'Toulouse'], ['44000', 'Nantes'], ['35000', 'Rennes'], ['67000', 'Strasbourg'],
  ['33000', 'Bordeaux'], ['59000', 'Lille'], ['13001', 'Marseille'], ['38000', 'Grenoble'], ['21000', 'Dijon'],
  ['49000', 'Angers'], ['72000', 'Le Mans'], ['63000', 'Clermont-Ferrand'], ['76000', 'Rouen'], ['37000', 'Tours'],
  ['86000', 'Poitiers'], ['25000', 'Besançon'], ['87000', 'Limoges'], ['68100', 'Mulhouse'], ['29200', 'Brest'],
];
const RUES = ['rue des Tanneurs', 'avenue du Bois-Joli', 'impasse des Peupliers', 'chemin de la Fontaine', 'rue Camille-Verdier',
  'boulevard de la Marne', 'allée des Charmes', 'zone artisanale des Quatre-Vents', 'rue de la Forge', 'place du Marché-Neuf',
  'route de la Plaine', 'rue Pasteur', 'quai des Chartrons', 'rue du Moulin-à-Vent', 'parc d\'activités du Levant'];

// Raisons sociales inventées : mots composés qui ne correspondent à aucune entreprise connue.
const FOURNISSEURS = [
  { nom: 'Brossard-Vélane Matériaux', forme: 'SAS', metier: 'materiaux' },
  { nom: 'Nordélec Distribution', forme: 'SARL', metier: 'electricite' },
  { nom: 'Atelier Mirvault & Fils', forme: 'SARL', metier: 'menuiserie' },
  { nom: 'Quincaillerie Toribel', forme: 'SAS', metier: 'quincaillerie' },
  { nom: 'Plombatec Ouest', forme: 'SARL', metier: 'plomberie' },
  { nom: 'Saverdun Informatique', forme: 'SASU', metier: 'informatique' },
  { nom: 'Lumiflux Énergie', forme: 'SA', metier: 'energie' },
  { nom: 'Cabinet Orvane Conseil', forme: 'SELARL', metier: 'conseil' },
  { nom: 'Transports Galibert-Roux', forme: 'SAS', metier: 'transport' },
  { nom: 'Boulangerie du Pré-Fleuri', forme: 'EURL', metier: 'alimentaire' },
  { nom: 'Primeurs Valdorane', forme: 'SARL', metier: 'alimentaire' },
  { nom: 'Papeterie Marcenac', forme: 'SARL', metier: 'bureau' },
  { nom: 'Nettoyage Clairpont', forme: 'SAS', metier: 'nettoyage' },
  { nom: 'Location Bréhal Engins', forme: 'SAS', metier: 'location' },
  { nom: 'Télécom Arvennes', forme: 'SA', metier: 'telecom' },
  { nom: 'Garage Pontarlin', forme: 'SARL', metier: 'garage' },
  { nom: 'Assurances Mutuelle du Plateau', forme: 'SA', metier: 'assurance' },
  { nom: 'Imprimerie Castelvieux', forme: 'SARL', metier: 'imprimerie' },
  { nom: 'Fournitures Médicales Sorinel', forme: 'SAS', metier: 'medical' },
  { nom: 'Peintures Aubrac-Delmas', forme: 'SARL', metier: 'peinture' },
  { nom: 'Vitrerie Serval', forme: 'EURL', metier: 'vitrerie' },
  { nom: 'Agence Web Kalistra', forme: 'SAS', metier: 'informatique' },
  { nom: 'Traiteur Les Deux Noyers', forme: 'SARL', metier: 'alimentaire' },
  { nom: 'Formation Ponthieu Compétences', forme: 'SAS', metier: 'formation' },
  { nom: 'Serrurerie Vendrel', forme: 'EI', metier: 'quincaillerie' },
  { nom: 'Carrières de Montjoie', forme: 'SAS', metier: 'materiaux' },
  { nom: 'Expertise Comptable Ravel & Associés', forme: 'SELAS', metier: 'conseil' },
  { nom: 'Chauffage Thermoval', forme: 'SARL', metier: 'plomberie' },
  { nom: 'Fleurs du Vieux-Port', forme: 'EI', metier: 'alimentaire' },
  { nom: 'Logiciels Ambrelys', forme: 'SAS', metier: 'informatique' },
  { nom: 'Station Lavage Bellecombe', forme: 'SARL', metier: 'garage' },
  { nom: 'Signalétique Dorvane', forme: 'SAS', metier: 'imprimerie' },
  { nom: 'Électroménager Pro Rochebrune', forme: 'SARL', metier: 'electricite' },
  { nom: 'Vêtements de Travail Marnier', forme: 'SAS', metier: 'bureau' },
  { nom: 'Micro-brasserie du Val Clos', forme: 'SARL', metier: 'alimentaire' },
  { nom: 'Pharmacie Vétérinaire Castagnol', forme: 'SELARL', metier: 'medical' },
  { nom: 'Taxi-Colis Rapide Ségur', forme: 'EI', metier: 'transport' },
  { nom: 'Coworking La Halle Neuve', forme: 'SAS', metier: 'location' },
  { nom: 'Eau et Assainissement du Bassin', forme: 'SA', metier: 'energie' },
  { nom: 'Sécurité Incendie Préval', forme: 'SAS', metier: 'nettoyage' },
];

// Clients d'Omega (PME fictives qui reçoivent les factures).
const CLIENTS = [
  { nom: 'Menuiserie Valrène', forme: 'SARL' },
  { nom: 'Cabinet Dentaire des Tilleuls', forme: 'SELARL' },
  { nom: 'Restaurant La Table d\'Ambroise', forme: 'SAS' },
  { nom: 'Boutique Fil & Trame', forme: 'EURL' },
  { nom: 'Architecture Lorbeck', forme: 'SAS' },
  { nom: 'Cabinet d\'Avocats Tessier-Mahaut', forme: 'SELARL' },
  { nom: 'Garage Électrique Solvan', forme: 'SARL' },
  { nom: 'Pépinières du Haut-Vallon', forme: 'EARL' },
];

// Catalogue par métier : [désignation, prix unitaire HT min, max, unité, taux TVA]
const CATALOGUE = {
  materiaux: [['Sac ciment CEM II 35 kg', 7.2, 9.8, 'sac', 20], ['Sable 0/4 lavé', 38, 52, 'tonne', 20], ['Parpaing creux 20x20x50', 1.35, 1.9, 'u', 20], ['Plaque de plâtre BA13 2,5 m', 5.4, 7.1, 'u', 20], ['Laine de verre 100 mm rouleau', 24, 31, 'rouleau', 20], ['Livraison grue', 90, 140, 'forfait', 20]],
  electricite: [['Câble R2V 3G2,5 (couronne 100 m)', 68, 92, 'u', 20], ['Disjoncteur 20 A courbe C', 8.5, 14, 'u', 20], ['Tableau 3 rangées 39 modules', 54, 78, 'u', 20], ['Prise 2P+T encastrée blanche', 4.2, 7.9, 'u', 20], ['Spot LED 7 W orientable', 11, 19, 'u', 20], ['Main-d\'œuvre électricien', 48, 62, 'h', 20]],
  menuiserie: [['Porte intérieure alvéolaire 83 cm', 89, 140, 'u', 20], ['Fenêtre bois 2 vantaux 120x135', 420, 690, 'u', 10], ['Pose et dépose', 55, 70, 'h', 10], ['Quincaillerie de pose', 18, 34, 'lot', 20], ['Plinthe chêne 10 cm', 6.5, 9.8, 'ml', 20]],
  quincaillerie: [['Vis bois 4x40 (boîte 500)', 9.9, 14.5, 'boîte', 20], ['Cheville à frapper 8x80 (100)', 12, 17, 'boîte', 20], ['Cylindre européen 30x30', 24, 45, 'u', 20], ['Cadenas laiton 40 mm', 8, 15, 'u', 20], ['Reproduction de clé', 4, 9, 'u', 20], ['Déplacement dépannage', 45, 75, 'forfait', 20]],
  plomberie: [['Tube cuivre 14 mm (barre 4 m)', 19, 27, 'barre', 20], ['Robinet mitigeur évier', 65, 120, 'u', 20], ['Chauffe-eau 200 L stéatite', 380, 560, 'u', 10], ['Intervention plombier', 52, 68, 'h', 10], ['Joint fibre 15/21 (10)', 2.1, 3.4, 'sachet', 20], ['Entretien chaudière gaz', 110, 160, 'forfait', 10]],
  informatique: [['Ordinateur portable 14" 16 Go', 740, 1190, 'u', 20], ['Écran 27" IPS', 180, 290, 'u', 20], ['Abonnement hébergement mensuel', 29, 89, 'mois', 20], ['Prestation développement', 480, 720, 'jour', 20], ['Licence suite bureautique annuelle', 96, 132, 'poste', 20], ['Maintenance infogérance', 150, 390, 'mois', 20]],
  energie: [['Abonnement électricité 12 kVA', 14.2, 19.6, 'mois', 5.5], ['Consommation heures pleines', 0.2016, 0.2516, 'kWh', 20], ['Consommation heures creuses', 0.1489, 0.1894, 'kWh', 20], ['Contribution tarifaire acheminement', 2.1, 3.4, 'mois', 20], ['Taxe accise électricité', 0.0210, 0.0325, 'kWh', 20], ['Abonnement eau potable', 6.2, 9.9, 'mois', 5.5], ['Consommation eau', 1.9, 3.1, 'm3', 5.5], ['Redevance assainissement', 1.4, 2.3, 'm3', 10]],
  conseil: [['Honoraires conseil', 140, 260, 'h', 20], ['Tenue de comptabilité trimestrielle', 450, 900, 'trimestre', 20], ['Établissement liasse fiscale', 600, 1500, 'forfait', 20], ['Déplacement et frais', 60, 180, 'forfait', 20]],
  transport: [['Transport palette 80x120', 42, 95, 'palette', 20], ['Course express intra-muros', 18, 35, 'course', 20], ['Supplément hayon', 15, 25, 'u', 20], ['Surcharge carburant', 6, 14, '%', 20], ['Affrètement camion 20 m3', 380, 620, 'jour', 20]],
  alimentaire: [['Pain de campagne 800 g', 3.1, 4.2, 'u', 5.5], ['Viennoiseries assorties', 1.1, 1.6, 'u', 5.5], ['Plateau repas', 14.5, 22, 'u', 10], ['Café (préparé)', 1.4, 2.2, 'u', 10], ['Bouteille eau 1 L', 0.9, 1.4, 'u', 5.5], ['Cageot pommes 10 kg', 16, 24, 'cageot', 5.5], ['Vin rouge AOP 75 cl', 7.5, 14, 'bouteille', 20], ['Bière artisanale blonde 33 cl (carton 24)', 38, 54, 'carton', 20], ['Bouquet composé', 28, 65, 'u', 10], ['Livraison', 8, 20, 'forfait', 20]],
  bureau: [['Ramette A4 80 g', 4.6, 6.9, 'ramette', 20], ['Cartouche encre noire', 24, 42, 'u', 20], ['Classeur à levier dos 8 cm', 2.3, 3.9, 'u', 20], ['Stylo bille (boîte 50)', 11, 17, 'boîte', 20], ['Pantalon de travail multipoches', 32, 49, 'u', 20], ['Chaussures de sécurité S3', 48, 79, 'paire', 20], ['Marquage logo brodé', 4.5, 8, 'u', 20]],
  nettoyage: [['Nettoyage bureaux hebdomadaire', 180, 320, 'mois', 20], ['Vitrerie intérieure/extérieure', 90, 160, 'passage', 20], ['Produits consommables', 25, 60, 'mois', 20], ['Vérification extincteurs', 9, 14, 'u', 20], ['Recharge extincteur 6 L', 28, 45, 'u', 20]],
  location: [['Location mini-pelle 1,5 t', 160, 240, 'jour', 20], ['Location nacelle 12 m', 190, 290, 'jour', 20], ['Assurance bris de machine', 12, 24, 'jour', 20], ['Transport aller-retour', 80, 150, 'forfait', 20], ['Poste de travail nomade', 190, 290, 'mois', 20], ['Salle de réunion 8 pers.', 35, 60, 'h', 20]],
  telecom: [['Abonnement fibre pro 1 Gb/s', 39, 69, 'mois', 20], ['Forfait mobile 100 Go', 14.99, 24.99, 'ligne', 20], ['Location box', 3, 5, 'mois', 20], ['Frais de mise en service', 49, 99, 'forfait', 20], ['Communications hors forfait', 2.4, 18.6, 'u', 20]],
  garage: [['Vidange + filtre à huile', 89, 149, 'forfait', 20], ['Pneu 205/55 R16', 68, 115, 'u', 20], ['Plaquettes de frein avant', 45, 85, 'jeu', 20], ['Main-d\'œuvre atelier', 58, 79, 'h', 20], ['Lavage extérieur haute pression', 9, 16, 'u', 20], ['Contrôle technique', 69, 89, 'forfait', 20]],
  assurance: [['Prime multirisque professionnelle', 380, 1200, 'an', 0], ['Prime flotte automobile', 620, 1800, 'an', 0], ['Frais de gestion', 25, 60, 'an', 20]],
  imprimerie: [['Cartes de visite 350 g (500)', 38, 65, 'lot', 20], ['Flyers A5 (1000)', 72, 130, 'lot', 20], ['Enseigne bâche 3x1 m', 95, 180, 'u', 20], ['Panneau dibond 60x80', 48, 85, 'u', 20], ['Création graphique', 60, 90, 'h', 20], ['Livre broché 120 p.', 6.2, 9.4, 'u', 5.5]],
  medical: [['Gants nitrile (boîte 100)', 6.8, 11.5, 'boîte', 20], ['Masques chirurgicaux (50)', 4.2, 7.8, 'boîte', 5.5], ['Compresses stériles 10x10 (100)', 5.5, 8.9, 'boîte', 20], ['Solution hydroalcoolique 1 L', 7.9, 12.4, 'u', 20], ['Médicament vétérinaire', 12, 68, 'u', 10]],
  peinture: [['Peinture acrylique mate 15 L', 58, 92, 'pot', 20], ['Sous-couche universelle 10 L', 42, 61, 'pot', 20], ['Rouleau anti-goutte 180 mm', 6.5, 11, 'u', 20], ['Bâche de protection 4x5 m', 7, 13, 'u', 20], ['Application peinture (travaux rénovation)', 28, 40, 'm2', 10]],
  vitrerie: [['Double vitrage 4/16/4 sur mesure', 95, 220, 'm2', 10], ['Remplacement vitrage cassé', 60, 80, 'h', 10], ['Déplacement', 35, 55, 'forfait', 20], ['Miroir argenté 6 mm', 70, 130, 'm2', 20]],
  formation: [['Formation sécurité incendie (groupe)', 480, 920, 'session', 0], ['Formation bureautique inter', 320, 540, 'stagiaire', 0], ['Supports pédagogiques', 15, 35, 'stagiaire', 20], ['Frais de salle', 90, 180, 'jour', 20]],
};

const MODES_PAIEMENT = ['Virement bancaire', 'Prélèvement SEPA', 'Chèque', 'Carte bancaire', 'Virement à 30 jours', 'Espèces'];

export const PRECISIONS = {
  mentions_penalites: 'En cas de retard de paiement, pénalités au taux de 3 fois le taux d\'intérêt légal et indemnité forfaitaire de recouvrement de 40 € (art. L441-10 C. com.).',
  escompte: 'Pas d\'escompte pour paiement anticipé.',
};

export function arrondir(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

export function creerFournisseurs(alea) {
  return FOURNISSEURS.map((f, i) => {
    const siren = sirenFictif(alea);
    const [cp, ville] = VILLES[i % VILLES.length];
    return {
      id: i,
      raison_sociale: `${f.nom} ${f.forme}`,
      forme: f.forme,
      metier: f.metier,
      siren,
      siret: siretDepuisSiren(siren, alea),
      tva_intracom: tvaIntracomDepuisSiren(siren),
      adresse: `${alea.entier(1, 120)} ${alea.choix(RUES)}`,
      code_postal: cp,
      ville,
      pays: 'FR',
      iban: ibanFictif(alea),
      bic: bicFictif(alea),
      telephone: `0${alea.entier(1, 5)} ${alea.chiffres(2)} ${alea.chiffres(2)} ${alea.chiffres(2)} ${alea.chiffres(2)}`,
      courriel: `compta@${f.nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}.example`,
      capital: alea.choix([1000, 5000, 10000, 25000, 50000, 120000]),
      rcs: ville,
      prefixe_numero: alea.choix(['F', 'FA', 'FC', '', 'INV-', '2026-', 'FAC']),
      style_numero: alea.entier(0, 3),
      regime_tva: f.forme === 'EI' && alea.chance(0.5) ? 'franchise' : (alea.chance(0.3) ? 'encaissements' : 'debits'),
    };
  });
}

export function creerClients(alea) {
  return CLIENTS.map((c, i) => {
    const siren = sirenFictif(alea);
    const [cp, ville] = VILLES[(i * 3 + 1) % VILLES.length];
    return {
      raison_sociale: `${c.nom} ${c.forme}`,
      siren, siret: siretDepuisSiren(siren, alea), tva_intracom: tvaIntracomDepuisSiren(siren),
      adresse: `${alea.entier(1, 90)} ${alea.choix(RUES)}`, code_postal: cp, ville, pays: 'FR',
      code_client: `C${alea.chiffres(5)}`,
    };
  });
}

function formaterDate(d) { return d.toISOString().slice(0, 10); }
function ajouterJours(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }

export function numeroFacture(fournisseur, alea, date, compteur) {
  const an = date.getUTCFullYear();
  const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
  switch (fournisseur.style_numero) {
    case 0: return `${fournisseur.prefixe_numero}${an}-${String(compteur).padStart(4, '0')}`;
    case 1: return `${fournisseur.prefixe_numero}${an}${mois}-${String(compteur).padStart(3, '0')}`;
    case 2: return `${fournisseur.prefixe_numero}${String(100000 + compteur * 7 + alea.entier(0, 6))}`;
    default: return `${fournisseur.prefixe_numero}${String(an).slice(2)}/${mois}/${String(compteur).padStart(3, '0')}`;
  }
}

/**
 * Compose une facture complète (données attendues) pour un fournisseur et un client donnés.
 * options : { nbLignes, avoir, acompte, remise, port, ecoPart, autoliquidation, dateBase, compteur, sansTva }
 */
export function composerFacture(alea, fournisseur, client, options = {}) {
  const catalogue = CATALOGUE[fournisseur.metier];
  const nbLignes = options.nbLignes ?? alea.entier(1, 6);
  const dateEmission = options.dateBase ?? new Date(Date.UTC(2026, alea.entier(0, 8), alea.entier(1, 28)));
  const delai = alea.choix([0, 15, 30, 30, 45, 60]);
  const franchise = fournisseur.regime_tva === 'franchise' || options.sansTva;
  const lignes = [];
  for (let i = 0; i < nbLignes; i++) {
    const [designation, min, max, unite, tauxCat] = catalogue[(alea.entier(0, catalogue.length - 1))];
    const decimales = max < 1 ? 4 : 2;
    const pu = Number((min + alea.reel() * (max - min)).toFixed(decimales));
    let quantite;
    if (unite === 'kWh') quantite = alea.entier(180, 4200);
    else if (unite === 'm3') quantite = alea.entier(8, 160);
    else if (['h', 'm2', 'ml'].includes(unite)) quantite = Number((alea.entier(2, 60) / (alea.chance(0.3) ? 2 : 1)).toFixed(2));
    else if (unite === '%') quantite = 1;
    else quantite = alea.entier(1, unite === 'u' ? 24 : 6);
    const taux = franchise ? 0 : (options.autoliquidation ? 0 : tauxCat);
    const remiseLigne = options.remisesLignes && alea.chance(0.4) ? alea.choix([5, 10, 15]) : 0;
    const brut = quantite * pu;
    const ht = arrondir(brut * (1 - remiseLigne / 100));
    lignes.push({ designation, quantite, unite, prix_unitaire_ht: pu, remise_pct: remiseLigne, taux_tva: taux, montant_ht: ht, code: alea.chance(0.5) ? `REF-${alea.chiffres(5)}` : null });
  }
  if (options.port) lignes.push({ designation: 'Frais de port', quantite: 1, unite: 'forfait', prix_unitaire_ht: options.port, remise_pct: 0, taux_tva: franchise ? 0 : 20, montant_ht: options.port, code: null });
  if (options.ecoPart) lignes.push({ designation: 'Éco-participation (dont)', quantite: 1, unite: 'forfait', prix_unitaire_ht: options.ecoPart, remise_pct: 0, taux_tva: franchise ? 0 : 20, montant_ht: options.ecoPart, code: null });

  const signe = options.avoir ? -1 : 1;
  if (options.avoir) for (const l of lignes) { l.quantite = -l.quantite; l.montant_ht = -l.montant_ht; }

  let totalBrutHt = arrondir(lignes.reduce((s, l) => s + l.montant_ht, 0));
  const remiseGlobalePct = options.remise ?? 0;
  const remiseGlobale = arrondir(totalBrutHt * remiseGlobalePct / 100);
  const totalHt = arrondir(totalBrutHt - remiseGlobale);
  // Bases par taux : somme des lignes du taux, remise globale répartie au prorata, écart d'arrondi porté sur la plus grosse base.
  const parTaux = new Map();
  for (const l of lignes) parTaux.set(l.taux_tva, arrondir((parTaux.get(l.taux_tva) ?? 0) + l.montant_ht));
  const tva = [...parTaux.entries()].sort((a, b) => b[0] - a[0]).map(([taux, brut]) => ({ taux, base: arrondir(brut * (1 - remiseGlobalePct / 100)), montant: 0 }));
  const ecart = arrondir(totalHt - tva.reduce((s, t) => s + t.base, 0));
  if (ecart !== 0) { const plusGrosse = tva.reduce((a, b) => (Math.abs(b.base) > Math.abs(a.base) ? b : a)); plusGrosse.base = arrondir(plusGrosse.base + ecart); }
  for (const t of tva) t.montant = arrondir(t.base * t.taux / 100);
  const totalTva = arrondir(tva.reduce((s, t) => s + t.montant, 0));
  const totalTtc = arrondir(totalHt + totalTva);
  const acompte = options.acompte ? arrondir(Math.abs(totalTtc) * options.acompte) * signe : 0;
  const netAPayer = arrondir(totalTtc - acompte);

  const mentions = [];
  if (franchise) mentions.push('TVA non applicable, art. 293 B du CGI');
  if (options.autoliquidation) mentions.push('Autoliquidation de la TVA — art. 283-2 nonies du CGI (sous-traitance bâtiment)');
  if (fournisseur.regime_tva === 'encaissements' && !franchise) mentions.push('TVA sur les encaissements');
  if (fournisseur.regime_tva === 'debits' && !franchise) mentions.push('TVA sur les débits');
  mentions.push(PRECISIONS.mentions_penalites, PRECISIONS.escompte);

  const numero = numeroFacture(fournisseur, alea, dateEmission, options.compteur ?? alea.entier(1, 999));
  const refCommande = alea.chance(0.6) ? `BC-${alea.chiffres(5)}` : null;
  const refLivraison = alea.chance(0.4) ? `BL-${alea.chiffres(6)}` : null;
  return {
    type_document: options.avoir ? 'avoir' : 'facture',
    numero,
    facture_rectifiee: options.avoir ? numeroFacture(fournisseur, alea, ajouterJours(dateEmission, -20), (options.compteur ?? 50) - 3) : null,
    date_emission: formaterDate(dateEmission),
    date_echeance: options.avoir ? null : formaterDate(ajouterJours(dateEmission, delai)),
    date_livraison: options.dateLivraison === false ? null : formaterDate(ajouterJours(dateEmission, -alea.entier(0, 6))),
    periode: options.periode ?? null,
    devise: 'EUR',
    fournisseur: {
      raison_sociale: fournisseur.raison_sociale, siren: fournisseur.siren, siret: fournisseur.siret, tva_intracom: franchise ? null : fournisseur.tva_intracom,
      adresse: fournisseur.adresse, code_postal: fournisseur.code_postal, ville: fournisseur.ville, pays: 'FR',
      iban: fournisseur.iban, bic: fournisseur.bic, courriel: fournisseur.courriel, telephone: fournisseur.telephone,
    },
    client: { raison_sociale: client.raison_sociale, siren: client.siren, siret: client.siret, tva_intracom: client.tva_intracom, adresse: client.adresse, code_postal: client.code_postal, ville: client.ville, pays: 'FR', code_client: client.code_client },
    lignes,
    remise_globale_pct: remiseGlobalePct || null,
    remise_globale: remiseGlobale || null,
    total_ht: totalHt,
    tva,
    total_tva: totalTva,
    total_ttc: totalTtc,
    acompte: acompte || null,
    net_a_payer: netAPayer,
    mode_paiement: options.avoir ? 'Remboursement par virement' : alea.choix(MODES_PAIEMENT),
    references: { commande: refCommande, bon_livraison: refLivraison, reference_paiement: alea.chance(0.5) ? `${numero.replace(/[^A-Z0-9]/gi, '')}` : null },
    mentions,
  };
}

export { CLIENTS, FOURNISSEURS, VILLES };
