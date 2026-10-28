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
import { Bell, Check, Clock, Download, ListFilter, Lock, Mail, MessageSquare, Power, Send, ShieldCheck, ShieldOff, SlidersHorizontal, Star, Zap } from "lucide-react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { csvDemandes, telecharger } from "@/components/espace/reput/export";
import { activerAccordSeul, chargerMonde, donnerAccord, envoiAutomatique, fixerDelai, monClient, revoquerAccord, routerSujet } from "@/components/espace/reput/portes";
import type { AccordSujet, Client, Demande, Monde, StatutDemande } from "@/components/espace/reput/types";
import { Choix, Menu, MenuActions, useEpingles, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { Note } from "../ui";
import { IconeCalendrier, IconeDiese, IconeGroupe, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
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
const carteDuTableau = (code: string) => document.querySelector<HTMLElement>(`.lin-carte-tableau[data-carte="${CSS.escape(code)}"]`);

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

  /* ——— le clavier : ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre (le lien de la carte) ———
     ignoré tant que la carte du milieu est ouverte : elle a ses propres touches (← →, Échap) */
  const grille = colonnes.map((c) => c.cartes.map((a) => a.sujet)).filter((c) => c.length);
  const cleGrille = grille.map((c) => c.join(",")).join("|");
  useEffect(() => {
    const g = cleGrille ? cleGrille.split("|").map((c) => c.split(",")) : [];
    const touche = (e: KeyboardEvent) => {
      if (idOuvert || saisie || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin .lin-menu, .v2-voile")) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) || !g.length) return;
      e.preventDefault();
      const actuel = (document.activeElement as HTMLElement | null)?.dataset?.carte ?? null;
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
      const el = carteDuTableau(g[ci][ri]);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cleGrille, idOuvert, saisie]);
  /* fermer la carte du milieu (×, Échap, le voile) : le paramètre part, le focus revient sur la carte du tableau */
  const fermerCarte = () => {
    const code = idOuvert;
    aller(lienSujet(null));
    if (!code) return;
    /* après la sortie de la carte (react-aria rend alors le focus à ce qui l'avait avant) */
    let essais = 0;
    const rendre = () => {
      if (document.querySelector(".v2-voile--carte") && essais++ < 20) window.setTimeout(rendre, 50);
      else carteDuTableau(code)?.focus({ preventScroll: true });
    };
    window.setTimeout(rendre, 50);
  };

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
      <div className="lin-tableau-page">{tableau}</div>
      <CarteSujet
        idOuvert={idOuvert}
        a={ouvert}
        m={m}
        source={source}
        ordre={colonnes.flatMap((c) => c.cartes)}
        dirige={dirige}
        envoi={envoi}
        gestes={ouvert ? gestesDe(ouvert) : []}
        epinglee={!!ouvert && epingles.has(ouvert.sujet)}
        basculerEpingle={() => ouvert && basculerEpingle(ouvert.sujet)}
        aller={aller}
        lienSujet={lienSujet}
        basculeFiltre={basculeFiltre}
        filtres={filtres}
        router={(eq) => ouvert && void router(ouvert, eq)}
        ouvrirDelai={() => ouvert && ouvrirDelai(ouvert)}
        fermer={fermerCarte}
      />
      <Fenetre saisie={saisie} setSaisie={setSaisie} envoi={envoi !== null} agir={agir} basculerAuto={basculerAuto} changerDelai={changerDelai} />
    </div>
  );
}

/* ——— la carte ouverte, au milieu de l'écran : la carte de décision d'« À valider » (../lin/CarteCentrale) ———
   gauche : la feuille des règles de l'accord (ses vraies valeurs) ; droite : le titre, la date qui compte, la
   fiche des propriétés, les demandes du sujet et l'activité ; en pied : les gestes de l'ancien écran. */
function CarteSujet({
  idOuvert,
  a,
  m,
  source,
  ordre,
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
  fermer,
}: {
  idOuvert: string | null;
  a: AccordSujet | null;
  m: Monde;
  source: "exemple" | "reelle";
  ordre: AccordSujet[];
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
  fermer: () => void;
}) {
  if (!a)
    return (
      <CarteCentrale
        ouverte={!!idOuvert}
        fermer={fermer}
        libelle="Sujet introuvable"
        sur="REPUT · Sujet"
        gauche={<Feuille titre="SUJET" sous={idOuvert} texte={`Aucun sujet actif ne porte ce code${source === "exemple" ? " dans les données d'exemple" : ""}.`} />}
        titre="Sujet introuvable"
      >
        <p className="v2-det-vide">Ce sujet n&apos;existe pas, ou n&apos;est plus actif.</p>
      </CarteCentrale>
    );

  const sujet = a.genre === "message" ? undefined : m.sujets.find((x) => x.code === a.sujet);
  const equipes = m.equipes ?? [];
  const service = sujet?.equipe_id ? (equipes.find((e) => e.id === sujet.equipe_id) ?? null) : null;
  const c = colonneDe(a);
  const demandes = a.genre === "message" ? [] : m.demandes.filter((d) => d.sujet === a.sujet).sort((x, y) => y.recu_le.localeCompare(x.recu_le));
  const fiches = a.genre === "message" ? [] : m.fiches.filter((f) => f.sujet === a.sujet);
  const rang = ordre.findIndex((x) => x.sujet === a.sujet);
  const precedente = rang > 0 ? ordre[rang - 1] : null;
  const suivante = rang >= 0 && rang < ordre.length - 1 ? ordre[rang + 1] : null;
  const voirActivite = () => document.getElementById("sujets-activite")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const genre = genreDe(a) === "message" ? "Message type" : "Sujet de demande";

  /* la feuille : les règles de l'accord, seulement ce que la base connaît */
  const lignes: [string, string][] = [
    ["Accord", c === "principe" ? "Jamais : toujours relu" : ETATS[a.statut]],
    ["Envoi seul", a.statut === "active" ? "Oui, si la réponse est tirée de la base" : "Non : chaque réponse est relue"],
    ...(a.active_le ? ([["Donné le", dateLongue(a.active_le)]] as [string, string][]) : []),
    ...(a.donne_par_libelle ? ([["Donné par", a.donne_par_libelle]] as [string, string][]) : []),
    ...(a.fin && (a.statut === "active" || a.statut === "expire") ? ([[a.statut === "expire" ? "Expiré le" : "Valable jusqu'au", dateLongue(a.fin)]] as [string, string][]) : []),
    ...(sujet && equipes.length ? ([["Service qui décide", service?.nom ?? "Tous les décideurs"]] as [string, string][]) : []),
    ...(sujet?.delai_heures ? ([["Délai de traitement", `${sujet.delai_heures} h`]] as [string, string][]) : []),
  ];

  /* l'activité : l'accord donné, sa fin, ce qui est parti seul */
  const ic = { width: 14, height: 14, "aria-hidden": true as const };
  const fil: { cle: string; icone: React.ReactNode; fort: string; texte: string }[] = [];
  if (a.active_le) fil.push({ cle: "donne", icone: <ShieldCheck {...ic} />, fort: a.donne_par_libelle ?? "Accord donné", texte: `${a.donne_par_libelle ? "a donné l'accord" : ""} · ${dateLongue(a.active_le)}` });
  if (a.statut === "active" && a.fin) fil.push({ cle: "fin", icone: <Clock {...ic} />, fort: "Jusqu'au", texte: `${dateLongue(a.fin)}, révocable à tout moment` });
  if (a.statut === "active")
    fil.push({
      cle: "parties",
      icone: <Send {...ic} />,
      fort: pluriel(a.envoyees_seules_mois, "réponse"),
      texte: `partie${a.envoyees_seules_mois > 1 ? "s" : ""} seule${a.envoyees_seules_mois > 1 ? "s" : ""} ce mois-ci`,
    });
  if (a.statut === "a_valider")
    fil.push({ cle: "propose", icone: <ShieldCheck {...ic} />, fort: "Accord proposé", texte: m.accords.seul_decideur ? "à activer vous-même" : "un autre décideur l'active dans « À valider »" });
  if (a.statut === "revoquee" || a.statut === "refusee") fil.push({ cle: "fini", icone: <ShieldOff {...ic} />, fort: ETATS[a.statut], texte: "les réponses sont de nouveau relues" });
  if (a.statut === "expire") fil.push({ cle: "expire", icone: <Clock {...ic} />, fort: "Accord expiré", texte: `${a.fin ? `le ${dateLongue(a.fin)} : ` : ""}les réponses sont de nouveau relues` });

  /* les boutons : le geste principal en bleu, la révocation en rouge, le délai à côté ; le reste dans « Plus d'actions » */
  const principal = gestes.find((g) => g.cle === "donner" || g.cle === "activer");
  const revoquer = gestes.find((g) => g.cle === "revoquer");
  const plus: Option[] = [
    ...gestes.filter((g) => g !== principal && g !== revoquer),
    { cle: "epingle", libelle: epinglee ? "Désépingler" : "Épingler en haut de sa colonne", icone: <Star width={16} height={16} fill={epinglee ? "currentColor" : "none"} />, action: basculerEpingle },
    ...(dirige && sujet && equipes.length
      ? [
          { cle: "tous", libelle: "Service : tous les décideurs", icone: <IconeGroupe />, coche: !sujet.equipe_id, action: () => envoi === null && sujet.equipe_id && router(null) },
          ...equipes.map((e) => ({ cle: e.id, libelle: `Service : ${e.nom}`, icone: <IconeGroupe />, coche: sujet.equipe_id === e.id, action: () => envoi === null && sujet.equipe_id !== e.id && router(e.id) })),
        ]
      : []),
    ...(sujet && equipes.length
      ? [
          {
            cle: "filtre-service",
            libelle: "Filtrer le tableau sur ce service",
            icone: <ListFilter width={16} height={16} />,
            coche: filtres.service === (sujet.equipe_id ?? "tous"),
            href: basculeFiltre("service", sujet.equipe_id ?? "tous"),
          },
        ]
      : []),
    { cle: "filtre-genre", libelle: `Filtrer : ${GENRES[genreDe(a)].toLowerCase()}`, icone: <ListFilter width={16} height={16} />, coche: filtres.genre === genreDe(a), href: basculeFiltre("genre", genreDe(a)) },
    { cle: "activite", libelle: "Voir l'activité", icone: <Bell width={16} height={16} />, action: voirActivite },
  ];

  return (
    <CarteCentrale
      ouverte
      fermer={fermer}
      libelle={`Le sujet ${a.libelle}`}
      sur={`REPUT · ${genre}`}
      statut={
        <>
          <IconeEtat a={a} />
          {COLONNES.find((x) => x.cle === c)!.nom}
        </>
      }
      nav={{
        position: rang + 1,
        total: ordre.length,
        precedente: precedente ? () => aller(lienSujet(precedente.sujet)) : undefined,
        suivante: suivante ? () => aller(lienSujet(suivante.sujet)) : undefined,
      }}
      gauche={<Feuille titre="ACCORD PERMANENT" sous={a.sujet} nom={a.libelle} sousNom={[genre]} lignes={lignes} total={a.statut === "active" ? ["Parties seules ce mois", String(a.envoyees_seules_mois)] : null} />}
      piedGauche={
        <>
          <div className="v2-det-document-ligne">
            <span className="v2-det-mono">{a.sujet}</span>
            <span className="v2-det-sous">{ETATS[a.statut]}</span>
          </div>
          {fiches.length ? (
            <div className="v2-det-document-ligne">
              <span className="v2-det-sous">{pluriel(fiches.length, "fiche")} dans la base</span>
              <Link href={`${RACINE}/reput/base?filtre=sujet:${encodeURIComponent(a.sujet)}`} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
                Ouvrir ses fiches
              </Link>
            </div>
          ) : null}
        </>
      }
      titre={a.libelle}
      echeance={
        a.statut === "active" && a.fin
          ? { texte: `Accord jusqu'au ${dateLongue(a.fin)}` }
          : a.statut === "expire"
            ? { texte: a.fin ? `Accord expiré le ${dateLongue(a.fin)}` : "Accord expiré", urgence: "retard" }
            : sujet?.delai_heures
              ? { texte: `Traité sous ${sujet.delai_heures} h` }
              : null
      }
      notes={
        c === "principe" ? (
          <Note>Ce sujet ne s&apos;autorise jamais : réclamations, urgences, demandes de parler à quelqu&apos;un et hors sujet sont toujours relus.</Note>
        ) : !dirige ? (
          <Note>Seuls le gérant ou l&apos;administrateur donnent ou révoquent un accord.</Note>
        ) : a.statut === "a_valider" && !m.accords.seul_decideur ? (
          <Note teinte="bleu">Un autre décideur active cet accord dans « À valider » : vous ne pouvez pas l&apos;activer vous-même.</Note>
        ) : revoquer ? (
          <Note teinte="bleu">La révocation demande un motif ; les réponses suivantes attendront votre validation.</Note>
        ) : null
      }
      actions={
        <>
          {principal ? (
            <button type="button" className="v2-btn v2-btn--primaire" disabled={envoi !== null} onClick={principal.action}>
              {principal.icone} {principal.libelle}
            </button>
          ) : null}
          {revoquer ? (
            <button type="button" className="v2-btn v2-det-btn-danger" disabled={envoi !== null} onClick={revoquer.action}>
              {revoquer.icone} {revoquer.libelle}
            </button>
          ) : null}
          {dirige && sujet?.delai_heures ? (
            <button type="button" className="v2-btn v2-btn--fantome" disabled={envoi !== null} onClick={ouvrirDelai}>
              <Clock width={16} height={16} aria-hidden="true" /> Changer le délai…
            </button>
          ) : null}
          {/* Échap dans le menu ouvert ne referme que le menu, pas la carte */}
          <div
            className="v2 sujets-plus"
            onKeyDown={(e) => {
              if (e.key === "Escape" && e.currentTarget.querySelector(".lin-menu")) e.stopPropagation();
            }}
          >
            <div className="lin">
              <MenuActions rond titre="Plus d'actions" options={plus} />
            </div>
          </div>
        </>
      }
    >
      <dl className="v2-det-fiche">
        <dt>État</dt>
        <dd>
          {c === "principe" ? "Relu par principe" : ETATS[a.statut]}
          {a.statut === "active" ? <span className="v2-det-sous"> · part seul si la réponse est tirée de la base</span> : null}
        </dd>
        <dt>Genre</dt>
        <dd>{genre}</dd>
        {sujet && equipes.length ? (
          <>
            <dt>Service</dt>
            <dd>{service?.nom ?? "Tous les décideurs"}</dd>
          </>
        ) : null}
        {sujet?.delai_heures ? (
          <>
            <dt>Délai</dt>
            <dd>
              {sujet.delai_heures} h <span className="v2-det-sous">· passé ce délai, la demande remonte au responsable</span>
            </dd>
          </>
        ) : null}
        {a.statut === "active" ? (
          <>
            <dt>Ce mois-ci</dt>
            <dd>
              {pluriel(a.envoyees_seules_mois, "réponse")} partie{a.envoyees_seules_mois > 1 ? "s" : ""} seule{a.envoyees_seules_mois > 1 ? "s" : ""}
            </dd>
          </>
        ) : null}
      </dl>

      {demandes.length ? (
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">
            Demandes
            <small>{demandes.length > 5 ? `5 sur ${demandes.length}` : pluriel(demandes.length, "demande")}</small>
          </h3>
          <ol className="v2-det-fil">
            {demandes.slice(0, 5).map((d) => (
              <li key={d.id}>
                <span className="v2-det-fil-avatar" aria-hidden="true">
                  <MessageSquare width={14} height={14} />
                </span>
                <div className="v2-det-fil-texte">
                  <strong>
                    <Link href={`${RACINE}/reput?demande=${encodeURIComponent(d.id)}`}>{nomDe(d)}</Link>
                  </strong>
                  <span>
                    {d.objet || STATUTS_DEMANDE[d.statut]} · {dateCourte(d.recu_le)}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="v2-det-bloc" id="sujets-activite">
        <h3 className="v2-det-section-titre">Activité</h3>
        {fil.length ? (
          <ol className="v2-det-fil">
            {fil.map((l) => (
              <li key={l.cle}>
                <span className="v2-det-fil-avatar" aria-hidden="true">
                  {l.icone}
                </span>
                <div className="v2-det-fil-texte">
                  <strong>{l.fort}</strong>
                  <span>{l.texte}</span>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="v2-det-vide">{c === "principe" ? "Toujours relu, par principe." : "Aucun accord donné : chaque réponse sur ce sujet attend votre validation."}</p>
        )}
      </div>
    </CarteCentrale>
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
