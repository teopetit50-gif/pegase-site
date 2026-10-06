// Varelo (B1, b1_11) : le bon de livraison d'une réception, pour les réserves au transporteur. Les autres pièces
// d'un groupe (factures, avoirs…) se lisent comme dans FILED : schemas/modules.ts assemble le schéma du module
// à partir de celui de FILED, en remplaçant le seul type « bon_livraison ».
// Fiche : omega/NOTES-B1.md (« Ce qu'il faudra à A1 ») ; porte servie à la lecture : grp_enregistrer_reception.

import type { ChampDeclare, TypeDeclare } from "./modules.ts";

export const MODES_TRANSPORT = ["routier", "cmr", "maritime", "aerien"] as const;

export const CHAMPS_VARELO: ChampDeclare[] = [
  { champ: "transporteur", type: "texte", max: 200, description: "bon de livraison : le transporteur (raison sociale) qui a livré, tel qu'écrit" },
  {
    champ: "document_transport",
    type: "texte",
    max: 80,
    description: "bon de livraison : le numéro du document de transport (lettre de voiture, CMR, connaissement, LTA), tel qu'imprimé",
  },
  { champ: "date_livraison", type: "date", description: "bon de livraison : la date de la livraison (remise des marchandises au destinataire)" },
  { champ: "colis_annonces", type: "entier", min: 0, maximum: 100000, description: "bon de livraison : le nombre de colis annoncés (ou de palettes, si le bon ne compte qu'elles)" },
  { champ: "colis_recus", type: "entier", min: 0, maximum: 100000, description: "bon de livraison : le nombre de colis effectivement reçus, s'il est écrit (souvent à la main)" },
  {
    champ: "reserves_ecrites",
    type: "texte",
    max: 1000,
    description:
      "bon de livraison : les réserves écrites sur le bon par le destinataire, recopiées mot pour mot (souvent manuscrites). « Sous réserve de déballage » ou une formule vague n'est pas une réserve : la recopier quand même, telle qu'écrite.",
  },
  { champ: "expediteur", type: "texte", max: 200, description: "bon de livraison : l'expéditeur (le fournisseur), son nom tel qu'écrit" },
  { champ: "expediteur_siren", type: "texte", max: 9, description: "bon de livraison : le SIREN de l'expéditeur, s'il est imprimé (9 chiffres ; les 9 premiers d'un SIRET)" },
  {
    champ: "mode",
    type: "choix",
    choix: [...MODES_TRANSPORT],
    description:
      "bon de livraison : le mode de transport — routier (lettre de voiture nationale), cmr (lettre de voiture internationale CMR), maritime (connaissement), aerien (LTA)",
  },
];

export const TYPE_BON_LIVRAISON_VARELO: TypeDeclare = {
  type: "bon_livraison",
  libelle: "bon de livraison",
  description:
    "un bon de livraison, une lettre de voiture (CMR) ou un connaissement remis à la livraison : transporteur, document de transport, date, colis annoncés et reçus, réserves écrites, expéditeur, mode",
  champs: CHAMPS_VARELO.map((c) => c.champ),
  cles: ["transporteur", "date_livraison"],
};

/** « Sous réserve de déballage » et ses variantes ne valent pas réserve (B1) : rien de précis n'est dit. */
export function reserveVague(texte: string): boolean {
  const t = texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  return t === "" || /^(sous )?(toutes )?reserves?( de| d)?( (deballage|controle|verification|ouverture|bon fonctionnement|conformite))?( (et|ou) (deballage|controle|verification|ouverture))?$/.test(t);
}
