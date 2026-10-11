import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  chiffrerAr24,
  clientAr24,
  dateAr24,
  dechiffrerAr24,
  ErreurAr24,
  signatureAr24,
} from "./ar24.ts";

// Vecteurs de la documentation d'AR24 (developers.ar24.fr/doc, rubrique « Signature » et « Réponse chiffrée »).
const CLE_DOC = "7X9gx9E3Qx4EiUdB63nc";
const DATE_DOC = "2021-05-26 14:00:00";

Deno.test("signature : vecteur de la documentation AR24", async () => {
  assertEquals(
    await signatureAr24(DATE_DOC, CLE_DOC),
    "bDop0cbjKpkySlpvnNGvBMg7PuYFFgPPqTTS2RAHoY0=",
  );
});

Deno.test("réponse chiffrée : vecteur de la documentation AR24 ; chiffrer puis déchiffrer rend le texte", async () => {
  const clair = await dechiffrerAr24(
    "WwBOU6s8DaMWmYdctBJwfuoujFgVygBUjhsbdf8eWqQ=",
    DATE_DOC,
    CLE_DOC,
  );
  // Le texte de l'exemple de la documentation n'est pas du JSON strict (clé sans guillemets) : on compare le texte.
  assertEquals(clair, '{status: "SUCCESS"}');
  const aller = await chiffrerAr24(
    '{"status":"SUCCESS","result":{"id":1}}',
    DATE_DOC,
    CLE_DOC,
  );
  assertEquals(
    await dechiffrerAr24(aller, DATE_DOC, CLE_DOC),
    '{"status":"SUCCESS","result":{"id":1}}',
  );
});

Deno.test("date à l'heure de Paris : été (UTC+2) et hiver (UTC+1)", () => {
  assertEquals(
    dateAr24(new Date("2026-07-01T10:05:09Z")),
    "2026-07-01 12:05:09",
  );
  assertEquals(
    dateAr24(new Date("2026-12-31T23:30:00Z")),
    "2027-01-01 00:30:00",
  );
});

type Appel = {
  url: string;
  signature: string | null;
  champs: Record<string, string>;
};

function serveur(reponses: ((date: string) => Promise<Response>)[]) {
  const appels: Appel[] = [];
  let i = 0;
  const f: typeof fetch = async (entree, init) => {
    const corps = init!.body as FormData;
    const champs: Record<string, string> = {};
    corps.forEach((
      v,
      k,
    ) => (champs[k] = typeof v === "string"
      ? v
      : `fichier:${(v as File).name}`)
    );
    appels.push({
      url: String(entree),
      signature: new Headers(init!.headers).get("signature"),
      champs,
    });
    return await reponses[i++](champs.date);
  };
  return { appels, f };
}

const ACCES = { token: "jeton-test", clePrivee: CLE_DOC };
const MAINTENANT = () => new Date("2021-05-26T12:00:00Z"); // 14:00:00 à Paris

Deno.test("client : pièce puis LRE, champs signés, réponses chiffrées déchiffrées", async () => {
  const ok = (result: unknown) => async (date: string) =>
    new Response(
      await chiffrerAr24(
        JSON.stringify({ status: "SUCCESS", result }),
        date,
        CLE_DOC,
      ),
    );
  const s = serveur([
    ok({ file_id: 55 }),
    ok({ id: 123456, status: "waiting" }),
  ]);
  const c = clientAr24(ACCES, s.f, "https://sandbox.ar24.fr/api/", MAINTENANT);
  const fichier = await c.televerser(
    "42",
    "mise_en_demeure.pdf",
    new Uint8Array([1, 2, 3]),
    "application/pdf",
  );
  assertEquals(fichier, "55");
  const r = await c.envoyer({
    id_user: "42",
    to_email: "dest@exemple.test",
    dest_statut: "professionnel",
    to_company: "Dupont SARL",
    content: "Mise en demeure",
    eidas: "0",
    ref_dossier: "f1",
    pieces: [fichier],
  });
  assertEquals(r, { id: "123456", statut: "waiting" });
  assertEquals(s.appels[0].url, "https://sandbox.ar24.fr/api/attachment");
  assertEquals(s.appels[0].champs.file, "fichier:mise_en_demeure.pdf");
  assertEquals(s.appels[1].url, "https://sandbox.ar24.fr/api/mail");
  assertEquals(
    s.appels[1].signature,
    "bDop0cbjKpkySlpvnNGvBMg7PuYFFgPPqTTS2RAHoY0=",
  );
  assertEquals(s.appels[1].champs.date, DATE_DOC);
  assertEquals(s.appels[1].champs.token, "jeton-test");
  assertEquals(s.appels[1].champs["attachment[0]"], "55");
  assertEquals(s.appels[1].champs.to_company, "Dupont SARL");
  assert(!("to_firstname" in s.appels[1].champs));
});

Deno.test("client : erreur métier en clair → définitive ; 503 → transitoire ; 401 → transitoire ; réponse illisible → transitoire", async () => {
  const clair = (corps: string, statut = 200) => () =>
    Promise.resolve(new Response(corps, { status: statut }));
  const mail = {
    id_user: "42",
    to_email: "x@y.test",
    dest_statut: "particulier" as const,
    to_lastname: "X",
    content: "c",
    eidas: "0" as const,
    pieces: [],
  };
  const cas: [() => Promise<Response>, boolean][] = [
    [
      clair(
        '{"status":"ERROR","slug":"invalid_email","message":"Invalid email"}',
      ),
      true,
    ],
    [clair("indisponible", 503), false],
    [clair("jeton", 401), false],
    [clair("pas du base64 !!"), false],
  ];
  for (const [rep, definitif] of cas) {
    const s = serveur([rep]);
    const e = await assertRejects(
      () => clientAr24(ACCES, s.f, undefined, MAINTENANT).envoyer(mail),
      ErreurAr24,
    );
    assertEquals(e.definitif, definitif, e.message);
  }
});
