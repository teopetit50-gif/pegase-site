"use client";

/* Les compteurs des modules dans la barre latérale (06/10/2026, C1).

   VARELO : le nombre de lignes « attention » ou « critique » du point du
   matin du groupe — la même porte que le bloc « Ce matin » de l'écran
   (rpc grp_ce_matin, au périmètre de la personne) ; sur l'exemple, le
   même compte tiré des données d'exemple (compterCeMatinExemple, B1). */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSource } from "@/components/espace/source";
import { chargerContexte } from "@/components/espace/varelo/portes";
import { compterCeMatinExemple } from "@/components/espace/varelo/matin";

type Ligne = { gravite?: string };

export function useCompteurs(): Record<string, number> {
  const { source } = useSource();
  const [varelo, setVarelo] = useState<number | null>(null);
  const [exemple] = useState(compterCeMatinExemple);

  useEffect(() => {
    if (source !== "reelle") return;
    let vivant = true;
    (async () => {
      try {
        const { client_id } = await chargerContexte();
        const { data, error } = await createClient().rpc("grp_ce_matin", { p_client: client_id });
        if (error || !data) return;
        const lignes = Object.values(data as Record<string, Ligne[]>).flat();
        if (vivant) setVarelo(lignes.filter((l) => l.gravite === "attention" || l.gravite === "critique").length);
      } catch {
        /* sans compte VARELO, pas de compteur */
      }
    })();
    return () => {
      vivant = false;
    };
  }, [source]);

  const n = source === "reelle" ? varelo : exemple;
  return n ? { varelo: n } : {};
}
