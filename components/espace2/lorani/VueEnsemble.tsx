"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI — la vue d'ensemble des permis (29/10/2026, refonte des pages
   métiers)

   La liste des Initiatives de Linear, au 1:1 : relevé docs/refonte-metiers/
   releves/linear-initiatives-liste.md, mesures dans components/espace2/lin/
   linear-initiatives-liste.css (préfixe lil-).

   Ce qu'elle reprend de l'écran d'avant (components/espace/lorani/EcranLorani,
   inventaire docs/refonte-metiers/lorani.md) :
     · B1 : le titre, « Nouveau projet » (F1 / G1 : mêmes champs, même
       validation, ouvrirProjet par useLorani().agir, puis la page du
       projet) ; le ruban exemple / réel est dans le cadre de l'espace 2 ;
     · B2 : les cinq familles → les onglets, avec leur compte ; le filtre
       est dans l'adresse (?famille=), « Tous les permis » le retire. Les
       comptes attendent la base réelle (O14 : plus de chiffres d'exemple
       pendant la lecture) ;
     · B3 : l'erreur de la base réelle, sous les onglets ;
     · B4 : une ligne par permis — projet et type (titrePermis), résumé
       (décision implicite, commune, numéro ou dépôt, dates lues du projet
       à rattacher), statut (ETATS), urgence de la prochaine date, chef de
       projet, prochaine date (prochaineDate), dates lues à confirmer,
       santé (la famille), purge ; même tri que l'écran d'avant (famille,
       dates à confirmer, prochaine date, création) ; un clic ouvre la
       page du permis ;
     · B5 : les projets sans permis, dans un groupe à part, sans filtre
       seulement ; leurs dates lues sans permis y sont comptées (O8) ;
       un clic ouvre la page du projet.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderPlus, Inbox, Receipt, Settings2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, type Teinte } from "@/components/espace/ui";
import { dateCourte } from "@/components/espace/format";
import { ETATS, FAMILLES, NATURES_PROJET, PHASES, TYPES, prochaineDate, titrePermis, type Famille } from "@/components/espace/lorani/etats";
import { ouvrirProjet } from "@/components/espace/lorani/portes";
import type { Permis, Projet } from "@/components/espace/lorani/types";
import { IconePriorite } from "../lin/Lin";
import { IconeCalendrier, IconeDocument, IconeEnveloppe, IconeSante, type Sante } from "../lin/icones";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-initiatives-liste.css";

const BASE = `${RACINE}/lorani`;

const RANG: Record<Famille, number> = { a_confirmer: 0, pieces: 1, instruction: 2, accordes: 3, clos: 4 };
/* la santé d'une ligne : sa famille, dans les icônes et les teintes du gabarit */
const SANTE: Record<Famille, { etat: Sante; teinte: string }> = {
  a_confirmer: { etat: "risque", teinte: "jaune" },
  pieces: { etat: "hors", teinte: "rouge" },
  instruction: { etat: "bien", teinte: "bleu" },
  accordes: { etat: "bien", teinte: "vert" },
  clos: { etat: "neutre", teinte: "gris" },
};
/* les teintes de etats.ts dans celles du gabarit */
const TEINTE: Record<Teinte, string> = { vert: "vert", ambre: "jaune", rouge: "rouge", bleu: "bleu", gris: "gris", noir: "gris" };
const estFamille = (v: string | null): v is Famille => FAMILLES.some((f) => f.cle === v);

const VIDE_PROJET = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", code_insee: "", parcelles: "", nature: "maison_individuelle", marche_public: false };

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
/* jours entre deux dates « AAAA-MM-JJ » */
const ecart = (de: string, a: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
const date = (iso: string) => dateCourte(`${iso}T12:00:00`);
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

/* l'anneau du statut, 16 : plein une fois le permis purgé ou clos, à moitié en cours, vide à déposer */
function IconeEtat({ etat }: { etat: Permis["etat"] | "sans" }) {
  const plein = ["purge", "refuse", "rejete", "annule", "classe", "hors_catalogue"].includes(etat);
  const vide = etat === "a_deposer" || etat === "sans";
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={etat === "sans" ? "1.6 1.8" : undefined} />
      {plein ? <circle cx="8" cy="8" r="3.5" fill="currentColor" /> : vide ? null : <path d="M8 4.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />}
    </svg>
  );
}

/* « non attribué » de Linear : un rond pointillé et une silhouette, 18 */
function IconePersonne() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="9" cy="7.2" r="2.3" fill="currentColor" />
      <path d="M5.2 13.2c.5-1.9 2-2.9 3.8-2.9s3.3 1 3.8 2.9z" fill="currentColor" />
    </svg>
  );
}

function IconeDossier() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.8 4.2c0-1 .8-1.8 1.8-1.8h2.6l1.6 1.6h4.6c1 0 1.8.8 1.8 1.8v6.4c0 1-.8 1.8-1.8 1.8H3.6c-1 0-1.8-.8-1.8-1.8z" fill="currentColor" />
    </svg>
  );
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

  /* ——— la liste : comptes, tri, projets sans permis (EcranLorani, B2, B4, B5) ——— */
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { a_confirmer: 0, pieces: 0, instruction: 0, accordes: 0, clos: 0 };
    for (const p of dossier.permis) c[familleDe(p)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- familleDe ne dépend que de proposeesPar
  }, [dossier.permis, proposeesPar]);

  const visibles = useMemo(() => {
    const l = dossier.permis.filter((p) => !filtre || familleDe(p) === filtre);
    return [...l].sort((a, b) => {
      const fa = RANG[familleDe(a)];
      const fb = RANG[familleDe(b)];
      if (fa !== fb) return fa - fb;
      /* ce qu'un membre doit lire sur un courrier passe avant tout */
      const na = proposeesPar[a.id] ?? 0;
      const nb = proposeesPar[b.id] ?? 0;
      if (na !== nb) return nb - na;
      const da = prochaineDate(a) ?? "9999";
      const db = prochaineDate(b) ?? "9999";
      if (da !== db) return da < db ? -1 : 1;
      return b.cree_le.localeCompare(a.cree_le);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- familleDe ne dépend que de proposeesPar
  }, [dossier.permis, filtre, proposeesPar]);

  const sansPermis = useMemo(() => (filtre ? [] : dossier.projets.filter((pr) => !dossier.permis.some((p) => p.projet_id === pr.id))), [dossier.projets, dossier.permis, filtre]);
  const projetDe = (id: string) => dossier.projets.find((pr) => pr.id === id);
  const chefDe = (projetId: string) => dossier.membres.find((m) => m.projet_id === projetId && m.role_projet === "chef_projet")?.user_id ?? null;

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

  /* ——— une ligne de permis ——— */
  const lignePermis = (p: Permis) => {
    const pr = projetDe(p.projet_id);
    const nomProjet = pr?.nom ?? "Projet";
    const f = familleDe(p);
    const e = ETATS[p.etat] ?? ETATS.a_deposer;
    const n = proposeesPar[p.id] ?? 0;
    const duProjet = proposeesPar[`projet:${p.projet_id}`] ?? 0;
    const implicite = p.etat === "decision_a_confirmer" ? p.calcul?.decision_implicite : undefined;
    const prochaine = prochaineDate(p);
    const jours = prochaine ? ecart(aujourdhui, prochaine) : null;
    const urgence: 0 | 1 | 3 | 4 = jours === null ? 0 : jours < 0 ? 4 : jours <= 7 ? 3 : 1;
    const libelleUrgence = jours === null ? "Aucune date à venir" : jours < 0 ? `En retard depuis le ${date(prochaine!)}` : jours === 0 ? "Aujourd'hui" : jours <= 7 ? `Dans ${pluriel(jours, "jour")}` : `Le ${date(prochaine!)}`;
    const chef = chefDe(p.projet_id);
    const purge = p.etat === "purge";
    /* purgé : le jour où le chantier ne craint plus rien ; sinon la purge calculée, si le socle l'a posée */
    const purgeLe = (purge ? (p.calcul?.chantier_sans_risque_le ?? p.date_purge) : (p.date_purge ?? p.calcul?.date_purge)) ?? null;
    const resume = [
      implicite ? `${implicite.nature === "tacite" ? "Accord tacite" : "Rejet implicite"} né le ${date(implicite.date)}` : null,
      pr?.commune ?? null,
      p.numero ? `n° ${p.numero}` : p.date_depot ? `déposé le ${date(p.date_depot)}` : "pas encore déposé",
      duProjet ? `${pluriel(duProjet, "date lue", "dates lues")} sur le projet, à rattacher` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const sante = SANTE[f];
    const famille = FAMILLES.find((x) => x.cle === f);
    return (
      <li key={p.id}>
        <Link href={`${BASE}/permis/${encodeURIComponent(p.id)}`} className="lil-ligne">
          <span className="lil-c-indent" aria-hidden="true" />
          <span className="lil-c-case" aria-hidden="true" />
          <span className="lil-c-titre">
            <span className="lil-icone">
              <IconeDocument />
            </span>
            <span className="lil-textes">
              <span className="lil-nom">
                <span>{nomProjet}</span>
                <span className="lil-type">{p.intitule ? titrePermis(p, nomProjet) : TYPES[p.type_autorisation].libelle}</span>
              </span>
              <span className="lil-resume">{resume}</span>
            </span>
          </span>
          <span className="lil-c-statut">
            <span className="lil-pilule lil-statut" data-teinte={TEINTE[e.teinte]} title={e.libelle}>
              <IconeEtat etat={p.etat} />
              <span>{e.court}</span>
            </span>
          </span>
          <span className="lil-c-urgence">
            <span className="lil-rond" data-urgent={urgence === 4 ? "" : undefined} title={`Prochaine date : ${libelleUrgence.toLowerCase()}`}>
              <IconePriorite niveau={urgence} titre={`Prochaine date : ${libelleUrgence.toLowerCase()}`} />
            </span>
          </span>
          <span className="lil-c-resp">
            <span className="lil-rond lil-rond--resp" title={chef ? `Chef de projet : ${nommer(chef)}` : "Aucun chef de projet : les rappels n'ont pas de destinataire"}>
              {chef ? <span className="lil-avatar">{initiales(nommer(chef)) || "?"}</span> : <IconePersonne />}
              <span className="v2-sr">{chef ? `Chef de projet : ${nommer(chef)}` : "Aucun chef de projet"}</span>
            </span>
          </span>
          <span className="lil-c-date">
            {prochaine ? (
              <span className="lil-pilule lil-date" data-passe={jours !== null && jours < 0 ? "" : undefined} title={implicite ? "Décision implicite" : "Prochaine étape"}>
                <IconeCalendrier passe={jours !== null && jours < 0} />
                <span>{date(prochaine)}</span>
              </span>
            ) : null}
          </span>
          <span className="lil-c-lues">
            <span className="lil-compteur" data-plein={n ? "" : undefined} title={n ? `${pluriel(n, "date lue", "dates lues")} sur les courriers, à confirmer` : "Aucune date lue à confirmer"}>
              <IconeEnveloppe />
              {n}
            </span>
          </span>
          <span className="lil-c-sante">
            <span className="lil-sante" data-teinte={sante.teinte} title={`${famille?.libelle} : ${famille?.sous}`}>
              <IconeSante etat={sante.etat} titre={famille?.libelle} />
            </span>
          </span>
          <span className="lil-c-purge">
            {purgeLe ? (
              <span className="lil-purge" data-teinte={purge ? "vert" : "gris"} data-prevue={purge ? undefined : ""} title={purge ? `Chantier sans risque depuis le ${date(purgeLe)}` : `Purgé de tout recours le ${date(purgeLe)}, si rien ne change`}>
                {date(purgeLe)}
              </span>
            ) : null}
          </span>
          <span className="lil-c-fin" aria-hidden="true" />
        </Link>
      </li>
    );
  };

  /* ——— une ligne de projet sans permis ——— */
  const ligneProjet = (pr: Projet) => {
    const n = proposeesPar[`projet:${pr.id}`] ?? 0;
    const chef = chefDe(pr.id);
    return (
      <li key={pr.id}>
        <Link href={`${BASE}/projets/${encodeURIComponent(pr.id)}`} className="lil-ligne">
          <span className="lil-c-indent" aria-hidden="true" />
          <span className="lil-c-case" aria-hidden="true" />
          <span className="lil-c-titre">
            <span className="lil-icone">
              <IconeDossier />
            </span>
            <span className="lil-textes">
              <span className="lil-nom">
                <span>{pr.nom}</span>
                {pr.reference ? <span className="lil-type">{pr.reference}</span> : null}
              </span>
              <span className="lil-resume">{["Aucun permis saisi pour ce projet", `Phase : ${PHASES[pr.phase]}`, pr.commune, NATURES_PROJET[pr.nature]].filter(Boolean).join(" · ")}</span>
            </span>
          </span>
          <span className="lil-c-statut">
            <span className="lil-pilule lil-statut" data-teinte="gris">
              <IconeEtat etat="sans" />
              <span>Sans permis</span>
            </span>
          </span>
          <span className="lil-c-urgence">
            <span className="lil-rond">
              <IconePriorite niveau={0} titre="Aucune date à venir" />
            </span>
          </span>
          <span className="lil-c-resp">
            <span className="lil-rond lil-rond--resp" title={chef ? `Chef de projet : ${nommer(chef)}` : "Aucun chef de projet"}>
              {chef ? <span className="lil-avatar">{initiales(nommer(chef)) || "?"}</span> : <IconePersonne />}
              <span className="v2-sr">{chef ? `Chef de projet : ${nommer(chef)}` : "Aucun chef de projet"}</span>
            </span>
          </span>
          <span className="lil-c-date" />
          <span className="lil-c-lues">
            <span className="lil-compteur" data-plein={n ? "" : undefined} title={n ? `${pluriel(n, "date lue", "dates lues")} sans permis, à confirmer` : "Aucune date lue à confirmer"}>
              <IconeEnveloppe />
              {n}
            </span>
          </span>
          <span className="lil-c-sante">
            <span className="lil-sante" data-teinte={n ? "jaune" : "gris"} title={n ? "Dates lues à confirmer" : "Rien à suivre tant qu'aucun permis n'est saisi"}>
              <IconeSante etat={n ? "risque" : "neutre"} titre={n ? "À confirmer" : "Sans permis"} />
            </span>
          </span>
          <span className="lil-c-purge" />
          <span className="lil-c-fin" aria-hidden="true" />
        </Link>
      </li>
    );
  };

  const actif = FAMILLES.find((f) => f.cle === filtre);
  const rien = pret && visibles.length === 0 && sansPermis.length === 0;

  return (
    <div className="lin lil">
      <h1 className="v2-sr">Calendrier des permis</h1>
      <header className="lin-tete">
        <h2 className="lin-tete-titre lil-titre">Permis</h2>
        <div className="lin-tete-droite">
          <button type="button" className="lil-nouveau" disabled={!peutEcrire} onClick={ouvrirNouveau} aria-label="Nouveau projet" title={peutEcrire ? undefined : "Vous voyez ces projets sans pouvoir y écrire."}>
            <FolderPlus aria-hidden="true" />
            <span>Nouveau projet</span>
          </button>
        </div>
      </header>

      <div className="lil-outils">
        <nav className="lil-onglets" aria-label="Familles de permis">
          {FAMILLES.map((f) => (
            <Link key={f.cle} href={lien(f.cle)} className="lin-onglet" data-actif={filtre === f.cle ? "" : undefined} aria-current={filtre === f.cle ? "page" : undefined} title={f.sous} scroll={false}>
              {f.libelle}
              <span className="lil-compte">{pret ? comptes[f.cle] : ""}</span>
            </Link>
          ))}
          <Link href={lien(null)} className="lin-onglet" data-actif={!filtre ? "" : undefined} aria-current={!filtre ? "page" : undefined} scroll={false}>
            Tous les permis
            <span className="lil-compte">{pret ? dossier.permis.length : ""}</span>
          </Link>
        </nav>
        <div className="lil-ronds">
          <Link href={`${BASE}/courrier`} className="lin-btn lin-btn--plein" aria-label="Courrier à ranger" title="Courrier à ranger">
            <Inbox aria-hidden="true" />
          </Link>
          <Link href={`${BASE}/honoraires`} className="lin-btn lin-btn--plein" aria-label="Honoraires et temps" title="Honoraires et temps">
            <Receipt aria-hidden="true" />
          </Link>
          <Link href={`${BASE}/reglages`} className="lin-btn lin-btn--plein" aria-label="Réglages des projets" title="Réglages des projets">
            <Settings2 aria-hidden="true" />
          </Link>
        </div>
      </div>

      {erreur && source === "reelle" ? (
        <p className="lil-note" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}

      {!pret ? (
        <p className="lil-vide" role="status">
          Lecture de vos projets…
        </p>
      ) : rien ? (
        <div className="lil-vide">
          <strong>{filtre ? "Rien dans cette famille" : "Aucun projet"}</strong>
          {filtre ? `Aucun permis « ${actif?.libelle} » pour l'instant.` : "Ouvrez un projet, puis saisissez son permis ou déposez le récépissé : le calendrier se calcule."}
          {!filtre && peutEcrire ? (
            <div>
              <button type="button" className="lil-nouveau" onClick={ouvrirNouveau}>
                <FolderPlus aria-hidden="true" />
                <span>Nouveau projet</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <section className="lil-liste" aria-label={actif ? `Permis : ${actif.libelle}` : "Tous les permis"}>
          <div className="lil-tete" aria-hidden="true">
            <span className="lil-c-indent" />
            <span className="lil-c-case" />
            <span className="lil-c-titre">Permis</span>
            <span className="lil-c-statut">Statut</span>
            <span className="lil-c-urgence">Urgence</span>
            <span className="lil-c-resp">Resp.</span>
            <span className="lil-c-date">Prochaine date</span>
            <span className="lil-c-lues">Dates lues</span>
            <span className="lil-c-sante">Santé</span>
            <span className="lil-c-purge">Purge</span>
            <span className="lil-c-fin" />
          </div>
          {visibles.length ? <ul className="lil-lignes">{visibles.map(lignePermis)}</ul> : null}
          {sansPermis.length ? (
            <>
              <h3 className="lil-groupe">
                Projets sans permis <span className="lil-compte">{sansPermis.length}</span>
              </h3>
              <ul className="lil-lignes">{sansPermis.map(ligneProjet)}</ul>
            </>
          ) : null}
        </section>
      )}

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
              <label className="lil-coche">
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
