// Le coffre Tamila branché dans le lecteur : une pièce « dossier:v1 » d'un cabinet à coffre serveur se
// déchiffre en mémoire et se lit ; sans coffre (local, absent) elle est close sans lecture ; une clé
// fausse ou un coffre qui refuse ne sont pas repris, un coffre indisponible l'est. Le coffre est un
// double : le compte Scaleway n'existe pas encore.

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
// deno-lint-ignore no-import-prefix
import { chiffrer, dechiffrer } from "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/2556214e4befd2c8ad09f9a65c95227e70571e06/omega/functions/tamila-coffre/aesgcm.ts";
import { ecrirePdf } from "../banc/pdf_minimal.ts";
import { type AvisLu, type ClePiece, CoffreRpc, type CoffreTamila, type DossierPourLecteur } from "../coffre.ts";
import { lirePiece } from "../lire_piece.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

class CoffreDouble implements CoffreTamila {
  appels: string[] = [];
  remises: Uint8Array[] = [];
  avisPoses: { piece: string; avis: AvisLu; concorde: boolean | null }[] = [];
  /** le n° RG du dossier, chiffré (hex « \\x… » comme PostgREST rend un bytea) */
  rgChiffre: string | null = null;
  avisDeja = false;
  panneAvis: Error | null = null;
  constructor(private reponse: () => ClePiece | Promise<ClePiece>) {}
  async clePiece(piece: string): Promise<ClePiece> {
    this.appels.push(piece);
    const r = await this.reponse();
    if (r.fournisseur === "scaleway") this.remises.push(r.cle);
    return r;
  }
  dossier(piece: string): Promise<DossierPourLecteur> {
    return Promise.resolve({ piece, dossier: "dddddddd-0000-4000-8000-000000000001", client: "c", statut: "ouvert", numero_rg: this.rgChiffre, avis_deja: this.avisDeja });
  }
  poserAvis(piece: string, avis: AvisLu, concorde: boolean | null) {
    if (this.panneAvis) return Promise.reject(this.panneAvis);
    this.avisPoses.push({ piece, avis, concorde });
    return Promise.resolve({ avis: "aaaaaaaa-0000-4000-8000-0000000000aa", statut: concorde === false ? "a_verifier" : "lu", effet: "audience" });
  }
}

const hex = (o: Uint8Array) => "\\x" + Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
async function ouvrir(chiffreB64: string): Promise<string> {
  const o = Uint8Array.from(atob(chiffreB64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(await dechiffrer(CLE(), o));
}

const CLE = () => Uint8Array.from({ length: 32 }, (_, i) => (i * 7 + 3) & 0xff);

function avisPdf(): Uint8Array {
  return ecrirePdf([{
    type: "texte",
    lignes: ["COUR D'APPEL DE PARIS", "N° RG 26/04512", "Paris, le 2 octobre 2026", "audience du jeudi 4 février 2027 à 9 h 30"].map((texte, i) => ({
      x: 50,
      y: 60 + i * 18,
      texte,
    })),
  }]);
}

function preparer(coffre: CoffreTamila | null, chiffre: Uint8Array, extra: Record<string, unknown> = {}) {
  const t = contexteDeTest();
  t.ctx.coffre = coffre;
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000041", "avis_audience.pdf", "application/pdf", {
    module: "tamila",
    objet_type: "tamila_dossier",
    chiffrement: "dossier:v1",
    chemin: "cccccccc-0000-4000-8000-00000000000c/tamila_dossier/dddddddd-0000-4000-8000-000000000001/avis_audience.pdf.0123456789ab.chiffre",
    ...extra,
  });
  t.portes.pieces.set(piece.id, piece);
  t.depot.fichiers.set(piece.chemin, chiffre);
  return { ...t, piece };
}

/** Capture ce que le lecteur journalise, pour vérifier que ni la clé ni le clair n'y passent. */
async function enJournal<T>(f: () => Promise<T>): Promise<{ r: T; lignes: string }> {
  const lignes: string[] = [];
  const garde = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = (...a: unknown[]) => lignes.push(a.map(String).join(" "));
  try {
    return { r: await f(), lignes: lignes.join("\n") };
  } finally {
    Object.assign(console, garde);
  }
}

Deno.test("coffre scaleway : déchiffrée, lue, rendue CHIFFRÉE, avis posé avec RG concordant, clé effacée, rien en journal", async () => {
  const clair = avisPdf();
  const chiffre = await chiffrer(CLE(), clair);
  const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle: CLE(), dossier: "dddddddd-0000-4000-8000-000000000001" }));
  coffre.rgChiffre = hex(await chiffrer(CLE(), new TextEncoder().encode("RG 26/04512")));
  const { ctx, portes, ia, piece } = preparer(coffre, chiffre);
  ia!.prochaine = {
    lisible: true,
    type_piece: "rpva_avis_audience",
    confiance_type: 0.95,
    valeurs: [
      { champ: "date_avis", valeur: "2026-10-02", texte: "Paris, le 2 octobre 2026", page: 1 },
      { champ: "date_audience", valeur: "2027-02-04T09:30", texte: "audience du jeudi 4 février 2027 à 9 h 30", page: 1 },
      { champ: "numero_rg", valeur: "26/04512", texte: "N° RG 26/04512", page: 1 },
    ],
  };
  const { r: issue, lignes } = await enJournal(() => lirePiece(ctx, travailDeTest(41, piece.id)));
  assertEquals(issue, "lue");
  assertEquals(coffre.appels, [piece.id]);
  assert(coffre.remises[0].every((b) => b === 0), "la clé remise par le coffre est effacée à la fin du travail");

  // Ce qui part en base : aucun clair (le double applique la règle d'enregistrer_lecture), mais tout se rouvre avec la clé.
  const r = portes.enregistrements[0].resultat as unknown as {
    type_piece: string;
    pages: { texte: string; texte_chiffre: string }[];
    valeurs: { champ: string; valeur: unknown; chiffre: string; verifiee: boolean; page?: number }[];
    motif?: string;
  };
  assertEquals(r.type_piece, "rpva_avis_audience");
  assertEquals(r.pages[0].texte, "");
  assertStringIncludes(await ouvrir(r.pages[0].texte_chiffre), "N° RG 26/04512");
  const audience = r.valeurs.find((v) => v.champ === "date_audience")!;
  assertEquals(audience.valeur, null);
  assertEquals(audience.verifiee, true);
  const dedans = JSON.parse(await ouvrir(audience.chiffre));
  assertEquals(dedans.valeur, "2027-02-04T09:30");
  assertStringIncludes(dedans.texte, "audience du jeudi");
  assert(dedans.boite, "la boîte est rangée dans le chiffré");

  // La passerelle b4_08 : seules les valeurs que tamila_avis_lu lit, RG comparé au dossier déchiffré.
  assertEquals(coffre.avisPoses.length, 1);
  assertEquals(coffre.avisPoses[0].avis.type, "rpva_avis_audience");
  assertEquals(coffre.avisPoses[0].avis.valeurs, { date_avis: "2026-10-02", date_audience: "2027-02-04T09:30" });
  assertEquals(coffre.avisPoses[0].avis.confiance, "modele");
  assertEquals(coffre.avisPoses[0].concorde, true);
  const fin = portes.finis[0].resultat as Record<string, unknown>;
  assertEquals(fin.dechiffree, true);
  assertEquals((fin.avis_rpva as Record<string, unknown>).avis, "pose");
  // Ni la clé (hex, base64) ni le contenu dans le journal.
  const cle = CLE();
  assert(!lignes.includes(btoa(String.fromCharCode(...cle))), "clé en base64 journalisée");
  assert(!lignes.includes(Array.from(cle, (b) => b.toString(16).padStart(2, "0")).join("")), "clé en hexadécimal journalisée");
  assert(!lignes.includes("04512"), "contenu de la pièce journalisé");
});

Deno.test("avis RPVA : RG différent → concorde false ; avis déjà posé → rien ; porte en panne → lecture gardée, avis à saisir", async () => {
  const lecture = {
    lisible: true,
    type_piece: "rpva_avis_902",
    confiance_type: 0.95,
    valeurs: [
      { champ: "date_avis", valeur: "2026-10-02", texte: "Paris, le 2 octobre 2026", page: 1 },
      { champ: "numero_rg", valeur: "26/04512", texte: "N° RG 26/04512", page: 1 },
    ],
  };
  const essai = async (regler: (c: CoffreDouble) => Promise<void>) => {
    const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle: CLE(), dossier: "d" }));
    await regler(coffre);
    const t = preparer(coffre, await chiffrer(CLE(), avisPdf()));
    t.ia!.prochaine = lecture;
    const issue = await lirePiece(t.ctx, travailDeTest(48, t.piece.id));
    return { issue, coffre, fin: t.portes.finis[0]?.resultat as Record<string, unknown>, t };
  };
  const autre = await essai(async (c) => {
    c.rgChiffre = hex(await chiffrer(CLE(), new TextEncoder().encode("25/00001")));
  });
  assertEquals(autre.coffre.avisPoses[0].concorde, false);
  const sansRg = await essai(() => Promise.resolve());
  assertEquals(sansRg.coffre.avisPoses[0].concorde, null, "RG du dossier absent : non vérifié");
  const deja = await essai((c) => {
    c.avisDeja = true;
    return Promise.resolve();
  });
  assertEquals(deja.coffre.avisPoses.length, 0);
  assertEquals((deja.fin.avis_rpva as Record<string, unknown>).avis, "deja");
  const panne = await essai((c) => {
    c.panneAvis = new Error("HTTP 503");
    return Promise.resolve();
  });
  assertEquals(panne.issue, "lue", "la lecture reste enregistrée");
  assertEquals((panne.fin.avis_rpva as Record<string, unknown>).avis, "erreur");
  assertEquals(panne.t.portes.echoues.length, 0);
});

Deno.test("pièce Tamila chiffrée qui n'est pas un avis : lue et rendue chiffrée, aucun avis, motif sans contenu", async () => {
  const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle: CLE(), dossier: "d" }));
  const t = preparer(coffre, await chiffrer(CLE(), avisPdf()));
  t.ia!.prochaine = { lisible: true, type_piece: "autre", confiance_type: 0.4, motif: "jugement Dupont c/ Martin", valeurs: [] };
  assertEquals(await lirePiece(t.ctx, travailDeTest(49, t.piece.id)), "a_classer");
  assertEquals(coffre.avisPoses.length, 0);
  const motif = t.portes.enregistrements[0].resultat.motif ?? "";
  assert(!motif.includes("Dupont"), `motif en clair : ${motif}`);
});

Deno.test("coffre local (pas de coffre serveur) : close sans lecture, comme avant", async () => {
  const coffre = new CoffreDouble(() => ({ fournisseur: "local" }));
  const { ctx, portes, depot, piece } = preparer(coffre, new Uint8Array([1, 0, 0]));
  assertEquals(await lirePiece(ctx, travailDeTest(42, piece.id)), "ignore");
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).ignore, "chiffree_sans_coffre");
  assertEquals(depot.telechargements, 0);
  assertEquals(portes.appels.some((a) => a.porte === "commencerLecture"), false);
});

Deno.test("pièce chiffrée hors Tamila : le coffre n'est pas interrogé, close sans lecture", async () => {
  const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle: CLE(), dossier: "x" }));
  const { ctx, portes, piece } = preparer(coffre, new Uint8Array([1]), { module: "filed", objet_type: "filed_document" });
  assertEquals(await lirePiece(ctx, travailDeTest(43, piece.id)), "ignore");
  assertEquals(coffre.appels.length, 0);
  assertEquals((portes.finis[0].resultat as Record<string, unknown>).ignore, "chiffree_sans_coffre");
});

Deno.test("clé qui n'ouvre pas le fichier : échec sans reprise, aucune IA, clé effacée", async () => {
  const chiffre = await chiffrer(CLE(), avisPdf());
  const fausse = new Uint8Array(32).fill(9);
  const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle: fausse, dossier: "x" }));
  const { ctx, portes, ia, piece } = preparer(coffre, chiffre);
  assertEquals(await lirePiece(ctx, travailDeTest(44, piece.id)), "abandon");
  assertEquals(portes.echoues.length, 1);
  assertStringIncludes(portes.echoues[0].erreur, "CHIFFRE_ILLISIBLE");
  assertEquals(portes.echoues[0].reprendre, false);
  assertEquals(ia!.appels.length, 0);
  assert(fausse.every((b) => b === 0));
});

Deno.test("clé reçue mais pièce déjà lue : travail ignoré, clé effacée sans téléchargement", async () => {
  const cle = CLE();
  const coffre = new CoffreDouble(() => ({ fournisseur: "scaleway", cle, dossier: "x" }));
  const { ctx, portes, depot, piece } = preparer(coffre, new Uint8Array([1]), { statut: "lue" });
  assertEquals(await lirePiece(ctx, travailDeTest(45, piece.id)), "ignore");
  assertEquals(depot.telechargements, 0);
  assert(cle.every((b) => b === 0));
  assertEquals(portes.enregistrements.length, 0);
});

Deno.test("CoffreRpc : forme de l'appel, 503 repris, 409 définitif, réponse local", async () => {
  const vus: { url: string; init: RequestInit }[] = [];
  const repondre = (statut: number, corps: unknown): typeof fetch => ((url: string | URL | Request, init?: RequestInit) => {
    vus.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(new Response(JSON.stringify(corps), { status: statut, headers: { "Content-Type": "application/json" } }));
  }) as typeof fetch;
  const cfg = { url: "https://recette.example.supabase.co/", cleService: "cle-service-test" };

  const cle = CLE();
  const ok = await new CoffreRpc(cfg, repondre(200, { fournisseur: "scaleway", cle: btoa(String.fromCharCode(...cle)), dossier: "d1" })).clePiece("p1");
  assertEquals(ok.fournisseur, "scaleway");
  assertEquals(ok.fournisseur === "scaleway" ? [...ok.cle] : [], [...cle]);
  assertEquals(vus[0].url, "https://recette.example.supabase.co/functions/v1/tamila-coffre");
  assertEquals(vus[0].init.method, "POST");
  assertEquals(JSON.parse(String(vus[0].init.body)), { action: "cle_piece", piece: "p1" });
  assertEquals((vus[0].init.headers as Record<string, string>).Authorization, "Bearer cle-service-test");

  assertEquals((await new CoffreRpc(cfg, repondre(200, { fournisseur: "local" })).clePiece("p2")).fournisseur, "local");

  const t = contexteDeTest();
  t.ctx.coffre = new CoffreRpc(cfg, repondre(503, { erreur: "KEY_MANAGER", message: "indisponible" }));
  const p = pieceDeTest("cccccccc-0000-4000-8000-000000000046", "a.pdf", "application/pdf", { module: "tamila", objet_type: "tamila_dossier", chiffrement: "dossier:v1" });
  t.portes.pieces.set(p.id, p);
  assertEquals(await lirePiece(t.ctx, travailDeTest(46, p.id)), "repris");
  assertStringIncludes(t.portes.echoues[0].erreur, "COFFRE_INDISPONIBLE");
  assertEquals(t.portes.echoues[0].reprendre, true);

  const u = contexteDeTest();
  u.ctx.coffre = new CoffreRpc(cfg, repondre(409, { erreur: "DOSSIER_FERME", message: "dossier clos" }));
  u.portes.pieces.set(p.id, p);
  assertEquals(await lirePiece(u.ctx, travailDeTest(47, p.id)), "abandon");
  assertStringIncludes(u.portes.echoues[0].erreur, "COFFRE_REFUSE");
  assertEquals(u.portes.echoues[0].reprendre, false);
  assertEquals(u.depot.telechargements, 0);
});
