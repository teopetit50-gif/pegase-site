"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI › la page d'un projet (refaite le 02/11/2026)

   La page d'une Initiative de Linear (« Résidence Les Tilleuls »), au
   1:1 : relevé docs/refonte-metiers/releves/linear-initiative.md (29/10
   et 01/11), styles dans ./lor-initiative.css (préfixe lor-in-), jetons
   dans ./lor.css, icônes de Linear (./lor-icones). Une Initiative = un
   projet de l'agence :

     fil d'Ariane     « Permis » › tuile de la nature + nom du projet
     « … »            Nouveau projet (F1), Nouveau permis (F2), Déposer un
                      courrier de la mairie (F3), Exporter le dossier daté
                      (G7), écran d'avant
     à droite         copier le lien de la page ; « + » : permis, courrier,
                      lot, intervenant, membre (F2-F6)
     onglets          Vue d'ensemble · Activité · Permis, puis les vues du
                      dossier (Équipe, Urbanisme, Contrôle, Consultation,
                      Chantier, Réception, Assurances) et les Honoraires
                      (leur page) ; « ?partie= » dans l'adresse, comme avant
     ⌘ I              le volet de détails : Propriétés, Avancement (les
                      permis par santé, état, chef), Activité
     Vue d'ensemble   tuile, nom, résumé (référence, adresse, parcelles) ;
                      Properties : nature, phase, chef de projet, prochaine
                      date, « … » (marché public, territoire) ; Resources :
                      règlement du PLU, dossier daté, « + » courrier ;
                      Latest update : le dernier compte rendu de chantier,
                      sinon le point de Lorani sur le permis le plus pressé ;
                      Description : nature, marché, territoire, zone du PLU,
                      pièces exigées ; Projects : les permis du projet, en
                      groupes (À confirmer, Pièces à fournir…), mêmes
                      colonnes que Linear
     Activité         ce qui est arrivé au projet, par mois
     vues du dossier  les parties de ProjetCarte en liste (titre 18/500 de
                      la section « Projects », lignes de Linear) ; l'élément
                      choisi s'ouvre dans le volet de droite

   Inventaire lorani.md : B18-B33, F1-F6, F14-F42, G1-G7 et les gestes des
   parties restent atteignables, mêmes portes. Les liens des alertes
   (E4, E10-E31) arrivent ici.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProjetCarte, { type PartieProjet } from "@/components/espace/lorani/ProjetCarte";
import { Etat, OngletOutil, type Liste } from "./OngletOutil";
import { INDEX_INSEE } from "@/components/espace/lorani/Chantier";
import Formulaires, { type Form } from "@/components/espace/lorani/Formulaires";
import { dossierDate, lignesDossier } from "@/components/espace/lorani/dossier-date";
import { bordereauVisas } from "./bordereau-visas";
import { ETATS, FAMILLES, NATURES_INTERVENANT, NATURES_PROJET, PHASES, ROLES_PROJET, prochaineDate, titrePermis, type Famille } from "@/components/espace/lorani/etats";
import { bordereau } from "@/components/espace/lorani/pieces-exigees";
import type { Permis, Projet } from "@/components/espace/lorani/types";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { VoletContexte, useVoletPage } from "../lin/Volet";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { copier as copierTexte, datesReport, exporterCsv, useMarques, useReports } from "./lor-local";
import { BarreSelection, BoutonEtoile, useSelection } from "./lor-selection";
import {
  IconeAffichage,
  IconeCalendrierLor,
  IconeLin,
  IconeNouvelleVue,
  IconePlus,
  IconePoints,
  IconePrioriteLor,
  IconeSansResponsable,
  IconeSanteLor,
  IconeSprite,
  IconeStatutLor,
  IconeTri,
  IconeVolet,
  type SanteLor,
  type StatutLor,
} from "./lor-icones";
import type { NomIcone } from "./lor-sprite";
import "@/components/espace/espace.css";
import "./lor.css";
import "./lor-initiative.css";

const BASE = `${RACINE}/lorani`;

/* ——— les onglets : les trois de Linear, puis les vues du dossier ——— */
type Cle = "projet" | "activite" | "permis" | "equipe" | "urbanisme" | "controle" | "consultation" | "chantier" | "reception" | "assurances";
const ONGLETS: { cle: Cle; libelle: string; parties?: PartieProjet[] }[] = [
  { cle: "projet", libelle: "Vue d'ensemble" },
  { cle: "activite", libelle: "Activité" },
  { cle: "permis", libelle: "Permis" },
  { cle: "equipe", libelle: "Équipe", parties: ["identite", "equipe", "intervenants"] },
  { cle: "urbanisme", libelle: "Urbanisme", parties: ["plu", "pieces"] },
  { cle: "controle", libelle: "Contrôle", parties: ["controle"] },
  { cle: "consultation", libelle: "Consultation", parties: ["offres"] },
  { cle: "chantier", libelle: "Chantier", parties: ["chantier", "comptesRendus", "ordresService"] },
  { cle: "reception", libelle: "Réception", parties: ["reserves", "doe"] },
  { cle: "assurances", libelle: "Assurances", parties: ["assurances"] },
];
const estCle = (v: string | null): v is Cle => ONGLETS.some((o) => o.cle === v);

/* l'icône de projet du sprite de Linear et sa couleur, selon la nature (comme la vue d'ensemble) */
const ICONE_NATURE: Record<Projet["nature"], { nom: NomIcone; couleur: string }> = {
  maison_individuelle: { nom: "Home", couleur: "lch(67.969% 19.321 31.72)" },
  logement_collectif: { nom: "Project", couleur: "#26b5ce" },
  erp: { nom: "Education", couleur: "#eb5757" },
  igh: { nom: "Project", couleur: "lch(48% 59.31 288.43)" },
  tertiaire: { nom: "Briefcase", couleur: "lch(67.969% 62.082 61.651)" },
  autre: { nom: "Project", couleur: "lch(80% 90 85)" },
};
const SANTE: Record<Famille, SanteLor> = { a_confirmer: "risque", pieces: "hors", instruction: "bien", accordes: "bien", clos: "aucune" };
const LIBELLE_SANTE: Record<SanteLor, string> = { bien: "Dans les temps", risque: "À confirmer", hors: "En retard", aucune: "Sans suite", manque: "Point manquant" };
const AVANCEMENT: Partial<Record<Permis["etat"], { statut: StatutLor; etapes: number }>> = {
  a_deposer: { statut: "attente", etapes: 0 },
  completude: { statut: "cours", etapes: 1 },
  pieces_demandees: { statut: "cours", etapes: 1 },
  instruction: { statut: "cours", etapes: 2 },
  decision_a_confirmer: { statut: "cours", etapes: 3 },
  accorde: { statut: "cours", etapes: 4 },
  recours_en_cours: { statut: "cours", etapes: 5 },
  purge: { statut: "fait", etapes: 7 },
};

/* ——— dates ——— */
const midi = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmtPlein = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const court = (iso: string) => (midi(iso).getUTCFullYear() === new Date().getFullYear() ? fmtCourt : fmtLong).format(midi(iso));
const plein = (iso: string) => fmtPlein.format(midi(iso));
const jourIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
function depuis(iso: string): string {
  const t = iso.length <= 10 ? midi(iso).getTime() : Date.parse(iso);
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86_400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 30 * 86_400) return `il y a ${Math.floor(s / 86_400)} j`;
  return court(iso);
}
const initiales = (nom: string) =>
  nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;

function telecharger(nom: string, octets: Uint8Array, type: string) {
  const url = URL.createObjectURL(new Blob([octets as BlobPart], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ——— un menu de Linear qui se ferme au clic dehors et sur Échap ——— */
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
type Choix = { cle: string; libelle: string; icone?: React.ReactNode; form?: Form; href?: string; exporter?: boolean; off?: boolean; separe?: boolean };
function Menu({ choix, fermer, onChoix, style, etiquette }: { choix: Choix[]; fermer: () => void; onChoix: (c: Choix) => void; style: React.CSSProperties; etiquette: string }) {
  return (
    <div className="lor-menu lor-in-menu" role="menu" aria-label={etiquette} style={style}>
      <div className="lor-menu-liste">
        {choix.map((c) => (
          <div key={c.cle}>
            {c.separe ? <div className="lor-menu-sep" aria-hidden="true" /> : null}
            {c.href ? (
              <Link role="menuitem" href={c.href} className="lor-option" onClick={fermer}>
                {c.icone}
                <span className="lor-option-libelle">{c.libelle}</span>
              </Link>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="lor-option"
                disabled={c.off}
                onClick={() => {
                  fermer();
                  onChoix(c);
                }}
              >
                {c.icone}
                <span className="lor-option-libelle">{c.libelle}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ nom, taille = 18 }: { nom: string; taille?: number }) {
  return (
    <span className="lor-in-avatar" style={{ width: taille, height: taille }} aria-hidden="true">
      {initiales(nom) || "?"}
    </span>
  );
}

type Evenement = { cle: string; quand: string; qui: string; quoi: string };

export default function PageProjet({ id }: { id: string }) {
  const { pret, erreur, dossier, peutEcrire, agir, nommer, personnes, proposeesPar, familleDe } = useLorani();
  const toast = useToast();
  const params = useSearchParams();
  const chemin = usePathname();
  const router = useRouter();
  /* « ?deposer=1 » (la page d'un permis y mène) : la fenêtre du courrier s'ouvre d'emblée */
  /* « ?deposer=1 » (la page d'un permis y mène) : la fenêtre du courrier s'ouvre d'emblée ; « ?nouveau=permis » (Dupliquer, sur la page d'un permis) : celle d'un nouveau permis */
  const [form, setForm] = useState<Form>(() => (params.get("deposer") ? { type: "courrier", projet: id } : params.get("nouveau") === "permis" ? { type: "permis", projet: id } : null));
  const [envoi, setEnvoi] = useState(false);
  /* 04/11 — « ?details=1 » ouvre le volet de détails d'emblée (recette de la promesse LORANI n° 42) */
  const [details, setDetails] = useState(() => params.get("details") === "1");
  const [onglet, setOngletProgres] = useState<"sante" | "etat" | "chefs" | "points">("sante");
  const [ouvertPoints, setOuvertPoints, menuPointsRef] = useMenu();
  const [ouvertPlus, setOuvertPlus, menuPlusRef] = useMenu();
  const [ouvertProp, setOuvertProp, menuPropRef] = useMenu();
  const [groupes, setGroupes] = useState(true);
  const [ouvertAff, setOuvertAff, menuAffRef] = useMenu();
  const [replies, setReplies] = useState<Record<string, boolean>>({});
  /* 02/11 : étoile (épingler), cloche (suivre), cases (sélection), Add new view — ./lor-local.ts */
  const favoris = useMarques("favoris");
  const suivis = useMarques("suivis");
  const reports = useReports();
  const selection = useSelection();
  const [ouvertVue, setOuvertVue, menuVueRef] = useMenu();

  const p = params.get("partie");
  const cle: Cle = estCle(p) ? p : "projet";
  const ong = ONGLETS.find((o) => o.cle === cle) ?? ONGLETS[0];
  const projet = dossier.projets.find((x) => x.id === id) ?? null;
  const lien = (c: Cle) => (c === "projet" ? chemin : `${chemin}?partie=${c}`);
  /* l'élément choisi dans une vue (un constat, un compte rendu…) s'ouvre dans le volet de droite */
  const { contexte, ouvert, setCible } = useVoletPage(`${id}/${cle}`);
  /* 04/11 — « ?choisi=constat:<id> » ouvre cet élément dans le volet (recette de la promesse LORANI n° 44) */
  const choisiUrl = params.get("choisi");
  const choisirVolet = contexte.choisir;
  useEffect(() => {
    if (choisiUrl) choisirVolet(choisiUrl);
  }, [choisiUrl, choisirVolet]);

  /* ⌘ I : le volet de détails, comme dans Linear */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setDetails((d) => !d);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  /* après une création : la page du projet ou du permis créé, dès que le dossier relu le contient */
  const aOuvrir = useRef<{ id: string; type: "projet" | "permis" } | null>(null);
  /* les parties de ProjetCarte montées cachées sous un onglet d'outil (voir `declencher`) */
  const cache = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = aOuvrir.current;
    if (!c) return;
    const la = c.type === "projet" ? dossier.projets.some((x) => x.id === c.id) : dossier.permis.some((x) => x.id === c.id);
    if (!la) return;
    aOuvrir.current = null;
    router.push(c.type === "projet" ? `${BASE}/projets/${c.id}` : `${BASE}/permis/${c.id}`);
  }, [dossier, router]);

  const formulaires = (
    <Formulaires
      form={form}
      fermer={() => setForm(null)}
      dossier={dossier}
      personnes={personnes}
      agir={agir}
      apres={(cree, type) => {
        aOuvrir.current = { id: cree, type };
      }}
      onEnvoi={setEnvoi}
    />
  );

  if (!projet) {
    return (
      <div className="lor lor-in">
        <h1 className="v2-sr">Projet</h1>
        <header className="lor-in-l1">
          <nav className="lor-in-fil" aria-label="Fil d'Ariane">
            <Link href={`${BASE}/projets`} className="lor-in-maillon">
              Projets
            </Link>
          </nav>
        </header>
        <p className="lor-in-absent" role={pret ? "alert" : "status"}>
          {pret ? (
            <>
              {erreur ? `La base n'a pas répondu : ${erreur} ` : "Ce projet n'est pas visible avec ce compte. "}
              <Link href={BASE}>Revenir aux permis</Link>
            </>
          ) : (
            "Lecture du projet…"
          )}
        </p>
        {formulaires}
      </div>
    );
  }

  const auj = jourIso();
  const gris = !peutEcrire || envoi;
  const nature = ICONE_NATURE[projet.nature] ?? ICONE_NATURE.autre;
  const permis = dossier.permis.filter((x) => x.projet_id === projet.id);
  const chefs = dossier.membres.filter((m) => m.projet_id === projet.id && m.role_projet === "chef_projet");
  const chef = chefs[0] ? nommer(chefs[0].user_id) : null;
  const prochaines = permis.map(prochaineDate).filter((d): d is string => !!d).sort();
  const cible = prochaines.find((d) => d >= auj) ?? prochaines[0] ?? null;
  const plu = dossier.plu.find((x) => x.projet_id === projet.id) ?? null;
  const crs = dossier.comptesRendus.filter((c) => c.projet_id === projet.id).sort((a, b) => b.visite_le.localeCompare(a.visite_le));
  const dernierCr = crs[0] ?? null;
  const pointsOuverts = dossier.points.filter((x) => x.projet_id === projet.id && x.statut === "ouvert").length;
  const terrain = [projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const resume = [projet.reference ? `Réf. ${projet.reference}` : null, terrain || null, projet.parcelles.length ? pluriel(projet.parcelles.length, "parcelle") + ` ${projet.parcelles.join(", ")}` : null].filter(Boolean).join(" · ");
  const territoire = projet.territoire ? (projet.territoire === "metropole" ? "Métropole" : projet.territoire) : null;

  /* 04/11 — « Points relevés — N » (promesse LORANI n° 42) : ce qui reste ouvert sur le projet, compté par type, avec les
     mêmes règles que les pages qui les portent (Contrôle : constats ouverts du dernier contrôle ; À viser : visas et
     situations à viser, réserves ouvertes ; Questions : questions non soldées). Posé dans les briques du volet de détails
     de l'Initiative de Linear : une rangée de Propriétés et un segment de la carte Avancement, pas d'onglet en plus. */
  const dernierControle = dossier.controles.filter((x) => x.projet_id === projet.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0] ?? null;
  const pointsReleves = [
    { cle: "constats", libelle: "Constats du contrôle", n: dernierControle ? dossier.constats.filter((k) => k.controle_id === dernierControle.id && k.statut === "ouvert").length : 0, toujours: true },
    { cle: "visas", libelle: "Visas", n: dossier.visas.filter((v) => v.projet_id === projet.id && v.avis === "a_viser").length, toujours: true },
    { cle: "situations", libelle: "Situations", n: dossier.situations.filter((x) => x.projet_id === projet.id && x.statut === "a_viser").length, toujours: false },
    { cle: "reserves", libelle: "Réserves", n: dossier.reserves.filter((r) => r.projet_id === projet.id && r.statut === "ouverte").length, toujours: false },
    { cle: "questions", libelle: "Questions", n: dossier.points.filter((x) => x.projet_id === projet.id && x.nature === "question" && x.statut !== "clos").length, toujours: true },
  ].filter((x) => x.toujours || x.n);
  const totalReleves = pointsReleves.reduce((t, x) => t + x.n, 0);

  /* le permis le plus pressé : celui dont la prochaine date est la plus proche */
  const presse = [...permis].filter((x) => prochaineDate(x)).sort((a, b) => (prochaineDate(a) ?? "").localeCompare(prochaineDate(b) ?? ""))[0] ?? permis[0];
  const santePresse: SanteLor = presse ? SANTE[familleDe(presse)] : "aucune";

  /* les pièces que le permis exigera (B24), pour la description */
  const exige = (() => {
    const b = bordereau(projet, dossier);
    if (!b) return null;
    return { total: b.pieces.length, manquantes: b.pieces.filter((x) => !x.fournie).length };
  })();

  const exporter = () => {
    try {
      const r = dossierDate(projet, dossier, nommer);
      telecharger(r.nom, r.octets, "application/zip");
      toast("Dossier daté exporté : registre PDF et Excel, dans une archive.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Le dossier daté n'a pas pu être fabriqué.", "rouge");
    }
  };
  const choisir = (c: Choix) => {
    if (c.exporter) exporter();
    else if (c.form) setForm(c.form);
  };
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Lien du projet copié");
    } catch {
      toast("La copie a été refusée par le navigateur.", "rouge");
    }
  };

  const choixPoints: Choix[] = [
    { cle: "permis", libelle: "Nouveau permis…", icone: <IconeSprite nom="Page" />, form: { type: "permis", projet: projet.id }, off: gris },
    { cle: "courrier", libelle: "Déposer un courrier de la mairie…", icone: <IconeSprite nom="Attachment" />, form: { type: "courrier", projet: projet.id }, off: gris },
    { cle: "exporter", libelle: "Exporter le dossier daté", icone: <IconeSprite nom="Folder" />, exporter: true },
    { cle: "nouveau", libelle: "Nouveau projet…", icone: <IconeSprite nom="Project" />, form: { type: "projet" }, off: gris, separe: true },
    { cle: "honoraires", libelle: "Honoraires et temps", icone: <IconeSprite nom="Euro" />, href: `${BASE}/honoraires?projet=${encodeURIComponent(projet.id)}` },
    { cle: "ancien", libelle: "Ouvrir l'écran d'avant", icone: <IconeSprite nom="Page" />, href: `${BASE}?ancien=1&projet=${encodeURIComponent(projet.id)}` },
  ];
  const choixPlus: Choix[] = [
    { cle: "permis", libelle: "Nouveau permis…", form: { type: "permis", projet: projet.id }, off: gris },
    { cle: "courrier", libelle: "Déposer un courrier de la mairie…", form: { type: "courrier", projet: projet.id }, off: gris },
    { cle: "membre", libelle: "Ajouter un membre à l'équipe…", form: { type: "membre", projet: projet.id }, off: gris },
    /* « Inviter l'équipe » : une personne sans compte s'invite depuis la page Équipe de l'espace (03/11/2026) */
    { cle: "inviter", libelle: "Inviter quelqu'un dans l'espace…", href: `${RACINE}/equipe` },
    { cle: "lot", libelle: "Ajouter un lot…", form: { type: "lot", projet: projet.id }, off: gris },
    { cle: "intervenant", libelle: "Ajouter un intervenant…", form: { type: "intervenant", projet: projet.id }, off: gris },
  ];

  /* ——— l'activité du projet, du plus récent au plus ancien ——— */
  const evenements: Evenement[] = [];
  evenements.push({ cle: "cree", quand: projet.cree_le, qui: "Lorani", quoi: "a ouvert le projet" });
  for (const x of permis) {
    const t = titrePermis(x, projet.nom);
    evenements.push({ cle: `pc-${x.id}`, quand: x.cree_le, qui: "Lorani", quoi: `a ouvert le permis ${t}` });
    if (x.date_depot) evenements.push({ cle: `dep-${x.id}`, quand: x.date_depot, qui: "Mairie", quoi: `a reçu le dossier ${t}` });
    if (x.decision && x.date_decision) evenements.push({ cle: `dec-${x.id}`, quand: x.date_decision, qui: "Mairie", quoi: `a rendu sa décision sur ${t}` });
  }
  for (const c of crs) evenements.push({ cle: `cr-${c.id}`, quand: c.diffuse_le ?? c.visite_le, qui: "Lorani", quoi: `${c.statut === "diffuse" ? "a diffusé" : "a préparé"} le compte rendu n° ${c.numero} (visite du ${plein(c.visite_le)})` });
  for (const c of dossier.controles.filter((x) => x.projet_id === projet.id)) evenements.push({ cle: `ct-${c.id}`, quand: c.lance_le ?? c.cree_le, qui: "Lorani", quoi: `a contrôlé « ${c.intitule} » (indice ${c.indice}) : ${pluriel(c.constats_nb ?? 0, "constat")}` });
  for (const x of dossier.pieces.filter((x) => x.objet_id === projet.id)) evenements.push({ cle: `pi-${x.id}`, quand: x.cree_le ?? projet.cree_le, qui: x.source === "courriel" ? "Guichet" : "Lorani", quoi: `a reçu ${x.nom_fichier}` });
  evenements.sort((a, b) => b.quand.localeCompare(a.quand));

  const registre = params.get("vue") === "registre";
  const lignesRegistre = cle === "activite" && registre ? lignesDossier(projet, dossier, nommer) : [];
  /* le chantier : la formule de révision de chaque marché (b5_34, lue avec le marché) et le bordereau des visas */
  const marchesProjet = dossier.marches.filter((m) => m.projet_id === projet.id && m.actif);
  const imprimerBordereau = () => {
    const b = bordereauVisas(projet, dossier);
    telecharger(b.nom, b.octets, "application/pdf");
    toast(`Bordereau des visas : ${pluriel(b.nombre, "document")}.`);
  };
  const permisTries = [...permis].sort((a, b) => (prochaineDate(a) ?? "9").localeCompare(prochaineDate(b) ?? "9"));
  const tableau = (
    <div className="lor-in-tableau" role="table" aria-label="Permis du projet">
      <div className="lor-in-grille lor-in-entetes" role="row">
        <span className="lor-in-c-titre" role="columnheader">
          <span className="lor-in-tri">Nom</span>
        </span>
        <span className="lor-in-c-sante" role="columnheader">
          <span className="lor-in-tri">Santé</span>
        </span>
        <span className="lor-in-c-prio" role="columnheader">
          <span className="lor-in-tri" data-trie="">
            Urgence
            <IconeTri />
          </span>
        </span>
        <span className="lor-in-c-chef lor-in-entete-fixe" role="columnheader">
          Chef
        </span>
        <span className="lor-in-c-date" role="columnheader">
          <span className="lor-in-tri">Prochaine date</span>
        </span>
        <span className="lor-in-c-statut" role="columnheader">
          <span className="lor-in-tri">Avancement</span>
        </span>
      </div>
      {(groupes ? FAMILLES : [{ cle: null as Famille | null, libelle: "" }]).map((f) => {
        const lignes = permisTries.filter((x) => !f.cle || familleDe(x) === f.cle);
        if (!lignes.length) return null;
        const cleG = f.cle ?? "tous";
        return (
          <div key={cleG} role="rowgroup">
            {f.cle ? (
              <div className="lor-in-groupe" role="row">
                <button type="button" className="lor-in-replier" aria-expanded={!replies[cleG]} aria-label={replies[cleG] ? "Déplier le groupe" : "Replier le groupe"} onClick={() => setReplies((r) => ({ ...r, [cleG]: !r[cleG] }))}>
                  <IconeLin nom="triangle" />
                </button>
                <h3>{f.libelle}</h3>
                <span className="lor-in-groupe-filet" aria-hidden="true" />
                {peutEcrire ? (
                  <span className="lor-in-groupe-plus">
                    <button type="button" className="lor-rond" aria-label="Nouveau permis" title="Nouveau permis" disabled={gris} onClick={() => setForm({ type: "permis", projet: projet.id })}>
                      <IconeLin nom="plusPetit" />
                    </button>
                  </span>
                ) : null}
              </div>
            ) : null}
            {replies[cleG]
              ? null
              : lignes.map((x) => {
                  const fam = familleDe(x);
                  const av = AVANCEMENT[x.etat] ?? { statut: "annule" as StatutLor, etapes: 4 };
                  const pd = prochaineDate(x);
                  const ecart = pd ? Math.round((midi(pd).getTime() - midi(auj).getTime()) / 86_400_000) : null;
                  const urg: 0 | 1 | 2 | 3 | 4 = ecart === null ? 0 : ecart < 0 ? 1 : ecart <= 7 ? 2 : ecart <= 30 ? 3 : 4;
                  const n = proposeesPar[x.id] ?? 0;
                  return (
                    <Link
                      key={x.id}
                      href={`${BASE}/permis/${encodeURIComponent(x.id)}`}
                      className="lor-in-grille lor-in-ligne"
                      role="row"
                      data-coche={selection.a(`permis:${x.id}`) ? "" : undefined}
                      onKeyDown={(e) => {
                        if (e.key === "x" && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault();
                          selection.basculer(`permis:${x.id}`);
                        }
                      }}
                    >
                      <span
                        className="lor-in-c-case"
                        role="checkbox"
                        aria-checked={selection.a(`permis:${x.id}`)}
                        aria-label="Sélectionner"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selection.basculer(`permis:${x.id}`);
                        }}
                      >
                        <span className="lor-in-case lor-coche" aria-checked={selection.a(`permis:${x.id}`)} />
                      </span>
                      <span className="lor-in-c-titre lor-in-nom" role="cell">
                        <span className="lor-in-icone-ligne" aria-hidden="true">
                          <IconeSprite nom={nature.nom} couleur={nature.couleur} />
                        </span>
                        <span className="lor-in-nom-texte">{titrePermis(x, projet.nom)}</span>
                        {n ? <span className="lor-in-nombre" title={`${pluriel(n, "date lue", "dates lues")} à confirmer`}>{n}</span> : null}
                      </span>
                      <span className="lor-in-c-sante" role="cell">
                        <span className="lor-in-rond-cell" title={`${FAMILLES.find((g) => g.cle === fam)?.libelle} · ${ETATS[x.etat]?.libelle ?? x.etat}`}>
                          <IconeSanteLor etat={SANTE[fam]} />
                        </span>
                      </span>
                      <span className="lor-in-c-prio" role="cell">
                        <span className="lor-in-rond-cell">
                          <IconePrioriteLor niveau={urg} />
                        </span>
                      </span>
                      <span className="lor-in-c-chef" role="cell">
                        {chef ? <Avatar nom={chef} taille={16} /> : <IconeSansResponsable />}
                      </span>
                      <span className="lor-in-c-date" role="cell">
                        {pd ? (
                          <span className="lor-in-date" title={plein(pd)}>
                            <IconeCalendrierLor passe={pd < auj} />
                            <span>{court(pd)}</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="lor-in-c-statut" role="cell">
                        <span className="lor-in-statut" title={`${ETATS[x.etat]?.libelle ?? x.etat} · ${av.etapes} étape${av.etapes > 1 ? "s" : ""} sur 7`}>
                          <IconeStatutLor statut={av.statut} part={av.etapes / 7} />
                          <span>{Math.round((100 * av.etapes) / 7)} %</span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
          </div>
        );
      })}
      {!permis.length ? <p className="lor-in-vide">Aucun permis pour ce projet : saisissez-le, ou déposez le récépissé de la mairie pour qu&apos;il soit lu.</p> : null}
    </div>
  );

  /* ——— le volet de détails (⌘ I) : Propriétés, Avancement, Activité ——— */
  const repartition: { cle: string; libelle: string; icone: React.ReactNode; n: number }[] =
    onglet === "sante"
      ? FAMILLES.map((f) => ({ cle: f.cle, libelle: f.libelle, icone: <IconeSanteLor etat={SANTE[f.cle]} />, n: permis.filter((x) => familleDe(x) === f.cle).length })).filter((l) => l.n)
      : onglet === "etat"
        ? [...new Set(permis.map((x) => x.etat))].map((e) => ({ cle: e, libelle: ETATS[e]?.libelle ?? e, icone: <IconeStatutLor statut={AVANCEMENT[e]?.statut ?? "annule"} part={(AVANCEMENT[e]?.etapes ?? 4) / 7} />, n: permis.filter((x) => x.etat === e).length }))
        : onglet === "points"
          ? pointsReleves.map((x) => ({ cle: x.cle, libelle: x.libelle, icone: <IconeSprite nom="Label" />, n: x.n }))
        : chefs.length
          ? chefs.map((m) => ({ cle: m.id, libelle: nommer(m.user_id), icone: <Avatar nom={nommer(m.user_id)} taille={16} />, n: permis.length }))
          : [{ cle: "aucun", libelle: "Aucun chef de projet", icone: <IconeSansResponsable />, n: permis.length }];
  const voletDetails = (
    <>
      <div className="lor-in-carte">
        <div className="lor-in-carte-tete">
          <span>Propriétés</span>
          <IconeLin nom="chevronBas" />
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Nature</span>
          <span className="lor-in-rangee-valeur">
            <IconeSprite nom={nature.nom} couleur={nature.couleur} />
            {NATURES_PROJET[projet.nature]}
          </span>
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Phase</span>
          <span className="lor-in-rangee-valeur">{PHASES[projet.phase]}</span>
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Chef de projet</span>
          <button type="button" className="lor-in-rangee-valeur" data-vide={chef ? undefined : ""} disabled={gris} onClick={() => setForm({ type: "membre", projet: projet.id })}>
            {chef ? <Avatar nom={chef} /> : <IconeSansResponsable />}
            {chef ?? "Nommer un chef de projet"}
          </button>
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Prochaine date</span>
          <span className="lor-in-rangee-valeur" data-vide={cible ? undefined : ""}>
            <IconeCalendrierLor passe={!!cible && cible < auj} />
            {cible ? court(cible) : "Aucune"}
          </span>
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Étiquettes</span>
          <span className="lor-in-rangee-valeur" data-vide={projet.marche_public || territoire ? undefined : ""}>
            <IconeSprite nom="Label" />
            {[projet.marche_public ? "Marché public" : null, territoire ?? "Territoire inconnu"].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="lor-in-rangee">
          <span className="lor-in-rangee-libelle">Points relevés</span>
          <button type="button" className="lor-in-rangee-valeur" data-vide={totalReleves ? undefined : ""} title={pointsReleves.map((x) => `${x.libelle} : ${x.n}`).join(" · ")} onClick={() => setOngletProgres("points")}>
            <IconeSprite nom="Comment" />
            {`${totalReleves} · ${pointsReleves.map((x) => `${x.libelle.toLowerCase()} ${x.n}`).join(", ")}`}
          </button>
        </div>
      </div>
      <div className="lor-in-carte">
        <div className="lor-in-carte-tete">
          <span>Avancement</span>
          <IconeLin nom="chevronBas" />
        </div>
        <div className="lor-in-segments" role="tablist" aria-label="Répartition des permis">
          {(
            [
              ["sante", "Santé"],
              ["etat", "État"],
              ["chefs", "Chefs"],
              ["points", "Points"],
            ] as const
          ).map(([c, l]) => (
            <button key={c} type="button" role="tab" aria-selected={onglet === c} className="lor-in-segment" onClick={() => setOngletProgres(c)}>
              {l}
            </button>
          ))}
        </div>
        <div className="lor-in-repartition" role="tabpanel">
          {repartition.length ? (
            repartition.map((l) => (
              <div key={l.cle} className="lor-in-repart">
                {l.icone}
                <span className="lor-in-repart-libelle">{l.libelle}</span>
                <span className="lor-in-repart-n">{l.n}</span>
              </div>
            ))
          ) : (
            <p className="lor-in-vide">Aucun permis.</p>
          )}
        </div>
      </div>
      <div className="lor-in-carte">
        <div className="lor-in-carte-tete">
          <span>Activité</span>
          <IconeLin nom="chevronBas" />
          <Link href={lien("activite")} className="lor-in-voir">
            Tout voir
          </Link>
        </div>
        <ul className="lor-in-ev-petits">
          {evenements.slice(0, 3).map((e) => (
            <li key={e.cle}>
              <span className="lor-in-ev-qui">{e.qui}</span> {e.quoi} · {court(e.quand)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  /* 04/11 — chaque onglet du dossier a sa tête, au dessin de la Vue d'ensemble (Teo : « elles sont toutes
     les mêmes, le design est mal fait ; pas comme la vue d'ensemble, qui est propre ») : une tuile, le
     titre de l'onglet, une phrase qui dit où en est le sujet, et ses propriétés en pilules */
  type Pil = { icone: React.ComponentProps<typeof IconeSprite>["nom"]; texte: string; titre?: string; vide?: boolean };
  const tete = ((): { icone: Pil["icone"]; couleur: string; resume: string; pilules: Pil[] } | null => {
    const de = <T extends { projet_id: string }>(xs: T[]) => xs.filter((x) => x.projet_id === projet.id);
    if (cle === "equipe") {
      const membres = de(dossier.membres);
      const lots = de(dossier.lots);
      const inter = de(dossier.intervenants);
      return {
        icone: "Members",
        couleur: "#5e6ad2",
        resume: `${chef ? `${chef} mène le projet` : "Pas encore de chef de projet"} · ${pluriel(membres.length, "membre")} de l'agence, ${pluriel(inter.length, "intervenant")} extérieur${inter.length > 1 ? "s" : ""}, ${pluriel(lots.length, "lot")}.`,
        pilules: [
          { icone: "ProjectLead", texte: chef ?? "Chef de projet", vide: !chef, titre: "Chef de projet : il reçoit les rappels" },
          { icone: "Users", texte: pluriel(membres.length, "membre") },
          { icone: "Team", texte: pluriel(inter.length, "intervenant") },
          { icone: "Checklist", texte: pluriel(lots.length, "lot") },
        ],
      };
    }
    if (cle === "urbanisme") {
      return {
        icone: "Page",
        couleur: "#26b5ce",
        resume: plu?.zone
          ? `Zone ${plu.zone}${plu.document?.titre ? ` du ${plu.document.titre}` : ""}.${exige ? (exige.manquantes === exige.total ? ` Aucune des ${exige.total} pièces du permis n'est encore déposée.` : ` ${exige.total - exige.manquantes} pièce${exige.total - exige.manquantes > 1 ? "s" : ""} sur ${exige.total} déposée${exige.total - exige.manquantes > 1 ? "s" : ""} pour le permis.`) : ""}`
          : "Les règles d'urbanisme de la parcelle ne sont pas encore lues.",
        pilules: [
          { icone: "Label", texte: plu?.zone ? `Zone ${plu.zone}` : "Zone inconnue", vide: !plu?.zone },
          { icone: "Attachment", texte: exige ? `${exige.total - exige.manquantes}/${exige.total} pièces` : "Pièces exigées", vide: !exige },
          ...(territoire ? [{ icone: "Project" as const, texte: territoire }] : []),
        ],
      };
    }
    if (cle === "controle") {
      const ctrl = de(dossier.controles);
      const ids = new Set(ctrl.map((c) => c.id));
      const constats = dossier.constats.filter((c) => ids.has(c.controle_id));
      const ouverts = constats.filter((c) => c.statut === "ouvert").length;
      return {
        icone: "Shield",
        couleur: "#4cb782",
        resume: ctrl.length
          ? `${pluriel(ctrl.length, "contrôle")} du dossier · ${ouverts ? `${pluriel(ouverts, "constat")} encore ouvert${ouverts > 1 ? "s" : ""}` : "aucun constat ouvert"} sur ${constats.length}.`
          : "Aucun contrôle : déposez les pièces du dossier, Lorani les relit (PLU, CCTP et DPGF, RE2020, accessibilité, incendie).",
        pilules: [
          { icone: "Shield", texte: ctrl.length ? pluriel(ctrl.length, "contrôle") : "Aucun contrôle", vide: !ctrl.length },
          { icone: "Judge", texte: ouverts ? `${pluriel(ouverts, "constat")} ouvert${ouverts > 1 ? "s" : ""}` : "Aucun constat ouvert", vide: !ouverts },
        ],
      };
    }
    if (cle === "consultation") {
      const cons = de(dossier.consultations);
      const offres = de(dossier.offres);
      const ouvertes = cons.filter((c) => c.statut === "ouverte" || c.statut === "analysee").length;
      const attribuees = cons.filter((c) => c.statut === "attribuee").length;
      return {
        icone: "Euro",
        couleur: "#f2994a",
        resume: cons.length
          ? `${pluriel(cons.length, "consultation")} · ${offres.length ? pluriel(offres.length, "offre reçue", "offres reçues") : "aucune offre reçue"}, ${attribuees ? pluriel(attribuees, "lot attribué", "lots attribués") : "aucun lot attribué pour l'instant"}.`
          : "Aucune consultation : lancez celle d'un lot pour recevoir et comparer les offres des entreprises.",
        pilules: [
          { icone: "Spreadsheet", texte: ouvertes ? `${pluriel(ouvertes, "consultation")} en cours` : "Aucune en cours", vide: !ouvertes },
          { icone: "Email", texte: offres.length ? pluriel(offres.length, "offre") : "Aucune offre", vide: !offres.length },
          { icone: "Signature", texte: attribuees ? pluriel(attribuees, "lot attribué", "lots attribués") : "Aucun lot attribué", vide: !attribuees },
        ],
      };
    }
    if (cle === "chantier") {
      const situations = de(dossier.situations).filter((x) => x.statut === "a_viser").length;
      const crs = de(dossier.comptesRendus);
      return {
        icone: "ConstructionBarrier",
        couleur: "#d28f19",
        resume: marchesProjet.length
          ? `${pluriel(marchesProjet.length, "marché")} de travaux · ${situations ? `${pluriel(situations, "situation")} à viser` : "aucune situation à viser"}, ${pluriel(crs.length, "compte rendu", "comptes rendus")}, ${pluriel(pointsOuverts, "point")} en suspens.`
          : `Pas encore de marché de travaux${crs.length ? ` · ${pluriel(crs.length, "compte rendu", "comptes rendus")}` : ""}${pointsOuverts ? `, ${pluriel(pointsOuverts, "point")} en suspens` : ""}.`,
        pilules: [
          { icone: "Spreadsheet", texte: marchesProjet.length ? pluriel(marchesProjet.length, "marché") : "Aucun marché", vide: !marchesProjet.length },
          { icone: "Stopwatch", texte: situations ? `${pluriel(situations, "situation")} à viser` : "Rien à viser", vide: !situations },
          { icone: "Write", texte: crs.length ? pluriel(crs.length, "compte rendu", "comptes rendus") : "Aucun compte rendu", vide: !crs.length },
          { icone: "Comment", texte: pointsOuverts ? `${pluriel(pointsOuverts, "point")} en suspens` : "Aucun point en suspens", vide: !pointsOuverts },
        ],
      };
    }
    if (cle === "reception") {
      const reserves = de(dossier.reserves);
      const nonLevees = reserves.filter((r) => r.statut !== "levee").length;
      const doe = de(dossier.doe).filter((d) => d.statut !== "sans_objet");
      const recus = doe.filter((d) => d.statut === "recu").length;
      return {
        icone: "Signature",
        couleur: "#4cb782",
        resume: `${projet.reception_le ? `Réception prononcée le ${plein(projet.reception_le)}` : "Réception pas encore prononcée"} · ${reserves.length ? `${pluriel(nonLevees, "réserve")} non levée${nonLevees > 1 ? "s" : ""} sur ${reserves.length}` : "aucune réserve"}, ${doe.length ? `DOE ${recus}/${doe.length} pièces reçues` : "DOE à préparer"}.`,
        pilules: [
          { icone: "Calendar", texte: projet.reception_le ? court(projet.reception_le) : "Date de réception", vide: !projet.reception_le },
          { icone: "Judge", texte: nonLevees ? `${pluriel(nonLevees, "réserve")} à lever` : "Aucune réserve à lever", vide: !nonLevees },
          { icone: "Folder", texte: doe.length ? `DOE ${recus}/${doe.length}` : "DOE", vide: !doe.length },
        ],
      };
    }
    if (cle === "assurances") {
      const att = de(dossier.attestations);
      const conformes = att.filter((a) => a.statut === "conforme").length;
      const aVoir = att.filter((a) => a.statut === "a_verifier").length;
      const ko = att.filter((a) => a.statut === "non_conforme" || a.statut === "expiree").length;
      return {
        icone: "Policy",
        couleur: "#5e6ad2",
        resume: att.length
          ? `${pluriel(att.length, "attestation")} · ${conformes} conforme${conformes > 1 ? "s" : ""}${aVoir ? `, ${aVoir} à vérifier` : ""}${ko ? `, ${ko} non conforme${ko > 1 ? "s" : ""} ou expirée${ko > 1 ? "s" : ""}` : ""}.`
          : "Aucune attestation : demandez la décennale et la RC de chaque entreprise avant l'ouverture du chantier.",
        pilules: [
          { icone: "Shield", texte: conformes ? `${conformes} conforme${conformes > 1 ? "s" : ""}` : "Aucune conforme", vide: !conformes },
          { icone: "ClockOutline", texte: aVoir ? `${aVoir} à vérifier` : "Rien à vérifier", vide: !aVoir },
          { icone: "Stopwatch", texte: ko ? `${ko} à reprendre` : "Rien à reprendre", vide: !ko },
        ],
      };
    }
    return null;
  })();
  const ongletCourant = ONGLETS.find((o) => o.cle === cle);

  /* 04/11 — les onglets refaits en vraies pages d'outil (./OngletOutil, gabarit d'Honoraires) : leurs
     listes, et les gestes des parties de ProjetCarte, montées cachées (`cache`), qu'un bouton déclenche */
  const declencher = (libelle: string) => {
    const b = [...(cache.current?.querySelectorAll("button") ?? [])].find((x) => (x.textContent ?? "").trim().startsWith(libelle));
    if (!b) return toast(`« ${libelle} » n'est pas possible pour l'instant.`);
    if (b.disabled) return toast(peutEcrire ? `« ${libelle} » n'est pas possible pour l'instant.` : "Lecture seule : ce geste demande un compte qui peut écrire.");
    b.click();
  };
  const listeParam = params.get("liste");
  const lienListe = (l: string) => `${chemin}?partie=${cle}&liste=${l}`;
  const lotDe = (lotId: string | null) => {
    const l = lotId ? dossier.lots.find((x) => x.id === lotId) : null;
    return l ? `Lot ${l.numero} · ${l.intitule}` : "Tout le projet";
  };
  const vide = (t: string) => <span className="lor-at-discret">{t}</span>;
  const outil = ((): { listes: Liste[]; resume: string; avis: string | null } | null => {
    const de = <T extends { projet_id: string }>(xs: T[]) => xs.filter((x) => x.projet_id === projet.id);
    if (cle === "reception") {
      const reserves = de(dossier.reserves).sort((a, b) => a.numero - b.numero);
      const nonLevees = reserves.filter((r) => r.statut !== "levee").length;
      const doe = de(dossier.doe);
      const recus = doe.filter((d) => d.statut === "recu").length;
      const NATURE_DOE: Record<(typeof doe)[number]["nature"], string> = { plans: "Plans conformes", notices: "Notices", fiches: "Fiches techniques", pv_essais: "PV d'essais", garanties: "Garanties", diuo: "DIUO", autre: "Autre" };
      const finGpa = projet.reception_le ? (() => { const d = midi(projet.reception_le!); d.setUTCFullYear(d.getUTCFullYear() + 1); return d.toISOString().slice(0, 10); })() : null;
      return {
        resume: `${projet.reception_le ? `Réception prononcée le ${plein(projet.reception_le)}` : "Réception pas encore prononcée"} · ${reserves.length ? `${pluriel(nonLevees, "réserve")} non levée${nonLevees > 1 ? "s" : ""} sur ${reserves.length}` : "aucune réserve"} · ${doe.length ? `DOE : ${recus} pièce${recus > 1 ? "s" : ""} reçue${recus > 1 ? "s" : ""} sur ${doe.length}` : "DOE à préparer"}`,
        avis: finGpa ? `Garantie de parfait achèvement jusqu'au ${plein(finGpa)}` : null,
        listes: [
          {
            cle: "reserves",
            libelle: "Réserves",
            tri: "numéro",
            vide: projet.reception_le ? "Aucune réserve : la réception est prononcée sans réserve." : "Aucune réserve. Elles se constatent aux opérations préalables, à la réception, puis pendant l'année de parfait achèvement.",
            pied: reserves.length ? `${pluriel(reserves.length, "réserve")} · ${nonLevees} à lever` : undefined,
            colonnes: [
              { libelle: "N°", largeur: "72px" },
              { libelle: "Réserve", largeur: "minmax(240px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(150px, 220px)" },
              { libelle: "Localisation", largeur: "minmax(130px, 190px)" },
              { libelle: "Constatée", largeur: "104px" },
              { libelle: "À lever avant", largeur: "120px" },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: reserves.map((r) => {
              const retard = r.statut === "ouverte" && !!r.lever_avant && r.lever_avant < auj;
              return {
                id: r.id,
                cle: `reserve:${r.id}`,
                cellules: [
                  <span key="n" className="lor-at-mono">n° {r.numero}</span>,
                  <span key="t" className="lor-at-cell-texte">{r.intitule}</span>,
                  <span key="l" className="lor-at-cell-texte">{lotDe(r.lot_id)}</span>,
                  r.localisation ? <span key="o" className="lor-at-cell-texte">{r.localisation}</span> : vide("—"),
                  court(r.constatee_le),
                  r.lever_avant ? court(r.lever_avant) : vide("—"),
                  r.statut === "levee" ? <Etat key="e" teinte="vert">Levée{r.levee_le ? ` le ${court(r.levee_le)}` : ""}</Etat> : r.statut === "contestee" ? <Etat key="e" teinte="gris">Contestée</Etat> : retard ? <Etat key="e" teinte="rouge">En retard</Etat> : <Etat key="e" teinte="bleu">Ouverte</Etat>,
                ],
              };
            }),
            gestes: [
              { libelle: "Nouvelle réserve", desactive: gris },
              { libelle: projet.reception_le ? "Date de réception" : "Prononcer la réception", principal: true, desactive: gris },
            ],
          },
          {
            cle: "doe",
            libelle: "DOE",
            tri: "lot",
            vide: "Pas encore de liste : Lorani prépare la liste type (plans conformes, notices, fiches techniques, PV d'essais, garanties) pour chaque lot, et le DIUO du projet.",
            pied: doe.length ? `${pluriel(doe.length, "pièce")} · ${recus} reçue${recus > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Pièce", largeur: "minmax(240px, 1fr)" },
              { libelle: "Nature", largeur: "170px" },
              { libelle: "Lot", largeur: "220px" },
              { libelle: "Reçue le", largeur: "120px" },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: doe
              .slice()
              .sort((a, b) => (a.lot_id ?? "").localeCompare(b.lot_id ?? "") || a.intitule.localeCompare(b.intitule, "fr"))
              .map((d) => ({
                id: d.id,
                cle: `doe:${d.id}`,
                cellules: [
                  <span key="t" className="lor-at-cell-texte">{d.intitule}</span>,
                  NATURE_DOE[d.nature],
                  <span key="l" className="lor-at-cell-texte">{lotDe(d.lot_id)}</span>,
                  d.recu_le ? court(d.recu_le) : vide("—"),
                  d.statut === "recu" ? <Etat key="e" teinte="vert">Reçue</Etat> : d.statut === "sans_objet" ? <Etat key="e" teinte="gris">Sans objet</Etat> : <Etat key="e" teinte="bleu">Attendue</Etat>,
                ],
              })),
            gestes: [
              ...(doe.some((d) => d.statut === "attendu") ? [{ libelle: "Demander les pièces manquantes", desactive: gris }] : []),
              { libelle: doe.length ? "Compléter la liste" : "Préparer la liste", principal: true, desactive: gris || !dossier.lots.some((l) => l.projet_id === projet.id) },
            ],
          },
        ],
      };
    }
    const euros = (n: number | null | undefined) => (n === null || n === undefined ? vide("—") : `${Math.round(n).toLocaleString("fr-FR")} €`);
    const resume = tete?.resume ?? "";
    if (cle === "equipe") {
      const inter = de(dossier.intervenants).filter((i) => i.actif);
      const membres = de(dossier.membres);
      const lots = de(dossier.lots).sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true }));
      const titulaire = (lotId: string) => dossier.marches.find((m) => m.lot_id === lotId && m.actif)?.titulaire ?? inter.find((i) => i.lot_id === lotId)?.organisme ?? null;
      return {
        resume,
        avis: chefs.length ? `Les rappels partent à ${chefs.map((m) => nommer(m.user_id)).join(", ")}` : "Personne ne reçoit les rappels : nommez un chef de projet",
        listes: [
          {
            cle: "intervenants",
            libelle: "Intervenants",
            tri: "rôle",
            vide: "Aucun intervenant : ajoutez le maître d'ouvrage, le bureau de contrôle, les entreprises…",
            pied: inter.length ? pluriel(inter.length, "intervenant") : undefined,
            colonnes: [
              { libelle: "Organisme", largeur: "minmax(220px, 1fr)" },
              { libelle: "Rôle", largeur: "minmax(160px, 220px)" },
              { libelle: "Contact", largeur: "minmax(140px, 200px)" },
              { libelle: "Courriel ou téléphone", largeur: "minmax(160px, 240px)" },
              { libelle: "Lot", largeur: "minmax(140px, 200px)" },
            ],
            rangs: inter
              .slice()
              .sort((a, b) => NATURES_INTERVENANT[a.nature].localeCompare(NATURES_INTERVENANT[b.nature], "fr") || a.organisme.localeCompare(b.organisme, "fr"))
              .map((i) => ({
                id: i.id,
                cle: `intervenant:${i.id}`,
                cellules: [
                  <span key="o" className="lor-at-cell-texte">{i.organisme}</span>,
                  <span key="r" className="lor-at-cell-texte">{NATURES_INTERVENANT[i.nature]}</span>,
                  i.contact ? <span key="c" className="lor-at-cell-texte">{i.contact}</span> : vide("—"),
                  i.email || i.telephone ? <span key="m" className="lor-at-cell-texte">{i.email ?? i.telephone}</span> : vide("—"),
                  <span key="l" className="lor-at-cell-texte">{lotDe(i.lot_id)}</span>,
                ],
              })),
            gestes: [{ libelle: "Ajouter un intervenant", principal: true, desactive: gris }],
          },
          {
            cle: "agence",
            libelle: "Agence",
            tri: "rôle",
            vide: "Personne de l'agence sur ce projet : ajoutez au moins le chef de projet, qui reçoit les rappels.",
            pied: membres.length ? pluriel(membres.length, "membre") : undefined,
            colonnes: [
              { libelle: "Membre", largeur: "minmax(240px, 1fr)" },
              { libelle: "Rôle sur le projet", largeur: "minmax(200px, 320px)" },
            ],
            rangs: membres.map((m) => ({
              id: m.id,
              cle: `membre:${m.id}`,
              cellules: [<span key="n" className="lor-at-cell-texte">{nommer(m.user_id)}</span>, ROLES_PROJET[m.role_projet]],
            })),
            gestes: [{ libelle: "Ajouter un membre", principal: true, desactive: gris }],
          },
          {
            cle: "lots",
            libelle: "Lots",
            tri: "numéro",
            vide: "Aucun lot : découpez le projet en lots pour suivre entreprises, marchés et assurances.",
            pied: lots.length ? pluriel(lots.length, "lot") : undefined,
            colonnes: [
              { libelle: "N°", largeur: "72px" },
              { libelle: "Lot", largeur: "minmax(220px, 1fr)" },
              { libelle: "Entreprise", largeur: "minmax(160px, 240px)" },
              { libelle: "Activités requises", largeur: "minmax(160px, 300px)" },
            ],
            rangs: lots.map((l) => ({
              id: l.id,
              cle: `lot:${l.id}`,
              cellules: [
                <span key="n" className="lor-at-mono">{l.numero}</span>,
                <span key="i" className="lor-at-cell-texte">{l.intitule}</span>,
                titulaire(l.id) ? <span key="t" className="lor-at-cell-texte">{titulaire(l.id)}</span> : vide("Pas encore désignée"),
                l.activites_requises.length ? <span key="a" className="lor-at-cell-texte">{l.activites_requises.join(", ")}</span> : vide("—"),
              ],
            })),
            gestes: [{ libelle: "Ajouter un lot", principal: true, desactive: gris }],
          },
        ],
      };
    }
    if (cle === "urbanisme") {
      const b = bordereau(projet, dossier);
      const regles = plu
        ? [
            ...plu.zones.map((z, i) => ({ id: `z${i}`, type: "Zone", libelle: z.libelle ?? "—", detail: z.libelong ?? z.typezone ?? "" })),
            ...(plu.servitudes ?? []).map((x, i) => ({ id: `s${i}`, type: "Servitude", libelle: x.nom ?? x.libelle_categorie, detail: x.libelle_categorie })),
            ...plu.prescriptions.map((x, i) => ({ id: `p${i}`, type: "Prescription", libelle: x.libelle ?? "—", detail: x.typepsc ? `Type ${x.typepsc}${x.stypepsc ? `.${x.stypepsc}` : ""}` : "" })),
          ]
        : [];
      return {
        resume,
        avis: plu?.document?.titre ? `${plu.document.titre}${plu.point_libelle ? ` · ${plu.point_libelle}` : ""}` : null,
        listes: [
          {
            cle: "pieces",
            libelle: "Pièces exigées",
            tri: "code du Cerfa",
            vide: "Pas de bordereau : il se calcule pour un permis de construire (PC ou PCMI).",
            pied: b ? `${pluriel(b.pieces.length, "pièce")} · ${((n) => (n ? `${n} déposée${n > 1 ? "s" : ""}` : "aucune déposée"))(b.pieces.filter((x) => x.fournie).length)}` : undefined,
            colonnes: [
              { libelle: "Code", largeur: "90px" },
              { libelle: "Pièce", largeur: "minmax(260px, 1fr)" },
              { libelle: "Article", largeur: "minmax(130px, 170px)" },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: (b?.pieces ?? []).map((x) => ({
              id: x.code,
              cellules: [
                <span key="c" className="lor-at-mono">{x.code}</span>,
                <span key="l" className="lor-at-cell-texte" title={x.motif ?? undefined}>{x.libelle}</span>,
                <span key="a" className="lor-at-discret">{x.article}</span>,
                x.fournie ? <Etat key="e" teinte="vert">Déposée</Etat> : x.a_confirmer ? <Etat key="e" teinte="gris">À confirmer</Etat> : x.demandee ? <Etat key="e" teinte="bleu">Demandée</Etat> : <Etat key="e" teinte="bleu">À déposer</Etat>,
              ],
            })),
            gestes: [],
          },
          {
            cle: "regles",
            libelle: "Règles du PLU",
            tri: "type",
            vide: plu ? "Aucune règle trouvée à cette adresse." : "Les règles d'urbanisme ne sont pas encore cherchées.",
            pied: regles.length ? pluriel(regles.length, "règle") : undefined,
            colonnes: [
              { libelle: "Type", largeur: "140px" },
              { libelle: "Règle", largeur: "minmax(240px, 1fr)" },
              { libelle: "Détail", largeur: "minmax(160px, 320px)" },
            ],
            rangs: regles.map((r) => ({ id: r.id, cellules: [r.type, <span key="l" className="lor-at-cell-texte">{r.libelle}</span>, r.detail ? <span key="d" className="lor-at-cell-texte lor-at-discret">{r.detail}</span> : vide("—")] })),
            gestes: [
              ...(plu?.reglement_url ? [{ libelle: "Règlement de la zone", faire: () => window.open(plu.reglement_url!, "_blank", "noopener") }] : []),
              { libelle: "Chercher à nouveau", principal: true, desactive: gris },
            ],
          },
        ],
      };
    }
    if (cle === "controle") {
      const ctrl = de(dossier.controles).sort((a, b) => b.cree_le.localeCompare(a.cree_le));
      const ids = new Map(ctrl.map((c) => [c.id, c]));
      const constats = dossier.constats.filter((c) => ids.has(c.controle_id));
      const NATURE_CONSTAT: Record<(typeof constats)[number]["nature"], string> = { incoherence: "Incohérence", plu: "PLU", cctp_dpgf: "CCTP / DPGF", metre_dpgf: "Métré / DPGF", re2020: "RE2020", accessibilite: "Accessibilité", securite_incendie: "Sécurité incendie" };
      const GRAVITE: Record<(typeof constats)[number]["gravite"], string> = { bloquant: "Bloquant", majeur: "Majeur", mineur: "Mineur" };
      const gestesCtrl = [{ libelle: "Régler les contrôles", desactive: gris }, { libelle: "Nouveau contrôle", principal: true, desactive: gris }];
      return {
        resume,
        avis: null,
        listes: [
          {
            cle: "controles",
            libelle: "Contrôles",
            tri: "date",
            vide: "Aucun contrôle : choisissez les pièces à croiser (planches entre elles, contre le règlement du PLU, CCTP contre DPGF).",
            pied: ctrl.length ? pluriel(ctrl.length, "contrôle") : undefined,
            colonnes: [
              { libelle: "Contrôle", largeur: "minmax(240px, 1fr)" },
              { libelle: "Indice", largeur: "90px" },
              { libelle: "Lancé le", largeur: "120px" },
              { libelle: "Constats", largeur: "100px", droite: true },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: ctrl.map((c) => ({
              id: c.id,
              cle: `controle:${c.id}`,
              cellules: [
                <span key="t" className="lor-at-cell-texte">{c.intitule}</span>,
                <span key="i" className="lor-at-mono">{c.indice}</span>,
                c.lance_le ? court(c.lance_le) : vide("—"),
                c.constats_nb,
                c.statut === "clos" ? <Etat key="e" teinte="gris">Clos</Etat> : c.statut === "controle" ? <Etat key="e" teinte="vert">Contrôlé</Etat> : <Etat key="e" teinte="bleu">En lecture</Etat>,
              ],
            })),
            gestes: gestesCtrl,
          },
          {
            cle: "constats",
            libelle: "Constats",
            tri: "gravité",
            vide: "Aucun constat : ils apparaissent quand Lorani a relu les pièces d'un contrôle.",
            pied: constats.length ? `${pluriel(constats.length, "constat")} · ${constats.filter((c) => c.statut === "ouvert").length} ouvert${constats.filter((c) => c.statut === "ouvert").length > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Constat", largeur: "minmax(240px, 1fr)" },
              { libelle: "Nature", largeur: "150px" },
              { libelle: "Gravité", largeur: "100px" },
              { libelle: "Contrôle", largeur: "minmax(140px, 220px)" },
              { libelle: "État", largeur: "140px" },
            ],
            rangs: constats
              .slice()
              .sort((a, b) => ["bloquant", "majeur", "mineur"].indexOf(a.gravite) - ["bloquant", "majeur", "mineur"].indexOf(b.gravite))
              .map((c) => ({
                id: c.id,
                cle: `constat:${c.id}`,
                cellules: [
                  <span key="t" className="lor-at-cell-texte">{c.titre}</span>,
                  NATURE_CONSTAT[c.nature],
                  GRAVITE[c.gravite],
                  <span key="c" className="lor-at-cell-texte lor-at-discret">{ids.get(c.controle_id)?.intitule ?? "—"}</span>,
                  c.statut === "ouvert" ? <Etat key="e" teinte="bleu">Ouvert</Etat> : c.statut === "ecarte" ? <Etat key="e" teinte="gris">Écarté</Etat> : <Etat key="e" teinte="vert">{c.statut === "corrige" ? "Corrigé" : "Accepté"}</Etat>,
                ],
              })),
            gestes: gestesCtrl,
          },
        ],
      };
    }
    if (cle === "consultation") {
      const cons = de(dossier.consultations);
      const offres = de(dossier.offres);
      const consDe = new Map(cons.map((c) => [c.id, c]));
      return {
        resume,
        avis: null,
        listes: [
          {
            cle: "offres",
            libelle: "Offres",
            tri: "rang",
            vide: "Aucune offre : déposez chaque offre comme « Offre d'une entreprise » (PDF ou Excel), Lorani la lit et l'aligne sur la DPGF.",
            pied: offres.length ? pluriel(offres.length, "offre") : undefined,
            colonnes: [
              { libelle: "Entreprise", largeur: "minmax(220px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(140px, 220px)" },
              { libelle: "Montant HT", largeur: "130px", droite: true },
              { libelle: "Rang", largeur: "70px", droite: true },
              { libelle: "Écart", largeur: "90px", droite: true },
              { libelle: "État", largeur: "130px" },
            ],
            rangs: offres
              .slice()
              .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99))
              .map((o) => ({
                id: o.id,
                cle: `offre:${o.id}`,
                cellules: [
                  <span key="e" className="lor-at-cell-texte">{o.entreprise}</span>,
                  <span key="l" className="lor-at-cell-texte">{lotDe(consDe.get(o.consultation_id)?.lot_id ?? null)}</span>,
                  euros(o.montant_comparable_ht ?? o.montant_ht),
                  o.rang ?? vide("—"),
                  o.ecart_estimation_pct === null ? vide("—") : `${o.ecart_estimation_pct > 0 ? "+" : ""}${o.ecart_estimation_pct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`,
                  o.statut === "retenue" ? <Etat key="s" teinte="vert">Retenue</Etat> : o.statut === "ecartee" ? <Etat key="s" teinte="gris">Écartée</Etat> : o.statut === "analysee" ? <Etat key="s" teinte="bleu">Analysée</Etat> : <Etat key="s" teinte="gris">Reçue</Etat>,
                ],
              })),
            gestes: [{ libelle: "Ouvrir une consultation", principal: true, desactive: gris }],
          },
          {
            cle: "consultations",
            libelle: "Consultations",
            tri: "lot",
            vide: "Aucune consultation : ouvrez celle d'un lot, avec sa DPGF, pour recevoir et comparer les offres.",
            pied: cons.length ? pluriel(cons.length, "consultation") : undefined,
            colonnes: [
              { libelle: "Consultation", largeur: "minmax(220px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(140px, 220px)" },
              { libelle: "Estimation HT", largeur: "140px", droite: true },
              { libelle: "Date limite", largeur: "120px" },
              { libelle: "Offres", largeur: "80px", droite: true },
              { libelle: "État", largeur: "130px" },
            ],
            rangs: cons.map((c) => ({
              id: c.id,
              cle: `consultation:${c.id}`,
              cellules: [
                <span key="t" className="lor-at-cell-texte">{c.intitule}</span>,
                <span key="l" className="lor-at-cell-texte">{lotDe(c.lot_id)}</span>,
                euros(c.estimation_ht),
                c.date_limite ? court(c.date_limite) : vide("—"),
                offres.filter((o) => o.consultation_id === c.id).length,
                c.statut === "attribuee" ? <Etat key="s" teinte="vert">Attribuée</Etat> : c.statut === "infructueuse" ? <Etat key="s" teinte="gris">Infructueuse</Etat> : <Etat key="s" teinte="bleu">{c.statut === "analysee" ? "Analysée" : "Ouverte"}</Etat>,
              ],
            })),
            gestes: [{ libelle: "Ouvrir une consultation", principal: true, desactive: gris }],
          },
        ],
      };
    }
    if (cle === "chantier") {
      const marches = de(dossier.marches).filter((m) => m.actif);
      const marcheDe = new Map(dossier.marches.map((m) => [m.id, m]));
      const situations = de(dossier.situations).sort((a, b) => b.recue_le.localeCompare(a.recue_le));
      const visas = de(dossier.visas).sort((a, b) => b.recu_le.localeCompare(a.recu_le));
      const crs = de(dossier.comptesRendus).sort((a, b) => b.numero - a.numero);
      const os = de(dossier.ordresService).sort((a, b) => b.numero - a.numero);
      const AVIS: Record<(typeof visas)[number]["avis"], [string, "vert" | "bleu" | "gris" | "rouge"]> = { a_viser: ["À viser", "bleu"], vso: ["VSO", "vert"], vao: ["VAO", "vert"], ref: ["Refusé", "rouge"] };
      return {
        resume,
        avis: null,
        listes: [
          {
            cle: "situations",
            libelle: "Situations",
            tri: "date de réception",
            vide: marches.length ? "Aucune situation reçue." : "Pas encore de marché de travaux : posez le marché de chaque lot pour contrôler les situations des entreprises.",
            pied: situations.length ? `${pluriel(situations.length, "situation")} · ${situations.filter((x) => x.statut === "a_viser").length} à viser` : undefined,
            colonnes: [
              { libelle: "N°", largeur: "64px" },
              { libelle: "Entreprise", largeur: "minmax(200px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(140px, 200px)" },
              { libelle: "Mois", largeur: "100px" },
              { libelle: "Cumul HT", largeur: "130px", droite: true },
              { libelle: "À viser avant", largeur: "120px" },
              { libelle: "État", largeur: "130px" },
            ],
            rangs: situations.map((x) => {
              const m = marcheDe.get(x.marche_id);
              const retard = x.statut === "a_viser" && !!x.a_viser_avant && x.a_viser_avant < auj;
              return {
                id: x.id,
                cle: `chantier-situation:${x.id}`,
                cellules: [
                  <span key="n" className="lor-at-mono">n° {x.numero}</span>,
                  <span key="t" className="lor-at-cell-texte">{m?.titulaire ?? "—"}</span>,
                  <span key="l" className="lor-at-cell-texte">{lotDe(m?.lot_id ?? null)}</span>,
                  x.mois.slice(0, 7),
                  euros(x.cumul_ht),
                  x.a_viser_avant ? court(x.a_viser_avant) : vide("—"),
                  x.statut === "a_viser" ? <Etat key="s" teinte={retard ? "rouge" : "bleu"}>{retard ? "En retard" : "À viser"}</Etat> : <Etat key="s" teinte="vert">{x.statut === "visee" ? "Visée" : "Rectifiée"}</Etat>,
                ],
              };
            }),
            gestes: [{ libelle: "Situation reçue", principal: true, desactive: gris || !marches.length, titre: marches.length ? undefined : "Posez d'abord un marché" }],
          },
          {
            cle: "visas",
            libelle: "Visas",
            tri: "date de réception",
            vide: "Aucun document à viser : plans d'exécution, notes de calcul et fiches produits des entreprises arrivent ici.",
            pied: visas.length ? `${pluriel(visas.length, "document")} · ${visas.filter((v) => v.avis === "a_viser").length} à viser` : undefined,
            colonnes: [
              { libelle: "Document", largeur: "minmax(220px, 1fr)" },
              { libelle: "Indice", largeur: "80px" },
              { libelle: "Lot", largeur: "minmax(140px, 200px)" },
              { libelle: "Reçu le", largeur: "110px" },
              { libelle: "À viser avant", largeur: "120px" },
              { libelle: "Avis", largeur: "120px" },
            ],
            rangs: visas.map((v) => ({
              id: v.id,
              cle: `chantier-visa:${v.id}`,
              cellules: [
                <span key="d" className="lor-at-cell-texte">{v.document}</span>,
                <span key="i" className="lor-at-mono">{v.indice}</span>,
                <span key="l" className="lor-at-cell-texte">{lotDe(v.lot_id)}</span>,
                court(v.recu_le),
                v.a_viser_avant ? court(v.a_viser_avant) : vide("—"),
                <Etat key="a" teinte={v.avis === "a_viser" && v.a_viser_avant && v.a_viser_avant < auj ? "rouge" : AVIS[v.avis][1]}>{AVIS[v.avis][0]}</Etat>,
              ],
            })),
            gestes: [{ libelle: "Bordereau des visas", faire: imprimerBordereau }, { libelle: "Document à viser", principal: true, desactive: gris }],
          },
          {
            cle: "marches",
            libelle: "Marchés",
            tri: "lot",
            vide: "Aucun marché de travaux : la révision et le contrôle des situations se règlent par marché.",
            pied: marches.length ? `${pluriel(marches.length, "marché")} · ${Math.round(marches.reduce((t, m) => t + m.montant_ht + m.avenants_ht, 0)).toLocaleString("fr-FR")} € HT avec avenants` : undefined,
            colonnes: [
              { libelle: "Lot", largeur: "minmax(160px, 240px)" },
              { libelle: "Titulaire", largeur: "minmax(200px, 1fr)" },
              { libelle: "Montant HT", largeur: "140px", droite: true },
              { libelle: "Avenants HT", largeur: "130px", droite: true },
              { libelle: "Retenue", largeur: "90px", droite: true },
              { libelle: "Révision des prix", largeur: "minmax(150px, 220px)" },
            ],
            rangs: marches.map((m) => ({
              id: m.id,
              cle: `chantier-marche:${m.id}`,
              cellules: [
                <span key="l" className="lor-at-cell-texte">{lotDe(m.lot_id)}</span>,
                <span key="t" className="lor-at-cell-texte">{m.titulaire}</span>,
                euros(m.montant_ht),
                m.avenants_ht ? euros(m.avenants_ht) : vide("—"),
                `${m.retenue_pct} %`,
                m.revision_idbank ? (
                  <span key="r" className="lor-at-cell-texte" title={`C = a + (1 − a) × In / I0, partie fixe a = ${(m.revision_partie_fixe ?? 0.15).toLocaleString("fr-FR")}`}>
                    Index {INDEX_INSEE[m.revision_idbank] ?? m.revision_idbank}
                  </span>
                ) : (
                  vide("Prix fermes")
                ),
              ],
            })),
            gestes: [{ libelle: "Nouveau marché", principal: true, desactive: gris }],
          },
          {
            cle: "comptes-rendus",
            libelle: "Comptes rendus",
            tri: "numéro",
            vide: "Aucun compte rendu. Après la visite, notez ce que vous avez vu et demandé : chaque ligne devient un point, suivi de compte rendu en compte rendu.",
            pied: crs.length ? pluriel(crs.length, "compte rendu", "comptes rendus") : undefined,
            colonnes: [
              { libelle: "N°", largeur: "64px" },
              { libelle: "Visite du", largeur: "120px" },
              { libelle: "Avancement", largeur: "minmax(240px, 1fr)" },
              { libelle: "Prochaine visite", largeur: "140px" },
              { libelle: "État", largeur: "120px" },
            ],
            rangs: crs.map((c) => ({
              id: c.id,
              cle: `cr:${c.id}`,
              cellules: [
                <span key="n" className="lor-at-mono">n° {c.numero}</span>,
                court(c.visite_le),
                c.avancement ? <span key="a" className="lor-at-cell-texte">{c.avancement}</span> : vide("—"),
                c.prochaine_visite ? court(c.prochaine_visite) : vide("—"),
                c.statut === "diffuse" ? <Etat key="s" teinte="vert">Diffusé</Etat> : <Etat key="s" teinte="bleu">Brouillon</Etat>,
              ],
            })),
            gestes: [{ libelle: "Nouveau compte rendu", principal: true, desactive: gris }],
          },
          {
            cle: "ordres-service",
            libelle: "Ordres de service",
            tri: "numéro",
            vide: "Aucun ordre de service : ils s'émettent depuis le marché d'un lot.",
            pied: os.length ? pluriel(os.length, "ordre de service", "ordres de service") : undefined,
            colonnes: [
              { libelle: "N°", largeur: "64px" },
              { libelle: "Objet", largeur: "minmax(220px, 1fr)" },
              { libelle: "Entreprise", largeur: "minmax(140px, 220px)" },
              { libelle: "Montant HT", largeur: "130px", droite: true },
              { libelle: "Émis le", largeur: "110px" },
              { libelle: "État", largeur: "170px" },
            ],
            rangs: os.map((o) => ({
              id: o.id,
              cle: `os:${o.id}`,
              cellules: [
                <span key="n" className="lor-at-mono">n° {o.numero}</span>,
                <span key="t" className="lor-at-cell-texte">{o.objet}</span>,
                <span key="e" className="lor-at-cell-texte">{marcheDe.get(o.marche_id)?.titulaire ?? "—"}</span>,
                o.montant_ht ? euros(o.montant_ht) : vide("—"),
                court(o.emis_le),
                o.statut === "signe" ? <Etat key="s" teinte="vert">Signé</Etat> : o.statut === "signe_reserves" ? <Etat key="s" teinte="vert">Signé avec réserves</Etat> : o.statut === "refuse" ? <Etat key="s" teinte="rouge">Refusé</Etat> : <Etat key="s" teinte="bleu">Émis</Etat>,
              ],
            })),
            gestes: [],
          },
        ],
      };
    }
    if (cle === "assurances") {
      const att = de(dossier.attestations);
      const inter = new Map(dossier.intervenants.map((i) => [i.id, i]));
      const lots = de(dossier.lots).sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true }));
      const ETAT_ATT: Record<(typeof att)[number]["statut"], [string, "vert" | "bleu" | "gris" | "rouge"]> = { conforme: ["Conforme", "vert"], a_verifier: ["À vérifier", "bleu"], non_conforme: ["Non conforme", "rouge"], expiree: ["Expirée", "rouge"] };
      const gestesAss = [{ libelle: "Ouverture du chantier", desactive: gris }, { libelle: "Saisir une attestation", principal: true, desactive: gris }];
      return {
        resume,
        avis: projet.ouverture_chantier ? `Ouverture du chantier le ${plein(projet.ouverture_chantier)}` : null,
        listes: [
          {
            cle: "attestations",
            libelle: "Attestations",
            tri: "fin de validité",
            vide: "Aucune attestation : demandez la décennale et la RC de chaque entreprise avant l'ouverture du chantier.",
            pied: att.length ? `${pluriel(att.length, "attestation")} · ${att.filter((a) => a.statut === "conforme").length} conforme${att.filter((a) => a.statut === "conforme").length > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Entreprise", largeur: "minmax(200px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(140px, 200px)" },
              { libelle: "Assureur", largeur: "minmax(130px, 180px)" },
              { libelle: "Police", largeur: "140px" },
              { libelle: "Valable jusqu'au", largeur: "130px" },
              { libelle: "État", largeur: "140px" },
            ],
            rangs: att
              .slice()
              .sort((a, b) => (a.fin ?? "9999").localeCompare(b.fin ?? "9999"))
              .map((a) => ({
                id: a.id,
                cle: `attestation:${a.id}`,
                cellules: [
                  <span key="e" className="lor-at-cell-texte">{a.assure ?? (a.intervenant_id ? inter.get(a.intervenant_id)?.organisme : null) ?? "—"}</span>,
                  <span key="l" className="lor-at-cell-texte">{lotDe(a.lot_id)}</span>,
                  a.assureur ? <span key="a" className="lor-at-cell-texte">{a.assureur}</span> : vide("—"),
                  a.numero_police ? <span key="p" className="lor-at-mono">{a.numero_police}</span> : vide("—"),
                  a.fin ? court(a.fin) : vide("—"),
                  <Etat key="s" teinte={ETAT_ATT[a.statut][1]}>{ETAT_ATT[a.statut][0]}</Etat>,
                ],
              })),
            gestes: gestesAss,
          },
          {
            cle: "activites",
            libelle: "Activités par lot",
            tri: "lot",
            vide: "Aucun lot : les activités à assurer se déclarent par lot.",
            pied: lots.length ? pluriel(lots.length, "lot") : undefined,
            colonnes: [
              { libelle: "Lot", largeur: "minmax(200px, 1fr)" },
              { libelle: "Activités requises", largeur: "minmax(200px, 1fr)" },
              { libelle: "Attestation", largeur: "150px" },
            ],
            rangs: lots.map((l) => {
              const a = att.find((x) => x.lot_id === l.id);
              return {
                id: l.id,
                cellules: [
                  <span key="l" className="lor-at-cell-texte">{`Lot ${l.numero} · ${l.intitule}`}</span>,
                  l.activites_requises.length ? <span key="r" className="lor-at-cell-texte">{l.activites_requises.join(", ")}</span> : vide("—"),
                  a ? <Etat key="s" teinte={ETAT_ATT[a.statut][1]}>{ETAT_ATT[a.statut][0]}</Etat> : <Etat key="s" teinte="gris">Aucune</Etat>,
                ],
              };
            }),
            gestes: gestesAss,
          },
        ],
      };
    }
    return null;
  })();

  const avecVolet = details || ouvert;

  return (
    <VoletContexte.Provider value={contexte}>
      <div className="lor lor-in" data-volet={avecVolet ? "" : undefined}>
        <h1 className="v2-sr">{projet.nom}</h1>
        <header className="lor-in-tete">
          <div className="lor-in-l1">
            <div className="lor-in-l1-gauche">
              <nav className="lor-in-fil" aria-label="Fil d'Ariane">
                <Link href={`${BASE}/projets`} className="lor-in-maillon">
                  Projets
                </Link>
                <span className="lor-in-sep" aria-hidden="true">
                  ›
                </span>
                <Link href={chemin} className="lor-in-courant" aria-current="page">
                  <h2>
                    <IconeSprite nom={nature.nom} couleur={nature.couleur} />
                    {projet.nom}
                  </h2>
                </Link>
              </nav>
              <BoutonEtoile cle={`projet:${projet.id}`} nom={projet.nom} />
              <div className="lor-in-ancre" ref={menuPointsRef}>
                <button type="button" className="lor-rond" aria-label="Options du projet" title="Options du projet" aria-expanded={ouvertPoints} onClick={() => setOuvertPoints((o) => !o)}>
                  <IconePoints />
                </button>
                {ouvertPoints ? <Menu etiquette="Options du projet" choix={choixPoints} fermer={() => setOuvertPoints(false)} onChoix={choisir} style={{ left: 0, top: 34 }} /> : null}
              </div>
            </div>
            <div className="lor-in-l1-droite">
              <button type="button" className="lor-rond lor-in-rond-24" aria-label="Copier le lien du projet" title="Copier le lien du projet" onClick={copier}>
                <IconeLin nom="copierLien" />
              </button>
              <button
                type="button"
                className="lor-rond"
                aria-pressed={suivis.a(`projet:${projet.id}`)}
                aria-label={suivis.a(`projet:${projet.id}`) ? "Ne plus suivre le projet" : "Suivre le projet"}
                title={suivis.a(`projet:${projet.id}`) ? "Ne plus suivre : ses courriers reprennent leur place dans le Courrier" : "Suivre : les courriers du projet passent en tête du Courrier, marqués « suivi » (gardé dans ce navigateur)"}
                onClick={() => suivis.basculer(`projet:${projet.id}`)}
              >
                <IconeSprite nom="Subscribe" />
              </button>
              <div className="lor-in-ancre" ref={menuPlusRef}>
                <button type="button" className="lor-rond" aria-label="Ajouter au projet" title="Ajouter au projet" aria-expanded={ouvertPlus} disabled={!peutEcrire} onClick={() => setOuvertPlus((o) => !o)}>
                  <IconePlus />
                </button>
                {ouvertPlus ? <Menu etiquette="Ajouter au projet" choix={choixPlus} fermer={() => setOuvertPlus(false)} onChoix={choisir} style={{ right: 0, top: 34 }} /> : null}
              </div>
            </div>
          </div>
          <div className="lor-in-l2">
            <nav className="lor-in-onglets" aria-label="Vues du projet">
              {ONGLETS.map((o) => (
                <Link key={o.cle} href={lien(o.cle)} scroll={false} className="v2-btn v2-btn--petit" data-actif={o.cle === cle ? "" : undefined} aria-current={o.cle === cle ? "page" : undefined}>
                  {o.libelle}
                </Link>
              ))}
              <Link href={`${BASE}/honoraires?projet=${encodeURIComponent(projet.id)}`} className="v2-btn v2-btn--petit">
                Honoraires
              </Link>
              <div className="lor-in-ancre" ref={menuVueRef}>
                <button type="button" className="lor-rond lor-rond--sourd" aria-label="Nouvelle vue" title="Nouvelle vue : les permis d'une santé dans la vue d'ensemble" aria-expanded={ouvertVue} onClick={() => setOuvertVue((o) => !o)}>
                  <IconeNouvelleVue />
                </button>
                {ouvertVue ? (
                  <div className="lor-menu lor-in-menu" role="menu" aria-label="Nouvelle vue" style={{ left: 0, top: 34 }}>
                    <div className="lor-menu-liste">
                      {FAMILLES.map((f) => (
                        <Link key={f.cle} role="menuitem" href={`${BASE}?famille=${f.cle}`} className="lor-option" onClick={() => setOuvertVue(false)} title={f.sous}>
                          <IconeSanteLor etat={SANTE[f.cle]} />
                          <span className="lor-option-libelle">Vue « {f.libelle} »</span>
                          <span className="lor-option-droite">{dossier.permis.filter((x) => familleDe(x) === f.cle).length}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </nav>
            <button type="button" className="lor-rond lor-in-details-btn" aria-label={details ? "Fermer les détails du projet" : "Ouvrir les détails du projet"} title={`${details ? "Fermer" : "Ouvrir"} les détails du projet  ⌘ I`} aria-expanded={details} onClick={() => setDetails((d) => !d)}>
              <IconeVolet ouvert={details} />
            </button>
          </div>
        </header>

        {erreur ? (
          <p className="lor-in-alerte" role="alert">
            La base réelle n&apos;a pas répondu. {erreur}
          </p>
        ) : null}

        <div className="lor-in-corps">
          <div className="lor-in-defile" data-outil={outil ? "" : undefined}>
            {cle === "projet" ? (
              <div className="lor-in-colonne">
                <div className="lor-in-tuile" style={{ "--lor-in-tuile": nature.couleur } as React.CSSProperties} aria-hidden="true">
                  <IconeSprite nom={nature.nom} couleur={nature.couleur} taille={24} />
                </div>
                <h2 className="lor-in-titre">{projet.nom}</h2>
                <p className="lor-in-resume">{resume || NATURES_PROJET[projet.nature]}</p>

                <div className="lor-in-rang">
                  <h3>Propriétés</h3>
                  <div className="lor-in-pilules">
                    <span className="lor-in-pilule" title={`Nature : ${NATURES_PROJET[projet.nature]}`}>
                      <IconeSanteLor etat={santePresse} />
                      {NATURES_PROJET[projet.nature]}
                    </span>
                    <span className="lor-in-pilule" title="Phase de la mission">
                      <IconeSprite nom="Cycle" />
                      {PHASES[projet.phase]}
                    </span>
                    <button type="button" className="lor-in-pilule" data-vide={chef ? undefined : ""} disabled={gris} onClick={() => setForm({ type: "membre", projet: projet.id })} title={chef ? `Chef de projet : ${chef}` : "Nommer un chef de projet : il reçoit les rappels"}>
                      {chef ? <Avatar nom={chef} /> : <IconeSansResponsable />}
                      {chef ?? "Chef de projet"}
                    </button>
                    <span className="lor-in-pilule" data-vide={cible ? undefined : ""} title={cible ? `Prochaine date : ${plein(cible)}` : "Aucune date à venir"}>
                      <IconeCalendrierLor passe={!!cible && cible < auj} />
                      {cible ? court(cible) : "Prochaine date"}
                    </span>
                    <div className="lor-in-ancre" ref={menuPropRef}>
                      <button type="button" className="lor-rond" aria-label="Autres propriétés" title="Autres propriétés" aria-expanded={ouvertProp} onClick={() => setOuvertProp((o) => !o)}>
                        <IconePoints />
                      </button>
                      {ouvertProp ? (
                        <div className="lor-menu lor-in-menu" role="dialog" aria-label="Autres propriétés" style={{ left: 0, top: 34 }}>
                          <div className="lor-menu-liste">
                            <div className="lor-option">
                              <span className="lor-option-libelle">{projet.marche_public ? "Marché public" : "Marché privé"}</span>
                            </div>
                            <div className="lor-option">
                              <span className="lor-option-libelle">{territoire ? `Territoire : ${territoire}` : "Territoire inconnu"}</span>
                            </div>
                            {projet.ouverture_chantier ? (
                              <div className="lor-option">
                                <span className="lor-option-libelle">Ouverture du chantier le {plein(projet.ouverture_chantier)}</span>
                              </div>
                            ) : null}
                            {projet.reception_le ? (
                              <div className="lor-option">
                                <span className="lor-option-libelle">Réception le {plein(projet.reception_le)}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="lor-in-rang">
                  <h3>Ressources</h3>
                  <div className="lor-in-pilules">
                    {plu?.reglement_url ? (
                      <a href={plu.reglement_url} target="_blank" rel="noreferrer" className="lor-in-pilule">
                        <IconeSprite nom="Link" />
                        Règlement de la zone {plu.zone ?? ""}
                      </a>
                    ) : null}
                    <button type="button" className="lor-in-pilule" onClick={exporter} title="Registre PDF et Excel (une feuille par lot), dans une archive">
                      <IconeSprite nom="Folder" />
                      Dossier daté
                    </button>
                    <button type="button" className="lor-rond" aria-label="Déposer un courrier de la mairie" title="Déposer un courrier de la mairie" disabled={gris} onClick={() => setForm({ type: "courrier", projet: projet.id })}>
                      <IconeLin nom="plusPetit" />
                    </button>
                  </div>
                </div>

                <section className="lor-in-maj" aria-label="Dernier point">
                  <div className="lor-in-maj-tete">
                    <h3>{dernierCr ? "Dernier compte rendu" : "Dernier point"}</h3>
                    <Link href={lien("chantier")} className="lor-in-maj-bouton">
                      <IconeSprite nom="Write" />
                      Compte rendu
                    </Link>
                  </div>
                  <div className="lor-in-maj-bloc">
                    {dernierCr ? (
                      <>
                        <div className="lor-in-maj-meta">
                          <span className="lor-in-sante" data-etat={dernierCr.statut === "diffuse" ? "bien" : "risque"}>
                            <IconeSanteLor etat={dernierCr.statut === "diffuse" ? "bien" : "risque"} />
                            {dernierCr.statut === "diffuse" ? "Diffusé" : "Brouillon"}
                          </span>
                          <Avatar nom={chef ?? "Lorani"} />
                          <span>{chef ?? "Lorani"}</span>
                          <span title={plein(dernierCr.visite_le)}>{depuis(dernierCr.visite_le)}</span>
                        </div>
                        <p className="lor-in-maj-texte">
                          Compte rendu n° {dernierCr.numero}, visite du {plein(dernierCr.visite_le)}.{dernierCr.avancement ? ` ${dernierCr.avancement}` : ""}
                          {dernierCr.prochaine_visite ? ` Prochaine visite le ${plein(dernierCr.prochaine_visite)}.` : ""}
                        </p>
                      </>
                    ) : presse ? (
                      <>
                        <div className="lor-in-maj-meta">
                          <span className="lor-in-sante" data-etat={santePresse}>
                            <IconeSanteLor etat={santePresse} />
                            {LIBELLE_SANTE[santePresse]}
                          </span>
                          <Avatar nom="Lorani" />
                          <span>Lorani</span>
                          <span title={new Date(presse.maj_le).toLocaleString("fr-FR")}>{depuis(presse.maj_le)}</span>
                        </div>
                        <p className="lor-in-maj-texte">
                          {titrePermis(presse, projet.nom)} : {(ETATS[presse.etat]?.libelle ?? presse.etat).toLowerCase()}.
                          {prochaineDate(presse) ? ` Prochaine étape le ${plein(prochaineDate(presse)!)}.` : ""}
                          {(proposeesPar[presse.id] ?? 0) ? ` ${pluriel(proposeesPar[presse.id], "date lue", "dates lues")} sur les courriers, à confirmer.` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="lor-in-maj-texte lor-in-sourd">Aucun permis ni compte rendu : saisissez le permis, ou déposez le récépissé de la mairie.</p>
                    )}
                    <div className="lor-in-maj-actions">
                      <button
                        type="button"
                        className="lor-rond"
                        aria-label="Copier ce point"
                        title="Copier ce point (pour un courriel ou l'assistant)"
                        onClick={async () => toast((await copierTexte(`${projet.nom} — ${(document.querySelector(".lor-in-maj-texte")?.textContent ?? "").trim()}`)) ? "Point copié." : "La copie a été refusée par le navigateur.")}
                      >
                        <IconeLin nom="reaction" />
                      </button>
                      <Link href={lien("chantier")} className="lor-in-com" title={`${pluriel(pointsOuverts, "point")} en suspens au chantier`} aria-label={`${pluriel(pointsOuverts, "point")} en suspens`}>
                        <IconeSprite nom="Comment" />
                        {pointsOuverts ? <span>{pointsOuverts}</span> : null}
                      </Link>
                    </div>
                  </div>
                </section>

                <section className="lor-in-description" aria-label="Description">
                  <h3>Description</h3>
                  <div className="lor-in-description-texte">
                    <p>
                      {NATURES_PROJET[projet.nature]}
                      {projet.marche_public ? ", marché public" : ""}, phase {PHASES[projet.phase].toLowerCase()}.{territoire ? ` Territoire : ${territoire}.` : " Territoire inconnu : les délais d'outre-mer ou de Corse ne sont pas appliqués."}
                      {plu?.zone ? ` Zone ${plu.zone}${plu.document?.titre ? ` du ${plu.document.titre}` : ""}${plu.zones.length > 1 ? ` (et ${pluriel(plu.zones.length - 1, "autre zone")})` : ""}.` : plu ? " Règles d'urbanisme à chercher." : ""}
                      {exige ? ` ${pluriel(exige.manquantes, "pièce")} sur ${exige.total} pas encore déposée${exige.manquantes > 1 ? "s" : ""} pour le permis.` : ""}
                    </p>
                  </div>
                </section>

                <section className="lor-in-projets" aria-label="Permis">
                  <div className="lor-in-projets-tete">
                    <h3>Permis</h3>
                    <div className="lor-in-projets-outils">
                      <div className="lor-in-ancre" ref={menuAffRef}>
                        <button type="button" className="lor-rond lor-rond--plein" aria-label="Affichage" title="Affichage" aria-expanded={ouvertAff} onClick={() => setOuvertAff((o) => !o)}>
                          <IconeAffichage />
                        </button>
                        {ouvertAff ? (
                          <div className="lor-menu lor-in-menu" role="dialog" aria-label="Affichage" style={{ right: 0, top: 34 }}>
                            <div className="lor-menu-liste">
                              <label className="lor-in-coche">
                                <input type="checkbox" checked={groupes} onChange={(e) => setGroupes(e.target.checked)} />
                                Grouper par santé
                              </label>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <button type="button" className="lor-rond lor-rond--plein" aria-label="Nouveau permis" title="Nouveau permis" disabled={gris} onClick={() => setForm({ type: "permis", projet: projet.id })}>
                        <IconeLin nom="plusPetit" />
                      </button>
                    </div>
                  </div>
                  {tableau}
                </section>
              </div>
            ) : cle === "activite" ? (
              <div className="lor-in-colonne lor-in-colonne--activite">
                {/* deux vues de l'onglet : le fil d'activité, ou le registre daté (dossier-date.ts) — « ?vue=registre » */}
                <div className="lor-in-vues-activite" role="tablist" aria-label="Vues de l'activité">
                  <Link role="tab" aria-selected={!registre} href={lien("activite")} scroll={false} className="lor-vue" data-actif={!registre ? "" : undefined}>
                    Fil d&apos;activité
                  </Link>
                  <Link role="tab" aria-selected={registre} href={`${lien("activite")}&vue=registre`} scroll={false} className="lor-vue" data-actif={registre ? "" : undefined}>
                    Registre daté
                  </Link>
                </div>
                {registre ? (
                  <>
                    <div className="lor-in-registre-tete">
                      <p className="lor-in-sourd">
                        {pluriel(lignesRegistre.length, "ligne")} : contrôles et constats décidés, visas, situations, décennales, ordres de service, réserves, comptes rendus diffusés, offres. Chaque date est celle que la base a enregistrée au moment des faits.
                      </p>
                      <button type="button" className="lor-texte-btn" onClick={exporter} title="Registre PDF et Excel (une feuille par lot), dans une archive : le dossier de défense décennale">
                        <IconeSprite nom="Folder" />
                        Exporter le dossier daté
                      </button>
                    </div>
                    {[...new Set(lignesRegistre.map((x) => (x.date ?? "sans date").slice(0, 7)))].reverse().map((mois) => (
                      <section key={mois} className="lor-in-mois" aria-label={mois === "sans date" ? "Sans date" : fmtMois.format(midi(`${mois}-15`))}>
                        <h3>{mois === "sans date" ? "Sans date" : fmtMois.format(midi(`${mois}-15`))}</h3>
                        <ul>
                          {lignesRegistre
                            .filter((x) => (x.date ?? "sans date").startsWith(mois))
                            .reverse()
                            .map((x, i) => (
                              <li key={`${mois}-${i}`} className="lor-in-ev lor-in-registre">
                                <span className="lor-in-rubrique">{x.rubrique}</span>
                                <span>
                                  <span className="lor-in-ev-qui">{x.objet}</span>
                                  {x.lot ? ` · lot ${x.lot}` : ""} · {x.etat}
                                  {x.par ? ` (${x.par})` : ""}
                                  {x.piece ? ` · pièce : ${x.piece}` : ""}
                                  {x.date ? (
                                    <>
                                      {" "}
                                      · <time dateTime={x.date}>{court(x.date)}</time>
                                    </>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </section>
                    ))}
                    {!lignesRegistre.length ? <p className="lor-in-vide">Aucune décision n&apos;est encore enregistrée sur ce projet : le registre se remplit avec les contrôles, les visas, les situations, les ordres de service, les réserves et les comptes rendus diffusés.</p> : null}
                  </>
                ) : (
                <>
                <button type="button" className="lor-in-composeur" disabled={gris} onClick={() => setForm({ type: "courrier", projet: projet.id })}>
                  <span className="lor-in-segmente" aria-hidden="true">
                    <span data-actif="">Courrier</span>
                    <span>Compte rendu</span>
                  </span>
                  <span className="lor-in-composeur-texte">Déposer un courrier de la mairie…</span>
                  <span className="lor-in-composeur-pied">
                    <span className="lor-in-rond-28" aria-hidden="true">
                      <IconeSprite nom="Attachment" />
                    </span>
                    <span className="lor-in-composeur-btn">Déposer</span>
                  </span>
                </button>
                {[...new Set(evenements.map((e) => e.quand.slice(0, 7)))].map((mois) => (
                  <section key={mois} className="lor-in-mois" aria-label={fmtMois.format(midi(`${mois}-15`))}>
                    <h3>{fmtMois.format(midi(`${mois}-15`))}</h3>
                    <ul>
                      {evenements
                        .filter((e) => e.quand.startsWith(mois))
                        .map((e) => (
                          <li key={e.cle} className="lor-in-ev">
                            <Avatar nom={e.qui} taille={16} />
                            <span>
                              <span className="lor-in-ev-qui">{e.qui}</span> {e.quoi} · <time dateTime={e.quand}>{court(e.quand)}</time>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
                </>
                )}
              </div>
            ) : cle === "permis" ? (
              <div className="lor-in-large">
                <div className="lor-in-projets-tete">
                  <h3>Permis du projet</h3>
                  <div className="lor-in-projets-outils">
                    <button type="button" className="lor-rond lor-rond--plein" aria-label="Nouveau permis" title="Nouveau permis" disabled={gris} onClick={() => setForm({ type: "permis", projet: projet.id })}>
                      <IconeLin nom="plusPetit" />
                    </button>
                  </div>
                </div>
                {tableau}
              </div>
            ) : (
              <div className={outil ? "lor-in-vue-outil" : "lor-in-colonne lor-in-vue"}>
                {outil ? (
                  <OngletOutil
                    listes={outil.listes}
                    courante={listeParam ?? outil.listes[0].cle}
                    lienListe={lienListe}
                    resume={outil.resume}
                    avis={outil.avis}
                    declencher={declencher}
                    choisir={(c) => contexte.choisir(c)}
                    choisie={contexte.choisie}
                  />
                ) : tete ? (
                  <>
                    <div className="lor-in-tuile" style={{ "--lor-in-tuile": tete.couleur } as React.CSSProperties} aria-hidden="true">
                      <IconeSprite nom={tete.icone} couleur={tete.couleur} taille={24} />
                    </div>
                    <h2 className="lor-in-titre">{ongletCourant?.libelle}</h2>
                    <p className="lor-in-resume">{tete.resume}</p>
                    <div className="lor-in-rang">
                      <h3>Propriétés</h3>
                      <div className="lor-in-pilules">
                        {tete.pilules.map((x) => (
                          <span key={x.texte} className="lor-in-pilule" data-vide={x.vide ? "" : undefined} title={x.titre}>
                            <IconeSprite nom={x.icone} />
                            {x.texte}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                {cle === "chantier" && !outil ? (
                  <section className="lor-in-chantier-tete" aria-label="Bordereau et révision des prix">
                    <div className="lor-in-projets-tete">
                      <h3>Visas et révision des prix</h3>
                      <div className="lor-in-projets-outils">
                        <button type="button" className="lor-texte-btn" onClick={imprimerBordereau} title="Bordereau VSO · VAO · refus, imprimable (PDF fabriqué dans le navigateur)">
                          <IconeSprite nom="PdfFile" />
                          Bordereau des visas
                        </button>
                      </div>
                    </div>
                    <ul className="lor-in-revisions">
                      {marchesProjet.map((m) => {
                        const l = dossier.lots.find((x) => x.id === m.lot_id);
                        return (
                          <li key={m.id} className="lor-in-ev">
                            <span className="lor-in-rubrique">{l ? `Lot ${l.numero}` : "Lot"}</span>
                            <span>
                              <span className="lor-in-ev-qui">{m.titulaire}</span> ·{" "}
                              {m.revision_idbank
                                ? `révision C = a + (1 − a) × In / I0 sur l'index ${INDEX_INSEE[m.revision_idbank] ? `${INDEX_INSEE[m.revision_idbank]} (INSEE ${m.revision_idbank})` : `INSEE ${m.revision_idbank}`}${m.revision_mois_zero ? `, I0 de ${fmtMois.format(midi(m.revision_mois_zero))}` : ""}, partie fixe a = ${(m.revision_partie_fixe ?? 0.15).toLocaleString("fr-FR")} ; la révision de chaque situation est calculée en base`
                                : "aucune formule de révision saisie : prix fermes pour Lorani"}
                            </span>
                          </li>
                        );
                      })}
                      {!marchesProjet.length ? <li className="lor-in-vide">Aucun marché de travaux : la révision se règle par marché.</li> : null}
                    </ul>
                  </section>
                ) : null}
                {/* l'onglet d'outil garde les parties montées, cachées : leurs fenêtres et leurs détails (volet) */}
                <div ref={cache} hidden={!!outil}>
                <Habille>
                  <div className="lin lor-in-pont">
                    <ProjetCarte key={`${cle}-${projet.id}`} projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={setForm} agir={agir} parties={ong.parties} confirmerEnvois />
                  </div>
                </Habille>
                </div>
                {cle === "equipe" && !outil ? (
                  <p className="lor-in-note">
                    {chefs.length ? `Les rappels partent à ${chefs.map((m) => nommer(m.user_id)).join(", ")} (${ROLES_PROJET.chef_projet.toLowerCase()}).` : "Personne : les rappels n'ont pas de destinataire. Nommez un chef de projet."}
                  </p>
                ) : null}
              </div>
            )}
          </div>
          {avecVolet ? (
            <aside className="lor-in-volet lin lor-in-pont" aria-label={ouvert ? "Détail" : "Détails du projet"}>
              <div ref={setCible} className="lvp-cible" />
              {ouvert ? null : voletDetails}
            </aside>
          ) : (
            <div ref={setCible} className="lvp-cible" hidden />
          )}
        </div>
        <BarreSelection
          nombre={selection.cles.length}
          vider={selection.vider}
          actions={[
            { cle: "epingler", libelle: "Épingler", faire: () => favoris.poser(selection.cles, true) },
            { cle: "suivre", libelle: "Suivre", faire: () => suivis.poser(selection.cles, true) },
            ...datesReport()
              .slice(0, 2)
              .map((d) => ({ cle: `rep-${d.cle}`, libelle: `Reporter · ${d.libelle.toLowerCase()}`, faire: () => { selection.cles.forEach((k) => reports.reporter(k, d.date)); selection.vider(); } })),
            {
              cle: "csv",
              libelle: "Exporter en CSV",
              faire: () => {
                const choisis = permis.filter((x) => selection.a(`permis:${x.id}`));
                exporterCsv(`permis-${projet.nom}`, ["Permis", "Numéro", "État", "Prochaine date", "Chef de projet"], choisis.map((x) => [titrePermis(x, projet.nom), x.numero ?? "", ETATS[x.etat]?.libelle ?? x.etat, prochaineDate(x) ?? "", chef ?? ""]));
              },
            },
          ]}
        />
        {formulaires}
      </div>
    </VoletContexte.Provider>
  );
}
