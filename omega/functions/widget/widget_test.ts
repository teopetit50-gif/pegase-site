import { assert, assertEquals, assertMatch } from "@std/assert";
import { creerWidget } from "./widget.ts";
import type { Apparence, Issue, Message, Portes } from "./portes.ts";

const CLE = "w_0123456789abcdef0123456789abcdef";
const BASE = "https://p.supabase.co/functions/v1/widget";
const ORIGINE = "https://www.plombier-exemple.fr";

class PortesDouble implements Portes {
  apparenceRendue: Apparence | null = {
    libelle: "Plomberie Exemple",
    couleur: "#0a5c36",
    accueil: "Bonjour </script><b>!",
    origines: [ORIGINE],
  };
  messages: Message[] = [];
  issue: Issue = { statut: "recu" };
  // deno-lint-ignore require-await
  async apparence() {
    return this.apparenceRendue;
  }
  // deno-lint-ignore require-await
  async deposer(m: Message) {
    this.messages.push(m);
    return this.issue;
  }
}

function monter() {
  const portes = new PortesDouble();
  const servir = creerWidget({
    portes,
    base: BASE,
    sel: "sel",
    journal: { erreur() {} },
  });
  const poster = (
    corps: Record<string, unknown>,
    origine: string | null = ORIGINE,
  ) =>
    servir(
      new Request(`${BASE}/${CLE}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "203.0.113.9",
          ...(origine ? { Origin: origine } : {}),
        },
        body: JSON.stringify(corps),
      }),
    );
  return { portes, servir, poster };
}

const MESSAGE = {
  conversation: "11111111-1111-4111-8111-111111111111",
  message: "22222222-2222-4222-8222-222222222222",
  texte: "Bonjour, fuite sous l'évier, vous passez quand ?",
  nom: "Élodie",
  email: "Elodie@Exemple.fr",
  telephone: null,
  page: "https://www.plombier-exemple.fr/contact",
  consentement: true,
  site_web: "",
  delai_ms: 12000,
};

Deno.test("script : servi en JavaScript, configuré (clé, adresse d'envoi), syntaxe valide, configuration échappée", async () => {
  const a = monter();
  const r = await a.servir(new Request(`${BASE}/${CLE}/widget.js`));
  assertEquals(r.status, 200);
  assertMatch(r.headers.get("content-type")!, /^application\/javascript/);
  const js = await r.text();
  assert(js.includes(`${BASE}/${CLE}/message`));
  assert(
    !js.includes("</script>"),
    "aucune fin de balise script dans la configuration",
  );
  new Function(js); // lève une SyntaxError si le script est mal formé
  a.portes.apparenceRendue = null;
  const inconnu = await a.servir(
    new Request(`${BASE}/w_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/widget.js`),
  );
  assertEquals(inconnu.status, 404);
});

Deno.test("pré-vol CORS : origine autorisée → 204 avec Allow-Origin ; autre origine → 403", async () => {
  const a = monter();
  const ok = await a.servir(
    new Request(`${BASE}/${CLE}/message`, {
      method: "OPTIONS",
      headers: { Origin: ORIGINE },
    }),
  );
  assertEquals(ok.status, 204);
  assertEquals(ok.headers.get("access-control-allow-origin"), ORIGINE);
  const non = await a.servir(
    new Request(`${BASE}/${CLE}/message`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.test" },
    }),
  );
  assertEquals(non.status, 403);
  assertEquals(non.headers.get("access-control-allow-origin"), null);
});

Deno.test("message : déposé (e-mail en minuscules, IP en empreinte seulement), 201 avec Allow-Origin", async () => {
  const a = monter();
  const r = await a.poster(MESSAGE);
  assertEquals(r.status, 201);
  assertEquals(r.headers.get("access-control-allow-origin"), ORIGINE);
  const m = a.portes.messages[0];
  assertEquals([m.cle, m.origine, m.email, m.nom, m.conversation], [
    CLE,
    ORIGINE,
    "elodie@exemple.fr",
    "Élodie",
    MESSAGE.conversation,
  ]);
  assertMatch(m.ipEmpreinte, /^[0-9a-f]{64}$/);
  assert(
    !JSON.stringify(m).includes("203.0.113.9"),
    "l'adresse IP n'est jamais transmise en clair",
  );
});

Deno.test("robots : champ piège rempli ou envoi trop rapide → 202, rien de déposé", async () => {
  const a = monter();
  assertEquals(
    (await a.poster({ ...MESSAGE, site_web: "http://spam.test" })).status,
    202,
  );
  assertEquals((await a.poster({ ...MESSAGE, delai_ms: 400 })).status, 202);
  assertEquals(a.portes.messages.length, 0);
});

Deno.test("refus : sans origine 403 ; accord absent, e-mail faux, message incomplet 400 ; plafond 429 ; origine refusée par la porte 403", async () => {
  const a = monter();
  assertEquals((await a.poster(MESSAGE, null)).status, 403);
  assertEquals(
    (await a.poster({ ...MESSAGE, consentement: false })).status,
    400,
  );
  assertEquals(
    (await a.poster({ ...MESSAGE, email: "pas-un-email" })).status,
    400,
  );
  assertEquals((await a.poster({ ...MESSAGE, texte: "" })).status, 400);
  assertEquals((await a.poster({ ...MESSAGE, conversation: "x" })).status, 400);
  assertEquals(a.portes.messages.length, 0);
  a.portes.issue = { statut: "refuse", motif: "plafond" };
  const p = await a.poster(MESSAGE);
  assertEquals(p.status, 429);
  assertEquals(p.headers.get("retry-after"), "600");
  a.portes.issue = { statut: "refuse", motif: "origine" };
  const o = await a.poster(MESSAGE, "https://autre.test");
  assertEquals(o.status, 403);
  assertEquals(o.headers.get("access-control-allow-origin"), null);
});

Deno.test("chemins : clé mal formée ou route inconnue → 404", async () => {
  const a = monter();
  assertEquals(
    (await a.servir(new Request(`${BASE}/cle-fausse/widget.js`))).status,
    404,
  );
  assertEquals(
    (await a.servir(new Request(`${BASE}/${CLE}/autre`))).status,
    404,
  );
});
