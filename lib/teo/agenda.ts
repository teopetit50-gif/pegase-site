/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — l'agenda Google de Teo (11/11/2026)

   Les événements de l'agenda GOOGLE_CALENDAR_ID (« primary » par défaut,
   le même que lib/visio.ts, où les audits réservés sur le site se posent
   déjà avec leur salle Meet) : deux mois en arrière, quatre mois en avant,
   les récurrences dépliées. Rendus dans la forme RendezVous de ./types.
   ══════════════════════════════════════════════════════════════════════ */

import { accesGoogle, appelGoogle, porteAgenda } from "./google";
import type { EtatGoogle, RendezVous } from "./types";

const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars";
const JOUR = 86_400_000;

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
  };
}

export type LectureAgenda = { etat: EtatGoogle; detail: string | null; rendezVous: RendezVous[] };

export async function lireAgenda(): Promise<LectureAgenda> {
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
