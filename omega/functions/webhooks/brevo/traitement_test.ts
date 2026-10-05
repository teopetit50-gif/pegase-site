import { assert, assertEquals } from "@std/assert";
import type { DetailRemise, EvenementRemise, Portes } from "./portes.ts";
import {
  horodatage,
  lireCorps,
  memeSecret,
  traduire,
  traiterRequete,
} from "./traitement.ts";

type Note = {
  fournisseur: string;
  reference: string;
  evenement: EvenementRemise;
  detail: DetailRemise;
  survenuLe: string | null;
  cle: string;
};

/** Double de noter_remise : connaît des références, ignore une clé déjà vue (idempotence). */
class PortesDouble implements Portes {
  references = new Set<string>();
  notes: Note[] = [];
  clesVues = new Set<string>();
  panne: Error | null = null;
  // deno-lint-ignore require-await
  async noterRemise(
    fournisseur: string,
    reference: string,
    evenement: EvenementRemise,
    detail: DetailRemise,
    survenuLe: string | null,
    cle: string,
  ) {
    if (this.panne) throw this.panne;
    if (!this.references.has(`${fournisseur}|${reference}`)) return false;
    if (this.clesVues.has(cle)) return true;
    this.clesVues.add(cle);
    this.notes.push({
      fournisseur,
      reference,
      evenement,
      detail,
      survenuLe,
      cle,
    });
    return true;
  }
}

const JETON = "jeton-de-test-webhook";
const MID = "<202610051200.12345678@smtp-relay.mailin.fr>";
const ENVOI = "11111111-1111-4111-8111-111111111111";

function requete(
  corps: unknown,
  opts: { jeton?: string | null; entete?: string; methode?: string } = {},
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  const jeton = opts.jeton === undefined ? JETON : opts.jeton;
  if (jeton) {
    headers.set(
      opts.entete ?? "Authorization",
      opts.entete ? jeton : `Bearer ${jeton}`,
    );
  }
  const methode = opts.methode ?? "POST";
  return new Request("https://recette.test/functions/v1/webhooks-brevo", {
    method: methode,
    headers,
    ...(methode === "GET" ? {} : {
      body: typeof corps === "string" ? corps : JSON.stringify(corps),
    }),
  });
}

function monter() {
  const portes = new PortesDouble();
  portes.references.add(`brevo|${MID}`);
  portes.references.add("brevo_sms|1001");
  const journal = { info: () => {}, erreur: () => {} };
  return { portes, deps: { portes, jeton: JETON, journal } };
}

function evenementEmail(event: string, extra: Record<string, unknown> = {}) {
  return {
    event,
    email: "destinataire@exemple.test",
    id: 987654,
    date: "2026-10-05 14:03:11",
    ts: 1791209000,
    "message-id": MID,
    ts_event: 1791209001,
    subject: "Relance de facture",
    tag: `envoi:${ENVOI}`,
    tags: [`envoi:${ENVOI}`, "module:cashd"],
    sending_ip: "185.41.28.1",
    ts_epoch: 1791209001000,
    ...extra,
  };
}

Deno.test("remis : delivered → noter_remise('brevo', message-id, 'remis', {code, raison}, horodatage, clé)", async () => {
  const { portes, deps } = monter();
  const r = await traiterRequete(requete(evenementEmail("delivered")), deps);
  assertEquals(r.status, 200);
  assertEquals(await r.json(), {
    recus: 1,
    notes: 1,
    ignores: 0,
    inconnus: 0,
    erreurs: 0,
  });
  assertEquals(portes.notes.length, 1);
  const n = portes.notes[0];
  assertEquals(n.fournisseur, "brevo");
  assertEquals(n.reference, MID);
  assertEquals(n.evenement, "remis");
  assertEquals(n.detail, { code: "delivered", raison: "" });
  assertEquals(n.survenuLe, "2026-10-05T14:03:21.000Z");
  assertEquals(n.cle, `brevo:email:${MID}:delivered:2026-10-05T14:03:21.000Z`);
});

Deno.test("deux livraisons du même webhook n'écrivent qu'une ligne", async () => {
  const { portes, deps } = monter();
  await traiterRequete(
    requete(
      evenementEmail("hard_bounce", { reason: "550 utilisateur inconnu" }),
    ),
    deps,
  );
  const r2 = await traiterRequete(
    requete(
      evenementEmail("hard_bounce", { reason: "550 utilisateur inconnu" }),
    ),
    deps,
  );
  assertEquals(r2.status, 200);
  assertEquals(portes.notes.length, 1);
  assertEquals(portes.notes[0].evenement, "rebond");
  assertEquals(portes.notes[0].detail.raison, "550 utilisateur inconnu");
});

Deno.test("traduction : rebond dur, rebond doux, différé, bloqué, e-mail invalide, spam, désinscription, erreur", () => {
  assertEquals(traduire("hard_bounce"), "rebond");
  assertEquals(traduire("hardBounce"), "rebond");
  assertEquals(traduire("soft_bounce"), "rebond_temporaire");
  assertEquals(traduire("deferred"), "rebond_temporaire");
  assertEquals(traduire("blocked"), "refuse");
  assertEquals(traduire("invalid_email"), "refuse");
  assertEquals(traduire("error"), "refuse");
  assertEquals(traduire("spam"), "plainte");
  assertEquals(traduire("unsubscribed"), "plainte");
  assertEquals(traduire("unsubscribe"), "plainte");
  assertEquals(traduire("delivered"), "remis");
});

Deno.test("ouvertures et clics : ignorés, jamais notés (interdit par le socle) ; request/sent aussi", async () => {
  const { portes, deps } = monter();
  const corps = [
    evenementEmail("opened"),
    evenementEmail("unique_opened"),
    evenementEmail("click", { link: "https://exemple.test" }),
    evenementEmail("loaded_by_proxy"),
    evenementEmail("request"),
  ];
  const r = await traiterRequete(requete(corps), deps);
  assertEquals(r.status, 200);
  assertEquals(await r.json(), {
    recus: 5,
    notes: 0,
    ignores: 5,
    inconnus: 0,
    erreurs: 0,
  });
  assertEquals(portes.notes.length, 0);
});

Deno.test("SMS : msg_status delivered → fournisseur brevo_sms, référence messageId, repli sur reference", async () => {
  const { portes, deps } = monter();
  const sms = {
    id: 55,
    to: "33612345678",
    date: "2026-10-05 14:05:00",
    msg_status: "delivered",
    description: "",
    reply: "",
    bounce_type: "",
    tag: `envoi:${ENVOI}`,
    messageId: 1001,
    reference: "ref-abc",
  };
  const r = await traiterRequete(requete(sms), deps);
  assertEquals(r.status, 200);
  assertEquals(portes.notes[0].fournisseur, "brevo_sms");
  assertEquals(portes.notes[0].reference, "1001");
  assertEquals(portes.notes[0].evenement, "remis");
  assertEquals(portes.notes[0].survenuLe, "2026-10-05T14:05:00.000Z");

  // Référence connue seulement par `reference` : second essai.
  portes.references.add("brevo_sms|ref-xyz");
  const r2 = await traiterRequete(
    requete({
      ...sms,
      messageId: 9999,
      reference: "ref-xyz",
      msg_status: "hard_bounce",
      bounce_type: "numéro inexistant",
    }),
    deps,
  );
  assertEquals(r2.status, 200);
  assertEquals(portes.notes[1].reference, "ref-xyz");
  assertEquals(portes.notes[1].evenement, "rebond");
  assertEquals(portes.notes[1].detail.raison, "numéro inexistant");
});

Deno.test("SMS : reply, accepted, sent sont ignorés ; unsubscribe → plainte", async () => {
  const { portes, deps } = monter();
  const base = {
    to: "33612345678",
    date: "2026-10-05 14:05:00",
    messageId: 1001,
  };
  const r = await traiterRequete(
    requete([
      { ...base, msg_status: "reply", reply: "STOP" },
      { ...base, msg_status: "accepted" },
      { ...base, msg_status: "sent" },
      { ...base, msg_status: "unsubscribe" },
    ]),
    deps,
  );
  assertEquals(await r.json(), {
    recus: 4,
    notes: 1,
    ignores: 3,
    inconnus: 0,
    erreurs: 0,
  });
  assertEquals(portes.notes[0].evenement, "plainte");
});

Deno.test("référence inconnue du socle : 200 quand même, compté inconnu", async () => {
  const { portes, deps } = monter();
  const r = await traiterRequete(
    requete(
      evenementEmail("delivered", {
        "message-id": "<autre@smtp-relay.mailin.fr>",
      }),
    ),
    deps,
  );
  assertEquals(r.status, 200);
  assertEquals((await r.json()).inconnus, 1);
  assertEquals(portes.notes.length, 0);
});

Deno.test("jeton : absent → 401 ; faux → 401 ; en-tête X-Omega-Jeton accepté ; BREVO_WEBHOOK_JETON non posé → 503", async () => {
  const { deps } = monter();
  assertEquals(
    (await traiterRequete(
      requete(evenementEmail("delivered"), { jeton: null }),
      deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterRequete(
      requete(evenementEmail("delivered"), { jeton: "faux" }),
      deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterRequete(
      requete(evenementEmail("delivered"), {
        jeton: JETON,
        entete: "X-Omega-Jeton",
      }),
      deps,
    )).status,
    200,
  );
  assertEquals(
    (await traiterRequete(requete(evenementEmail("delivered")), {
      ...deps,
      jeton: null,
    })).status,
    503,
  );
  assertEquals(
    (await traiterRequete(
      requete(evenementEmail("delivered"), { methode: "GET" }),
      deps,
    )).status,
    405,
  );
  assertEquals(
    (await traiterRequete(requete("pas du json"), deps)).status,
    400,
  );
});

Deno.test("porte en panne : 500 pour que Brevo rejoue", async () => {
  const { portes, deps } = monter();
  portes.panne = new Error("porte hors service");
  const r = await traiterRequete(requete(evenementEmail("delivered")), deps);
  assertEquals(r.status, 500);
  assertEquals((await r.json()).erreurs, 1);
});

Deno.test("lireCorps : objet seul, tableau, enveloppe {events} ; horodatages", () => {
  assertEquals(lireCorps(evenementEmail("delivered")).length, 1);
  assertEquals(
    lireCorps([evenementEmail("delivered"), {
      msg_status: "delivered",
      messageId: 1,
    }]).length,
    2,
  );
  assertEquals(lireCorps({ events: [evenementEmail("delivered")] }).length, 1);
  assertEquals(lireCorps({ rien: true }).length, 0);
  assertEquals(
    horodatage({ ts_event: 1791209001 }),
    "2026-10-05T14:03:21.000Z",
  );
  assertEquals(
    horodatage({ ts_epoch: 1791209001000 }),
    "2026-10-05T14:03:21.000Z",
  );
  assertEquals(
    horodatage({ date: "2026-10-05 14:03:21" }),
    "2026-10-05T14:03:21.000Z",
  );
  assertEquals(
    horodatage({ date: "2026-10-05T14:03:21+02:00" }),
    "2026-10-05T12:03:21.000Z",
  );
  assertEquals(horodatage({}), null);
  const e = lireCorps(evenementEmail("delivered"))[0];
  assertEquals(e.envoi, ENVOI);
});

Deno.test("memeSecret : temps constant, longueurs différentes", () => {
  assert(memeSecret("abc", "abc"));
  assert(!memeSecret("abc", "abd"));
  assert(!memeSecret("abc", "abcd"));
  assert(!memeSecret("", "a"));
});
