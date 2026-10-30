/* L'export tableur de REPUT (06/10/2026, session C3) : les demandes, une ligne
   chacune, en CSV lisible par Excel (séparateur « ; », BOM UTF-8, dates de
   Paris). Rien ne part du navigateur : le fichier est fabriqué sur place. */

import type { Demande, Monde } from "./types";

function cellule(v: unknown): string {
  const t = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

function heureParis(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

/* Le statut en clair (comme private.reput_libelle_statut, c3_32) : jamais le code brut ; une demande regroupée dit avec laquelle. */
const LIBELLES: Record<string, string> = {
  a_preparer: "En préparation", a_valider: "Réponse à valider", a_traiter: "À traiter par une personne", validee: "Validée, en cours d'envoi",
  envoyee: "Répondue", refusee: "Refusée", bloquee: "Bloquée à l'envoi", ignoree: "Écartée (sans réponse à faire)",
};
const CANAUX: Record<string, string> = { email: "courriel", whatsapp: "WhatsApp", sms: "SMS", formulaire: "formulaire du site", appel: "appel manqué" };

export function libelleStatut(d: Demande, m: Monde): string {
  if (d.statut === "ignoree" && d.regroupee_avec) {
    const g = m.demandes.find((x) => x.id === d.regroupee_avec);
    if (g) return `Regroupée avec la demande du ${heureParis(g.recu_le)} (${CANAUX[g.canal] ?? g.canal}${g.de_nom ? `, ${g.de_nom}` : ""})`;
    return "Regroupée avec une autre demande du même client";
  }
  return LIBELLES[d.statut] ?? d.statut;
}

export function csvDemandes(m: Monde): string {
  const entete = ["Reçue le", "Canal", "Client", "Sujet", "Langue", "Urgente", "Tirée de la base", "Statut", "Répondue le", "Délai de réponse (min)",
                  "Délai de traitement dépassé"];
  const lignes = m.demandes.map((d) => {
    const sujet = m.sujets.find((s) => s.code === d.sujet)?.libelle ?? d.sujet ?? "";
    const delai = d.envoyee_le ? Math.max(1, Math.round((new Date(d.envoyee_le).getTime() - new Date(d.recu_le).getTime()) / 60000)) : "";
    return [heureParis(d.recu_le), d.canal, d.de_nom ?? d.adresse_reponse ?? "", sujet, d.langue ?? "", d.urgence ? "oui" : "non",
            d.couverte === null ? "" : d.couverte ? "oui" : "non", libelleStatut(d, m), heureParis(d.envoyee_le), delai, d.escaladee_le ? "oui" : "non"];
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
