/* ══════════════════════════════════════════════════════════════════════
   Créneaux de rendez-vous — accès à l'armoire OMEGA-Core (27/08/2026)

   Le site parle DIRECTEMENT à Supabase (base omega-core, Francfort) via
   deux fonctions RPC créées pour lui, avec la clé « publishable » — conçue
   pour être embarquée côté client, elle n'ouvre rien d'autre :
     · agenda_public(depuis, jusqua) : fenêtres d'ouverture hebdomadaires,
       plages bloquées et créneaux déjà pris — des HORAIRES, jamais une
       donnée personnelle ;
     · reserver_audit(...) : l'écriture. Toute la validation (alignement,
       horaires, chevauchement, anti-abus) vit DANS la fonction SQL — ce
       fichier ne fait que présenter ; le serveur ne croit pas le client.

   Deux appels fetch sur l'API REST suffisent — pas besoin du client
   supabase-js ici, même depuis le 02/09 où il est installé pour le compte
   client : l'agenda et la réservation restent des appels nus.

   02/09 — compte client. reserver() accepte un jeton de session optionnel,
   envoyé en Authorization: Bearer à la place de la clé publishable : la
   fonction SQL voit alors auth.uid() et rattache la demande au compte
   (colonne utilisateur_id). Sans jeton, rien ne change — l'audit reste
   libre. L'URL et la clé viennent désormais de lib/supabase/config.ts
   (source unique, avec repli sur les constantes publiques).

   Le double de la logique horaire (fuseau, alignement 30 min) existe côté
   SQL : en cas de divergence, c'est TOUJOURS la fonction SQL qui gagne —
   ici on filtre juste ce qu'on affiche.
   ══════════════════════════════════════════════════════════════════════ */

import type { Periodicite } from "@/lib/paliers";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/* La Guadeloupe vit en UTC−4 toute l'année — pas d'heure d'été depuis
   1911, le décalage est une constante, pas une approximation. La fonction
   SQL revérifie de toute façon en zone America/Guadeloupe. */
const DECALAGE_GP = 4;

/* L'agenda est ouvert sur dix semaines — la MÊME borne que la fonction
   SQL (creneau_trop_loin au-delà de now + 70 j) et que chargerAgenda :
   un créneau affiché doit toujours être un créneau acceptable. */
export const HORIZON_JOURS = 70;

/* ——— formules réservables : durée en minutes, imposée aussi côté SQL.
   `null` = format sur devis : pas de créneau, la demande part « à
   traiter » et Teo répond avec un devis. */
export const DUREES_RDV: Record<string, number | null> = {
  diagnostic: 30,
  complet: 90,
  cadrage: 45,
  process: 120,
  reglage: 45,
  site: null,
  atelier: null,
};

export type Fenetre = { debut: number; fin: number }; // epoch ms, [debut, fin)
export type Agenda = {
  /* jour ISO 1–7 → plages « HH:MM » en heure locale Guadeloupe */
  regles: { jour: number; debut: string; fin: string }[];
  indisponibles: Fenetre[]; // blocages + créneaux déjà pris, confondus
};

/* `jeton` : l'access token d'une session Supabase Auth. Présent, il prend
   la place de la clé dans Authorization — PostgREST exécute alors la
   fonction en rôle `authenticated`, avec auth.uid() renseigné. L'en-tête
   apikey garde la clé publishable dans les deux cas : c'est elle qui
   identifie le projet. */
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
    /* 03/09 — le code PostgREST (PGRST202 : fonction introuvable, PGRST301 :
       jeton refusé…) est ajouté au message, pour que reserver() puisse
       distinguer une base pas encore migrée d'une vraie panne. */
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

function dateIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** Charge les règles et toutes les plages indisponibles sur ~10 semaines. */
export async function chargerAgenda(): Promise<Agenda> {
  const auj = new Date();
  const fin = new Date(auj.getTime() + 70 * 86_400_000);
  type Brut = {
    regles: { jour: number; debut: string; fin: string }[];
    blocages: { debut: string; fin: string }[];
    occupes: { debut: string; fin: string }[];
  };
  const brut = await rpc<Brut>("agenda_public", {
    p_depuis: dateIso(auj),
    p_jusqua: dateIso(fin),
  });
  const enMs = (x: { debut: string; fin: string }): Fenetre => ({
    debut: Date.parse(x.debut),
    fin: Date.parse(x.fin),
  });
  return {
    regles: brut.regles ?? [],
    indisponibles: [...(brut.blocages ?? []), ...(brut.occupes ?? [])].map(enMs),
  };
}

/* ——— calcul des créneaux libres d'un jour donné ———
   `jourGp` est une date calendaire en Guadeloupe, exprimée par son année /
   mois / jour. Retourne des instants epoch ms, prêts à envoyer en ISO. */
export function creneauxDuJour(
  agenda: Agenda,
  annee: number,
  mois: number, // 1–12
  jour: number,
  dureeMin: number,
): number[] {
  /* jour ISO de la date en Guadeloupe : on fabrique midi UTC pour que le
     getUTCDay ne bascule pas d'un jour à cause du fuseau */
  const midi = new Date(Date.UTC(annee, mois - 1, jour, 12));
  const iso = midi.getUTCDay() === 0 ? 7 : midi.getUTCDay();
  const regles = agenda.regles.filter((r) => r.jour === iso);
  if (!regles.length) return [];

  /* plancher : maintenant + 3 h — la fonction SQL exige 2 h, la marge
     laisse le temps de remplir le formulaire sans se faire refuser.
     Plafond : l'horizon de dix semaines — au-delà, chargerAgenda n'a pas
     chargé les occupations et la fonction SQL refuserait de toute façon
     (creneau_trop_loin) : ces jours ne doivent JAMAIS s'afficher libres. */
  const plancher = Date.now() + 3 * 3_600_000;
  const plafond = Date.now() + HORIZON_JOURS * 86_400_000;
  const creneaux: number[] = [];

  for (const r of regles) {
    const [hd, md] = r.debut.split(":").map(Number);
    const [hf, mf] = r.fin.split(":").map(Number);
    const finRegle = Date.UTC(annee, mois - 1, jour, hf + DECALAGE_GP, mf);
    for (let h = hd, m = md; ; ) {
      const debut = Date.UTC(annee, mois - 1, jour, h + DECALAGE_GP, m);
      const fin = debut + dureeMin * 60_000;
      if (fin > finRegle) break;
      const libre =
        debut >= plancher &&
        debut <= plafond &&
        !agenda.indisponibles.some((x) => debut < x.fin && fin > x.debut);
      if (libre) creneaux.push(debut);
      m += 30;
      if (m >= 60) {
        m -= 60;
        h += 1;
      }
    }
  }
  return creneaux.sort((a, b) => a - b);
}

/* ——— libellés d'affichage, tout en heure de Guadeloupe ——— */

export function heureGp(instant: number): string {
  const d = new Date(instant - DECALAGE_GP * 3_600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")} h ${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function jourGpLabel(annee: number, mois: number, jour: number): string {
  const midi = new Date(Date.UTC(annee, mois - 1, jour, 12));
  return `${JOURS[midi.getUTCDay()]} ${jour} ${MOIS[mois - 1]}`;
}

export function moisLabel(mois: number, annee: number): string {
  const m = MOIS[mois - 1];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${annee}`;
}

/** L'heure du visiteur, si son fuseau n'est pas celui de la Guadeloupe. */
export function heureVisiteur(instant: number): string | null {
  const d = new Date(instant);
  if (d.getTimezoneOffset() === DECALAGE_GP * 60) return null;
  return `${String(d.getHours()).padStart(2, "0")} h ${String(d.getMinutes()).padStart(2, "0")}`;
}

/* ——— aujourd'hui, en date calendaire de Guadeloupe ——— */
export function aujourdhuiGp(): { annee: number; mois: number; jour: number } {
  const d = new Date(Date.now() - DECALAGE_GP * 3_600_000);
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
}

/** Le dernier jour réservable (J+70), en date calendaire de Guadeloupe —
    borne de navigation du calendrier. Même conversion que aujourdhuiGp :
    on RETRANCHE le décalage (la revue du 28/08 a attrapé un signe inversé
    qui ouvrait jusqu'à un mois de trop). */
export function horizonGp(): { annee: number; mois: number } {
  const d = new Date(Date.now() + HORIZON_JOURS * 86_400_000 - DECALAGE_GP * 3_600_000);
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1 };
}

/* ——— réservation ——— */

export type Demande = {
  parcours: "audit" | "reglage" | "devis";
  formule: string;
  profil: "tpe" | "equipe" | "";
  nom: string;
  prenom: string;
  email: string;
  entreprise: string;
  secteur: string;
  telephone?: string;
  commune?: string;
  message?: string;
  creneau?: number; // epoch ms — absent pour les formats sur devis
  /* parcours installation : les postes choisis sur /tarifs. Le prix n'est
     PAS envoyé — la fonction SQL le recalcule de sa propre grille. */
  modules?: string[];
  /* 02/09 — parcours installation : mensuel (défaut) ou annuel. Le prix
     annuel non plus n'est pas envoyé : la SQL applique sa propre remise
     (0,85 depuis le 03/09, équivalent mensuel arrondi à l'euro inférieur puis × 12 — la
     règle de lib/paliers.ts) sur sa propre grille et stocke l'instantané. */
  periodicite?: Periodicite;
};

export type Reponse = { ok: true; id: string } | { ok: false; erreur: string };

/** Envoie la demande. `jeton` (02/09) : la session du compte client, pour
    le parcours installation — voir rpc(). Un 401 (jeton expiré entre le
    chargement et l'envoi) se lit comme « connexion requise », pas comme
    une panne réseau. */
export async function reserver(d: Demande, jeton?: string): Promise<Reponse> {
  const corps: Record<string, unknown> = {
    p_parcours: d.parcours,
    p_formule: d.formule,
    p_profil: d.profil || null,
    p_nom: d.nom,
    p_prenom: d.prenom,
    p_email: d.email,
    p_entreprise: d.entreprise,
    p_secteur: d.secteur,
    p_telephone: d.telephone || null,
    p_commune: d.commune || null,
    p_message: d.message || null,
    p_creneau_debut: d.creneau ? new Date(d.creneau).toISOString() : null,
    p_modules: d.modules?.length ? d.modules : null,
    /* envoyé SEULEMENT quand le parcours le renseigne (installation) :
       PostgREST choisit la fonction d'après les noms d'arguments, un
       paramètre inconnu ferait échouer l'appel — l'audit et le devis
       n'en dépendent donc pas, la SQL a son défaut 'mensuel'. */
    ...(d.periodicite ? { p_periodicite: d.periodicite } : {}),
  };
  try {
    try {
      return await rpc<Reponse>("reserver_audit", corps, jeton);
    } catch (e) {
      /* 03/09 — CEINTURE : site déployé avant la migration
         periodicite-annuelle.sql. PostgREST ne connaît alors aucune
         reserver_audit acceptant p_periodicite (PGRST202) et TOUTE
         installation échouerait, mensuelle comprise. Une demande mensuelle
         est rejouée sans le paramètre (le défaut SQL vaut 'mensuel' : même
         résultat). Une demande ANNUELLE, elle, doit échouer plutôt que
         d'être stockée mensuelle à l'insu du client. L'ordre normal reste :
         migration d'abord, site ensuite — voir l'en-tête du fichier SQL. */
      if (!(e instanceof Error && /PGRST202/.test(e.message) && d.periodicite)) throw e;
      if (d.periodicite !== "mensuel") return { ok: false, erreur: "annuel_indisponible" };
      const sansPeriodicite = { ...corps };
      delete sansPeriodicite.p_periodicite;
      return await rpc<Reponse>("reserver_audit", sansPeriodicite, jeton);
    }
  } catch (e) {
    if (jeton && e instanceof Error && /: 401\b/.test(e.message)) {
      return { ok: false, erreur: "connexion_requise" };
    }
    return { ok: false, erreur: "reseau" };
  }
}

/* Ce que le visiteur lit quand ça ne passe pas — la fonction SQL parle en
   codes, la page parle en français. */
export const ERREURS: Record<string, string> = {
  creneau_pris:
    "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre : la grille vient de se mettre à jour.",
  creneau_passe: "Ce créneau est trop proche : choisissez un horaire à plus de deux heures.",
  creneau_trop_loin: "L'agenda est ouvert sur dix semaines : choisissez une date plus proche.",
  hors_horaires: "Ce créneau est en dehors des horaires d'ouverture.",
  creneau_non_aligne: "Ce créneau n'est pas valide. Rechargez la page et réessayez.",
  creneau_requis: "Choisissez un créneau avant d'envoyer votre demande.",
  trop_de_demandes:
    "Trois demandes sont déjà enregistrées avec cette adresse cette semaine. Écrivez-nous directement si c'est urgent.",
  champs_invalides: "Un des champs n'est pas valide — vérifiez l'adresse e-mail notamment.",
  formule_inconnue: "Ce format n'existe plus. Rechargez la page.",
  modules_requis: "Choisissez au moins un poste avant de réserver l'installation.",
  parcours_inconnu: "Ce parcours n'existe plus. Rechargez la page.",
  /* 02/09 — le verrou du parcours installation. Renvoyé par le module
     lui-même (pas de session) et, une fois la partie B du schéma
     appliquée, par la fonction SQL pour le parcours 'reglage' sans
     session : le code doit déjà savoir l'afficher. */
  connexion_requise: "Connectez-vous pour réserver votre installation.",
  /* 03/09 — la base n'accepte pas encore la formule annuelle (voir la
     ceinture dans reserver()) : on le dit plutôt que de stocker du mensuel */
  annuel_indisponible:
    "La formule annuelle n'est pas encore ouverte à la réservation en ligne. Passez en mensuel pour réserver dès maintenant, ou écrivez-nous.",
  reseau: "La réservation n'est pas partie — vérifiez votre connexion et réessayez.",
};

/* ——— secteurs proposés dans le formulaire ———
   Alignés sur les profils métier de l'armoire (btp, garage, immo,
   pharmacie, resto, services) + les deux cibles du moment sans profil
   dédié (commerce, tourisme) + la sortie de secours. La valeur stockée est
   la clé, pas le libellé. */
export const SECTEURS: { valeur: string; libelle: string }[] = [
  { valeur: "btp", libelle: "Bâtiment & travaux" },
  { valeur: "garage", libelle: "Garage & atelier automobile" },
  { valeur: "commerce", libelle: "Commerce & boutique" },
  { valeur: "resto", libelle: "Restauration & traiteur" },
  { valeur: "tourisme", libelle: "Tourisme & hébergement" },
  { valeur: "immo", libelle: "Agence immobilière" },
  { valeur: "pharmacie", libelle: "Pharmacie d'officine" },
  { valeur: "services", libelle: "Services & prestataires" },
  { valeur: "autre", libelle: "Autre activité" },
];
