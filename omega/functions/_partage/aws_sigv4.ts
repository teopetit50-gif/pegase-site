// Signature AWS SigV4 pour fetch, sans dépendance : Web Crypto seulement.
// Suffit pour Bedrock (et Textract si un jour on y passe) depuis Deno.

export interface IdentifiantsAws {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface RequeteASigner {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Uint8Array | string;
  service: string;
  region: string;
  date?: Date;
  /** Poser x-amz-content-sha256 (S3 l'exige ; Bedrock s'en passe). */
  avecHashContenu?: boolean;
}

const enc = new TextEncoder();

async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const octets = typeof data === "string" ? enc.encode(data) : data;
  const h = await crypto.subtle.digest("SHA-256", octets as BufferSource);
  return hex(new Uint8Array(h));
}

async function hmac(cle: Uint8Array | string, message: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    (typeof cle === "string" ? enc.encode(cle) : cle) as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(message)));
}

function hex(o: Uint8Array): string {
  return Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Encodage URI « strict » d'AWS : RFC 3986, '/' conservé dans le chemin. */
function encoderChemin(chemin: string): string {
  return chemin
    .split("/")
    .map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()))
    .join("/");
}

function horodatage(d: Date): { amz: string; jour: string } {
  const amz = d.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz, jour: amz.slice(0, 8) };
}

/** Renvoie les en-têtes complets à poser sur la requête (les entrants + Authorization). */
export async function signerRequete(r: RequeteASigner, ids: IdentifiantsAws): Promise<Record<string, string>> {
  const u = new URL(r.url);
  const { amz, jour } = horodatage(r.date ?? new Date());
  const corpsHash = await sha256Hex(r.body);

  const entetes: Record<string, string> = {};
  for (const [k, v] of Object.entries(r.headers)) entetes[k.toLowerCase()] = v.trim().replace(/\s+/g, " ");
  entetes["host"] = u.host;
  entetes["x-amz-date"] = amz;
  if (r.avecHashContenu) entetes["x-amz-content-sha256"] = corpsHash;
  if (ids.sessionToken) entetes["x-amz-security-token"] = ids.sessionToken;

  const noms = Object.keys(entetes).sort();
  const entetesCanon = noms.map((n) => `${n}:${entetes[n]}\n`).join("");
  const signes = noms.join(";");

  const params = Array.from(u.searchParams.entries())
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const requeteCanon = [r.method.toUpperCase(), encoderChemin(u.pathname), params, entetesCanon, signes, corpsHash].join("\n");
  const portee = `${jour}/${r.region}/${r.service}/aws4_request`;
  const aSigner = ["AWS4-HMAC-SHA256", amz, portee, await sha256Hex(requeteCanon)].join("\n");

  let cle = await hmac("AWS4" + ids.secretAccessKey, jour);
  cle = await hmac(cle, r.region);
  cle = await hmac(cle, r.service);
  cle = await hmac(cle, "aws4_request");
  const signature = hex(await hmac(cle, aSigner));

  const sortie: Record<string, string> = { ...r.headers };
  sortie["x-amz-date"] = amz;
  if (r.avecHashContenu) sortie["x-amz-content-sha256"] = corpsHash;
  if (ids.sessionToken) sortie["x-amz-security-token"] = ids.sessionToken;
  sortie["Authorization"] = `AWS4-HMAC-SHA256 Credential=${ids.accessKeyId}/${portee}, SignedHeaders=${signes}, Signature=${signature}`;
  return sortie;
}
