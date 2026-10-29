"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les données de DALIRO, partagées par ses sous-pages (29/10/2026)

   L'écran de /espace tenait tout sur une page : la liste, les tableaux
   chargés, l'exemple modifié en mémoire. Ses sous-pages de l'espace 2
   (chantiers, fiche, à ranger, à faire, avenants, annuaire, équipes,
   réglages) les lisent ici, posé une fois par app/espace2/daliro/layout :
   une action jouée sur l'exemple dans une page se voit dans les autres,
   et un tableau lu en base n'est pas relu à chaque changement de page.

   Mêmes portes que EcranDaliro (components/espace/daliro/portes.ts).
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXEMPLE_CLIENT_ID } from "@/components/espace/exemples/socle";
import { useSource, type Source } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { TABLEAUX_EXEMPLE } from "@/components/espace/daliro/exemples";
import { listeDepuis } from "@/components/espace/daliro/liste";
import { chargerListe, chargerTableau, monClient } from "@/components/espace/daliro/portes";
import type { Chantier, Tableau, Tiers } from "@/components/espace/daliro/types";

type Client = { client_id: string; user_id: string; role: string };
type Reel = { liste: Chantier[]; tableaux: Record<string, Tableau>; client: Client | null };

export type NouveauChantier = {
  nom: string;
  reference: string;
  adresse: string;
  code_postal: string;
  commune: string;
  maitre_ouvrage_type: string;
  place_client: string;
  maitre_ouvrage_id: string;
};

type Contexte = {
  source: Source;
  /* la base réelle a répondu (toujours vrai sur l'exemple) */
  pret: boolean;
  erreur: string | null;
  client: Client | null;
  liste: Chantier[];
  /* le tableau d'un chantier, s'il est lu */
  tableau: (id: string) => Tableau | null;
  /* lire le tableau d'un chantier (base réelle), une fois */
  demander: (id: string) => void;
  /* lire les tableaux de tous les chantiers (avenants, situations, équipes) */
  demanderTous: () => void;
  enLecture: (id: string) => boolean;
  /* un tableau quelconque : l'annuaire, la bibliothèque et les réglages valent pour toute l'entreprise */
  premier: Tableau | null;
  onLocal: (t: Tableau) => void;
  relireChantier: (id: string) => Promise<void>;
  relire: () => Promise<void>;
  quota: number | null;
  maitresOuvrage: Tiers[];
  creer: (f: NouveauChantier) => Promise<string>;
};

const DonneesContexte = createContext<Contexte | null>(null);

export function useDaliro(): Contexte {
  const c = useContext(DonneesContexte);
  if (!c) throw new Error("useDaliro hors de DonneesDaliro (app/espace2/daliro/layout)");
  return c;
}

export default function DonneesDaliro({ children }: { children: React.ReactNode }) {
  const { source } = useSource();
  const [local, setLocal] = useState<Record<string, Tableau>>(TABLEAUX_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<Set<string>>(new Set());

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const [liste, client] = await Promise.all([chargerListe(), monClient().catch(() => null)]);
      setReel({ liste, tableaux: {}, client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ liste: [], tableaux: {}, client: null });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  /* le temps réel relit la liste ; les tableaux se relisent à la demande */
  const relire = useCallback(async () => {
    try {
      const liste = await chargerListe();
      setReel((prev) => (prev ? { ...prev, liste, tableaux: {} } : prev));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["btp_chantiers", "btp_marches", "btp_passages", "btp_avenants", "btp_factures_chantier"], source === "reelle", relire);

  const lire = useCallback(async (id: string) => {
    setEnCours((s) => new Set(s).add(id));
    try {
      const tb = await chargerTableau(id);
      if (tb) setReel((prev) => (prev ? { ...prev, tableaux: { ...prev.tableaux, [tb.chantier.id]: tb } } : prev));
      else setErreur("Ce chantier n'est pas visible avec ce compte.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le chantier n'a pas pu être lu.");
    } finally {
      setEnCours((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }, []);

  const demander = useCallback(
    (id: string) => {
      if (source !== "reelle" || !reel || reel.tableaux[id] || enCours.has(id)) return;
      void lire(id);
    },
    [source, reel, enCours, lire],
  );
  const demanderTous = useCallback(() => {
    if (source !== "reelle" || !reel) return;
    for (const c of reel.liste) if (!reel.tableaux[c.id] && !enCours.has(c.id)) void lire(c.id);
  }, [source, reel, enCours, lire]);

  const onLocal = useCallback((t: Tableau) => setLocal((prev) => ({ ...prev, [t.chantier.id]: t })), []);
  const relireChantier = useCallback(async (id: string) => {
    const [liste, tb] = await Promise.all([chargerListe(), chargerTableau(id)]);
    setReel((prev) => (prev ? { ...prev, liste, tableaux: tb ? { ...prev.tableaux, [id]: tb } : prev.tableaux } : prev));
  }, []);

  const liste = useMemo(() => (source === "exemple" ? listeDepuis(local) : (reel?.liste ?? [])), [source, local, reel]);
  const tableaux = source === "exemple" ? local : (reel?.tableaux ?? {});
  const premier = Object.values(tableaux)[0] ?? null;
  const quota = premier?.reglages?.quota_chantiers ?? null;
  const maitresOuvrage = (premier?.tiers ?? []).filter((t) => t.roles.includes("maitre_ouvrage"));

  /* nouveau chantier : INSERT direct (politique du bureau), comme EcranDaliro */
  const creer = useCallback(
    async (f: NouveauChantier): Promise<string> => {
      if (source === "reelle") {
        const c = reel?.client ?? (await monClient());
        if (!c) throw new Error("Aucun compte rattaché à cette session.");
        const { data, error } = await createClient()
          .from("btp_chantiers")
          .insert({ client_id: c.client_id, nom: f.nom.trim(), reference: f.reference.trim() || null, adresse: f.adresse.trim() || null, code_postal: f.code_postal, commune: f.commune.trim(), maitre_ouvrage_type: f.maitre_ouvrage_type, place_client: f.place_client, maitre_ouvrage_id: f.maitre_ouvrage_id || null })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        await charger();
        return (data as { id: string }).id;
      }
      const id = crypto.randomUUID();
      const mo = maitresOuvrage.find((t) => t.id === f.maitre_ouvrage_id);
      const modele = Object.values(local)[0];
      const chantier: Chantier = {
        id, client_id: EXEMPLE_CLIENT_ID, entite_id: `${id}-e`, nom: f.nom.trim(), reference: f.reference.trim() || null, adresse: f.adresse.trim() || null, code_postal: f.code_postal, commune: f.commune.trim(),
        departement: f.code_postal.slice(0, 2), territoire: "metropole", zone_tva: "metropole", regime_tva: f.place_client === "sous_traitant" ? "autoliquidation" : "normal",
        maitre_ouvrage_type: f.maitre_ouvrage_type as Chantier["maitre_ouvrage_type"], nature_marche: f.maitre_ouvrage_type === "acheteur_public" ? "public" : "prive", place_client: f.place_client as Chantier["place_client"],
        maitre_ouvrage_id: mo?.id ?? null, maitre_ouvrage_nom: mo?.nom ?? null, maitre_oeuvre_id: null, donneur_ordre_id: null, conducteur_id: null, statut: "preparation", date_debut: null, date_fin_prevue: null, date_reception: null,
        ouvert_le: null, cree_le: new Date().toISOString(), etape: { etape: 0, etapes: 0, lot_id: null, lot_libelle: null, avancement_pct: 0 },
      };
      const controles = [
        { chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_lots", gravite: "attention" as const, message: `${chantier.nom} : aucun lot ; le planning et les passages ne peuvent pas s'y rattacher.` },
        ...(mo ? [] : [{ chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_maitre_ouvrage", gravite: "bloquant" as const, message: `${chantier.nom} : aucun maître d'ouvrage désigné ; personne ne peut signer ses avenants.` }]),
        { chantier_id: id, objet_type: "btp_chantiers", objet_id: id, code: "chantier_sans_coordonnees", gravite: "info" as const, message: `${chantier.nom} : adresse non localisée ; pas de météo, ni de rattachement par la position.` },
      ];
      setLocal((prev) => ({ ...prev, [id]: { ...modele, chantier, lots: [], marches: [], controles, passages: [], dependances: [], acceptations: [], avenants: [], factures: [], debourse: [] } }));
      return id;
    },
    [source, reel, local, maitresOuvrage, charger],
  );

  const valeur: Contexte = {
    source,
    pret: source === "exemple" || reel !== null,
    erreur,
    client: source === "reelle" ? (reel?.client ?? null) : null,
    liste,
    tableau: (id) => tableaux[id] ?? null,
    demander,
    demanderTous,
    enLecture: (id) => enCours.has(id),
    premier,
    onLocal,
    relireChantier,
    relire,
    quota,
    maitresOuvrage,
    creer,
  };
  return <DonneesContexte.Provider value={valeur}>{children}</DonneesContexte.Provider>;
}
