/* ══════════════════════════════════════════════════════════════════════
   Les portes REPUT — côté navigateur, sous RLS (06/10/2026, session C3)

   Lecture : les tables reput_demandes, reput_reponses, reput_connaissances,
   reput_sujets (SELECT sous RLS, périmètre d'entité), la réception par
   public.receptions (RLS du socle), l'état des accords par reput_accords.
   Écriture : UNIQUEMENT par les portes publiques — reput_decider,
   reput_corriger (c3_03), reput_ecrire_connaissance,
   reput_valider_connaissance, reput_retirer_connaissance (c3_01),
   reput_donner_accord, reput_revoquer_accord, reput_activer_accord_seul
   (c3_03). Si la base répond autrement, l'écran montre son message.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/client";
import type { Accords, Avis, Client, Demande, Fiche, Indicateurs, Monde, Reception, Reglages, Reponse, Sujet } from "./types";

export class ErreurPorte extends Error {}

function message(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") return (e as { message: string }).message;
  return "La base n'a pas répondu.";
}

async function rpc<T = unknown>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().rpc(nom, args);
  if (error) throw new ErreurPorte(message(error));
  return data as T;
}

export async function monClient(): Promise<Client | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("comptes").select("client_id, role").eq("user_id", auth.user.id).limit(1);
  const c = (data ?? [])[0] as { client_id: string; role: string } | undefined;
  return c ? { client_id: c.client_id, role: c.role, user_id: auth.user.id } : null;
}

export async function chargerMonde(client: Client): Promise<Monde> {
  const supabase = createClient();
  const depuis = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const [g, av, ind] = await Promise.all([
    supabase.from("reput_reglages").select("*").eq("client_id", client.client_id).is("entite_id", null).maybeSingle(),
    supabase.from("reput_avis").select("*").eq("client_id", client.client_id).order("cree_le", { ascending: false }).limit(100),
    supabase.from("reput_indicateurs").select("recues, repondues, parties_seules, hors_base, delai_median_minutes").eq("client_id", client.client_id).gte("jour", depuis),
  ]);
  for (const r of [g, av, ind]) if (r.error) throw new ErreurPorte(message(r.error));
  const lignes = (ind.data ?? []) as Indicateurs[];
  const delais = lignes.map((x) => x.delai_median_minutes).filter((x): x is number => x !== null).map(Number).sort((a, b) => a - b);
  const indicateurs: Indicateurs = {
    recues: lignes.reduce((n, x) => n + Number(x.recues), 0),
    repondues: lignes.reduce((n, x) => n + Number(x.repondues), 0),
    parties_seules: lignes.reduce((n, x) => n + Number(x.parties_seules), 0),
    hors_base: lignes.reduce((n, x) => n + Number(x.hors_base), 0),
    delai_median_minutes: delais.length ? delais[Math.floor(delais.length / 2)] : null,
  };
  const [d, f, s, a] = await Promise.all([
    supabase.from("reput_demandes").select("*").eq("client_id", client.client_id).order("recu_le", { ascending: false }).limit(200),
    supabase.from("reput_connaissances").select("*").eq("client_id", client.client_id).in("statut", ["brouillon", "validee"]).order("sujet").order("titre"),
    supabase.from("reput_sujets").select("*").eq("client_id", client.client_id).order("ordre"),
    rpc<Accords>("reput_accords", { p_client: client.client_id }),
  ]);
  for (const r of [d, f, s]) if (r.error) throw new ErreurPorte(message(r.error));
  const demandes = (d.data ?? []) as Demande[];
  const ids = demandes.map((x) => x.id);
  const recIds = demandes.map((x) => x.reception_id);
  const [p, r] = await Promise.all([
    ids.length ? supabase.from("reput_reponses").select("*").in("demande_id", ids).order("version", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    recIds.length ? supabase.from("receptions").select("id, canal, de_nom, de_adresse, sujet, corps, recu_le, pieces").in("id", recIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (p.error) throw new ErreurPorte(message(p.error));
  if (r.error) throw new ErreurPorte(message(r.error));
  const receptions: Record<number, Reception> = {};
  for (const x of (r.data ?? []) as Reception[]) receptions[x.id] = x;
  return {
    reglages: (g.data ?? null) as Reglages | null,
    avis: (av.data ?? []) as Avis[],
    indicateurs,
    demandes,
    receptions,
    reponses: ((p.data ?? []) as Reponse[]).map((x) => ({ ...x, cout_eur: Number(x.cout_eur ?? 0) })),
    fiches: (f.data ?? []) as Fiche[],
    sujets: (s.data ?? []) as Sujet[],
    accords: a ?? { sujets: [], peut_donner: false, seul_decideur: false },
  };
}

export const decider = (reponse: string, decision: "valider" | "refuser", motif?: string) =>
  rpc("reput_decider", { p_reponse: reponse, p_decision: decision, p_motif: motif ?? null });

export const corriger = (reponse: string, corps: string, objet?: string | null) =>
  rpc("reput_corriger", { p_reponse: reponse, p_corps: corps, p_objet: objet ?? null });

export const ecrireFiche = (id: string | null, client: string, fiche: Partial<Fiche>) =>
  rpc<Fiche & { statut: Fiche["statut"] }>("reput_ecrire_connaissance", { p_id: id, p_client: client, p_fiche: fiche });

export const validerFiche = (id: string) => rpc("reput_valider_connaissance", { p_id: id });
export const retirerFiche = (id: string, motif: string) => rpc("reput_retirer_connaissance", { p_id: id, p_motif: motif });

export const donnerAccord = (client: string, sujet: string) => rpc("reput_donner_accord", { p_client: client, p_sujet: sujet });
export const revoquerAccord = (client: string, sujet: string, motif: string) =>
  rpc("reput_revoquer_accord", { p_client: client, p_sujet: sujet, p_motif: motif });
export const activerAccordSeul = (client: string, sujet: string) => rpc("reput_activer_accord_seul", { p_client: client, p_sujet: sujet });

export const regler = (client: string, reglages: Partial<Reglages>) =>
  rpc<Reglages>("reput_regler", { p_client: client, p_entite: null, p_reglages: reglages });
export const programmerAvis = (client: string, canal: string, adresse: string, nom: string | null, reference: string | null, regleLe: string | null) =>
  rpc<{ avis: string; statut: string; motif: string | null }>("reput_programmer_avis", {
    p_client: client, p_canal: canal, p_adresse: adresse, p_nom: nom, p_reference: reference, p_regle_le: regleLe, p_entite: null,
  });
export const avisRecu = (avis: string) => rpc("reput_avis_recu", { p_avis: avis });
export const fixerDelai = (client: string, sujet: string, heures: number) => rpc("reput_fixer_delai", { p_client: client, p_sujet: sujet, p_heures: heures });
