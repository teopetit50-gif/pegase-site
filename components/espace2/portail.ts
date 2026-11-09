/* ══════════════════════════════════════════════════════════════════════
   L'espace « un seul logiciel » (05/11/2026, demande de Teo ; généralisé
   aux six logiciels métier le 09/11/2026)

   Un client uniquement BTP arrive le 06/11 : il reçoit un lien à lui,
   omegaai.fr/daliro, qui ouvre le même espace client que /espace2 mais
   réduit à ce qui le concerne — DALIRO, le Travail (tâches, notes,
   appels), les Fiches, le Réseau, la Formation et les Réglages. Rien
   d'autre : ni FILED, CASHD, REPUT, OFFLOAD, ni les autres métiers, ni
   l'accueil de l'organisation ou le Suivi.

   Le lien pose le témoin `espace_portail=<logiciel>` (proxy.ts) ; tant
   qu'il est là, toute page de /espace2 hors de la liste ci-dessous renvoie
   vers /espace2/<logiciel>. /espace2?portail=complet efface le témoin et
   rend l'espace complet.

   09/11/2026 — chaque logiciel métier a aussi son propre déploiement
   Vercel (daliro, tamila, lorani, tiroma, tavaro, varelo), bâti depuis ce
   même dépôt avec la variable NEXT_PUBLIC_PORTAIL=<logiciel>. Sur un tel
   déploiement, le portail est imposé (PORTAIL_DEPLOIEMENT) : la racine
   ouvre /espace2/<logiciel>, le témoin ne compte plus et ?portail=complet
   n'ouvre rien d'autre. Sans la variable (omegaai.fr), rien ne change.

   Ce fichier n'importe rien : le proxy et le layout serveur le lisent ; le
   contexte React est dans portail-contexte.ts (composant client).
   ══════════════════════════════════════════════════════════════════════ */

export const TEMOIN_PORTAIL = "espace_portail";

/* les six logiciels métier qui peuvent vivre seuls */
export const PORTAILS = ["daliro", "tamila", "lorani", "tiroma", "tavaro", "varelo"] as const;

export type Portail = (typeof PORTAILS)[number];

export const lirePortail = (valeur: string | undefined | null): Portail | null =>
  (PORTAILS as readonly string[]).includes(valeur ?? "") ? (valeur as Portail) : null;

/** le portail imposé à un déploiement dédié (NEXT_PUBLIC_PORTAIL), null sur omegaai.fr */
export const PORTAIL_DEPLOIEMENT: Portail | null = lirePortail(process.env.NEXT_PUBLIC_PORTAIL);

/* les pages de premier niveau sous /espace2 que chaque espace réduit garde,
   en plus de la page du logiciel lui-même */
const PAGES_COMMUNES = ["taches", "notes", "appels", "entreprises", "contacts", "reseau", "reglages", "equipe", "formation"];

/* les pages de la formation propres aux quatre modules et aux autres métiers */
const FORMATION_AUTRES = ["filed", "cashd", "reput", "offload", ...PORTAILS];

/** la page /espace2/… fait-elle partie de l'espace réduit à ce logiciel ? */
export function dansLePortail(chemin: string, portail: Portail = "daliro"): boolean {
  const [premier, second] = chemin.replace(/^\/espace2/, "").split("/").filter(Boolean);
  if (!premier || (premier !== portail && !PAGES_COMMUNES.includes(premier))) return false;
  return !(premier === "formation" && second && second !== portail && FORMATION_AUTRES.includes(second));
}
