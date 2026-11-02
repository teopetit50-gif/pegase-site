"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « À viser » (02/11/2026)

   Linear, My issues (« Assigned »), au 1:1 : relevé docs/refonte-metiers/
   releves/linear-my-issues.md, styles ./lor-viser.css (préfixe lor-av-),
   jetons ./lor.css. Un ticket de Linear = une chose que l'architecte doit
   viser ou lever avant une date, tous projets confondus (jusqu'ici, projet
   par projet dans la vue Chantier) :

     · les situations de travaux à viser (lorani_situations, b5_13, b5_32,
       b5_33 ; date limite « à viser avant », 7 ou 15 jours selon le marché) ;
     · les documents à viser (lorani_visas, b5_13, b5_15 ; date butoir calée
       sur la commande de l'ouvrage, rappel à J-10, b5_25) ;
     · les réserves à lever (lorani_reserves, b5_19) et les décennales qui
       expirent (lorani_attestations, b5_18).
   Groupes de Linear (Urgent issues, Cycle 1, Cycle 2) → En retard, Cette
   semaine, Semaine prochaine, Plus tard, Sans date. Onglets (Assigned,
   Created, Subscribed, Activity) → Tout, Situations, Visas, Réserves et
   assurances. « New issue » → Document à viser.

   Portes (portes.ts, inchangées) : viserSituation (F26), rendreVisa (F28),
   recevoirDocument (F27), changerReserve (lever, reporter). La date vient
   de la ligne elle-même (a_viser_avant, lever_avant, fin) : c'est celle que
   le registre des délais (public.delais) suit, il n'est pas relu ici.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { changerReserve, recevoirDocument, rendreVisa, viserSituation } from "@/components/espace/lorani/portes";
import type { Attestation, Dossier, Marche, Projet, Reserve, Situation, Visa } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { useExempleSuivi } from "./exemples-suivi";
import { IconeAffichage, IconeCalendrierLor, IconeFiltre, IconeLin, IconePlus, IconePrioriteLor, IconeSansResponsable, IconeSprite, IconeStatutTicket, type StatutTicket } from "./lor-icones";
import "@/components/espace/espace.css";
import "./lor.css";
import "./lor-viser.css";

const CHEMIN = `${RACINE}/lorani/a-viser`;
const lienProjet = (id: string, partie = "chantier") => `${RACINE}/lorani/projets/${encodeURIComponent(id)}?partie=${partie}`;

type Nature = "situation" | "visa" | "reserve" | "attestation";
type Onglet = "tout" | "situations" | "visas" | "reserves";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "tout", libelle: "Tout" },
  { cle: "situations", libelle: "Situations" },
  { cle: "visas", libelle: "Visas" },
  { cle: "reserves", libelle: "Réserves et assurances" },
];
const dansOnglet = (n: Nature, o: Onglet) => o === "tout" || (o === "situations" && n === "situation") || (o === "visas" && n === "visa") || (o === "reserves" && (n === "reserve" || n === "attestation"));

type Ligne = {
  cle: string;
  nature: Nature;
  id: string;
  ident: string;
  titre: string;
  projet: Projet | null;
  lot: string | null;
  lotCouleur: string;
  echeance: string | null;
  recu: string | null;
  fait: boolean;
  statut: StatutTicket;
  /* une puce de plus : montant, commande, localisation */
  extra: { icone: "Euro" | "Calendar" | "Flag" | "Shield"; texte: string; titre: string } | null;
  chef: string | null;
  s?: Situation;
  v?: Visa;
  r?: Reserve;
  a?: Attestation;
  m?: Marche;
};

const COULEURS = ["rgb(235, 87, 87)", "rgb(38, 181, 206)", "rgb(76, 183, 130)", "lch(48 59.31 288.43)", "rgb(247, 200, 193)", "lch(67.969 19.321 31.72)"];
const jourIso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const plusJours = (iso: string, n: number) => jourIso(new Date(new Date(`${iso}T12:00:00`).getTime() + n * 86400000));
const ecart = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T12:00:00`).getTime() - new Date(`${a.slice(0, 10)}T12:00:00`).getTime()) / 86400000);
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const court = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]}${a !== new Date().getFullYear() ? ` ${a}` : ""}`;
};
const fr = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "—");
const euros = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n).toLocaleString("fr-FR")} € HT`);
const initiales = (nom: string) => nom.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase()).join("") || "?";
const NATURE_LIB: Record<Nature, string> = { situation: "Situation", visa: "Visa", reserve: "Réserve", attestation: "Décennale" };

function lire(d: Dossier, aujourdhui: string, traites: boolean): Ligne[] {
  const lotsIdx = new Map(d.lots.map((l, i) => [l.id, { l, c: COULEURS[i % COULEURS.length] }]));
  const projet = (id: string) => d.projets.find((p) => p.id === id) ?? null;
  const chef = (id: string) => d.membres.find((m) => m.projet_id === id && m.role_projet === "chef_projet")?.user_id ?? null;
  const lot = (id: string | null | undefined) => (id ? lotsIdx.get(id) : undefined);
  const recent = (x: string | null | undefined) => !!x && ecart(x, aujourdhui) <= 30;
  const out: Ligne[] = [];
  for (const s of d.situations) {
    if (s.statut !== "a_viser" && !(traites && recent(s.visee_le))) continue;
    const m = d.marches.find((x) => x.id === s.marche_id);
    const lo = lot(m?.lot_id);
    out.push({
      cle: `situation:${s.id}`, nature: "situation", id: s.id, ident: `SIT ${s.numero}`, titre: `Situation n° ${s.numero} — ${m?.titulaire ?? "marché inconnu"}`,
      projet: projet(s.projet_id), lot: lo ? `Lot ${lo.l.numero} · ${lo.l.intitule}` : null, lotCouleur: lo?.c ?? "var(--lor-t3)", echeance: s.a_viser_avant, recu: s.recue_le,
      fait: s.statut !== "a_viser", statut: s.statut === "a_viser" ? "afaire" : "fait",
      extra: { icone: "Euro", texte: euros(s.cumul_ht), titre: "Cumul facturé de la situation" }, chef: chef(s.projet_id), s, m,
    });
  }
  for (const v of d.visas) {
    if (v.avis !== "a_viser" && !(traites && recent(v.vise_le))) continue;
    const lo = lot(v.lot_id);
    out.push({
      cle: `visa:${v.id}`, nature: "visa", id: v.id, ident: `VISA ${v.indice}`, titre: v.document,
      projet: projet(v.projet_id), lot: lo ? `Lot ${lo.l.numero} · ${lo.l.intitule}` : null, lotCouleur: lo?.c ?? "var(--lor-t3)", echeance: v.a_viser_avant, recu: v.recu_le,
      fait: v.avis !== "a_viser", statut: v.avis === "a_viser" ? "afaire" : v.avis === "ref" ? "annule" : "fait",
      extra: v.commande_le ? { icone: "Calendar", texte: `Commande ${court(v.commande_le)}`, titre: `L'ouvrage se commande le ${fr(v.commande_le)} : visa la veille ouvrée au plus tard` } : null,
      chef: chef(v.projet_id), v,
    });
  }
  for (const r of d.reserves) {
    if (r.statut === "levee" ? !(traites && recent(r.levee_le)) : r.statut !== "ouverte") continue;
    const lo = lot(r.lot_id);
    out.push({
      cle: `reserve:${r.id}`, nature: "reserve", id: r.id, ident: `RÉS ${r.numero}`, titre: `Réserve n° ${r.numero} — ${r.intitule}`,
      projet: projet(r.projet_id), lot: lo ? `Lot ${lo.l.numero} · ${lo.l.intitule}` : null, lotCouleur: lo?.c ?? "var(--lor-t3)", echeance: r.lever_avant, recu: r.constatee_le,
      fait: r.statut === "levee", statut: r.statut === "levee" ? "fait" : "afaire",
      extra: r.localisation ? { icone: "Flag", texte: r.localisation, titre: "Localisation" } : null, chef: chef(r.projet_id), r,
    });
  }
  for (const a of d.attestations) {
    if (!a.fin || ecart(aujourdhui, a.fin) > 30) continue;
    const lo = lot(a.lot_id);
    const nom = d.intervenants.find((i) => i.id === a.intervenant_id)?.organisme ?? a.assure ?? "Entreprise";
    out.push({
      cle: `attestation:${a.id}`, nature: "attestation", id: a.id, ident: "DÉC", titre: `Décennale de ${nom} : ${a.fin < aujourdhui ? "expirée" : "expire"} le ${fr(a.fin)}`,
      projet: projet(a.projet_id), lot: lo ? `Lot ${lo.l.numero} · ${lo.l.intitule}` : null, lotCouleur: lo?.c ?? "var(--lor-t3)", echeance: a.fin, recu: a.verifie_le,
      fait: false, statut: "afaire", extra: { icone: "Shield", texte: a.assureur ?? "Assureur ?", titre: "Assureur" }, chef: chef(a.projet_id), a,
    });
  }
  return out;
}

type Groupe = { cle: string; libelle: string; dates?: string; icone: React.ReactNode; lignes: Ligne[] };

function grouper(lignes: Ligne[], aujourdhui: string): Groupe[] {
  const fin = plusJours(aujourdhui, 6);
  const fin2 = plusJours(aujourdhui, 13);
  const g: Groupe[] = [
    { cle: "retard", libelle: "En retard", icone: <IconePrioriteLor niveau={1} />, lignes: [] },
    { cle: "semaine", libelle: "Cette semaine", dates: `${court(aujourdhui)} → ${court(fin)}`, icone: <IconeStatutTicket statut="encours" part={0.5} />, lignes: [] },
    { cle: "suivante", libelle: "Semaine prochaine", dates: `${court(plusJours(aujourdhui, 7))} → ${court(fin2)}`, icone: <IconeStatutTicket statut="afaire" />, lignes: [] },
    { cle: "plus-tard", libelle: "Plus tard", icone: <IconeStatutTicket statut="backlog" />, lignes: [] },
    { cle: "sans-date", libelle: "Sans date", icone: <IconePrioriteLor niveau={0} />, lignes: [] },
    { cle: "traites", libelle: "Traités depuis 30 jours", icone: <IconeStatutTicket statut="fait" />, lignes: [] },
  ];
  const par = (c: string) => g.find((x) => x.cle === c)!.lignes;
  for (const l of lignes) {
    if (l.fait) par("traites").push(l);
    else if (!l.echeance) par("sans-date").push(l);
    else if (l.echeance < aujourdhui) par("retard").push(l);
    else if (l.echeance <= fin) par("semaine").push(l);
    else if (l.echeance <= fin2) par("suivante").push(l);
    else par("plus-tard").push(l);
  }
  for (const x of g) x.lignes.sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999") || a.titre.localeCompare(b.titre, "fr"));
  return g.filter((x) => x.lignes.length);
}

const niveau = (l: Ligne, aujourdhui: string): 0 | 1 | 2 | 3 | 4 => {
  if (l.fait || !l.echeance) return 0;
  const n = ecart(aujourdhui, l.echeance);
  return n < 0 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : 4;
};
const LIB_NIVEAU = ["Sans date", "En retard", "Dans 3 jours au plus", "Dans la semaine", "Plus tard"];

function pourAssistant(ls: Ligne[], nommer: (id: string | null) => string): string {
  return ls
    .map((l) =>
      [
        `${NATURE_LIB[l.nature]} — ${l.titre}`,
        `Projet : ${l.projet?.nom ?? "?"}${l.lot ? ` · ${l.lot}` : ""}`,
        `${l.nature === "reserve" ? "À lever avant" : l.nature === "attestation" ? "Fin de validité" : "À viser avant"} : ${fr(l.echeance)}${l.recu ? ` ; ${l.nature === "reserve" ? "constatée" : "reçu"} le ${fr(l.recu)}` : ""}`,
        l.extra ? `${l.extra.titre} : ${l.extra.texte}` : "",
        l.s && l.m ? `Marché : ${euros(l.m.montant_ht)} + avenants ${euros(l.m.avenants_ht)} ; cumul de la situation ${euros(l.s.cumul_ht)}` : "",
        `Chef de projet : ${l.chef ? nommer(l.chef) : "—"}`,
      ].filter(Boolean).join("\n"),
    )
    .join("\n\n");
}
function csv(ls: Ligne[], nommer: (id: string | null) => string): string {
  const c = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const tete = ["Nature", "Référence", "Intitulé", "Projet", "Lot", "Échéance", "Reçu ou constaté le", "Détail", "Traité", "Chef de projet"];
  return "﻿" + [tete.map(c).join(";"), ...ls.map((l) => [NATURE_LIB[l.nature], l.ident, l.titre, l.projet?.nom, l.lot, l.echeance ? fr(l.echeance) : "", l.recu ? fr(l.recu) : "", l.extra?.texte, l.fait ? "oui" : "non", l.chef ? nommer(l.chef) : ""].map(c).join(";"))].join("\r\n");
}

function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

type Form =
  | { type: "situation"; l: Ligne }
  | { type: "visa"; l: Ligne }
  | { type: "lever"; l: Ligne }
  | { type: "reporter"; l: Ligne }
  | { type: "vso"; ls: Ligne[] }
  | { type: "document" }
  | null;

export default function AViser() {
  useExempleSuivi();
  const { dossier, agir, peutEcrire, pret, erreur: erreurLecture, nommer, clientId, source } = useLorani();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const aujourdhui = jourIso();
  const onglet: Onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "tout") as Onglet;
  const lienOnglet = (o: Onglet) => (o === "tout" ? CHEMIN : `${CHEMIN}?onglet=${o}`);

  const [traites, setTraites] = useState(false);
  const [parProjet, setParProjet] = useState(false);
  const [projetsFiltre, setProjetsFiltre] = useState<string[]>([]);
  const [replies, setReplies] = useState<string[]>([]);
  const [coches, setCoches] = useState<string[]>([]);

  const toutes = useMemo(() => lire(dossier, aujourdhui, traites), [dossier, aujourdhui, traites]);
  const visibles = useMemo(() => toutes.filter((l) => dansOnglet(l.nature, onglet) && (!projetsFiltre.length || (l.projet && projetsFiltre.includes(l.projet.id)))), [toutes, onglet, projetsFiltre]);
  const groupes = useMemo<Groupe[]>(() => {
    if (!parProjet) return grouper(visibles, aujourdhui);
    const ids = [...new Set(visibles.map((l) => l.projet?.id ?? ""))];
    return ids
      .map((id) => ({ cle: id, libelle: visibles.find((l) => l.projet?.id === id)?.projet?.nom ?? "Sans projet", icone: <IconeSprite nom="Project" taille={16} />, lignes: visibles.filter((l) => (l.projet?.id ?? "") === id).sort((a, b) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999")) }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
  }, [visibles, parProjet, aujourdhui]);
  const cochees = toutes.filter((l) => coches.includes(l.cle));

  /* ——— saisies ——— */
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<string>("");
  const [montant, setMontant] = useState("");
  const [obs, setObs] = useState("");
  const [date, setDate] = useState("");
  const [doc, setDoc] = useState({ projet: "", lot: "", document: "", indice: "A", recu: "", commande: "" });
  const gris = !peutEcrire || envoi;

  const ouvrir = (f: Form) => {
    setErreur(null);
    setObs("");
    setMontant("");
    if (f?.type === "situation") setChoix("visee");
    if (f?.type === "visa") setChoix("vso");
    if (f?.type === "reporter") setDate(f.l.echeance ?? plusJours(aujourdhui, 7));
    if (f?.type === "document") setDoc({ projet: projetsFiltre[0] ?? dossier.projets.find((p) => p.actif && p.phase === "det")?.id ?? dossier.projets.find((p) => p.actif)?.id ?? "", lot: "", document: "", indice: "A", recu: aujourdhui, commande: "" });
    setForm(f);
  };
  const appliquer = async (reel: () => Promise<void>, local: () => Dossier, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
      setCoches([]);
      toast(message, "vert");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const agirLigne = (l: Ligne) => {
    if (l.nature === "attestation") router.push(lienProjet(l.projet?.id ?? "", "assurances"));
    else if (l.fait) router.push(lienProjet(l.projet?.id ?? ""));
    else ouvrir({ type: l.nature === "situation" ? "situation" : l.nature === "visa" ? "visa" : "lever", l });
  };

  const soumettreSituation = () => {
    if (form?.type !== "situation" || !form.l.s) return;
    const s = form.l.s;
    const statut = choix === "rectifiee" ? "rectifiee" : "visee";
    const admis = statut === "visee" ? s.cumul_ht : Number(montant.replace(/\s/g, "").replace(",", "."));
    if (statut === "rectifiee" && (!Number.isFinite(admis) || admis < 0 || !obs.trim())) return;
    const v = { statut: statut as "visee" | "rectifiee", cumul_admis_ht: admis, observation: obs.trim() || null };
    void appliquer(() => viserSituation(s.id, v), () => ({ ...dossier, situations: dossier.situations.map((x) => (x.id === s.id ? { ...x, ...v, visee_le: aujourdhui } : x)) }), statut === "visee" ? `Situation n° ${s.numero} visée` : `Situation n° ${s.numero} rectifiée`);
  };
  const soumettreVisa = () => {
    if (form?.type !== "visa" || !form.l.v) return;
    const vi = form.l.v;
    const avis = choix as "vso" | "vao" | "ref";
    if (avis !== "vso" && !obs.trim()) return;
    void appliquer(() => rendreVisa(vi.id, { avis, observation: obs.trim() || null }), () => ({ ...dossier, visas: dossier.visas.map((x) => (x.id === vi.id ? { ...x, avis, observation: obs.trim() || null, vise_le: aujourdhui } : x)) }), avis === "ref" ? "Document refusé" : "Avis rendu");
  };
  const soumettreVso = () => {
    if (form?.type !== "vso") return;
    const ids = form.ls.filter((l) => l.v).map((l) => l.id);
    void appliquer(
      async () => {
        for (const id of ids) await rendreVisa(id, { avis: "vso", observation: null });
      },
      () => ({ ...dossier, visas: dossier.visas.map((x) => (ids.includes(x.id) ? { ...x, avis: "vso", observation: null, vise_le: aujourdhui } : x)) }),
      `${ids.length} document${ids.length > 1 ? "s" : ""} visé${ids.length > 1 ? "s" : ""} sans observation`,
    );
  };
  const soumettreLever = () => {
    if (form?.type !== "lever" || !form.l.r) return;
    const r = form.l.r;
    void appliquer(() => changerReserve(r.id, { statut: "levee", levee_le: aujourdhui }), () => ({ ...dossier, reserves: dossier.reserves.map((x) => (x.id === r.id ? { ...x, statut: "levee", levee_le: aujourdhui } : x)) }), `Réserve n° ${r.numero} levée`);
  };
  const soumettreReport = () => {
    if (form?.type !== "reporter" || !form.l.r || !date) return;
    const r = form.l.r;
    void appliquer(() => changerReserve(r.id, { lever_avant: date }), () => ({ ...dossier, reserves: dossier.reserves.map((x) => (x.id === r.id ? { ...x, lever_avant: date } : x)) }), `Levée attendue le ${fr(date)}`);
  };
  const projetDoc = dossier.projets.find((p) => p.id === doc.projet) ?? null;
  const lotsDoc = dossier.lots.filter((l) => l.projet_id === doc.projet);
  const soumettreDocument = () => {
    if (!projetDoc || !doc.document.trim() || !doc.indice.trim() || !doc.recu) return;
    const v = { client_id: clientId, projet_id: projetDoc.id, lot_id: doc.lot || null, document: doc.document.trim(), indice: doc.indice.trim(), recu_le: doc.recu, commande_le: doc.commande || null };
    /* sur l'exemple, la date limite est posée comme le fait la base : 15 jours, la veille de la commande au plus tard */
    const limite = [plusJours(v.recu_le, 15), v.commande_le ? plusJours(v.commande_le, -1) : null].filter(Boolean).sort()[0] as string;
    void appliquer(() => recevoirDocument(v), () => ({ ...dossier, visas: [...dossier.visas, { id: `local-${crypto.randomUUID()}`, projet_id: v.projet_id, lot_id: v.lot_id, document: v.document, indice: v.indice, recu_le: v.recu_le, commande_le: v.commande_le, delai_visa_jours: 15, a_viser_avant: limite, avis: "a_viser", observation: null, vise_le: null }] }), "Document à viser enregistré");
  };

  const copier = async (t: string, message: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast(message, "vert");
    } catch {
      toast("Le presse-papiers n'a pas répondu.", "rouge");
    }
  };
  const exporter = (ls: Ligne[]) => {
    const url = URL.createObjectURL(new Blob([csv(ls, nommer)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `a-viser-lorani-${aujourdhui}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${ls.length} ligne${ls.length > 1 ? "s" : ""} exportée${ls.length > 1 ? "s" : ""}`, "vert");
  };

  const [filtreOuvert, setFiltreOuvert, filtreRef] = useMenu();
  const [affOuvert, setAffOuvert, affRef] = useMenu();
  const [plusOuvert, setPlusOuvert, plusRef] = useMenu();

  /* Échap vide la sélection ; C (comme « Create » chez Linear) pose un document à viser */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (form || e.metaKey || e.ctrlKey || e.altKey || (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
      if (e.key === "Escape" && coches.length) setCoches([]);
      if (e.key.toLowerCase() === "c" && peutEcrire) {
        e.preventDefault();
        ouvrir({ type: "document" });
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  });

  const ligne = (l: Ligne) => {
    const n = niveau(l, aujourdhui);
    const retard = !l.fait && !!l.echeance && l.echeance < aujourdhui;
    return (
      <li key={l.cle}>
        <div
          className="lor-av-ligne"
          role="button"
          tabIndex={0}
          data-coche={coches.includes(l.cle) ? "" : undefined}
          onClick={() => agirLigne(l)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), agirLigne(l))}
          title={l.fait ? "Ouvrir le chantier du projet" : l.nature === "situation" ? "Viser la situation" : l.nature === "visa" ? "Rendre l'avis" : l.nature === "reserve" ? "Lever la réserve" : "Ouvrir les assurances du projet"}
        >
          <span className="lor-av-case" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" aria-label="Sélectionner" checked={coches.includes(l.cle)} onChange={() => setCoches((c) => (c.includes(l.cle) ? c.filter((x) => x !== l.cle) : [...c, l.cle]))} />
          </span>
          <span className="lor-av-prio">
            <IconePrioriteLor niveau={n} titre={LIB_NIVEAU[n]} />
          </span>
          <span className="lor-av-id">{l.ident}</span>
          <span className="lor-av-statut">
            <IconeStatutTicket statut={l.statut} titre={l.fait ? "Traité" : "À faire"} />
          </span>
          <span className="lor-av-titre-c">
            <span className="lor-av-nom">{l.titre}</span>
            <span className="lor-av-puces">
              {l.lot ? (
                <span className="lor-av-puce" data-second="" title={l.lot}>
                  <span className="lor-av-point" style={{ ["--c" as string]: l.lotCouleur }} />
                  {l.lot.split(" · ")[1] ?? l.lot}
                </span>
              ) : null}
              {l.projet ? (
                <Link href={lienProjet(l.projet.id)} className="lor-av-puce" onClick={(e) => e.stopPropagation()} title={`Ouvrir le chantier de ${l.projet.nom}`}>
                  <IconeSprite nom="Project" taille={14} />
                  {l.projet.nom}
                </Link>
              ) : null}
              {l.extra ? (
                <span className="lor-av-puce" data-second="" title={l.extra.titre}>
                  <IconeSprite nom={l.extra.icone} taille={14} />
                  {l.extra.texte}
                </span>
              ) : null}
              {l.echeance ? (
                <span className="lor-av-puce" title={`${l.nature === "reserve" ? "À lever avant le" : l.nature === "attestation" ? "Fin de validité le" : "À viser avant le"} ${fr(l.echeance)}`}>
                  <IconeCalendrierLor passe={retard} />
                  {court(l.echeance)}
                </span>
              ) : null}
            </span>
            {l.chef ? (
              <span className="lor-av-avatar" title={`Chef de projet : ${nommer(l.chef)}`}>
                {initiales(nommer(l.chef))}
              </span>
            ) : (
              <IconeSansResponsable titre="Pas de chef de projet" />
            )}
          </span>
          <span className="lor-av-date" title={l.recu ? `${l.nature === "reserve" ? "Constatée" : "Reçu"} le ${fr(l.recu)}` : undefined}>
            {court(l.recu)}
          </span>
        </div>
      </li>
    );
  };

  const formLigne = form && "l" in form ? form.l : null;
  const precedente = form?.type === "situation" && form.l.s ? dossier.situations.filter((x) => x.marche_id === form.l.s!.marche_id && x.numero < form.l.s!.numero).sort((a, b) => b.numero - a.numero)[0] : undefined;

  return (
    <div className="lor lor-av" data-selection={coches.length ? "" : undefined}>
      <header>
        <div className="lor-av-l1">
          <h1 className="lor-av-titre">À viser</h1>
          {peutEcrire ? (
            <button type="button" className="lor-texte-btn" onClick={() => ouvrir({ type: "document" })} title="Enregistrer un document à viser (C)">
              <IconePlus />
              <span className="lor-av-nouveau">Document à viser</span>
            </button>
          ) : null}
        </div>
        <div className="lor-av-l2">
          <nav className="lor-av-vues" aria-label="Nature">
            {ONGLETS.map((o, i) => (
              <Link key={o.cle} href={lienOnglet(o.cle)} scroll={false} className="lor-vue" data-actif={onglet === o.cle ? "" : undefined} data-repli={i >= 2 ? "" : undefined} aria-current={onglet === o.cle ? "page" : undefined}>
                {o.libelle}
              </Link>
            ))}
            <span className="lor-av-ancre" ref={plusRef}>
              <button type="button" className="lor-vue" data-plus="" aria-expanded={plusOuvert} onClick={() => setPlusOuvert((x) => !x)}>
                2 de plus
                <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden="true" fill="currentColor">
                  <path d="M.6 2.9a.6.6 0 0 1 .85 0L4 5.45 6.55 2.9a.6.6 0 1 1 .85.85L4.42 6.73a.6.6 0 0 1-.84 0L.6 3.75a.6.6 0 0 1 0-.85" />
                </svg>
              </button>
              {plusOuvert ? (
                <div className="lor-menu" role="menu" style={{ left: 0, top: 34 }}>
                  <div className="lor-menu-liste">
                    {ONGLETS.slice(2).map((o) => (
                      <Link key={o.cle} role="menuitem" href={lienOnglet(o.cle)} scroll={false} className="lor-option" data-actif={onglet === o.cle ? "" : undefined} onClick={() => setPlusOuvert(false)}>
                        <span className="lor-option-libelle">{o.libelle}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </span>
          </nav>
          <div className="lor-av-outils">
            <span className="lor-av-ancre" ref={filtreRef}>
              <button type="button" className="lor-rond lor-rond--plein" aria-label="Filtrer par projet" title="Filtrer par projet" aria-expanded={filtreOuvert} aria-pressed={projetsFiltre.length > 0} onClick={() => setFiltreOuvert((x) => !x)}>
                <IconeFiltre />
              </button>
              {filtreOuvert ? (
                <div className="lor-menu" role="menu" aria-label="Projets" style={{ right: 0, top: 34, minWidth: 260 }}>
                  <div className="lor-menu-liste">
                    {[...new Map(toutes.filter((l) => l.projet).map((l) => [l.projet!.id, l.projet!])).values()].map((p) => {
                      const on = projetsFiltre.includes(p.id);
                      return (
                        <button key={p.id} type="button" role="menuitemcheckbox" aria-checked={on} className="lor-option" data-actif={on ? "" : undefined} onClick={() => setProjetsFiltre((f) => (on ? f.filter((x) => x !== p.id) : [...f, p.id]))}>
                          <IconeSprite nom="Project" />
                          <span className="lor-option-libelle">{p.nom}</span>
                          <span className="lor-option-droite">{on ? <Check width={14} height={14} aria-hidden="true" /> : toutes.filter((l) => l.projet?.id === p.id && !l.fait).length}</span>
                        </button>
                      );
                    })}
                  </div>
                  {projetsFiltre.length ? (
                    <>
                      <div className="lor-menu-sep" />
                      <div className="lor-menu-liste">
                        <button type="button" className="lor-option" onClick={() => setProjetsFiltre([])}>
                          <span className="lor-option-libelle">Tous les projets</span>
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </span>
            <span className="lor-av-ancre" ref={affRef}>
              <button type="button" className="lor-rond lor-rond--plein" aria-label="Affichage" title="Affichage" aria-expanded={affOuvert} onClick={() => setAffOuvert((x) => !x)}>
                <IconeAffichage />
              </button>
              {affOuvert ? (
                <div className="lor-menu" role="dialog" aria-label="Affichage" style={{ right: 0, top: 34, minWidth: 260 }}>
                  <div className="lor-menu-liste">
                    <button type="button" className="lor-option" data-actif={!parProjet ? "" : undefined} onClick={() => setParProjet(false)}>
                      <span className="lor-option-libelle">Grouper par échéance</span>
                      {!parProjet ? <Check width={14} height={14} aria-hidden="true" /> : null}
                    </button>
                    <button type="button" className="lor-option" data-actif={parProjet ? "" : undefined} onClick={() => setParProjet(true)}>
                      <span className="lor-option-libelle">Grouper par projet</span>
                      {parProjet ? <Check width={14} height={14} aria-hidden="true" /> : null}
                    </button>
                  </div>
                  <div className="lor-menu-sep" />
                  <div className="lor-menu-liste">
                    <button type="button" className="lor-option" role="menuitemcheckbox" aria-checked={traites} onClick={() => setTraites((x) => !x)}>
                      <span className="lor-option-libelle">Afficher les traités (30 jours)</span>
                      {traites ? <Check width={14} height={14} aria-hidden="true" /> : null}
                    </button>
                  </div>
                </div>
              ) : null}
            </span>
            <button type="button" className="lor-rond lor-rond--plein" aria-label="Exporter la liste en CSV" title="Exporter la liste en CSV" disabled={!visibles.length} onClick={() => exporter(visibles)}>
              <IconeSprite nom="Spreadsheet" taille={14} />
            </button>
          </div>
        </div>
      </header>

      {!peutEcrire && pret ? <p className="lor-av-note">Lecture seule : vous voyez les échéances sans pouvoir viser.</p> : null}
      {erreurLecture && source === "reelle" ? <p className="lor-av-note">La base n&apos;a pas répondu : {erreurLecture}</p> : null}

      <div className="lor-av-liste">
        {!pret ? (
          <p className="lor-av-vide" role="status">
            Lecture du dossier…
          </p>
        ) : !groupes.length ? (
          <p className="lor-av-vide">{toutes.length ? "Rien dans cet onglet." : "Rien à viser : les situations, les documents à viser, les réserves et les décennales qui expirent arrivent ici, tous projets confondus."}</p>
        ) : (
          groupes.map((g) => {
            const replie = replies.includes(g.cle);
            return (
              <section key={g.cle} className="lor-av-groupe" aria-label={g.libelle}>
                <h2 className="lor-av-groupe-tete">
                  <button type="button" className="lor-av-replier" aria-expanded={!replie} aria-label={replie ? `Déplier ${g.libelle}` : `Replier ${g.libelle}`} onClick={() => setReplies((r) => (replie ? r.filter((x) => x !== g.cle) : [...r, g.cle]))}>
                    <IconeLin nom="chevronBas" />
                  </button>
                  <span className="lor-av-groupe-icone">{g.icone}</span>
                  <span>{g.libelle}</span>
                  <span className="lor-av-groupe-n">{g.lignes.length}</span>
                  {g.dates ? <span className="lor-av-groupe-d">{g.dates}</span> : null}
                  {peutEcrire ? (
                    <button type="button" className="lor-rond lor-av-groupe-plus" aria-label="Enregistrer un document à viser" title="Enregistrer un document à viser" onClick={() => ouvrir({ type: "document" })}>
                      <IconePlus />
                    </button>
                  ) : null}
                </h2>
                {replie ? null : <ul>{g.lignes.map(ligne)}</ul>}
              </section>
            );
          })
        )}
        {coches.length ? (
          <div className="lor-av-barre" role="toolbar" aria-label="Actions sur la sélection">
            <span className="lor-av-barre-nb">
              {coches.length} sélectionné{coches.length > 1 ? "s" : ""}
            </span>
            <button type="button" className="lor-texte-btn" disabled={gris || !cochees.some((l) => l.v && !l.fait)} onClick={() => ouvrir({ type: "vso", ls: cochees.filter((l) => l.v && !l.fait) })}>
              <IconeLin nom="accepter" />
              Viser sans observation
            </button>
            <button type="button" className="lor-texte-btn" onClick={() => exporter(cochees)}>
              <IconeSprite nom="Spreadsheet" taille={14} />
              CSV
            </button>
            <button type="button" className="lor-texte-btn" onClick={() => void copier(pourAssistant(cochees, nommer), "Copié pour l'assistant")}>
              <IconeSprite nom="Write" taille={14} />
              Copier pour l&apos;assistant
            </button>
            <button type="button" className="lor-rond" aria-label="Tout désélectionner (Échap)" title="Tout désélectionner (Échap)" onClick={() => setCoches([])}>
              <IconeLin nom="refuser" />
            </button>
          </div>
        ) : null}
      </div>

      {/* F26 — viser ou rectifier une situation */}
      <Dialog open={form?.type === "situation"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ClipboardCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{formLigne?.titre}</DialogTitle>
            <DialogDescription>
              {formLigne?.projet?.nom} · à viser avant le {fr(formLigne?.echeance)}. Le visa vaut pour le cumul admis ; rectifiée, la situation retient le montant que vous indiquez.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {formLigne?.s ? (
                <dl className="lor-av-faits">
                  <dt>Marché et avenants</dt>
                  <dd>{formLigne.m ? `${euros(formLigne.m.montant_ht + formLigne.m.avenants_ht)} (dont avenants ${euros(formLigne.m.avenants_ht)})` : "—"}</dd>
                  <dt>Cumul de la situation</dt>
                  <dd>
                    {euros(formLigne.s.cumul_ht)}
                    {formLigne.m ? ` · ${Math.round((formLigne.s.cumul_ht / Math.max(1, formLigne.m.montant_ht + formLigne.m.avenants_ht)) * 100)} % du marché` : ""}
                  </dd>
                  <dt>Situation précédente</dt>
                  <dd>{precedente ? `n° ${precedente.numero} : ${euros(precedente.cumul_admis_ht ?? precedente.cumul_ht)} admis · ce mois ${euros(formLigne.s.cumul_ht - (precedente.cumul_admis_ht ?? precedente.cumul_ht))}` : "aucune"}</dd>
                  {formLigne.s.avancement_declare != null ? (
                    <>
                      <dt>Avancement</dt>
                      <dd>
                        facturé {formLigne.s.avancement_declare} %{formLigne.s.avancement_constate != null ? `, constaté au compte rendu ${formLigne.s.avancement_constate} %` : ""}
                      </dd>
                    </>
                  ) : null}
                  {formLigne.m && formLigne.s.cumul_ht > formLigne.m.montant_ht + formLigne.m.avenants_ht ? (
                    <>
                      <dt>Dépassement</dt>
                      <dd style={{ color: "var(--lor-retard)" }}>{euros(formLigne.s.cumul_ht - formLigne.m.montant_ht - formLigne.m.avenants_ht)} au-delà du marché</dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
              <label className="rv-libelle">
                Décision
                <select className="rv-champ" value={choix} onChange={(e) => setChoix(e.target.value)}>
                  <option value="visee">Visée telle quelle</option>
                  <option value="rectifiee">Rectifiée (cumul admis différent)</option>
                </select>
              </label>
              {choix === "rectifiee" ? (
                <label className="rv-libelle">
                  Cumul admis (€ HT) <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={formLigne?.s ? String(formLigne.s.cumul_ht) : ""} />
                </label>
              ) : null}
              <label className="rv-libelle">
                Observation {choix === "rectifiee" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
              {formLigne?.projet ? (
                <Link href={lienProjet(formLigne.projet.id)} className="esp-kpi-sous">
                  Ouvrir le chantier du projet
                </Link>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || (choix === "rectifiee" && (!montant.trim() || !obs.trim()))} onClick={soumettreSituation}>
              {envoi ? <Loader variant="spin" /> : null} {choix === "rectifiee" ? "Rectifier" : "Viser"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F28 — rendre l'avis sur un document */}
      <Dialog open={form?.type === "visa"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FileCheck2 width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Rendre l&apos;avis</DialogTitle>
            <DialogDescription>
              {formLigne?.titre} (indice {formLigne?.v?.indice}) · {formLigne?.projet?.nom} · reçu le {fr(formLigne?.recu)}, à viser avant le {fr(formLigne?.echeance)}
              {formLigne?.v?.commande_le ? ` ; l'ouvrage se commande le ${fr(formLigne.v.commande_le)}` : ""}. L&apos;avis rendu clôt l&apos;échéance au registre des délais.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Avis
                <select className="rv-champ" value={choix} onChange={(e) => setChoix(e.target.value)}>
                  <option value="vso">VSO — visé sans observation</option>
                  <option value="vao">VAO — visé avec observations</option>
                  <option value="ref">Refusé</option>
                </select>
              </label>
              <label className="rv-libelle">
                Observations {choix !== "vso" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || (choix !== "vso" && !obs.trim())} onClick={soumettreVisa}>
              {envoi ? <Loader variant="spin" /> : null} Rendre l&apos;avis
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VSO groupé : confirmation */}
      <Dialog open={form?.type === "vso"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Check width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Viser sans observation</DialogTitle>
            <DialogDescription>L&apos;avis VSO est rendu sur chacun de ces documents ; il clôt leur échéance au registre des délais.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "vso" ? (
                <ul style={{ display: "grid", gap: 4, margin: 0, paddingLeft: 18 }}>
                  {form.ls.map((l) => (
                    <li key={l.cle} className="esp-kpi-sous">
                      {l.projet?.nom} : {l.titre} (indice {l.v?.indice})
                    </li>
                  ))}
                </ul>
              ) : null}
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={soumettreVso}>
              {envoi ? <Loader variant="spin" /> : null} Viser {form?.type === "vso" ? form.ls.length : ""}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lever une réserve : confirmation ; reporter sa date */}
      <Dialog open={form?.type === "lever"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <ShieldCheck width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Lever la réserve</DialogTitle>
            <DialogDescription>
              {formLigne?.titre} · {formLigne?.projet?.nom}
              {formLigne?.r?.localisation ? ` · ${formLigne.r.localisation}` : ""}. À lever avant le {fr(formLigne?.echeance)}. La levée est datée d&apos;aujourd&apos;hui.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {erreur ? (
              <Avis teinte="rouge" role="alert">
                {erreur}
              </Avis>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn" disabled={gris} onClick={() => formLigne && ouvrir({ type: "reporter", l: formLigne })}>
              Reporter la date
            </button>
            <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={soumettreLever}>
              {envoi ? <Loader variant="spin" /> : null} Lever
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={form?.type === "reporter"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporter la levée</DialogTitle>
            <DialogDescription>{formLigne?.titre} · la date à laquelle l&apos;entreprise doit avoir levé la réserve.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                À lever avant le <span className="esp-obligatoire">(obligatoire)</span>
                <input type="date" className="rv-champ" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || !date} onClick={soumettreReport}>
              {envoi ? <Loader variant="spin" /> : null} Reporter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F27 — document à viser */}
      <Dialog open={form?.type === "document"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FileCheck2 width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Document à viser</DialogTitle>
            <DialogDescription>La date limite du visa est calculée par Lorani (CCAG-Travaux, art. 29), au plus tard la veille ouvrée de la commande de l&apos;ouvrage ; elle est suivie au registre des délais, avec un rappel à J-10 quand la commande est datée.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Projet <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={doc.projet} onChange={(e) => setDoc((d) => ({ ...d, projet: e.target.value, lot: "" }))}>
                  <option value="">Choisir…</option>
                  {dossier.projets.filter((p) => p.actif).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rv-libelle">
                Lot
                <select className="rv-champ" value={doc.lot} onChange={(e) => setDoc((d) => ({ ...d, lot: e.target.value }))} disabled={!lotsDoc.length}>
                  <option value="">{lotsDoc.length ? "Aucun" : "Aucun lot sur ce projet"}</option>
                  {lotsDoc.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lot {l.numero} · {l.intitule}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rv-libelle">
                Document <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={doc.document} onChange={(e) => setDoc((d) => ({ ...d, document: e.target.value }))} placeholder="Plans d'exécution, fiche technique, note de calcul…" />
              </label>
              <label className="rv-libelle">
                Indice <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={doc.indice} onChange={(e) => setDoc((d) => ({ ...d, indice: e.target.value }))} maxLength={10} />
              </label>
              <label className="rv-libelle">
                Reçu le <span className="esp-obligatoire">(obligatoire)</span>
                <input type="date" className="rv-champ" value={doc.recu} onChange={(e) => setDoc((d) => ({ ...d, recu: e.target.value }))} />
              </label>
              <label className="rv-libelle">
                Commande de l&apos;ouvrage le
                <input type="date" className="rv-champ" value={doc.commande} onChange={(e) => setDoc((d) => ({ ...d, commande: e.target.value }))} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || !projetDoc || !doc.document.trim() || !doc.indice.trim() || !doc.recu} onClick={soumettreDocument}>
              {envoi ? <Loader variant="spin" /> : null} Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
