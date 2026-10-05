import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  BrevoDouble,
  envoiExemple,
  journalMemoire,
  PortesDouble,
  StockageDouble,
  travailExemple,
} from "./doubles.ts";
import {
  composerEmail,
  composerSms,
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

const ENVOI = "11111111-1111-4111-8111-111111111111";
const SMS = "44444444-4444-4444-8444-444444444444";

function monter(opts: { brevo?: BrevoDouble | null } = {}) {
  const portes = new PortesDouble();
  const brevo = opts.brevo === undefined ? new BrevoDouble() : opts.brevo;
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  return {
    portes,
    brevo,
    stockage,
    journal,
    deps: { portes, brevo, stockage, ouvrier: "test", journal },
  };
}

Deno.test("passage à vide : aucun travail, mais battre_ouvrier est appelé", async () => {
  const { portes, deps } = monter();
  const bilan = await executerPassage(deps);
  assertEquals(bilan.pris, 0);
  assertEquals(portes.battements.length, 1);
  assertEquals(portes.battements[0].module, MODULE);
  assertEquals(portes.battements[0].genres, [...GENRES]);
  assertEquals(portes.appels[0].porte, "prendreTravaux");
  assertEquals(portes.appels[0].args[0], ["envois.brevo", "envois.brevo_sms"]);
});

Deno.test("e-mail remis : Brevo reçoit l'expéditeur, le destinataire, le sujet, le corps, le tag ; finir_travail porte fournisseur_id et remis_a", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(ENVOI, envoiExemple());
  portes.travaux = [travailExemple(1, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(brevo!.emails.length, 1);
  const m = brevo!.emails[0];
  assertEquals(m.sender, {
    email: "essais@omegaai.fr",
    name: "Omega — essais",
  });
  assertEquals(m.to, [{
    email: "destinataire@exemple.test",
    name: "Destinataire Test",
  }]);
  assertEquals(m.subject, "Relance de facture");
  assertEquals(m.textContent, "Bonjour,\n\nVotre facture est en attente.");
  assertEquals(m.htmlContent, undefined);
  assertEquals(m.replyTo, { email: "reponses@omegaai.fr" });
  assert(m.tags!.includes(`envoi:${ENVOI}`));
  assertEquals(m.headers!["X-Omega-Envoi"], ENVOI);
  assertEquals(portes.finis.get(1), {
    fournisseur_id: "<1@smtp-relay.mailin.fr>",
    remis_a: "destinataire@exemple.test",
  });
  assertEquals(portes.echoues.size, 0);
});

Deno.test("e-mail HTML avec pièce jointe : la pièce est lue dans le bucket et encodée en base64", async () => {
  const { portes, brevo, stockage, deps } = monter();
  stockage.objets.set(
    "22222222-2222-4222-8222-222222222222/pieces/facture.pdf",
    new TextEncoder().encode("%PDF-1.4 test"),
  );
  portes.envois.set(
    ENVOI,
    envoiExemple({
      corps: "<p>Bonjour,</p><p>Votre facture est jointe.</p>",
      pieces: [{
        id: "p1",
        nom: "facture.pdf",
        type_mime: "application/pdf",
        taille: 13,
        chemin: "22222222-2222-4222-8222-222222222222/pieces/facture.pdf",
      }],
    }),
  );
  portes.travaux = [travailExemple(2, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  const m = brevo!.emails[0];
  assertEquals(
    m.htmlContent,
    "<p>Bonjour,</p><p>Votre facture est jointe.</p>",
  );
  assertEquals(m.attachment, [{
    name: "facture.pdf",
    content: btoa("%PDF-1.4 test"),
  }]);
});

Deno.test("pièce illisible : travail repris, rien n'est envoyé", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    ENVOI,
    envoiExemple({
      pieces: [{
        id: "p1",
        nom: "x.pdf",
        type_mime: "application/pdf",
        taille: null,
        chemin: "absent.pdf",
      }],
    }),
  );
  portes.travaux = [travailExemple(3, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.repris, 1);
  assertEquals(brevo!.emails.length, 0);
  assertEquals(portes.echoues.get(3)!.reprendre, true);
});

Deno.test("SMS remis : numéro normalisé, émetteur alphanumérique, type transactionnel, tag", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    SMS,
    envoiExemple({
      id: SMS,
      canal: "sms",
      sujet: null,
      corps: "Votre rendez-vous est confirmé demain à 9h.",
      destinataire: {
        adresse: "+33 6 12 34 56 78",
        nom: null,
        langue: "fr",
        fuseau: "Europe/Paris",
        territoire: "FR",
      },
      expediteur: {
        id: "e",
        identite: "+33700000000",
        nom_affiche: "Omega",
        repondre_a: null,
        fournisseur: "brevo_sms",
        parametres: {},
      },
    }),
  );
  portes.travaux = [travailExemple(4, "envois.brevo_sms", SMS)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  const s = brevo!.sms[0];
  assertEquals(s.recipient, "33612345678");
  assertEquals(s.sender, "Omega");
  assertEquals(s.type, "transactional");
  assertEquals(s.tag, `envoi:${SMS}`);
  assertEquals(s.unicodeEnabled, false);
  assertEquals(portes.finis.get(4), {
    fournisseur_id: "1001",
    remis_a: "+33 6 12 34 56 78",
  });
});

Deno.test("BREVO_API_KEY absente : échec NON définitif FOURNISSEUR_NON_BRANCHE, journal explicite, battement signale fournisseur non branché", async () => {
  const { portes, journal, deps } = monter({ brevo: null });
  portes.envois.set(ENVOI, envoiExemple());
  portes.travaux = [travailExemple(5, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.repris, 1);
  const e = portes.echoues.get(5)!;
  assertEquals(e.reprendre, true);
  assertMatch(e.erreur, /^FOURNISSEUR_NON_BRANCHE/);
  assert(journal.lignes.some((l) => l.includes("BREVO_API_KEY absente")));
  assertEquals(
    (portes.battements[0].detail as Record<string, unknown>)
      .fournisseur_branche,
    false,
  );
});

Deno.test("envoi déjà remis (reference_externe renseignée) : le travail est fini sans ré-émission", async () => {
  const { portes, brevo, deps } = monter();
  portes.envois.set(
    ENVOI,
    envoiExemple({
      statut: "envoye",
      reference_externe: "<deja@smtp-relay.mailin.fr>",
    }),
  );
  portes.travaux = [travailExemple(6, "envois.brevo", ENVOI)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.deja_remis, 1);
  assertEquals(brevo!.emails.length, 0);
  assertEquals(portes.finis.get(6), {
    fournisseur_id: "<deja@smtp-relay.mailin.fr>",
    remis_a: "destinataire@exemple.test",
  });
});

Deno.test("envoi introuvable, charge invalide, statut non prêt, canal incohérent : échecs définitifs", async () => {
  const { portes, brevo, deps } = monter();
  const annule = "55555555-5555-4555-8555-555555555555";
  const sms = "66666666-6666-4666-8666-666666666666";
  portes.envois.set(annule, envoiExemple({ id: annule, statut: "annule" }));
  portes.envois.set(sms, envoiExemple({ id: sms, canal: "sms" }));
  portes.travaux = [
    travailExemple(7, "envois.brevo", "77777777-7777-4777-8777-777777777777"),
    { id: 8, genre: "envois.brevo", charge: { autre: 1 } },
    travailExemple(9, "envois.brevo", annule),
    travailExemple(10, "envois.brevo", sms),
  ];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.echecs, 4);
  assertEquals(brevo!.emails.length, 0);
  assertMatch(portes.echoues.get(7)!.erreur, /^ENVOI_INTROUVABLE/);
  assertMatch(portes.echoues.get(8)!.erreur, /^CHARGE_INVALIDE/);
  assertMatch(portes.echoues.get(9)!.erreur, /^ENVOI_NON_PRET/);
  assertMatch(portes.echoues.get(10)!.erreur, /^CANAL_INCOHERENT/);
  for (const id of [7, 8, 9, 10]) {
    assertEquals(portes.echoues.get(id)!.reprendre, false);
  }
});

Deno.test("Brevo répond 400 : échec définitif ; 503 : repris", async () => {
  const a = monter();
  a.brevo!.erreur = new ErreurBrevo(
    400,
    '{"code":"invalid_parameter","message":"email is invalid"}',
    true,
  );
  a.portes.envois.set(ENVOI, envoiExemple());
  a.portes.travaux = [travailExemple(11, "envois.brevo", ENVOI)];
  await executerPassage(a.deps);
  assertEquals(a.portes.echoues.get(11)!.reprendre, false);
  assertMatch(a.portes.echoues.get(11)!.erreur, /^BREVO_400/);

  const b = monter();
  b.brevo!.erreur = new ErreurBrevo(503, "indisponible", false);
  b.portes.envois.set(ENVOI, envoiExemple());
  b.portes.travaux = [travailExemple(12, "envois.brevo", ENVOI)];
  await executerPassage(b.deps);
  assertEquals(b.portes.echoues.get(12)!.reprendre, true);
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
  portes.envois.set(bon, envoiExemple({ id: bon }));
  portes.travaux = [
    travailExemple(13, "envois.brevo", "99999999-9999-4999-8999-999999999999"),
    travailExemple(14, "envois.brevo", bon),
  ];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.echecs, 1);
  assertEquals(bilan.remis, 1);
  assertEquals(brevo!.emails.length, 1);
});

Deno.test("composerEmail : repondre_a de l'envoi prime sur celui de l'expéditeur", () => {
  const m = composerEmail(
    envoiExemple({ repondre_a: "autre@exemple.test" }),
    [],
  );
  assertEquals(m.replyTo, { email: "autre@exemple.test" });
});

Deno.test("composerSms : accents → unicode ; sans nom affiché → numéro", () => {
  const s = composerSms(envoiExemple({
    canal: "sms",
    corps: "Rendez-vous – 9h au cœur de ville",
    expediteur: {
      id: "e",
      identite: "+33700000000",
      nom_affiche: null,
      repondre_a: null,
      fournisseur: "brevo_sms",
      parametres: {},
    },
  }));
  assertEquals(s.unicodeEnabled, true);
  assertEquals(s.sender, "33700000000");
});

Deno.test("outils Brevo : html, numéro, émetteur, base64", () => {
  assert(corpsEstHtml("<html><body>x</body></html>"));
  assert(corpsEstHtml("Bonjour <b>vous</b>, voir <a href='x'>ici</a>"));
  assert(!corpsEstHtml("Bonjour, a < b et c > d"));
  assertEquals(normaliserNumeroSms("06 12 34 56 78"), "33612345678");
  assertEquals(normaliserNumeroSms("0033612345678"), "33612345678");
  assertEquals(normaliserNumeroSms("+41 79 123 45 67"), "41791234567");
  assertEquals(emetteurSms("Omega — essais", "+33700000000"), "Omegaessais");
  assertEquals(emetteurSms("Ω", "+33700000000"), "33700000000");
  assert(!necessiteUnicode("Bonjour, RDV demain 9h @ l'agence"));
  assert(!necessiteUnicode("Confirmé à 9h, déjà réglé"));
  assert(necessiteUnicode("cœur"));
  assert(necessiteUnicode("tiret – long"));
  assertEquals(versBase64(new Uint8Array([104, 105])), "aGk=");
});
