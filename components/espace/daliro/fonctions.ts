/* Les fonctions ouvertes selon la formule (11/10/2026, session B6, b6_27) — la même liste que
   public.btp_fonctions_de du socle. La base refuse de toute façon (private.btp_exiger_fonction) ;
   l'écran ne montre pas un bouton qu'elle refuserait. */

import type { Tableau } from "./types";

const DEMARRAGE = ["lecture", "avenants", "signature", "confirmation_j2", "annuaire", "point_matin", "questions", "audit"];
const CHANTIERS = [...DEMARRAGE, "relance_avenants", "remplacants", "ordre_lots", "meteo", "liste_cadencee", "livraisons_calees",
                   "roles_droits", "journal_validations", "point_mensuel"];
const ENTREPRISE = [...CHANTIERS, "retours", "bons_livraison", "situations"];
const PAR_FORMULE: Record<string, string[]> = { demarrage: DEMARRAGE, chantiers: CHANTIERS, entreprise: ENTREPRISE };

/* Sans réglages lus (ancienne base, lecture partielle), rien n'est caché : la base tranche. */
export function ouverte(tableau: Tableau, fonction: string): boolean {
  const formule = tableau.reglages?.formule;
  return !formule || (PAR_FORMULE[formule] ?? ENTREPRISE).includes(fonction);
}

export const formuleQuiOuvre = (fonction: string) => (CHANTIERS.includes(fonction) ? "Chantiers" : "Entreprise");
