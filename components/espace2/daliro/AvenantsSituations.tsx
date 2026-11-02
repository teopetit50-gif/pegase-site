"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Avenants et situations — Linear, Board, au 1:1 (02/11/2026)

   Règles de Teo (docs/refonte-metiers/REGLES.md) : la page « All issues »
   de l'équipe en vue Board, recopiée point par point (relevé :
   docs/refonte-metiers/releves/linear-board.md ; mesures prises sur ses
   captures à taille réelle, styles : ./dal-board.css, préfixe dal-bd-).
   Seul le contenu change :
     · trois onglets (Active · Backlog · All issues chez Linear) :
       « Avenants », « Situations » et « Tous » (les deux, par étape) ;
     · une colonne par état ; refusés, abandonnés et annulées dans la
       colonne de droite (Hidden rows) ;
     · une carte par avenant ou situation, aux briques de la carte de
       Linear : identifiant, signataire (avatar), état et titre, puces
       (urgence, échéance, montant, chantier, origine), date d'ouverture.

   Chaque bouton de la référence fait quelque chose (décision de Teo du
   02/11, ./navigateur.ts) :
     · l'étoile épingle la vue affichée (onglet et filtre) : elle remonte
       dans « Épinglés » de la vue d'ensemble (navigateur) ;
     · la cloche suit le ou les chantiers affichés : leurs messages passent
       en tête d'À ranger (navigateur) ;
     · « Nouvel avenant » ouvre la fenêtre « Ouvrir un avenant » du
       chantier choisi ; le « + » d'une colonne y fait entrer un élément
       par le geste qui y mène (chiffrer → soumettre, signer, abandonner :
       fenêtres de la fiche ; pour une situation, son détail) ;
     · Filtre (chantier, recherche) et Affichage (colonnes, tri) sont dans
       l'adresse : ?chantier, ?q, ?masquees, ?tri ;
     · le volet de droite ouvre le détail de l'élément.

   Les gestes (chiffrer une ligne, retirer une ligne, soumettre, signer,
   faire signer sur place, voir la preuve, abandonner, resoumettre ;
   avancer, reprendre l'avancement lu sur les photos, soumettre, valider,
   annuler, noter un paiement) vivent dans le détail de l'élément, ouvert
   dans le volet au clic sur sa carte (ou par l'aiguillage : ?avenant=<id>,
   ?situation=<id>). Ce détail est celui de la fiche du chantier
   (../lin/Volet, rendu par ChantierVue quand la page fournit un volet) :
   mêmes portes, mêmes fenêtres, mêmes confirmations. La liste que
   ChantierVue rend avec n'est pas montrée (la page a la sienne).
   Glisser une carte dans une autre colonne ouvre ce détail : le statut
   d'un avenant ne change que par sa fenêtre.

   Données : useDaliro() (./donnees) ; en base réelle, les tableaux de tous
   les chantiers sont lus à l'arrivée (demanderTous). En exemple, la page
   pose une fois l'exemple rempli (./exemplesAvenants).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChantierVue, { type FormChantier } from "@/components/espace/daliro/ChantierVue";
import { encaissement } from "@/components/espace/daliro/situations";
import type { Avenant, Situation, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, montant } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { VoletContexte, type Volet } from "../lin/Volet";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import { AVENANTS_PLUS, SITUATIONS_PLUS } from "./exemplesAvenants";
import { copier as copierTexte, useFavoris, useSuivis } from "./navigateur";
import "./dal-board.css";

const BASE = `${RACINE}/daliro`;
const CHEMIN = `${BASE}/avenants`;
const fiche = (id: string) => `${BASE}/chantiers/${encodeURIComponent(id)}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Vue = "avenants" | "situations" | "tous";
type Etat = "triage" | "backlog" | "todo" | "started" | "done" | "canceled";
/* un élément du tableau : un avenant ou une situation, avec le tableau de son chantier */
type El = { cle: string; t: Tableau; a: Avenant; s?: undefined } | { cle: string; t: Tableau; s: Situation; a?: undefined };
type Colonne = { cle: string; nom: string; etat: Etat; garde: (x: El) => boolean; masquee?: boolean };
type Item = { cle: string; id: string; t: Tableau; ident: string; titre: string; etat: Etat; quand: string | null };
type Tri = "date" | "montant" | "chantier";

const ICONE_ETAT: Record<Etat, NomDalIcone> = {
  triage: "IssueStatusTriage",
  backlog: "IssueStatusBacklog",
  todo: "IssueStatusTodo",
  started: "IssueStatusStarted",
  done: "IssueStatusDone",
  canceled: "StatusCanceled",
};

const valide = (d: string | null | undefined) => d === "approuvee" || d === "executee";
const reste = (s: Situation) => encaissement(s, aujourdhui()).reste;

/* les étapes d'un avenant et d'une situation */
const A = {
  aChiffrer: (a: Avenant) => a.statut === "brouillon",
  aValider: (a: Avenant) => a.statut === "soumis" && !valide(a.demande_statut),
  aSigner: (a: Avenant) => a.statut === "soumis" && valide(a.demande_statut),
  signe: (a: Avenant) => a.statut === "signe",
  clos: (a: Avenant) => a.statut === "refuse" || a.statut === "abandonne",
};
const S = {
  enPreparation: (s: Situation) => s.statut === "brouillon" || s.statut === "refusee",
  aValider: (s: Situation) => s.statut === "soumise",
  aEncaisser: (s: Situation) => s.statut === "validee" && reste(s) > 0.005,
  payee: (s: Situation) => s.statut === "validee" && reste(s) <= 0.005,
  annulee: (s: Situation) => s.statut === "annulee",
};
const av = (f: (a: Avenant) => boolean) => (x: El) => !!x.a && f(x.a);
const si = (f: (s: Situation) => boolean) => (x: El) => !!x.s && f(x.s);
const ou = (f: (x: El) => boolean, g: (x: El) => boolean) => (x: El) => f(x) || g(x);

const COLONNES: Record<Vue, Colonne[]> = {
  avenants: [
    { cle: "a-chiffrer", nom: "À chiffrer", etat: "backlog", garde: av(A.aChiffrer) },
    { cle: "a-valider", nom: "Dans « À valider »", etat: "todo", garde: av(A.aValider) },
    { cle: "a-signer", nom: "À signer", etat: "started", garde: av(A.aSigner) },
    { cle: "signes", nom: "Signés", etat: "done", garde: av(A.signe) },
    { cle: "refuses", nom: "Refusés et abandonnés", etat: "canceled", garde: av(A.clos), masquee: true },
  ],
  situations: [
    { cle: "en-preparation", nom: "En préparation", etat: "backlog", garde: si(S.enPreparation) },
    { cle: "a-valider", nom: "À valider", etat: "todo", garde: si(S.aValider) },
    { cle: "a-encaisser", nom: "À encaisser", etat: "started", garde: si(S.aEncaisser) },
    { cle: "payees", nom: "Payées", etat: "done", garde: si(S.payee) },
    { cle: "annulees", nom: "Annulées", etat: "canceled", garde: si(S.annulee), masquee: true },
  ],
  tous: [
    { cle: "a-preparer", nom: "À préparer", etat: "backlog", garde: ou(av(A.aChiffrer), si(S.enPreparation)) },
    { cle: "a-valider", nom: "Dans « À valider »", etat: "todo", garde: ou(av(A.aValider), si(S.aValider)) },
    { cle: "a-signer", nom: "À signer ou à encaisser", etat: "started", garde: ou(av(A.aSigner), si(S.aEncaisser)) },
    { cle: "faits", nom: "Signés et payés", etat: "done", garde: ou(av(A.signe), si(S.payee)) },
    { cle: "clos", nom: "Refusés, abandonnés, annulés", etat: "canceled", garde: ou(av(A.clos), si(S.annulee)), masquee: true },
  ],
};
const ONGLETS: { cle: Vue; libelle: string }[] = [
  { cle: "avenants", libelle: "Avenants" },
  { cle: "situations", libelle: "Situations" },
  { cle: "tous", libelle: "Tous" },
];
const TRIS: { cle: Tri; libelle: string }[] = [
  { cle: "date", libelle: "Date d'ouverture" },
  { cle: "montant", libelle: "Montant" },
  { cle: "chantier", libelle: "Chantier" },
];

/* l'origine d'un avenant, en étiquette (pastille de la palette des étiquettes de Linear) */
const ORIGINES: Record<string, { libelle: string; couleur: string }> = {
  vocal: { libelle: "Vocal", couleur: "#5e6ad2" },
  photo: { libelle: "Photo", couleur: "#26b5ce" },
  visite: { libelle: "Visite", couleur: "#4cb782" },
  courriel: { libelle: "Courriel", couleur: "#f2c94c" },
  email: { libelle: "Courriel", couleur: "#f2c94c" },
  message: { libelle: "Message", couleur: "#f2994a" },
  whatsapp: { libelle: "Message", couleur: "#f2994a" },
  sms: { libelle: "Message", couleur: "#f2994a" },
  telegram: { libelle: "Message", couleur: "#f2994a" },
  reception: { libelle: "Réserve", couleur: "#eb5757" },
};

/* « OME-52 » chez Linear : le préfixe du chantier, A pour un avenant, S pour une situation */
const prefixe = (t: Tableau) => (t.chantier.reference || t.chantier.nom).split(/[-\s]/)[0].toUpperCase().slice(0, 4);
const ident = (x: El) => (x.a ? `${prefixe(x.t)}-A${x.a.numero}` : `${prefixe(x.t)}-S${x.s!.numero}`);
const titreEl = (x: El) => (x.a ? x.a.objet : `Situation n° ${x.s!.numero} au ${dateCourte(x.s!.periode_fin)}`);
const initiales = (nom: string | null | undefined) =>
  (nom ?? "")
    .replace(/^(Signé sur place\s*:?\s*|M\.\s*et\s*Mme\s*|M\.\s*|Mme\s*|Dr\s*)/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
const jours = (iso: string | null | undefined) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);
const moisJour = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") : "");

/* l'urgence d'un élément, sur les seuils du point du matin (b6_23) : la priorité de la carte */
function urgenceAvenant(a: Avenant): 0 | 1 | 2 | 3 {
  if (a.statut === "soumis" && valide(a.demande_statut)) return jours(a.soumis_le) >= 14 ? 1 : 3;
  if (a.statut === "soumis") return jours(a.soumis_le) >= 7 ? 2 : 3;
  if (a.statut === "brouillon") return 3;
  return 0;
}
const PRIORITE: Record<0 | 1 | 2 | 3, { icone: NomDalIcone; libelle: string }> = {
  0: { icone: "Priority0", libelle: "Rien à faire" },
  1: { icone: "Priority1", libelle: "Urgent" },
  2: { icone: "Priority3", libelle: "À relancer" },
  3: { icone: "Priority4", libelle: "À suivre" },
};

/* le « + » d'une colonne : ce qui peut y entrer, et le geste qui l'y fait entrer */
type Entree = { titre: string; aide: string; candidats: (x: El) => boolean; geste: (x: El) => { form: FormChantier } | { detail: true } } | { titre: string; aide: string; nouveau: true };
function entreeDe(colonne: string, vue: Vue): Entree | null {
  const avenantPar = (type: "soumettre" | "signer" | "abandonner") => (x: El) => ({ form: { type, avenant: x.a! } as FormChantier });
  const detail = () => ({ detail: true as const });
  switch (colonne) {
    case "a-chiffrer":
      return { titre: "Ouvrir un avenant sur…", aide: "Un avenant se prépare sur un chantier ouvert.", nouveau: true };
    case "a-preparer":
      return { titre: "Ouvrir un avenant sur…", aide: "Un avenant se prépare sur un chantier ouvert.", nouveau: true };
    case "en-preparation":
      return { titre: "Nouvelle situation sur…", aide: "Une situation se calcule sur un chantier au marché vérifié, pour qui voit les prix.", nouveau: true };
    case "a-valider":
      return vue === "situations"
        ? { titre: "Soumettre une situation", aide: "Aucune situation en préparation.", candidats: si(S.enPreparation), geste: detail }
        : { titre: "Soumettre à la signature", aide: "Aucun avenant chiffré à soumettre.", candidats: (x) => !!x.a && A.aChiffrer(x.a) && x.a.lignes.length > 0, geste: avenantPar("soumettre") };
    case "a-signer":
      return vue === "avenants"
        ? { titre: "En attente dans « À valider »", aide: "Aucun avenant en attente de validation.", candidats: av(A.aValider), geste: detail }
        : { titre: "Valider une situation approuvée", aide: "Aucune situation approuvée à valider.", candidats: (x) => !!x.s && S.aValider(x.s) && valide(x.s.demande_statut), geste: detail };
    case "signes":
      return { titre: "Signer un avenant", aide: "Aucun avenant validé à signer.", candidats: av(A.aSigner), geste: avenantPar("signer") };
    case "payees":
      return { titre: "Noter un paiement", aide: "Aucune situation à encaisser.", candidats: si(S.aEncaisser), geste: detail };
    case "faits":
      return { titre: "Signer ou noter un paiement", aide: "Rien à signer ni à encaisser.", candidats: ou(av(A.aSigner), si(S.aEncaisser)), geste: (x) => (x.a ? avenantPar("signer")(x) : detail()) };
    case "refuses":
    case "clos":
      return { titre: "Abandonner un avenant", aide: "Aucun avenant à abandonner.", candidats: (x) => !!x.a && (A.aChiffrer(x.a) || x.a.statut === "soumis"), geste: avenantPar("abandonner") };
    case "annulees":
      return { titre: "Annuler une situation", aide: "Aucune situation à annuler.", candidats: (x) => !!x.s && (S.enPreparation(x.s) || S.aValider(x.s)), geste: detail };
  }
  return null;
}

export default function AvenantsSituations() {
  const { source, pret, erreur, liste, tableau, demanderTous, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { estEpingle, basculer: epingler } = useFavoris();
  const { estSuivi, basculer: suivre } = useSuivis();

  /* en base réelle : les tableaux de tous les chantiers, relus quand la liste change (temps réel) */
  const listeLue = useRef<unknown>(null);
  useEffect(() => {
    if (!pret || listeLue.current === liste) return;
    listeLue.current = liste;
    demanderTous();
  }, [pret, liste, demanderTous]);

  /* en exemple : l'exemple rempli, posé une fois dans les tableaux */
  const poses = useRef(new Set<string>());
  useEffect(() => {
    if (source !== "exemple") return;
    for (const c of liste) {
      const t = tableau(c.id);
      if (!t || poses.current.has(c.id)) continue;
      poses.current.add(c.id);
      const avs = AVENANTS_PLUS.filter((a) => a.chantier_id === c.id);
      const sits = SITUATIONS_PLUS.filter((s) => s.chantier_id === c.id);
      const deja = (x: { id: string }) => t.avenants.some((a) => a.id === x.id) || (t.situations ?? []).some((s) => s.id === x.id);
      if ((!avs.length && !sits.length) || [...avs, ...sits].some(deja)) continue;
      onLocal({ ...t, avenants: [...t.avenants, ...avs], situations: [...(t.situations ?? []), ...sits] });
    }
  }, [source, liste, tableau, onLocal]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const lecture = source === "reelle" && (!pret || liste.some((c) => enLecture(c.id)));
  const voitPrix = tableaux.some((t) => t.voit_prix);

  /* ——— l'adresse : la vue, le filtre, l'affichage, l'élément ouvert ——— */
  const idAvenant = params.get("avenant");
  const idSituation = params.get("situation");
  const pVue = params.get("vue");
  const vue: Vue = pVue === "tous" ? "tous" : idSituation ? "situations" : idAvenant ? "avenants" : pVue === "situations" ? "situations" : "avenants";
  const filtre = params.get("chantier");
  const q = params.get("q") ?? "";
  const tri: Tri = TRIS.find((x) => x.cle === params.get("tri"))?.cle ?? "date";
  const masquees = (params.get("masquees") ?? "").split(",").filter(Boolean);
  const adresse = useCallback(
    (changes: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      const s = p.toString().replace(/%3A/gi, ":").replace(/%2C/gi, ",");
      return s ? `${CHEMIN}?${s}` : CHEMIN;
    },
    [params],
  );
  const aller = (changes: Record<string, string | null>) => router.replace(adresse(changes), { scroll: false });
  const lienVue = (v: Vue) => adresse({ vue: v === "avenants" ? null : v, avenant: null, situation: null, masquees: null });

  const choisieAdresse = idAvenant ? `avenant:${idAvenant}` : idSituation ? `situation:${idSituation}` : null;
  const [choisie, setChoisie] = useState<string | null>(choisieAdresse);
  const [adresseVue, setAdresseVue] = useState(choisieAdresse);
  if (adresseVue !== choisieAdresse) {
    setAdresseVue(choisieAdresse);
    setChoisie(choisieAdresse);
  }
  const choisir = useCallback(
    (cle: string | null) => {
      setChoisie(cle);
      const [type, id] = cle ? cle.split(":") : [null, null];
      setAdresseVue(type ? cle : null);
      router.replace(
        adresse({
          avenant: type === "avenant" ? id : null,
          situation: type === "situation" ? id : null,
          vue: vue === "avenants" && type !== "situation" ? null : vue === "situations" && type !== "avenant" ? "situations" : vue === "tous" ? "tous" : type === "situation" ? "situations" : null,
        }),
        { scroll: false },
      );
    },
    [router, adresse, vue],
  );
  useEffect(() => {
    if (choisie === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      choisir(null);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choisie, choisir]);

  /* ——— les menus ——— */
  const [menu, setMenu] = useState<string | null>(null);
  const [saisie, setSaisie] = useState(q);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-dal-bd-pop]")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const chantiersVus = tableaux.filter((t) => (!filtre || t.chantier.id === filtre) && (!q.trim() || `${t.chantier.nom} ${t.chantier.commune} ${t.chantier.reference ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));

  /* ——— les éléments ——— */
  const montantEl = (x: El) => (x.a ? (x.a.montant_ht ?? 0) : x.s!.statut === "validee" ? x.s!.net_a_payer : x.s!.periode_ht);
  const dateEl = (x: El) => (x.a ? x.a.cree_le : x.s!.periode_fin);
  const elements: El[] = chantiersVus
    .flatMap((t): El[] => [
      ...(vue !== "situations" ? t.avenants.map((a) => ({ cle: `avenant:${a.id}`, t, a })) : []),
      ...(vue !== "avenants" && t.voit_prix ? (t.situations ?? []).map((s) => ({ cle: `situation:${s.id}`, t, s })) : []),
    ])
    .sort((x, y) =>
      tri === "montant" ? montantEl(y) - montantEl(x) : tri === "chantier" ? x.t.chantier.nom.localeCompare(y.t.chantier.nom, "fr") || new Date(dateEl(y)).getTime() - new Date(dateEl(x)).getTime() : new Date(dateEl(y)).getTime() - new Date(dateEl(x)).getTime(),
    );
  /* tous les éléments, filtre compris, pour les « + » de colonne (une situation peut entrer dans la vue Avenants…) */
  const tousElements: El[] = chantiersVus.flatMap((t): El[] => [...t.avenants.map((a) => ({ cle: `avenant:${a.id}`, t, a })), ...(t.voit_prix ? (t.situations ?? []) : []).map((s) => ({ cle: `situation:${s.id}`, t, s }))]);

  /* le détail ouvert : le tableau de son chantier, la partie qui le porte */
  const elu = (() => {
    if (!choisie) return null;
    const [type, id] = choisie.split(":");
    for (const t of tableaux) {
      if (type === "avenant" && t.avenants.some((a) => a.id === id)) return { t, section: "avenants" as const, annulee: false };
      const s = (t.situations ?? []).find((x) => x.id === id);
      if (type === "situation" && s) return { t, section: "situations" as const, annulee: s.statut === "annulee" };
    }
    return null;
  })();

  const [cible, setCible] = useState<HTMLElement | null>(null);
  const contexte = useMemo<Volet>(() => ({ cible, choisie, choisir }), [cible, choisie, choisir]);
  const voletOuvert = choisie !== null;

  /* une fenêtre de la fiche ouverte d'ici (« Ouvrir un avenant », soumettre, signer, abandonner) */
  const [geste, setGeste] = useState<{ chantier: string; n: number; form: FormChantier } | null>(null);
  const tGeste = geste ? tableau(geste.chantier) : null;
  const ouvrirGeste = (chantier: string, form: FormChantier) => {
    setMenu(null);
    setGeste((g) => ({ chantier, n: (g?.n ?? 0) + 1, form }));
  };

  /* glisser une carte dans une autre colonne : son détail s'ouvre, avec le geste qui change son état */
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<string | null>(null);

  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const pourSituation = liste.filter((c) => {
    const t = tableau(c.id);
    const verifie = c.marche_verifie || t?.marches.some((m) => m.statut === "verifie");
    return (c.statut === "ouvert" || c.statut === "suspendu" || c.statut === "receptionne") && verifie && (!t || t.voit_prix);
  });
  const lienSituation = (id: string) => `${fiche(id)}?onglet=argent&partie=situations#situations`;

  /* ——— l'étoile : la vue affichée, épinglée ; la cloche : les chantiers affichés, suivis ——— */
  const nomFiltre = filtre ? tableaux.find((t) => t.chantier.id === filtre)?.chantier.nom : null;
  const vueEpinglee = {
    type: "vue",
    id: `daliro-avenants:${vue}:${filtre ?? "tous"}`,
    titre: `${ONGLETS.find((o) => o.cle === vue)!.libelle === "Tous" ? "Avenants et situations" : ONGLETS.find((o) => o.cle === vue)!.libelle}${nomFiltre ? ` · ${nomFiltre}` : ""}`,
    href: adresse({ avenant: null, situation: null }),
  };
  const epinglee = estEpingle(vueEpinglee.type, vueEpinglee.id);
  const aSuivre = (filtre ? tableaux.filter((t) => t.chantier.id === filtre) : chantiersVus).map((t) => t.chantier);
  const suivi = aSuivre.length > 0 && aSuivre.every((c) => estSuivi("btp_chantiers", c.id));
  const basculerSuivi = () => {
    if (!aSuivre.length) return;
    for (const c of aSuivre) if (estSuivi("btp_chantiers", c.id) === suivi) suivre({ type: "btp_chantiers", id: c.id, titre: c.nom, href: fiche(c.id) });
    const qui = aSuivre.length === 1 ? `« ${aSuivre[0].nom} »` : `les ${aSuivre.length} chantiers affichés`;
    toast(suivi ? `Vous ne suivez plus ${qui}.` : `Vous suivez ${qui} : ses nouveaux messages passent en tête d'À ranger.`);
  };

  const copier = (chemin: string) => {
    void copierTexte(`${window.location.origin}${chemin}`).then((ok) => toast(ok ? "Lien copié" : "Le lien n'a pas pu être copié.", ok ? undefined : "rouge"));
  };

  const [contextuel, setContextuel] = useState<{ x: number; y: number; item: Item } | null>(null);
  useEffect(() => {
    if (!contextuel) return;
    const fermer = () => setContextuel(null);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [contextuel]);

  const ctx: CtxCarte = { choisie, glisse, setGlisse, setSurvolee, choisir, setContextuel };

  const carteAvenant = (a: Avenant, t: Tableau, etat: Etat) => {
    const o = ORIGINES[a.origine?.canal ?? ""] ?? (a.origine?.canal ? { libelle: a.origine.canal, couleur: "#bec2c8" } : null);
    const u = urgenceAvenant(a);
    const signataire = a.statut === "signe" ? (a.signe_libelle ?? t.chantier.maitre_ouvrage_nom ?? null) : null;
    const item: Item = { cle: `avenant:${a.id}`, id: a.id, t, ident: `${prefixe(t)}-A${a.numero}`, titre: a.objet, etat, quand: a.cree_le };
    return (
      <Carte key={a.id} ctx={ctx} item={item} avatar={signataire} avatarTitre={signataire ? `Signé : ${signataire.replace(/^Signé sur place\s*:\s*/, "sur place, ")}` : `Signe pour le maître d'ouvrage : ${t.chantier.maitre_ouvrage_nom ?? "non désigné"}`} pied={`Ouvert le ${moisJour(a.cree_le)}`} piedTitre={a.cree_le ? dateCourte(a.cree_le) : undefined}>
        <Puce carre titre={`Urgence : ${PRIORITE[u].libelle.toLowerCase()}`} icone={PRIORITE[u].icone} data-urgence={u === 1 ? "" : undefined} />
        {t.voit_prix && a.lignes.length ? <Puce icone="Euro" titre="Montant HT">{montant(a.montant_ht)}</Puce> : null}
        <Puce icone="Crane" titre={`Chantier : ${t.chantier.nom}`} data-chantier="">
          {t.chantier.nom}
        </Puce>
        {o ? <Puce pastille={o.couleur} titre={`Origine : ${o.libelle}${a.origine?.auteur ? `, ${a.origine.auteur}` : ""}`}>{o.libelle}</Puce> : null}
        {a.statut === "soumis" && a.demande_statut === "rejetee" ? <Puce pastille="#eb5757">Refusé à la validation</Puce> : null}
        {a.statut === "refuse" ? <Puce pastille="#eb5757">Refusé</Puce> : a.statut === "abandonne" ? <Puce pastille="#95a2b3">Abandonné</Puce> : null}
      </Carte>
    );
  };

  const carteSituation = (s: Situation, t: Tableau, etat: Etat) => {
    const e = s.statut === "validee" ? encaissement(s, aujourdhui()) : null;
    const retard = e?.etat === "en_retard";
    const urg: 0 | 1 | 2 | 3 = retard ? 1 : s.statut === "soumise" && valide(s.demande_statut) ? 2 : s.statut === "validee" && e?.etat !== "payee" ? 3 : s.statut === "brouillon" || s.statut === "refusee" ? 3 : 0;
    const item: Item = { cle: `situation:${s.id}`, id: s.id, t, ident: `${prefixe(t)}-S${s.numero}`, titre: `Situation n° ${s.numero} au ${dateCourte(s.periode_fin)}`, etat, quand: s.periode_fin };
    return (
      <Carte key={s.id} ctx={ctx} item={item} avatar={s.validee_libelle} avatarTitre={s.validee_libelle ? `Validée par ${s.validee_libelle}` : "Pas encore validée"} pied={`Période au ${moisJour(s.periode_fin)}`} piedTitre={dateCourte(s.periode_fin)}>
        <Puce carre titre={`Urgence : ${PRIORITE[urg].libelle.toLowerCase()}`} icone={PRIORITE[urg].icone} data-urgence={urg === 1 ? "" : undefined} />
        {e?.echeance && e.etat !== "payee" ? (
          <Puce icone={retard ? "CrossedOutCalendar" : "Calendar"} titre={retard ? `Échéance dépassée de ${e.retard} j : indemnité de 40 € due` : `Échéance : ${dateCourte(e.echeance)}`} data-retard={retard ? "" : undefined}>
            {moisJour(e.echeance)}
          </Puce>
        ) : null}
        <Puce icone="Euro" titre={e ? `Net à payer ${montant(s.net_a_payer)}, encaissé ${montant(e.encaisse)}` : "Travaux de la période HT"}>
          {e ? (e.etat === "payee" ? montant(s.net_a_payer) : `${montant(e.reste)} à recevoir`) : montant(s.periode_ht)}
        </Puce>
        <Puce icone="Crane" titre={`Chantier : ${t.chantier.nom}`} data-chantier="">
          {t.chantier.nom}
        </Puce>
        {s.statut === "soumise" ? <Puce pastille={valide(s.demande_statut) ? "#4cb782" : s.demande_statut === "rejetee" ? "#eb5757" : "#26b5ce"}>{valide(s.demande_statut) ? "Approuvée : à valider" : s.demande_statut === "rejetee" ? "Rejetée à la validation" : "Dans « À valider »"}</Puce> : null}
        {s.statut === "refusee" ? <Puce pastille="#eb5757">Refusée</Puce> : null}
        {e?.etat === "partielle" ? <Puce pastille="#f2c94c">Payée en partie</Puce> : null}
      </Carte>
    );
  };

  /* les colonnes de la vue */
  const colonnes = COLONNES[vue].map((c) => {
    const items = elements.filter(c.garde);
    return { c, n: items.length, cartes: items.map((x) => (x.a ? carteAvenant(x.a, x.t, c.etat) : carteSituation(x.s!, x.t, c.etat))) };
  });
  const visibles = colonnes.filter(({ c }) => !masquees.includes(c.cle));
  const affichageModifie = masquees.length > 0 || tri !== "date";
  const basculerColonne = (cle: string) => aller({ masquees: (masquees.includes(cle) ? masquees.filter((x) => x !== cle) : [...masquees, cle]).join(",") || null });

  /* le menu « Nouvel avenant » / « + » d'une colonne */
  const menuEntree = (colonne: string | null) => {
    const e = colonne ? entreeDe(colonne, vue) : vue === "situations" ? entreeDe("en-preparation", vue) : entreeDe("a-chiffrer", vue);
    if (!e) return null;
    if ("nouveau" in e) {
      const situation = colonne === "en-preparation" || (!colonne && vue === "situations");
      const chantiers = situation ? (voitPrix ? pourSituation : []) : ouverts;
      return (
        <MenuChoix titre={e.titre} aide={e.aide}>
          {chantiers.map((c) =>
            situation ? (
              <Link key={c.id} href={lienSituation(c.id)} role="menuitem" className="dal-menu-option" onClick={() => setMenu(null)}>
                <DalIcone nom="Crane" />
                <span className="dal-pousse">{c.nom}</span>
                <span className="dal-bd-menu-compte">{c.commune}</span>
              </Link>
            ) : (
              <button key={c.id} type="button" role="menuitem" className="dal-menu-option" onClick={() => ouvrirGeste(c.id, { type: "avenant" })}>
                <DalIcone nom="Crane" />
                <span className="dal-pousse">{c.nom}</span>
                <span className="dal-bd-menu-compte">{c.commune}</span>
              </button>
            ),
          )}
        </MenuChoix>
      );
    }
    const candidats = tousElements.filter(e.candidats);
    return (
      <MenuChoix titre={e.titre} aide={e.aide}>
        {candidats.map((x) => (
          <button
            key={x.cle}
            type="button"
            role="menuitem"
            className="dal-menu-option"
            onClick={() => {
              const g = e.geste(x);
              if ("form" in g) ouvrirGeste(x.t.chantier.id, g.form);
              else {
                setMenu(null);
                choisir(x.cle);
              }
            }}
          >
            <DalIcone nom={x.a ? "Signature" : "Spreadsheet"} />
            <span className="dal-bd-menu-ident">{ident(x)}</span>
            <span className="dal-pousse dal-bd-menu-titre-el">{titreEl(x)}</span>
          </button>
        ))}
      </MenuChoix>
    );
  };

  const titreVide =
    vue === "situations" && !voitPrix && !lecture
      ? "Les situations sont réservées à qui a le droit de voir les prix."
      : lecture
        ? "Lecture des chantiers…"
        : null;

  return (
    <VoletContexte.Provider value={contexte}>
      <DalCarte className="dal-bd-page">
        <h1 className="v2-sr">Avenants et situations</h1>
        <header className="dal-tete">
          <div className="dal-ligne1">
            <nav className="dal-bd-fil" aria-label="Fil d'Ariane">
              <Link href={`${BASE}/chantiers`} className="dal-bd-fil-equipe">
                <DalIcone nom="Crane" className="dal-bd-fil-icone" />
                <span>Chantiers</span>
              </Link>
              <DalIcone nom="Chevron" taille={14} className="dal-bd-fil-sep" />
              <span className="dal-bd-fil-ici" aria-current="page">
                Avenants et situations
              </span>
            </nav>
            <button
              type="button"
              role="switch"
              aria-checked={epinglee}
              className="dal-rond dal-bd-etoile"
              data-actif={epinglee ? "" : undefined}
              aria-label={epinglee ? "Retirer la vue des épinglés" : "Épingler cette vue"}
              title={epinglee ? "Retirer la vue des épinglés de la vue d'ensemble" : "Épingler cette vue : elle remonte dans « Épinglés » de la vue d'ensemble"}
              onClick={() => {
                epingler(vueEpinglee);
                toast(epinglee ? "La vue n'est plus épinglée." : "Vue épinglée : elle est dans « Épinglés » de la vue d'ensemble.");
              }}
            >
              <DalIcone nom={epinglee ? "Favorite" : "Etoile"} />
            </button>
            <span className="dal-pousse" />
            <button
              type="button"
              role="switch"
              aria-checked={suivi}
              className="dal-rond"
              data-actif={suivi ? "" : undefined}
              disabled={!aSuivre.length}
              aria-label={suivi ? "Ne plus suivre ces chantiers" : "Suivre les chantiers affichés"}
              title={suivi ? `Ne plus suivre ${nomFiltre ?? "les chantiers affichés"}` : `Suivre ${nomFiltre ?? "les chantiers affichés"} : leurs nouveaux messages passent en tête d'À ranger`}
              onClick={basculerSuivi}
            >
              <DalIcone nom={suivi ? "Notified" : "Subscribe"} />
            </button>
            <div className="dal-bd-pop" data-dal-bd-pop="">
              <button type="button" className="dal-bd-nouveau" aria-haspopup="menu" aria-expanded={menu === "nouveau"} onClick={() => setMenu(menu === "nouveau" ? null : "nouveau")}>
                <DalIcone nom="Plus" taille={14} />
                <span>{vue === "situations" ? "Nouvelle situation" : "Nouvel avenant"}</span>
              </button>
              {menu === "nouveau" ? menuEntree(null) : null}
            </div>
          </div>
          <div className="dal-ligne2 dal-bd-ligne2">
            {ONGLETS.map((o) => (
              <Link key={o.cle} href={lienVue(o.cle)} scroll={false} replace className="dal-onglet" aria-current={vue === o.cle ? "page" : undefined}>
                {o.libelle}
              </Link>
            ))}
            <Link href={BASE} className="dal-rond dal-bd-vues" aria-label="Vue d'ensemble des chantiers" title="Vue d'ensemble des chantiers">
              <DalIcone nom="CustomView" />
            </Link>
            <span className="dal-pousse" />
            <div className="dal-bd-outils">
              <div className="dal-bd-pop" data-dal-bd-pop="">
                <button type="button" className="dal-rond dal-rond--plein" aria-label="Filtrer" title="Filtrer" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                  <DalIcone nom="Filtre" />
                  {filtre || q.trim() ? <span className="dal-bd-point" /> : null}
                </button>
                {menu === "filtre" ? (
                  <div className="dal-menu dal-bd-menu" role="menu" aria-label="Filtrer">
                    <input
                      className="dal-bd-champ"
                      autoFocus
                      placeholder="Filtrer : chantier, commune…"
                      aria-label="Rechercher un chantier"
                      value={saisie}
                      onChange={(e) => {
                        setSaisie(e.target.value);
                        aller({ q: e.target.value.trim() || null });
                      }}
                      onKeyDown={(e) => e.key === "Enter" && setMenu(null)}
                    />
                    <div className="dal-menu-sep" role="separator" />
                    <Link href={adresse({ chantier: null })} scroll={false} replace role="menuitemradio" aria-checked={!filtre} className="dal-menu-option" onClick={() => setMenu(null)}>
                      <DalIcone nom="Project" />
                      <span className="dal-pousse">Tous les chantiers</span>
                      {!filtre ? <DalIcone nom="IssueStatusDone" /> : null}
                    </Link>
                    {tableaux.map((t) => (
                      <Link key={t.chantier.id} href={adresse({ chantier: filtre === t.chantier.id ? null : t.chantier.id })} scroll={false} replace role="menuitemradio" aria-checked={filtre === t.chantier.id} className="dal-menu-option" onClick={() => setMenu(null)}>
                        <DalIcone nom="Crane" />
                        <span className="dal-pousse">{t.chantier.nom}</span>
                        {filtre === t.chantier.id ? <DalIcone nom="IssueStatusDone" /> : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="dal-bd-pop" data-dal-bd-pop="">
                <button type="button" className="dal-rond dal-rond--plein" data-modifie={affichageModifie ? "" : undefined} aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                  <DalIcone nom="Affichage" />
                  {affichageModifie ? <span className="dal-bd-point" /> : null}
                </button>
                {menu === "affichage" ? (
                  <div className="dal-menu dal-bd-menu" role="menu" aria-label="Options d'affichage">
                    <p className="dal-bd-menu-titre">Trier les cartes par</p>
                    {TRIS.map((x) => (
                      <Link key={x.cle} href={adresse({ tri: x.cle === "date" ? null : x.cle })} scroll={false} replace role="menuitemradio" aria-checked={tri === x.cle} className="dal-menu-option">
                        <DalIcone nom={x.cle === "montant" ? "Euro" : x.cle === "chantier" ? "Crane" : "Calendar"} />
                        <span className="dal-pousse">{x.libelle}</span>
                        {tri === x.cle ? <DalIcone nom="IssueStatusDone" /> : null}
                      </Link>
                    ))}
                    <div className="dal-menu-sep" role="separator" />
                    <p className="dal-bd-menu-titre">Colonnes affichées</p>
                    {colonnes.map(({ c, n }) => {
                      const vu = !masquees.includes(c.cle);
                      return (
                        <button key={c.cle} type="button" role="menuitemcheckbox" aria-checked={vu} className="dal-menu-option" onClick={() => basculerColonne(c.cle)}>
                          <DalIcone nom={ICONE_ETAT[c.etat]} className="dal-bd-etat" data-etat={c.etat} />
                          <span className="dal-pousse">{c.nom}</span>
                          <span className="dal-bd-menu-compte">{n}</span>
                          {vu ? <DalIcone nom="IssueStatusDone" /> : null}
                        </button>
                      );
                    })}
                    {affichageModifie ? (
                      <>
                        <div className="dal-menu-sep" role="separator" />
                        <Link href={adresse({ tri: null, masquees: null })} scroll={false} replace role="menuitem" className="dal-menu-option" onClick={() => setMenu(null)}>
                          <DalIcone nom="Refresh" />
                          <span>Revenir à l&apos;affichage par défaut</span>
                        </Link>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="dal-rond dal-rond--plein"
                aria-label={voletOuvert ? "Fermer le détail" : "Ouvrir le détail"}
                title={voletOuvert ? "Fermer le détail (Échap)" : "Ouvrir le détail"}
                aria-pressed={voletOuvert}
                onClick={() => {
                  if (voletOuvert) return choisir(null);
                  if (elements[0]) choisir(elements[0].cle);
                }}
              >
                <DalIcone nom="Volet" />
              </button>
            </div>
          </div>
        </header>

        {erreur && source === "reelle" ? (
          <p className="dal-bd-note" role="alert">
            La base réelle n&apos;a pas répondu. {erreur}
          </p>
        ) : null}

        <div className="dal-bd-corps" data-volet={voletOuvert ? "" : undefined}>
          {titreVide ? (
            <p className="dal-bd-vide" role="status">
              {titreVide}
            </p>
          ) : (
            <div className="dal-bd-tableau" role="list" aria-label={vue === "avenants" ? "Avenants par état" : vue === "situations" ? "Situations par état" : "Avenants et situations par étape"}>
              {visibles.map(({ c, n, cartes }) => (
                <section
                  key={c.cle}
                  role="listitem"
                  className="dal-bd-colonne"
                  data-masquee={c.masquee ? "" : undefined}
                  data-survol={survolee === c.cle ? "" : undefined}
                  aria-label={`${c.nom} : ${n}`}
                  onDragOver={(e) => {
                    if (!glisse) return;
                    e.preventDefault();
                    if (survolee !== c.cle) setSurvolee(c.cle);
                  }}
                  onDragLeave={(e) => {
                    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setSurvolee(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const cle = e.dataTransfer.getData("text/plain") || glisse;
                    setSurvolee(null);
                    setGlisse(null);
                    if (!cle) return;
                    choisir(cle);
                    toast(cle.startsWith("avenant") ? "L'état d'un avenant change par son geste, dans le détail : soumettre, signer, abandonner." : "L'état d'une situation change par son geste, dans le détail : soumettre, valider, noter un paiement.");
                  }}
                >
                  <div className="dal-bd-colonne-tete">
                    <DalIcone nom={ICONE_ETAT[c.etat]} taille={14} className="dal-bd-etat" data-etat={c.etat} />
                    <h2 className="dal-bd-colonne-nom">{c.nom}</h2>
                    <span className="dal-bd-colonne-compte">{n}</span>
                    <span className="dal-pousse" />
                    <MenuColonne nom={c.nom} masquer={() => basculerColonne(c.cle)} />
                    <div className="dal-bd-pop" data-dal-bd-pop="">
                      <button type="button" className="dal-rond dal-bd-plus" aria-label={entreeDe(c.cle, vue)?.titre ?? "Ajouter"} title={entreeDe(c.cle, vue)?.titre ?? "Ajouter"} aria-expanded={menu === `plus:${c.cle}`} onClick={() => setMenu(menu === `plus:${c.cle}` ? null : `plus:${c.cle}`)}>
                        <DalIcone nom="Plus" />
                      </button>
                      {menu === `plus:${c.cle}` ? menuEntree(c.cle) : null}
                    </div>
                  </div>
                  <div className="dal-bd-cartes">
                    {cartes}
                    {!n && !c.masquee ? <p className="dal-bd-colonne-vide">{vue === "avenants" ? "Aucun avenant dans cet état." : vue === "situations" ? "Aucune situation dans cet état." : "Rien à cette étape."}</p> : null}
                  </div>
                </section>
              ))}
            </div>
          )}

          {voletOuvert ? (
            <aside className="lin dal-bd-volet" aria-label="Détail">
              <div ref={setCible} className="lvp-cible" />
              {elu?.annulee ? (
                <section className="lit-carte lvp-detail" aria-label="Situation annulée">
                  <p className="lvp-detail-sous">Cette situation est annulée : elle ne se modifie plus. Ses lignes restent sur la fiche du chantier.</p>
                </section>
              ) : null}
              {!elu ? (
                <section className="lit-carte lvp-detail" aria-label="Détail">
                  <p className="lvp-detail-sous">{lecture ? "Lecture des chantiers…" : "Cet élément n'est pas visible avec ce compte. Il a peut-être été retiré, ou son chantier n'est pas dans votre liste."}</p>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>

        {/* le détail et les fenêtres de l'élément ouvert : ceux de la fiche du chantier ; sa liste n'est pas montrée */}
        {elu && !elu.annulee ? (
          <div className="dal-bd-hote" hidden>
            <Habille>
              <ChantierVue key={`${elu.section}-${source}-${elu.t.chantier.id}`} tableau={elu.t} source={source} onLocal={onLocal} relire={() => relireChantier(elu.t.chantier.id)} sections={[elu.section]} />
            </Habille>
          </div>
        ) : null}

        {contextuel ? (
          <div className="dal-menu dal-bd-contextuel" role="menu" aria-label={contextuel.item.ident} style={{ left: contextuel.x, top: contextuel.y }} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" role="menuitem" className="dal-menu-option" onClick={() => (setContextuel(null), choisir(contextuel.item.cle))}>
              <DalIcone nom="Volet" />
              <span>Ouvrir le détail</span>
            </button>
            <Link href={fiche(contextuel.item.t.chantier.id)} role="menuitem" className="dal-menu-option" onClick={() => setContextuel(null)}>
              <DalIcone nom="Crane" />
              <span>Fiche du chantier</span>
            </Link>
            <div className="dal-menu-sep" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="dal-menu-option"
              onClick={() => {
                setContextuel(null);
                copier(`${CHEMIN}?${contextuel.item.cle.startsWith("avenant") ? "avenant" : "situation"}=${encodeURIComponent(contextuel.item.id)}`);
              }}
            >
              <DalIcone nom="LienUrl" />
              <span>Copier le lien</span>
            </button>
          </div>
        ) : null}
      </DalCarte>

      {/* la fenêtre demandée d'ici (ouvrir, soumettre, signer, abandonner) : hors du volet, la vue du chantier n'y rend que sa fenêtre */}
      {geste && tGeste ? (
        <VoletContexte.Provider value={null}>
          <div className="dal-bd-hote" hidden>
            <Habille>
              <ChantierVue key={`geste-${source}-${geste.chantier}`} tableau={tGeste} source={source} onLocal={onLocal} relire={() => relireChantier(geste.chantier)} sections={["avenants"]} demande={{ n: geste.n, form: geste.form }} />
            </Habille>
          </div>
        </VoletContexte.Provider>
      ) : null}
    </VoletContexte.Provider>
  );
}

type CtxCarte = {
  choisie: string | null;
  glisse: string | null;
  setGlisse: (c: string | null) => void;
  setSurvolee: (c: string | null) => void;
  choisir: (c: string | null) => void;
  setContextuel: (c: { x: number; y: number; item: Item } | null) => void;
};

/* ——— une carte : 322 de large, r 8, p 8 ; identifiant et avatar, état et titre, puces, pied ——— */
function Carte({ ctx, item, avatar, avatarTitre, pied, piedTitre, children }: { ctx: CtxCarte; item: Item; avatar: string | null; avatarTitre: string; pied: string; piedTitre?: string; children: React.ReactNode }) {
const { choisie, glisse, setGlisse, setSurvolee, choisir, setContextuel } = ctx;
  const href = `${CHEMIN}?${item.cle.startsWith("avenant") ? "avenant" : "situation"}=${encodeURIComponent(item.id)}`;
  return (
    <a
      href={href}
      className="dal-bd-carte"
      aria-current={choisie === item.cle ? "true" : undefined}
      draggable
      data-glisse={glisse === item.cle ? "" : undefined}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.cle);
        setGlisse(item.cle);
      }}
      onDragEnd={() => {
        setGlisse(null);
        setSurvolee(null);
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        choisir(choisie === item.cle ? null : item.cle);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextuel({ x: e.clientX, y: e.clientY, item });
      }}
    >
      <span className="dal-bd-carte-l1">
        <span className="dal-bd-ident">{item.ident}</span>
        <span className="dal-bd-avatar" title={avatarTitre}>
          {avatar ? <span className="dal-bd-initiales">{initiales(avatar)}</span> : <DalIcone nom="UnassignedCircle" />}
        </span>
      </span>
      <span className="dal-bd-carte-titre">
        <DalIcone nom={ICONE_ETAT[item.etat]} taille={14} className="dal-bd-etat" data-etat={item.etat} />
        <span className="dal-bd-carte-texte">{item.titre}</span>
      </span>
      <span className="dal-bd-puces">{children}</span>
      <span className="dal-bd-pied" title={piedTitre}>
        {pied}
      </span>
    </a>
  );
}

/* ——— une puce de la carte : 24 de haut, r 48, bord 0.5 ; carrée pour l'urgence (priorité de Linear) ——— */
function Puce({ icone, pastille, carre, titre, children, ...data }: { icone?: NomDalIcone; pastille?: string; carre?: boolean; titre?: string; children?: React.ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <span className="dal-bd-puce" data-carre={carre ? "" : undefined} title={titre} {...data}>
      {icone ? <DalIcone nom={icone} taille={14} /> : null}
      {pastille ? (
        <span className="dal-bd-pastille-boite" aria-hidden="true">
          <span className="dal-bd-pastille" style={{ background: pastille }} />
        </span>
      ) : null}
      {children !== undefined && children !== null ? <span className="dal-bd-puce-texte">{children}</span> : null}
    </span>
  );
}

/* ——— le menu d'un « + » : ce qui peut entrer dans la colonne ——— */
function MenuChoix({ titre, aide, children }: { titre: string; aide: string; children: React.ReactNode[] }) {
  return (
    <div className="dal-menu dal-bd-menu" role="menu" aria-label={titre}>
      <p className="dal-bd-menu-titre">{titre}</p>
      {children.length ? children : <p className="dal-bd-menu-aide">{aide}</p>}
    </div>
  );
}

/* ——— le « … » d'une colonne ——— */
function MenuColonne({ nom, masquer }: { nom: string; masquer: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => !boite.current?.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return (
    <div ref={boite} className="dal-bd-pop">
      <button type="button" className="dal-rond dal-bd-plus" aria-label={`Actions de la colonne ${nom}`} title={`Actions de la colonne ${nom}`} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <DalIcone nom="Points" />
      </button>
      {ouvert ? (
        <div className="dal-menu dal-bd-menu" role="menu" aria-label={`Actions de la colonne ${nom}`}>
          <button type="button" role="menuitem" className="dal-menu-option" onClick={() => (setOuvert(false), masquer())}>
            <DalIcone nom="Archive" />
            <span>Masquer la colonne</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
