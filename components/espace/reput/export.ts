/* L'export tableur de REPUT (06/10/2026, session C3) : les demandes, une ligne
   chacune, en CSV lisible par Excel (séparateur « ; », BOM UTF-8, dates de
   Paris). Rien ne part du navigateur : le fichier est fabriqué sur place. */

import type { Monde } from "./types";

function cellule(v: unknown): string {
  const t = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function heureParis(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function csvDemandes(m: Monde): string {
  const entete = ["Reçue le", "Canal", "Client", "Sujet", "Langue", "Urgente", "Tirée de la base", "Statut", "Répondue le", "Délai de réponse (min)",
                  "Délai de traitement dépassé"];
  const lignes = m.demandes.map((d) => {
    const sujet = m.sujets.find((s) => s.code === d.sujet)?.libelle ?? d.sujet ?? "";
    const delai = d.envoyee_le ? Math.max(1, Math.round((new Date(d.envoyee_le).getTime() - new Date(d.recu_le).getTime()) / 60000)) : "";
    return [heureParis(d.recu_le), d.canal, d.de_nom ?? d.adresse_reponse ?? "", sujet, d.langue ?? "", d.urgence ? "oui" : "non",
            d.couverte === null ? "" : d.couverte ? "oui" : "non", d.statut, heureParis(d.envoyee_le), delai, d.escaladee_le ? "oui" : "non"];
  });
  return "﻿" + [entete, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
}

export function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
