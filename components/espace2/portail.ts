/* ══════════════════════════════════════════════════════════════════════
   L'espace « DALIRO seul » (05/11/2026, demande de Teo)

   Un client uniquement BTP arrive le 06/11 : il reçoit un lien à lui,
   omegaai.fr/daliro, qui ouvre le même espace client que /espace2 mais
   réduit à ce qui le concerne — DALIRO, le Travail (tâches, notes,
   appels), les Fiches, le Réseau, la Formation et les Réglages. Rien
   d'autre : ni FILED, CASHD, REPUT, OFFLOAD, ni les autres métiers, ni
   l'accueil de l'organisation ou le Suivi.

   Le lien pose le témoin `espace_portail=daliro` (proxy.ts) ; tant qu'il
   est là, toute page de /espace2 hors de la liste ci-dessous renvoie vers
   /espace2/daliro. /espace2?portail=complet efface le témoin et rend
   l'espace complet.

   Ce fichier n'importe rien : le proxy et le layout serveur le lisent ; le
   contexte React est dans portail-contexte.ts (composant client).
   ══════════════════════════════════════════════════════════════════════ */

export const TEMOIN_PORTAIL = "espace_portail";

export type Portail = "daliro";

export const lirePortail = (valeur: string | undefined | null): Portail | null => (valeur === "daliro" ? "daliro" : null);

/* les pages de premier niveau sous /espace2 que l'espace DALIRO garde */
const PAGES_DALIRO = ["daliro", "taches", "notes", "appels", "entreprises", "contacts", "reseau", "reglages", "equipe", "formation"];

/* les pages de la formation propres à un autre module */
const FORMATION_AUTRES = ["filed", "cashd", "reput", "offload", "varelo", "tavaro", "lorani", "tiroma", "tamila"];

/** la page /espace2/… fait-elle partie de l'espace DALIRO ? */
export function dansLePortail(chemin: string): boolean {
  const [premier, second] = chemin.replace(/^\/espace2/, "").split("/").filter(Boolean);
  if (!premier || !PAGES_DALIRO.includes(premier)) return false;
  return !(premier === "formation" && second && FORMATION_AUTRES.includes(second));
}
