"use client";

/* REPUT — « La base est versionnée : chaque règle porte sa date et son auteur » (03/11/2026).
   reput_connaissances porte cree_par et valide_par (c3_01) ; le nom se lit dans l'annuaire du client
   (rpc annuaire, celle de la page Équipe). En exemple, les personnes de l'atelier. */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSource } from "@/components/espace/source";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { monClient } from "@/components/espace/reput/portes";

export function useNoms(): (id: string | null | undefined) => string | null {
  const { source } = useSource();
  const [noms, setNoms] = useState<Record<string, string>>({});
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    (async () => {
      const c = await monClient();
      if (!c) return;
      const { data } = await createClient().rpc("annuaire", { p_client: c.client_id });
      if (actif) setNoms(Object.fromEntries(((data ?? []) as { user_id: string; nom: string }[]).map((x) => [x.user_id, x.nom])));
    })().catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [source]);
  return (id) => (!id ? null : source === "exemple" ? nomPersonne(id) : (noms[id] ?? null));
}
