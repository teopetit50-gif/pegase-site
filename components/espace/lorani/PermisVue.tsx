"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le permis ouvert — /espace/lorani (05/10/2026, session B5)

   En tête : le titre, l'état, le régime (règle d'instruction, effet du
   silence) et quatre chiffres (déposé le, décision attendue, purge,
   chantier). Puis, dans l'ordre où une agence les traite :
     1. ce qui attend un membre : les dates lues sur les courriers de la
        mairie (confirmer, avec correction possible, ou écarter avec motif)
        et la décision implicite à confirmer ;
     2. le calendrier : chaque étape avec sa date, sa certitude, l'article
        du code qui la fonde ; la ligne « aujourd'hui » au bon endroit ;
     3. les échéances posées dans le socle (rappels prévus et partis,
        responsable, action attendue) ;
     4. les recours, et leur issue ;
     5. les avertissements du calcul ;
     6. les courriers du dossier.
   Chaque écriture passe par portes.ts ; en exemple elle est appliquée en
   mémoire (onLocal) pour que l'écran réagisse. Les formulaires sont des
   Dialog ; ce qui est obligatoire est dit, et le bouton reste gris sans.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { CalendarCheck, CalendarPlus, Check, FileSignature, Gavel, ListChecks, Scale, SlidersHorizontal, XCircle } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte, dateHeure } from "../format";
import { DECISIONS, ETATS, ISSUES_RECOURS, NATURES_DATE_LUE, NATURES_RECOURS, STATUTS_ETAPE, TYPES, libelleRappel, libelleTypePiece, titrePermis } from "./etats";
import { clore_recours, confirmerDateLue, confirmerDecisionImplicite, ecarterDateLue, saisirPermis, saisirRecours, type SaisiePermis } from "./portes";
import type { Calcul, DateLue, Dossier, Echeance, Etape, Permis, PieceProjet, Projet, Recours } from "./types";

type Props = {
  permis: Permis;
  projet: Projet;
  dossier: Dossier;
  source: Source;
  peutEcrire: boolean;
  nommer: (id: string | null | undefined) => string;
  /* en exemple : appliquer en mémoire */
  onLocal: (d: Dossier) => void;
  /* en base réelle : relire */
  relire: () => Promise<void>;
};

/* « PCMI 3, PC8 » ou « PCMI 3 PC 8 » → [PCMI3, PC8] : un espace suivi d'un chiffre reste dans le code */
const decouperCodes = (brut: string) => brut.split(/[,;]+|\s+(?=[A-Za-z])/).map((c) => c.replace(/\s/g, "").toUpperCase()).filter(Boolean);

/* Une lettre de demande de pièces, appliquée comme le fait le socle (b5_07, trigger lorani_permis_suivre_demandes) :
   une seconde lettre complète la première (union, date de la première gardée) ; après la remise des pièces, elle ne va
   qu'à l'historique ; à la même date, elle corrige la liste. */
const unionPieces = (a: { code: string }[], b: { code: string }[]) => [...a, ...b.filter((x) => !a.some((y) => y.code === x.code))];
function appliquerDemande(p: Permis, date: string, pieces: { code: string }[]): Partial<Permis> {
  const hist = [...(p.demandes_pieces ?? (p.date_demande_pieces ? [{ date: p.date_demande_pieces, pieces: p.pieces_demandees }] : [])).filter((h) => h.date !== date), { date, pieces }].sort((x, y) => x.date.localeCompare(y.date));
  if (!p.date_demande_pieces || p.date_demande_pieces === date) return { date_demande_pieces: date, pieces_demandees: pieces, demandes_pieces: hist, etat: "pieces_demandees" };
  if (p.date_pieces_fournies) return { demandes_pieces: hist };
  const premiere = date < p.date_demande_pieces;
  return { date_demande_pieces: premiere ? date : p.date_demande_pieces, pieces_demandees: premiere ? unionPieces(pieces, p.pieces_demandees) : unionPieces(p.pieces_demandees, pieces), demandes_pieces: hist, etat: "pieces_demandees" };
}

type Quoi = "pieces_fournies" | "affichage" | "decision" | "delai" | "depot" | "demande_pieces";

type Form =
  | { type: "confirmer"; date: DateLue }
  | { type: "ecarter"; date: DateLue }
  | { type: "implicite" }
  | { type: "saisir"; quoi: Quoi }
  | { type: "recours" }
  | { type: "issue"; recours: Recours }
  | { type: "regime" }
  | null;

const aujourdHuiIso = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const j = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
};

function jours(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  const t = new Date();
  t.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

function quand(iso: string | null | undefined): string {
  const j = jours(iso);
  if (j === null) return "";
  if (j < 0) return j === -1 ? "hier" : `il y a ${-j} jours`;
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "demain";
  return `dans ${j} jours`;
}

/* La proposition d'une date lue, en clair. */
function valeursEnClair(nature: DateLue["nature"], v: Record<string, unknown>): { libelle: string; valeur: string }[] {
  return NATURES_DATE_LUE[nature].champs
    .filter((c) => v[c.cle] !== undefined && v[c.cle] !== null)
    .map((c) => {
      const x = v[c.cle];
      let valeur: string;
      if (c.type === "date") valeur = dateCourte(`${x}T12:00:00`);
      else if (c.type === "decision") valeur = DECISIONS[x as keyof typeof DECISIONS] ?? String(x);
      else if (c.type === "pieces") valeur = Array.isArray(x) ? (x as { code: string }[]).map((p) => p.code).join(", ") || "aucune" : String(x);
      else if (c.type === "entier") valeur = `${x} mois`;
      else valeur = String(x);
      return { libelle: c.libelle, valeur };
    });
}

export default function PermisVue({ permis: p, projet, dossier, source, peutEcrire, nommer, onLocal, relire }: Props) {
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const c: Calcul = p.calcul ?? { etat: p.etat, etapes: [] };
  const titre = titrePermis(p, projet.nom);
  const datesLues = useMemo(() => dossier.datesLues.filter((d) => d.permis_id === p.id || (d.permis_id === null && d.projet_id === p.projet_id)), [dossier.datesLues, p]);
  const proposees = datesLues.filter((d) => d.statut === "proposee");
  const decidees = datesLues.filter((d) => d.statut !== "proposee").sort((a, b) => (b.decide_le ?? "").localeCompare(a.decide_le ?? ""));
  const echeances = useMemo(() => dossier.echeances.filter((e) => e.permis_id === p.id).sort((a, b) => a.echeance.localeCompare(b.echeance)), [dossier.echeances, p.id]);
  const recours = useMemo(() => dossier.recours.filter((r) => r.permis_id === p.id), [dossier.recours, p.id]);
  const pieces = useMemo(() => dossier.pieces.filter((x) => x.objet_id === p.projet_id), [dossier.pieces, p.projet_id]);
  const etat = ETATS[p.etat] ?? ETATS.a_deposer;
  const dp = p.type_autorisation === "dp";
  const accorde = p.decision === "favorable" || p.decision === "tacite";

  /* ——— la ligne « aujourd'hui » dans le calendrier ——— */
  const etapes = c.etapes ?? [];
  const auj = aujourdHuiIso();
  const rangAujourdhui = (() => {
    let i = 0;
    while (i < etapes.length && etapes[i].date && etapes[i].date! < auj) i++;
    return i;
  })();

  /* ——— appliquer une écriture ——— */
  const appliquer = async (reel: () => Promise<void>, local: () => Dossier, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reel();
        await relire();
      } else {
        onLocal(local());
      }
      setForm(null);
      setFait(message);
      window.setTimeout(() => setFait(null), 6000);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  const majPermis = (d: Dossier, id: string, patch: Partial<Permis>): Dossier => ({ ...d, permis: d.permis.map((x) => (x.id === id ? { ...x, ...patch, maj_le: new Date().toISOString() } : x)) });

  /* ——— formulaire : confirmer une date lue ——— */
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [permisVise, setPermisVise] = useState<string>("");
  const ouvrirConfirmation = (d: DateLue) => {
    const v: Record<string, string> = {};
    for (const ch of NATURES_DATE_LUE[d.nature].champs) {
      const x = d.proposition[ch.cle];
      v[ch.cle] = ch.type === "pieces" ? (Array.isArray(x) ? (x as { code: string }[]).map((q) => q.code).join(", ") : "") : x === undefined || x === null ? "" : String(x);
    }
    setValeurs(v);
    setPermisVise(d.permis_id ?? dossier.permis.find((x) => x.projet_id === d.projet_id && x.actif)?.id ?? "");
    setErreur(null);
    setForm({ type: "confirmer", date: d });
  };
  const confirmationComplete = form?.type === "confirmer" && NATURES_DATE_LUE[form.date.nature].champs.every((ch) => ch.cle === "numero" || ch.cle === "date_notification_delai" || (valeurs[ch.cle] ?? "").trim() !== "") && !!permisVise;

  const soumettreConfirmation = async () => {
    if (form?.type !== "confirmer") return;
    const d = form.date;
    const v: Record<string, unknown> = {};
    let corrige = false;
    for (const ch of NATURES_DATE_LUE[d.nature].champs) {
      const brut = (valeurs[ch.cle] ?? "").trim();
      let x: unknown;
      if (ch.type === "pieces") x = brut ? decouperCodes(brut).map((code) => ({ code })) : [];
      else if (ch.type === "entier") x = brut ? Number(brut) : null;
      else x = brut || null;
      if (JSON.stringify(x) !== JSON.stringify(d.proposition[ch.cle] ?? null)) corrige = true;
      if (x !== null) v[ch.cle] = x;
    }
    const patch: Partial<Permis> = {};
    if (d.nature === "depot") Object.assign(patch, { date_depot: v.date_depot as string, numero: (v.numero as string) ?? null, etat: "instruction" as const });
    if (d.nature === "delai_notifie") {
      const cible = dossier.permis.find((x) => x.id === permisVise);
      Object.assign(patch, {
        delai_notifie_mois: v.delai_notifie_mois as number,
        date_notification_delai: (v.date_notification_delai as string) ?? null,
        /* en exemple, le régime du calcul dit le délai notifié ; en base réelle, le moteur le recalcule */
        calcul: cible ? { ...cible.calcul, regime: cible.calcul.regime ? { ...cible.calcul.regime, delai_notifie_mois: v.delai_notifie_mois as number } : undefined } : undefined,
      });
    }
    if (d.nature === "demande_pieces") {
      const cible = dossier.permis.find((x) => x.id === permisVise);
      if (cible) Object.assign(patch, appliquerDemande(cible, v.date_demande_pieces as string, (v.pieces as { code: string }[]) ?? []));
    }
    if (d.nature === "decision") Object.assign(patch, { decision: v.decision as Permis["decision"], date_decision: v.date_decision as string, etat: v.decision === "favorable" ? ("accorde" as const) : ("refuse" as const) });
    if (d.nature === "decision_tacite") Object.assign(patch, { decision: "tacite" as const, date_decision: v.date_decision as string, etat: "accorde" as const });
    if (d.nature === "affichage") Object.assign(patch, { date_affichage: v.date_affichage as string });
    await appliquer(
      () => confirmerDateLue(d.id, corrige ? v : null, permisVise !== d.permis_id ? permisVise : null).then(() => undefined),
      () => {
        const d2 = majPermis(dossier, permisVise, patch);
        return { ...d2, datesLues: d2.datesLues.map((x) => (x.id === d.id ? { ...x, statut: "confirmee", permis_id: permisVise, confirme: v, decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) };
      },
      corrige ? "Date confirmée avec vos corrections : le calendrier est recalculé." : "Date confirmée : le calendrier est recalculé.",
    );
  };

  /* ——— formulaire : écarter ——— */
  const [motif, setMotif] = useState("");
  const motifOk = motif.trim().length >= 3 && motif.trim().length <= 300;
  const soumettreEcart = async () => {
    if (form?.type !== "ecarter") return;
    const d = form.date;
    await appliquer(
      () => ecarterDateLue(d.id, motif.trim()),
      () => ({ ...dossier, datesLues: dossier.datesLues.map((x) => (x.id === d.id ? { ...x, statut: "ecartee", motif: motif.trim(), decide_par: dossier.moi?.user_id ?? null, decide_le: new Date().toISOString() } : x)) }),
      "Lecture écartée : le permis n'en garde rien, le motif reste au journal.",
    );
  };

  /* ——— la décision implicite ——— */
  const soumettreImplicite = async () => {
    const impl = c.decision_implicite;
    if (!impl) return;
    await appliquer(
      () => confirmerDecisionImplicite(p.id).then(() => undefined),
      () => majPermis(dossier, p.id, { decision: impl.nature, date_decision: impl.date, etat: impl.nature === "tacite" ? "accorde" : "rejete", calcul: { ...c, etat: impl.nature === "tacite" ? "accorde" : "rejete", decision_implicite: undefined, etapes: c.etapes.map((e) => (e.nature === "decision" ? { ...e, statut: "fait" as const, libelle: impl.nature === "tacite" ? (dp ? "Non-opposition tacite, confirmée" : "Permis tacite, confirmé") : dp ? "Opposition tacite, confirmée" : "Rejet implicite, confirmé" } : e)) } }),
      impl.nature === "tacite" ? "Décision tacite confirmée, datée par le moteur. Affichez le permis sur le terrain, puis saisissez le premier jour." : "Rejet implicite confirmé.",
    );
  };

  /* ——— saisir une date sur le permis ——— */
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const ouvrirSaisie = (quoi: Quoi) => {
    setSaisie({ date: aujourdHuiIso(), decision: "favorable", mois: "", numero: p.numero ?? "", pieces: "" });
    setErreur(null);
    setForm({ type: "saisir", quoi });
  };
  const soumettreSaisie = async () => {
    if (form?.type !== "saisir") return;
    const q = form.quoi;
    const date = saisie.date;
    const v: SaisiePermis = {};
    const patch: Partial<Permis> = {};
    let message = "Saisi : le calendrier est recalculé.";
    if (q === "pieces_fournies") {
      v.date_pieces_fournies = date;
      Object.assign(patch, { date_pieces_fournies: date, etat: "instruction" as const });
      message = "Pièces reçues par la mairie : l'instruction repart de cette date.";
    } else if (q === "affichage") {
      v.date_affichage = date;
      Object.assign(patch, { date_affichage: date });
      message = "Premier jour d'affichage saisi : le délai de recours des tiers court.";
    } else if (q === "decision") {
      v.decision = saisie.decision as Permis["decision"];
      v.date_decision = date;
      Object.assign(patch, { decision: v.decision, date_decision: date, etat: v.decision === "favorable" ? ("accorde" as const) : ("refuse" as const) });
      message = v.decision === "favorable" ? "Accord saisi : affichez le permis, puis saisissez le premier jour." : "Refus saisi.";
    } else if (q === "delai") {
      v.delai_notifie_mois = Number(saisie.mois);
      v.date_notification_delai = date;
      Object.assign(patch, { delai_notifie_mois: Number(saisie.mois), date_notification_delai: date });
      message = "Délai notifié saisi : la fin d'instruction est recalculée.";
    } else if (q === "depot") {
      v.date_depot = date;
      v.numero = saisie.numero.trim() || null;
      Object.assign(patch, { date_depot: date, numero: saisie.numero.trim() || null, etat: "completude" as const });
      message = "Dépôt saisi : la mairie a un mois pour réclamer des pièces.";
    } else if (q === "demande_pieces") {
      v.date_demande_pieces = date;
      v.pieces_demandees = decouperCodes(saisie.pieces).map((code) => ({ code }));
      Object.assign(patch, appliquerDemande(p, date, v.pieces_demandees as { code: string }[]));
      message = "Demande de pièces saisie : trois mois pour les adresser à la mairie.";
    }
    await appliquer(() => saisirPermis(p.id, v), () => majPermis(dossier, p.id, patch), message);
  };
  const saisieOk = form?.type === "saisir" && /^\d{4}-\d{2}-\d{2}$/.test(saisie.date) && (form.quoi !== "delai" || (Number(saisie.mois) >= 1 && Number(saisie.mois) <= 24)) && (form.quoi !== "demande_pieces" || saisie.pieces.trim() !== "");

  /* ——— les recours ——— */
  const [rec, setRec] = useState({ nature: "gracieux", date: aujourdHuiIso(), auteur: "", issue: "rejete", date_issue: aujourdHuiIso() });
  const soumettreRecours = async () => {
    await appliquer(
      () => saisirRecours({ client_id: p.client_id, permis_id: p.id, nature: rec.nature as Recours["nature"], date_recours: rec.date, auteur: rec.auteur.trim() || null }).then(() => undefined),
      () => {
        const nouveau: Recours = { id: `local-${Date.now()}`, client_id: p.client_id, entite_id: p.entite_id, projet_id: p.projet_id, permis_id: p.id, nature: rec.nature as Recours["nature"], date_recours: rec.date, auteur: rec.auteur.trim() || null, issue: "en_cours", date_issue: null, cree_le: new Date().toISOString(), maj_le: new Date().toISOString() };
        const d2 = majPermis(dossier, p.id, { etat: "recours_en_cours", date_purge: null, calcul: { ...c, etat: "recours_en_cours", date_purge: undefined, chantier_sans_risque_le: undefined, avertissements: [...(c.avertissements ?? []), "Un recours est en cours : pas de purge avant son issue, à saisir ici."] } });
        return { ...d2, recours: [...d2.recours, nouveau] };
      },
      "Recours saisi : pas de purge avant son issue.",
    );
  };
  const soumettreIssue = async () => {
    if (form?.type !== "issue") return;
    const r = form.recours;
    await appliquer(
      () => clore_recours(r.id, rec.issue as Recours["issue"], rec.date_issue),
      () => {
        const d2 = { ...dossier, recours: dossier.recours.map((x) => (x.id === r.id ? { ...x, issue: rec.issue as Recours["issue"], date_issue: rec.date_issue } : x)) };
        return majPermis(d2, p.id, rec.issue === "annulation" ? { etat: "annule", calcul: { ...c, etat: "annule" } } : { etat: "accorde", calcul: { ...c, etat: "accorde", avertissements: (c.avertissements ?? []).filter((a) => !a.startsWith("Un recours est en cours")) } });
      },
      "Issue du recours saisie : le calendrier est recalculé.",
    );
  };

  /* ——— le régime : les cases qui changent la règle et l'effet du silence ——— */
  const [regime, setRegime] = useState({ secteur_protege: false, immeuble_inscrit_mh: false, erp_autorisation: false, igh: false, evaluation_environnementale: false, cas_rejet: [] as string[] });
  const ouvrirRegime = () => {
    setRegime({ secteur_protege: p.secteur_protege, immeuble_inscrit_mh: p.immeuble_inscrit_mh, erp_autorisation: p.erp_autorisation, igh: p.igh, evaluation_environnementale: p.evaluation_environnementale, cas_rejet: [...(p.cas_rejet ?? [])] });
    setErreur(null);
    setForm({ type: "regime" });
  };
  const soumettreRegime = async () => {
    const v: SaisiePermis = { ...regime };
    const silence: "tacite" | "rejet" = regime.cas_rejet.length || regime.immeuble_inscrit_mh || regime.evaluation_environnementale ? "rejet" : "tacite";
    await appliquer(
      () => saisirPermis(p.id, v),
      () => majPermis(dossier, p.id, { ...regime, silence, calcul: { ...c, regime: c.regime ? { ...c.regime, silence, effet_silence: silence === "rejet" ? (dp ? "opposition tacite" : "rejet implicite") : c.regime.effet_silence, motifs_silence: dossier.casRejet.filter((x) => regime.cas_rejet.includes(x.code)) } : undefined } }),
      "Régime saisi : la règle d'instruction et l'effet du silence sont recalculés.",
    );
  };

  const gris = !peutEcrire || envoi;

  return (
    <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
      {/* ——— en-tête ——— */}
      <section className="esp-carte" aria-label="Le permis">
        <div className="esp-carte-tete">
          <div>
            <h2 className="esp-carte-titre">{titre}</h2>
            <div className="lor-sous">
              {TYPES[p.type_autorisation].libelle}
              {p.numero ? <> · <span className="esp-mono">{p.numero}</span></> : " · sans numéro"}
              {" · "}
              {projet.commune ?? "commune inconnue"}
              {projet.parcelles.length ? ` · ${projet.parcelles.join(", ")}` : ""}
            </div>
          </div>
          <span className="esp-item-haut">
            <Pastille teinte={etat.teinte}>{etat.libelle}</Pastille>
            {p.secteur_protege ? <Pastille contour>Secteur protégé</Pastille> : null}
            {p.immeuble_inscrit_mh ? <Pastille contour>Monument historique</Pastille> : null}
            {p.erp_autorisation ? <Pastille contour>ERP</Pastille> : null}
            {p.igh ? <Pastille contour>IGH</Pastille> : null}
            {p.evaluation_environnementale ? <Pastille contour>Évaluation environnementale</Pastille> : null}
            {!p.actif ? <Pastille teinte="gris">Inactif</Pastille> : null}
            {peutEcrire && p.actif ? <button type="button" className="esp-lien-bouton" disabled={gris} onClick={ouvrirRegime}><SlidersHorizontal width={14} height={14} aria-hidden="true" style={{ verticalAlign: "-2px", marginRight: 4 }} />Régime</button> : null}
          </span>
        </div>
        <div className="esp-carte-corps">
          <dl className="lor-bandeau">
            <div className="lor-chiffre">
              <dt>Déposé le</dt>
              <dd>{p.date_depot ? dateCourte(`${p.date_depot}T12:00:00`) : "—"}{p.date_depot ? <small>{quand(p.date_depot)}</small> : <small>à déposer</small>}</dd>
            </div>
            <div className="lor-chiffre" data-teinte={p.etat === "pieces_demandees" ? "rouge" : undefined}>
              <dt>{p.etat === "pieces_demandees" ? "Pièces à fournir avant le" : "Décision attendue le"}</dt>
              <dd>
                {p.etat === "pieces_demandees"
                  ? (() => {
                      const e = etapes.find((x) => x.nature === "pieces");
                      return e?.date ? <>{dateCourte(`${e.date}T12:00:00`)}<small>{quand(e.date)} · sinon {dp ? "opposition" : "rejet"} tacite</small></> : "—";
                    })()
                  : p.decision
                    ? <>{DECISIONS[p.decision]}<small>le {dateCourte(`${p.date_decision}T12:00:00`)}</small></>
                    : c.date_decision_attendue
                      ? <>{dateCourte(`${c.date_decision_attendue}T12:00:00`)}<small>{quand(c.date_decision_attendue)} · sinon {c.regime?.effet_silence ?? "permis tacite"}</small></>
                      : "—"}
              </dd>
            </div>
            <div className="lor-chiffre" data-teinte={accorde && p.date_affichage ? "vert" : accorde ? "ambre" : undefined}>
              <dt>Purgé de tout recours le</dt>
              <dd>
                {c.date_purge ? <>{dateCourte(`${c.date_purge}T12:00:00`)}<small>{quand(c.date_purge)}</small></> : accorde && !p.date_affichage ? <>Affichage à saisir<small>le recours des tiers ne court pas</small></> : p.etat === "recours_en_cours" ? <>Suspendu<small>recours en cours</small></> : "—"}
              </dd>
            </div>
            <div className="lor-chiffre" data-teinte={c.chantier_sans_risque_le && c.chantier_sans_risque_le <= auj ? "vert" : undefined}>
              <dt>Chantier sans risque dès le</dt>
              <dd>{c.chantier_sans_risque_le ? <>{dateCourte(`${c.chantier_sans_risque_le}T12:00:00`)}<small>{c.chantier_sans_risque_le <= auj ? "vous pouvez démarrer" : quand(c.chantier_sans_risque_le)}</small></> : "—"}</dd>
            </div>
          </dl>
          {c.regime ? (
            <p className="esp-kpi-sous" style={{ marginTop: 10 }}>
              Règle d&apos;instruction : <span className="esp-mono">{c.regime.regle_instruction}</span>
              {c.regime.delai_notifie_mois ? ` · délai de ${c.regime.delai_notifie_mois} mois notifié par la mairie` : ""}
              {" · "}sans réponse de la mairie : <strong>{c.regime.effet_silence}</strong>
              {c.regime.motifs_silence?.length ? ` (${c.regime.motifs_silence.map((m) => `art. ${m.article}`).join(", ")})` : ""}
            </p>
          ) : null}
        </div>
      </section>

      {fait ? <Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis> : null}
      {erreur && !form ? <Avis teinte="rouge" role="alert"><strong>La base a refusé.</strong> {erreur}</Avis> : null}
      {!peutEcrire ? <Avis teinte="gris">Vous voyez ce dossier sans pouvoir y écrire : demandez l&apos;accès en écriture à un gérant ou au chef de projet.</Avis> : null}

      {/* ——— 1. ce qui attend un membre ——— */}
      {p.etat === "decision_a_confirmer" && c.decision_implicite ? (
        <section className="esp-carte" aria-label="Décision implicite à confirmer">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">{c.decision_implicite.nature === "tacite" ? (dp ? "Non-opposition tacite née" : "Permis tacite né") : dp ? "Opposition tacite" : "Rejet implicite"} le {dateCourte(`${c.decision_implicite.date}T12:00:00`)}</h2>
            <Pastille teinte={c.decision_implicite.nature === "tacite" ? "ambre" : "rouge"}>À confirmer</Pastille>
          </div>
          <div className="esp-carte-corps">
            <Avis teinte={c.decision_implicite.nature === "tacite" ? "ambre" : "rouge"}>
              <strong>Si aucune décision ne vous a été notifiée</strong>, {c.decision_implicite.motif} Confirmez-le ici : le moteur date la décision. Si un arrêté est arrivé, saisissez-le plutôt.
            </Avis>
            <div className="esp-actions" style={{ marginTop: 12 }}>
              <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => { setErreur(null); setForm({ type: "implicite" }); }}>
                <Gavel width={16} height={16} aria-hidden="true" /> Confirmer la décision implicite
              </button>
              <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirSaisie("decision")}>Saisir la décision reçue</button>
            </div>
          </div>
        </section>
      ) : null}

      {proposees.length ? (
        <section className="esp-carte" aria-label="Dates lues sur les courriers">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Lu sur les courriers de la mairie</h2>
            <Pastille teinte="ambre">{proposees.length} à confirmer</Pastille>
          </div>
          <div className="esp-carte-corps" style={{ display: "grid", gap: 10 }}>
            {proposees.map((d) => {
              const piece = dossier.pieces.find((x) => x.id === d.piece_id);
              return (
                <div key={d.id} className="lor-lecture" data-statut={d.statut}>
                  <div className="esp-item-haut">
                    <strong>{NATURES_DATE_LUE[d.nature].libelle}</strong>
                    <Pastille contour>{libelleTypePiece(d.type_piece)}</Pastille>
                    {d.verifiee ? <Pastille teinte="vert">Citation retrouvée</Pastille> : <Pastille teinte="ambre">Citation non retrouvée</Pastille>}
                    {!d.permis_id ? <Pastille teinte="ambre">Permis à choisir</Pastille> : null}
                  </div>
                  <div className="lor-lecture-valeurs">
                    {valeursEnClair(d.nature, d.proposition).map((v) => (
                      <span key={v.libelle}>{v.libelle} : <b>{v.valeur}</b></span>
                    ))}
                  </div>
                  {d.citations?.length ? (
                    <div style={{ display: "grid", gap: 2 }}>
                      {d.citations.slice(0, 3).map((ci, i) => (
                        <span key={i} className="lor-citation">{ci.texte}{ci.page ? ` (page ${ci.page})` : ""}</span>
                      ))}
                    </div>
                  ) : null}
                  <div className="esp-kpi-sous">{piece?.nom_fichier ?? "courrier"} · lu {d.cree_le ? dateHeure(d.cree_le) : ""}</div>
                  <div className="esp-actions">
                    <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirConfirmation(d)}><Check width={16} height={16} aria-hidden="true" /> Confirmer</button>
                    <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => { setMotif(""); setErreur(null); setForm({ type: "ecarter", date: d }); }}><XCircle width={16} height={16} aria-hidden="true" /> Écarter</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ——— ce qu'on peut saisir maintenant ——— */}
      {peutEcrire && p.actif && !["purge", "refuse", "rejete", "annule", "classe", "hors_catalogue"].includes(p.etat) ? (
        <section className="esp-carte" aria-label="Saisir une étape">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Saisir ce qui est arrivé</h2>
            <span className="esp-kpi-sous">Chaque saisie recalcule le calendrier et ses rappels.</span>
          </div>
          <div className="esp-carte-corps">
            <div className="esp-actions">
              {!p.date_depot ? <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirSaisie("depot")}><CalendarPlus width={16} height={16} aria-hidden="true" /> Dossier déposé</button> : null}
              {p.date_depot && !p.decision && !p.date_demande_pieces ? <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirSaisie("demande_pieces")}>Demande de pièces reçue</button> : null}
              {p.date_demande_pieces && !p.date_pieces_fournies ? <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirSaisie("pieces_fournies")}><ListChecks width={16} height={16} aria-hidden="true" /> Pièces reçues par la mairie</button> : null}
              {p.date_depot && !p.decision && !p.delai_notifie_mois ? <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirSaisie("delai")}>Délai notifié par la mairie</button> : null}
              {p.date_depot && !p.decision ? <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => ouvrirSaisie("decision")}><FileSignature width={16} height={16} aria-hidden="true" /> Arrêté reçu</button> : null}
              {accorde && !p.date_affichage ? <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={() => ouvrirSaisie("affichage")}><CalendarCheck width={16} height={16} aria-hidden="true" /> Permis affiché sur le terrain</button> : null}
              {accorde ? <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => { setRec((r) => ({ ...r, nature: "gracieux", date: aujourdHuiIso(), auteur: "" })); setErreur(null); setForm({ type: "recours" }); }}><Scale width={16} height={16} aria-hidden="true" /> Recours reçu</button> : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ——— 2. le calendrier ——— */}
      <section className="esp-carte" aria-label="Calendrier du permis">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Calendrier</h2>
          <span className="esp-kpi-sous">{c.version ? `moteur ${c.version}` : ""}{p.calcule_le ? ` · calculé le ${dateHeure(p.calcule_le)}` : ""}</span>
        </div>
        <div className="esp-carte-corps">
          {!etapes.length ? (
            <div className="lor-tableau-vide">
              {p.etat === "hors_catalogue" ? "Lorani ne calcule pas les délais de ce territoire." : "Le calendrier commence au dépôt du dossier : saisissez la date de dépôt, ou déposez le récépissé pour qu'il soit lu."}
            </div>
          ) : (
            <ol className="lor-calendrier">
              {etapes.map((e, i) => (
                <EtapeLigne key={`${e.nature}-${i}`} e={e} avant={i === rangAujourdhui ? <li className="lor-aujourdhui" aria-label="Aujourd'hui">Aujourd&apos;hui</li> : null} />
              ))}
              {rangAujourdhui >= etapes.length ? <li className="lor-aujourdhui" aria-label="Aujourd'hui">Aujourd&apos;hui</li> : null}
            </ol>
          )}
        </div>
      </section>

      {/* ——— 4 bis. les lettres de demande de pièces (b5_07) ——— */}
      {(p.demandes_pieces?.length ?? 0) > 1 ? (
        <Avis teinte="ambre">
          <strong>Plusieurs demandes de pièces.</strong> À fournir : {p.pieces_demandees.map((x) => x.code).join(", ") || "—"}.{" "}
          Lettres : {p.demandes_pieces!.map((h) => `du ${dateCourte(`${h.date}T12:00:00`)} (${h.pieces.map((x) => x.code).join(", ") || "aucune pièce"})`).join(" ; ")}.{" "}
          La mairie doit tout réclamer en une fois (art. R*423-38) : une lettre de plus ne fait pas repartir le délai de trois mois, qui court depuis la première
          {p.date_pieces_fournies ? " ; une lettre reçue après la remise des pièces ne modifie pas les délais (art. R*423-41)" : ""}.
        </Avis>
      ) : null}

      {/* ——— 5. les avertissements ——— */}
      {c.avertissements?.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {c.avertissements.map((a, i) => (
            <Avis key={i} teinte="ambre"><strong>À savoir.</strong> {a}</Avis>
          ))}
        </div>
      ) : null}

      {/* ——— 3. les échéances et les rappels ——— */}
      <section className="esp-carte" aria-label="Échéances et rappels">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Échéances et rappels</h2>
          <span className="esp-kpi-sous">{echeances.filter((e) => e.statut === "ouvert" || e.statut === "depasse").length} en cours</span>
        </div>
        <div className="esp-carte-corps">
          {!echeances.length ? (
            <div className="lor-tableau-vide">Aucune échéance posée : elles naissent au dépôt du dossier.</div>
          ) : (
            <ul className="esp-fil">
              {echeances.map((e) => (
                <EcheanceLigne key={e.delai_id} e={e} nommer={nommer} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ——— 4. les recours ——— */}
      {recours.length || accorde ? (
        <section className="esp-carte" aria-label="Recours">
          <div className="esp-carte-tete">
            <h2 className="esp-carte-titre">Recours</h2>
            <span className="esp-kpi-sous">{recours.length ? `${recours.length} saisi${recours.length > 1 ? "s" : ""}` : "aucun"}</span>
          </div>
          <div className="esp-carte-corps">
            {!recours.length ? (
              <div className="lor-tableau-vide">Aucun recours saisi. {p.date_affichage ? "Le délai des tiers court depuis l'affichage." : "Tant que le permis n'est pas affiché, un recours reste possible."}</div>
            ) : (
              <ul className="esp-fil">
                {recours.map((r) => (
                  <li key={r.id}>
                    <span className="esp-fil-point" data-teinte={ISSUES_RECOURS[r.issue].teinte} />
                    <div>
                      <div className="esp-fil-texte">
                        <strong>{NATURES_RECOURS[r.nature]}</strong> du {dateCourte(`${r.date_recours}T12:00:00`)}{r.auteur ? ` — ${r.auteur}` : ""}
                        {" "}<Pastille teinte={ISSUES_RECOURS[r.issue].teinte}>{ISSUES_RECOURS[r.issue].libelle}{r.date_issue ? ` le ${dateCourte(`${r.date_issue}T12:00:00`)}` : ""}</Pastille>
                      </div>
                      {r.issue === "en_cours" && peutEcrire ? (
                        <div className="esp-actions" style={{ marginTop: 6 }}>
                          <button type="button" className="r-btn r-btn--fil" disabled={gris} onClick={() => { setRec((x) => ({ ...x, issue: "rejete", date_issue: aujourdHuiIso() })); setErreur(null); setForm({ type: "issue", recours: r }); }}>Saisir l&apos;issue</button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {/* ——— 6. les courriers et les dates déjà décidées ——— */}
      <section className="esp-carte" aria-label="Courriers du dossier">
        <div className="esp-carte-tete">
          <h2 className="esp-carte-titre">Courriers du dossier</h2>
          <span className="esp-kpi-sous">{pieces.length} pièce{pieces.length > 1 ? "s" : ""}</span>
        </div>
        <div className="esp-carte-corps">
          {!pieces.length ? (
            <div className="lor-tableau-vide">Aucun courrier déposé. Déposez le récépissé, les lettres de la mairie, l&apos;arrêté et le constat d&apos;affichage : Lorani les lit et propose les dates.</div>
          ) : (
            <ul className="esp-fil">
              {pieces.map((x) => (
                <PieceLigne key={x.id} piece={x} decisions={decidees.filter((d) => d.piece_id === x.id)} nommer={nommer} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ——— les dialogues ——— */}
      <Dialog open={form?.type === "confirmer"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Check width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Confirmer {form?.type === "confirmer" ? NATURES_DATE_LUE[form.date.nature].libelle.toLowerCase() : ""}</DialogTitle>
            <DialogDescription>Lu sur {form?.type === "confirmer" ? `le ${NATURES_DATE_LUE[form.date.nature].piece}` : "le courrier"}. Corrigez si le courrier dit autre chose : la valeur confirmée est celle qui compte, et le calendrier est recalculé.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {form?.type === "confirmer" ? (
              <div className="esp-form">
                {dossier.permis.filter((x) => x.projet_id === form.date.projet_id && x.actif).length > 1 || !form.date.permis_id ? (
                  <label className="rv-libelle">Permis visé <span className="esp-obligatoire">(obligatoire)</span>
                    <select className="rv-champ" value={permisVise} onChange={(e) => setPermisVise(e.target.value)}>
                      <option value="">Choisir…</option>
                      {dossier.permis.filter((x) => x.projet_id === form.date.projet_id && x.actif).map((x) => <option key={x.id} value={x.id}>{titrePermis(x, projet.nom)}{x.numero ? ` · ${x.numero}` : ""}</option>)}
                    </select>
                  </label>
                ) : null}
                {NATURES_DATE_LUE[form.date.nature].champs.map((ch) => (
                  <label key={ch.cle} className="rv-libelle">{ch.libelle}{ch.cle === "numero" || ch.cle === "date_notification_delai" ? null : <> <span className="esp-obligatoire">(obligatoire)</span></>}
                    {ch.type === "decision" ? (
                      <select className="rv-champ" value={valeurs[ch.cle] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [ch.cle]: e.target.value }))}>
                        <option value="favorable">{dp ? "Non-opposition" : "Accordé"}</option>
                        <option value="defavorable">{dp ? "Opposition" : "Refusé"}</option>
                      </select>
                    ) : (
                      <input className="rv-champ" type={ch.type === "date" ? "date" : "text"} inputMode={ch.type === "entier" ? "numeric" : undefined} value={valeurs[ch.cle] ?? ""} onChange={(e) => setValeurs((v) => ({ ...v, [ch.cle]: e.target.value }))} placeholder={ch.type === "pieces" ? "PC5, PC8" : undefined} />
                    )}
                  </label>
                ))}
                {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!confirmationComplete || envoi} onClick={soumettreConfirmation}>{envoi ? <Loader variant="spin" /> : null} Confirmer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "ecarter"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><XCircle width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Écarter cette lecture</DialogTitle>
            <DialogDescription>Le permis n&apos;en gardera rien. Le motif est inscrit au journal, avec votre nom.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif <span className="esp-obligatoire">(obligatoire, une phrase)</span>
                <textarea className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} placeholder="La lettre vise un autre dossier ; la date lue est celle de l'accusé, pas du dépôt…" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!motifOk || envoi} onClick={soumettreEcart}>{envoi ? <Loader variant="spin" /> : null} Écarter</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "implicite"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Gavel width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Confirmer la décision implicite</DialogTitle>
            <DialogDescription>{c.decision_implicite?.motif} Le moteur date la décision du {c.decision_implicite ? dateCourte(`${c.decision_implicite.date}T12:00:00`) : ""} ; elle ne se saisit pas à la main.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Avis teinte="ambre"><strong>Avant de confirmer</strong>, vérifiez qu&apos;aucun arrêté ni aucune lettre de la mairie n&apos;est arrivé pendant le délai. {c.decision_implicite?.nature === "tacite" ? "Vous pourrez demander un certificat de permis tacite à la mairie (art. R*424-13)." : ""}</Avis>
            {erreur ? <div style={{ marginTop: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettreImplicite}>{envoi ? <Loader variant="spin" /> : null} Confirmer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "saisir"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><CalendarPlus width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>
              {form?.type === "saisir"
                ? { pieces_fournies: "Pièces reçues par la mairie", affichage: "Permis affiché sur le terrain", decision: "Décision de la mairie reçue", delai: "Délai d'instruction notifié", depot: "Dossier déposé en mairie", demande_pieces: "Demande de pièces reçue" }[form.quoi]
                : ""}
            </DialogTitle>
            <DialogDescription>
              {form?.type === "saisir" && form.quoi === "affichage" ? "Le premier jour d'affichage ouvre le délai de recours des tiers (deux mois). Un constat d'huissier en garde la preuve." : null}
              {form?.type === "saisir" && form.quoi === "pieces_fournies" ? "La date à laquelle la mairie a reçu toutes les pièces : l'instruction en part." : null}
              {form?.type === "saisir" && form.quoi === "decision" ? "La date de l'arrêté. Une décision implicite ne se saisit pas ici : elle se confirme." : null}
              {form?.type === "saisir" && form.quoi === "delai" ? "Le délai majoré que la mairie vous a notifié dans le mois qui suit le dépôt." : null}
              {form?.type === "saisir" && form.quoi === "depot" ? "La date du récépissé. Si vous déposez le récépissé lui-même, Lorani la lit." : null}
              {form?.type === "saisir" && form.quoi === "demande_pieces" ? "La date de la lettre et les pièces réclamées (PC5, PC8…)." : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Date <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" type="date" value={saisie.date ?? ""} onChange={(e) => setSaisie((s) => ({ ...s, date: e.target.value }))} max={aujourdHuiIso()} />
              </label>
              {form?.type === "saisir" && form.quoi === "decision" ? (
                <label className="rv-libelle">Décision
                  <select className="rv-champ" value={saisie.decision} onChange={(e) => setSaisie((s) => ({ ...s, decision: e.target.value }))}>
                    <option value="favorable">{dp ? "Non-opposition" : "Accordé"}</option>
                    <option value="defavorable">{dp ? "Opposition" : "Refusé"}</option>
                  </select>
                </label>
              ) : null}
              {form?.type === "saisir" && form.quoi === "delai" ? (
                <label className="rv-libelle">Délai en mois <span className="esp-obligatoire">(obligatoire, 1 à 24)</span>
                  <input className="rv-champ" inputMode="numeric" value={saisie.mois} onChange={(e) => setSaisie((s) => ({ ...s, mois: e.target.value.replace(/\D/g, "") }))} />
                </label>
              ) : null}
              {form?.type === "saisir" && form.quoi === "depot" ? (
                <label className="rv-libelle">Numéro du dossier
                  <input className="rv-champ" value={saisie.numero} onChange={(e) => setSaisie((s) => ({ ...s, numero: e.target.value }))} placeholder="PC 044109 26 A0042" maxLength={40} />
                </label>
              ) : null}
              {form?.type === "saisir" && form.quoi === "demande_pieces" ? (
                <label className="rv-libelle">Pièces réclamées <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" value={saisie.pieces} onChange={(e) => setSaisie((s) => ({ ...s, pieces: e.target.value }))} placeholder="PC5, PC8" />
                </label>
              ) : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!saisieOk || envoi} onClick={soumettreSaisie}>{envoi ? <Loader variant="spin" /> : null} Saisir</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "recours"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Scale width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Recours reçu</DialogTitle>
            <DialogDescription>Tant que son issue n&apos;est pas saisie, le permis n&apos;est pas purgé. Un recours gracieux sans réponse de la mairie pendant deux mois est réputé rejeté.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Nature
                  <select className="rv-champ" value={rec.nature} onChange={(e) => setRec((r) => ({ ...r, nature: e.target.value }))}>
                    {(Object.keys(NATURES_RECOURS) as Recours["nature"][]).map((n) => <option key={n} value={n}>{NATURES_RECOURS[n]}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Date du recours <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" type="date" value={rec.date} onChange={(e) => setRec((r) => ({ ...r, date: e.target.value }))} min={p.date_decision ?? undefined} max={aujourdHuiIso()} />
                </label>
              </div>
              <label className="rv-libelle">Auteur
                <input className="rv-champ" value={rec.auteur} onChange={(e) => setRec((r) => ({ ...r, auteur: e.target.value }))} maxLength={200} placeholder="Voisin, association, préfet…" />
              </label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(rec.date) || envoi} onClick={soumettreRecours}>{envoi ? <Loader variant="spin" /> : null} Saisir le recours</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "regime"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><SlidersHorizontal width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Régime du permis</DialogTitle>
            <DialogDescription>Ces cases changent le délai d&apos;instruction (secteur protégé : un mois de plus ; ERP ou IGH : cinq mois ; monument inscrit : cinq mois) et l&apos;effet du silence de la mairie (art. R*424-2 : le silence vaut rejet).</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="lor-cases">
                <label><input type="checkbox" checked={regime.secteur_protege} onChange={(e) => setRegime((r) => ({ ...r, secteur_protege: e.target.checked }))} /> Secteur protégé (site patrimonial remarquable, abords d&apos;un monument historique, site classé) : avis de l&apos;architecte des Bâtiments de France</label>
                <label><input type="checkbox" checked={regime.immeuble_inscrit_mh} onChange={(e) => setRegime((r) => ({ ...r, immeuble_inscrit_mh: e.target.checked }))} /> Travaux sur un immeuble inscrit au titre des monuments historiques</label>
                <label><input type="checkbox" checked={regime.erp_autorisation} onChange={(e) => setRegime((r) => ({ ...r, erp_autorisation: e.target.checked }))} /> Établissement recevant du public soumis à autorisation (accessibilité, sécurité)</label>
                <label><input type="checkbox" checked={regime.igh} onChange={(e) => setRegime((r) => ({ ...r, igh: e.target.checked }))} /> Immeuble de grande hauteur</label>
                <label><input type="checkbox" checked={regime.evaluation_environnementale} onChange={(e) => setRegime((r) => ({ ...r, evaluation_environnementale: e.target.checked }))} /> Projet soumis à évaluation environnementale</label>
              </div>
              <div>
                <span className="rv-libelle">Autres cas où le silence vaut rejet (art. R*424-2)</span>
                <div className="lor-cases" style={{ marginTop: 6 }}>
                  {dossier.casRejet.filter((x) => !["r424_2_c", "r424_2_1"].includes(x.code)).map((x) => (
                    <label key={x.code}>
                      <input type="checkbox" checked={regime.cas_rejet.includes(x.code)} onChange={(e) => setRegime((r) => ({ ...r, cas_rejet: e.target.checked ? [...r.cas_rejet, x.code] : r.cas_rejet.filter((k) => k !== x.code) }))} />
                      <span><strong>{x.article}</strong> — {x.libelle}</span>
                    </label>
                  ))}
                  {!dossier.casRejet.length ? <span className="lor-tableau-vide">La liste des cas de rejet n&apos;a pas été lue.</span> : null}
                </div>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={soumettreRegime}>{envoi ? <Loader variant="spin" /> : null} Enregistrer le régime</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={form?.type === "issue"} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Gavel width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Issue du recours</DialogTitle>
            <DialogDescription>Rejet, désistement ou annulation du permis. Après un rejet de recours gracieux, un recours contentieux reste possible deux mois : le calendrier le compte dans la purge.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Issue
                  <select className="rv-champ" value={rec.issue} onChange={(e) => setRec((r) => ({ ...r, issue: e.target.value }))}>
                    <option value="rejete">Rejeté</option>
                    <option value="desiste">Désistement</option>
                    <option value="annulation">Permis annulé</option>
                  </select>
                </label>
                <label className="rv-libelle">Date <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" type="date" value={rec.date_issue} onChange={(e) => setRec((r) => ({ ...r, date_issue: e.target.value }))} max={aujourdHuiIso()} />
                </label>
              </div>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!/^\d{4}-\d{2}-\d{2}$/.test(rec.date_issue) || envoi} onClick={soumettreIssue}>{envoi ? <Loader variant="spin" /> : null} Saisir l&apos;issue</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ——— une étape du calendrier ——— */
function EtapeLigne({ e, avant }: { e: Etape; avant: React.ReactNode }) {
  const s = STATUTS_ETAPE[e.statut] ?? STATUTS_ETAPE.a_venir;
  const prevision = e.certitude === "prevision" || e.certitude === "a_confirmer";
  return (
    <>
      {avant}
      <li className="lor-etape" data-statut={e.statut}>
        <div className="lor-etape-date">
          {e.date ? dateCourte(`${e.date}T12:00:00`) : "—"}
          <small>{e.date ? (e.statut === "fait" ? "fait" : quand(e.date)) : "sans date"}{prevision && e.date ? " · prévision" : ""}</small>
        </div>
        <span className="lor-etape-point" data-teinte={s.teinte} data-prevision={prevision} aria-label={s.libelle} />
        <div className="lor-etape-texte">
          {e.libelle}
          {e.statut === "manque" ? <> <Pastille teinte="rouge">En retard</Pastille></> : null}
          {e.statut === "a_confirmer" ? <> <Pastille teinte="ambre">À confirmer</Pastille></> : null}
          {e.statut === "en_cours" ? <> <Pastille teinte="ambre">En cours</Pastille></> : null}
          {e.issue || e.motif || e.detail || e.source ? (
            <div className="lor-etape-meta">
              {e.issue ?? e.motif ?? e.detail}
              {e.source ? (
                <>
                  {e.issue || e.motif || e.detail ? " · " : ""}
                  {e.source_url ? <a href={e.source_url} target="_blank" rel="noopener noreferrer">{e.source}</a> : e.source}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </li>
    </>
  );
}

/* ——— une échéance du socle ——— */
function EcheanceLigne({ e, nommer }: { e: Echeance; nommer: (id: string | null | undefined) => string }) {
  const teinte = e.statut === "tenu" ? "vert" : e.statut === "annule" ? "gris" : e.statut === "depasse" ? "rouge" : "bleu";
  const libelle = e.statut === "tenu" ? "Tenue" : e.statut === "annule" ? "Annulée" : e.statut === "depasse" ? "Dépassée" : "Ouverte";
  const partis = (e.rappels_faits ?? []).slice().sort((a, b) => b - a);
  const prevus = (e.rappels ?? []).slice().sort((a, b) => b - a);
  return (
    <li>
      <span className="esp-fil-point" data-teinte={teinte} />
      <div>
        <div className="esp-fil-texte">
          <strong>{dateCourte(`${e.echeance}T12:00:00`)}</strong> · {e.libelle.replace(/^[A-Z]+ « [^»]* » : /, "")} <Pastille teinte={teinte}>{libelle}</Pastille>
        </div>
        <div className="esp-fil-meta">
          {e.echeance_notifiee && e.echeance_calculee && e.echeance_notifiee !== e.echeance_calculee ? `Calculée au ${dateCourte(`${e.echeance_calculee}T12:00:00`)}, notifiée au ${dateCourte(`${e.echeance_notifiee}T12:00:00`)}. ` : ""}
          {e.source_notification ? `${e.source_notification} ` : ""}
          {prevus.length
            ? `Rappels ${prevus.map((j) => `${libelleRappel(j)}${partis.includes(j) ? " (parti)" : ""}`).join(", ")}. `
            : "Échéance d'information, sans rappel. "}
          {e.responsable ? `Responsable : ${nommer(e.responsable)}. ` : ""}
          {e.action_attendue ?? ""}
          {e.regle_code ? <> · <span className="esp-mono">{e.regle_code}{e.regle_version ? ` v${e.regle_version}` : ""}</span></> : null}
          {e.source_url && e.source ? <> · <a href={e.source_url} target="_blank" rel="noopener noreferrer">{e.source}</a></> : null}
        </div>
      </div>
    </li>
  );
}

/* ——— un courrier du dossier et ce qu'on en a décidé ——— */
function PieceLigne({ piece, decisions, nommer }: { piece: PieceProjet; decisions: DateLue[]; nommer: (id: string | null | undefined) => string }) {
  const teinte = piece.statut === "lue" ? "vert" : piece.statut === "echec" || piece.statut === "rejetee" ? "rouge" : piece.statut === "a_verifier" || piece.statut === "a_classer" ? "ambre" : "gris";
  return (
    <li>
      <span className="esp-fil-point" data-teinte={teinte} />
      <div>
        <div className="esp-fil-texte">
          <strong>{libelleTypePiece(piece.type_piece)}</strong> · {piece.nom_fichier}{" "}
          <Pastille teinte={teinte}>{piece.statut === "lue" ? "Lue" : piece.statut === "en_lecture" ? "En lecture" : piece.statut === "a_verifier" ? "À vérifier" : piece.statut === "a_classer" ? "Courrier non reconnu" : piece.statut === "echec" ? "Illisible" : piece.statut === "rejetee" ? "Rejetée" : "Reçue"}</Pastille>
        </div>
        <div className="esp-fil-meta">
          {piece.cree_le ? `Déposé le ${dateHeure(piece.cree_le)}. ` : ""}
          {piece.statut === "a_classer" ? `Le lecteur n'a pas reconnu un courrier de la mairie${piece.motif ? ` : « ${piece.motif} »` : ""}. Aucune date n'en est proposée ; saisissez-la à la main. ` : ""}
          {piece.statut === "echec" && piece.motif ? `Motif : « ${piece.motif} ». ` : ""}
          {decisions.map((d) => (
            <span key={d.id}>
              {NATURES_DATE_LUE[d.nature].libelle} {d.statut === "confirmee" ? "confirmée" : "écartée"} par {nommer(d.decide_par)}{d.decide_le ? ` le ${dateHeure(d.decide_le)}` : ""}{d.motif ? ` (« ${d.motif} »)` : ""}.{" "}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

