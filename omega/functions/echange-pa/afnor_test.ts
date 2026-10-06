import { assert, assertEquals, assertMatch, assertRejects } from "@std/assert";
import { plateformeAfnor } from "./afnor.ts";
import { ErreurPA } from "./pa.ts";

type Appel = { url: string; init: RequestInit };

const CONFIG = {
  racine: "https://pa.test/flow/v1/",
  jetonUrl: "https://pa.test/oauth/token",
  clientId: "omega",
  clientSecret: "secret",
  scope: "flow",
};

/** fetch doublé : un jeton, puis les réponses programmées dans l'ordre. */
function fetchDouble(
  reponses: (() => Response)[],
  jeton: () => Response = () =>
    Response.json({ access_token: "J1", expires_in: 3600 }),
) {
  const appels: Appel[] = [];
  const f = (url: string | URL | Request, init: RequestInit = {}) => {
    appels.push({ url: String(url), init });
    if (String(url) === CONFIG.jetonUrl) return Promise.resolve(jeton());
    const r = reponses.shift();
    if (!r) throw new Error(`appel inattendu ${url}`);
    return Promise.resolve(r());
  };
  return { appels, fetch: f as typeof fetch };
}

Deno.test("dépôt : jeton OAuth2 client_credentials, multipart flowInfo + file, flowId rendu", async () => {
  const d = fetchDouble([
    () =>
      Response.json({ flowId: "F-1", submittedAt: "2026-10-06T10:00:00Z" }, {
        status: 202,
      }),
  ]);
  const pa = plateformeAfnor(CONFIG, d.fetch);
  const r = await pa.deposer({
    suivi: "11111111-1111-4111-8111-111111111111",
    nom: "F-2026-0001.pdf",
    syntaxe: "Factur-X",
    profil: "Extended-CTC-FR",
    regle: "B2B",
    octets: new TextEncoder().encode("%PDF") as Uint8Array<ArrayBuffer>,
    typeMime: "application/pdf",
  });
  assertEquals(r.flux, "F-1");
  assertEquals(r.sha256?.length, 64);

  const jeton = d.appels[0];
  assertEquals(jeton.url, CONFIG.jetonUrl);
  const corps = new URLSearchParams(String(jeton.init.body));
  assertEquals(corps.get("grant_type"), "client_credentials");
  assertEquals(corps.get("scope"), "flow");

  const depot = d.appels[1];
  assertEquals(depot.url, "https://pa.test/flow/v1/flows");
  assertEquals(
    (depot.init.headers as Record<string, string>).Authorization,
    "Bearer J1",
  );
  const form = depot.init.body as FormData;
  const info = JSON.parse(await (form.get("flowInfo") as Blob).text());
  assertEquals(info.trackingId, "11111111-1111-4111-8111-111111111111");
  assertEquals(info.flowSyntax, "Factur-X");
  assertEquals(info.flowProfile, "Extended-CTC-FR");
  assertEquals(info.processingRule, "B2B");
  assertEquals(info.sha256, r.sha256);
  assertEquals(await (form.get("file") as Blob).text(), "%PDF");
});

Deno.test("jeton gardé entre deux appels ; redemandé après un 401", async () => {
  const d = fetchDouble([
    () => Response.json({ status: "ok" }),
    () => new Response("expiré", { status: 401 }),
    () => Response.json({ status: "ok" }),
  ]);
  const pa = plateformeAfnor(CONFIG, d.fetch);
  assert(await pa.sante());
  assertEquals(await pa.sante(), false);
  assert(await pa.sante());
  assertEquals(d.appels.filter((a) => a.url === CONFIG.jetonUrl).length, 2);
});

Deno.test("classement des erreurs : 422 définitive, 503 et 401 transitoires, réseau transitoire", async () => {
  for (
    const [statut, definitive] of [
      [422, true],
      [400, true],
      [413, true],
      [503, false],
      [429, false],
      [401, false],
      [403, false],
    ] as const
  ) {
    const d = fetchDouble([() => new Response("{}", { status: statut })]);
    const e = await assertRejects(
      () => plateformeAfnor(CONFIG, d.fetch).relever(null, 10),
      ErreurPA,
    );
    assertEquals(e.definitive, definitive, `HTTP ${statut}`);
    assertEquals(e.statut, statut);
  }
  const panne = ((url: string) =>
    url === CONFIG.jetonUrl
      ? Promise.resolve(
        Response.json({ access_token: "J", expires_in: 3600 }),
      )
      : Promise.reject(
        new TypeError("connexion refusée"),
      )) as unknown as typeof fetch;
  const e = await assertRejects(
    () => plateformeAfnor(CONFIG, panne).relever(null, 10),
    ErreurPA,
  );
  assertEquals(e.definitive, false);
});

Deno.test("identifiants OAuth2 refusés : transitoire (le dépôt reste bon, le compte est à réparer)", async () => {
  const d = fetchDouble(
    [],
    () => new Response("invalid_client", { status: 401 }),
  );
  const e = await assertRejects(
    () => plateformeAfnor(CONFIG, d.fetch).relever(null, 10),
    ErreurPA,
  );
  assertEquals(e.definitive, false);
  assertMatch(e.message, /jeton OAuth2/);
});

Deno.test("relevé : filtre updatedAfter, flux traduits (sens, accusé, détails), triés par updatedAt", async () => {
  const d = fetchDouble([() =>
    Response.json({
      limit: 100,
      results: [
        {
          flowId: "B",
          trackingId: "t-2",
          name: "b.xml",
          flowSyntax: "UBL",
          flowType: "CustomerInvoice",
          flowDirection: "Out",
          submittedAt: "2026-10-06T10:00:00Z",
          updatedAt: "2026-10-06T10:02:00Z",
          processingRuleSource: "Computed",
          acknowledgement: {
            status: "Error",
            details: [{
              level: "Error",
              item: "BT-1",
              reasonCode: "REJ_SEMAN",
              reasonMessage: "numéro absent",
            }],
          },
        },
        {
          flowId: "A",
          name: "a.xml",
          flowSyntax: "CII",
          flowType: "SupplierInvoice",
          flowDirection: "In",
          submittedAt: "2026-10-06T09:00:00Z",
          updatedAt: "2026-10-06T10:01:00Z",
          processingRuleSource: "Computed",
          acknowledgement: { status: "Ok" },
        },
      ],
    })]);
  const flux = await plateformeAfnor(CONFIG, d.fetch).relever(
    new Date("2026-10-06T10:00:00Z"),
    100,
  );
  const recherche = JSON.parse(String(d.appels[1].init.body));
  assertEquals(recherche, {
    limit: 100,
    where: { updatedAfter: "2026-10-06T10:00:00.000Z" },
  });
  assertEquals(d.appels[1].url, "https://pa.test/flow/v1/flows/search");
  assertEquals(flux.map((f) => f.flux), ["A", "B"]);
  assertEquals(flux[0].sens, "entrant");
  assertEquals(flux[0].accuse, "ok");
  assertEquals(flux[1].sens, "sortant");
  assertEquals(flux[1].suivi, "t-2");
  assertEquals(flux[1].accuse, "erreur");
  assertEquals(flux[1].details[0], {
    niveau: "Error",
    element: "BT-1",
    code: "REJ_SEMAN",
    message: "numéro absent",
  });
});

Deno.test("téléchargement : docType=Original, octets et type rendus", async () => {
  const d = fetchDouble([
    () =>
      new Response("<Invoice/>", {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      }),
  ]);
  const f = await plateformeAfnor(CONFIG, d.fetch).telecharger("A/1");
  assertEquals(
    d.appels[1].url,
    "https://pa.test/flow/v1/flows/A%2F1?docType=Original",
  );
  assertEquals(f.typeMime, "application/xml");
  assertEquals(new TextDecoder().decode(f.octets), "<Invoice/>");
});
