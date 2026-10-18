/* ══════════════════════════════════════════════════════════════════════
   Le bordereau de communication de pièces (15/10/2026, session B4)

   Composé dans le navigateur : la référence, les parties et les noms de
   pièces sont déchiffrés ici et ne repartent pas. Les pièces sont
   numérotées dans l'ordre choisi à l'écran (par défaut, celui du dépôt).
   ══════════════════════════════════════════════════════════════════════ */

import { echapper } from "./facture";
import type { EnteteFacture } from "./types";

export type DonneesBordereau = {
  entete: EnteteFacture;
  dossier: { reference: string; intitule: string; numero_rg: string | null; juridiction: string | null };
  /** les noms en clair : le client d'abord, puis les parties adverses */
  pour: string[];
  contre: string[];
  pieces: { nom: string; le: string | null }[];
  /** la date du bordereau, AAAA-MM-JJ */
  le: string;
};

const date = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "");
/** « contrat-bail.pdf » → « contrat-bail » : l'intitulé de la pièce sans son extension */
export const intitulePiece = (nom: string) => nom.replace(/\.[A-Za-z0-9]{1,5}$/, "").replace(/[_]+/g, " ").trim() || nom;

export function htmlBordereau(x: DonneesBordereau): string {
  const e = x.entete;
  const cabinet = [e.nom, e.forme].filter(Boolean).join(", ");
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e5e5e5;vertical-align:top"';
  const lignes = x.pieces.map((p, i) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e5e5;white-space:nowrap;vertical-align:top">Pièce n° ${i + 1}</td><td ${td}>${echapper(intitulePiece(p.nom))}</td></tr>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echapper(`Bordereau de pièces — ${x.dossier.reference}`)}</title>
<style>@page{size:A4;margin:16mm}body{font-family:Georgia,"Times New Roman",serif;color:#111;font-size:12.5px;line-height:1.45;margin:0;padding:24px}
@media print{body{padding:0}}h1{font-size:18px;margin:24px 0 12px;text-align:center;text-transform:uppercase;letter-spacing:.04em}table{border-collapse:collapse;width:100%}.petit{font-size:11px;color:#444}</style></head><body>
<div style="font-weight:700">${echapper(cabinet || "Cabinet")}</div>
${e.adresse ? `<div>${echapper(e.adresse)}</div>` : ""}${e.code_postal_ville ? `<div>${echapper(e.code_postal_ville)}</div>` : ""}
${e.barreau ? `<div>Avocat${e.forme ? "s" : ""} au barreau de ${echapper(e.barreau)}${e.toque ? ` — toque ${echapper(e.toque)}` : ""}</div>` : ""}
<div style="margin-top:20px">${echapper(x.dossier.juridiction ?? "")}${x.dossier.numero_rg ? `<br>RG n° ${echapper(x.dossier.numero_rg)}` : ""}</div>
<h1>Bordereau de communication de pièces</h1>
<p><strong>Pour</strong> : ${echapper(x.pour.join(", ") || "—")}<br><strong>Contre</strong> : ${echapper(x.contre.join(", ") || "—")}</p>
<p class="petit">Dossier ${echapper(x.dossier.reference)} — ${echapper(x.dossier.intitule)}</p>
<table><thead><tr><th style="text-align:left;padding:6px 8px;border-bottom:2px solid #111;width:110px">N°</th><th style="text-align:left;padding:6px 8px;border-bottom:2px solid #111">Pièce</th></tr></thead>
<tbody>${lignes || `<tr><td ${td} colspan="2">Aucune pièce choisie.</td></tr>`}</tbody></table>
<p style="margin-top:28px">Fait le ${date(x.le)}.</p>
</body></html>`;
}
