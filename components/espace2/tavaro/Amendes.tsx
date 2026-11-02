"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — Amendes, péages, contestations (02/11/2026, refonte des pages
   métiers)

   Le Triage de Linear (liste + élément ouvert), au 1:1 : relevé
   docs/refonte-metiers/releves/linear-triage.md, styles ./tav-triage.css
   (préfixe tav-r-). Les trois sujets à délai légal de l'écran d'avant dans
   une seule file, la plus urgente d'abord :
     · B36 les avis de contravention (45 jours pour désigner) ;
     · B37 les contestations bancaires (le délai de la banque) ;
     · B28 les péages en flux libre (72 heures pour payer, puis refacturer).
   Une ligne de Triage par objet : titre, référence à droite ; dessous le
   sujet (à la place de l'auteur), l'échéance (puce de date, rouge quand
   elle est dépassée), la priorité (urgent sous 3 jours) et l'âge.
   À droite, l'élément ouvert : fil, quatre ronds d'action à la place de
   Accept / Decline / Duplicate / Snooze, titre, pilules de propriétés,
   description, activité.
   Gestes : G47-G51 (avis), G52-G55 et L8 (contestations), G29-G34
   (péages). G31, G51 et G54 écrivaient au premier clic : confirmés.
   Fenêtres F19-F25 : ./FenetresAmendes ; F16 : ./operations.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Receipt } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace/format";
import { nomLocataire } from "@/components/espace/tavaro/etats";
import type { AvisContravention, Contestation } from "@/components/espace/tavaro/types";
import type { Passage } from "@/components/espace/tavaro/operations";
import { useToast } from "../Toasts";
import { useTavaro } from "./donnees";
import { FenetreOperations, STATUTS_PASSAGE } from "./operations";
import { FenetresAvis, FenetresContestations, STATUTS_AVIS, STATUTS_CONTESTATION, joursAvant, ouverte, type DemandeAvis, type DemandeContestation } from "./FenetresAmendes";
import { TavCarte, TavMenu, type OptionMenu } from "./TavCadre";
import { TavIcone, type NomTavIcone } from "./TavIcone";
import { BASE } from "./VueEnsemble";
import "./tav-inbox.css";
import "./tav-ticket.css";
import "./tav-triage.css";

type Genre = "avis" | "contestation" | "peage";
type Element = {
  cle: string;
  genre: Genre;
  titre: string;
  ref: string;
  sujet: string;
  echeance: string | null;
  /* jours avant l'échéance (négatif : dépassée) */
  jours: number | null;
  ouvert: boolean;
  quand: string;
  entite: string | null;
  avis?: AvisContravention;
  k?: Contestation;
  p?: Passage;
};
const GENRES: { cle: Genre; libelle: string; icone: NomTavIcone }[] = [
  { cle: "avis", libelle: "Avis de contravention", icone: "Flag" },
  { cle: "contestation", libelle: "Contestation bancaire", icone: "Bank" },
  { cle: "peage", libelle: "Péage en flux libre", icone: "Routing" },
];
const genre = (g: Genre) => GENRES.find((x) => x.cle === g)!;
/* l'âge court de Linear (« 1h ago », « 3d ago ») : « 1 h », « 3 j » */
function age(iso: string, maintenant: number): string {
  const s = (maintenant - Date.parse(iso)) / 1000;
  if (s < 0) return "à venir";
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

export default function Amendes() {
  const { pret, monde, tous: dossiers, role, nommer, nomAgenceDe, agences, agence, setAgence, gestesAvis, gestesContestations, operations: o } = useTavaro();
  const toast = useToast();
  const params = useSearchParams();
  const routeur = useRouter();
  const vue = params.get("vue") === "traites" ? "traites" : "a_traiter";
  const filtreGenre = (GENRES.some((g) => g.cle === params.get("sujet")) ? params.get("sujet") : null) as Genre | null;
  const choix = params.get("element");
  const [demandeAvis, setDemandeAvis] = useState<DemandeAvis>(null);
  const [demandeK, setDemandeK] = useState<DemandeContestation>(null);
  const [confirmer, setConfirmer] = useState<{ titre: string; texte: string; bouton: string; faire: () => Promise<string> } | null>(null);
  const [envoiConf, setEnvoiConf] = useState(false);
  const [erreurConf, setErreurConf] = useState<string | null>(null);
  const [monte, setMonte] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMonte(true), 0);
    return () => window.clearTimeout(t);
  }, []);
  const avisDemande = (quoi: NonNullable<DemandeAvis>["quoi"], avis?: AvisContravention) => setDemandeAvis((d) => ({ quoi, avis, n: (d?.n ?? 0) + 1 }));
  const kDemande = (quoi: NonNullable<DemandeContestation>["quoi"], k?: Contestation, issue?: "gagnee" | "perdue" | "abandonnee") => setDemandeK((d) => ({ quoi, k, issue, n: (d?.n ?? 0) + 1 }));
  const onFait = useCallback((m: string) => toast(`C'est fait. ${m}`, "vert"), [toast]);
  useEffect(() => {
    if (o.fait) {
      toast(`C'est fait. ${o.fait}`, "vert");
      const t = window.setTimeout(() => o.setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [o, toast]);

  const peutSaisir = role === "gerant" || role === "admin" || role === "valideur" || role === "collaborateur";
  const peutDesigner = role === "gerant" || role === "admin" || role === "valideur";
  const direction = role === "gerant" || role === "admin";
  const dossierDe = (contrat: string | null | undefined) => dossiers.find((d) => d.contrat.id === contrat) ?? null;

  /* ——— la file : un élément par avis, contestation et passage, la plus urgente d'abord ——— */
  const tousElements = useMemo<Element[]>(() => {
    if (!monte) return [];
    const l: Element[] = [];
    for (const a of monde?.avis ?? []) {
      const ouvertA = a.statut === "a_rapprocher" || a.statut === "a_designer";
      l.push({ cle: `avis:${a.id}`, genre: "avis", titre: `${a.nature ?? "Infraction"}${a.lieu ? ` — ${a.lieu}` : ""}`, ref: a.immatriculation, sujet: STATUTS_AVIS[a.statut].libelle, echeance: ouvertA ? a.echeance_le : null, jours: ouvertA ? joursAvant(a.echeance_le) : null, ouvert: ouvertA, quand: a.cree_le, entite: a.entite_id, avis: a });
    }
    for (const k of monde?.contestations ?? []) {
      const enCours = ouverte(k);
      l.push({ cle: `contestation:${k.id}`, genre: "contestation", titre: k.motif_banque, ref: k.reference_banque, sujet: STATUTS_CONTESTATION[k.statut].libelle, echeance: enCours && k.statut !== "envoyee" ? k.repondre_avant : null, jours: enCours && k.statut !== "envoyee" ? joursAvant(k.repondre_avant) : null, ouvert: enCours, quand: k.cree_le, entite: k.entite_id, k });
    }
    for (const p of o.ops.passages) {
      const enCours = p.statut === "a_payer" || (p.statut === "paye" && !p.refacture_proposition_id);
      const h = p.statut === "a_payer" ? (Date.parse(p.payer_avant) - o.maintenant) / 86_400_000 : null;
      l.push({ cle: `peage:${p.id}`, genre: "peage", titre: `${p.operateur}${p.portique ? ` — ${p.portique}` : ""}, ${montant(p.montant_eur)}`, ref: p.immatriculation, sujet: STATUTS_PASSAGE[p.statut].libelle, echeance: p.statut === "a_payer" ? p.payer_avant.slice(0, 10) : null, jours: h === null ? null : Math.floor(h), ouvert: enCours, quand: p.passe_le, entite: p.entite_id, p });
    }
    return l.sort((x, y) => (x.jours ?? 9999) - (y.jours ?? 9999) || y.quand.localeCompare(x.quand));
  }, [monte, monde, o.ops.passages, o.maintenant]);
  const elements = useMemo(() => tousElements.filter((e) => (vue === "a_traiter" ? e.ouvert : !e.ouvert) && (!filtreGenre || e.genre === filtreGenre) && (!agence || e.entite === agence)), [tousElements, vue, filtreGenre, agence]);
  /* un repère (aiguillage.ts) peut viser un élément déjà traité : on le cherche dans toute la file */
  const element = tousElements.find((e) => e.cle === choix) ?? null;

  const adresse = useCallback(
    (v: string, g: Genre | null, el: string | null) => {
      const q = new URLSearchParams();
      if (v === "traites") q.set("vue", "traites");
      if (g) q.set("sujet", g);
      if (el) q.set("element", el);
      const s = q.toString();
      return `${BASE}/amendes${s ? `?${s}` : ""}`;
    },
    [],
  );
  const ouvrir = useCallback((e: Element | null) => routeur.replace(adresse(vue, filtreGenre, e?.cle ?? null), { scroll: false }), [routeur, adresse, vue, filtreGenre]);
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      const cible = ev.target as HTMLElement | null;
      if (cible && cible.closest("input, textarea, select, [role=dialog], [role=menu]")) return;
      if (ev.key === "Escape" && element) return ouvrir(null);
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      ev.preventDefault();
      const i = element ? elements.indexOf(element) : -1;
      const e = elements[ev.key === "ArrowDown" ? Math.min(elements.length - 1, i + 1) : Math.max(0, i - 1)];
      if (e) ouvrir(e);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [element, elements, ouvrir]);

  const lancerConfirme = async () => {
    if (!confirmer) return;
    setEnvoiConf(true);
    setErreurConf(null);
    try {
      toast(`C'est fait. ${await confirmer.faire()}`, "vert");
      setConfirmer(null);
    } catch (e) {
      setErreurConf(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoiConf(false);
    }
  };
  const telecharger = async (k: Contestation) => {
    const url = await gestesContestations.lien(k);
    if (!url) {
      toast("Dans l'exemple, le dossier n'existe pas en fichier : en base réelle, il se télécharge ici.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.click();
  };

  /* les chiffres des péages (B28) et les créations, dans le menu « … » */
  const aRefacturer = o.contratsARefacturer.filter((c) => !agence || dossierDe(c)?.contrat.entite_id === agence);
  const menu: OptionMenu[] = [
    { libelle: "Enregistrer un avis", icone: "Flag", action: () => avisDemande("saisie") },
    { libelle: "Ouvrir une contestation", icone: "Bank", action: () => kDemande("saisie") },
    { libelle: "Saisir un passage", icone: "Routing", action: o.saisirPassage },
    { libelle: "Importer l'export du compte flotte", icone: "Spreadsheet", action: o.importerPassages },
    "sep",
    { libelle: `Péages à payer : ${o.aPayer.length} (${montant(o.aPayer.reduce((s, p) => s + p.montant_eur, 0))})`, icone: "Routing", href: adresse("a_traiter", "peage", null) },
    { libelle: `Hors délai (72 h) : ${o.enRetard.length}`, icone: "CrossedOutCalendar", href: adresse("a_traiter", "peage", null) },
    ...aRefacturer.map((c) => ({ libelle: `Refacturer les péages de ${dossierDe(c)?.contrat.numero ?? "—"}`, icone: "Euro" as NomTavIcone, action: () => setConfirmer({ titre: `Refacturer les péages du contrat ${dossierDe(c)?.contrat.numero ?? ""}`, texte: "Une proposition de facture est créée pour le locataire ; elle part après sa validation dans « À valider ».", bouton: "Refacturer au locataire", faire: async () => { await o.refacturer(c); return "Les péages sont proposés à la facturation."; } }) })),
  ];
  const optionsFiltre: OptionMenu[] = [
    { libelle: "Tous les sujets", icone: filtreGenre === null ? "IssueStatusDone" : "Inbox", href: adresse(vue, null, null) },
    ...GENRES.map((g) => ({ libelle: g.libelle, icone: (filtreGenre === g.cle ? "IssueStatusDone" : g.icone) as NomTavIcone, href: adresse(vue, g.cle, null) })),
    "sep",
    { libelle: "À traiter", icone: vue === "a_traiter" ? "IssueStatusDone" : "IssueStatusTodo", href: adresse("a_traiter", filtreGenre, null) },
    { libelle: "Traités et clos", icone: vue === "traites" ? "IssueStatusDone" : "Archive", href: adresse("traites", filtreGenre, null) },
  ];
  const optionsAgence: OptionMenu[] = [
    { libelle: "Toutes les agences", icone: agence === null ? "IssueStatusDone" : "Team", action: () => setAgence(null) },
    ...agences.map((a) => ({ libelle: (a.nom ?? a.code).split(" — ").pop() ?? a.code, icone: (agence === a.entite_id ? "IssueStatusDone" : "Team") as NomTavIcone, action: () => setAgence(a.entite_id) })),
  ];

  /* ——— l'élément ouvert ——— */
  type Bouton = { libelle: string; icone: NomTavIcone; action: () => void; actif: boolean; titre?: string };
  const boutons: Bouton[] = [];
  let pilules: { icone: NomTavIcone; texte: string; rouge?: boolean }[] = [];
  let description: React.ReactNode = null;
  let activite: { icone: NomTavIcone; qui: string; quoi: string; quand: string | null }[] = [];
  if (element?.avis) {
    const a = element.avis;
    const d = dossierDe(a.contrat_id);
    const g = a.designation;
    const nom = !g ? null : "effacee_le" in g ? `identité effacée le ${dateCourte(g.effacee_le)} (gardée un an)` : g.type === "societe" ? g.raison_sociale : `${g.prenom} ${g.nom}`;
    if (a.statut === "a_rapprocher" || a.statut === "a_designer") {
      boutons.push({ libelle: "Désigner le conducteur", icone: "AssignTo", action: () => avisDemande("designer", a), actif: peutDesigner, titre: peutDesigner ? undefined : "La désignation engage le représentant légal : la direction ou un valideur la fait" });
      boutons.push({ libelle: a.contrat_id ? "Changer de contrat" : "Rattacher à un contrat", icone: "AddRelation", action: () => avisDemande("rattacher", a), actif: peutSaisir });
      boutons.push({ libelle: "Classer sans désigner", icone: "Archive", action: () => avisDemande("classer", a), actif: direction, titre: direction ? undefined : "Seule la direction classe un avis" });
    }
    if (a.statut === "designe" && a.contrat_id && !a.refacture_proposition_id)
      boutons.push({ libelle: "Refacturer les frais de dossier", icone: "Euro", actif: peutSaisir, action: () => setConfirmer({ titre: `Refacturer les frais de l'avis ${a.numero_avis}`, texte: "Les frais de dossier sont proposés à la facturation du locataire : une autre personne de l'agence valide, puis la facture part avec son courriel.", bouton: "Refacturer les frais", faire: async () => { await gestesAvis.refacturer(a); return `Les frais de dossier de l'avis ${a.numero_avis} sont proposés à la facturation.`; } }) });
    pilules = [
      { icone: "Flag", texte: STATUTS_AVIS[a.statut].libelle },
      ...(element.echeance ? [{ icone: (element.jours ?? 0) < 0 ? ("CrossedOutCalendar" as NomTavIcone) : ("Calendar" as NomTavIcone), texte: `désigner avant le ${dateCourte(a.echeance_le)}`, rouge: (element.jours ?? 0) < 0 }] : []),
      ...(a.montant_eur !== null ? [{ icone: "Euro" as NomTavIcone, texte: montant(a.montant_eur) }] : []),
      { icone: "Page", texte: d ? d.contrat.numero : "sans contrat" },
      ...(a.entite_id ? [{ icone: "Team" as NomTavIcone, texte: nomAgenceDe(a.entite_id).split(" — ").pop() ?? "" }] : []),
    ];
    description = (
      <>
        <p>
          Le {dateHeure(a.infraction_le)}, avis n° {a.numero_avis} envoyé le {dateCourte(a.avis_envoye_le)}. Le représentant légal désigne le conducteur dans les 45 jours qui suivent l&apos;envoi de l&apos;avis ; sinon l&apos;entreprise paie en plus 675 € d&apos;amende de non-désignation.
        </p>
        <p>
          {d ? `Contrat ${d.contrat.numero} (${nomLocataire(d.locataire)}, ${dateCourte(d.contrat.depart_le)} → ${dateCourte(d.contrat.retour_reel_le ?? d.contrat.retour_prevu_le)})${a.rapprochement === "manuel" ? ", rattaché à la main." : ", retrouvé par la plaque et l'heure."}` : a.contrat_id ? "Contrat hors de votre périmètre." : a.candidats > 1 ? `${a.candidats} contrats possibles : choisissez le bon.` : "Aucun contrat en cours à cette heure : véhicule au parc, convoyage, ou plaque mal lue."}
        </p>
        {a.statut === "designe" ? <p>Désigné : {nom}, le {dateCourte(a.designe_le)} par {nommer(a.designe_par)}, {a.mode_designation === "lrar" ? "lettre recommandée" : "en ligne, ANTAI"}{a.reference_designation ? `, réf. ${a.reference_designation}` : ""}{a.hors_delai ? " (hors délai)" : ""}.</p> : null}
        {a.refacture_proposition_id ? <p>Frais de dossier refacturés au locataire : la facture attend la validation de l&apos;agence, puis part avec son courriel.</p> : null}
        {a.statut === "classe" ? <p>Classé le {dateCourte(a.classe_le)} par {nommer(a.classe_par)} : {a.motif_classement}</p> : null}
      </>
    );
    activite = [
      { icone: "Created", qui: a.source === "saisie" ? nommer(a.cree_par) : "L'import", quoi: "a enregistré l'avis", quand: a.cree_le },
      ...(a.designe_le ? [{ icone: "AssignTo" as NomTavIcone, qui: nommer(a.designe_par), quoi: "a désigné le conducteur", quand: a.designe_le }] : []),
      ...(a.classe_le ? [{ icone: "Archive" as NomTavIcone, qui: nommer(a.classe_par), quoi: "a classé l'avis", quand: a.classe_le }] : []),
    ];
  } else if (element?.k) {
    const k = element.k;
    const d = dossierDe(k.contrat_id);
    const f = d?.factures.find((x) => x.id === k.facture_id) ?? null;
    const fortes = k.forces.filter((x) => x.ok).length;
    const agenceOk = peutSaisir;
    if (ouverte(k)) {
      if (k.statut === "dossier_pret") boutons.push({ libelle: "Envoyer le dossier à la banque", icone: "Send", action: () => kDemande("envoyer", k), actif: agenceOk });
      if (k.dossier_piece_id) boutons.push({ libelle: "Télécharger le dossier", icone: "PdfFile", action: () => void telecharger(k), actif: true });
      if (k.statut !== "ouverte") boutons.push({ libelle: "Refaire le dossier", icone: "Refresh", actif: agenceOk, action: () => setConfirmer({ titre: `Refaire le dossier ${k.reference_banque}`, texte: "Le dossier se recompose avec ce que Tavaro sait aujourd'hui (contrat, états des lieux, photos, barème, facture) ; l'ancien est remplacé.", bouton: "Refaire le dossier", faire: async () => { await gestesContestations.produire(k); return `Le dossier de la contestation ${k.reference_banque} se recompose.`; } }) });
      if (k.statut === "envoyee") {
        boutons.push({ libelle: "Contestation gagnée", icone: "IssueStatusDone", action: () => kDemande("issue", k, "gagnee"), actif: peutDesigner });
        boutons.push({ libelle: "Contestation perdue", icone: "StatusCanceled", action: () => kDemande("issue", k, "perdue"), actif: peutDesigner });
      }
      boutons.push({ libelle: "Abandonner la contestation", icone: "Archive", action: () => kDemande("issue", k, "abandonnee"), actif: peutDesigner, titre: peutDesigner ? undefined : "La direction ou un valideur consigne l'issue" });
    } else if (k.dossier_piece_id) boutons.push({ libelle: "Télécharger le dossier", icone: "PdfFile", action: () => void telecharger(k), actif: true });
    pilules = [
      { icone: "Bank", texte: STATUTS_CONTESTATION[k.statut].libelle },
      ...(element.echeance ? [{ icone: (element.jours ?? 0) < 0 ? ("CrossedOutCalendar" as NomTavIcone) : ("Calendar" as NomTavIcone), texte: `répondre avant le ${dateCourte(k.repondre_avant)}`, rouge: (element.jours ?? 0) < 0 }] : []),
      { icone: "Euro", texte: montant(k.montant_eur) },
      { icone: "Page", texte: f ? f.reference : "facture hors périmètre" },
      { icone: "Team", texte: nomAgenceDe(k.entite_id).split(" — ").pop() ?? "" },
    ];
    description = (
      <>
        <p>
          {f ? `Facture ${f.reference} du ${dateCourte(f.date_facture)} (${montant(f.total_ttc)})` : "Facture hors de votre périmètre"}
          {d ? `, contrat ${d.contrat.numero}, ${nomLocataire(d.locataire)}` : ""}. Reçue le {dateCourte(k.recue_le)}, à répondre avant le {dateCourte(k.repondre_avant)} : sans réponse, le débit est perdu.
        </p>
        {k.notes ? <p>{k.notes}</p> : null}
        {k.dossier_le ? <p>Dossier composé le {dateHeure(k.dossier_le)}{k.dossier_pages ? `, ${k.dossier_pages} pages` : ""}{k.dossier_sha256 ? `, empreinte ${k.dossier_sha256.slice(0, 12)}…` : ""}.</p> : null}
        {k.statut === "ouverte" ? <p>Le dossier se compose : contrat, états des lieux, photos, barème, facture.</p> : null}
        {k.envoyee_le ? <p>Envoyé le {dateHeure(k.envoyee_le)} par {nommer(k.envoyee_par)} à {k.adresse_banque} ; le courriel part après validation, comme tout envoi.</p> : null}
        {k.issue_le ? <p>{STATUTS_CONTESTATION[k.statut].libelle} le {dateCourte(k.issue_le)}, consignée par {nommer(k.issue_par)}{k.issue_note ? ` : ${k.issue_note}` : ""}.</p> : null}
      </>
    );
    activite = [
      { icone: "Created", qui: nommer(k.cree_par), quoi: "a ouvert la contestation", quand: k.cree_le },
      ...k.forces.map((x) => ({ icone: (x.ok ? "IssueStatusDone" : "Alert") as NomTavIcone, qui: x.ok ? "Point fort" : "À renforcer", quoi: x.libelle, quand: null })),
      ...(k.envoyee_le ? [{ icone: "Send" as NomTavIcone, qui: nommer(k.envoyee_par), quoi: "a envoyé le dossier", quand: k.envoyee_le }] : []),
      ...(k.issue_le ? [{ icone: "Archive" as NomTavIcone, qui: nommer(k.issue_par), quoi: `a consigné l'issue : ${STATUTS_CONTESTATION[k.statut].libelle.toLowerCase()}`, quand: k.issue_le }] : []),
    ];
    if (k.forces.length) activite.splice(1, 0, { icone: "Checklist", qui: "Le dossier", quoi: `${fortes} point${fortes > 1 ? "s" : ""} fort${fortes > 1 ? "s" : ""} sur ${k.forces.length}`, quand: null });
  } else if (element?.p) {
    const p = element.p;
    const retard = p.statut === "a_payer" && Date.parse(p.payer_avant) < o.maintenant;
    if (p.statut === "a_payer") boutons.push({ libelle: "C'est payé", icone: "IssueStatusDone", action: () => o.payer(p), actif: o.agence });
    if (!p.contrat_id) boutons.push({ libelle: "Rattacher à un contrat", icone: "AddRelation", action: () => o.rattacher(p), actif: o.agence });
    if (p.statut === "paye") boutons.push({ libelle: "Garder à la charge du loueur", icone: "Archive", action: () => o.aLaCharge(p), actif: o.agence });
    if (p.statut === "paye" && p.contrat_id && !p.refacture_proposition_id) {
      const c = p.contrat_id;
      boutons.push({ libelle: "Refacturer au locataire", icone: "Euro", actif: o.agence, action: () => setConfirmer({ titre: `Refacturer les péages du contrat ${dossierDe(c)?.contrat.numero ?? ""}`, texte: "Une proposition de facture est créée pour le locataire ; elle part après sa validation dans « À valider ».", bouton: "Refacturer au locataire", faire: async () => { await o.refacturer(c); return "Les péages sont proposés à la facturation."; } }) });
    }
    pilules = [
      { icone: "Routing", texte: retard ? "hors délai" : STATUTS_PASSAGE[p.statut].libelle, rouge: retard },
      ...(p.statut === "a_payer" ? [{ icone: retard ? ("CrossedOutCalendar" as NomTavIcone) : ("Calendar" as NomTavIcone), texte: `payer avant le ${dateHeure(p.payer_avant)}`, rouge: retard }] : []),
      { icone: "Euro", texte: montant(p.montant_eur) },
      { icone: "Page", texte: p.contrat_id ? o.numero(p.contrat_id) : "aucun contrat" },
    ];
    description = (
      <>
        <p>
          {p.operateur}
          {p.portique ? `, portique ${p.portique}` : ""}, le {dateHeure(p.passe_le)}, référence {p.reference}. Un passage en flux libre se paie dans les 72 heures chez l&apos;opérateur, puis se refacture au locataire du contrat.
        </p>
        {p.statut !== "a_payer" && p.paye_le ? <p>Payé le {dateCourte(p.paye_le)}, référence {p.paiement_reference}.</p> : null}
        {p.a_la_charge_motif ? <p>À la charge du loueur : {p.a_la_charge_motif}</p> : null}
      </>
    );
    activite = [{ icone: "Created", qui: p.operateur, quoi: "a enregistré le passage", quand: p.passe_le }, ...(p.paye_le ? [{ icone: "IssueStatusDone" as NomTavIcone, qui: "L'agence", quoi: "a payé le passage", quand: p.paye_le }] : [])];
  }

  return (
    <TavCarte>
      <h1 className="v2-sr">Amendes, péages, contestations</h1>
      <div className="tav-i">
        <section className="tav-r-liste tav-i-liste" aria-label="Amendes, péages, contestations">
          <header className="tav-i-tete">
            <h2 className="tav-i-titre">{vue === "traites" ? "Traités et clos" : "Amendes et péages"}</h2>
            <TavMenu libelle="Créer, et les péages en chiffres" options={menu} />
            <span className="tav-pousse" />
            <TavMenu libelle="Filtrer par sujet" icone="Filtre" alignement="droite" options={optionsFiltre} />
            {agences.length > 1 ? <TavMenu libelle="Filtrer par agence" icone="Affichage" alignement="droite" options={optionsAgence} /> : null}
          </header>
          <div className="tav-i-defile">
            {!pret || !monte ? (
              <p className="tav-i-avis">Lecture des avis, des contestations et des péages…</p>
            ) : elements.length === 0 ? (
              <p className="tav-i-avis">{vue === "a_traiter" ? "Rien à traiter : les avis reçus, les contestations de la banque et les passages en flux libre arrivent ici avec leur délai." : "Rien de traité pour l'instant."}</p>
            ) : (
              <ul className="tav-i-lignes">
                {elements.map((e) => (
                  <li key={e.cle}>
                    <Link href={adresse(vue, filtreGenre, e.cle)} replace scroll={false} className="tav-r-ligne" aria-current={element?.cle === e.cle ? "true" : undefined}>
                      <span className="tav-r-l1">
                        <span className="tav-r-titre">{e.titre}</span>
                        <span className="tav-r-id">{e.ref}</span>
                      </span>
                      <span className="tav-r-l2">
                        <TavIcone nom={genre(e.genre).icone} taille={16} className="tav-r-genre" />
                        <span className="tav-r-sujet">{e.sujet}</span>
                        <span className="tav-pousse" />
                        {e.echeance ? (
                          <span className="tav-r-date" data-depasse={(e.jours ?? 0) < 0 || undefined}>
                            <TavIcone nom={(e.jours ?? 0) < 0 ? "CrossedOutCalendar" : "Calendar"} taille={14} />
                            <span>{dateCourte(e.echeance).slice(0, 5)}</span>
                          </span>
                        ) : null}
                        {e.jours !== null && e.jours <= 3 ? (
                          <span className="tav-r-prio" aria-label="urgent">
                            <TavIcone nom="Priority1" taille={16} />
                          </span>
                        ) : e.jours !== null && e.jours <= 10 ? (
                          <span className="tav-r-prio tav-r-prio--gris" aria-label="à surveiller">
                            <TavIcone nom="Priority2" taille={16} />
                          </span>
                        ) : null}
                        <span className="tav-r-age">{age(e.quand, o.maintenant)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="tav-i-droite" aria-label="Élément ouvert">
          {element ? (
            <div className="tav-t" data-volet="">
              <header className="tav-t-tete">
                <nav className="tav-t-fil" aria-label="Fil d'Ariane">
                  <Link href={adresse(vue, filtreGenre, element.cle)} replace className="tav-t-fil-ticket" aria-current="page">
                    <h2>
                      <span className="tav-t-fil-id">{element.ref}</span>
                      {element.titre}
                    </h2>
                  </Link>
                </nav>
                <span className="tav-pousse" />
                <div className="tav-r-boutons">
                  {boutons.map((b) => (
                    <button key={b.libelle} type="button" className="tav-rond" aria-label={b.libelle} title={b.titre ?? b.libelle} disabled={!b.actif} onClick={b.action}>
                      <TavIcone nom={b.icone} />
                    </button>
                  ))}
                </div>
              </header>
              <div className="tav-t-defile">
                <div className="tav-t-corps">
                  <div className="tav-t-principal">
                    <h1 className="tav-t-titre">{element.titre}</h1>
                    <div className="tav-t-replis">
                      {pilules.map((x) => (
                        <span key={x.texte} className="tav-t-pilule" data-rouge={x.rouge || undefined}>
                          <TavIcone nom={x.icone} taille={14} />
                          <span>{x.texte}</span>
                        </span>
                      ))}
                    </div>
                    <div className="tav-t-description">{description}</div>
                    <div className="tav-r-gestes">
                      {boutons.map((b) => (
                        <button key={b.libelle} type="button" className="tav-r-geste" disabled={!b.actif} title={b.titre} onClick={b.action}>
                          <TavIcone nom={b.icone} taille={14} />
                          <span>{b.libelle}</span>
                        </button>
                      ))}
                    </div>
                    <div className="tav-t-activite-tete">
                      <h3>Activité</h3>
                    </div>
                    <ul className="tav-t-evenements">
                      {activite.map((x, i) => (
                        <li key={i} className="tav-t-evenement">
                          <TavIcone nom={x.icone} taille={14} />
                          <span className="tav-t-qui">{x.qui}</span>
                          <span>{x.quoi}</span>
                          {x.quand ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span title={dateHeure(x.quand)}>{relatif(x.quand)}</span>
                            </>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="tav-vide">
              <TavIcone nom="Triage" taille={96} className="tav-i-illustration" />
              <p>{vue === "a_traiter" ? `${elements.length} élément${elements.length > 1 ? "s" : ""} à traiter` : `${elements.length} élément${elements.length > 1 ? "s" : ""} traité${elements.length > 1 ? "s" : ""}`}</p>
              <button type="button" className="tav-r-creer" disabled={!peutSaisir} onClick={() => avisDemande("saisie")}>
                <TavIcone nom="Plus" taille={14} />
                <span>Enregistrer un avis</span>
              </button>
            </div>
          )}
        </section>
      </div>

      <FenetresAvis demande={demandeAvis} onFait={onFait} />
      <FenetresContestations demande={demandeK} onFait={onFait} />
      <FenetreOperations o={o} />
      <Dialog open={!!confirmer} onOpenChange={(x) => !x && setConfirmer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Receipt width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{confirmer?.titre}</DialogTitle>
            <DialogDescription>{confirmer?.texte}</DialogDescription>
          </DialogHeader>
          <DialogBody>{erreurConf ? <Avis teinte="rouge" role="alert">{erreurConf}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoiConf} onClick={lancerConfirme}>
              {envoiConf ? <Loader variant="spin" /> : null} {confirmer?.bouton}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TavCarte>
  );
}
