"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — Membres : l'annuaire vérifié (reprise du 02/11/2026)

   LE CONTENU vient des résultats de recherche de pappers.be, relevés dans
   Chromium (https://www.pappers.be/fr/search?q=menuiserie, page publique,
   sans compte) : un champ de recherche ; des filtres en pastilles et un
   « Ajouter un filtre » rangé par familles (Informations, Activité,
   Localisation…) ; « Réinitialiser » dès qu'un filtre est posé ; le titre
   des résultats et leur nombre ; une entrée par entreprise avec son nom,
   son activité, son lieu, ses chiffres et « Voir la fiche » ; quand rien ne
   correspond, « Aucune entreprise trouvée… » avec « Supprimer tous les
   filtres » et « Annuler le dernier filtre ». Ici, l'île tient lieu de
   ville, les badges vérifiés de chiffres, et « propose / cherche » de
   l'activité détaillée.

   L'HABILLAGE est celui des pages des moteurs (FILED, CASHD, REPUT,
   OFFLOAD, DALIRO) et de leur kit components/espace2/lin/ : la liste
   « Projects » de Linear, comme Entreprises. Barre du titre de 44, barre
   d'outils de 28 (onglets en pastilles pour les vues, ronds à droite),
   tableau à en-tête de 32 et lignes de 48, panneau Détails de 428 à droite
   (ici : « Ce que je montre au réseau »), jetons --lin-*, sombre et clair.

   Les filtres vivent dans l'adresse (?q=&ile=&secteur=&propose=&cherche=
   &badge=). En base réelle, l'annuaire est vide (le réseau n'a encore
   aucune table) : jamais les membres d'exemple.
   ══════════════════════════════════════════════════════════════════════ */

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Briefcase, CalendarDays, Check, ChevronRight, FolderOpen, Handshake, ListFilter, MapPin, PanelRight, RotateCcw, Search, Timer, Trash2, X } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { MEMBRES, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { Avatar, BadgeCourt, ReseauFerme } from "./membres-ui";
import { PanneauVisibilite } from "./membres-panneau";
import { FILTRES_VIDES, ILES, PROPOSITIONS, RECHERCHES, SECTEURS, adresseDe, badgesLus, filtrer, filtresDe, lienMembre, moisCourt, nbFiltres, type CleBadge, type Filtres } from "./membres-donnees";
import "../lin/lin.css";
import "./membres.css";

export function MembresListe() {
  const { source } = useSource();
  if (!reseauEnExemple(source))
    return (
      <div className="lin rm">
        <header className="lin-tete">
          <h1 className="lin-tete-titre rm-h1">Membres</h1>
        </header>
        <div className="rm-ferme">
          <ReseauFerme />
        </div>
      </div>
    );
  return <Annuaire />;
}

function Annuaire() {
  const router = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const filtres = useMemo(() => filtresDe(new URLSearchParams(params.toString())), [params]);
  /* le champ garde sa frappe localement ; l'adresse suit à la sortie du champ */
  const [frappe, setFrappe] = useState(filtres.q);
  /* « Annuler le dernier filtre » (pappers) : les adresses d'avant, la plus récente en dernier */
  const [historique, setHistorique] = useState<string[]>([]);
  const [details, setDetails] = useState(true);

  const appliquer = (f: Filtres) => {
    /* 03/11/2026 — comparer à l'adresse en cours : avec la frappe, « avant » et
       « après » étaient égaux et la recherche n'entrait jamais dans l'adresse
       (perdue au retour d'une fiche) */
    const avant = adresseDe(filtres);
    const apres = adresseDe(f);
    if (avant === apres) return;
    setHistorique((h) => [...h, avant]);
    router.replace(`${chemin}${apres}`, { scroll: false });
  };
  const changer = (partiel: Partial<Filtres>) => appliquer({ ...filtres, q: frappe, ...partiel });
  /* une frappe pas encore validée compte comme le dernier filtre */
  const peutAnnuler = historique.length > 0 || frappe !== filtres.q;
  const annulerDernier = () => {
    if (frappe !== filtres.q) {
      setFrappe(filtres.q);
      return;
    }
    const precedent = historique[historique.length - 1];
    if (precedent === undefined) return;
    setHistorique((h) => h.slice(0, -1));
    setFrappe(filtresDe(new URLSearchParams(precedent)).q);
    router.replace(`${chemin}${precedent}`, { scroll: false });
  };
  const toutEffacer = () => {
    setFrappe("");
    appliquer(FILTRES_VIDES);
  };

  const courant = { ...filtres, q: frappe };
  const resultats = filtrer(MEMBRES, courant);
  /* le nombre de chaque vue suit les autres filtres, comme les compteurs des onglets de Linear */
  const parIle = (ile: Filtres["ile"]) => filtrer(MEMBRES, { ...courant, ile }).length;
  const poses = nbFiltres(filtres) + (frappe.trim() ? 1 : 0) + (filtres.ile ? 1 : 0);
  const vue = (ile: Filtres["ile"]) => `${chemin}${adresseDe({ ...courant, ile })}`;

  /* en « Tous », les membres sont rangés par île, comme les groupes de Linear */
  const groupes = filtres.ile ? [{ ile: filtres.ile, membres: resultats }] : ILES.map((ile) => ({ ile, membres: resultats.filter((m) => m.ile === ile) })).filter((g) => g.membres.length);

  return (
    <div className="lin rm">
      <header className="lin-tete">
        <h1 className="lin-tete-titre rm-h1">Membres</h1>
        <div className="lin-tete-droite">
          <span className="lin-position" aria-live="polite">
            {resultats.length === MEMBRES.length ? `${MEMBRES.length} membres` : `${resultats.length} sur ${MEMBRES.length}`}
          </span>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Vues par île">
          <Link href={vue(null)} className="lin-onglet" data-actif={!filtres.ile ? "" : undefined} aria-current={!filtres.ile ? "page" : undefined} replace scroll={false}>
            Tous les membres <span className="rm-onglet-n">{parIle(null)}</span>
          </Link>
          {ILES.map((ile) => (
            <Link key={ile} href={vue(ile)} className="lin-onglet" data-actif={filtres.ile === ile ? "" : undefined} aria-current={filtres.ile === ile ? "page" : undefined} replace scroll={false}>
              {ile} <span className="rm-onglet-n">{parIle(ile)}</span>
            </Link>
          ))}
        </nav>
        <div className="lin-outils-droite">
          <label className="rm-recherche">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={frappe}
              placeholder="Nom, activité, commune…"
              aria-label="Rechercher un membre"
              onChange={(e) => setFrappe(e.target.value)}
              onBlur={() => changer({})}
              onKeyDown={(e) => {
                if (e.key === "Enter") changer({});
                if (e.key === "Escape") {
                  setFrappe("");
                  changer({ q: "" });
                }
              }}
            />
          </label>
          <MenuFiltre filtres={filtres} onChange={changer} />
          <button type="button" className="lin-rond" aria-label="Ce que je montre au réseau" title="Ce que je montre au réseau" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight aria-hidden="true" />
          </button>
        </div>
      </div>

      {nbFiltres(filtres) ? (
        <div className="rm-poses" role="group" aria-label="Filtres posés">
          {filtres.secteur ? <FiltrePose libelle="Secteur" valeur={filtres.secteur} onRetirer={() => changer({ secteur: null })} /> : null}
          {filtres.propose.map((x) => (
            <FiltrePose key={`p-${x}`} libelle="Propose" valeur={x} onRetirer={() => changer({ propose: filtres.propose.filter((y) => y !== x) })} />
          ))}
          {filtres.cherche.map((x) => (
            <FiltrePose key={`c-${x}`} libelle="Cherche" valeur={x} onRetirer={() => changer({ cherche: filtres.cherche.filter((y) => y !== x) })} />
          ))}
          {filtres.badges.map((b) => (
            <FiltrePose key={`b-${b}`} libelle="Badge" valeur={b === "bonPayeur" ? "Bon payeur" : "Réponse rapide"} onRetirer={() => changer({ badges: filtres.badges.filter((y) => y !== b) })} />
          ))}
          <button type="button" className="lin-btn lin-btn--texte rm-reinitialiser" onClick={toutEffacer}>
            <RotateCcw width={14} height={14} aria-hidden="true" />
            Réinitialiser
          </button>
        </div>
      ) : null}

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          {resultats.length ? (
            <div className="rm-table" role="table" aria-label="Membres du réseau">
              <div className="rm-tete" role="row">
                <span role="columnheader" className="rm-col-nom">
                  Nom
                </span>
                <span role="columnheader" className="rm-col-activite">
                  Activité
                </span>
                <span role="columnheader" className="rm-col-lieu">
                  Lieu
                </span>
                <span role="columnheader" className="rm-col-propose">
                  Propose
                </span>
                <span role="columnheader" className="rm-col-badges">
                  Badges vérifiés
                </span>
                <span role="columnheader" className="rm-col-date">
                  Membre depuis
                </span>
              </div>
              {groupes.map((g) => (
                <Fragment key={g.ile}>
                  {groupes.length > 1 || !filtres.ile ? (
                    <div className="rm-groupe" role="row">
                      <span role="cell">
                        <MapPin aria-hidden="true" />
                        {g.ile}
                        <span className="rm-groupe-n">{g.membres.length}</span>
                      </span>
                    </div>
                  ) : null}
                  {g.membres.map((m) => (
                    <LigneMembre key={m.slug} membre={m} onOuvrir={() => router.push(lienMembre(m.slug))} />
                  ))}
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="rm-aucun">
              <FolderOpen aria-hidden="true" />
              <p className="rm-aucun-titre">Aucun membre trouvé…</p>
              <p>Aucun membre ne correspond à votre recherche ou aux filtres posés. Vous pouvez annuler le dernier filtre ou supprimer tous les filtres.</p>
              <div className="rm-aucun-actions">
                <button type="button" className="v2-btn v2-btn--petit" onClick={toutEffacer}>
                  <Trash2 width={14} height={14} aria-hidden="true" />
                  Supprimer tous les filtres
                </button>
                <button type="button" className="v2-btn v2-btn--petit" onClick={annulerDernier} disabled={!peutAnnuler}>
                  <RotateCcw width={14} height={14} aria-hidden="true" />
                  Annuler le dernier filtre
                </button>
              </div>
            </div>
          )}
          {poses && resultats.length ? <p className="rm-pied">{resultats.length > 1 ? `${resultats.length} membres correspondent` : "1 membre correspond"} à votre recherche, sur {MEMBRES.length}.</p> : null}
        </div>
        {details ? <PanneauVisibilite onFermer={() => setDetails(false)} /> : null}
      </div>
    </div>
  );
}

/* ——— une ligne : toute la ligne ouvre la fiche (« Voir la fiche » de pappers) ——— */

function LigneMembre({ membre: m, onOuvrir }: { membre: Membre; onOuvrir: () => void }) {
  const badges = badgesLus(m.badges);
  const plus = m.propose.length - 1;
  return (
    <div
      className="rm-ligne"
      role="row"
      tabIndex={0}
      aria-label={`${m.nom}, ${m.secteur}, ${m.commune}`}
      onClick={(e) => {
        /* un clic sur un badge ouvre son infobulle, pas la fiche */
        if ((e.target as HTMLElement).closest("button, a")) return;
        onOuvrir();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onOuvrir();
      }}
    >
      <span role="cell" className="rm-col-nom rm-nom">
        <Avatar nom={m.nom} />
        <Link href={lienMembre(m.slug)} className="rm-titre" tabIndex={-1}>
          {m.nom}
        </Link>
        <span className="rm-nom-meta">
          {m.secteur} · {m.commune}
        </span>
      </span>
      <span role="cell" className="rm-col-activite">
        <span className="rm-valeur">
          <Briefcase aria-hidden="true" />
          <span>{m.secteur}</span>
        </span>
      </span>
      <span role="cell" className="rm-col-lieu">
        <span className="rm-valeur">
          <MapPin aria-hidden="true" />
          <span>{m.commune}</span>
        </span>
      </span>
      <span role="cell" className="rm-col-propose">
        <span className="rm-valeur" title={m.propose.join(" · ")}>
          <Handshake aria-hidden="true" />
          <span>{m.propose[0]}</span>
          {plus > 0 ? <span className="rm-plus">+{plus}</span> : null}
        </span>
      </span>
      <span role="cell" className="rm-col-badges">
        {badges.length ? badges.map((b) => <BadgeCourt key={b.cle} badge={b} />) : <span className="rm-valeur rm-valeur--vide">Aucun montré</span>}
      </span>
      <span role="cell" className="rm-col-date">
        <span className="rm-valeur">
          <CalendarDays aria-hidden="true" />
          <span>{moisCourt(m.depuis)}</span>
        </span>
      </span>
    </div>
  );
}

function FiltrePose({ libelle, valeur, onRetirer }: { libelle: string; valeur: string; onRetirer: () => void }) {
  return (
    <button type="button" className="lin-onglet rm-pose" onClick={onRetirer} title="Retirer ce filtre" aria-label={`Retirer le filtre ${libelle} : ${valeur}`}>
      <span className="rm-pose-libelle">{libelle}</span>
      <span className="rm-pose-valeur">{valeur}</span>
      <X aria-hidden="true" />
    </button>
  );
}

/* ——— le menu « Filtrer » : les familles de pappers (« Ajouter un filtre »),
   puis les valeurs, dans le menu de Linear (lin-menu--options) ——— */

type Famille = "secteur" | "propose" | "cherche" | "badges";
const FAMILLES: { cle: Famille; groupe: string; libelle: string; icone: React.ReactNode }[] = [
  { cle: "secteur", groupe: "Activité", libelle: "Secteur", icone: <Briefcase aria-hidden="true" /> },
  { cle: "propose", groupe: "Réseau", libelle: "Ce qu'il propose", icone: <Handshake aria-hidden="true" /> },
  { cle: "cherche", groupe: "Réseau", libelle: "Ce qu'il cherche", icone: <Search aria-hidden="true" /> },
  { cle: "badges", groupe: "Badges vérifiés", libelle: "Badges", icone: <BadgeCheck aria-hidden="true" /> },
];

function MenuFiltre({ filtres, onChange }: { filtres: Filtres; onChange: (f: Partial<Filtres>) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [famille, setFamille] = useState<Famille | null>(null);
  const [q, setQ] = useState("");
  const [actif, setActif] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const saisie = useRef<HTMLInputElement>(null);
  /* d'un niveau à l'autre, la saisie garde la main (on tape pour chercher une valeur) */
  useEffect(() => {
    if (ouvert) saisie.current?.focus();
  }, [ouvert, famille]);
  const fermer = () => {
    setOuvert(false);
    setFamille(null);
    setQ("");
    setActif(0);
  };
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, [ouvert]);

  type Ligne = { cle: string; libelle: string; icone?: React.ReactNode; meta?: string; coche?: boolean; groupe?: string; suite?: boolean; choisir: () => void };
  const nb = (f: Famille) => (f === "secteur" ? (filtres.secteur ? 1 : 0) : f === "badges" ? filtres.badges.length : filtres[f].length);
  const basculer = (liste: string[], x: string) => (liste.includes(x) ? liste.filter((y) => y !== x) : [...liste, x]);

  const lignes: Ligne[] = !famille
    ? FAMILLES.map((f) => ({ cle: f.cle, libelle: f.libelle, icone: f.icone, groupe: f.groupe, meta: nb(f.cle) ? String(nb(f.cle)) : undefined, suite: true, choisir: () => (setFamille(f.cle), setQ(""), setActif(0)) }))
    : famille === "secteur"
      ? SECTEURS.map((s) => ({ cle: s, libelle: s, coche: filtres.secteur === s, choisir: () => (onChange({ secteur: filtres.secteur === s ? null : s }), fermer()) }))
      : famille === "badges"
        ? ([
            { cle: "bonPayeur", libelle: "Bon payeur", icone: <BadgeCheck aria-hidden="true" /> },
            { cle: "reponseRapide", libelle: "Réponse rapide", icone: <Timer aria-hidden="true" /> },
          ] as const).map((b) => ({ ...b, coche: filtres.badges.includes(b.cle), choisir: () => onChange({ badges: basculer(filtres.badges, b.cle) as CleBadge[] }) }))
        : (famille === "propose" ? PROPOSITIONS : RECHERCHES).map((x) => ({ cle: x, libelle: x, coche: filtres[famille].includes(x), choisir: () => onChange({ [famille]: basculer(filtres[famille], x) }) }));
  const visibles = lignes.filter((l) => !q || l.libelle.toLowerCase().includes(q.toLowerCase()));
  const titre = famille ? FAMILLES.find((f) => f.cle === famille)!.libelle : "Filtrer…";

  const touche = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (famille) {
        setFamille(null);
        setQ("");
        setActif(0);
      } else fermer();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => Math.min(visibles.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      visibles[actif]?.choisir();
    } else if (e.key === "Backspace" && !q && famille) {
      setFamille(null);
      setActif(0);
    }
  };
  const total = nbFiltres(filtres);

  return (
    <div className="lin-ancre" ref={ref}>
      <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-haspopup="listbox" aria-expanded={ouvert} data-actif={total ? "" : undefined} onClick={() => (ouvert ? fermer() : setOuvert(true))}>
        <ListFilter aria-hidden="true" />
      </button>
      {ouvert ? (
        <div className="lin-menu lin-menu--options rm-menu-filtre" data-cote="droite" onKeyDown={touche}>
          <div className="lin-menu-tete">
            {famille ? (
              <button type="button" className="rm-menu-retour" aria-label="Retour aux familles de filtres" onClick={() => (setFamille(null), setQ(""), setActif(0))}>
                <ChevronRight aria-hidden="true" />
              </button>
            ) : null}
            <input
              ref={saisie}
              className="lin-menu-saisie"
              placeholder={titre}
              aria-label={titre}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActif(0);
              }}
            />
          </div>
          <ul className="lin-options" role="listbox" aria-label={titre} aria-multiselectable={famille === "propose" || famille === "cherche" || famille === "badges" ? true : undefined}>
            {visibles.length ? (
              visibles.map((l, i) => (
                <Fragment key={l.cle}>
                  {!famille && l.groupe && l.groupe !== visibles[i - 1]?.groupe ? (
                    <li className="rm-menu-groupe" role="presentation">
                      {l.groupe}
                    </li>
                  ) : null}
                  <li role="option" aria-selected={famille ? !!l.coche : i === actif}>
                    <button type="button" className="lin-option" data-actif={i === actif ? "" : undefined} onMouseEnter={() => setActif(i)} onClick={l.choisir}>
                      {famille && famille !== "badges" ? (
                        <span className="rm-menu-case" data-coche={l.coche ? "" : undefined} aria-hidden="true">
                          {l.coche ? <Check /> : null}
                        </span>
                      ) : l.icone ? (
                        <span className="lin-option-icone">{l.icone}</span>
                      ) : null}
                      <span className="lin-option-libelle">{l.libelle}</span>
                      {l.meta ? <span className="lin-option-meta">{l.meta}</span> : null}
                      {famille === "badges" && l.coche ? <Check className="lin-option-coche" width={14} height={14} aria-label="posé" /> : null}
                      {l.suite ? <ChevronRight className="rm-menu-suite" aria-hidden="true" /> : null}
                    </button>
                  </li>
                </Fragment>
              ))
            ) : (
              <li className="lin-options-vide">Aucun résultat</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
