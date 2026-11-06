/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : ce que l'IA lit pour répondre à une
   question (06/11/2026, demande de Teo : « que l'API soit branchée
   derrière et que je puisse poser vraiment une question »).

   Le chantier que la personne voit (exemple ou base réelle, déjà lu sous
   sa session) mis en texte compact : en-tête, description, lots et
   déboursé, planning, points à régler, avenants, situations, factures,
   réception et réserves, messages du fil. Envoyé tel quel à
   /api/daliro/question, plafonné là-bas à 60 000 caractères.
   ══════════════════════════════════════════════════════════════════════ */

import type { MessageChantier, Tableau } from "@/components/espace/daliro/types";

const STATUT_CHANTIER: Record<string, string> = { preparation: "en préparation", ouvert: "ouvert (travaux en cours)", suspendu: "suspendu", receptionne: "réceptionné", clos: "clos", annule: "annulé" };
const STATUT_LOT: Record<string, string> = { a_venir: "à venir", en_cours: "en cours", termine: "terminé", suspendu: "suspendu", annule: "annulé" };
const CONFIRMATION: Record<string, string> = { non_demandee: "confirmation pas encore demandée", demandee: "confirmation demandée, sans réponse", confirmee: "confirmé par l'intervenant", declinee: "décliné par l'intervenant", sans_reponse: "aucune réponse à la demande" };

const eur = (n: number | null | undefined) => (n == null ? "?" : `${Math.round(n * 100) / 100} €`);
const ligne = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

export function contexteChantier(t: Tableau, messages: MessageChantier[] = []): string {
  const c = t.chantier;
  const out: string[] = [];
  const auj = new Date().toISOString().slice(0, 10);
  out.push(`Aujourd'hui : ${auj}`);
  out.push(`CHANTIER : ${c.nom} (réf. ${c.reference ?? "?"})`);
  out.push(ligne(`Adresse : ${[c.adresse, c.code_postal, c.commune].filter(Boolean).join(" ")}`, `Statut : ${STATUT_CHANTIER[c.statut] ?? c.statut}`, `Début ${c.date_debut ?? "?"}`, `fin prévue ${c.date_fin_prevue ?? "?"}`, c.date_reception ? `réception ${c.date_reception}` : null));
  out.push(ligne(`Maître d'ouvrage : ${c.maitre_ouvrage_nom ?? "?"}`, c.maitre_ouvrage_type ? `type ${c.maitre_ouvrage_type}` : null, c.nature_marche ? `marché ${c.nature_marche}` : null));
  if (c.description) out.push(`Description :\n${c.description}`);

  const deb = new Map(t.debourse.map((d) => [d.lot_id, d]));
  if (t.lots.length) {
    out.push("\nLOTS :");
    for (const l of t.lots) {
      const d = deb.get(l.id);
      out.push(
        "- " +
          ligne(
            `${l.code} ${l.libelle}`,
            STATUT_LOT[l.statut] ?? l.statut,
            l.equipe_nom ? `équipe ${l.equipe_nom}` : l.tiers_nom ? `sous-traitant ${l.tiers_nom}` : null,
            t.voit_prix && d ? `engagé ${eur((d.engage_marche_ht ?? 0) + (d.engage_avenants_ht ?? 0))}, facturé ${eur(d.facture_ht)}, reste ${eur(d.reste_ht)}` : null,
          ),
      );
    }
  }

  if (t.passages.length) {
    out.push("\nPLANNING (passages) :");
    for (const p of [...t.passages].sort((a, b) => a.debut.localeCompare(b.debut))) {
      out.push(
        "- " +
          ligne(
            p.debut === p.fin ? p.debut : `${p.debut} → ${p.fin}`,
            p.heure_debut ? `${p.heure_debut.slice(0, 5)}-${p.heure_fin?.slice(0, 5) ?? "?"}` : null,
            `lot ${p.lot_code ?? "?"}`,
            p.tache,
            p.intervenant_nom ?? p.intervenant_lu,
            p.statut === "fait" ? "fait" : CONFIRMATION[p.confirmation] ?? p.confirmation,
            p.exterieur ? "en extérieur" : null,
          ),
      );
    }
  }

  const points = [...t.controles, ...t.controles_organisation.filter((k) => !k.chantier_id || k.chantier_id === c.id)];
  if (points.length) {
    out.push("\nPOINTS À RÉGLER :");
    for (const k of points) out.push(`- [${k.gravite}] ${k.message}`);
  }

  for (const m of t.marches) out.push(`\nMARCHÉ : ${ligne(m.statut === "verifie" ? "vérifié" : "à vérifier", t.voit_prix ? `total HT ${eur(m.total_ht_lignes)}` : null, `${m.lignes.length} lignes`)}`);

  if (t.avenants.length) {
    out.push("\nAVENANTS :");
    for (const a of [...t.avenants].sort((x, y) => x.numero - y.numero))
      out.push("- " + ligne(`n° ${a.numero} ${a.objet}`, a.statut, t.voit_prix && a.montant_ht != null ? `${eur(a.montant_ht)} HT` : null, a.signe_le ? `signé le ${a.signe_le.slice(0, 10)}` : null, a.origine?.texte ? `origine : « ${String(a.origine.texte).slice(0, 200)} »` : null));
  }

  const sits = t.situations ?? [];
  if (sits.length && t.voit_prix) {
    out.push("\nSITUATIONS DE TRAVAUX :");
    for (const s of [...sits].sort((a, b) => a.numero - b.numero)) out.push("- " + ligne(`n° ${s.numero} au ${s.periode_fin}`, s.statut, `cumul ${eur(s.cumul_ht)} HT`, `net à payer ${eur(s.net_a_payer)}`));
  }

  const factures = t.factures.filter((f) => f.statut === "rattachee");
  if (factures.length) {
    out.push("\nFACTURES FOURNISSEURS RATTACHÉES :");
    for (const f of factures) out.push("- " + ligne(f.fournisseur_nom ?? "fournisseur inconnu", f.facture_numero ? `n° ${f.facture_numero}` : null, f.lot_code ? `lot ${f.lot_code}` : null, f.date_emission, t.voit_prix ? `${eur(f.montant_ht)} HT` : null));
  }

  const r = t.reception;
  if (r) {
    out.push(`\nRÉCEPTION prononcée le ${r.date_reception}, ${r.avec_reserves ? "avec réserves" : "sans réserve"}.`);
    out.push(ligne(r.retenue_caution ? "Caution de retenue de garantie" : `Retenue de garantie ${eur(r.retenue_montant)}`, `due le ${r.retenue_due_le}`, `état ${r.retenue_etat ?? r.retenue_statut}`, r.opposition_motif ? `opposition : « ${r.opposition_motif} »` : null));
    out.push(ligne(`Décompte final : ${r.decompte_statut}`, r.decompte_reste_ht != null ? `reste ${eur(r.decompte_reste_ht)} HT` : null, r.decompte_echeance ? `à envoyer avant le ${r.decompte_echeance}` : null));
    const lotDe = (id: string | null) => (id ? t.lots.find((l) => l.id === id) : null);
    for (const v of r.reserves) {
      const l = lotDe(v.lot_id);
      out.push("- Réserve " + ligne(`n° ${v.ordre} ${v.description}`, l ? `lot ${l.code} ${l.libelle}` : "hors lot", v.statut === "levee" ? `levée le ${v.levee_le}` : "ouverte", v.avenant_id ? "avenant ouvert" : null));
    }
  }

  const tiers = t.tiers.filter((x) => t.lots.some((l) => l.tiers_id === x.id) || x.id === c.maitre_ouvrage_id);
  if (tiers.length) {
    out.push("\nINTERVENANTS ET CONTACTS :");
    for (const x of tiers) out.push("- " + ligne(x.nom, x.roles.join(", "), x.corps_etat.join(", "), x.telephone, x.commune));
  }

  if (messages.length) {
    out.push("\nMESSAGES DU FIL (WhatsApp, SMS, courriel), du plus récent au plus ancien :");
    for (const m of [...messages].sort((a, b) => b.recu_le.localeCompare(a.recu_le)).slice(0, 40)) {
      const vocaux = (m.lecture?.medias ?? []).filter((x) => x.transcription).map((x) => `vocal : « ${x.transcription} »`);
      out.push("- " + ligne(m.recu_le.slice(0, 16).replace("T", " "), m.de_nom ?? m.de_adresse ?? "?", m.texte ? `« ${m.texte} »` : null, ...vocaux, m.lecture?.resume ? `lu : ${m.lecture.resume}` : null));
    }
  }
  return out.join("\n");
}
