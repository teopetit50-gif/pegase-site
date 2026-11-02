"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI › la page d'un permis (refaite le 02/11/2026)

   La page d'un ticket de Linear (OME-19), au 1:1 : relevé docs/refonte-
   metiers/releves/linear-ticket.md, mesures prises en direct le 02/11
   (docs/refonte-metiers/REFERENCES-LORANI.md), styles dans
   ./lor-ticket.css (préfixe lor-tk-), icônes du bundle de Linear
   (./lor-icones-linear.ts) et de son sprite. Un ticket de Linear = un
   permis :

     fil d'Ariane      « Permis » › numéro du permis + intitulé
     Accept / Decline  la première chose qui attend un membre : la décision
                       implicite (Confirmer / Saisir la décision reçue) ou
                       une date lue sur un courrier (Confirmer / Écarter)
     Snooze            les échéances et leurs rappels (descend jusqu'à elles)
     « … »             Régime du permis, Recours reçu, saisies, projet,
                       courrier à déposer, écran d'avant
     barre d'outils    copier le lien, le numéro, la référence du projet ;
                       « Saisir ce qui est arrivé » et son menu
     titre             le permis et son terrain
     description       nature, numéro, adresse, parcelles ; règle
                       d'instruction et effet du silence ; plusieurs
                       demandes de pièces ; avertissements du calcul
     trombone          déposer un courrier de la mairie (page du projet)
     Sub-issues        les étapes datées du calendrier
     Activity          ce qui est arrivé au permis (dépôt, demandes,
                       décision, affichage, recours, courriers reçus, dates
                       lues décidées, rappels partis) ; ce qui attend un
                       membre en commentaires : décision implicite, dates
                       lues à confirmer ou écarter
     Properties        état, urgence, chef de projet, les quatre dates
     Labels            le régime (secteur protégé, monument historique…)
     Project           le projet du permis
     Échéances, Recours  deux sections de plus, du même dessin

   Ce que l'écran d'avant faisait (inventaire lorani.md, B7-B17, F7-F13,
   G8-G19) reste au même endroit logique : mêmes portes, mêmes fenêtres
   (PermisVue en « fenêtres seules », ouvertes par `piloteRef`). Les liens des
   alertes (E1-E3, E5-E9) arrivent ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PermisVue, { type PilotePermis, type Quoi } from "@/components/espace/lorani/PermisVue";
import { DECISIONS, ETATS, ISSUES_RECOURS, NATURES_DATE_LUE, NATURES_RECOURS, STATUTS_ETAPE, TYPES, TYPES_CONTROLE, libelleRappel, libelleTypePiece, prochaineDate, titrePermis } from "@/components/espace/lorani/etats";
import type { Calcul, DateLue, Echeance, Etape, Permis, PieceProjet, Recours } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { IconeAffichage, IconeCalendrierLor, IconeLin, IconePoints, IconePrioriteLor, IconeSansResponsable, IconeSprite, IconeStatutTicket, type StatutTicket } from "./lor-icones";
import "@/components/espace/espace.css";
import "@/components/espace/lorani/lorani.css";
import "./lor.css";
import "./lor-ticket.css";

const BASE = `${RACINE}/lorani`;

/* ——— dates ——— */
const jourIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const midi = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtPlein = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
/* « 11 nov. », l'année quand elle n'est pas la courante (la date d'une propriété de Linear : « Oct 15 ») */
const court = (iso: string) => (midi(iso).getUTCFullYear() === new Date().getFullYear() ? fmtCourt : fmtLong).format(midi(iso));
const plein = (iso: string | null | undefined) => (iso ? fmtPlein.format(midi(iso)) : "—");
/* « il y a 3 j » : l'âge d'un événement à la manière de Linear (« 3d ago », « 1h ago », « 33min ago ») */
function depuis(iso: string): string {
  const t = iso.length <= 10 ? midi(iso).getTime() : Date.parse(iso);
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 30 * 86_400) return `il y a ${Math.floor(s / 86_400)} j`;
  if (s < 365 * 86_400) return `il y a ${Math.floor(s / (30 * 86_400))} mois`;
  const a = Math.floor(s / (365 * 86_400));
  return `il y a ${a} an${a > 1 ? "s" : ""}`;
}
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");

/* une étape du calendrier → le statut d'un sous-ticket de Linear */
const STATUT_ETAPE: Record<Etape["statut"], StatutTicket> = {
  fait: "fait",
  passe: "fait",
  a_venir: "afaire",
  en_cours: "encours",
  manque: "encours",
  a_confirmer: "triage",
  en_attente: "backlog",
};
/* l'état d'un permis → le statut du ticket (Properties) */
const STATUT_PERMIS: Record<Permis["etat"], StatutTicket> = {
  a_deposer: "backlog",
  completude: "encours",
  pieces_demandees: "encours",
  instruction: "encours",
  decision_a_confirmer: "triage",
  accorde: "encours",
  recours_en_cours: "encours",
  purge: "fait",
  refuse: "annule",
  rejete: "annule",
  annule: "annule",
  classe: "annule",
  hors_catalogue: "doublon",
} as Record<Permis["etat"], StatutTicket>;
const PART_PERMIS: Partial<Record<Permis["etat"], number>> = { completude: 0.25, pieces_demandees: 0.25, instruction: 0.5, accorde: 0.75, recours_en_cours: 0.75 };

const LIBELLES_SAISIE: Record<Quoi | "recours", string> = {
  depot: "Dossier déposé",
  demande_pieces: "Demande de pièces reçue",
  pieces_fournies: "Pièces reçues par la mairie",
  delai: "Délai notifié par la mairie",
  decision: "Arrêté reçu",
  affichage: "Permis affiché sur le terrain",
  recours: "Recours reçu",
};

/* ——— un menu de Linear (Add filter) qui se ferme au clic dehors et sur Échap ——— */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

/* un geste de la page : ouvrir une fenêtre de PermisVue (mêmes portes) */
type Commande = { t: "implicite" } | { t: "lue"; d: DateLue } | { t: "ecarter"; d: DateLue } | { t: "saisir"; q: Quoi | "recours" } | { t: "issue"; r: Recours } | { t: "regime" };
type Option = { cle: string; libelle: string; icone?: React.ReactNode; commande?: Commande; href?: string; off?: boolean; separe?: boolean };
function Menu({ options, fermer, onChoix, style, etiquette }: { options: Option[]; fermer: () => void; onChoix: (c: Commande) => void; style: React.CSSProperties; etiquette: string }) {
  return (
    <div className="lor-menu lor-tk-menu" role="menu" aria-label={etiquette} style={style}>
      <div className="lor-menu-liste">
        {options.map((o) => (
          <div key={o.cle}>
            {o.separe ? <div className="lor-menu-sep" aria-hidden="true" /> : null}
            {o.href ? (
              <Link role="menuitem" href={o.href} className="lor-option" onClick={fermer}>
                {o.icone}
                <span className="lor-option-libelle">{o.libelle}</span>
              </Link>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="lor-option"
                disabled={o.off}
                onClick={() => {
                  fermer();
                  if (o.commande) onChoix(o.commande);
                }}
              >
                {o.icone}
                <span className="lor-option-libelle">{o.libelle}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ nom, systeme, taille = 18 }: { nom: string; systeme?: boolean; taille?: number }) {
  return (
    <span className="lor-tk-avatar" data-systeme={systeme ? "" : undefined} style={{ width: taille, height: taille, fontSize: taille <= 14 ? 7 : 8 }} aria-hidden="true">
      {initiales(nom) || "?"}
    </span>
  );
}

/* un événement de l'activité : qui, quoi, quand */
type Evenement = { cle: string; quand: string; qui: string; systeme?: boolean; quoi: React.ReactNode; titre?: string };

export default function PagePermis({ id }: { id: string }) {
  const { source, pret, erreur, dossier, peutEcrire, nommer, onLocal, relire } = useLorani();
  const toast = useToast();
  const p = dossier.permis.find((x) => x.id === id);
  const projet = p ? dossier.projets.find((x) => x.id === p.projet_id) : undefined;
  const piloteRef = useRef<PilotePermis | null>(null);
  const [ouvertPoints, setOuvertPoints, menuPointsRef] = useMenu();
  const [ouvertSaisir, setOuvertSaisir, menuSaisirRef] = useMenu();
  const [replie, setReplie] = useState(false);
  const [ouvertAffichage, setOuvertAffichage, menuAffichageRef] = useMenu();
  const [voirFranchies, setVoirFranchies] = useState(true);
  const [voirDates, setVoirDates] = useState(true);

  const c: Calcul | null = p ? (p.calcul ?? { etat: p.etat, etapes: [] }) : null;
  const lues = p ? dossier.datesLues.filter((d) => d.permis_id === p.id || (d.permis_id === null && d.projet_id === p.projet_id)) : [];
  const echeances = p ? dossier.echeances.filter((e) => e.permis_id === p.id).sort((a, b) => a.echeance.localeCompare(b.echeance)) : [];
  const recours = p ? dossier.recours.filter((r) => r.permis_id === p.id) : [];
  const pieces = p ? dossier.pieces.filter((x) => x.objet_id === p.projet_id && !TYPES_CONTROLE.includes(x.type_piece ?? "")) : [];
  /* le seul endroit qui ouvre une fenêtre : un gestionnaire d'événement */
  const executer = (c: Commande) => {
    const pv = piloteRef.current;
    if (!pv) return;
    if (c.t === "implicite") pv.confirmerImplicite();
    else if (c.t === "lue") pv.confirmerLue(c.d);
    else if (c.t === "ecarter") pv.ecarterLue(c.d);
    else if (c.t === "saisir") {
      if (c.q === "recours") pv.recours();
      else pv.saisir(c.q);
    }
    else if (c.t === "issue") pv.issue(c.r);
    else pv.regime();
  };

  if (!p || !projet || !c) {
    const absent = pret && !(p && projet);
    return (
      <div className="lor lor-tk">
        <h1 className="v2-sr">Permis</h1>
        <header className="lor-tk-tete">
          <nav className="lor-tk-fil" aria-label="Fil d'Ariane">
            <Link href={BASE} className="lor-tk-maillon">
              Permis
            </Link>
          </nav>
        </header>
        <p className="lor-tk-absent" role={absent ? "alert" : "status"}>
          {absent ? (
            <>
              {erreur ? `La base n'a pas répondu : ${erreur} ` : "Ce permis n'est pas visible avec ce compte. "}
              <Link href={BASE}>Revenir aux permis</Link>
            </>
          ) : (
            "Lecture du permis…"
          )}
        </p>
      </div>
    );
  }

  const auj = jourIso();
  const titre = titrePermis(p, projet.nom);
  const terrain = [projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const titreLong = terrain ? `${titre}, ${terrain}` : titre;
  const etat = ETATS[p.etat] ?? ETATS.a_deposer;
  const dp = p.type_autorisation === "dp";
  const accorde = p.decision === "favorable" || p.decision === "tacite";
  const proposees = lues.filter((d) => d.statut === "proposee").sort((a, b) => a.cree_le.localeCompare(b.cree_le));
  const decidees = lues.filter((d) => d.statut !== "proposee");
  const implicite = p.etat === "decision_a_confirmer" ? c.decision_implicite : undefined;
  const etapes = c.etapes ?? [];
  const franchies = etapes.filter((e) => e.statut === "fait" || e.statut === "passe").length;
  const chef = dossier.membres.find((m) => m.projet_id === projet.id && m.role_projet === "chef_projet");
  const nomChef = chef ? nommer(chef.user_id) : null;
  const ecrire = peutEcrire && p.actif;
  /* les saisies possibles selon l'état du permis : la règle de « Saisir ce qui est arrivé » (PermisVue) */
  const boutons: Record<Quoi | "recours", boolean> = {
    depot: !p.date_depot,
    demande_pieces: !!p.date_depot && !p.decision && !p.date_demande_pieces,
    pieces_fournies: !!p.date_demande_pieces && !p.date_pieces_fournies,
    delai: !!p.date_depot && !p.decision && !p.delai_notifie_mois,
    decision: !!p.date_depot && !p.decision,
    affichage: accorde && !p.date_affichage,
    recours: accorde,
  };
  const saisies = (Object.keys(LIBELLES_SAISIE) as (Quoi | "recours")[]).filter((q) => ecrire && boutons[q]);

  /* la prochaine date (la date cible de la vue d'ensemble) et son urgence */
  const prochaine = prochaineDate(p);
  const ecart = prochaine ? Math.round((midi(prochaine).getTime() - midi(auj).getTime()) / 86_400_000) : null;
  const urgence: 0 | 1 | 2 | 3 | 4 = ecart === null ? 0 : ecart < 0 ? 1 : ecart <= 7 ? 2 : ecart <= 30 ? 3 : 4;
  const LIBELLE_URGENCE = ["Aucune date à venir", "Date passée", "Dans la semaine", "Dans le mois", "Plus tard"];

  /* la date de décision attendue, ou celle des pièces à fournir */
  const piecesAvant = p.etat === "pieces_demandees" ? etapes.find((e) => e.nature === "pieces")?.date : undefined;
  const dates: { cle: string; libelle: string; iso: string | null | undefined; passe?: boolean; vide: string }[] = [
    { cle: "depot", libelle: "Déposé le", iso: p.date_depot, vide: "Pas encore déposé" },
    piecesAvant
      ? { cle: "pieces", libelle: "Pièces à fournir avant le", iso: piecesAvant, passe: piecesAvant < auj, vide: "" }
      : p.decision
        ? { cle: "decision", libelle: `${DECISIONS[p.decision]} le`, iso: p.date_decision, vide: "" }
        : { cle: "attendue", libelle: "Décision attendue le", iso: c.date_decision_attendue, passe: !!c.date_decision_attendue && c.date_decision_attendue < auj, vide: "Décision : pas de date" },
    { cle: "purge", libelle: "Purgé de tout recours le", iso: c.date_purge, vide: accorde && !p.date_affichage ? "Purge : affichage à saisir" : p.etat === "recours_en_cours" ? "Purge suspendue : recours en cours" : "Purge : pas de date" },
    { cle: "chantier", libelle: "Chantier sans risque dès le", iso: c.chantier_sans_risque_le, vide: "Chantier sans risque : pas de date" },
  ];

  /* le régime : les étiquettes de Linear (pastille de couleur et nom) */
  const regime = [
    p.secteur_protege && { cle: "sp", libelle: "Secteur protégé", couleur: "rgb(76, 183, 130)" },
    p.immeuble_inscrit_mh && { cle: "mh", libelle: "Monument historique", couleur: "#eb5757" },
    p.erp_autorisation && { cle: "erp", libelle: "ERP", couleur: "#f2994a" },
    p.igh && { cle: "igh", libelle: "IGH", couleur: "#5e6ad2" },
    p.evaluation_environnementale && { cle: "ee", libelle: "Évaluation environnementale", couleur: "#26b5ce" },
    !p.actif && { cle: "inactif", libelle: "Inactif", couleur: "#95a2b3" },
  ].filter(Boolean) as { cle: string; libelle: string; couleur: string }[];

  /* ——— ce qui attend un membre : en tête (Accept / Decline) et en commentaires ——— */
  const premiere = proposees[0];
  const attente = implicite
    ? { oui: "Confirmer", non: "Saisir la décision", titreOui: "Confirmer la décision implicite", titreNon: "Saisir la décision reçue", cmdOui: { t: "implicite" } as Commande, cmdNon: { t: "saisir", q: "decision" } as Commande }
    : premiere
      ? { oui: "Confirmer", non: "Écarter", titreOui: `Confirmer : ${NATURES_DATE_LUE[premiere.nature].libelle.toLowerCase()}`, titreNon: "Écarter cette lecture", cmdOui: { t: "lue", d: premiere } as Commande, cmdNon: { t: "ecarter", d: premiere } as Commande }
      : null;

  /* ——— l'activité : ce qui est arrivé, du plus ancien au plus récent ——— */
  const evenements: Evenement[] = [];
  evenements.push({ cle: "cree", quand: p.cree_le, qui: "Lorani", systeme: true, quoi: <>a ouvert le permis</> });
  if (p.date_depot) evenements.push({ cle: "depot", quand: p.date_depot, qui: "Mairie", systeme: true, quoi: <>a reçu le dossier{p.numero ? <> n° {p.numero}</> : null}</> });
  const lettres = p.demandes_pieces?.length ? p.demandes_pieces : p.date_demande_pieces ? [{ date: p.date_demande_pieces, pieces: p.pieces_demandees }] : [];
  lettres.forEach((l, i) => evenements.push({ cle: `dem-${i}`, quand: l.date, qui: "Mairie", systeme: true, quoi: <>a demandé {pluriel(l.pieces.length, "pièce")}{l.pieces.length ? <> : {l.pieces.map((x) => x.code).join(", ")}</> : null}</> }));
  if (p.date_pieces_fournies) evenements.push({ cle: "fournies", quand: p.date_pieces_fournies, qui: "Mairie", systeme: true, quoi: <>a reçu les pièces manquantes</> });
  if (p.delai_notifie_mois) evenements.push({ cle: "delai", quand: p.date_notification_delai ?? p.maj_le, qui: "Mairie", systeme: true, quoi: <>a notifié un délai d&apos;instruction de {p.delai_notifie_mois} mois</> });
  if (p.decision && p.date_decision) evenements.push({ cle: "decision", quand: p.date_decision, qui: "Mairie", systeme: true, quoi: <>a rendu sa décision : {DECISIONS[p.decision].toLowerCase()}</> });
  if (p.date_affichage) evenements.push({ cle: "affichage", quand: p.date_affichage, qui: "Lorani", systeme: true, quoi: <>a noté le premier jour d&apos;affichage sur le terrain</> });
  for (const r of recours) {
    evenements.push({ cle: `rec-${r.id}`, quand: r.date_recours, qui: r.auteur ?? "Un tiers", quoi: <>a formé un {NATURES_RECOURS[r.nature].toLowerCase()}</> });
    if (r.date_issue && r.issue !== "en_cours") evenements.push({ cle: `iss-${r.id}`, quand: r.date_issue, qui: "Lorani", systeme: true, quoi: <>a noté l&apos;issue du recours : {ISSUES_RECOURS[r.issue].libelle.toLowerCase()}</> });
  }
  for (const x of pieces) {
    evenements.push({
      cle: `piece-${x.id}`,
      quand: x.cree_le ?? p.cree_le,
      qui: x.source === "courriel" ? "Guichet" : "Lorani",
      systeme: true,
      quoi: (
        <>
          {x.source === "courriel" ? "a envoyé" : "a reçu"} <span className="lor-tk-ev-fort">{x.nom_fichier}</span> ({libelleTypePiece(x.type_piece).toLowerCase()}) · {etatPiece(x)}
        </>
      ),
      titre: x.motif ?? undefined,
    });
  }
  for (const d of decidees) {
    evenements.push({
      cle: `lue-${d.id}`,
      quand: d.decide_le ?? d.maj_le,
      qui: nommer(d.decide_par),
      quoi: (
        <>
          a {d.statut === "confirmee" ? "confirmé" : "écarté"} {NATURES_DATE_LUE[d.nature].libelle.toLowerCase()} lue sur le {NATURES_DATE_LUE[d.nature].piece}
          {d.motif ? <> : « {d.motif} »</> : null}
        </>
      ),
    });
  }
  for (const e of echeances) {
    for (const j of e.rappels_faits) {
      const jour = new Date(midi(e.echeance).getTime() - j * 86_400_000).toISOString().slice(0, 10);
      evenements.push({ cle: `rap-${e.delai_id}-${j}`, quand: jour, qui: "Lorani", systeme: true, quoi: <>a envoyé le rappel {libelleRappel(j)} : {libelleEcheance(e)}</>, titre: e.responsable ? `À ${nommer(e.responsable)}` : undefined });
    }
  }
  evenements.sort((a, b) => a.quand.localeCompare(b.quand));

  /* les options du « … » d'en-tête */
  const optionsPoints: Option[] = [
    ...(ecrire ? [{ cle: "regime", libelle: "Régime du permis…", icone: <IconeSprite nom="Label" />, commande: { t: "regime" } as Commande }] : []),
    ...saisies.map((q, i) => ({ cle: q, libelle: `${LIBELLES_SAISIE[q]}…`, icone: <IconeSprite nom="Calendar" />, commande: { t: "saisir", q } as Commande, separe: i === 0 && ecrire })),
    { cle: "projet", libelle: "Ouvrir le projet", icone: <IconeSprite nom="Project" />, href: `${BASE}/projets/${encodeURIComponent(projet.id)}`, separe: true },
    { cle: "courrier", libelle: "Déposer un courrier de la mairie", icone: <IconeSprite nom="Attachment" />, href: `${BASE}/projets/${encodeURIComponent(projet.id)}?deposer=1` },
    { cle: "ancien", libelle: "Ouvrir l'écran d'avant", icone: <IconeSprite nom="Page" />, href: `${BASE}?ancien=1&permis=${encodeURIComponent(p.id)}` },
  ];
  const optionsSaisir: Option[] = saisies.map((q) => ({ cle: q, libelle: `${LIBELLES_SAISIE[q]}…`, commande: { t: "saisir", q } as Commande }));
  const premiereSaisie = saisies[0];

  const copier = async (texte: string, message: string) => {
    try {
      await navigator.clipboard.writeText(texte);
      toast(message);
    } catch {
      toast("La copie a été refusée par le navigateur.", "rouge");
    }
  };

  /* les propriétés : la colonne de droite à 1440, la rangée de pilules sous le titre en étroit */
  const proprietes = (rangee: boolean) => (
    <>
      <button type="button" className="lor-tk-pilule" onClick={() => setOuvertSaisir(true)} disabled={!saisies.length} title={`${etat.libelle}${saisies.length ? " · saisir ce qui est arrivé" : ""}`}>
        <IconeStatutTicket statut={STATUT_PERMIS[p.etat] ?? "afaire"} part={PART_PERMIS[p.etat]} />
        <span>{etat.libelle}</span>
      </button>
      <span className="lor-tk-pilule" title={`Prochaine date : ${LIBELLE_URGENCE[urgence]}`} data-vide={urgence === 0 ? "" : undefined}>
        <IconePrioriteLor niveau={urgence} />
        {rangee ? null : <span>{urgence === 0 ? "Aucune urgence" : LIBELLE_URGENCE[urgence]}</span>}
      </span>
      <Link href={`${BASE}/projets/${encodeURIComponent(projet.id)}`} className="lor-tk-pilule" data-vide={nomChef ? undefined : ""} title={nomChef ? `Chef de projet : ${nomChef}` : "Personne : les rappels n'ont pas de destinataire. Nommez un chef de projet sur la page du projet."}>
        {nomChef ? <Avatar nom={nomChef} taille={16} /> : <IconeSansResponsable />}
        {rangee && !nomChef ? null : <span>{nomChef ?? "Aucun chef de projet"}</span>}
      </Link>
      {dates.map((d) => (
        <span key={d.cle} className="lor-tk-pilule" data-vide={d.iso ? undefined : ""} title={d.iso ? `${d.libelle} ${plein(d.iso)}` : d.vide}>
          <IconeCalendrierLor passe={d.passe} />
          {rangee ? d.iso ? <span>{court(d.iso)}</span> : null : <span>{d.iso ? `${d.libelle} ${court(d.iso)}` : d.vide}</span>}
        </span>
      ))}
    </>
  );
  const etiquettes = (
    <>
      {regime.map((r) => (
        <span key={r.cle} className="lor-tk-etiquette">
          <span className="lor-tk-etiquette-point" style={{ background: r.couleur }} aria-hidden="true" />
          {r.libelle}
        </span>
      ))}
      {ecrire ? (
        regime.length ? (
          <button type="button" className="lor-rond lor-tk-rond-petit" aria-label="Régime du permis" title="Régime du permis" onClick={() => executer({ t: "regime" })}>
            <IconeLin nom="plusPetit" />
          </button>
        ) : (
          <button type="button" className="lor-tk-pilule" data-vide="" onClick={() => executer({ t: "regime" })}>
            <IconeSprite nom="Label" />
            <span>Régime du permis</span>
          </button>
        )
      ) : regime.length ? null : (
        <span className="lor-tk-pilule" data-vide="">
          <IconeSprite nom="Label" />
          <span>Régime de droit commun</span>
        </span>
      )}
    </>
  );

  return (
    <div className="lor lor-tk">
      <h1 className="v2-sr">{titre}</h1>
      <header className="lor-tk-tete">
        <div className="lor-tk-tete-gauche">
          <nav className="lor-tk-fil" aria-label="Fil d'Ariane">
            <Link href={BASE} className="lor-tk-maillon">
              Permis
            </Link>
            <span className="lor-tk-sep" aria-hidden="true">
              ›
            </span>
            <Link href={`${BASE}/permis/${encodeURIComponent(p.id)}`} className="lor-tk-courant" aria-current="page">
              <h2>
                <span className="lor-tk-id">{p.numero ?? TYPES[p.type_autorisation].court}</span>
                {titreLong}
              </h2>
            </Link>
          </nav>
          <div className="lor-tk-ancre" ref={menuPointsRef}>
            <button type="button" className="lor-rond" aria-label="Options du permis" title="Options du permis" aria-expanded={ouvertPoints} onClick={() => setOuvertPoints((o) => !o)}>
              <IconePoints />
            </button>
            {ouvertPoints ? <Menu etiquette="Options du permis" options={optionsPoints} fermer={() => setOuvertPoints(false)} onChoix={executer} style={{ left: 0, top: 34 }} /> : null}
          </div>
        </div>
        <div className="lor-tk-tete-droite">
          {attente && peutEcrire ? (
            <>
              <button type="button" className="lor-texte-btn lor-tk-texte" title={attente.titreOui} onClick={() => executer(attente.cmdOui)}>
                <IconeLin nom="accepter" />
                <span>{attente.oui}</span>
              </button>
              <button type="button" className="lor-texte-btn lor-tk-texte" title={attente.titreNon} onClick={() => executer(attente.cmdNon)}>
                <IconeLin nom="refuser" />
                <span>{attente.non}</span>
              </button>
            </>
          ) : null}
          <a href="#lor-tk-echeances" className="lor-rond" aria-label="Échéances et rappels" title={`Échéances et rappels : ${pluriel(echeances.filter((e) => e.statut === "ouvert").length, "en cours", "en cours")}`}>
            <IconeSprite nom="ClockOutline" />
          </a>
        </div>
      </header>

      <div className="lor-tk-outils">
        <button type="button" className="lor-rond lor-rond--plein" aria-label="Copier le lien du permis" title="Copier le lien du permis" onClick={() => copier(window.location.href.split("#")[0], "Lien du permis copié")}>
          <IconeLin nom="copierLien" />
        </button>
        <button type="button" className="lor-rond lor-rond--plein" aria-label="Copier le numéro du permis" title="Copier le numéro du permis" disabled={!p.numero} onClick={() => p.numero && copier(p.numero, "Numéro du permis copié")}>
          <IconeLin nom="copierId" />
        </button>
        <button type="button" className="lor-rond lor-rond--plein" aria-label="Copier la référence du projet" title="Copier la référence du projet" disabled={!projet.reference} onClick={() => projet.reference && copier(`${projet.reference} ${projet.nom}`, "Référence du projet copiée")}>
          <IconeLin nom="branche" />
        </button>
        <div className="lor-tk-double lor-tk-ancre" ref={menuSaisirRef}>
          <button
            type="button"
            className="lor-rond lor-rond--plein lor-tk-moitie"
            aria-label={premiereSaisie ? `Saisir : ${LIBELLES_SAISIE[premiereSaisie]}` : "Rien à saisir"}
            title={premiereSaisie ? `Saisir ce qui est arrivé : ${LIBELLES_SAISIE[premiereSaisie].toLowerCase()}` : peutEcrire ? "Rien à saisir à cette étape" : "Lecture seule"}
            disabled={!premiereSaisie}
            onClick={() => premiereSaisie && executer({ t: "saisir", q: premiereSaisie })}
          >
            <IconeLin nom="invite" />
          </button>
          <span className="lor-tk-double-sep" aria-hidden="true" />
          <button type="button" className="lor-rond lor-rond--plein lor-tk-moitie" aria-label="Saisir ce qui est arrivé" title="Saisir ce qui est arrivé" aria-expanded={ouvertSaisir} disabled={!saisies.length} onClick={() => setOuvertSaisir((o) => !o)}>
            <IconeLin nom="chevronBas" />
          </button>
          {ouvertSaisir ? <Menu etiquette="Saisir ce qui est arrivé" options={optionsSaisir} fermer={() => setOuvertSaisir(false)} onChoix={executer} style={{ right: 0, top: 34 }} /> : null}
        </div>
      </div>

      <div className="lor-tk-corps">
        <div className="lor-tk-principal">
          <h2 className="lor-tk-titre">{titreLong}</h2>
          <div className="lor-tk-rangee" aria-label="Propriétés">
            {proprietes(true)}
            {regime.length ? etiquettes : null}
            <Link href={`${BASE}/projets/${encodeURIComponent(projet.id)}`} className="lor-tk-pilule" title={`Projet ${projet.nom}`}>
              <IconeSprite nom="Project" />
              <span>{projet.nom}</span>
            </Link>
          </div>
          <div className="lor-tk-description">
            <p>
              {TYPES[p.type_autorisation].libelle}
              {p.numero ? ` n° ${p.numero}` : ", sans numéro"}
              {terrain ? `, ${terrain}` : ""}
              {projet.parcelles.length ? `, ${pluriel(projet.parcelles.length, "parcelle")} ${projet.parcelles.join(", ")}` : ""}.{" "}
              {c.regime ? (
                <>
                  Règle d&apos;instruction : {c.regime.regle_instruction}
                  {c.regime.delai_notifie_mois ? `, délai de ${c.regime.delai_notifie_mois} mois notifié par la mairie` : ""} ; sans réponse de la mairie : {c.regime.effet_silence}
                  {c.regime.motifs_silence?.length ? ` (${c.regime.motifs_silence.map((m) => `art. ${m.article}`).join(", ")})` : ""}.
                </>
              ) : (
                "Le régime n'est pas encore calculé."
              )}
            </p>
            {(p.demandes_pieces?.length ?? 0) > 1 ? (
              <p>
                Plusieurs demandes de pièces : {p.pieces_demandees.map((x) => x.code).join(", ")} à fournir. Lettres du {p.demandes_pieces!.map((l) => plein(l.date)).join(", du ")}. Une seconde demande ne proroge pas le délai d&apos;instruction (CE, 30 avril 2024, n° 461958) : le délai court depuis la première lettre (art. R*423-41).
              </p>
            ) : null}
            {(c.avertissements ?? []).map((a) => (
              <p key={a}>À savoir : {a}</p>
            ))}
            {!peutEcrire ? <p className="lor-tk-sourd">Vous voyez ce dossier sans pouvoir y écrire : demandez l&apos;accès en écriture à un gérant ou au chef de projet.</p> : null}
          </div>
          <div className="lor-tk-pieces-jointes">
            <span className="lor-rond lor-tk-rond-petit" title={`${pluriel(pieces.length, "courrier")} dans le dossier`} aria-label={`${pluriel(pieces.length, "courrier")} dans le dossier`}>
              <IconeLin nom="reaction" />
            </span>
            <Link href={`${BASE}/projets/${encodeURIComponent(projet.id)}?deposer=1`} className="lor-rond lor-tk-rond-petit" aria-label="Déposer un courrier de la mairie" title="Déposer un courrier de la mairie">
              <IconeSprite nom="Attachment" />
            </Link>
          </div>

          <section className="lor-tk-sous" aria-label="Calendrier">
            <div className="lor-tk-sous-tete">
              <div className="lor-tk-sous-gauche">
                <button type="button" className="lor-tk-replier" aria-expanded={!replie} onClick={() => setReplie((r) => !r)}>
                  <IconeLin nom="triangle" className="lor-tk-triangle" />
                  Calendrier
                </button>
                <span className="lor-tk-jauge" title={`${franchies} étape${franchies > 1 ? "s" : ""} franchie${franchies > 1 ? "s" : ""} sur ${etapes.length}`}>
                  <IconeStatutTicket statut={franchies && franchies === etapes.length ? "fait" : "encours"} part={etapes.length ? franchies / etapes.length : 0} />
                  {franchies}/{etapes.length}
                </span>
              </div>
              <div className="lor-tk-sous-droite">
                <div className="lor-tk-ancre" ref={menuAffichageRef}>
                  <button type="button" className="lor-rond lor-rond--plein" aria-label="Affichage du calendrier" title="Affichage du calendrier" aria-expanded={ouvertAffichage} onClick={() => setOuvertAffichage((o) => !o)}>
                    <IconeAffichage />
                  </button>
                  {ouvertAffichage ? (
                    <div className="lor-menu lor-tk-menu" role="dialog" aria-label="Affichage du calendrier" style={{ right: 0, top: 34 }}>
                      <div className="lor-menu-liste">
                        <label className="lor-tk-coche">
                          <input type="checkbox" checked={voirFranchies} onChange={(e) => setVoirFranchies(e.target.checked)} />
                          Étapes franchies
                        </label>
                        <label className="lor-tk-coche">
                          <input type="checkbox" checked={voirDates} onChange={(e) => setVoirDates(e.target.checked)} />
                          Dates
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button type="button" className="lor-rond lor-rond--plein" aria-label="Saisir ce qui est arrivé" title="Saisir ce qui est arrivé" disabled={!saisies.length} onClick={() => setOuvertSaisir(true)}>
                  <IconeLin nom="plusPetit" />
                </button>
              </div>
            </div>
            {replie ? null : etapes.length ? (
              <ul className="lor-tk-lignes">
                {etapes.map((e, i) =>
                  !voirFranchies && (e.statut === "fait" || e.statut === "passe") ? null : (
                  <li key={`${e.nature}-${i}`}>
                    <LigneEtape e={e} auj={auj} dates={voirDates} />
                  </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="lor-tk-vide">{p.date_depot ? "Le calendrier n'est pas encore calculé." : "Le calendrier commence au dépôt du dossier : saisissez la date de dépôt, ou déposez le récépissé pour qu'il soit lu."}</p>
            )}
          </section>

          <div className="lor-tk-filet" aria-hidden="true" />

          <section className="lor-tk-activite" aria-label="Activité">
            <div className="lor-tk-activite-tete">
              <h3>Activité</h3>
              <div className="lor-tk-activite-droite">
                <span className="lor-tk-abonne" title={nomChef ? `Les rappels partent à ${nomChef}` : "Aucun destinataire des rappels"}>
                  {nomChef ? "Rappels au chef de projet" : "Aucun destinataire"}
                </span>
                <span className="lor-tk-abonnes" title={nomChef ?? "Aucun chef de projet"}>
                  {nomChef ? <Avatar nom={nomChef} taille={16} /> : <IconeSansResponsable />}
                </span>
              </div>
            </div>
            <ul className="lor-tk-evenements">
              {evenements.map((ev) => (
                <li key={ev.cle} className="lor-tk-evenement" title={ev.titre}>
                  <span className="lor-tk-ev-avatar">
                    <Avatar nom={ev.qui} systeme={ev.systeme} taille={14} />
                  </span>
                  <span className="lor-tk-ev-texte">
                    <span className="lor-tk-ev-fort">{ev.qui}</span> {ev.quoi}
                    <span className="lor-tk-ev-point" aria-hidden="true">
                      {" "}
                      ·{" "}
                    </span>
                    <time dateTime={ev.quand} title={plein(ev.quand)}>
                      {depuis(ev.quand)}
                    </time>
                  </span>
                </li>
              ))}
            </ul>
            {implicite ? (
              <Commentaire
                auteur="Lorani"
                quand={p.maj_le}
                corps={
                  <>
                    {implicite.nature === "tacite" ? (dp ? "Non-opposition tacite née" : "Permis tacite né") : dp ? "Opposition tacite" : "Rejet implicite"} le {plein(implicite.date)}. {implicite.motif} À confirmer si aucune décision ne vous a été notifiée ; sinon, saisissez la décision reçue.
                  </>
                }
                action={peutEcrire ? { libelle: "Confirmer la décision implicite…", oui: { t: "implicite" }, non: { t: "saisir", q: "decision" }, titreNon: "Saisir la décision reçue" } : null}
                onChoix={executer}
              />
            ) : null}
            {proposees.map((d) => (
              <Commentaire
                key={d.id}
                auteur="Lorani"
                quand={d.cree_le}
                corps={<CorpsLue d={d} pieces={dossier.pieces} sansPermis={!d.permis_id} />}
                action={peutEcrire ? { libelle: `Confirmer ${NATURES_DATE_LUE[d.nature].libelle.toLowerCase()}…`, oui: { t: "lue", d }, non: { t: "ecarter", d }, titreNon: "Écarter cette lecture" } : null}
                onChoix={executer}
              />
            ))}
            <Link href={`${BASE}/projets/${encodeURIComponent(projet.id)}?deposer=1`} className="lor-tk-formulaire">
              <span className="lor-tk-formulaire-texte">Déposer un courrier de la mairie…</span>
              <span className="lor-tk-formulaire-pied">
                <span className="lor-tk-rond-24" aria-hidden="true">
                  <IconeSprite nom="Attachment" />
                </span>
                <span className="lor-tk-envoyer" aria-hidden="true">
                  <IconeLin nom="envoyer" />
                </span>
              </span>
            </Link>
          </section>
        </div>

        <aside className="lor-tk-proprietes" aria-label="Propriétés du permis">
          <section className="lor-tk-section">
            <h3>Propriétés</h3>
            <div className="lor-tk-liste">{proprietes(false)}</div>
          </section>
          <section className="lor-tk-section">
            <h3>Régime</h3>
            <div className="lor-tk-liste lor-tk-liste--ligne">{etiquettes}</div>
          </section>
          <section className="lor-tk-section">
            <h3>Projet</h3>
            <div className="lor-tk-liste">
              <Link href={`${BASE}/projets/${encodeURIComponent(projet.id)}`} className="lor-tk-pilule" title={`${projet.reference ? `${projet.reference} · ` : ""}${projet.nom}`}>
                <IconeSprite nom="Project" />
                <span>{projet.nom}</span>
              </Link>
            </div>
          </section>
          <section className="lor-tk-section" id="lor-tk-echeances">
            <h3>Échéances</h3>
            <div className="lor-tk-liste">
              {echeances.length ? (
                echeances.map((e) => <PiluleEcheance key={e.delai_id} e={e} nommer={nommer} />)
              ) : (
                <span className="lor-tk-pilule" data-vide="" title="Les échéances naissent au dépôt du dossier.">
                  <IconeCalendrierLor />
                  <span>Au dépôt du dossier</span>
                </span>
              )}
            </div>
          </section>
          {recours.length || accorde ? (
            <section className="lor-tk-section">
              <h3>Recours</h3>
              <div className="lor-tk-liste">
                {recours.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="lor-tk-pilule"
                    disabled={!(peutEcrire && r.issue === "en_cours")}
                    title={`${NATURES_RECOURS[r.nature]} du ${plein(r.date_recours)}${r.auteur ? `, par ${r.auteur}` : ""} · ${ISSUES_RECOURS[r.issue].libelle}${r.date_issue ? ` le ${plein(r.date_issue)}` : ""}${peutEcrire && r.issue === "en_cours" ? " · saisir l'issue" : ""}`}
                    onClick={() => executer({ t: "issue", r })}
                  >
                    <IconeStatutTicket statut={r.issue === "en_cours" ? "encours" : r.issue === "annulation" ? "annule" : "fait"} />
                    <span>
                      {NATURES_RECOURS[r.nature]} · {r.issue === "en_cours" ? "en cours" : ISSUES_RECOURS[r.issue].libelle.toLowerCase()}
                    </span>
                  </button>
                ))}
                {ecrire && boutons.recours ? (
                  <button type="button" className="lor-tk-pilule" data-vide="" onClick={() => executer({ t: "saisir", q: "recours" })}>
                    <IconeLin nom="plusPetit" />
                    <span>Recours reçu</span>
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {/* les fenêtres de l'écran d'avant, mêmes portes */}
      <PermisVue permis={p} projet={projet} dossier={dossier} source={source} peutEcrire={peutEcrire} nommer={nommer} onLocal={onLocal} relire={relire} fenetresSeules piloteRef={piloteRef} onFait={(m) => toast(`C'est fait. ${m}`)} />
    </div>
  );
}

/* « Lue », « En lecture », « À vérifier »… : le statut de lecture d'un courrier */
function etatPiece(x: PieceProjet): string {
  switch (x.statut) {
    case "lue":
      return "lu";
    case "en_lecture":
    case "deposee":
      return "en lecture";
    case "a_verifier":
      return "à vérifier";
    case "a_classer":
      return "courrier non reconnu";
    case "illisible":
      return "illisible";
    case "rejetee":
      return "rejeté";
    default:
      return "reçu";
  }
}
const libelleEcheance = (e: Echeance) => e.libelle.replace(/^[A-Z]+ « [^»]* » : /, "");

/* une étape du calendrier en ligne de sous-ticket : statut, libellé, date */
function LigneEtape({ e, auj, dates }: { e: Etape; auj: string; dates: boolean }) {
  const statut = STATUTS_ETAPE[e.statut]?.libelle ?? e.statut;
  const retard = e.statut === "manque" || (e.statut === "a_venir" && !!e.date && e.date < auj);
  const titre = [statut, e.issue, e.motif, e.detail, e.date_notifiee && e.date_calculee && e.date_notifiee !== e.date_calculee ? `Calculée le ${plein(e.date_calculee)}, notifiée le ${plein(e.date_notifiee)}` : null, e.certitude === "prevision" ? "Prévision" : null, e.source].filter(Boolean).join(" · ");
  const contenu = (
    <>
      <span className="lor-tk-l-case" aria-hidden="true" />
      <span className="lor-tk-l-statut">
        <IconeStatutTicket statut={STATUT_ETAPE[e.statut] ?? "afaire"} titre={statut} />
      </span>
      <span className="lor-tk-l-titre">{e.libelle}</span>
      <span className="lor-tk-l-fin">
        {e.date && dates ? (
          <span className="lor-tk-l-date">
            <IconeCalendrierLor passe={retard} />
            {court(e.date)}
          </span>
        ) : null}
      </span>
    </>
  );
  return e.source_url ? (
    <a href={e.source_url} target="_blank" rel="noreferrer" className="lor-tk-ligne" title={`${titre} · ouvrir la source sur Légifrance`}>
      {contenu}
    </a>
  ) : (
    <div className="lor-tk-ligne" title={titre}>
      {contenu}
    </div>
  );
}

/* une échéance : pilule de propriété (calendrier, date, libellé), le détail au survol */
function PiluleEcheance({ e, nommer }: { e: Echeance; nommer: (id: string | null | undefined) => string }) {
  const statut = e.statut === "tenu" ? "Tenue" : e.statut === "annule" ? "Annulée" : e.statut === "depasse" ? "Dépassée" : "Ouverte";
  const titre = [
    `${libelleEcheance(e)} : ${plein(e.echeance)} (${statut})`,
    e.echeance_notifiee && e.echeance_calculee && e.echeance_notifiee !== e.echeance_calculee ? `calculée le ${plein(e.echeance_calculee)}, notifiée le ${plein(e.echeance_notifiee)}` : null,
    e.rappels.length ? `rappels ${e.rappels.map((j) => `${libelleRappel(j)}${e.rappels_faits.includes(j) ? " (parti)" : ""}`).join(", ")}` : null,
    e.responsable ? `responsable : ${nommer(e.responsable)}` : null,
    e.action_attendue,
    e.regle_code ? `règle ${e.regle_code}${e.regle_version ? ` v${e.regle_version}` : ""}` : null,
    e.source_notification,
    e.source,
  ]
    .filter(Boolean)
    .join(" · ");
  const contenu = (
    <>
      <IconeCalendrierLor passe={e.statut === "depasse"} />
      <span>
        {court(e.echeance)} · {libelleEcheance(e)}
      </span>
    </>
  );
  return e.source_url ? (
    <a href={e.source_url} target="_blank" rel="noreferrer" className="lor-tk-pilule" data-vide={e.statut === "tenu" || e.statut === "annule" ? "" : undefined} title={titre}>
      {contenu}
    </a>
  ) : (
    <span className="lor-tk-pilule" data-vide={e.statut === "tenu" || e.statut === "annule" ? "" : undefined} title={titre}>
      {contenu}
    </span>
  );
}

/* le corps d'une date lue : ce que Lorani a lu, sur quel courrier, avec ses citations */
function CorpsLue({ d, pieces, sansPermis }: { d: DateLue; pieces: PieceProjet[]; sansPermis: boolean }) {
  const n = NATURES_DATE_LUE[d.nature];
  const piece = pieces.find((x) => x.id === d.piece_id);
  const valeurs = n.champs
    .map((ch) => {
      const v = d.proposition[ch.cle];
      if (v === undefined || v === null || v === "") return null;
      if (ch.type === "date") return `${ch.libelle.toLowerCase()} : ${plein(String(v))}`;
      if (ch.type === "pieces") return `${ch.libelle.toLowerCase()} : ${(v as { code: string }[]).map((x) => x.code).join(", ")}`;
      if (ch.type === "decision") return `${ch.libelle.toLowerCase()} : ${DECISIONS[v as keyof typeof DECISIONS] ?? String(v)}`;
      return `${ch.libelle.toLowerCase()} : ${String(v)}`;
    })
    .filter(Boolean);
  return (
    <>
      {n.libelle} lue sur le {n.piece}
      {piece ? ` (${piece.nom_fichier})` : ""} : {valeurs.join(" ; ")}.{sansPermis ? " Permis à choisir." : ""} {d.verifiee ? "Citation retrouvée" : "Citation non retrouvée"}
      {d.citations
        .filter((x) => x.texte)
        .slice(0, 3)
        .map((x, i) => (
          <span key={i}>
            {" "}
            « {x.texte} »{x.page ? ` (p. ${x.page})` : ""}
          </span>
        ))}
      .
    </>
  );
}

/* une carte de commentaire de Linear : tête (avatar, auteur, date), corps, pied « Leave a reply… » devenu le geste */
function Commentaire({ auteur, quand, corps, action, onChoix }: { auteur: string; quand: string; corps: React.ReactNode; action: { libelle: string; oui: Commande; non: Commande; titreNon: string } | null; onChoix: (c: Commande) => void }) {
  return (
    <div className="lor-tk-commentaire">
      <article className="lor-tk-carte">
        <div className="lor-tk-carte-tete">
          <Avatar nom={auteur} systeme />
          <span className="lor-tk-auteur">{auteur}</span>
          <time className="lor-tk-quand" dateTime={quand} title={new Date(quand).toLocaleString("fr-FR")}>
            {depuis(quand)}
          </time>
        </div>
        <p className="lor-tk-carte-corps">{corps}</p>
        {action ? (
          <div className="lor-tk-carte-pied">
            <button type="button" className="lor-tk-repondre" onClick={() => onChoix(action.oui)}>
              <Avatar nom="Vous" />
              <span>{action.libelle}</span>
            </button>
            <button type="button" className="lor-tk-rond-24" aria-label={action.titreNon} title={action.titreNon} onClick={() => onChoix(action.non)}>
              <IconeLin nom="refuser" />
            </button>
            <button type="button" className="lor-tk-envoyer" aria-label="Confirmer" title="Confirmer" onClick={() => onChoix(action.oui)}>
              <IconeLin nom="envoyer" />
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
