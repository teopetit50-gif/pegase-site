import { assertEquals, assertMatch } from "@std/assert";
import { creerOAuth } from "./oauth.ts";
import { GmailDouble, journalMuet, PortesDouble } from "./doubles.ts";

const BASE = "https://p.supabase.co/functions/v1/messagerie-oauth";
const ETAT = "etat_0123456789abcdef";

function monter(avecGmail = true) {
  const portes = new PortesDouble();
  portes.etats.set(ETAT, {
    client_id: "c",
    fournisseur: "gmail",
    retour_ecran: "https://omegaai.fr/espace/messagerie",
  });
  const g = new GmailDouble();
  const servir = creerOAuth({
    portes,
    gmail: avecGmail ? g : null,
    base: BASE,
    journal: journalMuet,
  });
  return {
    portes,
    g,
    servir,
    get: (chemin: string) => servir(new Request(`${BASE}${chemin}`)),
  };
}

Deno.test("début : état vérifié puis renvoi vers Google avec l'URI de retour ; état inconnu → 400", async () => {
  const a = monter();
  const r = await a.get(`/google/debut?etat=${ETAT}`);
  assertEquals(r.status, 302);
  const loc = r.headers.get("location")!;
  assertMatch(
    loc,
    /^https:\/\/accounts\.google\.test\/consent\?state=etat_0123456789abcdef/,
  );
  assertMatch(
    decodeURIComponent(loc),
    /redirect_uri=https:\/\/p\.supabase\.co\/functions\/v1\/messagerie-oauth\/google\/retour/,
  );
  assertEquals(
    (await a.get(`/google/debut?etat=inconnu_0123456789`)).status,
    400,
  );
  assertEquals((await a.get(`/google/debut?etat=<script>`)).status, 400);
});

Deno.test("retour : code échangé, connexion enregistrée (jetons, adresse, curseur), renvoi vers l'écran ; rien dans l'URL", async () => {
  const a = monter();
  const r = await a.get(
    `/google/retour?code=code-valide-0123456789&state=${ETAT}`,
  );
  assertEquals(r.status, 302);
  assertEquals(
    r.headers.get("location"),
    "https://omegaai.fr/espace/messagerie?connectee=1",
  );
  const e = a.portes.enregistrements[0];
  assertEquals([e.adresse, e.renouvellement, e.acces, e.curseur], [
    "compta@banc.test",
    "renouv-1",
    "acces-1",
    "500",
  ]);
  // L'état est consommé : rejouer le même retour échoue.
  assertEquals(
    (await a.get(`/google/retour?code=code-valide-0123456789&state=${ETAT}`))
      .status,
    400,
  );
});

Deno.test("retour : refus de l'utilisateur, code refusé (jeton jamais obtenu), enregistrement en panne (jeton révoqué)", async () => {
  const a = monter();
  assertEquals(
    (await a.get(`/google/retour?error=access_denied&state=${ETAT}`)).status,
    200,
  );
  const b = monter();
  assertEquals(
    (await b.get(`/google/retour?code=code-faux-0123456789xx&state=${ETAT}`))
      .status,
    502,
  );
  assertEquals(b.g.revoques, []);
  const c = monter();
  c.portes.enregistrer = () => Promise.reject(new Error("porte en panne"));
  const r = await c.get(
    `/google/retour?code=code-valide-0123456789&state=${ETAT}`,
  );
  assertEquals(r.status, 502);
  assertEquals(c.g.revoques, ["renouv-1"]);
  const texte = await r.text();
  assertEquals(texte.includes("renouv-1") || texte.includes("acces-1"), false);
});

Deno.test("sans application Google configurée : 503", async () => {
  assertEquals(
    (await monter(false).get(`/google/debut?etat=${ETAT}`)).status,
    503,
  );
});
