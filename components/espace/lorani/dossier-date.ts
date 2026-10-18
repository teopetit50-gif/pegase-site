/* ══════════════════════════════════════════════════════════════════════
   Le dossier daté du projet, exportable en une fois (page des architectes :
   « Vous gardez un dossier daté, exportable en une fois : chaque point
   signalé, chaque visa rendu et chaque refus, avec la pièce et la date » ;
   formule Groupement : « Dossier de défense décennale » ; formule Cabinet :
   « Export Excel par lot »).

   Une archive .zip fabriquée dans le navigateur, avec deux fichiers :
   · registre.pdf : par rubrique (contrôles et constats décidés, visas,
     situations, décennales, ordres de service, réserves, comptes rendus
     diffusés, offres), chaque ligne avec sa date, sa pièce et qui a décidé ;
   · registre.xlsx : la feuille « Registre » (toutes les lignes, dans
     l'ordre des dates), puis une feuille par lot.
   Les dates sont celles que la base a enregistrées au moment des faits ;
   l'export n'en invente aucune.
   ══════════════════════════════════════════════════════════════════════ */

import { archive, classeur, ecrirePdf, Mise } from "./rapport";
import type { Dossier, Projet } from "./types";

type Ligne = { date: string | null; rubrique: string; lot: string | null; objet: string; etat: string; par: string | null; piece: string | null };

const jour = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("fr-FR") : "—");
const euros = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT`);
const AVIS: Record<string, string> = { a_viser: "À viser", vso: "Visé sans observation", vao: "Visé avec observations", ref: "Refusé" };
const DECISION: Record<string, string> = { ouvert: "Ouvert", corrige: "Corrigé", accepte: "Accepté", ecarte: "Écarté" };
const SITUATION: Record<string, string> = { a_viser: "À viser", visee: "Visée", rectifiee: "Rectifiée" };
const ATTESTATION: Record<string, string> = { conforme: "Conforme", non_conforme: "Non conforme", expiree: "Échue", a_verifier: "À vérifier" };
const OS: Record<string, string> = { emis: "Émis", signe: "Signé", signe_reserves: "Signé avec réserves", refuse: "Refusé" };
const RESERVE: Record<string, string> = { ouverte: "Ouverte", levee: "Levée", contestee: "Contestée" };

/* toutes les lignes datées du projet */
export function lignesDossier(projet: Projet, dossier: Dossier, nommer: (id: string | null | undefined) => string): Ligne[] {
  const lot = (id: string | null | undefined) => (id ? dossier.lots.find((l) => l.id === id)?.numero ?? null : null);
  const lotMarche = (id: string | null | undefined) => lot(dossier.marches.find((m) => m.id === id)?.lot_id);
  const piece = (id: string | null | undefined) => (id ? dossier.pieces.find((p) => p.id === id)?.nom_fichier ?? null : null);
  const l: Ligne[] = [];
  for (const c of dossier.controles.filter((x) => x.projet_id === projet.id)) {
    l.push({ date: c.lance_le ?? c.cree_le, rubrique: "Contrôle du dossier", lot: null, objet: `${c.intitule}, indice ${c.indice} : ${c.constats_nb} constat(s) ouvert(s) au passage`, etat: c.statut === "clos" ? "Clos" : c.lance_le ? "Contrôlé" : "Pièces en lecture", par: null, piece: null });
    for (const k of dossier.constats.filter((x) => x.controle_id === c.id)) {
      const cite = k.valeurs.filter((v) => !v.regle).map((v) => `${v.reference ?? piece(v.piece) ?? "pièce"}${v.page ? `, p. ${v.page}` : ""}`).join(" ; ");
      l.push({ date: k.decide_le ?? c.lance_le ?? c.cree_le, rubrique: "Constat", lot: null, objet: `[${c.intitule}, indice ${c.indice}] ${k.titre}${k.article ? ` (${k.article})` : ""}`,
        etat: `${DECISION[k.statut]}${k.motif ? ` : ${k.motif}` : ""}`, par: k.decide_par ? nommer(k.decide_par) : null, piece: cite || null });
    }
  }
  for (const v of dossier.visas.filter((x) => x.projet_id === projet.id)) {
    l.push({ date: v.vise_le ?? v.recu_le, rubrique: "Visa", lot: lot(v.lot_id), objet: `${v.document} (indice ${v.indice}), reçu le ${jour(v.recu_le)}${v.a_viser_avant ? `, à viser avant le ${jour(v.a_viser_avant)}` : ""}`,
      etat: `${AVIS[v.avis] ?? v.avis}${v.observation ? ` : ${v.observation}` : ""}`, par: null, piece: null });
  }
  for (const s of dossier.situations.filter((x) => x.projet_id === projet.id)) {
    l.push({ date: s.visee_le ?? s.recue_le, rubrique: "Situation de travaux", lot: lotMarche(s.marche_id), objet: `Situation n° ${s.numero}, cumul demandé ${euros(s.cumul_ht)}, reçue le ${jour(s.recue_le)}`,
      etat: `${SITUATION[s.statut] ?? s.statut}${s.cumul_admis_ht !== null ? `, cumul admis ${euros(s.cumul_admis_ht)}` : ""}${s.observation ? ` : ${s.observation}` : ""}`, par: null, piece: null });
  }
  for (const a of dossier.attestations.filter((x) => x.projet_id === projet.id)) {
    const ent = dossier.intervenants.find((i) => i.id === a.intervenant_id)?.organisme ?? a.assure ?? "Entreprise";
    l.push({ date: a.verifie_le, rubrique: "Décennale", lot: lot(a.lot_id), objet: `${ent} : ${a.assureur ?? "assureur ?"}, du ${jour(a.debut)} au ${jour(a.fin)}`,
      etat: `${ATTESTATION[a.statut] ?? a.statut}${a.constats.length ? ` : ${a.constats.map((c) => c.texte).join(" ")}` : ""}`, par: null, piece: piece(a.piece_id) });
  }
  for (const o of dossier.ordresService.filter((x) => x.projet_id === projet.id)) {
    l.push({ date: o.emis_le, rubrique: "Ordre de service", lot: lotMarche(o.marche_id), objet: `OS n° ${o.numero} : ${o.objet}${o.montant_ht ? `, ${euros(o.montant_ht)}` : ""}${o.delai_jours ? `, ${o.delai_jours} j` : ""}`,
      etat: `${OS[o.statut] ?? o.statut}${o.reserves_entreprise ? ` : ${o.reserves_entreprise}` : ""}`, par: null, piece: null });
  }
  for (const r of dossier.reserves.filter((x) => x.projet_id === projet.id)) {
    l.push({ date: r.levee_le ?? r.constatee_le, rubrique: "Réserve", lot: lot(r.lot_id) ?? lotMarche(r.marche_id), objet: `Réserve n° ${r.numero} : ${r.intitule}${r.localisation ? ` (${r.localisation})` : ""}, constatée le ${jour(r.constatee_le)}`,
      etat: `${RESERVE[r.statut] ?? r.statut}${r.levee_le ? ` le ${jour(r.levee_le)}` : ""}${r.motif ? ` : ${r.motif}` : ""}`, par: null, piece: null });
  }
  for (const c of dossier.comptesRendus.filter((x) => x.projet_id === projet.id && x.statut === "diffuse")) {
    l.push({ date: c.diffuse_le, rubrique: "Compte rendu", lot: null, objet: `Compte rendu n° ${c.numero}, visite du ${jour(c.visite_le)}`, etat: "Diffusé (contenu figé)", par: null, piece: null });
  }
  for (const c of dossier.consultations.filter((x) => x.projet_id === projet.id)) {
    const offres = dossier.offres.filter((o) => o.consultation_id === c.id);
    const retenue = offres.find((o) => o.id === c.offre_retenue);
    l.push({ date: c.analysee_le ?? c.cree_le, rubrique: "Consultation", lot: lot(c.lot_id), objet: `${c.intitule} : ${offres.length} offre(s)${retenue ? `, retenue : ${retenue.entreprise} (${euros(retenue.montant_ht)})` : ""}`,
      etat: { ouverte: "Offres attendues", analysee: "Analysée", attribuee: "Attribuée", infructueuse: "Infructueuse" }[c.statut], par: null, piece: null });
    for (const o of offres.filter((x) => x.statut === "ecartee")) {
      l.push({ date: c.analysee_le, rubrique: "Offre écartée", lot: lot(c.lot_id), objet: `${o.entreprise} (${euros(o.montant_ht)})`, etat: `Écartée${o.motif ? ` : ${o.motif}` : ""}`, par: null, piece: piece(o.piece_id) });
    }
  }
  return l.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.rubrique.localeCompare(b.rubrique));
}

export function dossierDate(projet: Projet, dossier: Dossier, nommer: (id: string | null | undefined) => string): { nom: string; octets: Uint8Array } {
  const lignes = lignesDossier(projet, dossier, nommer);
  const aujourdhui = new Date();
  const titre = `Dossier daté — ${projet.nom}`;

  const m = new Mise(`${projet.nom} · dossier daté exporté le ${aujourdhui.toLocaleDateString("fr-FR")} · Lorani`);
  m.texte(titre, { taille: 16, gras: true, apres: 2 });
  m.texte([projet.reference, projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · "), { gris: true });
  m.texte(`${lignes.length} ligne(s), du ${jour(lignes.find((x) => x.date)?.date)} au ${jour([...lignes].reverse().find((x) => x.date)?.date)}. Chaque date est celle que la base a enregistrée au moment des faits.`, { gris: true, apres: 8 });
  const rubriques = [...new Set(lignes.map((x) => x.rubrique))];
  for (const r of ["Contrôle du dossier", "Constat", "Visa", "Situation de travaux", "Décennale", "Ordre de service", "Réserve", "Compte rendu", "Consultation", "Offre écartée"].filter((x) => rubriques.includes(x))) {
    if (m.reste() < 120) m.saut();
    m.filet();
    m.texte(r === "Constat" ? "Constats et décisions" : r === "Visa" ? "Visas rendus et refus" : r, { gras: true, taille: 12, apres: 2 });
    for (const x of lignes.filter((y) => y.rubrique === r)) {
      if (m.reste() < 70) m.saut();
      m.texte(`${jour(x.date)}${x.lot ? ` · lot ${x.lot}` : ""} · ${x.objet}`, { taille: 9 });
      m.texte(`${x.etat}${x.par ? ` (${x.par})` : ""}${x.piece ? ` · pièce : ${x.piece}` : ""}`, { taille: 9, retrait: 14, gris: true, rouge: /Refusé|Non conforme|Échue|Bloquant/.test(x.etat), apres: 2 });
    }
  }
  if (!lignes.length) m.texte("Aucune décision n'est encore enregistrée sur ce projet.", { gris: true });
  m.fin();

  const entete = ["Date", "Rubrique", "Lot", "Objet", "Décision ou état", "Décidé par", "Pièce citée"];
  const ligne = (x: Ligne) => [x.date ? x.date.slice(0, 10) : null, x.rubrique, x.lot, x.objet, x.etat, x.par, x.piece];
  const largeurs = [12, 20, 6, 70, 50, 18, 30];
  const lots = dossier.lots.filter((x) => x.projet_id === projet.id).sort((a, b) => a.numero.localeCompare(b.numero));
  const xlsx = classeur([
    { nom: "Registre", lignes: [entete, ...lignes.map(ligne)], largeurs },
    ...lots.map((lo) => ({ nom: `Lot ${lo.numero}`.replace(/[\\/?*[\]:]/g, "-"), lignes: [entete, ...lignes.filter((x) => x.lot === lo.numero).map(ligne)], largeurs })),
  ], titre);

  const date = aujourdhui.toISOString().slice(0, 10);
  const base = `dossier-date-${(projet.reference ?? projet.nom).replace(/[^\p{L}\p{N}]+/gu, "-")}-${date}`.toLowerCase();
  return { nom: `${base}.zip`, octets: archive([{ nom: `${base}/registre.pdf`, donnees: ecrirePdf(m.pages, titre) }, { nom: `${base}/registre.xlsx`, donnees: xlsx }]) };
}
