/* ══════════════════════════════════════════════════════════════════════
   CASHD — les textes de l'organisation, côté écran (11/10/2026, session C2)

   En base réelle, les textes viennent de la porte cashd_gabarits (c2_04) :
   ceux de l'organisation, sinon ceux par défaut. Ici : la copie des textes
   par défaut en français (mode exemple), les règles que la porte
   cashd_ecrire_gabarit applique (variables connues, variables
   obligatoires), et un aperçu rempli sur un exemple.
   ══════════════════════════════════════════════════════════════════════ */

import type { CleGabarit, Gabarit } from "./types";

export const PALIERS_GABARIT: { cle: CleGabarit; libelle: string; variantes: number }[] = [
  { cle: "echeance", libelle: "Rappel du jour d'échéance", variantes: 3 },
  { cle: "rappel", libelle: "Rappel courtois", variantes: 3 },
  { cle: "relance", libelle: "Relance ferme", variantes: 3 },
  { cle: "mise_en_demeure", libelle: "Mise en demeure", variantes: 1 },
  { cle: "devis_rappel", libelle: "Rappel du devis", variantes: 3 },
  { cle: "devis_relance", libelle: "Relance du devis", variantes: 3 },
];

export const VARIABLES: Record<string, string> = {
  bonjour: "la salutation, avec le nom du contact de facturation",
  emetteur: "le nom de votre entité",
  compte: "la référence du compte, et son secteur",
  lignes: "le détail des pièces : numéro, date, montant, échéance, retard, reste dû (obligatoire)",
  total: "le total dû",
  limite: "la date limite de règlement",
  delai: "le délai de la mise en demeure, en jours",
  nb: "le nombre de pièces",
  numero: "le numéro de la première pièce",
  retard_max: "le plus long retard, en jours",
  objet: "l'objet court : « facture F-12 échue », « 3 factures échues »",
  dues: "« la somme suivante reste due », « les sommes suivantes restent dues »… (accordé au nombre)",
  oubli: "au rappel, la phrase qui suit l'ancienneté du retard : « simple oubli » jusqu'à 15 jours (si le client paie d'habitude à l'heure), « ce retard dure depuis N jours » ensuite, « ce retard devient important » au-delà de 45 jours (paliers réglables)",
  ton_montant: "au-delà du seuil de ton, la demande de la date de règlement prévue, sinon rien",
  droits: "les pénalités et l'indemnité forfaitaire dues, quand il y en a",
  reglement: "vos moyens de règlement, et la proposition d'échelonnement au-delà du seuil réglé",
  devis_suite: "la fin d'une relance de devis, au vocabulaire de votre métier",
  cette_facture: "« cette facture » ou « ces factures », accordé au nombre de pièces",
  ce_message: "« ce courriel » ou « ce courrier », selon le canal (courriel, ou lettre recommandée)",
};

const OBLIGATOIRES: Record<CleGabarit, string[]> = {
  echeance: ["lignes"],
  rappel: ["lignes"],
  relance: ["lignes", "total"],
  mise_en_demeure: ["lignes", "total"],
  devis_rappel: ["lignes"],
  devis_relance: ["lignes"],
};

/* Ce que la porte refuserait, dit avant d'envoyer. */
export function verifier(cle: CleGabarit, sujet: string, corps: string, variables: Record<string, string> = VARIABLES): string | null {
  if (!sujet.trim() || !corps.trim()) return "Un texte a un objet et un corps.";
  const inconnues = [...new Set([...`${sujet} ${corps}`.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((v) => !(v in variables)))];
  if (inconnues.length) return `Variable inconnue : ${inconnues.map((v) => `{${v}}`).join(", ")}.`;
  const manque = OBLIGATOIRES[cle].filter((v) => !corps.includes(`{${v}}`));
  if (manque.length) return `Ce palier exige dans le corps : ${manque.map((v) => `{${v}}`).join(", ")}.`;
  /* c2_35 : une mise en demeure porte son délai — {limite} ou {delai} */
  if (cle === "mise_en_demeure" && !corps.includes("{limite}") && !corps.includes("{delai}")) return "Ce palier exige dans le corps : {limite} ou {delai}.";
  return null;
}

/* Les textes par défaut, en français : la copie de private.cashd_gabarit_defaut (c2_04). */
const D = (cle: CleGabarit, variante: number, sujet: string, corps: string): Gabarit => ({
  cle, langue: "fr", variante, personnalise: false, sujet, corps, defaut_sujet: sujet, defaut_corps: corps, maj_le: null,
});
export const GABARITS_EXEMPLE: Gabarit[] = [
  D("echeance", 1, "{emetteur} — {objet} : échéance du jour",
    "{bonjour}\n\nPetit rappel : {dues} aujourd'hui sur votre compte {compte} :\n{lignes}\n{ton_montant}Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur {cette_facture}, il vous suffit de répondre à ce courriel.\n{reglement}"),
  D("echeance", 2, "{emetteur} — {objet}, à régler aujourd'hui",
    "{bonjour}\n\nNous nous permettons de vous signaler que {dues} ce jour (compte {compte}) :\n{lignes}\n{ton_montant}Si vous avez déjà procédé au règlement, nos messages se sont simplement croisés. Une question ? Répondez simplement à ce courriel.\n{reglement}"),
  D("rappel", 1, "{emetteur} — rappel : {objet}",
    "{bonjour}\n\nSauf erreur de notre part, {dues} sur votre compte {compte} :\n{lignes}\n{ton_montant}{oubli}Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur {cette_facture}, il vous suffit de répondre à ce courriel.\n{reglement}"),
  D("rappel", 2, "{emetteur} — {objet}, pour rappel",
    "{bonjour}\n\nNous revenons vers vous au sujet de votre compte {compte}. À ce jour, {dues} :\n{lignes}\n{ton_montant}{oubli}Si vous avez déjà réglé, nos messages se sont simplement croisés et vous pouvez ignorer celui-ci. Une question ? Répondez simplement à ce courriel.\n{reglement}"),
  D("relance", 1, "{emetteur} — relance : {total} restent dus",
    "{bonjour}\n\nMalgré notre précédent rappel, {dues} sur votre compte {compte} :\n{lignes}\nTotal restant dû : {total}. Nous vous remercions de procéder au règlement au plus tard le {limite}.\n{ton_montant}{droits}Si vous contestez tout ou partie de ces montants, merci de nous l'écrire pour que nous l'examinions.\n{reglement}"),
  D("relance", 2, "{emetteur} — {total} restent à régler",
    "{bonjour}\n\nNotre premier rappel est resté sans suite, et {dues} sur votre compte {compte} :\n{lignes}\nLe total dû s'élève à {total}. Merci de le régler au plus tard le {limite}.\n{ton_montant}{droits}Si une partie de ces montants vous paraît contestable, écrivez-nous : nous l'examinerons.\n{reglement}"),
  D("mise_en_demeure", 1, "{emetteur} — mise en demeure de payer {total}",
    "{bonjour}\n\nMalgré nos précédentes relances, les sommes suivantes restent impayées (compte {compte}) :\n{lignes}\nPar la présente, nous vous mettons en demeure de régler la somme de {total} dans un délai de {delai} jours à compter de la réception de {ce_message}.\n{reglement}{droits}À défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.\n"),
  D("devis_rappel", 1, "{emetteur} — votre devis{objet}", "{bonjour}\n\nNous vous avons adressé {dues} (compte {compte}) :\n{lignes}{devis_suite}"),
  D("devis_rappel", 2, "{emetteur} — suite à notre devis{objet}",
    "{bonjour}\n\nNous nous permettons de revenir vers vous : nous vous avons adressé {dues} (compte {compte}), et nous n'avons pas encore eu votre retour.\n{lignes}{devis_suite}"),
  D("devis_relance", 1, "{emetteur} — votre devis{objet}", "{bonjour}\n\nNous vous avons adressé {dues} (compte {compte}) :\n{lignes}{devis_suite}"),
  D("devis_relance", 2, "{emetteur} — suite à notre devis{objet}",
    "{bonjour}\n\nNous nous permettons de revenir vers vous : nous vous avons adressé {dues} (compte {compte}), et nous n'avons pas encore eu votre retour.\n{lignes}{devis_suite}"),
];

const SUITES: Record<string, string> = {
  "general:devis_rappel": "\nAvez-vous des questions, ou souhaitez-vous que nous l'ajustions ? Nous en parlerons volontiers.\n",
  "general:devis_relance": "\nVotre réponse nous permettrait de planifier les travaux. Si le projet a changé, un mot suffit pour nous le dire.\n",
  "btp:devis_rappel": "\nAvez-vous des questions sur le chantier, ou souhaitez-vous que nous passions voir les lieux pour ajuster le devis ? Nous pouvons aussi caler dès maintenant une date d'intervention.\n",
  "btp:devis_relance": "\nVotre accord nous permettrait de réserver une date d'intervention dans notre planning de chantiers. Si le projet a changé, un mot suffit pour nous le dire.\n",
};

/* Un aperçu rempli sur un exemple (la SCI Lefèvre, une facture de 12 000 € en retard de 45 jours). */
export function apercu(
  cle: CleGabarit,
  sujet: string,
  corps: string,
  r: { metier?: string; seuil_ton?: number | null; moyens_reglement?: string | null; echelonnement_des?: number | null; emetteur?: string; ton_retard_jours?: number | null; ton_retard_important_jours?: number | null },
): { sujet: string; corps: string } {
  const devis = cle.startsWith("devis");
  const ech = cle === "echeance";
  const total = 12000;
  let reglement = "";
  /* c2_36 : les moyens de règlement, mise en demeure comprise */
  if ((ech || cle === "rappel" || cle === "relance" || cle === "mise_en_demeure") && r.moyens_reglement) reglement += `Vous pouvez régler ${r.moyens_reglement.replace(/[.\s]+$/, "")}.\n`;
  if (ech || cle === "rappel" || cle === "relance") {
    if (r.echelonnement_des !== null && r.echelonnement_des !== undefined && total >= r.echelonnement_des) reglement += "Si un règlement en plusieurs fois vous aide, répondez-nous : nous pouvons convenir d'un échéancier.\n";
  }
  /* c2_33 : 1 500 € par défaut, tant que l'organisation n'a pas posé son seuil */
  const ton = (ech || cle === "rappel" || cle === "relance") && total >= (r.seuil_ton ?? 1500)
    ? "Compte tenu du montant en jeu, merci de nous indiquer dès à présent la date de règlement prévue. " : "";
  const v: Record<string, string> = {
    bonjour: "Bonjour Mme Lefèvre,",
    cette_facture: "cette facture",
    ce_message: "ce courriel",
    emetteur: r.emetteur ?? "Atelier Bertin",
    compte: "C-LEFEVRE, secteur Immobilier",
    lignes: devis
      ? "  • Devis D-2026-033 du 01/10/2026 : 4 800,00 €\n"
      : ech
        ? "  • Facture F-2026-101 du 27/07/2026, 12 000,00 € TTC, à régler le 26/08/2026 : 12 000,00 €\n"
        : "  • Facture F-2026-101 du 27/07/2026, 12 000,00 € TTC, échue le 26/08/2026 (45 jours de retard) : 12 000,00 € restant dus\n",
    total: devis ? "4 800,00 €" : "12 000,00 €",
    limite: "19 octobre 2026",
    delai: "8",
    nb: "1",
    numero: devis ? "D-2026-033" : "F-2026-101",
    retard_max: ech ? "0" : "45",
    objet: devis ? " D-2026-033" : ech ? "facture F-2026-101" : "facture F-2026-101 échue",
    dues: ech ? "la facture suivante arrive à échéance" : cle === "rappel" ? "la somme suivante reste due" : cle === "relance" ? "la somme suivante reste impayée" : devis ? "le devis suivant" : "les sommes suivantes restent dues",
    /* c2_30 : le ton suit l'ancienneté du retard (l'exemple a 45 jours de retard) */
    oubli: cle !== "rappel" ? ""
      : 45 > (r.ton_retard_important_jours ?? 45) ? `Ce retard de 45 jours devient important${ton ? ". " : " : merci de nous indiquer dès à présent la date de règlement prévue. "}`
      : 45 > (r.ton_retard_jours ?? 15) ? "Ce retard dure maintenant depuis 45 jours. "
      : !ton ? "Il s'agit sans doute d'un simple oubli. " : "",
    ton_montant: ton,
    droits: cle === "relance"
      ? "Nous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture et des pénalités de retard (Code de commerce, art. L441-10).\n"
      : cle === "mise_en_demeure"
        ? "En application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard (179,75 € à ce jour) et une indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture (40,00 € au total).\n"
        : "",
    reglement,
    devis_suite: devis ? SUITES[`${r.metier === "btp" ? "btp" : "general"}:${cle}`] ?? "" : "",
  };
  const rendre = (t: string) => t.replace(/\{([a-z_]+)\}/g, (m, k: string) => (k in v ? v[k] : m));
  return { sujet: rendre(sujet), corps: rendre(corps) };
}
