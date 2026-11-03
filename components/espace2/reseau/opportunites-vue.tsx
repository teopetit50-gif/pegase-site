"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega › Opportunités — reprise du 02/11/2026 (soir)

   Ce que le réseau fait gagner à « vous », l'organisation connectée
   d'Espace 2 (useOrganisation : CAMA dans l'exemple). Jamais un membre.

   LA DA est celle des cinq moteurs (demande de Teo, 02/11) : le kit
   ../lin (lin.css, Lin.tsx, CarteCentrale), au plus près de la page
   OFFLOAD › Affaires en plan (vue « Board » de Linear) : barre du titre de
   44 px et ses boutons ronds (à examiner, Filtrer, Affichage), barre
   d'outils à onglets, colonnes de 348 px, cartes de Linear (référence,
   titre, pastilles, pied), carte ouverte AU MILIEU (CarteCentrale, ?id=),
   sombre et clair par les jetons --lin-*.

   LE CONTENU suit les pages publiques d'Attio relevées le 02/11 (aucun
   compte, aucune connexion) :
     · « Create and manage kanban views »
       https://attio.com/help/reference/managing-your-data/views/create-and-manage-kanban-views
       → des cartes qui avancent d'étape en étape ; regroupement au choix
       (« Grouped by ») : ici par famille ou par étape ; masquer une
       colonne (« Hide stage »), cartes réduites (« Collapse cards », le
       seul nom) ; filtre et recherche ; le nom en haut de la carte ouvre
       l'aperçu sans quitter le tableau (« Open preview ») ;
     · « Create and view records » et « Configure record pages »
       https://attio.com/help/reference/managing-your-data/records/create-and-view-records
       https://attio.com/help/reference/managing-your-data/records/configure-record-pages
       → l'aperçu d'un record : ses attributs mis en avant, les records
       liés (le membre, qui mène à sa fiche), l'activité, les gestes ;
     · « Manage standard objects », objet Deals
       https://attio.com/help/reference/managing-your-data/objects/manage-standard-objects
       → les champs d'une affaire : nom, étape, valeur, entreprise liée,
       prochaine échéance ;
     · « Set up a Funnel report »
       https://attio.com/help/reference/managing-your-data/dashboard-and-reports/set-up-a-funnel-report
       → « Ce que le réseau vous a apporté » : les étapes du suivi et le
       taux de passage de l'une à la suivante (« Funnel Steps »), puis les
       records eux-mêmes ;
     · la page d'accueil, kanban rendu en vrai DOM : https://attio.com/
       → la carte : nom, date, valeur, entreprise, note, âge.

   Trois familles (le brief) : mises en relation tirées des données
   (« Accepter », « Pas maintenant »), groupements de marchés publics
   (« Former un groupement »), achats groupés (« Je participe »). Une
   opportunité ne cite que les badges que le membre montre (lus dans
   MEMBRES[].badges) ; un membre cité mène à sa fiche.

   Exemple ou réel : reseauEnExemple(source) ; en base réelle, ReseauVide.
   Les gestes restent dans la page : rien n'est écrit en base.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { BadgeCheck, Banknote, Building2, Check, Eye, EyeOff, Handshake, Landmark, ListFilter, MapPin, Network, ShoppingCart, SlidersHorizontal, Undo2, Users, X } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { useOrganisation } from "../organisation";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { Note } from "../ui";
import { Choix, Menu, MenuActions, type Option } from "../lin/Lin";
import { CarteCentrale, Feuille } from "../lin/CarteCentrale";
import { IconeNonLus, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { MEMBRES, type Ile, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { ReseauVide } from "./reseau-vide";
import { ACHATS_GROUPES, GROUPEMENTS, MISES_EN_RELATION, SUIVI, type AchatGroupe, type Groupement, type MiseEnRelation, type Suivi } from "./opportunites-donnees";
import "../lin/lin.css";
import "./opportunites.css";

/* ——— outils ——— */

const PAR_SLUG = new Map(MEMBRES.map((m) => [m.slug, m]));
const membre = (slug: string): Membre => {
  const m = PAR_SLUG.get(slug);
  if (!m) throw new Error(`Membre inconnu : ${slug}`);
  return m;
};
const ficheMembre = (slug: string) => `${RACINE}/reseau/membres/${slug}`;
const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
const date = (iso: string, annee = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: annee ? "numeric" : undefined, timeZone: "UTC" });
const mois = (aaaamm: string) => new Date(`${aaaamm}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m.charAt(0).toUpperCase())
    .join("");
const ic = { width: 16, height: 16, "aria-hidden": true, strokeWidth: 1.8 } as const;

/* les badges que le membre a choisi de montrer, et eux seuls */
function badgesDe(slug: string): { cle: string; texte: string; titre: string }[] {
  const { badges } = membre(slug);
  const l: { cle: string; texte: string; titre: string }[] = [];
  if (badges.bonPayeur) l.push({ cle: "p", texte: `Paie en ${badges.bonPayeur.delaiJours} j`, titre: "Délai moyen de paiement de ses fournisseurs, sur 12 mois" });
  if (badges.reponseRapide) l.push({ cle: "r", texte: `Répond en ${duree(badges.reponseRapide.delaiMinutes)}`, titre: "Délai médian de première réponse aux demandes" });
  return l;
}

/* ——— le modèle commun d'une carte ——— */

type Famille = "relation" | "groupement" | "achat";
type Etape = "examiner" | "engagee" | "de_cote";
type Carte =
  | { id: string; ref: string; famille: "relation"; r: MiseEnRelation }
  | { id: string; ref: string; famille: "groupement"; g: Groupement }
  | { id: string; ref: string; famille: "achat"; a: AchatGroupe };

const CARTES: Carte[] = [
  ...MISES_EN_RELATION.map((r, i) => ({ id: r.id, ref: `MR-${i + 1}`, famille: "relation" as const, r })),
  ...GROUPEMENTS.map((g, i) => ({ id: g.id, ref: `GM-${i + 1}`, famille: "groupement" as const, g })),
  ...ACHATS_GROUPES.map((a, i) => ({ id: a.id, ref: `AG-${i + 1}`, famille: "achat" as const, a })),
];

const FAMILLES: { cle: Famille; libelle: string; court: string; icone: typeof Handshake }[] = [
  { cle: "relation", libelle: "Mises en relation", court: "Mise en relation", icone: Handshake },
  { cle: "groupement", libelle: "Groupements de marchés publics", court: "Groupement de marché public", icone: Landmark },
  { cle: "achat", libelle: "Achats groupés", court: "Achat groupé", icone: ShoppingCart },
];
const FAMILLE = Object.fromEntries(FAMILLES.map((f) => [f.cle, f])) as Record<Famille, (typeof FAMILLES)[number]>;

const ETAPES: { cle: Etape; libelle: string; un: string; etat: EtatProjet }[] = [
  { cle: "examiner", libelle: "À examiner", un: "À examiner", etat: "planifie" },
  { cle: "engagee", libelle: "Engagées", un: "Engagée", etat: "en-cours" },
  { cle: "de_cote", libelle: "Mises de côté", un: "Mise de côté", etat: "annule" },
];
const ETAPE = Object.fromEntries(ETAPES.map((e) => [e.cle, e])) as Record<Etape, (typeof ETAPES)[number]>;

const titreDe = (c: Carte) => (c.famille === "relation" ? c.r.titre : c.famille === "groupement" ? `${c.g.titre}, ${c.g.montant}` : c.a.titre);
/* les membres cités par une carte (pour le filtre d'île et la recherche) */
const citesDe = (c: Carte): string[] =>
  c.famille === "relation" ? [c.r.membre] : c.famille === "groupement" ? c.g.lots.flatMap((l) => (l.titulaire ? [l.titulaire] : [])) : c.a.organisateur ? [c.a.organisateur] : [];

type Regroupement = "famille" | "etape";
type FiltreIle = "toutes" | Ile;

/* ══════════════════════════════════════════════════════════════════════ */

export default function Opportunites() {
  const { source } = useSource();
  const exemple = reseauEnExemple(source);
  const org = useOrganisation();

  if (!exemple) {
    return (
      <div className="lin op">
        <h1 className="v2-sr">Opportunités</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Opportunités</span>
        </header>
        <div className="op-vide">
          <ReseauVide icone={Network} page="Les mises en relation, les groupements de marchés publics et les achats groupés qui vous concernent y apparaîtront, avec la raison de chaque suggestion." />
        </div>
      </div>
    );
  }
  return <Tableau vous={org.nom} />;
}

function Tableau({ vous }: { vous: string }) {
  const toast = useToast();
  const routeur = useRouter();
  const chemin = usePathname();
  const params = useSearchParams();
  const id = params.get("id");
  const vue = params.get("vue") === "apports" ? "apports" : "tableau";

  /* l'adresse porte la vue et la carte ouverte ; le reste vit dans la page */
  const aller = (p: { id?: string | null; vue?: "tableau" | "apports" }) => {
    const q = new URLSearchParams(params.toString());
    if (p.id !== undefined) {
      if (p.id) q.set("id", p.id);
      else q.delete("id");
    }
    if (p.vue !== undefined) {
      if (p.vue === "apports") q.set("vue", "apports");
      else q.delete("vue");
    }
    const s = q.toString();
    routeur.replace(s ? `${chemin}?${s}` : chemin, { scroll: false });
  };

  const [etapes, setEtapes] = useState<Record<string, Etape>>({});
  const poser = (cid: string, e: Etape) => setEtapes((x) => ({ ...x, [cid]: e }));

  const [regroupement, setRegroupement] = useState<Regroupement>("famille");
  const [reduites, setReduites] = useState(false);
  const [voirDeCote, setVoirDeCote] = useState(false);
  const [masquees, setMasquees] = useState<string[]>([]);
  const [aTraiter, setATraiter] = useState(false);
  const [ile, setIle] = useState<FiltreIle>("toutes");
  const [recherche, setRecherche] = useState("");

  const etapeDe = (c: Carte): Etape => etapes[c.id] ?? "examiner";
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return CARTES.filter((c) => {
      const cites = citesDe(c);
      if (ile !== "toutes" && !cites.some((s) => membre(s).ile === ile) && !(c.famille === "achat" && !c.a.organisateur)) return false;
      if (aTraiter && (etapes[c.id] ?? "examiner") !== "examiner") return false;
      if (q && !`${c.ref} ${titreDe(c)} ${cites.map((s) => membre(s).nom).join(" ")}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recherche, ile, aTraiter, etapes]);

  const enAttente = CARTES.filter((c) => etapeDe(c) === "examiner").length;
  const ouverte = id ? (CARTES.find((c) => c.id === id) ?? null) : null;

  /* ——— les gestes ——— */
  const accepter = (c: Carte & { famille: "relation" }) => {
    poser(c.id, "engagee");
    toast(`Intro notée pour ${membre(c.r.membre).nom} : elle partira à l'ouverture du réseau. Elle compte dans « Ce que le réseau vous a apporté ».`, "vert");
  };
  const plusTard = (c: Carte & { famille: "relation" }) => {
    poser(c.id, "de_cote");
    toast(`${membre(c.r.membre).nom} : suggestion mise de côté.`);
  };
  const former = (c: Carte & { famille: "groupement" }) => {
    poser(c.id, "engagee");
    const autres = c.g.lots.flatMap((l) => (l.titulaire ? [membre(l.titulaire).nom] : []));
    toast(`Groupement proposé à ${autres.join(" et ")}.`, "vert");
  };
  const participer = (c: Carte & { famille: "achat" }, oui: boolean) => {
    poser(c.id, oui ? "engagee" : "examiner");
    toast(oui ? `Inscription notée : ${c.a.titre}.` : `Vous ne participez plus : ${c.a.titre}.`, oui ? "vert" : "neutre");
  };
  const reprendre = (c: Carte) => poser(c.id, "examiner");

  /* ——— les colonnes ——— */
  type Col = { cle: string; libelle: string; icone: ReactNode; cartes: Carte[]; meta?: string };
  const colonnes: Col[] =
    regroupement === "famille"
      ? FAMILLES.map((f) => {
          const cartes = visibles.filter((c) => c.famille === f.cle && (voirDeCote || etapeDe(c) !== "de_cote"));
          const inscrits = cartes.filter((c) => etapeDe(c) === "engagee").length;
          const meta =
            f.cle === "groupement"
              ? `${cartes.reduce((t, c) => t + (c.famille === "groupement" ? parseInt(c.g.montant, 10) : 0), 0)} k€`
              : f.cle === "achat" && inscrits
                ? `dont ${inscrits} où vous participez`
                : undefined;
          return { cle: f.cle, libelle: f.libelle, icone: <f.icone {...ic} width={14} height={14} />, cartes, meta };
        })
      : ETAPES.map((e) => ({ cle: e.cle, libelle: e.libelle, icone: <IconeStatutProjet etat={e.etat} />, cartes: visibles.filter((c) => etapeDe(c) === e.cle) }));
  const montrees = colonnes.filter((c) => !masquees.includes(c.cle));
  const cachees = colonnes.filter((c) => masquees.includes(c.cle));
  const nbDeCote = visibles.filter((c) => c.famille === "relation" && etapeDe(c) === "de_cote").length;
  const ordre = montrees.flatMap((c) => c.cartes);

  /* ——— la barre du titre ——— */
  const optionsPage: Option[] = [
    { cle: "tableau", libelle: "Le tableau", icone: <Network {...ic} />, coche: vue === "tableau", action: () => aller({ vue: "tableau", id: null }) },
    { cle: "apports", libelle: "Ce que le réseau vous a apporté", icone: <Banknote {...ic} />, coche: vue === "apports", action: () => aller({ vue: "apports", id: null }) },
    ...(masquees.length ? [{ cle: "colonnes", libelle: "Montrer toutes les colonnes", icone: <Eye {...ic} />, action: () => setMasquees([]) }] : []),
  ];
  const filtreActif = ile !== "toutes" || !!recherche.trim();
  const tete = (
    <header className="lin-tete">
      <span className="lin-tete-titre">Opportunités</span>
      <MenuActions rond aGauche titre="Actions de la page" options={optionsPage} />
      {vue === "tableau" ? (
        <div className="lin-tete-ronds">
          <button type="button" className="lin-rond" aria-pressed={aTraiter} aria-label="Seulement ce qui attend votre geste" title="Seulement ce qui attend votre geste" onClick={() => setATraiter((v) => !v)}>
            <IconeNonLus />
          </button>
          <Menu
            largeur={300}
            bouton={(o, basculer) => (
              <button type="button" className="lin-rond" aria-label="Filtrer" title="Filtrer" aria-expanded={o} data-actif={filtreActif ? "" : undefined} onClick={basculer}>
                <ListFilter aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <div className="op-menu">
                <input className="lin-menu-champ" autoFocus placeholder="Membre, référence, sujet…" aria-label="Chercher une opportunité" value={recherche} onChange={(ev) => setRecherche(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && fermer()} />
                <p className="op-menu-titre">Île</p>
                {(["toutes", "Guadeloupe", "Martinique"] as const).map((x) => (
                  <button
                    key={x}
                    type="button"
                    className="lin-menu-option"
                    aria-pressed={ile === x}
                    onClick={() => {
                      setIle(x);
                      fermer();
                    }}
                  >
                    <MapPin {...ic} />
                    {x === "toutes" ? "Toutes les îles" : x}
                    {ile === x ? <Check {...ic} className="op-coche" /> : null}
                  </button>
                ))}
              </div>
            )}
          </Menu>
          <Menu
            largeur={300}
            bouton={(o, basculer) => (
              <button type="button" className="lin-rond" aria-label="Affichage" title="Affichage" aria-expanded={o} onClick={basculer}>
                <SlidersHorizontal aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <>
                <div className="lin-menu-section">
                  <div className="lin-reglage">
                    Regrouper par
                    <Choix
                      libelle="Regrouper par"
                      valeur={regroupement}
                      onChange={setRegroupement}
                      options={[
                        { cle: "famille", libelle: "Famille" },
                        { cle: "etape", libelle: "Étape" },
                      ]}
                    />
                  </div>
                </div>
                <div className="lin-menu-section">
                  <label className="lin-reglage op-reglage">
                    Cartes réduites (le titre seul)
                    <input type="checkbox" checked={reduites} onChange={(ev) => setReduites(ev.target.checked)} />
                  </label>
                  {regroupement === "famille" ? (
                    <label className="lin-reglage op-reglage">
                      Montrer les suggestions mises de côté
                      <input type="checkbox" checked={voirDeCote} onChange={(ev) => setVoirDeCote(ev.target.checked)} />
                    </label>
                  ) : null}
                </div>
              </>
            )}
          </Menu>
        </div>
      ) : null}
    </header>
  );

  /* ——— la barre d'outils : les deux vues, les filtres posés, « vous » ——— */
  const outils = (
    <div className="lin-outils">
      <nav className="lin-onglets" aria-label="Vues des opportunités">
        <button type="button" className="v2-btn v2-btn--petit" data-actif={vue === "tableau" ? "" : undefined} aria-pressed={vue === "tableau"} onClick={() => vue !== "tableau" && aller({ vue: "tableau" })}>
          Tableau
        </button>
        <button type="button" className="v2-btn v2-btn--petit" data-actif={vue === "apports" ? "" : undefined} aria-pressed={vue === "apports"} onClick={() => vue !== "apports" && aller({ vue: "apports", id: null })}>
          Ce que le réseau vous a apporté
        </button>
        {vue === "tableau" && ile !== "toutes" ? (
          <button type="button" className="v2-btn v2-btn--petit op-filtre" title="Retirer le filtre" onClick={() => setIle("toutes")}>
            {ile} <X width={12} height={12} aria-hidden="true" />
          </button>
        ) : null}
        {vue === "tableau" && recherche.trim() ? (
          <button type="button" className="v2-btn v2-btn--petit op-filtre" title="Retirer la recherche" onClick={() => setRecherche("")}>
            <span className="op-filtre-texte">« {recherche.trim()} »</span> <X width={12} height={12} aria-hidden="true" />
          </button>
        ) : null}
        {vue === "tableau" && aTraiter ? (
          <button type="button" className="v2-btn v2-btn--petit op-filtre" title="Tout montrer" onClick={() => setATraiter(false)}>
            À examiner <X width={12} height={12} aria-hidden="true" />
          </button>
        ) : null}
      </nav>
      <div className="lin-outils-droite">
        <span className="lin-meta op-vous">
          Vous : <b>{vous}</b>
          {vue === "tableau" ? ` · ${enAttente} à examiner` : ""}
        </span>
      </div>
    </div>
  );

  /* ——— une carte du tableau ——— */
  const arreter = (ev: MouseEvent) => ev.stopPropagation();
  const pastille = (cle: string, contenu: ReactNode, icone?: ReactNode, titre?: string) => (
    <span key={cle} className="lin-carte-pastille" title={titre}>
      {icone}
      {contenu}
    </span>
  );
  const pastilleMembre = (slug: string) => (
    <Link key={slug} href={ficheMembre(slug)} className="lin-carte-pastille op-pastille-membre" onClick={arreter} title={`Voir la fiche de ${membre(slug).nom}`}>
      <span className="op-initiales" aria-hidden="true">
        {initiales(membre(slug).nom)}
      </span>
      {membre(slug).nom}
    </Link>
  );

  const actionsCarte = (c: Carte, grand = false): ReactNode => {
    const e = etapeDe(c);
    const cls = grand ? "v2-btn" : "v2-btn v2-btn--petit op-btn";
    const fait = (texte: string) => (
      <span className="op-fait">
        <Check width={14} height={14} aria-hidden="true" />
        {texte}
      </span>
    );
    if (c.famille === "relation") {
      if (e === "engagee") return fait("Intro demandée");
      if (e === "de_cote")
        return (
          <button type="button" className={`${cls} v2-btn--fantome`} onClick={() => reprendre(c)}>
            <Undo2 width={14} height={14} aria-hidden="true" /> Reprendre
          </button>
        );
      return (
        <>
          <button type="button" className={`${cls} v2-btn--primaire`} onClick={() => accepter(c)}>
            Accepter
          </button>
          <button type="button" className={`${cls} v2-btn--fantome`} onClick={() => plusTard(c)}>
            Pas maintenant
          </button>
        </>
      );
    }
    if (c.famille === "groupement") {
      if (e === "engagee") return fait("Groupement proposé");
      return (
        <button type="button" className={`${cls} v2-btn--primaire`} onClick={() => former(c)}>
          <Users width={14} height={14} aria-hidden="true" /> Former un groupement
        </button>
      );
    }
    if (e === "engagee")
      return (
        <>
          {fait("Vous participez")}
          <button type="button" className={`${cls} v2-btn--fantome`} onClick={() => participer(c, false)}>
            Se retirer
          </button>
        </>
      );
    return (
      <button type="button" className={`${cls} v2-btn--primaire`} onClick={() => participer(c, true)}>
        Je participe
      </button>
    );
  };

  const carte = (c: Carte) => {
    const e = etapeDe(c);
    const F = FAMILLE[c.famille];
    let pastilles: ReactNode[] = [];
    let pied: ReactNode = null;
    if (c.famille === "relation") {
      pastilles = [pastilleMembre(c.r.membre), ...badgesDe(c.r.membre).map((b) => pastille(b.cle, b.texte, <BadgeCheck aria-hidden="true" strokeWidth={1.8} />, b.titre))];
      pied = `${c.r.provenance.libelle} · il y a ${c.r.age}`;
    } else if (c.famille === "groupement") {
      pastilles = [pastille("montant", c.g.montant, <Banknote aria-hidden="true" strokeWidth={1.8} />), ...c.g.lots.flatMap((l) => (l.titulaire ? [pastilleMembre(l.titulaire)] : []))];
      pied = `Offres avant le ${date(c.g.remise)} · ${c.g.lots.length} lots, dont un pour vous`;
    } else {
      const inscrits = c.a.inscrits + (e === "engagee" ? 1 : 0);
      pastilles = [
        c.a.organisateur ? pastilleMembre(c.a.organisateur) : pastille("omega", "Omega", <Building2 aria-hidden="true" strokeWidth={1.8} />),
        pastille("inscrits", `${inscrits} sur ${c.a.seuil}`, <Users aria-hidden="true" strokeWidth={1.8} />, "Inscrits sur le seuil à atteindre"),
      ];
      pied = (
        <>
          <span className="op-jauge" role="progressbar" aria-label={`Inscrits : ${inscrits} sur ${c.a.seuil}`} aria-valuemin={0} aria-valuemax={c.a.seuil} aria-valuenow={Math.min(inscrits, c.a.seuil)} data-atteint={inscrits >= c.a.seuil ? "" : undefined}>
            <span style={{ width: `${Math.min(100, (inscrits / c.a.seuil) * 100)}%` }} />
          </span>
          {inscrits >= c.a.seuil ? "Seuil atteint" : `Encore ${c.a.seuil - inscrits}`} · jusqu&apos;au {date(c.a.cloture)}
        </>
      );
    }
    return (
      <div key={c.id} className="lin-carte-tableau op-carte" data-actif={c.id === id ? "" : undefined} data-etape={e} onClick={() => aller({ id: c.id })}>
        <span className="lin-carte-ref">
          <span className="op-ref">
            {e === "examiner" ? <span className="lin-boite-point" role="img" aria-label="Attend votre geste" /> : null}
            {c.ref}
          </span>
          <F.icone aria-hidden="true" strokeWidth={1.8} />
        </span>
        <button
          type="button"
          className="lin-carte-titre op-carte-titre"
          onClick={(ev) => {
            arreter(ev);
            aller({ id: c.id });
          }}
          aria-label={`Ouvrir : ${titreDe(c)}`}
        >
          <IconeStatutProjet etat={ETAPE[e].etat} />
          <span>{titreDe(c)}</span>
        </button>
        {reduites ? null : (
          <>
            <span className="lin-carte-pastilles">{pastilles.slice(0, 3)}</span>
            <span className="lin-carte-pied op-carte-pied">{pied}</span>
            <span className="op-carte-actions" onClick={arreter}>
              {actionsCarte(c)}
            </span>
          </>
        )}
      </div>
    );
  };

  const colonne = (col: Col) => (
    <section key={col.cle} className="lin-colonne" aria-label={`${col.libelle}, ${col.cartes.length}`}>
      <header className="lin-colonne-tete">
        <span className="lin-colonne-nom">
          <span className="op-colonne-icone">{col.icone}</span>
          <h3>{col.libelle}</h3>
          <span className="lin-colonne-compte">{col.cartes.length}</span>
          {col.meta ? <span className="lin-colonne-compte op-colonne-meta">{col.meta}</span> : null}
        </span>
        <div className="lin-tete-ronds">
          <MenuActions
            rond
            titre={`Colonne « ${col.libelle} »`}
            options={[
              ...(col.cartes.length ? [{ cle: "premiere", libelle: "Ouvrir la première", meta: col.cartes[0].ref, icone: <Eye {...ic} />, action: () => aller({ id: col.cartes[0].id }) }] : []),
              { cle: "masquer", libelle: "Masquer la colonne", icone: <EyeOff {...ic} />, action: () => setMasquees((m) => [...m, col.cle]) },
            ]}
          />
        </div>
      </header>
      <div className="lin-colonne-corps">
        {col.cartes.length ? col.cartes.map(carte) : <div className="lin-colonne-vide">Rien ici</div>}
        {regroupement === "famille" && col.cle === "relation" && nbDeCote > 0 ? (
          <button type="button" className="op-colonne-pied" onClick={() => setVoirDeCote((v) => !v)} aria-pressed={voirDeCote}>
            <Undo2 width={14} height={14} aria-hidden="true" />
            {voirDeCote ? "Cacher les suggestions mises de côté" : `${nbDeCote} mise${nbDeCote > 1 ? "s" : ""} de côté : revoir`}
          </button>
        ) : null}
      </div>
    </section>
  );

  const masqueesBloc = cachees.length ? (
    <section className="lin-colonne op-masquees" aria-label="Colonnes masquées">
      <header className="lin-colonne-tete">
        <span className="lin-colonne-nom">
          <h3>Colonnes masquées</h3>
        </span>
      </header>
      <div className="op-masquees-corps">
        {cachees.map((col) => (
          <button key={col.cle} type="button" className="op-masquee" title="Montrer la colonne" onClick={() => setMasquees((m) => m.filter((x) => x !== col.cle))}>
            <span className="op-colonne-icone">{col.icone}</span>
            <span>{col.libelle}</span>
            <span className="lin-colonne-compte">{col.cartes.length}</span>
          </button>
        ))}
      </div>
    </section>
  ) : null;

  /* ——— la carte ouverte, au milieu (l'« Open preview » d'Attio, la CarteCentrale des moteurs) ——— */
  const carteOuverte = (c: Carte) => {
    const e = etapeDe(c);
    const rang = ordre.findIndex((x) => x.id === c.id);
    const nav =
      rang >= 0
        ? {
            position: rang + 1,
            total: ordre.length,
            precedente: rang > 0 ? () => aller({ id: ordre[rang - 1].id }) : undefined,
            suivante: rang < ordre.length - 1 ? () => aller({ id: ordre[rang + 1].id }) : undefined,
          }
        : null;
    const lienMembre = (slug: string) => (
      <Link href={ficheMembre(slug)} className="op-lien">
        {membre(slug).nom}
      </Link>
    );
    const badges = (slug: string) => {
      const l = badgesDe(slug);
      return l.length ? (
        <span className="op-badges">
          {l.map((b) => (
            <span key={b.cle} className="op-badge" title={b.titre}>
              <BadgeCheck width={12} height={12} aria-hidden="true" />
              {b.texte}
            </span>
          ))}
        </span>
      ) : (
        <span className="v2-det-sous">Aucun badge montré</span>
      );
    };

    let gauche: ReactNode;
    let piedGauche: ReactNode = null;
    let fiche: ReactNode;
    let fil: { cle: string; qui: string; quoi: string; quand?: string }[];
    let chiffre: ReactNode = null;
    let echeance: { texte: string; urgence?: "retard" | "aujourdhui" } | null = null;
    let note: ReactNode = null;

    if (c.famille === "relation") {
      const m = membre(c.r.membre);
      gauche = (
        <Feuille
          titre="Membre du réseau"
          sous={`Depuis ${mois(m.depuis)}`}
          nom={m.nom}
          sousNom={[m.secteur, `${m.commune}, ${m.ile}`]}
          lignes={[
            ["Propose", m.propose.join(" · ")],
            ["Cherche", m.cherche.join(" · ")],
          ]}
        />
      );
      piedGauche = (
        <div className="v2-det-document-ligne">
          <span className="v2-det-sous">{m.nom}</span>
          <Link href={ficheMembre(m.slug)} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
            Voir la fiche
          </Link>
        </div>
      );
      echeance = { texte: `Suggérée il y a ${c.r.age}` };
      fiche = (
        <dl className="v2-det-fiche">
          <dt>Membre</dt>
          <dd>{lienMembre(m.slug)}</dd>
          <dt>Secteur</dt>
          <dd>
            {m.secteur}{" "}
            <span className="v2-det-sous">
              · {m.commune}, {m.ile}
            </span>
          </dd>
          <dt>Pourquoi</dt>
          <dd>{c.r.raison}</dd>
          <dt>Tiré de</dt>
          <dd>
            {c.r.provenance.libelle} <span className="v2-det-sous">· {c.r.provenance.detail}</span>
          </dd>
          <dt>Badges</dt>
          <dd>{badges(m.slug)}</dd>
        </dl>
      );
      fil = [
        { cle: "vu", qui: "Omega", quoi: `a rapproché ${c.r.provenance.libelle.toLowerCase()} de ce que propose ${m.nom}`, quand: `il y a ${c.r.age}` },
        ...(e === "engagee" ? [{ cle: "ok", qui: "Vous", quoi: `avez accepté : ${m.nom} recevra l'intro, avec la raison de la suggestion, à l'ouverture du réseau` }] : []),
        ...(e === "de_cote" ? [{ cle: "plus-tard", qui: "Vous", quoi: "avez mis la suggestion de côté" }] : []),
      ];
      note =
        e === "examiner" ? (
          <Note teinte="bleu">
            {/* 03/11/2026 — le réseau n'envoie encore rien (gestes notés sur cet écran) : le texte le dit */}
            <strong>Rien ne part sans votre accord.</strong> « Accepter » note votre accord pour une intro à {m.nom} : votre nom et la raison ci-dessus, pas vos factures. Le réseau n&apos;envoie encore rien : l&apos;intro partira quand il ouvrira.
          </Note>
        ) : null;
    } else if (c.famille === "groupement") {
      gauche = (
        <Feuille
          titre="Marché public"
          sous={c.g.provenance.detail}
          nom={c.g.titre}
          sousNom={[c.g.acheteur, `Offres avant le ${date(c.g.remise, true)}`]}
          lignes={c.g.lots.map((l) => [`Lot ${l.numero} · ${l.intitule}`, l.titulaire ? membre(l.titulaire).nom : `Vous (${vous})`] as [string, string])}
          total={["Montant estimé", c.g.montant]}
        />
      );
      piedGauche = (
        <div className="v2-det-document-ligne">
          <span className="v2-det-sous">{c.g.provenance.libelle}</span>
        </div>
      );
      chiffre = c.g.montant;
      echeance = { texte: `Offres avant le ${date(c.g.remise, true)}` };
      fiche = (
        <>
          <dl className="v2-det-fiche">
            <dt>Acheteur</dt>
            <dd>{c.g.acheteur}</dd>
            <dt>Pourquoi</dt>
            <dd>{c.g.raison}</dd>
            <dt>Tiré de</dt>
            <dd>
              {c.g.provenance.libelle} <span className="v2-det-sous">· {c.g.provenance.detail}</span>
            </dd>
          </dl>
          <div className="v2-det-bloc">
            <h3 className="v2-det-section-titre">
              Les lots <small>{c.g.lots.length}</small>
            </h3>
            <ul className="op-lots">
              {c.g.lots.map((l) => (
                <li key={l.numero} className="op-lot" data-vous={l.titulaire ? undefined : ""}>
                  <span className="v2-det-mono">Lot {l.numero}</span>
                  <span className="op-lot-intitule">{l.intitule}</span>
                  <span className="op-lot-qui">
                    {l.titulaire ? (
                      <>
                        {lienMembre(l.titulaire)} {badges(l.titulaire)}
                      </>
                    ) : (
                      <b>Vous · {vous}</b>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      );
      fil = [
        { cle: "avis", qui: "Omega", quoi: "a repéré l'avis et rapproché ses lots des membres qui cherchent ce type de marché", quand: `il y a ${c.g.age}` },
        ...(e === "engagee" ? [{ cle: "forme", qui: "Vous", quoi: "avez proposé le groupement aux deux autres membres" }] : []),
      ];
      note =
        e === "examiner" ? (
          <Note teinte="bleu">
            <strong>Une offre commune, trois signatures.</strong> « Former un groupement » prévient les deux membres ; chacun reste libre de dire non.
          </Note>
        ) : null;
    } else {
      const inscrits = c.a.inscrits + (e === "engagee" ? 1 : 0);
      gauche = (
        <Feuille
          titre="Achat groupé"
          sous={`Jusqu'au ${date(c.a.cloture, true)}`}
          nom={c.a.titre}
          sousNom={[c.a.organisateur ? `Organisé par ${membre(c.a.organisateur).nom}` : "Organisé par Omega, pour le réseau"]}
          lignes={[
            ["Inscrits", `${inscrits} sur ${c.a.seuil}`],
            ["Ce qu'on vise", c.a.gain],
          ]}
        />
      );
      piedGauche = c.a.organisateur ? (
        <div className="v2-det-document-ligne">
          <span className="v2-det-sous">{membre(c.a.organisateur).nom}</span>
          <Link href={ficheMembre(c.a.organisateur)} className="v2-btn v2-btn--petit v2-btn--fantome v2-det-document-ouvrir">
            Voir la fiche
          </Link>
        </div>
      ) : null;
      chiffre = `${inscrits} sur ${c.a.seuil} inscrits`;
      echeance = { texte: `Inscriptions jusqu'au ${date(c.a.cloture, true)}` };
      fiche = (
        <dl className="v2-det-fiche">
          <dt>Organisé par</dt>
          <dd>{c.a.organisateur ? lienMembre(c.a.organisateur) : "Omega, pour le réseau"}</dd>
          <dt>Pourquoi</dt>
          <dd>{c.a.raison}</dd>
          <dt>Tiré de</dt>
          <dd>
            {c.a.provenance.libelle} <span className="v2-det-sous">· {c.a.provenance.detail}</span>
          </dd>
          <dt>Ce qu&apos;on vise</dt>
          <dd>{c.a.gain}</dd>
          <dt>Seuil</dt>
          <dd>
            <span className="op-seuil">
              <span className="op-jauge" aria-hidden="true" data-atteint={inscrits >= c.a.seuil ? "" : undefined}>
                <span style={{ width: `${Math.min(100, (inscrits / c.a.seuil) * 100)}%` }} />
              </span>
              {inscrits >= c.a.seuil ? "Atteint : la commande peut partir" : `Encore ${c.a.seuil - inscrits} inscription${c.a.seuil - inscrits > 1 ? "s" : ""}`}
            </span>
          </dd>
        </dl>
      );
      fil = [
        { cle: "ouvert", qui: c.a.organisateur ? membre(c.a.organisateur).nom : "Omega", quoi: `a ouvert l'achat groupé (${c.a.inscrits} inscrits)` },
        ...(e === "engagee" ? [{ cle: "inscrit", qui: "Vous", quoi: "vous êtes inscrit" }] : []),
      ];
      note =
        e === "examiner" ? (
          <Note teinte="bleu">
            <strong>Sans engagement avant le seuil.</strong> Vous pouvez vous retirer jusqu&apos;à la clôture ; la commande ne part que si le seuil est atteint.
          </Note>
        ) : null;
    }

    return (
      <CarteCentrale
        ouverte
        fermer={() => aller({ id: null })}
        libelle={`${FAMILLE[c.famille].court} ${c.ref}`}
        sur={`Réseau · ${FAMILLE[c.famille].court} · ${c.ref}`}
        statut={
          <>
            <IconeStatutProjet etat={ETAPE[e].etat} />
            {ETAPE[e].un}
          </>
        }
        nav={nav}
        gauche={gauche}
        piedGauche={piedGauche}
        titre={titreDe(c)}
        chiffre={chiffre}
        echeance={echeance}
        notes={note}
        actions={actionsCarte(c, true)}
        classe="op-voile-carte"
      >
        {fiche}
        <div className="v2-det-bloc">
          <h3 className="v2-det-section-titre">Activité</h3>
          <ol className="v2-det-fil">
            {fil.map((x) => (
              <li key={x.cle}>
                <span className="v2-det-fil-avatar" aria-hidden="true">
                  {x.qui === "Vous" ? initiales(vous) : initiales(x.qui)}
                </span>
                <div>
                  <div className="v2-det-fil-texte">
                    <strong>{x.qui}</strong>
                    <span>
                      {x.quoi}
                      {x.quand ? ` · ${x.quand}` : ""}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </CarteCentrale>
    );
  };

  const acceptees = CARTES.filter((c) => c.famille === "relation" && etapeDe(c) === "engagee").length;

  return (
    <div className="lin op">
      <h1 className="v2-sr">Opportunités</h1>
      {tete}
      {outils}
      {vue === "apports" ? (
        <Apports enPlus={acceptees} />
      ) : visibles.length === 0 ? (
        <p className="lin-vide">Aucune opportunité ne répond à ces filtres.</p>
      ) : (
        <div className="lin-tableau-page">
          <div className="lin-tableau op-tableau" aria-label={regroupement === "famille" ? "Opportunités, par famille" : "Opportunités, par étape"}>
            {montrees.map(colonne)}
            {masqueesBloc}
          </div>
        </div>
      )}
      {ouverte && vue === "tableau" ? carteOuverte(ouverte) : null}
    </div>
  );
}

/* ══ « Ce que le réseau vous a apporté » : le rapport en entonnoir d'Attio (Funnel Steps), puis les records ══ */

const ETAT_SUIVI: Record<Suivi["etat"], { libelle: string; etat: EtatProjet }> = {
  intro: { libelle: "Intro acceptée", etat: "planifie" },
  devis: { libelle: "Devis en cours", etat: "en-cours" },
  signe: { libelle: "Signé", etat: "fait" },
  perdu: { libelle: "Sans suite", etat: "annule" },
};

function Apports({ enPlus }: { enPlus: number }) {
  const intros = SUIVI.length + enPlus;
  const devis = SUIVI.filter((s) => s.devis !== null);
  const signes = SUIVI.filter((s) => s.etat === "signe");
  const montant = signes.reduce((t, s) => t + (s.devis ?? 0), 0);
  const enCours = devis.filter((s) => s.etat === "devis").reduce((t, s) => t + (s.devis ?? 0), 0);
  const part = (n: number, sur: number) => (sur ? Math.round((n / sur) * 100) : 0);
  const etapes = [
    { cle: "intros", libelle: "Intros acceptées", n: intros, sous: enPlus ? `dont ${enPlus} aujourd’hui` : "depuis septembre", taux: null as number | null },
    { cle: "devis", libelle: "Devis échangés", n: devis.length, sous: "reçus ou envoyés", taux: part(devis.length, intros) },
    { cle: "signes", libelle: "Devis signés", n: signes.length, sous: `${euros(enCours)} encore en devis`, taux: part(signes.length, devis.length) },
  ];
  return (
    <div className="op-apports">
      <section className="op-entonnoir" aria-label="Le suivi, étape par étape">
        {etapes.map((e) => (
          <div key={e.cle} className="op-etape">
            <span className="op-etape-libelle">{e.libelle}</span>
            <span className="op-etape-valeur">{e.n}</span>
            <span className="op-etape-barre" aria-hidden="true">
              <span style={{ width: `${intros ? (e.n / intros) * 100 : 0}%` }} />
            </span>
            <span className="lin-meta op-etape-sous">{e.taux === null ? e.sous : `${e.taux} % de l'étape d'avant · ${e.sous}`}</span>
          </div>
        ))}
        <div className="op-etape">
          <span className="op-etape-libelle">Montant signé</span>
          <span className="op-etape-valeur">{euros(montant)}</span>
          <span className="op-etape-barre op-etape-barre--vide" aria-hidden="true" />
          <span className="lin-meta op-etape-sous">hors taxes, devis signés grâce au réseau</span>
        </div>
      </section>

      <div className="op-rec" role="table" aria-label="Les intros acceptées, de l'intro au devis signé">
        <div className="op-rec-tete" role="row">
          <span role="columnheader">Membre</span>
          <span role="columnheader">Objet</span>
          <span role="columnheader">Intro</span>
          <span role="columnheader">Devis</span>
          <span role="columnheader" className="op-num">
            Montant
          </span>
          <span role="columnheader">État</span>
        </div>
        {SUIVI.map((s) => (
          <div key={s.membre} className="op-rec-ligne" role="row">
            <span role="cell" className="op-rec-membre">
              <span className="op-initiales" aria-hidden="true">
                {initiales(membre(s.membre).nom)}
              </span>
              <Link href={ficheMembre(s.membre)} className="op-lien">
                {membre(s.membre).nom}
              </Link>
            </span>
            <span role="cell" className="op-rec-objet">
              {s.objet}
            </span>
            <span role="cell" className="lin-meta" data-etiquette="Intro">
              {date(s.intro)}
            </span>
            <span role="cell" className="lin-meta" data-etiquette="Devis">
              {s.devis === null ? "Pas encore" : s.sens === "recu" ? "Reçu" : "Envoyé"}
            </span>
            <span role="cell" className="op-num op-rec-montant">
              {s.devis === null ? "—" : euros(s.devis)}
            </span>
            <span role="cell" className="op-rec-etat">
              <IconeStatutProjet etat={ETAT_SUIVI[s.etat].etat} />
              {ETAT_SUIVI[s.etat].libelle}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
