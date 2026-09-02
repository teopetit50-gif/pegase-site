/* ══════════════════════════════════════════════════════════════════════
   Le compte client — types et libellés partagés (02/09/2026)

   Décision Teo du 02/09, révisée le même jour : le code à six chiffres
   reçu par e-mail ne sert qu'à PROUVER L'ADRESSE (création de compte,
   mot de passe oublié, secours) ; le quotidien se fait par MOT DE PASSE
   (e-mail + mot de passe, sur le site comme sur le cockpit). Le drapeau
   user_metadata.mdp_defini === true dit « ce compte a un mot de passe » :
   posé par updateUser au moment où la personne le choisit. Absent (compte
   invité par Teo depuis le cockpit, par exemple), le site enchaîne sur
   « Choisissez votre mot de passe » après le code.

   Le compte donne l'IDENTITÉ ; les DROITS (les moteurs visibles dans le
   cockpit) sont ouverts par Teo au clic « Installation finalisée ».

   Ce fichier n'importe rien de Supabase : il est lu par le proxy, les
   Server Components et les composants client sans tirer la bibliothèque
   là où elle n'est pas nécessaire.
   ══════════════════════════════════════════════════════════════════════ */

import { DUREES_RDV } from "@/lib/creneaux";
import { PROFILS } from "@/lib/reservation";

/* Ce que le site sait d'une personne connectée. prenom/nom/entreprise/
   telephone viennent des user_metadata : rangés à la création du compte
   sur /connexion, ou par le module de réservation après une installation
   réservée — sinon absents. mdpDefini : voir l'en-tête. */
export type Utilisateur = {
  id: string;
  email: string;
  prenom?: string;
  nom?: string;
  entreprise?: string;
  telephone?: string;
  mdpDefini: boolean;
};

/* Même forme depuis les claims du JWT (serveur : sub/email/user_metadata)
   et depuis l'objet User du navigateur (id/email/user_metadata). */
export function utilisateurDepuis(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Utilisateur | null {
  if (!u.id || !u.email) return null;
  const meta = u.user_metadata ?? {};
  const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    id: u.id,
    email: u.email,
    prenom: texte(meta.prenom),
    nom: texte(meta.nom),
    entreprise: texte(meta.entreprise),
    telephone: texte(meta.telephone),
    mdpDefini: meta.mdp_defini === true,
  };
}

/* Longueur minimale d'un mot de passe — la même que celle réglée par Teo
   dans le dashboard Supabase (Auth → Passwords). Vérifiée ici AVANT
   l'appel, pour que le message soit le nôtre et pas celui de Supabase. */
export const MDP_LONGUEUR_MIN = 8;

/* ?suite= : la page où revenir après connexion. Filtrée pour ne jamais
   servir de tremplin vers un autre site.

   02/09 (revue) : la liste noire de préfixes (« // », « /\ », \r\n) ne
   suffisait pas — l'analyseur d'URL WHATWG supprime les tabulations et
   sauts de ligne AVANT de lire, donc « /\t/evil.com » devenait
   « //evil.com » chez le navigateur comme chez Node. On demande
   désormais à l'analyseur lui-même : on résout `s` contre une origine
   fictive et on n'accepte que si l'origine n'a pas bougé. Le résultat
   rendu est la forme NORMALISÉE (chemin + requête + ancre), jamais la
   chaîne reçue. Ceinture en plus : tout caractère de contrôle ou blanc
   fait retomber sur le défaut. */
export function suiteSure(s: string | null | undefined, defaut = "/compte"): string {
  if (!s || typeof s !== "string" || !s.startsWith("/")) return defaut;
  if (/[\u0000-\u0020\u007f]/.test(s)) return defaut;
  let u: URL;
  try {
    u = new URL(s, "http://interne");
  } catch {
    return defaut;
  }
  /* « //x », « /\x », « /\t/x »… changent d'origine et tombent ici */
  if (u.origin !== "http://interne") return defaut;
  const res = u.pathname + u.search + u.hash;
  /* Vérifié en écrivant la correction : « /..//evil.com » garde l'origine
     interne à la première lecture mais donne le CHEMIN « //evil.com » —
     que le navigateur, à qui on le tend ensuite tel quel, lirait comme
     une URL sans schéma. La forme rendue doit donc elle-même passer le
     test : un seul « / » en tête, et la même origine une seconde fois. */
  if (/^\/[\/\\]/.test(res) || new URL(res, "http://interne").origin !== "http://interne") return defaut;
  return res;
}

/* ——— signal de session pour le header (02/09, revue n° 4) ———
   Le header ne charge pas supabase-js : il lit la présence du cookie de
   session. Quand la connexion ou la déconnexion se fait SANS navigation
   complète (module inline du parcours installation), on le prévient par
   cet événement pour qu'il relise le cookie tout de suite. */
export const EVENEMENT_SESSION = "omega:session";
export function signalerSession() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENEMENT_SESSION));
}

/* ——— libellés de « Mon compte » (/compte) ——— */

/* Aujourd'hui seules les INSTALLATIONS (parcours « reglage ») sont
   rattachées à un compte : l'audit et le devis partent sans jeton
   (décision Teo du 02/09, l'audit reste libre). Les deux autres entrées
   restent pour le jour où une demande d'audit serait rattachée — par le
   cockpit, ou si le parcours audit passait le jeton d'une session déjà
   ouverte. Elles ne coûtent rien et évitent un identifiant brut à
   l'écran. (Revue 02/09, n° 14.) */
export const LIBELLES_PARCOURS: Record<string, string> = {
  reglage: "Installation",
  audit: "Audit",
  devis: "Demande de devis",
};

/* Les statuts posés par reserver_audit (a_traiter, confirme), par
   finaliser_installation (honore) et par le cockpit (majStatutDemande :
   confirme, honore, annule, no_show). Un statut inconnu s'affiche tel
   quel plutôt que de planter la page.

   02/09 (revue n° 9) : « À traiter » était le vocabulaire de la to-do de
   Teo — côté client, ça se lisait comme une action qui lui incombe ; on
   dit ce qui se passe de SON point de vue. « no_show » est bien posé par
   le cockpit et n'avait pas de libellé ; « reporte » n'est posé nulle
   part et sort de la liste. */
export const LIBELLES_STATUT: Record<string, string> = {
  a_traiter: "Demande reçue — on vous répond le jour même",
  confirme: "Créneau confirmé",
  honore: "Réunion faite",
  annule: "Annulée",
  no_show: "Réunion manquée — écrivez-nous pour un nouveau créneau",
};

export function libelleFormule(id: string): string {
  if (id === "reglage") return "Réunion d'installation";
  for (const p of PROFILS) {
    const f = p.formules.find((x) => x.id === id);
    if (f) return f.nom;
  }
  return id;
}

export function dureeFormule(id: string, dureeMin?: number | null): string | null {
  const d = dureeMin ?? DUREES_RDV[id] ?? null;
  return d ? `${d} min` : null;
}

/* Un instant ISO → « jeudi 12 septembre 2026 à 10 h 30 », en heure de
   Guadeloupe quel que soit le fuseau du serveur ou du visiteur. */
export function dateHeureGp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Guadeloupe",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Guadeloupe",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(":", " h ");
  return `${date} à ${heure}`;
}
