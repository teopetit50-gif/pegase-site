"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Créneaux et appels (02/11/2026, refonte des pages métiers)

   La page « Threads » de Plain, au 1:1 : liste « All threads » (groupes,
   lignes de 67 en grille) puis le fil ouvert (fil de messages, barre
   d'action flottante, volet de détails de 384). Relevé
   docs/refonte-metiers/releves/plain-threads.md (branche refs-plain-attio-cal),
   jetons et briques plain-commun.md ; styles ./tir-plain.css (socle) et
   ./tir-fils.css ; icônes relevées dans le DOM de Plain (./PlainIcone).

   Un fil = un patient à appeler ou à suivre. Ce qu'elle reprend de l'écran
   d'avant (inventaire docs/refonte-metiers/tiroma.md) :
     · B8 Créneaux à sauver : un fil par créneau libéré (ou repris), les
       candidats dans l'ordre au fil des messages, « hors préférences » et
       « ne pas contacter » en note ; ouvert depuis le point du matin par
       ?creneau=<evenement_id> (comme Plain ouvert par son adresse : sans
       la colonne liste) ;
     · B12 Appels à reprendre (et le bilan en tête de groupe), B10 Absences
       probables, B24 Réponses des patients, B25 Liste d'attente (F6
       inscription : « Nouveau fil » ; F7 retrait : menu « More »), B23
       Contrôles dus (sans « Noter l'appel », comme avant) ;
     · F3 / G2 « Noter l'appel » : le « Reply » de Plain (R) ; « Ne plus
       contacter » demande une confirmation.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FAMILLES, ISSUES_APPEL, MOTIFS_APPEL, ORIGINES, REPONSES_RAPPEL, TYPES_CRENEAU, libelleLogiciel } from "@/components/espace/tiroma/libelles";
import type { Attente, CibleAppel, Dossier, Famille, IssueAppel, PatientCourt } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma } from "./donnees";
import { PlainIcone, PrioriteIcone, type NomPlainIcone, type PrioritePlain } from "./PlainIcone";
import { copier, dansJours, estReporte, exporterCSV, useAssignes, useFavoris, useLiens, useNotes, useReportes, useSuivis } from "./navigateur";
import "./tir-plain.css";
import "./tir-fils.css";

const BASE = `${RACINE}/tiroma/creneaux`;

type Groupe = "creneaux" | "appels" | "absences" | "reponses" | "attente" | "controles";
const GROUPES: { cle: Groupe; libelle: string; icone: NomPlainIcone }[] = [
  { cle: "creneaux", libelle: "Créneaux à sauver", icone: "Premiere" },
  { cle: "appels", libelle: "Appels à reprendre", icone: "Suivante" },
  { cle: "absences", libelle: "Absences probables", icone: "Enquete" },
  { cle: "reponses", libelle: "Réponses des patients", icone: "Premiere" },
  { cle: "attente", libelle: "Liste d'attente", icone: "Enquete" },
  { cle: "controles", libelle: "Contrôles dus", icone: "Suivante" },
];

type Item =
  | { type: "date"; texte: string }
  | { type: "message"; auteur: string; adresse?: string; date: string; corps: string[] }
  | { type: "note"; auteur: string; date: string; corps: string[]; pied: string }
  | { type: "evenement"; qui: string; texte: string; pastilles?: string[]; date: string }
  | { type: "etat"; texte: string };

type Fil = {
  cle: string;
  groupe: Groupe;
  ref: string;
  icone: NomPlainIcone;
  fait?: boolean;
  compte: string;
  client: string;
  tier?: { texte: string; couleur: string };
  titre: string;
  apercu: string;
  etiquettes: string[];
  priorite: PrioritePlain;
  canal: "code" | "bulle";
  quand: string;
  assigne: string | null;
  details: { libelle: string; valeur: React.ReactNode }[];
  personne?: { nom: string; lignes: { libelle: string; valeur: React.ReactNode }[] };
  liens: { libelle: string; href: string }[];
  timeline: Item[];
  cibles: CibleAppel[];
  attente?: Attente;
  /* le patient du fil (Suivre), quand il est connu */
  patient?: { id: string; nom: string };
  suivi?: boolean;
};

/* ——— dates ——— */
const jourISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourLong = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const jourCourt = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const jourMois = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const heure = (iso: string) => enDate(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
function relatif(iso: string): string {
  const ms = Date.now() - enDate(iso).getTime();
  const futur = ms < 0;
  const m = Math.round(Math.abs(ms) / 60000);
  const t = m < 60 ? `${Math.max(m, 1)} min` : m < 60 * 24 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} j`;
  return futur ? `dans ${t}` : `il y a ${t}`;
}
function enJours(iso: string, jours: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + jours);
  return jourISO(d);
}

const TEINTES_FAMILLE = (f: string | null): string => {
  if (!f) return "#8e8e9c";
  if (f.startsWith("prothese")) return "#ab4aba";
  if (f.startsWith("implant") || f === "chirurgie") return "#e33d3d";
  if (f.startsWith("orthodontie")) return "#5c67f4";
  if (f === "controle" || f === "detartrage" || f === "parodontie") return "#00c770";
  return "#f4c224";
};
const COULEURS_AVATAR = ["#3d9a50", "#5c67f4", "#ab4aba", "#e79d00", "#e33d3d", "#448bff"];
function couleurDe(nom: string): string {
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COULEURS_AVATAR[h % COULEURS_AVATAR.length];
}
function Avatar({ nom, taille = 18 }: { nom: string | null; taille?: number }) {
  if (!nom) return <PlainIcone nom="NonAssigne" taille={taille} style={{ color: "var(--pl-icone-1)" }} />;
  const lettre = nom.replace(/^Dr\.?\s+/i, "").trim()[0]?.toUpperCase() ?? "·";
  return (
    <span className="pl-avatar" title={nom} style={{ width: taille, height: taille, background: couleurDe(nom), fontSize: taille > 24 ? 16 : 10, borderRadius: taille > 24 ? 6 : 4 }}>
      {lettre}
    </span>
  );
}

/* ——— les fils, tirés du dossier ——— */
function filsDuDossier(d: Dossier): Fil[] {
  const fils: Fil[] = [];
  const derniers = d.appels?.derniers ?? {};
  const registre = !!d.appels;
  const logiciel = libelleLogiciel(d.cabinet.logiciel);
  const evenementAppel = (patient_id: string, nom: string): Item[] => {
    const a = derniers[patient_id];
    if (!a) return [];
    return [{ type: "evenement", qui: a.par ?? "Le cabinet", texte: `a noté l'appel de ${nom}`, pastilles: [ISSUES_APPEL[a.issue].libelle, ...(a.issue === "rappeler" && a.rappeler_le ? [`rappeler le ${jourMois(a.rappeler_le)}`] : [])], date: a.appele_le }];
  };

  /* B8 — créneaux libérés */
  d.creneaux.forEach((c, i) => {
    const libres = c.candidats.filter((x) => !x.ne_pas_contacter);
    const notes = c.candidats.filter((x) => !x.preferences_ok || x.ne_pas_contacter);
    const imminent = enDate(c.debut).getTime() - Date.now() < 36 * 3600e3;
    fils.push({
      cle: `creneau:${c.evenement_id}`,
      groupe: "creneaux",
      ref: `CR-${i + 1}`,
      icone: "Premiere",
      fait: !c.libre,
      compte: c.fauteuil_nom ?? "Cabinet",
      client: c.praticien_nom ?? "",
      tier: c.famille ? { texte: FAMILLES[c.famille] ?? c.famille, couleur: TEINTES_FAMILLE(c.famille) } : undefined,
      titre: `${TYPES_CRENEAU[c.type] ?? c.type} ${jourMois(c.debut)} ${heure(c.debut)} · ${c.minutes} min`,
      apercu: !c.libre ? "Déjà repris." : c.candidats.length ? `Appeler ${c.candidats.map((x) => x.patient_nom).join(", ")}` : "Aucun patient ne convient.",
      etiquettes: !c.libre ? ["Déjà repris"] : [...new Set(c.candidats.map((x) => ORIGINES[x.origine].libelle))],
      priorite: !c.libre ? "low" : imminent ? "urgent" : "high",
      canal: "code",
      quand: c.detecte_le,
      assigne: c.praticien_nom,
      details: [
        { libelle: "Fauteuil", valeur: c.fauteuil_nom ?? "—" },
        { libelle: "Praticien", valeur: c.praticien_nom ?? "—" },
        { libelle: "Statut", valeur: c.libre ? "À sauver" : "Déjà repris" },
        { libelle: "Début", valeur: `${jourMois(c.debut)} à ${heure(c.debut)}` },
        { libelle: "Fin", valeur: heure(c.fin) },
        { libelle: "Durée", valeur: `${c.minutes} min` },
        { libelle: "Libéré le", valeur: `${jourCourt(c.detecte_le)} à ${heure(c.detecte_le)}` },
      ],
      personne: c.candidats[0]
        ? {
            nom: c.candidats[0].patient_nom,
            lignes: [
              { libelle: "Origine", valeur: ORIGINES[c.candidats[0].origine].libelle },
              { libelle: "Durée", valeur: `${c.candidats[0].duree_min} min` },
              { libelle: "Dernier appel", valeur: derniers[c.candidats[0].patient_id] ? `${ISSUES_APPEL[derniers[c.candidats[0].patient_id].issue].libelle}, ${relatif(derniers[c.candidats[0].patient_id].appele_le)}` : "—" },
            ],
          }
        : undefined,
      liens: c.candidats.filter((x) => x.plan_id).map((x) => ({ libelle: `Plan de ${x.patient_nom}`, href: `${RACINE}/tiroma/plans?plan=${encodeURIComponent(x.plan_id as string)}` })),
      timeline: [
        { type: "date", texte: jourLong(c.detecte_le) },
        {
          type: "message",
          auteur: "Logiciel du cabinet",
          adresse: logiciel,
          date: c.detecte_le,
          corps: [
            `Le rendez-vous du ${jourMois(c.debut)} à ${heure(c.debut)} (${c.minutes} min${c.fauteuil_nom ? `, ${c.fauteuil_nom}` : ""}${c.praticien_nom ? `, ${c.praticien_nom}` : ""}) : ${TYPES_CRENEAU[c.type]?.toLowerCase() ?? c.type}.`,
            "",
            c.libre ? `Le créneau est libre ; Tiroma l'a relevé le ${jourCourt(c.detecte_le)} à ${heure(c.detecte_le)}.` : "Le créneau est déjà repris dans l'agenda.",
          ],
        },
        ...(c.libre
          ? [
              {
                type: "message" as const,
                auteur: "Tiroma",
                adresse: "ordre d'appel",
                date: c.detecte_le,
                corps: c.candidats.length
                  ? [
                      "Les patients qui peuvent reprendre ce créneau, dans l'ordre :",
                      "",
                      ...c.candidats.map((x) => `${x.rang}. ${x.patient_nom} — ${ORIGINES[x.origine].libelle.toLowerCase()} : ${x.motif} (${x.duree_min} min)`),
                      "",
                      "L'assistante appelle dans cet ordre ; le rendez-vous se pose dans le logiciel du cabinet.",
                    ]
                  : ["Aucun patient ne convient : ni plan accepté, ni liste d'attente, ni contrôle dû pour cette durée et ce praticien."],
              },
            ]
          : []),
        ...(notes.length
          ? [
              {
                type: "note" as const,
                auteur: "Tiroma",
                date: c.detecte_le,
                corps: notes.map((x) => `${x.patient_nom} : ${x.ne_pas_contacter ? "a demandé à ne pas être contacté" : "hors préférences (jour ou heure)"}.`),
                pied: "Visible de l'équipe seulement",
              },
            ]
          : []),
        ...c.candidats.flatMap((x) => evenementAppel(x.patient_id, x.patient_nom)),
        { type: "date", texte: "Aujourd'hui" },
        { type: "etat", texte: !c.libre ? "Créneau repris" : libres.length ? `À sauver : ${libres.length} patient${libres.length > 1 ? "s" : ""} à appeler` : "À sauver : personne à appeler" },
      ],
      patient: c.candidats[0] ? { id: c.candidats[0].patient_id, nom: c.candidats[0].patient_nom } : undefined,
      cibles: registre && c.libre ? libres.map((x) => ({ patient_id: x.patient_id, patient_nom: x.patient_nom, motif: "creneau" as const, plan_id: x.plan_id, evenement_id: c.evenement_id })) : [],
    });
  });

  /* B12 — appels à reprendre */
  (d.appels?.a_reprendre ?? [])
    .slice()
    .sort((x, y) => Number(y.du) - Number(x.du))
    .forEach((s, i) => {
      fils.push({
        cle: `appel:${s.patient_id}:${s.motif}:${s.plan_id ?? ""}`,
        groupe: "appels",
        ref: `AP-${i + 1}`,
        icone: "Suivante",
        compte: s.patient_nom,
        client: MOTIFS_APPEL[s.motif],
        tier: { texte: ISSUES_APPEL[s.issue].libelle, couleur: s.issue === "rappeler" ? "#e79d00" : "#448bff" },
        titre: s.du ? "À reprendre aujourd'hui" : `À reprendre le ${s.rappeler_le ? jourMois(s.rappeler_le) : "—"}`,
        apercu: `${s.tentatives} appel${s.tentatives > 1 ? "s" : ""}, le dernier ${relatif(s.appele_le)}${s.par ? ` par ${s.par}` : ""}`,
        etiquettes: [MOTIFS_APPEL[s.motif]],
        priorite: s.du ? "high" : "normal",
        canal: "bulle",
        quand: s.appele_le,
        assigne: s.par,
        details: [
          { libelle: "Patient", valeur: s.patient_nom },
          { libelle: "Pour le", valeur: MOTIFS_APPEL[s.motif] },
          { libelle: "Statut", valeur: ISSUES_APPEL[s.issue].libelle },
          { libelle: "Appels", valeur: String(s.tentatives) },
          { libelle: "Rappeler le", valeur: s.rappeler_le ? jourMois(s.rappeler_le) : "—" },
        ],
        liens: s.plan_id ? [{ libelle: "Le plan", href: `${RACINE}/tiroma/plans?plan=${encodeURIComponent(s.plan_id)}` }] : [],
        timeline: [
          { type: "date", texte: jourLong(s.appele_le) },
          { type: "message", auteur: s.par ?? "Le cabinet", adresse: "appel", date: s.appele_le, corps: [`Appel à ${s.patient_nom} pour le ${MOTIFS_APPEL[s.motif]} : ${ISSUES_APPEL[s.issue].libelle.toLowerCase()}.`, ...(s.rappeler_le ? ["", `À rappeler le ${jourMois(s.rappeler_le)}.`] : [])] },
          { type: "date", texte: "Aujourd'hui" },
          { type: "etat", texte: s.du ? "À rappeler aujourd'hui" : "À rappeler plus tard" },
        ],
        patient: { id: s.patient_id, nom: s.patient_nom },
        cibles: [{ patient_id: s.patient_id, patient_nom: s.patient_nom, motif: s.motif, plan_id: s.plan_id, evenement_id: null }],
      });
    });

  /* B10 — absences probables */
  (d.absences ?? []).forEach((a, i) => {
    fils.push({
      cle: `absence:${a.rendez_vous_id}`,
      groupe: "absences",
      ref: `AB-${i + 1}`,
      icone: "Enquete",
      compte: a.patient_nom,
      client: a.praticien_nom ?? "",
      tier: { texte: a.niveau === "annonce" ? "A annoncé son absence" : a.niveau === "fort" ? "Absence probable" : "Risque d'absence", couleur: a.niveau === "moyen" ? "#e79d00" : "#e33d3d" },
      titre: `Rendez-vous ${jourMois(a.debut)} ${heure(a.debut)}`,
      apercu: a.raisons.join(" · "),
      etiquettes: a.fauteuil_nom ? [a.fauteuil_nom] : [],
      priorite: a.niveau === "annonce" ? "urgent" : a.niveau === "fort" ? "high" : "normal",
      canal: "code",
      quand: a.debut,
      assigne: a.praticien_nom,
      details: [
        { libelle: "Patient", valeur: a.patient_nom },
        { libelle: "Rendez-vous", valeur: `${jourMois(a.debut)} à ${heure(a.debut)}` },
        { libelle: "Praticien", valeur: a.praticien_nom ?? "—" },
        { libelle: "Fauteuil", valeur: a.fauteuil_nom ?? "—" },
        { libelle: "Niveau", valeur: a.niveau === "annonce" ? "A annoncé son absence" : a.niveau === "fort" ? "Absence probable" : "Risque d'absence" },
      ],
      liens: [],
      timeline: [
        { type: "date", texte: "Aujourd'hui" },
        { type: "message", auteur: "Tiroma", adresse: "absences probables", date: new Date().toISOString(), corps: [`${a.patient_nom}, rendez-vous du ${jourMois(a.debut)} à ${heure(a.debut)} :`, "", ...a.raisons.map((r) => `· ${r}`)] },
        ...evenementAppel(a.patient_id, a.patient_nom),
        { type: "etat", texte: a.annonce ? "Le patient a annoncé son absence : libérez le créneau dans le logiciel du cabinet" : "Un appel de confirmation la veille réduit le risque" },
      ],
      patient: { id: a.patient_id, nom: a.patient_nom },
      cibles: registre && !a.annonce ? [{ patient_id: a.patient_id, patient_nom: a.patient_nom, motif: "autre", plan_id: null, evenement_id: null }] : [],
    });
  });

  /* B24 — réponses des patients aux rappels */
  (d.rappels?.reponses ?? []).forEach((r, i) => {
    const lib = REPONSES_RAPPEL[r.reponse]?.libelle ?? r.reponse;
    fils.push({
      cle: `reponse:${r.id}`,
      groupe: "reponses",
      ref: `RP-${i + 1}`,
      icone: "Premiere",
      fait: r.reponse === "confirme",
      compte: r.patient_nom,
      client: "",
      tier: { texte: lib, couleur: r.reponse === "confirme" ? "#00c770" : r.reponse === "annule" ? "#e33d3d" : "#e79d00" },
      titre: r.debut ? `Rendez-vous ${jourMois(r.debut)} ${heure(r.debut)}` : "Rappel",
      apercu: r.reponse === "annule" ? "Libérez le créneau dans le logiciel du cabinet." : lib,
      etiquettes: ["Rappel J-2"],
      priorite: r.reponse === "annule" ? "urgent" : r.reponse === "confirme" ? "low" : "high",
      canal: "bulle",
      quand: r.recue_le,
      assigne: null,
      details: [
        { libelle: "Patient", valeur: r.patient_nom },
        { libelle: "Réponse", valeur: lib },
        { libelle: "Rendez-vous", valeur: r.debut ? `${jourMois(r.debut)} à ${heure(r.debut)}` : "—" },
        { libelle: "Reçue", valeur: `${jourCourt(r.recue_le)} à ${heure(r.recue_le)}` },
      ],
      liens: [],
      timeline: [
        { type: "date", texte: jourLong(r.recue_le) },
        { type: "message", auteur: r.patient_nom, adresse: "réponse au rappel", date: r.recue_le, corps: [lib] },
        ...(r.reponse === "annule" ? [{ type: "note" as const, auteur: "Tiroma", date: r.recue_le, corps: ["Libérez le créneau dans le logiciel du cabinet : Tiroma le proposera au relevé suivant."], pied: "Visible de l'équipe seulement" }] : []),
        { type: "etat", texte: r.reponse === "confirme" ? "Rendez-vous confirmé" : r.reponse === "annule" ? "Créneau à libérer" : "Réponse à lire" },
      ],
      cibles: [],
    });
  });

  /* B25 — liste d'attente */
  d.attente.forEach((at, i) => {
    const praticien = d.praticiens.find((p) => p.id === at.praticien_id)?.nom_affiche ?? null;
    const nom = at.patient_nom ?? "Patient (hors de votre périmètre)";
    fils.push({
      cle: `attente:${at.id}`,
      groupe: "attente",
      ref: `LA-${i + 1}`,
      icone: "Enquete",
      compte: nom,
      client: praticien ?? "tout praticien",
      tier: at.famille ? { texte: FAMILLES[at.famille] ?? at.famille, couleur: TEINTES_FAMILLE(at.famille) } : undefined,
      titre: `En liste depuis le ${jourMois(at.ajoute_le)}`,
      apercu: [at.duree_min ? `${at.duree_min} min` : null, at.preavis_minutes ? `préavis ${at.preavis_minutes} min` : "sans préavis", at.source === "tiroma" ? "inscrit ici" : "logiciel"].filter(Boolean).join(" · "),
      etiquettes: [...(at.drapeau_gene ? ["Patient gêné"] : []), at.source === "tiroma" ? "Inscrit ici" : "Logiciel"],
      priorite: at.drapeau_gene ? "high" : "normal",
      canal: at.source === "tiroma" ? "bulle" : "code",
      quand: at.ajoute_le,
      assigne: praticien,
      details: [
        { libelle: "Patient", valeur: nom },
        { libelle: "Soin attendu", valeur: at.famille ? (FAMILLES[at.famille] ?? at.famille) : "Non précisé" },
        { libelle: "Durée", valeur: at.duree_min ? `${at.duree_min} min` : "—" },
        { libelle: "Préavis", valeur: at.preavis_minutes ? `${at.preavis_minutes} min` : "—" },
        { libelle: "Praticien", valeur: praticien ?? "Tout praticien" },
        { libelle: "Source", valeur: at.source === "tiroma" ? "Inscrit ici" : "Logiciel" },
      ],
      liens: [],
      timeline: [
        { type: "date", texte: jourLong(at.ajoute_le) },
        { type: "message", auteur: at.source === "tiroma" ? "Le cabinet" : "Logiciel du cabinet", adresse: at.source === "tiroma" ? "inscription" : logiciel, date: at.ajoute_le, corps: [`${nom} veut venir plus tôt${at.famille ? ` (${(FAMILLES[at.famille] ?? at.famille).toLowerCase()})` : ""}.`, "", `Durée ${at.duree_min ?? "—"} min, ${at.preavis_minutes ? `préavis ${at.preavis_minutes} min` : "sans préavis"}, ${praticien ?? "tout praticien"}.`] },
        ...(at.drapeau_gene ? [{ type: "note" as const, auteur: "Le cabinet", date: at.ajoute_le, corps: ["Patient gêné (douleur) : à appeler en premier."], pied: "Visible de l'équipe seulement" }] : []),
        ...evenementAppel(at.patient_id, nom),
        { type: "etat", texte: "Proposé au premier créneau libéré qui lui convient, après les plans acceptés" },
      ],
      patient: { id: at.patient_id, nom },
      cibles: registre ? [{ patient_id: at.patient_id, patient_nom: nom, motif: "attente", plan_id: null, evenement_id: null }] : [],
      attente: at,
    });
  });

  /* B23 — contrôles dus (sans « Noter l'appel », comme sur l'écran d'avant) */
  const seuil = d.controlesDus?.seuil_mois ?? 12;
  (d.controlesDus?.patients ?? []).forEach((p, i) => {
    fils.push({
      cle: `controle:${p.patient_id}`,
      groupe: "controles",
      ref: `CO-${i + 1}`,
      icone: "Suivante",
      compte: p.patient_nom,
      client: p.praticien ?? "",
      tier: { texte: p.mois_depuis === null ? "Jamais de contrôle" : `${p.mois_depuis} mois`, couleur: p.mois_depuis === null ? "#e33d3d" : p.mois_depuis >= 2 * seuil ? "#e79d00" : "#8e8e9c" },
      titre: p.dernier_controle_le ? `Dernier contrôle le ${jourCourt(p.dernier_controle_le)}` : "Aucun contrôle au cabinet",
      apercu: p.derniere_venue ? `dernière venue le ${jourCourt(p.derniere_venue)}` : "",
      etiquettes: ["Contrôle dû"],
      patient: { id: p.patient_id, nom: p.patient_nom },
      priorite: p.mois_depuis === null ? "high" : p.mois_depuis >= 2 * seuil ? "normal" : "low",
      canal: "code",
      quand: p.derniere_venue ?? new Date().toISOString(),
      assigne: p.praticien,
      details: [
        { libelle: "Patient", valeur: p.patient_nom },
        { libelle: "Dernier contrôle", valeur: p.dernier_controle_le ? jourCourt(p.dernier_controle_le) : "Jamais" },
        { libelle: "Dernière venue", valeur: p.derniere_venue ? jourCourt(p.derniere_venue) : "—" },
        { libelle: "Praticien", valeur: p.praticien ?? "—" },
        { libelle: "Seuil", valeur: `${seuil} mois` },
      ],
      liens: [],
      timeline: [
        { type: "date", texte: "Aujourd'hui" },
        { type: "message", auteur: "Tiroma", adresse: "contrôles dus", date: new Date().toISOString(), corps: [`${p.patient_nom} n'a pas eu de contrôle depuis plus de ${seuil} mois.`, "", "Tiroma le propose aux créneaux libérés qui conviennent (origine « Contrôle dû »)."] },
        { type: "etat", texte: d.controlesDus && d.controlesDus.ne_pas_contacter ? `${d.controlesDus.ne_pas_contacter} patient(s) « ne pas contacter » comptés à part` : "Contrôle dû" },
      ],
      cibles: [],
    });
  });

  return fils;
}

/* ——— le composeur « Noter l'appel » (Reply) ——— */
function Composeur({ fil, jour, fermer, issueDepart = "rdv_pris" }: { fil: Fil; jour: string; fermer: () => void; issueDepart?: IssueAppel }) {
  const t = useTiroma();
  const [cible, setCible] = useState<CibleAppel | null>(fil.cibles[0] ?? null);
  const [issue, setIssue] = useState<IssueAppel>(issueDepart);
  const [rappel, setRappel] = useState(enJours(jour, 2));
  const [confirme, setConfirme] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const noter = async () => {
    if (!cible) return;
    if (issue === "ne_plus_contacter" && !confirme) {
      setConfirme(true);
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      await t.noterAppel({ cible, issue, rappeler_le: issue === "rappeler" ? rappel : null });
      setFait(`C'est noté : ${ISSUES_APPEL[issue].libelle.toLowerCase()} pour ${cible.patient_nom}.`);
      setConfirme(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <div
      className="pl-composeur"
      role="dialog"
      aria-label="Noter l'appel"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void noter();
      }}
    >
      <div className="pl-composeur-tete">
        <PlainIcone nom="Suivante" taille={18} style={{ color: "var(--pl-icone-1)" }} />
        <span className="pl-composeur-titre">Noter l&apos;appel</span>
        {cible ? <span className="pl-composeur-pour">pour le {MOTIFS_APPEL[cible.motif]}</span> : null}
        <span className="pl-pousse" />
        <button type="button" className="pl-icone-bouton" aria-label="Fermer" onClick={fermer}>
          <PlainIcone nom="Croix" taille={14} />
        </button>
      </div>
      {fil.cibles.length > 1 ? (
        <div className="pl-composeur-ligne" role="radiogroup" aria-label="Patient">
          {fil.cibles.map((c) => (
            <button key={c.patient_id} type="button" role="radio" aria-checked={cible?.patient_id === c.patient_id} className="pl-choix" onClick={() => setCible(c)}>
              {c.patient_nom}
            </button>
          ))}
        </div>
      ) : null}
      <div className="pl-composeur-ligne" role="radiogroup" aria-label="Ce qui s'est passé">
        {(Object.keys(ISSUES_APPEL) as IssueAppel[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={issue === k} className="pl-choix" onClick={() => { setIssue(k); setConfirme(false); }}>
            {ISSUES_APPEL[k].libelle}
          </button>
        ))}
      </div>
      {issue === "rappeler" ? (
        <label className="pl-composeur-champ">
          <span>Rappeler le</span>
          <input className="pl-champ" type="date" value={rappel} min={jour} max={enJours(jour, 180)} onChange={(e) => setRappel(e.target.value)} />
        </label>
      ) : null}
      <p className="pl-composeur-aide">
        {issue === "ne_plus_contacter"
          ? "Notez-le aussi dans le logiciel du cabinet : c'est lui qui fait foi, et Tiroma reprend sa liste à chaque relevé."
          : "Le rendez-vous se pose dans le logiciel du cabinet ; Tiroma le confirmera au prochain relevé."}
      </p>
      {erreur ? <p className="pl-composeur-erreur" role="alert">{erreur}</p> : null}
      {fait ? <p className="pl-composeur-fait" role="status">{fait}</p> : null}
      <div className="pl-composeur-pied">
        <button type="button" className="pl-secondaire" onClick={fermer}>Annuler</button>
        <button type="button" className="pl-primaire" disabled={occupe || !cible || (issue === "rappeler" && !rappel)} onClick={noter}>
          {confirme ? "Confirmer : ne plus contacter" : occupe ? "Un instant…" : "Noter"}
          <kbd className="pl-kbd pl-kbd--plein">⌘↵</kbd>
        </button>
      </div>
    </div>
  );
}

/* ——— l'inscription en liste d'attente (« Nouveau fil », F6) ——— */
function Inscription({ fermer }: { fermer: () => void }) {
  const t = useTiroma();
  const d = t.dossier;
  const [texte, setTexte] = useState("");
  const [trouves, setTrouves] = useState<PatientCourt[]>([]);
  const [patient, setPatient] = useState<PatientCourt | null>(null);
  const [famille, setFamille] = useState<Famille | "">("");
  const [duree, setDuree] = useState("30");
  const [preavis, setPreavis] = useState("");
  const [praticien, setPraticien] = useState("");
  const [gene, setGene] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  useEffect(() => {
    if (patient || texte.trim().length < 2) return;
    const h = window.setTimeout(() => {
      void t.chercher(texte).then(setTrouves).catch(() => setTrouves([]));
    }, 250);
    return () => window.clearTimeout(h);
  }, [texte, patient, t]);
  const inscrire = async () => {
    if (!patient) return;
    setOccupe(true);
    setErreur(null);
    try {
      await t.inscrire({ patient, famille: famille || null, duree_min: duree ? Number(duree) : null, praticien_id: praticien || null, preavis_minutes: preavis ? Number(preavis) : null, gene });
      setFait(`C'est fait. ${[patient.prenom, patient.nom].filter(Boolean).join(" ")} est en liste d'attente.`);
      setPatient(null);
      setTexte("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <div className="pl-pop pl-inscription" role="dialog" aria-label="Inscrire un patient en liste d'attente">
      <div className="pl-pop-titre">Inscrire un patient en liste d&apos;attente</div>
      <p className="pl-composeur-aide">Tiroma le proposera au premier créneau libéré qui lui convient, après les plans acceptés. Un patient qui a demandé à ne pas être contacté ne s&apos;inscrit pas.</p>
      <label className="pl-composeur-champ">
        <span>Patient (obligatoire)</span>
        <input className="pl-champ" value={patient ? [patient.prenom, patient.nom].filter(Boolean).join(" ") : texte} onChange={(e) => { setPatient(null); setTexte(e.target.value); }} placeholder="Les premières lettres du nom" autoComplete="off" />
      </label>
      {!patient && texte.trim().length >= 2 && trouves.length ? (
        <div className="pl-trouves" role="listbox" aria-label="Patients trouvés">
          {trouves.map((p) => (
            <button key={p.id} type="button" role="option" aria-selected={false} className="pl-menu-item" disabled={p.ne_pas_contacter} onClick={() => setPatient(p)}>
              {[p.prenom, p.nom].filter(Boolean).join(" ")}
              {p.ne_pas_contacter ? " — ne pas contacter" : ""}
            </button>
          ))}
        </div>
      ) : null}
      <label className="pl-composeur-champ">
        <span>Soin attendu</span>
        <select className="pl-champ" value={famille} onChange={(e) => setFamille(e.target.value as Famille | "")}>
          <option value="">Non précisé</option>
          {(Object.keys(FAMILLES) as Famille[]).filter((f) => f !== "personnel").map((f) => (
            <option key={f} value={f}>{FAMILLES[f]}</option>
          ))}
        </select>
      </label>
      <div className="pl-deux">
        <label className="pl-composeur-champ"><span>Durée (min)</span><input className="pl-champ" type="number" min={5} max={600} value={duree} onChange={(e) => setDuree(e.target.value)} /></label>
        <label className="pl-composeur-champ"><span>Préavis (min)</span><input className="pl-champ" type="number" min={0} max={20160} value={preavis} onChange={(e) => setPreavis(e.target.value)} /></label>
      </div>
      <label className="pl-composeur-champ">
        <span>Praticien</span>
        <select className="pl-champ" value={praticien} onChange={(e) => setPraticien(e.target.value)}>
          <option value="">Tout praticien</option>
          {(d?.praticiens ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.nom_affiche}</option>
          ))}
        </select>
      </label>
      <label className="pl-case"><input type="checkbox" checked={gene} onChange={(e) => setGene(e.target.checked)} /> Patient gêné (douleur) : à appeler en premier</label>
      {erreur ? <p className="pl-composeur-erreur" role="alert">{erreur}</p> : null}
      {fait ? <p className="pl-composeur-fait" role="status">{fait}</p> : null}
      <div className="pl-composeur-pied">
        <button type="button" className="pl-secondaire" onClick={fermer}>Fermer</button>
        <button type="button" className="pl-primaire" disabled={occupe || !patient} onClick={inscrire}>{occupe ? "Un instant…" : "Inscrire"}</button>
      </div>
    </div>
  );
}

/* ——— une ligne de la liste (1073×67, grille 32 18 300 355.5 76 84 113.5 94) ——— */
function LigneFil({ f, href, choisi, basculer }: { f: Fil; href: string; choisi: boolean; basculer: () => void }) {
  return (
    <Link href={href} className="pl-ligne" data-fait={f.fait ? "" : undefined} data-choisi={choisi ? "" : undefined}>
      <span className="pl-ligne-case">
        <span
          className="pl-case-carre"
          role="checkbox"
          aria-checked={choisi}
          aria-label={`Choisir ${f.ref}`}
          tabIndex={0}
          data-coche={choisi ? "" : undefined}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            basculer();
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              basculer();
            }
          }}
        >
          {choisi ? <PlainIcone nom="Coche" taille={14} /> : null}
        </span>
      </span>
      <span className="pl-ligne-statut"><PlainIcone nom={f.icone} /></span>
      <span className="pl-ligne-compte">
        <span className="pl-l1">
          <span className="pl-vignette"><PlainIcone nom="Batiment" taille={12} /></span>
          <span className="pl-compte">{f.compte}</span>
          <span className="pl-client">{f.client}</span>
        </span>
        {f.tier ? (
          <span className="pl-l2">
            <span className="pl-pastille"><PlainIcone nom="Tier" taille={14} style={{ color: f.tier.couleur }} />{f.tier.texte}</span>
          </span>
        ) : null}
      </span>
      <span className="pl-ligne-sujet">
        <span className="pl-l1">
          <span className="pl-ref">{f.ref}</span>
          <span className="pl-titre">{f.titre}</span>
          <span className="pl-apercu">{f.apercu}</span>
        </span>
        {f.etiquettes.length ? (
          <span className="pl-l2">
            {f.etiquettes.map((e) => (
              <span key={e} className="pl-pastille pl-etiquette">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h8.6a2 2 0 0 1 1.5.7l3.6 4.3a1.5 1.5 0 0 1 0 2l-3.6 4.3a2 2 0 0 1-1.5.7H6.5A2.5 2.5 0 0 1 4 14.5z" /></svg>
                {e}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="pl-ligne-priorite">
        <PrioriteIcone p={f.priorite} />
        <span>{f.priorite === "urgent" ? "Urgent" : f.priorite === "high" ? "Haute" : f.priorite === "normal" ? "Normale" : "Basse"}</span>
      </span>
      <span className="pl-ligne-sla" />
      <span className="pl-ligne-canal">
        <PlainIcone nom={f.canal === "code" ? "Code" : "Bulle"} />
        <span>{relatif(f.quand)}</span>
      </span>
      <span className="pl-ligne-assigne"><Avatar nom={f.assigne} /></span>
    </Link>
  );
}

/* ——— la carte d'un fil dans la colonne de 400 (fil ouvert depuis la liste) ——— */
function CarteFil({ f, href, ouvert }: { f: Fil; href: string; ouvert: boolean }) {
  return (
    <Link href={href} className="pl-carte-fil" aria-current={ouvert ? "true" : undefined}>
      <span className="pl-cf-l1">
        <span className="pl-vignette"><PlainIcone nom="Batiment" taille={12} /></span>
        <span className="pl-cf-compte">{f.compte}</span>
        <span className="pl-cf-client">{f.client}</span>
        <span className="pl-pousse" />
        <PlainIcone nom={f.icone} style={{ color: "var(--pl-bleu-icone)" }} />
      </span>
      <span className="pl-cf-l2"><span className="pl-ref">{f.ref}</span> <span className="pl-titre">{f.titre}</span></span>
      <span className="pl-cf-l3">{f.apercu || "Sans aperçu"}</span>
      <span className="pl-cf-l4">
        {f.tier ? <span className="pl-pastille"><PlainIcone nom="Tier" taille={14} style={{ color: f.tier.couleur }} />{f.tier.texte}</span> : null}
      </span>
      <span className="pl-cf-l5">
        <PrioriteIcone p={f.priorite} />
        <span>{f.priorite === "urgent" ? "Urgent" : f.priorite === "high" ? "Haute" : f.priorite === "normal" ? "Normale" : "Basse"}</span>
        <span className="pl-pousse" />
        <PlainIcone nom={f.canal === "code" ? "Code" : "Bulle"} style={{ color: "var(--pl-icone-1)" }} />
        <span className="pl-cf-quand">{relatif(f.quand)}</span>
        <Avatar nom={f.assigne} />
      </span>
    </Link>
  );
}

function Timeline({ f, compact, notes }: { f: Fil; compact: boolean; notes: { texte: string; le: string }[] }) {
  /* vue compacte (premier bouton du segment de Plain) : les messages seuls ; vue complète : notes, événements et notes de ce poste */
  const items: Item[] = [
    ...f.timeline.filter((it) => !compact || it.type === "message" || it.type === "date"),
    ...(compact ? [] : notes.map((n) => ({ type: "note" as const, auteur: "Vous", date: n.le, corps: [n.texte], pied: "Visible sur ce poste seulement" }))),
  ];
  return (
    <div className="pl-fil-timeline">
      {items.map((it, i) => {
        if (it.type === "date") return <div key={i} className="pl-sep-date">{it.texte}</div>;
        if (it.type === "message")
          return (
            <div key={i} className="pl-message">
              <span className="pl-message-avatar"><Avatar nom={it.auteur} taille={40} /></span>
              <div className="pl-message-carte">
                <div className="pl-message-tete">
                  <span className="pl-message-auteur">{it.auteur}{it.adresse ? ` (${it.adresse})` : ""}</span>
                  <span className="pl-message-date">{jourCourt(it.date)}</span>
                  <span className="pl-pousse" />
                  <PlainIcone nom="Points" taille={14} style={{ color: "var(--pl-texte-2)" }} />
                </div>
                <div className="pl-message-corps">
                  {it.corps.map((l, j) => (l ? <p key={j}>{l}</p> : <p key={j} aria-hidden="true">&nbsp;</p>))}
                </div>
              </div>
            </div>
          );
        if (it.type === "note")
          return (
            <div key={i} className="pl-message pl-message--note">
              <div className="pl-message-carte">
                <div className="pl-message-tete">
                  <Avatar nom={it.auteur} />
                  <span className="pl-note-auteur">{it.auteur}</span>
                  <span className="pl-note-quoi">a laissé une note</span>
                  <span className="pl-note-date">{jourCourt(it.date)}</span>
                  <span className="pl-pousse" />
                  <PlainIcone nom="Points" taille={14} style={{ color: "var(--pl-texte-2)" }} />
                </div>
                <div className="pl-message-corps">
                  {it.corps.map((l, j) => <p key={j}>{l}</p>)}
                </div>
                <div className="pl-note-pied">{it.pied}</div>
              </div>
            </div>
          );
        if (it.type === "evenement")
          return (
            <div key={i} className="pl-evenement">
              <span className="pl-evenement-point" />
              <span className="pl-evenement-qui">{it.qui}</span>
              <span>{it.texte}</span>
              {it.pastilles?.map((p) => <span key={p} className="pl-pastille pl-etiquette">{p}</span>)}
              <span>·</span>
              <span>{relatif(it.date)}</span>
            </div>
          );
        return (
          <div key={i} className="pl-etat">
            <PlainIcone nom={f.icone} taille={14} style={{ color: "var(--pl-bleu-icone)" }} />
            <span>{it.texte}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CreneauxAppels() {
  const t = useTiroma();
  const router = useRouter();
  const params = useSearchParams();
  const d = t.dossier;
  const fils = useMemo(() => (d ? filsDuDossier(d) : []), [d]);
  const vue = params.get("vue") as Groupe | null;
  const [masques, setMasques] = useState<Groupe[]>([]);
  const [faits, setFaits] = useState(true);
  const [menu, setMenu] = useState<null | "filtres" | "affichage" | "plus" | "plus-barre">(null);
  const [composer, setComposer] = useState(false);
  const [details, setDetails] = useState(true);
  const [inscrire, setInscrire] = useState(params.get("inscrire") === "1");
  const [retrait, setRetrait] = useState<Attente["motif_retrait"] | null>(null);
  const [avisRetrait, setAvisRetrait] = useState<string | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [favoris, poserFavori] = useFavoris();
  const [suivis, poserSuivi] = useSuivis();
  const [reportes, poserReporte] = useReportes();
  const [notesLoc, poserNotes] = useNotes();
  const [assignes, poserAssigne] = useAssignes();
  const [liensLoc, poserLiens] = useLiens();
  const [reportesVisibles, setReportesVisibles] = useState(false);
  const [choisis, setChoisis] = useState<Set<string>>(new Set());
  const [menuLot, setMenuLot] = useState<null | "appel" | "reporter">(null);
  const [issueLot, setIssueLot] = useState<IssueAppel | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [noteOuverte, setNoteOuverte] = useState(false);
  const [noteTexte, setNoteTexte] = useState("");
  const [issueDepart, setIssueDepart] = useState<IssueAppel>("rdv_pris");
  const [sousMenu, setSousMenu] = useState<null | "statut" | "assigner" | "lien">(null);
  const annoncer = (texte: string) => {
    setAvis(texte);
    window.setTimeout(() => setAvis(null), 4000);
  };

  /* le fil ouvert : ?fil=<clé> depuis la liste (avec la colonne de 400), ?creneau=<id> par son adresse (sans) */
  const parAdresse = params.get("creneau");
  const cleOuverte = params.get("fil") ?? (parAdresse ? `creneau:${parAdresse}` : null);
  const ouvertBrut = cleOuverte ? (fils.find((f) => f.cle === cleOuverte) ?? null) : null;
  const avecListe = !!params.get("fil");

  /* Suivre (cloche) : les fils d'un patient suivi passent en tête, marqués « Suivi » ; Reporter (Snooze) : masqués jusqu'à la date ; Assign : qui appelle */
  const enrichis = useMemo(
    () =>
      fils.map((f) => {
        const suivi = !!(f.patient && suivis[f.patient.id]);
        return { ...f, suivi, assigne: assignes[f.cle] ?? f.assigne, etiquettes: suivi ? ["Suivi", ...f.etiquettes] : f.etiquettes };
      }),
    [fils, suivis, assignes],
  );
  const ouvert = ouvertBrut ? (enrichis.find((f) => f.cle === ouvertBrut.cle) ?? null) : null;
  const visibles = useMemo(
    () => enrichis.filter((f) => (!vue || f.groupe === vue) && !masques.includes(f.groupe) && (faits || !f.fait) && (reportesVisibles || !estReporte(reportes, f.cle))),
    [enrichis, vue, masques, faits, reportes, reportesVisibles],
  );
  const groupes = [
    ...(visibles.some((f) => f.suivi) ? [{ cle: "suivis" as const, libelle: "Suivis", icone: "Suivante" as NomPlainIcone, fils: visibles.filter((f) => f.suivi) }] : []),
    ...GROUPES.filter((g) => (!vue || g.cle === vue) && !masques.includes(g.cle)).map((g) => ({ ...g, fils: visibles.filter((f) => f.groupe === g.cle && !f.suivi) })),
  ].filter((g) => g.fils.length);
  const choisisF = visibles.filter((f) => choisis.has(f.cle));
  const basculer = (cle: string) =>
    setChoisis((c) => {
      const n = new Set(c);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });
  const resumeFil = (f: Fil) => [`${f.ref} — ${f.titre} (${GROUPES.find((g) => g.cle === f.groupe)?.libelle})`, `${f.compte}${f.client ? `, ${f.client}` : ""} · ${f.apercu}`, ...f.details.map((r) => `${r.libelle} : ${typeof r.valeur === "string" ? r.valeur : ""}`), ...f.timeline.filter((it) => it.type === "message").flatMap((it) => (it.type === "message" ? it.corps.filter(Boolean) : []))].join("\n");
  const finirLot = (texte: string) => {
    setChoisis(new Set());
    setMenuLot(null);
    setIssueLot(null);
    annoncer(texte);
  };
  const noterLot = async () => {
    if (!issueLot) return;
    const avecCible = choisisF.filter((f) => f.cibles.length);
    try {
      for (const f of avecCible) await t.noterAppel({ cible: f.cibles[0], issue: issueLot, rappeler_le: issueLot === "rappeler" ? dansJours(2) : null });
      finirLot(`${avecCible.length} appel(s) noté(s) : ${ISSUES_APPEL[issueLot].libelle.toLowerCase()}.`);
    } catch (e) {
      finirLot(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  };
  const suivreFil = (f: Fil, oui: boolean) => f.patient && poserSuivi(f.patient.id, oui ? f.patient.nom : null);
  const epinglerFil = (f: Fil, oui: boolean) => poserFavori(`fil-${f.cle}`, oui ? { titre: `${f.ref} · ${f.compte} — ${f.titre}`, href: `${BASE}?fil=${encodeURIComponent(f.cle)}`, type: GROUPES.find((g) => g.cle === f.groupe)?.libelle ?? "Fil", depuis: new Date().toISOString() } : null);
  const exporterListe = (fs: Fil[]) =>
    exporterCSV("tiroma-creneaux-appels", ["Réf.", "Groupe", "Compte", "Client", "Titre", "Aperçu", "Étiquettes", "Priorité", "Assigné"], fs.map((f) => [f.ref, GROUPES.find((g) => g.cle === f.groupe)?.libelle ?? "", f.compte, f.client, f.titre, f.apercu, f.etiquettes.join(", "), f.priorite, f.assigne ?? ""]));

  const lien = useCallback(
    (f: Fil) => {
      const q = new URLSearchParams();
      if (vue) q.set("vue", vue);
      q.set("fil", f.cle);
      return `${BASE}?${q.toString()}`;
    },
    [vue],
  );
  const listeHref = vue ? `${BASE}?vue=${vue}` : BASE;

  /* raccourcis relevés : F (Filters), V (Display), R (Reply), Échap, ↑/↓ fil précédent / suivant */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (cible.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        if (composer) setComposer(false);
        else if (menu) setMenu(null);
        else if (inscrire) setInscrire(false);
        else if (ouvert) router.push(listeHref);
        return;
      }
      if (!ouvert && (e.key === "f" || e.key === "F")) setMenu((m) => (m === "filtres" ? null : "filtres"));
      if (!ouvert && (e.key === "v" || e.key === "V")) setMenu((m) => (m === "affichage" ? null : "affichage"));
      if (ouvert && (e.key === "r" || e.key === "R") && ouvert.cibles.length) setComposer(true);
      if (ouvert && (e.key === "y" || e.key === "Y")) setSousMenu((m) => (m === "statut" ? null : "statut"));
      if (ouvert && (e.key === "n" || e.key === "N")) setNoteOuverte(true);
      if (ouvert && (e.key === "b" || e.key === "B")) void copier(resumeFil(ouvert)).then((ok) => annoncer(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie."));
      if (ouvert && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const i = visibles.findIndex((f) => f.cle === ouvert.cle);
        const j = e.key === "ArrowDown" ? i + 1 : i - 1;
        if (visibles[j]) router.push(lien(visibles[j]));
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [composer, menu, inscrire, ouvert, router, listeHref, visibles, lien]);

  useEffect(() => {
    const h = window.setTimeout(() => {
      setComposer(false);
      setRetrait(null);
      setAvisRetrait(null);
      setNoteOuverte(false);
      setSousMenu(null);
      setIssueDepart("rdv_pris");
    }, 0);
    return () => window.clearTimeout(h);
  }, [cleOuverte]);

  const peutEcrire = !!d && d.profil !== null && d.profil !== "direction";
  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${RACINE}/tiroma/reglages`}>Installer le cabinet</Link></>;
  else if (!d) etat = "Lecture du cabinet…";

  /* ——— fil ouvert ——— */
  if (ouvert && d) {
    const i = visibles.findIndex((f) => f.cle === ouvert.cle);
    const precedent = i > 0 ? visibles[i - 1] : null;
    const suivant = i >= 0 && i < visibles.length - 1 ? visibles[i + 1] : null;
    const confirmerRetrait = async () => {
      if (!ouvert.attente || !retrait) return;
      try {
        await t.retirer({ attente: ouvert.attente, motif: retrait });
        setAvisRetrait(`${ouvert.compte} est retiré de la liste.`);
        setRetrait(null);
      } catch (e) {
        setAvisRetrait(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    };
    return (
      <div className="tir-pl tir-pf">
        <div className={`pf-cadre${avecListe ? " pf-cadre--liste" : ""}`}>
          {avecListe ? (
            <aside className="pf-colonne pl-carte" aria-label="Fils">
              <div className="pf-colonne-tete">
                <span className="pf-colonne-titre">Fils</span>
                <span className="pf-colonne-compte">{GROUPES.find((g) => g.cle === ouvert.groupe)?.libelle} {visibles.filter((f) => f.groupe === ouvert.groupe).length}</span>
                <span className="pl-pousse" />
                <Link href={listeHref} className="pl-fantome"><PlainIcone nom="Ecran" />Liste<kbd className="pl-kbd">Échap</kbd></Link>
              </div>
              <div className="pf-colonne-defile">
                {visibles.map((f) => <CarteFil key={f.cle} f={f} href={lien(f)} ouvert={f.cle === ouvert.cle} />)}
              </div>
            </aside>
          ) : null}
          <section className="pf-carte pl-carte" aria-label={ouvert.titre}>
            <header className="pf-tete">
              <span className="pl-vignette pl-vignette--24"><PlainIcone nom="Batiment" taille={14} /></span>
              <PlainIcone nom={ouvert.icone} taille={14} style={{ color: "var(--pl-bleu-icone)" }} />
              <span className="pf-ref">{ouvert.ref}</span>
              <h1 className="pf-h1">{ouvert.titre}</h1>
              <PlainIcone nom={ouvert.canal === "code" ? "Code" : "Bulle"} taille={14} style={{ color: "var(--pl-icone-1)" }} />
              <span className="pf-quand">{relatif(ouvert.quand)}</span>
              <span className="pl-pousse" />
              <span className="pf-segment" role="group" aria-label="Vue du fil">
                <button type="button" aria-label="Vue compacte : les messages seuls" title="Vue compacte" aria-pressed={compact} data-actif={compact ? "" : undefined} onClick={() => setCompact(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1m1 4a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2z" /></svg>
                </button>
                <button type="button" aria-label="Vue complète : notes et événements" title="Vue complète" aria-pressed={!compact} data-actif={!compact ? "" : undefined} onClick={() => setCompact(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2m0 2v3h14V6zm0 7h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2m0 2v3h14v-3z" /></svg>
                </button>
              </span>
              <div className="pl-ancre">
                <button type="button" className="pl-icone-bouton" aria-label="Plus" aria-expanded={menu === "plus"} onClick={() => setMenu((m) => (m === "plus" ? null : "plus"))}>
                  <PlainIcone nom="Points" />
                </button>
                {menu === "plus" ? (
                  <div className="pl-menu" role="menu" style={{ right: 0, top: 36, width: 220 }}>
                    <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setMenu(null); const oui = !favoris[`fil-${ouvert.cle}`]; epinglerFil(ouvert, oui); annoncer(oui ? "Épinglé en tête d'Aujourd'hui." : "Désépinglé."); }}>{favoris[`fil-${ouvert.cle}`] ? "Désépingler" : "Épingler dans Aujourd'hui"}</button>
                    {ouvert.patient ? <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setMenu(null); suivreFil(ouvert, !ouvert.suivi); annoncer(ouvert.suivi ? "Vous ne suivez plus ce patient." : "Patient suivi : ses fils passent en tête."); }}>{ouvert.suivi ? `Ne plus suivre ${ouvert.patient.nom}` : `Suivre ${ouvert.patient.nom}`}</button> : null}
                    <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setMenu(null); void copier(`${window.location.origin}${BASE}?fil=${encodeURIComponent(ouvert.cle)}`).then((ok) => annoncer(ok ? "Lien copié." : "Le presse-papier a refusé la copie.")); }}>Copier le lien du fil</button>
                    <div className="pl-menu-sep" />
                    {ouvert.liens.map((l) => (
                      <Link key={l.href} href={l.href} role="menuitem" className="pl-menu-item" onClick={() => setMenu(null)}>{l.libelle}</Link>
                    ))}
                    <button type="button" role="menuitem" className="pl-menu-item" disabled={!precedent} onClick={() => { setMenu(null); if (precedent) router.push(lien(precedent)); }}>Fil précédent<kbd className="pl-kbd">↑</kbd></button>
                    <button type="button" role="menuitem" className="pl-menu-item" disabled={!suivant} onClick={() => { setMenu(null); if (suivant) router.push(lien(suivant)); }}>Fil suivant<kbd className="pl-kbd">↓</kbd></button>
                    <Link href={listeHref} role="menuitem" className="pl-menu-item" onClick={() => setMenu(null)}>Revenir à la liste</Link>
                  </div>
                ) : null}
              </div>
              <button type="button" className="pl-icone-bouton" aria-label="Volet des détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5 4h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3m9 2H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h9zm2 12h3a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3z" /></svg>
              </button>
              <Link href={listeHref} className="pl-icone-bouton" aria-label="Fermer le fil">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg>
              </Link>
            </header>
            <div className={`pf-corps${details ? "" : " pf-corps--seul"}`}>
              <div className="pf-fil" ref={zone}>
                <Timeline f={ouvert} compact={compact} notes={notesLoc[ouvert.cle] ?? []} />
                {avisRetrait ? <div className="pl-etat" role="status"><span>{avisRetrait}</span></div> : null}
                {composer && peutEcrire && ouvert.cibles.length ? <Composeur key={issueDepart} fil={ouvert} jour={d.appels?.jour ?? jourISO(new Date())} issueDepart={issueDepart} fermer={() => setComposer(false)} /> : null}
                {noteOuverte ? (
                  <div className="pl-composeur pl-composeur--note" role="dialog" aria-label="Ajouter une note">
                    <div className="pl-composeur-tete">
                      <span className="pl-composeur-titre">Ajouter une note</span>
                      <span className="pl-composeur-pour">visible sur ce poste seulement</span>
                      <span className="pl-pousse" />
                      <button type="button" className="pl-icone-bouton" aria-label="Fermer" onClick={() => setNoteOuverte(false)}><PlainIcone nom="Croix" taille={14} /></button>
                    </div>
                    <textarea className="pl-champ pl-zone" rows={3} maxLength={500} value={noteTexte} placeholder="Rappeler après 17 h, préfère le Fauteuil 1…" onChange={(e) => setNoteTexte(e.target.value)} autoFocus />
                    <p className="pl-composeur-aide">Aucune porte de Tiroma n&apos;écrit de note dans le dossier : la note reste dans ce navigateur. Rien de médical ici.</p>
                    <div className="pl-composeur-pied">
                      <button type="button" className="pl-secondaire" onClick={() => setNoteOuverte(false)}>Annuler</button>
                      <button type="button" className="pl-primaire" disabled={!noteTexte.trim()} onClick={() => { poserNotes(ouvert.cle, [...(notesLoc[ouvert.cle] ?? []), { texte: noteTexte.trim(), le: new Date().toISOString() }]); setNoteTexte(""); setNoteOuverte(false); setCompact(false); annoncer("Note ajoutée au fil."); }}>Ajouter</button>
                    </div>
                  </div>
                ) : null}
                {avis ? <div className="pl-etat" role="status"><span>{avis}</span></div> : null}
                {retrait ? (
                  <div className="pl-composeur" role="dialog" aria-label="Retirer de la liste">
                    <div className="pl-composeur-tete"><span className="pl-composeur-titre">Retirer {ouvert.compte} de la liste</span></div>
                    <p className="pl-composeur-aide">Motif : {({ rdv_obtenu: "Rendez-vous pris", date_passee: "Date passée", annule: "Le patient renonce", doublon: "Doublon", autre: "Autre" } as const)[retrait]}. Le motif reste dans le journal du cabinet.</p>
                    <div className="pl-composeur-pied">
                      <button type="button" className="pl-secondaire" onClick={() => setRetrait(null)}>Annuler</button>
                      <button type="button" className="pl-primaire" onClick={confirmerRetrait}>Retirer</button>
                    </div>
                  </div>
                ) : null}
                <div className="pf-espace" />
              </div>
              {details ? (
                <aside className="pf-details" aria-label="Détails">
                  <section className="pf-bloc">
                    <div className="pf-bloc-tete"><span>Détails</span><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 15.4 6.7 10.1a1 1 0 0 1 1.4-1.4l3.9 3.9 3.9-3.9a1 1 0 0 1 1.4 1.4z" /></svg></div>
                    <div className="pf-bloc-titre">{ouvert.titre}</div>
                    {ouvert.details.map((r) => (
                      <div key={r.libelle} className="pf-rang"><span className="pf-rang-lib">{r.libelle}</span><span className="pf-rang-val">{r.valeur}</span></div>
                    ))}
                    <div className="pf-rang"><span className="pf-rang-lib">Qui appelle</span><span className="pf-rang-val"><Avatar nom={ouvert.assigne} />{ouvert.assigne ?? <span className="pl-vide">Personne</span>}</span></div>
                    <div className="pf-rang pf-rang--sous">
                      <span />
                      <span className="pl-ancre">
                        <button type="button" className="pf-ajout" aria-expanded={sousMenu === "assigner"} onClick={() => setSousMenu((m) => (m === "assigner" ? null : "assigner"))}><PlainIcone nom="Plus" taille={14} />Assigner</button>
                        {sousMenu === "assigner" ? (
                          <div className="pl-menu" role="menu" style={{ left: 0, top: 28 }}>
                            {[...d.membres.filter((m) => m.actif).map((m) => m.prenom), ...d.praticiens.map((p) => p.nom_affiche)].map((n) => (
                              <button key={n} type="button" role="menuitemradio" aria-checked={ouvert.assigne === n} className="pl-menu-item" onClick={() => { poserAssigne(ouvert.cle, n); setSousMenu(null); }}>{n}</button>
                            ))}
                            <div className="pl-menu-sep" />
                            <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { poserAssigne(ouvert.cle, null); setSousMenu(null); }}>Revenir au choix de Tiroma</button>
                          </div>
                        ) : null}
                      </span>
                    </div>
                    <div className="pf-rang"><span className="pf-rang-lib">Priorité</span><span className="pf-rang-val"><PrioriteIcone p={ouvert.priorite} />{ouvert.priorite === "urgent" ? "Urgent" : ouvert.priorite === "high" ? "Haute" : ouvert.priorite === "normal" ? "Normale" : "Basse"}</span></div>
                    <div className="pf-rang"><span className="pf-rang-lib">Étiquettes</span><span className="pf-rang-val pf-rang-pastilles">{ouvert.etiquettes.length ? ouvert.etiquettes.map((e) => <span key={e} className="pl-pastille pl-etiquette">{e}</span>) : <span className="pl-vide">Aucune</span>}</span></div>
                    <div className="pf-rang"><span className="pf-rang-lib">Délai d&apos;appel</span><span className="pf-rang-val">{d.regles ? `${d.regles.delai_min_appel_minutes} min avant le créneau, au plus tard` : <span className="pl-vide">Non réglé</span>}</span></div>
                  </section>
                  {ouvert.personne ? (
                    <section className="pf-bloc">
                      <div className="pf-bloc-tete"><span>Premier patient proposé</span></div>
                      <div className="pf-personne"><Avatar nom={ouvert.personne.nom} taille={24} /><span>{ouvert.personne.nom}</span></div>
                      {ouvert.personne.lignes.map((r) => (
                        <div key={r.libelle} className="pf-rang"><span className="pf-rang-lib">{r.libelle}</span><span className="pf-rang-val">{r.valeur}</span></div>
                      ))}
                    </section>
                  ) : null}
                  <section className="pf-bloc">
                    <div className="pf-bloc-tete"><span>Liens</span></div>
                    {[...ouvert.liens, ...(liensLoc[ouvert.cle] ?? [])].length ? (
                      [...ouvert.liens, ...(liensLoc[ouvert.cle] ?? [])].map((l) => <Link key={l.href} href={l.href} className="pf-lien">{l.libelle}</Link>)
                    ) : (
                      <div className="pf-vide-liens">
                        <span className="pf-vide-icone"><PlainIcone nom="Cercle" taille={14} /></span>
                        <strong>Rien de lié</strong>
                        <span>Liez un plan ou un devis à ce fil pour l&apos;avoir sous la main.</span>
                      </div>
                    )}
                    <span className="pl-ancre pf-ajout-ancre">
                      <button type="button" className="pf-ajout pf-ajout--bord" aria-expanded={sousMenu === "lien"} onClick={() => setSousMenu((m) => (m === "lien" ? null : "lien"))}><PlainIcone nom="Plus" taille={14} />Lier un plan</button>
                      {sousMenu === "lien" ? (
                        <div className="pl-menu" role="menu" style={{ left: 0, top: 30, width: 280, maxHeight: 260, overflowY: "auto" }}>
                          {d.plans.map((p) => (
                            <button key={p.plan_id} type="button" role="menuitem" className="pl-menu-item" onClick={() => { poserLiens(ouvert.cle, [...(liensLoc[ouvert.cle] ?? []).filter((x) => !x.href.endsWith(encodeURIComponent(p.plan_id))), { libelle: `${p.devis_numero ?? "Plan"} · ${p.patient_nom}`, href: `${RACINE}/tiroma/plans?plan=${encodeURIComponent(p.plan_id)}` }]); setSousMenu(null); }}>{p.devis_numero ?? "Plan"} · {p.patient_nom}</button>
                          ))}
                          {(liensLoc[ouvert.cle] ?? []).length ? <><div className="pl-menu-sep" /><button type="button" role="menuitem" className="pl-menu-item" data-danger="" onClick={() => { poserLiens(ouvert.cle, null); setSousMenu(null); }}>Retirer les liens ajoutés</button></> : null}
                        </div>
                      ) : null}
                    </span>
                  </section>
                  <section className="pf-bloc">
                    <div className="pf-bloc-tete"><span>Tâches</span></div>
                    {ouvert.cibles.length && peutEcrire ? (
                      <button type="button" className="pf-ajout" onClick={() => { setIssueDepart("rappeler"); setComposer(true); }}><PlainIcone nom="Plus" taille={14} />Rappeler plus tard</button>
                    ) : (
                      <span className="pl-vide">Pas d&apos;appel à prévoir pour ce fil.</span>
                    )}
                  </section>
                </aside>
              ) : null}
            </div>
            <div className="pf-barre" role="toolbar" aria-label="Actions du fil" style={details ? undefined : { right: 0 }}>
              <span className="pf-barre-groupe pf-barre-statut pl-ancre">
                <button type="button" className="pf-barre-bouton pf-barre-bouton--statut" aria-label={estReporte(reportes, ouvert.cle) ? `Reporté au ${reportes[ouvert.cle]}` : "Reporter ce fil"} title="Statut : reporter ce fil" aria-expanded={sousMenu === "statut"} onClick={() => setSousMenu((m) => (m === "statut" ? null : "statut"))}>
                  <PlainIcone nom={ouvert.icone} taille={18} style={{ color: estReporte(reportes, ouvert.cle) ? "var(--pl-icone-2)" : "var(--pl-bleu-icone)" }} />
                  <kbd className="pl-kbd">Y</kbd>
                </button>
                {sousMenu === "statut" ? (
                  <div className="pl-menu" role="menu" style={{ bottom: 48, left: 0, width: 220 }}>
                    <div className="pl-menu-titre">Reporter jusqu&apos;à</div>
                    {[[1, "Demain"], [3, "Dans 3 jours"], [7, "Dans une semaine"]].map(([n, lib]) => (
                      <button key={n} type="button" role="menuitem" className="pl-menu-item" onClick={() => { poserReporte(ouvert.cle, dansJours(n as number)); setSousMenu(null); annoncer(`Reporté : ce fil quitte la liste jusqu'au ${dansJours(n as number)}.`); }}>{lib}</button>
                    ))}
                    {estReporte(reportes, ouvert.cle) ? <><div className="pl-menu-sep" /><button type="button" role="menuitem" className="pl-menu-item" onClick={() => { poserReporte(ouvert.cle, null); setSousMenu(null); annoncer("Remis dans la liste."); }}>Remettre à traiter</button></> : null}
                  </div>
                ) : null}
              </span>
              <span className="pf-barre-groupe">
                <button type="button" className="pf-barre-bouton" disabled={!peutEcrire || !ouvert.cibles.length} onClick={() => setComposer(true)} title={!ouvert.cibles.length ? "Pas d'appel à noter pour ce fil" : undefined}>
                  <PlainIcone nom="Suivante" taille={16} />
                  <span><strong>Noter l&apos;appel</strong>{ouvert.cibles.length === 1 ? ` de ${ouvert.cibles[0].patient_nom}` : ""}</span>
                  <kbd className="pl-kbd">R</kbd>
                </button>
                <button type="button" className="pf-barre-bouton" onClick={() => setNoteOuverte(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e79d00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h4" /></svg>
                  <strong>Note</strong>
                  <kbd className="pl-kbd">N</kbd>
                </button>
                <div className="pl-ancre">
                  <button type="button" className="pf-barre-bouton" aria-expanded={menu === "plus-barre"} onClick={() => setMenu((m) => (m === "plus-barre" ? null : "plus-barre"))}>
                    <PlainIcone nom="Points" taille={16} />
                    <strong>Plus</strong>
                  </button>
                  {menu === "plus-barre" ? (
                    <div className="pl-menu" role="menu" style={{ bottom: 40, left: 0 }}>
                      {ouvert.liens.map((l) => (
                        <Link key={l.href} href={l.href} role="menuitem" className="pl-menu-item" onClick={() => setMenu(null)}>{l.libelle}</Link>
                      ))}
                      <button type="button" role="menuitem" className="pl-menu-item" disabled={!precedent} onClick={() => { setMenu(null); if (precedent) router.push(lien(precedent)); }}>Fil précédent</button>
                      <button type="button" role="menuitem" className="pl-menu-item" disabled={!suivant} onClick={() => { setMenu(null); if (suivant) router.push(lien(suivant)); }}>Fil suivant</button>
                      <Link href={listeHref} role="menuitem" className="pl-menu-item" onClick={() => setMenu(null)}>Revenir à la liste</Link>
                    </div>
                  ) : null}
                </div>
                {ouvert.attente && peutEcrire ? (
                  <div className="pl-ancre">
                    <details className="pf-retrait">
                      <summary className="pf-barre-bouton"><PlainIcone nom="Croix" taille={14} /><strong>Retirer de la liste</strong></summary>
                      <div className="pl-menu" role="menu" style={{ bottom: 40, left: 0 }}>
                        {(["rdv_obtenu", "date_passee", "annule", "doublon", "autre"] as const).map((m) => (
                          <button key={m} type="button" role="menuitem" className="pl-menu-item" onClick={(e) => { setRetrait(m); (e.currentTarget.closest("details") as HTMLDetailsElement).open = false; }}>
                            {({ rdv_obtenu: "Rendez-vous pris", date_passee: "Date passée", annule: "Le patient renonce", doublon: "Doublon", autre: "Autre" } as const)[m]}
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : null}
              </span>
              <span className="pf-barre-groupe">
                <button type="button" className="pf-barre-bouton" onClick={() => void copier(resumeFil(ouvert)).then((ok) => annoncer(ok ? "Copié pour l'assistant : collez-le dans l'assistant de l'espace." : "Le presse-papier a refusé la copie."))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00ab5f" strokeWidth="2" aria-hidden="true"><path d="M12 3 4 7v6c0 4 3.4 7.4 8 8 4.6-.6 8-4 8-8V7z" /></svg>
                  <span><strong>Copier pour l&apos;assistant</strong></span>
                  <kbd className="pl-kbd">B</kbd>
                </button>
                <button type="button" className="pf-barre-bouton pf-barre-bouton--rond" aria-label="Relire le dossier" title={t.source === "reelle" ? "Relire le dossier" : "Données d'exemple : rien à relire"} onClick={() => { if (t.source === "reelle") void t.relire().then(() => annoncer("Dossier relu.")); else annoncer("Données d'exemple : rien à relire."); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                </button>
              </span>
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ——— la liste ——— */
  const bilan = d?.appels?.bilan;
  return (
    <div className="tir-pl tir-pfl">
      <div className="pl-carte">
        <header className="pfl-tete">
          <svg className="pfl-icone" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 6.5A3.5 3.5 0 0 1 6.5 3h7A3.5 3.5 0 0 1 17 6.5v4a3.5 3.5 0 0 1-3.5 3.5H9.4l-3.2 2.5A.75.75 0 0 1 5 15.9V14a3 3 0 0 1-2-2.8zm3.5-2A2 2 0 0 0 4.5 6.5v4.7A1.5 1.5 0 0 0 6 12.7a.75.75 0 0 1 .5.7v1l2.3-1.8a.75.75 0 0 1 .5-.2h4.2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2zM18.5 8.3a.75.75 0 0 1 1-.3A3.5 3.5 0 0 1 21 11v3.3a3 3 0 0 1-2 2.8V19a.75.75 0 0 1-1.2.6L14.6 17H11a.75.75 0 0 1 0-1.5h3.8a.75.75 0 0 1 .5.2l2.2 1.7v-.9a.75.75 0 0 1 .5-.7 1.5 1.5 0 0 0 1.5-1.5V11a2 2 0 0 0-.8-1.6.75.75 0 0 1-.3-1.1" /></svg>
          <h1 className="pfl-h1">{vue ? GROUPES.find((g) => g.cle === vue)?.libelle : "Créneaux et appels"}</h1>
          <span className="pl-pousse" />
          {peutEcrire ? (
            <div className="pl-ancre">
              <button type="button" className="pl-fantome" aria-expanded={inscrire} onClick={() => setInscrire((v) => !v)}>
                <PlainIcone nom="Plus" />
                Liste d&apos;attente
              </button>
              {inscrire ? <Inscription fermer={() => setInscrire(false)} /> : null}
            </div>
          ) : null}
          <div className="pl-ancre">
            <button type="button" className="pl-fantome" aria-expanded={menu === "filtres"} onClick={() => setMenu((m) => (m === "filtres" ? null : "filtres"))}>
              <PlainIcone nom="Filtres" />
              Filtres<kbd className="pl-kbd">F</kbd>
            </button>
            {menu === "filtres" ? (
              <div className="pl-menu" role="menu" style={{ right: 0, top: 38, width: 235 }}>
                <div className="pl-menu-titre">Groupes</div>
                {GROUPES.map((g) => (
                  <button key={g.cle} type="button" role="menuitemcheckbox" aria-checked={!masques.includes(g.cle)} className="pl-menu-item" onClick={() => setMasques((m) => (m.includes(g.cle) ? m.filter((x) => x !== g.cle) : [...m, g.cle]))}>
                    <PlainIcone nom={g.icone} style={{ color: "var(--pl-bleu-icone)" }} />
                    <span style={{ flex: 1 }}>{g.libelle}</span>
                    {!masques.includes(g.cle) ? <PlainIcone nom="Coche" taille={14} /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="pl-ancre">
            <button type="button" className="pl-fantome" aria-expanded={menu === "affichage"} onClick={() => setMenu((m) => (m === "affichage" ? null : "affichage"))}>
              <PlainIcone nom="Ecran" />
              Affichage<kbd className="pl-kbd">V</kbd>
            </button>
            {menu === "affichage" ? (
              <div className="pl-pop" role="dialog" aria-label="Affichage" style={{ right: 0, top: 38, width: 280 }}>
                <div className="pl-pop-titre">Afficher</div>
                <button type="button" role="menuitemcheckbox" aria-checked={faits} className="pl-menu-item" onClick={() => setFaits((v) => !v)}>
                  <span style={{ flex: 1 }}>Les fils faits (créneau repris, rendez-vous confirmé)</span>
                  {faits ? <PlainIcone nom="Coche" taille={14} /> : null}
                </button>
                <button type="button" role="menuitemcheckbox" aria-checked={reportesVisibles} className="pl-menu-item" onClick={() => setReportesVisibles((v) => !v)}>
                  <span style={{ flex: 1 }}>Les fils reportés</span>
                  {reportesVisibles ? <PlainIcone nom="Coche" taille={14} /> : null}
                </button>
                <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { setMenu(null); exporterListe(visibles); annoncer("Liste exportée en CSV."); }}>
                  <span style={{ flex: 1 }}>Exporter la liste en CSV</span>
                </button>
                <div className="pl-pop-titre">Vues</div>
                <Link href={BASE} className="pl-menu-item" onClick={() => setMenu(null)}>Tous les fils</Link>
                {GROUPES.map((g) => (
                  <Link key={g.cle} href={`${BASE}?vue=${g.cle}`} className="pl-menu-item" onClick={() => setMenu(null)}>{g.libelle}</Link>
                ))}
              </div>
            ) : null}
          </div>
        </header>
        {masques.length ? (
          <div className="pfl-filtres">
            <span className="pfl-puce">
              <span className="pfl-puce-part">Groupe</span>
              <span className="pfl-puce-part pfl-puce-sep">n&apos;est pas</span>
              <span className="pfl-puce-part pfl-puce-sep">{masques.map((m) => GROUPES.find((g) => g.cle === m)?.libelle).join(", ")}</span>
              <button type="button" className="pfl-puce-part pfl-puce-sep" aria-label="Retirer le filtre" onClick={() => setMasques([])}><PlainIcone nom="Croix" taille={14} /></button>
            </span>
            <button type="button" className="pl-fantome" onClick={() => setMasques([])}><PlainIcone nom="Croix" />Tout effacer</button>
          </div>
        ) : null}
        <div className="pfl-defile">
          {t.erreur ? <div className="pl-etat pfl-avis" role="alert"><span>La base réelle n&apos;a pas répondu. {t.erreur}</span></div> : null}
          {reel?.avis.length ? <div className="pl-etat pfl-avis"><span>Lecture partielle. {reel.avis.join(" · ")}</span></div> : null}
          {etat ? <div className="pfl-vide">{etat}</div> : null}
          {!etat &&
            groupes.map((g) => (
              <section key={g.cle} className="pfl-groupe" aria-label={g.libelle}>
                <div className="pfl-groupe-tete">
                  <PlainIcone nom={g.icone} style={{ color: "var(--pl-bleu-icone)" }} />
                  <span className="pfl-groupe-lib">{g.libelle}</span>
                  <span className="pfl-groupe-compte">{g.fils.length}</span>
                  {g.cle === "appels" && bilan ? (
                    <span className="pfl-groupe-sous">
                      {bilan.appels} appels sur {bilan.jours} jours · {bilan.rdv_pris} rendez-vous repris ({bilan.confirmes} confirmés)
                      {d?.profil === "titulaire" ? ` · ${bilan.valeur_plans.toLocaleString("fr-FR")} € de plans remis à l'agenda` : ""} · {Math.round(bilan.minutes_creneaux / 60)} h de fauteuil reprises
                      {bilan.a_reporter_logiciel ? ` · ${bilan.a_reporter_logiciel} patient(s) ne veulent plus être contactés : reportez-le dans le logiciel` : ""}
                    </span>
                  ) : null}
                  {g.cle === "controles" && d?.controlesDus ? <span className="pfl-groupe-sous">sans contrôle depuis plus de {d.controlesDus.seuil_mois} mois{d.controlesDus.ne_pas_contacter ? ` · ${d.controlesDus.ne_pas_contacter} « ne pas contacter » à part` : ""}</span> : null}
                </div>
                {g.fils.map((f) => <LigneFil key={f.cle} f={f} href={lien(f)} choisi={choisis.has(f.cle)} basculer={() => basculer(f.cle)} />)}
              </section>
            ))}
          {!etat && !groupes.length ? <div className="pfl-vide">Aucun fil dans cette vue.</div> : null}
        </div>
        {choisisF.length || avis ? (
          <div className="pfl-lot" role="toolbar" aria-label="Actions sur la sélection">
            {!choisisF.length ? (
              <span className="pfl-lot-compte">{avis}</span>
            ) : issueLot ? (
              <>
                <span className="pfl-lot-compte">Noter « {ISSUES_APPEL[issueLot].libelle} » pour {choisisF.filter((f) => f.cibles.length).length} patient(s){issueLot === "rappeler" ? ", à rappeler dans deux jours" : ""} ?</span>
                <button type="button" className="pf-barre-bouton" onClick={() => setIssueLot(null)}>Annuler</button>
                <button type="button" className="pl-primaire" onClick={() => void noterLot()}>Confirmer</button>
              </>
            ) : (
              <>
                <span className="pfl-lot-compte">{choisisF.length} choisi{choisisF.length > 1 ? "s" : ""}</span>
                {peutEcrire && choisisF.some((f) => f.cibles.length) ? (
                  <span className="pl-ancre">
                    <button type="button" className="pf-barre-bouton" aria-expanded={menuLot === "appel"} onClick={() => setMenuLot((m) => (m === "appel" ? null : "appel"))}><PlainIcone nom="Suivante" taille={16} /><strong>Noter l&apos;appel</strong></button>
                    {menuLot === "appel" ? (
                      <div className="pl-menu" role="menu" style={{ bottom: 40, left: 0 }}>
                        {(Object.keys(ISSUES_APPEL) as IssueAppel[]).map((k) => (
                          <button key={k} type="button" role="menuitem" className="pl-menu-item" data-danger={k === "ne_plus_contacter" ? "" : undefined} onClick={() => { setMenuLot(null); setIssueLot(k); }}>{ISSUES_APPEL[k].libelle}</button>
                        ))}
                      </div>
                    ) : null}
                  </span>
                ) : null}
                <button type="button" className="pf-barre-bouton" onClick={() => { const tous = choisisF.every((f) => f.suivi); choisisF.forEach((f) => suivreFil(f, !tous)); finirLot(tous ? "Vous ne suivez plus ces patients." : "Patients suivis : leurs fils passent en tête."); }}><strong>{choisisF.every((f) => f.suivi) ? "Ne plus suivre" : "Suivre"}</strong></button>
                <button type="button" className="pf-barre-bouton" onClick={() => { choisisF.forEach((f) => epinglerFil(f, true)); finirLot("Épinglés en tête d'Aujourd'hui."); }}><strong>Épingler</strong></button>
                <span className="pl-ancre">
                  <button type="button" className="pf-barre-bouton" aria-expanded={menuLot === "reporter"} onClick={() => setMenuLot((m) => (m === "reporter" ? null : "reporter"))}><strong>Reporter</strong></button>
                  {menuLot === "reporter" ? (
                    <div className="pl-menu" role="menu" style={{ bottom: 40, left: 0 }}>
                      {[[1, "Demain"], [3, "Dans 3 jours"], [7, "Dans une semaine"]].map(([n, lib]) => (
                        <button key={n} type="button" role="menuitem" className="pl-menu-item" onClick={() => { choisisF.forEach((f) => poserReporte(f.cle, dansJours(n as number))); finirLot(`${choisisF.length} fil(s) reporté(s).`); }}>{lib}</button>
                      ))}
                      <div className="pl-menu-sep" />
                      <button type="button" role="menuitem" className="pl-menu-item" onClick={() => { choisisF.forEach((f) => poserReporte(f.cle, null)); finirLot("Remis dans la liste."); }}>Remettre à traiter</button>
                    </div>
                  ) : null}
                </span>
                <button type="button" className="pf-barre-bouton" onClick={() => void copier(choisisF.map(resumeFil).join("\n\n")).then((ok) => finirLot(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie."))}><strong>Copier pour l&apos;assistant</strong></button>
                <button type="button" className="pf-barre-bouton" onClick={() => { exporterListe(choisisF); finirLot("Sélection exportée en CSV."); }}><strong>Exporter</strong></button>
                <button type="button" className="pl-icone-bouton" aria-label="Tout désélectionner" onClick={() => setChoisis(new Set())}><PlainIcone nom="Croix" taille={14} /></button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
