/* ══════════════════════════════════════════════════════════════════════
   Les décisions à valider — VARELO (11/10/2026, B1, migration b1_15)

   Dénoncer un contrat, protester auprès d'un transporteur, relever un
   plafond d'encours : chaque décision se propose avec son calcul, part
   dans la file de validation du socle vers sa direction (juridique,
   opérations, financière) et s'exécute à la décision. Formes décalquées
   de public.grp_decisions et de la porte grp_proposer_decision.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Source } from "../source";
import { ErreurPorte } from "./portes";

export type GenreDecision = "denoncer_contrat" | "protester_reception" | "relever_plafond";
export type StatutDecision = "en_attente" | "approuvee" | "rejetee" | "expiree" | "annulee" | "executee" | "echec";
export type Decision = {
  id: string;
  genre: GenreDecision;
  objet_id: string;
  demande_id: string | null;
  statut: StatutDecision;
  resume: string;
  calcul: string;
  echeance: string | null;
  motif: string | null;
  propose_le: string;
};

export const DIRECTION: Record<GenreDecision, string> = {
  denoncer_contrat: "direction juridique",
  protester_reception: "direction des opérations",
  relever_plafond: "direction financière",
};

/* la pastille d'une décision sur sa ligne (contrat, livraison, client) */
export function etiquetteDecision(d: Decision): { libelle: string; teinte: "ambre" | "vert" | "gris" | "rouge" } {
  switch (d.statut) {
    case "en_attente":
      return { libelle: `En validation (${DIRECTION[d.genre]})`, teinte: "ambre" };
    case "approuvee":
      return { libelle: d.genre === "denoncer_contrat" ? "Dénonciation validée : à envoyer" : "Protestation validée : à envoyer", teinte: "vert" };
    case "executee":
      return { libelle: "Validé et appliqué", teinte: "vert" };
    case "rejetee":
      return { libelle: d.genre === "denoncer_contrat" ? "Reconduction acceptée" : "Refusé par la direction", teinte: "gris" };
    case "echec":
      return { libelle: "Validé, non appliqué", teinte: "rouge" };
    default:
      return { libelle: "Demande close", teinte: "gris" };
  }
}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

export async function chargerDecisions(client_id: string): Promise<Decision[]> {
  const { data, error } = await createClient()
    .from("grp_decisions")
    .select("id, genre, objet_id, demande_id, statut, resume, calcul, echeance, motif, propose_le")
    .eq("client_id", client_id)
    .order("propose_le", { ascending: false })
    .limit(1000);
  if (error) throw new ErreurPorte(message(error));
  return (data ?? []) as Decision[];
}

export async function proposerDecision(client_id: string, genre: GenreDecision, objet_id: string, details: Record<string, unknown> = {}) {
  const { data, error } = await createClient().rpc("grp_proposer_decision", { p_client: client_id, p_genre: genre, p_objet: objet_id, p_details: details });
  if (error) throw new ErreurPorte(message(error));
  return data as { decision: string; demande: string | null; statut: string; deja: boolean };
}

/* La dernière décision de chaque objet, et proposer. L'exemple garde ses décisions en mémoire. */
export function useDecisions(source: Source, client_id: string, actif: boolean) {
  const [locales, setLocales] = useState<Decision[]>([]);
  const [reelles, setReelles] = useState<Decision[]>([]);
  const relire = useCallback(async () => {
    try {
      setReelles(await chargerDecisions(client_id));
    } catch {
      setReelles([]);
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !actif) return;
    const t = window.setTimeout(() => void relire(), 0);
    return () => window.clearTimeout(t);
  }, [source, actif, relire]);

  const toutes = source === "exemple" ? locales : reelles;
  const parObjet = useMemo(() => {
    const m = new Map<string, Decision>();
    for (const d of [...toutes].sort((a, b) => a.propose_le.localeCompare(b.propose_le))) m.set(`${d.genre}:${d.objet_id}`, d);
    return m;
  }, [toutes]);

  const proposer = useCallback(
    async (genre: GenreDecision, objet_id: string, resume: string, calcul: string, echeance: string | null, details: Record<string, unknown> = {}) => {
      if (source === "reelle") {
        const r = await proposerDecision(client_id, genre, objet_id, details);
        await relire();
        return r.deja;
      }
      await new Promise((x) => setTimeout(x, 300));
      const deja = locales.some((d) => d.genre === genre && d.objet_id === objet_id && d.statut === "en_attente");
      if (!deja) {
        setLocales((p) => [...p, { id: `exemple-${Date.now()}`, genre, objet_id, demande_id: null, statut: "en_attente", resume, calcul, echeance, motif: null, propose_le: new Date().toISOString() }]);
      }
      return deja;
    },
    [source, client_id, relire, locales],
  );

  return { decisionDe: (genre: GenreDecision, objet_id: string) => parObjet.get(`${genre}:${objet_id}`) ?? null, proposer };
}
