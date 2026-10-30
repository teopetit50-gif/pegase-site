"use client";

/* ══════════════════════════════════════════════════════════════════════
   Automatisations — le journal des exécutions de Plain (Workflows › Runs),
   au 1:1 (28/10/2026, nuit)

   Chaque module Omega EST une automatisation qui tourne pour l'entreprise
   (07/10). Depuis le 28/10, la page reprend « Runs » de Plain : une ligne par
   exécution (l'automatisation, ce qui l'a déclenchée, son état, quand, sa
   durée, le montant, l'objet traité), les états en onglets, le bouton
   Filtres (F) et ses sous-menus, et le détail d'une exécution dans le
   panneau de droite (comme chez Plain : pas une carte au milieu).

   Les exécutions sont les faits réels de ./donnees (les mêmes que la page
   Activité) : chaque document lu par FILED, chaque demande préparée par un
   module (puis la décision et l'exécution). Rien d'inventé : pas de durée
   quand on ne l'a pas (« – »), pas d'onglet « En file » puisque rien
   n'attend en file chez nous.

   Les gestes de la page d'avant (22/10, gabarit Edge Functions) :
     · « Activité » et « Demander un module » → les boutons de la tête ;
     · ouvrir un module (les dix) → Filtres › Automatisation (chaque module,
       même sans exécution : son état vide ouvre le module) et la puce
       « Automatisation » du panneau ;
     · « Ouvrir À valider » → le bouton du panneau d'une demande et l'état
       vide de l'onglet « En attente ».
   Mesures : ./lin/plain-runs.css (relevé scratchpad/releve-plain-runs.md).
   Le bouton Filtres et le bouton de tête viennent de ./lin/ListeFils.tsx
   (pf-*), sans y toucher.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Activity, Check, ChevronRight, ExternalLink, FileText, Inbox, Play, Search, Workflow, X, type LucideIcon } from "lucide-react";
import { libelleModule, montant as fmtMontant, relatif } from "@/components/espace3/base/format";
import { etatDocument } from "@/components/espace3/base/filed/etats";
import { nomPersonne } from "@/components/espace3/base/exemples/socle";
import { useSource } from "@/components/espace3/base/source";
import { useDonnees, type Donnees } from "./donnees";
import { STATUTS_DEMANDE } from "./evenements";
import { useMaintenant } from "./horloge";
import { MODULES, RACINE, moduleDe } from "./modules";
import { teinte as teinteDe, type Teinte } from "./ui";
import "./lin/lin.css";
import "./lin/plain-fils.css";
import "./lin/plain-runs.css";
import { BoutonPlain, IconeFiltres, useAdresse } from "./lin/ListeFils";
import { IconePlus18 } from "./lin/ListeRegles";

const CHEMIN = `${RACINE}/automatisations`;
const sansAccents = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ——— les états d'une exécution, en onglets (ceux de Plain : Running · Waiting · Success · Failed · Cancelled) ——— */
type Etat = "encours" | "attente" | "reussie" | "echouee" | "annulee";
const ONGLETS: { cle: Etat | "toutes"; libelle: string }[] = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "encours", libelle: "En cours" },
  { cle: "attente", libelle: "En attente" },
  { cle: "reussie", libelle: "Réussies" },
  { cle: "echouee", libelle: "Échouées" },
  { cle: "annulee", libelle: "Annulées" },
];
const VIDES: Record<Etat | "toutes", { titre: string; texte: string }> = {
  toutes: { titre: "Aucune exécution", texte: "Chaque fois qu'un module lit un document ou prépare une demande, l'exécution apparaît ici." },
  encours: { titre: "Rien en cours", texte: "Chaque fois qu'un module lit un document, l'exécution apparaît ici le temps de la lecture." },
  attente: { titre: "Rien en attente", texte: "Rien ne part sans votre accord : chaque envoi préparé attend ici, et dans « À valider »." },
  reussie: { titre: "Aucune exécution réussie", texte: "Chaque document classé et chaque demande exécutée apparaîtront ici." },
  echouee: { titre: "Aucune exécution échouée", texte: "Un document illisible ou une exécution en échec apparaîtront ici." },
  annulee: { titre: "Aucune exécution annulée", texte: "Les doublons et les demandes rejetées, annulées ou expirées apparaîtront ici." },
};

/* ——— ce qui déclenche une exécution ——— */
type Declencheur = "document" | "demande";
const DECLENCHEURS: Record<Declencheur, string> = { document: "Document reçu", demande: "Demande préparée" };

/* ——— une exécution ——— */
type Etape = { nom: string; iso: string | null; teinte: Teinte; icone: LucideIcon; badge: { libelle: string; teinte?: Teinte } | null; duree: string | null };
type Run = {
  id: string;
  module: string;
  nom: string;
  icone: LucideIcon;
  declencheur: Declencheur;
  etat: Etat;
  badge: { libelle: string; teinte: Teinte };
  demarre: string;
  termine: string | null;
  duree: string | null;
  montant: number | null;
  devise: string;
  objet: { ref: string | null; titre: string; href: string };
  /* « Ouvrir … » : le geste du panneau */
  ouvrir: { libelle: string; href: string };
  etapes: Etape[];
};

/* « 27 s », « 3 h 12 », « 2 j » : l'écart entre deux instants, sans rien inventer en deçà */
function duree(debut: string, fin: string | null): string | null {
  if (!fin) return null;
  const ms = new Date(fin).getTime() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`;
  const j = Math.floor(h / 24);
  return `${j} j${h % 24 ? ` ${h % 24} h` : ""}`;
}

const nomModule = (cle: string) => {
  const m = moduleDe(cle);
  return m ? `${m.nom} · ${m.libelle}` : libelleModule(cle);
};
const lienModule = (cle: string) => `${RACINE}/${cle}${cle === "filed" ? "/a-payer" : ""}`;

function runs(donnees: Donnees): Run[] {
  const l: Run[] = [];
  const filed = moduleDe("filed");
  for (const d of donnees.docs) {
    const e = etatDocument(d.etat);
    const t = teinteDe(e.teinte);
    const etat: Etat = d.etat === "en_lecture" ? "encours" : d.etat === "a_classer" || d.etat === "a_traiter" ? "attente" : d.etat === "illisible" ? "echouee" : d.etat === "doublon" ? "annulee" : "reussie";
    const href = `${RACINE}/filed?objet=document:${encodeURIComponent(d.id)}`;
    l.push({
      id: `doc-${d.id}`,
      module: "filed",
      nom: nomModule("filed"),
      icone: filed?.icone ?? FileText,
      declencheur: "document",
      etat,
      badge: { libelle: e.libelle, teinte: t },
      demarre: d.recu_le,
      termine: null,
      duree: null,
      montant: d.montant,
      devise: d.devise,
      objet: { ref: d.reference, titre: d.fournisseur ?? "Expéditeur inconnu", href },
      ouvrir: { libelle: "Ouvrir le document", href },
      etapes: [
        { nom: "Réception", iso: d.recu_le, teinte: "vert", icone: Play, badge: { libelle: "Document reçu" }, duree: null },
        { nom: "Lecture", iso: etat === "encours" ? null : d.recu_le, teinte: etat === "encours" ? "bleu" : t, icone: FileText, badge: { libelle: e.libelle, teinte: t }, duree: null },
      ],
    });
  }
  for (const d of donnees.demandes) {
    const s = STATUTS_DEMANDE[d.statut] ?? { libelle: d.statut, teinte: "gris" as const };
    const etat: Etat = d.statut === "en_attente" ? "attente" : d.statut === "echec_execution" ? "echouee" : d.statut === "approuvee" || d.statut === "executee" ? "reussie" : "annulee";
    const par = d.demandeur_type === "systeme" ? "Omega" : nomPersonne(d.demandeur_id);
    const m = moduleDe(d.module);
    const etapes: Etape[] = [{ nom: "Préparation", iso: d.cree_le, teinte: "vert", icone: Play, badge: { libelle: `Par ${par}` }, duree: null }];
    if (d.decide_le) {
      const decision = d.statut === "approuvee" || d.statut === "executee" || d.statut === "echec_execution" ? { libelle: "Approuvée", teinte: "vert" as const } : s;
      etapes.push({ nom: "Décision", iso: d.decide_le, teinte: decision.teinte, icone: Check, badge: decision, duree: duree(d.cree_le, d.decide_le) });
      if (d.statut === "executee" || d.statut === "echec_execution") etapes.push({ nom: "Exécution", iso: d.decide_le, teinte: s.teinte, icone: Workflow, badge: s, duree: null });
    } else etapes.push({ nom: "Décision", iso: null, teinte: "ambre", icone: Check, badge: { libelle: "Attend votre accord", teinte: "ambre" }, duree: null });
    l.push({
      id: `dem-${d.id}`,
      module: d.module,
      nom: nomModule(d.module),
      icone: m?.icone ?? Workflow,
      declencheur: "demande",
      etat,
      badge: { libelle: s.libelle, teinte: s.teinte },
      demarre: d.cree_le,
      termine: d.decide_le,
      duree: duree(d.cree_le, d.decide_le),
      montant: d.montant,
      devise: d.devise,
      objet: { ref: null, titre: d.resume.split(" — ")[0].trim() || d.resume, href: `${RACINE}/validations` },
      ouvrir: { libelle: "Ouvrir « À valider »", href: `${RACINE}/validations` },
      etapes,
    });
  }
  return l.sort((a, b) => b.demarre.localeCompare(a.demarre));
}

/* ——— les briques ——— */
function Badge({ libelle, teinte }: { libelle: string; teinte: Teinte }) {
  return (
    <span className="pru-badge" data-teinte={teinte}>
      <span>{libelle}</span>
    </span>
  );
}

function Puce({ icone: Icone, reference, titre, href, libelle }: { icone: LucideIcon; reference: string | null; titre: string; href: string; libelle: string }) {
  return (
    <span className="pru-puce-cadre">
      <Link href={href} className="pru-puce" aria-label={libelle} title={`${reference ? `${reference} ` : ""}${titre}`}>
        <span className="pru-puce-corps">
          <span className="pru-puce-icone" aria-hidden="true">
            <Icone />
          </span>
          {reference ? <span className="pru-puce-ref">{reference}</span> : null}
          <span className="pru-puce-titre">{titre}</span>
        </span>
      </Link>
    </span>
  );
}

/* le menu Filtres : « Automatisation › » et « Déclencheur › », chacun ouvrant un sous-menu avec sa recherche (F l'ouvre, Échap le ferme) */
type Sous = "module" | "declencheur";
function MenuFiltres({ module, declencheur, poser, n }: { module: string | null; declencheur: Declencheur | null; poser: (cle: Sous, valeur: string | null) => void; n: number }) {
  const [ouvert, setOuvert] = useState(false);
  const [sous, setSous] = useState<Sous | null>(null);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const id = useId();
  const fermer = useCallback(() => {
    setOuvert(false);
    setSous(null);
    setQ("");
  }, []);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fermer();
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        fermer();
        bouton.current?.focus();
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert, fermer]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (document.querySelector(".v2-voile")) return;
      if (e.key.toLowerCase() === "f") {
        /* pris avant le cadre du dashboard (F y ouvre la palette) : sur cette page, F est le menu Filtres, comme chez Plain ; ⌘K garde la palette */
        e.preventDefault();
        e.stopPropagation();
        setOuvert(true);
      }
    };
    window.addEventListener("keydown", touche, true);
    return () => window.removeEventListener("keydown", touche, true);
  }, []);
  useEffect(() => {
    if (sous) champ.current?.focus();
  }, [sous]);
  const choix: { cle: string; libelle: string }[] =
    sous === "module" ? MODULES.map((m) => ({ cle: m.cle, libelle: `${m.nom} · ${m.libelle}` })) : (Object.keys(DECLENCHEURS) as Declencheur[]).map((c) => ({ cle: c, libelle: DECLENCHEURS[c] }));
  const qq = sansAccents(q.trim());
  const visibles = choix.filter((c) => !qq || sansAccents(c.libelle).includes(qq));
  const valeur = sous === "module" ? module : declencheur;
  return (
    <div className="pru-ancre" ref={ref}>
      <BoutonPlain boutonRef={bouton} icone={<IconeFiltres />} raccourci="F" n={n || undefined} actif={n > 0} ouvert={ouvert} onClick={() => (ouvert ? fermer() : setOuvert(true))}>
        Filtres
      </BoutonPlain>
      {ouvert ? (
        <div className="pru-menu" role="menu" aria-label="Filtres" id={id}>
          {(
            [
              { cle: "module", libelle: "Automatisation", icone: <Workflow aria-hidden="true" /> },
              { cle: "declencheur", libelle: "Déclencheur", icone: <Inbox aria-hidden="true" /> },
            ] as { cle: Sous; libelle: string; icone: React.ReactNode }[]
          ).map((o) => (
            <div key={o.cle} className="pru-option-cadre">
              <button type="button" className="pru-option" role="menuitem" aria-haspopup="listbox" aria-expanded={sous === o.cle} onClick={() => setSous((s) => (s === o.cle ? null : o.cle))}>
                <span className="pru-option-gauche">
                  {o.icone}
                  <span>{o.libelle}</span>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ))}
          {sous ? (
            <div className="pru-sous-menu" role="listbox" aria-label={sous === "module" ? "Automatisation" : "Déclencheur"}>
              <div className="pru-sous-recherche">
                <Search aria-hidden="true" />
                <input
                  ref={champ}
                  className="pru-sous-champ"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={sous === "module" ? "Chercher une automatisation…" : "Chercher un déclencheur…"}
                  aria-label="Chercher"
                />
              </div>
              <div className="pru-sous-liste">
                {visibles.length ? (
                  visibles.map((c) => (
                    <button
                      key={c.cle}
                      type="button"
                      className="pru-sous-option"
                      role="option"
                      aria-selected={valeur === c.cle}
                      data-actif={valeur === c.cle ? "" : undefined}
                      onClick={() => {
                        poser(sous, valeur === c.cle ? null : c.cle);
                        fermer();
                      }}
                    >
                      <span>{c.libelle}</span>
                      {valeur === c.cle ? <Check aria-hidden="true" /> : null}
                    </button>
                  ))
                ) : (
                  <p className="pru-sous-rien">Rien ne correspond.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const COLONNES: { cle: string; libelle: string; classe: string }[] = [
  { cle: "nom", libelle: "Automatisation", classe: "pru-th-nom" },
  { cle: "declencheur", libelle: "Déclencheur", classe: "pru-th-declencheur" },
  { cle: "etat", libelle: "État", classe: "pru-th-etat" },
  { cle: "demarre", libelle: "Démarrée", classe: "pru-th-demarre" },
  { cle: "duree", libelle: "Durée", classe: "pru-th-duree" },
  { cle: "montant", libelle: "Montant", classe: "pru-th-montant pru-th--droite" },
  { cle: "objet", libelle: "Objet", classe: "pru-th-objet" },
];

export default function Automatisations() {
  const { donnees, erreur } = useDonnees();
  const { source } = useSource();
  const maintenant = useMaintenant();
  const routeur = useRouter();
  const params = useSearchParams();
  const adresse = useAdresse(CHEMIN, params);

  const toutes = useMemo(() => (donnees ? runs(donnees) : null), [donnees]);

  /* ——— l'adresse : onglet, filtres, exécution ouverte (replace, même route) ——— */
  const onglet = (ONGLETS.find((o) => o.cle === params.get("onglet"))?.cle ?? "toutes") as Etat | "toutes";
  const moduleActif = MODULES.some((m) => m.cle === params.get("module")) ? params.get("module") : null;
  const declencheur = (Object.keys(DECLENCHEURS).includes(params.get("declencheur") ?? "") ? params.get("declencheur") : null) as Declencheur | null;
  const idOuvert = params.get("run");
  const aller = useCallback((href: string) => routeur.replace(href, { scroll: false }), [routeur]);
  const lienOnglet = (cle: string) => adresse((p) => (cle === "toutes" ? p.delete("onglet") : p.set("onglet", cle)));
  const lienRun = useCallback((id: string | null) => adresse((p) => (id ? p.set("run", id) : p.delete("run"))), [adresse]);
  const poser = (cle: Sous, valeur: string | null) => aller(adresse((p) => (valeur ? p.set(cle, valeur) : p.delete(cle))));
  const nFiltres = (moduleActif ? 1 : 0) + (declencheur ? 1 : 0);

  const visibles = (toutes ?? []).filter((r) => (onglet === "toutes" || r.etat === onglet) && (!moduleActif || r.module === moduleActif) && (!declencheur || r.declencheur === declencheur));
  const ouverte = toutes?.find((r) => r.id === idOuvert) ?? null;
  const dateMaintenant = maintenant === null ? new Date() : new Date(maintenant);
  const quand = (iso: string | null) => (iso ? relatif(iso, dateMaintenant) : "–");

  /* ↑/↓ d'une ligne à l'autre (le panneau suit), Échap ferme le panneau — comme sur les autres listes de Plain */
  const ids = visibles.map((r) => r.id).join("|");
  useEffect(() => {
    const ordre = ids ? ids.split("|") : [];
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".pru-menu, .v2-voile")) return;
      if (e.key === "Escape") {
        if (idOuvert) {
          e.preventDefault();
          aller(lienRun(null));
        }
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!ordre.length) return;
      e.preventDefault();
      const courant = (document.activeElement as HTMLElement | null)?.closest?.("[data-run]")?.getAttribute("data-run") ?? idOuvert;
      let i = ordre.indexOf(courant ?? "");
      if (i < 0) i = e.key === "ArrowDown" ? 0 : ordre.length - 1;
      else i = e.key === "ArrowDown" ? Math.min(ordre.length - 1, i + 1) : Math.max(0, i - 1);
      const suivant = ordre[i];
      document.querySelector<HTMLElement>(`[data-run="${CSS.escape(suivant)}"]`)?.focus();
      if (idOuvert && suivant !== idOuvert) aller(lienRun(suivant));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ids, idOuvert, aller, lienRun]);
  /* à la fermeture du panneau, le focus revient sur la ligne */
  const derniere = useRef<string | null>(null);
  useEffect(() => {
    if (idOuvert) {
      derniere.current = idOuvert;
      return;
    }
    const avant = derniere.current;
    derniere.current = null;
    if (avant) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-run="${CSS.escape(avant)}"]`)?.focus(), 0);
  }, [idOuvert]);

  const vide = VIDES[onglet];
  const moduleFiltre = moduleActif ? moduleDe(moduleActif) : null;
  const chargement = toutes === null && source === "reelle" && !erreur;

  return (
    <div className="lin pru" data-panneau={ouverte ? "" : undefined}>
      <h1 className="v2-sr">Automatisations</h1>
      <div className="pru-grille">
        <div className="pru-gauche">
          <header className="pru-tete">
            <div className="pru-titre">
              <span className="pru-titre-icone">
                <Activity aria-hidden="true" />
              </span>
              <span className="pru-h1" aria-hidden="true">
                Automatisations
              </span>
            </div>
            <div className="pru-actions">
              <BoutonPlain icone={<Activity width={18} height={18} aria-hidden="true" />} href={`${RACINE}/activite`}>
                Activité
              </BoutonPlain>
              <Link href="/contact" className="pru-primaire">
                <IconePlus18 />
                Demander un module
              </Link>
            </div>
          </header>

          <div className="pru-rangee">
            <nav className="pru-onglets" aria-label="État">
              {ONGLETS.map((o) => (
                <Link key={o.cle} href={lienOnglet(o.cle)} replace scroll={false} className="pru-onglet" data-actif={o.cle === onglet ? "" : undefined} aria-current={o.cle === onglet ? "page" : undefined}>
                  {o.libelle}
                </Link>
              ))}
              {moduleFiltre ? (
                <Link href={adresse((p) => p.delete("module"))} replace scroll={false} className="pru-onglet pru-onglet--filtre" aria-label={`Retirer le filtre ${moduleFiltre.nom}`}>
                  {moduleFiltre.nom}
                  <X aria-hidden="true" />
                </Link>
              ) : null}
              {declencheur ? (
                <Link href={adresse((p) => p.delete("declencheur"))} replace scroll={false} className="pru-onglet pru-onglet--filtre" aria-label={`Retirer le filtre ${DECLENCHEURS[declencheur]}`}>
                  {DECLENCHEURS[declencheur]}
                  <X aria-hidden="true" />
                </Link>
              ) : null}
            </nav>
            <div className="pru-rangee-droite">
              <MenuFiltres module={moduleActif} declencheur={declencheur} poser={poser} n={nFiltres} />
            </div>
          </div>

          {erreur ? (
            <p className="pru-note" role="alert">
              La base n&apos;a pas répondu : {erreur}
            </p>
          ) : null}

          <section className="pru-tableau" aria-label="Exécutions">
            {chargement ? (
              <div className="pru-vide-cadre" aria-busy="true">
                <div className="pru-vide">
                  <div className="pru-vide-corps">
                    <div className="pru-vide-texte">
                      <strong>Lecture…</strong>
                      <p>La base répond dans un instant.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : visibles.length === 0 ? (
              <div className="pru-vide-cadre">
                <div className="pru-vide">
                  <div className="pru-vide-corps">
                    <div className="pru-vide-icone" aria-hidden="true">
                      {moduleFiltre ? <moduleFiltre.icone /> : <Activity />}
                    </div>
                    <div className="pru-vide-texte">
                      <strong>{moduleFiltre ? `Aucune exécution de ${moduleFiltre.nom}` : vide.titre}</strong>
                      <p>{moduleFiltre ? `${moduleFiltre.description}. Chaque fois que ${moduleFiltre.nom} travaille pour vous, l'exécution apparaît ici.` : vide.texte}</p>
                    </div>
                    {moduleFiltre ? (
                      <Link href={lienModule(moduleFiltre.cle)} className="pru-vide-bouton">
                        <moduleFiltre.icone aria-hidden="true" />
                        Ouvrir {moduleFiltre.nom}
                      </Link>
                    ) : onglet === "attente" ? (
                      <Link href={`${RACINE}/validations`} className="pru-vide-bouton">
                        <Check aria-hidden="true" />
                        Ouvrir « À valider »
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <table className="pru-table">
                <thead>
                  <tr>
                    {COLONNES.map((c) => (
                      <th key={c.cle} scope="col" className={`pru-th ${c.classe}`}>
                        {c.libelle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => {
                    const actif = r.id === idOuvert;
                    const href = lienRun(actif ? null : r.id);
                    /* comme chez Plain, un lien couvre chaque cellule ; seul le premier est pris au clavier */
                    const lien = (premier?: boolean) => (
                      <Link
                        href={href}
                        replace
                        scroll={false}
                        className="pru-ligne-lien"
                        data-run={premier ? r.id : undefined}
                        aria-label={premier ? `${r.nom} — ${r.objet.titre}` : undefined}
                        aria-hidden={premier ? undefined : true}
                        tabIndex={premier ? undefined : -1}
                        aria-current={premier && actif ? "true" : undefined}
                      />
                    );
                    return (
                      <tr key={r.id} className="pru-ligne" data-actif={actif ? "" : undefined}>
                        <td className="pru-td">
                          {lien(true)}
                          <span className="pru-nom">{r.nom}</span>
                        </td>
                        <td className="pru-td">
                          {lien()}
                          <span className="pru-gris">{DECLENCHEURS[r.declencheur]}</span>
                        </td>
                        <td className="pru-td">
                          {lien()}
                          <Badge libelle={r.badge.libelle} teinte={r.badge.teinte} />
                        </td>
                        <td className="pru-td">
                          {lien()}
                          <span className="pru-gris">
                            <time dateTime={r.demarre}>{quand(r.demarre)}</time>
                          </span>
                        </td>
                        <td className="pru-td">
                          {lien()}
                          <span className={r.duree ? "pru-gris" : "pru-gris pru-gris--faible"}>{r.duree ?? "–"}</span>
                        </td>
                        <td className="pru-td pru-td--droite">
                          {lien()}
                          <span className={r.montant !== null ? "pru-gris" : "pru-gris pru-gris--faible"}>{r.montant !== null ? fmtMontant(r.montant, r.devise) : "–"}</span>
                        </td>
                        <td className="pru-td">
                          {lien()}
                          <Puce icone={r.icone} reference={r.objet.ref} titre={r.objet.titre} href={r.objet.href} libelle={`Ouvrir ${r.objet.ref ? `${r.objet.ref} ` : ""}${r.objet.titre}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>

        {ouverte ? (
          <aside className="pru-panneau" aria-label={`Exécution : ${ouverte.nom}`}>
            <div className="pru-panneau-tete">
              <h2 className="pru-panneau-titre">{ouverte.nom}</h2>
              <Link href={lienRun(null)} replace scroll={false} className="pru-fermer" aria-label="Fermer">
                <X aria-hidden="true" />
              </Link>
            </div>
            <dl className="pru-fiche">
              <dt>État</dt>
              <dd>
                <Badge libelle={ouverte.badge.libelle} teinte={ouverte.badge.teinte} />
              </dd>
              <dt>Automatisation</dt>
              <dd>
                <Puce icone={ouverte.icone} reference={null} titre={ouverte.nom} href={lienModule(ouverte.module)} libelle={`Ouvrir ${ouverte.nom}`} />
              </dd>
              <dt>Déclencheur</dt>
              <dd>
                <span>{DECLENCHEURS[ouverte.declencheur]}</span>
              </dd>
              <dt>Démarrée</dt>
              <dd>
                <span>
                  <time dateTime={ouverte.demarre}>{quand(ouverte.demarre)}</time>
                </span>
              </dd>
              <dt>Terminée</dt>
              <dd>
                <span>{ouverte.termine ? <time dateTime={ouverte.termine}>{quand(ouverte.termine)}</time> : "–"}</span>
              </dd>
              <dt>Durée</dt>
              <dd>
                <span>{ouverte.duree ?? "–"}</span>
              </dd>
              <dt>Montant</dt>
              <dd>
                <span>{ouverte.montant !== null ? fmtMontant(ouverte.montant, ouverte.devise) : "–"}</span>
              </dd>
              <dt>Objet</dt>
              <dd>
                <Puce
                  icone={ouverte.icone}
                  reference={ouverte.objet.ref}
                  titre={ouverte.objet.titre}
                  href={ouverte.objet.href}
                  libelle={`Ouvrir ${ouverte.objet.ref ? `${ouverte.objet.ref} ` : ""}${ouverte.objet.titre}`}
                />
              </dd>
            </dl>
            <div className="pru-etapes">
              <div className="pru-etapes-tete">
                <h2>Étapes</h2>
                <Link href={ouverte.ouvrir.href} className="pru-petit">
                  <ExternalLink aria-hidden="true" />
                  {ouverte.ouvrir.libelle}
                </Link>
              </div>
              <ol className="pru-etapes-liste">
                {ouverte.etapes.map((e) => (
                  <li key={e.nom} className="pru-etape">
                    <span className="pru-etape-tuile" data-teinte={e.teinte} aria-hidden="true">
                      <e.icone />
                    </span>
                    <div className="pru-etape-corps">
                      <div className="pru-etape-nom">
                        <span>{e.nom}</span>
                      </div>
                      <div className="pru-etape-sous">
                        <div className="pru-etape-gauche">
                          {e.badge ? (
                            <span className="pru-mini" data-teinte={e.badge.teinte}>
                              {e.badge.libelle}
                            </span>
                          ) : null}
                          {e.duree ? <span className="pru-etape-gris">{e.duree}</span> : null}
                        </div>
                        <span className="pru-etape-gris">{e.iso ? <time dateTime={e.iso}>{quand(e.iso)}</time> : "–"}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
