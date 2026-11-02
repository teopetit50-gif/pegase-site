"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAVARO — les opérations (départ et rappels, transferts, péages,
   sinistres, assistance, caution), lues et jouées comme dans l'écran
   d'avant (components/espace/tavaro/OperationsVue, b2_12 à b2_16) : le
   code de son état, de ses formulaires et de ses gestes, repris ligne pour
   ligne dans un crochet, posé une fois par ./donnees pour toutes les
   sous-pages (Parc et atelier, Amendes, Incidents, Réseau et flotte,
   Réglages). Les gestes écrits en ligne dans l'écran d'avant y sont
   nommés (rappelFaitSur, proposer, payer…). La fenêtre F16 se rend par
   <FenetreOperations />.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, type Teinte } from "@/components/espace/ui";
import { dateCourte, montant } from "@/components/espace/format";
import {
  ACTIONS, CRITAIR, ETAPES_SINISTRE, NATURES_SINISTRE, OPERATIONS_EXEMPLE, OPERATIONS_VIDES, RESPONSABILITES, TYPES_INCIDENT, controleDepart,
  type ActionAssistance, type Caution, type Critair, type Incident, type NatureSinistre, type Operations, type Passage, type PointDepart, type Responsabilite,
  type Sinistre, type StatutSinistre, type Transfert, type TypeIncident,
} from "@/components/espace/tavaro/operations";
import {
  avancerSinistre, capturerCaution, chargerOperations, cloreIncident, controleDepartPorte, deciderTransferts, demanderPreautorisation, enregistrerPassages, enregistrerRappel,
  libererCaution, ouvrirSinistre, passageALaCharge, payerPassage, poserConformite, poserGrilleAssistance, preparerRecours, proposerTransferts, rappelFait, rattacherPassage,
  refacturerPeages, transfertFait,
} from "@/components/espace/tavaro/portes";
import type { Dossier, Role, Vehicule } from "@/components/espace/tavaro/types";

/* Un formulaire générique : chaque geste décrit ses champs, la boîte de dialogue les rend. */
export type Champ = {
  cle: string; libelle: string; type: "texte" | "zone" | "nombre" | "date" | "heure" | "choix" | "case" | "vehicules";
  options?: { valeur: string; libelle: string }[]; obligatoire?: boolean; aide?: string;
};
export type Formulaire = { titre: string; description: string; champs: Champ[]; valeurs: Record<string, string>; bouton: string; valider: (v: Record<string, string>) => Promise<string> };

export const NIVEAUX: Record<PointDepart["niveau"], { teinte: Teinte; libelle: string }> = {
  bloquant: { teinte: "rouge", libelle: "Ne part pas" }, attention: { teinte: "ambre", libelle: "À vérifier" }, info: { teinte: "bleu", libelle: "À dire au client" },
};
export const STATUTS_PASSAGE: Record<Passage["statut"], { libelle: string; teinte: Teinte }> = {
  a_payer: { libelle: "à payer", teinte: "ambre" }, paye: { libelle: "payé", teinte: "bleu" }, refacture: { libelle: "refacturé", teinte: "vert" }, a_la_charge_du_loueur: { libelle: "à la charge du loueur", teinte: "gris" },
};
const SUITE_SINISTRE: Record<StatutSinistre, StatutSinistre[]> = {
  ouvert: ["expertise", "reparation", "recours", "regle", "clos"], expertise: ["reparation", "recours", "regle", "clos"], reparation: ["recours", "regle", "clos"],
  recours: ["regle", "clos"], regle: ["clos"], clos: [],
};
const nombre = (s: string | undefined) => (s && s.trim() ? Number(s.replace(",", ".").replace(/\s/g, "")) : null);
const iso = (local: string) => (local ? new Date(local).toISOString() : "");
const auj = () => new Date().toISOString().slice(0, 10);
const nouvelId = () => crypto.randomUUID();

export function useOperationsEtat({ source, role, dossiers, vehicules, nomAgence }: {
  source: "exemple" | "reelle";
  role: Role | null;
  dossiers: Dossier[];
  vehicules: (Vehicule & { entite_id?: string | null })[];
  nomAgence: (entite_id: string) => string;
}) {
  const [local, setLocal] = useState<Operations>(OPERATIONS_EXEMPLE);
  const [reel, setReel] = useState<Operations | null>(null);
  const [monte, setMonte] = useState(false);
  const [maintenant, setMaintenant] = useState(0);
  const [form, setForm] = useState<Formulaire | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [contratControle, setContratControle] = useState<string>("");
  const [points, setPoints] = useState<PointDepart[] | null>(null);

  const ops = source === "exemple" ? local : (reel ?? OPERATIONS_VIDES);
  const agence = role !== null && role !== "lecteur";
  const direction = role === "gerant" || role === "admin" || role === "valideur";
  const directionStricte = role === "gerant" || role === "admin";

  const relire = useCallback(async () => {
    try { setReel(await chargerOperations()); } catch { setReel(OPERATIONS_VIDES); }
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => { setMonte(true); setMaintenant(Date.now()); if (source === "reelle") void relire(); }, 0);
    return () => window.clearTimeout(t);
  }, [source, relire]);

  const vehicule = (id: string | null | undefined) => vehicules.find((v) => v.id === id) ?? dossiers.find((d) => d.vehicule?.id === id)?.vehicule ?? null;
  const immat = (id: string | null | undefined) => vehicule(id)?.immatriculation ?? "—";
  const dossierDe = (contrat: string | null | undefined) => dossiers.find((d) => d.contrat.id === contrat) ?? null;
  const numero = (contrat: string | null | undefined) => dossierDe(contrat)?.contrat.numero ?? "—";
  const ouverts = useMemo(() => dossiers.filter((d) => d.contrat.statut === "ouvert"), [dossiers]);
  const optionsContrats = (liste: Dossier[]) => liste.map((d) => ({ valeur: d.contrat.id, libelle: `${d.contrat.numero}${d.vehicule ? ` — ${d.vehicule.immatriculation}` : ""}` }));
  const optionsVehicules = vehicules.map((v) => ({ valeur: v.id, libelle: `${v.immatriculation}${v.modele ? ` · ${v.modele}` : ""}` }));
  const changer = (f: (o: Operations) => Operations) => setLocal((o) => f(o));

  function ouvrir(f: Omit<Formulaire, "valeurs"> & { valeurs?: Record<string, string> }) {
    setErreur(null);
    setFait(null);
    setForm({ ...f, valeurs: f.valeurs ?? {} });
  }
  async function soumettre() {
    if (!form) return;
    const manque = form.champs.find((c) => c.obligatoire && !(form.valeurs[c.cle] ?? "").trim());
    if (manque) { setErreur(`« ${manque.libelle} » est obligatoire.`); return; }
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await form.valider(form.valeurs);
      if (source === "reelle") await relire();
      setFait(m);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }
  async function geste(action: () => Promise<string>) {
    setEnvoi(true);
    setErreur(null);
    setFait(null);
    try {
      const m = await action();
      if (source === "reelle") await relire();
      setFait(m);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  }

  /* ——— le contrôle du départ ——— */
  async function controler(contrat: string) {
    setContratControle(contrat);
    setPoints(null);
    if (!contrat) return;
    const d = dossierDe(contrat);
    if (source === "exemple") { setPoints(controleDepart(ops, d?.vehicule ?? null, d?.contrat.retour_prevu_le ?? auj())); return; }
    try { setPoints(await controleDepartPorte(contrat)); } catch (e) { setErreur(e instanceof Error ? e.message : "Le contrôle n'a pas pu être lu."); }
  }
  useEffect(() => {
    if (source !== "exemple" || !contratControle) return;
    const d = dossiers.find((x) => x.contrat.id === contratControle);
    const t = window.setTimeout(() => setPoints(controleDepart(local, d?.vehicule ?? null, d?.contrat.retour_prevu_le ?? auj())), 0);
    return () => window.clearTimeout(t);
  }, [local, source, contratControle, dossiers]);

  const saisirConformite = (vehiculeId: string) => {
    const x = ops.conformite.find((c) => c.vehicule_id === vehiculeId);
    ouvrir({
      titre: `Vignette et contrôle technique de ${immat(vehiculeId)}`,
      description: "La classe Crit'Air se lit sur le certificat d'immatriculation ou la vignette ; la date de validité du contrôle technique, sur le procès-verbal.",
      champs: [
        { cle: "critair", libelle: "Crit'Air", type: "choix", options: [{ valeur: "", libelle: "Pas encore vérifiée" }, ...Object.entries(CRITAIR).map(([valeur, libelle]) => ({ valeur, libelle }))] },
        { cle: "ct", libelle: "Contrôle technique valable jusqu'au", type: "date" },
      ],
      valeurs: { critair: x?.critair ?? "", ct: x?.ct_valide_jusqu_au ?? "" },
      bouton: "Enregistrer",
      valider: async (v) => {
        if (source === "reelle") await poserConformite(vehiculeId, { critair: v.critair, ct_valide_jusqu_au: v.ct });
        else changer((o) => ({ ...o, conformite: [...o.conformite.filter((c) => c.vehicule_id !== vehiculeId),
          { vehicule_id: vehiculeId, critair: (v.critair || null) as Critair | null, critair_verifie_le: v.critair ? auj() : null, ct_valide_jusqu_au: v.ct || null }] }));
        return `La conformité de ${immat(vehiculeId)} est à jour.`;
      },
    });
  };
  const nouveauRappel = () => ouvrir({
    titre: "Enregistrer un rappel du constructeur",
    description: "Immobilisant : chaque véhicule est retiré des locations jusqu'à la réparation. À planifier : un entretien est créé à l'échéance.",
    champs: [
      { cle: "reference", libelle: "Référence de la campagne", type: "texte", obligatoire: true },
      { cle: "libelle", libelle: "Ce que le constructeur demande", type: "zone", obligatoire: true },
      { cle: "constructeur", libelle: "Constructeur", type: "texte" },
      { cle: "gravite", libelle: "Gravité", type: "choix", options: [{ valeur: "a_planifier", libelle: "À planifier (un entretien)" }, { valeur: "immobilisant", libelle: "Immobilisant (le véhicule ne part plus)" }] },
      { cle: "echeance", libelle: "À faire avant le (à planifier)", type: "date" },
      { cle: "vehicules", libelle: "Véhicules concernés", type: "vehicules", obligatoire: true },
    ],
    valeurs: { gravite: "a_planifier" },
    bouton: "Enregistrer le rappel",
    valider: async (v) => {
      const liste = (v.vehicules ?? "").split(",").filter(Boolean);
      if (source === "reelle") {
        const r = await enregistrerRappel({ reference: v.reference, libelle: v.libelle, constructeur: v.constructeur, gravite: v.gravite, echeance_le: v.echeance }, liste);
        return `Rappel ${v.reference} enregistré sur ${r.vehicules} véhicule${r.vehicules > 1 ? "s" : ""}${r.a_reaffecter.length ? ` : ${r.a_reaffecter.length} réservation(s) à réaffecter` : ""}.`;
      }
      const id = nouvelId();
      changer((o) => ({ ...o, rappels: [{ id, reference: v.reference, constructeur: v.constructeur || null, libelle: v.libelle, gravite: v.gravite as "immobilisant" | "a_planifier", publie_le: null, cree_le: new Date().toISOString() }, ...o.rappels],
        rappelsVehicules: [...o.rappelsVehicules, ...liste.map((vehicule_id) => ({ id: nouvelId(), rappel_id: id, vehicule_id, statut: "a_faire" as const, immobilisation_id: null, entretien_id: null, fait_le: null }))] }));
      return `Rappel ${v.reference} enregistré sur ${liste.length} véhicule${liste.length > 1 ? "s" : ""}.`;
    },
  });

  /* ——— les gestes des transferts ——— */
  const tournees = useMemo(() => {
    const m = new Map<string, Transfert[]>();
    for (const t of ops.transferts.filter((x) => x.statut === "propose" || x.statut === "valide")) m.set(t.tournee, [...(m.get(t.tournee) ?? []), t]);
    return [...m.entries()];
  }, [ops.transferts]);

  /* ——— les péages ——— */
  const passagesOuverts = ops.passages.filter((p) => p.statut === "a_payer" || p.statut === "paye");
  const aPayer = ops.passages.filter((p) => p.statut === "a_payer");
  const enRetard = aPayer.filter((p) => monte && new Date(p.payer_avant).getTime() < maintenant);
  const contratsARefacturer = [...new Set(ops.passages.filter((p) => p.statut === "paye" && p.contrat_id && !p.refacture_proposition_id).map((p) => p.contrat_id as string))];
  const saisirPassage = () => ouvrir({
    titre: "Saisir un passage de péage",
    description: "Recopiez le passage du compte flotte. Tavaro le rapproche du contrat par la plaque et l'heure, et compte les 72 heures pour le payer.",
    champs: [
      { cle: "operateur", libelle: "Opérateur", type: "texte", obligatoire: true }, { cle: "reference", libelle: "Référence du passage", type: "texte", obligatoire: true },
      { cle: "passe_le", libelle: "Passé le", type: "heure", obligatoire: true }, { cle: "immatriculation", libelle: "Plaque", type: "texte", obligatoire: true },
      { cle: "montant", libelle: "Montant TTC (€)", type: "nombre", obligatoire: true }, { cle: "portique", libelle: "Portique", type: "texte" },
    ],
    bouton: "Enregistrer le passage",
    valider: async (v) => {
      const ligne = { operateur: v.operateur, reference: v.reference, passe_le: iso(v.passe_le), immatriculation: v.immatriculation, montant_eur: nombre(v.montant), portique: v.portique };
      if (source === "reelle") {
        const r = await enregistrerPassages([ligne], "saisie");
        return r.nouveaux ? `Passage enregistré${r.rapproches ? ", rattaché à son contrat" : " : aucun contrat trouvé, rattachez-le à la main"}.` : "Ce passage était déjà enregistré.";
      }
      const v2 = vehicules.find((x) => x.immatriculation.replace(/\W/g, "").toUpperCase() === v.immatriculation.replace(/\W/g, "").toUpperCase());
      const passe = iso(v.passe_le);
      changer((o) => ({ ...o, passages: [{ id: nouvelId(), entite_id: v2?.entite_id ?? null, operateur: v.operateur, portique: v.portique || null, passe_le: passe, immatriculation: v.immatriculation.toUpperCase(),
        vehicule_id: v2?.id ?? null, montant_eur: nombre(v.montant) ?? 0, reference: v.reference, payer_avant: new Date(new Date(passe).getTime() + 72 * 3_600_000).toISOString(), statut: "a_payer",
        paye_le: null, paiement_reference: null, contrat_id: null, refacture_proposition_id: null, a_la_charge_motif: null }, ...o.passages] }));
      return "Passage enregistré.";
    },
  });
  const importerPassages = () => ouvrir({
    titre: "Importer l'export du compte flotte",
    description: "Une ligne par passage : opérateur ; référence ; date et heure (AAAA-MM-JJ HH:MM) ; plaque ; montant ; portique. Rejouer le même export n'ajoute rien.",
    champs: [{ cle: "lignes", libelle: "Lignes de l'export", type: "zone", obligatoire: true }],
    bouton: "Importer",
    valider: async (v) => {
      const lignes = v.lignes.split(/\r?\n/).map((l) => l.split(/[;\t]/).map((x) => x.trim())).filter((l) => l.length >= 5 && l[0])
        .map(([operateur, reference, quand, immatriculation, m, portique]) => ({ operateur, reference, passe_le: new Date(quand.replace(" ", "T")).toISOString(), immatriculation, montant_eur: nombre(m), portique }));
      if (!lignes.length) throw new Error("Aucune ligne lisible : opérateur ; référence ; date et heure ; plaque ; montant.");
      if (source === "reelle") {
        const r = await enregistrerPassages(lignes, "import");
        return `${r.nouveaux} passage(s) ajouté(s), dont ${r.rapproches} rattaché(s) à leur contrat ; ${r.deja} déjà connu(s).`;
      }
      return `${lignes.length} passage(s) lus. En exemple, rien n'est écrit.`;
    },
  });

  /* ——— les sinistres ——— */
  const declarerSinistre = () => ouvrir({
    titre: "Déclarer un sinistre",
    description: "Le dossier se rattache au contrat (ou au véhicule, hors location). Immobilisé : le véhicule sort des locations et ses réservations sont rendues à réaffecter.",
    champs: [
      { cle: "contrat", libelle: "Contrat", type: "choix", options: [{ valeur: "", libelle: "Hors location (choisir le véhicule)" }, ...optionsContrats(dossiers)] },
      { cle: "vehicule", libelle: "Véhicule (hors location)", type: "choix", options: [{ valeur: "", libelle: "—" }, ...optionsVehicules] },
      { cle: "survenu_le", libelle: "Survenu le", type: "heure", obligatoire: true },
      { cle: "nature", libelle: "Nature", type: "choix", options: Object.entries(NATURES_SINISTRE).map(([valeur, libelle]) => ({ valeur, libelle })) },
      { cle: "responsabilite", libelle: "Responsable", type: "choix", options: Object.entries(RESPONSABILITES).map(([valeur, libelle]) => ({ valeur, libelle })) },
      { cle: "lieu", libelle: "Lieu", type: "texte" }, { cle: "description", libelle: "Ce qui s'est passé", type: "zone" },
      { cle: "tiers_nom", libelle: "Tiers : nom", type: "texte" }, { cle: "tiers_assureur", libelle: "Tiers : assureur", type: "texte" },
      { cle: "tiers_adresse", libelle: "Tiers : courriel de l'assureur", type: "texte" }, { cle: "tiers_police", libelle: "Tiers : n° de contrat", type: "texte" },
      { cle: "immobilise", libelle: "Le véhicule est immobilisé", type: "case" },
    ],
    valeurs: { nature: "accident", responsabilite: "inconnue" },
    bouton: "Ouvrir le dossier",
    valider: async (v) => {
      const tiers = Object.fromEntries(Object.entries({ nom: v.tiers_nom, assureur: v.tiers_assureur, assureur_adresse: v.tiers_adresse, police: v.tiers_police }).filter(([, x]) => x && x.trim()));
      const valeurs = { contrat: v.contrat || undefined, vehicule: v.contrat ? undefined : v.vehicule, survenu_le: iso(v.survenu_le), nature: v.nature, responsabilite: v.responsabilite,
        lieu: v.lieu, description: v.description, tiers, immobilise: v.immobilise === "oui" };
      if (source === "reelle") { const r = await ouvrirSinistre(valeurs); return `Le dossier ${r.reference} est ouvert.`; }
      const vehiculeId = v.contrat ? dossierDe(v.contrat)?.vehicule?.id ?? null : v.vehicule;
      if (!vehiculeId) throw new Error("Un sinistre se rattache à un contrat ou à un véhicule.");
      const reference = `SIN-${new Date().getFullYear()}-${String(ops.sinistres.length + 8).padStart(4, "0")}`;
      changer((o) => ({ ...o, sinistres: [{ id: nouvelId(), entite_id: dossierDe(v.contrat)?.contrat.entite_id ?? null, contrat_id: v.contrat || null, vehicule_id: vehiculeId, reference, survenu_le: valeurs.survenu_le,
        lieu: v.lieu || null, nature: v.nature as NatureSinistre, responsabilite: v.responsabilite as Responsabilite, description: v.description || null, tiers, statut: "ouvert", expert: {},
        montant_reparation_eur: null, franchise_eur: null, immobilisation_id: null, recours: null, regle_le: null, montant_recu_eur: null,
        historique: [{ le: new Date().toISOString(), statut: "ouvert" }], cree_le: new Date().toISOString() }, ...o.sinistres] }));
      return `Le dossier ${reference} est ouvert.`;
    },
  });
  const avancer = (s: Sinistre) => ouvrir({
    titre: `Faire avancer ${s.reference}`,
    description: "Réglé et clos se décident par la direction ou un valideur. Les montants et l'expert complètent le dossier.",
    champs: [
      { cle: "statut", libelle: "Étape", type: "choix", options: [{ valeur: "", libelle: `Rester en « ${ETAPES_SINISTRE[s.statut]} »` }, ...SUITE_SINISTRE[s.statut].map((x) => ({ valeur: x, libelle: ETAPES_SINISTRE[x] }))] },
      { cle: "responsabilite", libelle: "Responsable", type: "choix", options: Object.entries(RESPONSABILITES).map(([valeur, libelle]) => ({ valeur, libelle })) },
      { cle: "expert", libelle: "Expert", type: "texte" }, { cle: "montant_reparation_eur", libelle: "Réparation (€)", type: "nombre" },
      { cle: "franchise_eur", libelle: "Franchise (€)", type: "nombre" }, { cle: "regle_le", libelle: "Réglé le", type: "date" },
      { cle: "montant_recu_eur", libelle: "Reçu de l'assureur (€)", type: "nombre" }, { cle: "note", libelle: "Note", type: "zone" },
    ],
    valeurs: { responsabilite: s.responsabilite, expert: s.expert.nom ?? "", montant_reparation_eur: s.montant_reparation_eur?.toString() ?? "", franchise_eur: s.franchise_eur?.toString() ?? "",
      regle_le: s.regle_le ?? "", montant_recu_eur: s.montant_recu_eur?.toString() ?? "" },
    bouton: "Enregistrer",
    valider: async (v) => {
      const valeurs = Object.fromEntries(Object.entries({ responsabilite: v.responsabilite, expert: v.expert ? { nom: v.expert } : undefined, montant_reparation_eur: v.montant_reparation_eur,
        franchise_eur: v.franchise_eur, regle_le: v.regle_le, montant_recu_eur: v.montant_recu_eur, note: v.note }).filter(([, x]) => x !== undefined && x !== ""));
      if (source === "reelle") { await avancerSinistre(s.id, v.statut || null, valeurs); return `Le dossier ${s.reference} est à jour.`; }
      if ((v.statut === "regle" || v.statut === "clos") && !direction) throw new Error("Un dossier se règle ou se clôt par la direction ou un valideur.");
      if (v.statut === "regle" && !v.regle_le) throw new Error("La date du règlement est obligatoire.");
      changer((o) => ({ ...o, sinistres: o.sinistres.map((x) => (x.id !== s.id ? x : { ...x, statut: (v.statut || x.statut) as StatutSinistre, responsabilite: v.responsabilite as Responsabilite,
        expert: v.expert ? { nom: v.expert } : x.expert, montant_reparation_eur: nombre(v.montant_reparation_eur), franchise_eur: nombre(v.franchise_eur), regle_le: v.regle_le || null,
        montant_recu_eur: nombre(v.montant_recu_eur), historique: [...x.historique, { le: new Date().toISOString(), statut: v.statut || x.statut, note: v.note || undefined }] })) }));
      return `Le dossier ${s.reference} est à jour.`;
    },
  });
  const recours = (s: Sinistre) => ouvrir({
    titre: `Recours du sinistre ${s.reference}`,
    description: "Tavaro compte les jours d'immobilisation depuis le sinistre et les chiffre au tarif journalier moyen de la catégorie (la moitié si la responsabilité est partagée). Le courrier se télécharge, ou part à l'assureur du tiers.",
    champs: [{ cle: "envoyer", libelle: `L'envoyer à ${s.tiers.assureur_adresse ?? "l'assureur du tiers (courriel à compléter)"}`, type: "case" }],
    bouton: "Préparer le recours",
    valider: async (v) => {
      if (source === "reelle") {
        const r = await preparerRecours(s.id, v.envoyer === "oui");
        return `Recours de ${montant(r.montant)} pour ${r.jours} jour${r.jours > 1 ? "s" : ""} d'immobilisation${r.envoi ? ", envoyé à l'assureur du tiers" : " : le courrier est dans le dossier"}.`;
      }
      const jours = Math.max(1, Math.ceil((Date.now() - new Date(s.survenu_le).getTime()) / 86_400_000));
      const part = s.responsabilite === "partagee" ? 0.5 : 1;
      const m = Math.round(jours * 46 * part * 100) / 100;
      const courrier = `Objet : recours — perte d'exploitation du véhicule ${immat(s.vehicule_id)} — sinistre du ${dateCourte(s.survenu_le)}\nVotre assuré : ${s.tiers.nom ?? "non nommé"}${s.tiers.police ? `, contrat n° ${s.tiers.police}` : ""}\n\nLe véhicule n'a pas pu être loué pendant ${jours} jours. Sur la base de son tarif journalier moyen (46,00 € TTC), la perte d'exploitation s'élève à ${m.toFixed(2).replace(".", ",")} €${part < 1 ? " (la moitié, responsabilité partagée)" : ""}.`;
      changer((o) => ({ ...o, sinistres: o.sinistres.map((x) => (x.id !== s.id ? x : { ...x, statut: ["ouvert", "expertise", "reparation"].includes(x.statut) ? "recours" : x.statut,
        recours: { jours, tarif_moyen: 46, part, montant: m, courrier, prepare_le: new Date().toISOString(), envoi: v.envoyer === "oui" ? "exemple" : null, envoye_le: v.envoyer === "oui" ? new Date().toISOString() : null } })) }));
      return `Recours de ${montant(m)} pour ${jours} jours d'immobilisation.`;
    },
  });

  /* ——— l'assistance ——— */
  const clore = (i: Incident) => ouvrir({
    titre: `Clore l'incident : ${TYPES_INCIDENT[i.type_incident].toLowerCase()}${i.vehicule_id ? ` sur ${immat(i.vehicule_id)}` : ""}`,
    description: "Une note pour le dossier ; un accident ou un vol ouvre le dossier de sinistre depuis l'incident.",
    champs: [{ cle: "note", libelle: "Ce qui a été fait", type: "zone" }, { cle: "sinistre", libelle: "Ouvrir le dossier de sinistre", type: "case" }],
    valeurs: { sinistre: i.type_incident === "accident" || i.type_incident === "vol" ? "oui" : "" },
    bouton: "Clore",
    valider: async (v) => {
      if (source === "reelle") { const r = await cloreIncident(i.id, v.note || null, v.sinistre === "oui"); return `L'incident est clos${r.sinistre ? " et le dossier de sinistre ouvert" : ""}.`; }
      changer((o) => ({ ...o, incidents: o.incidents.map((x) => (x.id === i.id ? { ...x, statut: "clos", resume: v.note || x.resume } : x)) }));
      return "L'incident est clos.";
    },
  });
  const ligneGrille = (type?: TypeIncident) => {
    const l = ops.grille.find((g) => g.type_incident === type);
    ouvrir({
      titre: type ? `Assistance : ${TYPES_INCIDENT[type].toLowerCase()}` : "Ajouter un type d'incident à la grille",
      description: "Ce que l'assistant fait pour ce type d'incident : à qui il envoie le client, en combien de temps, avec quelles consignes.",
      champs: [
        { cle: "type_incident", libelle: "Incident", type: "choix", options: Object.entries(TYPES_INCIDENT).map(([valeur, libelle]) => ({ valeur, libelle })) },
        { cle: "action", libelle: "Action", type: "choix", options: Object.entries(ACTIONS).map(([valeur, libelle]) => ({ valeur, libelle })) },
        { cle: "prestataire", libelle: "Prestataire", type: "texte" }, { cle: "prestataire_telephone", libelle: "Son téléphone", type: "texte" },
        { cle: "delai_cible_min", libelle: "Délai visé (minutes)", type: "nombre" }, { cle: "consignes", libelle: "Consignes", type: "zone" },
      ],
      valeurs: { type_incident: type ?? "panne", action: l?.action ?? "depanneuse", prestataire: l?.prestataire ?? "", prestataire_telephone: l?.prestataire_telephone ?? "",
        delai_cible_min: l?.delai_cible_min?.toString() ?? "", consignes: l?.consignes ?? "" },
      bouton: "Enregistrer",
      valider: async (v) => {
        const ligne = { type_incident: v.type_incident, action: v.action, prestataire: v.prestataire, prestataire_telephone: v.prestataire_telephone, delai_cible_min: v.delai_cible_min, consignes: v.consignes };
        if (source === "reelle") await poserGrilleAssistance([ligne]);
        else changer((o) => ({ ...o, grille: [...o.grille.filter((g) => g.type_incident !== v.type_incident), { id: nouvelId(), type_incident: v.type_incident as TypeIncident,
          action: v.action as ActionAssistance, prestataire: v.prestataire || null, prestataire_telephone: v.prestataire_telephone || null, delai_cible_min: nombre(v.delai_cible_min), consignes: v.consignes || null }] }));
        return "La grille d'assistance est à jour.";
      },
    });
  };

  /* ——— la caution ——— */
  const demanderCaution = () => ouvrir({
    titre: "Demander une préautorisation",
    description: "Le prestataire de paiement bloque le montant sur la carte du locataire sans le débiter. Par défaut, le dépôt prévu au contrat.",
    champs: [{ cle: "contrat", libelle: "Contrat", type: "choix", obligatoire: true, options: [{ valeur: "", libelle: "Choisir…" }, ...optionsContrats(ouverts)] }, { cle: "montant", libelle: "Montant (€)", type: "nombre" }],
    bouton: "Demander",
    valider: async (v) => {
      if (source === "reelle") { await demanderPreautorisation(v.contrat, nombre(v.montant)); return "La préautorisation est demandée au prestataire."; }
      if (ops.cautions.some((k) => k.contrat_id === v.contrat && ["demandee", "preautorisee", "capture_demandee", "liberation_demandee"].includes(k.statut))) throw new Error("Une caution est déjà en cours sur ce contrat.");
      const m = nombre(v.montant) ?? dossierDe(v.contrat)?.contrat.depot_eur ?? null;
      if (!m) throw new Error("Le montant de la caution est obligatoire (le contrat n'en porte pas).");
      changer((o) => ({ ...o, cautions: [{ id: nouvelId(), entite_id: dossierDe(v.contrat)?.contrat.entite_id ?? "", contrat_id: v.contrat, montant_eur: m, statut: "demandee", prestataire: null, reference_externe: null,
        expire_le: null, capture_demandee_eur: null, capture_eur: null, capture_facture_id: null, capture_motif: null, erreur: null, cree_le: new Date().toISOString() }, ...o.cautions] }));
      return "La préautorisation est demandée au prestataire.";
    },
  });
  const capturer = (k: Caution) => {
    const factures = (dossierDe(k.contrat_id)?.factures ?? []).filter((f) => f.statut !== "reglee");
    ouvrir({
      titre: `Capturer sur la caution du contrat ${numero(k.contrat_id)}`,
      description: `Pour régler une facture de ce contrat : jamais plus que la préautorisation (${montant(k.montant_eur)}) ni que la facture.`,
      champs: [
        { cle: "facture", libelle: "Facture", type: "choix", obligatoire: true, options: [{ valeur: "", libelle: factures.length ? "Choisir…" : "Aucune facture due sur ce contrat" }, ...factures.map((f) => ({ valeur: f.id, libelle: `${f.reference} — ${montant(f.total_ttc)}` }))] },
        { cle: "montant", libelle: "Montant (€)", type: "nombre", obligatoire: true }, { cle: "motif", libelle: "Motif", type: "zone", obligatoire: true },
      ],
      bouton: "Demander la capture",
      valider: async (v) => {
        const m = nombre(v.montant) ?? 0;
        if (source === "reelle") { await capturerCaution(k.id, v.facture, m, v.motif); return "La capture est demandée au prestataire."; }
        const f = factures.find((x) => x.id === v.facture);
        if (m <= 0 || m > k.montant_eur || (f && m > f.total_ttc)) throw new Error(`Le montant capturé est positif, et ne dépasse ni la caution (${montant(k.montant_eur)}) ni la facture.`);
        if (v.motif.trim().length < 5) throw new Error("Le motif est obligatoire (cinq caractères au moins).");
        changer((o) => ({ ...o, cautions: o.cautions.map((x) => (x.id === k.id ? { ...x, statut: "capture_demandee", capture_demandee_eur: m, capture_facture_id: v.facture, capture_motif: v.motif } : x)) }));
        return "La capture est demandée au prestataire.";
      },
    });
  };


  /* ——— les gestes en ligne de l'écran d'avant (OperationsVue), nommés ——— */
  const rappelFaitSur = (rv: Operations["rappelsVehicules"][number]) => {
    const r = ops.rappels.find((x) => x.id === rv.rappel_id);
    return geste(async () => {
      if (source === "reelle") await rappelFait(rv.id);
      else changer((o) => ({ ...o, rappelsVehicules: o.rappelsVehicules.map((x) => (x.id === rv.id ? { ...x, statut: "fait", fait_le: new Date().toISOString() } : x)) }));
      return `Le rappel est fait sur ${immat(rv.vehicule_id)}${r?.gravite === "immobilisant" ? " : le véhicule revient en location" : ""}.`;
    });
  };
  const proposer = () =>
    geste(async () => {
      if (source === "reelle") { const r = await proposerTransferts(null); return r.transferts ? `${r.transferts} transfert(s) proposé(s) pour le pic du ${dateCourte(r.pic)}.` : `Aucun transfert utile pour le pic du ${dateCourte(r.pic)}.`; }
      return "En exemple, les transferts du prochain pic sont déjà proposés.";
    });
  const arrive = (t: Transfert) =>
    ouvrir({ titre: `${immat(t.vehicule_id)} est arrivé`, description: `À ${nomAgence(t.destination_entite_id)} : sa position suit.`, champs: [{ cle: "convoyeur", libelle: "Convoyeur", type: "texte" }],
      bouton: "Noter l'arrivée", valider: async (v) => {
        if (source === "reelle") await transfertFait(t.id, v.convoyeur || null);
        else changer((o) => ({ ...o, transferts: o.transferts.map((x) => (x.id === t.id ? { ...x, statut: "fait", fait_le: new Date().toISOString(), convoyeur: v.convoyeur || null } : x)) }));
        return `${immat(t.vehicule_id)} est à ${nomAgence(t.destination_entite_id)}.`;
      } });
  const decider = (tournee: string, valider: boolean) =>
    geste(async () => {
      if (source === "reelle") await deciderTransferts(tournee, valider, null);
      else changer((o) => ({ ...o, transferts: o.transferts.map((x) => (x.tournee === tournee && x.statut === "propose" ? { ...x, statut: valider ? "valide" : "refuse" } : x)) }));
      return valider ? `La tournée ${tournee} est validée.` : `La tournée ${tournee} est refusée.`;
    });
  const refacturer = (c: string) =>
    geste(async () => {
      if (source === "reelle") { const r = await refacturerPeages(c); return `${r.passages} passage(s) refacturé(s) : la facture suit sa validation.`; }
      changer((o) => ({ ...o, passages: o.passages.map((p) => (p.contrat_id === c && p.statut === "paye" ? { ...p, statut: "refacture", refacture_proposition_id: "exemple" } : p)) }));
      return `Les péages du contrat ${numero(c)} sont refacturés : la facture suit sa validation.`;
    });
  const payer = (p: Passage) =>
    ouvrir({ titre: `Payer le passage ${p.reference}`, description: "Payez chez l'opérateur, puis notez la référence du paiement.", champs: [{ cle: "reference", libelle: "Référence du paiement", type: "texte", obligatoire: true }],
      bouton: "C'est payé", valider: async (v) => {
        if (source === "reelle") await payerPassage(p.id, v.reference);
        else changer((o) => ({ ...o, passages: o.passages.map((x) => (x.id === p.id ? { ...x, statut: "paye", paye_le: new Date().toISOString(), paiement_reference: v.reference } : x)) }));
        return `Le passage ${p.reference} est payé.`;
      } });
  const rattacher = (p: Passage) =>
    ouvrir({ titre: `Rattacher le passage ${p.reference}`, description: "Plaque mal lue, ou deux contrats le même jour : choisissez le contrat.",
      champs: [{ cle: "contrat", libelle: "Contrat", type: "choix", obligatoire: true, options: [{ valeur: "", libelle: "Choisir…" }, ...optionsContrats(dossiers)] }],
      bouton: "Rattacher", valider: async (v) => {
        if (source === "reelle") await rattacherPassage(p.id, v.contrat);
        else changer((o) => ({ ...o, passages: o.passages.map((x) => (x.id === p.id ? { ...x, contrat_id: v.contrat } : x)) }));
        return `Le passage est rattaché au contrat ${numero(v.contrat)}.`;
      } });
  const aLaCharge = (p: Passage) =>
    ouvrir({ titre: "Garder ce passage à la charge du loueur", description: "Convoyage, véhicule de l'agence : dites pourquoi.", champs: [{ cle: "motif", libelle: "Motif", type: "texte", obligatoire: true }],
      bouton: "Garder à la charge", valider: async (v) => {
        if (source === "reelle") await passageALaCharge(p.id, v.motif);
        else changer((o) => ({ ...o, passages: o.passages.map((x) => (x.id === p.id ? { ...x, statut: "a_la_charge_du_loueur", a_la_charge_motif: v.motif } : x)) }));
        return "Le passage reste à la charge du loueur.";
      } });
  const liberer = (k: Caution) =>
    geste(async () => {
      if (source === "reelle") await libererCaution(k.id);
      else changer((o) => ({ ...o, cautions: o.cautions.map((x) => (x.id === k.id ? { ...x, statut: "liberation_demandee" } : x)) }));
      return "La libération est demandée au prestataire.";
    });

  const rappelsOuverts = ops.rappelsVehicules.filter((r) => r.statut === "a_faire");
  const sinistresOuverts = ops.sinistres.filter((s) => s.statut !== "clos");
  const incidentsOuverts = ops.incidents.filter((i) => i.statut !== "clos");
  const cautionsVivantes = ops.cautions.filter((k) => !["liberee", "expiree", "echec"].includes(k.statut));
  const pret = monte && !(source === "reelle" && !reel);

  return {
    ops, pret, monte, maintenant, form, setForm, envoi, erreur, setErreur, fait, setFait, agence, direction, directionStricte,
    vehicule, immat, dossierDe, numero, ouverts, optionsContrats, optionsVehicules, ouvrir, soumettre, geste,
    contratControle, points, controler, saisirConformite, nouveauRappel, tournees, passagesOuverts, aPayer, enRetard, contratsARefacturer,
    saisirPassage, importerPassages, declarerSinistre, avancer, recours, clore, ligneGrille, demanderCaution, capturer,
    rappelFaitSur, proposer, arrive, decider, refacturer, payer, rattacher, aLaCharge, liberer,
    rappelsOuverts, sinistresOuverts, incidentsOuverts, cautionsVivantes,
  };
}

export type EtatOperations = ReturnType<typeof useOperationsEtat>;

/* F16 : la fenêtre générique des opérations (OperationsVue.tsx:765-814), telle quelle */
export function FenetreOperations({ o }: { o: EtatOperations }) {
  const { form, setForm, envoi, erreur, setErreur, soumettre, optionsVehicules } = o;
  return (
  <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setErreur(null); } }}>
    <DialogContent>
      <DialogHeader>
        <DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
        <DialogTitle>{form?.titre}</DialogTitle>
        <DialogDescription>{form?.description}</DialogDescription>
      </DialogHeader>
      <DialogBody>
        {form ? (
          <div className="esp-form">
            {form.champs.map((c) => {
              const val = form.valeurs[c.cle] ?? "";
              const poser = (x: string) => setForm({ ...form, valeurs: { ...form.valeurs, [c.cle]: x } });
              const titre = <>{c.libelle}{c.obligatoire ? <span className="esp-obligatoire"> (obligatoire)</span> : null}</>;
              if (c.type === "case") return <label key={c.cle} className="tav-coche"><input type="checkbox" checked={val === "oui"} onChange={(e) => poser(e.target.checked ? "oui" : "")} /><span>{c.libelle}</span></label>;
              if (c.type === "vehicules") {
                const choisis = val.split(",").filter(Boolean);
                return (
                  <fieldset key={c.cle} className="tav-choix-vehicules">
                    <legend className="rv-libelle">{titre}</legend>
                    {optionsVehicules.map((o) => (
                      <label key={o.valeur} className="tav-coche"><input type="checkbox" checked={choisis.includes(o.valeur)}
                        onChange={(e) => poser((e.target.checked ? [...choisis, o.valeur] : choisis.filter((x) => x !== o.valeur)).join(","))} /><span>{o.libelle}</span></label>
                    ))}
                  </fieldset>
                );
              }
              return (
                <label key={c.cle} className="rv-libelle">{titre}
                  {c.type === "choix" ? (
                    <select className="rv-champ" value={val} onChange={(e) => poser(e.target.value)}>{c.options?.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}</select>
                  ) : c.type === "zone" ? (
                    <textarea className="rv-champ" rows={3} value={val} onChange={(e) => poser(e.target.value)} />
                  ) : (
                    <input className="rv-champ" value={val} onChange={(e) => poser(e.target.value)}
                      type={c.type === "date" ? "date" : c.type === "heure" ? "datetime-local" : "text"} inputMode={c.type === "nombre" ? "decimal" : undefined} />
                  )}
                </label>
              );
            })}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <button type="button" className="r-btn r-btn--fil" onClick={() => { setForm(null); setErreur(null); }}>Annuler</button>
        <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => void soumettre()}>{envoi ? <Loader variant="spin" /> : null} {form?.bouton}</button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  );
}
