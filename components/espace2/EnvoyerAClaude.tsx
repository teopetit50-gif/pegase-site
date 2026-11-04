"use client";

/* /espace2/envoyer — donner à Claude les fiches gardées dans ce navigateur
   (04/11/2026, demande de Teo).

   Les appels, entreprises, contacts, tâches et notes d'Espace 2 vivent dans
   le localStorage de l'appareil (voir ./Collection.tsx) : une session Claude
   dans le cloud ne peut pas les lire. Cette page les rassemble en un seul
   texte et le copie ; Teo le colle dans la conversation. Rien n'est envoyé
   nulle part, rien n'est modifié. */

import { useState, useSyncExternalStore } from "react";

const PREFIXE = "espace2-collection-";

function lireTout(): string {
  try {
    const tout: Record<string, unknown> = {};
    for (const cle of Object.keys(localStorage).sort()) {
      if (!cle.startsWith(PREFIXE)) continue;
      const brut = localStorage.getItem(cle) ?? "";
      try {
        tout[cle.slice(PREFIXE.length)] = JSON.parse(brut);
      } catch {
        tout[cle.slice(PREFIXE.length)] = brut;
      }
    }
    return JSON.stringify(tout);
  } catch {
    return "{}";
  }
}

function abonner(rappel: () => void) {
  window.addEventListener("storage", rappel);
  return () => window.removeEventListener("storage", rappel);
}

export default function EnvoyerAClaude() {
  const texte = useSyncExternalStore(abonner, lireTout, () => null);
  const [etat, setEtat] = useState("");

  const collections = texte ? (JSON.parse(texte) as Record<string, unknown>) : {};
  const noms = Object.keys(collections);
  const total = (v: unknown) => (Array.isArray(v) ? v.length : 1);

  async function copier() {
    if (!texte) return;
    try {
      await navigator.clipboard.writeText(texte);
      setEtat("Copié. Collez-le dans la conversation avec Claude.");
    } catch {
      const zone = document.getElementById("envoyer-texte") as HTMLTextAreaElement | null;
      zone?.select();
      setEtat("Copie bloquée : le texte est sélectionné, faites Cmd+C.");
    }
  }

  return (
    <div className="v2-page v2-arrivee" style={{ maxWidth: 720, display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>Envoyer mes fiches à Claude</h1>
      <p style={{ margin: 0, lineHeight: 1.55 }}>
        Vos appels, entreprises, contacts et tâches d’Espace 2 sont gardés dans ce navigateur. Copiez-les ici, puis collez-les dans la conversation avec Claude. Rien n’est envoyé automatiquement et rien n’est modifié.
      </p>

      {texte === null ? null : noms.length === 0 ? (
        <p style={{ margin: 0 }}>
          Aucune fiche dans ce navigateur. Ouvrez cette page sur l’ordinateur et dans le navigateur où vous avez noté vos appels.
        </p>
      ) : (
        <>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {noms.map((n) => (
              <li key={n}>
                {n} : {total(collections[n])} fiche{total(collections[n]) > 1 ? "s" : ""}
              </li>
            ))}
          </ul>
          <div>
            <button type="button" className="v2-btn v2-btn--primaire" onClick={copier}>
              Copier pour Claude
            </button>
          </div>
          {etat ? <p role="status" style={{ margin: 0 }}>{etat}</p> : null}
          <label htmlFor="envoyer-texte" style={{ fontSize: 12, opacity: 0.7 }}>
            Le texte copié
          </label>
          <textarea id="envoyer-texte" readOnly value={texte} rows={6} style={{ width: "100%", fontFamily: "var(--font-v2-code, monospace)", fontSize: 12 }} />
        </>
      )}
    </div>
  );
}
