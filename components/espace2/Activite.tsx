"use client";

/* ══════════════════════════════════════════════════════════════════════
   Activité — le fil d'activité d'un projet Linear, au 1:1 (28/10/2026, nuit)

   Demande de Teo : chaque page commune sur un modèle Linear ou Plain pas
   encore pris, « à l'identique ». Pour Activité : Pulse. Pulse n'est pas
   dans l'offre de Teo (/pulse renvoie sur /agent, le menu « More » ne le
   propose pas) → modèle de repli : l'onglet « Activity » d'un projet
   (linear.app/omegaaii/project/exemple-…/activity), rempli de deux mises à
   jour et d'un commentaire pour le relevé (scratchpad/releve-linear-pulse.md).
   Gabarit : ../lin/lin.css ; briques de la page : ../lin/linear-pulse.css (lpu-).

   Le dessin de Linear, et ce qu'il porte ici :
     tête 44            « Activité », le menu d'actions, le rond Filtrer
     pastilles de 28    la PÉRIODE (24 heures · 7 jours · 30 jours · Depuis le début)
     composeur          la rangée « Comment | Update » porte les TYPES
                        (Documents reçus · À valider · Décisions, chacun avec son
                        compte) ; l'éditeur est la RECHERCHE ; le pied : la source
                        et le nombre d'événements
     carte de mise à jour  une demande À VALIDER : le badge de santé (en attente),
                        qui demande, quand, le texte, le bloc des propriétés
                        (module, montant, échéance, état), « Détail » et « Ouvrir »
     carte de commentaire  un DOCUMENT REÇU : le fournisseur en auteur, l'heure,
                        la pièce et son montant, l'état dans le bouton du pied
     ligne d'événement  une DÉCISION : « Approuvée : « … » · demandé par X · 28 oct. »
     panneau de droite  Détail (l'événement choisi, le geste « Ouvrir »),
                        Propriétés (période, source, compte), Modules (les jalons
                        de Linear : un clic en retire un, avec son compte),
                        Activité (la légende et l'histogramme de la période)
   Tous les filtres sont dans l'adresse (periode, types, modules, q, objet) et
   se changent en place (replace). Mêmes sources qu'avant (./donnees) :
   l'exemple, ou la base réelle.

   Avant (22/10) : la page Logs de Supabase ; avant (11/10) : les colonnes d'Attio.
   ══════════════════════════════════════════════════════════════════════ */

import "./lin/lin.css";
import "./lin/linear-pulse.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, ListFilter, PanelRight, Search, X } from "lucide-react";
import { dateCourte, dateHeure, libelleModule, montant, relatif } from "@/components/espace/format";
import { etatDocument } from "@/components/espace/filed/etats";
import { nomPersonne } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { Note, Squelette } from "./ui";
import { useDonnees, type Donnees } from "./donnees";
import { STATUTS_DEMANDE } from "./evenements";
import { useMaintenant } from "./horloge";
import { RACINE } from "./modules";
import { CarteDroite, Menu, MenuActions, MenuOptions, type Option } from "./lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeGroupe, IconeSante, type Sante } from "./lin/icones";

const CHEMIN = `${RACINE}/activite`;
const JOUR = 86_400_000;

type Cle = "recus" | "a_valider" | "decisions";
type TeinteLin = "vert" | "jaune" | "rouge" | "bleu" | "gris";
type Carte = {
  id: string;
  colonne: Cle;
  quand: string;
  titre: string;
  complet: string;
  somme: number | null;
  devise: string;
  etat: { libelle: string; teinte: TeinteLin } | null;
  par: string | null;
  module: string;
  lien: string;
  texte: string;
  /* le document : sa référence ; la demande : son échéance */
  reference?: string;
  echeance?: string | null;
};

const TYPES: { cle: Cle; libelle: string; teinte: TeinteLin }[] = [
  { cle: "recus", libelle: "Documents reçus", teinte: "gris" },
  { cle: "a_valider", libelle: "À valider", teinte: "jaune" },
  { cle: "decisions", libelle: "Décisions", teinte: "bleu" },
];
const TOUS_TYPES: Cle[] = TYPES.map((t) => t.cle);
const TYPE: Record<Cle, string> = { recus: "Document reçu", a_valider: "À valider", decisions: "Décision" };
const GRAPH: Record<Cle, string> = { recus: "var(--lin-graph-gris)", a_valider: "var(--lin-graph-jaune)", decisions: "var(--lin-graph-bleu)" };
/* les liens « Voir tout » des colonnes d'avant : dans le menu d'actions de la tête */
const LIENS_TOUT: { libelle: string; href: string; icone: React.ReactNode }[] = [
  { libelle: "Voir tous les documents reçus", href: `${RACINE}/filed/boite`, icone: <IconeDocument /> },
  { libelle: "Voir toutes les demandes à valider", href: `${RACINE}/validations`, icone: <IconeSante etat="risque" /> },
  { libelle: "Voir toutes les décisions", href: `${RACINE}/validations`, icone: <IconeSante etat="bien" /> },
];

type Periode = "jour" | "7j" | "30j" | "tout";
const PERIODES: { cle: Periode; libelle: string; court: string; duree: number }[] = [
  { cle: "jour", libelle: "Dernières 24 heures", court: "24 heures", duree: JOUR },
  { cle: "7j", libelle: "7 derniers jours", court: "7 jours", duree: 7 * JOUR },
  { cle: "30j", libelle: "30 derniers jours", court: "30 jours", duree: 30 * JOUR },
  { cle: "tout", libelle: "Depuis le début", court: "Depuis le début", duree: Infinity },
];
const estPeriode = (v: string | null): v is Periode => v === "jour" || v === "7j" || v === "30j" || v === "tout";
const estCle = (v: string): v is Cle => v === "recus" || v === "a_valider" || v === "decisions";

/* « Payer la facture R2026-000014 — Papeterie Durand, 486,20 € » : la carte garde l'action, le reste va dans l'info-bulle */
const court = (resume: string) => resume.split(" — ")[0].trim() || resume;
const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const teinteLin = (t: string | undefined): TeinteLin => (t === "vert" ? "vert" : t === "ambre" ? "jaune" : t === "rouge" ? "rouge" : t === "bleu" ? "bleu" : "gris");
const santeDe = (t: TeinteLin): Sante => (t === "vert" ? "bien" : t === "jaune" ? "risque" : t === "rouge" ? "hors" : "neutre");
const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("");

function cartes(donnees: Donnees): Carte[] {
  const l: Carte[] = [];
  for (const d of donnees.docs) {
    const e = etatDocument(d.etat);
    const titre = d.fournisseur ? `${d.montant !== null ? "Facture" : "Document"} ${d.fournisseur}` : `Document ${d.reference}`;
    l.push({
      id: `doc-${d.id}`,
      colonne: "recus",
      quand: d.recu_le,
      titre,
      complet: `${d.reference}${d.fournisseur ? ` · ${d.fournisseur}` : ""}`,
      somme: d.montant,
      devise: d.devise,
      etat: { libelle: e.libelle, teinte: teinteLin(e.teinte) },
      par: d.fournisseur,
      module: "filed",
      lien: `${RACINE}/filed?objet=document:${encodeURIComponent(d.id)}`,
      texte: `${titre} ${d.reference} ${e.libelle}`,
      reference: d.reference,
    });
  }
  for (const d of donnees.demandes) {
    const par = d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id);
    const s = STATUTS_DEMANDE[d.statut] ?? { libelle: d.statut, teinte: "gris" as const };
    const base = { titre: court(d.resume), complet: d.resume, somme: d.montant, devise: d.devise, module: d.module, lien: `${RACINE}/validations`, echeance: d.echeance };
    if (d.statut === "en_attente") {
      l.push({ ...base, id: `dem-${d.id}`, colonne: "a_valider", quand: d.cree_le, etat: null, par, texte: `${d.resume} ${par}` });
    } else {
      l.push({ ...base, id: `dec-${d.id}`, colonne: "decisions", quand: d.decide_le ?? d.cree_le, etat: { libelle: s.libelle, teinte: teinteLin(s.teinte) }, par, texte: `${d.resume} ${s.libelle} ${par}` });
    }
  }
  return l;
}

/* les icônes relevées sur Linear (viewBox 16) : le « → » des changements, la bulle de « 0 comments » */
const Fleche = () => (
  <svg className="lpu-fleche" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M6.75194 10.6239C6.41861 10.8183 6 10.5779 6 10.192V5.80802C6 5.42212 6.41861 5.18169 6.75194 5.37613L10.5096 7.56811C10.8404 7.76105 10.8404 8.23895 10.5096 8.43189L6.75194 10.6239Z" fill="currentColor" />
  </svg>
);
const Bulle = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d="M8 2.2c3.5 0 6 2.2 6 5.1s-2.5 5.1-6 5.1c-.6 0-1.2-.1-1.8-.2l-2.6 1.3c-.4.2-.8-.1-.7-.5l.4-2C2.5 10.1 2 8.8 2 7.3 2 4.4 4.5 2.2 8 2.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

type Changements = Partial<Record<"periode" | "types" | "modules" | "q" | "objet", string | null>>;

export default function Activite() {
  const { donnees, erreur } = useDonnees();
  const { source } = useSource();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const params = useSearchParams();

  /* ——— l'adresse porte les filtres ——— */
  const periodeParam = params.get("periode");
  const periode: Periode = estPeriode(periodeParam) ? periodeParam : "30j";
  const typesParam = params.get("types");
  const types = useMemo<Cle[]>(() => (typesParam === null ? TOUS_TYPES : typesParam.split(",").filter(estCle)), [typesParam]);
  const modulesParam = params.get("modules");
  const modules = useMemo<string[] | null>(() => (modulesParam === null ? null : modulesParam.split(",").filter(Boolean)), [modulesParam]);
  const choisie = params.get("objet");
  const [recherche, setRecherche] = useState(params.get("q") ?? "");
  const [panneau, setPanneau] = useState(true);
  const minuterie = useRef<number | null>(null);

  const lien = (changes: Changements) => {
    const n = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === undefined || v === "") n.delete(k);
      else n.set(k, v);
    }
    const s = n.toString();
    return `${CHEMIN}${s ? `?${s}` : ""}`;
  };
  const aller = (href: string) => routeur.replace(href, { scroll: false });
  const setTypes = (t: Cle[]) => aller(lien({ types: t.length === TOUS_TYPES.length ? null : t.join(",") }));
  const setModules = (m: string[] | null) => aller(lien({ modules: m === null ? null : m.join(",") }));
  const setChoisie = (id: string | null) => aller(lien({ objet: id }));
  /* la recherche : le champ répond tout de suite, l'adresse suit à 150 ms */
  const chercher = (v: string) => {
    setRecherche(v);
    if (minuterie.current) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => aller(lien({ q: v.trim() || null })), 150);
  };
  useEffect(
    () => () => {
      if (minuterie.current) window.clearTimeout(minuterie.current);
    },
    [],
  );

  const toutes = useMemo(() => (donnees ? cartes(donnees) : null), [donnees]);
  const duree = PERIODES.find((p) => p.cle === periode)?.duree ?? Infinity;
  const dansPeriode = useMemo(() => (toutes && maintenant !== null ? toutes.filter((c) => duree === Infinity || maintenant - new Date(c.quand).getTime() <= duree) : null), [toutes, maintenant, duree]);
  const lesModules = useMemo(() => Array.from(new Set((dansPeriode ?? []).map((c) => c.module))), [dansPeriode]);
  const q = sansAccents(recherche.trim());
  const visibles = useMemo(
    () => (dansPeriode ?? []).filter((c) => types.includes(c.colonne) && (!modules || modules.includes(c.module)) && (!q || sansAccents(c.texte).includes(q))).sort((a, b) => b.quand.localeCompare(a.quand)),
    [dansPeriode, types, modules, q],
  );
  const carte = visibles.find((c) => c.id === choisie) ?? null;
  const compte = (f: (c: Carte) => boolean) => (dansPeriode ?? []).filter(f).length;

  /* l'histogramme : 40 tranches sur la période (ou sur l'étendue des événements), empilées par type */
  const barres = useMemo(() => {
    if (!visibles.length || maintenant === null) return { b: [] as Record<Cle, number>[], debut: 0 };
    const debut = duree === Infinity ? Math.min(...visibles.map((c) => new Date(c.quand).getTime())) : maintenant - duree;
    const pas = Math.max(1, (maintenant - debut) / 40);
    const b = Array.from({ length: 40 }, () => ({ recus: 0, a_valider: 0, decisions: 0 }));
    for (const c of visibles) {
      const k = Math.min(39, Math.max(0, Math.floor((new Date(c.quand).getTime() - debut) / pas)));
      b[k][c.colonne] += 1;
    }
    return { b, debut };
  }, [visibles, maintenant, duree]);
  const max = Math.max(1, ...barres.b.map((x) => x.recus + x.a_valider + x.decisions));
  const dateAxe = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const quandCourt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || maintenant === null) return "—";
    return maintenant - d.getTime() < JOUR ? relatif(iso, new Date(maintenant)) : dateCourte(iso);
  };

  /* ——— les menus ——— */
  const optionsActions: Option[] = [
    ...LIENS_TOUT.map((l) => ({ cle: l.href + l.libelle, libelle: l.libelle, icone: l.icone, href: l.href })),
    { cle: "tout-afficher", libelle: "Retirer tous les filtres", icone: <ListFilter width={16} height={16} aria-hidden="true" />, action: () => aller(CHEMIN) },
  ];
  const optionsPeriode: Option[] = PERIODES.map((p) => ({ cle: p.cle, libelle: p.libelle, icone: <IconeCalendrier />, coche: p.cle === periode, action: () => aller(lien({ periode: p.cle === "30j" ? null : p.cle })) }));
  const filtresActifs = (typesParam !== null ? 1 : 0) + (modulesParam !== null ? 1 : 0);
  const basculerType = (cle: Cle) => setTypes(types.includes(cle) ? types.filter((x) => x !== cle) : [...types, cle]);
  const basculerModule = (m: string) => {
    const base = modules ?? lesModules;
    setModules(base.includes(m) ? base.filter((x) => x !== m) : [...base, m]);
  };

  /* ——— le fil : cartes (à valider, documents) et lignes (décisions), groupées quand elles se suivent ——— */
  const blocs: ({ genre: "carte"; carte: Carte } | { genre: "lignes"; lignes: Carte[] })[] = [];
  for (const c of visibles) {
    if (c.colonne === "decisions") {
      const dernier = blocs[blocs.length - 1];
      if (dernier && dernier.genre === "lignes") dernier.lignes.push(c);
      else blocs.push({ genre: "lignes", lignes: [c] });
    } else blocs.push({ genre: "carte", carte: c });
  }
  const basculerChoix = (id: string) => setChoisie(id === choisie ? null : id);
  const toucheChoix = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      basculerChoix(id);
    }
  };
  const stop = { onClick: (e: React.MouseEvent) => e.stopPropagation(), onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() };
  const menuCarte = (c: Carte): Option[] => [
    { cle: "detail", libelle: c.id === choisie ? "Fermer le détail" : "Voir le détail", icone: <PanelRight width={16} height={16} aria-hidden="true" />, action: () => basculerChoix(c.id) },
    { cle: "ouvrir", libelle: c.colonne === "recus" ? "Ouvrir dans FILED" : "Ouvrir dans À valider", icone: <ExternalLink width={16} height={16} aria-hidden="true" />, href: c.lien },
  ];

  /* une demande à valider : la carte de mise à jour de Linear */
  const carteMaj = (c: Carte, premier: boolean) => {
    const t: TeinteLin = c.etat?.teinte ?? "jaune";
    const enRetard = !!c.echeance && maintenant !== null && new Date(c.echeance).getTime() < maintenant;
    return (
      <div className={premier ? "lpu-bloc lpu-bloc--premier" : "lpu-bloc"} key={c.id}>
        <article
          className="lpu-carte lpu-carte--maj"
          data-actif={c.id === choisie ? "" : undefined}
          tabIndex={0}
          aria-label={`${TYPE[c.colonne]} : ${c.titre}`}
          onClick={() => basculerChoix(c.id)}
          onKeyDown={(e) => toucheChoix(e, c.id)}
        >
          <div className="lpu-carte-tete">
            <div className="lpu-carte-gauche">
              <span className="lpu-sante" data-teinte={t}>
                <IconeSante etat={santeDe(t)} />
                {c.etat?.libelle ?? "En attente"}
              </span>
              <span className="lpu-auteur">
                <span className="lpu-auteur-nom">
                  <span className="lpu-avatar" aria-hidden="true">
                    {initiales(c.par ?? "Omega")}
                  </span>
                  {c.par ?? "Omega"}
                </span>
                <time className="lpu-date" dateTime={c.quand} title={dateHeure(c.quand)}>
                  {quandCourt(c.quand)}
                </time>
              </span>
            </div>
            <div className="lpu-carte-menu" {...stop}>
              <MenuActions rond aGauche titre="Actions de l'événement" options={menuCarte(c)} />
            </div>
          </div>
          <p className="lpu-carte-texte">{c.complet}</p>
          <div className="lpu-citation">
            <div className="lpu-citation-cadre">
              <span className="lpu-citation-barre" aria-hidden="true" />
              <dl className="lpu-props">
                <dt>Module</dt>
                <dd>
                  <IconeDiese />
                  <span>{libelleModule(c.module)}</span>
                </dd>
                {c.somme !== null ? (
                  <>
                    <dt>Montant</dt>
                    <dd>
                      <span>{montant(c.somme, c.devise)}</span>
                    </dd>
                  </>
                ) : null}
                {c.echeance ? (
                  <>
                    <dt>Échéance</dt>
                    <dd>
                      <IconeCalendrier passe={enRetard} />
                      <span>{dateCourte(c.echeance)}</span>
                      {maintenant !== null ? (
                        <>
                          <Fleche />
                          <span data-teinte={enRetard ? "rouge" : undefined}>{relatif(c.echeance, new Date(maintenant))}</span>
                        </>
                      ) : null}
                    </dd>
                  </>
                ) : null}
                <dt>État</dt>
                <dd>
                  <span data-teinte={t}>{c.etat?.libelle ?? "En attente de validation"}</span>
                </dd>
              </dl>
            </div>
          </div>
          <div className="lpu-carte-pied" {...stop}>
            <button type="button" className="lpu-bouton-bulle" aria-pressed={c.id === choisie} onClick={() => basculerChoix(c.id)}>
              <Bulle />
              <span className="v2-sr">{c.id === choisie ? "Fermer le détail" : "Voir le détail"}</span>
            </button>
            <Link href={c.lien} className="lin-rond" aria-label="Ouvrir dans À valider" title="Ouvrir dans À valider">
              <ExternalLink width={14} height={14} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </div>
    );
  };

  /* un document reçu : la carte de commentaire de Linear */
  const carteDocument = (c: Carte, premier: boolean) => (
    <div className={premier ? "lpu-bloc lpu-bloc--premier" : "lpu-bloc"} key={c.id}>
      <article
        className="lpu-carte lpu-carte--commentaire"
        data-actif={c.id === choisie ? "" : undefined}
        tabIndex={0}
        aria-label={`${TYPE[c.colonne]} : ${c.titre}`}
        onClick={() => basculerChoix(c.id)}
        onKeyDown={(e) => toucheChoix(e, c.id)}
      >
        <div className="lpu-commentaire-corps">
          <div className="lpu-commentaire-tete">
            <span className="lpu-commentaire-nom">
              <span className="lpu-avatar lpu-avatar--module" aria-hidden="true">
                {libelleModule(c.module)[0]}
              </span>
              {c.par ?? libelleModule(c.module)}
            </span>
            <time className="lpu-date" dateTime={c.quand} title={dateHeure(c.quand)}>
              {quandCourt(c.quand)}
            </time>
          </div>
          <p className="lpu-carte-texte">
            {c.titre}
            {c.par && c.reference ? ` · ${c.reference}` : ""}
            {c.somme !== null ? ` · ${montant(c.somme, c.devise)}` : ""}
          </p>
          <div className="lpu-commentaire-actions" {...stop}>
            <Link href={c.lien} className="lin-rond" aria-label="Ouvrir dans FILED" title="Ouvrir dans FILED">
              <ExternalLink width={14} height={14} aria-hidden="true" />
            </Link>
            <MenuActions rond aGauche titre="Actions de l'événement" options={menuCarte(c)} />
          </div>
        </div>
        <div className="lpu-commentaire-pied" {...stop}>
          <button type="button" className="lpu-bouton-bulle" aria-pressed={c.id === choisie} onClick={() => basculerChoix(c.id)} title={c.id === choisie ? "Fermer le détail" : "Voir le détail"}>
            <Bulle />
            {c.etat ? <span data-teinte={c.etat.teinte}>{c.etat.libelle}</span> : <span className="v2-sr">Voir le détail</span>}
          </button>
        </div>
      </article>
    </div>
  );

  /* les décisions : les lignes d'événement de Linear (« Wizyy changed status … · Oct 28 ») */
  const lignesDecisions = (lignes: Carte[], premier: boolean) => (
    <div className={premier ? "lpu-bloc lpu-bloc--premier" : "lpu-bloc"} key={lignes[0].id}>
      <div className="lpu-evenements">
        {lignes.map((c) => (
          <div
            key={c.id}
            className="lpu-evenement"
            role="button"
            tabIndex={0}
            data-actif={c.id === choisie ? "" : undefined}
            aria-label={`${TYPE[c.colonne]} : ${c.titre}`}
            onClick={() => basculerChoix(c.id)}
            onKeyDown={(e) => toucheChoix(e, c.id)}
          >
            <span className="lpu-evenement-icone" data-teinte={c.etat?.teinte ?? "gris"}>
              <IconeSante etat={santeDe(c.etat?.teinte ?? "gris")} />
            </span>
            <span className="lpu-evenement-texte">
              <b>{c.etat?.libelle ?? "Décision"}</b> : « {c.titre} »{c.somme !== null ? `, ${montant(c.somme, c.devise)}` : ""}
              {c.par ? (
                <>
                  {" "}
                  · demandé par <b>{c.par}</b>
                </>
              ) : null}{" "}
              ·{" "}
              <time dateTime={c.quand} title={dateHeure(c.quand)}>
                {quandCourt(c.quand)}
              </time>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const valeur = (icone: React.ReactNode, texte: string, teinte?: TeinteLin) => (
    <span className="lpu-valeur" data-teinte={teinte}>
      {icone}
      <span>{texte}</span>
    </span>
  );

  return (
    <div className="lin lpu v2-arrivee">
      <h1 className="v2-sr">Activité</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Activité</span>
        <MenuActions rond aGauche titre="Actions de la page" options={optionsActions} />
        <div className="lin-tete-ronds">
          <Menu
            largeur={300}
            bouton={(ouvert, basculer) => (
              <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} data-actif={filtresActifs || q ? "" : undefined} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <div>
                <input
                  className="lin-menu-champ"
                  autoFocus
                  placeholder="Filtrer par fournisseur, référence, demande, état…"
                  aria-label="Filtrer les événements"
                  value={recherche}
                  onChange={(e) => chercher(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fermer()}
                />
                <div role="group" aria-label="Type">
                  <p className="lpu-menu-titre">Type</p>
                  {TYPES.map((t) => (
                    <button key={t.cle} type="button" className="lin-menu-option" aria-pressed={types.includes(t.cle)} onClick={() => basculerType(t.cle)}>
                      <IconeSante etat={santeDe(t.teinte)} />
                      <span>{t.libelle}</span>
                      <span className="lin-meta">{dansPeriode ? compte((x) => x.colonne === t.cle) : ""}</span>
                      {types.includes(t.cle) ? <Check width={14} height={14} aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
                {lesModules.length ? (
                  <div role="group" aria-label="Module">
                    <p className="lpu-menu-titre">Module</p>
                    {lesModules.map((m) => (
                      <button key={m} type="button" className="lin-menu-option" aria-pressed={!modules || modules.includes(m)} onClick={() => basculerModule(m)}>
                        <IconeDiese />
                        <span>{libelleModule(m)}</span>
                        <span className="lin-meta">{compte((x) => x.module === m)}</span>
                        {!modules || modules.includes(m) ? <Check width={14} height={14} aria-hidden="true" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </Menu>
        </div>
      </header>

      <div className="lin-outils lpu-rangee">
        <div className="lin-onglets" role="tablist" aria-label="Période">
          {PERIODES.map((p) => (
            <Link
              key={p.cle}
              href={lien({ periode: p.cle === "30j" ? null : p.cle })}
              replace
              scroll={false}
              className="lin-onglet"
              role="tab"
              aria-selected={periode === p.cle}
              data-actif={periode === p.cle ? "" : undefined}
            >
              {p.court}
            </Link>
          ))}
        </div>
        <div className="lin-outils-droite">
          <button
            type="button"
            className="lin-rond"
            aria-pressed={panneau}
            aria-label={panneau ? "Masquer le panneau" : "Afficher le panneau"}
            title={panneau ? "Masquer le panneau" : "Afficher le panneau"}
            onClick={() => setPanneau((v) => !v)}
          >
            <PanelRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lpu-corps">
        <div className="lpu-fil">
          <div className="lpu-colonne">
            <div className="lpu-bloc lpu-bloc--composeur">
              <form className="lpu-composeur" role="search" onSubmit={(e) => e.preventDefault()}>
                <div className="lpu-composeur-haut">
                  <div className="lpu-segment" role="group" aria-label="Type d'événement">
                    {TYPES.map((t) => (
                      <button key={t.cle} type="button" aria-pressed={types.includes(t.cle)} onClick={() => basculerType(t.cle)}>
                        {t.libelle}
                        <span className="lpu-segment-compte">{dansPeriode ? compte((x) => x.colonne === t.cle) : "·"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="v2-sr" htmlFor="lpu-recherche">
                  Filtrer les événements
                </label>
                <input
                  id="lpu-recherche"
                  className="lpu-composeur-champ"
                  type="search"
                  value={recherche}
                  onChange={(e) => chercher(e.target.value)}
                  placeholder="Filtrer par fournisseur, référence, demande, état…"
                  autoComplete="off"
                />
                <div className="lpu-composeur-pied">
                  <span className="lpu-composeur-source">
                    <IconeGroupe />
                    {source === "exemple" ? "Données d'exemple" : "Base réelle"}
                  </span>
                  <div className="lpu-composeur-droite">
                    {recherche ? (
                      <button type="button" className="lin-rond" onClick={() => chercher("")} aria-label="Effacer le filtre" title="Effacer le filtre">
                        <X width={14} height={14} aria-hidden="true" />
                      </button>
                    ) : null}
                    <span className="lpu-bouton-pilule" aria-live="polite">
                      {dansPeriode ? `${visibles.length} événement${visibles.length > 1 ? "s" : ""}` : "…"}
                    </span>
                  </div>
                </div>
              </form>
            </div>

            {erreur ? (
              <div className="lpu-bloc lpu-bloc--premier">
                <Note teinte="rouge" role="alert">
                  <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
                </Note>
              </div>
            ) : null}

            {!dansPeriode ? (
              <div className="lpu-bloc lpu-bloc--premier">
                <div className="lpu-squelettes" aria-busy="true" aria-label="Chargement">
                  {[0, 1, 2, 3].map((k) => (
                    <Squelette key={k} hauteur={16} />
                  ))}
                </div>
              </div>
            ) : blocs.length ? (
              blocs.map((b, i) => (b.genre === "lignes" ? lignesDecisions(b.lignes, i === 0) : b.carte.colonne === "recus" ? carteDocument(b.carte, i === 0) : carteMaj(b.carte, i === 0)))
            ) : (
              <div className="lpu-bloc lpu-bloc--premier">
                <div className="lpu-vide">
                  <Search width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                  <p>Aucun événement</p>
                  <span>Rien ne correspond à ces filtres sur la période.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {panneau ? (
          <aside className="lpu-aside" aria-label="Panneau">
            <div className="lpu-aside-interieur">
              {carte ? (
                <CarteDroite
                  titre="Détail"
                  action={
                    <button type="button" className="lin-rond lpu-carte-rond" aria-label="Fermer le détail" title="Fermer le détail" onClick={() => setChoisie(null)}>
                      <X width={14} height={14} aria-hidden="true" />
                    </button>
                  }
                >
                  <p className="lpu-detail-texte">{carte.complet}</p>
                  <dl className="lpu-proprietes">
                    <div>
                      <dt>Type</dt>
                      <dd>{valeur(<IconeSante etat={santeDe(carte.etat?.teinte ?? "jaune")} />, TYPE[carte.colonne])}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>{valeur(<IconeCalendrier />, dateHeure(carte.quand))}</dd>
                    </div>
                    <div>
                      <dt>Module</dt>
                      <dd>{valeur(<IconeDiese />, libelleModule(carte.module))}</dd>
                    </div>
                    {carte.somme !== null ? (
                      <div>
                        <dt>Montant</dt>
                        <dd>
                          <span className="lpu-valeur lpu-valeur--chiffre">{montant(carte.somme, carte.devise)}</span>
                        </dd>
                      </div>
                    ) : null}
                    {carte.par ? (
                      <div>
                        <dt>{carte.colonne === "recus" ? "Fournisseur" : "Demandé par"}</dt>
                        <dd>{valeur(<IconeGroupe />, carte.par)}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>État</dt>
                      <dd>{valeur(<IconeSante etat={santeDe(carte.etat?.teinte ?? "jaune")} />, carte.etat?.libelle ?? "En attente", carte.etat?.teinte ?? "jaune")}</dd>
                    </div>
                  </dl>
                  <div className="lpu-detail-actions">
                    <Link href={carte.lien} className="lin-btn lin-btn--plein lin-btn--texte">
                      <ExternalLink width={14} height={14} aria-hidden="true" />
                      Ouvrir
                    </Link>
                  </div>
                </CarteDroite>
              ) : null}

              <CarteDroite titre="Propriétés">
                <dl className="lpu-proprietes">
                  <div>
                    <dt>Période</dt>
                    <dd>
                      <MenuOptions
                        libelle="Changer la période"
                        titre="Période…"
                        options={optionsPeriode}
                        declencheur={
                          <>
                            <IconeCalendrier />
                            <span>{PERIODES.find((p) => p.cle === periode)?.libelle}</span>
                          </>
                        }
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{valeur(<IconeGroupe />, source === "exemple" ? "Données d'exemple" : "Base réelle")}</dd>
                  </div>
                  <div>
                    <dt>Événements</dt>
                    <dd>{valeur(<IconeDocument />, dansPeriode ? `${visibles.length} sur ${dansPeriode.length}` : "…")}</dd>
                  </div>
                </dl>
              </CarteDroite>

              <CarteDroite titre="Modules">
                {lesModules.length ? (
                  <ul className="lpu-jalons">
                    {lesModules.map((m) => {
                      const actif = !modules || modules.includes(m);
                      const n = compte((x) => x.module === m);
                      return (
                        <li key={m}>
                          <button type="button" className="lpu-jalon" aria-pressed={actif} onClick={() => basculerModule(m)} title={actif ? `Masquer ${libelleModule(m)}` : `Afficher ${libelleModule(m)}`}>
                            <IconeDiese />
                            <span className="lpu-jalon-nom">{libelleModule(m)}</span>
                            <span className="lpu-jalon-compte">
                              {n} événement{n > 1 ? "s" : ""}
                            </span>
                            <span className="lpu-jalon-coche" aria-hidden="true">
                              <Check />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="lin-activite-vide">Aucun module sur la période.</p>
                )}
              </CarteDroite>

              <CarteDroite titre="Activité">
                <dl className="lpu-legende">
                  {TYPES.map((t, i) => (
                    <span key={`c-${t.cle}`} className="lpu-legende-carre" style={{ gridRow: 1, gridColumn: i * 2 + 1, background: GRAPH[t.cle] }} aria-hidden="true" />
                  ))}
                  {TYPES.map((t, i) => (
                    <dt key={`t-${t.cle}`} style={{ gridRow: 1, gridColumn: i * 2 + 2 }}>
                      {t.libelle}
                    </dt>
                  ))}
                  {TYPES.map((t, i) => (
                    <dd key={`d-${t.cle}`} style={{ gridRow: 2, gridColumn: i * 2 + 2 }}>
                      {dansPeriode ? visibles.filter((x) => x.colonne === t.cle).length : "…"}
                    </dd>
                  ))}
                </dl>
                <div className="lpu-histo" role="img" aria-label={`${visibles.length} événements sur la période`}>
                  {barres.b.length
                    ? barres.b.map((n, i) =>
                        n.recus + n.a_valider + n.decisions ? (
                          <span key={i}>{TOUS_TYPES.map((cle) => (n[cle] ? <i key={cle} style={{ height: `${Math.max(4, (n[cle] / max) * 196)}px`, background: GRAPH[cle] }} /> : null))}</span>
                        ) : (
                          <span key={i} data-vide="" />
                        ),
                      )
                    : Array.from({ length: 40 }, (_, i) => <span key={i} data-vide="" />)}
                </div>
                <div className="lpu-axe" aria-hidden="true">
                  <span>{maintenant !== null && barres.b.length ? dateAxe(barres.debut) : "—"}</span>
                  <span>{maintenant !== null && barres.b.length ? dateAxe((barres.debut + maintenant) / 2) : ""}</span>
                  <span>{maintenant !== null ? dateAxe(maintenant) : "—"}</span>
                </div>
              </CarteDroite>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
