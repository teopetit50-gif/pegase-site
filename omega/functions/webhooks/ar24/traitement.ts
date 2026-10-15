// Webhook AR24 : changement d'état d'une lettre recommandée électronique (fournisseur « ar24 »).
// D'après la documentation d'AR24 (developers.ar24.fr/doc, « Registered letter webhook », lue le 15/10/2026) :
//   POST à chaque changement d'état, champs id_mail, new_state, proof_url, view_date, refused_date,
//   negligence_date, ts_ev_date, ts_bc_date, custom_ref ; depuis 185.183.140.197 ; rejoué toutes les
//   15 min (48 fois) tant que la réponse n'est pas 200.
// AR24 ne signe pas ses webhooks. Deux gardes :
//   1. un jeton dans l'URL (?jeton=AR24_WEBHOOK_JETON), posé dans AR24_WEBHOOK_URL côté expediteur ;
//   2. on ne croit pas le corps : on relit la LRE par l'API signée (GET /mail?id=) et on ne note
//      l'état que si AR24 le confirme. Les dates et la preuve notées viennent de cette relecture.
// États → noter_remise : ar → remis ; refused, negligence, fail, cancelled_* → refuse ; bounced → rebond.
// ev (dépôt) et les autres états ne changent rien. 200 aussi pour un état ignoré ou une LRE inconnue
// (AR24 n'a rien à rejouer) ; 503 quand l'API AR24 ou la porte tombe, pour qu'AR24 rejoue.

import type { ClientAr24 } from "../../expediteur/ar24.ts";
import type { EvenementRemise, Portes } from "../brevo/portes.ts";
import { memeSecret } from "../brevo/traitement.ts";

export type Journal = {
  info(message: string, detail?: Record<string, unknown>): void;
  erreur(message: string, detail?: Record<string, unknown>): void;
};

export type Dependances = {
  portes: Portes;
  /** null tant qu'AR24_TOKEN et AR24_CLE_PRIVEE ne sont pas posés. */
  ar24: ClientAr24 | null;
  /** AR24_WEBHOOK_JETON ; null → webhook refusé (503). */
  jeton: string | null;
  journal: Journal;
};

type Objet = Record<string, unknown>;

type RegleEtat = {
  evenement: EvenementRemise;
  libelle: string;
  /** Champ de date (heure de Paris) de la relecture qui prouve l'état et le date. */
  date: string | null;
  preuve: string | null;
  confirme: (o: Objet) => boolean;
};

const statut = (o: Objet) => String(o.status ?? "").toLowerCase();
const rempli = (v: unknown) =>
  typeof v === "string" ? v.trim() !== "" : v !== null && v !== undefined;

export const ETATS: Record<string, RegleEtat> = {
  ar: {
    evenement: "remis",
    libelle: "accusé de réception (lettre ouverte)",
    date: "view_date",
    preuve: "proof_ar_url",
    confirme: (o) => statut(o) === "ar" || rempli(o.view_date),
  },
  refused: {
    evenement: "refuse",
    libelle: "refusée par le destinataire",
    date: "refused_date",
    preuve: "proof_rf_url",
    confirme: (o) => statut(o) === "refused" || rempli(o.refused_date),
  },
  negligence: {
    evenement: "refuse",
    libelle: "négligence : non retirée dans les 15 jours",
    date: "negligence_date",
    preuve: "proof_ng_url",
    confirme: (o) => statut(o) === "negligence" || rempli(o.negligence_date),
  },
  bounced: {
    evenement: "rebond",
    libelle: "adresse du destinataire en erreur",
    date: "ts_bc_date",
    preuve: "proof_bc_url",
    confirme: (o) =>
      ["bounced", "bounce"].includes(statut(o)) || rempli(o.ts_bc_date) ||
      rempli(o.bounce_code),
  },
  fail: {
    evenement: "refuse",
    libelle: "erreur interne d'AR24, non distribuée",
    date: null,
    preuve: null,
    confirme: (o) => statut(o) === "fail" || o.send_fail === true,
  },
  cancelled_by_user: {
    evenement: "refuse",
    libelle: "LRE eIDAS annulée sur AR24, non distribuée",
    date: null,
    preuve: null,
    confirme: (o) => statut(o) === "cancelled_by_user",
  },
  cancelled_after_7_days: {
    evenement: "refuse",
    libelle: "LRE eIDAS non validée dans les 7 jours, non distribuée",
    date: null,
    preuve: null,
    confirme: (o) => statut(o) === "cancelled_after_7_days",
  },
};

/** « YYYY-MM-DD hh:mm:ss » à l'heure de Paris → ISO UTC ; null si illisible. */
export function depuisHeureParis(texte: unknown): string | null {
  if (typeof texte !== "string") return null;
  const m = texte.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!m) return null;
  const [a, mo, j, h, mi, se] = m.slice(1).map(Number);
  const naif = Date.UTC(a, mo - 1, j, h, mi, se);
  // Décalage de Paris à cet instant (calculé deux fois pour les heures proches d'un changement d'heure).
  const decalage = (t: number) => {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(t));
    const v = (k: string) => Number(p.find((x) => x.type === k)?.value);
    return Date.UTC(
      v("year"),
      v("month") - 1,
      v("day"),
      v("hour"),
      v("minute"),
      v("second"),
    ) - t;
  };
  let t = naif - decalage(naif);
  t = naif - decalage(t);
  return new Date(t).toISOString();
}

/** Le corps d'AR24 : JSON ou formulaire (le type n'est pas documenté). */
export function lireCorps(brut: string): Objet | null {
  const t = brut.trim();
  if (!t) return null;
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t);
      return o && typeof o === "object" ? o as Objet : null;
    } catch {
      return null;
    }
  }
  return Object.fromEntries(new URLSearchParams(t));
}

export type Issue =
  | { sortie: "note" | "inconnue"; id_mail: string; etat: string }
  | {
    sortie: "ignore";
    id_mail: string | null;
    etat: string | null;
    raison: string;
  }
  | {
    sortie: "non_confirme";
    id_mail: string;
    etat: string;
    statut_ar24: string;
  };

function reponse(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

export async function traiterRequete(
  req: Request,
  deps: Dependances,
): Promise<Response> {
  if (req.method !== "POST") {
    return reponse(405, { erreur: "méthode non autorisée" });
  }
  if (!deps.jeton) {
    deps.journal.erreur(
      "AR24_WEBHOOK_JETON absent : webhook refusé tant qu'il n'est pas posé",
    );
    return reponse(503, { erreur: "webhook non configuré" });
  }
  const recu = new URL(req.url).searchParams.get("jeton");
  if (!recu || !memeSecret(recu, deps.jeton)) {
    deps.journal.erreur("jeton de webhook AR24 invalide ou absent");
    return reponse(401, { erreur: "jeton invalide" });
  }
  const corps = lireCorps(await req.text());
  const idMail = corps && /^\d{1,20}$/.test(String(corps.id_mail ?? ""))
    ? String(corps.id_mail)
    : null;
  const etat = corps && typeof corps.new_state === "string"
    ? corps.new_state.toLowerCase()
    : null;
  if (!idMail || !etat) {
    return reponse(400, { erreur: "id_mail ou new_state manquant" });
  }
  const regle = ETATS[etat];
  if (!regle) {
    const issue: Issue = {
      sortie: "ignore",
      id_mail: idMail,
      etat,
      raison: "état sans effet sur la remise",
    };
    deps.journal.info("webhook AR24 ignoré", issue);
    return reponse(200, issue);
  }
  if (!deps.ar24) {
    deps.journal.erreur(
      "AR24_TOKEN / AR24_CLE_PRIVEE absents : relecture impossible, AR24 rejouera",
      {
        id_mail: idMail,
        etat,
      },
    );
    return reponse(503, { erreur: "AR24 non branché" });
  }

  let lre: Objet;
  try {
    lre = await deps.ar24.lire(idMail);
  } catch (e) {
    const definitif = (e as { definitif?: boolean }).definitif === true;
    deps.journal.erreur("relecture de la LRE impossible", {
      id_mail: idMail,
      etat,
      erreur: String(e).slice(0, 300),
    });
    // LRE inconnue de ce compte (erreur métier) : rien à rejouer. Panne : AR24 rejouera.
    return definitif
      ? reponse(200, {
        sortie: "ignore",
        id_mail: idMail,
        etat,
        raison: "LRE inconnue d'AR24 pour ce compte",
      })
      : reponse(503, { erreur: "AR24 indisponible" });
  }
  if (String(lre.id ?? "") !== idMail || !regle.confirme(lre)) {
    const issue: Issue = {
      sortie: "non_confirme",
      id_mail: idMail,
      etat,
      statut_ar24: statut(lre),
    };
    deps.journal.erreur(
      "état du webhook non confirmé par l'API AR24 : rien n'est noté",
      issue,
    );
    return reponse(200, issue);
  }

  const preuve = regle.preuve && typeof lre[regle.preuve] === "string"
    ? lre[regle.preuve] as string
    : null;
  const precision = etat === "bounced" && typeof lre.bounce_message === "string"
    ? ` (${lre.bounce_code ?? ""} ${lre.bounce_message})`.replace("( ", "(")
    : "";
  const raison = `${regle.libelle}${precision}${
    preuve ? ` ; preuve : ${preuve}` : ""
  }`;
  const survenuLe = regle.date ? depuisHeureParis(lre[regle.date]) : null;
  const cle = `ar24:${idMail}:${etat}`;
  let trouve: boolean;
  try {
    trouve = await deps.portes.noterRemise(
      "ar24",
      idMail,
      regle.evenement,
      { code: etat, raison },
      survenuLe,
      cle,
    );
  } catch (e) {
    deps.journal.erreur("noter_remise a échoué, AR24 rejouera", {
      id_mail: idMail,
      etat,
      erreur: String(e).slice(0, 300),
    });
    return reponse(503, { erreur: "porte indisponible" });
  }
  const issue: Issue = {
    sortie: trouve ? "note" : "inconnue",
    id_mail: idMail,
    etat,
  };
  deps.journal.info(
    trouve ? "remise AR24 notée" : "LRE AR24 sans envoi connu",
    { ...issue, survenu_le: survenuLe },
  );
  return reponse(200, issue);
}
