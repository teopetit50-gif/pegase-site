import { assertEquals } from "@std/assert";
import { Ar24Double } from "../../expediteur/doubles.ts";
import { ErreurAr24 } from "../../expediteur/ar24.ts";
import type { DetailRemise, EvenementRemise, Portes } from "../brevo/portes.ts";
import {
  type Dependances,
  depuisHeureParis,
  lireCorps,
  traiterRequete,
} from "./traitement.ts";

class PortesDouble implements Portes {
  connues = new Set<string>(["ar24|123"]);
  notes: {
    reference: string;
    evenement: EvenementRemise;
    detail: DetailRemise;
    survenuLe: string | null;
    cle: string;
  }[] = [];
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
    if (!this.connues.has(`${fournisseur}|${reference}`)) return false;
    if (!this.notes.some((n) => n.cle === cle)) {
      this.notes.push({ reference, evenement, detail, survenuLe, cle });
    }
    return true;
  }
}

function monter(opts: { jeton?: string | null; branche?: boolean } = {}) {
  const portes = new PortesDouble();
  const ar24 = new Ar24Double();
  const lignes: string[] = [];
  const deps: Dependances = {
    portes,
    ar24: opts.branche === false ? null : ar24,
    jeton: opts.jeton === undefined ? "secret" : opts.jeton,
    journal: {
      info: (m) => lignes.push(`info ${m}`),
      erreur: (m) => lignes.push(`erreur ${m}`),
    },
  };
  return { portes, ar24, deps, lignes };
}

const requete = (
  corps: string,
  jeton: string | null = "secret",
  type = "application/json",
) =>
  new Request(
    `https://recette.test/functions/v1/webhooks-ar24${
      jeton !== null ? `?jeton=${jeton}` : ""
    }`,
    {
      method: "POST",
      headers: { "Content-Type": type },
      body: corps,
    },
  );

Deno.test("heure de Paris → UTC : été, hiver ; illisible → null", () => {
  assertEquals(
    depuisHeureParis("2026-07-01 12:05:09"),
    "2026-07-01T10:05:09.000Z",
  );
  assertEquals(
    depuisHeureParis("2026-12-01 09:00:00"),
    "2026-12-01T08:00:00.000Z",
  );
  assertEquals(depuisHeureParis("hier"), null);
});

Deno.test("corps JSON ou formulaire", () => {
  assertEquals(lireCorps('{"id_mail":"123","new_state":"ar"}'), {
    id_mail: "123",
    new_state: "ar",
  });
  assertEquals(lireCorps("id_mail=123&new_state=ar"), {
    id_mail: "123",
    new_state: "ar",
  });
  assertEquals(lireCorps(""), null);
});

Deno.test("ar confirmé par la relecture : remis, date de la relecture (pas du corps), preuve dans la raison ; rejoué : noté une fois", async () => {
  const { portes, ar24, deps } = monter();
  ar24.objets.set("123", {
    id: 123,
    status: "AR",
    view_date: "2026-10-15 14:00:00",
    proof_ar_url: "https://sandbox.ar24.fr/get/proof/ar-123",
  });
  const corps =
    '{"id_mail":"123","new_state":"ar","view_date":"2000-01-01 00:00:00"}';
  const r = await traiterRequete(requete(corps), deps);
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { sortie: "note", id_mail: "123", etat: "ar" });
  assertEquals(portes.notes, [{
    reference: "123",
    evenement: "remis",
    detail: {
      code: "ar",
      raison:
        "accusé de réception (lettre ouverte) ; preuve : https://sandbox.ar24.fr/get/proof/ar-123",
    },
    survenuLe: "2026-10-15T12:00:00.000Z",
    cle: "ar24:123:ar",
  }]);
  await traiterRequete(requete(corps), deps);
  assertEquals(portes.notes.length, 1);
  assertEquals(ar24.lectures, ["123", "123"]);
});

Deno.test("refused, negligence → refuse ; bounced → rebond avec le code ; formulaire accepté", async () => {
  const cas: [string, Record<string, unknown>, EvenementRemise][] = [
    ["refused", { refused_date: "2026-10-15 09:00:00" }, "refuse"],
    ["negligence", { negligence_date: "2026-10-30 09:00:00" }, "refuse"],
    ["bounced", {
      status: "bounced",
      bounce_code: "5.1.1",
      bounce_message: "user unknown",
    }, "rebond"],
  ];
  for (const [etat, champs, evenement] of cas) {
    const { portes, ar24, deps } = monter();
    ar24.objets.set("123", { id: "123", status: "waiting", ...champs });
    const r = await traiterRequete(
      requete(
        `id_mail=123&new_state=${etat}`,
        "secret",
        "application/x-www-form-urlencoded",
      ),
      deps,
    );
    assertEquals(r.status, 200, etat);
    assertEquals(portes.notes[0].evenement, evenement, etat);
    assertEquals(portes.notes[0].detail.code, etat);
  }
  const { portes, ar24, deps } = monter();
  ar24.objets.set("123", {
    id: "123",
    status: "bounced",
    bounce_code: "5.1.1",
    bounce_message: "user unknown",
  });
  await traiterRequete(
    requete('{"id_mail":"123","new_state":"bounced"}'),
    deps,
  );
  assertEquals(
    portes.notes[0].detail.raison,
    "adresse du destinataire en erreur (5.1.1 user unknown)",
  );
});

Deno.test("état non confirmé par l'API : rien n'est noté (corps forgé) ; ev : ignoré sans relecture", async () => {
  const { portes, ar24, deps, lignes } = monter();
  ar24.objets.set("123", { id: 123, status: "waiting" });
  const r = await traiterRequete(
    requete('{"id_mail":"123","new_state":"ar"}'),
    deps,
  );
  assertEquals(await r.json(), {
    sortie: "non_confirme",
    id_mail: "123",
    etat: "ar",
    statut_ar24: "waiting",
  });
  assertEquals(portes.notes.length, 0);
  assertEquals(lignes.some((l) => l.includes("non confirmé")), true);

  const ev = await traiterRequete(
    requete('{"id_mail":"123","new_state":"ev"}'),
    deps,
  );
  assertEquals(ev.status, 200);
  assertEquals(ar24.lectures, ["123"]);
});

Deno.test("LRE sans envoi connu : 200 inconnue ; LRE inconnue d'AR24 : 200 ignorée ; AR24 en panne ou porte en panne : 503 (AR24 rejoue)", async () => {
  const a = monter();
  a.ar24.objets.set("999", { id: 999, status: "ar" });
  assertEquals(
    (await (await traiterRequete(
      requete('{"id_mail":"999","new_state":"ar"}'),
      a.deps,
    )).json()).sortie,
    "inconnue",
  );

  const b = monter();
  assertEquals(
    (await (await traiterRequete(
      requete('{"id_mail":"555","new_state":"ar"}'),
      b.deps,
    )).json()).sortie,
    "ignore",
  );

  const c = monter();
  c.ar24.erreur = new ErreurAr24(503, "indisponible", false);
  assertEquals(
    (await traiterRequete(
      requete('{"id_mail":"123","new_state":"ar"}'),
      c.deps,
    )).status,
    503,
  );

  const d = monter();
  d.ar24.objets.set("123", { id: 123, status: "ar" });
  d.portes.panne = new Error("porte");
  assertEquals(
    (await traiterRequete(
      requete('{"id_mail":"123","new_state":"ar"}'),
      d.deps,
    )).status,
    503,
  );
});

Deno.test("jeton absent ou faux → 401 ; non posé → 503 ; AR24 non branché → 503 ; corps incomplet → 400 ; GET → 405", async () => {
  assertEquals(
    (await traiterRequete(
      requete('{"id_mail":"1","new_state":"ar"}', null),
      monter().deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterRequete(
      requete('{"id_mail":"1","new_state":"ar"}', "faux"),
      monter().deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterRequete(requete("{}"), monter({ jeton: null }).deps)).status,
    503,
  );
  assertEquals(
    (await traiterRequete(
      requete('{"id_mail":"1","new_state":"ar"}'),
      monter({ branche: false }).deps,
    )).status,
    503,
  );
  assertEquals(
    (await traiterRequete(requete('{"new_state":"ar"}'), monter().deps)).status,
    400,
  );
  assertEquals(
    (await traiterRequete(
      new Request("https://recette.test/x?jeton=secret"),
      monter().deps,
    )).status,
    405,
  );
});
