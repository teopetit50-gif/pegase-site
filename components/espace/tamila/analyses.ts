/* ══════════════════════════════════════════════════════════════════════
   Les lectures longues d'un dossier, une fois déchiffrées (06/10/2026,
   session B4, carnet n° 4 ; contrat omega/CONTRAT-ANALYSE.md d'A1)

   Le résultat arrive chiffré sous la clé du dossier ; il se déchiffre
   dans le navigateur (chiffrement.ts) et se lit ici : constats, données
   propres au type, citations (pièce, page, lignes, extrait exact, vérifiée
   ou non). L'export Word et l'impression (PDF) sont composés ici : rien
   ne part au serveur.
   ══════════════════════════════════════════════════════════════════════ */

import { echapper } from "./facture";

export type Citation = { piece: string; page: number; lignes?: [number, number] | number[]; extrait: string; verifiee: boolean; controle?: string };
export type Constat = {
  code: string;
  titre: string;
  texte?: string;
  gravite: "info" | "attention" | "critique";
  donnees?: Record<string, unknown>;
  citations: Citation[];
  source?: boolean;
};
export type ResultatAnalyse = { type: string; statut?: string; resume?: string; constats: Constat[]; pieces_lues?: number; pages_lues?: number; sans_source?: number };

export const TYPES_ANALYSE: Record<string, { libelle: string; aide: string }> = {
  prelecture: { libelle: "Pré-lecture", aide: "Faits, prétentions, moyens et pièces visées, pièce par pièce" },
  chronologie: { libelle: "Chronologie", aide: "Les événements datés, chacun sourcé page et ligne" },
  contradictions: { libelle: "Contradictions", aide: "Ce qu'une pièce affirme et qu'une autre contredit" },
  bordereau: { libelle: "Bordereau", aide: "Les pièces numérotées dans l'ordre chronologique (art. 954 et 768 CPC)" },
};
export const libelleType = (type: string) => TYPES_ANALYSE[type.replace(/^tamila\./, "")]?.libelle ?? type;

const CODES: Record<string, string> = {
  fait: "Fait", pretention: "Prétention", moyen: "Moyen", piece_visee: "Pièce visée", evenement: "Événement", contradiction: "Contradiction", piece: "Pièce",
};
export const libelleCode = (c: string) => CODES[c] ?? c;

/** Le résultat déchiffré, ou null s'il n'a pas la forme attendue. */
export function lireResultat(json: string | null): ResultatAnalyse | null {
  if (!json) return null;
  try {
    const r = JSON.parse(json) as ResultatAnalyse;
    return r && Array.isArray(r.constats) ? r : null;
  } catch {
    return null;
  }
}

const ACTEURS: Record<string, string> = { client: "le client", adverse: "la partie adverse", juge: "la juridiction", expert: "l'expert", tiers: "un tiers" };
const NATURES: Record<string, string> = {
  fait: "fait", acte: "acte", procedure: "procédure", paiement: "paiement", courrier: "courrier", contrat: "contrat", facture: "facture", constat: "constat",
  attestation: "attestation", decision: "décision", conclusions: "conclusions", expertise: "expertise", photo: "photographie", autre: "autre",
};
const nature = (v: unknown) => NATURES[String(v)] ?? String(v);

const dateFr = (iso: unknown) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : null);

/** Une ligne courte des données propres au type (date, acteur, numéro…). */
export function resumeDonnees(type: string, d: Record<string, unknown> | undefined): string | null {
  if (!d) return null;
  const t = type.replace(/^tamila\./, "");
  const parts: string[] = [];
  if (t === "chronologie") {
    const date = dateFr(d.date);
    if (date) parts.push(d.precision === "mois" ? date.slice(3) : d.precision === "annee" ? date.slice(6) : `${d.precision === "environ" ? "vers le " : ""}${date}`);
    if (d.acteur) parts.push(String(d.acteur_libelle ?? ACTEURS[String(d.acteur)] ?? d.acteur));
    if (d.nature) parts.push(nature(d.nature));
  } else if (t === "bordereau") {
    if (d.numero !== undefined) parts.push(`Pièce n° ${d.numero}`);
    if (d.nature) parts.push(nature(d.nature));
    const date = dateFr(d.date);
    if (date) parts.push(date);
    if (d.pages) parts.push(`${d.pages} p.`);
    if (d.deja_communiquee) parts.push("déjà communiquée");
  } else if (t === "contradictions") {
    if (d.sujet) parts.push(String(d.sujet));
    if (d.portee) parts.push(`porte sur : ${d.portee}`);
  } else {
    if (d.partie) parts.push(ACTEURS[String(d.partie)] ?? String(d.partie));
    const date = dateFr(d.date);
    if (date) parts.push(date);
    if (typeof d.montant_cents === "number") parts.push((d.montant_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }));
    if (d.fondement) parts.push(String(d.fondement));
  }
  return parts.length ? parts.join(" · ") : null;
}

export const lignesDe = (c: Citation) => (c.lignes && c.lignes.length ? (c.lignes[0] === c.lignes[c.lignes.length - 1] ? `l. ${c.lignes[0]}` : `l. ${c.lignes[0]}-${c.lignes[c.lignes.length - 1]}`) : "");

/** Le document exportable (Word ou impression) : page autonome, styles en ligne, tout échappé. */
export function htmlAnalyse(r: ResultatAnalyse, nomPiece: (id: string) => string, dossier: { reference: string; intitule: string } | null, le: string): string {
  const titre = `${libelleType(r.type)} — ${dossier?.reference ?? "dossier"}`;
  const bordereau = r.type.endsWith("bordereau");
  const corps = bordereau
    ? `<table style="border-collapse:collapse;width:100%"><thead><tr>${["N°", "Intitulé", "Date", "Nature", "Pages"].map((h) => `<th style="text-align:left;border-bottom:2px solid #111;padding:4px 6px">${h}</th>`).join("")}</tr></thead><tbody>${r.constats
        .map((c) => {
          const d = c.donnees ?? {};
          return `<tr><td style="padding:4px 6px;border-bottom:1px solid #ddd">${echapper(String(d.numero ?? ""))}</td><td style="padding:4px 6px;border-bottom:1px solid #ddd">${echapper(String(d.intitule ?? c.titre))}</td><td style="padding:4px 6px;border-bottom:1px solid #ddd">${echapper(dateFr(d.date) ?? "")}</td><td style="padding:4px 6px;border-bottom:1px solid #ddd">${echapper(d.nature ? nature(d.nature) : "")}</td><td style="padding:4px 6px;border-bottom:1px solid #ddd">${echapper(String(d.pages ?? ""))}</td></tr>`;
        })
        .join("")}</tbody></table>`
    : r.constats
        .map((c) => {
          const meta = resumeDonnees(r.type, c.donnees);
          const cites = [...c.citations].sort((a, b) => Number(b.verifiee) - Number(a.verifiee))
            .map((x) => `<li${x.verifiee ? "" : ' style="color:#777"'}>${echapper(nomPiece(x.piece))}, p. ${x.page}${lignesDe(x) ? `, ${lignesDe(x)}` : ""} : « ${echapper(x.extrait)} »${x.verifiee ? "" : " <i>(non retrouvée dans la pièce : ne vaut pas preuve)</i>"}</li>`)
            .join("");
          return `<h3 style="font-size:14px;margin:16px 0 4px">${echapper(c.titre)}${c.gravite !== "info" ? ` <span style="color:${c.gravite === "critique" ? "#b42318" : "#9a6700"}">(${c.gravite})</span>` : ""}</h3>${meta ? `<div style="color:#555;font-size:12px">${echapper(meta)}</div>` : ""}${c.texte ? `<p style="margin:4px 0">${echapper(c.texte)}</p>` : ""}${cites ? `<ul style="margin:4px 0 0 18px;font-size:12px">${cites}</ul>` : ""}`;
        })
        .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(titre)}</title><style>@page{size:A4;margin:16mm}body{font-family:Georgia,"Times New Roman",serif;font-size:13px;color:#111;line-height:1.45;padding:20px}@media print{body{padding:0}}</style></head><body>
<h1 style="font-size:20px;margin:0">${echapper(titre)}</h1>
<div style="color:#555;margin:4px 0 14px">${echapper(dossier?.intitule ?? "")} · lu le ${echapper(le)} · ${r.pieces_lues ?? 0} pièce(s), ${r.constats.length} constat(s)</div>
${r.resume ? `<p>${echapper(r.resume)}</p>` : ""}${corps}
<p style="margin-top:18px;font-size:11px;color:#666">Lecture assistée : chaque constat renvoie à la pièce, à la page et aux lignes ; l'avocat vérifie avant tout usage.</p>
</body></html>`;
}
