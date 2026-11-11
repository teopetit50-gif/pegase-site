/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — les conversations WhatsApp de Teo (11/11/2026)

   WhatsApp ne rend pas l'historique : les messages arrivent par le
   webhook de l'API WhatsApp Business Cloud (app/api/teo/whatsapp/route.ts),
   qui les range dans omega_whatsapp_messages (docs/espace-teo/
   schema-whatsapp.sql, à appliquer une fois dans Supabase). Ce fichier :
     · lireConversations : les messages, groupés par numéro, sous la session
       du gérant (RLS : omega_est_admin) ;
     · envoyer : un texte par l'API Graph (WHATSAPP_TOKEN, WHATSAPP_PHONE_ID),
       puis la ligne « envoyé » en base ;
     · marquerLus : les messages d'un numéro lus.
   Sans la table : « sans_table » et la page le dit ; sans les variables
   d'envoi : on lit, on ne répond pas d'ici.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";
import type { ConversationWa, EtatWhatsApp, MessageWa } from "./types";

const GRAPH = "https://graph.facebook.com/v21.0";
const COLONNES = "id, wa_id, numero, nom, sens, type, texte, quand, lu, statut";

type Ligne = { id: string; wa_id: string | null; numero: string; nom: string | null; sens: "recu" | "envoye"; type: string; texte: string | null; quand: string; lu: boolean; statut: string | null };

const TYPES: MessageWa["type"][] = ["texte", "image", "audio", "video", "document"];
const typeDe = (t: string): MessageWa["type"] => (TYPES.includes(t as MessageWa["type"]) ? (t as MessageWa["type"]) : "autre");
const STATUTS: MessageWa["statut"][] = ["envoye", "remis", "lu", "echec"];
const statutDe = (s: string | null): MessageWa["statut"] => (STATUTS.includes(s as MessageWa["statut"]) ? (s as MessageWa["statut"]) : null);

const tableAbsente = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /find the table|does not exist|schema cache/i.test(e.message ?? ""));

export function envoiBranche(): boolean {
  return !!(process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_ID?.trim());
}

export async function lireConversations(): Promise<{ etat: EtatWhatsApp; detail: string | null; conversations: ConversationWa[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("omega_whatsapp_messages").select(COLONNES).order("quand", { ascending: true }).limit(5000);
  if (error) {
    if (tableAbsente(error)) return { etat: "sans_table", detail: null, conversations: [] };
    return { etat: "erreur", detail: error.message, conversations: [] };
  }
  const par = new Map<string, ConversationWa>();
  for (const l of (data ?? []) as Ligne[]) {
    const c = par.get(l.numero) ?? { numero: l.numero, nom: l.nom?.trim() || `+${l.numero}`, messages: [] };
    if (l.nom?.trim() && l.sens === "recu") c.nom = l.nom.trim();
    c.messages.push({ id: l.id, sens: l.sens, type: typeDe(l.type), texte: l.texte ?? "", quand: l.quand, lu: l.lu, statut: l.sens === "envoye" ? statutDe(l.statut) : null });
    par.set(l.numero, c);
  }
  const conversations = [...par.values()].sort((a, b) => (b.messages[b.messages.length - 1]?.quand ?? "").localeCompare(a.messages[a.messages.length - 1]?.quand ?? ""));
  return { etat: envoiBranche() ? "ok" : "absent", detail: null, conversations };
}

export async function envoyer(numero: string, texte: string): Promise<{ message: MessageWa | null; detail: string | null }> {
  const jeton = process.env.WHATSAPP_TOKEN?.trim();
  const telephone = process.env.WHATSAPP_PHONE_ID?.trim();
  if (!jeton || !telephone) return { message: null, detail: "L'envoi n'est pas branché : posez WHATSAPP_TOKEN et WHATSAPP_PHONE_ID sur Vercel (docs/espace-teo/README.md)." };
  const propre = numero.replace(/[^\d]/g, "");
  if (!propre || !texte.trim()) return { message: null, detail: "Un numéro et un texte." };
  let waId: string | null = null;
  try {
    const r = await fetch(`${GRAPH}/${telephone}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: propre, type: "text", text: { preview_url: false, body: texte.trim() } }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const j = (await r.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!r.ok) return { message: null, detail: `WhatsApp a refusé l'envoi : ${j.error?.message ?? r.status}` };
    waId = j.messages?.[0]?.id ?? null;
  } catch (e) {
    return { message: null, detail: e instanceof Error ? e.message : "WhatsApp n'a pas répondu." };
  }
  const supabase = await createClient();
  const quand = new Date().toISOString();
  const { data, error } = await supabase
    .from("omega_whatsapp_messages")
    .insert({ wa_id: waId, numero: propre, nom: null, sens: "envoye", type: "texte", texte: texte.trim(), quand, lu: true, statut: "envoye" })
    .select(COLONNES)
    .single();
  if (error || !data) return { message: { id: waId ?? `local-${Date.now()}`, sens: "envoye", type: "texte", texte: texte.trim(), quand, lu: true, statut: "envoye" }, detail: error ? `Envoyé, mais pas rangé en base : ${error.message}` : null };
  const l = data as Ligne;
  return { message: { id: l.id, sens: "envoye", type: "texte", texte: l.texte ?? "", quand: l.quand, lu: true, statut: statutDe(l.statut) }, detail: null };
}

export async function marquerLus(numero: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.from("omega_whatsapp_messages").update({ lu: true }).eq("numero", numero.replace(/[^\d]/g, "")).eq("lu", false);
  return error ? error.message : null;
}
