"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — la vue d'ensemble des dossiers (30/10/2026, refonte des pages
   métiers)

   « My issues » de Linear, au 1:1 : relevé docs/refonte-metiers/releves/
   linear-my-issues.md, mesures dans components/espace2/lin/linear-my-
   issues.css (préfixe lmi-). Une tête, une rangée d'onglets en pilules,
   des groupes repliables et des lignes de 44.

   Ce qu'elle reprend de l'écran d'avant (EcranTamila, inventaire tamila.md) :
     · B1 : « Nouveau dossier » (le « + » de la tête, G2 / B16), la phrase
       du cabinet (B15) et les pages du cabinet dans le menu « … » ;
     · B2-B6 : les avis de la base réelle, une ligne sous les onglets
       (installer → Réglages ; lire les références au coffre, G5) ;
     · B9 : les cinq compteurs → les onglets, avec leur nombre ; le filtre
       est dans l'adresse (?filtre=), comme le veulent les lignes du point
       du matin (E1-E3, E6, E10) ; « Tous » le retire ;
     · B10 : une ligne par dossier, même tri, même contenu (référence ou
       « Chiffré », statut, à confirmer, J-n, intitulé · matière,
       juridiction, échéance, audience, responsable), groupée par rang ;
       un clic ouvre la page du dossier (L4) ;
     · les échéances réunies (§ 8.3-7, E11-E14) : l'onglet « Échéances »
       range délais, audiences, expertises et relances par semaine. Il lit
       le cabinet (chargerPilotage), jamais un dossier : aucune trace.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarClock, ChevronDown, FolderLock, Gavel, Hourglass, KeyRound, Microscope, Plus, Scale } from "lucide-react";
import { dateCourte } from "@/components/espace/format";
import { ATTENTES_OBJETS_EXEMPLE, attentesExemple, expertisesExemple } from "@/components/espace/tamila/exemples";
import { ACTES, NATURES_AUDIENCE, STATUTS_DOSSIER, delaiCourt, joursAvant, libelleMatiere, libelleTerritoire } from "@/components/espace/tamila/regles";
import { chargerPilotage } from "@/components/espace/tamila/portes";
import { dechiffrer } from "@/components/espace/tamila/chiffrement";
import type { Attente, Expertise } from "@/components/espace/tamila/types";
import { MenuActions, type Option } from "../lin/Lin";
import { Avatar, BASE, FenetresCabinet, jourCourt, lienDossier, type Fenetre, type OngletDossier } from "./commun";
import { FILTRES, dansFiltre, rangDe, trier, useTamila, type Filtre, type Ligne } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-my-issues.css";
import "./tamila.css";

const GROUPES = [
  { rang: 0, nom: "Délais à confirmer", precision: "par un avocat", icone: Gavel },
  { rang: 1, nom: "Échéance en cours", precision: "un acte à déposer", icone: Hourglass },
  { rang: 2, nom: "Sans échéance", precision: "ouverts, audits, en attente", icone: FolderLock },
  { rang: 3, nom: "Clos ou refusés", precision: "effacés à l'échéance", icone: FolderLock },
];
const estFiltre = (x: string | null): x is Filtre => FILTRES.some((f) => f.cle === x);

/* le statut du dossier, 14, aux formes de Linear : vide en attente, à moitié ouvert ou audit, plein clos */
function IconeStatut({ statut }: { statut: Ligne["dossier"]["statut"] }) {
  const s = STATUTS_DOSSIER[statut];
  const couleur = statut === "ouvert" ? "var(--lin-en-cours)" : statut === "audit" ? "var(--lin-graph-bleu)" : statut === "attente" ? "var(--lin-orange)" : statut === "refuse" ? "var(--lin-rouge)" : "var(--lin-fait)";
  return (
    <span className="lmi-statut" title={s.libelle} style={{ color: couleur }}>
      <svg viewBox="0 0 14 14" role="img" aria-label={s.libelle}>
        <circle cx="7" cy="7" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={statut === "attente" ? "1.4 1.65" : undefined} />
        {statut === "clos" || statut === "efface" || statut === "refuse" ? <circle cx="7" cy="7" r="3.5" fill="currentColor" /> : statut === "attente" ? null : <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />}
      </svg>
    </span>
  );
}

/* une échéance du cabinet (onglet Échéances) */
type Echeance = { cle: string; dossier: string; quand: string; titre: string; second: string; icone: typeof Gavel; onglet: OngletDossier; pilule?: { texte: string; teinte: string } };

export default function VueEnsemble() {
  const { cle, source, pret, erreur, cabinet, moi, lignes, compteurs, nomDe, phrase, auCoffre, aLireParCoffre, lireListeParCoffre, avocat, installe, clientId, delaisCabinet, audiencesCabinet } = useTamila();
  const params = useSearchParams();
  const chemin = usePathname();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [replies, setReplies] = useState<Set<number>>(() => new Set());
  const [lecture, setLecture] = useState(false);

  const vue = params.get("vue") === "echeances" ? "echeances" : "dossiers";
  const f = params.get("filtre");
  const filtre: Filtre | null = estFiltre(f) ? f : null;
  const lien = (x: { filtre?: Filtre | null; vue?: "echeances" }) => {
    const p = new URLSearchParams();
    if (x.filtre) p.set("filtre", x.filtre);
    if (x.vue) p.set("vue", x.vue);
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };

  const visibles = useMemo(() => trier(lignes.filter((x) => dansFiltre(x, filtre))), [lignes, filtre]);
  const groupes = useMemo(() => GROUPES.map((g) => ({ ...g, lignes: visibles.filter((x) => rangDe(x) === g.rang) })).filter((g) => g.lignes.length), [visibles]);
  const reference = (id: string) => lignes.find((x) => x.dossier.id === id)?.clair?.reference ?? "Chiffré";

  /* ——— l'onglet Échéances : délais, audiences, et ce que lit le pilotage (expertises, relances) ——— */
  const [cabinetLu, setCabinetLu] = useState<{ expertises: Expertise[]; attentes: Attente[] } | null>(null);
  const [objets, setObjets] = useState<Record<string, string>>({});
  useEffect(() => {
    if (vue !== "echeances" || cabinetLu) return;
    let actif = true;
    const t0 = window.setTimeout(async () => {
      if (source === "exemple") {
        const ids = lignes.map((x) => x.dossier.id);
        if (actif) setCabinetLu({ expertises: ids.flatMap(expertisesExemple), attentes: ids.flatMap(attentesExemple) });
        return;
      }
      if (!clientId) return;
      try {
        const r = await chargerPilotage(clientId);
        if (actif) setCabinetLu({ expertises: r.expertises, attentes: r.attentes });
      } catch {
        if (actif) setCabinetLu({ expertises: [], attentes: [] });
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t0);
    };
  }, [vue, cabinetLu, source, lignes, clientId]);
  /* l'objet d'une pièce attendue est chiffré : il se lit si la clé du dossier est déjà au trousseau, sinon « objet chiffré » */
  useEffect(() => {
    if (!cabinetLu || source === "exemple") return;
    let actif = true;
    void (async () => {
      const n: Record<string, string> = {};
      for (const a of cabinetLu.attentes) {
        const k = cle(a.dossier_id);
        if (!k) continue;
        const o = await dechiffrer(k, a.objet_chiffre);
        if (o) n[a.id] = o;
      }
      if (actif && Object.keys(n).length) setObjets(n);
    })();
    return () => {
      actif = false;
    };
  }, [cabinetLu, source, cle]);

  const echeances = useMemo<Echeance[]>(() => {
    const vivants = new Set(lignes.filter((x) => x.dossier.statut !== "efface").map((x) => x.dossier.id));
    const n: Echeance[] = [];
    for (const d of delaisCabinet) {
      if (!vivants.has(d.dossier_id) || !delaiCourt(d)) continue;
      n.push({ cle: `d:${d.id}`, dossier: d.dossier_id, quand: d.echeance_retenue, titre: ACTES[d.acte], second: d.statut === "a_confirmer" ? "délai encore à confirmer" : "délai confirmé", icone: Hourglass, onglet: "procedure", pilule: d.statut === "a_confirmer" ? { texte: "À confirmer", teinte: "jaune" } : undefined });
    }
    for (const a of audiencesCabinet) {
      if (!vivants.has(a.dossier_id) || a.statut !== "prevue" || joursAvant(a.date_heure) < -1) continue;
      n.push({ cle: `a:${a.id}`, dossier: a.dossier_id, quand: a.date_heure, titre: `${NATURES_AUDIENCE[a.nature]}${a.heure_connue ? ` à ${new Date(a.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}`, second: [a.juridiction, a.chambre].filter(Boolean).join(" · ") || "audience", icone: Scale, onglet: "procedure" });
    }
    for (const x of cabinetLu?.expertises ?? []) {
      if (x.statut !== "en_cours") continue;
      const etapes: [string | null, string | null, string][] = [
        [x.consignation_avant, x.consignation_versee_le, "Consignation à verser"],
        [x.pre_rapport_attendu_le, x.pre_rapport_recu_le, "Pré-rapport attendu"],
        [x.dires_jusqu_au, x.dires_deposes_le, "Dires à adresser à l'expert"],
        [x.rapport_attendu_le, x.rapport_recu_le, "Rapport définitif attendu"],
      ];
      for (const [quand, fait, titre] of etapes) if (quand && !fait) n.push({ cle: `x:${x.id}:${titre}`, dossier: x.dossier_id, quand, titre, second: x.mission === "judiciaire" ? "expertise judiciaire" : "expertise amiable", icone: Microscope, onglet: "procedure" });
    }
    for (const a of cabinetLu?.attentes ?? []) {
      if (a.statut !== "attendue" || !a.relance_le) continue;
      const objet = source === "exemple" ? ATTENTES_OBJETS_EXEMPLE[a.id] : objets[a.id];
      n.push({ cle: `r:${a.id}`, dossier: a.dossier_id, quand: a.relance_le, titre: `Relancer ${a.de === "client" ? "le client" : a.de === "confrere" ? "le confrère" : "le tiers"}`, second: objet ?? "objet chiffré", icone: CalendarClock, onglet: "pieces" });
    }
    return n.filter((e) => vivants.has(e.dossier)).sort((a, b) => a.quand.localeCompare(b.quand));
  }, [lignes, delaisCabinet, audiencesCabinet, cabinetLu, objets, source]);

  const periodes = useMemo(() => {
    const p = [
      { rang: 0, nom: "En retard", precision: "échéance passée", lignes: [] as Echeance[] },
      { rang: 1, nom: "Sous 7 jours", precision: "", lignes: [] as Echeance[] },
      { rang: 2, nom: "Sous 30 jours", precision: "", lignes: [] as Echeance[] },
      { rang: 3, nom: "Plus tard", precision: "", lignes: [] as Echeance[] },
    ];
    for (const e of echeances) {
      const j = joursAvant(e.quand);
      p[j < 0 ? 0 : j <= 7 ? 1 : j <= 30 ? 2 : 3].lignes.push(e);
    }
    return p.filter((x) => x.lignes.length);
  }, [echeances]);

  const basculer = (r: number) =>
    setReplies((avant) => {
      const apres = new Set(avant);
      if (apres.has(r)) apres.delete(r);
      else apres.add(r);
      return apres;
    });

  const peutOuvrir = source === "exemple" || (installe && !!moi && moi.role !== "lecteur");
  const menu: Option[] = [
    ...(source === "reelle" ? [{ cle: "phrase", libelle: phrase ? "Phrase mémorisée…" : "Phrase du cabinet…", icone: <KeyRound width={16} height={16} aria-hidden="true" />, action: () => setFenetre("phrase") }] : []),
    { cle: "arrivees", libelle: "Arrivées", href: `${BASE}/arrivees` },
    ...(avocat && installe ? [{ cle: "honoraires", libelle: "Honoraires du cabinet", href: `${BASE}/honoraires` }, { cle: "pilotage", libelle: "Pilotage", href: `${BASE}/pilotage` }] : []),
    { cle: "conformite", libelle: "Conformité du cabinet", href: `${BASE}/conformite` },
    { cle: "reglages", libelle: "Réglages", href: `${BASE}/reglages` },
  ];

  const chargement = source === "reelle" && !pret;

  function ligneDossier(x: Ligne) {
    const s = STATUTS_DOSSIER[x.dossier.statut];
    const jours = x.prochaine ? joursAvant(x.prochaine) : null;
    const titre = x.clair?.intitule ?? "Intitulé chiffré";
    return (
      <li key={x.dossier.id} className="lmi-ligne">
        <Link className="lmi-ligne-lien" href={lienDossier(x.dossier.id)} aria-label={`${x.clair?.reference ?? "Dossier chiffré"}, ${titre}, ${s.libelle}`} />
        <span className="lmi-icone" title={x.dossier.mode === "dommage_corporel" ? "Dommage corporel" : "Contentieux"}>
          <FolderLock aria-hidden="true" />
        </span>
        <span className="lmi-id">{x.clair?.reference ?? "Chiffré"}</span>
        <IconeStatut statut={x.dossier.statut} />
        <span className="lmi-titre">
          <span className="lmi-titre-texte">
            {titre}
            {x.dossier.matiere ? ` · ${libelleMatiere(x.dossier.matiere)}` : ""}
          </span>
          <span className="lmi-titre-second">{x.dossier.juridiction ?? libelleTerritoire(x.dossier.territoire)}</span>
        </span>
        <span className="lmi-droite">
          {x.aConfirmer ? (
            <span className="lmi-pilule" data-teinte="jaune">
              {x.aConfirmer} à confirmer
            </span>
          ) : null}
          {jours !== null && jours < 0 ? (
            <span className="lmi-pilule" data-teinte="rouge">
              Dépassé
            </span>
          ) : jours !== null && jours <= 15 ? (
            <span className="lmi-pilule" data-teinte="rouge">
              J{jours === 0 ? "" : `-${jours}`}
            </span>
          ) : null}
          {x.audience ? (
            <span className="lmi-pilule" title={`Audience le ${dateCourte(x.audience)}`}>
              <Scale aria-hidden="true" />
              {jourCourt(x.audience)}
            </span>
          ) : null}
          <Avatar nom={x.responsable ? nomDe(x.responsable) : null} />
        </span>
        <span className="lmi-date" title={x.prochaine ? `Échéance le ${dateCourte(x.prochaine)}` : `Ouvert le ${dateCourte(x.dossier.cree_le)}`}>
          {x.prochaine ? jourCourt(x.prochaine) : jourCourt(x.dossier.cree_le)}
        </span>
      </li>
    );
  }

  function ligneEcheance(e: Echeance) {
    const j = joursAvant(e.quand);
    const Icone = e.icone;
    return (
      <li key={e.cle} className="lmi-ligne">
        <Link className="lmi-ligne-lien" href={lienDossier(e.dossier, e.onglet)} aria-label={`${e.titre}, ${reference(e.dossier)}`} />
        <span className="lmi-icone">
          <Icone aria-hidden="true" />
        </span>
        <span className="lmi-id">{reference(e.dossier)}</span>
        <span className="lmi-titre">
          <span className="lmi-titre-texte">{e.titre}</span>
          <span className="lmi-titre-second">{e.second}</span>
        </span>
        <span className="lmi-droite">
          {e.pilule ? (
            <span className="lmi-pilule" data-teinte={e.pilule.teinte}>
              {e.pilule.texte}
            </span>
          ) : null}
          {j < 0 ? (
            <span className="lmi-pilule" data-teinte="rouge">
              {-j} j de retard
            </span>
          ) : j <= 7 ? (
            <span className="lmi-pilule" data-teinte="rouge">
              {j === 0 ? "Aujourd'hui" : `J-${j}`}
            </span>
          ) : null}
        </span>
        <span className="lmi-date" title={dateCourte(e.quand)}>
          {jourCourt(e.quand)}
        </span>
      </li>
    );
  }

  const groupesMontres = vue === "echeances" ? periodes.map((p) => ({ rang: p.rang, nom: p.nom, precision: p.precision, icone: CalendarClock, n: p.lignes.length, rendu: p.lignes.map(ligneEcheance) })) : groupes.map((g) => ({ rang: g.rang, nom: g.nom, precision: g.precision, icone: g.icone, n: g.lignes.length, rendu: g.lignes.map(ligneDossier) }));

  return (
    <div className="lin lmi">
      <h1 className="v2-sr">Dossiers du cabinet</h1>

      <header className="lmi-tete">
        <h2 className="lmi-h2">Dossiers du cabinet</h2>
        {pret ? <span className="lmi-tete-compte">{visibles.length} dossier{visibles.length > 1 ? "s" : ""}</span> : null}
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
          <MenuActions rond titre="Les pages du cabinet" options={menu} />
          <button type="button" className="lmi-rond" aria-label="Ouvrir un dossier" title="Ouvrir un dossier" disabled={!peutOuvrir} onClick={() => setFenetre("nouveau")}>
            <Plus aria-hidden="true" />
          </button>
        </span>
      </header>

      <div className="lmi-barre">
        <nav className="lmi-onglets" aria-label="Familles de dossiers">
          <Link href={lien({})} scroll={false} className="lmi-onglet" aria-current={vue === "dossiers" && !filtre ? "page" : undefined}>
            Tous
          </Link>
          {FILTRES.map((x) => (
            <Link key={x.cle} href={lien({ filtre: x.cle })} scroll={false} className="lmi-onglet" title={x.sous} aria-current={vue === "dossiers" && filtre === x.cle ? "page" : undefined}>
              {x.libelle}
              {pret ? <span style={{ opacity: 0.6, marginLeft: 4 }}>{compteurs[x.cle]}</span> : null}
            </Link>
          ))}
          <Link href={lien({ vue: "echeances" })} scroll={false} className="lmi-onglet" aria-current={vue === "echeances" ? "page" : undefined}>
            Échéances
          </Link>
        </nav>
      </div>

      {erreur ? (
        <p className="tme-avis" data-teinte="rouge" role="alert">
          <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
        </p>
      ) : null}
      {source === "reelle" && cabinet && !cabinet.installe && cabinet.moi.user_id ? (
        <p className="tme-avis">
          <strong>Tamila n&apos;est pas installé pour ce cabinet.</strong>
          <Link href={`${BASE}/reglages`} className="lmi-onglet">
            {cabinet.moi.role === "gerant" ? "L'installer dans les réglages" : "Seul un gérant l'installe"}
          </Link>
        </p>
      ) : null}
      {aLireParCoffre.length ? (
        <p className="tme-avis">
          <strong>Les clés de ce cabinet sont au coffre Scaleway.</strong> Chaque clé remise est journalisée (qui, quand, quel dossier).
          <button
            type="button"
            className="lmi-onglet"
            disabled={lecture}
            onClick={async () => {
              setLecture(true);
              await lireListeParCoffre();
              setLecture(false);
            }}
          >
            Lire les références ({aLireParCoffre.length} ouverture{aLireParCoffre.length > 1 ? "s" : ""} de clé)
          </button>
        </p>
      ) : null}
      {source === "reelle" && cabinet && !phrase && !auCoffre && cabinet.dossiers.length ? (
        <p className="tme-avis">
          <strong>Les dossiers sont chiffrés.</strong> {cabinet.cles.length === 0 ? "Les clés ne sont lisibles que par les associés." : "La phrase du cabinet les déchiffre dans cet onglet."}
          <button type="button" className="lmi-onglet" onClick={() => setFenetre("phrase")}>
            Taper la phrase
          </button>
        </p>
      ) : null}
      {source === "reelle" && cabinet?.horsVue ? (
        <p className="tme-avis">
          {cabinet.horsVue} dossier{cabinet.horsVue > 1 ? "s" : ""} du cabinet {cabinet.horsVue > 1 ? "sont" : "est"} hors de votre vue (muraille ou périmètre) : compté, jamais lu.
        </p>
      ) : null}

      {chargement || (vue === "echeances" && !cabinetLu) ? (
        <ul className="lmi-lignes" aria-busy="true" aria-label="Lecture des dossiers">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="lmi-ligne" aria-hidden="true">
              <span className="lmi-titre">
                <span className="lmi-squelette" style={{ width: `${70 - i * 12}%` }} />
              </span>
            </li>
          ))}
        </ul>
      ) : groupesMontres.length ? (
        <ul className="lmi-liste">
          {groupesMontres.map((g) => {
            const replie = replies.has(g.rang);
            const Icone = g.icone;
            return (
              <li key={g.rang} className="lmi-groupe">
                <div className="lmi-groupe-tete">
                  <button type="button" className="lmi-groupe-replier" aria-expanded={!replie} aria-label={replie ? `Déplier ${g.nom}` : `Replier ${g.nom}`} onClick={() => basculer(g.rang)}>
                    <ChevronDown aria-hidden="true" />
                  </button>
                  <Icone className="lmi-groupe-icone" aria-hidden="true" />
                  <span className="lmi-groupe-nom">{g.nom}</span>
                  <span className="lmi-groupe-compte">{g.n}</span>
                  {g.precision ? <span className="lmi-groupe-precision">{g.precision}</span> : null}
                </div>
                {replie ? null : <ul className="lmi-lignes">{g.rendu}</ul>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="lmi-vide">
          <strong>{vue === "echeances" ? "Aucune échéance" : "Aucun dossier"}</strong>
          {vue === "echeances" ? "Les délais, audiences, étapes d'expertise et relances des dossiers vivants arrivent ici." : filtre ? "Rien dans cette famille." : source === "reelle" ? "Aucun dossier ne vous est ouvert. Ouvrez-en un, ou demandez à un responsable de vous y ajouter." : "Aucun dossier."}
        </p>
      )}

      <FenetresCabinet fenetre={fenetre} fermer={() => setFenetre(null)} />
    </div>
  );
}
