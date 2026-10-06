import { assert, assertEquals, assertMatch } from "@std/assert";
import { creerDepot, TAILLE_MAX } from "./webdav.ts";
import {
  CLIENT,
  IDENTIFIANT,
  journalMuet,
  MOT_DE_PASSE,
  PortesDouble,
  StockageDouble,
} from "./doubles.ts";

const BASE = "https://p.supabase.co/functions/v1/depot";
const AUTH = "Basic " + btoa(`${IDENTIFIANT}:${MOT_DE_PASSE}`);
const PDF = new TextEncoder().encode("%PDF-1.7 facture");

function monter() {
  const portes = new PortesDouble();
  const stockage = new StockageDouble();
  const servir = creerDepot({
    portes,
    stockage,
    base: "/functions/v1/depot",
    journal: journalMuet,
  });
  const appel = (
    methode: string,
    chemin: string,
    init: { corps?: BodyInit; entetes?: Record<string, string> } = {},
  ) =>
    servir(
      new Request(`${BASE}${chemin}`, {
        method: methode,
        body: init.corps,
        headers: { Authorization: AUTH, ...init.entetes },
      }),
    );
  return { portes, stockage, servir, appel };
}

Deno.test("OPTIONS sans authentification : classes DAV 1 et 2, MS-Author-Via ; sans identifiant ou faux : 401 Basic", async () => {
  const a = monter();
  const o = await a.servir(new Request(`${BASE}/`, { method: "OPTIONS" }));
  assertEquals(o.status, 200);
  assertEquals(o.headers.get("dav"), "1, 2");
  assertEquals(o.headers.get("ms-author-via"), "DAV");
  const sans = await a.servir(new Request(`${BASE}/`, { method: "PROPFIND" }));
  assertEquals(sans.status, 401);
  assertMatch(sans.headers.get("www-authenticate")!, /^Basic realm=/);
  const faux = await a.servir(
    new Request(`${BASE}/`, {
      method: "PROPFIND",
      headers: {
        Authorization: "Basic " +
          btoa(`${IDENTIFIANT}:mauvais-mot-de-passe-0000`),
      },
    }),
  );
  assertEquals(faux.status, 401);
  assertEquals(
    a.portes.ouvertures.length,
    1,
    "un mot de passe trop court ou mal formé n'atteint même pas la base",
  );
});

Deno.test("dépôt d'un PDF : bucket <client>/filed_document/<uuid>/<nom>, pièce FILED « connecteur », visible au PROPFIND", async () => {
  const a = monter();
  const r = await a.appel("PUT", "/Facture%20Orange%20sept.pdf", {
    corps: PDF,
  });
  assertEquals(r.status, 201);
  const [chemin] = [...a.stockage.objets.keys()];
  assertMatch(
    chemin,
    new RegExp(
      `^${CLIENT}/filed_document/[0-9a-f-]{36}/Facture Orange sept\\.pdf$`,
    ),
  );
  assertEquals(a.stockage.objets.get(chemin)!.typeMime, "application/pdf");
  const d = a.portes.depots[0];
  assertEquals([d.client, d.nom, d.mime, d.octets, d.chemin], [
    CLIENT,
    "Facture Orange sept.pdf",
    "application/pdf",
    PDF.length,
    chemin,
  ]);
  assertMatch(d.chemin, new RegExp(`/filed_document/${d.document}/`));
  assertEquals(
    a.portes.elements.get("Facture Orange sept.pdf")!.etat,
    "importe",
  );
  assertEquals(
    a.portes.elements.get("Facture Orange sept.pdf")!.reference,
    "REC-2026-0001",
  );

  const p = await a.appel("PROPFIND", "/", { entetes: { Depth: "1" } });
  assertEquals(p.status, 207);
  const x = await p.text();
  assertMatch(x, /<D:href>\/functions\/v1\/depot\/<\/D:href>/);
  assertMatch(
    x,
    /<D:href>\/functions\/v1\/depot\/Facture%20Orange%20sept\.pdf<\/D:href>/,
  );
  assertMatch(x, /<D:getcontentlength>16<\/D:getcontentlength>/);
  const zero =
    await (await a.appel("PROPFIND", "/", { entetes: { Depth: "0" } })).text();
  assert(!zero.includes("Facture"), "Depth 0 : la racine seule");
  assertEquals(
    (await a.appel("PROPFIND", "/absent.pdf", { entetes: { Depth: "0" } }))
      .status,
    404,
  );
});

Deno.test("Explorateur Windows : PUT de 0 octet réservé (rien d'importé), LOCK, PUT du contenu, PROPPATCH, UNLOCK", async () => {
  const a = monter();
  assertEquals(
    (await a.appel("PUT", "/scan.pdf", { corps: new Uint8Array(0) })).status,
    201,
  );
  assertEquals(a.portes.depots.length, 0);
  assertEquals(a.portes.elements.get("scan.pdf")!.etat, "vide");
  const l = await a.appel("LOCK", "/scan.pdf", {
    corps:
      '<?xml version="1.0"?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype><D:owner><D:href>CABINET\\marie</D:href></D:owner></D:lockinfo>',
  });
  assertEquals(l.status, 200);
  assertMatch(
    l.headers.get("lock-token")!,
    /^<opaquelocktoken:[0-9a-f-]{36}>$/,
  );
  const lx = await l.text();
  assertMatch(lx, /<D:owner>CABINET\\marie<\/D:owner>/);
  assertEquals((await a.appel("PUT", "/scan.pdf", { corps: PDF })).status, 204);
  assertEquals(a.portes.depots.length, 1);
  const pp = await a.appel("PROPPATCH", "/scan.pdf", {
    corps:
      '<?xml version="1.0"?><D:propertyupdate xmlns:D="DAV:" xmlns:Z="urn:schemas-microsoft-com:"><D:set><D:prop><Z:Win32CreationTime>Tue, 06 Oct 2026 17:00:00 GMT</Z:Win32CreationTime><Z:Win32FileAttributes>00000020</Z:Win32FileAttributes></D:prop></D:set></D:propertyupdate>',
  });
  assertEquals(pp.status, 207);
  const ppx = await pp.text();
  assertMatch(
    ppx,
    /<p0:Win32CreationTime xmlns:p0="urn:schemas-microsoft-com:"\/>/,
  );
  assertMatch(ppx, /HTTP\/1\.1 200 OK/);
  assertEquals(
    (await a.appel("UNLOCK", "/scan.pdf", {
      entetes: { "Lock-Token": "<opaquelocktoken:x>" },
    })).status,
    204,
  );
});

Deno.test("un lot glissé avec ses dossiers : MKCOL, « Nouveau dossier » renommé, fichiers dedans listés au bon niveau", async () => {
  const a = monter();
  assertEquals((await a.appel("MKCOL", "/Nouveau%20dossier")).status, 201);
  assertEquals((await a.appel("MKCOL", "/Nouveau%20dossier")).status, 405);
  const mv = await a.appel("MOVE", "/Nouveau%20dossier", {
    entetes: { Destination: `${BASE}/Septembre/` },
  });
  assertEquals(mv.status, 201);
  assertEquals(
    (await a.appel("PUT", "/Septembre/f1.pdf", { corps: PDF })).status,
    201,
  );
  assertEquals(
    (await a.appel("PUT", "/Septembre/f2.xml", {
      corps: new TextEncoder().encode("<Invoice/>"),
    })).status,
    201,
  );
  const racine =
    await (await a.appel("PROPFIND", "/", { entetes: { Depth: "1" } })).text();
  assertMatch(racine, /depot\/Septembre\/<\/D:href>/);
  assert(
    !racine.includes("f1.pdf"),
    "les fichiers du sous-dossier ne sont pas à la racine",
  );
  const sous = await (await a.appel("PROPFIND", "/Septembre/", {
    entetes: { Depth: "1" },
  })).text();
  assertMatch(sous, /Septembre\/f1\.pdf<\/D:href>/);
  assertMatch(sous, /Septembre\/f2\.xml<\/D:href>/);
  assertEquals(a.portes.depots.map((d) => d.mime), [
    "application/pdf",
    "application/xml",
  ]);
  assertMatch(a.portes.depots[0].expediteur, /Septembre\/f1\.pdf/);
  const deplacer = await a.appel("MOVE", "/Septembre/f1.pdf", {
    entetes: { Destination: `${BASE}/autre.pdf` },
  });
  assertEquals(deplacer.status, 403, "une pièce reçue ne se déplace plus");
});

Deno.test("fichiers système ignorés (._, .DS_Store, Thumbs.db, ~$) ; type refusé 415 ; trop gros 413 ; doublon reconnu", async () => {
  const a = monter();
  for (const n of ["._f.pdf", ".DS_Store", "Thumbs.db", "~$lettre.docx"]) {
    assertEquals(
      (await a.appel("PUT", `/${encodeURIComponent(n)}`, { corps: PDF }))
        .status,
      201,
      n,
    );
    assertEquals(a.portes.elements.get(n)!.etat, "ignore", n);
  }
  assertEquals(a.portes.depots.length, 0);
  const r = await a.appel("PUT", "/lettre.docx", { corps: PDF });
  assertEquals(r.status, 415);
  assertMatch(await r.text(), /PDF, PNG, JPEG/);
  const gros = await a.appel("PUT", "/gros.pdf", {
    corps: new Uint8Array(1),
    entetes: { "Content-Length": String(TAILLE_MAX + 1) },
  });
  assertEquals(gros.status, 413);
  await a.appel("PUT", "/a.pdf", { corps: PDF });
  await a.appel("PUT", "/b.pdf", { corps: PDF });
  assertEquals(a.portes.elements.get("b.pdf")!.etat, "doublon");
});

Deno.test("jamais de lecture ni d'effacement ; chemin piégé refusé ; module non FILED : 501 ; FILED absent : 409 sans pièce", async () => {
  const a = monter();
  await a.appel("PUT", "/a.pdf", { corps: PDF });
  assertEquals((await a.appel("GET", "/a.pdf")).status, 403);
  assertEquals((await a.appel("DELETE", "/a.pdf")).status, 403);
  assertEquals((await a.appel("GET", "/")).status, 200);
  assertEquals(
    (await a.appel("PUT", "/%2e%2e/x.pdf", { corps: PDF })).status,
    400,
  );
  assertEquals(
    (await a.appel("PUT", "/a%00b.pdf", { corps: PDF })).status,
    400,
  );
  assertEquals(
    (await a.appel("PUT", "/a%5Cb.pdf", { corps: PDF })).status,
    400,
  );

  const b = monter();
  b.portes.module = "tavaro";
  assertEquals((await b.appel("PUT", "/a.pdf", { corps: PDF })).status, 501);
  const c = monter();
  c.portes.filedEnPanne =
    'porte filed_deposer_piece : HTTP 400 {"code":"55000","message":"FILED n\'est pas installé"}';
  const r = await c.appel("PUT", "/a.pdf", { corps: PDF });
  assertEquals(r.status, 409);
  assertEquals(c.portes.elements.get("a.pdf")!.etat, "refuse");
});

Deno.test("l'authentification est gardée une minute : un lot de 20 fichiers ne demande qu'une ouverture", async () => {
  const a = monter();
  for (let i = 0; i < 20; i++) {
    await a.appel("PUT", `/f${i}.pdf`, {
      corps: new TextEncoder().encode(`%PDF ${i}`),
    });
  }
  assertEquals(a.portes.ouvertures.length, 1);
  assertEquals(a.portes.depots.length, 20);
});
