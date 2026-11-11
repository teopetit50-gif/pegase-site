/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — l'agenda de Teo (11/11/2026)

   Deux sources, réunies dans la forme RendezVous de ./types :
     · depuis le soir du 11/11, LES RENDEZ-VOUS DU TABLEAU DES ASSOCIÉS
       (projet 1, public.rendez_vous, lus avec la session de Teo sur le
       tableau, ./tableau) : ceux que Teo tient, et ceux de Timothée où
       Teo est (avec_teo — « un rendez-vous de Timothée est aussi à Teo »,
       règle de Teo du 05/11) ; une heure à confirmer vaut « provisoire »,
       un rendez-vous annulé reste, barré ;
     · l'agenda Google GOOGLE_CALENDAR_ID (« primary » par défaut, le même
       que lib/visio.ts, où les audits réservés sur le site se posent déjà
       avec leur salle Meet), si le jeton GOOGLE_OAUTH_* est posé : deux
       mois en arrière, quatre mois en avant, les récurrences dépliées.
   Chaque source dit son état ; la page les montre honnêtement.
   ══════════════════════════════════════════════════════════════════════ */

import { accesGoogle, appelGoogle, porteAgenda } from "./google";
import { TABLEAU_ADRESSE, associeDe, clientTableau, sessionTableau } from "./tableau";
import type { EtatGoogle, EtatTableau, RendezVous } from "./types";

const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars";
const JOUR = 86_400_000;

/* ——— Google ——— */
type EvenementGoogle = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email: string; displayName?: string; responseStatus?: string; self?: boolean }[];
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
};

const REPONSES: Record<string, RendezVous["invites"][number]["reponse"]> = { accepted: "oui", declined: "non", tentative: "peut-etre", needsAction: "attente" };

function versRendezVous(e: EvenementGoogle, agenda: string): RendezVous | null {
  const debut = e.start?.dateTime ?? e.start?.date;
  const fin = e.end?.dateTime ?? e.end?.date;
  if (!debut || !fin) return null;
  const journee = !e.start?.dateTime;
  const visio = e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? null;
  return {
    id: e.id,
    titre: e.summary?.trim() || "(sans titre)",
    debut,
    /* Google met la fin d'une journée entière au lendemain (exclusif) : on la ramène au dernier jour */
    fin: journee ? new Date(Date.parse(`${fin}T00:00:00Z`) - JOUR).toISOString().slice(0, 10) : fin,
    journee,
    lieu: e.location?.trim() || null,
    description: e.description?.trim() || null,
    visio,
    invites: (e.attendees ?? []).filter((a) => !a.self).map((a) => ({ nom: a.displayName ?? null, email: a.email, reponse: REPONSES[a.responseStatus ?? ""] ?? "attente" })),
    statut: e.status === "cancelled" ? "annule" : e.status === "tentative" ? "provisoire" : "confirme",
    lien: e.htmlLink ?? null,
    agenda,
    origine: "google",
  };
}

export type LectureGoogle = { etat: EtatGoogle; detail: string | null; rendezVous: RendezVous[] };

export async function lireAgendaGoogle(): Promise<LectureGoogle> {
  const acces = await accesGoogle();
  if (acces.etat !== "ok") return { etat: acces.etat, detail: acces.detail, rendezVous: [] };
  if (!porteAgenda(acces.portees)) return { etat: "portee", detail: "Le jeton Google ne porte pas l'agenda.", rendezVous: [] };
  const agenda = process.env.GOOGLE_CALENDAR_ID?.trim() || "primary";
  const maintenant = Date.now();
  const q = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    showDeleted: "false",
    maxResults: "250",
    timeMin: new Date(maintenant - 62 * JOUR).toISOString(),
    timeMax: new Date(maintenant + 124 * JOUR).toISOString(),
  });
  try {
    const r = await appelGoogle<{ items?: EvenementGoogle[]; summary?: string }>(acces.jeton, `${CALENDAR}/${encodeURIComponent(agenda)}/events?${q}`);
    const nom = r.summary ?? agenda;
    return { etat: "ok", detail: null, rendezVous: (r.items ?? []).map((e) => versRendezVous(e, nom)).filter((x): x is RendezVous => !!x) };
  } catch (e) {
    console.error("[teo/agenda]", e instanceof Error ? e.message : e);
    return { etat: "erreur", detail: e instanceof Error ? e.message : "L'agenda n'a pas répondu.", rendezVous: [] };
  }
}

/* ——— le tableau des associés ——— */
type RdvTableau = {
  id: string;
  associe: string;
  titre: string;
  debut: string;
  fin: string | null;
  duree: number | null;
  lieu: string | null;
  notes: string | null;
  preparation: string | null;
  prospect_id: string | null;
  invite_nom: string | null;
  invite_email: string | null;
  email_client: string | null;
  lien_visio: string | null;
  annule_le: string | null;
  type: string;
  etat: string;
  avec_teo: boolean;
  heure_ac: boolean;
  fait: boolean;
  google_event_id: string | null;
  prospects: { nom: string; contact: string | null; email: string | null; telephone: string | null } | null;
};

const estMeet = (lieu: string | null) => /visio|meet|teams|zoom/i.test(lieu ?? "");

function versRendezVousTableau(r: RdvTableau): RendezVous {
  const qui = associeDe(r.associe);
  const p = r.prospects;
  const fin = r.fin ?? new Date(Date.parse(r.debut) + (r.duree ?? 45) * 60_000).toISOString();
  const invites: RendezVous["invites"] = [];
  const mailClient = r.email_client?.trim() || r.invite_email?.trim() || p?.email?.trim() || null;
  if (mailClient && r.type !== "recontact") invites.push({ nom: r.invite_nom?.trim() || p?.contact?.trim() || p?.nom || null, email: mailClient.toLowerCase(), reponse: r.google_event_id ? "attente" : "oui" });
  const description = [r.notes?.trim() || null, p ? `${p.contact?.trim() ? `${p.contact.trim()}, ` : ""}${p.nom}${p.telephone ? ` · ${p.telephone}` : ""}` : null, r.preparation?.trim() ? `Préparation : ${r.preparation.trim()}` : null].filter(Boolean).join("\n");
  return {
    id: r.id,
    titre: r.type === "recontact" && !/relancer/i.test(r.titre) ? `À relancer · ${r.titre}` : r.titre,
    debut: new Date(r.debut).toISOString(),
    fin: new Date(fin).toISOString(),
    journee: false,
    lieu: r.lieu?.trim() && !estMeet(r.lieu) ? r.lieu.trim() : r.lieu?.trim() && !r.lien_visio ? r.lieu.trim() : null,
    description: description || null,
    visio: r.lien_visio?.trim() || null,
    invites,
    statut: r.annule_le ? "annule" : r.heure_ac || r.etat === "a_caler" ? "provisoire" : "confirme",
    lien: `${TABLEAU_ADRESSE}/tableau/rendez-vous`,
    agenda: `Tableau des associés · ${qui}`,
    origine: "tableau",
  };
}

export type LectureTableau = { etat: EtatTableau; detail: string | null; compte: string | null; rendezVous: RendezVous[] };

export async function lireAgendaTableau(): Promise<LectureTableau> {
  const session = await sessionTableau();
  if (session.etat !== "ok") return { etat: session.etat, detail: session.detail, compte: null, rendezVous: [] };
  try {
    const supabase = await clientTableau();
    const { data, error } = await supabase
      .from("rendez_vous")
      .select("id, associe, titre, debut, fin, duree, lieu, notes, preparation, prospect_id, invite_nom, invite_email, email_client, lien_visio, annule_le, type, etat, avec_teo, heure_ac, fait, google_event_id, prospects(nom, contact, email, telephone)")
      .order("debut", { ascending: true })
      .limit(2000);
    if (error) return { etat: "erreur", detail: error.message, compte: session.email, rendezVous: [] };
    const lignes = (data ?? []) as unknown as RdvTableau[];
    /* ceux de Teo, et ceux de Timothée où Teo est (avec_teo) ; Timothée lui-même les verrait tous */
    const miens = session.associe === "Teo" ? lignes.filter((r) => associeDe(r.associe) === "Teo" || r.avec_teo) : lignes;
    return { etat: "ok", detail: null, compte: session.email, rendezVous: miens.map(versRendezVousTableau) };
  } catch (e) {
    return { etat: "erreur", detail: e instanceof Error ? e.message : "Le tableau n'a pas répondu.", compte: session.email, rendezVous: [] };
  }
}

/* ——— les deux, réunis ——— */
export type LectureAgenda = { etat: EtatGoogle; detail: string | null; tableau: EtatTableau; detailTableau: string | null; compteTableau: string | null; rendezVous: RendezVous[] };

export async function lireAgenda(): Promise<LectureAgenda> {
  const [google, tableau] = await Promise.all([lireAgendaGoogle(), lireAgendaTableau()]);
  return {
    etat: google.etat,
    detail: google.detail,
    tableau: tableau.etat,
    detailTableau: tableau.detail,
    compteTableau: tableau.compte,
    rendezVous: [...tableau.rendezVous, ...google.rendezVous].sort((a, b) => a.debut.localeCompare(b.debut)),
  };
}
