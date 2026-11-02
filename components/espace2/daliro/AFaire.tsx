"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › À faire — My issues de Linear, au 1:1 (02/11/2026, règles de
   Teo : docs/refonte-metiers/REGLES.md). Relevé :
   docs/refonte-metiers/releves/linear-my-issues.md (29/10 clair, complément
   du 01/11 sombre et clair). Styles : ./dal.css (carte, onglets, ronds) et
   ./dal-mes.css (préfixe dal-mi-).

   Une tâche par chose à faire, calculée sur les tableaux de tous les
   chantiers (useDaliro().demanderTous() en base réelle), sans écrire
   aucune donnée :
     · passage à confirmer à J-2 : confirmation demandée, sans réponse ou
       déclinée, d'un sous-traitant, passage prévu → « Noter la réponse »
       (G22, mêmes conditions que le planning) ;
     · passage commencé, chantier ouvert ou suspendu → « Noter fait » (G24) ;
     · avenant soumis dont la validation est approuvée → « Signer » (G34) ;
     · situation en préparation ou refusée → « Soumettre » (G42), situation
       soumise et approuvée → « Valider » (G43).
   Rangées dans les briques de My issues :
     · onglets « À faire », « En attente » (ce qui attend la validation
       d'un autre, dans « À valider »), « Tous » — à la place de Assigned,
       Created, Subscribed, Activity ;
     · groupes de 36 : « En retard » (la place de « Urgent issues »), puis
       les semaines comme les cycles de Linear (« Cette semaine 2 nov. →
       8 nov. »), et « Plus tard » ; Affichage les groupe par chantier ;
       Filtre garde un chantier ;
     · ligne de 44 : priorité (en retard = urgente, signer ou valider =
       haute, relancer = moyenne, noter fait ou soumettre = basse, en
       attente = sans), référence du chantier à la place de OME-n, état,
       titre, puces (nature, chantier, échéance dépassée), avatar de qui
       est concerné, date ;
     · la tâche ouverte (?tache=, ou ?passage= : l'aiguillage y envoie les
       repères btp_passages) s'affiche dans le volet de détails (bouton
       « Open details » de la référence, ⌘ I) : propriétés, puis le geste,
       un lien vers la fiche du chantier au bon onglet (les fenêtres de ces
       gestes vivent dans la fiche).
   ↑/↓ changent de tâche, Échap referme.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { CONFIRMATIONS, libelleEnvoi } from "@/components/espace/daliro/etats";
import { ouverte as fonctionOuverte } from "@/components/espace/daliro/fonctions";
import type { Chantier, Passage, Tableau } from "@/components/espace/daliro/types";
import { useAujourdhui } from "../horloge";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { completerExemple } from "./exemplesAFaire";
import "./dal-mes.css";

const CHEMIN = `${RACINE}/daliro/a-faire`;
const fiche = (id: string, suite = "") => `${RACINE}/daliro/chantiers/${encodeURIComponent(id)}${suite}`;
const PLANNING = "?onglet=terrain#planning";
const AVENANTS = "?onglet=argent#avenants";
const SITUATIONS = "?onglet=argent#situations";

type Vue = "a_faire" | "attente" | "tous";
type Groupement = "semaine" | "chantier";
type Genre = "confirmer" | "fait" | "signer" | "soumettre" | "valider" | "avenant_attente" | "situation_attente" | "passage";

type Propriete = { libelle: string; valeur: string; icone: NomDalIcone; lien?: string };
type Tache = {
  cle: string;
  genre: Genre;
  /* à faire par le bureau (sinon : en attente d'un autre, ou rien à faire) */
  aFaire: boolean;
  chantier: Chantier;
  ref: string;
  titre: string;
  /* AAAA-MM-JJ, pour le tri */
  quand: string;
  enRetard: boolean;
  qui: string | null;
  passageId?: string;
  geste: string;
  lien: string;
  dateLigne: string;
  description: string;
  proprietes: Propriete[];
};

/* les couleurs d'étiquettes et d'avatars de Linear (relevé, « Couleurs d'étiquettes relevées ») */
const ROUGE = "rgb(235, 87, 87)";
const BLEU = "rgb(38, 181, 206)";
const VERT = "rgb(76, 183, 130)";
const VIOLET = "lch(48 59.31 288.43)";
const BEIGE = "lch(67.969 19.321 31.72)";
const COULEURS = [ROUGE, BLEU, VERT, VIOLET, BEIGE];
const couleurDe = (s: string) => COULEURS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((x) => /\p{L}/u.test(x))
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

/* les dates calendaires se comparent en jours entiers (UTC des deux côtés) */
const jours = (de: string, a: string) => Math.round((Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${de.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
function relatif(date: string, jour: string): string {
  const n = jours(jour, date);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 0 ? `dans ${n} jours` : `il y a ${-n} jours`;
}
const isoLocal = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const periode = (p: Passage) => (p.fin && p.fin !== p.debut ? `du ${dateCourte(p.debut)} au ${dateCourte(p.fin)}` : `le ${dateCourte(p.debut)}`);
const nomTache = (p: Passage) => p.tache ?? "Passage sans tâche";
const quiDe = (p: Passage) => p.intervenant_nom ?? p.intervenant_lu ?? "l'intervenant";
const VALIDATION: Record<string, string> = { en_attente: "Dans « À valider »", approuvee: "Approuvée", executee: "Exécutée", rejetee: "Rejetée" };

/* ——— les tâches d'un chantier ——— */
function tachesDe(t: Tableau, jour: string): Tache[] {
  const c = t.chantier;
  const ref = c.reference ?? c.code_postal;
  const vivant = c.statut === "ouvert" || c.statut === "suspendu";
  const mo = c.maitre_ouvrage_nom ?? null;
  const proprieteChantier: Propriete = { libelle: "Chantier", valeur: c.nom, icone: "Crane" as NomDalIcone, lien: fiche(c.id) };
  const sortie: Tache[] = [];

  for (const p of t.passages) {
    if (p.statut !== "prevu") continue;
    const qui = quiDe(p);
    const lot: Propriete[] = p.lot_code ? [{ libelle: "Lot", valeur: `${p.lot_code} · ${p.lot_libelle ?? ""}`.trim(), icone: "Folder" as NomDalIcone }] : [];
    const commun: Propriete[] = [proprieteChantier, { libelle: "Date", valeur: `${periode(p)}${p.exterieur ? " · extérieur" : ""}`, icone: "Calendar" as NomDalIcone }, { libelle: "Intervenant", valeur: qui, icone: "CurrentUser" as NomDalIcone }, ...lot];

    /* à confirmer : sous-traitant, J-2 demandé, pas confirmé (les conditions de « Noter la réponse » du planning) */
    if (p.intervenant_type === "tiers" && (p.confirmation === "demandee" || p.confirmation === "sans_reponse" || p.confirmation === "declinee")) {
      const dernier = p.confirmations?.length ? p.confirmations[p.confirmations.length - 1] : null;
      const remplacants = fonctionOuverte(t, "remplacants") && (p.confirmation === "declinee" || p.confirmation === "sans_reponse");
      const titre =
        p.confirmation === "declinee"
          ? `Remplacer ${qui}, qui a décliné « ${nomTache(p)} » ${relatif(p.debut, jour)}`
          : p.confirmation === "sans_reponse"
            ? `Relancer ${qui} pour « ${nomTache(p)} » ${relatif(p.debut, jour)}`
            : `Noter la réponse de ${qui} pour « ${nomTache(p)} » ${relatif(p.debut, jour)}`;
      const description =
        p.confirmation === "declinee"
          ? `${qui} a décliné ce passage.${remplacants ? " Les remplaçants possibles sont dans le planning du chantier." : ""} Si la réponse change, notez-la.`
          : p.confirmation === "sans_reponse"
            ? `La demande de confirmation à J-2 est restée sans réponse. Appelez ${qui}, puis notez sa réponse dans le planning.${remplacants ? " Des remplaçants y sont proposés." : ""}`
            : `La demande de confirmation à J-2 est partie. Si ${qui} vous répond par téléphone, notez sa réponse dans le planning.`;
      sortie.push({
        cle: `confirmer:${p.id}`,
        genre: "confirmer",
        aFaire: true,
        chantier: c,
        ref,
        titre,
        quand: p.debut.slice(0, 10),
        enRetard: false,
        qui,
        passageId: p.id,
        geste: "Noter la réponse",
        lien: fiche(c.id, PLANNING),
        dateLigne: `Passage ${periode(p)}, ${relatif(p.debut, jour)}`,
        description,
        proprietes: [
          ...commun,
          { libelle: "Confirmation", valeur: CONFIRMATIONS[p.confirmation].libelle, icone: "Checklist" as NomDalIcone },
          ...(p.envoi ? [{ libelle: "Demande", valeur: libelleEnvoi(p.envoi, dateHeure), icone: "Send" as NomDalIcone }] : []),
          ...(dernier
            ? [{ libelle: "Dernière réponse", valeur: `${dateHeure(dernier.survenu_le)}${dernier.canal ? ` · ${dernier.canal}` : ""}${typeof dernier.detail.texte === "string" && dernier.detail.texte ? ` · « ${dernier.detail.texte} »` : ""}`, icone: "Comment" as NomDalIcone }]
            : []),
        ],
      });
    }

    /* commencé : à noter fait (les conditions de « Noter fait » du planning) */
    if (vivant && p.debut.slice(0, 10) <= jour) {
      const retard = p.fin.slice(0, 10) < jour;
      sortie.push({
        cle: `fait:${p.id}`,
        genre: "fait",
        aFaire: true,
        chantier: c,
        ref,
        titre: `Noter fait « ${nomTache(p)} »${retard ? `, fin prévue ${relatif(p.fin, jour)}` : ""}`,
        quand: p.fin.slice(0, 10),
        enRetard: retard,
        qui,
        passageId: p.id,
        geste: "Noter fait",
        lien: fiche(c.id, PLANNING),
        dateLigne: retard ? `Fin prévue le ${dateCourte(p.fin)}, dépassée` : `Commencé le ${dateCourte(p.debut)}, fin prévue le ${dateCourte(p.fin)}`,
        description: retard
          ? `Ce passage devait finir ${relatif(p.fin, jour)} et n'est pas noté fait. Notez-le fait avec sa date de fin réelle ; une fin tardive propose de recaler la suite.`
          : `Ce passage a commencé. Quand il est fini, notez-le fait avec sa date de fin réelle.`,
        proprietes: commun,
      });
    }
  }

  for (const a of t.avenants) {
    if (a.statut !== "soumis") continue;
    const approuve = a.demande_statut === "approuvee" || a.demande_statut === "executee";
    const proprietes: Propriete[] = [
      proprieteChantier,
      { libelle: "Soumis le", valeur: a.soumis_le ? dateCourte(a.soumis_le) : "—", icone: "Calendar" as NomDalIcone },
      ...(mo ? [{ libelle: "Maître d'ouvrage", valeur: mo, icone: "CurrentUser" as NomDalIcone }] : []),
      { libelle: "Validation", valeur: VALIDATION[a.demande_statut ?? ""] ?? a.demande_statut ?? "Aucune demande", icone: "Checklist" as NomDalIcone },
      ...(t.voit_prix && a.montant_ht != null ? [{ libelle: "Montant", valeur: `${montant(a.montant_ht)} HT`, icone: "Euro" as NomDalIcone }] : []),
    ];
    sortie.push({
      cle: `avenant:${a.id}`,
      genre: approuve ? "signer" : "avenant_attente",
      aFaire: approuve,
      chantier: c,
      ref,
      titre: approuve ? `Signer l'avenant n° ${a.numero} : ${a.objet}` : `Avenant n° ${a.numero} en validation : ${a.objet}`,
      quand: (a.soumis_le ?? a.cree_le).slice(0, 10),
      enRetard: false,
      qui: mo,
      geste: approuve ? "Signer" : "Voir l'avenant",
      lien: fiche(c.id, AVENANTS),
      dateLigne: a.soumis_le ? `Soumis à la signature le ${dateCourte(a.soumis_le)}` : "Soumis à la signature",
      description: approuve
        ? `La demande de validation est approuvée : l'avenant peut être signé. Ses travaux entrent alors dans l'engagé du lot.`
        : `L'avenant attend sa validation dans « À valider ». Celui qui l'a chiffré ne le signe pas.`,
      proprietes,
    });
  }

  for (const s of t.situations ?? []) {
    const approuvee = s.demande_statut === "approuvee" || s.demande_statut === "executee";
    const genre: Genre | null = s.statut === "brouillon" || s.statut === "refusee" ? "soumettre" : s.statut === "soumise" ? (approuvee ? "valider" : "situation_attente") : null;
    if (!genre) continue;
    sortie.push({
      cle: `situation:${s.id}`,
      genre,
      aFaire: genre !== "situation_attente",
      chantier: c,
      ref,
      titre:
        genre === "soumettre"
          ? s.statut === "refusee"
            ? `Reprendre la situation n° ${s.numero}, refusée`
            : `Soumettre la situation n° ${s.numero}`
          : genre === "valider"
            ? `Valider la situation n° ${s.numero}`
            : `Situation n° ${s.numero} en validation`,
      quand: s.periode_fin.slice(0, 10),
      enRetard: false,
      qui: mo,
      geste: genre === "soumettre" ? "Soumettre" : genre === "valider" ? "Valider" : "Voir la situation",
      lien: fiche(c.id, SITUATIONS),
      dateLigne: `Période jusqu'au ${dateCourte(s.periode_fin)}`,
      description:
        genre === "soumettre"
          ? `${s.statut === "refusee" ? `Refusée${s.motif ? ` : ${s.motif}` : ""}. ` : ""}Saisissez l'avancement cumulé ligne à ligne, puis soumettez-la à la validation.`
          : genre === "valider"
            ? "Sa demande de validation est approuvée : validez la situation."
            : "Elle attend sa validation dans « À valider ».",
      proprietes: [
        proprieteChantier,
        { libelle: "Période", valeur: `jusqu'au ${dateCourte(s.periode_fin)}`, icone: "Calendar" as NomDalIcone },
        ...(mo ? [{ libelle: "Maître d'ouvrage", valeur: mo, icone: "CurrentUser" as NomDalIcone }] : []),
        ...(s.statut === "soumise" ? [{ libelle: "Validation", valeur: VALIDATION[s.demande_statut ?? ""] ?? s.demande_statut ?? "—", icone: "Checklist" as NomDalIcone }] : []),
        ...(t.voit_prix ? [{ libelle: "Net à payer", valeur: montant(s.net_a_payer), icone: "Euro" as NomDalIcone }] : []),
      ],
    });
  }
  return sortie;
}

/* un passage ouvert par son repère (?passage=) sans rien à faire aujourd'hui : on le dit */
function passageSansTache(t: Tableau, p: Passage, jour: string): Tache {
  const c = t.chantier;
  return {
    cle: `passage:${p.id}`,
    genre: "passage",
    aFaire: false,
    chantier: c,
    ref: c.reference ?? c.code_postal,
    titre: nomTache(p),
    quand: p.debut.slice(0, 10),
    enRetard: false,
    qui: quiDe(p),
    passageId: p.id,
    geste: "Voir le planning",
    lien: fiche(c.id, PLANNING),
    dateLigne: `Passage ${periode(p)}, ${relatif(p.debut, jour)}`,
    description: p.statut === "fait" ? "Ce passage est noté fait : rien à faire aujourd'hui." : p.statut === "annule" ? "Ce passage est annulé : rien à faire aujourd'hui." : "Rien à faire aujourd'hui sur ce passage.",
    proprietes: [
      { libelle: "Chantier", valeur: c.nom, icone: "Crane" as NomDalIcone, lien: fiche(c.id) },
      { libelle: "Date", valeur: periode(p), icone: "Calendar" as NomDalIcone },
      { libelle: "Intervenant", valeur: quiDe(p), icone: "CurrentUser" as NomDalIcone },
      ...(p.intervenant_type === "tiers" ? [{ libelle: "Confirmation", valeur: CONFIRMATIONS[p.confirmation].libelle, icone: "Checklist" as NomDalIcone }] : []),
    ],
  };
}

/* « 2 nov. », comme le « Nov 1 » de Linear (date calendaire, sans fuseau) */
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const jourMois = (iso: string) => `${Number(iso.slice(8, 10))} ${MOIS_COURTS[Number(iso.slice(5, 7)) - 1]}`;
const decaler = (iso: string, n: number) => isoLocal(Date.parse(`${iso}T12:00:00`) + n * 86_400_000);

/* la référence du chantier dans la colonne de 55 de l'identifiant OME-n : l'année sur deux chiffres */
const refCourte = (ref: string) => ref.replace(/-20(\d\d)\b/, "-$1");

/* la priorité de Linear (sprite Priority0…4) donnée par la nature de la tâche */
function prioriteDe(x: Tache): { icone: NomDalIcone; libelle: string; urgente?: boolean } {
  if (x.enRetard) return { icone: "Priority1", libelle: "Urgente", urgente: true };
  if (x.genre === "signer" || x.genre === "valider") return { icone: "Priority2", libelle: "Haute" };
  if (x.genre === "confirmer") return { icone: "Priority3", libelle: "Moyenne" };
  if (x.genre === "fait" || x.genre === "soumettre") return { icone: "Priority4", libelle: "Basse" };
  return { icone: "Priority0", libelle: "Sans priorité" };
}
const RANG_PRIORITE: Record<string, number> = { Priority1: 0, Priority2: 1, Priority3: 2, Priority4: 3, Priority0: 4 };
/* l'état de Linear : commencé = « In Progress », en attente = « In Review », le reste « Todo » */
const etatDe = (x: Tache): { icone: NomDalIcone; libelle: string; classe: string } =>
  x.genre === "fait" ? { icone: "IssueStatusStarted", libelle: "Commencé", classe: "dal-mi-etat--cours" } : !x.aFaire && x.genre !== "passage" ? { icone: "IssueStatusReview", libelle: "En validation", classe: "dal-mi-etat--revue" } : { icone: "IssueStatusTodo", libelle: "À faire", classe: "" };
/* la puce de nature, une étiquette de Linear (pastille de couleur + nom) */
const NATURE: Record<Genre, { libelle: string; couleur: string }> = {
  confirmer: { libelle: "Confirmation J-2", couleur: BLEU },
  fait: { libelle: "Passage", couleur: VERT },
  passage: { libelle: "Passage", couleur: VERT },
  signer: { libelle: "Avenant", couleur: ROUGE },
  avenant_attente: { libelle: "Avenant", couleur: ROUGE },
  soumettre: { libelle: "Situation", couleur: VIOLET },
  valider: { libelle: "Situation", couleur: VIOLET },
  situation_attente: { libelle: "Situation", couleur: VIOLET },
};

function Avatar({ nom, taille = 18 }: { nom: string | null; taille?: number }) {
  if (!nom) return <DalIcone nom="Unassigned" taille={taille} className="dal-mi-sans" />;
  return (
    <span className="dal-mi-avatar" style={{ width: taille, height: taille, background: couleurDe(nom) }} title={nom} aria-label={nom} role="img">
      {initiales(nom)}
    </span>
  );
}

/* un menu de la carte (briques de ./dal.css) sous un rond quelconque */
type OptionMi = { cle: string; libelle: string; icone: NomDalIcone; coche?: boolean; href: string };
function MenuMi({ libelle, icone, options }: { libelle: string; icone: NomDalIcone; options: OptionMi[] }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return (
    <div ref={boite} className="dal-mi-menu-boite">
      <button type="button" className="dal-rond dal-rond--plein" aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <DalIcone nom={icone} />
      </button>
      {ouvert ? (
        <div className="dal-menu" role="menu" aria-label={libelle} style={{ top: 32, right: 0, minWidth: 220 }}>
          {options.map((o) => (
            <Link key={o.cle} href={o.href} scroll={false} role="menuitemradio" aria-checked={!!o.coche} className="dal-menu-option" onClick={() => setOuvert(false)}>
              <DalIcone nom={o.icone} />
              <span className="dal-mi-menu-libelle">{o.libelle}</span>
              {o.coche ? <span className="dal-mi-menu-coche">✓</span> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const VUES: { cle: Vue; libelle: string }[] = [
  { cle: "a_faire", libelle: "À faire" },
  { cle: "attente", libelle: "En attente" },
  { cle: "tous", libelle: "Tous" },
];

type Groupe = { cle: string; libelle: string; dates?: string; icone?: NomDalIcone; taches: Tache[] };

export default function AFaire() {
  const d = useDaliro();
  const { source, liste, onLocal } = d;
  const reelle = source === "reelle";
  const routeur = useRouter();
  const params = useSearchParams();
  const aujourdhui = useAujourdhui();
  const jour = aujourdhui === null ? null : isoLocal(aujourdhui);
  const listeRef = useRef<HTMLDivElement>(null);
  const [replies, setReplies] = useState<Set<string>>(() => new Set());

  const vue: Vue = params.get("vue") === "attente" ? "attente" : params.get("vue") === "tous" ? "tous" : "a_faire";
  const groupement: Groupement = params.get("tri") === "chantier" ? "chantier" : "semaine";
  const filtreChantier = params.get("chantier");
  const cleParam = params.get("tache");
  const passageParam = params.get("passage");
  const voletDemande = params.get("details") !== "0";

  /* base réelle : les tableaux de tous les chantiers, demandés une fois par liste
     (et de nouveau quand le temps réel les a tous vidés) */
  const cleListe = liste.map((c) => c.id).join(",");
  const tableaux = liste.map((c) => d.tableau(c.id)).filter((t): t is Tableau => !!t);
  const aucunLu = tableaux.length === 0;
  useEffect(() => {
    if (reelle && d.pret) d.demanderTous();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- demanderTous change à chaque lecture : la clé de la liste suffit
  }, [reelle, d.pret, cleListe, aucunLu]);
  /* exemple : sept passages de plus, posés une fois dans les données partagées (./exemplesAFaire) */
  const cleTableaux = tableaux.map((t) => `${t.chantier.id}:${t.passages.length}`).join(",");
  useEffect(() => {
    if (reelle || !tableaux.length) return;
    for (const t of completerExemple(tableaux)) onLocal(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relu quand un tableau change de passages
  }, [reelle, cleTableaux, onLocal]);
  const enLecture = reelle && (!d.pret || liste.some((c) => d.enLecture(c.id)));

  /* recalculées à chaque rendu : quelques chantiers, quelques dizaines de passages */
  const toutes = jour ? tableaux.flatMap((t) => tachesDe(t, jour)) : [];
  const visibles = toutes
    .filter((x) => (vue === "tous" ? true : vue === "attente" ? !x.aFaire : x.aFaire))
    .filter((x) => !filtreChantier || x.chantier.id === filtreChantier)
    .sort((a, b) => RANG_PRIORITE[prioriteDe(a).icone] - RANG_PRIORITE[prioriteDe(b).icone] || a.quand.localeCompare(b.quand) || a.titre.localeCompare(b.titre, "fr"));

  /* les groupes : en retard, puis les semaines (les cycles de Linear), ou un groupe par chantier */
  const groupes: Groupe[] = (() => {
    if (!jour) return [];
    if (groupement === "chantier") {
      const parChantier = new Map<string, Tache[]>();
      for (const x of visibles) parChantier.set(x.chantier.id, [...(parChantier.get(x.chantier.id) ?? []), x]);
      return [...parChantier.values()].sort((a, b) => a[0].chantier.nom.localeCompare(b[0].chantier.nom, "fr")).map((ts) => ({ cle: ts[0].chantier.id, libelle: ts[0].chantier.nom, icone: "Crane" as NomDalIcone, taches: ts }));
    }
    const lundi = decaler(jour, -((new Date(`${jour}T12:00:00`).getDay() + 6) % 7));
    const dimanche = decaler(lundi, 6);
    const dimancheSuivant = decaler(lundi, 13);
    const g: Groupe[] = [
      { cle: "retard", libelle: "En retard", taches: visibles.filter((x) => x.enRetard) },
      { cle: "semaine", libelle: "Cette semaine", dates: `${jourMois(lundi)} → ${jourMois(dimanche)}`, icone: "Cycle", taches: visibles.filter((x) => !x.enRetard && x.quand <= dimanche) },
      { cle: "suivante", libelle: "Semaine prochaine", dates: `${jourMois(decaler(lundi, 7))} → ${jourMois(dimancheSuivant)}`, icone: "Cycle", taches: visibles.filter((x) => !x.enRetard && x.quand > dimanche && x.quand <= dimancheSuivant) },
      { cle: "plus_tard", libelle: "Plus tard", icone: "Cycle", taches: visibles.filter((x) => !x.enRetard && x.quand > dimancheSuivant) },
    ];
    return g.filter((x) => x.taches.length);
  })();
  const ordre = groupes.flatMap((g) => (replies.has(g.cle) ? [] : g.taches));

  const ouverte = ((): Tache | null => {
    if (cleParam) return toutes.find((x) => x.cle === cleParam) ?? null;
    if (passageParam && jour) {
      const trouvee = toutes.find((x) => x.passageId === passageParam);
      if (trouvee) return trouvee;
      for (const t of tableaux) {
        const p = t.passages.find((x) => x.id === passageParam);
        if (p) return passageSansTache(t, p, jour);
      }
    }
    return null;
  })();
  /* un repère dont le chantier n'est pas encore lu : le volet attend la lecture */
  const repereEnAttente = !ouverte && !!(cleParam || passageParam) && (enLecture || !jour);
  const volet = voletDemande && (!!ouverte || repereEnAttente);

  const adresse = useCallback(
    (modifier: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      modifier(p);
      const qs = p.toString();
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  const lienTache = useCallback(
    (cle: string | null) =>
      adresse((p) => {
        p.delete("passage");
        p.delete("details");
        if (cle) p.set("tache", cle);
        else p.delete("tache");
      }),
    [adresse],
  );
  const lienVue = (v: Vue) => adresse((p) => (v === "a_faire" ? p.delete("vue") : p.set("vue", v)));
  const lienGroupement = (g: Groupement) => adresse((p) => (g === "semaine" ? p.delete("tri") : p.set("tri", g)));
  const lienChantier = (c: string | null) => adresse((p) => (c ? p.set("chantier", c) : p.delete("chantier")));
  /* le bouton « Open details » de Linear (⌘ I) : rien d'ouvert, il ouvre la première tâche */
  const lienVolet = !ouverte && !repereEnAttente ? (ordre.length ? lienTache(ordre[0].cle) : null) : adresse((p) => (volet ? p.set("details", "0") : p.delete("details")));
  const basculerVolet = () => {
    if (lienVolet) routeur.replace(lienVolet, { scroll: false });
  };

  /* ↑/↓ changent de tâche, Échap referme, ⌘ I ouvre ou ferme le volet */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".dal-mi .dal-menu")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (lienVolet) routeur.replace(lienVolet, { scroll: false });
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape" && (cleParam || passageParam)) {
        e.preventDefault();
        routeur.replace(lienTache(null), { scroll: false });
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && ordre.length) {
        e.preventDefault();
        const i = ouverte ? ordre.findIndex((x) => x.cle === ouverte.cle) : -1;
        const j = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(ordre.length - 1, i + 1)) : i < 0 ? ordre.length - 1 : Math.max(0, i - 1);
        routeur.replace(lienTache(ordre[j].cle), { scroll: false });
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cleParam, passageParam, ouverte, ordre, routeur, lienTache, lienVolet]);
  useEffect(() => {
    listeRef.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" });
  }, [ouverte?.cle]);

  const chargement = enLecture && !toutes.length;
  const chantiersAvecTaches = [...new Map(toutes.map((x) => [x.chantier.id, x.chantier])).values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <DalCarte className="dal-mi-page">
      <h1 className="v2-sr">À faire</h1>
      <header className="dal-tete">
        <div className="dal-ligne1 dal-mi-ligne1">
          <h2 className="dal-mi-titre">À faire</h2>
        </div>
        <div className="dal-ligne2 dal-mi-ligne2">
          <nav className="dal-mi-onglets" aria-label="Vues">
            {VUES.map((v) => (
              <Link key={v.cle} href={lienVue(v.cle)} scroll={false} className="dal-onglet" aria-current={v.cle === vue ? "page" : undefined}>
                {v.libelle}
              </Link>
            ))}
          </nav>
          <span className="dal-pousse" />
          <div className="dal-mi-ronds">
            <MenuMi
              libelle="Filtrer"
              icone="Filtre"
              options={[
                { cle: "tous", libelle: "Tous les chantiers", icone: "Crane", coche: !filtreChantier, href: lienChantier(null) },
                ...chantiersAvecTaches.map((c) => ({ cle: c.id, libelle: c.nom, icone: "Crane" as NomDalIcone, coche: filtreChantier === c.id, href: lienChantier(c.id) })),
              ]}
            />
            <MenuMi
              libelle="Options d'affichage"
              icone="Affichage"
              options={[
                { cle: "semaine", libelle: "Grouper par semaine", icone: "Cycle", coche: groupement === "semaine", href: lienGroupement("semaine") },
                { cle: "chantier", libelle: "Grouper par chantier", icone: "Crane", coche: groupement === "chantier", href: lienGroupement("chantier") },
              ]}
            />
            <button type="button" className="dal-rond dal-rond--plein" aria-label={volet ? "Fermer les détails" : "Ouvrir les détails"} title={volet ? "Fermer les détails (⌘ I)" : "Ouvrir les détails (⌘ I)"} aria-expanded={volet} onClick={basculerVolet}>
              <DalIcone nom="Volet" />
            </button>
          </div>
        </div>
      </header>

      <div className="dal-mi" data-volet={volet ? "" : undefined}>
        <div className="dal-mi-liste" ref={listeRef}>
          {!jour || chargement ? (
            <div className="dal-mi-groupe" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="dal-mi-ligne" aria-hidden="true">
                  <span className="dal-mi-squelette" style={{ gridColumn: "title", width: `${60 - i * 8}%` }} />
                </span>
              ))}
            </div>
          ) : groupes.length ? (
            groupes.map((g) => {
              const replie = replies.has(g.cle);
              return (
                <section key={g.cle} className="dal-mi-groupe" aria-label={`${g.libelle}, ${g.taches.length}`}>
                  <div className="dal-mi-groupe-tete">
                    <button
                      type="button"
                      className="dal-mi-replier"
                      aria-expanded={!replie}
                      aria-label={replie ? `Déplier ${g.libelle}` : `Replier ${g.libelle}`}
                      onClick={() =>
                        setReplies((r) => {
                          const n = new Set(r);
                          if (n.has(g.cle)) n.delete(g.cle);
                          else n.add(g.cle);
                          return n;
                        })
                      }
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={replie ? { transform: "rotate(-90deg)" } : undefined}>
                        <path d="M5.2 6.4h5.6L8 9.6z" />
                      </svg>
                    </button>
                    {g.icone ? <DalIcone nom={g.icone} className="dal-mi-groupe-icone" /> : null}
                    <span className="dal-mi-groupe-nom">{g.libelle}</span>
                    <span className="dal-mi-groupe-compte">{g.taches.length}</span>
                    {g.dates ? <span className="dal-mi-groupe-dates">{g.dates}</span> : null}
                  </div>
                  {replie
                    ? null
                    : g.taches.map((x) => {
                        const pr = prioriteDe(x);
                        const et = etatDe(x);
                        const nat = NATURE[x.genre];
                        return (
                          <Link key={x.cle} href={lienTache(x.cle)} scroll={false} className="dal-mi-ligne" aria-current={ouverte?.cle === x.cle ? "true" : undefined}>
                            <span className="dal-mi-prio" title={pr.libelle} data-urgente={pr.urgente ? "" : undefined}>
                              <DalIcone nom={pr.icone} />
                            </span>
                            <span className="dal-mi-id" title={x.ref}>
                              {refCourte(x.ref)}
                            </span>
                            <span className={`dal-mi-etat ${et.classe}`} title={et.libelle}>
                              <DalIcone nom={et.icone} taille={14} />
                            </span>
                            <span className="dal-mi-titre-cellule">
                              <span className="dal-mi-nom">{x.titre}</span>
                              <span className="dal-mi-puces">
                                <span className="dal-mi-puce">
                                  <span className="dal-mi-pastille" aria-hidden="true">
                                    <span style={{ background: nat.couleur }} />
                                  </span>
                                  {nat.libelle}
                                </span>
                                <span className="dal-mi-puce">
                                  <DalIcone nom="Crane" taille={14} />
                                  {x.chantier.nom}
                                </span>
                                {x.enRetard ? (
                                  <span className="dal-mi-puce" title="Fin prévue dépassée">
                                    <DalIcone nom="CrossedOutCalendar" taille={14} className="dal-mi-retard" />
                                    {jourMois(x.quand)}
                                  </span>
                                ) : null}
                              </span>
                              <Avatar nom={x.qui} />
                            </span>
                            <span className="dal-mi-date">{jourMois(x.quand)}</span>
                          </Link>
                        );
                      })}
                </section>
              );
            })
          ) : (
            <div className="dal-mi-vide">
              {reelle && !liste.length ? (
                <>
                  <strong>Aucun chantier</strong>
                  <span>Les tâches se calculent sur vos chantiers : créez-en un depuis la vue d&apos;ensemble.</span>
                </>
              ) : vue === "attente" ? (
                <>
                  <strong>Rien en attente</strong>
                  <span>Les avenants et les situations soumis attendent ici leur validation dans « À valider ».</span>
                </>
              ) : (
                <>
                  <strong>Rien à faire</strong>
                  <span>Les passages à confirmer ou à noter faits, les avenants à signer et les situations à soumettre s&apos;affichent ici.</span>
                </>
              )}
            </div>
          )}
          {reelle && d.erreur ? <p className="dal-mi-avis">Un chantier n&apos;a pas pu être lu : {d.erreur}</p> : null}
        </div>

        {volet ? (ouverte ? voletDe(ouverte) : voletAttente()) : null}
      </div>
    </DalCarte>
  );

  /* ——— le volet de détails (400, les cartes de la page d'une Initiative) ——— */
  function voletDe(x: Tache) {
    return (
      <aside className="dal-mi-volet" aria-label={`Tâche : ${x.titre}`}>
        <section className="dal-mi-vcarte">
          <div className="dal-mi-vtete">
            <span className="dal-mi-vtitre">{x.ref}</span>
            <span className="dal-pousse" />
            <Link className="dal-rond dal-mi-vfermer" href={lienTache(null)} scroll={false} aria-label="Fermer la tâche" title="Fermer (Échap)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4.03 3.97a.75.75 0 0 0-1.06 1.06L6.94 9l-3.97 3.97a.75.75 0 1 0 1.06 1.06L8 10.06l3.97 3.97a.75.75 0 1 0 1.06-1.06L9.06 9l3.97-3.97a.75.75 0 0 0-1.06-1.06L8 7.94z" transform="translate(0 -1)" />
              </svg>
            </Link>
          </div>
          <h3 className="dal-mi-vnom">{x.titre}</h3>
          <p className="dal-mi-vdate" data-retard={x.enRetard ? "" : undefined}>
            {x.dateLigne}
          </p>
          <p className="dal-mi-vdesc">{x.description}</p>
          <Link className="dal-mi-geste" href={x.lien}>
            <DalIcone nom={x.genre === "signer" ? "Signature" : x.genre === "fait" ? "IssueStatusDone" : x.genre === "confirmer" ? "Comment" : x.genre === "passage" ? "Calendar" : "Send"} taille={14} />
            <span>{x.geste}</span>
          </Link>
        </section>
        <section className="dal-mi-vcarte">
          <div className="dal-mi-vtete">
            <span className="dal-mi-vtitre">Propriétés</span>
          </div>
          <dl className="dal-mi-props">
            <div className="dal-mi-prop">
              <dt>État</dt>
              <dd>
                <span className="dal-mi-valeur">
                  <span className={`dal-mi-etat ${etatDe(x).classe}`}>
                    <DalIcone nom={etatDe(x).icone} taille={14} />
                  </span>
                  <span>{x.aFaire ? "À faire" : x.genre === "passage" ? "Rien à faire" : "En attente"}</span>
                </span>
              </dd>
            </div>
            <div className="dal-mi-prop">
              <dt>Priorité</dt>
              <dd>
                <span className="dal-mi-valeur">
                  <span className="dal-mi-prio" data-urgente={prioriteDe(x).urgente ? "" : undefined}>
                    <DalIcone nom={prioriteDe(x).icone} taille={14} />
                  </span>
                  <span>{prioriteDe(x).libelle}</span>
                </span>
              </dd>
            </div>
            {x.proprietes.map((p) => (
              <div key={p.libelle} className="dal-mi-prop">
                <dt>{p.libelle}</dt>
                <dd>
                  {p.lien ? (
                    <Link className="dal-mi-valeur" href={p.lien}>
                      <DalIcone nom={p.icone} taille={14} />
                      <span>{p.valeur}</span>
                    </Link>
                  ) : (
                    <span className="dal-mi-valeur">
                      <DalIcone nom={p.icone} taille={14} />
                      <span>{p.valeur}</span>
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </aside>
    );
  }

  function voletAttente() {
    return (
      <aside className="dal-mi-volet" aria-label="Tâche en lecture" aria-busy="true">
        <section className="dal-mi-vcarte">
          <div className="dal-mi-vtete">
            <span className="dal-mi-vtitre">Lecture des chantiers…</span>
          </div>
          <span className="dal-mi-squelette" style={{ width: "80%", height: 20 }} />
          <span className="dal-mi-squelette" style={{ width: "50%" }} />
        </section>
      </aside>
    );
  }
}
