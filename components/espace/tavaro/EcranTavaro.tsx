"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tavaro — le parking d'un loueur : contrats, retours chiffrés,
   factures, avoirs, litiges, relances, barème (06/10/2026, session B2)

   En haut, quatre compteurs qui filtrent : retours à chiffrer, à valider,
   bloqués (preuve manquante, litige, impayé), le reste ; et ce qui reste
   à encaisser. À gauche la liste des contrats ; à droite le dossier du
   contrat ouvert (DossierContrat). En bas, le barème (BaremeVue).

   Deux sources : l'exemple (exemples.ts, modifié en mémoire par les
   gestes — le chiffrage y est recalculé par calcul.ts — pour que
   l'enchaînement se voie) ou la base réelle (portes.ts : tout le parking
   en une passe, sous RLS ; chaque geste par sa porte, puis relecture).
   Le rôle vient du compte (base réelle) ou vaut « valideur » (exemple) :
   l'écran grise avant le clic, la base reste juge.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI } from "../exemples/socle";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { chiffrerLocal } from "./calcul";
import { FAMILLES, STATUTS_CONTRAT, STATUTS_PROPOSITION, famille, nomLocataire, propositionVivante, resteDu, type Famille } from "./etats";
import { AGENCES_EXEMPLE, AVIS_EXEMPLE, CONTESTATIONS_EXEMPLE, BAREME_EXEMPLE, BAREME_RETIRE_EXEMPLE, CATEGORIES_EXEMPLE, DOSSIERS_EXEMPLE, LIGNES_BAREME_EXEMPLE, REGLAGES_EXEMPLE, nomPersonneTavaro } from "./exemples";
import { amenderContrat, avoirElectronique, chargerMonde, envoyerDossier, issueContestation, lienDossier, ouvrirContestation, produireDossier, chiffrerRetour, classerAvis, completerContrat, completerLocataire, constaterRefus, factureElectronique, preparation2027, refacturerAvis, etablirEtat, leverCaution, signerEtat, demanderAvoir, deposerPhoto, designerConducteur, enregistrerAvis, marquerLitige, marquerReglee, monCompte, publierBareme, rattacherAvis, relancerFacture, retirerBareme, type Moi, type Monde } from "./portes";
import type { AvisContravention, Avoir, Contestation, Bareme, EtatDesLieux, Dossier, Facture, LigneBareme, LigneJournal, Retour, Role } from "./types";
import DossierContrat, { type Gestes } from "./DossierContrat";
import type { GestesEtats } from "./EtatsDesLieux";
import { appliquerEtats, empreinte } from "./edl";
import BaremeVue from "./BaremeVue";
import AvisVue, { type GestesAvis } from "./AvisVue";
import ContestationsVue, { type GestesContestations } from "./ContestationsVue";
import { forcesLocales } from "./contestations";
import { Preparation2027, type Preparation } from "./FactureElectronique";
import { controler, docAvoir, docFacture, formeLocale, sirenValide } from "./cii";
import "./tavaro.css";

const MONDE_EXEMPLE: Monde = {
  dossiers: DOSSIERS_EXEMPLE,
  agences: AGENCES_EXEMPLE,
  categories: CATEGORIES_EXEMPLE,
  baremes: [BAREME_EXEMPLE, BAREME_RETIRE_EXEMPLE],
  lignesBareme: LIGNES_BAREME_EXEMPLE,
  reglages: REGLAGES_EXEMPLE,
  entites: AGENCES_EXEMPLE.map((a) => ({ id: a.entite_id, nom: a.nom })),
  avis: AVIS_EXEMPLE,
  contestations: CONTESTATIONS_EXEMPLE,
};

const ids = () => crypto.randomUUID();
const maintenant = () => new Date().toISOString();

export default function EcranTavaro() {
  const { source } = useSource();
  const [local, setLocal] = useState<Monde>(MONDE_EXEMPLE);
  const [reel, setReel] = useState<Monde | null>(null);
  const [moi, setMoi] = useState<Moi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [agenceFiltre, setAgenceFiltre] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);

  const monde = source === "exemple" ? local : reel;
  const role: Role | null = source === "exemple" ? "valideur" : (moi?.role ?? null);
  const moiId = source === "exemple" ? EXEMPLE_MOI : (moi?.user_id ?? "");

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [m, compte] = await Promise.all([chargerMonde(), monCompte().catch(() => null)]);
      setReel(m);
      setMoi(compte);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ dossiers: [], agences: [], categories: [], baremes: [], lignesBareme: [], reglages: null, entites: [], avis: [], contestations: [] });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      setReel(await chargerMonde());
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  /* la préparation au 1er septembre 2027 : la porte en base réelle (direction et valideurs), le même calcul pour l'exemple */
  const [prepReelle, setPrepReelle] = useState<Preparation | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !reel) return;
    let vivant = true;
    preparation2027().then((p) => { if (vivant) setPrepReelle(p); }).catch(() => { if (vivant) setPrepReelle(null); });
    return () => { vivant = false; };
  }, [source, reel]);
  const prepExemple = useMemo<Preparation | null>(() => {
    const factures = local.dossiers.flatMap((d) => d.factures.map((f) => ({ f, d })));
    const e = factures[0]?.f.emetteur ?? {};
    const parFlux = new Map<string, { flux: string; n: number; prets: number }>();
    for (const { f, d } of factures) {
      const c = controler(docFacture(f, d.lignesFactures));
      const g = parFlux.get(c.flux) ?? { flux: c.flux, n: 0, prets: 0 };
      g.n += 1;
      if (c.pret) g.prets += 1;
      parFlux.set(c.flux, g);
    }
    const sansSiren = new Set(local.dossiers.filter((d) => d.locataire?.type === "professionnel" && !d.locataire.anonymise_le && !sirenValide(d.locataire.siren)).map((d) => d.locataire!.id)).size;
    return {
      echeance_emission: "2027-09-01",
      emetteur: { siren: sirenValide(e.siren), numero_tva: !!e.numero_tva, adresse: /[0-9]{5}\s+\S/.test(e.adresse ?? "") },
      clients_pro_sans_siren: sansSiren,
      pieces_90_jours: [...parFlux.values()],
    };
  }, [local]);
  const preparation = source === "exemple" ? prepExemple : prepReelle;

  useTempsReel(["loc_contrats", "loc_propositions", "loc_factures", "loc_avoirs", "loc_avis_contravention", "loc_etats_des_lieux", "loc_contestations"], source === "reelle", relire);

  const nommer = useCallback((id: string | null | undefined) => {
    if (!id) return "Système";
    if (id === moiId) return "Vous";
    return source === "exemple" ? nomPersonneTavaro(id) : id.slice(0, 8);
  }, [source, moiId]);

  /* ——— la liste ——— */
  const dossiers = useMemo(() => monde?.dossiers ?? [], [monde]);
  const rang: Record<Famille, number> = useMemo(() => ({ a_chiffrer: 0, a_valider: 1, bloquee: 2, reste: 3 }), []);
  const visibles = useMemo(() => {
    const l = dossiers.filter((d) => (!filtre || famille(d.contrat, d.propositions, d.factures) === filtre) && (!agenceFiltre || d.contrat.entite_id === agenceFiltre));
    return [...l].sort((a, b) => {
      const fa = rang[famille(a.contrat, a.propositions, a.factures)];
      const fb = rang[famille(b.contrat, b.propositions, b.factures)];
      if (fa !== fb) return fa - fb;
      return (b.contrat.retour_reel_le ?? b.contrat.retour_prevu_le).localeCompare(a.contrat.retour_reel_le ?? a.contrat.retour_prevu_le);
    });
  }, [dossiers, filtre, agenceFiltre, rang]);

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { a_chiffrer: 0, a_valider: 0, bloquee: 0, reste: 0 };
    let encaisser = 0;
    for (const d of dossiers) {
      c[famille(d.contrat, d.propositions, d.factures)]++;
      for (const f of d.factures) if (f.statut === "emise" || f.statut === "envoyee" || f.statut === "litige") encaisser += resteDu(f, d.avoirs);
    }
    return { ...c, encaisser };
  }, [dossiers]);

  const choisi = choix && visibles.some((d) => d.contrat.id === choix) ? choix : (visibles[0]?.contrat.id ?? null);
  const dossier = dossiers.find((d) => d.contrat.id === choisi) ?? null;

  /* ——— les gestes, dans les deux sources ——— */
  const remplacerLocal = useCallback((d: Dossier) => {
    setLocal((prev) => ({ ...prev, dossiers: prev.dossiers.map((x) => (x.contrat.id === d.contrat.id ? d : x)) }));
  }, []);
  const journaliser = (d: Dossier, action: string, objet_type: string, objet_id: string, donnees: Record<string, unknown>): Dossier => ({
    ...d,
    journal: [...d.journal, { id: ids(), action, objet_type, objet_id, donnees: { contrat: d.contrat.id, ...donnees }, survenu_le: maintenant() } as LigneJournal],
  });

  const gestes: Gestes = useMemo(() => {
    const reelOuLocal = async (reelAction: () => Promise<unknown>, localAction: () => void) => {
      if (source === "reelle") {
        await reelAction();
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        localAction();
      }
    };
    const d0 = () => dossier!;
    return {
      completer: (valeurs) => reelOuLocal(
        () => completerContrat(d0().contrat.id, valeurs),
        () => {
          const d = d0();
          const saisies = { ...d.contrat.saisies };
          for (const k of Object.keys(valeurs)) saisies[k] = { par: moiId, le: maintenant() };
          const avertissements = d.contrat.avertissements.filter((a) => !(a.code === "ecart_avec_le_logiciel" && a.champ && valeurs[a.champ] !== undefined));
          remplacerLocal({ ...d, contrat: { ...d.contrat, ...valeurs, saisies, avertissements } as Dossier["contrat"] });
        },
      ),
      amender: (type, retour_prevu_le, motif) => reelOuLocal(
        () => amenderContrat(d0().contrat.id, type, retour_prevu_le, null, motif || null),
        () => {
          const d = d0();
          remplacerLocal({ ...d, amendements: [...d.amendements, { id: ids(), contrat_id: d.contrat.id, type: type as "prolongation", retour_prevu_le, km_inclus: null, sans_frais: type !== "prolongation", origine: "agence", motif: motif || null, accorde_par: moiId, accorde_le: maintenant() }] });
        },
      ),
      chiffrer: async (retour, fichiers) => {
        if (source === "reelle") {
          const d = d0();
          const client = moi?.client_id;
          /* les photos partent d'abord dans le bucket ; la porte reçoit leurs chemins */
          if (client) {
            const avecChemins = async (preuves: Retour["dommages"][number]["preuves"], cle: string) => {
              const fs = fichiers.get(cle) ?? [];
              const chemins = await Promise.all(fs.map((f) => deposerPhoto(client, d.contrat.id, f)));
              return preuves.map((p, i) => (p.photo && chemins[i] ? { ...p, chemin: chemins[i] } : p));
            };
            retour = {
              ...retour,
              dommages: await Promise.all(retour.dommages.map(async (x, i) => ({ ...x, preuves: await avecChemins(x.preuves, `dommage:${i}`) }))),
              postes: await Promise.all(retour.postes.map(async (x, i) => ({ ...x, preuves: await avecChemins(x.preuves, `poste:${i}`) }))),
              preuves: { carburant: await avecChemins(retour.preuves.carburant ?? [], "carburant"), km: await avecChemins(retour.preuves.km ?? [], "km") },
            };
          }
          await chiffrerRetour(d.contrat.id, retour);
          await relire();
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
        const d = d0();
        const prolong = d.amendements.filter((a) => a.retour_prevu_le).map((a) => a.retour_prevu_le!).sort().pop();
        const retourPrevu = prolong && prolong > d.contrat.retour_prevu_le ? prolong : d.contrat.retour_prevu_le;
        const version = Math.max(0, ...d.propositions.map((p) => p.version)) + 1;
        const applique = appliquerEtats(retour, d.etats);
        retour = applique.retour;
        const calc = chiffrerLocal({ contrat: d.contrat, vehicule: d.vehicule, retour, bareme: local.lignesBareme.filter((l) => l.bareme_id === BAREME_EXEMPLE.id), reglages: local.reglages ?? REGLAGES_EXEMPLE, version, par: moiId, ids, retourPrevu });
        const proposition = { ...calc.proposition, avertissements: [...calc.proposition.avertissements, ...applique.avertissements] };
        const lignes = calc.lignes;
        /* les précédentes non décidées sont remplacées ; une demande en attente est annulée */
        const propositions = d.propositions.map((p) => (["calculee", "preuve_manquante", "rien_a_facturer", "a_valider"].includes(p.statut) ? { ...p, statut: "remplacee" as const } : p));
        let demandes = d.demandes.map((x) => (d.propositions.some((p) => p.demande_id === x.id && p.statut === "a_valider") ? { ...x, statut: "annulee" } : x));
        let prop = proposition;
        let dd: Dossier = { ...d, contrat: { ...d.contrat, retour_reel_le: retour.retour_reel_le, km_retour: retour.km_retour ?? d.contrat.km_retour, statut: "clos" } };
        dd = journaliser(dd, "tavaro.proposition_calculee", "loc_propositions", prop.id, { numero: d.contrat.numero, version, statut: prop.statut, total_ttc: prop.total_ttc, par: moiId });
        if (prop.statut === "calculee") {
          const demande = { id: ids(), type_action: prop.hors_bareme ? "facture.envoyer_hors_bareme" : "facture.envoyer", statut: "en_attente", approbations_requises: prop.total_ttc >= 1500 ? 2 : 1, roles_autorises: prop.hors_bareme ? ["gerant", "admin"] : ["gerant", "admin", "valideur"], echeance: new Date(new Date().setHours(23, 59, 59, 0)).toISOString(), demandeur_id: moiId };
          demandes = [...demandes, demande];
          prop = { ...prop, statut: "a_valider", demande_id: demande.id };
          dd = journaliser(dd, "tavaro.demande_deposee", "loc_propositions", prop.id, { demande: demande.id, montant: prop.total_ttc, saisi_par: moiId });
        }
        remplacerLocal({ ...dd, propositions: [...propositions, prop], lignes: [...d.lignes, ...lignes], demandes });
      },
      litige: (facture, motif) => reelOuLocal(
        () => marquerLitige(facture.id, motif),
        () => {
          const d = d0();
          remplacerLocal(journaliser({ ...d, factures: d.factures.map((f) => (f.id === facture.id ? { ...f, statut: "litige" as const, litige_motif: motif } : f)) }, "tavaro.facture_litige", "loc_factures", facture.id, { reference: facture.reference, motif }));
        },
      ),
      regler: (facture, mode, le) => reelOuLocal(
        () => marquerReglee(facture.id, mode, le),
        () => {
          const d = d0();
          remplacerLocal(journaliser({ ...d, factures: d.factures.map((f) => (f.id === facture.id ? { ...f, statut: "reglee" as const, regle_le: le ?? maintenant(), mode_reglement: mode as Facture["mode_reglement"] } : f)) }, "tavaro.facture_reglee", "loc_factures", facture.id, { reference: facture.reference, mode, montant: facture.total_ttc }));
        },
      ),
      avoir: (facture, motif, montant_ttc) => reelOuLocal(
        () => demanderAvoir(facture.id, motif, montant_ttc),
        () => {
          const d = d0();
          const reste = resteDu(facture, d.avoirs);
          const ttc = montant_ttc ?? reste;
          const total = ttc === facture.total_ttc;
          const ht = total ? facture.total_ht : Math.round((ttc * facture.total_ht) / facture.total_ttc * 100) / 100;
          const demande = { id: ids(), type_action: "avoir.emettre", statut: "en_attente", approbations_requises: 1, roles_autorises: ["gerant", "admin"], echeance: new Date(Date.now() + 48 * 3_600_000).toISOString(), demandeur_id: moiId };
          const avoir: Avoir = { id: ids(), facture_id: facture.id, facture_reference: facture.reference, contrat_id: d.contrat.id, contrat_numero: d.contrat.numero, motif, total, montant_ht: ht, montant_tva: Math.round((ttc - ht) * 100) / 100, montant_ttc: ttc, statut: "a_valider", demande_id: demande.id, demande_par: moiId, reference: null, emis_le: null, date_avoir: null, envoye_le: null, cree_le: maintenant() };
          remplacerLocal(journaliser({ ...d, avoirs: [...d.avoirs, avoir], demandes: [...d.demandes, demande] }, "tavaro.avoir_demande", "loc_avoirs", avoir.id, { facture: facture.id, reference: facture.reference, montant_ttc: ttc, saisi_par: moiId }));
        },
      ),
      relancer: (facture) => reelOuLocal(
        () => relancerFacture(facture.id),
        () => {
          const d = d0();
          const n = (facture.relances ?? 0) + 1;
          remplacerLocal(journaliser({ ...d, factures: d.factures.map((f) => (f.id === facture.id ? { ...f, relances: n, relance_le: maintenant() } : f)) }, "tavaro.facture_relancee", "loc_factures", facture.id, { reference: facture.reference, relance: n, origine: "agence", reste_du: resteDu(facture, d.avoirs) }));
        },
      ),
      electronique: async (facture) => (source === "reelle" ? factureElectronique(facture.id) : formeLocale(docFacture(facture, d0().lignesFactures))),
      electroniqueAvoir: async (avoir) => {
        if (source === "reelle") return avoirElectronique(avoir.id);
        const f = d0().factures.find((x) => x.id === avoir.facture_id);
        if (!f) throw new Error("Facture d'origine introuvable.");
        return formeLocale(docAvoir(avoir, f));
      },
      completerClient: async (valeurs) => {
        const d = d0();
        if (!d.locataire) throw new Error("Ce contrat n'a pas de client connu.");
        if (source === "reelle") {
          await completerLocataire(d.locataire.id, valeurs);
          await relire();
          return;
        }
        await new Promise((r) => setTimeout(r, 350));
        if (valeurs.siren && !sirenValide(valeurs.siren)) throw new Error("Ce SIREN n'est pas valide (neuf chiffres, clé de contrôle).");
        remplacerLocal(journaliser({ ...d, locataire: { ...d.locataire, siren: valeurs.siren ?? d.locataire.siren ?? null, type: "professionnel" } }, "tavaro.locataire_complete", "loc_locataires", d.locataire.id, { champs: Object.keys(valeurs) }));
      },
    };
  }, [source, dossier, moi, moiId, local, relire, remplacerLocal]);

  const publier = async (libelle: string, date_effet: string, lignes: Record<string, unknown>[]) => {
    if (source === "reelle") {
      await publierBareme(libelle, date_effet, lignes);
      await relire();
      return;
    }
    await new Promise((r) => setTimeout(r, 350));
    const b: Bareme = { id: ids(), libelle, date_effet, statut: "publie", publie_le: maintenant(), retire_le: null, motif_retrait: null };
    const ls: LigneBareme[] = lignes.map((l, i) => ({ id: ids(), bareme_id: b.id, code: String(l.code), libelle: String(l.libelle), famille: l.famille as LigneBareme["famille"], unite: l.unite as LigneBareme["unite"], prix_eur: l.prix_eur !== undefined ? Number(l.prix_eur) : null, regime_tva: l.regime_tva as LigneBareme["regime_tva"], taux_tva: l.taux_tva !== undefined ? Number(l.taux_tva) : null, categorie_id: null, nature: l.famille === "dommage" ? "dommage" : "frais", rang: i + 1 }));
    setLocal((prev) => ({ ...prev, baremes: [b, ...prev.baremes], lignesBareme: [...prev.lignesBareme, ...ls] }));
  };
  const retirer = async (b: Bareme, motif: string) => {
    if (source === "reelle") {
      await retirerBareme(b.id, motif);
      await relire();
      return;
    }
    await new Promise((r) => setTimeout(r, 350));
    setLocal((prev) => ({ ...prev, baremes: prev.baremes.map((x) => (x.id === b.id ? { ...x, statut: "retire" as const, retire_le: maintenant(), motif_retrait: motif || null } : x)) }));
  };

  /* ——— les états des lieux : les photos et la signature partent d'abord dans le bucket (base réelle), puis la porte ——— */
  const gestesEtats: GestesEtats = useMemo(() => {
    const d0 = () => dossier!;
    const changerEtats = (f: (etats: EtatDesLieux[]) => EtatDesLieux[]) => {
      const d = d0();
      remplacerLocal({ ...d, etats: f(d.etats) });
    };
    const attendre = () => new Promise((r) => setTimeout(r, 350));
    return {
      etablir: async (moment, valeurs, fichiers) => {
        const d = d0();
        /* la netteté mesurée par l'écran suit chaque photo, dans l'ordre des fichiers de sa vue (b2_07) */
        const nettetes = new Map<string, (number | undefined)[]>();
        for (const ph of (valeurs.photos as { vue: string; nettete?: number }[]) ?? []) nettetes.set(ph.vue, [...(nettetes.get(ph.vue) ?? []), ph.nettete]);
        const nettetePreuve = (i: number, j: number) => ((valeurs.dommages as { preuves?: { nettete?: number }[] }[]) ?? [])[i]?.preuves?.[j]?.nettete;
        if (source === "reelle") {
          const client = moi?.client_id;
          if (!client) throw new Error("Compte introuvable : reconnectez-vous.");
          const photos: Record<string, unknown>[] = [];
          for (const [cle, fs] of fichiers) {
            if (!cle.startsWith("vue:")) continue;
            for (const [j, f] of fs.entries()) photos.push({ vue: cle.slice(4), chemin: await deposerPhoto(client, d.contrat.id, f), prise_le: new Date(f.lastModified).toISOString(), nettete: nettetes.get(cle.slice(4))?.[j] });
          }
          const dommages = await Promise.all(((valeurs.dommages as Record<string, unknown>[]) ?? []).map(async (x, i) => ({
            ...x, preuves: await Promise.all((fichiers.get(`dommage:${i}`) ?? []).map(async (f, j) => ({ chemin: await deposerPhoto(client, d.contrat.id, f), prise_le: new Date(f.lastModified).toISOString(), nettete: nettetePreuve(i, j) }))),
          })));
          const id = await etablirEtat(d.contrat.id, moment, { ...valeurs, photos, dommages });
          await relire();
          return id;
        }
        await attendre();
        const exist = d.etats.find((e) => e.moment === moment);
        const photos = [...fichiers].filter(([k]) => k.startsWith("vue:")).flatMap(([k, fs]) => fs.map((f, j) => ({ vue: k.slice(4), chemin: f.name, prise_le: maintenant(), nettete: nettetes.get(k.slice(4))?.[j] })));
        const dommages = ((valeurs.dommages as Record<string, unknown>[]) ?? []).map((x, i) => ({ ...x, preuves: (fichiers.get(`dommage:${i}`) ?? []).map((f, j) => ({ chemin: f.name, prise_le: maintenant(), nettete: nettetePreuve(i, j) })) })) as EtatDesLieux["dommages"];
        const caution = typeof valeurs.caution_eur === "number" ? valeurs.caution_eur : null;
        const mode = (valeurs.caution_mode as EtatDesLieux["caution_mode"]) ?? null;
        const e: EtatDesLieux = {
          id: exist?.id ?? ids(), client_id: EXEMPLE_CLIENT_ID, entite_id: d.contrat.entite_id, contrat_id: d.contrat.id, moment, statut: "brouillon", releve_le: maintenant(),
          km: (valeurs.km as number) ?? null, carburant_8: (valeurs.carburant_8 as number) ?? null, charge_pct: null, photos, dommages, observations: (valeurs.observations as string) ?? null,
          caution_eur: moment === "depart" ? caution : null, caution_mode: moment === "depart" ? mode : null, caution_reference: moment === "depart" ? ((valeurs.caution_reference as string) ?? null) : null,
          caution_statut: moment === "depart" && caution && mode !== "aucune" ? "prise" : null, caution_levee_le: null, caution_motif: null,
          signataire_nom: null, signature_chemin: null, signe_le: null, empreinte: null, refus_motif: null, refuse_le: null, etabli_par: moiId, cree_le: maintenant(),
        };
        changerEtats((l) => [...l.filter((x) => x.moment !== moment), e]);
        return e.id;
      },
      signer: async (etat, signataire, signature) => {
        if (source === "reelle") {
          const d = d0();
          const client = moi?.client_id;
          const chemin = client && signature ? await deposerPhoto(client, d.contrat.id, new File([signature], `signature-${etat.slice(0, 8)}.png`, { type: "image/png" })) : null;
          await signerEtat(etat, signataire, chemin);
          await relire();
          return;
        }
        await attendre();
        const e = d0().etats.find((x) => x.id === etat);
        if (!e) return;
        const quand = maintenant();
        const h = await empreinte({ ...e, signataire, signe_le: quand });
        changerEtats((l) => l.map((x) => (x.id === etat ? { ...x, statut: "signe", signataire_nom: signataire, signe_le: quand, signature_chemin: "signature.png", empreinte: h } : x)));
      },
      refuser: async (etat, motif) => {
        if (source === "reelle") {
          await constaterRefus(etat, motif);
          await relire();
          return;
        }
        await attendre();
        changerEtats((l) => l.map((x) => (x.id === etat ? { ...x, statut: "refuse", refus_motif: motif, refuse_le: maintenant() } : x)));
      },
      leverCaution: async (motif) => {
        if (source === "reelle") {
          await leverCaution(d0().contrat.id, motif);
          await relire();
          return;
        }
        await attendre();
        changerEtats((l) => l.map((x) => (x.moment === "depart" ? { ...x, caution_statut: "levee", caution_levee_le: maintenant(), caution_motif: motif } : x)));
      },
    };
  }, [source, dossier, moi, moiId, relire, remplacerLocal]);

  /* ——— les avis de contravention : la porte en base réelle, le même rapprochement en mémoire pour l'exemple ——— */
  const gestesAvis: GestesAvis = useMemo(() => {
    const changerAvis = (id: string, f: (a: AvisContravention) => AvisContravention) => setLocal((prev) => ({ ...prev, avis: prev.avis.map((a) => (a.id === id ? f(a) : a)) }));
    const attendre = () => new Promise((r) => setTimeout(r, 350));
    return {
      enregistrer: async (valeurs) => {
        if (source === "reelle") {
          const r = await enregistrerAvis(valeurs);
          await relire();
          return r;
        }
        await attendre();
        const numero = String(valeurs.numero_avis).toUpperCase().replace(/\s+/g, " ");
        const deja = local.avis.find((a) => a.numero_avis === numero);
        if (deja) return { avis: deja.id, statut: deja.statut, deja: true, echeance_le: deja.echeance_le, contrat: deja.contrat_id };
        const plaque = String(valeurs.immatriculation).toUpperCase().replace(/[^0-9A-Z]/g, "");
        const t = Date.parse(String(valeurs.infraction_le));
        const trouves = local.dossiers.filter((d) => d.vehicule && d.vehicule.immatriculation.replace(/[^0-9A-Z]/g, "") === plaque && d.contrat.statut !== "annule"
          && Date.parse(d.contrat.depart_le) <= t && t <= (d.contrat.retour_reel_le ? Date.parse(d.contrat.retour_reel_le) : d.contrat.statut === "ouvert" ? Infinity : Date.parse(d.contrat.retour_prevu_le)));
        const v = local.dossiers.find((d) => d.vehicule && d.vehicule.immatriculation.replace(/[^0-9A-Z]/g, "") === plaque)?.vehicule ?? null;
        const un = trouves.length === 1 ? trouves[0] : null;
        const envoye = String(valeurs.avis_envoye_le);
        const echeance = new Date(Date.parse(envoye + "T12:00:00Z") + 45 * 86_400_000).toISOString().slice(0, 10);
        const a: AvisContravention = {
          id: ids(), client_id: EXEMPLE_CLIENT_ID, entite_id: un?.contrat.entite_id ?? null, numero_avis: numero, immatriculation: v?.immatriculation ?? String(valeurs.immatriculation).toUpperCase(),
          vehicule_id: v?.id ?? null, infraction_le: new Date(t).toISOString(), lieu: (valeurs.lieu as string) ?? null, nature: (valeurs.nature as string) ?? null,
          montant_eur: typeof valeurs.montant_eur === "number" ? valeurs.montant_eur : null, avis_envoye_le: envoye, recu_le: String(valeurs.recu_le ?? envoye), echeance_le: echeance,
          contrat_id: un?.contrat.id ?? null, locataire_id: un?.contrat.locataire_id ?? null, rapprochement: un ? "auto" : null, candidats: trouves.length,
          statut: un ? "a_designer" : "a_rapprocher", designation: null, mode_designation: null, reference_designation: null, designe_le: null, designe_par: null, hors_delai: null,
          motif_classement: null, classe_le: null, classe_par: null, source: "saisie", cree_par: moiId, cree_le: maintenant(),
        };
        setLocal((prev) => ({ ...prev, avis: [...prev.avis, a] }));
        return { avis: a.id, statut: a.statut, deja: false, echeance_le: a.echeance_le, contrat: a.contrat_id, candidats: trouves.length };
      },
      rattacher: async (avis, contrat_id) => {
        if (source === "reelle") {
          await rattacherAvis(avis.id, contrat_id);
          await relire();
          return;
        }
        await attendre();
        const d = local.dossiers.find((x) => x.contrat.id === contrat_id);
        changerAvis(avis.id, (a) => ({ ...a, contrat_id, locataire_id: d?.contrat.locataire_id ?? null, entite_id: d?.contrat.entite_id ?? a.entite_id, rapprochement: "manuel", statut: "a_designer" }));
      },
      designer: async (avis, designation, mode, reference) => {
        if (source === "reelle") {
          await designerConducteur(avis.id, designation, mode, reference);
          await relire();
          return;
        }
        await attendre();
        const auj = new Date().toISOString().slice(0, 10);
        changerAvis(avis.id, (a) => ({ ...a, statut: "designe", designation: designation as AvisContravention["designation"], mode_designation: mode as AvisContravention["mode_designation"], reference_designation: reference, designe_le: maintenant(), designe_par: moiId, hors_delai: auj > a.echeance_le }));
      },
      classer: async (avis, motif) => {
        if (source === "reelle") {
          await classerAvis(avis.id, motif);
          await relire();
          return;
        }
        await attendre();
        if (role !== "gerant" && role !== "admin") throw new Error("Classer un avis sans désigner engage l'entreprise : la direction seule le fait.");
        changerAvis(avis.id, (a) => ({ ...a, statut: "classe", motif_classement: motif, classe_le: maintenant(), classe_par: moiId }));
      },
      refacturer: async (avis) => {
        if (source === "reelle") {
          await refacturerAvis(avis.id);
          await relire();
          return;
        }
        await attendre();
        changerAvis(avis.id, (a) => ({ ...a, refacture_proposition_id: ids() }));
      },
    };
  }, [source, local, moiId, role, relire]);

  /* ——— les contestations bancaires : la porte en base réelle ; en exemple, l'ouvrier est simulé (le dossier est prêt une seconde plus tard) ——— */
  const gestesContestations: GestesContestations = useMemo(() => {
    const changer = (id: string, f: (k: Contestation) => Contestation) => setLocal((prev) => ({ ...prev, contestations: prev.contestations.map((k) => (k.id === id ? f(k) : k)) }));
    const attendre = () => new Promise((r) => setTimeout(r, 350));
    const composer = (id: string) => window.setTimeout(() => changer(id, (k) => ({
      ...k, statut: k.statut === "ouverte" ? "dossier_pret" : k.statut, dossier_le: maintenant(), dossier_pages: 6, dossier_piece_id: k.dossier_piece_id ?? ids(),
      dossier_sha256: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join(""),
      dossier_chemin: `${EXEMPLE_CLIENT_ID}/loc_contestations/${k.id}/dossier-${k.reference_banque}.pdf`,
    })), 1200);
    return {
      ouvrir: async (facture, valeurs) => {
        if (source === "reelle") {
          const r = await ouvrirContestation(facture.id, valeurs);
          await relire();
          return r;
        }
        await attendre();
        const ref = String(valeurs.reference_banque);
        const deja = local.contestations.find((k) => k.facture_id === facture.id && k.reference_banque === ref);
        if (deja) return { contestation: deja.id, statut: deja.statut, deja: true };
        const d = local.dossiers.find((x) => x.contrat.id === facture.contrat_id)!;
        const k: Contestation = {
          id: ids(), client_id: EXEMPLE_CLIENT_ID, entite_id: d.contrat.entite_id, facture_id: facture.id, contrat_id: facture.contrat_id, reference_banque: ref,
          motif_banque: String(valeurs.motif_banque), montant_eur: typeof valeurs.montant_eur === "number" ? valeurs.montant_eur : facture.total_ttc,
          recue_le: String(valeurs.recue_le), repondre_avant: String(valeurs.repondre_avant), adresse_banque: (valeurs.adresse_banque as string) ?? local.reglages?.contestation_adresse ?? null,
          statut: "ouverte", forces: forcesLocales(d, facture), dossier_piece_id: null, dossier_sha256: null, dossier_pages: null, dossier_le: null, dossier_chemin: null,
          envoi_id: null, envoyee_le: null, envoyee_par: null, issue_le: null, issue_par: null, issue_note: null, notes: (valeurs.notes as string) ?? null, cree_par: moiId, cree_le: maintenant(),
        };
        setLocal((prev) => ({ ...prev, contestations: [...prev.contestations, k] }));
        composer(k.id);
        return { contestation: k.id, statut: k.statut, deja: false };
      },
      produire: async (k) => {
        if (source === "reelle") {
          await produireDossier(k.id);
          await relire();
          return;
        }
        await attendre();
        const d = local.dossiers.find((x) => x.contrat.id === k.contrat_id);
        const f = d?.factures.find((x) => x.id === k.facture_id);
        if (d && f) changer(k.id, (x) => ({ ...x, forces: forcesLocales(d, f) }));
        composer(k.id);
      },
      envoyer: async (k, adresse) => {
        if (source === "reelle") {
          const r = await envoyerDossier(k.id, adresse);
          await relire();
          return r;
        }
        await attendre();
        if (k.statut === "envoyee") return { deja: true };
        const d = local.dossiers.find((x) => x.contrat.id === k.contrat_id);
        const f = d?.factures.find((x) => x.id === k.facture_id);
        changer(k.id, (x) => ({ ...x, statut: "envoyee", envoi_id: ids(), envoyee_le: maintenant(), envoyee_par: moiId, adresse_banque: adresse }));
        return { deja: false, pieces_jointes: 1 + (f?.pdf_piece_id ? 1 : 0) + (d?.contrat.piece_id ? 1 : 0) };
      },
      issue: async (k, issue, note) => {
        if (source === "reelle") {
          await issueContestation(k.id, issue, note);
          await relire();
          return;
        }
        await attendre();
        if (role !== "gerant" && role !== "admin" && role !== "valideur") throw new Error("L'issue d'une contestation se consigne par la direction ou un valideur.");
        changer(k.id, (x) => ({ ...x, statut: issue, issue_le: maintenant(), issue_par: moiId, issue_note: note }));
      },
      lien: async (k) => (source === "reelle" && k.dossier_chemin ? lienDossier(k.dossier_chemin) : null),
    };
  }, [source, local, moiId, role, relire]);

  const agences = monde?.agences ?? [];
  const nomAgenceDe = (entite_id: string) => agences.find((a) => a.entite_id === entite_id)?.nom ?? agences.find((a) => a.entite_id === entite_id)?.code ?? entite_id.slice(0, 8);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Location : retours et factures</h1>
          <p className="esp-sous">
            Chaque retour est comparé à l&apos;état des lieux de départ et chiffré sur votre barème ; l&apos;agence valide la facture avant tout envoi.
            Les litiges, les avoirs et les relances restent dans le dossier du contrat.
          </p>
        </div>
        <div className="esp-item-haut">
          <Ruban source={source} />
        </div>
      </div>

      <div className="esp-kpis" data-arrivee="">
        {FAMILLES.map((f) => (
          <button key={f.cle} type="button" className="esp-kpi" data-teinte={compteurs[f.cle] ? f.teinte : undefined} aria-pressed={filtre === f.cle} onClick={() => setFiltre(filtre === f.cle ? null : f.cle)}>
            <span className="esp-kpi-etiquette">{f.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[f.cle]}</span>
            <span className="esp-kpi-sous">{f.sous}</span>
          </button>
        ))}
        <div className="esp-kpi" data-teinte="bleu" role="note">
          <span className="esp-kpi-etiquette">À encaisser</span>
          <span className="esp-kpi-valeur" style={{ fontSize: 22 }}>{montant(compteurs.encaisser)}</span>
          <span className="esp-kpi-sous">factures émises, envoyées ou en litige</span>
        </div>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}
      {source === "reelle" && reel && !moi ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="ambre">Aucun compte rattaché à cette session : la lecture passe, les gestes resteront gris.</Avis>
        </div>
      ) : null}

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label="Contrats">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((f) => f.cle === filtre)?.libelle : "Tous les contrats"}</h2>
            <span className="esp-kpi-sous">{visibles.length} contrat{visibles.length > 1 ? "s" : ""}</span>
          </div>
          {agences.length > 1 ? (
            <div className="esp-carte-corps">
              <div className="esp-filtres" role="group" aria-label="Filtrer par agence">
                <button type="button" className="esp-filtre" aria-pressed={agenceFiltre === null} onClick={() => setAgenceFiltre(null)}>Toutes les agences</button>
                {agences.map((a) => <button key={a.id} type="button" className="esp-filtre" aria-pressed={agenceFiltre === a.entite_id} onClick={() => setAgenceFiltre(a.entite_id)}>{a.nom ?? a.code}</button>)}
              </div>
            </div>
          ) : null}
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture du parking…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Aucun contrat">{filtre ? "Rien dans cette famille." : "Aucun contrat connu pour l'instant : ils arrivent par l'export de votre logiciel, par un contrat PDF lu, ou au comptoir."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Contrats de location">
              {visibles.map((d) => {
                const fam = famille(d.contrat, d.propositions, d.factures);
                const p = propositionVivante(d.propositions);
                const total = d.factures.length ? d.factures.reduce((s, f) => s + f.total_ttc, 0) : p?.total_ttc ?? null;
                const litige = d.factures.some((f) => f.statut === "litige");
                return (
                  <li key={d.contrat.id}>
                    <button type="button" aria-current={choisi === d.contrat.id ? "true" : undefined} className="esp-item"
                      onClick={() => { setChoix(d.contrat.id); if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      <span className="esp-item-haut">
                        <span className="esp-mono" style={{ fontWeight: 600 }}>{d.contrat.numero}</span>
                        {p ? <Pastille teinte={STATUTS_PROPOSITION[p.statut].teinte}>{STATUTS_PROPOSITION[p.statut].libelle}</Pastille> : <Pastille teinte={fam === "a_chiffrer" ? "ambre" : STATUTS_CONTRAT[d.contrat.statut].teinte}>{fam === "a_chiffrer" ? "Retour à chiffrer" : STATUTS_CONTRAT[d.contrat.statut].libelle}</Pastille>}
                        {litige ? <Pastille teinte="rouge">Litige</Pastille> : null}
                        {d.factures.some((f) => f.statut === "reglee") && !litige ? <Pastille teinte="vert">Réglé</Pastille> : null}
                        {fam === "bloquee" && !litige && p?.statut !== "preuve_manquante" ? <Pastille teinte="ambre">Impayé</Pastille> : null}
                      </span>
                      <span className="esp-item-montant">{total !== null && total > 0 ? montant(total) : ""}</span>
                      <span className="esp-item-titre">{nomLocataire(d.locataire)}{d.vehicule ? ` — ${d.vehicule.immatriculation}${d.vehicule.modele ? ` · ${d.vehicule.modele}` : ""}` : ""}</span>
                      <span className="esp-item-bas">
                        <span>Départ {dateCourte(d.contrat.depart_le)}</span>
                        <span>{d.contrat.retour_reel_le ? `Rendu ${dateCourte(d.contrat.retour_reel_le)}` : p && typeof p.entrees.retour_reel_le === "string" ? `Rendu ${dateCourte(p.entrees.retour_reel_le)}` : `Retour prévu ${dateCourte(d.contrat.retour_prevu_le)}`}</span>
                        <span>{nomAgenceDe(d.contrat.entite_id)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-dossier" className="esp-detail-mobile" aria-label="Dossier du contrat">
          {dossier ? (
            <DossierContrat key={dossier.contrat.id} dossier={dossier} source={source} role={role} moi={moiId} bareme={monde?.lignesBareme ?? []} reglages={monde?.reglages ?? null} agences={agences} nommer={nommer} gestes={gestes} gestesEtats={gestesEtats} />
          ) : source === "reelle" && !reel ? (
            <div className="esp-carte"><Chargement texte="Lecture du dossier…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un contrat">Le contrat, le chiffrage du retour, les factures et les avoirs s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 16 }}>
        <AvisVue avis={monde?.avis ?? []} dossiers={dossiers} role={role} nommer={nommer} nomAgence={nomAgenceDe} gestes={gestesAvis} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ContestationsVue contestations={monde?.contestations ?? []} dossiers={dossiers} reglages={monde?.reglages ?? null} role={role} nommer={nommer} nomAgence={nomAgenceDe} gestes={gestesContestations} />
      </div>

      {role === "gerant" || role === "admin" || role === "valideur" ? (
        <div style={{ marginTop: 16 }}>
          <Preparation2027 preparation={preparation} />
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <BaremeVue baremes={monde?.baremes ?? []} lignes={monde?.lignesBareme ?? []} categories={monde?.categories ?? []} role={role} onPublier={publier} onRetirer={retirer} />
      </div>
      {source === "exemple" ? <p className="esp-kpi-sous" style={{ marginTop: 10 }}>Loueur d&apos;exemple « Autoloc Bertin », identifiant {EXEMPLE_CLIENT_ID.slice(0, 8)} : rien de ce que vous faites ici n&apos;est écrit nulle part.</p> : null}
    </>
  );
}
