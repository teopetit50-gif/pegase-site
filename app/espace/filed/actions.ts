"use server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/filed — l'URL signée d'une pièce, côté serveur (05/10/2026)

   Les fichiers des pièces vivent dans le bucket Storage `omega-clients`,
   privé. L'URL signée est fabriquée ICI, avec le client serveur qui porte
   la session de la personne (cookies) : Storage applique ses règles RLS,
   une personne ne signe que ce qu'elle a le droit de lire. Dix minutes de
   validité ; la visionneuse redemande quand elle change de pièce.

   Rien d'autre : les écritures FILED passent par les portes RPC depuis le
   navigateur (components/espace/filed/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";

export async function urlSigneePiece(chemin: string): Promise<{ url: string } | { erreur: string }> {
  if (!chemin || chemin.length > 1024 || chemin.includes("..")) return { erreur: "Chemin de pièce invalide." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { erreur: "Aucune session ouverte." };
  const { data, error } = await supabase.storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error || !data?.signedUrl) return { erreur: traduire(error?.message) };
  return { url: data.signedUrl };
}

/* Les messages de Storage sont en anglais ; les trois qu'on rencontre
   sont dits en français, le reste passe tel quel. */
function traduire(m: string | undefined): string {
  if (!m) return "La pièce n'a pas pu être signée.";
  if (/not found/i.test(m)) return "Fichier introuvable dans l'armoire : la pièce n'a pas de fichier à ce chemin.";
  if (/unauthorized|not allowed|permission|row-level security/i.test(m)) return "Vous n'avez pas le droit de lire ce fichier.";
  if (/jwt|expired|token/i.test(m)) return "Session expirée : rechargez la page.";
  return m;
}
