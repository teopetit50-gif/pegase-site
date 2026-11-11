/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — les clients et prospects de Teo (11/11/2026, soir)

   Jusqu'au 11/11 à midi : les contacts du pilotage (omega_contacts). Depuis
   le soir, Teo : « connecte mon CRM du dashboard associé » — ce sont les
   PROSPECTS DU TABLEAU DES ASSOCIÉS (projet 1, table public.prospects, le
   pipeline de /tableau/pipeline), avec leurs appels (public.appels) et
   leurs rendez-vous (public.rendez_vous) en journal des échanges. Lus et
   écrits avec la session de Teo sur le tableau (./tableau) : ce qui se
   note ici se voit dans le tableau à l'instant, et l'inverse.

   La correspondance avec la forme ClientTeo (./types) :
     · nom ↔ prospects.contact (la personne) quand il y en a un, sinon
       prospects.nom (l'entreprise) ; entreprise ↔ prospects.nom ;
     · type ↔ statut (client → Client, pilote → Pilote, sinon Prospect) ;
     · etape ↔ etape (la colonne du pipeline, PIPELINE de ./types) ;
     · commune ↔ territoire ; courriel ↔ email ; note ↔ notes ;
       prochaine_date ↔ prochaine_action_le ; suivi_par ↔ proprietaire.
   ══════════════════════════════════════════════════════════════════════ */

import { associeDe, clientTableau, sessionTableau } from "./tableau";
import { PIPELINE, type ClientTeo, type EtatTableau } from "./types";

type Prospect = {
  id: string;
  cree_le: string;
  maj_le: string;
  nom: string;
  contact: string | null;
  secteur: string | null;
  territoire: string | null;
  email: string | null;
  telephone: string | null;
  source: string | null;
  statut: string;
  etape: string | null;
  prochaine_action: string | null;
  prochaine_action_le: string | null;
  notes: string | null;
  proprietaire: string | null;
};
type Appel = { id: string; cree_le: string; prospect_id: string | null; associe: string; date_appel: string | null; source: string | null; resume: string | null; transcription: string | null; prochaine_action: string | null };
type Rdv = { id: string; prospect_id: string | null; associe: string; titre: string; debut: string; type: string; annule_le: string | null };

const COLONNES = "id, cree_le, maj_le, nom, contact, secteur, territoire, email, telephone, source, statut, etape, prochaine_action, prochaine_action_le, notes, proprietaire";

const etapeDe = (cle: string | null) => PIPELINE.find((e) => e.cle === cle) ?? PIPELINE[0];
const cleEtape = (libelle: string) => PIPELINE.find((e) => e.libelle === libelle) ?? null;
const typeDe = (statut: string) => (statut === "client" ? "Client" : statut === "pilote" ? "Pilote" : "Prospect");
const STATUT_DU_TYPE: Record<string, string> = { Client: "client", Pilote: "pilote" };

function versClient(p: Prospect, echanges: ClientTeo["echanges"]): ClientTeo {
  return {
    id: p.id,
    nom: p.contact?.trim() || p.nom,
    entreprise: p.contact?.trim() ? p.nom : null,
    role: null,
    type: typeDe(p.statut),
    etape: etapeDe(p.etape).libelle,
    suivi_par: p.proprietaire ? associeDe(p.proprietaire) : null,
    telephone: p.telephone,
    courriel: p.email,
    commune: p.territoire,
    secteur: p.secteur,
    source: p.source,
    prochaine_action: p.prochaine_action,
    prochaine_date: p.prochaine_action_le,
    note: p.notes,
    maj: p.maj_le,
    echanges,
  };
}

export type LectureClients = { etat: EtatTableau; detail: string | null; compte: string | null; clients: ClientTeo[] };

export async function lireClients(): Promise<LectureClients> {
  const session = await sessionTableau();
  if (session.etat !== "ok") return { etat: session.etat, detail: session.detail, compte: null, clients: [] };
  try {
    const supabase = await clientTableau();
    const [lp, la, lr] = await Promise.all([
      supabase.from("prospects").select(COLONNES).order("maj_le", { ascending: false }).limit(2000),
      supabase.from("appels").select("id, cree_le, prospect_id, associe, date_appel, source, resume, transcription, prochaine_action").order("date_appel", { ascending: false }).limit(2000),
      supabase.from("rendez_vous").select("id, prospect_id, associe, titre, debut, type, annule_le").order("debut", { ascending: false }).limit(2000),
    ]);
    const erreur = lp.error ?? la.error ?? lr.error;
    if (erreur) return { etat: "erreur", detail: erreur.message, compte: session.email, clients: [] };
    const par = new Map<string, ClientTeo["echanges"]>();
    const ajouter = (id: string | null, e: ClientTeo["echanges"][number]) => {
      if (!id) return;
      const l = par.get(id) ?? [];
      l.push(e);
      par.set(id, l);
    };
    for (const a of (la.data ?? []) as Appel[]) {
      const resume = a.resume?.trim() || a.transcription?.trim().slice(0, 240) || a.prochaine_action?.trim() || `Appel de ${associeDe(a.associe)}`;
      ajouter(a.prospect_id, { id: `appel-${a.id}`, quand: a.date_appel ?? a.cree_le, canal: a.source?.trim() || "Appel", resume });
    }
    for (const r of (lr.data ?? []) as Rdv[]) {
      if (r.annule_le) continue;
      ajouter(r.prospect_id, { id: `rdv-${r.id}`, quand: r.debut, canal: r.type === "recontact" ? "Relance" : "Rendez-vous", resume: `${r.titre} (${associeDe(r.associe)})` });
    }
    return { etat: "ok", detail: null, compte: session.email, clients: ((lp.data ?? []) as Prospect[]).map((p) => versClient(p, par.get(p.id) ?? [])) };
  } catch (e) {
    return { etat: "erreur", detail: e instanceof Error ? e.message : "Le tableau n'a pas répondu.", compte: session.email, clients: [] };
  }
}

export type ChampsClient = Partial<Pick<ClientTeo, "etape" | "type" | "prochaine_action" | "prochaine_date" | "note" | "telephone" | "courriel" | "commune" | "entreprise" | "role" | "nom" | "secteur" | "source">>;

export async function changerClient(id: string, champs: ChampsClient): Promise<string | null> {
  const supabase = await clientTableau();
  const ligne: Record<string, unknown> = { maj_le: new Date().toISOString() };
  if (champs.etape !== undefined) {
    const e = cleEtape(champs.etape);
    if (!e) return `Étape inconnue du tableau : ${champs.etape}.`;
    ligne.etape = e.cle;
    ligne.statut = e.statut;
  }
  if (champs.type !== undefined && STATUT_DU_TYPE[champs.type]) ligne.statut = STATUT_DU_TYPE[champs.type];
  else if (champs.type === "Prospect" && champs.etape === undefined) {
    const { data } = await supabase.from("prospects").select("etape").eq("id", id).maybeSingle();
    ligne.statut = etapeDe((data as { etape: string | null } | null)?.etape ?? null).statut;
  }
  if (champs.prochaine_action !== undefined) ligne.prochaine_action = champs.prochaine_action;
  if (champs.prochaine_date !== undefined) ligne.prochaine_action_le = champs.prochaine_date;
  if (champs.note !== undefined) ligne.notes = champs.note;
  if (champs.telephone !== undefined) ligne.telephone = champs.telephone;
  if (champs.courriel !== undefined) ligne.email = champs.courriel;
  if (champs.commune !== undefined) ligne.territoire = champs.commune;
  if (champs.secteur !== undefined) ligne.secteur = champs.secteur;
  if (champs.source !== undefined) ligne.source = champs.source;
  if (champs.nom !== undefined || champs.entreprise !== undefined) {
    /* nom ↔ contact ou nom, entreprise ↔ nom : on relit la fiche pour savoir laquelle des deux colonnes bouge */
    const { data } = await supabase.from("prospects").select("nom, contact").eq("id", id).maybeSingle();
    const p = data as { nom: string; contact: string | null } | null;
    const contact = p?.contact?.trim() || null;
    if (champs.entreprise !== undefined) {
      if (champs.entreprise) ligne.nom = champs.entreprise;
      else if (contact) {
        ligne.nom = contact;
        ligne.contact = null;
      }
      if (champs.entreprise && !contact && p) ligne.contact = p.nom;
    }
    if (champs.nom !== undefined && champs.nom) {
      if (contact || ligne.contact) ligne.contact = champs.nom;
      else ligne.nom = champs.nom;
    }
  }
  const { error } = await supabase.from("prospects").update(ligne).eq("id", id);
  return error ? error.message : null;
}

export async function noterEchange(id: string, canal: string, resume: string): Promise<{ echange: ClientTeo["echanges"][number] | null; detail: string | null }> {
  const session = await sessionTableau();
  if (session.etat !== "ok") return { echange: null, detail: "Le tableau des associés n'est pas branché." };
  const supabase = await clientTableau();
  const quand = new Date().toISOString();
  const { data, error } = await supabase.from("appels").insert({ prospect_id: id, associe: session.associe, date_appel: quand, source: canal, resume }).select("id, date_appel, source, resume").single();
  if (error || !data) return { echange: null, detail: error?.message ?? "Le tableau n'a pas répondu." };
  await supabase.from("prospects").update({ maj_le: quand }).eq("id", id);
  const a = data as { id: string; date_appel: string; source: string; resume: string };
  return { echange: { id: `appel-${a.id}`, quand: a.date_appel, canal: a.source, resume: a.resume }, detail: null };
}

export async function creerClient(c: { nom: string; entreprise: string; type: string; etape: string; telephone: string; courriel: string; commune: string; secteur: string }): Promise<{ client: ClientTeo | null; detail: string | null }> {
  const session = await sessionTableau();
  if (session.etat !== "ok") return { client: null, detail: "Le tableau des associés n'est pas branché." };
  const supabase = await clientTableau();
  const e = cleEtape(c.etape) ?? PIPELINE[0];
  const entreprise = c.entreprise.trim();
  const ligne = {
    nom: entreprise || c.nom.trim(),
    contact: entreprise ? c.nom.trim() : null,
    statut: STATUT_DU_TYPE[c.type] ?? e.statut,
    etape: e.cle,
    telephone: c.telephone.trim() || null,
    email: c.courriel.trim() || null,
    territoire: c.commune.trim() || null,
    secteur: c.secteur.trim() || null,
    proprietaire: session.associe,
    source: "Mon espace",
  };
  const { data, error } = await supabase.from("prospects").insert(ligne).select(COLONNES).single();
  if (error || !data) return { client: null, detail: error?.message ?? "Le tableau n'a pas répondu." };
  return { client: versClient(data as Prospect, []), detail: null };
}
