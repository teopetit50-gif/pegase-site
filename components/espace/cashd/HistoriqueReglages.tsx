"use client";

/* CASHD — « Les seuils et les cadences se modifient, et chaque changement reste daté » (03/11/2026).
   La vue public.cashd_historique_reglages (c2_03, lecture ouverte aux comptes du client) relit le journal :
   qui a changé quel réglage, quand. Aucune page ne la montrait ; elle se lit sous « Enregistrer ces réglages ». */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateHeure } from "@/components/espace/format";
import { ilYa } from "@/components/espace/exemples/socle";

type Ligne = { survenu_le: string; action: string; acteur_libelle: string | null; donnees: Record<string, unknown> | null };

const ACTIONS: Record<string, string> = {
  "cashd.reglages": "Réglages des relances",
  "cashd.regler_relances": "Réglages des relances",
  "cashd.gabarit": "Texte de relance",
  "cashd.ecrire_gabarit": "Texte de relance",
  "cashd.plafond": "Plafond d'encours",
  "cashd.fixer_plafond": "Plafond d'encours",
  "cashd.paliers_validation": "Qui valide les relances",
};
const libelleAction = (a: string) => ACTIONS[a] ?? a.replace(/^cashd\./, "").replace(/_/g, " ");
const CHAMPS: Record<string, (v: unknown) => string> = {
  rappel_jours: (v) => `rappel à J+${v}`,
  relance_jours: (v) => `relance ferme à J+${v}`,
  mise_en_demeure_jours: (v) => `mise en demeure à J+${v}`,
  remise_courrier_jours: (v) => `remise du courrier en ${v} j`,
  ton: (v) => `ton ${v}`,
  plafond: (v) => `plafond ${Number(v).toLocaleString("fr-FR")} €`,
  compte: (v) => String(v),
  cle: (v) => `palier ${v}`,
  langue: (v) => `en ${String(v).toUpperCase()}`,
  variante: (v) => `variante ${v}`,
};
const resume = (d: Record<string, unknown> | null) =>
  d
    ? Object.entries(d)
        .filter(([, v]) => v !== null && typeof v !== "object")
        .slice(0, 3)
        .map(([k, v]) => (CHAMPS[k] ? CHAMPS[k](v) : `${k.replace(/_/g, " ")} : ${String(v)}`))
        .join(" · ")
    : "";

const EXEMPLE: Ligne[] = [
  { survenu_le: ilYa(2, 10), action: "cashd.regler_relances", acteur_libelle: "Claire Morel", donnees: { rappel_jours: 7, relance_jours: 21, mise_en_demeure_jours: 30 } },
  { survenu_le: ilYa(9, 16), action: "cashd.ecrire_gabarit", acteur_libelle: "Claire Morel", donnees: { cle: "relance", langue: "fr", variante: 2 } },
  { survenu_le: ilYa(16, 9), action: "cashd.fixer_plafond", acteur_libelle: "Vous", donnees: { compte: "SCI Lefèvre Patrimoine", plafond: 20000 } },
  { survenu_le: ilYa(31, 11), action: "cashd.regler_relances", acteur_libelle: "Vous", donnees: { ton: "courtois", remise_courrier_jours: 2 } },
];

export default function HistoriqueReglages({ source, client }: { source: "exemple" | "reelle"; client: string | null }) {
  const [reel, setReel] = useState<Ligne[] | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !client) return;
    let actif = true;
    createClient()
      .from("cashd_historique_reglages")
      .select("survenu_le, action, acteur_libelle, donnees")
      .eq("client_id", client)
      .order("survenu_le", { ascending: false })
      .limit(20)
      .then(({ data }) => actif && setReel((data ?? []) as Ligne[]));
    return () => {
      actif = false;
    };
  }, [source, client]);
  const lignes = source === "exemple" ? EXEMPLE : (reel ?? []);
  return (
    <>
      <p className="c2-sous">
        <b>Historique des réglages</b>
      </p>
      <p className="c2-sous">Chaque changement de seuil, de cadence ou de texte reste daté, avec son auteur.</p>
      {lignes.length ? (
        <ul className="c2-liste">
          {lignes.map((l, i) => (
            <li key={`${l.survenu_le}-${i}`} className="c2-sous">
              <b>{dateHeure(l.survenu_le)}</b> · {libelleAction(l.action)} · {l.acteur_libelle ?? "CASHD"}
              {resume(l.donnees) ? ` — ${resume(l.donnees)}` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className="c2-sous">{source === "reelle" && reel === null ? "Lecture du journal…" : "Aucun réglage changé pour l'instant."}</p>
      )}
    </>
  );
}
