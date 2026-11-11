"use server";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — les gestes de l'espace personnel de Teo (11/11/2026)

   Chacun vérifie d'abord que la session est celle du gérant
   (omega_est_admin) : sans elle, rien ne part, rien ne s'écrit. Les
   lectures de départ sont faites par les pages (app/espace2/teo, un page.tsx par page),
   sous la même session.
   ══════════════════════════════════════════════════════════════════════ */

import { estAdmin } from "@/lib/omega/donnees";
import { lireFil, marquerLu, repondre } from "@/lib/teo/gmail";
import { changerClient, creerClient, noterEchange } from "@/lib/teo/clients";
import { envoyer, marquerLus } from "@/lib/teo/whatsapp";
import type { ClientTeo, FilMail, MessageWa } from "@/lib/teo/types";

const REFUS = "Réservé au compte gérant d'Omega.";

async function garde(): Promise<string | null> {
  return (await estAdmin()) ? null : REFUS;
}

/* ——— Mails ——— */
export async function ouvrirFilMail(id: string): Promise<{ fil: FilMail | null; detail: string | null }> {
  const refus = await garde();
  if (refus) return { fil: null, detail: refus };
  return lireFil(id);
}
export async function repondreMail(id: string, texte: string, objet?: string): Promise<{ ok: boolean; a: string | null; detail: string | null }> {
  const refus = await garde();
  if (refus) return { ok: false, a: null, detail: refus };
  if (!texte.trim()) return { ok: false, a: null, detail: "Le message est vide." };
  const r = await repondre(id, texte.trim(), objet);
  return r.ok ? { ok: true, a: r.a, detail: null } : { ok: false, a: null, detail: r.detail };
}
export async function marquerFilLu(id: string, lu: boolean): Promise<{ ok: boolean; detail: string | null }> {
  const refus = await garde();
  if (refus) return { ok: false, detail: refus };
  return marquerLu(id, lu);
}

/* ——— WhatsApp ——— */
export async function envoyerWhatsApp(numero: string, texte: string): Promise<{ message: MessageWa | null; detail: string | null }> {
  const refus = await garde();
  if (refus) return { message: null, detail: refus };
  return envoyer(numero, texte);
}
export async function marquerWhatsAppLu(numero: string): Promise<string | null> {
  const refus = await garde();
  if (refus) return refus;
  return marquerLus(numero);
}

/* ——— Clients ——— */
export async function changerClientTeo(id: string, champs: Parameters<typeof changerClient>[1]): Promise<string | null> {
  const refus = await garde();
  if (refus) return refus;
  return changerClient(id, champs);
}
export async function noterEchangeTeo(id: string, canal: string, resume: string): Promise<{ echange: ClientTeo["echanges"][number] | null; detail: string | null }> {
  const refus = await garde();
  if (refus) return { echange: null, detail: refus };
  if (!resume.trim()) return { echange: null, detail: "Un mot sur l'échange." };
  return noterEchange(id, canal, resume.trim());
}
export async function creerClientTeo(c: Parameters<typeof creerClient>[0]): Promise<{ client: ClientTeo | null; detail: string | null }> {
  const refus = await garde();
  if (refus) return { client: null, detail: refus };
  if (!c.nom.trim()) return { client: null, detail: "Un nom, au moins." };
  return creerClient(c);
}
