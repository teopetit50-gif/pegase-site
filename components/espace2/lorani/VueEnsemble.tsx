"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI — la vue d'ensemble des permis (refaite le 02/11/2026)

   La liste « All projects » de Linear (Projects), au 1:1 : relevé
   docs/refonte-metiers/releves/linear-projects.md et mesures du 02/11,
   styles dans ./lor-projets.css (préfixe lor-pj-), jetons dans ./lor.css.
   Une ligne de Linear = un permis : l'icône de projet, le nom (projet et
   type) et son jalon (la prochaine étape), la santé (la famille du
   permis), la priorité (l'urgence de la prochaine date), le responsable
   (le chef de projet), la date cible (la prochaine date), le nombre
   (les dates lues à confirmer), le statut (l'avancement sur les sept
   étapes, du dépôt à la purge) et sa courbe.

   Ce qu'elle reprend de l'écran d'avant (inventaire lorani.md) :
     · B1 : « Nouveau projet » (New project), F1 / G1 inchangés ;
     · B2 : les cinq familles et leurs comptes → le volet « Santé »
       (Open sidebar) et le menu de filtre (Add filter) ; le filtre est
       dans l'adresse (?famille=), une pastille de vue le montre ;
     · B3 : l'erreur de la base réelle, sous l'en-tête ;
     · B4 : une ligne par permis, même tri par défaut que l'écran d'avant
       (famille, dates à confirmer, prochaine date, création) ; les
       en-têtes de colonne trient aussi, comme dans Linear ; un clic ouvre
       la page du permis ;
     · B5 : les projets sans permis, en lignes à 0 %, sans filtre
       seulement ; un clic ouvre la page du projet.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { ETATS, FAMILLES, NATURES_PROJET, PHASES, TYPES, prochaineDate, titrePermis, type Famille } from "@/components/espace/lorani/etats";
import { ouvrirProjet } from "@/components/espace/lorani/portes";
import type { Permis, Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import {
  CourbeLor,
  IconeAffichage,
  IconeCalendrierLor,
  IconeChercher,
  IconeFiltre,
  IconeJalon,
  IconeNouvelleVue,
  IconePlus,
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
import "./lor-projets.css";

const BASE = `${RACINE}/lorani`;

const RANG: Record<Famille, number> = { a_confirmer: 0, pieces: 1, instruction: 2, accordes: 3, clos: 4 };
/* la santé d'une ligne : sa famille, dans les cinq santés de Linear */
const SANTE: Record<Famille, { etat: SanteLor; libelle: string }> = {
  a_confirmer: { etat: "risque", libelle: "À confirmer" },
  pieces: { etat: "hors", libelle: "Pièces à fournir" },
  instruction: { etat: "bien", libelle: "En instruction" },
  accordes: { etat: "bien", libelle: "Accordé" },
  clos: { etat: "aucune", libelle: "Clos" },
};
/* l'icône de projet du sprite de Linear et sa couleur, selon la nature du projet */
const ICONE_NATURE: Record<Projet["nature"], { nom: NomIcone; couleur: string }> = {
  maison_individuelle: { nom: "Home", couleur: "lch(67.969% 19.321 31.72)" },
  logement_collectif: { nom: "Project", couleur: "#26b5ce" },
  erp: { nom: "Education", couleur: "#eb5757" },
  igh: { nom: "Project", couleur: "lch(48% 59.31 288.43)" },
  tertiaire: { nom: "Briefcase", couleur: "lch(67.969% 62.082 61.651)" },
  autre: { nom: "Project", couleur: "lch(80% 90 85)" },
};
/* l'avancement d'un permis sur ses sept étapes (dépôt, complétude, instruction, décision, affichage, recours, purge) */
const AVANCEMENT: Record<Permis["etat"], { statut: StatutLor; etapes: number }> = {
  a_deposer: { statut: "attente", etapes: 0 },
  completude: { statut: "cours", etapes: 1 },
  pieces_demandees: { statut: "cours", etapes: 1 },
  instruction: { statut: "cours", etapes: 2 },
  decision_a_confirmer: { statut: "cours", etapes: 3 },
  accorde: { statut: "cours", etapes: 4 },
  recours_en_cours: { statut: "cours", etapes: 5 },
  purge: { statut: "fait", etapes: 7 },
  refuse: { statut: "annule", etapes: 4 },
  rejete: { statut: "annule", etapes: 4 },
  annule: { statut: "annule", etapes: 0 },
  classe: { statut: "annule", etapes: 0 },
  hors_catalogue: { statut: "annule", etapes: 0 },
} as Record<Permis["etat"], { statut: StatutLor; etapes: number }>;

type Tri = "manuel" | "nom" | "sante" | "priorite" | "date" | "lues" | "statut";
type Onglet = "sante" | "projets" | "chefs";

const estFamille = (v: string | null): v is Famille => FAMILLES.some((f) => f.cle === v);
const VIDE_PROJET = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", code_insee: "", parcelles: "", nature: "maison_individuelle", marche_public: false };

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
const ecart = (de: string, a: string) => Math.round((Date.parse(`${a.slice(0, 10)}T12:00:00Z`) - Date.parse(`${de.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
/* la date cible à la manière de Linear : « 30 oct. », l'année quand elle n'est pas la courante (« 31 mars 2027 ») */
const fmtCourt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateCible = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return (d.getUTCFullYear() === new Date().getFullYear() ? fmtCourt : fmtLong).format(d);
};
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
/* le temps depuis la dernière mise à jour (« · 4d » dans Linear, ici dans l'info-bulle de la santé) */
const depuis = (iso: string) => {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "moins d'une heure";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "moins d'une heure";
  if (h < 24) return `${h} h`;
  const j = Math.floor(h / 24);
  return j < 30 ? `${j} j` : `${Math.floor(j / 30)} mois`;
};
const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

/* un menu ancré sous son bouton, aligné à droite, 4 px plus bas ; Échap et un clic dehors le ferment */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

export default function VueEnsemble() {
  const { source, pret, erreur, dossier, clientId, peutEcrire, agir, nommer, proposeesPar, familleDe } = useLorani();
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const toast = useToast();
  const aujourdhui = useMemo(() => jourLocal(), []);

  const filtre = estFamille(params.get("famille")) ? (params.get("famille") as Famille) : null;
  const lien = (famille: Famille | null) => {
    const p = new URLSearchParams(params.toString());
    if (famille) p.set("famille", famille);
    else p.delete("famille");
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };

  const [tri, setTri] = useState<{ cle: Tri; montant: boolean }>({ cle: "manuel", montant: true });
  const [closVisibles, setClosVisibles] = useState(true);
  const [volet, setVolet] = useState(false);
  const [onglet, setOnglet] = useState<Onglet>("sante");
  const [ouvertFiltre, setOuvertFiltre, menuFiltreRef] = useMenu();
  const [ouvertAffichage, setOuvertAffichage, menuAffichageRef] = useMenu();
  const [recherche, setRecherche] = useState("");

  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { a_confirmer: 0, pieces: 0, instruction: 0, accordes: 0, clos: 0 };
    for (const p of dossier.permis) c[familleDe(p)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- familleDe ne dépend que de proposeesPar
  }, [dossier.permis, proposeesPar]);

  const projetDe = (id: string) => dossier.projets.find((pr) => pr.id === id);
  const chefDe = (projetId: string) => dossier.membres.find((m) => m.projet_id === projetId && m.role_projet === "chef_projet")?.user_id ?? null;
  const urgence = (p: Permis): 0 | 1 | 2 | 3 | 4 => {
    const d = prochaineDate(p);
    if (!d) return 0;
    const j = ecart(aujourdhui, d);
    return j < 0 ? 1 : j <= 7 ? 2 : j <= 30 ? 3 : 4;
  };

  /* ——— la liste : filtre, tri manuel de l'écran d'avant, tri par colonne ——— */
  const visibles = useMemo(() => {
    const l = dossier.permis.filter((p) => (!filtre || familleDe(p) === filtre) && (closVisibles || familleDe(p) !== "clos"));
    const manuel = (a: Permis, b: Permis) => {
      const fa = RANG[familleDe(a)];
      const fb = RANG[familleDe(b)];
      if (fa !== fb) return fa - fb;
      const na = proposeesPar[a.id] ?? 0;
      const nb = proposeesPar[b.id] ?? 0;
      if (na !== nb) return nb - na;
      const da = prochaineDate(a) ?? "9999";
      const db = prochaineDate(b) ?? "9999";
      if (da !== db) return da < db ? -1 : 1;
      return b.cree_le.localeCompare(a.cree_le);
    };
    const cle = (p: Permis): string | number => {
      switch (tri.cle) {
        case "nom":
          return (projetDe(p.projet_id)?.nom ?? "").toLocaleLowerCase("fr");
        case "sante":
          return RANG[familleDe(p)];
        case "priorite": {
          const u = urgence(p);
          return u === 0 ? 9 : u;
        }
        case "date":
          return prochaineDate(p) ?? "9999";
        case "lues":
          return -(proposeesPar[p.id] ?? 0);
        case "statut":
          return AVANCEMENT[p.etat]?.etapes ?? 0;
        default:
          return 0;
      }
    };
    return [...l].sort((a, b) => {
      if (tri.cle === "manuel") return manuel(a, b);
      const ka = cle(a);
      const kb = cle(b);
      const s = ka < kb ? -1 : ka > kb ? 1 : 0;
      return (tri.montant ? s : -s) || manuel(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- familleDe ne dépend que de proposeesPar
  }, [dossier.permis, dossier.projets, filtre, proposeesPar, tri, closVisibles, aujourdhui]);

  const sansPermis = useMemo(() => (filtre ? [] : dossier.projets.filter((pr) => !dossier.permis.some((p) => p.projet_id === pr.id))), [dossier.projets, dossier.permis, filtre]);

  const trier = (cle: Tri) => setTri((t) => (t.cle === cle ? (t.montant ? { cle, montant: false } : { cle: "manuel", montant: true }) : { cle, montant: true }));

  /* ——— F1 : nouveau projet (G1), puis la page du projet ——— */
  const [ouvert, setOuvert] = useState(false);
  const [np, setNp] = useState(VIDE_PROJET);
  const [envoi, setEnvoi] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const ouvrirNouveau = () => {
    setNp(VIDE_PROJET);
    setErreurForm(null);
    setOuvert(true);
  };
  const soumettreProjet = async () => {
    const parcelles = np.parcelles.split(/[,;\n]+/).map((x) => x.trim().toUpperCase()).filter(Boolean);
    const v = { client_id: clientId, nom: np.nom.trim(), reference: np.reference.trim() || null, adresse: np.adresse.trim() || null, code_postal: np.code_postal.trim() || null, commune: np.commune.trim() || null, code_insee: np.code_insee.trim() || null, parcelles, nature: np.nature as Projet["nature"], marche_public: np.marche_public };
    let id = `local-projet-${Date.now()}`;
    setEnvoi(true);
    setErreurForm(null);
    try {
      await agir(
        async () => {
          id = await ouvrirProjet(v);
        },
        () => {
          const nouveau: Projet = { ...v, id, entite_id: dossier.projets[0]?.entite_id ?? "", phase: "esq", territoire: "metropole", actif: true, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() };
          return { ...dossier, projets: [nouveau, ...dossier.projets] };
        },
      );
      setOuvert(false);
      toast(`C'est fait. « ${v.nom} » est ouvert : saisissez son permis ou déposez un courrier de la mairie.`, "vert");
      routeur.push(`${BASE}/projets/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreurForm(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— cellules communes ——— */
  const celluleChef = (projetId: string) => {
    const chef = chefDe(projetId);
    const nom = chef ? nommer(chef) : null;
    return (
      <span className="lor-pj-c-chef">
        <span className={`lor-pj-prop${chef ? "" : " lor-pj-sans-chef"}`} title={nom ? `Chef de projet : ${nom}` : "Aucun chef de projet : les rappels n'ont pas de destinataire"}>
          {nom ? <span className="lor-pj-avatar" aria-hidden="true" style={{ marginLeft: 0 }}>{initiales(nom) || "?"}</span> : <IconeSansResponsable />}
          <span className="v2-sr" style={{ marginLeft: 0 }}>
            {nom ? `Chef de projet : ${nom}` : "Aucun chef de projet"}
          </span>
        </span>
      </span>
    );
  };

  /* ——— une ligne de permis ——— */
  const lignePermis = (p: Permis) => {
    const pr = projetDe(p.projet_id);
    const nomProjet = pr?.nom ?? "Projet";
    const f = familleDe(p);
    const sante = SANTE[f];
    const famille = FAMILLES.find((x) => x.cle === f);
    const n = proposeesPar[p.id] ?? 0;
    const implicite = p.etat === "decision_a_confirmer" ? p.calcul?.decision_implicite : undefined;
    const prochaine = prochaineDate(p);
    const jours = prochaine ? ecart(aujourdhui, prochaine) : null;
    const u = urgence(p);
    const libelleUrgence = jours === null ? "aucune date à venir" : jours < 0 ? `en retard depuis le ${dateCible(prochaine!)}` : jours === 0 ? "aujourd'hui" : `dans ${pluriel(jours, "jour")}`;
    const etape = (p.calcul?.etapes ?? []).find((e) => e.date === prochaine && (e.statut === "a_venir" || e.statut === "manque" || e.statut === "a_confirmer"));
    const jalon = implicite ? (implicite.nature === "tacite" ? "Accord tacite" : "Rejet implicite") : (etape?.libelle ?? null);
    const av = AVANCEMENT[p.etat] ?? AVANCEMENT.a_deposer;
    const part = av.etapes / 7;
    const purge = p.date_purge ?? p.calcul?.date_purge ?? null;
    const courbe = p.date_depot && purge && av.statut === "cours" ? Math.max(0, Math.min(1, ecart(p.date_depot, aujourdhui) / Math.max(1, ecart(p.date_depot, purge)))) : null;
    const nature = pr ? ICONE_NATURE[pr.nature] : ICONE_NATURE.autre;
    const etat = ETATS[p.etat] ?? ETATS.a_deposer;
    return (
      <li key={p.id}>
        <Link href={`${BASE}/permis/${encodeURIComponent(p.id)}`} className="lor-pj-grille lor-pj-ligne">
          <span className="lor-pj-c-case" aria-hidden="true">
            <span className="lor-pj-case" />
          </span>
          <span className="lor-pj-c-titre">
            <span className="lor-pj-nom-cell">
              <span className="lor-pj-icone" title={pr ? NATURES_PROJET[pr.nature] : undefined}>
                <IconeSprite nom={nature.nom} couleur={nature.couleur} />
              </span>
              <span className="lor-pj-textes">
                <span className="lor-pj-nom" title={`${titrePermis(p, nomProjet)} · projet ${nomProjet}`}>
                  {`${TYPES[p.type_autorisation].court} ${p.intitule ?? nomProjet}`}
                </span>
                {jalon ? (
                  <span className="lor-pj-jalon" title={`Prochaine étape : ${jalon}`}>
                    <IconeJalon />
                    <span>{jalon}</span>
                  </span>
                ) : null}
              </span>
            </span>
          </span>
          <span className="lor-pj-c-sante">
            <span className="lor-pj-sante" title={`${famille?.libelle} : ${famille?.sous} · ${etat.libelle} · mis à jour il y a ${depuis(p.maj_le)}`}>
              <span>
                <IconeSanteLor etat={sante.etat} />
                <b style={{ color: sante.etat === "aucune" ? "var(--lor-t3)" : `var(--lor-${sante.etat})` }}>
                  {sante.libelle}
                </b>
              </span>
            </span>
          </span>
          <span className="lor-pj-c-prio">
            <span className="lor-pj-prop" title={`Prochaine date : ${libelleUrgence}`}>
              <IconePrioriteLor niveau={u} titre={`Prochaine date : ${libelleUrgence}`} />
            </span>
          </span>
          {celluleChef(p.projet_id)}
          <span className="lor-pj-c-date">
            {prochaine ? (
              <span className="lor-pj-prop" title={implicite ? "Décision implicite" : "Prochaine étape"}>
                <IconeCalendrierLor passe={jours !== null && jours < 0} />
                <span>{dateCible(prochaine)}</span>
              </span>
            ) : null}
          </span>
          <span className="lor-pj-c-lues">
            <span className="lor-pj-prop" title={n ? `${pluriel(n, "date lue", "dates lues")} sur les courriers, à confirmer` : "Aucune date lue à confirmer"}>
              <span className="lor-pj-nombre" style={{ marginLeft: 0 }}>{n}</span>
            </span>
          </span>
          <span className="lor-pj-c-statut">
            <span className="lor-pj-prop" title={`${etat.libelle} · ${av.etapes} étape${av.etapes > 1 ? "s" : ""} sur 7`}>
              <IconeStatutLor statut={av.statut} part={part} />
              <span>{`${Math.round(part * 100)} %`}</span>
            </span>
            {courbe !== null ? (
              <span className="lor-pj-courbe">
                <CourbeLor part={part} prevu={courbe} />
              </span>
            ) : null}
          </span>
        </Link>
      </li>
    );
  };

  /* ——— une ligne de projet sans permis ——— */
  const ligneProjet = (pr: Projet) => {
    const n = proposeesPar[`projet:${pr.id}`] ?? 0;
    const nature = ICONE_NATURE[pr.nature];
    return (
      <li key={pr.id}>
        <Link href={`${BASE}/projets/${encodeURIComponent(pr.id)}`} className="lor-pj-grille lor-pj-ligne">
          <span className="lor-pj-c-case" aria-hidden="true">
            <span className="lor-pj-case" />
          </span>
          <span className="lor-pj-c-titre">
            <span className="lor-pj-nom-cell">
              <span className="lor-pj-icone" title={NATURES_PROJET[pr.nature]}>
                <IconeSprite nom={nature.nom} couleur={nature.couleur} />
              </span>
              <span className="lor-pj-textes">
                <span className="lor-pj-nom">{pr.nom}</span>
                <span className="lor-pj-jalon" title={["Aucun permis saisi pour ce projet", pr.commune].filter(Boolean).join(" · ")}>
                  <IconeJalon />
                  <span>{`Sans permis · ${PHASES[pr.phase]}`}</span>
                </span>
              </span>
            </span>
          </span>
          <span className="lor-pj-c-sante">
            <span className="lor-pj-sante" title={n ? "Dates lues à confirmer" : "Rien à suivre tant qu'aucun permis n'est saisi"}>
              <span>
                <IconeSanteLor etat={n ? "risque" : "aucune"} />
                <b style={{ color: n ? "var(--lor-risque)" : "var(--lor-t3)" }}>{n ? "À confirmer" : "Sans permis"}</b>
              </span>
            </span>
          </span>
          <span className="lor-pj-c-prio">
            <span className="lor-pj-prop" title="Aucune date à venir">
              <IconePrioriteLor niveau={0} titre="Aucune date à venir" />
            </span>
          </span>
          {celluleChef(pr.id)}
          <span className="lor-pj-c-date" />
          <span className="lor-pj-c-lues">
            <span className="lor-pj-prop" title={n ? `${pluriel(n, "date lue", "dates lues")} sans permis, à confirmer` : "Aucune date lue à confirmer"}>
              <span className="lor-pj-nombre" style={{ marginLeft: 0 }}>{n}</span>
            </span>
          </span>
          <span className="lor-pj-c-statut">
            <span className="lor-pj-prop" title="Aucun permis saisi">
              <IconeStatutLor statut="attente" part={0} />
              <span>0 %</span>
            </span>
          </span>
        </Link>
      </li>
    );
  };

  const actif = FAMILLES.find((f) => f.cle === filtre);
  const rien = pret && visibles.length === 0 && sansPermis.length === 0;
  const entete = (cle: Tri, libelle: string, classe: string) => (
    <span className={classe}>
      <button type="button" className="lor-pj-tri" data-trie={tri.cle === cle ? "" : undefined} onClick={() => trier(cle)} aria-label={`Trier par ${libelle.toLowerCase()}`}>
        <span>{libelle}</span>
        <IconeTri montant={tri.cle === cle && tri.montant} />
      </button>
    </span>
  );

  /* ——— le volet : santé (les familles), projets, chefs de projet ——— */
  const lignesVolet = (() => {
    if (onglet === "sante") {
      return FAMILLES.map((f) => ({ cle: f.cle, icone: <IconeSanteLor etat={SANTE[f.cle].etat} />, libelle: f.libelle, titre: f.sous, compte: comptes[f.cle], href: lien(filtre === f.cle ? null : f.cle), actif: filtre === f.cle }));
    }
    if (onglet === "projets") {
      return dossier.projets.map((pr) => ({ cle: pr.id, icone: <IconeSprite nom={ICONE_NATURE[pr.nature].nom} couleur={ICONE_NATURE[pr.nature].couleur} />, libelle: pr.nom, titre: NATURES_PROJET[pr.nature], compte: dossier.permis.filter((p) => p.projet_id === pr.id).length, href: `${BASE}/projets/${encodeURIComponent(pr.id)}`, actif: false }));
    }
    const parChef = new Map<string, number>();
    let sans = 0;
    for (const p of dossier.permis) {
      const c = chefDe(p.projet_id);
      if (c) parChef.set(c, (parChef.get(c) ?? 0) + 1);
      else sans++;
    }
    return [
      ...[...parChef.entries()].map(([id, compte]) => ({ cle: id, icone: <span className="lor-pj-avatar" aria-hidden="true">{initiales(nommer(id)) || "?"}</span>, libelle: nommer(id), titre: "Chef de projet", compte, href: null as string | null, actif: false })),
      ...(sans ? [{ cle: "sans", icone: <IconeSansResponsable />, libelle: "Sans chef de projet", titre: "Les rappels n'ont pas de destinataire", compte: sans, href: null as string | null, actif: false }] : []),
    ];
  })();

  return (
    <div className="lor lor-pj">
      <h1 className="v2-sr">Calendrier des permis</h1>
      <header>
        <div className="lor-pj-l1">
          <div className="lor-pj-titre">
            <h2>Permis</h2>
          </div>
          <button type="button" className="lor-texte-btn lor-pj-nouveau" disabled={!peutEcrire} onClick={ouvrirNouveau} aria-label="Nouveau projet" title={peutEcrire ? undefined : "Vous voyez ces projets sans pouvoir y écrire."}>
            <IconePlus />
            <span>Nouveau projet</span>
          </button>
        </div>
        <div className="lor-pj-l2">
          <nav className="lor-pj-vues" aria-label="Vues">
            <Link href={lien(null)} className="lor-vue" data-actif={!filtre ? "" : undefined} aria-current={!filtre ? "page" : undefined} scroll={false}>
              Tous les permis
            </Link>
            {actif ? (
              <Link href={lien(actif.cle)} className="lor-vue" data-actif="" aria-current="page" scroll={false} title={actif.sous}>
                {`${actif.libelle} · ${comptes[actif.cle]}`}
              </Link>
            ) : null}
            <button type="button" className="lor-rond lor-rond--sourd" aria-label="Ajouter une vue : filtrer par famille" title="Filtrer par famille" onClick={() => setOuvertFiltre(true)}>
              <IconeNouvelleVue />
            </button>
          </nav>
          <div className="lor-pj-outils">
            <div ref={menuFiltreRef}>
              <button type="button" className="lor-rond lor-rond--plein" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvertFiltre} onClick={() => setOuvertFiltre((o) => !o)}>
                <IconeFiltre />
              </button>
              {ouvertFiltre ? (
                <div className="lor-menu" role="dialog" aria-label="Filtrer" style={{ right: 2.5, top: 40 }}>
                  <div className="lor-menu-champ">
                    <input autoFocus placeholder="Filtrer…" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Filtrer les familles" />
                    <span className="lor-kbd">F</span>
                  </div>
                  <ul className="lor-menu-liste" role="listbox" aria-label="Familles">
                    {[{ cle: null, libelle: "Tous les permis", sous: "toutes les familles" }, ...FAMILLES]
                      .filter((f) => !recherche.trim() || f.libelle.toLocaleLowerCase("fr").includes(recherche.trim().toLocaleLowerCase("fr")))
                      .map((f) => (
                        <li key={f.cle ?? "tous"} role="option" aria-selected={filtre === f.cle}>
                          <Link href={lien(f.cle as Famille | null)} scroll={false} className="lor-option" data-actif={filtre === f.cle ? "" : undefined} onClick={() => setOuvertFiltre(false)} title={f.sous}>
                            {f.cle ? <IconeSanteLor etat={SANTE[f.cle as Famille].etat} /> : <IconeChercher />}
                            <span className="lor-option-libelle">{f.libelle}</span>
                            <span className="lor-option-droite">{f.cle ? comptes[f.cle as Famille] : dossier.permis.length}</span>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div ref={menuAffichageRef}>
              <button type="button" className="lor-rond lor-rond--plein" aria-label="Affichage" title="Affichage" aria-expanded={ouvertAffichage} onClick={() => setOuvertAffichage((o) => !o)}>
                <IconeAffichage />
              </button>
              {ouvertAffichage ? (
                <div className="lor-menu lor-pj-affichage" role="dialog" aria-label="Affichage" style={{ right: 2.5, top: 40 }}>
                  <label className="lor-pj-aff-ligne">
                    Tri
                    <select value={tri.cle} onChange={(e) => setTri({ cle: e.target.value as Tri, montant: true })}>
                      <option value="manuel">Ce qui presse d&apos;abord</option>
                      <option value="nom">Nom</option>
                      <option value="sante">Santé</option>
                      <option value="priorite">Urgence</option>
                      <option value="date">Prochaine date</option>
                      <option value="lues">Dates lues</option>
                      <option value="statut">Avancement</option>
                    </select>
                  </label>
                  <label className="lor-pj-aff-ligne">
                    Permis clos
                    <select value={closVisibles ? "tous" : "masques"} onChange={(e) => setClosVisibles(e.target.value === "tous")}>
                      <option value="tous">Affichés</option>
                      <option value="masques">Masqués</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
            <button type="button" className="lor-rond lor-rond--plein" aria-label={volet ? "Fermer le volet" : "Ouvrir le volet"} title={volet ? "Fermer le volet" : "Ouvrir le volet"} aria-pressed={volet} onClick={() => setVolet((v) => !v)}>
              <IconeVolet ouvert={volet} />
            </button>
          </div>
        </div>
      </header>

      {erreur && source === "reelle" ? (
        <p className="lor-pj-note" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}

      <div className="lor-pj-corps">
        <section className="lor-pj-liste" aria-label={actif ? `Permis : ${actif.libelle}` : "Tous les permis"}>
          {!pret ? (
            <p className="lor-pj-vide" role="status">
              Lecture de vos projets…
            </p>
          ) : rien ? (
            <div className="lor-pj-vide">
              <strong>{filtre ? "Rien dans cette famille" : "Aucun projet"}</strong>
              {filtre ? `Aucun permis « ${actif?.libelle} » pour l'instant.` : "Ouvrez un projet, puis saisissez son permis ou déposez le récépissé : le calendrier se calcule."}
              {!filtre && peutEcrire ? (
                <button type="button" className="lor-texte-btn" onClick={ouvrirNouveau}>
                  <IconePlus />
                  Nouveau projet
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="lor-pj-grille lor-pj-entetes">
                {entete("nom", "Nom", "lor-pj-c-titre")}
                {entete("sante", "Santé", "lor-pj-c-sante")}
                {entete("priorite", "Priorité", "lor-pj-c-prio")}
                <span className="lor-pj-c-chef lor-pj-entete-fixe">Chef</span>
                {entete("date", "Prochaine date", "lor-pj-c-date")}
                <span className="lor-pj-c-lues lor-pj-entete-fixe" title="Dates lues sur les courriers, à confirmer">
                  Lues
                </span>
                {entete("statut", "Statut", "lor-pj-c-statut")}
              </div>
              <ul>
                {visibles.map(lignePermis)}
                {sansPermis.map(ligneProjet)}
              </ul>
            </>
          )}
        </section>

        {volet ? (
          <aside className="lor-pj-volet" aria-label="Répartition">
            <div className="lor-pj-volet-carte">
              <div className="lor-pj-volet-onglets" role="tablist" aria-label="Répartition">
                {(
                  [
                    ["sante", "Santé"],
                    ["projets", "Projets"],
                    ["chefs", "Chefs de projet"],
                  ] as [Onglet, string][]
                ).map(([cle, libelle]) => (
                  <button key={cle} type="button" role="tab" aria-selected={onglet === cle} className="lor-pj-volet-onglet" onClick={() => setOnglet(cle)}>
                    {libelle}
                  </button>
                ))}
              </div>
              <div className="lor-pj-volet-lignes" role="tabpanel">
                {lignesVolet.map((l) =>
                  l.href ? (
                    <Link key={l.cle} href={l.href} scroll={false} className="lor-pj-volet-ligne" data-actif={l.actif ? "" : undefined} title={l.titre}>
                      <span>
                        {l.icone}
                        <span>{l.libelle}</span>
                      </span>
                      <span>{pret ? l.compte : ""}</span>
                    </Link>
                  ) : (
                    <div key={l.cle} className="lor-pj-volet-ligne" title={l.titre}>
                      <span>
                        {l.icone}
                        <span>{l.libelle}</span>
                      </span>
                      <span>{pret ? l.compte : ""}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      {/* ——— F1 : nouveau projet ——— */}
      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <FolderPlus width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Le lieu du terrain fixe les règles : le code INSEE ou le code postal dit si le code de l&apos;urbanisme national s&apos;applique.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nom du projet <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={np.nom} onChange={(e) => setNp((s) => ({ ...s, nom: e.target.value }))} maxLength={200} placeholder="Maison Lemoine" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence interne
                  <input className="rv-champ" value={np.reference} onChange={(e) => setNp((s) => ({ ...s, reference: e.target.value }))} maxLength={60} placeholder="26-014" />
                </label>
                <label className="rv-libelle">
                  Nature
                  <select className="rv-champ" value={np.nature} onChange={(e) => setNp((s) => ({ ...s, nature: e.target.value }))}>
                    {(Object.keys(NATURES_PROJET) as Projet["nature"][]).map((n) => (
                      <option key={n} value={n}>
                        {NATURES_PROJET[n]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">
                Adresse du terrain
                <input className="rv-champ" value={np.adresse} onChange={(e) => setNp((s) => ({ ...s, adresse: e.target.value }))} maxLength={300} />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={np.code_postal} onChange={(e) => setNp((s) => ({ ...s, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) }))} placeholder="44000" />
                </label>
                <label className="rv-libelle">
                  Commune
                  <input className="rv-champ" value={np.commune} onChange={(e) => setNp((s) => ({ ...s, commune: e.target.value }))} maxLength={120} placeholder="Nantes" />
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Code INSEE
                  <input className="rv-champ" value={np.code_insee} onChange={(e) => setNp((s) => ({ ...s, code_insee: e.target.value.toUpperCase().slice(0, 5) }))} placeholder="44109" />
                </label>
                <label className="rv-libelle">
                  Parcelles
                  <input className="rv-champ" value={np.parcelles} onChange={(e) => setNp((s) => ({ ...s, parcelles: e.target.value }))} placeholder="AB 123, AB 124" />
                </label>
              </div>
              <label className="lor-pj-coche">
                <input type="checkbox" checked={np.marche_public} onChange={(e) => setNp((s) => ({ ...s, marche_public: e.target.checked }))} /> Marché public (maîtrise d&apos;ouvrage publique)
              </label>
              {erreurForm ? (
                <Avis teinte="rouge" role="alert">
                  {erreurForm}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!np.nom.trim() || !/^\d{5}$/.test(np.code_postal) || envoi || !peutEcrire} onClick={soumettreProjet}>
              {envoi ? <Loader variant="spin" /> : null} Ouvrir le projet
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
