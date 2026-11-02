/* DALIRO › À ranger — l'exemple (02/11/2026). Seize messages du terrain que la
   base n'a pas su rattacher à un chantier : autant de lignes que le Triage de
   Linear relevé (linear-triage.md, 16 éléments), des textes de même longueur,
   onze reçus il y a une heure, les autres il y a trois jours. Le premier est le
   message de l'ancienne carte (ARangerCarte.tsx, exemple()), repris tel quel. */

import type { MessageChantier } from "@/components/espace/daliro/types";

const ilYaMin = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

type Brut = [canal: MessageChantier["canal"], nom: string | null, adresse: string, texte: string, minutes: number, piece?: "photo" | "vocal"];

const BRUTS: Brut[] = [
  ["whatsapp", null, "33 6 •• •• •• 41", "Bonjour, la benne est pleine, on la fait enlever quand ?", 61, "photo"],
  ["sms", "Karim Benali", "06 •• •• •• 12", "Le placo du R+1 est livré, je le monte demain matin", 62],
  ["whatsapp", "Julien Marchand", "06 •• •• •• 87", "Il manque 3 sacs de ciment pour finir la dalle du garage", 63, "photo"],
  ["email", "Sophie Lemaire", "s.lemaire@example.com", "Facture Point P reçue sans référence de chantier : 1 482,60 € HT", 64],
  ["whatsapp", "Thomas Girard", "07 •• •• •• 05", "Photo de la fissure côté jardin, à voir avec le client", 65, "photo"],
  ["sms", null, "06 •• •• •• 63", "Je passe pour le doublage du local technique jeudi ou vendredi ?", 66],
  ["email", "Cabinet Ravel", "contact@example.com", "Relance : attestation de vigilance URSSAF à fournir avant le 15", 67],
  ["whatsapp", "Mehdi Haddad", "06 •• •• •• 29", "Échafaudage sans plinthe au R+2, je bloque l'accès en attendant", 68, "photo"],
  ["sms", "M. Duret", "06 •• •• •• 74", "Le voisin se plaint du bruit avant 7 h, on peut décaler ?", 69],
  ["whatsapp", "Lafarge, livraisons", "05 •• •• •• 40", "Bon de livraison non signé : 12 m³ de béton déposés à 8 h 10", 70, "photo"],
  ["email", "Mme Rolland", "rolland@example.com", "Fissure sur l'enduit côté jardin : pouvez-vous passer cette semaine ?", 71],
  ["whatsapp", "Antoine Faure", "06 •• •• •• 58", "Vocal : le carreleur demande s'il peut commencer lundi", 4_320, "vocal"],
  ["sms", "Nicolas Perrin", "06 •• •• •• 91", "Passage de jeudi décalé à lundi, le tableau électrique n'est pas arrivé", 4_330],
  ["email", "Maître d'ouvrage", "mo@example.com", "Demande de devis pour une prise supplémentaire dans le garage", 4_340],
  ["whatsapp", "Laura Petit", "07 •• •• •• 16", "Les clés du chantier sont chez le gardien, code portail 4521", 4_350],
  ["sms", null, "06 •• •• •• 03", "Livraison des menuiseries prévue mardi entre 8 h et 10 h", 4_360],
];

export function messagesExemple(): MessageChantier[] {
  return BRUTS.map(([canal, nom, adresse, texte, minutes, piece], i) => ({
    id: `00000000-0000-4000-8000-00000000f${String(101 + i).padStart(3, "0")}`,
    reception_id: 9 + i,
    chantier_id: null,
    canal,
    de_nom: nom,
    de_adresse: adresse,
    intervenant_id: null,
    tiers_id: null,
    texte,
    rangement: null,
    statut: "a_ranger",
    avenant_id: null,
    recu_le: ilYaMin(minutes),
    pieces:
      piece === "photo"
        ? [{ nom: "image.jpg", mime: "image/jpeg", taille: 64000, chemin: `exemple/photo-${i}`, vocal: false }]
        : piece === "vocal"
          ? [{ nom: "vocal.ogg", mime: "audio/ogg", taille: 42000, chemin: `exemple/vocal-${i}`, vocal: true }]
          : [],
  }));
}
