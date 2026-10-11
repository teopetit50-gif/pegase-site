import { assertEquals, assertRejects } from "@std/assert";
import { clientWhatsApp, definitifMeta, ErreurMeta } from "./meta.ts";

Deno.test("WhatsApp : envoi d'un texte, jeton Bearer, wamid rendu ; média téléversé en multipart", async () => {
  const appels: { url: string; auth: string | null; corps: unknown }[] = [];
  const f: typeof fetch = (entree, init) => {
    const corps = init!.body instanceof FormData
      ? Object.fromEntries(
        [...init!.body.entries()].map((
          [k, v],
        ) => [k, typeof v === "string" ? v : (v as File).name]),
      )
      : JSON.parse(String(init!.body));
    appels.push({
      url: String(entree),
      auth: new Headers(init!.headers).get("authorization"),
      corps,
    });
    const rep = String(entree).endsWith("/media")
      ? { id: "M1" }
      : { messages: [{ id: "wamid.ABC" }] };
    return Promise.resolve(new Response(JSON.stringify(rep)));
  };
  const c = clientWhatsApp("1234", "jeton", f);
  assertEquals(
    await c.televerser(new Uint8Array([1]), "application/pdf", "facture.pdf"),
    "M1",
  );
  const wamid = await c.envoyer({
    to: "33612345678",
    type: "text",
    text: { body: "Bonjour", preview_url: false },
  });
  assertEquals(wamid, "wamid.ABC");
  assertEquals(appels[0].url, "https://graph.facebook.com/v21.0/1234/media");
  assertEquals(appels[0].corps, {
    messaging_product: "whatsapp",
    type: "application/pdf",
    file: "facture.pdf",
  });
  assertEquals(appels[1].url, "https://graph.facebook.com/v21.0/1234/messages");
  assertEquals(appels[1].auth, "Bearer jeton");
  assertEquals(appels[1].corps, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "33612345678",
    type: "text",
    text: { body: "Bonjour", preview_url: false },
  });
});

Deno.test("WhatsApp : 131047 (hors fenêtre de 24 h) définitif ; 130429 et 190 transitoires ; 500 transitoire", async () => {
  const cas: [number, number | null, boolean][] = [
    [400, 131047, true],
    [400, 100, true],
    [400, 130429, false],
    [401, 190, false],
    [500, null, false],
    [429, null, false],
  ];
  for (const [statut, code, definitif] of cas) {
    assertEquals(definitifMeta(statut, code), definitif, `${statut}/${code}`);
    const corps = JSON.stringify({ error: { code, message: "x" } });
    const c = clientWhatsApp(
      "1",
      "j",
      () => Promise.resolve(new Response(corps, { status: statut })),
    );
    const e = await assertRejects(
      () =>
        c.envoyer({
          to: "1",
          type: "text",
          text: { body: "b", preview_url: false },
        }),
      ErreurMeta,
    );
    assertEquals([e.code, e.definitif], [code, definitif]);
  }
  const reseau = clientWhatsApp(
    "1",
    "j",
    () => Promise.reject(new TypeError("dns")),
  );
  const e = await assertRejects(
    () =>
      reseau.envoyer({
        to: "1",
        type: "text",
        text: { body: "b", preview_url: false },
      }),
    ErreurMeta,
  );
  assertEquals(e.definitif, false);
});
