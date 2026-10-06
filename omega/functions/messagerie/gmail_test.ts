import { assert, assertEquals, assertMatch, assertRejects } from "@std/assert";
import { gmail, PORTEES_GMAIL } from "./gmail.ts";
import { ErreurMessagerie } from "./fournisseur.ts";
import { base64url } from "./mime.ts";

type Appel = { url: string; init: RequestInit };

function fetchDouble(reponses: ((u: string, i: RequestInit) => Response)[]) {
  const appels: Appel[] = [];
  const f = (u: string | URL | Request, init: RequestInit = {}) => {
    appels.push({ url: String(u), init });
    const r = reponses.shift();
    if (!r) throw new Error(`appel inattendu ${u}`);
    return Promise.resolve(r(String(u), init));
  };
  return { appels, fetch: f as typeof fetch };
}

const CONFIG = {
  clientId: "id.apps.googleusercontent.com",
  clientSecret: "secret",
};
const maintenant = () => Date.parse("2026-10-06T16:00:00Z");

Deno.test("consentement : hors ligne, consentement forcé, deux portées, état et retour", () => {
  const u = new URL(
    gmail(CONFIG).urlConsentement(
      "etat-0123456789abcdef",
      "https://p.supabase.co/functions/v1/messagerie-oauth/google/retour",
    ),
  );
  assertEquals(
    u.origin + u.pathname,
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  assertEquals(u.searchParams.get("access_type"), "offline");
  assertEquals(u.searchParams.get("prompt"), "consent");
  assertEquals(u.searchParams.get("scope"), PORTEES_GMAIL.join(" "));
  assertEquals(u.searchParams.get("state"), "etat-0123456789abcdef");
  assertEquals(
    u.searchParams.get("redirect_uri"),
    "https://p.supabase.co/functions/v1/messagerie-oauth/google/retour",
  );
});

Deno.test("échange du code : jetons et portées ; sans refresh_token ou portée manquante → refus", async () => {
  const ok = fetchDouble([
    () =>
      Response.json({
        access_token: "A",
        expires_in: 3599,
        refresh_token: "R",
        scope: PORTEES_GMAIL.join(" "),
      }),
  ]);
  const c = await gmail(CONFIG, ok.fetch, maintenant).echangerCode(
    "code",
    "https://retour",
  );
  assertEquals(c.renouvellement, "R");
  assertEquals(c.acces, { jeton: "A", expire_le: "2026-10-06T16:59:59.000Z" });
  const corps = new URLSearchParams(String(ok.appels[0].init.body));
  assertEquals(corps.get("grant_type"), "authorization_code");
  assertEquals(corps.get("client_secret"), "secret");
  const sans = fetchDouble([
    () => Response.json({ access_token: "A", scope: PORTEES_GMAIL.join(" ") }),
  ]);
  await assertRejects(
    () => gmail(CONFIG, sans.fetch).echangerCode("c", "r"),
    ErreurMessagerie,
    "renouvellement",
  );
  const partiel = fetchDouble([
    () =>
      Response.json({
        access_token: "A",
        refresh_token: "R",
        scope: PORTEES_GMAIL[0],
      }),
  ]);
  await assertRejects(
    () => gmail(CONFIG, partiel.fetch).echangerCode("c", "r"),
    ErreurMessagerie,
    "portée non accordée",
  );
});

Deno.test("renouvellement : invalid_grant → JETON_REVOQUE ; invalid_client → DEFINITIVE ; 503 → TRANSITOIRE", async () => {
  for (
    const [rep, code] of [
      [
        Response.json({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        }, { status: 400 }),
        "JETON_REVOQUE",
      ],
      [
        Response.json({ error: "invalid_client" }, { status: 401 }),
        "DEFINITIVE",
      ],
      [new Response("", { status: 503 }), "TRANSITOIRE"],
    ] as const
  ) {
    const d = fetchDouble([() => rep]);
    const e = await assertRejects(
      () => gmail(CONFIG, d.fetch).renouveler("R"),
      ErreurMessagerie,
    );
    assertEquals(e.code, code);
  }
});

Deno.test("nouveautés : pages, brouillons et envoyés écartés, doublons, curseur par enregistrement ; 404 → CURSEUR_PERIME", async () => {
  const d = fetchDouble([
    () =>
      Response.json({
        history: [
          {
            id: "101",
            messagesAdded: [{ message: { id: "m1", labelIds: ["INBOX"] } }],
          },
          {
            id: "102",
            messagesAdded: [{ message: { id: "d1", labelIds: ["DRAFT"] } }, {
              message: { id: "s1", labelIds: ["SENT", "INBOX"] },
            }],
          },
        ],
        nextPageToken: "p2",
        historyId: "105",
      }),
    () =>
      Response.json({
        history: [{
          id: "106",
          messagesAdded: [{ message: { id: "m2", labelIds: ["INBOX"] } }, {
            message: { id: "m1", labelIds: ["INBOX"] },
          }],
        }],
        historyId: "110",
      }),
  ]);
  const n = await gmail(CONFIG, d.fetch).nouveautes("A", "100", "INBOX");
  assertEquals(n.messages, [{ id: "m1", curseur: "101" }, {
    id: "m2",
    curseur: "106",
  }]);
  assertEquals(n.curseur, "110");
  const u = new URL(d.appels[0].url);
  assertEquals([
    u.searchParams.get("startHistoryId"),
    u.searchParams.get("historyTypes"),
    u.searchParams.get("labelId"),
  ], ["100", "messageAdded", "INBOX"]);
  assertEquals(
    (d.appels[0].init.headers as Record<string, string>).Authorization,
    "Bearer A",
  );
  assertEquals(new URL(d.appels[1].url).searchParams.get("pageToken"), "p2");
  const p = fetchDouble([() => new Response("{}", { status: 404 })]);
  const e = await assertRejects(
    () => gmail(CONFIG, p.fetch).nouveautes("A", "1", "INBOX"),
    ErreurMessagerie,
  );
  assertEquals(e.code, "CURSEUR_PERIME");
});

Deno.test("message brut décodé du base64url ; brouillon envoyé en base64url ; révocation tolère un jeton déjà mort", async () => {
  const brut = "Subject: é\r\n\r\nCorps ~?>";
  const d = fetchDouble([
    () =>
      Response.json({
        id: "m1",
        raw: base64url(new TextEncoder().encode(brut)),
      }),
    () => Response.json({ id: "r-9", message: { id: "m-9" } }),
    () => new Response("", { status: 400 }),
  ]);
  const g = gmail(CONFIG, d.fetch);
  assertEquals(new TextDecoder().decode(await g.lireBrut("A", "m1")), brut);
  assertMatch(d.appels[0].url, /messages\/m1\?format=raw$/);
  const b = await g.creerBrouillon("A", new TextEncoder().encode(brut));
  assertEquals(b, { brouillon: "r-9", message: "m-9" });
  const envoye = JSON.parse(String(d.appels[1].init.body));
  assert(!/[+/=]/.test(envoye.message.raw), "base64url sans remplissage");
  await g.revoquer("R");
  assertEquals(
    new URLSearchParams(String(d.appels[2].init.body)).get("token"),
    "R",
  );
});
