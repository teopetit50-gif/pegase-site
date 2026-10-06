import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import {
  ErreurCdar,
  fabriquerCdar,
  lireCdar,
  PROFIL_CDV,
  type StatutAEmettre,
} from "./cdar.ts";

function statut(
  code: string,
  extra: Partial<StatutAEmettre> = {},
): StatutAEmettre {
  return {
    message: "msg-1",
    emis_le: "2026-10-06T14:30:05Z",
    code,
    facture: {
      numero: "FAC-2026-10-0471",
      date: "2026-10-01",
      emetteur_siren: "380129866",
    },
    emetteur: { siren: "842115763", nom: "Durand & Fils <banc>", role: "BY" },
    destinataire: { siren: "380129866", role: "SE" },
    ...extra,
  };
}

Deno.test("CDAR 210 : profil, horodatages, parties, facture, code et motif ; caractères échappés", () => {
  const xml = fabriquerCdar(
    statut("210", { motif: { code: "TX_TVA_ERR", texte: "Taux < 20 %" } }),
  );
  assertMatch(xml, new RegExp(`<ram:ID>${PROFIL_CDV}</ram:ID>`));
  assertMatch(
    xml,
    /<udt:DateTimeString format="204">20261006143005<\/udt:DateTimeString>/,
  );
  assertMatch(
    xml,
    /<ram:SenderTradeParty><ram:GlobalID schemeID="0002">842115763<\/ram:GlobalID><ram:Name>Durand &amp; Fils &lt;banc&gt;<\/ram:Name><ram:RoleCode>BY<\/ram:RoleCode>/,
  );
  assertMatch(xml, /<ram:TypeCode>23<\/ram:TypeCode>/);
  assertMatch(
    xml,
    /<ram:IssuerAssignedID>FAC-2026-10-0471<\/ram:IssuerAssignedID><ram:TypeCode>380<\/ram:TypeCode>/,
  );
  assertMatch(
    xml,
    /<qdt:DateTimeString format="102">20261001<\/qdt:DateTimeString>/,
  );
  assertMatch(
    xml,
    /<ram:ProcessConditionCode>210<\/ram:ProcessConditionCode><ram:ProcessCondition>Refusée<\/ram:ProcessCondition>/,
  );
  assertMatch(xml, /<ram:Reason>Taux &lt; 20 %<\/ram:Reason>/);
});

Deno.test("CDAR 212 : montant encaissé en caractéristique MEN", () => {
  const xml = fabriquerCdar(
    statut("212", { montant: { valeur: "118.80", devise: "EUR" } }),
  );
  assertMatch(
    xml,
    /<ram:TypeCode>MEN<\/ram:TypeCode><ram:ValueAmount currencyID="EUR">118.80<\/ram:ValueAmount>/,
  );
});

Deno.test("règles tenues avant fabrication", () => {
  assertThrows(() => fabriquerCdar(statut("299")), ErreurCdar, "inconnu");
  assertThrows(() => fabriquerCdar(statut("212")), ErreurCdar, "BR-FR-CDV-14");
  assertThrows(() => fabriquerCdar(statut("210")), ErreurCdar, "sans motif");
  assertThrows(
    () => fabriquerCdar(statut("205", { message: " " })),
    ErreurCdar,
    "BR-FR-CDV-03",
  );
  assertThrows(
    () =>
      fabriquerCdar(
        statut("205", {
          facture: {
            numero: "F",
            date: "01/10/2026",
            emetteur_siren: "380129866",
          },
        }),
      ),
    ErreurCdar,
    "date",
  );
  assertThrows(
    () =>
      fabriquerCdar(
        statut("205", { destinataire: { siren: "123", role: "SE" } }),
      ),
    ErreurCdar,
    "SIREN",
  );
});

Deno.test("lecture : notre propre CDAR se relit ; préfixes quelconques acceptés", () => {
  const lu = lireCdar(
    fabriquerCdar(statut("207", { motif: { code: "QTE_ERR" } })),
  );
  assertEquals(lu, {
    message: "msg-1",
    code: "207",
    libelle: "En litige",
    facture: "FAC-2026-10-0471",
    motif: "QTE_ERR",
  });
  const autre = lireCdar(
    `<a:CrossDomainAcknowledgementAndResponse><a:ExchangedDocument><b:ID>X</b:ID></a:ExchangedDocument><b:IssuerAssignedID>F1</b:IssuerAssignedID><b:ProcessConditionCode schemeID="x">213</b:ProcessConditionCode></a:CrossDomainAcknowledgementAndResponse>`,
  );
  assertEquals(autre.code, "213");
  assertEquals(autre.libelle, "Rejetée");
  assertEquals(autre.message, "X");
});

Deno.test("fournisseur étranger sans SIREN : n° de TVA intracommunautaire, schéma 0223 (UE) ou 0227 (hors UE)", () => {
  const allemand = fabriquerCdar(
    statut("207", {
      motif: { code: "TX_TVA_ERR" },
      facture: {
        numero: "BAC-0001",
        date: "2018-03-05",
        emetteur_siren: null,
        emetteur_tva: "DE 123 456 789",
      },
      destinataire: { tva: "de123456789", nom: "Lieferant GmbH", role: "SE" },
    }),
  );
  assertMatch(
    allemand,
    /<ram:RecipientTradeParty><ram:GlobalID schemeID="0223">DE123456789<\/ram:GlobalID><ram:Name>Lieferant GmbH<\/ram:Name><ram:RoleCode>SE<\/ram:RoleCode>/,
  );
  assertMatch(
    allemand,
    /<ram:IssuerTradeParty><ram:GlobalID schemeID="0223">DE123456789<\/ram:GlobalID><\/ram:IssuerTradeParty>/,
  );
  // Un n° de TVA FR rend son SIREN ; hors UE, 0227.
  assertMatch(
    fabriquerCdar(
      statut("205", { destinataire: { tva: "FR40380129866", role: "SE" } }),
    ),
    /<ram:RecipientTradeParty><ram:GlobalID schemeID="0002">380129866<\/ram:GlobalID>/,
  );
  assertMatch(
    fabriquerCdar(
      statut("205", { destinataire: { tva: "CHE123456789", role: "SE" } }),
    ),
    /<ram:RecipientTradeParty><ram:GlobalID schemeID="0227">CHE123456789<\/ram:GlobalID>/,
  );
});

Deno.test("partie sans SIREN ni TVA : erreur qui dit ce qui manque (et non « SIREN invalide : undefined »)", () => {
  assertThrows(
    () =>
      fabriquerCdar(
        statut("205", { destinataire: { nom: "Lieferant GmbH", role: "SE" } }),
      ),
    ErreurCdar,
    "le vendeur sans SIREN ni n° de TVA",
  );
  assertThrows(
    () =>
      fabriquerCdar(
        statut("205", { facture: { numero: "F", date: "2026-10-01" } }),
      ),
    ErreurCdar,
    "l'émetteur de la facture sans SIREN ni n° de TVA",
  );
});
