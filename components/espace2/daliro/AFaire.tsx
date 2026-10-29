"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO « À faire », sur les Tasks de Plain (29/10/2026)

   Une tâche par chose à faire aujourd'hui, calculée sur les tableaux de
   tous les chantiers (useDaliro().demanderTous() en base réelle), sans
   écrire aucune donnée :
     · passage à confirmer à J-2 : confirmation demandée, sans réponse ou
       déclinée, d'un sous-traitant, passage prévu → « Noter la réponse »
       (G22, mêmes conditions que le planning de ChantierVue) ;
     · passage commencé, chantier ouvert ou suspendu → « Noter fait » (G24) ;
     · avenant soumis dont la validation est approuvée → « Signer » (G34) ;
     · situation en préparation ou refusée → « Soumettre » (G42), situation
       soumise et approuvée → « Valider » (G43).
   L'onglet « En attente » montre ce qui attend la validation d'un autre
   (avenant ou situation soumis, dans « À valider ») ; « Tous » réunit les deux.

   La tâche ouverte est dans l'adresse : ?tache=<clé>, ou ?passage=<id>
   (l'aiguillage y envoie les repères btp_passages du point du matin ; un
   passage sans rien à faire s'ouvre quand même, pour le dire). L'onglet est
   ?vue=attente|tous, le tri ?tri=chantier. ↑/↓ changent de tâche, Échap
   referme. Le panneau de droite dit le chantier, la date, l'intervenant et
   le contexte ; le geste est un lien vers la fiche du chantier, au bon
   onglet : les fenêtres de ces gestes vivent dans ChantierVue (son état
   interne) et ne se rouvrent pas d'ici sans en dupliquer la logique.
   Gabarit : ../lin/lin.css ; mesures propres : ../lin/plain-tasks.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { ArrowDownUp, ArrowUpRight, Banknote, Calendar, CheckSquare, Clock, FileSignature, HardHat, Hourglass, Layers, ListTodo, MessageSquare, Send, User, X } from "lucide-react";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { CONFIRMATIONS, libelleEnvoi } from "@/components/espace/daliro/etats";
import { ouverte as fonctionOuverte } from "@/components/espace/daliro/fonctions";
import type { Chantier, Passage, Tableau } from "@/components/espace/daliro/types";
import { MenuOptions, type Option } from "../lin/Lin";
import { useAujourdhui } from "../horloge";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import "../lin/plain-tasks.css";

const CHEMIN = `${RACINE}/daliro/a-faire`;
const fiche = (id: string, suite = "") => `${RACINE}/daliro/chantiers/${encodeURIComponent(id)}${suite}`;
const PLANNING = "?onglet=terrain#planning";
const AVENANTS = "?onglet=argent#avenants";
const SITUATIONS = "?onglet=argent#situations";

type Vue = "a_faire" | "attente" | "tous";
type Tri = "date" | "chantier";
type Genre = "confirmer" | "fait" | "signer" | "soumettre" | "valider" | "avenant_attente" | "situation_attente" | "passage";

type Propriete = { libelle: string; valeur: string; icone: React.ReactNode; lien?: string };
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

const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const couleurDe = (s: string) => COULEURS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((x) => /\p{L}/u.test(x))
    .slice(0, 2)
    .map((x) => x[0])
    .join("");

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
  const proprieteChantier: Propriete = { libelle: "Chantier", valeur: c.nom, icone: <HardHat aria-hidden="true" />, lien: fiche(c.id) };
  const sortie: Tache[] = [];

  for (const p of t.passages) {
    if (p.statut !== "prevu") continue;
    const qui = quiDe(p);
    const lot: Propriete[] = p.lot_code ? [{ libelle: "Lot", valeur: `${p.lot_code} · ${p.lot_libelle ?? ""}`.trim(), icone: <Layers aria-hidden="true" /> }] : [];
    const commun: Propriete[] = [proprieteChantier, { libelle: "Date", valeur: `${periode(p)}${p.exterieur ? " · extérieur" : ""}`, icone: <Calendar aria-hidden="true" /> }, { libelle: "Intervenant", valeur: qui, icone: <User aria-hidden="true" /> }, ...lot];

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
          { libelle: "Confirmation", valeur: CONFIRMATIONS[p.confirmation].libelle, icone: <CheckSquare aria-hidden="true" /> },
          ...(p.envoi ? [{ libelle: "Demande", valeur: libelleEnvoi(p.envoi, dateHeure), icone: <Send aria-hidden="true" /> }] : []),
          ...(dernier
            ? [{ libelle: "Dernière réponse", valeur: `${dateHeure(dernier.survenu_le)}${dernier.canal ? ` · ${dernier.canal}` : ""}${typeof dernier.detail.texte === "string" && dernier.detail.texte ? ` · « ${dernier.detail.texte} »` : ""}`, icone: <MessageSquare aria-hidden="true" /> }]
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
      { libelle: "Soumis le", valeur: a.soumis_le ? dateCourte(a.soumis_le) : "—", icone: <Calendar aria-hidden="true" /> },
      ...(mo ? [{ libelle: "Maître d'ouvrage", valeur: mo, icone: <User aria-hidden="true" /> }] : []),
      { libelle: "Validation", valeur: VALIDATION[a.demande_statut ?? ""] ?? a.demande_statut ?? "Aucune demande", icone: <CheckSquare aria-hidden="true" /> },
      ...(t.voit_prix && a.montant_ht != null ? [{ libelle: "Montant", valeur: `${montant(a.montant_ht)} HT`, icone: <Banknote aria-hidden="true" /> }] : []),
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
        { libelle: "Période", valeur: `jusqu'au ${dateCourte(s.periode_fin)}`, icone: <Calendar aria-hidden="true" /> },
        ...(mo ? [{ libelle: "Maître d'ouvrage", valeur: mo, icone: <User aria-hidden="true" /> }] : []),
        ...(s.statut === "soumise" ? [{ libelle: "Validation", valeur: VALIDATION[s.demande_statut ?? ""] ?? s.demande_statut ?? "—", icone: <CheckSquare aria-hidden="true" /> }] : []),
        ...(t.voit_prix ? [{ libelle: "Net à payer", valeur: montant(s.net_a_payer), icone: <Banknote aria-hidden="true" /> }] : []),
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
      { libelle: "Chantier", valeur: c.nom, icone: <HardHat aria-hidden="true" />, lien: fiche(c.id) },
      { libelle: "Date", valeur: periode(p), icone: <Calendar aria-hidden="true" /> },
      { libelle: "Intervenant", valeur: quiDe(p), icone: <User aria-hidden="true" /> },
      ...(p.intervenant_type === "tiers" ? [{ libelle: "Confirmation", valeur: CONFIRMATIONS[p.confirmation].libelle, icone: <CheckSquare aria-hidden="true" /> }] : []),
    ],
  };
}

function Avatar({ nom }: { nom: string | null }) {
  if (!nom) return null;
  return (
    <span className="pta-avatar" style={{ "--pta-teinte": couleurDe(nom) } as React.CSSProperties} title={nom} aria-label={nom} role="img">
      {initiales(nom) || <User width={12} height={12} aria-hidden="true" />}
    </span>
  );
}

const VUES: { cle: Vue; libelle: string; classe: string; icone: React.ReactNode }[] = [
  { cle: "a_faire", libelle: "À faire", classe: "pta-onglet--a-faire", icone: <ListTodo aria-hidden="true" /> },
  { cle: "attente", libelle: "En attente", classe: "pta-onglet--attente", icone: <Hourglass aria-hidden="true" /> },
  { cle: "tous", libelle: "Tous", classe: "pta-onglet--tous", icone: <Layers aria-hidden="true" /> },
];

export default function AFaire() {
  const d = useDaliro();
  const { source, liste } = d;
  const reelle = source === "reelle";
  const routeur = useRouter();
  const params = useSearchParams();
  const aujourdhui = useAujourdhui();
  const jour = aujourdhui === null ? null : isoLocal(aujourdhui);
  const listeRef = useRef<HTMLUListElement>(null);

  const vue: Vue = params.get("vue") === "attente" ? "attente" : params.get("vue") === "tous" ? "tous" : "a_faire";
  const tri: Tri = params.get("tri") === "chantier" ? "chantier" : "date";
  const cleParam = params.get("tache");
  const passageParam = params.get("passage");

  /* base réelle : les tableaux de tous les chantiers, demandés une fois par liste
     (et de nouveau quand le temps réel les a tous vidés) */
  const cleListe = liste.map((c) => c.id).join(",");
  const tableaux = liste.map((c) => d.tableau(c.id)).filter((t): t is Tableau => !!t);
  const aucunLu = tableaux.length === 0;
  useEffect(() => {
    if (reelle && d.pret) d.demanderTous();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- demanderTous change à chaque lecture : la clé de la liste suffit
  }, [reelle, d.pret, cleListe, aucunLu]);
  const enLecture = reelle && (!d.pret || liste.some((c) => d.enLecture(c.id)));

  /* recalculées à chaque rendu : quelques chantiers, quelques dizaines de passages */
  const toutes = jour ? tableaux.flatMap((t) => tachesDe(t, jour)) : [];
  const comptes: Record<Vue, number> = { a_faire: toutes.filter((x) => x.aFaire).length, attente: toutes.filter((x) => !x.aFaire).length, tous: toutes.length };
  const visibles = toutes
    .filter((x) => (vue === "tous" ? true : vue === "attente" ? !x.aFaire : x.aFaire))
    .sort((a, b) => (tri === "chantier" ? a.chantier.nom.localeCompare(b.chantier.nom, "fr") : 0) || a.quand.localeCompare(b.quand) || a.titre.localeCompare(b.titre, "fr"));

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
  /* un repère dont le chantier n'est pas encore lu : le panneau attend la lecture */
  const repereEnAttente = !ouverte && !!(cleParam || passageParam) && (enLecture || !jour);

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
        if (cle) p.set("tache", cle);
        else p.delete("tache");
      }),
    [adresse],
  );
  const lienVue = (v: Vue) => adresse((p) => (v === "a_faire" ? p.delete("vue") : p.set("vue", v)));
  const lienTri = (t: Tri) => adresse((p) => (t === "date" ? p.delete("tri") : p.set("tri", t)));

  /* ↑/↓ changent de tâche, Échap referme */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin-menu")) return;
      if (e.key === "Escape" && (cleParam || passageParam)) {
        e.preventDefault();
        routeur.replace(lienTache(null), { scroll: false });
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && visibles.length) {
        e.preventDefault();
        const i = ouverte ? visibles.findIndex((x) => x.cle === ouverte.cle) : -1;
        const j = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(visibles.length - 1, i + 1)) : i < 0 ? visibles.length - 1 : Math.max(0, i - 1);
        routeur.replace(lienTache(visibles[j].cle), { scroll: false });
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [cleParam, passageParam, ouverte, visibles, routeur, lienTache]);
  useEffect(() => {
    listeRef.current?.querySelector("[data-actif]")?.scrollIntoView({ block: "nearest" });
    /* en étroit, la feuille remplace la liste : elle s'ouvre par le haut */
    const gauche = document.querySelector<HTMLElement>(".pta-gauche");
    if (gauche && getComputedStyle(gauche).display === "none") document.querySelector(".pta-panneau")?.scrollIntoView({ block: "start" });
  }, [ouverte?.cle]);

  const vueCourante = VUES.find((v) => v.cle === vue)!;
  const optionsVues: Option[] = VUES.map((v) => ({ cle: v.cle, libelle: v.libelle, meta: String(comptes[v.cle]), coche: v.cle === vue, href: lienVue(v.cle) }));
  const optionsTri: Option[] = [
    { cle: "date", libelle: "Par date", coche: tri === "date", href: lienTri("date") },
    { cle: "chantier", libelle: "Par chantier", coche: tri === "chantier", href: lienTri("chantier") },
  ];
  const chargement = enLecture && !toutes.length;

  return (
    <div className="lin pta" data-panneau={ouverte || repereEnAttente ? "" : undefined}>
      <h1 className="v2-sr">À faire</h1>
      <div className="pta-grille">
        <div className="pta-gauche">
          <header className="pta-entete">
            <p className="pta-h1" aria-hidden="true">
              À faire
            </p>
          </header>
          <section aria-label="Tâches du jour">
            <div className="pta-barre">
              <nav className="pta-segment" aria-label="Vues">
                {VUES.map((v) => (
                  <Link key={v.cle} href={lienVue(v.cle)} scroll={false} className={`pta-onglet ${v.classe}`} aria-current={v.cle === vue ? "page" : undefined}>
                    {v.icone}
                    {v.libelle}
                    <span className="pta-compte">{jour && !chargement ? comptes[v.cle] : "·"}</span>
                  </Link>
                ))}
              </nav>
              <div className="pta-vues-menu">
                <MenuOptions
                  libelle="Changer de vue"
                  titre="Vue…"
                  declencheur={
                    <>
                      {vueCourante.icone}
                      {vueCourante.libelle}
                      <span className="pta-compte">{jour && !chargement ? comptes[vue] : "·"}</span>
                    </>
                  }
                  options={optionsVues}
                  largeur={220}
                />
              </div>
              <div className="pta-tri">
                <MenuOptions aDroite libelle="Trier les tâches" titre="Trier…" declencheur={<><ArrowDownUp aria-hidden="true" />{tri === "date" ? "Par date" : "Par chantier"}</>} options={optionsTri} largeur={200} />
              </div>
            </div>

            {!jour || chargement ? (
              <ul className="pta-lignes" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="pta-li" aria-hidden="true">
                    <span className="pta-ligne">
                      <span className="pta-case" />
                      <span className="pta-squelette" style={{ width: `${60 - i * 8}%` }} />
                      <span />
                    </span>
                  </li>
                ))}
              </ul>
            ) : visibles.length ? (
              <ul className="pta-lignes" ref={listeRef}>
                {visibles.map((x) => {
                  const actif = ouverte?.cle === x.cle;
                  return (
                    <li key={x.cle} className="pta-li" data-actif={actif ? "" : undefined}>
                      <div className="pta-ligne">
                        <span className="pta-case" data-attente={x.aFaire ? undefined : ""} role="img" aria-label={x.aFaire ? "À faire" : "En attente"} />
                        <Link className="pta-lien" href={lienTache(x.cle)} scroll={false} aria-current={actif ? "true" : undefined}>
                          <span className="pta-id">{x.ref}</span>
                          <span className="pta-nom">{x.titre}</span>
                        </Link>
                        <span className="pta-qui">
                          <Avatar nom={x.qui} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pta-vide">
                {reelle && !liste.length ? (
                  <>
                    <strong>Aucun chantier</strong>
                    <span>Les tâches du jour se calculent sur vos chantiers : créez-en un depuis la vue d&apos;ensemble.</span>
                  </>
                ) : vue === "attente" ? (
                  <>
                    <strong>Rien en attente</strong>
                    <span>Les avenants et les situations soumis attendent ici leur validation dans « À valider ».</span>
                  </>
                ) : (
                  <>
                    <strong>Rien à faire aujourd&apos;hui</strong>
                    <span>Les passages à confirmer ou à noter faits, les avenants à signer et les situations à soumettre s&apos;affichent ici.</span>
                  </>
                )}
              </div>
            )}
            {reelle && d.erreur ? <p className="pta-avis">Un chantier n&apos;a pas pu être lu : {d.erreur}</p> : null}
          </section>
        </div>

        {ouverte ? panneau(ouverte) : repereEnAttente ? panneauAttente() : null}
      </div>
    </div>
  );

  /* ——— le panneau de la tâche ouverte (360, la feuille plein écran en étroit) ——— */
  function panneau(x: Tache) {
    return (
      <aside className="pta-panneau" aria-label={`Tâche : ${x.titre}`}>
        <div className="pta-p-tete">
          <span className="pta-p-id">{x.ref}</span>
          <h2 className="pta-p-feuille">À faire</h2>
          <div className="pta-p-ronds">
            <Link className="pta-rond" href={fiche(x.chantier.id)} aria-label={`Ouvrir la fiche du chantier ${x.chantier.nom}`} title="Ouvrir la fiche du chantier">
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link className="pta-rond" href={lienTache(null)} scroll={false} aria-label="Fermer la tâche" title="Fermer">
              <X aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="pta-actions">
          <span className="pta-etat" data-attente={x.aFaire ? undefined : ""}>
            {x.aFaire ? "À faire" : x.genre === "passage" ? "Rien à faire" : "En attente"}
          </span>
          {x.qui ? (
            <span className="pta-bouton">
              <Avatar nom={x.qui} />
              <span>{x.qui}</span>
            </span>
          ) : null}
          <Link className="pta-bouton pta-bouton--geste" href={x.lien}>
            {x.genre === "signer" ? <FileSignature aria-hidden="true" /> : x.genre === "fait" ? <CheckSquare aria-hidden="true" /> : x.genre === "confirmer" ? <MessageSquare aria-hidden="true" /> : x.genre === "passage" ? <Calendar aria-hidden="true" /> : <Send aria-hidden="true" />}
            <span>{x.geste}</span>
          </Link>
        </div>

        <h3 className="pta-p-titre">{x.titre}</h3>
        <p className="pta-p-date" data-retard={x.enRetard ? "" : undefined}>
          {x.dateLigne}
        </p>
        <p className="pta-p-desc">{x.description}</p>

        <dl className="pta-props">
          {x.proprietes.map((p) => (
            <div key={p.libelle} style={{ display: "contents" }}>
              <dt>{p.libelle}</dt>
              <dd>
                {p.lien ? (
                  <Link className="pta-valeur" href={p.lien}>
                    {p.icone}
                    <span>{p.valeur}</span>
                  </Link>
                ) : (
                  <span className="pta-valeur">
                    {p.icone}
                    <span>{p.valeur}</span>
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="pta-p-aide">« {x.geste} » ouvre la fiche du chantier, à l&apos;endroit où le geste se fait.</p>
      </aside>
    );
  }

  function panneauAttente() {
    return (
      <aside className="pta-panneau" aria-label="Tâche en lecture" aria-busy="true">
        <div className="pta-p-tete">
          <span className="pta-p-id">
            <Clock width={12} height={12} aria-hidden="true" /> Lecture des chantiers…
          </span>
          <h2 className="pta-p-feuille">À faire</h2>
          <div className="pta-p-ronds">
            <Link className="pta-rond" href={lienTache(null)} scroll={false} aria-label="Fermer la tâche" title="Fermer">
              <X aria-hidden="true" />
            </Link>
          </div>
        </div>
        <span className="pta-squelette" style={{ width: "80%", height: 24 }} />
        <span className="pta-squelette" style={{ width: "50%" }} />
        <span className="pta-squelette" style={{ width: "90%" }} />
      </aside>
    );
  }
}
