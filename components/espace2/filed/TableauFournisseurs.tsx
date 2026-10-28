"use client";

/* ══════════════════════════════════════════════════════════════════════
   FILED « Fournisseurs », sur la vue Board de Linear (28/10/2026)

   Demande de Teo : la troisième page de chaque SaaS refaite sur le tableau
   en colonnes de Linear, au 1:1 (gabarit : ../lin/lin.css, bloc « le
   tableau en colonnes »). Mêmes données, mêmes portes, mêmes fenêtres que
   l'écran d'avant (components/espace/filed/EcranFournisseurs.tsx) :

     · une colonne par état réel d'un fournisseur — À confirmer, IBAN à
       valider (actif, un IBAN proposé attend sa validation dans « À
       valider »), Actifs, Bloqués, Refusés (montrée seulement si un
       fournisseur y est : aucun geste n'y mène) ;
     · une carte par fournisseur : son code, son nom, l'identité, les
       factures et l'IBAN en pastilles, un fait daté au pied ; le point
       bleu = à traiter (à confirmer, IBAN à valider, identité invalide) ;
     · la carte ouverte (?id=) : la page d'un ticket à droite, comme
       l'Inbox (./BoiteAPayer.tsx) ;
     · glisser une carte d'une colonne à l'autre ouvre la fenêtre du geste
       qui fait ce passage, et seulement celui-là :
         À confirmer → Actifs            Confirmer le fournisseur
         Actifs → IBAN à valider         Proposer un IBAN
         Actifs, IBAN à valider → Bloqués Bloquer
         Bloqués → Actifs (ou IBAN à valider s'il en a un proposé) Débloquer
       Valider un IBAN se fait dans « À valider » : pas de glisser vers
       Actifs depuis IBAN à valider.

   ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre, Échap
   ferme. Les filtres (?filtre=colonne:…, identite:…, iban:…) et « à
   traiter » (?traiter=1) sont dans l'adresse, posés en replace sur la
   même route.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Ban, Bell, Check, ChevronDown, ChevronUp, Clock, Copy, ExternalLink, FileText, Landmark, ListFilter, RefreshCw, SlidersHorizontal, Star, Unlock, UserCheck, Wallet } from "lucide-react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { EXEMPLE_MOI } from "@/components/espace/exemples/socle";
import { dateCourte, masquerIban, montant } from "@/components/espace/format";
import { statutFacture } from "@/components/espace/filed/etats";
import { vueExemple } from "@/components/espace/filed/EcranFournisseurs";
import { identiteDe, registreDe } from "@/components/espace/filed/FicheFournisseur";
import {
  attesterIdentite,
  bloquerFournisseur,
  chargerVueFournisseurs,
  confirmerFournisseur,
  demanderVerification,
  monClient,
  proposerIban,
  type FactureDuFournisseur,
  type VueFournisseurs,
} from "@/components/espace/filed/portes";
import type { Fournisseur, IbanFournisseur } from "@/components/espace/types";
import { A_PAYER } from "./calculs";
import { Choix, Menu, MenuActions, MenuOptions, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeDiese, IconeDocument, IconeGroupe, IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { useMonte } from "../horloge";
import { RACINE } from "../modules";
import "./tableau-fournisseurs.css";

const CHEMIN = `${RACINE}/filed/fournisseurs`;
const maintenant = () => new Date().toISOString();
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/* « IBAN validé » garde son sigle, « Identité vérifiée » passe en minuscule */
const minuscule = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* ——— les colonnes : les états réels d'un fournisseur (filed_fournisseurs.statut), « IBAN à valider » mis à part ——— */
type Colonne = "a_confirmer" | "iban" | "actif" | "bloque" | "refuse";
const COLONNES: { cle: Colonne; libelle: string; un: string; sous: string; etat: EtatProjet }[] = [
  { cle: "a_confirmer", libelle: "À confirmer", un: "À confirmer", sous: "fournisseurs nouveaux, factures bloquées", etat: "planifie" },
  { cle: "iban", libelle: "IBAN à valider", un: "Actif, IBAN à valider", sous: "un IBAN proposé attend sa validation dans « À valider »", etat: "en-cours" },
  { cle: "actif", libelle: "Actifs", un: "Actif", sous: "confirmés, payables", etat: "fait" },
  { cle: "bloque", libelle: "Bloqués", un: "Bloqué", sous: "aucun paiement tant que le blocage tient", etat: "annule" },
  { cle: "refuse", libelle: "Refusés", un: "Refusé", sous: "écartés par une décision", etat: "annule" },
];
const colonneDe = (c: Colonne) => COLONNES.find((x) => x.cle === c)!;

/* l'identité, en quatre cas (identiteDe de la fiche partagée) */
type Identite = "verifiee" | "attente" | "invalide" | "non";
const IDENTITES: { cle: Identite; libelle: string; court: string }[] = [
  { cle: "verifiee", libelle: "Identité vérifiée", court: "Vérifiée" },
  { cle: "attente", libelle: "Registre en attente", court: "En attente" },
  { cle: "invalide", libelle: "Identité invalide", court: "Invalide" },
  { cle: "non", libelle: "Identité non vérifiée", court: "Non vérifiée" },
];
const identiteLibelle = (i: Identite) => IDENTITES.find((x) => x.cle === i)!.libelle;
/* l'IBAN connu du fournisseur */
type EtatIban = "valide" | "a_valider" | "aucun";
const IBANS: { cle: EtatIban; libelle: string }[] = [
  { cle: "valide", libelle: "IBAN validé" },
  { cle: "a_valider", libelle: "IBAN proposé, à valider" },
  { cle: "aucun", libelle: "Aucun IBAN validé ni proposé" },
];
const ibanLibelle = (i: EtatIban) => IBANS.find((x) => x.cle === i)!.libelle;

/* un fournisseur, sous la forme que lisent les cartes et la fiche */
type Ligne = {
  f: Fournisseur;
  id: string;
  col: Colonne;
  ref: string;
  ibans: IbanFournisseur[];
  ibanValide: IbanFournisseur | null;
  proposes: number;
  iban: EtatIban;
  factures: FactureDuFournisseur[];
  enCours: number;
  bloquees: number;
  identite: Identite;
  identiteTexte: string;
  deposant: boolean;
  aTraiter: boolean;
};

/* ——— les filtres : ?filtre=colonne:bloque&filtre=identite:invalide&filtre=iban:aucun, une valeur par dimension ——— */
type Dimension = "colonne" | "identite" | "iban";
type Filtre = { dim: Dimension; val: string };
const DIMENSIONS: Dimension[] = ["colonne", "identite", "iban"];
const VALABLES: Record<Dimension, (v: string) => boolean> = {
  colonne: (v) => COLONNES.some((x) => x.cle === v),
  identite: (v) => IDENTITES.some((x) => x.cle === v),
  iban: (v) => IBANS.some((x) => x.cle === v),
};
const GARDES: Record<Dimension, (l: Ligne, v: string) => boolean> = {
  colonne: (l, v) => l.col === v,
  identite: (l, v) => l.identite === v,
  iban: (l, v) => l.iban === v,
};
function lireFiltres(params: { getAll: (cle: string) => string[] }): Filtre[] {
  const vus = new Map<Dimension, string>();
  for (const brut of params.getAll("filtre")) {
    const i = brut.indexOf(":");
    const dim = brut.slice(0, i) as Dimension;
    const val = brut.slice(i + 1);
    if (i > 0 && DIMENSIONS.includes(dim) && !vus.has(dim) && VALABLES[dim](val)) vus.set(dim, val);
  }
  return DIMENSIONS.filter((d) => vus.has(d)).map((d) => ({ dim: d, val: vus.get(d)! }));
}

type Tri = "nom" | "en_cours";

/* les gestes de l'écran d'avant, par les mêmes portes ; chacun a sa fenêtre (sauf « Revérifier », immédiat) */
type Geste = { type: "confirmer" } | { type: "attester" } | { type: "bloquer"; bloquer: boolean } | { type: "iban" };
type Form = (Geste & { id: string }) | null;

/* le passage d'une colonne à l'autre qui correspond à un geste réel ; sinon pas de dépôt */
function gesteVers(l: Ligne, vers: Colonne): Geste | null {
  if (l.col === vers) return null;
  if (l.col === "a_confirmer" && vers === "actif" && !l.deposant) return { type: "confirmer" };
  if (l.col === "actif" && vers === "iban") return { type: "iban" };
  if ((l.col === "actif" || l.col === "iban") && vers === "bloque") return { type: "bloquer", bloquer: true };
  if (l.col === "bloque" && vers === (l.proposes ? "iban" : "actif")) return { type: "bloquer", bloquer: false };
  return null;
}
const peutGlisser = (l: Ligne) => COLONNES.some((c) => gesteVers(l, c.cle));

function IconeColonne({ col, titre }: { col: Colonne; titre?: string }) {
  return <IconeStatutProjet etat={colonneDe(col).etat} titre={titre} />;
}
function IconeIdentite({ l }: { l: Ligne }) {
  return <BadgeCheck className={l.identite === "invalide" ? "fou-alerte" : undefined} aria-hidden="true" />;
}

export default function TableauFournisseurs() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const monte = useMonte();
  const [local, setLocal] = useState<VueFournisseurs>(vueExemple);
  const [reel, setReel] = useState<VueFournisseurs | null>(null);
  const [moiReel, setMoiReel] = useState<{ user_id: string; client_id: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<Tri>("nom");
  const [vides, setVides] = useState(true);
  const [form, setForm] = useState<Form>(null);
  const [motif, setMotif] = useState("");
  const [ibanSaisi, setIbanSaisi] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurAction, setErreurAction] = useState<string | null>(null);
  /* le message de l'écran d'avant, « C'est fait. … », sur le fournisseur concerné */
  const [fait, setFait] = useState<{ id: string; texte: string } | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [depot, setDepot] = useState<Colonne | null>(null);
  const activiteRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const [epingles, basculerEpingle] = useEpingles("filed-fournisseurs");

  /* ——— la base réelle : les mêmes portes que l'écran d'avant ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const [vue, compte] = await Promise.all([chargerVueFournisseurs(), monClient().catch(() => null)]);
      setReel(vue);
      setMoiReel(compte ? { user_id: compte.user_id, client_id: compte.client_id } : null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ fournisseurs: [], ibans: [], factures: [], deposants: {} });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["filed_fournisseurs", "filed_historique", "filed_fournisseurs_ibans", "filed_factures"], source === "reelle", charger);
  /* après « Revérifier », la réponse du registre arrive en une à deux minutes : relire à 1, 2 et 4 min (comme avant) */
  const relectures = useRef<number[]>([]);
  useEffect(() => () => relectures.current.forEach((t) => window.clearTimeout(t)), []);
  const relireApres = () => {
    relectures.current.forEach((t) => window.clearTimeout(t));
    relectures.current = [60, 120, 240].map((sec) => window.setTimeout(() => void charger(), sec * 1000));
  };

  /* le monde d'exemple est daté à l'heure du visiteur : rien avant le montage (horloge.ts) */
  const vue = source === "exemple" ? (monte ? local : null) : reel;
  const moi = source === "exemple" ? EXEMPLE_MOI : (moiReel?.user_id ?? null);
  const chargement = !vue;

  const base: Ligne[] = useMemo(() => {
    if (!vue) return [];
    return vue.fournisseurs.map((f) => {
      const ibans = vue.ibans.filter((i) => i.fournisseur_id === f.id);
      const proposes = ibans.filter((i) => i.statut === "propose").length;
      const ibanValide = ibans.find((i) => i.statut === "valide") ?? null;
      const factures = vue.factures.filter((x) => x.fournisseur_id === f.id);
      const id = identiteDe(f);
      const identite: Identite = id.teinte === "vert" ? "verifiee" : id.teinte === "rouge" ? "invalide" : id.teinte === "ambre" ? "attente" : "non";
      const col: Colonne = f.statut === "actif" ? (proposes ? "iban" : "actif") : f.statut;
      return {
        f,
        id: f.id,
        col,
        ref: f.code ?? (f.siren ? `SIREN ${f.siren}` : f.tva ? `TVA ${f.tva}` : "Sans identifiant"),
        ibans,
        ibanValide,
        proposes,
        iban: ibanValide ? "valide" : proposes ? "a_valider" : "aucun",
        factures,
        enCours: factures.filter((y) => y.statut === "bloquee" || y.statut === "a_valider" || y.statut === "a_completer").length,
        bloquees: factures.filter((y) => y.statut === "bloquee").length,
        identite,
        identiteTexte: id.texte,
        deposant: f.statut === "a_confirmer" && !!moi && vue.deposants[f.id] === moi,
        aTraiter: col === "a_confirmer" || col === "iban" || identite === "invalide",
      };
    });
  }, [vue, moi]);

  /* ——— l'adresse : le fournisseur ouvert (?id=), les filtres (?filtre=), « à traiter » (?traiter=1) ——— */
  const id = params.get("id");
  const traiter = params.get("traiter") === "1";
  const filtresActifs = lireFiltres(params);
  const adresse = useCallback(
    (modif: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      modif(p);
      const qs = p.toString().replace(/%3A/gi, ":");
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  const lienId = useCallback((x: string | null) => adresse((p) => (x ? p.set("id", x) : p.delete("id"))), [adresse]);
  const lienFiltres = (fs: Filtre[]) =>
    adresse((p) => {
      p.delete("filtre");
      for (const f of fs) p.append("filtre", `${f.dim}:${f.val}`);
    });
  const lienSansFiltres = adresse((p) => {
    p.delete("filtre");
    p.delete("traiter");
  });
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const basculerTraiter = () => aller(adresse((p) => (traiter ? p.delete("traiter") : p.set("traiter", "1"))));
  const filtreDe = (dim: Dimension) => filtresActifs.find((f) => f.dim === dim)?.val ?? null;
  const estActif = (dim: Dimension, val: string) => filtreDe(dim) === val;
  const basculer = (dim: Dimension, val: string) => lienFiltres([...filtresActifs.filter((f) => f.dim !== dim), ...(estActif(dim, val) ? [] : [{ dim, val }])]);

  const q = sansAccents(recherche.trim()).replace(/\s+/g, "");
  const correspond = (l: Ligne) => !q || [l.f.nom, l.f.siren, l.f.tva, l.f.code].some((x) => x && sansAccents(x).replace(/\s+/g, "").includes(q));
  const dansLaPortee = (l: Ligne, sauf?: Dimension) => (!traiter || l.aTraiter) && correspond(l) && filtresActifs.every((f) => f.dim === sauf || GARDES[f.dim](l, f.val));
  const cleFiltres = filtresActifs.map((f) => `${f.dim}:${f.val}`).join("|");

  /* les colonnes affichées et leurs cartes, les épinglées d'abord, chaque part dans l'ordre courant */
  const colonnes = useMemo(() => {
    const ordre = (a: Ligne, b: Ligne) => (tri === "en_cours" ? b.enCours - a.enCours : 0) || a.f.nom.localeCompare(b.f.nom, "fr");
    const filtreCol = filtresActifs.find((f) => f.dim === "colonne")?.val ?? null;
    return COLONNES.filter((c) => !filtreCol || c.cle === filtreCol)
      .map((c) => {
        const cartes = base.filter((l) => l.col === c.cle && dansLaPortee(l)).sort(ordre);
        return { ...c, cartes: [...cartes.filter((l) => epingles.has(l.id)), ...cartes.filter((l) => !epingles.has(l.id))] };
      })
      .filter((c) => c.cartes.length || filtreCol || (vides && (c.cle !== "refuse" || base.some((l) => l.col === "refuse"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, tri, vides, traiter, q, cleFiltres, epingles]);
  const visibles = colonnes.flatMap((c) => c.cartes);
  const choisie = id ? (base.find((l) => l.id === id) ?? null) : null;

  /* ——— le clavier : ↑/↓ dans une colonne, ←/→ d'une colonne à l'autre, Entrée ouvre (le lien de la carte), Échap ferme ——— */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || form) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin-menu, .v2-voile")) return;
      if (e.key === "Escape" && id) {
        e.preventDefault();
        aller(lienId(null));
        return;
      }
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key) || !visibles.length) return;
      e.preventDefault();
      const courant = (document.activeElement as HTMLElement | null)?.closest?.("[data-carte]")?.getAttribute("data-carte") ?? id;
      let ci = colonnes.findIndex((col) => col.cartes.some((l) => l.id === courant));
      let ri = ci >= 0 ? colonnes[ci].cartes.findIndex((l) => l.id === courant) : -1;
      if (ci < 0) {
        ci = colonnes.findIndex((col) => col.cartes.length);
        ri = 0;
      } else if (e.key === "ArrowDown") ri = Math.min(colonnes[ci].cartes.length - 1, ri + 1);
      else if (e.key === "ArrowUp") ri = Math.max(0, ri - 1);
      else {
        const pas = e.key === "ArrowRight" ? 1 : -1;
        let cj = ci + pas;
        while (cj >= 0 && cj < colonnes.length && !colonnes[cj].cartes.length) cj += pas;
        if (cj >= 0 && cj < colonnes.length) {
          ci = cj;
          ri = Math.min(ri, colonnes[cj].cartes.length - 1);
        }
      }
      const suivant = colonnes[ci]?.cartes[ri];
      if (!suivant) return;
      document.querySelector<HTMLElement>(`[data-carte="${CSS.escape(suivant.id)}"]`)?.focus();
      if (id && suivant.id !== id) aller(lienId(suivant.id));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, id, colonnes, visibles.length, lienId]);
  /* étroit : la fiche passe sous le tableau ; on la montre quand on ouvre une carte */
  useEffect(() => {
    if (!id) return;
    const el = detailRef.current;
    if (el && el.getBoundingClientRect().top > window.innerHeight - 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [id]);

  /* ——— les gestes : les portes de l'écran d'avant, ou la même chose en mémoire sur l'exemple ——— */
  const ouvrir = (l: Ligne, g: Geste) => {
    setErreurAction(null);
    setFait(null);
    setMotif("");
    setIbanSaisi("");
    setForm({ ...g, id: l.id });
  };
  const enCours = form ? (base.find((l) => l.id === form.id) ?? null) : null;
  const motifOk = motif.trim().length >= 3;
  const ibanPropre = ibanSaisi.replace(/\s+/g, "").toUpperCase();
  const ibanOk = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(ibanPropre);

  async function envoyer(cible: Ligne, action: () => Promise<unknown>, localement: (v: VueFournisseurs) => VueFournisseurs, message: string, apres?: () => void) {
    setEnvoi(true);
    setErreurAction(null);
    try {
      if (source === "reelle") {
        await action();
        await charger();
        apres?.();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        setLocal((v) => localement(v));
      }
      setFait({ id: cible.id, texte: message });
      toast(message, "vert");
      setForm(null);
    } catch (e) {
      const m = e instanceof Error ? e.message : "La base a refusé l'opération.";
      setErreurAction(m);
      if (!form) toast(`Refusé par la base : ${m}`, "rouge");
    } finally {
      setEnvoi(false);
    }
  }
  const changer = (v: VueFournisseurs, fid: string, maj: Partial<Fournisseur>): VueFournisseurs => ({ ...v, fournisseurs: v.fournisseurs.map((x) => (x.id === fid ? { ...x, ...maj } : x)) });

  const confirmer = (l: Ligne) =>
    envoyer(
      l,
      () => confirmerFournisseur(l.id, motif.trim()),
      (v) => {
        const w = changer(v, l.id, { statut: "actif", confirme_le: maintenant(), confirme_par: moi });
        return {
          ...w,
          ibans: w.ibans.map((i) => (i.fournisseur_id === l.id && i.statut === "propose" ? { ...i, statut: "valide" as const } : i)),
          factures: w.factures.map((x) => (x.fournisseur_id === l.id && x.statut === "bloquee" ? { ...x, statut: "a_valider" as const } : x)),
        };
      },
      `${l.f.nom} est confirmé ; ses factures bloquées sont recontrôlées.`,
    );
  const attester = (l: Ligne) =>
    envoyer(
      l,
      () => attesterIdentite(l.id, motif.trim()),
      (v) => changer(v, l.id, { identite_verifiee_le: maintenant(), identite_source: "humain", identite_verdict: { resultat: "valide", registre: "humain", preuve: { par: moi, motif: motif.trim() } } }),
      "L'identité est attestée, avec votre motif.",
    );
  const reverifier = (l: Ligne) => {
    const registre = registreDe(l.f);
    if (!registre) return;
    const nom = registre.nom === "vies" ? "VIES" : "Sirene";
    const client = moiReel?.client_id;
    setFait(null);
    void envoyer(
      l,
      () => (client ? demanderVerification(client, registre.nom, registre.identifiant, l.id) : Promise.reject(new Error("Aucun compte rattaché à cette session."))),
      (v) =>
        changer(v, l.id, { identite_verifiee_le: maintenant(), identite_source: registre.nom, identite_verdict: { resultat: "valide", registre: registre.nom, identifiant: registre.identifiant.replace(/\s+/g, "") } }),
      source === "reelle" ? `La vérification est demandée à ${nom} ; la réponse arrive en une à deux minutes et la fiche se relit seule.` : `Identité confirmée par ${nom} (en exemple, la réponse est immédiate).`,
      relireApres,
    );
  };
  const bloquer = (l: Ligne, b: boolean) =>
    envoyer(
      l,
      () => bloquerFournisseur(l.id, b, motif.trim()),
      (v) => changer(v, l.id, { statut: b ? "bloque" : "actif" }),
      b ? `${l.f.nom} est bloqué : plus aucune facture ne sera payée sans déblocage.` : `${l.f.nom} est débloqué.`,
    );
  const soumettreIban = (l: Ligne) =>
    envoyer(
      l,
      () => proposerIban(l.id, ibanPropre, motif.trim()),
      (v) => ({ ...v, ibans: [...v.ibans, { id: `iban-${Date.now()}`, fournisseur_id: l.id, iban_masque: masquerIban(ibanPropre), statut: "propose", propose_le: maintenant() }] }),
      l.f.statut === "actif" ? "L'IBAN est proposé ; sa validation part dans la file « À valider »." : "L'IBAN est proposé ; il sera validé avec le fournisseur.",
    );

  const copier = (texte: string, quoi = "Copié") =>
    navigator.clipboard?.writeText(texte).then(
      () => toast(quoi, "vert"),
      () => toast("Impossible de copier. Réessayez.", "rouge"),
    );

  /* les gestes possibles sur un fournisseur, dans l'ordre de l'écran d'avant (fiche, puis IBAN et blocage) */
  const valideDe = (f: Fournisseur) => f.identite_verdict?.resultat === "valide" || (!!f.identite_verifiee_le && !f.identite_verdict);
  const gestesDe = (l: Ligne): Option[] => {
    const registre = registreDe(l.f);
    return [
      ...(l.f.statut === "a_confirmer"
        ? [
            {
              cle: "confirmer",
              libelle: "Confirmer ce fournisseur…",
              meta: l.deposant ? "pas vous" : undefined,
              icone: <UserCheck width={16} height={16} />,
              action: () => (l.deposant ? toast("Vous avez déposé la pièce d'origine : une autre personne confirme.", "rouge") : ouvrir(l, { type: "confirmer" })),
            },
          ]
        : []),
      ...(registre ? [{ cle: "reverifier", libelle: `Revérifier auprès de ${registre.nom === "vies" ? "VIES" : "Sirene"}`, icone: <RefreshCw width={16} height={16} />, action: () => reverifier(l) }] : []),
      ...(!valideDe(l.f) ? [{ cle: "attester", libelle: "Attester l'identité…", icone: <BadgeCheck width={16} height={16} />, action: () => ouvrir(l, { type: "attester" }) }] : []),
      ...(l.f.statut !== "refuse" ? [{ cle: "iban", libelle: "Proposer un IBAN…", icone: <Landmark width={16} height={16} />, action: () => ouvrir(l, { type: "iban" }) }] : []),
      ...(l.f.statut === "actif" || l.f.statut === "bloque"
        ? [
            {
              cle: "bloquer",
              libelle: l.f.statut === "bloque" ? "Débloquer…" : "Bloquer…",
              icone: l.f.statut === "bloque" ? <Unlock width={16} height={16} /> : <Ban width={16} height={16} />,
              action: () => ouvrir(l, { type: "bloquer", bloquer: l.f.statut !== "bloque" }),
            },
          ]
        : []),
    ];
  };

  /* ——— glisser une carte : seulement vers la colonne d'un geste réel ——— */
  const tiree = glisse ? (base.find((l) => l.id === glisse) ?? null) : null;
  const finGlisse = () => {
    setGlisse(null);
    setDepot(null);
  };

  /* ——— la tête de page ——— */
  const nbATraiter = base.filter((l) => l.aTraiter).length;
  const premiereATraiter = visibles.find((l) => l.aTraiter) ?? null;
  const optionsPage: Option[] = [
    ...(premiereATraiter ? [{ cle: "premier", libelle: "Ouvrir le premier à traiter", meta: premiereATraiter.f.nom, icone: <IconeNonLus />, action: () => aller(lienId(premiereATraiter.id)) }] : []),
    ...(filtresActifs.length || recherche || traiter
      ? [
          {
            cle: "effacer",
            libelle: "Effacer les filtres",
            icone: <ListFilter width={16} height={16} />,
            action: () => {
              setRecherche("");
              aller(lienSansFiltres);
            },
          },
        ]
      : []),
    { cle: "vides", libelle: vides ? "Masquer les colonnes vides" : "Afficher les colonnes vides", icone: <SlidersHorizontal width={16} height={16} />, action: () => setVides((v) => !v) },
    { cle: "documents", libelle: "Documents reçus", icone: <FileText width={16} height={16} />, href: `${RACINE}/filed` },
    { cle: "a-payer", libelle: "À payer", icone: <Wallet width={16} height={16} />, href: `${RACINE}/filed/a-payer` },
  ];

  /* une option de filtre : son chiffre est compté sous les autres filtres posés */
  const nombreSauf = (dim: Dimension, test: (l: Ligne) => boolean) => base.filter((l) => dansLaPortee(l, dim) && test(l)).length;
  const sectionsFiltre: { titre: string; dim: Dimension; options: { val: string; libelle: string; icone: React.ReactNode; n: number }[] }[] = [
    {
      titre: "Statut",
      dim: "colonne",
      options: COLONNES.filter((c) => c.cle !== "refuse" || base.some((l) => l.col === "refuse")).map((c) => ({
        val: c.cle,
        libelle: c.libelle,
        icone: <IconeColonne col={c.cle} />,
        n: nombreSauf("colonne", (l) => l.col === c.cle),
      })),
    },
    { titre: "Identité", dim: "identite", options: IDENTITES.map((i) => ({ val: i.cle, libelle: i.libelle, icone: <BadgeCheck />, n: nombreSauf("identite", (l) => l.identite === i.cle) })) },
    { titre: "IBAN", dim: "iban", options: IBANS.map((i) => ({ val: i.cle, libelle: i.libelle, icone: <Landmark />, n: nombreSauf("iban", (l) => l.iban === i.cle) })) },
  ];
  const puce = (f: Filtre): { icone: React.ReactNode; libelle: string } => {
    if (f.dim === "colonne") return { icone: <IconeColonne col={f.val as Colonne} />, libelle: colonneDe(f.val as Colonne).libelle };
    if (f.dim === "identite") return { icone: <BadgeCheck width={14} height={14} />, libelle: identiteLibelle(f.val as Identite) };
    return { icone: <Landmark width={14} height={14} />, libelle: ibanLibelle(f.val as EtatIban) };
  };

  const tete = (
    <header className="lin-tete">
      <span className="lin-tete-titre">Fournisseurs</span>
      <MenuActions rond aGauche titre="Actions de la page" options={optionsPage} />
      <div className="lin-tete-ronds">
        <button
          type="button"
          className="lin-rond"
          aria-pressed={traiter}
          aria-label="Seulement ce qui est à traiter"
          title={`Seulement ce qui est à traiter${nbATraiter ? ` (${nbATraiter})` : ""}`}
          onClick={basculerTraiter}
        >
          <IconeNonLus />
        </button>
        <Menu
          largeur={300}
          bouton={(ouvert, basculerMenu) => (
            <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={recherche || filtresActifs.length ? "" : undefined} onClick={basculerMenu}>
              <ListFilter width={14} height={14} aria-hidden="true" />
            </button>
          )}
        >
          {(fermer) => (
            <div className="fou-menu">
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Chercher un nom, un SIREN, une TVA…"
                aria-label="Chercher un fournisseur"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermer()}
              />
              {sectionsFiltre.map((s) => (
                <div key={s.dim} role="group" aria-label={s.titre}>
                  <p className="fou-menu-titre">{s.titre}</p>
                  {s.options.map((o) => (
                    <button
                      key={o.val}
                      type="button"
                      className="lin-menu-option"
                      aria-pressed={estActif(s.dim, o.val)}
                      onClick={() => {
                        fermer();
                        aller(basculer(s.dim, o.val));
                      }}
                    >
                      {o.icone}
                      <span>{o.libelle}</span>
                      <span className="lin-meta">{o.n}</span>
                      {estActif(s.dim, o.val) ? <Check className="lin-option-coche" aria-label="filtre posé" /> : null}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Menu>
        <Menu
          largeur={280}
          bouton={(ouvert, basculerMenu) => (
            <button type="button" className="lin-rond" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculerMenu}>
              <SlidersHorizontal width={14} height={14} aria-hidden="true" />
            </button>
          )}
        >
          {() => (
            <>
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri dans les colonnes
                  <Choix<Tri>
                    libelle="Tri dans les colonnes"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "nom", libelle: "Nom" },
                      { cle: "en_cours", libelle: "Factures en cours" },
                    ]}
                  />
                </label>
              </div>
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Colonnes vides
                  <span className="fou-bascule">
                    <input type="checkbox" checked={vides} onChange={(e) => setVides(e.target.checked)} />
                  </span>
                </label>
              </div>
            </>
          )}
        </Menu>
      </div>
    </header>
  );

  /* ——— une carte ——— */
  const pied = (l: Ligne) => {
    if (l.col === "a_confirmer") return l.deposant ? "Vous avez déposé sa première pièce" : l.bloquees ? `${pluriel(l.bloquees, "facture")} bloquée${l.bloquees > 1 ? "s" : ""}` : "Fournisseur nouveau";
    if (l.col === "iban") {
      const p = l.ibans.filter((i) => i.statut === "propose").sort((a, b) => b.propose_le.localeCompare(a.propose_le))[0];
      return p ? `IBAN proposé le ${dateCourte(p.propose_le)}` : "IBAN proposé";
    }
    if (l.col === "bloque") return "Aucun paiement tant que le blocage tient";
    if (l.col === "refuse") return "Écarté par une décision";
    return l.f.confirme_le ? `Confirmé le ${dateCourte(l.f.confirme_le)}` : l.f.identite_verifiee_le ? `Identité vérifiée le ${dateCourte(l.f.identite_verifiee_le)}` : "Confirmé, payable";
  };
  const carte = (l: Ligne) => {
    const glissable = peutGlisser(l);
    return (
      <Link
        key={l.id}
        href={lienId(l.id)}
        scroll={false}
        className="lin-carte-tableau"
        data-carte={l.id}
        data-colonne={l.col}
        data-actif={l.id === id ? "" : undefined}
        data-glisse={l.id === glisse ? "" : undefined}
        aria-current={l.id === id ? "true" : undefined}
        draggable={glissable}
        onDragStart={(e) => {
          if (!glissable) return;
          e.dataTransfer.setData("text/plain", l.id);
          e.dataTransfer.effectAllowed = "move";
          setGlisse(l.id);
        }}
        onDragEnd={finGlisse}
      >
        <span className="lin-carte-ref">
          <span className="fou-ref">
            {l.aTraiter ? <span className="lin-boite-point" aria-label="à traiter" /> : null}
            {l.ref}
          </span>
          {epingles.has(l.id) ? <Star fill="currentColor" aria-label="épinglé" /> : null}
        </span>
        <span className="lin-carte-titre">
          <IconeColonne col={l.col} titre={colonneDe(l.col).un} />
          <span>{l.f.nom}</span>
        </span>
        <span className="lin-carte-pastilles">
          <span className="lin-carte-pastille" data-alerte={l.identite === "invalide" ? "" : undefined} title={l.identiteTexte}>
            <IconeIdentite l={l} />
            {IDENTITES.find((x) => x.cle === l.identite)!.court}
          </span>
          <span className="lin-carte-pastille" title={l.enCours ? `${pluriel(l.enCours, "facture")} en cours sur ${l.factures.length}` : undefined}>
            <FileText aria-hidden="true" />
            {l.enCours ? `${l.enCours} en cours` : pluriel(l.factures.length, "facture")}
          </span>
          <span className="lin-carte-pastille" title={ibanLibelle(l.iban)}>
            <Landmark aria-hidden="true" />
            {l.ibanValide ? `…${l.ibanValide.iban_masque.split(" ").pop()}` : l.proposes ? `${l.proposes} à valider` : "Sans IBAN"}
          </span>
        </span>
        <span className="lin-carte-pied">{pied(l)}</span>
      </Link>
    );
  };

  /* ——— le tableau ——— */
  const tableau = (
    <div className="lin-tableau" aria-label="Fournisseurs par statut">
      {colonnes.map((c) => {
        const accepte = tiree ? gesteVers(tiree, c.cle) : null;
        const filtree = estActif("colonne", c.cle);
        const optionsColonne: Option[] = [
          ...(c.cartes.length ? [{ cle: "premier", libelle: "Ouvrir le premier", meta: c.cartes[0].f.nom, icone: <IconeColonne col={c.cle} />, action: () => aller(lienId(c.cartes[0].id)) }] : []),
          { cle: "seule", libelle: filtree ? "Toutes les colonnes" : "Seulement cette colonne", icone: <ListFilter width={16} height={16} />, coche: filtree, action: () => aller(basculer("colonne", c.cle)) },
        ];
        return (
          <section key={c.cle} className="lin-colonne" data-colonne={c.cle} aria-label={`${c.libelle} : ${pluriel(c.cartes.length, "fournisseur")}`}>
            <header className="lin-colonne-tete" title={c.sous}>
              <span className="lin-colonne-nom">
                <IconeColonne col={c.cle} />
                <h3>{c.libelle}</h3>
                <span className="lin-colonne-compte">{c.cartes.length}</span>
              </span>
              <div className="lin-tete-ronds">
                <MenuActions rond titre={`Colonne ${c.libelle}`} options={optionsColonne} />
              </div>
            </header>
            <div
              className="lin-colonne-corps"
              data-depot={depot === c.cle && accepte ? "" : undefined}
              onDragOver={(e) => {
                if (!accepte) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDepot(c.cle);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDepot((d) => (d === c.cle ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                const l = tiree;
                finGlisse();
                if (l && accepte) {
                  if (accepte.type === "confirmer" && l.deposant) return;
                  ouvrir(l, accepte);
                }
              }}
            >
              {c.cartes.length ? c.cartes.map(carte) : <div className="lin-colonne-vide">Rien ici</div>}
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="lin fou">
      <h1 className="v2-sr">Fournisseurs</h1>
      {tete}
      {filtresActifs.length || recherche || erreur ? (
        <div className="lin-outils fou-outils">
          {erreur ? (
            <span className="fou-erreur" role="alert">
              La base réelle n&apos;a pas répondu. {erreur}
            </span>
          ) : null}
          {recherche ? (
            <button type="button" className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Effacer la recherche" onClick={() => setRecherche("")}>
              « {recherche} » ✕
            </button>
          ) : null}
          {filtresActifs.map((f) => {
            const p = puce(f);
            return (
              <Link key={f.dim} href={lienFiltres(filtresActifs.filter((x) => x !== f))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false} replace>
                {p.icone}
                {p.libelle} ✕
              </Link>
            );
          })}
        </div>
      ) : null}
      {chargement ? (
        <p className="lin-vide">Lecture des fournisseurs…</p>
      ) : !base.length ? (
        <p className="lin-vide">{erreur ? "Aucun fournisseur lu." : "Aucun fournisseur. Les fournisseurs naissent de la première facture lue."}</p>
      ) : (
        <div className="lin-tableau-page">
          {tableau}
          {id ? (choisie ? detail(choisie) : introuvable()) : null}
        </div>
      )}
      {fenetre()}
    </div>
  );

  function introuvable() {
    return (
      <section className="lin-boite-detail" aria-label="Fournisseur introuvable" ref={detailRef}>
        <header className="lin-tete">
          <div className="lin-tete-ronds">
            <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={() => aller(lienId(null))}>
              <IconeBoiteX />
            </button>
          </div>
        </header>
        <p className="lin-vide">
          Le fournisseur que désigne ce lien n&apos;est pas connu{source === "exemple" ? " (vous regardez les données d'exemple)" : ""}.{" "}
          <Link href={lienId(null)} scroll={false} replace>
            Revenir au tableau
          </Link>
        </p>
      </section>
    );
  }

  /* ——— le fournisseur ouvert : la page d'un ticket de Linear (comme ./BoiteAPayer.tsx) ———
     le nom, une phrase, les gestes en icônes, ses IBAN et ses factures, le fil d'activité ;
     à droite, sans cadre : statut, identité, IBAN, identifiants, factures. */
  function detail(l: Ligne) {
    const f = l.f;
    const gestes = gestesDe(l);
    const geste = (cle: string) => gestes.find((g) => g.cle === cle);
    const lienFacture = (x: FactureDuFournisseur) => (A_PAYER.has(x.statut) ? `${RACINE}/filed/a-payer?id=${encodeURIComponent(x.id)}` : `${RACINE}/filed?objet=facture:${encodeURIComponent(x.id)}`);
    const lienDocuments = `${RACINE}/filed?objet=fournisseur:${encodeURIComponent(f.id)}`;
    const lienValidations = `${RACINE}/validations`;
    const description =
      f.statut === "a_confirmer"
        ? `Fournisseur nouveau : ses factures restent bloquées tant qu'une personne n'a pas confirmé qu'il s'agit bien d'un fournisseur de l'entreprise.${l.deposant ? " Vous avez déposé sa première pièce : une autre personne confirme." : ""}`
        : f.statut === "bloque"
          ? "Bloqué : plus aucune facture n'est payée tant que le blocage tient."
          : f.statut === "refuse"
            ? "Écarté par une décision."
            : l.proposes
              ? `Confirmé, payable. ${l.proposes > 1 ? `${l.proposes} IBAN proposés attendent leur` : "Un IBAN proposé attend sa"} validation dans « À valider ».`
              : "Confirmé, payable.";

    /* le fil d'activité : ce que l'on sait, daté, dans l'ordre du temps */
    type Entree = { cle: string; quand: string; icone: React.ReactNode; texte: React.ReactNode };
    const fil: Entree[] = [
      ...l.ibans.map((i) => ({
        cle: `iban-${i.id}`,
        quand: i.propose_le,
        icone: <Landmark aria-hidden="true" />,
        texte: (
          <>
            <b>IBAN proposé</b> · <span className="fou-mono">{i.iban_masque}</span> · {i.statut === "valide" ? "validé" : i.statut === "propose" ? "à valider" : i.statut === "refuse" ? "refusé" : "révoqué"} ·{" "}
            {dateCourte(i.propose_le)}
          </>
        ),
      })),
      ...(f.identite_verifiee_le || l.identite !== "non"
        ? [
            {
              cle: "identite",
              quand: f.identite_verifiee_le ?? "",
              icone: <BadgeCheck className={l.identite === "invalide" ? "fou-alerte" : undefined} aria-hidden="true" />,
              texte: (
                <>
                  <b>Identité</b> · {l.identiteTexte}
                </>
              ),
            },
          ]
        : []),
      ...(f.confirme_le
        ? [
            {
              cle: "confirme",
              quand: f.confirme_le,
              icone: <IconeStatutProjet etat="fait" />,
              texte: (
                <>
                  <b>Confirmé</b> · {dateCourte(f.confirme_le)}
                </>
              ),
            },
          ]
        : []),
    ].sort((a, b) => a.quand.localeCompare(b.quand));

    const rangCol = colonnes.find((c) => c.cle === l.col)?.cartes ?? [];
    const rang = rangCol.findIndex((x) => x.id === l.id);
    const precedent = rang > 0 ? rangCol[rang - 1] : null;
    const suivant = rang >= 0 && rang < rangCol.length - 1 ? rangCol[rang + 1] : null;
    const epingle = epingles.has(l.id);
    const refermer = () => aller(lienId(null));
    const optionsTete: Option[] = [
      ...(precedent ? [{ cle: "precedent", libelle: "Fournisseur précédent", meta: `↑ · ${rang} / ${rangCol.length}`, icone: <ChevronUp width={16} height={16} />, action: () => aller(lienId(precedent.id)) }] : []),
      ...(suivant ? [{ cle: "suivant", libelle: "Fournisseur suivant", meta: `↓ · ${rang + 2} / ${rangCol.length}`, icone: <ChevronDown width={16} height={16} />, action: () => aller(lienId(suivant.id)) }] : []),
      ...gestes,
      { cle: "nom", libelle: "Copier le nom", icone: <Copy width={16} height={16} />, action: () => void copier(f.nom, "Nom copié") },
      ...(f.siren ? [{ cle: "siren", libelle: "Copier le SIREN", meta: f.siren, icone: <IconeDiese />, action: () => void copier(f.siren ?? "", "SIREN copié") }] : []),
      ...(f.tva ? [{ cle: "tva", libelle: "Copier la TVA", meta: f.tva, icone: <IconeDiese />, action: () => void copier(f.tva ?? "", "TVA copiée") }] : []),
      { cle: "documents", libelle: "Ouvrir dans Documents reçus", icone: <ExternalLink width={16} height={16} />, href: lienDocuments },
    ];
    /* l'horloge : les dates du fournisseur — les échéances de ses factures (vers la facture), puis les faits datés (vers l'activité) */
    const versActivite = () => activiteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const optionsDates: Option[] = [
      ...l.factures
        .filter((x) => x.echeance_lue)
        .sort((a, b) => (a.echeance_lue ?? "").localeCompare(b.echeance_lue ?? ""))
        .map((x) => ({ cle: `ech-${x.id}`, libelle: `Échéance ${x.reference ?? x.numero ?? "facture"}`, meta: dateCourte(x.echeance_lue), icone: <IconeDocument />, href: lienFacture(x) })),
      ...fil
        .filter((a) => a.quand)
        .map((a) => ({
          cle: a.cle,
          libelle: a.cle === "confirme" ? "Confirmé" : a.cle === "identite" ? "Identité vérifiée" : "IBAN proposé",
          meta: dateCourte(a.quand),
          icone: <Clock width={16} height={16} />,
          action: versActivite,
        })),
    ];
    const optionsStatut: Option[] = [
      ...gestes.filter((g) => g.cle === "confirmer" || g.cle === "bloquer"),
      { cle: "filtre", libelle: `Seulement « ${colonneDe(l.col).libelle} »`, icone: <IconeColonne col={l.col} />, coche: estActif("colonne", l.col), href: basculer("colonne", l.col) },
    ];
    const optionsIdentite: Option[] = [
      ...gestes.filter((g) => g.cle === "reverifier" || g.cle === "attester"),
      {
        cle: "filtre",
        libelle: `Fournisseurs : ${minuscule(identiteLibelle(l.identite))}`,
        icone: <BadgeCheck width={16} height={16} />,
        coche: estActif("identite", l.identite),
        href: basculer("identite", l.identite),
      },
    ];
    const optionsIban: Option[] = [
      ...gestes.filter((g) => g.cle === "iban"),
      ...(l.proposes && f.statut === "actif" ? [{ cle: "valider", libelle: "Valider dans « À valider »", icone: <ExternalLink width={16} height={16} />, href: lienValidations }] : []),
      ...(l.ibanValide
        ? [{ cle: "copier", libelle: "Copier l'IBAN (masqué)", meta: l.ibanValide.iban_masque, icone: <Copy width={16} height={16} />, action: () => void copier(l.ibanValide?.iban_masque ?? "", "IBAN copié") }]
        : []),
      { cle: "filtre", libelle: `Fournisseurs : ${minuscule(ibanLibelle(l.iban))}`, icone: <Landmark width={16} height={16} />, coche: estActif("iban", l.iban), href: basculer("iban", l.iban) },
    ];
    const optionsFactures: Option[] = l.factures.map((x) => ({ cle: x.id, libelle: x.reference ?? x.numero ?? "Facture", meta: statutFacture(x.statut).libelle, icone: <IconeDocument />, href: lienFacture(x) }));
    const iconeGeste: Record<string, React.ReactNode> = {
      confirmer: <UserCheck aria-hidden="true" />,
      reverifier: <RefreshCw aria-hidden="true" />,
      attester: <BadgeCheck aria-hidden="true" />,
      iban: <Landmark aria-hidden="true" />,
      bloquer: f.statut === "bloque" ? <Unlock aria-hidden="true" /> : <Ban aria-hidden="true" />,
    };

    return (
      <section className="lin-boite-detail" aria-label={`Fournisseur ${f.nom}`} ref={detailRef}>
        <header className="lin-tete">
          <span className="lin-tete-ref">{l.ref}</span>
          <span className="lin-tete-nom">{f.nom}</span>
          <button
            type="button"
            className="lin-rond"
            aria-pressed={epingle}
            aria-label={epingle ? "Désépingler" : "Épingler en haut de sa colonne"}
            title={epingle ? "Désépingler" : "Épingler en haut de sa colonne"}
            onClick={() => basculerEpingle(l.id)}
          >
            <Star fill={epingle ? "currentColor" : "none"} aria-hidden="true" />
          </button>
          <MenuActions rond aGauche titre="Actions" options={optionsTete} />
          <div className="lin-tete-ronds">
            <button type="button" className="lin-rond" aria-label="Voir l'activité" title="Voir l'activité" onClick={versActivite}>
              <Bell aria-hidden="true" />
            </button>
            <MenuOptions rond aDroite libelle="Dates" titre="Dates…" declencheur={<Clock aria-hidden="true" />} options={optionsDates} largeur={300} />
            <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={refermer}>
              <IconeBoiteX />
            </button>
          </div>
        </header>

        <div className="lin-ticket">
          <article className="lin-ticket-corps">
            <h2 className="lin-ticket-titre">{f.nom}</h2>
            <p className="lin-ticket-desc">{description}</p>
            {gestes.length ? (
              <div className="lin-ticket-icones">
                {gestes.map((g) => {
                  const refuse = g.cle === "confirmer" && l.deposant;
                  const titre = refuse ? "Vous avez déposé la pièce d'origine : une autre personne confirme." : g.libelle.replace("…", "");
                  return (
                    <button key={g.cle} type="button" className="lin-ticket-icone" aria-label={titre} title={titre} disabled={refuse || (g.cle === "reverifier" && envoi && !form)} onClick={g.action}>
                      {iconeGeste[g.cle]}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {l.ibans.length ? (
              <>
                <p className="fou-sous-titre">IBAN</p>
                <ul className="lin-ticket-sous" aria-label={`IBAN de ${f.nom}`}>
                  {l.ibans.map((i) => (
                    <li key={i.id}>
                      <span className="lin-ticket-sous-ligne">
                        <Landmark className="fou-ic" aria-hidden="true" />
                        <span className="lin-ticket-sous-ref fou-mono">{i.iban_masque}</span>
                        <span className="lin-ticket-sous-nom">
                          {i.statut === "propose" ? (
                            f.statut === "a_confirmer" ? (
                              "validé avec le fournisseur à sa confirmation"
                            ) : (
                              <>
                                à valider dans <Link href={lienValidations}>« À valider »</Link>
                              </>
                            )
                          ) : (
                            `proposé le ${dateCourte(i.propose_le)}`
                          )}
                        </span>
                        <span className="lin-ticket-sous-meta">{i.statut === "valide" ? "Validé" : i.statut === "propose" ? "Proposé" : i.statut === "refuse" ? "Refusé" : "Révoqué"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="fou-sous-titre fou-sous-vide">Aucun IBAN connu : le paiement passera par un autre moyen, ou proposez-en un.</p>
            )}

            {l.factures.length ? (
              <>
                <p className="fou-sous-titre">Factures</p>
                <ul className="lin-ticket-sous" aria-label={`Factures de ${f.nom}`}>
                  {l.factures.map((x) => (
                    <li key={x.id}>
                      <Link href={lienFacture(x)} className="lin-ticket-sous-ligne">
                        <IconeDocument />
                        <span className="lin-ticket-sous-ref">{x.reference ?? x.numero ?? "Facture"}</span>
                        <span className="lin-ticket-sous-nom">
                          {statutFacture(x.statut).libelle.toLowerCase()}
                          {x.date_emission ? `, du ${dateCourte(x.date_emission)}` : ""}
                        </span>
                        <span className="lin-ticket-sous-meta">{x.montant_ttc !== null ? `${montant(x.montant_ttc, x.devise)} TTC` : ""}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="fou-sous-titre fou-sous-vide">Aucune facture rattachée.</p>
            )}

            <hr className="lin-ticket-trait" />
            <div className="lin-ticket-activite-tete" ref={activiteRef}>
              <h3>Activité</h3>
            </div>
            <ul className="lin-ticket-fil">
              {fil.map((a) => (
                <li key={a.cle}>
                  {a.icone}
                  <span>{a.texte}</span>
                </li>
              ))}
              {!fil.length ? (
                <li>
                  <IconeStatutProjet etat="planifie" />
                  <span>Rien d&apos;enregistré pour l&apos;instant.</span>
                </li>
              ) : null}
              {fait && fait.id === l.id ? (
                <li role="status">
                  <IconeStatutProjet etat="fait" />
                  <span className="lin-ticket-fil-texte fou-fait">
                    <strong>C&apos;est fait.</strong> {fait.texte}
                  </span>
                </li>
              ) : null}
              {erreurAction && !form ? (
                <li role="alert">
                  <IconeStatutProjet etat="annule" />
                  <span className="lin-ticket-fil-texte fou-rouge">
                    <strong>Refusé par la base.</strong> {erreurAction}
                  </span>
                </li>
              ) : null}
            </ul>
          </article>

          <aside className="lin-ticket-cote" aria-label="Propriétés du fournisseur">
            <section className="lin-ticket-section">
              <h3>Propriétés</h3>
              <div className="lin-ticket-pilules">
                <MenuOptions
                  raccourci="s"
                  titre="Statut…"
                  declencheur={
                    <>
                      <IconeColonne col={l.col} />
                      {colonneDe(l.col).un}
                    </>
                  }
                  options={optionsStatut}
                  largeur={300}
                />
                <MenuOptions
                  raccourci="i"
                  titre="Identité…"
                  declencheur={
                    <>
                      <IconeIdentite l={l} />
                      {identiteLibelle(l.identite)}
                    </>
                  }
                  options={optionsIdentite}
                  largeur={300}
                />
                <MenuOptions
                  raccourci="b"
                  titre="IBAN…"
                  declencheur={
                    <>
                      <Landmark aria-hidden="true" />
                      {l.ibanValide ? l.ibanValide.iban_masque : l.proposes ? `${pluriel(l.proposes, "IBAN")} à valider` : "Sans IBAN"}
                    </>
                  }
                  options={optionsIban}
                  largeur={320}
                />
              </div>
            </section>
            {f.siren || f.tva || f.code ? (
              <section className="lin-ticket-section">
                <h3>Identifiants</h3>
                <div className="lin-ticket-pilules">
                  {f.siren ? (
                    <button type="button" className="lin-ticket-pilule" title="Copier le SIREN" onClick={() => void copier(f.siren ?? "", "SIREN copié")}>
                      <IconeDiese />
                      SIREN {f.siren}
                    </button>
                  ) : null}
                  {f.tva ? (
                    <button type="button" className="lin-ticket-pilule" title="Copier la TVA" onClick={() => void copier(f.tva ?? "", "TVA copiée")}>
                      <IconeDiese />
                      TVA {f.tva}
                    </button>
                  ) : null}
                  {f.code ? (
                    <span className="lin-ticket-pilule" title="Code fournisseur">
                      <IconeDiese />
                      {f.code}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
            <section className="lin-ticket-section">
              <h3>Factures</h3>
              <div className="lin-ticket-pilules">
                {l.factures.length ? (
                  <MenuOptions
                    raccourci="f"
                    titre="Factures du fournisseur…"
                    declencheur={
                      <>
                        <IconeDocument />
                        {pluriel(l.factures.length, "facture")}
                        {l.enCours ? `, ${l.enCours} en cours` : ""}
                      </>
                    }
                    options={optionsFactures}
                    largeur={320}
                  />
                ) : (
                  <span className="lin-ticket-pilule" data-vide="">
                    <IconeDocument />
                    Aucune facture
                  </span>
                )}
                {geste("confirmer") ? (
                  <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-alerte="">
                    <IconeGroupe />
                    {l.bloquees ? `${pluriel(l.bloquees, "facture")} bloquée${l.bloquees > 1 ? "s" : ""} jusqu'à confirmation` : "Bloquées jusqu'à confirmation"}
                  </span>
                ) : f.statut === "bloque" ? (
                  <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-alerte="">
                    <Ban aria-hidden="true" />
                    Ne pas payer : fournisseur bloqué
                  </span>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </section>
    );
  }

  /* ——— les fenêtres des gestes : les textes et les règles de l'écran d'avant, à l'identique ——— */
  function fenetre() {
    const l = enCours;
    const nom = l?.f.nom ?? "";
    const debloquer = form?.type === "bloquer" && !form.bloquer;
    const contenu =
      !form || !l
        ? null
        : form.type === "confirmer"
          ? {
              icone: <UserCheck width={18} height={18} aria-hidden="true" />,
              titre: "Confirmer le fournisseur",
              texte: `Vous confirmez que ${nom} est bien un fournisseur de l'entreprise. Il devient actif, l'IBAN proposé avec sa première facture est validé, et ses factures bloquées sont recontrôlées.`,
              bouton: "Confirmer le fournisseur",
              pret: !l.deposant,
              envoyer: () => void confirmer(l),
            }
          : form.type === "attester"
            ? {
                icone: <BadgeCheck width={18} height={18} aria-hidden="true" />,
                titre: "Attester l'identité",
                texte: `Quand le registre ne répond pas, ou pour un fournisseur étranger hors registre, vous attestez que ${nom} est bien l'entreprise qu'il dit être.`,
                bouton: "Attester",
                pret: motifOk,
                envoyer: () => void attester(l),
              }
            : form.type === "bloquer"
              ? {
                  icone: debloquer ? <Unlock width={18} height={18} aria-hidden="true" /> : <Ban width={18} height={18} aria-hidden="true" />,
                  titre: debloquer ? "Débloquer le fournisseur" : "Bloquer le fournisseur",
                  texte: debloquer ? `${nom} pourra de nouveau être payé.` : `Plus aucune facture de ${nom} ne sera payée tant que le blocage tient.`,
                  bouton: debloquer ? "Débloquer" : "Bloquer",
                  pret: motifOk,
                  envoyer: () => form.type === "bloquer" && void bloquer(l, form.bloquer),
                }
              : {
                  icone: <Landmark width={18} height={18} aria-hidden="true" />,
                  titre: "Proposer un IBAN",
                  texte: `Pour ${nom}. L'IBAN proposé devra être validé par une personne habilitée avant tout paiement.`,
                  bouton: "Proposer",
                  pret: motifOk && ibanOk,
                  envoyer: () => void soumettreIban(l),
                };
    const aideMotif =
      form?.type === "attester"
        ? "Sur quoi l'attestation se fonde : extrait Kbis reçu, registre étranger consulté, contrat signé…"
        : form?.type === "iban"
          ? "D'où vient cet IBAN et comment il a été vérifié (appel au numéro connu, courrier signé…)."
          : "Pourquoi, en une phrase.";
    return (
      <ModalOverlay isOpen={!!contenu} onOpenChange={(o) => !o && !envoi && setForm(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            {contenu ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contenu.pret && !envoi) contenu.envoyer();
                }}
              >
                <div className="v2-modale-corps">
                  <Heading slot="title" className="fou-modale-titre">
                    {contenu.icone}
                    {contenu.titre}
                  </Heading>
                  <p>{contenu.texte}</p>
                  {form?.type === "confirmer" ? (
                    <Note teinte="ambre">
                      La personne qui a déposé la pièce d&apos;origine ne confirme pas ce fournisseur : une autre personne décide. La confirmation est réservée au gérant, à l&apos;administrateur et au valideur ; elle est
                      conservée avec votre nom et l&apos;heure.
                    </Note>
                  ) : null}
                  {form?.type === "iban" ? (
                    <label className="v2-libelle">
                      IBAN (obligatoire)
                      <span className={`v2-champ${ibanSaisi && !ibanOk ? " v2-champ--erreur" : ""}`}>
                        <input className="fou-mono" value={ibanSaisi} onChange={(e) => setIbanSaisi(e.target.value)} placeholder="FR76 …" autoComplete="off" aria-invalid={!!ibanSaisi && !ibanOk} />
                      </span>
                      {ibanSaisi && !ibanOk ? <span className="v2-aide v2-aide--erreur">Format attendu : deux lettres, deux chiffres, puis 10 à 30 caractères.</span> : null}
                    </label>
                  ) : null}
                  <label className="v2-libelle">
                    {form?.type === "confirmer" ? "Motif (facultatif)" : "Motif (obligatoire, 3 caractères au moins)"}
                    <span className="v2-champ">
                      <textarea
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder={form?.type === "confirmer" ? "Ce que vous avez vérifié : bon de commande, appel au numéro connu, contrat…" : aideMotif}
                      />
                    </span>
                  </label>
                  {erreurAction ? (
                    <Note teinte="rouge" role="alert">
                      <strong>Refusé par la base.</strong> {erreurAction}
                    </Note>
                  ) : null}
                </div>
                <div className="v2-modale-pied">
                  <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                    Annuler
                  </Button>
                  <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!contenu.pret || envoi}>
                    {envoi ? "Enregistrement…" : contenu.bouton}
                  </button>
                </div>
              </form>
            ) : null}
          </Dialog>
        </Modal>
      </ModalOverlay>
    );
  }
}
