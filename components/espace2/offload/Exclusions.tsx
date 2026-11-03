"use client";

/* OFFLOAD — les listes d'exclusion (03/11/2026). Le site promet « Les listes d'exclusion se tiennent par
   compte, par secteur et par commercial ». La table public.offload_exclusions (c4_05, lecture ouverte aux
   comptes du client) les garde, levées jamais effacées ; aucune page ne la lisait. Carte de droite de la
   page « Comptes à reprendre », au gabarit des autres (CarteDroite, lin-jalons). */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte } from "@/components/espace/format";
import { ilYa } from "@/components/espace/exemples/socle";
import type { Exclusion } from "@/components/espace/offload/types";
import { CarteDroite } from "../lin/Lin";

const TYPES: Record<Exclusion["type"], string> = { compte: "Compte", secteur: "Secteur", commercial: "Commercial", groupe: "Groupe" };

const EXEMPLE: Exclusion[] = [
  { id: "ex-1", type: "compte", valeur: "C004 · Transports Rival", motif: "Litige en cours sur la dernière livraison : on n'écrit pas pendant le litige", cree_le: ilYa(12) },
  { id: "ex-2", type: "secteur", valeur: "Collectivités", motif: "Marchés publics : la reprise passe par l'appel d'offres", cree_le: ilYa(40) },
  { id: "ex-3", type: "commercial", valeur: "Yanis", motif: "Ses comptes sont suivis à la main jusqu'à la fin du trimestre", cree_le: ilYa(5) },
];

export default function ExclusionsOffload({ source }: { source: "exemple" | "reelle" }) {
  const [reel, setReel] = useState<Exclusion[] | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    createClient()
      .from("offload_exclusions")
      .select("id, type, valeur, motif, cree_le")
      .is("levee_le", null)
      .order("cree_le", { ascending: false })
      .limit(50)
      .then(({ data }) => actif && setReel((data ?? []) as Exclusion[]));
    return () => {
      actif = false;
    };
  }, [source]);
  const liste = source === "exemple" ? EXEMPLE : (reel ?? []);
  return (
    <CarteDroite titre="Listes d'exclusion">
      {liste.length ? (
        <ul className="lin-activite">
          {liste.map((x) => (
            <li key={x.id}>
              <span>
                <b>
                  {TYPES[x.type]} · {x.valeur}
                </b>{" "}
                — {x.motif} · depuis le {dateCourte(x.cree_le)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lin-activite-vide">{source === "reelle" && reel === null ? "Lecture des exclusions…" : "Aucun compte, secteur ni commercial exclu de la reprise."}</p>
      )}
    </CarteDroite>
  );
}
