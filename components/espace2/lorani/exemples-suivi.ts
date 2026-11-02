/* ══════════════════════════════════════════════════════════════════════
   LORANI — les exemples des pages « Questions et réponses » et « À viser »
   (02/11/2026)

   Le dossier d'exemple (components/espace/lorani/exemples.ts) n'a que
   quatre points et deux situations, deux visas à viser : trop peu pour
   recopier Plain (Threads : 7 + 6 + … fils) et Linear (My issues : 17
   lignes en trois groupes) avec un contenu de même longueur. Ces lignes
   s'ajoutent au dossier d'exemple, en mémoire, quand l'une des deux pages
   s'ouvre sur l'exemple (useExempleSuivi) ; le fichier d'exemple commun
   n'est pas touché. Personnes et entreprises fictives, celles du dossier
   d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import type { Dossier, Point, Reserve, Situation, Visa } from "@/components/espace/lorani/types";
import { useLorani } from "./donnees";

const id = (lettre: string, n: number) => `00000000-0000-4000-8000-00000000${lettre}${n.toString(16).padStart(3, "0")}`;
const j = (n: number) => aujourdHui(n);

/* les identifiants du dossier d'exemple (exemples.ts) */
const P_LEMOINE = id("b", 1);
const P_ENFANCE = id("b", 2);
const P_MARTIN = id("b", 3);
const P_MERCIERE = id("b", 4);
const I = (n: number) => id("2", n);
const L = (n: number) => id("1", n);
const CR = (n: number) => id("a", 100 + n);
const M = (n: number) => id("m", n);

const point = (p: Partial<Point> & Pick<Point, "id" | "projet_id" | "texte">, jours: number): Point => ({
  lot_id: null, intervenant_id: null, nature: "question", echeance: null, statut: "ouvert", reponse: null, repondu_le: null,
  ouvert_au_cr: null, clos_au_cr: null, cree_le: ilYa(jours, 10), maj_le: ilYa(jours, 10), ...p,
});

export const QUESTIONS_SUIVI: Point[] = [
  point({ id: id("q", 1), projet_id: P_LEMOINE, intervenant_id: I(2), lot_id: L(1), texte: "La semelle filante S3 reprend-elle la descente de charge du mur de refend après la suppression du poteau P4 ?", echeance: j(-6) }, 19),
  point({ id: id("q", 2), projet_id: P_ENFANCE, intervenant_id: I(5), texte: "Isolement entre la salle de repos et la cuisine : coupe-feu 1 h ou 2 h, porte comprise ?", echeance: j(-2) }, 16),
  point({ id: id("q", 3), projet_id: P_ENFANCE, intervenant_id: I(6), texte: "Plan général de coordination : version à jour avec la co-activité des lots 01 et 02 en novembre", lot_id: L(5) }, 12),
  point({ id: id("q", 4), projet_id: P_MERCIERE, intervenant_id: I(8), lot_id: L(8), texte: "Origine et certificat de la pierre de remplacement des appuis de baies (carrière, banc, gélivité)", echeance: j(-1) }, 11),
  point({ id: id("q", 5), projet_id: P_MARTIN, intervenant_id: I(7), texte: "Coloris des menuiseries extérieures : gris anthracite RAL 7016 ou gris quartz RAL 7039 ?" }, 10),
  point({ id: id("q", 6), projet_id: P_ENFANCE, intervenant_id: I(4), texte: "Cuisine du pôle enfance : liaison froide ou liaison chaude, pour figer le programme du lot 08" }, 9),
  point({ id: id("q", 7), projet_id: P_LEMOINE, intervenant_id: I(3), texte: "Cote NGF du terrain naturel à l'angle nord-est, pour caler le niveau du dallage", echeance: j(4) }, 5),
  point({ id: id("q", 8), projet_id: P_LEMOINE, intervenant_id: I(2), lot_id: L(1), nature: "action", texte: "Envoyer le plan des réservations et trémies à l'indice B", echeance: j(2) }, 6),
  point({ id: id("q", 9), projet_id: P_ENFANCE, intervenant_id: I(5), texte: "Date de passage pour la vérification des réservations avant coulage (RVRAT)", echeance: j(8) }, 3),
  point({ id: id("q", 10), projet_id: P_MARTIN, intervenant_id: I(7), texte: "Accord sur le devis de reprise en sous-œuvre du mur mitoyen" }, 1),
  point({ id: id("q", 11), projet_id: P_LEMOINE, intervenant_id: I(2), lot_id: L(1), texte: "Épaisseur du plancher haut du garage avec la charge de la terrasse",
    statut: "repondu", reponse: "20 cm, dalle pleine, armatures selon la note de calcul indice C jointe.", repondu_le: j(-2), maj_le: ilYa(2, 15) }, 13),
  point({ id: id("q", 12), projet_id: P_ENFANCE, intervenant_id: I(6), texte: "Accès au chantier pendant les vacances scolaires : portail nord ou portail sud ?",
    statut: "repondu", reponse: "Portail nord, la cour reste fermée au public du 19/12 au 04/01.", repondu_le: j(-1), maj_le: ilYa(1, 11) }, 8),
  point({ id: id("q", 13), projet_id: P_MERCIERE, intervenant_id: I(9), lot_id: L(9), texte: "Teinte des filets de protection de l'échafaudage côté rue",
    statut: "clos", reponse: "Filets gris clair, accord de l'architecte des bâtiments de France.", repondu_le: j(-9), maj_le: ilYa(8, 9), ouvert_au_cr: CR(1), clos_au_cr: CR(2) }, 21),
];

/* « À viser » : des visas et des situations de plus, à toutes les échéances */
const visa = (v: Partial<Visa> & Pick<Visa, "id" | "projet_id" | "document" | "indice" | "recu_le" | "a_viser_avant">): Visa => ({
  lot_id: null, commande_le: null, delai_visa_jours: 15, avis: "a_viser", observation: null, vise_le: null, ...v,
});
export const VISAS_SUIVI: Visa[] = [
  visa({ id: id("v", 1), projet_id: P_ENFANCE, lot_id: L(6), document: "Synoptique du système de sécurité incendie", indice: "A", recu_le: j(-17), a_viser_avant: j(-3), delai_visa_jours: 14 }),
  visa({ id: id("v", 2), projet_id: P_ENFANCE, lot_id: L(5), document: "Plans d'exécution des voiles du rez-de-chaussée", indice: "B", recu_le: j(-6), commande_le: j(9), a_viser_avant: j(1) }),
  visa({ id: id("v", 3), projet_id: P_LEMOINE, lot_id: L(3), document: "Fiche des menuiseries aluminium (fabrication 10 semaines)", indice: "A", recu_le: j(-4), commande_le: j(11), a_viser_avant: j(4) }),
  visa({ id: id("v", 4), projet_id: P_LEMOINE, lot_id: L(2), document: "Plans de charpente et note de calcul", indice: "A", recu_le: j(-3), a_viser_avant: j(5) }),
  visa({ id: id("v", 5), projet_id: P_ENFANCE, lot_id: L(4), document: "Plan des réseaux enterrés", indice: "C", recu_le: j(-1), a_viser_avant: j(10) }),
  visa({ id: id("v", 6), projet_id: P_MERCIERE, lot_id: L(8), document: "Échantillon de mortier teinté — panneau témoin", indice: "A", recu_le: j(0), a_viser_avant: j(12) }),
  visa({ id: id("v", 7), projet_id: P_ENFANCE, lot_id: L(6), document: "Carnet de câblage du tableau général basse tension", indice: "A", recu_le: j(-2), a_viser_avant: j(13) }),
  visa({ id: id("v", 8), projet_id: P_LEMOINE, lot_id: L(1), document: "Plan de ferraillage des longrines", indice: "B", recu_le: j(0), a_viser_avant: j(15) }),
];
export const SITUATIONS_SUIVI: Situation[] = [
  { id: id("w", 1), projet_id: P_MERCIERE, marche_id: M(2), numero: 3, mois: `${j(-5).slice(0, 7)}-01`, cumul_ht: 15800, recue_le: j(-2), a_viser_avant: j(13), statut: "a_viser", cumul_admis_ht: null, observation: null, visee_le: null },
];
const reserve = (r: Partial<Reserve> & Pick<Reserve, "id" | "numero" | "intitule" | "lever_avant">): Reserve => ({
  projet_id: P_MERCIERE, lot_id: L(8), marche_id: M(1), localisation: null, origine: "opr", constatee_le: j(-6), statut: "ouverte", levee_le: null, motif: null, ...r,
});
export const RESERVES_SUIVI: Reserve[] = [
  reserve({ id: id("x", 1), numero: 4, intitule: "Garde-corps de la baie 7 non refixé", localisation: "Façade sud, 3e étage", lever_avant: j(6) }),
];

const ajoute = <T extends { id: string }>(liste: T[], nouveaux: T[]) => [...liste, ...nouveaux.filter((n) => !liste.some((x) => x.id === n.id))];

export function avecSuivi(d: Dossier): Dossier {
  return {
    ...d,
    points: ajoute(d.points, QUESTIONS_SUIVI),
    visas: ajoute(d.visas, VISAS_SUIVI),
    situations: ajoute(d.situations, SITUATIONS_SUIVI),
    reserves: ajoute(d.reserves, RESERVES_SUIVI),
  };
}

/* sur l'exemple, une fois : le dossier en mémoire reçoit ces lignes (les saisies déjà jouées restent) */
export function useExempleSuivi() {
  const { source, dossier, onLocal } = useLorani();
  const manque = source === "exemple" && !dossier.points.some((p) => p.id === QUESTIONS_SUIVI[0].id);
  useEffect(() => {
    if (manque) onLocal(avecSuivi(dossier));
  }, [manque, dossier, onLocal]);
}
