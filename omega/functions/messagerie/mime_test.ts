import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import {
  composerBrouillon,
  decoderMotsEncodes,
  lireAdresses,
  lireMessage,
  lireParametres,
} from "./mime.ts";

const enc = (t: string) =>
  new TextEncoder().encode(t.replace(/\n/g, "\r\n")) as Uint8Array<ArrayBuffer>;
const latin1 = (t: string) =>
  Uint8Array.from(
    t.replace(/\n/g, "\r\n"),
    (c) => c.charCodeAt(0),
  ) as Uint8Array<ArrayBuffer>;

Deno.test("en-têtes : mots encodés B et Q, repli de ligne, adresses avec nom", () => {
  assertEquals(
    decoderMotsEncodes(
      "=?UTF-8?B?RmFjdHVyZSBkJ29jdG9icmU=?= =?UTF-8?Q?_=C3=A9t=C3=A9?=",
    ),
    "Facture d'octobre été",
  );
  assertEquals(
    decoderMotsEncodes("=?iso-8859-1?Q?R=E9ponse?= : devis"),
    "Réponse : devis",
  );
  assertEquals(
    lireAdresses('"Martin, Élodie" <Elodie@Exemple.TEST>, autre@exemple.test'),
    [
      { adresse: "elodie@exemple.test", nom: "Martin, Élodie" },
      { adresse: "autre@exemple.test", nom: null },
    ],
  );
  assertEquals(
    lireParametres(`attachment; filename*=UTF-8''facture%20%C3%A9t%C3%A9.pdf`)
      .params.filename,
    "facture été.pdf",
  );
});

Deno.test("message multipart : texte, html, pièce base64, en-têtes de fil, date", () => {
  const brut = enc(`From: =?UTF-8?Q?=C3=89lodie_Martin?= <elodie@exemple.test>
To: compta@banc.test
Cc: "Associé" <associe@exemple.test>
Subject: =?UTF-8?B?UsOpcG9uc2UgOiBmYWN0dXJl?=
Date: Tue, 06 Oct 2026 16:10:00 +0200
Message-ID: <abc@exemple.test>
In-Reply-To: <omega-1@banc.test>
References: <omega-0@banc.test>
 <omega-1@banc.test>
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="ext"

--ext
Content-Type: multipart/alternative; boundary="alt"

--alt
Content-Type: text/plain; charset=utf-8
Content-Transfer-Encoding: quoted-printable

Bonjour, voici la facture corrig=C3=A9e.=
 Merci.
--alt
Content-Type: text/html; charset=utf-8

<p>Bonjour</p>
--alt--
--ext
Content-Type: application/pdf; name="facture.pdf"
Content-Disposition: attachment; filename="facture.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjcK
--ext--
`);
  const m = lireMessage(brut);
  assertEquals(m.de, "elodie@exemple.test");
  assertEquals(m.deNom, "Élodie Martin");
  assertEquals(m.a, ["compta@banc.test"]);
  assertEquals(m.cc, ["associe@exemple.test"]);
  assertEquals(m.sujet, "Réponse : facture");
  assertEquals(m.messageId, "<abc@exemple.test>");
  assertEquals(m.enReponseA, "<omega-1@banc.test>");
  assertEquals(m.references, ["<omega-0@banc.test>", "<omega-1@banc.test>"]);
  assertEquals(m.date, "2026-10-06T14:10:00.000Z");
  assertEquals(m.texte, "Bonjour, voici la facture corrigée. Merci.");
  assertEquals(m.html?.trim(), "<p>Bonjour</p>");
  assertEquals(m.pieces.length, 1);
  assertEquals(m.pieces[0].nom, "facture.pdf");
  assertEquals(m.pieces[0].typeMime, "application/pdf");
  assertEquals(new TextDecoder().decode(m.pieces[0].octets), "%PDF-1.7\n");
});

Deno.test("message simple latin-1, et html seul ramené en texte", () => {
  const m = lireMessage(latin1(`From: a@b.test
Subject: =?iso-8859-1?Q?=E9t=E9?=
Content-Type: text/plain; charset=iso-8859-1
Content-Transfer-Encoding: 8bit

Café crème
`));
  assertEquals(m.sujet, "été");
  assertEquals(m.texte.trim(), "Café crème");
  const h = lireMessage(enc(`From: a@b.test
Content-Type: text/html; charset=utf-8

<p>Bonjour&nbsp;Élodie</p><p>Ligne 2<br>Ligne 3</p>
`));
  assertEquals(h.texte, "Bonjour Élodie\n\nLigne 2\nLigne 3");
});

Deno.test("brouillon : relu à l'identique, accents, pièce jointe, en-têtes sans injection", () => {
  const brut = composerBrouillon({
    de: "compta@banc.test",
    deNom: "Comptabilité Banc",
    a: "client@exemple.test",
    aNom: "Élodie Martin",
    sujet: "Votre facture d'octobre\r\nBcc: espion@exemple.test",
    texte: "Bonjour Élodie,\nvoici votre facture.",
    html: "<p>Bonjour Élodie,</p>",
    pieces: [{
      nom: "facture été.pdf",
      typeMime: "application/pdf",
      octets: new TextEncoder().encode("%PDF-1.7"),
    }],
    enReponseA: "<abc@exemple.test>",
    entetes: { "X-Omega-Envoi": "55555555-5555-4555-8555-555555555555" },
    date: new Date("2026-10-06T14:00:00Z"),
  });
  assertEquals(
    brut.split("\r\n").filter((l) => /^Bcc:/i.test(l)).length,
    0,
    "pas d'en-tête injecté",
  );
  assertMatch(brut, /^X-Omega-Envoi: 55555555/m);
  const lu = lireMessage(
    new TextEncoder().encode(brut) as Uint8Array<ArrayBuffer>,
  );
  assertEquals(lu.de, "compta@banc.test");
  assertEquals(lu.deNom, "Comptabilité Banc");
  assertEquals(lu.a, ["client@exemple.test"]);
  assertEquals(lu.sujet, "Votre facture d'octobre Bcc: espion@exemple.test");
  assertEquals(lu.texte, "Bonjour Élodie,\nvoici votre facture.");
  assertEquals(lu.html, "<p>Bonjour Élodie,</p>");
  assertEquals(lu.enReponseA, "<abc@exemple.test>");
  assertEquals(
    lu.pieces.map((p) => [p.nom, new TextDecoder().decode(p.octets)]),
    [["facture été.pdf", "%PDF-1.7"]],
  );
  assertThrows(() =>
    composerBrouillon({
      de: "pas une adresse",
      a: "x@y.test",
      sujet: "s",
      texte: "t",
    })
  );
});
