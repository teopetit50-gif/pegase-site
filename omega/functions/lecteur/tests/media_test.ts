// lecteur.media : vocal transcrit puis lu, photo regardée, demandes vérifiées contre la transcription ou le texte,
// photo « à confirmer », vocal sans transcription jamais deviné, chemins hors réceptions refusés, porte de retour
// en panne sans perte, transcription Mistral (multipart, durée, coût).

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import type { Travail } from "@partage/portes.ts";
import { chargeMedia, type ContexteMedia, type LectureMedia, lireMedia } from "../media/lire_media.ts";
import { type Transcripteur, TranscripteurMistral } from "../media/transcription.ts";
import { DepotMemoire, PortesMemoire } from "./doubles.ts";

const CLIENT = "cccccccc-0000-4000-8000-00000000000c";
const RACINE = `${CLIENT}/receptions/wamid.ABC`;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const OGG = new TextEncoder().encode("OggS-faux-vocal");
const TRANSCRIPTION = "Bon, Lefèvre veut aussi des garde-corps au R+3, douze mètres. Et il manque une palette de plaques.";

class Claude implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-test";
  readonly prix = { prixEntreeUsdMtok: 3, prixSortieUsdMtok: 15, tauxUsdEur: 1 };
  vus: DemandeConverse[] = [];
  constructor(private readonly reponse: unknown) {}
  converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.vus.push(d);
    return Promise.resolve({ entree: this.reponse, usage: { tokens_entree: 3000, tokens_sortie: 400 }, stopReason: "tool_use" });
  }
}

class Transcrit implements Transcripteur {
  readonly nom = "test";
  appels = 0;
  transcrire() {
    this.appels++;
    return Promise.resolve({ texte: TRANSCRIPTION, duree_s: 14, cout_eur: 0.0005 });
  }
}

const travail = (charge: Record<string, unknown>): Travail => ({
  id: 9,
  client_id: CLIENT,
  module: "daliro",
  genre: "lecteur.media",
  charge,
  cle: "media:1",
  essais: 1,
  essais_max: 5,
});

function contexte(claude: ClientClaude | null, transcripteur: Transcripteur | null, rendre?: ContexteMedia["rendre"]) {
  const portes = new PortesMemoire();
  const depot = new DepotMemoire();
  depot.fichiers.set(`${RACINE}/vocal.ogg`, OGG);
  depot.fichiers.set(`${RACINE}/image.jpg`, JPEG);
  const ctx: ContexteMedia = {
    portes,
    depot,
    claude,
    transcripteur,
    env: { get: () => undefined },
    maintenant: () => new Date("2026-10-06T18:00:00Z"),
    rendre,
  };
  return { ctx, portes };
}

const CHARGE = {
  reception: 4512,
  pieces: [{ chemin: `${RACINE}/vocal.ogg`, mime: "audio/ogg", vocal: true }, { chemin: `${RACINE}/image.jpg`, mime: "image/jpeg" }],
  texte: "Pour le chantier Lefèvre",
  de_nom: "Chef d'équipe Pose A",
  retour: "daliro_media_lu",
};

const REPONSE = {
  resume: "Le client Lefèvre demande des garde-corps au R+3 ; une palette de plaques manque.",
  demandes: [
    { nature: "travail_supplementaire", texte: "Garde-corps au R+3", quantite: 12, unite: "ml", lieu: "R+3", source: { media: 1, extrait: "Lefèvre veut aussi des garde-corps au R+3, douze mètres" } },
    { nature: "probleme", texte: "Palette de plaques manquante", source: { media: 1, extrait: "il manque une palette de plaques" } },
    { nature: "probleme", texte: "Allèges démolies", source: { media: 2, extrait: "allèges démolies" } },
    { nature: "information", texte: "Inventé", source: { media: 1, extrait: "le client paiera double" } },
    { nature: "question", texte: "Sans source", source: { media: 7, extrait: "x" } },
  ],
};

Deno.test("media : vocal transcrit, photo regardée, demandes vérifiées ; rendu au module par sa porte", async () => {
  const rendus: { porte: string; reception: string | number; lecture: LectureMedia }[] = [];
  const claude = new Claude(REPONSE);
  const t = new Transcrit();
  const { ctx, portes } = contexte(claude, t, (porte, reception, lecture) => {
    rendus.push({ porte, reception, lecture });
    return Promise.resolve(null);
  });
  assertEquals(await lireMedia(ctx, travail(CHARGE)), "lu");
  assertEquals(t.appels, 1);
  const vu = claude.vus[0];
  assert(vu.contenu.some((b) => "image" in b), "la photo part au modèle");
  assertStringIncludes((vu.contenu.at(-1) as { text: string }).text, "Vocal 1 (transcription)");
  assertStringIncludes((vu.contenu.at(-1) as { text: string }).text, "garde-corps au R+3");
  assertEquals(rendus.length, 1);
  assertEquals(rendus[0].porte, "daliro_media_lu");
  assertEquals(rendus[0].reception, 4512);
  const l = rendus[0].lecture;
  assertEquals(l.medias.map((m) => [m.nature, m.statut]), [["vocal", "lu"], ["photo", "lu"]]);
  assertEquals(l.medias[0].duree_s, 14);
  assertEquals(l.demandes.length, 4, "la demande sans source connue est écartée");
  const [gc, palette, photo, invente] = l.demandes;
  assertEquals([gc.verifiee, gc.quantite, gc.unite], [true, 12, "ml"]);
  assertEquals(palette.verifiee, true);
  assertEquals(photo.verifiee, false);
  assertStringIncludes(photo.controle, "photo 2 : à confirmer");
  assertEquals(invente.verifiee, false);
  assertStringIncludes(invente.controle, "introuvable");
  assert(l.cout_eur > 0.0005, "coût = transcription + Claude");
  assertEquals((portes.finis[0].resultat as { retour: string }).retour, "pose");
});

Deno.test("media : sans service de transcription, le vocal est « non transcrit » et rien n'en est tiré", async () => {
  const claude = new Claude({ resume: "Un message pour le chantier.", demandes: [{ nature: "travail_supplementaire", texte: "Deviné", source: { media: 1, extrait: "garde-corps" } }] });
  const { ctx, portes } = contexte(claude, null);
  assertEquals(await lireMedia(ctx, travail({ ...CHARGE, pieces: [CHARGE.pieces[0]], retour: undefined })), "lu");
  const l = (portes.finis[0].resultat as { lecture: LectureMedia; retour: string });
  assertEquals(l.lecture.medias[0].statut, "non_transcrit");
  assertEquals(l.lecture.demandes, [], "une demande attribuée à un vocal non transcrit est écartée");
  assertStringIncludes((claude.vus[0].contenu.at(-1) as { text: string }).text, "Vocal 1 : non transcrit.");
  assertEquals(l.retour, "sans_porte");
});

Deno.test("media : rien à lire (pas de texte, vocal non transcrit) → pas d'appel au modèle", async () => {
  const claude = new Claude(REPONSE);
  const { ctx, portes } = contexte(claude, null);
  assertEquals(await lireMedia(ctx, travail({ reception: 1, pieces: [CHARGE.pieces[0]] })), "lu");
  assertEquals(claude.vus.length, 0);
  assertEquals((portes.finis[0].resultat as { lecture: LectureMedia }).lecture.appels_ia, 0);
});

Deno.test("media : charge refusée — chemin hors des réceptions du client, porte mal nommée, sans réception", () => {
  assertEquals(chargeMedia(travail({ reception: 1, pieces: [{ chemin: "autre-client/receptions/x/a.jpg", mime: "image/jpeg" }] })), "pièce hors des réceptions de ce client");
  assertEquals(chargeMedia(travail({ reception: 1, pieces: [{ chemin: `${RACINE}/../../x.jpg`, mime: "image/jpeg" }] })), "pièce hors des réceptions de ce client");
  assertEquals(chargeMedia(travail({ reception: 1, pieces: [], retour: "drop table; --" })), "porte de retour mal nommée");
  assertEquals(chargeMedia(travail({ pieces: [] })), "charge sans réception");
});

Deno.test("media : porte de retour en panne → la lecture reste dans le résultat du travail", async () => {
  const { ctx, portes } = contexte(new Claude(REPONSE), new Transcrit(), () => Promise.reject(new Error("HTTP 404 : fonction daliro_media_lu absente")));
  assertEquals(await lireMedia(ctx, travail(CHARGE)), "lu");
  const r = portes.finis[0].resultat as { lecture: LectureMedia; retour: string; retour_erreur: string };
  assertEquals(r.retour, "erreur");
  assertStringIncludes(r.retour_erreur, "404");
  assertEquals(r.lecture.demandes.length, 4);
});

Deno.test("media : sans IA, le travail est repris plus tard (IA_NON_BRANCHEE)", async () => {
  const { ctx, portes } = contexte(null, new Transcrit());
  assertEquals(await lireMedia(ctx, travail(CHARGE)), "repris");
  assertStringIncludes(portes.echoues[0].erreur, "IA_NON_BRANCHEE");
});

Deno.test("transcription Mistral : multipart model/language/file, texte, durée, coût", async () => {
  let corps: FormData | null = null;
  let url = "";
  const f = ((u: string | URL | Request, init?: RequestInit) => {
    url = String(u);
    corps = init?.body as FormData;
    return Promise.resolve(new Response(JSON.stringify({ text: " Bonjour. ", language: "fr", usage: { prompt_audio_seconds: 90 } }), { status: 200 }));
  }) as typeof fetch;
  const t = new TranscripteurMistral({ cle: "k", modele: "voxtral-mini-latest", prixUsdMinute: 0.002, tauxUsdEur: 1 }, f);
  const r = await t.transcrire(OGG, "audio/ogg", "vocal.ogg");
  assertEquals(url, "https://api.mistral.ai/v1/audio/transcriptions");
  assertEquals(corps!.get("model"), "voxtral-mini-latest");
  assertEquals(corps!.get("language"), "fr");
  assert(corps!.get("file") instanceof Blob);
  assertEquals(r.texte, "Bonjour.");
  assertEquals(r.duree_s, 90);
  assertEquals(r.cout_eur, 0.003);
  const ko = new TranscripteurMistral({ cle: "k", modele: "m", prixUsdMinute: 0.002, tauxUsdEur: 1 }, () => Promise.resolve(new Response("busy", { status: 503 })));
  await ko.transcrire(OGG, "audio/ogg", "v.ogg").then(() => assert(false), (e) => assertEquals(e.reprendre, true));
});

Deno.test("media : avancement (b6_25) — ouvrage, lot, pourcentage ; jamais vérifié depuis une photo ; sans ouvrage, écarté", async () => {
  const claude = new Claude({
    resume: "Avancement des cloisons.",
    demandes: [
      { nature: "avancement", texte: "Cloisons R+1 finies", ouvrage: "Cloisons R+1", lot_code: "05", pourcentage: 100, source: { media: 1, extrait: "il manque une palette de plaques" } },
      { nature: "avancement", texte: "Doublage posé", ouvrage: "Doublage façade nord", pourcentage: 140, source: { media: 2, extrait: "doublage posé" } },
      { nature: "avancement", texte: "Sans ouvrage", source: { media: 2, extrait: "x" } },
    ],
  });
  const { ctx, portes } = contexte(claude, new Transcrit());
  await lireMedia(ctx, travail({ ...CHARGE, retour: undefined }));
  const d = (portes.finis[0].resultat as { lecture: LectureMedia }).lecture.demandes;
  assertEquals(d.length, 2);
  assertEquals([d[0].ouvrage, d[0].lot_code, d[0].pourcentage, d[0].verifiee], ["Cloisons R+1", "05", 100, true]);
  assertEquals([d[1].ouvrage, d[1].pourcentage, d[1].verifiee], ["Doublage façade nord", undefined, false], "pourcentage hors 0–100 écarté ; photo : à confirmer");
});
