// Les règles de l'ouvrier hors banc : pannes, plafond, citations fausses,
// identifiants invalides, battement, outils.

import { assert, assertEquals, assertNotEquals } from "@std/assert";
import { CAS } from "../banc/cas.ts";
import { octetsDuCas } from "../banc/generer.ts";
import { lirePiece, versionLecteur } from "../lire_piece.ts";
import { passage } from "../passage.ts";
import { verifierValeurs } from "../verifier.ts";
import { dateIso, nombreDepuisTexte, retrouver, sirenValide, tvaFrValide } from "@partage/texte.ts";
import { signerRequete } from "@partage/aws_sigv4.ts";
import { coutEur, prixParDefaut } from "@partage/bedrock.ts";
import { debutDuJourParis } from "@partage/portes.ts";
import { detecter } from "../detecter.ts";
import { contexteDeTest, ExtracteurFactice, OcrFactice, pieceDeTest, travailDeTest } from "./doubles.ts";

const cas01 = CAS.find((c) => c.id === "01_facture_native")!;
const cas02 = CAS.find((c) => c.id === "02_facture_scannee")!;

async function poserPiece(
  portes: InstanceType<typeof import("./doubles.ts").PortesMemoire>,
  depot: InstanceType<typeof import("./doubles.ts").DepotMemoire>,
  cas = cas01,
  extra = {},
) {
  const piece = pieceDeTest("aaaaaaaa-0000-4000-8000-000000000001", cas.fichier, cas.mime, extra);
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, await octetsDuCas(cas));
  return piece;
}

Deno.test("sans Bedrock : IA_NON_BRANCHEE, travail repris, rien d'enregistré", async () => {
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  const piece = await poserPiece(portes, depot);
  const issue = await lirePiece(ctx, travailDeTest(1, piece.id));
  assertEquals(issue, "repris");
  assertEquals(portes.echoues.length, 1);
  assert(portes.echoues[0].erreur.startsWith("IA_NON_BRANCHEE"), portes.echoues[0].erreur);
  assertEquals(portes.echoues[0].reprendre, true);
  assertEquals(portes.enregistrements.length, 0);
  assertEquals(portes.finis.length, 0);
});

Deno.test("sans Bedrock, un PDF n'est même pas téléchargé", async () => {
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  const piece = await poserPiece(portes, depot);
  let telechargements = 0;
  const original = depot.telecharger.bind(depot);
  depot.telecharger = (chemin: string) => {
    telechargements++;
    return original(chemin);
  };
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assertEquals(telechargements, 0);
  assert(portes.echoues[0].erreur.startsWith("IA_NON_BRANCHEE"));
});

Deno.test("sans Bedrock, un XML se lit quand même (source xml)", async () => {
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  const cas = CAS.find((c) => c.id === "05_facture_ubl")!;
  const piece = await poserPiece(portes, depot, cas);
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
  assertEquals(portes.enregistrements[0].resultat.methode, "xml");
});

Deno.test("plafond IA atteint : PLAFOND_IA non définitif, IA non appelée", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest({ env: { PLAFOND_IA_JOUR_CLIENT_EUR: "1" } });
  const piece = await poserPiece(portes, depot);
  portes.consommation.set(piece.client_id, 0.995);
  ia!.prochaine = cas01.ia!;
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assert(portes.echoues[0].erreur.startsWith("PLAFOND_IA"), portes.echoues[0].erreur);
  assertEquals(ia!.appels.length, 0);
});

Deno.test("plafond lu par lire_parametre avant l'environnement", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest({ env: { PLAFOND_IA_JOUR_CLIENT_EUR: "100" } });
  const piece = await poserPiece(portes, depot);
  portes.parametres.set("plafond_ia_jour_client", "0,5");
  portes.consommation.set(piece.client_id, 0.499);
  ia!.prochaine = cas01.ia!;
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assert(portes.echoues[0].erreur.includes("(reglage)"), portes.echoues[0].erreur);
});

Deno.test("fichier absent du dépôt : échec définitif motivé, travail fini", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const piece = await poserPiece(portes, depot);
  depot.fichiers.clear();
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "echec");
  assertEquals(portes.enregistrements[0].resultat.statut, "echec");
  assert(portes.enregistrements[0].resultat.motif!.includes("absent"));
  assertEquals(portes.finis.length, 1);
});

Deno.test("format inconnu : rejetée, motivée", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const piece = await poserPiece(portes, depot, cas01, { nom_fichier: "archive.zip", mime: "application/zip" });
  depot.fichiers.set(piece.chemin, new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]));
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "rejetee");
  assert(portes.enregistrements[0].resultat.motif!.includes("Format"));
});

Deno.test("commencer_lecture rend false : travail fini en « ignore »", async () => {
  const { ctx, portes, depot } = contexteDeTest();
  const piece = await poserPiece(portes, depot, cas01, { statut: "lue" });
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "ignore");
  assertEquals((portes.finis[0].resultat as { ignore: string }).ignore, "plus rien à lire");
});

Deno.test("pièce introuvable : travail fini en « ignore »", async () => {
  const { ctx } = contexteDeTest();
  assertEquals(await lirePiece(ctx, travailDeTest(1, "aaaaaaaa-0000-4000-8000-000000000009")), "ignore");
});

Deno.test("citation introuvable : valeur gardée mais non vérifiée, pièce à vérifier", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = await poserPiece(portes, depot);
  ia!.prochaine = {
    ...cas01.ia!,
    valeurs: cas01.ia!.valeurs.map((v) => (v.champ === "montant_ttc" ? { ...v, valeur: 1481.29, texte: "Total TTC : 1 481,29 €" } : v)),
  };
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "a_verifier");
  const r = portes.enregistrements[0].resultat;
  const ttc = r.valeurs.find((v) => v.champ === "montant_ttc")!;
  assertEquals(ttc.verifiee, false);
  assert(ttc.controle!.includes("introuvable"));
  assert(r.motif!.includes("montant_ttc"));
});

Deno.test("SIREN cité mais à clé fausse : non vérifié", () => {
  const pages = [{ n: 1, methode: "natif" as const, texte: "SIREN 812345670 - TVA FR00812345670" }];
  const v = verifierValeurs(
    [
      { champ: "fournisseur.siren", valeur: "812345670", texte: "SIREN 812345670", page: 1 },
      { champ: "fournisseur.tva", valeur: "FR00812345670", texte: "TVA FR00812345670", page: 1 },
      { champ: "date", valeur: "31/02/2026", texte: "31/02/2026", page: 1 },
    ],
    pages,
    null,
  );
  assertEquals(v.valeurs.find((x) => x.champ === "fournisseur.siren")!.verifiee, false);
  assertEquals(v.valeurs.find((x) => x.champ === "fournisseur.tva")!.verifiee, false);
  const d = v.valeurs.find((x) => x.champ === "date")!;
  assertEquals(d.verifiee, false);
  assert(d.controle!.includes("date illisible"));
});

Deno.test("page citée inexistante ou champ hors schéma : écartés proprement", () => {
  const v = verifierValeurs(
    [
      { champ: "numero", valeur: "X", texte: "X", page: 7 },
      { champ: "champ.inconnu", valeur: "Y", texte: "Y", page: 1 },
      { champ: "Numéro Invalide", valeur: "Z", texte: "Z", page: 1 },
    ],
    [{ n: 1, methode: "natif", texte: "X Y Z" }],
    null,
  );
  assertEquals(v.valeurs.length, 1);
  assertEquals(v.valeurs[0].verifiee, false);
  assert(v.valeurs[0].controle!.includes("page 7 inexistante"));
});

Deno.test("OCR branché : pages scannées reconnues par l'OCR puis IA sur le texte", async () => {
  const ocr = new OcrFactice();
  ocr.prochaine = { pages: [{ n: 1, texte: cas02.ia!.pages![0].texte }], cout_eur: 0.00092, fournisseur: "ocr-factice" };
  const { ctx, portes, depot, ia } = contexteDeTest({ ocr });
  const piece = await poserPiece(portes, depot, cas02);
  ia!.prochaine = { ...cas02.ia!, pages: undefined };
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "lue");
  assertEquals(ocr.appels, 1);
  assertEquals(ia!.appels[0].entree.mode, "texte");
  const r = portes.enregistrements[0].resultat;
  assertEquals(r.pages[0].methode, "ocr");
  assertEquals(r.methode, "ocr");
  const fini = portes.finis[0].resultat as { cout_eur: number };
  assertEquals(fini.cout_eur, Math.round((0.00884 + 0.00092) * 1e6) / 1e6);
});

Deno.test("panne de l'IA (fournisseur) : repris, pas d'exception", async () => {
  const ia = new ExtracteurFactice();
  ia.extraire = async () => {
    const { ErreurOuvrier } = await import("@partage/erreurs.ts");
    throw new ErreurOuvrier("FOURNISSEUR_INDISPONIBLE", "Bedrock HTTP 503");
  };
  const { ctx, portes, depot } = contexteDeTest({ ia });
  const piece = await poserPiece(portes, depot);
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assert(portes.echoues[0].erreur.startsWith("FOURNISSEUR_INDISPONIBLE"));
});

Deno.test("exception inattendue : ERREUR_INTERNE, repris, jamais relancée", async () => {
  const ia = new ExtracteurFactice();
  ia.extraire = () => Promise.reject(new TypeError("boum"));
  const { ctx, portes, depot } = contexteDeTest({ ia });
  const piece = await poserPiece(portes, depot);
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "repris");
  assert(portes.echoues[0].erreur.startsWith("ERREUR_INTERNE : TypeError: boum"));
});

Deno.test("echouer_travail lui-même en panne : issue « erreur », pas d'exception", async () => {
  const { ctx, portes, depot } = contexteDeTest({ ia: null });
  const piece = await poserPiece(portes, depot);
  portes.panne.echouerTravail = new Error("réseau");
  assertEquals(await lirePiece(ctx, travailDeTest(1, piece.id)), "erreur");
});

Deno.test("passage à vide : battre_ouvrier appelé quand même", async () => {
  const { ctx, portes } = contexteDeTest({ ia: null });
  const bilan = await passage(ctx);
  assertEquals(bilan.pris, 0);
  assertEquals(portes.battements.length, 1);
  assertEquals(portes.battements[0].module, "lecteur");
  assertEquals(portes.battements[0].genres, ["lecteur.lire", "lecteur.media"]);
  assertEquals((portes.battements[0].detail as { ia_branchee: boolean }).ia_branchee, false);
  assertEquals(portes.appels[0].args, [["lecteur.lire", "lecteur.media"], 5, "10 minutes", "lecteur-test"]);
});

Deno.test("passage avec deux travaux : l'un lu, l'autre chiffré clos sans lecture, battement avec le bilan", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const p1 = await poserPiece(portes, depot);
  const p2 = pieceDeTest("aaaaaaaa-0000-4000-8000-000000000002", "x.pdf", "application/pdf", { chiffrement: "dossier:v1" });
  portes.pieces.set(p2.id, p2);
  portes.travaux = [travailDeTest(1, p1.id), travailDeTest(2, p2.id)];
  ia!.prochaine = cas01.ia!;
  const bilan = await passage(ctx);
  assertEquals(bilan.pris, 2);
  assertEquals(bilan.issues.lue, 1);
  assertEquals(bilan.issues.ignore, 1);
  assertEquals(portes.battements.length, 1);
});

Deno.test("passage : prendre_travaux en panne n'empêche pas le battement", async () => {
  const { ctx, portes } = contexteDeTest({ ia: null });
  portes.panne.prendreTravaux = new Error("HTTP 503");
  const bilan = await passage(ctx);
  assert(bilan.erreur?.includes("503"));
  assertEquals(portes.battements.length, 1);
});

Deno.test("version du lecteur : lecteur/<jour>/<modèle court>, 40 caractères au plus", () => {
  const v = versionLecteur(new Date("2026-10-05T12:00:00Z"), "eu.anthropic.claude-sonnet-4-5-20250929-v1:0");
  assertEquals(v, "lecteur/2026-10-05/claude-sonnet-4-5");
  assert(versionLecteur(new Date(), "x".repeat(80)).length <= 40);
  assertEquals(versionLecteur(new Date("2026-10-05T12:00:00Z"), null), "lecteur/2026-10-05/sans-ia");
});

Deno.test("outils texte : retrouver, nombres, dates, clés", () => {
  assertEquals(retrouver("Total TTC : 1 481,28 €", "...\nTotal TTC : 1 481,28 €\n...").trouve, true);
  assertEquals(retrouver("1481,28", "Total TTC : 1 481,28 €").mode, "compact");
  assertEquals(retrouver("Échéance", "echeance : demain").trouve, true);
  assertEquals(retrouver("1 481,29", "Total TTC : 1 481,28 €").trouve, false);
  assertEquals(nombreDepuisTexte("1 234,56 €"), 1234.56);
  assertEquals(nombreDepuisTexte("1,234.56"), 1234.56);
  assertEquals(nombreDepuisTexte("-42,88"), -42.88);
  assertEquals(nombreDepuisTexte("abc"), null);
  assertEquals(dateIso("12/03/2026"), "2026-03-12");
  assertEquals(dateIso("5 février 2026"), "2026-02-05");
  assertEquals(dateIso("2026-02-30"), null);
  assertEquals(dateIso("14/03/26"), "2026-03-14");
  assertEquals(sirenValide("812345676"), true);
  assertEquals(sirenValide("812345670"), false);
  assertEquals(tvaFrValide("FR19812345676"), true);
  assertEquals(tvaFrValide("FR 19 812 345 676"), true);
  assertEquals(tvaFrValide("FR18812345676"), false);
});

Deno.test("détection des familles de fichiers", () => {
  assertEquals(detecter(new TextEncoder().encode("%PDF-1.7"), "application/octet-stream", "x.bin").famille, "pdf");
  assertEquals(detecter(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "", "photo").formatImage, "jpeg");
  assertEquals(detecter(new TextEncoder().encode('<?xml version="1.0"?><Invoice xmlns="urn:oasis"/>'), "text/plain", "f.txt").famille, "xml");
  assertEquals(detecter(new TextEncoder().encode("a;b\n1;2"), "text/csv", "x.csv").formatTableur, "csv");
  assertEquals(
    detecter(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "x.xlsx").formatTableur,
    "xlsx",
  );
  assertEquals(detecter(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), "application/zip", "x.zip").famille, "inconnu");
});

Deno.test("coût Bedrock : prix par famille, conversion en euros", () => {
  assertEquals(prixParDefaut("eu.anthropic.claude-haiku-4-5-20251001-v1:0"), { entree: 1, sortie: 5 });
  assertEquals(prixParDefaut("eu.anthropic.claude-sonnet-4-5-20250929-v1:0"), { entree: 3, sortie: 15 });
  const c = coutEur({ prixEntreeUsdMtok: 3, prixSortieUsdMtok: 15, tauxUsdEur: 0.92 }, { tokens_entree: 1_000_000, tokens_sortie: 100_000 });
  assertEquals(c, 4.14);
});

Deno.test("SigV4 : le vecteur public d'AWS (GET iam ListUsers)", async () => {
  const entetes = await signerRequete(
    {
      method: "GET",
      url: "https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08",
      headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: "",
      service: "iam",
      region: "us-east-1",
      date: new Date("2015-08-30T12:36:00Z"),
    },
    { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" },
  );
  assertEquals(
    entetes.Authorization,
    "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7",
  );
});

Deno.test("début du jour à Paris", () => {
  const d = debutDuJourParis(new Date("2026-07-15T01:30:00Z")); // 03:30 à Paris (UTC+2)
  assertEquals(d.toISOString(), "2026-07-14T22:00:00.000Z");
  const h = debutDuJourParis(new Date("2026-01-15T12:00:00Z")); // UTC+1
  assertEquals(h.toISOString(), "2026-01-14T23:00:00.000Z");
  assertNotEquals(d.getTime(), h.getTime());
});
