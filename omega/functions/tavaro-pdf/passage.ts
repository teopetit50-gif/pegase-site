// Un passage de l'ouvrier TAVARO-PDF (session B2, 06/10/2026). Contrat de l'ouvrier : prendre_travaux → chaque travail
// dans un try → finir_travail ou echouer_travail → battre_ouvrier, même à vide. Jamais d'exception hors du passage.
//
// Pour chaque proposition : les factures sans PDF sont composées (pdf.ts) et déposées sous
// <client>/loc_factures/<facture>/<référence>.pdf ; les photos des preuves sont lues pour leur taille et leur empreinte ;
// loc_enregistrer_pdf crée les pièces et prépare le courriel avec elles. Dix pièces au plus et 15 Mo au plus (règles
// du socle) : les PDF d'abord, puis les photos tant qu'elles tiennent. Au dernier essai, loc_pdf_impossible : le
// courriel part sans pièce jointe et l'agence est prévenue.

import { composerPdf } from "./pdf.ts";
import type { PieceProduite, Portes, Travail } from "./portes.ts";
import { mimeDe, sha256, type Stockage } from "./stockage.ts";

export const GENRE = "tavaro.pdf_factures";
export const MAX_PIECES = 10;
export const MAX_OCTETS = 14 * 1024 * 1024; // sous les 15 Mo du socle, pour la marge du courriel

export type Journal = {
  info: (m: string, d?: Record<string, unknown>) => void;
  erreur: (m: string, d?: Record<string, unknown>) => void;
};
export type Bilan = { pris: number; faits: number; repris: number; sans_pdf: number; echecs: number; duree_ms: number };

export async function traiter(t: Travail, portes: Portes, stockage: Stockage): Promise<Record<string, unknown>> {
  const proposition = String(t.charge?.proposition ?? "");
  if (!proposition) return { ignore: "charge sans proposition" };
  const a = await portes.pdfAProduire(proposition);
  if (!a || a.statut !== "facturee" || !a.factures.length) {
    return { ignore: `proposition ${a?.statut ?? "introuvable"}` };
  }
  const pieces: PieceProduite[] = [];
  let octets = 0;
  for (const f of a.factures) {
    if (f.pdf_fait) continue;
    const pdf = await composerPdf(f, a.contrat);
    const nom = `${f.reference}.pdf`;
    const chemin = `${a.client}/loc_factures/${f.id}/${nom}`;
    await stockage.deposer(chemin, pdf, "application/pdf");
    pieces.push({
      facture: f.id,
      nature: "pdf",
      chemin,
      nom,
      mime: "application/pdf",
      octets: pdf.length,
      sha256: await sha256(pdf),
    });
    octets += pdf.length;
  }
  const vues = new Set<string>();
  for (const f of a.factures) {
    for (const p of f.photos) {
      if (pieces.length >= MAX_PIECES || vues.has(p.chemin) || !p.chemin.startsWith(`${a.client}/`)) continue;
      vues.add(p.chemin);
      let contenu: Uint8Array;
      try {
        contenu = await stockage.lire(p.chemin);
      } catch {
        continue; // une photo introuvable ne bloque pas la facture : elle reste au dossier
      }
      if (octets + contenu.length > MAX_OCTETS) continue;
      octets += contenu.length;
      pieces.push({
        facture: f.id,
        nature: "photo",
        chemin: p.chemin,
        nom: p.chemin.split("/").pop() ?? "photo.jpg",
        mime: mimeDe(p.chemin),
        octets: contenu.length,
        sha256: await sha256(contenu),
        legende: [
          p.legende,
          p.prise_le
            ? `prise le ${p.prise_le.slice(8, 10)}/${p.prise_le.slice(5, 7)}/${p.prise_le.slice(0, 4)} à ${
              p.prise_le.slice(11, 16)
            }`
            : null,
        ].filter(Boolean).join(" — ") || undefined,
      });
    }
  }
  const envoi = await portes.enregistrerPdf(proposition, pieces);
  return { pieces: pieces.length, pdf: pieces.filter((p) => p.nature === "pdf").length, octets, envoi };
}

export async function executerPassage(
  o: { portes: Portes; stockage: Stockage; ouvrier: string; journal: Journal; nombre?: number },
): Promise<Bilan> {
  const debut = Date.now();
  const bilan: Bilan = { pris: 0, faits: 0, repris: 0, sans_pdf: 0, echecs: 0, duree_ms: 0 };
  let travaux: Travail[] = [];
  try {
    travaux = await o.portes.prendreTravaux([GENRE], o.nombre ?? 5, "10 min", o.ouvrier);
  } catch (e) {
    o.journal.erreur("prendre_travaux", { erreur: String(e) });
  }
  bilan.pris = travaux.length;
  for (const t of travaux) {
    try {
      const r = await traiter(t, o.portes, o.stockage);
      await o.portes.finirTravail(t.id, r);
      bilan.faits++;
    } catch (e) {
      const erreur = String(e instanceof Error ? e.message : e).slice(0, 500);
      o.journal.erreur("travail", { id: t.id, erreur });
      try {
        const dernier = (t.essais ?? 1) >= (t.essais_max ?? 5);
        if (dernier) {
          // Le dernier essai : le courriel part sans pièce jointe plutôt que jamais.
          const r = await o.portes.pdfImpossible(String(t.charge?.proposition ?? ""), erreur);
          await o.portes.finirTravail(t.id, { sans_pdf: true, erreur, envoi: r });
          bilan.sans_pdf++;
        } else {
          const issue = await o.portes.echouerTravail(t.id, erreur, true);
          if (issue === "echec") bilan.echecs++;
          else bilan.repris++;
        }
      } catch (e2) {
        o.journal.erreur("rendre le travail", { id: t.id, erreur: String(e2) });
        bilan.echecs++;
      }
    }
  }
  try {
    await o.portes.battreOuvrier(
      "tavaro",
      [GENRE],
      { pris: bilan.pris, faits: bilan.faits, sans_pdf: bilan.sans_pdf },
      "15 min",
    );
  } catch (e) {
    o.journal.erreur("battre_ouvrier", { erreur: String(e) });
  }
  bilan.duree_ms = Date.now() - debut;
  return bilan;
}
