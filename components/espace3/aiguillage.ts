/* ══════════════════════════════════════════════════════════════════════
   L'aiguillage : d'un repère écrit par un moteur à la bonne page
   (29/10/2026, refonte des pages métiers, étape 0)

   Les moteurs écrivent en base des repères vers le dashboard : les lignes
   du point du matin ({ lien: "/espace/daliro", objet_type, objet_id }),
   les demandes à valider (module, objet_type, objet_id), les liens des
   alertes et des courriels (« /espace/lorani?permis=<id> »). Ces repères
   sont figés : les lignes déjà stockées et les courriels déjà partis
   garderont l'adresse d'hier. On ne les réécrit donc jamais en base ;
   c'est ici, côté écran, qu'un repère trouve sa page.

   Quand une page est redécoupée en sous-pages, on change sa règle ici
   (RÈGLES, plus bas), jamais le lien du moteur. Chaque objet_type écrit
   à côté d'un lien doit avoir sa règle : `node outils/verifier-aiguillage.mjs`
   le vérifie sur les migrations de omega/modules, et liste à part les
   autres objet_type (demandes à valider…), qui sans règle mènent à la page
   du module.

   Contrat des pages métiers : la page racine /espace3/<métier> accepte
   « ?objet=<objet_type>:<id> » (lireObjet) et ouvre l'objet, ou renvoie
   vers la sous-page qui le montre.
   ══════════════════════════════════════════════════════════════════════ */

import { RACINE, moduleDe } from "./modules";

export type Repere = {
  /* le module de la ligne ou de la demande (filed, daliro…) */
  module?: string | null;
  /* le lien écrit par le moteur, tel quel (« /espace/daliro », « /espace/lorani?permis=… ») */
  lien?: string | null;
  objet_type?: string | null;
  objet_id?: string | null;
  /* le payload d'une demande (FILED : le fournisseur d'un IBAN) */
  payload?: Record<string, unknown> | null;
};

type Regle = (id: string, r: Repere) => string | null;

const q = encodeURIComponent;
/* l'objet ouvert par la page racine d'un métier, en attendant ses sous-pages */
const objet = (module: string) => (type: string) => (id: string) => `${RACINE}/${module}?objet=${q(type)}:${q(id)}`;

/* le module d'un objet, au préfixe de sa table */
const PREFIXES: [string, string][] = [
  ["filed_", "filed"],
  ["cashd_", "cashd"],
  ["offload_", "offload"],
  ["reput_", "reput"],
  ["btp_", "daliro"],
  ["loc_", "tavaro"],
  ["lorani_", "lorani"],
  ["tamila_", "tamila"],
  ["tiroma_", "tiroma"],
  ["grp_", "varelo"],
];

const tavaro = objet("tavaro");
const tamila = objet("tamila");
const tiroma = objet("tiroma");
const varelo = objet("varelo");

/* objet_type → page. Une ligne par objet_type écrit par un moteur. */
export const REGLES: Record<string, Regle> = {
  /* FILED — la page Documents reçus lit « ?objet=facture|document|fournisseur:<id> » (TableauFiled) */
  filed_facture: (id) => `${RACINE}/filed?objet=facture:${q(id)}`,
  filed_document: (id) => `${RACINE}/filed?objet=document:${q(id)}`,
  filed_fournisseur: (id) => `${RACINE}/filed?objet=fournisseur:${q(id)}`,
  filed_iban: (_id, r) => (typeof r.payload?.fournisseur === "string" ? `${RACINE}/filed?objet=fournisseur:${q(r.payload.fournisseur)}` : null),

  /* CASHD — le tableau de bord ouvre la fiche d'un compte (Debiteurs, « ?compte= ») */
  cashd_comptes: (id) => `${RACINE}/cashd?compte=${q(id)}`,
  /* OFFLOAD — les comptes à risque ouvrent la fiche (ComptesRisque, « ?compte= ») */
  offload_comptes: (id) => `${RACINE}/offload?compte=${q(id)}`,
  /* REPUT — la page Demandes ouvre une demande (TableauReput, « ?demande= ») */
  reput_demandes: (id) => `${RACINE}/reput?demande=${q(id)}`,

  /* LORANI — l'écran actuel lit « ?permis= » et « ?projet= » (EcranLorani) */
  lorani_permis: (id) => `${RACINE}/lorani?permis=${q(id)}`,
  lorani_projets: (id) => `${RACINE}/lorani?projet=${q(id)}`,
  /* le même projet, au singulier, dans les demandes de Lorani */
  lorani_projet: (id) => `${RACINE}/lorani?projet=${q(id)}`,
  /* une question restée sans réponse (b5_25) : son lien porte déjà « ?projet= », il l'emporte */
  lorani_point: () => null,

  /* une décision de Varelo à valider (b1_15) : la page À valider ne sait pas encore ouvrir une demande donnée */
  demandes_validation: () => `${RACINE}/validations`,

  /* TAVARO, TAMILA, TIROMA, VARELO — « ?objet= », lu par les pages refaites */
  /* DALIRO, refait le 29/10/2026 : la fiche du chantier, la page des avenants et situations, la page À faire */
  btp_chantiers: (id) => `${RACINE}/daliro/chantiers/${q(id)}`,
  btp_avenants: (id) => `${RACINE}/daliro/avenants?avenant=${q(id)}`,
  btp_avenant: (id) => `${RACINE}/daliro/avenants?avenant=${q(id)}`,
  btp_situations: (id) => `${RACINE}/daliro/avenants?situation=${q(id)}`,
  btp_situation: (id) => `${RACINE}/daliro/avenants?situation=${q(id)}`,
  btp_passages: (id) => `${RACINE}/daliro/a-faire?passage=${q(id)}`,
  loc_contrats: tavaro("loc_contrats"),
  loc_reservations: tavaro("loc_reservations"),
  loc_vehicules: tavaro("loc_vehicules"),
  /* le point du matin de production (b2_18) */
  loc_avis_contravention: tavaro("loc_avis_contravention"),
  loc_contestations: tavaro("loc_contestations"),
  loc_entretiens: tavaro("loc_entretiens"),
  loc_immobilisations: tavaro("loc_immobilisations"),
  loc_passages_peage: tavaro("loc_passages_peage"),
  loc_rappels_vehicules: tavaro("loc_rappels_vehicules"),
  loc_remises: tavaro("loc_remises"),
  tamila_dossier: tamila("tamila_dossier"),
  tiroma_evenements_agenda: tiroma("tiroma_evenements_agenda"),
  tiroma_fauteuils: tiroma("tiroma_fauteuils"),
  tiroma_plans: tiroma("tiroma_plans"),
  /* calculé par tiroma_avant_rendez_vous_pour (b3_04), repris par le point du matin (b3_06) */
  tiroma_travaux_labo: tiroma("tiroma_travaux_labo"),
  grp_balances_depots: varelo("grp_balances_depots"),
  grp_contrats: varelo("grp_contrats"),
  grp_encours_depots: varelo("grp_encours_depots"),
  grp_receptions: varelo("grp_receptions"),
  grp_ref_objets: varelo("grp_ref_objets"),
  grp_reportings_echeances: varelo("grp_reportings_echeances"),
  grp_societes: varelo("grp_societes"),
};

export function moduleDeObjet(objet_type: string | null | undefined): string | null {
  if (!objet_type) return null;
  return PREFIXES.find(([p]) => objet_type.startsWith(p))?.[1] ?? null;
}

/* « /espace/x?… » → « /espace3/x?… » ; « ?ancien=1 » garde l'écran actuel.
   Le point du matin de Tavaro (lot 2a, omega/SOCLE-EXTRAITS-TAVARO.sql)
   écrit « /tavaro/factures », sans /espace : une route qui n'a jamais
   existé. Un lien qui commence par le nom d'un module mène à sa page. */
function versEspace2(lien: string): string | null {
  if (lien.startsWith(RACINE)) return lien;
  if (/^\/espace(\/|\?|$)/.test(lien)) return lien.includes("ancien=1") ? lien : lien.replace(/^\/espace/, RACINE);
  const nu = lien.match(/^\/([a-z0-9]+)[^?]*(\?.*)?$/);
  return nu && moduleDe(nu[1]) ? `${RACINE}/${nu[1]}${nu[2] ?? ""}` : null;
}

/* La page d'un repère : la règle de son objet, sinon le lien du moteur
   porté dans l'espace 2, sinon la page de son module, sinon rien. */
export function aiguiller(r: Repere): string | null {
  if (r.objet_type && r.objet_id) {
    const regle = REGLES[r.objet_type];
    const cible = regle?.(r.objet_id, r);
    if (cible) return cible;
  }
  if (r.lien) {
    const porte = versEspace2(r.lien);
    if (porte) return porte;
  }
  /* le module se lit d'abord au préfixe de l'objet ; un nom de module sans page (« loc », « socle ») ne mène nulle part */
  const cle = moduleDeObjet(r.objet_type) ?? (moduleDe(r.module ?? undefined) ? r.module : null);
  return cle ? `${RACINE}/${cle}` : null;
}

/* « ?objet=<objet_type>:<id> » d'une page métier (le type est celui des moteurs) */
export function lireObjet(params: URLSearchParams | { get(nom: string): string | null }): { type: string; id: string } | null {
  const m = params.get("objet")?.match(/^([a-z_]+):(.+)$/);
  return m ? { type: m[1], id: m[2] } : null;
}
