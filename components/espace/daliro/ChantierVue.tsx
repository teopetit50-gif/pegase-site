"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le tableau d'un chantier DALIRO (05/10/2026, session B6)

   Sept cartes : l'en-tête (statut, étape, maître d'ouvrage, dates), les
   contrôles (bloquants d'abord — la base les calcule, l'écran les montre),
   les lots et leur déboursé (engagé au marché + avenants signés, facturé,
   reste), le marché (lignes, contrôles ligne à ligne, écart accepté avec
   son motif, vérification, réouverture par le gérant), le planning
   (passages, confirmation J-2, réponse notée, remplaçants, dépendances),
   les avenants (travaux supplémentaires chiffrés sur un prix VALIDÉ de la
   bibliothèque, soumis à la file de validation, signés), les factures
   (rattachées à leurs lots) et l'annuaire (vigilance) avec la bibliothèque.

   Toutes les écritures passent par les portes (portes.ts) ; en exemple
   elles sont appliquées en mémoire pour que l'enchaînement se voie.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardCheck, FileSignature, FileText, Link2, MessageSquare, PenLine, Plus, RotateCcw, Unlock, Users } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import SituationsCarte from "./SituationsCarte";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte, dateHeure, montant, nombreFr, pourcent } from "../format";
import { ACCEPTATIONS, CONFIRMATIONS, CONTROLES_LIGNE, EXECUTIONS, GRAVITES, ROLES_TIERS, STATUTS_AVENANT, STATUTS_CHANTIER, UNITES, VIGILANCES, familleControle, libelleEnvoi, libelleStatutFacture, libelleUnite } from "./etats";
import { FACTURES_CANDIDATES_EXEMPLE } from "./exemples";
import { abandonnerAvenant, accepterEcart, changerStatutChantier, chargerFacturesCandidates, chiffrerLigneAvenant, confirmerDependance, detacherFacture, ecrireLigne, ecrireMarche, ouvrirAvenant, poserPrix, proposerDependances, proposerRemplacants, rattacherFacture, repondreConfirmation, retirerLigneAvenant, rouvrirMarche, signerAvenant, soumettreAvenant, validerPrix, verifierMarche } from "./portes";
import type { Avenant, FactureCandidate, LigneAvenant, LigneMarche, Marche, Passage, Prix, Remplacant, Tableau } from "./types";

type Props = { tableau: Tableau; source: Source; onLocal: (t: Tableau) => void; relire: () => Promise<void> };

type Form =
  | { type: "ecart"; ligne: LigneMarche }
  | { type: "lot_ligne"; ligne: LigneMarche }
  | { type: "ligne"; marche: Marche }
  | { type: "marche" }
  | { type: "rouvrir"; marche: Marche }
  | { type: "verifier"; marche: Marche }
  | { type: "reponse"; passage: Passage }
  | { type: "remplacants"; passage: Passage }
  | { type: "avenant" }
  | { type: "chiffrer"; avenant: Avenant }
  | { type: "soumettre"; avenant: Avenant }
  | { type: "signer"; avenant: Avenant }
  | { type: "abandonner"; avenant: Avenant }
  | { type: "facture" }
  | { type: "detacher"; facture_id: string }
  | { type: "prix" }
  | { type: "statut"; statut: string }
  | null;

const maintenant = () => new Date().toISOString();
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function ChantierVue({ tableau, source, onLocal, relire }: Props) {
  const { chantier: c, lots, marches, passages, avenants, factures, debourse, tiers, bibliotheque, voit_prix } = tableau;
  const [form, setForm] = useState<Form>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [remplacants, setRemplacants] = useState<Remplacant[] | null>(null);
  const [candidates, setCandidates] = useState<FactureCandidate[] | null>(null);
  const [orga, setOrga] = useState(false);
  const ch = (k: string) => champs[k] ?? "";
  const pose = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));

  const marche = marches.find((m) => m.statut === "verifie") ?? marches[0] ?? null;
  const controles = useMemo(() => [...tableau.controles].sort((a, b) => ["bloquant", "attention", "info"].indexOf(a.gravite) - ["bloquant", "attention", "info"].indexOf(b.gravite)), [tableau.controles]);
  const prixValides = bibliotheque.filter((p) => p.statut === "valide");
  const lotNom = (id: string | null) => (id ? lots.find((l) => l.id === id)?.code ?? "?" : "—");

  const ouvrir = async (f: Form) => {
    setErreur(null);
    setChamps(f?.type === "ligne" ? { nature: "ouvrage", unite: "u" } : f?.type === "marche" ? { mode_prix: "forfait" } : f?.type === "chiffrer" ? { mode: prixValides.length ? "bibliotheque" : "saisie", sens: "1", unite: "u" } : f?.type === "signer" ? { date: aujourdhui() } : f?.type === "reponse" ? { reponse: "confirmee" } : f?.type === "avenant" ? { canal: "vocal" } : {});
    setForm(f);
    if (f?.type === "remplacants") {
      setRemplacants(null);
      if (source === "reelle") {
        try { setRemplacants(await proposerRemplacants(f.passage.id)); } catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); setRemplacants([]); }
      } else {
        const lot = lots.find((l) => l.id === f.passage.lot_id);
        setRemplacants(tiers.filter((t) => t.actif && t.roles.includes("sous_traitant") && t.id !== f.passage.tiers_id && (!lot?.corps_etat || t.corps_etat.includes(lot.corps_etat)) && !["absente", "echue"].includes(t.vigilance ?? "")).map((t) => ({ tiers_id: t.id, nom: t.nom, telephone: t.telephone, email: t.email, canal: t.canal ?? "email", vigilance: t.vigilance ?? "sans_objet", corps_commun: true, departement_ok: t.departements.length === 0 || t.departements.includes(c.departement) })));
      }
    }
    if (f?.type === "facture") {
      setCandidates(null);
      if (source === "reelle") {
        try { setCandidates(await chargerFacturesCandidates(factures.map((x) => x.facture_id))); } catch (e) { setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); setCandidates([]); }
      } else {
        setCandidates(FACTURES_CANDIDATES_EXEMPLE.filter((x) => !factures.some((y) => y.facture_id === x.id)));
      }
    }
  };
  const fermer = () => setForm(null);

  /* une action : en base réelle, la porte puis la relecture ; en exemple, le tableau modifié en mémoire */
  const agir = async (reelle: () => Promise<unknown>, locale: () => Tableau, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reelle();
        await relire();
      } else {
        await new Promise((r) => setTimeout(r, 250));
        onLocal(locale());
      }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— calculs locaux (exemple) ——— */
  const recalculerDebourse = (t: Tableau): Tableau => ({
    ...t,
    debourse: t.lots.map((l) => {
      const engage = t.marches.filter((m) => m.statut === "verifie").flatMap((m) => m.lignes).filter((x) => x.lot_id === l.id && x.nature !== "option").reduce((s, x) => s + (x.montant_ht ?? 0), 0);
      const av = t.avenants.filter((a) => a.statut === "signe").flatMap((a) => a.lignes).filter((x) => x.lot_id === l.id).reduce((s, x) => s + (x.montant_ht ?? 0), 0);
      const fac = t.factures.filter((x) => x.lot_id === l.id && x.statut === "rattachee").reduce((s, x) => s + (x.montant_ht ?? 0), 0);
      return { lot_id: l.id, code: l.code, libelle: l.libelle, execution: l.execution, tiers_id: l.tiers_id, lot_statut: l.statut, nb_factures: t.factures.filter((x) => x.lot_id === l.id && x.statut === "rattachee").length, engage_marche_ht: engage, engage_avenants_ht: av, facture_ht: fac, reste_ht: engage + av - fac };
    }),
  });
  const avecMarche = (m: Marche): Tableau => recalculerDebourse({ ...tableau, marches: tableau.marches.map((x) => (x.id === m.id ? m : x)) });
  const avecAvenant = (a: Avenant): Tableau => recalculerDebourse({ ...tableau, avenants: tableau.avenants.some((x) => x.id === a.id) ? tableau.avenants.map((x) => (x.id === a.id ? x && a : x)) : [...tableau.avenants, a] });
  const controlesMarche = (m: Marche): Marche["controles"] =>
    m.statut !== "a_verifier" ? [] : [
      ...m.lignes.filter((l) => l.nature !== "option" && (l.controle === "incomplet" || (l.controle === "montant_faux" && !l.ecart_accepte))).map((l) => ({ ligne_id: l.id, ordre: l.ordre, code: l.controle, bloquant: true, message: l.controle === "incomplet" ? "Quantité, unité, prix unitaire ou montant manquant." : "Le montant n'est pas quantité × prix unitaire." })),
      ...m.lignes.filter((l) => l.nature !== "option" && l.controle === "montant_faux" && l.ecart_accepte).map((l) => ({ ligne_id: l.id, ordre: l.ordre, code: "montant_faux", bloquant: false, message: `Écart accepté : ${l.ecart_motif}` })),
      ...m.lignes.filter((l) => l.nature !== "option" && !l.lot_id).map((l) => ({ ligne_id: l.id, ordre: l.ordre, code: "sans_lot", bloquant: true, message: "Ligne rattachée à aucun lot du chantier." })),
      ...(m.montant_ht_declare !== null && Math.abs(m.montant_ht_declare - (m.total_ht_lignes ?? 0)) > 1 ? [{ ligne_id: null, ordre: null, code: "total_different", bloquant: true, message: "Le total des lignes diffère du total du devis de plus d'un euro." }] : []),
    ];
  const totalLignes = (m: Marche) => m.lignes.filter((l) => l.nature !== "option").reduce((s, l) => s + (l.montant_ht ?? 0), 0);

  /* ——— les actions ——— */
  const faireEcart = (l: LigneMarche) => agir(
    () => accepterEcart(l.id, ch("motif")),
    () => {
      const m = marches.find((x) => x.id === l.marche_id)!;
      const m2 = { ...m, lignes: m.lignes.map((x) => (x.id === l.id ? { ...x, ecart_accepte: true, ecart_motif: ch("motif").trim() } : x)) };
      return avecMarche({ ...m2, controles: controlesMarche(m2) });
    },
    `L'écart de la ligne ${l.numero ?? l.ordre} est accepté avec son motif ; il reste au journal.`,
  );
  const faireLotLigne = (l: LigneMarche) => agir(
    () => ecrireLigne(l.id, null, { lot_id: ch("lot_id") || null }),
    () => {
      const m = marches.find((x) => x.id === l.marche_id)!;
      const m2 = { ...m, lignes: m.lignes.map((x) => (x.id === l.id ? { ...x, lot_id: ch("lot_id") || null } : x)) };
      return avecMarche({ ...m2, controles: controlesMarche(m2) });
    },
    `La ligne ${l.numero ?? l.ordre} est rattachée au lot ${lotNom(ch("lot_id") || null)}.`,
  );
  const faireLigne = (m: Marche) => {
    const q = Number(ch("quantite").replace(",", ".")); const pu = Number(ch("pu").replace(",", ".")); const mt = Number(ch("montant").replace(",", "."));
    const nature = ch("nature") as LigneMarche["nature"];
    const champsPorte: Record<string, unknown> = { designation: ch("designation").trim(), nature, lot_id: ch("lot_id") || null, numero: ch("numero").trim() || null, unite: ch("unite") || null };
    if (nature !== "forfait") { champsPorte.quantite = q; champsPorte.prix_unitaire_ht = pu; }
    champsPorte.montant_ht = nature === "forfait" ? mt : (ch("montant") ? mt : Math.round(q * pu * 100) / 100);
    return agir(
      () => ecrireLigne(null, m.id, champsPorte),
      () => {
        const montant_ht = champsPorte.montant_ht as number;
        const controle: LigneMarche["controle"] = nature === "forfait" ? (Number.isNaN(mt) ? "incomplet" : "ok") : !q || !pu || !ch("unite") ? "incomplet" : Math.abs(Math.round(q * pu * 100) / 100 - montant_ht) > 0.01 ? "montant_faux" : "ok";
        const l: LigneMarche = { id: nid(), marche_id: m.id, lot_id: ch("lot_id") || null, ordre: (Math.max(0, ...m.lignes.map((x) => x.ordre)) || 0) + 1, numero: ch("numero").trim() || null, section: null, designation: ch("designation").trim(), unite: ch("unite") || null, quantite: nature === "forfait" ? null : q, nature, controle, ecart_accepte: false, ecart_motif: null, corrigee: false, prix_unitaire_ht: nature === "forfait" ? null : pu, montant_ht, ecart: nature === "forfait" ? null : Math.round((montant_ht - q * pu) * 100) / 100 };
        const m2 = { ...m, lignes: [...m.lignes, l] };
        m2.total_ht_lignes = totalLignes(m2);
        return avecMarche({ ...m2, controles: controlesMarche(m2) });
      },
      "La ligne est ajoutée au marché ; son contrôle est calculé.",
    );
  };
  const faireMarche = () => agir(
    () => ecrireMarche(null, c.id, { reference: ch("reference").trim() || null, objet: ch("objet").trim() || null, mode_prix: ch("mode_prix"), montant_ht_declare: ch("montant") ? Number(ch("montant").replace(",", ".")) : null, date_signature: ch("date") || null }),
    () => {
      const m: Marche = { id: nid(), chantier_id: c.id, reference: ch("reference").trim() || null, objet: ch("objet").trim() || null, date_signature: ch("date") || null, mode_prix: ch("mode_prix") as Marche["mode_prix"], retenue_taux: 0, retenue_base: "ttc", retenue_caution: false, source: "saisie", piece_id: null, statut: "a_verifier", verifie_par: null, verifie_libelle: null, verifie_le: null, montant_ht_declare: ch("montant") ? Number(ch("montant").replace(",", ".")) : null, total_ht_lignes: 0, lignes: [], controles: [] };
      return { ...tableau, marches: [...tableau.marches, m], controles: [...tableau.controles.filter((k) => k.code !== "chantier_sans_marche_verifie"), { chantier_id: c.id, objet_type: "btp_marches", objet_id: m.id, code: "marche_a_verifier", gravite: "bloquant", message: `Marché ${m.reference ?? "sans référence"} : à vérifier ligne à ligne avant tout chiffrage.` }] };
    },
    "Le marché est saisi, à vérifier ligne à ligne.",
  );
  const faireVerifier = (m: Marche) => agir(
    () => verifierMarche(m.id),
    () => {
      const bloquants = controlesMarche(m).filter((k) => k.bloquant);
      if (bloquants.length || !m.lignes.length) throw new Error(`Marché non vérifiable : ${!m.lignes.length ? "il n'a aucune ligne" : bloquants.map((k) => k.message).join(" ; ")}`);
      const m2: Marche = { ...m, statut: "verifie", verifie_le: maintenant(), verifie_libelle: "Vous", controles: [] };
      const nouveaux: Prix[] = m.lignes.filter((l) => (l.nature === "ouvrage" || l.nature === "fourniture") && l.unite && (l.prix_unitaire_ht ?? 0) > 0 && !bibliotheque.some((b) => b.designation.toLowerCase() === l.designation.toLowerCase() && b.unite === l.unite && b.prix_unitaire_ht === l.prix_unitaire_ht && b.statut !== "retire"))
        .map((l) => ({ id: nid(), designation: l.designation, unite: l.unite!, corps_etat: lots.find((x) => x.id === l.lot_id)?.corps_etat ?? null, origine: "marche", ligne_marche_id: l.id, date_prix: m.date_signature ?? aujourdhui(), statut: "propose", prix_unitaire_ht: l.prix_unitaire_ht }));
      const t = avecMarche(m2);
      return { ...t, bibliotheque: [...t.bibliotheque, ...nouveaux], controles: t.controles.filter((k) => k.code !== "marche_a_verifier" && k.code !== "chantier_sans_marche_verifie") };
    },
    "Le marché est vérifié et figé ; ses prix sont proposés à la bibliothèque.",
  );
  const faireRouvrir = (m: Marche) => agir(
    () => rouvrirMarche(m.id, ch("motif")),
    () => { const m2: Marche = { ...m, statut: "a_verifier", verifie_le: null, verifie_libelle: null, verifie_par: null }; const t = avecMarche({ ...m2, controles: controlesMarche(m2) }); return { ...t, controles: [...t.controles, { chantier_id: c.id, objet_type: "btp_marches", objet_id: m.id, code: "marche_a_verifier", gravite: "bloquant", message: `Marché ${m.reference ?? "sans référence"} : à vérifier ligne à ligne avant tout chiffrage.` }] }; },
    "Le marché est rouvert : corrigez, puis vérifiez-le de nouveau.",
  );
  const faireReponse = (p: Passage) => agir(
    () => repondreConfirmation(p.id, ch("reponse") as "confirmee" | "declinee", `bureau:${p.id}:${Date.now()}`, { canal: "telephone", texte: ch("texte").trim() || null }),
    () => ({ ...tableau, passages: passages.map((x) => (x.id === p.id ? { ...x, confirmation: ch("reponse") as Passage["confirmation"], confirmation_le: maintenant(), confirmations: [...(x.confirmations ?? []), { id: nid(), passage_id: p.id, evenement: ch("reponse") as "confirmee" | "declinee", canal: "telephone", cle: `bureau:${p.id}`, detail: { texte: ch("texte").trim() }, survenu_le: maintenant() }] } : x)) }),
    ch("reponse") === "confirmee" ? "Le passage est confirmé ; la réponse est au fil." : "Le passage est décliné ; des remplaçants sont proposés et le conducteur est prévenu.",
  );
  const faireDependance = (id: string, confirmee: boolean) => agir(
    () => confirmerDependance(id, confirmee),
    () => ({ ...tableau, dependances: tableau.dependances.map((d) => (d.id === id ? { ...d, confirmee } : d)) }),
    confirmee ? "La dépendance est confirmée." : "La dépendance est remise en proposition.",
  );
  const faireProposerDependances = () => agir(
    () => proposerDependances(c.id),
    () => tableau,
    "Les dépendances d'après l'ordre des corps d'état sont proposées ; confirmez-les.",
  );
  const faireAvenant = () => agir(
    () => ouvrirAvenant(c.id, ch("objet").trim(), { canal: ch("canal"), auteur: ch("auteur").trim() || null, date: aujourdhui(), texte: ch("texte").trim() || null }),
    () => avecAvenant({ id: nid(), chantier_id: c.id, marche_id: marche?.statut === "verifie" ? marche.id : null, numero: (Math.max(0, ...avenants.map((a) => a.numero)) || 0) + 1, objet: ch("objet").trim(), origine: { canal: ch("canal"), auteur: ch("auteur").trim(), date: aujourdhui(), texte: ch("texte").trim() }, statut: "brouillon", demande_id: null, demande_statut: null, piece_id: null, soumis_le: null, signe_le: null, signe_par: null, signe_libelle: null, motif: null, cree_le: maintenant(), nb_lignes: 0, montant_ht: 0, lignes: [] }),
    "L'avenant est ouvert : chiffrez-le sur vos prix, puis soumettez-le à la signature.",
  );
  const faireChiffrer = (a: Avenant) => {
    const q = Number(ch("quantite").replace(",", ".")); const sens = (ch("sens") === "-1" ? -1 : 1) as 1 | -1;
    const biblio = ch("mode") === "bibliotheque"; const prix = bibliotheque.find((p) => p.id === ch("prix_id"));
    return agir(
      () => chiffrerLigneAvenant({ p_avenant: a.id, p_quantite: q, p_prix: biblio ? ch("prix_id") : null, p_lot: ch("lot_id") || null, p_designation: biblio ? null : ch("designation").trim(), p_unite: biblio ? null : ch("unite"), p_prix_unitaire: biblio ? null : Number(ch("pu").replace(",", ".")), p_sens: sens }),
      () => {
        if (biblio && !prix) throw new Error("Prix introuvable dans la bibliothèque.");
        if (biblio && prix!.statut !== "valide") throw new Error("Un avenant se chiffre sur un prix validé de la bibliothèque ; celui-ci est seulement proposé.");
        const pu = biblio ? prix!.prix_unitaire_ht ?? 0 : Number(ch("pu").replace(",", "."));
        const l: LigneAvenant = { id: nid(), avenant_id: a.id, lot_id: ch("lot_id") || null, prix_id: biblio ? prix!.id : null, ordre: (Math.max(0, ...a.lignes.map((x) => x.ordre)) || 0) + 1, designation: biblio ? prix!.designation : ch("designation").trim(), unite: biblio ? prix!.unite : ch("unite"), quantite: q, sens, nature: "ouvrage", origine_prix: biblio ? "bibliotheque" : "saisie", prix_unitaire_ht: pu, montant_ht: Math.round(q * pu * sens * 100) / 100 };
        const a2 = { ...a, lignes: [...a.lignes, l], nb_lignes: a.lignes.length + 1, montant_ht: (a.montant_ht ?? 0) + l.montant_ht! };
        const t = avecAvenant(a2);
        return biblio || sens === -1 ? t : { ...t, bibliotheque: [...t.bibliotheque, { id: nid(), designation: l.designation, unite: l.unite, corps_etat: null, origine: "saisie", ligne_marche_id: null, date_prix: aujourdhui(), statut: "propose", prix_unitaire_ht: pu }] };
      },
      biblio ? "La ligne est chiffrée sur le prix validé de la bibliothèque (copié, donc figé)." : "La ligne est chiffrée ; le prix saisi est proposé à la bibliothèque.",
    );
  };
  const faireRetirerLigne = (a: Avenant, l: LigneAvenant) => agir(
    () => retirerLigneAvenant(l.id),
    () => avecAvenant({ ...a, lignes: a.lignes.filter((x) => x.id !== l.id), nb_lignes: a.lignes.length - 1, montant_ht: (a.montant_ht ?? 0) - (l.montant_ht ?? 0) }),
    "La ligne est retirée (elle reste tracée, rien ne s'efface).",
  );
  const faireSoumettre = (a: Avenant) => agir(
    () => soumettreAvenant(a.id),
    () => { if (!a.lignes.length) throw new Error("Un avenant se soumet avec au moins une ligne chiffrée."); return avecAvenant({ ...a, statut: "soumis", soumis_le: maintenant(), demande_id: nid(), demande_statut: "en_attente" }); },
    "L'avenant est soumis : une demande de validation attend un signataire dans « À valider » (celui qui a chiffré ne signe pas).",
  );
  const faireSigner = (a: Avenant) => agir(
    () => signerAvenant(a.id, null, ch("date") || aujourdhui()),
    () => { if (a.demande_statut !== "approuvee" && a.demande_statut !== "executee") throw new Error(`L'avenant attend sa validation (${a.demande_statut ?? "aucune demande"}) : il ne se signe pas avant.`); return avecAvenant({ ...a, statut: "signe", signe_le: ch("date") || aujourdhui(), signe_libelle: "Vous", demande_statut: "executee" }); },
    "L'avenant est signé : ses travaux entrent dans l'engagé du lot.",
  );
  const faireAbandonner = (a: Avenant) => agir(
    () => abandonnerAvenant(a.id, ch("motif")),
    () => avecAvenant({ ...a, statut: "abandonne", motif: ch("motif").trim() }),
    "L'avenant est abandonné avec son motif.",
  );
  const faireRattacher = () => {
    const f = candidates?.find((x) => x.id === ch("facture_id"));
    return agir(
      () => rattacherFacture(ch("facture_id"), c.id, ch("lot_id") || null, ch("motif").trim() || null),
      () => {
        if (!f) throw new Error("Choisissez une facture.");
        const lot = lots.find((l) => l.id === ch("lot_id"));
        const t = lot?.tiers_id ? tiers.find((x) => x.id === lot.tiers_id) : null;
        if (t?.siren && f.fournisseur_siren && t.siren !== f.fournisseur_siren) throw new Error(`Le fournisseur de la facture (${f.fournisseur_nom}, SIREN ${f.fournisseur_siren}) n'est pas l'entreprise du lot ${lot!.code} (${t.nom}, SIREN ${t.siren}).`);
        return recalculerDebourse({ ...tableau, factures: [...factures, { id: nid(), facture_id: f.id, document_id: null, chantier_id: c.id, lot_id: lot?.id ?? null, lot_code: lot?.code ?? null, lot_libelle: lot?.libelle ?? null, marche_id: marche?.id ?? null, statut: "rattachee", motif: ch("motif").trim() || null, fournisseur_siren: f.fournisseur_siren, fournisseur_id: null, fournisseur_nom: f.fournisseur_nom, facture_numero: f.numero, facture_nature: "facture", facture_statut: f.statut, document_reference: null, date_emission: f.date_emission, echeance_lue: null, montant_ht: f.montant_ht, montant_ttc: f.montant_ht !== null ? Math.round(f.montant_ht * 1.2 * 100) / 100 : null, rattache_libelle: "Vous", cree_le: maintenant() }] });
      },
      "La facture est rattachée au chantier ; le déboursé du lot est à jour.",
    );
  };
  const faireDetacher = (facture_id: string) => agir(
    () => detacherFacture(facture_id, ch("motif")),
    () => recalculerDebourse({ ...tableau, factures: factures.filter((x) => x.facture_id !== facture_id) }),
    "La facture est détachée du chantier (le motif reste au journal).",
  );
  const faireValiderPrix = (p: Prix) => agir(
    () => validerPrix(p.id, null),
    () => ({ ...tableau, bibliotheque: bibliotheque.map((x) => (x.id === p.id ? { ...x, statut: "valide" } : x.designation.toLowerCase() === p.designation.toLowerCase() && x.unite === p.unite && x.statut === "valide" ? { ...x, statut: "retire" } : x)) }),
    `« ${p.designation} » vaut ${montant(p.prix_unitaire_ht)} / ${libelleUnite(p.unite)} : les avenants peuvent s'en servir.`,
  );
  const fairePrix = () => agir(
    () => poserPrix(c.client_id, ch("designation").trim(), ch("unite"), Number(ch("pu").replace(",", ".")), null),
    () => ({ ...tableau, bibliotheque: [...bibliotheque.map((x) => (x.designation.toLowerCase() === ch("designation").trim().toLowerCase() && x.unite === ch("unite") && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)), { id: nid(), designation: ch("designation").trim(), unite: ch("unite"), corps_etat: null, origine: "saisie", ligne_marche_id: null, date_prix: aujourdhui(), statut: "valide", prix_unitaire_ht: Number(ch("pu").replace(",", ".")) }] }),
    "Le prix est posé et validé dans la bibliothèque.",
  );
  const faireStatut = (statut: string) => agir(
    () => changerStatutChantier(c.id, statut),
    () => { if (statut === "ouvert" && !c.maitre_ouvrage_id && c.place_client !== "sous_traitant") throw new Error("Pour ouvrir ce chantier, désignez son maître d'ouvrage dans l'annuaire."); return { ...tableau, chantier: { ...c, statut: statut as typeof c.statut, ouvert_le: statut === "ouvert" ? c.ouvert_le ?? maintenant() : c.ouvert_le }, controles: statut === "ouvert" ? [...tableau.controles, ...(passages.some((p) => p.statut === "prevu") ? [] : [{ chantier_id: c.id, objet_type: "btp_chantiers", objet_id: c.id, code: "chantier_sans_planning", gravite: "attention" as const, message: `${c.nom} : aucun passage planifié ; rien à confirmer à J-2, rien à recaler.` }])] : tableau.controles }; },
    statut === "ouvert" ? "Le chantier est ouvert : il compte dans le quota de la formule." : statut === "suspendu" ? "Le chantier est suspendu." : "Le statut du chantier est changé.",
  );

  const s = STATUTS_CHANTIER[c.statut];
  const et = c.etape;

  return (
    <div className="esp-dossier">
      {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
      {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

      {/* ——— en-tête ——— */}
      <section className="esp-carte" aria-label="Le chantier">
        <div className="esp-carte-tete">
          <div>
            <h2 className="esp-carte-titre">{c.nom}</h2>
            <div className="esp-kpi-sous">{c.reference ? `${c.reference} · ` : ""}{c.adresse ? `${c.adresse}, ` : ""}{c.code_postal} {c.commune}</div>
          </div>
          <span className="esp-item-haut"><Pastille teinte={s.teinte}>{s.libelle}</Pastille>{c.marche_verifie || marches.some((m) => m.statut === "verifie") ? <Pastille teinte="vert" contour>Marché vérifié</Pastille> : <Pastille teinte="ambre" contour>Marché à vérifier</Pastille>}</span>
        </div>
        <dl className="esp-def esp-def--trois">
          <Def etiquette="Maître d'ouvrage" fort>{c.maitre_ouvrage_nom ?? <span className="esp-obligatoire">à désigner</span>}</Def>
          <Def etiquette="Notre place">{c.place_client === "titulaire" ? "Titulaire" : c.place_client === "cotraitant" ? "Cotraitant" : `Sous-traitant${c.donneur_ordre_nom ? ` de ${c.donneur_ordre_nom}` : ""}`}</Def>
          <Def etiquette="TVA">{c.regime_tva === "normal" ? "Régime normal" : c.regime_tva === "autoliquidation" ? "Autoliquidation (sous-traitance)" : c.regime_tva === "non_applicable" ? "Non applicable (Guyane, Mayotte)" : "Hors du champ"}</Def>
          <Def etiquette="Dates">{c.date_debut ? `du ${dateCourte(c.date_debut)}` : "début à fixer"}{c.date_fin_prevue ? ` au ${dateCourte(c.date_fin_prevue)}` : ""}</Def>
          <Def etiquette="Étape">{et && et.etapes ? `${et.etape} sur ${et.etapes}${et.lot_libelle ? ` — ${et.lot_libelle}` : ""}` : "aucun lot"}</Def>
          <Def etiquette="Avancement">{et && et.etapes ? <span className="esp-jauge" style={{ ["--valeur" as string]: `${et.avancement_pct}%` }}>{pourcent(et.avancement_pct)}</span> : "—"}</Def>
        </dl>
        <div className="esp-actions">
          {c.statut === "preparation" ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "statut", statut: "ouvert" })}><Unlock width={14} height={14} aria-hidden="true" /> Ouvrir le chantier</button> : null}
          {c.statut === "ouvert" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "statut", statut: "suspendu" })}>Suspendre</button> : null}
          {c.statut === "suspendu" ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "statut", statut: "ouvert" })}>Reprendre</button> : null}
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "avenant" })} disabled={c.statut !== "ouvert" && c.statut !== "suspendu"} title={c.statut !== "ouvert" && c.statut !== "suspendu" ? "Un avenant se prépare sur un chantier ouvert" : undefined}><FileSignature width={14} height={14} aria-hidden="true" /> Ouvrir un avenant</button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "facture" })}><Link2 width={14} height={14} aria-hidden="true" /> Rattacher une facture</button>
        </div>
      </section>

      {/* ——— contrôles ——— */}
      <section className="esp-carte" aria-label="Contrôles">
        <div className="esp-section-titre">Contrôles — {controles.length ? `${controles.filter((k) => k.gravite === "bloquant").length} bloquant(s), ${controles.filter((k) => k.gravite === "attention").length} à voir` : "rien à signaler sur ce chantier"}</div>
        {controles.map((k) => (
          <div key={`${k.code}-${k.objet_id}`} className="esp-controle">
            <span className="esp-controle-icone" data-resultat={k.gravite === "info" ? "ok" : "anomalie"} data-gravite={k.gravite} aria-hidden="true">{k.gravite === "info" ? <CheckCircle2 width={14} height={14} /> : <ClipboardCheck width={14} height={14} />}</span>
            <div>
              <div className="esp-controle-haut"><Pastille teinte={GRAVITES[k.gravite].teinte}>{GRAVITES[k.gravite].libelle}</Pastille><span className="esp-kpi-sous">{familleControle(k.code)}</span></div>
              <div className="esp-controle-message">{k.message}</div>
            </div>
          </div>
        ))}
        {tableau.controles_organisation.length ? (
          <div style={{ marginTop: 8 }}>
            <button type="button" className="esp-lien-bouton" onClick={() => setOrga(!orga)}>{orga ? "Masquer" : "Voir"} les {tableau.controles_organisation.length} contrôle(s) de l&apos;organisation (annuaire, vigilance)</button>
            {orga ? tableau.controles_organisation.map((k) => (
              <div key={`${k.code}-${k.objet_id}`} className="esp-controle">
                <span className="esp-controle-icone" data-resultat="anomalie" data-gravite={k.gravite} aria-hidden="true"><Users width={14} height={14} /></span>
                <div><div className="esp-controle-haut"><Pastille teinte={GRAVITES[k.gravite].teinte}>{GRAVITES[k.gravite].libelle}</Pastille></div><div className="esp-controle-message">{k.message}</div></div>
              </div>
            )) : null}
          </div>
        ) : null}
      </section>

      {/* ——— lots et déboursé ——— */}
      <section className="esp-carte" aria-label="Lots">
        <div className="esp-section-titre">Lots et déboursé — engagé au marché et par avenants signés, facturé, reste</div>
        {lots.length ? (
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Lots (tableau qui défile)">
            <table className="esp-tableau">
              <thead><tr><th>Lot</th><th>Exécutant</th><th>État</th>{voit_prix ? <><th className="esp-num">Marché HT</th><th className="esp-num">Avenants</th><th className="esp-num">Facturé</th><th className="esp-num">Reste</th></> : null}</tr></thead>
              <tbody>
                {lots.map((l) => {
                  const d = debourse.find((x) => x.lot_id === l.id);
                  return (
                    <tr key={l.id}>
                      <td><span className="esp-mono">{l.code}</span> {l.libelle}{l.corps_etat_libelle ? <span className="esp-kpi-sous"> · {l.corps_etat_libelle}</span> : null}</td>
                      <td>{EXECUTIONS[l.execution]}{l.tiers_nom ? ` — ${l.tiers_nom}` : l.equipe_nom ? ` — ${l.equipe_nom}` : <span className="esp-obligatoire"> — à désigner</span>}{l.execution === "sous_traitant" && l.tiers_id ? <div><Pastille teinte={ACCEPTATIONS[l.acceptation ?? "a_demander"].teinte} contour>{ACCEPTATIONS[l.acceptation ?? "a_demander"].libelle}</Pastille></div> : null}</td>
                      <td>{l.statut === "a_venir" ? "À venir" : l.statut === "en_cours" ? "En cours" : "Terminé"}</td>
                      {voit_prix ? <><td className="esp-num">{montant(d?.engage_marche_ht ?? 0)}</td><td className="esp-num">{montant(d?.engage_avenants_ht ?? 0)}</td><td className="esp-num">{montant(d?.facture_ht ?? 0)}{d?.nb_factures ? <span className="esp-kpi-sous"> ({d.nb_factures})</span> : null}</td><td className="esp-num" style={{ fontWeight: 600 }}>{montant(d?.reste_ht ?? 0)}</td></> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Avis teinte="ambre">Aucun lot : le planning et les lignes du marché ne peuvent pas s&apos;y rattacher.</Avis>}
        {!voit_prix ? <div className="esp-kpi-sous" style={{ marginTop: 8 }}>Les montants sont réservés aux personnes qui ont le droit de voir les prix.</div> : null}
      </section>

      {/* ——— marché ——— */}
      <section className="esp-carte" aria-label="Marché">
        <div className="esp-carte-tete">
          <div className="esp-section-titre" style={{ margin: 0 }}>Marché{marche?.reference ? ` ${marche.reference}` : ""} {marche ? <Pastille teinte={marche.statut === "verifie" ? "vert" : "ambre"}>{marche.statut === "verifie" ? "Vérifié, figé" : "À vérifier ligne à ligne"}</Pastille> : null}</div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            {!marche ? <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "marche" })}><FileText width={14} height={14} aria-hidden="true" /> Saisir le marché</button> : null}
            {marche?.statut === "a_verifier" ? <>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "ligne", marche })}><Plus width={14} height={14} aria-hidden="true" /> Ajouter une ligne</button>
              <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "verifier", marche })} disabled={marche.controles.some((k) => k.bloquant)} title={marche.controles.some((k) => k.bloquant) ? "Des contrôles bloquants restent" : undefined}><ClipboardCheck width={14} height={14} aria-hidden="true" /> Vérifier le marché</button>
            </> : null}
            {marche?.statut === "verifie" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "rouvrir", marche })}><RotateCcw width={14} height={14} aria-hidden="true" /> Rouvrir (gérant)</button> : null}
          </div>
        </div>
        {marche ? (
          <>
            <dl className="esp-def esp-def--trois">
              <Def etiquette="Objet">{marche.objet ?? "—"}</Def>
              <Def etiquette="Mode de prix">{marche.mode_prix === "forfait" ? "Forfait" : marche.mode_prix === "unitaire" ? "Prix unitaires" : "Mixte"}{marche.date_signature ? ` · signé le ${dateCourte(marche.date_signature)}` : ""}</Def>
              <Def etiquette="Total" fort>{voit_prix ? <>{montant(marche.total_ht_lignes)} HT{marche.montant_ht_declare !== null ? <span className="esp-kpi-sous"> (devis : {montant(marche.montant_ht_declare)})</span> : null}</> : "réservé"}</Def>
            </dl>
            {marche.verifie_le ? <div className="esp-kpi-sous" style={{ marginBottom: 8 }}>Vérifié le {dateHeure(marche.verifie_le)}{marche.verifie_libelle ? ` par ${marche.verifie_libelle}` : ""} · retenue de garantie {pourcent(marche.retenue_taux * 100)} sur le {marche.retenue_base.toUpperCase()}</div> : null}
            {marche.controles.length ? (
              <div style={{ marginBottom: 10 }}>
                {marche.controles.map((k, i) => <div key={i} className="esp-controle"><span className="esp-controle-icone" data-resultat={k.bloquant ? "anomalie" : "levee"} data-gravite={k.bloquant ? "bloquant" : "info"} aria-hidden="true"><ClipboardCheck width={14} height={14} /></span><div><div className="esp-controle-haut"><Pastille teinte={k.bloquant ? "rouge" : "bleu"}>{k.bloquant ? "Bloquant" : "Noté"}</Pastille>{k.ordre !== null ? <span className="esp-kpi-sous">ligne {marche.lignes.find((l) => l.id === k.ligne_id)?.numero ?? k.ordre}</span> : <span className="esp-kpi-sous">total</span>}</div><div className="esp-controle-message">{k.message}</div></div></div>)}
              </div>
            ) : null}
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Lignes du marché (tableau qui défile)">
              <table className="esp-tableau">
                <thead><tr><th>N°</th><th>Désignation</th><th>Lot</th><th className="esp-num">Qté</th><th>Unité</th>{voit_prix ? <><th className="esp-num">PU HT</th><th className="esp-num">Montant HT</th></> : null}<th>Contrôle</th></tr></thead>
                <tbody>
                  {[...marche.lignes].sort((a, b) => a.ordre - b.ordre).map((l) => {
                    const k = CONTROLES_LIGNE[l.controle];
                    return (
                      <tr key={l.id}>
                        <td className="esp-mono">{l.numero ?? l.ordre}</td>
                        <td>{l.designation}{l.nature !== "ouvrage" ? <span className="esp-kpi-sous"> · {l.nature === "forfait" ? "forfait" : l.nature === "fourniture" ? "fourniture" : "option"}</span> : null}{l.corrigee ? <span className="esp-kpi-sous"> · corrigée</span> : null}</td>
                        <td>{l.lot_id ? <span className="esp-mono">{lotNom(l.lot_id)}</span> : marche.statut === "a_verifier" ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "lot_ligne", ligne: l })}>Rattacher à un lot</button> : "—"}</td>
                        <td className="esp-num">{nombreFr(l.quantite)}</td>
                        <td>{libelleUnite(l.unite)}</td>
                        {voit_prix ? <><td className="esp-num">{montant(l.prix_unitaire_ht)}</td><td className="esp-num">{montant(l.montant_ht)}</td></> : null}
                        <td>
                          <Pastille teinte={l.ecart_accepte ? "bleu" : k.teinte} contour>{l.ecart_accepte ? "Écart accepté" : k.libelle}</Pastille>
                          {l.controle === "montant_faux" && !l.ecart_accepte && marche.statut === "a_verifier" ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "ecart", ligne: l })}>Accepter l&apos;écart avec un motif</button></div> : null}
                          {l.ecart_accepte && l.ecart_motif ? <div className="esp-kpi-sous" title={l.ecart_motif}>{l.ecart_motif}</div> : null}
                        </td>
                      </tr>
                    );
                  })}
                  {!marche.lignes.length ? <tr><td colSpan={8} className="esp-kpi-sous">Aucune ligne : saisissez le devis ligne à ligne.</td></tr> : null}
                </tbody>
              </table>
            </div>
            {marches.length > 1 ? <div className="esp-kpi-sous" style={{ marginTop: 8 }}>{marches.length - 1} autre(s) marché(s) sur ce chantier.</div> : null}
          </>
        ) : <Avis teinte="ambre">Aucun marché : les avenants et les situations ne peuvent pas être chiffrés tant que le marché signé n&apos;est pas saisi puis vérifié ligne à ligne.</Avis>}
      </section>

      {/* ——— planning ——— */}
      <section className="esp-carte" aria-label="Planning">
        <div className="esp-carte-tete">
          <div className="esp-section-titre" style={{ margin: 0 }}>Planning — passages à venir et confirmation à J-2</div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={faireProposerDependances} disabled={envoi || !passages.length}>Proposer les dépendances</button>
          </div>
        </div>
        {passages.length ? (
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Planning (tableau qui défile)">
            <table className="esp-tableau">
              <thead><tr><th>Dates</th><th>Tâche</th><th>Lot</th><th>Qui</th><th>Confirmation</th><th></th></tr></thead>
              <tbody>
                {passages.map((p) => {
                  const k = CONFIRMATIONS[p.confirmation];
                  const dernier = p.confirmations?.length ? p.confirmations[p.confirmations.length - 1] : null;
                  return (
                    <tr key={p.id}>
                      <td>{dateCourte(p.debut)}{p.fin !== p.debut ? ` → ${dateCourte(p.fin)}` : ""}{p.exterieur ? <span className="esp-kpi-sous"> · extérieur</span> : null}</td>
                      <td>{p.tache ?? "—"}{p.statut === "fait" ? <span className="esp-kpi-sous"> · fait</span> : null}</td>
                      <td>{p.lot_code ? <span className="esp-mono">{p.lot_code}</span> : <span className="esp-obligatoire">aucun</span>}</td>
                      <td>{p.intervenant_nom ?? p.intervenant_lu ?? "—"}{p.intervenant_type === "inconnu" ? <div><Pastille teinte="ambre" contour>À ranger</Pastille></div> : p.rapprochement === "ressemblance" ? <div className="esp-kpi-sous">lu « {p.intervenant_lu} »</div> : null}</td>
                      <td>{p.intervenant_type === "tiers" ? <><Pastille teinte={k.teinte}>{k.libelle}</Pastille>{dernier ? <div className="esp-kpi-sous">{dateHeure(dernier.survenu_le)}{dernier.canal ? ` · ${dernier.canal}` : ""}{typeof dernier.detail.texte === "string" ? ` · « ${dernier.detail.texte} »` : ""}</div> : null}{p.envoi ? <div className="esp-kpi-sous">{libelleEnvoi(p.envoi, dateHeure)}</div> : null}</> : <span className="esp-kpi-sous">équipe interne</span>}</td>
                      <td>
                        {p.intervenant_type === "tiers" && p.statut === "prevu" && p.confirmation !== "non_demandee" && p.confirmation !== "confirmee" ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "reponse", passage: p })}>Noter la réponse</button> : null}
                        {p.intervenant_type === "tiers" && p.statut === "prevu" && (p.confirmation === "declinee" || p.confirmation === "sans_reponse") ? <div><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "remplacants", passage: p })}>Remplaçants</button></div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <Avis teinte="ambre">Aucun passage planifié : importez le planning (tableur) ou posez les passages ; rien à confirmer à J-2 sinon.</Avis>}
        {tableau.dependances.length ? (
          <div style={{ marginTop: 10 }}>
            <div className="esp-section-titre">Dépendances — {tableau.dependances.filter((d) => !d.confirmee).length} à confirmer</div>
            <ul className="esp-fil">
              {tableau.dependances.map((d) => (
                <li key={d.id}><span className="esp-fil-point" data-teinte={d.confirmee ? "vert" : undefined} /><div><div className="esp-fil-texte">« {d.amont_tache ?? "amont"} » avant « {d.aval_tache ?? "aval"} »{d.delai_min_jours ? ` (${d.delai_min_jours} jour(s) ouvré(s) entre les deux)` : ""}</div><div className="esp-fil-meta">{d.origine === "gabarit" ? "proposée d'après l'ordre des corps d'état" : d.origine === "import" ? "importée" : "posée à la main"} · {d.confirmee ? "confirmée" : <button type="button" className="esp-lien-bouton" onClick={() => faireDependance(d.id, true)} disabled={envoi}>confirmer</button>}</div></div></li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* ——— avenants ——— */}
      <section className="esp-carte" aria-label="Avenants">
        <div className="esp-section-titre">Travaux supplémentaires — {avenants.length ? `${avenants.length} avenant(s), ${avenants.filter((a) => a.statut === "signe").length} signé(s)` : "aucun avenant"}</div>
        {avenants.map((a) => {
          const st = STATUTS_AVENANT[a.statut];
          return (
            <div key={a.id} className="esp-controle" style={{ display: "block" }}>
              <div className="esp-controle-haut" style={{ flexWrap: "wrap" }}>
                <strong>Avenant n° {a.numero}</strong>
                <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
                {a.statut === "soumis" ? <Pastille teinte={a.demande_statut === "approuvee" || a.demande_statut === "executee" ? "vert" : a.demande_statut === "rejetee" ? "rouge" : "bleu"} contour>{a.demande_statut === "approuvee" || a.demande_statut === "executee" ? "Validé : à signer" : a.demande_statut === "rejetee" ? "Refusé à la validation" : "Dans « À valider »"}</Pastille> : null}
                {voit_prix ? <span className="esp-item-montant" style={{ marginLeft: "auto" }}>{montant(a.montant_ht)} HT</span> : null}
              </div>
              <div className="esp-controle-message">{a.objet}</div>
              {a.origine?.texte || a.origine?.canal ? <div className="esp-kpi-sous">Origine : {a.origine.canal === "vocal" ? "vocal" : a.origine.canal === "photo" ? "photo" : a.origine.canal === "visite" ? "visite" : a.origine.canal ?? "—"}{a.origine.auteur ? ` de ${a.origine.auteur}` : ""}{a.origine.date ? ` le ${dateCourte(String(a.origine.date))}` : ""}{a.origine.texte ? ` — « ${a.origine.texte} »` : ""}</div> : null}
              {a.lignes.length ? (
                <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Lignes de l'avenant (tableau qui défile)" style={{ marginTop: 6 }}>
                  <table className="esp-tableau">
                    <thead><tr><th>Désignation</th><th>Lot</th><th className="esp-num">Qté</th><th>Unité</th>{voit_prix ? <><th className="esp-num">PU HT</th><th className="esp-num">Montant HT</th></> : null}<th>Prix</th>{a.statut === "brouillon" ? <th></th> : null}</tr></thead>
                    <tbody>
                      {a.lignes.map((l) => (
                        <tr key={l.id}>
                          <td>{l.designation}{l.sens === -1 ? <span className="esp-kpi-sous"> · moins-value</span> : null}</td>
                          <td><span className="esp-mono">{lotNom(l.lot_id)}</span></td>
                          <td className="esp-num">{nombreFr(l.quantite)}</td>
                          <td>{libelleUnite(l.unite)}</td>
                          {voit_prix ? <><td className="esp-num">{montant(l.prix_unitaire_ht)}</td><td className="esp-num">{montant(l.montant_ht)}</td></> : null}
                          <td><Pastille teinte={l.origine_prix === "bibliotheque" ? "vert" : "ambre"} contour>{l.origine_prix === "bibliotheque" ? "Bibliothèque (validé)" : "Saisi, proposé"}</Pastille></td>
                          {a.statut === "brouillon" ? <td><button type="button" className="esp-lien-bouton" onClick={() => faireRetirerLigne(a, l)} disabled={envoi}>Retirer</button></td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="esp-kpi-sous">Aucune ligne : chiffrez les travaux sur un prix validé de la bibliothèque.</div>}
              {a.signe_le ? <div className="esp-kpi-sous" style={{ marginTop: 6 }}>Signé le {dateCourte(a.signe_le)}{a.signe_libelle ? ` par ${a.signe_libelle}` : ""}.</div> : null}
              {a.motif ? <div className="esp-kpi-sous" style={{ marginTop: 6 }}>Motif : {a.motif}</div> : null}
              <div className="esp-controle-actions" style={{ marginTop: 8 }}>
                {a.statut === "brouillon" ? <>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "chiffrer", avenant: a })}><BookOpen width={14} height={14} aria-hidden="true" /> Chiffrer une ligne</button>
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "soumettre", avenant: a })} disabled={!a.lignes.length}><FileSignature width={14} height={14} aria-hidden="true" /> Soumettre à la signature</button>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "abandonner", avenant: a })}>Abandonner</button>
                </> : null}
                {a.statut === "soumis" ? <>
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" onClick={() => ouvrir({ type: "signer", avenant: a })} disabled={a.demande_statut !== "approuvee" && a.demande_statut !== "executee"} title={a.demande_statut !== "approuvee" && a.demande_statut !== "executee" ? "La demande de validation n'est pas encore approuvée" : undefined}><PenLine width={14} height={14} aria-hidden="true" /> Signer</button>
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "abandonner", avenant: a })}>Abandonner</button>
                </> : null}
                {a.statut === "refuse" ? <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "soumettre", avenant: a })}>Resoumettre</button> : null}
              </div>
            </div>
          );
        })}
        {!avenants.length ? <div className="esp-kpi-sous">Un travail supplémentaire repéré (vocal, photo, visite) devient un avenant chiffré sur vos prix, signé avant exécution.</div> : null}
      </section>

      {/* ——— situations de travaux (b6_12) ——— */}
      <SituationsCarte tableau={tableau} source={source} onLocal={onLocal} relire={relire} />

      {/* ——— factures ——— */}
      <section className="esp-carte" aria-label="Factures">
        <div className="esp-section-titre">Factures fournisseurs rattachées — {factures.length ? `${factures.length}` : "aucune"}</div>
        {factures.length ? (
          <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Factures (tableau qui défile)">
            <table className="esp-tableau">
              <thead><tr><th>Document</th><th>Fournisseur</th><th>Lot</th><th>Émise le</th>{voit_prix ? <th className="esp-num">HT</th> : null}<th>État FILED</th><th></th></tr></thead>
              <tbody>
                {factures.map((f) => (
                  <tr key={f.id}>
                    <td><span className="esp-mono">{f.document_reference ?? "—"}</span>{f.facture_numero ? <div className="esp-kpi-sous">n° {f.facture_numero}</div> : null}</td>
                    <td>{f.fournisseur_nom ?? "—"}{f.fournisseur_siren ? <div className="esp-kpi-sous">SIREN {f.fournisseur_siren}</div> : null}</td>
                    <td>{f.lot_code ? <><span className="esp-mono">{f.lot_code}</span> {f.lot_libelle}</> : "—"}</td>
                    <td>{dateCourte(f.date_emission)}</td>
                    {voit_prix ? <td className="esp-num">{montant(f.montant_ht)}</td> : null}
                    <td>{libelleStatutFacture(f.facture_statut)}</td>
                    <td><button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "detacher", facture_id: f.facture_id })}>Détacher</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="esp-kpi-sous">Une facture reçue par FILED se rattache ici au chantier et à son lot : le fournisseur doit être l&apos;entreprise du lot.</div>}
      </section>

      {/* ——— annuaire et bibliothèque ——— */}
      <section className="esp-carte" aria-label="Annuaire et bibliothèque">
        <div className="esp-carte-tete">
          <div className="esp-section-titre" style={{ margin: 0 }}>Annuaire — {tiers.length} tiers · Bibliothèque — {prixValides.length} prix validé(s)</div>
          <div className="esp-actions" style={{ marginTop: 0 }}><button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => ouvrir({ type: "prix" })}><Plus width={14} height={14} aria-hidden="true" /> Poser un prix</button></div>
        </div>
        <ul className="esp-fil">
          {tiers.map((t) => (
            <li key={t.id}><span className="esp-fil-point" data-teinte={t.vigilance === "a_jour" ? "vert" : t.vigilance === "absente" || t.vigilance === "echue" ? "rouge" : undefined} /><div><div className="esp-fil-texte"><strong>{t.nom}</strong> — {t.roles.map((r) => ROLES_TIERS[r] ?? r).join(", ")}</div><div className="esp-fil-meta">{t.commune ?? ""}{t.telephone ? ` · ${t.telephone}` : ""}{t.email ? ` · ${t.email}` : ""}{t.roles.includes("sous_traitant") && t.vigilance ? <> · <Pastille teinte={VIGILANCES[t.vigilance].teinte} contour>{VIGILANCES[t.vigilance].libelle}</Pastille></> : null}</div></div></li>
          ))}
        </ul>
        <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Bibliothèque de prix (tableau qui défile)" style={{ marginTop: 10 }}>
          <table className="esp-tableau">
            <thead><tr><th>Désignation</th><th>Unité</th>{voit_prix ? <th className="esp-num">PU HT</th> : null}<th>Origine</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {bibliotheque.filter((p) => p.statut !== "retire").map((p) => (
                <tr key={p.id}>
                  <td>{p.designation}</td>
                  <td>{libelleUnite(p.unite)}</td>
                  {voit_prix ? <td className="esp-num">{montant(p.prix_unitaire_ht)}</td> : null}
                  <td>{p.origine === "marche" ? "Marché vérifié" : "Saisie"} · {dateCourte(p.date_prix)}</td>
                  <td><Pastille teinte={p.statut === "valide" ? "vert" : "ambre"} contour>{p.statut === "valide" ? "Validé" : "Proposé"}</Pastille></td>
                  <td>{p.statut === "propose" ? <button type="button" className="esp-lien-bouton" onClick={() => faireValiderPrix(p)} disabled={envoi}>Valider</button> : null}</td>
                </tr>
              ))}
              {!bibliotheque.length ? <tr><td colSpan={6} className="esp-kpi-sous">La bibliothèque se remplit des prix des marchés vérifiés ; un prix ne vaut qu&apos;une fois validé.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ——— les dialogues ——— */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && fermer()}>
        <DialogContent>
          {form?.type === "ecart" ? (
            <>
              <DialogHeader><DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Accepter l&apos;écart de la ligne {form.ligne.numero ?? form.ligne.ordre}</DialogTitle><DialogDescription>{nombreFr(form.ligne.quantite)} × {montant(form.ligne.prix_unitaire_ht)} = {montant((form.ligne.quantite ?? 0) * (form.ligne.prix_unitaire_ht ?? 0))}, le devis dit {montant(form.ligne.montant_ht)} (écart {montant(form.ligne.ecart)}). L&apos;écart s&apos;accepte avec son motif, qui reste au journal.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Remise négociée, voir courriel du…" /></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={ch("motif").trim().length < 3 || envoi} onClick={() => faireEcart(form.ligne)}>{envoi ? <Loader variant="spin" /> : null} Accepter l&apos;écart</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "lot_ligne" ? (
            <>
              <DialogHeader><DialogIcone><Link2 width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Rattacher la ligne {form.ligne.numero ?? form.ligne.ordre} à un lot</DialogTitle><DialogDescription>{form.ligne.designation}</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Lot<select className="rv-champ" value={ch("lot_id")} onChange={(e) => pose("lot_id", e.target.value)}><option value="">Choisir…</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.libelle}</option>)}</select></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={!ch("lot_id") || envoi} onClick={() => faireLotLigne(form.ligne)}>{envoi ? <Loader variant="spin" /> : null} Rattacher</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "ligne" ? (
            <>
              <DialogHeader><DialogIcone><Plus width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Ajouter une ligne au marché</DialogTitle><DialogDescription>La saisie d&apos;origine est gardée ; le contrôle (quantité × prix unitaire = montant) est calculé par la base.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <div className="esp-form-ligne"><label className="rv-libelle">N°<input className="rv-champ" value={ch("numero")} onChange={(e) => pose("numero", e.target.value)} placeholder="2.3" /></label><label className="rv-libelle">Nature<select className="rv-champ" value={ch("nature")} onChange={(e) => pose("nature", e.target.value)}><option value="ouvrage">Ouvrage</option><option value="fourniture">Fourniture</option><option value="forfait">Forfait</option><option value="option">Option</option></select></label></div>
                <label className="rv-libelle">Désignation <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={ch("designation")} onChange={(e) => pose("designation", e.target.value)} /></label>
                <label className="rv-libelle">Lot<select className="rv-champ" value={ch("lot_id")} onChange={(e) => pose("lot_id", e.target.value)}><option value="">Aucun (bloquant à la vérification)</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.libelle}</option>)}</select></label>
                {ch("nature") !== "forfait" ? <div className="esp-form-ligne"><label className="rv-libelle">Quantité<input className="rv-champ" inputMode="decimal" value={ch("quantite")} onChange={(e) => pose("quantite", e.target.value)} /></label><label className="rv-libelle">Unité<select className="rv-champ" value={ch("unite")} onChange={(e) => pose("unite", e.target.value)}>{UNITES.map((u) => <option key={u.cle} value={u.cle}>{u.libelle}</option>)}</select></label><label className="rv-libelle">PU HT<input className="rv-champ" inputMode="decimal" value={ch("pu")} onChange={(e) => pose("pu", e.target.value)} /></label></div> : null}
                <label className="rv-libelle">Montant HT {ch("nature") !== "forfait" ? "(vide : quantité × PU)" : <span className="esp-obligatoire">(obligatoire)</span>}<input className="rv-champ" inputMode="decimal" value={ch("montant")} onChange={(e) => pose("montant", e.target.value)} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={!ch("designation").trim() || envoi || (ch("nature") === "forfait" ? !ch("montant") : !ch("quantite") || !ch("pu"))} onClick={() => faireLigne(form.marche)}>{envoi ? <Loader variant="spin" /> : null} Ajouter la ligne</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "marche" ? (
            <>
              <DialogHeader><DialogIcone><FileText width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Saisir le marché signé</DialogTitle><DialogDescription>Le marché naît « à vérifier » ; il ne sert au chiffrage qu&apos;une fois vérifié ligne à ligne.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <div className="esp-form-ligne"><label className="rv-libelle">Référence<input className="rv-champ" value={ch("reference")} onChange={(e) => pose("reference", e.target.value)} placeholder="M-2026-014" /></label><label className="rv-libelle">Signé le<input className="rv-champ" type="date" value={ch("date")} onChange={(e) => pose("date", e.target.value)} /></label></div>
                <label className="rv-libelle">Objet<input className="rv-champ" value={ch("objet")} onChange={(e) => pose("objet", e.target.value)} /></label>
                <div className="esp-form-ligne"><label className="rv-libelle">Mode de prix<select className="rv-champ" value={ch("mode_prix")} onChange={(e) => pose("mode_prix", e.target.value)}><option value="forfait">Forfait</option><option value="unitaire">Prix unitaires</option><option value="mixte">Mixte</option></select></label><label className="rv-libelle">Total HT du devis<input className="rv-champ" inputMode="decimal" value={ch("montant")} onChange={(e) => pose("montant", e.target.value)} /></label></div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={faireMarche}>{envoi ? <Loader variant="spin" /> : null} Saisir le marché</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "verifier" ? (
            <>
              <DialogHeader><DialogIcone><ClipboardCheck width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Vérifier le marché {form.marche.reference ?? ""}</DialogTitle><DialogDescription>Le marché devient figé : ses lignes ne changent plus (seul le gérant peut le rouvrir, avec un motif). Ses prix sont proposés à la bibliothèque. {form.marche.lignes.length} ligne(s), total {montant(form.marche.total_ht_lignes)} HT.</DialogDescription></DialogHeader>
              <DialogBody>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => faireVerifier(form.marche)}>{envoi ? <Loader variant="spin" /> : null} Vérifier et figer</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "rouvrir" ? (
            <>
              <DialogHeader><DialogIcone><RotateCcw width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Rouvrir le marché {form.marche.reference ?? ""}</DialogTitle><DialogDescription>Réservé au gérant. Le marché repasse « à vérifier » ; le motif reste au journal.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={3} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} /></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={ch("motif").trim().length < 3 || envoi} onClick={() => faireRouvrir(form.marche)}>{envoi ? <Loader variant="spin" /> : null} Rouvrir</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "reponse" ? (
            <>
              <DialogHeader><DialogIcone><MessageSquare width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Noter la réponse de {form.passage.intervenant_nom ?? "l'intervenant"}</DialogTitle><DialogDescription>Passage du {dateCourte(form.passage.debut)} — {form.passage.tache ?? ""}. La réponse reçue par téléphone s&apos;inscrit au fil comme celle reçue par WhatsApp.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <label className="rv-libelle">Réponse<select className="rv-champ" value={ch("reponse")} onChange={(e) => pose("reponse", e.target.value)}><option value="confirmee">Confirme son passage</option><option value="declinee">Décline (remplaçants proposés, conducteur prévenu)</option></select></label>
                <label className="rv-libelle">Ce qu&apos;il a dit<input className="rv-champ" value={ch("texte")} onChange={(e) => pose("texte", e.target.value)} placeholder="OK pour 7 h 30…" /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => faireReponse(form.passage)}>{envoi ? <Loader variant="spin" /> : null} Noter</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "remplacants" ? (
            <>
              <DialogHeader><DialogIcone><Users width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Remplaçants possibles</DialogTitle><DialogDescription>Sous-traitants du même corps d&apos;état, du même département, joignables, à jour de vigilance, qui n&apos;ont pas décliné ce passage.</DialogDescription></DialogHeader>
              <DialogBody>
                {remplacants === null ? <Loader variant="spin" /> : remplacants.length ? (
                  <ul className="esp-fil">{remplacants.map((r) => <li key={r.tiers_id}><span className="esp-fil-point" data-teinte={r.vigilance === "a_jour" ? "vert" : undefined} /><div><div className="esp-fil-texte"><strong>{r.nom}</strong>{r.telephone ? ` · ${r.telephone}` : ""}{r.email ? ` · ${r.email}` : ""}</div><div className="esp-fil-meta">{r.canal} · <Pastille teinte={VIGILANCES[r.vigilance].teinte} contour>{VIGILANCES[r.vigilance].libelle}</Pastille>{!r.departement_ok ? " · hors de ses départements" : ""}</div></div></li>)}</ul>
                ) : <Avis teinte="ambre">Aucun remplaçant dans l&apos;annuaire pour ce corps d&apos;état et ce département.</Avis>}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </DialogBody>
            </>
          ) : null}
          {form?.type === "avenant" ? (
            <>
              <DialogHeader><DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Ouvrir un avenant</DialogTitle><DialogDescription>Ce qui est demandé en plus du marché, et d&apos;où ça vient (vocal, photo, visite). Il se chiffre ensuite sur vos prix validés, puis se soumet à la signature.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <label className="rv-libelle">Objet <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={2} value={ch("objet")} onChange={(e) => pose("objet", e.target.value)} placeholder="Garde-corps supplémentaires au R+3, 12 ml" /></label>
                <div className="esp-form-ligne"><label className="rv-libelle">Origine<select className="rv-champ" value={ch("canal")} onChange={(e) => pose("canal", e.target.value)}><option value="vocal">Vocal du chef d&apos;équipe</option><option value="photo">Photo</option><option value="visite">Visite de chantier</option><option value="courriel">Courriel</option><option value="autre">Autre</option></select></label><label className="rv-libelle">De qui<input className="rv-champ" value={ch("auteur")} onChange={(e) => pose("auteur", e.target.value)} placeholder="Chef d'équipe Pose A" /></label></div>
                <label className="rv-libelle">Ce qui a été dit ou vu<input className="rv-champ" value={ch("texte")} onChange={(e) => pose("texte", e.target.value)} /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={!ch("objet").trim() || envoi} onClick={faireAvenant}>{envoi ? <Loader variant="spin" /> : null} Ouvrir l&apos;avenant</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "chiffrer" ? (
            <>
              <DialogHeader><DialogIcone><BookOpen width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Chiffrer une ligne de l&apos;avenant n° {form.avenant.numero}</DialogTitle><DialogDescription>Sur un prix validé de la bibliothèque (copié, donc figé), ou saisi librement (il est alors proposé à la bibliothèque, à valider).</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <label className="rv-libelle">Prix<select className="rv-champ" value={ch("mode")} onChange={(e) => pose("mode", e.target.value)}><option value="bibliotheque" disabled={!prixValides.length}>Un prix validé de la bibliothèque{prixValides.length ? "" : " (aucun)"}</option><option value="saisie">Saisi librement</option></select></label>
                {ch("mode") === "bibliotheque" ? <label className="rv-libelle">Désignation<select className="rv-champ" value={ch("prix_id")} onChange={(e) => pose("prix_id", e.target.value)}><option value="">Choisir…</option>{prixValides.map((p) => <option key={p.id} value={p.id}>{p.designation} — {montant(p.prix_unitaire_ht)} / {libelleUnite(p.unite)}</option>)}</select></label> : <>
                  <label className="rv-libelle">Désignation <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={ch("designation")} onChange={(e) => pose("designation", e.target.value)} /></label>
                  <div className="esp-form-ligne"><label className="rv-libelle">Unité<select className="rv-champ" value={ch("unite")} onChange={(e) => pose("unite", e.target.value)}>{UNITES.map((u) => <option key={u.cle} value={u.cle}>{u.libelle}</option>)}</select></label><label className="rv-libelle">PU HT <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={ch("pu")} onChange={(e) => pose("pu", e.target.value)} /></label></div>
                </>}
                <div className="esp-form-ligne"><label className="rv-libelle">Quantité <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={ch("quantite")} onChange={(e) => pose("quantite", e.target.value)} /></label><label className="rv-libelle">Sens<select className="rv-champ" value={ch("sens")} onChange={(e) => pose("sens", e.target.value)}><option value="1">Plus-value (travaux en plus)</option><option value="-1">Moins-value (travaux en moins)</option></select></label></div>
                <label className="rv-libelle">Lot<select className="rv-champ" value={ch("lot_id")} onChange={(e) => pose("lot_id", e.target.value)}><option value="">Aucun</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.libelle}</option>)}</select></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi || !Number(ch("quantite").replace(",", ".")) || (ch("mode") === "bibliotheque" ? !ch("prix_id") : !ch("designation").trim() || !Number(ch("pu").replace(",", ".")))} onClick={() => faireChiffrer(form.avenant)}>{envoi ? <Loader variant="spin" /> : null} Chiffrer</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "soumettre" ? (
            <>
              <DialogHeader><DialogIcone><FileSignature width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Soumettre l&apos;avenant n° {form.avenant.numero} à la signature</DialogTitle><DialogDescription>Une demande de validation part dans « À valider » pour {montant(form.avenant.montant_ht)} HT. Celui qui a chiffré ne décide pas ; un gérant, admin ou valideur approuve, puis l&apos;avenant se signe ici.</DialogDescription></DialogHeader>
              <DialogBody>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => faireSoumettre(form.avenant)}>{envoi ? <Loader variant="spin" /> : null} Soumettre</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "signer" ? (
            <>
              <DialogHeader><DialogIcone><PenLine width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Signer l&apos;avenant n° {form.avenant.numero}</DialogTitle><DialogDescription>La demande de validation est approuvée. Les travaux ({montant(form.avenant.montant_ht)} HT) entrent dans l&apos;engagé du lot ; la pièce signée pourra être rattachée depuis FILED.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Signé le<input className="rv-champ" type="date" value={ch("date")} onChange={(e) => pose("date", e.target.value)} /></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi || !ch("date")} onClick={() => faireSigner(form.avenant)}>{envoi ? <Loader variant="spin" /> : null} Signer</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "abandonner" ? (
            <>
              <DialogHeader><DialogTitle>Abandonner l&apos;avenant n° {form.avenant.numero}</DialogTitle><DialogDescription>Le motif reste au journal ; une demande de validation encore en attente est annulée.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><textarea className="rv-champ" rows={2} value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} /></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--rouge" disabled={ch("motif").trim().length < 3 || envoi} onClick={() => faireAbandonner(form.avenant)}>{envoi ? <Loader variant="spin" /> : null} Abandonner</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "facture" ? (
            <>
              <DialogHeader><DialogIcone><Link2 width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Rattacher une facture au chantier</DialogTitle><DialogDescription>Une facture reçue par FILED, pas encore rattachée. Si le lot est exécuté par un tiers, le fournisseur de la facture doit être ce tiers (même SIREN).</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                {candidates === null ? <Loader variant="spin" /> : <label className="rv-libelle">Facture<select className="rv-champ" value={ch("facture_id")} onChange={(e) => pose("facture_id", e.target.value)}><option value="">Choisir…</option>{candidates.map((f) => <option key={f.id} value={f.id}>{f.fournisseur_nom ?? "Fournisseur inconnu"} — n° {f.numero ?? "?"} — {montant(f.montant_ht)} HT ({dateCourte(f.date_emission)})</option>)}</select></label>}
                <label className="rv-libelle">Lot<select className="rv-champ" value={ch("lot_id")} onChange={(e) => pose("lot_id", e.target.value)}><option value="">Aucun lot (chantier seulement)</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.code} — {l.libelle}{l.tiers_nom ? ` (${l.tiers_nom})` : ""}</option>)}</select></label>
                <label className="rv-libelle">Note<input className="rv-champ" value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} placeholder="Situation n° 1…" /></label>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={!ch("facture_id") || envoi} onClick={faireRattacher}>{envoi ? <Loader variant="spin" /> : null} Rattacher</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "detacher" ? (
            <>
              <DialogHeader><DialogTitle>Détacher la facture du chantier</DialogTitle><DialogDescription>Rien ne s&apos;efface : la facture est marquée détachée, avec le motif.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form"><label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={ch("motif")} onChange={(e) => pose("motif", e.target.value)} /></label>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--rouge" disabled={ch("motif").trim().length < 3 || envoi} onClick={() => faireDetacher(form.facture_id)}>{envoi ? <Loader variant="spin" /> : null} Détacher</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "prix" ? (
            <>
              <DialogHeader><DialogIcone><BookOpen width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>Poser un prix dans la bibliothèque</DialogTitle><DialogDescription>Réservé à qui a le droit de valider les prix. Un nouveau prix validé pour la même désignation retire l&apos;ancien.</DialogDescription></DialogHeader>
              <DialogBody><div className="esp-form">
                <label className="rv-libelle">Désignation <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={ch("designation")} onChange={(e) => pose("designation", e.target.value)} /></label>
                <div className="esp-form-ligne"><label className="rv-libelle">Unité<select className="rv-champ" value={ch("unite") || "u"} onChange={(e) => pose("unite", e.target.value)}>{UNITES.map((u) => <option key={u.cle} value={u.cle}>{u.libelle}</option>)}</select></label><label className="rv-libelle">PU HT <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={ch("pu")} onChange={(e) => pose("pu", e.target.value)} /></label></div>
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div></DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={!ch("designation").trim() || !Number(ch("pu").replace(",", ".")) || envoi} onClick={() => { if (!ch("unite")) pose("unite", "u"); void fairePrix(); }}>{envoi ? <Loader variant="spin" /> : null} Poser et valider</button></DialogFooter>
            </>
          ) : null}
          {form?.type === "statut" ? (
            <>
              <DialogHeader><DialogIcone><Unlock width={18} height={18} aria-hidden="true" /></DialogIcone><DialogTitle>{form.statut === "ouvert" ? "Ouvrir le chantier" : form.statut === "suspendu" ? "Suspendre le chantier" : "Changer le statut"}</DialogTitle><DialogDescription>{form.statut === "ouvert" ? "Il faut un maître d'ouvrage désigné (il signe les avenants). Le chantier compte alors dans le quota de la formule." : "Le chantier reste visible ; son planning ne bouge plus."}</DialogDescription></DialogHeader>
              <DialogBody>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</DialogBody>
              <DialogFooter><button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => faireStatut(form.statut)}>{envoi ? <Loader variant="spin" /> : null} Confirmer</button></DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
