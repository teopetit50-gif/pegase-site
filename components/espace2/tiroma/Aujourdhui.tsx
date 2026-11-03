"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Aujourd'hui (02/11/2026, refonte des pages métiers)

   La page « My issues » de Linear, au 1:1 : relevé
   docs/refonte-metiers/releves/linear-my-issues.md (branche refs-linear),
   styles ./tir.css (socle) et ./tir-mes.css (la liste), icônes du sprite
   de Linear (./TirIcone). Promesse du site : « Votre cabinet tient sur une
   seule page » — Aujourd'hui reste la page du jour, complète.

   Ce qu'elle reprend de l'écran d'avant (inventaire docs/refonte-metiers/tiroma.md) :
     · B2, les quatre compteurs : ce sont les compteurs des groupes
       (Créneaux à sauver = créneaux libres, Plans sans rendez-vous, Avant
       les rendez-vous = vérifications hors info, « N critique(s) » à la
       place des dates du cycle, Demi-journées vides = charge du jour,
       titulaire seul, sinon « réservé au titulaire ») ;
     · B8, B9, B16, B24 (réponses) : les lignes des groupes ; une ligne
       mène à la sous-page qui porte ses gestes (fil du créneau, carte du
       plan, fauteuil, réponses) ;
     · B1 : le sélecteur de cabinet (réel, plusieurs cabinets) et l'état du
       cabinet sont dans le volet « Détails » (bouton de droite) ;
     · B3 à B7 : avis, chargement, aucun compte, aucun cabinet (renvoi vers
       Réglages, où se fait l'installation) dans la liste ;
     · l'onglet « Activité » : les derniers appels notés, par jour (B12).
   Les onglets reprennent ceux du site : Point du matin · Créneaux · Plans
   (et Activité, comme le quatrième onglet de Linear).
   ══════════════════════════════════════════════════════════════════════ */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FAMILLES, ISSUES_APPEL, MOTIFS_APPEL, MUTUELLES, NATURES_VERIF, REPONSES_RAPPEL, TYPES_CRENEAU, libelleLogiciel, STATUTS_CABINET, CAPACITES } from "@/components/espace/tiroma/libelles";
import type { Dossier } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma } from "./donnees";
import { TirAvatar, TirCarte, TirMenu, type OptionMenu } from "./TirCadre";
import { TirIcone, type NomTirIcone } from "./TirIcone";
import { copier, dansJours, estReporte, exporterCSV, useFavoris, useReportes } from "./navigateur";
import "./tir-mes.css";

const BASE = `${RACINE}/tiroma`;

/* couleurs d'étiquettes relevées sur la page (linear-my-issues.md, « Couleurs d'étiquettes relevées ») */
const ROUGE = "rgb(235, 87, 87)";
const ROSE = "rgb(247, 200, 193)";
const BLEU_VERT = "rgb(38, 181, 206)";
const VERT = "rgb(76, 183, 130)";
const VIOLET = "lch(48 59.31 288.43)";
const BEIGE = "lch(67.969 19.321 31.72)";

type Puce =
  | { type: "etiquette"; couleur: string; texte: string }
  | { type: "projet"; icone: NomTirIcone; couleur?: string; texte: string }
  | { type: "cycle"; texte: string; titre?: string }
  | { type: "echeance"; texte: string; retard?: boolean; titre?: string };

type Statut = "todo" | "started" | "done" | "triage" | "backlog";

type Ligne = {
  cle: string;
  ident: string;
  priorite: 0 | 1 | 2 | 3 | 4;
  statut: Statut;
  titre: string;
  puces: Puce[];
  personne: string | null;
  date: string;
  dateTitre: string;
  href?: string;
};

type Groupe = {
  cle: string;
  libelle: string;
  icone?: NomTirIcone;
  couleurIcone?: string;
  compteur: number | string;
  dates?: string;
  lignes: Ligne[];
  plus?: string;
  plusTitre?: string;
};

const jourCourt = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
const jourLong = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const heure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const complet = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: iso.length === 10 ? undefined : "short" });
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;
const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function couleurFamille(f: string | null): string {
  if (!f) return BEIGE;
  if (f.startsWith("prothese")) return ROSE;
  if (f.startsWith("implant") || f === "chirurgie") return ROUGE;
  if (f.startsWith("orthodontie")) return VIOLET;
  if (f === "controle" || f === "detartrage" || f === "prevention") return VERT;
  return BLEU_VERT;
}

function lignesDuJour(d: Dossier) {
  const maintenant = Date.now();
  const titulaire = d.profil === "titulaire";
  const faits: Ligne[] = [];

  /* B8 — créneaux à sauver (libres) ; un créneau déjà repris passe dans « Faits » */
  const creneaux: Ligne[] = [];
  d.creneaux.forEach((c, i) => {
    const premier = c.candidats[0];
    const l: Ligne = {
      cle: `cr-${c.evenement_id}`,
      ident: `CR-${i + 1}`,
      priorite: !c.libre ? 0 : new Date(c.debut).getTime() - maintenant < 36 * 3600e3 ? 1 : 2,
      statut: c.libre ? "todo" : "done",
      titre: `${TYPES_CRENEAU[c.type] ?? c.type} ${jourLong(c.debut)} ${heure(c.debut)} · ${c.minutes} min — ${!c.libre ? "déjà repris" : premier ? `appeler ${premier.patient_nom}` : "aucun patient ne convient"}`,
      puces: [
        ...(c.famille ? [{ type: "etiquette" as const, couleur: couleurFamille(c.famille), texte: FAMILLES[c.famille as keyof typeof FAMILLES] ?? c.famille }] : []),
        ...(c.fauteuil_nom ? [{ type: "projet" as const, icone: "Box" as NomTirIcone, couleur: "lch(80 90 85)", texte: c.fauteuil_nom }] : []),
        { type: "cycle", texte: String(c.candidats.length), titre: `${c.candidats.length} patient(s) dans l'ordre d'appel` },
        { type: "echeance", texte: jourCourt(c.debut), titre: complet(c.debut) },
      ],
      personne: c.praticien_nom,
      date: jourCourt(c.detecte_le),
      dateTitre: `Libéré le ${complet(c.detecte_le)}`,
      href: `${BASE}/creneaux?creneau=${encodeURIComponent(String(c.evenement_id))}`,
    };
    (c.libre ? creneaux : faits).push(l);
  });

  /* B9 — plans sans rendez-vous, du plus ancien au plus récent */
  const plans: Ligne[] = d.plans.map((p) => {
    const expire = p.jours_avant_expiration;
    const seance = p.prochaine?.libelle ? `${p.prochaine.libelle}${p.prochaine.seance ? ` (séance ${p.prochaine.seance})` : ""}` : "séance à poser";
    return {
      cle: `pl-${p.plan_id}`,
      ident: `D-${p.devis_numero?.slice(-4) ?? "—"}`,
      priorite: p.jours_depuis >= 42 ? 1 : p.jours_depuis >= 21 ? 2 : 3,
      statut: p.statut === "commence" || p.mutuelle_statut === "accord" ? "started" : "todo",
      titre: `${p.patient_nom} — ${seance}`,
      puces: [
        ...(p.mutuelle_statut && p.mutuelle_statut !== "non_requise" ? [{ type: "etiquette" as const, couleur: p.mutuelle_statut === "accord" ? VERT : p.mutuelle_statut === "refus" ? ROUGE : BLEU_VERT, texte: p.mutuelle_statut === "accord" ? "Accord de mutuelle reçu" : (MUTUELLES[p.mutuelle_statut] ?? p.mutuelle_statut) }] : []),
        ...(p.ne_pas_contacter ? [{ type: "etiquette" as const, couleur: ROUGE, texte: "Ne pas contacter" }] : []),
        { type: "projet", icone: "Euro", couleur: "lch(60.135 63.97 86.502)", texte: euros(p.montant ?? 0) },
        { type: "cycle", texte: `${p.jours_depuis} j`, titre: `signé il y a ${p.jours_depuis} jours` },
        ...(p.valide_jusqu_au ? [{ type: "echeance" as const, texte: jourCourt(p.valide_jusqu_au), retard: expire !== null && expire < 0, titre: expire !== null && expire <= 30 ? `Expire dans ${expire} j` : `Valable jusqu'au ${complet(p.valide_jusqu_au)}` }] : []),
      ],
      personne: p.praticien_nom,
      date: jourCourt(p.signe_le ?? p.depuis),
      dateTitre: `Signé le ${complet(p.signe_le ?? p.depuis)}`,
      href: `${BASE}/plans?plan=${encodeURIComponent(p.plan_id)}`,
    };
  });

  /* B16 — avant les rendez-vous ; l'info (« le travail est revenu ») passe dans « Faits » */
  const avant: Ligne[] = [];
  d.verifications.forEach((v, i) => {
    const plan = v.objet_type === "tiroma_plans" && v.objet_id ? v.objet_id : null;
    const l: Ligne = {
      cle: `av-${i}`,
      ident: `AV-${i + 1}`,
      priorite: v.gravite === "critique" ? 1 : v.gravite === "attention" ? 2 : 0,
      statut: v.gravite === "info" ? "done" : v.gravite === "critique" ? "triage" : "todo",
      titre: `${v.patient_nom ?? "Patient"} — ${v.texte}`,
      puces: [
        { type: "etiquette", couleur: v.gravite === "critique" ? ROUGE : v.gravite === "attention" ? BEIGE : VERT, texte: NATURES_VERIF[v.nature] ?? v.nature },
        ...(v.quand ? [{ type: "echeance" as const, texte: jourCourt(v.quand), retard: v.quand < jourISO(new Date()), titre: complet(v.quand) }] : []),
      ],
      personne: null,
      date: v.quand ? jourCourt(v.quand) : "",
      dateTitre: v.quand ? complet(v.quand) : "",
      href: plan ? `${BASE}/plans?plan=${encodeURIComponent(plan)}` : `${BASE}/avant?verif=${encodeURIComponent(`${v.nature}:${v.objet_id ?? v.rendez_vous_id ?? v.patient_id ?? ""}`)}`,
    };
    (v.gravite === "info" ? faits : avant).push(l);
  });
  const critiques = d.verifications.filter((v) => v.gravite === "critique").length;

  /* B2 (4e compteur) et B17 — les demi-journées vides du jour, par fauteuil (titulaire) */
  const vides: Ligne[] = [];
  if (titulaire && d.charge) {
    let n = 0;
    for (const f of d.charge.fauteuils) {
      for (const [moment, m] of [["Matinée", f.matin], ["Après-midi", f.apres_midi]] as const) {
        if (!m.vide) continue;
        n += 1;
        vides.push({
          cle: `dj-${f.fauteuil_id}-${moment}`,
          ident: `DJ-${n}`,
          priorite: 2,
          statut: "todo",
          titre: `${f.nom} : ${moment.toLowerCase()} vide (${Math.round((m.taux ?? 0) * 100)} % prévu sur ${Math.round(m.ouvert_min / 60)} h ouvertes)`,
          puces: [
            ...f.capacites.slice(0, 2).map((c) => ({ type: "etiquette" as const, couleur: c === "chirurgie" ? ROUGE : c === "orthodontie" ? VIOLET : c === "prothese" ? ROSE : BLEU_VERT, texte: CAPACITES[c] ?? c })),
            { type: "projet", icone: "Box", couleur: "lch(80 90 85)", texte: f.nom },
            { type: "cycle", texte: `${Math.round((f.journee.taux ?? 0) * 100)} %`, titre: "Taux prévu sur la journée" },
          ],
          personne: f.assistante_habituelle,
          date: jourCourt(d.charge.jour),
          dateTitre: complet(d.charge.jour),
          href: `${BASE}/fauteuils?fauteuil=${encodeURIComponent(f.fauteuil_id)}`,
        });
      }
    }
  }

  /* Équipe absente (b3_18) : un membre absent et les soins de son fauteuil à basculer — la capture du site
     « Ce matin » le montre ; la vue complète reste Fauteuils › Équipe absente */
  const MOTIF_ABSENCE: Record<string, string> = { conge: "Congé", maladie: "Arrêt", formation: "Formation", autre: "Absence" };
  const equipe: Ligne[] = (d.equipe ?? []).map((ab, i) => {
    const sansSolution = ab.soins.filter((x) => !x.vers.length).length;
    return {
      cle: `eq-${ab.absence_id}`,
      ident: `EQ-${i + 1}`,
      priorite: sansSolution ? 2 : 3,
      statut: "todo",
      titre: `${ab.membre} : absence du ${jourCourt(ab.debut)} au ${jourCourt(ab.fin)}${ab.fauteuil_nom ? ` (${ab.fauteuil_nom})` : ""} : ${ab.soins.length} soin${ab.soins.length > 1 ? "s" : ""} à basculer${sansSolution ? `, ${sansSolution} sans autre fauteuil` : ""}`,
      puces: [
        { type: "etiquette", couleur: sansSolution ? ROUGE : BEIGE, texte: MOTIF_ABSENCE[ab.motif] ?? ab.motif },
        ...(ab.fauteuil_nom ? [{ type: "projet" as const, icone: "Box" as NomTirIcone, couleur: "lch(80 90 85)", texte: ab.fauteuil_nom }] : []),
      ],
      personne: ab.membre,
      date: jourCourt(ab.debut),
      dateTitre: complet(ab.debut),
      href: `${BASE}/fauteuils?vue=equipe`,
    };
  });

  /* Contrôles dus (b3_23) : les patients sans contrôle depuis plus de N mois ; la liste entière est dans
     Créneaux et appels › Contrôles dus */
  const controles: Ligne[] = (d.controlesDus?.patients ?? []).slice(0, 3).map((c, i) => ({
    cle: `ct-${c.patient_id}`,
    ident: `CT-${i + 1}`,
    priorite: 3,
    statut: "todo",
    titre: `${c.patient_nom} — ${c.mois_depuis != null ? `dernier contrôle il y a ${c.mois_depuis} mois` : "aucun contrôle connu"}`,
    puces: [{ type: "etiquette", couleur: BLEU_VERT, texte: "Contrôle" }],
    personne: null,
    date: c.derniere_venue ? jourCourt(c.derniere_venue) : "",
    dateTitre: c.derniere_venue ? `Dernière venue le ${complet(c.derniere_venue)}` : "",
    href: `${BASE}/creneaux?vue=controles`,
  }));

  /* B24 — réponses des patients aux rappels (quinze jours) ; une confirmation passe dans « Faits » */
  const reponses: Ligne[] = [];
  (d.rappels?.reponses ?? []).forEach((r, i) => {
    const l: Ligne = {
      cle: `rp-${r.id}`,
      ident: `RP-${i + 1}`,
      priorite: r.reponse === "annule" ? 1 : r.reponse === "confirme" ? 0 : 3,
      statut: r.reponse === "confirme" ? "done" : r.reponse === "annule" ? "triage" : "todo",
      titre:
        r.reponse === "annule"
          ? `${r.patient_nom ?? "Un patient"} ne viendra pas ${r.debut ? `le ${jourLong(r.debut)} à ${heure(r.debut)}` : ""} : libérez le créneau dans le logiciel du cabinet`
          : `${r.patient_nom ?? "Un patient"} — ${REPONSES_RAPPEL[r.reponse]?.libelle ?? r.reponse}${r.debut ? `, rendez-vous du ${jourLong(r.debut)} à ${heure(r.debut)}` : ""}`,
      puces: [
        { type: "etiquette", couleur: r.reponse === "confirme" ? VERT : r.reponse === "annule" ? ROUGE : BEIGE, texte: REPONSES_RAPPEL[r.reponse]?.libelle ?? r.reponse },
        ...(r.debut ? [{ type: "echeance" as const, texte: jourCourt(r.debut), titre: complet(r.debut) }] : []),
      ],
      personne: null,
      date: jourCourt(r.recue_le),
      dateTitre: `Reçue le ${complet(r.recue_le)}`,
      href: `${BASE}/creneaux?vue=reponses`,
    };
    (r.reponse === "confirme" ? faits : reponses).push(l);
  });

  const parPriorite = (a: Ligne, b: Ligne) => (a.priorite || 9) - (b.priorite || 9);
  const horizon = d.regles?.horizon_creneaux_jours ?? 2;
  const demain = new Date();
  demain.setDate(demain.getDate() + 1);
  const fin = new Date();
  fin.setDate(fin.getDate() + horizon);
  const groupes: Groupe[] = [
    { cle: "creneaux", libelle: "Créneaux à sauver", icone: "Cycle", couleurIcone: "lch(48 59.31 288.43)", compteur: creneaux.length, dates: `${jourCourt(jourISO(demain))} → ${jourCourt(jourISO(fin))}`, lignes: creneaux.sort(parPriorite), plus: `${BASE}/creneaux?vue=attente&inscrire=1`, plusTitre: "Nouvelle inscription en liste d'attente" },
    { cle: "plans", libelle: "Plans sans rendez-vous", compteur: plans.length, lignes: plans, plus: `${BASE}/creneaux?vue=attente&inscrire=1`, plusTitre: "Nouvelle inscription en liste d'attente" },
    { cle: "avant", libelle: "Avant les rendez-vous", compteur: avant.length, dates: critiques ? `${critiques} critique${critiques > 1 ? "s" : ""}` : `à J-${d.regles?.labo_verif_jours ?? 2}`, lignes: avant.sort(parPriorite), plus: `${BASE}/creneaux?vue=attente&inscrire=1`, plusTitre: "Nouvelle inscription en liste d'attente" },
    { cle: "vides", libelle: "Demi-journées vides", compteur: titulaire ? (d.charge?.demi_journees_vides ?? vides.length) : "—", dates: titulaire ? "aujourd'hui, par fauteuil" : "réservé au titulaire", lignes: vides, plus: `${BASE}/fauteuils?vue=equipe&absence=1`, plusTitre: "Noter une absence de l'équipe" },
    ...(equipe.length ? [{ cle: "equipe", libelle: "Équipe absente", compteur: equipe.length, lignes: equipe.sort(parPriorite), plus: `${BASE}/fauteuils?vue=equipe&absence=1`, plusTitre: "Noter une absence de l'équipe" }] : []),
    ...(controles.length ? [{ cle: "controles", libelle: "Contrôles dus", compteur: d.controlesDus?.total ?? controles.length, dates: `plus de ${d.controlesDus?.seuil_mois ?? 12} mois`, lignes: controles, plus: `${BASE}/creneaux?vue=controles`, plusTitre: "Voir tous les contrôles dus" }] : []),
    ...(reponses.length ? [{ cle: "reponses", libelle: "Réponses des patients", compteur: reponses.length, lignes: reponses.sort(parPriorite), plus: `${BASE}/reglages?section=rappels`, plusTitre: "Ajouter un moyen de contact" }] : []),
    ...(faits.length ? [{ cle: "faits", libelle: "Faits", icone: "IssueStatusDone" as NomTirIcone, couleurIcone: "var(--tir-t3)", compteur: faits.length, lignes: faits, plus: `${BASE}/creneaux?vue=attente&inscrire=1`, plusTitre: "Nouvelle inscription en liste d'attente" }] : []),
  ];
  return groupes;
}

function lignesActivite(d: Dossier): Groupe[] {
  const registre = d.appels;
  if (!registre) return [];
  const derniers = Object.entries(registre.derniers).map(([patient_id, a]) => {
    const suite = registre.a_reprendre.find((s) => s.patient_id === patient_id);
    return { patient_id, nom: suite?.patient_nom ?? d.plans.find((p) => p.patient_id === patient_id)?.patient_nom ?? "Patient", ...a };
  });
  derniers.sort((a, b) => b.appele_le.localeCompare(a.appele_le));
  const aujourdhui = jourISO(new Date());
  const hier = jourISO(new Date(Date.now() - 864e5));
  const parJour = new Map<string, Ligne[]>();
  derniers.forEach((a, i) => {
    const j = jourISO(new Date(a.appele_le));
    const issue = ISSUES_APPEL[a.issue as keyof typeof ISSUES_APPEL];
    const l: Ligne = {
      cle: `ap-${a.patient_id}`,
      ident: `AP-${derniers.length - i}`,
      priorite: a.issue === "rappeler" && a.rappeler_le && a.rappeler_le <= aujourdhui ? 2 : 0,
      statut: a.issue === "rdv_pris" ? "done" : a.issue === "refus" || a.issue === "ne_plus_contacter" ? "backlog" : "started",
      titre: `${a.nom} — ${issue?.libelle ?? a.issue} (${MOTIFS_APPEL[a.motif as keyof typeof MOTIFS_APPEL] ?? a.motif})`,
      puces: [
        { type: "etiquette", couleur: a.issue === "rdv_pris" ? VERT : a.issue === "refus" || a.issue === "ne_plus_contacter" ? ROUGE : BLEU_VERT, texte: issue?.libelle ?? a.issue },
        ...(a.rappeler_le ? [{ type: "echeance" as const, texte: jourCourt(a.rappeler_le), retard: a.rappeler_le < aujourdhui, titre: `Rappeler le ${complet(a.rappeler_le)}` }] : []),
      ],
      personne: a.par,
      date: `Noté le ${jourCourt(a.appele_le)}`,
      dateTitre: complet(a.appele_le),
      href: `${BASE}/creneaux?vue=appels`,
    };
    parJour.set(j, [...(parJour.get(j) ?? []), l]);
  });
  return [...parJour.entries()].map(([j, lignes]) => ({
    cle: j,
    libelle: j === aujourdhui ? "Aujourd'hui" : j === hier ? "Hier" : jourLong(j),
    icone: "Calendar" as NomTirIcone,
    couleurIcone: "var(--tir-t3)",
    compteur: lignes.length,
    lignes,
  }));
}

/* ——— les briques de la ligne (linear-my-issues.md, « Ligne de ticket ») ——— */

const COULEURS_STATUT: Record<Statut, string> = {
  todo: "var(--tir-statut-todo)",
  started: "#f0bf00",
  done: "#5e6ad2",
  triage: "#ff7336",
  backlog: "var(--tir-statut-todo)",
};
const ICONES_STATUT: Record<Statut, NomTirIcone> = {
  todo: "IssueStatusTodo",
  started: "IssueStatusStarted",
  done: "IssueStatusDone",
  triage: "IssueStatusTriage",
  backlog: "IssueStatusBacklog",
};
const LIBELLES_PRIORITE = ["Aucune priorité", "Urgent", "Haute", "Moyenne", "Basse"];

function PuceVue({ p }: { p: Puce }) {
  if (p.type === "etiquette") {
    return (
      <span className="tir-mi-puce" title={p.texte}>
        <span className="tir-mi-pastille-boite"><span className="tir-mi-pastille" style={{ background: p.couleur }} /></span>
        <span className="tir-mi-puce-texte">{p.texte}</span>
      </span>
    );
  }
  if (p.type === "projet") {
    return (
      <span className="tir-mi-puce" title={p.texte}>
        <TirIcone nom={p.icone} taille={14} style={p.couleur ? { color: p.couleur } : undefined} />
        <span className="tir-mi-puce-texte">{p.texte}</span>
      </span>
    );
  }
  if (p.type === "cycle") {
    return (
      <span className="tir-mi-puce" title={p.titre}>
        <TirIcone nom="Cycle" taille={14} className="tir-mi-cycle" />
        <span className="tir-mi-puce-texte">{p.texte}</span>
      </span>
    );
  }
  return (
    <span className="tir-mi-puce" title={p.titre}>
      {p.retard ? <TirIcone nom="CrossedOutCalendar" taille={14} style={{ color: "var(--tir-rouge)" }} /> : <TirIcone nom="Calendar" taille={14} />}
      <span className="tir-mi-puce-texte">{p.texte}</span>
    </span>
  );
}

type Selection = { choisies: Set<string>; basculer: (cle: string) => void };

function LigneVue({ l, activite, sel }: { l: Ligne; activite: boolean; sel: Selection }) {
  const choisie = sel.choisies.has(l.cle);
  const contenu = (
    <>
      <span className="tir-mi-case-col">
        <span
          className="tir-mi-case"
          role="checkbox"
          aria-checked={choisie}
          aria-label={`Choisir ${l.ident}`}
          tabIndex={0}
          data-coche={choisie ? "" : undefined}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sel.basculer(l.cle);
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              sel.basculer(l.cle);
            }
          }}
        >
          {choisie ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
        </span>
      </span>
      <span className="tir-mi-priorite" title={LIBELLES_PRIORITE[l.priorite]}>
        <TirIcone nom={`Priority${l.priorite}` as NomTirIcone} style={l.priorite === 1 ? { color: "lch(66 80 48)" } : undefined} />
      </span>
      <span className="tir-mi-ident">{l.ident}</span>
      <span className="tir-mi-statut" style={{ color: COULEURS_STATUT[l.statut] }}>
        <TirIcone nom={ICONES_STATUT[l.statut]} taille={14} />
      </span>
      <span className="tir-mi-titre-col">
        <span className="tir-mi-titre">{l.titre}</span>
        <span className="tir-mi-puces">
          {l.puces.map((p, i) => (
            <PuceVue key={i} p={p} />
          ))}
          <TirAvatar nom={l.personne} />
        </span>
      </span>
      <span className={`tir-mi-date${activite ? " tir-mi-date--large" : ""}`} title={l.dateTitre}>
        {l.date}
      </span>
    </>
  );
  return l.href ? (
    <Link href={l.href} className="tir-mi-ligne" data-choisie={choisie ? "" : undefined}>
      {contenu}
    </Link>
  ) : (
    <div className="tir-mi-ligne" data-sans-lien="" data-choisie={choisie ? "" : undefined}>
      {contenu}
    </div>
  );
}

function GroupeVue({ g, activite, sel }: { g: Groupe; activite: boolean; sel: Selection }) {
  const [replie, setReplie] = useState(false);
  return (
    <div className="tir-mi-groupe">
      <div className="tir-mi-tete">
        <button type="button" className="tir-mi-replier" aria-label={replie ? "Déplier" : "Replier"} aria-expanded={!replie} onClick={() => setReplie((r) => !r)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ transform: replie ? "rotate(-90deg)" : undefined }}>
            <path d="M4.5 6.5h7L8 10.5z" />
          </svg>
        </button>
        {g.icone ? <TirIcone nom={g.icone} style={{ color: g.couleurIcone }} /> : null}
        <span className="tir-mi-libelle">{g.libelle}</span>
        <span className="tir-mi-compteur">{g.compteur}</span>
        {g.dates ? <span className="tir-mi-dates">{g.dates}</span> : null}
        <span className="tir-pousse" />
        {g.plus ? (
          <Link href={g.plus} className="tir-mi-plus" aria-label={g.plusTitre ?? `Ouvrir ${g.libelle}`} title={g.plusTitre ?? `Ouvrir ${g.libelle}`}>
            <TirIcone nom="Plus" taille={14} />
          </Link>
        ) : null}
      </div>
      {!replie ? g.lignes.map((l) => <LigneVue key={l.cle} l={l} activite={activite} sel={sel} />) : null}
    </div>
  );
}

const ONGLETS = [
  { cle: "point", libelle: "Point du matin" },
  { cle: "creneaux", libelle: "Créneaux" },
  { cle: "plans", libelle: "Plans" },
  { cle: "activite", libelle: "Activité" },
] as const;

export default function Aujourdhui() {
  const t = useTiroma();
  const params = useSearchParams();
  const vue = (ONGLETS.find((o) => o.cle === params.get("vue"))?.cle ?? "point") as (typeof ONGLETS)[number]["cle"];
  const [praticiens, setPraticiens] = useState<string[]>([]);
  const [faitsVisibles, setFaitsVisibles] = useState(true);
  const [puces, setPuces] = useState(true);
  const [details, setDetails] = useState(false);
  const [plusOuvert, setPlusOuvert] = useState(false);
  const [reportesVisibles, setReportesVisibles] = useState(false);
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const [menuLot, setMenuLot] = useState<null | "reporter">(null);
  const [avisLot, setAvisLot] = useState<string | null>(null);
  const [favoris, poserFavori] = useFavoris();
  const [reportes, poserReporte] = useReportes();
  const d = t.dossier;

  const groupes = useMemo(() => {
    if (!d) return [];
    let gs = vue === "activite" ? lignesActivite(d) : lignesDuJour(d);
    if (vue === "creneaux") gs = gs.filter((g) => g.cle === "creneaux" || g.cle === "reponses");
    if (vue === "plans") gs = gs.filter((g) => g.cle === "plans" || g.cle === "avant");
    if (!faitsVisibles) gs = gs.filter((g) => g.cle !== "faits");
    if (praticiens.length) gs = gs.map((g) => ({ ...g, lignes: g.lignes.filter((l) => l.personne && praticiens.includes(l.personne)) }));
    /* reporter (Snooze) : la ligne quitte la liste jusqu'à la date choisie ; Affichage › « Les reportés » les montre à part */
    const masquees = gs.flatMap((g) => g.lignes.filter((l) => estReporte(reportes, l.cle)).map((l) => ({ ...l, puces: [...l.puces, { type: "echeance" as const, texte: `reporté au ${jourCourt(reportes[l.cle])}`, titre: "Reporté" }] })));
    gs = gs.map((g) => ({ ...g, lignes: g.lignes.filter((l) => !estReporte(reportes, l.cle)) }));
    /* épinglés (étoile) : en tête, depuis n'importe quelle sous-page */
    const epingles: Ligne[] = Object.entries(favoris).map(([cle, f], i) => ({
      cle: `fav-${cle}`,
      ident: `ÉP-${i + 1}`,
      priorite: 0,
      statut: "todo",
      titre: f.titre,
      puces: [{ type: "etiquette", couleur: "lch(60.135 63.97 86.502)", texte: f.type }],
      personne: null,
      date: jourCourt(f.depuis),
      dateTitre: `Épinglé le ${complet(f.depuis)}`,
      href: f.href,
    }));
    return [
      ...(epingles.length && vue !== "activite" ? [{ cle: "epingles", libelle: "Épinglés", icone: "Etoile" as NomTirIcone, couleurIcone: "lch(60.135 63.97 86.502)", compteur: epingles.length, lignes: epingles }] : []),
      ...gs,
      ...(reportesVisibles && masquees.length ? [{ cle: "reportes", libelle: "Reportés", icone: "Clock" as NomTirIcone, couleurIcone: "var(--tir-t3)", compteur: masquees.length, lignes: masquees }] : []),
    ];
  }, [d, vue, faitsVisibles, praticiens, favoris, reportes, reportesVisibles]);

  const toutes = groupes.flatMap((g) => g.lignes);
  const choisiesL = toutes.filter((l) => choisies.has(l.cle));
  const sel = {
    choisies,
    basculer: (cle: string) =>
      setChoisies((c) => {
        const n = new Set(c);
        if (n.has(cle)) n.delete(cle);
        else n.add(cle);
        return n;
      }),
  };
  const finir = (avis: string) => {
    setChoisies(new Set());
    setMenuLot(null);
    setAvisLot(avis);
    window.setTimeout(() => setAvisLot(null), 4000);
  };
  const epingler = () => {
    const ajout = choisiesL.filter((l) => !l.cle.startsWith("fav-"));
    const retrait = choisiesL.filter((l) => l.cle.startsWith("fav-"));
    ajout.forEach((l) => poserFavori(l.cle, { titre: `${l.ident} · ${l.titre}`, href: l.href ?? BASE, type: groupes.find((g) => g.lignes.includes(l))?.libelle ?? "Aujourd'hui", depuis: new Date().toISOString() }));
    retrait.forEach((l) => poserFavori(l.cle.slice(4), null));
    finir(retrait.length && !ajout.length ? `${retrait.length} désépinglé(s).` : `${ajout.length} épinglé(s) en tête de la page.`);
  };
  const reporter = (jours: number | null) => {
    choisiesL.forEach((l) => poserReporte(l.cle, jours === null ? null : dansJours(jours)));
    finir(jours === null ? "Remis dans la liste." : `${choisiesL.length} reporté(s) jusqu'au ${jourCourt(dansJours(jours))}.`);
  };
  const resume = (ls: Ligne[]) => ls.map((l) => `- ${l.ident} ${l.titre}${l.puces.length ? ` (${l.puces.map((p) => ("texte" in p ? p.texte : "")).filter(Boolean).join(", ")})` : ""}${l.personne ? ` — ${l.personne}` : ""}${l.date ? ` — ${l.dateTitre}` : ""}`).join("\n");
  const copierLot = async () => {
    const ok = await copier(`Cabinet ${d?.cabinet.entite_nom ?? ""}, ${new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })} :\n${resume(choisiesL)}`);
    finir(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie.");
  };
  const exporter = () => {
    exporterCSV("tiroma-aujourdhui", ["Identifiant", "Groupe", "Titre", "Étiquettes", "Personne", "Date"], (choisiesL.length ? choisiesL : toutes).map((l) => [l.ident, groupes.find((g) => g.lignes.includes(l))?.libelle ?? "", l.titre, l.puces.map((p) => ("texte" in p ? p.texte : "")).join(", "), l.personne ?? "", l.dateTitre]));
    finir("Liste exportée en CSV.");
  };

  const nomsPraticiens = d?.praticiens.map((p) => p.nom_affiche) ?? [];
  const filtre: OptionMenu[] = [
    { titre: "Praticien" },
    ...nomsPraticiens.map((n) => ({ libelle: n, coche: praticiens.includes(n), action: () => setPraticiens((ps) => (ps.includes(n) ? ps.filter((x) => x !== n) : [...ps, n])) })),
    ...(praticiens.length ? ["sep" as const, { libelle: "Retirer le filtre", icone: "Refresh" as NomTirIcone, action: () => setPraticiens([]) }] : []),
  ];
  const affichage: OptionMenu[] = [
    { titre: "Afficher" },
    { libelle: "Les faits", coche: faitsVisibles, action: () => setFaitsVisibles((v) => !v) },
    { libelle: "Les étiquettes", coche: puces, action: () => setPuces((v) => !v) },
    { libelle: "Les reportés", coche: reportesVisibles, action: () => setReportesVisibles((v) => !v) },
    "sep",
    { libelle: "Exporter la liste en CSV", icone: "Spreadsheet", action: exporter },
  ];

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Aucun compte rattaché : cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length)
    etat = (
      <>
        Aucun cabinet installé. <Link href={`${BASE}/reglages`}>Installer le cabinet dans les réglages</Link>
      </>
    );
  else if (!d) etat = "Lecture du cabinet…";

  return (
    <TirCarte className="tir-mi">
      <div className="tir-mi-l1">
        <h2 className="tir-mi-h2">Aujourd&apos;hui</h2>
        <span className="tir-pousse" />
        <Link href={`${BASE}/creneaux?vue=attente&inscrire=1`} className="tir-mi-nouveau" title="Inscrire un patient en liste d'attente">
          <TirIcone nom="Plus" taille={14} />
          <span>Nouvelle inscription</span>
        </Link>
      </div>
      <div className="tir-mi-l2">
        <nav className="tir-mi-onglets" aria-label="Vues">
          {ONGLETS.map((o, i) => (
            <Link key={o.cle} href={o.cle === "point" ? BASE : `${BASE}?vue=${o.cle}`} className="tir-onglet" data-rang={i} aria-current={vue === o.cle ? "page" : undefined}>
              {o.libelle}
            </Link>
          ))}
          <div className="tir-mi-plus-vues">
            <button type="button" className="tir-onglet" aria-expanded={plusOuvert} onClick={() => setPlusOuvert((v) => !v)}>
              2 de plus
              <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor" aria-hidden="true"><path d="M0.5 3h7L4 7z" /></svg>
            </button>
            {plusOuvert ? (
              <div className="tir-menu" role="menu" style={{ top: "calc(100% + 4px)", left: 0 }}>
                {ONGLETS.slice(2).map((o) => (
                  <Link key={o.cle} href={`${BASE}?vue=${o.cle}`} role="menuitem" className="tir-menu-option" onClick={() => setPlusOuvert(false)}>
                    <span className="tir-menu-libelle">{o.libelle}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <span className="tir-pousse" />
        <TirMenu libelle="Filtrer" icone="Filtre" options={filtre} alignement="droite" classeBouton="tir-rond tir-rond--plein" />
        <TirMenu libelle="Affichage" icone="Affichage" options={affichage} alignement="droite" classeBouton="tir-rond tir-rond--plein" />
        <button type="button" className="tir-rond tir-rond--plein" aria-label="Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
          <TirIcone nom="Volet" />
        </button>
      </div>
      <div className="tir-mi-corps">
        <div className={`tir-defile tir-mi-liste${puces ? "" : " tir-mi-liste--sans-puces"}`}>
          {t.erreur ? (
            <div className="tir-mi-avis" role="alert">
              <TirIcone nom="Alert" taille={14} style={{ color: "var(--tir-rouge)" }} />
              <span>La base réelle n&apos;a pas répondu. {t.erreur}</span>
            </div>
          ) : null}
          {reel?.avis.length ? (
            <div className="tir-mi-avis">
              <TirIcone nom="Alert" taille={14} style={{ color: "lch(66 80 48)" }} />
              <span>Lecture partielle. {reel.avis.join(" · ")}</span>
            </div>
          ) : null}
          {etat ? (
            <div className="tir-mi-vide">{etat}</div>
          ) : (
            groupes.map((g) => (
              <Fragment key={g.cle}>
                <GroupeVue g={g} activite={vue === "activite"} sel={sel} />
              </Fragment>
            ))
          )}
          {!etat && vue === "activite" && !groupes.length ? <div className="tir-mi-vide">Aucun appel noté sur les trente derniers jours.</div> : null}
        </div>
        {choisiesL.length || avisLot ? (
          <div className="tir-mi-lot" role="toolbar" aria-label="Actions sur la sélection">
            {avisLot && !choisiesL.length ? (
              <span className="tir-mi-lot-compte">{avisLot}</span>
            ) : (
              <>
                <span className="tir-mi-lot-compte">{choisiesL.length} choisie{choisiesL.length > 1 ? "s" : ""}</span>
                <button type="button" className="tir-mi-lot-bouton" onClick={epingler}><TirIcone nom="Etoile" taille={14} />{choisiesL.every((l) => l.cle.startsWith("fav-")) ? "Désépingler" : "Épingler"}</button>
                <span className="tir-menu-ancre">
                  <button type="button" className="tir-mi-lot-bouton" aria-expanded={menuLot === "reporter"} onClick={() => setMenuLot((m) => (m ? null : "reporter"))}><TirIcone nom="Clock" taille={14} />Reporter</button>
                  {menuLot === "reporter" ? (
                    <div className="tir-menu" role="menu" style={{ bottom: "calc(100% + 6px)", left: 0 }}>
                      <button type="button" role="menuitem" className="tir-menu-option" onClick={() => reporter(1)}><span className="tir-menu-libelle">À demain</span></button>
                      <button type="button" role="menuitem" className="tir-menu-option" onClick={() => reporter(3)}><span className="tir-menu-libelle">Dans 3 jours</span></button>
                      <button type="button" role="menuitem" className="tir-menu-option" onClick={() => reporter(7)}><span className="tir-menu-libelle">Dans une semaine</span></button>
                      <div className="tir-menu-sep" />
                      <button type="button" role="menuitem" className="tir-menu-option" onClick={() => reporter(null)}><span className="tir-menu-libelle">Remettre dans la liste</span></button>
                    </div>
                  ) : null}
                </span>
                <button type="button" className="tir-mi-lot-bouton" onClick={() => void copierLot()}><TirIcone nom="Agent" taille={14} />Copier pour l&apos;assistant</button>
                <button type="button" className="tir-mi-lot-bouton" onClick={exporter}><TirIcone nom="Spreadsheet" taille={14} />Exporter en CSV</button>
                <button type="button" className="tir-mi-lot-bouton" aria-label="Tout désélectionner" onClick={() => setChoisies(new Set())}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.7 3.7a.75.75 0 0 1 1.06 0L8 6.94l3.24-3.24a.75.75 0 1 1 1.06 1.06L9.06 8l3.24 3.24a.75.75 0 1 1-1.06 1.06L8 9.06l-3.24 3.24a.75.75 0 0 1-1.06-1.06L6.94 8 3.7 4.76a.75.75 0 0 1 0-1.06" /></svg>
                </button>
              </>
            )}
          </div>
        ) : null}
        {details && d ? (
          <aside className="tir-mi-volet" aria-label="Détails du cabinet">
            <div className="tir-mi-volet-titre">{d.cabinet.entite_nom ?? "Cabinet"}</div>
            {t.source === "reelle" && reel && reel.cabinets.length > 1 ? (
              <label className="tir-mi-volet-ligne">
                <span>Cabinet</span>
                <select className="tir-mi-select" value={reel.dossier?.cabinet.id ?? ""} onChange={(e) => t.choisirCabinet(e.target.value)}>
                  {reel.cabinets.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.entite_nom}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="tir-mi-volet-ligne"><span>État</span><span>{STATUTS_CABINET[d.cabinet.statut]?.libelle ?? d.cabinet.statut} · {d.cabinet.mode === "reel" ? "Mode réel" : "À blanc"}</span></div>
            <div className="tir-mi-volet-ligne"><span>Logiciel</span><span>{libelleLogiciel(d.cabinet.logiciel)}</span></div>
            <div className="tir-mi-volet-ligne"><span>Point du matin</span><span>{d.cabinet.heure_point.slice(0, 5)}</span></div>
            <div className="tir-mi-volet-ligne"><span>Dernier relevé</span><span>{d.cabinet.dernier_releve_le ? complet(d.cabinet.dernier_releve_le) : "—"}</span></div>
            <div className="tir-mi-volet-ligne"><span>Source</span><span>{t.source === "exemple" ? "Données d'exemple" : "Base réelle"}</span></div>
            <p className="tir-mi-volet-note">Tiroma lit l&apos;agenda, les plans et les devis du logiciel du cabinet, sans y écrire.</p>
            <Link href={`${BASE}/reglages`} className="tir-mi-volet-lien">Le cabinet, dans les réglages</Link>
          </aside>
        ) : null}
      </div>
    </TirCarte>
  );
}
