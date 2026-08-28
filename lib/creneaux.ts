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

   Pas de @supabase/supabase-js : deux appels fetch sur l'API REST
   suffisent, et le site reste sans dépendance nouvelle.

   Le double de la logique horaire (fuseau, alignement 30 min) existe côté
   SQL : en cas de divergence, c'est TOUJOURS la fonction SQL qui gagne —
   ici on filtre juste ce qu'on affiche.
   ══════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL = "https://noepmkkplxshjbmqqxft.supabase.co";
/* Clé « publishable » : publique par conception (elle passe par RLS et ne
   peut appeler que ce qui est accordé à `anon`). Rien de secret ici. */
const SUPABASE_KEY = "sb_publishable_9TSwcnUkHIOol1FIxEVWPw_F4HRnhqS";

/* La Guadeloupe vit en UTC−4 toute l'année — pas d'heure d'été depuis
   1911, le décalage est une constante, pas une approximation. La fonction
   SQL revérifie de toute façon en zone America/Guadeloupe. */
const DECALAGE_GP = 4;

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

async function rpc<T>(fonction: string, corps: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fonction}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(corps),
  });
  if (!r.ok) throw new Error(`rpc ${fonction} : ${r.status}`);
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
     laisse le temps de remplir le formulaire sans se faire refuser */
  const plancher = Date.now() + 3 * 3_600_000;
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
};

export type Reponse = { ok: true; id: string } | { ok: false; erreur: string };

export async function reserver(d: Demande): Promise<Reponse> {
  try {
    return await rpc<Reponse>("reserver_audit", {
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
    });
  } catch {
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
