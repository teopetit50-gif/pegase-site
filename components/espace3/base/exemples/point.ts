/* Le point du matin d'exemple (05/10/2026) — formes de points_du_jour et
   points_du_jour_lignes. Le point du jour est assemblé à 7 h ; les lignes
   sont groupées par section_rang, le rang 0 d'une section veut dire
   « rien à signaler ». */

import type { LignePoint, PointDuJour } from "../types";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, aujourdHui } from "./socle";

/* 30/10/2026 — /espace3 : deux points du matin, celui du CEO du groupe et celui de la direction marketing */
export type PostePoint = "ceo" | "marketing";

const C = EXEMPLE_CLIENT_ID;

export function pointExemple(decalage = 0, poste: PostePoint = "ceo"): { point: PointDuJour; lignes: LignePoint[] } {
  const jour = aujourdHui(decalage);
  const id = `00000000-0000-4000-8000-0000000000${(0x90 + Math.abs(decalage)).toString(16)}`;
  const point: PointDuJour = {
    id,
    client_id: C,
    user_id: EXEMPLE_MOI,
    jour,
    territoire: "GP",
    fuseau: "America/Guadeloupe",
    heure: "06:15",
    statut: decalage === 0 ? "remis" : "remis",
    canal: "email",
    contenu: "complet",
    incomplet: decalage === 0,
    motifs: decalage === 0 && poste === "ceo" ? [{ module: "varelo", motif: "Soléa Pièces n'a pas envoyé son reporting de la semaine : ses ventes sont celles de vendredi." }] : [],
    nb_sections: 5,
    nb_items: decalage === 0 ? 12 : 7,
    nb_critiques: decalage === 0 ? 2 : 0,
    version: 1,
    remis_le: `${jour}T05:00:00.000Z`,
    ouvert_le: `${jour}T06:12:00.000Z`,
  };

  const l = (
    section_rang: number,
    rang: number,
    o: Partial<LignePoint> & { titre: string },
  ): LignePoint => ({
    id: `${id}-${section_rang}-${rang}`,
    section_rang,
    rang,
    module: null,
    entite_nom: null,
    sante: false,
    section_incomplete: false,
    texte: null,
    lien: null,
    gravite: null,
    objet_type: null,
    objet_id: null,
    ...o,
  });

  if (decalage !== 0) {
    return {
      point,
      lignes:
        poste === "marketing"
          ? [
              l(1, 1, { titre: "Campagnes", module: "offload", texte: "Portes ouvertes SUV hybrides : 37 nouveaux contacts, 4 essais réservés.", gravite: "info" }),
              l(2, 0, { titre: "Contenus", module: "reput", texte: "Rien à signaler.", sante: true }),
              l(3, 1, { titre: "Validations", module: "socle", texte: "2 demandes en attente, aucune en retard.", gravite: "info", lien: "/espace/validations" }),
              l(5, 1, { titre: "Avis et demandes", module: "reput", texte: "41 avis reçus sur les enseignes, tous ont une réponse.", gravite: "info" }),
            ]
          : [
              l(1, 1, { titre: "Trésorerie du groupe", module: "cashd", texte: "Trésorerie disponible 23,4 M€. Aucune société sous son plancher cette semaine.", gravite: "info", sante: true }),
              l(2, 0, { titre: "Factures reçues", module: "filed", texte: "Rien à signaler.", sante: true }),
              l(3, 1, { titre: "Validations", module: "socle", texte: "4 décisions en attente dans les directions, aucune en retard.", gravite: "info", lien: "/espace/validations" }),
              l(4, 0, { titre: "Directions", module: "rh", texte: "Rien à signaler.", sante: true }),
              l(5, 1, { titre: "Ventes", module: "varelo", texte: "Ventes de la semaine : 10,4 M€ hors intragroupe, +0,8 % sur l'an dernier.", gravite: "info" }),
            ],
    };
  }

  const lignes: LignePoint[] =
    poste === "marketing"
      ? [
          l(1, 1, { titre: "Avis et demandes", module: "reput", entite_nom: "Brico Soléa Martinique", texte: "La note Google passe de 3,9 à 3,6 en un mois. Six avis portent sur l'attente en caisse le samedi matin ; les réponses sont prêtes, signées par le directeur du magasin.", gravite: "critique", lien: "/espace/validations", objet_type: "demande_validation" }),
          l(1, 2, { titre: "Campagnes", module: "offload", entite_nom: "Soléa Market Jarry", texte: "La campagne Toussaint (4 000 €, 5 jours) doit partir demain matin pour couvrir le week-end : elle attend votre accord.", gravite: "attention", lien: "/espace/validations" }),
          l(1, 3, { titre: "Clients inactifs", module: "offload", entite_nom: "Soléa Auto Guadeloupe", texte: "1 284 clients atelier sans passage depuis 18 mois. Un SMS de relance personnalisé est prêt (900 € d'envoi) ; les opposés au démarchage sont retirés.", gravite: "attention", lien: "/espace/offload" }),
          l(2, 1, { titre: "Campagnes", module: "cashd", texte: "Ventes attribuées hier aux campagnes : 38 200 €, dont 21 400 € pour les portes ouvertes SUV hybrides.", gravite: "info" }),
          l(2, 2, { titre: "Campagnes", module: "cashd", texte: "Budget média engagé ce mois : 16 730 € sur 35 200 € ; Facebook et Instagram en tête.", gravite: "info" }),
          l(3, 1, { titre: "Contenus", module: "filed", texte: "4 contenus préparés cette nuit : 3 visuels chrysanthèmes (Jarry), une story SUV hybride, la newsletter de novembre et une réponse à un avis 2★.", gravite: "info", lien: "/espace/reput" }),
          l(3, 2, { titre: "Validations", module: "socle", texte: "3 décisions vous attendent, dont 1 à échéance aujourd'hui.", gravite: "attention", lien: "/espace/validations" }),
          l(4, 1, { titre: "Équipe", module: "rh", texte: "Vous décidez au nom du directeur commercial de Soléa Auto jusqu'au 7 novembre (délégation en cours).", gravite: "info" }),
          l(5, 1, { titre: "Avis et demandes", module: "reput", texte: "7 630 demandes clients ce mois, 12 sans réponse : questions hors de la base de connaissances (Soléa Market Lamentin).", gravite: "info", lien: "/espace/reput" }),
          l(5, 2, { titre: "Clients", module: "reput", texte: "48 200 clients achètent dans au moins deux enseignes du groupe : +4,2 % en trois mois.", gravite: "info" }),
        ]
      : [
          l(1, 1, { titre: "Trésorerie du groupe", module: "cashd", entite_nom: "Maison Soléa", texte: "Maison Soléa passe sous son plancher de 250 k€ le 12 novembre au rythme des encaissements d'octobre. Une avance de 180 k€ du siège attend votre décision.", gravite: "critique", lien: "/espace/validations", objet_type: "demande_validation" }),
          l(1, 2, { titre: "Juridique", module: "varelo", entite_nom: "Soléa Immobilier", texte: "Le contrat de gardiennage des centres commerciaux (312 k€ sur 3 ans) se reconduit tacitement si personne ne le dénonce sous 2 jours. Deux devis concurrents sont 14 % moins chers.", gravite: "critique", lien: "/espace/validations" }),
          l(1, 3, { titre: "Encours clients", module: "cashd", texte: "Batimat Caraïbes doit 486 k€ à trois sociétés du groupe (Import, Pièces, Brico Guadeloupe), dont 118 k€ échus à plus de 60 jours. Le plafond du groupe est de 400 k€.", gravite: "attention", lien: "/espace/cashd" }),
          l(1, 4, { titre: "Ventes", module: "varelo", entite_nom: "Soléa Auto Guadeloupe", texte: "Soléa Auto Guadeloupe recule de 11,4 % sur l'an dernier : le véhicule neuf fait −18 %, l'atelier +4 %.", gravite: "attention", lien: "/espace/varelo" }),
          l(2, 1, { titre: "Trésorerie du groupe", module: "cashd", texte: "Trésorerie disponible ce matin : 23,1 M€ sur 41 comptes. 20,6 M€ d'échéances dans les 30 jours, dont les salaires du 31 (3,96 M€).", gravite: "info" }),
          l(2, 2, { titre: "Trésorerie du groupe", module: "cashd", texte: "Encaissé hier après relance : 312 400 € sur 14 sociétés.", gravite: "info" }),
          l(3, 1, { titre: "Factures reçues", module: "filed", texte: "1 284 factures fournisseurs lues cette semaine dans le groupe : 1 bloquée (IBAN modifié chez un transitaire), 3 en litige.", gravite: "info", lien: "/espace/filed" }),
          l(3, 2, { titre: "Validations", module: "socle", texte: "25 décisions en attente dans les six directions, dont 3 remontent à la présidence.", gravite: "attention", lien: "/espace/validations" }),
          l(4, 1, { titre: "Directions", module: "rh", texte: "La direction des opérations n'a pas encore lu son point du matin ; une réserve transport sur un conteneur doit partir demain.", gravite: "info" }),
          l(5, 1, { titre: "Ventes", module: "varelo", texte: "Ventes de la semaine : 10,4 M€ hors intragroupe (+0,8 % sur l'an dernier). Distribution +2,5 %, Import +3,6 %, Automobile −3,4 %.", gravite: "info", lien: "/espace/varelo" }),
          l(5, 2, { titre: "Reportings", module: "varelo", entite_nom: "Soléa Pièces", texte: "15 reportings reçus sur 18. Soléa Market Lamentin et Brico Soléa Martinique sont en retard, Soléa Pièces n'a rien envoyé.", gravite: "attention", section_incomplete: true }),
          l(5, 3, { titre: "IA du groupe", module: "socle", texte: "Coût de l'IA sur 30 jours : 7 090 € pour 3 895 heures rendues aux équipes. Projection du mois : 8 060 €, juste au-dessus du budget.", gravite: "info", lien: "/espace/utilisation" }),
        ];
  return { point, lignes };
}
