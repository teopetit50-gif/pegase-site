"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — les données des pages de fonction (21/10/2026)

   Les pages « Balance âgée », « Litiges et pauses », « Risque client »,
   « Devis sans réponse » et « Encaissements » lisent le même tableau que
   le tableau de bord (TableauCashd) : l'exemple (tableauDe sur
   FICHES_EXEMPLE) ou la base réelle (cashd_tableau, par portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useSource } from "@/components/espace/source";
import { tableauDe } from "@/components/espace/cashd/calcul";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import * as portes from "@/components/espace/cashd/portes";
import type { Tableau } from "@/components/espace/cashd/types";

export function useTableauCashd(): { tableau: Tableau | null; erreur: string | null } {
  const { source } = useSource();
  const [reel, setReel] = useState<Tableau | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const c = await portes.monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const tableau = await portes.chargerTableau(c.client_id);
        if (actif) setReel(tableau);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const exemple = useMemo(() => tableauDe(FICHES_EXEMPLE, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, SANS_COMPTE_EXEMPLE), []);

  return { tableau: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

/* la fiche d'un compte, dans l'écran de travail (EcranCashd lit ?compte=) */
export const lienCompte = (id: string) => `/espace2/cashd/suivi?vue=debiteurs&compte=${encodeURIComponent(id)}`;
