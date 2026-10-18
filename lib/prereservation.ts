/* ══════════════════════════════════════════════════════════════════════
   Le formulaire de /reserver-un-audit remet ce qu'il a déjà demandé à
   /reserver, pour que le visiteur ne retape ni son nom ni son entreprise.

   POURQUOI SESSIONSTORAGE ET PAS L'URL : une adresse e-mail ou un nom dans
   l'URL finit dans l'historique, les journaux du serveur et les liens
   partagés. Ici le transfert reste dans l'onglet, le temps d'une
   réservation, et disparaît dès qu'il est lu.

   Lu UNE fois par PriseDeCreneau (lirePrereservation efface la clé) ; sans
   navigateur (rendu serveur, sessionStorage bloqué) tout rend `null` et la
   réservation se fait comme avant.
   ══════════════════════════════════════════════════════════════════════ */

export const CLE_PREREMPLISSAGE = "omega.reserver.pre";

export type Prereservation = {
  prenom: string;
  nom: string;
  entreprise: string;
  email: string;
  /* valeur de SECTEURS (lib/creneaux.ts) */
  secteur: string;
  /* lignes ajoutées au message, une par information (fonction, pays…) */
  lignes: string[];
};

export function enregistrerPrereservation(p: Prereservation) {
  try {
    sessionStorage.setItem(CLE_PREREMPLISSAGE, JSON.stringify(p));
  } catch {
    /* pas de stockage : /reserver s'ouvre vide, comme avant */
  }
}

export function lirePrereservation(): Prereservation | null {
  try {
    const brut = sessionStorage.getItem(CLE_PREREMPLISSAGE);
    sessionStorage.removeItem(CLE_PREREMPLISSAGE);
    if (!brut) return null;
    const p = JSON.parse(brut) as Partial<Prereservation>;
    const texte = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      prenom: texte(p.prenom),
      nom: texte(p.nom),
      entreprise: texte(p.entreprise),
      email: texte(p.email),
      secteur: texte(p.secteur),
      lignes: Array.isArray(p.lignes) ? p.lignes.filter((l) => typeof l === "string") : [],
    };
  } catch {
    return null;
  }
}
