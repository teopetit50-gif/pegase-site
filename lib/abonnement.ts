/* ══════════════════════════════════════════════════════════════════════
   L'abonnement vu du compte client — types, règles, appels (03/09/2026)

   Demande Teo du 03/09 (« permet de gérer l'abonnement : annuler ou
   changer ») : la carte « Mon abonnement » de /compte. Il n'existe PAS de
   table « abonnements » : l'abonnement d'un client, aujourd'hui, C'EST sa
   demande d'installation (demandes_audit, parcours 'reglage') — postes,
   prix mensuel, périodicité y sont figés par reserver_audit. Ce fichier
   dit laquelle compte (abonnementCourant), dans quel état elle est
   (etatAbonnement) et comment on agit dessus.

   DEUX RÉGIMES, parce que le paiement n'est pas encore automatisé :
     · PAS ENCORE FINALISÉE (client_id null, statut confirme|a_traiter) :
       le client agit LUI-MÊME, effet immédiat — modifier_installation
       (postes + périodicité, prix recalculés par la SQL) ou
       annuler_demande. Le cockpit de Teo voit la ligne mise à jour.
     · FINALISÉE / EN SERVICE (client_id posé par « Installation
       finalisée », ou statut honore, ou compte rattaché) : le client
       DEMANDE (demander_abonnement, table demandes_abonnement, type
       'changement' ou 'resiliation') et Teo traite dans le cockpit.
       La carte est honnête là-dessus : « confirmé par e-mail sous 48 h ».

   Les fonctions SQL vivent dans base-de-donnees/2026-09-03-compte-
   abonnement.sql (écrit le même jour). Elles parlent en codes ; ERREURS_
   ABONNEMENT parle en français.

   rpc() : copie de celle de lib/creneaux.ts, qui n'est pas exportée
   (lib/site-commande.ts a la sienne aussi). Même contrat : clé publique
   en apikey, jeton de session en Authorization, code PostgREST dans le
   message d'erreur pour distinguer une base pas encore migrée (PGRST202)
   d'une vraie panne.

   05/09 — LE MOYEN DE PAIEMENT (demande des associés : « le client entre
   son moyen de paiement et est débité une fois l'installation
   terminée »). La demande d'installation porte désormais l'état du
   paiement (2026-09-05-paiement-stripe.sql) : paiement_statut
   (a_enregistrer → enregistre → preleve, ou echec), moyen_paiement (ce
   qu'il faut pour dire « Carte Visa •••• 4242 » sans rien stocker de
   sensible), stripe_subscription_id. Le client enregistre sa carte ou son
   mandat SEPA sur une page Stripe ouverte par POST /api/paiement/setup
   (ouvrirEnregistrementPaiement, ci-dessous) ; le webhook du COCKPIT
   remplit ensuite ces colonnes — d'où « enregistrement en cours » quelques
   secondes après le retour de Stripe. Le premier prélèvement part au
   clic « Finaliser l'installation » de l'agence, jamais avant.
   ══════════════════════════════════════════════════════════════════════ */

import { LIBELLES_STATUT, dateHeureGp } from "@/lib/compte";
import { POSTES, lirePeriodicite, prixAnnuel, prixPour, type Periodicite } from "@/lib/paliers";
import { dateGp } from "@/lib/site-commande";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/* ——— ce que la page lit ——— */

/* Une ligne de rpc mes_demandes() — les colonnes que la carte utilise.
   prix_* arrivent en number OU en string selon le type SQL (numeric est
   sérialisé en texte par PostgREST) : on passe toujours par prixNombre. */
export type DemandeCompte = {
  id: string;
  parcours: string;
  formule: string;
  statut: string;
  creneau_debut: string | null;
  duree_min: number | null;
  entreprise: string | null;
  modules: string[] | null;
  prix_mensuel_eur: number | string | null;
  periodicite?: string | null;
  prix_annuel_eur?: number | string | null;
  /* non null = installation FINALISÉE par Teo (le compte est rattaché) */
  client_id: string | null;
  cree_le: string;
  /* 05/09 — le paiement (2026-09-05-paiement-stripe.sql). Facultatifs :
     absents tant que la migration n'est pas passée — lus comme
     « a_enregistrer » sans moyen de paiement */
  paiement_statut?: string | null;
  moyen_paiement?: MoyenPaiement | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
};

/* Ce que le webhook du cockpit range dans demandes_audit.moyen_paiement :
   le type, la marque de la carte s'il y en a une, les quatre derniers
   chiffres (carte) ou caractères (IBAN). Jamais plus. */
export type MoyenPaiement = {
  type: "card" | "sepa_debit" | string;
  marque?: string | null;
  fin?: string | null;
};

export type PaiementStatut = "a_enregistrer" | "enregistre" | "preleve" | "echec";

/* Une ligne de public.demandes_abonnement (rpc mes_demandes_abonnement) */
export type DemandeAbonnement = {
  id: string;
  type: "changement" | "resiliation";
  /* changement : { modules, periodicite } ; résiliation : { motif } */
  detail: Record<string, unknown>;
  message: string | null;
  statut: "a_traiter" | "traitee" | "refusee";
  reponse: string | null;
  cree_le: string;
  traitee_le: string | null;
};

export type EtatAbonnement = {
  code: "reserve" | "en_service" | "recu" | "annule";
  libelle: string;
};

/* ——— règles ——— */

export function prixNombre(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const STATUTS_MODIFIABLES = ["confirme", "a_traiter"];

/** L'abonnement, c'est la demande d'installation la plus PERTINENTE :
    d'abord une demande finalisée (client_id non null — la plus récente
    s'il y en avait plusieurs), sinon la plus récente non annulée. Rien
    de tout ça : pas d'abonnement. */
export function abonnementCourant(demandes: DemandeCompte[]): DemandeCompte | null {
  const parDate = (a: DemandeCompte, b: DemandeCompte) => b.cree_le.localeCompare(a.cree_le);
  const installations = demandes.filter((d) => d.parcours === "reglage").sort(parDate);
  return (
    installations.find((d) => d.client_id != null) ??
    installations.find((d) => d.statut !== "annule") ??
    null
  );
}

/** Le client peut agir LUI-MÊME (modifier, annuler) : pas encore
    finalisée, et dans un statut où ça a un sens — les mêmes gardes que
    les fonctions SQL. La troisième garde SQL (réunion pas encore passée)
    demande l'horloge : la page la calcule côté SERVEUR (reunionPassee,
    app/compte/page.tsx) et la carte la combine à celle-ci — jamais de
    Date.now() dans un rendu client. */
export function estModifiable(d: DemandeCompte): boolean {
  return d.client_id == null && STATUTS_MODIFIABLES.includes(d.statut);
}

/** La réunion de cette demande est-elle déjà passée ? La SEULE lecture
    de l'horloge de tout le parcours /compte — appelée par la page
    (Server Component) et passée en prop à la carte, comme lib/creneaux
    lit l'heure pour la grille. Sans créneau : non. */
export function reunionPassee(d: DemandeCompte | null): boolean {
  if (!d?.creneau_debut) return false;
  const t = new Date(d.creneau_debut).getTime();
  return Number.isFinite(t) && t < Date.now();
}

/** En service : finalisée par Teo (client_id), réunion faite (honore),
    ou compte rattaché (un gérant invité depuis le cockpit peut l'être
    sans clic « finalisée » sur cette demande précise). Gouverne le
    RÉGIME des actions quand la demande n'est plus modifiable (demander
    plutôt que modifier) — pas la pastille, qui a ses propres règles. */
export function estEnService(d: DemandeCompte, rattache: boolean): boolean {
  return d.client_id != null || d.statut === "honore" || rattache;
}

/** La pastille d'état. SANS horloge (relecture 03/09) : la carte est un
    composant client rendu d'abord sur le serveur — un texte qui dépend
    de Date.now() peut différer entre les deux rendus (erreur
    d'hydratation). Pas besoin : quand client_id est posé ou le statut
    est honore, la réunion a eu lieu par construction, « depuis » = la
    réunion ; sans créneau, la date de la demande. Une réservation
    confirmée (client_id null) reste « Réservé — réunion le … » même sur
    un compte rattaché (seconde installation, gérant invité) : on ne dit
    pas « en service » d'une réunion qui n'a pas eu lieu. */
export function etatAbonnement(d: DemandeCompte, rattache: boolean): EtatAbonnement {
  if (d.statut === "annule") return { code: "annule", libelle: "Annulé" };
  if (d.client_id != null || d.statut === "honore") {
    return { code: "en_service", libelle: `En service depuis le ${dateGp(d.creneau_debut ?? d.cree_le)}` };
  }
  if (d.statut === "confirme") {
    return {
      code: "reserve",
      libelle: d.creneau_debut
        ? `Réservé — réunion le ${dateHeureGp(d.creneau_debut)}`
        : "Réservé — créneau confirmé",
    };
  }
  if (d.statut === "a_traiter") return { code: "recu", libelle: "Demande reçue" };
  /* rattaché sans que CETTE demande soit finalisée (no_show puis gérant
     invité, par exemple) : un libellé neutre, pas une date inventée */
  if (rattache) return { code: "en_service", libelle: "Compte rattaché — cockpit ouvert" };
  /* no_show et tout statut inconnu : le libellé de /compte, tel quel */
  return { code: "recu", libelle: LIBELLES_STATUT[d.statut] ?? d.statut };
}

/* ——— libellés ——— */

export function nomPoste(id: string): string {
  return POSTES.find((p) => p.id === id)?.nom ?? id;
}

/** Les postes dans l'ordre du catalogue, sans doublon ni inconnu. */
export function postesTries(ids: string[] | null | undefined): string[] {
  const set = new Set(ids ?? []);
  return POSTES.filter((p) => set.has(p.id)).map((p) => p.id);
}

/** « 89 €/mois, sans engagement » ou « 900 € par an, soit 75 €/mois ». */
export function libellePrix(mensuel: number, periodicite: Periodicite, annuel?: number | null): string {
  if (periodicite === "annuel") {
    const a = annuel ?? prixAnnuel(mensuel);
    return `${a} € par an, soit ${Math.round(a / 12)} €/mois`;
  }
  return `${mensuel} €/mois, sans engagement`;
}

/** Le prix d'un choix, calculé du barème de lib/paliers.ts — l'aperçu
    « Nouveau prix » avant l'envoi ; la SQL fera le même calcul et stockera
    le sien. */
export function prixChoix(modules: string[], periodicite: Periodicite): { mensuel: number; annuel: number | null } {
  const mensuel = prixPour(modules.length);
  return { mensuel, annuel: periodicite === "annuel" ? prixAnnuel(mensuel) : null };
}

export const LIBELLES_STATUT_ABONNEMENT: Record<DemandeAbonnement["statut"], string> = {
  a_traiter: "En cours — réponse sous 48 h",
  traitee: "Traitée",
  refusee: "Refusée",
};

export const LIBELLES_TYPE_ABONNEMENT: Record<DemandeAbonnement["type"], string> = {
  changement: "Changement de formule",
  resiliation: "Résiliation",
};

export const MOTIFS_RESILIATION: { valeur: string; libelle: string }[] = [
  { valeur: "trop_cher", libelle: "Trop cher" },
  { valeur: "peu_utilise", libelle: "Pas assez utilisé" },
  { valeur: "autre_outil", libelle: "Je change d'outil" },
  { valeur: "autre", libelle: "Autre raison" },
];

/** Le détail d'une demande en clair, une ligne par information — pour la
    liste des demandes en cours de la carte. Tolérant : un détail mal
    formé (écrit par une autre version) donne une liste vide, pas une
    page cassée. */
export function lignesDetail(d: DemandeAbonnement): string[] {
  const lignes: string[] = [];
  const det = d.detail ?? {};
  if (d.type === "changement") {
    const modules = Array.isArray(det.modules) ? postesTries(det.modules.filter((m) => typeof m === "string")) : [];
    if (modules.length) lignes.push(`Postes souhaités : ${modules.map(nomPoste).join(", ")}`);
    const per = lirePeriodicite(det.periodicite);
    if (modules.length) {
      const p = prixChoix(modules, per);
      lignes.push(`Formule : ${libellePrix(p.mensuel, per, p.annuel)}`);
    } else {
      lignes.push(`Périodicité : ${per === "annuel" ? "annuelle" : "mensuelle"}`);
    }
  } else {
    const motif = MOTIFS_RESILIATION.find((m) => m.valeur === det.motif)?.libelle;
    if (motif) lignes.push(`Motif : ${motif}`);
  }
  return lignes;
}

/* ——— le moyen de paiement (05/09) ——— */

const STATUTS_PAIEMENT: PaiementStatut[] = ["a_enregistrer", "enregistre", "preleve", "echec"];

/** L'état du paiement d'une demande. Colonne absente (migration pas
    passée) ou valeur inconnue : « à enregistrer » — on ne dit jamais
    « enregistré » sans l'avoir lu. */
export function statutPaiement(d: DemandeCompte): PaiementStatut {
  const s = d.paiement_statut;
  return STATUTS_PAIEMENT.includes(s as PaiementStatut) ? (s as PaiementStatut) : "a_enregistrer";
}

/** La ligne « Moyen de paiement » a-t-elle sa place sur cette demande ?
    Une installation, pas annulée ni manquée — les mêmes gardes que la
    route /api/paiement/setup, pour ne pas montrer un bouton qui répondra
    « statut incompatible ». */
export function paiementPertinent(d: DemandeCompte): boolean {
  return d.parcours === "reglage" && (["confirme", "a_traiter", "honore"].includes(d.statut) || d.client_id != null);
}

const MARQUES: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cartes_bancaires: "CB",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
};

/** « Carte Visa •••• 4242 », « Prélèvement SEPA •••• 3000 » — ou
    « Moyen de paiement enregistré » si le détail manque. */
export function libelleMoyenPaiement(m: MoyenPaiement | null | undefined): string {
  if (!m) return "Moyen de paiement enregistré";
  const fin = m.fin ? ` •••• ${m.fin}` : "";
  if (m.type === "sepa_debit") return `Prélèvement SEPA${fin}`;
  if (m.type === "card") {
    const marque = m.marque ? (MARQUES[m.marque] ?? m.marque.charAt(0).toUpperCase() + m.marque.slice(1)) : "";
    return `Carte${marque ? ` ${marque}` : ""}${fin}`;
  }
  return `Moyen de paiement enregistré${fin}`;
}

export type ReponseEnregistrement = { ok: true; url: string } | { ok: false; erreur: string };

/** Demande au site d'ouvrir la page Stripe où le client enregistre son
    moyen de paiement (POST /api/paiement/setup, session lue dans les
    cookies — pas de jeton à passer). Succès : l'URL où aller, par
    window.location.assign. Échec : un code, à traduire par messageErreur.
    « paiement_indisponible » (503) n'est pas une panne : la clé Stripe
    n'est pas encore posée, et l'écran le dit tel quel. */
export async function ouvrirEnregistrementPaiement(demandeId: string): Promise<ReponseEnregistrement> {
  try {
    const r = await fetch("/api/paiement/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ demande: demandeId }),
    });
    let corps: { url?: unknown; erreur?: unknown } = {};
    try {
      corps = (await r.json()) as typeof corps;
    } catch {
      /* corps absent : le statut décide */
    }
    if (r.ok && typeof corps.url === "string" && corps.url) return { ok: true, url: corps.url };
    if (typeof corps.erreur === "string" && corps.erreur) return { ok: false, erreur: corps.erreur };
    if (r.status === 401) return { ok: false, erreur: "connexion_requise" };
    if (r.status === 503) return { ok: false, erreur: "paiement_indisponible" };
    return { ok: false, erreur: "reseau" };
  } catch {
    return { ok: false, erreur: "reseau" };
  }
}

/* ——— appels ——— */

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
  if (!r.ok) {
    let code = "";
    try {
      code = String(((await r.json()) as { code?: unknown }).code ?? "");
    } catch {
      /* corps absent ou non JSON : le statut suffit */
    }
    throw new Error(`rpc ${fonction} : ${r.status}${code ? ` ${code}` : ""}`);
  }
  return (await r.json()) as T;
}

export type ReponseSimple = { ok: true } | { ok: false; erreur: string };
export type ReponseModification =
  | { ok: true; prix_mensuel_eur: number | string; prix_annuel_eur: number | string | null }
  | { ok: false; erreur: string };
export type ReponseDemande = { ok: true; id: string } | { ok: false; erreur: string };

/* Un échec réseau se lit en code, comme une erreur SQL : la carte n'a
   qu'un chemin d'affichage. 401 = jeton expiré entre le chargement et le
   clic ; PGRST202 = la base n'a pas encore la fonction (site déployé
   avant la migration) — on le DIT, on ne maquille pas en panne. */
function enCode(e: unknown): string {
  if (e instanceof Error) {
    if (/: 401\b/.test(e.message)) return "connexion_requise";
    if (/PGRST202/.test(e.message)) return "indisponible";
  }
  return "reseau";
}

export async function annulerDemande(id: string, jeton: string): Promise<ReponseSimple> {
  try {
    return await rpc<ReponseSimple>("annuler_demande", { p_demande: id }, jeton);
  } catch (e) {
    return { ok: false, erreur: enCode(e) };
  }
}

export async function modifierInstallation(
  id: string,
  modules: string[],
  periodicite: Periodicite,
  jeton: string,
): Promise<ReponseModification> {
  try {
    return await rpc<ReponseModification>(
      "modifier_installation",
      { p_demande: id, p_modules: modules, p_periodicite: periodicite },
      jeton,
    );
  } catch (e) {
    return { ok: false, erreur: enCode(e) };
  }
}

export async function demanderAbonnement(
  type: DemandeAbonnement["type"],
  detail: Record<string, unknown>,
  message: string,
  jeton: string,
): Promise<ReponseDemande> {
  try {
    return await rpc<ReponseDemande>(
      "demander_abonnement",
      { p_type: type, p_detail: detail, p_message: message.trim() || null },
      jeton,
    );
  } catch (e) {
    return { ok: false, erreur: enCode(e) };
  }
}

/* Ce que le client lit quand ça ne passe pas. Les codes SQL viennent de
   2026-09-03-compte-abonnement.sql ; un code inconnu tombe sur `defaut`. */
export const ERREURS_ABONNEMENT: Record<string, string> = {
  demande_inconnue: "Cette demande n'est pas rattachée à votre compte. Rechargez la page.",
  deja_finalisee:
    "Votre installation est déjà finalisée : ce changement passe par une demande, que nous traitons sous 48 h. Rechargez la page.",
  statut_incompatible: "Cette réservation ne peut plus être modifiée en ligne. Écrivez-nous, on s'en occupe.",
  modules_requis: "Choisissez au moins un poste.",
  /* mêmes noms que dans la SQL (et que reserver_audit) : champs_invalides,
     periodicite_inconnue, type_inconnu — à renommer ENSEMBLE */
  champs_invalides: "Un des champs envoyés n'est pas valide. Rechargez la page.",
  periodicite_inconnue: "Cette périodicité n'est pas valide. Rechargez la page.",
  type_inconnu: "Ce type de demande n'existe pas. Rechargez la page.",
  trop_de_demandes:
    "Trois demandes sont déjà en cours sur votre compte. Attendez notre réponse, ou écrivez-nous directement.",
  aucun_abonnement: "Aucun abonnement n'est rattaché à ce compte. Rechargez la page.",
  connexion_requise: "Votre session a expiré : reconnectez-vous puis réessayez.",
  indisponible: "Cette action n'est pas encore ouverte en ligne. Écrivez-nous, on s'en occupe.",
  /* 05/09 — les codes de POST /api/paiement/setup */
  paiement_indisponible:
    "L'enregistrement en ligne du moyen de paiement n'est pas encore ouvert : on vous le proposera par e-mail.",
  demande_invalide: "Cette demande n'est pas valide. Rechargez la page.",
  deja_preleve:
    "Votre premier prélèvement est déjà passé : pour changer de moyen de paiement, écrivez-nous, on s'en occupe.",
  base_indisponible: "Votre abonnement ne répond pas pour le moment. Réessayez dans un instant.",
  stripe_erreur: "La page de paiement n'a pas pu s'ouvrir. Réessayez dans un instant, ou écrivez-nous.",
  reseau: "Ça n'est pas parti — vérifiez votre connexion et réessayez.",
  defaut: "Ça n'a pas fonctionné. Réessayez dans un instant, ou écrivez-nous.",
};

export function messageErreur(code: string): string {
  return ERREURS_ABONNEMENT[code] ?? ERREURS_ABONNEMENT.defaut;
}
