/* Le point du matin d'exemple (05/10/2026) — formes de points_du_jour et
   points_du_jour_lignes. Le point du jour est assemblé à 7 h ; les lignes
   sont groupées par section_rang, le rang 0 d'une section veut dire
   « rien à signaler ». */

import type { LignePoint, PointDuJour } from "../types";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI, aujourdHui, jourMois } from "./socle";
import { DEMANDES_EXEMPLE } from "./validations";

/* 04/11 — la ligne « N demandes attendent » se compte sur la file d'exemple : le même chiffre que « À valider » */
function ligneFile(): string {
  const maintenant = Date.now();
  const jour = aujourdHui();
  const ouvertes = DEMANDES_EXEMPLE.filter((d) => d.statut === "en_attente");
  const retard = ouvertes.filter((d) => d.echeance && new Date(d.echeance).getTime() < maintenant).length;
  const ajd = ouvertes.filter((d) => d.echeance && new Date(d.echeance).getTime() >= maintenant && d.echeance.slice(0, 10) === jour).length;
  const details = [retard ? `${retard} en retard` : "", ajd ? `${ajd} à échéance aujourd'hui` : ""].filter(Boolean).join(" et ");
  return `${ouvertes.length} demande${ouvertes.length > 1 ? "s attendent" : " attend"} votre décision${details ? `, dont ${details}` : ""}.`;
}

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
    nb_sections: decalage === 0 ? 11 : 5,
    nb_items: decalage === 0 ? 26 : 7,
    nb_critiques: decalage === 0 ? 6 : 0,
    version: 1,
    remis_le: `${jour}T05:00:00.000Z`,
    ouvert_le: `${jour}T06:12:00.000Z`,
  };

  /* « 23/10/2026 » : la date que les textes des sections réelles écrivent en toutes lettres */
  const dateFr = (d: number) => new Date(`${aujourdHui(d)}T12:00:00`).toLocaleDateString("fr-FR");

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
    /* « Les sept dernières éditions restent consultables » : chaque édition passée dit sa journée, au lieu de
       répéter mot pour mot la même (03/11/2026, docs/verification/PROMESSES-ECRANS.md) */
    const k = Math.abs(decalage);
    const solde = [48210, 46935, 51480, 49760, 44120, 47305][(k - 1) % 6];
    const factures = [0, 2, 1, 0, 3, 1][(k - 1) % 6];
    const validations = [3, 5, 2, 4, 6, 1][(k - 1) % 6];
    const avis = [2, 0, 1, 3, 1, 2][(k - 1) % 6];
    const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
    return {
      point,
      lignes: [
        l(1, 1, { titre: "Trésorerie", module: "cashd", texte: `Solde consolidé ${euros(solde)}. Aucune échéance au-delà du solde cette semaine.`, gravite: "info", sante: true }),
        factures
          ? l(2, 1, { titre: "Factures reçues", module: "filed", texte: `${factures} facture${factures > 1 ? "s" : ""} lue${factures > 1 ? "s" : ""} et classée${factures > 1 ? "s" : ""}, aucune anomalie.`, gravite: "info", lien: "/espace/filed" })
          : l(2, 0, { titre: "Factures reçues", module: "filed", texte: "Rien à signaler.", sante: true }),
        l(3, 1, { titre: "Validations", module: "socle", texte: `${validations} demande${validations > 1 ? "s" : ""} en attente, aucune en retard.`, gravite: "info", lien: "/espace/validations" }),
        l(4, 0, { titre: "Équipe", module: "rh", texte: "Rien à signaler.", sante: true }),
        avis
          ? l(5, 1, { titre: "Clients", module: "reput", texte: `${avis} ${avis > 1 ? "nouveaux" : "nouvel"} avis, réponse${avis > 1 ? "s" : ""} envoyée${avis > 1 ? "s" : ""}.`, gravite: "info" })
          : l(5, 0, { titre: "Clients", module: "reput", texte: "Rien à signaler.", sante: true }),
      ],
    };
  }

  const lignes: LignePoint[] = [
    l(1, 1, { titre: "Trésorerie", module: "cashd", entite_nom: "Siège (Lyon)", texte: "Solde consolidé 31 420 € ce matin. Le virement Métallerie Roux (12 480 €) attend encore une approbation : si rien ne bouge aujourd'hui, l'échéance est dépassée.", gravite: "critique", lien: "/espace/validations", objet_type: "demande_validation" }),
    l(1, 2, { titre: "Trésorerie", module: "cashd", texte: "Encaissement attendu : Confluence Promotion, 38 500 € (échéance dans 4 jours, relance envoyée hier).", gravite: "attention" }),
    l(1, 3, { titre: "Trésorerie", module: "cashd", texte: "Prélèvement Électricité de Lyon (2 316,70 €) le 20 : couvert.", gravite: "info" }),
    l(2, 1, { titre: "Factures reçues", module: "filed", texte: "3 factures bloquées, dont Métallerie Roux : IBAN différent de celui connu. Appeler le fournisseur au numéro habituel avant toute levée.", gravite: "critique", lien: "/espace/filed", objet_type: "filed_document", objet_id: "R2026-000009" }),
    l(2, 2, { titre: "Factures reçues", module: "filed", texte: "1 facture en litige : TechPro, +360 € par rapport à la commande BC-2026-0077. Le fournisseur n'a pas encore répondu.", gravite: "attention", lien: "/espace/filed", objet_id: "R2026-000011" }),
    l(2, 3, { titre: "Factures reçues", module: "filed", texte: `2 documents attendent : 1 en lecture, 1 à classer (scan du ${jourMois(-2)}).`, gravite: "info", lien: "/espace/filed" }),
    l(3, 1, { titre: "Validations", module: "socle", texte: ligneFile(), gravite: "attention", lien: "/espace/validations" }),
    l(3, 2, { titre: "Validations", module: "socle", texte: `Vous décidez au nom de Claire Morel jusqu'au ${jourMois(16)} (délégation en cours).`, gravite: "info" }),
    l(4, 1, { titre: "Équipe", module: "rh", entite_nom: "Agence de Grenoble", texte: `Sofia Carvalho demande 5 jours du ${jourMois(10)} au ${jourMois(14)} ; Yanis Dupré assurerait le remplacement.`, gravite: "info", lien: "/espace/validations" }),
    l(5, 1, { titre: "Clients", module: "reput", texte: "Les avis de la nuit n'ont pas pu être lus (connecteur Google indisponible à 6 h 50). Section incomplète.", gravite: "attention", section_incomplete: true }),
    l(5, 2, { titre: "Clients", module: "reput", texte: "Hier : 1 avis 5 étoiles (M. Perrin, « cuisine posée en une journée »), réponse envoyée.", gravite: "info" }),
    /* Les modules métier déposent eux aussi leurs sections (b6_23 pour DALIRO, b2_18 et b3t_04 pour
       TAVARO, b3_06 pour TIROMA, b4_14 pour TAMILA) : le site promet « vos trois listes du matin »,
       « chaque agence reçoit sa page », « les créneaux libérés remontent le matin », « vos délais et
       audiences ». Chaque ligne nomme un objet que l'aiguillage sait ouvrir (aiguillage.ts). */
    l(6, 1, { titre: "Chantiers", module: "daliro", texte: "Résidence Les Tilleuls : l'avenant n° 1 « Garde-corps supplémentaires sur les balcons du R+3 » (1 884,00 € HT) est validé mais pas signé — faites-le signer avant d'exécuter.", gravite: "attention", lien: "/espace/daliro", objet_type: "btp_avenants", objet_id: "00000000-0000-4000-8000-00000000d081" }),
    l(6, 2, { titre: "Chantiers", module: "daliro", texte: "Serrurerie Dumont n'a pas confirmé son passage du lendemain sur Résidence Les Tilleuls : relancez avant le départ.", gravite: "attention", lien: "/espace/daliro", objet_type: "btp_chantiers", objet_id: "00000000-0000-4000-8000-00000000d001" }),
    l(6, 3, { titre: "Chantiers", module: "daliro", texte: `Résidence Les Tilleuls : « Garde-corps acier, balcons R+3 » chez Serrurerie Dumont devait être commandé avant le ${dateFr(-4)} — commandez aujourd'hui ou recalez le passage.`, gravite: "attention", lien: "/espace/daliro", objet_type: "btp_chantiers", objet_id: "00000000-0000-4000-8000-00000000d001" }),
    l(7, 1, { titre: "Retours et parc", module: "tavaro", entite_nom: "Lyon Part-Dieu", texte: "1 proposition de 418,20 € attend votre décision (C-2026-0398) ; 3 retours sont bloqués, dont 1 pour preuve manquante.", gravite: "attention", lien: "/tavaro/facturation", objet_type: "loc_propositions", objet_id: "00000000-0000-4000-8000-0000000pr002" }),
    l(7, 2, { titre: "Retours et parc", module: "tavaro", entite_nom: "Lyon Part-Dieu", texte: "Une remise en location est à finir avant le prochain départ : voyant de pression des pneus allumé au retour.", gravite: "attention", lien: "/espace2/tavaro", objet_type: "loc_remises", objet_id: "00000000-0000-4000-8000-0000000rm001" }),
    l(8, 1, { titre: "Cabinet dentaire", module: "tiroma", texte: "Couronne de Michel Dorville : le travail n'est pas revenu du laboratoire et la pose est dans deux jours.", gravite: "critique", lien: "/espace2/tiroma/avant", objet_type: "tiroma_travaux_labo", objet_id: "w-1" }),
    l(8, 2, { titre: "Cabinet dentaire", module: "tiroma", texte: "3 créneaux se libèrent d'ici jeudi : le premier demain à 9 h, fauteuil 2 (45 min) — à proposer dès ce matin.", gravite: "attention", lien: "/espace2/tiroma/creneaux", objet_type: "tiroma_evenements_agenda", objet_id: "9101" }),
    l(8, 3, { titre: "Cabinet dentaire", module: "tiroma", texte: "11 plans signés attendent un rendez-vous, le plus ancien depuis 42 jours.", gravite: "info", lien: "/espace2/tiroma/plans", objet_type: "tiroma_plans", objet_id: "pl-1" }),
    l(10, 1, { titre: "Permis et chantier", module: "lorani", texte: "Question sans réponse depuis 21 jours : la date de dépose de l'échafaudage côté cour (Façade rue Mercière).", gravite: "attention", lien: "/espace2/lorani/questions", objet_type: "lorani_point", objet_id: "00000000-0000-4000-8000-00000000a0ca" }),
    l(10, 2, { titre: "Permis et chantier", module: "lorani", texte: "PCMI « Maison Lemoine » : la mairie réclame des pièces, à déposer avant la fin du délai.", gravite: "critique", lien: "/espace2/lorani", objet_type: "lorani_permis", objet_id: "00000000-0000-4000-8000-00000000c001" }),
    /* VARELO (b1_07) : « chaque direction reçoit son point du matin » — la direction financière du groupe */
    l(11, 1, { titre: "Groupe", module: "varelo", entite_nom: "Direction financière", texte: "Hôtel des Alpes : 85 000 € d'encours pour le groupe, plafond 70 000 € (3 sociétés).", gravite: "attention", lien: "/espace2/varelo/finance" }),
    l(11, 2, { titre: "Groupe", module: "varelo", entite_nom: "Direction financière", texte: "À valider : dénoncer « Location de deux chariots élévateurs » (Loc'Manut, siège) avant la date limite — 7 800 € par an.", gravite: "critique", lien: "/espace2/validations" }),
    l(9, 1, { titre: "Délais et audiences", module: "tamila", texte: "3 délais de procédure attendent votre confirmation, le plus ancien posé il y a trois mois.", gravite: "critique", lien: "/espace2/tamila" }),
    l(9, 2, { titre: "Délais et audiences", module: "tamila", texte: "16 avis RPVA reçus par courriel sont à rattacher à leur dossier ; le premier s'efface dans huit jours s'il ne l'est pas.", gravite: "attention", lien: "/espace2/tamila/arrivees" }),
    l(9, 3, { titre: "Délais et audiences", module: "tamila", texte: "2 dossiers vivants n'ont plus aucune diligence depuis plus de trente jours.", gravite: "info", lien: "/espace2/tamila/pilotage" }),
  ];
  return { point, lignes };
}
