// Les portes par RPC : chaque méthode appelle la bonne fonction du schéma
// public, avec la clé de service, et rend ce que la base répond.

import { assert, assertEquals } from "@std/assert";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { PortesRpc } from "@partage/portes.ts";

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

Deno.test("portes : prendre_travaux, finir, échouer, commencer, enregistrer, battre", async () => {
  const { f, appels } = fauxFetch({
    prendre_travaux: [{ id: 2138, genre: "lecteur.lire", charge: { piece: "p" } }],
    finir_travail: undefined,
    echouer_travail: "repris",
    commencer_lecture: true,
    enregistrer_lecture: { pages: 1, valeurs: 3, statut: "lue" },
    battre_ouvrier: 2,
  });
  const portes = new PortesRpc(cfg, f);
  const travaux = await portes.prendreTravaux(["lecteur.lire"], 5, "10 minutes", "lecteur");
  assertEquals(travaux[0].id, 2138);
  assertEquals(appels[0].url, "https://exemple.supabase.co/rest/v1/rpc/prendre_travaux");
  assertEquals(appels[0].corps, { p_genres: ["lecteur.lire"], p_nombre: 5, p_bail: "10 minutes", p_ouvrier: "lecteur" });
  assertEquals(appels[0].entetes.Authorization, "Bearer cle-de-test");
  assertEquals(appels[0].entetes.apikey, "cle-de-test");

  await portes.finirTravail(2138, { statut: "lue" });
  assertEquals(appels[1].corps, { p_id: 2138, p_resultat: { statut: "lue" } });
  assertEquals(await portes.echouerTravail(2138, "IA_NON_BRANCHEE : x"), "repris");
  assertEquals(appels[2].corps, { p_id: 2138, p_erreur: "IA_NON_BRANCHEE : x", p_reprendre: true });
  assertEquals(await portes.commencerLecture("p"), true);
  const e = await portes.enregistrerLecture("p", { statut: "lue", pages: [], valeurs: [] }, "lecteur/2026-10-05/x");
  assertEquals(e.valeurs, 3);
  assertEquals((appels[4].corps as { p_version: string }).p_version, "lecteur/2026-10-05/x");
  assertEquals(await portes.battreOuvrier("lecteur", ["lecteur.lire"], { pris: 0 }), 2);
  assertEquals((appels[5].corps as { p_attendu: string }).p_attendu, "15 minutes");
});

Deno.test("portes : piece_a_lire, consommation_ia_jour, lire_parametre", async () => {
  const { f, appels } = fauxFetch({
    piece_a_lire: (c: unknown) => ((c as { p_piece: string }).p_piece === "p1" ? { id: "p1", client_id: "c", chemin: "x/y", mime: "application/pdf" } : null),
    consommation_ia_jour: "0.0421",
    lire_parametre: (c: unknown) => ((c as { p_cle: string }).p_cle === "plafond_ia_jour_client" ? "5" : null),
  });
  const portes = new PortesRpc(cfg, f);
  assertEquals((await portes.lirePiece("p1"))?.chemin, "x/y");
  assertEquals(await portes.lirePiece("p2"), null);
  assertEquals(appels[0].url, "https://exemple.supabase.co/rest/v1/rpc/piece_a_lire");
  assertEquals(await portes.consommationIaDuJour("c"), 0.0421);
  assertEquals(appels[2].corps, { p_client: "c" });
  assertEquals(await portes.lireParametre("plafond_ia_jour_client"), "5");
  assertEquals(await portes.lireParametre("inconnu"), null);
  // Aucune lecture directe de table : tout passe par /rpc/.
  assert(appels.every((a) => a.url.includes("/rest/v1/rpc/")));
});

Deno.test("portes : un 5xx est une panne fournisseur, un 401/403 une porte refusée, un autre 4xx une erreur interne", async () => {
  const p5 = new PortesRpc(cfg, fauxFetch({ commencer_lecture: { message: "boom" } }, 503).f);
  try {
    await p5.commencerLecture("p");
    assert(false, "aurait dû lever");
  } catch (e) {
    assert(e instanceof ErreurOuvrier);
    assertEquals(e.code, "FOURNISSEUR_INDISPONIBLE");
  }
  const p403 = new PortesRpc(cfg, fauxFetch({ piece_a_lire: { code: "42501", message: "permission denied for function piece_a_lire" } }, 403).f);
  try {
    await p403.lirePiece("p");
    assert(false, "aurait dû lever");
  } catch (e) {
    assert(e instanceof ErreurOuvrier);
    assertEquals(e.code, "PORTE_REFUSEE");
    assert(e.motif.startsWith("PORTE_REFUSEE : porte piece_a_lire : HTTP 403"));
  }
  const p4 = new PortesRpc(cfg, fauxFetch({ finir_travail: { message: "Travail introuvable ou pas en cours : 1." } }, 400).f);
  try {
    await p4.finirTravail(1, {});
    assert(false, "aurait dû lever");
  } catch (e) {
    assert(e instanceof ErreurOuvrier);
    assertEquals(e.code, "ERREUR_INTERNE");
    assert(e.message.includes("introuvable"));
  }
});

Deno.test("rpc() seule : réutilisable par un autre ouvrier, mêmes codes d'erreur", async () => {
  const { rpc } = await import("@partage/portes.ts");
  const { f, appels } = fauxFetch({ identite_tiers: { siren: "812345676" } });
  const r = await rpc<{ siren: string }>(cfg, f, "identite_tiers", { p_siren: "812345676" });
  assertEquals(r.siren, "812345676");
  assertEquals(appels[0].url, "https://exemple.supabase.co/rest/v1/rpc/identite_tiers");
  assertEquals(appels[0].entetes.Authorization, "Bearer cle-de-test");
  assertEquals(await rpc<null>(cfg, fauxFetch({ vide: undefined }).f, "vide", {}), null);
  try {
    await rpc(cfg, fauxFetch({ x: {} }, 403).f, "x", {});
    assert(false, "aurait dû lever");
  } catch (e) {
    assert(e instanceof ErreurOuvrier);
    assertEquals(e.code, "PORTE_REFUSEE");
  }
});
