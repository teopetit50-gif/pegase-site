"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les données de LORANI, partagées par ses sous-pages (29/10/2026)

   L'écran de /espace (components/espace/lorani/EcranLorani.tsx) lit tout
   le dossier d'un coup (chargerDossier) et passe à ses cartes trois
   fonctions : agir (la porte en base réelle puis relecture, ou le dossier
   d'exemple modifié en mémoire), nommer (qui est qui) et peutEcrire. Ses
   sous-pages de l'espace 2 les lisent ici, posé une fois par
   app/espace2/lorani/layout : une saisie jouée sur l'exemple dans une
   page se voit dans les autres. Mêmes portes, même logique.
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PERSONNES, nomPersonne } from "@/components/espace/exemples/socle";
import { useSource, type Source } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { dossierExemple } from "@/components/espace/lorani/exemples";
import { famille, type Famille } from "@/components/espace/lorani/etats";
import { chargerDossier } from "@/components/espace/lorani/portes";
import type { Dossier } from "@/components/espace/lorani/types";

/* le dossier vide que l'écran pose quand la base ne répond pas */
const vide = (): Dossier => ({ ...dossierExemple(), projets: [], permis: [], datesLues: [], echeances: [], recours: [], lots: [], intervenants: [], membres: [], pieces: [], controles: [], controlePieces: [], constats: [], plu: [], attestations: [], ordresService: [], reserves: [], comptesRendus: [], points: [], doe: [], consultations: [], offres: [], moi: null });

type Contexte = {
  source: Source;
  /* la base réelle a répondu (toujours vrai sur l'exemple) */
  pret: boolean;
  erreur: string | null;
  dossier: Dossier;
  clientId: string;
  peutEcrire: boolean;
  /* une saisie : la porte puis relecture en base réelle, le dossier modifié en mémoire sur l'exemple */
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
  /* remplacer le dossier d'exemple (PermisVue s'en sert) */
  onLocal: (d: Dossier) => void;
  relire: () => Promise<void>;
  nommer: (id: string | null | undefined) => string;
  personnes: { user_id: string; nom: string }[];
  /* les dates lues sur les courriers et pas encore confirmées, par permis (ou « projet:<id> ») */
  proposeesPar: Record<string, number>;
  familleDe: (permis: Dossier["permis"][number]) => Famille;
};

const LoraniContexte = createContext<Contexte | null>(null);

export function useLorani(): Contexte {
  const c = useContext(LoraniContexte);
  if (!c) throw new Error("useLorani hors de DonneesLorani (app/espace2/lorani/layout)");
  return c;
}

export default function DonneesLorani({ children }: { children: React.ReactNode }) {
  const { source } = useSource();
  const [local, setLocal] = useState<Dossier>(() => dossierExemple());
  const [reel, setReel] = useState<Dossier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      setReel(await chargerDossier());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel(vide());
    }
  }, []);
  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => {
      setReel(null);
      void charger();
    }, 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    try {
      setReel(await chargerDossier());
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, []);
  useTempsReel(["lorani_permis", "lorani_permis_dates_lues", "lorani_permis_recours", "lorani_permis_echeances"], source === "reelle", relire);

  const dossier: Dossier = source === "exemple" ? local : (reel ?? local);

  const nommer = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "—";
      if (source === "exemple") return nomPersonne(id);
      if (dossier.moi && id === dossier.moi.user_id) return "Vous";
      return dossier.noms[id] ?? id.slice(0, 8);
    },
    [source, dossier],
  );
  const personnes = useMemo(() => {
    if (source === "exemple") return Object.entries(PERSONNES).map(([user_id, p]) => ({ user_id, nom: p.nom }));
    return Object.entries(dossier.noms).map(([user_id, nom]) => ({ user_id, nom }));
  }, [source, dossier.noms]);

  const proposeesPar = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of dossier.datesLues) {
      if (d.statut !== "proposee") continue;
      const cle = d.permis_id ?? `projet:${d.projet_id}`;
      m[cle] = (m[cle] ?? 0) + 1;
    }
    return m;
  }, [dossier.datesLues]);

  const agir = useCallback(
    async (reelle: () => Promise<void>, locale: () => Dossier) => {
      if (source === "reelle") {
        await reelle();
        await relire();
      } else {
        setLocal(locale());
      }
    },
    [source, relire],
  );

  const valeur: Contexte = {
    source,
    pret: source === "exemple" || reel !== null,
    erreur,
    dossier,
    clientId: dossier.moi?.client_id ?? "",
    peutEcrire: source === "exemple" || (dossier.moi?.role !== "lecteur" && !!dossier.moi),
    agir,
    onLocal: setLocal,
    relire,
    nommer,
    personnes,
    proposeesPar,
    familleDe: (p) => famille(p, proposeesPar[p.id] ?? 0),
  };
  return <LoraniContexte.Provider value={valeur}>{children}</LoraniContexte.Provider>;
}
