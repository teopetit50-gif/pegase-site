"use client";

/* Les données de la portée organisation (vue d'ensemble, activité) : la
   file des validations, les factures et les documents FILED. Sur
   l'exemple, les jeux de components/espace/exemples ; sur la base
   réelle, les mêmes portes que les écrans actuels. `null` = en lecture. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSource } from "@/components/espace/source";
import { DEMANDES_EXEMPLE } from "@/components/espace/exemples/validations";
import { DOSSIERS_EXEMPLE } from "@/components/espace/exemples/filed";
import { vueExemple } from "@/components/espace/filed/EcranFournisseurs";
import { chargerListe, chargerVueFournisseurs, etatPaiement, type EtatPaiement, type VueFournisseurs } from "@/components/espace/filed/portes";
import { chargerFile } from "@/components/espace/validations/portes";
import type { Demande, DossierFiled } from "@/components/espace/types";
import { A_PAYER, etatsExemple, minuit, type Etats } from "./filed/calculs";

export type Doc = { id: string; reference: string; fournisseur: string | null; recu_le: string; etat: string; montant: number | null; devise: string };
/* etats : l'état de paiement de chaque facture à payer (filed_etat_paiement) */
/* dernier : le dossier complet du document le plus récent, pour l'aperçu
   de la vue d'ensemble — sur l'exemple seulement (en base réelle, la pièce
   demande une URL signée : l'aperçu montre alors la fiche sans la page) */
export type Donnees = { vue: VueFournisseurs; etats: Etats; demandes: Demande[]; docs: Doc[]; dernier: DossierFiled | null };

const VIDE: Donnees = { vue: { fournisseurs: [], ibans: [], factures: [], deposants: {} }, etats: {}, demandes: [], docs: [], dernier: null };

export function useDonnees(): { donnees: Donnees | null; erreur: string | null } {
  const { source } = useSource();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const exemple = useMemo<Donnees>(() => {
    const vue = vueExemple();
    return {
      vue,
      etats: etatsExemple(vue.factures, minuit()),
      dernier: DOSSIERS_EXEMPLE.filter((d) => d.facture).sort((a, b) => b.document.recu_le.localeCompare(a.document.recu_le))[0] ?? null,
      demandes: DEMANDES_EXEMPLE,
      docs: DOSSIERS_EXEMPLE.map((d) => ({
        id: d.document.id,
        reference: d.document.reference,
        fournisseur: d.fournisseur?.nom ?? null,
        recu_le: d.document.recu_le,
        etat: d.document.etat,
        montant: d.facture?.montant_ttc ?? null,
        devise: d.facture?.devise ?? "EUR",
      })),
    };
  }, []);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const [vue, file, liste] = await Promise.all([chargerVueFournisseurs(), chargerFile(), chargerListe()]);
      const aLire = vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
      const lus = await Promise.all(aLire.map((f) => etatPaiement(f.id).then((e) => [f.id, e] as const).catch(() => [f.id, null] as const)));
      setReel({
        vue,
        etats: Object.fromEntries(lus.filter((x): x is readonly [string, EtatPaiement] => !!x[1])),
        dernier: null,
        demandes: file.demandes,
        docs: liste.apercus.map((a) => ({
          id: a.document.id,
          reference: a.document.reference,
          fournisseur: a.fournisseur?.nom ?? null,
          recu_le: a.document.recu_le,
          etat: a.document.etat,
          montant: a.facture?.montant_ttc ?? null,
          devise: a.facture?.devise ?? "EUR",
        })),
      });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel(VIDE);
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  return { donnees: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}
