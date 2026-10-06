// Le passage de l'ouvrier sur des portes et un réseau en mémoire : envoi, reprise sans doublon, refus, panne de jeton.

import { assertEquals } from "@std/assert";
import { passage } from "../passage.ts";
import type { AEnvoyer, Connexion } from "../portes.ts";
import { CLIENT_BANC, contexte, ecriture, ENTITE_BANC, PortesMemoire, Reseau } from "./doubles.ts";

const QBO: Connexion = { id: "cx-qbo", editeur: "quickbooks", client_id: CLIENT_BANC, entite_id: ENTITE_BANC, parametres: { realm_id: "9130" } };

function a(num: number, connexion = QBO): AEnvoyer {
  return { connexion, ecriture: ecriture(num), envoi: null };
}

function reseauQbo(journal: (n: number) => { statut?: number; json?: unknown; texte?: string }) {
  let n = 0;
  return new Reseau()
    .quand("GET", /\/query\?/, (x) => {
      const q = new URL(x.url).searchParams.get("query")!;
      if (q.startsWith("select Id from Account")) return { json: { QueryResponse: { Account: [{ Id: "1" }] } } };
      if (q.startsWith("select Id from Vendor")) return { json: { QueryResponse: { Vendor: [{ Id: "58" }] } } };
      if (q.startsWith("select Id from JournalEntry")) return { json: { QueryResponse: q.includes("HA-13") ? { JournalEntry: [{ Id: "700" }] } : {} } };
      return { statut: 400 };
    })
    .quand("POST", /\/journalentry\?/, () => journal(++n));
}

function portesAvecSecret() {
  const p = new PortesMemoire();
  p.secrets.set("cx-qbo", JSON.stringify({ access_token: "a", refresh_token: "r", expires_at: "2026-10-06T12:00:00Z" }));
  return p;
}

Deno.test("Passage : chaque écriture est commencée, envoyée, notée ; le battement porte le bilan", async () => {
  const portes = portesAvecSecret();
  portes.file = [a(12), a(14)];
  const reseau = reseauQbo((n) => ({ json: { JournalEntry: { Id: String(500 + n) } } }));
  const b = await passage(contexte(portes, reseau));
  assertEquals([b.pris, b.envoyees, b.refusees], [2, 2, 0]);
  assertEquals(portes.notes.map((x) => x.id), ["501", "502"]);
  assertEquals((portes.battements[0] as { envoyees: number }).envoyees, 2);
});

Deno.test("Passage : un second essai cherche d'abord chez l'éditeur et ne renvoie pas une écriture déjà arrivée", async () => {
  const portes = portesAvecSecret();
  portes.etats.set("cx-qbo/2026/13", { etat: "a_reprendre", tentatives: 1, id_externe: null });
  portes.file = [a(13)];
  const reseau = reseauQbo(() => ({ json: { JournalEntry: { Id: "999" } } }));
  const b = await passage(contexte(portes, reseau));
  assertEquals([b.retrouvees, b.envoyees], [1, 1]);
  assertEquals(portes.notes[0].id, "700");
  assertEquals(reseau.vers("POST", /\/journalentry\?/).length, 0);
});

Deno.test("Passage : un rejet de l'éditeur refuse l'écriture, une panne passagère la garde à reprendre", async () => {
  const portes = portesAvecSecret();
  portes.file = [a(20), a(21)];
  const reseau = reseauQbo((n) =>
    n === 1 ? { statut: 400, json: { Fault: { Error: [{ Message: "Business Validation Error" }] } } } : { statut: 503, texte: "indisponible" }
  );
  const b = await passage(contexte(portes, reseau));
  assertEquals([b.refusees, b.a_reprendre], [1, 1]);
  assertEquals(portes.echecs.map((x) => x.definitif), [true, false]);
});

Deno.test("Passage : un jeton retiré arrête la connexion, et ses autres écritures attendent", async () => {
  const portes = portesAvecSecret();
  portes.secrets.set("cx-qbo", JSON.stringify({ access_token: "a", refresh_token: "r", expires_at: "2026-10-01T00:00:00Z" }));
  portes.file = [a(30), a(31)];
  const reseau = new Reseau().quand("POST", /tokens\/bearer/, { statut: 400, json: { error: "invalid_grant" } });
  const b = await passage(contexte(portes, reseau));
  assertEquals([b.connexions_en_panne, b.ignorees, b.envoyees], [1, 1, 0]);
  assertEquals(portes.pannes.length, 1);
  assertEquals(portes.echecs[0].definitif, false);
});

Deno.test("Passage : Cegid Loop en attente garde la référence de la demande", async () => {
  const portes = new PortesMemoire();
  portes.secrets.set("cx-loop", JSON.stringify({ api_key: "k", subscription_key: "s" }));
  const loop: Connexion = { id: "cx-loop", editeur: "cegid_loop", client_id: CLIENT_BANC, entite_id: ENTITE_BANC, parametres: { code_ibs: "DOS01" } };
  portes.file = [a(40, loop)];
  const reseau = new Reseau()
    .quand("POST", /\/imports$/, { json: { accountingImportRequestId: "R-1" } })
    .quand("GET", /\/imports\/R-1$/, { json: { status: 2 } });
  const b = await passage(
    contexte(portes, reseau, { CEGID_LOOP_URL: "https://loop.exemple", CEGID_LOOP_CHEMIN_IMPORT: "/imports", CEGID_LOOP_CHEMIN_STATUT: "/imports/{id}" }),
  );
  assertEquals(b.en_attente, 1);
  assertEquals(portes.references[0].ref, "loop:R-1");
});

Deno.test("Passage : Cegid Loop sans configuration arrête la connexion au lieu de refuser l'écriture", async () => {
  const portes = new PortesMemoire();
  const loop: Connexion = { id: "cx-loop", editeur: "cegid_loop", client_id: CLIENT_BANC, entite_id: ENTITE_BANC, parametres: { code_ibs: "DOS01" } };
  portes.file = [a(41, loop)];
  const b = await passage(contexte(portes, new Reseau()));
  assertEquals([b.connexions_en_panne, b.refusees], [1, 0]);
});
