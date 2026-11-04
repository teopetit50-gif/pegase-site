/* ══════════════════════════════════════════════════════════════════════
   TIROMA — les actes des plans d'exemple, dent par dent (04/11/2026)

   TIROMA n° 14 de docs/verification/PROMESSES-ECRANS.md : « Schéma dentaire
   et actes par dent d'un plan ». En base, tiroma_plan_actes (une ligne par
   acte, dents en numérotation FDI) se lit sous RLS ; ici, les mêmes lignes
   pour les plans et devis d'exemple (components/espace/tiroma/exemple.ts et
   ./exemplesPlus.ts). Les montants et restes à charge de chaque plan font la
   somme du plan ; les actes faits et à faire suivent ses compteurs.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui } from "@/components/espace/exemples/socle";
import type { ActePlan } from "@/components/espace/tiroma/portes";

/* libellé, code, dents, famille, séance, durée, montant, reste à charge, statut, fait il y a (j) */
type Def = [string, string | null, number[], string, number | null, number | null, number, number, ActePlan["statut"], number?];

const DEFS: Record<string, Def[]> = {
  "pl-1": [
    ["Couronne céramique 26 — préparation", "HBLD634", [26], "prothese_preparation", 1, 45, 590, 210, "a_faire"],
    ["Couronne céramique 26 — pose", "HBLD634", [26], "prothese_pose", 2, 30, 590, 210, "a_faire"],
  ],
  "pl-2": [
    ["Traitement de racine 36 — séance 1", "HBFD017", [36], "endodontie", 1, 60, 320, 0, "fait", 35],
    ["Traitement de racine 36 — séance 2", "HBFD017", [36], "endodontie", 2, 60, 320, 0, "a_faire"],
  ],
  "pl-3": [
    ["Bridge 44-46 — préparation", "HBLD033", [44, 45, 46], "prothese_preparation", 1, 60, 1180, 520, "a_faire"],
    ["Bridge 44-46 — empreinte", "HBLD033", [44, 45, 46], "prothese_empreinte", 2, 30, 590, 260, "a_faire"],
    ["Bridge 44-46 — pose", "HBLD033", [44, 45, 46], "prothese_pose", 3, 45, 1180, 520, "a_faire"],
  ],
  "pl-4": [["Scellement de sillons 36 et 46", "HBBD005", [36, 46], "soin_conservateur", 1, 30, 95, 28, "a_faire"]],
  "pl-12": [["Inlay-core 15 et couronne — préparation", "HBLD745", [15], "prothese_preparation", 1, 60, 2240, 760, "a_faire"]],
  "pl-13": [
    ["Radiographie rétro-alvéolaire 46", "HBQK002", [46], "controle", 1, 10, 30, 0, "fait", 31],
    ["Traitement de racine 46 — séance 1", "HBFD035", [46], "endodontie", 2, 60, 225, 0, "a_faire"],
    ["Traitement de racine 46 — séance 2", "HBFD035", [46], "endodontie", 3, 60, 225, 0, "a_faire"],
  ],
  "pl-14": [
    ["Implant 36 — chirurgie", "LBLD015", [36], "implant_chirurgie", 1, 90, 1450, 620, "a_faire"],
    ["Pilier implantaire 36", "HBLD724", [36], "implant_prothese", 2, 30, 650, 270, "a_faire"],
    ["Couronne sur implant 36", "HBLD724", [36], "implant_prothese", 3, 45, 1750, 750, "a_faire"],
  ],
  "pl-15": [
    ["Bilan et radiographie panoramique", "HBQK001", [], "controle", 1, 20, 0, 0, "fait", 24],
    ["Soin composite 24 et 25", "HBMD049", [24, 25], "soin_conservateur", 2, 45, 160, 48, "a_faire"],
  ],
  "pl-16": [
    ["Couronne zircone 11 — préparation", "HBLD350", [11], "prothese_preparation", 1, 45, 710, 255, "a_faire"],
    ["Couronne zircone 11 — pose", "HBLD350", [11], "prothese_pose", 2, 30, 710, 255, "a_faire"],
  ],
  "pl-17": [
    ["Bilan orthodontique", "TO01", [], "orthodontie_controle", 1, 45, 180, 0, "fait", 15],
    ["Pose de l'appareil, arcades haute et basse", "TO90", [13, 12, 11, 21, 22, 23, 33, 32, 31, 41, 42, 43], "orthodontie_pose", 2, 60, 1300, 0, "a_faire"],
    ["Suivi orthodontique, premier semestre", "TO90", [], "orthodontie_controle", 3, 20, 650, 0, "a_faire"],
    ["Suivi orthodontique, second semestre", "TO90", [], "orthodontie_controle", 4, 20, 650, 0, "a_faire"],
  ],
  "pl-18": [["Détartrage et surfaçage, séance 1", "HBJA003", [41, 42, 43, 44, 45, 46, 47], "parodontie", 1, 45, 640, 210, "a_faire"]],
  /* les devis présentés sans réponse */
  "pl-9": [
    ["Implant 46 — chirurgie", "LBLD015", [46], "implant_chirurgie", 1, 90, 1500, 700, "a_faire"],
    ["Couronne sur implant 46", "HBLD724", [46], "implant_prothese", 2, 45, 1280, 560, "a_faire"],
    ["Couronne céramique 47", "HBLD634", [47], "prothese_preparation", 3, 45, 1500, 700, "a_faire"],
  ],
  "pl-10": [
    ["Inlay-core 25", "HBLD745", [25], "prothese_preparation", 1, 45, 250, 80, "a_faire"],
    ["Couronne céramo-métallique 25", "HBLD418", [25], "prothese_pose", 2, 45, 1100, 330, "a_faire"],
  ],
  "pl-11": [
    ["Inlay-core 12", "HBLD745", [12], "prothese_preparation", 1, 30, 190, 0, "a_faire"],
    ["Couronne céramique 12, 100 % Santé", "HBLD634", [12], "prothese_pose", 2, 45, 500, 0, "a_faire"],
  ],
};

export function actesExemple(plan_id: string): ActePlan[] {
  return (DEFS[plan_id] ?? []).map(([libelle, code, dents, famille, seance, duree_min, montant, reste_a_charge, statut, il], i) => ({
    id: `${plan_id}-a${i + 1}`,
    rang: i + 1,
    code,
    libelle,
    dents,
    famille,
    seance,
    duree_min,
    montant,
    reste_a_charge,
    statut,
    fait_le: statut === "fait" && il !== undefined ? aujourdHui(-il) : null,
  }));
}
