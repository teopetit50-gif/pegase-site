"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/cashd — les relances d'impayés (06/10/2026, session C2)

   En haut, l'encours échu au total et quatre compteurs ; dessous, la
   balance âgée de tout l'encours. À gauche les débiteurs (qui doit quoi,
   depuis quand, où en est la relance) ; à droite la fiche du compte
   ouvert (FicheCompte). Plus bas, les relances écrites ce matin et leur
   état dans la file de validation, puis les règlements à rapprocher.

   Deux sources : l'exemple (exemples.ts, joué en mémoire pour que les
   gestes se voient) ou la base réelle (portes.ts : cashd_tableau,
   cashd_relances_du_jour, cashd_fiche_compte, sous RLS).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileUp, PenLine } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide } from "../ui";
import { dateCourte, dateHeure, montant } from "../format";
import { tableauDe, balanceDe, etatPiece, jourParis } from "./calcul";
import { exporterBalance, exporterJson, exporterRelances } from "./tableur";
import { DERNIER_IMPORT_EXEMPLE, FICHES_EXEMPLE, REGLAGES_EXEMPLE, RELANCES_EXEMPLE, SANS_COMPTE_EXEMPLE } from "./exemples";
import { ETATS_RELANCE, STATUTS_COMPTE, TRANCHES, libellePalier } from "./etats";
import { JEUX, LIBELLES_CHAMPS, lireDepot, type Jeu } from "./depot";
import * as portes from "./portes";
import FicheCompte, { type Actions } from "./FicheCompte";
import Textes from "./Textes";
import type { Fiche, Proposition, Relance, RelanceCommande, ReglementEtat, Tableau } from "./types";
import "./cashd.css";

type Filtre = "echu" | "plus_90" | "pause" | null;
/* Les quatre vues de l'espace (11/10, c2_04) : celles que la page produit montre. */
export type Onglet = "debiteurs" | "relances" | "envois" | "tresorerie";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "debiteurs", libelle: "Débiteurs" },
  { cle: "relances", libelle: "Relances" },
  { cle: "envois", libelle: "Envois" },
  { cle: "tresorerie", libelle: "Trésorerie" },
];
const ETATS_COMMANDE: Record<RelanceCommande["statut"], { libelle: string; teinte: "ambre" | "gris" | "rouge" }> = {
  preparee: { libelle: "En préparation", teinte: "gris" },
  a_valider: { libelle: "À valider", teinte: "ambre" },
  non_reglee: { libelle: "Écrite — envoi à régler", teinte: "ambre" },
  bloquee: { libelle: "Bloquée", teinte: "rouge" },
  coupee: { libelle: "Coupée", teinte: "gris" },
  echec: { libelle: "Échec", teinte: "rouge" },
};
type Reel = { client: portes.MonClient | null; tableau: Tableau | null; relances: Relance[]; fiches: Record<string, Fiche> };

const estOnglet = (v: string | null | undefined): v is Onglet => !!v && ONGLETS.some((o) => o.cle === v);

/* `vue` (ou `?vue=` dans l'adresse) ouvre une des quatre vues : debiteurs, relances, envois, tresorerie. */
/* `gabarit="sb"` : /espace2 rend chaque vue en page Supabase (22/10/2026) */
export default function EcranCashd({ vue, gabarit }: { vue?: Onglet; gabarit?: "sb" } = {}) {
  const { source } = useSource();
  const [fiches, setFiches] = useState<Fiche[]>(FICHES_EXEMPLE);
  const [sansCompte, setSansCompte] = useState<ReglementEtat[]>(SANS_COMPTE_EXEMPLE);
  const [relancesLocales, setRelancesLocales] = useState<Relance[]>(RELANCES_EXEMPLE);
  const [reel, setReel] = useState<Reel | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>(null);
  /* le canal choisi dans les filtres de la page Envois (gabarit sb) */
  const [canalChoisi, setCanalChoisi] = useState<string | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [chargeFiche, setChargeFiche] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const [previsionReelle, setPrevisionReelle] = useState<portes.Prevision | null>(null);
  const [pilotageReel, setPilotageReel] = useState<{ reponses: portes.Reponse[]; arretes: portes.Arrete[] } | null>(null);
  const [onglet, setOngletEtat] = useState<Onglet>(vue ?? "debiteurs");
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const v = p.get("vue");
    /* ?compte=<id> ouvre la fiche d'un compte (les pages de fonction de /espace2/cashd, 21/10) */
    const c = p.get("compte");
    if ((vue || !estOnglet(v)) && !c) return;
    const t = window.setTimeout(() => {
      if (!vue && estOnglet(v)) setOngletEtat(v);
      if (c) setChoix(c);
    }, 0);
    return () => window.clearTimeout(t);
  }, [vue]);
  /* 22/10 — la page lit ?vue= côté serveur : un lien du volet change la vue sans remonter l'écran */
  useEffect(() => {
    if (!vue) return;
    const t = window.setTimeout(() => setOngletEtat(vue), 0);
    return () => window.clearTimeout(t);
  }, [vue]);
  /* la vue choisie reste dans l'adresse : un lien la rouvre */
  const setOnglet = (o: Onglet) => {
    setOngletEtat(o);
    const u = new URL(window.location.href);
    u.searchParams.set("vue", o);
    window.history.replaceState(window.history.state, "", u);
  };
  const [commandesReelles, setCommandesReelles] = useState<RelanceCommande[]>([]);
  const [commandesLocales, setCommandesLocales] = useState<RelanceCommande[]>([]);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    setReel(null);
    try {
      const client = await portes.monClient();
      if (!client) {
        setReel({ client: null, tableau: null, relances: [], fiches: {} });
        return;
      }
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      setReel({ client, tableau, relances, fiches: {} });
      setPrevisionReelle(await portes.prevision(client.client_id).catch(() => null));
      setPilotageReel(await portes.chargerPilotage(client.client_id).catch(() => null));
      setCommandesReelles(await portes.chargerRelancesCommande(client.client_id).catch(() => []));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ client: null, tableau: null, relances: [], fiches: {} });
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);

  const relire = useCallback(async () => {
    const client = reel?.client;
    if (!client) return;
    try {
      const [tableau, relances] = await Promise.all([portes.chargerTableau(client.client_id), portes.chargerRelances(client.client_id)]);
      setReel((prev) => (prev ? { ...prev, tableau, relances, fiches: {} } : prev));
      setCommandesReelles(await portes.chargerRelancesCommande(client.client_id).catch(() => []));
    } catch {
      /* la prochaine lecture à la main dira l'erreur */
    }
  }, [reel?.client]);
  useTempsReel(["cashd_factures", "cashd_reglements", "cashd_relances", "cashd_comptes", "cashd_relances_commande"], source === "reelle", relire);

  const tableau: Tableau | null = useMemo(() => {
    if (source === "exemple") return tableauDe(fiches, { reglages: REGLAGES_EXEMPLE, dernier_import: DERNIER_IMPORT_EXEMPLE }, sansCompte);
    return reel?.tableau ?? null;
  }, [source, fiches, sansCompte, reel]);
  const relances = source === "exemple" ? relancesLocales : (reel?.relances ?? []);

  const comptes = useMemo(() => {
    const l = tableau?.comptes ?? [];
    return l.filter((b) => (filtre === "echu" ? b.echu > 0 : filtre === "plus_90" ? b.echu_plus_90 > 0 : filtre === "pause" ? b.statut !== "actif" : true));
  }, [tableau, filtre]);
  const choisi = choix && comptes.some((b) => b.compte_id === choix) ? choix : (comptes[0]?.compte_id ?? null);

  const fiche: Fiche | null = useMemo(() => {
    if (!choisi) return null;
    if (source === "exemple") {
      const f = fiches.find((x) => x.compte.id === choisi);
      return f ? { ...f, balance: balanceDe(f) } : null;
    }
    return reel?.fiches[choisi] ?? null;
  }, [source, fiches, reel, choisi]);

  useEffect(() => {
    if (source !== "reelle" || !choisi || !reel || reel.fiches[choisi]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setChargeFiche(true);
      try {
        const f = await portes.chargerFiche(choisi);
        if (actif && f) setReel((prev) => (prev ? { ...prev, fiches: { ...prev.fiches, [choisi]: f } } : prev));
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La fiche n'a pas pu être lue.");
      } finally {
        if (actif) setChargeFiche(false);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, choisi, reel]);

  /* ——— les gestes de la fiche : la porte en base réelle, la mémoire en exemple ——— */
  /* un geste fige le compte ouvert : la liste peut se réordonner, la fiche reste */
  const majFiche = (id: string, change: (f: Fiche) => Fiche) => {
    setChoix(id);
    setFiches((prev) => prev.map((f) => (f.compte.id === id ? change(f) : f)));
  };
  const actions: Actions | null = fiche
    ? {
        noterReglement: async (o) => {
          if (source === "reelle") {
            if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
            setChoix(fiche.compte.id);
            const r = await portes.noterReglement({ client: reel.client.client_id, compte: fiche.compte.id, ...o });
            await relire();
            if (r.deja_note) return "Ce règlement était déjà noté : rien n'a été ajouté.";
            return r.a_imputer > 0 ? `Règlement noté ; ${montant(r.a_imputer)} restent à rapprocher.` : "Règlement noté et lettré. La relance prête de la facture est coupée.";
          }
          const cible = o.facture ?? fiche.pieces.find((p) => p.nature !== "devis" && p.nature !== "avoir" && p.statut === "ouverte" && Math.abs(p.montant_ttc - p.regle - p.avoirs_imputes - o.montant) < 0.005)?.id ?? null;
          majFiche(fiche.compte.id, (f) => ({
            ...f,
            pieces: f.pieces.map((p) => {
              if (p.id !== cible) return p;
              const regle = p.regle + o.montant;
              return { ...p, regle, statut: p.montant_ttc - regle - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut };
            }),
            reglements: [...f.reglements, { id: crypto.randomUUID(), compte_id: f.compte.id, recu_le: o.date, montant: o.montant, mode: o.mode, reference: o.reference, libelle: null, statut: "actif", impute: cible ? o.montant : 0, a_imputer: cible ? 0 : o.montant }],
          }));
          if (cible) setRelancesLocales((prev) => prev.map((r) => (r.etat === "a_valider" && r.pieces.some((p) => p.facture_id === cible) ? { ...r, etat: "coupee", statut: "coupee", motif: "facture réglée" } : r)));
          return cible ? "Règlement noté et lettré (exemple) : la relance prête de la facture est coupée." : "Règlement noté (exemple) : il reste à rapprocher.";
        },
        changerStatut: async (statut, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.changerStatut(fiche.compte.id, statut, motif);
            await relire();
            return statut === "actif" ? "Le compte est repris : les relances reprennent au prochain matin." : `Compte mis en pause ; ${r.relances_coupees} relance(s) prête(s) coupée(s).`;
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, compte: { ...f.compte, statut, statut_motif: motif, statut_le: new Date().toISOString() } }));
          if (statut !== "actif") setRelancesLocales((prev) => prev.map((r) => (r.compte_id === fiche.compte.id && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: `compte en pause : ${motif}` } : r)));
          return statut === "actif" ? "Le compte est repris (exemple)." : "Compte mis en pause (exemple) : ses relances prêtes sont coupées.";
        },
        echeancier: async (facture, echeances, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.poserEcheancier(facture, echeances, motif);
            await relire();
            return `Échéancier posé : ${r.echeances} échéance${r.echeances > 1 ? "s" : ""}, la prochaine le ${dateCourte(r.echeance_suivie)}. Seule une échéance manquée relancera le cycle.`;
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, echeance_origine: p.echeance_origine ?? p.echeance, echeance: echeances[0].echeance } : p)) }));
          setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `échéancier négocié : ${motif}` } : x)));
          return `Échéancier posé (exemple) : ${echeances.length} échéances, la prochaine le ${dateCourte(echeances[0].echeance)}.`;
        },
        contester: async (facture, montantConteste, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.litigePartiel(facture, montantConteste, motif);
            await relire();
            return `${montant(r.montant_conteste)} contestés sortent du cycle ; ${montant(r.reste_relancable)} restent relancés. Le commercial du compte est prévenu.`;
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, montant_conteste: montantConteste } : p)) }));
          setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `contestation partielle : ${motif}` } : x)));
          return `${montant(montantConteste)} contestés sortent du cycle (exemple) ; le reste continue d'être relancé.`;
        },
        dossier: async (motif = "litige") => {
          if (source === "reelle") {
            const d = await portes.dossier(fiche.compte.id, motif);
            exporterJson(`dossier-${motif === "assurance_credit" ? "assurance-credit-" : ""}${fiche.compte.reference}-${jourParis()}.json`, d);
            return;
          }
          const jointes = fiche.pieces_jointes ?? [];
          exporterJson(`dossier-${motif === "assurance_credit" ? "assurance-credit-" : ""}${fiche.compte.reference}-${jourParis()}.json`, {
            motif, constitue_le: new Date().toISOString(), debiteur: fiche.compte, balance: balanceDe(fiche),
            pieces_jointes: jointes,
            pdf_manquants: fiche.pieces.filter((p) => (p.nature === "facture" || p.nature === "acompte") && p.statut !== "soldee" && !jointes.some((x) => x.facture_id === p.id && x.nature === "facture_pdf")).map((p) => p.numero),
            pieces: fiche.pieces.map((p) => etatPiece(p)), reglements: fiche.reglements, relances: relancesLocales.filter((x) => x.compte_id === fiche.compte.id),
          });
        },
        proposerPlafond: async () => {
          if (source === "reelle") {
            const p = await portes.proposerPlafond(fiche.compte.id);
            return {
              propose: p?.propose ?? null,
              base: p && p.factures_douze_mois > 0
                ? `Proposé depuis l'historique : ${montant(p.facture_mensuel_moyen)} facturés par mois en moyenne sur douze mois, payés en ${Math.round(p.delai_retenu_jours)} jours, plus une demi-marge.`
                : "Pas d'historique de facturation sur douze mois : fixez le plafond vous-même.",
            };
          }
          const total = fiche.pieces.filter((p) => p.nature === "facture" || p.nature === "acompte").reduce((t, p) => t + p.montant_ttc, 0);
          const mensuel = total / 12;
          return { propose: mensuel > 0 ? Math.ceil((mensuel * 1.5) / 100) * 100 : null, base: `Proposé depuis l'historique (exemple) : ${montant(mensuel)} facturés par mois en moyenne, payés à 30 jours, plus une demi-marge.` };
        },
        fixerPlafond: async (plafond, motif) => {
          if (source === "reelle") {
            await portes.fixerPlafond(fiche.compte.id, plafond, motif);
            await relire();
            return plafond === null ? "Le compte n'a plus de plafond." : `Plafond fixé à ${montant(plafond)} ; le changement est daté au journal.`;
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, compte: { ...f.compte, plafond_encours: plafond } }));
          return plafond === null ? "Le compte n'a plus de plafond (exemple)." : `Plafond fixé à ${montant(plafond)} (exemple).`;
        },
        litige: async (facture, ouvrir, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.litige(facture, ouvrir, motif);
            await relire();
            return ouvrir ? `Facture en litige ; ${r.relances_coupees} relance(s) coupée(s).` : "Litige clos : la facture reprend son cycle.";
          }
          majFiche(fiche.compte.id, (f) => ({ ...f, pieces: f.pieces.map((p) => (p.id === facture ? { ...p, statut: ouvrir ? "litige" : "ouverte", statut_motif: motif } : p)) }));
          return ouvrir ? "Facture en litige (exemple) : elle sort du cycle." : "Litige clos (exemple).";
        },
        attendreCommande: async (facture, email, nom, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.attendreCommande(facture, email, nom, motif);
            await relire();
            return email
              ? `La facture attend son bon de commande : ${nom ?? email} recevra sa relance, par la file de validation. ${r.relances_coupees ? "La relance adressée à la comptabilité est coupée." : ""}`
              : "Bon de commande reçu : la facture reprend son cycle.";
          }
          const piece = fiche.pieces.find((p) => p.id === facture);
          majFiche(fiche.compte.id, (y) => ({
            ...y,
            pieces: y.pieces.map((p) => (p.id === facture
              ? { ...p, attente_commande_le: email ? jourParis() : null, attente_commande_email: email, attente_commande_nom: nom, attente_commande_motif: motif }
              : p)),
          }));
          if (email && piece) {
            setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: "en attente d'un bon de commande" } : x)));
            setCommandesLocales((prev) => [{
              id: crypto.randomUUID(), facture_id: facture, compte_id: fiche.compte.id, jour: jourParis(), destinataire_adresse: email, destinataire_nom: nom,
              sujet: `Atelier Bertin — bon de commande attendu pour la facture ${piece.numero}`, corps: null, statut: "a_valider", motif: null,
            }, ...prev]);
          } else {
            setCommandesLocales((prev) => prev.map((x) => (x.facture_id === facture && x.statut === "a_valider" ? { ...x, statut: "coupee", motif: "bon de commande reçu" } : x)));
          }
          return email ? `La facture attend son bon de commande (exemple) : ${nom ?? email} reçoit sa relance.` : "Bon de commande reçu (exemple) : la facture reprend son cycle.";
        },
        deciderSolde: async (facture, decision, motif) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.deciderSolde(facture, decision, motif);
            await relire();
            return decision === "abandonne" ? `Solde abandonné : il sort de toute relance${r.relances_coupees ? ", la relance prête est coupée" : ""}.` : decision === "reclame" ? "Solde réclamé : il sera relancé malgré le seuil." : "La règle du seuil reprend.";
          }
          majFiche(fiche.compte.id, (y) => ({ ...y, pieces: y.pieces.map((p) => (p.id === facture ? { ...p, solde_decision: decision, solde_decision_motif: motif } : p)) }));
          if (decision === "abandonne") setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === facture) ? { ...x, etat: "coupee", statut: "coupee", motif: `solde abandonné : ${motif}` } : x)));
          return decision === "abandonne" ? "Solde abandonné (exemple)." : decision === "reclame" ? "Solde réclamé (exemple)." : "La règle du seuil reprend (exemple).";
        },
        trancherReponse: async (x, accepter) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            const r = await portes.trancherReponse(x.id, accepter, null);
            await relire();
            return !accepter ? "Proposition écartée : rien ne change ; la décision reste au journal."
              : x.proposition === "litige" ? `${r.effets} facture${r.effets > 1 ? "s" : ""} en litige ; leurs relances prêtes sont coupées.`
              : x.proposition === "attente_contact" ? "Le compte attend un nouveau contact : désignez-le avant toute reprise."
              : "Le compte est en pause le temps du règlement annoncé ; il reprend sur votre décision.";
          }
          majFiche(fiche.compte.id, (y) => {
            const reponses_lues = (y.reponses_lues ?? []).filter((z) => z.id !== x.id);
            if (!accepter) return { ...y, reponses_lues };
            if (x.proposition === "litige") {
              const ids = relancesLocales.find((r) => r.id === x.relance_id)?.pieces.map((p) => p.facture_id) ?? [];
              return { ...y, reponses_lues, pieces: y.pieces.map((p) => (ids.includes(p.id) ? { ...p, statut: "litige", statut_motif: "contestation écrite du client" } : p)) };
            }
            const statut = x.proposition === "attente_contact" ? "attente_contact" : "pause";
            return { ...y, reponses_lues, compte: { ...y.compte, statut, statut_motif: x.proposition === "pause" ? "le client annonce son règlement" : "l'interlocuteur a quitté l'entreprise", statut_le: new Date().toISOString() } };
          });
          if (accepter && x.proposition !== "aucune") setRelancesLocales((prev) => prev.map((r) => (r.compte_id === fiche.compte.id && r.etat === "a_valider" ? { ...r, etat: "coupee", statut: "coupee", motif: "réponse du client tranchée" } : r)));
          return accepter ? "Proposition acceptée (exemple)." : "Proposition écartée (exemple) : rien ne change.";
        },
        joindrePiece: async (facture, nature, fichier) => {
          if (source === "reelle") {
            if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
            setChoix(fiche.compte.id);
            await portes.joindrePiece(reel.client.client_id, facture, nature, fichier);
            setReel((prev) => (prev ? { ...prev, fiches: Object.fromEntries(Object.entries(prev.fiches).filter(([k]) => k !== fiche.compte.id)) } : prev));
            return `${fichier.name} est joint à la facture ; il rejoint ses dossiers.`;
          }
          majFiche(fiche.compte.id, (y) => ({ ...y, pieces_jointes: [...(y.pieces_jointes ?? []), { id: crypto.randomUUID(), facture_id: facture, nature, chemin: `exemple/${fichier.name}`, nom: fichier.name, cree_le: new Date().toISOString() }] }));
          return `${fichier.name} est joint à la facture (exemple, rien n'est envoyé).`;
        },
        consignerAccord: async (devis, note, le) => {
          if (source === "reelle") {
            setChoix(fiche.compte.id);
            await portes.consignerAccord(devis, note, le);
            await relire();
            return "Accord consigné : le devis est accepté, sa cadence s'arrête. Le point du matin suivra la facture à venir.";
          }
          majFiche(fiche.compte.id, (y) => ({ ...y, pieces: y.pieces.map((p) => (p.id === devis ? { ...p, statut: "accepte", accord_oral_le: le, accord_note: note } : p)) }));
          setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === devis) ? { ...x, etat: "coupee", statut: "coupee", motif: `devis accepté de vive voix le ${dateCourte(le)}` } : x)));
          return "Accord consigné (exemple) : le devis est accepté, sa cadence s'arrête.";
        },
      }
    : null;

  /* ——— préparer maintenant (base réelle) ——— */
  const [prepare, setPrepare] = useState(false);
  const preparer = async () => {
    if (!reel?.client) return;
    setPrepare(true);
    setErreur(null);
    try {
      const r = await portes.preparerMaintenant(reel.client.client_id);
      await relire();
      setFait(`${r.preparees} relance${r.preparees > 1 ? "s" : ""} écrite${r.preparees > 1 ? "s" : ""}${r.bloquees ? `, ${r.bloquees} arrêtée${r.bloquees > 1 ? "s" : ""} (voir leur motif)` : ""}. Elles attendent votre validation.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La préparation a échoué.");
    } finally {
      setPrepare(false);
    }
  };

  /* ——— rapprocher un règlement ——— */
  const [propositions, setPropositions] = useState<Record<string, Proposition[]>>({});
  const proposer = async (r: ReglementEtat) => {
    if (source === "reelle") {
      try {
        const p = await portes.chargerPropositions(r.id);
        setPropositions((prev) => ({ ...prev, [r.id]: p }));
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Les propositions n'ont pas pu être lues.");
      }
      return;
    }
    const p: Proposition[] = fiches
      .flatMap((f) => f.pieces.filter((x) => x.nature === "facture" && x.statut === "ouverte").map((x) => ({ f, x, reste: x.montant_ttc - x.regle - x.avoirs_imputes })))
      .filter(({ reste }) => Math.abs(reste - r.a_imputer) < 0.005)
      .map(({ f, x, reste }) => ({ raison: "montant_exact", factures: [{ id: x.id, numero: x.numero, compte: f.compte.nom, reste_du: reste, echeance: x.echeance }] }));
    setPropositions((prev) => ({ ...prev, [r.id]: p }));
  };
  const lettrer = async (r: ReglementEtat, factureId: string) => {
    if (source === "reelle") {
      try {
        await portes.lettrer(r.id, factureId);
        await relire();
        setFait("Règlement rapproché : la facture est lettrée et sa relance coupée si elle était prête.");
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Le lettrage a été refusé.");
      }
      return;
    }
    const f = fiches.find((x) => x.pieces.some((p) => p.id === factureId));
    if (!f) return;
    majFiche(f.compte.id, (y) => ({
      ...y,
      pieces: y.pieces.map((p) => (p.id === factureId ? { ...p, regle: p.regle + r.a_imputer, statut: p.montant_ttc - p.regle - r.a_imputer - p.avoirs_imputes <= 0.005 ? "soldee" : p.statut } : p)),
      reglements: [...y.reglements, { ...r, compte_id: y.compte.id, impute: r.a_imputer, a_imputer: 0 }],
    }));
    setSansCompte((prev) => prev.filter((x) => x.id !== r.id));
    setRelancesLocales((prev) => prev.map((x) => (x.etat === "a_valider" && x.pieces.some((p) => p.facture_id === factureId) ? { ...x, etat: "coupee", statut: "coupee", motif: "facture réglée" } : x)));
    setFait(`Règlement rapproché (exemple) : ${f.compte.nom} est lettré.`);
  };

  /* ——— déposer un export ——— */
  const [depot, setDepot] = useState(false);
  const [jeu, setJeu] = useState<Jeu>("factures");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState("");
  const [complet, setComplet] = useState(true);
  const [envoiDepot, setEnvoiDepot] = useState(false);
  const [erreurDepot, setErreurDepot] = useState<string | null>(null);
  const lecture = useMemo(() => (texte.trim() ? lireDepot(texte, jeu) : null), [texte, jeu]);
  const ouvrirDepot = () => {
    setTexte("");
    setNomFichier("");
    setErreurDepot(null);
    setJeu("factures");
    setComplet(true);
    setDepot(true);
  };
  const lireFichier = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreurDepot(null);
    if (/\.xlsx?$/i.test(fichier.name)) {
      setErreurDepot("Un classeur Excel se dépose par la boîte de relevés de votre facturier (lecture côté serveur). Ici, enregistrez-le d'abord en CSV.");
      return;
    }
    setNomFichier(fichier.name);
    setTexte(await fichier.text());
  };
  const deposer = async () => {
    if (!lecture) return;
    setEnvoiDepot(true);
    setErreurDepot(null);
    try {
      if (source !== "reelle") {
        setFait(`Exemple : ${lecture.lignes.length} ligne${lecture.lignes.length > 1 ? "s" : ""} lue${lecture.lignes.length > 1 ? "s" : ""}, rien n'est envoyé. En base réelle, elles entrent par la porte cashd_importer.`);
        setDepot(false);
        return;
      }
      if (!reel?.client) throw new Error("Aucun compte rattaché à cette session.");
      const r = await portes.importer({ client: reel.client.client_id, jeu, lignes: lecture.lignes, complet: JEUX.find((x) => x.cle === jeu)?.complet ? complet : false, fichier: nomFichier || "collé dans l'espace" });
      await relire();
      setFait(
        `${r.lignes} ligne${r.lignes > 1 ? "s" : ""} lue${r.lignes > 1 ? "s" : ""} : ${r.creees} créée${r.creees > 1 ? "s" : ""}, ${r.modifiees} mise${r.modifiees > 1 ? "s" : ""} à jour` +
          (r.soldees_par_absence ? `, ${r.soldees_par_absence} soldée${r.soldees_par_absence > 1 ? "s" : ""} (absentes de l'export)` : "") +
          (r.lettrees ? `, ${r.lettrees} règlement${r.lettrees > 1 ? "s" : ""} lettré${r.lettrees > 1 ? "s" : ""}` : "") +
          (r.ecartees.length ? `. ${r.ecartees.length} écartée${r.ecartees.length > 1 ? "s" : ""} : ${r.ecartees.slice(0, 3).map((x) => `ligne ${x.ligne + 1} (${x.motif})`).join(", ")}${r.ecartees.length > 3 ? "…" : ""}` : "") +
          ".",
      );
      setDepot(false);
    } catch (e) {
      setErreurDepot(e instanceof Error ? e.message : "Le dépôt a été refusé.");
    } finally {
      setEnvoiDepot(false);
    }
  };

  const t = tableau?.totaux;
  /* le pilotage : taux de réponse par palier et arrêtés de la balance (exemple : les relances parties de l'exemple) */
  const pilotage = useMemo(() => {
    if (source === "reelle") return pilotageReel;
    const premier = `${jourParis().slice(0, 8)}01`;
    return {
      reponses: [
        { palier: "rappel", envoyees: 14, suivies: 9, taux_pct: 64.3 },
        { palier: "relance", envoyees: 6, suivies: 3, taux_pct: 50 },
        { palier: "mise_en_demeure", envoyees: 2, suivies: 2, taux_pct: 100 },
      ],
      arretes: tableau ? [{ jour: premier, balance: tableau.comptes, totaux: { encours: tableau.totaux.encours, echu: tableau.totaux.echu, en_litige: tableau.totaux.en_litige } }] : [],
    };
  }, [source, pilotageReel, tableau]);
  /* la prévision : la porte en base réelle ; en exemple, l'échéance de chaque pièce ouverte (même règle, sans retard habituel) */
  const prevision = useMemo(() => {
    if (source === "reelle") return previsionReelle;
    const jour = jourParis();
    const dans = (n: number) => { const d = new Date(`${jour}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    const ouvertes = fiches.filter((f) => f.compte.statut !== "litige" && f.compte.statut !== "recouvrement" && f.compte.statut !== "hors_perimetre")
      .flatMap((f) => f.pieces.map((p) => etatPiece(p)).filter((p) => (p.nature === "facture" || p.nature === "acompte") && p.statut === "ouverte" && p.reste_du > 0));
    const somme = (limite: string) => ouvertes.filter((p) => (p.echeance ?? jour) <= limite).reduce((s, p) => s + p.reste_du - (p.montant_conteste ?? 0), 0);
    return { a_30_jours: somme(dans(30)), a_60_jours: somme(dans(60)), au_dela: 0, tenu_a_part: 0 };
  }, [source, previsionReelle, fiches]);
  const aValider = relances.filter((r) => r.etat === "a_valider" || r.etat === "non_reglee").length;
  const recentes = relances.filter((r) => r.etat !== "envoyee").slice(0, 12);
  const parties = relances.filter((r) => r.etat === "envoyee" || r.envoye_le);
  const commandes = source === "exemple" ? commandesLocales : commandesReelles;
  const essai = tableau?.reglages?.mode !== "reel";
  const total = t ? Math.max(t.encours, 0.01) : 1;

  /* la vue courante et la fenêtre de dépôt : communes aux deux dessins */
  const vueCourante = (
    <div id="c2-vue" role="tabpanel" aria-labelledby={`c2-onglet-${onglet}`}>
      {onglet === "tresorerie" && t && t.encours > 0 ? (
        <section className="esp-carte c2-balance" aria-label="Balance âgée">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Balance âgée</h2>
            <span className="esp-kpi-sous">
              {tableau?.dernier_import ? `Facturier relu le ${dateHeure(tableau.dernier_import)}` : "Aucun export lu pour l'instant"}
              {t.credits > 0 ? ` · ${montant(t.credits)} de crédits à déduire` : ""}
            </span>
          </div>
          <div className="esp-carte-corps">
            <div className="c2-barre" role="img" aria-label={TRANCHES.map((x) => `${x.libelle} : ${montant(t[x.cle])}`).join(", ")}>
              {TRANCHES.map((x) => (t[x.cle] > 0 ? <span key={x.cle} className={`c2-segment ${x.teinte}`} style={{ width: `${(t[x.cle] / total) * 100}%` }} /> : null))}
            </div>
            {prevision ? (
              <p className="c2-prevision">
                Encaissements attendus : <strong>{montant(prevision.a_30_jours)}</strong> à 30 jours, <strong>{montant(prevision.a_60_jours)}</strong> à 60 jours
                {prevision.tenu_a_part > 0 ? ` ; ${montant(prevision.tenu_a_part)} tenus à part (litiges, recouvrement)` : ""}.
              </p>
            ) : null}
            <dl className="c2-legende">
              {TRANCHES.map((x) => (
                <div key={x.cle}>
                  <dt><span className={`c2-puce ${x.teinte}`} aria-hidden="true" />{x.libelle}</dt>
                  <dd>{montant(t[x.cle])}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}
  
      {(onglet === "debiteurs" || onglet === "relances") && (source === "exemple" || (reel?.tableau?.reglages && essai)) ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="bleu">
            <strong>Mode essai.</strong> Les relances validées partent vers l&apos;adresse d&apos;essai d&apos;Omega, jamais chez vos clients, tant que le gérant n&apos;a pas basculé en réel.
          </Avis>
        </div>
      ) : null}
  
      {onglet === "debiteurs" ? (
      <div className="esp-grille">
        <section className="esp-carte" aria-label="Débiteurs">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{filtre === "echu" ? "Comptes en retard" : filtre === "plus_90" ? "Retards de plus de 90 jours" : filtre === "pause" ? "Comptes hors cycle" : "Débiteurs"}</h2>
            <span className="c2-tete-droite">
              <span className="esp-kpi-sous">{comptes.length} compte{comptes.length > 1 ? "s" : ""}</span>
              <button type="button" className="esp-lien-bouton" onClick={() => exporterBalance(tableau?.comptes ?? [], jourParis())}>
                <Download width={14} height={14} aria-hidden="true" /> Tableur
              </button>
            </span>
          </div>
          {comptes.length === 0 ? (
            <Vide titre="Personne ne vous doit rien ici">{filtre ? "Rien dans ce filtre." : "Déposez l'export des factures non soldées de votre facturier pour commencer."}</Vide>
          ) : (
            <ul className="esp-liste" aria-label="Débiteurs">
              {comptes.map((b) => {
                const s = STATUTS_COMPTE[b.statut];
                return (
                  <li key={b.compte_id}>
                    <button
                      type="button"
                      className="esp-item"
                      aria-current={choisi === b.compte_id ? "true" : undefined}
                      onClick={() => {
                        setChoix(b.compte_id);
                        if (window.innerWidth < 1024) document.getElementById("c2-fiche")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      <span className="esp-item-haut">
                        <span style={{ fontWeight: 600 }}>{b.nom}</span>
                        {b.statut !== "actif" ? <Pastille teinte={s.teinte}>{s.libelle}</Pastille> : b.retard_max_jours > 60 ? <Pastille teinte="rouge">{b.retard_max_jours} j</Pastille> : b.retard_max_jours > 0 ? <Pastille teinte="ambre">{b.retard_max_jours} j</Pastille> : <Pastille teinte="vert">À échoir</Pastille>}
                        {b.depasse_plafond ? <Pastille teinte="rouge" contour>Plafond dépassé</Pastille> : null}
                      </span>
                      <span className="esp-item-montant">{montant(b.echu > 0 ? b.echu : b.encours)}</span>
                      <span className="esp-item-titre">{b.reference}{b.groupe ? ` · ${b.groupe}` : ""}</span>
                      <span className="esp-item-bas">
                        <span>{b.echu > 0 ? `${montant(b.echu)} échus sur ${montant(b.encours)}` : `${montant(b.encours)} à échoir`}</span>
                        <span>{b.factures_echues} facture{b.factures_echues > 1 ? "s" : ""} échue{b.factures_echues > 1 ? "s" : ""}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
  
        <section id="c2-fiche" className="esp-detail-mobile" aria-label="Fiche du compte">
          {fiche && actions ? (
            <FicheCompte key={`${source}:${fiche.compte.id}`} fiche={fiche} actions={actions} />
          ) : chargeFiche || (source === "reelle" && choisi) ? (
            <div className="esp-carte"><Chargement texte="Lecture du compte…" /></div>
          ) : (
            <div className="esp-carte"><Vide titre="Choisissez un compte">Ses factures, la relance de chacune et ses règlements s&apos;affichent ici.</Vide></div>
          )}
        </section>
      </div>
      ) : null}
  
      {onglet === "relances" ? (
      <>
      <section id="c2-relances" className="esp-carte c2-section" aria-label="Relances">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Relances écrites</h2>
          <span className="c2-tete-droite">
            <button type="button" className="esp-lien-bouton" onClick={() => exporterRelances(relances, jourParis())}>
              <Download width={14} height={14} aria-hidden="true" /> Tableur
            </button>
            <Link className="esp-lien-bouton" href="/espace2/validations">Ouvrir la file de validation</Link>
          </span>
        </div>
        {recentes.length === 0 ? (
          <Vide titre="Aucune relance">Les relances s&apos;écrivent chaque matin à 7 h pour les comptes qui ont atteint un palier.</Vide>
        ) : (
          <ul className="c2-relances">
            {recentes.map((r) => {
              const e = ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee;
              return (
                <li key={r.id}>
                  <details>
                    <summary>
                      <span className="esp-item-haut">
                        <strong>{r.compte}</strong>
                        <Pastille teinte={r.palier === "mise_en_demeure" ? "rouge" : "gris"} contour>{libellePalier(r.palier)}</Pastille>
                        <Pastille teinte={e.teinte}>{e.libelle}</Pastille>
                      </span>
                      <span className="c2-relance-ligne">
                        <span>{r.sujet ?? "—"}</span>
                        <span className="esp-num">{montant(r.montant)}</span>
                      </span>
                      <span className="c2-sous">
                        Écrite le {dateCourte(r.jour)}{r.destinataire_adresse ? ` pour ${r.destinataire_adresse}` : ""}
                        {r.envoye_le ? ` · partie le ${dateHeure(r.envoye_le)}` : ""}
                        {r.indemnites > 0 ? ` · indemnité ${montant(r.indemnites)}` : ""}
                        {r.penalites > 0 ? ` · pénalités ${montant(r.penalites)}` : ""}
                      </span>
                      {r.motif ? <span className="c2-sous c2-motif">{r.motif}</span> : null}
                    </summary>
                    {r.corps ? <pre className="c2-corps">{r.corps}</pre> : <p className="c2-sous">Le texte est dans la file de validation.</p>}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
  
      {commandes.length ? (
        <section className="esp-carte c2-section" aria-label="Bons de commande attendus">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Bons de commande attendus</h2>
            <span className="esp-kpi-sous">la relance va au service qui émet le bon, pas à la comptabilité</span>
          </div>
          <ul className="c2-relances">
            {commandes.map((x) => (
              <li key={x.id}>
                <span className="esp-item-haut">
                  <strong>{x.destinataire_nom ?? x.destinataire_adresse}</strong>
                  <Pastille teinte={ETATS_COMMANDE[x.statut].teinte}>{ETATS_COMMANDE[x.statut].libelle}</Pastille>
                </span>
                <span className="c2-relance-ligne"><span>{x.sujet ?? "—"}</span></span>
                <span className="c2-sous">Écrite le {dateCourte(x.jour)} pour {x.destinataire_adresse}{x.motif ? ` · ${x.motif}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
  
      <Textes
        key={`${source}:${reel?.client?.client_id ?? ""}`}
        source={source}
        client={reel?.client?.client_id ?? null}
        reglages={tableau?.reglages ?? null}
        apresReglage={relire}
        gabarit={gabarit}
      />
      </>
      ) : null}
  
      {onglet === "envois" ? (
        <section className="esp-carte c2-section" aria-label="Envois">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Envois</h2>
            <span className="c2-tete-droite">
              <span className="esp-kpi-sous">chaque relance partie, datée, avec son destinataire, son objet et son canal</span>
              <button type="button" className="esp-lien-bouton" onClick={() => exporterRelances(parties, jourParis())}>
                <Download width={14} height={14} aria-hidden="true" /> Tableur
              </button>
            </span>
          </div>
          {parties.length === 0 ? (
            <Vide titre="Rien n'est encore parti">Une relance part une fois validée dans la file ; elle s&apos;inscrit ici avec son heure, son destinataire et son canal.</Vide>
          ) : (
            <div className="esp-tableau-cadre">
              <table className="esp-tableau c2-envois">
                <thead>
                  <tr>
                    <th scope="col">Partie le</th>
                    <th scope="col">Destinataire</th>
                    <th scope="col">Objet</th>
                    <th scope="col">Canal</th>
                    <th scope="col">État</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((r) => {
                    const e = ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee;
                    return (
                      <tr key={r.id}>
                        <td>{r.envoye_le ? dateHeure(r.envoye_le) : dateCourte(r.jour)}</td>
                        <td><strong>{r.compte}</strong><span className="c2-sous">{r.destinataire_adresse ?? "—"}</span></td>
                        <td>{r.sujet ?? "—"}<span className="c2-sous">{libellePalier(r.palier)} · {montant(r.montant)}</span></td>
                        <td>{r.canal === "lre" ? "Recommandé électronique" : r.canal === "whatsapp" ? "WhatsApp" : "Courriel"}</td>
                        <td><Pastille teinte={e.teinte}>{e.libelle}</Pastille></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
  
      {onglet === "tresorerie" && pilotage && (pilotage.reponses.length || pilotage.arretes.length) ? (
        <section className="esp-carte c2-section" aria-label="Pilotage">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Pilotage</h2>
            <span className="esp-kpi-sous">une relance est « suivie » d&apos;un règlement ou d&apos;une réponse dans les quinze jours</span>
          </div>
          <div className="esp-carte-corps c2-pilotage">
            <div>
              <h3 className="esp-section-titre">Taux de réponse par palier</h3>
              {pilotage.reponses.length ? (
                <ul className="c2-reglements">
                  {pilotage.reponses.map((x) => (
                    <li key={x.palier}>
                      <span>{libellePalier(x.palier)}</span>
                      <span className="esp-num">{x.taux_pct === null ? "—" : `${String(x.taux_pct).replace(".", ",")} %`}</span>
                      <span className="c2-sous">{x.suivies} sur {x.envoyees} parties</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="c2-sous">Aucune relance partie pour l&apos;instant.</p>}
            </div>
            <div>
              <h3 className="esp-section-titre">Arrêtés de la balance</h3>
              {pilotage.arretes.length ? (
                <ul className="c2-reglements">
                  {pilotage.arretes.map((a) => (
                    <li key={a.jour}>
                      <span>Au {dateCourte(a.jour)}</span>
                      <span className="esp-num">{montant(a.totaux.echu)} échus</span>
                      <button type="button" className="esp-lien-bouton" onClick={() => exporterBalance(a.balance, a.jour)}>
                        <Download width={14} height={14} aria-hidden="true" /> Tableur
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="c2-sous">Le premier arrêté se prend au jour du mois réglé.</p>}
            </div>
          </div>
        </section>
      ) : null}
  
      {onglet === "tresorerie" && (tableau?.a_imputer ?? []).length ? (
        <section className="esp-carte c2-section" aria-label="Règlements à rapprocher">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Règlements à rapprocher</h2>
            <span className="esp-kpi-sous">la relance du compte concerné attend</span>
          </div>
          <ul className="c2-relances">
            {(tableau?.a_imputer ?? []).map((r) => (
              <li key={r.id} className="c2-rapprocher">
                <span className="c2-relance-ligne">
                  <span><strong>{montant(r.a_imputer)}</strong> reçus le {dateCourte(r.recu_le)} · {r.libelle ?? r.reference ?? "sans référence"}{r.compte ? ` · ${r.compte}` : ""}</span>
                  <button type="button" className="esp-lien-bouton" onClick={() => void proposer(r)}>Factures probables</button>
                </span>
                {propositions[r.id] ? (
                  propositions[r.id].length === 0 ? (
                    <span className="c2-sous">Aucune facture ouverte de ce montant : rapprochez-le depuis la fiche du compte.</span>
                  ) : (
                    <span className="c2-propositions">
                      {propositions[r.id].map((p, i) => (
                        <span key={i}>
                          {p.factures.map((x) => `${x.numero}${x.compte ? ` (${x.compte})` : ""} — ${montant(x.reste_du)}`).join(" + ")}
                          {p.factures.length === 1 ? (
                            <button type="button" className="r-btn" onClick={() => void lettrer(r, p.factures[0].id)}>Lettrer</button>
                          ) : null}
                        </span>
                      ))}
                    </span>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {onglet === "tresorerie" && !(t && t.encours > 0) ? (
        <div className="esp-carte"><Vide titre="Aucun encours">La balance âgée, la prévision d&apos;encaissement et les arrêtés s&apos;affichent dès le premier export lu.</Vide></div>
      ) : null}
      </div>
  );
  const fenetreDepot = (
    <Dialog open={depot} onOpenChange={(o) => !o && setDepot(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><FileUp width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Déposer un export du facturier</DialogTitle>
            <DialogDescription>Un fichier CSV tel que votre logiciel l&apos;exporte : les colonnes sont reconnues par leur en-tête. Rien n&apos;est envoyé avant que vous ayez vu le compte des lignes.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Ce que contient le fichier
                <select className="rv-champ" value={jeu} onChange={(e) => setJeu(e.target.value as Jeu)}>
                  {JEUX.map((x) => <option key={x.cle} value={x.cle}>{x.libelle}</option>)}
                </select>
              </label>
              <p className="c2-sous">{JEUX.find((x) => x.cle === jeu)?.aide}</p>
              <label className="rv-libelle">Fichier CSV
                <input className="rv-champ" type="file" accept=".csv,.txt,.tsv,text/csv" onChange={(e) => void lireFichier(e.target.files?.[0])} />
              </label>
              <label className="rv-libelle">Ou collez les lignes (en-têtes compris)
                <textarea className="rv-champ" rows={4} value={texte} onChange={(e) => { setTexte(e.target.value); setNomFichier(""); }} placeholder="N° facture;Client;Date de facture;Échéance;Montant TTC;Reste dû" />
              </label>
              {JEUX.find((x) => x.cle === jeu)?.complet ? (
                <label className="c2-coche">
                  <input type="checkbox" checked={complet} onChange={(e) => setComplet(e.target.checked)} />
                  <span>Ce fichier liste toutes les pièces encore ouvertes : celles qui n&apos;y sont plus sont soldées.</span>
                </label>
              ) : null}
              {lecture ? (
                lecture.manque.length || lecture.sansClient ? (
                  <Avis teinte="ambre">
                    Colonnes introuvables : {[...lecture.manque.map((k) => LIBELLES_CHAMPS[k] ?? k), ...(lecture.sansClient ? ["client (code ou nom)"] : [])].join(", ")}. Vérifiez la première ligne du fichier.
                  </Avis>
                ) : (
                  <Avis teinte="vert" role="status">
                    {lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""} lue{lecture.lignes.length > 1 ? "s" : ""} ; colonnes reconnues : {lecture.reconnues.map((x) => x.entete).join(", ")}.
                    {lecture.ignorees.length ? ` Ignorées : ${lecture.ignorees.join(", ")}.` : ""}
                  </Avis>
                )
              ) : null}
              {erreurDepot ? <Avis teinte="rouge" role="alert">{erreurDepot}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!lecture || !!lecture.manque.length || lecture.sansClient || !lecture.lignes.length || envoiDepot} onClick={deposer}>
              {envoiDepot ? <Loader variant="spin" /> : null} Déposer {lecture?.lignes.length ? `${lecture.lignes.length} ligne${lecture.lignes.length > 1 ? "s" : ""}` : ""}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );

  /* 22/10 — /espace2 : chaque vue est une page Supabase (le volet de
     navigation porte Débiteurs, Relances, Envois, Trésorerie) : Débiteurs
     au gabarit Users (grille et fiche dans le volet), Envois au gabarit
     Logs (filtres, table dense), Relances et Trésorerie au gabarit Tables
     (titre, actions, contenu). /espace garde son écran à onglets. */
  if (gabarit === "sb") {
    const actionsHaut = (
      <>
        <button type="button" className="v2-btn" onClick={() => exporterBalance(tableau?.comptes ?? [], jourParis())}>
          <Download width={14} height={14} aria-hidden="true" /> Tableur
        </button>
        {source === "reelle" && reel?.client ? (
          <button type="button" className="v2-btn" disabled={prepare} onClick={preparer}>
            {prepare ? <Loader variant="spin" /> : <PenLine width={14} height={14} aria-hidden="true" />} Écrire les relances du jour
          </button>
        ) : null}
        <button type="button" className="v2-btn v2-btn--primaire" onClick={ouvrirDepot}>
          <FileUp width={14} height={14} aria-hidden="true" /> Déposer un export
        </button>
      </>
    );
    const messages = (
      <>
        {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
        {erreur ? <Avis teinte="rouge" role="alert"><strong>La base réelle a répondu autrement.</strong> {erreur}</Avis> : null}
        {source === "reelle" && reel && !reel.tableau?.reglages && !erreur ? <Avis teinte="bleu">CASHD n&apos;est pas encore installé pour votre organisation : Omega l&apos;installe en mode essai, puis vous déposez le premier export de votre facturier.</Avis> : null}
      </>
    );
    const TITRES: Record<Onglet, string> = { debiteurs: "Débiteurs", relances: "Relances", envois: "Envois", tresorerie: "Trésorerie" };
    const chargement = source === "reelle" && !reel;

    if (onglet === "debiteurs") {
      return (
        <>
          <div className="sb-conseil v2-arrivee">
            <div className="sb-conseil-tete">
              <h1 className="sb-conseil-titre">Débiteurs</h1>
            </div>
            <div className="sb-donnees-outils">
              <div>
                <span className="v2-champ" style={{ height: 26, padding: "0 8px" }}>
                  <select aria-label="Filtrer les débiteurs" value={filtre ?? ""} onChange={(e) => setFiltre((e.target.value || null) as Filtre)} style={{ fontSize: 12 }}>
                    <option value="">Tous les débiteurs</option>
                    <option value="echu">Comptes en retard</option>
                    <option value="plus_90">Retards de plus de 90 jours</option>
                    <option value="pause">Comptes hors cycle</option>
                  </select>
                </span>
                {source === "exemple" || (reel?.tableau?.reglages && essai) ? <span className="sb-badge" data-teinte="ambre">mode essai</span> : null}
              </div>
              <div>{actionsHaut}</div>
            </div>
            {fait || erreur ? <div style={{ padding: "12px 24px 0", display: "grid", gap: 8 }}>{messages}</div> : null}
            <div className="sb-conseil-corps">
              <div className="sb-grille-donnees sb-grille-colonnes">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Compte</th>
                      <th scope="col">Référence</th>
                      <th scope="col">Échu</th>
                      <th scope="col">Encours</th>
                      <th scope="col">Retard</th>
                      <th scope="col">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comptes.map((b) => {
                      const st = STATUTS_COMPTE[b.statut];
                      return (
                        <tr key={b.compte_id} aria-selected={choisi === b.compte_id} tabIndex={0} onClick={() => setChoix(b.compte_id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChoix(b.compte_id); } }}>
                          <td>{b.nom}</td>
                          <td className="sb-mono">{b.reference}{b.groupe ? ` · ${b.groupe}` : ""}</td>
                          <td className="sb-mono">{b.echu > 0 ? montant(b.echu) : "—"}</td>
                          <td className="sb-mono">{montant(b.encours)}</td>
                          <td className="sb-mono">{b.retard_max_jours > 0 ? `${b.retard_max_jours} j` : "—"}</td>
                          <td>
                            {b.statut !== "actif" ? <Pastille teinte={st.teinte}>{st.libelle}</Pastille> : b.depasse_plafond ? <Pastille teinte="rouge">Plafond dépassé</Pastille> : b.echu > 0 ? <Pastille teinte="ambre">En retard</Pastille> : <Pastille teinte="vert">À échoir</Pastille>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {chargement ? (
                  <Chargement texte="Lecture de l'encours…" />
                ) : !comptes.length ? (
                  <div className="sb-conseil-vide">
                    <p style={{ margin: 0 }}>Personne ne vous doit rien ici</p>
                    <span>{filtre ? "Rien dans ce filtre." : "Déposez l'export des factures non soldées de votre facturier pour commencer."}</span>
                  </div>
                ) : null}
              </div>
              {fiche && actions ? (
                <aside className="sb-volet-detail sb-volet-detail--large" aria-label="Fiche du compte">
                  <div className="sb-volet-detail-corps">
                    <FicheCompte key={`${source}:${fiche.compte.id}`} fiche={fiche} actions={actions} />
                  </div>
                </aside>
              ) : chargeFiche || (source === "reelle" && choisi) ? (
                <aside className="sb-volet-detail sb-volet-detail--large"><Chargement texte="Lecture du compte…" /></aside>
              ) : null}
            </div>
            <div className="sb-donnees-pied">
              <span>Total : {comptes.length} compte{comptes.length > 1 ? "s" : ""} · {montant(t?.echu ?? 0)} échus sur {montant(t?.encours ?? 0)}</span>
            </div>
          </div>
          {fenetreDepot}
        </>
      );
    }

    if (onglet === "envois") {
      const canal = (r: Relance) => (r.canal === "lre" ? "Recommandé électronique" : r.canal === "whatsapp" ? "WhatsApp" : "Courriel");
      const canaux = Array.from(new Set(parties.map(canal)));
      const vus = parties.filter((r) => !canalChoisi || canal(r) === canalChoisi);
      return (
        <div className="sb-journal v2-arrivee">
          <h1 className="v2-sr">Envois</h1>
          <aside className="sb-journal-filtres" aria-label="Filtres">
            <div className="sb-journal-groupe">
              <p>Canal</p>
              <label className="sb-journal-option">
                <input type="radio" name="canal" checked={!canalChoisi} onChange={() => setCanalChoisi(null)} />
                <span>Tous les canaux</span>
                <span>{parties.length}</span>
              </label>
              {canaux.map((c) => (
                <label key={c} className="sb-journal-option">
                  <input type="radio" name="canal" checked={canalChoisi === c} onChange={() => setCanalChoisi(c)} />
                  <span>{c}</span>
                  <span>{parties.filter((r) => canal(r) === c).length}</span>
                </label>
              ))}
            </div>
            <div className="sb-journal-groupe">
              <p>Export</p>
              <button type="button" className="v2-btn v2-btn--petit" onClick={() => exporterRelances(vus, jourParis())}>
                <Download width={12} height={12} aria-hidden="true" /> Tableur
              </button>
            </div>
          </aside>
          <div className="sb-journal-principal">
            <div className="sb-journal-barre">
              <span>Chaque relance partie, datée, avec son destinataire, son objet et son canal</span>
            </div>
            <div className="sb-conseil-corps">
              <div className="sb-journal-table">
                {chargement ? (
                  <Chargement texte="Lecture des envois…" />
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Partie le</th>
                        <th scope="col">Compte</th>
                        <th scope="col">Destinataire</th>
                        <th scope="col">Objet</th>
                        <th scope="col">Palier</th>
                        <th scope="col">Montant</th>
                        <th scope="col">Canal</th>
                        <th scope="col">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vus.map((r) => {
                        const e = ETATS_RELANCE[r.etat] ?? ETATS_RELANCE.preparee;
                        return (
                          <tr key={r.id}>
                            <td className="sb-mono">{r.envoye_le ? dateHeure(r.envoye_le) : dateCourte(r.jour)}</td>
                            <td>{r.compte}</td>
                            <td className="sb-mono">{r.destinataire_adresse ?? "—"}</td>
                            <td>{r.sujet ?? "—"}</td>
                            <td>{libellePalier(r.palier)}</td>
                            <td className="sb-mono">{montant(r.montant)}</td>
                            <td>{canal(r)}</td>
                            <td><Pastille teinte={e.teinte}>{e.libelle}</Pastille></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {!chargement && !vus.length ? (
                  <div className="sb-conseil-vide">
                    <p style={{ margin: 0 }}>Rien n&apos;est encore parti</p>
                    <span>Une relance part une fois validée dans la file ; elle s&apos;inscrit ici avec son heure, son destinataire et son canal.</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="sb-liste v2-arrivee">
          <div className="sb-liste-tete">
            <div>
              <h1 className="sb-titre">{TITRES[onglet]}</h1>
              <p className="sb-description">
                {onglet === "relances" ? "Les relances écrites chaque matin à 7 h, les bons de commande attendus et vos textes ; aucune ne part sans votre validation." : "La balance âgée, la prévision d'encaissement, le pilotage et les règlements à rapprocher."}
              </p>
            </div>
            <div className="sb-actions">{actionsHaut}</div>
          </div>
          {messages}
          {chargement ? <Chargement texte="Lecture de l'encours…" /> : vueCourante}
        </div>
        {fenetreDepot}
      </>
    );
  }

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Relances</h1>
          <p className="esp-sous">
            Qui vous doit de l&apos;argent, depuis quand, et où en est la relance. Chaque matin à 7 h, les relances sont écrites à partir de votre facturier relu ; aucune ne part sans votre validation.
          </p>
        </div>
        <div className="esp-item-haut">
          <button type="button" className="r-btn r-btn--noir" onClick={ouvrirDepot}><FileUp width={15} height={15} aria-hidden="true" /> Déposer un export</button>
          {source === "reelle" && reel?.client ? (
            <button type="button" className="r-btn" disabled={prepare} onClick={preparer}>{prepare ? <Loader variant="spin" /> : <PenLine width={15} height={15} aria-hidden="true" />} Écrire les relances du jour</button>
          ) : null}
          <Ruban source={source} />
        </div>
      </div>

      {fait ? <div style={{ marginBottom: 14 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 14 }}><Avis teinte="rouge" role="alert"><strong>La base réelle a répondu autrement.</strong> {erreur}</Avis></div> : null}
      {source === "reelle" && reel && !reel.tableau?.reglages && !erreur ? (
        <div style={{ marginBottom: 14 }}><Avis teinte="bleu">CASHD n&apos;est pas encore installé pour votre organisation : Omega l&apos;installe en mode essai, puis vous déposez le premier export de votre facturier.</Avis></div>
      ) : null}

      {source === "reelle" && !reel ? (
        <div className="esp-carte"><Chargement texte="Lecture de l'encours…" /></div>
      ) : (
        <>
          <div className="esp-kpis" data-arrivee="">
            <button type="button" className="esp-kpi" data-teinte={t?.echu ? "rouge" : undefined} aria-pressed={filtre === "echu"} onClick={() => setFiltre(filtre === "echu" ? null : "echu")}>
              <span className="esp-kpi-etiquette">Encours échu</span>
              <span className="esp-kpi-valeur c2-kpi-montant">{montant(t?.echu ?? 0)}</span>
              <span className="esp-kpi-sous">{t?.comptes_en_retard ?? 0} compte{(t?.comptes_en_retard ?? 0) > 1 ? "s" : ""} en retard · encours total {montant(t?.encours ?? 0)}</span>
            </button>
            <button type="button" className="esp-kpi" data-teinte={t?.echu_plus_90 ? "rouge" : undefined} aria-pressed={filtre === "plus_90"} onClick={() => setFiltre(filtre === "plus_90" ? null : "plus_90")}>
              <span className="esp-kpi-etiquette">Plus de 90 jours</span>
              <span className="esp-kpi-valeur c2-kpi-montant">{montant(t?.echu_plus_90 ?? 0)}</span>
              <span className="esp-kpi-sous">le plus difficile à rattraper</span>
            </button>
            <button type="button" className="esp-kpi" data-teinte={aValider ? "ambre" : undefined} onClick={() => setOnglet("relances")}>
              <span className="esp-kpi-etiquette">Relances à valider</span>
              <span className="esp-kpi-valeur">{aValider}</span>
              <span className="esp-kpi-sous">écrites ce matin, rien n&apos;est parti</span>
            </button>
            <button type="button" className="esp-kpi" data-teinte={(tableau?.comptes ?? []).some((b) => b.statut !== "actif") ? "ambre" : undefined} aria-pressed={filtre === "pause"} onClick={() => setFiltre(filtre === "pause" ? null : "pause")}>
              <span className="esp-kpi-etiquette">Hors cycle</span>
              <span className="esp-kpi-valeur">{(tableau?.comptes ?? []).filter((b) => b.statut !== "actif").length}</span>
              <span className="esp-kpi-sous">pause, litige, recouvrement</span>
            </button>
          </div>

          <div className="esp-onglets c2-onglets" role="tablist" aria-label="Les vues de CASHD">
            {ONGLETS.map((o) => (
              <button key={o.cle} type="button" role="tab" id={`c2-onglet-${o.cle}`} aria-controls="c2-vue" aria-selected={onglet === o.cle} className="esp-onglet" onClick={() => setOnglet(o.cle)}>
                {o.libelle}
                {o.cle === "relances" && aValider ? <span className="c2-compte">{aValider}</span> : null}
              </button>
            ))}
          </div>

          {vueCourante}
        </>
      )}

      {fenetreDepot}
    </>
  );
}
