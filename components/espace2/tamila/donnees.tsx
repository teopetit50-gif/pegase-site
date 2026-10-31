"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les données de TAMILA, partagées par ses sous-pages (30/10/2026)

   Contrainte du découpage (docs/refonte-metiers/DECOUPAGES.md § TAMILA,
   inventaire tamila.md § 0 et § 8.5) : les clés et les textes déchiffrés
   vivaient dans EcranTamila et mouraient avec lui. Ils montent ici, posés
   une fois par app/espace2/tamila/layout : changer de sous-page ne
   redéballe rien (PBKDF2 sous la phrase) et ne rouvre pas le coffre
   (chaque remise est journalisée).

   Ouvrir un dossier écrit en base (consultation, journal, clé) : seule la
   page d'un dossier appelle `ouvrir(id)`. Les listes (vue d'ensemble,
   arrivées, honoraires, pilotage, conformité) lisent le cabinet
   (chargerCabinet) et les clairs déjà connus, jamais chargerDossier.

   Logique reprise d'EcranTamila à l'identique (mêmes portes, même ordre
   trousseau → coffre → phrase) ; EcranTamila reste tel quel sous
   « ?ancien=1 », et ce fournisseur s'y tait.
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSource, type Source } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { Trousseau, chiffrer, dechiffrer, envelopper, exporterCle, genererCle, importerCle, memoriserPhrase, phraseMemorisee } from "@/components/espace/tamila/chiffrement";
import { DOSSIERS_EXEMPLE, EXEMPLE_CLIENT, MOI, PERSONNES_EXEMPLE, REGLAGES_EXEMPLE, REGLES_EXEMPLE } from "@/components/espace/tamila/exemples";
import { delaiCourt, joursAvant, type Moi } from "@/components/espace/tamila/regles";
import { chargerCabinet, chargerDossier, cleDossier, coffre, creerDossier, installer, type Cabinet, type EtatCoffre } from "@/components/espace/tamila/portes";
import type { Audience, Clair, Delai, Dossier, DossierComplet, Personne, RegleProcedure, Reglages } from "@/components/espace/tamila/types";

export type Filtre = "a_confirmer" | "proches" | "audiences" | "ouverts" | "clos";

export const FILTRES: { cle: Filtre; libelle: string; sous: string }[] = [
  { cle: "a_confirmer", libelle: "Délais à confirmer", sous: "par un avocat" },
  { cle: "proches", libelle: "Échéances sous 15 jours", sous: "actes à déposer" },
  { cle: "audiences", libelle: "Audiences à venir", sous: "dans les 30 jours" },
  { cle: "ouverts", libelle: "Dossiers ouverts", sous: "ouverts, audits, en attente" },
  { cle: "clos", libelle: "Dossiers clos", sous: "effacés à l'échéance" },
];

/* une ligne de liste, commune aux deux sources (EcranTamila, B10) */
export type Ligne = {
  dossier: Dossier;
  clair: Clair | null;
  aConfirmer: number;
  prochaine: string | null;
  audience: string | null;
  responsable: string | null;
};

export const dansFiltre = (x: Ligne, filtre: Filtre | null): boolean => {
  if (!filtre) return x.dossier.statut !== "efface";
  if (filtre === "a_confirmer") return x.aConfirmer > 0;
  if (filtre === "proches") return !!x.prochaine && joursAvant(x.prochaine) <= 15;
  if (filtre === "audiences") return !!x.audience && joursAvant(x.audience) <= 30;
  if (filtre === "ouverts") return ["ouvert", "audit", "attente"].includes(x.dossier.statut);
  return x.dossier.statut === "clos";
};

/* rang 0 : un délai à confirmer ; 1 : une échéance courante ; 2 : le reste ; 3 : clos ou refusé (E:226-233) */
export const rangDe = (x: Ligne) => (x.dossier.statut === "clos" || x.dossier.statut === "refuse" ? 3 : x.aConfirmer ? 0 : x.prochaine ? 1 : 2);
export const trier = (l: Ligne[]) =>
  [...l].sort((a, b) => {
    const ra = rangDe(a);
    const rb = rangDe(b);
    if (ra !== rb) return ra - rb;
    if (a.prochaine && b.prochaine && a.prochaine !== b.prochaine) return a.prochaine < b.prochaine ? -1 : 1;
    return new Date(b.dossier.cree_le).getTime() - new Date(a.dossier.cree_le).getTime();
  });

export type NouveauDossierForm = { reference: string; intitule: string; numero_rg: string; matiere: string; juridiction: string; territoire: string; mode: "contentieux" | "dommage_corporel"; responsable: string; audit_fin: string; phrase: string };

type Contexte = {
  source: Source;
  pret: boolean;
  erreur: string | null;
  poserErreur: (e: string | null) => void;
  cabinet: Cabinet | null;
  moi: Moi;
  clientId: string;
  installe: boolean;
  personnes: Personne[];
  regles: RegleProcedure[];
  reglages: Reglages | null;
  nomDe: (id: string | null | undefined) => string;
  lignes: Ligne[];
  compteurs: Record<Filtre, number>;
  delaisCabinet: Delai[];
  audiencesCabinet: Audience[];
  /* le monde d'exemple (le pilotage en lit les pièces et avis) */
  local: DossierComplet[];
  referenceDe: (id: string) => string | null;
  avocat: boolean;
  /* la phrase du cabinet (B15) */
  phrase: string | null;
  poserPhrase: (p: string) => void;
  oublierPhrase: () => void;
  /* le coffre (B4, B14) */
  etat: EtatCoffre | null;
  auCoffre: boolean;
  activerCoffre: () => Promise<string>;
  reenvelopperTout: (progres: (fait: number, total: number) => void) => Promise<{ echecs: string[]; message: string | null }>;
  aLireParCoffre: Dossier[];
  lireListeParCoffre: () => Promise<void>;
  installerTamila: () => Promise<void>;
  creer: (nv: NouveauDossierForm) => Promise<string>;
  /* le dossier ouvert : lu une fois, gardé tant que l'onglet vit */
  complet: (id: string) => DossierComplet | null;
  ouvrir: (id: string) => void;
  enLecture: (id: string) => boolean;
  cle: (id: string) => CryptoKey | null;
  cleDe: (id: string) => Promise<CryptoKey | null>;
  relireDossier: (id: string) => Promise<void>;
  remplacerLocal: (c: DossierComplet) => void;
  oublierDossier: (id: string) => void;
  relire: () => Promise<void>;
};

const TamilaContexte = createContext<Contexte | null>(null);

export function useTamila(): Contexte {
  const c = useContext(TamilaContexte);
  if (!c) throw new Error("useTamila hors de DonneesTamila (app/espace2/tamila/layout)");
  return c;
}

export default function DonneesTamila({ children }: { children: React.ReactNode }) {
  const ancien = useSearchParams().get("ancien") === "1";
  const { source } = useSource();
  const [local, setLocal] = useState<DossierComplet[]>(DOSSIERS_EXEMPLE);
  const [cabinet, setCabinet] = useState<Cabinet | null>(null);
  const [complets, setComplets] = useState<Record<string, DossierComplet>>({});
  const [clairs, setClairs] = useState<Record<string, Clair | null>>({});
  const [clesOuvertes, setClesOuvertes] = useState<Record<string, CryptoKey | null>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [demande, setDemande] = useState<string | null>(null);
  const [lecture, setLecture] = useState<Record<string, true>>({});
  const trousseau = useRef(new Trousseau());
  const [phrase, setPhrase] = useState<string | null>(null);
  const [coffreExemple, setCoffreExemple] = useState<EtatCoffre>({ statut: "local", region: null, dossiers_locaux: DOSSIERS_EXEMPLE.length, dossiers_scaleway: 0 });
  const [sousLaPhrase, setSousLaPhrase] = useState<Record<string, true>>({});
  const reelle = source === "reelle" && !ancien;
  const etat: EtatCoffre | null = source === "exemple" ? coffreExemple : (cabinet?.coffre ?? null);
  const auCoffre = !!etat && etat.statut !== "local";

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
    if (!reelle) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [reelle, charger]);

  const relire = useCallback(async () => {
    try {
      setCabinet(await chargerCabinet());
      setComplets({});
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["tamila_dossiers", "tamila_delais", "tamila_audiences", "demandes_validation"], reelle, relire);

  /* les clairs de la liste : chaque dossier dont la clé se déballe avec la phrase (E:145-172) */
  useEffect(() => {
    if (!reelle || !cabinet || !phrase) return;
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
  }, [reelle, cabinet, phrase, clairs]);

  const moi: Moi = source === "exemple" ? { user_id: MOI, role: "gerant" } : cabinet?.moi.user_id ? { user_id: cabinet.moi.user_id, role: cabinet.moi.role } : null;
  const personnes = useMemo(() => (source === "exemple" ? PERSONNES_EXEMPLE : (cabinet?.personnes ?? [])), [source, cabinet]);
  const regles = source === "exemple" ? REGLES_EXEMPLE : (cabinet?.regles ?? []);
  const nomDe = useCallback((id: string | null | undefined) => (id ? (personnes.find((p) => p.user_id === id)?.nom ?? id.slice(0, 8)) : "—"), [personnes]);

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

  /* ——— le dossier : ouvert à la demande de sa page seulement (E:246-279) ——— */
  const ouvrirReel = useCallback(
    async (d: Dossier) => {
      if (!cabinet) return;
      const k = cabinet.cles.find((c) => c.dossier_id === d.id && c.statut === "active") ?? null;
      const c = await chargerDossier(d, k, ["attente", "ouvert", "audit", "clos"].includes(d.statut));
      let cle = trousseau.current.lire(d.id);
      if (!cle && (k?.fournisseur === "scaleway" || (!k && auCoffre))) {
        try {
          cle = await cleParCoffre(d.id);
        } catch (e) {
          setErreur(e instanceof Error ? e.message : "Le coffre n'a pas répondu.");
        }
      }
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

  useEffect(() => {
    if (!reelle || !demande || !cabinet || complets[demande] || lecture[demande]) return;
    const d = cabinet.dossiers.find((x) => x.id === demande);
    if (!d) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setLecture((p) => ({ ...p, [d.id]: true }));
      try {
        await ouvrirReel(d);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le dossier n'a pas pu être lu.");
      } finally {
        setLecture((p) => {
          const n = { ...p };
          delete n[d.id];
          return n;
        });
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [reelle, demande, cabinet, complets, lecture, ouvrirReel]);

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

  /* relire un dossier ouvert après un geste, sans nouvelle consultation (E:327-354) */
  const relireDossier = useCallback(
    async (id: string) => {
      const c = await chargerCabinet();
      setCabinet(c);
      const frais = c.dossiers.find((d) => d.id === id);
      if (!frais) {
        setComplets((prev) => {
          const n = { ...prev };
          delete n[id];
          return n;
        });
        return;
      }
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
    },
    [complets],
  );

  const oublierDossier = useCallback((id: string) => {
    setComplets((prev) => {
      const r = { ...prev };
      delete r[id];
      return r;
    });
  }, []);

  const remplacerLocal = useCallback((c: DossierComplet) => {
    setLocal((prev) => prev.map((x) => (x.dossier.id === c.dossier.id ? c : x)));
  }, []);

  /* ——— la phrase ——— */
  const viderTout = () => {
    trousseau.current.vider();
    setClairs({});
    setComplets({});
    setClesOuvertes({});
  };
  const poserPhrase = (p: string) => {
    memoriserPhrase(p);
    setPhrase(p);
    viderTout();
  };
  const oublierPhrase = () => {
    memoriserPhrase(null);
    setPhrase(null);
    viderTout();
  };

  /* ——— nouveau dossier (G2, E:394-462) ——— */
  const creer = async (nv: NouveauDossierForm): Promise<string> => {
    let id = crypto.randomUUID();
    const quand = new Date().toISOString();
    if (source === "reelle") {
      if (!cabinet?.moi.client_id) throw new Error("Aucun compte rattaché à cette session.");
      let cle: CryptoKey;
      let fournisseur: "local" | "scaleway" = "local";
      let p_cle_reference = `cabinet:${cabinet.moi.client_id}:${id}`;
      let enveloppe: Promise<string>;
      if (auCoffre) {
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
    return id;
  };

  const installerTamila = async () => {
    if (!cabinet?.moi.client_id) return;
    await installer(cabinet.moi.client_id);
    await relire();
  };

  /* ——— le coffre (G3, G4, G5) ——— */
  const activerCoffre = async () => {
    if (source === "exemple") {
      await new Promise((r) => setTimeout(r, 350));
      setCoffreExemple((c) => ({ ...c, statut: "bascule", region: "fr-par" }));
    } else {
      if (!cabinet?.moi.client_id) throw new Error("Aucun compte rattaché à cette session.");
      await coffre("activer", { client: cabinet.moi.client_id });
      await relire();
    }
    return "Le coffre Scaleway du cabinet est activé : les nouveaux dossiers y prennent leur clé.";
  };

  const reenvelopperTout = async (progres: (fait: number, total: number) => void) => {
    if (source === "exemple") {
      const total = coffreExemple.dossiers_locaux;
      for (let i = 1; i <= total; i++) {
        progres(i, total);
        await new Promise((r) => setTimeout(r, 120));
      }
      setCoffreExemple((c) => ({ ...c, statut: "scaleway", dossiers_locaux: 0, dossiers_scaleway: c.dossiers_scaleway + c.dossiers_locaux }));
      return { echecs: [], message: "Toutes les clés du cabinet sont au coffre Scaleway. La phrase n'est plus nécessaire." };
    }
    if (!cabinet || !phrase) return { echecs: [], message: null };
    const locales = cabinet.cles.filter((k) => k.statut === "active" && k.fournisseur === "local");
    const echecs: string[] = [];
    for (let i = 0; i < locales.length; i++) {
      const k = locales[i];
      progres(i + 1, locales.length);
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
    await relire();
    return { echecs, message: echecs.length ? null : `${locales.length} dossier${locales.length > 1 ? "s" : ""} ré-enveloppé${locales.length > 1 ? "s" : ""} au coffre Scaleway, sans toucher aux pièces.` };
  };

  const aLireParCoffre =
    reelle && cabinet && auCoffre
      ? cabinet.dossiers.filter((d) => {
          const k = cabinet.cles.find((c) => c.dossier_id === d.id && c.statut === "active");
          return !clairs[d.id] && !sousLaPhrase[d.id] && (k ? k.fournisseur === "scaleway" : true) && ["attente", "ouvert", "audit", "clos"].includes(d.statut);
        })
      : [];
  const lireListeParCoffre = async () => {
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
    }
  };

  const cleOuverte = useCallback((id: string) => clesOuvertes[id] ?? null, [clesOuvertes]);
  const delaisCabinet = useMemo(() => (source === "exemple" ? local.flatMap((c) => c.delais) : (cabinet?.delais ?? [])), [source, local, cabinet]);
  const audiencesCabinet = useMemo(() => (source === "exemple" ? local.flatMap((c) => c.audiences) : (cabinet?.audiences ?? [])), [source, local, cabinet]);

  const valeur: Contexte = {
    source,
    pret: source === "exemple" || cabinet !== null,
    erreur,
    poserErreur: setErreur,
    cabinet,
    moi,
    clientId: source === "exemple" ? EXEMPLE_CLIENT : (cabinet?.moi.client_id ?? ""),
    installe: source === "exemple" || !!cabinet?.installe,
    personnes,
    regles,
    reglages: source === "exemple" ? REGLAGES_EXEMPLE : (cabinet?.reglages ?? null),
    nomDe,
    lignes,
    compteurs,
    delaisCabinet,
    audiencesCabinet,
    local,
    referenceDe: (id) => (source === "exemple" ? (local.find((c) => c.dossier.id === id)?.clair?.reference ?? null) : (clairs[id]?.reference ?? null)),
    avocat: !!moi && ["gerant", "admin", "valideur"].includes(moi.role),
    phrase,
    poserPhrase,
    oublierPhrase,
    etat,
    auCoffre,
    activerCoffre,
    reenvelopperTout,
    aLireParCoffre,
    lireListeParCoffre,
    installerTamila,
    creer,
    complet: (id) => (source === "exemple" ? (local.find((c) => c.dossier.id === id) ?? null) : (complets[id] ?? null)),
    ouvrir: setDemande,
    enLecture: (id) => !!lecture[id],
    cle: cleOuverte,
    cleDe,
    relireDossier,
    remplacerLocal,
    oublierDossier,
    relire,
  };
  return <TamilaContexte.Provider value={valeur}>{children}</TamilaContexte.Provider>;
}
