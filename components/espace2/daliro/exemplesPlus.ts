/* ══════════════════════════════════════════════════════════════════════
   DALIRO, espace 2 : quatre chantiers d'exemple de plus (30/10/2026)

   Teo : « mets plus d'exemples de chantiers pour voir ». Le monde d'exemple
   de l'écran d'avant (components/espace/daliro/exemples.ts : Atelier
   Bertin, Les Tilleuls et Maison Rolland) reste tel quel ; ces chantiers
   s'y ajoutent dans l'espace 2 seulement (./donnees), pour que le planning
   ait de quoi se remplir : plusieurs équipes et sous-traitants, des
   passages faits la semaine passée, d'autres à venir, des réponses de
   toutes sortes, et un électricien en double le même jour.

   Identifiants en 0000… (d7xx), dates relatives au jour de la visite :
   rien ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { EXEMPLE_CLIENT_ID, aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import { TABLEAUX_EXEMPLE, TILLEULS } from "@/components/espace/daliro/exemples";
import type { Chantier, Confirmation, Lot, Passage, Tableau, Tiers } from "@/components/espace/daliro/types";

const id = (n: number) => `00000000-0000-4000-8000-00000000d${String(700 + n).padStart(3, "0")}`;

/* les intervenants ajoutés */
const MOREL = id(1);
const FERRAND = id(2);
const BENALI = id(3);
const RIVIERE = id(4);
const MO_CLAIR = id(5);
const MO_MAMIE = id(6);
const MO_DURET = id(7);
const MO_VENISSIEUX = id(8);
const ROCHAT = "00000000-0000-4000-8000-00000000d023";
const EQUIPE_A = "00000000-0000-4000-8000-00000000d031";
const EQUIPE_B = id(10);
const ATELIER = id(11);

const st = (tid: string, nom: string, commune: string, corps: string, canal: "whatsapp" | "sms" | "email"): Tiers => ({
  id: tid, roles: ["sous_traitant"], nom, siren: null, telephone: "+33600000000", email: null, canal, commune, corps_etat: [corps], departements: ["69"],
  confirmer_passages: true, vigilance_attestation_le: aujourdHui(-40), vigilance_verifiee_le: ilYa(39), actif: true, vigilance: "a_jour",
});
const mo = (tid: string, nom: string, commune: string): Tiers => ({
  id: tid, roles: ["maitre_ouvrage"], nom, siren: null, telephone: null, email: null, canal: "email", commune, corps_etat: [], departements: [],
  confirmer_passages: true, vigilance_attestation_le: null, vigilance_verifiee_le: null, actif: true, vigilance: "sans_objet",
});

const TIERS_PLUS: Tiers[] = [
  st(MOREL, "Plâtrerie Morel", "Vaulx-en-Velin", "plâtrerie", "whatsapp"),
  st(FERRAND, "Électricité Ferrand", "Villeurbanne", "électricité", "sms"),
  st(BENALI, "Plomberie Benali", "Lyon 8e", "plomberie", "whatsapp"),
  st(RIVIERE, "Charpentes Rivière", "Tassin", "charpente", "email"),
  mo(MO_CLAIR, "SCM Saint-Clair", "Caluire-et-Cuire"),
  mo(MO_MAMIE, "Boulangerie Ma Mie SARL", "Lyon 7e"),
  mo(MO_DURET, "M. et Mme Duret", "Écully"),
  mo(MO_VENISSIEUX, "Ville de Vénissieux", "Vénissieux"),
];
const TIERS = [...TABLEAUX_EXEMPLE[TILLEULS].tiers, ...TIERS_PLUS];
const EQUIPES = [
  { id: EQUIPE_A, nom: "Pose A" },
  { id: EQUIPE_B, nom: "Pose B" },
  { id: ATELIER, nom: "Atelier" },
];
const NOMS: Record<string, string> = Object.fromEntries([...TIERS.map((t) => [t.id, t.nom]), ...EQUIPES.map((e) => [e.id, e.nom])]);

type LotDef = { n: number; code: string; libelle: string; corps: string; par: string; equipe?: boolean; statut?: Lot["statut"] };
type PassDef = { n: number; lot: number; tache: string; du: number; au: number; conf: Confirmation; fait?: boolean; h?: [string, string] };

function chantier(o: {
  n: number; nom: string; ref: string; adresse: string; cp: string; commune: string; mo: string; moType: Chantier["maitre_ouvrage_type"];
  statut: Chantier["statut"]; du: number; au: number; lots: LotDef[]; passages: PassDef[];
}): Tableau {
  const cid = id(o.n);
  const lots: Lot[] = o.lots.map((l, i) => ({
    id: id(l.n), chantier_id: cid, code: l.code, libelle: l.libelle, corps_etat: l.corps, corps_etat_libelle: null, rang: i + 1,
    execution: l.equipe ? "client" : "sous_traitant", tiers_id: l.equipe ? null : l.par, tiers_nom: l.equipe ? null : NOMS[l.par],
    equipe_id: l.equipe ? l.par : null, equipe_nom: l.equipe ? NOMS[l.par] : null, exterieur: !l.equipe, statut: l.statut ?? "a_venir", acceptation: l.equipe ? null : "acceptee",
  }));
  const passages: Passage[] = o.passages.map((p) => {
    const lot = o.lots.find((l) => l.n === p.lot)!;
    const quand = ilYa(Math.max(0, -p.du + 2), 17);
    return {
      id: id(p.n), chantier_id: cid, lot_id: id(lot.n), lot_code: lot.code, lot_libelle: lot.libelle,
      equipe_id: lot.equipe ? lot.par : null, tiers_id: lot.equipe ? null : lot.par, intervenant_type: lot.equipe ? "equipe" : "tiers",
      intervenant_lu: NOMS[lot.par], intervenant_nom: NOMS[lot.par], rapprochement: "identique", tache: p.tache,
      debut: aujourdHui(p.du), fin: aujourdHui(p.au), heure_debut: p.h ? `${p.h[0]}:00` : null, heure_fin: p.h ? `${p.h[1]}:00` : null, exterieur: !lot.equipe, statut: p.fait ? "fait" : "prevu",
      confirmation: p.conf, confirmation_le: p.conf === "non_demandee" ? null : quand, source: "saisie", source_ref: null, version: 1, confirmations: [],
    };
  });
  const enCours = lots.find((l) => l.statut === "en_cours") ?? null;
  const ch: Chantier = {
    id: cid, client_id: EXEMPLE_CLIENT_ID, entite_id: id(o.n + 50), nom: o.nom, reference: o.ref, adresse: o.adresse, code_postal: o.cp, commune: o.commune,
    departement: o.cp.slice(0, 2), territoire: "metropole", zone_tva: "metropole", regime_tva: "normal", maitre_ouvrage_type: o.moType,
    nature_marche: o.moType === "acheteur_public" ? "public" : "prive", place_client: "titulaire", maitre_ouvrage_id: o.mo, maitre_oeuvre_id: null,
    donneur_ordre_id: null, conducteur_id: null, statut: o.statut, date_debut: aujourdHui(o.du), date_fin_prevue: aujourdHui(o.au), date_reception: null,
    ouvert_le: o.statut === "ouvert" ? ilYa(Math.max(1, -o.du)) : null, cree_le: ilYa(Math.max(3, -o.du + 10)),
    etape: { etape: enCours ? lots.indexOf(enCours) + 1 : 0, etapes: lots.length, lot_id: enCours?.id ?? null, lot_libelle: enCours?.libelle ?? null, avancement_pct: enCours ? 40 : 0 },
    maitre_ouvrage_nom: NOMS[o.mo],
  };
  return {
    chantier: ch,
    reglages: { formule: "entreprise", quota_chantiers: 20, quota_comptes_bureau: 5 },
    voit_prix: true,
    lots,
    marches: [],
    controles: [],
    controles_organisation: TABLEAUX_EXEMPLE[TILLEULS].controles_organisation,
    passages,
    dependances: [],
    acceptations: [],
    avenants: [],
    factures: [],
    debourse: [],
    tiers: TIERS,
    equipes: EQUIPES,
    bibliotheque: TABLEAUX_EXEMPLE[TILLEULS].bibliotheque,
    situations: [],
  };
}

const LISTE: Tableau[] = [
  chantier({
    n: 20, nom: "Cabinet médical Saint-Clair", ref: "SCL-2026", adresse: "3 quai Clémenceau", cp: "69300", commune: "Caluire-et-Cuire", mo: MO_CLAIR, moType: "professionnel",
    statut: "ouvert", du: -10, au: 40,
    lots: [
      { n: 21, code: "01", libelle: "Cloisons et doublages", corps: "plâtrerie", par: MOREL, statut: "en_cours" },
      { n: 22, code: "02", libelle: "Électricité", corps: "électricité", par: FERRAND },
      { n: 23, code: "03", libelle: "Menuiseries intérieures", corps: "menuiserie", par: EQUIPE_B, equipe: true },
    ],
    passages: [
      { n: 24, lot: 21, tache: "Ossatures et premières plaques", du: -6, au: -2, conf: "confirmee", fait: true },
      { n: 25, lot: 21, tache: "Bandes et enduits", du: 0, au: 3, conf: "confirmee" },
      { n: 26, lot: 22, tache: "Passage des gaines", du: 4, au: 5, conf: "demandee", h: ["08:00", "16:00"] },
      { n: 27, lot: 23, tache: "Pose des blocs-portes", du: 7, au: 10, conf: "non_demandee" },
      { n: 28, lot: 22, tache: "Appareillage et tableau", du: 14, au: 15, conf: "non_demandee" },
    ],
  }),
  chantier({
    n: 30, nom: "Boulangerie Ma Mie — agencement", ref: "MAM-2026", adresse: "112 avenue Jean-Jaurès", cp: "69007", commune: "Lyon 7e", mo: MO_MAMIE, moType: "professionnel",
    statut: "ouvert", du: -4, au: 24,
    lots: [
      { n: 31, code: "01", libelle: "Agencement du magasin", corps: "agencement", par: ATELIER, equipe: true, statut: "en_cours" },
      { n: 32, code: "02", libelle: "Plomberie du laboratoire", corps: "plomberie", par: BENALI },
      { n: 33, code: "03", libelle: "Éclairage des vitrines", corps: "électricité", par: FERRAND },
    ],
    passages: [
      { n: 34, lot: 31, tache: "Fabrication des comptoirs", du: -4, au: 1, conf: "confirmee" },
      { n: 35, lot: 32, tache: "Arrivées d'eau du labo", du: 1, au: 2, conf: "sans_reponse", h: ["07:30", "12:00"] },
      { n: 36, lot: 31, tache: "Pose des comptoirs", du: 4, au: 6, conf: "non_demandee" },
      { n: 37, lot: 33, tache: "Rubans LED des vitrines", du: 5, au: 5, conf: "confirmee", h: ["14:00", "17:30"] },
      { n: 38, lot: 32, tache: "Raccordement du four", du: 11, au: 11, conf: "non_demandee" },
    ],
  }),
  chantier({
    n: 40, nom: "Villa Duret — terrasse", ref: "DUR-2026", adresse: "21 allée des Cèdres", cp: "69130", commune: "Écully", mo: MO_DURET, moType: "particulier",
    statut: "ouvert", du: -2, au: 20,
    lots: [
      { n: 41, code: "01", libelle: "Terrasse bois", corps: "menuiserie", par: EQUIPE_A, equipe: true, statut: "en_cours" },
      { n: 42, code: "02", libelle: "Garde-corps de la terrasse", corps: "serrurerie", par: ROCHAT },
    ],
    passages: [
      { n: 43, lot: 41, tache: "Lambourdes et plots", du: -2, au: 1, conf: "confirmee" },
      { n: 44, lot: 41, tache: "Lames de terrasse", du: 12, au: 14, conf: "non_demandee" },
      { n: 45, lot: 42, tache: "Pose des garde-corps", du: 15, au: 16, conf: "declinee" },
    ],
  }),
  chantier({
    n: 50, nom: "École Jean-Moulin — préaux", ref: "VEN-2026-03", adresse: "5 rue Jean-Moulin", cp: "69200", commune: "Vénissieux", mo: MO_VENISSIEUX, moType: "acheteur_public",
    statut: "preparation", du: 8, au: 45,
    lots: [
      { n: 51, code: "01", libelle: "Charpente des préaux", corps: "charpente", par: RIVIERE },
      { n: 52, code: "02", libelle: "Éclairage des préaux", corps: "électricité", par: FERRAND },
    ],
    passages: [
      { n: 53, lot: 51, tache: "Levage de la charpente", du: 8, au: 12, conf: "demandee" },
      /* le même jour que « Appareillage et tableau » à Saint-Clair : Ferrand est en double */
      { n: 54, lot: 52, tache: "Projecteurs des préaux", du: 14, au: 14, conf: "non_demandee" },
    ],
  }),
];

export const TABLEAUX_PLUS: Record<string, Tableau> = Object.fromEntries(LISTE.map((t) => [t.chantier.id, t]));
