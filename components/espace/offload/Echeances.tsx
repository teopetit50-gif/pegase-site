"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les échéances de l'écran (c4_07, 06/10/2026, session C4)

   Ce qui arrive à échéance dans les soixante jours, ce qui est tombé sans
   intervention connue, et les contrats qui s'éteignent faute de
   reconduction. Une échéance réglementaire est marquée comme telle. Le
   message part la semaine qui précède, en validation ; une échéance
   tombée reste en attente, sans seconde relance.
   Lecture : public.offload_echeances_tableau() en base réelle ;
   l'exemple vit ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { dateCourte } from "../format";
import type { Source } from "../source";
import { Chargement, Pastille, Vide, type Teinte } from "../ui";
import { chargerEcheances } from "./portes";
import type { EcheanceLigne } from "./types";

export const STATUTS_ECHEANCE: Record<EcheanceLigne["statut"], { libelle: string; teinte: Teinte }> = {
  a_venir: { libelle: "À venir", teinte: "gris" },
  a_valider: { libelle: "Message à valider", teinte: "ambre" },
  prevenue: { libelle: "Client prévenu", teinte: "bleu" },
  appel: { libelle: "À prévenir par appel", teinte: "ambre" },
  depassee: { libelle: "Tombée, en attente", teinte: "rouge" },
  honoree: { libelle: "Honorée", teinte: "vert" },
  honoree_ailleurs: { libelle: "Faite ailleurs", teinte: "gris" },
  close: { libelle: "Close", teinte: "gris" },
};

function jour(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function echeancesExemple(): EcheanceLigne[] {
  const c1 = "00000000-0000-4000-8c40-000000000001";
  const c2 = "00000000-0000-4000-8c40-000000000002";
  return [
    { id: "e1", type: "entretien", nature: "reglementaire", due_le: jour(4), base_le: jour(4 - 365), statut: "a_valider", s_eteint: false, motif: null,
      compte_id: c2, compte_nom: "Froid Services Ouest", equipement: { id: "q1", ref: "GF-1", designation: "Groupe froid", site: "Entrepôt Nord", type_entretien: "Contrôle d'étanchéité" }, contrat: null },
    { id: "e2", type: "entretien", nature: "commerciale", due_le: jour(12), base_le: jour(12 - 365), statut: "a_venir", s_eteint: false, motif: null,
      compte_id: c1, compte_nom: "Garage Martin", equipement: { id: "q2", ref: "CH-2210", designation: "Chaudière gaz", site: "Atelier", type_entretien: "Entretien annuel" }, contrat: null },
    { id: "e3", type: "entretien", nature: "commerciale", due_le: jour(-6), base_le: jour(-6 - 365), statut: "depassee", s_eteint: false,
      motif: "Échéance tombée sans intervention connue : en attente, sans seconde relance.",
      compte_id: c1, compte_nom: "Garage Martin", equipement: { id: "q3", ref: "CL-0001", designation: "Climatiseur", site: "Bureau", type_entretien: null }, contrat: null },
    { id: "e4", type: "contrat", nature: "commerciale", due_le: jour(25), base_le: null, statut: "a_venir", s_eteint: true,
      motif: "Le contrat CTR-2025-01 s'éteint sans reconduction tacite : il faut le renouveler.",
      compte_id: c2, compte_nom: "Froid Services Ouest", equipement: null, contrat: { id: "k1", numero: "CTR-2025-01", libelle: "Maintenance préventive", reconduction: "expresse" } },
  ];
}

export default function Echeances({ source, onChoisir }: { source: Source; onChoisir: (compte: string) => void }) {
  const [reel, setReel] = useState<EcheanceLigne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const l = await chargerEcheances();
        if (actif) setReel(l);
      } catch (e) {
        if (actif) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); setReel([]); }
      }
    }, 0);
    return () => { actif = false; window.clearTimeout(t); };
  }, [source]);

  const lignes = source === "exemple" ? echeancesExemple() : reel;

  return (
    <section className="esp-carte" aria-label="Échéances et contrats">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Échéances et contrats</h2>
        <span className="esp-kpi-sous">le client est prévenu la semaine qui précède</span>
      </div>
      {erreur ? <div className="esp-carte-corps esp-kpi-sous">{erreur}</div> : null}
      {lignes === null ? (
        <Chargement texte="Lecture des échéances…" />
      ) : lignes.length === 0 ? (
        <Vide titre="Aucune échéance dans les 60 jours">Importez votre parc installé (équipements, interventions, contrats) ou saisissez un équipement depuis la fiche d&apos;un compte.</Vide>
      ) : (
        <ul className="esp-liste" aria-label="Échéances">
          {lignes.map((h) => {
            const s = STATUTS_ECHEANCE[h.statut];
            return (
              <li key={h.id}>
                <button type="button" className="esp-item" onClick={() => onChoisir(h.compte_id)}>
                  <span className="esp-item-haut">
                    <span style={{ fontWeight: 600 }}>{h.compte_nom}</span>
                    {h.type === "contrat" ? <Pastille teinte="rouge" contour>Contrat qui s&apos;éteint</Pastille> : <Pastille teinte={s.teinte}>{s.libelle}</Pastille>}
                    {h.nature === "reglementaire" ? <Pastille teinte="noir" contour>Réglementaire</Pastille> : null}
                  </span>
                  <span className="esp-item-montant">{dateCourte(h.due_le)}</span>
                  <span className="esp-item-titre">
                    {h.equipement
                      ? `${h.equipement.designation} (n° ${h.equipement.ref})${h.equipement.site ? ` — ${h.equipement.site}` : ""}${h.equipement.type_entretien ? ` · ${h.equipement.type_entretien}` : ""}`
                      : h.contrat ? `Contrat ${h.contrat.numero}${h.contrat.libelle ? ` — ${h.contrat.libelle}` : ""}` : "—"}
                  </span>
                  <span className="esp-item-bas">
                    <span>{h.motif ?? (h.base_le ? `Dernière intervention le ${dateCourte(h.base_le)}` : "")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
