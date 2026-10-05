"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le temps réel des écrans client (05/10/2026)

   Un canal Supabase Realtime (postgres_changes) par écran, sur les tables
   qu'il montre, ouvert seulement en base réelle : à chaque changement
   (insert, update, delete, filtré par RLS côté serveur), l'écran relit —
   avec un délai de regroupement, pour qu'une rafale d'écritures (une
   approbation qui fait avancer la demande, puis l'exécute) ne déclenche
   qu'une lecture.

   Si une table n'est pas dans la publication supabase_realtime, le canal
   s'abonne sans erreur et rien n'arrive : l'écran marche comme avant, à la
   main. Les tables à publier sont listées dans omega/NOTES-A3.md
   (demande au coordinateur).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTempsReel(tables: string[], actif: boolean, onChangement: () => void, delaiMs = 800) {
  /* la dernière fonction de relecture, sans rouvrir le canal quand elle change */
  const rappel = useRef(onChangement);
  useEffect(() => {
    rappel.current = onChangement;
  }, [onChangement]);
  const cle = tables.join(",");

  useEffect(() => {
    if (!actif || !cle) return;
    const supabase = createClient();
    let minuterie: number | null = null;
    const canal = supabase.channel(`espace-${cle.replace(/[^a-z_]/g, "-")}-${Math.random().toString(16).slice(2, 8)}`);
    for (const table of cle.split(",")) {
      canal.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (minuterie) window.clearTimeout(minuterie);
        minuterie = window.setTimeout(() => {
          minuterie = null;
          rappel.current();
        }, delaiMs);
      });
    }
    canal.subscribe();
    return () => {
      if (minuterie) window.clearTimeout(minuterie);
      void supabase.removeChannel(canal);
    };
  }, [actif, cle, delaiMs]);
}
