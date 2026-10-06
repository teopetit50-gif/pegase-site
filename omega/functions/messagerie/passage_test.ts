import { assert, assertEquals, assertMatch } from "@std/assert";
import { type Dependances, executerPassage } from "./passage.ts";
import {
  CLIENT,
  CONNEXION,
  ENVOI,
  envoiGmail,
  GmailDouble,
  journalMuet,
  PortesDouble,
  StockageDouble,
} from "./doubles.ts";

const MAINTENANT = new Date("2026-10-06T16:00:00Z");

function monter(avecGmail = true) {
  const portes = new PortesDouble();
  const g = new GmailDouble();
  const stockage = new StockageDouble();
  portes.jetonsParConnexion.set(CONNEXION, {
    acces: "acces-0",
    acces_expire_le: "2026-10-06T16:30:00Z",
    renouvellement: "renouv-0",
  });
  portes.actives = [{
    connexion: CONNEXION,
    client_id: CLIENT,
    fournisseur: "gmail",
    adresse: "compta@banc.test",
    etiquette: null,
    curseur: "100",
  }];
  const deps: Dependances = {
    portes,
    messageries: avecGmail ? { gmail: g } : {},
    stockage,
    pieces: stockage,
    ouvrier: "messagerie@test",
    journal: journalMuet,
    maintenant: () => MAINTENANT,
  };
  return { portes, g, stockage, deps };
}

const message = (id: string, extra = "") =>
  new TextEncoder().encode(
    `From: Client <client@exemple.test>\r\nTo: compta@banc.test\r\nSubject: Message ${id}\r\nMessage-ID: <${id}@exemple.test>\r\n${extra}Content-Type: text/plain; charset=utf-8\r\n\r\nBonjour ${id}`,
  ) as Uint8Array<ArrayBuffer>;

Deno.test("relève : messages déposés en réceptions (boîte = adresse connectée), curseur posé message par message", async () => {
  const a = monter();
  a.g.messages.set("g1", message("m1", "In-Reply-To: <omega-1@banc.test>\r\n"));
  a.g.messages.set("g2", message("m2"));
  a.g.historique = {
    messages: [{ id: "g1", curseur: "101" }, { id: "g2", curseur: "102" }],
    curseur: "110",
  };
  const bilan = await executerPassage(a.deps);
  assertEquals([bilan.recus, bilan.nouveaux], [2, 2]);
  const r = a.portes.receptions.get("<m1@exemple.test>")!;
  assertEquals([r.client, r.canal, r.boite, r.de, r.sujet, r.corps], [
    CLIENT,
    "email",
    "compta@banc.test",
    "client@exemple.test",
    "Message m1",
    "Bonjour m1",
  ]);
  assertEquals(r.detail.en_reponse_a, "<omega-1@banc.test>");
  assertEquals([r.detail.source, r.detail.id_fournisseur], ["gmail", "g1"]);
  assertEquals(a.portes.curseurs.get(CONNEXION), ["101", "102", "110"]);
  assertEquals(a.portes.battements[0].branchees, ["gmail"]);
  assertEquals(a.g.etiquettesDemandees, ["INBOX"]);
});

Deno.test("relève interrompue : le curseur s'arrête au dernier message déposé ; le passage suivant reprend sans doublon", async () => {
  const a = monter();
  for (const id of ["g1", "g2", "g3"]) a.g.messages.set(id, message(id));
  a.g.historique = {
    messages: [{ id: "g1", curseur: "101" }, { id: "g2", curseur: "102" }, {
      id: "g3",
      curseur: "103",
    }],
    curseur: "110",
  };
  a.portes.deposerEnPanneApres = 1;
  const b1 = await executerPassage(a.deps);
  assertEquals(b1.recus, 1);
  assertEquals(a.portes.curseurs.get(CONNEXION), ["101"]);
  assertMatch(b1.erreurs[0], /deposer_reception en panne/);
  a.portes.deposerEnPanneApres = null;
  const b2 = await executerPassage(a.deps);
  assertEquals([b2.recus, b2.nouveaux], [3, 2]);
});

Deno.test("pièces jointes déposées au bucket sous <client>/receptions/<message-id>/", async () => {
  const a = monter();
  a.g.messages.set(
    "g1",
    new TextEncoder().encode(
      'From: c@e.test\r\nMessage-ID: <p1@e.test>\r\nContent-Type: multipart/mixed; boundary="b"\r\n\r\n--b\r\nContent-Type: text/plain\r\n\r\nVoir pièce\r\n--b\r\nContent-Type: application/pdf; name="devis.pdf"\r\nContent-Disposition: attachment; filename="devis.pdf"\r\nContent-Transfer-Encoding: base64\r\n\r\nJVBERg==\r\n--b--\r\n',
    ) as Uint8Array<ArrayBuffer>,
  );
  a.g.historique = { messages: [{ id: "g1", curseur: "101" }], curseur: "101" };
  await executerPassage(a.deps);
  const r = a.portes.receptions.get("<p1@e.test>")!;
  assertEquals(r.pieces.map((p) => p.chemin), [
    `${CLIENT}/receptions/p1@e.test/devis.pdf`,
  ]);
  assert(a.stockage.objets.has(`${CLIENT}/receptions/p1@e.test/devis.pdf`));
});

Deno.test("jeton d'accès expiré : renouvelé et reposé ; jeton refusé : connexion « à reconnecter », rien relevé", async () => {
  const a = monter();
  a.portes.jetonsParConnexion.set(CONNEXION, {
    acces: "vieux",
    acces_expire_le: "2026-10-06T16:00:30Z",
    renouvellement: "renouv-0",
  });
  await executerPassage(a.deps);
  assertEquals(a.g.renouvellements, 1);
  assertEquals(
    a.portes.jetonsParConnexion.get(CONNEXION)!.acces,
    "acces-neuf-1",
  );

  const b = monter();
  b.portes.jetonsParConnexion.set(CONNEXION, {
    acces: null,
    acces_expire_le: null,
    renouvellement: "renouv-0",
  });
  b.g.renouvellementRefuse = true;
  const bilan = await executerPassage(b.deps);
  assertEquals(bilan.a_reconnecter, 1);
  assertMatch(b.portes.aReconnecterMotifs.get(CONNEXION)!, /JETON_REVOQUE/);
});

Deno.test("sans curseur : on part de maintenant (profil), sans importer l'historique ; historique expiré : curseur courant", async () => {
  const a = monter();
  a.portes.actives[0].curseur = null;
  a.g.historique = { messages: [{ id: "g1", curseur: "101" }], curseur: "101" };
  await executerPassage(a.deps);
  assertEquals(a.portes.receptions.size, 0);
  assertEquals(a.portes.curseurs.get(CONNEXION), ["500"]);

  const b = monter();
  b.g.historiquePerime = true;
  const bilan = await executerPassage(b.deps);
  assertEquals(b.portes.curseurs.get(CONNEXION), ["500"]);
  assertMatch(bilan.erreurs[0], /historique expiré/);
});

Deno.test("brouillon : fabriqué depuis l'envoi, déposé dans la messagerie, envoi confirmé avec la référence du brouillon", async () => {
  const a = monter();
  a.stockage.objets.set(`${CLIENT}/factures/f.pdf`, {
    octets: new TextEncoder().encode("%PDF"),
    typeMime: "application/pdf",
  });
  a.portes.envois.set(
    ENVOI,
    envoiGmail({
      pieces: [{
        id: "p1",
        chemin: `${CLIENT}/factures/f.pdf`,
        nom: "facture.pdf",
        mime: "application/pdf",
      }],
    }),
  );
  a.portes.travaux = [{
    id: 1,
    genre: "envois.gmail",
    charge: { envoi: ENVOI },
  }];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.brouillons, 1);
  assertEquals(a.g.brouillons[0].acces, "acces-0");
  const brut = a.g.brouillons[0].brut;
  assertMatch(brut, /^From: =\?UTF-8\?B\?[^?]+\?= <compta@banc\.test>/m);
  assertMatch(brut, /^To: =\?UTF-8\?B\?[^?]+\?= <client@exemple\.test>/m);
  assertMatch(brut, /^X-Omega-Envoi: 55555555-5555-4555-8555-555555555555/m);
  assertMatch(brut, /filename="facture\.pdf"/);
  assertEquals(a.portes.confirmes.get(ENVOI), "gmail:brouillon:r-1");
  assertEquals(a.portes.finis.get(1)!.brouillon, true);
});

Deno.test("brouillon refusé : santé vers un fournisseur non agréé, connexion absente ; Gmail non branché : reporté", async () => {
  const cas = [
    [
      envoiGmail({ donnees_sante: true, fournisseur_hds: false }),
      /^SANTE_FOURNISSEUR_NON_HDS/,
      true,
    ],
    [
      envoiGmail({
        expediteur: {
          identite: "c@b.test",
          nom_affiche: null,
          repondre_a: null,
          parametres: {},
          secret: false,
        },
      }),
      /^CONNEXION_ABSENTE/,
      true,
    ],
    [envoiGmail({ fournisseur: "brevo" }), /^FOURNISSEUR_INATTENDU/, true],
  ] as const;
  for (const [e, attendu, definitif] of cas) {
    const a = monter();
    a.portes.envois.set(ENVOI, e);
    a.portes.travaux = [{
      id: 2,
      genre: "envois.gmail",
      charge: { envoi: ENVOI },
    }];
    await executerPassage(a.deps);
    assertEquals(a.g.brouillons.length, 0);
    assertMatch(a.portes.echoues.get(ENVOI)!.erreur, attendu);
    assertEquals(a.portes.echoues.get(ENVOI)!.definitif, definitif);
  }
  const b = monter(false);
  b.portes.envois.set(ENVOI, envoiGmail());
  b.portes.travaux = [{
    id: 3,
    genre: "envois.gmail",
    charge: { envoi: ENVOI },
  }];
  const bilan = await executerPassage(b.deps);
  assertEquals(bilan.reportes, 1);
  assertMatch(b.portes.echoues.get(ENVOI)!.erreur, /^MESSAGERIE_NON_BRANCHEE/);
  assertEquals(b.portes.battements[0].branchees, []);
});

Deno.test("révocation : Vault vidé par la porte, jeton révoqué chez Google", async () => {
  const a = monter();
  a.portes.travaux = [{
    id: 4,
    genre: "messagerie.revoquer",
    charge: { connexion: CONNEXION },
  }];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.revoques, 1);
  assertEquals(a.portes.oubliees, [CONNEXION]);
  assertEquals(a.g.revoques, ["renouv-0"]);
});

Deno.test("Microsoft : relève du dossier inbox, jeton de renouvellement tourné reposé au Vault, référence microsoft:brouillon", async () => {
  const a = monter(false);
  const ms = new GmailDouble("microsoft");
  a.deps.messageries = { microsoft: ms };
  a.portes.actives[0].fournisseur = "microsoft";
  a.portes.jetonsParConnexion.set(CONNEXION, {
    acces: null,
    acces_expire_le: null,
    renouvellement: "renouv-0",
  });
  ms.messages.set("x1", message("x1"));
  ms.historique = {
    messages: [{ id: "x1", curseur: "https://graph.microsoft.com/p1" }],
    curseur: "https://graph.microsoft.com/delta1",
  };
  a.portes.envois.set(ENVOI, envoiGmail({ fournisseur: "microsoft" }));
  a.portes.travaux = [{
    id: 5,
    genre: "envois.microsoft",
    charge: { envoi: ENVOI },
  }];
  const bilan = await executerPassage(a.deps);
  assertEquals([bilan.brouillons, bilan.recus], [1, 1]);
  assertEquals(a.portes.confirmes.get(ENVOI), "microsoft:brouillon:r-1");
  assertEquals(ms.etiquettesDemandees, ["inbox"]);
  assertEquals(
    a.portes.jetonsParConnexion.get(CONNEXION)!.renouvellement,
    "renouv-tourne-1",
  );
  assertEquals(
    a.portes.receptions.get("<x1@exemple.test>")!.detail.source,
    "microsoft",
  );
  assertEquals(a.portes.battements[0].branchees, ["microsoft"]);
});

Deno.test("Microsoft : un envoi gmail sous un travail envois.microsoft est refusé ; Microsoft non branché : reporté", async () => {
  const a = monter();
  a.deps.messageries = { gmail: a.g, microsoft: new GmailDouble("microsoft") };
  a.portes.envois.set(ENVOI, envoiGmail());
  a.portes.travaux = [{
    id: 6,
    genre: "envois.microsoft",
    charge: { envoi: ENVOI },
  }];
  await executerPassage(a.deps);
  assertMatch(a.portes.echoues.get(ENVOI)!.erreur, /^FOURNISSEUR_INATTENDU/);
  assertEquals(a.g.brouillons.length, 0);

  const b = monter();
  b.portes.envois.set(ENVOI, envoiGmail({ fournisseur: "microsoft" }));
  b.portes.travaux = [{
    id: 7,
    genre: "envois.microsoft",
    charge: { envoi: ENVOI },
  }];
  const bilan = await executerPassage(b.deps);
  assertEquals(bilan.reportes, 1);
  assertMatch(b.portes.echoues.get(ENVOI)!.erreur, /^MESSAGERIE_NON_BRANCHEE/);
  assertEquals(b.portes.echoues.get(ENVOI)!.definitif, false);
});

Deno.test("révocation Microsoft : Vault vidé, aucun appel distant (le client retire l'autorisation de son compte)", async () => {
  const a = monter(false);
  const ms = new GmailDouble("microsoft");
  a.deps.messageries = { microsoft: ms };
  a.portes.fournisseurOublie = "microsoft";
  a.portes.travaux = [{
    id: 8,
    genre: "messagerie.revoquer",
    charge: { connexion: CONNEXION },
  }];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.revoques, 1);
  assertEquals(a.portes.oubliees, [CONNEXION]);
  assertEquals(ms.revoques, []);
  assertEquals(a.portes.finis.get(8), {
    revoquee: true,
    fournisseur: "microsoft",
    chez_le_fournisseur: false,
  });
});
