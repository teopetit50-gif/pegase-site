// Tests du dossier de contestation bancaire (b2_09), sans réseau : une vraie photo (fixture de la recette), une
// signature PNG, des doubles des portes et du stockage. deno task test
import { assert, assertEquals, assertMatch } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { composerDossier, photosDuDossier } from "./dossier.ts";
import { BUDGET_IMAGES_DOSSIER, executerPassage, GENRE_DOSSIER } from "./passage.ts";
import type { DossierAProduire, DossierProduit, Portes, Travail } from "./portes.ts";
import type { Stockage } from "./stockage.ts";

const CLIENT = "11111111-1111-4111-8111-111111111111";
const PHOTO = await Deno.readFile(new URL("../../recette-b2/photos/nette.jpg", import.meta.url));
// Un PNG d'un pixel : la signature tracée au comptoir.
const SIGNATURE = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0),
);

const dossier = (o: Partial<DossierAProduire> = {}): DossierAProduire => ({
  contestation: {
    id: "k1",
    reference_banque: "CB-2026-88412",
    motif_banque: "13.1 — prestation contestée",
    montant_eur: 480,
    recue_le: "2026-10-02",
    repondre_avant: "2026-10-09",
    statut: "ouverte",
  },
  client: CLIENT,
  agence: "Lyon Part-Dieu",
  emetteur: { nom: "Autoloc Bertin", siren: "512345679", adresse: "18 rue de la Villette, 69003 Lyon" },
  locataire: { nom: "Jean Martin", type: "particulier" },
  contrat: {
    numero: "LY-2026-0412",
    depart_le: "2026-09-01T07:00:00Z",
    retour_prevu_le: "2026-09-05T07:00:00Z",
    retour_reel_le: "2026-09-05T08:00:00Z",
    km_depart: 12000,
    km_retour: 12600,
    franchise_eur: 1200,
    rachat_franchise: false,
    depot_eur: 800,
    conditions_version: "CG-2026-03",
    vehicule: { immatriculation: "AB-123-CD", modele: "Clio" },
    piece: { id: "p1", nom: "contrat.pdf", chemin: `${CLIENT}/contrats/c1.pdf` },
  },
  etats: [
    {
      moment: "retour",
      statut: "signe",
      releve_le: "2026-09-05T08:00:00Z",
      km: 12600,
      carburant_8: 8,
      photos: ["avant", "arriere", "flanc_gauche", "flanc_droit"].map((vue) => ({
        vue,
        chemin: `${CLIENT}/edl/r-${vue}.jpg`,
        prise_le: "2026-09-05T08:02:00Z",
      })),
      dommages: [{
        zone: "porte_avant_gauche",
        code: "RAYURE_P",
        description: "Rayure profonde de 20 cm",
        preuves: [{ chemin: `${CLIENT}/edl/r-rayure.jpg`, prise_le: "2026-09-05T08:03:00Z" }],
      }],
      signataire_nom: "Jean Martin",
      signature_chemin: `${CLIENT}/edl/r-signature.png`,
      signe_le: "2026-09-05T08:05:00Z",
      empreinte: "b".repeat(64),
    },
    {
      moment: "depart",
      statut: "signe",
      releve_le: "2026-09-01T06:55:00Z",
      km: 12000,
      carburant_8: 8,
      photos: [{ vue: "avant", chemin: `${CLIENT}/edl/d-avant.jpg`, prise_le: "2026-09-01T06:55:00Z" }],
      dommages: [],
      caution_eur: 800,
      caution_mode: "empreinte_carte",
      signataire_nom: "Jean Martin",
      signe_le: "2026-09-01T07:00:00Z",
      empreinte: "a".repeat(64),
    },
  ],
  facture: {
    id: "f1",
    reference: "FA-2026-000071",
    nature: "dommages",
    date_facture: "2026-09-06",
    echeance_le: "2026-09-06",
    statut: "reglee",
    regle_le: "2026-09-08T10:00:00Z",
    mode_reglement: "carte",
    total_ht: 400,
    total_tva: 80,
    total_ttc: 480,
    lignes: [{
      rang: 1,
      code: "RAYURE_P",
      libelle: "Rayure profonde porte avant gauche",
      famille: "dommage",
      quantite: 1,
      unite: "forfait",
      prix_unitaire: 400,
      montant_ttc: 480,
      bareme: { code: "RAYURE_P", libelle: "Rayure profonde, par élément", unite: "forfait", prix_eur: 400 },
      calcul: { zone: "porte_avant_gauche", depart: "absent" },
      preuves: [{ chemin: `${CLIENT}/edl/r-rayure.jpg`, prise_le: "2026-09-05T08:03:00Z" }, {
        chemin: `${CLIENT}/devis/garage.jpg`,
      }],
    }],
  },
  decision: {
    demandee_le: "2026-09-05T09:00:00Z",
    decidee_le: "2026-09-06T08:00:00Z",
    statut: "executee",
    approbations: [{
      decision: "approuve",
      decide_le: "2026-09-06T08:00:00Z",
      role: "valideur",
      autre_que_la_saisie: true,
    }],
  },
  envoi_facture: {
    prepare_le: "2026-09-06T08:01:00Z",
    statut: "envoye",
    remise: "delivered",
    remise_le: "2026-09-06T08:02:00Z",
  },
  ...o,
});

const lecteur = (chemin: string) =>
  chemin.endsWith(".png")
    ? SIGNATURE
    : chemin.endsWith("garage.jpg")
    ? new Uint8Array(BUDGET_IMAGES_DOSSIER + 1).fill(0xff)
    : PHOTO;

Deno.test("le dossier est un vrai PDF : lettre, contrat, facture, deux états des lieux, photos intégrées", async () => {
  const d = dossier();
  const images = new Map(photosDuDossier(d).map((c) => [c, lecteur(c)]));
  const { pdf, pages, integrees } = await composerDossier(d, images);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const doc = await PDFDocument.load(pdf);
  assertEquals(doc.getPageCount(), pages);
  assert(pages >= 3, `pages : ${pages}`);
  assertEquals(doc.getTitle(), "Contestation CB-2026-88412 — dossier de réponse");
  // 4 vues + 1 dommage au retour, 1 vue au départ, la signature ; le devis (trop gros ici, non décodable) est listé
  assertEquals(integrees, 7);
});

Deno.test("les photos d'un autre loueur ne sont jamais lues", () => {
  const d = dossier();
  d.etats[0].photos.push({ vue: "jauge", chemin: "autre-loueur/edl/x.jpg" });
  assert(photosDuDossier(d).every((c) => c.startsWith(`${CLIENT}/`)));
});

function doubles(d: DossierAProduire | null, o: { echouer?: boolean; essais?: number } = {}) {
  const deposes = new Map<string, Uint8Array>();
  const enregistres: DossierProduit[] = [];
  const finis: Record<string, unknown>[] = [];
  const impossibles: string[] = [];
  const echoues: string[] = [];
  const lus: string[] = [];
  const travaux: Travail[] = [{
    id: 9,
    genre: GENRE_DOSSIER,
    charge: { contestation: "k1" },
    essais: o.essais ?? 1,
    essais_max: 3,
  }];
  const portes: Portes = {
    prendreTravaux: (genres) => Promise.resolve(genres.includes(GENRE_DOSSIER) ? travaux.splice(0) : []),
    finirTravail: (_id, r) => {
      finis.push(r);
      return Promise.resolve();
    },
    echouerTravail: (_id, e) => {
      echoues.push(e);
      return Promise.resolve("repris");
    },
    battreOuvrier: () => Promise.resolve(1),
    pdfAProduire: () => Promise.resolve(null),
    enregistrerPdf: () => Promise.resolve({}),
    pdfImpossible: () => Promise.resolve({}),
    dossierAProduire: () => Promise.resolve(d),
    enregistrerDossier: (_k, piece) => {
      if (o.echouer) return Promise.reject(new Error("porte loc_enregistrer_dossier : HTTP 500"));
      enregistres.push(piece);
      return Promise.resolve({ statut: "dossier_pret" });
    },
    dossierImpossible: (_k, e) => {
      impossibles.push(e);
      return Promise.resolve({ alerte: true });
    },
  };
  const stockage: Stockage = {
    lire: (chemin) => {
      lus.push(chemin);
      return chemin.endsWith("d-avant.jpg") ? Promise.reject(new Error("404")) : Promise.resolve(lecteur(chemin));
    },
    deposer: (chemin, octets) => {
      deposes.set(chemin, octets);
      return Promise.resolve();
    },
  };
  return { portes, stockage, deposes, enregistres, finis, impossibles, echoues, lus };
}
const journal = { info: () => {}, erreur: () => {} };

Deno.test("un passage compose le dossier, le dépose sous le dossier du loueur et l'enregistre", async () => {
  const x = doubles(dossier());
  const bilan = await executerPassage({ portes: x.portes, stockage: x.stockage, ouvrier: "test", journal });
  assertEquals(bilan.faits, 1);
  const chemin = `${CLIENT}/loc_contestations/k1/dossier-CB-2026-88412.pdf`;
  assertEquals([...x.deposes.keys()], [chemin]);
  const p = x.enregistres[0];
  assertEquals(p.chemin, chemin);
  assertEquals(p.mime, "application/pdf");
  assertEquals(p.octets, x.deposes.get(chemin)!.length);
  assertMatch(p.sha256, /^[0-9a-f]{64}$/);
  assert(p.pages >= 3);
  // la photo de départ introuvable ne bloque pas ; le devis hors budget n'est pas intégré
  assertEquals(x.finis[0].images, 6);
});

Deno.test("une contestation close est ignorée", async () => {
  const d = dossier();
  d.contestation.statut = "gagnee";
  const x = doubles(d);
  await executerPassage({ portes: x.portes, stockage: x.stockage, ouvrier: "test", journal });
  assertEquals(x.enregistres.length, 0);
  assertMatch(String(x.finis[0].ignore), /gagnee/);
});

Deno.test("une erreur reprend le travail ; au dernier essai, l'agence est prévenue", async () => {
  const x1 = doubles(dossier(), { echouer: true });
  await executerPassage({ portes: x1.portes, stockage: x1.stockage, ouvrier: "test", journal });
  assertEquals(x1.echoues.length, 1);
  assertEquals(x1.impossibles.length, 0);
  const x2 = doubles(dossier(), { echouer: true, essais: 3 });
  const bilan = await executerPassage({ portes: x2.portes, stockage: x2.stockage, ouvrier: "test", journal });
  assertEquals(x2.impossibles.length, 1);
  assertEquals(bilan.dossiers_impossibles, 1);
  assertEquals(x2.finis[0].dossier_impossible, true);
});
