"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › la fiche d'un chantier (29/10/2026, refonte des pages métiers)

   La page d'une Initiative de Linear, au 1:1 : relevé docs/refonte-metiers/
   releves/linear-initiative.md, mesures dans ../lin/linear-initiative.css
   (préfixe lit-). Barre de tête « Chantiers › nom », onglets en pilules
   gardés dans l'adresse (?onglet=, « apercu » par défaut), volet de
   détails de 400 à droite, ouvert par le bouton de la barre des onglets
   (ouvert d'office au-dessus de 1 200 px de large).

   Ce que l'écran d'avant faisait (ChantierVue, inventaire daliro.md), et
   où c'est ici :
     Aperçu     la page « Overview » de l'initiative, dessinée ici : le
                nom et l'adresse ; les propriétés (statut, étape et lot en
                cours, dates, maître d'ouvrage, notre place, TVA) ; les
                ressources (marché vérifié, factures rattachées) ; la
                dernière nouvelle (l'origine d'avenant la plus récente,
                sinon la dernière réponse à une confirmation de passage) ;
                les contrôles bloquants et à voir en phrases (B12) ; les
                lots au format du tableau « Projects » (B13 : santé
                d'après le déboursé, exécutant, statut, avancement)
     Terrain    B12, B15, B16, B17-B18, B19 — ChantierVue habillé
     Argent     B13, B14, B20, B22, B23, B25 — ChantierVue habillé
     Fil        B21 — ChantierVue habillé
     Réception  B24 — ChantierVue habillé
     Volet      B11 (l'en-tête et ses gestes : ouvrir, suspendre, reprendre,
                ouvrir un avenant, rattacher une facture, relevé du
                chantier) — ChantierVue habillé, restylé en rangées
   30/10/2026 : dans ces onglets, chaque partie est une liste groupée (« My
   issues » de Linear) et l'élément choisi s'ouvre dans le volet, à la place
   des propriétés (../lin/Volet.tsx, PartiesChantier.tsx et chaque carte).
   Aucun geste n'est réécrit : chaque onglet monte sa propre ChantierVue
   (mêmes portes, mêmes fenêtres). Les ancres #planning, #avenants,
   #situations et #fil (posées dans ChantierVue) sont rejointes à
   l'arrivée, une fois le tableau lu.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ChantierVue, { type FormChantier, type SectionChantier } from "@/components/espace/daliro/ChantierVue";
import type { StatutChantier, Tableau } from "@/components/espace/daliro/types";
import { STATUTS_AVENANT, familleControle } from "@/components/espace/daliro/etats";
import { Etat, OngletOutil, type Liste } from "../lorani/OngletOutil";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { VoletContexte } from "../lin/Volet";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import Essentiel from "./Essentiel";
import "../lin/lin.css";
import "../lin/linear-initiative.css";
import { DalCarte, DalMenu } from "./DalCadre";
import { DalIcone } from "./DalIcone";
import "./dal-initiative.css";
import { ApercuChantier, VoletChantier } from "./ApercuChantier";
import { ActiviteChantier } from "./ActiviteChantier";
import Chantiers from "./Chantiers";
import { EtoilePleine } from "./IconesProjet";
import { useFavoris, useSuivis } from "./navigateur";

const BASE = `${RACINE}/daliro`;

type CleOnglet = "apercu" | "fil" | "projets" | "terrain" | "argent" | "reception";
/* 30/10/2026 : Terrain et Argent montrent une partie à la fois (?partie=, pastilles sous les onglets),
   la plus utile d'abord ; « Tout » rend l'ancienne pile. Les ancres des repères (#planning, #avenants,
   #situations) choisissent leur partie. */
/* l'ordre de Linear : Overview, Activity, puis les vues ajoutées (« Add new view ») — Terrain,
   Argent, Réception sont des vues du chantier en listes ; « Fil » garde sa clé d'adresse */
const ONGLETS: { cle: CleOnglet; libelle: string; sections?: SectionChantier[] }[] = [
  { cle: "apercu", libelle: "Aperçu" },
  { cle: "fil", libelle: "Activité", sections: ["fil"] },
  /* l'onglet « Projects » de l'Initiative : les lots du chantier sur la frise de Chantiers */
  { cle: "projets", libelle: "Lots" },
  { cle: "terrain", libelle: "Terrain", sections: ["planning", "controles", "questions", "appro", "meteo"] },
  { cle: "argent", libelle: "Argent", sections: ["avenants", "situations", "marche", "lots", "factures", "heures"] },
  { cle: "reception", libelle: "Réception", sections: ["reception"] },
];
const estOnglet = (v: string | null): v is CleOnglet => ONGLETS.some((o) => o.cle === v);
const PARTIES: Partial<Record<SectionChantier, string>> = {
  planning: "Planning",
  controles: "Points à régler",
  questions: "Questions",
  appro: "Approvisionnement",
  meteo: "Météo",
  avenants: "Avenants",
  situations: "Situations",
  marche: "Marché",
  lots: "Lots et déboursé",
  factures: "Factures",
  heures: "Heures",
};

/* l'icône du fil d'Ariane, couleur du statut (couleurs d'icônes relevées chez Linear) */
const COULEUR_FIL: Record<StatutChantier, string> = { preparation: "#f0bf00", ouvert: "#26b5ce", suspendu: "#e78f41", receptionne: "#5e6ad2", clos: "#a2a6ac", annule: "#a2a6ac" };

const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};

/* au-dessous de 1 200 px, le volet passe au-dessus du contenu */
const LARGE = "(min-width: 1200px)";
const abonner = (cb: () => void) => {
  const m = window.matchMedia(LARGE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const useLarge = () =>
  useSyncExternalStore(
    abonner,
    () => window.matchMedia(LARGE).matches,
    () => false,
  );

export default function FicheChantier({ id }: { id: string }) {
  const { source, pret, erreur, liste, tableau, demander, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const chemin = usePathname();
  const routeur = useRouter();
  const toast = useToast();
  const large = useLarge();
  const [voletChoisi, setVoletChoisi] = useState<boolean | null>(null);
  /* 30/10/2026 : l'élément choisi dans une partie (passage, avenant, commande…) s'ouvre dans le volet */
  const [choisie, setChoisie] = useState<string | null>(null);
  const [cible, setCible] = useState<HTMLElement | null>(null);
  /* fermé à l'arrivée, comme chez Linear (capture 1440-reel) ; ⌘ I ou le bouton l'ouvre */
  const volet = choisie !== null || (voletChoisi ?? false);
  /* les gestes de l'en-tête (ouvrir, suspendre, avenant, facture, relevé) : les fenêtres de ChantierVue */
  const [demande, setDemande] = useState<{ n: number; form: FormChantier } | null>(null);
  const geste = (form: FormChantier) => setDemande((d) => ({ n: (d?.n ?? 0) + 1, form }));
  /* 04/11 — Terrain, Argent et Réception en pages d'outil (../lorani/OngletOutil) : les parties montées
     cachées (`cache`) et la carte affichée gardent leurs gestes, qu'un bouton de la barre déclenche */
  const cache = useRef<HTMLDivElement>(null);

  const o = params.get("onglet");
  const onglet: CleOnglet = estOnglet(o) ? o : "apercu";
  const t = tableau(id);
  const lu = t !== null;

  /* en base réelle, le tableau du chantier se lit une fois */
  useEffect(() => {
    if (source === "reelle" && pret) demander(id);
  }, [source, pret, id, demander]);

  /* l'ancre de l'adresse (#planning, #avenants, #situations, #fil) : rejointe une fois l'onglet rendu */
  useEffect(() => {
    if (!lu) return;
    const ancre = window.location.hash.slice(1);
    if (!ancre) return;
    const minuterie = window.setTimeout(() => document.getElementById(decodeURIComponent(ancre))?.scrollIntoView({ block: "start" }), 80);
    return () => window.clearTimeout(minuterie);
  }, [onglet, lu]);

  const absent = source === "exemple" ? !t : pret && !t && !enLecture(id) && (!!erreur || !liste.some((c) => c.id === id));
  const chantierListe = liste.find((c) => c.id === id) ?? null;
  const favoris = useFavoris();
  const suivis = useSuivis();
  const epingle = favoris.estEpingle("btp_chantiers", id);
  const suivi = suivis.estSuivi("btp_chantiers", id);
  const nom = t?.chantier.nom ?? chantierListe?.nom ?? "Chantier";
  const lienParam = (cle: string, valeur: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (valeur === null) p.delete(cle);
    else p.set(cle, valeur);
    return `${chemin}?${p.toString()}`;
  };
  const lienOnglet = (cle: CleOnglet) => (cle === "apercu" ? chemin : `${chemin}?onglet=${cle}`);
  const relire = () => relireChantier(id);

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const courant = ONGLETS.find((x) => x.cle === onglet);
  const declencher = (libelle: string) => {
    const boutons = [...(cache.current?.querySelectorAll("button") ?? []), ...document.querySelectorAll(".lor-at-contenu button")] as HTMLButtonElement[];
    const b = boutons.find((x) => (x.textContent ?? "").trim().startsWith(libelle));
    if (!b) return toast(`« ${libelle} » n'est pas possible pour l'instant.`);
    if (b.disabled) return toast(`« ${libelle} » n'est pas possible pour l'instant.`);
    b.click();
  };
  const auj = useMemo(() => jourLocal(), []);
  /* la partie montrée : ?partie=, sinon l'ancre d'un repère, sinon la première ; « tout » rend la pile */
  const [ancre, setAncre] = useState("");
  useEffect(() => {
    const lire = () => setAncre(decodeURIComponent(window.location.hash.slice(1)));
    lire();
    window.addEventListener("hashchange", lire);
    return () => window.removeEventListener("hashchange", lire);
  }, []);
  const pParam = params.get("partie");
  const parties = courant?.sections && courant.sections.length > 1 ? courant.sections : null;
  const partie: SectionChantier | "tout" | null = !parties
    ? null
    : pParam === "tout"
      ? "tout"
      : parties.find((x) => x === pParam) ?? parties.find((x) => x === ancre) ?? parties[0];
  const lienPartie = (x: SectionChantier | "tout") => `${chemin}?onglet=${onglet}&partie=${x}`;
  const sectionsMontrees = partie === null || partie === "tout" ? courant?.sections : [partie];
  const listeDal = params.get("liste") ?? (pParam && pParam !== "tout" ? pParam : null);
  const lienListeDal = (l: string) => `${chemin}?onglet=${onglet}&liste=${l}`;
  const outilDal = ((tb: Tableau | null): { listes: Liste[]; resume: string; avis: string | null; cachees: SectionChantier[] } | null => {
    if (!tb || (onglet !== "terrain" && onglet !== "argent" && onglet !== "reception")) return null;
    const vide = (x: string) => <span className="lor-at-discret">{x}</span>;
    const jour = (d: string | null | undefined) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null);
    const euros = (n: number | null | undefined) => (n === null || n === undefined ? vide("—") : `${Math.round(n).toLocaleString("fr-FR")} €`);
    const carte = (sec: SectionChantier) => (
      <Habille>
        <ChantierVue key={`${sec}-${source}-${id}`} tableau={tb} source={source} onLocal={onLocal} relire={relire} sections={[sec]} />
      </Habille>
    );
    if (onglet === "terrain") {
      const points = [...tb.controles.map((k) => ({ k, p: "controle" })), ...tb.controles_organisation.map((k) => ({ k, p: "orga" }))].sort((a, b) => ["bloquant", "attention", "info"].indexOf(a.k.gravite) - ["bloquant", "attention", "info"].indexOf(b.k.gravite));
      const passages = tb.passages.filter((x) => x.statut !== "annule").sort((a, b) => a.debut.localeCompare(b.debut));
      const bloquants = points.filter((x) => x.k.gravite === "bloquant").length;
      const aVenir = passages.filter((x) => x.statut === "prevu" && x.fin >= auj).length;
      const enRetard = passages.filter((x) => x.statut === "prevu" && x.fin < auj).length;
      return {
        resume: `${bloquants ? `${bloquants} point${bloquants > 1 ? "s" : ""} bloquant${bloquants > 1 ? "s" : ""}` : "Aucun point bloquant"} · ${aVenir} passage${aVenir > 1 ? "s" : ""} à venir${enRetard ? `, ${enRetard} en retard` : ""}`,
        avis: null,
        cachees: ["controles", "planning"],
        listes: [
          {
            cle: "controles",
            libelle: "Points à régler",
            tri: "gravité",
            vide: "Rien à régler : les contrôles du chantier et de l'organisation ne relèvent aucun point.",
            pied: points.length ? `${points.length} point${points.length > 1 ? "s" : ""} · ${bloquants} bloquant${bloquants > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Point", largeur: "minmax(260px, 1fr)" },
              { libelle: "Famille", largeur: "minmax(140px, 200px)" },
              { libelle: "Gravité", largeur: "150px" },
            ],
            rangs: points.map(({ k, p }) => ({
              id: `${p}:${k.code}:${k.objet_id}`,
              cle: `${p}:${k.code}:${k.objet_id}`,
              cellules: [
                <span key="m" className="lor-at-cell-texte">{k.message}</span>,
                p === "orga" ? "Organisation" : familleControle(k.code),
                k.gravite === "bloquant" ? <Etat key="g" teinte="rouge">Bloquant</Etat> : k.gravite === "attention" ? <Etat key="g" teinte="bleu">À voir</Etat> : <Etat key="g" teinte="gris">Pour information</Etat>,
              ],
            })),
            gestes: [],
          },
          {
            cle: "planning",
            libelle: "Planning",
            tri: "date de début",
            vide: "Aucun passage prévu : importez le planning (tableur, Alobees) ou saisissez les passages des équipes et des entreprises.",
            pied: passages.length ? `${passages.length} passage${passages.length > 1 ? "s" : ""} · ${aVenir} à venir` : undefined,
            colonnes: [
              { libelle: "Tâche", largeur: "minmax(220px, 1fr)" },
              { libelle: "Lot", largeur: "minmax(140px, 200px)" },
              { libelle: "Intervenant", largeur: "minmax(140px, 200px)" },
              { libelle: "Du", largeur: "90px" },
              { libelle: "Au", largeur: "90px" },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: passages.map((x) => ({
              id: x.id,
              cle: `passage:${x.id}`,
              cellules: [
                <span key="t" className="lor-at-cell-texte">{x.tache ?? "Passage"}</span>,
                x.lot_code ? <span key="l" className="lor-at-cell-texte">{`Lot ${x.lot_code}${x.lot_libelle ? ` · ${x.lot_libelle}` : ""}`}</span> : vide("—"),
                x.intervenant_nom ?? x.intervenant_lu ? <span key="i" className="lor-at-cell-texte">{x.intervenant_nom ?? x.intervenant_lu}</span> : vide("—"),
                jour(x.debut),
                jour(x.fin),
                x.statut === "fait" ? <Etat key="e" teinte="vert">Fait</Etat> : x.fin < auj ? <Etat key="e" teinte="rouge">En retard</Etat> : x.confirmation === "confirmee" ? <Etat key="e" teinte="vert">Confirmé</Etat> : x.confirmation === "declinee" ? <Etat key="e" teinte="rouge">Décliné</Etat> : x.confirmation === "demandee" ? <Etat key="e" teinte="bleu">Demandée</Etat> : <Etat key="e" teinte="gris">Prévu</Etat>,
              ],
            })),
            gestes: [{ libelle: "Proposer les dépendances" }],
          },
          { cle: "appro", libelle: "Approvisionnement", colonnes: [], rangs: [], vide: "", gestes: [{ libelle: "Préparer la liste depuis le devis" }, { libelle: "Nouvelle commande", principal: true }], contenu: carte("appro") },
          { cle: "meteo", libelle: "Météo", colonnes: [], rangs: [], vide: "", gestes: [], contenu: carte("meteo") },
          { cle: "questions", libelle: "Questions", colonnes: [], rangs: [], vide: "", gestes: [], contenu: carte("questions") },
        ],
      };
    }
    if (onglet === "argent") {
      const marche = tb.marches[0] ?? null;
      const avenants = tb.avenants.slice().sort((a, b) => b.numero - a.numero);
      const lignes = marche ? marche.lignes.slice().sort((a, b) => a.ordre - b.ordre) : [];
      const factures = tb.factures.filter((f) => f.statut === "rattachee");
      const signes = avenants.filter((a) => a.statut === "signe").reduce((x, a) => x + (a.montant_ht ?? 0), 0);
      return {
        resume: `${marche ? `Marché${marche.reference ? ` ${marche.reference}` : ""} ${marche.statut === "verifie" ? "vérifié" : "à vérifier"}${tb.voit_prix && marche.total_ht_lignes !== null ? ` · ${Math.round(marche.total_ht_lignes).toLocaleString("fr-FR")} € HT` : ""}` : "Pas encore de marché"} · ${avenants.length} avenant${avenants.length > 1 ? "s" : ""}${tb.voit_prix && signes ? ` (${Math.round(signes).toLocaleString("fr-FR")} € HT signés)` : ""} · ${factures.length ? `${factures.length} facture${factures.length > 1 ? "s" : ""} rattachée${factures.length > 1 ? "s" : ""}` : "aucune facture rattachée"}`,
        avis: null,
        cachees: ["avenants", "marche", "lots", "factures"],
        listes: [
          {
            cle: "avenants",
            libelle: "Avenants",
            tri: "numéro",
            vide: "Aucun avenant : un travail en plus, demandé sur le chantier, devient ici un avenant à chiffrer puis à faire signer.",
            pied: avenants.length ? `${avenants.length} avenant${avenants.length > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "N°", largeur: "64px" },
              { libelle: "Objet", largeur: "minmax(240px, 1fr)" },
              { libelle: "Montant HT", largeur: "130px", droite: true },
              { libelle: "Soumis le", largeur: "110px" },
              { libelle: "État", largeur: "150px" },
            ],
            rangs: avenants.map((a) => ({
              id: a.id,
              cle: `avenant:${a.id}`,
              cellules: [
                <span key="n" className="lor-at-mono">n° {a.numero}</span>,
                <span key="o" className="lor-at-cell-texte">{a.objet}</span>,
                euros(a.montant_ht),
                jour(a.soumis_le) ?? vide("—"),
                <Etat key="e" teinte={a.statut === "signe" ? "vert" : a.statut === "refuse" ? "rouge" : a.statut === "abandonne" ? "gris" : "bleu"}>{STATUTS_AVENANT[a.statut].libelle}</Etat>,
              ],
            })),
            gestes: [{ libelle: "Ouvrir un avenant", principal: true }],
          },
          {
            cle: "marche",
            libelle: "Marché",
            tri: "ordre du devis",
            vide: "Aucun marché : les avenants et les situations ne se chiffrent pas tant que le marché signé n'est pas saisi puis vérifié ligne à ligne.",
            pied: lignes.length ? `${lignes.length} ligne${lignes.length > 1 ? "s" : ""}${lignes.filter((l) => l.controle !== "ok" && !l.ecart_accepte).length ? ` · ${lignes.filter((l) => l.controle !== "ok" && !l.ecart_accepte).length} à revoir` : ""}` : undefined,
            colonnes: [
              { libelle: "N°", largeur: "72px" },
              { libelle: "Désignation", largeur: "minmax(240px, 1fr)" },
              { libelle: "Unité", largeur: "70px" },
              { libelle: "Quantité", largeur: "100px", droite: true },
              { libelle: "PU HT", largeur: "110px", droite: true },
              { libelle: "Montant HT", largeur: "120px", droite: true },
              { libelle: "Contrôle", largeur: "150px" },
            ],
            rangs: lignes.map((l) => ({
              id: l.id,
              cle: `ligne:${l.id}`,
              cellules: [
                <span key="n" className="lor-at-mono">{l.numero ?? l.ordre}</span>,
                <span key="d" className="lor-at-cell-texte">{l.designation}</span>,
                l.unite ?? vide("—"),
                l.quantite === null ? vide("—") : l.quantite.toLocaleString("fr-FR"),
                euros(l.prix_unitaire_ht),
                euros(l.montant_ht),
                l.controle === "ok" || l.ecart_accepte ? <Etat key="c" teinte="vert">{l.ecart_accepte ? "Écart accepté" : "Juste"}</Etat> : <Etat key="c" teinte="rouge">{l.controle === "montant_faux" ? "Montant faux" : "Incomplète"}</Etat>,
              ],
            })),
            gestes: marche ? [{ libelle: "Ajouter une ligne" }, { libelle: "Importer le devis" }, { libelle: "Vérifier le marché", principal: true }] : [{ libelle: "Saisir le marché", principal: true }],
          },
          {
            cle: "lots",
            libelle: "Lots et déboursé",
            tri: "lot",
            vide: "Aucun lot.",
            pied: tb.lots.length ? `${tb.lots.length} lot${tb.lots.length > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Lot", largeur: "minmax(220px, 1fr)" },
              { libelle: "Engagé HT", largeur: "130px", droite: true },
              { libelle: "Facturé HT", largeur: "130px", droite: true },
              { libelle: "Reste HT", largeur: "130px", droite: true },
              { libelle: "État", largeur: "130px" },
            ],
            rangs: tb.lots
              .slice()
              .sort((a, b) => a.rang - b.rang)
              .map((l) => {
                const d = tb.debourse.find((x) => x.lot_id === l.id);
                return {
                  id: l.id,
                  cle: `lot:${l.id}`,
                  cellules: [
                    <span key="l" className="lor-at-cell-texte">{`${l.code} · ${l.libelle}`}</span>,
                    euros(d && d.engage_marche_ht !== null ? d.engage_marche_ht + (d.engage_avenants_ht ?? 0) : null),
                    euros(d?.facture_ht),
                    euros(d?.reste_ht),
                    l.statut === "termine" ? <Etat key="e" teinte="vert">Terminé</Etat> : l.statut === "en_cours" ? <Etat key="e" teinte="bleu">En cours</Etat> : <Etat key="e" teinte="gris">À venir</Etat>,
                  ],
                };
              }),
            gestes: [],
          },
          {
            cle: "factures",
            libelle: "Factures",
            tri: "date",
            vide: "Aucune facture fournisseur rattachée à ce chantier.",
            pied: factures.length ? `${factures.length} facture${factures.length > 1 ? "s" : ""}` : undefined,
            colonnes: [
              { libelle: "Fournisseur", largeur: "minmax(200px, 1fr)" },
              { libelle: "N°", largeur: "130px" },
              { libelle: "Lot", largeur: "minmax(130px, 200px)" },
              { libelle: "Émise le", largeur: "110px" },
              { libelle: "Montant HT", largeur: "130px", droite: true },
            ],
            rangs: factures
              .slice()
              .sort((a, b) => (b.date_emission ?? "").localeCompare(a.date_emission ?? ""))
              .map((f) => ({
                id: f.id,
                cle: `facture:${f.id}`,
                cellules: [
                  <span key="f" className="lor-at-cell-texte">{f.fournisseur_nom ?? "Fournisseur inconnu"}</span>,
                  f.facture_numero ? <span key="n" className="lor-at-mono">{f.facture_numero}</span> : vide("—"),
                  f.lot_code ? <span key="l" className="lor-at-cell-texte">{`Lot ${f.lot_code}${f.lot_libelle ? ` · ${f.lot_libelle}` : ""}`}</span> : vide("—"),
                  jour(f.date_emission) ?? vide("—"),
                  euros(f.montant_ht),
                ],
              })),
            gestes: [{ libelle: "Rattacher une facture", principal: true }],
          },
          { cle: "situations", libelle: "Situations", colonnes: [], rangs: [], vide: "", gestes: [{ libelle: "Nouvelle situation", principal: true }], contenu: carte("situations") },
          { cle: "heures", libelle: "Heures", colonnes: [], rangs: [], vide: "", gestes: [{ libelle: "Coût horaire" }, { libelle: "Pointer une équipe", principal: true }], contenu: carte("heures") },
        ],
      };
    }
    const r = tb.reception ?? null;
    const nonLevees = r ? r.reserves.filter((x) => x.statut !== "levee").length : 0;
    return {
      resume: r ? `Réception prononcée le ${jour(r.date_reception)}${r.avec_reserves ? ` avec ${r.reserves.length} réserve${r.reserves.length > 1 ? "s" : ""}, ${nonLevees} à lever` : " sans réserve"}` : "Réception pas encore prononcée",
      avis: null,
      cachees: [],
      listes: [{ cle: "reception", libelle: "Réception des travaux", colonnes: [], rangs: [], vide: "", gestes: r ? [] : [{ libelle: "Prononcer la réception", principal: true }], contenu: carte("reception") }],
    };
  })(t);

  /* changer d'onglet ou de partie referme l'élément choisi ; Échap aussi */
  const [vue, setVue] = useState(`${onglet}/${partie}`);
  if (vue !== `${onglet}/${partie}`) {
    setVue(`${onglet}/${partie}`);
    setChoisie(null);
  }
  useEffect(() => {
    if (choisie === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      setChoisie(null);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choisie]);
  /* moins large, le volet passe au-dessus du contenu : on l'amène à l'écran */
  useEffect(() => {
    if (choisie === null || large || !cible) return;
    cible.parentElement?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [choisie, large, cible]);
  const contexte = useMemo(() => ({ cible, choisie, choisir: setChoisie }), [cible, choisie]);
  /* ⌘ I ouvre ou ferme le volet de détails (raccourci de Linear) */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "i") return;
      e.preventDefault();
      setChoisie(null);
      setVoletChoisi(!volet);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [volet]);

  return (
    <VoletContexte.Provider value={contexte}>
    <DalCarte className="dal-fc dal-tl-page">
    <div className="lin lit">
      <h1 className="v2-sr">{nom}</h1>

      <header className="dal-tete">
        <div className="dal-ligne1">
          <nav className="dal-fc-fil" aria-label="Fil d'Ariane">
            <Link href={`${BASE}/chantiers`} className="dal-fc-fil-lien">
              Chantiers
            </Link>
            <span className="dal-fc-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="dal-fc-fil-ici" aria-current="page">
              <DalIcone nom="Crane" style={{ color: COULEUR_FIL[t?.chantier.statut ?? "preparation"] }} />
              <span>{nom}</span>
            </span>
          </nav>
          {/* étoile « Add to favorites » → Épingler : le chantier remonte en tête de la vue d'ensemble */}
          <button
            type="button"
            className="dal-rond"
            role="switch"
            aria-checked={epingle}
            aria-label={epingle ? "Désépingler le chantier" : "Épingler le chantier"}
            title={epingle ? "Désépingler (retirer des épinglés de la vue d'ensemble)" : "Épingler en tête de la vue d'ensemble"}
            onClick={() => favoris.basculer({ type: "btp_chantiers", id, titre: nom, href: `${BASE}/chantiers/${encodeURIComponent(id)}` })}
          >
            {epingle ? <EtoilePleine /> : <DalIcone nom="Etoile" taille={14} />}
          </button>
          <DalMenu
            libelle="Actions sur le chantier"
            options={[
              ...(t?.chantier.statut === "preparation" ? [{ libelle: "Ouvrir le chantier…", icone: "Lock" as const, action: () => geste({ type: "statut", statut: "ouvert" }) }] : []),
              ...(t?.chantier.statut === "ouvert" ? [{ libelle: "Suspendre le chantier…", icone: "Hourglass" as const, action: () => geste({ type: "statut", statut: "suspendu" }) }] : []),
              ...(t?.chantier.statut === "suspendu" ? [{ libelle: "Reprendre le chantier…", icone: "Refresh" as const, action: () => geste({ type: "statut", statut: "ouvert" }) }] : []),
              ...(t && (t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu") ? [{ libelle: "Ouvrir un avenant…", icone: "Signature" as const, action: () => geste({ type: "avenant" }) }] : []),
              { libelle: "Rattacher une facture…", icone: "Attachment", action: () => geste({ type: "facture" }) },
              { libelle: "Relevé du chantier…", icone: "Checklist", action: () => geste({ type: "releve" }) },
              "sep",
              { libelle: "Détails du chantier", icone: "Volet", action: () => (setChoisie(null), setVoletChoisi(true)) },
              { libelle: "Fil du chantier", icone: "Comment", href: `${chemin}?onglet=fil` },
              { libelle: "Avenants et situations", icone: "Signature", href: `${BASE}/avenants` },
            ]}
          />
          <span className="dal-pousse" />
          <button type="button" className="dal-rond dal-fc-24" aria-label="Copier le lien de la page" title="Copier le lien de la page" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
          {/* cloche « Notifications » → Suivre : ses nouveaux messages passent en tête d'À ranger, marqués « suivi » */}
          <button
            type="button"
            className="dal-rond"
            aria-pressed={suivi}
            aria-label={suivi ? "Ne plus suivre le chantier" : "Suivre le chantier"}
            title={suivi ? "Suivi : ses nouveaux messages passent en tête d'À ranger — ne plus suivre" : "Suivre : ses nouveaux messages passeront en tête d'À ranger"}
            onClick={() => suivis.basculer({ type: "btp_chantiers", id, titre: nom, href: `${BASE}/chantiers/${encodeURIComponent(id)}` })}
          >
            <DalIcone nom={suivi ? "Notified" : "Subscribe"} taille={14} />
          </button>
          <button
            type="button"
            className="dal-rond"
            aria-label="Ouvrir un avenant"
            title={t && (t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu") ? "Ouvrir un avenant" : "Un avenant se prépare sur un chantier ouvert"}
            disabled={!t || (t.chantier.statut !== "ouvert" && t.chantier.statut !== "suspendu")}
            onClick={() => geste({ type: "avenant" })}
          >
            <DalIcone nom="Plus" />
          </button>
        </div>
        <div className="dal-ligne2 dal-fc-ligne2">
          <span className="dal-fc-onglets">
            {ONGLETS.map((x) => (
              <Link key={x.cle} href={lienOnglet(x.cle)} scroll={false} className="dal-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
                {x.libelle}
              </Link>
            ))}
            <Link href={`${BASE}/avenants`} className="dal-rond dal-fc-vue" aria-label="Avenants et situations" title="Avenants et situations">
              <DalIcone nom="CustomView" />
            </Link>
          </span>
          <span className="dal-pousse" />
          {onglet === "projets" ? (
            <span className="dal-fc-outils">
              <DalMenu
                libelle="Filtrer les lots"
                icone="Filtre"
                plein
                alignement="droite"
                actif={!!params.get("lots")}
                options={[
                  { libelle: "Tous les lots", icone: "Project", href: lienParam("lots", null) },
                  { libelle: "En cours", icone: "IssueStatusStarted", href: lienParam("lots", "en_cours") },
                  { libelle: "À venir", icone: "IssueStatusTodo", href: lienParam("lots", "a_venir") },
                  { libelle: "Terminés", icone: "IssueStatusDone", href: lienParam("lots", "termine") },
                ]}
              />
              <DalMenu
                libelle="Options d'affichage"
                icone="Affichage"
                plein
                alignement="droite"
                options={[
                  { libelle: "Échelle : mois", icone: "Calendar", href: lienParam("zoom", "mois") },
                  { libelle: "Échelle : trimestre", icone: "Calendar", href: lienParam("zoom", "trimestre") },
                  { libelle: "Échelle : année", icone: "Calendar", href: lienParam("zoom", null) },
                ]}
              />
            </span>
          ) : null}
          <button
            type="button"
            className="dal-rond dal-rond--plein"
            aria-label={volet ? "Fermer les détails du chantier" : "Ouvrir les détails du chantier"}
            title={volet ? "Fermer les détails du chantier (⌘ I)" : "Ouvrir les détails du chantier (⌘ I)"}
            aria-expanded={volet}
            aria-controls={volet ? "dal-ini-volet" : undefined}
            onClick={() => {
              setChoisie(null);
              setVoletChoisi(!volet);
            }}
          >
            <DalIcone nom="Volet" />
          </button>
        </div>
      </header>

      {!t ? (
        <div className="lit-corps">
          <div className="lit-zone">
            <p className="lit-vide" role={absent ? "alert" : "status"}>
              {absent ? (
                <>
                  Ce chantier n&apos;est pas visible avec ce compte.{" "}
                  <Link href={`${BASE}/chantiers`} className="lit-lien">
                    Revenir aux chantiers
                  </Link>
                </>
              ) : (
                "Lecture du chantier…"
              )}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="dal-fc-gestes">
            <Habille>
              <ChantierVue key={`gestes-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={[]} demande={demande} />
            </Habille>
          </div>
          {onglet === "projets" ? (
            <Chantiers lotsDe={id} />
          ) : onglet === "apercu" || onglet === "fil" ? (
            <div className="dal-ini-corps">
              <div className="dal-ini-zone">
                {onglet === "apercu" ? (
                  <ApercuChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} ouvrirVolet={() => setVoletChoisi(true)} demander={geste} />
                ) : (
                  <div id="fil">
                    <ActiviteChantier
                      t={t}
                      source={source}
                      relire={relire}
                      ici={chemin}
                      actions={{
                        question: (texte) => routeur.push(`${chemin}?onglet=terrain&partie=questions&question=${encodeURIComponent(texte)}`),
                        avenant: (objet) => geste({ type: "avenant", objet }),
                        facture: () => geste({ type: "facture" }),
                        avenantPossible: t.chantier.statut === "ouvert" || t.chantier.statut === "suspendu",
                      }}
                    />
                  </div>
                )}
              </div>
              {volet ? <VoletChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} /> : null}
            </div>
          ) : (
            <div className="lit-corps" data-volet={volet ? "" : undefined}>
              <div className="lit-zone">
                {outilDal ? (
                  <>
                    {onglet === "reception" && !t.reception && !["ouvert", "suspendu", "receptionne", "clos"].includes(t.chantier.statut) ? (
                      <p className="lit-vide">La réception se prononce sur un chantier ouvert ou suspendu. Ouvrez d&apos;abord le chantier, depuis le menu « … ».</p>
                    ) : null}
                    <OngletOutil
                      listes={outilDal.listes}
                      courante={listeDal ?? outilDal.listes[0].cle}
                      lienListe={lienListeDal}
                      resume={outilDal.resume}
                      avis={outilDal.avis}
                      declencher={declencher}
                      choisir={(c) => setChoisie(c)}
                      choisie={choisie}
                    />
                    <div ref={cache} hidden>
                      <Habille>
                        <ChantierVue key={`cache-${onglet}-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={outilDal.cachees} />
                      </Habille>
                    </div>
                  </>
                ) : (
                <div className="lit-gestes">
                  {onglet === "reception" && !t.reception && !["ouvert", "suspendu", "receptionne", "clos"].includes(t.chantier.statut) ? (
                    <p className="lit-vide">La réception se prononce sur un chantier ouvert ou suspendu. Ouvrez d&apos;abord le chantier, depuis le menu « … ».</p>
                  ) : null}
                  {onglet === "argent" ? <Essentiel t={t} onglet={onglet} auj={auj} phrases={false} /> : null}
                  {parties ? (
                    <nav className="lit-parties" aria-label={`Parties de l'onglet ${courant?.libelle ?? ""}`}>
                      {parties.map((x) => (
                        <Link key={x} href={lienPartie(x)} scroll={false} className="lit-partie" aria-current={partie === x ? "page" : undefined}>
                          {PARTIES[x] ?? x}
                        </Link>
                      ))}
                      <Link href={lienPartie("tout")} scroll={false} className="lit-partie lit-partie--tout" aria-current={partie === "tout" ? "page" : undefined}>
                        Tout voir
                      </Link>
                    </nav>
                  ) : null}
                  <Habille>
                    <ChantierVue key={`${onglet}-${source}-${id}`} tableau={t} source={source} onLocal={onLocal} relire={relire} sections={sectionsMontrees} />
                  </Habille>
                </div>
                )}
              </div>
              {volet ? (
                <aside className="lit-volet" aria-label="Élément choisi">
                  <div ref={setCible} className="lvp-cible" />
                  {choisie === null ? <VoletChantier t={t} c={chantierListe ?? t.chantier} ici={chemin} /> : null}
                </aside>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
    </DalCarte>
    </VoletContexte.Provider>
  );
}
