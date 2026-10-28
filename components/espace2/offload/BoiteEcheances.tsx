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

   À droite, la page de l'échéance ouverte (?id=) : son titre, ses
   propriétés (statut, date, nature, commercial, compte, contact), la carte
   « Prévenir le client » (le message de la semaine qui précède), son
   équipement ou son contrat, ses interventions, les autres échéances du
   compte ; et les cartes Propriétés, Étapes, Calendrier et Activité. Sans
   échéance ouverte, l'état vide de Linear (rien n'est choisi d'office).
   ↑ et ↓ passent d'une échéance à l'autre, Échap referme.

   Mêmes portes que l'écran du 21/10 (../../espace/offload/Echeances) :
   l'exemple (echeancesExemple, modifié en mémoire par les gestes), ou la
   base réelle (offload_echeances_tableau). Le commercial et le contact du
   compte viennent d'offload_tableau, l'équipement et ses interventions
   d'offload_parc_compte. Un seul geste écrit : noter une intervention, y
   compris « faite ailleurs » (offload_noter_intervention, le geste du
   parc de la fiche) ; le geste de l'ancien écran, ouvrir la fiche du
   compte, est le bouton de la tête du détail. Le reste filtre la page sans
   la quitter (?filtre=horizon|etat|commercial|nature|type|compte:valeur,
   une pastille « ✕ » par filtre sous la tête de la liste), écrit ou
   appelle le client, ou copie. Gabarit : ../lin/lin.css, retouches :
   ./offload.css et ./BoiteEcheances.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, CheckCheck, Copy, ExternalLink, FileText, Inbox, ListFilter, MoreHorizontal, PhoneCall, ShieldCheck, SlidersHorizontal, UserRound, Wrench, X } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateLongue, montant } from "@/components/espace/format";
import { STATUTS_ECHEANCE, echeancesExemple } from "@/components/espace/offload/Echeances";
import { exempleOffload } from "@/components/espace/offload/exemples";
import * as portes from "@/components/espace/offload/portes";
import type { Compte, EcheanceLigne, ParcCompte } from "@/components/espace/offload/types";
import { CarteDroite, Choix, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeEnveloppe, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
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
/* ce qui demande un geste d'abord, puis ce qui suit son cours, puis ce qui est fini */
const ORDRE: Statut[] = ["depassee", "appel", "a_valider", "a_venir", "prevenue", "honoree", "honoree_ailleurs", "close"];
const A_GESTE: Statut[] = ["depassee", "appel", "a_valider"];
const FINIES: Statut[] = ["honoree", "honoree_ailleurs", "close"];
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

/* le losange d'un jalon : contour seul, jaune à 40 % une fois l'étape atteinte (celui de la première page) */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

function ChevronMaj() {
  return (
    <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
    </svg>
  );
}

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
  const [montrer, setMontrer] = useState<Montrer>("toutes");
  const [recherche, setRecherche] = useState("");
  const [ongletCalendrier, setOngletCalendrier] = useState<"horizon" | "etat">("horizon");
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
  /* l'adresse de la page : l'échéance ouverte et les filtres */
  const adresse = (f: Filtres, sel: string | null = id) => {
    const p = [...(sel ? [`id=${encodeURIComponent(sel)}`] : []), ...DIMENSIONS.filter((d) => f[d]).map((d) => `filtre=${d}:${encodeURIComponent(f[d] ?? "")}`)];
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

  /* la liste : les filtres, la recherche, « à traiter seulement », puis le tri */
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
    );
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
  const liste = (
    <section className="lin-boite-liste" aria-label="Échéances">
      <header className="lin-tete">
        <span className="lin-boite-titre">Échéances</span>
        <div className="lin-tete-droite">
          <Menu
            largeur={300}
            bouton={(ouvert, basculer) => (
              <button
                type="button"
                className="v2-btn v2-btn--petit v2-btn--icone"
                aria-label="Filtrer"
                title="Filtrer"
                aria-expanded={ouvert}
                aria-pressed={!!recherche || Object.keys(actifs).length > 0}
                onClick={basculer}
              >
                <ListFilter width={14} height={14} aria-hidden="true" />
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
                    onChange={setMontrer}
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
                  <span className="lin-boite-avatar" style={{ "--lin-avatar-teinte": couleurDe(e.compte_id) } as React.CSSProperties}>
                    <IconeType e={e} taille={20} />
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
        </div>
      </div>
    );
  }

  /* ——— l'échéance ouverte : la page d'un projet ——— */
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
  const valeur = c?.signal?.valeur_annuelle ?? null;
  const memeCompte = lignes.filter((x) => x.compte_id === e.compte_id && x.id !== e.id).sort((a, b) => a.due_le.localeCompare(b.due_le));
  const interventions: (Intervention & { cle: string })[] = [
    ...(notees[e.id] ?? []).map((iv, i) => ({ ...iv, cle: `note-${i}` })),
    ...(equipementParc?.interventions ?? []).map((iv, i) => ({ ...iv, cle: `parc-${i}` })),
  ].sort((a, b) => b.le.localeCompare(a.le));
  const derniere = interventions[0]?.le ?? equipementParc?.derniere_intervention ?? e.base_le;
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
  const optionsCommercial: Option[] = optionsDe("commercial").map((o) => ({ ...o, coche: o.cle === `commercial-${commercial ?? SANS_COMMERCIAL}` }));
  const optionsCompte: Option[] = [
    optionFiltre("compte", e.compte_id, { libelle: actifs.compte === e.compte_id ? "Toutes les échéances" : "Les échéances de ce compte" }),
    ...(c?.ref ? [{ cle: "copier-ref", libelle: "Copier la référence du compte", meta: c.ref, icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.ref) }] : []),
    ...optionsContact,
  ];
  const optionsRef: Option[] = [
    { cle: "copier", libelle: e.contrat ? "Copier le numéro du contrat" : "Copier la référence de l'équipement", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(refDe(e)) },
  ];
  const lienFiche = `${RACINE}/offload?compte=${encodeURIComponent(e.compte_id)}`;
  /* « Prévenir le client » : ce que dit l'état de l'échéance, mot pour mot celui de l'ancien écran */
  const texteMaj =
    e.motif ??
    (e.statut === "a_venir"
      ? `Le client est prévenu la semaine qui précède le ${dateCourte(e.due_le)}, après votre validation.`
      : e.statut === "a_valider"
        ? "Le message de la semaine qui précède attend votre validation dans Décisions."
        : e.statut === "prevenue"
          ? "Le client est prévenu : l'échéance attend son intervention."
          : e.statut === "appel"
            ? "Le client est à prévenir par appel."
            : e.statut === "depassee"
              ? "Échéance tombée sans intervention connue : en attente, sans seconde relance."
              : e.statut === "honoree"
                ? "Échéance honorée."
                : e.statut === "honoree_ailleurs"
                  ? "Faite ailleurs : l'échéance sort du cycle."
                  : "Échéance close.");
  const etapes =
    e.type === "contrat"
      ? [
          { cle: "debut", libelle: "Début du contrat", meta: contratParc?.debut ? dateCourte(contratParc.debut) : "—", atteint: !!contratParc?.debut },
          { cle: "reconduction", libelle: "Reconduction", meta: e.contrat?.reconduction ?? "—", atteint: !e.s_eteint },
          { cle: "fin", libelle: "Fin du contrat", meta: dateCourte(e.due_le), atteint: n <= 0 },
        ]
      : [
          { cle: "base", libelle: "Dernière intervention", meta: derniere ? dateCourte(derniere) : "—", atteint: !!derniere },
          {
            cle: "message",
            libelle: "Client prévenu",
            meta: e.statut === "prevenue" ? "prévenu" : e.statut === "a_valider" ? "message à valider" : e.statut === "appel" ? "par appel" : e.statut === "a_venir" ? "la semaine qui précède" : "—",
            atteint: e.statut === "prevenue",
          },
          { cle: "echeance", libelle: "Échéance", meta: dateCourte(e.due_le), atteint: n <= 0 },
          {
            cle: "intervention",
            libelle: "Intervention",
            meta: e.statut === "honoree" ? "faite" : e.statut === "honoree_ailleurs" ? "faite ailleurs" : "—",
            atteint: e.statut === "honoree" || e.statut === "honoree_ailleurs",
          },
        ];
  const activite = [
    ...interventions.map((iv) => ({ cle: iv.cle, le: iv.le, quoi: `${NATURES_INTERVENTION[iv.nature] ?? iv.nature}${iv.ailleurs ? ", faite ailleurs" : ""}${iv.reference ? ` · bon ${iv.reference}` : ""}`, fait: true })),
    ...(e.base_le && !interventions.some((iv) => iv.le === e.base_le) ? [{ cle: "base", le: e.base_le, quoi: "Dernière intervention connue", fait: true }] : []),
    { cle: "due", le: e.due_le, quoi: e.type === "contrat" ? "Fin du contrat" : "Échéance", fait: n <= 0 },
  ].sort((a, b) => b.le.localeCompare(a.le));
  /* la carte « Calendrier » : la liste (filtres gardés) par horizon ou par état ; une ligne filtre */
  const portee = lignes.filter((x) => correspond(x, actifs));
  const repartition =
    ongletCalendrier === "horizon"
      ? (Object.keys(HORIZONS) as Horizon[]).map((h) => ({ cle: h, d: "horizon" as Dimension, libelle: HORIZONS[h], nb: portee.filter((x) => horizonDe(x) === h).length }))
      : ORDRE.filter((s) => portee.some((x) => x.statut === s)).map((s) => ({ cle: s, d: "etat" as Dimension, libelle: STATUTS_ECHEANCE[s].libelle, nb: portee.filter((x) => x.statut === s).length }));
  const maxRepartition = Math.max(1, ...repartition.map((x) => x.nb));
  const resume = `${e.compte_nom} : ${e.type === "contrat" ? "le contrat prend fin" : "échéance"} le ${dateLongue(e.due_le)}, ${relatif(n)}.${e.nature === "reglementaire" ? " Échéance réglementaire." : ""}${e.equipement?.site ? ` Site : ${e.equipement.site}.` : ""}`;

  return (
    <div className="lin">
      <h1 className="v2-sr">Échéances et renouvellements</h1>
      <div className="lin-boite">
        {liste}
        <section className="lin-boite-detail" aria-label={`Échéance : ${e.compte_nom}`}>
          <header className="lin-tete">
            <nav className="lin-fil" aria-label="Fil d'Ariane">
              <Link href={adresse(actifs, null)} className="lin-fil-equipe" scroll={false}>
                Échéances
              </Link>
              <span className="lin-fil-sep" aria-hidden="true">
                ›
              </span>
              <span className="lin-fil-ici lin-fil-projet" aria-current="page">
                <Building2 width={16} height={16} strokeWidth={1.8} style={{ color: couleurDe(e.compte_id) }} aria-hidden="true" />
                <b>{refDe(e)}</b>
                {e.compte_nom}
              </span>
            </nav>
            <div className="lin-tete-droite">
              <Link href={lienFiche} className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Ouvrir la fiche du compte" title="Ouvrir la fiche du compte">
                <ExternalLink width={14} height={14} aria-hidden="true" />
              </Link>
              <Menu
                largeur={260}
                bouton={(ouvert, basculer) => (
                  <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Actions" title="Actions" aria-expanded={ouvert} onClick={basculer}>
                    <MoreHorizontal width={14} height={14} aria-hidden="true" />
                  </button>
                )}
              >
                {(fermer) => (
                  <div className="lin-ech-menu">
                    {[
                      ...optionNoter,
                      ...optionsContact,
                      ...optionsRef,
                      optionFiltre("compte", e.compte_id, { libelle: actifs.compte === e.compte_id ? "Toutes les échéances" : "Les échéances de ce compte", meta: undefined }),
                    ].map((o) => (
                      <button
                        key={o.cle}
                        type="button"
                        className="lin-menu-option"
                        onClick={() => {
                          fermer();
                          if (o.action) o.action();
                          else if (o.href) routeur.push(o.href, { scroll: false });
                        }}
                      >
                        {o.icone}
                        <span>{o.libelle}</span>
                        {o.meta ? <span className="lin-meta">{o.meta}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </Menu>
              <Link href={adresse(actifs, null)} className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Fermer (Échap)" title="Fermer (Échap)" scroll={false}>
                <X width={14} height={14} aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className="lin-projet">
            <article className="lin-projet-texte">
              <span className="lin-tuile" style={{ background: `color-mix(in srgb, ${couleurDe(e.compte_id)} 18%, transparent)`, color: couleurDe(e.compte_id) }}>
                <IconeType e={e} taille={24} />
              </span>
              <h1 className="lin-projet-h1">{titreDe(e)}</h1>
              <p className="lin-projet-resume">{resume}</p>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Propriétés</span>
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
                <MenuOptions
                  titre="Commercial…"
                  declencheur={
                    <>
                      <UserRound width={16} height={16} aria-hidden="true" />
                      {commercial ?? "Sans commercial"}
                    </>
                  }
                  options={optionsCommercial}
                  largeur={280}
                />
              </div>
              <div className="lin-projet-ligne">
                <span className="lin-projet-etiquette">Compte</span>
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
                {c?.email ? (
                  <MenuOptions
                    titre="Contact…"
                    declencheur={
                      <>
                        <IconeEnveloppe />
                        {c.email}
                      </>
                    }
                    options={optionsContact.filter((o) => o.cle === "ecrire" || o.cle === "copier-mail")}
                  />
                ) : null}
                {c?.telephone ? (
                  <MenuOptions
                    titre="Téléphone…"
                    declencheur={
                      <>
                        <PhoneCall width={16} height={16} aria-hidden="true" />
                        {c.telephone}
                      </>
                    }
                    options={optionsContact.filter((o) => o.cle === "appeler" || o.cle === "copier-tel")}
                  />
                ) : null}
                {!c?.email && !c?.telephone ? <span className="lin-puce lin-puce--vide">{c ? "Aucun moyen de le joindre" : "Contact inconnu"}</span> : null}
              </div>

              {avisIci ? (
                <p className="lin-ech-avis" data-teinte={avisIci.teinte} role={avisIci.teinte === "rouge" ? "alert" : "status"}>
                  {avisIci.texte}
                </p>
              ) : null}

              <details className="lin-maj" open aria-label="Prévenir le client">
                <summary className="lin-maj-tete">
                  <span className="lin-maj-titre">
                    Prévenir le client
                    <ChevronMaj />
                  </span>
                  {e.statut === "a_valider" ? (
                    <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                      <ExternalLink width={14} height={14} aria-hidden="true" /> Décisions
                    </Link>
                  ) : null}
                </summary>
                <p className="lin-maj-auteur">
                  <IconeStatut s={e.statut} />
                  <span data-teinte={teinte}>{libelleStatut(e)}</span>
                  <span className="lin-avatar-auteur lin-avatar-offload" aria-hidden="true">
                    <IconeType e={e} taille={11} />
                  </span>
                  <span className="lin-maj-gris">OFFLOAD</span>
                  <span className="lin-maj-gris">{relatif(n)}</span>
                </p>
                <p className="lin-maj-texte">{texteMaj}</p>
                <dl className="lin-maj-citation">
                  <div>
                    <dt>{e.type === "contrat" ? "Fin du contrat" : "Échéance"}</dt>
                    <dd>{dateLongue(e.due_le)}</dd>
                  </div>
                  {e.type === "entretien" ? (
                    <div>
                      <dt>Dernière intervention</dt>
                      <dd>{derniere ? dateLongue(derniere) : "—"}</dd>
                    </div>
                  ) : (
                    <div>
                      <dt>Reconduction</dt>
                      <dd>{e.contrat?.reconduction ?? "—"}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Nature</dt>
                    <dd>{e.nature === "reglementaire" ? "réglementaire" : "commerciale"}</dd>
                  </div>
                  <div>
                    <dt>Le message</dt>
                    <dd>la semaine qui précède, après votre validation</dd>
                  </div>
                </dl>

                {formOuvert ? (
                  <form
                    id="ech-intervention"
                    className="lin-ech-form"
                    aria-label="Noter une intervention"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      void noter(e);
                    }}
                  >
                    <div className="lin-ech-form-ligne">
                      <label className="lin-ech-champ">
                        Le (obligatoire)
                        <input type="date" value={form.le} onChange={(ev) => setForm({ ...form, le: ev.target.value })} required />
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
                    <label className="lin-ech-case">
                      <input type="checkbox" checked={form.ailleurs} onChange={(ev) => setForm({ ...form, ailleurs: ev.target.checked })} /> Faite ailleurs (par un autre prestataire)
                    </label>
                    <div className="lin-ech-form-pied">
                      <button type="submit" className="v2-btn v2-btn--petit" data-actif="" disabled={occupe || !/^\d{4}-\d{2}-\d{2}$/.test(form.le)}>
                        <CheckCheck width={14} height={14} aria-hidden="true" />
                        <span>Noter l&apos;intervention</span>
                      </button>
                      <button type="button" className="v2-btn v2-btn--petit" onClick={() => setFormPour(null)}>
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : null}

                <footer className="lin-maj-pied">
                  {peutNoter ? (
                    <button
                      type="button"
                      className="lin-maj-pied-btn"
                      aria-label="Noter une intervention"
                      title="Noter une intervention"
                      aria-expanded={formOuvert}
                      onClick={() => (formOuvert ? setFormPour(null) : ouvrirForm(e))}
                    >
                      <Wrench width={16} height={16} aria-hidden="true" />
                    </button>
                  ) : null}
                  {e.statut === "a_valider" ? (
                    <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider le message" title="Valider le message">
                      <CheckCheck width={16} height={16} aria-hidden="true" />
                    </Link>
                  ) : c?.telephone ? (
                    <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="lin-maj-pied-rond" aria-label="Appeler le client" title="Appeler le client">
                      <PhoneCall width={16} height={16} aria-hidden="true" />
                    </a>
                  ) : c?.email ? (
                    <a href={`mailto:${c.email}`} className="lin-maj-pied-rond" aria-label="Écrire au client" title="Écrire au client">
                      <IconeEnveloppe />
                    </a>
                  ) : null}
                </footer>
              </details>

              <h2 className="lin-projet-h2">{e.contrat ? "Le contrat" : "L'équipement"}</h2>
              {e.equipement ? (
                <ul className="lin-projet-liste">
                  <li>
                    <Wrench width={16} height={16} aria-hidden="true" />
                    <span>{e.equipement.designation}</span>
                    <span className="lin-meta">n° {e.equipement.ref}</span>
                  </li>
                  <li>
                    <IconeDiese />
                    <span>Type d&apos;entretien</span>
                    <span className="lin-meta">{e.equipement.type_entretien ?? "—"}</span>
                  </li>
                  <li>
                    <Building2 width={16} height={16} aria-hidden="true" />
                    <span>Site</span>
                    <span className="lin-meta">{e.equipement.site ?? "—"}</span>
                  </li>
                  {equipementParc ? (
                    <li>
                      <IconeCalendrier />
                      <span>Périodicité</span>
                      <span className="lin-meta">tous les {equipementParc.periodicite_mois} mois</span>
                    </li>
                  ) : null}
                  <li>
                    <IconeCalendrier passe={n < 0} />
                    <span>Prochaine échéance</span>
                    <span className="lin-meta">
                      {dateCourte(e.due_le)}
                      {e.base_le ? ` · datée depuis le ${dateCourte(e.base_le)}` : ""}
                    </span>
                  </li>
                </ul>
              ) : e.contrat ? (
                <ul className="lin-projet-liste">
                  <li>
                    <FileText width={16} height={16} aria-hidden="true" />
                    <span>
                      Contrat {e.contrat.numero}
                      {e.contrat.libelle ? ` — ${e.contrat.libelle}` : ""}
                    </span>
                    <span className="lin-meta">{e.s_eteint ? "s'éteint" : (contratParc?.statut ?? "")}</span>
                  </li>
                  {contratParc?.debut ? (
                    <li>
                      <IconeCalendrier />
                      <span>Début</span>
                      <span className="lin-meta">{dateCourte(contratParc.debut)}</span>
                    </li>
                  ) : null}
                  <li>
                    <IconeCalendrier passe={n < 0} />
                    <span>Fin</span>
                    <span className="lin-meta">{dateCourte(e.due_le)}</span>
                  </li>
                  <li>
                    <IconeDiese />
                    <span>Reconduction</span>
                    <span className="lin-meta">{e.contrat.reconduction}</span>
                  </li>
                </ul>
              ) : (
                <p className="lin-maj-texte lin-maj-gris">Ni équipement ni contrat rattaché.</p>
              )}

              {e.equipement ? (
                <>
                  <h2 className="lin-projet-h2">Interventions</h2>
                  {interventions.length ? (
                    <ul className="lin-projet-liste">
                      {interventions.map((iv) => (
                        <li key={iv.cle}>
                          <Losange atteint />
                          <span>
                            {NATURES_INTERVENTION[iv.nature] ?? iv.nature}
                            {iv.ailleurs ? ", faite ailleurs" : ""}
                          </span>
                          <span className="lin-meta">
                            {dateCourte(iv.le)}
                            {iv.reference ? ` · bon ${iv.reference}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="lin-maj-texte lin-maj-gris">{e.base_le ? `Dernière intervention connue le ${dateCourte(e.base_le)}.` : "Aucune intervention connue."}</p>
                  )}
                </>
              ) : null}

              <h2 className="lin-projet-h2">Les autres échéances du compte</h2>
              {memeCompte.length ? (
                <ul className="lin-projet-liste">
                  {memeCompte.map((x) => (
                    <li key={x.id}>
                      <Link href={adresse(actifs, x.id)} className="lin-projet-lien" scroll={false}>
                        <IconeStatut s={x.statut} />
                        <span>{titreDe(x)}</span>
                        <span className="lin-meta">
                          {libelleStatut(x)} · {dateCourte(x.due_le)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-maj-texte lin-maj-gris">Aucune autre échéance dans les soixante jours pour ce compte.</p>
              )}
            </article>

            <aside className="lin-cartes-droite" aria-label="Propriétés de l'échéance">
              <CarteDroite titre="Propriétés">
                <dl className="lin-props">
                  <div>
                    <dt>État</dt>
                    <dd data-teinte={teinte}>
                      <MenuOptions
                        plat
                        titre="État de l'échéance…"
                        declencheur={
                          <>
                            <IconeStatut s={e.statut} />
                            {libelleStatut(e)}
                          </>
                        }
                        options={optionsStatut}
                        largeur={300}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>{e.type === "contrat" ? "Fin" : "Échéance"}</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Horizon…"
                        declencheur={
                          <>
                            <IconeCalendrier passe={n < 0} />
                            {dateCourte(e.due_le)}
                          </>
                        }
                        options={optionsDate}
                        largeur={280}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Nature</dt>
                    <dd>
                      <MenuOptions
                        plat
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
                    </dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Type…"
                        declencheur={
                          <>
                            <IconeType e={e} />
                            {TYPES[e.type]}
                          </>
                        }
                        options={optionsDe("type").map((o) => ({ ...o, coche: o.cle === `type-${e.type}` }))}
                        largeur={280}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Compte</dt>
                    <dd>
                      <MenuOptions
                        plat
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
                    </dd>
                  </div>
                  <div>
                    <dt>Commercial</dt>
                    <dd className={commercial ? undefined : "lin-props-vide"}>
                      <MenuOptions
                        plat
                        titre="Commercial…"
                        declencheur={
                          <>
                            <UserRound width={16} height={16} aria-hidden="true" />
                            {commercial ?? "Sans commercial"}
                          </>
                        }
                        options={optionsCommercial}
                        largeur={280}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Référence</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Référence…"
                        declencheur={
                          <>
                            <IconeDiese />
                            {refDe(e)}
                          </>
                        }
                        options={optionsRef}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Valeur du compte</dt>
                    <dd className={valeur ? undefined : "lin-props-vide"}>
                      <span className="lin-valeur" title="La valeur annuelle du compte à son rythme d'achat habituel">
                        <IconeJauge />
                        {valeur ? `${montant(valeur)} par an` : "Inconnue"}
                      </span>
                    </dd>
                  </div>
                </dl>
              </CarteDroite>

              <CarteDroite titre="Étapes">
                <ul className="lin-jalons">
                  {etapes.map((x) => (
                    <li key={x.cle}>
                      <Losange atteint={x.atteint} />
                      <span className="lin-jalon-nom">{x.libelle}</span>
                      <span className="lin-meta">{x.meta}</span>
                      {x.cle === "intervention" && peutNoter ? <MenuActions titre="Intervention…" options={optionNoter} /> : null}
                    </li>
                  ))}
                </ul>
              </CarteDroite>

              <CarteDroite titre="Calendrier">
                <dl className="lin-kpis lin-kpis--trois">
                  <div>
                    <dt>
                      <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />À traiter
                    </dt>
                    <dd>{portee.filter(aTraiter).length}</dd>
                  </div>
                  <div>
                    <dt>
                      <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
                      Ce mois-ci
                    </dt>
                    <dd>{portee.filter((x) => horizonDe(x) === "mois").length}</dd>
                  </div>
                  <div>
                    <dt>
                      <span className="lin-carre" style={{ background: "var(--lin-rouge)" }} />
                      Date passée
                    </dt>
                    <dd>{portee.filter((x) => horizonDe(x) === "passee").length}</dd>
                  </div>
                </dl>
                <div className="lin-segment-carte" role="tablist">
                  {(
                    [
                      ["horizon", "Horizon"],
                      ["etat", "État"],
                    ] as const
                  ).map(([cle, lib]) => (
                    <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={ongletCalendrier === cle} onClick={() => setOngletCalendrier(cle)}>
                      {lib}
                    </button>
                  ))}
                </div>
                <ul className="lin-repartition lin-ech-repartition">
                  {repartition.map((x) => (
                    <li key={x.cle}>
                      <Link href={adresse(avec(x.d, x.cle))} scroll={false} data-actif={actifs[x.d] === x.cle ? "" : undefined} title={actifs[x.d] === x.cle ? "Retirer ce filtre" : "Filtrer la liste"}>
                        <span className="lin-tranche-nom">{x.libelle}</span>
                        <span className="lin-tranche-barre" aria-hidden="true">
                          <span style={{ width: `${(x.nb / maxRepartition) * 100}%` }} />
                        </span>
                        <span className="lin-meta">{x.nb}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CarteDroite>

              <CarteDroite titre="Activité">
                <ul className="lin-activite">
                  {activite.slice(0, 5).map((x) => (
                    <li key={x.cle}>
                      <Losange atteint={x.fait} />
                      <span>
                        {x.quoi} · {dateCourte(x.le)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CarteDroite>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
