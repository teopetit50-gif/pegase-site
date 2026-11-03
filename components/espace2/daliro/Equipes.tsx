"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Équipes — copie 1:1 de « Bookings » de Cal.com (03/11/2026).
   Teo, le 03/11, sur la copie d'« Availability » : « j'aime pas comment est
   faite la page équipe de daliro, trouve un autre truc ». Règles :
   docs/refonte-metiers/REGLES.md ; relevé : releves/calcom-bookings.md
   (branche claude/refs-plain-attio-cal-a3a72b) ; styles : ./dal-bookings.css,
   préfixe dal-bk-.

   Ce que Cal.com montre, et ce que c'est ici :
     une réservation          → un passage d'un intervenant sur un chantier
                                (date, heures, pastille du chantier, tâche,
                                lot, intervenant, réponse J-2) ; une absence
                                notée est une ligne à ses jours
     Upcoming                 → « À venir », groupes « Aujourd'hui » / « À suivre »
     Unconfirmed              → « Non confirmés » : la demande J-2 est partie
                                sans réponse, ou l'intervenant a décliné ;
                                « Reject » / « Confirm » notent sa réponse,
                                le drapeau cherche un remplaçant
     Recurring                → « Plusieurs jours » (« ↻ N jours restants »)
     Past · Canceled          → « Passés » (faits, ou finis sans être notés
                                faits) · « Annulés »
     Filter                   → intervenant (?intervenant=, le lien de
                                l'annuaire), type (?type=), chantier (?chantier=)
     Saved filters            → les filtres gardés dans ce navigateur, la copie
                                du planning affiché, les intervenants masqués
     liste / calendrier       → ?vue=calendrier : jour, semaine, mois
     détail (?uid=)           → ?passage= (ou ?absence=) : panneau flottant ;
                                le menu ⋯ porte les gestes du passage
     case à cocher            → une sélection à copier ou à mettre au calendrier

   La page d'un intervenant (?intervenant=, la page d'un horaire de Cal.com)
   ne reste pas : Bookings n'a pas de page par personne, il a un filtre par
   participant. ?intervenant= filtre donc la liste, et chaque geste de
   l'ancienne fiche passe au détail d'un passage (« Changer les jours et les
   heures » : déplacer, étirer, raccourcir, poser des heures) ou d'une
   absence (modifier, annuler).

   lecture  base réelle : les tableaux de tous les chantiers
            (useDaliro().demanderTous) et btp_disponibilites ;
            exemple : les tableaux en mémoire, les absences notées gardées
            le temps de la visite.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Building2,
  Calendar,
  CalendarOff,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  CircleX,
  Clock,
  Copy,
  Ellipsis,
  EyeOff,
  FileText,
  Flag,
  Info,
  ListFilter,
  MapPin,
  Menu,
  RefreshCcw,
  Search,
  Send,
  Trash,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import Habille from "@/components/espace2/Habille";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { aujourdHui } from "@/components/espace/exemples/socle";
import ChantierVue, { type FormChantier } from "@/components/espace/daliro/ChantierVue";
import { annulerIndisponibilite, chargerDisponibilites, noterIndisponibilite, repondreConfirmation } from "@/components/espace/daliro/portes";
import type { Disponibilite, Passage, Tableau, Tiers } from "@/components/espace/daliro/types";
import { VoletContexte } from "../lin/Volet";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import { useDeplacer } from "./deplacer";
import { copier } from "./navigateur";
import "@/components/espace/espace.css";
import "./dal-bookings.css";

const BASE = `${RACINE}/daliro`;

type Absence = Disponibilite["absences"][number];
type Genre = "equipe" | "tiers" | "inconnu";
type Intervenant = { cle: string; nom: string; genre: Genre; tiers: Tiers | null; tiersId: string | null };
type LignePassage = { genre: "passage"; id: string; p: Passage; t: Tableau; iv: Intervenant; debut: string; fin: string; hd: string | null; hf: string | null };
type LigneAbsence = { genre: "absence"; id: string; a: Absence; iv: Intervenant; debut: string; fin: string };
type Ligne = LignePassage | LigneAbsence;
type Onglet = "a-venir" | "non-confirmes" | "plusieurs-jours" | "passes" | "annules";
type Filtre = { intervenant: string | null; type: "sous-traitants" | "equipes" | null; chantier: string | null };
type Enregistre = { id: string; nom: string; filtre: Filtre };

const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "a-venir", libelle: "À venir" },
  { cle: "non-confirmes", libelle: "Non confirmés" },
  { cle: "plusieurs-jours", libelle: "Plusieurs jours" },
  { cle: "passes", libelle: "Passés" },
  { cle: "annules", libelle: "Annulés" },
];
/* l'état vide de Cal.com, un texte par onglet (même structure) */
const VIDES: Record<Onglet, [string, string]> = {
  "a-venir": ["Aucun passage à venir", "Vous n'avez aucun passage à venir. Dès qu'un passage est prévu au planning d'un chantier, il s'affiche ici."],
  "non-confirmes": ["Aucun passage non confirmé", "Vous n'avez aucun passage non confirmé. Les passages dont la demande J-2 attend une réponse s'afficheront ici."],
  "plusieurs-jours": ["Aucun passage sur plusieurs jours", "Vous n'avez aucun passage sur plusieurs jours. Dès qu'un passage dure plus d'un jour, il s'affiche ici."],
  passes: ["Aucun passage passé", "Vous n'avez aucun passage passé. Vos passages passés s'afficheront ici."],
  annules: ["Aucun passage annulé", "Vous n'avez aucun passage annulé. Vos passages annulés s'afficheront ici."],
};

const JOUR = 86_400_000;
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const HEURES = Array.from({ length: 96 }, (_, i) => `${`${Math.floor(i / 4)}`.padStart(2, "0")}:${`${(i % 4) * 15}`.padStart(2, "0")}`);

const num = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
const iso = (n: number) => new Date(n * JOUR).toISOString().slice(0, 10);
const plusJours = (jour: string, n: number) => iso(num(jour) + n);
const rangJour = (jour: string) => (num(jour) + 3) % 7;
const lundiDe = (jour: string) => iso(num(jour) - rangJour(jour));
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const jj = (s: string) => s.slice(0, 10);
const hh = (s: string | null | undefined) => (s ? s.slice(0, 5) : null);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const morceaux = (jour: string) => {
  const [a, m, j] = jour.split("-").map(Number);
  return { a, j, m: m - 1, r: rangJour(jour) };
};
const periode = (du: string, au: string) => (du === au ? `le ${dateCourte(du)}` : `du ${dateCourte(du)} au ${dateCourte(au)}`);
/* « Lun 3 nov. » (« Sun, 1 Nov ») ; « Lun 3 - Ven 7 nov. » pour un passage de plusieurs jours */
function jours(debut: string, fin: string): string {
  const a = morceaux(debut);
  const b = morceaux(fin);
  if (debut === fin) return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]}`;
  if (a.m === b.m) return `${JOURS_COURTS[a.r]} ${a.j} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
  return `${JOURS_COURTS[a.r]} ${a.j} ${MOIS_COURTS[a.m]} - ${JOURS_COURTS[b.r]} ${b.j} ${MOIS_COURTS[b.m]}`;
}
/* « 3 novembre 2026 » (Past : « 1 November 2026 ») */
const dateLongue = (jour: string) => {
  const a = morceaux(jour);
  return `${a.j} ${MOIS[a.m]} ${a.a}`;
};
/* « Lundi 3 novembre 2026 » (détail : « Sunday, November 1, 2026 ») */
const dateEntiere = (jour: string) => {
  const a = morceaux(jour);
  return `${JOURS[a.r].charAt(0).toUpperCase()}${JOURS[a.r].slice(1)} ${a.j} ${MOIS[a.m]} ${a.a}`;
};
/* l'heure de Cal.com (« 9:00am - 10:00am ») ; un passage sans heures : la journée, ou la demi-journée */
function plage(hd: string | null, hf: string | null): string {
  if (!hd || !hf) return "Toute la journée";
  if (hf <= "13:00") return `Matin, ${hd} - ${hf}`;
  if (hd >= "12:00") return `Après-midi, ${hd} - ${hf}`;
  return `${hd} - ${hf}`;
}
const titrePassage = (l: LignePassage) => `${l.p.tache ?? "Passage"} avec ${l.iv.nom}`;
const lotDe = (p: Passage) => (p.lot_code ? `Lot ${p.lot_code}${p.lot_libelle ? ` · ${p.lot_libelle}` : ""}` : "Hors lot");
const nonConfirme = (p: Passage) => p.intervenant_type === "tiers" && p.statut === "prevu" && (p.confirmation === "demandee" || p.confirmation === "sans_reponse" || p.confirmation === "declinee");
const PASTILLE: Record<string, { texte: string; teinte: "vert" | "ambre" | "rouge" | "gris" }> = {
  confirmee: { texte: "Confirmé", teinte: "vert" },
  demandee: { texte: "Non confirmé", teinte: "ambre" },
  sans_reponse: { texte: "Sans réponse", teinte: "ambre" },
  declinee: { texte: "Décliné", teinte: "rouge" },
  non_demandee: { texte: "Prévu", teinte: "gris" },
  fait: { texte: "Fait", teinte: "vert" },
  annule: { texte: "Annulé", teinte: "rouge" },
};
const EVENEMENTS: Record<string, string> = { demandee: "Demande J-2 envoyée", confirmee: "Confirmé", declinee: "Décliné", sans_reponse: "Sans réponse" };
const CANAUX: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", email: "courriel", telephone: "téléphone" };
const pastilleDe = (p: Passage) => (p.statut === "fait" ? PASTILLE.fait : p.statut === "annule" ? PASTILLE.annule : PASTILLE[p.confirmation]);

/* ——— ce que ce navigateur garde (rien n'est envoyé) : les filtres enregistrés, les intervenants masqués,
   le nom affiché d'une de nos équipes ——— */
const CLE_FILTRES = "espace2:daliro:equipes:filtres";
const CLE_RETIRES = "espace2:daliro:equipes:retires";
const CLE_NOMS = "espace2:daliro:equipes:noms";
const lireLocal = (cle: string) => {
  try {
    return localStorage.getItem(cle) ?? "";
  } catch {
    return "";
  }
};
const ecrireLocal = (cle: string, valeur: unknown) => {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : le réglage vaut pour cette visite */
  }
  window.dispatchEvent(new Event(cle));
};
const analyses = new Map<string, unknown>();
function useLocal<T>(cle: string, defaut: T): T {
  const brut = useSyncExternalStore(
    (cb) => {
      window.addEventListener(cle, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(cle, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => lireLocal(cle),
    () => "",
  );
  if (!brut) return defaut;
  const k = `${cle}|${brut}`;
  if (!analyses.has(k)) {
    try {
      analyses.set(k, JSON.parse(brut) as T);
    } catch {
      analyses.set(k, defaut);
    }
  }
  return analyses.get(k) as T;
}
const AUCUN: string[] = [];
const AUCUN_NOM: Record<string, string> = {};
const AUCUN_FILTRE: Enregistre[] = [];

/* ——— en clair, pour le presse-papier, et en .ics pour un agenda ——— */
const enClair = (l: Ligne) =>
  l.genre === "passage"
    ? `- ${jours(l.debut, l.fin)}, ${plage(l.hd, l.hf).toLowerCase()} : ${l.p.tache ?? "Passage"}, ${l.t.chantier.nom} (${l.iv.nom})`
    : `- ${jours(l.debut, l.fin)} : ${l.iv.nom} absent${l.a.motif ? ` (${l.a.motif})` : ""}`;
function ics(lignes: Ligne[]): string {
  const echap = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const d = (j: string) => j.replace(/-/g, "");
  const t = (j: string, h: string) => `${d(j)}T${h.replace(":", "")}00`;
  const ev = lignes.flatMap((l) => {
    const titre = l.genre === "passage" ? `${l.p.tache ?? "Passage"} : ${l.iv.nom}` : `${l.iv.nom} absent`;
    const lieu = l.genre === "passage" ? [l.t.chantier.nom, l.t.chantier.adresse, l.t.chantier.commune].filter(Boolean).join(", ") : "";
    const quand =
      l.genre === "passage" && l.hd && l.hf
        ? /* des heures : un événement par jour, comme la plage posée chaque jour du passage */
          Array.from({ length: num(l.fin) - num(l.debut) + 1 }, (_, i) => [`DTSTART:${t(plusJours(l.debut, i), l.hd!)}`, `DTEND:${t(plusJours(l.debut, i), l.hf!)}`])
        : [[`DTSTART;VALUE=DATE:${d(l.debut)}`, `DTEND;VALUE=DATE:${d(plusJours(l.fin, 1))}`]];
    return quand.map((q, i) => ["BEGIN:VEVENT", `UID:${l.id}-${i}@daliro`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, ...q, `SUMMARY:${echap(titre)}`, ...(lieu ? [`LOCATION:${echap(lieu)}`] : []), "END:VEVENT"].join("\r\n"));
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Omega//Daliro//FR", ...ev, "END:VCALENDAR"].join("\r\n");
}
function telecharger(nom: string, texte: string) {
  const url = URL.createObjectURL(new Blob([texte], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Equipes() {
  const { source, pret, erreur, client, liste, tableau, demanderTous, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();
  const du = useMemo(() => aujourdhui(), []);
  const auAbsences = useMemo(() => plusJours(du, 120), [du]);
  const { poser } = useDeplacer(du);

  useEffect(() => {
    if (source === "reelle") demanderTous();
  }, [source, demanderTous]);

  /* les absences : la porte b6_31 en base réelle, la mémoire en exemple */
  const [reel, setReel] = useState<Disponibilite[] | null>(null);
  const [erreurDispo, setErreurDispo] = useState<string | null>(null);
  /* « …et leurs disponibilités » : en exemple, Plâtrerie Morel a un compagnon en arrêt pendant son passage
     « Bandes et enduits » du Cabinet médical Saint-Clair — le conflit se lit sans rien noter */
  const [locales, setLocales] = useState<Record<string, Absence[]>>(() => ({
    "00000000-0000-4000-8000-00000000d701": [{ id: "00000000-0000-4000-8000-0000000ea901", du: aujourdHui(2), au: aujourdHui(3), motif: "Un plâtrier en arrêt maladie" }],
  }));
  const clientId = client?.client_id ?? null;
  const lire = useCallback(async () => {
    if (!clientId) return;
    try {
      setReel(await chargerDisponibilites(clientId, plusJours(du, -60), auAbsences));
      setErreurDispo(null);
    } catch (e) {
      setErreurDispo(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [clientId, du, auAbsences]);
  useEffect(() => {
    if (source !== "reelle" || !clientId) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [source, clientId, lire]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const enLecture = source === "reelle" && tableaux.length < liste.length;
  const retires = useLocal<string[]>(CLE_RETIRES, AUCUN);
  const noms = useLocal<Record<string, string>>(CLE_NOMS, AUCUN_NOM);
  const enregistres = useLocal<Enregistre[]>(CLE_FILTRES, AUCUN_FILTRE);

  /* ——— les intervenants et toutes les lignes (recalculés à chaque rendu : les tableaux arrivent un à un) ——— */
  const tousTiers = new Map<string, Tiers>();
  for (const t of tableaux) for (const x of t.tiers) tousTiers.set(x.id, x);
  const intervenants = new Map<string, Intervenant>();
  const ivDe = (cle: string, nom: string, genre: Genre, tiersId: string | null) => {
    if (!intervenants.has(cle)) intervenants.set(cle, { cle, nom: genre !== "tiers" && noms[cle] ? noms[cle] : nom, genre, tiersId, tiers: tiersId ? (tousTiers.get(tiersId) ?? null) : null });
    return intervenants.get(cle)!;
  };
  for (const x of tousTiers.values()) if (x.actif && x.roles.includes("sous_traitant")) ivDe(`t:${x.id}`, x.nom, "tiers", x.id);
  for (const t of tableaux) for (const e of t.equipes) ivDe(`e:${e.id}`, e.nom, "equipe", null);
  const toutes: Ligne[] = [];
  for (const t of tableaux)
    for (const p of t.passages) {
      const nom = p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant à désigner";
      const iv = p.tiers_id ? ivDe(`t:${p.tiers_id}`, nom, "tiers", p.tiers_id) : p.equipe_id ? ivDe(`e:${p.equipe_id}`, nom, "equipe", null) : ivDe(`n:${nom.toLocaleLowerCase("fr")}`, nom, "inconnu", null);
      toutes.push({ genre: "passage", id: p.id, p, t, iv, debut: jj(p.debut), fin: jj(p.fin), hd: hh(p.heure_debut), hf: hh(p.heure_fin) });
    }
  const absencesPar: Record<string, Absence[]> = {};
  if (source === "reelle") for (const d of reel ?? []) absencesPar[d.tiers] = d.absences;
  else Object.assign(absencesPar, locales);
  for (const [tiersId, as] of Object.entries(absencesPar)) {
    const x = tousTiers.get(tiersId);
    const nom = x?.nom ?? (reel ?? []).find((d) => d.tiers === tiersId)?.nom ?? "Sous-traitant";
    const iv = ivDe(`t:${tiersId}`, nom, "tiers", tiersId);
    for (const a of as) toutes.push({ genre: "absence", id: a.id, a, iv, debut: a.du, fin: a.au });
  }
  const sousTraitants = [...intervenants.values()].filter((i) => i.tiersId).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const absentPendant = (l: LignePassage) => (l.iv.tiersId ? (absencesPar[l.iv.tiersId] ?? []).find((a) => a.du <= l.fin && a.au >= l.debut) ?? null : null);

  /* ——— l'adresse : onglet, filtre, vue, ligne ouverte ——— */
  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };
  const aller = (modif: Record<string, string | null>) => routeur.replace(lien(modif), { scroll: false });
  const ongletParam = params.get("onglet");
  const onglet: Onglet = ONGLETS.some((o) => o.cle === ongletParam) ? (ongletParam as Onglet) : "a-venir";
  const typeParam = params.get("type");
  const filtre: Filtre = {
    intervenant: params.get("intervenant"),
    type: typeParam === "sous-traitants" || typeParam === "equipes" ? typeParam : null,
    chantier: params.get("chantier"),
  };
  const filtreActif = !!(filtre.intervenant || filtre.type || filtre.chantier);
  const vue = params.get("vue") === "calendrier" ? "calendrier" : "liste";

  const garde = (l: Ligne) =>
    !retires.includes(l.iv.cle) &&
    (!filtre.intervenant || l.iv.cle === filtre.intervenant) &&
    (!filtre.type || (filtre.type === "equipes" ? l.iv.genre === "equipe" : l.iv.genre !== "equipe")) &&
    (!filtre.chantier || (l.genre === "passage" && l.t.chantier.id === filtre.chantier));
  const filtrees = toutes.filter(garde);
  const parDate = (a: Ligne, b: Ligne) => a.debut.localeCompare(b.debut) || (a.genre === "passage" ? (a.hd ?? "") : "").localeCompare(b.genre === "passage" ? (b.hd ?? "") : "") || a.iv.nom.localeCompare(b.iv.nom, "fr");
  const dansOnglet = (o: Onglet) =>
    filtrees
      .filter((l) => {
        if (l.genre === "absence") return o === "a-venir" ? l.fin >= du : o === "passes" ? l.fin < du : false;
        const p = l.p;
        if (o === "annules") return p.statut === "annule";
        if (o === "passes") return p.statut === "fait" || (p.statut === "prevu" && l.fin < du);
        if (p.statut !== "prevu" || l.fin < du) return false;
        if (o === "non-confirmes") return nonConfirme(p);
        if (o === "plusieurs-jours") return l.debut < l.fin;
        return true;
      })
      .sort((a, b) => (o === "passes" || o === "annules" ? -parDate(a, b) : parDate(a, b)));
  const lignes = dansOnglet(onglet);
  const nbNonConfirmes = toutes.filter((l) => l.genre === "passage" && !retires.includes(l.iv.cle) && nonConfirme(l.p) && l.fin >= du).length;

  /* la ligne ouverte (?passage= ou ?absence=) : cherchée dans toutes les lignes, l'onglet ne la ferme pas */
  const ouverte = toutes.find((l) => (l.genre === "passage" ? params.get("passage") === l.id : params.get("absence") === l.id)) ?? null;
  const ouvrir = (l: Ligne | null) => aller({ passage: l?.genre === "passage" ? l.id : null, absence: l?.genre === "absence" ? l.id : null });

  /* ——— la sélection (cases à cocher) ——— */
  const [choisis, setChoisis] = useState<string[]>([]);
  const vusChoisis = lignes.filter((l) => choisis.includes(l.id));

  /* ——— les gestes ——— */
  const [envoi, setEnvoi] = useState(false);
  const [erreurGeste, setErreurGeste] = useState<string | null>(null);

  /* G61 : noter (ou remplacer) une absence */
  const [formAbsence, setFormAbsence] = useState<{ tiers: string; du: string; au: string; motif: string; remplace?: Absence } | null>(null);
  const ouvrirNoter = (tiers?: string | null, debut?: string) => {
    setErreurGeste(null);
    const parFiltre = filtre.intervenant ? intervenants.get(filtre.intervenant)?.tiersId : null;
    setFormAbsence({ tiers: tiers ?? parFiltre ?? sousTraitants[0]?.tiersId ?? "", du: debut ?? du, au: debut ?? du, motif: "" });
  };
  const ouvrirModifier = (l: LigneAbsence) => {
    setErreurGeste(null);
    setFormAbsence({ tiers: l.iv.tiersId ?? "", du: l.a.du, au: l.a.au, motif: l.a.motif ?? "", remplace: l.a });
  };
  const noterAbsence = async () => {
    if (!formAbsence) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const f = formAbsence;
      if (!f.tiers) throw new Error("Choisissez le sous-traitant absent.");
      if (f.au < f.du) throw new Error("Une absence a un premier et un dernier jour, dans cet ordre.");
      const motif = f.motif.trim() || null;
      if (source === "reelle") {
        /* pas de porte pour modifier : on note la nouvelle, puis on annule l'ancienne */
        await noterIndisponibilite(f.tiers, f.du, f.au, motif);
        if (f.remplace) await annulerIndisponibilite(f.remplace.id);
        await lire();
      } else setLocales((a) => ({ ...a, [f.tiers]: [...(a[f.tiers] ?? []).filter((x) => x.id !== f.remplace?.id), { id: nid(), du: f.du, au: f.au, motif }] }));
      const nom = sousTraitants.find((i) => i.tiersId === f.tiers)?.nom ?? "Le sous-traitant";
      toast(`${f.remplace ? "Absence modifiée" : "Absence notée"} : ${nom}, ${periode(f.du, f.au)}.`, "vert");
      if (f.remplace && params.get("absence") === f.remplace.id) ouvrir(null);
      setFormAbsence(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'absence.");
    } finally {
      setEnvoi(false);
    }
  };
  /* G62 : annuler une absence, après confirmation */
  const [aAnnuler, setAAnnuler] = useState<LigneAbsence | null>(null);
  const annulerAbsence = async () => {
    if (!aAnnuler) return;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const { a, iv } = aAnnuler;
      if (source === "reelle") {
        await annulerIndisponibilite(a.id);
        await lire();
      } else if (iv.tiersId) setLocales((x) => ({ ...x, [iv.tiersId!]: (x[iv.tiersId!] ?? []).filter((y) => y.id !== a.id) }));
      toast(`Absence annulée : ${iv.nom}.`, "vert");
      if (params.get("absence") === a.id) ouvrir(null);
      setAAnnuler(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé l'annulation.");
    } finally {
      setEnvoi(false);
    }
  };

  /* B17 « Noter la réponse » (b6_02) : « Confirm » et « Reject » de Cal.com */
  const [reponse, setReponse] = useState<{ l: LignePassage; reponse: "confirmee" | "declinee"; texte: string } | null>(null);
  const noterReponse = async () => {
    if (!reponse) return;
    const { l, texte } = reponse;
    const r = reponse.reponse;
    setEnvoi(true);
    setErreurGeste(null);
    try {
      if (source === "reelle") {
        await repondreConfirmation(l.p.id, r, `bureau:${l.p.id}:${Date.now()}`, { canal: "telephone", texte: texte.trim() || null });
        await relireChantier(l.t.chantier.id);
      } else {
        const maintenant = new Date().toISOString();
        onLocal({
          ...l.t,
          passages: l.t.passages.map((x) => (x.id === l.p.id ? { ...x, confirmation: r, confirmation_le: maintenant, confirmations: [...(x.confirmations ?? []), { id: nid(), passage_id: x.id, evenement: r, canal: "telephone", cle: `bureau:${x.id}`, detail: { texte: texte.trim() }, survenu_le: maintenant }] } : x)),
        });
      }
      toast(r === "confirmee" ? `${l.iv.nom} : passage confirmé ; la réponse est au fil.` : `${l.iv.nom} : passage décliné ; des remplaçants sont proposés et le conducteur est prévenu.`, "vert");
      setReponse(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé la réponse.");
    } finally {
      setEnvoi(false);
    }
  };

  /* « Changer les jours et les heures » : déplacer, étirer, raccourcir, poser des heures (btp_deplacer_passage, b6_82) */
  const [formDeplacer, setFormDeplacer] = useState<{ l: LignePassage; debut: string; fin: string; hd: string; hf: string } | null>(null);
  const deplacer = async () => {
    if (!formDeplacer) return;
    const { l, debut, fin } = formDeplacer;
    const hd = formDeplacer.hd || null;
    const hf = formDeplacer.hf || null;
    if (fin < debut || (hd && hf && hf <= hd) || !!hd !== !!hf) {
      setErreurGeste(fin < debut ? "Le dernier jour vient après le premier." : "Une plage d'heures a un début et une fin, dans cet ordre.");
      return;
    }
    setEnvoi(true);
    const quoi = debut !== l.debut || fin !== l.fin ? `prévu ${jours(debut, fin)}${hd && hf ? `, ${hd} - ${hf}` : ""}` : hd && hf ? `de ${hd} à ${hf}` : "sans heures";
    await poser(l.p, l.t.chantier.id, debut, fin, hd, hf, quoi);
    setEnvoi(false);
    setFormDeplacer(null);
  };

  /* « Relancer le sous-traitant » (« Request reschedule ») : le message s'ouvre dans l'application choisie, après relecture */
  const [relance, setRelance] = useState<{ l: LignePassage; texte: string } | null>(null);
  const ouvrirRelance = (l: LignePassage) => {
    setRelance({ l, texte: `Bonjour, pouvez-vous nous confirmer votre passage « ${l.p.tache ?? "passage"} » sur le chantier ${l.t.chantier.nom}${l.t.chantier.commune ? ` (${l.t.chantier.commune})` : ""}, ${l.debut === l.fin ? `le ${dateCourte(l.debut)}` : `du ${dateCourte(l.debut)} au ${dateCourte(l.fin)}`}${l.hd && l.hf ? `, de ${l.hd} à ${l.hf}` : ""} ? Merci.` });
  };

  /* les fenêtres de l'écran de chantier (remplaçants, recaler, noter fait) : demandées à ChantierVue, qui ne rend que sa fenêtre */
  const [geste, setGeste] = useState<{ n: number; chantier: string; form: FormChantier } | null>(null);
  const demander = (l: LignePassage, type: "remplacants" | "recaler" | "terminer") => setGeste((g) => ({ n: (g?.n ?? 0) + 1, chantier: l.t.chantier.id, form: { type, passage: l.p } }));
  const tGeste = geste ? tableau(geste.chantier) : null;

  /* masquer un intervenant (« Delete booking ») : ce navigateur seulement, après confirmation */
  const [aRetirer, setARetirer] = useState<Intervenant | null>(null);
  const retirer = (iv: Intervenant) => {
    ecrireLocal(CLE_RETIRES, [...retires.filter((c) => c !== iv.cle), iv.cle]);
    setARetirer(null);
    toast(`${iv.nom} est masqué de la liste.`, "vert");
    if (ouverte?.iv.cle === iv.cle) ouvrir(null);
  };
  const renommer = (iv: Intervenant, nom: string) => ecrireLocal(CLE_NOMS, { ...noms, [iv.cle]: nom.trim() || undefined });

  const copierLignes = async (ls: Ligne[], titre: string) => {
    const ok = await copier([titre, ...ls.map(enClair)].join("\n"));
    toast(ok ? `${pluriel(ls.length, "ligne")} copiée${ls.length > 1 ? "s" : ""}.` : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
  };
  const agenda = (ls: Ligne[], nom: string) => {
    telecharger(`${nom}.ics`, ics(ls));
    toast(`${pluriel(ls.length, "ligne")} au format agenda (.ics).`, "vert");
  };

  const nomFiltre = (f: Filtre) =>
    [f.intervenant ? (intervenants.get(f.intervenant)?.nom ?? "Intervenant") : null, f.type === "equipes" ? "Équipes internes" : f.type === "sous-traitants" ? "Sous-traitants" : null, f.chantier ? (liste.find((c) => c.id === f.chantier)?.nom ?? "Chantier") : null].filter(Boolean).join(" · ");

  /* le menu ⋯ d'une ligne : celui du détail de Cal.com, mêmes groupes, mêmes icônes */
  const optionsPassage = (l: LignePassage): Option[] => {
    const prevu = l.p.statut === "prevu";
    const vivant = l.t.chantier.statut === "ouvert" || l.t.chantier.statut === "suspendu";
    const tiers = l.p.intervenant_type === "tiers";
    const o: Option[] = [{ titre: "Modifier le passage" }];
    if (prevu && vivant) o.push({ libelle: "Recaler la suite", icone: ico(Clock), action: () => demander(l, "recaler") });
    if (prevu && tiers && l.iv.tiers) o.push({ libelle: "Relancer le sous-traitant", icone: ico(Send), action: () => ouvrirRelance(l) });
    if (prevu) o.push({ libelle: "Changer les jours et les heures", icone: ico(MapPin), action: () => setFormDeplacer({ l, debut: l.debut, fin: l.fin, hd: l.hd ?? "", hf: l.hf ?? "" }) });
    if (prevu && tiers) o.push({ libelle: "Remplaçants", icone: ico(UserPlus), action: () => demander(l, "remplacants") });
    o.push("sep", { libelle: "Ajouter au calendrier", icone: ico(Calendar), sous: [{ libelle: "Télécharger (.ics)", action: () => agenda([l], `passage-${l.debut}`) }, { libelle: "Copier en texte", action: () => void copierLignes([l], l.t.chantier.nom) }] }, "sep");
    o.push({ titre: "Après le passage" });
    if (prevu && vivant && l.debut <= du) o.push({ libelle: "Noter fait", icone: ico(Video), action: () => demander(l, "terminer") });
    if (prevu && tiers) o.push({ libelle: "Noter la réponse", icone: ico(FileText), action: () => setReponse({ l, reponse: l.p.confirmation === "declinee" ? "declinee" : "confirmee", texte: "" }) });
    o.push({ libelle: "Ouvrir dans le planning", icone: ico(Info), href: `${BASE}/chantiers?passage=${encodeURIComponent(l.id)}` });
    if (l.iv.tiersId) o.push({ libelle: "Noter une absence", icone: ico(EyeOff), action: () => ouvrirNoter(l.iv.tiersId, l.debut >= du ? l.debut : du) });
    o.push("sep");
    const absence = absentPendant(l);
    if (absence) o.push({ libelle: "Annuler l'absence de ces jours", icone: ico(Flag), rouge: true, action: () => setAAnnuler({ genre: "absence", id: absence.id, a: absence, iv: l.iv, debut: absence.du, fin: absence.au }) });
    if (prevu && tiers && l.p.confirmation !== "declinee") o.push({ libelle: "Noter le passage décliné", icone: ico(CircleX), rouge: true, action: () => setReponse({ l, reponse: "declinee", texte: "" }) });
    o.push({ libelle: "Masquer cet intervenant", icone: ico(Trash), rouge: true, action: () => setARetirer(l.iv) });
    return o;
  };
  const optionsAbsence = (l: LigneAbsence): Option[] => [
    { titre: "Modifier l'absence" },
    { libelle: "Changer les jours", icone: ico(Clock), action: () => ouvrirModifier(l) },
    { libelle: "Noter une autre absence", icone: ico(UserPlus), action: () => ouvrirNoter(l.iv.tiersId) },
    "sep",
    { libelle: "Ajouter au calendrier", icone: ico(Calendar), sous: [{ libelle: "Télécharger (.ics)", action: () => agenda([l], `absence-${l.debut}`) }, { libelle: "Copier en texte", action: () => void copierLignes([l], l.iv.nom) }] },
    "sep",
    { libelle: "Ouvrir dans l'annuaire", icone: ico(Info), href: `${BASE}/annuaire?entreprise=${encodeURIComponent(l.iv.tiersId ?? "")}` },
    "sep",
    { libelle: "Annuler l'absence", icone: ico(CircleX), rouge: true, action: () => setAAnnuler(l) },
    { libelle: "Masquer cet intervenant", icone: ico(Trash), rouge: true, action: () => setARetirer(l.iv) },
  ];

  const avis = (
    <>
      {erreur && source === "reelle" ? (
        <p className="dal-bk-note" data-teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {erreurDispo ? (
        <p className="dal-bk-note" data-teinte="rouge" role="alert">
          Les absences n&apos;ont pas pu être lues (réservé au gérant, à l&apos;administrateur et au valideur). {erreurDispo}
        </p>
      ) : null}
      {enLecture && tableaux.length ? (
        <p className="dal-bk-note" role="status">
          Lecture des chantiers : {tableaux.length} sur {liste.length}.
        </p>
      ) : null}
    </>
  );

  const pendant = formAbsence ? toutes.filter((l): l is LignePassage => l.genre === "passage" && l.p.statut === "prevu" && l.iv.tiersId === formAbsence.tiers && l.debut <= formAbsence.au && l.fin >= formAbsence.du) : [];
  const ivFiltre = filtre.intervenant ? (intervenants.get(filtre.intervenant) ?? null) : null;

  return (
    <div className="dal-bk">
      <main className="dal-bk-main">
        <h1 className="v2-sr">Équipes</h1>
        <div className="dal-bk-barre">
          <nav className="dal-bk-segment" aria-label="Passages">
            {ONGLETS.map((o) => (
              <Link key={o.cle} href={lien({ onglet: o.cle === "a-venir" ? null : o.cle, page: null })} scroll={false} aria-current={onglet === o.cle ? "page" : undefined}>
                {o.libelle}
              </Link>
            ))}
          </nav>
          <div className="dal-bk-filtres">
            <MenuFiltre filtre={filtre} intervenants={[...intervenants.values()].filter((i) => !retires.includes(i.cle)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))} chantiers={liste.map((c) => ({ id: c.id, nom: c.nom }))} aller={aller} />
            {filtre.intervenant ? <Puce libelle={`Intervenant : ${ivFiltre?.nom ?? "inconnu"}`} retirer={() => aller({ intervenant: null })} /> : null}
            {filtre.type ? <Puce libelle={filtre.type === "equipes" ? "Équipes internes" : "Sous-traitants"} retirer={() => aller({ type: null })} /> : null}
            {filtre.chantier ? <Puce libelle={`Chantier : ${liste.find((c) => c.id === filtre.chantier)?.nom ?? "inconnu"}`} retirer={() => aller({ chantier: null })} /> : null}
          </div>
          <div className="dal-bk-droite">
            <MenuEnregistres
              enregistres={enregistres}
              actif={filtreActif}
              nomActif={nomFiltre(filtre)}
              appliquer={(f) => aller({ intervenant: f.intervenant, type: f.type, chantier: f.chantier })}
              enregistrer={() => ecrireLocal(CLE_FILTRES, [...enregistres, { id: nid(), nom: nomFiltre(filtre), filtre }])}
              oublier={(id) => ecrireLocal(CLE_FILTRES, enregistres.filter((e) => e.id !== id))}
              copierAffiche={() => void copierLignes(lignes, `Équipes — ${ONGLETS.find((o) => o.cle === onglet)?.libelle}${filtreActif ? ` (${nomFiltre(filtre)})` : ""}`)}
              nbAffiches={lignes.length}
              nbMasques={[...intervenants.values()].filter((i) => retires.includes(i.cle)).length}
              remettre={() => ecrireLocal(CLE_RETIRES, null)}
            />
            <div className="dal-bk-vues" role="radiogroup" aria-label="Affichage">
              <button type="button" role="radio" aria-checked={vue === "liste"} aria-label="Liste" title="Liste" onClick={() => aller({ vue: null })}>
                <Menu width={16} height={16} aria-hidden="true" />
              </button>
              <button type="button" role="radio" aria-checked={vue === "calendrier"} aria-label="Calendrier" title="Calendrier" onClick={() => aller({ vue: "calendrier" })}>
                <Calendar width={16} height={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {avis}

        {vue === "calendrier" ? (
          <Calendrier lignes={filtrees.filter((l) => l.genre === "absence" || l.p.statut !== "annule")} du={du} ouverte={ouverte} ouvrir={ouvrir} quand={params.get("jour")} echelle={params.get("echelle")} aller={aller} />
        ) : !pret || (enLecture && !tableaux.length) ? (
          <div className="dal-bk-vide">
            <Loader variant="spin" />
          </div>
        ) : !lignes.length ? (
          <div className="dal-bk-vide">
            <span className="dal-bk-vide-icone">
              <Calendar width={16} height={16} aria-hidden="true" />
            </span>
            <p className="dal-bk-vide-titre">{VIDES[onglet][0]}</p>
            <p className="dal-bk-vide-texte">
              {filtreActif ? `Rien pour ce filtre (${nomFiltre(filtre)}). ` : VIDES[onglet][1]}
              {ivFiltre?.tiersId && onglet === "a-venir" ? (
                <>
                  {" "}
                  <button type="button" className="dal-bk-lien" onClick={() => ouvrirNoter(ivFiltre.tiersId)}>
                    Noter une absence
                  </button>
                </>
              ) : null}
            </p>
          </div>
        ) : (
          <Liste
            onglet={onglet}
            lignes={lignes}
            du={du}
            ouverte={ouverte}
            ouvrir={ouvrir}
            choisis={choisis}
            setChoisis={setChoisis}
            page={Math.max(1, Number(params.get("page")) || 1)}
            parPage={[10, 25, 50].includes(Number(params.get("n"))) ? Number(params.get("n")) : 10}
            aller={aller}
            absentPendant={absentPendant}
            filtrer={(iv) => aller({ intervenant: iv.cle, page: null })}
            optionsPassage={optionsPassage}
            optionsAbsence={optionsAbsence}
            repondre={(l, r) => setReponse({ l, reponse: r, texte: "" })}
            remplacants={(l) => demander(l, "remplacants")}
          />
        )}

        {vusChoisis.length ? (
          <div className="dal-bk-selection" role="region" aria-label="Sélection">
            <span>{pluriel(vusChoisis.length, "ligne")} sélectionnée{vusChoisis.length > 1 ? "s" : ""}</span>
            <button type="button" className="dal-bk-bouton" onClick={() => void copierLignes(vusChoisis, "Équipes — sélection")}>
              <Copy width={16} height={16} aria-hidden="true" />
              Copier
            </button>
            <button type="button" className="dal-bk-bouton" onClick={() => agenda(vusChoisis, "passages")}>
              <Calendar width={16} height={16} aria-hidden="true" />
              Ajouter au calendrier
            </button>
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Tout désélectionner" title="Tout désélectionner" onClick={() => setChoisis([])}>
              <X width={16} height={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {ouverte ? (
          <Detail
            l={ouverte}
            du={du}
            fermer={() => ouvrir(null)}
            precedente={(() => {
              const i = lignes.findIndex((x) => x.id === ouverte.id);
              return i > 0 ? () => ouvrir(lignes[i - 1]) : null;
            })()}
            suivante={(() => {
              const i = lignes.findIndex((x) => x.id === ouverte.id);
              return i >= 0 && i < lignes.length - 1 ? () => ouvrir(lignes[i + 1]) : null;
            })()}
            absence={ouverte.genre === "passage" ? absentPendant(ouverte) : null}
            options={ouverte.genre === "passage" ? optionsPassage(ouverte) : optionsAbsence(ouverte)}
            copierLigne={() => void copierLignes([ouverte], ouverte.genre === "passage" ? ouverte.t.chantier.nom : ouverte.iv.nom)}
            modifierAbsence={() => ouverte.genre === "absence" && ouvrirModifier(ouverte)}
            filtrer={(iv) => aller({ intervenant: iv.cle, page: null })}
            renommer={renommer}
          />
        ) : null}
      </main>

      {/* ——— les fenêtres ——— */}
      <Dialog open={!!formAbsence} onOpenChange={(o) => !o && setFormAbsence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{formAbsence?.remplace ? "Modifier l'absence" : "Noter une absence"}</DialogTitle>
            <DialogDescription>
              {formAbsence?.remplace
                ? `L'absence ${periode(formAbsence.remplace.du, formAbsence.remplace.au)} est remplacée par les jours choisis : la nouvelle est notée, puis l'ancienne annulée.`
                : "Les jours notés ne sont plus proposés pour ce sous-traitant : ni pour un passage, ni comme remplaçant."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {formAbsence ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Sous-traitant
                  <select className="rv-champ" value={formAbsence.tiers} disabled={!!formAbsence.remplace} onChange={(e) => setFormAbsence({ ...formAbsence, tiers: e.target.value })}>
                    {sousTraitants.map((i) => (
                      <option key={i.cle} value={i.tiersId ?? ""}>
                        {i.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Du
                    <input className="rv-champ" type="date" value={formAbsence.du} onChange={(e) => setFormAbsence({ ...formAbsence, du: e.target.value, au: formAbsence.au < e.target.value ? e.target.value : formAbsence.au })} />
                  </label>
                  <label className="rv-libelle">
                    Au
                    <input className="rv-champ" type="date" value={formAbsence.au} min={formAbsence.du} onChange={(e) => setFormAbsence({ ...formAbsence, au: e.target.value })} />
                  </label>
                </div>
                <label className="rv-libelle">
                  Motif
                  <input className="rv-champ" maxLength={200} value={formAbsence.motif} onChange={(e) => setFormAbsence({ ...formAbsence, motif: e.target.value })} placeholder="Congés, autre chantier" />
                </label>
                {pendant.length ? (
                  <Avis teinte="ambre">
                    {pluriel(pendant.length, "passage")} prévu{pendant.length > 1 ? "s" : ""} sur ces jours : {pendant.map((p) => `${p.t.chantier.nom}${p.p.tache ? ` (${p.p.tache})` : ""} ${periode(p.debut, p.fin)}`).join(" ; ")}.
                  </Avis>
                ) : null}
                {erreurGeste ? (
                  <Avis teinte="rouge" role="alert">
                    {erreurGeste}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !formAbsence?.tiers || !formAbsence?.du || !formAbsence?.au} onClick={() => void noterAbsence()}>
              {envoi ? <Loader variant="spin" /> : null} {formAbsence?.remplace ? "Remplacer l'absence" : "Noter l'absence"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aAnnuler} onOpenChange={(o) => !o && setAAnnuler(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CalendarOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Annuler cette absence ?</DialogTitle>
            <DialogDescription>
              {aAnnuler ? `${aAnnuler.iv.nom}, absent ${periode(aAnnuler.a.du, aAnnuler.a.au)}${aAnnuler.a.motif ? ` (${aAnnuler.a.motif})` : ""}. Ces jours redeviennent libres : il pourra être proposé pour un passage ou comme remplaçant.` : null}
            </DialogDescription>
          </DialogHeader>
          {erreurGeste ? (
            <DialogBody>
              <Avis teinte="rouge" role="alert">
                {erreurGeste}
              </Avis>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void annulerAbsence()}>
              {envoi ? <Loader variant="spin" /> : null} Annuler l&apos;absence
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setAAnnuler(null)}>
              Garder l&apos;absence
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reponse} onOpenChange={(o) => !o && setReponse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FileText width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{reponse?.reponse === "declinee" ? `Noter que ${reponse.l.iv.nom} décline ?` : `Noter la réponse de ${reponse?.l.iv.nom ?? "l'intervenant"}`}</DialogTitle>
            <DialogDescription>
              {reponse ? `${reponse.l.p.tache ?? "Passage"}, ${reponse.l.t.chantier.nom}, ${periode(reponse.l.debut, reponse.l.fin)}. La réponse reçue par téléphone s'inscrit au fil comme celle reçue par WhatsApp.` : null}
              {reponse?.reponse === "declinee" ? " Un passage décliné propose des remplaçants et prévient le conducteur." : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {reponse ? (
              <div className="esp-form">
                <div className="dal-bk-choix" role="radiogroup" aria-label="Réponse">
                  {(["confirmee", "declinee"] as const).map((r) => (
                    <label key={r}>
                      <input type="radio" name="dal-bk-reponse" checked={reponse.reponse === r} onChange={() => setReponse({ ...reponse, reponse: r })} />
                      {r === "confirmee" ? "Confirmé" : "Décliné"}
                    </label>
                  ))}
                </div>
                <label className="rv-libelle">
                  Ce qu&apos;il a dit (facultatif)
                  <input className="rv-champ" maxLength={300} value={reponse.texte} onChange={(e) => setReponse({ ...reponse, texte: e.target.value })} placeholder="Sera là à 8 h" />
                </label>
                {erreurGeste ? (
                  <Avis teinte="rouge" role="alert">
                    {erreurGeste}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void noterReponse()}>
              {envoi ? <Loader variant="spin" /> : null} {reponse?.reponse === "declinee" ? "Noter : décliné" : "Noter : confirmé"}
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setReponse(null)}>
              Fermer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!formDeplacer} onOpenChange={(o) => !o && setFormDeplacer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Clock width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Changer les jours et les heures</DialogTitle>
            <DialogDescription>
              {formDeplacer ? `${formDeplacer.l.p.tache ?? "Passage"}, ${formDeplacer.l.t.chantier.nom} (${formDeplacer.l.iv.nom}). ` : null}
              Un passage déplacé ou ré-horé repart en confirmation à J-2 ; s&apos;il finit plus tard, les passages qui en dépendent suivent.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {formDeplacer ? (
              <div className="esp-form">
                <div className="esp-form-ligne">
                  <label className="rv-libelle">
                    Premier jour
                    <input className="rv-champ" type="date" value={formDeplacer.debut} onChange={(e) => setFormDeplacer({ ...formDeplacer, debut: e.target.value, fin: formDeplacer.fin < e.target.value ? e.target.value : formDeplacer.fin })} />
                  </label>
                  <label className="rv-libelle">
                    Dernier jour
                    <input className="rv-champ" type="date" value={formDeplacer.fin} min={formDeplacer.debut} onChange={(e) => setFormDeplacer({ ...formDeplacer, fin: e.target.value })} />
                  </label>
                </div>
                <div className="esp-form-ligne">
                  {(["hd", "hf"] as const).map((k) => (
                    <label key={k} className="rv-libelle">
                      {k === "hd" ? "De" : "À"}
                      <select className="rv-champ" value={formDeplacer[k]} onChange={(e) => setFormDeplacer({ ...formDeplacer, [k]: e.target.value })}>
                        <option value="">Toute la journée</option>
                        {HEURES.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {erreurGeste ? (
                  <Avis teinte="rouge" role="alert">
                    {erreurGeste}
                  </Avis>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={envoi || !formDeplacer || (formDeplacer.debut === formDeplacer.l.debut && formDeplacer.fin === formDeplacer.l.fin && (formDeplacer.hd || null) === formDeplacer.l.hd && (formDeplacer.hf || null) === formDeplacer.l.hf)}
              onClick={() => {
                setErreurGeste(null);
                void deplacer();
              }}
            >
              {envoi ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!relance} onOpenChange={(o) => !o && setRelance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Send width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Relancer {relance?.l.iv.nom ?? "le sous-traitant"} ?</DialogTitle>
            <DialogDescription>Relisez le message : il s&apos;ouvre dans l&apos;application choisie, prêt à partir. Rien ne part sans vous ; sa réponse se note ensuite avec « Noter la réponse ».</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {relance ? (
              <div className="esp-form">
                <label className="rv-libelle">
                  Message
                  <textarea className="rv-champ" rows={4} value={relance.texte} onChange={(e) => setRelance({ ...relance, texte: e.target.value })} />
                </label>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {relance
              ? (() => {
                  const x = relance.l.iv.tiers;
                  const tel = (x?.telephone ?? "").replace(/[^\d+]/g, "");
                  const corps = encodeURIComponent(relance.texte);
                  const sorties: { libelle: string; href: string }[] = [];
                  if (tel && x?.canal === "whatsapp") sorties.push({ libelle: "Ouvrir WhatsApp", href: `https://wa.me/${tel.replace(/^\+/, "")}?text=${corps}` });
                  if (tel) sorties.push({ libelle: "Ouvrir les SMS", href: `sms:${tel}?&body=${corps}` });
                  if (x?.email) sorties.push({ libelle: "Ouvrir le courriel", href: `mailto:${x.email}?subject=${encodeURIComponent(`Passage ${relance.l.p.tache ?? ""} — ${relance.l.t.chantier.nom}`)}&body=${corps}` });
                  return (
                    <>
                      {sorties.map((s, i) => (
                        <a
                          key={s.href}
                          className={`r-btn ${i === 0 ? "r-btn--noir" : "r-btn--fil"}`}
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            toast(`Message pour ${relance.l.iv.nom} ouvert : envoyez-le depuis l'application.`, "vert");
                            setRelance(null);
                          }}
                        >
                          {s.libelle}
                        </a>
                      ))}
                      <button
                        type="button"
                        className={`r-btn ${sorties.length ? "r-btn--fil" : "r-btn--noir"}`}
                        onClick={async () => {
                          const ok = await copier(relance.texte);
                          toast(ok ? "Message copié." : "Le presse-papier n'a pas répondu.", ok ? "vert" : "rouge");
                        }}
                      >
                        Copier le message
                      </button>
                    </>
                  );
                })()
              : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aRetirer} onOpenChange={(o) => !o && setARetirer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <EyeOff width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Masquer {aRetirer?.nom ?? "cet intervenant"} ?</DialogTitle>
            <DialogDescription>Ses passages et ses absences ne s&apos;affichent plus dans Équipes sur ce navigateur ; rien ne change en base. « Filtres enregistrés › Remettre les intervenants masqués » le fait revenir.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" onClick={() => aRetirer && retirer(aRetirer)}>
              Masquer
            </button>
            <button type="button" className="r-btn r-btn--fil" onClick={() => setARetirer(null)}>
              Garder
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* remplaçants, recaler, noter fait : la fenêtre de l'écran de chantier, hors de la page */}
      {geste && tGeste ? (
        <VoletContexte.Provider value={null}>
          <div hidden>
            <Habille>
              <ChantierVue key={`geste-${source}-${geste.chantier}`} tableau={tGeste} source={source} onLocal={onLocal} relire={() => relireChantier(geste.chantier)} sections={[]} demande={{ n: geste.n, form: geste.form }} />
            </Habille>
          </div>
        </VoletContexte.Provider>
      ) : null}
      {nbNonConfirmes ? <span className="v2-sr">{pluriel(nbNonConfirmes, "passage")} non confirmé{nbNonConfirmes > 1 ? "s" : ""}</span> : null}
    </div>
  );
}

/* ——— petits morceaux ——— */
const ico = (I: typeof Clock) => <I width={16} height={16} aria-hidden="true" />;
type Option = { libelle: string; icone: React.ReactNode; action?: () => void; href?: string; rouge?: boolean; sous?: { libelle: string; action: () => void }[] } | { titre: string } | "sep";

function useFermeture(ouvert: boolean, fermer: () => void) {
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) fermer();
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert, fermer]);
  return boite;
}

/* le menu ⋯ (« Edit event », « After event »…) : 4 px sous le bouton, aligné à droite ; vers le haut s'il est en bas */
function MenuPoints({ libelle, options, haut }: { libelle: string; options: Option[]; haut?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [versHaut, setVersHaut] = useState(false);
  const [sous, setSous] = useState<number | null>(null);
  const fermer = useCallback(() => {
    setOuvert(false);
    setSous(null);
  }, []);
  const boite = useFermeture(ouvert, fermer);
  /* des séparateurs propres : jamais deux de suite, ni en tête ni en fin, ni un titre sans option */
  const propres = options.filter((o, i, t) => {
    if (o === "sep") return i > 0 && i < t.length - 1 && t[i - 1] !== "sep";
    if (typeof o === "object" && "titre" in o) return t[i + 1] !== undefined && t[i + 1] !== "sep" && !(typeof t[i + 1] === "object" && "titre" in (t[i + 1] as object));
    return true;
  });
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button type="button" className="dal-bk-carre" aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={(e) => {
          e.stopPropagation();
          setVersHaut(!!haut || e.currentTarget.getBoundingClientRect().bottom > window.innerHeight - 470);
          setOuvert((o) => !o);
        }}
      >
        <Ellipsis width={16} height={16} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className={`dal-bk-menu${versHaut ? " dal-bk-menu--haut" : ""}`} role="menu" aria-label={libelle} onClick={(e) => e.stopPropagation()}>
          {propres.map((o, i) =>
            o === "sep" ? (
              <div key={i} className="dal-bk-menu-sep" role="separator" />
            ) : "titre" in o ? (
              <div key={i} className="dal-bk-menu-titre">
                {o.titre}
              </div>
            ) : o.href ? (
              <Link key={i} href={o.href} role="menuitem" className="dal-bk-menu-option" onClick={fermer}>
                {o.icone}
                {o.libelle}
              </Link>
            ) : (
              <div key={i} className="dal-bk-menu-ligne">
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup={o.sous ? "menu" : undefined}
                  aria-expanded={o.sous ? sous === i : undefined}
                  className={`dal-bk-menu-option${o.rouge ? " dal-bk-menu-option--rouge" : ""}`}
                  onClick={() => {
                    if (o.sous) return setSous((s) => (s === i ? null : i));
                    fermer();
                    o.action?.();
                  }}
                >
                  {o.icone}
                  {o.libelle}
                  {o.sous ? <ChevronRight className="dal-bk-menu-fleche" width={16} height={16} aria-hidden="true" /> : null}
                </button>
                {o.sous && sous === i ? (
                  <div className="dal-bk-sous-menu" role="menu">
                    {o.sous.map((s) => (
                      <button
                        key={s.libelle}
                        type="button"
                        role="menuitem"
                        className="dal-bk-menu-option"
                        onClick={() => {
                          fermer();
                          s.action();
                        }}
                      >
                        {s.libelle}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function Puce({ libelle, retirer }: { libelle: string; retirer: () => void }) {
  return (
    <span className="dal-bk-bouton dal-bk-puce">
      {libelle}
      <button type="button" aria-label={`Retirer le filtre ${libelle}`} title="Retirer ce filtre" onClick={retirer}>
        <X width={14} height={14} aria-hidden="true" />
      </button>
    </span>
  );
}

/* « Filter » : un champ de recherche, puis les filtres ; un filtre choisi montre ses valeurs */
function MenuFiltre({ filtre, intervenants, chantiers, aller }: { filtre: Filtre; intervenants: Intervenant[]; chantiers: { id: string; nom: string }[]; aller: (m: Record<string, string | null>) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState<"intervenant" | "type" | "chantier" | null>(null);
  const [cherche, setCherche] = useState("");
  const fermer = useCallback(() => {
    setOuvert(false);
    setEtape(null);
    setCherche("");
  }, []);
  const boite = useFermeture(ouvert, fermer);
  const q = cherche.trim().toLocaleLowerCase("fr");
  const familles = [
    { cle: "intervenant" as const, libelle: "Intervenant", icone: UserPlus },
    { cle: "type" as const, libelle: "Sous-traitants ou équipes internes", icone: Building2 },
    { cle: "chantier" as const, libelle: "Chantier", icone: MapPin },
  ];
  const valeurs =
    etape === "intervenant"
      ? intervenants.map((i) => ({ id: i.cle, nom: i.nom, sous: i.genre === "equipe" ? "Équipe interne" : i.genre === "tiers" ? "Sous-traitant" : "Pas encore dans l'annuaire", actif: filtre.intervenant === i.cle }))
      : etape === "type"
        ? [
            { id: "sous-traitants", nom: "Sous-traitants", sous: null, actif: filtre.type === "sous-traitants" },
            { id: "equipes", nom: "Équipes internes", sous: null, actif: filtre.type === "equipes" },
          ]
        : etape === "chantier"
          ? chantiers.map((c) => ({ id: c.id, nom: c.nom, sous: null, actif: filtre.chantier === c.id }))
          : [];
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button type="button" className="dal-bk-bouton" aria-haspopup="dialog" aria-expanded={ouvert} onClick={() => (ouvert ? fermer() : setOuvert(true))}>
        <ListFilter width={16} height={16} aria-hidden="true" />
        Filtrer
      </button>
      {ouvert ? (
        <div className="dal-bk-menu dal-bk-menu--gauche dal-bk-filtre" role="dialog" aria-label="Filtrer">
          <label className="dal-bk-cherche">
            <Search width={16} height={16} aria-hidden="true" />
            <input autoFocus value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={etape ? "Chercher…" : "Chercher un filtre…"} aria-label="Chercher" />
          </label>
          <div className="dal-bk-menu-sep" role="separator" />
          <div className="dal-bk-filtre-liste">
            {etape ? (
              <>
                <button type="button" className="dal-bk-menu-option" onClick={() => (setEtape(null), setCherche(""))}>
                  <ChevronLeft width={16} height={16} aria-hidden="true" />
                  {familles.find((f) => f.cle === etape)?.libelle}
                </button>
                {valeurs
                  .filter((v) => !q || v.nom.toLocaleLowerCase("fr").includes(q))
                  .map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="dal-bk-menu-option"
                      aria-pressed={v.actif}
                      onClick={() => {
                        aller({ [etape]: v.actif ? null : v.id, page: null });
                        fermer();
                      }}
                    >
                      <span className="dal-bk-coche">{v.actif ? <Check width={14} height={14} aria-hidden="true" /> : null}</span>
                      <span className="dal-bk-menu-texte">
                        {v.nom}
                        {v.sous ? <span className="dal-bk-menu-sous"> · {v.sous}</span> : null}
                      </span>
                    </button>
                  ))}
              </>
            ) : (
              familles
                .filter((f) => !q || f.libelle.toLocaleLowerCase("fr").includes(q))
                .map((f) => (
                  <button key={f.cle} type="button" className="dal-bk-menu-option" onClick={() => (setEtape(f.cle), setCherche(""))}>
                    <f.icone width={16} height={16} aria-hidden="true" />
                    {f.libelle}
                  </button>
                ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* « Saved filters » */
function MenuEnregistres(props: {
  enregistres: Enregistre[];
  actif: boolean;
  nomActif: string;
  appliquer: (f: Filtre) => void;
  enregistrer: () => void;
  oublier: (id: string) => void;
  copierAffiche: () => void;
  nbAffiches: number;
  nbMasques: number;
  remettre: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const boite = useFermeture(ouvert, fermer);
  const agir = (f: () => void) => () => {
    fermer();
    f();
  };
  return (
    <div className="dal-bk-menu-boite" ref={boite}>
      <button type="button" className="dal-bk-bouton dal-bk-bouton--choix" aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        Filtres enregistrés
        <ChevronsUpDown width={16} height={16} aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className="dal-bk-menu" role="menu" aria-label="Filtres enregistrés">
          <div className="dal-bk-menu-titre">Filtres enregistrés</div>
          {props.enregistres.length ? (
            props.enregistres.map((e) => (
              <div key={e.id} className="dal-bk-menu-ligne dal-bk-menu-ligne--double">
                <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(() => props.appliquer(e.filtre))}>
                  <ListFilter width={16} height={16} aria-hidden="true" />
                  <span className="dal-bk-menu-texte">{e.nom}</span>
                </button>
                <button type="button" className="dal-bk-menu-x" aria-label={`Oublier le filtre ${e.nom}`} title="Oublier ce filtre" onClick={() => props.oublier(e.id)}>
                  <X width={14} height={14} aria-hidden="true" />
                </button>
              </div>
            ))
          ) : (
            <p className="dal-bk-menu-vide">Aucun filtre enregistré.</p>
          )}
          {props.actif ? (
            <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.enregistrer)}>
              <Check width={16} height={16} aria-hidden="true" />
              <span className="dal-bk-menu-texte">Enregistrer « {props.nomActif} »</span>
            </button>
          ) : null}
          <div className="dal-bk-menu-sep" role="separator" />
          {props.nbAffiches ? (
            <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.copierAffiche)}>
              <Copy width={16} height={16} aria-hidden="true" />
              Copier le planning affiché
            </button>
          ) : null}
          {props.nbMasques ? (
            <button type="button" role="menuitem" className="dal-bk-menu-option" onClick={agir(props.remettre)}>
              <RefreshCcw width={16} height={16} aria-hidden="true" />
              Remettre {pluriel(props.nbMasques, "intervenant")} masqué{props.nbMasques > 1 ? "s" : ""}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ——— la liste : groupes (À venir), lignes, pied de pagination ——— */
function Liste(props: {
  onglet: Onglet;
  lignes: Ligne[];
  du: string;
  ouverte: Ligne | null;
  ouvrir: (l: Ligne) => void;
  choisis: string[];
  setChoisis: (f: (c: string[]) => string[]) => void;
  page: number;
  parPage: number;
  aller: (m: Record<string, string | null>) => void;
  absentPendant: (l: LignePassage) => Absence | null;
  filtrer: (iv: Intervenant) => void;
  optionsPassage: (l: LignePassage) => Option[];
  optionsAbsence: (l: LigneAbsence) => Option[];
  repondre: (l: LignePassage, r: "confirmee" | "declinee") => void;
  remplacants: (l: LignePassage) => void;
}) {
  const { onglet, lignes, du, page, parPage } = props;
  const pagine = onglet !== "a-venir";
  const nbPages = Math.max(1, Math.ceil(lignes.length / parPage));
  const p = Math.min(page, nbPages);
  const vues = pagine ? lignes.slice((p - 1) * parPage, p * parPage) : lignes;
  const groupes: { titre: string | null; lignes: Ligne[] }[] =
    onglet === "a-venir"
      ? [
          { titre: "Aujourd'hui", lignes: vues.filter((l) => l.debut <= du) },
          { titre: "À suivre", lignes: vues.filter((l) => l.debut > du) },
        ].filter((g) => g.lignes.length)
      : [{ titre: null, lignes: vues }];
  return (
    <div className="dal-bk-carte">
      {groupes.map((g) => (
        <div key={g.titre ?? "tout"} className="dal-bk-groupe">
          {g.titre ? <div className="dal-bk-groupe-tete">{g.titre}</div> : null}
          <ul className="dal-bk-panneau">
            {g.lignes.map((l) => (
              <LigneVue key={l.id} {...props} l={l} />
            ))}
          </ul>
        </div>
      ))}
      {pagine ? (
        <div className="dal-bk-pied">
          <label className="dal-bk-par-page">
            <span className="dal-bk-select">
              <select value={parPage} aria-label="Lignes par page" onChange={(e) => props.aller({ n: e.target.value === "10" ? null : e.target.value, page: null })}>
                {[10, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronsUpDown width={14} height={14} aria-hidden="true" />
            </span>
            lignes par page
          </label>
          <span className="dal-bk-pages">
            {(p - 1) * parPage + 1}-{Math.min(p * parPage, lignes.length)} sur {lignes.length}
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Page précédente" disabled={p <= 1} onClick={() => props.aller({ page: p - 1 > 1 ? String(p - 1) : null })}>
              <ChevronLeft width={16} height={16} aria-hidden="true" />
            </button>
            <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Page suivante" disabled={p >= nbPages} onClick={() => props.aller({ page: String(p + 1) })}>
              <ChevronRight width={16} height={16} aria-hidden="true" />
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function LigneVue({ l, onglet, du, ouverte, ouvrir, choisis, setChoisis, absentPendant, filtrer, optionsPassage, optionsAbsence, repondre, remplacants }: Parameters<typeof Liste>[0] & { l: Ligne }) {
  const passe = onglet === "passes";
  const date = passe ? (l.fin === l.debut ? dateLongue(l.debut) : `${jours(l.debut, l.fin)} ${morceaux(l.fin).a}`) : jours(l.debut, l.fin);
  const choisi = choisis.includes(l.id);
  const cocher = (
    <input
      type="checkbox"
      className="dal-bk-case"
      checked={choisi}
      aria-label={`Sélectionner : ${l.genre === "passage" ? titrePassage(l) : `${l.iv.nom} absent`}`}
      onClick={(e) => e.stopPropagation()}
      onChange={() => setChoisis((c) => (choisi ? c.filter((x) => x !== l.id) : [...c, l.id]))}
    />
  );
  const surClic = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,input,select,[role=menu]")) return;
    ouvrir(l);
  };
  if (l.genre === "absence") {
    return (
      <li className="dal-bk-ligne" data-ouverte={ouverte?.id === l.id ? "" : undefined} onClick={surClic}>
        {cocher}
        <div className="dal-bk-quand">
          <p className="dal-bk-date">{date}</p>
          <p className="dal-bk-heure">Toute la journée</p>
        </div>
        <div className="dal-bk-quoi">
          <button type="button" className="dal-bk-titre" onClick={() => ouvrir(l)}>
            {l.iv.nom} absent
          </button>
          <p className="dal-bk-gris">
            Sous-traitant ·{" "}
            <button type="button" className="dal-bk-nom" onClick={() => filtrer(l.iv)}>
              {l.iv.nom}
            </button>
          </p>
          {l.a.motif ? <p className="dal-bk-gris">&quot;{l.a.motif}&quot;</p> : null}
          <span className="dal-bk-pastille" data-teinte="ambre">
            Absence
          </span>
        </div>
        <div className="dal-bk-actions">
          <MenuPoints libelle={`Actions : absence de ${l.iv.nom}`} options={optionsAbsence(l)} />
        </div>
      </li>
    );
  }
  const p = l.p;
  const absence = absentPendant(l);
  const restant = num(l.fin) - Math.max(num(l.debut), num(du)) + 1;
  const mention = p.statut !== "prevu" || l.fin < du ? null : l.debut <= du ? (l.fin > du ? `En cours, jusqu'au ${jours(l.fin, l.fin)}` : "Aujourd'hui") : l.debut === plusJours(du, 1) ? "Demain" : null;
  const pastille = nonConfirme(p) ? pastilleDe(p) : null;
  const dernier = p.confirmations?.length ? p.confirmations[p.confirmations.length - 1] : null;
  const note = dernier?.detail && typeof (dernier.detail as { texte?: unknown }).texte === "string" ? ((dernier.detail as { texte: string }).texte || null) : null;
  return (
    <li className="dal-bk-ligne" data-ouverte={ouverte?.id === l.id ? "" : undefined} onClick={surClic}>
      {cocher}
      <div className="dal-bk-quand">
        <p className="dal-bk-date">{date}</p>
        <p className="dal-bk-heure">{plage(l.hd, l.hf)}</p>
        <Link href={`${BASE}/chantiers/${l.t.chantier.id}`} className="dal-bk-video" title={`Ouvrir le chantier ${l.t.chantier.nom}`}>
          <span className="dal-bk-logo" aria-hidden="true">
            <Building2 width={10} height={10} />
          </span>
          <span className="dal-bk-video-texte">{l.t.chantier.nom}</span>
        </Link>
      </div>
      <div className="dal-bk-quoi">
        <button type="button" className="dal-bk-titre" data-barre={p.statut === "annule" ? "" : undefined} onClick={() => ouvrir(l)}>
          {titrePassage(l)}
        </button>
        <p className="dal-bk-gris">
          {lotDe(p)} ·{" "}
          <button type="button" className="dal-bk-nom" title={`Filtrer sur ${l.iv.nom}`} onClick={() => filtrer(l.iv)}>
            {l.iv.nom}
          </button>
        </p>
        {mention ? <p className="dal-bk-bientot">{mention}</p> : null}
        {absence && p.statut === "prevu" ? <p className="dal-bk-alerte">Absent {periode(absence.du, absence.au)}{absence.motif ? ` (${absence.motif})` : ""} : passage à revoir</p> : null}
        {note ? <p className="dal-bk-gris">&quot;{note}&quot;</p> : null}
        {onglet === "plusieurs-jours" ? (
          <p className="dal-bk-recurrent">
            <RefreshCcw width={16} height={16} aria-hidden="true" />
            {pluriel(restant, "jour")} restant{restant > 1 ? "s" : ""}
          </p>
        ) : null}
        {pastille ? (
          <span className="dal-bk-pastille" data-teinte={pastille.teinte}>
            {pastille.texte}
          </span>
        ) : null}
      </div>
      <div className="dal-bk-actions">
        {onglet === "non-confirmes" && p.statut === "prevu" ? (
          <>
            {p.confirmation !== "declinee" ? (
              <button type="button" className="dal-bk-petit" onClick={() => repondre(l, "declinee")}>
                Décliné
              </button>
            ) : null}
            <button type="button" className="dal-bk-petit dal-bk-petit--plein" onClick={() => repondre(l, "confirmee")}>
              Confirmé
            </button>
            <button type="button" className="dal-bk-carre dal-bk-carre--rouge" aria-label="Chercher un remplaçant" title="Chercher un remplaçant" onClick={() => remplacants(l)}>
              <Flag width={16} height={16} aria-hidden="true" />
            </button>
          </>
        ) : onglet === "annules" ? (
          <button type="button" className="dal-bk-carre dal-bk-carre--rouge" aria-label="Chercher un remplaçant" title="Chercher un remplaçant" disabled={p.intervenant_type !== "tiers"} onClick={() => remplacants(l)}>
            <Flag width={16} height={16} aria-hidden="true" />
          </button>
        ) : null}
        <MenuPoints libelle={`Actions : ${titrePassage(l)}`} options={optionsPassage(l)} />
      </div>
    </li>
  );
}

/* ——— le détail d'une réservation (?uid=) : panneau flottant, sans voile ——— */
function Detail({
  l,
  du,
  fermer,
  precedente,
  suivante,
  absence,
  options,
  copierLigne,
  modifierAbsence,
  filtrer,
  renommer,
}: {
  l: Ligne;
  du: string;
  fermer: () => void;
  precedente: (() => void) | null;
  suivante: (() => void) | null;
  absence: Absence | null;
  options: Option[];
  copierLigne: () => void;
  modifierAbsence: () => void;
  filtrer: (iv: Intervenant) => void;
  renommer: (iv: Intervenant, nom: string) => void;
}) {
  const [renomme, setRenomme] = useState<string | null>(null);
  useEffect(() => {
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog][data-state=open]")) fermer();
    };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [fermer]);
  const pastille = l.genre === "passage" ? (l.p.statut === "prevu" && l.fin < du ? { texte: "À noter fait", teinte: "ambre" as const } : pastilleDe(l.p)) : { texte: "Absence", teinte: "ambre" as const };
  const titre = l.genre === "passage" ? titrePassage(l) : `${l.iv.nom} absent`;
  const iv = l.iv;
  const tiers = iv.tiers;
  const initiales = iv.nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");
  return (
    <aside className="dal-bk-detail" aria-label={titre}>
      <div className="dal-bk-detail-tete">
        <span className="dal-bk-pastille" data-teinte={pastille.teinte}>
          {pastille.texte}
        </span>
        <span className="dal-bk-detail-nav">
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Ligne précédente" disabled={!precedente} onClick={() => precedente?.()}>
            <ChevronUp width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Ligne suivante" disabled={!suivante} onClick={() => suivante?.()}>
            <ChevronDown width={16} height={16} aria-hidden="true" />
          </button>
          <button type="button" className="dal-bk-carre dal-bk-carre--28 dal-bk-carre--nu" aria-label="Fermer" onClick={fermer}>
            <X width={16} height={16} aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="dal-bk-detail-corps">
        <h2 className="dal-bk-detail-titre">{titre}</h2>
        <section>
          <h3>Quand</h3>
          <p className="dal-bk-fort">{l.debut === l.fin ? dateEntiere(l.debut) : `${dateEntiere(l.debut)} - ${dateEntiere(l.fin).toLowerCase()}`}</p>
          <p>{l.genre === "passage" ? `${plage(l.hd, l.hf)}${l.debut !== l.fin ? `, chaque jour (${num(l.fin) - num(l.debut) + 1} jours)` : ""}` : "Toute la journée"}</p>
        </section>
        {l.genre === "passage" ? (
          <section>
            <h3>Qui</h3>
            <div className="dal-bk-personne">
              <span className="dal-bk-avatar" aria-hidden="true">
                <Building2 width={16} height={16} />
              </span>
              <div>
                <p className="dal-bk-fort">
                  Votre entreprise <span className="dal-bk-hote">Donneur d&apos;ordre</span>
                </p>
                <p className="dal-bk-gris">{l.t.chantier.maitre_ouvrage_nom ? `Pour ${l.t.chantier.maitre_ouvrage_nom}` : l.t.chantier.nom}</p>
              </div>
            </div>
          </section>
        ) : null}
        <section>
          <h3>{l.genre === "passage" ? "Intervenant" : "Absent"}</h3>
          <div className="dal-bk-personne">
            <span className="dal-bk-avatar dal-bk-avatar--plein" aria-hidden="true">
              {initiales}
            </span>
            <div>
              {renomme !== null ? (
                <input
                  className="dal-bk-renomme"
                  aria-label="Nom affiché de l'équipe"
                  value={renomme}
                  autoFocus
                  maxLength={80}
                  onChange={(e) => setRenomme(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renommer(iv, renomme);
                      setRenomme(null);
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setRenomme(null);
                    }
                  }}
                  onBlur={() => (renommer(iv, renomme), setRenomme(null))}
                />
              ) : (
                <p className="dal-bk-fort">
                  <button type="button" className="dal-bk-nom" title={`Filtrer sur ${iv.nom}`} onClick={() => filtrer(iv)}>
                    {iv.nom}
                  </button>
                </p>
              )}
              {tiers?.email ? <p className="dal-bk-gris">{tiers.email}</p> : null}
              {tiers?.telephone ? <p className="dal-bk-gris">{tiers.telephone}</p> : null}
              <p className="dal-bk-gris">
                {iv.genre === "equipe" ? "Équipe interne" : iv.genre === "inconnu" ? "Pas encore rapproché de l'annuaire" : [tiers?.corps_etat[0] ? tiers.corps_etat[0].charAt(0).toUpperCase() + tiers.corps_etat[0].slice(1).replace(/_/g, " ") : "Sous-traitant", tiers?.commune].filter(Boolean).join(" · ")}
                {" · "}
                {iv.tiersId ? (
                  <Link className="dal-bk-lien" href={`${BASE}/annuaire?entreprise=${encodeURIComponent(iv.tiersId)}`}>
                    Ouvrir dans l&apos;annuaire
                  </Link>
                ) : iv.genre === "equipe" ? (
                  <button type="button" className="dal-bk-lien" title="Le nom affiché de l'équipe, dans ce navigateur" onClick={() => setRenomme(iv.nom)}>
                    Renommer
                  </button>
                ) : (
                  <Link className="dal-bk-lien" href={`${BASE}/annuaire`}>
                    Ouvrir l&apos;annuaire
                  </Link>
                )}
              </p>
            </div>
          </div>
        </section>
        {l.genre === "passage" ? (
          <>
            <section>
              <h3>Où</h3>
              <p className="dal-bk-ligne-icone">
                <Building2 width={16} height={16} aria-hidden="true" />
                <Link className="dal-bk-lien" href={`${BASE}/chantiers/${l.t.chantier.id}`}>
                  {l.t.chantier.nom}
                </Link>
              </p>
              {l.t.chantier.adresse || l.t.chantier.commune ? <p className="dal-bk-gris">{[l.t.chantier.adresse, [l.t.chantier.code_postal, l.t.chantier.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p> : null}
            </section>
            <section>
              <h3>Lot et confirmation</h3>
              <p>
                {lotDe(l.p)}
                {l.p.exterieur ? " · dehors" : ""}
              </p>
              <p className="dal-bk-gris">
                {l.p.intervenant_type !== "tiers"
                  ? "Pas de demande J-2 : c'est une de vos équipes."
                  : l.p.confirmation === "non_demandee"
                    ? "La demande J-2 partira deux jours avant."
                    : `${pastilleDe(l.p).texte}${l.p.confirmation_le ? ` (${dateCourte(l.p.confirmation_le)})` : ""}`}
              </p>
              {absence ? <p className="dal-bk-alerte">Absent {periode(absence.du, absence.au)}{absence.motif ? ` (${absence.motif})` : ""} : passage à revoir</p> : null}
            </section>
            {l.p.confirmations?.length ? (
              <section>
                <h3>Réponses</h3>
                {l.p.confirmations.slice(-3).map((c) => (
                  <p key={c.id}>
                    {EVENEMENTS[c.evenement] ?? c.evenement}
                    {c.canal ? ` · ${CANAUX[c.canal] ?? c.canal}` : ""}
                    {(c.detail as { texte?: string } | null)?.texte ? ` : « ${(c.detail as { texte: string }).texte} »` : ""}
                  </p>
                ))}
              </section>
            ) : null}
          </>
        ) : (
          <section>
            <h3>Motif</h3>
            <p>{l.a.motif ?? "Aucun motif noté."}</p>
          </section>
        )}
      </div>
      <div className="dal-bk-detail-pied">
        <span className="dal-bk-groupe-bouton">
          {l.genre === "passage" ? (
            <Link href={`${BASE}/chantiers/${l.t.chantier.id}`} className="dal-bk-bouton">
              <span className="dal-bk-logo" aria-hidden="true">
                <Building2 width={10} height={10} />
              </span>
              Ouvrir le chantier
            </Link>
          ) : (
            <button type="button" className="dal-bk-bouton" onClick={modifierAbsence}>
              <Clock width={16} height={16} aria-hidden="true" />
              Modifier l&apos;absence
            </button>
          )}
          <button type="button" className="dal-bk-bouton dal-bk-bouton--icone" aria-label="Copier" title="Copier en texte" onClick={copierLigne}>
            <Copy width={16} height={16} aria-hidden="true" />
          </button>
        </span>
        <MenuPoints libelle={`Actions : ${titre}`} options={options} haut />
      </div>
    </aside>
  );
}

/* ——— la vue calendrier (?vue=calendrier) : jour, semaine (64 px par heure), mois ——— */
function Calendrier({ lignes, du, ouverte, ouvrir, quand, echelle, aller }: { lignes: Ligne[]; du: string; ouverte: Ligne | null; ouvrir: (l: Ligne) => void; quand: string | null; echelle: string | null; aller: (m: Record<string, string | null>) => void }) {
  const ech: "jour" | "semaine" | "mois" = echelle === "jour" || echelle === "mois" ? echelle : "semaine";
  const repere = quand && /^\d{4}-\d{2}-\d{2}$/.test(quand) ? quand : du;
  const grille = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (grille.current) grille.current.scrollTop = 7 * 64;
  }, [ech]);
  const m = morceaux(repere);
  const premierDuMois = `${m.a}-${`${m.m + 1}`.padStart(2, "0")}-01`;
  const decaler = (sens: number) => {
    if (ech === "mois") {
      const d = new Date(Date.UTC(m.a, m.m + sens, 1));
      return aller({ jour: d.toISOString().slice(0, 10) });
    }
    aller({ jour: plusJours(repere, sens * (ech === "jour" ? 1 : 7)) });
  };
  const joursVus = ech === "jour" ? [repere] : Array.from({ length: 7 }, (_, i) => plusJours(lundiDe(repere), i));
  const ce = (j: string) => lignes.filter((l) => l.debut <= j && l.fin >= j);
  const libelle = (l: Ligne) => (l.genre === "passage" ? `${l.p.tache ?? "Passage"} · ${l.iv.nom}` : `${l.iv.nom} absent`);
  const bloc = (l: Ligne, style?: React.CSSProperties) => (
    <button key={l.id} type="button" className="dal-bk-evt" data-genre={l.genre} data-ouverte={ouverte?.id === l.id ? "" : undefined} data-teinte={l.genre === "passage" && nonConfirme(l.p) ? "ambre" : undefined} style={style} title={libelle(l)} onClick={() => ouvrir(l)}>
      <span className="dal-bk-evt-titre">{libelle(l)}</span>
      {l.genre === "passage" ? <span className="dal-bk-evt-sous">{l.hd && l.hf ? `${l.hd} - ${l.hf} · ` : ""}{l.t.chantier.nom}</span> : null}
    </button>
  );
  const [ici, setIci] = useState<{ min: number; fuseau: string } | null>(null);
  useEffect(() => {
    const lire = () => {
      const d = new Date();
      const nom = new Intl.DateTimeFormat("fr-FR", { timeZoneName: "short" }).formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "";
      setIci({ min: d.getHours() * 60 + d.getMinutes(), fuseau: nom });
    };
    const t = window.setTimeout(lire, 0);
    const i = window.setInterval(lire, 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(i);
    };
  }, []);
  const minutes = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return (
    <div className="dal-bk-cal">
      <div className="dal-bk-cal-barre">
        <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Précédent" onClick={() => decaler(-1)}>
          <ChevronLeft width={16} height={16} aria-hidden="true" />
        </button>
        <button type="button" className="dal-bk-carre dal-bk-carre--28" aria-label="Suivant" onClick={() => decaler(1)}>
          <ChevronRight width={16} height={16} aria-hidden="true" />
        </button>
        <button type="button" className="dal-bk-bouton" onClick={() => aller({ jour: null })}>
          Aujourd&apos;hui
        </button>
        <span className="dal-bk-cal-mois">
          {MOIS[m.m].charAt(0).toUpperCase() + MOIS[m.m].slice(1)} {m.a}
        </span>
        <nav className="dal-bk-segment dal-bk-segment--droite" aria-label="Échelle">
          {(["jour", "semaine", "mois"] as const).map((e) => (
            <button key={e} type="button" aria-current={ech === e ? "page" : undefined} onClick={() => aller({ echelle: e === "semaine" ? null : e })}>
              {e === "jour" ? "Jour" : e === "semaine" ? "Semaine" : "Mois"}
            </button>
          ))}
        </nav>
      </div>
      {ech === "mois" ? (
        <div className="dal-bk-mois">
          {JOURS_COURTS.map((j) => (
            <div key={j} className="dal-bk-mois-tete">
              {j}
            </div>
          ))}
          {Array.from({ length: 42 }, (_, i) => plusJours(lundiDe(premierDuMois), i)).map((j) => {
            const ici = ce(j);
            return (
              <div key={j} className="dal-bk-mois-case" data-dehors={morceaux(j).m !== m.m ? "" : undefined}>
                <span className="dal-bk-num" data-aujourdhui={j === du ? "" : undefined}>
                  {morceaux(j).j}
                </span>
                {ici.slice(0, 3).map((l) => bloc(l))}
                {ici.length > 3 ? (
                  <button type="button" className="dal-bk-plus" onClick={() => aller({ echelle: "jour", jour: j })}>
                    + {ici.length - 3}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dal-bk-semaine" style={{ ["--dal-bk-cols" as string]: joursVus.length }}>
          <div className="dal-bk-sem-tete">
            <span className="dal-bk-fuseau">{ici?.fuseau}</span>
            {joursVus.map((j) => (
              <button key={j} type="button" className="dal-bk-sem-jour" onClick={() => aller({ echelle: "jour", jour: j })}>
                {JOURS_COURTS[morceaux(j).r]}
                <span className="dal-bk-num" data-aujourdhui={j === du ? "" : undefined}>
                  {morceaux(j).j}
                </span>
              </button>
            ))}
          </div>
          <div className="dal-bk-sem-journee">
            <span className="dal-bk-heure-col">Journée</span>
            {joursVus.map((j) => (
              <div key={j} className="dal-bk-sem-cellule">
                {ce(j)
                  .filter((l) => l.genre === "absence" || !l.hd || !l.hf)
                  .map((l) => bloc(l))}
              </div>
            ))}
          </div>
          <div className="dal-bk-sem-grille" ref={grille}>
            <div className="dal-bk-heures">
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} style={{ top: h * 64 - 8 }}>
                  {h ? `${h} h` : ""}
                </span>
              ))}
            </div>
            {joursVus.map((j) => (
              <div key={j} className="dal-bk-sem-col">
                {ce(j)
                  .filter((l): l is LignePassage => l.genre === "passage" && !!l.hd && !!l.hf)
                  .map((l) => bloc(l, { top: (minutes(l.hd!) * 64) / 60, height: Math.max(20, ((minutes(l.hf!) - minutes(l.hd!)) * 64) / 60) }))}
                {j === du && ici ? <span className="dal-bk-maintenant" style={{ top: (ici.min * 64) / 60 }} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
