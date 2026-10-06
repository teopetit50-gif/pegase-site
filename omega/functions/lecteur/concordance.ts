// Factur-X : le XML joint fait foi, mais la facture que l'on voit est le PDF. Chaque valeur clé lue dans le
// XML est recherchée dans le texte natif des pages ; retrouvée, elle reçoit sa page et sa boîte (l'écran la
// montre sur la pièce) ; introuvable, la divergence est notée, sans rien changer à la valeur du XML.
// Une absence n'est pas une preuve d'erreur (mise en forme inattendue) : on dit « non retrouvée ».

import type { PageLue, ValeurLue } from "@partage/portes.ts";
import { retrouver } from "@partage/texte.ts";
import { boiteDe, type PagePdf } from "./pdf.ts";

/** Les champs comparés : ceux qu'un lecteur humain contrôle d'un coup d'œil. */
export const CHAMPS_COMPARES = [
  "numero",
  "date",
  "echeance",
  "montant_ht",
  "montant_tva",
  "montant_ttc",
  "net_a_payer",
  "fournisseur.siren",
  "fournisseur.siret",
  "fournisseur.tva",
  "fournisseur.iban",
  "commande.reference",
] as const;

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Les formes imprimées plausibles d'une valeur du XML. */
export function formesImprimees(champ: string, valeur: unknown): string[] {
  if (typeof valeur === "number") {
    if (valeur === 0) return [];
    const a = Math.abs(valeur);
    const [ent, dec] = a.toFixed(2).split(".");
    const grouper = (sep: string) => ent.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const formes = new Set([`${ent},${dec}`, `${ent}.${dec}`, `${grouper(" ")},${dec}`, `${grouper(".")},${dec}`, `${grouper(",")}.${dec}`]);
    if (dec === "00") formes.add(grouper(" "));
    return [...formes];
  }
  if (typeof valeur !== "string" || valeur.trim() === "") return [];
  const iso = valeur.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso && (champ === "date" || champ === "echeance")) {
    const [, a, m, j] = iso;
    const jn = String(Number(j));
    return [`${j}/${m}/${a}`, `${j}.${m}.${a}`, `${j}-${m}-${a}`, `${a}-${m}-${j}`, `${j}/${m}/${a.slice(2)}`, `${jn} ${MOIS[Number(m) - 1]} ${a}`];
  }
  return [valeur];
}

export interface Concordance {
  valeurs: ValeurLue[];
  /** Les champs du XML non retrouvés dans le PDF visible. */
  divergences: string[];
}

/** Rapproche les valeurs du XML du texte natif du PDF. Sans texte natif (PDF image), rien n'est comparé. */
export function concorder(valeurs: ValeurLue[], pages: PageLue[], pagesPdf: PagePdf[]): Concordance {
  const avecTexte = pages.filter((p) => p.texte.replace(/\s+/g, "").length >= 20);
  if (avecTexte.length === 0) return { valeurs, divergences: [] };
  const pdfParNumero = new Map(pagesPdf.map((p) => [p.n, p]));
  const divergences: string[] = [];
  const sortie = valeurs.map((v) => {
    if (!(CHAMPS_COMPARES as readonly string[]).includes(v.champ)) return v;
    const formes = formesImprimees(v.champ, v.valeur);
    if (formes.length === 0) return v;
    for (const p of avecTexte) {
      const forme = formes.find((f) => retrouver(f, p.texte).trouve);
      if (forme) {
        const pdf = pdfParNumero.get(p.n);
        const boite = pdf ? boiteDe(pdf, forme) ?? undefined : undefined;
        return { ...v, page: p.n, boite, controle: `${v.controle ?? ""} ; concorde avec le PDF page ${p.n}`.slice(0, 300) };
      }
    }
    divergences.push(v.champ);
    return { ...v, controle: `${v.controle ?? ""} ; non retrouvée dans le PDF visible (le XML fait foi)`.slice(0, 300) };
  });
  return { valeurs: sortie, divergences };
}
