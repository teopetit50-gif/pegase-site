/* ══════════════════════════════════════════════════════════════════════
   Adresse de l'armoire OMEGA-Core — source unique (02/09/2026)

   Jusqu'ici l'URL et la clé « publishable » vivaient en dur dans
   lib/creneaux.ts. Avec le compte client, trois autres endroits en ont
   besoin (client navigateur, client serveur, proxy) : elles ne vivent plus
   qu'ICI.

   Les variables NEXT_PUBLIC_* passent d'abord (.env.local en local, rien
   sur Vercel aujourd'hui) ; à défaut, les constantes publiques. Le repli
   n'est pas une facilité : le site déployé n'a AUCUNE variable
   d'environnement et doit continuer à tourner tel quel.

   La clé « publishable » est publique par conception — elle passe par RLS
   et ne peut appeler que ce qui est accordé à `anon` / `authenticated`.
   Rien de secret dans ce fichier, et il n'y en aura jamais : la clé
   service_role ne quitte pas le cockpit.
   ══════════════════════════════════════════════════════════════════════ */

const URL_PAR_DEFAUT = "https://noepmkkplxshjbmqqxft.supabase.co";
const CLE_PAR_DEFAUT = "sb_publishable_9TSwcnUkHIOol1FIxEVWPw_F4HRnhqS";
const COCKPIT_PAR_DEFAUT = "https://app.omegaai.fr"; // 05/09 — le cockpit a son domaine

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || URL_PAR_DEFAUT;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || CLE_PAR_DEFAUT;

/* Le cockpit (pegase-dashboard) : c'est là qu'un client installé retrouve
   ses moteurs. Le site n'y fait qu'un lien — « Ouvrir mon cockpit ». */
export const COCKPIT_URL = (process.env.NEXT_PUBLIC_COCKPIT_URL || COCKPIT_PAR_DEFAUT).replace(/\/$/, "");

/* ——— le cookie de session, SANS supabase-js (02/09, revue n° 4) ———
   @supabase/ssr range la session dans un cookie nommé
   « sb-<ref du projet>-auth-token » (découpé en « .0 », « .1 »… quand il
   est long), lisible par document.cookie : le navigateur n'a pas besoin
   de la bibliothèque pour savoir si une session est là. Le header s'en
   sert pour choisir entre /connexion et /compte — un lien, pas un droit :
   /connexion renvoie de toute façon vers /compte si la session est
   valide, et /compte renvoie vers /connexion si elle ne l'est pas. */
const REF_PROJET = new URL(SUPABASE_URL).hostname.split(".")[0];
export const NOM_COOKIE_SESSION = `sb-${REF_PROJET}-auth-token`;

export function sessionCookiePresente(): boolean {
  if (typeof document === "undefined") return false;
  const nom = NOM_COOKIE_SESSION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|;\\s*)${nom}(?:\\.\\d+)?=`).test(document.cookie);
}
