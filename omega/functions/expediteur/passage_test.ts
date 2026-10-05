import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  BrevoDouble,
  CLIENT,
  ENVOI,
  envoiExemple,
  journalMemoire,
  PortesDouble,
  StockageDouble,
  travailExemple,
} from "./doubles.ts";
import {
  composerEmail,
  composerSms,
  type Dependances,
  executerPassage,
  GENRES,
  MODULE,
} from "./passage.ts";
import {
  corpsEstHtml,
  emetteurSms,
  ErreurBrevo,
  necessiteUnicode,
  normaliserNumeroSms,
} from "./brevo.ts";
import { versBase64 } from "./stockage.ts";

const SMS = "44444444-4444-4444-8444-444444444444";

function monter(opts: { cleEnvironnement?: string | null } = {}) {
  const portes = new PortesDouble();
  const brevo = new BrevoDouble();
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  const deps: Dependances = {
    portes,
    brevoPour: (cle) => {
      brevo.cles.push(cle);
      return brevo;
    },
    cleEnvironnement: opts.cleEnvironnement === undefined
      ? "cle-env-test"
      : opts.cleEnvironnement,
    stockage,
    ouvrier: "test",
    journal,
    attente: () => Promise.resolve(),
    maintenant: () => new Date("2026-10-05T10:00:00Z"),
  };
  return { portes, brevo, stockage, journal, deps };
}

Deno.test("passage à vide : aucun travail, mais battre_ouvrier est appelé", async () => {
  const { portes, deps } = monter();
  const bilan = await executerPassage(deps);
  assertEquals(bilan.pris, 0);
  assertEquals(portes.battements.length, 1);
  assertEquals(portes.battements[0].module, MODULE);
  assertEquals(portes.battements[0].genres, [...GENRES]);
  assertEquals(portes.appels[0].porte, "prendreTravaux");
  assertEquals(portes.appels[0].args[0], [
    "envois.brevo",
    "envois.brevo_sms",
    "envois.confirmer",
  ]);
});

Deno.test("e-mail remis : commencer_envoi → Brevo → confirmer_envoi(messageId) → finir_travail {fournisseur_id, remis_a}", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(ENVOI, envoiExemple());
  portes.travaux = [travailExemple(1, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(brevo.emails.length, 1);
  const m = brevo.emails[0];
  assertEquals(m.sender, {
    email: "relances@client.test",
    name: "Client Test",
  });
  assertEquals(m.to, [{
    email: "destinataire@exemple.test",
    name: "Destinataire Test",
  }]);
  assertEquals(m.subject, "Relance de facture");
  assertEquals(m.textContent, "Bonjour,\n\nVotre facture est en attente.");
  assertEquals(m.htmlContent, undefined);
  assertEquals(m.replyTo, { email: "reponses@client.test" });
  assert(m.tags!.includes(`envoi:${ENVOI}`));
  assertEquals(m.headers!["X-Omega-Envoi"], ENVOI);
  assertEquals(brevo.cles, ["cle-env-test"]);
  assertEquals(portes.confirmes.get(ENVOI), "<1@smtp-relay.mailin.fr>");
  assertEquals(portes.finis.get(1), {
    fournisseur_id: "<1@smtp-relay.mailin.fr>",
    remis_a: "2026-10-05T10:00:00.000Z",
  });
  assertEquals(portes.envoisEchoues.size, 0);
  assertEquals(
    portes.appels.map((a) => a.porte),
    [
      "prendreTravaux",
      "commencerEnvoi",
      "confirmerEnvoi",
      "finirTravail",
      "battreOuvrier",
    ],
  );
});

Deno.test("expéditeur avec secret : la clé vient de secret_expediteur, pas de l'environnement", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    ENVOI,
    envoiExemple({
      expediteur: {
        identite: "a@b.test",
        nom_affiche: null,
        repondre_a: null,
        parametres: {},
        secret: true,
      },
    }),
  );
  portes.secrets.set(ENVOI, "cle-du-coffre");
  portes.travaux = [travailExemple(1, "envois.brevo", ENVOI)];
  await executerPassage(deps);
  assertEquals(brevo.cles, ["cle-du-coffre"]);
  assert(portes.appels.some((a) => a.porte === "secretExpediteur"));
});

Deno.test("e-mail HTML avec pièce jointe : la pièce est lue dans le bucket et encodée en base64", async () => {
  const { portes, brevo, stockage, deps } = monter();
  stockage.objets.set(
    "c1/pieces/facture.pdf",
    new TextEncoder().encode("%PDF-1.4 test"),
  );
  portes.envois.set(
    ENVOI,
    envoiExemple({
      corps: "<p>Bonjour,</p><p>Votre facture est jointe.</p>",
      pieces: [{
        id: "p1",
        nom: "facture.pdf",
        mime: "application/pdf",
        octets: 13,
        chemin: "c1/pieces/facture.pdf",
      }],
    }),
  );
  portes.travaux = [travailExemple(2, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  const m = brevo.emails[0];
  assertEquals(
    m.htmlContent,
    "<p>Bonjour,</p><p>Votre facture est jointe.</p>",
  );
  assertEquals(m.attachment, [{
    name: "facture.pdf",
    content: btoa("%PDF-1.4 test"),
  }]);
});

Deno.test("pièce illisible : envoi reporté (echouer_envoi non définitif), travail fini {reporte}, rien n'est envoyé", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    ENVOI,
    envoiExemple({
      pieces: [{
        id: "p1",
        nom: "x.pdf",
        mime: "application/pdf",
        chemin: "absent.pdf",
      }],
    }),
  );
  portes.travaux = [travailExemple(3, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.reportes, 1);
  assertEquals(brevo.emails.length, 0);
  assertEquals(portes.envoisEchoues.get(ENVOI)!.definitif, false);
  assertMatch(portes.envoisEchoues.get(ENVOI)!.erreur, /^PIECE_ILLISIBLE/);
  assertEquals(portes.finis.get(3)!.reporte, true);
});

Deno.test("SMS remis : numéro normalisé, émetteur alphanumérique, type transactionnel, tag ; référence = messageId Brevo", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    SMS,
    envoiExemple({
      envoi: SMS,
      canal: "sms",
      fournisseur: "brevo_sms",
      sujet: null,
      corps: "Votre rendez-vous est confirmé demain à 9h.",
      destinataire: {
        adresse: "+33 6 12 34 56 78",
        nom: null,
        langue: "fr",
        professionnel: false,
      },
      expediteur: {
        identite: "+33700000000",
        nom_affiche: "Omega",
        repondre_a: null,
        parametres: {},
        secret: false,
      },
    }),
  );
  portes.travaux = [travailExemple(4, "envois.brevo_sms", SMS)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  const s = brevo.sms[0];
  assertEquals(s.recipient, "33612345678");
  assertEquals(s.sender, "Omega");
  assertEquals(s.type, "transactional");
  assertEquals(s.tag, `envoi:${SMS}`);
  assertEquals(s.unicodeEnabled, false);
  assertEquals(portes.confirmes.get(SMS), "1001");
  assertEquals(portes.finis.get(4)!.fournisseur_id, "1001");
});

Deno.test("mode essai : commencer_envoi a déjà réécrit l'envoi en e-mail d'essai ; on l'envoie tel quel avec le tag mode:essai", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    SMS,
    envoiExemple({
      envoi: SMS,
      mode: "essai",
      canal: "email",
      sujet: "[ESSAI] Votre rendez-vous",
      destinataire: {
        adresse: "essais@client.test",
        nom: null,
        langue: "fr",
        professionnel: true,
      },
      expediteur: {
        identite: "essais@omegaai.fr",
        nom_affiche: "Omega — essais",
        repondre_a: null,
        parametres: {},
        secret: false,
      },
    }),
  );
  portes.travaux = [travailExemple(5, "envois.brevo_sms", SMS)];
  await executerPassage(deps);
  assertEquals(brevo.sms.length, 0);
  assertEquals(brevo.emails[0].to[0].email, "essais@client.test");
  assert(brevo.emails[0].tags!.includes("mode:essai"));
});

Deno.test("BREVO_API_KEY absente et pas de secret : envoi reporté FOURNISSEUR_NON_BRANCHE, journal explicite, battement le signale", async () => {
  const { portes, brevo, journal, deps } = monter({ cleEnvironnement: null });
  portes.envois.set(ENVOI, envoiExemple());
  portes.travaux = [travailExemple(6, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.reportes, 1);
  assertEquals(brevo.emails.length, 0);
  const e = portes.envoisEchoues.get(ENVOI)!;
  assertEquals(e.definitif, false);
  assertMatch(e.erreur, /^FOURNISSEUR_NON_BRANCHE/);
  assertEquals(portes.finis.get(6)!.reporte, true);
  assert(journal.lignes.some((l) => l.includes("BREVO_API_KEY absente")));
  assertEquals(
    (portes.battements[0].detail as Record<string, unknown>).cle_environnement,
    false,
  );
});

Deno.test("commencer_envoi refuse (differe, bloque, introuvable, fournisseur_change) : finir_travail avec la réponse, rien n'est envoyé", async () => {
  const { portes, brevo, deps } = monter();
  const differe = "55555555-5555-4555-8555-555555555555";
  const bloque = "66666666-6666-4666-8666-666666666666";
  const change = "77777777-7777-4777-8777-777777777777";
  portes.envois.set(differe, {
    envoyer: false,
    statut: "differe",
    reprise_le: "2026-10-06T08:00:00Z",
  });
  portes.envois.set(bloque, {
    envoyer: false,
    statut: "bloque",
    verrou: "opposition",
    motif: "désinscription",
  });
  portes.envois.set(change, {
    envoyer: false,
    statut: "pret",
    motif: "fournisseur_change",
  });
  portes.travaux = [
    travailExemple(7, "envois.brevo", differe),
    travailExemple(8, "envois.brevo", bloque),
    travailExemple(9, "envois.brevo", change),
    travailExemple(10, "envois.brevo", "88888888-8888-4888-8888-888888888888"),
  ];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.non_envoyes, 4);
  assertEquals(brevo.emails.length, 0);
  assertEquals(portes.finis.get(7), {
    envoyer: false,
    statut: "differe",
    reprise_le: "2026-10-06T08:00:00Z",
  });
  assertEquals(portes.finis.get(8)!.statut, "bloque");
  assertEquals(portes.finis.get(9)!.motif, "fournisseur_change");
  assertEquals(portes.finis.get(10)!.statut, "introuvable");
  assertEquals(portes.envoisEchoues.size, 0);
  assertEquals(portes.travauxEchoues.size, 0);
});

Deno.test("charge sans uuid : echouer_travail définitif, commencer_envoi n'est pas appelé", async () => {
  const { portes, deps } = monter();
  portes.travaux = [{ id: 11, genre: "envois.brevo", charge: { autre: 1 } }];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.echecs, 1);
  assertMatch(portes.travauxEchoues.get(11)!.erreur, /^CHARGE_INVALIDE/);
  assertEquals(portes.travauxEchoues.get(11)!.reprendre, false);
  assert(!portes.appels.some((a) => a.porte === "commencerEnvoi"));
});

Deno.test("canal whatsapp ou expéditeur absent : échec définitif de l'envoi, travail fini {echec}", async () => {
  const { portes, brevo, deps } = monter();
  const wa = "99999999-9999-4999-8999-999999999999";
  portes.envois.set(wa, envoiExemple({ envoi: wa, canal: "whatsapp" }));
  portes.travaux = [travailExemple(12, "envois.brevo", wa)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.echecs, 1);
  assertEquals(brevo.emails.length, 0);
  assertEquals(portes.envoisEchoues.get(wa)!.definitif, true);
  assertMatch(
    portes.envoisEchoues.get(wa)!.erreur,
    /^CANAL_NON_PRIS_EN_CHARGE/,
  );
  assertEquals(portes.finis.get(12)!.echec, true);
});

Deno.test("Brevo répond 400 : échec définitif de l'envoi ; 503 : reporté", async () => {
  const a = monter();
  a.brevo.erreur = new ErreurBrevo(
    400,
    '{"code":"invalid_parameter","message":"email is invalid"}',
    true,
  );
  a.portes.envois.set(ENVOI, envoiExemple());
  a.portes.travaux = [travailExemple(13, "envois.brevo", ENVOI)];
  await executerPassage(a.deps);
  assertEquals(a.portes.envoisEchoues.get(ENVOI)!.definitif, true);
  assertMatch(a.portes.envoisEchoues.get(ENVOI)!.erreur, /^BREVO_400/);
  assertEquals(a.portes.confirmes.size, 0);

  const b = monter();
  b.brevo.erreur = new ErreurBrevo(503, "indisponible", false);
  b.portes.envois.set(ENVOI, envoiExemple());
  b.portes.travaux = [travailExemple(14, "envois.brevo", ENVOI)];
  await executerPassage(b.deps);
  assertEquals(b.portes.envoisEchoues.get(ENVOI)!.definitif, false);
  assertEquals(b.portes.finis.get(14)!.reporte, true);
});

Deno.test("confirmer_envoi tombe deux fois puis passe : l'envoi n'est jamais ré-émis", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(ENVOI, envoiExemple());
  portes.pannesRestantes.confirmerEnvoi = 2;
  portes.travaux = [travailExemple(15, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(brevo.emails.length, 1);
  assertEquals(
    portes.appels.filter((a) => a.porte === "confirmerEnvoi").length,
    3,
  );
  assertEquals(portes.confirmes.get(ENVOI), "<1@smtp-relay.mailin.fr>");
  assertEquals(portes.finis.get(15)!.confirme, undefined);
});

Deno.test("confirmer_envoi tombe trois fois : Brevo a accepté, rapprochement envois.confirmer déposé (clé confirmer:<envoi>), travail fini avec confirme:false", async () => {
  const { portes, journal, deps } = monter();
  portes.envois.set(ENVOI, envoiExemple());
  portes.panne.confirmerEnvoi = new Error("porte hors service");
  portes.travaux = [travailExemple(16, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(portes.finis.get(16)!.confirme, false);
  assertEquals(portes.finis.get(16)!.rapprochement, 901);
  assertEquals(portes.envoisEchoues.size, 0);
  assertEquals(portes.deposes, [{
    id: 901,
    client: CLIENT,
    module: "expediteur",
    genre: "envois.confirmer",
    charge: { envoi: ENVOI, reference: "<1@smtp-relay.mailin.fr>" },
    cle: `confirmer:${ENVOI}`,
    priorite: 1,
  }]);
  assert(journal.lignes.some((l) => l.includes("NON CONFIRMÉ")));
});

Deno.test("rapprochement impossible (travail sans client_id, ou deposer_travail en panne) : rapprochement null, journal d'alerte, jamais de ré-émission", async () => {
  const a = monter();
  a.portes.envois.set(ENVOI, envoiExemple());
  a.portes.panne.confirmerEnvoi = new Error("porte hors service");
  a.portes.travaux = [travailExemple(20, "envois.brevo", ENVOI, null)];
  await executerPassage(a.deps);
  assertEquals(a.portes.finis.get(20)!.rapprochement, null);
  assertEquals(a.portes.deposes.length, 0);
  assert(a.journal.lignes.some((l) => l.includes("RAPPROCHEMENT IMPOSSIBLE")));
  assertEquals(a.brevo.emails.length, 1);

  const b = monter();
  b.portes.envois.set(ENVOI, envoiExemple());
  b.portes.panne.confirmerEnvoi = new Error("porte hors service");
  b.portes.panne.deposerTravail = new Error("porte hors service");
  b.portes.travaux = [travailExemple(21, "envois.brevo", ENVOI)];
  await executerPassage(b.deps);
  assertEquals(b.portes.finis.get(21)!.rapprochement, null);
  assert(b.journal.lignes.some((l) => l.includes("RAPPROCHEMENT IMPOSSIBLE")));
});

Deno.test("travail envois.confirmer : rejoue confirmer_envoi sans commencer_envoi ni Brevo, finit {confirme:true}", async () => {
  const { portes, brevo, deps } = monter();
  portes.travaux = [{
    id: 22,
    genre: "envois.confirmer",
    charge: { envoi: ENVOI, reference: "<9@smtp-relay.mailin.fr>" },
    cle: `confirmer:${ENVOI}`,
    client_id: CLIENT,
  }];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.confirmes, 1);
  assertEquals(portes.confirmes.get(ENVOI), "<9@smtp-relay.mailin.fr>");
  assertEquals(portes.finis.get(22), {
    confirme: true,
    fournisseur_id: "<9@smtp-relay.mailin.fr>",
  });
  assertEquals(brevo.emails.length, 0);
  assert(!portes.appels.some((a) => a.porte === "commencerEnvoi"));
  assertEquals(
    (portes.battements[0].detail as Record<string, unknown>).confirmes,
    1,
  );
});

Deno.test("travail envois.confirmer : porte encore en panne → repris ; charge sans reference → échec définitif", async () => {
  const a = monter();
  a.portes.panne.confirmerEnvoi = new Error("toujours en panne");
  a.portes.travaux = [{
    id: 23,
    genre: "envois.confirmer",
    charge: { envoi: ENVOI, reference: "<9@x>" },
    client_id: CLIENT,
  }];
  const bilan = await executerPassage(a.deps);
  assertEquals(bilan.reportes, 1);
  assertEquals(a.portes.travauxEchoues.get(23)!.reprendre, true);
  assertMatch(
    a.portes.travauxEchoues.get(23)!.erreur,
    /^CONFIRMATION_EN_ATTENTE/,
  );

  const b = monter();
  b.portes.travaux = [{
    id: 24,
    genre: "envois.confirmer",
    charge: { envoi: ENVOI },
    client_id: CLIENT,
  }];
  await executerPassage(b.deps);
  assertEquals(b.portes.travauxEchoues.get(24)!.reprendre, false);
  assertMatch(b.portes.travauxEchoues.get(24)!.erreur, /^CHARGE_INVALIDE/);
  assertEquals(b.portes.confirmes.size, 0);
});

Deno.test("commencer_envoi en panne : echouer_travail avec reprise, rien d'autre ne bouge", async () => {
  const { portes, deps } = monter();
  portes.panne.commencerEnvoi = new Error("porte hors service");
  portes.travaux = [travailExemple(17, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.reportes, 1);
  assertEquals(portes.travauxEchoues.get(17)!.reprendre, true);
  assertEquals(portes.finis.size, 0);
});

Deno.test("prendre_travaux en panne : le passage ne plante pas et bat quand même", async () => {
  const { portes, deps } = monter();
  portes.panne.prendreTravaux = new Error("porte hors service");
  const bilan = await executerPassage(deps);
  assertEquals(bilan.pris, 0);
  assertEquals(portes.battements.length, 1);
});

Deno.test("un travail en erreur n'empêche pas les suivants", async () => {
  const { portes, brevo, deps } = monter();
  const bon = "88888888-8888-4888-8888-888888888888";
  portes.envois.set(bon, envoiExemple({ envoi: bon }));
  portes.travaux = [
    { id: 18, genre: "envois.brevo", charge: {} },
    travailExemple(19, "envois.brevo", bon),
  ];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.echecs, 1);
  assertEquals(bilan.remis, 1);
  assertEquals(brevo.emails.length, 1);
});

Deno.test("composerEmail : repondre_a de l'envoi prime sur celui de l'expéditeur", () => {
  const m = composerEmail(
    envoiExemple({ repondre_a: "autre@exemple.test" }),
    [],
  );
  assertEquals(m.replyTo, { email: "autre@exemple.test" });
});

Deno.test("composerSms : caractère hors GSM-7 → unicode ; sans nom affiché → numéro", () => {
  const s = composerSms(envoiExemple({
    canal: "sms",
    corps: "Rendez-vous – 9h au cœur de ville",
    expediteur: {
      identite: "+33700000000",
      nom_affiche: null,
      repondre_a: null,
      parametres: {},
      secret: false,
    },
  }));
  assertEquals(s.unicodeEnabled, true);
  assertEquals(s.sender, "33700000000");
});

Deno.test("outils Brevo : html, numéro, émetteur, GSM-7, base64", () => {
  assert(corpsEstHtml("<html><body>x</body></html>"));
  assert(corpsEstHtml("Bonjour <b>vous</b>, voir <a href='x'>ici</a>"));
  assert(!corpsEstHtml("Bonjour, a < b et c > d"));
  assertEquals(normaliserNumeroSms("06 12 34 56 78"), "33612345678");
  assertEquals(normaliserNumeroSms("0033612345678"), "33612345678");
  assertEquals(normaliserNumeroSms("+41 79 123 45 67"), "41791234567");
  assertEquals(emetteurSms("Omega — essais", "+33700000000"), "Omegaessais");
  assertEquals(emetteurSms("Ω", "+33700000000"), "33700000000");
  assert(!necessiteUnicode("Confirmé à 9h, déjà réglé"));
  assert(necessiteUnicode("cœur"));
  assert(necessiteUnicode("tiret – long"));
  assertEquals(versBase64(new Uint8Array([104, 105])), "aGk=");
});
