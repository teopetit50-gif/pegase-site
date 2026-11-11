/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — le tableau des associés (11/11/2026, soir)

   Teo : « pour le dashboard associé, connecte mon agenda et mon CRM, etc. ».
   Le CRM de Teo (ses prospects, le pipeline) et ses rendez-vous vivent
   dans le TABLEAU DES ASSOCIÉS (omega-tableau-associes.vercel.app, dépôt
   omega-metiers/tableau), sur son propre projet Supabase — « projet 1 »,
   tables public.prospects, rendez_vous, appels, propositions… — réservé
   aux associés connectés (RLS : authenticated).

   Mon espace y lit et y écrit AVEC LA SESSION DE TEO SUR CE TABLEAU : le
   gérant se connecte une fois depuis Mon espace avec son compte du tableau
   (le même courriel et le même mot de passe que sur omega-tableau-associes),
   et la session est gardée dans un cookie à part du site
   (sb-<ref du projet 1>-auth-token, posé par @supabase/ssr), rafraîchi par
   proxy.ts sur /espace2/teo comme celui du site. Aucun mot de passe, aucun
   jeton n'est gardé ailleurs : pas de variable Vercel, pas de compte de
   service, rien dans le dépôt.

   L'adresse du projet 1 et sa clé « publishable » sont publiques par
   conception (RLS) : les mêmes que celles du tableau, en clair ici, les
   variables TABLEAU_SUPABASE_* passent avant si on les pose.
   ══════════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TABLEAU_CLE, TABLEAU_URL } from "./tableau-config";
import type { EtatTableau } from "./types";

export { TABLEAU_ADRESSE, TABLEAU_CLE, TABLEAU_COOKIE, TABLEAU_URL } from "./tableau-config";

/** les deux associés du tableau, tels qu'il les nomme (tableau/lib/rdv-texte.ts) */
export const ASSOCIES = ["Teo", "Timothée"] as const;
export type Associe = (typeof ASSOCIES)[number];
const sansAccent = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** « teo », « Timothee », « Associé » → le nom affiché ; inconnu → tel quel */
export function associeDe(nom: string | null | undefined): string {
  const n = sansAccent(nom);
  if (n === "associe") return "Timothée";
  return ASSOCIES.find((a) => sansAccent(a) === n) ?? (nom?.trim() || "—");
}

/* un client NEUF par requête, qui lit la session du tableau dans les cookies ;
   setAll lève depuis un Server Component (réponse déjà en cours) : on l'avale,
   proxy.ts rafraîchit en amont, et les Server Functions (brancher, débrancher)
   écrivent sans encombre */
export async function clientTableau() {
  const magasin = await cookies();
  return createServerClient(TABLEAU_URL, TABLEAU_CLE, {
    cookies: {
      getAll() {
        return magasin.getAll();
      },
      setAll(aPoser) {
        try {
          aPoser.forEach(({ name, value, options }) => magasin.set(name, value, options));
        } catch {
          /* appelé depuis un Server Component : proxy.ts s'en charge */
        }
      },
    },
  });
}

export type SessionTableau = { etat: "ok"; email: string; associe: string } | { etat: Exclude<EtatTableau, "ok">; detail: string | null };

/** la session de Teo sur le tableau : ouverte (et au nom de quel associé), absente, ou en erreur */
export async function sessionTableau(): Promise<SessionTableau> {
  try {
    const supabase = await clientTableau();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims as { email?: string; user_metadata?: { associe?: string; prenom?: string } } | undefined;
    if (error || !claims?.email) return { etat: "absent", detail: null };
    const meta = claims.user_metadata ?? {};
    return { etat: "ok", email: claims.email, associe: associeDe(meta.associe === "Associé" ? "Timothée" : (meta.associe ?? meta.prenom)) };
  } catch (e) {
    return { etat: "erreur", detail: e instanceof Error ? e.message : "Le tableau n'a pas répondu." };
  }
}

/** se connecter au tableau depuis Mon espace (Server Function : le cookie se pose) */
export async function ouvrirSessionTableau(courriel: string, mdp: string): Promise<{ ok: boolean; detail: string | null }> {
  try {
    const supabase = await clientTableau();
    const { error } = await supabase.auth.signInWithPassword({ email: courriel.trim().toLowerCase(), password: mdp });
    if (error) return { ok: false, detail: /invalid login credentials/i.test(error.message) ? "Courriel ou mot de passe refusé par le tableau." : error.message };
    return { ok: true, detail: null };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Le tableau n'a pas répondu." };
  }
}

/** fermer la session du tableau (le cookie seulement ; la session du site reste) */
export async function fermerSessionTableau(): Promise<string | null> {
  try {
    const supabase = await clientTableau();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : "Le tableau n'a pas répondu.";
  }
}
