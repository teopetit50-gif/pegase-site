"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › fiche d'un chantier : le corps de la page d'une Initiative de
   Linear (02/11/2026, relevé linear-initiative.md, styles ./dal-ini.css).

   Overview de l'initiative → Aperçu du chantier :
     tuile, titre, résumé       le chantier, son adresse et sa référence
     Properties                 statut, priorité (sa phrase la plus pressée),
                                maître d'ouvrage (Owner), fin prévue (Target
                                date), « … » = les autres propriétés (volet)
     Resources                  marché vérifié, factures rattachées ; « + »
                                rattache une facture
     Latest update              le dernier message du terrain (sinon la
                                dernière réponse à une confirmation), avec la
                                santé du chantier comme pastille
     Description                le marché et ce qui reste à régler, en phrases
     Projects                   les lots, groupés par état (En cours, À venir,
                                Terminés) : santé du déboursé, priorité de
                                leurs contrôles, exécutant, fin du dernier
                                passage, avancement
   Volet de détails (⌘ I) : Properties, Progress (santé / statut / exécutants
   des lots), Activity.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CONFIRMATIONS, EXECUTIONS, STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import { famille } from "@/components/espace/daliro/liste";
import type { Chantier, Lot, StatutChantier, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, dateHeure, montant, relatif } from "@/components/espace/format";
import { DalMenu } from "./DalCadre";
import { DalIcone } from "./DalIcone";
import { resume, type TeinteClair } from "./enClair";
import { IconePriorite, IconeSante, IconeStatut, NOM_PRIORITE } from "./IconesProjet";
import "./dal-ini.css";

type Sante = "on" | "risk" | "off" | null;
const SANTE_LIBELLE: Record<Exclude<Sante, null>, string> = { on: "En bonne voie", risk: "À risque", off: "Bloqué" };
const PRIORITE: Record<TeinteClair, 0 | 1 | 2 | 3 | 4> = { rouge: 1, ambre: 2, bleu: 3, gris: 4, vert: 0 };
/* couleur de l'icône de projet (couleurs relevées sur les icônes de projet de Linear) */
export const COULEUR_LOT: Record<Lot["statut"], string> = { a_venir: "#f0bf00", en_cours: "#4cb782", termine: "#5e6ad2" };
export const STATUT_LOT: Record<Lot["statut"], StatutChantier> = { a_venir: "preparation", en_cours: "ouvert", termine: "receptionne" };
const GROUPES: { cle: Lot["statut"]; libelle: string }[] = [
  { cle: "en_cours", libelle: "En cours" },
  { cle: "a_venir", libelle: "À venir" },
  { cle: "termine", libelle: "Terminés" },
];
const CANAUX: Record<string, string> = { vocal: "Vocal", photo: "Photo", visite: "Visite de chantier", courriel: "Courriel", email: "Courriel", whatsapp: "WhatsApp", sms: "SMS" };
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1 || /\p{Lu}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");
const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
/* « Mar 31st, 2027 » de Linear, en français : « 31 mars 2027 » */
const dateLinear = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
};
const quandLong = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? dateCourte(iso) : dateHeure(iso));
const temps = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/* ——— la santé du chantier : sa famille dans la liste (Off track / At risk / On track) ——— */
export function santeChantier(c: Chantier): Sante {
  const f = famille(c);
  return f === "bloque" ? "off" : f === "a_signer" || f === "a_confirmer" ? "risk" : f === "ouvert" ? "on" : null;
}

/* ——— la chronique du chantier, tirée du tableau seul ——— */
export type Nouvelle = {
  cle: string;
  quand: string;
  genre: "message" | "confirmation" | "evenement";
  auteur: string | null;
  etat: string;
  texte: string;
  lien: string;
  lienLibelle: string;
};

export function chronique(t: Tableau, ici: string): Nouvelle[] {
  const c = t.chantier;
  const n: Nouvelle[] = [];
  for (const a of t.avenants) {
    const o = a.origine ?? {};
    if (o.texte && o.date) {
      n.push({ cle: `m-${a.id}`, quand: String(o.date), genre: "message", auteur: o.auteur ? String(o.auteur) : null, etat: CANAUX[String(o.canal ?? "")] ?? "Message", texte: String(o.texte), lien: `${ici}?onglet=argent#avenants`, lienLibelle: `Avenant n° ${a.numero}` });
    }
    if (a.statut === "signe" && a.signe_le) {
      n.push({ cle: `s-${a.id}`, quand: a.signe_le, genre: "evenement", auteur: a.signe_par ?? null, etat: "Signé", texte: `a signé l'avenant n° ${a.numero} : ${a.objet}`, lien: `${ici}?onglet=argent#avenants`, lienLibelle: `Avenant n° ${a.numero}` });
    }
  }
  for (const p of t.passages) {
    const qui = p.intervenant_nom ?? p.intervenant_lu ?? "L'intervenant";
    const du = `son passage du ${dateCourte(p.debut)}${p.tache ? ` (${p.tache})` : ""}`;
    for (const e of p.confirmations ?? []) {
      const conf = CONFIRMATIONS[e.evenement];
      const texte = e.evenement === "confirmee" ? `a confirmé ${du}` : e.evenement === "declinee" ? `a décliné ${du}` : e.evenement === "sans_reponse" ? `n'a pas répondu pour ${du}` : `a reçu la demande de confirmation de ${du}`;
      n.push({ cle: `c-${e.id}`, quand: e.survenu_le, genre: "confirmation", auteur: qui, etat: conf.libelle, texte, lien: `${ici}?onglet=terrain#planning`, lienLibelle: "Planning" });
    }
  }
  if (c.ouvert_le) n.push({ cle: "ouvert", quand: c.ouvert_le, genre: "evenement", auteur: null, etat: "Ouvert", texte: "Le chantier est ouvert", lien: ici, lienLibelle: "Chantier" });
  n.push({ cle: "cree", quand: c.cree_le, genre: "evenement", auteur: null, etat: "Créé", texte: "Le chantier est créé, en préparation", lien: ici, lienLibelle: "Chantier" });
  return n.sort((a, b) => temps(b.quand) - temps(a.quand));
}

/* l'avancement d'un lot : la dernière situation de travaux (lignes du lot, pondérées par leur base), sinon son état */
function avancements(t: Tableau): Map<string, number> {
  const m = new Map<string, number>();
  const s = [...(t.situations ?? [])].filter((x) => x.statut !== "annulee" && x.statut !== "refusee").sort((a, b) => b.numero - a.numero)[0];
  const cumul = new Map<string, { base: number; fait: number }>();
  for (const l of s?.lignes ?? []) {
    if (!l.lot_id || !l.base_ht) continue;
    const e = cumul.get(l.lot_id) ?? { base: 0, fait: 0 };
    e.base += Math.abs(l.base_ht);
    e.fait += (Math.abs(l.base_ht) * l.avancement) / 100;
    cumul.set(l.lot_id, e);
  }
  for (const [id, e] of cumul) m.set(id, Math.round((e.fait / e.base) * 100));
  return m;
}

/* ——— ce que chaque lot montre dans le tableau et dans « Progress » ——— */
export type LigneLot = { lot: Lot; sante: Sante; santeTexte: string; prio: 0 | 1 | 2 | 3 | 4; prioTexte: string; qui: string | null; fin: string | null; pct: number | null };
export function lignesLots(t: Tableau): LigneLot[] {
  const avance = avancements(t);
  const prix = t.voit_prix;
  return t.lots.map((l) => {
    const d = t.debourse.find((x) => x.lot_id === l.id);
    const reste = d?.reste_ht ?? null;
    const engage = (d?.engage_marche_ht ?? 0) + (d?.engage_avenants_ht ?? 0);
    const sante: Sante = reste === null || !prix ? null : reste < 0 ? "off" : reste > 0 ? "on" : null;
    const santeTexte = reste === null || !prix ? "Déboursé : réservé aux comptes qui voient les prix" : reste < 0 ? `Dépassé de ${montant(-reste)} HT` : reste > 0 ? `Dans le budget : reste ${montant(reste)} HT` : engage ? "Soldé : tout l'engagé est facturé" : "Rien d'engagé sur ce lot";
    const k = t.controles.filter((x) => x.objet_id === l.id && x.gravite !== "info");
    const prio = k.some((x) => x.gravite === "bloquant") ? 1 : k.length ? 2 : 0;
    const prioTexte = k.length ? k.map((x) => x.message).join(" · ") : "Aucun point à régler sur ce lot";
    const fins = t.passages.filter((p) => p.lot_id === l.id && p.statut !== "annule").map((p) => p.fin);
    const fin = fins.length ? fins.sort().at(-1)! : null;
    const pct = l.statut === "termine" ? 100 : (avance.get(l.id) ?? l.avancement_pct ?? (l.statut === "a_venir" ? 0 : null));
    return { lot: l, sante, santeTexte, prio, prioTexte, qui: l.tiers_nom ?? l.equipe_nom ?? null, fin, pct };
  });
}

/* ═════════ l'onglet Aperçu (Overview) ═════════ */
export function ApercuChantier({ t, c, ici, ouvrirVolet, demander }: { t: Tableau; c: Chantier; ici: string; ouvrirVolet: () => void; demander: (f: { type: "facture" } | { type: "releve" }) => void }) {
  const s = STATUTS_CHANTIER[t.chantier.statut];
  const auj = useMemo(() => jourLocal(), []);
  const ch = t.chantier;
  const r = resume(c, t, auj);
  const prio = PRIORITE[r.teinte];
  const finPassee = !!ch.date_fin_prevue && ch.date_fin_prevue < auj && !["receptionne", "clos", "annule"].includes(ch.statut);
  const marcheVerifie = !!ch.marche_verifie || t.marches.some((m) => m.statut === "verifie");
  const marche = t.marches.find((m) => m.statut === "verifie") ?? t.marches[0] ?? null;
  const factures = t.factures.filter((f) => f.statut === "rattachee").length;
  const sante = santeChantier(c);
  const nouvelles = useMemo(() => chronique(t, ici), [t, ici]);
  const derniere = nouvelles.find((n) => n.genre === "message") ?? nouvelles.find((n) => n.genre === "confirmation") ?? null;
  const controles = t.controles.filter((k) => k.gravite !== "info");
  const nbBloquants = controles.filter((k) => k.gravite === "bloquant").length;
  const nbAVoir = controles.length - nbBloquants;
  const resumeTexte = [ch.adresse, `${ch.code_postal} ${ch.commune}`.trim(), ch.reference ? `référence ${ch.reference}` : null].filter(Boolean).join(" · ");
  const et = ch.etape;
  const place = ch.place_client === "titulaire" ? "Titulaire" : ch.place_client === "cotraitant" ? "Cotraitant" : `Sous-traitant${ch.donneur_ordre_nom ? ` de ${ch.donneur_ordre_nom}` : ""}`;

  return (
    <>
    <div className="dal-ini-colonne">
      <span className="dal-ini-tuile" aria-hidden="true">
        <DalIcone nom="Crane" taille={24} />
      </span>
      <h2 className="dal-ini-titre">{ch.nom}</h2>
      <p className="dal-ini-resume">{resumeTexte}</p>

      <div className="dal-ini-rangee">
        <h3 className="dal-ini-etiquette">Propriétés</h3>
        <ul className="dal-ini-pilules">
          <li>
            <button type="button" className="dal-ini-pilule" title={`Statut : ${s.libelle}`} onClick={ouvrirVolet}>
              <IconeStatut statut={ch.statut} pct={et?.avancement_pct ?? 0} />
              {s.libelle}
            </button>
          </li>
          <li>
            <button type="button" className="dal-ini-pilule" title={`Priorité : ${NOM_PRIORITE[prio]} — ${r.texte}`} onClick={ouvrirVolet}>
              <IconePriorite n={prio} />
              {prio ? NOM_PRIORITE[prio] : "Aucune priorité"}
            </button>
          </li>
          <li>
            <button type="button" className="dal-ini-pilule" data-vide={ch.maitre_ouvrage_nom ? undefined : ""} title="Maître d'ouvrage" onClick={ouvrirVolet}>
              {ch.maitre_ouvrage_nom ? <span className="dal-ini-avatar">{initiales(ch.maitre_ouvrage_nom) || "?"}</span> : <DalIcone nom="ProjectLead" />}
              {ch.maitre_ouvrage_nom ?? "Maître d'ouvrage"}
            </button>
          </li>
          <li>
            <button type="button" className="dal-ini-pilule" data-vide={ch.date_fin_prevue ? undefined : ""} data-rouge={finPassee ? "" : undefined} title={finPassee ? "Fin prévue, dépassée" : "Fin prévue"} onClick={ouvrirVolet}>
              <DalIcone nom={finPassee ? "CrossedOutCalendar" : "Calendar"} />
              {ch.date_fin_prevue ? dateLinear(ch.date_fin_prevue) : "Fin prévue"}
            </button>
          </li>
          <li>
            <DalMenu
              libelle="Autres propriétés"
              options={[
                { libelle: ch.date_debut ? `Début : ${dateLinear(ch.date_debut)}` : "Début à fixer", icone: "FromDate", action: ouvrirVolet },
                { libelle: et && et.etapes ? `Étape ${et.etape} sur ${et.etapes}${et.lot_libelle ? ` · ${et.lot_libelle}` : ""}` : "Aucun lot", icone: "Project", action: ouvrirVolet },
                { libelle: `Notre place : ${place}`, icone: "Members", action: ouvrirVolet },
                { libelle: ch.regime_tva === "normal" ? "TVA au régime normal" : ch.regime_tva === "autoliquidation" ? "TVA autoliquidée" : ch.regime_tva === "non_applicable" ? "TVA non applicable" : "Hors du champ de la TVA", icone: "Euro", action: ouvrirVolet },
              ]}
            />
          </li>
        </ul>
      </div>

      <div className="dal-ini-rangee">
        <h3 className="dal-ini-etiquette">Ressources</h3>
        <ul className="dal-ini-pilules">
          <li>
            <Link href={`${ici}?onglet=argent&partie=marche`} className="dal-ini-pilule" title={marche ? `Marché ${marche.reference ?? ""}`.trim() : "Aucun marché"}>
              <DalIcone nom="Page" />
              {marcheVerifie ? "Marché vérifié" : marche ? "Marché à vérifier" : "Aucun marché"}
            </Link>
          </li>
          {factures ? (
            <li>
              <Link href={`${ici}?onglet=argent&partie=factures`} className="dal-ini-pilule">
                <DalIcone nom="Page" />
                {`${factures} facture${factures > 1 ? "s" : ""} rattachée${factures > 1 ? "s" : ""}`}
              </Link>
            </li>
          ) : null}
          <li>
            <DalMenu
              libelle="Ajouter une ressource"
              icone="Plus"
              options={[
                { libelle: "Rattacher une facture…", icone: "Attachment", action: () => demander({ type: "facture" }) },
                { libelle: "Relevé du chantier…", icone: "Checklist", action: () => demander({ type: "releve" }) },
              ]}
            />
          </li>
        </ul>
      </div>

      {/* « Latest update » */}
      <section className="dal-ini-maj" aria-labelledby="dal-ini-maj">
        <div className="dal-ini-tete">
          <h3 id="dal-ini-maj">Dernière nouvelle</h3>
          <Link href={`${ici}?onglet=fil`} className="dal-ini-bouton" title="Le fil du chantier">
            <DalIcone nom="Write" taille={14} />
            Le fil
          </Link>
        </div>
        <div className="dal-ini-maj-corps">
          <div className="dal-ini-meta">
            {sante ? (
              <span className="dal-ini-sante" data-sante={sante}>
                <IconeSante etat={sante} />
                {SANTE_LIBELLE[sante]}
              </span>
            ) : null}
            {derniere?.auteur ? (
              <>
                <span className="dal-ini-avatar">{initiales(derniere.auteur) || "?"}</span>
                <span className="dal-ini-auteur">{derniere.auteur}</span>
              </>
            ) : null}
            {derniere ? (
              <span className="dal-ini-quand" title={`${derniere.etat} · ${quandLong(derniere.quand)}`}>
                {relatif(derniere.quand)}
              </span>
            ) : null}
          </div>
          <p className="dal-ini-texte" data-vide={derniere ? undefined : ""}>
            {derniere ? (derniere.genre === "message" ? `« ${derniere.texte} »` : `${derniere.auteur ?? ""} ${derniere.texte}.`.trim()) : "Rien de neuf : aucun message du terrain, aucune réponse à une confirmation de passage."}
          </p>
          <div className="dal-ini-actions">
            <Link href={`${ici}?onglet=fil`} className="dal-ini-commentaires" aria-label="Le fil du chantier" title="Le fil du chantier">
              <DalIcone nom="Chat" />
            </Link>
            {derniere && derniere.lien !== ici ? (
              <Link href={derniere.lien} className="dal-ini-reaction" aria-label={derniere.lienLibelle} title={derniere.lienLibelle}>
                <DalIcone nom={derniere.genre === "message" ? "Signature" : "Calendar"} taille={14} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* « Description » */}
      <section className="dal-ini-description" aria-labelledby="dal-ini-description">
        <h3 id="dal-ini-description">Description</h3>
        {(ch.description ?? "").split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        <p>
          {marche ? `${marche.objet ?? "Marché"}${marche.reference ? `, marché ${marche.reference}` : ""}${marche.date_signature ? ` signé le ${dateCourte(marche.date_signature)}` : ""}${marcheVerifie ? ", vérifié ligne à ligne" : ", à vérifier"}. ` : "Aucun marché saisi. "}
          {controles.length ? (
            <>
              {nbBloquants ? `${nbBloquants} point${nbBloquants > 1 ? "s" : ""} bloquant${nbBloquants > 1 ? "s" : ""}` : "Aucun point bloquant"}
              {nbAVoir ? `, ${nbAVoir} à voir` : ""} :{" "}
              <Link href={`${ici}?onglet=terrain&partie=controles`}>le détail dans Terrain</Link>.
            </>
          ) : (
            "Rien à régler sur ce chantier."
          )}
        </p>
      </section>
    </div>
    <LotsChantier t={t} ici={ici} />
    </>
  );
}

/* la flèche de tri de Linear (AnimatedArrowUpDownIcon du paquet public, static.linear.app,
   relue le 02/11/2026 ; sens descendant), 12×12 */
function FlecheTri() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.5361 10.2745C11.8024 10.0029 11.8249 9.56807 11.5762 9.26961C11.3275 8.97139 10.8961 8.91526 10.5811 9.12801L10.5195 9.17391L8.00001 11.2735L5.48048 9.17391L5.41895 9.12801C5.10388 8.91526 4.67252 8.97139 4.42384 9.26961C4.17512 9.56807 4.19758 10.0029 4.46387 10.2745L4.51954 10.3263L7.51954 12.8263C7.79767 13.058 8.20234 13.058 8.48048 12.8263L11.4805 10.3263L11.5361 10.2745Z" />
      <path d="M8.75 12.25C8.75 12.6642 8.41421 13 8 13C7.58579 13 7.25 12.6642 7.25 12.25L7.25 3.75C7.25 3.33579 7.58579 3 8 3C8.41421 3 8.75 3.33579 8.75 3.75V12.25Z" />
    </svg>
  );
}

/* ═════════ « Projects » : les lots du chantier ═════════ */
type Tri = "nom" | "sante" | "priorite" | "fin" | "statut";
function LotsChantier({ t, ici }: { t: Tableau; ici: string }) {
  const [replies, setReplies] = useState<Set<string>>(new Set());
  const [tri, setTri] = useState<Tri>("priorite");
  const [termines, setTermines] = useState(true);
  const lignes = useMemo(() => lignesLots(t), [t]);
  const rang = (x: LigneLot): number | string =>
    tri === "nom" ? `${x.lot.code} ${x.lot.libelle}` : tri === "sante" ? ({ off: 0, risk: 1, on: 2 } as const)[x.sante ?? "on"] + (x.sante ? 0 : 3) : tri === "priorite" ? (x.prio === 0 ? 9 : x.prio) : tri === "fin" ? (x.fin ?? "9999") : -(x.pct ?? -1);
  const trier = (a: LigneLot, b: LigneLot) => {
    const ra = rang(a), rb = rang(b);
    return ra < rb ? -1 : ra > rb ? 1 : a.lot.rang - b.lot.rang;
  };
  const basculer = (cle: string) =>
    setReplies((p) => {
      const n = new Set(p);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });
  const entete = (cle: Tri, libelle: string, col?: string) => (
    <button type="button" className="dal-ini-tri" data-col={col} aria-pressed={tri === cle} onClick={() => setTri(cle)} title={`Trier par ${libelle.toLowerCase()}`}>
      {libelle}
      {tri === cle ? <FlecheTri /> : null}
    </button>
  );
  const lienLots = `${ici}?onglet=argent&partie=lots`;

  return (
    <section className="dal-ini-lots" aria-labelledby="dal-ini-lots">
      <div className="dal-ini-lots-tete">
        <h3 id="dal-ini-lots" className="dal-ini-lots-titre">
          Lots
        </h3>
        <DalMenu libelle="Options d'affichage" icone="Affichage" alignement="droite" options={[{ libelle: termines ? "Masquer les lots terminés" : "Montrer les lots terminés", icone: "IssueStatusDone", action: () => setTermines((v) => !v) }]} />
        <Link href={`${ici}?onglet=argent&partie=marche`} className="dal-rond dal-rond--plein" aria-label="Ajouter des lots : le marché, dans Argent" title="Ajouter des lots : le marché, dans Argent">
          <DalIcone nom="Plus" />
        </Link>
      </div>
      {t.lots.length ? (
        <div className="dal-ini-table" role="table" aria-label="Lots du chantier">
          <div className="dal-ini-entete" role="row">
            <span />
            <span />
            {entete("nom", "Nom")}
            {entete("sante", "Santé")}
            {entete("priorite", "Priorité", "priorite")}
            <span className="dal-ini-tri dal-ini-tri--simple" data-col="lead">
              Exécutant
            </span>
            {entete("fin", "Fin", "date")}
            {entete("statut", "Statut")}
            <span />
          </div>
          {GROUPES.map((g) => {
            if (g.cle === "termine" && !termines) return null;
            const ls = lignes.filter((x) => x.lot.statut === g.cle).sort(trier);
            if (!ls.length) return null;
            const replie = replies.has(g.cle);
            return (
              <div key={g.cle} role="rowgroup" style={{ display: "contents" }}>
                <div className="dal-ini-groupe" role="row">
                  <span />
                  <div className="dal-ini-groupe-tete">
                    <button type="button" className="dal-ini-chevron" aria-expanded={!replie} aria-label={replie ? `Déplier ${g.libelle}` : `Replier ${g.libelle}`} onClick={() => basculer(g.cle)}>
                      <DalIcone nom="Chevron" />
                    </button>
                    <h4 className="dal-ini-groupe-nom">{g.libelle}</h4>
                    <span className="dal-ini-groupe-filet" aria-hidden="true" />
                    <span className="dal-ini-groupe-plus">
                      <Link href={lienLots} className="dal-rond" aria-label="Lots et déboursé, dans Argent" title="Lots et déboursé, dans Argent">
                        <DalIcone nom="Plus" />
                      </Link>
                    </span>
                  </div>
                </div>
                {replie
                  ? null
                  : ls.map((x) => (
                      <Link key={x.lot.id} href={lienLots} className="dal-ini-ligne" role="row">
                        <span />
                        <span className="dal-ini-coche" aria-hidden="true" />
                        <span className="dal-ini-nom">
                          <span className="dal-ini-nom-icone" style={{ color: COULEUR_LOT[x.lot.statut] }}>
                            <DalIcone nom="Project" />
                          </span>
                          <span>
                            {x.lot.code} {x.lot.libelle}
                          </span>
                        </span>
                        <span className="dal-ini-cellule" role="img" aria-label={x.santeTexte} title={x.santeTexte}>
                          <IconeSante etat={x.sante} />
                        </span>
                        <span className="dal-ini-cellule" data-col="priorite" role="img" aria-label={`Priorité : ${NOM_PRIORITE[x.prio]}`} title={x.prioTexte}>
                          <IconePriorite n={x.prio} />
                        </span>
                        <span className="dal-ini-cellule" data-col="lead" title={`${EXECUTIONS[x.lot.execution]}${x.qui ? ` : ${x.qui}` : ", à désigner"}`}>
                          {x.qui ? <span className="dal-ini-avatar dal-ini-avatar--16">{initiales(x.qui) || "?"}</span> : <DalIcone nom="UnassignedCircle" />}
                        </span>
                        <span className="dal-ini-cellule" data-col="date" title={x.fin ? `Dernier passage jusqu'au ${dateCourte(x.fin)}` : "Aucun passage planifié"}>
                          <DalIcone nom="Calendar" />
                          {x.fin ? <span>{dateLinear(x.fin)}</span> : null}
                        </span>
                        <span className="dal-ini-cellule" title={x.pct === null ? "Avancement non mesuré (aucune situation)" : `Avancement ${x.pct} %`}>
                          <IconeStatut statut={STATUT_LOT[x.lot.statut]} pct={x.pct ?? 0} />
                          <span data-col="pct">{x.pct === null ? "—" : `${x.pct}%`}</span>
                        </span>
                        <span />
                      </Link>
                    ))}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="dal-ini-aide">Aucun lot : le planning et les lignes du marché ne peuvent pas s&apos;y rattacher.</p>
      )}
    </section>
  );
}

/* ═════════ le volet de détails (⌘ I) ═════════ */
type Vue = "sante" | "statut" | "executants";
export function VoletChantier({ t, c, ici, entete }: { t: Tableau; c: Chantier; ici: string; entete?: { fiche: string; fermer: () => void } }) {
  const [ouvertes, setOuvertes] = useState({ proprietes: true, progres: true, activite: true });
  const [vue, setVue] = useState<Vue>("sante");
  const auj = useMemo(() => jourLocal(), []);
  const ch = t.chantier;
  const s = STATUTS_CHANTIER[ch.statut];
  const r = resume(c, t, auj);
  const prio = PRIORITE[r.teinte];
  const et = ch.etape;
  const finPassee = !!ch.date_fin_prevue && ch.date_fin_prevue < auj && !["receptionne", "clos", "annule"].includes(ch.statut);
  const lignes = useMemo(() => lignesLots(t), [t]);
  const faits = useMemo(() => chronique(t, ici).slice(0, 5), [t, ici]);
  const place = ch.place_client === "titulaire" ? "Titulaire" : ch.place_client === "cotraitant" ? "Cotraitant" : `Sous-traitant${ch.donneur_ordre_nom ? ` de ${ch.donneur_ordre_nom}` : ""}`;
  const tva = ch.regime_tva === "normal" ? "Régime normal" : ch.regime_tva === "autoliquidation" ? "Autoliquidation" : ch.regime_tva === "non_applicable" ? "Non applicable" : "Hors du champ";

  const comptes: { cle: string; icone: React.ReactNode; libelle: string; n: number }[] =
    vue === "sante"
      ? [
          { cle: "vide", icone: <IconeSante etat={null} />, libelle: "Déboursé non suivi", n: lignes.filter((x) => !x.sante).length },
          { cle: "on", icone: <IconeSante etat="on" />, libelle: "Dans le budget", n: lignes.filter((x) => x.sante === "on").length },
          { cle: "off", icone: <IconeSante etat="off" />, libelle: "Dépassé", n: lignes.filter((x) => x.sante === "off").length },
        ]
      : vue === "statut"
        ? GROUPES.map((g) => ({ cle: g.cle, icone: <IconeStatut statut={STATUT_LOT[g.cle]} pct={g.cle === "termine" ? 100 : g.cle === "en_cours" ? 50 : 0} />, libelle: g.libelle, n: lignes.filter((x) => x.lot.statut === g.cle).length }))
        : [...new Set(lignes.map((x) => x.qui ?? "À désigner"))].map((q) => ({ cle: q, icone: <span className="dal-ini-avatar dal-ini-avatar--16">{initiales(q) || "?"}</span>, libelle: q, n: lignes.filter((x) => (x.qui ?? "À désigner") === q).length }));

  const tete = (cle: keyof typeof ouvertes, titre: string) => (
    <button type="button" className="dal-ini-carte-tete" aria-expanded={ouvertes[cle]} onClick={() => setOuvertes((o) => ({ ...o, [cle]: !o[cle] }))}>
      {titre}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
        <path d="M5.2 6.4h5.6L8 9.6z" />
      </svg>
    </button>
  );

  return (
    <aside id="dal-ini-volet" className="dal-ini-volet" data-peek={entete ? "" : undefined} aria-label="Détails du chantier">
      {/* 05/11/2026 : ouvert depuis la Timeline, le volet porte en tête la carte du projet, comme le « peek » de Linear
         (relu sur linear.app/omegaaii/projects/all : icône, nom et chevron vers la page, étoile, « … », description) */}
      {entete ? (
        <section className="dal-ini-carte dal-ini-peek" aria-label="Chantier">
          <div className="dal-ini-peek-tete">
            <DalIcone nom="Crane" taille={16} />
            <Link href={entete.fiche} className="dal-ini-peek-nom">
              {ch.nom}
              <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3.5 10.5 8 6 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <button type="button" className="dal-ini-peek-fermer" aria-label="Fermer" title="Fermer" onClick={entete.fermer}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <p className="dal-ini-peek-description">{(ch.description ?? "").split("\n\n")[0] || [ch.adresse, `${ch.code_postal} ${ch.commune}`].filter(Boolean).join(", ")}</p>
        </section>
      ) : null}
      <section className="dal-ini-carte" aria-label="Propriétés">
        {tete("proprietes", "Propriétés")}
        {ouvertes.proprietes ? (
          <>
            <dl className="dal-ini-props">
              <div className="dal-ini-prop">
                <dt>Statut</dt>
                <dd>
                  <span className="dal-ini-valeur">
                    <IconeStatut statut={ch.statut} pct={et?.avancement_pct ?? 0} />
                    {s.libelle}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Priorité</dt>
                <dd>
                  <span className="dal-ini-valeur" title={r.texte}>
                    <IconePriorite n={prio} />
                    {prio ? NOM_PRIORITE[prio] : "Aucune priorité"}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Maître d&apos;ouvrage</dt>
                <dd>
                  <span className="dal-ini-valeur" data-vide={ch.maitre_ouvrage_nom ? undefined : ""}>
                    {ch.maitre_ouvrage_nom ? <span className="dal-ini-avatar">{initiales(ch.maitre_ouvrage_nom) || "?"}</span> : <DalIcone nom="ProjectLead" />}
                    {ch.maitre_ouvrage_nom ?? "À désigner"}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Fin prévue</dt>
                <dd>
                  <span className="dal-ini-valeur" data-vide={ch.date_fin_prevue ? undefined : ""}>
                    <DalIcone nom={finPassee ? "CrossedOutCalendar" : "Calendar"} />
                    {ch.date_fin_prevue ? dateLinear(ch.date_fin_prevue) : "À fixer"}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Début</dt>
                <dd>
                  <span className="dal-ini-valeur" data-vide={ch.date_debut ? undefined : ""}>
                    <DalIcone nom="FromDate" />
                    {ch.date_debut ? dateLinear(ch.date_debut) : "À fixer"}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Étape</dt>
                <dd>
                  <span className="dal-ini-valeur" data-vide={et && et.etapes ? undefined : ""}>
                    <DalIcone nom="Project" />
                    {et && et.etapes ? `${et.etape} sur ${et.etapes}${et.lot_libelle ? ` · ${et.lot_libelle}` : ""}` : "Aucun lot"}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>Notre place</dt>
                <dd>
                  <span className="dal-ini-valeur">
                    <DalIcone nom="Members" />
                    {place}
                  </span>
                </dd>
              </div>
              <div className="dal-ini-prop">
                <dt>TVA</dt>
                <dd>
                  <span className="dal-ini-valeur">
                    <DalIcone nom="Euro" />
                    {tva}
                  </span>
                </dd>
              </div>
            </dl>
          </>
        ) : null}
      </section>

      <section className="dal-ini-carte" aria-label="Avancement des lots">
        {tete("progres", "Avancement")}
        {ouvertes.progres ? (
          <>
            <div className="dal-ini-segments" role="group" aria-label="Regrouper les lots par">
              {(
                [
                  ["sante", "Santé"],
                  ["statut", "Statut"],
                  ["executants", "Exécutants"],
                ] as const
              ).map(([cle, libelle]) => (
                <button key={cle} type="button" className="dal-ini-segment" aria-pressed={vue === cle} onClick={() => setVue(cle)}>
                  {libelle}
                </button>
              ))}
            </div>
            {comptes.map((x) => (
              <div key={x.cle} className="dal-ini-compte">
                {x.icone}
                <span>{x.libelle}</span>
                <span>{x.n}</span>
              </div>
            ))}
          </>
        ) : null}
      </section>

      <section className="dal-ini-carte" aria-label="Activité">
        <div className="dal-ini-carte-titre">
          {tete("activite", "Activité")}
          <Link href={`${ici}?onglet=fil`} className="dal-ini-carte-lien">
            Tout voir
          </Link>
        </div>
        {ouvertes.activite ? (
          <ul className="dal-ini-evenements">
            {faits.map((f) => (
              <li key={f.cle} className="dal-ini-evenement">
                <DalIcone nom={f.genre === "message" ? "Comment" : f.genre === "confirmation" ? "Calendar" : "Created"} />
                <span>
                  {f.auteur ? <strong>{f.auteur}</strong> : null} {f.auteur ? f.texte : f.texte.charAt(0).toUpperCase() + f.texte.slice(1)}
                  <span title={quandLong(f.quand)}> · {relatif(f.quand)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </aside>
  );
}
