// deno-lint-ignore-file require-await
// Le banc de recette : fermé sans TAMILA_BANC_CLIENT, limité à son cabinet ; semer un dossier fictif dont la clé est
// enveloppée au (faux) Key Manager et dont les pièces s'ouvrent avec elle ; relire un résultat d'analyse chiffré.

import { assert, assertEquals, assertFalse } from "@std/assert";
import { chiffrer, dechiffrer } from "../aesgcm.ts";
import type { Banc } from "../banc.ts";
import { pdf } from "../banc.ts";
import { traiter } from "../coffre.ts";
import { depuisHex, texte, versBase64 } from "../octets.ts";
import { CLIENT, contexte, GERANT } from "./doubles.ts";

const serveur = { type: "serveur" as const };
const personne = (jeton: string) => ({ type: "personne" as const, jeton });

function fauxBanc(client = CLIENT) {
  const fichiers = new Map<string, Uint8Array>();
  const analyses = new Map<string, Awaited<ReturnType<Banc["analyse"]>>>();
  const banc: Banc = {
    client,
    async deposer(chemin, octets) {
      if (fichiers.has(chemin)) throw new Error("bucket 409 : déjà là");
      fichiers.set(chemin, octets);
    },
    async analyse(id) {
      return analyses.get(id) ?? null;
    },
  };
  return { banc, fichiers, analyses };
}

async function cabinetAuBanc() {
  const c = contexte();
  const f = fauxBanc();
  c.ctx.banc = f.banc;
  await traiter(c.ctx, personne(GERANT), { action: "activer", client: CLIENT });
  // ce que la porte tamila_coffre_pour_nouvelle_cle rend au gérant
  const nouvelle = await c.portes.pourNouvelleCle(GERANT, CLIENT);
  return { ...c, ...f, nouvelle };
}

Deno.test("banc fermé : sans TAMILA_BANC_CLIENT 404, autre cabinet 403, personne 403", async () => {
  const c = contexte();
  assertEquals((await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT })).statut, 404);
  c.ctx.banc = fauxBanc("aaaaaaaa-0000-4000-8000-00000000000a").banc;
  assertEquals((await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT })).statut, 403);
  assertEquals((await traiter(c.ctx, personne(GERANT), { action: "banc_semer", client: CLIENT })).statut, 403);
});

Deno.test("banc_semer : clé enveloppée au nom du dossier, champs et quatre pièces chiffrés, remise émise, jamais la clé", async () => {
  const c = await cabinetAuBanc();
  const r = await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT, nouvelle: c.nouvelle, reference: "BANC-COFFRE-1" });
  assertEquals(r.statut, 200);
  assertFalse("cle" in r.corps);
  const pieces = r.corps.pieces as { chemin: string; sha256: string; octets: number }[];
  assertEquals(pieces.length, 4);
  assertEquals(c.fichiers.size, 4);
  assert(pieces.every((p) => p.chemin.startsWith(`${CLIENT}/tamila_dossier/${c.nouvelle.dossier}/`)));
  assertEquals(c.portes.journal.find((j) => j.id === c.nouvelle.journal)!.issue, "emise");
  // la clé se déballe au nom du dossier, et ouvre les pièces et la référence
  const cle = await c.km!.dechiffrer(c.nouvelle.cle_maitre, depuisHex(r.corps.cle_enveloppe as string), c.nouvelle.dossier);
  const p0 = await dechiffrer(cle, c.fichiers.get(pieces[0].chemin)!);
  assertEquals(new TextDecoder().decode(p0.slice(0, 8)), "%PDF-1.4");
  assertEquals(new TextDecoder().decode(await dechiffrer(cle, depuisHex(r.corps.reference as string))), "BANC-COFFRE-1");
  assertEquals(r.corps.numero_rg, null);
  // une nouvelle clé ne se sème qu'une fois (la remise a son issue)
  assertEquals((await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT, nouvelle: c.nouvelle })).statut, 409);
  assertEquals((await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT, nouvelle: { ...c.nouvelle, reference: "x" } })).statut, 400);
});

Deno.test("banc_lire : le résultat chiffré se relit avec la remise du gérant ; pas de remise, pas de lecture", async () => {
  const c = await cabinetAuBanc();
  const s = await traiter(c.ctx, serveur, { action: "banc_semer", client: CLIENT, nouvelle: c.nouvelle });
  const dossier = c.nouvelle.dossier;
  const cle = await c.km!.dechiffrer(c.nouvelle.cle_maitre, depuisHex(s.corps.cle_enveloppe as string), dossier);
  await c.portes.ajouterDossier(dossier, cle, [GERANT], "scaleway", depuisHex(s.corps.cle_enveloppe as string));
  const resultat = { type: "tamila.chronologie", constats: [{ code: "evenement", titre: "Signature du bail" }] };
  const id = "abababab-0000-4000-8000-000000000001";
  c.analyses.set(id, {
    client_id: CLIENT,
    module: "tamila",
    objet_id: dossier,
    type: "tamila.chronologie",
    statut: "finie",
    resultat_chiffre: versBase64(await chiffrer(cle, texte(JSON.stringify(resultat)))),
  });
  assertEquals((await traiter(c.ctx, serveur, { action: "banc_lire", client: CLIENT, analyse: id })).statut, 400);
  const remise = await c.portes.pourMembre(GERANT, dossier, null);
  const r = await traiter(c.ctx, serveur, { action: "banc_lire", client: CLIENT, analyse: id, remise });
  assertEquals(r.statut, 200);
  assertEquals(r.corps.resultat, resultat);
  assertEquals(c.portes.journal.at(-1)!.issue, "deballe");
});

Deno.test("pdf : un PDF d'une page, xref aux bons décalages", () => {
  const o = pdf(["Bonjour (essai)"]);
  const t = new TextDecoder("latin1").decode(o);
  assert(t.startsWith("%PDF-1.4") && t.trimEnd().endsWith("%%EOF"));
  const decal = Number(/startxref\n(\d+)/.exec(t)![1]);
  assertEquals(t.slice(decal, decal + 4), "xref");
  assert(t.includes("(Bonjour \\(essai\\)) Tj"));
});
