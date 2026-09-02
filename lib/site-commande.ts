/* ══════════════════════════════════════════════════════════════════════
   Commande de site — accès à l'armoire OMEGA-Core (02/09/2026)

   Le tunnel /site/commande (modèle → compte → brief → paiement) écrit dans
   la table commandes_site par UNE porte : la fonction RPC commander_site,
   réservée au rôle `authenticated` — une commande est un achat, elle
   exige un compte, comme l'installation. Le jeton de session part en
   Authorization: Bearer (mêmes conventions que lib/creneaux.ts) ; sans
   lui PostgREST répond 401, que l'on lit « connexion requise ».

   Les fichiers du brief (logo, images) vont dans le bucket PRIVÉ
   « briefs-site », où un compte n'écrit et ne lit QUE son dossier
   <user_id>/… (policies RLS côté Storage). La fonction SQL revérifie que
   chaque chemin commence bien par l'identifiant du compte : ce fichier
   fabrique les chemins, il ne les garantit pas — le serveur ne croit pas
   le client.

   Le prix (990 €) n'est PAS envoyé : la colonne a sa valeur par défaut
   et le paiement en ligne n'existe pas encore (Stripe plus tard).
   ══════════════════════════════════════════════════════════════════════ */

import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const PRIX_SITE_EUR = 990;
export const BUCKET_BRIEFS = "briefs-site";

/* ——— fichiers acceptés : la même liste que le bucket (allowed_mime_types,
   10 Mo par fichier) — un fichier refusé ici l'aurait été là-bas. ——— */
export const TYPES_ACCEPTES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf"];
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;
export const MAX_IMAGES = 8;

/* ——— les cases du brief : la valeur stockée est la clé, pas le libellé ——— */
export const OBJECTIFS: { valeur: string; libelle: string }[] = [
  { valeur: "devis", libelle: "Des demandes de devis" },
  { valeur: "rendezvous", libelle: "Des prises de rendez-vous" },
  { valeur: "appels", libelle: "Des appels" },
  { valeur: "commandes", libelle: "Des commandes" },
  { valeur: "avis", libelle: "Des avis clients" },
];

export const PAGES_SITE: { valeur: string; libelle: string }[] = [
  { valeur: "accueil", libelle: "Accueil" },
  { valeur: "prestations", libelle: "Prestations" },
  { valeur: "realisations", libelle: "Réalisations" },
  { valeur: "apropos", libelle: "À propos" },
  { valeur: "contact", libelle: "Contact" },
  { valeur: "tarifs", libelle: "Tarifs" },
  { valeur: "blog", libelle: "Blog" },
];

/* ——— chemins dans le bucket ———
   <user_id>/<dossier temporaire>/<préfixe>-<nom assaini>. Le nom est
   ramené à l'ASCII (accents retirés, tout le reste en tiret) : Storage
   accepte l'UTF-8 mais un nom propre se relit sans surprise dans le
   cockpit, et n'ouvre aucune porte à un « ../ ». */
export function nomSain(nom: string): string {
  const point = nom.lastIndexOf(".");
  const base = point > 0 ? nom.slice(0, point) : nom;
  const ext = point > 0 ? nom.slice(point + 1) : "";
  const propre = (s: string) =>
    s
      .normalize("NFD")
      /* \p{M} : les signes combinants détachés par NFD (accents, cédille) */
      .replace(/\p{M}+/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  const b = propre(base).slice(0, 60) || "fichier";
  const e = propre(ext).slice(0, 8);
  return e ? `${b}.${e}` : b;
}

export function cheminBrief(utilisateurId: string, dossier: string, prefixe: string, nomFichier: string): string {
  return `${utilisateurId}/${dossier}/${prefixe}-${nomSain(nomFichier)}`;
}

/* ——— l'appel RPC, même forme que lib/creneaux.ts ——— */
async function rpc<T>(fonction: string, corps: Record<string, unknown>, jeton?: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fonction}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${jeton || SUPABASE_KEY}`,
    },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`rpc ${fonction} : ${r.status}`);
  return (await r.json()) as T;
}

/* le brief libre — colonne jsonb `infos`, pour évoluer sans migration */
export type InfosBrief = {
  activite?: string;
  objectifs?: string[];
  pages?: string[];
  ambiance?: string;
  domaine?: string;
  reseaux?: string;
  informations?: string;
};

export type CommandeSite = {
  modele: string;
  entreprise: string;
  secteur?: string;
  telephone?: string;
  commune?: string;
  infos: InfosBrief;
  logo?: string | null;
  images?: string[];
};

export type ReponseCommande = { ok: true; id: string } | { ok: false; erreur: string };

/** Enregistre la commande. `jeton` : la session du compte — obligatoire
    (la fonction est refusée à `anon`) ; un 401 se lit « connexion
    requise », pas « panne réseau ». */
export async function commander(c: CommandeSite, jeton?: string): Promise<ReponseCommande> {
  if (!jeton) return { ok: false, erreur: "connexion_requise" };
  try {
    return await rpc<ReponseCommande>(
      "commander_site",
      {
        p_modele: c.modele,
        p_entreprise: c.entreprise,
        p_secteur: c.secteur || null,
        p_telephone: c.telephone || null,
        p_commune: c.commune || null,
        p_infos: c.infos,
        p_logo: c.logo || null,
        p_images: c.images?.length ? c.images : [],
      },
      jeton,
    );
  } catch (e) {
    if (e instanceof Error && /: 401$/.test(e.message)) {
      return { ok: false, erreur: "connexion_requise" };
    }
    return { ok: false, erreur: "reseau" };
  }
}

/* Ce que le visiteur lit quand ça ne passe pas — la fonction SQL parle en
   codes, la page parle en français. `televersement` et `reseau` sont
   posés par le module lui-même. */
export const ERREURS_SITE: Record<string, string> = {
  connexion_requise: "Connectez-vous pour commander votre site.",
  modele_invalide: "Ce modèle n'est plus au catalogue. Choisissez-en un autre.",
  champs_invalides: "Un des champs n'est pas valide — le nom de l'entreprise, notamment.",
  trop_de_demandes: "Vous avez déjà trois commandes en attente.",
  fichier_invalide: "Un des fichiers n'a pas été accepté. Retirez-le et réessayez.",
  televersement: "Un fichier n'est pas parti — vérifiez votre connexion et réessayez.",
  reseau: "La commande n'est pas partie — vérifiez votre connexion et réessayez.",
};

/* ——— « Mon compte » : la ligne d'une commande, telle que la renvoie
   mes_commandes_site (on ne type que ce qu'on affiche) ——— */
export type LigneCommandeSite = {
  id: string;
  modele: string;
  entreprise: string;
  prix_eur: number | string;
  statut: string;
  cree_le: string;
};

/* Les statuts, du point de vue du CLIENT. « a_payer » ne dit pas « payez »
   — le paiement en ligne n'existe pas encore, c'est Teo qui appelle. Un
   statut inconnu s'affiche tel quel plutôt que de planter la page. */
export const LIBELLES_STATUT_SITE: Record<string, string> = {
  brouillon: "Brouillon",
  a_payer: "Enregistrée — règlement à venir",
  paye: "Payée",
  en_production: "En production",
  livre: "Livrée",
  annule: "Annulée",
};

/* Un instant ISO → « 2 septembre 2026 », en heure de Guadeloupe. */
export function dateGp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "America/Guadeloupe",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function prixLisible(p: number | string): string {
  const n = typeof p === "number" ? p : Number(p);
  if (Number.isNaN(n)) return String(p);
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;
}
