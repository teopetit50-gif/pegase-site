// Les portes par RPC : chaque méthode appelle la bonne fonction du schéma
// public, avec la clé de service, et tout passe par /rpc/.

import { assert, assertEquals, assertRejects } from "@std/assert";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { PortesIdentiteRpc } from "../portes.ts";

function fauxFetch(reponses: Record<string, unknown | ((corps: unknown) => unknown)>, statut = 200) {
  const appels: { url: string; corps: unknown; entetes: Record<string, string> }[] = [];
  const f = async (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(entree);
    const corps = init?.body ? JSON.parse(String(init.body)) : null;
    appels.push({ url, corps, entetes: init?.headers as Record<string, string> });
    const porte = url.split("/rpc/")[1];
    const r = reponses[porte];
    const valeur = typeof r === "function" ? (r as (c: unknown) => unknown)(corps) : r;
    return await Promise.resolve(new Response(valeur === undefined ? "" : JSON.stringify(valeur), { status: statut }));
  };
  return { f: f as typeof fetch, appels };
}

const cfg = { url: "https://exemple.supabase.co", cleService: "cle-de-test" };

Deno.test("portes : identite_a_verifier, noter_identite, identite_relancer", async () => {
  const { f, appels } = fauxFetch({
    identite_a_verifier: (
      c: unknown,
    ) => ((c as { p_verification: string }).p_verification === "v1" ? { id: "v1", registre: "sirene", identifiant: "123456782", cache: null } : null),
    noter_identite: { verification: "v1", deja_repondue: false, complements: 1, recontrolees: "2" },
    identite_relancer: 3,
    identite_balayer: 4,
  });
  const portes = new PortesIdentiteRpc(cfg, f);
  const d = await portes.aVerifier("v1");
  assertEquals(d?.identifiant, "123456782");
  assertEquals(await portes.aVerifier("v2"), null);
  assertEquals(appels[0].url, "https://exemple.supabase.co/rest/v1/rpc/identite_a_verifier");
  assertEquals(appels[0].corps, { p_verification: "v1" });
  assertEquals(appels[0].entetes.Authorization, "Bearer cle-de-test");
  assertEquals(appels[0].entetes.apikey, "cle-de-test");

  const n = await portes.noter("v1", "valide", { registre: "sirene" }, "sirene", [{
    registre: "vies",
    identifiant: "FR11123456782",
    resultat: "valide",
    preuve: {},
    source: "vies",
  }]);
  // Une porte d'avant b7_04 ne rend ni resultat ni doute : pas de doute.
  assertEquals(n, { verification: "v1", deja_repondue: false, complements: 1, recontrolees: 2, resultat: null, doute: false });
  assertEquals(appels[2].corps, {
    p_verification: "v1",
    p_resultat: "valide",
    p_preuve: { registre: "sirene" },
    p_source: "sirene",
    p_complements: [{ registre: "vies", identifiant: "FR11123456782", resultat: "valide", preuve: {}, source: "vies" }],
  });
  assertEquals(await portes.relancer(2), 3);
  assertEquals(appels[3].corps, { p_heures: 2 });
  assertEquals(await portes.balayer(90, 5), 4);
  assertEquals(appels[4].corps, { p_jours: 90, p_max: 5 });
  assert(appels.every((a) => a.url.includes("/rest/v1/rpc/")));
});

Deno.test("portes : la file (prendre, finir, échouer, battre) passe par le socle partagé", async () => {
  const { f, appels } = fauxFetch({
    prendre_travaux: [{ id: 3001, genre: "identite.verifier", charge: { verification: "v1" } }],
    finir_travail: undefined,
    echouer_travail: "repris",
    battre_ouvrier: 1,
  });
  const portes = new PortesIdentiteRpc(cfg, f);
  const t = await portes.prendreTravaux(["identite.verifier"], 10, "5 minutes", "identite");
  assertEquals(t[0].id, 3001);
  assertEquals(appels[0].corps, { p_genres: ["identite.verifier"], p_nombre: 10, p_bail: "5 minutes", p_ouvrier: "identite" });
  await portes.finirTravail(3001, { resultat: "valide" });
  assertEquals(await portes.echouerTravail(3001, "FOURNISSEUR_INDISPONIBLE : x"), "repris");
  assertEquals(await portes.battreOuvrier("identite", ["identite.verifier"], { pris: 0 }), 1);
  assertEquals((appels[3].corps as { p_module: string }).p_module, "identite");
});

Deno.test("portes : 5xx = panne, 401/403 = porte refusée, autre 4xx = erreur interne, réseau = panne", async () => {
  const p5 = new PortesIdentiteRpc(cfg, fauxFetch({ identite_relancer: { message: "boom" } }, 503).f);
  assertEquals((await assertRejects(() => p5.relancer(2), ErreurOuvrier)).code, "FOURNISSEUR_INDISPONIBLE");
  const p403 = new PortesIdentiteRpc(cfg, fauxFetch({ identite_a_verifier: { code: "42501", message: "permission denied" } }, 403).f);
  const e = await assertRejects(() => p403.aVerifier("v"), ErreurOuvrier);
  assertEquals(e.code, "PORTE_REFUSEE");
  assert(e.motif.startsWith("PORTE_REFUSEE : porte identite_a_verifier : HTTP 403"));
  const p4 = new PortesIdentiteRpc(cfg, fauxFetch({ noter_identite: { message: "Résultat inconnu : bof" } }, 400).f);
  const e4 = await assertRejects(() => p4.noter("v", "valide", {}, "sirene"), ErreurOuvrier);
  assertEquals(e4.code, "ERREUR_INTERNE");
  const reseau = new PortesIdentiteRpc(cfg, (() => Promise.reject(new Error("coupé"))) as unknown as typeof fetch);
  assertEquals((await assertRejects(() => reseau.relancer(2), ErreurOuvrier)).code, "FOURNISSEUR_INDISPONIBLE");
});
