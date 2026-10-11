// Lorani b5_26 : l'offre d'une entreprise (prix par poste aux références de la DPGF, réserves) ; un long tableau lu par
// morceaux de lignes, valeurs réunies, appels comptés ; la DPGF chiffrée rend prix et montants.

import { assert, assertEquals } from "@std/assert";
import type { EntreeIa } from "../ia.ts";
import { CARACTERES_PAR_MORCEAU, LIGNES_PAR_MORCEAU, lirePiece, morceauxDeLignes } from "../lire_piece.ts";
import { champsPour, schemaPour } from "../schemas/modules.ts";
import { contexteDeTest, pieceDeTest, travailDeTest } from "./doubles.ts";

const LIGNES = 200;
const csv = ["Réf;Désignation;U;Qté;PU HT;Montant HT", ...Array.from({ length: LIGNES }, (_, i) => `8.${i + 1};Poste ${i + 1};m2;${i + 1};${10 + i},00;${(i + 1) * (10 + i)},00`), "Total HT;;;;;123456,00", "Réserve : hors évacuation des gravats"].join("\n");

Deno.test("offre : schéma — prix unitaire, montant, quantité, unité, réserves ; DPGF chiffrée", () => {
  assert(schemaPour("lorani").types.some((t) => t.type === "lorani_offre"));
  const o = champsPour("lorani", "lorani_offre");
  for (const c of ["prix_unitaire.8_1", "montant.8_1", "quantite.8_1"]) assertEquals(o.get(c)!.type, "nombre", c);
  assertEquals(o.get("unite.8_1")!.type, "texte");
  assertEquals(o.get("reserve.1")!.type, "texte");
  assertEquals(o.get("montant_total_ht")!.type, "nombre");
  assertEquals(champsPour("lorani", "lorani_dpgf").get("prix_unitaire.8_1")!.type, "nombre");
  assertEquals(champsPour("lorani", "lorani_cctp").get("montant.8_1"), undefined);
});

Deno.test("morceaux : 200 lignes → morceaux de 80 lignes au plus, chacun garde sa page ; un petit texte reste entier", () => {
  const m = morceauxDeLignes([{ n: 1, texte: csv }]);
  assertEquals(m.length, Math.ceil((LIGNES + 3) / LIGNES_PAR_MORCEAU));
  assert(m.every((x) => x.every((p) => p.n === 1 && p.texte.split("\n").length <= LIGNES_PAR_MORCEAU)));
  assertEquals(m.flatMap((x) => x.map((p) => p.texte)).join("\n"), csv, "rien de perdu ni de doublé");
  assertEquals(morceauxDeLignes([{ n: 1, texte: "a\nb" }, { n: 2, texte: "c" }]).length, 1);
  assert(morceauxDeLignes([{ n: 1, texte: "x".repeat(CARACTERES_PAR_MORCEAU + 10) + "\nfin" }]).length === 2);
});

Deno.test("offre : un tableur de 200 lignes lu par morceaux, valeurs réunies et vérifiées sur la page entière", async () => {
  const { ctx, portes, depot, ia } = contexteDeTest();
  const piece = pieceDeTest("cccccccc-0000-4000-8000-000000000095", "offre-lot8.csv", "text/csv", { module: "lorani", objet_type: "lorani_projet", objet_id: "p" });
  portes.pieces.set(piece.id, piece);
  depot.fichiers.set(piece.chemin, new TextEncoder().encode(csv));
  // Le faux modèle rend, pour chaque morceau, les prix des lignes qu'il reçoit ; l'en-tête de l'offre au premier.
  ia!.repondre = (e: EntreeIa) => {
    const texte = e.mode === "texte" ? e.pages.map((p) => p.texte).join("\n") : "";
    const valeurs: { champ: string; valeur: unknown; texte: string; page: number }[] = [...texte.matchAll(/^8\.(\d+) \| [^|]* \| m2 \| (\d+) \| (\d+),00 \|/gm)].map((m) => ({
      champ: `prix_unitaire.8_${m[1]}`,
      valeur: Number(m[3]),
      texte: `8.${m[1]} | Poste ${m[1]} | m2 | ${m[2]} | ${m[3]},00`,
      page: 1,
    }));
    if (texte.includes("Réf | Désignation")) valeurs.unshift({ champ: "entreprise", valeur: "Menuiseries Essai", texte: "Réf | Désignation", page: 1 });
    if (texte.includes("Total HT")) valeurs.push({ champ: "montant_total_ht", valeur: 123456, texte: "123456,00", page: 1 });
    if (texte.includes("Réserve")) valeurs.push({ champ: "reserve.1", valeur: "hors évacuation des gravats", texte: "hors évacuation des gravats", page: 1 });
    return { lisible: true, type_piece: "lorani_offre", confiance_type: 0.9, valeurs };
  };
  assertEquals(await lirePiece(ctx, travailDeTest(95, piece.id)), "lue");
  assertEquals(ia!.appels.length, 3);
  const r = portes.enregistrements[0].resultat;
  const pu = r.valeurs.filter((v) => v.champ.startsWith("prix_unitaire."));
  assertEquals(pu.length, LIGNES);
  assert(pu.every((v) => v.verifiee));
  assertEquals(r.valeurs.find((v) => v.champ === "montant_total_ht")!.valeur, 123456);
  assertEquals(r.valeurs.find((v) => v.champ === "reserve.1")!.verifiee, true);
  assertEquals((portes.finis[0].resultat as { appels_ia: number }).appels_ia, 3);
});
