import { assert, assertEquals, assertMatch } from "@std/assert";
import { executerPassage } from "./passage.ts";
import { ErreurPA } from "./pa.ts";
import type { StatutAEmettre } from "./cdar.ts";
import {
  CLIENT,
  FACTURE,
  fluxReleve,
  journalMuet,
  PlateformeDouble,
  PortesDouble,
  STATUT,
  StockageDouble,
  travail,
} from "./doubles.ts";

const CHEMIN = `${CLIENT}/factures/F-2026-0001.pdf`;

function monter(avecPa = true) {
  const portes = new PortesDouble();
  const pa = new PlateformeDouble();
  const stockage = new StockageDouble();
  stockage.objets.set(CHEMIN, {
    octets: new TextEncoder().encode("%PDF-facture") as Uint8Array<ArrayBuffer>,
    typeMime: "application/pdf",
  });
  const deps = {
    portes,
    pa: avecPa ? pa : null,
    stockage,
    ouvrier: "echange-pa@test",
    journal: journalMuet,
    attente: () => Promise.resolve(),
  };
  return { portes, pa, stockage, deps };
}

function depotAFaire() {
  return {
    deposer: true as const,
    facture: FACTURE,
    client_id: CLIENT,
    suivi: FACTURE,
    nom: "F-2026-0001.pdf",
    syntaxe: "Factur-X" as const,
    profil: "Extended-CTC-FR",
    regle: "B2B",
    chemin: CHEMIN,
  };
}

function cdar(
  code: string,
  extra: Partial<StatutAEmettre> = {},
): StatutAEmettre {
  return {
    message: STATUT,
    emis_le: "2026-10-06T14:30:05Z",
    code,
    facture: {
      numero: "FAC-2026-10-0471",
      date: "2026-10-01",
      type_code: "380",
      emetteur_siren: "380129866",
    },
    emetteur: { siren: "842115763", nom: "Client du banc", role: "BY" },
    destinataire: { siren: "380129866", nom: "Orange", role: "SE" },
    ...extra,
  };
}

Deno.test("passage à vide : bat, même sans PA (pa_branchee false)", async () => {
  const a = monter();
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.pris, 0);
  assertEquals(a.portes.battements[0].pa_branchee, true);
  const b = monter(false);
  await executerPassage(b.deps);
  assertEquals(b.portes.battements[0].pa_branchee, false);
});

Deno.test("facture émise : lue au bucket, déposée avec son trackingId, notée, travail fini", async () => {
  const a = monter();
  a.portes.depots.set(FACTURE, depotAFaire());
  a.portes.travaux = [travail(1, "pa.deposer", { facture: FACTURE })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.deposes, 1);
  assertEquals(a.pa.depots.length, 1);
  assertEquals(a.pa.depots[0].suivi, FACTURE);
  assertEquals(a.pa.depots[0].syntaxe, "Factur-X");
  assertEquals(a.pa.depots[0].typeMime, "application/pdf");
  assertEquals(new TextDecoder().decode(a.pa.depots[0].octets), "%PDF-facture");
  assertEquals(a.portes.notesDepot.get(FACTURE), "flux-1");
  assertEquals(a.portes.finis.get(1)!.flux, "flux-1");
  assertEquals(a.portes.finis.get(1)!.note, true);
});

Deno.test("refus du socle : rien n'est déposé, le travail finit avec la réponse", async () => {
  const a = monter();
  a.portes.depots.set(FACTURE, { deposer: false, statut: "deja_deposee" });
  a.portes.travaux = [travail(2, "pa.deposer", { facture: FACTURE })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.non_faits, 1);
  assertEquals(a.pa.depots.length, 0);
  assertEquals(a.portes.finis.get(2)!.statut, "deja_deposee");
});

Deno.test("PA non branchée : dépôt reporté (jamais un échec définitif)", async () => {
  const a = monter(false);
  a.portes.depots.set(FACTURE, depotAFaire());
  a.portes.travaux = [travail(3, "pa.deposer", { facture: FACTURE })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.reportes, 1);
  assertEquals(a.portes.echecs.get(FACTURE)!.definitif, false);
  assertMatch(a.portes.echecs.get(FACTURE)!.erreur, /^PA_NON_BRANCHEE/);
  assertEquals(a.portes.finis.get(3)!.reporte, true);
});

Deno.test("PA 422 : échec définitif ; 503 et 401 : reportés", async () => {
  for (
    const [statut, definitif] of [[422, true], [503, false], [
      401,
      false,
    ]] as const
  ) {
    const a = monter();
    a.pa.erreur = new ErreurPA(
      statut,
      `dépôt : HTTP ${statut}`,
      statut === 422,
    );
    a.portes.depots.set(FACTURE, depotAFaire());
    a.portes.travaux = [travail(4, "pa.deposer", { facture: FACTURE })];
    await executerPassage(a.deps);
    assertEquals(
      a.portes.echecs.get(FACTURE)!.definitif,
      definitif,
      `HTTP ${statut}`,
    );
    assertMatch(
      a.portes.echecs.get(FACTURE)!.erreur,
      new RegExp(`^PA_${statut}`),
    );
    assertEquals(a.portes.finis.get(4)![definitif ? "echec" : "reporte"], true);
  }
});

Deno.test("fichier absent du bucket : reporté", async () => {
  const a = monter();
  a.portes.depots.set(FACTURE, { ...depotAFaire(), chemin: "ailleurs.pdf" });
  a.portes.travaux = [travail(5, "pa.deposer", { facture: FACTURE })];
  await executerPassage(a.deps);
  assertEquals(a.portes.echecs.get(FACTURE)!.definitif, false);
  assertEquals(a.pa.depots.length, 0);
});

Deno.test("accepté par la PA mais pa_noter_depot en panne : travail fini note=false, le relevé rapproche par le trackingId", async () => {
  const a = monter();
  a.portes.noterEnPanne = 3;
  a.portes.depots.set(FACTURE, depotAFaire());
  a.portes.travaux = [travail(6, "pa.deposer", { facture: FACTURE })];
  a.pa.aRelever = [
    fluxReleve({
      flux: "flux-1",
      maj_le: "2026-10-06T10:00:01Z",
      sens: "sortant",
      suivi: FACTURE,
      type: "CustomerInvoice",
    }),
  ];
  await executerPassage(a.deps);
  assertEquals(a.pa.depots.length, 1);
  assertEquals(a.portes.finis.get(6)!.note, false);
  assertEquals(a.portes.notesDepot.size, 0);
  const note = [...a.portes.flux.values()][0];
  assertEquals(note.suivi, FACTURE);
  assertEquals(note.sens, "sortant");
  assertEquals(
    note.chemin,
    null,
    "un accusé de nos dépôts ne se télécharge pas",
  );
});

Deno.test("rejeu d'un dépôt : la PA rend le même flux (trackingId), un seul dépôt", async () => {
  const a = monter();
  a.portes.depots.set(FACTURE, depotAFaire());
  a.portes.travaux = [travail(7, "pa.deposer", { facture: FACTURE })];
  await executerPassage(a.deps);
  a.portes.travaux = [travail(8, "pa.deposer", { facture: FACTURE })];
  await executerPassage(a.deps);
  assertEquals(a.pa.depots.length, 1);
  assertEquals(a.portes.finis.get(8)!.flux, "flux-1");
});

Deno.test("statut 210 depuis les champs : CDAR fabriqué et déposé (syntaxe CDAR), noté", async () => {
  const a = monter();
  a.portes.statuts.set(STATUT, {
    envoyer: true,
    statut: STATUT,
    client_id: CLIENT,
    suivi: STATUT,
    cdar: cdar("210", {
      motif: { code: "TX_TVA_ERR", texte: "Taux de TVA erroné" },
    }),
  });
  a.portes.travaux = [travail(9, "pa.statut", { statut: STATUT })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.statuts, 1);
  const d = a.pa.depots[0];
  assertEquals(d.syntaxe, "CDAR");
  assertEquals(d.nom, `cdar-${STATUT}.xml`);
  const xml = new TextDecoder().decode(d.octets);
  assertMatch(xml, /<ram:ProcessConditionCode>210<\/ram:ProcessConditionCode>/);
  assertMatch(xml, /<ram:ReasonCode>TX_TVA_ERR<\/ram:ReasonCode>/);
  assertEquals(a.portes.notesStatut.get(STATUT), "flux-1");
});

Deno.test("statut émis par une plateforme (213) ou 212 sans montant : échec définitif, rien n'est déposé", async () => {
  for (
    const [code, attendu] of [["213", /^STATUT_NON_EMIS_PAR_L_ENTREPRISE/], [
      "212",
      /^CDAR_INVALIDE/,
    ]] as const
  ) {
    const a = monter();
    a.portes.statuts.set(STATUT, {
      envoyer: true,
      statut: STATUT,
      client_id: CLIENT,
      suivi: STATUT,
      cdar: cdar(code),
    });
    a.portes.travaux = [travail(10, "pa.statut", { statut: STATUT })];
    await executerPassage(a.deps);
    assertEquals(a.pa.depots.length, 0, code);
    assertEquals(a.portes.echecs.get(STATUT)!.definitif, true, code);
    assertMatch(a.portes.echecs.get(STATUT)!.erreur, attendu);
  }
});

Deno.test("statut avec CDAR tout fait au bucket : déposé tel quel", async () => {
  const a = monter();
  const cheminCdar = `${CLIENT}/cdar/${STATUT}.xml`;
  a.stockage.objets.set(cheminCdar, {
    octets: new TextEncoder().encode("<cdar/>") as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.portes.statuts.set(STATUT, {
    envoyer: true,
    statut: STATUT,
    client_id: CLIENT,
    suivi: STATUT,
    chemin: cheminCdar,
  });
  a.portes.travaux = [travail(11, "pa.statut", { statut: STATUT })];
  await executerPassage(a.deps);
  assertEquals(new TextDecoder().decode(a.pa.depots[0].octets), "<cdar/>");
});

Deno.test("charge sans uuid : échec du travail, aucune porte pa_* appelée", async () => {
  const a = monter();
  a.portes.travaux = [travail(12, "pa.deposer", { facture: "pas-un-uuid" })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.echecs, 1);
  assertEquals(a.portes.finis.get(12)!.echec, true);
  assertEquals(a.portes.echecs.size, 0);
});

Deno.test("relevé : facture reçue et CDAR reçu déposés au bucket, notés, curseur posé ; second passage idempotent", async () => {
  const a = monter();
  const cdarRecu =
    `<rsm:CrossDomainAcknowledgementAndResponse><rsm:ExchangedDocument><ram:ID>M-9</ram:ID></rsm:ExchangedDocument>` +
    `<ram:IssuerAssignedID>F-77</ram:IssuerAssignedID><ram:ProcessConditionCode>205</ram:ProcessConditionCode></rsm:CrossDomainAcknowledgementAndResponse>`;
  a.pa.documents.set("in-1", {
    octets: new TextEncoder().encode("<Invoice/>") as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.pa.documents.set("in-2", {
    octets: new TextEncoder().encode(cdarRecu) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.pa.aRelever = [
    fluxReleve({
      flux: "in-1",
      maj_le: "2026-10-06T10:00:00Z",
      nom: "facture fournisseur.xml",
    }),
    fluxReleve({
      flux: "in-2",
      maj_le: "2026-10-06T10:05:00Z",
      syntaxe: "CDAR",
      type: "CustomerInvoiceLC",
    }),
  ];
  const b1 = await executerPassage(a.deps);
  assertEquals(b1.releves, 2);
  assertEquals(b1.nouveaux, 2);
  assert(a.stockage.objets.has("_pa/entrants/in-1/facture_fournisseur.xml"));
  const facture = a.portes.flux.get("pa:in-1:2026-10-06T10:00:00Z:ok")!;
  assertEquals(facture.chemin, "_pa/entrants/in-1/facture_fournisseur.xml");
  assertEquals(facture.sha256?.length, 64);
  const statut = a.portes.flux.get("pa:in-2:2026-10-06T10:05:00Z:ok")!;
  assertEquals((statut.detail.cdar as Record<string, unknown>).code, "205");
  assertEquals((statut.detail.cdar as Record<string, unknown>).facture, "F-77");
  assertEquals(a.portes.curseurActuel, "2026-10-06T10:05:00Z");

  const b2 = await executerPassage(a.deps);
  assertEquals(
    a.pa.depuisDemandes[1]?.toISOString(),
    "2026-10-06T10:04:59.000Z",
    "curseur moins une seconde",
  );
  assertEquals(b2.releves, 1);
  assertEquals(b2.nouveaux, 0, "pa_noter_flux idempotente sur la clé");
});

Deno.test("relevé interrompu : s'arrête au flux qui tombe, curseur posé au dernier noté, rien n'est sauté", async () => {
  const a = monter();
  for (const f of ["in-1", "in-2", "in-3"]) {
    a.pa.documents.set(f, {
      octets: new TextEncoder().encode("<Invoice/>") as Uint8Array<ArrayBuffer>,
      typeMime: "application/xml",
    });
  }
  a.pa.aRelever = [
    fluxReleve({ flux: "in-1", maj_le: "2026-10-06T10:00:00Z" }),
    fluxReleve({ flux: "in-2", maj_le: "2026-10-06T10:01:00Z" }),
    fluxReleve({ flux: "in-3", maj_le: "2026-10-06T10:02:00Z" }),
  ];
  a.portes.fluxEnPanne = "in-2";
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.releves, 1);
  assertMatch(bilan.erreur_releve!, /in-2/);
  assertEquals(a.portes.curseurActuel, "2026-10-06T10:00:00Z");
  a.portes.fluxEnPanne = null;
  const b2 = await executerPassage(a.deps);
  assertEquals(
    b2.releves,
    3,
    "in-1 relu (curseur moins une seconde), sans effet",
  );
  assertEquals(b2.nouveaux, 2);
  assertEquals(a.portes.curseurActuel, "2026-10-06T10:02:00Z");
});

const UBL_BANC =
  `<Invoice xmlns:cac="urn:cac" xmlns:cbc="urn:cbc"><cbc:ID>FAC-2026-10-0471</cbc:ID>` +
  `<cac:AccountingSupplierParty><cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID="0002">380129866</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>` +
  `<cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID="0002">842115763</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty></Invoice>`;

Deno.test("statut au format a4_18 (code et montant en nombres) : CDAR 212 fabriqué, nommé par l'id du statut", async () => {
  const a = monter();
  a.portes.statuts.set(STATUT, {
    envoyer: true,
    statut: 212,
    client_id: CLIENT,
    suivi: STATUT,
    cdar: {
      ...cdar("212"),
      code: 212 as unknown as string,
      montant: { valeur: 118.8 as unknown as string, devise: "EUR" },
    },
  });
  a.portes.travaux = [travail(20, "pa.statut", { statut: STATUT })];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.statuts, 1);
  assertEquals(a.pa.depots[0].nom, `cdar-${STATUT}.xml`);
  const xml = new TextDecoder().decode(a.pa.depots[0].octets);
  assertMatch(xml, /<ram:ProcessConditionCode>212<\/ram:ProcessConditionCode>/);
  assertMatch(xml, /currencyID="EUR">118.8<\/ram:ValueAmount>/);
});

Deno.test("facture reçue, acheteur connu : SIREN lu, fichier copié au chemin cible, pa_deposer_facture appelée", async () => {
  const a = monter();
  a.portes.clientsParSiren.set("842115763", CLIENT);
  a.pa.documents.set("in-1", {
    octets: new TextEncoder().encode(UBL_BANC) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.pa.aRelever = [
    fluxReleve({
      flux: "in-1",
      maj_le: "2026-10-06T16:00:00Z",
      nom: "FAC-2026-10-0471.xml",
    }),
  ];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.factures_recues, 1);
  const note = [...a.portes.flux.values()][0];
  assertEquals(note.detail.acheteur_siren, "842115763");
  const cible = `${CLIENT}/filed_document/doc-1/FAC-2026-10-0471.xml`;
  assertEquals(
    new TextDecoder().decode(a.stockage.objets.get(cible)!.octets),
    UBL_BANC,
  );
  assertEquals(
    a.portes.facturesDeposees.get("1"),
    new TextEncoder().encode(UBL_BANC).length,
  );
  assertEquals(a.portes.battements[0].factures_recues, 1);
});

Deno.test("facture reçue, acheteur inconnu : orpheline, rien n'est copié ni déposé, le relevé continue", async () => {
  const a = monter();
  a.pa.documents.set("in-1", {
    octets: new TextEncoder().encode(UBL_BANC) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.pa.aRelever = [
    fluxReleve({ flux: "in-1", maj_le: "2026-10-06T16:00:00Z" }),
  ];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.orphelins, 1);
  assertEquals(a.portes.facturesDeposees.size, 0);
  assertEquals(a.portes.curseurActuel, "2026-10-06T16:00:00Z");
});

Deno.test("pa_deposer_facture en panne : relevé arrêté, curseur gardé ; au passage suivant, même clé → rattache → déposée", async () => {
  const a = monter();
  a.portes.clientsParSiren.set("842115763", CLIENT);
  a.portes.deposerFactureEnPanne = 1;
  a.pa.documents.set("in-1", {
    octets: new TextEncoder().encode(UBL_BANC) as Uint8Array<ArrayBuffer>,
    typeMime: "application/xml",
  });
  a.pa.aRelever = [
    fluxReleve({ flux: "in-1", maj_le: "2026-10-06T16:00:00Z" }),
  ];
  const b1 = await executerPassage(a.deps);
  assertMatch(b1.erreur_releve!, /pa_deposer_facture en panne/);
  assertEquals(a.portes.curseurActuel, null);
  const b2 = await executerPassage(a.deps);
  assertEquals(b2.factures_recues, 1);
  assertEquals(b2.nouveaux, 0);
  assertEquals(a.portes.facturesDeposees.size, 1);
  assertEquals(a.portes.curseurActuel, "2026-10-06T16:00:00Z");
});

Deno.test("battement : nom de module admis par battements.module (sans tiret)", async () => {
  const { MODULE } = await import("./passage.ts");
  assertMatch(MODULE, /^[a-z][a-z_]{1,29}$/);
});
