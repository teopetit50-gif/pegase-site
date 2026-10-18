// Passage de l'expéditeur sur les canaux whatsapp (meta_whatsapp) et lre (ar24).
import { assert, assertEquals, assertMatch } from "@std/assert";
import {
  Ar24Double,
  BrevoDouble,
  envoiExemple,
  journalMemoire,
  PortesDouble,
  StockageDouble,
  travailExemple,
  WhatsAppDouble,
} from "./doubles.ts";
import {
  composerLre,
  composerWhatsApp,
  type Dependances,
  executerPassage,
  lireModeleExterne,
} from "./passage.ts";
import { ErreurMeta } from "./meta.ts";
import { ErreurAr24 } from "./ar24.ts";
import type { EnvoiAEnvoyer } from "./portes.ts";

const WA = "55555555-5555-4555-8555-555555555555";
const LRE = "66666666-6666-4666-8666-666666666666";

function monter(opts: { jetonMeta?: string | null; ar24?: boolean } = {}) {
  const portes = new PortesDouble();
  const wa = new WhatsAppDouble();
  const ar24 = new Ar24Double();
  const stockage = new StockageDouble();
  const journal = journalMemoire();
  const deps: Dependances = {
    portes,
    brevoPour: () => new BrevoDouble(),
    cleEnvironnement: "cle-brevo",
    stockage,
    ouvrier: "test",
    journal,
    attente: () => Promise.resolve(),
    maintenant: () => new Date("2026-10-11T10:00:00Z"),
    whatsappPour: (jeton, pnid) => {
      wa.fabriques.push([jeton, pnid]);
      return wa;
    },
    jetonMeta: opts.jetonMeta === undefined ? "jeton-env" : opts.jetonMeta,
    ar24Pour: (acces) => {
      ar24.acces.push(acces);
      return ar24;
    },
    accesAr24: opts.ar24 === false
      ? null
      : { token: "t-env", clePrivee: "k-env" },
  };
  return { portes, wa, ar24, stockage, journal, deps };
}

function envoiWa(partiel: Partial<EnvoiAEnvoyer> = {}): EnvoiAEnvoyer {
  return envoiExemple({
    envoi: WA,
    cle: WA,
    canal: "whatsapp",
    fournisseur: "meta_whatsapp",
    expediteur: {
      identite: "+33 1 23 45 67 89",
      nom_affiche: "Client Test",
      repondre_a: null,
      parametres: { phone_number_id: "10987" },
      secret: false,
    },
    destinataire: {
      adresse: "06 12 34 56 78",
      nom: "Élodie",
      langue: "fr",
      professionnel: false,
    },
    sujet: null,
    corps: "Votre rendez-vous est confirmé.",
    ...partiel,
  });
}

function envoiLre(partiel: Partial<EnvoiAEnvoyer> = {}): EnvoiAEnvoyer {
  return envoiExemple({
    envoi: LRE,
    cle: LRE,
    canal: "lre",
    fournisseur: "ar24",
    expediteur: {
      identite: "relances@client.test",
      nom_affiche: "Client Test",
      repondre_a: null,
      parametres: { id_utilisateur: 4242 },
      secret: false,
    },
    sujet: "Mise en demeure",
    corps: "Mise en demeure de payer la facture F-12.",
    ...partiel,
  });
}

Deno.test("WhatsApp texte : phone_number_id de l'expéditeur, jeton d'environnement, numéro normalisé, référence = wamid", async () => {
  const { portes, wa, deps } = monter();
  portes.envois.set(WA, envoiWa());
  portes.travaux = [travailExemple(1, "envois.meta_whatsapp", WA)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(wa.fabriques, [["jeton-env", "10987"]]);
  assertEquals(wa.messages[0], {
    to: "33612345678",
    type: "text",
    text: { body: "Votre rendez-vous est confirmé.", preview_url: false },
  });
  assertEquals(portes.confirmes.get(WA), "wamid.1");
  assertEquals(portes.finis.get(1)!.fournisseur_id, "wamid.1");
  assertEquals(
    (portes.battements[0].detail as Record<string, unknown>).whatsapp_branche,
    true,
  );
});

Deno.test("WhatsApp modèle : nom, langue, variables du corps, pièce en en-tête document ; jeton du coffre", async () => {
  const { portes, wa, stockage, deps } = monter();
  portes.envois.set(
    WA,
    envoiWa({
      expediteur: { ...envoiWa().expediteur, secret: true },
      modele_externe: "relance_facture",
      langue: "fr",
      parametres_modele: { corps: ["F-12", "120,00 €"] },
      pieces: [{
        id: "p1",
        chemin: "c/f12.pdf",
        nom: "F-12.pdf",
        mime: "application/pdf",
      }],
    }),
  );
  portes.secrets.set(WA, "jeton-coffre");
  stockage.objets.set("c/f12.pdf", new Uint8Array([37, 80, 68, 70]));
  portes.travaux = [travailExemple(2, "envois.meta_whatsapp", WA)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(wa.fabriques[0][0], "jeton-coffre");
  assertEquals(wa.medias, [{
    nom: "F-12.pdf",
    mime: "application/pdf",
    octets: 4,
  }]);
  assertEquals(wa.messages[0], {
    to: "33612345678",
    type: "template",
    template: {
      name: "relance_facture",
      language: { code: "fr" },
      components: [
        {
          type: "header",
          parameters: [{
            type: "document",
            document: { id: "media-1", filename: "F-12.pdf" },
          }],
        },
        {
          type: "body",
          parameters: [{ type: "text", text: "F-12" }, {
            type: "text",
            text: "120,00 €",
          }],
        },
      ],
    },
  });
});

Deno.test("WhatsApp : sans jeton → reporté FOURNISSEUR_NON_BRANCHE ; sans phone_number_id ou deux pièces → échec définitif", async () => {
  const a = monter({ jetonMeta: null });
  a.portes.envois.set(WA, envoiWa());
  a.portes.travaux = [travailExemple(3, "envois.meta_whatsapp", WA)];
  assertEquals((await executerPassage(a.deps)).reportes, 1);
  assertMatch(
    a.portes.envoisEchoues.get(WA)!.erreur,
    /^FOURNISSEUR_NON_BRANCHE/,
  );
  assertEquals(a.portes.envoisEchoues.get(WA)!.definitif, false);
  assertEquals(
    (a.portes.battements[0].detail as Record<string, unknown>).whatsapp_branche,
    false,
  );

  const b = monter();
  b.portes.envois.set(
    WA,
    envoiWa({ expediteur: { ...envoiWa().expediteur, parametres: {} } }),
  );
  b.portes.travaux = [travailExemple(4, "envois.meta_whatsapp", WA)];
  assertEquals((await executerPassage(b.deps)).echecs, 1);
  assertMatch(
    b.portes.envoisEchoues.get(WA)!.erreur,
    /^PHONE_NUMBER_ID_ABSENT/,
  );

  const c = monter();
  const p = { id: "p", chemin: "x", nom: "x.pdf", mime: "application/pdf" };
  c.portes.envois.set(WA, envoiWa({ pieces: [p, { ...p, id: "q" }] }));
  c.portes.travaux = [travailExemple(5, "envois.meta_whatsapp", WA)];
  assertEquals((await executerPassage(c.deps)).echecs, 1);
  assertMatch(c.portes.envoisEchoues.get(WA)!.erreur, /^PIECES_WHATSAPP/);
  assertEquals(c.wa.messages.length, 0);
});

Deno.test("WhatsApp : Meta 131047 (hors fenêtre) → échec définitif META_400_131047 ; 130429 → reporté", async () => {
  for (const [code, definitif] of [[131047, true], [130429, false]] as const) {
    const { portes, wa, deps } = monter();
    wa.erreur = new ErreurMeta(
      400,
      code,
      `{"error":{"code":${code}}}`,
      definitif,
    );
    portes.envois.set(WA, envoiWa());
    portes.travaux = [travailExemple(6, "envois.meta_whatsapp", WA)];
    await executerPassage(deps);
    assertEquals(portes.envoisEchoues.get(WA)!.definitif, definitif);
    assertMatch(
      portes.envoisEchoues.get(WA)!.erreur,
      new RegExp(`^META_400_${code}`),
    );
  }
});

Deno.test("canal whatsapp par un autre fournisseur que meta_whatsapp : échec définitif", async () => {
  const { portes, wa, deps } = monter();
  portes.envois.set(WA, envoiWa({ fournisseur: "brevo_sms" }));
  portes.travaux = [travailExemple(7, "envois.meta_whatsapp", WA)];
  assertEquals((await executerPassage(deps)).echecs, 1);
  assertMatch(
    portes.envoisEchoues.get(WA)!.erreur,
    /^CANAL_NON_PRIS_EN_CHARGE/,
  );
  assertEquals(wa.fabriques.length, 0);
});

Deno.test("composerWhatsApp : components passés tels quels ; pièce sans modèle → document en légende ; légende trop longue refusée", () => {
  const comp = [{ type: "body", parameters: [{ type: "text", text: "x" }] }];
  const m = composerWhatsApp(
    envoiWa({
      modele_externe: "m",
      langue: null,
      parametres_modele: { components: comp },
    }),
    null,
  );
  assertEquals(m, {
    to: "33612345678",
    type: "template",
    template: { name: "m", language: { code: "fr" }, components: comp },
  });
  assertEquals(composerWhatsApp(envoiWa(), { id: "M", nom: "a.pdf" }), {
    to: "33612345678",
    type: "document",
    document: {
      id: "M",
      filename: "a.pdf",
      caption: "Votre rendez-vous est confirmé.",
    },
  });
  let code = "";
  try {
    composerWhatsApp(envoiWa({ corps: "x".repeat(1025) }), {
      id: "M",
      nom: "a.pdf",
    });
  } catch (e) {
    code = String(e);
  }
  assertMatch(code, /TEXTE_TROP_LONG/);
});

Deno.test("LRE : pièces téléversées pour l'utilisateur AR24, professionnel → to_company, référence = id AR24", async () => {
  const { portes, ar24, stockage, deps } = monter();
  portes.envois.set(
    LRE,
    envoiLre({
      pieces: [{
        id: "p1",
        chemin: "c/med.pdf",
        nom: "med.pdf",
        mime: "application/pdf",
      }],
    }),
  );
  stockage.objets.set("c/med.pdf", new Uint8Array([1, 2]));
  portes.travaux = [travailExemple(8, "envois.ar24", LRE)];
  const bilan = await executerPassage(deps);
  assertEquals(bilan.remis, 1);
  assertEquals(ar24.acces, [{ token: "t-env", clePrivee: "k-env" }]);
  assertEquals(ar24.pieces, [{
    idUser: "4242",
    nom: "med.pdf",
    mime: "application/pdf",
  }]);
  assertEquals(ar24.mails[0], {
    id_user: "4242",
    to_email: "destinataire@exemple.test",
    dest_statut: "professionnel",
    to_company: "Destinataire Test",
    content: "Mise en demeure de payer la facture F-12.",
    eidas: "0",
    ref_client: LRE,
    ref_dossier: "f1",
    pieces: ["f1"],
  });
  assertEquals(portes.confirmes.get(LRE), "7001");
});

Deno.test("LRE : particulier → prénom et nom ; eIDAS ; accès du coffre en JSON ; secret mal formé → reporté", async () => {
  const mail = composerLre(
    envoiLre({
      expediteur: {
        ...envoiLre().expediteur,
        parametres: { id_utilisateur: "1", eidas: true },
      },
      destinataire: {
        adresse: "a@b.test",
        nom: "Jean de La Fontaine",
        langue: "fr",
        professionnel: false,
      },
    }),
    "1",
    [],
  );
  assertEquals([
    mail.dest_statut,
    mail.to_firstname,
    mail.to_lastname,
    mail.eidas,
    mail.to_company,
  ], [
    "particulier",
    "Jean",
    "de La Fontaine",
    "1",
    undefined,
  ]);

  const a = monter({ ar24: false });
  a.portes.envois.set(
    LRE,
    envoiLre({ expediteur: { ...envoiLre().expediteur, secret: true } }),
  );
  a.portes.secrets.set(LRE, '{"token":"t-coffre","cle_privee":"k-coffre"}');
  a.portes.travaux = [travailExemple(9, "envois.ar24", LRE)];
  assertEquals((await executerPassage(a.deps)).remis, 1);
  assertEquals(a.ar24.acces, [{ token: "t-coffre", clePrivee: "k-coffre" }]);

  const b = monter();
  b.portes.envois.set(
    LRE,
    envoiLre({ expediteur: { ...envoiLre().expediteur, secret: true } }),
  );
  b.portes.secrets.set(LRE, "pas du json");
  b.portes.travaux = [travailExemple(10, "envois.ar24", LRE)];
  assertEquals((await executerPassage(b.deps)).reportes, 1);
  assertMatch(b.portes.envoisEchoues.get(LRE)!.erreur, /^SECRET_ILLISIBLE/);
  assertEquals(b.ar24.mails.length, 0);
});

Deno.test("LRE : sans accès → reporté ; sans id_utilisateur ou sans nom → définitif ; erreur AR24 métier → définitive", async () => {
  const a = monter({ ar24: false });
  a.portes.envois.set(LRE, envoiLre());
  a.portes.travaux = [travailExemple(11, "envois.ar24", LRE)];
  assertEquals((await executerPassage(a.deps)).reportes, 1);
  assertMatch(
    a.portes.envoisEchoues.get(LRE)!.erreur,
    /^FOURNISSEUR_NON_BRANCHE/,
  );

  const b = monter();
  b.portes.envois.set(
    LRE,
    envoiLre({ expediteur: { ...envoiLre().expediteur, parametres: {} } }),
  );
  b.portes.travaux = [travailExemple(12, "envois.ar24", LRE)];
  assertEquals((await executerPassage(b.deps)).echecs, 1);
  assertMatch(
    b.portes.envoisEchoues.get(LRE)!.erreur,
    /^ID_UTILISATEUR_ABSENT/,
  );

  const c = monter();
  c.portes.envois.set(
    LRE,
    envoiLre({
      destinataire: {
        adresse: "a@b.test",
        nom: null,
        langue: null,
        professionnel: true,
      },
    }),
  );
  c.portes.travaux = [travailExemple(13, "envois.ar24", LRE)];
  assertEquals((await executerPassage(c.deps)).echecs, 1);
  assertMatch(
    c.portes.envoisEchoues.get(LRE)!.erreur,
    /^DESTINATAIRE_SANS_NOM/,
  );

  const d = monter();
  d.ar24.erreur = new ErreurAr24(
    200,
    '{"status":"ERROR","slug":"invalid_email"}',
    true,
  );
  d.portes.envois.set(LRE, envoiLre());
  d.portes.travaux = [travailExemple(14, "envois.ar24", LRE)];
  assertEquals((await executerPassage(d.deps)).echecs, 1);
  assertMatch(
    d.portes.envoisEchoues.get(LRE)!.erreur,
    /^AR24_200 : .*invalid_email/,
  );
  assert(!d.portes.confirmes.has(LRE));
});

Deno.test("modèle « nom@langue Meta » (gabarit du socle, langue à deux lettres) ; paramètres en liste (rendre_gabarit)", () => {
  assertEquals(lireModeleExterne("hello_world@en_US"), {
    nom: "hello_world",
    langue: "en_US",
  });
  assertEquals(lireModeleExterne("relance_facture"), {
    nom: "relance_facture",
    langue: null,
  });
  const m = composerWhatsApp(
    envoiWa({
      modele_externe: "hello_world@en_US",
      langue: "fr",
      parametres_modele: ["F-12"] as unknown as Record<string, unknown>,
    }),
    null,
  );
  assertEquals(m, {
    to: "33612345678",
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" },
      components: [{
        type: "body",
        parameters: [{ type: "text", text: "F-12" }],
      }],
    },
  });
  const vide = composerWhatsApp(
    envoiWa({
      modele_externe: "hello_world@en_US",
      parametres_modele: [] as unknown as Record<string, unknown>,
    }),
    null,
  );
  assertEquals(vide.type === "template" && vide.template.components, undefined);
});
