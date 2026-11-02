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
import Formulaires, { type Form } from "@/components/espace/lorani/Formulaires";
import { dossierDate } from "@/components/espace/lorani/dossier-date";
import { ETATS, FAMILLES, NATURES_PROJET, PHASES, ROLES_PROJET, prochaineDate, titrePermis, type Famille } from "@/components/espace/lorani/etats";
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
  const [details, setDetails] = useState(false);
  const [onglet, setOngletProgres] = useState<"sante" | "etat" | "chefs">("sante");
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
            <Link href={BASE} className="lor-in-maillon">
              Permis
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

  const avecVolet = details || ouvert;

  return (
    <VoletContexte.Provider value={contexte}>
      <div className="lor lor-in" data-volet={avecVolet ? "" : undefined}>
        <h1 className="v2-sr">{projet.nom}</h1>
        <header className="lor-in-tete">
          <div className="lor-in-l1">
            <div className="lor-in-l1-gauche">
              <nav className="lor-in-fil" aria-label="Fil d'Ariane">
                <Link href={BASE} className="lor-in-maillon">
                  Permis
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
                <Link key={o.cle} href={lien(o.cle)} scroll={false} className="lor-vue" data-actif={o.cle === cle ? "" : undefined} aria-current={o.cle === cle ? "page" : undefined}>
                  {o.libelle}
                </Link>
              ))}
              <Link href={`${BASE}/honoraires?projet=${encodeURIComponent(projet.id)}`} className="lor-vue">
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
          <div className="lor-in-defile">
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
              <div className="lor-in-large lor-in-vue">
                <Habille>
                  <div className="lin lor-in-pont">
                    <ProjetCarte key={`${cle}-${projet.id}`} projet={projet} dossier={dossier} nommer={nommer} peutEcrire={peutEcrire} envoi={envoi} ouvrirForm={setForm} agir={agir} parties={ong.parties} confirmerEnvois />
                  </div>
                </Habille>
                {cle === "equipe" ? (
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
