"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Fauteuils (02/11/2026, refonte des pages métiers)

   La page Bookings de Cal.com, au 1:1 : relevé
   docs/refonte-metiers/releves/calcom-bookings.md (coque et jetons :
   calcom-availability.md, branche refs-plain-attio-cal), styles
   ./tir-cal.css. Les deux notions de l'écran d'avant enfin séparées
   (inventaire, § 17-21) : la charge du jour par fauteuil et les
   demi-journées vides des praticiens sont deux onglets distincts.

   Onglets (contrôle segmenté de Cal.com) :
     · Charge du jour (B17, titulaire) : un fauteuil par ligne, groupes
       « Demi-journée vide » / « Les autres » (Today / Next) ;
     · Demi-journées vides (B19, titulaire et collaborateur) : quatorze jours ;
     · Équipe absente (B11, titulaire et assistante) : F2/G4 « Noter une
       absence » (bouton « + Nouveau » de Cal.com), G5 « Clore l'absence »
       confirmé ;
     · À regrouper (B20, titulaire) et Séances longues (B21).
   Une ligne ouvre le panneau de détail flottant de Cal.com (?fauteuil=<id>
   depuis le point du matin : la charge de ce fauteuil).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cal_Sans } from "next/font/google";
import { useSearchParams } from "next/navigation";
import { CAPACITES } from "@/components/espace/tiroma/libelles";
import type { Dossier, MotifAbsenceMembre } from "@/components/espace/tiroma/types";
import { chargerAgenda, type RdvAgenda } from "@/components/espace/tiroma/portes";
import { agendaExemple } from "./exemplesAgenda";
import { RACINE } from "../modules";
import { useTiroma } from "./donnees";
import { copier, exporterCSV, useFavoris, useVues } from "./navigateur";
import "./tir-cal.css";

/* Cal Sans (OFL) : la police de toute la page chez Cal.com (calcom-availability.md) */
const calSans = Cal_Sans({ weight: "400", subsets: ["latin"], variable: "--font-tir-cal", display: "swap" });

const BASE = `${RACINE}/tiroma/fauteuils`;
const MOTIFS: Record<MotifAbsenceMembre, string> = { conge: "Congé", maladie: "Arrêt", formation: "Formation", autre: "Autre" };
const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const jourLong = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const heure = (iso: string) => enDate(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)} %`);
const hm = (m: number) => (m % 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m / 60} h`);
const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function enJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return jourISO(d);
}

type Onglet = "charge" | "agenda" | "vides" | "equipe" | "regrouper" | "longues";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "charge", libelle: "Charge du jour" },
  /* 04/11/2026 (docs/verification/PROMESSES-ECRANS.md, TIROMA n° 47) : l'agenda des rendez-vous, fauteuil par fauteuil */
  { cle: "agenda", libelle: "Agenda" },
  { cle: "vides", libelle: "Demi-journées vides" },
  { cle: "equipe", libelle: "Équipe absente" },
  { cle: "regrouper", libelle: "À regrouper" },
  { cle: "longues", libelle: "Séances longues" },
];

type Ligne = {
  cle: string;
  date: string;
  heures: string;
  pastille?: { texte: string; teinte?: "vert" | "orange" | "rouge" };
  titre: string;
  barre?: boolean;
  qui: string;
  mention?: string;
  note?: string;
  sous?: string;
  detail: { titre: string; lignes: { libelle: string; valeur: string }[] }[];
  action?: { libelle: string; confirmer: string; faire: () => Promise<void> };
  liens?: { libelle: string; href: string }[];
  /* la valeur filtrée par « Filter » (fauteuil, praticien, membre) et la place dans la vue calendrier */
  filtre?: string;
  jours?: { jour: string; moment: "matin" | "apres_midi" | "journee" }[];
};
type Groupe = { libelle: string | null; lignes: Ligne[] };

function Icone({ d, taille = 16 }: { d: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
}
/* Lucide, aux noms relevés (list-filter, calendar, menu, ellipsis, x, chevron-up/down, refresh-ccw, armchair) */
const L = {
  filtre: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  calendrier: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  menu: '<path d="M4 12h16"/><path d="M4 18h16"/><path d="M4 6h16"/>',
  points: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  croix: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  haut: '<path d="m18 15-6-6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  tri: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  cycle: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  fauteuil: '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
};

const STATUTS_RDV: Record<RdvAgenda["statut"], { texte: string; teinte?: "vert" | "orange" | "rouge" }> = {
  prevu: { texte: "Prévu" },
  honore: { texte: "Honoré", teinte: "vert" },
  manque: { texte: "Manqué", teinte: "rouge" },
  annule: { texte: "Annulé", teinte: "rouge" },
  reporte: { texte: "Reporté", teinte: "orange" },
  supprime: { texte: "Supprimé", teinte: "rouge" },
};
export type JourAgenda = { jour: string; rdv: RdvAgenda[] | null; erreur: string | null };

/* l'agenda d'un jour : un groupe par fauteuil, une ligne par rendez-vous (une réservation de Bookings), et les
   créneaux libérés du dossier (créneaux à sauver) posés à leur heure, « libre » */
function lignesAgenda(d: Dossier, a: JourAgenda): Groupe[] {
  const rdv = (a.rdv ?? []).filter((r) => r.statut !== "supprime");
  const praticien = (id: string | null) => d.praticiens.find((p) => p.id === id)?.nom_affiche ?? null;
  const typeRdv = (id: string | null) => d.types.find((x) => x.id === id)?.libelle_source ?? null;
  const fauteuils = [...d.fauteuils.filter((f) => f.actif), { id: "", nom: "Sans fauteuil" }];
  const libres = d.creneaux.filter((c) => c.libre && jourISO(new Date(c.debut)) === a.jour);
  return fauteuils
    .map((f) => {
      const ls: Ligne[] = rdv
        .filter((r) => (r.fauteuil_id ?? "") === f.id)
        .map((r) => {
          const acte = r.libelle ?? typeRdv(r.type_rdv_id) ?? "Rendez-vous";
          const minutes = Math.round((new Date(r.fin).getTime() - new Date(r.debut).getTime()) / 6e4);
          return {
            cle: `rdv:${r.id}`,
            filtre: f.nom,
            date: jourCourt(r.debut),
            heures: `${heure(r.debut)} - ${heure(r.fin)}`,
            pastille: STATUTS_RDV[r.statut],
            titre: `${acte}${r.patient_nom ? ` · ${r.patient_nom}` : ""}`,
            qui: [f.id ? f.nom : null, praticien(r.praticien_id), `${minutes} min`].filter(Boolean).join(" · "),
            detail: [
              { titre: "Quand", lignes: [{ libelle: jourLong(r.debut), valeur: `${heure(r.debut)} - ${heure(r.fin)} (${minutes} min)` }] },
              { titre: "Où", lignes: [{ libelle: "Fauteuil", valeur: f.id ? f.nom : "—" }, { libelle: "Praticien", valeur: praticien(r.praticien_id) ?? "—" }] },
              { titre: "Rendez-vous", lignes: [{ libelle: "Patient", valeur: r.patient_nom ?? "—" }, { libelle: "Acte", valeur: acte }, { libelle: "État", valeur: STATUTS_RDV[r.statut].texte }, ...(r.seance_rang ? [{ libelle: "Séance du plan", valeur: String(r.seance_rang) }] : [])] },
            ],
            liens: r.plan_id ? [{ libelle: "Ouvrir le plan", href: `${RACINE}/tiroma/plans?plan=${encodeURIComponent(r.plan_id)}` }] : undefined,
          };
        });
      for (const c of libres.filter((x) => (x.fauteuil_id ?? "") === f.id)) {
        ls.push({
          cle: `libre:${c.evenement_id}`,
          filtre: f.nom,
          date: jourCourt(c.debut),
          heures: `${heure(c.debut)} - ${heure(c.fin)}`,
          pastille: { texte: "Créneau à sauver", teinte: "orange" },
          titre: `Libre · ${c.minutes} min ${c.type === "annulation" ? "libérées par une annulation" : c.type === "report" ? "libérées par un report" : "libres"}`,
          qui: [f.id ? f.nom : null, c.praticien_nom].filter(Boolean).join(" · "),
          mention: c.candidats.length ? `${c.candidats.length} patient${c.candidats.length > 1 ? "s" : ""} à proposer` : undefined,
          detail: [
            { titre: "Quand", lignes: [{ libelle: jourLong(c.debut), valeur: `${heure(c.debut)} - ${heure(c.fin)} (${c.minutes} min)` }] },
            { titre: "À proposer", lignes: c.candidats.length ? c.candidats.map((k) => ({ libelle: `${k.rang}. ${k.patient_nom}`, valeur: k.motif })) : [{ libelle: "Aucun patient", valeur: "" }] },
          ],
          liens: [{ libelle: "Ouvrir le créneau", href: `${RACINE}/tiroma/creneaux?creneau=${encodeURIComponent(String(c.evenement_id))}` }],
        });
      }
      ls.sort((x, y) => x.heures.localeCompare(y.heures));
      const n = ls.filter((l) => l.cle.startsWith("rdv:")).length;
      return { libelle: `${f.nom} · ${n} rendez-vous`, lignes: ls };
    })
    .filter((g) => g.lignes.length);
}

function lignes(d: Dossier, onglet: Onglet, clore: (id: string) => Promise<void>, agenda?: JourAgenda): Groupe[] {
  const titulaire = d.profil === "titulaire";
  if (onglet === "agenda") return agenda ? lignesAgenda(d, agenda) : [];
  if (onglet === "charge") {
    const c = titulaire ? d.charge : null;
    if (!c) return [];
    const toutes: Ligne[] = c.fauteuils.map((f) => {
      const vide = f.journee.vide ? "Journée vide" : f.matin.vide ? "Matinée vide" : f.apres_midi.vide ? "Après-midi vide" : null;
      return {
        cle: f.fauteuil_id,
        filtre: f.nom,
        jours: [{ jour: c.jour, moment: "journee" as const }],
        date: f.nom,
        heures: `${pct(f.matin.taux)} / ${pct(f.apres_midi.taux)}`,
        pastille: vide ? { texte: vide, teinte: "orange" } : { texte: `${pct(f.journee.taux)} prévu` },
        titre: `${f.nom} : ${pct(f.journee.taux)} prévu sur la journée${f.objectif_occupation ? `, objectif ${pct(f.objectif_occupation)}` : ""}`,
        qui: `${f.capacites.map((k) => CAPACITES[k] ?? k).join(", ")} · ${f.assistante_habituelle ? `avec ${f.assistante_habituelle}` : "sans assistante habituelle"}`,
        mention: f.sans_assistante_exigee ? `${f.sans_assistante_exigee} soin${f.sans_assistante_exigee > 1 ? "s" : ""} exige${f.sans_assistante_exigee > 1 ? "nt" : ""} une assistante : à basculer` : undefined,
        note: `${f.rendez_vous} rendez-vous · ${hm(f.journee.prevu_min)} prévues sur ${hm(f.journee.ouvert_min)} ouvertes`,
        detail: [
          { titre: "Quand", lignes: [{ libelle: jourLong(c.jour), valeur: `seuil de demi-journée vide : ${pct(c.seuil_demi_journee_vide)}` }] },
          { titre: "Charge", lignes: [{ libelle: "Matin", valeur: `${pct(f.matin.taux)} · ${hm(f.matin.prevu_min)} sur ${hm(f.matin.ouvert_min)}${f.matin.vide ? " · vide" : ""}` }, { libelle: "Après-midi", valeur: `${pct(f.apres_midi.taux)} · ${hm(f.apres_midi.prevu_min)} sur ${hm(f.apres_midi.ouvert_min)}${f.apres_midi.vide ? " · vide" : ""}` }, { libelle: "Journée", valeur: `${pct(f.journee.taux)} · ${f.rendez_vous} rendez-vous` }] },
          { titre: "Qui", lignes: [{ libelle: "Assistante habituelle", valeur: f.assistante_habituelle ?? "—" }, { libelle: "Capacités", valeur: f.capacites.map((k) => CAPACITES[k] ?? k).join(", ") }] },
          { titre: "Objectif", lignes: [{ libelle: "Occupation visée", valeur: pct(f.objectif_occupation) }] },
        ],
        liens: [
          { libelle: "Soins à regrouper", href: `${BASE}?vue=regrouper` },
          { libelle: "Équipe absente", href: `${BASE}?vue=equipe` },
          { libelle: "Objectifs (Pilotage)", href: `${RACINE}/tiroma/pilotage` },
        ],
      };
    });
    return [
      { libelle: `Demi-journée vide · ${c.demi_journees_vides} sous ${pct(c.seuil_demi_journee_vide)}`, lignes: toutes.filter((l) => l.pastille?.teinte === "orange") },
      { libelle: `Les autres · ${pct(c.total.taux)} prévu sur le cabinet`, lignes: toutes.filter((l) => l.pastille?.teinte !== "orange") },
    ].filter((g) => g.lignes.length);
  }
  if (onglet === "vides") {
    const dj = d.profil === "titulaire" || d.profil === "collaborateur" ? d.demiJournees : null;
    if (!dj) return [];
    const auj = jourISO(new Date());
    const ls: Ligne[] = dj.demi_journees.map((x) => ({
      cle: `${x.praticien_id}-${x.jour}-${x.moment}`,
      filtre: x.praticien,
      jours: [{ jour: x.jour, moment: x.moment }],
      date: jourCourt(x.jour),
      heures: x.moment === "matin" ? "Matin" : "Après-midi",
      pastille: x.jour === auj ? { texte: "Aujourd'hui", teinte: "rouge" } : x.jour === enJours(auj, 1) ? { texte: "Demain", teinte: "orange" } : undefined,
      titre: `${x.praticien} : ${hm(x.libre_min)} libres sur ${hm(x.ouvert_min)}`,
      qui: x.prevu_min ? `Occupée à ${pct(x.taux)}` : "Aucun rendez-vous",
      mention: x.attente ? `${x.attente} patient${x.attente > 1 ? "s" : ""} en liste d'attente` : undefined,
      note: x.source === "habitude" ? "D'après ses demi-journées habituelles" : "D'après ses horaires",
      detail: [
        { titre: "Quand", lignes: [{ libelle: jourLong(x.jour), valeur: x.moment === "matin" ? "Matin" : "Après-midi" }] },
        { titre: "Qui", lignes: [{ libelle: "Praticien", valeur: x.praticien }] },
        { titre: "Remplissage", lignes: [{ libelle: "Ouvert", valeur: hm(x.ouvert_min) }, { libelle: "Prévu", valeur: hm(x.prevu_min) }, { libelle: "Libre", valeur: hm(x.libre_min) }, { libelle: "Liste d'attente", valeur: String(x.attente) }] },
      ],
      liens: [{ libelle: "Liste d'attente", href: `${RACINE}/tiroma/creneaux?vue=attente` }],
    }));
    return [
      { libelle: "Cette semaine", lignes: ls.filter((l) => dj.demi_journees.find((x) => `${x.praticien_id}-${x.jour}-${x.moment}` === l.cle && x.jour <= enJours(auj, 6))) },
      { libelle: "Ensuite", lignes: ls.filter((l) => dj.demi_journees.find((x) => `${x.praticien_id}-${x.jour}-${x.moment}` === l.cle && x.jour > enJours(auj, 6))) },
    ].filter((g) => g.lignes.length);
  }
  if (onglet === "equipe") {
    const eq = d.profil === "titulaire" || d.profil === "assistante" ? d.equipe : null;
    if (!eq) return [];
    return [{
      libelle: null,
      lignes: eq.map((a) => ({
        cle: a.absence_id,
        filtre: a.membre,
        jours: (() => {
          const js: { jour: string; moment: "journee" }[] = [];
          for (let t0 = new Date(a.debut); t0 < new Date(a.fin) && js.length < 31; t0 = new Date(t0.getTime() + 864e5)) js.push({ jour: jourISO(t0), moment: "journee" });
          return js;
        })(),
        date: `${jourCourt(a.debut)}`,
        heures: `au ${jourCourt(new Date(new Date(a.fin).getTime() - 1).toISOString())}`,
        pastille: { texte: MOTIFS[a.motif], teinte: "orange" as const },
        titre: `${a.membre}${a.fauteuil_nom ? ` — ${a.fauteuil_nom}` : ""}`,
        qui: a.soins.length ? `${a.soins.length} soin${a.soins.length > 1 ? "s" : ""} exige${a.soins.length > 1 ? "nt" : ""} une assistante` : "Aucun soin à basculer",
        sous: a.soins.map((s) => `${jourCourt(s.debut)} ${heure(s.debut)} · ${s.patient_nom}${s.soin ? ` · ${s.soin}` : ""} → ${s.vers.length ? `vers ${s.vers[0].fauteuil_nom} (avec ${s.vers[0].assistante})` : "aucun fauteuil libre"}`).join("\n"),
        note: "Le basculement se fait dans le logiciel du cabinet.",
        detail: [
          { titre: "Quand", lignes: [{ libelle: `Du ${jourLong(a.debut)}`, valeur: `au ${jourLong(new Date(new Date(a.fin).getTime() - 1).toISOString())}` }] },
          { titre: "Qui", lignes: [{ libelle: a.membre, valeur: MOTIFS[a.motif] }, { libelle: "Fauteuil habituel", valeur: a.fauteuil_nom ?? "—" }] },
          { titre: "Soins à basculer", lignes: a.soins.length ? a.soins.map((s) => ({ libelle: `${jourCourt(s.debut)} ${heure(s.debut)} · ${s.patient_nom}`, valeur: `${s.soin ?? "Soin"} → ${s.vers.length ? `${s.vers[0].fauteuil_nom} (avec ${s.vers[0].assistante})` : "aucun fauteuil libre"}` })) : [{ libelle: "Aucun", valeur: "" }] },
        ],
        action: { libelle: "Clore l'absence", confirmer: `Clore l'absence de ${a.membre} ? Elle reste dans l'historique.`, faire: () => clore(a.absence_id) },
      })),
    }];
  }
  if (onglet === "regrouper") {
    const s = titulaire ? d.soinsADeplacer : null;
    if (!s) return [];
    return [{
      libelle: null,
      lignes: s.demi_journees.map((x) => ({
        cle: `${x.fauteuil_id}-${x.jour}-${x.moment}`,
        filtre: x.fauteuil,
        jours: [{ jour: x.jour, moment: x.moment }],
        date: jourCourt(x.jour),
        heures: x.moment === "matin" ? "Matin" : "Après-midi",
        pastille: x.libere ? { texte: "Peut se libérer", teinte: "vert" as const } : { texte: "Un soin reste sans place", teinte: "rouge" as const },
        titre: `${x.fauteuil} : ${pct(x.taux)} occupé`,
        qui: `${x.soins.length} soin${x.soins.length > 1 ? "s" : ""} à déplacer`,
        sous: x.soins.map((so) => `${heure(so.debut)} · ${so.patient_nom}${so.soin ? ` · ${so.soin}` : ""} → ${so.vers.length ? so.vers.map((v) => `${v.fauteuil} (${pct(v.taux)}${v.assistante ? `, avec ${v.assistante}` : ""})`).join(", ") : "aucun fauteuil possible"}`).join("\n"),
        note: "Tiroma ne déplace rien : le rendez-vous se déplace dans le logiciel du cabinet.",
        detail: [
          { titre: "Quand", lignes: [{ libelle: jourLong(x.jour), valeur: x.moment === "matin" ? "Matin" : "Après-midi" }] },
          { titre: "Soins", lignes: x.soins.map((so) => ({ libelle: `${heure(so.debut)} · ${so.patient_nom}`, valeur: so.vers.map((v) => v.fauteuil).join(", ") || "aucun fauteuil" })) },
        ],
      })),
    }];
  }
  const sl = d.seancesLongues;
  if (!sl) return [];
  return [{
    libelle: null,
    lignes: sl.map((x) => ({
      cle: x.rendez_vous_id,
      filtre: x.fauteuil ?? "Sans fauteuil",
      jours: [{ jour: jourISO(new Date(x.debut)), moment: new Date(x.debut).getHours() < 13 ? ("matin" as const) : ("apres_midi" as const) }],
      date: jourCourt(x.debut),
      heures: `${heure(x.debut)} - ${heure(x.fin)}`,
      pastille: { texte: `${x.minutes} min`, teinte: x.raisons.length > 1 ? "rouge" as const : "orange" as const },
      titre: `${x.soin ?? "Séance"} — ${x.patient_nom}`,
      qui: [x.fauteuil, x.praticien].filter(Boolean).join(" · "),
      mention: `${x.raisons.length} problème${x.raisons.length > 1 ? "s" : ""}`,
      sous: x.raisons.join("\n"),
      detail: [
        { titre: "Quand", lignes: [{ libelle: jourLong(x.debut), valeur: `${heure(x.debut)} - ${heure(x.fin)} (${x.minutes} min)` }] },
        { titre: "Où", lignes: [{ libelle: "Fauteuil", valeur: x.fauteuil ?? "—" }, { libelle: "Praticien", valeur: x.praticien ?? "—" }] },
        { titre: "Raisons", lignes: x.raisons.map((r) => ({ libelle: r, valeur: "" })) },
      ],
    })),
  }];
}

function Vide({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="cal-vide">
      <span className="cal-vide-icone"><Icone d={L.calendrier} /></span>
      <h3>{titre}</h3>
      <p>{texte}</p>
    </div>
  );
}

const VIDES: Record<Onglet, [string, string]> = {
  agenda: ["Aucun rendez-vous ce jour-là", "Le logiciel du cabinet n'a exporté aucun rendez-vous pour ce jour : changez de jour avec ‹ ›."],
  charge: ["Aucune charge à montrer", "Aucun fauteuil ou aucun horaire : posez-les dans les réglages. Vue réservée au titulaire."],
  vides: ["Aucune demi-journée vide", "Aucune demi-journée sous le seuil sur les quatorze prochains jours."],
  equipe: ["Personne n'est absent", "Notez l'absence d'une assistante : Tiroma dit quels soins basculer et vers quel fauteuil."],
  regrouper: ["Rien à regrouper", "Aucune demi-journée à vide dans les deux prochains jours."],
  longues: ["Aucune séance mal placée", "Les séances d'une heure et plus et les chirurgies des sept prochains jours sont bien placées."],
};

function Absence({ fermer }: { fermer: () => void }) {
  const t = useTiroma();
  const d = t.dossier;
  const jour = d?.appels?.jour ?? jourISO(new Date());
  const membres = (d?.membres ?? []).filter((m) => m.actif);
  const [membre, setMembre] = useState(membres[0]?.id ?? "");
  const [du, setDu] = useState(jour);
  const [au, setAu] = useState(jour);
  const [motif, setMotif] = useState<MotifAbsenceMembre>("conge");
  const [avis, setAvis] = useState<{ ok: boolean; t: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  /* 03/11/2026 — un second clic sur « Noter » doublait l'absence : la même
     saisie ne se note qu'une fois (le bouton revient dès qu'un champ change),
     et Échap referme le panneau comme les autres volets. */
  const saisie = `${membre}|${du}|${au}|${motif}`;
  const [notee, setNotee] = useState<string | null>(null);
  useEffect(() => {
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [fermer]);
  const noter = async () => {
    setOccupe(true);
    setAvis(null);
    try {
      await t.noterAbsence({ membre_id: membre, debut: new Date(`${du}T00:00:00`).toISOString(), fin: new Date(`${enJours(au, 1)}T00:00:00`).toISOString(), motif });
      setNotee(saisie);
      setAvis({ ok: true, t: "C'est noté. Les soins à basculer s'affichent dans la liste." });
    } catch (e) {
      setAvis({ ok: false, t: e instanceof Error ? e.message : "La base n'a pas répondu." });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <aside className="cal-panneau" aria-label="Noter une absence">
      <div className="cal-panneau-tete">
        <span className="cal-pastille cal-pastille--orange">Absence</span>
        <span className="cal-pousse" />
        <button type="button" className="cal-icone-bouton" aria-label="Fermer" onClick={fermer}><Icone d={L.croix} /></button>
      </div>
      <h2 className="cal-panneau-titre">Noter une absence</h2>
      <div className="cal-panneau-corps">
        <label className="cal-champ"><span>Qui</span><select value={membre} onChange={(e) => setMembre(e.target.value)}>{membres.map((m) => <option key={m.id} value={m.id}>{m.prenom}</option>)}</select></label>
        <label className="cal-champ"><span>Du</span><input type="date" value={du} min={enJours(jour, -7)} max={enJours(jour, 365)} onChange={(e) => setDu(e.target.value)} /></label>
        <label className="cal-champ"><span>Au (inclus)</span><input type="date" value={au} min={du} max={enJours(du || jour, 365)} onChange={(e) => setAu(e.target.value)} /></label>
        <div className="cal-champ"><span>Motif</span>
          <div className="cal-choix" role="radiogroup" aria-label="Motif">
            {(Object.keys(MOTIFS) as MotifAbsenceMembre[]).map((k) => <button key={k} type="button" role="radio" aria-checked={motif === k} className="cal-bouton" onClick={() => setMotif(k)}>{MOTIFS[k]}</button>)}
          </div>
        </div>
        <p className="cal-aide">Aucune raison médicale n&apos;est demandée.</p>
        {avis ? <p className={avis.ok ? "cal-ok" : "cal-erreur"} role={avis.ok ? "status" : "alert"}>{avis.t}</p> : null}
      </div>
      <div className="cal-panneau-pied">
        <button type="button" className="cal-bouton" onClick={fermer}>Fermer</button>
        <button type="button" className="cal-bouton cal-bouton--plein" disabled={occupe || !membre || !du || !au || au < du || notee === saisie} onClick={() => void noter()}>Noter</button>
      </div>
    </aside>
  );
}

/* vue calendrier (?view=calendar de Cal.com) : la semaine, une colonne par jour, matin / après-midi ; ‹ › et « Aujourd'hui » */
function Calendrier({ lignes: ls, semaine, setSemaine, ouvrir }: { lignes: Ligne[]; semaine: number; setSemaine: (n: number) => void; ouvrir: (cle: string) => void }) {
  const lundi = new Date();
  lundi.setHours(12, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7) + 7 * semaine);
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return jourISO(d);
  });
  const auj = jourISO(new Date());
  const dans = (j: string, m: "matin" | "apres_midi") => ls.filter((l) => (l.jours ?? []).some((x) => x.jour === j && (x.moment === m || x.moment === "journee")));
  return (
    <div className="cal-calendrier">
      <div className="cal-cal-barre">
        <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Semaine précédente" onClick={() => setSemaine(semaine - 1)}><Icone d={'<path d="m15 18-6-6 6-6"/>'} /></button>
        <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Semaine suivante" onClick={() => setSemaine(semaine + 1)}><Icone d={'<path d="m9 18 6-6-6-6"/>'} /></button>
        <button type="button" className="cal-bouton" onClick={() => setSemaine(0)}>Aujourd&apos;hui</button>
        <span className="cal-cal-mois">{enDate(jours[0]).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
      </div>
      <div className="cal-cal-grille">
        <span className="cal-cal-coin">AST</span>
        {jours.map((j) => (
          <span key={j} className="cal-cal-jour">
            {enDate(j).toLocaleDateString("fr-FR", { weekday: "short" })}
            <span className={`cal-cal-num${j === auj ? " cal-cal-num--auj" : ""}`}>{enDate(j).getDate()}</span>
          </span>
        ))}
        {(["matin", "apres_midi"] as const).map((m) => (
          <div key={m} className="cal-cal-rangee">
            <span className="cal-cal-heure">{m === "matin" ? "Matin" : "Après-midi"}</span>
            {jours.map((j) => (
              <div key={j} className="cal-cal-case">
                {dans(j, m).map((l) => (
                  <button key={l.cle} type="button" className={`cal-cal-evt${l.pastille?.teinte ? ` cal-cal-evt--${l.pastille.teinte}` : ""}`} onClick={() => ouvrir(l.cle)} title={l.titre}>
                    {l.titre}
                  </button>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* l'agenda en grille (vue calendrier de Cal.com, colonnes = fauteuils) : 8 h - 19 h, un bloc par rendez-vous */
const DEBUT_GRILLE = 8 * 60;
const FIN_GRILLE = 19 * 60;
const PX_MIN = 1.4;
function GrilleAgenda({ groupes, ouvrir }: { groupes: Groupe[]; ouvrir: (cle: string) => void }) {
  const colonnes = groupes.map((g) => ({ nom: g.lignes[0]?.filtre ?? "", lignes: g.lignes }));
  const minutes = (iso: string) => {
    const x = new Date(iso);
    return x.getHours() * 60 + x.getMinutes();
  };
  const heures = Array.from({ length: (FIN_GRILLE - DEBUT_GRILLE) / 60 }, (_, i) => DEBUT_GRILLE / 60 + i);
  return (
    <div className="cal-ag" style={{ "--cal-ag-colonnes": colonnes.length } as React.CSSProperties}>
      <div className="cal-ag-tete">
        <span className="cal-cal-coin" />
        {colonnes.map((c) => (
          <span key={c.nom} className="cal-cal-jour cal-ag-fauteuil"><Icone d={L.fauteuil} taille={14} />{c.nom}</span>
        ))}
      </div>
      <div className="cal-ag-corps" style={{ height: (FIN_GRILLE - DEBUT_GRILLE) * PX_MIN }}>
        <div className="cal-ag-heures">
          {heures.map((h) => (
            <span key={h} className="cal-ag-heure" style={{ top: (h * 60 - DEBUT_GRILLE) * PX_MIN }}>{String(h).padStart(2, "0")}:00</span>
          ))}
        </div>
        {colonnes.map((c) => (
          <div key={c.nom} className="cal-ag-colonne">
            {heures.map((h) => <span key={h} className="cal-ag-trait" style={{ top: (h * 60 - DEBUT_GRILLE) * PX_MIN }} />)}
            {c.lignes.map((l) => {
              const [debut, fin] = l.heures.split(" - ");
              const iso = (hhmm: string) => `2000-01-01T${hhmm}:00`;
              const m0 = Math.max(DEBUT_GRILLE, minutes(iso(debut)));
              const m1 = Math.min(FIN_GRILLE, minutes(iso(fin)));
              if (m1 <= m0) return null;
              const libre = l.cle.startsWith("libre:");
              return (
                <div
                  key={l.cle}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") ouvrir(l.cle); }}
                  className={`cal-cal-evt cal-ag-evt${l.pastille?.teinte ? ` cal-cal-evt--${l.pastille.teinte}` : ""}`}
                  data-libre={libre ? "" : undefined}
                  style={{ top: (m0 - DEBUT_GRILLE) * PX_MIN, height: Math.max(14, (m1 - m0) * PX_MIN - 2) }}
                  title={`${l.heures} · ${l.titre}`}
                  onClick={() => ouvrir(l.cle)}
                >
                  <span className="cal-ag-evt-heure">{debut}</span> {libre ? "libre · Créneau à sauver" : l.titre}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Fauteuils() {
  const t = useTiroma();
  const params = useSearchParams();
  const d = t.dossier;
  const fauteuilVise = params.get("fauteuil");
  const onglet = (ONGLETS.find((o) => o.cle === params.get("vue"))?.cle ?? "charge") as Onglet;
  const [ouverte, setOuverte] = useState<string | null>(fauteuilVise);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirme, setConfirme] = useState<string | null>(null);
  const [absence, setAbsence] = useState(params.get("absence") === "1");
  const vueCal = params.get("affichage") === "calendrier" ? "calendrier" : "liste";
  const filtreVal = params.get("filtre");
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const [avis, setAvis] = useState<string | null>(null);
  const [confirmeLot, setConfirmeLot] = useState(false);
  const [semaine, setSemaine] = useState(0);
  /* l'agenda : le jour montré (décalage depuis aujourd'hui), lu en base ou dans l'exemple */
  const [decalage, setDecalage] = useState(0);
  const jourAgenda = enJours(jourISO(new Date()), decalage);
  const [agendaLu, setAgendaLu] = useState<JourAgenda | null>(null);
  const entiteCabinet = d?.cabinet.entite_id ?? null;
  useEffect(() => {
    if (onglet !== "agenda" || t.source !== "reelle" || !entiteCabinet) return;
    let vivant = true;
    chargerAgenda(entiteCabinet, jourAgenda)
      .then((rdv) => vivant && setAgendaLu({ jour: jourAgenda, rdv, erreur: null }))
      .catch((e: unknown) => vivant && setAgendaLu({ jour: jourAgenda, rdv: null, erreur: e instanceof Error ? e.message : "La base n'a pas répondu." }));
    return () => {
      vivant = false;
    };
  }, [onglet, t.source, entiteCabinet, jourAgenda]);
  const agenda: JourAgenda =
    t.source === "exemple" ? { jour: jourAgenda, rdv: agendaExemple(jourAgenda, d?.creneaux ?? []), erreur: null } : agendaLu && agendaLu.jour === jourAgenda ? agendaLu : { jour: jourAgenda, rdv: null, erreur: null };
  const [favoris, poserFavori] = useFavoris();
  const [vues, poserVue] = useVues();
  const annoncer = (texte: string) => {
    setAvis(texte);
    window.setTimeout(() => setAvis(null), 4000);
  };
  const adresse = (modif: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    q.delete("fauteuil");
    q.delete("absence");
    return q.toString() ? `${BASE}?${q.toString()}` : BASE;
  };

  useEffect(() => {
    if (!menu) return;
    const fermer = () => setMenu(null);
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("click", fermer);
    window.addEventListener("keydown", echap);
    return () => {
      window.removeEventListener("click", fermer);
      window.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const groupesBruts = d ? lignes(d, onglet, (id) => { const a = d.equipe?.find((x) => x.absence_id === id); return a ? t.cloreAbsence(a) : Promise.resolve(); }, agenda) : [];
  const valeursFiltre = [...new Set(groupesBruts.flatMap((g) => g.lignes.map((l) => l.filtre).filter((x): x is string => !!x)))];
  const groupes = groupesBruts.map((g) => ({ ...g, lignes: g.lignes.filter((l) => !filtreVal || l.filtre === filtreVal) })).filter((g) => g.lignes.length);
  const toutes = groupes.flatMap((g) => g.lignes);
  const choisiesL = toutes.filter((l) => choisies.has(l.cle));
  const resumeL = (l: Ligne) => [l.titre, `${l.date} · ${l.heures}`, l.qui, l.mention, l.sous, l.note].filter(Boolean).join("\n");
  const exporter = (ls: Ligne[]) => {
    exporterCSV(`tiroma-fauteuils-${onglet}`, ["Date ou fauteuil", "Horaire ou taux", "État", "Titre", "Qui", "Mention", "Détail", "Note"], ls.map((l) => [l.date, l.heures, l.pastille?.texte ?? "", l.titre, l.qui, l.mention ?? "", (l.sous ?? "").replace(/\n/g, " / "), l.note ?? ""]));
    annoncer("Liste exportée en CSV.");
  };
  const epingler = (l: Ligne) => {
    const k = `fauteuils-${onglet}-${l.cle}`;
    const oui = !favoris[k];
    poserFavori(k, oui ? { titre: l.titre, href: `${BASE}?${onglet === "charge" ? `fauteuil=${encodeURIComponent(l.cle)}` : `vue=${onglet}`}`, type: ONGLETS.find((o) => o.cle === onglet)?.libelle ?? "Fauteuils", depuis: new Date().toISOString() } : null);
    annoncer(oui ? "Épinglé en tête d'Aujourd'hui." : "Désépinglé.");
  };
  const detail = ouverte ? toutes.find((l) => l.cle === ouverte) ?? null : null;
  const i = detail ? toutes.indexOf(detail) : -1;
  const peutAbsence = !!d && (d.profil === "titulaire" || d.profil === "assistante") && d.membres.some((m) => m.actif);

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${RACINE}/tiroma/reglages`}>Installer le cabinet</Link></>;
  else if (!d) etat = "Lecture du cabinet…";
  else if (onglet === "agenda" && agenda.erreur) etat = `L'agenda n'a pas pu être lu. ${agenda.erreur}`;
  else if (onglet === "agenda" && !agenda.rdv) etat = "Lecture de l'agenda…";

  return (
    <div className={`tir-cal ${calSans.variable}`}>
      <div className="cal-carte">
        <div className="cal-defile">
          <div className="cal-outils">
            <nav className="cal-segment" aria-label="Onglets">
              {ONGLETS.map((o) => (
                <Link key={o.cle} href={o.cle === "charge" ? BASE : `${BASE}?vue=${o.cle}`} className="cal-segment-item" aria-current={onglet === o.cle ? "page" : undefined} onClick={() => setOuverte(null)}>{o.libelle}</Link>
              ))}
            </nav>
            <span className="cal-ancre">
              <button type="button" className="cal-bouton cal-filtre" aria-expanded={menu === "filtre"} onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === "filtre" ? null : "filtre")); }}>
                <Icone d={L.filtre} />Filtrer{filtreVal ? <span className="cal-filtre-val">: {filtreVal}</span> : null}
              </button>
              {menu === "filtre" ? (
                <div className="cal-menu cal-menu--gauche" role="menu" onClick={(e) => e.stopPropagation()}>
                  <div className="cal-menu-titre">{onglet === "vides" ? "Praticien" : onglet === "equipe" ? "Membre de l'équipe" : "Fauteuil"}</div>
                  {valeursFiltre.map((v) => (
                    <Link key={v} href={adresse({ filtre: filtreVal === v ? null : v })} role="menuitemradio" aria-checked={filtreVal === v} className="cal-menu-item" onClick={() => setMenu(null)}>{v}</Link>
                  ))}
                  {!valeursFiltre.length ? <span className="cal-menu-item cal-menu-item--vide">Rien à filtrer</span> : null}
                  {filtreVal ? <Link href={adresse({ filtre: null })} role="menuitem" className="cal-menu-item" onClick={() => setMenu(null)}>Retirer le filtre</Link> : null}
                </div>
              ) : null}
            </span>
            <span className="cal-pousse" />
            {avis ? <span className="cal-avis" role="status">{avis}</span> : null}
            {peutAbsence ? (
              <button type="button" className="cal-bouton cal-bouton--plein" onClick={() => { setAbsence(true); setOuverte(null); }}>
                <Icone d={L.plus} />Noter une absence
              </button>
            ) : null}
            <span className="cal-ancre">
              <button type="button" className="cal-bouton cal-vues" aria-expanded={menu === "vues"} onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === "vues" ? null : "vues")); }}>
                Vues enregistrées<Icone d={L.tri} />
              </button>
              {menu === "vues" ? (
                <div className="cal-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                  {Object.entries(vues).map(([k, v]) => (
                    <span key={k} className="cal-menu-ligne">
                      <Link href={v.href} role="menuitem" className="cal-menu-item" onClick={() => setMenu(null)}>{v.nom}</Link>
                      <button type="button" className="cal-icone-bouton" aria-label={`Supprimer ${v.nom}`} onClick={() => poserVue(k, null)}><Icone d={L.croix} taille={14} /></button>
                    </span>
                  ))}
                  {Object.keys(vues).length ? <div className="cal-menu-sep" /> : null}
                  <button type="button" role="menuitem" className="cal-menu-item" onClick={() => { const nom = `${ONGLETS.find((o) => o.cle === onglet)?.libelle}${filtreVal ? ` · ${filtreVal}` : ""}${vueCal === "calendrier" ? " · calendrier" : ""}`; poserVue(nom, { nom, href: adresse({}) }); setMenu(null); annoncer(`Vue « ${nom} » enregistrée.`); }}>Enregistrer cette vue</button>
                </div>
              ) : null}
            </span>
            <div className="cal-segment cal-segment--icones" role="radiogroup" aria-label="Vue">
              <Link href={adresse({ affichage: null })} role="radio" aria-checked={vueCal === "liste"} className="cal-segment-item" aria-label="Liste"><Icone d={L.menu} /></Link>
              <Link href={adresse({ affichage: "calendrier" })} role="radio" aria-checked={vueCal === "calendrier"} className="cal-segment-item" aria-label="Calendrier"><Icone d={L.calendrier} /></Link>
            </div>
          </div>

          {onglet === "agenda" && d ? (
            <div className="cal-cal-barre cal-ag-barre">
              <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Jour précédent" onClick={() => { setDecalage(decalage - 1); setOuverte(null); }}><Icone d={'<path d="m15 18-6-6 6-6"/>'} /></button>
              <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Jour suivant" onClick={() => { setDecalage(decalage + 1); setOuverte(null); }}><Icone d={'<path d="m9 18 6-6-6-6"/>'} /></button>
              <button type="button" className="cal-bouton" onClick={() => { setDecalage(0); setOuverte(null); }}>Aujourd&apos;hui</button>
              <span className="cal-cal-mois">{jourLong(jourAgenda)}</span>
            </div>
          ) : null}
          {etat ? <div className="cal-etat">{etat}</div> : null}
          {!etat && !groupes.length ? <Vide titre={VIDES[onglet][0]} texte={VIDES[onglet][1]} /> : null}
          {!etat && groupes.length && vueCal === "calendrier" && onglet === "agenda" ? (
            <GrilleAgenda groupes={groupes} ouvrir={(cle) => { setOuverte(cle); setAbsence(false); }} />
          ) : null}
          {!etat && groupes.length && vueCal === "calendrier" && onglet !== "agenda" ? (
            <Calendrier lignes={toutes} semaine={semaine} setSemaine={setSemaine} ouvrir={(cle) => { setOuverte(cle); setAbsence(false); }} />
          ) : null}
          {!etat && groupes.length && vueCal === "liste" ? (
            <div className="cal-liste">
              {groupes.map((g, gi) => (
                <div key={gi} className="cal-groupe">
                  {g.libelle ? <div className="cal-groupe-tete">{g.libelle}</div> : null}
                  <div className="cal-panneau-int">
                    {g.lignes.map((l) => (
                      <div key={l.cle} className="cal-ligne" data-ouverte={ouverte === l.cle ? "" : undefined} onClick={() => { setOuverte(l.cle); setAbsence(false); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setOuverte(l.cle); }}>
                        <span
                          className="cal-case"
                          role="checkbox"
                          aria-checked={choisies.has(l.cle)}
                          aria-label="Choisir la ligne"
                          tabIndex={0}
                          data-coche={choisies.has(l.cle) ? "" : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            setChoisies((c) => { const n = new Set(c); if (n.has(l.cle)) n.delete(l.cle); else n.add(l.cle); return n; });
                          }}
                        >
                          {choisies.has(l.cle) ? <Icone d={'<path d="M20 6 9 17l-5-5"/>'} taille={12} /> : null}
                        </span>
                        <div className="cal-date">
                          <span className="cal-date-jour">{l.date}</span>
                          <span className="cal-date-heures">{l.heures}</span>
                          {l.pastille ? <span className={`cal-badge${l.pastille.teinte ? ` cal-badge--${l.pastille.teinte}` : ""}`}><Icone d={L.fauteuil} taille={14} />{l.pastille.texte}</span> : null}
                        </div>
                        <div className="cal-contenu">
                          <span className="cal-titre">{l.titre}</span>
                          <span className="cal-qui">{l.qui}</span>
                          {l.mention ? <span className="cal-mention">{l.mention}</span> : null}
                          {l.sous ? <span className="cal-sous">{l.sous}</span> : null}
                          {l.note ? <span className="cal-note">&quot;{l.note}&quot;</span> : null}
                        </div>
                        <div className="cal-droite" onClick={(e) => e.stopPropagation()}>
                          {l.action ? (
                            confirme === l.cle ? (
                              <>
                                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => setConfirme(null)}>Annuler</button>
                                <button type="button" className="cal-bouton cal-bouton--petit cal-bouton--plein" onClick={() => { setConfirme(null); void l.action?.faire(); }}>Confirmer</button>
                              </>
                            ) : (
                              <button type="button" className="cal-bouton cal-bouton--petit" title={l.action.confirmer} onClick={() => setConfirme(l.cle)}>{l.action.libelle}</button>
                            )
                          ) : null}
                          <span className="cal-ancre">
                            <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Plus" aria-expanded={menu === l.cle} onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === l.cle ? null : l.cle)); }}><Icone d={L.points} /></button>
                            {menu === l.cle ? (
                              <div className="cal-menu" role="menu">
                                <button type="button" role="menuitem" className="cal-menu-item" onClick={() => setOuverte(l.cle)}>Ouvrir le détail</button>
                                <button type="button" role="menuitem" className="cal-menu-item" onClick={() => epingler(l)}>{favoris[`fauteuils-${onglet}-${l.cle}`] ? "Désépingler" : "Épingler dans Aujourd'hui"}</button>
                                <button type="button" role="menuitem" className="cal-menu-item" onClick={() => void copier(resumeL(l)).then((ok) => annoncer(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie."))}>Copier pour l&apos;assistant</button>
                                {(l.liens ?? []).map((k) => <Link key={k.href} href={k.href} role="menuitem" className="cal-menu-item">{k.libelle}</Link>)}
                                {l.action ? <button type="button" role="menuitem" className="cal-menu-item cal-menu-item--rouge" onClick={() => setConfirme(l.cle)}>{l.action.libelle}</button> : null}
                              </div>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {choisiesL.length ? (
          <div className="cal-lot" role="toolbar" aria-label="Actions sur la sélection">
            {confirmeLot ? (
              <>
                <span className="cal-lot-compte">Clore {choisiesL.filter((l) => l.action).length} absence(s) ? Elles restent dans l&apos;historique.</span>
                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => setConfirmeLot(false)}>Annuler</button>
                <button type="button" className="cal-bouton cal-bouton--petit cal-bouton--plein" onClick={() => { const ls = choisiesL.filter((l) => l.action); void Promise.all(ls.map((l) => l.action?.faire())).then(() => { setConfirmeLot(false); setChoisies(new Set()); annoncer(`${ls.length} absence(s) close(s).`); }); }}>Confirmer</button>
              </>
            ) : (
              <>
                <span className="cal-lot-compte">{choisiesL.length} choisie{choisiesL.length > 1 ? "s" : ""}</span>
                {choisiesL.some((l) => l.action) ? <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => setConfirmeLot(true)}>Clore les absences</button> : null}
                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => { choisiesL.forEach(epingler); setChoisies(new Set()); }}>Épingler</button>
                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => void copier(choisiesL.map(resumeL).join("\n\n")).then((ok) => { setChoisies(new Set()); annoncer(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie."); })}>Copier pour l&apos;assistant</button>
                <button type="button" className="cal-bouton cal-bouton--petit" onClick={() => { exporter(choisiesL); setChoisies(new Set()); }}>Exporter en CSV</button>
                <button type="button" className="cal-icone-bouton" aria-label="Tout désélectionner" onClick={() => setChoisies(new Set())}><Icone d={L.croix} taille={14} /></button>
              </>
            )}
          </div>
        ) : null}
        {detail ? (
          <aside className="cal-panneau" aria-label={detail.titre}>
            <div className="cal-panneau-tete">
              {detail.pastille ? <span className={`cal-pastille${detail.pastille.teinte ? ` cal-pastille--${detail.pastille.teinte}` : ""}`}>{detail.pastille.texte}</span> : null}
              <span className="cal-pousse" />
              <button type="button" className="cal-icone-bouton" aria-label="Précédent" disabled={i <= 0} onClick={() => i > 0 && setOuverte(toutes[i - 1].cle)}><Icone d={L.haut} /></button>
              <button type="button" className="cal-icone-bouton" aria-label="Suivant" disabled={i >= toutes.length - 1} onClick={() => i < toutes.length - 1 && setOuverte(toutes[i + 1].cle)}><Icone d={L.bas} /></button>
              <button type="button" className="cal-icone-bouton" aria-label="Fermer" onClick={() => setOuverte(null)}><Icone d={L.croix} /></button>
            </div>
            <h2 className="cal-panneau-titre">{detail.titre}</h2>
            <div className="cal-panneau-corps">
              {detail.detail.map((s) => (
                <section key={s.titre} className="cal-section">
                  <h3>{s.titre}</h3>
                  {s.lignes.map((r, k) => (
                    <p key={k}><strong>{r.libelle}</strong>{r.valeur ? <span>{r.valeur}</span> : null}</p>
                  ))}
                </section>
              ))}
            </div>
            <div className="cal-panneau-pied">
              <span className="cal-groupe-boutons">
                {(detail.liens ?? []).slice(0, 1).map((k) => <Link key={k.href} href={k.href} className="cal-bouton cal-bouton--groupe-g">{k.libelle}</Link>)}
                <button type="button" className={`cal-bouton ${(detail.liens ?? []).length ? "cal-bouton--groupe-d" : ""}`} aria-label="Copier pour l'assistant" title="Copier pour l'assistant" onClick={() => void copier(resumeL(detail)).then((ok) => annoncer(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie."))}>
                  <Icone d={'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'} />
                </button>
              </span>
              <span className="cal-pousse" />
              {detail.action ? (confirme === detail.cle ? (
                <>
                  <button type="button" className="cal-bouton" onClick={() => setConfirme(null)}>Annuler</button>
                  <button type="button" className="cal-bouton cal-bouton--plein" onClick={() => { setConfirme(null); void detail.action?.faire().then(() => setOuverte(null)); }}>Confirmer</button>
                </>
              ) : <button type="button" className="cal-bouton cal-bouton--plein" onClick={() => setConfirme(detail.cle)}>{detail.action.libelle}</button>) : null}
              <span className="cal-ancre">
                <button type="button" className="cal-icone-bouton cal-icone-bouton--bord" aria-label="Plus" aria-expanded={menu === "detail"} onClick={(e) => { e.stopPropagation(); setMenu((m) => (m === "detail" ? null : "detail")); }}><Icone d={L.points} /></button>
                {menu === "detail" ? (
                  <div className="cal-menu cal-menu--haut" role="menu">
                    <button type="button" role="menuitem" className="cal-menu-item" onClick={() => epingler(detail)}>{favoris[`fauteuils-${onglet}-${detail.cle}`] ? "Désépingler" : "Épingler dans Aujourd'hui"}</button>
                    {(detail.liens ?? []).map((k) => <Link key={k.href} href={k.href} role="menuitem" className="cal-menu-item">{k.libelle}</Link>)}
                    <button type="button" role="menuitem" className="cal-menu-item" onClick={() => exporter([detail])}>Exporter en CSV</button>
                  </div>
                ) : null}
              </span>
            </div>
          </aside>
        ) : absence ? <Absence fermer={() => setAbsence(false)} /> : null}
      </div>
    </div>
  );
}
