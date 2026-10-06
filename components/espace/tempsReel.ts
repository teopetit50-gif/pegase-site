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

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* l'état du canal, pour qu'un écran puisse dire « en direct » (06/10/2026) :
   « connexion » tant que le serveur n'a pas accepté l'abonnement,
   « en_direct » quand il l'a accepté (SUBSCRIBED), « coupe » s'il l'a
   refusé, fermé ou laissé expirer — l'écran se relit alors à la main. */
export type EtatTempsReel = "inactif" | "connexion" | "en_direct" | "coupe";

/* canal coupé (un réseau d'entreprise ou un mandataire qui refuse le
   WebSocket, vu dans le conteneur de recette le 06/10) : l'écran se relit
   seul à ce rythme, pour que « sans recharger » reste vrai, en moins vite */
export const RELECTURE_SANS_DIRECT_MS = 30_000;

export function useTempsReel(tables: string[], actif: boolean, onChangement: () => void, delaiMs = 800): EtatTempsReel {
  const [etat, setEtat] = useState<EtatTempsReel>("inactif");
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
    let vivant = true;
    let repli: number | null = null;
    canal.subscribe((statut) => {
      if (!vivant) return;
      const e: EtatTempsReel = statut === "SUBSCRIBED" ? "en_direct" : statut === "CHANNEL_ERROR" || statut === "TIMED_OUT" || statut === "CLOSED" ? "coupe" : "connexion";
      setEtat(e);
      if (e === "coupe" && repli === null) repli = window.setInterval(() => rappel.current(), RELECTURE_SANS_DIRECT_MS);
      if (e === "en_direct" && repli !== null) {
        window.clearInterval(repli);
        repli = null;
      }
    });
    return () => {
      vivant = false;
      if (repli !== null) window.clearInterval(repli);
      if (minuterie) window.clearTimeout(minuterie);
      void supabase.removeChannel(canal);
    };
  }, [actif, cle, delaiMs]);
  /* hors base réelle, le canal n'existe pas : l'état affiché est « inactif » */
  return actif && cle ? etat : "inactif";
}
