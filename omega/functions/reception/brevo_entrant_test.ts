import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  CLIENT,
  journalMemoire,
  MAINTENANT,
  PortesDouble,
  StockageDouble,
} from "./doubles.ts";
import {
  lireItem,
  type PiecesBrevo,
  traiterBrevoEntrant,
} from "./brevo_entrant.ts";

const JETON = "jeton-entrant-test";

class PiecesDouble implements PiecesBrevo {
  tokens = new Map<string, Uint8Array<ArrayBuffer>>();
  // deno-lint-ignore require-await
  async telecharger(token: string) {
    const o = this.tokens.get(token);
    if (!o) throw new Error(`token inconnu ${token}`);
    return o;
  }
}

function monter(opts: { pieces?: PiecesDouble | null } = {}) {
  const portes = new PortesDouble();
  portes.connaitre("email", "contact@client.test");
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  const pieces = opts.pieces === undefined ? new PiecesDouble() : opts.pieces;
  return {
    portes,
    stockage,
    journal,
    pieces,
    deps: {
      portes,
      stockage,
      journal,
      jeton: JETON,
      pieces,
      maintenant: () => MAINTENANT,
    },
  };
}

function requete(corps: unknown, jeton: string | null = JETON): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (jeton) headers.set("Authorization", `Bearer ${jeton}`);
  return new Request("https://recette.test/functions/v1/reception/brevo", {
    method: "POST",
    headers,
    body: typeof corps === "string" ? corps : JSON.stringify(corps),
  });
}

function item(extra: Record<string, unknown> = {}) {
  return {
    Uuid: ["a1b2c3d4-0000-4000-8000-000000000001"],
    MessageId: "<CAF-123@mail.exemple.test>",
    InReplyTo: "<202610051200.999@smtp-relay.mailin.fr>",
    From: { Name: "Jean Client", Address: "Jean.Client@Exemple.test" },
    To: [{ Name: "Contact", Address: "contact@client.test" }],
    Cc: [],
    ReplyTo: null,
    SentAtDate: "Mon, 05 Oct 2026 11:30:00 +0200",
    Subject: "Re: Relance de facture",
    RawHtmlBody: "<div>Bonjour, c'est réglé.</div>",
    RawTextBody: "Bonjour, c'est réglé.\n\n> Votre facture est en attente.",
    ExtractedMarkdownMessage: "Bonjour, c'est réglé.",
    ExtractedMarkdownSignature: "",
    SpamScore: 0.4,
    Attachments: [],
    Headers: {
      "Message-ID": "<CAF-123@mail.exemple.test>",
      References: "<a@x> <b@y>",
    },
    ...extra,
  };
}

Deno.test("e-mail entrant : boîte résolue par le destinataire, réception déposée avec de, sujet, corps, In-Reply-To", async () => {
  const { portes, deps } = monter();
  const r = await traiterBrevoEntrant(requete({ items: [item()] }), deps);
  assertEquals(r.status, 200);
  const corps = await r.json();
  assertEquals(corps.recus, 1);
  assertEquals(corps.issues[0].sortie, "nouvelle");
  assertEquals(portes.receptions.length, 1);
  const rec = portes.receptions[0];
  assertEquals(rec.client, CLIENT);
  assertEquals(rec.canal, "email");
  assertEquals(rec.boite, "contact@client.test");
  assertEquals(rec.identifiant, "<CAF-123@mail.exemple.test>");
  assertEquals(rec.de, "jean.client@exemple.test");
  assertEquals(rec.deNom, "Jean Client");
  assertEquals(rec.sujet, "Re: Relance de facture");
  assertEquals(rec.corps, "Bonjour, c'est réglé.");
  assertEquals(rec.corpsHtml, "<div>Bonjour, c'est réglé.</div>");
  assertEquals(rec.recuLe, "2026-10-05T09:30:00.000Z");
  assertEquals(
    rec.detail.en_reponse_a,
    "<202610051200.999@smtp-relay.mailin.fr>",
  );
  assertEquals(rec.detail.references, ["<a@x>", "<b@y>"]);
  assertEquals(rec.pieces, []);
});

Deno.test("deux livraisons du même e-mail n'écrivent qu'une ligne", async () => {
  const { portes, deps } = monter();
  await traiterBrevoEntrant(requete({ items: [item()] }), deps);
  const r2 = await traiterBrevoEntrant(requete({ items: [item()] }), deps);
  assertEquals(r2.status, 200);
  assertEquals((await r2.json()).issues[0].sortie, "deja_recue");
  assertEquals(portes.receptions.length, 1);
});

Deno.test("pièce jointe : téléchargée chez Brevo, déposée dans omega-clients sous le client, décrite dans la réception", async () => {
  const { portes, stockage, pieces, deps } = monter();
  pieces!.tokens.set("tok-1", new TextEncoder().encode("%PDF-1.4 reçu"));
  const r = await traiterBrevoEntrant(
    requete({
      items: [
        item({
          Attachments: [{
            Name: "../facture signée.pdf",
            ContentType: "application/pdf",
            ContentLength: 14,
            ContentID: "",
            DownloadToken: "tok-1",
          }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(r.status, 200);
  assertEquals(stockage.depots, 1);
  const chemin = [...stockage.objets.keys()][0];
  assertMatch(
    chemin,
    new RegExp(
      `^${CLIENT}/receptions/CAF-123@mail.exemple.test/facture signée\\.pdf$`,
    ),
  );
  assertEquals(stockage.objets.get(chemin)!.typeMime, "application/pdf");
  assertEquals(portes.receptions[0].pieces, [{
    nom: "facture signée.pdf",
    mime: "application/pdf",
    taille: 14,
    chemin,
  }]);
  // Relivraison : même chemin réécrit, pas de doublon.
  await traiterBrevoEntrant(
    requete({
      items: [
        item({
          Attachments: [{
            Name: "facture signée.pdf",
            ContentType: "application/pdf",
            DownloadToken: "tok-1",
          }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(stockage.objets.size, 1);
});

Deno.test("BREVO_API_KEY absente : le message est reçu sans ses pièces, qui sont listées dans detail.pieces_ignorees", async () => {
  const { portes, journal, deps } = monter({ pieces: null });
  const r = await traiterBrevoEntrant(
    requete({
      items: [
        item({
          Attachments: [{
            Name: "x.pdf",
            ContentType: "application/pdf",
            DownloadToken: "tok-1",
          }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(r.status, 200);
  assertEquals(portes.receptions[0].pieces, []);
  assertEquals(portes.receptions[0].detail.pieces_ignorees, ["x.pdf"]);
  assert(journal.lignes.some((l) => l.includes("BREVO_API_KEY absente")));
});

Deno.test("pièce introuvable chez Brevo : 500 pour que Brevo rejoue, rien n'est déposé", async () => {
  const { portes, deps } = monter();
  const r = await traiterBrevoEntrant(
    requete({
      items: [
        item({
          Attachments: [{
            Name: "x.pdf",
            ContentType: "application/pdf",
            DownloadToken: "inconnu",
          }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(r.status, 500);
  assertEquals(portes.receptions.length, 0);
});

Deno.test("boîte inconnue (To et Cc) : ignoré, 200, aucune écriture", async () => {
  const { portes, deps } = monter();
  const r = await traiterBrevoEntrant(
    requete({
      items: [
        item({
          To: [{ Address: "inconnu@ailleurs.test" }],
          Cc: [{ Address: "autre@ailleurs.test" }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(r.status, 200);
  assertEquals((await r.json()).issues[0].sortie, "boite_inconnue");
  assertEquals(portes.receptions.length, 0);
});

Deno.test("boîte en copie : la résolution essaie To puis Cc", async () => {
  const { portes, deps } = monter();
  await traiterBrevoEntrant(
    requete({
      items: [
        item({
          To: [{ Address: "inconnu@ailleurs.test" }],
          Cc: [{ Address: "CONTACT@client.test" }],
        }),
      ],
    }),
    deps,
  );
  assertEquals(portes.receptions[0].boite, "contact@client.test");
});

Deno.test("jeton absent ou faux → 401 ; non posé → 503 ; corps illisible → 400", async () => {
  const { deps } = monter();
  assertEquals(
    (await traiterBrevoEntrant(requete({ items: [item()] }, null), deps))
      .status,
    401,
  );
  assertEquals(
    (await traiterBrevoEntrant(requete({ items: [item()] }, "faux"), deps))
      .status,
    401,
  );
  assertEquals(
    (await traiterBrevoEntrant(requete({ items: [item()] }), {
      ...deps,
      jeton: null,
    })).status,
    503,
  );
  assertEquals(
    (await traiterBrevoEntrant(requete("{pas du json"), deps)).status,
    400,
  );
});

Deno.test("porte en panne : 500", async () => {
  const { portes, deps } = monter();
  portes.panne = new Error("hors service");
  assertEquals(
    (await traiterBrevoEntrant(requete({ items: [item()] }), deps)).status,
    500,
  );
});

Deno.test("lireItem : repli sur Uuid et RawTextBody, date illisible → maintenant", () => {
  const m = lireItem({
    Uuid: ["u-1"],
    RawTextBody: "texte brut",
    SentAtDate: "n'importe quoi",
    From: { Address: "a@b.test" },
  }, MAINTENANT)!;
  assertEquals(m.identifiant, "u-1");
  assertEquals(m.corps, "texte brut");
  assertEquals(m.recuLe, MAINTENANT.toISOString());
  assertEquals(lireItem({}, MAINTENANT), null);
});

Deno.test("chemins des pièces : identifiant assaini (chevrons, caractères spéciaux), deux pièces de même nom", async () => {
  const { segmentSur, cheminPiece } = await import("./commun.ts");
  assertEquals(
    segmentSur("<CAF-123@mail.exemple.test>"),
    "CAF-123@mail.exemple.test",
  );
  assertEquals(segmentSur("wamid.HBgLMzM2MTI=/x"), "wamid.HBgLMzM2MTI__x");
  assertEquals(segmentSur("  "), "sans-id");
  assertEquals(
    cheminPiece(CLIENT, "<a@b>", "x.pdf"),
    `${CLIENT}/receptions/a@b/x.pdf`,
  );

  const { portes, stockage, pieces, deps } = monter();
  pieces!.tokens.set("t1", new Uint8Array([1]));
  pieces!.tokens.set("t2", new Uint8Array([2]));
  await traiterBrevoEntrant(
    requete({
      items: [item({
        Attachments: [
          {
            Name: "scan.pdf",
            ContentType: "application/pdf",
            DownloadToken: "t1",
          },
          {
            Name: "scan.pdf",
            ContentType: "application/pdf",
            DownloadToken: "t2",
          },
        ],
      })],
    }),
    deps,
  );
  assertEquals(stockage.objets.size, 2);
  assertEquals(portes.receptions[0].pieces.map((p) => p.nom), [
    "scan.pdf",
    "2-scan.pdf",
  ]);
});
