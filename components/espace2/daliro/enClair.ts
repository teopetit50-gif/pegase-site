/* ══════════════════════════════════════════════════════════════════════
   DALIRO en clair (30/10/2026) : ce qu'un chantier demande, en phrases de
   chantier, pour la frise (l'aperçu à droite) et la vue d'ensemble.

   Les pages de la refonte affichaient les familles de la base (« un
   contrôle bloquant », « J-2 demandé, sans réponse ou décliné »). Ici, une
   phrase par chose à faire, avec le nom de qui, le jour et le montant
   (seulement pour qui voit les prix), et le lien vers l'endroit où on le
   fait. Lecture seule : aucune donnée n'est écrite.

   Sans le tableau du chantier (base réelle pas encore lue), on retombe sur
   les compteurs de la liste (btp_liste_chantiers).
   ══════════════════════════════════════════════════════════════════════ */

import { montant } from "@/components/espace/format";
import type { Chantier, Confirmation, Passage, Tableau } from "@/components/espace/daliro/types";
import { RACINE } from "../modules";

export type TeinteClair = "rouge" | "ambre" | "bleu" | "vert" | "gris";
export type Phrase = { cle: string; teinte: TeinteClair; texte: string; href?: string };

const BASE = `${RACINE}/daliro`;
const JOUR = 86_400_000;
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/* les jours se comptent en jours calendaires UTC, comme la frise */
const jourNum = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
export const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
export const ecartJours = (iso: string, auj: string) => jourNum(iso) - jourNum(auj);

/* « aujourd'hui », « demain », « mardi », puis « lun. 10 nov. » */
export function quand(iso: string, auj: string): string {
  const n = ecartJours(iso, auj);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  const d = new Date(jourNum(iso) * JOUR);
  if (n > 1 && n < 7) return ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}
/* « du lun. 3 au ven. 7 nov. », ou un seul jour */
export function periode(p: { debut: string; fin: string }, auj: string): string {
  if (p.debut.slice(0, 10) === p.fin.slice(0, 10)) return quand(p.debut, auj);
  return `${quand(p.debut, auj)} → ${quand(p.fin, auj)}`;
}

export const qui = (p: { intervenant_nom?: string | null; intervenant_lu?: string | null }) => p.intervenant_nom ?? p.intervenant_lu ?? "Intervenant à désigner";

/* la confirmation d'un passage, dite pour un humain */
export const CONFIRMATION_CLAIRE: Record<Confirmation, { court: string; teinte: TeinteClair }> = {
  non_demandee: { court: "pas encore prévenu", teinte: "gris" },
  demandee: { court: "prévenu, attend sa réponse", teinte: "bleu" },
  confirmee: { court: "a confirmé", teinte: "vert" },
  declinee: { court: "a dit non", teinte: "rouge" },
  sans_reponse: { court: "n'a pas répondu", teinte: "ambre" },
};

export const lienPassage = (id: string) => `${BASE}/a-faire?passage=${encodeURIComponent(id)}`;
export const lienFiche = (id: string, onglet?: string) => `${BASE}/chantiers/${encodeURIComponent(id)}${onglet ? `?onglet=${onglet}` : ""}`;

/* un passage qui demande quelque chose : une réponse à relancer ou un remplaçant à trouver */
export function phrasePassage(p: Passage | NonNullable<Chantier["prochain_passage"]>, auj: string): Phrase | null {
  const tache = p.tache ? ` (${p.tache.toLowerCase()})` : "";
  const nom = qui(p);
  const jour = quand(p.debut, auj);
  if (p.confirmation === "declinee") return { cle: `p-${p.id}`, teinte: "rouge", texte: `${nom} a dit non pour ${jour}${tache} : trouvez quelqu'un d'autre ou décalez.`, href: lienPassage(p.id) };
  if (p.confirmation === "sans_reponse") return { cle: `p-${p.id}`, teinte: "ambre", texte: `${nom} n'a pas répondu pour ${jour}${tache} : à relancer.`, href: lienPassage(p.id) };
  if (p.confirmation === "demandee") return { cle: `p-${p.id}`, teinte: "bleu", texte: `${nom} : demande envoyée pour ${jour}${tache}, réponse attendue.`, href: lienPassage(p.id) };
  return null;
}

/* ce que le chantier demande, le plus pressé d'abord */
export function phrasesChantier(c: Chantier, t: Tableau | null, auj: string): Phrase[] {
  const r: Phrase[] = [];
  const voitPrix = t ? t.voit_prix : false;
  if (t) {
    for (const k of t.controles.filter((x) => x.gravite === "bloquant")) r.push({ cle: `k-${k.code}-${k.objet_id}`, teinte: "rouge", texte: sansNomDeChantier(k.message, c.nom), href: lienFiche(c.id, "terrain") });
    const mo = c.maitre_ouvrage_nom ?? "le maître d'ouvrage";
    for (const a of t.avenants.filter((x) => x.statut === "soumis"))
      r.push({ cle: `a-${a.id}`, teinte: "ambre", texte: `Avenant n° ${a.numero}${voitPrix && a.montant_ht !== null ? ` de ${montant(a.montant_ht)} HT` : ""} : ${mo} doit le signer avant que les travaux commencent.`, href: `${BASE}/avenants?avenant=${encodeURIComponent(a.id)}` });
    for (const a of t.avenants.filter((x) => x.statut === "brouillon"))
      r.push({ cle: `a-${a.id}`, teinte: "gris", texte: `Avenant n° ${a.numero} à finir de chiffrer : ${a.objet.charAt(0).toLowerCase()}${a.objet.slice(1)}.`, href: `${BASE}/avenants?avenant=${encodeURIComponent(a.id)}` });
    const proches = t.passages.filter((p) => p.statut === "prevu" && ecartJours(p.debut, auj) >= 0 && ecartJours(p.debut, auj) <= 14).sort((a, b) => a.debut.localeCompare(b.debut));
    for (const p of proches) {
      const ph = phrasePassage(p, auj);
      if (ph) r.push(ph);
    }
  } else {
    if ((c.nb_bloquants ?? 0) > 0) r.push({ cle: "bloquants", teinte: "rouge", texte: `${c.nb_bloquants} point${(c.nb_bloquants ?? 0) > 1 ? "s" : ""} empêche${(c.nb_bloquants ?? 0) > 1 ? "nt" : ""} d'avancer.`, href: lienFiche(c.id, "terrain") });
    if ((c.nb_avenants_en_cours ?? 0) > 0) r.push({ cle: "avenants", teinte: "ambre", texte: `${c.nb_avenants_en_cours} avenant${(c.nb_avenants_en_cours ?? 0) > 1 ? "s" : ""} en cours, pas encore signé${(c.nb_avenants_en_cours ?? 0) > 1 ? "s" : ""}.`, href: `${BASE}/avenants` });
    const ph = c.prochain_passage ? phrasePassage(c.prochain_passage, auj) : null;
    if (ph) r.push(ph);
  }
  if (c.statut === "preparation") {
    const debut = c.date_debut ? ` (début prévu ${quand(c.date_debut, auj)})` : "";
    r.push({ cle: "preparation", teinte: "bleu", texte: `Pas encore ouvert${debut} : posez ses lots et son marché, puis ouvrez-le.`, href: lienFiche(c.id) });
  }
  return r;
}

/* la phrase qui résume la ligne : la plus pressée, sinon où en est le chantier */
export function resume(c: Chantier, t: Tableau | null, auj: string): Phrase {
  const ph = phrasesChantier(c, t, auj);
  const urgente = ph.find((p) => p.teinte === "rouge") ?? ph.find((p) => p.teinte === "ambre") ?? ph.find((p) => p.teinte === "bleu");
  if (urgente) return urgente;
  if (c.statut === "ouvert" && c.etape?.lot_libelle) return { cle: "cours", teinte: "vert", texte: `Tout roule. En cours : ${c.etape.lot_libelle.toLowerCase()}, ${c.etape.avancement_pct} %.` };
  if (c.statut === "ouvert") return { cle: "cours", teinte: "vert", texte: "Tout roule." };
  if (c.statut === "suspendu") return { cle: "suspendu", teinte: "ambre", texte: "Chantier suspendu." };
  if (c.statut === "receptionne") return { cle: "fin", teinte: "gris", texte: "Réceptionné." };
  return { cle: "rien", teinte: "gris", texte: "Rien à faire pour l'instant." };
}

/* les messages des contrôles commencent par « <chantier> : » ; dans la fiche du chantier, c'est redondant */
function sansNomDeChantier(message: string, nom: string): string {
  const m = message.startsWith(`${nom} : `) ? message.slice(nom.length + 3) : message;
  return m.charAt(0).toUpperCase() + m.slice(1);
}
