"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/varelo — le référentiel du groupe (05/10/2026, session B1)

   Ce que le client voit et fait, dans l'ordre du scénario (NOTES-B1.md) :
     · en haut, quatre compteurs pour la nature choisie (codes locaux,
       objets du groupe, lots à valider, taux de rattachement) ;
     · à gauche, les objets du groupe (F-00001 « Scieries du Jura »…) ;
       à droite, l'objet ouvert : ses codes locaux société par société,
       l'intragroupe, et les corrections qu'on peut proposer (nom,
       fusion, rattachement, détachement, scission), chacune ouvrant une
       demande de validation ;
     · pour les clients et les fournisseurs, l'encours du groupe (vague 3,
       Encours.tsx) : la dernière balance âgée de chaque société rangée
       par objet du groupe, le plafond et son dépassement ;
     · dessous, les lots à valider (paires proposées par le calcul, avec
       la preuve ; « écarter cette paire » ; le lot se décide dans
       /espace/validations) et les sociétés du groupe par pôle (inscrire
       une société, créer un pôle, déposer un export, lancer un passage).

   Deux sources : l'exemple (exemples.ts, modifié en mémoire pour que les
   enchaînements se voient) ou la base réelle (portes.ts). En base réelle
   le rôle est relu de `comptes`, la base restant juge.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Play, Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI } from "../exemples/socle";
import { useSource, type Source } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { pourcent } from "../format";
import { CODES_EXEMPLE, CONTEXTE_EXEMPLE, DEMANDES_EXEMPLE, INSTALLATION_EXEMPLE, OBJETS_EXEMPLE, POLES_EXEMPLE, PROPOSITIONS_EXEMPLE, SOCIETES_EXEMPLE } from "./exemples";
import { appliquerDecisions, chargerContexte, chargerReferentiel, deposerCodes, ecarterProposition, exporter, installer, lancerPassage, proposerDetachement, proposerFusion, proposerNom, proposerRattachement, proposerScission, type Referentiel } from "./portes";
import { LIBELLE_NATURE, NATURES, type CodeRef, type Contexte, type DemandeRef, type GenreProposition, type Nature, type Objet, type Proposition, type ResultatDepot, type ResultatPassage, type TypeActionRef } from "./types";
import ObjetDetail from "./ObjetDetail";
import Lots from "./Lots";
import Societes from "./Societes";
import Depot from "./Depot";
import Encours from "./Encours";
import "./varelo.css";

export type Donnees = Referentiel;

/* ce que les cartes savent faire, selon la source */
export type Actions = {
  source: Source;
  contexte: Contexte | null;
  /* gérant ou administrateur : installe, inscrit, dépose, exporte */
  peutGerer: boolean;
  /* gérant, administrateur ou valideur : lance un passage, applique les décisions */
  peutValider: boolean;
  /* propose une correction : rend le message à afficher */
  proposer: (genre: GenreProposition, p: { code_id?: string; objet_source?: string; objet_cible: string; codes?: string[]; nom?: string }, raison: string) => Promise<string>;
  ecarter: (prop: Proposition, motif: string) => Promise<void>;
  recharger: () => Promise<void>;
};

const nouvelId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const TYPE_DE: Record<GenreProposition, TypeActionRef> = {
  placer: "rattacher_codes",
  deplacer: "fusionner_objets",
  fusionner: "fusionner_objets",
  detacher: "detacher_code",
  scinder: "scinder_objet",
  renommer: "renommer_objet",
};

export default function EcranVarelo() {
  const { source } = useSource();
  const [local, setLocal] = useState<Donnees>({ installation: INSTALLATION_EXEMPLE, poles: POLES_EXEMPLE, societes: SOCIETES_EXEMPLE, codes: CODES_EXEMPLE, objets: OBJETS_EXEMPLE, propositions: PROPOSITIONS_EXEMPLE, demandes: DEMANDES_EXEMPLE, etat: null });
  const [reel, setReel] = useState<Donnees | null>(null);
  const [contexteReel, setContexteReel] = useState<Contexte | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [nature, setNature] = useState<Nature>("fournisseur");
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string | null>(null);

  /* ——— base réelle ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const c = await chargerContexte();
      setContexteReel(c);
      const r = await chargerReferentiel(c.client_id);
      setReel(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ installation: null, poles: [], societes: [], codes: [], objets: [], propositions: [], demandes: [], etat: null });
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  const relire = useCallback(async () => {
    if (!contexteReel) return;
    try {
      setReel(await chargerReferentiel(contexteReel.client_id));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [contexteReel]);
  useTempsReel(["grp_ref_codes", "grp_ref_objets", "grp_ref_propositions", "grp_societes", "demandes_validation"], source === "reelle", relire);

  const donnees: Donnees | null = source === "exemple" ? local : reel;
  const contexte: Contexte | null = source === "exemple" ? CONTEXTE_EXEMPLE : contexteReel;
  const client_id = contexte?.client_id ?? EXEMPLE_CLIENT_ID;
  const peutGerer = !!contexte && (contexte.role === "gerant" || contexte.role === "admin");
  const peutValider = peutGerer || contexte?.role === "valideur";

  /* ——— les objets de la nature, avec ce qui attend ——— */
  const codesParObjet = useMemo(() => {
    const m = new Map<string, CodeRef[]>();
    for (const c of donnees?.codes ?? []) if (c.objet_id) m.set(c.objet_id, [...(m.get(c.objet_id) ?? []), c]);
    return m;
  }, [donnees]);
  const attenteParObjet = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of donnees?.propositions ?? []) {
      if (p.statut !== "a_valider") continue;
      for (const o of [p.objet_cible, p.objet_source]) if (o) m.set(o, (m.get(o) ?? 0) + 1);
    }
    return m;
  }, [donnees]);

  const objets = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const l = (donnees?.objets ?? []).filter((o) => o.nature === nature && o.statut === "actif");
    const filtres = q
      ? l.filter((o) => {
          if (o.code_groupe.toLowerCase().includes(q) || o.nom_groupe.toLowerCase().includes(q)) return true;
          return (codesParObjet.get(o.id) ?? []).some((c) => c.code_local.toLowerCase().includes(q) || c.nom_local.toLowerCase().includes(q) || c.societe.toLowerCase().includes(q));
        })
      : l;
    return [...filtres].sort((a, b) => {
      const pa = attenteParObjet.get(a.id) ? 0 : 1;
      const pb = attenteParObjet.get(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.numero - b.numero;
    });
  }, [donnees, nature, recherche, codesParObjet, attenteParObjet]);

  const choisi = choix && objets.some((o) => o.id === choix) ? choix : (objets[0]?.id ?? null);
  const objet = objets.find((o) => o.id === choisi) ?? null;

  /* ——— les compteurs de la nature ——— */
  const compteurs = useMemo(() => {
    const e = donnees?.etat?.[nature];
    if (e) return { codes: e.codes, objets: e.objets, lots: e.propositions_ouvertes, taux: e.taux_rattachement, a_traiter: e.a_traiter };
    const codes = (donnees?.codes ?? []).filter((c) => c.nature === nature);
    const a_traiter = codes.filter((c) => c.etat === "a_traiter").length;
    return {
      codes: codes.length,
      objets: (donnees?.objets ?? []).filter((o) => o.nature === nature && o.statut === "actif").length,
      lots: (donnees?.propositions ?? []).filter((p) => p.nature === nature && p.statut === "a_valider").length,
      taux: codes.length ? (codes.length - a_traiter) / codes.length : null,
      a_traiter,
    };
  }, [donnees, nature]);
  const lotsOuverts = (donnees?.demandes ?? []).filter((d) => d.statut === "en_attente").length;

  /* ——— proposer une correction (porte ou mémoire) ——— */
  const proposer = useCallback<Actions["proposer"]>(
    async (genre, p, raison) => {
      const motif = raison.trim() || null;
      if (source === "reelle") {
        if (genre === "renommer") await proposerNom(p.objet_cible, p.nom ?? "", motif);
        else if (genre === "deplacer") await proposerRattachement(p.code_id ?? "", p.objet_cible, motif);
        else if (genre === "fusionner") await proposerFusion(p.objet_source ?? "", p.objet_cible, motif);
        else if (genre === "detacher") await proposerDetachement(p.code_id ?? "", motif);
        else await proposerScission(p.objet_cible, p.codes ?? [], motif);
        await relire();
        return "La correction est proposée : elle attend la décision du référent données dans la file de validation.";
      }
      await new Promise((r) => setTimeout(r, 350));
      {
        const cible = local.objets.find((o) => o.id === p.objet_cible);
        if (!cible) throw new Error("L'objet d'arrivée n'est pas un objet actif du même référentiel.");
        if (genre === "deplacer" && p.code_id) {
          const c = local.codes.find((x) => x.code_id === p.code_id);
          if (c && c.etat === "propose") throw new Error("Ce code attend déjà la validation de son rattachement.");
        }
        const bougent = genre === "deplacer" || genre === "detacher" ? [p.code_id ?? ""] : genre === "scinder" ? (p.codes ?? []) : genre === "fusionner" ? local.codes.filter((c) => c.objet_id === p.objet_source).map((c) => c.code_id) : [];
        if (local.propositions.some((q) => q.statut === "a_valider" && ((q.code_id && bougent.includes(q.code_id)) || (q.genre === "fusionner" && q.objet_source === p.objet_source) || (genre === "renommer" && q.genre === "renommer" && q.objet_cible === p.objet_cible))))
          throw new Error("Une proposition attend déjà une décision pour ce code ou cet objet.");
      }
      setLocal((prev) => {
        const cible = prev.objets.find((o) => o.id === p.objet_cible);
        if (!cible) return prev;
        const type = TYPE_DE[genre];
        const idProp = nouvelId();
        const idDem = nouvelId();
        const quand = new Date().toISOString();
        const source_ = p.objet_source ? prev.objets.find((o) => o.id === p.objet_source) : null;
        const resume =
          genre === "deplacer" ? `Référentiel : rattacher un code de la société à ${cible.code_groupe}.`
          : genre === "fusionner" ? `Référentiel : fusionner ${source_?.code_groupe ?? "?"} dans ${cible.code_groupe}.`
          : genre === "detacher" ? `Référentiel : détacher un code de ${cible.code_groupe}.`
          : genre === "scinder" ? `Référentiel : scinder ${cible.code_groupe}, ${p.codes?.length ?? 0} code(s) sous un nouveau code du groupe.`
          : `Référentiel : renommer ${cible.code_groupe}.`;
        const prop: Proposition = { id: idProp, client_id: EXEMPLE_CLIENT_ID, nature: cible.nature, genre, preuve: "humaine", type_action: type, code_id: p.code_id ?? null, codes: genre === "scinder" ? (p.codes ?? []) : null, objet_source: genre === "deplacer" ? (prev.codes.find((c) => c.code_id === p.code_id)?.objet_id ?? null) : genre === "fusionner" ? (p.objet_source ?? null) : null, objet_cible: p.objet_cible, nom: genre === "renommer" ? (p.nom ?? null) : null, regle: "humain", score: null, raisons: [{ critere: "humain", raison: motif ?? "" }], preuves: [], cle_paire: `${genre}:${idProp}`, empreinte: "0".repeat(64), statut: "a_valider", demande_id: idDem, motif: null, decide_par: null, cree_le: quand, traite_le: null };
        const dem: DemandeRef = { id: idDem, client_id: EXEMPLE_CLIENT_ID, entite_id: null, module: "varelo", type_action: type, objet_type: "grp_referentiel", objet_id: idProp, resume, payload: { proposition: idProp, genre, raison: motif ?? "", saisi_par: EXEMPLE_MOI }, demandeur_type: "utilisateur", demandeur_id: EXEMPLE_MOI, statut: "en_attente", approbations_requises: 1, equipe_id: Object.keys(CONTEXTE_EXEMPLE.noms_equipes)[0], cree_le: quand, decide_le: null };
        return { ...prev, propositions: [prop, ...prev.propositions], demandes: [dem, ...prev.demandes] };
      });
      return "La correction est proposée (en mémoire) : elle attend la décision du référent données dans la file de validation.";
    },
    [source, relire, local],
  );

  /* ——— écarter une paire ——— */
  const ecarter = useCallback<Actions["ecarter"]>(
    async (prop, motif) => {
      if (source === "reelle") {
        await ecarterProposition(prop.id, motif.trim() || null);
        await relire();
        return;
      }
      await new Promise((r) => setTimeout(r, 300));
      setLocal((prev) => {
        const quand = new Date().toISOString();
        const propositions = prev.propositions.map((q) => (q.id === prop.id ? { ...q, statut: "ecartee" as const, motif: motif.trim() || "Écartée par une décision.", decide_par: EXEMPLE_MOI, traite_le: quand } : q));
        let codes = prev.codes;
        let objets = prev.objets;
        if (prop.genre === "placer" && prop.code_id) {
          const c = prev.codes.find((x) => x.code_id === prop.code_id);
          if (c) {
            const numero = Math.max(0, ...prev.objets.filter((o) => o.nature === c.nature).map((o) => o.numero)) + 1;
            const o: Objet = { id: nouvelId(), client_id: EXEMPLE_CLIENT_ID, nature: c.nature, numero, code_groupe: `${c.nature === "client" ? "C" : c.nature === "fournisseur" ? "F" : c.nature === "article" ? "A" : "S"}-${String(numero).padStart(5, "0")}`, nom_groupe: c.nom_local, nom_origine: "auto", intragroupe: false, intragroupe_entite_id: null, entite_id: null, statut: "actif", fusionne_dans: null, cree_le: quand, maj_le: quand };
            objets = [...prev.objets, o];
            codes = prev.codes.map((x) => (x.code_id === c.code_id ? { ...x, etat: "nouveau" as const, methode: "rejet" as const, score: null, objet_id: o.id, code_groupe: o.code_groupe, nom_groupe: o.nom_groupe, intragroupe: false, rattache_le: quand } : x));
          }
        }
        /* un lot vidé de ses paires est annulé */
        const demandes = prev.demandes.map((d) => (d.id === prop.demande_id && !propositions.some((q) => q.demande_id === d.id && q.statut === "a_valider") ? { ...d, statut: "annulee" as const } : d));
        return { ...prev, propositions, codes, objets, demandes };
      });
    },
    [source, relire],
  );

  /* ——— déposer un export, lancer un passage, exporter, installer ——— */
  const [depot, setDepot] = useState(false);
  const deposer = useCallback(
    async (entite_id: string, nat: Nature, lignes: Record<string, string>[], src: string | null): Promise<ResultatDepot> => {
      if (source === "reelle") {
        const r = await deposerCodes(client_id, entite_id, nat, lignes, src);
        await relire();
        return r;
      }
      await new Promise((r) => setTimeout(r, 400));
      const rejetes: ResultatDepot["rejetes"] = [];
      const vus = new Set<string>();
      const valides: { l: Record<string, string>; ligne: number }[] = [];
      lignes.forEach((l, i) => {
        const code = (l.code ?? "").trim();
        const nom = (l.nom ?? l.designation ?? "").trim();
        if (!code) rejetes.push({ ligne: i + 1, code: null, motif: "code local manquant" });
        else if (!nom) rejetes.push({ ligne: i + 1, code, motif: "nom manquant" });
        else if (vus.has(code)) rejetes.push({ ligne: i + 1, code, motif: "doublon dans le lot" });
        else {
          vus.add(code);
          valides.push({ l, ligne: i + 1 });
        }
      });
      const sirenFaux = (v: string | undefined) => {
        if (!v) return false;
        const d = v.replace(/[\s.\-]/g, "");
        if (!/^\d{9}$/.test(d)) return true;
        let t = 0;
        for (let i = 0; i < 9; i++) {
          let x = Number(d[8 - i]);
          if (i % 2 === 1) {
            x *= 2;
            if (x > 9) x -= 9;
          }
          t += x;
        }
        return t % 10 !== 0;
      };
      const societe = local.societes.find((s) => s.entite_id === entite_id);
      const codes = [...local.codes];
      let nouveaux = 0;
      let modifies = 0;
      for (const { l } of valides) {
        const code = l.code.trim();
        const nom = (l.nom ?? l.designation).trim();
        const k = codes.findIndex((c) => c.entite_id === entite_id && c.nature === nat && c.code_local === code);
        if (k >= 0) {
          if (codes[k].nom_local !== nom) {
            codes[k] = { ...codes[k], nom_local: nom };
            modifies++;
          }
        } else {
          codes.push({ code_id: nouvelId(), client_id: EXEMPLE_CLIENT_ID, nature: nat, entite_id, societe: societe?.nom ?? "Société", code_local: code, nom_local: nom, objet_id: null, code_groupe: null, nom_groupe: null, intragroupe: null, etat: "a_traiter", methode: null, score: null, actif: true, anomalies: sirenFaux(l.siren) ? { siren: "clé ou format invalide" } : {}, rattache_le: null });
          nouveaux++;
        }
      }
      setLocal((prev) => ({ ...prev, codes, societes: prev.societes.map((s) => (s.entite_id === entite_id && s.statut_branchement === "a_brancher" ? { ...s, statut_branchement: "observation" as const } : s)) }));
      return { lus: lignes.length, nouveaux, modifies, inchanges: valides.length - nouveaux - modifies, anomalies: valides.filter(({ l }) => sirenFaux(l.siren)).length, rejetes };
    },
    [source, client_id, relire, local],
  );

  const [passage, setPassage] = useState<"ferme" | "confirme" | "encours">("ferme");
  const lancer = useCallback(async () => {
    setPassage("encours");
    setErreur(null);
    try {
      let r: ResultatPassage;
      if (source === "reelle") {
        r = await lancerPassage(client_id, false);
        await appliquerDecisions(client_id).catch(() => null);
        await relire();
      } else {
        await new Promise((x) => setTimeout(x, 600));
        const quand = new Date().toISOString();
        const objets = [...local.objets];
        let crees = 0;
        const codes = local.codes.map((c) => {
          if (c.etat !== "a_traiter") return c;
          const numero = Math.max(0, ...objets.filter((o) => o.nature === c.nature).map((o) => o.numero)) + 1;
          const o: Objet = { id: nouvelId(), client_id: EXEMPLE_CLIENT_ID, nature: c.nature, numero, code_groupe: `${c.nature === "client" ? "C" : c.nature === "fournisseur" ? "F" : c.nature === "article" ? "A" : "S"}-${String(numero).padStart(5, "0")}`, nom_groupe: c.nom_local, nom_origine: "auto", intragroupe: false, intragroupe_entite_id: null, entite_id: null, statut: "actif", fusionne_dans: null, cree_le: quand, maj_le: quand };
          objets.push(o);
          crees++;
          return { ...c, etat: "nouveau" as const, methode: "nouveau" as const, objet_id: o.id, code_groupe: o.code_groupe, nom_groupe: o.nom_groupe, intragroupe: false, rattache_le: quand };
        });
        setLocal((prev) => ({ ...prev, codes, objets }));
        r = { codes_examines: local.codes.filter((c) => c.etat === "a_traiter").length, objets_crees: crees, places_d_office: 0, demandes: 0, duree_ms: 12 };
      }
      const n = (k: string) => (typeof r[k] === "number" ? (r[k] as number) : 0);
      setFait(`Passage terminé : ${n("codes_examines")} codes examinés, ${n("objets_crees")} objets créés, ${n("places_d_office")} codes placés d'office, ${n("demandes")} lot${n("demandes") > 1 ? "s" : ""} à valider.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le passage a échoué.");
    } finally {
      setPassage("ferme");
    }
  }, [source, client_id, relire, local.codes, local.objets]);

  const [exportEnCours, setExportEnCours] = useState(false);
  const telecharger = useCallback(async () => {
    setExportEnCours(true);
    setErreur(null);
    try {
      let csv: string;
      if (source === "reelle") csv = await exporter(client_id, nature);
      else {
        const csvCell = (v: string | null) => {
          if (v == null) return "";
          const s = /^[=+@\t\r]/.test(v) || /^-[^0-9 ]/.test(v) ? `'${v}` : v;
          return /[;"\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lignes = local.codes.filter((c) => c.nature === nature && c.objet_id).sort((a, b) => (a.code_groupe ?? "").localeCompare(b.code_groupe ?? "") || a.societe.localeCompare(b.societe));
        csv = ["code_groupe;nom_groupe;societe;code_local;nom_local;etat", ...lignes.map((c) => [c.code_groupe, c.nom_groupe, c.societe, c.code_local, c.nom_local, c.etat].map(csvCell).join(";"))].join("\n");
      }
      const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `referentiel-${LIBELLE_NATURE[nature].des}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setFait(`Le référentiel des ${LIBELLE_NATURE[nature].des} est exporté (${csv.split("\n").length - 1} lignes).`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'export a échoué.");
    } finally {
      setExportEnCours(false);
    }
  }, [source, client_id, nature, local.codes]);

  const [installe, setInstalle] = useState(false);
  const installerIci = useCallback(async () => {
    setInstalle(true);
    setErreur(null);
    try {
      const r = await installer(client_id);
      await relire();
      setFait(`Varelo est installé : ${r.regles_posees} règle${r.regles_posees > 1 ? "s" : ""} de validation posée${r.regles_posees > 1 ? "s" : ""}, six directions, le battement quotidien.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'installation a échoué.");
    } finally {
      setInstalle(false);
    }
  }, [client_id, relire]);

  const actions: Actions = useMemo(() => ({ source, contexte, peutGerer, peutValider, proposer, ecarter, recharger: relire }), [source, contexte, peutGerer, peutValider, proposer, ecarter, relire]);

  const majLocal = useCallback((f: (d: Donnees) => Donnees) => setLocal((prev) => f(prev)), []);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Référentiel du groupe</h1>
          <p className="esp-sous">
            Chaque client, fournisseur ou article reçoit un seul nom pour tout le groupe, rattaché aux codes de chaque société. Le calcul propose, une personne décide, le journal garde qui a validé quoi.
          </p>
        </div>
        <div className="esp-item-haut">
          {peutGerer ? (
            <button type="button" className="r-btn r-btn--noir" onClick={() => setDepot(true)}><Upload width={15} height={15} aria-hidden="true" /> Déposer un export</button>
          ) : null}
          {peutValider ? (
            <button type="button" className="r-btn r-btn--fil" onClick={() => setPassage("confirme")}><Play width={15} height={15} aria-hidden="true" /> Lancer un passage</button>
          ) : null}
          {peutGerer ? (
            <button type="button" className="r-btn r-btn--fil" disabled={exportEnCours} onClick={telecharger}><Download width={15} height={15} aria-hidden="true" /> {exportEnCours ? "Export…" : "Exporter (CSV)"}</button>
          ) : null}
          <Ruban source={source} />
        </div>
      </div>

      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}

      {source === "reelle" && reel && !reel.installation ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="ambre">
            <strong>Varelo n&apos;est pas installé pour votre organisation.</strong> L&apos;installation pose les six directions (présidence, finances, juridique, opérations, DSI, référent données), les sept règles de validation du référentiel et le battement quotidien.
            {peutGerer ? (
              <div className="esp-actions" style={{ marginTop: 10 }}>
                <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={installe} onClick={installerIci}>{installe ? <Loader variant="spin" /> : null} Installer Varelo</button>
              </div>
            ) : (
              <> Seul le gérant ou l&apos;administrateur l&apos;installe.</>
            )}
          </Avis>
        </div>
      ) : null}

      <div className="esp-filtres" data-arrivee="" role="group" aria-label="Nature du référentiel" style={{ marginBottom: 12 }}>
        {NATURES.map((n) => (
          <button key={n} type="button" className="esp-filtre" aria-pressed={nature === n} onClick={() => setNature(n)}>
            {LIBELLE_NATURE[n].des.charAt(0).toUpperCase() + LIBELLE_NATURE[n].des.slice(1)}
          </button>
        ))}
      </div>

      <div className="esp-kpis" data-arrivee="">
        <div className="esp-kpi">
          <span className="esp-kpi-etiquette">Codes locaux</span>
          <span className="esp-kpi-valeur">{compteurs.codes}</span>
          <span className="esp-kpi-sous">{compteurs.a_traiter ? `${compteurs.a_traiter} à traiter au prochain passage` : "dans toutes les sociétés"}</span>
        </div>
        <div className="esp-kpi">
          <span className="esp-kpi-etiquette">Objets du groupe</span>
          <span className="esp-kpi-valeur">{compteurs.objets}</span>
          <span className="esp-kpi-sous">un nom pour tout le groupe</span>
        </div>
        <div className="esp-kpi" data-teinte={compteurs.lots ? "ambre" : undefined}>
          <span className="esp-kpi-etiquette">Paires à valider</span>
          <span className="esp-kpi-valeur">{compteurs.lots}</span>
          <span className="esp-kpi-sous">{lotsOuverts} lot{lotsOuverts > 1 ? "s" : ""} dans la file</span>
        </div>
        <div className="esp-kpi" data-teinte={compteurs.taux !== null && compteurs.taux < 1 ? "ambre" : compteurs.taux === 1 ? "vert" : undefined}>
          <span className="esp-kpi-etiquette">Taux de rattachement</span>
          <span className="esp-kpi-valeur">{compteurs.taux === null ? "—" : pourcent(Math.round(compteurs.taux * 1000) / 10)}</span>
          <span className="esp-kpi-sous">codes rangés sous un objet</span>
        </div>
      </div>

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label="Objets du groupe">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{LIBELLE_NATURE[nature].des.charAt(0).toUpperCase() + LIBELLE_NATURE[nature].des.slice(1)} du groupe</h2>
            <span className="esp-kpi-sous">{objets.length} objet{objets.length > 1 ? "s" : ""}</span>
          </div>
          <div className="vrl-recherche">
            <input type="search" className="rv-champ" placeholder="Chercher un nom, un code local, une société…" value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Chercher dans le référentiel" />
          </div>
          {source === "reelle" && !reel ? (
            <Chargement texte="Lecture du référentiel…" />
          ) : objets.length === 0 ? (
            <Vide titre="Aucun objet">{recherche ? "Rien ne répond à cette recherche." : `Aucun ${LIBELLE_NATURE[nature].un} dans le référentiel : déposez l'export d'une société, le prochain passage ouvre les objets.`}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Objets du groupe" style={{ marginTop: 10 }}>
              {objets.map((o) => {
                const codes = codesParObjet.get(o.id) ?? [];
                const attente = attenteParObjet.get(o.id) ?? 0;
                const societes = Array.from(new Set(codes.map((c) => c.societe)));
                return (
                  <li key={o.id}>
                    <button type="button" aria-current={choisi === o.id ? "true" : undefined} className="esp-item" onClick={() => { setChoix(o.id); if (window.innerWidth < 1024) document.getElementById("vrl-objet")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      <span className="esp-item-haut">
                        <span className="esp-mono" style={{ fontWeight: 600 }}>{o.code_groupe}</span>
                        {attente ? <Pastille teinte="ambre">{attente} à valider</Pastille> : null}
                        {o.intragroupe ? <Pastille teinte="noir">Intragroupe</Pastille> : null}
                        {o.nom_origine === "humain" ? <Pastille teinte="gris" contour>Nom choisi</Pastille> : null}
                      </span>
                      <span className="esp-item-montant">{codes.length} code{codes.length > 1 ? "s" : ""}</span>
                      <span className="esp-item-titre">{o.nom_groupe}</span>
                      <span className="esp-item-bas"><span>{societes.length ? societes.join(" · ") : "aucun code"}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="vrl-objet" className="esp-detail-mobile" aria-label="Objet du groupe">
          {objet && donnees ? (
            <ObjetDetail key={objet.id} objet={objet} donnees={donnees} actions={actions} />
          ) : source === "reelle" && !reel ? (
            <div className="esp-carte"><Chargement texte="Lecture…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un objet">Ses codes locaux, société par société, et les corrections possibles s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      {donnees && contexte && (nature === "client" || nature === "fournisseur") ? (
        <Encours
          source={source}
          contexte={contexte}
          client_id={client_id}
          nature={nature}
          societes={donnees.societes}
          codes={donnees.codes}
          objets={donnees.objets}
          onOuvrir={(id) => {
            setRecherche("");
            setChoix(id);
            document.getElementById("vrl-objet")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onFait={(m) => setFait(m)}
          inscrireExemple={deposer}
          relireReferentiel={relire}
        />
      ) : null}

      <div className="esp-grille" style={{ marginTop: 16 }}>
        {donnees ? <Lots donnees={donnees} actions={actions} /> : null}
        {donnees ? <Societes donnees={donnees} actions={actions} majLocal={majLocal} onDepot={() => setDepot(true)} /> : null}
      </div>

      {donnees ? <Depot ouvert={depot} onFermer={() => setDepot(false)} societes={donnees.societes} deposer={deposer} onFait={(m) => setFait(m)} /> : null}

      <Dialog open={passage !== "ferme"} onOpenChange={(o) => !o && passage !== "encours" && setPassage("ferme")}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Play width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Lancer un passage de rapprochement</DialogTitle>
            <DialogDescription>Le calcul range les codes déposés : il ouvre un objet pour chaque tiers nouveau, place d&apos;office ceux qu&apos;un identifiant commun prouve (SIREN, TVA, IBAN, GTIN), propose les paires probables et forme les lots à valider. Il tourne de lui-même chaque nuit ; ici, tout de suite.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="esp-kpi-sous">{compteurs.a_traiter ? `${compteurs.a_traiter} code${compteurs.a_traiter > 1 ? "s" : ""} ${LIBELLE_NATURE[nature].un}${compteurs.a_traiter > 1 ? "s" : ""} attend${compteurs.a_traiter > 1 ? "ent" : ""} ce passage.` : "Aucun code n'attend : le passage revérifie les propositions ouvertes et applique les décisions prises."}</p>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={passage === "encours"} onClick={lancer}>{passage === "encours" ? <Loader variant="spin" /> : null} Lancer maintenant</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="esp-kpi-sous" style={{ marginTop: 18 }}>
        Les lots se décident dans <Link href="/espace/validations">la file de validation</Link>, chacun par la direction que sa règle désigne ; chaque décision est inscrite au journal opposable.
      </p>
    </>
  );
}
