/* Le point du matin d'exemple (05/10/2026) — formes de points_du_jour et
   points_du_jour_lignes. Le point du jour est assemblé à 7 h ; les lignes
   sont groupées par section_rang, le rang 0 d'une section veut dire
   « rien à signaler ». */

import type { LignePoint, PointDuJour } from "../types";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, aujourdHui } from "./socle";

const C = EXEMPLE_CLIENT_ID;

export function pointExemple(decalage = 0): { point: PointDuJour; lignes: LignePoint[] } {
  const jour = aujourdHui(decalage);
  const id = `00000000-0000-4000-8000-0000000000${(0x90 + Math.abs(decalage)).toString(16)}`;
  const point: PointDuJour = {
    id,
    client_id: C,
    user_id: EXEMPLE_MOI,
    jour,
    territoire: "FR",
    fuseau: "Europe/Paris",
    heure: "07:00",
    statut: decalage === 0 ? "remis" : "remis",
    canal: "email",
    contenu: "complet",
    incomplet: decalage === 0,
    motifs: decalage === 0 ? [{ module: "reput", motif: "Le connecteur Google n'a pas répondu avant 6 h 50 ; les avis de la nuit manquent." }] : [],
    nb_sections: 5,
    nb_items: decalage === 0 ? 11 : 7,
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
      lignes: [
        l(1, 1, { titre: "Trésorerie", module: "cashd", texte: "Solde consolidé 48 210 €. Aucune échéance au-delà du solde cette semaine.", gravite: "info", sante: true }),
        l(2, 0, { titre: "Factures reçues", module: "filed", texte: "Rien à signaler.", sante: true }),
        l(3, 1, { titre: "Validations", module: "socle", texte: "3 demandes en attente, aucune en retard.", gravite: "info", lien: "/espace/validations" }),
        l(4, 0, { titre: "Équipe", module: "rh", texte: "Rien à signaler.", sante: true }),
        l(5, 1, { titre: "Clients", module: "reput", texte: "2 nouveaux avis (4 et 5 étoiles), réponses envoyées.", gravite: "info" }),
      ],
    };
  }

  const lignes: LignePoint[] = [
    l(1, 1, { titre: "Trésorerie", module: "cashd", entite_nom: "Siège (Lyon)", texte: "Solde consolidé 31 420 € ce matin. Le virement Métallerie Roux (12 480 €) attend encore une approbation : si rien ne bouge aujourd'hui, l'échéance est dépassée.", gravite: "critique", lien: "/espace/validations", objet_type: "demande_validation" }),
    l(1, 2, { titre: "Trésorerie", module: "cashd", texte: "Encaissement attendu : Confluence Promotion, 38 500 € (échéance dans 4 jours, relance envoyée hier).", gravite: "attention" }),
    l(1, 3, { titre: "Trésorerie", module: "cashd", texte: "Prélèvement Électricité de Lyon (2 316,70 €) le 20 : couvert.", gravite: "info" }),
    l(2, 1, { titre: "Factures reçues", module: "filed", texte: "1 facture bloquée : Métallerie Roux, IBAN différent de celui connu. Appeler le fournisseur au numéro habituel avant toute levée.", gravite: "critique", lien: "/espace/filed", objet_type: "filed_document", objet_id: "R2026-000009" }),
    l(2, 2, { titre: "Factures reçues", module: "filed", texte: "1 facture en litige : TechPro, +360 € par rapport à la commande BC-2026-0077. Le fournisseur n'a pas encore répondu.", gravite: "attention", lien: "/espace/filed", objet_id: "R2026-000011" }),
    l(2, 3, { titre: "Factures reçues", module: "filed", texte: "2 documents attendent : 1 en lecture, 1 à classer (scan du 1er octobre).", gravite: "info", lien: "/espace/filed" }),
    l(3, 1, { titre: "Validations", module: "socle", texte: "8 demandes attendent votre décision, dont 1 en retard et 2 à échéance aujourd'hui.", gravite: "attention", lien: "/espace/validations" }),
    l(3, 2, { titre: "Validations", module: "socle", texte: "Vous décidez au nom de Claire Morel jusqu'au 21 octobre (délégation en cours).", gravite: "info" }),
    l(4, 1, { titre: "Équipe", module: "rh", entite_nom: "Agence de Grenoble", texte: "Sofia Carvalho demande 5 jours du 13 au 17 octobre ; Yanis Dupré assurerait le remplacement.", gravite: "info", lien: "/espace/validations" }),
    l(5, 1, { titre: "Clients", module: "reput", texte: "Les avis de la nuit n'ont pas pu être lus (connecteur Google indisponible à 6 h 50). Section incomplète.", gravite: "attention", section_incomplete: true }),
    l(5, 2, { titre: "Clients", module: "reput", texte: "Hier : 1 avis 5 étoiles (M. Perrin, « cuisine posée en une journée »), réponse envoyée.", gravite: "info" }),
  ];
  return { point, lignes };
}
