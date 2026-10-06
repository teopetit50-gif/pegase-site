// Le coffre de bout en bout avec le faux Key Manager : activation, nouvelle clé, clé d'un membre, clé du
// lecteur, ré-enveloppement local → scaleway, et ce qui doit échouer sans rien changer.

import { assert, assertEquals, assertFalse, assertNotEquals } from "@std/assert";
import { chiffrer, dechiffrer } from "../aesgcm.ts";
import { lireReference, traiter } from "../coffre.ts";
import { ErreurCoffre } from "../keymanager.ts";
import { depuisBase64, depuisHex, texte, versBase64, versHex } from "../octets.ts";
import { AVOCAT, CLIENT, contexte, FauxKeyManager, GERANT, VOISIN } from "./doubles.ts";

const personne = (jeton: string) => ({ type: "personne" as const, jeton });
const serveur = { type: "serveur" as const };
const DOSSIER = "dddddddd-0000-4000-8000-000000000001";
const PIECE = "eeeeeeee-0000-4000-8000-000000000001";

async function cabinetActive() {
  const c = contexte();
  const cle = crypto.getRandomValues(new Uint8Array(32));
  await c.portes.ajouterDossier(DOSSIER, cle, [GERANT, AVOCAT]);
  const r = await traiter(c.ctx, personne(GERANT), { action: "activer", client: CLIENT });
  assertEquals(r.statut, 200);
  return { ...c, cle };
}

Deno.test("activer : le gérant seul ; la clé maître est créée une fois, le coffre passe en bascule", async () => {
  const c = contexte();
  await c.portes.ajouterDossier(DOSSIER, crypto.getRandomValues(new Uint8Array(32)), [GERANT, AVOCAT]);
  const refuse = await traiter(c.ctx, personne(AVOCAT), { action: "activer", client: CLIENT });
  assertEquals(refuse.statut, 403);
  assertEquals(c.km!.appels.length, 0, "aucun appel au Key Manager pour une personne refusée");
  const r = await traiter(c.ctx, personne(GERANT), { action: "activer", client: CLIENT });
  assertEquals(r.corps.statut, "bascule");
  assertEquals(r.corps.dossiers_locaux, 1);
  const encore = await traiter(c.ctx, personne(GERANT), { action: "activer", client: CLIENT });
  assertEquals(encore.corps.deja, true);
  assertEquals(c.km!.noms.size, 1);
});

Deno.test("activer : sans secrets Scaleway, 503 KM_ABSENT et rien n'est posé", async () => {
  const c = contexte(null);
  const r = await traiter(c.ctx, personne(GERANT), { action: "activer", client: CLIENT });
  assertEquals(r.statut, 503);
  assertEquals(r.corps.erreur, "KM_ABSENT");
  assertEquals(c.portes.coffre.statut, "local");
});

Deno.test("nouvelle_cle : une clé de 32 octets, enveloppée avec l'identifiant du dossier, émise au journal", async () => {
  const c = await cabinetActive();
  const r = await traiter(c.ctx, personne(AVOCAT), { action: "nouvelle_cle", client: CLIENT });
  assertEquals(r.statut, 200);
  const cle = depuisBase64(r.corps.cle as string);
  assertEquals(cle.length, 32);
  const { cleMaitre } = lireReference(r.corps.reference as string);
  const deballee = await c.km!.dechiffrer(cleMaitre, depuisHex(r.corps.enveloppe as string), r.corps.dossier as string);
  assertEquals(versHex(deballee), versHex(cle), "l'enveloppe rendue contient la clé rendue");
  await c.km!.dechiffrer(cleMaitre, depuisHex(r.corps.enveloppe as string), DOSSIER).then(
    () => assert(false, "l'enveloppe d'un dossier ne s'ouvre pas au nom d'un autre"),
    (e) => assert(e instanceof ErreurCoffre),
  );
  assertEquals(c.portes.journal.at(-1)!.issue, "emise");
});

Deno.test("nouvelle_cle : Key Manager en panne → 503, la demande est conclue en échec", async () => {
  const c = await cabinetActive();
  c.km!.panne = new ErreurCoffre("KM_INDISPONIBLE", "Key Manager 503");
  const r = await traiter(c.ctx, personne(AVOCAT), { action: "nouvelle_cle", client: CLIENT });
  assertEquals(r.statut, 503);
  assertFalse("cle" in r.corps);
  assertEquals(c.portes.journal.at(-1)!.issue, "echec");
});

Deno.test("cle_dossier : un dossier local renvoie à la phrase ; un dossier scaleway rend la clé au membre, pas au voisin", async () => {
  const c = await cabinetActive();
  const local = await traiter(c.ctx, personne(AVOCAT), { action: "cle_dossier", dossier: DOSSIER });
  assertEquals(local.corps.fournisseur, "local");
  assertFalse("cle" in local.corps);
  assertEquals(c.km!.appels.filter((a) => a.op === "dechiffrer").length, 0);

  const n = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle", client: CLIENT });
  const d2 = n.corps.dossier as string;
  await c.portes.ajouterDossier(d2, depuisBase64(n.corps.cle as string), [GERANT, AVOCAT], "scaleway", depuisHex(n.corps.enveloppe as string));
  const r = await traiter(c.ctx, personne(AVOCAT), { action: "cle_dossier", dossier: d2 });
  assertEquals(r.statut, 200);
  assertEquals(r.corps.cle, n.corps.cle, "le membre reçoit la clé du dossier");
  assertEquals(c.portes.journal.at(-1)!.pour, "membre");
  assertEquals(c.portes.journal.at(-1)!.issue, "deballe");
  const voisin = await traiter(c.ctx, personne(VOISIN), { action: "cle_dossier", dossier: d2 });
  assertEquals(voisin.statut, 403);
  assertFalse("cle" in voisin.corps);
});

Deno.test("cle_piece : le lecteur seul, par la clé de service ; la pièce se déchiffre avec la clé rendue", async () => {
  const c = await cabinetActive();
  const n = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle", client: CLIENT });
  const d2 = n.corps.dossier as string;
  const cleDossier = depuisBase64(n.corps.cle as string);
  await c.portes.ajouterDossier(d2, cleDossier, [GERANT], "scaleway", depuisHex(n.corps.enveloppe as string));
  c.portes.dossiers.get(d2)!.pieces.set(PIECE, "recue");
  const pdf = texte("%PDF-1.7 avis d'audience");
  const chiffre = await chiffrer(cleDossier, pdf);

  const parUnePersonne = await traiter(c.ctx, personne(GERANT), { action: "cle_piece", piece: PIECE });
  assertEquals(parUnePersonne.statut, 403);
  const r = await traiter(c.ctx, serveur, { action: "cle_piece", piece: PIECE });
  assertEquals(r.statut, 200);
  assertEquals(new TextDecoder().decode(await dechiffrer(depuisBase64(r.corps.cle as string), chiffre)), "%PDF-1.7 avis d'audience");
  const ligne = c.portes.journal.at(-1)!;
  assertEquals([ligne.pour, ligne.piece, ligne.demandeur, ligne.issue], ["lecteur", PIECE, null, "deballe"]);

  c.portes.dossiers.get(d2)!.pieces.set(PIECE, "lue");
  const lue = await traiter(c.ctx, serveur, { action: "cle_piece", piece: PIECE });
  assertEquals(lue.statut, 409, "une pièce déjà lue n'a pas de clé à déballer");
});

Deno.test("cle_piece : une enveloppe qui ne s'ouvre pas → échec au journal, pas de clé", async () => {
  const c = await cabinetActive();
  const n = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle", client: CLIENT });
  const d2 = n.corps.dossier as string;
  const enveloppe = depuisHex(n.corps.enveloppe as string);
  enveloppe[enveloppe.length - 1] ^= 1;
  await c.portes.ajouterDossier(d2, depuisBase64(n.corps.cle as string), [GERANT], "scaleway", enveloppe);
  c.portes.dossiers.get(d2)!.pieces.set(PIECE, "recue");
  const r = await traiter(c.ctx, serveur, { action: "cle_piece", piece: PIECE });
  assertEquals(r.statut, 502);
  assertFalse("cle" in r.corps);
  assertEquals(c.portes.journal.at(-1)!.issue, "echec");
});

Deno.test("reenvelopper : la même clé, une enveloppe Scaleway ; les pièces non lues repartent ; la bascule finit", async () => {
  const c = await cabinetActive();
  c.portes.dossiers.get(DOSSIER)!.pieces.set(PIECE, "recue");
  const r = await traiter(c.ctx, personne(GERANT), { action: "reenvelopper", dossier: DOSSIER, cle: versBase64(c.cle) });
  assertEquals(r.statut, 200);
  assertEquals(r.corps.statut, "scaleway");
  assertEquals(r.corps.pieces_relancees, 1);
  assertEquals(c.portes.relances, [PIECE]);
  const d = c.portes.dossiers.get(DOSSIER)!;
  assertEquals(d.fournisseur, "scaleway");
  const { cleMaitre } = lireReference(d.reference);
  assertEquals(versHex(await c.km!.dechiffrer(cleMaitre, d.enveloppe, DOSSIER)), versHex(c.cle), "la clé du dossier n'a pas changé");
  // Désormais, l'avocat reçoit la clé par le coffre (plus besoin de la phrase).
  const membre = await traiter(c.ctx, personne(AVOCAT), { action: "cle_dossier", dossier: DOSSIER });
  assertEquals(membre.corps.cle, versBase64(c.cle));
  const encore = await traiter(c.ctx, personne(GERANT), { action: "reenvelopper", dossier: DOSSIER, cle: versBase64(c.cle) });
  assertEquals(encore.corps.deja, true);
});

Deno.test("reenvelopper : une clé qui n'ouvre pas le témoin est refusée, rien ne change", async () => {
  const c = await cabinetActive();
  const fausse = crypto.getRandomValues(new Uint8Array(32));
  const r = await traiter(c.ctx, personne(GERANT), { action: "reenvelopper", dossier: DOSSIER, cle: versBase64(fausse) });
  assertEquals(r.statut, 422);
  assertEquals(r.corps.erreur, "CLE_FAUSSE");
  assertEquals(c.portes.dossiers.get(DOSSIER)!.fournisseur, "local");
  assertEquals(c.portes.journal.at(-1)!.issue, "refuse");
  assertEquals(c.km!.appels.filter((a) => a.op === "chiffrer").length, 0, "rien n'est envoyé au Key Manager");
  const courte = await traiter(c.ctx, personne(GERANT), { action: "reenvelopper", dossier: DOSSIER, cle: "AAAA" });
  assertEquals(courte.statut, 400);
  const avocat = await traiter(c.ctx, personne(AVOCAT), { action: "reenvelopper", dossier: DOSSIER, cle: versBase64(c.cle) });
  assertEquals(avocat.statut, 403, "un intervenant qui n'est ni associé ni responsable ne ré-enveloppe pas");
});

Deno.test("le journal de la fonction ne porte jamais une clé ni une enveloppe", async () => {
  const c = await cabinetActive();
  c.portes.dossiers.get(DOSSIER)!.pieces.set(PIECE, "recue");
  await traiter(c.ctx, personne(GERANT), { action: "reenvelopper", dossier: DOSSIER, cle: versBase64(c.cle) });
  await traiter(c.ctx, serveur, { action: "cle_piece", piece: PIECE });
  const tout = JSON.stringify(c.lignes);
  assertFalse(tout.includes(versBase64(c.cle)));
  assertFalse(tout.includes(versHex(c.cle)));
  assertFalse(tout.includes(versHex(c.portes.dossiers.get(DOSSIER)!.enveloppe)));
});

Deno.test("demandes mal formées : action inconnue, uuid illisibles, région du coffre différente", async () => {
  const c = await cabinetActive();
  assertEquals((await traiter(c.ctx, personne(GERANT), { action: "tout_dechiffrer" })).statut, 400);
  assertEquals((await traiter(c.ctx, personne(GERANT), { action: "cle_dossier", dossier: "1; select" })).statut, 400);
  assertEquals((await traiter(c.ctx, serveur, { action: "cle_piece", piece: 42 })).statut, 400);
  // Un coffre réglé sur une autre région ne déballe pas une clé maître de fr-par.
  const ailleurs = { ...c.ctx, km: new FauxKeyManager("nl-ams") };
  const n = await traiter(ailleurs, personne(GERANT), { action: "nouvelle_cle", client: CLIENT });
  assertEquals(n.statut, 503);
  assertNotEquals(n.corps.erreur, undefined);
});

Deno.test("clé d'index : le gérant la fait émettre au coffre, un avocat la reçoit ; elle ne s'ouvre pas au nom d'un dossier", async () => {
  const c = await cabinetActive();
  const avocat = await traiter(c.ctx, personne(AVOCAT), { action: "nouvelle_cle_index", client: CLIENT });
  assertEquals(avocat.statut, 403, "le gérant seul fait émettre la clé d'index");
  const n = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle_index", client: CLIENT });
  assertEquals(n.statut, 200);
  const cle = n.corps.cle as string;
  assertEquals(depuisBase64(cle).length, 32);
  assertEquals(c.portes.journal.at(-1)!.issue, "emise");
  const encore = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle_index", client: CLIENT });
  assertEquals(encore.statut, 409, "une seule clé d'index par cabinet");
  const r = await traiter(c.ctx, personne(AVOCAT), { action: "cle_index", client: CLIENT });
  assertEquals(r.corps.cle, cle, "l'avocat reçoit la même clé");
  assertEquals(c.portes.journal.at(-1)!.issue, "deballe");
  const { cleMaitre } = lireReference(c.portes.index!.reference);
  await c.km!.dechiffrer(cleMaitre, depuisHex(c.portes.index!.enveloppe), DOSSIER).then(
    () => assert(false, "l'enveloppe de la clé d'index ne s'ouvre pas au nom d'un dossier"),
    (e) => assert(e instanceof ErreurCoffre),
  );
  const voisin = await traiter(c.ctx, personne(VOISIN), { action: "cle_index", client: CLIENT });
  assertEquals(voisin.statut, 403);
});

Deno.test("clé d'index : un cabinet local est renvoyé à la phrase ; sans clé, 404", async () => {
  const c = contexte();
  const sans = await traiter(c.ctx, personne(AVOCAT), { action: "cle_index", client: CLIENT });
  assertEquals(sans.statut, 404);
  c.portes.index = { fournisseur: "local", enveloppe: "", reference: "index:local" };
  const local = await traiter(c.ctx, personne(AVOCAT), { action: "cle_index", client: CLIENT });
  assertEquals(local.corps.fournisseur, "local");
  assertFalse("cle" in local.corps);
  const emise = await traiter(c.ctx, personne(GERANT), { action: "nouvelle_cle_index", client: CLIENT });
  assertEquals(emise.statut, 409, "un cabinet local ne fait pas émettre de clé d'index au coffre");
});
