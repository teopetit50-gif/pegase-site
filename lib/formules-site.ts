/* ══════════════════════════════════════════════════════════════════════
   Les trois formules du site catalogue — décision Teo du 27/09/2026

   Jusqu'au 26/09, un seul prix : 990 € le site, sans borne. Rien ne
   limitait ni le nombre de pages ni les allers-retours, et 990 € ne
   paient que 6,6 h de travail sur notre propre règle (60 €/h, marge
   ×2,5 — PEGASE/modele-cout-client.md). Teo : « trois prix par site,
   990 pour un site vitrine simple, 1 990 avec x pages et allers-retours,
   et un au-dessus ». Chaque formule tient dans les heures que son prix
   paie : 6,6 h, 13,3 h et 23,3 h.

   C'est la SEULE source de ces montants. La page /tarifs/site, sa FAQ,
   les clôtures de /modeles, le message de réservation les lisent ici :
   un prix recopié à la main finit toujours par diverger.

   Le prix ne voyage JAMAIS dans une URL : seul l'identifiant de la
   formule (`?site=standard`) traverse /reserver-un-audit → /reserver,
   et le montant se relit ici, à l'arrivée, côté serveur.
   ══════════════════════════════════════════════════════════════════════ */

export type IdFormuleSite = "essentiel" | "standard" | "complet";

export type FormuleSite = {
  id: IdFormuleSite;
  nom: string;
  /** TTC, payé une fois */
  prix: number;
  /** hors mentions légales */
  pages: number;
  allersRetours: number;
  /** ce que devient le dessin du modèle */
  miseEnPage: string;
  accroche: string;
  recommandee?: boolean;
};

export const FORMULES_SITE: readonly FormuleSite[] = [
  {
    id: "essentiel",
    nom: "Essentiel",
    prix: 990,
    pages: 3,
    allersRetours: 1,
    miseEnPage: "Le modèle tel qu'il est dessiné",
    accroche: "L'essentiel en trois pages\u00a0: qui vous êtes, ce que vous faites, comment vous joindre.",
  },
  {
    id: "standard",
    nom: "Standard",
    prix: 1990,
    pages: 6,
    allersRetours: 2,
    miseEnPage: "Le modèle tel qu'il est dessiné",
    accroche: "Chaque prestation sur sa propre page, avec vos réalisations et vos points de vente.",
    recommandee: true,
  },
  {
    id: "complet",
    nom: "Complet",
    prix: 3490,
    pages: 12,
    allersRetours: 3,
    miseEnPage: "Sections ajoutées ou réorganisées",
    accroche: "Un site étendu, dont la mise en page suit votre activité plutôt que le modèle.",
  },
];

/** Une page ou un aller-retour au-delà de la formule : une heure au même tarif. */
export const SUPPLEMENT_SITE_EUR = 150;

/** La maintenance sans abonnement (comprise tant qu'un poste est en service). */
export const MAINTENANCE_SITE_EUR = 49;

export const PRIX_MIN_SITE = FORMULES_SITE[0].prix;
export const PRIX_MAX_SITE = FORMULES_SITE[FORMULES_SITE.length - 1].prix;

/** La formule d'un identifiant lu dans une URL — `undefined` si inventé. */
export function formuleSite(id?: string | null): FormuleSite | undefined {
  const v = (id ?? "").trim();
  return FORMULES_SITE.find((f) => f.id === v);
}

/** Le Chèque TIC ne prend que deux taux : 40 ou 80 %. Les prix sont des
 *  dizaines rondes, le reste tombe donc juste — aucun arrondi n'invente
 *  un euro (990 → 594 / 198, 1 990 → 1 194 / 398, 3 490 → 2 094 / 698). */
export function resteChequeTic(prix: number, taux: 40 | 80): number {
  return (prix * (100 - taux)) / 100;
}

/** « 1 990 € » — espace fine insécable des milliers, insécable avant €. */
export function euros(n: number): string {
  return `${milliers(n)}\u00a0€`;
}

/** « 1 990 » — groupé à la main plutôt que par toLocaleString : le même
 *  texte au serveur et au navigateur, quelle que soit la version d'ICU
 *  (un caractère de différence casserait l'hydratation). */
export function milliers(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
}

/** « 3 pages », « 1 aller-retour » */
export function pluriel(n: number, un: string, plusieurs: string): string {
  return `${n} ${n > 1 ? plusieurs : un}`;
}

/** La phrase qui ouvre le message de réservation — le montant relu ici,
 *  jamais dans l'URL. */
export function phraseFormuleSite(f: FormuleSite): string {
  return `Formule de site retenue : ${f.nom} — ${euros(f.prix)}, ${pluriel(f.pages, "page", "pages")}, ${pluriel(f.allersRetours, "aller-retour", "allers-retours")}.`;
}
