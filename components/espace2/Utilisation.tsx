"use client";

/* ══════════════════════════════════════════════════════════════════════
   « Utilisation » — la première page de suivi (06/10/2026, C1), sur le
   modèle de la page « Usage » de la référence (./Suivi.tsx).

   Ce qui est compté vient des mêmes données que la vue d'ensemble
   (./donnees.ts : exemple ou base réelle) : documents reçus, montants
   facturés et payés (FILED), demandes et décisions (validations). Le
   temps économisé et les relances (CASHD) viendront quand leurs modules
   rendront ces chiffres : le composant n'attend que des lignes.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { etatDocument } from "@/components/espace/filed/etats";
import { libelleModule, montant } from "@/components/espace/format";
import { CarteSuivi, ChoixPeriode, DetailBarres, PERIODES, type LigneSuivi, type Periode } from "./Suivi";
import { Note, Squelette } from "./ui";
import { useDonnees } from "./donnees";
import { A_PAYER, du, minuit } from "./filed/calculs";

const JOUR = 86_400_000;
const nombre = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const euros = (n: number) => montant(Math.round(n * 100) / 100);

/* regrouper et trier, pour les détails dépliés */
function parCle<T>(items: T[], cle: (t: T) => string, valeur: (t: T) => number = () => 1) {
  const m = new Map<string, number>();
  for (const i of items) m.set(cle(i), (m.get(cle(i)) ?? 0) + valeur(i));
  return Array.from(m, ([libelle, v]) => ({ libelle, valeur: v })).sort((a, b) => b.valeur - a.valeur).slice(0, 6);
}

const STATUTS: Record<string, string> = { en_attente: "En attente", approuvee: "Approuvée", rejetee: "Rejetée", annulee: "Annulée", expiree: "Expirée", executee: "Exécutée", echec_execution: "Échec d'exécution" };

export default function Utilisation() {
  const { donnees, erreur } = useDonnees();
  const [periode, setPeriode] = useState<Periode>(PERIODES[1]);
  const [aujourdhui] = useState(minuit);
  const depuis = aujourdhui - periode.jours * JOUR + JOUR;
  const dans = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() >= depuis;

  const cartes = useMemo(() => {
    if (!donnees) return null;
    const nomFournisseur = (id: string | null) => donnees.vue.fournisseurs.find((f) => f.id === id)?.nom ?? "Fournisseur inconnu";
    const docs = donnees.docs.filter((d) => dans(d.recu_le));
    const emises = donnees.vue.factures.filter((f) => f.nature !== "avoir" && dans(f.date_emission));
    const aPayer = donnees.vue.factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir");
    const reglees = aPayer.filter((f) => dans(donnees.etats[f.id]?.dernier_le));
    const demandes = donnees.demandes.filter((d) => dans(d.cree_le));
    const decisions = donnees.demandes.filter((d) => dans(d.decide_le));
    const enAttente = donnees.demandes.filter((d) => d.statut === "en_attente");

    const filed: LigneSuivi[] = [
      {
        cle: "docs",
        libelle: "Documents reçus",
        aide: "lus, contrôlés et classés par FILED",
        valeur: docs.length,
        plafond: donnees.docs.length,
        format: nombre,
        detail: <DetailBarres lignes={parCle(docs, (d) => etatDocument(d.etat).libelle)} format={nombre} />,
      },
      {
        cle: "facture",
        libelle: "Montant facturé",
        aide: "TTC des factures émises sur la période",
        valeur: emises.reduce((s, f) => s + (f.montant_ttc ?? 0), 0),
        format: euros,
        detail: <DetailBarres lignes={parCle(emises, (f) => nomFournisseur(f.fournisseur_id), (f) => f.montant_ttc ?? 0)} format={euros} />,
      },
      {
        cle: "paye",
        libelle: "Payé",
        aide: "règlements notés sur la période, face au dû des factures à payer",
        valeur: reglees.reduce((s, f) => s + (donnees.etats[f.id]?.regle ?? 0), 0),
        plafond: aPayer.reduce((s, f) => s + du(f), 0),
        format: euros,
        teinte: "vert",
        detail: <DetailBarres lignes={parCle(reglees, (f) => f.reference ?? nomFournisseur(f.fournisseur_id), (f) => donnees.etats[f.id]?.regle ?? 0)} format={euros} />,
      },
    ];
    const validations: LigneSuivi[] = [
      {
        cle: "demandes",
        libelle: "Demandes reçues",
        aide: "virements, factures, IBAN, accords…",
        valeur: demandes.length,
        plafond: donnees.demandes.length,
        format: nombre,
        detail: <DetailBarres lignes={parCle(demandes, (d) => libelleModule(d.module))} format={nombre} />,
      },
      {
        cle: "decisions",
        libelle: "Décisions prises",
        valeur: decisions.length,
        plafond: demandes.length || undefined,
        format: nombre,
        teinte: "vert",
        detail: <DetailBarres lignes={parCle(decisions, (d) => STATUTS[d.statut] ?? d.statut)} format={nombre} />,
      },
      {
        cle: "attente",
        libelle: "En attente de décision",
        aide: "aujourd'hui, toutes périodes confondues",
        valeur: enAttente.length,
        plafond: donnees.demandes.length,
        format: nombre,
        teinte: enAttente.length ? "ambre" : "vert",
        detail: <DetailBarres lignes={parCle(enAttente, (d) => libelleModule(d.module))} format={nombre} />,
      },
    ];
    return { filed, validations };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dans` ne dépend que de `depuis`
  }, [donnees, depuis]);

  return (
    <div className="v2-page v2-page--etroite v2-arrivee">
      <h1 className="v2-sr">Utilisation</h1>
      <div className="v2-tete" style={{ alignItems: "center" }}>
        <p style={{ margin: 0 }}>Ce que l&apos;espace a traité pour vous sur la période. Dépliez une ligne pour son détail.</p>
        <ChoixPeriode valeur={periode} changer={setPeriode} />
      </div>
      {erreur ? (
        <div style={{ marginBottom: 24 }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}
      {!cartes ? (
        <div className="v2-carte" aria-busy="true" style={{ padding: 16, display: "grid", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Squelette key={i} hauteur={20} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <CarteSuivi titre="Factures (FILED)" sous={periode.libelle} lignes={cartes.filed} />
          <CarteSuivi titre="Validations" sous={periode.libelle} lignes={cartes.validations} />
          <p className="v2-aide">Le temps économisé et les relances (CASHD) s&apos;ajouteront ici quand leurs modules rendront ces chiffres.</p>
        </div>
      )}
    </div>
  );
}
