"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — la première page, sur la page « Projects » de Linear (28/10/2026)

   Même modèle que CASHD (../cashd/Debiteurs.tsx) : un client qui décroche
   est un projet. Trois vues, lues dans l'adresse :

     · le tableau de bord (/espace3/offload) : la page d'un projet, OFFLOAD
       étant le projet — combien de clients décrochent et le chiffre annuel
       en jeu, les reprises à valider en « Latest update », les comptes par
       niveau, les plus grosses valeurs en jeu ; à droite les cartes
       Propriétés, Étapes de la reprise, Valeur en jeu et Activité ;
     · la liste (?vue=comptes) : le tableau des projets — un compte par
       ligne, son niveau en santé, son score en priorité, la valeur en jeu,
       le dernier achat, le silence, le score en anneau ; la reprise en
       cours à côté du nom, comme le jalon d'un projet ;
     · un compte (?compte=) : la page d'un projet — ses propriétés, ses
       raisons en clair, la reprise préparée, son rythme, et à droite les
       cartes Propriétés, Reprise, Achats et Activité. Les autres pages
       d'OFFLOAD (échéances, affaires, groupes) ouvrent déjà un compte par
       ?compte= : elles arrivent ici.

   Les chiffres passent par les mêmes portes que l'ancien écran
   (components/espace/offload/EcranOffload) : l'exemple (exempleOffload,
   modifié en mémoire par les gestes), ou la base réelle (offload_tableau,
   puis offload_fiche à l'ouverture d'un compte). Deux gestes seulement
   écrivent : préparer une reprise (offload_ouvrir_reprise) et reprendre la
   main ou remettre dans le cycle (offload_changer_statut) ; recalculer
   relance la détection (offload_recalculer). Le reste filtre la page sans
   la quitter (?filtre=niveau|etape|silence|commercial|cloture|mode:valeur,
   une pastille « ✕ » par filtre après les onglets), ouvre un compte ou un
   onglet de sa fiche, ou copie. Gabarit : ../lin/lin.css, retouches :
   ./offload.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCheck, Copy, ExternalLink, ListFilter, MapPin, MessageSquare, PanelRight, PhoneCall, RefreshCw, Send, ShieldCheck, SlidersHorizontal, UserMinus, UserRound } from "lucide-react";
import { useSource } from "@/components/espace3/base/source";
import { useTempsReel } from "@/components/espace3/base/tempsReel";
import { montant } from "@/components/espace3/base/format";
import { exempleOffload } from "@/components/espace3/base/offload/exemples";
import { A_RISQUE, ISSUES, NIVEAUX, STATUTS_COMPTE, STATUTS_REPRISE } from "@/components/espace3/base/offload/etats";
import * as portes from "@/components/espace3/base/offload/portes";
import type { AValider, Compte, Fiche, Niveau, Reprise, StatutReprise, Tableau } from "@/components/espace3/base/offload/types";
import { CarteDroite, Choix, GraphiqueProgres, IconePriorite, Menu, MenuActions, MenuOptions, type Option } from "../lin/Lin";
import { IconeCalendrier, IconeDiese, IconeDocument, IconeEnveloppe, IconeGroupe, IconeJauge, IconeStatutProjet, type EtatProjet } from "../lin/icones";
import { RACINE } from "../modules";
import "./offload.css";

type Sante = Niveau | "inconnu";
type Teinte = "vert" | "jaune" | "rouge" | "gris" | "bleu";
type Tri = "priorite" | "valeur" | "silence" | "nom";
type StatutSuivi = "suivi" | "exclu";

/* dans l'ordre des onglets : ce qui demande une action d'abord ; les libellés sont ceux de l'ancien écran (etats.ts) */
const SANTES: Record<Sante, { libelle: string; teinte: Teinte }> = {
  eteint: { libelle: NIVEAUX.eteint.libelle, teinte: "rouge" },
  decroche: { libelle: NIVEAUX.decroche.libelle, teinte: "jaune" },
  saison: { libelle: NIVEAUX.saison.libelle, teinte: "jaune" },
  ralentit: { libelle: NIVEAUX.ralentit.libelle, teinte: "bleu" },
  ok: { libelle: NIVEAUX.ok.libelle, teinte: "vert" },
  sans_achat: { libelle: NIVEAUX.sans_achat.libelle, teinte: "gris" },
  sous_seuil: { libelle: NIVEAUX.sous_seuil.libelle, teinte: "gris" },
  inconnu: { libelle: "Pas encore évalué", teinte: "gris" },
};
/* les étapes d'une reprise, dans l'ordre où elles se suivent */
const ETAPES: StatutReprise[] = ["a_valider", "appel", "envoyee", "relance_a_valider", "relancee", "repondue", "close"];
const EN_COURS: StatutReprise[] = ["a_valider", "appel", "envoyee", "relance_a_valider", "relancee"];
/* le silence depuis le dernier achat, en tranches (la carte « Valeur en jeu ») */
const SILENCES = [
  { cle: "30", libelle: "Moins de 30 jours", court: "30 j", max: 30 },
  { cle: "60", libelle: "31 à 60 jours", court: "60 j", max: 60 },
  { cle: "90", libelle: "61 à 90 jours", court: "90 j", max: 90 },
  { cle: "180", libelle: "91 à 180 jours", court: "180 j", max: 180 },
  { cle: "plus", libelle: "Plus de 180 jours", court: "+180 j", max: Infinity },
] as const;
/* les couleurs d'icône de projet de Linear, une par compte */
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const COULEUR_OFFLOAD = "#26b5ce";

const santeDe = (c: Compte): Sante => c.signal?.niveau ?? "inconnu";
const aRisque = (c: Compte) => !!c.signal && A_RISQUE.includes(c.signal.niveau) && c.statut === "suivi";
const repriseEnCours = (c: Compte) => (c.reprise && EN_COURS.includes(c.reprise.statut) ? c.reprise : null);
const valeurDe = (c: Compte) => c.signal?.valeur_annuelle ?? 0;
/* le score (0 à 100, la somme des points des raisons) en barres de priorité */
const prioDe = (score: number): 0 | 1 | 2 | 3 | 4 => (score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : score > 0 ? 1 : 0);
const scoreDe = (c: Compte) => (c.signal ? `Score ${c.signal.score} sur 100` : "Pas encore évalué");
const silenceDe = (j: number | null | undefined) => (j === null || j === undefined ? "Aucun achat daté" : j > 0 ? `${j} jour${j > 1 ? "s" : ""} sans achat` : "Achat ce jour");
const dateCourte = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Paris",
      })
    : "—";
const couleurDe = (id: string) => COULEURS[[...id].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];
const somme = (v: number[]) => v.reduce((a, b) => a + b, 0);
const cumul = (v: number[]) => v.map((_, i) => somme(v.slice(0, i + 1)));
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
/* les teintes de l'ancien écran (ambre, bleu, vert, gris) dans celles du gabarit */
const teinteReprise = (s: StatutReprise): Teinte => {
  const t = STATUTS_REPRISE[s].teinte;
  return t === "vert" || t === "bleu" || t === "gris" ? t : "jaune";
};
const trancheDe = (j: number) => SILENCES.findIndex((t) => j <= t.max);
/* la première raison qui dit pourquoi : celle de la clôture n'explique rien du silence */
const raisonDe = (c: Compte) => c.signal?.raisons.find((x) => x.code !== "avant_cloture") ?? c.signal?.raisons[0] ?? null;
const trancheCle = (c: Compte) => {
  const j = c.signal?.jours_silence;
  return j === null || j === undefined ? null : SILENCES[trancheDe(j)].cle;
};

/* les filtres du tableau de bord et de la liste (demande de Teo, 28/10 : « c'est juste censé
   modifier ce que le dashboard affiche ») : une pastille ou une valeur de carte ne mène plus
   vers une autre page, elle restreint les comptes dont tous les chiffres sont recalculés.
   Ils sont lus dans l'adresse, un par dimension : ?filtre=niveau:eteint&filtre=silence:90 */
type Dimension = "niveau" | "etape" | "silence" | "commercial" | "cloture" | "mode";
type Filtres = Partial<Record<Dimension, string>>;
const DIMENSIONS: Dimension[] = ["niveau", "etape", "silence", "commercial", "cloture", "mode"];
const MODES: Record<string, string> = { essai: "Mode essai", reel: "Mode réel" };
const SANS_COMMERCIAL = "-";
const lireFiltres = (valeurs: string[]): Filtres => {
  const f: Filtres = {};
  for (const v of valeurs) {
    const i = v.indexOf(":");
    const dim = v.slice(0, i) as Dimension;
    const val = v.slice(i + 1);
    if (i < 1 || !val || !DIMENSIONS.includes(dim)) continue;
    const valide =
      dim === "niveau"
        ? Object.hasOwn(SANTES, val)
        : dim === "etape"
          ? Object.hasOwn(STATUTS_REPRISE, val)
          : dim === "silence"
            ? SILENCES.some((t) => t.cle === val)
            : dim === "cloture"
              ? val === "oui"
              : dim === "mode"
                ? Object.hasOwn(MODES, val)
                : true;
    if (valide) f[dim] = val;
  }
  return f;
};
const libelleFiltre = (d: Dimension, v: string) =>
  d === "niveau"
    ? SANTES[v as Sante].libelle
    : d === "etape"
      ? STATUTS_REPRISE[v as StatutReprise].libelle
      : d === "silence"
        ? `Silence : ${(SILENCES.find((t) => t.cle === v)?.libelle ?? v).toLowerCase()}`
        : d === "commercial"
          ? v === SANS_COMMERCIAL
            ? "Sans commercial"
            : v
          : d === "cloture"
            ? "Avant la clôture"
            : `Reprises en ${v === "essai" ? "essai" : "réel"}`;

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
      {t === "bleu" ? <path d="M4.8 7.2 7.2 8.6l1.6-1 2.4 1.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}

/* le niveau d'un compte, en hexagone de projet (pastilles, cartes, menus) ; le cercle de
   santé (IconeSante) reste là où Linear met la santé : la ligne d'auteur et la colonne Niveau */
const ETAT_PROJET: Record<Sante, EtatProjet> = {
  eteint: "annule",
  decroche: "en-cours",
  saison: "en-cours",
  ralentit: "en-cours",
  ok: "fait",
  sans_achat: "planifie",
  sous_seuil: "planifie",
  inconnu: "planifie",
};
function IconeStatut({ sante }: { sante: Sante }) {
  return <IconeStatutProjet etat={ETAT_PROJET[sante]} titre={SANTES[sante].libelle} />;
}

/* l'anneau d'avancement d'un projet, 16 px : ici le score sur 100 */
function Anneau({ part, sante }: { part: number; sante: Sante }) {
  const c = 2 * Math.PI * 5;
  return (
    <svg className="lin-anneau" data-teinte={SANTES[sante].teinte} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray={`${(part / 100) * c} ${c}`} transform="rotate(-90 8 8)" />
    </svg>
  );
}

/* le losange d'un jalon : contour seul, jaune à 40 % une fois l'étape atteinte */
function Losange({ atteint }: { atteint: boolean }) {
  return (
    <svg className="lin-losange" data-atteint={atteint ? "" : undefined} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8 12.9 8 8 14.2 3.1 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeOpacity={atteint ? 0.4 : 1} />
    </svg>
  );
}

/* l'icône d'un filtre, dans son option comme dans sa pastille « ✕ » */
function IconeFiltre({ d, v }: { d: Dimension; v: string }) {
  if (d === "niveau") return <IconeStatut sante={v as Sante} />;
  if (d === "etape") return <Losange atteint />;
  if (d === "silence" || d === "cloture") return <IconeCalendrier passe />;
  if (d === "commercial") return <UserRound width={14} height={14} aria-hidden="true" />;
  return <ShieldCheck width={14} height={14} aria-hidden="true" />;
}

function IconeCompte({ c, grand }: { c: Compte; grand?: boolean }) {
  const couleur = couleurDe(c.id);
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

function Avatar() {
  return (
    <span className="lin-avatar-auteur lin-avatar-offload" aria-hidden="true">
      <UserMinus width={11} height={11} />
    </span>
  );
}

function ChevronMaj() {
  return (
    <svg className="lin-maj-fleche" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.2 6.4h5.6L8 9.6z" fill="currentColor" />
    </svg>
  );
}

/* la carte « Valeur en jeu » : la carte « Progress » de Linear. Trois chiffres (la valeur
   annuelle des clients suivis, de ceux qui décrochent, de ceux dont la reprise est en
   cours), la courbe cumulée par silence (de « moins de 30 jours » à « plus de 180 »),
   puis la répartition, par silence ou par niveau. */
function CarteEnJeu({ liste }: { liste: Compte[] }) {
  const [onglet, setOnglet] = useState<"silence" | "niveaux">("silence");
  const dates = liste.filter((c) => c.signal?.jours_silence !== null && c.signal?.jours_silence !== undefined);
  const parTranche = (f: (c: Compte) => boolean) => SILENCES.map((_, i) => somme(dates.filter((c) => f(c) && trancheDe(c.signal?.jours_silence ?? 0) === i).map(valeurDe)));
  const total = parTranche(() => true);
  const risque = parTranche(aRisque);
  const reprise = parTranche((c) => aRisque(c) && !!repriseEnCours(c));
  const repartition =
    onglet === "silence"
      ? SILENCES.map((t, i) => ({ cle: t.cle, libelle: t.libelle, valeur: montant(total[i]) }))
      : (Object.keys(SANTES) as Sante[])
          .filter((s) => liste.some((c) => santeDe(c) === s))
          .map((s) => ({
            cle: s,
            libelle: SANTES[s].libelle,
            valeur: montant(somme(liste.filter((c) => santeDe(c) === s).map(valeurDe))),
          }));
  return (
    <CarteDroite titre="Valeur en jeu">
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Suivie
          </dt>
          <dd>{montant(somme(total))}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />À risque
          </dt>
          <dd>{montant(somme(risque))}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            En reprise
          </dt>
          <dd>{montant(somme(reprise))}</dd>
        </div>
      </dl>
      <GraphiqueProgres
        libelle={`Valeur annuelle cumulée par silence : ${montant(somme(total))} suivis, dont ${montant(somme(risque))} à risque et ${montant(somme(reprise))} en reprise`}
        etiquettes={SILENCES.map((t) => t.court)}
        series={[
          { cle: "suivie", teinte: "gris", valeurs: cumul(total) },
          { cle: "risque", teinte: "jaune", valeurs: cumul(risque) },
          { cle: "reprise", teinte: "bleu", valeurs: cumul(reprise), aire: true },
        ]}
      />
      <div className="lin-segment-carte" role="tablist">
        {(
          [
            ["silence", "Silence"],
            ["niveaux", "Niveaux"],
          ] as const
        ).map(([cle, lib]) => (
          <button key={cle} type="button" role="tab" className="lin-details-onglet" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
            {lib}
          </button>
        ))}
      </div>
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

/* la carte « Achats » d'un compte : la même carte « Progress ». Les douze derniers mois
   contre les douze d'avant, cumulés deux mois par deux mois (offload_fiche.mois), et ce
   qu'il aurait acheté à son rythme habituel (la valeur annuelle du signal). */
function CarteAchats({ fiche }: { fiche: Fiche }) {
  const mois = fiche.mois.slice(-24);
  const vingtQuatre = [...Array.from({ length: Math.max(0, 24 - mois.length) }, () => null), ...mois];
  const avant = vingtQuatre.slice(0, 12).map((m) => m?.montant ?? 0);
  const dernier = vingtQuatre.slice(12);
  const parDeux = (v: number[]) => [0, 1, 2, 3, 4, 5].map((k) => v[2 * k] + v[2 * k + 1]);
  const dernierMontants = dernier.map((m) => m?.montant ?? 0);
  const valeur = fiche.signal?.valeur_annuelle ?? null;
  const etiquettes = [0, 1, 2, 3, 4, 5].map((k, i) => {
    const m = dernier[2 * k + 1];
    return m ? new Date(`${m.mois}-01T12:00:00`).toLocaleDateString("fr-FR", { month: "short" }) : `${i + 1}`;
  });
  const recents = dernier
    .filter((m): m is NonNullable<typeof m> => !!m)
    .slice(-6)
    .reverse();
  return (
    <CarteDroite titre="Achats">
      <dl className="lin-kpis lin-kpis--trois">
        <div data-teinte="gris">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-gris)" }} />
            Année d&apos;avant
          </dt>
          <dd>{montant(somme(avant))}</dd>
        </div>
        <div data-teinte="jaune">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-jaune)" }} />
            Son rythme
          </dt>
          <dd>{montant(valeur)}</dd>
        </div>
        <div data-teinte="bleu">
          <dt>
            <span className="lin-carre" style={{ background: "var(--lin-graph-bleu)" }} />
            12 derniers mois
          </dt>
          <dd>{montant(somme(dernierMontants))}</dd>
        </div>
      </dl>
      <GraphiqueProgres
        libelle={`Achats cumulés : ${montant(somme(dernierMontants))} sur les douze derniers mois, contre ${montant(somme(avant))} les douze mois d'avant`}
        etiquettes={etiquettes}
        series={[
          { cle: "avant", teinte: "gris", valeurs: cumul(parDeux(avant)) },
          ...(valeur ? [{ cle: "rythme", teinte: "jaune" as const, valeurs: [1, 2, 3, 4, 5, 6].map((k) => (valeur * k) / 6) }] : []),
          { cle: "dernier", teinte: "bleu", valeurs: cumul(parDeux(dernierMontants)), aire: true },
        ]}
      />
      <ul className="lin-repartition">
        {recents.map((m) => (
          <li key={m.mois}>
            <span>{new Date(`${m.mois}-01T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
            <span>{m.pieces ? `${montant(m.montant)} · ${pluriel(m.pieces, "pièce")}` : "—"}</span>
          </li>
        ))}
      </ul>
    </CarteDroite>
  );
}

export default function ComptesRisque() {
  const { source } = useSource();
  const routeur = useRouter();
  const params = useSearchParams();
  const [exemple, setExemple] = useState(() => exempleOffload());
  const [reel, setReel] = useState<{ tableau: Tableau | null } | null>(null);
  const [fichesReelles, setFichesReelles] = useState<Record<string, Fiche>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurFiche, setErreurFiche] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [tri, setTri] = useState<Tri>("priorite");
  const [details, setDetails] = useState(false);
  const [ongletDetails, setOngletDetails] = useState<"niveaux" | "reprises" | "commerciaux">("niveaux");
  const [filtre, setFiltre] = useState("");
  const [ongletFiche, setOngletFiche] = useState<"apercu" | "reprises" | "pieces">("apercu");

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      setFichesReelles({});
      try {
        const tableau = await portes.chargerTableau();
        if (actif) setReel({ tableau });
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  /* le temps réel de l'ancien écran : un signal, une reprise, une tâche ou un achat qui change relit la page */
  const relire = useCallback(async () => {
    try {
      const tableau = await portes.chargerTableau();
      setReel({ tableau });
      setFichesReelles({});
    } catch {
      /* la prochaine lecture dira l'erreur */
    }
  }, []);
  useTempsReel(["offload_signaux", "offload_reprises", "offload_taches", "offload_achats"], source === "reelle", relire);

  const tableau: Tableau | null = source === "exemple" ? exemple.tableau : (reel?.tableau ?? null);
  const comptes = useMemo(() => tableau?.comptes ?? [], [tableau]);
  const compteOuvert = params.get("compte");
  const vue = params.get("vue");
  const onglet = (params.get("sante") as Sante | null) ?? "tous";
  const actifs = lireFiltres(params.getAll("filtre"));
  const nbActifs = Object.keys(actifs).length;
  const fiche: Fiche | null = compteOuvert ? (source === "exemple" ? (exemple.fiches[compteOuvert] ?? null) : (fichesReelles[compteOuvert] ?? null)) : null;

  /* la fiche d'un compte ouvert, lue en base à l'ouverture (offload_fiche) */
  useEffect(() => {
    if (source !== "reelle" || !compteOuvert || !reel?.tableau || fichesReelles[compteOuvert]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreurFiche(null);
      try {
        const f = await portes.chargerFiche(compteOuvert);
        if (!actif) return;
        if (f) setFichesReelles((x) => ({ ...x, [compteOuvert]: f }));
        else setErreurFiche("Ce compte n'est pas visible avec ce compte utilisateur.");
      } catch (e) {
        if (actif) setErreurFiche(e instanceof Error ? e.message : "La fiche n'a pas pu être lue.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, compteOuvert, reel, fichesReelles]);

  /* Échap referme un compte ouvert */
  useEffect(() => {
    if (!compteOuvert) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.key === "Escape" && !(cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) routeur.push(`${RACINE}/offload?vue=comptes`, { scroll: false });
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [compteOuvert, routeur]);

  /* après un geste en base : la liste et la fiche du compte sont relues */
  const relireCompte = async (id: string) => {
    const [tb, f] = await Promise.all([portes.chargerTableau(), portes.chargerFiche(id)]);
    setReel({ tableau: tb });
    setFichesReelles(f ? { [id]: f } : {});
  };

  /* préparer une reprise : le message part en validation, une tâche d'appel est posée (offload_ouvrir_reprise) */
  const preparerReprise = async (c: Compte) => {
    if (occupe) return;
    if (source === "reelle") {
      setOccupe(true);
      try {
        await portes.ouvrirReprise(c.id);
        await relireCompte(c.id);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "La reprise n'a pas pu être préparée.");
      } finally {
        setOccupe(false);
      }
      return;
    }
    /* l'exemple, modifié en mémoire comme dans l'ancien écran, pour que l'enchaînement se voie */
    setExemple((prev) => {
      const suivant = structuredClone(prev);
      const t = suivant.tableau;
      const f = suivant.fiches[c.id];
      const r: Reprise = {
        id: crypto.randomUUID(),
        compte_id: c.id,
        statut: "a_valider",
        issue: null,
        motif: null,
        ouverte_par: "manuel",
        envoye1_le: null,
        envoye2_le: null,
        repondu_le: null,
        close_le: null,
        cree_le: new Date().toISOString(),
        envoi1: { statut: "a_valider", mode: "essai", verrou: null, sujet: null },
        envoi2: null,
      };
      f?.reprises.unshift(r);
      for (const x of [f?.compte, t.comptes.find((y) => y.id === c.id)]) if (x) x.reprise = r;
      t.a_valider.push({
        reprise: r.id,
        compte_id: c.id,
        compte_nom: c.nom,
        statut: "a_valider",
        rang: 1,
        envoi: null,
        demande: null,
        mode: "essai",
        destinataire: c.email,
        sujet: `Reprise de contact — ${c.nom}`,
        corps: "Message rédigé à partir de la dernière commande du compte (exemple).",
        cree_le: r.cree_le,
      });
      t.compteurs.a_valider = t.a_valider.length;
      return suivant;
    });
  };

  /* reprendre la main (suivi en direct) ou remettre dans le cycle : le motif est obligatoire (offload_changer_statut) */
  const changerSuivi = async (c: Compte, statut: StatutSuivi) => {
    if (occupe || c.statut === statut) return;
    const motif = window.prompt(statut === "exclu" ? `Pourquoi reprendre ${c.nom} en direct ? (obligatoire)` : `Pourquoi remettre ${c.nom} dans le cycle ? (obligatoire)`, "")?.trim();
    if (!motif) return;
    if (source === "reelle") {
      setOccupe(true);
      try {
        await portes.changerStatut(c.id, statut, motif);
        await relireCompte(c.id);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Le statut n'a pas pu être changé.");
      } finally {
        setOccupe(false);
      }
      return;
    }
    setExemple((prev) => {
      const suivant = structuredClone(prev);
      const t = suivant.tableau;
      const f = suivant.fiches[c.id];
      for (const x of [f?.compte, t.comptes.find((y) => y.id === c.id)]) if (x) Object.assign(x, { statut, statut_motif: motif });
      const r = f?.reprises.find((x) => EN_COURS.includes(x.statut));
      if (statut === "exclu" && r) Object.assign(r, { statut: "close", issue: "reprise_en_main", motif });
      if (statut === "exclu") for (const x of t.comptes) if (x.id === c.id && x.reprise && EN_COURS.includes(x.reprise.statut)) x.reprise = { ...x.reprise, statut: "close", issue: "reprise_en_main", motif };
      t.a_valider = t.a_valider.filter((v) => v.compte_id !== c.id || statut !== "exclu");
      t.compteurs.a_valider = t.a_valider.length;
      return suivant;
    });
  };

  const lancerRecalcul = async () => {
    if (source !== "reelle" || !tableau?.client || occupe) return;
    setOccupe(true);
    try {
      await portes.recalculer(tableau.client);
      await relire();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Le calcul a échoué.");
    } finally {
      setOccupe(false);
    }
  };

  const vide = (texte: string) => (
    <div className="lin">
      <header className="lin-tete">
        <span className="lin-tete-titre">Comptes à risque</span>
      </header>
      <p className="lin-vide">{texte}</p>
    </div>
  );
  if (erreur) return vide(`La base réelle n'a pas répondu : ${erreur}`);
  if (source === "reelle" && !reel) return vide("Lecture des comptes…");
  if (!tableau || !tableau.reglages) return vide("OFFLOAD n'est pas encore installé pour votre organisation : Omega l'installe en mode essai, puis vos exports de ventes alimentent l'historique.");

  const aValider = tableau.a_valider;
  const reglages = tableau.reglages;
  const listeComptes = `${RACINE}/offload?vue=comptes`;
  const lienCompte = (id: string) => `${RACINE}/offload?compte=${encodeURIComponent(id)}`;

  /* ——— les filtres : la portée de la page ———
     Le mode d'un compte est celui de sa reprise : le message qui attend, sinon le premier envoi. */
  const modeDe = (c: Compte) => aValider.find((v) => v.compte_id === c.id)?.mode ?? c.reprise?.envoi1?.mode ?? null;
  const correspond = (c: Compte, f: Filtres) =>
    (!f.niveau || santeDe(c) === f.niveau) &&
    (!f.etape || c.reprise?.statut === f.etape) &&
    (!f.silence || trancheCle(c) === f.silence) &&
    (!f.commercial || (c.commercial ?? SANS_COMMERCIAL) === f.commercial) &&
    (!f.cloture || !!c.signal?.avant_cloture) &&
    (!f.mode || modeDe(c) === f.mode);
  const sans = (d: Dimension): Filtres => {
    const n = { ...actifs };
    delete n[d];
    return n;
  };
  const avec = (d: Dimension, v: string): Filtres => (actifs[d] === v ? sans(d) : { ...actifs, [d]: v });
  /* l'adresse de la page avec ces filtres : le tableau de bord, ou la liste (son onglet de niveau gardé) */
  const adresse = (f: Filtres, liste = vue === "comptes", sante: Sante | "tous" = onglet) => {
    const p = [...(liste ? ["vue=comptes", ...(sante === "tous" ? [] : [`sante=${sante}`])] : []), ...DIMENSIONS.filter((d) => f[d]).map((d) => `filtre=${d}:${encodeURIComponent(f[d] ?? "")}`)];
    return `${RACINE}/offload${p.length ? `?${p.join("&")}` : ""}`;
  };
  /* combien de comptes ce choix laisserait, les autres filtres gardés */
  const nbAvec = (d: Dimension, v: string) => comptes.filter((c) => correspond(c, { ...sans(d), [d]: v })).length;
  const optionFiltre = (d: Dimension, v: string, plus: Partial<Option> = {}): Option => ({
    cle: `${d}-${v}`,
    libelle: libelleFiltre(d, v),
    meta: pluriel(nbAvec(d, v), "compte"),
    icone: <IconeFiltre d={d} v={v} />,
    coche: actifs[d] === v,
    href: adresse(avec(d, v)),
    ...plus,
  });
  const filtresNiveau = (): Option[] => (Object.keys(SANTES) as Sante[]).filter((s) => nbAvec("niveau", s) > 0 || actifs.niveau === s).map((s) => optionFiltre("niveau", s));
  const filtresEtape = (etapes: StatutReprise[] = ETAPES): Option[] => etapes.map((e) => optionFiltre("etape", e));
  const filtresSilence = (): Option[] => SILENCES.map((t) => optionFiltre("silence", t.cle, { libelle: t.libelle }));
  const filtresCommercial = (): Option[] =>
    [...new Set(comptes.map((c) => c.commercial ?? SANS_COMMERCIAL))].sort((a, b) => (a === SANS_COMMERCIAL ? 1 : b === SANS_COMMERCIAL ? -1 : a.localeCompare(b, "fr"))).map((m) => optionFiltre("commercial", m));
  const filtresMode = (): Option[] =>
    Object.keys(MODES)
      .filter((m) => nbAvec("mode", m) > 0 || actifs.mode === m || reglages.mode === m)
      .map((m) => optionFiltre("mode", m));
  /* chaque filtre actif, en pastille « ✕ » après les onglets : la cliquer le retire */
  const pastillesFiltres = DIMENSIONS.filter((d) => actifs[d]).map((d) => (
    <Link key={d} href={adresse(sans(d))} className="v2-btn v2-btn--petit lin-filtre-actif" data-actif="" title="Retirer ce filtre" scroll={false}>
      <IconeFiltre d={d} v={actifs[d] ?? ""} />
      {libelleFiltre(d, actifs[d] ?? "")} ✕
    </Link>
  ));
  const portee = nbActifs ? comptes.filter((c) => correspond(c, actifs)) : comptes;
  const dansPortee = new Set(portee.map((c) => c.id));

  const enJeu = portee.filter(aRisque).sort((a, b) => valeurDe(b) - valeurDe(a));
  const valeurEnJeu = somme(enJeu.map(valeurDe));
  const parSante = (s: Sante) => comptes.filter((c) => santeDe(c) === s).length;
  const optionsNiveaux = (coche?: Sante): Option[] =>
    (Object.keys(SANTES) as Sante[])
      .filter((s) => parSante(s) > 0 || s === coche)
      .map((s) => ({
        cle: s,
        libelle: SANTES[s].libelle,
        meta: pluriel(parSante(s), "compte"),
        icone: <IconeStatut sante={s} />,
        coche: s === coche,
        href: `${RACINE}/offload?vue=comptes&sante=${s}`,
      }));
  /* le suivi d'un compte : le seul choix qui écrit (offload_changer_statut, motif obligatoire) ;
     un compte retiré à sa demande ne se remet pas dans le cycle d'ici */
  const optionsSuivi = (c: Compte): Option[] =>
    c.statut === "arrete"
      ? [{ cle: "arrete", libelle: STATUTS_COMPTE.arrete, meta: "ne reçoit plus rien", icone: <UserMinus width={16} height={16} />, coche: true }]
      : (["suivi", "exclu"] as const).map((x) => ({
          cle: x,
          libelle: STATUTS_COMPTE[x],
          meta: x === "suivi" ? "dans le cycle" : "par le commercial",
          icone: x === "suivi" ? <Losange atteint /> : <UserRound width={16} height={16} />,
          coche: c.statut === x,
          action: () => void changerSuivi(c, x),
        }));
  const etapesDe = (s: StatutReprise) => portee.filter((c) => c.reprise?.statut === s);

  /* ——— un compte ouvert : la page d'un projet ——— */
  if (compteOuvert) {
    const c = comptes.find((x) => x.id === compteOuvert);
    if (!c) return vide("Ce compte n'est pas dans la liste d'OFFLOAD.");
    if (!fiche) return vide(erreurFiche ?? "Lecture de la fiche…");
    const s = santeDe(c);
    const sig = fiche.signal ?? c.signal;
    const enCours = fiche.reprises.find((r) => EN_COURS.includes(r.statut)) ?? null;
    const derniere = enCours ?? fiche.reprises[0] ?? null;
    const message: AValider | null = aValider.find((v) => v.compte_id === c.id) ?? null;
    const peutPreparer = !enCours && c.statut === "suivi";
    const raisons = sig?.raisons ?? [];
    /* une section de l'aperçu : on y revient d'abord si un autre onglet est ouvert */
    const allerA = (id: string) => () => {
      setOngletFiche("apercu");
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    };
    const allerRaisons = allerA("offload-raisons");
    const dateReprise = (r: Reprise) => r.close_le ?? r.repondu_le ?? r.envoye2_le ?? r.envoye1_le ?? r.cree_le;
    const reprises = fiche.reprises.slice().sort((x, y) => dateReprise(y).localeCompare(dateReprise(x)));
    const activite = [
      ...fiche.reprises.flatMap((r) =>
        (
          [
            [r.cree_le, "reprise préparée"],
            [r.envoye1_le, "message parti"],
            [r.envoye2_le, "relance partie"],
            [r.repondu_le, "le client a répondu"],
            [r.close_le, r.issue ? `close : ${ISSUES[r.issue] ?? r.issue}` : "reprise close"],
          ] as [string | null, string][]
        )
          .filter((x): x is [string, string] => !!x[0])
          .map(([le, quoi]) => ({ cle: `${r.id}-${quoi}`, le, quoi, fait: true })),
      ),
      ...fiche.taches.map((t) => ({
        cle: t.id,
        le: t.faite_le ?? t.echeance,
        quoi: t.statut === "a_faire" ? `${t.titre}, à faire` : `${t.titre} : ${t.statut === "faite" ? "fait" : "abandonné"}`,
        fait: t.statut !== "a_faire",
      })),
    ].sort((x, y) => y.le.localeCompare(x.le));
    const commercial = c.commercial;
    const duCommercial = commercial ? comptes.filter((x) => x.commercial === commercial) : [];
    const etapesReprise = derniere
      ? [
          { cle: "preparee", libelle: "Message préparé", le: derniere.cree_le },
          { cle: "parti", libelle: "Message parti", le: derniere.envoye1_le },
          { cle: "relance", libelle: "Relance partie", le: derniere.envoye2_le },
          { cle: "reponse", libelle: "Réponse", le: derniere.repondu_le },
          { cle: "close", libelle: "Reprise close", le: derniere.close_le },
        ]
      : [];
    /* le dernier achat et la valeur annuelle ouvrent ce qui les explique sur cette page : ses pièces, son rythme */
    const optionPieces: Option = { cle: "pieces", libelle: "Pièces du compte", meta: pluriel(fiche.nb_achats, "pièce"), icone: <IconeDocument />, action: () => setOngletFiche("pieces") };
    const optionRythme: Option = {
      cle: "rythme",
      libelle: "Son rythme",
      meta: sig?.rythme_jours ? `tous les ${Math.round(sig.rythme_jours)} j` : undefined,
      icone: <IconeCalendrier />,
      action: allerA("offload-rythme"),
    };
    const optionsDernierAchat: Option[] = [optionPieces, optionRythme];
    const optionsScore: Option[] = raisons.length
      ? raisons.map((r) => ({ cle: r.code, libelle: r.phrase, meta: r.points ? `+${r.points}` : "—", icone: <IconePriorite niveau={prioDe(r.points)} titre={`${r.points} points`} />, action: allerRaisons }))
      : [{ cle: "aucune", libelle: "Aucune raison relevée", icone: <IconePriorite niveau={0} titre="Aucune raison" />, action: allerRaisons }];
    return (
      <div className="lin">
        <header className="lin-tete">
          <nav className="lin-fil" aria-label="Fil d'Ariane">
            <Link href={listeComptes} className="lin-fil-equipe">
              Comptes
            </Link>
            <span className="lin-fil-sep" aria-hidden="true">
              ›
            </span>
            <span className="lin-fil-ici lin-fil-projet" aria-current="page">
              <IconeCompte c={c} />
              {c.nom}
            </span>
          </nav>
          <div className="lin-tete-droite">
            <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Copier la référence" title="Copier la référence" onClick={() => navigator.clipboard?.writeText(c.ref)}>
              <Copy width={14} height={14} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues du compte">
            {(
              [
                ["apercu", "Aperçu"],
                ["reprises", "Reprises"],
                ["pieces", "Pièces"],
              ] as const
            ).map(([cle, lib]) => (
              <button key={cle} type="button" className="v2-btn v2-btn--petit" data-actif={ongletFiche === cle ? "" : undefined} aria-pressed={ongletFiche === cle} onClick={() => setOngletFiche(cle)}>
                {lib}
              </button>
            ))}
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            {ongletFiche === "apercu" ? (
              <>
                <IconeCompte c={c} grand />
                <h1 className="lin-projet-h1">{c.nom}</h1>
                <p className="lin-projet-resume">
                  {sig ? `${SANTES[s].libelle} : ${NIVEAUX[sig.niveau].sous}.` : "Pas encore évalué : la détection ne l'a pas encore calculé."}
                  {sig?.valeur_annuelle ? ` Il pèse ${montant(sig.valeur_annuelle)} par an à son rythme habituel.` : ""}
                  {sig?.avant_cloture && sig.cloture_le ? ` À joindre avant la clôture du ${dateCourte(sig.cloture_le)}.` : ""}
                </p>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Propriétés</span>
                  <MenuOptions
                    raccourci="s"
                    titre="Comptes à ce niveau…"
                    teinte={SANTES[s].teinte}
                    declencheur={
                      <>
                        <IconeStatut sante={s} />
                        {SANTES[s].libelle}
                      </>
                    }
                    options={optionsNiveaux(s)}
                    largeur={280}
                  />
                  <MenuOptions
                    raccourci="r"
                    titre="Pourquoi il est signalé…"
                    declencheur={
                      <>
                        <IconePriorite niveau={prioDe(sig?.score ?? 0)} titre={scoreDe(c)} />
                        {scoreDe(c)}
                      </>
                    }
                    options={optionsScore}
                    largeur={420}
                  />
                  <MenuOptions
                    raccourci="e"
                    titre="Dernier achat…"
                    declencheur={
                      <>
                        <IconeCalendrier passe={aRisque(c)} />
                        {sig?.dernier_achat ? `Dernier achat le ${dateCourte(sig.dernier_achat)}` : "Aucun achat daté"}
                      </>
                    }
                    options={optionsDernierAchat}
                  />
                  {commercial ? (
                    <MenuOptions
                      titre={`Comptes de ${commercial}…`}
                      declencheur={
                        <>
                          <UserRound width={16} height={16} aria-hidden="true" />
                          {commercial}
                        </>
                      }
                      options={duCommercial.map((x) => ({ cle: x.id, libelle: x.nom, meta: SANTES[santeDe(x)].libelle, icone: <IconeCompte c={x} />, coche: x.id === c.id, href: lienCompte(x.id) }))}
                      largeur={300}
                    />
                  ) : null}
                </div>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Contact</span>
                  {c.email ? (
                    <MenuOptions
                      titre="Contact…"
                      declencheur={
                        <>
                          <IconeEnveloppe />
                          {c.email}
                        </>
                      }
                      options={[
                        { cle: "ecrire", libelle: "Écrire un e-mail", icone: <IconeEnveloppe />, action: () => window.open(`mailto:${c.email}`) },
                        { cle: "copier", libelle: "Copier l'adresse", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.email ?? "") },
                      ]}
                    />
                  ) : null}
                  {c.telephone ? (
                    <MenuOptions
                      titre="Téléphone…"
                      declencheur={
                        <>
                          <PhoneCall width={16} height={16} aria-hidden="true" />
                          {c.telephone}
                        </>
                      }
                      options={[
                        { cle: "appeler", libelle: "Appeler", icone: <PhoneCall width={16} height={16} />, action: () => window.open(`tel:${(c.telephone ?? "").replace(/\s/g, "")}`) },
                        { cle: "copier", libelle: "Copier le numéro", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.telephone ?? "") },
                      ]}
                    />
                  ) : null}
                  {!c.email && !c.telephone ? <span className="lin-puce lin-puce--vide">Aucun moyen de le joindre</span> : null}
                </div>
                <div className="lin-projet-ligne">
                  <span className="lin-projet-etiquette">Suivi</span>
                  <MenuOptions
                    titre="Qui le suit…"
                    declencheur={
                      <>
                        {c.statut === "suivi" ? <Losange atteint /> : <UserRound width={16} height={16} aria-hidden="true" />}
                        {STATUTS_COMPTE[c.statut]}
                      </>
                    }
                    options={optionsSuivi(c)}
                    largeur={300}
                  />
                </div>

                <details className="lin-maj" open aria-label="Reprise de contact">
                  <summary className="lin-maj-tete">
                    <span className="lin-maj-titre">
                      Reprise de contact
                      <ChevronMaj />
                    </span>
                    <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                      <ExternalLink width={14} height={14} aria-hidden="true" /> Décisions
                    </Link>
                  </summary>
                  {derniere ? (
                    <>
                      <p className="lin-maj-auteur">
                        <IconeSante sante={s} />
                        <span data-teinte={teinteReprise(derniere.statut)}>{STATUTS_REPRISE[derniere.statut].libelle}</span>
                        <Avatar />
                        <span className="lin-maj-gris">{derniere.ouverte_par === "detection" ? "OFFLOAD" : "à la main"}</span>
                        <span className="lin-maj-gris">{dateCourte(derniere.cree_le)}</span>
                      </p>
                      <p className="lin-maj-texte">{message?.sujet ?? derniere.envoi1?.sujet ?? derniere.motif ?? "Reprise de contact préparée à partir de son historique d'achats."}</p>
                      <dl className="lin-maj-citation">
                        {message?.destinataire ? (
                          <div>
                            <dt>Destinataire</dt>
                            <dd>{message.destinataire}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Message</dt>
                          <dd>{message ? (message.rang === 2 ? "relance" : "premier message") : derniere.envoye2_le ? "relance partie" : derniere.envoye1_le ? "premier message parti" : "pas encore parti"}</dd>
                        </div>
                        <div>
                          <dt>Mode</dt>
                          <dd>{(message?.mode ?? derniere.envoi1?.mode ?? reglages.mode) === "essai" ? "essai : rien ne part chez le client" : "réel"}</dd>
                        </div>
                        {derniere.issue ? (
                          <div>
                            <dt>Issue</dt>
                            <dd>{ISSUES[derniere.issue] ?? derniere.issue}</dd>
                          </div>
                        ) : null}
                      </dl>
                      {message?.corps ? <p className="lin-offload-message">{message.corps}</p> : null}
                    </>
                  ) : (
                    <p className="lin-maj-texte lin-maj-gris">
                      {c.statut === "suivi"
                        ? "Aucune reprise pour ce compte. Préparée, elle attend votre validation avant de partir ; une tâche d'appel est posée pour le commercial."
                        : `${c.statut_motif ?? STATUTS_COMPTE[c.statut]} : aucune reprise.`}
                    </p>
                  )}
                  <footer className="lin-maj-pied">
                    <button type="button" className="lin-maj-pied-btn" aria-label="Voir les reprises" title="Voir les reprises" onClick={() => setOngletFiche("reprises")}>
                      <MessageSquare width={16} height={16} aria-hidden="true" />
                    </button>
                    {peutPreparer ? (
                      <button type="button" className="lin-maj-pied-rond" aria-label="Préparer une reprise" title="Préparer une reprise" disabled={occupe} onClick={() => void preparerReprise(c)}>
                        <Send width={16} height={16} aria-hidden="true" />
                      </button>
                    ) : (
                      <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                        <CheckCheck width={16} height={16} aria-hidden="true" />
                      </Link>
                    )}
                  </footer>
                </details>

                <h2 className="lin-projet-h2" id="offload-raisons">
                  Pourquoi il est signalé{sig ? ` — score ${sig.score} sur 100, la somme des points` : ""}
                </h2>
                {raisons.length ? (
                  <ul className="lin-projet-liste">
                    {raisons.map((r) => (
                      <li key={r.code} className="lin-offload-raison">
                        <IconePriorite niveau={prioDe(r.points)} titre={`${r.points} points`} />
                        <span>{r.phrase}</span>
                        <span className="lin-meta">{r.points ? `+${r.points}` : "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Rien à signaler : il achète à son rythme.</p>
                )}

                <h2 className="lin-projet-h2" id="offload-rythme">
                  Son rythme
                </h2>
                <ul className="lin-projet-liste">
                  <li>
                    <span>Rythme habituel</span>
                    <span className="lin-meta">{sig?.rythme_jours ? `un achat tous les ${Math.round(sig.rythme_jours)} jours` : "pas assez d'achats"}</span>
                  </li>
                  <li>
                    <span>Dernier achat</span>
                    <span className="lin-meta">{sig?.dernier_achat ? `${dateCourte(sig.dernier_achat)} · ${silenceDe(sig.jours_silence)}` : "—"}</span>
                  </li>
                  <li>
                    <span>Achat attendu</span>
                    <span className="lin-meta">{dateCourte(sig?.attendu_le)}</span>
                  </li>
                  <li>
                    <span>Panier moyen</span>
                    <span className="lin-meta">{montant(sig?.panier_moyen)}</span>
                  </li>
                  <li>
                    <span>Douze derniers mois</span>
                    <span className="lin-meta">
                      {montant(sig?.ca_12m)}
                      {sig?.ca_12m_precedent ? ` · avant : ${montant(sig.ca_12m_precedent)}` : ""}
                    </span>
                  </li>
                  <li>
                    <span>Priorité (valeur × score)</span>
                    <span className="lin-meta">{sig?.priorite ? montant(sig.priorite) : "—"}</span>
                  </li>
                </ul>

                <h2 className="lin-projet-h2">Tâches</h2>
                {fiche.taches.length ? (
                  <ul className="lin-projet-liste">
                    {fiche.taches.map((t) => (
                      <li key={t.id}>
                        <Losange atteint={t.statut !== "a_faire"} />
                        <span>{t.titre}</span>
                        <span className="lin-meta">
                          {t.statut === "a_faire" ? `avant le ${dateCourte(t.echeance)}` : `${t.statut === "faite" ? "faite" : "abandonnée"} le ${dateCourte(t.faite_le)}`}
                          {t.commercial ? ` · ${t.commercial}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Aucune tâche sur ce compte.</p>
                )}
              </>
            ) : ongletFiche === "reprises" ? (
              <>
                <h1 className="lin-projet-h1" style={{ marginTop: 0 }}>
                  Reprises
                </h1>
                {reprises.length ? (
                  <ul className="lin-projet-liste">
                    {reprises.map((r) => (
                      <li key={r.id}>
                        <Losange atteint={r.statut !== "a_valider" && r.statut !== "relance_a_valider"} />
                        <span>
                          {STATUTS_REPRISE[r.statut].libelle}
                          {r.issue ? ` : ${ISSUES[r.issue] ?? r.issue}` : ""}
                        </span>
                        <span className="lin-meta">
                          {r.ouverte_par === "detection" ? "détection" : "à la main"} · {dateCourte(r.cree_le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Aucune reprise pour ce compte.</p>
                )}
                {message ? (
                  <>
                    <h2 className="lin-projet-h2">Message à valider</h2>
                    <p className="lin-offload-message-tete">
                      {message.sujet ?? "—"}
                      {message.destinataire ? ` · à ${message.destinataire}` : ""}
                    </p>
                    {message.corps ? <p className="lin-offload-message">{message.corps}</p> : null}
                    <Link href={`${RACINE}/validations`} className="lin-voir-tout">
                      Lire et valider dans Décisions <ArrowRight width={14} height={14} aria-hidden="true" />
                    </Link>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <h1 className="lin-projet-h1" style={{ marginTop: 0 }}>
                  Pièces
                </h1>
                {fiche.achats.length ? (
                  <ul className="lin-projet-liste">
                    {fiche.achats.map((a) => (
                      <li key={a.id} style={a.annule_le ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
                        <IconeDocument />
                        <span>
                          {a.reference ?? "Sans numéro"}
                          {a.libelle ? ` · ${a.libelle}` : ""}
                          {a.nature !== "facture" ? ` · ${a.nature}` : ""}
                        </span>
                        <span className="lin-meta">
                          {montant(a.montant_ht)} · {dateCourte(a.date_achat)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Aucune pièce : importez l&apos;export de votre logiciel de ventes.</p>
                )}
              </>
            )}
          </article>

          <aside className="lin-cartes-droite" aria-label="Propriétés du compte">
            <CarteDroite titre="Propriétés">
              <dl className="lin-props">
                <div>
                  <dt>Niveau</dt>
                  <dd data-teinte={SANTES[s].teinte}>
                    <MenuOptions
                      plat
                      titre="Comptes à ce niveau…"
                      declencheur={
                        <>
                          <IconeStatut sante={s} />
                          {SANTES[s].libelle}
                        </>
                      }
                      options={optionsNiveaux(s)}
                      largeur={280}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Score</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Pourquoi il est signalé…"
                      declencheur={
                        <>
                          <IconePriorite niveau={prioDe(sig?.score ?? 0)} titre={scoreDe(c)} />
                          {sig ? `${sig.score} sur 100` : "—"}
                        </>
                      }
                      options={optionsScore}
                      largeur={420}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Dernier achat</dt>
                  <dd className={sig?.dernier_achat ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Dernier achat…"
                      declencheur={
                        <>
                          <IconeCalendrier passe={aRisque(c)} />
                          {sig?.dernier_achat ? dateCourte(sig.dernier_achat) : "Aucun"}
                        </>
                      }
                      options={optionsDernierAchat}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Valeur annuelle</dt>
                  <dd className={sig?.valeur_annuelle ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Valeur annuelle…"
                      declencheur={
                        <>
                          <IconeJauge />
                          {sig?.valeur_annuelle ? montant(sig.valeur_annuelle) : "Inconnue"}
                        </>
                      }
                      options={[optionRythme, optionPieces]}
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
                          {c.ref}
                        </>
                      }
                      options={[{ cle: "copier", libelle: "Copier la référence", icone: <Copy width={16} height={16} />, action: () => navigator.clipboard?.writeText(c.ref) }]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Commercial</dt>
                  <dd className={commercial ? undefined : "lin-props-vide"}>
                    {commercial ? (
                      <MenuOptions
                        plat
                        titre={`Comptes de ${commercial}…`}
                        declencheur={
                          <>
                            <UserRound width={16} height={16} aria-hidden="true" />
                            {commercial}
                          </>
                        }
                        options={duCommercial.map((x) => ({ cle: x.id, libelle: x.nom, meta: SANTES[santeDe(x)].libelle, icone: <IconeCompte c={x} />, coche: x.id === c.id, href: lienCompte(x.id) }))}
                        largeur={300}
                      />
                    ) : (
                      <span className="lin-valeur">
                        <UserRound width={16} height={16} aria-hidden="true" />
                        Sans commercial
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Groupe</dt>
                  <dd className={c.groupe ? undefined : "lin-props-vide"}>
                    {c.groupe ? (
                      <MenuOptions
                        plat
                        titre="Comptes du groupe…"
                        declencheur={
                          <>
                            <IconeGroupe />
                            {c.groupe}
                          </>
                        }
                        options={comptes
                          .filter((x) => x.groupe === c.groupe)
                          .map((x): Option => ({ cle: x.id, libelle: x.nom, meta: SANTES[santeDe(x)].libelle, icone: <IconeCompte c={x} />, coche: x.id === c.id, href: lienCompte(x.id) }))}
                      />
                    ) : (
                      <span className="lin-valeur">
                        <IconeGroupe />
                        Aucun groupe
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Ville</dt>
                  <dd className={c.ville ? undefined : "lin-props-vide"}>
                    <MenuOptions
                      plat
                      titre="Comptes de la ville…"
                      declencheur={
                        <>
                          <MapPin width={16} height={16} aria-hidden="true" />
                          {c.ville ?? "Inconnue"}
                        </>
                      }
                      options={(c.ville ? comptes.filter((x) => x.ville === c.ville) : [c]).map((x) => ({
                        cle: x.id,
                        libelle: x.nom,
                        meta: SANTES[santeDe(x)].libelle,
                        icone: <IconeCompte c={x} />,
                        coche: x.id === c.id,
                        href: lienCompte(x.id),
                      }))}
                      largeur={300}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Suivi</dt>
                  <dd>
                    <MenuOptions
                      plat
                      titre="Qui le suit…"
                      declencheur={
                        <>
                          <ShieldCheck width={16} height={16} aria-hidden="true" />
                          {STATUTS_COMPTE[c.statut]}
                        </>
                      }
                      options={optionsSuivi(c)}
                      largeur={300}
                    />
                  </dd>
                </div>
              </dl>
            </CarteDroite>

            <CarteDroite titre="Reprise">
              {derniere ? (
                <ul className="lin-jalons">
                  {etapesReprise.map((e) => (
                    <li key={e.cle}>
                      <Losange atteint={!!e.le} />
                      <span className="lin-jalon-nom">{e.libelle}</span>
                      <span className="lin-meta">{e.le ? dateCourte(e.le) : "—"}</span>
                      <MenuActions
                        titre={`${e.libelle}…`}
                        options={[
                          { cle: "reprises", libelle: "Voir les reprises", icone: <MessageSquare width={16} height={16} />, action: () => setOngletFiche("reprises") },
                          ...(peutPreparer ? [{ cle: "preparer", libelle: "Préparer une nouvelle reprise", icone: <Send width={16} height={16} />, action: () => void preparerReprise(c) }] : []),
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">{peutPreparer ? "Aucune reprise : le bouton d'envoi de « Reprise de contact » en prépare une." : "Aucune reprise pour ce compte."}</p>
              )}
            </CarteDroite>

            <CarteAchats fiche={fiche} />

            <CarteDroite
              titre="Activité"
              action={
                <button type="button" className="lin-carte-lien" onClick={() => setOngletFiche("reprises")}>
                  Tout voir
                </button>
              }
            >
              {activite.length ? (
                <ul className="lin-activite">
                  {activite.slice(0, 4).map((x) => (
                    <li key={x.cle}>
                      <Losange atteint={x.fait} />
                      <span>
                        {x.quoi} · {dateCourte(x.le)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lin-activite-vide">Aucune reprise ni tâche pour l&apos;instant.</p>
              )}
            </CarteDroite>
          </aside>
        </div>
      </div>
    );
  }

  /* ——— le tableau de bord : la page d'un projet, OFFLOAD étant le projet ———
     Les mêmes briques que le tableau de bord de CASHD (titre, propriétés,
     « Latest update », sections, cartes de droite). */
  if (vue !== "comptes") {
    /* tout se lit dans la portée (les comptes que laissent les filtres) : la phrase, les pastilles,
       « À valider aujourd'hui », les barres, la liste, et chaque carte de droite */
    const aValiderP = nbActifs ? aValider.filter((v) => dansPortee.has(v.compte_id)) : aValider;
    const pire = (["eteint", "decroche", "saison", "ralentit"] as const).find((n) => enJeu.some((c) => c.signal?.niveau === n)) ?? "ok";
    const plusAncien = enJeu
      .filter((c) => c.signal?.dernier_achat)
      .slice()
      .sort((a, b) => (a.signal?.dernier_achat ?? "").localeCompare(b.signal?.dernier_achat ?? ""));
    const derniereAnalyse =
      portee
        .map((c) => c.signal?.jour)
        .filter((x): x is string => !!x)
        .sort()
        .reverse()[0] ?? null;
    const avantCloture = portee.filter((c) => c.signal?.avant_cloture);
    const niveauFiltre = actifs.niveau as Sante | undefined;
    const parNiveau = (niveauFiltre ? [niveauFiltre] : (A_RISQUE as Sante[])).map((n) => {
      const l = (A_RISQUE.includes(n as Niveau) ? enJeu : portee).filter((c) => santeDe(c) === n);
      return { n, nb: l.length, valeur: somme(l.map(valeurDe)) };
    });
    const maxNiveau = Math.max(1, ...parNiveau.map((x) => x.valeur));
    const citation = aValiderP.length
      ? aValiderP.slice(0, 5).map((v) => {
          const c = comptes.find((x) => x.id === v.compte_id);
          return { cle: v.reprise, nom: v.compte_nom, texte: (c && raisonDe(c)?.phrase) ?? v.sujet ?? (v.rang === 2 ? "relance" : "premier message") };
        })
      : enJeu.slice(0, 3).map((c) => ({ cle: c.id, nom: c.nom, texte: raisonDe(c)?.phrase ?? SANTES[santeDe(c)].libelle }));
    const appels = tableau.taches.filter((t) => t.type === "appel" && t.statut === "a_faire" && dansPortee.has(t.compte_id));
    const reponses = tableau.taches.filter((t) => t.type === "repondre" && t.statut === "a_faire" && dansPortee.has(t.compte_id));
    /* sans filtre, les compteurs de la base ; avec, ceux de la portée */
    const k = nbActifs ? { comptes: portee.length, avant_cloture: avantCloture.length, a_valider: aValiderP.length, appels: appels.length, reponses: reponses.length } : tableau.compteurs;
    const commerciaux = new Set(portee.map((c) => c.commercial).filter((m): m is string => !!m));
    const recentes = portee
      .filter((c) => c.reprise)
      .map((c) => {
        const r = c.reprise as Reprise;
        const [le, quoi] = r.close_le
          ? [r.close_le, r.issue ? (ISSUES[r.issue] ?? r.issue) : "reprise close"]
          : r.repondu_le
            ? [r.repondu_le, "a répondu"]
            : r.envoye2_le
              ? [r.envoye2_le, "relance partie"]
              : r.envoye1_le
                ? [r.envoye1_le, "message parti"]
                : [r.cree_le, "reprise préparée"];
        return { cle: r.id, nom: c.nom, le, quoi, fait: !EN_COURS.includes(r.statut) || !!r.envoye1_le };
      })
      .sort((x, y) => y.le.localeCompare(x.le))
      .slice(0, 3);
    const peutRecalculer = source === "reelle" && !!tableau.client;
    const rien = nbActifs > 0 && portee.length === 0;
    return (
      <div className="lin">
        <h1 className="v2-sr">Comptes à risque</h1>
        <header className="lin-tete">
          <span className="lin-tete-titre">Tableau de bord</span>
          <div className="lin-tete-droite">
            {source === "reelle" && tableau.client ? (
              <button type="button" className="v2-btn v2-btn--petit" disabled={occupe} onClick={() => void lancerRecalcul()}>
                <RefreshCw width={14} height={14} aria-hidden="true" />
                <span>Recalculer</span>
              </button>
            ) : null}
          </div>
        </header>
        <div className="lin-outils">
          <nav className="lin-onglets" aria-label="Vues d'OFFLOAD">
            <span className="v2-btn v2-btn--petit" data-actif="" aria-current="page">
              Aperçu
            </span>
            <Link href={listeComptes} className="v2-btn v2-btn--petit">
              Comptes
            </Link>
            <Link href={`${RACINE}/offload?filtre=etape:a_valider`} className="v2-btn v2-btn--petit" scroll={false}>
              À valider
            </Link>
            {pastillesFiltres}
          </nav>
        </div>

        <div className="lin-projet">
          <article className="lin-projet-texte">
            <span
              className="lin-tuile"
              style={{
                background: `color-mix(in srgb, ${COULEUR_OFFLOAD} 18%, transparent)`,
                color: COULEUR_OFFLOAD,
              }}
            >
              <UserMinus width={24} height={24} strokeWidth={1.6} aria-hidden="true" />
            </span>
            <h2 className="lin-projet-h1">Comptes à risque</h2>
            <p className="lin-projet-resume">
              {rien
                ? "Aucun compte ne correspond à ces filtres."
                : enJeu.length
                  ? `${pluriel(enJeu.length, "client")} ${enJeu.length > 1 ? "décrochent" : "décroche"} : ${montant(valeurEnJeu)} de chiffre annuel en jeu.${avantCloture.length ? ` ${avantCloture.length} à joindre avant la clôture.` : ""}`
                  : nbActifs
                    ? `${pluriel(portee.length, "compte")} dans ce filtre : aucun ne décroche.`
                    : comptes.length
                      ? "Vos clients suivis achètent à leur rythme : aucun ne décroche."
                      : "L'historique est vide : importez l'export de votre logiciel de ventes (code client, date, montant HT)."}
            </p>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Propriétés</span>
              <MenuOptions
                raccourci="s"
                titre="Filtrer par niveau…"
                teinte={SANTES[niveauFiltre ?? pire].teinte}
                declencheur={
                  <>
                    <IconeStatut sante={niveauFiltre ?? pire} />
                    {niveauFiltre ? SANTES[niveauFiltre].libelle : enJeu.length ? `${enJeu.length} à risque` : SANTES.ok.libelle}
                  </>
                }
                options={filtresNiveau()}
                largeur={280}
              />
              <MenuOptions
                raccourci="v"
                titre="Filtrer par étape de la reprise…"
                declencheur={
                  <>
                    <Losange atteint={aValiderP.length > 0} />
                    {actifs.etape ? libelleFiltre("etape", actifs.etape) : `${aValiderP.length} à valider`}
                  </>
                }
                options={filtresEtape()}
                largeur={340}
              />
              <MenuOptions
                raccourci="e"
                titre="Filtrer par silence…"
                declencheur={
                  <>
                    <IconeCalendrier passe={plusAncien.length > 0} />
                    {plusAncien.length ? `Silence depuis le ${dateCourte(plusAncien[0].signal?.dernier_achat)}` : "Aucun silence"}
                  </>
                }
                options={filtresSilence()}
                largeur={320}
              />
            </div>
            <div className="lin-projet-ligne">
              <span className="lin-projet-etiquette">Analyse</span>
              {peutRecalculer ? (
                <MenuOptions
                  raccourci="d"
                  titre="Détection…"
                  declencheur={
                    <>
                      <RefreshCw width={16} height={16} aria-hidden="true" />
                      {derniereAnalyse ? `Analysé le ${dateCourte(derniereAnalyse)}` : "Pas encore analysé"}
                    </>
                  }
                  options={[{ cle: "recalculer", libelle: "Recalculer maintenant", icone: <RefreshCw width={16} height={16} />, action: () => void lancerRecalcul() }]}
                />
              ) : (
                <span className="lin-puce">
                  <RefreshCw width={16} height={16} aria-hidden="true" />
                  {derniereAnalyse ? `Analysé le ${dateCourte(derniereAnalyse)}` : "Pas encore analysé"}
                </span>
              )}
              <MenuOptions
                titre="Filtrer par mode…"
                teinte={(actifs.mode ?? reglages.mode) === "essai" ? "jaune" : undefined}
                declencheur={
                  <>
                    <ShieldCheck width={16} height={16} aria-hidden="true" />
                    {actifs.mode ? libelleFiltre("mode", actifs.mode) : MODES[reglages.mode]}
                  </>
                }
                options={filtresMode()}
              />
            </div>

            {rien ? (
              <p className="lin-vide">Aucun compte ne correspond à ces filtres : retirez-en un pour revoir les chiffres.</p>
            ) : (
              <>
                <details className="lin-maj" open aria-label="À valider aujourd'hui">
                  <summary className="lin-maj-tete">
                    <span className="lin-maj-titre">
                      À valider aujourd&apos;hui
                      <ChevronMaj />
                    </span>
                    <Link href={`${RACINE}/validations`} className="lin-maj-lien">
                      <ExternalLink width={14} height={14} aria-hidden="true" /> Valider
                    </Link>
                  </summary>
                  <p className="lin-maj-auteur">
                    <IconeSante sante={aValiderP.length ? "decroche" : "ok"} />
                    <span data-teinte={aValiderP.length ? "jaune" : "vert"}>{aValiderP.length ? `${pluriel(aValiderP.length, "reprise")} ${aValiderP.length > 1 ? "prêtes" : "prête"}` : "Rien à valider"}</span>
                    <Avatar />
                    <span className="lin-maj-gris">OFFLOAD</span>
                    <span className="lin-maj-gris">{derniereAnalyse ? dateCourte(derniereAnalyse) : "cette nuit"}</span>
                  </p>
                  <p className="lin-maj-texte">
                    {aValiderP.length
                      ? "Les reprises de contact sont préparées chaque nuit à partir de l'historique de vos ventes ; aucune ne part sans votre accord."
                      : enJeu.length
                        ? "Aucune reprise n'attend : les clients qui décrochent sont ci-dessous, avec leur raison."
                        : "Aucune reprise n'attend votre accord."}
                  </p>
                  {citation.length ? (
                    <dl className="lin-maj-citation">
                      {citation.map((x) => (
                        <div key={x.cle}>
                          <dt>{x.nom}</dt>
                          <dd>{x.texte}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <footer className="lin-maj-pied">
                    <Link href={adresse(actifs, true, "tous")} className="lin-maj-pied-btn" aria-label="Voir les comptes" title="Voir les comptes">
                      <MessageSquare width={16} height={16} aria-hidden="true" />
                    </Link>
                    <Link href={`${RACINE}/validations`} className="lin-maj-pied-rond" aria-label="Valider" title="Valider">
                      <CheckCheck width={16} height={16} aria-hidden="true" />
                    </Link>
                  </footer>
                </details>

                <h3 className="lin-projet-h2">Valeur en jeu par niveau</h3>
                <ul className="lin-projet-liste">
                  {parNiveau.map((x) => (
                    <li key={x.n}>
                      <span className="lin-tranche-nom">{SANTES[x.n].libelle}</span>
                      <span className="lin-tranche-barre" aria-hidden="true">
                        <span style={{ width: `${(x.valeur / maxNiveau) * 100}%` }} />
                      </span>
                      <span className="lin-meta">
                        {pluriel(x.nb, "compte")} · {montant(x.valeur)}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="lin-projet-h2">Plus grosses valeurs en jeu</h3>
                {enJeu.length ? (
                  <ul className="lin-projet-liste">
                    {enJeu.slice(0, 5).map((c) => (
                      <li key={c.id}>
                        <Link href={lienCompte(c.id)} className="lin-projet-lien">
                          <IconeCompte c={c} />
                          <span>{c.nom}</span>
                          <IconePriorite niveau={prioDe(c.signal?.score ?? 0)} titre={scoreDe(c)} />
                          <span className="lin-meta">{montant(valeurDe(c))}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-maj-texte lin-maj-gris">Aucun client ne décroche.</p>
                )}
                <Link href={adresse(actifs, true, "tous")} className="lin-voir-tout">
                  Voir tous les comptes <ArrowRight width={14} height={14} aria-hidden="true" />
                </Link>
              </>
            )}
          </article>

          {rien ? null : (
            <aside className="lin-cartes-droite" aria-label="Les chiffres">
              {/* l'ordre des cartes de Linear : Properties, Milestones, Progress, Activity ; chaque valeur filtre la page */}
              <CarteDroite titre="Propriétés">
                <dl className="lin-props">
                  <div>
                    <dt>Comptes suivis</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par niveau…"
                        declencheur={
                          <>
                            <IconeGroupe />
                            {k.comptes}
                          </>
                        }
                        options={filtresNiveau()}
                        largeur={280}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Valeur en jeu</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Plus grosses valeurs en jeu…"
                        declencheur={
                          <>
                            <IconeJauge />
                            {montant(valeurEnJeu)}
                          </>
                        }
                        options={enJeu.slice(0, 5).map((c): Option => ({ cle: c.id, libelle: c.nom, meta: montant(valeurDe(c)), icone: <IconeCompte c={c} />, href: lienCompte(c.id) }))}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Avant la clôture</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="À joindre avant la clôture…"
                        declencheur={
                          <>
                            <IconeCalendrier passe={k.avant_cloture > 0} />
                            {k.avant_cloture}
                          </>
                        }
                        options={[
                          optionFiltre("cloture", "oui", { libelle: "Seulement ceux à joindre avant la clôture" }),
                          ...avantCloture.map((c): Option => ({ cle: c.id, libelle: c.nom, meta: dateCourte(c.signal?.cloture_le), icone: <IconeCompte c={c} />, href: lienCompte(c.id) })),
                        ]}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Messages à valider</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Reprises à valider…"
                        declencheur={
                          <>
                            <IconeEnveloppe />
                            {k.a_valider}
                          </>
                        }
                        options={[
                          ...filtresEtape(["a_valider", "relance_a_valider"]),
                          ...aValiderP.map((v): Option => ({ cle: v.reprise, libelle: v.compte_nom, meta: v.rang === 2 ? "relance" : "premier message", icone: <Losange atteint />, href: lienCompte(v.compte_id) })),
                        ]}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Appels à passer</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Appels à passer…"
                        declencheur={
                          <>
                            <PhoneCall width={16} height={16} aria-hidden="true" />
                            {k.appels}
                          </>
                        }
                        options={[
                          ...filtresEtape(["appel"]),
                          ...appels.map((t): Option => ({
                            cle: t.id,
                            libelle: t.compte_nom ?? t.titre,
                            meta: `avant le ${dateCourte(t.echeance)}`,
                            icone: <PhoneCall width={16} height={16} />,
                            href: lienCompte(t.compte_id),
                          })),
                        ]}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Réponses</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Réponses à traiter…"
                        declencheur={
                          <>
                            <MessageSquare width={16} height={16} aria-hidden="true" />
                            {k.reponses}
                          </>
                        }
                        options={[
                          ...filtresEtape(["repondue"]),
                          ...reponses.map((t): Option => ({ cle: t.id, libelle: t.compte_nom ?? t.titre, meta: `avant le ${dateCourte(t.echeance)}`, icone: <IconeEnveloppe />, href: lienCompte(t.compte_id) })),
                        ]}
                        largeur={320}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Commercial</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par commercial…"
                        declencheur={
                          <>
                            <UserRound width={16} height={16} aria-hidden="true" />
                            {actifs.commercial ? libelleFiltre("commercial", actifs.commercial) : `${commerciaux.size} commercia${commerciaux.size > 1 ? "ux" : "l"}`}
                          </>
                        }
                        options={filtresCommercial()}
                        largeur={300}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Délai de silence</dt>
                    <dd>
                      <MenuOptions
                        plat
                        titre="Filtrer par silence…"
                        declencheur={
                          <>
                            <IconeDiese />
                            {reglages.delai_silence_jours} jours
                          </>
                        }
                        options={filtresSilence()}
                        largeur={300}
                      />
                    </dd>
                  </div>
                </dl>
              </CarteDroite>

              <CarteDroite titre="Étapes de la reprise">
                <ul className="lin-jalons">
                  {ETAPES.map((e) => {
                    const n = etapesDe(e).length;
                    return (
                      <li key={e}>
                        <Losange atteint={n > 0} />
                        <span className="lin-jalon-nom">{STATUTS_REPRISE[e].libelle}</span>
                        <span className="lin-meta">{pluriel(n, "compte")}</span>
                        <MenuActions
                          titre={`${STATUTS_REPRISE[e].libelle}…`}
                          options={[
                            optionFiltre("etape", e, { libelle: actifs.etape === e ? "Retirer ce filtre" : "Filtrer sur cette étape", icone: <ListFilter width={16} height={16} /> }),
                            { cle: "comptes", libelle: "Comptes à cette étape", icone: <Losange atteint />, href: adresse({ ...actifs, etape: e }, true, "tous") },
                          ]}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CarteDroite>

              <CarteEnJeu liste={portee} />

              <CarteDroite
                titre="Activité"
                action={
                  <Link href={`${RACINE}/offload/pilotage`} className="lin-carte-lien">
                    Tout voir
                  </Link>
                }
              >
                {recentes.length ? (
                  <ul className="lin-activite">
                    {recentes.map((x) => (
                      <li key={x.cle}>
                        <Losange atteint={x.fait} />
                        <span>
                          <b>{x.nom}</b> · {x.quoi} · {dateCourte(x.le)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="lin-activite-vide">Aucune reprise pour l&apos;instant.</p>
                )}
              </CarteDroite>
            </aside>
          )}
        </div>
      </div>
    );
  }

  /* ——— la liste : le tableau des projets (« Voir tous les comptes ») ——— */
  const valeurTri = (c: Compte) => (tri === "priorite" ? -(c.signal?.priorite ?? 0) : tri === "valeur" ? -valeurDe(c) : tri === "silence" ? -(c.signal?.jours_silence ?? -1) : 0);
  /* à valeur égale, ceux qui décrochent d'abord (l'ordre de l'ancien écran) */
  const ordonnes = portee.slice().sort((a, b) => valeurTri(a) - valeurTri(b) || Number(aRisque(b)) - Number(aRisque(a)) || a.nom.localeCompare(b.nom, "fr"));
  const q = filtre.trim().toLowerCase();
  const filtres = ordonnes.filter((c) => (onglet === "tous" || santeDe(c) === onglet) && (!q || `${c.nom} ${c.ref} ${c.commercial ?? ""} ${c.ville ?? ""} ${c.groupe ?? ""}`.toLowerCase().includes(q)));
  const presentes = (Object.keys(SANTES) as Sante[]).filter((s) => comptes.some((c) => santeDe(c) === s));
  const commerciaux = [...new Set(portee.map((c) => c.commercial ?? ""))];
  /* le panneau de détails compte la portée des filtres, comme le tableau de bord */
  const taches = (type: "appel" | "repondre") => tableau.taches.filter((t) => t.type === type && t.statut === "a_faire" && dansPortee.has(t.compte_id)).length;
  const lignesDetails =
    ongletDetails === "niveaux"
      ? presentes
          .filter((s) => portee.some((c) => santeDe(c) === s))
          .map((s) => {
            const l = portee.filter((c) => santeDe(c) === s);
            return { cle: s, libelle: SANTES[s].libelle, valeur: `${l.length} · ${montant(somme(l.map(valeurDe)))}` };
          })
      : ongletDetails === "reprises"
        ? [
            ...ETAPES.map((e) => ({ cle: e, libelle: STATUTS_REPRISE[e].libelle, valeur: String(etapesDe(e).length) })),
            { cle: "appels", libelle: "Appels à passer", valeur: String(nbActifs ? taches("appel") : tableau.compteurs.appels) },
            { cle: "reponses", libelle: "Réponses à traiter", valeur: String(nbActifs ? taches("repondre") : tableau.compteurs.reponses) },
          ]
        : commerciaux.map((m) => {
            const l = portee.filter((c) => (c.commercial ?? "") === m);
            return { cle: m || "-", libelle: m || "Sans commercial", valeur: `${l.filter(aRisque).length} à risque sur ${l.length}` };
          });
  const lienListe = (s: Sante | "tous") => adresse(actifs, true, s);

  return (
    <div className="lin">
      <h1 className="v2-sr">Comptes à risque</h1>
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={`${RACINE}/offload`} className="lin-fil-equipe">
            Tableau de bord
          </Link>
          <span className="lin-fil-sep" aria-hidden="true">
            ›
          </span>
          <span className="lin-fil-ici" aria-current="page">
            Comptes
          </span>
        </nav>
        <div className="lin-tete-droite">
          {source === "reelle" && tableau.client ? (
            <button type="button" className="v2-btn v2-btn--petit" disabled={occupe} onClick={() => void lancerRecalcul()}>
              <RefreshCw width={14} height={14} aria-hidden="true" />
              <span>Recalculer</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Niveau">
          <Link href={lienListe("tous")} className="v2-btn v2-btn--petit" data-actif={onglet === "tous" ? "" : undefined} aria-current={onglet === "tous" ? "page" : undefined} scroll={false}>
            Tous les comptes
          </Link>
          {presentes.map((s) => (
            <Link key={s} href={lienListe(s)} className="v2-btn v2-btn--petit" data-actif={onglet === s ? "" : undefined} aria-current={onglet === s ? "page" : undefined} scroll={false}>
              {SANTES[s].libelle}
            </Link>
          ))}
          {pastillesFiltres}
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
                placeholder="Filtrer par nom, référence, commercial…"
                aria-label="Filtrer les comptes"
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
                      { cle: "priorite", libelle: "Priorité" },
                      { cle: "valeur", libelle: "Valeur en jeu" },
                      { cle: "silence", libelle: "Silence" },
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
          <div className="lin-table" role="table" aria-label="Comptes">
            <div className="lin-table-tete" role="row">
              <span role="columnheader" aria-hidden="true" />
              <span role="columnheader">Nom</span>
              <span role="columnheader">Niveau</span>
              <span role="columnheader">Priorité</span>
              <span role="columnheader" className="lin-num">
                En jeu
              </span>
              <span role="columnheader">Dernier achat</span>
              <span role="columnheader" className="lin-num">
                Silence
              </span>
              <span role="columnheader">Score</span>
            </div>
            {filtres.length === 0 ? (
              <p className="lin-vide">{comptes.length ? "Aucun compte ne correspond." : "L'historique est vide : importez l'export de votre logiciel de ventes (code client, date, montant HT)."}</p>
            ) : (
              filtres.map((c) => {
                const s = santeDe(c);
                const r = repriseEnCours(c);
                const score = c.signal?.score ?? 0;
                return (
                  <Link key={c.id} href={lienCompte(c.id)} className="lin-table-ligne" role="row" scroll={false}>
                    <span className="lin-case" aria-hidden="true" />
                    <span className="lin-table-nom" role="cell">
                      <IconeCompte c={c} />
                      <span className="lin-table-titre">{c.nom}</span>
                      {r ? (
                        <span className="lin-jalon-puce">
                          <Losange atteint />
                          {STATUTS_REPRISE[r.statut].libelle}
                        </span>
                      ) : c.statut !== "suivi" ? (
                        <span className="lin-jalon-puce">{STATUTS_COMPTE[c.statut]}</span>
                      ) : null}
                    </span>
                    <span className="lin-table-sante" role="cell" data-teinte={SANTES[s].teinte}>
                      <IconeSante sante={s} />
                      <span>{SANTES[s].libelle}</span>
                    </span>
                    <span role="cell">
                      <IconePriorite niveau={prioDe(score)} titre={scoreDe(c)} />
                    </span>
                    <span role="cell" className="lin-num lin-table-valeur">
                      {valeurDe(c) ? montant(valeurDe(c)) : "—"}
                    </span>
                    <span role="cell" className="lin-table-date">
                      <IconeCalendrier passe={aRisque(c)} />
                      {dateCourte(c.signal?.dernier_achat)}
                    </span>
                    <span role="cell" className="lin-num lin-table-chiffre">
                      {c.signal?.jours_silence !== null && c.signal?.jours_silence !== undefined ? `${c.signal.jours_silence} j` : "—"}
                    </span>
                    <span role="cell" className="lin-table-statut">
                      <Anneau part={score} sante={s} />
                      {c.signal ? score : "—"}
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
                  ["niveaux", "Niveaux"],
                  ["reprises", "Reprises"],
                  ["commerciaux", "Commerciaux"],
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
