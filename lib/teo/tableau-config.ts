/* MON ESPACE — l'adresse du tableau des associés (11/11/2026, soir)
   Rien que des constantes publiques, sans next/headers : lues par lib/teo/tableau.ts
   (serveur) ET par lib/supabase/proxy.ts (le proxy, qui ne peut pas importer cookies()). */

const URL_PAR_DEFAUT = "https://ohwolvyjtceisvtkiftb.supabase.co";
const CLE_PAR_DEFAUT = "sb_publishable_hPp5Z6OyrRjTIjP8cxqgDQ_5OIOiMw6";

/* le projet Supabase 1 du tableau (sa clé « publishable » est publique par conception : RLS) */
export const TABLEAU_URL = process.env.TABLEAU_SUPABASE_URL || URL_PAR_DEFAUT;
export const TABLEAU_CLE = process.env.TABLEAU_SUPABASE_PUBLISHABLE_KEY || CLE_PAR_DEFAUT;
/** le tableau lui-même, pour les liens « ouvrir dans le tableau » */
export const TABLEAU_ADRESSE = (process.env.TABLEAU_ADRESSE || "https://omega-tableau-associes.vercel.app").replace(/\/$/, "");
/** le début du nom du cookie de session du tableau, posé par @supabase/ssr */
export const TABLEAU_COOKIE = `sb-${new URL(TABLEAU_URL).hostname.split(".")[0]}-auth-token`;
