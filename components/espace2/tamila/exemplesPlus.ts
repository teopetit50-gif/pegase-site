/* ══════════════════════════════════════════════════════════════════════
   TAMILA — dix dossiers d'exemple de plus (02/11/2026, refonte des pages)

   La preuve 1:1 se fait « avec un contenu de même longueur que la
   référence » (docs/refonte-metiers/cloud/COMMUN.md § 3.4) : My issues
   montre 17 lignes, Accounts 13 comptes à l'écran, Tasks 16 tâches. Les
   six dossiers de components/espace/tamila/exemples.ts ne remplissent
   pas ces listes ; ceux-ci s'y ajoutent, dans l'espace 2 seulement
   (l'écran d'avant, sous « ?ancien=1 », garde ses six dossiers).

   Mêmes conventions que exemples.ts : identifiants 0000…, rien n'est
   écrit en base, dates relatives au jour de la visite.
   ══════════════════════════════════════════════════════════════════════ */

import { dans, ilYa } from "@/components/espace/exemples/socle";
import { DOSSIERS_EXEMPLE, HADDAD, MOI, ROUSSEAU } from "@/components/espace/tamila/exemples";
import { EXEMPLE as AVIS_ENTRANTS_EXEMPLE } from "@/components/espace/tamila/AvisEntrantsTamila";
import type { AvisEntrant } from "@/components/espace/tamila/portes";
import type { Audience, Delai, DossierComplet, Honoraires } from "@/components/espace/tamila/types";

const BASE = DOSSIERS_EXEMPLE[0];
const BASE_DELAI = BASE.delais[1];
const BASE_AUDIENCE = BASE.audiences[1];
const jour = (iso: string) => iso.slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-00000000d0${n.toString(16).padStart(2, "0")}`;

type Plus = {
  n: number;
  reference: string;
  intitule: string;
  matiere: string;
  juridiction: string;
  responsable: string;
  ouvert: number;
  statut?: DossierComplet["dossier"]["statut"];
  delais?: { acte: Delai["acte"]; dans: number; statut?: Delai["statut"]; regle?: string; cree: number }[];
  audiences?: { dans: number; nature: Audience["nature"]; heure?: number }[];
};

const PLUS: Plus[] = [
  { n: 0x10, reference: "2026-0441", intitule: "Bouchard c/ Société Générale", matiere: "bancaire", juridiction: "Cour d'appel de Paris", responsable: MOI, ouvert: 12,
    delais: [{ acte: "conclure", dans: 1, statut: "a_confirmer", cree: 12 }], audiences: [{ dans: 9, nature: "mise_en_etat", heure: 10 }] },
  { n: 0x11, reference: "2026-0436", intitule: "Transports Vidal c/ Groupama", matiere: "assurances", juridiction: "Cour d'appel de Lyon", responsable: HADDAD, ouvert: 18,
    delais: [{ acte: "signifier_declaration", dans: -2, regle: "tamila.cpc.902", cree: 18 }] },
  { n: 0x12, reference: "2026-0425", intitule: "Mme Laurent c/ Clinique des Lilas", matiere: "sante", juridiction: "Cour d'appel de Versailles", responsable: ROUSSEAU, ouvert: 26,
    delais: [{ acte: "conclure", dans: 3, regle: "tamila.cpc.909", cree: 26 }], audiences: [{ dans: 20, nature: "plaidoiries", heure: 14 }] },
  { n: 0x13, reference: "2026-0419", intitule: "SARL Horizon c/ Copropriété Le Parc", matiere: "copropriete", juridiction: "Cour d'appel de Paris", responsable: MOI, ouvert: 31,
    delais: [{ acte: "conclure", dans: 5, cree: 31 }, { acte: "signifier_conclusions", dans: 16, cree: 6 }] },
  { n: 0x14, reference: "2026-0407", intitule: "Durand c/ Pôle emploi (licenciement)", matiere: "prud_hommes", juridiction: "Cour d'appel de Rouen", responsable: ROUSSEAU, ouvert: 40,
    delais: [{ acte: "conclure", dans: 7, cree: 40 }] },
  { n: 0x15, reference: "2026-0395", intitule: "Banque Populaire c/ Époux Martin", matiere: "recouvrement", juridiction: "Cour d'appel de Douai", responsable: HADDAD, ouvert: 48,
    delais: [{ acte: "conclure", dans: 8, regle: "tamila.cpc.909", cree: 48 }], audiences: [{ dans: 18, nature: "mise_en_etat", heure: 9 }] },
  { n: 0x16, reference: "2026-0388", intitule: "Indivision Perrin — partage judiciaire", matiere: "successions", juridiction: "Cour d'appel de Bordeaux", responsable: MOI, ouvert: 55,
    delais: [{ acte: "autre", dans: 10, cree: 9 }] },
  { n: 0x17, reference: "2026-0371", intitule: "Atelier Roux c/ Leroy Construction", matiere: "construction", juridiction: "Cour d'appel de Nîmes", responsable: ROUSSEAU, ouvert: 63,
    delais: [{ acte: "conclure", dans: 17, cree: 63 }] },
  { n: 0x18, reference: "2026-0362", intitule: "M. Petit c/ SCI Les Acacias (bail)", matiere: "baux", juridiction: "Cour d'appel de Paris", responsable: HADDAD, ouvert: 70,
    delais: [{ acte: "conclure", dans: 19, cree: 3 }], audiences: [{ dans: 22, nature: "plaidoiries", heure: 13 }] },
  { n: 0x19, reference: "2026-0350", intitule: "Fabre c/ Fabre — prestation compensatoire", matiere: "famille", juridiction: "Cour d'appel de Montpellier", responsable: MOI, ouvert: 82,
    delais: [{ acte: "conclure", dans: 24, cree: 82 }] },
];

export const DOSSIERS_PLUS: DossierComplet[] = PLUS.map((p) => {
  const d = id(p.n);
  return {
    ...BASE,
    dossier: { ...BASE.dossier, id: d, statut: p.statut ?? "ouvert", matiere: p.matiere, juridiction: p.juridiction, responsable_id: p.responsable, cree_le: ilYa(p.ouvert), ouvert_le: ilYa(p.ouvert) },
    clair: { reference: p.reference, intitule: p.intitule, numero_rg: `26/0${(p.n * 37) % 900 + 100}` },
    cle: null,
    parties: [],
    partiesClair: {},
    appel: { ...BASE.appel!, id: `${d}-a`, dossier_id: d },
    delais: (p.delais ?? []).map((t, i) => ({
      ...BASE_DELAI,
      id: `${d}-t${i + 1}`,
      dossier_id: d,
      appel_id: `${d}-a`,
      acte: t.acte,
      regle_code: t.acte === "autre" ? null : (t.regle ?? "tamila.cpc.908"),
      nature: t.acte === "autre" ? ("date_fixee" as const) : ("regle" as const),
      residence: "metropole" as const,
      augmentation_mois: 0,
      motif_augmentation: "aucune",
      echeance_calculee: jour(dans(t.dans)),
      echeance_retenue: jour(dans(t.dans)),
      statut: t.statut ?? "confirme",
      confirme_par: t.statut === "a_confirmer" ? null : p.responsable,
      confirme_le: t.statut === "a_confirmer" ? null : ilYa(t.cree - 1 > 0 ? t.cree - 1 : 0),
      demande_id: null,
      responsable_id: p.responsable,
      cree_le: ilYa(t.cree),
      maj_le: ilYa(t.cree),
    })),
    audiences: (p.audiences ?? []).map((a, i) => ({ ...BASE_AUDIENCE, id: `${d}-au${i + 1}`, dossier_id: d, date_heure: dans(a.dans, a.heure ?? 9), nature: a.nature, juridiction: p.juridiction, avocat_id: p.responsable, cree_le: ilYa(4 + i) })),
    avis: [],
    membres: [{ ...BASE.membres[0], id: `${d}-m1`, dossier_id: d, user_id: p.responsable }],
    murailles: [],
    exports: [],
    pieces: [],
    lectures: [],
    demandes: [],
    consulteJusqu: null,
  };
});

/* Les honoraires des dossiers de plus : une convention (temps passé ou forfait), du temps saisi, parfois une
   facture ; de quoi remplir le tableau « Honoraires du cabinet » comme la liste Accounts de Plain. */
export function honorairesPlus(dossier: string): Honoraires | null {
  const i = DOSSIERS_PLUS.findIndex((c) => c.dossier.id === dossier);
  if (i < 0) return null;
  const c = DOSSIERS_PLUS[i];
  const forfait = i % 3 === 1;
  const signee = i % 4 !== 3;
  const convention = {
    id: `${dossier}-hc`, client_id: c.dossier.client_id, dossier_id: dossier, mode: forfait ? ("forfait" as const) : ("temps_passe" as const),
    taux_horaire_cents: forfait ? null : 22000 + (i % 3) * 3000, forfait_cents: forfait ? 250000 + i * 10000 : null, complement_resultat_pct: null, taux_tva: 20,
    urgence: false, statut: signee ? ("signee" as const) : ("proposee" as const), signee_le: signee ? jour(ilYa(10 + i)) : null, piece_id: null, cree_par: MOI, cree_le: ilYa(12 + i), resiliee_le: null,
    minutes_prevues: forfait ? 900 : undefined,
  };
  const temps = Array.from({ length: 2 + (i % 3) }, (_, k) => ({
    id: `${dossier}-h${k + 1}`, client_id: c.dossier.client_id, dossier_id: dossier, user_id: k % 2 ? ROUSSEAU : c.dossier.responsable_id ?? MOI, jour: jour(ilYa(2 + k * 4 + i)),
    minutes: 45 + ((i + k) % 4) * 60, nature: (["redaction", "recherche", "rendez_vous", "audience"] as const)[(i + k) % 4], description_chiffree: null, facturable: true,
    statut: "saisi" as const, facture_id: null, cree_le: ilYa(2 + k * 4 + i),
  }));
  const impayee = i % 4 === 0;
  const factures = impayee
    ? [{
        id: `${dossier}-hf1`, client_id: c.dossier.client_id, dossier_id: dossier, numero: `H-2026-0000${30 + i}`, nature: "facture" as const, emise_le: jour(ilYa(34 + i)), jusqu_au: jour(ilYa(34 + i)), minutes: 180,
        honoraires_temps_cents: 66000, forfait_cents: 0, debours_cents: 0, total_ht_cents: 66000, taux_tva: 20, tva_cents: 13200, total_ttc_cents: 79200,
        provisions_imputees_cents: 0, reste_du_cents: 79200, statut: "emise" as const, payee_le: null, mode_reglement: null, motif_annulation: null, emise_par: MOI, cree_le: ilYa(34 + i),
      }]
    : [];
  return { convention, conventions: [convention], temps, provisions: [], factures };
}

/* ——— les avis RPVA reçus par courriel, en exemple (la file de Triage de Linear en montre 16) : les deux de
   l'écran d'avant, plus quatorze qui citent le n° RG des dossiers ci-dessus ou n'en citent aucun ——— */

const AVIS: [string, string, string, number, number][] = [
  ["Cour d'appel de Paris — Ordonnance du conseiller de la mise en état", "rpva_ordonnance_mee", "2026-0441", 3, 1],
  ["Cour d'appel de Lyon — Avis de déclaration d'appel", "rpva_declaration_appel", "2026-0436", 5, 1],
  ["Cour d'appel de Versailles — Notification de conclusions d'intimé", "rpva_conclusions", "2026-0425", 7, 2],
  ["Cour d'appel de Paris — Avis de fixation à bref délai", "rpva_avis_fixation", "2026-0419", 9, 1],
  ["Cour d'appel de Rouen — Accusé de dépôt de conclusions", "rpva_accuse_depot", "2026-0407", 11, 1],
  ["Cour d'appel de Douai — Avis de renvoi de l'audience", "rpva_avis_fixation", "2026-0395", 20, 1],
  ["Cour d'appel de Bordeaux — Ordonnance de clôture", "rpva_ordonnance_mee", "2026-0388", 26, 1],
  ["Cour d'appel de Nîmes — Notification de conclusions d'appelant", "rpva_conclusions", "2026-0371", 30, 3],
  ["Cour d'appel de Paris — Avis de fixation de plaidoiries", "rpva_avis_fixation", "2026-0362", 34, 1],
  ["Cour d'appel de Montpellier — Accusé de dépôt de la déclaration", "rpva_accuse_depot", "2026-0350", 41, 1],
  ["Notification e-barreau : message du greffe", "", "", 48, 0],
  ["Cour d'appel de Lyon — Avis de constitution du confrère adverse", "rpva_conclusions", "2026-0436", 52, 1],
  ["Cour d'appel de Versailles — Ordonnance d'injonction de rencontrer un médiateur", "rpva_ordonnance_mee", "2026-0425", 70, 2],
  ["Cour d'appel de Paris — Avis de radiation", "", "", 96, 1],
];

export const AVIS_ENTRANTS_PLUS: AvisEntrant[] = [
  ...AVIS_ENTRANTS_EXEMPLE,
  ...AVIS.map(([sujet, type, ref, heures, pieces], i): AvisEntrant => {
    const d = DOSSIERS_PLUS.find((c) => c.clair?.reference === ref);
    const rg = d?.clair?.numero_rg;
    return {
      id: `00000000-0000-4000-8000-0000000000${(0xf0 + i).toString(16)}`, reception_id: 10 + i, recu_le: new Date(Date.now() - heures * 3600_000).toISOString(), type_suppose: type || null,
      nb_pieces: pieces, statut: "a_rattacher", expire_le: new Date(Date.now() + 7 * 86_400_000 - heures * 3600_000).toISOString(),
      reception: {
        sujet: rg ? `${sujet} — RG ${rg}` : sujet,
        corps: rg ? `${sujet}. Affaire enrôlée sous le n° RG ${rg}. Le présent avis vaut notification ; la pièce est jointe au format PDF.` : `${sujet}. Aucun numéro de rôle n'est cité dans ce message.`,
        de_nom: "e-barreau", de_adresse: "notification@e-barreau.fr",
        pieces: Array.from({ length: pieces }, (_, k) => ({ nom: `avis-${10 + i}-${k + 1}.pdf`, mime: "application/pdf", taille: 40_000 + k * 9_000, chemin: "exemple" })),
      },
    };
  }),
];
