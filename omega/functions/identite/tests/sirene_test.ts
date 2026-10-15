// Sirene : lecture d'une unité légale, l'API de l'INSEE avec un faux fetch,
// l'annuaire de repli, et le choix entre les deux.

import { assert, assertEquals, assertRejects } from "@std/assert";
import { ErreurOuvrier } from "@partage/erreurs.ts";
import { lireUniteLegale, SireneAvecRepli, sireneDepuisEnv, SireneInsee, SireneRechercheEntreprises } from "../sirene.ts";
import { envFactice, sireneActif, SireneFactice } from "./doubles.ts";

function fauxFetch(reponse: (url: string, init?: RequestInit) => { statut: number; corps?: unknown } | Error) {
  const appels: { url: string; init?: RequestInit }[] = [];
  const f = async (entree: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(entree);
    appels.push({ url, init });
    const r = reponse(url, init);
    if (r instanceof Error) throw r;
    return await Promise.resolve(
      new Response(r.corps === undefined ? "" : typeof r.corps === "string" ? r.corps : JSON.stringify(r.corps), { status: r.statut }),
    );
  };
  return { f: f as typeof fetch, appels };
}

const UNITE_ACTIVE = {
  header: { statut: 200, message: "OK" },
  uniteLegale: {
    siren: "123456782",
    statutDiffusionUniteLegale: "O",
    dateCreationUniteLegale: "2015-03-01",
    prenom1UniteLegale: null,
    periodesUniteLegale: [
      {
        dateFin: null,
        dateDebut: "2019-01-01",
        etatAdministratifUniteLegale: "A",
        denominationUniteLegale: "ATELIER DURAND",
        categorieJuridiqueUniteLegale: "5710",
        activitePrincipaleUniteLegale: "43.32A",
        nomUniteLegale: null,
      },
      {
        dateFin: "2018-12-31",
        dateDebut: "2015-03-01",
        etatAdministratifUniteLegale: "A",
        denominationUniteLegale: "DURAND ET FILS",
        categorieJuridiqueUniteLegale: "5499",
        activitePrincipaleUniteLegale: "43.32A",
        nomUniteLegale: null,
      },
    ],
  },
};

Deno.test("lireUniteLegale : la période courante, l'état, la dénomination, rien de secret", () => {
  const r = lireUniteLegale("123456782", UNITE_ACTIVE);
  assertEquals(r.etat, "actif");
  assertEquals(r.source, "sirene");
  assertEquals(r.preuve.denomination, "ATELIER DURAND");
  assertEquals(r.preuve.categorie_juridique, "5710");
  assertEquals(r.preuve.diffusion, "totale");
  assertEquals(r.preuve.date_creation, "2015-03-01");
  assertEquals(r.preuve.depuis_le, "2019-01-01");
  assert(typeof r.preuve.consulte_le === "string");
});

Deno.test("lireUniteLegale : entreprise cessée, personne physique, unité non diffusible, réponse vide", () => {
  const cessee = lireUniteLegale("123456782", {
    uniteLegale: {
      statutDiffusionUniteLegale: "O",
      periodesUniteLegale: [{ dateFin: null, dateDebut: "2024-06-30", etatAdministratifUniteLegale: "C", denominationUniteLegale: "ATELIER DURAND" }],
    },
  });
  assertEquals(cessee.etat, "cesse");
  assertEquals(cessee.preuve.date_cessation, "2024-06-30");

  const ei = lireUniteLegale("123456782", {
    uniteLegale: {
      statutDiffusionUniteLegale: "O",
      prenom1UniteLegale: "MARIE",
      periodesUniteLegale: [{ dateFin: null, etatAdministratifUniteLegale: "A", nomUniteLegale: "DURAND", denominationUniteLegale: null }],
    },
  });
  assertEquals(ei.preuve.denomination, "MARIE DURAND");
  assertEquals(ei.preuve.personne_physique, true);

  const nd = lireUniteLegale("123456782", {
    uniteLegale: {
      statutDiffusionUniteLegale: "P",
      prenom1UniteLegale: "[ND]",
      periodesUniteLegale: [{ dateFin: null, etatAdministratifUniteLegale: "A", nomUniteLegale: "[ND]", denominationUniteLegale: "[ND]" }],
    },
  });
  assertEquals(nd.etat, "actif");
  assertEquals(nd.preuve.diffusion, "partielle");
  assertEquals(nd.preuve.denomination, undefined, "aucun nom pour une unité non diffusible");

  assertEquals(lireUniteLegale("123456782", {}).etat, "indisponible");
});

Deno.test("SireneInsee : en-tête de clé, 200, 404, 429, 500, réseau", async () => {
  const ok = fauxFetch(() => ({ statut: 200, corps: UNITE_ACTIVE }));
  const s = new SireneInsee("cle-de-test", ok.f);
  const r = await s.consulter("123 456 782");
  assertEquals(r.etat, "actif");
  assertEquals(ok.appels[0].url, "https://api.insee.fr/api-sirene/3.11/siren/123456782");
  assertEquals((ok.appels[0].init?.headers as Record<string, string>)["X-INSEE-Api-Key-Integration"], "cle-de-test");

  const inconnu = await new SireneInsee("k", fauxFetch(() => ({ statut: 404, corps: { header: { statut: 404, message: "Aucun élément trouvé" } } })).f)
    .consulter("123456782");
  assertEquals(inconnu.etat, "inconnu");
  assertEquals(inconnu.preuve.siren, "123456782");

  const quota = await new SireneInsee("k", fauxFetch(() => ({ statut: 429, corps: "Too Many Requests" })).f).consulter("123456782");
  assertEquals(quota.etat, "indisponible");
  assert(quota.motif?.includes("429"));

  const panne = await new SireneInsee("k", fauxFetch(() => ({ statut: 503 })).f).consulter("123456782");
  assertEquals(panne.etat, "indisponible");

  const reseau = await new SireneInsee("k", fauxFetch(() => new Error("connexion coupée")).f).consulter("123456782");
  assertEquals(reseau.etat, "indisponible");
  assert(reseau.motif?.includes("injoignable"));

  const illisible = await new SireneInsee("k", fauxFetch(() => ({ statut: 200, corps: "<html>" })).f).consulter("123456782");
  assertEquals(illisible.etat, "indisponible");

  const court = await new SireneInsee("k", ok.f).consulter("1234");
  assertEquals(court.etat, "inconnu");
  assertEquals(ok.appels.length, 1, "un SIREN mal formé ne part pas au registre");
});

Deno.test("SireneInsee : une clé refusée est une porte refusée, pas une panne", async () => {
  const s = new SireneInsee("mauvaise", fauxFetch(() => ({ statut: 401, corps: { fault: "Invalid Credentials" } })).f);
  const e = await assertRejects(() => s.consulter("123456782"), ErreurOuvrier);
  assertEquals(e.code, "PORTE_REFUSEE");
});

Deno.test("SireneRechercheEntreprises : trouvé, absent, panne", async () => {
  const trouve = fauxFetch(() => ({
    statut: 200,
    corps: {
      results: [{
        siren: "123456782",
        nom_complet: "ATELIER DURAND",
        nom_raison_sociale: "ATELIER DURAND",
        nature_juridique: "5710",
        activite_principale: "43.32A",
        date_creation: "2015-03-01",
        etat_administratif: "A",
      }],
      total_results: 1,
    },
  }));
  const s = new SireneRechercheEntreprises(trouve.f);
  const r = await s.consulter("123456782");
  assertEquals(r.etat, "actif");
  assertEquals(r.source, "recherche-entreprises");
  assertEquals(r.preuve.denomination, "ATELIER DURAND");
  assert(trouve.appels[0].url.startsWith("https://recherche-entreprises.api.gouv.fr/search?q=123456782"));

  const autre = await new SireneRechercheEntreprises(
    fauxFetch(() => ({ statut: 200, corps: { results: [{ siren: "999999999", etat_administratif: "A" }] } })).f,
  ).consulter("123456782");
  assertEquals(autre.etat, "inconnu", "un résultat d'un autre SIREN ne compte pas");

  const ferme = await new SireneRechercheEntreprises(
    fauxFetch(() => ({ statut: 200, corps: { results: [{ siren: "123456782", nom_complet: "X", etat_administratif: "C", date_fermeture: "2023-01-31" }] } })).f,
  ).consulter("123456782");
  assertEquals(ferme.etat, "cesse");
  assertEquals(ferme.preuve.date_cessation, "2023-01-31");

  const panne = await new SireneRechercheEntreprises(fauxFetch(() => ({ statut: 502 })).f).consulter("123456782");
  assertEquals(panne.etat, "indisponible");
});

Deno.test("SireneAvecRepli : l'INSEE d'abord, l'annuaire si la clé est refusée, rien sans registre", async () => {
  const insee = new SireneFactice();
  insee.panne = new ErreurOuvrier("PORTE_REFUSEE", "clé refusée", true);
  const repli = new SireneFactice();
  repli.reponses.set("123456782", { ...sireneActif("123456782"), source: "recherche-entreprises" });
  const s = new SireneAvecRepli(insee, repli);
  assertEquals(s.nom, "sirene+repli");
  const r = await s.consulter("123456782");
  assertEquals(r.source, "recherche-entreprises");
  await s.consulter("123456782");
  assertEquals(insee.appels.length, 1, "après un refus, l'INSEE n'est plus appelé dans le passage");
  assertEquals(repli.appels.length, 2);

  const sansRepli = new SireneAvecRepli(insee, null);
  await assertRejects(() => sansRepli.consulter("123456782"), ErreurOuvrier);

  const aucun = new SireneAvecRepli(null, null);
  assertEquals(aucun.nom, "aucun");
  assertEquals((await aucun.consulter("123456782")).etat, "indisponible");

  const inseeOk = new SireneFactice();
  inseeOk.reponses.set("123456782", sireneActif("123456782"));
  assertEquals((await new SireneAvecRepli(inseeOk, repli).consulter("123456782")).source, "sirene");
});

Deno.test("sireneDepuisEnv : avec clé, sans clé, repli coupé", () => {
  assertEquals(sireneDepuisEnv(envFactice({ SIRENE_API_KEY: "k" })).nom, "sirene+repli");
  assertEquals(sireneDepuisEnv(envFactice({})).nom, "repli");
  assertEquals(sireneDepuisEnv(envFactice({ SIRENE_REPLI: "non" })).nom, "aucun");
  assertEquals(sireneDepuisEnv(envFactice({ SIRENE_API_KEY: "k", SIRENE_REPLI: "non" })).nom, "sirene");
});
