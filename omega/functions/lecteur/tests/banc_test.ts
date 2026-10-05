// Le banc : chaque cas rejoué de bout en bout avec les doubles, comparé à son
// attendu JSON (banc/attendus/<cas>.json).

import { assert, assertEquals, assertExists } from "@std/assert";
import { CAS } from "../banc/cas.ts";
import { octetsDuCas } from "../banc/generer.ts";
import { lirePiece } from "../lire_piece.ts";
import type { Attendu } from "../banc/cas.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const ici = new URL(".", import.meta.url);

for (const cas of CAS) {
  Deno.test(`banc ${cas.id} : ${cas.titre}`, async () => {
    const attendu = JSON.parse(await Deno.readTextFile(new URL(`../banc/attendus/${cas.id}.json`, ici))) as Attendu;
    const { ctx, portes, depot, ia } = contexteDeTest();
    const piece = pieceDeTest(`00000000-0000-4000-8000-0000000000${cas.id.slice(0, 2)}`, cas.fichier, cas.mime, { chiffrement: cas.chiffrement ?? null });
    portes.pieces.set(piece.id, piece);
    depot.fichiers.set(piece.chemin, await octetsDuCas(cas));
    if (cas.ia) ia!.prochaine = cas.ia;

    const issue = await lirePiece(ctx, travailDeTest(Number(cas.id.slice(0, 2)), piece.id));
    assertEquals(issue, attendu.issue, "issue du travail");
    assertEquals(ia!.appels.length > 0, attendu.ia_appelee, "appel de l'IA");

    if (attendu.erreur_contient) {
      assertEquals(portes.echoues.length, 1);
      assert(portes.echoues[0].erreur.includes(attendu.erreur_contient), portes.echoues[0].erreur);
      assertEquals(portes.echoues[0].reprendre, true);
      assertEquals(portes.enregistrements.length, 0);
      assertEquals(portes.appels.some((a) => a.porte === "commencerLecture"), false, "pas de commencer_lecture sur une pièce chiffrée");
      return;
    }

    assertEquals(portes.enregistrements.length, 1, "une seule enregistrer_lecture");
    assertEquals(portes.finis.length, 1, "un seul finir_travail");
    assertEquals(portes.echoues.length, 0);
    const r = portes.enregistrements[0].resultat;
    assertEquals(r.statut, attendu.statut);
    if (attendu.type_piece) assertEquals(r.type_piece, attendu.type_piece);
    if (attendu.methode) assertEquals(r.methode, attendu.methode);
    if (attendu.nb_pages !== undefined) assertEquals(r.pages.length, attendu.nb_pages);
    if (attendu.methode_page_1) assertEquals(r.pages[0].methode, attendu.methode_page_1);
    if (attendu.motif_contient) assert((r.motif ?? "").includes(attendu.motif_contient), `motif : ${r.motif}`);
    assert(portes.enregistrements[0].version.startsWith("lecteur/2026-10-05/"), portes.enregistrements[0].version);

    const parChamp = new Map(r.valeurs.map((v) => [v.champ, v]));
    for (const [champ, valeur] of Object.entries(attendu.valeurs ?? {})) {
      const v = parChamp.get(champ);
      assertExists(v, `valeur ${champ} absente`);
      assertEquals(v.valeur, valeur, `valeur ${champ}`);
      if (attendu.source) assertEquals(v.source, attendu.source);
    }
    for (const champ of attendu.verifiees ?? []) {
      const v = parChamp.get(champ);
      assertExists(v, `valeur ${champ} absente`);
      assertEquals(v.verifiee, true, `${champ} devrait être vérifiée (${v.controle})`);
    }
    for (const champ of attendu.non_verifiees ?? []) {
      assertEquals(parChamp.get(champ)?.verifiee, false, `${champ} ne devrait pas être vérifiée`);
    }
    // Rien d'inventé : chaque valeur IA vérifiée porte une citation et une page.
    for (const v of r.valeurs) {
      if (v.source === "ia" && v.verifiee && !Array.isArray(v.valeur)) {
        assert(v.texte && v.page, `${v.champ} vérifiée sans citation`);
      }
    }

    const fini = portes.finis[0].resultat as Record<string, unknown>;
    assertEquals(fini.statut, attendu.statut);
    assertEquals(fini.pages, r.pages.length);
    assertEquals(fini.valeurs, r.valeurs.length);
    assert(typeof fini.cout_eur === "number");
    if (attendu.ia_appelee) {
      assertEquals(fini.modele, ia!.modele);
      assert((fini.cout_eur as number) > 0, "coût IA rendu");
    } else {
      assertEquals(fini.cout_eur, 0);
    }
    if (attendu.decoupage) assertEquals((fini.decoupage as { pages: number[] }[]).map((d) => ({ pages: d.pages })), attendu.decoupage);
    else assertEquals(fini.decoupage, undefined);
  });
}
