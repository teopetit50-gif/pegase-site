"use client";

/* ══════════════════════════════════════════════════════════════════════
   Un dossier Tamila ouvert (05/10/2026, session B4)

   Les cartes : l'en-tête (identité déchiffrée, statut, décisions en
   attente, export, clôture), les parties, l'appel et ses délais (chaque
   délai avec son calcul en toutes lettres et les gestes de l'avocat :
   confirmer, corriger, interrompre, annuler, acte déposé), les audiences,
   les pièces, les honoraires (HonorairesTamila, b4_06), les conflits
   d'intérêts et la vigilance (ConformiteTamila, b4_07), les avis RPVA,
   les membres et murailles, les exports, le journal des accès.

   Chaque geste passe par une porte (portes.ts) ; en exemple il est
   appliqué en mémoire pour que l'écran réagisse. L'écran dit avant le
   clic ce qu'il croit permis (regles.ts) ; la base reste juge et son
   message s'affiche tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { Archive, Ban, CalendarClock, CalendarPlus, Check, FileSignature, Gavel, Lock, Pencil, ShieldOff, Upload, UserPlus, Users, X } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure } from "../format";
import { chiffrer, chiffrerOctets, empreinte } from "./chiffrement";
import { MOI } from "./exemples";
import * as portes from "./portes";
import {
  ACTES, MOTIFS_ANNULATION, MOTIFS_AUGMENTATION, MOTIFS_CORRECTION, MOTIFS_INTERRUPTION, NATURES_AUDIENCE, PROCEDURES, QUALITES, RAISONS, RESIDENCES, ROLES_CABINET, ROLES_DOSSIER,
  ROLES_PROCEDURE, STATUTS_AUDIENCE, STATUTS_AVIS, STATUTS_DELAI, STATUTS_DOSSIER, TERRITOIRES, TYPES_AVIS, delaiCourt, ecritDossier, estAssocie, estAvocat, estGerant, gereDossier, joursAvant,
  libelleMatiere, libelleTerritoire, type Moi,
} from "./regles";
import type { Audience, CalculDelai, Delai, DemandeTamila, DossierComplet, Partie, Personne, RegleProcedure, Reglages } from "./types";
import HonorairesTamila from "./HonorairesTamila";
import ConformiteTamila from "./ConformiteTamila";

type Props = {
  complet: DossierComplet;
  source: Source;
  moi: Moi;
  personnes: Personne[];
  regles: RegleProcedure[];
  reglages: Reglages | null;
  cle: CryptoKey | null;
  clientId: string;
  onLocal: (c: DossierComplet) => void;
  relire: () => Promise<void>;
  /* la référence en clair d'un autre dossier du cabinet, si on la connaît (contrôle des conflits) */
  referenceDe?: (dossier: string) => string | null;
};

type Form =
  | { type: "partie" }
  | { type: "residence"; partie: Partie }
  | { type: "appel" }
  | { type: "delai_regle" }
  | { type: "delai_date" }
  | { type: "confirmer"; delai: Delai; demande: DemandeTamila }
  | { type: "corriger"; delai: Delai }
  | { type: "interrompre"; delai: Delai }
  | { type: "annuler"; delai: Delai }
  | { type: "acte"; delai: Delai }
  | { type: "audience" }
  | { type: "renvoyer"; audience: Audience }
  | { type: "avis" }
  | { type: "membre" }
  | { type: "muraille" }
  | { type: "decider"; demande: DemandeTamila }
  | { type: "cloture" }
  | { type: "export" }
  | { type: "piece" }
  | null;

const maintenant = () => new Date().toISOString();
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const CHIFFRE = "\\x01" + "00".repeat(28);

export default function DossierTamila({ complet, source, moi, personnes, regles, reglages, cle, clientId, onLocal, relire, referenceDe = () => null }: Props) {
  const { dossier: d, clair, parties, appel, delais, audiences, avis, membres, murailles, exports, pieces, lectures, demandes } = complet;
  const [fichier, setFichier] = useState<File | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [deplie, setDeplie] = useState<string | null>(null);
  const [calcul, setCalcul] = useState<CalculDelai | null>(null);

  /* les champs des formulaires, tous ensemble (un seul dialogue ouvert à la fois) */
  const [f, setF] = useState<Record<string, string>>({});
  const champ = (k: string, defaut = "") => f[k] ?? defaut;
  const poser = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const nomDe = (id: string | null | undefined) => (id ? (personnes.find((p) => p.user_id === id)?.nom ?? id.slice(0, 8)) : "—");
  const peutEcrire = ecritDossier(moi, d, membres, murailles);
  const peutGerer = gereDossier(moi, d, membres, murailles);
  const avocat = estAvocat(moi);
  const associe = estAssocie(moi);
  const gerant = estGerant(moi);
  const clairLisible = source === "exemple" || !!cle;
  const partiesLisibles = source === "exemple" || !!complet.consulteJusqu || parties.length > 0;

  const ouvrir = (x: Form) => {
    setErreur(null);
    setFait(null);
    setCalcul(null);
    setF({});
    setFichier(null);
    setForm(x);
  };

  async function envoyer(action: () => Promise<unknown>, local: () => DossierComplet, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await action();
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        onLocal(local());
      }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const regimeAppel = (introduit: string) => (introduit >= "2024-09-01" ? "cpc" : "cpc2017");
  const reglesApplicables = useMemo(() => {
    if (!appel) return [];
    return regles.filter((r) => r.regime === appel.regime && r.procedures.includes(appel.procedure) && (["destinataire", "toutes"].includes(r.partie) || r.partie === appel.role_client));
  }, [regles, appel]);
  const residenceClient = parties.find((p) => p.qualite === "client")?.residence ?? "inconnue";
  const demandesDe = (type: DemandeTamila["type_action"]) => demandes.filter((x) => x.type_action === type);
  const peutDecider = (dem: DemandeTamila) => !!moi && dem.roles_autorises.includes(moi.role);

  /* ——— un délai d'exemple posé en mémoire (calcul simplifié : mois + augmentation) ——— */
  const delaiExemple = (acte: Delai["acte"], echeance: string, nature: Delai["nature"], x: Partial<Delai>): Delai => ({
    id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, appel_id: appel?.id ?? null, avis_id: null, delai_id: crypto.randomUUID(), nature, regle_code: null, regle_version: null, acte,
    depart: null, territoire: appel?.territoire ?? d.territoire ?? "metropole", residence: residenceClient, augmentation_mois: 0, motif_augmentation: "aucune", echeance_calculee: nature === "regle" ? echeance : null,
    echeance_retenue: echeance, raisons: [], calcul: null, source_date: null, statut: "a_confirmer", demande_id: null, confirme_par: null, confirme_le: null, confirmation: null, motif_correction: null,
    responsable_id: d.responsable_id, interrompu_le: null, motif_interruption: null, acte_depose_le: null, motif_cloture: null, preuve_piece_id: null, clos_par: null, clos_le: null, motif_annulation: null,
    annule_par: null, annule_le: null, depasse_le: null, relance_48h_le: null, relance_j8_le: null, cree_le: maintenant(), maj_le: maintenant(), ...x,
  });
  const avecDemande = (t: Delai): { delai: Delai; demande: DemandeTamila } => {
    const id = crypto.randomUUID();
    return { delai: { ...t, demande_id: id }, demande: { id, type_action: "confirmer_delai", objet_id: d.id, resume: `Confirmer un délai de procédure : échéance le ${dateCourte(t.echeance_retenue)}`, payload: { delai_id: t.id, echeance: t.echeance_retenue }, statut: "en_attente", cree_le: maintenant(), roles_autorises: ["gerant", "admin", "valideur"] } };
  };
  const ajouterMois = (iso: string, mois: number) => {
    const dt = new Date(iso + "T12:00:00");
    dt.setMonth(dt.getMonth() + mois);
    return dt.toISOString().slice(0, 10);
  };
  const remplacerDelai = (t: Delai) => ({ ...complet, delais: delais.map((x) => (x.id === t.id ? t : x)) });

  /* ——— les gestes ——— */
  const soumettre = async () => {
    if (!form) return;
    switch (form.type) {
      case "partie": {
        const nom = champ("nom").trim();
        const courriel = champ("courriel").trim();
        const qualite = champ("qualite", "client");
        const residence = champ("residence", "metropole");
        const role = champ("role") || null;
        return envoyer(
          async () => {
            if (!cle) throw new Error("Sans la phrase du cabinet, le nom ne peut pas être chiffré.");
            return portes.ajouterPartie(d.id, await chiffrer(cle, nom), qualite, residence, role, courriel ? await chiffrer(cle, courriel) : null);
          },
          () => {
            const id = crypto.randomUUID();
            const p: Partie = { id, client_id: d.client_id, dossier_id: d.id, nom_chiffre: CHIFFRE, qualite: qualite as Partie["qualite"], role_procedure: role as Partie["role_procedure"], residence: residence as Partie["residence"], courriels_chiffres: courriel ? CHIFFRE : null, cree_le: maintenant(), cree_par: MOI };
            return { ...complet, parties: [...parties, p], partiesClair: { ...complet.partiesClair, [id]: { nom, courriels: courriel || null } } };
          },
          `${nom} est ajouté au dossier (nom chiffré).`,
        );
      }
      case "residence": {
        const residence = champ("residence", form.partie.residence);
        return envoyer(
          () => portes.modifierPartie(form.partie.id, residence, null, null),
          () => ({ ...complet, parties: parties.map((p) => (p.id === form.partie.id ? { ...p, residence: residence as Partie["residence"] } : p)) }),
          "La résidence est corrigée ; les prochains délais en tiendront compte.",
        );
      }
      case "appel": {
        const introduit = champ("introduit", aujourdhui());
        const role = champ("role", "appelant");
        const procedure = champ("procedure", "a_orienter");
        const territoire = champ("territoire", d.territoire ?? "metropole");
        return envoyer(
          () => portes.declarerAppel(d.id, introduit, role, procedure, territoire),
          () => {
            const a = { id: appel?.id ?? crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, introduit_le: introduit, regime: regimeAppel(introduit) as "cpc" | "cpc2017", procedure: procedure as "a_orienter", role_client: role as "appelant", territoire: territoire as "metropole", cloture_previsible_le: appel?.cloture_previsible_le ?? null, cree_le: maintenant(), maj_le: maintenant() };
            if (appel) return { ...complet, appel: a };
            /* la déclaration d'appel fait courir le délai pour conclure : trois mois, plus un si le client demeure outre-mer */
            const mois = ["guadeloupe", "martinique", "guyane", "la-reunion", "mayotte", "saint-barthelemy", "saint-martin", "saint-pierre-et-miquelon"].includes(residenceClient) && territoire === "metropole" ? 1 : 0;
            const echeance = ajouterMois(introduit, 3 + mois);
            const { delai, demande } = avecDemande(delaiExemple("conclure", echeance, "regle", { regle_code: `tamila.${a.regime}.908`, regle_version: 1, depart: introduit, augmentation_mois: mois, motif_augmentation: mois ? "outre_mer_devant_metropole" : "aucune", appel_id: a.id }));
            return { ...complet, appel: a, delais: role === "appelant" ? [...delais, delai] : delais, demandes: role === "appelant" ? [...demandes, demande] : demandes };
          },
          appel ? "L'appel est mis à jour." : "L'appel est déclaré : ses délais courent, un avocat les confirme.",
        );
      }
      case "delai_regle": {
        const regle = champ("regle", reglesApplicables[0]?.code ?? "");
        const depart = champ("depart", aujourdhui());
        const residence = champ("residence", residenceClient);
        const r = regles.find((x) => x.code === regle);
        return envoyer(
          () => portes.poserDelai(d.id, regle, depart, residence),
          () => {
            const mois = r?.augmentable && residence !== "metropole" && residence !== "inconnue" ? (residence === "etranger" ? 2 : 1) : 0;
            const { delai, demande } = avecDemande(delaiExemple(r?.acte ?? "conclure", ajouterMois(depart, 3 + mois), "regle", { regle_code: regle, regle_version: 1, depart, residence: residence as Delai["residence"], augmentation_mois: mois, motif_augmentation: mois ? (residence === "etranger" ? "etranger" : "outre_mer_devant_metropole") : r?.augmentable ? "aucune" : "non_augmentable" }));
            return { ...complet, delais: [...delais, delai], demandes: [...demandes, demande] };
          },
          "Le délai est posé, à confirmer par un avocat.",
        );
      }
      case "delai_date": {
        const echeance = champ("echeance", aujourdhui());
        const acte = champ("acte", "autre");
        const src = champ("source", "saisie");
        return envoyer(
          () => portes.poserDate(d.id, echeance, acte, src),
          () => {
            const t = delaiExemple(acte as Delai["acte"], echeance, "date_fixee", { source_date: src as Delai["source_date"], ...(avocat ? { statut: "confirme", confirme_par: moi?.user_id ?? null, confirme_le: maintenant(), confirmation: "saisie" } : {}) });
            if (avocat) return { ...complet, delais: [...delais, t] };
            const { delai, demande } = avecDemande(t);
            return { ...complet, delais: [...delais, delai], demandes: [...demandes, demande] };
          },
          avocat ? "La date fixée est posée et confirmée." : "La date fixée est posée, à confirmer par un avocat.",
        );
      }
      case "confirmer":
      case "decider": {
        const dem = form.demande;
        const decision = champ("decision", "approuve") as "approuve" | "rejete";
        const commentaire = champ("commentaire").trim() || null;
        return envoyer(
          () => portes.decider(dem.id, decision, commentaire),
          () => {
            const sans = demandes.filter((x) => x.id !== dem.id);
            if (dem.type_action === "confirmer_delai") {
              const delaiId = String(dem.payload.delai_id ?? "");
              return { ...complet, demandes: sans, delais: delais.map((t) => (t.id === delaiId ? { ...t, statut: decision === "approuve" ? "confirme" : "rejete", confirme_par: decision === "approuve" ? moi?.user_id ?? null : null, confirme_le: decision === "approuve" ? maintenant() : null, confirmation: decision === "approuve" ? "approbation" : null } : t)) };
            }
            if (dem.type_action === "ouvrir_dossier") return { ...complet, demandes: sans, dossier: { ...d, statut: decision === "approuve" ? "ouvert" : "refuse", ouvert_le: decision === "approuve" ? maintenant() : null, ouvert_par: decision === "approuve" ? moi?.user_id ?? null : null } };
            if (dem.type_action === "cloturer_dossier") {
              const quand = new Date();
              quand.setDate(quand.getDate() + (reglages?.delai_cloture_jours ?? 7));
              quand.setHours(3, 0, 0, 0);
              return { ...complet, demandes: sans, dossier: decision === "approuve" ? { ...d, statut: "clos", statut_avant_cloture: d.statut as "ouvert", clos_le: maintenant(), demande_cloture_id: dem.id, effacement_prevu_le: quand.toISOString() } : d };
            }
            const mid = String(dem.payload.muraille_id ?? "");
            return { ...complet, demandes: sans, murailles: murailles.map((m) => (m.id === mid && decision === "approuve" ? { ...m, leve_le: maintenant(), leve_par: moi?.user_id ?? null } : m)) };
          },
          decision === "approuve" ? "Approuvé : la décision est exécutée." : "Refusé.",
        );
      }
      case "corriger": {
        const echeance = champ("echeance", form.delai.echeance_retenue);
        const motif = champ("motif", "date_notifiee");
        return envoyer(
          () => portes.corrigerDelai(form.delai.id, echeance, motif),
          () => remplacerDelai({ ...form.delai, statut: "confirme", echeance_retenue: echeance, confirmation: "saisie", confirme_par: moi?.user_id ?? null, confirme_le: maintenant(), motif_correction: motif }),
          "La date retenue est corrigée ; le calcul reste tel quel, à côté.",
        );
      }
      case "interrompre": {
        const motif = champ("motif", "mediation");
        const depuis = champ("depuis", aujourdhui());
        return envoyer(
          () => portes.interrompreDelai(form.delai.id, motif, depuis),
          () => remplacerDelai({ ...form.delai, statut: "interrompu", interrompu_le: depuis, motif_interruption: motif }),
          "Le délai est interrompu (art. 915-3) ; à la reprise, saisissez la nouvelle date.",
        );
      }
      case "annuler": {
        const motif = champ("motif", "desistement");
        return envoyer(
          () => portes.annulerDelai(form.delai.id, motif),
          () => remplacerDelai({ ...form.delai, statut: "annule", motif_annulation: motif, annule_par: moi?.user_id ?? null, annule_le: maintenant() }),
          "Le délai est annulé, avec son motif.",
        );
      }
      case "acte": {
        const depose = champ("depose", aujourdhui());
        return envoyer(
          () => portes.declarerActe(form.delai.id, depose, null),
          () => remplacerDelai({ ...form.delai, statut: "clos", acte_depose_le: depose, motif_cloture: "declaration", clos_par: moi?.user_id ?? null, clos_le: maintenant() }),
          depose > form.delai.echeance_retenue ? "L'acte est enregistré, après l'échéance : une alerte critique est levée." : "L'acte déposé clôt le délai.",
        );
      }
      case "audience": {
        const date = champ("date", aujourdhui());
        const heure = champ("heure", "14:00");
        const nature = champ("nature", "mise_en_etat");
        const juridiction = champ("juridiction", d.juridiction ?? "").trim() || null;
        const chambre = champ("chambre").trim() || null;
        const av = champ("avocat") || null;
        const iso = new Date(`${date}T${heure || "09:00"}:00`).toISOString();
        return envoyer(
          () => portes.ajouterAudience(d.id, iso, nature, juridiction, chambre, av, !!heure),
          () => ({ ...complet, audiences: [...audiences, { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, avis_id: null, date_heure: iso, heure_connue: !!heure, nature: nature as Audience["nature"], juridiction, chambre, avocat_id: av, statut: "prevue", renvoyee_a: null, source: "saisie", cree_le: maintenant() }] }),
          "L'audience est posée.",
        );
      }
      case "renvoyer": {
        const statut = champ("statut", "renvoyee");
        const date = champ("date", "");
        const heure = champ("heure", "14:00");
        const iso = statut === "renvoyee" && date ? new Date(`${date}T${heure || "09:00"}:00`).toISOString() : null;
        return envoyer(
          () => portes.changerAudience(form.audience.id, statut, iso),
          () => {
            const id = crypto.randomUUID();
            const suite = statut === "renvoyee" && iso ? [{ ...form.audience, id, date_heure: iso, statut: "prevue" as const, renvoyee_a: null, cree_le: maintenant() }] : [];
            return { ...complet, audiences: [...audiences.map((a) => (a.id === form.audience.id ? { ...a, statut: statut as Audience["statut"], renvoyee_a: suite[0]?.id ?? null } : a)), ...suite] };
          },
          statut === "renvoyee" ? "L'audience est renvoyée ; la nouvelle est posée." : statut === "tenue" ? "L'audience est tenue." : "L'audience est annulée.",
        );
      }
      case "avis": {
        const type = champ("type", "rpva_avis_audience");
        const valeurs: Record<string, unknown> = { date_avis: champ("date_avis", aujourdhui()) };
        if (champ("date_audience")) valeurs.date_audience = `${champ("date_audience")}T${champ("heure_audience", "09:00")}:00`;
        if (champ("date_limite")) valeurs.date_limite = champ("date_limite");
        if (champ("date_cloture")) valeurs.date_cloture_previsible = champ("date_cloture");
        if (champ("partie")) valeurs.partie_visee = champ("partie");
        if (champ("rang")) valeurs.rang = champ("rang");
        if (champ("depose_le")) valeurs.depose_le = `${champ("depose_le")}T${champ("heure_depot", "12:00")}:00`;
        return envoyer(
          () => portes.avisLu(clientId, d.id, type, valeurs),
          () => {
            const a = { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, piece_id: null, type_avis: type as Audience["nature"] extends never ? never : import("./types").TypeAvis, date_avis: String(valeurs.date_avis), date_audience: valeurs.date_audience ? new Date(String(valeurs.date_audience)).toISOString() : null, heure_audience_connue: !!valeurs.date_audience, date_cloture_previsible: (valeurs.date_cloture_previsible as string) ?? null, date_limite: (valeurs.date_limite as string) ?? null, partie_visee: (valeurs.partie_visee as "appelant") ?? null, rang: valeurs.rang ? Number(valeurs.rang) : null, depose_le: valeurs.depose_le ? new Date(String(valeurs.depose_le)).toISOString() : null, confiance: "saisie" as const, rg_concorde: null, statut: appel ? ("applique" as const) : ("sans_effet" as const), effet: appel ? (type === "rpva_avis_audience" ? "audience_ajoutee" : "delais_poses") : "appel_a_declarer", cree_le: maintenant() };
            const suite = { ...complet, avis: [a, ...avis] };
            if (!appel) return suite;
            if (type === "rpva_avis_audience" && a.date_audience) return { ...suite, audiences: [...audiences, { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, avis_id: a.id, date_heure: a.date_audience, heure_connue: true, nature: "audience" as const, juridiction: d.juridiction, chambre: null, avocat_id: null, statut: "prevue" as const, renvoyee_a: null, source: "avis" as const, cree_le: maintenant() }] };
            if (type === "rpva_ordonnance_mee" && a.date_limite) {
              const { delai, demande } = avecDemande(delaiExemple("autre", a.date_limite, "date_fixee", { source_date: "ordonnance", avis_id: a.id }));
              return { ...suite, appel: { ...appel, procedure: appel.procedure === "a_orienter" ? "mise_en_etat" : appel.procedure }, delais: [...delais, delai], demandes: [...demandes, demande] };
            }
            return suite;
          },
          appel ? "L'avis est appliqué au dossier." : "L'avis est enregistré ; déclarez l'appel pour que Tamila en calcule les délais.",
        );
      }
      case "membre": {
        const user = champ("user", "");
        const role = champ("role", "intervenant");
        const jusqu = champ("jusqu") ? new Date(`${champ("jusqu")}T23:59:00`).toISOString() : null;
        return envoyer(
          () => portes.ajouterMembre(d.id, user, role, jusqu),
          () => ({ ...complet, membres: [...membres.filter((m) => m.user_id !== user), { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, user_id: user, role_dossier: role as "intervenant", jusqu_au: jusqu, ajoute_par: moi?.user_id ?? null, ajoute_le: maintenant() }] }),
          `${nomDe(user)} entre dans le dossier (${ROLES_DOSSIER[role as "intervenant"].toLowerCase()}).`,
        );
      }
      case "muraille": {
        const user = champ("user", "");
        const motif = champ("motif").trim();
        return envoyer(
          async () => portes.poserMuraille(d.id, user, motif && cle ? await chiffrer(cle, motif) : null),
          () => ({ ...complet, membres: membres.filter((m) => m.user_id !== user), murailles: [...murailles, { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, user_id: user, motif_chiffre: motif ? CHIFFRE : null, pose_par: moi?.user_id ?? MOI, pose_le: maintenant(), leve_le: null, leve_par: null, demande_levee_id: null }] }),
          `${nomDe(user)} est écarté du dossier : il ne le voit plus.`,
        );
      }
      case "cloture":
        return envoyer(
          () => portes.demanderCloture(d.id),
          () => ({ ...complet, demandes: [...demandes, { id: crypto.randomUUID(), type_action: "cloturer_dossier", objet_id: d.id, resume: "Clôture d'un dossier et effacement de son contenu", payload: { dossier_id: d.id }, statut: "en_attente", cree_le: maintenant(), roles_autorises: ["gerant", "admin"] }] }),
          "La clôture est demandée : un associé la décide ; l'effacement suivra à l'échéance.",
        );
      case "piece": {
        if (!fichier) return;
        const nom = fichier.name;
        const type = champ("type_piece") || null;
        return envoyer(
          async () => {
            if (!cle) throw new Error("Sans la phrase du cabinet, la pièce ne peut pas être chiffrée.");
            const clair = new Uint8Array(await fichier.arrayBuffer());
            const chiffre = await chiffrerOctets(cle, clair);
            const sha = await empreinte(chiffre);
            /* le chemin porte le début de l'empreinte : deux dépôts du même nom ne se recouvrent jamais
               (le bucket n'accorde que l'ajout aux membres, pas la réécriture) */
            const chemin = `${clientId}/tamila_dossier/${d.id}/${nom}.${sha.slice(0, 12)}.chiffre`;
            await portes.televerser(chemin, chiffre);
            return portes.deposerPiece(d.id, nom, fichier.type || "application/octet-stream", chiffre.length, sha, chemin, type);
          },
          () => ({ ...complet, pieces: [{ id: crypto.randomUUID(), client_id: d.client_id, objet_id: d.id, nom_fichier: nom, mime: fichier.type || "application/octet-stream", octets: fichier.size + 29, sha256: "0".repeat(64), chemin: `${d.client_id}/tamila_dossier/${d.id}/${nom}.chiffre`, statut: d.statut === "attente" ? "a_rattacher" : "recue", type_piece: type, nb_pages: null, chiffrement: "dossier:v1", depose_par: moi?.user_id ?? MOI, recue_le: maintenant(), motif: null }, ...pieces] }),
          `${nom} est chiffré dans votre navigateur et déposé dans le dossier ; sa lecture attend le coffre (le lecteur ne lit pas encore les pièces chiffrées).`,
        );
      }
      case "export":
        return envoyer(
          () => portes.demanderExport(d.id),
          () => ({ ...complet, exports: [{ id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, demande_par: moi?.user_id ?? MOI, statut: "a_preparer", chemin: null, octets: null, empreinte_manifeste: null, motif_echec: null, cree_le: maintenant(), pret_le: null, expire_le: null, telecharge_le: null, telechargements: 0, purge_le: null }, ...exports] }),
          "L'export est demandé : l'archive sera prête sous peu, puis conservée quelques jours.",
        );
    }
  };

  const gesteSimple = (action: () => Promise<unknown>, local: () => DossierComplet, message: string) => envoyer(action, local, message);

  const telecharger = async (x: { id: string; chemin: string | null }) => {
    setErreur(null);
    try {
      if (source === "reelle") {
        const chemin = await portes.telechargerExport(x.id);
        const url = await portes.urlArchive(chemin);
        window.open(url, "_blank", "noopener");
        await relire();
      } else {
        onLocal({ ...complet, exports: exports.map((e) => (e.id === x.id ? { ...e, telechargements: e.telechargements + 1, telecharge_le: maintenant() } : e)), lectures: [{ user_id: moi?.user_id ?? MOI, lu_le: maintenant(), contexte: "export.telechargement" }, ...lectures] });
        setFait("Le téléchargement est compté et tracé comme une lecture du dossier.");
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'archive n'a pas pu être ouverte.");
    }
  };

  const calculer = async () => {
    setErreur(null);
    const regle = champ("regle", reglesApplicables[0]?.code ?? "");
    const depart = champ("depart", aujourdhui());
    const residence = champ("residence", residenceClient);
    try {
      if (source === "reelle") setCalcul(await portes.calculerDelai(regle, depart, appel?.territoire ?? "metropole", residence));
      else {
        const r = regles.find((x) => x.code === regle);
        const mois = r?.augmentable && !["metropole", "inconnue"].includes(residence) ? (residence === "etranger" ? 2 : 1) : 0;
        const brute = ajouterMois(depart, 3 + mois);
        setCalcul({ echeance: brute, brute, base: brute, regle, version: 1, regime: appel?.regime ?? "cpc", article: r?.article ?? "908", acte: r?.acte ?? "conclure", sanction: r?.sanction ?? "caducite", libelle: r?.libelle_court ?? null, source: null, source_url: null, territoire: appel?.territoire ?? "metropole", residence, depart, augmentation_mois: mois, motif_augmentation: mois ? (residence === "etranger" ? "etranger" : "outre_mer_devant_metropole") : "aucune", source_augmentation: null, raisons: residence === "inconnue" ? ["domicile_inconnu"] : [], alternatives: [], detail: `3 mois à compter du ${dateCourte(depart)} (CPC, art. ${r?.article ?? "908"})${mois ? `, augmentés ${mois === 2 ? "de deux mois" : "d'un mois"} (art. 915-4)` : ""} : ${dateCourte(brute)}.` });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le calcul n'a pas répondu.");
    }
  };

  const s = STATUTS_DOSSIER[d.statut];
  const delaisTries = [...delais].sort((a, b) => (delaiCourt(a) === delaiCourt(b) ? a.echeance_retenue.localeCompare(b.echeance_retenue) : delaiCourt(a) ? -1 : 1));
  const audiencesTriees = [...audiences].sort((a, b) => a.date_heure.localeCompare(b.date_heure));
  const dialogueTitre: Record<NonNullable<Form>["type"], string> = {
    partie: "Ajouter une partie", residence: "Corriger la résidence", appel: appel ? "Modifier l'appel" : "Déclarer l'appel", delai_regle: "Poser un délai de procédure", delai_date: "Poser une date fixée par le juge",
    confirmer: "Confirmer le délai", corriger: "Corriger la date retenue", interrompre: "Interrompre le délai", annuler: "Annuler le délai", acte: "Déclarer l'acte déposé", audience: "Ajouter une audience",
    renvoyer: "Renvoyer, tenir ou annuler l'audience", avis: "Saisir un avis RPVA", membre: "Ajouter une personne au dossier", muraille: "Poser une muraille", decider: "Décider", cloture: "Demander la clôture", export: "Exporter le dossier", piece: "Déposer une pièce",
  };

  return (
    <div className="esp-dossier">
      {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— l'en-tête ——— */}
      <section className="esp-carte" aria-label="Identité du dossier">
        <div className="esp-carte-tete">
          <div>
            <h2 className="esp-carte-titre"><span className="esp-mono">{clair?.reference ?? "Référence chiffrée"}</span> — {clair?.intitule ?? <span className="tam-chiffre">intitulé chiffré</span>}</h2>
            <div className="esp-kpi-sous" style={{ marginTop: 4 }}>{clair?.numero_rg ? `RG ${clair.numero_rg} · ` : ""}{libelleMatiere(d.matiere)} · {d.mode === "dommage_corporel" ? "Dommage corporel" : "Contentieux"}{d.perso ? " · clientèle personnelle" : ""}</div>
          </div>
          <span className="esp-item-haut">
            <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
            {!clairLisible && source === "reelle" ? <Pastille teinte="gris" title="Tapez la phrase du cabinet pour lire le dossier"><Lock width={12} height={12} aria-hidden="true" /> Chiffré</Pastille> : null}
          </span>
        </div>
        <div className="esp-carte-corps">
          <dl className="esp-def esp-def--trois">
            <Def etiquette="Juridiction">{d.juridiction ?? "—"}</Def>
            <Def etiquette="Siège de la cour">{libelleTerritoire(appel?.territoire ?? d.territoire)}</Def>
            <Def etiquette="Responsable">{nomDe(d.responsable_id)}</Def>
            <Def etiquette="Ouvert le">{d.ouvert_le ? dateCourte(d.ouvert_le) : "en attente"}</Def>
            {d.audit_fin_le ? <Def etiquette="Fin de l'audit">{dateCourte(d.audit_fin_le)}</Def> : null}
            {d.clos_le ? <Def etiquette="Clos le">{dateCourte(d.clos_le)}</Def> : null}
            {d.effacement_prevu_le ? <Def etiquette="Effacement prévu"><span style={{ color: "var(--esp-rouge)" }}>{dateHeure(d.effacement_prevu_le)}</span></Def> : null}
            <Def etiquette="Clé du dossier">{complet.cle ? `${complet.cle.statut === "active" ? "active" : complet.cle.statut} · ${complet.cle.fournisseur === "local" ? "phrase du cabinet" : "coffre Scaleway"}` : associe ? "—" : "lue par les associés"}</Def>
          </dl>
          {demandes.filter((x) => x.type_action !== "confirmer_delai").map((dem) => (
            <div key={dem.id} style={{ marginTop: 12 }}>
              <Avis teinte="ambre">
                <strong>Décision en attente.</strong> {dem.resume} — depuis le {dateCourte(dem.cree_le)}.
                {peutDecider(dem) ? (
                  <div className="esp-actions" style={{ marginTop: 8 }}>
                    <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => { ouvrir({ type: "decider", demande: dem }); poser("decision", "approuve"); }}><Check width={14} height={14} aria-hidden="true" /> Approuver</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { ouvrir({ type: "decider", demande: dem }); poser("decision", "rejete"); }}><X width={14} height={14} aria-hidden="true" /> Refuser</button>
                  </div>
                ) : (
                  <> Revient à : {dem.roles_autorises.map((r) => ROLES_CABINET[r as Personne["role"]] ?? r).join(", ")}.</>
                )}
              </Avis>
            </div>
          ))}
          <div className="esp-actions" style={{ marginTop: 12 }}>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!["attente", "ouvert", "audit", "clos"].includes(d.statut)} onClick={() => ouvrir({ type: "export" })}><Archive width={14} height={14} aria-hidden="true" /> Exporter le dossier</button>
            {["ouvert", "audit"].includes(d.statut) && !demandesDe("cloturer_dossier").length ? (
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutGerer} title={peutGerer ? undefined : "Le responsable ou un associé demande la clôture"} onClick={() => ouvrir({ type: "cloture" })}>Clôturer le dossier</button>
            ) : null}
            {d.statut === "clos" && gerant ? (
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => gesteSimple(() => portes.annulerCloture(d.id), () => ({ ...complet, dossier: { ...d, statut: d.statut_avant_cloture ?? "ouvert", clos_le: null, demande_cloture_id: null, statut_avant_cloture: null, effacement_prevu_le: null } }), "La clôture est annulée : le dossier est rouvert.")}>Annuler la clôture</button>
            ) : null}
            {d.statut === "audit" && gerant ? (
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => gesteSimple(() => portes.convertirAudit(d.id), () => ({ ...complet, dossier: { ...d, statut: "ouvert", effacement_prevu_le: null } }), "L'audit devient un dossier ordinaire : plus d'effacement programmé.")}>Convertir l&apos;audit en dossier</button>
            ) : null}
          </div>
        </div>
      </section>

      {/* ——— les parties ——— */}
      <section className="esp-carte" aria-label="Parties">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Parties</h2>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || (source === "reelle" && !cle)} title={source === "reelle" && !cle ? "La phrase du cabinet est nécessaire pour chiffrer le nom" : undefined} onClick={() => ouvrir({ type: "partie" })}><UserPlus width={14} height={14} aria-hidden="true" /> Ajouter</button>
        </div>
        <div className="esp-carte-corps">
          {!partiesLisibles ? (
            <Avis teinte="bleu">Les parties se lisent après une lecture tracée du dossier (trente minutes) : le journal des accès la porte.</Avis>
          ) : parties.length === 0 ? (
            <p className="esp-kpi-sous">Aucune partie. Le domicile du client fixe l&apos;augmentation des délais (art. 915-4) : ajoutez-le d&apos;abord.</p>
          ) : (
            <div>
              {parties.map((p) => {
                const c = complet.partiesClair[p.id];
                return (
                  <div key={p.id} className="tam-ligne">
                    <div className="tam-ligne-haut">
                      <span className="tam-ligne-titre">{c?.nom ?? <span className="tam-chiffre">nom chiffré</span>}</span>
                      <Pastille teinte={p.qualite === "client" ? "noir" : "gris"}>{QUALITES[p.qualite]}</Pastille>
                      {p.role_procedure ? <Pastille teinte="bleu" contour>{ROLES_PROCEDURE[p.role_procedure]}</Pastille> : null}
                    </div>
                    <div className="tam-ligne-meta">
                      <span>Demeure : {libelleTerritoire(p.residence)}{p.qualite === "client" && p.residence === "inconnue" ? " — à préciser, les délais sont incertains" : ""}</span>
                      {c?.courriels ? <span>{c.courriels}</span> : null}
                    </div>
                    {peutEcrire ? (
                      <div className="tam-ligne-actions">
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { ouvrir({ type: "residence", partie: p }); poser("residence", p.residence); }}><Pencil width={13} height={13} aria-hidden="true" /> Résidence</button>
                        <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => gesteSimple(() => portes.retirerPartie(p.id), () => ({ ...complet, parties: parties.filter((x) => x.id !== p.id) }), "La partie est retirée.")}>Retirer</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ——— l'appel et les délais ——— */}
      <section className="esp-carte" aria-label="Appel et délais de procédure">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Appel et délais de procédure</h2>
          <span className="esp-item-haut">
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire} onClick={() => { ouvrir({ type: "appel" }); if (appel) { poser("introduit", appel.introduit_le); poser("role", appel.role_client); poser("procedure", appel.procedure); poser("territoire", appel.territoire); } }}><Gavel width={14} height={14} aria-hidden="true" /> {appel ? "Modifier l'appel" : "Déclarer l'appel"}</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || !appel} title={appel ? undefined : "Déclarez d'abord l'appel : sa date fixe le régime"} onClick={() => ouvrir({ type: "delai_regle" })}><CalendarClock width={14} height={14} aria-hidden="true" /> Délai</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire} onClick={() => ouvrir({ type: "delai_date" })}>Date fixée</button>
          </span>
        </div>
        <div className="esp-carte-corps">
          {appel ? (
            <dl className="esp-def esp-def--trois">
              <Def etiquette="Appel introduit le">{dateCourte(appel.introduit_le)}</Def>
              <Def etiquette="Régime">{appel.regime === "cpc" ? "CPC depuis le 01/09/2024" : "CPC antérieur au 01/09/2024"}</Def>
              <Def etiquette="Procédure">{PROCEDURES[appel.procedure]}</Def>
              <Def etiquette="Le client est">{ROLES_PROCEDURE[appel.role_client]}</Def>
              <Def etiquette="Cour">{libelleTerritoire(appel.territoire)}</Def>
              {appel.cloture_previsible_le ? <Def etiquette="Clôture prévisible">{dateCourte(appel.cloture_previsible_le)}</Def> : null}
            </dl>
          ) : (
            <p className="esp-kpi-sous">Aucun appel déclaré. La date de la déclaration d&apos;appel fixe le régime des délais ; déclarez-le pour que Tamila les calcule.</p>
          )}
        </div>
        <div className="esp-carte-corps">
          {delaisTries.length === 0 ? (
            <p className="esp-kpi-sous">Aucun délai.</p>
          ) : (
            delaisTries.map((t) => {
              const st = STATUTS_DELAI[t.statut];
              const jours = joursAvant(t.echeance_retenue);
              const court = delaiCourt(t);
              const dem = demandes.find((x) => x.id === t.demande_id) ?? null;
              const regle = regles.find((r) => r.code === t.regle_code) ?? null;
              const c = t.calcul;
              return (
                <div key={t.id} className="tam-ligne">
                  <div className="tam-ligne-haut">
                    <span className="tam-ligne-date" data-retard={court && jours < 0} data-proche={court && jours >= 0 && jours <= 15}>{dateCourte(t.echeance_retenue)}</span>
                    <span className="tam-ligne-titre">{ACTES[t.acte]}</span>
                    <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
                    {court && jours < 0 ? <Pastille teinte="rouge">Dépassé</Pastille> : court && jours <= 15 ? <Pastille teinte="rouge">J{jours === 0 ? "" : `-${jours}`}</Pastille> : null}
                    {t.raisons.map((r) => <Pastille key={r} teinte="ambre" contour title={RAISONS[r] ?? r}>À vérifier : {RAISONS[r] ?? r}</Pastille>)}
                  </div>
                  <div className="tam-ligne-meta">
                    {t.nature === "regle" ? <span>CPC, art. {c?.article ?? regle?.article ?? "—"} · départ le {t.depart ? dateCourte(t.depart) : "—"}{t.augmentation_mois ? ` · + ${t.augmentation_mois === 1 ? "un mois" : "deux mois"}` : ""}</span> : <span>Date fixée par le juge · {t.source_date === "ordonnance" ? "ordonnance" : t.source_date === "calendrier_de_procedure" ? "calendrier de procédure" : t.source_date === "avis" ? "avis du greffe" : "saisie"}</span>}
                    {t.echeance_calculee && t.echeance_calculee !== t.echeance_retenue ? <span>Calculée au {dateCourte(t.echeance_calculee)}, corrigée{t.motif_correction ? ` (${MOTIFS_CORRECTION.find((m) => m[0] === t.motif_correction)?.[1].toLowerCase() ?? t.motif_correction})` : ""}</span> : null}
                    {t.confirme_par ? <span>Confirmé par {nomDe(t.confirme_par)} le {dateCourte(t.confirme_le)}</span> : null}
                    {t.statut === "interrompu" ? <span>Interrompu depuis le {dateCourte(t.interrompu_le)} : {MOTIFS_INTERRUPTION.find((m) => m[0] === t.motif_interruption)?.[1].toLowerCase() ?? t.motif_interruption}</span> : null}
                    {t.statut === "clos" ? <span>Acte déposé le {dateCourte(t.acte_depose_le)}{t.motif_cloture === "accuse_rpva" ? ", preuve : accusé RPVA" : `, déclaré par ${nomDe(t.clos_par)}`}</span> : null}
                    {t.statut === "annule" ? <span>Annulé par {nomDe(t.annule_par)} : {MOTIFS_ANNULATION.find((m) => m[0] === t.motif_annulation)?.[1].toLowerCase() ?? t.motif_annulation}</span> : null}
                    {t.motif_augmentation && t.motif_augmentation !== "aucune" && t.nature === "regle" ? <span>{MOTIFS_AUGMENTATION[t.motif_augmentation] ?? t.motif_augmentation}</span> : null}
                  </div>
                  {t.nature === "regle" ? (
                    <div>
                      <button type="button" className="tam-depli" aria-expanded={deplie === t.id} onClick={() => setDeplie(deplie === t.id ? null : t.id)}>{deplie === t.id ? "Masquer le calcul" : "Comment la date est calculée"}</button>
                      {deplie === t.id ? (
                        <div className="tam-calcul">
                          {c?.detail ?? `${regle?.libelle_court ?? "Délai"} (CPC, art. ${regle?.article ?? "—"}) à compter du ${t.depart ? dateCourte(t.depart) : "—"}${t.augmentation_mois ? `, augmenté ${t.augmentation_mois === 1 ? "d'un mois" : "de deux mois"} (art. 915-4)` : ""} : ${dateCourte(t.echeance_calculee)}.`}
                          {c?.alternatives?.length ? <span className="tam-calcul-source">Autres dates possibles : {c.alternatives.map((a) => `${a.motif === "d_un_bloc" ? "calculé d'un bloc" : a.motif === "un_mois_de_plus" ? "avec un mois de plus" : "avec deux mois de plus"} → ${dateCourte(a.echeance)}`).join(" · ")}.</span> : null}
                          <span className="tam-calcul-source">Sanction : {c?.sanction === "caducite" || regle?.sanction === "caducite" ? "caducité de la déclaration d'appel" : c?.sanction === "irrecevabilite" || regle?.sanction === "irrecevabilite" ? "irrecevabilité des conclusions" : "selon la partie"}{c?.source ? ` · ${c.source}` : ""}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {court && peutEcrire ? (
                    <div className="tam-ligne-actions">
                      {t.statut !== "confirme" && dem ? (
                        <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!avocat || !peutDecider(dem)} title={avocat ? undefined : "Un avocat confirme le délai"} onClick={() => { ouvrir({ type: "confirmer", delai: t, demande: dem }); poser("decision", "approuve"); }}><Check width={13} height={13} aria-hidden="true" /> Confirmer</button>
                      ) : null}
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!avocat} onClick={() => { ouvrir({ type: "corriger", delai: t }); poser("echeance", t.echeance_retenue); }}><Pencil width={13} height={13} aria-hidden="true" /> Corriger la date</button>
                      {t.nature === "regle" && (regle?.interruptible ?? true) && t.statut !== "interrompu" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!avocat} onClick={() => ouvrir({ type: "interrompre", delai: t })}>Interrompre</button> : null}
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!avocat} onClick={() => ouvrir({ type: "acte", delai: t })}><FileSignature width={13} height={13} aria-hidden="true" /> Acte déposé</button>
                      <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!avocat} onClick={() => ouvrir({ type: "annuler", delai: t })}><Ban width={13} height={13} aria-hidden="true" /> Annuler</button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ——— les audiences ——— */}
      <section className="esp-carte" aria-label="Audiences">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Audiences</h2>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire} onClick={() => { ouvrir({ type: "audience" }); poser("juridiction", d.juridiction ?? ""); }}><CalendarPlus width={14} height={14} aria-hidden="true" /> Ajouter</button>
        </div>
        <div className="esp-carte-corps">
          {audiencesTriees.length === 0 ? <p className="esp-kpi-sous">Aucune audience.</p> : audiencesTriees.map((a) => {
            const st = STATUTS_AUDIENCE[a.statut];
            return (
              <div key={a.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-date" data-proche={a.statut === "prevue" && joursAvant(a.date_heure) <= 15}>{a.heure_connue ? dateHeure(a.date_heure) : dateCourte(a.date_heure)}</span>
                  <span className="tam-ligne-titre">{NATURES_AUDIENCE[a.nature]}</span>
                  <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
                  {a.source === "avis" ? <Pastille teinte="gris" contour>Venue d&apos;un avis</Pastille> : null}
                </div>
                <div className="tam-ligne-meta">
                  <span>{[a.juridiction, a.chambre].filter(Boolean).join(" · ") || "—"}</span>
                  {a.avocat_id ? <span>Plaide : {nomDe(a.avocat_id)}</span> : null}
                  {a.renvoyee_a ? <span>Renvoyée au {dateCourte(audiences.find((x) => x.id === a.renvoyee_a)?.date_heure)}</span> : null}
                </div>
                {a.statut === "prevue" && peutEcrire ? (
                  <div className="tam-ligne-actions">
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { ouvrir({ type: "renvoyer", audience: a }); poser("statut", "renvoyee"); }}>Renvoyer / tenue / annulée</button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* ——— les pièces ——— */}
      <section className="esp-carte" aria-label="Pièces">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Pièces</h2>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || (source === "reelle" && !cle)} title={source === "reelle" && !cle ? "La phrase du cabinet est nécessaire pour chiffrer la pièce" : undefined} onClick={() => ouvrir({ type: "piece" })}><Upload width={14} height={14} aria-hidden="true" /> Déposer</button>
        </div>
        <div className="esp-carte-corps">
          {pieces.length === 0 ? <p className="esp-kpi-sous">Aucune pièce. Chaque pièce est chiffrée dans votre navigateur avec la clé du dossier avant de partir ; le socle n&apos;en voit que des octets.</p> : pieces.map((pc) => (
            <div key={pc.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">{pc.nom_fichier}</span>
                <Pastille teinte={pc.statut === "lue" ? "vert" : pc.statut === "echec" || pc.statut === "rejetee" ? "rouge" : pc.statut === "a_rattacher" ? "ambre" : "bleu"}>{pc.statut === "lue" ? "Lue" : pc.statut === "a_rattacher" ? "Attend l'ouverture" : pc.statut === "en_lecture" ? "En lecture" : pc.statut === "echec" ? "Lecture en échec" : pc.statut === "rejetee" ? "Rejetée" : pc.statut === "a_verifier" ? "À vérifier" : "Reçue"}</Pastille>
                {pc.chiffrement ? <Pastille teinte="noir" contour><Lock width={11} height={11} aria-hidden="true" /> Chiffrée</Pastille> : null}
                {pc.type_piece ? <Pastille teinte="gris" contour>{TYPES_AVIS[pc.type_piece as keyof typeof TYPES_AVIS] ?? pc.type_piece}</Pastille> : null}
              </div>
              <div className="tam-ligne-meta">
                <span>Déposée le {dateCourte(pc.recue_le)} par {nomDe(pc.depose_par)}</span>
                <span>{(pc.octets / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} Ko</span>
                {pc.motif ? <span>{pc.motif === "CHIFFREMENT_NON_PRIS_EN_CHARGE" ? "Le lecteur ne lit pas encore les pièces chiffrées" : pc.motif}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ——— les honoraires (b4_06) ——— */}
      <HonorairesTamila dossier={d} source={source} moi={moi} personnes={personnes} pieces={pieces} cle={cle} peutEcrire={peutEcrire} peutGerer={peutGerer && avocat} peutEncaisser={(peutGerer && avocat) || (associe && !murailles.some((m) => m.user_id === moi?.user_id && !m.leve_le))} clientId={clientId} gerant={gerant} entete={reglages?.facture_entete ?? {}} clair={clair} clientNom={(() => { const p = parties.find((x) => x.qualite === "client"); return p ? (complet.partiesClair[p.id]?.nom ?? null) : null; })()} />

      {/* ——— conflits d'intérêts et vigilance LCB-FT (b4_07) ——— */}
      <ConformiteTamila dossier={d} source={source} clientId={clientId} parties={parties} partiesClair={complet.partiesClair} pieces={pieces} peutEcrire={peutEcrire} peutGerer={peutGerer && avocat} gerant={gerant} referenceDe={referenceDe} />

      {/* ——— les avis RPVA ——— */}
      <section className="esp-carte" aria-label="Avis RPVA">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Avis RPVA</h2>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || !["ouvert", "audit"].includes(d.statut)} onClick={() => ouvrir({ type: "avis" })}>Saisir un avis</button>
        </div>
        <div className="esp-carte-corps">
          {avis.length === 0 ? (
            <p className="esp-kpi-sous">Aucun avis. Les avis lus dans les pièces arriveront ici d&apos;eux-mêmes ; tant que le lecteur ne lit pas les pièces chiffrées, saisissez-les.</p>
          ) : avis.map((a) => {
            const st = STATUTS_AVIS[a.statut] ?? { libelle: a.statut, teinte: "gris" as const };
            return (
              <div key={a.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-date">{dateCourte(a.date_avis)}</span>
                  <span className="tam-ligne-titre">{TYPES_AVIS[a.type_avis] ?? a.type_avis}</span>
                  <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
                  <Pastille teinte="gris" contour>{a.confiance === "saisie" ? "Saisi" : a.confiance === "gabarit" ? "Lu (gabarit)" : "Proposé par le modèle"}</Pastille>
                </div>
                <div className="tam-ligne-meta">
                  {a.effet ? <span>Effet : {a.effet.replace(/_/g, " ")}</span> : null}
                  {a.date_audience ? <span>Audience le {dateHeure(a.date_audience)}</span> : null}
                  {a.date_limite ? <span>Date limite le {dateCourte(a.date_limite)}</span> : null}
                  {a.depose_le ? <span>Déposé le {dateHeure(a.depose_le)}</span> : null}
                  {a.rg_concorde === false ? <span style={{ color: "var(--esp-rouge)" }}>Le n° RG ne concorde pas</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ——— membres et murailles ——— */}
      <section className="esp-carte" aria-label="Membres et murailles">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Qui voit le dossier</h2>
          <span className="esp-item-haut">
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutGerer} onClick={() => ouvrir({ type: "membre" })}><Users width={14} height={14} aria-hidden="true" /> Ajouter</button>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!gerant || !["attente", "ouvert", "audit"].includes(d.statut)} title={gerant ? undefined : "Le gérant seul pose une muraille"} onClick={() => ouvrir({ type: "muraille" })}><ShieldOff width={14} height={14} aria-hidden="true" /> Muraille</button>
          </span>
        </div>
        <div className="esp-carte-corps">
          {membres.map((m) => (
            <div key={m.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">{nomDe(m.user_id)}</span>
                <Pastille teinte={m.role_dossier === "responsable" ? "noir" : "gris"}>{ROLES_DOSSIER[m.role_dossier]}</Pastille>
                {m.jusqu_au ? <Pastille teinte="ambre" contour>Jusqu&apos;au {dateCourte(m.jusqu_au)}</Pastille> : null}
              </div>
              <div className="tam-ligne-meta"><span>{ROLES_CABINET[personnes.find((p) => p.user_id === m.user_id)?.role ?? "collaborateur"]} · entré le {dateCourte(m.ajoute_le)}</span></div>
              {(peutGerer || m.user_id === moi?.user_id) && ["attente", "ouvert", "audit"].includes(d.statut) ? (
                <div className="tam-ligne-actions"><button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => gesteSimple(() => portes.retirerMembre(d.id, m.user_id), () => ({ ...complet, membres: membres.filter((x) => x.id !== m.id) }), `${nomDe(m.user_id)} sort du dossier.`)}>Retirer</button></div>
              ) : null}
            </div>
          ))}
          {!d.perso ? <p className="esp-kpi-sous" style={{ marginTop: 10 }}>Les associés voient tous les dossiers ordinaires du cabinet, sauf muraille.</p> : null}
        </div>
        {murailles.length ? (
          <div className="esp-carte-corps">
            <h3 className="esp-section-titre">Murailles</h3>
            {murailles.map((m) => (
              <div key={m.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-titre">{nomDe(m.user_id)}</span>
                  <Pastille teinte={m.leve_le ? "gris" : "rouge"}>{m.leve_le ? "Levée" : "En place"}</Pastille>
                  {m.demande_levee_id && !m.leve_le ? <Pastille teinte="ambre" contour>Levée demandée</Pastille> : null}
                </div>
                <div className="tam-ligne-meta">
                  <span>Posée par {nomDe(m.pose_par)} le {dateCourte(m.pose_le)}</span>
                  {m.leve_le ? <span>Levée par {nomDe(m.leve_par)} le {dateCourte(m.leve_le)}</span> : null}
                  <span>{m.motif_chiffre ? "Motif chiffré, lu par les associés" : "Sans motif"}</span>
                </div>
                {!m.leve_le && gerant && !m.demande_levee_id && m.user_id !== moi?.user_id ? (
                  <div className="tam-ligne-actions"><button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={() => gesteSimple(() => portes.demanderLeveeMuraille(m.id), () => ({ ...complet, murailles: murailles.map((x) => (x.id === m.id ? { ...x, demande_levee_id: "demande" } : x)), demandes: [...demandes, { id: crypto.randomUUID(), type_action: "lever_muraille", objet_id: d.id, resume: "Levée d'une muraille sur un dossier", payload: { muraille_id: m.id }, statut: "en_attente", cree_le: maintenant(), roles_autorises: ["gerant"] }] }), "La levée est demandée : un gérant la décide.")}>Demander la levée</button></div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ——— exports ——— */}
      <section className="esp-carte" aria-label="Exports">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Exports</h2>
          <span className="esp-kpi-sous">Archive conservée {reglages?.conservation_exports_jours ?? 7} jours, puis purgée</span>
        </div>
        <div className="esp-carte-corps">
          {exports.length === 0 ? <p className="esp-kpi-sous">Aucun export. Vous conservez l&apos;export que vous téléchargez ; à la clôture, le dossier est effacé.</p> : exports.map((x) => (
            <div key={x.id} className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-date">{dateCourte(x.cree_le)}</span>
                <span className="tam-ligne-titre">Demandé par {nomDe(x.demande_par)}</span>
                <Pastille teinte={x.statut === "pret" ? "vert" : x.statut === "a_preparer" ? "bleu" : x.statut === "echec" ? "rouge" : "gris"}>{x.statut === "pret" ? "Prêt" : x.statut === "a_preparer" ? "En préparation" : x.statut === "echec" ? "Échec" : "Expiré"}</Pastille>
              </div>
              <div className="tam-ligne-meta">
                {x.octets ? <span>{(x.octets / 1_048_576).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo</span> : null}
                {x.expire_le ? <span>Disponible jusqu&apos;au {dateCourte(x.expire_le)}</span> : null}
                {x.telechargements ? <span>{x.telechargements} téléchargement{x.telechargements > 1 ? "s" : ""}, le dernier le {dateCourte(x.telecharge_le)}</span> : null}
                {x.empreinte_manifeste ? <span className="esp-mono">Empreinte {x.empreinte_manifeste.slice(0, 12)}…</span> : null}
              </div>
              {x.statut === "pret" ? <div className="tam-ligne-actions"><button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => telecharger(x)}>Télécharger l&apos;archive</button></div> : null}
            </div>
          ))}
        </div>
      </section>

      {/* ——— journal des accès ——— */}
      <section className="esp-carte" aria-label="Journal des accès">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Journal des accès</h2>
          <span className="esp-kpi-sous">Qui a consulté le dossier, et quand</span>
        </div>
        <div className="esp-carte-corps">
          {lectures.length === 0 ? <p className="esp-kpi-sous">{source === "reelle" ? "Aucune lecture rendue par la porte tamila_journal_acces (ou porte non posée)." : "Aucune lecture."}</p> : (
            <ul className="esp-fil">
              {lectures.slice(0, 30).map((l, i) => (
                <li key={`${l.user_id}-${l.lu_le}-${i}`}>
                  <span className="esp-fil-point" data-teinte="bleu" aria-hidden="true" />
                  <span className="esp-fil-texte">{nomDe(l.user_id)} — {l.contexte === "export.telechargement" ? "a téléchargé un export" : l.contexte === "export" ? "a demandé un export" : "a consulté le dossier"}</span>
                  <span className="esp-fil-meta">{dateHeure(l.lu_le)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ——— le dialogue du geste en cours ——— */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form ? (
            <>
              <DialogHeader>
                <DialogIcone>{form.type === "muraille" ? <ShieldOff width={18} height={18} aria-hidden="true" /> : form.type === "cloture" ? <Lock width={18} height={18} aria-hidden="true" /> : <Gavel width={18} height={18} aria-hidden="true" />}</DialogIcone>
                <DialogTitle>{dialogueTitre[form.type]}</DialogTitle>
                <DialogDescription>
                  {form.type === "partie" ? "Le nom et le courriel sont chiffrés dans votre navigateur avant de partir. Le domicile du client fixe l'augmentation des délais." : null}
                  {form.type === "appel" ? "La date de la déclaration d'appel fixe le régime (décret 2023-1391) ; le siège de la cour, son calendrier." : null}
                  {form.type === "delai_regle" ? "Tamila calcule l'échéance avec la règle, le départ, la cour et le domicile du client ; un avocat la confirme." : null}
                  {form.type === "delai_date" ? "Une date fixée par le juge (calendrier, ordonnance, avis) : posée telle quelle. Saisie par un avocat, elle est confirmée d'office." : null}
                  {form.type === "confirmer" ? `${form.demande.resume}. Chaque délai est confirmé par un avocat qui voit le dossier.` : null}
                  {form.type === "decider" ? form.demande.resume : null}
                  {form.type === "corriger" ? "Le calcul reste tel quel ; la date retenue devient celle que vous saisissez, avec son motif." : null}
                  {form.type === "interrompre" ? "Seuls les délais pour conclure s'interrompent (art. 915-3 ; ancien art. 910-2). À la reprise, vous saisirez la nouvelle date." : null}
                  {form.type === "annuler" ? "Un délai ne se retire jamais : il s'annule avec son motif, et reste au dossier." : null}
                  {form.type === "acte" ? "L'acte déposé clôt le délai. Sans accusé de dépôt RPVA rattaché, la déclaration revient à un avocat." : null}
                  {form.type === "audience" ? "L'audience est posée au dossier ; l'avocat qui plaide est un avocat du cabinet." : null}
                  {form.type === "renvoyer" ? `${NATURES_AUDIENCE[form.audience.nature]} du ${dateHeure(form.audience.date_heure)}.` : null}
                  {form.type === "avis" ? "Saisi à la main, l'avis est appliqué comme s'il avait été lu : délais posés, audience ajoutée, appel orienté." : null}
                  {form.type === "membre" ? "Un stagiaire entre en lecteur ; le responsable d'un dossier est un avocat. Un accès peut être borné dans le temps." : null}
                  {form.type === "muraille" ? "La personne écartée ne voit plus rien du dossier et ne peut plus y être ajoutée. La levée revient au gérant, par décision." : null}
                  {form.type === "cloture" ? `Un associé décide. Une fois clos, le dossier est effacé ${reglages?.delai_cloture_jours ?? 7} jours plus tard, à 3 h : pièces, parties, clé. Vous gardez l'export téléchargé.` : null}
                  {form.type === "export" ? "L'archive (pièces, chronologie, délais, journal) est préparée par le serveur, puis disponible quelques jours. Exporter est une lecture tracée." : null}
                  {form.type === "residence" ? "Le domicile de la partie ; pour le client, il décide de l'augmentation des délais (art. 915-4)." : null}
                  {form.type === "piece" ? "Une pièce du dossier : conclusions, bordereau, pièce adverse, avis RPVA… Chiffrée avant de partir ; lue par le lecteur quand le coffre lui rendra la clé." : null}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {form.type === "partie" ? (
                    <>
                      <label className="rv-libelle">Nom <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={champ("nom")} onChange={(e) => poser("nom", e.target.value)} /></label>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Qualité<select className="rv-champ" value={champ("qualite", "client")} onChange={(e) => poser("qualite", e.target.value)}>{(Object.keys(QUALITES) as (keyof typeof QUALITES)[]).map((q) => <option key={q} value={q}>{QUALITES[q]}</option>)}</select></label>
                        <label className="rv-libelle">Rôle dans la procédure<select className="rv-champ" value={champ("role")} onChange={(e) => poser("role", e.target.value)}><option value="">—</option>{(Object.keys(ROLES_PROCEDURE) as (keyof typeof ROLES_PROCEDURE)[]).map((r) => <option key={r} value={r}>{ROLES_PROCEDURE[r]}</option>)}</select></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Demeure<select className="rv-champ" value={champ("residence", "metropole")} onChange={(e) => poser("residence", e.target.value)}>{RESIDENCES.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}</select></label>
                        <label className="rv-libelle">Courriel<input className="rv-champ" value={champ("courriel")} onChange={(e) => poser("courriel", e.target.value)} /></label>
                      </div>
                    </>
                  ) : null}
                  {form.type === "residence" ? (
                    <label className="rv-libelle">Demeure<select className="rv-champ" value={champ("residence", form.partie.residence)} onChange={(e) => poser("residence", e.target.value)}>{RESIDENCES.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}</select></label>
                  ) : null}
                  {form.type === "appel" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Déclaration d&apos;appel le <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("introduit", aujourdhui())} onChange={(e) => poser("introduit", e.target.value)} /></label>
                        <label className="rv-libelle">Le client est<select className="rv-champ" value={champ("role", "appelant")} onChange={(e) => poser("role", e.target.value)}>{(Object.keys(ROLES_PROCEDURE) as (keyof typeof ROLES_PROCEDURE)[]).map((r) => <option key={r} value={r}>{ROLES_PROCEDURE[r]}</option>)}</select></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Procédure<select className="rv-champ" value={champ("procedure", "a_orienter")} onChange={(e) => poser("procedure", e.target.value)}>{(Object.keys(PROCEDURES) as (keyof typeof PROCEDURES)[]).map((p) => <option key={p} value={p}>{PROCEDURES[p]}</option>)}</select></label>
                        <label className="rv-libelle">Siège de la cour<select className="rv-champ" value={champ("territoire", d.territoire ?? "metropole")} onChange={(e) => poser("territoire", e.target.value)}>{TERRITOIRES.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}</select></label>
                      </div>
                      <Avis teinte="bleu">Régime : {regimeAppel(champ("introduit", aujourdhui())) === "cpc" ? "CPC depuis le 01/09/2024" : "CPC antérieur au 01/09/2024"}. {appel && delais.some((t) => t.nature === "regle" && t.statut !== "annule") ? "Des délais sont posés : annulez-les avant de changer la date." : "La déclaration fait courir les délais de l'appelant (art. 908)."}</Avis>
                    </>
                  ) : null}
                  {form.type === "delai_regle" ? (
                    <>
                      <label className="rv-libelle">Règle<select className="rv-champ" value={champ("regle", reglesApplicables[0]?.code ?? "")} onChange={(e) => { poser("regle", e.target.value); setCalcul(null); }}>{(reglesApplicables.length ? reglesApplicables : regles).map((r) => <option key={r.code} value={r.code}>{r.libelle_court} — art. {r.article}</option>)}</select></label>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Départ du délai<input className="rv-champ" type="date" value={champ("depart", aujourdhui())} onChange={(e) => { poser("depart", e.target.value); setCalcul(null); }} /></label>
                        <label className="rv-libelle">Le client demeure<select className="rv-champ" value={champ("residence", residenceClient)} onChange={(e) => { poser("residence", e.target.value); setCalcul(null); }}>{RESIDENCES.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}</select></label>
                      </div>
                      <div className="esp-actions"><button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={calculer}>Calculer la date</button></div>
                      {calcul ? <div className="tam-calcul"><b>Échéance : {dateCourte(calcul.echeance)}.</b> {calcul.detail}{calcul.alternatives?.length ? <span className="tam-calcul-source">Autres dates : {calcul.alternatives.map((a) => dateCourte(a.echeance)).join(", ")}.</span> : null}</div> : null}
                    </>
                  ) : null}
                  {form.type === "delai_date" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Date fixée <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("echeance", aujourdhui())} onChange={(e) => poser("echeance", e.target.value)} /></label>
                        <label className="rv-libelle">Acte attendu<select className="rv-champ" value={champ("acte", "autre")} onChange={(e) => poser("acte", e.target.value)}>{(Object.keys(ACTES) as (keyof typeof ACTES)[]).map((a) => <option key={a} value={a}>{ACTES[a]}</option>)}</select></label>
                      </div>
                      <label className="rv-libelle">Source<select className="rv-champ" value={champ("source", "saisie")} onChange={(e) => poser("source", e.target.value)}><option value="calendrier_de_procedure">Calendrier de procédure</option><option value="ordonnance">Ordonnance du conseiller de la mise en état</option><option value="avis">Avis du greffe</option><option value="saisie">Saisie au dossier</option></select></label>
                    </>
                  ) : null}
                  {form.type === "confirmer" || form.type === "decider" ? (
                    <>
                      <label className="rv-libelle">Décision<select className="rv-champ" value={champ("decision", "approuve")} onChange={(e) => poser("decision", e.target.value)}><option value="approuve">Approuver</option><option value="rejete">Refuser</option></select></label>
                      <label className="rv-libelle">Commentaire<textarea className="rv-champ" value={champ("commentaire")} onChange={(e) => poser("commentaire", e.target.value)} /></label>
                      {form.type === "confirmer" && form.delai.calcul ? <div className="tam-calcul">{form.delai.calcul.detail}</div> : null}
                    </>
                  ) : null}
                  {form.type === "corriger" ? (
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">Date retenue <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("echeance", form.delai.echeance_retenue)} onChange={(e) => poser("echeance", e.target.value)} /></label>
                      <label className="rv-libelle">Motif<select className="rv-champ" value={champ("motif", "date_notifiee")} onChange={(e) => poser("motif", e.target.value)}>{MOTIFS_CORRECTION.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
                    </div>
                  ) : null}
                  {form.type === "interrompre" ? (
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">Cause<select className="rv-champ" value={champ("motif", "mediation")} onChange={(e) => poser("motif", e.target.value)}>{MOTIFS_INTERRUPTION.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
                      <label className="rv-libelle">Depuis le<input className="rv-champ" type="date" value={champ("depuis", aujourdhui())} onChange={(e) => poser("depuis", e.target.value)} /></label>
                    </div>
                  ) : null}
                  {form.type === "annuler" ? (
                    <label className="rv-libelle">Motif<select className="rv-champ" value={champ("motif", "desistement")} onChange={(e) => poser("motif", e.target.value)}>{MOTIFS_ANNULATION.map(([c, l]) => <option key={c} value={c}>{l}</option>)}</select></label>
                  ) : null}
                  {form.type === "acte" ? (
                    <>
                      <label className="rv-libelle">Déposé le <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("depose", aujourdhui())} onChange={(e) => poser("depose", e.target.value)} /></label>
                      {champ("depose", aujourdhui()) > form.delai.echeance_retenue ? <Avis teinte="rouge">Après l&apos;échéance du {dateCourte(form.delai.echeance_retenue)} : le délai sera clos, et une alerte critique levée.</Avis> : null}
                    </>
                  ) : null}
                  {form.type === "audience" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Date <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("date", aujourdhui())} onChange={(e) => poser("date", e.target.value)} /></label>
                        <label className="rv-libelle">Heure (vide si inconnue)<input className="rv-champ" type="time" value={champ("heure", "14:00")} onChange={(e) => poser("heure", e.target.value)} /></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Nature<select className="rv-champ" value={champ("nature", "mise_en_etat")} onChange={(e) => poser("nature", e.target.value)}>{(Object.keys(NATURES_AUDIENCE) as (keyof typeof NATURES_AUDIENCE)[]).map((n) => <option key={n} value={n}>{NATURES_AUDIENCE[n]}</option>)}</select></label>
                        <label className="rv-libelle">Avocat qui plaide<select className="rv-champ" value={champ("avocat")} onChange={(e) => poser("avocat", e.target.value)}><option value="">—</option>{personnes.filter((p) => ["gerant", "admin", "valideur"].includes(p.role)).map((p) => <option key={p.user_id} value={p.user_id}>{p.nom}</option>)}</select></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Juridiction<input className="rv-champ" value={champ("juridiction", d.juridiction ?? "")} onChange={(e) => poser("juridiction", e.target.value)} /></label>
                        <label className="rv-libelle">Chambre<input className="rv-champ" value={champ("chambre")} onChange={(e) => poser("chambre", e.target.value)} placeholder="Pôle 4 – chambre 5" /></label>
                      </div>
                    </>
                  ) : null}
                  {form.type === "renvoyer" ? (
                    <>
                      <label className="rv-libelle">Devenir<select className="rv-champ" value={champ("statut", "renvoyee")} onChange={(e) => poser("statut", e.target.value)}><option value="renvoyee">Renvoyée à une autre date</option><option value="tenue">Tenue</option><option value="annulee">Annulée</option></select></label>
                      {champ("statut", "renvoyee") === "renvoyee" ? (
                        <div className="esp-form-ligne">
                          <label className="rv-libelle">Nouvelle date <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("date")} onChange={(e) => poser("date", e.target.value)} /></label>
                          <label className="rv-libelle">Heure<input className="rv-champ" type="time" value={champ("heure", "14:00")} onChange={(e) => poser("heure", e.target.value)} /></label>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {form.type === "avis" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Type d&apos;avis<select className="rv-champ" value={champ("type", "rpva_avis_audience")} onChange={(e) => poser("type", e.target.value)}>{(Object.keys(TYPES_AVIS) as (keyof typeof TYPES_AVIS)[]).map((t) => <option key={t} value={t}>{TYPES_AVIS[t]}</option>)}</select></label>
                        <label className="rv-libelle">Date de l&apos;avis <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("date_avis", aujourdhui())} onChange={(e) => poser("date_avis", e.target.value)} /></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Date d&apos;audience<input className="rv-champ" type="date" value={champ("date_audience")} onChange={(e) => poser("date_audience", e.target.value)} /></label>
                        <label className="rv-libelle">Heure<input className="rv-champ" type="time" value={champ("heure_audience", "09:00")} onChange={(e) => poser("heure_audience", e.target.value)} /></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Date limite (ordonnance)<input className="rv-champ" type="date" value={champ("date_limite")} onChange={(e) => poser("date_limite", e.target.value)} /></label>
                        <label className="rv-libelle">Clôture prévisible<input className="rv-champ" type="date" value={champ("date_cloture")} onChange={(e) => poser("date_cloture", e.target.value)} /></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Partie visée<select className="rv-champ" value={champ("partie")} onChange={(e) => poser("partie", e.target.value)}><option value="">—</option><option value="appelant">Appelant</option><option value="intime">Intimé</option><option value="intervenant">Intervenant</option></select></label>
                        <label className="rv-libelle">Rang des conclusions<input className="rv-champ" inputMode="numeric" value={champ("rang")} onChange={(e) => poser("rang", e.target.value)} /></label>
                      </div>
                      {champ("type", "rpva_avis_audience") === "rpva_accuse_depot" ? (
                        <div className="esp-form-ligne">
                          <label className="rv-libelle">Déposé le <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" type="date" value={champ("depose_le")} onChange={(e) => poser("depose_le", e.target.value)} /></label>
                          <label className="rv-libelle">Heure<input className="rv-champ" type="time" value={champ("heure_depot", "12:00")} onChange={(e) => poser("heure_depot", e.target.value)} /></label>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {form.type === "membre" ? (
                    <>
                      <label className="rv-libelle">Personne <span className="esp-obligatoire">(obligatoire)</span><select className="rv-champ" value={champ("user")} onChange={(e) => poser("user", e.target.value)}><option value="">Choisir…</option>{personnes.filter((p) => !murailles.some((m) => m.user_id === p.user_id && !m.leve_le)).map((p) => <option key={p.user_id} value={p.user_id}>{p.nom} — {ROLES_CABINET[p.role]}</option>)}</select></label>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Rôle dans le dossier<select className="rv-champ" value={champ("role", "intervenant")} onChange={(e) => poser("role", e.target.value)}><option value="responsable">Responsable (un avocat)</option><option value="intervenant">Intervenant</option><option value="lecteur">Lecteur</option></select></label>
                        <label className="rv-libelle">Jusqu&apos;au (facultatif)<input className="rv-champ" type="date" value={champ("jusqu")} onChange={(e) => poser("jusqu", e.target.value)} /></label>
                      </div>
                    </>
                  ) : null}
                  {form.type === "muraille" ? (
                    <>
                      <label className="rv-libelle">Personne écartée <span className="esp-obligatoire">(obligatoire)</span><select className="rv-champ" value={champ("user")} onChange={(e) => poser("user", e.target.value)}><option value="">Choisir…</option>{personnes.filter((p) => p.user_id !== moi?.user_id).map((p) => <option key={p.user_id} value={p.user_id}>{p.nom} — {ROLES_CABINET[p.role]}</option>)}</select></label>
                      <label className="rv-libelle">Motif (chiffré, lu par les associés)<textarea className="rv-champ" value={champ("motif")} onChange={(e) => poser("motif", e.target.value)} placeholder="Conflit d'intérêts : ancien conseil de la partie adverse." /></label>
                      {source === "reelle" && !cle && champ("motif").trim() ? <Avis teinte="ambre">Sans la phrase du cabinet, le motif ne peut pas être chiffré : la muraille sera posée sans motif.</Avis> : null}
                    </>
                  ) : null}
                  {form.type === "cloture" ? <Avis teinte="ambre"><strong>Le contenu sera effacé</strong> {reglages?.delai_cloture_jours ?? 7} jours après l&apos;approbation. Téléchargez l&apos;export avant.</Avis> : null}
                  {form.type === "export" ? <Avis teinte="bleu">L&apos;export est tracé au journal des accès, comme toute lecture.</Avis> : null}
                  {form.type === "piece" ? (
                    <>
                      <div>
                        <span className="rv-libelle">Fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                        <div className="esp-fichier">
                          <input id="tam-piece-fichier" type="file" className="esp-fichier-natif" accept=".pdf,.png,.jpg,.jpeg,.docx,.eml,.msg" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                          <label htmlFor="tam-piece-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{fichier ? "Changer de fichier" : "Choisir un fichier"}</label>
                          <span className="esp-kpi-sous">{fichier ? `${fichier.name} · ${Math.round(fichier.size / 1024)} Ko` : "PDF, image, courriel ou document."}</span>
                        </div>
                      </div>
                      <label className="rv-libelle">Nature (facultatif)
                        <select className="rv-champ" value={champ("type_piece")} onChange={(e) => poser("type_piece", e.target.value)}>
                          <option value="">À déterminer</option>
                          <option value="conclusions">Conclusions</option>
                          <option value="bordereau">Bordereau de communication</option>
                          <option value="piece_adverse">Pièce adverse</option>
                          <option value="expertise">Rapport d&apos;expertise</option>
                          <option value="constat">Constat</option>
                          <option value="courriel">Courriel</option>
                          {(Object.keys(TYPES_AVIS) as (keyof typeof TYPES_AVIS)[]).map((t) => <option key={t} value={t}>{TYPES_AVIS[t]} (avis RPVA)</option>)}
                        </select>
                      </label>
                      <Avis teinte="bleu">La pièce est chiffrée ici, dans votre navigateur, avec la clé du dossier ; seul l&apos;octet chiffré part au coffre, et son empreinte est celle du chiffré.</Avis>
                    </>
                  ) : null}
                  {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button
                  type="button"
                  className={`r-btn ${form.type === "annuler" || form.type === "muraille" || form.type === "cloture" ? "r-btn--rouge" : "r-btn--noir"}`}
                  disabled={envoi || (form.type === "piece" && !fichier) || (form.type === "partie" && champ("nom").trim().length < 2) || ((form.type === "membre" || form.type === "muraille") && !champ("user")) || (form.type === "renvoyer" && champ("statut", "renvoyee") === "renvoyee" && !champ("date")) || (form.type === "avis" && champ("type", "rpva_avis_audience") === "rpva_accuse_depot" && !champ("depose_le"))}
                  onClick={soumettre}
                >
                  {envoi ? <Loader variant="spin" /> : null}{" "}
                  {form.type === "confirmer" || form.type === "decider" ? (champ("decision", "approuve") === "approuve" ? "Approuver" : "Refuser") : form.type === "cloture" ? "Demander la clôture" : form.type === "export" ? "Demander l'export" : form.type === "piece" ? "Chiffrer et déposer" : form.type === "muraille" ? "Poser la muraille" : form.type === "annuler" ? "Annuler le délai" : "Enregistrer"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
