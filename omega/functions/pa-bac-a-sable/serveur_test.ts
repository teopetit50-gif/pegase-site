// Le bac à sable seul, puis de bout en bout avec l'adaptateur AFNOR et le passage de
// l'ouvrier echange-pa (portes doublées) : ce que la recette jouera une fois les portes posées.

import { assert, assertEquals, assertMatch, assertRejects } from "@std/assert";
import { creerBacASable } from "./serveur.ts";
import { estRecette, REGLAGES_RECETTE } from "./garde.ts";
import { sirenAcheteur } from "../echange-pa/acheteur.ts";
import { configurationBacRecette } from "../echange-pa/garde.ts";
import { depotBucket, depotMemoire } from "./depot.ts";
import { plateformeAfnor } from "../echange-pa/afnor.ts";
import { ErreurPA } from "../echange-pa/pa.ts";
import { executerPassage } from "../echange-pa/passage.ts";
import { fabriquerCdar } from "../echange-pa/cdar.ts";
import {
  CLIENT,
  FACTURE,
  journalMuet,
  PortesDouble,
  STATUT,
  StockageDouble,
  travail,
} from "../echange-pa/doubles.ts";

const FACTURE_RECUE =
  '<Invoice><cbc:ID>FAC-2026-10-0471</cbc:ID><cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID="0002">842115763</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty></Invoice>';
const BASE = "https://recette.test/functions/v1/pa-bac-a-sable";

function monter() {
  const depot = depotMemoire();
  let n = 0;
  let horloge = Date.parse("2026-10-06T15:00:00Z");
  const servir = creerBacASable({
    depot,
    clientId: "omega",
    clientSecret: "secret",
    cleJetons: "cle",
    maintenant: () => new Date(horloge),
    nouvelId: () => `flux-${++n}`,
  });
  const fetchBac =
    ((u: string | URL | Request, init?: RequestInit) =>
      servir(new Request(u, init))) as typeof fetch;
  const pa = plateformeAfnor(
    {
      racine: `${BASE}/flow/v1`,
      jetonUrl: `${BASE}/oauth/token`,
      clientId: "omega",
      clientSecret: "secret",
    },
    fetchBac,
    () => horloge,
  );
  return {
    depot,
    servir,
    fetchBac,
    pa,
    avancer: (s: number) => (horloge += s * 1000),
  };
}

async function jeton(fetchBac: typeof fetch) {
  const r = await fetchBac(`${BASE}/oauth/token`, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "omega",
      client_secret: "secret",
    }),
  });
  return (await r.json()).access_token as string;
}

Deno.test("jeton : identifiants faux → 401 invalid_client ; sans jeton ou jeton faux → 401", async () => {
  const b = monter();
  const faux = await b.fetchBac(`${BASE}/oauth/token`, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "omega",
      client_secret: "non",
    }),
  });
  assertEquals(faux.status, 401);
  assertEquals((await faux.json()).error, "invalid_client");
  assertEquals((await b.fetchBac(`${BASE}/flow/v1/healthcheck`)).status, 401);
  const r = await b.fetchBac(`${BASE}/flow/v1/healthcheck`, {
    headers: { Authorization: "Bearer 9999999999." + "0".repeat(64) },
  });
  assertEquals(r.status, 401);
  assert(await b.pa.sante());
});

Deno.test("jeton expiré : refusé, l'adaptateur en redemande un", async () => {
  const b = monter();
  const j = await jeton(b.fetchBac);
  b.avancer(3601);
  const r = await b.fetchBac(`${BASE}/flow/v1/healthcheck`, {
    headers: { Authorization: `Bearer ${j}` },
  });
  assertEquals(r.status, 401);
  assert(await b.pa.sante());
});

Deno.test("dépôt : syntaxe inconnue → 400 (ErreurPA définitive) ; même trackingId → même flux", async () => {
  const b = monter();
  const octets = new TextEncoder().encode("<Invoice/>") as Uint8Array<
    ArrayBuffer
  >;
  const e = await assertRejects(
    () =>
      b.pa.deposer({
        suivi: "t",
        nom: "f.xml",
        syntaxe: "XML" as never,
        octets,
        typeMime: "application/xml",
      }),
    ErreurPA,
  );
  assertEquals(e.statut, 400);
  assertEquals(e.definitive, true);
  const d1 = await b.pa.deposer({
    suivi: "t-1",
    nom: "f.xml",
    syntaxe: "UBL",
    octets,
    typeMime: "application/xml",
  });
  const d2 = await b.pa.deposer({
    suivi: "t-1",
    nom: "f.xml",
    syntaxe: "UBL",
    octets,
    typeMime: "application/xml",
  });
  assertEquals(d1.flux, d2.flux);
  assertEquals(b.depot.flux.size, 1);
});

Deno.test("de bout en bout : pa.deposer, accusé relevé, facture et CDAR entrants relevés, rejet simulé", async () => {
  const b = monter();
  const portes = new PortesDouble();
  portes.clientsParSiren.set("842115763", CLIENT);
  const stockage = new StockageDouble();
  const chemin = `${CLIENT}/factures/F-2026-0001.xml`;
  stockage.objets.set(chemin, {
    octets: new TextEncoder().encode(
      "<Invoice>F-2026-0001</Invoice>",
    ) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  const autre = "44444444-4444-4444-8444-444444444444";
  stockage.objets.set("rejet.xml", {
    octets: new TextEncoder().encode(
      "<Invoice>REJET-BAC</Invoice>",
    ) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  const facture = (id: string, c: string) => ({
    deposer: true as const,
    facture: id,
    client_id: CLIENT,
    suivi: id,
    nom: `${id}.xml`,
    syntaxe: "UBL" as const,
    chemin: c,
  });
  portes.depots.set(FACTURE, facture(FACTURE, chemin));
  portes.depots.set(autre, facture(autre, "rejet.xml"));
  portes.statuts.set(STATUT, {
    envoyer: true,
    statut: STATUT,
    client_id: CLIENT,
    suivi: STATUT,
    cdar: {
      message: STATUT,
      emis_le: "2026-10-06T15:00:00Z",
      code: "212",
      facture: {
        numero: "F-2026-0001",
        date: "2026-10-01",
        emetteur_siren: "842115763",
      },
      emetteur: { siren: "842115763", role: "SE" },
      destinataire: { siren: "380129866", role: "BY" },
      montant: { valeur: "120.00", devise: "EUR" },
    },
  });
  portes.travaux = [
    travail(1, "pa.deposer", { facture: FACTURE }),
    travail(2, "pa.deposer", { facture: autre }),
    travail(3, "pa.statut", { statut: STATUT }),
  ];
  const deps = {
    portes,
    pa: b.pa,
    stockage,
    ouvrier: "echange-pa@bac",
    journal: journalMuet,
    attente: () => Promise.resolve(),
  };

  const p1 = await executerPassage(deps);
  assertEquals([p1.deposes, p1.statuts, p1.echecs, p1.reportes], [2, 1, 0, 0]);
  assertEquals(portes.notesDepot.get(FACTURE), "flux-1");
  const accuses = [...portes.flux.values()].filter((f) => f.sens === "sortant");
  assertEquals(accuses.length, 3, "les trois dépôts reviennent au relevé");
  assertEquals(accuses.find((f) => f.suivi === FACTURE)!.accuse, "ok");
  const rejet = accuses.find((f) => f.suivi === autre)!;
  assertEquals(rejet.accuse, "erreur");
  assertEquals(
    (rejet.detail.details as { code: string }[])[0].code,
    "REJ_SEMAN",
  );
  assertEquals(
    accuses.find((f) => f.suivi === STATUT)!.type,
    "CustomerInvoiceLC",
  );

  // Ce que la PA reçoit des autres : une facture fournisseur et un statut « Approuvée ».
  b.avancer(60);
  const j = await jeton(b.fetchBac);
  const cdar = fabriquerCdar({
    message: "M-1",
    emis_le: "2026-10-06T15:01:00Z",
    code: "205",
    facture: {
      numero: "F-2026-0001",
      date: "2026-10-01",
      emetteur_siren: "842115763",
    },
    emetteur: { siren: "380129866", role: "BY" },
    destinataire: { siren: "842115763", role: "SE" },
  });
  for (
    const corps of [
      {
        name: "facture-orange.xml",
        flowSyntax: "UBL",
        contenu: FACTURE_RECUE,
      },
      { name: "statut.xml", flowSyntax: "CDAR", contenu: cdar },
    ]
  ) {
    const r = await b.fetchBac(`${BASE}/_bac/entrant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${j}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corps),
    });
    assertEquals(r.status, 201);
  }
  const p2 = await executerPassage(deps);
  assertEquals(p2.nouveaux, 2);
  assertEquals(
    p2.factures_recues,
    1,
    "acheteur 842115763 rattaché au client du banc",
  );
  const cible = [...stockage.objets.keys()].find((k) =>
    k.startsWith(`${CLIENT}/filed_document/`)
  )!;
  assertEquals(
    new TextDecoder().decode(stockage.objets.get(cible)!.octets),
    FACTURE_RECUE,
  );
  assertEquals(portes.facturesDeposees.size, 1);
  const entrants = [...portes.flux.values()].filter((f) =>
    f.sens === "entrant"
  );
  const recue = entrants.find((f) => f.type === "SupplierInvoice")!;
  assertMatch(recue.chemin!, /^_pa\/entrants\/flux-\d+\/facture-orange\.xml$/);
  assertEquals(
    new TextDecoder().decode(stockage.objets.get(recue.chemin!)!.octets),
    FACTURE_RECUE,
  );
  const statut = entrants.find((f) => f.syntaxe === "CDAR")!;
  assertEquals((statut.detail.cdar as Record<string, unknown>).code, "205");
  assertEquals(
    (statut.detail.cdar as Record<string, unknown>).facture,
    "F-2026-0001",
  );

  const p3 = await executerPassage(deps);
  assertEquals(p3.nouveaux, 0, "rien de neuf : curseur et clés d'idempotence");
});

Deno.test("dépôt bucket : chemins sous _pa/bac-a-sable, liste par préfixe", async () => {
  const appels: { url: string; init?: RequestInit }[] = [];
  const objets = new Map<string, string>();
  const f = ((u: string, init?: RequestInit) => {
    appels.push({ url: u, init });
    if (u.includes("/object/list/")) {
      return Promise.resolve(
        Response.json(
          [...objets.keys()].filter((k) => k.includes("/flux/")).map((k) => ({
            name: k.split("/").pop(),
          })),
        ),
      );
    }
    const cle = u.split("/omega-clients/")[1];
    if (init?.method === "POST") {
      objets.set(
        cle,
        String(
          init.body instanceof Uint8Array
            ? new TextDecoder().decode(init.body)
            : init.body,
        ),
      );
      return Promise.resolve(new Response("{}"));
    }
    return Promise.resolve(
      objets.has(cle)
        ? new Response(objets.get(cle))
        : new Response("absent", { status: 400 }),
    );
  }) as unknown as typeof fetch;
  const d = depotBucket("https://p.test", "svc", f);
  assertEquals(await d.lireFlux("x"), null);
  await d.ecrireFlux({
    flowId: "x",
    name: "n",
    flowSyntax: "UBL",
    sha256: "s",
    submittedAt: "t",
    updatedAt: "t",
    flowType: "SupplierInvoice",
    processingRuleSource: "Computed",
    flowDirection: "In",
    acknowledgement: { status: "Ok" },
    mime: "application/xml",
  });
  assert(objets.has("_pa/bac-a-sable/flux/x.json"));
  assertEquals((await d.listerFlux()).map((x) => x.flowId), ["x"]);
  assertEquals(
    JSON.parse(String(appels.find((a) => a.url.includes("/list/"))!.init!.body))
      .prefix,
    "_pa/bac-a-sable/flux/",
  );
});

Deno.test("exemple ubl-public : identifiants en en-têtes, SIREN de l'acheteur posé et relu par echange-pa", async () => {
  const b = monter();
  const poster = (corps: unknown, entetes: Record<string, string>) =>
    b.fetchBac(`${BASE}/_bac/entrant`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...entetes },
      body: JSON.stringify(corps),
    });
  const ids = { "X-Bac-Client-Id": "omega", "X-Bac-Client-Secret": "secret" };
  assertEquals(
    (await poster({ exemple: "ubl-public", acheteur_siren: "842115763" }, {
      ...ids,
      "X-Bac-Client-Secret": "non",
    })).status,
    401,
  );
  assertEquals(
    (await poster({ exemple: "autre", acheteur_siren: "842115763" }, ids))
      .status,
    400,
  );
  assertEquals(
    (await poster({ exemple: "ubl-public", acheteur_siren: "12" }, ids)).status,
    400,
  );
  const r = await poster({
    exemple: "ubl-public",
    acheteur_siren: "842115763",
    numero: "BAC-0001",
  }, ids);
  assertEquals(r.status, 201);
  const flux = await r.json();
  assertEquals(flux.name, "BAC-0001.xml");
  const octets = (await b.depot.lireFichier(flux.flowId))!;
  const xml = new TextDecoder().decode(octets);
  assertMatch(xml, /<cbc:ID>BAC-0001<\/cbc:ID>/);
  assertEquals(
    await sirenAcheteur(octets, "UBL", "application/xml"),
    "842115763",
  );
});

Deno.test("garde de la recette : hôte exact seulement ; mêmes identifiants des deux côtés", () => {
  assertEquals(estRecette("https://ygwbgpowzlbdaajlsqkn.supabase.co"), true);
  assertEquals(
    estRecette("https://ygwbgpowzlbdaajlsqkn.supabase.co.ailleurs.fr"),
    false,
  );
  assertEquals(estRecette(undefined), false);
  const c = configurationBacRecette(
    "https://ygwbgpowzlbdaajlsqkn.supabase.co",
  )!;
  assertEquals([c.clientId, c.clientSecret], [
    REGLAGES_RECETTE.clientId,
    REGLAGES_RECETTE.clientSecret,
  ]);
});
