"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT — la première page, sur la page « Projects » de Linear (28/10/2026)

   Même gabarit que CASHD (../cashd/Debiteurs.tsx) : une demande client est
   un projet. Trois vues, toutes sur /espace2/reput :

     · le tableau de bord (sans paramètre) : la page d'un projet, REPUT
       étant le projet — ce qui est reçu, ce qui attend, ce qui est répondu ;
       les réponses prêtes à valider en « Latest update » ; les demandes par
       canal et par sujet ; les plus urgentes ; à droite les cartes
       Propriétés, Parcours, Avancement et Activité ;
     · la liste (?vue=demandes) : le tableau des projets — une demande par
       ligne, son statut en santé, sa priorité (urgence, délai du sujet
       dépassé), le temps d'attente, le jour de réception, le canal ;
     · une demande (?demande=<id>, le lien qu'utilisent déjà les Urgences) :
       la page d'un projet — le message reçu, la réponse préparée à valider,
       corriger ou refuser (portes reput_decider et reput_corriger, comme
       l'ancien écran), son parcours en jalons.

   Les chiffres passent par les mêmes portes que l'ancien écran
   (components/espace/reput/EcranReput) : l'exemple (mondeExemple, modifié
   en mémoire), ou la base réelle (chargerMonde, sous RLS, en temps réel).
   Gabarit : ../lin/lin.css ; les quelques briques en plus : ./reput.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import {
  ArrowRight,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Globe,
  ListFilter,
  Mail,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  PanelRight,
  PenLine,
  PhoneMissed,
  SlidersHorizontal,
  Smartphone,
  X,
} from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dateHeure } from "@/components/espace/format";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { csvDemandes, libelleStatut, telecharger } from "@/components/espace/reput/export";
import { chargerMonde, corriger, decider, monClient } from "@/components/espace/reput/portes";
import type { Canal, Client, Demande, Monde, Reponse, StatutDemande, StatutReponse } from "@/components/espace/reput/types";
import { CarteDroite, Choix, IconePriorite, Menu, MenuActions, MenuOptions, type Option, type Serie } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeEnveloppe, IconeGroupe, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import "./reput.css";

type Sante = "a_traiter" | "a_valider" | "preparation" | "repondue" | "classee";
type Teinte = "vert" | "jaune" | "rouge" | "gris" | "bleu";
type Tri = "priorite" | "recente" | "attente" | "nom";
type Etape = "recue" | "preparee" | "validee" | "envoyee";
type Niveau = 0 | 1 | 2 | 3 | 4;

const HEURE = 3_600_000;
const JOUR = 86_400_000;
const JOURS = 7;
const LISTE = `${RACINE}/reput?vue=demandes`;

/* dans l'ordre des onglets : ce qui demande une action d'abord */
const SANTES: Record<Sante, { libelle: string; teinte: Teinte }> = {
  a_traiter: { libelle: "À traiter", teinte: "rouge" },
  a_valider: { libelle: "À valider", teinte: "jaune" },
  preparation: { libelle: "En préparation", teinte: "bleu" },
  repondue: { libelle: "Répondue", teinte: "vert" },
  classee: { libelle: "Classée", teinte: "gris" },
};
const OUVERTES: Sante[] = ["a_traiter", "a_valider", "preparation"];
const CANAUX: Record<Canal, string> = { email: "Courriel", whatsapp: "WhatsApp", sms: "SMS", formulaire: "Formulaire du site", appel: "Appel manqué" };
const ETAPES: { cle: Etape; libelle: string }[] = [
  { cle: "recue", libelle: "Reçue" },
  { cle: "preparee", libelle: "Réponse préparée" },
  { cle: "validee", libelle: "Validée" },
  { cle: "envoyee", libelle: "Envoyée" },
];
const ETATS_REPONSE: Record<StatutReponse, string> = {
  a_valider: "à valider",
  approuvee: "approuvée",
  envoyee: "envoyée",
  refusee: "refusée",
  bloquee: "bloquée à l'envoi",
  remplacee: "remplacée",
  sans_envoi: "sans envoi",
};
/* l'ordre de l'ancien écran : ce qu'une personne doit faire, puis ce qui attend sa validation */
const ORDRE: Partial<Record<StatutDemande, number>> = { a_traiter: 0, bloquee: 0, a_valider: 1, a_preparer: 2, validee: 3 };
/* les Urgences (./Urgences.tsx) : une demande fermée n'y figure plus */
const FERMEES = new Set<StatutDemande>(["envoyee", "refusee", "ignoree"]);
const SUJETS_ESCALADE = new Set(["urgence", "reclamation", "humain"]);
/* les couleurs d'icône de projet de Linear, une par demande */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

const santeDe = (d: Demande): Sante =>
  d.statut === "a_traiter" || d.statut === "bloquee"
    ? "a_traiter"
    : d.statut === "a_valider"
      ? "a_valider"
      : d.statut === "a_preparer"
        ? "preparation"
        : d.statut === "envoyee" || d.statut === "validee"
          ? "repondue"
          : "classee";
const ouverte = (d: Demande) => OUVERTES.includes(santeDe(d));
/* c3_40 : une urgence dont l'astreinte est épuisée et que personne n'a prise passe avant tout */
const gardeInjoignable = (d: Demande) => Boolean(d.urgence && d.astreinte_epuisee_le && !d.urgence_prise_le);
const aEscalader = (d: Demande) => !FERMEES.has(d.statut) && (d.urgence || d.litige || SUJETS_ESCALADE.has(d.sujet ?? "") || d.statut === "a_traiter" || d.statut === "bloquee");
const parUrgence = (a: Demande, b: Demande) =>
  Number(gardeInjoignable(b)) - Number(gardeInjoignable(a)) || Number(b.urgence) - Number(a.urgence) || (ORDRE[a.statut] ?? 9) - (ORDRE[b.statut] ?? 9) || b.recu_le.localeCompare(a.recu_le);
const nomDe = (d: Demande) => d.de_nom || d.adresse_reponse || "Client";
const sujetDe = (m: Monde, d: Demande) => m.sujets.find((s) => s.code === d.sujet)?.libelle ?? null;
const extrait = (t: string | null | undefined) => {
  const x = (t ?? "").replace(/\s+/g, " ").trim();
  return x.length > 90 ? `${x.slice(0, 89)}…` : x;
};
/* la ligne de l'ancien écran : l'objet du courriel, sinon les premiers mots du message */
const titreDe = (m: Monde, d: Demande) => {
  const rec = m.receptions[d.reception_id];
  return (d.canal !== "formulaire" && rec?.sujet) || extrait(rec?.corps) || rec?.sujet || d.objet || "Message sans texte";
};
const reponseDe = (m: Monde, d: Demande): Reponse | undefined => m.reponses.filter((r) => r.demande_id === d.id).sort((a, b) => b.version - a.version)[0];
const pluriel = (n: number, mot: string, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
const duree = (ms: number) => {
  const h = Math.floor(ms / HEURE);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
};
const dateCourte = (iso: string | number | null | undefined) => (iso === null || iso === undefined ? "—" : new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
const minuit = (t: number) => {
  const x = new Date(t);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => somme(v.slice(0, i + 1)));
const lien = (p: Record<string, string | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
  return `${RACINE}/reput?${q.toString()}`;
};
const ficheDe = (id: string) => `${RACINE}/reput?demande=${encodeURIComponent(id)}`;

/* la priorité d'une demande, en barres de Linear : urgente, délai du sujet dépassé (ou litige,
   ou remontée au responsable), à traiter par une personne, dans les délais ; aucune une fois traitée */
function prioriteDe(m: Monde, d: Demande, maintenant: number): { niveau: Niveau; libelle: string } {
  if (!ouverte(d)) return { niveau: 0, libelle: "Traitée" };
  if (gardeInjoignable(d)) return { niveau: 4, libelle: "Urgente, garde injoignable" };
  if (d.urgence) return { niveau: 4, libelle: "Urgente" };
  if (d.litige) return { niveau: 3, libelle: "Client en litige" };
  if (d.escaladee_le) return { niveau: 3, libelle: "Remontée au responsable" };
  const delai = m.sujets.find((s) => s.code === d.sujet)?.delai_heures ?? null;
  if (delai !== null && delai !== undefined && maintenant - Date.parse(d.recu_le) > delai * HEURE) return { niveau: 3, libelle: `Délai de ${delai} h dépassé` };
  if (santeDe(d) === "a_traiter") return { niveau: 2, libelle: "À traiter vous-même" };
  return { niveau: 1, libelle: "Dans les délais" };
}

/* le parcours d'une demande : reçue → réponse préparée → validée → envoyée */
function parcours(d: Demande, rep: Reponse | undefined): Record<Etape, { atteinte: boolean; le: string | null }> {
  const validee = d.statut === "validee" || d.statut === "envoyee";
  return {
    recue: { atteinte: true, le: d.recu_le },
    preparee: { atteinte: !!rep, le: rep ? (d.preparee_le ?? rep.cree_le) : null },
    validee: { atteinte: validee, le: validee ? (d.decidee_le ?? d.envoyee_le) : null },
    envoyee: { atteinte: d.statut === "envoyee", le: d.envoyee_le },
  };
}

/* Modèle 2 (c3_13), repris de l'ancien écran : pourquoi une réponse attend une personne au lieu de partir seule */
function raisonRetenue(rep: Reponse, d: Demande, m: Monde): string | null {
  if (rep.statut !== "a_valider") return null;
  if (d.urgence) return "Message urgent : une personne le relit toujours.";
  if (!rep.couverte) return "L'IA doute : la réponse n'est pas entièrement tirée de votre base.";
  const accord = m.accords.sujets.find((a) => a.sujet === d.sujet);
  if (accord && !accord.autorisable) return "Sujet toujours relu (réclamation, urgence, parler à quelqu'un, hors sujet).";
  if (!accord || accord.statut !== "active") return "Sujet pas encore autorisé d'avance.";
  return null;
}

/* ce qui s'est passé, du plus récent au plus ancien : réception, préparation, décision, envoi */
type Evenement = { cle: string; le: string; d: Demande; quoi: string; fait: boolean };
function evenementsDe(m: Monde, liste: Demande[]): Evenement[] {
  const e: Evenement[] = [];
  for (const d of liste) {
    const rep = reponseDe(m, d);
    e.push({ cle: `${d.id}-r`, le: d.recu_le, d, quoi: `reçue par ${CANAUX[d.canal].toLowerCase()}`, fait: true });
    if (rep) e.push({ cle: `${d.id}-p`, le: d.preparee_le ?? rep.cree_le, d, quoi: rep.version > 1 ? `réponse corrigée (version ${rep.version})` : "réponse préparée", fait: false });
    if (d.escaladee_le) e.push({ cle: `${d.id}-x`, le: d.escaladee_le, d, quoi: "remontée au responsable", fait: false });
    if (d.decidee_le && d.statut === "refusee") e.push({ cle: `${d.id}-d`, le: d.decidee_le, d, quoi: "réponse refusée", fait: true });
    else if (d.decidee_le && d.decidee_le !== d.envoyee_le) e.push({ cle: `${d.id}-d`, le: d.decidee_le, d, quoi: "réponse validée", fait: true });
    if (d.envoyee_le) e.push({ cle: `${d.id}-e`, le: d.envoyee_le, d, quoi: "réponse envoyée", fait: true });
  }
  return e.sort((a, b) => b.le.localeCompare(a.le));
}

/* la santé d'un projet : un disque à 25 % et son signe, 16 px (bleu : en préparation, trois points) */
function IconeSante({ sante }: { sante: Sante }) {
  const t = SANTES[sante].teinte;
  if (t === "gris")
    return (
      <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.6" />
      </svg>
    );
  return (
    <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.25" />
      {t === "vert" ? <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "jaune" ? <path d="M5 10.8 7.4 8.3l1.6 1.4L11.2 6M9 6h2.2v2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "rouge" ? <path d="M5 5.6 7.4 8l1.6-1.4 2.2 3.6M9 10.2h2.2V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "bleu" ? (
        <>
          <circle cx="5" cy="8" r="1.1" fill="currentColor" />
          <circle cx="8" cy="8" r="1.1" fill="currentColor" />
          <circle cx="11" cy="8" r="1.1" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}

/* le statut d'une demande, en hexagone de projet (pastilles, cartes, menus) ; le cercle de
   santé (IconeSante) reste là où Linear met la santé : la ligne d'auteur et la colonne Santé */
const ETAT_PROJET: Record<Sante, EtatProjet> = { a_traiter: "annule", a_valider: "en-cours", preparation: "planifie", repondue: "fait", classee: "planifie" };
function IconeStatut({ sante }: { sante: Sante }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}

/* le losange d'un jalon : contour seul, jaune à 40 % une fois l'étape atteinte (comme CASHD) */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

function IconeCanal({ canal, taille = 16, className, couleur }: { canal: Canal; taille?: number; className?: string; couleur?: string }) {
  const p = { width: taille, height: taille, strokeWidth: taille > 16 ? 1.6 : 1.8, className, style: couleur ? { color: couleur } : undefined, "aria-hidden": true as const };
  if (canal === "whatsapp") return <MessageCircle {...p} />;
  if (canal === "sms") return <Smartphone {...p} />;
  if (canal === "formulaire") return <Globe {...p} />;
  if (canal === "appel") return <PhoneMissed {...p} />;
  return <Mail {...p} />;
}

function IconeDemande({ d, grand }: { d: Demande; grand?: boolean }) {
  const couleur = couleurDe(d.id);
  if (grand)
    return (
      <span className="lin-tuile" style={{ background: `color-mix(in srgb, ${couleur} 18%, transparent)`, color: couleur }}>
        <IconeCanal canal={d.canal} taille={24} />
      </span>
    );
  return <IconeCanal canal={d.canal} className="lin-icone-projet" couleur={couleur} />;
}

/* le graphique de la carte « Progress » (../lin/Lin.tsx, GraphiqueProgres) compte en euros ;
   ici on compte des demandes : la même courbe, mêmes classes, l'axe en nombres entiers */
function GraphiqueDemandes({ etiquettes, series, libelle, hauteur = 160 }: { etiquettes: string[]; series: Serie[]; libelle: string; hauteur?: number }) {
  const degrade = `lin-reput-degrade-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const L = 600;
  const H = hauteur;
  const n = etiquettes.length;
  const max = Math.ceil(Math.max(1, ...series.flatMap((s) => s.valeurs)) / 4) * 4;
  const lisse = (valeurs: number[]) => {
    const pts = valeurs.map((v, i) => [(i / Math.max(1, n - 1)) * L, H - (v / max) * H] as const);
    let ligne = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] ?? p2;
      const c1y = Math.min(H, p1[1] + (p2[1] - p0[1]) / 6),
        c2y = Math.min(H, p2[1] - (p3[1] - p1[1]) / 6);
      ligne += ` C${p1[0] + (p2[0] - p0[0]) / 6},${c1y} ${p2[0] - (p3[0] - p1[0]) / 6},${c2y} ${p2[0]},${p2[1]}`;
    }
    return ligne;
  };
  const couleur = { gris: "var(--lin-graph-gris)", jaune: "var(--lin-graph-jaune)", bleu: "var(--lin-graph-bleu)" };
  return (
    <figure className="v2-va-courbe lin-courbe">
      <div className="v2-va-axe-y" aria-hidden="true" style={{ height: H }}>
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{max * p}</span>
        ))}
      </div>
      <div style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "visible" }} role="img" aria-label={libelle}>
          <defs>
            <linearGradient id={degrade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--lin-graph-bleu)" stopOpacity="0.4" />
              <stop offset="1" stopColor="var(--lin-graph-bleu)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-300, var(--v2-a-400))" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {series
            .filter((s) => s.aire)
            .map((s) => (
              <path key={`${s.cle}-aire`} d={`${lisse(s.valeurs)} L${L},${H} L0,${H} Z`} fill={`url(#${degrade})`} />
            ))}
          {series.map((s) => (
            <path key={s.cle} d={lisse(s.valeurs)} pathLength={1} className="v2-trace" fill="none" stroke={couleur[s.teinte]} strokeWidth={s.aire ? 2 : 1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div className="v2-va-axe">
          {etiquettes.map((e, i) => (
            <span key={i} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/* la carte « Avancement » : la carte « Progress » de Linear. Trois chiffres, la courbe des
   sept derniers jours (cumulée par jour de réception : tout ce qui est plus ancien compte dans
   le premier point), puis la répartition par canal ou par sujet. Valider une réponse fait
   passer sa demande de « En attente » à « Répondues » : les chiffres et les courbes suivent. */
function CarteAvancement({ monde, liste, maintenant, titre = "Avancement", onglets }: { monde: Monde; liste: Demande[]; maintenant: number; titre?: string; onglets?: boolean }) {
  const [onglet, setOnglet] = useState<"canaux" | "sujets">("canaux");
  const aujourdhui = minuit(maintenant);
  const indexDe = (iso: string) => Math.min(JOURS - 1, Math.max(0, JOURS - 1 - Math.round((aujourdhui - minuit(Date.parse(iso))) / JOUR)));
  const parJour = (f: (d: Demande) => boolean) => {
    const v = Array<number>(JOURS).fill(0);
    for (const d of liste.filter(f)) v[indexDe(d.recu_le)]++;
    return v;
  };
  const recues = parJour(() => true);
  const attente = parJour(ouverte);
  const repondues = parJour((d) => santeDe(d) === "repondue");
  /* le mois sur le premier jour seulement : sept dates entières se chevauchent dans une carte de 388 */
  const etiquettes = Array.from({ length: JOURS }, (_, i) => (i === JOURS - 1 ? "Auj." : i === 0 ? dateCourte(aujourdhui - (JOURS - 1) * JOUR) : String(new Date(aujourdhui - (JOURS - 1 - i) * JOUR).getDate())));
  const groupes =
    onglet === "canaux"
      ? [...new Set(liste.map((d) => d.canal))].map((c) => ({ cle: c, libelle: CANAUX[c], n: liste.filter((d) => d.canal === c).length }))
      : [...new Set(liste.map((d) => d.sujet ?? ""))].map((s) => ({ cle: s || "-", libelle: monde.sujets.find((x) => x.code === s)?.libelle ?? "Non classé", n: liste.filter((d) => (d.sujet ?? "") === s).length }));
  return (
    <CarteDroite titre={titre}>
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Reçues
          </dt>
          <dd>{somme(recues)}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
            En attente
          </dt>
          <dd>{somme(attente)}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            Répondues
          </dt>
          <dd>{somme(repondues)}</dd>
        </div>
      </dl>
      <GraphiqueDemandes
        libelle={`Demandes cumulées par jour de réception, jusqu'à aujourd'hui : ${pluriel(somme(recues), "reçue")}, dont ${somme(attente)} en attente et ${pluriel(somme(repondues), "répondue")}`}
        etiquettes={etiquettes}
        series={[
          { cle: "recues", teinte: "gris", valeurs: cumul(recues) },
          { cle: "attente", teinte: "jaune", valeurs: cumul(attente) },
          { cle: "repondues", teinte: "bleu", valeurs: cumul(repondues), aire: true },
        ]}
      />
      {onglets ? (
        <div className="lin-segment-carte" role="tablist">
          {(
            [
              ["canaux", "Canaux"],
              ["sujets", "Sujets"],
            ] as const
          ).map(([cle, lib]) => (
            <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
              {lib}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="lin-repartition">
        {groupes.map((l) => (
          <li key={l.cle}>
            <span>{l.libelle}</span>
            <span>{l.n}</span>
          </li>
        ))}
      </ul>
    </CarteDroite>
  );
}

/* la carte « Activité » : les derniers événements, réception, préparation, décision, envoi */
function CarteActivite({ evenements, tout, voirTout, noms }: { evenements: Evenement[]; tout?: string; voirTout?: () => void; noms?: boolean }) {
  return (
    <CarteDroite
      titre="Activité"
      action={
        tout ? (
          <Link href={tout} className="lin-carte-lien">
            Tout voir
          </Link>
        ) : voirTout ? (
          <button type="button" className="lin-carte-lien" onClick={voirTout}>
            Tout voir
          </button>
        ) : undefined
      }
    >
      {evenements.length ? (
        <ul className="lin-activite">
          {evenements.slice(0, 3).map((e) => (
            <li key={e.cle}>
              <Losange atteint={e.fait} />
              <span>
                {noms ? (
                  <>
                    <b>{nomDe(e.d)}</b> ·{" "}
                  </>
                ) : null}
                {e.quoi} · {dateCourte(e.le)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="lin-activite-vide">Aucune demande pour l&apos;instant.</p>
      )}
    </CarteDroite>
  );
}

type Edition = { id: string; mode: "corriger" | "refuser"; texte: string; motif: string };
type Retour = { id: string; texte: string; teinte: "vert" | "rouge" };

export default function TableauReput() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const maintenant = useMaintenant();
  const [local, setLocal] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<{ monde: Monde; client: Client } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>("priorite");
  const [details, setDetails] = useState(false);
  const [ongletDetails, setOngletDetails] = useState<"canaux" | "sujets" | "semaine">("canaux");
  const [filtre, setFiltre] = useState("");
  const [ongletFiche, setOngletFiche] = useState<"apercu" | "historique">("apercu");
  const [edition, setEdition] = useState<Edition | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<Retour | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const client = await monClient();
      if (!client) throw new Error("Aucun compte rattaché à cette session.");
      setReel({ monde: await chargerMonde(client), client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["reput_demandes", "reput_reponses", "reput_connaissances"], source === "reelle", () => void charger());

  const demandeOuverte = params.get("demande");
  const vue = params.get("vue");
  const onglet = (params.get("sante") as Sante | null) ?? "tous";
  const etapeFiltre = params.get("etape") as Etape | null;
  const canalFiltre = params.get("canal") as Canal | null;
  const sujetFiltre = params.get("sujet");

  /* Échap referme une demande ouverte */
  useEffect(() => {
    if (!demandeOuverte) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.key === "Escape" && !(cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) routeur.push(LISTE, { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [demandeOuverte, routeur]);

  const vide = (texte: string) => (
    <div className="lin">
      <h1 className="v2-sr">Demandes clients</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Demandes clients</span>
      </header>
      <p className="lin-vide">{texte}</p>
    </div>
  );
  if (erreur) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  /* 27/10 — le monde d'exemple est daté à l'heure du visiteur : rien avant le montage (voir ../horloge.ts) */
  const monde = source === "exemple" ? local : (reel?.monde ?? null);
  if (!monde || maintenant === null) return vide("Lecture des demandes…");
  const m: Monde = monde;
  const maint: number = maintenant;

  const client = source === "reelle" ? (reel?.client ?? null) : null;
  const role = source === "exemple" ? "valideur" : (client?.role ?? "lecteur");
  const decideur = role === "gerant" || role === "admin" || role === "valideur";
  const demandes = m.demandes;
  const exporter = () => telecharger(`demandes-clients-${new Date(maint).toISOString().slice(0, 10)}.csv`, csvDemandes(m));
  const boutonExporter = (
    <button type="button" className="v2-btn v2-btn--petit" onClick={exporter}>
      <Download width={14} height={14} aria-hidden="true" />
      <span>Exporter</span>
    </button>
  );

  /* ——— les décisions : les portes de l'ancien écran (reput_decider, reput_corriger), ou l'exemple en mémoire ——— */
  const agir = async (d: Demande, rep: Reponse, quoi: "valider" | "refuser" | "corriger", texte = "", motif = "") => {
    setEnvoi(true);
    setRetour(null);
    try {
      if (source === "reelle") {
        if (quoi === "corriger") await corriger(rep.id, texte);
        else await decider(rep.id, quoi, quoi === "refuser" ? motif : undefined);
        await charger();
      } else {
        setLocal((x) => {
          const quand = new Date().toISOString();
          const statutRep: StatutReponse = quoi === "valider" ? "envoyee" : quoi === "refuser" ? "refusee" : "remplacee";
          let reponses = x.reponses.map((r) => (r.id === rep.id ? { ...r, statut: statutRep } : r));
          if (quoi === "corriger")
            reponses = [{ ...rep, id: crypto.randomUUID(), version: rep.version + 1, corps: texte, type_action: "reput.transferer", redigee_par: "vous", cree_le: quand, statut: "a_valider" }, ...reponses];
          const statut: StatutDemande = quoi === "valider" ? "envoyee" : quoi === "refuser" ? "refusee" : "a_valider";
          const liste = x.demandes.map((y) => (y.id === d.id ? { ...y, statut, decidee_le: quand, envoyee_le: quoi === "valider" ? quand : y.envoyee_le } : y));
          return { ...x, reponses, demandes: liste };
        });
      }
      setRetour({
        id: d.id,
        teinte: "vert",
        texte:
          quoi === "valider"
            ? "La réponse est validée : elle part par le canal du client, sous votre signature."
            : quoi === "refuser"
              ? "La réponse est refusée : rien ne part. La demande reste dans l'historique."
              : "Votre correction remplace la réponse ; validez-la pour l'envoyer.",
      });
      setEdition(null);
    } catch (e) {
      setRetour({ id: d.id, teinte: "rouge", texte: e instanceof Error ? e.message : "La base n'a pas répondu." });
    } finally {
      setEnvoi(false);
    }
  };

  const ordonnes = demandes.slice().sort((a, b) => {
    if (tri === "recente") return b.recu_le.localeCompare(a.recu_le);
    if (tri === "attente") return Number(ouverte(b)) - Number(ouverte(a)) || a.recu_le.localeCompare(b.recu_le);
    if (tri === "nom") return nomDe(a).localeCompare(nomDe(b), "fr");
    return parUrgence(a, b);
  });
  const sujetsPresents = [...new Set(demandes.map((d) => d.sujet ?? ""))];
  const canauxPresents = [...new Set(demandes.map((d) => d.canal))];
  const ouvertes = demandes.filter(ouverte).sort(parUrgence);

  /* ——— une demande ouverte : la page d'un projet ——— */
  if (demandeOuverte) {
    const d = demandes.find((x) => x.id === demandeOuverte);
    if (!d) return vide("Cette demande n'est plus dans la liste.");
    const s = santeDe(d);
    const rec = m.receptions[d.reception_id];
    const versions = m.reponses.filter((r) => r.demande_id === d.id).sort((a, b) => b.version - a.version);
    const rep: Reponse | undefined = versions[0];
    const sources = (rep?.sources ?? []).map((id) => m.fiches.find((f) => f.id === id)).filter((f) => f !== undefined);
    const sujet = sujetDe(m, d);
    const prio = prioriteDe(m, d, maint);
    const etapes = parcours(d, rep);
    const aValider = !!rep && rep.statut === "a_valider" && d.statut === "a_valider" && decideur;
    const corrigeable = !!rep && (rep.statut === "a_valider" || rep.statut === "sans_envoi") && decideur;
    const enEdition = edition && edition.id === d.id ? edition : null;
    const retourIci = retour && retour.id === d.id ? retour : null;
    const retenue = rep ? raisonRetenue(rep, d, m) : null;
    const delai = m.sujets.find((x) => x.code === d.sujet)?.delai_heures ?? null;
    const memeClient = demandes.filter((x) => x.id === d.id || (d.de_empreinte && x.de_empreinte === d.de_empreinte) || (d.adresse_reponse && x.adresse_reponse === d.adresse_reponse));
    const precedentes = memeClient.filter((x) => x.id !== d.id);
    const adresse = d.adresse_reponse ?? rec?.de_adresse ?? null;
    const courriel = adresse && /@/.test(adresse) ? adresse : null;
    const pieces = Array.isArray(rec?.pieces) ? rec.pieces.length : 0;
    const libStatut = libelleStatut(d, m);
    const listeStatut = lien({ vue: "demandes", sante: s });

    const actionsStatut: Option[] = [
      ...(aValider && rep ? [{ cle: "valider", libelle: "Valider et envoyer", icone: <CheckCheck width={16} height={16} />, action: () => void agir(d, rep, "valider") }] : []),
      ...(corrigeable && rep
        ? [{ cle: "corriger", libelle: "Corriger la réponse", icone: <PenLine width={16} height={16} />, action: () => setEdition({ id: d.id, mode: "corriger", texte: rep.corps, motif: "" }) }]
        : []),
      ...(aValider ? [{ cle: "refuser", libelle: "Refuser la réponse…", icone: <X width={16} height={16} />, action: () => setEdition({ id: d.id, mode: "refuser", texte: "", motif: "" }) }] : []),
      { cle: "liste", libelle: `Demandes « ${SANTES[s].libelle} »`, icone: <IconeStatut sante={s} />, href: listeStatut },
    ];
    const optionsPriorite: Option[] = [
      { cle: "urgences", libelle: "Urgences et escalade", icone: <IconePriorite niveau={4} titre="Urgente" />, href: `${RACINE}/reput/urgences` },
      { cle: "delais", libelle: "Délais par sujet", meta: delai !== null && delai !== undefined ? `${delai} h pour ce sujet` : undefined, icone: <IconeCalendrier />, href: `${RACINE}/reput/sujets` },
    ];
    const optionsSujet: Option[] = [
      ...(d.sujet
        ? [{ cle: "meme", libelle: `Demandes « ${sujet ?? d.sujet} »`, meta: String(demandes.filter((x) => x.sujet === d.sujet).length), icone: <IconeDiese />, href: lien({ vue: "demandes", sujet: d.sujet }) }]
        : []),
      { cle: "sujets", libelle: "Sujets autorisés", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/sujets` },
    ];
    const optionsCanal: Option[] = [
      {
        cle: "canal",
        libelle: `Demandes par ${CANAUX[d.canal].toLowerCase()}`,
        meta: String(demandes.filter((x) => x.canal === d.canal).length),
        icone: <IconeCanal canal={d.canal} />,
        href: lien({ vue: "demandes", canal: d.canal }),
      },
      ...(courriel ? [{ cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => void window.open(`mailto:${courriel}`) }] : []),
      ...(adresse ? [{ cle: "copier", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => void navigator.clipboard?.writeText(adresse) }] : []),
    ];
    const optionsClient: Option[] = memeClient.map((x) => ({ cle: x.id, libelle: titreDe(m, x), meta: dateCourte(x.recu_le), icone: <IconeStatut sante={santeDe(x)} />, coche: x.id === d.id, href: ficheDe(x.id) }));
    const optionsBase: Option[] = [
      ...sources.map((f) => ({ cle: f.id, libelle: f.titre, meta: f.source, icone: <IconeDocument />, href: `${RACINE}/reput/base` })),
      { cle: "base", libelle: "Base de connaissances", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/base` },
    ];
    const optionsEtape = (e: Etape): Option[] => [
      { cle: "historique", libelle: "Voir l'historique", icone: <MessageSquare width={16} height={16} />, action: () => setOngletFiche("historique") },
      { cle: "liste", libelle: "Demandes à cette étape", icone: <Losange atteint />, href: lien({ vue: "demandes", etape: e }) },
    ];
    const libBase = !rep ? "Aucune réponse" : rep.couverte ? "Tirée de votre base" : "Hors de votre base";
    const evenements = evenementsDe(m, [d]);

    return (
      <div className="lin">
        <h1 className="v2-sr">Demandes clients</h1>
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={LISTE} className="lin-fil-equipe">
              Demandes
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici lin-fil-projet" aria-current="page">
              <IconeDemande d={d} />
              {nomDe(d)}
            </span>
          </nav>
          <div className="lin-tete-droite">
            {adresse ? (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier l'adresse du client" title="Copier l'adresse du client" onClick={() => navigator.clipboard?.writeText(adresse)}>
                <Copy width={14} height={14} aria-hidden="true" />
              </button>
            ) : null}
            {aEscalader(d) ? (
              <Link href={`${RACINE}/reput/urgences`} className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Ouvrir dans Urgences et escalade" title="Ouvrir dans Urgences et escalade">
                <ExternalLink width={14} height={14} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues de la demande">
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "apercu" ? "" : undefined} aria-pressed={ongletFiche === "apercu"} onClick={() => setOngletFiche("apercu")}>
              Aperçu
            </button>
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "historique" ? "" : undefined} aria-pressed={ongletFiche === "historique"} onClick={() => setOngletFiche("historique")}>
              Historique
            </button>
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            {ongletFiche === "apercu" ? (
              <>
                <IconeDemande d={d} grand />
                <h1 className="lin-projet-h1">{nomDe(d)}</h1>
                <p className="lin-projet-resume">{titreDe(m, d)}</p>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Propriétés</span>
                  <MenuOptions
                    raccourci="s"
                    titre="Statut…"
                    teinte={SANTES[s].teinte}
                    declencheur={
                      <>
                        <IconeStatut sante={s} />
                        {libStatut}
                      </>
                    }
                    options={actionsStatut}
                    largeur={300}
                  />
                  <MenuOptions
                    raccourci="p"
                    titre="Priorité…"
                    declencheur={
                      <>
                        <IconePriorite niveau={prio.niveau} titre={prio.libelle} />
                        {prio.libelle}
                      </>
                    }
                    options={optionsPriorite}
                    largeur={300}
                  />
                  <MenuOptions
                    raccourci="t"
                    titre="Sujet…"
                    declencheur={
                      <>
                        <IconeDiese />
                        {sujet ?? "Non classé"}
                      </>
                    }
                    options={optionsSujet}
                  />
                  <MenuOptions
                    titre="Reçue…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={prio.niveau >= 3} />
                        {dateCourte(d.recu_le)}
                      </>
                    }
                    options={optionsPriorite}
                  />
                </div>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Contact</span>
                  {adresse ? (
                    <MenuOptions
                      titre="Contact…"
                      declencheur={
                        <>
                          <IconeCanal canal={d.canal} />
                          {adresse}
                        </>
                      }
                      options={optionsCanal}
                    />
                  ) : (
                    <span className="lin-puce lin-puce--vide">
                      <IconeCanal canal={d.canal} />
                      Aucune adresse de réponse
                    </span>
                  )}
                  {precedentes.length ? (
                    <MenuOptions
                      titre="Demandes de ce client…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          Client connu · {pluriel(precedentes.length, "autre demande", "autres demandes")}
                        </>
                      }
                      options={optionsClient}
                      largeur={340}
                    />
                  ) : null}
                </div>

                <details className="lin-maj" open aria-label="La réponse préparée">
                  <summary className="lin-maj-tete">
                    <span className="lin-maj-titre">
                      {rep ? `Réponse préparée${rep.version > 1 ? ` · version ${rep.version}` : ""}` : "Réponse"}
                      <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                      </svg>
                    </span>
                    {rep ? (
                      <button
                        type="button"
                        className="lin-maj-lien"
                        onClick={(e) => {
                          e.preventDefault();
                          void navigator.clipboard?.writeText(rep.corps);
                        }}
                      >
                        <Copy width={14} height={14} aria-hidden="true" /> Copier
                      </button>
                    ) : null}
                  </summary>
                  <p className="lin-maj-auteur">
                    <IconeSante sante={s} />
                    <span data-teinte={SANTES[s].teinte}>{libStatut}</span>
                    <span className="lin-avatar-auteur" aria-hidden="true">
                      <MessageSquareText width={11} height={11} />
                    </span>
                    <span className="lin-maj-gris">{rep?.redigee_par ? "Corrigée par une personne" : "REPUT"}</span>
                    <span className="lin-maj-gris">{dateCourte(rep?.cree_le ?? d.recu_le)}</span>
                  </p>
                  {!rep ? (
                    <p className="lin-maj-texte lin-maj-gris">
                      {d.motif ?? (d.statut === "a_preparer" ? "La réponse est prête dans la minute qui suit la réception." : "Aucune réponse préparée : cette demande est à traiter par une personne.")}
                    </p>
                  ) : enEdition?.mode === "corriger" ? (
                    <textarea className="lin-reput-champ" rows={10} aria-label="Votre version de la réponse" value={enEdition.texte} onChange={(e) => setEdition({ ...enEdition, texte: e.target.value })} />
                  ) : (
                    <p className="lin-maj-texte lin-reput-corps">{rep.corps}</p>
                  )}
                  {rep ? (
                    <dl className="lin-maj-citation">
                      {rep.objet ? (
                        <div>
                          <dt>Objet</dt>
                          <dd>{rep.objet}</dd>
                        </div>
                      ) : null}
                      <div>
                        <dt>Base</dt>
                        <dd>{rep.couverte ? "Tirée de votre base" : "Hors de votre base : à compléter"}</dd>
                      </div>
                      <div>
                        <dt>Sources</dt>
                        <dd>{sources.length ? sources.map((f) => f.titre).join(" · ") : "Aucune fiche citée"}</dd>
                      </div>
                      {rep.raison && !rep.couverte ? (
                        <div>
                          <dt>Raison</dt>
                          <dd>{rep.raison}</dd>
                        </div>
                      ) : null}
                      {retenue ? (
                        <div>
                          <dt>Retenue</dt>
                          <dd>{retenue}</dd>
                        </div>
                      ) : null}
                      {d.motif ? (
                        <div>
                          <dt>Motif</dt>
                          <dd>{d.motif}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                  {enEdition?.mode === "refuser" ? (
                    <input
                      className="lin-reput-champ"
                      autoFocus
                      aria-label="Pourquoi refuser ? (obligatoire)"
                      placeholder="Pourquoi refuser ? Par exemple : client en litige, je l'appelle moi-même"
                      value={enEdition.motif}
                      onChange={(e) => setEdition({ ...enEdition, motif: e.target.value })}
                    />
                  ) : null}
                  {enEdition && rep ? (
                    <div className="lin-reput-actions">
                      {enEdition.mode === "corriger" ? (
                        <button type="button" className="v2-btn v2-btn--petit" data-actif="" disabled={envoi || !enEdition.texte.trim()} onClick={() => void agir(d, rep, "corriger", enEdition.texte)}>
                          Enregistrer la correction
                        </button>
                      ) : (
                        <button type="button" className="v2-btn v2-btn--petit" data-actif="" disabled={envoi || !enEdition.motif.trim()} onClick={() => void agir(d, rep, "refuser", "", enEdition.motif)}>
                          Refuser la réponse
                        </button>
                      )}
                      <button type="button" className="v2-btn v2-btn--petit" onClick={() => setEdition(null)}>
                        Annuler
                      </button>
                    </div>
                  ) : null}
                  {retourIci ? (
                    <p className="lin-reput-retour" data-teinte={retourIci.teinte} role={retourIci.teinte === "rouge" ? "alert" : "status"}>
                      {retourIci.texte}
                    </p>
                  ) : null}
                  <footer className="lin-maj-pied">
                    {corrigeable && rep ? (
                      <button
                        type="button"
                        className="lin-maj-pied-btn"
                        aria-label="Corriger la réponse"
                        title="Corriger la réponse"
                        disabled={envoi}
                        onClick={() => setEdition({ id: d.id, mode: "corriger", texte: rep.corps, motif: "" })}
                      >
                        <PenLine width={16} height={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <button type="button" className="lin-maj-pied-btn" aria-label="Voir l'historique" title="Voir l'historique" onClick={() => setOngletFiche("historique")}>
                        <MessageSquare width={16} height={16} aria-hidden="true" />
                      </button>
                    )}
                    {aValider && rep ? (
                      <>
                        <button type="button" className="lin-maj-pied-rond" aria-label="Valider et envoyer" title="Valider et envoyer" disabled={envoi} onClick={() => void agir(d, rep, "valider")}>
                          <CheckCheck width={16} height={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="lin-maj-pied-rond"
                          aria-label="Refuser la réponse"
                          title="Refuser la réponse"
                          disabled={envoi}
                          onClick={() => setEdition({ id: d.id, mode: "refuser", texte: "", motif: "" })}
                        >
                          <X width={16} height={16} aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                  </footer>
                </details>

                <h2 className="lin-projet-h2">Le message reçu</h2>
                <p className="lin-meta">
                  {CANAUX[d.canal]}
                  {rec?.de_adresse ? ` · ${rec.de_adresse}` : ""} · {dateHeure(d.recu_le)}
                  {pieces ? ` · ${pluriel(pieces, "pièce jointe", "pièces jointes")}` : ""}
                  {d.langue && d.langue !== "fr" ? ` · langue : ${d.langue}` : ""}
                </p>
                {rec?.sujet ? <p className="lin-maj-texte lin-reput-message">{rec.sujet}</p> : null}
                <p className="lin-maj-texte lin-reput-corps lin-reput-message">{rec?.corps || "(message sans texte)"}</p>

                <h2 className="lin-projet-h2">Parcours</h2>
                <ul className="lin-projet-liste">
                  {ETAPES.map((e) => (
                    <li key={e.cle}>
                      <Losange atteint={etapes[e.cle].atteinte} />
                      <span>{e.libelle}</span>
                      <span className="lin-meta">{etapes[e.cle].atteinte ? `atteinte · ${dateCourte(etapes[e.cle].le)}` : "pas encore"}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1 className="lin-projet-h1" style={{ marginTop: 0 }}>
                  Historique
                </h1>
                {versions.length ? (
                  <>
                    <h2 className="lin-projet-h2">Versions de la réponse</h2>
                    <ul className="lin-projet-liste">
                      {versions.map((r) => (
                        <li key={r.id}>
                          <Losange atteint={r.statut === "envoyee"} />
                          <span>
                            Version {r.version}
                            {r.redigee_par ? " · corrigée par une personne" : ""}
                          </span>
                          <span className="lin-meta">
                            {ETATS_REPONSE[r.statut]} · {dateCourte(r.cree_le)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                <h2 className="lin-projet-h2">Événements</h2>
                <ul className="lin-projet-liste">
                  {evenements.map((e) => (
                    <li key={e.cle}>
                      <Losange atteint={e.fait} />
                      <span>{e.quoi.charAt(0).toUpperCase() + e.quoi.slice(1)}</span>
                      <span className="lin-meta">{dateHeure(e.le)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>

          <aside className="lin-cartes-droite" aria-label="Propriétés de la demande">
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Statut</dt>
                  <dd data-teinte={SANTES[s].teinte}>
                    <MenuOptions
                      plat
                      titre="Statut…"
                      declencheur={
                        <>
                          <IconeStatut sante={s} />
                          {libStatut}
                        </>
                      }
                      options={actionsStatut}
                      largeur={300}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Priorité</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Priorité…"
                      declencheur={
                        <>
                          <IconePriorite niveau={prio.niveau} titre={prio.libelle} />
                          {prio.libelle}
                        </>
                      }
                      options={optionsPriorite}
                      largeur={300}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Canal</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Canal…"
                      declencheur={
                        <>
                          <IconeCanal canal={d.canal} />
                          {CANAUX[d.canal]}
                        </>
                      }
                      options={optionsCanal}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Reçue</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Délais…"
                      declencheur={
                        <>
                          <IconeCalendrier passe={prio.niveau >= 3} />
                          {dateHeure(d.recu_le)}
                        </>
                      }
                      options={optionsPriorite}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Sujet</dt>
                  <dd className={sujet ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Sujet…"
                      declencheur={
                        <>
                          <IconeDiese />
                          {sujet ?? "Non classé"}
                        </>
                      }
                      options={optionsSujet}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Réponse</dt>
                  <dd className={rep ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Base de connaissances…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {libBase}
                          {sources.length ? ` · ${pluriel(sources.length, "fiche")}` : ""}
                        </>
                      }
                      options={optionsBase}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Client</dt>
                  <dd className={precedentes.length ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Demandes de ce client…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {precedentes.length ? `Connu · ${pluriel(memeClient.length, "demande")}` : "Premier message"}
                        </>
                      }
                      options={optionsClient}
                      largeur={340}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Parcours">
              <ul className="lin-jalons">
                {ETAPES.map((e) => (
                  <li key={e.cle}>
                    <Losange atteint={etapes[e.cle].atteinte} />
                    <span className="lin-jalon-nom">{e.libelle}</span>
                    <span className="lin-meta">{etapes[e.cle].atteinte ? dateCourte(etapes[e.cle].le) : "—"}</span>
                    <MenuActions titre={`${e.libelle}…`} options={optionsEtape(e.cle)} />
                  </li>
                ))}
              </ul>
            </CarteDroite>

            <CarteAvancement monde={m} liste={memeClient} maintenant={maint} titre="Ce client" />

            <CarteActivite evenements={evenements} voirTout={() => setOngletFiche("historique")} />
          </aside>
        </div>
      </div>
    );
  }

  /* ——— le tableau de bord : la page d'un projet, REPUT étant le projet ———
     Les mêmes briques que le tableau de bord de CASHD (titre, propriétés,
     « Latest update », sections, cartes de droite, carte Progress). */
  if (vue !== "demandes") {
    const aValider = demandes.filter((d) => d.statut === "a_valider").sort(parUrgence);
    const aTraiter = demandes.filter((d) => santeDe(d) === "a_traiter").sort(parUrgence);
    const repondues = demandes.filter((d) => santeDe(d) === "repondue");
    const sante: Sante = aTraiter.length ? "a_traiter" : aValider.length ? "a_valider" : ouvertes.length ? "preparation" : "repondue";
    const plusAncienne = ouvertes.slice().sort((a, b) => a.recu_le.localeCompare(b.recu_le));
    const enRetard = ouvertes.some((d) => prioriteDe(m, d, maint).niveau >= 3);
    const escalade = demandes.filter(aEscalader).sort(parUrgence);
    const ind = m.indicateurs;
    const fichesValidees = m.fiches.filter((f) => f.statut === "validee").length;
    const brouillons = m.fiches.filter((f) => f.statut === "brouillon").length;
    const accordsActifs = m.accords.sujets.filter((a) => a.statut === "active");
    const accordsAValider = m.accords.sujets.filter((a) => a.statut === "a_valider");
    const autorisables = m.accords.sujets.filter((a) => a.autorisable && a.actif).length;
    const parCanal = canauxPresents.map((c) => ({ c, n: demandes.filter((d) => d.canal === c).length })).sort((a, b) => b.n - a.n);
    const parSujet = sujetsPresents.map((x) => ({ x, n: demandes.filter((d) => (d.sujet ?? "") === x).length })).sort((a, b) => b.n - a.n);
    const maxCanal = Math.max(1, ...parCanal.map((x) => x.n));
    const maxSujet = Math.max(1, ...parSujet.map((x) => x.n));
    const reponsesDe = new Map(demandes.map((d) => [d.id, reponseDe(m, d)]));
    const parEtape = ETAPES.map((e) => ({ e, n: demandes.filter((d) => parcours(d, reponsesDe.get(d.id))[e.cle].atteinte).length }));
    const aFaire = [...aTraiter, ...aValider].sort(parUrgence);
    const dernierePreparee = aValider
      .map((d) => reponsesDe.get(d.id)?.cree_le ?? d.preparee_le)
      .filter((x): x is string => !!x)
      .sort()
      .reverse()[0];
    const optionsSante = (meta: (n: number) => string): Option[] =>
      (Object.keys(SANTES) as Sante[]).map((x) => {
        const n = demandes.filter((d) => santeDe(d) === x).length;
        return { cle: x, libelle: SANTES[x].libelle, meta: meta(n), icone: <IconeStatut sante={x} />, coche: x === sante, href: lien({ vue: "demandes", sante: x }) };
      });
    const optionsAValider: Option[] = [
      ...aValider.map((d): Option => ({ cle: d.id, libelle: nomDe(d), meta: sujetDe(m, d) ?? CANAUX[d.canal], icone: <Losange atteint />, href: ficheDe(d.id) })),
      { cle: "tout", libelle: "Toutes les réponses à valider", icone: <ExternalLink width={16} height={16} />, href: lien({ vue: "demandes", sante: "a_valider" }) },
    ];
    const optionsAttente: Option[] = plusAncienne.map((d) => ({ cle: d.id, libelle: nomDe(d), meta: `attend depuis ${duree(maint - Date.parse(d.recu_le))}`, icone: <IconeDemande d={d} />, href: ficheDe(d.id) }));

    return (
      <div className="lin">
        <h1 className="v2-sr">Demandes clients</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Tableau de bord</span>
          <div className="lin-tete-droite">{boutonExporter}</div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues de REPUT">
            <span className="v2-btn v2-btn--petit" data-actif="" aria-current="page">
              Aperçu
            </span>
            <Link href={LISTE} className="v2-btn v2-btn--petit">
              Demandes
            </Link>
            <Link href={lien({ vue: "demandes", sante: "a_valider" })} className="v2-btn v2-btn--petit">
              À valider
            </Link>
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            <span className="lin-tuile" style={{ background: "color-mix(in srgb, #26b5ce 18%, transparent)", color: "#26b5ce" }}>
              <MessageSquareText width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2 className="lin-projet-h1">Demandes clients</h2>
            <p className="lin-projet-resume">
              {demandes.length
                ? `${pluriel(demandes.length, "demande reçue", "demandes reçues")} : ${ouvertes.length} en attente, ${pluriel(repondues.length, "répondue")}${aValider.length ? `, dont ${pluriel(aValider.length, "réponse prête", "réponses prêtes")} à valider` : ""}.`
                : "Aucune demande reçue pour l'instant."}
            </p>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Propriétés</span>
              <MenuOptions
                raccourci="s"
                titre="Voir les demandes…"
                teinte={SANTES[sante].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={sante} />
                    {SANTES[sante].libelle}
                  </>
                }
                options={optionsSante((n) => pluriel(n, "demande"))}
                largeur={280}
              />
              <MenuOptions
                raccourci="v"
                titre="Réponses à valider…"
                declencheur={
                  <>
                    <Losange atteint={aValider.length > 0} />
                    {aValider.length} à valider
                  </>
                }
                options={optionsAValider}
                largeur={360}
              />
              <MenuOptions
                raccourci="e"
                titre="Demandes en attente…"
                declencheur={
                  <>
                    <IconeCalendrier passe={enRetard} />
                    {plusAncienne[0] ? `En attente depuis le ${dateCourte(plusAncienne[0].recu_le)}` : "Rien en attente"}
                  </>
                }
                options={optionsAttente}
                largeur={340}
              />
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Canaux</span>
              {parCanal.map(({ c, n }) => (
                <MenuOptions
                  key={c}
                  titre={`${CANAUX[c]}…`}
                  declencheur={
                    <>
                      <IconeCanal canal={c} />
                      {CANAUX[c]} · {n}
                    </>
                  }
                  options={[
                    { cle: "liste", libelle: `Voir les ${pluriel(n, "demande")}`, icone: <IconeCanal canal={c} />, href: lien({ vue: "demandes", canal: c }) },
                    ...demandes
                      .filter((d) => d.canal === c)
                      .sort((a, b) => b.recu_le.localeCompare(a.recu_le))
                      .slice(0, 5)
                      .map((d): Option => ({ cle: d.id, libelle: nomDe(d), meta: dateCourte(d.recu_le), icone: <IconeStatut sante={santeDe(d)} />, href: ficheDe(d.id) })),
                  ]}
                  largeur={300}
                />
              ))}
              {parCanal.length ? null : <span className="lin-puce lin-puce--vide">Aucun message reçu</span>}
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">7 jours</span>
              <MenuOptions
                titre="Les sept derniers jours…"
                declencheur={
                  <>
                    <IconeJauge />
                    {pluriel(ind.recues, "reçue")} · {pluriel(ind.repondues, "répondue")}
                  </>
                }
                options={[
                  { cle: "seules", libelle: "Parties sans intervention", meta: String(ind.parties_seules), icone: <IconeStatutProjet etat="fait" />, href: `${RACINE}/reput/sujets` },
                  { cle: "hors", libelle: "Hors de votre base", meta: String(ind.hors_base), icone: <IconeDocument />, href: `${RACINE}/reput/base` },
                  {
                    cle: "delai",
                    libelle: "Première réponse (médiane)",
                    meta: ind.delai_median_minutes !== null ? `${Math.round(ind.delai_median_minutes)} min` : "—",
                    icone: <IconeCalendrier />,
                    href: lien({ vue: "demandes", sante: "repondue" }),
                  },
                ]}
                largeur={320}
              />
            </div>

            <details className="lin-maj" open aria-label="À traiter aujourd'hui">
              <summary className="lin-maj-tete">
                <span className="lin-maj-titre">
                  À traiter aujourd&apos;hui
                  <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                  </svg>
                </span>
                <Link href={lien({ vue: "demandes", sante: "a_valider" })} className="lin-maj-lien">
                  <ExternalLink width={14} height={14} aria-hidden="true" /> Valider
                </Link>
              </summary>
              <p className="lin-maj-auteur">
                <IconeSante sante={aTraiter.length ? "a_traiter" : aValider.length ? "a_valider" : "repondue"} />
                <span data-teinte={aTraiter.length ? "rouge" : aValider.length ? "jaune" : "vert"}>
                  {aValider.length ? `${pluriel(aValider.length, "réponse prête", "réponses prêtes")}` : "Rien à valider"}
                  {aTraiter.length ? ` · ${aTraiter.length} à traiter vous-même` : ""}
                </span>
                <span className="lin-avatar-auteur" aria-hidden="true">
                  <MessageSquareText width={11} height={11} />
                </span>
                <span className="lin-maj-gris">REPUT</span>
                {dernierePreparee ? <span className="lin-maj-gris">{dateCourte(dernierePreparee)}</span> : null}
              </p>
              <p className="lin-maj-texte">
                Chaque message reçoit dans la minute une réponse préparée à partir de votre base de connaissances. Rien ne part sans votre accord, sauf sur les sujets autorisés d&apos;avance.
              </p>
              {aFaire.length ? (
                <dl className="lin-maj-citation">
                  {aFaire.slice(0, 5).map((d) => (
                    <div key={d.id}>
                      <dt>{nomDe(d)}</dt>
                      <dd>
                        <Link href={ficheDe(d.id)}>
                          {SANTES[santeDe(d)].libelle} · {sujetDe(m, d) ?? CANAUX[d.canal]} · {titreDe(m, d)}
                        </Link>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <footer className="lin-maj-pied">
                <Link href={LISTE} className="lin-maj-pied-btn" aria-label="Voir les demandes" title="Voir les demandes">
                  <MessageSquare width={16} height={16} aria-hidden="true" />
                </Link>
                <Link href={aValider[0] ? ficheDe(aValider[0].id) : lien({ vue: "demandes", sante: "a_valider" })} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                  <CheckCheck width={16} height={16} aria-hidden="true" />
                </Link>
              </footer>
            </details>

            <h3 className="lin-projet-h2">Demandes par canal</h3>
            <ul className="lin-projet-liste">
              {parCanal.map(({ c, n }) => (
                <li key={c}>
                  <span className="lin-tranche-nom">{CANAUX[c]}</span>
                  <span className="lin-tranche-barre" aria-hidden="true">
                    <span style={{ width: `${(n / maxCanal) * 100}%` }} />
                  </span>
                  <span className="lin-meta">{n}</span>
                </li>
              ))}
            </ul>

            <h3 className="lin-projet-h2">Demandes par sujet</h3>
            <ul className="lin-projet-liste">
              {parSujet.map(({ x, n }) => (
                <li key={x || "-"}>
                  <span className="lin-tranche-nom">{m.sujets.find((y) => y.code === x)?.libelle ?? "Non classé"}</span>
                  <span className="lin-tranche-barre" aria-hidden="true">
                    <span style={{ width: `${(n / maxSujet) * 100}%` }} />
                  </span>
                  <span className="lin-meta">{n}</span>
                </li>
              ))}
            </ul>

            <h3 className="lin-projet-h2">Les plus urgentes</h3>
            {ouvertes.length ? (
              <ul className="lin-projet-liste">
                {ouvertes.slice(0, 5).map((d) => {
                  const p = prioriteDe(m, d, maint);
                  return (
                    <li key={d.id}>
                      <Link href={ficheDe(d.id)} className="lin-projet-lien">
                        <IconeDemande d={d} />
                        <span>
                          {nomDe(d)} · {titreDe(m, d)}
                        </span>
                        <IconePriorite niveau={p.niveau} titre={p.libelle} />
                        <span className="lin-meta">{duree(maint - Date.parse(d.recu_le))}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="lin-maj-texte lin-maj-gris">Rien en attente.</p>
            )}
            <Link href={LISTE} className="lin-voir-tout">
              Voir toutes les demandes <ArrowRight width={14} height={14} aria-hidden="true" />
            </Link>
          </article>

          <aside className="lin-cartes-droite" aria-label="Les chiffres">
            {/* l'ordre des cartes de Linear : Properties, Milestones, Progress, Activity */}
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Demandes</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Voir les demandes…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {demandes.length}
                        </>
                      }
                      options={optionsSante((n) => String(n))}
                    />
                  </dd>
                </div>
                <div>
                  <dt>À valider</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Réponses à valider…"
                      declencheur={
                        <>
                          <Losange atteint={aValider.length > 0} />
                          {aValider.length}
                        </>
                      }
                      options={optionsAValider}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Urgences</dt>
                  <dd className={escalade.length ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Urgences et escalade…"
                      declencheur={
                        <>
                          <IconePriorite niveau={escalade.length ? 4 : 0} titre={escalade.length ? "Urgences" : "Aucune urgence"} />
                          {escalade.length}
                        </>
                      }
                      options={[
                        ...escalade.map((d): Option => {
                          const p = prioriteDe(m, d, maint);
                          return { cle: d.id, libelle: nomDe(d), meta: p.libelle, icone: <IconePriorite niveau={p.niveau} titre={p.libelle} />, href: ficheDe(d.id) };
                        }),
                        { cle: "urgences", libelle: "Urgences et escalade", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/urgences` },
                      ]}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Base</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Base de connaissances…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {pluriel(fichesValidees, "fiche validée", "fiches validées")}
                        </>
                      }
                      options={[
                        { cle: "base", libelle: "Base de connaissances", meta: brouillons ? pluriel(brouillons, "brouillon") : undefined, icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/base` },
                        { cle: "hors", libelle: "Réponses hors de votre base", meta: `${ind.hors_base} sur 7 jours`, icone: <IconeDocument />, href: `${RACINE}/reput/base` },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Sujets autorisés</dt>
                  <dd className={accordsActifs.length ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Sujets autorisés…"
                      declencheur={
                        <>
                          <IconeDiese />
                          {accordsActifs.length} sur {autorisables}
                        </>
                      }
                      options={[
                        ...accordsActifs.map((a): Option => ({ cle: a.sujet, libelle: a.libelle, meta: `${a.envoyees_seules_mois} ce mois`, icone: <IconeStatutProjet etat="fait" />, href: `${RACINE}/reput/sujets` })),
                        ...(accordsAValider.length ? [{ cle: "valider", libelle: "Accords à valider", meta: String(accordsAValider.length), icone: <Losange atteint />, href: `${RACINE}/validations` }] : []),
                        { cle: "sujets", libelle: "Sujets autorisés", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/sujets` },
                      ]}
                      largeur={320}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Délai médian</dt>
                  <dd className={ind.delai_median_minutes !== null ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Première réponse…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {ind.delai_median_minutes !== null ? `${Math.round(ind.delai_median_minutes)} min sur 7 jours` : "Aucune réponse sur 7 jours"}
                        </>
                      }
                      options={[
                        { cle: "repondues", libelle: "Demandes répondues", meta: String(repondues.length), icone: <IconeStatut sante="repondue" />, href: lien({ vue: "demandes", sante: "repondue" }) },
                        { cle: "delais", libelle: "Délais par sujet", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/sujets` },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Réglages</dt>
                  <dd className={m.reglages?.actif ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Réglages et avis…"
                      declencheur={
                        <>
                          <IconeStatutProjet etat={m.reglages?.actif ? "fait" : "planifie"} />
                          {!m.reglages ? "Non réglé" : m.reglages.actif ? (m.reglages.envoi_auto === false ? "Actif, sans envoi automatique" : "Actif") : "En pause"}
                        </>
                      }
                      options={[
                        { cle: "reglages", libelle: "Réglages et avis", icone: <ExternalLink width={16} height={16} />, href: `${RACINE}/reput/reglages` },
                        ...(m.reglages ? [{ cle: "accuse", libelle: "Accusé de réception", meta: m.reglages.accuse ? "activé" : "coupé", icone: <IconeEnveloppe />, href: `${RACINE}/reput/reglages` }] : []),
                      ]}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Parcours">
              <ul className="lin-jalons">
                {parEtape.map(({ e, n }) => (
                  <li key={e.cle}>
                    <Losange atteint={n > 0} />
                    <span className="lin-jalon-nom">{e.libelle}</span>
                    <span className="lin-meta">{pluriel(n, "demande")}</span>
                    <MenuActions
                      titre={`${e.libelle}…`}
                      options={[
                        { cle: "liste", libelle: "Demandes à cette étape", icone: <Losange atteint />, href: lien({ vue: "demandes", etape: e.cle }) },
                        { cle: "valider", libelle: "Réponses à valider", icone: <IconeStatut sante="a_valider" />, href: lien({ vue: "demandes", sante: "a_valider" }) },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </CarteDroite>

            <CarteAvancement monde={m} liste={demandes} maintenant={maint} onglets />

            <CarteActivite evenements={evenementsDe(m, demandes)} tout={LISTE} noms />
          </aside>
        </div>
      </div>
    );
  }

  /* ——— la liste : le tableau des projets (« Voir toutes les demandes ») ——— */
  const q = filtre.trim().toLowerCase();
  const filtres = ordonnes.filter(
    (d) =>
      (onglet === "tous" || santeDe(d) === onglet) &&
      (!etapeFiltre || parcours(d, reponseDe(m, d))[etapeFiltre]?.atteinte) &&
      (!canalFiltre || d.canal === canalFiltre) &&
      (!sujetFiltre || d.sujet === sujetFiltre) &&
      (!q || `${nomDe(d)} ${titreDe(m, d)} ${sujetDe(m, d) ?? ""} ${d.adresse_reponse ?? ""}`.toLowerCase().includes(q)),
  );
  const presentes = (Object.keys(SANTES) as Sante[]).filter((s) => demandes.some((d) => santeDe(d) === s));
  const filtreActif = etapeFiltre
    ? { libelle: ETAPES.find((e) => e.cle === etapeFiltre)?.libelle ?? etapeFiltre, icone: <Losange atteint /> }
    : canalFiltre
      ? { libelle: CANAUX[canalFiltre] ?? canalFiltre, icone: <IconeCanal canal={canalFiltre} /> }
      : sujetFiltre
        ? { libelle: m.sujets.find((x) => x.code === sujetFiltre)?.libelle ?? sujetFiltre, icone: <IconeDiese /> }
        : null;
  const ind = m.indicateurs;
  const lignesDetails =
    ongletDetails === "canaux"
      ? canauxPresents.map((c) => ({ cle: c, libelle: CANAUX[c], valeur: String(demandes.filter((d) => d.canal === c).length) }))
      : ongletDetails === "sujets"
        ? sujetsPresents.map((x) => ({ cle: x || "-", libelle: m.sujets.find((y) => y.code === x)?.libelle ?? "Non classé", valeur: String(demandes.filter((d) => (d.sujet ?? "") === x).length) }))
        : [
            { cle: "recues", libelle: "Reçues", valeur: String(ind.recues) },
            { cle: "repondues", libelle: "Répondues", valeur: String(ind.repondues) },
            { cle: "seules", libelle: "Parties sans intervention", valeur: String(ind.parties_seules) },
            { cle: "hors", libelle: "Hors de votre base", valeur: String(ind.hors_base) },
            { cle: "delai", libelle: "Première réponse (médiane)", valeur: ind.delai_median_minutes !== null ? `${Math.round(ind.delai_median_minutes)} min` : "—" },
          ];

  return (
    <div className="lin">
      <h1 className="v2-sr">Demandes clients</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={`${RACINE}/reput`} className="lin-fil-equipe">
            Tableau de bord
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici" aria-current="page">
            Demandes
          </span>
        </nav>
        <div className="lin-tete-droite">{boutonExporter}</div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Statut">
          <Link href={LISTE} className="v2-btn v2-btn--petit" data-actif={onglet === "tous" ? "" : undefined} aria-current={onglet === "tous" ? "page" : undefined} scroll={false}>
            Toutes les demandes
          </Link>
          {presentes.map((s) => (
            <Link key={s} href={lien({ vue: "demandes", sante: s })} className="v2-btn v2-btn--petit" data-actif={onglet === s ? "" : undefined} aria-current={onglet === s ? "page" : undefined} scroll={false}>
              {SANTES[s].libelle}
            </Link>
          ))}
          {filtreActif ? (
            <Link href={lien({ vue: "demandes", sante: onglet === "tous" ? null : onglet })} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              {filtreActif.icone}
              {filtreActif.libelle} ✕
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          <Menu
            largeur={260}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} aria-pressed={!!filtre} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Filtrer par client, message ou sujet…"
                aria-label="Filtrer les demandes"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermer()}
              />
            )}
          </Menu>
          <Menu
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
                <SlidersHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri
                  <Choix<Tri>
                    libelle="Tri"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "priorite", libelle: "Priorité" },
                      { cle: "recente", libelle: "Plus récentes" },
                      { cle: "attente", libelle: "Plus longue attente" },
                      { cle: "nom", libelle: "Client" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          <div className="lin-table" role="table" aria-label="Demandes">
            <div className="lin-table-tete" role="row">
              <span role="columnheader" aria-hidden="true" />
              <span role="columnheader">Client</span>
              <span role="columnheader">Statut</span>
              <span role="columnheader">Priorité</span>
              <span role="columnheader" className="lin-num">
                Délai
              </span>
              <span role="columnheader">Reçue</span>
              <span role="columnheader" className="lin-num">
                Sources
              </span>
              <span role="columnheader">Canal</span>
            </div>
            {filtres.length === 0 ? (
              <p className="lin-vide">{demandes.length ? "Aucune demande ne correspond." : "Les messages reçus s'afficheront ici, avec leur réponse préparée."}</p>
            ) : (
              filtres.map((d) => {
                const s = santeDe(d);
                const p = prioriteDe(m, d, maint);
                const rep = reponseDe(m, d);
                const sujet = sujetDe(m, d);
                const delai = ouverte(d) ? duree(maint - Date.parse(d.recu_le)) : d.envoyee_le ? `en ${duree(Math.max(60_000, Date.parse(d.envoyee_le) - Date.parse(d.recu_le)))}` : "—";
                return (
                  <Link key={d.id} href={ficheDe(d.id)} className="lin-table-ligne" role="row" scroll={false}>
                    <span className="lin-case" aria-hidden="true" />
                    <span className="lin-table-nom" role="cell">
                      <IconeDemande d={d} />
                      <span className="lin-table-titre">{nomDe(d)}</span>
                      {sujet ? (
                        <span className="lin-jalon-puce">
                          <IconeDiese />
                          {sujet}
                        </span>
                      ) : null}
                    </span>
                    <span className="lin-table-sante" role="cell" data-teinte={SANTES[s].teinte}>
                      <IconeSante sante={s} />
                      <span>{SANTES[s].libelle}</span>
                    </span>
                    <span role="cell">
                      <IconePriorite niveau={p.niveau} titre={p.libelle} />
                    </span>
                    <span role="cell" className="lin-num lin-table-valeur">
                      {delai}
                    </span>
                    <span role="cell" className="lin-table-date">
                      <IconeCalendrier passe={p.niveau >= 3} />
                      {dateCourte(d.recu_le)}
                    </span>
                    <span role="cell" className="lin-num lin-table-chiffre">
                      {rep ? rep.sources.length : "—"}
                    </span>
                    <span role="cell" className="lin-reput-canal">
                      <IconeCanal canal={d.canal} />
                      {d.canal === "formulaire" ? "Formulaire" : CANAUX[d.canal]}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {details ? (
          <aside className="lin-details" aria-label="Détails">
            <div className="lin-details-onglets" role="tablist">
              {(
                [
                  ["canaux", "Canaux"],
                  ["sujets", "Sujets"],
                  ["semaine", "7 jours"],
                ] as const
              ).map(([cle, lib]) => (
                <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={ongletDetails === cle} onClick={() => setOngletDetails(cle)}>
                  {lib}
                </button>
              ))}
            </div>
            <ul className="lin-details-lignes">
              {lignesDetails.map((l) => (
                <li key={l.cle}>
                  <span>{l.libelle}</span>
                  <span className="lin-details-valeur">{l.valeur}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
