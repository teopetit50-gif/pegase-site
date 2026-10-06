/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — le jeu d'EXEMPLE de l'écran (06/10/2026, session C4)

   Six comptes fictifs d'une entreprise fictive, chacun dans un état que le
   système sait reconnaître : celui qui décroche avant la clôture, celui
   qui s'est tu, celui qui a manqué sa saison, celui qui ralentit, le
   régulier, et celui que rien ne date. Les dates sont RELATIVES au jour de
   la visite ; les phrases sont celles que le calcul (c4_02) écrit. Rien
   ici n'est écrit en base. Aucun client réel.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID } from "../exemples/socle";
import type { Achat, AValider, Compte, Fiche, Mois, Niveau, Raison, Reprise, Signal, Tableau, Tache } from "./types";

const ENTITE = "00000000-0000-4000-8000-0000000000e1";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function ilYa(jours: number) {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return iso(d);
}
function dans(jours: number) {
  return ilYa(-jours);
}
function fr(isoDate: string) {
  const [a, m, j] = isoDate.split("-");
  return `${j}/${m}/${a}`;
}
function finDeMois() {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

type Modele = {
  n: number;
  ref: string;
  nom: string;
  contact: string | null;
  email: string | null;
  telephone: string | null;
  commercial: string | null;
  ville: string;
  /* âges des achats en jours, du plus récent au plus ancien, et montant de chacun */
  ages: number[];
  montants: (i: number) => number;
  niveau: Niveau;
  raisons: (dernier: string) => Raison[];
  rythme: number | null;
};

const MODELES: Modele[] = [
  {
    n: 1, ref: "C001", nom: "Garage Martin", contact: "Martin", email: "atelier@garage-martin.exemple", telephone: "02 99 00 00 01", commercial: "Sofia", ville: "Rennes",
    ages: Array.from({ length: 22 }, (_, k) => 64 + 31 * k), montants: (i) => 610 + (i % 3) * 40, niveau: "decroche", rythme: 31,
    raisons: (d) => [
      { code: "retard", points: 32, phrase: `Il achetait en moyenne tous les 31 jours ; rien depuis 64 jours, depuis le ${fr(d)} (2,1 fois son rythme).` },
      { code: "avant_cloture", points: 0, phrase: `La clôture du mois tombe le ${fr(finDeMois())} : il reste ${Math.max(0, Math.round((new Date(finDeMois()).getTime() - Date.now()) / 86400000))} jours pour qu'une commande compte dans le mois.` },
    ],
  },
  {
    n: 2, ref: "C002", nom: "Froid Services Ouest", contact: "Mme Le Goff", email: "contact@froid-ouest.exemple", telephone: "02 99 00 00 02", commercial: "Yanis", ville: "Vannes",
    ages: Array.from({ length: 16 }, (_, k) => 210 + 21 * k), montants: () => 380, niveau: "eteint", rythme: 21,
    raisons: (d) => [
      { code: "silence", points: 60, phrase: `Le client s'est tu : il achetait en moyenne tous les 21 jours et n'a rien acheté depuis 210 jours, depuis le ${fr(d)} (10,0 fois son rythme).` },
    ],
  },
  {
    n: 3, ref: "C003", nom: "Menuiserie Dubreuil", contact: "M. Dubreuil", email: "bureau@dubreuil.exemple", telephone: null, commercial: "Sofia", ville: "Laval",
    ages: [395, 760, 1125], montants: () => 2400, niveau: "saison", rythme: 365,
    raisons: () => {
      const m = new Date();
      m.setMonth(m.getMonth() - 1);
      const mois = MOIS[m.getMonth()];
      const a = m.getFullYear();
      return [{ code: "saison", points: 15, phrase: `Il achète chaque année en ${mois} (${a - 3}, ${a - 2}, ${a - 1}) ; rien en ${mois} ${a} à ce jour.` }];
    },
  },
  {
    n: 4, ref: "C004", nom: "Transports Rival", contact: null, email: "achats@rival.exemple", telephone: "02 99 00 00 04", commercial: "Yanis", ville: "Nantes",
    ages: Array.from({ length: 24 }, (_, k) => 6 + 30 * k), montants: (i) => (i < 12 ? 300 : 1000), niveau: "ralentit", rythme: 30,
    raisons: () => [
      { code: "baisse", points: 18, phrase: "Chiffre des douze derniers mois : 3 600 €, contre 12 000 € les douze mois d'avant (-70 %)." },
      { code: "panier", points: 10, phrase: "Son panier fond : 300 € en moyenne sur les trois derniers achats, contre 700 € avant." },
    ],
  },
  {
    n: 5, ref: "C005", nom: "Boulangerie Lemaire", contact: "M. Lemaire", email: "contact@lemaire.exemple", telephone: "02 99 00 00 05", commercial: "Sofia", ville: "Rennes",
    ages: Array.from({ length: 24 }, (_, k) => 9 + 30 * k), montants: () => 480, niveau: "ok", rythme: 30, raisons: () => [],
  },
  {
    n: 6, ref: "S-7F21A0C4", nom: "Atelier Nomade", contact: null, email: null, telephone: "06 00 00 00 06", commercial: null, ville: "Brest",
    ages: [], montants: () => 0, niveau: "sans_achat", rythme: null,
    raisons: () => [{ code: "sans_achat", points: 0, phrase: "Aucun achat connu : rien ne permet de dater ce compte, il est présenté à part." }],
  },
];

function id(prefixe: string, n: number) {
  return `00000000-0000-4000-8${prefixe}-${String(n).padStart(12, "0")}`;
}

function achatsDe(m: Modele): Achat[] {
  return m.ages.map((age, i) => ({
    id: id("c41", m.n * 100 + i),
    compte_id: id("c40", m.n),
    date_achat: ilYa(age),
    montant_ht: m.montants(i),
    reference: `F${5000 - m.n * 100 - i}`,
    libelle: m.n === 1 ? "Entretien et pièces" : null,
    nature: "facture",
    source: "import",
    annule_le: null,
    annule_motif: null,
  }));
}

function signalDe(m: Modele, achats: Achat[]): Signal {
  const dernier = achats[0]?.date_achat ?? null;
  const raisons = dernier ? m.raisons(dernier) : m.raisons("");
  const score = Math.min(100, raisons.reduce((s, r) => s + r.points, 0));
  const panier = achats.length ? achats.reduce((s, a) => s + a.montant_ht, 0) / achats.length : null;
  const valeur = panier && m.rythme ? (panier * 365) / m.rythme : null;
  const an = (min: number, max: number) => achats.filter((a) => {
    const age = (Date.now() - new Date(a.date_achat).getTime()) / 86400000;
    return age >= min && age < max;
  }).reduce((s, a) => s + a.montant_ht, 0);
  return {
    compte_id: id("c40", m.n),
    jour: ilYa(0),
    niveau: m.niveau,
    depuis_le: ilYa(m.n === 1 ? 0 : 12),
    score,
    priorite: valeur ? Math.round((valeur * score) / 100) : 0,
    valeur_annuelle: valeur ? Math.round(valeur) : null,
    nb_achats: achats.length,
    premier_achat: achats[achats.length - 1]?.date_achat ?? null,
    dernier_achat: dernier,
    rythme_jours: m.rythme,
    panier_moyen: panier ? Math.round(panier) : null,
    attendu_le: dernier && m.rythme && m.rythme < 200 ? ilYa(m.ages[0] - m.rythme) : null,
    jours_silence: dernier ? m.ages[0] : null,
    retard: dernier && m.rythme ? Math.round((m.ages[0] / m.rythme) * 10) / 10 : null,
    ca_12m: an(0, 365),
    ca_12m_precedent: an(365, 730),
    cloture_le: finDeMois(),
    avant_cloture: raisons.some((r) => r.code === "avant_cloture"),
    raisons,
  };
}

function moisDe(achats: Achat[]): Mois[] {
  const res: Mois[] = [];
  const d = new Date();
  for (let k = 23; k >= 0; k--) {
    const m = new Date(d.getFullYear(), d.getMonth() - k, 1);
    const cle = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const du = achats.filter((a) => a.date_achat.startsWith(cle));
    res.push({ mois: cle, montant: du.reduce((s, a) => s + a.montant_ht, 0), pieces: du.length });
  }
  return res;
}

const REPRISE_MARTIN: Reprise = {
  id: id("c42", 1), compte_id: id("c40", 1), statut: "a_valider", issue: null, motif: null, ouverte_par: "detection",
  envoye1_le: null, envoye2_le: null, repondu_le: null, close_le: null, cree_le: new Date().toISOString(),
  envoi1: { statut: "a_valider", mode: "essai", verrou: null, sujet: "Atelier Bertin — votre commande" }, envoi2: null,
};
const REPRISE_FROID: Reprise = {
  id: id("c42", 2), compte_id: id("c40", 2), statut: "envoyee", issue: null, motif: null, ouverte_par: "detection",
  envoye1_le: new Date(Date.now() - 4 * 86400000).toISOString(), envoye2_le: null, repondu_le: null, close_le: null,
  cree_le: new Date(Date.now() - 5 * 86400000).toISOString(),
  envoi1: { statut: "envoye", mode: "essai", verrou: null, sujet: "Atelier Bertin — votre commande" }, envoi2: null,
};
const REPRISE_DUBREUIL: Reprise = {
  id: id("c42", 3), compte_id: id("c40", 3), statut: "repondue", issue: "reponse", motif: "Le client a répondu : la conversation revient à votre équipe.",
  ouverte_par: "detection", envoye1_le: new Date(Date.now() - 6 * 86400000).toISOString(), envoye2_le: null,
  repondu_le: new Date(Date.now() - 1 * 86400000).toISOString(), close_le: new Date(Date.now() - 1 * 86400000).toISOString(),
  cree_le: new Date(Date.now() - 7 * 86400000).toISOString(),
  envoi1: { statut: "envoye", mode: "essai", verrou: null, sujet: "Atelier Bertin — votre commande" }, envoi2: null,
};
const REPRISES: Record<string, Reprise[]> = {
  [id("c40", 1)]: [REPRISE_MARTIN],
  [id("c40", 2)]: [REPRISE_FROID],
  [id("c40", 3)]: [REPRISE_DUBREUIL],
};

function tachesExemple(): Tache[] {
  return [
    {
      id: id("c43", 1), compte_id: id("c40", 1), compte_nom: "Garage Martin", reprise_id: REPRISE_MARTIN.id, type: "appel", titre: "Appeler Garage Martin",
      detail: `• Il achetait en moyenne tous les 31 jours ; rien depuis 64 jours.\nDernière commande : ${fr(ilYa(64))}, 650 € HT, réf. F4900.\nTéléphone : 02 99 00 00 01\nContact : Martin`,
      commercial: "Sofia", echeance: dans(2), statut: "a_faire", compte_rendu: null, faite_le: null,
    },
    {
      id: id("c43", 2), compte_id: id("c40", 3), compte_nom: "Menuiserie Dubreuil", reprise_id: REPRISE_DUBREUIL.id, type: "repondre", titre: "Répondre à Menuiserie Dubreuil",
      detail: `M. Dubreuil a répondu le ${fr(ilYa(1))} : « Re : votre commande ».`, commercial: "Sofia", echeance: dans(0), statut: "a_faire", compte_rendu: null, faite_le: null,
    },
    {
      id: id("c43", 3), compte_id: id("c40", 2), compte_nom: "Froid Services Ouest", reprise_id: REPRISE_FROID.id, type: "appel", titre: "Appeler Froid Services Ouest",
      detail: "• Le client s'est tu : il achetait en moyenne tous les 21 jours et n'a rien acheté depuis 210 jours.\nTéléphone : 02 99 00 00 02",
      commercial: "Yanis", echeance: dans(1), statut: "a_faire", compte_rendu: null, faite_le: null,
    },
  ];
}

const MESSAGE_MARTIN = (dernier: string) =>
  `Bonjour Martin,\n\nJe reprends votre dossier : votre dernière commande chez Atelier Bertin date du ${fr(dernier)} (réf. F4900, « Entretien et pièces », 650 € HT), il y a 2 mois.\n\nAvez-vous de nouveaux besoins pour lesquels nous pourrions vous être utiles ? Un simple retour à ce message suffit : nous vous rappelons au moment qui vous convient.\n\nBien cordialement,\nL'équipe Atelier Bertin\n\nSi vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.`;

export function exempleOffload(): { tableau: Tableau; fiches: Record<string, Fiche> } {
  const fiches: Record<string, Fiche> = {};
  const comptes: Compte[] = MODELES.map((m) => {
    const achats = achatsDe(m);
    const signal = signalDe(m, achats);
    const compte: Compte = {
      id: id("c40", m.n), entite_id: ENTITE, ref: m.ref, nom: m.nom, contact: m.contact, email: m.email, telephone: m.telephone,
      commercial: m.commercial, groupe: null, ville: m.ville, secteur: null, source: m.ages.length ? "import" : "saisie", statut: "suivi",
      statut_motif: null, signal, reprise: REPRISES[id("c40", m.n)]?.[0] ?? null,
    };
    fiches[compte.id] = {
      compte, signal, mois: moisDe(achats), achats, nb_achats: achats.length, reprises: REPRISES[compte.id] ?? [],
      taches: tachesExemple().filter((t) => t.compte_id === compte.id),
    };
    return compte;
  });
  const rang = (c: Compte) => (c.signal && ["eteint", "decroche", "saison", "ralentit"].includes(c.signal.niveau) ? 0 : 2);
  comptes.sort((a, b) => rang(a) - rang(b) || (b.signal?.priorite ?? 0) - (a.signal?.priorite ?? 0) || a.nom.localeCompare(b.nom, "fr"));
  const compter = (n: Niveau) => comptes.filter((c) => c.signal?.niveau === n).length;
  const aValider: AValider[] = [
    {
      reprise: REPRISE_MARTIN.id, compte_id: id("c40", 1), compte_nom: "Garage Martin", statut: "a_valider", rang: 1,
      envoi: id("c44", 1), demande: id("c45", 1), mode: "essai", destinataire: "atelier@garage-martin.exemple",
      sujet: `Atelier Bertin — votre commande du ${fr(ilYa(64))}`, corps: MESSAGE_MARTIN(ilYa(64)), cree_le: new Date().toISOString(),
    },
  ];
  const taches = tachesExemple();
  return {
    fiches,
    tableau: {
      client: EXEMPLE_CLIENT_ID,
      reglages: {
        client_id: EXEMPLE_CLIENT_ID, mode: "essai", delai_silence_jours: 90, montant_min: 200, jour_cloture: null, alerte_avant_cloture_jours: 10,
        signature: "L'équipe Atelier Bertin", delai_relance_jours: 7, quarantaine_jours: 90, plafond_reprises_jour: 20,
      },
      compteurs: {
        eteint: compter("eteint"), decroche: compter("decroche"), saison: compter("saison"), ralentit: compter("ralentit"), ok: compter("ok"),
        sans_achat: compter("sans_achat"), avant_cloture: comptes.filter((c) => c.signal?.avant_cloture).length, comptes: comptes.length,
        a_valider: aValider.length, appels: taches.filter((t) => t.type === "appel").length, reponses: taches.filter((t) => t.type === "repondre").length,
      },
      comptes,
      a_valider: aValider,
      taches,
    },
  };
}
