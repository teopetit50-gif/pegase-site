"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/tamila — les dossiers du cabinet (05/10/2026, session B4)

   En haut, cinq compteurs qui filtrent : délais à confirmer, échéances
   sous quinze jours, audiences à venir, dossiers ouverts, dossiers clos
   (en attente d'effacement). À gauche la liste des dossiers, l'urgence
   en tête ; à droite le dossier ouvert (DossierTamila) : parties, appel
   et délais calculés, audiences, avis RPVA, membres et murailles,
   exports, journal des accès, clôture.

   Deux sources : l'exemple (exemples.ts, modifié en mémoire pour que les
   enchaînements se voient) ou la base réelle (portes.ts). En base réelle,
   tout ce qui est chiffré (référence, intitulé, n° RG, noms des parties,
   motif d'une muraille) ne se lit qu'avec la PHRASE DU CABINET, tapée ici,
   gardée dans l'onglet, jamais envoyée (chiffrement.ts). Sans elle, le
   dossier reste « Chiffré » : les délais, audiences et décisions se
   lisent quand même, ils ne portent pas de clair.

   Le coffre à clés (b4_05, 06/10/2026) : un cabinet peut passer au coffre
   Scaleway. Le gérant l'active, puis un associé ré-enveloppe les dossiers
   tapés sous la phrase (la clé ne change pas, son enveloppe si). Ensuite la
   clé d'un dossier vient du coffre (fonction tamila-coffre), à l'ouverture
   du dossier, pour qui le voit ; chaque déballage est journalisé.

   Les avis reçus par courriel (b4_10, 06/10/2026) : au-dessus des
   compteurs, la file « Avis RPVA à rattacher » (AvisEntrantsTamila).
   Les honoraires du cabinet (06/10) : un tableau par dossier pour les
   avocats (HonorairesCabinet), ouvert depuis l'en-tête.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, KeyRound, Lock, Scale, ShieldCheck, Unlock } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte } from "../format";
import { Trousseau, chiffrer, dechiffrer, envelopper, exporterCle, genererCle, importerCle, memoriserPhrase, phraseMemorisee } from "./chiffrement";
import { DOSSIERS_EXEMPLE, EXEMPLE_CLIENT, MOI, PERSONNES_EXEMPLE, REGLAGES_EXEMPLE, REGLES_EXEMPLE } from "./exemples";
import { MATIERES, STATUTS_DOSSIER, TERRITOIRES, delaiCourt, estAssocie, estGerant, joursAvant, libelleMatiere, libelleTerritoire, type Moi } from "./regles";
import { chargerCabinet, chargerDossier, cleDossier, coffre, creerDossier, installer, type Cabinet, type EtatCoffre } from "./portes";
import type { Clair, Dossier, DossierComplet } from "./types";
import DossierTamila from "./DossierTamila";
import AvisEntrantsTamila from "./AvisEntrantsTamila";
import HonorairesCabinet from "./HonorairesCabinet";
import "./tamila.css";

type Filtre = "a_confirmer" | "proches" | "audiences" | "ouverts" | "clos";

const FILTRES: { cle: Filtre; libelle: string; sous: string; teinte: "rouge" | "ambre" | "bleu" | "vert" | "gris" }[] = [
  { cle: "a_confirmer", libelle: "Délais à confirmer", sous: "par un avocat", teinte: "ambre" },
  { cle: "proches", libelle: "Échéances sous 15 jours", sous: "actes à déposer", teinte: "rouge" },
  { cle: "audiences", libelle: "Audiences à venir", sous: "dans les 30 jours", teinte: "bleu" },
  { cle: "ouverts", libelle: "Dossiers ouverts", sous: "ouverts, audits, en attente", teinte: "vert" },
  { cle: "clos", libelle: "Dossiers clos", sous: "effacés à l'échéance", teinte: "gris" },
];

/* La ligne de la liste : une forme commune aux deux sources. */
type Ligne = {
  dossier: Dossier;
  clair: Clair | null;
  aConfirmer: number;
  prochaine: string | null;
  audience: string | null;
  responsable: string | null;
};

export default function EcranTamila() {
  const { source } = useSource();
  const [local, setLocal] = useState<DossierComplet[]>(DOSSIERS_EXEMPLE);
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [complets, setComplets] = useState<Record<string, DossierComplet>>({});
  const [clairs, setClairs] = useState<Record<string, Clair | null>>({});
  /* la clé déballée du dossier ouvert, posée par un effet (jamais lue dans le trousseau pendant le rendu) */
  const [clesOuvertes, setClesOuvertes] = useState<Record<string, CryptoKey | null>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre | null>(null);
  const [tableauHonoraires, setTableauHonoraires] = useState(false);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeDossier, setChargeDossier] = useState(false);
  const trousseau = useRef(new Trousseau());
  const [phrase, setPhrase] = useState<string | null>(null);
  const [formPhrase, setFormPhrase] = useState(false);
  const [saisiePhrase, setSaisiePhrase] = useState("");

  /* le coffre à clés : celui du cabinet (base réelle), ou un coffre d'exemple, en mémoire */
  const [coffreExemple, setCoffreExemple] = useState<EtatCoffre>({ statut: "local", region: null, dossiers_locaux: DOSSIERS_EXEMPLE.length, dossiers_scaleway: 0 });
  const etat: EtatCoffre | null = source === "exemple" ? coffreExemple : (cabinet?.coffre ?? null);
  const auCoffre = !!etat && etat.statut !== "local";

  /* la clé d'un dossier par le coffre : null si le dossier est encore sous la phrase */
  const cleParCoffre = useCallback(async (dossier: string): Promise<CryptoKey | null> => {
    const r = await coffre<{ fournisseur: string; cle?: string }>("cle_dossier", { dossier });
    if (r.fournisseur !== "scaleway" || !r.cle) return null;
    const k = await importerCle(r.cle);
    trousseau.current.poser(dossier, k);
    return k;
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setPhrase(phraseMemorisee()), 0);
    return () => window.clearTimeout(t);
  }, []);

  /* ——— base réelle : le cabinet, puis le dossier à l'ouverture ——— */
  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setCabinet(null);
    setComplets({});
    try {
      setCabinet(await chargerCabinet());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setCabinet({ moi: { user_id: "", client_id: "", role: "lecteur", email: null }, installe: false, reglages: null, dossiers: [], cles: [], delais: [], audiences: [], demandes: [], personnes: [], regles: [], horsVue: null, coffre: null });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      const c = await chargerCabinet();
      setCabinet(c);
      setComplets({});
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["tamila_dossiers", "tamila_delais", "tamila_audiences", "demandes_validation"], source === "reelle", relire);

  /* ——— les clairs de la liste : chaque dossier dont la clé se déballe avec la phrase ——— */
  useEffect(() => {
    if (source !== "reelle" || !cabinet || !phrase) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const prochains: Record<string, Clair | null> = {};
      for (const d of cabinet.dossiers) {
        if (clairs[d.id] !== undefined) continue;
        const k = cabinet.cles.find((c) => c.dossier_id === d.id && c.statut === "active");
        if (!k) {
          prochains[d.id] = null;
          continue;
        }
        if (k.fournisseur === "scaleway") continue;
        const cle = await trousseau.current.ouvrir(d.id, k.enveloppe, phrase);
        if (!cle) {
          prochains[d.id] = null;
          continue;
        }
        const [reference, intitule, numero_rg] = await Promise.all([dechiffrer(cle, d.reference_chiffree), dechiffrer(cle, d.intitule_chiffre), dechiffrer(cle, d.numero_rg_chiffre)]);
        prochains[d.id] = reference !== null && intitule !== null ? { reference, intitule, numero_rg } : null;
      }
      if (actif && Object.keys(prochains).length) setClairs((prev) => ({ ...prev, ...prochains }));
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, cabinet, phrase, clairs]);

  const moi: Moi = source === "exemple" ? { user_id: MOI, role: "gerant" } : cabinet?.moi.user_id ? { user_id: cabinet.moi.user_id, role: cabinet.moi.role } : null;
  const personnes = useMemo(() => (source === "exemple" ? PERSONNES_EXEMPLE : (cabinet?.personnes ?? [])), [source, cabinet]);
  const regles = source === "exemple" ? REGLES_EXEMPLE : (cabinet?.regles ?? []);
  const nomDe = useCallback((id: string | null | undefined) => (id ? (personnes.find((p) => p.user_id === id)?.nom ?? id.slice(0, 8)) : "—"), [personnes]);

  /* ——— la liste ——— */
  const lignes: Ligne[] = useMemo(() => {
    if (source === "exemple") {
      return local.map((c) => ({
        dossier: c.dossier,
        clair: c.clair,
        aConfirmer: c.delais.filter((t) => t.statut === "a_confirmer").length,
        prochaine: c.delais.filter(delaiCourt).map((t) => t.echeance_retenue).sort()[0] ?? null,
        audience: c.audiences.filter((a) => a.statut === "prevue" && new Date(a.date_heure) >= new Date()).map((a) => a.date_heure).sort()[0] ?? null,
        responsable: c.dossier.responsable_id,
      }));
    }
    if (!cabinet) return [];
    return cabinet.dossiers.map((d) => {
      const delais = cabinet.delais.filter((t) => t.dossier_id === d.id);
      return {
        dossier: d,
        clair: clairs[d.id] ?? null,
        aConfirmer: delais.filter((t) => t.statut === "a_confirmer").length,
        prochaine: delais.filter(delaiCourt).map((t) => t.echeance_retenue).sort()[0] ?? null,
        audience: cabinet.audiences.filter((a) => a.dossier_id === d.id && a.statut === "prevue" && new Date(a.date_heure) >= new Date()).map((a) => a.date_heure).sort()[0] ?? null,
        responsable: d.responsable_id,
      };
    });
  }, [source, local, cabinet, clairs]);

  const compteurs = useMemo(() => {
    const c: Record<Filtre, number> = { a_confirmer: 0, proches: 0, audiences: 0, ouverts: 0, clos: 0 };
    for (const l of lignes) {
      c.a_confirmer += l.aConfirmer;
      if (l.prochaine && joursAvant(l.prochaine) <= 15) c.proches++;
      if (l.audience && joursAvant(l.audience) <= 30) c.audiences++;
      if (["ouvert", "audit", "attente"].includes(l.dossier.statut)) c.ouverts++;
      if (l.dossier.statut === "clos") c.clos++;
    }
    return c;
  }, [lignes]);

  const visibles = useMemo(() => {
    const l = lignes.filter((x) => {
      if (!filtre) return x.dossier.statut !== "efface";
      if (filtre === "a_confirmer") return x.aConfirmer > 0;
      if (filtre === "proches") return !!x.prochaine && joursAvant(x.prochaine) <= 15;
      if (filtre === "audiences") return !!x.audience && joursAvant(x.audience) <= 30;
      if (filtre === "ouverts") return ["ouvert", "audit", "attente"].includes(x.dossier.statut);
      return x.dossier.statut === "clos";
    });
    const rang = (x: Ligne) => (x.dossier.statut === "clos" || x.dossier.statut === "refuse" ? 3 : x.aConfirmer ? 0 : x.prochaine ? 1 : 2);
    return [...l].sort((a, b) => {
      const ra = rang(a);
      const rb = rang(b);
      if (ra !== rb) return ra - rb;
      if (a.prochaine && b.prochaine && a.prochaine !== b.prochaine) return a.prochaine < b.prochaine ? -1 : 1;
      return new Date(b.dossier.cree_le).getTime() - new Date(a.dossier.cree_le).getTime();
    });
  }, [lignes, filtre]);

  const choisi = choix && visibles.some((x) => x.dossier.id === choix) ? choix : (visibles[0]?.dossier.id ?? null);
  const ligne = visibles.find((x) => x.dossier.id === choisi) ?? null;

  /* ——— le dossier ouvert ——— */
  const complet: DossierComplet | null = useMemo(() => {
    if (!choisi) return null;
    if (source === "exemple") return local.find((c) => c.dossier.id === choisi) ?? null;
    return complets[choisi] ?? null;
  }, [source, local, complets, choisi]);

  const ouvrirReel = useCallback(
    async (d: Dossier) => {
      if (!cabinet) return;
      const k = cabinet.cles.find((c) => c.dossier_id === d.id && c.statut === "active") ?? null;
      const c = await chargerDossier(d, k, ["attente", "ouvert", "audit", "clos"].includes(d.statut));
      let cle = trousseau.current.lire(d.id);
      /* au coffre : la clé vient de la fonction tamila-coffre (un déballage journalisé) */
      if (!cle && (k?.fournisseur === "scaleway" || (!k && auCoffre))) {
        try {
          cle = await cleParCoffre(d.id);
        } catch (e) {
          setErreur(e instanceof Error ? e.message : "Le coffre n'a pas répondu.");
        }
      }
      /* sous la phrase : l'enveloppe lue dans tamila_cles (associés), sinon rendue par tamila_cle_dossier (membres, b4_03) */
      if (!cle && k?.fournisseur !== "scaleway" && phrase) {
        const enveloppe = k?.enveloppe ?? (await cleDossier(d.id));
        cle = enveloppe ? await trousseau.current.ouvrir(d.id, enveloppe, phrase) : null;
      }
      setClesOuvertes((prev) => ({ ...prev, [d.id]: cle }));
      if (cle) {
        const [reference, intitule, numero_rg] = await Promise.all([dechiffrer(cle, d.reference_chiffree), dechiffrer(cle, d.intitule_chiffre), dechiffrer(cle, d.numero_rg_chiffre)]);
        c.clair = reference !== null && intitule !== null ? { reference, intitule, numero_rg } : null;
        setClairs((prev) => ({ ...prev, [d.id]: c.clair }));
        for (const p of c.parties) {
          const nom = await dechiffrer(cle, p.nom_chiffre);
          const courriels = await dechiffrer(cle, p.courriels_chiffres);
          if (nom !== null) c.partiesClair[p.id] = { nom, courriels };
        }
      }
      setComplets((prev) => ({ ...prev, [d.id]: c }));
    },
    [cabinet, phrase, auCoffre, cleParCoffre],
  );

  /* la clé d'un dossier pour y chiffrer une pièce reçue : trousseau, puis coffre, puis phrase */
  const cleDe = useCallback(
    async (id: string): Promise<CryptoKey | null> => {
      const deja = trousseau.current.lire(id);
      if (deja || !cabinet) return deja;
      const k = cabinet.cles.find((c) => c.dossier_id === id && c.statut === "active") ?? null;
      if (k?.fournisseur === "scaleway" || (!k && auCoffre)) return cleParCoffre(id);
      if (!phrase) return null;
      const enveloppe = k?.enveloppe ?? (await cleDossier(id));
      return enveloppe ? trousseau.current.ouvrir(id, enveloppe, phrase) : null;
    },
    [cabinet, phrase, auCoffre, cleParCoffre],
  );

  /* un avis rattaché : le dossier s'ouvre, relu (sa nouvelle pièce) */
  const avisRattache = useCallback((id: string) => {
    setFiltre(null);
    setChoix(id);
    if (source === "reelle") {
      setComplets((prev) => {
        const r = { ...prev };
        delete r[id];
        return r;
      });
    }
  }, [source]);

  useEffect(() => {
    if (source !== "reelle" || !ligne || !cabinet || complets[ligne.dossier.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeDossier(true);
      try {
        await ouvrirReel(ligne.dossier);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le dossier n'a pas pu être lu.");
      } finally {
        if (actif) setChargeDossier(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, ligne, cabinet, complets, ouvrirReel]);

  const relireDossier = useCallback(async () => {
    if (!ligne) return;
    const c = await chargerCabinet();
    setCabinet(c);
    const frais = c.dossiers.find((d) => d.id === ligne.dossier.id);
    if (frais) {
      const k = c.cles.find((x) => x.dossier_id === frais.id && x.statut === "active") ?? null;
      const comp = await chargerDossier(frais, k, false);
      const prec = complets[frais.id];
      const cle = trousseau.current.lire(frais.id);
      comp.consulteJusqu = prec?.consulteJusqu ?? null;
      comp.clair = prec?.clair ?? null;
      if (cle) {
        for (const p of comp.parties) {
          const nom = await dechiffrer(cle, p.nom_chiffre);
          const courriels = await dechiffrer(cle, p.courriels_chiffres);
          if (nom !== null) comp.partiesClair[p.id] = { nom, courriels };
        }
      }
      setComplets((prev) => ({ ...prev, [frais.id]: comp }));
    } else {
      setComplets((prev) => {
        const n = { ...prev };
        delete n[ligne.dossier.id];
        return n;
      });
    }
  }, [ligne, complets]);

  const remplacerLocal = useCallback((c: DossierComplet) => {
    setLocal((prev) => prev.map((x) => (x.dossier.id === c.dossier.id ? c : x)));
  }, []);

  /* ——— la phrase du cabinet ——— */
  const poserPhrase = () => {
    const p = saisiePhrase.trim();
    if (p.length < 8) return;
    memoriserPhrase(p);
    setPhrase(p);
    trousseau.current.vider();
    setClairs({});
    setComplets({});
    setClesOuvertes({});
    setFormPhrase(false);
    setSaisiePhrase("");
  };
  const oublierPhrase = () => {
    memoriserPhrase(null);
    setPhrase(null);
    trousseau.current.vider();
    setClairs({});
    setComplets({});
    setClesOuvertes({});
    setFormPhrase(false);
  };

  /* ——— nouveau dossier ——— */
  const [formNouveau, setFormNouveau] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const [nv, setNv] = useState({ reference: "", intitule: "", numero_rg: "", matiere: "civil", juridiction: "", territoire: "metropole", mode: "contentieux" as "contentieux" | "dommage_corporel", responsable: "", audit_fin: "", phrase: "" });
  const ouvrirNouveau = () => {
    setErreurForm(null);
    setNv({ reference: "", intitule: "", numero_rg: "", matiere: "civil", juridiction: "", territoire: "metropole", mode: "contentieux", responsable: moi?.user_id ?? "", audit_fin: "", phrase: "" });
    setFormNouveau(true);
  };
  const nouveauOk = nv.reference.trim().length >= 2 && nv.intitule.trim().length >= 3 && (source === "exemple" || auCoffre || !!phrase || nv.phrase.trim().length >= 8);
  const soumettreNouveau = async () => {
    if (!nouveauOk) return;
    setEnvoi(true);
    setErreurForm(null);
    try {
      let id = crypto.randomUUID();
      const quand = new Date().toISOString();
      if (source === "reelle") {
        if (!cabinet?.moi.client_id) throw new Error("Aucun compte rattaché à cette session.");
        let cle: CryptoKey;
        let fournisseur: "local" | "scaleway" = "local";
        let p_cle_reference = `cabinet:${cabinet.moi.client_id}:${id}`;
        let enveloppe: Promise<string>;
        if (auCoffre) {
          /* le coffre tire l'identifiant du dossier et sa clé, enveloppée sous la clé maître du cabinet */
          const n = await coffre<{ dossier: string; reference: string; enveloppe: string; cle: string }>("nouvelle_cle", { client: cabinet.moi.client_id });
          id = n.dossier;
          cle = await importerCle(n.cle);
          fournisseur = "scaleway";
          p_cle_reference = n.reference;
          enveloppe = Promise.resolve(`\\x${n.enveloppe}`);
        } else {
          const ph = phrase ?? nv.phrase.trim();
          if (!phrase) {
            memoriserPhrase(ph);
            setPhrase(ph);
          }
          cle = await genererCle();
          enveloppe = envelopper(cle, ph);
        }
        const [p_reference, p_intitule, p_numero_rg, p_cle_enveloppe] = await Promise.all([
          chiffrer(cle, nv.reference.trim()),
          chiffrer(cle, nv.intitule.trim()),
          nv.numero_rg.trim() ? chiffrer(cle, nv.numero_rg.trim()) : Promise.resolve(null),
          enveloppe,
        ]);
        await creerDossier({
          p_client: cabinet.moi.client_id, p_dossier: id, p_reference, p_intitule, p_cle_fournisseur: fournisseur, p_cle_reference, p_cle_enveloppe,
          p_numero_rg, p_matiere: nv.matiere || null, p_juridiction: nv.juridiction.trim() || null, p_territoire: nv.territoire || null, p_mode: nv.mode, p_perso: false,
          p_audit_fin: nv.audit_fin || null, p_responsable: nv.responsable || null,
        });
        trousseau.current.poser(id, cle);
        setClesOuvertes((prev) => ({ ...prev, [id]: cle }));
        setClairs((prev) => ({ ...prev, [id]: { reference: nv.reference.trim(), intitule: nv.intitule.trim(), numero_rg: nv.numero_rg.trim() || null } }));
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        const statut = nv.audit_fin ? "audit" : "ouvert";
        setLocal((prev) => [
          {
            dossier: { id, client_id: EXEMPLE_CLIENT, entite_id: "00000000-0000-4000-8000-0000000000e1", reference_chiffree: "\\x01" + "00".repeat(28), intitule_chiffre: "\\x01" + "00".repeat(28), numero_rg_chiffre: nv.numero_rg ? "\\x01" + "00".repeat(28) : null, matiere: nv.matiere, juridiction: nv.juridiction || null, territoire: nv.territoire as Dossier["territoire"], mode: nv.mode, statut, perso: false, proprietaire_perso: null, responsable_id: nv.responsable || MOI, cree_le: quand, cree_par: MOI, demande_ouverture_id: null, ouvert_le: quand, ouvert_par: MOI, audit_fin_le: nv.audit_fin ? `${nv.audit_fin}T23:59:59` : null, clos_le: null, demande_cloture_id: null, statut_avant_cloture: null, effacement_prevu_le: null, efface_le: null, motif_effacement: null },
            clair: { reference: nv.reference.trim(), intitule: nv.intitule.trim(), numero_rg: nv.numero_rg.trim() || null },
            cle: null, parties: [], partiesClair: {}, appel: null, delais: [], audiences: [], avis: [],
            membres: [{ id: `${id}-m1`, client_id: EXEMPLE_CLIENT, dossier_id: id, user_id: nv.responsable || MOI, role_dossier: "responsable", jusqu_au: null, ajoute_par: MOI, ajoute_le: quand }],
            murailles: [], exports: [], pieces: [], lectures: [], demandes: [], consulteJusqu: null,
          },
          ...prev,
        ]);
      }
      setChoix(id);
      setFiltre(null);
      setFait(`Le dossier ${nv.reference.trim()} est ouvert, chiffré avec sa propre clé.`);
      setFormNouveau(false);
    } catch (e) {
      setErreurForm(e instanceof Error ? e.message : "La base a refusé l'ouverture.");
    } finally {
      setEnvoi(false);
    }
  };

  const installerTamila = async () => {
    if (!cabinet?.moi.client_id) return;
    setEnvoi(true);
    try {
      await installer(cabinet.moi.client_id);
      await relire();
      setFait("Tamila est installé : réglages posés, règles de validation en place.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'installation a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— le coffre à clés ——— */
  const [formCoffre, setFormCoffre] = useState(false);
  const [coffreEnCours, setCoffreEnCours] = useState<{ fait: number; total: number } | null>(null);
  const [coffreEchecs, setCoffreEchecs] = useState<string[]>([]);
  const [erreurCoffre, setErreurCoffre] = useState<string | null>(null);
  /* les dossiers que le coffre renvoie à la phrase (bascule en cours) : plus proposés à la lecture par le coffre */
  const [sousLaPhrase, setSousLaPhrase] = useState<Record<string, true>>({});
  const associe = estAssocie(moi);
  const gerant = estGerant(moi);

  const activerCoffre = async () => {
    setErreurCoffre(null);
    setEnvoi(true);
    try {
      if (source === "exemple") {
        await new Promise((r) => setTimeout(r, 350));
        setCoffreExemple((c) => ({ ...c, statut: "bascule", region: "fr-par" }));
      } else {
        if (!cabinet?.moi.client_id) throw new Error("Aucun compte rattaché à cette session.");
        await coffre("activer", { client: cabinet.moi.client_id });
        await relire();
      }
      setFait("Le coffre Scaleway du cabinet est activé : les nouveaux dossiers y prennent leur clé.");
    } catch (e) {
      setErreurCoffre(e instanceof Error ? e.message : "Le coffre n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  /* la clé de chaque dossier encore sous la phrase, déballée ici, ré-enveloppée au coffre ; aucune pièce n'est touchée */
  const reenvelopperTout = async () => {
    setErreurCoffre(null);
    setCoffreEchecs([]);
    if (source === "exemple") {
      const total = coffreExemple.dossiers_locaux;
      for (let i = 1; i <= total; i++) {
        setCoffreEnCours({ fait: i, total });
        await new Promise((r) => setTimeout(r, 120));
      }
      setCoffreExemple((c) => ({ ...c, statut: "scaleway", dossiers_locaux: 0, dossiers_scaleway: c.dossiers_scaleway + c.dossiers_locaux }));
      setCoffreEnCours(null);
      setFait("Toutes les clés du cabinet sont au coffre Scaleway. La phrase n'est plus nécessaire.");
      return;
    }
    if (!cabinet || !phrase) return;
    const locales = cabinet.cles.filter((k) => k.statut === "active" && k.fournisseur === "local");
    const echecs: string[] = [];
    for (let i = 0; i < locales.length; i++) {
      const k = locales[i];
      setCoffreEnCours({ fait: i + 1, total: locales.length });
      const nom = clairs[k.dossier_id]?.reference ?? `dossier ${k.dossier_id.slice(0, 8)}`;
      try {
        const cle = await trousseau.current.ouvrir(k.dossier_id, k.enveloppe, phrase);
        if (!cle) {
          echecs.push(`${nom} : la phrase ne l'ouvre pas`);
          continue;
        }
        await coffre("reenvelopper", { dossier: k.dossier_id, cle: await exporterCle(cle) });
      } catch (e) {
        echecs.push(`${nom} : ${e instanceof Error ? e.message : "refusé"}`);
      }
    }
    setCoffreEnCours(null);
    setCoffreEchecs(echecs);
    await relire();
    if (!echecs.length) setFait(`${locales.length} dossier${locales.length > 1 ? "s" : ""} ré-enveloppé${locales.length > 1 ? "s" : ""} au coffre Scaleway, sans toucher aux pièces.`);
  };

  /* au coffre, les références de la liste se lisent à la demande : une ouverture de clé journalisée par dossier */
  const aLireParCoffre = source === "reelle" && cabinet && auCoffre
    ? cabinet.dossiers.filter((d) => {
        const k = cabinet.cles.find((c) => c.dossier_id === d.id && c.statut === "active");
        return !clairs[d.id] && !sousLaPhrase[d.id] && (k ? k.fournisseur === "scaleway" : true) && ["attente", "ouvert", "audit", "clos"].includes(d.statut);
      })
    : [];
  const lireListeParCoffre = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      for (const d of aLireParCoffre) {
        const cle = trousseau.current.lire(d.id) ?? (await cleParCoffre(d.id));
        if (!cle) {
          setSousLaPhrase((prev) => ({ ...prev, [d.id]: true }));
          continue;
        }
        const [reference, intitule, numero_rg] = await Promise.all([dechiffrer(cle, d.reference_chiffree), dechiffrer(cle, d.intitule_chiffre), dechiffrer(cle, d.numero_rg_chiffre)]);
        if (reference !== null && intitule !== null) setClairs((prev) => ({ ...prev, [d.id]: { reference, intitule, numero_rg } }));
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le coffre n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const avocats = personnes.filter((p) => ["gerant", "admin", "valideur"].includes(p.role));
  const estAvocatDuCabinet = !!moi && ["gerant", "admin", "valideur"].includes(moi.role);
  const dossiersHonoraires = useMemo(() => lignes.map((x) => ({ dossier: x.dossier, clair: x.clair })), [lignes]);
  const reglages = source === "exemple" ? REGLAGES_EXEMPLE : (cabinet?.reglages ?? null);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Dossiers du cabinet</h1>
          <p className="esp-sous">
            Chaque dossier est chiffré avec sa propre clé ; les délais de procédure se calculent selon la cour et le domicile des parties, et un avocat les confirme. Ce qui presse est en tête.
          </p>
        </div>
        <div className="esp-item-haut">
          {source === "reelle" ? (
            <button type="button" className={`r-btn r-btn--fil tam-phrase${phrase ? "" : " tam-phrase--fermee"}`} onClick={() => setFormPhrase(true)} title={phrase ? "Phrase du cabinet mémorisée pour cet onglet" : "Sans la phrase, les dossiers restent chiffrés"}>
              {phrase ? <Unlock width={15} height={15} aria-hidden="true" /> : <Lock width={15} height={15} aria-hidden="true" />} {phrase ? "Phrase mémorisée" : "Phrase du cabinet"}
            </button>
          ) : null}
          {etat && associe ? (
            <button type="button" className={`r-btn r-btn--fil tam-coffre${auCoffre ? " tam-coffre--actif" : ""}`} onClick={() => { setErreurCoffre(null); setCoffreEchecs([]); setFormCoffre(true); }}>
              <ShieldCheck width={15} height={15} aria-hidden="true" /> {etat.statut === "scaleway" ? "Coffre Scaleway" : etat.statut === "bascule" ? "Coffre : bascule" : "Coffre à clés"}
            </button>
          ) : null}
          {estAvocatDuCabinet && (source === "exemple" || cabinet?.installe) ? (
            <button type="button" className="r-btn r-btn--fil" onClick={() => setTableauHonoraires(true)}>
              <Scale width={15} height={15} aria-hidden="true" /> Honoraires du cabinet
            </button>
          ) : null}
          <button type="button" className="r-btn r-btn--noir" onClick={ouvrirNouveau} disabled={source === "reelle" && (!cabinet?.installe || !moi || moi.role === "lecteur")}>
            <FolderPlus width={15} height={15} aria-hidden="true" /> Nouveau dossier
          </button>
          <Ruban source={source} />
        </div>
      </div>

      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis></div> : null}
      {source === "reelle" && cabinet && !cabinet.installe && cabinet.moi.user_id ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="ambre">
            <strong>Tamila n&apos;est pas installé pour ce cabinet.</strong> L&apos;installation pose les réglages et trois règles de validation (clôture par un associé, levée de muraille par le gérant, confirmation d&apos;un délai par un avocat).
            {cabinet.moi.role === "gerant" ? (
              <div className="esp-actions" style={{ marginTop: 8 }}><button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi} onClick={installerTamila}>Installer Tamila</button></div>
            ) : (
              <> Seul un gérant l&apos;installe.</>
            )}
          </Avis>
        </div>
      ) : null}
      {aLireParCoffre.length ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="bleu">
            <strong>Les clés de ce cabinet sont au coffre Scaleway.</strong> Un dossier se déchiffre quand vous l&apos;ouvrez ; chaque clé remise par le coffre est journalisée (qui, quand, quel dossier).
            <div className="esp-actions" style={{ marginTop: 8 }}>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={envoi} onClick={lireListeParCoffre}>
                {envoi ? <Loader variant="spin" /> : null} Lire les références de la liste ({aLireParCoffre.length} ouverture{aLireParCoffre.length > 1 ? "s" : ""} de clé)
              </button>
            </div>
          </Avis>
        </div>
      ) : null}
      {source === "reelle" && cabinet && !phrase && !auCoffre && cabinet.dossiers.length ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="bleu">
            <strong>Les dossiers sont chiffrés.</strong> Tapez la phrase du cabinet pour lire les références, intitulés et noms des parties ; elle reste dans cet onglet et n&apos;est jamais envoyée.
            {cabinet.cles.length === 0 ? <> Les clés ne sont lisibles que par les associés : sans elles, les dossiers restent chiffrés pour vous.</> : null}
          </Avis>
        </div>
      ) : null}
      {source === "reelle" && cabinet?.horsVue ? (
        <div style={{ marginBottom: 14 }}><Avis teinte="gris">{cabinet.horsVue} dossier{cabinet.horsVue > 1 ? "s" : ""} du cabinet {cabinet.horsVue > 1 ? "sont" : "est"} hors de votre vue (muraille ou périmètre) : compté, jamais lu.</Avis></div>
      ) : null}

      {source === "exemple" || (cabinet?.installe && moi && moi.role !== "lecteur") ? (
        <AvisEntrantsTamila
          key={source}
          source={source}
          clientId={source === "exemple" ? EXEMPLE_CLIENT : (cabinet?.moi.client_id ?? "")}
          dossiers={lignes.filter((x) => ["attente", "ouvert", "audit"].includes(x.dossier.statut)).map((x) => ({ dossier: x.dossier, clair: x.clair }))}
          cleDe={cleDe}
          avocat={!!moi && ["gerant", "admin", "valideur"].includes(moi.role)}
          onRattache={avisRattache}
        />
      ) : null}

      <div className="esp-kpis tam-kpis" data-arrivee="">
        {FILTRES.map((f) => (
          <button key={f.cle} type="button" className="esp-kpi" data-teinte={compteurs[f.cle] ? f.teinte : undefined} aria-pressed={filtre === f.cle} onClick={() => setFiltre(filtre === f.cle ? null : f.cle)}>
            <span className="esp-kpi-etiquette">{f.libelle}</span>
            <span className="esp-kpi-valeur">{compteurs[f.cle]}</span>
            <span className="esp-kpi-sous">{f.sous}</span>
          </button>
        ))}
      </div>

      <div className="esp-grille esp-grille--large">
        <section className="esp-carte" aria-label="Dossiers">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre ? FILTRES.find((f) => f.cle === filtre)?.libelle : "Tous les dossiers"}</h2>
            <span className="esp-kpi-sous">{visibles.length} dossier{visibles.length > 1 ? "s" : ""}</span>
          </div>
          {source === "reelle" && !cabinet ? (
            <Chargement texte="Lecture des dossiers…" />
          ) : visibles.length === 0 ? (
            <Vide titre="Aucun dossier">{filtre ? "Rien dans cette famille." : source === "reelle" ? "Aucun dossier ne vous est ouvert. Ouvrez-en un, ou demandez à un responsable de vous y ajouter." : "Aucun dossier."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Dossiers du cabinet">
              {visibles.map((x) => {
                const s = STATUTS_DOSSIER[x.dossier.statut];
                const jours = x.prochaine ? joursAvant(x.prochaine) : null;
                return (
                  <li key={x.dossier.id}>
                    <button
                      type="button"
                      aria-current={choisi === x.dossier.id ? "true" : undefined}
                      className="esp-item"
                      onClick={() => {
                        setChoix(x.dossier.id);
                        if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <span className="esp-mono" style={{ fontWeight: 600 }}>{x.clair?.reference ?? "Chiffré"}</span>
                        <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                        {x.aConfirmer ? <Pastille teinte="ambre">{x.aConfirmer} à confirmer</Pastille> : null}
                        {jours !== null && jours < 0 ? <Pastille teinte="rouge">Dépassé</Pastille> : jours !== null && jours <= 15 ? <Pastille teinte="rouge">J{jours === 0 ? "" : `-${jours}`}</Pastille> : null}
                      </span>
                      <span className="esp-item-titre">
                        {x.clair?.intitule ?? "Intitulé chiffré"}
                        {x.dossier.matiere ? ` · ${libelleMatiere(x.dossier.matiere)}` : ""}
                      </span>
                      <span className="esp-item-bas">
                        <span>{x.dossier.juridiction ?? libelleTerritoire(x.dossier.territoire)}</span>
                        {x.prochaine ? <span className="esp-item-echeance" data-retard={jours !== null && jours < 0} data-proche={jours !== null && jours >= 0 && jours <= 15}>Échéance {dateCourte(x.prochaine)}</span> : null}
                        {x.audience ? <span>Audience {dateCourte(x.audience)}</span> : null}
                        <span>{nomDe(x.responsable)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="esp-dossier" className="esp-detail-mobile" aria-label="Dossier ouvert">
          {complet ? (
            <DossierTamila
              key={complet.dossier.id}
              complet={complet}
              source={source}
              moi={moi}
              personnes={personnes}
              regles={regles}
              reglages={reglages}
              cle={clesOuvertes[complet.dossier.id] ?? null}
              clientId={source === "exemple" ? EXEMPLE_CLIENT : (cabinet?.moi.client_id ?? "")}
              onLocal={remplacerLocal}
              relire={relireDossier}
              referenceDe={(id) => (source === "exemple" ? (local.find((c) => c.dossier.id === id)?.clair?.reference ?? null) : (clairs[id]?.reference ?? null))}
            />
          ) : chargeDossier || (source === "reelle" && ligne) ? (
            <div className="esp-carte"><Chargement texte="Lecture du dossier…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un dossier">Les parties, les délais calculés, les audiences et les décisions s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>

      {tableauHonoraires ? (
        <HonorairesCabinet
          ouvert
          onFermer={() => setTableauHonoraires(false)}
          source={source}
          clientId={source === "exemple" ? EXEMPLE_CLIENT : (cabinet?.moi.client_id ?? "")}
          dossiers={dossiersHonoraires}
          nomDe={nomDe}
          onOuvrir={(id) => { setFiltre(null); setChoix(id); }}
        />
      ) : null}

      {/* ——— le coffre à clés ——— */}
      <Dialog open={formCoffre} onOpenChange={(o) => !o && !coffreEnCours && setFormCoffre(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Le coffre à clés du cabinet</DialogTitle>
            <DialogDescription>Une clé maître par cabinet, chez Scaleway (France), qui ne sort jamais du coffre. Elle enveloppe la clé de chaque dossier ; le serveur la déballe pour qui voit le dossier et pour la lecture des pièces, et journalise chaque remise.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {etat ? (
                <dl className="tam-coffre-etat">
                  <div><dt>État</dt><dd>{etat.statut === "scaleway" ? <Pastille teinte="vert">Toutes les clés au coffre</Pastille> : etat.statut === "bascule" ? <Pastille teinte="ambre">Bascule en cours</Pastille> : <Pastille teinte="gris">Phrase du cabinet</Pastille>}</dd></div>
                  <div><dt>Sous la phrase</dt><dd>{etat.dossiers_locaux} dossier{etat.dossiers_locaux > 1 ? "s" : ""}</dd></div>
                  <div><dt>Au coffre</dt><dd>{etat.dossiers_scaleway} dossier{etat.dossiers_scaleway > 1 ? "s" : ""}{etat.region ? ` · ${etat.region === "fr-par" ? "Paris" : etat.region}` : ""}</dd></div>
                </dl>
              ) : null}
              {etat?.statut === "local" ? (
                gerant ? (
                  <Avis teinte="bleu">Activer le coffre crée la clé maître du cabinet chez Scaleway. Les nouveaux dossiers y prennent leur clé ; ceux qui existent restent sous la phrase jusqu&apos;à leur ré-enveloppement, que vous lancez ensuite.</Avis>
                ) : (
                  <Avis teinte="gris">Seul le gérant active le coffre du cabinet.</Avis>
                )
              ) : null}
              {etat?.statut === "bascule" ? (
                source === "reelle" && !phrase ? (
                  <Avis teinte="ambre">Pour ré-envelopper les dossiers encore sous la phrase, tapez d&apos;abord la phrase du cabinet : chaque clé est déballée ici, puis confiée au coffre.</Avis>
                ) : (
                  <Avis teinte="bleu">Chaque clé est déballée dans votre navigateur avec la phrase, vérifiée par le coffre sur le dossier, puis enveloppée sous la clé maître. La clé ne change pas : aucune pièce n&apos;est déchiffrée ni re-chiffrée. Les pièces qui attendaient une lecture repartent au lecteur.</Avis>
                )
              ) : null}
              {etat?.statut === "scaleway" ? <Avis teinte="vert">Toutes les clés du cabinet sont au coffre : la phrase n&apos;est plus nécessaire pour lire un dossier.</Avis> : null}
              {coffreEnCours ? (
                <div className="tam-coffre-progres" role="status" aria-live="polite">
                  <Loader variant="spin" /> Ré-enveloppement : {coffreEnCours.fait} sur {coffreEnCours.total}
                  <progress max={coffreEnCours.total} value={coffreEnCours.fait} aria-label="Avancement du ré-enveloppement" />
                </div>
              ) : null}
              {coffreEchecs.length ? (
                <Avis teinte="ambre" role="alert">
                  <strong>{coffreEchecs.length} dossier{coffreEchecs.length > 1 ? "s" : ""} reste{coffreEchecs.length > 1 ? "nt" : ""} sous la phrase.</strong> Un dossier que vous ne voyez pas (clientèle personnelle, muraille) se ré-enveloppe par son responsable.
                  <ul className="tam-coffre-echecs">{coffreEchecs.map((x) => <li key={x}>{x}</li>)}</ul>
                </Avis>
              ) : null}
              {erreurCoffre ? <Avis teinte="rouge" role="alert">{erreurCoffre}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" disabled={!!coffreEnCours} onClick={() => setFormCoffre(false)}>Fermer</button>
            {etat?.statut === "local" && gerant ? (
              <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={activerCoffre}>{envoi ? <Loader variant="spin" /> : null} Passer au coffre Scaleway</button>
            ) : null}
            {etat?.statut === "bascule" ? (
              <button type="button" className="r-btn r-btn--noir" disabled={!!coffreEnCours || (source === "reelle" && !phrase) || etat.dossiers_locaux === 0} onClick={reenvelopperTout}>
                Ré-envelopper {etat.dossiers_locaux} dossier{etat.dossiers_locaux > 1 ? "s" : ""}
              </button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— la phrase du cabinet ——— */}
      <Dialog open={formPhrase} onOpenChange={(o) => !o && setFormPhrase(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><KeyRound width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>La phrase du cabinet</DialogTitle>
            <DialogDescription>Elle déballe la clé de chaque dossier dans votre navigateur. Elle reste dans cet onglet, n&apos;est jamais envoyée, et le serveur ne peut rien lire sans elle.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {phrase ? <Avis teinte="vert">Une phrase est mémorisée pour cet onglet. Vous pouvez la remplacer ou l&apos;oublier.</Avis> : null}
              <label className="rv-libelle">Phrase <span className="esp-obligatoire">(huit caractères au moins)</span>
                <input className="rv-champ" type="password" autoComplete="off" value={saisiePhrase} onChange={(e) => setSaisiePhrase(e.target.value)} onKeyDown={(e) => e.key === "Enter" && poserPhrase()} />
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            {phrase ? <button type="button" className="r-btn r-btn--fil" onClick={oublierPhrase}>Oublier la phrase</button> : null}
            <button type="button" className="r-btn r-btn--noir" disabled={saisiePhrase.trim().length < 8} onClick={poserPhrase}>Mémoriser pour cet onglet</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— nouveau dossier ——— */}
      <Dialog open={formNouveau} onOpenChange={(o) => !o && setFormNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FolderPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Ouvrir un dossier</DialogTitle>
            <DialogDescription>{auCoffre ? "Une clé est tirée par le coffre Scaleway du cabinet ; référence, intitulé et n° RG sont chiffrés dans votre navigateur avant de partir. Le socle ne voit que des octets." : "Une clé est tirée dans votre navigateur ; référence, intitulé et n° RG sont chiffrés avant de partir. Le socle ne voit que des octets."}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Référence du cabinet <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nv.reference} onChange={(e) => setNv({ ...nv, reference: e.target.value })} placeholder="2026-0431" />
                </label>
                <label className="rv-libelle">N° RG
                  <input className="rv-champ" value={nv.numero_rg} onChange={(e) => setNv({ ...nv, numero_rg: e.target.value })} placeholder="26/01234" />
                </label>
              </div>
              <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={nv.intitule} onChange={(e) => setNv({ ...nv, intitule: e.target.value })} placeholder="Demandeur c/ Défendeur" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Matière
                  <select className="rv-champ" value={nv.matiere} onChange={(e) => setNv({ ...nv, matiere: e.target.value })}>
                    {MATIERES.map((m) => <option key={m} value={m}>{libelleMatiere(m)}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Mode
                  <select className="rv-champ" value={nv.mode} onChange={(e) => setNv({ ...nv, mode: e.target.value as "contentieux" | "dommage_corporel" })}>
                    <option value="contentieux">Contentieux</option>
                    <option value="dommage_corporel">Dommage corporel</option>
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Juridiction
                  <input className="rv-champ" value={nv.juridiction} onChange={(e) => setNv({ ...nv, juridiction: e.target.value })} placeholder="Cour d'appel de Paris" />
                </label>
                <label className="rv-libelle">Siège de la cour (son calendrier proroge les délais)
                  <select className="rv-champ" value={nv.territoire} onChange={(e) => setNv({ ...nv, territoire: e.target.value })}>
                    {TERRITOIRES.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Avocat responsable
                  <select className="rv-champ" value={nv.responsable} onChange={(e) => setNv({ ...nv, responsable: e.target.value })}>
                    {moi?.role === "collaborateur" ? <option value="">Choisir…</option> : null}
                    {avocats.map((p) => <option key={p.user_id} value={p.user_id}>{p.nom}</option>)}
                  </select>
                </label>
                {estAssocie(moi) ? (
                  <label className="rv-libelle">Audit : fin le (vide pour un dossier ordinaire)
                    <input className="rv-champ" type="date" value={nv.audit_fin} onChange={(e) => setNv({ ...nv, audit_fin: e.target.value })} />
                  </label>
                ) : null}
              </div>
              {source === "reelle" && !phrase && !auCoffre ? (
                <label className="rv-libelle">Phrase du cabinet <span className="esp-obligatoire">(obligatoire, huit caractères au moins)</span>
                  <input className="rv-champ" type="password" autoComplete="off" value={nv.phrase} onChange={(e) => setNv({ ...nv, phrase: e.target.value })} />
                  <span className="esp-kpi-sous">La clé du dossier est enveloppée sous cette phrase ; elle sera mémorisée pour cet onglet.</span>
                </label>
              ) : null}
              {moi?.role === "collaborateur" ? <Avis teinte="ambre">Un dossier ouvert par un assistant attend l&apos;accord de son avocat responsable avant toute lecture.</Avis> : null}
              {erreurForm ? <Avis teinte="rouge" role="alert">{erreurForm}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouveauOk || envoi} onClick={soumettreNouveau}>{envoi ? <Loader variant="spin" /> : null} Ouvrir le dossier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
