/* Réseau Omega — membres de démonstration (données d'exemple d'Espace 2).
   ENTIÈREMENT FICTIF : aucune de ces entreprises n'existe. Jamais montré
   en « Base réelle ». Fichier partagé par les quatre pages du réseau
   (Fil, Membres, Messages, Opportunités) : ne pas le modifier dans une
   seule page. « Vous » n'est jamais un de ces membres : c'est
   l'organisation connectée. */

export type Ile = "Guadeloupe" | "Martinique";

export type Badges = {
  /** Délai moyen de paiement des fournisseurs, en jours, sur 12 mois. */
  bonPayeur?: { delaiJours: number };
  /** Délai médian de première réponse aux demandes, en minutes. */
  reponseRapide?: { delaiMinutes: number };
};

export type Membre = {
  slug: string;
  nom: string;
  secteur: string;
  ile: Ile;
  commune: string;
  /** Mois d'entrée dans le réseau, AAAA-MM. */
  depuis: string;
  propose: string[];
  cherche: string[];
  /** Seulement les badges que le membre a accepté de montrer. */
  badges: Badges;
};

export const MEMBRES: Membre[] = [
  { slug: "atelier-moko", nom: "Atelier Moko", secteur: "Menuiserie aluminium", ile: "Guadeloupe", commune: "Baie-Mahault", depuis: "2026-09", propose: ["Pose de menuiseries", "Devis sous 48 h"], cherche: ["Transitaire pour vitrages", "Électricien en sous-traitance"], badges: { bonPayeur: { delaiJours: 24 }, reponseRapide: { delaiMinutes: 35 } } },
  { slug: "karuko-fret", nom: "Karuko Fret", secteur: "Transit et logistique", ile: "Guadeloupe", commune: "Jarry", depuis: "2026-09", propose: ["Groupage conteneur depuis Le Havre", "Dédouanement"], cherche: ["Clients pour groupage mensuel"], badges: { reponseRapide: { delaiMinutes: 20 } } },
  { slug: "solelek", nom: "Solelek Antilles", secteur: "Électricité et photovoltaïque", ile: "Martinique", commune: "Le Lamentin", depuis: "2026-10", propose: ["Installation photovoltaïque", "Dépannage électrique"], cherche: ["Couvreur partenaire", "Marchés publics de rénovation"], badges: { bonPayeur: { delaiJours: 31 } } },
  { slug: "kaz-zepis", nom: "Kaz Zépis", secteur: "Épicerie fine et produits locaux", ile: "Guadeloupe", commune: "Le Gosier", depuis: "2026-08", propose: ["Paniers cadeaux pour entreprises"], cherche: ["Fournisseur emballages local"], badges: { bonPayeur: { delaiJours: 18 }, reponseRapide: { delaiMinutes: 50 } } },
  { slug: "bwa-vert-btp", nom: "Bwa Vert BTP", secteur: "Gros œuvre", ile: "Guadeloupe", commune: "Les Abymes", depuis: "2026-10", propose: ["Gros œuvre et maçonnerie", "Équipe de 14 compagnons"], cherche: ["Partenaires pour groupement de marchés publics"], badges: { bonPayeur: { delaiJours: 42 } } },
  { slug: "emballa-kreyol", nom: "Emballa Kréyol", secteur: "Fabrication emballages carton", ile: "Guadeloupe", commune: "Baie-Mahault", depuis: "2026-10", propose: ["Cartons et étuis sur mesure", "Petites séries dès 200 pièces"], cherche: ["Clients locaux pour remplacer les imports"], badges: { reponseRapide: { delaiMinutes: 90 } } },
  { slug: "lanmou-traiteur", nom: "Lanmou Traiteur", secteur: "Traiteur événementiel", ile: "Martinique", commune: "Fort-de-France", depuis: "2026-09", propose: ["Plateaux repas", "Cocktails pour 300 personnes"], cherche: ["Location de matériel de réception"], badges: {} },
  { slug: "garage-kalbas", nom: "Garage Kalbas", secteur: "Réparation automobile", ile: "Guadeloupe", commune: "Sainte-Anne", depuis: "2026-08", propose: ["Entretien toutes marques", "Véhicules de prêt"], cherche: ["Fournisseur pièces avec stock local"], badges: { bonPayeur: { delaiJours: 27 }, reponseRapide: { delaiMinutes: 40 } } },
  { slug: "nauti-sable", nom: "Nauti Sable", secteur: "Location nautique", ile: "Martinique", commune: "Le Marin", depuis: "2026-10", propose: ["Location de bateaux à la journée"], cherche: ["Mécanicien moteurs hors-bord"], badges: { reponseRapide: { delaiMinutes: 15 } } },
  { slug: "kontab-ile", nom: "Kontab Île", secteur: "Expertise comptable", ile: "Guadeloupe", commune: "Pointe-à-Pitre", depuis: "2026-09", propose: ["Tenue comptable", "Dossiers de financement"], cherche: ["Clients TPE en création"], badges: { reponseRapide: { delaiMinutes: 120 } } },
  { slug: "frigo-tropik", nom: "Frigo Tropik", secteur: "Froid et climatisation", ile: "Martinique", commune: "Ducos", depuis: "2026-09", propose: ["Chambres froides", "Contrats de maintenance"], cherche: ["Achat groupé de gaz réfrigérant"], badges: { bonPayeur: { delaiJours: 35 } } },
  { slug: "imprim-alize", nom: "Imprim Alizé", secteur: "Imprimerie et signalétique", ile: "Guadeloupe", commune: "Jarry", depuis: "2026-10", propose: ["Enseignes", "Impression grand format"], cherche: ["Sous-traitant pose en hauteur"], badges: { bonPayeur: { delaiJours: 21 }, reponseRapide: { delaiMinutes: 60 } } },
];
