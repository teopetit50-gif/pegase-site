import { assertEquals } from "@std/assert";
import {
  CLIENT,
  journalMemoire,
  MAINTENANT,
  PortesDouble,
  StockageDouble,
} from "./doubles.ts";
import { hmacSha256Hex } from "./commun.ts";
import {
  BOITE_PAR_DEFAUT,
  composerCorps,
  lireSoumission,
  traiterFormulaire,
} from "./formulaire.ts";

const SECRET = "secret-formulaire-test";
const ID = "a1b2c3d4-0000-4000-8000-000000000042";

function monter() {
  const portes = new PortesDouble();
  portes.connaitre("formulaire", BOITE_PAR_DEFAUT);
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  return {
    portes,
    deps: {
      portes,
      stockage,
      journal,
      secret: SECRET,
      maintenant: () => MAINTENANT,
    },
  };
}

async function post(
  corps: unknown,
  opts: {
    secret?: string;
    decalage?: number;
    signature?: string | null;
    horodatage?: string;
  } = {},
): Promise<Request> {
  const brut = typeof corps === "string" ? corps : JSON.stringify(corps);
  const horodatage = opts.horodatage ??
    String(Math.floor(MAINTENANT.getTime() / 1000) + (opts.decalage ?? 0));
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Omega-Horodatage": horodatage,
  });
  if (opts.signature !== null) {
    headers.set(
      "X-Omega-Signature",
      opts.signature ??
        await hmacSha256Hex(opts.secret ?? SECRET, `${horodatage}.${brut}`),
    );
  }
  return new Request("https://recette.test/functions/v1/reception/formulaire", {
    method: "POST",
    headers,
    body: brut,
  });
}

const soumission = {
  identifiant: ID,
  formulaire: "audit",
  nom: "Marie Dupont",
  email: "Marie.Dupont@Exemple.test",
  telephone: "06 12 34 56 78",
  societe: "Dupont SAS",
  message: "Je souhaite un audit de ma facturation.",
  page: "/audit",
  consentement: true,
  champs: { metiers: ["Avocats", "Architectes"], effectif: "12", vide: "" },
};

Deno.test("formulaire signé : 201, réception déposée sur la boîte du site avec sujet, corps composé et champs", async () => {
  const { portes, deps } = monter();
  const r = await traiterFormulaire(await post(soumission), deps);
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { id: 1, nouvelle: true });
  const rec = portes.receptions[0];
  assertEquals(rec.client, CLIENT);
  assertEquals(rec.canal, "formulaire");
  assertEquals(rec.boite, BOITE_PAR_DEFAUT);
  assertEquals(rec.identifiant, ID);
  assertEquals(rec.de, "marie.dupont@exemple.test");
  assertEquals(rec.deNom, "Marie Dupont");
  assertEquals(rec.sujet, "Formulaire audit — Marie Dupont (Dupont SAS)");
  assertEquals(
    rec.corps,
    "Je souhaite un audit de ma facturation.\n\nmetiers : Avocats, Architectes\neffectif : 12",
  );
  assertEquals(rec.detail.consentement, true);
  assertEquals(rec.detail.telephone, "06 12 34 56 78");
  assertEquals(rec.recuLe, MAINTENANT.toISOString());
});

Deno.test("même identifiant envoyé deux fois : 200 nouvelle=false, une seule ligne", async () => {
  const { portes, deps } = monter();
  await traiterFormulaire(await post(soumission), deps);
  const r = await traiterFormulaire(await post(soumission), deps);
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { id: 1, nouvelle: false });
  assertEquals(portes.receptions.length, 1);
});

Deno.test("signature : absente, fausse, autre secret → 401 ; horodatage vieux de 10 min → 401 ; secret non posé → 503", async () => {
  const { deps } = monter();
  assertEquals(
    (await traiterFormulaire(await post(soumission, { signature: null }), deps))
      .status,
    401,
  );
  assertEquals(
    (await traiterFormulaire(
      await post(soumission, { signature: "00ff" }),
      deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterFormulaire(await post(soumission, { secret: "autre" }), deps))
      .status,
    401,
  );
  assertEquals(
    (await traiterFormulaire(await post(soumission, { decalage: -600 }), deps))
      .status,
    401,
  );
  assertEquals(
    (await traiterFormulaire(
      await post(soumission, { horodatage: "hier" }),
      deps,
    )).status,
    401,
  );
  assertEquals(
    (await traiterFormulaire(await post(soumission, { decalage: 120 }), deps))
      .status,
    201,
  );
  assertEquals(
    (await traiterFormulaire(await post(soumission), { ...deps, secret: null }))
      .status,
    503,
  );
});

Deno.test("corps : JSON illisible → 400 ; identifiant absent → 400 ; e-mail invalide → 400", async () => {
  const { deps } = monter();
  assertEquals((await traiterFormulaire(await post("{"), deps)).status, 400);
  assertEquals(
    (await traiterFormulaire(
      await post({ ...soumission, identifiant: "42" }),
      deps,
    )).status,
    400,
  );
  assertEquals(
    (await traiterFormulaire(
      await post({ ...soumission, email: "pas-un-mail" }),
      deps,
    )).status,
    400,
  );
});

Deno.test("boîte du site inconnue du socle ou porte en panne → 500 (le site peut réessayer, même identifiant)", async () => {
  const a = monter();
  a.portes.boites.clear();
  assertEquals(
    (await traiterFormulaire(await post(soumission), a.deps)).status,
    500,
  );
  const b = monter();
  b.portes.panne = new Error("hors service");
  assertEquals(
    (await traiterFormulaire(await post(soumission), b.deps)).status,
    500,
  );
});

Deno.test("lireSoumission et composerCorps : valeurs par défaut, champs objets", () => {
  const lu = lireSoumission({ identifiant: ID.toUpperCase() });
  if ("erreur" in lu) throw new Error(lu.erreur);
  assertEquals(lu.soumission.identifiant, ID);
  assertEquals(lu.soumission.formulaire, "contact");
  assertEquals(lu.soumission.consentement, false);
  assertEquals(composerCorps(lu.soumission), "");
  assertEquals(
    composerCorps({
      ...lu.soumission,
      champs: { adresse: { ville: "Lyon" }, n: 3 },
    }),
    'adresse : {"ville":"Lyon"}\nn : 3',
  );
  assertEquals("erreur" in lireSoumission(null), true);
});
