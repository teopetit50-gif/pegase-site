"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT — les sujets autorisés, sur la vue « Board » de Linear (28/10/2026)

   La troisième page de REPUT (/espace2/reput/sujets). Chaque sujet (et
   chaque message type : accusés de réception, demandes d'avis) est une
   carte, rangée dans la colonne de son accord permanent :

     · Toujours relu     aucun accord, ou un accord refusé, révoqué, expiré
     · Accord à activer  proposé, un autre décideur l'active dans « À valider »
     · Part seul         accord actif : les réponses tirées de la base partent seules
     · Relu par principe réclamation, urgence, parler à une personne, hors sujet :
                         ne s'autorisent jamais

   Ce sont les états de l'ancien écran (components/espace/reput/
   SujetsAutorises) ; rien d'autre n'existe. Le point bleu = à traiter :
   un accord à activer, ou expiré.

   Glisser une carte ne fait que les gestes de l'ancien écran : de
   « Toujours relu » à « Accord à activer » = « Autoriser l'envoi seul » ;
   d'« À activer » à « Part seul » = « Activer moi-même », seulement quand
   on est le seul décideur ; d'« À activer » ou « Part seul » vers
   « Toujours relu » = « Révoquer », avec son motif. Le reste ne se glisse
   pas. La carte ouverte (?sujet=<code>) s'affiche à droite, comme un
   ticket : ses gestes, son service, son délai de traitement, ses demandes,
   son activité.

   Filtres dans l'adresse (?filtre=service:<id>&filtre=genre:message,
   ?traiter=1), posés en `replace` sur la même route. Clavier : ↑/↓ dans
   une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre, Échap ferme.

   Mêmes données et mêmes portes que l'ancien écran : l'exemple
   (mondeExemple, modifié en mémoire) ou la base réelle (chargerMonde sous
   RLS, en temps réel ; reput_donner_accord, reput_revoquer_accord,
   reput_activer_accord_seul, reput_envoi_automatique, reput_fixer_delai,
   reput_router_sujet). Gabarit : ../lin/lin.css ; en plus : ./reput.css et
   ./tableau-sujets.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, ChevronUp, Clock, Download, ListFilter, Lock, Mail, MessageSquare, Power, Send, ShieldCheck, ShieldOff, SlidersHorizontal, Star, Zap } from "lucide-react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { csvDemandes, telecharger } from "@/components/espace/reput/export";
import { activerAccordSeul, chargerMonde, donnerAccord, envoiAutomatique, fixerDelai, monClient, revoquerAccord, routerSujet } from "@/components/espace/reput/portes";
import type { AccordSujet, Client, Demande, Monde, StatutDemande } from "@/components/espace/reput/types";
import { Choix, Menu, MenuActions, MenuOptions, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeCalendrier, IconeDiese, IconeGroupe, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { useToast } from "../Toasts";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import "./reput.css";
import "./tableau-sujets.css";

const CHEMIN = `${RACINE}/reput/sujets`;

/* ——— les colonnes : les états de l'accord de l'ancien écran ——— */
type Colonne = "relu" | "a_activer" | "part_seul" | "principe";
const COLONNES: { cle: Colonne; nom: string; hexa: EtatProjet | null }[] = [
  { cle: "relu", nom: "Toujours relu", hexa: "planifie" },
  { cle: "a_activer", nom: "Accord à activer", hexa: "en-cours" },
  { cle: "part_seul", nom: "Part seul", hexa: "fait" },
  { cle: "principe", nom: "Relu par principe", hexa: null },
];
const colonneDe = (a: AccordSujet): Colonne => (!a.autorisable ? "principe" : a.statut === "active" ? "part_seul" : a.statut === "a_valider" ? "a_activer" : "relu");
/* les libellés de l'ancien écran (ETATS de SujetsAutorises) */
const ETATS: Record<AccordSujet["statut"], string> = {
  aucun: "Toujours relu",
  a_valider: "Accord à activer",
  active: "Part seul",
  refusee: "Accord refusé",
  revoquee: "Accord révoqué",
  expire: "Accord expiré",
};
/* à traiter (le point bleu) : un accord qui attend un décideur, ou qui a expiré */
const aTraiter = (a: AccordSujet) => a.autorisable && (a.statut === "a_valider" || a.statut === "expire");

const STATUTS_DEMANDE: Record<StatutDemande, string> = {
  a_preparer: "En préparation",
  a_valider: "Réponse à valider",
  a_traiter: "À traiter vous-même",
  validee: "Validée, en partance",
  envoyee: "Répondue",
  refusee: "Réponse refusée",
  bloquee: "Envoi bloqué",
  ignoree: "Écartée",
};

/* ——— les filtres, dans l'adresse ——— */
type Dimension = "service" | "genre";
type Genre = "sujet" | "message";
const DIMENSIONS: Dimension[] = ["service", "genre"];
const GENRES: Record<Genre, string> = { sujet: "Sujets de demande", message: "Messages types" };
type Filtres = Partial<Record<Dimension, string>>;
type Tri = "ordre" | "nom" | "parties" | "delai";

const genreDe = (a: AccordSujet): Genre => (a.genre === "message" ? "message" : "sujet");
const pluriel = (n: number, mot: string, pl = `${mot}s`) => `${n} ${n > 1 ? pl : mot}`;
const dateLongue = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const dateCourte = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—");
const nomDe = (d: Demande) => d.de_nom || d.adresse_reponse || "Client";

/* l'icône d'état d'une carte : l'hexagone de Linear ; un cadenas pour ce qui ne s'autorise jamais */
function IconeEtat({ a }: { a: AccordSujet }) {
  const c = colonneDe(a);
  if (c === "principe") return <Lock className="lin-ic sujets-cadenas" width={14} height={14} aria-label="Relu par principe" />;
  return <IconeStatutProjet etat={COLONNES.find((x) => x.cle === c)!.hexa!} titre={ETATS[a.statut]} />;
}
function IconeColonne({ c }: { c: Colonne }) {
  const col = COLONNES.find((x) => x.cle === c)!;
  return col.hexa ? <IconeStatutProjet etat={col.hexa} titre={col.nom} /> : <Lock className="lin-ic sujets-cadenas" width={14} height={14} aria-hidden="true" />;
}

/* la saisie que demande un geste : le motif d'une révocation ou d'une coupure, les heures d'un délai */
type Saisie = { quoi: "revoquer"; a: AccordSujet; valeur: string } | { quoi: "couper"; valeur: string } | { quoi: "delai"; a: AccordSujet; valeur: string };

/* ══════════════════════════════════════════════════════════════════════ */

export default function TableauSujets() {
  const { source } = useSource();
  const maintenant = useMaintenant();
  const [local, setLocal] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<{ monde: Monde; client: Client } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

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

  const vide = (texte: string) => (
    <div className="lin">
      <h1 className="v2-sr">Sujets autorisés</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Sujets autorisés</span>
      </header>
      <p className="lin-vide">{texte}</p>
    </div>
  );
  if (erreur) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  /* le monde d'exemple est daté à l'heure du visiteur : rien avant le montage (voir ../horloge.ts) */
  const monde = source === "exemple" ? local : (reel?.monde ?? null);
  if (!monde || maintenant === null) return vide("Lecture des sujets…");
  const client = source === "reelle" ? (reel?.client ?? null) : null;
  const role = source === "exemple" ? "valideur" : (client?.role ?? "lecteur");
  return <Tableau m={monde} source={source} client={client} role={role} maint={maintenant} relire={charger} setLocal={setLocal} />;
}

function Tableau({
  m,
  source,
  client,
  role,
  maint,
  relire,
  setLocal,
}: {
  m: Monde;
  source: "exemple" | "reelle";
  client: Client | null;
  role: string;
  maint: number;
  relire: () => Promise<void>;
  setLocal: React.Dispatch<React.SetStateAction<Monde>>;
}) {
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [tri, setTri] = useState<Tri>("ordre");
  const [videsVisibles, setVidesVisibles] = useState<"oui" | "non">("oui");
  const [q, setQ] = useState("");
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [depot, setDepot] = useState<Colonne | null>(null);
  const [epingles, basculerEpingle] = useEpingles("reput-sujets");

  /* les droits de l'ancien écran : le gérant ou l'administrateur, quand la base le permet ; tout sur l'exemple */
  const dirige = source === "exemple" ? true : m.accords.peut_donner && (role === "gerant" || role === "admin");
  const equipes = m.equipes ?? [];
  const sujetDe = (a: AccordSujet) => (a.genre === "message" ? undefined : m.sujets.find((x) => x.code === a.sujet));
  const serviceDe = (a: AccordSujet) => {
    const s = sujetDe(a);
    return s?.equipe_id ? (equipes.find((e) => e.id === s.equipe_id) ?? null) : null;
  };

  /* ——— l'adresse : ?sujet=<code>, ?filtre=dimension:valeur, ?traiter=1 ——— */
  const cleParams = params.toString();
  const filtres: Filtres = useMemo(() => {
    const p = new URLSearchParams(cleParams);
    const f: Filtres = {};
    for (const brut of p.getAll("filtre")) {
      const i = brut.indexOf(":");
      const dim = brut.slice(0, i) as Dimension;
      const v = brut.slice(i + 1);
      if (i > 0 && DIMENSIONS.includes(dim) && v && (dim !== "genre" || v in GENRES)) f[dim] = v;
    }
    return f;
  }, [cleParams]);
  const traiter = params.get("traiter") === "1";
  const idOuvert = params.get("sujet");
  const actifs = DIMENSIONS.filter((d) => filtres[d]);
  const adresse = useCallback(
    (modif: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(cleParams);
      modif(p);
      const qs = p.toString().replace(/%3A/gi, ":");
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [cleParams],
  );
  const lienSujet = useCallback((code: string | null) => adresse((p) => (code ? p.set("sujet", code) : p.delete("sujet"))), [adresse]);
  const lienFiltres = (f: Filtres) =>
    adresse((p) => {
      p.delete("filtre");
      for (const d of DIMENSIONS) if (f[d]) p.append("filtre", `${d}:${f[d]}`);
    });
  const basculeFiltre = (dim: Dimension, v: string) => {
    const f = { ...filtres };
    if (f[dim] === v) delete f[dim];
    else f[dim] = v;
    return lienFiltres(f);
  };
  const sansFiltre = (dim: Dimension) => {
    const f = { ...filtres };
    delete f[dim];
    return lienFiltres(f);
  };
  const lienSansFiltres = adresse((p) => {
    p.delete("filtre");
    p.delete("traiter");
  });
  const aller = useCallback((href: string) => routeur.replace(href, { scroll: false }), [routeur]);

  /* ——— les cartes ——— */
  const tous = useMemo(() => m.accords.sujets.filter((a) => a.actif), [m]);
  const correspond = useCallback(
    (a: AccordSujet, f: Filtres, avecTraiter = true) => {
      if (avecTraiter && traiter && !aTraiter(a)) return false;
      if (f.genre && genreDe(a) !== f.genre) return false;
      if (f.service) {
        const s = a.genre === "message" ? undefined : m.sujets.find((x) => x.code === a.sujet);
        if ((s?.equipe_id ?? "tous") !== f.service) return false;
      }
      if (q.trim()) {
        const texte = `${a.libelle} ${a.sujet} ${ETATS[a.statut]}`.toLowerCase();
        if (!texte.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    },
    [traiter, q, m],
  );
  const colonnes = useMemo(() => {
    const ordre = (a: AccordSujet, b: AccordSujet) => {
      const delai = (x: AccordSujet) => (x.genre === "message" ? 9999 : (m.sujets.find((s) => s.code === x.sujet)?.delai_heures ?? 9999));
      if (tri === "nom") return a.libelle.localeCompare(b.libelle, "fr");
      if (tri === "parties") return b.envoyees_seules_mois - a.envoyees_seules_mois || a.libelle.localeCompare(b.libelle, "fr");
      if (tri === "delai") return delai(a) - delai(b) || a.libelle.localeCompare(b.libelle, "fr");
      return 0;
    };
    return COLONNES.map((c) => {
      const cartes = tous.filter((a) => colonneDe(a) === c.cle && correspond(a, filtres)).sort(ordre);
      /* les épinglées d'abord, chacune des deux parts dans l'ordre courant */
      return { ...c, cartes: [...cartes.filter((a) => epingles.has(a.sujet)), ...cartes.filter((a) => !epingles.has(a.sujet))] };
    }).filter((c) => videsVisibles === "oui" || c.cartes.length > 0);
  }, [tous, filtres, correspond, tri, epingles, videsVisibles, m]);
  const ouvert = idOuvert ? (tous.find((a) => a.sujet === idOuvert) ?? null) : null;

  /* ——— les gestes : les portes de l'ancien écran, ou l'exemple en mémoire ——— */
  const changer = (sujet: string, statut: AccordSujet["statut"], extra: Partial<AccordSujet> = {}) =>
    setLocal((x) => ({ ...x, accords: { ...x.accords, sujets: x.accords.sujets.map((s) => (s.sujet === sujet ? { ...s, statut, ...extra } : s)) } }));
  const echec = (e: unknown) => toast(e instanceof Error ? e.message : "La base n'a pas répondu.", "rouge");

  const agir = async (a: AccordSujet, quoi: "donner" | "revoquer" | "activer", motif = "") => {
    setEnvoi(a.sujet);
    try {
      if (source === "reelle" && client) {
        if (quoi === "donner") await donnerAccord(client.client_id, a.sujet);
        else if (quoi === "revoquer") await revoquerAccord(client.client_id, a.sujet, motif.trim());
        else await activerAccordSeul(client.client_id, a.sujet);
        await relire();
      } else changer(a.sujet, quoi === "donner" ? "a_valider" : quoi === "revoquer" ? "revoquee" : "active");
      toast(
        quoi === "donner"
          ? `Accord proposé pour « ${a.libelle} » : un autre décideur l'active dans « À valider ».`
          : quoi === "revoquer"
            ? `Accord révoqué : les réponses « ${a.libelle} » attendent de nouveau votre validation.`
            : `Accord activé : les réponses « ${a.libelle} » tirées de votre base partent seules.`,
        "vert",
      );
      return true;
    } catch (e) {
      echec(e);
      return false;
    } finally {
      setEnvoi(null);
    }
  };
  const router = async (a: AccordSujet, equipe: string | null) => {
    setEnvoi(a.sujet);
    try {
      if (source === "reelle" && client) {
        await routerSujet(client.client_id, a.sujet, equipe);
        await relire();
      } else setLocal((x) => ({ ...x, sujets: x.sujets.map((s) => (s.code === a.sujet ? { ...s, equipe_id: equipe } : s)) }));
      toast(equipe ? "Ce sujet va désormais au service choisi : seuls ses membres valident ses réponses." : "Ce sujet est de nouveau décidé par tous les décideurs.", "vert");
    } catch (e) {
      echec(e);
    } finally {
      setEnvoi(null);
    }
  };
  const auto = m.reglages?.envoi_auto ?? true;
  const basculerAuto = async (actif: boolean, motif = "") => {
    setEnvoi("__auto__");
    try {
      if (source === "reelle" && client) {
        const r = await envoiAutomatique(client.client_id, actif, motif.trim() || undefined);
        await relire();
        toast(
          !actif
            ? `Envoi automatique coupé : ${r.revoques} accord${r.revoques > 1 ? "s" : ""} révoqué${r.revoques > 1 ? "s" : ""}, tout est de nouveau relu.`
            : r.a_activer_par_un_autre
              ? `Envoi automatique demandé sur ${r.proposes} sujet${r.proposes > 1 ? "s" : ""} : un autre décideur l'active dans « À valider ».`
              : "Envoi automatique activé : les réponses tirées de votre base partent seules, sauf retenue.",
          "vert",
        );
      } else {
        setLocal((x) => ({
          ...x,
          reglages: x.reglages ? { ...x.reglages, envoi_auto: actif } : x.reglages,
          accords: {
            ...x.accords,
            sujets: x.accords.sujets.map((a) => (a.autorisable && a.genre !== "message" ? { ...a, statut: actif ? "active" : "revoquee", fin: actif ? new Date(Date.now() + 365 * 86_400_000).toISOString() : a.fin } : a)),
          },
        }));
        toast(actif ? "Envoi automatique activé : les réponses tirées de votre base partent seules, sauf retenue." : "Envoi automatique coupé : tout est de nouveau relu.", "vert");
      }
      return true;
    } catch (e) {
      echec(e);
      return false;
    } finally {
      setEnvoi(null);
    }
  };
  const changerDelai = async (a: AccordSujet, heures: number) => {
    setEnvoi(a.sujet);
    try {
      if (source === "reelle" && client) {
        await fixerDelai(client.client_id, a.sujet, heures);
        await relire();
      } else setLocal((x) => ({ ...x, sujets: x.sujets.map((s) => (s.code === a.sujet ? { ...s, delai_heures: heures } : s)) }));
      toast(`Délai de traitement fixé à ${heures} h.`, "vert");
      return true;
    } catch (e) {
      echec(e);
      return false;
    } finally {
      setEnvoi(null);
    }
  };

  /* les gestes possibles sur une carte, dans l'ordre de l'ancien écran */
  const gestesDe = (a: AccordSujet): Option[] => {
    if (!dirige || !a.autorisable) return [];
    const o: Option[] = [];
    if (a.statut === "active" || a.statut === "a_valider")
      o.push({ cle: "revoquer", libelle: "Révoquer l'accord…", meta: "→ Toujours relu", icone: <ShieldOff width={16} height={16} />, action: () => envoi === null && setSaisie({ quoi: "revoquer", a, valeur: "" }) });
    else o.push({ cle: "donner", libelle: "Autoriser l'envoi seul", meta: "→ À activer", icone: <ShieldCheck width={16} height={16} />, action: () => envoi === null && void agir(a, "donner") });
    if (a.statut === "a_valider" && m.accords.seul_decideur)
      o.push({ cle: "activer", libelle: "Activer moi-même (seul décideur)", meta: "→ Part seul", icone: <Check width={16} height={16} />, action: () => envoi === null && void agir(a, "activer") });
    return o;
  };
  const ouvrirDelai = (a: AccordSujet) => {
    const d = sujetDe(a)?.delai_heures;
    if (d && dirige && envoi === null) setSaisie({ quoi: "delai", a, valeur: String(d) });
  };

  /* ——— glisser une carte : seulement les passages qui sont un geste de l'ancien écran ——— */
  const passage = (a: AccordSujet, vers: Colonne): "donner" | "activer" | "revoquer" | null => {
    if (!dirige || !a.autorisable || envoi !== null) return null;
    const de = colonneDe(a);
    if (de === "relu" && vers === "a_activer") return "donner";
    if (de === "a_activer" && vers === "part_seul" && m.accords.seul_decideur) return "activer";
    if ((de === "a_activer" || de === "part_seul") && vers === "relu") return "revoquer";
    return null;
  };
  const peutGlisser = (a: AccordSujet) => COLONNES.some((c) => passage(a, c.cle) !== null);
  const carteGlissee = glisse ? (tous.find((a) => a.sujet === glisse) ?? null) : null;
  const deposer = (vers: Colonne) => {
    const a = carteGlissee;
    setGlisse(null);
    setDepot(null);
    if (!a) return;
    const p = passage(a, vers);
    if (p === "revoquer") setSaisie({ quoi: "revoquer", a, valeur: "" });
    else if (p) void agir(a, p);
  };

  /* ——— le clavier : ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre, Échap ferme ——— */
  const grille = colonnes.map((c) => c.cartes.map((a) => a.sujet)).filter((c) => c.length);
  const cleGrille = grille.map((c) => c.join(",")).join("|");
  useEffect(() => {
    const g = cleGrille ? cleGrille.split("|").map((c) => c.split(",")) : [];
    const carte = (code: string) => document.querySelector<HTMLElement>(`.lin-carte-tableau[data-carte="${CSS.escape(code)}"]`);
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || saisie) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin .lin-menu, .v2-voile")) return;
      if (e.key === "Escape") {
        if (idOuvert) {
          e.preventDefault();
          aller(lienSujet(null));
          window.setTimeout(() => carte(idOuvert)?.focus({ preventScroll: true }), 0);
        }
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) || !g.length) return;
      e.preventDefault();
      const focalise = (document.activeElement as HTMLElement | null)?.dataset?.carte ?? null;
      const actuel = idOuvert && g.some((col) => col.includes(idOuvert)) ? idOuvert : focalise;
      let ci = actuel ? g.findIndex((col) => col.includes(actuel)) : -1;
      let ri = ci >= 0 ? g[ci].indexOf(actuel!) : -1;
      if (ci < 0) {
        ci = 0;
        ri = 0;
      } else if (e.key === "ArrowDown") ri = Math.min(g[ci].length - 1, ri + 1);
      else if (e.key === "ArrowUp") ri = Math.max(0, ri - 1);
      else {
        ci = e.key === "ArrowRight" ? Math.min(g.length - 1, ci + 1) : Math.max(0, ci - 1);
        ri = Math.min(g[ci].length - 1, ri);
      }
      const cible = g[ci][ri];
      if (idOuvert && cible !== idOuvert) aller(lienSujet(cible));
      const el = carte(cible);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cleGrille, idOuvert, saisie, aller, lienSujet]);

  /* ——— la tête de la page ——— */
  const premier = colonnes.flatMap((c) => c.cartes).find(aTraiter) ?? null;
  const nbATraiter = tous.filter(aTraiter).length;
  const exporter = () => telecharger(`demandes-clients-${new Date(maint).toISOString().slice(0, 10)}.csv`, csvDemandes(m));
  const actionsPage: Option[] = [
    ...(premier ? [{ cle: "premier", libelle: "Ouvrir le premier à traiter", meta: premier.libelle, icone: <IconeNonLus />, action: () => aller(lienSujet(premier.sujet)) }] : []),
    ...(dirige
      ? [
          auto
            ? { cle: "couper", libelle: "Couper l'envoi automatique…", meta: "voulu", icone: <Power width={16} height={16} />, action: () => envoi === null && setSaisie({ quoi: "couper", valeur: "" }) }
            : { cle: "activer-auto", libelle: "Activer l'envoi automatique", meta: "coupé", icone: <Zap width={16} height={16} />, action: () => envoi === null && void basculerAuto(true) },
          ...(auto ? [{ cle: "tout", libelle: "Tout autoriser d'un coup", icone: <ShieldCheck width={16} height={16} />, action: () => envoi === null && void basculerAuto(true) }] : []),
        ]
      : []),
    { cle: "exporter", libelle: "Exporter les demandes vers un tableur", icone: <Download width={16} height={16} />, action: exporter },
    ...(actifs.length || traiter || q
      ? [
          {
            cle: "effacer",
            libelle: "Effacer les filtres",
            icone: <ListFilter width={16} height={16} />,
            action: () => {
              setQ("");
              aller(lienSansFiltres);
            },
          },
        ]
      : []),
  ];
  /* les chiffres d'un menu de filtre comptent sans le filtre de sa propre dimension */
  const compte = (dim: Dimension, v: string) => {
    const f = { ...filtres, [dim]: v };
    return tous.filter((a) => correspond(a, f)).length;
  };
  const groupesFiltre: { dim: Dimension; titre: string; valeurs: { v: string; libelle: string; icone: React.ReactNode }[] }[] = [
    {
      dim: "genre",
      titre: "Genre",
      valeurs: (Object.keys(GENRES) as Genre[]).filter((g) => tous.some((a) => genreDe(a) === g)).map((g) => ({ v: g, libelle: GENRES[g], icone: g === "message" ? <Mail width={16} height={16} /> : <IconeDiese /> })),
    },
    {
      dim: "service",
      titre: "Service qui décide",
      valeurs: equipes.length ? [{ v: "tous", libelle: "Tous les décideurs", icone: <IconeGroupe /> }, ...equipes.map((e) => ({ v: e.id, libelle: e.nom, icone: <IconeGroupe /> }))] : [],
    },
  ];
  const libelleFiltre = (dim: Dimension, v: string) => groupesFiltre.find((g) => g.dim === dim)?.valeurs.find((x) => x.v === v) ?? { libelle: v, icone: <IconeDiese /> };

  const tete = (
    <header className="lin-tete">
      <span className="lin-tete-titre">Sujets autorisés</span>
      <MenuActions rond aGauche titre="Actions de la page" options={actionsPage} />
      <div className="lin-tete-ronds">
        <button
          type="button"
          className="lin-rond"
          aria-pressed={traiter}
          aria-label="Seulement ce qui est à traiter"
          title={`Seulement ce qui est à traiter${nbATraiter ? ` (${nbATraiter})` : ""}`}
          onClick={() => aller(adresse((p) => (traiter ? p.delete("traiter") : p.set("traiter", "1"))))}
        >
          <IconeNonLus />
        </button>
        <Menu
          largeur={300}
          bouton={(o, basculer) => (
            <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={o} aria-pressed={actifs.length > 0 || !!q} onClick={basculer}>
              <ListFilter aria-hidden="true" />
            </button>
          )}
        >
          {(fermerMenu) => (
            <>
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Chercher un sujet…"
                aria-label="Chercher un sujet"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermerMenu()}
              />
              {groupesFiltre.map((g) =>
                g.valeurs.length ? (
                  <div key={g.dim}>
                    <div className="lin-menu-section" style={{ paddingBottom: 0 }}>
                      <span className="lin-reglage">{g.titre}</span>
                    </div>
                    {g.valeurs.map((x) => (
                      <Link key={x.v} href={basculeFiltre(g.dim, x.v)} className="lin-menu-option" scroll={false} replace onClick={fermerMenu}>
                        {x.icone}
                        <span>{x.libelle}</span>
                        <span className="lin-meta">{compte(g.dim, x.v)}</span>
                        {filtres[g.dim] === x.v ? <Check width={14} height={14} aria-label="filtre posé" /> : null}
                      </Link>
                    ))}
                  </div>
                ) : null,
              )}
            </>
          )}
        </Menu>
        <Menu
          largeur={300}
          bouton={(o, basculer) => (
            <button type="button" className="lin-rond" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={o} onClick={basculer}>
              <SlidersHorizontal aria-hidden="true" />
            </button>
          )}
        >
          {() => (
            <>
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri
                  <Choix<Tri>
                    libelle="Tri"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "ordre", libelle: "Ordre des sujets" },
                      { cle: "nom", libelle: "Nom" },
                      { cle: "parties", libelle: "Parties seules ce mois" },
                      { cle: "delai", libelle: "Délai de traitement" },
                    ]}
                  />
                </label>
              </div>
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Colonnes vides
                  <Choix<"oui" | "non">
                    libelle="Colonnes vides"
                    valeur={videsVisibles}
                    onChange={setVidesVisibles}
                    options={[
                      { cle: "oui", libelle: "Affichées" },
                      { cle: "non", libelle: "Masquées" },
                    ]}
                  />
                </label>
              </div>
            </>
          )}
        </Menu>
      </div>
    </header>
  );

  /* ——— une colonne ——— */
  const optionsColonne = (c: Colonne, cartes: AccordSujet[]): Option[] => {
    const o: Option[] = [];
    if (cartes[0]) o.push({ cle: "premier", libelle: "Ouvrir la première carte", meta: cartes[0].libelle, icone: <IconeColonne c={c} />, action: () => aller(lienSujet(cartes[0].sujet)) });
    const aTraiterIci = cartes.find(aTraiter);
    if (aTraiterIci && aTraiterIci !== cartes[0]) o.push({ cle: "traiter", libelle: "Ouvrir le premier à traiter", meta: aTraiterIci.libelle, icone: <IconeNonLus />, action: () => aller(lienSujet(aTraiterIci.sujet)) });
    if (dirige && (c === "relu" || c === "a_activer") && auto)
      o.push({ cle: "tout", libelle: "Tout autoriser d'un coup", icone: <ShieldCheck width={16} height={16} />, action: () => envoi === null && void basculerAuto(true) });
    if (dirige && c === "relu" && !auto) o.push({ cle: "activer-auto", libelle: "Activer l'envoi automatique", icone: <Zap width={16} height={16} />, action: () => envoi === null && void basculerAuto(true) });
    if (dirige && c === "part_seul" && auto)
      o.push({ cle: "couper", libelle: "Couper l'envoi automatique…", icone: <Power width={16} height={16} />, action: () => envoi === null && setSaisie({ quoi: "couper", valeur: "" }) });
    if (videsVisibles === "oui" && !cartes.length) o.push({ cle: "vides", libelle: "Masquer les colonnes vides", icone: <SlidersHorizontal width={16} height={16} />, action: () => setVidesVisibles("non") });
    return o;
  };
  const carte = (a: AccordSujet) => {
    const s = sujetDe(a);
    const service = serviceDe(a);
    const c = colonneDe(a);
    const glissable = peutGlisser(a);
    const pastilles: React.ReactNode[] = [];
    if (a.statut === "refusee" || a.statut === "revoquee" || a.statut === "expire")
      pastilles.push(
        <span key="etat" className="lin-carte-pastille" data-teinte={a.statut === "expire" ? "orange" : undefined}>
          {a.statut === "expire" ? <IconeCalendrier passe /> : <ShieldOff aria-hidden="true" />}
          {ETATS[a.statut]}
        </span>,
      );
    if (s?.delai_heures)
      pastilles.push(
        <span key="delai" className="lin-carte-pastille" title="Délai de traitement">
          <Clock aria-hidden="true" />
          {s.delai_heures} h
        </span>,
      );
    if (a.statut === "active" && a.envoyees_seules_mois)
      pastilles.push(
        <span key="parties" className="lin-carte-pastille" title="Réponses parties seules ce mois-ci">
          <Send aria-hidden="true" />
          {a.envoyees_seules_mois} ce mois
        </span>,
      );
    const pied =
      a.statut === "active"
        ? `Jusqu'au ${dateLongue(a.fin)}`
        : a.statut === "a_valider"
          ? m.accords.seul_decideur
            ? "À activer vous-même"
            : "Un autre décideur l'active"
          : a.statut === "expire" && a.fin
            ? `Expiré le ${dateLongue(a.fin)}`
            : c === "principe"
              ? "Ne s'autorise jamais"
              : genreDe(a) === "message"
                ? "Message type, relu avant envoi"
                : "Relu avant envoi";
    return (
      <Link
        key={a.sujet}
        href={lienSujet(a.sujet)}
        scroll={false}
        replace
        className="lin-carte-tableau"
        data-carte={a.sujet}
        data-actif={a.sujet === idOuvert ? "" : undefined}
        data-glisse={glisse === a.sujet ? "" : undefined}
        data-non-lu={aTraiter(a) ? "" : undefined}
        aria-current={a.sujet === idOuvert ? "true" : undefined}
        draggable={glissable}
        onDragStart={(e) => {
          if (!glissable) return;
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", a.sujet);
          setGlisse(a.sujet);
        }}
        onDragEnd={() => {
          setGlisse(null);
          setDepot(null);
        }}
        onClick={() => {
          if (window.innerWidth < 900) window.setTimeout(() => document.getElementById("sujets-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
        }}
      >
        <span className="lin-carte-ref">
          <span className="sujets-ref">
            {aTraiter(a) ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
            {a.sujet}
          </span>
          {service ? (
            <span title={`Décidé par ${service.nom}`}>
              <IconeGroupe titre={`Décidé par ${service.nom}`} />
            </span>
          ) : genreDe(a) === "message" ? (
            <Mail aria-label="Message type" />
          ) : null}
        </span>
        <span className="lin-carte-titre">
          <IconeEtat a={a} />
          <span>{a.libelle}</span>
        </span>
        {pastilles.length ? <span className="lin-carte-pastilles">{pastilles.slice(0, 3)}</span> : null}
        <span className="lin-carte-pied">{pied}</span>
      </Link>
    );
  };

  const tableau = (
    <div className="lin-tableau" aria-label="Sujets par état de l'accord">
      {colonnes.map((c) => {
        const cible = carteGlissee ? passage(carteGlissee, c.cle) : null;
        return (
          <section key={c.cle} className="lin-colonne" aria-label={c.nom}>
            <header className="lin-colonne-tete">
              <span className="lin-colonne-nom">
                <IconeColonne c={c.cle} />
                <h3>{c.nom}</h3>
                <span className="lin-colonne-compte">{c.cartes.length}</span>
              </span>
              <div className="lin-tete-ronds">
                <MenuActions rond titre={`Actions : ${c.nom}`} options={optionsColonne(c.cle, c.cartes)} />
              </div>
            </header>
            <div
              className="lin-colonne-corps"
              data-depot={depot === c.cle && cible ? "" : undefined}
              data-cible={carteGlissee && cible ? "" : undefined}
              onDragOver={(e) => {
                if (!cible) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (depot !== c.cle) setDepot(c.cle);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null) && depot === c.cle) setDepot(null);
              }}
              onDrop={(e) => {
                if (!cible) return;
                e.preventDefault();
                deposer(c.cle);
              }}
            >
              {c.cartes.length ? (
                c.cartes.map(carte)
              ) : (
                <div className="lin-colonne-vide">{cible ? (cible === "donner" ? "Autoriser l'envoi seul" : cible === "activer" ? "Activer moi-même" : "Révoquer l'accord") : "Rien ici"}</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="lin sujets">
      <h1 className="v2-sr">Sujets autorisés</h1>
      {tete}
      {actifs.length || q ? (
        <div className="lin-outils sujets-filtres">
          {actifs.map((dim) => {
            const { libelle, icone } = libelleFiltre(dim, filtres[dim] ?? "");
            return (
              <Link key={dim} href={sansFiltre(dim)} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false} replace>
                {icone}
                {libelle} ✕
              </Link>
            );
          })}
          {q ? (
            <button type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer la recherche" onClick={() => setQ("")}>
              « {q} » ✕
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="lin-tableau-page">
        {tableau}
        {ouvert ? (
          <Fiche
            key={ouvert.sujet}
            a={ouvert}
            m={m}
            colonne={colonnes.find((c) => c.cartes.some((x) => x.sujet === ouvert.sujet)) ?? null}
            dirige={dirige}
            envoi={envoi}
            gestes={gestesDe(ouvert)}
            epinglee={epingles.has(ouvert.sujet)}
            basculerEpingle={() => basculerEpingle(ouvert.sujet)}
            aller={aller}
            lienSujet={lienSujet}
            basculeFiltre={basculeFiltre}
            filtres={filtres}
            router={(eq) => void router(ouvert, eq)}
            ouvrirDelai={() => ouvrirDelai(ouvert)}
          />
        ) : idOuvert ? (
          <section className="lin-boite-detail" aria-label="Sujet introuvable">
            <header className="lin-tete">
              <div className="lin-tete-ronds">
                <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={() => aller(lienSujet(null))}>
                  <IconeBoiteX />
                </button>
              </div>
            </header>
            <p className="lin-vide">Ce sujet n&apos;existe pas, ou n&apos;est plus actif{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.</p>
          </section>
        ) : null}
      </div>
      <Fenetre saisie={saisie} setSaisie={setSaisie} envoi={envoi !== null} agir={agir} basculerAuto={basculerAuto} changerDelai={changerDelai} />
    </div>
  );
}

/* ——— la carte ouverte : la page d'un ticket de Linear ——— */
function Fiche({
  a,
  m,
  colonne,
  dirige,
  envoi,
  gestes,
  epinglee,
  basculerEpingle,
  aller,
  lienSujet,
  basculeFiltre,
  filtres,
  router,
  ouvrirDelai,
}: {
  a: AccordSujet;
  m: Monde;
  colonne: { cle: Colonne; nom: string; cartes: AccordSujet[] } | null;
  dirige: boolean;
  envoi: string | null;
  gestes: Option[];
  epinglee: boolean;
  basculerEpingle: () => void;
  aller: (href: string) => void;
  lienSujet: (code: string | null) => string;
  basculeFiltre: (dim: Dimension, v: string) => string;
  filtres: Filtres;
  router: (equipe: string | null) => void;
  ouvrirDelai: () => void;
}) {
  const sujet = a.genre === "message" ? undefined : m.sujets.find((x) => x.code === a.sujet);
  const equipes = m.equipes ?? [];
  const service = sujet?.equipe_id ? (equipes.find((e) => e.id === sujet.equipe_id) ?? null) : null;
  const c = colonneDe(a);
  const demandes = a.genre === "message" ? [] : m.demandes.filter((d) => d.sujet === a.sujet).sort((x, y) => y.recu_le.localeCompare(x.recu_le));
  const cartes = colonne?.cartes ?? [];
  const rang = cartes.findIndex((x) => x.sujet === a.sujet);
  const precedente = rang > 0 ? cartes[rang - 1] : null;
  const suivante = rang >= 0 && rang < cartes.length - 1 ? cartes[rang + 1] : null;
  const voirActivite = () => document.getElementById("sujets-activite")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const fermer = () => aller(lienSujet(null));

  /* une phrase : ce que l'accord fait aujourd'hui (le bandeau et les lignes de l'ancien écran) */
  const description =
    sujet?.description ||
    (c === "principe"
      ? "Réclamations, urgences, demandes de parler à quelqu'un et hors sujet ne s'autorisent jamais : chaque réponse est relue par une personne."
      : a.statut === "active"
        ? "Une réponse entièrement tirée de votre base part seule, dans la minute ; une réponse hors base, urgente ou corrigée est toujours relue."
        : a.statut === "a_valider"
          ? m.accords.seul_decideur
            ? "L'accord est proposé. Vous êtes le seul décideur de l'organisation : vous pouvez l'activer vous-même."
            : "L'accord est proposé : un autre décideur l'active dans « À valider ». D'ici là, chaque réponse est relue."
          : "Par défaut, rien ne part sans votre validation. Autorisé, l'accord dure un an et se révoque à tout moment.");

  const optionsService: Option[] = [
    ...(dirige && sujet && equipes.length
      ? [
          { cle: "tous", libelle: "Tous les décideurs", icone: <IconeGroupe />, coche: !sujet.equipe_id, action: () => envoi === null && sujet.equipe_id && router(null) },
          ...equipes.map((e) => ({ cle: e.id, libelle: e.nom, icone: <IconeGroupe />, coche: sujet.equipe_id === e.id, action: () => envoi === null && sujet.equipe_id !== e.id && router(e.id) })),
        ]
      : []),
    ...(sujet && equipes.length
      ? [
          {
            cle: "filtre",
            libelle: "Filtrer le tableau sur ce service",
            icone: <ListFilter width={16} height={16} />,
            coche: filtres.service === (sujet.equipe_id ?? "tous"),
            href: basculeFiltre("service", sujet.equipe_id ?? "tous"),
          },
        ]
      : []),
  ];
  const optionsDelai: Option[] = [
    ...(dirige && sujet?.delai_heures ? [{ cle: "changer", libelle: "Changer le délai de traitement…", meta: `${sujet.delai_heures} h`, icone: <Clock width={16} height={16} />, action: ouvrirDelai }] : []),
    { cle: "activite", libelle: "Voir l'activité", icone: <MessageSquare width={16} height={16} />, action: voirActivite },
  ];
  const optionsDates: Option[] = [
    ...(dirige && sujet?.delai_heures ? [{ cle: "changer", libelle: "Changer le délai de traitement…", meta: `${sujet.delai_heures} h`, icone: <Clock width={16} height={16} />, action: ouvrirDelai }] : []),
    ...(a.statut === "active" && a.fin ? [{ cle: "fin", libelle: `Accord jusqu'au ${dateLongue(a.fin)}`, icone: <IconeCalendrier />, action: voirActivite }] : []),
    ...(a.statut === "expire" && a.fin ? [{ cle: "fin", libelle: `Accord expiré le ${dateLongue(a.fin)}`, icone: <IconeCalendrier passe />, action: voirActivite }] : []),
    ...(a.active_le ? [{ cle: "debut", libelle: `Accord donné le ${dateLongue(a.active_le)}`, icone: <IconeCalendrier />, action: voirActivite }] : []),
    { cle: "activite", libelle: "Voir l'activité", icone: <MessageSquare width={16} height={16} />, action: voirActivite },
  ];
  const optionsGenre: Option[] = [
    { cle: "filtre", libelle: `Filtrer : ${GENRES[genreDe(a)].toLowerCase()}`, icone: <ListFilter width={16} height={16} />, coche: filtres.genre === genreDe(a), href: basculeFiltre("genre", genreDe(a)) },
  ];
  const actionsTete: Option[] = [
    ...(precedente ? [{ cle: "precedente", libelle: "Carte précédente", meta: "↑", icone: <ChevronUp width={16} height={16} />, action: () => aller(lienSujet(precedente.sujet)) }] : []),
    ...(suivante ? [{ cle: "suivante", libelle: "Carte suivante", meta: "↓", icone: <ChevronDown width={16} height={16} />, action: () => aller(lienSujet(suivante.sujet)) }] : []),
    ...gestes,
    ...(dirige && sujet?.delai_heures ? [{ cle: "delai", libelle: "Changer le délai de traitement…", meta: `${sujet.delai_heures} h`, icone: <Clock width={16} height={16} />, action: ouvrirDelai }] : []),
    { cle: "activite", libelle: "Voir l'activité", icone: <MessageSquare width={16} height={16} />, action: voirActivite },
  ];

  /* l'activité : l'accord donné, sa fin, ce qui est parti seul ; puis la décision qui attend */
  const ic = { width: 14, height: 14, "aria-hidden": true as const };
  const fil: { cle: string; icone: React.ReactNode; texte: React.ReactNode }[] = [];
  if (a.active_le)
    fil.push({
      cle: "donne",
      icone: <ShieldCheck {...ic} />,
      texte: (
        <>
          <b>Accord donné</b>
          {a.donne_par_libelle ? ` par ${a.donne_par_libelle}` : ""} · {dateCourte(a.active_le)}
        </>
      ),
    });
  if (a.statut === "active" && a.fin)
    fil.push({
      cle: "fin",
      icone: <IconeCalendrier />,
      texte: (
        <>
          <b>Jusqu&apos;au</b> {dateLongue(a.fin)}, révocable à tout moment
        </>
      ),
    });
  if (a.statut === "active")
    fil.push({
      cle: "parties",
      icone: <Send {...ic} />,
      texte: (
        <>
          <b>{pluriel(a.envoyees_seules_mois, "réponse")}</b> partie{a.envoyees_seules_mois > 1 ? "s" : ""} seule{a.envoyees_seules_mois > 1 ? "s" : ""} ce mois-ci
        </>
      ),
    });
  if (a.statut === "revoquee" || a.statut === "refusee")
    fil.push({
      cle: "fini",
      icone: <ShieldOff {...ic} />,
      texte: (
        <>
          <b>{ETATS[a.statut]}</b> : les réponses sont de nouveau relues
        </>
      ),
    });
  if (a.statut === "expire")
    fil.push({
      cle: "expire",
      icone: <IconeCalendrier passe />,
      texte: (
        <>
          <b>Accord expiré</b>
          {a.fin ? ` le ${dateLongue(a.fin)}` : ""} : les réponses sont de nouveau relues
        </>
      ),
    });
  if (sujet?.delai_heures)
    fil.push({
      cle: "delai",
      icone: <Clock {...ic} />,
      texte: (
        <>
          <b>Délai de traitement</b> {sujet.delai_heures} h : passé ce délai, la demande remonte au responsable
        </>
      ),
    });
  const attente = gestes.length
    ? a.statut === "a_valider"
      ? m.accords.seul_decideur
        ? "Accord proposé : vous pouvez l'activer vous-même."
        : "Accord proposé : un autre décideur l'active dans « À valider »."
      : a.statut === "active"
        ? null
        : "Chaque réponse sur ce sujet attend votre validation."
    : null;

  return (
    <section className="lin-boite-detail" id="sujets-fiche" aria-label={`Le sujet ${a.libelle}`}>
      <header className="lin-tete">
        <span className="lin-tete-ref">{a.sujet}</span>
        <span className="lin-tete-nom">{a.libelle}</span>
        <button
          type="button"
          className="lin-rond"
          aria-pressed={epinglee}
          aria-label={epinglee ? "Désépingler" : "Épingler en haut de sa colonne"}
          title={epinglee ? "Désépingler" : "Épingler en haut de sa colonne"}
          onClick={basculerEpingle}
        >
          <Star fill={epinglee ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <MenuActions rond aGauche titre="Actions" options={actionsTete} />
        <div className="lin-tete-ronds">
          <button type="button" className="lin-rond" aria-label="Voir l'activité" title="Voir l'activité" onClick={voirActivite}>
            <Bell aria-hidden="true" />
          </button>
          <MenuOptions rond aDroite libelle="Dates" titre="Période de l'accord…" declencheur={<Clock aria-hidden="true" />} options={optionsDates} largeur={300} />
          <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={fermer}>
            <IconeBoiteX />
          </button>
        </div>
      </header>

      <div className="lin-ticket">
        <article className="lin-ticket-corps">
          <h2 className="lin-ticket-titre">{a.libelle}</h2>
          <p className="lin-ticket-desc">{description}</p>
          {gestes.length || (dirige && sujet?.delai_heures) ? (
            <div className="lin-ticket-icones">
              {gestes.map((g) => (
                <button key={g.cle} type="button" className="lin-ticket-icone" aria-label={g.libelle.replace("…", "")} title={g.libelle.replace("…", "")} disabled={envoi !== null} onClick={g.action}>
                  {g.icone}
                </button>
              ))}
              {dirige && sujet?.delai_heures ? (
                <button type="button" className="lin-ticket-icone" aria-label="Changer le délai de traitement" title="Changer le délai de traitement" disabled={envoi !== null} onClick={ouvrirDelai}>
                  <Clock aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}

          {demandes.length ? (
            <ul className="lin-ticket-sous" aria-label={`Les demandes « ${a.libelle} »`}>
              {demandes.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <Link href={`${RACINE}/reput?demande=${encodeURIComponent(d.id)}`} className="lin-ticket-sous-ligne" title={`${nomDe(d)} · ${STATUTS_DEMANDE[d.statut]}`}>
                    <MessageSquare width={14} height={14} aria-hidden="true" className="sujets-sous-icone" />
                    <span className="lin-ticket-sous-ref">{nomDe(d)}</span>
                    <span className="lin-ticket-sous-nom">{d.objet || STATUTS_DEMANDE[d.statut]}</span>
                    <span className="lin-ticket-sous-meta">{dateCourte(d.recu_le)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <hr className="lin-ticket-trait" />
          <div className="lin-ticket-activite-tete" id="sujets-activite">
            <h3>Activité</h3>
          </div>
          <ul className="lin-ticket-fil">
            {fil.map((l) => (
              <li key={l.cle}>
                {l.icone}
                <span>{l.texte}</span>
              </li>
            ))}
            {c === "principe" ? (
              <li>
                <Lock {...ic} />
                <span className="lin-ticket-fil-texte">Toujours relu, par principe.</span>
              </li>
            ) : attente ? (
              <li>
                <IconeEtat a={a} />
                <div>
                  <span className="lin-ticket-fil-texte">{attente}</span>
                  <div className="lin-ticket-fil-actions">
                    {gestes.map((g, i) => (
                      <button key={g.cle} type="button" className="v2-btn v2-btn--petit" data-actif={i === gestes.length - 1 && g.cle !== "revoquer" ? "" : undefined} disabled={envoi !== null} onClick={g.action}>
                        {g.libelle}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ) : !fil.length ? (
              <li>
                <IconeEtat a={a} />
                <span className="lin-ticket-fil-texte">{ETATS[a.statut]}.</span>
              </li>
            ) : null}
          </ul>
        </article>

        <aside className="lin-ticket-cote" aria-label="Propriétés du sujet">
          <section className="lin-ticket-section">
            <h3>Propriétés</h3>
            <div className="lin-ticket-pilules">
              {gestes.length ? (
                <MenuOptions
                  raccourci="s"
                  titre="Changer l'accord…"
                  declencheur={
                    <>
                      <IconeEtat a={a} />
                      {ETATS[a.statut]}
                    </>
                  }
                  options={gestes}
                  largeur={320}
                />
              ) : (
                <span className="lin-ticket-pilule">
                  <IconeEtat a={a} />
                  {c === "principe" ? "Relu par principe" : ETATS[a.statut]}
                </span>
              )}
              {sujet && equipes.length ? (
                <MenuOptions
                  raccourci="v"
                  titre="Service qui décide…"
                  declencheur={
                    <>
                      <IconeGroupe />
                      {service?.nom ?? "Tous les décideurs"}
                    </>
                  }
                  options={optionsService}
                  largeur={300}
                />
              ) : null}
              {sujet?.delai_heures ? (
                <MenuOptions
                  raccourci="d"
                  titre="Délai de traitement…"
                  declencheur={
                    <>
                      <Clock aria-hidden="true" />
                      Traité sous {sujet.delai_heures} h
                    </>
                  }
                  options={optionsDelai}
                  largeur={300}
                />
              ) : null}
            </div>
          </section>
          <section className="lin-ticket-section">
            <h3>Étiquettes</h3>
            <div className="lin-ticket-pilules">
              <MenuOptions
                titre="Genre…"
                declencheur={
                  <>
                    {genreDe(a) === "message" ? <Mail aria-hidden="true" /> : <IconeDiese />}
                    {genreDe(a) === "message" ? "Message type" : "Sujet de demande"}
                  </>
                }
                options={optionsGenre}
              />
              {a.statut === "active" && a.fin ? (
                <span className="lin-ticket-pilule lin-ticket-sous-pilule">
                  <IconeCalendrier />
                  Jusqu&apos;au {dateLongue(a.fin)}
                </span>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

/* ——— la fenêtre d'un geste qui demande un mot : le motif d'une révocation ou d'une coupure, le délai ——— */
function Fenetre({
  saisie,
  setSaisie,
  envoi,
  agir,
  basculerAuto,
  changerDelai,
}: {
  saisie: Saisie | null;
  setSaisie: (s: Saisie | null) => void;
  envoi: boolean;
  agir: (a: AccordSujet, quoi: "revoquer", motif: string) => Promise<boolean>;
  basculerAuto: (actif: boolean, motif: string) => Promise<boolean>;
  changerDelai: (a: AccordSujet, heures: number) => Promise<boolean>;
}) {
  const v = saisie?.valeur ?? "";
  const heures = Number(v);
  const valide = saisie?.quoi === "delai" ? Number.isInteger(heures) && heures >= 1 && heures <= 720 : !!v.trim();
  const valider = async () => {
    if (!saisie || !valide || envoi) return;
    const ok = saisie.quoi === "revoquer" ? await agir(saisie.a, "revoquer", v.trim()) : saisie.quoi === "couper" ? await basculerAuto(false, v.trim()) : await changerDelai(saisie.a, heures);
    if (ok) setSaisie(null);
  };
  const titre = saisie?.quoi === "revoquer" ? `Révoquer l'accord « ${saisie.a.libelle} »` : saisie?.quoi === "couper" ? "Couper l'envoi automatique" : "Délai de traitement";
  const texte =
    saisie?.quoi === "revoquer"
      ? "Les réponses suivantes de ce sujet attendront votre validation."
      : saisie?.quoi === "couper"
        ? "Toutes les réponses attendront de nouveau votre validation."
        : "Passé ce délai, la demande remonte au responsable.";
  return (
    <ModalOverlay isOpen={!!saisie} onOpenChange={(o) => !o && !envoi && setSaisie(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
      <Modal className="v2-modale">
        <Dialog className="v2-modale-dialogue">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void valider();
            }}
          >
            <div className="v2-modale-corps">
              <Heading slot="title">{titre}</Heading>
              <p>{texte}</p>
              <label className="v2-libelle">
                {saisie?.quoi === "delai" ? "Heures (1 à 720)" : saisie?.quoi === "revoquer" ? "Pourquoi révoquer ? (obligatoire)" : "Pourquoi couper ? (obligatoire)"}
                <span className={`v2-champ${saisie?.quoi === "delai" && v && !valide ? " v2-champ--erreur" : ""}`}>
                  <input
                    autoFocus
                    inputMode={saisie?.quoi === "delai" ? "numeric" : undefined}
                    value={v}
                    maxLength={saisie?.quoi === "delai" ? 3 : 300}
                    placeholder={saisie?.quoi === "delai" ? "24" : "Client en litige : je relis moi-même ce sujet"}
                    onChange={(e) => saisie && setSaisie({ ...saisie, valeur: e.target.value })}
                  />
                  {saisie?.quoi === "delai" ? <span aria-hidden="true">h</span> : null}
                </span>
              </label>
            </div>
            <div className="v2-modale-pied">
              <button type="button" className="v2-btn v2-btn--petit" disabled={envoi} onClick={() => setSaisie(null)}>
                Annuler
              </button>
              <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!valide || envoi}>
                {envoi ? "Enregistrement…" : saisie?.quoi === "revoquer" ? "Révoquer l'accord" : saisie?.quoi === "couper" ? "Couper l'envoi automatique" : "Fixer le délai"}
              </button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
