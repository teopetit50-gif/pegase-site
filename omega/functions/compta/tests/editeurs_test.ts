// Les trois clients d'éditeur sur un réseau en mémoire : ce qu'ils envoient, ce qu'ils retrouvent, comment ils échouent.

import { assert, assertEquals, assertRejects } from "@std/assert";
import { CegidLoop, traEtendu } from "../editeurs/cegid_loop.ts";
import { ErreurEditeur } from "../editeurs/commun.ts";
import { Pennylane } from "../editeurs/pennylane.ts";
import { numeroDocument, QuickBooks } from "../editeurs/quickbooks.ts";
import { Jetons } from "../jetons.ts";
import { CLIENT_BANC, DepotMemoire, ecriture, env, PortesMemoire, Reseau } from "./doubles.ts";

const MAINTENANT = () => new Date("2026-10-06T10:00:00Z");
const ENV = env({ QBO_CLIENT_ID: "id-qbo", QBO_CLIENT_SECRET: "cle-qbo", PENNYLANE_CLIENT_ID: "id-pl", PENNYLANE_CLIENT_SECRET: "cle-pl" });

function jetons(portes: PortesMemoire, reseau: Reseau, editeur: "pennylane" | "quickbooks" | "cegid_loop", secret: unknown) {
  portes.secrets.set("cx", JSON.stringify(secret));
  return new Jetons("cx", editeur, portes, ENV, reseau.fetch, MAINTENANT);
}

// ─── Pennylane ───────────────────────────────────────────────────────────
function reseauPennylane() {
  return new Reseau()
    .quand("GET", /\/journals/, { json: { items: [{ id: 7, code: "HA", label: "Achats" }, { id: 8, code: "BQ", label: "Banque" }] } })
    .quand("GET", /\/ledger_accounts\?filter=/, (a) => {
      const f = JSON.parse(decodeURIComponent(new URL(a.url).searchParams.get("filter")!));
      const n = f[0].value as string;
      const connus: Record<string, number> = { "6061": 61, "44566": 66 };
      return { json: { items: connus[n] ? [{ id: connus[n], number: n, enabled: true }] : [] } };
    })
    .quand("POST", /\/ledger_accounts$/, { statut: 201, json: { id: 401001, number: "401DEL01" } })
    .quand("POST", /\/ledger_entries$/, { statut: 201, json: { id: 456789, status: "recorded" } });
}

Deno.test("Pennylane : l'écriture part avec ses comptes, son journal et sa clé en numéro de pièce", async () => {
  const portes = new PortesMemoire();
  const reseau = reseauPennylane();
  const p = new Pennylane(jetons(portes, reseau, "pennylane", { api_token: "jeton-bac" }), {}, reseau.fetch, "https://pl.exemple/v2");
  const issue = await p.envoyer(ecriture());
  assertEquals(issue, { idExterne: "456789" });
  const post = reseau.vers("POST", /\/ledger_entries$/)[0];
  assertEquals(post.entetes.authorization, "Bearer jeton-bac");
  const corps = JSON.parse(post.corps!);
  assertEquals(corps.journal_id, 7);
  assertEquals(corps.piece_number, "OMEGA-2026-HA-12");
  assertEquals(corps.ledger_entry_lines.map((l: { ledger_account_id: number; debit: string; credit: string }) => [l.ledger_account_id, l.debit, l.credit]), [
    [61, "100.00", "0.00"],
    [66, "20.00", "0.00"],
    [401001, "0.00", "120.00"],
  ]);
  // Le compte du fournisseur, absent, a été créé : 401 + son code.
  assertEquals(JSON.parse(reseau.vers("POST", /\/ledger_accounts$/)[0].corps!), { number: "401DEL01", label: "Papeterie Delorme" });
});

Deno.test("Pennylane : un compte de charge absent est un refus, sans rien créer", async () => {
  const portes = new PortesMemoire();
  const reseau = reseauPennylane();
  const p = new Pennylane(jetons(portes, reseau, "pennylane", { api_token: "j" }), {}, reseau.fetch, "https://pl.exemple/v2");
  const e = ecriture();
  e.lignes[0].compte_num = "6227";
  const err = await assertRejects(() => p.envoyer(e), ErreurEditeur);
  assertEquals(err.nature, "definitif");
  assert(err.message.includes("6227"));
  assertEquals(reseau.vers("POST", /\/ledger_entries$/).length, 0);
});

Deno.test("Pennylane : un journal renommé dans les paramètres de la connexion", async () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau().quand("GET", /\/journals/, { json: { items: [{ id: 3, code: "ACH" }] } });
  const p = new Pennylane(jetons(portes, reseau, "pennylane", { api_token: "j" }), { journal_achats: "ACH" }, reseau.fetch, "https://pl.exemple/v2");
  assertEquals(await p.journal("HA"), 3);
});

Deno.test("Pennylane : une reprise retrouve l'écriture par sa clé, et un filtre refusé n'arrête rien", async () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau().quand("GET", /\/ledger_entries\?filter=/, { json: { items: [{ id: 99, piece_number: "OMEGA-2026-HA-12" }] } }, {
    statut: 400,
    texte: "bad filter",
  });
  const p = new Pennylane(jetons(portes, reseau, "pennylane", { api_token: "j" }), {}, reseau.fetch, "https://pl.exemple/v2");
  assertEquals(await p.retrouver(ecriture(), null), { idExterne: "99" });
  assertEquals(await p.retrouver(ecriture(), null), null);
});

Deno.test("Pennylane : un 401 renouvelle le jeton OAuth, le range au coffre, et rejoue l'appel", async () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau()
    .quand("GET", /\/journals/, { statut: 401, texte: "expired" }, { json: { items: [{ id: 7, code: "HA" }] } })
    .quand("POST", /oauth\/token/, { json: { access_token: "neuf", refresh_token: "r2", expires_in: 7200 } });
  const p = new Pennylane(
    jetons(portes, reseau, "pennylane", { access_token: "vieux", refresh_token: "r1", expires_at: "2026-10-06T12:00:00Z" }),
    {},
    reseau.fetch,
    "https://pl.exemple/v2",
  );
  assertEquals(await p.journal("HA"), 7);
  const jeton = reseau.vers("POST", /oauth\/token/)[0];
  assert(jeton.corps!.includes("grant_type=refresh_token") && jeton.corps!.includes("refresh_token=r1") && jeton.corps!.includes("client_id=id-pl"));
  assertEquals(JSON.parse(portes.secretsPoses[0].secret).refresh_token, "r2");
  assertEquals(reseau.vers("GET", /\/journals/)[1].entetes.authorization, "Bearer neuf");
});

// ─── QuickBooks ──────────────────────────────────────────────────────────
function reseauQbo() {
  return new Reseau()
    .quand("GET", /\/query\?/, (a) => {
      const q = new URL(a.url).searchParams.get("query")!;
      if (q.startsWith("select Id from Account")) {
        const n = q.match(/'(.*)'/)![1];
        const ids: Record<string, string> = { "6061": "61", "44566": "66", "401": "33" };
        return { json: { QueryResponse: ids[n] ? { Account: [{ Id: ids[n] }] } : {} } };
      }
      if (q.startsWith("select Id from Vendor")) return { json: { QueryResponse: {} } };
      if (q.startsWith("select Id from JournalEntry")) return { json: { QueryResponse: { JournalEntry: [{ Id: "145" }] } } };
      return { statut: 400, texte: "requête inconnue" };
    })
    .quand("POST", /\/vendor\?/, { json: { Vendor: { Id: "58" } } })
    .quand("POST", /\/journalentry\?/, { json: { JournalEntry: { Id: "146" } } });
}

Deno.test("QuickBooks : écriture de journal idempotente (requestid), comptes par numéro, fournisseur créé", async () => {
  const portes = new PortesMemoire();
  const reseau = reseauQbo();
  const q = new QuickBooks(
    jetons(portes, reseau, "quickbooks", { access_token: "a", refresh_token: "r", expires_at: "2026-10-06T12:00:00Z" }),
    { realm_id: "9130", environnement: "sandbox" },
    reseau.fetch,
  );
  assertEquals(await q.envoyer(ecriture()), { idExterne: "146" });
  const post = reseau.vers("POST", /\/journalentry\?/)[0];
  assert(post.url.startsWith("https://sandbox-quickbooks.api.intuit.com/v3/company/9130/journalentry?minorversion=75&requestid=OMEGA-2026-HA-12"));
  const corps = JSON.parse(post.corps!);
  assertEquals(corps.DocNumber, "OMEGA-2026-HA-12");
  assertEquals(corps.TxnDate, "2026-10-06");
  assertEquals(
    corps.Line.map((l: { Amount: number; JournalEntryLineDetail: { PostingType: string; AccountRef: { value: string } } }) => [
      l.Amount,
      l.JournalEntryLineDetail.PostingType,
      l.JournalEntryLineDetail.AccountRef.value,
    ]),
    [[100, "Debit", "61"], [20, "Debit", "66"], [120, "Credit", "33"]],
  );
  assertEquals(corps.Line[2].JournalEntryLineDetail.Entity, { Type: "Vendor", EntityRef: { value: "58" } });
  assertEquals(JSON.parse(reseau.vers("POST", /\/vendor\?/)[0].corps!), { DisplayName: "Papeterie Delorme" });
});

Deno.test("QuickBooks : une reprise retrouve l'écriture par son numéro de document", async () => {
  const portes = new PortesMemoire();
  const reseau = reseauQbo();
  const q = new QuickBooks(jetons(portes, reseau, "quickbooks", { access_token: "a", refresh_token: "r", expires_at: "2026-10-06T12:00:00Z" }), {
    realm_id: "9130",
  }, reseau.fetch);
  assertEquals(await q.retrouver(ecriture(), null), { idExterne: "145" });
  assert(reseau.appels[0].url.startsWith("https://quickbooks.api.intuit.com/"), "production par défaut");
});

Deno.test("QuickBooks : jeton expiré renouvelé avant l'appel (Basic, refresh_token tournant)", async () => {
  const portes = new PortesMemoire();
  const reseau = reseauQbo().quand("POST", /oauth2\/v1\/tokens\/bearer/, { json: { access_token: "neuf", refresh_token: "r-suivant", expires_in: 3600 } });
  const q = new QuickBooks(jetons(portes, reseau, "quickbooks", { access_token: "a", refresh_token: "r", expires_at: "2026-10-06T10:00:30Z" }), {
    realm_id: "9130",
  }, reseau.fetch);
  await q.retrouver(ecriture(), null);
  const jeton = reseau.vers("POST", /tokens\/bearer/)[0];
  assertEquals(jeton.entetes.authorization, `Basic ${btoa("id-qbo:cle-qbo")}`);
  assertEquals(JSON.parse(portes.secretsPoses[0].secret).refresh_token, "r-suivant");
  assertEquals(reseau.vers("GET", /\/query\?/)[0].entetes.authorization, "Bearer neuf");
});

Deno.test("QuickBooks : un refus de renouvellement (invalid_grant) est une panne de jeton", async () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau().quand("POST", /tokens\/bearer/, { statut: 400, json: { error: "invalid_grant" } });
  const q = new QuickBooks(jetons(portes, reseau, "quickbooks", { access_token: "a", refresh_token: "r", expires_at: "2026-10-01T00:00:00Z" }), {
    realm_id: "9130",
  }, reseau.fetch);
  const err = await assertRejects(() => q.retrouver(ecriture(), null), ErreurEditeur);
  assertEquals(err.nature, "jeton");
});

Deno.test("QuickBooks : sans realm_id, la connexion est mal configurée", () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau();
  try {
    new QuickBooks(jetons(portes, reseau, "quickbooks", {}), {}, reseau.fetch);
    throw new Error("aurait dû échouer");
  } catch (e) {
    assertEquals((e as ErreurEditeur).nature, "configuration");
  }
  const doc = numeroDocument("OMEGA-2026-2027-HA-123456");
  assertEquals(doc.length, 21, "DocNumber : 21 caractères au plus");
  assert(doc.endsWith("HA-123456"), "le numéro d'écriture reste");
});

// ─── Cegid Loop ──────────────────────────────────────────────────────────
const ENV_LOOP = env({ CEGID_LOOP_URL: "https://loop.exemple/api", CEGID_LOOP_CHEMIN_IMPORT: "/imports/tra", CEGID_LOOP_CHEMIN_STATUT: "/imports/{id}" });

Deno.test("Cegid Loop : TRA étendu, en-tête ETE et zones obligatoires à leur place", () => {
  const t = traEtendu(ecriture(), "Société d'exemple", MAINTENANT()).split("\r\n");
  assert(t[0].startsWith("***S5CLIJRLETE"));
  const fournisseur = t[3];
  assertEquals(fournisseur.slice(0, 3), "HA ");
  assertEquals(fournisseur.slice(3, 11), "06102026");
  assertEquals(fournisseur.slice(11, 13), "FF");
  assertEquals(fournisseur.slice(30, 31), "X");
  assertEquals(fournisseur.slice(31, 48).trim(), "DEL-01");
  assertEquals(fournisseur.slice(129, 130), "C");
  assertEquals(fournisseur.slice(130, 150).trim(), "120,00");
  assertEquals(fournisseur.slice(172, 175), "E--");
  assertEquals(fournisseur.slice(222, 257).trim(), "OMEGA-2026-HA-12");
  assertEquals(fournisseur.slice(265, 273), "06102026");
  assertEquals(fournisseur.slice(301, 302), "N");
  assertEquals(fournisseur.slice(385, 386), "-");
  assertEquals(fournisseur.slice(1020, 1022), "AL");
  assertEquals(t[1].slice(1020, 1022), "RI");
});

Deno.test("Cegid Loop : fichier déposé, import demandé avec le dossier et l'adresse, statut suivi jusqu'au succès", async () => {
  const portes = new PortesMemoire();
  const depot = new DepotMemoire();
  const reseau = new Reseau()
    .quand("POST", /\/imports\/tra$/, { json: { accountingImportRequestId: "R-77" } })
    .quand("GET", /\/imports\/R-77$/, { json: { status: 2 } }, { json: { status: 3 } });
  const loop = new CegidLoop(
    jetons(portes, reseau, "cegid_loop", { api_key: "k", subscription_key: "s" }),
    { code_ibs: "DOS01" },
    ENV_LOOP,
    depot,
    CLIENT_BANC,
    reseau.fetch,
    MAINTENANT,
    {
      essais: 3,
      pauseMs: 0,
    },
  );
  assertEquals(await loop.envoyer(ecriture()), { idExterne: "loop:R-77" });
  assert(depot.fichiers.has(`${CLIENT_BANC}/filed_compta/cegid_loop/OMEGA-2026-HA-12.tra`));
  const post = reseau.vers("POST", /\/imports\/tra$/)[0];
  assertEquals(post.entetes["x-apikey"], "k");
  assertEquals(post.entetes["ocp-apim-subscription-key"], "s");
  assertEquals(JSON.parse(post.corps!).codeIbs, "DOS01");
  assert(JSON.parse(post.corps!).url.startsWith("https://depot.exemple/"));
});

Deno.test("Cegid Loop : une demande encore en cours est rendue en attente, puis suivie sans renvoi", async () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau()
    .quand("POST", /\/imports\/tra$/, { json: { accountingImportRequestId: 78 } })
    .quand("GET", /\/imports\/78$/, { json: { status: 1 } }, { json: { status: 1 } }, { json: { status: 4 } });
  const loop = new CegidLoop(
    jetons(portes, reseau, "cegid_loop", { api_key: "k", subscription_key: "s" }),
    { code_ibs: "DOS01" },
    ENV_LOOP,
    new DepotMemoire(),
    CLIENT_BANC,
    reseau.fetch,
    MAINTENANT,
    {
      essais: 2,
      pauseMs: 0,
    },
  );
  assertEquals(await loop.envoyer(ecriture()), { enAttente: "loop:78" });
  const err = await assertRejects(
    () => loop.retrouver(ecriture(), { etat: "en_cours", tentatives: 2, id_externe: "loop:78", commence_le: null }),
    ErreurEditeur,
  );
  assertEquals(err.nature, "definitif");
  assertEquals(reseau.vers("POST", /\/imports\/tra$/).length, 1);
});

Deno.test("Cegid Loop : sans l'adresse de l'API, la connexion est mal configurée", () => {
  const portes = new PortesMemoire();
  const reseau = new Reseau();
  try {
    new CegidLoop(jetons(portes, reseau, "cegid_loop", {}), { code_ibs: "D" }, env({}), new DepotMemoire(), CLIENT_BANC, reseau.fetch);
    throw new Error("aurait dû échouer");
  } catch (e) {
    assertEquals((e as ErreurEditeur).nature, "configuration");
  }
});
