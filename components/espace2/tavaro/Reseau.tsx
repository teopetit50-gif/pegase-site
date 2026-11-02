"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Réseau et flotte (02/11/2026, refonte des pages métiers) —
   les décisions de la direction

   La liste des Initiatives de Linear, au 1:1 : relevé docs/refonte-metiers/
   releves/linear-initiatives-liste.md, styles ./tav-initiatives.css
   (préfixe tav-n-). Une ligne d'initiative par sujet de décision ; les
   colonnes de Linear (Status, Priority, Owner, Target, Projects, Health,
   Active Projects) portent les valeurs du sujet. Quatre onglets :
     · Flotte (B45, B46) : un véhicule par ligne, sa fiche économique (F28,
       G58, G59) ; les mises en vente (G60 confirmé, G61 / F29, G62 / F30,
       G63 confirmé) ;
     · Plan de flotte (B43, B44) : agence × catégorie, puis les véhicules à
       vendre ou renouveler ; la cote se note à un seul endroit (doublon
       § 8.3-3 tranché) : la fiche du véhicule (F28) quand il en a une, la
       cote du plan (F27, G57) sinon ;
     · Transferts (B27) : une tournée par ligne (G26 confirmé, G27, G28) ;
     · Audit et 2027 (B34, B35, B47) : l'indicateur du mois, les audits
       (F17, F18, G44, G45, G46 confirmé), la préparation à la facture
       électronique.
   Visibilité gardée (§ 8.3-6) : flotte, audit et 2027 pour la direction
   et les valideurs ; le plan de flotte pour la direction en base réelle.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Route } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant } from "@/components/espace/format";
import { DialogueCote } from "@/components/espace/tavaro/AnalysesParc";
import type { VehiculePlan } from "@/components/espace/tavaro/analyses";
import type { FicheVehicule, SortieFlotte } from "@/components/espace/tavaro/types";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { useAnalyses } from "./analyses";
import { AVIS_FLOTTE, CANAUX, FAMILLES_AUDIT, FenetresAudit, FenetresFlotte, STATUTS_SORTIE, aujourdhui, useAuditEtat, useFlotteEtat } from "./EtatsReseau";
import { FenetreOperations } from "./operations";
import { TavCarte, TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import "./tav-initiatives.css";

type Onglet = "flotte" | "plan" | "transferts" | "audit";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "flotte", libelle: "Flotte" },
  { cle: "plan", libelle: "Plan de flotte" },
  { cle: "transferts", libelle: "Transferts" },
  { cle: "audit", libelle: "Audit et 2027" },
];
type Statut = { libelle: string; icone: NomTavIcone; teinte?: "jaune" | "vert" | "violet" | "rouge" | "gris" };
type Sante = "vert" | "rouge" | "vide";
type Ligne = {
  cle: string;
  icone: NomTavIcone;
  nom: string;
  resume: string;
  statut: Statut;
  priorite?: "urgent" | "haute" | "aucune";
  cible?: string | null;
  projets?: string | null;
  sante: Sante;
  actifs?: string | null;
  onClick?: () => void;
};
const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)} %`);

function LigneInitiative({ l }: { l: Ligne }) {
  const contenu = (
    <>
      <span className="tav-n-case" aria-hidden="true" />
      <span className="tav-n-titre">
        <span className="tav-n-icone">
          <TavIcone nom={l.icone} />
        </span>
        <span className="tav-n-textes">
          <span className="tav-n-nom">{l.nom}</span>
          <span className="tav-n-resume">{l.resume}</span>
        </span>
      </span>
      <span className="tav-n-statut" data-teinte={l.statut.teinte}>
        <TavIcone nom={l.statut.icone} />
        <span>{l.statut.libelle}</span>
      </span>
      <span className="tav-n-prio" data-prio={l.priorite ?? "aucune"}>
        <TavIcone nom={l.priorite === "urgent" ? "Priority1" : l.priorite === "haute" ? "Priority2" : "Priority0"} />
      </span>
      <span className="tav-n-owner" aria-hidden="true" />
      <span className="tav-n-cible">{l.cible ?? ""}</span>
      <span className="tav-n-projets">{l.projets ? <><TavIcone nom="Project" /><span>{l.projets}</span></> : null}</span>
      <span className="tav-n-sante" data-sante={l.sante}>
        <span />
      </span>
      <span className="tav-n-actifs">{l.actifs ?? ""}</span>
    </>
  );
  return (
    <li>
      {l.onClick ? (
        <button type="button" className="tav-n-ligne" onClick={l.onClick}>
          {contenu}
        </button>
      ) : (
        <div className="tav-n-ligne tav-n-ligne--fixe">{contenu}</div>
      )}
    </li>
  );
}

export default function Reseau() {
  const t = useTavaro();
  const { source, monde, role, moi, moiId, nommer, tous, gestesFlotte, preparation, operations: o, agence, agences, setAgence, nomAgenceDe } = t;
  const toast = useToast();
  const params = useSearchParams();
  const onglet = (ONGLETS.some((x) => x.cle === params.get("onglet")) ? params.get("onglet") : "flotte") as Onglet;
  const directionLarge = role === "gerant" || role === "admin" || role === "valideur";
  const direction = role === "gerant" || role === "admin";

  const enVigueur = useMemo(() => [...(monde?.baremes ?? [])].filter((b) => b.statut === "publie").sort((x, y) => y.date_effet.localeCompare(x.date_effet))[0], [monde]);
  const bareme = useMemo(() => (monde?.lignesBareme ?? []).filter((l) => l.bareme_id === enVigueur?.id), [monde, enVigueur]);
  const audit = useAuditEtat({ source, role, moi: moiId, dossiers: tous, bareme, reglages: monde?.reglages ?? null });
  const flotte = useFlotteEtat({ flotte: monde?.flotte ?? null, role, moi: moiId, nommer, gestes: gestesFlotte });
  const { analyses, noterUneCote } = useAnalyses(source, moi, role);
  const [vehiculeCote, setVehiculeCote] = useState<VehiculePlan | null>(null);
  const [sortie, setSortie] = useState<SortieFlotte | null>(null);
  const [tournee, setTournee] = useState<string | null>(null);
  const [auditOuvert, setAuditOuvert] = useState(false);
  const [prepOuverte, setPrepOuverte] = useState(false);
  const [confirmer, setConfirmer] = useState<{ titre: string; texte: string; bouton: string; faire: () => Promise<string | void> } | null>(null);
  const [envoiConf, setEnvoiConf] = useState(false);
  const [erreurConf, setErreurConf] = useState<string | null>(null);

  /* les messages « C'est fait » des crochets : un toast */
  useEffect(() => {
    for (const [m, effacer] of [[flotte.fait, flotte.setFait], [audit.fait, audit.setFait], [o.fait, o.setFait]] as const) {
      if (m) {
        toast(`C'est fait. ${m}`, "vert");
        const x = window.setTimeout(() => effacer(null), 0);
        return () => window.clearTimeout(x);
      }
    }
  }, [flotte.fait, flotte.setFait, audit.fait, audit.setFait, o.fait, o.setFait, toast]);

  const lancer = async () => {
    if (!confirmer) return;
    setEnvoiConf(true);
    setErreurConf(null);
    try {
      const m = await confirmer.faire();
      if (m) toast(`C'est fait. ${m}`, "vert");
      setConfirmer(null);
    } catch (e) {
      setErreurConf(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoiConf(false);
    }
  };

  const ficheDe = (vehicule: string) => flotte.fiches.find((f: FicheVehicule) => f.vehicule === vehicule) ?? null;
  const nomCourt = (e: string | null | undefined) => (e ? (nomAgenceDe(e).split(" — ").pop() ?? "") : "");

  /* ——— les lignes de chaque onglet ——— */
  const lignes: Ligne[] = [];
  let avis: string | null = null;
  let nouveau: { libelle: string; action: () => void; actif: boolean } | null = null;
  if (onglet === "flotte") {
    if (!directionLarge) avis = "La flotte (fiche économique, mises en vente) est réservée à la direction et aux valideurs.";
    else if (!monde?.flotte) avis = "Aucune fiche de véhicule pour l'instant.";
    else {
      for (const f of flotte.fiches) {
        const s = flotte.sortieDe(f.vehicule);
        lignes.push({
          cle: f.vehicule,
          icone: "Car",
          nom: `${f.immatriculation}${f.modele ? ` — ${f.modele}` : ""}`,
          resume: `Marge sur 12 mois ${montant(f.marge)} · loué ${f.utilisation_pct.toLocaleString("fr-FR")} % · ${f.km !== null ? `${Math.round(f.km).toLocaleString("fr-FR")} km` : "km inconnus"}${f.jours_immobilises ? ` · ${Math.round(f.jours_immobilises)} j immobilisé` : ""}${s ? ` · ${STATUTS_SORTIE[s.statut].libelle.toLowerCase()}` : ""}`,
          statut: { libelle: AVIS_FLOTTE[f.avis].libelle, icone: f.avis === "garder" ? "IssueStatusStarted" : f.avis === "sortir" ? "StatusCanceled" : "IssueStatusTodo", teinte: f.avis === "garder" ? "jaune" : f.avis === "sortir" ? "rouge" : "gris" },
          priorite: f.avis === "sortir" ? "urgent" : f.avis === "restituer" ? "haute" : "aucune",
          cible: f.moment ?? null,
          projets: CANAUX[f.canal],
          sante: f.marge < 0 ? "rouge" : "vert",
          actifs: f.cote ? montant(f.cote.eur) : f.financement === "lld" || f.financement === "loa" ? f.financement.toUpperCase() : "cote à saisir",
          onClick: () => flotte.ouvrir(f),
        });
      }
      for (const s of flotte.sorties)
        lignes.push({
          cle: `sortie:${s.id}`,
          icone: "Signature",
          nom: `Mise en vente — ${s.fiche.immatriculation}`,
          resume: `${s.motif} · proposée le ${dateHeure(s.propose_le)} par ${nommer(s.propose_par)}${s.decide_le ? ` · validée le ${dateCourte(s.decide_le)} par ${nommer(s.decide_par)}` : ""}${s.vendu_le ? ` · vendue le ${dateCourte(s.vendu_le)}${s.acheteur ? ` à ${s.acheteur}` : ""}` : ""}`,
          statut: { libelle: STATUTS_SORTIE[s.statut].libelle, icone: s.statut === "proposee" ? "IssueStatusTriage" : s.statut === "validee" ? "IssueStatusStarted" : "IssueStatusDone", teinte: s.statut === "validee" ? "jaune" : s.statut === "proposee" ? "gris" : "violet" },
          priorite: s.statut === "proposee" ? "haute" : "aucune",
          cible: s.vendu_le ? dateCourte(s.vendu_le) : null,
          projets: CANAUX[s.canal],
          sante: "vide",
          actifs: s.prix_vente_eur !== null ? montant(s.prix_vente_eur) : s.prix_vise_eur !== null ? `visé ${montant(s.prix_vise_eur)}` : null,
          onClick: s.statut === "proposee" || s.statut === "validee" ? () => setSortie(s) : undefined,
        });
    }
  } else if (onglet === "plan") {
    const plan = analyses?.plan;
    if (source === "reelle" && !direction) avis = "Le plan de flotte porte sur tout le réseau : seuls le gérant et l'administrateur le voient.";
    else if (!plan) avis = "Lecture du plan de flotte…";
    else {
      avis = `Plan ${plan.annee}, sur les ${plan.periode.mois} derniers mois, utilisation visée ${pct(plan.cible_utilisation)} : ${plan.totaux.acheter} à acheter, ${plan.totaux.renouveler} à renouveler, ${plan.totaux.vendre} à vendre, ${plan.totaux.deplacer} à déplacer${plan.totaux.entretien_flotte_eur !== undefined ? ` ; revente ${montant(plan.totaux.valeur_revente_a_vendre_eur ?? 0)}, ${plan.totaux.cotes_manquantes ?? 0} cote(s) à noter, entretien ${montant(plan.totaux.entretien_flotte_eur)}` : ""}.`;
      for (const ag of plan.agences.filter((x) => !agence || x.entite_id === agence))
        for (const l of ag.categories) {
          const decisions = [l.acheter ? `acheter ${l.acheter}` : null, l.renouveler ? `renouveler ${l.renouveler}` : null, l.vendre ? `vendre ${l.vendre}` : null, l.deplacer.length ? l.deplacer.map((d) => `${d.n} vers ${d.vers}`).join(", ") : null, l.recevoir ? `reçoit ${l.recevoir}` : null].filter(Boolean);
          lignes.push({
            cle: `${ag.entite_id}-${l.categorie_id}`,
            icone: "Initiative",
            nom: `${ag.agence} · ${l.categorie} ${l.libelle}`,
            resume: l.raison,
            statut: { libelle: decisions.length ? (l.acheter ? "Acheter" : l.vendre ? "Vendre" : l.renouveler ? "Renouveler" : "Déplacer") : "Garder", icone: decisions.length ? "IssueStatusTodo" : "IssueStatusStarted", teinte: decisions.length ? "gris" : "jaune" },
            priorite: l.acheter || l.vendre ? "haute" : "aucune",
            cible: decisions.join(" · ") || null,
            projets: `${l.flotte}`,
            sante: l.utilisation !== null && l.utilisation >= plan.cible_utilisation ? "vert" : "rouge",
            actifs: `${pct(l.utilisation)} · il en faut ${l.cible}`,
          });
          for (const v of l.vehicules ?? []) {
            const f = ficheDe(v.vehicule_id);
            lignes.push({
              cle: `v:${v.vehicule_id}`,
              icone: "Car",
              nom: `${v.immatriculation}${v.age_ans !== null ? ` — ${String(v.age_ans).replace(".", ",")} ans` : ""}${v.km !== null ? `, ${new Intl.NumberFormat("fr-FR").format(v.km)} km` : ""}`,
              resume: `Entretien ${montant(v.entretien_eur)}${v.interventions ? ` (${v.interventions} passage${v.interventions > 1 ? "s" : ""}, ${v.jours_hors_service} j hors service)` : ""} · ${v.jours_loues} j loués · ${v.raison}`,
              statut: { libelle: v.decision === "vendre" ? "À vendre" : "À renouveler", icone: "IssueStatusTodo", teinte: v.decision === "vendre" ? "rouge" : "gris" },
              priorite: v.cote_eur === null ? "haute" : "aucune",
              cible: v.cote_le ? dateCourte(v.cote_le) : null,
              projets: `${ag.agence} · ${l.categorie}`,
              sante: v.cote_eur === null || v.cote_ancienne ? "rouge" : "vert",
              actifs: v.cote_eur !== null ? montant(v.cote_eur) : "cote à noter",
              /* une seule entrée pour la cote : la fiche du véhicule quand elle existe, la cote du plan sinon */
              onClick: f && directionLarge ? () => flotte.ouvrir(f) : direction || source === "exemple" ? () => setVehiculeCote(v) : undefined,
            });
          }
        }
    }
  } else if (onglet === "transferts") {
    nouveau = { libelle: "Proposer les transferts", actif: o.direction && !o.envoi, action: () => setConfirmer({ titre: "Proposer les transferts du prochain pic", texte: "Les réservations sans véhicule d'une agence sont couvertes par les véhicules libres d'une autre, la veille du prochain pic : Tavaro propose les tournées, la direction les valide.", bouton: "Proposer les transferts", faire: () => o.proposer() }) };
    avis = "Les réservations sans véhicule d'une agence, couvertes par les véhicules libres d'une autre, la veille du prochain pic.";
    for (const [nom, liste] of o.tournees) {
      if (agence && !liste.some((x) => x.origine_entite_id === agence || x.destination_entite_id === agence)) continue;
      const propose = liste.some((x) => x.statut === "propose");
      lignes.push({
        cle: nom,
        icone: "Routing",
        nom,
        resume: `${liste.map((x) => `${o.immat(x.vehicule_id)} ${nomCourt(x.origine_entite_id)} → ${nomCourt(x.destination_entite_id)}`).join(" · ")}`,
        statut: { libelle: propose ? "Proposée" : "Validée", icone: propose ? "IssueStatusTriage" : "IssueStatusStarted", teinte: propose ? "gris" : "jaune" },
        priorite: propose ? "haute" : "aucune",
        cible: dateHeure(liste[0].pour_le),
        projets: `${liste.length}`,
        sante: "vide",
        actifs: null,
        onClick: () => setTournee(nom),
      });
    }
  } else {
    if (!directionLarge) avis = "L'audit des retours et la préparation à la facture électronique sont réservés à la direction et aux valideurs.";
    else {
      nouveau = { libelle: "Ouvrir un audit", actif: true, action: () => { audit.setErreur(null); audit.setFait(null); audit.setNom(""); } };
      const ind = audit.indicateur;
      lignes.push({
        cle: "indicateur",
        icone: "BarChart",
        nom: "Indicateur du mois",
        resume: `Ce mois-ci ${ind?.pour_100_retours !== null && ind?.pour_100_retours !== undefined ? montant(ind.pour_100_retours) : "—"} facturés pour 100 retours (${ind?.retours ?? 0} rendus) · avant Tavaro ${ind?.avant_pour_100_retours !== null && ind?.avant_pour_100_retours !== undefined ? montant(ind.avant_pour_100_retours) : "—"}${ind?.audit ? ` (« ${ind.audit} »)` : ""} · avoirs du mois ${montant(ind?.avoirs_ttc ?? 0)}`,
        statut: { libelle: ind?.mois ?? "—", icone: "Calendar", teinte: "gris" },
        cible: null,
        sante: ind?.pour_100_retours !== null && ind?.avant_pour_100_retours !== null && ind?.pour_100_retours !== undefined && ind?.avant_pour_100_retours !== undefined ? (ind.pour_100_retours >= ind.avant_pour_100_retours ? "vert" : "rouge") : "vide",
      });
      for (const a of audit.audits) {
        const ls = (audit.donnees?.lignes ?? []).filter((x) => x.audit_id === a.id);
        const ecart = ls.reduce((s, l) => s + l.chiffre_ttc - l.facture_historique_ttc, 0);
        lignes.push({
          cle: a.id,
          icone: "Checklist",
          nom: a.libelle,
          resume: `${ls.length} retour${ls.length > 1 ? "s" : ""} rechiffré${ls.length > 1 ? "s" : ""} sur le barème · écart ${montant(ecart)}`,
          statut: { libelle: a.statut === "clos" ? "Clos" : "Ouvert", icone: a.statut === "clos" ? "IssueStatusDone" : "IssueStatusStarted", teinte: a.statut === "clos" ? "violet" : "jaune" },
          cible: a.clos_le ? dateCourte(a.clos_le) : null,
          projets: `${ls.length}`,
          sante: ecart > 0 ? "rouge" : "vert",
          onClick: () => { audit.setChoix(a.id); setAuditOuvert(true); },
        });
      }
      if (preparation) {
        const pret = preparation.emetteur.siren && preparation.emetteur.numero_tva && preparation.emetteur.adresse && preparation.clients_pro_sans_siren === 0;
        lignes.push({
          cle: "2027",
          icone: "Page",
          nom: "Facture électronique : prêt pour le 1er septembre 2027 ?",
          resume: `SIREN ${preparation.emetteur.siren ? "valide" : "à corriger"} · TVA ${preparation.emetteur.numero_tva ? "renseignée" : "à renseigner"} · adresse ${preparation.emetteur.adresse ? "complète" : "à compléter"} · ${preparation.clients_pro_sans_siren} client(s) professionnel(s) sans SIREN`,
          statut: { libelle: pret ? "Prêt" : "À corriger", icone: pret ? "IssueStatusDone" : "IssueStatusTodo", teinte: pret ? "violet" : "gris" },
          cible: dateCourte(preparation.echeance_emission),
          projets: `${preparation.pieces_90_jours.reduce((s, x) => s + x.prets, 0)} / ${preparation.pieces_90_jours.reduce((s, x) => s + x.n, 0)}`,
          sante: pret ? "vert" : "rouge",
          onClick: () => setPrepOuverte(true),
        });
      }
    }
  }

  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agence === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agence === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];
  const transfertsDe = tournee ? (o.tournees.find(([n]) => n === tournee)?.[1] ?? []) : [];
  const auditChoisi = audit.audit;
  const lignesAudit = audit.lignes;

  return (
    <TavCarte>
      <h1 className="v2-sr">Réseau et flotte</h1>
      <header className="tav-tete">
        <div className="tav-ligne1 tav-n-ligne1">
          <span className="tav-n-page">Réseau et flotte</span>
          <span className="tav-pousse" />
          {nouveau ? (
            <button type="button" className="tav-n-nouveau" disabled={!nouveau.actif} onClick={nouveau.action}>
              <TavIcone nom="Plus" taille={14} />
              <span>{nouveau.libelle}</span>
            </button>
          ) : null}
        </div>
        <nav className="tav-ligne2 tav-n-ligne2" aria-label="Sujets">
          <span className="tav-n-onglets">
            {ONGLETS.map((x) => (
              <Link key={x.cle} href={`${BASE}/reseau?onglet=${x.cle}`} scroll={false} className="tav-onglet tav-n-onglet" aria-current={onglet === x.cle ? "page" : undefined}>
                {x.libelle}
              </Link>
            ))}
          </span>
          <span className="tav-pousse" />
          {agences.length > 1 ? <TavMenu libelle="Filtrer par agence" icone="Filtre" alignement="droite" options={optionsAgence} /> : null}
          <Link href={`${BASE}/reglages`} className="tav-rond tav-rond--plein" aria-label="Réglages" title="Réglages">
            <TavIcone nom="Roue" />
          </Link>
        </nav>
      </header>
      <div className="tav-defile">
        <div className="tav-n-entete" aria-hidden="true">
          <span />
          <span />
          <span className="tav-n-col">Nom</span>
          <span className="tav-n-col">Statut</span>
          <span className="tav-n-col">Priorité</span>
          <span className="tav-n-col">Resp.</span>
          <span className="tav-n-col">{onglet === "plan" ? "Décision" : onglet === "transferts" ? "Avant le" : "Échéance"}</span>
          <span className="tav-n-col">{onglet === "flotte" ? "Canal" : onglet === "plan" ? "Flotte" : onglet === "transferts" ? "Véhicules" : "Retours"}</span>
          <span className="tav-n-col">Santé</span>
          <span className="tav-n-col">{onglet === "flotte" ? "Cote" : onglet === "plan" ? "Utilisation" : ""}</span>
        </div>
        {avis ? <p className="tav-n-avis">{avis}</p> : null}
        <ul className="tav-n-lignes">
          {lignes.map((l) => (
            <LigneInitiative key={l.cle} l={l} />
          ))}
        </ul>
      </div>

      <FenetresFlotte f={flotte} />
      <FenetresAudit a={audit} />
      <FenetreOperations o={o} />
      <DialogueCote vehicule={vehiculeCote} fermer={() => setVehiculeCote(null)} noter={noterUneCote} />

      {/* ——— une mise en vente : valider (G60, confirmé), refuser (F29), vente conclue (F30), retirer (G63, confirmé) ——— */}
      <Dialog open={!!sortie} onOpenChange={(x) => !x && setSortie(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Route width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Mise en vente de {sortie?.fiche.immatriculation}</DialogTitle>
            <DialogDescription>{sortie ? `${sortie.motif} · ${CANAUX[sortie.canal]}${sortie.prix_vise_eur !== null ? ` · visé ${montant(sortie.prix_vise_eur)}` : ""}. Une autre personne de la direction valide ce qu'une personne a proposé.` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>{flotte.erreur ? <Avis teinte="rouge" role="alert">{flotte.erreur}</Avis> : null}</DialogBody>
          <DialogFooter>
            {sortie?.statut === "proposee" ? (
              <>
                <button type="button" className="r-btn r-btn--fil" disabled={!direction || sortie.propose_par === moiId} onClick={() => { const s = sortie; setSortie(null); flotte.setErreur(null); flotte.setRefus({ s, motif: "" }); }}>
                  Refuser
                </button>
                <button type="button" className="r-btn r-btn--noir" disabled={!direction || sortie.propose_par === moiId || flotte.envoi !== null} title={!direction ? "La direction seule valide une mise en vente" : sortie.propose_par === moiId ? "Une autre personne de la direction valide ce que vous avez proposé" : undefined} onClick={() => { const s = sortie; void flotte.agir(`v:${s.id}`, async () => { await gestesFlotte.decider(s, true, null); return `La mise en vente de ${s.fiche.immatriculation} est validée.`; }).then(() => setSortie(null)); }}>
                  {flotte.envoi ? <Loader variant="spin" /> : null} Valider la mise en vente
                </button>
              </>
            ) : sortie ? (
              <button type="button" className="r-btn r-btn--noir" onClick={() => { const s = sortie; setSortie(null); flotte.setErreur(null); flotte.setVente({ s, prix: s.prix_vise_eur !== null ? String(s.prix_vise_eur) : "", le: aujourdhui(), acheteur: "" }); }}>
                Vente conclue
              </button>
            ) : null}
            {sortie ? (
              <button type="button" className="r-btn r-btn--fil" disabled={flotte.envoi !== null || !(sortie.propose_par === moiId || direction)} onClick={() => { const s = sortie; setSortie(null); setConfirmer({ titre: `Retirer la mise en vente de ${s.fiche.immatriculation}`, texte: "La mise en vente est retirée : le véhicule reste dans la flotte.", bouton: "Retirer", faire: async () => { await gestesFlotte.annuler(s, "Retirée depuis l'écran de la flotte"); return `La mise en vente de ${s.fiche.immatriculation} est retirée.`; } }); }}>
                Retirer
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— une tournée : arrivé (G27), valider ou refuser (G28) ——— */}
      <Dialog open={!!tournee} onOpenChange={(x) => !x && setTournee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Route width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{tournee}</DialogTitle>
            <DialogDescription>{transfertsDe.length ? `${transfertsDe.length} véhicule${transfertsDe.length > 1 ? "s" : ""}, à déplacer avant le ${dateHeure(transfertsDe[0].pour_le)}.` : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="esp-liste">
              {transfertsDe.map((x) => (
                <li key={x.id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut">
                    <strong>{o.immat(x.vehicule_id)}</strong>
                    <span>
                      {nomCourt(x.origine_entite_id)} → {nomCourt(x.destination_entite_id)} · il manque {x.motif.manque ?? "?"} véhicule(s) à l&apos;arrivée
                    </span>
                    {x.statut === "valide" ? (
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!o.agence} onClick={() => { setTournee(null); o.arrive(x); }}>
                        Arrivé
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {o.erreur ? <Avis teinte="rouge" role="alert">{o.erreur}</Avis> : null}
          </DialogBody>
          {transfertsDe.some((x) => x.statut === "propose") && tournee ? (
            <DialogFooter>
              <button type="button" className="r-btn r-btn--fil" disabled={!o.direction || o.envoi} onClick={() => void o.decider(tournee, false).then(() => setTournee(null))}>
                Refuser
              </button>
              <button type="button" className="r-btn r-btn--noir" disabled={!o.direction || o.envoi} onClick={() => void o.decider(tournee, true).then(() => setTournee(null))}>
                {o.envoi ? <Loader variant="spin" /> : null} Valider la tournée
              </button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ——— un audit (B35) : ses retours, ajouter (F18), clore (G46, confirmé) ——— */}
      <Dialog open={auditOuvert && !!auditChoisi} onOpenChange={setAuditOuvert}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone>
              <Route width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{auditChoisi?.libelle}</DialogTitle>
            <DialogDescription>
              {auditChoisi ? `${auditChoisi.statut === "clos" ? `Clos le ${dateCourte(auditChoisi.clos_le)}` : "Ouvert"} · ${lignesAudit.length} retour(s), ${audit.sousFactures} sous-facturé(s) · facturé à l'époque ${montant(audit.total((l) => l.facture_historique_ttc))}, sur le barème ${montant(audit.total((l) => l.chiffre_ttc))}, écart ${montant(audit.total((l) => l.chiffre_ttc - l.facture_historique_ttc))}${Object.entries(audit.parFamille).filter(([, v]) => v > 0).length ? ` (${Object.entries(audit.parFamille).filter(([, v]) => v > 0).map(([f, v]) => `${FAMILLES_AUDIT[f] ?? f} ${montant(v)}`).join(", ")})` : ""}. Rien n'est facturé pendant l'audit.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="esp-liste">
              {lignesAudit.map((l) => (
                <li key={l.id} className="esp-item" style={{ cursor: "default" }}>
                  <span className="esp-item-haut">
                    <strong>{audit.numero(l.contrat_id)}</strong>
                    <span>
                      facturé à l&apos;époque {montant(l.facture_historique_ttc)} · sur le barème {montant(l.chiffre_ttc)}
                      {l.statut_chiffrage === "preuve_manquante" ? " · preuve manquante" : ""}
                    </span>
                    <span className="esp-item-montant">{montant(l.chiffre_ttc - l.facture_historique_ttc)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </DialogBody>
          {auditChoisi?.statut === "ouvert" ? (
            <DialogFooter>
              <button type="button" className="r-btn r-btn--fil" disabled={!direction || audit.envoi || lignesAudit.length === 0} title={direction ? undefined : "La direction clôt l'audit"} onClick={() => { setAuditOuvert(false); setConfirmer({ titre: `Clore l'audit « ${auditChoisi.libelle} »`, texte: "L'audit clos devient l'« avant » de l'indicateur du mois ; on n'y ajoute plus de retour.", bouton: "Clore l'audit", faire: async () => { await audit.clore(); } }); }}>
                Clore l&apos;audit
              </button>
              <button type="button" className="r-btn r-btn--noir" disabled={lignesAudit.length >= 100} onClick={() => { setAuditOuvert(false); audit.setErreur(null); audit.setFait(null); audit.setSaisie({ contrat: "", historique: "", retour: "", km: "", dep8: "", ret8: "", dommages: [] }); }}>
                Ajouter un retour
              </button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ——— B47 : la préparation au 1er septembre 2027 ——— */}
      <Dialog open={prepOuverte && !!preparation} onOpenChange={setPrepOuverte}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Route width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Facture électronique : prêt pour le 1er septembre 2027 ?</DialogTitle>
            <DialogDescription>À partir du {preparation ? dateCourte(preparation.echeance_emission) : ""}, vos factures aux clients professionnels partent sous forme électronique ; voici ce qui reste à corriger.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {preparation ? (
              <ul className="esp-liste">
                <li className="esp-item" style={{ cursor: "default" }}>Votre SIREN : {preparation.emetteur.siren ? "valide" : "à corriger"}</li>
                <li className="esp-item" style={{ cursor: "default" }}>Votre numéro de TVA : {preparation.emetteur.numero_tva ? "renseigné" : "à renseigner"}</li>
                <li className="esp-item" style={{ cursor: "default" }}>Votre adresse : {preparation.emetteur.adresse ? "complète" : "à compléter (code postal et ville)"}</li>
                <li className="esp-item" style={{ cursor: "default" }}>Clients professionnels sans SIREN : {preparation.clients_pro_sans_siren}</li>
                {preparation.pieces_90_jours.map((x) => (
                  <li key={x.flux} className="esp-item" style={{ cursor: "default" }}>
                    Pièces des 90 derniers jours ({x.flux}) : {x.prets} prête{x.prets > 1 ? "s" : ""} sur {x.n}
                  </li>
                ))}
              </ul>
            ) : null}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmer} onOpenChange={(x) => !x && setConfirmer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Route width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{confirmer?.titre}</DialogTitle>
            <DialogDescription>{confirmer?.texte}</DialogDescription>
          </DialogHeader>
          <DialogBody>{erreurConf ? <Avis teinte="rouge" role="alert">{erreurConf}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoiConf} onClick={lancer}>
              {envoiConf ? <Loader variant="spin" /> : null} {confirmer?.bouton}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TavCarte>
  );
}
