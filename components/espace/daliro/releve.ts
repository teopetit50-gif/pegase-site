/* ══════════════════════════════════════════════════════════════════════
   Le relevé d'un chantier (15/10/2026, session B6)

   La promesse de l'audit (/secteurs/btp) : « Nous examinons les devis, le
   planning et les échanges d'un ou deux chantiers en cours. Vous repartez
   avec ce que nous y avons relevé. » Pur : calculé sur le tableau du
   chantier (le même en exemple et en base réelle), sans rien écrire.
   Les montants restent cachés à qui ne voit pas les prix.
   ══════════════════════════════════════════════════════════════════════ */

import type { Tableau } from "./types";

export type LigneReleve = { texte: string; gravite?: "bloquant" | "attention" | "info" };
export type SectionReleve = { titre: string; lignes: LigneReleve[] };

const eur = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
const jj = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

export function releveChantier(t: Tableau, aujourdhui: string): SectionReleve[] {
  const prix = t.voit_prix;
  const m = (v: number) => (prix ? ` (${eur(v)} HT)` : "");
  const sections: SectionReleve[] = [];

  // Le marché
  const marche = t.marches.find((x) => x.statut === "verifie") ?? t.marches[0];
  const lm: LigneReleve[] = [];
  if (!marche) lm.push({ texte: "Aucun marché saisi : les travaux en plus ne peuvent pas être chiffrés sur ses prix.", gravite: "bloquant" });
  else {
    lm.push({ texte: `Marché ${marche.reference ?? "sans référence"} : ${pluriel(marche.lignes.length, "ligne", "lignes")}${prix && marche.total_ht_lignes != null ? `, ${eur(marche.total_ht_lignes)} HT` : ""}${marche.statut === "verifie" ? ", vérifié" : ", à vérifier"}.`,
              gravite: marche.statut === "verifie" ? "info" : "attention" });
    const bloquants = marche.controles.filter((k) => k.bloquant);
    if (bloquants.length) lm.push({ texte: `${pluriel(bloquants.length, "contrôle bloque", "contrôles bloquent")} la vérification : ${bloquants.slice(0, 3).map((k) => k.message ?? k.code).join(" ; ")}.`, gravite: "bloquant" });
    const ecarts = marche.lignes.filter((l) => l.controle === "montant_faux" && !l.ecart_accepte);
    if (ecarts.length) lm.push({ texte: `${pluriel(ecarts.length, "ligne a", "lignes ont")} un montant qui ne vaut pas quantité × prix unitaire.`, gravite: "attention" });
    const acceptes = marche.lignes.filter((l) => l.ecart_accepte);
    if (acceptes.length) lm.push({ texte: `${pluriel(acceptes.length, "écart accepté", "écarts acceptés")} avec motif.`, gravite: "info" });
  }
  sections.push({ titre: "Le marché", lignes: lm });

  // Les travaux en plus
  const av = t.avenants;
  const la: LigneReleve[] = [];
  const reperes = av.filter((a) => a.origine?.lecteur === true || a.origine?.canal === "reception");
  const signes = av.filter((a) => a.statut === "signe");
  const sansLigne = av.filter((a) => a.statut === "brouillon" && a.nb_lignes === 0);
  const vieux = av.filter((a) => (a.statut === "brouillon" || a.statut === "soumis") && a.cree_le.slice(0, 10) <= plusJours(aujourdhui, -14));
  const perdus = av.filter((a) => a.statut === "refuse" || a.statut === "abandonne");
  const total = (xs: typeof av) => xs.reduce((s, a) => s + (a.montant_ht ?? 0), 0);
  la.push({ texte: `${pluriel(av.length, "avenant", "avenants")}, dont ${pluriel(signes.length, "signé", "signés")}${m(total(signes))}.`, gravite: "info" });
  if (reperes.length) la.push({ texte: `${pluriel(reperes.length, "travail repéré", "travaux repérés")} par Daliro (photos, vocaux, réserves)${m(total(reperes))}.`, gravite: "info" });
  if (sansLigne.length) la.push({ texte: `${pluriel(sansLigne.length, "avenant ouvert n'est", "avenants ouverts ne sont")} pas encore chiffré${sansLigne.length > 1 ? "s" : ""} : ${sansLigne.slice(0, 3).map((a) => `n° ${a.numero} « ${a.objet.slice(0, 60)} »`).join(", ")}.`, gravite: "attention" });
  if (vieux.length) la.push({ texte: `${pluriel(vieux.length, "avenant attend", "avenants attendent")} depuis plus de 14 jours${m(total(vieux))} : à faire signer avant d'exécuter (C. civ. art. 1793).`, gravite: "bloquant" });
  if (perdus.length) la.push({ texte: `${pluriel(perdus.length, "avenant refusé ou abandonné", "avenants refusés ou abandonnés")}${m(total(perdus))}.`, gravite: "attention" });
  sections.push({ titre: "Les travaux en plus", lignes: la });

  // La facturation
  if (prix) {
    const lf: LigneReleve[] = [];
    const validees = (t.situations ?? []).filter((s) => s.statut === "validee").sort((a, b) => b.numero - a.numero);
    const facture = validees[0] ? validees[0].lignes.filter((l) => l.origine === "avenant").reduce((s, l) => s + l.cumule_ht, 0) : 0;
    const reste = Math.max(total(signes) - facture, 0);
    lf.push({ texte: `${pluriel(validees.length, "situation validée", "situations validées")}${validees.length ? `, ${eur(validees.reduce((s, x) => s + x.net_a_payer, 0))} nets` : ""}.`, gravite: "info" });
    if (reste > 0.005) lf.push({ texte: `Reste à facturer sur les avenants signés : ${eur(reste)} HT.`, gravite: "attention" });
    sections.push({ titre: "La facturation", lignes: lf });
  }

  // Le planning et les sous-traitants
  const lp: LigneReleve[] = [];
  const prevus = t.passages.filter((p) => p.statut === "prevu");
  const retard = prevus.filter((p) => p.fin < aujourdhui);
  const sansReponse = prevus.filter((p) => p.confirmation === "sans_reponse" || p.confirmation === "declinee");
  lp.push({ texte: `${pluriel(prevus.length, "passage prévu", "passages prévus")}, dont ${pluriel(prevus.filter((p) => p.exterieur).length, "extérieur", "extérieurs")}.`, gravite: "info" });
  if (retard.length) lp.push({ texte: `${pluriel(retard.length, "passage dépasse", "passages dépassent")} sa fin prévue : ${retard.slice(0, 3).map((p) => `« ${p.tache ?? "passage"} » (fin ${jj(p.fin)})`).join(", ")} — recaler la suite.`, gravite: "bloquant" });
  if (sansReponse.length) lp.push({ texte: `${pluriel(sansReponse.length, "sous-traitant n'a", "sous-traitants n'ont")} pas confirmé ou ont décliné : ${sansReponse.slice(0, 3).map((p) => p.intervenant_nom ?? p.tache ?? "passage").join(", ")}.`, gravite: "attention" });
  sections.push({ titre: "Le planning", lignes: lp });

  // Les contrôles et la réception
  const lc: LigneReleve[] = t.controles.slice(0, 8).map((k) => ({ texte: k.message, gravite: k.gravite === "bloquant" ? "bloquant" : k.gravite === "attention" ? "attention" : "info" }));
  const ouvertes = t.reception ? t.reception.reserves.filter((v) => v.statut === "ouverte") : [];
  if (ouvertes.length) lc.push({ texte: `${pluriel(ouvertes.length, "réserve reste ouverte", "réserves restent ouvertes")} depuis la réception du ${jj(t.reception?.date_reception)}.`, gravite: "attention" });
  if (lc.length) sections.push({ titre: "À reprendre", lignes: lc });
  return sections;
}

export function plusJours(iso: string, n: number): string {
  const [a, mo, j] = iso.split("-").map(Number);
  const d = new Date(a, mo - 1, j + n);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

/* Le relevé en page HTML autonome, pour l'imprimer ou l'enregistrer en PDF. */
export function releveHtml(t: Tableau, sections: SectionReleve[], aujourdhui: string): string {
  const e = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const marque = { bloquant: "À traiter", attention: "À surveiller", info: "" } as const;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Relevé — ${e(t.chantier.nom)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px}
p.sous{color:#555;margin:0 0 12px}li{margin:3px 0}.b{color:#a40000;font-weight:600}.a{color:#8a5a00;font-weight:600}</style></head><body>
<h1>Relevé du chantier ${e(t.chantier.nom)}</h1><p class="sous">${e([t.chantier.reference, t.chantier.commune].filter(Boolean).join(" · "))} — relevé du ${jj(aujourdhui)} par Daliro</p>
${sections.map((s) => `<h2>${e(s.titre)}</h2><ul>${s.lignes.map((l) => `<li>${l.gravite && l.gravite !== "info" ? `<span class="${l.gravite === "bloquant" ? "b" : "a"}">${marque[l.gravite]} :</span> ` : ""}${e(l.texte)}</li>`).join("")}</ul>`).join("")}
</body></html>`;
}
