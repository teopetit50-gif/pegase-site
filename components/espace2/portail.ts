/* ══════════════════════════════════════════════════════════════════════
   L'espace d'un seul métier (05/11/2026, demande de Teo ; généralisé aux
   six logiciels métier le 09/11/2026)

   05/11 — un client uniquement BTP arrive le 06/11 : il reçoit un lien à
   lui, omegaai.fr/daliro, qui ouvre le même espace client que /espace2
   mais réduit à ce qui le concerne — DALIRO, le Travail (tâches, notes,
   appels), les Fiches, le Réseau, la Formation et les Réglages. Rien
   d'autre : ni FILED, CASHD, REPUT, OFFLOAD, ni les autres métiers, ni
   l'accueil de l'organisation ou le Suivi.

   09/11 — Teo : « chaque SaaS va être indépendant, sauf les quatre modules
   principaux ». Les six logiciels métier — DALIRO (BTP), LORANI
   (architectes), TAMILA (avocats), TAVARO (loueurs), TIROMA (dentaires),
   VARELO (groupes) — deviennent chacun un déploiement Vercel à part, bâti
   sur ce même dépôt : la variable NEXT_PUBLIC_PORTAIL_METIER, posée sur le
   projet Vercel du métier, fige le portail pour tout le déploiement — sans
   témoin, sans sortie vers l'espace complet, la racine du site et les
   pages de la vitrine menant au module (next.config.ts). omegaai.fr n'a
   pas la variable : il garde l'espace complet et les entrées par témoin.

   Deux façons d'ouvrir le portail :
   · le DÉPLOIEMENT (la variable) — prioritaire, permanent ;
   · le TÉMOIN `espace_portail=<métier>` (proxy.ts), posé par le lien
     omegaai.fr/<métier> ; tant qu'il est là, toute page de /espace2 hors
     de l'espace du métier renvoie vers /espace2/<métier> ;
     /espace2?portail=complet l'efface et rend l'espace complet.

   Ce fichier n'importe rien : le proxy (edge) et le layout serveur le
   lisent ; le contexte React est dans portail-contexte.ts (composant
   client).
   ══════════════════════════════════════════════════════════════════════ */

export const TEMOIN_PORTAIL = "espace_portail";

/* les six logiciels métier : les clés de MODULES hors MODULES_PRINCIPAUX (modules.ts), dans l'ordre de la navigation */
export const METIERS = ["daliro", "lorani", "tamila", "tavaro", "tiroma", "varelo"] as const;
export type Portail = (typeof METIERS)[number];

/* le nom du logiciel, pour le titre de l'onglet d'un déploiement métier */
export const NOMS_METIERS: Record<Portail, string> = { daliro: "DALIRO", lorani: "LORANI", tamila: "TAMILA", tavaro: "TAVARO", tiroma: "TIROMA", varelo: "VARELO" };

export const lirePortail = (valeur: string | undefined | null): Portail | null => ((METIERS as readonly string[]).includes(valeur ?? "") ? (valeur as Portail) : null);

/* le portail figé par le déploiement : NEXT_PUBLIC_PORTAIL_METIER, posée sur
   le projet Vercel du métier (daliro, lorani…) et absente sur omegaai.fr ;
   une variable NEXT_PUBLIC_ est inscrite au build, donc lue partout (proxy,
   serveur, navigateur) sans un octet de plus à l'exécution */
export const PORTAIL_DEPLOIEMENT: Portail | null = lirePortail(process.env.NEXT_PUBLIC_PORTAIL_METIER);

/** le portail en vigueur : celui du déploiement, sinon celui du témoin */
export const portailCourant = (temoin: string | undefined | null): Portail | null => PORTAIL_DEPLOIEMENT ?? lirePortail(temoin);

/* les pages de premier niveau sous /espace2 que l'espace d'un métier garde, en plus de son module */
const PAGES_COMMUNES = ["taches", "notes", "appels", "entreprises", "contacts", "reseau", "reglages", "equipe", "formation"];

/* les pages de la formation propres à un module : celles des autres modules sortent de l'espace */
const MODULES_TOUS: readonly string[] = ["filed", "cashd", "reput", "offload", ...METIERS];

/** la page /espace2/… fait-elle partie de l'espace du métier ? */
export function dansLePortail(chemin: string, portail: Portail): boolean {
  const [premier, second] = chemin.replace(/^\/espace2/, "").split("/").filter(Boolean);
  if (!premier || (premier !== portail && !PAGES_COMMUNES.includes(premier))) return false;
  return !(premier === "formation" && second && second !== portail && MODULES_TOUS.includes(second));
}
