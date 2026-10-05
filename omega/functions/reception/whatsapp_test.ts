import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  CLIENT,
  journalMemoire,
  MAINTENANT,
  PortesDouble,
  StockageDouble,
} from "./doubles.ts";
import { hmacSha256Hex } from "./commun.ts";
import { type Graph, lireNotification, traiterWhatsApp } from "./whatsapp.ts";

const SECRET_APP = "secret-app-meta-test";
const VERIFICATION = "jeton-verification-test";
const PHONE_ID = "123456789012345";

class GraphDouble implements Graph {
  medias = new Map<
    string,
    { url: string; mime_type: string; octets: Uint8Array<ArrayBuffer> }
  >();
  // deno-lint-ignore require-await
  async media(id: string) {
    const m = this.medias.get(id);
    if (!m) throw new Error(`média inconnu ${id}`);
    return {
      url: m.url,
      mime_type: m.mime_type,
      file_size: m.octets.byteLength,
    };
  }
  // deno-lint-ignore require-await
  async telecharger(url: string) {
    for (const m of this.medias.values()) if (m.url === url) return m.octets;
    throw new Error("url inconnue");
  }
}

function monter(opts: { graph?: GraphDouble | null } = {}) {
  const portes = new PortesDouble();
  portes.connaitre("whatsapp", PHONE_ID);
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  const graph = opts.graph === undefined ? new GraphDouble() : opts.graph;
  return {
    portes,
    stockage,
    journal,
    graph,
    deps: {
      portes,
      stockage,
      journal,
      jetonVerification: VERIFICATION,
      secretApp: SECRET_APP,
      graph,
      maintenant: () => MAINTENANT,
    },
  };
}

async function post(
  corps: unknown,
  opts: { secret?: string; signature?: string | null } = {},
): Promise<Request> {
  const brut = JSON.stringify(corps);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (opts.signature !== null) {
    headers.set(
      "X-Hub-Signature-256",
      opts.signature ??
        `sha256=${await hmacSha256Hex(opts.secret ?? SECRET_APP, brut)}`,
    );
  }
  return new Request("https://recette.test/functions/v1/reception/whatsapp", {
    method: "POST",
    headers,
    body: brut,
  });
}

function notification(
  messages: Record<string, unknown>[],
  extra: Record<string, unknown> = {},
) {
  return {
    object: "whatsapp_business_account",
    entry: [{
      id: "WABA",
      changes: [{
        field: "messages",
        value: {
          messaging_product: "whatsapp",
          metadata: {
            display_phone_number: "33700000000",
            phone_number_id: PHONE_ID,
          },
          contacts: [{
            profile: { name: "Jean Client" },
            wa_id: "33612345678",
          }],
          messages,
          ...extra,
        },
      }],
    }],
  };
}

const texte = (id = "wamid.AAA1") => ({
  from: "33612345678",
  id,
  timestamp: "1791194400",
  type: "text",
  text: { body: "Bonjour, c'est réglé." },
});

Deno.test("GET : vérification Meta renvoie hub.challenge si le jeton est bon, 403 sinon", async () => {
  const { deps } = monter();
  const ok = await traiterWhatsApp(
    new Request(
      `https://x.test/reception/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFICATION}&hub.challenge=12345`,
    ),
    deps,
  );
  assertEquals(ok.reponse.status, 200);
  assertEquals(await ok.reponse.text(), "12345");
  const ko = await traiterWhatsApp(
    new Request(
      `https://x.test/reception/whatsapp?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=12345`,
    ),
    deps,
  );
  assertEquals(ko.reponse.status, 403);
  const sans = await traiterWhatsApp(
    new Request(
      `https://x.test/reception/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFICATION}&hub.challenge=1`,
    ),
    { ...deps, jetonVerification: null },
  );
  assertEquals(sans.reponse.status, 403);
});

Deno.test("message texte : accusé 200 immédiat, puis réception déposée (boîte = phone_number_id, identifiant = wamid)", async () => {
  const { portes, deps } = monter();
  const { reponse, traitement } = await traiterWhatsApp(
    await post(notification([texte()])),
    deps,
  );
  assertEquals(reponse.status, 200);
  assertEquals(await reponse.json(), { recus: 1 });
  const issues = await traitement!;
  assertEquals(issues[0].sortie, "nouvelle");
  const r = portes.receptions[0];
  assertEquals(r.client, CLIENT);
  assertEquals(r.canal, "whatsapp");
  assertEquals(r.boite, PHONE_ID);
  assertEquals(r.identifiant, "wamid.AAA1");
  assertEquals(r.de, "33612345678");
  assertEquals(r.deNom, "Jean Client");
  assertEquals(r.corps, "Bonjour, c'est réglé.");
  assertEquals(r.recuLe, "2026-10-05T10:00:00.000Z");
  assertEquals(r.detail.type, "text");
  assertEquals(r.pieces, []);
});

Deno.test("deux livraisons de la même notification n'écrivent qu'une ligne", async () => {
  const { portes, deps } = monter();
  await (await traiterWhatsApp(await post(notification([texte()])), deps))
    .traitement!;
  const issues =
    await (await traiterWhatsApp(await post(notification([texte()])), deps))
      .traitement!;
  assertEquals(issues[0].sortie, "deja_recue");
  assertEquals(portes.receptions.length, 1);
});

Deno.test("document : média lu par Graph, déposé dans omega-clients, légende en corps", async () => {
  const { portes, stockage, graph, deps } = monter();
  graph!.medias.set("media-1", {
    url: "https://lookaside.test/m1",
    mime_type: "application/pdf",
    octets: new TextEncoder().encode("%PDF"),
  });
  const doc = {
    from: "33612345678",
    id: "wamid.DOC1",
    timestamp: "1791194400",
    type: "document",
    document: {
      id: "media-1",
      mime_type: "application/pdf",
      sha256: "abc",
      filename: "devis.pdf",
      caption: "Le devis signé",
    },
  };
  const { traitement } = await traiterWhatsApp(
    await post(notification([doc])),
    deps,
  );
  const issues = await traitement!;
  assertEquals(issues[0].sortie, "nouvelle");
  assertEquals(stockage.depots, 1);
  const chemin = [...stockage.objets.keys()][0];
  assertMatch(
    chemin,
    new RegExp(`^${CLIENT}/receptions/wamid\\.DOC1/devis\\.pdf$`),
  );
  assertEquals(portes.receptions[0].corps, "Le devis signé");
  assertEquals(portes.receptions[0].pieces[0].nom, "devis.pdf");
  assertEquals(portes.receptions[0].pieces[0].mime, "application/pdf");
});

Deno.test("image sans nom : nom par défaut image.jpg ; META_ACCESS_TOKEN absent : message reçu, média ignoré et signalé", async () => {
  const a = monter();
  a.graph!.medias.set("img-1", {
    url: "https://lookaside.test/i1",
    mime_type: "image/jpeg",
    octets: new Uint8Array([255, 216]),
  });
  const img = {
    from: "33612345678",
    id: "wamid.IMG1",
    timestamp: "1791194400",
    type: "image",
    image: { id: "img-1", mime_type: "image/jpeg", sha256: "x" },
  };
  await (await traiterWhatsApp(await post(notification([img])), a.deps))
    .traitement!;
  assertEquals(a.portes.receptions[0].pieces[0].nom, "image.jpg");

  const b = monter({ graph: null });
  await (await traiterWhatsApp(await post(notification([img])), b.deps))
    .traitement!;
  assertEquals(b.portes.receptions[0].pieces, []);
  assertEquals(
    (b.portes.receptions[0].detail.media as Record<string, unknown>).ignore,
    true,
  );
  assert(b.journal.lignes.some((l) => l.includes("META_ACCESS_TOKEN absent")));
});

Deno.test("média introuvable chez Graph : issue erreur, rien n'est déposé", async () => {
  const { portes, deps } = monter();
  const img = {
    from: "33612345678",
    id: "wamid.IMG2",
    timestamp: "1791194400",
    type: "image",
    image: { id: "absent", mime_type: "image/jpeg" },
  };
  const issues =
    await (await traiterWhatsApp(await post(notification([img])), deps))
      .traitement!;
  assertEquals(issues[0].sortie, "erreur");
  assertEquals(portes.receptions.length, 0);
});

Deno.test("statuts de remise (value.statuses) : ignorés ; boîte inconnue : ignorée", async () => {
  const { portes, deps } = monter();
  const { reponse, traitement } = await traiterWhatsApp(
    await post(
      notification([], { statuses: [{ id: "wamid.S", status: "delivered" }] }),
    ),
    deps,
  );
  assertEquals(await reponse.json(), { recus: 0 });
  assertEquals(await traitement!, []);
  const autre = notification([texte("wamid.X")]);
  (autre.entry[0].changes[0].value.metadata as Record<string, string>)
    .phone_number_id = "999";
  const issues = await (await traiterWhatsApp(await post(autre), deps))
    .traitement!;
  assertEquals(issues[0].sortie, "boite_inconnue");
  assertEquals(portes.receptions.length, 0);
});

Deno.test("signature : absente → 401 ; mauvais secret → 401 ; META_APP_SECRET non posé → 503 ; PUT → 405", async () => {
  const { deps } = monter();
  assertEquals(
    (await traiterWhatsApp(
      await post(notification([texte()]), { signature: null }),
      deps,
    )).reponse.status,
    401,
  );
  assertEquals(
    (await traiterWhatsApp(
      await post(notification([texte()]), { secret: "autre" }),
      deps,
    )).reponse.status,
    401,
  );
  assertEquals(
    (await traiterWhatsApp(
      await post(notification([texte()]), { signature: "sha256=00" }),
      deps,
    )).reponse.status,
    401,
  );
  assertEquals(
    (await traiterWhatsApp(await post(notification([texte()])), {
      ...deps,
      secretApp: null,
    })).reponse.status,
    503,
  );
  assertEquals(
    (await traiterWhatsApp(
      new Request("https://x.test/reception/whatsapp", { method: "PUT" }),
      deps,
    )).reponse.status,
    405,
  );
});

Deno.test("lireNotification : interactif, position, bouton, réaction, type inconnu, contexte de réponse", () => {
  const n = notification([
    {
      from: "1",
      id: "w1",
      timestamp: "1791194400",
      type: "interactive",
      interactive: {
        type: "button_reply",
        button_reply: { id: "oui", title: "Oui" },
      },
    },
    {
      from: "1",
      id: "w2",
      timestamp: "1791194400",
      type: "location",
      location: { latitude: 48.85, longitude: 2.35, name: "Paris" },
    },
    {
      from: "1",
      id: "w3",
      timestamp: "x",
      type: "button",
      button: { text: "Confirmer", payload: "c" },
    },
    {
      from: "1",
      id: "w4",
      timestamp: "1791194400",
      type: "reaction",
      reaction: { emoji: "👍", message_id: "wamid.Q" },
    },
    {
      from: "1",
      id: "w5",
      timestamp: "1791194400",
      type: "unsupported",
      context: { from: "33700000000", id: "wamid.P" },
    },
  ]);
  const m = lireNotification(n, MAINTENANT);
  assertEquals(m.map((x) => x.corps), [
    "Oui",
    "Position : 48.85, 2.35 (Paris)",
    "Confirmer",
    "👍",
    "[unsupported]",
  ]);
  assertEquals(m[2].recuLe, MAINTENANT.toISOString());
  assertEquals(m[4].contexte, { wamid: "wamid.P", de: "33700000000" });
  assertEquals(lireNotification({ rien: 1 }, MAINTENANT), []);
});
