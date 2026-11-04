"use client";

/* ══════════════════════════════════════════════════════════════════════
   TIROMA — Plans et devis (02/11/2026, refonte des pages métiers)

   La vue Board de Linear (« All issues » en colonnes), au 1:1 : relevé
   docs/refonte-metiers/releves/linear-board.md (branche refs-linear),
   styles ./tir.css (socle) et ./tir-board.css.

   Une colonne par état, une carte par plan ou par devis :
     · Devis à relancer (B15, liste du pilotage : devis présentés sans
       réponse) ;
     · Mutuelle à obtenir (B9 : accord à demander ou demandé) ;
     · Prêts à poser (B9 : signés, mutuelle reçue ou sans mutuelle) ;
     · Un créneau trouvé (B22 : jusqu'à trois créneaux sous quatorze jours) ;
     · Mutuelle refusée (si un refus est noté).
   Carte : identifiant (devis), avatar du praticien, statut + patient et
   séance, puces (priorité = ancienneté, échéance = expiration, cycle =
   jours depuis la signature, montant, étiquettes), « Signé le ».
   Gestes (F1/G3 « Noter la mutuelle », F3/G2 « Noter l'appel ») : dans le
   volet de la carte ouverte (clic, ou ?plan=<id> depuis le point du matin),
   et au menu contextuel de la carte (clic droit), comme chez Linear.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FAMILLES, ISSUES_APPEL, MUTUELLES, PANIERS } from "@/components/espace/tiroma/libelles";
import type { CibleAppel, Dossier, IssueAppel, PlanSansRdv } from "@/components/espace/tiroma/types";
import { RACINE } from "../modules";
import { useTiroma, type Mutuelle } from "./donnees";
import { TirAvatar, TirCarte, TirMenu, type OptionMenu } from "./TirCadre";
import { TirIcone, type NomTirIcone } from "./TirIcone";
import { copier, exporterCSV, useFavoris, useSuivis } from "./navigateur";
import { chargerActesPlan, type ActePlan } from "@/components/espace/tiroma/portes";
import { actesExemple } from "./exemplesActes";
import { tuilesPlans } from "./tuiles";
import "./tir-mes.css";
import "./tir-board.css";

const BASE = `${RACINE}/tiroma/plans`;
const ROUGE = "rgb(235, 87, 87)";
const ROSE = "rgb(247, 200, 193)";
const BLEU_VERT = "rgb(38, 181, 206)";
const VERT = "rgb(76, 183, 130)";
const VIOLET = "lch(48 59.31 288.43)";
const BEIGE = "lch(67.969 19.321 31.72)";

type Colonne = "relancer" | "mutuelle" | "prets" | "creneau" | "refus";
const COLONNES: { cle: Colonne; libelle: string; icone: NomTirIcone; couleur: string }[] = [
  { cle: "relancer", libelle: "Devis à relancer", icone: "IssueStatusTriage", couleur: "#ff7336" },
  { cle: "mutuelle", libelle: "Mutuelle à obtenir", icone: "IssueStatusBacklog", couleur: "var(--tir-t3)" },
  { cle: "prets", libelle: "Prêts à poser", icone: "IssueStatusTodo", couleur: "var(--tir-statut-todo)" },
  { cle: "creneau", libelle: "Un créneau trouvé", icone: "IssueStatusStarted", couleur: "#f0bf00" },
  { cle: "refus", libelle: "Mutuelle refusée", icone: "StatusCanceled", couleur: "var(--tir-t3)" },
];

type Puce = { icone?: NomTirIcone; couleur?: string; pastille?: string; texte: string; titre?: string; priorite?: 0 | 1 | 2 | 3 | 4 };

type Carte = {
  cle: string;
  id: string;
  colonne: Colonne;
  ident: string;
  titre: string;
  personne: string | null;
  puces: Puce[];
  pied: string;
  piedTitre: string;
  plan?: PlanSansRdv;
  cible: CibleAppel | null;
  details: { libelle: string; valeur: string }[];
  creneaux: { debut: string; fin: string; fauteuil: string }[];
};

const enDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
const jourCourt = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const complet = (iso: string) => enDate(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });
const euros = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`);
const jourHeure = (iso: string) => enDate(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function couleurFamille(f: string | null | undefined): string {
  if (!f) return BEIGE;
  if (f.startsWith("prothese")) return ROSE;
  if (f.startsWith("implant") || f === "chirurgie") return ROUGE;
  if (f.startsWith("orthodontie")) return VIOLET;
  if (f === "controle" || f === "detartrage" || f === "parodontie") return VERT;
  return BLEU_VERT;
}

function cartesDuDossier(d: Dossier): Carte[] {
  const cartes: Carte[] = [];
  const registre = !!d.appels;
  for (const dv of d.pilotage?.en_attente.a_relancer_liste ?? []) {
    const presente = dv.presente_le ?? new Date().toISOString().slice(0, 10);
    const jours = Math.round((Date.now() - enDate(presente).getTime()) / 864e5);
    cartes.push({
      cle: `devis:${dv.plan_id}`,
      id: dv.plan_id,
      colonne: "relancer",
      ident: dv.devis_numero ?? "Devis",
      titre: `${dv.patient_nom} — devis présenté sans réponse`,
      personne: null,
      puces: [
        { priorite: jours >= 14 ? 2 : 3, texte: "" },
        ...(dv.valide_jusqu_au ? [{ icone: "Calendar" as NomTirIcone, texte: jourCourt(dv.valide_jusqu_au), titre: `Expire le ${complet(dv.valide_jusqu_au)}` }] : []),
        { icone: "Cycle", couleur: "#5e6ad2", texte: `${jours} j`, titre: `présenté il y a ${jours} jours` },
        { icone: "Euro", couleur: "lch(60.135 63.97 86.502)", texte: euros(dv.montant) },
        { pastille: dv.panier === "100_sante" ? VERT : dv.panier === "libre" ? VIOLET : BLEU_VERT, texte: PANIERS[dv.panier ?? "non_precise"] ?? "Panier non précisé" },
      ],
      pied: dv.presente_le ? `Présenté le ${jourCourt(dv.presente_le)}` : "Présenté",
      piedTitre: dv.presente_le ? complet(dv.presente_le) : "",
      cible: registre ? { patient_id: dv.patient_id, patient_nom: dv.patient_nom, motif: "devis", plan_id: dv.plan_id, evenement_id: null } : null,
      details: [
        { libelle: "Patient", valeur: dv.patient_nom },
        { libelle: "Devis", valeur: dv.devis_numero ?? "—" },
        { libelle: "Montant", valeur: euros(dv.montant) },
        { libelle: "Reste à charge", valeur: euros(dv.reste_a_charge) },
        { libelle: "Panier", valeur: PANIERS[dv.panier ?? "non_precise"] ?? "—" },
        { libelle: "Présenté le", valeur: dv.presente_le ? complet(dv.presente_le) : "—" },
        { libelle: "Expire le", valeur: dv.valide_jusqu_au ? complet(dv.valide_jusqu_au) : "—" },
      ],
      creneaux: [],
    });
  }
  for (const p of d.plans) {
    const cp = (d.creneauxPlans ?? []).find((x) => x.plan_id === p.plan_id);
    const colonne: Colonne = p.mutuelle_statut === "refus" ? "refus" : p.mutuelle_statut === "a_demander" || p.mutuelle_statut === "demandee" ? "mutuelle" : cp && cp.creneaux.length ? "creneau" : "prets";
    const seance = p.prochaine?.libelle ? `${p.prochaine.libelle}${p.prochaine.seance ? ` (séance ${p.prochaine.seance})` : ""}` : "séance à poser";
    const expire = p.jours_avant_expiration;
    cartes.push({
      cle: `plan:${p.plan_id}`,
      id: p.plan_id,
      colonne,
      ident: p.devis_numero ?? "Plan",
      titre: `${p.patient_nom} — ${seance}`,
      personne: p.praticien_nom,
      puces: [
        { priorite: p.jours_depuis >= 42 ? 1 : p.jours_depuis >= 21 ? 2 : 3, texte: "" },
        ...(p.valide_jusqu_au ? [{ icone: (expire !== null && expire < 0 ? "CrossedOutCalendar" : "Calendar") as NomTirIcone, couleur: expire !== null && expire < 0 ? "var(--tir-rouge)" : undefined, texte: jourCourt(p.valide_jusqu_au), titre: expire !== null && expire <= 30 ? `Expire dans ${expire} j` : `Valable jusqu'au ${complet(p.valide_jusqu_au)}` }] : []),
        { icone: "Cycle", couleur: "#5e6ad2", texte: `${p.jours_depuis} j`, titre: `signé il y a ${p.jours_depuis} jours` },
        { icone: "Euro", couleur: "lch(60.135 63.97 86.502)", texte: euros(p.montant) },
        ...(p.prochaine?.famille ? [{ pastille: couleurFamille(p.prochaine.famille), texte: FAMILLES[p.prochaine.famille] ?? p.prochaine.famille }] : []),
        ...(p.mutuelle_statut && p.mutuelle_statut !== "non_requise" ? [{ pastille: p.mutuelle_statut === "accord" ? VERT : p.mutuelle_statut === "refus" ? ROUGE : BEIGE, texte: p.mutuelle_accord_sans_rdv ? "Accord de mutuelle reçu" : (MUTUELLES[p.mutuelle_statut] ?? p.mutuelle_statut) }] : []),
        ...(p.a_verifier ? [{ pastille: BEIGE, texte: "À vérifier" }] : []),
        ...(p.ne_pas_contacter ? [{ pastille: ROUGE, texte: "Ne pas contacter" }] : []),
        ...(p.proches_a_planifier ? [{ pastille: BLEU_VERT, texte: `Famille : ${p.proches_a_planifier} proche${p.proches_a_planifier > 1 ? "s" : ""} à planifier` }] : []),
      ],
      pied: `Signé le ${jourCourt(p.signe_le ?? p.depuis)}`,
      piedTitre: complet(p.signe_le ?? p.depuis),
      plan: p,
      cible: registre && !p.ne_pas_contacter ? { patient_id: p.patient_id, patient_nom: p.patient_nom, motif: "plan", plan_id: p.plan_id, evenement_id: null } : null,
      details: [
        { libelle: "Patient", valeur: p.patient_nom },
        { libelle: "Devis", valeur: p.devis_numero ?? "—" },
        { libelle: "Séance à poser", valeur: seance },
        { libelle: "Praticien", valeur: p.praticien_nom ?? "—" },
        { libelle: "Actes", valeur: `${p.lignes_faites} faite${p.lignes_faites > 1 ? "s" : ""} · ${p.lignes_a_faire} à faire${p.prochaine?.duree_min ? ` · ${p.prochaine.duree_min} min` : ""}` },
        { libelle: "Montant", valeur: `${euros(p.montant)} (reste ${euros(p.reste_a_charge)})` },
        { libelle: "Mutuelle", valeur: p.mutuelle_statut ? (MUTUELLES[p.mutuelle_statut] ?? p.mutuelle_statut) + (p.mutuelle_reponse_le ? `, le ${complet(p.mutuelle_reponse_le)}` : "") : "—" },
        { libelle: "Signé le", valeur: complet(p.signe_le ?? p.depuis) },
        { libelle: "Expire", valeur: p.valide_jusqu_au ? `${complet(p.valide_jusqu_au)}${expire !== null && expire <= 30 ? ` (dans ${expire} j)` : ""}` : "—" },
      ],
      creneaux: (cp?.creneaux ?? []).map((c) => ({ debut: c.debut, fin: c.fin, fauteuil: c.fauteuil })),
    });
  }
  return cartes;
}

function PuceVue({ p }: { p: Puce }) {
  if (p.priorite !== undefined) {
    return (
      <span className="tir-bd-puce tir-bd-puce--rond" title={["Aucune priorité", "Urgent", "Haute", "Moyenne", "Basse"][p.priorite]}>
        <TirIcone nom={`Priority${p.priorite}` as NomTirIcone} taille={14} style={p.priorite === 1 ? { color: "lch(66 80 48)" } : undefined} />
      </span>
    );
  }
  return (
    <span className="tir-bd-puce" title={p.titre ?? p.texte}>
      {p.pastille ? (
        <span className="tir-mi-pastille-boite"><span className="tir-mi-pastille" style={{ background: p.pastille }} /></span>
      ) : p.icone ? (
        <TirIcone nom={p.icone} taille={14} style={p.couleur ? { color: p.couleur } : undefined} />
      ) : null}
      <span>{p.texte}</span>
    </span>
  );
}

/* ——— le schéma dentaire d'un plan (04/11/2026, TIROMA n° 14 de docs/verification/PROMESSES-ECRANS.md) ———
   Numérotation FDI, vue du praticien face au patient : en haut 18 → 11 | 21 → 28, en bas 48 → 41 | 31 → 38 ;
   les dents de lait (51-85) ne s'affichent que si un acte en concerne une. Une dent concernée est surlignée,
   à la couleur de son acte le moins avancé (à faire, planifié, fait). */
const ARCADES_DEFINITIVES = [
  [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
];
const ARCADES_LAIT = [
  [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
  [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
];
/* les dents d'un acte : les suites de trois dents voisines ou plus s'écrivent « 44-46 » */
function dentsCourtes(dents: number[]): string {
  const l = [...new Set(dents)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < l.length; ) {
    let j = i;
    while (j + 1 < l.length && l[j + 1] === l[j] + 1 && Math.floor(l[j + 1] / 10) === Math.floor(l[i] / 10)) j++;
    if (j - i >= 2) out.push(`${l[i]}-${l[j]}`);
    else for (let k = i; k <= j; k++) out.push(String(l[k]));
    i = j + 1;
  }
  return out.join(", ");
}
const STATUT_ACTE: Record<ActePlan["statut"], string> = { a_faire: "à faire", planifie: "planifié", fait: "fait" };
const ORDRE_STATUT: ActePlan["statut"][] = ["a_faire", "planifie", "fait"];

function SchemaDentaire({ actes }: { actes: ActePlan[] }) {
  const parDent = new Map<number, ActePlan[]>();
  for (const a of actes) for (const d of a.dents) parDent.set(d, [...(parDent.get(d) ?? []), a]);
  const lait = [...parDent.keys()].some((d) => d >= 51);
  const rangee = (dents: number[], bas: boolean) => (
    <div className="tir-bd-dents" data-bas={bas ? "" : undefined}>
      {dents.map((d, i) => {
        const l = parDent.get(d) ?? [];
        const statut = ORDRE_STATUT.find((s) => l.some((a) => a.statut === s));
        return (
          <span
            key={d}
            className="tir-bd-dent"
            data-statut={statut}
            data-milieu={i === dents.length / 2 ? "" : undefined}
            title={l.length ? `${d} : ${l.map((a) => `${a.libelle ?? a.code ?? "acte"} (${STATUT_ACTE[a.statut]})`).join(" ; ")}` : String(d)}
          >
            {d}
          </span>
        );
      })}
    </div>
  );
  return (
    <figure className="tir-bd-schema" aria-label={`Schéma dentaire : ${[...parDent.keys()].sort((a, b) => a - b).join(", ") || "aucune dent désignée"}`}>
      <div className="tir-bd-arcade">
        {rangee(ARCADES_DEFINITIVES[0], false)}
        {lait ? rangee(ARCADES_LAIT[0], false) : null}
        <span className="tir-bd-occlusion" aria-hidden="true" />
        {lait ? rangee(ARCADES_LAIT[1], true) : null}
        {rangee(ARCADES_DEFINITIVES[1], true)}
      </div>
      <figcaption className="tir-bd-legende">
        <span><i data-statut="a_faire" />À faire</span>
        <span><i data-statut="planifie" />Planifié</span>
        <span><i data-statut="fait" />Fait</span>
      </figcaption>
    </figure>
  );
}

/* les actes du plan : lus dans tiroma_plan_actes (base réelle) ou dans l'exemple */
function useActes(planId: string | null, source: "exemple" | "reelle"): { actes: ActePlan[] | null; erreur: string | null } {
  const [lu, setLu] = useState<{ cle: string; actes: ActePlan[] | null; erreur: string | null }>({ cle: "", actes: null, erreur: null });
  const cle = `${source}:${planId ?? ""}`;
  useEffect(() => {
    if (!planId || source !== "reelle") return;
    let vivant = true;
    chargerActesPlan(planId)
      .then((actes) => vivant && setLu({ cle, actes, erreur: null }))
      .catch((e: unknown) => vivant && setLu({ cle, actes: null, erreur: e instanceof Error ? e.message : "La base n'a pas répondu." }));
    return () => {
      vivant = false;
    };
  }, [planId, source, cle]);
  if (!planId) return { actes: null, erreur: null };
  if (source === "exemple") return { actes: actesExemple(planId), erreur: null };
  return lu.cle === cle ? { actes: lu.actes, erreur: lu.erreur } : { actes: null, erreur: null };
}

function ActesDuPlan({ planId }: { planId: string }) {
  const t = useTiroma();
  const { actes, erreur } = useActes(planId, t.source);
  return (
    <>
      <div className="tir-bd-volet-section">Schéma dentaire et actes</div>
      {erreur ? <p className="tir-bd-note" role="alert">Les actes n&apos;ont pas pu être lus. {erreur}</p> : null}
      {!erreur && actes === null ? <p className="tir-bd-note">Lecture des actes…</p> : null}
      {actes && actes.length === 0 ? <p className="tir-bd-note">Le logiciel du cabinet n&apos;a exporté aucun acte pour ce plan.</p> : null}
      {actes && actes.length ? (
        <>
          <SchemaDentaire actes={actes} />
          <ol className="tir-bd-actes">
            {actes.map((a) => (
              <li key={a.id} className="tir-bd-acte" data-statut={a.statut}>
                <span className="tir-bd-acte-dents">{a.dents.length ? dentsCourtes(a.dents) : "—"}</span>
                <span className="tir-bd-acte-texte">
                  <span className="tir-bd-acte-nom">{a.libelle ?? a.code ?? "Acte"}</span>
                  <span className="tir-bd-acte-meta">
                    {[a.seance ? `Séance ${a.seance}` : null, a.duree_min ? `${a.duree_min} min` : null, a.statut === "fait" && a.fait_le ? `fait le ${jourCourt(a.fait_le)}` : STATUT_ACTE[a.statut]].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="tir-bd-acte-montant" title={a.reste_a_charge !== null ? `Reste à charge : ${euros(a.reste_a_charge)}` : undefined}>
                  {euros(a.montant)}
                  {a.reste_a_charge !== null ? <small>reste {euros(a.reste_a_charge)}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}

/* ——— le volet de la carte ouverte : propriétés et gestes ——— */
function Volet({ c, fermer }: { c: Carte; fermer: () => void }) {
  const t = useTiroma();
  const d = t.dossier;
  const jour = d?.appels?.jour ?? new Date().toISOString().slice(0, 10);
  const [statut, setStatut] = useState<Mutuelle["statut"]>(c.plan?.mutuelle_statut === "demandee" ? "accord" : (c.plan?.mutuelle_statut ?? "demandee"));
  const [le, setLe] = useState(jour);
  const [motif, setMotif] = useState("");
  const [issue, setIssue] = useState<IssueAppel | null>(null);
  const [rappel, setRappel] = useState(jour);
  const [confirme, setConfirme] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const peutEcrire = !!d && d.profil !== null && d.profil !== "direction";
  const agir = async (f: () => Promise<void>, ok: string) => {
    setOccupe(true);
    setAvis(null);
    try {
      await f();
      setAvis(ok);
    } catch (e) {
      setAvis(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  };
  return (
    <aside className="tir-bd-volet" aria-label={c.titre}>
      <div className="tir-bd-volet-tete">
        <span className="tir-bd-volet-id">{c.ident}</span>
        <span className="tir-pousse" />
        <button type="button" className="tir-rond" aria-label="Fermer" onClick={fermer}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.7 3.7a.75.75 0 0 1 1.06 0L8 6.94l3.24-3.24a.75.75 0 1 1 1.06 1.06L9.06 8l3.24 3.24a.75.75 0 1 1-1.06 1.06L8 9.06l-3.24 3.24a.75.75 0 0 1-1.06-1.06L6.94 8 3.7 4.76a.75.75 0 0 1 0-1.06" /></svg>
        </button>
      </div>
      <h2 className="tir-bd-volet-titre">{c.titre}</h2>
      <div className="tir-bd-volet-section">Propriétés</div>
      {c.details.map((r) => (
        <div key={r.libelle} className="tir-bd-prop"><span>{r.libelle}</span><span>{r.valeur}</span></div>
      ))}
      <ActesDuPlan planId={c.id} />
      {c.creneaux.length ? (
        <>
          <div className="tir-bd-volet-section">Un créneau pour ce plan</div>
          {c.creneaux.map((x) => (
            <div key={x.debut} className="tir-bd-prop"><span>{x.fauteuil}</span><span>{jourHeure(x.debut)} → {enDate(x.fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></div>
          ))}
          <p className="tir-bd-note">Tiroma ne pose rien : le rendez-vous se prend dans le logiciel du cabinet.</p>
        </>
      ) : null}
      {c.plan ? (
        <>
          <div className="tir-bd-volet-section">Noter la mutuelle</div>
          <p className="tir-bd-note">Le logiciel du cabinet n&apos;exporte pas la mutuelle : notez ici la demande et la réponse. Un accord reçu sans rendez-vous remonte chaque matin.</p>
          <div className="tir-bd-choix" role="radiogroup" aria-label="Où en est la mutuelle">
            {(Object.keys(MUTUELLES) as Mutuelle["statut"][]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={statut === k} className="tir-onglet" onClick={() => setStatut(k)}>{MUTUELLES[k]}</button>
            ))}
          </div>
          <div className="tir-bd-champs">
            <label><span>Date</span><input type="date" className="tir-mi-select" value={le} onChange={(e) => setLe(e.target.value)} /></label>
            <label><span>Note (facultatif)</span><input className="tir-mi-select" value={motif} maxLength={200} placeholder="Accord reçu par courrier." onChange={(e) => setMotif(e.target.value)} /></label>
          </div>
          <button type="button" className="tir-bd-action" disabled={occupe} onClick={() => { const plan = c.plan; if (plan) void agir(() => t.noterMutuelle({ plan, statut, le: le || null, motif: motif.trim() || null }), `C'est noté : ${MUTUELLES[statut ?? "demandee"]?.toLowerCase()}.`); }}>
            <TirIcone nom="Checklist" taille={14} />Noter la mutuelle
          </button>
        </>
      ) : null}
      {c.cible && peutEcrire ? (
        <>
          <div className="tir-bd-volet-section">Noter l&apos;appel</div>
          <div className="tir-bd-choix" role="radiogroup" aria-label="Ce qui s'est passé">
            {(Object.keys(ISSUES_APPEL) as IssueAppel[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={issue === k} className="tir-onglet" onClick={() => { setIssue(k); setConfirme(false); }}>{ISSUES_APPEL[k].libelle}</button>
            ))}
          </div>
          {issue === "rappeler" ? (
            <div className="tir-bd-champs"><label><span>Rappeler le</span><input type="date" className="tir-mi-select" value={rappel} min={jour} onChange={(e) => setRappel(e.target.value)} /></label></div>
          ) : null}
          {issue === "ne_plus_contacter" ? <p className="tir-bd-note">Notez-le aussi dans le logiciel du cabinet : c&apos;est lui qui fait foi.</p> : null}
          <button
            type="button"
            className="tir-bd-action"
            disabled={occupe || !issue}
            onClick={() => {
              if (!issue || !c.cible) return;
              if (issue === "ne_plus_contacter" && !confirme) {
                setConfirme(true);
                return;
              }
              const cible = c.cible;
              void agir(() => t.noterAppel({ cible, issue, rappeler_le: issue === "rappeler" ? rappel : null }), `C'est noté : ${ISSUES_APPEL[issue].libelle.toLowerCase()}.`).then(() => setConfirme(false));
            }}
          >
            <TirIcone nom="Phone" taille={14} />
            {confirme ? "Confirmer : ne plus contacter" : "Noter l'appel"}
          </button>
          {d?.appels?.derniers[c.cible.patient_id] ? (
            <p className="tir-bd-note">Dernier appel : {ISSUES_APPEL[d.appels.derniers[c.cible.patient_id].issue].libelle.toLowerCase()}{d.appels.derniers[c.cible.patient_id].par ? `, par ${d.appels.derniers[c.cible.patient_id].par}` : ""}.</p>
          ) : null}
        </>
      ) : null}
      {avis ? <p className="tir-bd-avis" role="status">{avis}</p> : null}
    </aside>
  );
}

const ONGLETS = [
  { cle: "tous", libelle: "Tous" },
  { cle: "plans", libelle: "Sans rendez-vous" },
  { cle: "devis", libelle: "Devis" },
] as const;

export default function PlansDevis() {
  const t = useTiroma();
  const router = useRouter();
  const params = useSearchParams();
  const d = t.dossier;
  const vue = (ONGLETS.find((o) => o.cle === params.get("vue"))?.cle ?? "tous") as (typeof ONGLETS)[number]["cle"];
  const [praticiens, setPraticiens] = useState<string[]>([]);
  const [vides, setVides] = useState(false);
  const [contexte, setContexte] = useState<{ cle: string; x: number; y: number } | null>(null);
  const ouvert = params.get("plan");
  const [favoris, poserFavori] = useFavoris();
  const [suivis, poserSuivi] = useSuivis();
  const [avis, setAvis] = useState<string | null>(null);
  const annoncer = (texte: string) => {
    setAvis(texte);
    window.setTimeout(() => setAvis(null), 4000);
  };

  const cartes = useMemo(() => (d ? cartesDuDossier(d) : []), [d]);
  const filtrees = cartes.filter((c) => (vue === "tous" || (vue === "devis" ? c.colonne === "relancer" : c.colonne !== "relancer")) && (!praticiens.length || (c.personne && praticiens.includes(c.personne))));
  const colonnes = COLONNES.filter((k) => (vue === "devis" ? k.cle === "relancer" : vue === "plans" ? k.cle !== "relancer" : true))
    .map((k) => ({ ...k, cartes: filtrees.filter((c) => c.colonne === k.cle) }))
    .filter((k) => vides || k.cartes.length || k.cle !== "refus");
  const carteOuverte = ouvert ? cartes.find((c) => c.id === ouvert) ?? null : null;
  /* 04/11 — les tuiles de la capture plans.png (promesse TIROMA n° 15) : le volet de détails de la vue (bouton « Détails »,
     « ?details=1 »), comme le panneau d'une vue Board de Linear ; mêmes chiffres que le Pilotage (./tuiles.ts) */
  const detailsVue = !carteOuverte && params.get("details") === "1";
  const tuiles = d ? tuilesPlans(d) : null;

  useEffect(() => {
    if (!contexte) return;
    const fermer = () => setContexte(null);
    window.addEventListener("click", fermer);
    window.addEventListener("keydown", fermer);
    return () => {
      window.removeEventListener("click", fermer);
      window.removeEventListener("keydown", fermer);
    };
  }, [contexte]);

  useEffect(() => {
    if (!carteOuverte) return;
    document.getElementById(`carte-${carteOuverte.id}`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [carteOuverte]);

  const lien = (c: Carte) => {
    const q = new URLSearchParams(params.toString());
    q.set("plan", c.id);
    return `${BASE}?${q.toString()}`;
  };
  const epingler = (c: Carte) => {
    const oui = !favoris[`plan-${c.id}`];
    poserFavori(`plan-${c.id}`, oui ? { titre: `${c.ident} · ${c.titre}`, href: `${BASE}?plan=${encodeURIComponent(c.id)}`, type: COLONNES.find((k) => k.cle === c.colonne)?.libelle ?? "Plan", depuis: new Date().toISOString() } : null);
    annoncer(oui ? "Épinglé en tête d'Aujourd'hui." : "Désépinglé.");
  };
  const suivre = (c: Carte) => {
    if (!c.cible) return;
    const oui = !suivis[c.cible.patient_id];
    poserSuivi(c.cible.patient_id, oui ? c.cible.patient_nom : null);
    annoncer(oui ? `${c.cible.patient_nom} est suivi : ses fils passent en tête de Créneaux et appels.` : "Vous ne suivez plus ce patient.");
  };
  const exporter = () => {
    exporterCSV("tiroma-plans-devis", ["Colonne", "Devis", "Titre", "Praticien", "Étiquettes", "Date"], filtrees.map((c) => [COLONNES.find((k) => k.cle === c.colonne)?.libelle ?? "", c.ident, c.titre, c.personne ?? "", c.puces.map((p) => p.texte).filter(Boolean).join(", "), c.pied]));
    annoncer("Cartes exportées en CSV.");
  };
  const fermer = () => {
    const q = new URLSearchParams(params.toString());
    q.delete("plan");
    router.push(q.toString() ? `${BASE}?${q.toString()}` : BASE);
  };

  const filtre: OptionMenu[] = [
    { titre: "Praticien" },
    ...(d?.praticiens ?? []).map((p) => ({ libelle: p.nom_affiche, coche: praticiens.includes(p.nom_affiche), action: () => setPraticiens((ps) => (ps.includes(p.nom_affiche) ? ps.filter((x) => x !== p.nom_affiche) : [...ps, p.nom_affiche])) })),
    ...(praticiens.length ? ["sep" as const, { libelle: "Retirer le filtre", icone: "Refresh" as NomTirIcone, action: () => setPraticiens([]) }] : []),
  ];
  const affichage: OptionMenu[] = [{ titre: "Colonnes" }, { libelle: "Afficher les colonnes vides", coche: vides, action: () => setVides((v) => !v) }];
  const carteCtx = contexte ? cartes.find((c) => c.cle === contexte.cle) : null;

  const reel = t.reel;
  let etat: React.ReactNode = null;
  if (t.source === "reelle" && !reel) etat = "Lecture de votre cabinet…";
  else if (t.source === "reelle" && reel && !reel.compte) etat = "Cette session n'est rattachée à aucune organisation.";
  else if (t.source === "reelle" && reel && !reel.cabinets.length) etat = <>Aucun cabinet installé. <Link href={`${RACINE}/tiroma/reglages`}>Installer le cabinet</Link></>;
  else if (!d) etat = "Lecture du cabinet…";

  return (
    <TirCarte className="tir-mi tir-bd">
      <div className="tir-mi-l1 tir-bd-l1">
        <span className="tir-bd-fil">
          <TirIcone nom="Briefcase" taille={14} style={{ color: "lch(60.135 63.97 86.502)" }} />
          <span>{d?.cabinet.entite_nom?.replace(/ \(exemple\)$/, "") ?? "Cabinet"}</span>
          <TirIcone nom="Chevron" taille={14} className="tir-bd-chevron" />
          <span className="tir-bd-fil-page">Plans et devis</span>
          <TirMenu
            libelle="Épingler"
            icone="Etoile"
            classeBouton={`tir-rond tir-bd-etoile-bouton${(carteOuverte ? favoris[`plan-${carteOuverte.id}`] : favoris["vue-plans"]) ? " tir-bd-etoile--active" : ""}`}
            options={[
              ...(carteOuverte ? [{ libelle: favoris[`plan-${carteOuverte.id}`] ? `Désépingler ${carteOuverte.ident}` : `Épingler ${carteOuverte.ident} dans Aujourd'hui`, icone: "Etoile" as NomTirIcone, action: () => epingler(carteOuverte) }] : []),
              { libelle: favoris["vue-plans"] ? "Désépingler cette vue" : "Épingler cette vue dans Aujourd'hui", icone: "CustomView", action: () => { const oui = !favoris["vue-plans"]; poserFavori("vue-plans", oui ? { titre: `Plans et devis${vue !== "tous" ? ` · ${ONGLETS.find((o) => o.cle === vue)?.libelle}` : ""}`, href: vue === "tous" ? BASE : `${BASE}?vue=${vue}`, type: "Vue", depuis: new Date().toISOString() } : null); annoncer(oui ? "Vue épinglée en tête d'Aujourd'hui." : "Vue désépinglée."); } },
            ]}
          />
        </span>
        <span className="tir-pousse" />
        {avis ? <span className="tir-bd-avis-tete" role="status">{avis}</span> : null}
        <TirMenu
          libelle="Suivre"
          icone="Subscribe"
          alignement="droite"
          classeBouton={`tir-rond${carteOuverte?.cible && suivis[carteOuverte.cible.patient_id] ? " tir-bd-etoile--active" : ""}`}
          largeur={240}
          options={[
            ...(carteOuverte?.cible ? [{ libelle: suivis[carteOuverte.cible.patient_id] ? `Ne plus suivre ${carteOuverte.cible.patient_nom}` : `Suivre ${carteOuverte.cible.patient_nom}`, icone: "Subscribe" as NomTirIcone, action: () => suivre(carteOuverte) }] : [{ titre: "Ouvrez une carte pour suivre son patient" } as OptionMenu]),
            ...(Object.keys(suivis).length ? ["sep" as const, { titre: "Suivis (en tête de Créneaux et appels)" } as OptionMenu, ...Object.entries(suivis).map(([id, nom]) => ({ libelle: nom, coche: true, action: () => poserSuivi(id, null) }))] : []),
          ]}
        />
        <Link href={`${RACINE}/tiroma/creneaux?vue=attente&inscrire=1`} className="tir-mi-nouveau" title="Inscrire un patient en liste d'attente">
          <TirIcone nom="Plus" taille={14} />
          <span>Nouvelle inscription</span>
        </Link>
      </div>
      <div className="tir-mi-l2">
        <nav className="tir-mi-onglets" aria-label="Vues">
          {ONGLETS.map((o) => (
            <Link key={o.cle} href={o.cle === "tous" ? BASE : `${BASE}?vue=${o.cle}`} className="tir-onglet" aria-current={vue === o.cle ? "page" : undefined}>{o.libelle}</Link>
          ))}
          <TirMenu
            libelle="Vues"
            icone="CustomView"
            classeBouton="tir-rond tir-bd-vues-bouton"
            largeur={230}
            options={[
              { titre: "Vues" },
              ...ONGLETS.map((o) => ({ libelle: o.libelle, coche: vue === o.cle, href: o.cle === "tous" ? BASE : `${BASE}?vue=${o.cle}` })),
              "sep",
              { libelle: "Copier le lien de cette vue", icone: "LienUrl", action: () => void copier(window.location.href).then((ok) => annoncer(ok ? "Lien copié." : "Le presse-papier a refusé la copie.")) },
              { libelle: "Exporter les cartes en CSV", icone: "Spreadsheet", action: exporter },
            ]}
          />
        </nav>
        <span className="tir-pousse" />
        <TirMenu libelle="Filtrer" icone="Filtre" options={filtre} alignement="droite" classeBouton="tir-rond tir-rond--plein" />
        <span className="tir-bd-pastille-ancre">
          <TirMenu libelle="Affichage" icone="Affichage" options={affichage} alignement="droite" classeBouton="tir-rond tir-rond--plein tir-bd-affichage" />
          {vides ? <span className="tir-bd-pastille" aria-hidden="true" /> : null}
        </span>
        <button
          type="button"
          className="tir-rond tir-rond--plein"
          aria-label="Détails"
          aria-pressed={!!carteOuverte || detailsVue}
          onClick={() => {
            if (carteOuverte) return fermer();
            const q = new URLSearchParams(params.toString());
            if (detailsVue) q.delete("details");
            else q.set("details", "1");
            router.push(q.toString() ? `${BASE}?${q.toString()}` : BASE);
          }}
        >
          <TirIcone nom="Volet" />
        </button>
      </div>
      <div className="tir-mi-corps">
        {etat ? (
          <div className="tir-mi-vide" style={{ flex: 1 }}>{etat}</div>
        ) : (
          <div className="tir-bd-tableau">
            {colonnes.map((k) => (
              <section key={k.cle} className="tir-bd-colonne" aria-label={k.libelle}>
                <div className="tir-bd-tete">
                  <TirIcone nom={k.icone} taille={14} style={{ color: k.couleur }} />
                  <span className="tir-bd-nom">{k.libelle}</span>
                  <span className="tir-bd-compte">{k.cartes.length}</span>
                  <span className="tir-pousse" />
                  <TirMenu libelle={`Actions de ${k.libelle}`} options={[{ libelle: "Masquer les colonnes vides", coche: !vides, action: () => setVides((v) => !v) }, { libelle: "Retirer le filtre", icone: "Refresh", action: () => setPraticiens([]) }]} classeBouton="tir-rond" alignement="droite" />
                  <Link href={`${RACINE}/tiroma/creneaux?vue=attente&inscrire=1`} className="tir-rond" aria-label="Nouvelle inscription en liste d'attente" title="Nouvelle inscription en liste d'attente"><TirIcone nom="Plus" taille={14} /></Link>
                </div>
                <div className="tir-bd-cartes">
                  {k.cartes.map((c) => (
                    <Link
                      key={c.cle}
                      id={`carte-${c.id}`}
                      href={lien(c)}
                      className="tir-bd-carte"
                      aria-current={carteOuverte?.cle === c.cle ? "true" : undefined}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContexte({ cle: c.cle, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <span className="tir-bd-c1">
                        <span className="tir-bd-ident">{c.ident}</span>
                        <TirAvatar nom={c.personne} />
                      </span>
                      <span className="tir-bd-c2">
                        <TirIcone nom={k.icone} taille={14} style={{ color: k.couleur }} />
                        <span className="tir-bd-titre">{c.titre}</span>
                      </span>
                      <span className="tir-bd-puces">
                        {c.puces.map((p, i) => <PuceVue key={i} p={p} />)}
                      </span>
                      <span className="tir-bd-pied" title={c.piedTitre}>{c.pied}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {carteOuverte ? <Volet key={carteOuverte.cle} c={carteOuverte} fermer={fermer} /> : null}
        {detailsVue && tuiles ? (
          <aside className="tir-bd-volet" aria-label="Détails de la vue">
            <div className="tir-bd-volet-tete">
              <span className="tir-bd-volet-id">Plans et devis</span>
              <span className="tir-pousse" />
              <button type="button" className="tir-rond" aria-label="Fermer" onClick={() => { const q = new URLSearchParams(params.toString()); q.delete("details"); router.push(q.toString() ? `${BASE}?${q.toString()}` : BASE); }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.7 3.7a.75.75 0 0 1 1.06 0L8 6.94l3.24-3.24a.75.75 0 1 1 1.06 1.06L9.06 8l3.24 3.24a.75.75 0 1 1-1.06 1.06L8 9.06l-3.24 3.24a.75.75 0 0 1-1.06-1.06L6.94 8 3.7 4.76a.75.75 0 0 1 0-1.06" /></svg>
              </button>
            </div>
            <div className="tir-bd-volet-section">Cette vue</div>
            <div className="tir-bd-prop"><span>Plans signés sans rendez-vous</span><span>{tuiles.sansRdv.nombre}</span></div>
            <div className="tir-bd-prop"><span>Devis signés en attente</span><span>{euros(tuiles.sansRdv.montant)}</span></div>
            <div className="tir-bd-prop"><span>En attente de la mutuelle</span><span>{tuiles.mutuelle}</span></div>
            <div className="tir-bd-prop"><span>Planifiés cette semaine</span><span>{tuiles.planifiesSemaine ?? "—"}</span></div>
            <p className="tir-bd-note">Les mêmes chiffres que la carte « Signé sans rendez-vous » du pilotage ; « planifiés » compte les appels notés depuis lundi qui ont donné un rendez-vous.</p>
          </aside>
        ) : null}
      </div>
      {contexte && carteCtx ? (
        <div className="tir-menu" role="menu" style={{ position: "fixed", left: contexte.x, top: contexte.y }} onClick={(e) => e.stopPropagation()}>
          <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); router.push(lien(carteCtx)); }}>
            <TirIcone nom="Volet" /><span className="tir-menu-libelle">Ouvrir</span>
          </button>
          {carteCtx.plan ? (
            <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); router.push(lien(carteCtx)); }}>
              <TirIcone nom="Checklist" /><span className="tir-menu-libelle">Noter la mutuelle</span>
            </button>
          ) : null}
          {carteCtx.cible ? (
            <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); router.push(lien(carteCtx)); }}>
              <TirIcone nom="Phone" /><span className="tir-menu-libelle">Noter l&apos;appel</span>
            </button>
          ) : null}
          <div className="tir-menu-sep" />
          <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); epingler(carteCtx); }}>
            <TirIcone nom="Etoile" /><span className="tir-menu-libelle">{favoris[`plan-${carteCtx.id}`] ? "Désépingler" : "Épingler dans Aujourd'hui"}</span>
          </button>
          {carteCtx.cible ? (
            <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); suivre(carteCtx); }}>
              <TirIcone nom="Subscribe" /><span className="tir-menu-libelle">{suivis[carteCtx.cible.patient_id] ? "Ne plus suivre le patient" : "Suivre le patient"}</span>
            </button>
          ) : null}
          <button type="button" role="menuitem" className="tir-menu-option" onClick={() => { setContexte(null); void copier([carteCtx.titre, ...carteCtx.details.map((r) => `${r.libelle} : ${r.valeur}`)].join("\n")).then((ok) => annoncer(ok ? "Copié pour l'assistant." : "Le presse-papier a refusé la copie.")); }}>
            <TirIcone nom="Agent" /><span className="tir-menu-libelle">Copier pour l&apos;assistant</span>
          </button>
        </div>
      ) : null}
    </TirCarte>
  );
}
