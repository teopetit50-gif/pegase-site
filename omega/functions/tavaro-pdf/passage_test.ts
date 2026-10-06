// Tests de l'ouvrier TAVARO-PDF, sans réseau : des doubles des portes et du stockage. deno task test
import { assert, assertEquals, assertMatch } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { composerPdf } from "./pdf.ts";
import { executerPassage, GENRE, MAX_PIECES } from "./passage.ts";
import type { AProduire, FactureAProduire, PieceProduite, Portes, Travail } from "./portes.ts";
import type { Stockage } from "./stockage.ts";

const CLIENT = "11111111-1111-4111-8111-111111111111";
const facture = (n: number, o: Partial<FactureAProduire> = {}): FactureAProduire => ({
  id: `f${n}`,
  reference: `FA-2026-00000${n}`,
  nature: "frais",
  date_facture: "2026-10-06",
  echeance_le: "2026-11-05",
  a_debiter_avant: "2026-10-15",
  emetteur: {
    nom: "Autoloc Bertin",
    siren: "512345679",
    adresse: "18 rue de la Villette, 69003 Lyon",
    numero_tva: "FR75 512 345 679",
    email: "facturation@autoloc.example",
  },
  destinataire: {
    type: "professionnel",
    raison_sociale: "Studio Albane SAS",
    siren: "552100554",
    adresse: "2 place Carnot, 69002 Lyon",
  },
  mentions: {
    objet: "Frais complémentaires de location",
    restitution: "05/10/2026 à 11:30",
    penalites: "Pénalités au taux BCE + 10 points ; indemnité 40 €.",
    mandat: "Facture établie par Omega au nom et pour le compte d'Autoloc Bertin.",
    option_debits: "Option pour le paiement de la taxe d'après les débits",
  },
  total_ht: 93.5,
  total_tva: 18.7,
  total_ttc: 112.2,
  pdf_fait: false,
  lignes: [
    {
      rang: 1,
      libelle: "Carburant manquant, au huitième",
      quantite: 3,
      unite: "huitieme",
      prix_unitaire: 12,
      montant_ht: 36,
      regime_tva: "taxable",
      taux_tva: 20,
      montant_tva: 7.2,
      montant_ttc: 43.2,
    },
    {
      rang: 2,
      libelle: "Kilomètre au-delà du forfait (50 km)",
      quantite: 50,
      unite: "km",
      prix_unitaire: 0.25,
      montant_ht: 12.5,
      regime_tva: "taxable",
      taux_tva: 20,
      montant_tva: 2.5,
      montant_ttc: 15,
    },
    {
      rang: 3,
      libelle: "Jour de retard entamé",
      quantite: 1,
      unite: "jour_entame",
      prix_unitaire: 45,
      montant_ht: 45,
      regime_tva: "taxable",
      taux_tva: 20,
      montant_tva: 9,
      montant_ttc: 54,
    },
  ],
  photos: [{ chemin: `${CLIENT}/loc_contrat/c1/jauge.jpg`, prise_le: "2026-10-05T11:35:00Z", legende: "Carburant" }],
  ...o,
});

function doubles(a: AProduire, o: { echouerEnregistrement?: boolean } = {}) {
  const deposes = new Map<string, Uint8Array>();
  const enregistres: PieceProduite[][] = [];
  const finis: Record<string, unknown>[] = [];
  const echoues: string[] = [];
  const impossibles: string[] = [];
  let battu = 0;
  const travaux: Travail[] = [{
    id: 1,
    genre: GENRE,
    charge: { proposition: a.proposition },
    essais: 1,
    essais_max: 3,
  }];
  const portes: Portes = {
    prendreTravaux: () => Promise.resolve(travaux.splice(0)),
    finirTravail: (_id, r) => {
      finis.push(r);
      return Promise.resolve();
    },
    echouerTravail: (_id, e) => {
      echoues.push(e);
      return Promise.resolve("repris");
    },
    battreOuvrier: () => {
      battu++;
      return Promise.resolve(1);
    },
    pdfAProduire: () => Promise.resolve(a),
    enregistrerPdf: (_p, pieces) => {
      if (o.echouerEnregistrement) return Promise.reject(new Error("porte loc_enregistrer_pdf : HTTP 500"));
      enregistres.push(pieces);
      return Promise.resolve({ statut: "prepare", pieces_jointes: pieces.length });
    },
    pdfImpossible: (_p, e) => {
      impossibles.push(e);
      return Promise.resolve({ statut: "prepare" });
    },
    dossierAProduire: () => Promise.resolve(null),
    enregistrerDossier: () => Promise.resolve({}),
    dossierImpossible: () => Promise.resolve({}),
  };
  const stockage: Stockage = {
    lire: (chemin) =>
      chemin.endsWith("absente.jpg") ? Promise.reject(new Error("404")) : Promise.resolve(new Uint8Array(2048).fill(7)),
    deposer: (chemin, octets) => {
      deposes.set(chemin, octets);
      return Promise.resolve();
    },
  };
  return { portes, stockage, deposes, enregistres, finis, echoues, impossibles, travaux, battu: () => battu };
}
const journal = { info: () => {}, erreur: () => {} };

Deno.test("le PDF d'une facture est un vrai PDF, lisible, avec ses métadonnées", async () => {
  const octets = await composerPdf(facture(1), "C-2026-0412");
  assertEquals(new TextDecoder().decode(octets.slice(0, 5)), "%PDF-");
  const doc = await PDFDocument.load(octets);
  assertEquals(doc.getPageCount(), 1);
  assertEquals(doc.getTitle(), "Facture FA-2026-000001");
  assertEquals(doc.getSubject(), "Location C-2026-0412");
});

Deno.test("une facture longue passe sur plusieurs pages", async () => {
  const lignes = Array.from(
    { length: 70 },
    (_, i) => ({
      ...facture(1).lignes[0],
      rang: i + 1,
      libelle: `Ligne ${
        i + 1
      } — une désignation assez longue pour occuper la colonne et revenir à la ligne une fois au moins`,
    }),
  );
  const doc = await PDFDocument.load(await composerPdf(facture(1, { lignes }), "C-1"));
  assert(doc.getPageCount() >= 3, `pages : ${doc.getPageCount()}`);
});

Deno.test("un passage compose les PDF, joint la photo et fait partir le courriel", async () => {
  const d = doubles({
    proposition: "p1",
    client: CLIENT,
    contrat: "C-2026-0412",
    statut: "facturee",
    factures: [facture(1), facture(2, { nature: "dommages", photos: [] })],
  });
  const bilan = await executerPassage({ portes: d.portes, stockage: d.stockage, ouvrier: "test", journal });
  assertEquals(bilan.faits, 1);
  assertEquals([...d.deposes.keys()].sort(), [
    `${CLIENT}/loc_factures/f1/FA-2026-000001.pdf`,
    `${CLIENT}/loc_factures/f2/FA-2026-000002.pdf`,
  ]);
  const pieces = d.enregistres[0];
  assertEquals(pieces.map((p) => p.nature), ["pdf", "pdf", "photo"]);
  assertMatch(pieces[0].sha256, /^[0-9a-f]{64}$/);
  assertEquals(pieces[2].legende, "Carburant — prise le 05/10/2026 à 11:35");
  assertEquals(d.finis[0].pieces, 3);
  assertEquals(d.battu(), 1);
});

Deno.test("dix pièces au plus, une photo introuvable ou d'un autre dossier n'est pas jointe", async () => {
  const photos = [
    ...Array.from({ length: 14 }, (_, i) => ({ chemin: `${CLIENT}/loc_contrat/c1/p${i}.jpg` })),
    { chemin: `${CLIENT}/loc_contrat/c1/absente.jpg` },
    { chemin: `autre-client/loc_contrat/c9/x.jpg` },
  ];
  const d = doubles({
    proposition: "p1",
    client: CLIENT,
    contrat: "C-1",
    statut: "facturee",
    factures: [facture(1, { photos: [photos[14], photos[15], ...photos.slice(0, 14)] })],
  });
  await executerPassage({ portes: d.portes, stockage: d.stockage, ouvrier: "test", journal });
  const pieces = d.enregistres[0];
  assertEquals(pieces.length, MAX_PIECES);
  assert(pieces.every((p) => !p.chemin.endsWith("absente.jpg") && p.chemin.startsWith(CLIENT)));
});

Deno.test("une proposition qui n'est plus facturée est ignorée, sans envoi", async () => {
  const d = doubles({ proposition: "p1", client: CLIENT, contrat: "C-1", statut: "refusee", factures: [] });
  await executerPassage({ portes: d.portes, stockage: d.stockage, ouvrier: "test", journal });
  assertEquals(d.enregistres.length, 0);
  assertMatch(String(d.finis[0].ignore), /refusee/);
});

Deno.test("une erreur reprend le travail ; au dernier essai, le courriel part sans pièce jointe", async () => {
  const a: AProduire = {
    proposition: "p1",
    client: CLIENT,
    contrat: "C-1",
    statut: "facturee",
    factures: [facture(1)],
  };
  const d1 = doubles(a, { echouerEnregistrement: true });
  await executerPassage({ portes: d1.portes, stockage: d1.stockage, ouvrier: "test", journal });
  assertEquals(d1.echoues.length, 1);
  assertEquals(d1.impossibles.length, 0);
  const d2 = doubles(a, { echouerEnregistrement: true });
  d2.travaux[0].essais = 3;
  const bilan = await executerPassage({ portes: d2.portes, stockage: d2.stockage, ouvrier: "test", journal });
  assertEquals(d2.impossibles.length, 1);
  assertEquals(bilan.sans_pdf, 1);
  assertEquals(d2.finis[0].sans_pdf, true);
});

Deno.test("un passage à vide bat quand même", async () => {
  const d = doubles({ proposition: "p1", client: CLIENT, contrat: "C-1", statut: "facturee", factures: [] });
  d.travaux.splice(0);
  const bilan = await executerPassage({ portes: d.portes, stockage: d.stockage, ouvrier: "test", journal });
  assertEquals(bilan.pris, 0);
  assertEquals(d.battu(), 1);
});
