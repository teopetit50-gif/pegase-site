// Un travail de bout en bout, sur doubles : Sirene, VIES, cache, cohérence,
// pannes, travail rendu dans tous les cas, journal sans donnée.

import { assert, assertEquals } from "@std/assert";
import { verifierTravail } from "../verifier.ts";
import { capturerJournal, contexteDeTest, demandeDeTest, sireneActif, travailDeTest, viesValide } from "./doubles.ts";

const V = "11111111-0000-4000-8000-000000000001";

Deno.test("sirene : SIREN actif → valide, noté avec la preuve et la version, travail fini, factures recontrôlées", async () => {
  const { ctx, portes, sirene } = contexteDeTest({ env: { IDENTITE_VERSION: "identite/2026-10-05/t" } });
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456782"));
  sirene.reponses.set("123456782", sireneActif("123456782"));
  const issue = await verifierTravail(ctx, travailDeTest(1, V));
  assertEquals(issue, "valide");
  assertEquals(sirene.appels, ["123456782"]);
  assertEquals(portes.notations.length, 1);
  const n = portes.notations[0];
  assertEquals(n.resultat, "valide");
  assertEquals(n.source, "sirene");
  assertEquals(n.preuve.denomination, "ATELIER DURAND SAS");
  assertEquals(n.preuve.verifie_par, "identite/2026-10-05/t");
  assertEquals(n.complements, []);
  assertEquals(portes.finis.length, 1);
  const fini = portes.finis[0].resultat as Record<string, unknown>;
  assertEquals(fini.resultat, "valide");
  assertEquals(fini.recontrolees, 1);
  assertEquals(portes.echoues.length, 0);
});

Deno.test("sirene : entreprise cessée ou SIREN inconnu → invalide, avec le motif", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456782"));
  sirene.reponses.set("123456782", {
    etat: "cesse",
    source: "sirene",
    preuve: { registre: "sirene", siren: "123456782", etat: "cesse", date_cessation: "2024-06-30" },
  });
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "invalide");
  assert(String(portes.notations[0].preuve.motif).includes("cessée"));

  const W = "11111111-0000-4000-8000-000000000002";
  portes.demandes.set(W, demandeDeTest(W, "sirene", "100000009"));
  sirene.reponses.set("100000009", { etat: "inconnu", source: "sirene", preuve: { siren: "100000009", motif: "SIREN inconnu de Sirene." } });
  assertEquals(await verifierTravail(ctx, travailDeTest(2, W)), "invalide");
  assertEquals(portes.notations[1].preuve.motif, "SIREN inconnu de Sirene.");
});

Deno.test("sirene : un SIREN à clé fausse est invalide sans consulter le registre", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456789"));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "invalide");
  assertEquals(sirene.appels.length, 0);
  assert(String(portes.notations[0].preuve.motif).includes("clé"));
});

Deno.test("cache : une réponse de moins de trente jours est reprise sans réseau ; plus vieille, indisponible ou forcée, on reconsulte", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  sirene.reponses.set("123456782", sireneActif("123456782"));
  const cache = {
    resultat: "valide" as const,
    preuve: { registre: "sirene", denomination: "ATELIER DURAND SAS" },
    source: "sirene",
    version: "identite/2026-09-20",
    verifie_le: "2026-09-20T10:00:00Z",
    age_jours: 15,
  };
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456782", { cache }));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "cache");
  assertEquals(sirene.appels.length, 0);
  assertEquals(portes.notations[0].source, "cache");
  assertEquals(portes.notations[0].preuve.cache_du, "2026-09-20T10:00:00Z");
  assertEquals(portes.notations[0].preuve.source_initiale, "sirene");
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).source, "cache");

  const W = "11111111-0000-4000-8000-000000000002";
  portes.demandes.set(W, demandeDeTest(W, "sirene", "123456782", { cache: { ...cache, age_jours: 45 } }));
  assertEquals(await verifierTravail(ctx, travailDeTest(2, W)), "valide");
  assertEquals(sirene.appels.length, 1, "cache trop vieux : on consulte");

  const X = "11111111-0000-4000-8000-000000000003";
  portes.demandes.set(X, demandeDeTest(X, "sirene", "123456782", { cache: { ...cache, resultat: "indisponible", age_jours: 1 } }));
  assertEquals(await verifierTravail(ctx, travailDeTest(3, X)), "valide");
  assertEquals(sirene.appels.length, 2, "un « indisponible » en cache ne vaut rien");

  const Y = "11111111-0000-4000-8000-000000000004";
  portes.demandes.set(Y, demandeDeTest(Y, "sirene", "123456782", { cache }));
  assertEquals(await verifierTravail(ctx, travailDeTest(4, Y, { charge: { verification: Y, force: true } })), "valide");
  assertEquals(sirene.appels.length, 3, "force : on consulte malgré le cache");
});

Deno.test("vies : numéro FR valide → VIES + Sirene en complément, cohérence et noms concordants", async () => {
  const { ctx, portes, sirene, vies } = contexteDeTest();
  portes.demandes.set(
    V,
    demandeDeTest(V, "vies", "FR11123456782", { fournisseur: { id: "f", pays: "FR", siren: "123456782", tva: "FR11123456782", statut: "actif" } }),
  );
  vies.reponses.set("FR11123456782", viesValide("FR", "11123456782", "SAS ATELIER DURAND"));
  sirene.reponses.set("123456782", sireneActif("123456782", "ATELIER DURAND"));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "valide");
  assertEquals(vies.appels, [{ pays: "FR", numero: "11123456782" }]);
  assertEquals(sirene.appels, ["123456782"]);
  const n = portes.notations[0];
  assertEquals(n.source, "vies");
  assertEquals(n.preuve.nom, "SAS ATELIER DURAND");
  const c = n.preuve.coherence as Record<string, unknown>;
  assertEquals(c.siren, "123456782");
  assertEquals(c.cle_ok, true);
  assertEquals(c.siren_fournisseur_ok, true);
  assertEquals(c.sirene, "actif");
  assertEquals(c.noms_concordent, true);
  assertEquals(n.complements.length, 1);
  assertEquals(n.complements[0].registre, "sirene");
  assertEquals(n.complements[0].identifiant, "123456782");
  assertEquals(n.complements[0].resultat, "valide");
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).complements, 1);
});

Deno.test("vies : numéro FR refusé par VIES mais SIREN actif → invalide, avec la remarque « non assujetti probable »", async () => {
  const { ctx, portes, sirene, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "FR11123456782"));
  vies.reponses.set("FR11123456782", {
    etat: "invalide",
    preuve: { registre: "vies", pays: "FR", numero: "11123456782", etat: "invalide", motif: "VIES ne reconnaît pas ce numéro de TVA." },
  });
  sirene.reponses.set("123456782", sireneActif("123456782"));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "invalide");
  assert(String(portes.notations[0].preuve.remarque).includes("non assujetti"));
  assertEquals(portes.notations[0].complements[0].resultat, "valide");
});

Deno.test("vies : Sirene en panne pendant le complément n'empêche pas la réponse de VIES", async () => {
  const { ctx, portes, sirene, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "FR11123456782"));
  vies.reponses.set("FR11123456782", viesValide("FR", "11123456782"));
  sirene.panne = new Error("Sirene explose");
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "valide");
  assertEquals((portes.notations[0].preuve.coherence as Record<string, unknown>).sirene, "indisponible");
  assertEquals(portes.notations[0].complements, []);
});

Deno.test("vies : numéro d'un autre État → VIES seul ; clé FR fausse → signalée dans la cohérence", async () => {
  const { ctx, portes, sirene, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "BE0123456749", { fournisseur: { id: "f", pays: "BE", siren: null, tva: "BE0123456749", statut: "actif" } }));
  vies.reponses.set("BE0123456749", viesValide("BE", "0123456749", "BRASSERIE X"));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "valide");
  assertEquals(sirene.appels.length, 0);
  assertEquals(portes.notations[0].preuve.coherence, undefined);

  const W = "11111111-0000-4000-8000-000000000002";
  portes.demandes.set(W, demandeDeTest(W, "vies", "FR12123456782"));
  vies.reponses.set("FR12123456782", viesValide("FR", "12123456782"));
  sirene.reponses.set("123456782", sireneActif("123456782"));
  assertEquals(await verifierTravail(ctx, travailDeTest(2, W)), "valide", "VIES fait foi ; la cohérence est une preuve, pas un veto");
  assertEquals((portes.notations[1].preuve.coherence as Record<string, unknown>).cle_ok, false);
});

Deno.test("vies : pas un numéro de l'Union → invalide sans réseau", async () => {
  const { ctx, portes, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "123456782"));
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "invalide");
  assertEquals(vies.appels.length, 0);
});

Deno.test("indisponible : reporté tant qu'il reste des essais ; au dernier, noté « indisponible » et le travail est fait", async () => {
  const { ctx, portes, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "DE123456788"));
  vies.parDefaut = { etat: "indisponible", preuve: {}, motif: "VIES : MS_UNAVAILABLE" };
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V, { essais: 2, essais_max: 5 })), "repris");
  assertEquals(portes.echoues.length, 1);
  assert(portes.echoues[0].erreur.startsWith("FOURNISSEUR_INDISPONIBLE : VIES : MS_UNAVAILABLE"));
  assertEquals(portes.echoues[0].reprendre, true);
  assertEquals(portes.notations.length, 0);
  assertEquals(portes.finis.length, 0);

  assertEquals(await verifierTravail(ctx, travailDeTest(2, V, { essais: 5, essais_max: 5 })), "indisponible");
  assertEquals(portes.notations.length, 1);
  assertEquals(portes.notations[0].resultat, "indisponible");
  assertEquals(portes.notations[0].preuve.motif, "VIES : MS_UNAVAILABLE");
  assertEquals(portes.finis.length, 1);
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).resultat, "indisponible");
});

Deno.test("ignorés : charge sans vérification, vérification introuvable, déjà répondue", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V, { charge: {} })), "ignore");
  assertEquals(await verifierTravail(ctx, travailDeTest(2, V)), "ignore");
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456782", { repondu_le: "2026-10-01T00:00:00Z", resultat: "valide" }));
  assertEquals(await verifierTravail(ctx, travailDeTest(3, V)), "ignore");
  assertEquals(portes.finis.length, 3);
  assertEquals((portes.finis[2].resultat as Record<string, unknown>).ignore, "déjà répondue");
  assertEquals(sirene.appels.length, 0);
  assertEquals(portes.notations.length, 0);
});

Deno.test("pannes : une porte qui casse rend le travail en reprise ; un échec définitif est un abandon", async () => {
  const { ctx, portes, sirene } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "sirene", "123456782"));
  sirene.reponses.set("123456782", sireneActif("123456782"));
  portes.panne.noter = new Error("noter_identite : HTTP 500");
  assertEquals(await verifierTravail(ctx, travailDeTest(1, V)), "repris");
  assert(portes.echoues[0].erreur.startsWith("ERREUR_INTERNE : Error: noter_identite"));
  assertEquals(portes.finis.length, 0);

  portes.panne.noter = undefined;
  portes.panne.aVerifier = new Error("porte introuvable");
  portes.echouerTravail = async (id: number, erreur: string) => {
    portes.echoues.push({ id, erreur, reprendre: false });
    return await Promise.resolve("echec" as const);
  };
  assertEquals(await verifierTravail(ctx, travailDeTest(2, V)), "abandon");
});

Deno.test("journal : ni identifiant ni nom n'y passent, seulement l'id de la vérification et l'issue", async () => {
  const { ctx, portes, sirene, vies } = contexteDeTest();
  portes.demandes.set(V, demandeDeTest(V, "vies", "FR11123456782"));
  vies.reponses.set("FR11123456782", viesValide("FR", "11123456782", "SAS ATELIER DURAND"));
  sirene.reponses.set("123456782", sireneActif("123456782", "ATELIER DURAND"));
  const lignes = await capturerJournal(async () => {
    await verifierTravail(ctx, travailDeTest(1, V));
  });
  assert(lignes.length >= 1);
  for (const l of lignes) {
    assert(!l.includes("123456782"), `identifiant dans le journal : ${l}`);
    assert(!l.includes("DURAND"), `nom dans le journal : ${l}`);
    assert(!l.includes("RUE DE LA PAIX"), `adresse dans le journal : ${l}`);
  }
  const fin = JSON.parse(lignes[lignes.length - 1]);
  assertEquals(fin.verification, V);
  assertEquals(fin.issue, "valide");
  assertEquals(fin.registre, "vies");
});
