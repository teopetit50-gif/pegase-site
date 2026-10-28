"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — la première page, sur la page « Projects » de Linear (28/10/2026)

   Demande de Teo : la première page de chaque SaaS refaite sur Linear, au
   1:1. Premier essai sur la page « Issues », écarté le même jour (« ce
   design ne va pas avec ce qu'on doit montrer ») ; Teo a choisi la page
   « Projects » : un débiteur est un projet.

     · la liste (/espace2/cashd) : le tableau des projets — un débiteur par
       ligne, sa santé (à jour, en retard, en litige), l'ancienneté du retard
       en priorité, l'échu, la plus ancienne échéance, ses factures, la part
       échue en anneau ; le palier de relance atteint à côté du nom, comme
       le jalon en cours d'un projet ;
     · un débiteur (?compte=) : la page d'un projet — propriétés en ligne,
       la dernière relance en « Latest update », l'ancienneté de l'encours,
       les paliers en jalons, et à droite les cartes Propriétés, Paliers,
       Encours et Activité.

   Les chiffres passent par les mêmes portes que l'ancien tableau de bord
   (TableauCashd) : l'exemple, ou la base réelle. Gabarit : ../lin/lin.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCheck, Copy, Download, ExternalLink, HandCoins, ListFilter, MessageSquare, PanelRight, Plus, SlidersHorizontal } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { montant } from "@/components/espace/format";
import { tableauDe, jourParis } from "@/components/espace/cashd/calcul";
import { exporterBalance } from "@/components/espace/cashd/tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "@/components/espace/cashd/exemples";
import * as portes from "@/components/espace/cashd/portes";
import type { Balance, Relance, StatutCompte, Tableau } from "@/components/espace/cashd/types";
import { libellePalier } from "@/components/espace/cashd/etats";
import { CarteDroite, Choix, GraphiqueProgres, IconePriorite, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeEnveloppe, IconeGroupe, IconeImport, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { RACINE } from "../modules";

type Donnees = {
  tableau: Tableau;
  relances: Relance[];
  reponses: portes.Reponse[];
  paliers: Record<string, { palier: string; le: string | null }[]>;
  contacts: Record<string, string | null>;
};
type Sante = "a_jour" | "retard" | "pause" | "litige";
type Tri = "echu" | "encours" | "retard" | "nom";

/* dans l'ordre des onglets : ce qui demande une action d'abord */
const SANTES: Record<Sante, { libelle: string; teinte: "vert" | "jaune" | "rouge" | "gris" }> = {
  retard: { libelle: "En retard", teinte: "jaune" },
  litige: { libelle: "En litige", teinte: "rouge" },
  pause: { libelle: "En pause", teinte: "gris" },
  a_jour: { libelle: "À jour", teinte: "vert" },
};
const ORDRE_PALIERS = ["echeance", "rappel", "relance", "mise_en_demeure"] as const;
/* les statuts d'un compte CASHD (portes.changerStatut) : la pastille Santé d'un débiteur les propose */
const STATUTS: {
  cle: StatutCompte;
  libelle: string;
  aide: string;
  sante: (b: Balance) => Sante;
}[] = [
  {
    cle: "actif",
    libelle: "Relancé",
    aide: "suit la séquence",
    sante: (b) => (b.echu > 0 ? "retard" : "a_jour"),
  },
  {
    cle: "pause",
    libelle: "En pause",
    aide: "plus de relance",
    sante: () => "pause",
  },
  {
    cle: "litige",
    libelle: "En litige",
    aide: "relances arrêtées",
    sante: () => "litige",
  },
  {
    cle: "recouvrement",
    libelle: "En recouvrement",
    aide: "confié",
    sante: () => "litige",
  },
  {
    cle: "attente_contact",
    libelle: "Contact à trouver",
    aide: "pas d'adresse",
    sante: () => "pause",
  },
  {
    cle: "hors_perimetre",
    libelle: "Hors périmètre",
    aide: "jamais relancé",
    sante: () => "pause",
  },
];
const TRANCHES = [
  { cle: "non_echu", libelle: "Non échu" },
  { cle: "echu_1_30", libelle: "1 à 30 jours" },
  { cle: "echu_31_60", libelle: "31 à 60 jours" },
  { cle: "echu_61_90", libelle: "61 à 90 jours" },
  { cle: "echu_plus_90", libelle: "Plus de 90 jours" },
] as const;
/* les couleurs d'icône de projet de Linear, une par débiteur */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];

const santeDe = (b: Balance): Sante => (b.statut === "litige" || b.en_litige > 0 ? "litige" : b.statut === "pause" ? "pause" : b.echu > 0 ? "retard" : "a_jour");
const niveauDe = (j: number): 0 | 1 | 2 | 3 | 4 => (j > 90 ? 4 : j > 60 ? 3 : j > 30 ? 2 : j > 0 ? 1 : 0);
const retardDe = (j: number) => (j > 0 ? `${j} jour${j > 1 ? "s" : ""} de retard` : "Aucun retard");
const dateCourte = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Paris",
      })
    : "—";
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const partEchue = (b: Balance) => (b.encours > 0 ? Math.round((b.echu / b.encours) * 100) : 0);

/* la santé d'un projet : un disque à 25 % et son signe, 16 px */
function IconeSante({ sante }: { sante: Sante }) {
  const t = SANTES[sante].teinte;
  if (t === "gris")
    return (
      <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.6 1.6" />
      </svg>
    );
  return (
    <svg className="lin-sante" data-teinte={t} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" opacity="0.25" />
      {t === "vert" ? <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "jaune" ? <path d="M5 10.8 7.4 8.3l1.6 1.4L11.2 6M9 6h2.2v2.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {t === "rouge" ? <path d="M5 5.6 7.4 8l1.6-1.4 2.2 3.6M9 10.2h2.2V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

/* le statut d'un débiteur, en hexagone de projet (pastilles, cartes, menus) ; le cercle de
   santé (IconeSante) reste là où Linear met la santé : la ligne d'auteur et la colonne Santé */
const ETAT_PROJET: Record<Sante, EtatProjet> = { retard: "en-cours", pause: "planifie", litige: "annule", a_jour: "fait" };
function IconeStatut({ sante }: { sante: Sante }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}

/* l'anneau d'avancement d'un projet, 16 px */
function Anneau({ part, sante }: { part: number; sante: Sante }) {
  const c = 2 * Math.PI * 5;
  return (
    <svg className="lin-anneau" data-teinte={SANTES[sante].teinte} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${(part / 100) * c} ${c}`} transform="rotate(-90 8 8)" />
    </svg>
  );
}

/* le losange d'un jalon : contour seul, jaune à 40 % une fois le palier atteint (relevé sur le jalon « Rappel ») */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

/* un débiteur est « arrêté » quand ses relances ne partent plus : pause, litige, recouvrement… */
const arrete = (b: Balance) => b.statut !== "actif" || b.en_litige > 0;
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => somme(v.slice(0, i + 1)));

/* la carte « Encours » : la carte « Progress » de Linear. Trois chiffres, le graphique
   par ancienneté (cumulé de « à venir » à « plus de 90 jours », repère rouge à 90 jours),
   puis la répartition. Changer le statut d'un débiteur le fait passer de « Relancé »
   à « Arrêté » : les chiffres et les courbes suivent. */
function CarteEncours({ liste, groupes }: { liste: Balance[]; groupes?: boolean }) {
  const [onglet, setOnglet] = useState<"anciennete" | "groupes">("anciennete");
  const parTranche = (f: (b: Balance) => boolean) => TRANCHES.map((x) => liste.filter(f).reduce((s, b) => s + b[x.cle], 0));
  const total = parTranche(() => true);
  const arretes = parTranche(arrete);
  const relances = parTranche((b) => !arrete(b));
  const repartition =
    onglet === "anciennete"
      ? TRANCHES.map((x, i) => ({
          cle: x.cle,
          libelle: x.libelle,
          valeur: montant(total[i]),
        }))
      : [...new Set(liste.map((b) => b.groupe ?? ""))].map((g) => ({
          cle: g || "-",
          libelle: g || "Sans groupe",
          valeur: montant(liste.filter((b) => (b.groupe ?? "") === g).reduce((s, b) => s + b.encours, 0)),
        }));
  return (
    <CarteDroite titre="Encours">
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Encours
          </dt>
          <dd>{montant(somme(total))}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
            Arrêté
          </dt>
          <dd>{montant(somme(arretes))}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            Relancé
          </dt>
          <dd>{montant(somme(relances))}</dd>
        </div>
      </dl>
      <GraphiqueProgres
        libelle={`Encours cumulé par ancienneté : ${montant(somme(total))}, dont ${montant(somme(relances))} relancés et ${montant(somme(arretes))} arrêtés`}
        etiquettes={["À venir", "30 j", "60 j", "90 j", "+90 j"]}
        series={[
          { cle: "encours", teinte: "gris", valeurs: cumul(total) },
          { cle: "arrete", teinte: "jaune", valeurs: cumul(arretes) },
          {
            cle: "relance",
            teinte: "bleu",
            valeurs: cumul(relances),
            aire: true,
          },
        ]}
      />
      {groupes ? (
        <div className="lin-segment-carte" role="tablist">
          {(
            [
              ["anciennete", "Ancienneté"],
              ["groupes", "Groupes"],
            ] as const
          ).map(([cle, lib]) => (
            <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
              {lib}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="lin-repartition">
        {repartition.map((l) => (
          <li key={l.cle}>
            <span>{l.libelle}</span>
            <span>{l.valeur}</span>
          </li>
        ))}
      </ul>
    </CarteDroite>
  );
}

function IconeDebiteur({ b, grand }: { b: Balance; grand?: boolean }) {
  const couleur = couleurDe(b.compte_id);
  if (grand)
    return (
      <span
        className="lin-tuile"
        style={{
          background: `color-mix(in srgb, ${couleur} 18%, transparent)`,
          color: couleur,
        }}
      >
        <Building2 width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
    );
  return <Building2 className="lin-icone-projet" width={16} height={16} strokeWidth={1.8} style={{ color: couleur }} aria-hidden="true" />;
}

export default function Debiteurs() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const [reel, setReel] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [statuts, setStatuts] = useState<Record<string, StatutCompte>>({});
  const [tri, setTri] = useState<Tri>("echu");
  const [details, setDetails] = useState(false);
  const [ongletDetails, setOngletDetails] = useState<"anciennete" | "relances" | "groupes">("anciennete");
  const [filtre, setFiltre] = useState("");
  const [ongletFiche, setOngletFiche] = useState<"apercu" | "relances">("apercu");

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const c = await portes.monClient();
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const [tableau, relances, pilotage] = await Promise.all([
          portes.chargerTableau(c.client_id),
          portes.chargerRelances(c.client_id).catch(() => []),
          portes.chargerPilotage(c.client_id).catch(() => ({ reponses: [], arretes: [] })),
        ]);
        if (actif)
          setReel({
            tableau,
            relances,
            reponses: pilotage.reponses,
            paliers: {},
            contacts: {},
          });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const exemple = useMemo<Donnees>(() => {
    const tableau = tableauDe(FICHES_EXEMPLE, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, SANS_COMPTE_EXEMPLE);
    const paliers: Donnees["paliers"] = {};
    const contacts: Donnees["contacts"] = {};
    for (const f of FICHES_EXEMPLE) {
      contacts[f.compte.id] = f.compte.contact_facturation_email;
      paliers[f.compte.id] = f.suivi
        .filter((s) => s.palier_atteint)
        .map((s) => ({
          palier: s.palier_atteint as string,
          le: s.palier_atteint_le,
        }));
    }
    return {
      tableau,
      relances: RELANCES_EXEMPLE,
      reponses: [],
      paliers,
      contacts,
    };
  }, []);

  const d = source === "exemple" ? exemple : reel;
  /* un statut changé depuis la fiche s'applique tout de suite, sans attendre une relecture */
  const comptes = useMemo(() => (d ? d.tableau.comptes.filter((b) => b.encours > 0 || b.en_litige > 0).map((b) => (statuts[b.compte_id] ? { ...b, statut: statuts[b.compte_id] } : b)) : []), [d, statuts]);
  const compteOuvert = params.get("compte");
  const vue = params.get("vue");
  const onglet = (params.get("sante") as Sante | null) ?? "tous";
  const palierFiltre = params.get("palier");
  const changerStatutCompte = async (b: Balance, statut: StatutCompte) => {
    if (source === "reelle") {
      try {
        await portes.changerStatut(b.compte_id, statut, "Statut changé depuis la fiche du débiteur (tableau de bord CASHD)");
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Le statut n'a pas pu être changé.");
        return;
      }
    }
    setStatuts((x) => ({ ...x, [b.compte_id]: statut }));
  };

  /* Échap referme un débiteur ouvert */
  useEffect(() => {
    if (!compteOuvert) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.key === "Escape" && !(cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) routeur.push(`${RACINE}/cashd?vue=debiteurs`, { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [compteOuvert, routeur]);

  const vide = (texte: string) => (
    <div className="lin">
      <header className="lin-tete">
        <span className="lin-tete-titre">Débiteurs</span>
      </header>
      <p className="lin-vide">{texte}</p>
    </div>
  );
  if (erreur) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  if (!d) return vide("Lecture des impayés…");

  /* le palier le plus avancé atteint par chaque débiteur : les relances écrites, et le suivi des factures */
  const paliersDe = (id: string) => {
    const vus = new Map<string, string | null>();
    for (const p of d.paliers[id] ?? []) if (!vus.has(p.palier) || (p.le && (vus.get(p.palier) ?? "") < p.le)) vus.set(p.palier, p.le);
    for (const r of d.relances) if (r.compte_id === id && r.etat !== "a_valider" && !vus.has(r.palier)) vus.set(r.palier, r.jour);
    return vus;
  };
  const dernierPalier = (id: string) => {
    const vus = paliersDe(id);
    return [...ORDRE_PALIERS].reverse().find((p) => vus.has(p)) ?? null;
  };
  const valeurTri = (b: Balance) => (tri === "echu" ? -b.echu : tri === "encours" ? -b.encours : tri === "retard" ? -b.retard_max_jours : 0);
  const ordonnes = comptes.slice().sort((a, b) => valeurTri(a) - valeurTri(b) || a.nom.localeCompare(b.nom, "fr"));

  /* ——— un débiteur ouvert : la page d'un projet ——— */
  if (compteOuvert) {
    const b = ordonnes.find((x) => x.compte_id === compteOuvert);
    if (!b) return vide("Ce débiteur n'a plus d'encours.");
    const s = santeDe(b);
    const relances = d.relances.filter((r) => r.compte_id === b.compte_id).sort((x, y) => y.jour.localeCompare(x.jour));
    const derniere = relances[0];
    const vus = paliersDe(b.compte_id);
    const contact = d.contacts[b.compte_id] ?? null;
    const suivi = `${RACINE}/cashd/suivi?vue=debiteurs&compte=${encodeURIComponent(b.compte_id)}`;
    const etatRelance = (r: Relance) => (r.etat === "a_valider" ? "à valider" : r.etat.replace(/_/g, " "));
    return (
      <div className="lin">
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={`${RACINE}/cashd?vue=debiteurs`} className="lin-fil-equipe">
              Débiteurs
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici lin-fil-projet" aria-current="page">
              <IconeDebiteur b={b} />
              {b.nom}
            </span>
          </nav>
          <div className="lin-tete-droite">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier la référence" title="Copier la référence" onClick={() => navigator.clipboard?.writeText(b.reference)}>
              <Copy width={14} height={14} aria-hidden="true" />
            </button>
            <Link href={suivi} className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Ouvrir dans Débiteurs et relances" title="Ouvrir dans Débiteurs et relances">
              <ExternalLink width={14} height={14} aria-hidden="true" />
            </Link>
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues du débiteur">
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "apercu" ? "" : undefined} aria-pressed={ongletFiche === "apercu"} onClick={() => setOngletFiche("apercu")}>
              Aperçu
            </button>
            <button type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === "relances" ? "" : undefined} aria-pressed={ongletFiche === "relances"} onClick={() => setOngletFiche("relances")}>
              Relances
            </button>
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            {ongletFiche === "apercu" ? (
              <>
                <IconeDebiteur b={b} grand />
                <h1 className="lin-projet-h1">{b.nom}</h1>
                <p className="lin-projet-resume">
                  {b.echu > 0 ? `Doit ${montant(b.encours, b.devise)}, dont ${montant(b.echu, b.devise)} échus.` : `Doit ${montant(b.encours, b.devise)}, rien n'est encore échu.`}
                  {b.depasse_plafond ? " L'encours dépasse le plafond accordé." : ""}
                </p>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Propriétés</span>
                  <MenuOptions
                    raccourci="s"
                    titre="Changer le statut…"
                    teinte={SANTES[s].teinte}
                    declencheur={
                      <>
                        <IconeStatut sante={s} />
                        {SANTES[s].libelle}
                      </>
                    }
                    options={STATUTS.map((x) => ({
                      cle: x.cle,
                      libelle: x.libelle,
                      meta: x.aide,
                      icone: <IconeStatut sante={x.sante(b)} />,
                      coche: b.statut === x.cle,
                      action: () => changerStatutCompte(b, x.cle),
                    }))}
                    largeur={300}
                  />
                  <MenuOptions
                    raccourci="r"
                    titre="Échu par ancienneté…"
                    declencheur={
                      <>
                        <IconePriorite niveau={niveauDe(b.retard_max_jours)} titre={retardDe(b.retard_max_jours)} />
                        {retardDe(b.retard_max_jours)}
                      </>
                    }
                    options={TRANCHES.map((x, i) => ({
                      cle: x.cle,
                      libelle: x.libelle,
                      meta: montant(b[x.cle], b.devise),
                      icone: <IconePriorite niveau={i as 0 | 1 | 2 | 3 | 4} titre={x.libelle} />,
                      href: `${RACINE}/cashd/balance`,
                    }))}
                  />
                  <MenuOptions
                    raccourci="e"
                    titre="Aller à…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={!!(b.echu > 0)} />
                        {dateCourte(b.plus_ancienne_echeance)}
                      </>
                    }
                    options={[
                      {
                        cle: "suivi",
                        libelle: "Débiteurs et relances",
                        icone: <ExternalLink width={16} height={16} />,
                        href: suivi,
                      },
                      {
                        cle: "balance",
                        libelle: "Balance âgée",
                        icone: <IconeCalendrier />,
                        href: `${RACINE}/cashd/balance`,
                      },
                      {
                        cle: "litiges",
                        libelle: "Litiges et pauses",
                        icone: <IconeStatut sante="litige" />,
                        href: `${RACINE}/cashd/litiges`,
                      },
                    ]}
                  />
                  {b.groupe ? (
                    <MenuOptions
                      titre="Débiteurs du groupe…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {b.groupe}
                        </>
                      }
                      options={comptes
                        .filter((x) => x.groupe === b.groupe)
                        .map((x) => ({
                          cle: x.compte_id,
                          libelle: x.nom,
                          meta: montant(x.encours, x.devise),
                          icone: <IconeDebiteur b={x} />,
                          coche: x.compte_id === b.compte_id,
                          href: `${RACINE}/cashd?compte=${encodeURIComponent(x.compte_id)}`,
                        }))}
                    />
                  ) : null}
                </div>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Contact</span>
                  {contact ? (
                    <MenuOptions
                      titre="Contact…"
                      declencheur={
                        <>
                          <IconeEnveloppe />
                          {contact}
                        </>
                      }
                      options={[
                        {
                          cle: "ecrire",
                          libelle: "Écrire un e-mail",
                          icone: <IconeEnveloppe />,
                          action: () => window.open(`mailto:${contact}`),
                        },
                        {
                          cle: "copier",
                          libelle: "Copier l'adresse",
                          icone: <Copy width={16} height={16} />,
                          action: () => navigator.clipboard?.writeText(contact),
                        },
                      ]}
                    />
                  ) : (
                    <Link href={suivi} className="v2-btn v2-btn--petit lin-puce--vide">
                      <Plus width={14} height={14} aria-hidden="true" />
                      Ajouter une adresse de facturation
                    </Link>
                  )}
                </div>

                <details className="lin-maj" open aria-label="Dernière relance">
                  <summary className="lin-maj-tete">
                    <span className="lin-maj-titre">
                      Dernière relance
                      <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                      </svg>
                    </span>
                    <Link href={suivi} className="lin-maj-lien">
                      <ExternalLink width={14} height={14} aria-hidden="true" /> Relances
                    </Link>
                  </summary>
                  {derniere ? (
                    <>
                      <p className="lin-maj-auteur">
                        <IconeSante sante={s} />
                        <span data-teinte={SANTES[s].teinte}>{SANTES[s].libelle}</span>
                        <span className="lin-avatar-auteur" aria-hidden="true">
                          <HandCoins width={11} height={11} />
                        </span>
                        <span className="lin-maj-gris">CASHD</span>
                        <span className="lin-maj-gris">{dateCourte(derniere.jour)}</span>
                      </p>
                      <p className="lin-maj-texte">{derniere.sujet ?? libellePalier(derniere.palier)}</p>
                      <dl className="lin-maj-citation">
                        <div>
                          <dt>Palier</dt>
                          <dd>{libellePalier(derniere.palier)}</dd>
                        </div>
                        <div>
                          <dt>Montant</dt>
                          <dd>{montant(derniere.montant, b.devise)}</dd>
                        </div>
                        <div>
                          <dt>État</dt>
                          <dd>{etatRelance(derniere)}</dd>
                        </div>
                      </dl>
                    </>
                  ) : (
                    <p className="lin-maj-texte lin-maj-gris">Aucune relance écrite pour ce débiteur. Elles sont préparées chaque matin et ne partent qu&apos;avec votre accord.</p>
                  )}
                  <footer className="lin-maj-pied">
                    <Link href={suivi} className="lin-maj-pied-btn" aria-label="Voir la relance" title="Voir la relance">
                      <MessageSquare width={16} height={16} aria-hidden="true" />
                    </Link>
                    <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                      <CheckCheck width={16} height={16} aria-hidden="true" />
                    </Link>
                  </footer>
                </details>

                <h2 className="lin-projet-h2">Ancienneté de l&apos;encours</h2>
                <ul className="lin-projet-liste">
                  {TRANCHES.map((t) => (
                    <li key={t.cle}>
                      <span>{t.libelle}</span>
                      <span className="lin-meta">{montant(b[t.cle], b.devise)}</span>
                    </li>
                  ))}
                </ul>

                <h2 className="lin-projet-h2">Paliers de relance</h2>
                <ul className="lin-projet-liste">
                  {ORDRE_PALIERS.map((p) => (
                    <li key={p}>
                      <Losange atteint={vus.has(p)} />
                      <span>{libellePalier(p)}</span>
                      <span className="lin-meta">{vus.has(p) ? `atteint · ${dateCourte(vus.get(p) ?? null)}` : "pas encore"}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h1 className="lin-projet-h1" style={{ marginTop: 0 }}>
                  Relances
                </h1>
                {relances.length ? (
                  <ul className="lin-projet-liste">
                    {relances.map((r) => (
                      <li key={r.id}>
                        <Losange atteint={r.etat !== "a_valider"} />
                        <span>
                          {libellePalier(r.palier)} · {montant(r.montant, b.devise)}
                        </span>
                        <span className="lin-meta">
                          {etatRelance(r)} · {dateCourte(r.jour)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Aucune relance écrite pour ce débiteur.</p>
                )}
              </>
            )}
          </article>

          <aside className="lin-cartes-droite" aria-label="Propriétés du débiteur">
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Santé</dt>
                  <dd data-teinte={SANTES[s].teinte}>
                    <MenuOptions
                      plat
                      titre="Changer le statut…"
                      declencheur={
                        <>
                          <IconeStatut sante={s} />
                          {SANTES[s].libelle}
                        </>
                      }
                      options={STATUTS.map((x) => ({
                        cle: x.cle,
                        libelle: x.libelle,
                        meta: x.aide,
                        icone: <IconeStatut sante={x.sante(b)} />,
                        coche: b.statut === x.cle,
                        action: () => changerStatutCompte(b, x.cle),
                      }))}
                      largeur={300}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Retard</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Échu par ancienneté…"
                      declencheur={
                        <>
                          <IconePriorite niveau={niveauDe(b.retard_max_jours)} titre={retardDe(b.retard_max_jours)} />
                          {retardDe(b.retard_max_jours)}
                        </>
                      }
                      options={TRANCHES.map((x, i) => ({
                        cle: x.cle,
                        libelle: x.libelle,
                        meta: montant(b[x.cle], b.devise),
                        icone: <IconePriorite niveau={i as 0 | 1 | 2 | 3 | 4} titre={x.libelle} />,
                        href: `${RACINE}/cashd/balance`,
                      }))}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Échéance</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Aller à…"
                      declencheur={
                        <>
                          <IconeCalendrier passe={!!(b.echu > 0)} />
                          {dateCourte(b.plus_ancienne_echeance)}
                        </>
                      }
                      options={[
                        {
                          cle: "suivi",
                          libelle: "Débiteurs et relances",
                          icone: <ExternalLink width={16} height={16} />,
                          href: suivi,
                        },
                        {
                          cle: "envois",
                          libelle: "Envois",
                          icone: <IconeEnveloppe />,
                          href: `${RACINE}/cashd/suivi?vue=envois`,
                        },
                        {
                          cle: "balance",
                          libelle: "Balance âgée",
                          icone: <IconeCalendrier />,
                          href: `${RACINE}/cashd/balance`,
                        },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Référence</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Référence…"
                      declencheur={
                        <>
                          <IconeDiese />
                          {b.reference}
                        </>
                      }
                      options={[
                        {
                          cle: "copier",
                          libelle: "Copier la référence",
                          icone: <Copy width={16} height={16} />,
                          action: () => navigator.clipboard?.writeText(b.reference),
                        },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Groupe</dt>
                  <dd className={b.groupe ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre={b.groupe ? "Débiteurs du groupe…" : "Groupe…"}
                      declencheur={
                        <>
                          <IconeGroupe />
                          {b.groupe ?? "Aucun groupe"}
                        </>
                      }
                      options={
                        b.groupe
                          ? comptes
                              .filter((x) => x.groupe === b.groupe)
                              .map((x) => ({
                                cle: x.compte_id,
                                libelle: x.nom,
                                meta: montant(x.encours, x.devise),
                                icone: <IconeDebiteur b={x} />,
                                coche: x.compte_id === b.compte_id,
                                href: `${RACINE}/cashd?compte=${encodeURIComponent(x.compte_id)}`,
                              }))
                          : [
                              {
                                cle: "suivi",
                                libelle: "Rattacher dans Débiteurs et relances",
                                icone: <ExternalLink width={16} height={16} />,
                                href: suivi,
                              },
                            ]
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>Plafond</dt>
                  <dd className={b.plafond_encours ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Plafond d'encours…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {b.plafond_encours ? montant(b.plafond_encours, b.devise) : "Aucun plafond"}
                        </>
                      }
                      options={[
                        {
                          cle: "risque",
                          libelle: "Régler dans Risque client",
                          icone: <ExternalLink width={16} height={16} />,
                          href: `${RACINE}/cashd/risque`,
                        },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Factures</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Factures…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {b.factures_echues} échue
                          {b.factures_echues > 1 ? "s" : ""} sur {b.factures_ouvertes}
                        </>
                      }
                      options={[
                        {
                          cle: "suivi",
                          libelle: "Voir les factures",
                          icone: <ExternalLink width={16} height={16} />,
                          href: suivi,
                        },
                        {
                          cle: "litiges",
                          libelle: "Litiges et pauses",
                          icone: <IconeStatut sante="litige" />,
                          href: `${RACINE}/cashd/litiges`,
                        },
                      ]}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Paliers">
              <ul className="lin-jalons">
                {ORDRE_PALIERS.map((p) => (
                  <li key={p}>
                    <Losange atteint={vus.has(p)} />
                    <span className="lin-jalon-nom">{libellePalier(p)}</span>
                    <span className="lin-meta">{vus.has(p) ? dateCourte(vus.get(p) ?? null) : "—"}</span>
                    <MenuActions
                      titre={`${libellePalier(p)}…`}
                      options={[
                        {
                          cle: "relances",
                          libelle: "Voir les relances",
                          icone: <ExternalLink width={16} height={16} />,
                          action: () => setOngletFiche("relances"),
                        },
                        {
                          cle: "debiteurs",
                          libelle: "Débiteurs à ce palier",
                          icone: <Losange atteint />,
                          href: `${RACINE}/cashd?vue=debiteurs&palier=${p}`,
                        },
                        {
                          cle: "envois",
                          libelle: "Envois",
                          icone: <IconeEnveloppe />,
                          href: `${RACINE}/cashd/suivi?vue=envois`,
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </CarteDroite>

            <CarteEncours liste={[b]} />

            <CarteDroite
              titre="Activité"
              action={
                <button type="button" className="lin-carte-lien" onClick={() => setOngletFiche("relances")}>
                  Tout voir
                </button>
              }
            >
              {relances.length ? (
                <ul className="lin-activite">
                  {relances.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      <Losange atteint={r.etat !== "a_valider"} />
                      <span>
                        {libellePalier(r.palier)} {etatRelance(r)} · {dateCourte(r.jour)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">Aucune relance pour l&apos;instant.</p>
              )}
            </CarteDroite>
          </aside>
        </div>
      </div>
    );
  }

  /* ——— le tableau de bord : la page d'un projet, CASHD étant le projet ———
     Linear n'a pas de page « Dashboards » dans l'offre de Teo (vérifié le
     28/10) : la page est faite des briques relevées sur la page d'un projet
     (titre, propriétés, « Latest update », jalons, cartes de droite, carte
     Progress avec ses chiffres et ses répartitions). */
  if (vue !== "debiteurs") {
    const t = d.tableau.totaux;
    const aValider = d.relances.filter((r) => r.etat === "a_valider");
    const enRetard = comptes.filter((b) => b.echu > 0).sort((a, b) => b.echu - a.echu);
    const sante: Sante = comptes.some((b) => santeDe(b) === "litige") && !t.comptes_en_retard ? "litige" : t.comptes_en_retard ? "retard" : "a_jour";
    const plusAncienne =
      enRetard
        .map((b) => b.plus_ancienne_echeance)
        .filter((x): x is string => !!x)
        .sort()[0] ?? null;
    const maxTranche = Math.max(1, ...TRANCHES.slice(1).map((x) => t[x.cle] ?? 0));
    const parPalier = ORDRE_PALIERS.map((p) => ({
      p,
      n: comptes.filter((b) => dernierPalier(b.compte_id) === p).length,
    }));
    const recentes = d.relances
      .slice()
      .sort((x, y) => y.jour.localeCompare(x.jour))
      .slice(0, 3);
    const listeDebiteurs = `${RACINE}/cashd?vue=debiteurs`;
    return (
      <div className="lin">
        <h1 className="v2-sr">Relances</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Tableau de bord</span>
          <div className="lin-tete-droite">
            <button type="button" className="v2-btn v2-btn--petit" onClick={() => exporterBalance(comptes, jourParis())}>
              <Download width={14} height={14} aria-hidden="true" />
              <span>Exporter</span>
            </button>
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues de CASHD">
            <span className="v2-btn v2-btn--petit" data-actif="" aria-current="page">
              Aperçu
            </span>
            <Link href={listeDebiteurs} className="v2-btn v2-btn--petit">
              Débiteurs
            </Link>
            <Link href={`${RACINE}/validations`} className="v2-btn v2-btn--petit">
              À valider
            </Link>
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            <span
              className="lin-tuile"
              style={{
                background: "color-mix(in srgb, #f2c94c 18%, transparent)",
                color: "#f2c94c",
              }}
            >
              <HandCoins width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2 className="lin-projet-h1">Relances</h2>
            <p className="lin-projet-resume">
              {t.encours > 0 ? `On vous doit ${montant(t.encours)}, dont ${montant(t.echu)} échus chez ${t.comptes_en_retard} débiteur${t.comptes_en_retard > 1 ? "s" : ""}.` : "Personne ne vous doit d'argent."}
            </p>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Propriétés</span>
              <MenuOptions
                raccourci="s"
                titre="Voir les débiteurs…"
                teinte={SANTES[sante].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={sante} />
                    {SANTES[sante].libelle}
                  </>
                }
                options={(Object.keys(SANTES) as Sante[]).map((x) => {
                  const n = comptes.filter((b) => santeDe(b) === x).length;
                  return {
                    cle: x,
                    libelle: SANTES[x].libelle,
                    meta: `${n} débiteur${n > 1 ? "s" : ""}`,
                    icone: <IconeStatut sante={x} />,
                    coche: x === sante,
                    href: `${RACINE}/cashd?vue=debiteurs&sante=${x}`,
                  };
                })}
                largeur={280}
              />
              <MenuOptions
                raccourci="v"
                titre="Relances à valider…"
                declencheur={
                  <>
                    <Losange atteint={aValider.length > 0} />
                    {aValider.length} à valider
                  </>
                }
                options={[
                  ...aValider.map((r): Option => ({
                    cle: r.id,
                    libelle: r.compte,
                    meta: `${libellePalier(r.palier)} · ${montant(r.montant)}`,
                    icone: <Losange atteint />,
                    href: `${RACINE}/validations`,
                  })),
                  {
                    cle: "tout",
                    libelle: "Tout voir dans Décisions",
                    icone: <ExternalLink width={16} height={16} />,
                    href: `${RACINE}/validations`,
                  },
                ]}
                largeur={360}
              />
              <MenuOptions
                raccourci="e"
                titre="Échéances passées…"
                declencheur={
                  <>
                    <IconeCalendrier passe={!!plusAncienne} />
                    {plusAncienne ? `Depuis le ${dateCourte(plusAncienne)}` : "Aucune échéance passée"}
                  </>
                }
                options={enRetard
                  .slice()
                  .sort((a, b) => (a.plus_ancienne_echeance ?? "").localeCompare(b.plus_ancienne_echeance ?? ""))
                  .map((b) => ({
                    cle: b.compte_id,
                    libelle: b.nom,
                    meta: dateCourte(b.plus_ancienne_echeance),
                    icone: <IconeDebiteur b={b} />,
                    href: `${RACINE}/cashd?compte=${encodeURIComponent(b.compte_id)}`,
                  }))}
                largeur={320}
              />
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Import</span>
              <MenuOptions
                raccourci="d"
                titre="Données…"
                declencheur={
                  <>
                    <IconeImport />
                    {d.tableau.dernier_import ? `Dernier import le ${dateCourte(d.tableau.dernier_import)}` : "Aucun import"}
                  </>
                }
                options={[
                  {
                    cle: "exporter",
                    libelle: "Exporter la balance",
                    icone: <IconeImport />,
                    action: () => exporterBalance(comptes, jourParis()),
                  },
                  {
                    cle: "balance",
                    libelle: "Balance âgée",
                    icone: <IconeCalendrier />,
                    href: `${RACINE}/cashd/balance`,
                  },
                  {
                    cle: "suivi",
                    libelle: "Débiteurs et relances",
                    icone: <ExternalLink width={16} height={16} />,
                    href: `${RACINE}/cashd/suivi?vue=debiteurs`,
                  },
                ]}
              />
            </div>

            <details className="lin-maj" open aria-label="À valider aujourd'hui">
              <summary className="lin-maj-tete">
                <span className="lin-maj-titre">
                  À valider aujourd&apos;hui
                  <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
                  </svg>
                </span>
                <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                  <ExternalLink width={14} height={14} aria-hidden="true" /> Valider
                </Link>
              </summary>
              <p className="lin-maj-auteur">
                <IconeSante sante={aValider.length ? "retard" : "a_jour"} />
                <span data-teinte={aValider.length ? "jaune" : "vert"}>{aValider.length ? `${aValider.length} relance${aValider.length > 1 ? "s" : ""} prête${aValider.length > 1 ? "s" : ""}` : "Rien à valider"}</span>
                <span className="lin-avatar-auteur" aria-hidden="true">
                  <HandCoins width={11} height={11} />
                </span>
                <span className="lin-maj-gris">CASHD</span>
                <span className="lin-maj-gris">ce matin</span>
              </p>
              <p className="lin-maj-texte">Les relances sont écrites chaque matin ; aucune ne part sans votre accord.</p>
              {aValider.length ? (
                <dl className="lin-maj-citation">
                  {aValider.slice(0, 5).map((r) => (
                    <div key={r.id}>
                      <dt>{r.compte}</dt>
                      <dd>
                        {libellePalier(r.palier)} · {montant(r.montant)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <footer className="lin-maj-pied">
                <Link href={`${RACINE}/cashd/suivi?vue=relances`} className="lin-maj-pied-btn" aria-label="Voir les relances" title="Voir les relances">
                  <MessageSquare width={16} height={16} aria-hidden="true" />
                </Link>
                <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                  <CheckCheck width={16} height={16} aria-hidden="true" />
                </Link>
              </footer>
            </details>

            <h3 className="lin-projet-h2">Échu par ancienneté</h3>
            <ul className="lin-projet-liste">
              {TRANCHES.slice(1).map((x) => (
                <li key={x.cle}>
                  <span className="lin-tranche-nom">{x.libelle}</span>
                  <span className="lin-tranche-barre" aria-hidden="true">
                    <span
                      style={{
                        width: `${((t[x.cle] ?? 0) / maxTranche) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="lin-meta">{montant(t[x.cle] ?? 0)}</span>
                </li>
              ))}
            </ul>

            <h3 className="lin-projet-h2">Plus gros retards</h3>
            {enRetard.length ? (
              <ul className="lin-projet-liste">
                {enRetard.slice(0, 5).map((b) => (
                  <li key={b.compte_id}>
                    <Link href={`${RACINE}/cashd?compte=${encodeURIComponent(b.compte_id)}`} className="lin-projet-lien">
                      <IconeDebiteur b={b} />
                      <span>{b.nom}</span>
                      <IconePriorite niveau={niveauDe(b.retard_max_jours)} titre={retardDe(b.retard_max_jours)} />
                      <span className="lin-meta">{montant(b.echu, b.devise)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lin-maj-texte lin-maj-gris">Aucun retard.</p>
            )}
            <Link href={listeDebiteurs} className="lin-voir-tout">
              Voir tous les débiteurs <ArrowRight width={14} height={14} aria-hidden="true" />
            </Link>
          </article>

          <aside className="lin-cartes-droite" aria-label="Les chiffres">
            {/* l'ordre des cartes de Linear : Properties, Milestones, Progress, Activity */}
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Débiteurs</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Voir les débiteurs…"
                      declencheur={
                        <>
                          <IconeGroupe />
                          {comptes.length}
                        </>
                      }
                      options={(Object.keys(SANTES) as Sante[]).map((x) => {
                        const n = comptes.filter((b) => santeDe(b) === x).length;
                        return {
                          cle: x,
                          libelle: SANTES[x].libelle,
                          meta: `${n}`,
                          icone: <IconeStatut sante={x} />,
                          href: `${RACINE}/cashd?vue=debiteurs&sante=${x}`,
                        };
                      })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Factures échues</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Factures échues…"
                      declencheur={
                        <>
                          <IconeDocument />
                          {t.factures_echues}
                        </>
                      }
                      options={[
                        {
                          cle: "balance",
                          libelle: "Balance âgée",
                          icone: <IconeCalendrier />,
                          href: `${RACINE}/cashd/balance`,
                        },
                        {
                          cle: "suivi",
                          libelle: "Débiteurs et relances",
                          icone: <ExternalLink width={16} height={16} />,
                          href: `${RACINE}/cashd/suivi?vue=debiteurs`,
                        },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Plafonds dépassés</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Plafonds dépassés…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {comptes.filter((b) => b.depasse_plafond).length}
                        </>
                      }
                      options={[
                        ...comptes
                          .filter((b) => b.depasse_plafond)
                          .map((b): Option => ({
                            cle: b.compte_id,
                            libelle: b.nom,
                            meta: montant(b.encours, b.devise),
                            icone: <IconeDebiteur b={b} />,
                            href: `${RACINE}/cashd?compte=${encodeURIComponent(b.compte_id)}`,
                          })),
                        {
                          cle: "risque",
                          libelle: "Risque client",
                          icone: <ExternalLink width={16} height={16} />,
                          href: `${RACINE}/cashd/risque`,
                        },
                      ]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Dernier import</dt>
                  <dd className={d.tableau.dernier_import ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Données…"
                      declencheur={
                        <>
                          <IconeImport />
                          {d.tableau.dernier_import ? dateCourte(d.tableau.dernier_import) : "Aucun"}
                        </>
                      }
                      options={[
                        {
                          cle: "exporter",
                          libelle: "Exporter la balance",
                          icone: <IconeImport />,
                          action: () => exporterBalance(comptes, jourParis()),
                        },
                        {
                          cle: "tresorerie",
                          libelle: "Trésorerie",
                          icone: <ExternalLink width={16} height={16} />,
                          href: `${RACINE}/cashd/suivi?vue=tresorerie`,
                        },
                      ]}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Paliers atteints">
              <ul className="lin-jalons">
                {parPalier.map(({ p, n }) => (
                  <li key={p}>
                    <Losange atteint={n > 0} />
                    <span className="lin-jalon-nom">{libellePalier(p)}</span>
                    <span className="lin-meta">
                      {n} débiteur{n > 1 ? "s" : ""}
                    </span>
                    <MenuActions
                      titre={`${libellePalier(p)}…`}
                      options={[
                        {
                          cle: "debiteurs",
                          libelle: "Débiteurs à ce palier",
                          icone: <Losange atteint />,
                          href: `${RACINE}/cashd?vue=debiteurs&palier=${p}`,
                        },
                        {
                          cle: "relances",
                          libelle: "Relances",
                          icone: <ExternalLink width={16} height={16} />,
                          href: `${RACINE}/cashd/suivi?vue=relances`,
                        },
                        {
                          cle: "envois",
                          libelle: "Envois",
                          icone: <IconeEnveloppe />,
                          href: `${RACINE}/cashd/suivi?vue=envois`,
                        },
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </CarteDroite>

            <CarteEncours liste={comptes} groupes />

            <CarteDroite
              titre="Activité"
              action={
                <Link href={`${RACINE}/cashd/suivi?vue=relances`} className="lin-carte-lien">
                  Tout voir
                </Link>
              }
            >
              {recentes.length ? (
                <ul className="lin-activite">
                  {recentes.map((r) => (
                    <li key={r.id}>
                      <Losange atteint={r.etat !== "a_valider"} />
                      <span>
                        <b>{r.compte}</b> · {libellePalier(r.palier)} · {dateCourte(r.jour)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">Aucune relance pour l&apos;instant.</p>
              )}
            </CarteDroite>
          </aside>
        </div>
      </div>
    );
  }

  /* ——— la liste : le tableau des projets (« Voir tous les débiteurs ») ——— */
  const q = filtre.trim().toLowerCase();
  const filtres = ordonnes.filter(
    (b) => (onglet === "tous" || santeDe(b) === onglet) && (!palierFiltre || dernierPalier(b.compte_id) === palierFiltre) && (!q || `${b.nom} ${b.reference} ${b.groupe ?? ""}`.toLowerCase().includes(q)),
  );
  const presentes = (Object.keys(SANTES) as Sante[]).filter((s) => comptes.some((b) => santeDe(b) === s));
  const { totaux } = d.tableau;
  const envois = (p: string) => d.reponses.find((r) => r.palier === p)?.envoyees ?? 0;
  const lignesDetails =
    ongletDetails === "anciennete"
      ? TRANCHES.map((t) => ({
          cle: t.cle,
          libelle: t.libelle,
          valeur: montant(totaux[t.cle] ?? 0),
        }))
      : ongletDetails === "relances"
        ? [
            {
              cle: "echues",
              libelle: "Factures échues",
              valeur: String(totaux.factures_echues),
            },
            ...ORDRE_PALIERS.slice(1).map((p) => ({
              cle: p,
              libelle: libellePalier(p),
              valeur: String(comptes.filter((b) => paliersDe(b.compte_id).has(p)).length || envois(p)),
            })),
            {
              cle: "valider",
              libelle: "Relances à valider",
              valeur: String(d.relances.filter((r) => r.etat === "a_valider").length),
            },
          ]
        : [...new Set(comptes.map((b) => b.groupe ?? ""))].map((g) => ({
            cle: g || "-",
            libelle: g || "Sans groupe",
            valeur: montant(comptes.filter((b) => (b.groupe ?? "") === g).reduce((t, b) => t + b.encours, 0)),
          }));

  return (
    <div className="lin">
      <h1 className="v2-sr">Relances</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={`${RACINE}/cashd`} className="lin-fil-equipe">
            Tableau de bord
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici" aria-current="page">
            Débiteurs
          </span>
        </nav>
        <div className="lin-tete-droite">
          <button type="button" className="v2-btn v2-btn--petit" onClick={() => exporterBalance(comptes, jourParis())}>
            <Download width={14} height={14} aria-hidden="true" />
            <span>Exporter</span>
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Santé">
          <Link href={`${RACINE}/cashd?vue=debiteurs`} className="v2-btn v2-btn--petit" data-actif={onglet === "tous" ? "" : undefined} aria-current={onglet === "tous" ? "page" : undefined} scroll={false}>
            Tous les débiteurs
          </Link>
          {presentes.map((s) => (
            <Link key={s} href={`${RACINE}/cashd?vue=debiteurs&sante=${s}`} className="v2-btn v2-btn--petit" data-actif={onglet === s ? "" : undefined} aria-current={onglet === s ? "page" : undefined} scroll={false}>
              {SANTES[s].libelle}
            </Link>
          ))}
          {palierFiltre ? (
            <Link href={`${RACINE}/cashd?vue=debiteurs${onglet === "tous" ? "" : `&sante=${onglet}`}`} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
              <Losange atteint />
              {libellePalier(palierFiltre)} ✕
            </Link>
          ) : null}
        </nav>
        <div className="lin-outils-droite">
          <Menu
            largeur={260}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Filtrer" title="Filtrer" aria-expanded={ouvert} aria-pressed={!!filtre} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Filtrer par nom, référence ou groupe…"
                aria-label="Filtrer les débiteurs"
                value={filtre}
                onChange={(e) => setFiltre(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fermer()}
              />
            )}
          </Menu>
          <Menu
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={ouvert} onClick={basculer}>
                <SlidersHorizontal width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {() => (
              <div className="lin-menu-section">
                <label className="lin-reglage">
                  Tri
                  <Choix<Tri>
                    libelle="Tri"
                    valeur={tri}
                    onChange={setTri}
                    options={[
                      { cle: "echu", libelle: "Échu" },
                      { cle: "encours", libelle: "Encours" },
                      { cle: "retard", libelle: "Retard" },
                      { cle: "nom", libelle: "Nom" },
                    ]}
                  />
                </label>
              </div>
            )}
          </Menu>
          <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Détails" title="Détails" aria-pressed={details} onClick={() => setDetails((v) => !v)}>
            <PanelRight width={14} height={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="lin-corps" data-details={details ? "" : undefined}>
        <div className="lin-liste">
          <div className="lin-table" role="table" aria-label="Débiteurs">
            <div className="lin-table-tete" role="row">
              <span role="columnheader" aria-hidden="true" />
              <span role="columnheader">Nom</span>
              <span role="columnheader">Santé</span>
              <span role="columnheader">Retard</span>
              <span role="columnheader" className="lin-num">
                Échu
              </span>
              <span role="columnheader">Échéance</span>
              <span role="columnheader" className="lin-num">
                Factures
              </span>
              <span role="columnheader">Part échue</span>
            </div>
            {filtres.length === 0 ? (
              <p className="lin-vide">{comptes.length ? "Aucun débiteur ne correspond." : "Aucun impayé : personne ne vous doit d'argent."}</p>
            ) : (
              filtres.map((b) => {
                const s = santeDe(b);
                const palier = dernierPalier(b.compte_id);
                return (
                  <Link key={b.compte_id} href={`${RACINE}/cashd?compte=${encodeURIComponent(b.compte_id)}`} className="lin-table-ligne" role="row" scroll={false}>
                    <span className="lin-case" aria-hidden="true" />
                    <span className="lin-table-nom" role="cell">
                      <IconeDebiteur b={b} />
                      <span className="lin-table-titre">{b.nom}</span>
                      {palier ? (
                        <span className="lin-jalon-puce">
                          <Losange atteint />
                          {libellePalier(palier)}
                        </span>
                      ) : null}
                    </span>
                    <span className="lin-table-sante" role="cell" data-teinte={SANTES[s].teinte}>
                      <IconeSante sante={s} />
                      <span>{SANTES[s].libelle}</span>
                    </span>
                    <span role="cell">
                      <IconePriorite niveau={niveauDe(b.retard_max_jours)} titre={retardDe(b.retard_max_jours)} />
                    </span>
                    <span role="cell" className="lin-num lin-table-valeur">
                      {b.echu > 0 ? montant(b.echu, b.devise) : "—"}
                    </span>
                    <span role="cell" className="lin-table-date">
                      <IconeCalendrier passe={!!(b.echu > 0)} />
                      {dateCourte(b.plus_ancienne_echeance)}
                    </span>
                    <span role="cell" className="lin-num lin-table-chiffre">
                      {b.factures_ouvertes}
                    </span>
                    <span role="cell" className="lin-table-statut">
                      <Anneau part={partEchue(b)} sante={s} />
                      {partEchue(b)}%
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {details ? (
          <aside className="lin-details" aria-label="Détails">
            <div className="lin-details-onglets" role="tablist">
              {(
                [
                  ["anciennete", "Ancienneté"],
                  ["relances", "Relances"],
                  ["groupes", "Groupes"],
                ] as const
              ).map(([cle, lib]) => (
                <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={ongletDetails === cle} onClick={() => setOngletDetails(cle)}>
                  {lib}
                </button>
              ))}
            </div>
            <ul className="lin-details-lignes">
              {lignesDetails.map((l) => (
                <li key={l.cle}>
                  <span>{l.libelle}</span>
                  <span className="lin-details-valeur">{l.valeur}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
