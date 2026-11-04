"use client";

/* FILED, tableau de bord — « Un espace par dossier client », « Vue d'ensemble sur tous les dossiers » (03/11/2026).
   La porte public.filed_vue_ensemble() (a4_52, en production ; sa migration n'est pas dans le dépôt) rend une ligne
   par organisation que la personne connectée suit : pièces du mois, bloquées, en attente, litiges, à payer à
   30 jours. La carte ne s'affiche que s'il y a plus d'un dossier. Exemple : un cabinet qui suit trois dossiers. */

import { useEffect, useState } from "react";
import { dateCourte, montant } from "@/components/espace/format";
import { famille } from "@/components/espace/filed/etats";
import { vueEnsemble, type DossierCabinet, type FactureDuFournisseur } from "@/components/espace/filed/portes";
import type { DossierFiled } from "@/components/espace/types";
import { CarteDroite } from "../lin/Lin";
import { A_PAYER, groupeDe, prevision, type Etats } from "./calculs";

/* 04/11 — la ligne d'Atelier Bertin se calcule sur les documents d'exemple chargés, comme le reste du tableau de
   bord (un même chiffre partout) : pièces des 30 derniers jours, bloquées, en attente d'approbation, à compléter,
   litiges, à payer sous 30 jours (échu compris) et en retard. */
function atelierBertin(dossiers: DossierFiled[], etats: Etats, aujourdhui: Date): Partial<DossierCabinet> {
  const jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()).getTime();
  const factures: FactureDuFournisseur[] = dossiers
    .filter((d) => d.facture)
    .map((d) => ({ ...d.facture!, reference: d.document.reference, nature: d.facture!.nature }) as unknown as FactureDuFournisseur);
  const aPayer = factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir" && etats[f.id]?.etat !== "payee");
  const recus = dossiers.map((d) => d.document.recu_le).sort();
  return {
    pieces_mois: dossiers.filter((d) => new Date(d.document.recu_le).getTime() >= jour - 30 * 86_400_000).length,
    bloquees: factures.filter((f) => f.statut === "bloquee").length,
    attente: factures.filter((f) => f.statut === "a_valider").length,
    a_completer: factures.filter((f) => f.statut === "a_completer").length,
    litiges: dossiers.filter((d) => famille(d.document, d.facture) === "litige").length,
    a_payer_30j: prevision(aPayer, etats, jour).trente,
    en_retard: aPayer.filter((f) => groupeDe(f, jour) === "retard").length,
    dernier_recu_le: recus[recus.length - 1] ?? null,
  };
}

const EXEMPLE = (aujourdhui: Date): DossierCabinet[] => {
  const il = (j: number) => new Date(aujourdhui.getTime() - j * 86_400_000).toISOString();
  return [
    { client_id: "ex-1", organisation: "Atelier Bertin SAS", role: "gerant", epingle: true, rang: 1, pieces_mois: 15, quota: 150, etat_quota: "ok", bloquees: 3, attente: 6, a_completer: 0, litiges: 1, a_payer_30j: 2834.2, en_retard: 1, dernier_recu_le: il(0), erreur: null },
    { client_id: "ex-2", organisation: "Boulangerie Martin", role: "valideur", epingle: true, rang: 2, pieces_mois: 42, quota: 150, etat_quota: "ok", bloquees: 0, attente: 4, a_completer: 1, litiges: 0, a_payer_30j: 6120.5, en_retard: 0, dernier_recu_le: il(1), erreur: null },
    { client_id: "ex-3", organisation: "SCI Lefèvre Patrimoine", role: "lecteur", epingle: false, rang: null, pieces_mois: 7, quota: 150, etat_quota: "ok", bloquees: 1, attente: 0, a_completer: 0, litiges: 0, a_payer_30j: 980, en_retard: 1, dernier_recu_le: il(4), erreur: null },
  ];
};

export default function CabinetFiled({ source, aujourdhui, dossiers: locaux, etats }: { source: "exemple" | "reelle"; aujourdhui: Date; dossiers?: DossierFiled[]; etats?: Etats }) {
  const [reel, setReel] = useState<DossierCabinet[]>([]);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    vueEnsemble()
      .then((x) => actif && setReel(x ?? []))
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [source]);
  const exemple = EXEMPLE(aujourdhui).map((d) => (d.client_id === "ex-1" && locaux ? ({ ...d, ...atelierBertin(locaux, etats ?? {}, aujourdhui) } as DossierCabinet) : d));
  const dossiers = (source === "exemple" ? exemple : reel).slice().sort((a, b) => Number(b.epingle) - Number(a.epingle) || (a.rang ?? 99) - (b.rang ?? 99) || a.organisation.localeCompare(b.organisation));
  if (dossiers.length < 2) return null;
  return (
    <CarteDroite titre={`Vos dossiers · ${dossiers.length}`}>
      <ul className="lin-activite">
        {dossiers.map((d) => (
          <li key={d.client_id}>
            <span>
              <b>
                {d.epingle ? "★ " : ""}
                {d.organisation}
              </b>{" "}
              · {d.pieces_mois} pièce{d.pieces_mois > 1 ? "s" : ""} ce mois
              {d.bloquees ? ` · ${d.bloquees} bloquée${d.bloquees > 1 ? "s" : ""}` : ""}
              {d.attente ? ` · ${d.attente} en attente` : ""}
              {d.litiges ? ` · ${d.litiges} litige${d.litiges > 1 ? "s" : ""}` : ""}
              {` · ${montant(Number(d.a_payer_30j))} à payer sous 30 j`}
              {d.en_retard ? ` dont ${d.en_retard} en retard` : ""}
              {d.dernier_recu_le ? ` · dernier reçu le ${dateCourte(d.dernier_recu_le)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </CarteDroite>
  );
}
