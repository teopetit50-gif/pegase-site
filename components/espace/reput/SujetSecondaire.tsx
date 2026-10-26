"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le sujet secondaire d'une demande (19/10/2026, C3, lot c3_16)

   La demande va au premier service concerné (son sujet) ; le second sujet
   est noté par l'assistant ou par une personne qui traite la demande. S'il
   est routé vers un autre service, ses membres sont prévenus par courriel
   interne, sans contenu client (porte reput_noter_sujet_secondaire).
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Avis, Pastille } from "../ui";
import { noterSujetSecondaire } from "./portes";
import type { Demande, Monde } from "./types";

export default function SujetSecondaire({ demande, monde, traite, source, relire, modifierLocal }: {
  demande: Demande; monde: Monde; traite: boolean; source: "exemple" | "reelle";
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const second = monde.sujets.find((s) => s.code === demande.sujet_secondaire);
  const service = second?.equipe_id ? monde.equipes?.find((e) => e.id === second.equipe_id) : undefined;
  const choix = monde.sujets.filter((s) => s.actif && s.code !== demande.sujet);
  if (!second && !traite) return null;

  const changer = async (code: string) => {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        const r = await noterSujetSecondaire(demande.id, code || null);
        setFait(r?.prevenus ? `Le second service est prévenu (${r.prevenus} personne${r.prevenus > 1 ? "s" : ""}).` : null);
        await relire();
      } else {
        modifierLocal((m) => ({ ...m, demandes: m.demandes.map((d) => (d.id === demande.id ? { ...d, sujet_secondaire: code || null } : d)) }));
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div style={{ marginBottom: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} data-sujet-secondaire>
      {second ? (
        <Pastille contour>Concerne aussi : {second.libelle}{service ? ` · service ${service.nom} prévenu` : ""}</Pastille>
      ) : null}
      {traite ? (
        <label className="esp-kpi-sous" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          {second ? "Changer le second sujet" : "Concerne aussi"}
          <select className="rv-champ" style={{ maxWidth: "100%" }} disabled={envoi} value={demande.sujet_secondaire ?? ""} onChange={(e) => void changer(e.target.value)}>
            <option value="">— aucun autre sujet —</option>
            {choix.map((s) => <option key={s.code} value={s.code}>{s.libelle}</option>)}
          </select>
        </label>
      ) : null}
      {fait ? <span className="esp-kpi-sous">{fait}</span> : null}
      {erreur ? <div style={{ width: "100%" }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
    </div>
  );
}
