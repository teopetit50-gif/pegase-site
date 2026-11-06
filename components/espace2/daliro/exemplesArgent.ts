/* ══════════════════════════════════════════════════════════════════════
   DALIRO, espace 2 : l'argent des chantiers d'exemple (06/11/2026)

   Teo, sur l'onglet Argent de la fiche chantier : « il n'y a pas assez de
   données ». Les chantiers étoffés en Guadeloupe (./exemplesEtoffes) ont
   sept à neuf lots, mais leur argent n'avait pas suivi : une seule facture
   fournisseur rattachée pour tout l'exemple, et des situations qui ne
   facturaient que les lots d'avant, sans lot rattaché à leurs lignes.

   Appelé en dernier par exempleComplet (./donnees), sur les chantiers
   OUVERTS seulement :
   - chaque ligne de situation sans lot est rattachée au lot dont elle porte
     le nom (« Agencement du magasin » → lot 01 Agencement du magasin) ;
   - chaque lot commencé que nulle situation ne facture y reçoit sa ligne,
     de l'avancement du lot (la dernière situation au plus haut, les
     précédentes au prorata) ; les encaissements gardent leur part du net ;
   - le déboursé facturé des lots sous-traités devient des factures
     fournisseurs rattachées (autant que le déboursé en annonce), datées
     sur la vie du chantier, la dernière à valider.
   Identifiants en 0000…eb… : rien ici n'est jamais écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui, ilYa } from "@/components/espace/exemples/socle";
import { recalculer } from "@/components/espace/daliro/situations";
import type { FactureChantier, LigneSituation, Lot, Situation, Tableau } from "@/components/espace/daliro/types";

const id = (n: number) => `00000000-0000-4000-8000-000000eb${String(n).padStart(4, "0")}`;
const arrondi = (v: number) => Math.round(v * 100) / 100;
const cinq = (v: number) => Math.max(0, Math.min(100, Math.round(v / 5) * 5));

/* les mots qui portent le sens d'un libellé : sans accents ni mots courts */
const mots = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 5);

function lotDeLigne(designation: string, lots: Lot[]): Lot | null {
  const d = new Set(mots(designation));
  let meilleur: Lot | null = null;
  let score = 0;
  for (const l of lots) {
    const s = mots(l.libelle).filter((m) => d.has(m)).length;
    if (s > score) [meilleur, score] = [l, s];
  }
  return meilleur;
}

let n = 0;

function etoffer(t: Tableau): Tableau {
  const vendu = (lot: string) => {
    const d = t.debourse.find((x) => x.lot_id === lot);
    return d ? (d.engage_marche_ht ?? 0) + (d.engage_avenants_ht ?? 0) : 0;
  };

  /* ——— les situations d'avant : une par mois depuis l'ouverture, quand la première est loin du début ——— */
  let toutes = t.situations ?? [];
  const premiere = toutes.filter((s) => s.statut !== "annulee").sort((a, b) => a.numero - b.numero)[0];
  const ouverture = t.chantier.date_debut;
  if (premiere && ouverture) {
    const ecartJ = Math.round((new Date(`${premiere.periode_fin}T12:00:00`).getTime() - new Date(`${ouverture}T12:00:00`).getTime()) / 86400000);
    const avant = Math.max(0, Math.min(2, Math.round((ecartJ - 15) / 30)));
    if (avant > 0) {
      const finDe = (k: number) => {
        const d = new Date(`${premiere.periode_fin}T12:00:00`);
        d.setDate(d.getDate() - 30 * (avant - k));
        return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
      };
      const ilYaJ = (iso: string) => Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / 86400000);
      const part = (l: LigneSituation, k: number) => cinq((l.avancement * (k + 1)) / (avant + 1));
      const anciennes: Situation[] = Array.from({ length: avant }, (_, k) => {
        const sid = id(900 + k);
        const fin = finDe(k);
        const il = ilYaJ(fin);
        const r = recalculer({
          ...premiere, id: sid, numero: k + 1, periode_fin: fin, statut: "validee", demande_id: id(950 + k), demande_statut: "executee",
          soumise_le: ilYa(Math.max(il - 2, 1), 11), validee_le: ilYa(Math.max(il - 5, 1), 16), validee_libelle: "Claire Morel", motif: null,
          echeance: aujourdHui(30 - il), penalites_taux: null,
          lignes: premiere.lignes.map((l, i) => ({ ...l, id: id(1000 + k * 100 + i), situation_id: sid, avancement: part(l, k), precedent_avancement: k === 0 ? 0 : part(l, k - 1), cumule_ht: 0, precedent_ht: 0 })),
        });
        /* payée à trente jours, d'un virement */
        return { ...r, paiements: [{ id: id(980 + k), situation_id: sid, recu_le: aujourdHui(Math.min(-1, 28 - il)), montant: r.net_a_payer, reference: `VIR-${t.chantier.reference ?? "CH"}-${k + 1}` }] };
      });
      const dernierAvant = anciennes[anciennes.length - 1];
      toutes = [
        ...anciennes,
        ...toutes.map((s) =>
          s.statut === "annulee"
            ? s
            : recalculer({
                ...s, numero: s.numero + avant,
                lignes: s.id === premiere.id ? s.lignes.map((l, i) => ({ ...l, precedent_avancement: dernierAvant.lignes[i]?.avancement ?? l.precedent_avancement })) : s.lignes,
              }),
        ),
      ];
    }
  }

  /* ——— les situations ——— */
  const suivies = toutes.filter((s) => s.statut !== "annulee").sort((a, b) => a.numero - b.numero);
  let situations = toutes;
  if (suivies.length) {
    const rattachees = new Map<string, LigneSituation[]>(
      suivies.map((s) => [s.id, s.lignes.map((l) => (l.lot_id ? l : { ...l, lot_id: lotDeLigne(l.designation, t.lots)?.id ?? null }))]),
    );
    const factures = new Set([...rattachees.values()].flat().map((l) => l.lot_id).filter(Boolean));
    const cible = (l: Lot): number => {
      if (l.statut === "termine") return 100;
      const d = t.debourse.find((x) => x.lot_id === l.id);
      const parDebourse = d && d.facture_ht && vendu(l.id) ? cinq(((d.facture_ht ?? 0) / vendu(l.id)) * 100) : 0;
      if (l.statut === "en_cours") return l.avancement_pct ?? (t.chantier.etape?.lot_id === l.id ? t.chantier.etape.avancement_pct : null) ?? (parDebourse || 30);
      return parDebourse;
    };
    const ajouts = [...t.lots]
      .sort((a, b) => a.rang - b.rang)
      .filter((l) => !factures.has(l.id) && vendu(l.id) > 0)
      .map((l) => ({ l, p: cible(l) }))
      .filter((x) => x.p > 0);
    const K = suivies.length;
    const refaites = new Map<string, Situation>();
    suivies.forEach((s, k) => {
      const lignes = [...(rattachees.get(s.id) ?? s.lignes)];
      const ordre = Math.max(0, ...lignes.map((l) => (l.ordre < 100000 ? l.ordre : 0)));
      ajouts.forEach(({ l, p }, r) => {
        const apres = cinq((p * (k + 1)) / K);
        const avant = k === 0 ? 0 : cinq((p * k) / K);
        lignes.push({
          id: id(++n), situation_id: s.id, origine: "marche", ligne_marche_id: null, ligne_avenant_id: null, avenant_numero: null, lot_id: l.id,
          ordre: ordre + r + 1, designation: `Lot ${l.code} ${l.libelle}`, base_ht: vendu(l.id), avancement: apres, precedent_avancement: avant, cumule_ht: 0, precedent_ht: 0,
        });
      });
      const r = recalculer({ ...s, lignes });
      const net = s.net_a_payer || 1;
      refaites.set(s.id, { ...r, paiements: (s.paiements ?? []).map((p) => ({ ...p, montant: arrondi((p.montant / net) * r.net_a_payer) })) });
    });
    situations = toutes.map((s) => refaites.get(s.id) ?? s);
  }

  /* ——— les factures fournisseurs des lots sous-traités ——— */
  const nouvelles: FactureChantier[] = [];
  const debut = t.chantier.date_debut && t.chantier.date_debut < aujourdHui(-4) ? t.chantier.date_debut : aujourdHui(-30);
  const ecart = Math.max(8, Math.round((Date.now() - new Date(`${debut}T12:00:00`).getTime()) / 86400000));
  for (const d of t.debourse) {
    const lot = t.lots.find((l) => l.id === d.lot_id);
    if (!lot || lot.execution === "client" || !d.facture_ht) continue;
    const deja = t.factures.filter((f) => f.statut === "rattachee" && f.lot_id === lot.id).reduce((s, f) => s + (f.montant_ht ?? 0), 0);
    const reste = arrondi(d.facture_ht - deja);
    if (reste <= 0) continue;
    const nb = Math.max(1, d.nb_factures - t.factures.filter((f) => f.statut === "rattachee" && f.lot_id === lot.id).length);
    const tiers = t.tiers.find((x) => x.id === lot.tiers_id);
    const nom = lot.tiers_nom ?? tiers?.nom ?? "Fournisseur";
    const sigle = nom.split(/\s+/).map((m) => m[0]).join("").toUpperCase().slice(0, 3);
    for (let i = 0; i < nb; i++) {
      const montant = i === nb - 1 ? arrondi(reste - arrondi(reste / nb) * (nb - 1)) : arrondi(reste / nb);
      /* la première au tiers de la vie du chantier, la dernière il y a quelques jours */
      const il = nb === 1 ? Math.max(3, Math.round(ecart / 3)) : Math.round(ecart * 0.7 - (i * (ecart * 0.7 - 3)) / (nb - 1));
      const derniere = i === nb - 1;
      const k = ++n;
      nouvelles.push({
        id: id(k), facture_id: id(2000 + k), document_id: id(4000 + k), chantier_id: t.chantier.id, lot_id: lot.id, lot_code: lot.code, lot_libelle: lot.libelle,
        marche_id: t.marches[0]?.id ?? null, statut: "rattachee", motif: nb > 1 ? `Situation n° ${i + 1} du lot ${lot.code}` : `Travaux du lot ${lot.code}`,
        fournisseur_siren: tiers?.siren ?? null, fournisseur_id: lot.tiers_id, fournisseur_nom: nom, facture_numero: `${sigle}-2026-${String(100 + ((k * 37) % 900)).padStart(4, "0")}`,
        facture_nature: "facture", facture_statut: derniere && il < 20 ? "a_valider" : "validee", document_reference: `R2026-${String(k).padStart(6, "0")}`,
        date_emission: aujourdHui(-il), echeance_lue: aujourdHui(30 - il), montant_ht: montant, montant_ttc: arrondi(montant * 1.085), rattache_libelle: "Vous", cree_le: ilYa(Math.max(0, il - 1), 10),
      });
    }
  }

  return { ...t, situations, factures: [...t.factures, ...nouvelles] };
}

export function etofferArgent(tableaux: Record<string, Tableau>): Record<string, Tableau> {
  n = 0;
  const sortie: Record<string, Tableau> = {};
  for (const [cle, t] of Object.entries(tableaux)) sortie[cle] = t.chantier.statut === "ouvert" ? etoffer(t) : t;
  return sortie;
}
