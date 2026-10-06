import { assert, assertEquals, assertRejects } from "@std/assert";
import { microsoft, PORTEES_MICROSOFT } from "./microsoft.ts";
import { ErreurMessagerie } from "./fournisseur.ts";

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

const CONFIG = { clientId: "app-id", clientSecret: "secret", tenant: "common" };
const maintenant = () => Date.parse("2026-10-06T16:00:00Z");

Deno.test("consentement : point common, réponse en query, portées offline_access + Mail.ReadWrite, état et retour", () => {
  const u = new URL(
    microsoft(CONFIG).urlConsentement(
      "etat-0123456789abcdef",
      "https://p.supabase.co/functions/v1/messagerie-oauth/microsoft/retour",
    ),
  );
  assertEquals(
    u.origin + u.pathname,
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  );
  assertEquals(u.searchParams.get("response_mode"), "query");
  assertEquals(u.searchParams.get("scope"), PORTEES_MICROSOFT.join(" "));
  assertEquals(u.searchParams.get("state"), "etat-0123456789abcdef");
  assertEquals(u.searchParams.get("client_id"), "app-id");
});

Deno.test("échange du code : portées courtes acceptées ; sans refresh_token ou sans Mail.ReadWrite → refus", async () => {
  const ok = fetchDouble([
    () =>
      Response.json({
        access_token: "A",
        expires_in: 3599,
        refresh_token: "R",
        scope: "Mail.ReadWrite User.Read profile openid email",
      }),
  ]);
  const c = await microsoft(CONFIG, ok.fetch, maintenant).echangerCode(
    "code",
    "https://retour",
  );
  assertEquals(c.renouvellement, "R");
  assertEquals(c.acces, { jeton: "A", expire_le: "2026-10-06T16:59:59.000Z" });
  assertEquals(
    ok.appels[0].url,
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  );
  const corps = new URLSearchParams(String(ok.appels[0].init.body));
  assertEquals(corps.get("grant_type"), "authorization_code");
  assertEquals(corps.get("redirect_uri"), "https://retour");
  assertEquals(corps.get("scope"), PORTEES_MICROSOFT.join(" "));
  const sans = fetchDouble([
    () => Response.json({ access_token: "A", scope: "Mail.ReadWrite" }),
  ]);
  await assertRejects(
    () => microsoft(CONFIG, sans.fetch).echangerCode("c", "r"),
    ErreurMessagerie,
    "renouvellement",
  );
  const partiel = fetchDouble([
    () =>
      Response.json({
        access_token: "A",
        refresh_token: "R",
        scope: "https://graph.microsoft.com/User.Read",
      }),
  ]);
  await assertRejects(
    () => microsoft(CONFIG, partiel.fetch).echangerCode("c", "r"),
    ErreurMessagerie,
    "Mail.ReadWrite",
  );
});

Deno.test("renouvellement : jeton tourné rendu ; invalid_grant / interaction_required → JETON_REVOQUE ; invalid_client → DEFINITIVE", async () => {
  const ok = fetchDouble([
    () =>
      Response.json({
        access_token: "A2",
        expires_in: "3600",
        refresh_token: "R2",
      }),
  ]);
  const a = await microsoft(CONFIG, ok.fetch, maintenant).renouveler("R1");
  assertEquals(a, {
    jeton: "A2",
    expire_le: "2026-10-06T17:00:00.000Z",
    renouvellement: "R2",
  });
  assertEquals(
    new URLSearchParams(String(ok.appels[0].init.body)).get("refresh_token"),
    "R1",
  );
  for (
    const [rep, code] of [
      [
        Response.json({
          error: "invalid_grant",
          error_description: "AADSTS70008: expired\r\nTrace ID: x",
        }, { status: 400 }),
        "JETON_REVOQUE",
      ],
      [
        Response.json({ error: "interaction_required" }, { status: 400 }),
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
      () => microsoft(CONFIG, d.fetch).renouveler("R"),
      ErreurMessagerie,
    );
    assertEquals(e.code, code);
  }
});

Deno.test("profil : adresse (mail, sinon UPN) et curseur « depuis » la date courante", async () => {
  const d = fetchDouble([
    () => Response.json({ mail: null, userPrincipalName: "Compta@Banc.test" }),
  ]);
  const p = await microsoft(CONFIG, d.fetch, maintenant).profil("A");
  assertEquals(p, {
    adresse: "compta@banc.test",
    curseur: "depuis:2026-10-06T16:00:00.000Z",
  });
  assertEquals(
    (d.appels[0].init.headers as Record<string, string>).Authorization,
    "Bearer A",
  );
});

Deno.test("nouveautés : premier tour filtré par date, pages suivies, retraits et brouillons écartés, deltaLink en curseur", async () => {
  const p2 =
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$skiptoken=S2";
  const fin =
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=D1";
  const d = fetchDouble([
    () =>
      Response.json({
        value: [
          { id: "m1", isDraft: false },
          { id: "d1", isDraft: true },
          { id: "x", "@removed": { reason: "deleted" } },
        ],
        "@odata.nextLink": p2,
      }),
    () =>
      Response.json({
        value: [{ id: "m2", isDraft: false }, { id: "m1", isDraft: false }],
        "@odata.deltaLink": fin,
      }),
  ]);
  const n = await microsoft(CONFIG, d.fetch).nouveautes(
    "A",
    "depuis:2026-10-06T15:00:00.000Z",
    "inbox",
  );
  const premiere = new URL(d.appels[0].url);
  assertEquals(
    premiere.pathname,
    "/v1.0/me/mailFolders/inbox/messages/delta",
  );
  assertEquals(premiere.searchParams.get("changeType"), "created");
  assertEquals(
    premiere.searchParams.get("$filter"),
    "receivedDateTime ge 2026-10-06T15:00:00.000Z",
  );
  assertEquals(n.messages, [
    { id: "m1", curseur: d.appels[0].url },
    { id: "m2", curseur: p2 },
  ]);
  assertEquals(n.curseur, fin);
  assertEquals(d.appels[1].url, p2);
  assertEquals(
    (d.appels[0].init.headers as Record<string, string>).Prefer,
    "odata.maxpagesize=50",
  );
});

Deno.test("nouveautés : deltaLink reprise tel quel ; 410 → CURSEUR_PERIME ; curseur hors Graph jamais suivi", async () => {
  const lien =
    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=D1";
  const d = fetchDouble([
    () => Response.json({ value: [], "@odata.deltaLink": lien }),
    () =>
      Response.json({ error: { code: "SyncStateNotFound" } }, { status: 410 }),
  ]);
  const m = microsoft(CONFIG, d.fetch);
  assertEquals(await m.nouveautes("A", lien, "inbox"), {
    messages: [],
    curseur: lien,
  });
  assertEquals(d.appels[0].url, lien);
  const e = await assertRejects(
    () => m.nouveautes("A", lien, "inbox"),
    ErreurMessagerie,
  );
  assertEquals(e.code, "CURSEUR_PERIME");
  const ailleurs = await assertRejects(
    () => m.nouveautes("A", "https://evil.test/delta", "inbox"),
    ErreurMessagerie,
  );
  assertEquals(ailleurs.code, "CURSEUR_PERIME");
  assertEquals(d.appels.length, 2);
});

Deno.test("message brut par $value ; brouillon déposé en MIME base64 (text/plain) ; révocation sans appel", async () => {
  const brut = "Subject: é\r\n\r\nCorps ~?>";
  const d = fetchDouble([
    () => new Response(new TextEncoder().encode(brut)),
    () =>
      Response.json({ id: "AAMk=", internetMessageId: "<x@outlook.test>" }, {
        status: 201,
      }),
  ]);
  const m = microsoft(CONFIG, d.fetch);
  assertEquals(new TextDecoder().decode(await m.lireBrut("A", "id/1")), brut);
  assertEquals(
    d.appels[0].url,
    "https://graph.microsoft.com/v1.0/me/messages/id%2F1/$value",
  );
  const b = await m.creerBrouillon("A", new TextEncoder().encode(brut));
  assertEquals(b, { brouillon: "AAMk=", message: "<x@outlook.test>" });
  assertEquals(
    (d.appels[1].init.headers as Record<string, string>)["Content-Type"],
    "text/plain",
  );
  const envoye = String(d.appels[1].init.body);
  assert(/^[A-Za-z0-9+/]+=*$/.test(envoye), "base64 standard");
  assertEquals(
    new TextDecoder().decode(
      Uint8Array.from(atob(envoye), (c) => c.charCodeAt(0)),
    ),
    brut,
  );
  await m.revoquer("R");
  assertEquals(d.appels.length, 2);
  assertEquals(m.revocationDistante, false);
});
