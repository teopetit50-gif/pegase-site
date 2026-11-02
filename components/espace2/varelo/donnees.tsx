"use client";

/* ══════════════════════════════════════════════════════════════════════
   VARELO — les données partagées des sous-pages de /espace2/varelo
   (02/11/2026, refonte des pages métiers).

   Le référentiel (sociétés, pôles, codes, objets, propositions, lots), le
   rôle de la personne et les gestes du référentiel (proposer, écarter,
   déposer un export, lancer un passage, exporter, installer) viennent du
   crochet de l'écran d'avant (useReferentielVarelo, EcranVarelo.tsx) : une
   seule logique pour l'ancien écran (?ancien=1) et pour les sous-pages.
   Lu une fois par le layout, l'exemple modifié en mémoire suit la personne
   d'une sous-page à l'autre. « C'est fait. » et les erreurs passent en toast.
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect } from "react";
import { useReferentielVarelo, type ReferentielVarelo } from "@/components/espace/varelo/EcranVarelo";
import { useToast } from "../Toasts";

const Contexte = createContext<ReferentielVarelo | null>(null);

export function useVarelo(): ReferentielVarelo {
  const v = useContext(Contexte);
  if (!v) throw new Error("useVarelo hors de DonneesVarelo");
  return v;
}

export default function DonneesVarelo({ children }: { children: React.ReactNode }) {
  const r = useReferentielVarelo();
  const toast = useToast();
  const { fait, setFait, erreur } = r;
  useEffect(() => {
    if (!fait) return;
    toast(`C'est fait. ${fait}`, "vert");
    setFait(null);
  }, [fait, setFait, toast]);
  useEffect(() => {
    if (erreur) toast(`La base réelle n'a pas répondu. ${erreur}`, "rouge");
  }, [erreur, toast]);
  return <Contexte.Provider value={r}>{children}</Contexte.Provider>;
}
