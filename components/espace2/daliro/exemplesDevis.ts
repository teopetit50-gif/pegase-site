/* ══════════════════════════════════════════════════════════════════════
   DALIRO, les devis dictés d'exemple (05/11/2026)

   Le conducteur de travaux ou le chef d'équipe dicte un vocal sur place,
   après la visite ; Daliro le transcrit, reconnaît les ouvrages, les chiffre
   sur la bibliothèque de prix de l'entreprise et prépare le devis, qui
   attend la relecture du bureau avant de partir au client. Une ligne sans
   prix connu reste « à chiffrer » : rien n'est inventé.

   Personnes et adresses fictives ; TVA de la Guadeloupe (8,5 %) ; dates
   relatives au jour de la visite. Rien ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

export type EtatDevis = "a_chiffrer" | "a_valider" | "envoye" | "signe";
export type LigneDevis = { designation: string; unite: string; quantite: number; prix: number | null; origine: "bibliotheque" | "saisi" | "a_chiffrer" };
export type Devis = {
  id: string;
  numero: string;
  titre: string;
  client: string;
  telephone: string;
  adresse: string;
  dicte_par: string;
  quand: string;
  duree_vocal: string;
  etat: EtatDevis;
  vocal: string;
  lignes: LigneDevis[];
  journal: { qui: string; quoi: string; quand: string }[];
};

export const TVA_GUADELOUPE = 0.085;
export const ETATS_DEVIS: Record<EtatDevis, string> = { a_chiffrer: "Un prix manque", a_valider: "À relire avant envoi", envoye: "Envoyé au client", signe: "Signé" };

function a(j: number, h: number, m = 0): string {
  const x = new Date();
  x.setDate(x.getDate() - j);
  x.setHours(h, m, 0, 0);
  return x.toISOString();
}
function plus(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

export function totalHt(d: Devis): number {
  return Math.round(d.lignes.reduce((s, l) => s + (l.prix ?? 0) * l.quantite, 0) * 100) / 100;
}

const v1 = a(0, 16, 42);
const v2 = a(0, 10, 8);
const v3 = a(2, 15, 30);
const v4 = a(6, 11, 5);

export const DEVIS_EXEMPLE: Devis[] = [
  {
    id: "dev-13", numero: "DEV-13", titre: "Salle d'eau de Mme Thomas, à refaire entièrement", client: "Mme Thomas", telephone: "+590 690 38 12 64", adresse: "Section Durivage, 97180 Sainte-Anne",
    dicte_par: "Yanis Dupré", quand: v1, duree_vocal: "1 min 48", etat: "a_valider",
    vocal: "Devis pour Mme Thomas à Sainte-Anne, section Durivage. Salle d'eau de six mètres carrés au rez-de-chaussée. On dépose la baignoire et toute la faïence. On met un receveur extra-plat 120 par 90 avec une paroi fixe. Faïence sur toute la hauteur dans la douche, à peu près douze mètres carrés, et carrelage au sol six mètres carrés, antidérapant. Meuble vasque de 80 avec mitigeur. On refait l'alimentation et l'évacuation. Peinture du plafond. Elle voudrait commencer début décembre.",
    lignes: [
      { designation: "Dépose de la baignoire, de la faïence et évacuation des gravats", unite: "forfait", quantite: 1, prix: 680, origine: "bibliotheque" },
      { designation: "Reprise des alimentations et de l'évacuation", unite: "forfait", quantite: 1, prix: 1150, origine: "bibliotheque" },
      { designation: "Receveur extra-plat 120 × 90 et paroi fixe", unite: "u", quantite: 1, prix: 1240, origine: "bibliotheque" },
      { designation: "Faïence murale, pose comprise", unite: "m²", quantite: 12, prix: 92, origine: "bibliotheque" },
      { designation: "Carrelage antidérapant R11, pose comprise", unite: "m²", quantite: 6, prix: 98, origine: "bibliotheque" },
      { designation: "Meuble vasque 80 cm et mitigeur", unite: "u", quantite: 1, prix: 890, origine: "bibliotheque" },
      { designation: "Peinture du plafond, deux couches", unite: "m²", quantite: 6, prix: 24, origine: "bibliotheque" },
    ],
    journal: [
      { qui: "Yanis Dupré", quoi: "a envoyé un vocal de 1 min 48 par WhatsApp", quand: v1 },
      { qui: "Daliro", quoi: "a transcrit le vocal et reconnu 7 ouvrages", quand: plus(v1, 1) },
      { qui: "Daliro", quoi: "a chiffré les 7 lignes sur la bibliothèque de prix", quand: plus(v1, 1) },
      { qui: "Daliro", quoi: "a créé la fiche client de Mme Thomas", quand: plus(v1, 2) },
    ],
  },
  {
    id: "dev-12", numero: "DEV-12", titre: "Carbet de 12 m² au fond du jardin, Villa Duret", client: "M. et Mme Duret", telephone: "+590 690 73 19 44", adresse: "Les Hauts de Saint-Félix, 97190 Le Gosier",
    dicte_par: "Karim B.", quand: v2, duree_vocal: "0 min 58", etat: "a_chiffrer",
    vocal: "Yanis, c'est Karim. M. Duret demande un devis pour un carbet au fond du jardin, quatre mètres sur trois, poteaux bois sur plots, couverture en tôle avec le même bac que le local technique. Il veut aussi l'éclairage dedans. Je n'ai pas le prix des poteaux bois traités classe 4, il faut le demander au fournisseur.",
    lignes: [
      { designation: "Plots béton et platines", unite: "u", quantite: 6, prix: 225, origine: "bibliotheque" },
      { designation: "Poteaux bois traités classe 4, 15 × 15", unite: "u", quantite: 6, prix: null, origine: "a_chiffrer" },
      { designation: "Charpente bois et liteaux", unite: "m²", quantite: 12, prix: 118, origine: "bibliotheque" },
      { designation: "Couverture bac acier anticyclonique", unite: "m²", quantite: 14, prix: 64, origine: "bibliotheque" },
      { designation: "Éclairage intérieur, deux points et un interrupteur", unite: "forfait", quantite: 1, prix: 420, origine: "saisi" },
    ],
    journal: [
      { qui: "Karim B.", quoi: "a envoyé un vocal de 58 s par WhatsApp", quand: v2 },
      { qui: "Daliro", quoi: "a transcrit le vocal et reconnu 5 ouvrages", quand: plus(v2, 1) },
      { qui: "Daliro", quoi: "n'a pas trouvé le prix des poteaux classe 4 : la ligne attend votre prix", quand: plus(v2, 1) },
    ],
  },
  {
    id: "dev-11", numero: "DEV-11", titre: "Reprise de la toiture tôle après la tempête", client: "M. Jean-Baptiste", telephone: "+590 690 47 88 21", adresse: "Vieux-Bourg, 97111 Morne-à-l'Eau",
    dicte_par: "Yanis Dupré", quand: v3, duree_vocal: "1 min 12", etat: "envoye",
    vocal: "Devis pour M. Jean-Baptiste à Morne-à-l'Eau. Toiture de la maison, soixante mètres carrés de tôle à remplacer, les faîtages et les gouttières côté route. La charpente est bonne, juste deux chevrons à changer. Prévoir l'échafaudage une semaine.",
    lignes: [
      { designation: "Dépose de la couverture tôle existante", unite: "m²", quantite: 60, prix: 14, origine: "bibliotheque" },
      { designation: "Couverture bac acier anticyclonique", unite: "m²", quantite: 60, prix: 64, origine: "bibliotheque" },
      { designation: "Remplacement de chevrons", unite: "u", quantite: 2, prix: 145, origine: "bibliotheque" },
      { designation: "Faîtages et closoirs", unite: "ml", quantite: 11, prix: 38, origine: "bibliotheque" },
      { designation: "Gouttières aluminium et descentes", unite: "ml", quantite: 14, prix: 46, origine: "bibliotheque" },
      { designation: "Échafaudage, une semaine", unite: "forfait", quantite: 1, prix: 890, origine: "bibliotheque" },
    ],
    journal: [
      { qui: "Yanis Dupré", quoi: "a envoyé un vocal de 1 min 12", quand: v3 },
      { qui: "Daliro", quoi: "a chiffré les 6 lignes sur la bibliothèque de prix", quand: plus(v3, 1) },
      { qui: "Claire Morel", quoi: "a relu et validé le devis", quand: plus(v3, 95) },
      { qui: "Daliro", quoi: "a envoyé le devis à M. Jean-Baptiste par courriel et SMS", quand: plus(v3, 96) },
    ],
  },
  {
    id: "dev-10", numero: "DEV-10", titre: "Abri voiture en aluminium, deux places", client: "SCI Les Flamboyants", telephone: "+590 590 91 40 12", adresse: "Rue Raspail, 97122 Baie-Mahault",
    dicte_par: "Yanis Dupré", quand: v4, duree_vocal: "0 min 49", etat: "signe",
    vocal: "Devis SCI Les Flamboyants, Baie-Mahault. Abri voiture deux places en aluminium, six mètres sur cinq, toit en panneaux sandwich, quatre poteaux sur massifs béton. Pose comprise.",
    lignes: [
      { designation: "Massifs béton des poteaux", unite: "u", quantite: 4, prix: 260, origine: "bibliotheque" },
      { designation: "Structure aluminium thermolaqué, 6 × 5 m", unite: "forfait", quantite: 1, prix: 6850, origine: "bibliotheque" },
      { designation: "Toiture panneaux sandwich 40 mm", unite: "m²", quantite: 30, prix: 72, origine: "bibliotheque" },
    ],
    journal: [
      { qui: "Yanis Dupré", quoi: "a envoyé un vocal de 49 s", quand: v4 },
      { qui: "Claire Morel", quoi: "a relu et validé le devis", quand: plus(v4, 60) },
      { qui: "Daliro", quoi: "a envoyé le devis au client", quand: plus(v4, 61) },
      { qui: "SCI Les Flamboyants", quoi: "a signé le devis en ligne", quand: plus(v4, 60 * 48) },
    ],
  },
];
