/* ══════════════════════════════════════════════════════════════════════
   DALIRO — l'approvisionnement de toute l'entreprise (02/11/2026)

   Les règles sont celles de la carte d'un chantier (components/espace/
   daliro/ApproCarte.tsx, b6_22 et b6_23), reprises ici sans toucher à la
   carte : « livrer avant » = le jour ouvré qui précède le début du passage,
   « commander avant » = moins le délai du fournisseur (jours ouvrés). En
   base, private.btp_echeances_commande les calcule et btp_appro_chantier
   les rend ; sur l'exemple, `echeances` fait le même calcul en mémoire.

   Chaque commande devient une tâche de la page (copie des Tasks de Plain) :
   un onglet par moment (à commander, à livrer, reçu), une phrase
   d'échéance à la place de l'identifiant TASK-n, le chantier dans la
   pastille du compte, le fournisseur dans l'avatar.
   ══════════════════════════════════════════════════════════════════════ */

import { aujourdHui } from "@/components/espace/exemples/socle";
import { jourOuvre } from "@/components/espace/daliro/recalage";
import type { Commande, EtatCommande, Tableau } from "@/components/espace/daliro/types";

export type CommandeBrute = Omit<Commande, "echeances">;
export type Onglet = "commander" | "livrer" | "recu";

const plus = (iso: string, n: number) => {
  const [a, m, j] = iso.split("-").map(Number);
  const d = new Date(a, m - 1, j + n);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};
export function decalerOuvres(iso: string, n: number): string {
  let v = iso;
  let reste = Math.abs(n);
  const pas = n < 0 ? -1 : 1;
  while (reste > 0) {
    v = plus(v, pas);
    if (jourOuvre(v)) reste--;
  }
  return v;
}

/* Les échéances, comme private.btp_echeances_commande (b6_23) et ApproCarte. */
export function echeances(k: CommandeBrute, tableau: Tableau | null, jour: string): Commande["echeances"] {
  const p = k.passage_id ? tableau?.passages.find((x) => x.id === k.passage_id && x.statut !== "annule") : null;
  const besoin = p?.debut ?? k.besoin_le;
  const livrer = besoin ? decalerOuvres(besoin, -1) : null;
  const commander = livrer ? decalerOuvres(livrer, -k.delai_jours) : null;
  const recus = (k.livraisons ?? []).filter((l) => l.quantite !== null);
  const livre = recus.length ? recus.reduce((t, l) => t + (l.quantite ?? 0), 0) : null;
  const etat: EtatCommande =
    k.statut === "livree" || k.statut === "annulee"
      ? k.statut
      : k.statut === "a_commander" && commander && commander < jour
        ? "commande_en_retard"
        : k.statut === "a_commander" && commander && commander <= decalerOuvres(jour, 2)
          ? "a_commander_vite"
          : k.statut === "a_commander"
            ? "a_commander"
            : k.statut === "livree_partielle"
              ? "livree_partielle"
              : k.livraison_prevue && k.livraison_prevue < jour
                ? "livraison_attendue"
                : livrer && k.livraison_prevue && k.livraison_prevue > livrer
                  ? "livraison_tardive"
                  : livrer && k.livraison_prevue && k.livraison_prevue < decalerOuvres(livrer, -5)
                    ? "livraison_trop_tot"
                    : k.statut;
  const retourPrevu = k.a_retourner ? (k.retour_prevu ?? (p ? decalerOuvres(p.fin, 1) : null)) : null;
  const retour = !k.a_retourner ? null : k.retourne_le ? "rendu" : k.statut !== "livree" && k.statut !== "livree_partielle" ? null : retourPrevu && retourPrevu < jour ? "a_rendre" : "sur_chantier";
  return {
    besoin_le: besoin,
    livrer_avant: livrer,
    livrer_le: livrer,
    commander_avant: commander,
    etat,
    quantite_commandee: k.quantite ?? null,
    quantite_livree: livre,
    ecart: k.quantite != null && livre !== null ? livre - k.quantite : null,
    retour_prevu: retourPrevu,
    retour,
  };
}

export const UNITES: Record<string, string> = { m2: "m²", m3: "m³", ml: "m" };
export const qte = (v: number | null | undefined, u: string | null | undefined) => (v == null ? "" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(v)} ${u ? (UNITES[u] ?? u) : ""}`.trim());

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export const jour = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]}`;
};

export const LIBELLES: Record<EtatCommande, string> = {
  a_commander: "À commander",
  a_commander_vite: "À commander vite",
  commande_en_retard: "Commande en retard",
  commandee: "Commandée",
  livraison_tardive: "Livraison trop tardive",
  livraison_trop_tot: "Livrée trop tôt : stockage",
  livraison_attendue: "Livraison attendue",
  livree_partielle: "Livrée en partie",
  livree: "Livrée",
  annulee: "Annulée",
};

export const ongletDe = (k: Commande): Onglet | null => (k.statut === "annulee" ? null : k.statut === "a_commander" ? "commander" : k.statut === "livree" ? "recu" : "livrer");

/* ce qui reste à faire sur une commande reçue : du matériel à rendre, un bon qui ne colle pas */
export const resteAFaire = (k: Commande) => k.statut !== "livree" || k.echeances.retour === "a_rendre" || k.echeances.retour === "sur_chantier" || (k.echeances.ecart != null && k.echeances.ecart !== 0);

/* La phrase d'échéance (à la place de « TASK-n »), la date qui sert au tri, le rang d'urgence. */
export function echeance(k: Commande, auj: string): { phrase: string; date: string; rang: number } {
  const e = k.echeances;
  const manque = e.ecart != null && e.ecart < 0 ? qte(-e.ecart, k.unite) : null;
  switch (e.etat) {
    case "commande_en_retard":
      return { phrase: `En retard depuis le ${jour(e.commander_avant)}`, date: e.commander_avant ?? auj, rang: 0 };
    case "a_commander_vite":
      return { phrase: `Commander avant le ${jour(e.commander_avant)}`, date: e.commander_avant ?? auj, rang: 1 };
    case "a_commander":
      return { phrase: e.commander_avant ? `Commander avant le ${jour(e.commander_avant)}` : "Sans date de besoin", date: e.commander_avant ?? "9999", rang: 3 };
    case "livraison_attendue":
      return { phrase: `Attendue depuis le ${jour(k.livraison_prevue)}`, date: k.livraison_prevue ?? auj, rang: 0 };
    case "livraison_tardive":
      return { phrase: `Promise le ${jour(k.livraison_prevue)}, à décaler`, date: k.livraison_prevue ?? auj, rang: 1 };
    case "livraison_trop_tot":
      return { phrase: `Promise le ${jour(k.livraison_prevue)}, trop tôt`, date: k.livraison_prevue ?? auj, rang: 2 };
    case "livree_partielle":
      return { phrase: manque ? `Manque ${manque} au bon` : "Reçue en partie", date: k.livree_le ?? auj, rang: 1 };
    case "commandee":
      return { phrase: `Livraison le ${jour(k.livraison_prevue)}`, date: k.livraison_prevue ?? "9999", rang: 3 };
    default:
      if (e.retour === "a_rendre") return { phrase: `À rendre depuis le ${jour(e.retour_prevu)}`, date: e.retour_prevu ?? auj, rang: 0 };
      if (e.retour === "sur_chantier") return { phrase: `À rendre le ${jour(e.retour_prevu)}`, date: e.retour_prevu ?? auj, rang: 2 };
      if (e.ecart != null && e.ecart > 0) return { phrase: `Excédent de ${qte(e.ecart, k.unite)}`, date: k.livree_le ?? auj, rang: 2 };
      if (e.retour === "rendu") return { phrase: `Rendue le ${jour(k.retourne_le)}`, date: k.retourne_le ?? auj, rang: 4 };
      return { phrase: `Reçue le ${jour(k.livree_le)}`, date: k.livree_le ?? auj, rang: 4 };
  }
}

/* ——— l'exemple : des commandes sur les chantiers d'exemple, à tous les moments ——— */

/* 04/11 — des identifiants fixes : une adresse ?commande= copiée se rouvre (ils changeaient à chaque chargement) */
const idFixe = (genre: "c" | "l", i: number) => `00000000-0000-4000-8${genre === "c" ? "d1" : "d2"}0-${String(i + 1).padStart(12, "0")}`;

/** pour : la tâche du passage qui attend la livraison (04/11, promesse DALIRO n° 15 — les fenêtres vont à « Pose des fenêtres ») */
type Modele = { objet: string; pour?: RegExp; fournisseur: string; quantite: number | null; unite: string | null; delai: number; cas: "commander" | "commandee" | "tardive" | "attendue" | "partielle" | "recue" | "location" | "rendue" };
const MODELES: Modele[] = [
  { objet: "Garde-corps acier, balcons R+3", pour: /Pose des garde-corps/i, fournisseur: "Serrurerie Dumont", quantite: 12, unite: "ml", delai: 8, cas: "commander" },
  { objet: "Plaques de plâtre BA13 hydro", pour: /Ossatures|plaques/i, fournisseur: "Point P Lyon 3", quantite: 64, unite: "u", delai: 3, cas: "commander" },
  { objet: "Blocs-portes isoplanes 83 cm", pour: /blocs-portes/i, fournisseur: "Menuiseries Rhône-Alpes", quantite: 9, unite: "u", delai: 10, cas: "commander" },
  { objet: "Câble R2V 3G2,5 en couronne", pour: /gaines|tableau/i, fournisseur: "Rexel Villeurbanne", quantite: 300, unite: "ml", delai: 2, cas: "commander" },
  { objet: "Plan de travail stratifié sur mesure", pour: /comptoirs/i, fournisseur: "Agencements Berthier", quantite: 4, unite: "u", delai: 12, cas: "commander" },
  { objet: "Lames de terrasse en pin traité", pour: /Lames de terrasse/i, fournisseur: "Bois & Matériaux Gerland", quantite: 48, unite: "m2", delai: 6, cas: "commander" },
  { objet: "Projecteurs LED 100 W étanches", pour: /Projecteurs/i, fournisseur: "Rexel Villeurbanne", quantite: 8, unite: "u", delai: 4, cas: "commander" },
  { objet: "Platines d'ancrage galvanisées", pour: /platines/i, fournisseur: "Serrurerie Dumont", quantite: 24, unite: "u", delai: 5, cas: "commander" },
  { objet: "Enduit de lissage en sac de 25 kg", pour: /enduits/i, fournisseur: "Point P Lyon 3", quantite: 30, unite: "u", delai: 2, cas: "commander" },
  { objet: "Peinture glycéro pour menuiseries", pour: /Peinture/i, fournisseur: "Tollens Lyon Est", quantite: 40, unite: "l", delai: 3, cas: "commander" },
  { objet: "Tableau électrique 4 rangées équipé", pour: /tableau/i, fournisseur: "Rexel Villeurbanne", quantite: 1, unite: "u", delai: 7, cas: "commander" },
  { objet: "Poutres lamellé-collé 8 m", pour: /charpente/i, fournisseur: "Charpentes du Lyonnais", quantite: 6, unite: "u", delai: 15, cas: "commander" },
  { objet: "Rubans LED 24 V pour vitrines", pour: /Rubans LED/i, fournisseur: "Rexel Villeurbanne", quantite: 18, unite: "ml", delai: 3, cas: "commander" },
  { objet: "Plots réglables pour terrasse", pour: /plots/i, fournisseur: "Bois & Matériaux Gerland", quantite: 120, unite: "u", delai: 4, cas: "commander" },
  { objet: "Silicone sanitaire translucide", pour: /Faïence/i, fournisseur: "Point P Lyon 3", quantite: 24, unite: "u", delai: 1, cas: "commander" },
  { objet: "Fenêtres PVC sur mesure", pour: /Pose des fenêtres/i, fournisseur: "Menuiseries Rhône-Alpes", quantite: 14, unite: "u", delai: 15, cas: "commandee" },
  { objet: "Gaines ICTA 20 mm", pour: /gaines/i, fournisseur: "Rexel Villeurbanne", quantite: 200, unite: "ml", delai: 2, cas: "attendue" },
  { objet: "Comptoirs en chêne massif", pour: /comptoirs/i, fournisseur: "Agencements Berthier", quantite: 2, unite: "u", delai: 20, cas: "tardive" },
  { objet: "Raccords inox du four", pour: /four/i, fournisseur: "Cedeo Lyon 7", quantite: 6, unite: "u", delai: 3, cas: "commandee" },
  { objet: "Carrelage grès cérame 60×60", pour: /Faïence|Ragréage/i, fournisseur: "Carrelages Lumière", quantite: 85, unite: "m2", delai: 7, cas: "partielle" },
  { objet: "Bandes à joint et ruban armé", pour: /enduits/i, fournisseur: "Point P Lyon 3", quantite: 20, unite: "u", delai: 2, cas: "recue" },
  { objet: "Nacelle 12 m, 2 jours", fournisseur: "Loca-Nacelles Lyon", quantite: null, unite: null, delai: 1, cas: "location" },
  { objet: "Échafaudage roulant 6 m", fournisseur: "Kiloutou Vénissieux", quantite: null, unite: null, delai: 1, cas: "location" },
  { objet: "Benne à gravats 10 m³", fournisseur: "Lyon Bennes Services", quantite: null, unite: null, delai: 1, cas: "rendue" },
];

/* les commandes de l'exemple : chaque modèle va au passage prévu suivant, chantier après chantier */
export function exemple(tableaux: Tableau[]): CommandeBrute[] {
  const auj = aujourdHui();
  const vivants = tableaux.filter((t) => ["preparation", "ouvert", "suspendu"].includes(t.chantier.statut));
  const passages = vivants.flatMap((t) => t.passages.filter((p) => p.statut === "prevu").map((p) => ({ t, p })));
  if (!vivants.length) return [];
  return MODELES.map((m, i) => {
    /* deux commandes en retard (passages proches), les autres sur les passages à venir */
    /* 04/11 — chaque commande va au passage de sa tâche (les fenêtres à « Pose des fenêtres »), le premier
       qui laisse le délai du fournisseur ; à défaut de passage de cette tâche, la répartition d'avant */
    const lies = m.pour ? passages.filter((x) => m.pour!.test(x.p.tache ?? "")).sort((a, b) => a.p.debut.localeCompare(b.p.debut)) : [];
    const reserve = lies.length ? lies : passages;
    const futurs = reserve.filter((x) => x.p.debut > decalerOuvres(auj, m.delai + (lies.length ? 0 : (i % 4) + 1)));
    const choix = (i < 2 && !lies.length) || !futurs.length ? reserve : futurs;
    const { t, p } = choix.length ? choix[lies.length ? 0 : (i * 5) % choix.length]! : { t: vivants[i % vivants.length]!, p: null };
    const four = t.tiers.find((x) => x.nom === m.fournisseur);
    const livrer = p ? decalerOuvres(p.debut, -1) : decalerOuvres(auj, 6);
    const base: CommandeBrute = {
      id: idFixe("c", i), chantier_id: t.chantier.id, lot_id: p?.lot_id ?? null, lot_code: p?.lot_code ?? null, passage_id: p?.id ?? null, passage_tache: p?.tache ?? null,
      fournisseur_id: four?.id ?? null, fournisseur_nom: m.fournisseur, objet: m.objet, quantite: m.quantite, unite: m.unite, quantite_texte: m.quantite != null ? qte(m.quantite, m.unite) : null,
      reference: null, delai_jours: m.delai, besoin_le: p ? null : decalerOuvres(auj, 7), statut: "a_commander", commandee_le: null, livraison_prevue: null, livree_le: null,
      note: null, motif: null, a_retourner: false, retour_prevu: null, retourne_le: null, livraisons: [],
    };
    const cde = `CDE-${45800 + i * 7}`;
    switch (m.cas) {
      case "commander":
        return base;
      case "commandee":
        return { ...base, statut: "commandee", commandee_le: plus(auj, -9), livraison_prevue: livrer < auj ? plus(auj, 2) : livrer, reference: cde };
      case "attendue":
        return { ...base, statut: "commandee", commandee_le: plus(auj, -6), livraison_prevue: plus(auj, -1), reference: cde };
      case "tardive":
        return { ...base, statut: "commandee", commandee_le: plus(auj, -14), livraison_prevue: decalerOuvres(livrer < auj ? auj : livrer, 3), reference: cde, note: "Le menuisier annonce trois jours de plus pour le séchage du chêne." };
      case "partielle":
        return { ...base, statut: "livree_partielle", commandee_le: plus(auj, -12), livraison_prevue: plus(auj, -2), livree_le: plus(auj, -2), reference: cde,
                 livraisons: [{ id: idFixe("l", i), livree_le: plus(auj, -2), quantite: 60, bon_reference: "BL-5531", piece_id: null, note: "4 palettes sur 6" }] };
      case "recue":
        return { ...base, statut: "livree", commandee_le: plus(auj, -8), livraison_prevue: plus(auj, -4), livree_le: plus(auj, -4), reference: cde,
                 livraisons: [{ id: idFixe("l", i), livree_le: plus(auj, -4), quantite: m.quantite, bon_reference: "BL-5498", piece_id: null, note: null }] };
      case "location":
        return { ...base, passage_id: null, passage_tache: null, lot_id: null, lot_code: null, besoin_le: plus(auj, -3), statut: "livree", commandee_le: plus(auj, -7), livraison_prevue: plus(auj, -3), livree_le: plus(auj, -3),
                 a_retourner: true, retour_prevu: i % 2 ? plus(auj, -1) : plus(auj, 3), reference: cde,
                 livraisons: [{ id: idFixe("l", i), livree_le: plus(auj, -3), quantite: null, bon_reference: `LN-${2291 + i}`, piece_id: null, note: null }] };
      default:
        return { ...base, passage_id: null, passage_tache: null, lot_id: null, lot_code: null, besoin_le: plus(auj, -10), statut: "livree", commandee_le: plus(auj, -12), livraison_prevue: plus(auj, -10), livree_le: plus(auj, -10),
                 a_retourner: true, retour_prevu: plus(auj, -5), retourne_le: plus(auj, -5), reference: cde,
                 livraisons: [{ id: idFixe("l", i), livree_le: plus(auj, -10), quantite: null, bon_reference: "LBS-118", piece_id: null, note: null }] };
    }
  });
}

/* l'export : une ligne par commande, séparateur « ; » (Excel en français), BOM UTF-8 */
export function versCsv(lignes: { k: Commande; chantier: string; phrase: string }[]): string {
  const cel = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const tete = ["Chantier", "Objet", "Quantité", "Fournisseur", "État", "Échéance", "Commander avant", "Livrer avant", "Livraison promise", "Livrée le", "N° de commande", "Passage", "Retour prévu", "Rendu le", "Note"];
  const corps = lignes.map(({ k, chantier, phrase }) =>
    [chantier, k.objet, k.quantite_texte ?? qte(k.quantite, k.unite), k.fournisseur_nom, LIBELLES[k.echeances.etat], phrase, k.echeances.commander_avant, k.echeances.livrer_avant, k.livraison_prevue, k.livree_le, k.reference, k.passage_tache, k.echeances.retour_prevu, k.retourne_le, k.note]
      .map(cel)
      .join(";"),
  );
  return `﻿${[tete.join(";"), ...corps].join("\r\n")}`;
}
