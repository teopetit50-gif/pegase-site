// La lecture longue à l'échelle d'un vrai dossier (CHIFFRAGE : « essai à 50–200 pièces ») : 200 pièces fictives, un appel
// de 30 s simulé, le budget d'un passage (95 s). Ce qui casserait un vrai dossier : trop de passages (le socle coupe au-delà
// d'un nombre de paliers), une synthèse qui déborde la sortie du modèle, une synthèse tronquée qui ferait tout perdre.

import { assert, assertEquals } from "@std/assert";
import type { ClientClaude, DemandeConverse, ReponseConverse } from "@partage/claude.ts";
import { analyser, dedoublonner, type EtatAnalyse, type PieceDossier, SEUIL_SYNTHESE, type TypeAnalyse } from "../analyse/moteur.ts";
import { TAMILA_CHRONOLOGIE } from "../analyse/types_tamila.ts";

const id = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const N = 200;
const dossier: PieceDossier[] = Array.from({ length: N }, (_, i) => ({
  piece: id(i),
  nom: `piece-${i + 1}.pdf`,
  pages: Array.from({ length: 15 }, (_, k) => ({
    n: k + 1,
    texte: `Pièce ${i + 1}, page ${k + 1}\nLe ${String((i % 28) + 1).padStart(2, "0")}/0${(k % 9) + 1}/2025, événement n° ${i}-${k}.\nSuite du texte.`,
  })),
}));

/** Un faux modèle : trois constats par pièce (dont un doublon d'une autre), chaque appel « dure » 30 s sur l'horloge. */
class Modele implements ClientClaude {
  readonly fournisseur = "anthropic" as const;
  readonly modele = "claude-test";
  readonly prix = { prixEntreeUsdMtok: 3, prixSortieUsdMtok: 15, tauxUsdEur: 1 };
  appels = 0;
  enVol = 0;
  maxEnVol = 0;
  syntheses: string[] = [];
  constructor(private horloge: { t: number }, private syntheseTronquee = false) {}
  async converse(d: DemandeConverse): Promise<ReponseConverse> {
    this.appels++;
    this.enVol++;
    this.maxEnVol = Math.max(this.maxEnVol, this.enVol);
    await Promise.resolve();
    this.horloge.t += 30_000 / 4; // quatre appels en vol se partagent les 30 s
    this.enVol--;
    const texte = (d.contenu[0] as { text: string }).text;
    const usage = { tokens_entree: 6000, tokens_sortie: 600 };
    if (d.outil.name === "rendre_resume") {
      this.syntheses.push("resume");
      return { entree: { resume: "Résumé du dossier." }, usage, stopReason: "tool_use" };
    }
    if (d.outil.name === "rendre_synthese") {
      this.syntheses.push("synthese");
      return { entree: this.syntheseTronquee ? {} : { resume: "r", constats: [] }, usage, stopReason: this.syntheseTronquee ? "max_tokens" : "tool_use" };
    }
    const m = /identifiant ([0-9a-f-]{36})/.exec(texte)!;
    const piece = m[1];
    const i = Number(piece.slice(-12));
    const extrait = (k: number) => `Le ${String((i % 28) + 1).padStart(2, "0")}/0${(k % 9) + 1}/2025, événement n° ${i}-${k}.`;
    const c = (k: number) => ({
      code: "evenement",
      titre: `Événement ${i}-${k}`,
      texte: "…",
      gravite: "info",
      donnees: { date: `2025-0${(k % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, precision: "jour", evenement: "x", acteur: "client", nature: "fait" },
      citations: [{ piece, page: k + 1, lignes: [2, 2], extrait: extrait(k) }],
    });
    return { entree: { constats: [c(0), c(1), c(2), c(0)] }, usage, stopReason: "tool_use" };
  }
}

async function passages(modele: Modele, horloge: { t: number }, type: TypeAnalyse) {
  let etat: EtatAnalyse | undefined;
  for (let p = 1; p <= 200; p++) {
    const r = await analyser(modele, type, dossier, { budgetMs: 95_000 - 15_000, maintenant: () => horloge.t, etat });
    if (r.statut !== "en_cours") return { r, passages: p };
    etat = r.etat;
  }
  throw new Error("jamais finie");
}

Deno.test("échelle : 200 pièces, 3 000 pages — finie en une vingtaine de passages, quatre appels en vol, synthèse allégée", async () => {
  const horloge = { t: 0 };
  const m = new Modele(horloge);
  const { r, passages: p } = await passages(m, horloge, TAMILA_CHRONOLOGIE);
  assertEquals(r.statut, "finie");
  assertEquals(r.pieces_lues, N);
  assertEquals(m.maxEnVol, 4);
  console.log(`passages : ${p}`);
  assert(p <= 25, `${p} passages (le socle en accepte 2 par pièce, et au moins 50)`);
  assertEquals(r.synthese, "allegee", "600 constats : la liste ne repasse pas par le modèle");
  assertEquals(m.syntheses, ["resume"]);
  assertEquals(r.constats.length, 600, "le doublon de chaque pièce est fusionné, rien n'est perdu");
  assert(r.constats.every((c) => c.citations.some((x) => x.verifiee)));
  assert(String(r.constats[0].donnees.date) <= String(r.constats[599].donnees.date), "chronologie triée");
  assert(r.couts.cout_eur < TAMILA_CHRONOLOGIE.limites.coutMaxEur, `coût ${r.couts.cout_eur} € sous le plafond`);
  const etat = JSON.stringify({ constats: r.constats }).length;
  assert(etat < 2_000_000, `résultat de ${etat} caractères (rangé chiffré en base)`);
});

Deno.test("échelle : une synthèse complète tronquée (sortie coupée) ne fait rien perdre", async () => {
  const horloge = { t: 0 };
  const petit = dossier.slice(0, 10);
  const m = new Modele(horloge, true);
  const r = await analyser(m, TAMILA_CHRONOLOGIE, petit, {});
  assert(30 <= SEUIL_SYNTHESE, "10 pièces : synthèse complète tentée");
  assertEquals(m.syntheses, ["synthese"]);
  assertEquals(r.synthese, "allegee");
  assertEquals(r.constats.length, 30);
});

Deno.test("échelle : doublons — même code, même première citation vérifiée", () => {
  const c = (extrait: string) => ({ code: "x", titre: "", texte: "", gravite: "info" as const, donnees: {}, citations: [{ piece: "p", page: 1, lignes: [1, 1] as [number, number], extrait, verifiee: true }] });
  assertEquals(dedoublonner([c("A b"), c("a  B"), c("c")]).length, 2);
});
