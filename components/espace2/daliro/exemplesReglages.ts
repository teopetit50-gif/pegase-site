/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Réglages — l'exemple rempli comme la référence (02/11/2026,
   règle 3 de Teo : « un contenu de même longueur que la référence »).

   La page « Issue labels » relevée compte 19 lignes (16 étiquettes, un
   groupe et ses 3 enfants) ; la bibliothèque d'exemple n'avait que 6 prix.
   Dix prix de plus, de corps d'état variés, validés ou proposés. Posés une
   fois dans chaque tableau d'exemple par la page (onLocal), comme un prix
   posé l'est : chaque fiche de chantier les voit.

   L'accord J-2 d'exemple : celui de l'écran d'avant (AccordJ2.tsx), actif,
   donné il y a deux mois par le gérant.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui, dans, ilYa } from "@/components/espace/exemples/socle";
import type { AccordJ2, CanalAccordJ2, Prix } from "@/components/espace/daliro/types";

const id = (n: number) => `00000000-0000-4000-8000-000000eb${String(n).padStart(4, "0")}`;

type Def = [designation: string, unite: string, corps: string, origine: Prix["origine"], statut: Prix["statut"], pu: number, il_y_a: number];
const DEFS: Def[] = [
  ["Bloc-porte coupe-feu EI 30, huisserie métallique", "u", "menuiserie", "marche", "valide", 1460, 32],
  ["Cloison distributive 72/48, deux plaques BA13", "m2", "plâtrerie", "marche", "valide", 54, 30],
  ["Doublage isolant PSE 100 mm + BA13", "m2", "plâtrerie", "saisie", "propose", 52, 9],
  ["Prise 16 A encastrée, câblage depuis le tableau", "u", "électricité", "saisie", "valide", 68, 14],
  ["Luminaire LED étanche IP65", "u", "électricité", "marche", "valide", 165, 40],
  ["Évier inox double bac sur piétement", "u", "plomberie", "saisie", "propose", 760, 9],
  ["Dalle béton armé 12 cm", "m2", "maçonnerie", "marche", "valide", 78, 45],
  ["Bardage mélèze à claire-voie", "m2", "charpente", "saisie", "propose", 92, 16],
  ["Plafond acoustique en dalles 600 × 600", "m2", "plâtrerie", "saisie", "valide", 46, 8],
  ["Garde-corps verre feuilleté, pinces inox", "ml", "serrurerie", "saisie", "propose", 420, 10],
];

export const PRIX_PLUS: Prix[] = DEFS.map(([designation, unite, corps_etat, origine, statut, pu, il], i) => ({
  id: id(i + 1), designation, unite, corps_etat, origine, ligne_marche_id: null, date_prix: aujourdHui(-il), statut, prix_unitaire_ht: pu,
}));

function canal(c: CanalAccordJ2["canal"], statut: CanalAccordJ2["statut"], extra: Partial<CanalAccordJ2> = {}): CanalAccordJ2 {
  return {
    canal: c, statut, politique: null, debut: null, fin: null, active_le: null, cree_le: null, donne_par_libelle: null,
    demande_statut: null, revoquee_le: null, revoquee_par_libelle: null, motif_revocation: null, nombre_mensuel: 1000, utilises_mois: 0, ...extra,
  };
}
export { canal as canalAccord };

export function accordExemple(): AccordJ2 {
  const base = { debut: ilYa(60), fin: dans(305), active_le: ilYa(59), cree_le: ilYa(60), donne_par_libelle: "Vous", demande_statut: "executee" };
  return {
    etat: "actif",
    fin: base.fin,
    canaux: [canal("email", "active", { ...base, utilises_mois: 7 }), canal("sms", "active", base), canal("whatsapp", "active", { ...base, utilises_mois: 12 })],
  };
}
