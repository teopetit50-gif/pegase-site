"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les échéances et renouvellements, sur la boîte de réception
   de Linear (« Inbox », 28/10/2026)

   Demande de Teo : la seconde page de chaque SaaS refaite sur l'Inbox de
   Linear, avec le langage de la première (./ComptesRisque.tsx). À gauche,
   une ligne par échéance : l'entretien, la révision ou le contrôle d'un
   équipement, ou le contrat qui s'éteint. L'avatar a la couleur du compte
   (la même que sur la première page) et l'icône de ce qui tombe (clé :
   entretien, document : contrat) ; la ligne 1 dit le compte et ce qui
   tombe, la ligne 2 l'état, la date relative, la nature et le site ; à
   droite l'hexagone de statut et la date. Une échéance « non lue » est une
   échéance à traiter : message à valider, client à prévenir par appel,
   échéance tombée, contrat qui s'éteint, ou échéance dans les sept jours
   pas encore prévenue. Les données n'ont pas de geste « lu » : rien n'est
   marqué en ouvrant une ligne.

   À droite, l'échéance ouverte (?id=) sur la page d'un ticket de Linear
   (Teo, 28/10 : « pas de sections grises, trop d'informations ») : ce qui
   tombe en titre, une phrase (compte, site, date, nature), quatre icônes
   (noter une intervention, appeler ou écrire, copier la référence, ouvrir
   la fiche), les autres échéances du compte, puis « Activité » : les
   interventions, le client prévenu (ou la décision qui l'attend) et
   l'échéance, et le composeur « Noter une intervention… ». À droite, sans
   cadre : Propriétés (état, échéance, nature), Étiquettes (type,
   commercial), Compte (et son contact). Sans échéance ouverte, l'état vide
   de Linear (rien n'est choisi d'office).
   ↑ et ↓ passent d'une échéance à l'autre, Échap referme.

   Les deux têtes (Teo, 28/10 : « les mêmes logos que Linear, qui montrent
   d'autres choses ») : la liste a son titre, un « ··· » (les gestes sur la
   liste) et trois ronds : « à traiter seulement » (?traiter=1, le même
   réglage que « Afficher »), Filtrer, Options d'affichage. Le détail a la
   référence et le titre, l'étoile (épingler en tête de liste, propre au
   navigateur), un « ··· » (précédente, suivante et les gestes de
   l'échéance) et trois ronds : l'activité, les dates, fermer.

   Mêmes portes que l'écran du 21/10 (../../espace/offload/Echeances) :
   l'exemple (echeancesExemple, modifié en mémoire par les gestes), ou la
   base réelle (offload_echeances_tableau). Le commercial et le contact du
   compte viennent d'offload_tableau, l'équipement et ses interventions
   d'offload_parc_compte. Un seul geste écrit : noter une intervention, y
   compris « faite ailleurs » (offload_noter_intervention, le geste du
   parc de la fiche) ; le geste de l'ancien écran, ouvrir la fiche du
   compte, est dans le « ··· » de la tête du détail. Le reste filtre la page sans
   la quitter (?filtre=horizon|etat|commercial|nature|type|compte:valeur,
   une pastille « ✕ » par filtre sous la tête de la liste), écrit ou
   appelle le client, ou copie. Gabarit : ../lin/lin.css, retouches :
   ./offload.css et ./BoiteEcheances.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bell, Building2, Check, CheckCheck, Clock, Copy, ExternalLink, FileText, Inbox, ListFilter, PhoneCall, ShieldCheck, SlidersHorizontal, Star, UserRound, Wrench, X } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { STATUTS_ECHEANCE, echeancesExemple } from "@/components/espace/offload/Echeances";
import { exempleOffload } from "@/components/espace/offload/exemples";
import * as portes from "@/components/espace/offload/portes";
import type { Compte, EcheanceLigne, ParcCompte } from "@/components/espace/offload/types";
import { Choix, Menu, MenuActions, MenuOptions, Surlignage, useEpingles, type Option } from "../lin/Lin";
import { IconeBoiteX, IconeCalendrier, IconeEnveloppe, IconeNonLus, IconeSante, IconeStatutProjet, type EtatProjet, type Sante } from "../lin/icones";
import { RACINE } from "../modules";
import "./offload.css";
import "./BoiteEcheances.css";

type Statut = EcheanceLigne["statut"];
type Teinte = "vert" | "jaune" | "rouge" | "gris" | "bleu";
type Horizon = "passee" | "mois" | "suivants";
type Tri = "echeance" | "compte" | "etat";
type Montrer = "toutes" | "a_traiter";
type Intervention = { le: string; nature: string; ailleurs: boolean; reference: string | null };

const ICI = `${RACINE}/offload/echeances`;
const LIEN_DECISIONS = `${RACINE}/validations`;
/* ce qui demande un geste d'abord, puis ce qui suit son cours, puis ce qui est fini */
const ORDRE: Statut[] = ["depassee", "appel", "a_valider", "a_venir", "prevenue", "honoree", "honoree_ailleurs", "close"];
const A_GESTE: Statut[] = ["depassee", "appel", "a_valider"];
const FINIES: Statut[] = ["honoree", "honoree_ailleurs", "close"];
/* l'icône de gauche de la liste : la santé de Linear (tombée = hors délai, un geste à faire = à risque) */
const santeDe = (e: EcheanceLigne): Sante =>
  e.statut === "depassee"
    ? "hors"
    : e.statut === "appel" || e.statut === "a_valider" || (e.s_eteint && !FINIES.includes(e.statut)) || (e.statut === "a_venir" && ecart(e.due_le) <= 7)
      ? "risque"
      : e.statut === "a_venir"
        ? "neutre"
        : "bien";
/* le statut d'une échéance en hexagone de projet : à venir (contour), en cours (moitié), faite (pleine), tombée (croix) */
const ETAT_PROJET: Record<Statut, EtatProjet> = {
  a_venir: "planifie",
  a_valider: "en-cours",
  prevenue: "en-cours",
  appel: "en-cours",
  depassee: "annule",
  honoree: "fait",
  honoree_ailleurs: "fait",
  close: "fait",
};
const HORIZONS: Record<Horizon, string> = { passee: "Date passée", mois: "Ce mois-ci", suivants: "Les mois suivants" };
const NATURES: Record<EcheanceLigne["nature"], string> = { reglementaire: "Réglementaire", commerciale: "Commerciale" };
const TYPES: Record<EcheanceLigne["type"], string> = { entretien: "Entretien d'un équipement", contrat: "Fin de contrat" };
/* les natures d'intervention de l'ancienne fiche (ParcCompte) */
const NATURES_INTERVENTION: Record<string, string> = { entretien: "Entretien", controle: "Contrôle", reparation: "Réparation", installation: "Installation" };
/* les couleurs d'icône de projet de Linear, une par compte : les mêmes que la première page */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const SANS_COMMERCIAL = "-";
const FORM_VIDE = { le: "", nature: "entretien", ailleurs: false, reference: "" };

const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const deux = (n: number) => String(n).padStart(2, "0");
/* le jour du visiteur, en date calendaire : les échéances sont des dates sans heure */
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
};
const ecart = (iso: string) => Math.round((Date.parse(iso.slice(0, 10)) - Date.parse(aujourdhui())) / 86400000);
const relatif = (n: number) => (n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n === -1 ? "hier" : n > 0 ? `dans ${n} jours` : `il y a ${-n} jours`);
/* « 22 oct. », l'année en plus quand ce n'est pas celle-ci */
const dateCourte = (iso: string | null | undefined) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: iso.slice(0, 4) === aujourdhui().slice(0, 4) ? undefined : "numeric", timeZone: "UTC" }) : "—";
/* « 12 novembre », l'année en plus quand ce n'est pas celle-ci : la date de la description */
const dateMoyenne = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`)
    .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: iso.slice(0, 4) === aujourdhui().slice(0, 4) ? undefined : "numeric", timeZone: "UTC" })
    .replace(/^1 /, "1er ");
const horizonDe = (e: EcheanceLigne): Horizon => (ecart(e.due_le) < 0 ? "passee" : e.due_le.slice(0, 7) === aujourdhui().slice(0, 7) ? "mois" : "suivants");
/* à traiter : un geste attendu, un contrat qui s'éteint, ou une échéance dans la semaine pas encore prévenue */
const aTraiter = (e: EcheanceLigne) => A_GESTE.includes(e.statut) || (e.s_eteint && !FINIES.includes(e.statut)) || (e.statut === "a_venir" && ecart(e.due_le) <= 7);
const teinteDe = (s: Statut): Teinte => {
  const t = STATUTS_ECHEANCE[s].teinte;
  return t === "ambre" ? "jaune" : t === "vert" || t === "bleu" || t === "rouge" ? t : "gris";
};
const libelleStatut = (e: EcheanceLigne) => (e.type === "contrat" && e.s_eteint && !FINIES.includes(e.statut) ? "Contrat qui s'éteint" : STATUTS_ECHEANCE[e.statut].libelle);
const titreDe = (e: EcheanceLigne) =>
  e.equipement ? `${e.equipement.type_entretien ?? "Échéance d'entretien"} · ${e.equipement.designation}` : e.contrat ? `Contrat ${e.contrat.numero}${e.contrat.libelle ? ` — ${e.contrat.libelle}` : ""}` : "Échéance";
const refDe = (e: EcheanceLigne) => e.equipement?.ref ?? e.contrat?.numero ?? "—";

/* les filtres de la page, lus dans l'adresse, un par dimension : ?filtre=horizon:passee&filtre=etat:a_valider */
type Dimension = "horizon" | "etat" | "commercial" | "nature" | "type" | "compte";
type Filtres = Partial<Record<Dimension, string>>;
const DIMENSIONS: Dimension[] = ["horizon", "etat", "commercial", "nature", "type", "compte"];
const TITRES_DIMENSION: Record<Dimension, string> = { horizon: "Horizon", etat: "État", commercial: "Commercial", nature: "Nature", type: "Type", compte: "Compte" };
const lireFiltres = (valeurs: string[]): Filtres => {
  const f: Filtres = {};
  for (const v of valeurs) {
    const i = v.indexOf(":");
    const dim = v.slice(0, i) as Dimension;
    const val = v.slice(i + 1);
    if (i < 1 || !val || !DIMENSIONS.includes(dim)) continue;
    const valide =
      dim === "horizon" ? Object.hasOwn(HORIZONS, val) : dim === "etat" ? Object.hasOwn(STATUTS_ECHEANCE, val) : dim === "nature" ? Object.hasOwn(NATURES, val) : dim === "type" ? Object.hasOwn(TYPES, val) : true;
    if (valide) f[dim] = val;
  }
  return f;
};

function IconeType({ e, taille = 16 }: { e: EcheanceLigne; taille?: number }) {
  return e.type === "contrat" ? <FileText width={taille} height={taille} strokeWidth={1.8} aria-hidden="true" /> : <Wrench width={taille} height={taille} strokeWidth={1.8} aria-hidden="true" />;
}

function IconeStatut({ s }: { s: Statut }) {
  return <IconeStatutProjet etat={ETAT_PROJET[s]} titre={STATUTS_ECHEANCE[s].libelle} />;
}

export default function BoiteEcheances() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const [exemple, setExemple] = useState<EcheanceLigne[]>(() => echeancesExemple());
  const comptesExemple = useMemo(() => exempleOffload().tableau.comptes, []);
  const [reel, setReel] = useState<EcheanceLigne[] | null>(null);
  const [comptesReels, setComptesReels] = useState<Compte[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [parcs, setParcs] = useState<Record<string, ParcCompte>>({});
  const [notees, setNotees] = useState<Record<string, Intervention[]>>({});
  const [tri, setTri] = useState<Tri>("echeance");
  /* les échéances épinglées (l'étoile de la tête du détail) : propres à ce navigateur, en tête de liste */
  const [epingles, basculerEpingle] = useEpingles("offload-echeances");
  const [recherche, setRecherche] = useState("");
  /* l'échéance dont la référence vient d'être copiée (l'icône passe à la coche un instant) */
  const [copie, setCopie] = useState<string | null>(null);
  /* le formulaire « Noter une intervention » est ouvert pour une échéance (son id), et l'avis qui suit le geste */
  const [formPour, setFormPour] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [avis, setAvis] = useState<{ id: string; teinte: Teinte; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);

  /* la base réelle : les échéances (offload_echeances_tableau), et les comptes pour le commercial et le contact (offload_tableau) */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      setParcs({});
      try {
        const [l, tb] = await Promise.all([portes.chargerEcheances(), portes.chargerTableau().catch(() => null)]);
        if (!actif) return;
        setReel(l);
        setComptesReels(tb?.comptes ?? []);
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setReel([]);
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const lignes = useMemo(() => (source === "exemple" ? exemple : (reel ?? [])), [source, exemple, reel]);
  const comptes = source === "exemple" ? comptesExemple : comptesReels;
  const parCompte = useMemo(() => new Map(comptes.map((c) => [c.id, c])), [comptes]);
  const id = params.get("id");
  const actifs = lireFiltres(params.getAll("filtre"));
  /* « à traiter seulement » (le rond « non lus » de la tête et le réglage « Afficher ») : ?traiter=1 */
  const traiter = params.get("traiter") === "1";
  const montrer: Montrer = traiter ? "a_traiter" : "toutes";
  const choisie = id ? (lignes.find((x) => x.id === id) ?? null) : null;
  const compteChoisi = choisie?.compte_id ?? null;

  /* le parc du compte de l'échéance ouverte (offload_parc_compte) : l'équipement, ses interventions, le contrat */
  useEffect(() => {
    if (source !== "reelle" || !compteChoisi || parcs[compteChoisi]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const p = await portes.chargerParcCompte(compteChoisi);
        if (actif) setParcs((x) => ({ ...x, [compteChoisi]: p }));
      } catch {
        /* le détail se lit sans le parc : seules les interventions manquent */
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, compteChoisi, parcs]);

  const commercialDe = (e: EcheanceLigne) => parCompte.get(e.compte_id)?.commercial ?? null;
  const correspond = (e: EcheanceLigne, f: Filtres) =>
    (!f.horizon || horizonDe(e) === f.horizon) &&
    (!f.etat || e.statut === f.etat) &&
    (!f.commercial || (commercialDe(e) ?? SANS_COMMERCIAL) === f.commercial) &&
    (!f.nature || e.nature === f.nature) &&
    (!f.type || e.type === f.type) &&
    (!f.compte || e.compte_id === f.compte);
  const sans = (d: Dimension): Filtres => {
    const n = { ...actifs };
    delete n[d];
    return n;
  };
  const avec = (d: Dimension, v: string): Filtres => (actifs[d] === v ? sans(d) : { ...actifs, [d]: v });
  /* l'adresse de la page : l'échéance ouverte, les filtres et « à traiter seulement » */
  const adresse = (f: Filtres, sel: string | null = id, t: boolean = traiter) => {
    const p = [...(sel ? [`id=${encodeURIComponent(sel)}`] : []), ...DIMENSIONS.filter((d) => f[d]).map((d) => `filtre=${d}:${encodeURIComponent(f[d] ?? "")}`), ...(t ? ["traiter=1"] : [])];
    return `${ICI}${p.length ? `?${p.join("&")}` : ""}`;
  };
  const nbAvec = (d: Dimension, v: string) => lignes.filter((e) => correspond(e, { ...sans(d), [d]: v })).length;
  const libelleFiltre = (d: Dimension, v: string) =>
    d === "horizon"
      ? HORIZONS[v as Horizon]
      : d === "etat"
        ? STATUTS_ECHEANCE[v as Statut].libelle
        : d === "commercial"
          ? v === SANS_COMMERCIAL
            ? "Sans commercial"
            : v
          : d === "nature"
            ? NATURES[v as EcheanceLigne["nature"]]
            : d === "type"
              ? TYPES[v as EcheanceLigne["type"]]
              : (lignes.find((e) => e.compte_id === v)?.compte_nom ?? "Ce compte");
  const iconeFiltre = (d: Dimension, v: string) =>
    d === "horizon" ? (
      <IconeCalendrier passe={v === "passee"} />
    ) : d === "etat" ? (
      <IconeStatut s={v as Statut} />
    ) : d === "commercial" ? (
      <UserRound width={14} height={14} aria-hidden="true" />
    ) : d === "nature" ? (
      <ShieldCheck width={14} height={14} aria-hidden="true" />
    ) : d === "type" ? (
      v === "contrat" ? (
        <FileText width={14} height={14} aria-hidden="true" />
      ) : (
        <Wrench width={14} height={14} aria-hidden="true" />
      )
    ) : (
      <Building2 width={14} height={14} aria-hidden="true" style={{ color: couleurDe(v) }} />
    );
  const optionFiltre = (d: Dimension, v: string, plus: Partial<Option> = {}): Option => ({
    cle: `${d}-${v}`,
    libelle: libelleFiltre(d, v),
    meta: pluriel(nbAvec(d, v), "échéance"),
    icone: iconeFiltre(d, v),
    coche: actifs[d] === v,
    href: adresse(avec(d, v)),
    ...plus,
  });
  /* les valeurs possibles de chaque dimension, celles qui laissent au moins une échéance (ou le filtre actif) */
  const valeursDe = (d: Dimension): string[] => {
    const toutes =
      d === "horizon"
        ? Object.keys(HORIZONS)
        : d === "etat"
          ? ORDRE
          : d === "nature"
            ? Object.keys(NATURES)
            : d === "type"
              ? Object.keys(TYPES)
              : d === "commercial"
                ? [...new Set(lignes.map((e) => commercialDe(e) ?? SANS_COMMERCIAL))].sort((a, b) => (a === SANS_COMMERCIAL ? 1 : b === SANS_COMMERCIAL ? -1 : a.localeCompare(b, "fr")))
                : [...new Set(lignes.map((e) => e.compte_id))].sort((a, b) => libelleFiltre("compte", a).localeCompare(libelleFiltre("compte", b), "fr"));
    return toutes.filter((v) => nbAvec(d, v) > 0 || actifs[d] === v);
  };
  const optionsDe = (d: Dimension) => valeursDe(d).map((v) => optionFiltre(d, v));

  /* la liste : les filtres, la recherche, « à traiter seulement », puis le tri ; les épinglées passent en tête, dans l'ordre du tri */
  const q = recherche.trim().toLowerCase();
  const visibles = lignes
    .filter((e) => correspond(e, actifs))
    .filter((e) => montrer === "toutes" || aTraiter(e))
    .filter((e) => !q || `${e.compte_nom} ${titreDe(e)} ${refDe(e)} ${e.equipement?.site ?? ""} ${commercialDe(e) ?? ""}`.toLowerCase().includes(q))
    .slice()
    .sort((a, b) =>
      tri === "compte"
        ? a.compte_nom.localeCompare(b.compte_nom, "fr") || a.due_le.localeCompare(b.due_le)
        : tri === "etat"
          ? Number(aTraiter(b)) - Number(aTraiter(a)) || ORDRE.indexOf(a.statut) - ORDRE.indexOf(b.statut) || a.due_le.localeCompare(b.due_le)
          : a.due_le.localeCompare(b.due_le) || a.compte_nom.localeCompare(b.compte_nom, "fr"),
    )
    .sort((a, b) => Number(epingles.has(b.id)) - Number(epingles.has(a.id)));
  const montrerTraiter = (t: boolean) => routeur.replace(adresse(actifs, id, t), { scroll: false });
  const nbATraiter = visibles.filter(aTraiter).length;

  /* ↑ / ↓ passent d'une échéance à l'autre, Échap referme : les touches lisent la dernière liste */
  const clavier = useRef<{ ordre: string[]; id: string | null; aller: (sel: string | null) => void }>({ ordre: [], id: null, aller: () => {} });
  useEffect(() => {
    clavier.current = {
      ordre: visibles.map((e) => e.id),
      id,
      aller: (sel) => {
        /* la touche suivante part de la nouvelle ligne, sans attendre l'adresse */
        clavier.current.id = sel;
        routeur.replace(adresse(actifs, sel), { scroll: false });
      },
    };
  });
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const cible = ev.target as HTMLElement | null;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      if (document.querySelector(".v2 .lin .lin-menu")) return;
      const { ordre, id: sel, aller } = clavier.current;
      if (ev.key === "Escape") {
        if (sel) {
          ev.preventDefault();
          aller(null);
        }
        return;
      }
      if ((ev.key !== "ArrowDown" && ev.key !== "ArrowUp") || !ordre.length) return;
      ev.preventDefault();
      const i = sel ? ordre.indexOf(sel) : -1;
      const j = ev.key === "ArrowDown" ? Math.min(ordre.length - 1, i + 1) : i < 0 ? ordre.length - 1 : Math.max(0, i - 1);
      if (ordre[j] !== sel) aller(ordre[j]);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);
  /* la ligne choisie reste visible dans la liste */
  useEffect(() => {
    if (id) document.querySelector(".v2 .lin .lin-boite-ligne[data-actif]")?.scrollIntoView({ block: "nearest" });
  }, [id]);

  /* noter une intervention, y compris « faite ailleurs » : le geste du parc (offload_noter_intervention) ;
     en base, l'échéance suivante est datée depuis cette date ; l'exemple est modifié en mémoire */
  const ouvrirForm = (e: EcheanceLigne) => {
    setForm(FORM_VIDE);
    setFormPour(e.id);
    window.setTimeout(() => document.getElementById("ech-intervention")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };
  const noter = async (e: EcheanceLigne) => {
    if (!e.equipement || occupe || !/^\d{4}-\d{2}-\d{2}$/.test(form.le)) return;
    const fait = form.ailleurs ? "Intervention faite ailleurs notée : l'échéance sort du cycle, la suivante est datée depuis cette date." : "Intervention notée : l'échéance suivante est datée depuis cette date.";
    const iv: Intervention = { le: form.le, nature: form.nature, ailleurs: form.ailleurs, reference: form.reference.trim() || null };
    if (source === "reelle") {
      setOccupe(true);
      setAvis(null);
      try {
        await portes.noterIntervention(e.equipement.id, iv.le, iv.nature, iv.ailleurs, iv.reference);
        const [l, p] = await Promise.all([portes.chargerEcheances(), portes.chargerParcCompte(e.compte_id)]);
        setReel(l);
        setParcs((x) => ({ ...x, [e.compte_id]: p }));
        setAvis({ id: e.id, teinte: "vert", texte: fait });
        setFormPour(null);
      } catch (err) {
        setAvis({ id: e.id, teinte: "rouge", texte: err instanceof Error ? err.message : "La base a refusé." });
      } finally {
        setOccupe(false);
      }
      return;
    }
    setExemple((prev) => prev.map((x) => (x.id === e.id ? { ...x, statut: iv.ailleurs ? "honoree_ailleurs" : "honoree", motif: null } : x)));
    setNotees((x) => ({ ...x, [e.id]: [iv, ...(x[e.id] ?? [])] }));
    setAvis({ id: e.id, teinte: "vert", texte: `${fait} (Exemple : rien n'est écrit en base.)` });
    setFormPour(null);
  };

  /* ——— la colonne de liste ——— */
  const pastillesFiltres = DIMENSIONS.filter((d) => actifs[d]).map((d) => (
    <Link key={d} href={adresse(sans(d))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
      {iconeFiltre(d, actifs[d] ?? "")}
      {libelleFiltre(d, actifs[d] ?? "")} ✕
    </Link>
  ));
  const chargement = source === "reelle" && reel === null && !erreur;
  /* le « ··· » de la tête de la liste (« Notification actions » de Linear) : les gestes sur la liste entière */
  const premiere = visibles.find(aTraiter) ?? null;
  const nbAValider = lignes.filter((e) => e.statut === "a_valider").length;
  const optionsListe: Option[] = [
    ...(premiere
      ? [{ cle: "premiere", libelle: "Ouvrir la première à traiter", meta: premiere.compte_nom, icone: <Inbox width={16} height={16} aria-hidden="true" />, action: () => clavier.current.aller(premiere.id) }]
      : []),
    { cle: "decisions", libelle: "Valider les messages", meta: nbAValider ? pluriel(nbAValider, "message") : "aucun", icone: <CheckCheck width={16} height={16} aria-hidden="true" />, href: LIEN_DECISIONS },
    ...(pastillesFiltres.length || recherche
      ? [
          {
            cle: "retirer",
            libelle: "Retirer les filtres",
            icone: <X width={16} height={16} aria-hidden="true" />,
            action: () => {
              setRecherche("");
              routeur.replace(adresse({}), { scroll: false });
            },
          },
        ]
      : []),
  ];
  const liste = (
    <section className="lin-boite-liste" aria-label="Échéances">
      <header className="lin-tete">
        <span className="lin-tete-titre">Échéances</span>
        <MenuActions rond aGauche titre="Actions de la liste" options={optionsListe} />
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
              <div className="lin-ech-menu">
                <input
                  className="lin-menu-champ"
                  autoFocus
                  placeholder="Compte, équipement, référence, site…"
                  aria-label="Chercher une échéance"
                  value={recherche}
                  onChange={(ev) => setRecherche(ev.target.value)}
                  onKeyDown={(ev) => ev.key === "Enter" && fermer()}
                />
                {(["horizon", "etat", "commercial", "nature", "type"] as Dimension[]).map((d) => {
                  const options = optionsDe(d);
                  return options.length ? (
                    <div key={d} role="group" aria-label={TITRES_DIMENSION[d]}>
                      <p className="lin-ech-menu-titre">{TITRES_DIMENSION[d]}</p>
                      {options.map((o) => (
                        <button
                          key={o.cle}
                          type="button"
                          className="lin-menu-option"
                          aria-pressed={o.coche}
                          onClick={() => {
                            fermer();
                            if (o.href) routeur.push(o.href, { scroll: false });
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
                      { cle: "echeance", libelle: "Date d'échéance" },
                      { cle: "etat", libelle: "À traiter d'abord" },
                      { cle: "compte", libelle: "Compte" },
                    ]}
                  />
                </label>
                <label className="lin-reglage">
                  Afficher
                  <Choix<Montrer>
                    libelle="Afficher"
                    valeur={montrer}
                    onChange={(v) => montrerTraiter(v === "a_traiter")}
                    options={[
                      { cle: "toutes", libelle: "Toutes les échéances" },
                      { cle: "a_traiter", libelle: "À traiter seulement" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
        </div>
      </header>
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
        <p className="lin-vide">Lecture des échéances…</p>
      ) : lignes.length === 0 ? (
        erreur ? null : (
          <p className="lin-vide">Aucune échéance dans les 60 jours. Importez votre parc installé (équipements, interventions, contrats) ou saisissez un équipement depuis la fiche d&apos;un compte.</p>
        )
      ) : visibles.length === 0 ? (
        <p className="lin-vide">Aucune échéance avec ces filtres.</p>
      ) : (
        <ul className="lin-boite-lignes">
          {visibles.map((e) => {
            const actif = e.id === id;
            const n = ecart(e.due_le);
            return (
              <li key={e.id}>
                <Link href={adresse(actifs, e.id)} scroll={false} className="lin-boite-ligne" data-actif={actif ? "" : undefined} data-non-lu={aTraiter(e) ? "" : undefined} aria-current={actif ? "true" : undefined}>
                  <span className="lin-boite-sante">
                    <IconeSante etat={santeDe(e)} />
                  </span>
                  <span className="lin-boite-texte">
                    <span className="lin-boite-l1">
                      {aTraiter(e) ? <span className="lin-boite-point" role="img" aria-label="À traiter" /> : null}
                      <b>{e.compte_nom}</b>
                      <span>{titreDe(e)}</span>
                    </span>
                    <span className="lin-boite-l2">
                      {libelleStatut(e)} · {relatif(n)}
                      {e.nature === "reglementaire" ? " · réglementaire" : ""}
                      {e.equipement?.site ? ` · ${e.equipement.site}` : ""}
                    </span>
                  </span>
                  <span className="lin-boite-droite">
                    <IconeStatut s={e.statut} />
                    <span className="lin-boite-heure">{dateCourte(e.due_le)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <Surlignage />
        </ul>
      )}
    </section>
  );

  /* ——— rien d'ouvert : l'état vide de Linear ——— */
  if (!id || !choisie) {
    const avisPerdu = id && avis?.id === id ? avis : null;
    return (
      <div className="lin">
        <h1 className="v2-sr">Échéances et renouvellements</h1>
        <div className="lin-boite">
          {liste}
          <section className="lin-boite-detail" aria-label="Aucune échéance ouverte">
            <header className="lin-tete" />
            <div className="lin-boite-vide">
              <Inbox aria-hidden="true" strokeWidth={1.2} />
              {id && !chargement ? (
                <>
                  {avisPerdu ? (
                    <p className="lin-ech-avis" data-teinte={avisPerdu.teinte} role="status">
                      {avisPerdu.texte}
                    </p>
                  ) : null}
                  <span>Cette échéance n&apos;est plus dans la liste.</span>
                </>
              ) : (
                <>
                  <span>{nbATraiter ? `${pluriel(nbATraiter, "échéance")} à traiter` : "Rien à traiter"}</span>
                  <p className="lin-ech-vide-sous">
                    Les entretiens, révisions, contrôles et contrats qui arrivent à échéance dans les soixante jours. Le client est prévenu la semaine qui précède, après votre validation ; une échéance réglementaire est
                    marquée comme telle.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  /* ——— l'échéance ouverte : la page d'un ticket de Linear ——— */
  const e = choisie;
  const c = parCompte.get(e.compte_id) ?? null;
  const commercial = c?.commercial ?? null;
  const n = ecart(e.due_le);
  const teinte = teinteDe(e.statut);
  const parc = parcs[e.compte_id] ?? null;
  const equipementParc = e.equipement ? (parc?.equipements.find((x) => x.id === e.equipement?.id) ?? null) : null;
  const contratParc = e.contrat ? (parc?.contrats.find((x) => x.id === e.contrat?.id) ?? null) : null;
  const peutNoter = !!e.equipement && !FINIES.includes(e.statut);
  const formOuvert = formPour === e.id && peutNoter;
  const avisIci = avis?.id === e.id ? avis : null;
  const memeCompte = lignes.filter((x) => x.compte_id === e.compte_id && x.id !== e.id).sort((a, b) => a.due_le.localeCompare(b.due_le));
  const interventions: (Intervention & { cle: string })[] = [
    ...(notees[e.id] ?? []).map((iv, i) => ({ ...iv, cle: `note-${i}` })),
    ...(equipementParc?.interventions ?? []).map((iv, i) => ({ ...iv, cle: `parc-${i}` })),
  ].sort((a, b) => b.le.localeCompare(a.le));
  const tel = c?.telephone ? `tel:${c.telephone.replace(/\s/g, "")}` : null;
  const mail = c?.email ? `mailto:${c.email}` : null;
  const optionNoter: Option[] = peutNoter ? [{ cle: "noter", libelle: "Noter une intervention…", icone: <Wrench width={16} height={16} />, action: () => ouvrirForm(e) }] : [];
  const optionsContact: Option[] = [
    ...(c?.email
      ? [
          { cle: "ecrire", libelle: "Écrire un e-mail", meta: c.email, icone: <IconeEnveloppe />, action: () => window.open(`mailto:${c.email}`) },
          { cle: "copier-mail", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.email ?? "") },
        ]
      : []),
    ...(c?.telephone
      ? [
          { cle: "appeler", libelle: "Appeler", meta: c.telephone, icone: <PhoneCall width={16} height={16} />, action: () => window.open(`tel:${(c.telephone ?? "").replace(/\s/g, "")}`) },
          { cle: "copier-tel", libelle: "Copier le numéro", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.telephone ?? "") },
        ]
      : []),
  ];
  const optionsStatut: Option[] = [...optionNoter, ...optionsDe("etat").map((o) => ({ ...o, coche: o.cle === `etat-${e.statut}` }))];
  const optionsDate: Option[] = optionsDe("horizon").map((o) => ({ ...o, coche: o.cle === `horizon-${horizonDe(e)}` }));
  const optionsNature: Option[] = optionsDe("nature").map((o) => ({ ...o, coche: o.cle === `nature-${e.nature}` }));
  const optionsType: Option[] = optionsDe("type").map((o) => ({ ...o, coche: o.cle === `type-${e.type}` }));
  const optionsCommercial: Option[] = optionsDe("commercial").map((o) => ({ ...o, coche: o.cle === `commercial-${commercial ?? SANS_COMMERCIAL}` }));
  const optionsCompte: Option[] = [
    optionFiltre("compte", e.compte_id, { libelle: actifs.compte === e.compte_id ? "Toutes les échéances" : "Les échéances de ce compte" }),
    ...(c?.ref ? [{ cle: "copier-ref", libelle: "Copier la référence du compte", meta: c.ref, icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.ref) }] : []),
    ...optionsContact,
  ];
  const optionsRef: Option[] = [
    { cle: "copier", libelle: e.contrat ? "Copier le numéro du contrat" : "Copier la référence de l'équipement", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(refDe(e)) },
  ];
  const copierRef = () => {
    /* la coche ne vient que si le presse-papiers a accepté (il refuse une page sans le focus) */
    navigator.clipboard?.writeText(refDe(e)).then(
      () => {
        setCopie(e.id);
        window.setTimeout(() => setCopie((x) => (x === e.id ? null : x)), 1500);
      },
      () => {},
    );
  };
  const lienFiche = `${RACINE}/offload?compte=${encodeURIComponent(e.compte_id)}`;
  /* le « ··· » de la tête du détail : passer d'une échéance à l'autre (↑ ↓), les gestes de l'ancienne tête et de son « ··· » */
  const epinglee = epingles.has(e.id);
  const ordre = visibles.map((x) => x.id);
  const rang = ordre.indexOf(e.id);
  const precedente = rang > 0 ? ordre[rang - 1] : rang < 0 && ordre.length ? ordre[ordre.length - 1] : null;
  const suivante = rang >= 0 ? (ordre[rang + 1] ?? null) : (ordre[0] ?? null);
  const optionsDetail: Option[] = [
    ...(precedente ? [{ cle: "precedente", libelle: "Échéance précédente", meta: "↑", icone: <ArrowUp width={16} height={16} aria-hidden="true" />, action: () => clavier.current.aller(precedente) }] : []),
    ...(suivante ? [{ cle: "suivante", libelle: "Échéance suivante", meta: "↓", icone: <ArrowDown width={16} height={16} aria-hidden="true" />, action: () => clavier.current.aller(suivante) }] : []),
    ...optionNoter,
    ...optionsContact,
    ...optionsRef,
    optionFiltre("compte", e.compte_id, { libelle: actifs.compte === e.compte_id ? "Toutes les échéances" : "Les échéances de ce compte", meta: undefined }),
    { cle: "fiche", libelle: "Ouvrir la fiche du compte", icone: <ExternalLink width={16} height={16} aria-hidden="true" />, href: lienFiche },
  ];
  const desc = `${e.compte_nom}${e.equipement?.site ? `, site ${e.equipement.site}` : ""} : ${e.type === "contrat" ? "le contrat prend fin" : `échéance${e.nature === "reglementaire" ? " réglementaire" : ""}`} le ${dateMoyenne(e.due_le)}, ${relatif(n)}.`;

  /* le fil d'activité : les interventions, le client prévenu (ou la décision qui l'attend), l'échéance — dans l'ordre du temps */
  type Entree = { cle: string; le: string; icone: React.ReactNode; texte: React.ReactNode; actions?: React.ReactNode };
  const ic14 = { width: 14, height: 14, "aria-hidden": true } as const;
  const fil: Entree[] = [];
  for (const iv of interventions.slice(0, 3))
    fil.push({
      cle: iv.cle,
      le: iv.le,
      icone: <Wrench {...ic14} />,
      texte: (
        <>
          <b>{NATURES_INTERVENTION[iv.nature] ?? iv.nature}</b> {iv.ailleurs ? "faite ailleurs" : "faite"}
          {iv.reference ? ` · bon ${iv.reference}` : ""} · {dateCourte(iv.le)}
        </>
      ),
    });
  if (e.type === "entretien" && e.base_le && !interventions.some((iv) => iv.le === e.base_le))
    fil.push({
      cle: "base",
      le: e.base_le,
      icone: <Wrench {...ic14} />,
      texte: (
        <>
          <b>Dernière intervention</b> connue · {dateCourte(e.base_le)}
        </>
      ),
    });
  if (contratParc?.debut)
    fil.push({
      cle: "debut",
      le: contratParc.debut,
      icone: <FileText {...ic14} />,
      texte: (
        <>
          <b>Début</b> du contrat · {dateCourte(contratParc.debut)}
        </>
      ),
    });
  /* l'état de l'échéance : une phrase d'OFFLOAD, ou une décision à prendre (message à valider, client à appeler) */
  const etat: Entree = { cle: "etat", le: aujourdhui(), icone: <IconeStatut s={e.statut} />, texte: null };
  if (e.statut === "a_valider" || e.statut === "appel") {
    etat.texte = (
      <span className="lin-ticket-fil-texte">{e.motif ?? (e.statut === "a_valider" ? "Le message de la semaine qui précède attend votre validation dans Décisions." : "Le client est à prévenir par appel.")}</span>
    );
    etat.actions =
      e.statut === "a_valider" ? (
        <>
          <Link href={LIEN_DECISIONS} className="v2-btn v2-btn--petit" data-actif="">
            <CheckCheck width={14} height={14} aria-hidden="true" />
            <span>Valider le message</span>
          </Link>
          {peutNoter ? (
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => ouvrirForm(e)}>
              <Wrench width={14} height={14} aria-hidden="true" />
              <span>Noter une intervention</span>
            </button>
          ) : null}
        </>
      ) : (
        <>
          {tel ? (
            <a href={tel} className="v2-btn v2-btn--petit" data-actif="">
              <PhoneCall width={14} height={14} aria-hidden="true" />
              <span>Appeler {c?.telephone}</span>
            </a>
          ) : null}
          {mail ? (
            <a href={mail} className="v2-btn v2-btn--petit">
              <IconeEnveloppe />
              <span>Écrire</span>
            </a>
          ) : null}
          {!tel && !mail && peutNoter ? (
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => ouvrirForm(e)}>
              <Wrench width={14} height={14} aria-hidden="true" />
              <span>Noter une intervention</span>
            </button>
          ) : null}
        </>
      );
  } else {
    const phrase: Record<Exclude<Statut, "a_valider" | "appel">, React.ReactNode> = {
      a_venir: (
        <>
          <b>OFFLOAD</b> préviendra le client la semaine qui précède, après votre validation
        </>
      ),
      prevenue: (
        <>
          <b>OFFLOAD</b> a prévenu le client · l&apos;échéance attend son intervention
        </>
      ),
      depassee: (
        <>
          <b>Échéance tombée</b> sans intervention connue · en attente, sans seconde relance
        </>
      ),
      honoree: <b>Échéance honorée</b>,
      honoree_ailleurs: (
        <>
          <b>Faite ailleurs</b> · l&apos;échéance sort du cycle
        </>
      ),
      close: <b>Échéance close</b>,
    };
    etat.texte = e.motif ? (
      <>
        <b>OFFLOAD</b> · {e.motif}
      </>
    ) : (
      phrase[e.statut]
    );
  }
  fil.push(etat);
  fil.push({
    cle: "due",
    le: e.due_le,
    icone: <IconeCalendrier passe={n < 0} />,
    texte: (
      <>
        <b>{e.type === "contrat" ? (e.s_eteint ? "Fin du contrat" : "Échéance du contrat") : "Échéance"}</b>
        {e.contrat?.reconduction ? ` · reconduction ${e.contrat.reconduction}` : ""} · {dateCourte(e.due_le)} · {relatif(n)}
      </>
    ),
  });
  fil.sort((a, b) => a.le.localeCompare(b.le) || (a.cle === "etat" ? 1 : b.cle === "etat" ? -1 : 0));

  return (
    <div className="lin">
      <h1 className="v2-sr">Échéances et renouvellements</h1>
      <div className="lin-boite">
        {liste}
        <section className="lin-boite-detail" aria-label={`Échéance : ${e.compte_nom}`}>
          <header className="lin-tete">
            <span className="lin-tete-ref">{refDe(e)}</span>
            <span className="lin-tete-nom">{titreDe(e)}</span>
            <button
              type="button"
              className="lin-rond"
              aria-pressed={epinglee}
              aria-label={epinglee ? "Désépingler" : "Épingler en haut de la liste"}
              title={epinglee ? "Désépingler" : "Épingler en haut de la liste"}
              onClick={() => basculerEpingle(e.id)}
            >
              <Star fill={epinglee ? "currentColor" : "none"} aria-hidden="true" />
            </button>
            <MenuActions rond aGauche titre="Actions" options={optionsDetail} />
            <div className="lin-tete-ronds">
              <button
                type="button"
                className="lin-rond"
                aria-label="Voir l'activité"
                title="Voir l'activité"
                onClick={() => document.getElementById("ech-activite")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                <Bell aria-hidden="true" />
              </button>
              <MenuOptions rond aDroite libelle="Dates" titre="Horizon…" declencheur={<Clock aria-hidden="true" />} options={optionsDate} largeur={280} />
              <button type="button" className="lin-rond" aria-label="Fermer (Échap)" title="Fermer (Échap)" onClick={() => clavier.current.aller(null)}>
                <IconeBoiteX />
              </button>
            </div>
          </header>

          <div className="lin-ticket">
            <article className="lin-ticket-corps">
              <h2 className="lin-ticket-titre">{titreDe(e)}</h2>
              <p className="lin-ticket-desc">{desc}</p>
              <div className="lin-ticket-icones">
                {peutNoter ? (
                  <button
                    type="button"
                    className="lin-ticket-icone"
                    aria-label="Noter une intervention"
                    title="Noter une intervention"
                    aria-expanded={formOuvert}
                    onClick={() => (formOuvert ? setFormPour(null) : ouvrirForm(e))}
                  >
                    <Wrench aria-hidden="true" />
                  </button>
                ) : null}
                {tel ? (
                  <a href={tel} className="lin-ticket-icone" aria-label="Appeler le client" title={`Appeler le client · ${c?.telephone}`}>
                    <PhoneCall aria-hidden="true" />
                  </a>
                ) : mail ? (
                  <a href={mail} className="lin-ticket-icone" aria-label="Écrire au client" title={`Écrire au client · ${c?.email}`}>
                    <IconeEnveloppe />
                  </a>
                ) : null}
                <button type="button" className="lin-ticket-icone" aria-label={optionsRef[0].libelle} title={copie === e.id ? "Copié" : `${optionsRef[0].libelle} · ${refDe(e)}`} onClick={copierRef}>
                  {copie === e.id ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
                <Link href={lienFiche} className="lin-ticket-icone" aria-label="Ouvrir la fiche du compte" title="Ouvrir la fiche du compte">
                  <Building2 aria-hidden="true" />
                </Link>
              </div>

              {memeCompte.length ? (
                <>
                  <ul className="lin-ticket-sous" aria-label="Les autres échéances du compte">
                    {memeCompte.slice(0, 5).map((x) => (
                      <li key={x.id}>
                        <Link href={adresse(actifs, x.id)} className="lin-ticket-sous-ligne" scroll={false}>
                          <IconeStatut s={x.statut} />
                          <span className="lin-ticket-sous-ref">{refDe(x)}</span>
                          <span className="lin-ticket-sous-nom">{titreDe(x)}</span>
                          <span className="lin-ticket-sous-meta">{dateCourte(x.due_le)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {memeCompte.length > 5 ? (
                    <Link href={adresse(avec("compte", e.compte_id))} className="lin-ticket-sous-appel" scroll={false}>
                      Voir les {memeCompte.length + 1} échéances du compte
                    </Link>
                  ) : null}
                </>
              ) : null}

              <hr className="lin-ticket-trait" />
              <div className="lin-ticket-activite-tete" id="ech-activite">
                <h3>Activité</h3>
              </div>
              <ul className="lin-ticket-fil">
                {fil.map((x) => (
                  <li key={x.cle}>
                    {x.icone}
                    <span>
                      {x.texte}
                      {x.actions ? <span className="lin-ticket-fil-actions">{x.actions}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>

              {avisIci ? (
                <p className="lin-ech-avis" data-teinte={avisIci.teinte} role={avisIci.teinte === "rouge" ? "alert" : "status"}>
                  {avisIci.texte}
                </p>
              ) : null}

              {peutNoter ? (
                <form
                  id="ech-intervention"
                  className="lin-ticket-composeur lin-ech-composeur"
                  aria-label="Noter une intervention"
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    void noter(e);
                  }}
                >
                  {formOuvert ? (
                    <div className="lin-ech-form-ligne">
                      <label className="lin-ech-champ">
                        Le (obligatoire)
                        <input type="date" autoFocus value={form.le} onChange={(ev) => setForm({ ...form, le: ev.target.value })} required />
                      </label>
                      <label className="lin-ech-champ">
                        Nature
                        <select value={form.nature} onChange={(ev) => setForm({ ...form, nature: ev.target.value })}>
                          {Object.entries(NATURES_INTERVENTION).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="lin-ech-champ">
                        N° de bon
                        <input value={form.reference} onChange={(ev) => setForm({ ...form, reference: ev.target.value })} />
                      </label>
                    </div>
                  ) : (
                    <button type="button" className="lin-ech-composeur-appel" onClick={() => ouvrirForm(e)}>
                      Noter une intervention…
                    </button>
                  )}
                  <div className="lin-ticket-composeur-pied">
                    {formOuvert ? (
                      <>
                        <label className="lin-ech-case">
                          <input type="checkbox" checked={form.ailleurs} onChange={(ev) => setForm({ ...form, ailleurs: ev.target.checked })} /> Faite ailleurs (par un autre prestataire)
                        </label>
                        <button type="button" className="v2-btn v2-btn--petit" onClick={() => setFormPour(null)}>
                          Annuler
                        </button>
                      </>
                    ) : null}
                    <button type="submit" className="lin-ticket-envoyer" aria-label="Noter l'intervention" title="Noter l'intervention" disabled={!formOuvert || occupe || !/^\d{4}-\d{2}-\d{2}$/.test(form.le)}>
                      <ArrowUp width={16} height={16} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              ) : null}
            </article>

            <aside className="lin-ticket-cote" aria-label="Propriétés de l'échéance">
              <section className="lin-ticket-section">
                <h3>Propriétés</h3>
                <div className="lin-ticket-pilules">
                  <MenuOptions
                    raccourci="s"
                    titre="État de l'échéance…"
                    teinte={teinte}
                    declencheur={
                      <>
                        <IconeStatut s={e.statut} />
                        {libelleStatut(e)}
                      </>
                    }
                    options={optionsStatut}
                    largeur={300}
                  />
                  <MenuOptions
                    raccourci="d"
                    titre="Horizon…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={n < 0} />
                        {`${e.type === "contrat" ? "Fin le" : "Échéance le"} ${dateCourte(e.due_le)}`}
                      </>
                    }
                    options={optionsDate}
                    largeur={280}
                  />
                  <MenuOptions
                    titre="Nature…"
                    declencheur={
                      <>
                        <ShieldCheck width={16} height={16} aria-hidden="true" />
                        {NATURES[e.nature]}
                      </>
                    }
                    options={optionsNature}
                    largeur={280}
                  />
                </div>
              </section>
              <section className="lin-ticket-section">
                <h3>Étiquettes</h3>
                <div className="lin-ticket-pilules">
                  <MenuOptions
                    titre="Type…"
                    declencheur={
                      <>
                        <IconeType e={e} />
                        {e.equipement?.type_entretien ?? TYPES[e.type]}
                      </>
                    }
                    options={optionsType}
                    largeur={280}
                  />
                  <MenuOptions
                    titre="Commercial…"
                    declencheur={
                      <>
                        <UserRound width={16} height={16} aria-hidden="true" />
                        {commercial ?? <span className="lin-ech-gris">Sans commercial</span>}
                      </>
                    }
                    options={optionsCommercial}
                    largeur={280}
                  />
                </div>
              </section>
              <section className="lin-ticket-section">
                <h3>Compte</h3>
                <div className="lin-ticket-pilules">
                  <MenuOptions
                    raccourci="c"
                    titre="Compte…"
                    declencheur={
                      <>
                        <Building2 width={16} height={16} strokeWidth={1.8} style={{ color: couleurDe(e.compte_id) }} aria-hidden="true" />
                        {e.compte_nom}
                      </>
                    }
                    options={optionsCompte}
                    largeur={320}
                  />
                  {optionsContact.length ? (
                    <div className="lin-ticket-sous-pilule">
                      <MenuOptions
                        titre="Contact…"
                        declencheur={
                          <>
                            {c?.email ? <IconeEnveloppe /> : <PhoneCall width={16} height={16} aria-hidden="true" />}
                            {c?.email ?? c?.telephone}
                          </>
                        }
                        options={optionsContact}
                        largeur={300}
                      />
                    </div>
                  ) : (
                    <span className="lin-ticket-pilule lin-ticket-sous-pilule" data-vide="">
                      {c ? "Aucun moyen de le joindre" : "Contact inconnu"}
                    </span>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
