import { createHmac, timingSafeEqual } from "node:crypto";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/* ══════════════════════════════════════════════════════════════════════
   /api/teo/whatsapp — le webhook de l'API WhatsApp Business Cloud
   (11/11/2026, Mon espace : « mes conversations WhatsApp »)

   Meta l'appelle deux fois :
     · GET, à l'enregistrement du webhook : on rend hub.challenge si
       hub.verify_token vaut WHATSAPP_VERIFY_TOKEN ;
     · POST, à chaque message reçu et à chaque accusé (envoyé, remis, lu) :
       on vérifie la signature X-Hub-Signature-256 (WHATSAPP_APP_SECRET,
       si posé), puis on range messages et accusés en base par la fonction
       omega_whatsapp_recevoir (docs/espace-teo/schema-whatsapp.sql),
       appelée avec la clé publique et le secret WHATSAPP_WEBHOOK_SECRET —
       la fonction compare ce secret à celui posé dans la base ; sans lui,
       elle n'écrit rien. La clé service_role ne quitte pas le cockpit.
   On répond toujours 200 à Meta une fois le corps lu : sinon il réessaie
   en boucle. Ce qui n'a pas pu être rangé est tracé.
   ══════════════════════════════════════════════════════════════════════ */

export const runtime = "nodejs";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const attendu = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (q.get("hub.mode") === "subscribe" && attendu && q.get("hub.verify_token") === attendu) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { ...SANS_CACHE, "Content-Type": "text/plain" } });
  }
  return new Response("Refusé", { status: 403, headers: SANS_CACHE });
}

type Valeur = {
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: { id: string; from: string; timestamp: string; type: string; text?: { body?: string }; image?: { caption?: string }; document?: { filename?: string; caption?: string }; video?: { caption?: string }; audio?: unknown; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }[];
  statuses?: { id: string; status: string; timestamp: string; recipient_id?: string }[];
};
type Corps = { object?: string; entry?: { changes?: { field?: string; value?: Valeur }[] }[] };

const STATUT: Record<string, string> = { sent: "envoye", delivered: "remis", read: "lu", failed: "echec" };

function texteDe(m: NonNullable<Valeur["messages"]>[number]): string {
  switch (m.type) {
    case "text":
      return m.text?.body ?? "";
    case "image":
      return m.image?.caption ?? "";
    case "video":
      return m.video?.caption ?? "";
    case "document":
      return [m.document?.filename, m.document?.caption].filter(Boolean).join(" · ");
    case "button":
      return m.button?.text ?? "";
    case "interactive":
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
    default:
      return "";
  }
}
const TYPES: Record<string, string> = { text: "texte", image: "image", audio: "audio", voice: "audio", video: "video", document: "document" };

export async function POST(req: Request) {
  const brut = await req.text();
  const secretApp = process.env.WHATSAPP_APP_SECRET?.trim();
  if (secretApp) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const attendu = `sha256=${createHmac("sha256", secretApp).update(brut).digest("hex")}`;
    const a = Buffer.from(signature);
    const b = Buffer.from(attendu);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Signature refusée", { status: 401, headers: SANS_CACHE });
  }
  let corps: Corps;
  try {
    corps = JSON.parse(brut) as Corps;
  } catch {
    return new Response("Corps illisible", { status: 400, headers: SANS_CACHE });
  }
  if (corps.object !== "whatsapp_business_account") return new Response("Ignoré", { status: 200, headers: SANS_CACHE });

  const messages: Record<string, unknown>[] = [];
  const statuts: Record<string, unknown>[] = [];
  for (const e of corps.entry ?? [])
    for (const c of e.changes ?? []) {
      const v = c.value;
      if (!v) continue;
      const noms = new Map((v.contacts ?? []).map((x) => [x.wa_id, x.profile?.name ?? null]));
      for (const m of v.messages ?? [])
        messages.push({
          wa_id: m.id,
          numero: m.from,
          nom: noms.get(m.from) ?? null,
          type: TYPES[m.type] ?? "autre",
          texte: texteDe(m),
          quand: new Date(Number(m.timestamp) * 1000).toISOString(),
          brut: m,
        });
      for (const s of v.statuses ?? []) statuts.push({ wa_id: s.id, statut: STATUT[s.status] ?? s.status, quand: new Date(Number(s.timestamp) * 1000).toISOString() });
    }
  if (!messages.length && !statuts.length) return new Response("Rien à ranger", { status: 200, headers: SANS_CACHE });

  const secret = process.env.WHATSAPP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[teo/whatsapp] WHATSAPP_WEBHOOK_SECRET absent : message reçu, pas rangé.");
    return new Response("Reçu", { status: 200, headers: SANS_CACHE });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/omega_whatsapp_recevoir`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_jeton: secret, p_messages: messages, p_statuts: statuts }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) console.error("[teo/whatsapp] la base a refusé :", r.status, (await r.text()).slice(0, 300));
  } catch (e) {
    console.error("[teo/whatsapp] la base n'a pas répondu :", e instanceof Error ? e.message : e);
  }
  return new Response("Reçu", { status: 200, headers: SANS_CACHE });
}
