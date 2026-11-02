"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — les données partagées des sous-pages de /espace2/tiroma
   (02/11/2026, refonte des pages métiers, docs/refonte-metiers/cloud/TIROMA.md)

   La lecture et les gestes de l'écran d'origine (components/espace/tiroma/
   EcranTiroma.tsx, gardé tel quel sous « ?ancien=1 ») posés une seule fois
   dans le layout : les six sous-pages lisent le même dossier, et un geste
   fait sur l'une (un appel noté, une mutuelle, une absence) se voit sur les
   autres sans relecture. Deux sources, comme avant : l'exemple (un cabinet
   fictif modifié en mémoire, rien n'est écrit) ou la base réelle (portes
   inchangées, aucune migration).
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import type { NoteAppel } from "@/components/espace/tiroma/Appels";
import type { Action } from "@/components/espace/tiroma/Cabinet";
import type { NouvelleAbsence } from "@/components/espace/tiroma/EquipeAbsente";
import type { Inscription, Retrait } from "@/components/espace/tiroma/ListeAttente";
import type { Mutuelle } from "@/components/espace/tiroma/Plans";
import type { NouveauContact } from "@/components/espace/tiroma/Rappels";
import { DOSSIER_EXEMPLE_TIROMA as DOSSIER_EXEMPLE } from "./exemplesPlus";
import {
  ajouterFauteuil, ajouterFermeture, ajouterHoraire, ajouterPraticien, brancherCabinet, changerMode, changerStatut, chargerDossier,
  ajouterAttente, chercherPatients, classerType, installerCabinet, listerCabinets, monCompte, noterMutuelle, retirerAttente, retirerHoraire, type Compte,
  noterAppel, noterContact, retirerContact, noterAbsenceMembre, retirerAbsenceMembre, fixerObjectif, alignerRegles, exporterDonnees,
} from "@/components/espace/tiroma/portes";
import type { AbsenceEquipe, Cabinet as CabinetT, ObjectifFauteuil, ContactPatient, Dossier, Logiciel, PatientCourt, RegistreAppels } from "@/components/espace/tiroma/types";

export type { Action, Mutuelle, NoteAppel, NouvelleAbsence, Inscription, Retrait, NouveauContact };

export type Reel = { compte: Compte | null; cabinets: CabinetT[]; dossier: Dossier | null; avis: string[] };

function appliquerExemple(d: Dossier, a: Action): Dossier {
  const id = () => `00000000-0000-4000-8000-${Date.now().toString(16).slice(-12).padStart(12, "0")}`;
  switch (a.type) {
    case "brancher":
      return { ...d, cabinet: { ...d.cabinet, statut: "actif" } };
    case "mode":
      return { ...d, cabinet: { ...d.cabinet, mode: a.mode, mode_depuis: new Date().toISOString() } };
    case "statut":
      return { ...d, cabinet: { ...d.cabinet, statut: a.statut } };
    case "fauteuil":
      return { ...d, fauteuils: [...d.fauteuils, { id: id(), entite_id: d.cabinet.entite_id, nom: a.nom, capacites: a.capacites, objectif_occupation: a.objectif, actif: true }] };
    case "horaire":
      return { ...d, horaires: [...d.horaires, { id: id(), entite_id: d.cabinet.entite_id, praticien_id: null, fauteuil_id: a.fauteuil_id, jour: a.jour, debut: `${a.debut}:00`, fin: `${a.fin}:00`, valide_du: null, valide_au: null, exceptionnel: false, source: "saisie" }] };
    case "retirer_horaire":
      return { ...d, horaires: d.horaires.filter((h) => h.id !== a.id) };
    case "fermeture":
      return { ...d, fermetures: [...d.fermetures, { id: id(), entite_id: d.cabinet.entite_id, praticien_id: a.praticien_id, fauteuil_id: a.fauteuil_id, debut: a.debut, fin: a.fin, nature: a.nature, source: "saisie" }] };
    case "praticien":
      return { ...d, praticiens: [...d.praticiens, { id: id(), entite_id: d.cabinet.entite_id, nom_affiche: a.nom_affiche, metier: a.metier, actif: true }] };
    case "classer":
      return { ...d, types: d.types.map((t) => (t.id === a.typeRdv.id ? { ...t, famille: a.famille, statut: a.statut, necessite_labo: a.necessite_labo, chirurgie: a.chirurgie, exige_assistante: a.exige_assistante, duree_defaut_min: a.duree_defaut_min, classe_par: "humain", confiance: null } : t)) };
  }
}

export type ContexteTiroma = {
  source: "exemple" | "reelle";
  dossier: Dossier | null;
  reel: Reel | null;
  erreur: string | null;
  choisirCabinet: (id: string) => void;
  installation: {
    entite: string; setEntite: (v: string) => void;
    logiciel: Logiciel; setLogiciel: (v: Logiciel) => void;
    perimetre: "cabinet" | "praticien"; setPerimetre: (v: "cabinet" | "praticien") => void;
    version: string; setVersion: (v: string) => void;
    enCours: boolean; installer: () => Promise<void>;
  };
  agir: (a: Action) => Promise<void>;
  noterMutuelle: (m: Mutuelle) => Promise<void>;
  chercher: (texte: string) => Promise<PatientCourt[]>;
  inscrire: (i: Inscription) => Promise<void>;
  retirer: (r: Retrait) => Promise<void>;
  noterAppel: (n: NoteAppel) => Promise<void>;
  noterContact: (c: NouveauContact) => Promise<void>;
  retirerContact: (c: ContactPatient) => Promise<void>;
  noterAbsence: (n: NouvelleAbsence) => Promise<void>;
  cloreAbsence: (a: AbsenceEquipe) => Promise<void>;
  fixerObjectif: (f: ObjectifFauteuil, objectif: number | null) => Promise<void>;
  exporter: () => Promise<unknown>;
  aligner: () => Promise<number>;
};

const Contexte = createContext<ContexteTiroma | null>(null);

export function useTiroma(): ContexteTiroma {
  const c = useContext(Contexte);
  if (!c) throw new Error("useTiroma hors de DonneesTiroma");
  return c;
}

export function DonneesTiroma({ children }: { children: React.ReactNode }) {
  const { source } = useSource();
  const [local, setLocal] = useState<Dossier>(DOSSIER_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);

  /* installation (base réelle, sans cabinet) */
  const [entiteInst, setEntiteInst] = useState("");
  const [logicielInst, setLogicielInst] = useState<Logiciel>("logosw");
  const [perimetreInst, setPerimetreInst] = useState<"cabinet" | "praticien">("cabinet");
  const [versionInst, setVersionInst] = useState("");
  const [installe, setInstalle] = useState(false);

  const charger = useCallback(async (cabinetVoulu?: string | null) => {
    await Promise.resolve();
    setErreur(null);
    try {
      const compte = await monCompte();
      if (!compte) {
        setReel({ compte: null, cabinets: [], dossier: null, avis: [] });
        return;
      }
      const cabinets = await listerCabinets(compte);
      const k = cabinets.find((c) => c.id === (cabinetVoulu ?? choix)) ?? cabinets[0] ?? null;
      if (!k) {
        setReel({ compte, cabinets, dossier: null, avis: [] });
        setEntiteInst((e) => e || compte.entites[0]?.id || "");
        return;
      }
      setReel({ compte, cabinets, dossier: null, avis: [] });
      const { dossier, avis } = await chargerDossier(k, compte);
      setReel({ compte, cabinets, dossier, avis });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel((prev) => prev ?? { compte: null, cabinets: [], dossier: null, avis: [] });
    }
  }, [choix]);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      await charger();
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [charger]);
  useTempsReel(["tiroma_cabinets", "tiroma_releves", "tiroma_evenements_agenda", "tiroma_rendez_vous", "tiroma_plans"], source === "reelle", relire);

  const dossier: Dossier | null = source === "exemple" ? local : (reel?.dossier ?? null);

  const agir = useCallback(async (a: Action) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => appliquerExemple(prev, a));
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    switch (a.type) {
      case "brancher": await brancherCabinet(d.cabinet); break;
      case "mode": await changerMode(d.cabinet, a.mode); break;
      case "statut": await changerStatut(d.cabinet, a.statut); break;
      case "fauteuil": await ajouterFauteuil(d.cabinet, { nom: a.nom, capacites: a.capacites, objectif: a.objectif }); break;
      case "horaire": await ajouterHoraire(d.cabinet, { jour: a.jour, debut: a.debut, fin: a.fin, fauteuil_id: a.fauteuil_id, praticien_id: null }); break;
      case "retirer_horaire": await retirerHoraire(a.id); break;
      case "fermeture": await ajouterFermeture(d.cabinet, { debut: a.debut, fin: a.fin, nature: a.nature, fauteuil_id: a.fauteuil_id, praticien_id: a.praticien_id }); break;
      case "praticien": await ajouterPraticien(d.cabinet, { nom_affiche: a.nom_affiche, metier: a.metier }); break;
      case "classer": await classerType(a.typeRdv, { famille: a.famille, statut: a.statut, necessite_labo: a.necessite_labo, chirurgie: a.chirurgie, exige_assistante: a.exige_assistante, duree_defaut_min: a.duree_defaut_min }); break;
    }
    await charger(d.cabinet.id);
  }, [source, reel, charger]);

  /* b3_07 : la mutuelle, notée sur un plan ; en exemple, la ligne change en mémoire */
  const noter = useCallback(async (m: Mutuelle) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => (p.plan_id === m.plan.plan_id ? { ...p, mutuelle_statut: m.statut, mutuelle_reponse_le: m.statut === "accord" || m.statut === "refus" ? m.le : null, mutuelle_accord_sans_rdv: m.statut === "accord" } : p)),
      }));
      return;
    }
    await noterMutuelle(m.plan.plan_id, m.statut, m.le, m.motif);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  /* b3_09 : la liste d'attente commune */
  const PATIENTS_EXEMPLE: PatientCourt[] = useMemo(() => [
    { id: "pa-3", nom: "Nestor", prenom: "Rosalie", praticien_habituel_id: null, ne_pas_contacter: false },
    { id: "pa-5", nom: "Rigoulet", prenom: "Sylvie", praticien_habituel_id: null, ne_pas_contacter: false },
    { id: "pa-6", nom: "Zami", prenom: "Patrice", praticien_habituel_id: null, ne_pas_contacter: false },
    { id: "pa-8", nom: "Mondésir", prenom: "Lucas", praticien_habituel_id: null, ne_pas_contacter: true },
    { id: "pa-13", nom: "Pétro", prenom: "Georges", praticien_habituel_id: null, ne_pas_contacter: false },
  ], []);
  const chercher = useCallback(async (texte: string) => {
    const t = texte.trim().toLowerCase();
    if (source === "exemple") return PATIENTS_EXEMPLE.filter((p) => p.nom.toLowerCase().startsWith(t) || (p.prenom ?? "").toLowerCase().startsWith(t));
    const d = reel?.dossier;
    if (!d) return [];
    return chercherPatients(d.cabinet.entite_id, texte);
  }, [source, reel, PATIENTS_EXEMPLE]);
  const inscrire = useCallback(async (i: Inscription) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => ({
        ...prev,
        attente: [...prev.attente.filter((a) => a.patient_id !== i.patient.id), { id: `at-${Date.now()}`, entite_id: prev.cabinet.entite_id, patient_id: i.patient.id, famille: i.famille, duree_min: i.duree_min, praticien_id: i.praticien_id, preavis_minutes: i.preavis_minutes, drapeau_gene: i.gene, source: "tiroma", ajoute_le: new Date().toISOString(), retire_le: null, motif_retrait: null, patient_nom: [i.patient.prenom, i.patient.nom].filter(Boolean).join(" ") }],
      }));
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    await ajouterAttente(d.cabinet, { patient_id: i.patient.id, famille: i.famille, duree_min: i.duree_min, praticien_id: i.praticien_id, preavis_minutes: i.preavis_minutes, gene: i.gene });
    await charger(d.cabinet.id);
  }, [source, reel, charger]);
  const retirer = useCallback(async (r: Retrait) => {
    if (source === "exemple") {
      await new Promise((x) => setTimeout(x, 250));
      setLocal((prev) => ({ ...prev, attente: prev.attente.filter((a) => a.id !== r.attente.id) }));
      return;
    }
    await retirerAttente(r.attente.id, r.motif);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  /* b3_12 : le registre des appels ; en exemple, la ligne s'ajoute en mémoire */
  const noterUnAppel = useCallback(async (n: NoteAppel) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        if (!prev.appels) return prev;
        const maintenant = new Date().toISOString();
        const dernier = { motif: n.cible.motif, issue: n.issue, appele_le: maintenant, rappeler_le: n.rappeler_le, par: "vous" };
        const autres = prev.appels.a_reprendre.filter((s) => !(s.patient_id === n.cible.patient_id && s.motif === n.cible.motif && s.plan_id === n.cible.plan_id));
        const avant = prev.appels.a_reprendre.find((s) => s.patient_id === n.cible.patient_id && s.motif === n.cible.motif && s.plan_id === n.cible.plan_id);
        const suit = n.issue === "message" || n.issue === "pas_de_reponse" || n.issue === "rappeler";
        const registre: RegistreAppels = {
          ...prev.appels,
          a_reprendre: suit ? [...autres, { ...dernier, patient_id: n.cible.patient_id, patient_nom: n.cible.patient_nom, plan_id: n.cible.plan_id, tentatives: (avant?.tentatives ?? 0) + 1, du: n.issue === "rappeler" ? (n.rappeler_le ?? "") <= prev.appels.jour : false }] : autres,
          derniers: { ...prev.appels.derniers, [n.cible.patient_id]: dernier },
          bilan: { ...prev.appels.bilan, appels: prev.appels.bilan.appels + 1, rdv_pris: prev.appels.bilan.rdv_pris + (n.issue === "rdv_pris" ? 1 : 0), refus: prev.appels.bilan.refus + (n.issue === "refus" ? 1 : 0) },
        };
        return { ...prev, appels: registre };
      });
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    await noterAppel(d.cabinet, n);
    await charger(d.cabinet.id);
  }, [source, reel, charger]);

  /* b3_14 : les moyens de contact des patients ; en exemple, en mémoire */
  const noterUnContact = useCallback(async (c: NouveauContact) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => prev.rappels ? ({
        ...prev,
        rappels: {
          ...prev.rappels,
          contacts: [...prev.rappels.contacts.filter((x) => !(x.patient_id === c.patient.id && x.canal === c.canal)),
            { id: `ct-${Date.now()}`, patient_id: c.patient.id, patient_nom: [c.patient.prenom, c.patient.nom].filter(Boolean).join(" "), canal: c.canal,
              adresse: c.adresse, rappels: c.rappels, relances: c.relances, source: c.source, cree_le: new Date().toISOString() }],
        },
      }) : prev);
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    await noterContact(d.cabinet, { patient_id: c.patient.id, canal: c.canal, adresse: c.adresse, rappels: c.rappels, relances: c.relances, source: c.source, preuve: c.preuve });
    await charger(d.cabinet.id);
  }, [source, reel, charger]);
  const retirerUnContact = useCallback(async (c: ContactPatient) => {
    if (source === "exemple") {
      setLocal((prev) => prev.rappels ? ({ ...prev, rappels: { ...prev.rappels, contacts: prev.rappels.contacts.filter((x) => x.id !== c.id) } }) : prev);
      return;
    }
    await retirerContact(c.id, null);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  /* b3_18 : l'équipe absente ; en exemple, en mémoire (sans calcul des soins) */
  const noterUneAbsence = useCallback(async (n: NouvelleAbsence) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        const m = prev.membres.find((x) => x.id === n.membre_id);
        if (!prev.equipe || !m) return prev;
        const f = prev.fauteuils.find((x) => x.id === m.fauteuil_habituel_id);
        return { ...prev, equipe: [...prev.equipe, { absence_id: `ab-${Date.now()}`, membre_id: m.id, membre: m.prenom, motif: n.motif, debut: n.debut, fin: n.fin,
          fauteuil_id: m.fauteuil_habituel_id, fauteuil_nom: f?.nom ?? null, soins: [] }] };
      });
      return;
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    await noterAbsenceMembre(d.cabinet, n);
    await charger(d.cabinet.id);
  }, [source, reel, charger]);
  const cloreUneAbsence = useCallback(async (a: AbsenceEquipe) => {
    if (source === "exemple") {
      setLocal((prev) => prev.equipe ? ({ ...prev, equipe: prev.equipe.filter((x) => x.absence_id !== a.absence_id) }) : prev);
      return;
    }
    await retirerAbsenceMembre(a.absence_id);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  /* b3_20 : l'objectif d'un fauteuil ; en exemple, en mémoire (les semaines se relisent contre le nouvel objectif) */
  const fixerUnObjectif = useCallback(async (f: ObjectifFauteuil, objectif: number | null) => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => ({
        ...prev,
        fauteuils: prev.fauteuils.map((x) => (x.id === f.fauteuil_id ? { ...x, objectif_occupation: objectif } : x)),
        objectifs: prev.objectifs ? {
          ...prev.objectifs,
          fauteuils: prev.objectifs.fauteuils.map((x) => {
            if (x.fauteuil_id !== f.fauteuil_id) return x;
            const semaines = x.semaines.map((s) => ({ ...s, atteint: objectif === null || s.taux === null ? null : s.taux >= objectif }));
            const passes = semaines.slice(0, prev.objectifs ? prev.objectifs.semaines.filter((s) => s.nature === "realisee").length : 0);
            return { ...x, objectif, semaines, comptees: objectif === null ? 0 : passes.length, atteintes: passes.filter((s) => s.atteint).length };
          }),
        } : prev.objectifs,
      }));
      return;
    }
    await fixerObjectif(f.fauteuil_id, objectif);
    await charger(reel?.dossier?.cabinet.id);
  }, [source, reel, charger]);

  /* b3_23 : l'export des données ; en exemple, le dossier fictif lui-même */
  const exporterLesDonnees = useCallback(async (): Promise<unknown> => {
    const d = source === "exemple" ? local : reel?.dossier;
    if (!d) throw new Error("Aucun cabinet chargé.");
    if (source === "exemple") return { exporte_le: new Date().toISOString(), exemple: true, tables: { fauteuils: d.fauteuils, praticiens: d.praticiens, membres: d.membres, plans: d.plans, liste_attente: d.attente } };
    return exporterDonnees(d.cabinet);
  }, [source, local, reel]);

  /* b3_22 : aligner les autres centres sur celui-ci ; en exemple, en mémoire */
  const alignerLesRegles = useCallback(async (): Promise<number> => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 250));
      setLocal((prev) => {
        const rc = prev.reglesCommunes;
        const src = rc?.centres.find((c) => c.entite_id === prev.cabinet.entite_id);
        if (!rc || !src) return prev;
        return { ...prev, reglesCommunes: { centres: rc.centres.map((c) => ({ ...c, regles: { ...c.regles, ...src.regles } })), ecarts: [] } };
      });
      return Math.max((local.reglesCommunes?.centres.length ?? 1) - 1, 0);
    }
    const d = reel?.dossier;
    if (!d) throw new Error("Aucun cabinet ouvert.");
    const n = await alignerRegles(d.cabinet);
    await charger(d.cabinet.id);
    return n;
  }, [source, reel, charger, local]);

  const installer = async () => {
    if (!reel?.compte || !entiteInst) return;
    setInstalle(true);
    setErreur(null);
    try {
      await installerCabinet({ client_id: reel.compte.client_id, entite_id: entiteInst, logiciel: logicielInst, perimetre: perimetreInst, version: versionInst.trim() || null, user_id: reel.compte.user_id });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'installation a échoué.");
    } finally {
      setInstalle(false);
    }
  };

  const valeur: ContexteTiroma = {
    source, dossier, reel, erreur, choisirCabinet: (id: string) => { setChoix(id); void charger(id); },
    installation: { entite: entiteInst, setEntite: setEntiteInst, logiciel: logicielInst, setLogiciel: setLogicielInst, perimetre: perimetreInst, setPerimetre: setPerimetreInst, version: versionInst, setVersion: setVersionInst, enCours: installe, installer },
    agir, noterMutuelle: noter, chercher, inscrire, retirer, noterAppel: noterUnAppel, noterContact: noterUnContact, retirerContact: retirerUnContact,
    noterAbsence: noterUneAbsence, cloreAbsence: cloreUneAbsence, fixerObjectif: fixerUnObjectif, exporter: exporterLesDonnees, aligner: alignerLesRegles,
  };
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}
