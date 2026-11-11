/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — les clients et prospects de Teo (11/11/2026)

   Les contacts suivis du pilotage (/omega/contacts : omega_contacts et leur
   journal omega_echanges, réservés aux admins par RLS), rendus dans la
   forme ClientTeo de ./types. Les gestes (une étape, un échange, un
   nouveau client) écrivent dans les mêmes tables, sous la session du
   gérant : ce qui se note ici se voit dans le pilotage, et l'inverse.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";
import { lireContactsSuivis } from "@/lib/omega/donnees";
import type { ClientTeo } from "./types";

/* les listes (types, étapes, canaux) sont dans ./types : ce fichier lit les cookies, un composant client ne doit pas l'importer */

const COLONNES = "id, nom, entreprise, role, type, telephone, courriel, commune, secteur, etape, source, prochaine_action, prochaine_date, note, maj";

export async function lireClients(): Promise<{ clients: ClientTeo[]; detail: string | null }> {
  try {
    const { contacts, echanges } = await lireContactsSuivis();
    const par = new Map<number, ClientTeo["echanges"]>();
    for (const e of echanges) {
      const l = par.get(e.contact_id) ?? [];
      l.push({ id: String(e.id), quand: e.quand, canal: e.canal, resume: e.resume });
      par.set(e.contact_id, l);
    }
    return {
      clients: contacts.map((c) => ({
        id: String(c.id),
        nom: c.nom,
        entreprise: c.entreprise,
        role: c.role,
        type: c.type,
        etape: c.etape,
        telephone: c.telephone,
        courriel: c.courriel,
        commune: c.commune,
        secteur: c.secteur,
        source: c.source,
        prochaine_action: c.prochaine_action,
        prochaine_date: c.prochaine_date,
        note: c.note,
        maj: c.maj,
        echanges: par.get(c.id) ?? [],
      })),
      detail: null,
    };
  } catch (e) {
    return { clients: [], detail: e instanceof Error ? e.message : "La base n'a pas répondu." };
  }
}

export async function changerClient(id: string, champs: Partial<Pick<ClientTeo, "etape" | "type" | "prochaine_action" | "prochaine_date" | "note" | "telephone" | "courriel" | "commune" | "entreprise" | "role">>): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("omega_contacts").update({ ...champs, maj: new Date().toISOString() }).eq("id", Number(id));
  return error ? error.message : null;
}

export async function noterEchange(id: string, canal: string, resume: string): Promise<{ echange: ClientTeo["echanges"][number] | null; detail: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("omega_echanges").insert({ contact_id: Number(id), canal, resume }).select("id, contact_id, quand, canal, resume").single();
  if (error || !data) return { echange: null, detail: error?.message ?? "La base n'a pas répondu." };
  await supabase.from("omega_contacts").update({ maj: new Date().toISOString() }).eq("id", Number(id));
  return { echange: { id: String(data.id), quand: data.quand, canal: data.canal, resume: data.resume }, detail: null };
}

export async function creerClient(c: { nom: string; entreprise: string; type: string; etape: string; telephone: string; courriel: string; commune: string; secteur: string }): Promise<{ client: ClientTeo | null; detail: string | null }> {
  const supabase = await createClient();
  const ligne = {
    nom: c.nom.trim(),
    entreprise: c.entreprise.trim() || null,
    type: c.type || "Prospect",
    etape: c.etape || "À contacter",
    telephone: c.telephone.trim() || null,
    courriel: c.courriel.trim() || null,
    commune: c.commune.trim() || null,
    secteur: c.secteur.trim() || null,
  };
  const { data, error } = await supabase.from("omega_contacts").insert(ligne).select(COLONNES).single();
  if (error || !data) return { client: null, detail: error?.message ?? "La base n'a pas répondu." };
  return { client: { ...data, id: String(data.id), echanges: [] } as ClientTeo, detail: null };
}
