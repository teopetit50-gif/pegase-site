/* ══════════════════════════════════════════════════════════════════════
   Les comptes rendus de chantier (b5_20) — ce que l'écran calcule seul

   · contenuCr : le contenu d'un CR, comme public.lorani_cr_contenu (points
     nés à ce CR, en suspens nés avant avec leur âge, soldés depuis le CR
     précédent). Un CR diffusé garde le contenu figé par le socle.
   · lireNotes : « rédige à partir de vos notes » — chaque ligne des notes de
     visite devient un point : « ? » ou une ligne qui finit par « ? » = une
     question, « ! » ou « À faire » = une action, « = » ou « Décision » = une
     décision, le reste = une observation ; « @Bâti Ouest » désigne
     l'entreprise (par le début de son nom), « lot 02 » le lot, « avant le
     12/10 » l'échéance. Rien n'est inventé : une ligne reste une ligne.
   · pdfCompteRendu : le CR en PDF (même écriture que le rapport du contrôle).
   ══════════════════════════════════════════════════════════════════════ */

import { Mise, ecrirePdf } from "./rapport";
import type { CompteRendu, ContenuCr, Dossier, Intervenant, LigneCr, Lot, Point, Projet } from "./types";

const ecart = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T12:00:00`).getTime() - new Date(`${a.slice(0, 10)}T12:00:00`).getTime()) / 86400000);

export function contenuCr(cr: CompteRendu, projet: Projet, dossier: Dossier): ContenuCr {
  if (cr.statut === "diffuse" && cr.contenu) return cr.contenu;
  const crs = dossier.comptesRendus.filter((x) => x.projet_id === cr.projet_id);
  const prec = crs.filter((x) => x.numero < cr.numero).sort((a, b) => b.numero - a.numero)[0] ?? null;
  const points = dossier.points.filter((p) => p.projet_id === cr.projet_id);
  const ligne = (p: Point): LigneCr => {
    const ne = crs.find((x) => x.id === p.ouvert_au_cr);
    return {
      id: p.id, nature: p.nature, texte: p.texte, lot: dossier.lots.find((l) => l.id === p.lot_id)?.numero ?? null,
      entreprise: dossier.intervenants.find((i) => i.id === p.intervenant_id)?.organisme ?? null, echeance: p.echeance, statut: p.statut,
      reponse: p.reponse, repondu_le: p.repondu_le, ne_au_cr: ne?.numero ?? null,
    };
  };
  const neLe = (p: Point) => crs.find((x) => x.id === p.ouvert_au_cr)?.visite_le ?? p.cree_le.slice(0, 10);
  const tri = (a: LigneCr, b: LigneCr) => (a.lot ?? "").localeCompare(b.lot ?? "");
  return {
    cr: { id: cr.id, numero: cr.numero, visite_le: cr.visite_le, prochaine_visite: cr.prochaine_visite, statut: cr.statut, avancement: cr.avancement, presents: cr.presents },
    projet: { nom: projet.nom, reference: projet.reference, adresse: projet.adresse, commune: projet.commune },
    precedent: prec ? { numero: prec.numero, visite_le: prec.visite_le } : null,
    nouveaux: points.filter((p) => p.ouvert_au_cr === cr.id).map(ligne).sort(tri),
    en_suspens: points.filter((p) => p.statut === "ouvert" && p.ouvert_au_cr !== cr.id && (p.nature === "question" || p.nature === "action") && neLe(p) <= cr.visite_le)
      .map((p) => ({ ...ligne(p), age_jours: ecart(neLe(p), cr.visite_le) })).sort(tri),
    soldes: points.filter((p) => p.statut !== "ouvert" && p.ouvert_au_cr !== cr.id && (p.nature === "question" || p.nature === "action")
      && (p.repondu_le ?? p.maj_le?.slice(0, 10) ?? "") > (prec?.visite_le ?? "") && (p.repondu_le ?? p.maj_le?.slice(0, 10) ?? "") <= cr.visite_le).map(ligne).sort(tri),
  };
}

const sansAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type PointLu = { nature: Point["nature"]; texte: string; intervenant_id: string | null; lot_id: string | null; echeance: string | null };

export function lireNotes(notes: string, intervenants: Intervenant[], lots: Lot[], annee: number): PointLu[] {
  const lus: PointLu[] = [];
  for (const brute of notes.split("\n")) {
    let t = brute.trim().replace(/^[-•*]\s*/, "");
    if (!t) continue;
    let nature: Point["nature"] = "observation";
    if (/^\?/.test(t) || /\?\s*$/.test(t)) nature = "question";
    else if (/^!/.test(t) || /^(à faire|a faire|action)\s*:?/i.test(t)) nature = "action";
    else if (/^=/.test(t) || /^décision\s*:?/i.test(t)) nature = "decision";
    t = t.replace(/^[?!=]\s*/, "").replace(/^(à faire|a faire|action|décision)\s*:?\s*/i, "");
    let intervenant_id: string | null = null;
    const k = t.indexOf("@");
    if (k >= 0) {
      /* « @Pierres de Bourgogne planning… » : le plus long début de nom d'intervenant qui suit l'arobase */
      const reste = sansAccents(t.slice(k + 1));
      let meilleur: { id: string; nom: string; n: number } | null = null;
      for (const i of intervenants) {
        const mots = sansAccents(i.organisme).replace(/\b(sas|sasu|sarl|eurl|sa|sci|snc|scop)\b/g, "").split(/\s+/).filter(Boolean);
        for (let n = mots.length; n >= 1; n--) {
          const debut = mots.slice(0, n).join(" ");
          if ((reste.startsWith(debut + " ") || reste === debut || reste.startsWith(debut + ",")) && (!meilleur || debut.length > meilleur.n)) meilleur = { id: i.id, nom: i.organisme, n: debut.length };
        }
      }
      if (meilleur) {
        intervenant_id = meilleur.id;
        t = `${t.slice(0, k)}${meilleur.nom}${t.slice(k + 1 + meilleur.n)}`;
      }
    }
    let lot_id: string | null = null;
    const lo = t.match(/\blot\s+([0-9A-Za-z.-]{1,10})\b/i);
    if (lo) lot_id = lots.find((l) => l.numero.toLowerCase() === lo[1].toLowerCase())?.id ?? null;
    lot_id = lot_id ?? intervenants.find((i) => i.id === intervenant_id)?.lot_id ?? null;
    let echeance: string | null = null;
    const av = t.match(/\bavant le\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
    if (av) {
      const a = av[3] ? (av[3].length === 2 ? 2000 + Number(av[3]) : Number(av[3])) : annee;
      echeance = `${a}-${av[2].padStart(2, "0")}-${av[1].padStart(2, "0")}`;
    }
    lus.push({ nature, texte: t.replace(/\s+/g, " ").trim().slice(0, 1000), intervenant_id, lot_id, echeance });
  }
  return lus;
}

const jour = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "—");
const NATURES: Record<Point["nature"], string> = { question: "Question", action: "Action", decision: "Décision", observation: "Observation" };

export function pdfCompteRendu(c: ContenuCr): { nom: string; octets: Uint8Array } {
  const titre = `Compte rendu de chantier n° ${c.cr.numero} — ${c.projet?.nom ?? ""}`;
  const m = new Mise(`${c.projet?.nom ?? ""} · compte rendu n° ${c.cr.numero} du ${jour(c.cr.visite_le)} · ${c.cr.statut === "diffuse" ? "diffusé" : "brouillon"} · Lorani`);
  m.texte(titre, { taille: 16, gras: true, apres: 2 });
  m.texte(`Visite du ${jour(c.cr.visite_le)}${c.precedent ? ` · fait suite au compte rendu n° ${c.precedent.numero} du ${jour(c.precedent.visite_le)}` : ""}${c.cr.prochaine_visite ? ` · prochaine visite le ${jour(c.cr.prochaine_visite)}` : ""}`, { gris: true });
  m.texte([c.projet?.reference, c.projet?.adresse, c.projet?.commune].filter(Boolean).join(" · "), { gris: true, apres: 8 });
  if (c.cr.presents.length) {
    m.texte("Présents et excusés", { gras: true });
    for (const p of c.cr.presents) m.texte(`${p.present ? "Présent" : "Excusé"} · ${p.nom}${p.organisme ? ` (${p.organisme})` : ""}`, { retrait: 10, gris: true });
    m.texte("", { apres: 4 });
  }
  if (c.cr.avancement) {
    m.texte("Avancement", { gras: true });
    m.texte(c.cr.avancement, { retrait: 10, apres: 4 });
  }
  const bloc = (titreBloc: string, lignes: LigneCr[], vide: string) => {
    m.filet();
    m.texte(titreBloc, { gras: true });
    if (!lignes.length) m.texte(vide, { retrait: 10, gris: true });
    for (const l of lignes) {
      m.texte(`${NATURES[l.nature]}${l.lot ? ` · lot ${l.lot}` : ""}${l.entreprise ? ` · ${l.entreprise}` : ""}${l.echeance && l.statut === "ouvert" ? ` · pour le ${jour(l.echeance)}` : ""}${l.age_jours ? ` · en suspens depuis ${l.age_jours} jours (CR n° ${l.ne_au_cr})` : ""}`,
        { retrait: 10, gras: true, taille: 9, rouge: !!l.echeance && l.statut === "ouvert" && l.echeance < c.cr.visite_le });
      m.texte(l.texte, { retrait: 20 });
      if (l.reponse) m.texte(`Réponse${l.repondu_le ? ` du ${jour(l.repondu_le)}` : ""} : ${l.reponse}`, { retrait: 20, gris: true, taille: 9 });
      m.texte("", { apres: 2 });
    }
  };
  bloc("Points de cette visite", c.nouveaux, "Aucun point nouveau.");
  bloc("Points en suspens", c.en_suspens, "Aucun point en suspens.");
  bloc(`Points soldés depuis ${c.precedent ? `le compte rendu n° ${c.precedent.numero}` : "le début du chantier"}`, c.soldes, "Aucun.");
  m.fin();
  const nom = `cr-${(c.projet?.reference ?? c.projet?.nom ?? "chantier").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-n${c.cr.numero}.pdf`;
  return { nom, octets: ecrirePdf(m.pages, titre) };
}
