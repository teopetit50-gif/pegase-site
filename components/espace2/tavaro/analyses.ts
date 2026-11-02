"use client";

/* TAVARO — les analyses du matin et le plan de flotte, lus comme dans
   l'écran d'avant (components/espace/tavaro/AnalysesParc, code repris
   ligne pour ligne) : l'exemple (analyses-exemple.ts, le contrôle et la
   cote s'y notent en mémoire) ou la base réelle (analyses.ts, rien sans
   compte). Servi à la vue d'ensemble (B38-B42) et à Réseau et flotte
   (B43, B44). */

import { useCallback, useEffect, useState } from "react";
import { ANALYSES_EXEMPLE } from "@/components/espace/tavaro/analyses-exemple";
import { chargerAnalyses, noterControle, noterCote, type Analyses, type Conformite, type ContratRisque, type SourceCote, type VehiculePlan } from "@/components/espace/tavaro/analyses";
import type { Moi } from "@/components/espace/tavaro/portes";
import type { Role } from "@/components/espace/tavaro/types";

export function useAnalyses(source: "exemple" | "reelle", moi: Moi | null, role: Role | null) {
  const [local, setLocal] = useState<Analyses>(ANALYSES_EXEMPLE);
  const [reel, setReel] = useState<Analyses | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  /* les dates de l'exemple suivent l'horloge du navigateur : rien n'est rendu côté serveur (pas d'écart à l'hydratation) */
  const [monte, setMonte] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMonte(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  const direction = role === "gerant" || role === "admin";
  const peutNoter = role !== null && role !== "lecteur";

  const charger = useCallback(async () => {
    if (source !== "reelle" || !moi) return;
    const r = await chargerAnalyses(moi.client_id, moi.role === "gerant" || moi.role === "admin");
    setReel(r.analyses);
    setErreurs(r.erreurs);
  }, [source, moi]);
  useEffect(() => {
    const t = window.setTimeout(() => { void charger(); }, 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const noter = useCallback(async (c: ContratRisque, identite: Conformite, permis: Conformite, recent: boolean | null) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        if (!prev.contrats) return prev;
        const contrats = prev.contrats.contrats.map((x) => {
          if (x.contrat_id !== c.contrat_id) return x;
          const raisons = x.raisons.filter((r) => r !== "pièces pas encore contrôlées" && r !== "pièce d'identité ou permis non conforme" && r !== "permis de moins de trois ans");
          if (identite === "non_conforme" || permis === "non_conforme") raisons.unshift("pièce d'identité ou permis non conforme");
          if (recent) raisons.push("permis de moins de trois ans");
          const score = x.score - (x.raisons.includes("pièces pas encore contrôlées") ? 1 : 0) - (x.raisons.includes("pièce d'identité ou permis non conforme") ? 3 : 0)
            - (x.raisons.includes("permis de moins de trois ans") ? 2 : 0) + (identite === "non_conforme" || permis === "non_conforme" ? 3 : 0) + (recent ? 2 : 0);
          const ko = identite === "non_conforme" || permis === "non_conforme";
          return { ...x, raisons, score, niveau: score >= 4 ? "fort" as const : "moyen" as const,
            controle: { identite, permis, permis_recent: recent, le: new Date().toISOString() },
            action: ko ? "Ne pas remettre les clés sans pièces conformes" : x.action === "Contrôler la pièce d'identité et le permis" ? "Appeler le client la veille du retour" : x.action };
        });
        return { ...prev, contrats: { a_risque: contrats.filter((x) => x.niveau === "fort").length, contrats } };
      });
      return;
    }
    await noterControle(c.contrat_id, identite, permis, recent);
    await charger();
  }, [source, charger]);

  /* b3t_05 : la cote d'un véhicule du plan ; en exemple, en mémoire */
  const noterUneCote = useCallback(async (v: VehiculePlan, valeur: number, src: SourceCote) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        if (!prev.plan) return prev;
        const jour = new Date().toISOString().slice(0, 10);
        const agences = prev.plan.agences.map((ag) => ({ ...ag, categories: ag.categories.map((l) => {
          if (!l.vehicules?.some((x) => x.vehicule_id === v.vehicule_id)) return l;
          const vehicules = l.vehicules.map((x) => x.vehicule_id !== v.vehicule_id ? x : {
            ...x, cote_eur: valeur, cote_source: src, cote_le: jour, cote_ancienne: false,
            raison: x.raison.split(" ; ").filter((r) => r !== "cote de revente à noter").join(" ; "),
          });
          return { ...l, vehicules, valeur_revente_eur: vehicules.filter((x) => x.decision === "vendre").reduce((n, x) => n + (x.cote_eur ?? 0), 0) };
        }) }));
        const tous = agences.flatMap((ag) => ag.categories);
        return { ...prev, plan: { ...prev.plan, agences, totaux: { ...prev.plan.totaux,
          valeur_revente_a_vendre_eur: tous.reduce((n, l) => n + (l.valeur_revente_eur ?? 0), 0),
          cotes_manquantes: tous.flatMap((l) => l.vehicules ?? []).filter((x) => x.cote_eur === null).length } } };
      });
      return;
    }
    await noterCote(v.vehicule_id, valeur, src);
    await charger();
  }, [source, charger]);

  const a = source === "exemple" ? local : reel;
  /* rien côté serveur, rien en base réelle sans compte (AnalysesParc.tsx:261) */
  const visibles = monte && !(source === "reelle" && !moi);
  return { analyses: visibles ? a : null, visibles, erreurs, direction, peutNoter, noter, noterUneCote };
}
