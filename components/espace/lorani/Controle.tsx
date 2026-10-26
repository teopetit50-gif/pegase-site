"use client";

/* Le contrôle du dossier (b5_16) : les planches croisées entre elles et contre le CCTP, la DPGF et le règlement du PLU.
   Chaque constat cite la pièce, la page et le texte lu, l'article du règlement, et propose une correction ; le chef de
   projet le décide (corrigé, accepté, écarté avec motif). À l'indice suivant, un nouveau contrôle relié au précédent :
   ce qui ne se retrouve plus passe « corrigé à l'indice B », ce qui reste garde la décision prise. Base réelle :
   lorani_controles, lorani_controle_pieces, lorani_constats sous la RLS ; le croisement tourne dans la base
   (private.lorani_controler, porte lorani_lancer_controle), et seul quand la dernière pièce est lue. Exemple : les
   saisies s'appliquent en mémoire, sans croisement (les constats du contrôle précédent sont reconduits).
   Un constat part en question à l'entreprise ou au BET en un clic (b5_25) : un point « question » des comptes rendus
   (lorani_points, b5_20), avec l'extrait cité (pièce, page, texte lu) ; il est ensuite suivi jusqu'à la réponse.
   Qui décide (b5_30) : le gérant, un admin ou le chef de projet nomme, par contrôle, la personne qui tranche les
   constats ; elle seule (avec le gérant et les admins) les marque corrigés, acceptés ou écartés.
   Régler les contrôles (b5_31) : par projet, l'écart toléré de chaque grandeur et entre métré et DPGF, et les familles
   de constats coupées ; les réglages valent au prochain passage.
   Listes de l'agence (b5_60) : les règles internes de l'agence s'ajoutent aux contrôles réglementaires (famille
   « agence ») ; un point à vérifier à la main se marque « vérifié » et se revérifie à chaque indice. */

import { useMemo, useState } from "react";
import { FileDown, ListChecks, MessageSquareText, PauseCircle, ScanSearch, ShieldCheck, SlidersHorizontal, UserCheck } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte } from "../format";
import { ajouterPoints, choisirDecideur, deciderConstat, lancerControle, octetsPiece, preparerControle, reglerControles, reprendreControle, suspendreControle } from "./portes";
import { ROLES_PROJET } from "./etats";
import ListesAgence from "./ListesAgence";
import { excelControle, pdfControle, telecharger, type DonneesRapport } from "./rapport";
import type { Constat, Controle as ControleT, ControlePiece, Dossier, PieceProjet, Point, Projet, RolePieceControle } from "./types";

const ROLES: Record<RolePieceControle, string> = { planche: "Planche", cctp: "CCTP", dpgf: "DPGF", plu: "Règlement du PLU", metre: "Métré", cerfa: "Cerfa de la demande", re2020: "Attestation RE2020", bet: "Fond de plan BET", notice: "Notice", autre: "Autre pièce" };
const ROLE_DU_TYPE: Record<string, RolePieceControle> = { lorani_planche: "planche", lorani_cctp: "cctp", lorani_dpgf: "dpgf", lorani_plu_reglement: "plu", lorani_metre: "metre", lorani_cerfa: "cerfa", lorani_attestation_re2020: "re2020", lorani_plan_bet: "bet", lorani_notice: "notice" };
const GRAVITES: Record<Constat["gravite"], { libelle: string; teinte: "rouge" | "ambre" | "gris"; rang: number }> = {
  bloquant: { libelle: "Bloquant", teinte: "rouge", rang: 0 },
  majeur: { libelle: "Majeur", teinte: "ambre", rang: 1 },
  mineur: { libelle: "Mineur", teinte: "gris", rang: 2 },
};
const NATURES: Record<Constat["nature"], string> = { incoherence: "Entre les pièces", plu: "Contre le PLU", cctp_dpgf: "CCTP et DPGF", metre_dpgf: "Métré et DPGF", re2020: "RE2020", accessibilite: "Accessibilité", securite_incendie: "Sécurité incendie", dtu: "DTU en vigueur", charte: "Charte graphique (lecture en essai)", agence: "Listes de l’agence" };
const DECISIONS: Record<Exclude<Constat["statut"], "ouvert">, { libelle: string; verbe: string; teinte: "vert" | "bleu" | "gris" }> = {
  corrige: { libelle: "Corrigé", verbe: "Marquer corrigé", teinte: "vert" },
  accepte: { libelle: "Accepté", verbe: "Accepter", teinte: "bleu" },
  ecarte: { libelle: "Écarté", verbe: "Écarter", teinte: "gris" },
};
const STATUTS: Record<ControleT["statut"], { libelle: string; teinte: "gris" | "bleu" | "vert" }> = {
  en_lecture: { libelle: "Pièces en lecture", teinte: "gris" },
  controle: { libelle: "Contrôlé", teinte: "bleu" },
  clos: { libelle: "Clos", teinte: "vert" },
};
/* comme le socle : une pièce reçue, en lecture ou à rattacher n'est pas encore lue */
const EN_LECTURE = ["recue", "en_lecture", "a_rattacher", "en_attente_expediteur"];
const lue = (p: PieceProjet | undefined) => !!p && !EN_LECTURE.includes(p.statut);
const jour = (d: string | null) => (d ? dateCourte(d.length === 10 ? `${d}T12:00:00` : d) : "—");
const indiceSuivant = (i: string) => (/^[A-Y]$/.test(i) ? String.fromCharCode(i.charCodeAt(0) + 1) : /^\d+$/.test(i) ? String(Number(i) + 1) : "");
/* l'unité d'une grandeur du contrat de lecture, d'après son suffixe (hauteur_faitage_m, emprise_sol_m2, espaces_verts_pct…) */
const unite = (g: string | null) => (!g ? "" : g.endsWith("_mj_m2") ? " MJ/m²" : g.endsWith("_m2") ? " m²" : g === "cote_altimetrique_m" ? " m NGF" : g.endsWith("_m") ? " m" : g.endsWith("_pct") ? " %" : "");
/* une valeur d'un indice : « 1,8 m », ou « absente » */
const valeurIndice = (v: number | null, u: string | null) => (v === null ? "absente" : `${String(v).replace(".", ",")}${u ? ` ${u}` : ""}`);
const pluriel = (n: number, s: string) => `${n} ${s}${n > 1 ? "s" : ""}`;
/* les grandeurs réglables à l'écran, avec la tolérance du code (private.lorani_grandeur) ; « metre_dpgf_pct » en plus */
const REGLABLES: { cle: string; libelle: string; unite: string; defaut: number }[] = [
  { cle: "hauteur_faitage_m", libelle: "Hauteur au faîtage", unite: "m", defaut: 0.05 },
  { cle: "hauteur_egout_m", libelle: "Hauteur à l’égout", unite: "m", defaut: 0.05 },
  { cle: "hauteur_acrotere_m", libelle: "Hauteur à l’acrotère", unite: "m", defaut: 0.05 },
  { cle: "recul_voie_m", libelle: "Recul sur voie", unite: "m", defaut: 0.05 },
  { cle: "recul_limite_m", libelle: "Recul sur limite séparative", unite: "m", defaut: 0.05 },
  { cle: "emprise_sol_m2", libelle: "Emprise au sol", unite: "m²", defaut: 0.5 },
  { cle: "surface_plancher_m2", libelle: "Surface de plancher", unite: "m²", defaut: 0.5 },
  { cle: "espaces_verts_pct", libelle: "Part d’espaces verts", unite: "%", defaut: 0.5 },
  { cle: "longueur_m", libelle: "Longueurs", unite: "m", defaut: 0.05 },
  { cle: "largeur_m", libelle: "Largeurs", unite: "m", defaut: 0.05 },
  { cle: "cote_altimetrique_m", libelle: "Cotes altimétriques", unite: "m NGF", defaut: 0.05 },
  { cle: "metre_dpgf_pct", libelle: "Écart entre métré et DPGF", unite: "%", defaut: 5 },
];
const borneMax = (r: (typeof REGLABLES)[number]) => (r.cle === "metre_dpgf_pct" ? 50 : Math.min(50, Math.max(10 * r.defaut, 1)));
const nombreFr = (n: number) => String(n).replace(".", ",");

type Choix = { piece_id: string; role: RolePieceControle; reference: string };
type Form =
  | { type: "nouveau"; precedent: ControleT | null }
  | { type: "decider"; constat: Constat; statut: Exclude<Constat["statut"], "ouvert"> }
  | { type: "question"; constat: Constat }
  | { type: "suspendre" }
  | { type: "decideur" }
  | { type: "regler" }
  | null;

export default function Controle({ projet, dossier, nommer, peutEcrire, agir }: {
  projet: Projet;
  dossier: Dossier;
  nommer: (id: string | null | undefined) => string;
  peutEcrire: boolean;
  agir: (reel: () => Promise<void>, local: () => Dossier) => Promise<void>;
}) {
  const controles = useMemo(() => dossier.controles.filter((c) => c.projet_id === projet.id).sort((a, b) => b.cree_le.localeCompare(a.cree_le)), [dossier.controles, projet.id]);
  const piecesProjet = useMemo(() => dossier.pieces.filter((p) => p.objet_id === projet.id), [dossier.pieces, projet.id]);
  const [choisi, setChoisi] = useState<string | null>(null);
  const c = controles.find((x) => x.id === choisi) ?? controles[0] ?? null;
  const precedent = c?.precedent_id ? dossier.controles.find((x) => x.id === c.precedent_id) ?? null : null;
  const pieces = useMemo(() => (c ? dossier.controlePieces.filter((x) => x.controle_id === c.id) : []), [dossier.controlePieces, c]);
  const constats = useMemo(() => (c ? dossier.constats.filter((x) => x.controle_id === c.id) : []), [dossier.constats, c]);
  const ouverts = constats.filter((x) => x.statut === "ouvert").sort((a, b) => GRAVITES[a.gravite].rang - GRAVITES[b.gravite].rang || a.titre.localeCompare(b.titre));
  const decides = constats.filter((x) => x.statut !== "ouvert");
  const corrigesIci = c ? dossier.constats.filter((x) => x.corrige_au_controle === c.id) : [];
  const bloquants = ouverts.filter((x) => x.gravite === "bloquant").length;
  const pieceDe = (id: string | undefined) => dossier.pieces.find((p) => p.id === id);

  const [form, setForm] = useState<Form>(null);
  const [listesOuvert, setListesOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nc, setNc] = useState({ intitule: "", indice: "A" });
  const [choix, setChoix] = useState<Choix[]>([]);
  const [motif, setMotif] = useState("");
  const [nq, setNq] = useState({ intervenant: "", texte: "", echeance: "" });
  const clientId = dossier.moi?.client_id ?? "";
  /* qui décide (b5_30) : le décideur nommé, sinon toute l'équipe qui écrit ; le gérant et les admins gardent la main */
  const membres = useMemo(() => dossier.membres.filter((m) => m.projet_id === projet.id), [dossier.membres, projet.id]);
  const moiId = dossier.moi?.user_id ?? null;
  const direction = ["gerant", "admin"].includes(dossier.moi?.role ?? "");
  const peutChoisir = peutEcrire && (direction || membres.some((m) => m.user_id === moiId && m.role_projet === "chef_projet"));
  const peutDecider = peutEcrire && (!c?.decideur || c.decideur === moiId || direction);
  const [decideur, setDecideur] = useState("");
  /* réglages (b5_31) : saisis en texte (virgule acceptée) ; vide = la tolérance du code */
  const [tol, setTol] = useState<Record<string, string>>({});
  const [coupees, setCoupees] = useState<Constat["nature"][]>([]);
  const intervenants = useMemo(() => dossier.intervenants.filter((i) => i.projet_id === projet.id && i.actif).sort((a, b) => a.organisme.localeCompare(b.organisme)), [dossier.intervenants, projet.id]);

  const lancer = async (reel: () => Promise<void>, local: () => Dossier) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouvrirNouveau = (prec: ControleT | null) => {
    setErreur(null);
    setNc({ intitule: prec?.intitule ?? "Dossier de permis", indice: prec ? indiceSuivant(prec.indice) : "A" });
    /* à l'indice suivant, les mêmes pièces et les mêmes rôles ; sinon les pièces que leur nature désigne */
    const reprises = prec ? dossier.controlePieces.filter((x) => x.controle_id === prec.id) : [];
    setChoix(prec
      ? reprises.map((x) => ({ piece_id: x.piece_id, role: x.role, reference: x.reference ?? "" }))
      : piecesProjet.filter((p) => ROLE_DU_TYPE[p.type_piece ?? ""]).map((p) => ({ piece_id: p.id, role: ROLE_DU_TYPE[p.type_piece ?? ""], reference: "" })));
    setForm({ type: "nouveau", precedent: prec });
  };
  const basculer = (p: PieceProjet, oui: boolean) =>
    setChoix((l) => (oui ? [...l, { piece_id: p.id, role: ROLE_DU_TYPE[p.type_piece ?? ""] ?? "autre", reference: "" }] : l.filter((x) => x.piece_id !== p.id)));
  const changerChoix = (id: string, v: Partial<Choix>) => setChoix((l) => l.map((x) => (x.piece_id === id ? { ...x, ...v } : x)));

  const soumettreNouveau = () => {
    if (form?.type !== "nouveau") return;
    const v = { client_id: clientId, projet_id: projet.id, intitule: nc.intitule.trim().replace(/\s+/g, " "), indice: nc.indice.trim().toUpperCase(), precedent_id: form.precedent?.id ?? null };
    const lignes = choix.map((x) => ({ piece_id: x.piece_id, role: x.role, reference: x.reference.trim() || null }));
    return lancer(
      () => preparerControle(v, lignes).then((id) => {
        setChoisi(id);
        /* toutes les pièces déjà lues : on lance tout de suite ; sinon la dernière lecture le lancera */
        if (lignes.every((l) => lue(pieceDe(l.piece_id)))) return lancerControle(id).then(() => undefined);
      }),
      () => {
        const id = `local-controle-${Date.now()}`;
        setChoisi(id);
        const nouveau: ControleT = { id, projet_id: projet.id, intitule: v.intitule, indice: v.indice, precedent_id: v.precedent_id, statut: "en_lecture", lance_le: null, constats_nb: 0, cree_le: new Date().toISOString() };
        const cp: ControlePiece[] = lignes.map((l, i) => ({ id: `${id}-p${i}`, controle_id: id, ...l }));
        return { ...dossier, controles: [nouveau, ...dossier.controles], controlePieces: [...dossier.controlePieces, ...cp] };
      },
    );
  };

  const relancer = () => {
    if (!c) return;
    return lancer(
      () => lancerControle(c.id).then(() => undefined),
      () => {
        /* exemple : pas de croisement en mémoire ; les constats encore valables de l'indice précédent sont reconduits */
        const deja = new Set(constats.map((x) => x.precedent_id));
        const repris: Constat[] = precedent
          ? dossier.constats.filter((x) => x.controle_id === precedent.id && x.statut !== "corrige" && !deja.has(x.id))
              .map((x) => ({ ...x, id: `${x.id}-${c.indice}`, controle_id: c.id, precedent_id: x.id }))
          : [];
        const tous = [...constats, ...repris];
        return {
          ...dossier,
          constats: [...dossier.constats, ...repris],
          controles: dossier.controles.map((x) => (x.id === c.id ? { ...x, statut: x.statut === "clos" ? ("clos" as const) : ("controle" as const), lance_le: new Date().toISOString(), constats_nb: tous.filter((k) => k.statut === "ouvert").length } : x)),
        };
      },
    );
  };

  /* un point d'une liste de l'agence à vérifier à la main (b5_60) : « vérifié » = accepté, motif prérempli */
  const manuel = (k: Constat) => k.nature === "agence" && k.grandeur === "point_manuel";
  const ouvrirDecision = (k: Constat, statut: Exclude<Constat["statut"], "ouvert">) => {
    setErreur(null);
    setMotif(manuel(k) && statut === "accepte" ? "Vérifié" : "");
    setForm({ type: "decider", constat: k, statut });
  };
  const soumettreDecision = () => {
    if (form?.type !== "decider") return;
    const v = { statut: form.statut, motif: motif.trim() || null };
    const k = form.constat;
    return lancer(() => deciderConstat(k.id, v), () => ({ ...dossier, constats: dossier.constats.map((x) => (x.id === k.id ? { ...x, ...v, decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) }));
  };
  /* le rapport : PDF annoté (pages citées, boîtes lues) et Excel */
  const [rapport, setRapport] = useState<"pdf" | "xlsx" | null>(null);
  const donnees = (): DonneesRapport | null => (c ? {
    projet, controle: c, precedent, pieces, constats, corriges: corrigesIci, pieceDe, nommer,
    octets: (p) => (p.chemin ? octetsPiece(p.chemin) : Promise.resolve(null)),
  } : null);
  const exporter = async (format: "pdf" | "xlsx") => {
    const d = donnees();
    if (!d) return;
    setRapport(format);
    setErreur(null);
    try {
      const r = format === "pdf" ? await pdfControle(d) : excelControle(d);
      telecharger(r.nom, r.octets, format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le rapport n'a pas pu être fabriqué.");
    } finally {
      setRapport(null);
    }
  };

  /* un constat en question à l'entreprise ou au BET, l'extrait cité dans le texte */
  const ouvrirQuestion = (k: Constat) => {
    setErreur(null);
    const extrait = k.valeurs.map((v) => `— ${citation(v, k.grandeur)}`).join("\n");
    const texte = [`${k.titre}${c ? ` (contrôle « ${c.intitule} », indice ${c.indice})` : ""}`, extrait, k.correction ? `Correction proposée : ${k.correction}` : "", "Merci de confirmer ou de corriger."]
      .filter(Boolean).join("\n").slice(0, 1000);
    setNq({ intervenant: "", texte, echeance: "" });
    setForm({ type: "question", constat: k });
  };
  const soumettreQuestion = () => {
    if (form?.type !== "question") return;
    const i = intervenants.find((x) => x.id === nq.intervenant);
    const v = { client_id: clientId, entite_id: projet.entite_id, projet_id: projet.id, lot_id: i?.lot_id ?? null, intervenant_id: i?.id ?? null,
      nature: "question" as const, texte: nq.texte.trim(), echeance: nq.echeance || null, ouvert_au_cr: null };
    return lancer(() => ajouterPoints([v]), () => {
      const p: Point = { id: `local-point-${Date.now()}`, projet_id: v.projet_id, lot_id: v.lot_id, intervenant_id: v.intervenant_id, nature: "question", texte: v.texte, echeance: v.echeance,
        statut: "ouvert", reponse: null, repondu_le: null, ouvert_au_cr: null, clos_au_cr: null, cree_le: new Date().toISOString() };
      return { ...dossier, points: [...dossier.points, p] };
    });
  };
  const questionOk = form?.type === "question" && nq.texte.trim().length >= 1 && nq.texte.trim().length <= 1000;

  /* suspendre (motif obligatoire) ou reprendre : un contrôle suspendu ne se lance pas, même quand sa dernière pièce est lue */
  const ouvrirSuspension = () => {
    setErreur(null);
    setMotif("");
    setForm({ type: "suspendre" });
  };
  const soumettreSuspension = () => {
    if (!c) return;
    const m = motif.trim().replace(/\s+/g, " ");
    return lancer(() => suspendreControle(c.id, m), () => ({ ...dossier, controles: dossier.controles.map((x) => (x.id === c.id ? { ...x, suspendu_le: new Date().toISOString(), suspendu_motif: m } : x)) }));
  };
  const reprendre = () => {
    if (!c) return;
    return lancer(() => reprendreControle(c.id), () => ({ ...dossier, controles: dossier.controles.map((x) => (x.id === c.id ? { ...x, suspendu_le: null, suspendu_motif: null } : x)) }));
  };
  const ouvrirDecideur = () => {
    setErreur(null);
    setDecideur(c?.decideur ?? "");
    setForm({ type: "decideur" });
  };
  const soumettreDecideur = () => {
    if (!c) return;
    const d = decideur || null;
    return lancer(() => choisirDecideur(c.id, d), () => ({ ...dossier, controles: dossier.controles.map((x) => (x.id === c.id ? { ...x, decideur: d } : x)) }));
  };
  const ouvrirReglages = () => {
    setErreur(null);
    setTol(Object.fromEntries(Object.entries(projet.controle_tolerances ?? {}).map(([k, v]) => [k, nombreFr(v)])));
    setCoupees(projet.controle_familles_coupees ?? []);
    setForm({ type: "regler" });
  };
  /* les tolérances saisies : celles hors de l'écran (posées ailleurs) sont gardées ; une saisie invalide rend null */
  const tolerancesSaisies = (): Record<string, number> | null => {
    const r: Record<string, number> = Object.fromEntries(Object.entries(projet.controle_tolerances ?? {}).filter(([k]) => !REGLABLES.some((x) => x.cle === k)));
    for (const g of REGLABLES) {
      const t = (tol[g.cle] ?? "").trim().replace(",", ".");
      if (!t) continue;
      if (!/^\d+(\.\d+)?$/.test(t)) return null;
      const n = Number(t);
      if (n > borneMax(g) || (g.cle === "metre_dpgf_pct" && n < 1)) return null;
      r[g.cle] = n;
    }
    return r;
  };
  const reglagesOk = form?.type === "regler" && tolerancesSaisies() !== null && coupees.length < Object.keys(NATURES).length;
  const soumettreReglages = () => {
    const t = tolerancesSaisies();
    if (!t) return;
    const f = [...coupees].sort();
    return lancer(() => reglerControles(projet.id, t, f), () => ({ ...dossier, projets: dossier.projets.map((x) => (x.id === projet.id ? { ...x, controle_tolerances: t, controle_familles_coupees: f } : x)) }));
  };
  const reglesPropres = Object.keys(projet.controle_tolerances ?? {}).length;
  const famillesCoupees = projet.controle_familles_coupees ?? [];
  const suspensionOk = form?.type === "suspendre" && motif.trim().length >= 3 && motif.trim().length <= 300;

  const rouvrir = (k: Constat) => lancer(() => deciderConstat(k.id, { statut: "ouvert", motif: null }), () => ({ ...dossier, constats: dossier.constats.map((x) => (x.id === k.id ? { ...x, statut: "ouvert", motif: null } : x)) }));

  const nouveauOk = form?.type === "nouveau" && nc.intitule.trim().length >= 1 && nc.intitule.trim().length <= 160 && /^[0-9A-Za-z.-]{1,6}$/.test(nc.indice.trim())
    && choix.length >= 2 && !controles.some((x) => x.intitule === nc.intitule.trim().replace(/\s+/g, " ") && x.indice === nc.indice.trim().toUpperCase());
  const decisionOk = form?.type === "decider" && (form.statut === "corrige" || motif.trim().length >= 3);

  /* une valeur citée : « PC5, p. 2 : « +10,20 » » */
  const citation = (v: Constat["valeurs"][number], g: string | null) => {
    const ref = v.reference ?? pieceDe(v.piece)?.nom_fichier ?? "pièce";
    if (v.regle) return `Règle : ${v.borne === "max" ? "au plus" : "au moins"} ${String(v.valeur ?? "").replace(".", ",")}${unite(g)}${v.article ? `, article ${v.article}` : ""} (${ref}${v.page ? `, p. ${v.page}` : ""})`;
    return `${ref}${v.page ? `, p. ${v.page}` : ""}${v.texte ? ` : « ${v.texte} »` : ""}`;
  };

  return (
    <div className="esp-carte-corps">
      <div className="esp-section-titre">
        <span>Contrôle du dossier</span>
        <span className="esp-item-haut">
          {c ? <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => ouvrirNouveau(c)}>Revérifier à l’indice suivant</button> : null}
          <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || piecesProjet.length < 2} onClick={() => ouvrirNouveau(null)}>Nouveau contrôle</button>
          <button type="button" className="esp-lien-bouton" disabled={!peutChoisir || envoi} onClick={ouvrirReglages}>Régler les contrôles</button>
          <button type="button" className="esp-lien-bouton" onClick={() => setListesOuvert(true)}><ListChecks width={14} height={14} aria-hidden="true" /> Listes de l’agence</button>
        </span>
      </div>
      {reglesPropres || famillesCoupees.length ? (
        <p className="lor-sous lor-reglages">
          Réglages du projet : {reglesPropres ? `${pluriel(reglesPropres, "tolérance")} propre${reglesPropres > 1 ? "s" : ""}` : "tolérances du code"}
          {famillesCoupees.length ? ` · ne tourne${famillesCoupees.length > 1 ? "nt" : ""} pas : ${famillesCoupees.map((f) => NATURES[f]).join(", ")}` : ""}.
        </p>
      ) : null}

      {!c ? (
        <div className="lor-tableau-vide">
          {piecesProjet.length < 2
            ? "Déposez les planches, le CCTP, la DPGF ou le règlement du PLU : Lorani les lit, puis croise cotes, surfaces, reculs et postes d’une pièce à l’autre."
            : "Aucun contrôle : choisissez les pièces à croiser (planches entre elles, contre le règlement du PLU, CCTP contre DPGF)."}
        </div>
      ) : (
        <>
          {controles.length > 1 ? (
            <div className="esp-filtres lor-controles" role="group" aria-label="Contrôles du projet">
              {controles.map((x) => (
                <button key={x.id} type="button" className="esp-filtre" aria-pressed={x.id === c.id} onClick={() => setChoisi(x.id)}>
                  {x.intitule} · indice {x.indice}
                </button>
              ))}
            </div>
          ) : null}

          <div className="lor-controle-tete">
            <strong>{c.intitule} · indice {c.indice}</strong>
            <Pastille teinte={STATUTS[c.statut].teinte}>{STATUTS[c.statut].libelle}</Pastille>
            <span className="esp-kpi-sous">
              {c.lance_le ? `passé le ${jour(c.lance_le)}` : "en attente de la lecture des pièces"}
              {precedent ? ` · revérifie l’indice ${precedent.indice}` : ""}
            </span>
            {c.suspendu_le ? <Pastille teinte="ambre">Suspendu</Pastille> : null}
            <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || c.statut === "clos" || !!c.suspendu_le} onClick={relancer}>{envoi ? <Loader variant="spin" /> : null} {c.lance_le ? "Relancer" : "Lancer"}</button>
            {c.suspendu_le
              ? <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={reprendre}>Reprendre</button>
              : <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi || c.statut === "clos"} onClick={ouvrirSuspension}>Suspendre</button>}
          </div>
          <p className="lor-sous">
            Décide des constats : <strong>{c.decideur ? nommer(c.decideur) : "toute l’équipe du projet"}</strong>{" "}
            <button type="button" className="esp-lien-bouton" disabled={!peutChoisir || envoi || c.statut === "clos"} onClick={ouvrirDecideur}>Choisir qui décide</button>
            {c.decideur && !peutDecider ? <span> · vous pouvez préparer une question, la décision lui revient.</span> : null}
          </p>
          {c.suspendu_le ? (
            <p className="lor-sous" role="status">Suspendu le {jour(c.suspendu_le)} : {c.suspendu_motif}. Il ne se lancera pas, même quand ses pièces seront lues, tant qu’il n’est pas repris.</p>
          ) : null}
          {c.lance_le ? (
            <p className="lor-sous" role="status">
              {ouverts.length ? `${pluriel(ouverts.length, "constat")} ouvert${ouverts.length > 1 ? "s" : ""}, dont ${pluriel(bloquants, "bloquant")}.` : "Aucun constat ouvert."}
              {precedent ? ` ${pluriel(corrigesIci.length, "constat")} de l’indice ${precedent.indice} corrigé${corrigesIci.length > 1 ? "s" : ""}.` : ""}
            </p>
          ) : null}
          {c.lance_le ? (
            <div className="esp-actions lor-rapport">
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport} onClick={() => void exporter("pdf")}>{rapport === "pdf" ? <Loader variant="spin" /> : <FileDown width={15} height={15} aria-hidden="true" />} Rapport PDF annoté</button>
              <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!!rapport} onClick={() => void exporter("xlsx")}>{rapport === "xlsx" ? <Loader variant="spin" /> : <FileDown width={15} height={15} aria-hidden="true" />} Tableau Excel</button>
            </div>
          ) : null}
          {erreur && !form ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}

          <ul className="lor-controle-pieces" aria-label="Pièces croisées">
            {pieces.map((x) => {
              const p = pieceDe(x.piece_id);
              return (
                <li key={x.id}>
                  <strong>{x.reference ?? ROLES[x.role]}</strong> <span className="esp-kpi-sous">{ROLES[x.role]} · {p?.nom_fichier ?? "pièce"}{p && !lue(p) ? " · en lecture" : ""}</span>
                </li>
              );
            })}
          </ul>

          {ouverts.map((k) => (
            <div key={k.id} className="lor-constat" data-gravite={k.gravite}>
              <div className="lor-situation-tete">
                <Pastille teinte={GRAVITES[k.gravite].teinte}>{GRAVITES[k.gravite].libelle}</Pastille>
                <span className="esp-kpi-sous">{NATURES[k.nature]}{k.precedent_id ? ` · relevé depuis l’indice ${precedent?.indice ?? "précédent"}` : ""}</span>
              </div>
              <div>{k.titre}</div>
              {k.correction ? <div className="lor-sous"><strong>Correction proposée :</strong> {k.correction}</div> : null}
              {k.valeurs.length ? (
                <ul className="lor-citations" aria-label="Valeurs lues">
                  {k.valeurs.map((v, i) => <li key={i}>{citation(v, k.grandeur)}</li>)}
                </ul>
              ) : null}
              <div className="esp-actions">
                {manuel(k) ? (
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutDecider || envoi} onClick={() => ouvrirDecision(k, "accepte")}>Vérifié</button>
                ) : (
                  <>
                    <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutDecider || envoi} onClick={() => ouvrirDecision(k, "corrige")}>Corrigé</button>
                    <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutDecider || envoi} onClick={() => ouvrirDecision(k, "accepte")}>Accepter</button>
                  </>
                )}
                <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutDecider || envoi} onClick={() => ouvrirDecision(k, "ecarte")}>Écarter</button>
                <button type="button" className="esp-lien-bouton" disabled={!peutEcrire || envoi} onClick={() => ouvrirQuestion(k)}>En faire une question</button>
              </div>
            </div>
          ))}

          {c.changements?.length ? (
            <details className="lor-temps-recents" open={c.changements.some((x) => !x.releve)}>
              <summary>Changements depuis l’indice {precedent?.indice ?? "précédent"} ({c.changements.length}{c.changements.some((x) => !x.releve) ? `, dont ${c.changements.filter((x) => !x.releve).length} non relevé${c.changements.filter((x) => !x.releve).length > 1 ? "s" : ""}` : ""})</summary>
              <ul className="lor-liste">
                {c.changements.map((x, i) => (
                  <li key={i}>
                    <Pastille teinte={x.releve ? "gris" : "ambre"}>{x.releve ? "Relevé" : "Non relevé"}</Pastille>{" "}
                    <strong>{x.reference}</strong> · {x.libelle.charAt(0).toUpperCase() + x.libelle.slice(1)} : {valeurIndice(x.avant, x.unite)} → {valeurIndice(x.apres, x.unite)}
                    <span className="lor-sous"> {x.page_apres ? `p. ${x.page_apres}` : ""}{x.texte_apres ? ` · « ${x.texte_apres} »` : ""}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {corrigesIci.length ? (
            <details className="lor-temps-recents">
              <summary>Corrigés depuis l’indice {precedent?.indice ?? "précédent"} ({corrigesIci.length})</summary>
              <ul className="lor-liste">
                {corrigesIci.map((k) => <li key={k.id}><Pastille teinte="vert">Corrigé à l’indice {c.indice}</Pastille> {k.titre}</li>)}
              </ul>
            </details>
          ) : null}
          {decides.length ? (
            <details className="lor-temps-recents">
              <summary>Décidés ({decides.length})</summary>
              <ul className="lor-liste">
                {decides.map((k) => {
                  const d = manuel(k) && k.statut === "accepte" ? { libelle: "Vérifié", teinte: "vert" as const } : DECISIONS[k.statut as Exclude<Constat["statut"], "ouvert">];
                  return (
                    <li key={k.id}>
                      <Pastille teinte={d.teinte}>{d.libelle}</Pastille> {k.titre}
                      <span className="lor-sous"> {k.motif ? `Motif : ${k.motif}` : ""}{k.decide_par ? ` · ${nommer(k.decide_par)}, le ${jour(k.decide_le)}` : ""}</span>{" "}
                      <button type="button" className="esp-lien-bouton" disabled={!peutDecider || envoi} onClick={() => void rouvrir(k)}>Rouvrir</button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </>
      )}

      <ListesAgence dossier={dossier} ouvert={listesOuvert} fermer={() => setListesOuvert(false)} agir={agir} />

      {/* ——— nouveau contrôle, ou revérification à l'indice suivant ——— */}
      <Dialog open={form?.type === "nouveau"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ScanSearch width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "nouveau" && form.precedent ? `Revérifier à l’indice suivant` : "Nouveau contrôle du dossier"}</DialogTitle>
            <DialogDescription>
              {form?.type === "nouveau" && form.precedent
                ? `Remplacez les planches qui ont changé d’indice. Ce qui ne se retrouve plus passera « corrigé » sur l’indice ${form.precedent.indice} ; ce qui reste gardera la décision prise.`
                : "Les pièces à croiser : les planches entre elles, contre le règlement du PLU, le CCTP et le métré contre la DPGF. Le contrôle se lance quand toutes sont lues."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Intitulé <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={nc.intitule} maxLength={160} onChange={(e) => setNc((s) => ({ ...s, intitule: e.target.value }))} placeholder="Dossier de permis" />
                </label>
                <label className="rv-libelle">Indice
                  <input className="rv-champ" value={nc.indice} maxLength={6} onChange={(e) => setNc((s) => ({ ...s, indice: e.target.value }))} />
                </label>
              </div>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Pièces croisées <span className="esp-obligatoire">(deux au moins)</span></legend>
                {piecesProjet.map((p) => {
                  const x = choix.find((y) => y.piece_id === p.id);
                  return (
                    <div key={p.id} className="lor-choix-piece">
                      <label className="lor-choix-case">
                        <input type="checkbox" checked={!!x} onChange={(e) => basculer(p, e.target.checked)} /> <span>{p.nom_fichier}</span>
                      </label>
                      {x ? (
                        <span className="lor-choix-role">
                          <select className="rv-champ" aria-label={`Rôle de ${p.nom_fichier}`} value={x.role} onChange={(e) => changerChoix(p.id, { role: e.target.value as RolePieceControle })}>
                            {(Object.keys(ROLES) as RolePieceControle[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                          </select>
                          <input className="rv-champ" aria-label={`Référence de ${p.nom_fichier}`} value={x.reference} maxLength={40} placeholder="PC2" onChange={(e) => changerChoix(p.id, { reference: e.target.value })} />
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </fieldset>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!nouveauOk || envoi} onClick={soumettreNouveau}>{envoi ? <Loader variant="spin" /> : null} Préparer le contrôle</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— un constat en question à l'entreprise ou au BET ——— */}
      <Dialog open={form?.type === "question"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><MessageSquareText width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>En faire une question</DialogTitle>
            <DialogDescription>
              La question part avec l’extrait cité. Elle rejoint les points suivis des comptes rendus : sans réponse depuis huit jours, elle remonte au point du matin.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">À qui
                  <select className="rv-champ" value={nq.intervenant} onChange={(e) => setNq((s) => ({ ...s, intervenant: e.target.value }))}>
                    <option value="">Personne en particulier</option>
                    {intervenants.map((i) => <option key={i.id} value={i.id}>{i.organisme}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Réponse attendue le
                  <input className="rv-champ" type="date" value={nq.echeance} onChange={(e) => setNq((s) => ({ ...s, echeance: e.target.value }))} />
                </label>
              </div>
              <label className="rv-libelle">Question <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={7} maxLength={1000} value={nq.texte} onChange={(e) => setNq((s) => ({ ...s, texte: e.target.value }))} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!questionOk || envoi} onClick={soumettreQuestion}>{envoi ? <Loader variant="spin" /> : null} Poser la question</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— suspendre le contrôle ——— */}
      <Dialog open={form?.type === "suspendre"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><PauseCircle width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Suspendre le contrôle</DialogTitle>
            <DialogDescription>{c ? `${c.intitule}, indice ${c.indice}. ` : ""}Suspendu, il ne se lance plus, même quand sa dernière pièce est lue. Ses constats restent ; vous le reprenez quand vous voulez.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={3} maxLength={300} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="En attente de l’indice B des façades" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!suspensionOk || envoi} onClick={soumettreSuspension}>{envoi ? <Loader variant="spin" /> : null} Suspendre</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— régler les contrôles du projet ——— */}
      <Dialog open={form?.type === "regler"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><SlidersHorizontal width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Régler les contrôles</DialogTitle>
            <DialogDescription>{projet.nom}. L’écart toléré entre deux pièces avant qu’un constat ne soit relevé, et les familles de contrôle qui tournent. Vide : la tolérance par défaut. Les réglages valent au prochain passage.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Écarts tolérés</legend>
                <div className="lor-tolerances">
                  {REGLABLES.map((g) => (
                    <label key={g.cle} className="rv-libelle">{g.libelle} <span className="esp-kpi-sous">({g.unite}, jusqu’à {nombreFr(borneMax(g))})</span>
                      <input className="rv-champ" inputMode="decimal" value={tol[g.cle] ?? ""} onChange={(e) => setTol((s) => ({ ...s, [g.cle]: e.target.value }))} placeholder={nombreFr(g.defaut)} />
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="lor-choix-pieces">
                <legend className="rv-libelle">Familles de contrôle</legend>
                <div className="lor-activites">
                  {(Object.entries(NATURES) as [Constat["nature"], string][]).map(([cle, libelle]) => (
                    <label key={cle} className="lor-choix-case">
                      <input type="checkbox" checked={!coupees.includes(cle)} onChange={(e) => setCoupees((l) => (e.target.checked ? l.filter((x) => x !== cle) : [...l, cle]))} /> <span>{libelle}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {form?.type === "regler" && tolerancesSaisies() === null ? <Avis teinte="ambre" role="status">Une tolérance est hors des bornes ou n’est pas un nombre.</Avis> : null}
              {coupees.length >= Object.keys(NATURES).length ? <Avis teinte="ambre" role="status">Gardez au moins une famille de contrôle.</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!reglagesOk || envoi} onClick={soumettreReglages}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— choisir qui décide ——— */}
      <Dialog open={form?.type === "decideur"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><UserCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Choisir qui décide</DialogTitle>
            <DialogDescription>{c ? `${c.intitule}, indice ${c.indice}. ` : ""}La personne choisie marque les constats corrigés, acceptés ou écartés ; les autres membres préparent les questions. Le gérant et les admins gardent la main.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Décide des constats
                <select className="rv-champ" value={decideur} onChange={(e) => setDecideur(e.target.value)}>
                  <option value="">Toute l’équipe du projet</option>
                  {membres.map((m) => <option key={m.id} value={m.user_id}>{nommer(m.user_id)} · {ROLES_PROJET[m.role_projet]}</option>)}
                  {decideur && !membres.some((m) => m.user_id === decideur) ? <option value={decideur}>{nommer(decideur)}</option> : null}
                </select>
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || (decideur || null) === (c?.decideur ?? null)} onClick={soumettreDecideur}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ——— décider un constat ——— */}
      <Dialog open={form?.type === "decider"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><ShieldCheck width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{form?.type === "decider" ? (manuel(form.constat) && form.statut === "accepte" ? "Marquer vérifié" : DECISIONS[form.statut].verbe) : ""}</DialogTitle>
            <DialogDescription>
              {form?.type === "decider" ? form.constat.titre : ""}{" "}
              {form?.type === "decider" && manuel(form.constat) ? "Le motif est obligatoire ; ce point se revérifie à l’indice suivant."
                : form?.type === "decider" && form.statut !== "corrige" ? "Le motif est obligatoire ; il suit le constat aux indices suivants." : "Le prochain indice le confirmera : un constat qui se retrouve rouvre."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif {form?.type === "decider" && form.statut !== "corrige" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <textarea className="rv-champ" rows={3} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={form?.type === "decider" && form.statut === "ecarte" ? "Dérogation accordée par la mairie le 12/09" : "Planche PC5 reprise"} />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!decisionOk || envoi} onClick={soumettreDecision}>{envoi ? <Loader variant="spin" /> : null} {form?.type === "decider" ? (manuel(form.constat) && form.statut === "accepte" ? "Marquer vérifié" : DECISIONS[form.statut].verbe) : ""}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
