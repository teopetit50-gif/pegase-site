"use client";

/* ══════════════════════════════════════════════════════════════════════
   La Carte — ses données (29/10/2026)

   Ce que font les quatre agents communs, lu aux mêmes sources que leurs
   écrans (l'exemple, ou la base réelle par les mêmes portes) :
     · FILED   ../donnees (documents, factures, états de paiement)
     · CASHD   ../cashd/donnees (le tableau : encours, échu, règlements)
     · REPUT   reput/portes › chargerMonde (demandes, réponses)
     · OFFLOAD offload/portes › chargerTableau (comptes, compteurs)
   et la file des validations (../donnees › demandes), pour « Vous ».

   Chaque agent se lit seul : un agent dont la base ne répond pas garde
   sa place sur la carte, grisé, avec la raison ; les autres continuent.
   Aucun chiffre inventé : ce qui n'a pas de donnée affiche « — ».
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { useSource } from "@/components/espace/source";
import { montant } from "@/components/espace/format";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { chargerMonde, monClient } from "@/components/espace/reput/portes";
import type { Monde } from "@/components/espace/reput/types";
import { exempleOffload } from "@/components/espace/offload/exemples";
import { chargerTableau as chargerOffload } from "@/components/espace/offload/portes";
import type { Tableau as TableauOffload } from "@/components/espace/offload/types";
import type { Demande } from "@/components/espace/types";
import { useDonnees, type Donnees } from "../donnees";
import { useTableauCashd } from "../cashd/donnees";
import { A_PAYER } from "../filed/calculs";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";

const JOUR = 86_400_000;
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

export type CleAgent = "filed" | "cashd" | "reput" | "offload";
export type Teinte = "ambre" | "rouge" | "vert";
export type Ligne = { libelle: string; valeur: string; teinte?: Teinte };

export type Agent = {
  cle: CleAgent;
  nom: string;
  /* ce qu'il fait, en une phrase */
  role: string;
  lien: string;
  /* lecture : pas encore de réponse ; erreur : la base n'a pas répondu */
  etat: "pret" | "lecture" | "erreur";
  erreur: string | null;
  /* d'où vient le travail */
  source: { titre: string; texte: string; n: number };
  /* ce qu'il en fait, dans le bloc de l'agent */
  lignes: Ligne[];
  /* ce qui attend une personne */
  aValider: { n: number; texte: string; lien: string };
  /* où le travail aboutit */
  resultat: { titre: string; texte: string; n: number };
  /* la période des chiffres, dite en clair */
  periode: string;
};

export type Carte = {
  agents: Agent[];
  /* toutes les demandes de validation en attente, tous modules */
  enAttente: Demande[];
  /* pour l'onglet Activité du panneau (événements de l'organisation) */
  donnees: Donnees | null;
  /* les chiffres de la carte d'en-tête */
  chiffres: { libelle: string; valeur: string }[];
};

/* ——— REPUT et OFFLOAD : leurs portes, comme leurs écrans ——— */
function useMondeReput(): { monde: Monde | null; erreur: string | null } {
  const { source } = useSource();
  const [reel, setReel] = useState<Monde | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const exemple = useMemo(() => mondeExemple(), []);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const c = await monClient();
        if (!c) throw new Error("Aucun compte REPUT rattaché à cette session.");
        const m = await chargerMonde(c);
        if (actif) setReel(m);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  return { monde: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

function useTableauOffload(): { tableau: TableauOffload | null; erreur: string | null } {
  const { source } = useSource();
  const [reel, setReel] = useState<TableauOffload | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const exemple = useMemo(() => exempleOffload().tableau, []);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const tb = await chargerOffload();
        if (!tb) throw new Error("Aucun compte OFFLOAD rattaché à cette session.");
        if (actif) setReel(tb);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  return { tableau: source === "exemple" ? exemple : reel, erreur: source === "exemple" ? null : erreur };
}

const etatDe = (pret: boolean, erreur: string | null): Agent["etat"] => (erreur ? "erreur" : pret ? "pret" : "lecture");
const attente = (demandes: Demande[] | undefined, module: string) => (demandes ?? []).filter((d) => d.statut === "en_attente" && d.module === module);

export function useCarte(): Carte | null {
  const maintenant = useMaintenant();
  const { donnees, erreur: erreurSocle } = useDonnees();
  const { tableau: cashd, erreur: erreurCashd } = useTableauCashd();
  const { monde, erreur: erreurReput } = useMondeReput();
  const { tableau: offload, erreur: erreurOffload } = useTableauOffload();

  return useMemo(() => {
    if (maintenant === null) return null;
    const depuis30 = maintenant - 30 * JOUR;
    const depuis7 = maintenant - 7 * JOUR;
    const recent = (iso: string | null | undefined, depuis: number) => !!iso && new Date(iso).getTime() >= depuis;
    const demandes = donnees?.demandes;

    /* FILED */
    const docs30 = donnees ? donnees.docs.filter((d) => recent(d.recu_le, depuis30)) : [];
    const factures = donnees?.vue.factures ?? [];
    /* une facture bloquée ou à compléter attend une personne : c'est l'anomalie vue de l'extérieur */
    const enAnomalie = factures.filter((f) => f.statut === "bloquee" || f.statut === "a_completer").length;
    const aRegler = factures.filter((f) => A_PAYER.has(f.statut) && f.nature !== "avoir" && donnees?.etats[f.id]?.etat !== "payee");
    const enCompta = factures.filter((f) => f.statut === "comptabilisee").length;
    const filedAttente = attente(demandes, "filed");
    const filed: Agent = {
      cle: "filed",
      nom: "FILED",
      role: "Lit chaque facture fournisseur, la contrôle (totaux, TVA, doublons, RIB) et la met à payer.",
      lien: `${RACINE}/filed/a-payer`,
      etat: etatDe(!!donnees, erreurSocle),
      erreur: erreurSocle,
      periode: "30 derniers jours",
      source: { titre: "Boîte de réception", texte: donnees ? `${pluriel(docs30.length, "document reçu", "documents reçus")}` : "—", n: docs30.length },
      lignes: donnees
        ? [
            { libelle: "Pièces lues", valeur: String(docs30.length) },
            { libelle: "En anomalie", valeur: String(enAnomalie), teinte: enAnomalie ? "ambre" : undefined },
            { libelle: "À payer", valeur: `${aRegler.length} · ${montant(aRegler.reduce((s, f) => s + (f.net_a_payer ?? f.montant_ttc ?? 0), 0))}` },
          ]
        : [],
      aValider: { n: filedAttente.length, texte: filedAttente.length ? `${pluriel(filedAttente.length, "facture")} à approuver` : "Rien à approuver", lien: `${RACINE}/validations` },
      resultat: { titre: "Comptabilité", texte: donnees ? `${pluriel(enCompta, "facture passée", "factures passées")} en compta` : "—", n: enCompta },
    };

    /* CASHD */
    const reglements30 = cashd ? cashd.a_imputer.filter((r) => recent(r.recu_le, depuis30)) : [];
    const encaisse = reglements30.reduce((s, r) => s + r.montant, 0);
    const cashdAttente = attente(demandes, "cashd");
    const cashdAgent: Agent = {
      cle: "cashd",
      nom: "CASHD",
      role: "Suit qui vous doit, depuis quand, et relance au bon moment avec le bon ton.",
      lien: `${RACINE}/cashd`,
      etat: etatDe(!!cashd, erreurCashd),
      erreur: erreurCashd,
      periode: "30 derniers jours",
      source: { titre: "Vos factures clients", texte: cashd ? `${pluriel(cashd.comptes.length, "client suivi", "clients suivis")}` : "—", n: cashd?.comptes.length ?? 0 },
      lignes: cashd
        ? [
            { libelle: "Encours", valeur: montant(cashd.totaux.encours) },
            { libelle: "Échu", valeur: montant(cashd.totaux.echu), teinte: cashd.totaux.echu > 0 ? "ambre" : undefined },
            { libelle: "Clients en retard", valeur: String(cashd.totaux.comptes_en_retard), teinte: cashd.totaux.comptes_en_retard ? "ambre" : undefined },
          ]
        : [],
      aValider: { n: cashdAttente.length, texte: cashdAttente.length ? `${pluriel(cashdAttente.length, "relance")} à valider` : "Rien à valider", lien: `${RACINE}/validations` },
      resultat: { titre: "Encaissements", texte: cashd ? `${montant(encaisse)} reçus` : "—", n: reglements30.length },
    };

    /* REPUT */
    const demandesReput = monde ? monde.demandes.filter((d) => recent(d.recu_le, depuis7)) : [];
    const reputAttente = monde ? monde.demandes.filter((d) => d.statut === "a_valider").length : 0;
    const envoyees = monde ? monde.demandes.filter((d) => recent(d.envoyee_le, depuis7)).length : 0;
    const urgences = demandesReput.filter((d) => d.urgence).length;
    const reput: Agent = {
      cle: "reput",
      nom: "REPUT",
      role: "Lit les messages de vos clients et prépare une réponse juste, que vous validez avant l'envoi.",
      lien: `${RACINE}/reput`,
      etat: etatDe(!!monde, erreurReput),
      erreur: erreurReput,
      periode: "7 derniers jours",
      source: { titre: "Messages clients", texte: monde ? `${pluriel(demandesReput.length, "message reçu", "messages reçus")}` : "—", n: demandesReput.length },
      lignes: monde
        ? [
            { libelle: "Messages lus", valeur: String(demandesReput.length) },
            { libelle: "Réponses préparées", valeur: String(monde.reponses.filter((r) => r.statut !== "remplacee").length) },
            { libelle: "Urgences", valeur: String(urgences), teinte: urgences ? "rouge" : undefined },
          ]
        : [],
      aValider: { n: reputAttente, texte: reputAttente ? `${pluriel(reputAttente, "réponse")} à relire` : "Rien à relire", lien: `${RACINE}/reput` },
      resultat: { titre: "Réponses envoyées", texte: monde ? `${pluriel(envoyees, "réponse envoyée", "réponses envoyées")}` : "—", n: envoyees },
    };

    /* OFFLOAD */
    const c = offload?.compteurs;
    const decrochent = c ? c.eteint + c.decroche + c.ralentit + c.saison : 0;
    const offloadAttente = offload ? offload.a_valider.length : 0;
    const offloadAgent: Agent = {
      cle: "offload",
      nom: "OFFLOAD",
      role: "Repère les clients qui achètent moins que d'habitude et prépare la reprise de contact.",
      lien: `${RACINE}/offload`,
      etat: etatDe(!!offload, erreurOffload),
      erreur: erreurOffload,
      periode: "en ce moment",
      source: { titre: "Historique des ventes", texte: c ? `${pluriel(c.comptes, "compte suivi", "comptes suivis")}` : "—", n: c?.comptes ?? 0 },
      lignes: c
        ? [
            { libelle: "Comptes suivis", valeur: String(c.comptes) },
            { libelle: "Qui décrochent", valeur: String(decrochent), teinte: decrochent ? "ambre" : undefined },
            { libelle: "Avant clôture", valeur: String(c.avant_cloture) },
          ]
        : [],
      aValider: { n: offloadAttente, texte: offloadAttente ? `${pluriel(offloadAttente, "message")} de reprise à valider` : "Rien à valider", lien: `${RACINE}/offload` },
      resultat: { titre: "Pour vos commerciaux", texte: c ? `${pluriel(c.appels, "appel")} · ${pluriel(c.reponses, "réponse")} à traiter` : "—", n: c ? c.appels + c.reponses : 0 },
    };

    const agents = [filed, cashdAgent, reput, offloadAgent];
    const enAttente = (demandes ?? []).filter((d) => d.statut === "en_attente");
    const totalAttente = agents.reduce((s, a) => s + a.aValider.n, 0);
    return {
      agents,
      enAttente,
      donnees,
      chiffres: [
        { libelle: "Documents lus", valeur: donnees ? String(docs30.length) : "—" },
        { libelle: "Règlements reçus", valeur: cashd ? montant(encaisse) : "—" },
        { libelle: "Réponses envoyées", valeur: monde ? String(envoyees) : "—" },
        { libelle: "À valider", valeur: String(totalAttente) },
      ],
    };
  }, [maintenant, donnees, erreurSocle, cashd, erreurCashd, monde, erreurReput, offload, erreurOffload]);
}

/* le nombre de points qui courent sur un lien : rien → 0, un peu → 1, beaucoup → 3 */
export const fluxDe = (n: number) => (n <= 0 ? 0 : n < 3 ? 1 : n < 10 ? 2 : 3);
