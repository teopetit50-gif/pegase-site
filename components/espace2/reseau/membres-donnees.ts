/* Réseau Omega, page Membres — ce que la page calcule autour des membres
   d'exemple (components/espace2/reseau/membres.ts, partagé, intouché) :
   les phrases des badges et leur provenance, la recherche, les filtres
   lus dans l'adresse, et la fiche de « vous » (l'organisation connectée)
   avec ce qu'elle accepte de montrer au réseau. */

import { useSyncExternalStore } from "react";
import { MEMBRES, type Badges, type Ile, type Membre } from "./membres";

export const RACINE_MEMBRES = "/espace2/reseau/membres";
export const lienMembre = (slug: string) => `${RACINE_MEMBRES}/${slug}`;
export const lienEcrire = (slug: string) => `/espace2/reseau/messages?a=${encodeURIComponent(slug)}`;

export const membreDe = (slug: string) => MEMBRES.find((m) => m.slug === slug) ?? null;

/* ——— les dates ——— */

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-09 » → « septembre 2026 » */
export function moisEnClair(aaaamm: string): string {
  const [a, m] = aaaamm.split("-").map(Number);
  return MOIS[m - 1] ? `${MOIS[m - 1]} ${a}` : aaaamm;
}

/* ——— les badges : la phrase, le chiffre, d'où il vient ——— */

export type CleBadge = keyof Badges;

export const PERIODE_BADGES = "les 12 derniers mois glissants";

export function phraseBonPayeur(jours: number): string {
  return `Paie ses fournisseurs en ${jours} j en moyenne`;
}

export function phraseReponse(minutes: number): string {
  if (minutes < 60) return "Répond en moins d'1 h";
  const heures = Math.ceil(minutes / 60);
  return minutes % 60 === 0 ? `Répond en ${heures} h` : `Répond en moins de ${heures} h`;
}

export function dureeEnClair(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export type BadgeLu = { cle: CleBadge; nom: string; phrase: string; chiffre: string; source: string };

/** Les badges d'un membre, dans l'ordre d'affichage, avec leur provenance. */
export function badgesLus(badges: Badges): BadgeLu[] {
  const lus: BadgeLu[] = [];
  if (badges.bonPayeur) {
    const j = badges.bonPayeur.delaiJours;
    lus.push({
      cle: "bonPayeur",
      nom: "Bon payeur",
      phrase: phraseBonPayeur(j),
      chiffre: `${j} jours en moyenne`,
      source: `Calculé par Omega sur les factures fournisseurs traitées dans FILED : délai moyen entre la réception de chaque facture et son paiement, sur ${PERIODE_BADGES}.`,
    });
  }
  if (badges.reponseRapide) {
    const m = badges.reponseRapide.delaiMinutes;
    lus.push({
      cle: "reponseRapide",
      nom: "Réponse rapide",
      phrase: phraseReponse(m),
      chiffre: `${dureeEnClair(m)} de délai médian`,
      source: `Calculé par Omega sur les demandes reçues (formulaires, e-mails, messages suivis par Omega) : délai médian avant la première réponse, sur ${PERIODE_BADGES}.`,
    });
  }
  return lus;
}

/* ——— la recherche et les filtres ——— */

/** minuscules, sans accents : « Électricité » se trouve en tapant « electricite » */
export const plat = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export type Filtres = {
  q: string;
  ile: Ile | null;
  secteur: string | null;
  propose: string[];
  cherche: string[];
  badges: CleBadge[];
};

export const FILTRES_VIDES: Filtres = { q: "", ile: null, secteur: null, propose: [], cherche: [], badges: [] };

const ILES: Ile[] = ["Guadeloupe", "Martinique"];
const CLES_BADGES: CleBadge[] = ["bonPayeur", "reponseRapide"];

/** Les filtres vivent dans l'adresse : ?q=&ile=&secteur=&propose=&cherche=&badge= */
export function filtresDe(p: URLSearchParams): Filtres {
  const ile = p.get("ile");
  return {
    q: p.get("q") ?? "",
    ile: ILES.includes(ile as Ile) ? (ile as Ile) : null,
    secteur: p.get("secteur"),
    propose: p.getAll("propose"),
    cherche: p.getAll("cherche"),
    badges: p.getAll("badge").filter((b): b is CleBadge => CLES_BADGES.includes(b as CleBadge)),
  };
}

export function adresseDe(f: Filtres): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q);
  if (f.ile) p.set("ile", f.ile);
  if (f.secteur) p.set("secteur", f.secteur);
  f.propose.forEach((x) => p.append("propose", x));
  f.cherche.forEach((x) => p.append("cherche", x));
  f.badges.forEach((x) => p.append("badge", x));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const nbFiltres = (f: Filtres) => (f.ile ? 1 : 0) + (f.secteur ? 1 : 0) + f.propose.length + f.cherche.length + f.badges.length;

export function filtrer(membres: Membre[], f: Filtres): Membre[] {
  const mots = plat(f.q).split(/\s+/).filter(Boolean);
  return membres.filter((m) => {
    if (f.ile && m.ile !== f.ile) return false;
    if (f.secteur && m.secteur !== f.secteur) return false;
    if (f.propose.length && !f.propose.some((x) => m.propose.includes(x))) return false;
    if (f.cherche.length && !f.cherche.some((x) => m.cherche.includes(x))) return false;
    if (f.badges.some((b) => !m.badges[b])) return false;
    if (mots.length) {
      const texte = plat([m.nom, m.secteur, m.commune, m.ile, ...m.propose, ...m.cherche].join(" "));
      if (!mots.every((mot) => texte.includes(mot))) return false;
    }
    return true;
  });
}

const tri = (a: string, b: string) => a.localeCompare(b, "fr");
export const SECTEURS = [...new Set(MEMBRES.map((m) => m.secteur))].sort(tri);
export const PROPOSITIONS = [...new Set(MEMBRES.flatMap((m) => m.propose))].sort(tri);
export const RECHERCHES = [...new Set(MEMBRES.flatMap((m) => m.cherche))].sort(tri);
export { ILES };

/* ——— « vous » : l'organisation connectée ———
   Son nom vient de la coquille (OrganisationContexte) ; en données
   d'exemple, le reste de sa fiche est celui-ci. Les chiffres des badges
   sont ceux que l'exemple d'Espace 2 prête à l'organisation. */

export type ProfilVous = { secteur: string; commune: string; ile: Ile; propose: string[]; cherche: string[]; badges: Badges };

export const VOUS_EXEMPLE: ProfilVous = {
  secteur: "Concession automobile",
  commune: "Baie-Mahault",
  ile: "Guadeloupe",
  propose: ["Véhicules utilitaires pour flottes", "Atelier après-vente"],
  cherche: ["Carrossier en sous-traitance", "Transitaire pour pièces détachées"],
  badges: { bonPayeur: { delaiJours: 22 }, reponseRapide: { delaiMinutes: 45 } },
};

/* ——— ce que je montre au réseau ———
   Un interrupteur par champ, TOUS ÉTEINTS au départ : rien n'est visible
   sans accord. En données d'exemple, c'est un état local à l'onglet (il
   survit à la navigation entre la liste et les fiches, pas au
   rechargement) ; la table visée est dans docs/reseau-espace2/schema-membres.sql. */

export type ChampVisible = "bonPayeur" | "reponseRapide" | "secteur" | "commune" | "propose" | "cherche";
export const CHAMPS_VISIBLES: ChampVisible[] = ["bonPayeur", "reponseRapide", "secteur", "commune", "propose", "cherche"];
export type Visibilite = Record<ChampVisible, boolean>;

const TOUT_MASQUE: Visibilite = { bonPayeur: false, reponseRapide: false, secteur: false, commune: false, propose: false, cherche: false };

let visibilite: Visibilite = TOUT_MASQUE;
const ecouteurs = new Set<() => void>();

export function changerVisibilite(champ: ChampVisible, oui: boolean) {
  visibilite = { ...visibilite, [champ]: oui };
  ecouteurs.forEach((e) => e());
}

export function toutMasquer() {
  visibilite = TOUT_MASQUE;
  ecouteurs.forEach((e) => e());
}

const abonner = (e: () => void) => {
  ecouteurs.add(e);
  return () => {
    ecouteurs.delete(e);
  };
};

export function useVisibilite(): Visibilite {
  return useSyncExternalStore(
    abonner,
    () => visibilite,
    () => TOUT_MASQUE,
  );
}
