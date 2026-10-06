"use server";

/* ══════════════════════════════════════════════════════════════════════
   /espace/daliro — l'URL signée d'une photo ou d'un vocal du chantier
   (06/10/2026, session B6, b6_24)

   Les médias reçus par WhatsApp (réception d'A2) vivent dans le bucket
   Storage `omega-clients`, privé, sous <client>/receptions/… . L'URL
   signée est fabriquée ici avec le client serveur qui porte la session de
   la personne : Storage applique ses règles, une personne ne signe que ce
   qu'elle a le droit de lire. Dix minutes de validité. Même mécanique que
   l'écran FILED (app/espace/filed/actions.ts), gardée à part pour que les
   deux écrans évoluent chacun de leur côté.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";

export async function urlSigneeMedia(chemin: string): Promise<{ url: string } | { erreur: string }> {
  if (!chemin || chemin.length > 1024 || chemin.includes("..") || !/^[0-9a-f-]{36}\/receptions\//.test(chemin)) {
    return { erreur: "Chemin de média invalide." };
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return { erreur: "Aucune session ouverte." };
  const { data, error } = await supabase.storage.from("omega-clients").createSignedUrl(chemin, 600);
  if (error || !data?.signedUrl) {
    const m = error?.message ?? "";
    if (/not found/i.test(m)) return { erreur: "Fichier introuvable : le média n'a pas été déposé." };
    if (/unauthorized|not allowed|permission|row-level security/i.test(m)) return { erreur: "Vous n'avez pas le droit de lire ce fichier." };
    if (/jwt|expired|token/i.test(m)) return { erreur: "Session expirée : rechargez la page." };
    return { erreur: m || "Le média n'a pas pu être signé." };
  }
  return { url: data.signedUrl };
}
