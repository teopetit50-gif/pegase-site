/* ══════════════════════════════════════════════════════════════════════
   L'EXEMPLE de l'écran REPUT (06/10/2026, session C3)

   Atelier Bertin (le monde d'exemple commun, components/espace/exemples)
   reçoit ses demandes par courriel, WhatsApp et le formulaire du site. Ce
   matin : une réponse prête à valider (21 h 47 hier, « ouverts samedi ? »),
   une partie seule par accord (tarifs), un « je ne sais pas » à compléter,
   une réclamation remontée, un formulaire sans adresse à traiter soi-même.
   Rien d'ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { dans, EXEMPLE_CLIENT_ID, ilYa } from "../exemples/socle";
import type { AccordSujet, Demande, Fiche, Monde, Reception, Reponse, Sujet } from "./types";

const F = {
  horaires: "00000000-0000-4000-8000-00000000c301",
  diagnostic: "00000000-0000-4000-8000-00000000c302",
  rdv: "00000000-0000-4000-8000-00000000c303",
  garantie: "00000000-0000-4000-8000-00000000c304",
  livraison: "00000000-0000-4000-8000-00000000c305",
};

const SIGNATURE = "Bien cordialement,\nL'équipe de l'Atelier Bertin";
const MENTION = "Réponse préparée par notre assistant à partir de nos informations, relue par l'atelier.";

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
               delai_heures: code === "urgence" ? 1 : code === "reclamation" || code === "humain" ? 4 : 24 }));

function demande(n: number, canal: Demande["canal"], nom: string, adresse: string | null, recu: string, extra: Partial<Demande>): Demande {
  return {
    id: `00000000-0000-4000-8000-0000000c3d0${n}`, client_id: EXEMPLE_CLIENT_ID, entite_id: null, reception_id: 9000 + n, canal,
    canal_reponse: adresse ? (canal === "formulaire" ? "email" : canal === "whatsapp" ? "whatsapp" : canal === "sms" ? "sms" : "email") : null,
    adresse_reponse: adresse, de_nom: nom, objet: null, statut: "a_valider", sujet: null, langue: "fr", urgence: false, couverte: true,
    motif: null, recu_le: recu, preparee_le: recu, decidee_le: null, envoyee_le: null, ...extra,
  };
}

function reponse(n: number, d: Demande, corps: string, extra: Partial<Reponse>): Reponse {
  return {
    id: `00000000-0000-4000-8000-0000000c3e0${n}`, demande_id: d.id, version: 1, sujet: d.sujet ?? "autre", langue: "fr", couverte: d.couverte ?? false,
    objet: d.canal_reponse === "email" ? `Re : ${d.objet ?? "Votre demande"}` : null,
    corps: `Bonjour,\n\n${corps}\n\n${SIGNATURE}\n\n${MENTION}`, sources: [], raison: null, type_action: `reput.repondre.${d.sujet}`,
    statut: "a_valider", redigee_par: null, modele: "claude-sonnet-5-5", cout_eur: 0.0042, cree_le: d.recu_le, ...extra,
  };
}

export function mondeExemple(): Monde {
  const d1 = demande(1, "email", "Marie Durand", "marie.durand@exemple.fr", ilYa(1, 21), { objet: "Ouverts samedi ?", sujet: "horaires" });
  const d2 = demande(2, "whatsapp", "Karim B.", "+33 6 12 34 56 78", ilYa(1, 19), { sujet: "tarifs", statut: "envoyee", decidee_le: ilYa(1, 19), envoyee_le: ilYa(1, 19) });
  const d3 = demande(3, "formulaire", "Luc Martin", "luc.martin@exemple.fr", ilYa(0, 7), { objet: "Formulaire du site", sujet: "devis", couverte: false });
  const d4 = demande(4, "email", "Hélène Roux", "h.roux@exemple.fr", ilYa(0, 8), { objet: "Pose non terminée", sujet: "reclamation", urgence: false,
                                                                                  de_empreinte: "exemple-roux", litige: true, escaladee_le: ilYa(0, 12) });
  const d5 = demande(5, "formulaire", "Bernard", null, ilYa(0, 6), { objet: "Formulaire du site", sujet: "rendez_vous", statut: "a_traiter", couverte: false,
                                                                     motif: "Aucune adresse de réponse : à traiter par une personne." });
  const receptions: Record<number, Reception> = {
    9001: { id: 9001, canal: "email", de_nom: "Marie Durand", de_adresse: "marie.durand@exemple.fr", sujet: "Ouverts samedi ?", recu_le: d1.recu_le, pieces: [],
            corps: "Bonjour,\nJe voudrais passer voir les échantillons de plans de travail. Êtes-vous ouverts samedi matin ?\nMerci,\nMarie" },
    9002: { id: 9002, canal: "whatsapp", de_nom: "Karim B.", de_adresse: "+33 6 12 34 56 78", sujet: null, recu_le: d2.recu_le, pieces: [],
            corps: "Bonsoir, c'est combien pour que vous veniez voir ma porte d'entrée qui frotte ?" },
    9003: { id: 9003, canal: "formulaire", de_nom: "Luc Martin", de_adresse: "luc.martin@exemple.fr", sujet: "Formulaire du site", recu_le: d3.recu_le, pieces: [],
            corps: "Bonjour, je refais ma cuisine (4 m linéaires, chêne). Pouvez-vous me faire un devis pour les façades et le plan de travail ?" },
    9004: { id: 9004, canal: "email", de_nom: "Hélène Roux", de_adresse: "h.roux@exemple.fr", sujet: "Pose non terminée", recu_le: d4.recu_le,
            corps: "Votre poseur devait finir le dressing mardi, personne n'est venu et personne ne m'a prévenue. Je commence à perdre patience.",
            pieces: [{ nom: "photo-dressing.jpg" }] },
    9005: { id: 9005, canal: "formulaire", de_nom: "Bernard", de_adresse: null, sujet: "Formulaire du site", recu_le: d5.recu_le, pieces: [],
            corps: "Rappelez-moi pour un rendez-vous, au 06 00 00 00 00." },
  };
  const reponses: Reponse[] = [
    reponse(1, d1, "Oui, l'atelier vous accueille le samedi de 9 h à 12 h ; les échantillons de plans de travail sont exposés au showroom.",
            { sources: [F.horaires], objet: "Re : Ouverts samedi ?" }),
    reponse(2, d2, "Le diagnostic à domicile coûte 89 € TTC ; il est déduit de la facture si les travaux sont commandés dans le mois.",
            { sources: [F.diagnostic], statut: "envoyee", objet: null }),
    reponse(3, d3, "Merci pour votre demande de devis. Nous la transmettons à notre agenceur, qui revient vers vous pour préciser les dimensions et les finitions.",
            { couverte: false, type_action: "reput.transferer", raison: "La base ne donne pas de prix au mètre linéaire pour les façades en chêne." }),
    reponse(4, d4, "Nous avons bien reçu votre message et nous en sommes désolés. Le responsable de la pose vous appelle aujourd'hui pour fixer la fin du chantier.",
            { type_action: "reput.transferer", sources: [], couverte: true }),
  ];
  const fiches: Fiche[] = [
    fiche(F.horaires, "horaires", "horaires", "Horaires de l'atelier et du showroom",
          "Du lundi au vendredi de 8 h 30 à 18 h ; le samedi de 9 h à 12 h. Fermé le dimanche et les jours fériés.", "Fiche Google de l'atelier, relue par Claire Morel"),
    fiche(F.diagnostic, "tarifs", "tarif", "Diagnostic à domicile",
          "Le diagnostic à domicile coûte 89 € TTC, déduits de la facture si les travaux sont commandés dans le mois.", "Grille tarifaire 2026, page 2"),
    fiche(F.rdv, "rendez_vous", "question", "Comment prendre rendez-vous ?",
          "Répondez avec deux créneaux qui vous conviennent ; l'atelier confirme sous 24 h ouvrées.", "Procédure d'accueil, juin 2026"),
    fiche(F.garantie, "information", "document", "Garantie des poses",
          "Nos poses sont garanties deux ans pièces et main-d'œuvre ; la garantie décennale couvre les ouvrages concernés.", "Conditions générales de vente 2026, article 9"),
    fiche(F.livraison, "suivi", "question", "Délais de fabrication",
          "Une fabrication sur mesure demande de 4 à 6 semaines après la validation du devis et l'acompte.", "Sofia Carvalho, à valider",
          { statut: "brouillon", valide_le: null, cree_le: ilYa(1) }),
  ];
  return {
    equipes: [{ id: "00000000-0000-4000-8000-00000000c3c1", nom: "Accueil showroom" }, { id: "00000000-0000-4000-8000-00000000c3c2", nom: "Pose et SAV" }],
    reglages: {
      id: "00000000-0000-4000-8000-00000000c3a1", signature: "L'équipe de l'Atelier Bertin", formule_appel: "Bonjour,", formule_politesse: "Bien cordialement,",
      ton: "vouvoiement", mention_automatisee: MENTION, langues: ["fr", "en"], actif: true, accuse: true,
      texte_accuse: "Nous avons bien reçu votre message. Notre équipe vous répond au plus vite.",
      lien_avis: "https://g.page/r/atelier-bertin/review",
      texte_avis: "Merci de nous avoir fait confiance. Votre avis aide d'autres clients à nous choisir : il prend une minute.",
      avis_auto_reglement: true,
    },
    avis: [
      { id: "00000000-0000-4000-8000-00000000c3b1", canal: "email", adresse: "m.lefevre@exemple.fr", nom: "M. Lefèvre", reference: "F-2026-118",
        regle_le: ilYa(5).slice(0, 10), statut: "sollicite", motif: null, prochain_le: dans(2), envois: ["x"], cree_le: ilYa(5) },
      { id: "00000000-0000-4000-8000-00000000c3b2", canal: "whatsapp", adresse: "+33 6 98 76 54 32", nom: "Mme Chassaing", reference: "F-2026-121",
        regle_le: ilYa(1).slice(0, 10), statut: "programme", motif: null, prochain_le: dans(2, 10), envois: [], cree_le: ilYa(1) },
      { id: "00000000-0000-4000-8000-00000000c3b3", canal: "email", adresse: "k.ben@exemple.fr", nom: "Karim B.", reference: "F-2026-087",
        regle_le: ilYa(40).slice(0, 10), statut: "avis_recu", motif: null, prochain_le: null, envois: ["y", "z"], cree_le: ilYa(40) },
    ],
    indicateurs: { recues: 41, repondues: 33, parties_seules: 14, hors_base: 6, delai_median_minutes: 47 },
    demandes: [d1, d2, d3, d4, d5],
    receptions,
    reponses,
    fiches,
    sujets: SUJETS_EXEMPLE,
    accords: {
      peut_donner: true,
      seul_decideur: false,
      sujets: [
        { sujet: "accuse", libelle: "Accusés de réception", genre: "message" as const, autorisable: true, actif: true, statut: "active" as const,
          fin: dans(300), active_le: ilYa(65), donne_par_libelle: "Claire Morel", envoyees_seules_mois: 27 },
        { sujet: "demande_avis", libelle: "Demandes d'avis", genre: "message" as const, autorisable: true, actif: true, statut: "aucun" as const,
          fin: null, active_le: null, donne_par_libelle: null, envoyees_seules_mois: 0 },
        ...SUJETS_EXEMPLE.map((s) => ({
        sujet: s.code, libelle: s.libelle, autorisable: s.autorisable, actif: true,
        statut: (s.code === "tarifs" ? "active" : "aucun") as AccordSujet["statut"],
        fin: s.code === "tarifs" ? dans(300) : null,
        active_le: s.code === "tarifs" ? ilYa(65) : null,
        donne_par_libelle: s.code === "tarifs" ? "Claire Morel" : null,
        envoyees_seules_mois: s.code === "tarifs" ? 14 : 0,
      }))],
    },
  };
}
