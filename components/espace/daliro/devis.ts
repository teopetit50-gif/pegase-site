/* ══════════════════════════════════════════════════════════════════════
   Lire un devis collé depuis Excel ou exporté en CSV (11/10/2026, session B6, b6_28)

   Pur et sans dépendance. Le séparateur se devine (tabulation d'Excel,
   point-virgule des exports français, virgule) ; les colonnes se
   reconnaissent par leur en-tête ; les nombres se lisent à la française
   (« 1 234,56 € »). Une ligne qui n'a qu'un libellé devient le titre de
   section des lignes qui la suivent. Rien n'est envoyé ici : l'écran
   montre l'aperçu, la base contrôle chaque ligne (btp_importer_lignes).
   ══════════════════════════════════════════════════════════════════════ */

export type Colonne = "numero" | "designation" | "unite" | "quantite" | "pu" | "montant" | "lot";
export type LigneLue = {
  rang: number;
  numero: string | null;
  section: string | null;
  designation: string;
  unite: string | null;
  quantite: number | null;
  pu: number | null;
  montant: number | null;
  lot: string | null;
  nature: "ouvrage" | "forfait";
};
export type DevisLu = { colonnes: Partial<Record<Colonne, number>>; lignes: LigneLue[]; ignorees: number; erreur: string | null };

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function colonneDe(entete: string): Colonne | null {
  const e = sansAccent(entete).replace(/[.:]/g, "").replace(/\s+/g, " ");
  if (!e) return null;
  if (/^(lot|lots|corps d.etat)\b/.test(e)) return "lot";
  if (/^(n°|no|n|num|numero|ref|reference|article|poste|code|item)$/.test(e) || /^n° ?(ligne|article|poste)?$/.test(e)) return "numero";
  if (/(designation|libelle|description|ouvrage|intitule|prestation|desc)/.test(e)) return "designation";
  if (/^(u|un|unite|unites|unit|uni)$/.test(e)) return "unite";
  if (/(quantite|qte|qty|quant)/.test(e) || e === "q") return "quantite";
  if (/(prix unitaire|p ?u\b|pu ht|prix u|p\.u|tarif)/.test(e) || e === "pu") return "pu";
  if (/(montant|total|prix total|mt ht|^mt$|^ht$)/.test(e)) return "montant";
  return null;
}

/* Un champ CSV, guillemets doublés compris. */
function couper(ligne: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let entre = false;
  for (let i = 0; i < ligne.length; i++) {
    const ch = ligne[i];
    if (entre) {
      if (ch === '"' && ligne[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') entre = false;
      else cur += ch;
    } else if (ch === '"') entre = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function nombre(brut: string | undefined): number | null {
  if (brut == null) return null;
  let s = brut.replace(/[\s  €]/g, "").replace(/(HT|TTC|EUR)$/i, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function lireDevis(texte: string): DevisLu {
  const lignesBrutes = texte.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (!lignesBrutes.length) return { colonnes: {}, lignes: [], ignorees: 0, erreur: "Rien à lire : collez le tableau du devis ou choisissez un fichier CSV." };
  const echantillon = lignesBrutes.slice(0, 20).join("\n");
  const sep = echantillon.includes("\t") ? "\t" : (echantillon.match(/;/g)?.length ?? 0) >= (echantillon.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rangs = lignesBrutes.map((l) => couper(l, sep));

  // L'en-tête : la première des dix premières lignes où l'on reconnaît la désignation et au moins un chiffre attendu.
  let iEntete = -1;
  let colonnes: Partial<Record<Colonne, number>> = {};
  for (let i = 0; i < Math.min(10, rangs.length) && iEntete < 0; i++) {
    const c: Partial<Record<Colonne, number>> = {};
    rangs[i].forEach((cell, k) => { const col = colonneDe(cell); if (col && c[col] === undefined) c[col] = k; });
    if (c.designation !== undefined && (c.montant !== undefined || c.pu !== undefined || c.quantite !== undefined)) { iEntete = i; colonnes = c; }
  }
  if (iEntete < 0) {
    return { colonnes: {}, lignes: [], ignorees: 0,
             erreur: "Je ne trouve pas la ligne d'en-tête : copiez-la avec le tableau (Désignation, Unité, Quantité, Prix unitaire, Montant)." };
  }
  const cell = (r: string[], c: Colonne) => (colonnes[c] === undefined ? undefined : r[colonnes[c] as number]);
  const lignes: LigneLue[] = [];
  let section: string | null = null;
  let ignorees = 0;
  rangs.slice(iEntete + 1).forEach((r, k) => {
    const designation = (cell(r, "designation") ?? "").trim();
    const quantite = nombre(cell(r, "quantite"));
    const pu = nombre(cell(r, "pu"));
    const montant = nombre(cell(r, "montant"));
    if (!designation) { ignorees++; return; }
    if (/^(sous-?total|total|montant total|total ht|total ttc|tva|net a payer)\b/.test(sansAccent(designation))) { ignorees++; return; }
    if (quantite === null && pu === null && montant === null) { section = designation.slice(0, 200); return; }
    const forfait = quantite === null && pu === null;
    lignes.push({
      rang: iEntete + 2 + k, numero: (cell(r, "numero") ?? "").trim() || null, section,
      designation: designation.slice(0, 2000), unite: (cell(r, "unite") ?? "").trim() || (forfait ? "forfait" : null),
      quantite: forfait ? null : quantite, pu: forfait ? null : pu,
      montant: montant ?? (quantite !== null && pu !== null ? Math.round(quantite * pu * 100) / 100 : null),
      lot: (cell(r, "lot") ?? "").trim() || null, nature: forfait ? "forfait" : "ouvrage",
    });
  });
  return { colonnes, lignes, ignorees, erreur: lignes.length ? null : "Aucune ligne chiffrée sous l'en-tête." };
}

/* Les champs de la porte btp_ecrire_ligne (le socle normalise l'unité lue). */
export function champsPorte(l: LigneLue, lotId: string | null): Record<string, unknown> {
  const c: Record<string, unknown> = { designation: l.designation, nature: l.nature, numero: l.numero, section: l.section, lot_id: lotId,
                                       unite_lue: l.unite, montant_ht: l.montant };
  if (l.nature !== "forfait") { c.quantite = l.quantite; c.prix_unitaire_ht = l.pu; }
  return c;
}
