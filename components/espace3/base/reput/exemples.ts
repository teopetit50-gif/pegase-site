/* ══════════════════════════════════════════════════════════════════════
   L'EXEMPLE de l'écran REPUT (06/10/2026, session C3 ; Groupe Soléa le 30/10/2026)

   Le Groupe Soléa (le monde d'exemple commun, base/exemples/socle.ts) reçoit
   les demandes des clients de ses enseignes par courriel, WhatsApp et les
   formulaires des sites : Soléa Market, Brico Soléa, Soléa Auto, Soléa
   Location, Maison Soléa. Ce matin : une réponse prête à valider (21 h hier,
   « ouverts dimanche matin ? »), une partie seule par accord (carte de
   fidélité), un devis d'atelier transmis, une livraison manquée remontée,
   un formulaire sans adresse, une panne en urgence, une question de stock,
   et deux avis Google de Brico Soléa Martinique sur l'attente en caisse
   le samedi. Rien d'ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { AGENCE, AUTO_GP, BRICO_MQ, dans, ENTITES, EXEMPLE_CLIENT_ID, ilYa, LAMENTIN, nomEntite } from "../exemples/socle";
import type { AccordSujet, Demande, Fiche, Monde, Reception, Reponse, Sujet } from "./types";

const LOCATION = ENTITES[10].id;
const BRICO_GP = ENTITES[12].id;
const MAISON = ENTITES[13].id;

const F = {
  horaires: "00000000-0000-4000-8000-00000000c301",
  fidelite: "00000000-0000-4000-8000-00000000c302",
  rdv: "00000000-0000-4000-8000-00000000c303",
  livraison: "00000000-0000-4000-8000-00000000c304",
  location: "00000000-0000-4000-8000-00000000c305",
  horairesBrico: "00000000-0000-4000-8000-00000000c306",
  courtoisie: "00000000-0000-4000-8000-00000000c307",
};

const MENTION = "Réponse préparée par notre assistant à partir de nos informations, relue par nos équipes.";
const signature = (d: Demande) => `Bien cordialement,\n${d.entite_id ? `L'équipe de ${nomEntite(d.entite_id)}` : "L'équipe du Groupe Soléa"}`;

function fiche(id: string, sujet: string, genre: Fiche["genre"], titre: string, contenu: string, source: string, extra: Partial<Fiche> = {}): Fiche {
  return { id, entite_id: null, origine_id: id, version: 1, sujet, genre, titre, contenu, langue: "fr", source, valide_du: ilYa(90).slice(0, 10),
           valide_au: null, statut: "validee", cree_le: ilYa(90), valide_le: ilYa(90), ...extra };
}

export const SUJETS_EXEMPLE: Sujet[] = [
  ["horaires", "Horaires et accès", true], ["tarifs", "Tarifs et prix", true], ["rendez_vous", "Rendez-vous", true],
  ["devis", "Demande de devis", true], ["information", "Renseignement", true], ["suivi", "Suivi d'un dossier", true],
  ["avis", "Avis et retours", true], ["reclamation", "Réclamation", false], ["urgence", "Urgence", false],
  ["humain", "Parler à une personne", false], ["autre", "Autre", false],
].map(([code, libelle, autorisable], i) => ({ code: code as string, libelle: libelle as string, description: null, autorisable: autorisable as boolean, actif: true, ordre: (i + 1) * 10,
               delai_heures: code === "urgence" ? 1 : code === "reclamation" || code === "humain" ? 4 : 24,
               /* c3_16 : les rendez-vous vont à l'équipe Atelier et après-vente (le second service prévenu dans l'exemple) */
               equipe_id: code === "rendez_vous" ? "00000000-0000-4000-8000-00000000c3c2" : null }));

function demande(n: number, canal: Demande["canal"], nom: string, adresse: string | null, recu: string, extra: Partial<Demande>): Demande {
  return {
    id: `00000000-0000-4000-8000-0000000c3d${String(n).padStart(2, "0")}`, client_id: EXEMPLE_CLIENT_ID, entite_id: null, reception_id: 9000 + n, canal,
    canal_reponse: adresse ? (canal === "formulaire" ? "email" : canal === "whatsapp" ? "whatsapp" : canal === "sms" ? "sms" : "email") : null,
    adresse_reponse: adresse, de_nom: nom, objet: null, statut: "a_valider", sujet: null, langue: "fr", urgence: false, couverte: true,
    motif: null, recu_le: recu, preparee_le: recu, decidee_le: null, envoyee_le: null, ...extra,
  };
}

function reponse(n: number, d: Demande, corps: string, extra: Partial<Reponse>): Reponse {
  return {
    id: `00000000-0000-4000-8000-0000000c3e${String(n).padStart(2, "0")}`, demande_id: d.id, version: 1, sujet: d.sujet ?? "autre", langue: "fr", couverte: d.couverte ?? false,
    objet: d.canal_reponse === "email" ? `Re : ${d.objet ?? "Votre demande"}` : null,
    corps: `Bonjour,\n\n${corps}\n\n${signature(d)}\n\n${MENTION}`, sources: [], raison: null, type_action: `reput.repondre.${d.sujet}`,
    statut: "a_valider", redigee_par: null, modele: "claude-sonnet-5-5", cout_eur: 0.0042, cree_le: d.recu_le, ...extra,
  };
}

export function mondeExemple(): Monde {
  const d1 = demande(1, "email", "Mélissa Bonheur", "melissa.bonheur@exemple.fr", ilYa(1, 21), { objet: "Ouverts dimanche matin ?", sujet: "horaires", entite_id: AGENCE });
  const d2 = demande(2, "whatsapp", "Steeve L.", "+596 696 00 00 02", ilYa(1, 19), { sujet: "information", entite_id: LAMENTIN, statut: "envoyee", decidee_le: ilYa(1, 19), envoyee_le: ilYa(1, 19) });
  const d3 = demande(3, "formulaire", "Rudy Nelson", "rudy.nelson@exemple.fr", ilYa(0, 7), { objet: "Formulaire du site Soléa Auto", sujet: "devis", entite_id: AUTO_GP, couverte: false,
                                                                                       sujet_secondaire: "rendez_vous" });
  const d4 = demande(4, "email", "Josiane Placide", "j.placide@exemple.fr", ilYa(0, 8), { objet: "Livraison du canapé non faite", sujet: "reclamation", entite_id: MAISON, urgence: false,
                                                                                      de_empreinte: "exemple-placide", litige: true, escaladee_le: ilYa(0, 12) });
  const d5 = demande(5, "formulaire", "Gérard", null, ilYa(0, 6), { objet: "Formulaire du site Soléa Location", sujet: "information", entite_id: LOCATION, statut: "a_traiter", couverte: false,
                                                                    motif: "Aucune adresse de réponse : à traiter par une personne." });
  /* c3_15 : même nom, autre canal, sans clé commune → le rapprochement est proposé, une personne décide */
  const d6 = demande(6, "whatsapp", "Nelson Rudy", "+590 690 00 00 06", ilYa(0, 5), { sujet: "devis", entite_id: AUTO_GP, statut: "a_preparer", couverte: null, preparee_le: null,
                                                                                    rapprochement_propose: d3.id });
  /* c3_22 : une urgence non prise, l'astreinte appelée (rang 2 après un rang 1 sans réponse) */
  const d7 = demande(7, "whatsapp", "Murielle Ferdinand", "+590 690 00 00 07", ilYa(0, 1), { sujet: "urgence", entite_id: AUTO_GP, statut: "a_traiter", urgence: true, couverte: false,
                                                                                             motif: "Urgence : jamais de réponse automatique, l'astreinte est appelée." });
  const d8 = demande(8, "formulaire", "Avis Google · Christelle M.", "Fiche Google de Brico Soléa Martinique", ilYa(0, 10),
                     { objet: "Avis Google, 2 étoiles : attente en caisse le samedi", sujet: "avis", entite_id: BRICO_MQ, canal_reponse: null });
  const d9 = demande(9, "email", "Fabrice Sylvestre", "f.sylvestre@exemple.fr", ilYa(0, 9), { objet: "Plaques de plâtre hydrofuges en stock ?", sujet: "information", entite_id: BRICO_GP,
                                                                                            couverte: false });
  const d10 = demande(10, "formulaire", "Avis Google · Patrice R.", "Fiche Google de Brico Soléa Martinique", ilYa(0, 11),
                      { objet: "Avis Google, 1 étoile : une heure pour payer", sujet: "avis", entite_id: BRICO_MQ, canal_reponse: null, statut: "a_preparer", couverte: null, preparee_le: null });
  const receptions: Record<number, Reception> = {
    9001: { id: 9001, canal: "email", de_nom: "Mélissa Bonheur", de_adresse: "melissa.bonheur@exemple.fr", sujet: "Ouverts dimanche matin ?", recu_le: d1.recu_le, pieces: [],
            corps: "Bonjour,\nJe voudrais faire mes courses dimanche matin à Soléa Market Jarry. Êtes-vous ouverts, et jusqu'à quelle heure ?\nMerci,\nMélissa" },
    9002: { id: 9002, canal: "whatsapp", de_nom: "Steeve L.", de_adresse: "+596 696 00 00 02", sujet: null, recu_le: d2.recu_le, pieces: [],
            corps: "Bonsoir, j'ai 640 points sur ma carte de fidélité Soléa, comment je les utilise ?" },
    9003: { id: 9003, canal: "formulaire", de_nom: "Rudy Nelson", de_adresse: "rudy.nelson@exemple.fr", sujet: "Formulaire du site Soléa Auto", recu_le: d3.recu_le, pieces: [],
            corps: "Bonjour, mon SUV hybride (62 000 km) fait un bruit au freinage. Pouvez-vous me faire un devis pour les disques et les plaquettes, et me proposer un rendez-vous à l'atelier de Jarry ?" },
    9004: { id: 9004, canal: "email", de_nom: "Josiane Placide", de_adresse: "j.placide@exemple.fr", sujet: "Livraison du canapé non faite", recu_le: d4.recu_le,
            corps: "Votre livreur devait m'apporter le canapé mardi, personne n'est venu et personne ne m'a prévenue. J'ai posé une journée pour rien. Je commence à perdre patience.",
            pieces: [{ nom: "bon-de-commande-maison-solea.pdf" }] },
    9005: { id: 9005, canal: "formulaire", de_nom: "Gérard", de_adresse: null, sujet: "Formulaire du site Soléa Location", recu_le: d5.recu_le, pieces: [],
            corps: "Rappelez-moi pour réserver un minibus 9 places du 20 au 27 décembre, au 0690 00 00 00." },
    9007: { id: 9007, canal: "whatsapp", de_nom: "Murielle Ferdinand", de_adresse: "+590 690 00 00 07", sujet: null, recu_le: d7.recu_le, pieces: [],
            corps: "La voiture achetée chez vous il y a deux semaines vient de s'arrêter sur la N1 à hauteur de Petit-Bourg. Je suis sur la bande d'arrêt d'urgence avec mes enfants." },
    9006: { id: 9006, canal: "whatsapp", de_nom: "Nelson Rudy", de_adresse: "+590 690 00 00 06", sujet: null, recu_le: d6.recu_le, pieces: [],
            corps: "Pour le devis des freins, je suis disponible jeudi ou vendredi matin." },
    9008: { id: 9008, canal: "formulaire", de_nom: "Avis Google · Christelle M.", de_adresse: null, sujet: "Avis Google, 2 étoiles", recu_le: d8.recu_le, pieces: [],
            corps: "Samedi matin, 35 minutes d'attente en caisse, deux caisses ouvertes sur huit. Les vendeurs du rayon peinture sont aimables, mais je ne reviendrai pas un samedi." },
    9009: { id: 9009, canal: "email", de_nom: "Fabrice Sylvestre", de_adresse: "f.sylvestre@exemple.fr", sujet: "Plaques de plâtre hydrofuges en stock ?", recu_le: d9.recu_le, pieces: [],
            corps: "Bonjour,\nAvez-vous 40 plaques de plâtre hydrofuges en stock à Brico Soléa Guadeloupe ? Je passerais les chercher demain avec un utilitaire.\nFabrice Sylvestre, artisan plaquiste" },
    9010: { id: 9010, canal: "formulaire", de_nom: "Avis Google · Patrice R.", de_adresse: null, sujet: "Avis Google, 1 étoile", recu_le: d10.recu_le, pieces: [],
            corps: "Une heure pour payer un sac de ciment un samedi. Personne pour ouvrir une caisse de plus. Le magasin est bien rangé, mais le samedi c'est impossible." },
  };
  const reponses: Reponse[] = [
    reponse(1, d1, "Oui, Soléa Market Jarry vous accueille le dimanche de 8 h à 12 h 30. Le parking et le point de retrait des commandes en ligne sont ouverts aux mêmes heures.",
            { sources: [F.horaires], objet: "Re : Ouverts dimanche matin ?" }),
    reponse(2, d2, "Vos points se convertissent en bon d'achat à partir de 500 points, à l'accueil du magasin ou directement en caisse. La carte est valable dans les magasins Soléa Market, Proxi Soléa, Brico Soléa et Maison Soléa.",
            { sources: [F.fidelite], statut: "envoyee", objet: null }),
    reponse(3, d3, "Merci pour votre demande. Nous la transmettons au chef d'atelier de Soléa Auto Guadeloupe, qui revient vers vous avec un devis et deux créneaux de rendez-vous.",
            { couverte: false, type_action: "reput.transferer", sources: [F.rdv], raison: "La base ne donne pas le coût d'un remplacement des disques et des plaquettes pour ce modèle." }),
    reponse(4, d4, "Nous avons bien reçu votre message et nous en sommes désolés. Le responsable des livraisons de Maison Soléa vous appelle aujourd'hui pour fixer une nouvelle date, à l'heure qui vous convient.",
            { type_action: "reput.transferer", sources: [F.livraison], couverte: true }),
    reponse(5, d8, "Merci d'avoir pris le temps de nous écrire, et pardon pour cette attente. Votre remarque est transmise à la direction du magasin, qui revoit l'ouverture des caisses le samedi matin. En semaine, le magasin vous accueille dès 7 h 30, avec moins d'attente.",
            { sources: [F.horairesBrico], objet: null }),
    reponse(6, d9, "Merci pour votre message. Nous le transmettons au rayon matériaux de Brico Soléa Guadeloupe, qui vérifie le stock et vous répond ce matin, avant votre passage.",
            { couverte: false, type_action: "reput.transferer", raison: "La base ne donne pas l'état du stock en temps réel." }),
  ];
  const fiches: Fiche[] = [
    fiche(F.horaires, "horaires", "horaires", "Horaires de Soléa Market Jarry",
          "Du lundi au samedi de 8 h à 20 h 30 ; le dimanche de 8 h à 12 h 30. Fermé le 1er janvier, le 1er mai et le 25 décembre.",
          "Fiche Google du magasin, relue par Maëva Rosan", { entite_id: AGENCE }),
    fiche(F.fidelite, "information", "information", "Carte de fidélité Soléa",
          "La carte est gratuite et commune aux magasins Soléa Market, Proxi Soléa, Brico Soléa et Maison Soléa. Les points se convertissent en bon d'achat à partir de 500 points, à l'accueil ou en caisse ; ils restent valables 24 mois.",
          "Règlement du programme de fidélité 2026, article 4"),
    fiche(F.rdv, "rendez_vous", "question", "Prendre rendez-vous à l'atelier Soléa Auto",
          "Répondez avec deux créneaux qui vous conviennent ; l'atelier confirme sous 24 h ouvrées. Les ateliers de Jarry et du Lamentin reçoivent du lundi au vendredi de 7 h 30 à 17 h, et le samedi matin.",
          "Procédure d'accueil des ateliers, juin 2026", { entite_id: AUTO_GP }),
    fiche(F.livraison, "suivi", "document", "Livraison des meubles Maison Soléa",
          "La livraison se fait à domicile en Guadeloupe et en Martinique, sur un créneau fixé 48 h à l'avance par le service livraison. Un retard est annoncé au client par SMS la veille.",
          "Conditions générales de vente Maison Soléa 2026, article 7", { entite_id: MAISON }),
    fiche(F.location, "information", "question", "Réserver un véhicule de location",
          "Les minibus 9 places et les utilitaires se réservent jusqu'à trois mois à l'avance. En décembre, réservez au moins trois semaines avant la date de départ.",
          "Maëva Rosan, à valider", { statut: "brouillon", valide_le: null, cree_le: ilYa(1), entite_id: LOCATION }),
    fiche(F.horairesBrico, "horaires", "horaires", "Horaires de Brico Soléa Martinique",
          "Du lundi au samedi de 7 h 30 à 19 h ; le dimanche de 8 h à 12 h. Le samedi matin est le moment le plus chargé en caisse.",
          "Fiche Google du magasin, relue par Maëva Rosan", { entite_id: BRICO_MQ }),
    fiche(F.courtoisie, "rendez_vous", "information", "Véhicule de courtoisie",
          "Pendant une intervention de plus d'une journée, l'atelier prête un véhicule de courtoisie, sur réservation à la prise de rendez-vous.",
          "Procédure d'accueil des ateliers, juin 2026", { entite_id: AUTO_GP }),
  ];
  return {
    equipes: [{ id: "00000000-0000-4000-8000-00000000c3c1", nom: "Accueil des magasins" }, { id: "00000000-0000-4000-8000-00000000c3c2", nom: "Atelier et après-vente" }],
    reglages: {
      id: "00000000-0000-4000-8000-00000000c3a1", signature: "L'équipe du Groupe Soléa", formule_appel: "Bonjour,", formule_politesse: "Bien cordialement,",
      ton: "vouvoiement", mention_automatisee: MENTION, langues: ["fr", "en"], actif: true, accuse: true,
      texte_accuse: "Nous avons bien reçu votre message. Notre équipe vous répond au plus vite.",
      phrase_transfert: "Votre demande est transmise au service {service}, qui revient vers vous.",
      lien_avis: "https://g.page/r/brico-solea-martinique/review",
      texte_avis: "Merci de votre visite. Votre avis aide d'autres clients à nous choisir : il prend une minute.",
      avis_auto_reglement: true,
      envoi_auto: true,
    },
    avis: [
      { id: "00000000-0000-4000-8000-00000000c3b1", canal: "email", adresse: "a.jean-louis@exemple.fr", nom: "M. Jean-Louis", reference: "BMQ-2026-04118",
        regle_le: ilYa(5).slice(0, 10), statut: "sollicite", motif: null, prochain_le: dans(2), envois: ["x"], cree_le: ilYa(5) },
      { id: "00000000-0000-4000-8000-00000000c3b2", canal: "whatsapp", adresse: "+596 696 00 00 32", nom: "Mme Rosier", reference: "BMQ-2026-04152",
        regle_le: ilYa(1).slice(0, 10), statut: "programme", motif: null, prochain_le: dans(2, 10), envois: [], cree_le: ilYa(1) },
      { id: "00000000-0000-4000-8000-00000000c3b3", canal: "email", adresse: "s.larcher@exemple.fr", nom: "Steeve L.", reference: "BMQ-2026-03870",
        regle_le: ilYa(40).slice(0, 10), statut: "avis_recu", motif: null, prochain_le: null, envois: ["y", "z"], cree_le: ilYa(40) },
    ],
    indicateurs: { recues: 1846, repondues: 1512, parties_seules: 694, hors_base: 188, delai_median_minutes: 23 },
    demandes: [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10],
    receptions,
    reponses,
    fiches,
    sujets: SUJETS_EXEMPLE,
    accords: {
      peut_donner: true,
      seul_decideur: false,
      sujets: [
        { sujet: "accuse", libelle: "Accusés de réception", genre: "message" as const, autorisable: true, actif: true, statut: "active" as const,
          fin: dans(300), active_le: ilYa(65), donne_par_libelle: "Maëva Rosan (Marketing)", envoyees_seules_mois: 1240 },
        { sujet: "demande_avis", libelle: "Demandes d'avis", genre: "message" as const, autorisable: true, actif: true, statut: "aucun" as const,
          fin: null, active_le: null, donne_par_libelle: null, envoyees_seules_mois: 0 },
        ...SUJETS_EXEMPLE.map((s) => ({
        sujet: s.code, libelle: s.libelle, autorisable: s.autorisable, actif: true,
        statut: (s.code === "information" ? "active" : "aucun") as AccordSujet["statut"],
        fin: s.code === "information" ? dans(300) : null,
        active_le: s.code === "information" ? ilYa(65) : null,
        donne_par_libelle: s.code === "information" ? "Maëva Rosan (Marketing)" : null,
        envoyees_seules_mois: s.code === "information" ? 694 : 0,
      }))],
    },
  };
}
