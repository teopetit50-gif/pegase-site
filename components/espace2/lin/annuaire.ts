"use client";

/* L'annuaire de l'espace 2 — Entreprises et Contacts (sorti de LinearClients.tsx le
   30/10/2026, pour que l'assistant lise les mêmes fiches que les pages). */

import { useMemo } from "react";
import { useSource } from "@/components/espace/source";
import { ecrireStockage, useStockage } from "../Collection";

export type Fiche = { id: string; cree: string } & Record<string, string | boolean | undefined>;
export const CLES = { entreprises: "espace2-collection-entreprises", contacts: "espace2-collection-contacts" } as const;
export type Collection = keyof typeof CLES;

export function analyser(brut: string | null): Fiche[] | null {
  if (brut === null) return null;
  try {
    const v = JSON.parse(brut || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
/* 29/10 — Teo : « remplis ces deux pages pour l'exemple ». En « Données d'exemple », l'annuaire
   a ses propres clés, amorcées avec le monde de la démo (Atelier Bertin, ses clients et ses
   fournisseurs) tant que rien n'y est écrit ; les fiches réelles restent sous CLES. Les
   numéros sont dans les tranches réservées à la fiction par l'Arcep (04 65 71, 06 39 98). */
export const CLES_EXEMPLE: Record<Collection, string> = { entreprises: "espace2-exemple-entreprises", contacts: "espace2-exemple-contacts" };
export const EXEMPLES: Record<Collection, Fiche[]> = {
  entreprises: [
    { id: "ex-e-lefevre", cree: "2026-09-02", nom: "SCI Lefèvre Patrimoine", type: "Client", ville: "Lyon 6e", telephone: "04 65 71 12 40", email: "compta@lefevre-patrimoine.fr", notes: "Gestion de six immeubles en rive gauche ; règle à 45 jours." },
    { id: "ex-e-giraud", cree: "2026-09-05", nom: "Peintures Giraud SARL", type: "Client", ville: "Villeurbanne", telephone: "04 65 71 18 02", email: "contact@peintures-giraud.fr" },
    { id: "ex-e-brotteaux", cree: "2026-09-11", nom: "Hôtel des Brotteaux", type: "Client", ville: "Lyon 6e", telephone: "04 65 71 23 77", email: "direction@hotel-brotteaux.fr", notes: "Rénovation des parties communes, deux tranches." },
    { id: "ex-e-caluire", cree: "2026-09-16", nom: "Mairie de Caluire", type: "Client", ville: "Caluire-et-Cuire", telephone: "04 65 71 30 10", email: "marches@caluire-exemple.fr", notes: "Marché public : factures déposées sur Chorus Pro." },
    { id: "ex-e-martin", cree: "2026-10-01", nom: "Boulangerie Martin", type: "Client", ville: "Lyon 3e", telephone: "04 65 71 41 56" },
    { id: "ex-e-vidal", cree: "2026-09-03", nom: "Imprimerie Vidal SAS", type: "Fournisseur", ville: "Vénissieux", telephone: "04 65 71 52 33", email: "factures@imprimerie-vidal.fr" },
    { id: "ex-e-durand", cree: "2026-09-08", nom: "Papeterie Durand", type: "Fournisseur", ville: "Lyon 7e", telephone: "04 65 71 60 08", email: "commandes@papeterie-durand.fr" },
    { id: "ex-e-techpro", cree: "2026-09-20", nom: "TechPro Informatique", type: "Fournisseur", ville: "Écully", telephone: "04 65 71 64 90", email: "support@techpro-info.fr", notes: "Contrat de maintenance du parc, renouvelé en janvier." },
    { id: "ex-e-roux", cree: "2026-10-06", nom: "Métallerie Roux SARL", type: "Fournisseur", ville: "Décines-Charpieu", telephone: "04 65 71 71 15" },
    { id: "ex-e-riviere", cree: "2026-10-14", nom: "Transports Rivière", type: "Fournisseur", ville: "Saint-Priest", telephone: "04 65 71 77 42", email: "exploitation@transports-riviere.fr" },
    { id: "ex-e-ferrand", cree: "2026-09-01", nom: "Cabinet Ferrand, expertise comptable", type: "Partenaire", ville: "Lyon 2e", telephone: "04 65 71 80 64", email: "cabinet@ferrand-expertise.fr", notes: "Tient la comptabilité ; reçoit le FEC chaque mois." },
  ],
  contacts: [
    { id: "ex-c-lefevre", cree: "2026-09-02", nom: "Hélène Lefèvre", entreprise: "SCI Lefèvre Patrimoine", entreprise_id: "ex-e-lefevre", email: "compta@lefevre-patrimoine.fr", telephone: "06 39 98 10 21" },
    { id: "ex-c-giraud", cree: "2026-09-05", nom: "Paul Giraud", entreprise: "Peintures Giraud SARL", entreprise_id: "ex-e-giraud", email: "p.giraud@peintures-giraud.fr", telephone: "06 39 98 11 47" },
    { id: "ex-c-morel", cree: "2026-09-11", nom: "Claire Morel", entreprise: "Hôtel des Brotteaux", entreprise_id: "ex-e-brotteaux", email: "c.morel@hotel-brotteaux.fr", telephone: "06 39 98 12 05" },
    { id: "ex-c-levy", cree: "2026-09-16", nom: "Marc Lévy", entreprise: "Mairie de Caluire", entreprise_id: "ex-e-caluire", email: "m.levy@caluire-exemple.fr", telephone: "04 65 71 30 14" },
    { id: "ex-c-martin", cree: "2026-10-01", nom: "Julie Martin", entreprise: "Boulangerie Martin", entreprise_id: "ex-e-martin", telephone: "06 39 98 13 88" },
    { id: "ex-c-vidal", cree: "2026-09-03", nom: "Thomas Vidal", entreprise: "Imprimerie Vidal SAS", entreprise_id: "ex-e-vidal", email: "t.vidal@imprimerie-vidal.fr", telephone: "06 39 98 14 30" },
    { id: "ex-c-durand", cree: "2026-09-08", nom: "Nadia Durand", entreprise: "Papeterie Durand", entreprise_id: "ex-e-durand", email: "n.durand@papeterie-durand.fr" },
    { id: "ex-c-carvalho", cree: "2026-09-20", nom: "Sofia Carvalho", entreprise: "TechPro Informatique", entreprise_id: "ex-e-techpro", email: "s.carvalho@techpro-info.fr", telephone: "06 39 98 15 62" },
    { id: "ex-c-dupre", cree: "2026-10-14", nom: "Yanis Dupré", entreprise: "Transports Rivière", entreprise_id: "ex-e-riviere", email: "y.dupre@transports-riviere.fr", telephone: "06 39 98 16 09" },
    { id: "ex-c-ferrand", cree: "2026-09-01", nom: "Anne Ferrand", entreprise: "Cabinet Ferrand, expertise comptable", entreprise_id: "ex-e-ferrand", email: "a.ferrand@ferrand-expertise.fr", telephone: "04 65 71 80 65" },
    { id: "ex-c-roux", cree: "2026-10-06", nom: "Karim Roux", entreprise: "Métallerie Roux SARL", entreprise_id: "ex-e-roux", telephone: "06 39 98 17 74" },
  ],
};
export function useFiches(c: Collection): [Fiche[] | null, (f: Fiche[]) => void] {
  const { source } = useSource();
  const cle = source === "exemple" ? CLES_EXEMPLE[c] : CLES[c];
  const brut = useStockage(cle);
  /* "" : jamais écrit ; en exemple, l'annuaire de la démo */
  const fiches = useMemo(() => (brut === "" && source === "exemple" ? EXEMPLES[c] : analyser(brut)), [brut, source, c]);
  return [fiches, (f) => ecrireStockage(cle, JSON.stringify(f))];
}
