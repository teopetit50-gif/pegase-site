// Fonction Edge export-complet (lot socle 19aj) : POST { "client_id": "<uuid>" } avec le jeton du gérant.
// Rend { export_id, lien, mot_de_passe, expire_le, nb_fichiers, fichiers_manquants, octets, sha256 }.
// Le mot de passe n'est rendu qu'ici, une fois, et n'est gardé nulle part. verify_jwt = true.
// Variables : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (fournies par Supabase) ;
// EXPORT_ORIGINES (origines autorisées, séparées par des virgules ; défaut https://omegaai.fr) ;
// EXPORT_MAX_OCTETS (plafond des fichiers, défaut 150 Mo).

import { type Acces, ErreurExport, MAX_OCTETS_DEFAUT, produireExport, purgerExpires } from "./export.ts";

const URL_BASE = Deno.env.get("SUPABASE_URL") ?? "";
const CLE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINES = (Deno.env.get("EXPORT_ORIGINES") ?? "https://omegaai.fr").split(",").map((o) => o.trim());
const MAX_OCTETS = Number(Deno.env.get("EXPORT_MAX_OCTETS") ?? MAX_OCTETS_DEFAUT);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const chemin = (c: string) => c.split("/").map(encodeURIComponent).join("/");

/** Une erreur PostgREST traduite : 42501 → 403, 55P03 → 409, le reste → 502. */
async function lireRpc(rep: Response, nom: string): Promise<unknown> {
  const corps = await rep.text();
  if (rep.ok) return corps ? JSON.parse(corps) : null;
  let code = "", message = corps.slice(0, 300);
  try {
    const j = JSON.parse(corps);
    code = j.code ?? "";
    message = j.message ?? message;
  } catch { /* corps non JSON */ }
  if (code === "42501") throw new ErreurExport(403, message);
  if (code === "55P03") throw new ErreurExport(409, message);
  throw new ErreurExport(502, `${nom} : HTTP ${rep.status} ${message}`);
}

function accesSupabase(jetonGerant: string): Acces {
  const rpc = (cle: string, jeton: string) => async (nom: string, args: Record<string, unknown>) =>
    lireRpc(
      await fetch(`${URL_BASE}/rest/v1/rpc/${nom}`, {
        method: "POST",
        headers: { apikey: cle, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
        body: JSON.stringify(args),
      }),
      nom,
    );
  const service = { apikey: CLE_SERVICE, Authorization: `Bearer ${CLE_SERVICE}` };
  return {
    rpcGerant: rpc(CLE_ANON, jetonGerant),
    rpcService: rpc(CLE_SERVICE, CLE_SERVICE),
    async telecharger(c) {
      const rep = await fetch(`${URL_BASE}/storage/v1/object/omega-clients/${chemin(c)}`, { headers: service });
      if (rep.status === 404 || rep.status === 400) {
        await rep.body?.cancel();
        return null;
      }
      if (!rep.ok) throw new ErreurExport(502, `stockage : HTTP ${rep.status} sur un fichier du client`);
      return new Uint8Array(await rep.arrayBuffer());
    },
    async deposer(bucket, c, octets) {
      const rep = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${chemin(c)}`, {
        method: "POST",
        headers: { ...service, "Content-Type": "application/zip", "x-upsert": "false" },
        body: octets as unknown as BodyInit,
      });
      if (!rep.ok) throw new ErreurExport(502, `dépôt du zip : HTTP ${rep.status} ${(await rep.text()).slice(0, 200)}`);
      await rep.body?.cancel();
    },
    async signer(bucket, c, secondes) {
      const rep = await fetch(`${URL_BASE}/storage/v1/object/sign/${bucket}/${chemin(c)}`, {
        method: "POST",
        headers: { ...service, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: secondes }),
      });
      if (!rep.ok) throw new ErreurExport(502, `lien signé : HTTP ${rep.status}`);
      const { signedURL } = await rep.json();
      return `${URL_BASE}/storage/v1${signedURL}`;
    },
    async retirer(bucket, chemins) {
      const rep = await fetch(`${URL_BASE}/storage/v1/object/${bucket}`, {
        method: "DELETE",
        headers: { ...service, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: chemins }),
      });
      if (!rep.ok) throw new ErreurExport(502, `retrait des zips échus : HTTP ${rep.status}`);
      await rep.body?.cancel();
    },
  };
}

function entetes(origine: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origine && ORIGINES.includes(origine)) {
    h["Access-Control-Allow-Origin"] = origine;
    h["Access-Control-Allow-Headers"] = "authorization, apikey, content-type";
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  return h;
}

Deno.serve(async (req) => {
  const h = entetes(req.headers.get("Origin"));
  const reponse = (statut: number, corps: unknown) =>
    new Response(JSON.stringify(corps), { status: statut, headers: h });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return reponse(405, { erreur: "POST seulement" });
  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton || jeton === CLE_ANON) return reponse(401, { erreur: "connexion requise" });
  let client = "";
  try {
    client = String((await req.json()).client_id ?? "");
  } catch { /* corps illisible */ }
  if (!UUID.test(client)) return reponse(400, { erreur: "client_id manquant ou invalide" });

  const acces = accesSupabase(jeton);
  await purgerExpires(acces).catch((e) => console.error(JSON.stringify({ niveau: "avertissement", purge: String(e) })));
  try {
    const r = await produireExport(acces, client, { maxOctets: MAX_OCTETS });
    // Le journal ne porte ni le lien ni le mot de passe.
    console.log(
      JSON.stringify({
        niveau: "info",
        export: r.export_id,
        fichiers: r.nb_fichiers,
        manquants: r.fichiers_manquants,
        octets: r.octets,
      }),
    );
    return reponse(200, r);
  } catch (e) {
    const statut = e instanceof ErreurExport ? e.statut : 500;
    console.error(JSON.stringify({ niveau: "erreur", statut, message: (e as Error).message }));
    return reponse(statut, { erreur: statut === 500 ? "erreur interne" : (e as Error).message });
  }
});
