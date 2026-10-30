"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les affaires restées en plan, sur la vue « Board » de Linear
   (28/10/2026, la troisième page de chaque SaaS)

   Ce qui dort au magasin : les commandes arrivées que personne n'est venu
   reprendre, les interventions terminées et non retirées. Une colonne par
   statut réel d'une affaire, dans l'ordre du cycle de la base
   (c4_08_affaires.sql) : en attente → relancée une fois → relancée deux
   fois → à décider, et « le client a répondu » qui en sort. Ce sont les
   cinq statuts que lit offload_affaires_liste ; « close sans suite » et
   « retirée » n'y sont pas (leurs affaires sortent de la liste) : ils
   tiennent dans la colonne « Colonnes masquées » de Linear, à droite, le
   nombre de closes sans suite que la base compte à part en regard.

   Une carte : la référence (et la couleur du compte), le libellé, le
   compte, la valeur immobilisée et les signaux de l'ancien écran (compte
   inactif, absente du dernier export), le temps d'attente. Le point bleu
   (« à traiter ») : une affaire à décider, la seule qui attend un geste.

   Les gestes sont ceux de l'écran du 21/10 (../../espace/offload/Affaires),
   par les mêmes portes : décider (offload_decider_affaire, motif
   obligatoire) et « le client l'a retirée » (offload_retirer_affaire),
   pour une affaire à décider ; ouvrir la fiche du compte (le clic de
   l'ancienne ligne) est dans la fiche de la carte. Glisser une carte « à
   décider » ne vaut que là où le dépôt est l'un de ces gestes :
     · sur « En attente » : décider « Relancer encore » (la base la remet
       en attente), la fenêtre de décision s'ouvre avec son motif ;
     · sur « Closes sans suite » : décider « Clore sans suite » (ou
       « Remettre en stock »), la même fenêtre ;
     · sur « Retirées » : « Le client l'a retirée », sans fenêtre, comme le
       bouton.
   La carte ouverte (?id=) s'affiche à droite sur la page d'un ticket.
   Les menus filtrent la page sans la quitter (?filtre=etat|attente|type|
   compte:valeur, ?traiter=1) ; ↑ ↓ dans une colonne, ← → d'une colonne à
   l'autre, Entrée ouvre, Échap ferme. Gabarit : ../lin/lin.css (bloc « le
   tableau en colonnes ») ; retouches : ./tableau-affaires.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Banknote, Building2, Check, ChevronDown, Copy, Eye, EyeOff, ListFilter, MoreHorizontal, Package, PackageCheck, Scale, SlidersHorizontal, Star, Wrench, X } from "lucide-react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace3/base/source";
import { montant } from "@/components/espace3/base/format";
import { DECISIONS, STATUTS_AFFAIRE, affairesExemple } from "@/components/espace3/base/offload/Affaires";
import { chargerAffaires, deciderAffaire, retirerAffaire, type DecisionAffaire } from "@/components/espace3/base/offload/portes";
import type { AffaireLigne, AffairesListe, StatutAffaire } from "@/components/espace3/base/offload/types";
import { Choix, Menu, MenuActions, useEpingles, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { IconeCalendrier, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { ItemMenu, MenuDeroulant, Note, SectionMenu, SeparateurMenu } from "../ui";
import { useToast } from "../Toasts";
import { RACINE } from "../modules";
import "./offload.css";
import "./tableau-affaires.css";

type Statut = "en_attente" | "relancee_1" | "relancee_2" | "decision" | "repondue";
type Attente = "semaine" | "trois" | "plus";
type Tri = "attente" | "valeur" | "compte";
type Montrer = "toutes" | "a_traiter";
type Cible = "en_attente" | "close" | "retiree";

const ICI = `${RACINE}/offload/affaires`;
const VIDE: AffairesListe = { total: { affaires: 0, valeur_ht: 0, a_decider: 0, closes_sans_suite: 0 }, affaires: [] };
/* les colonnes : les statuts que lit offload_affaires_liste, dans l'ordre du cycle */
const COLONNES: Statut[] = ["en_attente", "relancee_1", "relancee_2", "decision", "repondue"];
const ETAT_PROJET: Record<StatutAffaire, EtatProjet> = {
  en_attente: "planifie",
  relancee_1: "en-cours",
  relancee_2: "en-cours",
  decision: "annule",
  repondue: "fait",
  retiree: "fait",
  close_sans_suite: "fait",
};
const ATTENTES: Record<Attente, string> = { semaine: "Moins d'une semaine", trois: "Une à trois semaines", plus: "Plus de trois semaines" };
const TYPES: Record<AffaireLigne["type"], string> = { commande: "Commande", intervention: "Intervention" };
/* les couleurs d'icône de projet de Linear, une par compte : les mêmes que les deux autres pages */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const deux = (n: number) => String(n).padStart(2, "0");
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
};
const dateCourte = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: iso.slice(0, 4) === aujourdhui().slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
const dateMoyenne = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: iso.slice(0, 4) === aujourdhui().slice(0, 4) ? undefined : "numeric", timeZone: "UTC" })
    .replace(/^1 /, "1er ");
const attenteDe = (a: AffaireLigne): Attente => (a.jours < 7 ? "semaine" : a.jours <= 21 ? "trois" : "plus");
const jours = (n: number) => `${n} jour${n > 1 ? "s" : ""}`;
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const titreDe = (a: AffaireLigne) => (a.libelle ? majuscule(a.libelle) : `${TYPES[a.type]} ${a.reference}`);
const aTraiter = (a: AffaireLigne) => a.statut === "decision";
const estColonne = (s: StatutAffaire): s is Statut => (COLONNES as string[]).includes(s);

/* les filtres de la page, lus dans l'adresse, un par dimension : ?filtre=attente:plus&filtre=type:commande */
type Dimension = "etat" | "attente" | "type" | "compte";
type Filtres = Partial<Record<Dimension, string>>;
const DIMENSIONS: Dimension[] = ["etat", "attente", "type", "compte"];
const TITRES_DIMENSION: Record<Dimension, string> = { etat: "État", attente: "Attente", type: "Type", compte: "Compte" };
const lireFiltres = (valeurs: string[]): Filtres => {
  const f: Filtres = {};
  for (const v of valeurs) {
    const i = v.indexOf(":");
    const dim = v.slice(0, i) as Dimension;
    const val = v.slice(i + 1);
    if (i < 1 || !val || !DIMENSIONS.includes(dim)) continue;
    const valide = dim === "etat" ? (COLONNES as string[]).includes(val) : dim === "attente" ? Object.hasOwn(ATTENTES, val) : dim === "type" ? Object.hasOwn(TYPES, val) : true;
    if (valide) f[dim] = val;
  }
  return f;
};

function IconeStatut({ s }: { s: StatutAffaire }) {
  return <IconeStatutProjet etat={ETAT_PROJET[s]} titre={STATUTS_AFFAIRE[s].libelle} />;
}
function IconeType({ t, taille = 14 }: { t: AffaireLigne["type"]; taille?: number }) {
  return t === "intervention" ? <Wrench width={taille} height={taille} strokeWidth={1.8} aria-hidden="true" /> : <Package width={taille} height={taille} strokeWidth={1.8} aria-hidden="true" />;
}

export default function TableauAffaires() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [exemple, setExemple] = useState<AffairesListe>(() => affairesExemple());
  const [reel, setReel] = useState<AffairesListe | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tri, setTri] = useState<Tri>("attente");
  const [vides, setVides] = useState(true);
  const [masquees, setMasquees] = useState<Statut[]>([]);
  const [recherche, setRecherche] = useState("");
  const [epingles, basculerEpingle] = useEpingles("offload-affaires");
  const [copie, setCopie] = useState<string | null>(null);
  /* la fenêtre « Décider » : l'affaire, la décision proposée (celle du dépôt, ou « garder »), le motif */
  const [aDecider, setADecider] = useState<AffaireLigne | null>(null);
  const [decision, setDecision] = useState<DecisionAffaire>("garder");
  const [motif, setMotif] = useState("");
  const [erreurDecision, setErreurDecision] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /* le glisser : la carte tirée et la colonne (ou la colonne masquée) survolée */
  const [glisse, setGlisse] = useState<string | null>(null);
  const [depot, setDepot] = useState<Cible | null>(null);

  const charger = async () => {
    try {
      setReel(await chargerAffaires());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel(VIDE);
    }
  };
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const l = await chargerAffaires();
        if (actif) setReel(l);
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setReel(VIDE);
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const donnees = source === "exemple" ? exemple : (reel ?? VIDE);
  const lignes = useMemo(() => donnees.affaires.filter((a) => estColonne(a.statut)), [donnees]);
  const id = params.get("id");
  const actifs = lireFiltres(params.getAll("filtre"));
  const traiter = params.get("traiter") === "1";
  const choisie = id ? (lignes.find((a) => a.id === id) ?? null) : null;

  const correspond = (a: AffaireLigne, f: Filtres) => (!f.etat || a.statut === f.etat) && (!f.attente || attenteDe(a) === f.attente) && (!f.type || a.type === f.type) && (!f.compte || a.compte_id === f.compte);
  const sans = (d: Dimension): Filtres => {
    const n = { ...actifs };
    delete n[d];
    return n;
  };
  const avec = (d: Dimension, v: string): Filtres => (actifs[d] === v ? sans(d) : { ...actifs, [d]: v });
  const adresse = (f: Filtres, sel: string | null = id, t: boolean = traiter) => {
    const p = [...(sel ? [`id=${encodeURIComponent(sel)}`] : []), ...DIMENSIONS.filter((d) => f[d]).map((d) => `filtre=${d}:${encodeURIComponent(f[d] ?? "")}`), ...(t ? ["traiter=1"] : [])];
    return `${ICI}${p.length ? `?${p.join("&")}` : ""}`;
  };
  const nbAvec = (d: Dimension, v: string) => lignes.filter((a) => correspond(a, { ...sans(d), [d]: v })).length;
  const libelleFiltre = (d: Dimension, v: string) =>
    d === "etat" ? STATUTS_AFFAIRE[v as Statut].libelle : d === "attente" ? ATTENTES[v as Attente] : d === "type" ? TYPES[v as AffaireLigne["type"]] : (lignes.find((a) => a.compte_id === v)?.compte_nom ?? "Ce compte");
  const iconeFiltre = (d: Dimension, v: string) =>
    d === "etat" ? (
      <IconeStatut s={v as Statut} />
    ) : d === "attente" ? (
      <IconeCalendrier passe={v === "plus"} />
    ) : d === "type" ? (
      <IconeType t={v as AffaireLigne["type"]} taille={14} />
    ) : (
      <Building2 width={14} height={14} aria-hidden="true" style={{ color: couleurDe(v) }} />
    );
  const optionFiltre = (d: Dimension, v: string, plus: Partial<Option> = {}): Option => ({
    cle: `${d}-${v}`,
    libelle: libelleFiltre(d, v),
    meta: pluriel(nbAvec(d, v), "affaire"),
    icone: iconeFiltre(d, v),
    coche: actifs[d] === v,
    /* un filtre se pose en place (replace), sans ajouter d'entrée à l'historique */
    action: () => routeur.replace(adresse(avec(d, v)), { scroll: false }),
    ...plus,
  });
  const valeursDe = (d: Dimension): string[] => {
    const toutes =
      d === "etat"
        ? COLONNES
        : d === "attente"
          ? Object.keys(ATTENTES)
          : d === "type"
            ? Object.keys(TYPES)
            : [...new Set(lignes.map((a) => a.compte_id))].sort((x, y) => libelleFiltre("compte", x).localeCompare(libelleFiltre("compte", y), "fr"));
    return toutes.filter((v) => nbAvec(d, v) > 0 || actifs[d] === v);
  };
  const optionsDe = (d: Dimension) => valeursDe(d).map((v) => optionFiltre(d, v));

  /* les cartes : filtres, recherche, « à traiter seulement », tri ; les épinglées en tête de leur colonne */
  const q = recherche.trim().toLowerCase();
  const visibles = lignes
    .filter((a) => correspond(a, actifs))
    .filter((a) => !traiter || aTraiter(a))
    .filter((a) => !q || `${a.reference} ${a.libelle ?? ""} ${a.compte_nom} ${TYPES[a.type]}`.toLowerCase().includes(q))
    .slice()
    .sort((a, b) =>
      tri === "valeur"
        ? (b.valeur_ht ?? -1) - (a.valeur_ht ?? -1) || b.jours - a.jours
        : tri === "compte"
          ? a.compte_nom.localeCompare(b.compte_nom, "fr") || b.jours - a.jours
          : b.jours - a.jours || (b.valeur_ht ?? -1) - (a.valeur_ht ?? -1),
    )
    .sort((a, b) => Number(epingles.has(b.id)) - Number(epingles.has(a.id)));
  const parColonne = new Map<Statut, AffaireLigne[]>(COLONNES.map((s) => [s, visibles.filter((a) => a.statut === s)]));
  const colonnes = COLONNES.filter((s) => !masquees.includes(s) && (vides || (parColonne.get(s)?.length ?? 0) > 0));
  const montrerTraiter = (t: boolean) => routeur.replace(adresse(actifs, id, t), { scroll: false });

  /* ——— le clavier : ↑ ↓ dans une colonne, ← → d'une colonne à l'autre, Entrée ouvre, Échap ferme ——— */
  const clavier = useRef<{ grille: string[][]; id: string | null; aller: (sel: string | null) => void }>({ grille: [], id: null, aller: () => {} });
  /* ouvrir une carte (ou fermer, null) ; la touche suivante part de la nouvelle carte, sans attendre l'adresse */
  const aller = (sel: string | null) => {
    clavier.current.id = sel;
    routeur.replace(adresse(actifs, sel), { scroll: false });
  };
  useEffect(() => {
    clavier.current = { grille: colonnes.map((s) => (parColonne.get(s) ?? []).map((a) => a.id)).filter((c) => c.length), id, aller };
  });
  useEffect(() => {
    const carte = (x: string) => document.querySelector<HTMLElement>(`.v2 .lin [data-carte="${CSS.escape(x)}"]`);
    const touche = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const cible = ev.target as HTMLElement | null;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      if (document.querySelector(".v2 .lin .lin-menu, .v2-voile, [aria-modal='true']")) return;
      const { grille, id: sel, aller } = clavier.current;
      if (ev.key === "Escape") {
        if (sel) {
          ev.preventDefault();
          aller(null);
          window.setTimeout(() => carte(sel)?.focus(), 0);
        }
        return;
      }
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(ev.key) || !grille.length) return;
      ev.preventDefault();
      /* le point de départ : la carte qui a le focus, sinon la carte ouverte */
      const depart = (cible?.closest<HTMLElement>("[data-carte]")?.dataset.carte ?? sel) || null;
      let c = depart ? grille.findIndex((col) => col.includes(depart)) : -1;
      let r = c >= 0 && depart ? grille[c].indexOf(depart) : -1;
      if (c < 0) {
        c = 0;
        r = 0;
      } else if (ev.key === "ArrowDown") r = Math.min(grille[c].length - 1, r + 1);
      else if (ev.key === "ArrowUp") r = Math.max(0, r - 1);
      else {
        c = ev.key === "ArrowRight" ? Math.min(grille.length - 1, c + 1) : Math.max(0, c - 1);
        r = Math.min(grille[c].length - 1, r);
      }
      const suivante = grille[c][r];
      /* une carte ouverte suit le curseur, comme l'aperçu de Linear ; sinon le focus seul se déplace */
      if (sel && suivante !== sel) aller(suivante);
      window.setTimeout(() => carte(suivante)?.focus({ preventScroll: false }), 0);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);
  useEffect(() => {
    if (id) document.querySelector(".v2 .lin .lin-carte-tableau[data-actif]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [id]);
  /* à la fermeture de la carte du milieu, le focus revient sur sa carte du tableau, une fois le voile parti
     (avant, react-aria garde le focus dans la fenêtre qui s'en va) */
  const derniere = useRef<string | null>(null);
  useEffect(() => {
    if (id) {
      derniere.current = id;
      return;
    }
    const x = derniere.current;
    derniere.current = null;
    if (!x) return;
    let essais = 0;
    const t = window.setInterval(() => {
      essais += 1;
      if (document.querySelector(".v2-val-carte") && essais < 15) return;
      window.clearInterval(t);
      document.querySelector<HTMLElement>(`.v2 .lin [data-carte="${CSS.escape(x)}"]`)?.focus();
    }, 80);
    return () => window.clearInterval(t);
  }, [id]);
  /* une carte ouverte qui n'est plus au tableau (retirée, close sans suite par un geste, ou une adresse ancienne) : la carte se
     referme et l'adresse perd son ?id= ; le geste a déjà dit ce qu'il a fait */
  const chargement = source === "reelle" && reel === null && !erreur;
  useEffect(() => {
    if (id && !choisie && !chargement) routeur.replace(adresse(actifs, null), { scroll: false });
  });

  /* ——— les gestes : les portes de l'ancien écran ; l'exemple est modifié en mémoire ——— */
  const ouvrirDecision = (a: AffaireLigne, d: DecisionAffaire = "garder") => {
    setADecider(a);
    setDecision(d);
    setMotif("");
    setErreurDecision(null);
  };
  const libelleDecision = (d: DecisionAffaire) => DECISIONS.find((x) => x.cle === d)?.libelle ?? d;
  const noterDecision = async () => {
    const a = aDecider;
    const m = motif.trim();
    if (!a || !m || envoi) return;
    const fait = decision === "relancer" ? "Décision notée : un nouveau message de retrait sera préparé, en validation." : "Décision notée au journal.";
    if (source === "reelle") {
      setEnvoi(true);
      setErreurDecision(null);
      try {
        await deciderAffaire(a.id, decision, m);
        setADecider(null);
        toast(`${a.reference} · ${fait}`, "vert");
        await charger();
      } catch (e) {
        setErreurDecision(e instanceof Error ? e.message : "La base a refusé.");
      } finally {
        setEnvoi(false);
      }
      return;
    }
    /* comme la base : relancer → en attente (le cycle repart), garder → reste à décider, le reste → close sans suite */
    setExemple((x) => {
      if (decision === "retour_stock" || decision === "sans_suite") {
        const affaires = x.affaires.filter((y) => y.id !== a.id);
        return {
          affaires,
          total: {
            affaires: affaires.length,
            valeur_ht: affaires.reduce((s, y) => s + (y.valeur_ht ?? 0), 0),
            a_decider: affaires.filter((y) => y.statut === "decision").length,
            closes_sans_suite: x.total.closes_sans_suite + 1,
          },
        };
      }
      const affaires = x.affaires.map((y) => (y.id === a.id ? { ...y, statut: decision === "relancer" ? ("en_attente" as const) : ("decision" as const), motif: m } : y));
      return { affaires, total: { ...x.total, a_decider: affaires.filter((y) => y.statut === "decision").length } };
    });
    setADecider(null);
    toast(`${a.reference} · ${fait} (Exemple : rien n'est écrit en base.)`, "vert");
  };
  const retirer = async (a: AffaireLigne) => {
    if (envoi) return;
    if (source === "reelle") {
      setEnvoi(true);
      try {
        await retirerAffaire(a.id, null);
        toast(`${a.reference} · Retrait noté : l'affaire sort de la liste.`, "vert");
        await charger();
      } catch (e) {
        toast(e instanceof Error ? e.message : "La base a refusé.", "rouge");
      } finally {
        setEnvoi(false);
      }
      return;
    }
    setExemple((x) => {
      const affaires = x.affaires.filter((y) => y.id !== a.id);
      return {
        affaires,
        total: { ...x.total, affaires: affaires.length, valeur_ht: affaires.reduce((s, y) => s + (y.valeur_ht ?? 0), 0), a_decider: affaires.filter((y) => y.statut === "decision").length },
      };
    });
    toast(`${a.reference} · Retrait noté : l'affaire sort de la liste. (Exemple : rien n'est écrit en base.)`, "vert");
  };
  const copier = (a: AffaireLigne) =>
    navigator.clipboard?.writeText(a.reference).then(
      () => {
        setCopie(a.id);
        window.setTimeout(() => setCopie((x) => (x === a.id ? null : x)), 1500);
      },
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );
  const lienFiche = (a: AffaireLigne) => `${RACINE}/offload?compte=${encodeURIComponent(a.compte_id)}`;

  /* ——— le glisser : seule une affaire à décider se tire, et seulement vers un geste ——— */
  const tiree = glisse ? (lignes.find((a) => a.id === glisse) ?? null) : null;
  const accepte = (c: Cible) => !!tiree && tiree.statut === "decision" && (c === "en_attente" || c === "close" || c === "retiree");
  const deposer = (c: Cible) => {
    const a = tiree;
    setGlisse(null);
    setDepot(null);
    if (!a || !accepte(c)) return;
    if (c === "retiree") void retirer(a);
    else ouvrirDecision(a, c === "en_attente" ? "relancer" : "sans_suite");
  };
  const zone = (c: Cible) => ({
    "data-depot": depot === c ? "" : undefined,
    onDragOver: (ev: React.DragEvent) => {
      if (!accepte(c)) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";
      if (depot !== c) setDepot(c);
    },
    onDragLeave: (ev: React.DragEvent) => {
      if (!(ev.currentTarget as HTMLElement).contains(ev.relatedTarget as Node | null) && depot === c) setDepot(null);
    },
    onDrop: (ev: React.DragEvent) => {
      ev.preventDefault();
      deposer(c);
    },
  });

  /* ——— la tête de la page ——— */
  const pastillesFiltres = DIMENSIONS.filter((d) => actifs[d]).map((d) => (
    <Link key={d} href={adresse(sans(d))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false} replace>
      {iconeFiltre(d, actifs[d] ?? "")}
      {libelleFiltre(d, actifs[d] ?? "")} ✕
    </Link>
  ));
  const premiere = visibles.find(aTraiter) ?? null;
  const optionsPage: Option[] = [
    ...(premiere ? [{ cle: "premiere", libelle: "Ouvrir la première à décider", meta: premiere.reference, icone: <Scale width={16} height={16} aria-hidden="true" />, action: () => aller(premiere.id) }] : []),
    ...(masquees.length ? [{ cle: "montrer", libelle: "Montrer les colonnes masquées", meta: String(masquees.length), icone: <Eye width={16} height={16} aria-hidden="true" />, action: () => setMasquees([]) }] : []),
    ...(pastillesFiltres.length || recherche || traiter
      ? [
          {
            cle: "retirer",
            libelle: "Retirer les filtres",
            icone: <X width={16} height={16} aria-hidden="true" />,
            action: () => {
              setRecherche("");
              routeur.replace(adresse({}, id, false), { scroll: false });
            },
          },
        ]
      : []),
  ];

  const tete = (
    <header className="lin-tete">
      <span className="lin-tete-titre">Affaires en plan</span>
      <MenuActions rond aGauche titre="Actions de la page" options={optionsPage} />
      <div className="lin-tete-ronds">
        <button type="button" className="lin-rond" aria-pressed={traiter} aria-label="Seulement ce qui est à traiter" title="Seulement ce qui est à traiter" onClick={() => montrerTraiter(!traiter)}>
          <IconeNonLus />
        </button>
        <Menu
          largeur={300}
          bouton={(ouvert, basculer) => (
            <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={recherche || Object.keys(actifs).length > 0 ? "" : undefined} onClick={basculer}>
              <ListFilter aria-hidden="true" />
            </button>
          )}
        >
          {(fermer) => (
            <div className="lin-aff-menu">
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Référence, libellé, compte…"
                aria-label="Chercher une affaire"
                value={recherche}
                onChange={(ev) => setRecherche(ev.target.value)}
                onKeyDown={(ev) => ev.key === "Enter" && fermer()}
              />
              {DIMENSIONS.map((d) => {
                const options = optionsDe(d);
                return options.length ? (
                  <div key={d} role="group" aria-label={TITRES_DIMENSION[d]}>
                    <p className="lin-aff-menu-titre">{TITRES_DIMENSION[d]}</p>
                    {options.map((o) => (
                      <button
                        key={o.cle}
                        type="button"
                        className="lin-menu-option"
                        aria-pressed={o.coche}
                        onClick={() => {
                          fermer();
                          o.action?.();
                        }}
                      >
                        {o.icone}
                        <span>{o.libelle}</span>
                        <span className="lin-meta">
                          {o.coche ? "✓ " : ""}
                          {o.meta}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null;
              })}
            </div>
          )}
        </Menu>
        <Menu
          largeur={280}
          bouton={(ouvert, basculer) => (
            <button type="button" className="lin-rond" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
              <SlidersHorizontal aria-hidden="true" />
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
                    { cle: "attente", libelle: "La plus ancienne" },
                    { cle: "valeur", libelle: "Valeur immobilisée" },
                    { cle: "compte", libelle: "Compte" },
                  ]}
                />
              </label>
              <label className="lin-reglage">
                Afficher
                <Choix<Montrer>
                  libelle="Afficher"
                  valeur={traiter ? "a_traiter" : "toutes"}
                  onChange={(v) => montrerTraiter(v === "a_traiter")}
                  options={[
                    { cle: "toutes", libelle: "Toutes les affaires" },
                    { cle: "a_traiter", libelle: "À traiter seulement" },
                  ]}
                />
              </label>
              <label className="lin-reglage">
                Colonnes vides
                <Choix<"oui" | "non">
                  libelle="Colonnes vides"
                  valeur={vides ? "oui" : "non"}
                  onChange={(v) => setVides(v === "oui")}
                  options={[
                    { cle: "oui", libelle: "Montrer" },
                    { cle: "non", libelle: "Masquer" },
                  ]}
                />
              </label>
            </div>
          )}
        </Menu>
      </div>
    </header>
  );

  /* ——— une colonne ——— */
  const colonne = (s: Statut) => {
    const cartes = parColonne.get(s) ?? [];
    const valeur = cartes.reduce((t, a) => t + (a.valeur_ht ?? 0), 0);
    const cible: Cible | null = s === "en_attente" ? "en_attente" : null;
    const optionsColonne: Option[] = [
      ...(cartes.length ? [{ cle: "premiere", libelle: "Ouvrir la première", meta: cartes[0].reference, icone: <ArrowDown width={16} height={16} aria-hidden="true" />, action: () => aller(cartes[0].id) }] : []),
      optionFiltre("etat", s, { libelle: actifs.etat === s ? "Toutes les colonnes" : "Seulement cette colonne" }),
      { cle: "masquer", libelle: "Masquer la colonne", icone: <EyeOff width={16} height={16} aria-hidden="true" />, action: () => setMasquees((m) => [...m, s]) },
    ];
    return (
      <section key={s} className="lin-colonne" aria-label={STATUTS_AFFAIRE[s].libelle} data-statut={s}>
        <header className="lin-colonne-tete">
          <span className="lin-colonne-nom">
            <IconeStatut s={s} />
            <h3>{STATUTS_AFFAIRE[s].libelle}</h3>
            <span className="lin-colonne-compte">{cartes.length}</span>
            {valeur > 0 ? (
              <span className="lin-colonne-compte lin-aff-valeur" title="Valeur immobilisée (HT)">
                {montant(valeur)}
              </span>
            ) : null}
          </span>
          <div className="lin-tete-ronds">
            <MenuActions rond titre={`Colonne « ${STATUTS_AFFAIRE[s].libelle} »`} options={optionsColonne} />
          </div>
        </header>
        <div className="lin-colonne-corps" {...(cible ? zone(cible) : {})}>
          {cartes.length ? cartes.map((a) => carte(a)) : <div className="lin-colonne-vide">Rien ici</div>}
        </div>
      </section>
    );
  };

  /* ——— une carte ——— */
  const carte = (a: AffaireLigne) => {
    const actif = a.id === id;
    const tirable = a.statut === "decision";
    const pastilles: React.ReactNode[] = [
      <span key="compte" className="lin-carte-pastille">
        <Building2 aria-hidden="true" strokeWidth={1.8} />
        {a.compte_nom}
      </span>,
      <span key="valeur" className="lin-carte-pastille">
        <Banknote aria-hidden="true" strokeWidth={1.8} />
        {a.valeur_ht !== null ? montant(a.valeur_ht) : "—"}
      </span>,
      ...(a.compte_niveau === "eteint"
        ? [
            <span key="inactif" className="lin-carte-pastille">
              Compte inactif
            </span>,
          ]
        : []),
      ...(a.plus_vue
        ? [
            <span key="export" className="lin-carte-pastille">
              Absente du dernier export
            </span>,
          ]
        : []),
    ];
    return (
      <Link
        key={a.id}
        href={adresse(actifs, a.id)}
        scroll={false}
        className="lin-carte-tableau"
        data-carte={a.id}
        data-actif={actif ? "" : undefined}
        data-glisse={glisse === a.id ? "" : undefined}
        aria-current={actif ? "true" : undefined}
        draggable={tirable}
        title={tirable ? "Glisser sur « En attente » (relancer encore), « Closes sans suite » ou « Retirées »" : undefined}
        onDragStart={(ev) => {
          if (!tirable) {
            ev.preventDefault();
            return;
          }
          ev.dataTransfer.setData("text/plain", a.reference);
          ev.dataTransfer.effectAllowed = "move";
          setGlisse(a.id);
        }}
        onDragEnd={() => {
          setGlisse(null);
          setDepot(null);
        }}
      >
        <span className="lin-carte-ref">
          <span className="lin-aff-ref">
            {aTraiter(a) ? <span className="lin-boite-point" role="img" aria-label="À traiter" /> : null}
            {a.reference}
            {epingles.has(a.id) ? <Star className="lin-aff-etoile" fill="currentColor" aria-label="Épinglée" /> : null}
          </span>
          <Building2 aria-hidden="true" strokeWidth={1.8} />
        </span>
        <span className="lin-carte-titre">
          <IconeStatut s={a.statut} />
          <span>{titreDe(a)}</span>
        </span>
        <span className="lin-carte-pastilles">{pastilles.slice(0, 3)}</span>
        <span className="lin-carte-pied">
          {jours(a.jours)} d&apos;attente · depuis le {dateCourte(a.disponible_le)}
        </span>
      </Link>
    );
  };

  /* ——— les colonnes masquées (« Hidden columns » de Linear) : celles qu'on a masquées, puis les deux issues hors liste ——— */
  const enGlisse = !!tiree && tiree.statut === "decision";
  const masqueesBloc = (
    <section className="lin-colonne lin-aff-masquees" aria-label="Colonnes masquées">
      <header className="lin-colonne-tete">
        <span className="lin-colonne-nom">
          <h3>Colonnes masquées</h3>
        </span>
      </header>
      <div className="lin-aff-masquees-corps">
        {masquees.map((s) => (
          <button key={s} type="button" className="lin-aff-masquee" title="Montrer la colonne" onClick={() => setMasquees((m) => m.filter((x) => x !== s))}>
            <IconeStatut s={s} />
            <span>{STATUTS_AFFAIRE[s].libelle}</span>
            <span className="lin-colonne-compte">{parColonne.get(s)?.length ?? 0}</span>
          </button>
        ))}
        <div className="lin-aff-masquee" data-issue="" data-cible={enGlisse ? "" : undefined} {...zone("close")} title="Comptées à part : elles ne sont plus dans la liste">
          <IconeStatut s="close_sans_suite" />
          <span>Closes sans suite</span>
          <span className="lin-colonne-compte">{donnees.total.closes_sans_suite}</span>
        </div>
        <div className="lin-aff-masquee" data-issue="" data-cible={enGlisse ? "" : undefined} {...zone("retiree")} title="Une affaire retirée sort de la liste">
          <IconeStatut s="retiree" />
          <span>Retirées</span>
        </div>
        {enGlisse ? <p className="lin-aff-masquees-aide">Déposez sur « En attente » pour relancer encore, ici pour clore ou noter le retrait.</p> : null}
      </div>
    </section>
  );

  /* ——— la carte ouverte (?id=) : au milieu de l'écran, la carte de décision d'« À valider » (CarteCentrale) ———
     Teo, 28/10 : « plutôt que d'ouvrir un truc sur la droite, ça ouvre une card au milieu ». */
  const ordreTableau = colonnes.flatMap((s) => parColonne.get(s) ?? []);
  /* passer à une autre carte depuis la carte ouverte (‹ ›, ← →, les autres affaires du compte) : le clavier du tableau dort */
  const ouvrir = (sel: string) => routeur.replace(adresse(actifs, sel), { scroll: false });
  const fermer = () => aller(null);
  const carteOuverte = (a: AffaireLigne) => {
    const epinglee = epingles.has(a.id);
    const rang = ordreTableau.findIndex((x) => x.id === a.id);
    const precedente = rang > 0 ? ordreTableau[rang - 1].id : null;
    const suivante = rang >= 0 && rang < ordreTableau.length - 1 ? ordreTableau[rang + 1].id : null;
    const decidable = a.statut === "decision";
    const memeCompte = lignes.filter((x) => x.compte_id === a.compte_id && x.id !== a.id);
    const valeur = a.valeur_ht !== null ? montant(a.valeur_ht) : null;
    const ic = { width: 16, height: 16, "aria-hidden": true } as const;

    /* le fil : la mise à disposition, le signal d'export, puis l'état (une phrase d'OFFLOAD, ou la décision qui attend) */
    const phrase: Record<Statut, string> = {
      en_attente: "relancera le client après le délai fixé, puis une seule autre fois. Le message de retrait ne parle jamais de paiement.",
      relancee_1: "a relancé le client une fois. Sans réponse, une seconde relance suivra.",
      relancee_2: "a relancé le client deux fois. Sans réponse, l'affaire passe en décision.",
      decision: "Relancée deux fois sans réponse : à décider.",
      repondue: "La conversation revient au magasin.",
    };
    const fil: { cle: string; icone: React.ReactNode; qui: string; quoi: string; quand?: string; commentaire?: string | null }[] = [
      { cle: "dispo", icone: <IconeType t={a.type} taille={14} />, qui: a.type === "intervention" ? "Intervention terminée" : "Commande arrivée", quoi: "disponible au magasin", quand: dateCourte(a.disponible_le) },
      ...(a.plus_vue ? [{ cle: "export", icone: <IconeCalendrier />, qui: "Absente du dernier export", quoi: "à vérifier au magasin" }] : []),
      a.statut === "decision"
        ? { cle: "etat", icone: <IconeStatut s={a.statut} />, qui: "À décider", quoi: `${jours(a.jours)} d'attente`, commentaire: a.motif ?? phrase.decision }
        : a.statut === "repondue"
          ? { cle: "etat", icone: <IconeStatut s={a.statut} />, qui: "Le client a répondu", quoi: phrase.repondue, commentaire: a.motif }
          : { cle: "etat", icone: <IconeStatut s={a.statut} />, qui: "OFFLOAD", quoi: phrase[a.statut as Statut], commentaire: a.motif },
    ];

    /* « Plus d'actions » : ce qui n'a pas de bouton à soi — épingler, copier, les filtres en place des anciennes pilules */
    const lienCompte = lienFiche(a);
    const plus = (
      <MenuDeroulant etiquette="Plus d'actions" classe="v2-btn v2-btn--fantome v2-btn--icone" placement="top end" largeur={280} declencheur={<MoreHorizontal width={16} height={16} aria-hidden="true" />}>
        <SectionMenu>
          <ItemMenu icone={<Star {...ic} fill={epinglee ? "currentColor" : "none"} />} onAction={() => basculerEpingle(a.id)}>
            {epinglee ? "Désépingler" : "Épingler en haut de la colonne"}
          </ItemMenu>
          <ItemMenu icone={<Copy {...ic} />} suffixe={a.reference} onAction={() => void copier(a)}>
            Copier la référence
          </ItemMenu>
          {decidable ? (
            <ItemMenu icone={<Building2 {...ic} />} onAction={() => routeur.push(lienCompte)}>
              Ouvrir la fiche du compte
            </ItemMenu>
          ) : null}
        </SectionMenu>
        <SeparateurMenu />
        <SectionMenu titre="Montrer dans le tableau">
          <ItemMenu
            icone={<Building2 {...ic} style={{ color: couleurDe(a.compte_id) }} />}
            suffixe={actifs.compte === a.compte_id ? "✓" : undefined}
            onAction={() => routeur.replace(adresse(avec("compte", a.compte_id)), { scroll: false })}
          >
            {actifs.compte === a.compte_id ? "Toutes les affaires" : "Les affaires de ce compte"}
          </ItemMenu>
          <ItemMenu icone={<IconeStatut s={a.statut} />} suffixe={actifs.etat === a.statut ? "✓" : undefined} onAction={() => routeur.replace(adresse(avec("etat", a.statut)), { scroll: false })}>
            {actifs.etat === a.statut ? "Toutes les colonnes" : `Seulement « ${STATUTS_AFFAIRE[a.statut].libelle} »`}
          </ItemMenu>
          <ItemMenu
            icone={<IconeCalendrier passe={attenteDe(a) === "plus"} />}
            suffixe={actifs.attente === attenteDe(a) ? "✓" : undefined}
            onAction={() => routeur.replace(adresse(avec("attente", attenteDe(a))), { scroll: false })}
          >
            {`Attente : ${ATTENTES[attenteDe(a)].toLowerCase()}`}
          </ItemMenu>
          <ItemMenu icone={<IconeType t={a.type} taille={16} />} suffixe={actifs.type === a.type ? "✓" : undefined} onAction={() => routeur.replace(adresse(avec("type", a.type)), { scroll: false })}>
            {`Type : ${TYPES[a.type].toLowerCase()}`}
          </ItemMenu>
        </SectionMenu>
      </MenuDeroulant>
    );

    return (
      <CarteCentrale
        ouverte
        fermer={fermer}
        libelle={`Affaire ${a.reference}`}
        sur={`OFFLOAD · ${TYPES[a.type]}`}
        statut={
          <>
            <IconeStatut s={a.statut} />
            {STATUTS_AFFAIRE[a.statut].libelle}
          </>
        }
        nav={{
          position: rang + 1,
          total: ordreTableau.length,
          precedente: precedente ? () => ouvrir(precedente) : undefined,
          suivante: suivante ? () => ouvrir(suivante) : undefined,
        }}
        gauche={
          <Feuille
            titre={TYPES[a.type]}
            sous={a.reference}
            nom={a.compte_nom}
            sousNom={[`Disponible depuis le ${dateMoyenne(a.disponible_le)}`]}
            lignes={[[titreDe(a), valeur ?? "—"]]}
            total={valeur ? ["Immobilisé (HT)", valeur] : null}
          />
        }
        piedGauche={
          <>
            <div className="v2-det-document-ligne">
              <span className="v2-det-mono">{a.reference}</span>
              <span className="v2-det-sous">
                {TYPES[a.type]} · {STATUTS_AFFAIRE[a.statut].libelle.toLowerCase()}
              </span>
            </div>
            <div className="v2-det-document-ligne">
              <span className="v2-det-sous">{a.compte_nom}</span>
              <Link href={lienCompte} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
                Ouvrir le compte
              </Link>
            </div>
          </>
        }
        titre={titreDe(a)}
        chiffre={valeur}
        echeance={{ texte: `Disponible depuis le ${dateCourte(a.disponible_le)} · ${jours(a.jours)} d'attente`, urgence: decidable ? "retard" : undefined }}
        notes={
          decidable ? (
            <Note teinte="bleu">
              <strong>Une décision dit pourquoi.</strong> Le motif est obligatoire et noté au journal ; « Relancer encore » prépare un nouveau message de retrait, en validation.
            </Note>
          ) : null
        }
        actions={
          decidable ? (
            <>
              <button type="button" className="v2-btn v2-btn--primaire" onClick={() => ouvrirDecision(a)}>
                <Scale {...ic} /> Décider…
              </button>
              <button type="button" className="v2-btn v2-btn--fantome" disabled={envoi} onClick={() => void retirer(a)}>
                <PackageCheck {...ic} /> Le client l&apos;a retirée
              </button>
              {plus}
            </>
          ) : (
            <>
              <Link href={lienCompte} className="v2-btn v2-btn--primaire">
                <Building2 {...ic} /> Ouvrir la fiche du compte
              </Link>
              <button type="button" className="v2-btn v2-btn--fantome" onClick={() => void copier(a)}>
                {copie === a.id ? <Check {...ic} /> : <Copy {...ic} />} {copie === a.id ? "Copiée" : "Copier la référence"}
              </button>
              {plus}
            </>
          )
        }
      >
        <dl className="v2-det-fiche lin-aff-carte">
          <dt>Compte</dt>
          <dd>
            {a.compte_nom}
            {a.compte_niveau === "eteint" ? <span className="v2-det-sous"> · compte inactif</span> : null}
          </dd>
          <dt>Référence</dt>
          <dd>
            <span className="v2-det-mono">{a.reference}</span> <span className="v2-det-sous">· {TYPES[a.type].toLowerCase()}</span>
          </dd>
          <dt>Disponible le</dt>
          <dd>
            {dateMoyenne(a.disponible_le)} <span className="v2-det-sous">· {ATTENTES[attenteDe(a)].toLowerCase()}</span>
          </dd>
          <dt>Valeur</dt>
          <dd>{valeur ? `${valeur} HT immobilisés` : "Inconnue"}</dd>
          {a.plus_vue ? (
            <>
              <dt>Signal</dt>
              <dd>Absente du dernier export</dd>
            </>
          ) : null}
        </dl>

        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">Activité</h3>
          <ol className="v2-det-fil">
            {fil.map((x) => (
              <li key={x.cle}>
                <span className="v2-det-fil-avatar lin-aff-fil-icone" aria-hidden="true">
                  {x.icone}
                </span>
                <div>
                  <div className="v2-det-fil-texte">
                    <strong>{x.qui}</strong>
                    <span>
                      {x.quoi}
                      {x.quand ? ` · ${x.quand}` : ""}
                    </span>
                  </div>
                  {x.commentaire ? <p className="v2-det-fil-commentaire">{x.commentaire}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {memeCompte.length ? (
          <div className="v2-det-bloc">
            <h3 className="v2-det-section-titre">
              Les autres affaires du compte
              <small>{memeCompte.length}</small>
            </h3>
            <ul className="lin-aff-autres">
              {memeCompte.slice(0, 5).map((x) => (
                <li key={x.id}>
                  <button type="button" className="lin-aff-autre" onClick={() => ouvrir(x.id)}>
                    <IconeStatut s={x.statut} />
                    <span className="v2-det-mono">{x.reference}</span>
                    <span className="lin-aff-autre-nom">{titreDe(x)}</span>
                    <span className="v2-det-sous">{jours(x.jours)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CarteCentrale>
    );
  };

  /* ——— la fenêtre « Décider » de l'écran d'avant : la décision et son motif obligatoire ——— */
  const fenetreDecision = (
    <ModalOverlay isOpen={!!aDecider} onOpenChange={(o) => !o && !envoi && setADecider(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
      <Modal className="v2-modale">
        <Dialog className="v2-modale-dialogue">
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void noterDecision();
            }}
          >
            <div className="v2-modale-corps">
              <Heading slot="title">Décider de l&apos;affaire</Heading>
              <p>
                {aDecider
                  ? `${aDecider.compte_nom} — ${TYPES[aDecider.type].toLowerCase()} ${aDecider.reference}${aDecider.libelle ? ` (${aDecider.libelle})` : ""}, ${jours(aDecider.jours)} d'attente${aDecider.valeur_ht !== null ? `, ${montant(aDecider.valeur_ht)} immobilisés` : ""}.`
                  : ""}{" "}
                La décision est notée au journal avec son motif.
              </p>
              <div className="v2-grille-champs">
                <label className="v2-libelle">
                  Décision
                  <span className="v2-champ">
                    <select value={decision} onChange={(ev) => setDecision(ev.target.value as DecisionAffaire)}>
                      {DECISIONS.map((d) => (
                        <option key={d.cle} value={d.cle}>
                          {d.libelle}
                        </option>
                      ))}
                    </select>
                    <ChevronDown width={16} height={16} aria-hidden="true" style={{ pointerEvents: "none" }} />
                  </span>
                </label>
                <label className="v2-libelle">
                  Pourquoi (obligatoire)
                  <span className="v2-champ">
                    <input autoFocus value={motif} onChange={(ev) => setMotif(ev.target.value)} maxLength={500} placeholder="Le client a annulé par téléphone." />
                  </span>
                </label>
              </div>
              <p className="v2-aide" style={{ margin: 0 }}>
                {decision === "relancer"
                  ? "L'affaire repart en attente : un nouveau message de retrait sera préparé, en validation."
                  : decision === "garder"
                    ? "L'affaire reste à décider."
                    : `« ${libelleDecision(decision)} » clôt l'affaire : elle sort du tableau et compte parmi les closes sans suite.`}
              </p>
              {erreurDecision ? (
                <Note teinte="rouge" role="alert">
                  <strong>Refusé par la base.</strong> {erreurDecision}
                </Note>
              ) : null}
            </div>
            <div className="v2-modale-pied">
              <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                Annuler
              </Button>
              <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!motif.trim() || envoi}>
                {envoi ? "Enregistrement…" : "Noter la décision"}
              </button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">Affaires restées en plan</h1>
      {tete}
      {pastillesFiltres.length || recherche ? (
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Filtres actifs">
            {pastillesFiltres}
            {recherche ? (
              <button type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer la recherche" onClick={() => setRecherche("")}>
                « {recherche} » ✕
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
      {erreur ? <p className="lin-vide">La base réelle n&apos;a pas répondu : {erreur}</p> : null}
      {chargement ? (
        <p className="lin-vide">Lecture des affaires en attente…</p>
      ) : lignes.length === 0 && !erreur ? (
        <p className="lin-vide">
          Rien ne dort au magasin. Importez la liste de ce qui attend son retrait (commandes arrivées, réparations terminées) ou saisissez une affaire depuis la fiche d&apos;un compte.
          {donnees.total.closes_sans_suite
            ? ` ${pluriel(donnees.total.closes_sans_suite, "affaire")} close${donnees.total.closes_sans_suite > 1 ? "s" : ""} sans suite, comptée${donnees.total.closes_sans_suite > 1 ? "s" : ""} à part.`
            : ""}
        </p>
      ) : (
        <div className="lin-tableau-page">
          <div className="lin-tableau" aria-label="Affaires en attente de retrait, par état">
            {colonnes.map(colonne)}
            {masqueesBloc}
          </div>
        </div>
      )}
      {choisie ? carteOuverte(choisie) : null}
      {fenetreDecision}
    </div>
  );
}
