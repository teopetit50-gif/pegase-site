/* ══════════════════════════════════════════════════════════════════════
   Le rapport d'analyse des offres (b5_26) — PDF prêt à signer et Excel,
   fabriqués dans le navigateur avec les outils du rapport du contrôle
   (Mise, ecrirePdf, classeur : rapport.ts).

   · PDF : la consultation et l'estimation ; le classement comparable
     (montant annoncé, recalculé, comparable, écart à l'estimation) ; les
     postes chiffrés par aucune entreprise ou par une seule ; ce qui est
     relevé offre par offre ; le tableau poste par poste ; la proposition
     d'attribution (ou l'offre retenue et son motif) ; un cadre de
     signature pour l'architecte.
   · Excel : trois feuilles, « Classement », « Par poste », « Relevés ».
   ══════════════════════════════════════════════════════════════════════ */

import { classeur, ecrirePdf, Mise } from "./rapport";
import type { Consultation, Lot, Offre, Projet } from "./types";

export type DonneesRapportOffres = { projet: Projet; lot: Lot | undefined; consultation: Consultation; offres: Offre[] };

const euros = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`);
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`);
const ref = (r: string) => r.replace(/_/g, ".");
const dateFr = (d: string | null) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR") : "—");
export const STATUT_OFFRE: Record<Offre["statut"], string> = { recue: "Reçue", analysee: "Analysée", retenue: "Retenue", ecartee: "Écartée" };
const CODE: Record<Offre["constats"][number]["code"], string> = {
  non_chiffre: "Non chiffré", quantite: "Quantité", arithmetique: "Calcul", total: "Total", hors_dpgf: "Hors DPGF", ecart_estimation: "Écart à l'estimation", reserve: "Réserve",
};

const classes = (d: DonneesRapportOffres) => [...d.offres].sort((a, b) => (a.rang ?? 999) - (b.rang ?? 999) || a.entreprise.localeCompare(b.entreprise));
const nomFichier = (d: DonneesRapportOffres, ext: string) =>
  `analyse-offres-${(d.projet.reference ?? d.projet.nom).replace(/[^\p{L}\p{N}]+/gu, "-")}-lot-${d.lot?.numero ?? "x"}.${ext}`.toLowerCase();

export function pdfOffres(d: DonneesRapportOffres): { nom: string; octets: Uint8Array } {
  const t = d.consultation.tableau;
  const offres = classes(d);
  const retenue = offres.find((o) => o.id === d.consultation.offre_retenue);
  const premiere = offres.find((o) => o.rang === 1 && o.statut !== "ecartee");
  const titre = `Rapport d'analyse des offres — ${d.projet.nom}`;
  const m = new Mise(`${d.projet.nom} · lot ${d.lot?.numero ?? "?"} · ${d.consultation.intitule} · rapport du ${new Date().toLocaleDateString("fr-FR")} · Lorani`);
  m.texte(titre, { taille: 16, gras: true, apres: 2 });
  m.texte(`Lot ${d.lot?.numero ?? "?"}${d.lot ? ` — ${d.lot.intitule}` : ""} · ${d.consultation.intitule}${d.consultation.date_limite ? ` · remise des offres le ${dateFr(d.consultation.date_limite)}` : ""}`, { gris: true });
  m.texte([d.projet.reference, d.projet.adresse, [d.projet.code_postal, d.projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · "), { gris: true, apres: 8 });
  m.texte(`${offres.length} offre${offres.length > 1 ? "s" : ""} analysée${offres.length > 1 ? "s" : ""} le ${dateFr(d.consultation.analysee_le)} · estimation de la maîtrise d'œuvre : ${euros(t.estimation_ht ?? null)} HT · seuil d'écart par ligne : ${t.seuil_ecart_pct ?? d.consultation.seuil_ecart_pct} %.`, { gras: true, apres: 6 });

  m.texte("Classement comparable", { gras: true });
  m.texte("Le montant comparable compte chaque poste non chiffré au prix médian des autres offres (à défaut, à l'estimation).", { gris: true, taille: 9 });
  for (const o of offres) {
    const nc = o.constats.filter((k) => k.code === "non_chiffre").length;
    m.texte(`${o.rang ?? "—"}. ${o.entreprise} · annoncé ${euros(o.montant_ht)} HT · recalculé ${euros(o.montant_calcule_ht)} · comparable ${euros(o.montant_comparable_ht)} · ${pct(o.ecart_estimation_pct)} sur l'estimation${nc ? ` · ${nc} poste${nc > 1 ? "s" : ""} non chiffré${nc > 1 ? "s" : ""}` : ""}${o.reserves.length ? ` · ${o.reserves.length} réserve${o.reserves.length > 1 ? "s" : ""}` : ""}${o.statut === "ecartee" || o.statut === "retenue" ? ` · ${STATUT_OFFRE[o.statut]}` : ""}`,
      { retrait: 10, rouge: o.statut === "ecartee" });
  }
  m.texte("", { apres: 4 });
  if (t.aucune_offre?.length) m.texte(`Chiffré par aucune entreprise : ${t.aucune_offre.map(ref).join(", ")}.`, { rouge: true });
  if (t.une_seule_offre?.length) m.texte(`Chiffré par une seule entreprise sur ${offres.length} : ${t.une_seule_offre.map(ref).join(", ")}.`, { gras: true });
  m.filet();

  m.texte("Relevés, offre par offre", { gras: true, apres: 2 });
  for (const o of offres) {
    if (m.reste() < 120) m.saut();
    m.texte(o.entreprise, { gras: true });
    if (!o.constats.length) m.texte("Rien à relever : l'offre suit la DPGF.", { retrait: 14, gris: true });
    for (const k of o.constats) m.texte(`${k.gravite === "majeur" ? "Majeur" : "À noter"} · ${k.texte}`, { retrait: 14, taille: 9, rouge: k.code === "non_chiffre" || k.code === "arithmetique" || k.code === "total" });
    if (o.statut === "ecartee" && o.motif) m.texte(`Écartée : ${o.motif}`, { retrait: 14, taille: 9, gris: true });
    m.texte("", { apres: 3 });
  }
  m.filet();

  if (t.postes?.length) {
    m.texte("Poste par poste (€ HT)", { gras: true, apres: 2 });
    for (const l of t.postes) {
      if (m.reste() < 90) m.saut();
      m.texte(`${ref(l.ref)} ${l.libelle?.replace(/^\S+\s/, "") ?? ""} · ${l.quantite ?? "?"} ${l.unite ?? ""} · estimation ${euros(l.estimation)} · médiane ${euros(l.mediane)} · chiffré par ${l.chiffree_par}/${offres.length}`, { gras: true, taille: 9 });
      for (const o of offres) {
        const x = l.offres[o.id];
        m.texte(`${o.entreprise} : ${x?.montant ? euros(x.montant) : "non chiffré"}${x?.pu ? ` (${euros(x.pu)} × ${x.q ?? l.quantite ?? "?"})` : ""}`, { retrait: 14, taille: 9, rouge: !x?.montant, gris: !!x?.montant });
      }
    }
    m.filet();
  }

  if (m.reste() < 160) m.saut();
  m.texte(retenue ? "Attribution" : "Proposition d'attribution", { gras: true, apres: 2 });
  if (retenue) m.texte(`Offre retenue : ${retenue.entreprise}, ${euros(retenue.montant_ht ?? retenue.montant_calcule_ht)} HT (rang ${retenue.rang ?? "—"} au classement comparable)${retenue.motif ? `. Motif : ${retenue.motif}` : ""}.`);
  else if (premiere) m.texte(`L'offre la moins-disante au classement comparable est celle de ${premiere.entreprise} (${euros(premiere.montant_comparable_ht)} HT comparable, ${euros(premiere.montant_ht)} HT annoncés). Avant attribution, faire préciser ${premiere.constats.length ? "les points relevés ci-dessus" : "la tenue des prix"}.`);
  else m.texte("Aucune offre n'est classée.");
  m.texte("Ce rapport aide la maîtrise d'œuvre à analyser les offres ; il ne vaut pas décision. L'architecte arrête son avis et le signe.", { gris: true, taille: 9, apres: 18 });
  m.texte("Fait à ……………………………………, le ……………………", { apres: 18 });
  m.texte("L'architecte, maître d'œuvre (nom, signature) :", { apres: 40 });
  m.filet();
  m.fin();
  return { nom: nomFichier(d, "pdf"), octets: ecrirePdf(m.pages, titre) };
}

export function excelOffres(d: DonneesRapportOffres): { nom: string; octets: Uint8Array } {
  const offres = classes(d);
  const t = d.consultation.tableau;
  const classement: (string | number | null)[][] = [["Rang", "Entreprise", "SIREN", "Montant annoncé HT", "Montant recalculé HT", "Montant comparable HT", "Écart à l'estimation (%)", "Postes non chiffrés", "Réserves", "Statut", "Motif"],
    ...offres.map((o) => [o.rang, o.entreprise, o.siren, o.montant_ht, o.montant_calcule_ht, o.montant_comparable_ht, o.ecart_estimation_pct,
      o.constats.filter((k) => k.code === "non_chiffre").length, o.reserves.join(" ; ") || null, STATUT_OFFRE[o.statut], o.motif])];
  const postes: (string | number | null)[][] = [["Poste", "Libellé", "Quantité", "Unité", "Estimation HT", "Médiane HT", "Chiffré par", ...offres.map((o) => o.entreprise)],
    ...(t.postes ?? []).map((l) => [ref(l.ref), l.libelle, l.quantite, l.unite, l.estimation, l.mediane, l.chiffree_par, ...offres.map((o) => l.offres[o.id]?.montant ?? null)])];
  const releves: (string | number | null)[][] = [["Entreprise", "Nature", "Gravité", "Poste", "Relevé"],
    ...offres.flatMap((o) => o.constats.map((k) => [o.entreprise, CODE[k.code], k.gravite === "majeur" ? "Majeur" : "À noter", k.ref ? ref(k.ref) : null, k.texte]))];
  const titre = `${d.projet.nom} — analyse des offres, lot ${d.lot?.numero ?? "?"}`;
  return {
    nom: nomFichier(d, "xlsx"),
    octets: classeur([
      { nom: "Classement", lignes: classement, largeurs: [6, 30, 12, 16, 16, 16, 12, 10, 40, 10, 30] },
      { nom: "Par poste", lignes: postes, largeurs: [8, 40, 10, 8, 14, 14, 10, ...offres.map(() => 18)] },
      { nom: "Relevés", lignes: releves, largeurs: [26, 18, 10, 8, 70] },
    ], titre),
  };
}
