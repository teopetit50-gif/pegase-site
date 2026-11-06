/* ══════════════════════════════════════════════════════════════════════
   DALIRO, espace 2 : les sept chantiers d'exemple étoffés (05/11/2026)

   Teo, en ouvrant « Maison Rolland — extension » la veille de l'audit de
   Corail BTP : « la description n'est pas assez détaillée, dans les lots il
   n'y a pas assez de trucs : il faut un truc bien pro, bien détaillé ».
   Corail BTP est en Guadeloupe : les chantiers y passent (adresses, communes,
   TVA à 8,5 %, intervenants en 0690), chacun reçoit une description en
   paragraphes, sept à neuf lots, leurs passages (faits ou à venir, avec les
   réponses des intervenants), leur déboursé et quelques points à régler.

   Les lots, passages et intervenants d'avant sont GARDÉS (mêmes identifiants) :
   les avenants, l'approvisionnement, À faire et Équipes s'y réfèrent. On
   ajoute, on ne remplace pas. Identifiants en 0000…e… : rien ici n'est jamais
   écrit en base. Dates relatives au jour de la visite.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import type { Confirmation, Controle, DebourseLot, EvenementConfirmation, Lot, Passage, Tableau, Tiers } from "@/components/espace/daliro/types";

const d = (n: string) => `00000000-0000-4000-8000-00000000d${n}`;
const e = (n: number) => `00000000-0000-4000-8000-0000000e${String(n).padStart(4, "0")}`;

/* les chantiers d'avant */
const TIL = d("001");
const ROL = d("002");
const SCL = d("720");
const MAM = d("730");
const DUR = d("740");
const VEN = d("750");
const GAR = d("760");

/* les équipes d'avant */
const POSE_A = d("031");
const POSE_B = d("710");
const ATELIER = d("711");

/* les intervenants d'avant, installés en Guadeloupe */
const DUMONT = d("022");
const ROCHAT = d("023");
const MOREL = d("701");
const FERRAND = d("702");
const BENALI = d("703");
const RIVIERE = d("704");
const MO_VEN = d("708");

const COMMUNES: Record<string, [string, string]> = {
  [d("021")]: ["Pointe-à-Pitre", "+590590821400"],
  [DUMONT]: ["Les Abymes", "+590690412201"],
  [ROCHAT]: ["Baie-Mahault", "+590690412202"],
  [d("024")]: ["Baie-Mahault", "+590590261830"],
  [d("025")]: ["Le Gosier", "+590690552318"],
  [MOREL]: ["Petit-Bourg", "+590690412203"],
  [FERRAND]: ["Le Gosier", "+590690412204"],
  [BENALI]: ["Sainte-Anne", "+590690412205"],
  [RIVIERE]: ["Le Moule", "+590690412206"],
  [d("705")]: ["Baie-Mahault", "+590590380412"],
  [d("706")]: ["Pointe-à-Pitre", "+590590827715"],
  [d("707")]: ["Le Gosier", "+590690731944"],
  [MO_VEN]: ["Les Abymes", "+590590480000"],
  [d("712")]: ["Sainte-Anne", "+590690640277"],
};
const NOMS_MO: Record<string, string> = { [MO_VEN]: "Ville des Abymes" };

/* les intervenants ajoutés */
const KARUKERA = e(1);
const CARAIBES = e(2);
const ETANCHE = e(3);
const ALU = e(4);
const BONNE_TERRE = e(5);
const TROPICALES = e(6);
const VRD = e(7);
const ALIZES = e(8);

const st = (id: string, nom: string, commune: string, corps: string, canal: "whatsapp" | "sms" | "email", tel: string, vigilance: Tiers["vigilance"] = "a_jour"): Tiers => ({
  id, roles: ["sous_traitant"], nom, siren: null, telephone: tel, email: null, canal, commune, corps_etat: [corps], departements: ["971"],
  confirmer_passages: true, vigilance_attestation_le: aujourdHui(vigilance === "a_renouveler" ? -170 : -35), vigilance_verifiee_le: ilYa(vigilance === "a_renouveler" ? 160 : 34), actif: true, vigilance,
});

const NOUVEAUX: Tiers[] = [
  st(KARUKERA, "Maçonnerie Karukera", "Baie-Mahault", "maçonnerie", "whatsapp", "+590690412210"),
  st(CARAIBES, "Charpente Couverture Caraïbes", "Le Lamentin", "couverture", "whatsapp", "+590690412211"),
  st(ETANCHE, "Étanchéité Antilles Service", "Baie-Mahault", "étanchéité", "email", "+590690412212", "a_renouveler"),
  st(ALU, "Alu Fenêtres Guadeloupe", "Les Abymes", "menuiserie", "sms", "+590690412213"),
  st(BONNE_TERRE, "Carrelage Bonne-Terre", "Pointe-à-Pitre", "carrelage", "whatsapp", "+590690412214"),
  st(TROPICALES, "Peintures Tropicales", "Le Gosier", "peinture", "sms", "+590690412215"),
  st(VRD, "Terrassement VRD Grande-Terre", "Morne-à-l'Eau", "terrassement", "whatsapp", "+590690412216"),
  st(ALIZES, "Alizés Froid Climatisation", "Baie-Mahault", "climatisation", "whatsapp", "+590690412217"),
];
const MRA = d("024");
const NOMS: Record<string, string> = {
  [MRA]: "Menuiseries Rhône-Alpes",
  [POSE_A]: "Pose A", [POSE_B]: "Pose B", [ATELIER]: "Atelier",
  [DUMONT]: "Serrurerie Dumont", [ROCHAT]: "Métallerie Rochat", [MOREL]: "Plâtrerie Morel", [FERRAND]: "Électricité Ferrand",
  [BENALI]: "Plomberie Benali", [RIVIERE]: "Charpentes Rivière",
  ...Object.fromEntries(NOUVEAUX.map((t) => [t.id, t.nom])),
};
const EQUIPES = new Set([POSE_A, POSE_B, ATELIER]);
/* le conducteur de travaux : ses rendez-vous (réunions de chantier, réception, signatures) sont des passages sans lot */
const CONDUCTEUR = e(9);
const NOM_CONDUCTEUR = "Yanis Dupré, conducteur de travaux";
/* dans combien de jours tombe le prochain jour de la semaine j (0 = dimanche ; aujourd'hui exclu) */
function prochain(j: number): number {
  const auj = new Date().getDay();
  return ((j - auj + 7) % 7) || 7;
}

/* ——— ce qu'on ajoute à un chantier ——— */
type Rep = { quand: number; texte: string; canal?: string };
type PassDef = { tache: string; du: number; au: number; conf: Confirmation; fait?: boolean; rep?: Rep; h?: [string, string] };
type LotDef = {
  code: string; libelle: string; corps: string; par: string; statut: Lot["statut"]; pct?: number;
  engage: number; facture: number; avenants?: number; passages: PassDef[]; point?: { gravite: "attention" | "bloquant"; message: string };
};
type DebDef = { engage: number; facture: number; avenants?: number };
type Rdv = { tache: string; du: number; h: [string, string]; fait?: boolean };
/* un passage de plus sur un lot d'avant (sous-traitant ou fournisseur qui n'en avait aucun de passé) */
type Extra = { lot: string; par: string; tache: string; du: number; au: number; fait?: boolean; texte?: string };
type Etoffe = {
  adresse: string; cp: string; commune: string; description: string;
  /* la durée réelle du chantier (jours depuis aujourd'hui) : la barre de la Timeline couvre ses mois */
  du: number; au: number;
  /* le déboursé des lots d'avant, par identifiant de lot */
  debourseAvant?: Record<string, DebDef>;
  /* l'avancement des lots d'avant, quand aucune situation ne le donne */
  pctAvant?: Record<string, number>;
  lots: LotDef[];
  rdv?: Rdv[];
  extras?: Extra[];
};

let n = 100;
function etoffer(t: Tableau, o: Etoffe): Tableau {
  const cid = t.chantier.id;
  const rangDepart = t.lots.length;
  const lots: Lot[] = [];
  const passages: Passage[] = [];
  const controles: Controle[] = [];
  const debourse: DebourseLot[] = [];

  o.lots.forEach((l, i) => {
    const lid = e(++n);
    const equipe = EQUIPES.has(l.par);
    lots.push({
      id: lid, chantier_id: cid, code: l.code, libelle: l.libelle, corps_etat: l.corps, corps_etat_libelle: null, rang: rangDepart + i + 1,
      execution: equipe ? "client" : "sous_traitant", tiers_id: equipe ? null : l.par, tiers_nom: equipe ? null : NOMS[l.par],
      equipe_id: equipe ? l.par : null, equipe_nom: equipe ? NOMS[l.par] : null, exterieur: !equipe, statut: l.statut,
      acceptation: equipe ? null : "acceptee", avancement_pct: l.pct ?? null,
    });
    const av = l.avenants ?? 0;
    debourse.push({
      lot_id: lid, code: l.code, libelle: l.libelle, execution: equipe ? "client" : "sous_traitant", tiers_id: equipe ? null : l.par, lot_statut: l.statut,
      nb_factures: l.facture ? 1 + Math.floor(l.facture / 9000) : 0, engage_marche_ht: l.engage, engage_avenants_ht: av, facture_ht: l.facture, reste_ht: l.engage + av - l.facture,
    });
    if (l.point) controles.push({ chantier_id: cid, objet_type: "btp_lots", objet_id: lid, code: l.point.gravite === "bloquant" ? "lot_bloque" : "lot_a_voir", gravite: l.point.gravite, message: `Lot ${l.code} ${l.libelle} : ${l.point.message}` });
    for (const p of l.passages) {
      const pid = e(++n);
      const confirmations: EvenementConfirmation[] = [];
      if (p.conf !== "non_demandee") {
        const demande = p.rep ? p.rep.quand + 1 : Math.max(0, -p.du + 2);
        confirmations.push({ id: e(++n), passage_id: pid, evenement: "demandee", canal: equipe ? null : "whatsapp", cle: `demande:${pid}`, detail: {}, survenu_le: ilYa(demande, 17) });
        if (p.conf !== "demandee") {
          confirmations.push({
            id: e(++n), passage_id: pid, evenement: p.conf, canal: p.rep?.canal ?? "whatsapp", cle: `rep:${pid}`,
            detail: p.rep ? { texte: p.rep.texte } : {}, survenu_le: ilYa(p.rep?.quand ?? Math.max(0, -p.du + 1), 9),
          });
        }
      }
      passages.push({
        id: pid, chantier_id: cid, lot_id: lid, lot_code: l.code, lot_libelle: l.libelle,
        equipe_id: equipe ? l.par : null, tiers_id: equipe ? null : l.par, intervenant_type: equipe ? "equipe" : "tiers",
        intervenant_lu: NOMS[l.par], intervenant_nom: NOMS[l.par], rapprochement: "identique", tache: p.tache,
        debut: aujourdHui(p.du), fin: aujourdHui(p.au), heure_debut: p.h ? `${p.h[0]}:00` : null, heure_fin: p.h ? `${p.h[1]}:00` : null,
        exterieur: !equipe, statut: p.fait ? "fait" : "prevu", confirmation: p.conf,
        confirmation_le: p.conf === "non_demandee" ? null : ilYa(p.rep?.quand ?? Math.max(0, -p.du + 1), 9),
        source: "saisie", source_ref: null, version: 1, confirmations,
      });
    }
  });

  for (const x of o.extras ?? []) {
    const lot = t.lots.find((l) => l.id === x.lot);
    if (!lot) continue;
    const pid = e(++n);
    const quand = ilYa(Math.max(0, -x.du + 2), 17);
    passages.push({
      id: pid, chantier_id: cid, lot_id: lot.id, lot_code: lot.code, lot_libelle: lot.libelle,
      equipe_id: null, tiers_id: x.par, intervenant_type: "tiers", intervenant_lu: NOMS[x.par] ?? x.par, intervenant_nom: NOMS[x.par] ?? x.par,
      rapprochement: "identique", tache: x.tache, debut: aujourdHui(x.du), fin: aujourdHui(x.au), exterieur: true, statut: x.fait ? "fait" : "prevu",
      confirmation: "confirmee", confirmation_le: quand, source: "saisie", source_ref: null, version: 1,
      confirmations: x.texte ? [{ id: e(++n), passage_id: pid, evenement: "confirmee", canal: "whatsapp", cle: `rep:${pid}`, detail: { texte: x.texte }, survenu_le: quand }] : [],
    });
  }
  for (const r of o.rdv ?? []) {
    const pid = e(++n);
    passages.push({
      id: pid, chantier_id: cid, lot_id: null, lot_code: null, lot_libelle: null,
      equipe_id: CONDUCTEUR, tiers_id: null, intervenant_type: "equipe", intervenant_lu: NOM_CONDUCTEUR, intervenant_nom: NOM_CONDUCTEUR,
      rapprochement: "identique", tache: `Rendez-vous : ${r.tache}`, debut: aujourdHui(r.du), fin: aujourdHui(r.du),
      heure_debut: `${r.h[0]}:00`, heure_fin: `${r.h[1]}:00`, exterieur: false, statut: r.fait ? "fait" : "prevu",
      confirmation: "confirmee", confirmation_le: ilYa(Math.max(0, -r.du + 3), 9), source: "saisie", source_ref: null, version: 1, confirmations: [],
    });
  }

  /* le déboursé des lots d'avant (les chantiers ajoutés le 30/10 n'en avaient pas) */
  const avant = t.lots.map((l): DebourseLot | null => {
    const deja = t.debourse.find((x) => x.lot_id === l.id);
    const def = o.debourseAvant?.[l.id];
    if (!def) return deja ?? null;
    const av = def.avenants ?? 0;
    return {
      lot_id: l.id, code: l.code, libelle: l.libelle, execution: l.execution, tiers_id: l.tiers_id, lot_statut: l.statut,
      nb_factures: def.facture ? 1 : 0, engage_marche_ht: def.engage, engage_avenants_ht: av, facture_ht: def.facture, reste_ht: def.engage + av - def.facture,
    };
  }).filter((x): x is DebourseLot => !!x);

  const lotsAvant = t.lots.map((l) => (o.pctAvant?.[l.id] !== undefined ? { ...l, avancement_pct: o.pctAvant[l.id] } : l));

  return {
    ...t,
    chantier: {
      ...t.chantier, adresse: o.adresse, code_postal: o.cp, commune: o.commune, departement: "971", territoire: "guadeloupe", zone_tva: "guadeloupe",
      date_debut: aujourdHui(o.du), date_fin_prevue: aujourdHui(o.au),
      description: o.description, maitre_ouvrage_nom: NOMS_MO[t.chantier.maitre_ouvrage_id ?? ""] ?? t.chantier.maitre_ouvrage_nom,
      nb_lots: lotsAvant.length + lots.length,
      etape: t.chantier.etape ? { ...t.chantier.etape, etapes: lotsAvant.length + lots.length } : t.chantier.etape,
    },
    lots: [...lotsAvant, ...lots],
    passages: [...t.passages, ...passages],
    controles: [...t.controles.filter((k) => k.code !== "chantier_sans_coordonnees"), ...controles],
    debourse: [...avant, ...debourse],
    equipes: [...t.equipes.filter((x) => x.id !== CONDUCTEUR), { id: CONDUCTEUR, nom: NOM_CONDUCTEUR }],
  };
}

const ETOFFES: Record<string, Etoffe> = {
  [TIL]: {
    du: -95, au: 150,
    extras: [
      { lot: d("042"), par: DUMONT, tache: "Prise de cotes des garde-corps", du: -9, au: -9, fait: true, texte: "On passe jeudi 8 h pour les cotes" },
      { lot: d("041"), par: MRA, tache: "Livraison des fenêtres du bâtiment B", du: -4, au: -4, fait: true, texte: "Livraison confirmée, camion à 7 h" },
      { lot: d("041"), par: MRA, tache: "Livraison des portes palières", du: 9, au: 9 },
    ],
    rdv: [
      { tache: "réunion de chantier hebdomadaire", du: prochain(2) - 7, h: ["08:00", "09:00"], fait: true },
      { tache: "réunion de chantier hebdomadaire", du: prochain(2), h: ["08:00", "09:00"] },
    ],
    adresse: "14 rue Frébault", cp: "97110", commune: "Pointe-à-Pitre",
    description:
      "Résidence de 12 logements en R+3 pour la SCI Lefèvre Patrimoine, en plein centre de Pointe-à-Pitre. Nous tenons les menuiseries extérieures et la coordination des lots de second œuvre ; le gros œuvre et la charpente sont livrés. Marché à forfait de 90 625 € HT signé il y a un mois, retenue de garantie de 5 %, maître d'œuvre : Cabinet Archipel Architectes.\n\n" +
      "Phase en cours : pose des fenêtres bois-alu (33 %) et étanchéité des balcons avant la saison des pluies. Points de vigilance : rue étroite, livraisons uniquement avant 8 h ; menuiseries anticycloniques classées A*3 E*7B V*A3 exigées au CCTP ; attestation de vigilance d'Étanchéité Antilles Service à renouveler.\n\n" +
      "Contacts : Julie Morel (SCI Lefèvre, 0590 82 14 00), conducteur de travaux Yanis Dupré, chef d'équipe Karim B. (Pose A). Réunion de chantier chaque mardi à 8 h.",
    lots: [
      { code: "04", libelle: "Étanchéité des balcons", corps: "étanchéité", par: ETANCHE, statut: "en_cours", pct: 60, engage: 18400, facture: 9200,
        passages: [
          { tache: "Relevés et primaire d'accrochage", du: -12, au: -9, conf: "confirmee", fait: true, rep: { quand: 14, texte: "Ok on sera là lundi 7 h avec 2 gars" } },
          { tache: "Membrane bicouche, balcons R+2 et R+3", du: 1, au: 4, conf: "confirmee", rep: { quand: 0, texte: "Confirmé pour demain, on attaque par le R+3" } },
        ], point: { gravite: "attention", message: "attestation de vigilance à renouveler avant le prochain paiement" } },
      { code: "05", libelle: "Volets roulants anticycloniques", corps: "menuiserie", par: POSE_B, statut: "a_venir", engage: 26880, facture: 0,
        passages: [{ tache: "Pose des coffres et tabliers alu", du: 15, au: 20, conf: "non_demandee" }] },
      { code: "06", libelle: "Climatisation des logements", corps: "climatisation", par: ALIZES, statut: "a_venir", engage: 31200, facture: 0,
        passages: [
          { tache: "Liaisons frigorifiques et supports", du: 6, au: 8, conf: "confirmee", rep: { quand: 1, texte: "C'est noté pour mardi, on prend la nacelle" } },
          { tache: "Pose des 12 splits et mise en service", du: 24, au: 27, conf: "non_demandee" },
        ] },
      { code: "07", libelle: "Électricité des parties communes", corps: "électricité", par: FERRAND, statut: "en_cours", pct: 25, engage: 14650, facture: 3600,
        passages: [{ tache: "Éclairage des coursives et minuterie", du: -3, au: 2, conf: "confirmee", rep: { quand: 4, texte: "Bien reçu, on sera 2 toute la semaine" } }] },
      { code: "08", libelle: "Carrelage des balcons", corps: "carrelage", par: BONNE_TERRE, statut: "a_venir", engage: 9870, facture: 0,
        passages: [{ tache: "Carrelage grès cérame antidérapant", du: 9, au: 13, conf: "sans_reponse" }],
        point: { gravite: "attention", message: "pas de réponse à la demande de confirmation, deux remplaçants possibles dans l'annuaire" } },
    ],
  },
  [ROL]: {
    du: 21, au: 62,
    rdv: [{ tache: "réunion de lancement avec M. et Mme Rolland", du: 18, h: ["09:00", "10:00"] }],
    adresse: "Section Bellevue, chemin de Montauban", cp: "97190", commune: "Le Gosier",
    description:
      "Extension de 42 m² d'une maison individuelle pour M. et Mme Rolland : une suite parentale avec salle d'eau et une terrasse couverte côté mer. Ossature et bardage bois, couverture tôle anticyclonique, raccordement aux réseaux de la maison existante. Démarrage prévu dans trois semaines, réception visée début janvier.\n\n" +
      "Le marché D-2026-087 (menuiseries et bardage, 23 790 € HT) est signé mais à vérifier ligne à ligne : une ligne au montant faux et l'évacuation des gravats rattachée à aucun lot. Les huit autres lots sont confiés à nos sous-traitants habituels, contrats signés et attestations à jour.\n\n" +
      "Points de vigilance : terrain en pente, accès camion par le chemin de Montauban seulement ; permis de construire affiché depuis le 12/10 ; étude de sol G2 à joindre au dossier des fondations. Contact : Mme Rolland, 0690 55 23 18, préfère les SMS.",
    debourseAvant: { [d("044")]: { engage: 23790, facture: 0 } },
    lots: [
      { code: "02", libelle: "Terrassement et fondations", corps: "terrassement", par: VRD, statut: "a_venir", engage: 11240, facture: 0,
        passages: [{ tache: "Implantation, décapage et fouilles", du: 21, au: 23, conf: "confirmee", rep: { quand: 1, texte: "On confirme le 26, prévoir l'accès dégagé pour la pelle" } }] },
      { code: "03", libelle: "Gros œuvre de l'extension", corps: "maçonnerie", par: KARUKERA, statut: "a_venir", engage: 28500, facture: 0,
        passages: [{ tache: "Semelles, longrines et dalle portée", du: 24, au: 32, conf: "demandee" }],
        point: { gravite: "attention", message: "l'étude de sol G2 n'est pas encore jointe au dossier des fondations" } },
      { code: "04", libelle: "Ossature et charpente bois", corps: "charpente", par: RIVIERE, statut: "a_venir", engage: 19800, facture: 0,
        passages: [{ tache: "Levage de l'ossature et de la charpente", du: 34, au: 38, conf: "non_demandee" }] },
      { code: "05", libelle: "Couverture tôle et zinguerie", corps: "couverture", par: CARAIBES, statut: "a_venir", engage: 12650, facture: 0,
        passages: [{ tache: "Couverture bac acier et gouttières", du: 39, au: 41, conf: "non_demandee" }] },
      { code: "06", libelle: "Électricité et climatisation", corps: "électricité", par: FERRAND, statut: "a_venir", engage: 8900, facture: 0,
        passages: [{ tache: "Réseaux et pose du split de la chambre", du: 44, au: 46, conf: "non_demandee" }] },
      { code: "07", libelle: "Plomberie de la salle d'eau", corps: "plomberie", par: BENALI, statut: "a_venir", engage: 7350, facture: 0,
        passages: [{ tache: "Alimentations, évacuations et chauffe-eau solaire", du: 44, au: 47, conf: "non_demandee" }] },
      { code: "08", libelle: "Carrelage et faïence", corps: "carrelage", par: BONNE_TERRE, statut: "a_venir", engage: 6420, facture: 0,
        passages: [{ tache: "Sol de la suite et faïence de la douche", du: 50, au: 54, conf: "non_demandee" }] },
      { code: "09", libelle: "Peinture intérieure et lasure", corps: "peinture", par: TROPICALES, statut: "a_venir", engage: 4980, facture: 0,
        passages: [{ tache: "Peinture des murs et lasure du bardage", du: 56, au: 59, conf: "non_demandee" }] },
    ],
  },
  [SCL]: {
    du: -45, au: 58,
    rdv: [{ tache: "coordination des lots avec la SCM Saint-Clair", du: prochain(5), h: ["09:00", "10:00"] }],
    adresse: "Immeuble Saint-Clair, ZAC de Houelbourg", cp: "97122", commune: "Baie-Mahault",
    description:
      "Aménagement d'un cabinet médical de 180 m² au premier étage, pour la SCM Saint-Clair (trois médecins généralistes et une kinésithérapeute). Quatre cabinets de consultation, une salle de kiné, l'accueil, la salle d'attente et deux sanitaires dont un PMR.\n\n" +
      "Le cloisonnement est en cours (70 % lus sur les photos de la semaine) ; l'électricité et la climatisation suivent. Ouverture du cabinet annoncée par la SCM pour le 2 janvier : le planning n'a aucune marge en décembre.\n\n" +
      "Points de vigilance : établissement recevant du public de 5e catégorie, accessibilité PMR à respecter de la porte à la salle de kiné ; isolation acoustique renforcée entre cabinets (cloisons 72/48 doublées) ; travaux bruyants interdits le samedi par le règlement de la ZAC. Contact : Dr Infante, 0590 38 04 12.",
    debourseAvant: { [d("721")]: { engage: 21450, facture: 12600, avenants: 2562 }, [d("722")]: { engage: 16800, facture: 0 }, [d("723")]: { engage: 9600, facture: 0 } },
    pctAvant: { [d("721")]: 70 },
    lots: [
      { code: "04", libelle: "Faux plafonds acoustiques", corps: "plâtrerie", par: MOREL, statut: "a_venir", engage: 8640, facture: 0, avenants: 1748,
        passages: [{ tache: "Plafonds en dalles 600 × 600, cabinets et attente", du: 8, au: 11, conf: "non_demandee" }] },
      { code: "05", libelle: "Climatisation et VMC", corps: "climatisation", par: ALIZES, statut: "en_cours", pct: 20, engage: 24300, facture: 4860,
        passages: [
          { tache: "Gaines et réseaux en plénum", du: -5, au: -1, conf: "confirmee", fait: true, rep: { quand: 7, texte: "Confirmé, on démarre jeudi" } },
          { tache: "Pose des cassettes et du groupe en terrasse", du: 12, au: 14, conf: "non_demandee" },
        ] },
      { code: "06", libelle: "Plomberie et sanitaires", corps: "plomberie", par: BENALI, statut: "a_venir", engage: 11200, facture: 0,
        passages: [{ tache: "Lavabos des cabinets et sanitaire PMR", du: 6, au: 9, conf: "confirmee", rep: { quand: 0, texte: "Ok pour le 11, j'aurai les lavabos" } }] },
      { code: "07", libelle: "Sols PVC et carrelage", corps: "carrelage", par: BONNE_TERRE, statut: "a_venir", engage: 13900, facture: 0,
        passages: [{ tache: "Sol PVC U4P3 et carrelage des sanitaires", du: 17, au: 21, conf: "non_demandee" }] },
      { code: "08", libelle: "Peinture et signalétique", corps: "peinture", par: TROPICALES, statut: "a_venir", engage: 7450, facture: 0,
        passages: [{ tache: "Deux couches lessivables et signalétique PMR", du: 22, au: 26, conf: "non_demandee" }] },
      { code: "09", libelle: "Courants faibles et contrôle d'accès", corps: "électricité", par: FERRAND, statut: "a_venir", engage: 6200, facture: 0,
        passages: [{ tache: "Baie informatique, interphone et badges", du: 16, au: 17, conf: "non_demandee" }],
        point: { gravite: "attention", message: "le même jour qu'un autre passage d'Électricité Ferrand à l'école Jean-Moulin" } },
    ],
  },
  [MAM]: {
    du: -35, au: 24,
    rdv: [{ tache: "point sur la réouverture avec M. et Mme Lacroix", du: 1, h: ["17:00", "17:30"] }],
    adresse: "48 rue Saint-John-Perse", cp: "97110", commune: "Pointe-à-Pitre",
    description:
      "Agencement complet de la boulangerie-pâtisserie Ma Mie : magasin de 65 m² et laboratoire de 40 m². Comptoirs et vitrines réfrigérées fabriqués dans notre atelier, laboratoire aux normes HACCP, nouvelle devanture avec rideau métallique anticyclonique.\n\n" +
      "La boutique est fermée pendant les travaux : chaque jour de retard coûte au client. Réouverture promise pour le samedi 29 novembre ; la fabrication des comptoirs est en cours et la pose suit.\n\n" +
      "Points de vigilance : le four de 3 étages (livraison par bateau, arrivée prévue au port de Jarry le 14/11) impose une alimentation électrique triphasée de 36 kVA ; chambre froide à mettre en service 48 h avant la réouverture. Contact : M. et Mme Lacroix, gérants, 0590 82 77 15.",
    debourseAvant: { [d("731")]: { engage: 38600, facture: 15440 }, [d("732")]: { engage: 8900, facture: 0 }, [d("733")]: { engage: 4200, facture: 0, avenants: 1748 } },
    pctAvant: { [d("731")]: 45 },
    lots: [
      { code: "04", libelle: "Chambre froide et climatisation", corps: "climatisation", par: ALIZES, statut: "a_venir", engage: 19750, facture: 0,
        passages: [{ tache: "Montage de la chambre froide positive", du: 7, au: 9, conf: "confirmee", rep: { quand: 1, texte: "Les panneaux sont arrivés, ok pour le 12" } }] },
      { code: "05", libelle: "Carrelage antidérapant du laboratoire", corps: "carrelage", par: BONNE_TERRE, statut: "termine", engage: 7680, facture: 7680,
        passages: [{ tache: "Carrelage R11 et plinthes à gorge", du: -9, au: -6, conf: "confirmee", fait: true, rep: { quand: 11, texte: "On sera là lundi 7 h" } }] },
      { code: "06", libelle: "Électricité force du four", corps: "électricité", par: FERRAND, statut: "a_venir", engage: 5300, facture: 0,
        passages: [{ tache: "Ligne triphasée 36 kVA et tableau du labo", du: 3, au: 3, conf: "declinee", rep: { quand: 0, texte: "Pas possible le 6, on est bloqués sur un autre chantier, le 10 ça irait" } }],
        point: { gravite: "bloquant", message: "Électricité Ferrand a décliné : sans la ligne triphasée, le four ne peut pas être raccordé" } },
      { code: "07", libelle: "Devanture et rideau métallique", corps: "serrurerie", par: ROCHAT, statut: "a_venir", engage: 12400, facture: 0,
        passages: [{ tache: "Pose du rideau anticyclonique motorisé", du: 13, au: 14, conf: "non_demandee" }] },
      { code: "08", libelle: "Peinture et enseigne", corps: "peinture", par: TROPICALES, statut: "a_venir", engage: 4650, facture: 0,
        passages: [{ tache: "Peinture du magasin et pose de l'enseigne", du: 16, au: 18, conf: "non_demandee" }] },
    ],
  },
  [DUR]: {
    du: -40, au: 30,
    extras: [{ lot: d("742"), par: ROCHAT, tache: "Relevé des cotes de la terrasse", du: -11, au: -11, fait: true, texte: "Ok pour lundi matin" }],
    rdv: [{ tache: "signature de l'avenant des marches avec M. Duret", du: 1, h: ["07:30", "08:00"] }],
    adresse: "Lotissement Les Hauts de Saint-Félix, 21 allée des Flamboyants", cp: "97190", commune: "Le Gosier",
    description:
      "Terrasse bois de 64 m² en surplomb de la piscine pour M. et Mme Duret, avec garde-corps verre, pergola bioclimatique, carbet et douche extérieure, et un local technique fermé pour la pompe de piscine.\n\n" +
      "Les plots béton sont coulés ; la structure en lambourdes est en cours. Lames en ipé de 21 mm, vissage invisible inox A4 (bord de mer à 400 m). La météo commande le planning : les passages dehors sont décalés dès que la prévision dépasse 5 mm de pluie.\n\n" +
      "Points de vigilance : Métallerie Rochat a décliné la pose des garde-corps, un remplaçant est à trouver ; un avenant pour les marches d'accès côté jardin attend la signature des clients. Contact : M. Duret, 0690 73 19 44 (WhatsApp).",
    debourseAvant: { [d("741")]: { engage: 22400, facture: 8960, avenants: 555 }, [d("742")]: { engage: 9800, facture: 0, avenants: 3780 }, [d("747")]: { engage: 3600, facture: 0 } },
    pctAvant: { [d("741")]: 35 },
    lots: [
      { code: "04", libelle: "Plots et longrines béton", corps: "maçonnerie", par: KARUKERA, statut: "termine", engage: 6450, facture: 6900,
        passages: [{ tache: "Coulage des 36 plots et longrines", du: -16, au: -12, conf: "confirmee", fait: true, rep: { quand: 18, texte: "C'est bon pour lundi, toupie à 7 h" } }],
        point: { gravite: "attention", message: "dépassé de 450 € HT : deux plots supplémentaires non prévus, à passer en avenant" } },
      { code: "05", libelle: "Étanchéité du local technique", corps: "étanchéité", par: ETANCHE, statut: "a_venir", engage: 2850, facture: 0,
        passages: [{ tache: "Toiture terrasse du local, membrane EPDM", du: 6, au: 6, conf: "demandee" }] },
      { code: "06", libelle: "Éclairage extérieur", corps: "électricité", par: FERRAND, statut: "a_venir", engage: 3900, facture: 0,
        passages: [{ tache: "Spots encastrés et éclairage de la pergola", du: 17, au: 18, conf: "non_demandee" }] },
      { code: "07", libelle: "Pergola bioclimatique", corps: "menuiserie", par: ALU, statut: "a_venir", engage: 14600, facture: 0,
        passages: [
          { tache: "Prise de cotes de la pergola", du: -8, au: -8, conf: "confirmee", fait: true, rep: { quand: 10, texte: "On passe prendre les cotes mardi" } },
          { tache: "Pose de la pergola à lames orientables", du: 19, au: 20, conf: "confirmee", rep: { quand: 2, texte: "Ok, livraison de la pergola le 22 au matin" } },
        ] },
      { code: "08", libelle: "Carbet et douche extérieure", corps: "plomberie", par: BENALI, statut: "a_venir", engage: 5200, facture: 0,
        passages: [{ tache: "Alimentation et évacuation de la douche", du: 10, au: 10, conf: "non_demandee" }] },
    ],
  },
  [VEN]: {
    du: 8, au: 75,
    extras: [{ lot: d("751"), par: RIVIERE, tache: "Visite des préaux existants", du: -7, au: -7, fait: true, texte: "Je passe mercredi avec le plan" }],
    rdv: [{ tache: "signature du plan de prévention à l'école", du: prochain(2), h: ["10:00", "11:00"] }],
    adresse: "Groupe scolaire Jean-Moulin, rue Jean-Moulin", cp: "97139", commune: "Les Abymes",
    description:
      "Remplacement des deux préaux du groupe scolaire Jean-Moulin pour la Ville des Abymes : démolition des anciens préaux amiantés (désamiantage déjà réalisé), charpente métallique et couverture bac acier anticyclonique, éclairage LED, récupération des eaux de pluie.\n\n" +
      "Marché public à procédure adaptée, lot 02 (charpente-couverture) dont nous sommes titulaires et mandataires du groupement. Ordre de service de démarrage reçu ; les travaux se font pendant les vacances de Noël et le mercredi, jamais en présence des élèves.\n\n" +
      "Points de vigilance : plan de prévention avec l'école à signer avant toute intervention ; DICT réponse attendue de Karuker'Eau pour la tranchée d'eaux pluviales ; situations mensuelles à déposer sur Chorus Pro. Contact : M. Céleste, services techniques de la Ville, 0590 48 00 00.",
    debourseAvant: { [d("751")]: { engage: 42300, facture: 0 }, [d("752")]: { engage: 7900, facture: 0, avenants: 3198 } },
    lots: [
      { code: "03", libelle: "Démolition des anciens préaux", corps: "terrassement", par: VRD, statut: "en_cours", pct: 50, engage: 9800, facture: 0,
        passages: [{ tache: "Dépose des couvertures et poteaux", du: 0, au: 3, conf: "confirmee", rep: { quand: 1, texte: "Confirmé, on attaque mercredi pendant que les enfants n'ont pas classe" } }] },
      { code: "04", libelle: "Fondations et massifs", corps: "maçonnerie", par: KARUKERA, statut: "a_venir", engage: 14200, facture: 0,
        passages: [{ tache: "Massifs béton des poteaux", du: 4, au: 7, conf: "demandee" }] },
      { code: "05", libelle: "Couverture bac acier anticyclonique", corps: "couverture", par: CARAIBES, statut: "a_venir", engage: 23600, facture: 0,
        passages: [{ tache: "Bacs acier et faîtages", du: 13, au: 17, conf: "non_demandee" }] },
      { code: "06", libelle: "Gouttières et récupération d'eau", corps: "couverture", par: CARAIBES, statut: "a_venir", engage: 6300, facture: 0,
        passages: [{ tache: "Gouttières et cuve de 5 m³", du: 18, au: 19, conf: "non_demandee" }],
        point: { gravite: "attention", message: "réponse à la DICT attendue avant la tranchée des eaux pluviales" } },
      { code: "07", libelle: "Peinture des structures", corps: "peinture", par: TROPICALES, statut: "a_venir", engage: 5450, facture: 0,
        passages: [{ tache: "Peinture antirouille et finition des poteaux", du: 20, au: 22, conf: "non_demandee" }] },
      { code: "08", libelle: "Sols de cour et VRD", corps: "terrassement", par: VRD, statut: "a_venir", engage: 11800, facture: 0,
        passages: [{ tache: "Enrobé de la cour sous les préaux", du: 24, au: 26, conf: "non_demandee" }] },
    ],
  },
  [GAR]: {
    du: -160, au: -6,
    rdv: [{ tache: "visite de levée des réserves avec Mme Garnier", du: prochain(4), h: ["14:00", "15:00"] }],
    adresse: "Morne Bourg, 6 lotissement Bois-Jolan", cp: "97180", commune: "Sainte-Anne",
    description:
      "Extension de 30 m² (séjour agrandi et chambre d'amis) pour Mme Garnier, livrée il y a six jours. Réception prononcée avec deux réserves, dont une hors devis : l'habillage de la descente d'eaux pluviales, demandé par la cliente à la visite.\n\n" +
      "Tous les lots sont terminés et facturés, sauf la retenue de garantie de 2 140 €, bloquée jusqu'à la levée des réserves. Le décompte général définitif est à préparer sous quarante jours.\n\n" +
      "Prochaines étapes : reprendre le joint de la baie coulissante côté jardin (Pose B, une demi-journée), faire signer l'avenant de l'habillage, puis demander la libération de la retenue. Contact : Mme Garnier, 0690 64 02 77.",
    debourseAvant: { [d("761")]: { engage: 31800, facture: 31800 }, [d("762")]: { engage: 11000, facture: 11000 } },
    lots: [
      { code: "03", libelle: "Charpente et couverture", corps: "couverture", par: CARAIBES, statut: "termine", engage: 12700, facture: 12700,
        passages: [{ tache: "Charpente et tôles", du: -38, au: -33, conf: "confirmee", fait: true, rep: { quand: 40, texte: "Ok pour le lundi" } }] },
      { code: "04", libelle: "Électricité", corps: "électricité", par: FERRAND, statut: "termine", engage: 5900, facture: 5900,
        passages: [{ tache: "Réseaux et appareillage", du: -26, au: -23, conf: "confirmee", fait: true }] },
      { code: "05", libelle: "Plomberie", corps: "plomberie", par: BENALI, statut: "termine", engage: 3400, facture: 3650,
        passages: [{ tache: "Évacuations et point d'eau du séjour", du: -24, au: -23, conf: "confirmee", fait: true }] },
      { code: "06", libelle: "Carrelage", corps: "carrelage", par: BONNE_TERRE, statut: "termine", engage: 6100, facture: 6100,
        passages: [{ tache: "Carrelage 60 × 60 du séjour et de la chambre", du: -20, au: -16, conf: "confirmee", fait: true }] },
      { code: "07", libelle: "Peinture", corps: "peinture", par: TROPICALES, statut: "termine", engage: 3800, facture: 3800,
        passages: [{ tache: "Peinture intérieure et façade", du: -12, au: -9, conf: "confirmee", fait: true }] },
    ],
  },
};

/* Appelé une fois par exempleComplet (./donnees) : les chantiers en Guadeloupe, étoffés, et l'annuaire avec eux. */
export function etofferExemple(base: Record<string, Tableau>): Record<string, Tableau> {
  n = 100;
  const sortie: Record<string, Tableau> = {};
  for (const [id, t] of Object.entries(base)) {
    const o = ETOFFES[id];
    const t2 = o ? etoffer(t, o) : t;
    const connus = new Set(t2.tiers.map((x) => x.id));
    const tiers = [
      ...t2.tiers.map((x) => {
        const c = COMMUNES[x.id];
        return c ? { ...x, commune: c[0], telephone: c[1], nom: NOMS_MO[x.id] ?? x.nom, departements: x.departements.length ? ["971"] : x.departements } : x;
      }),
      ...NOUVEAUX.filter((x) => !connus.has(x.id)),
    ];
    sortie[id] = { ...t2, tiers };
  }
  return sortie;
}
